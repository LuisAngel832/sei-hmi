import { httpClient } from './httpClient'
import { mockObtenerHistorial, mockDescargarCsv } from './mocks/historial.mock'

// Activar con VITE_USE_MOCK_API=true en client/.env.local
// Independiente de VITE_USE_MOCK (socket). Se puede combinar libremente:
//   socket real + API mock  →  VITE_USE_MOCK_API=true
//   socket mock + API real  →  VITE_USE_MOCK=true
const USAR_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'

const RANGOS_MS = {
  '24h': 24 * 3600 * 1000,
  '7d':  7 * 24 * 3600 * 1000,
  '30d': 30 * 24 * 3600 * 1000
}

function rangoAParams(rango) {
  const ms = RANGOS_MS[rango] ?? RANGOS_MS['24h']
  const hasta = new Date()
  const desde = new Date(Date.now() - ms)
  return { desde: desde.toISOString(), hasta: hasta.toISOString() }
}

/**
 * Retorna lecturas de temperatura para un cuarto en un rango.
 * @param {number} cuartoId  1..5
 * @param {'24h'|'7d'|'30d'} rango
 * @returns {Promise<{lecturas: Array, total: number, cuarto_id: number, rango: string}>}
 */
export async function obtenerHistorial(cuartoId, rango) {
  if (USAR_MOCK_API) return mockObtenerHistorial(cuartoId, rango)

  const { desde, hasta } = rangoAParams(rango)
  const { data } = await httpClient.get(`/api/cuartos/${cuartoId}/historial`, {
    params: { desde, hasta, formato: 'json' }
  })

  // El backend puede devolver un array plano o un objeto envuelto.
  // Normalizamos a { lecturas, total, cuarto_id, rango } para la UI.
  const lecturasRaw = Array.isArray(data)
    ? data
    : Array.isArray(data?.lecturas) ? data.lecturas : []

  // El back devuelve orden ASC (mas viejo primero). Para la tabla de
  // auditoria queremos DESC: la pagina 1 muestra lo mas reciente.
  // Si el back llegara a invertir el orden en el futuro, este sort sigue
  // funcionando porque toString-compara ISO-8601.
  const lecturas = [...lecturasRaw].sort((a, b) => {
    const ta = a?.timestamp ?? ''
    const tb = b?.timestamp ?? ''
    if (ta === tb) return 0
    return ta < tb ? 1 : -1
  })

  return {
    lecturas,
    total: lecturas.length,
    cuarto_id: cuartoId,
    rango
  }
}

/**
 * Descarga el historial como CSV y dispara la descarga en el navegador.
 * @param {number} cuartoId  1..5
 * @param {'24h'|'7d'|'30d'} rango
 */
export async function descargarCsvHistorial(cuartoId, rango) {
  if (USAR_MOCK_API) {
    const { blob, filename } = await mockDescargarCsv(cuartoId, rango)
    _dispararDescarga(blob, filename)
    return
  }

  const { desde, hasta } = rangoAParams(rango)
  const response = await httpClient.get(`/api/cuartos/${cuartoId}/historial`, {
    params: { desde, hasta, formato: 'csv' },
    responseType: 'blob'
  })

  const fecha = new Date().toISOString().slice(0, 10)
  const filename = `historial_cuarto${cuartoId}_${fecha}.csv`
  _dispararDescarga(response.data, filename)
}

function _dispararDescarga(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
