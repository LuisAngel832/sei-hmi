
export function handleMessage(topic, data, io) {
  const parts = topic.split('/')
  // sei / cuartos / {n} / {categoria}
  const cuartoId = parseInt(parts[2])
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
      const payload = {
        cuartoId,
        estado: data.estado,
        origen: data.origen,
        timestamp: data.timestamp
      }
      io.emit('puerta', payload)
      return { event: 'puerta', payload }
    }

    default:
      // Tópicos de comando (puerta/cmd, refrigeracion/cmd) — el HMI no los procesa
      return null
  }
}
