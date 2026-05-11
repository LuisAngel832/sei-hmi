import PropTypes from 'prop-types'
import './PanelAcciones.css'

export function PanelAcciones({
  rol,
  estadoAlarma,
  temperatura,
  puerta,
  onForzarRefrigeracion,
  onForzarCierre,
  onSilenciar
}) {
  if (rol !== 'operador') {
    return (
      <aside className="panel-acciones panel-acciones--readonly" role="note">
        <span className="panel-acciones__readonly-icono" aria-hidden>i</span>
        <div>
          <strong>Solo lectura</strong>
          <p>Las acciones manuales sobre el cuarto (forzar refrigeración, forzar cierre, silenciar
            alarma) requieren rol <em>operador</em>.</p>
        </div>
      </aside>
    )
  }

  const puedeForzar = typeof temperatura === 'number' && temperatura > 3
  const puedeCerrar = puerta === 'abierta'
  const puedeSilenciar = estadoAlarma === 'critica'

  return (
    <section className="panel-acciones">
      <h2 className="panel-acciones__titulo panel-acciones__titulo--oculto">Acciones</h2>

      <button
        type="button"
        className="panel-acciones__btn panel-acciones__btn--forzar"
        onClick={onForzarRefrigeracion}
        disabled={!puedeForzar}
        title={puedeForzar ? 'Forzar refrigeracion al 100%' : 'Disponible solo si la temperatura supera 3°C'}
      >
        Forzar refrigeración
      </button>

      <button
        type="button"
        className="panel-acciones__btn panel-acciones__btn--cierre"
        onClick={onForzarCierre}
        disabled={!puedeCerrar}
        title={puedeCerrar ? 'Forzar cierre de la puerta automatica' : 'La puerta ya esta cerrada'}
      >
        Forzar cierre
      </button>

      <button
        type="button"
        className="panel-acciones__btn panel-acciones__btn--silenciar"
        onClick={onSilenciar}
        disabled={!puedeSilenciar}
        title={puedeSilenciar ? 'Silenciar alarma critica' : 'No hay alarma critica activa'}
      >
        Silenciar alarma
      </button>
    </section>
  )
}

PanelAcciones.propTypes = {
  rol: PropTypes.oneOf(['operador', 'supervisor']),
  estadoAlarma: PropTypes.string,
  temperatura: PropTypes.number,
  puerta: PropTypes.string,
  onForzarRefrigeracion: PropTypes.func.isRequired,
  onForzarCierre: PropTypes.func.isRequired,
  onSilenciar: PropTypes.func.isRequired
}
