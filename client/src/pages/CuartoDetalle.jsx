import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useSocket'
import { obtenerAlarmaActiva } from '../api/cuartoDetalle'
import { Header } from '../components/Header'
import { GraficoTemperatura } from '../components/GraficoTemperatura'
import { PanelSensores } from '../components/PanelSensores'
import { PanelActuadores } from '../components/PanelActuadores'
import { PanelAcciones } from '../components/PanelAcciones'
import { AlarmaActivaCard } from '../components/AlarmaActivaCard'
import { EventosCuarto } from '../components/EventosCuarto'
import { DiagnosticoMqtt } from '../components/DiagnosticoMqtt'
import { ConfirmDialog } from '../components/ConfirmDialog'
import './CuartoDetalle.css'

const ACCION_FORZAR = 'forzar_refrigeracion'
const ACCION_CIERRE = 'forzar_cierre'
const ACCION_SILENCIAR = 'silenciar_alarma'

export function CuartoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const cuartoId = Number.parseInt(id, 10)

  const { user } = useAuth()
  const {
    cuartos,
    conectado,
    alarmasActivas,
    eventosLog,
    silenciarAlarma,
    cerrarPuerta,
    forzarRefrigeracion
  } = useSocket()

  const [accionPendiente, setAccionPendiente] = useState(null)
  const [alarma, setAlarma] = useState(null)

  const cuartoInvalido = !Number.isInteger(cuartoId) || cuartoId < 1 || cuartoId > 5
  const datos = !cuartoInvalido ? cuartos[cuartoId] : null

  useEffect(() => {
    if (cuartoInvalido || !datos) return undefined
    let activo = true
    obtenerAlarmaActiva(cuartoId, {
      temperatura: datos.temperatura,
      estadoAlarma: datos.estadoAlarma,
      presencia: datos.presencia
    }).then(({ alarma: a }) => activo && setAlarma(a))
      .catch(() => activo && setAlarma(null))
    return () => { activo = false }
  }, [cuartoId, cuartoInvalido, datos])

  const abrirConfirmacion = (tipo) => setAccionPendiente(tipo)
  const cerrarConfirmacion = () => setAccionPendiente(null)

  const confirmarAccion = () => {
    if (accionPendiente === ACCION_FORZAR) forzarRefrigeracion?.(cuartoId)
    if (accionPendiente === ACCION_CIERRE) cerrarPuerta?.(cuartoId)
    if (accionPendiente === ACCION_SILENCIAR) silenciarAlarma?.(cuartoId)
    setAccionPendiente(null)
  }

  const dialogContenido = useMemo(() => {
    if (accionPendiente === ACCION_FORZAR) {
      return {
        titulo: `Forzar refrigeracion — Cuarto ${cuartoId}`,
        mensaje: (
          <>
            Vas a publicar un comando <strong>forzar_encendido</strong> al 100% en
            el Cuarto {cuartoId}. La accion se registrara en intervenciones_manuales
            con tu rol de supervisor.
          </>
        ),
        textoConfirmar: 'Forzar al 100%',
        tono: 'primario'
      }
    }
    if (accionPendiente === ACCION_CIERRE) {
      return {
        titulo: `Forzar cierre de puerta — Cuarto ${cuartoId}`,
        mensaje: (
          <>
            Vas a publicar un comando <strong>forzar_cierre</strong> en el Cuarto
            {' '}{cuartoId}. Si hay presencia detectada, el cierre puede quedar
            bloqueado por seguridad. Quedara registrada como intervencion manual.
          </>
        ),
        textoConfirmar: 'Forzar cierre',
        tono: 'primario'
      }
    }
    if (accionPendiente === ACCION_SILENCIAR) {
      return {
        titulo: `Silenciar alarma — Cuarto ${cuartoId}`,
        mensaje: (
          <>
            Vas a silenciar la alarma critica del Cuarto {cuartoId}. La sirena y
            la luz roja se apagaran, pero la condicion de temperatura sigue activa
            hasta que baje del umbral.
          </>
        ),
        textoConfirmar: 'Silenciar alarma',
        tono: 'critico'
      }
    }
    return null
  }, [accionPendiente, cuartoId])

  if (cuartoInvalido) {
    return (
      <div className="app">
        <Header conectado={conectado} alarmasActivas={alarmasActivas} />
        <main className="cuarto-detalle">
          <p className="cuarto-detalle__error">Cuarto no valido. Volver al
            <Link to="/" className="cuarto-detalle__link"> panel</Link>.
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <Header conectado={conectado} alarmasActivas={alarmasActivas} />

      <main className="cuarto-detalle">
        <div className="cuarto-detalle__breadcrumb">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="cuarto-detalle__volver"
            aria-label="Volver al panel"
          >
            ← Panel
          </button>
          <span className="cuarto-detalle__crumb">/ Cuarto {cuartoId}</span>
          <span className="cuarto-detalle__topico">SEI / CUARTO-0{cuartoId}</span>
        </div>

        <div className="cuarto-detalle__grid">
          <div className="cuarto-detalle__izquierda">
            <GraficoTemperatura
              cuartoId={cuartoId}
              temperaturaActual={datos.temperatura}
              estadoAlarma={datos.estadoAlarma}
            />

            <div className="cuarto-detalle__paneles-2col">
              <PanelSensores datos={datos} />
              <PanelActuadores datos={datos} />
            </div>
          </div>

          <aside className="cuarto-detalle__derecha">
            <AlarmaActivaCard alarma={alarma} />

            <PanelAcciones
              rol={user?.rol}
              estadoAlarma={datos.estadoAlarma}
              temperatura={datos.temperatura}
              puerta={datos.puerta}
              onForzarRefrigeracion={() => abrirConfirmacion(ACCION_FORZAR)}
              onForzarCierre={() => abrirConfirmacion(ACCION_CIERRE)}
              onSilenciar={() => abrirConfirmacion(ACCION_SILENCIAR)}
            />

            <EventosCuarto cuartoId={cuartoId} eventosLog={eventosLog} />

            {user?.rol === 'supervisor' && (
              <DiagnosticoMqtt
                cuartoId={cuartoId}
                timestamp={datos.timestamp}
                sinSenal={datos.sinSenal}
                conectado={conectado}
              />
            )}
          </aside>
        </div>
      </main>

      <ConfirmDialog
        open={accionPendiente !== null}
        titulo={dialogContenido?.titulo ?? ''}
        mensaje={dialogContenido?.mensaje ?? null}
        textoConfirmar={dialogContenido?.textoConfirmar ?? 'Confirmar'}
        textoCancelar="Cancelar"
        tonoAccion={dialogContenido?.tono ?? 'primario'}
        onConfirmar={confirmarAccion}
        onCancelar={cerrarConfirmacion}
      />
    </div>
  )
}
