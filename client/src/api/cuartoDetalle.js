import { httpClient } from './httpClient'
import { mockObtenerAlarmaActiva } from './mocks/cuartoDetalle.mock'

const USAR_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'

/**
 * Retorna la alarma activa de un cuarto (preventiva o critica) con sus detalles
 * para el panel de detalle. Si no hay alarma activa, retorna { alarma: null }.
 *
 * En modo mock se usa el contexto en vivo del cuarto (temperatura, estado,
 * presencia) para generar un objeto coherente con el dashboard.
 *
 * @param {number} cuartoId  1..5
 * @param {{ temperatura?: number, estadoAlarma?: string, presencia?: boolean }} contexto
 * @returns {Promise<{ alarma: null | {
 *   id: string,
 *   tipo: 'preventiva' | 'critica',
 *   inicio: string,
 *   temperaturaPico: number,
 *   umbralSuperado: number,
 *   presenciaEnCuarto: boolean,
 *   cierreBloqueado: boolean
 * }}>}
 */
export async function obtenerAlarmaActiva(cuartoId, contexto = {}) {
  if (USAR_MOCK_API) return mockObtenerAlarmaActiva(cuartoId, contexto)

  try {
    const { data } = await httpClient.get(`/api/cuartos/${cuartoId}/alarma-activa`)
    return data
  } catch {
    // Backend no disponible: derivar desde el estado en vivo del socket para
    // mantener la card consistente con la temperatura y el indicador del header.
    return mockObtenerAlarmaActiva(cuartoId, contexto)
  }
}
