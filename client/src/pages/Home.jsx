import { useCallback, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useSocket'
import { Header } from '../components/Header'
import { RoomCard } from '../components/RoomCard'
import { ModalForzarRefrigeracion } from '../components/ModalForzarRefrigeracion'

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

  const confirmarForzar = useCallback(({ cuartoId, duracionMinutos, potenciaPct }) => {
    forzarRefrigeracion?.(cuartoId, { duracionMinutos, potenciaPct })
    setCuartoEnConfirmacion(null)
  }, [forzarRefrigeracion])

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

      <ModalForzarRefrigeracion
        open={cuartoEnConfirmacion !== null}
        cuartos={cuartos}
        cuartoIdInicial={cuartoEnConfirmacion}
        onConfirmar={confirmarForzar}
        onCancelar={cancelarForzar}
      />
    </div>
  )
}
