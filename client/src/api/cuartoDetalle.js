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
    // El back devuelve {estado, cuarto_id, ...} en snake_case.
    // Lo normalizamos al shape {alarma: null | {...}} que espera la UI.
    return mapearAlarmaActiva(data, cuartoId, contexto)
  } catch {
    // Backend no disponible: derivar desde el estado en vivo del socket para
    // mantener la card consistente con la temperatura y el indicador del header.
    return mockObtenerAlarmaActiva(cuartoId, contexto)
  }
}

function mapearAlarmaActiva(data, cuartoId, contexto) {
  // Sin alarma activa: el back devuelve estado='normal' (o nulo).
  if (!data || data.estado === 'normal' || data.estado === null || data.estado === undefined) {
    return { alarma: null }
  }
  // Hay alarma. Aceptamos varios nombres de campos por defensividad.
  const tipo = data.estado === 'critica' || data.estado === 'preventiva' ? data.estado : 'preventiva'
  return {
    alarma: {
      id: data.alarma_id != null
        ? `ALM-${String(data.alarma_id).padStart(4, '0')}`
        : (data.id ?? `ALM-${String(cuartoId).padStart(2, '0')}XX`),
      tipo,
      inicio: data.inicio ?? data.timestamp_inicio ?? data.timestamp ?? new Date().toISOString(),
      temperaturaPico: data.temperatura_pico ?? data.temperaturaPico ?? contexto?.temperatura ?? null,
      umbralSuperado: data.umbral_superado ?? data.umbral ?? (tipo === 'critica' ? 4.0 : 3.0),
      presenciaEnCuarto: Boolean(data.presencia_en_cuarto ?? data.presencia ?? contexto?.presencia),
      cierreBloqueado: Boolean(data.cierre_bloqueado ?? (tipo === 'critica' && (data.presencia_en_cuarto ?? contexto?.presencia)))
    }
  }
}
