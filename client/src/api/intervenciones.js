import { httpClient } from './httpClient'
import { mockObtenerIntervenciones } from './mocks/intervenciones.mock'

const USAR_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'

// En mock, necesitamos el rol y operador_id del JWT para replicar
// el filtrado que hace el backend (operador ve solo las suyas).
// Leemos sessionStorage directamente para no acoplar al contexto React.
function leerClaimsDelToken() {
  try {
    const token = sessionStorage.getItem('sei.auth.token')
    if (!token) return null
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

/**
 * Retorna intervenciones manuales filtradas segun el rol del JWT activo.
 * El backend aplica la misma logica: operador ve solo las suyas, supervisor ve todas.
 *
 * @param {{ cuartoId?: number, desde?: string, hasta?: string }} params
 * @returns {Promise<{ intervenciones: Array, total: number }>}
 */
export async function obtenerIntervenciones({ cuartoId, desde, hasta } = {}) {
  if (USAR_MOCK_API) {
    const claims = leerClaimsDelToken()
    return mockObtenerIntervenciones({
      cuartoId,
      desde,
      hasta,
      rol: claims?.rol,
      operadorId: claims?.operador_id
    })
  }

  const params = {}
  if (cuartoId) params.cuarto_id = cuartoId
  if (desde)    params.desde = desde
  if (hasta)    params.hasta = hasta

  const { data } = await httpClient.get('/api/intervenciones', { params })
  return data
}
