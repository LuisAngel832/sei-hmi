import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { obtenerIntervenciones } from '../api/intervenciones'
import './EventosCuarto.css'

function tonoDeEvento(tipo) {
  if (tipo === 'critica') return 'critica'
  if (tipo === 'preventiva') return 'preventiva'
  if (tipo === 'normal') return 'normal'
  return 'cyan'
}

const ETIQUETAS_TIPO = {
  silenciar_alarma: 'Alarma silenciada',
  forzar_refrigeracion: 'Refrigeración forzada',
  forzar_puerta: 'Puerta forzada',
  cancelar_cierre: 'Cierre cancelado'
}

function tonoDeIntervencion(tipoAccion) {
  if (tipoAccion === 'silenciar_alarma') return 'critica'
  if (tipoAccion === 'forzar_refrigeracion') return 'cyan'
  if (tipoAccion === 'forzar_puerta') return 'preventiva'
  return 'normal'
}

function horaCorta(timestamp) {
  if (!timestamp) return ''
  const f = new Date(timestamp)
  if (Number.isNaN(f.getTime())) return String(timestamp)
  return f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export function EventosCuarto({ cuartoId, eventosLog }) {
  const [intervenciones, setIntervenciones] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    let activo = true
    obtenerIntervenciones({ cuartoId })
      .then(({ intervenciones: data }) => {
        if (!activo) return
        setIntervenciones(data)
      })
      .catch((err) => {
        if (!activo) return
        setError(err?.response?.data?.mensaje || 'No se pudieron cargar las intervenciones')
      })
    return () => { activo = false }
  }, [cuartoId])

  const items = useMemo(() => {
    const sistema = (eventosLog || [])
      .filter(e => e.cuartoId === cuartoId || e.cuartoId === null)
      .filter(e => !(e.descripcion || '').startsWith('Comando:'))
      .map(e => ({
        id: `s-${e.id}`,
        hora: e.hora,
        tono: tonoDeEvento(e.tipo),
        descripcion: e.descripcion
      }))

    const manuales = (intervenciones || [])
      .filter(i => i.cuarto_id === cuartoId)
      .map(i => ({
        id: `i-${i.id}`,
        hora: horaCorta(i.timestamp),
        tono: tonoDeIntervencion(i.tipo_accion),
        descripcion: `${ETIQUETAS_TIPO[i.tipo_accion] || i.tipo_accion} (operador #${i.operador_id})`
      }))

    return [...sistema, ...manuales].slice(-12).reverse()
  }, [cuartoId, eventosLog, intervenciones])

  return (
    <section className="eventos-cuarto">
      <h2 className="eventos-cuarto__titulo">EVENTOS DEL CUARTO</h2>
      {error && <p className="eventos-cuarto__error">{error}</p>}
      {items.length === 0 ? (
        <p className="eventos-cuarto__vacio">Sin eventos recientes para este cuarto.</p>
      ) : (
        <ul className="eventos-cuarto__lista">
          {items.map((it) => (
            <li key={it.id} className="eventos-cuarto__item">
              <span className="eventos-cuarto__hora">{it.hora}</span>
              <span className={`eventos-cuarto__desc eventos-cuarto__desc--${it.tono}`}>
                {it.descripcion}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

EventosCuarto.propTypes = {
  cuartoId: PropTypes.number.isRequired,
  eventosLog: PropTypes.array
}
