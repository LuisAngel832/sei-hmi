function buildSnapshotPayload(data) {
  const cuartos = Array.isArray(data?.cuartos) ? data.cuartos : []
  const normalizados = cuartos
    .filter((c) => Number.isInteger(c?.id) && c.id >= 1 && c.id <= 5)
    .map((c) => ({
      cuartoId: c.id,
      temperatura: typeof c.temperatura === 'number' ? c.temperatura : null,
      estadoAlarma: c.alarma ?? 'normal',
      presencia: Boolean(c.presencia),
      puerta: c.puerta ?? 'cerrada',
      cortina: c.cortina ?? 'inactiva',
      timestamp: c.timestamp ?? data?.timestamp ?? null
    }))

  if (normalizados.length === 0) return null

  return {
    cuartos: normalizados,
    timestamp: data?.timestamp ?? new Date().toISOString()
  }
}

export function handleMessage(topic, data, io) {
  if (topic === 'sei/sistema/estado') {
    const payload = buildSnapshotPayload(data)
    if (!payload) {
      console.warn('[HANDLER] sei/sistema/estado sin cuartos validos — ignorado')
      return null
    }
    io.emit('snapshot_inicial', payload)
    return { event: 'snapshot_inicial', payload }
  }

  const parts = topic.split('/')
  // sei / cuartos / {n} / {categoria}
  if (parts.length < 4 || parts[0] !== 'sei' || parts[1] !== 'cuartos') {
    return null
  }
  const cuartoId = parseInt(parts[2], 10)
  const categoria = parts[3]

  if (!cuartoId || cuartoId < 1 || cuartoId > 5) {
    console.warn(`[HANDLER] cuarto_id fuera de rango en tópico: ${topic}`)
    return null
  }

  switch (categoria) {
    case 'temperatura':
    {
      const payload = {
        cuartoId,
        temperatura: data.temperatura,
        estadoAlarma: data.estado_alarma,
        timestamp: data.timestamp
      }
      io.emit('temperatura', payload)
      return { event: 'temperatura', payload }
    }

    case 'presencia':
    {
      const payload = {
        cuartoId,
        presencia: data.presencia,
        timestamp: data.timestamp
      }
      io.emit('presencia', payload)
      return { event: 'presencia', payload }
    }

    case 'alarma':
    {
      const payload = {
        cuartoId,
        estado: data.estado,
        temperaturaPico: data.temperatura_pico,
        timestamp: data.timestamp
      }
      io.emit('alarma', payload)
      return { event: 'alarma', payload }
    }

    case 'puerta':
    {
      // Estados validos del contrato E7 v2.0:
      //   'abierta' | 'cerrada' | 'cerrando' | 'cierre_cancelado'
      const ESTADOS_PUERTA = new Set(['abierta', 'cerrada', 'cerrando', 'cierre_cancelado'])
      if (!ESTADOS_PUERTA.has(data.estado)) {
        console.warn(`[HANDLER] Estado de puerta desconocido en ${topic}: ${data.estado}`)
        return null
      }
      const payload = {
        cuartoId,
        estado: data.estado,
        origen: data.origen,
        timestamp: data.timestamp
      }
      io.emit('puerta', payload)
      return { event: 'puerta', payload }
    }

    case 'cortina':
    {
      const payload = {
        cuartoId,
        estado: data.estado,
        origen: data.origen,
        timestamp: data.timestamp
      }
      io.emit('cortina', payload)
      return { event: 'cortina', payload }
    }

    default:
      // Tópicos de comando (puerta/cmd, refrigeracion/cmd) — el HMI no los procesa
      return null
  }
}
