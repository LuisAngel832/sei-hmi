import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import './DiagnosticoMqtt.css'

function ultimaPub(timestamp, sinSenal) {
  if (sinSenal || !timestamp) return 'sin senal'
  const segundos = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (segundos < 5) return 'ahora'
  if (segundos < 60) return `hace ${segundos}s`
  const m = Math.floor(segundos / 60)
  if (m < 60) return `hace ${m}m`
  return `hace ${Math.floor(m / 60)}h`
}

export function DiagnosticoMqtt({ cuartoId, timestamp, sinSenal, conectado }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="diag-mqtt" aria-label="Diagnostico MQTT">
      <div className="diag-mqtt__fila">
        <span className="diag-mqtt__label">Tópico MQTT:</span>
        <span className="diag-mqtt__valor diag-mqtt__valor--cyan">sei/cuartos/{cuartoId}/#</span>
      </div>
      <div className="diag-mqtt__fila">
        <span className="diag-mqtt__label">Última publicación:</span>
        <span className={`diag-mqtt__valor ${sinSenal ? 'diag-mqtt__valor--critica' : 'diag-mqtt__valor--cyan'}`}>
          {ultimaPub(timestamp, sinSenal)}
        </span>
      </div>
      <div className="diag-mqtt__fila">
        <span className="diag-mqtt__label">Estado bridge:</span>
        <span className={`diag-mqtt__valor ${conectado ? 'diag-mqtt__valor--normal' : 'diag-mqtt__valor--critica'}`}>
          {conectado ? 'Conectado' : 'Desconectado'}
        </span>
      </div>
      <div className="diag-mqtt__fila">
        <span className="diag-mqtt__label">Límite preventivo:</span>
        <span className="diag-mqtt__valor diag-mqtt__valor--preventiva">3.0°C</span>
      </div>
      <div className="diag-mqtt__fila">
        <span className="diag-mqtt__label">Límite crítico:</span>
        <span className="diag-mqtt__valor diag-mqtt__valor--critica">4.0°C</span>
      </div>
    </section>
  )
}

DiagnosticoMqtt.propTypes = {
  cuartoId: PropTypes.number.isRequired,
  timestamp: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  sinSenal: PropTypes.bool,
  conectado: PropTypes.bool
}
