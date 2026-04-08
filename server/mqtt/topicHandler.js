
export function handleMessage(topic, data, io) {
  const parts = topic.split('/')
  // sei / cuartos / {n} / {categoria}
  const cuartoId = parseInt(parts[2])
  const categoria = parts[3]

  if (!cuartoId || cuartoId < 1 || cuartoId > 5) {
    console.warn(`[HANDLER] cuarto_id fuera de rango en tópico: ${topic}`)
    return
  }

  switch (categoria) {
    case 'temperatura':
      io.emit('temperatura', {
        cuartoId,
        temperatura: data.temperatura,
        estadoAlarma: data.estado_alarma,
        timestamp: data.timestamp
      })
      break

    case 'presencia':
      io.emit('presencia', {
        cuartoId,
        presencia: data.presencia,
        timestamp: data.timestamp
      })
      break

    case 'alarma':
      io.emit('alarma', {
        cuartoId,
        estado: data.estado,
        temperaturaPico: data.temperatura_pico,
        timestamp: data.timestamp
      })
      break

    case 'puerta':
      io.emit('puerta', {
        cuartoId,
        estado: data.estado,
        origen: data.origen,
        timestamp: data.timestamp
      })
      break

    default:
      // Tópicos de comando (puerta/cmd, refrigeracion/cmd) — el HMI no los procesa
      break
  }
}