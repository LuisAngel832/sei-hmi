// Generador de datos mock para intervenciones manuales.
// Se activa con VITE_USE_MOCK_API=true en client/.env.local.
// No importar directamente — solo lo usa client/src/api/intervenciones.js.

const TIPOS_ACCION = ['silenciar_alarma', 'forzar_refrigeracion', 'forzar_puerta', 'cancelar_cierre']

// Operadores que aparecen en los mocks — coinciden con las credenciales de prueba
const OPERADORES_MOCK = [
  { operador_id: 1, usuario: 'jperez' },
  { operador_id: 2, usuario: 'alopez' }
]

function generarIntervenciones(cuartoIdFiltro, desdeMs, hastaMs) {
  const intervenciones = []
  // Una intervencion cada 20 minutos dentro del rango
  const PASO_MS = 20 * 60 * 1000
  let t = desdeMs
  let i = 0

  while (t <= hastaMs) {
    const cuartoId = cuartoIdFiltro ?? ((i % 5) + 1)
    const operador = OPERADORES_MOCK[i % OPERADORES_MOCK.length]
    // Tipo determinista basado en indice
    const tipo = TIPOS_ACCION[Math.floor(Math.abs(Math.sin(i * 1.7)) * TIPOS_ACCION.length)]

    intervenciones.push({
      id: i + 1,
      timestamp: new Date(t).toISOString(),
      tipo_accion: tipo,
      cuarto_id: cuartoId,
      operador_id: operador.operador_id,
      // El planning indica que esta columna siempre muestra 'operador'
      rol_en_ejecucion: 'operador'
    })

    t += PASO_MS
    i++
  }

  return intervenciones
}

export function mockObtenerIntervenciones({ cuartoId, desde, hasta, rol, operadorId }) {
  const ahora = Date.now()
  const desdeMs = desde ? new Date(desde).getTime() : ahora - 24 * 3600 * 1000
  const hastaMs = hasta ? new Date(hasta).getTime() : ahora

  let intervenciones = generarIntervenciones(cuartoId ?? null, desdeMs, hastaMs)

  // Replica la logica de filtrado del backend:
  // si rol=operador, solo devuelve las intervenciones propias del operador
  if (rol === 'operador' && operadorId) {
    intervenciones = intervenciones.filter(v => v.operador_id === Number(operadorId))
  }

  return Promise.resolve({ intervenciones, total: intervenciones.length })
}
