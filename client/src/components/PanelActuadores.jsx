import PropTypes from 'prop-types'
import './PanelSensores.css'

function badge(label, tono) {
  return <span className={`panel-card__badge panel-card__badge--${tono}`}>{label}</span>
}

export function PanelActuadores({ datos }) {
  const {
    cortina,
    puerta,
    refrigeracion,
    motivoRefrigeracion,
    estadoAlarma
  } = datos

  const cortinaActiva = cortina === 'activa'
  const puertaLabel = puerta === 'cerrada' ? 'Cerrada'
    : puerta === 'cerrando' ? 'Cerrando'
    : puerta === 'cierre_cancelado' ? 'Cierre cancelado'
    : 'Abierta'

  const refrigEsAlta = refrigeracion >= 100
  const refrigTono = motivoRefrigeracion === 'PUERTA_ABIERTA' ? 'critica'
    : motivoRefrigeracion === 'FORZADO_MANUAL' ? 'preventiva'
    : refrigEsAlta ? 'cyan' : 'cyan'

  const alarmaLuzTono = estadoAlarma === 'critica' ? 'critica'
    : estadoAlarma === 'preventiva' ? 'preventiva'
    : 'muted'
  const alarmaLuzLabel = estadoAlarma === 'critica' ? 'Roja activa'
    : estadoAlarma === 'preventiva' ? 'Ámbar activa'
    : 'Apagada'

  const sirenaTono = estadoAlarma === 'critica' ? 'critica' : 'muted'
  const sirenaLabel = estadoAlarma === 'critica' ? 'Continua' : 'En silencio'

  return (
    <section className="panel-card">
      <h2 className="panel-card__titulo">ACTUADORES</h2>
      <ul className="panel-card__lista">
        <li className="panel-card__fila">
          <span className="panel-card__label">Cortina de aire</span>
          {badge(cortinaActiva ? 'Activa' : 'Inactiva', cortinaActiva ? 'preventiva' : 'muted')}
        </li>
        <li className="panel-card__fila">
          <span className="panel-card__label">Puerta automática</span>
          {badge(puertaLabel, puerta === 'abierta' ? 'preventiva' : puerta === 'cerrando' ? 'critica' : 'normal')}
        </li>
        <li className="panel-card__fila">
          <span className="panel-card__label">Sistema de refrigeración</span>
          {badge(`${refrigeracion}%`, refrigTono)}
        </li>
        <li className="panel-card__fila">
          <span className="panel-card__label">Alarma visual (luz)</span>
          {badge(alarmaLuzLabel, alarmaLuzTono)}
        </li>
        <li className="panel-card__fila">
          <span className="panel-card__label">Alarma sonora (sirena)</span>
          {badge(sirenaLabel, sirenaTono)}
        </li>
      </ul>
    </section>
  )
}

PanelActuadores.propTypes = {
  datos: PropTypes.shape({
    cortina: PropTypes.string,
    puerta: PropTypes.string,
    refrigeracion: PropTypes.number,
    motivoRefrigeracion: PropTypes.string,
    estadoAlarma: PropTypes.string
  }).isRequired
}
