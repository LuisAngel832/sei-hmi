import PropTypes from 'prop-types'
import './PanelAcciones.css'

export function PanelAcciones({
  rol,
  estadoAlarma,
  temperatura,
  puerta,
  presencia = false,
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
  // Bloqueado por seguridad: cerrar la puerta con personal dentro es un riesgo HACCP.
  const puedeCerrar = puerta === 'abierta' && !presencia
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
        title={
          puerta !== 'abierta'
            ? 'La puerta ya esta cerrada'
            : presencia
              ? 'Bloqueado por seguridad: hay presencia detectada en el cuarto'
              : 'Forzar cierre de la puerta automatica'
        }
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
  presencia: PropTypes.bool,
  onForzarRefrigeracion: PropTypes.func.isRequired,
  onForzarCierre: PropTypes.func.isRequired,
  onSilenciar: PropTypes.func.isRequired
}
