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
  if (cuartoId) params.cuartoId = cuartoId
  if (desde)    params.desde = desde
  if (hasta)    params.hasta = hasta

  const { data } = await httpClient.get('/api/intervenciones', { params })

  // El back devuelve un array plano con campos camelCase.
  // Normalizamos a { intervenciones, total } con snake_case (que es lo que
  // espera LogIntervenciones.jsx y consistente con el resto de la app).
  const rawList = Array.isArray(data)
    ? data
    : Array.isArray(data?.intervenciones) ? data.intervenciones : []
  const intervenciones = rawList.map((v) => ({
    id: v.id,
    timestamp: v.timestamp,
    cuarto_id: v.cuarto_id ?? v.cuartoId,
    operador_id: v.operador_id ?? v.operadorId,
    tipo_accion: v.tipo_accion ?? v.tipoAccion,
    rol_en_ejecucion: v.rol_en_ejecucion ?? v.rolEnEjecucion,
    descripcion: v.descripcion,
    alarma_id: v.alarma_id ?? v.alarmaId ?? null
  }))
  return { intervenciones, total: intervenciones.length }
}
