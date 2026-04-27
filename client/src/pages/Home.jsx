import { useCallback, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useSocket'
import { Header } from '../components/Header'
import { RoomCard } from '../components/RoomCard'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function Home() {
  const { user } = useAuth()
  const {
    cuartos,
    conectado,
    alarmasActivas,
    silenciarAlarma,
    cerrarPuerta,
    forzarRefrigeracion
  } = useSocket()

  const [cuartoEnConfirmacion, setCuartoEnConfirmacion] = useState(null)

  const abrirConfirmacionForzar = useCallback((cuartoId) => {
    setCuartoEnConfirmacion(cuartoId)
  }, [])

  const cancelarForzar = useCallback(() => {
    setCuartoEnConfirmacion(null)
  }, [])

  const confirmarForzar = useCallback(() => {
    if (cuartoEnConfirmacion !== null) {
      forzarRefrigeracion?.(cuartoEnConfirmacion)
    }
    setCuartoEnConfirmacion(null)
  }, [cuartoEnConfirmacion, forzarRefrigeracion])

  const tempCuartoSeleccionado = cuartoEnConfirmacion !== null
    ? cuartos[cuartoEnConfirmacion]?.temperatura
    : null

  return (
    <div className="app">
      <Header conectado={conectado} alarmasActivas={alarmasActivas} />
      <main className="dashboard">
        <div className="room-grid">
          {[1, 2, 3, 4, 5].map(id => (
            <RoomCard
              key={id}
              cuartoId={id}
              datos={cuartos[id]}
              userRol={user?.rol}
              onSilenciar={silenciarAlarma}
              onCerrarPuerta={cerrarPuerta}
              onForzarRefrigeracion={abrirConfirmacionForzar}
            />
          ))}
        </div>
      </main>

      <ConfirmDialog
        open={cuartoEnConfirmacion !== null}
        titulo={`Forzar refrigeracion — Cuarto ${cuartoEnConfirmacion ?? ''}`}
        mensaje={
          <>
            Vas a publicar un comando de <strong>forzar_encendido</strong> al
            100% de potencia en el Cuarto {cuartoEnConfirmacion}.
            {typeof tempCuartoSeleccionado === 'number' && (
              <> La temperatura actual es <strong>{tempCuartoSeleccionado.toFixed(1)} C</strong>.</>
            )}
            <br />
            La accion se registrara en intervenciones_manuales con tu rol de supervisor.
          </>
        }
        textoConfirmar="Forzar al 100%"
        textoCancelar="Cancelar"
        tonoAccion="primario"
        onConfirmar={confirmarForzar}
        onCancelar={cancelarForzar}
      />
    </div>
  )
}
