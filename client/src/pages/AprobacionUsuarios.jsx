import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useSocket } from '../hooks/useSocket'
import { aprobar, getPendientes } from '../api/usuarios'
import './AprobacionUsuarios.css'

const ROL_LABELS = {
  operador: 'Operador',
  supervisor: 'Supervisor'
}

function formatFecha(valor) {
  if (!valor) return '—'
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return String(valor)
  return d.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

export function AprobacionUsuarios() {
  const { user } = useAuth()
  const { showToast } = useToast()
  // Reutilizamos el socket compartido para que el Header muestre el estado
  // real de conexión, igual que en Home/CuartoDetalle/Historial.
  const { conectado, alarmasActivas } = useSocket()
  const [pendientes, setPendientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(null)
  const [aprobandoId, setAprobandoId] = useState(null)
  const [errorPorFila, setErrorPorFila] = useState({})

  const cargar = useCallback(async () => {
    setCargando(true)
    setErrorCarga(null)
    try {
      const lista = await getPendientes()
      setPendientes(lista)
    } catch (err) {
      const status = err.response?.status
      if (status === 403) {
        setErrorCarga('No tienes permisos para ver esta seccion.')
      } else {
        setErrorCarga('No fue posible cargar las cuentas pendientes. Intenta de nuevo.')
      }
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (user?.rol !== 'operador') return
    cargar()
  }, [user, cargar])

  // Acceso denegado para no-operadores. Render aparte para no llamar al back.
  if (user?.rol !== 'operador') {
    return (
      <div className="aprobacion">
        <Header conectado={conectado} alarmasActivas={alarmasActivas} />
        <main className="aprobacion__contenido">
          <div className="aprobacion__bloqueo">
            <h1 className="aprobacion__bloqueo-titulo">Acceso denegado</h1>
            <p className="aprobacion__bloqueo-texto">
              Esta seccion solo esta disponible para operadores activos.
            </p>
            <Link to="/" className="aprobacion__bloqueo-volver">Volver al panel</Link>
          </div>
        </main>
      </div>
    )
  }

  const handleAprobar = async (cuenta) => {
    setAprobandoId(cuenta.id)
    setErrorPorFila((prev) => {
      const next = { ...prev }
      delete next[cuenta.id]
      return next
    })
    try {
      await aprobar(cuenta.id)
      setPendientes((prev) => prev.filter((c) => c.id !== cuenta.id))
      showToast(`Cuenta "${cuenta.usuario}" aprobada.`, { tipo: 'exito' })
    } catch (err) {
      const mensaje =
        err.response?.data?.mensaje ??
        err.response?.data?.error ??
        err.message ??
        'No fue posible aprobar la cuenta.'
      setErrorPorFila((prev) => ({ ...prev, [cuenta.id]: mensaje }))
    } finally {
      setAprobandoId(null)
    }
  }

  return (
    <div className="aprobacion">
      <Header conectado={conectado} alarmasActivas={alarmasActivas} />
      <main className="aprobacion__contenido">
        <header className="aprobacion__cabecera">
          <h1 className="aprobacion__titulo">Aprobacion de cuentas</h1>
          <p className="aprobacion__descripcion">
            Revisa las solicitudes pendientes y aprueba las cuentas validas para
            permitir el inicio de sesion.
          </p>
        </header>

        {cargando && (
          <p className="aprobacion__estado" role="status">Cargando cuentas pendientes...</p>
        )}

        {!cargando && errorCarga && (
          <div className="aprobacion__error" role="alert">
            <span>{errorCarga}</span>
            <button type="button" className="aprobacion__reintentar" onClick={cargar}>
              Reintentar
            </button>
          </div>
        )}

        {!cargando && !errorCarga && pendientes.length === 0 && (
          <p className="aprobacion__estado">
            No hay cuentas pendientes de aprobacion.
          </p>
        )}

        {!cargando && !errorCarga && pendientes.length > 0 && (
          <div className="aprobacion__tabla-wrap">
            <table className="aprobacion__tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Fecha de solicitud</th>
                  <th className="aprobacion__th-accion">Accion</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((cuenta) => {
                  const rolLabel = ROL_LABELS[cuenta.rol] ?? cuenta.rol ?? '—'
                  const fechaRaw = cuenta.fechaSolicitud ?? cuenta.fecha_solicitud ?? cuenta.createdAt ?? cuenta.creadoEn
                  const errFila = errorPorFila[cuenta.id]
                  const enProgreso = aprobandoId === cuenta.id
                  return (
                    <tr key={cuenta.id}>
                      <td>{cuenta.nombre ?? '—'}</td>
                      <td className="aprobacion__td-mono">{cuenta.usuario ?? '—'}</td>
                      <td>
                        <span className={`aprobacion__rol aprobacion__rol--${cuenta.rol ?? 'operador'}`}>
                          {rolLabel}
                        </span>
                      </td>
                      <td className="aprobacion__td-mono">{formatFecha(fechaRaw)}</td>
                      <td className="aprobacion__td-accion">
                        <button
                          type="button"
                          className="aprobacion__btn-aprobar"
                          onClick={() => handleAprobar(cuenta)}
                          disabled={enProgreso}
                        >
                          {enProgreso ? 'Aprobando...' : 'Aprobar'}
                        </button>
                        {errFila && (
                          <p className="aprobacion__error-fila" role="alert">{errFila}</p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
