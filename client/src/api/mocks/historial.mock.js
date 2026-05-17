// Generador de datos mock para historial de temperatura.
// Se activa con VITE_USE_MOCK_API=true en client/.env.local.
// No importar este archivo directamente — solo lo usa client/src/api/historial.js.

const BASE_TEMP_POR_CUARTO = { 1: -2.5, 2: 1.0, 3: -1.0, 4: 0.5, 5: -3.0 }

// Intervalos adaptados al rango para mantener un volumen de filas manejable
const INTERVALO_POR_RANGO = {
  '24h': 30 * 1000,        // cada 30s  → ~2 880 registros
  '7d':  5 * 60 * 1000,    // cada 5min → ~2 016 registros
  '30d': 30 * 60 * 1000    // cada 30min → ~1 440 registros
}

function calcularRango(rango) {
  const ahora = Date.now()
  const offsets = { '24h': 24 * 3600 * 1000, '7d': 7 * 24 * 3600 * 1000, '30d': 30 * 24 * 3600 * 1000 }
  return { desde: new Date(ahora - (offsets[rango] ?? offsets['24h'])), hasta: new Date(ahora) }
}

function generarLecturas(cuartoId, desde, hasta, intervaloMs) {
  const base = BASE_TEMP_POR_CUARTO[cuartoId] ?? 0
  const lecturas = []
  let t = desde.getTime()
  let i = 0

  while (t <= hasta.getTime()) {
    // Fluctuacion determinista — sin Math.random() para resultados reproducibles
    const ondaLenta = Math.sin((i * 0.04) + cuartoId) * 1.8
    const ondaRapida = Math.cos((i * 0.3) + cuartoId * 2) * 0.4
    const temperatura = parseFloat((base + ondaLenta + ondaRapida).toFixed(1))
    const estadoAlarma = temperatura > 4 ? 'critica' : temperatura > 3 ? 'preventiva' : 'normal'

    lecturas.push({ timestamp: new Date(t).toISOString(), cuarto_id: cuartoId, temperatura, estado_alarma: estadoAlarma })
    t += intervaloMs
    i++
  }

  return lecturas
}

export function mockObtenerHistorial(cuartoId, rango) {
  const { desde, hasta } = calcularRango(rango)
  const intervalo = INTERVALO_POR_RANGO[rango] ?? INTERVALO_POR_RANGO['24h']
  const lecturas = generarLecturas(cuartoId, desde, hasta, intervalo)
  return Promise.resolve({ lecturas, total: lecturas.length, cuarto_id: cuartoId, rango })
}

export function mockDescargarCsv(cuartoId, rango) {
  const { desde, hasta } = calcularRango(rango)
  const intervalo = INTERVALO_POR_RANGO[rango] ?? INTERVALO_POR_RANGO['24h']
  const lecturas = generarLecturas(cuartoId, desde, hasta, intervalo)

  const cabecera = 'timestamp,cuarto_id,temperatura,estado_alarma'
  const filas = lecturas.map(
    l => `${l.timestamp},${l.cuarto_id},${l.temperatura},${l.estado_alarma}`
  )
  const csv = [cabecera, ...filas].join('\r\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const fecha = new Date().toISOString().slice(0, 10)
  return Promise.resolve({ blob, filename: `historial_cuarto${cuartoId}_${fecha}.csv` })
}
