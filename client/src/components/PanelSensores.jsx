import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import './PanelSensores.css'

function formatTemp(t) {
  if (typeof t !== 'number') return '—'
  const signo = t > 0 ? '+' : ''
  return `${signo}${t.toFixed(1)}°C`
}

function formatUltimaLectura(timestamp, sinSenal) {
  if (sinSenal || !timestamp) return 'sin senal'
  const segundos = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (segundos < 5) return 'ahora'
  if (segundos < 60) return `hace ${segundos}s`
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) return `hace ${minutos}m`
  const horas = Math.floor(minutos / 60)
  return `hace ${horas}h`
}

function tonoTemp(estado) {
  if (estado === 'critica') return 'critica'
  if (estado === 'preventiva') return 'preventiva'
  return 'cyan'
}

export function PanelSensores({ datos }) {
  const {
    temperatura,
    estadoAlarma,
    presencia,
    puerta,
    sinSenal,
    timestamp
  } = datos

  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="panel-card panel-sensores">
      <h2 className="panel-card__titulo">SENSORES</h2>
      <ul className="panel-card__lista">
        <li className="panel-card__fila">
          <span className="panel-card__label">Sensor de temperatura</span>
          <span className={`panel-card__valor panel-card__valor--${tonoTemp(estadoAlarma)}`}>
            <span className="panel-card__dot" /> {formatTemp(temperatura)}
          </span>
        </li>
        <li className="panel-card__fila">
          <span className="panel-card__label">Sensor de presencia (PIR)</span>
          <span className={`panel-card__valor panel-card__valor--${presencia ? 'presencia' : 'muted'}`}>
            <span className="panel-card__dot" /> {presencia ? 'Detectada' : 'Sin presencia'}
          </span>
        </li>
        <li className="panel-card__fila">
          <span className="panel-card__label">Reed switch (puerta)</span>
          <span className={`panel-card__valor panel-card__valor--${puerta === 'abierta' ? 'preventiva' : 'normal'}`}>
            <span className="panel-card__dot" /> {puerta === 'abierta' ? 'Abierta' : 'Cerrada'}
          </span>
        </li>
        <li className="panel-card__fila">
          <span className="panel-card__label">Estado señal</span>
          <span className={`panel-card__valor panel-card__valor--${sinSenal ? 'critica' : 'normal'}`}>
            <span className="panel-card__dot" /> {sinSenal ? 'Sin señal' : 'En línea'}
          </span>
        </li>
        <li className="panel-card__fila">
          <span className="panel-card__label">Última lectura</span>
          <span className="panel-card__valor panel-card__valor--muted">
            {formatUltimaLectura(timestamp, sinSenal)}
          </span>
        </li>
      </ul>
    </section>
  )
}

PanelSensores.propTypes = {
  datos: PropTypes.shape({
    temperatura: PropTypes.number,
    estadoAlarma: PropTypes.string,
    presencia: PropTypes.bool,
    puerta: PropTypes.string,
    sinSenal: PropTypes.bool,
    timestamp: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
  }).isRequired
}
