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
  return data
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
