import { useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import { obtenerIntervenciones } from '../api/intervenciones'
import './LogIntervenciones.css'

const CUARTOS_OPCIONES = [0, 1, 2, 3, 4, 5]  // 0 = todos

const TIPO_ACCION_LABEL = {
  silenciar_alarma:    'Silenciar alarma',
  forzar_refrigeracion: 'Forzar refrigeracion',
  forzar_puerta:       'Forzar cierre puerta',
  cancelar_cierre:     'Cancelar cierre'
}

// Tipos que el back persiste en intervenciones_manuales pero que en realidad
// son ajustes automáticos del sistema (no acciones del operador). Los ocultamos
// aquí para que el log sólo muestre intervenciones humanas reales — el auditor
// HACCP necesita distinguir lo manual de lo automático.
const TIPOS_OCULTOS = new Set([
  'ajuste_automatico_potencia',
  'cancelar_refrigeracion_forzada'
])

function formatTimestamp(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    })
  } catch {
    return iso
  }
}

export function LogIntervenciones({ userRol }) {
  const [cuartoId, setCuartoId]   = useState(0)
  const [intervenciones, setIntervenciones] = useState([])
  const [cargando, setCargando]   = useState(false)
  const [error, setError]         = useState(null)
  const [buscado, setBuscado]     = useState(false)

  const buscar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const params = cuartoId > 0 ? { cuartoId } : {}
      const resultado = await obtenerIntervenciones(params)
      const todas = resultado.intervenciones ?? []
      // Excluye automatismos del sistema (ver TIPOS_OCULTOS).
      setIntervenciones(todas.filter(v => !TIPOS_OCULTOS.has(v.tipo_accion)))
      setBuscado(true)
    } catch (err) {
      setError(err?.response?.status === 401
        ? 'Sesion expirada. Recarga la pagina.'
        : 'No se pudo cargar el log de intervenciones.')
      setIntervenciones([])
    } finally {
      setCargando(false)
    }
  }, [cuartoId])

  const esSupervisor = userRol === 'supervisor'

  return (
    <div className="log-int">
      <div className="log-int__filtros">
        <div className="log-int__filtros-grupo">
          <label className="log-int__label" htmlFor="log-cuarto">Cuarto</label>
          <select
            id="log-cuarto"
            className="log-int__select"
            value={cuartoId}
            onChange={e => setCuartoId(Number(e.target.value))}
          >
            <option value={0}>Todos los cuartos</option>
            {[1, 2, 3, 4, 5].map(id => (
              <option key={id} value={id}>Cuarto {id}</option>
            ))}
          </select>
        </div>
        <button
          className="log-int__btn"
          onClick={buscar}
          disabled={cargando}
        >
          {cargando ? 'Cargando...' : 'Consultar'}
        </button>
      </div>

      {!esSupervisor && (
        <p className="log-int__aviso">
          Mostrando solo tus intervenciones. El supervisor puede ver las de todos los operadores.
        </p>
      )}

      {error && (
        <div className="log-int__error" role="alert">{error}</div>
      )}

      {buscado && !cargando && !error && (
        <>
          <p className="log-int__meta">
            {intervenciones.length} intervenciones
            {cuartoId > 0 ? ` — Cuarto ${cuartoId}` : ' — Todos los cuartos'}
          </p>

          <div className="log-int__scroll">
            <table className="log-int__table">
              <thead>
                <tr>
                  <th className="log-int__th">Timestamp</th>
                  <th className="log-int__th">Tipo de accion</th>
                  <th className="log-int__th log-int__th--num">Cuarto</th>
                  <th className="log-int__th log-int__th--num">Operador ID</th>
                  <th className="log-int__th">Rol en ejecucion</th>
                </tr>
              </thead>
              <tbody>
                {intervenciones.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="log-int__vacia">
                      Sin intervenciones para el filtro seleccionado
                    </td>
                  </tr>
                ) : intervenciones.map((v, idx) => (
                  <tr key={v.id ?? idx} className="log-int__row">
                    <td className="log-int__td log-int__td--ts">{formatTimestamp(v.timestamp)}</td>
                    <td className="log-int__td">
                      <span className={`log-int__tipo log-int__tipo--${v.tipo_accion}`}>
                        {TIPO_ACCION_LABEL[v.tipo_accion] ?? v.tipo_accion}
                      </span>
                    </td>
                    <td className="log-int__td log-int__td--num">{v.cuarto_id}</td>
                    <td className="log-int__td log-int__td--num">{v.operador_id}</td>
                    <td className="log-int__td">
                      <span className="log-int__rol">{v.rol_en_ejecucion}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!buscado && !cargando && (
        <div className="log-int__inicial">
          Selecciona un cuarto (opcional) y haz click en <strong>Consultar</strong>.
        </div>
      )}
    </div>
  )
}

LogIntervenciones.propTypes = {
  userRol: PropTypes.oneOf(['operador', 'supervisor'])
}
