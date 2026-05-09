// Mock de la alarma activa por cuarto.
// Se activa con VITE_USE_MOCK_API=true en client/.env.local.
// No importar directamente — solo lo usa client/src/api/cuartoDetalle.js.

const UMBRAL_PREVENTIVO = 3.0
const UMBRAL_CRITICO = 4.0

export function mockObtenerAlarmaActiva(cuartoId, contexto = {}) {
  const { temperatura, estadoAlarma, presencia } = contexto

  if (estadoAlarma !== 'critica' && estadoAlarma !== 'preventiva') {
    return Promise.resolve({ alarma: null })
  }

  // Inicio simulado: 1m 12s atras (el mockup muestra ese delta)
  const inicio = new Date(Date.now() - 72 * 1000)
  const umbral = estadoAlarma === 'critica' ? UMBRAL_CRITICO : UMBRAL_PREVENTIVO
  const tempPico = typeof temperatura === 'number' ? temperatura : umbral + 0.3

  const alarma = {
    id: `ALM-${String(cuartoId).padStart(2, '0')}${String(Math.floor(inicio.getTime() / 1000) % 1000).padStart(3, '0')}`,
    tipo: estadoAlarma,
    inicio: inicio.toISOString(),
    temperaturaPico: parseFloat(tempPico.toFixed(1)),
    umbralSuperado: umbral,
    presenciaEnCuarto: Boolean(presencia),
    cierreBloqueado: estadoAlarma === 'critica' && Boolean(presencia)
  }

  return Promise.resolve({ alarma })
}
