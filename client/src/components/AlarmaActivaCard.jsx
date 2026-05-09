import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import './AlarmaActivaCard.css'

function formatHora(iso) {
  const f = new Date(iso)
  return f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function formatActivaHace(iso) {
  const segundos = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

export function AlarmaActivaCard({ alarma }) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!alarma) return undefined
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [alarma])

  if (!alarma) {
    return (
      <section className="alarma-activa alarma-activa--ok">
        <header className="alarma-activa__header">
          <h2 className="alarma-activa__titulo alarma-activa__titulo--ok">Sin alarmas activas</h2>
        </header>
        <p className="alarma-activa__msg">El cuarto opera dentro de los umbrales seguros.</p>
      </section>
    )
  }

  const esCritica = alarma.tipo === 'critica'

  return (
    <section className={`alarma-activa alarma-activa--${alarma.tipo}`}>
      <header className="alarma-activa__header">
        <h2 className="alarma-activa__titulo">
          {esCritica ? 'Alarma crítica activa' : 'Alarma preventiva activa'}
        </h2>
        <span className="alarma-activa__hace">Activa hace {formatActivaHace(alarma.inicio)}</span>
      </header>

      <dl className="alarma-activa__lista">
        <div className="alarma-activa__fila">
          <dt>Inicio</dt>
          <dd>{formatHora(alarma.inicio)}</dd>
        </div>
        <div className="alarma-activa__fila">
          <dt>Temperatura pico</dt>
          <dd className={`alarma-activa__valor alarma-activa__valor--${alarma.tipo}`}>
            +{alarma.temperaturaPico.toFixed(1)}°C
          </dd>
        </div>
        <div className="alarma-activa__fila">
          <dt>Umbral superado</dt>
          <dd>{alarma.umbralSuperado.toFixed(1)}°C</dd>
        </div>
        <div className="alarma-activa__fila">
          <dt>Presencia en cuarto</dt>
          <dd className={alarma.presenciaEnCuarto ? 'alarma-activa__valor--critica' : ''}>
            {alarma.presenciaEnCuarto
              ? (alarma.cierreBloqueado ? 'Si — cierre bloqueado' : 'Si')
              : 'No'}
          </dd>
        </div>
        <div className="alarma-activa__fila">
          <dt>ID alarma en BD</dt>
          <dd className="alarma-activa__valor--muted">#{alarma.id}</dd>
        </div>
      </dl>
    </section>
  )
}

AlarmaActivaCard.propTypes = {
  alarma: PropTypes.shape({
    id: PropTypes.string.isRequired,
    tipo: PropTypes.oneOf(['preventiva', 'critica']).isRequired,
    inicio: PropTypes.string.isRequired,
    temperaturaPico: PropTypes.number.isRequired,
    umbralSuperado: PropTypes.number.isRequired,
    presenciaEnCuarto: PropTypes.bool,
    cierreBloqueado: PropTypes.bool
  })
}
