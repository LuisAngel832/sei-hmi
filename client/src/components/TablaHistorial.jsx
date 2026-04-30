import PropTypes from 'prop-types'
import './TablaHistorial.css'

const FILAS_POR_PAGINA = 50

const ESTADO_ALARMA_LABEL = { normal: 'Normal', preventiva: 'Preventiva', critica: 'Critica' }

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

export function TablaHistorial({ lecturas, pagina, onCambiarPagina }) {
  const total = lecturas.length
  const totalPaginas = Math.max(1, Math.ceil(total / FILAS_POR_PAGINA))
  const paginaSegura = Math.min(Math.max(pagina, 1), totalPaginas)
  const inicio = (paginaSegura - 1) * FILAS_POR_PAGINA
  const filas = lecturas.slice(inicio, inicio + FILAS_POR_PAGINA)

  return (
    <div className="tabla-historial">
      <div className="tabla-historial__scroll">
        <table className="tabla-historial__table">
          <thead>
            <tr>
              <th className="tabla-historial__th">Timestamp</th>
              <th className="tabla-historial__th tabla-historial__th--num">Cuarto</th>
              <th className="tabla-historial__th tabla-historial__th--num">Temp (°C)</th>
              <th className="tabla-historial__th">Estado alarma</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={4} className="tabla-historial__vacia">
                  Sin registros para el rango seleccionado
                </td>
              </tr>
            ) : filas.map((l, idx) => (
              <tr
                key={`${l.timestamp}-${idx}`}
                className={`tabla-historial__row tabla-historial__row--${l.estado_alarma}`}
              >
                <td className="tabla-historial__td tabla-historial__td--ts">{formatTimestamp(l.timestamp)}</td>
                <td className="tabla-historial__td tabla-historial__td--num">{l.cuarto_id}</td>
                <td className="tabla-historial__td tabla-historial__td--num">
                  {typeof l.temperatura === 'number'
                    ? `${l.temperatura > 0 ? '+' : ''}${l.temperatura.toFixed(1)}`
                    : '—'}
                </td>
                <td className="tabla-historial__td">
                  <span className={`tabla-historial__badge tabla-historial__badge--${l.estado_alarma}`}>
                    {ESTADO_ALARMA_LABEL[l.estado_alarma] ?? l.estado_alarma}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tabla-historial__paginacion" aria-label="Paginacion">
        <span className="tabla-historial__info">
          {total === 0 ? '0 registros' : `${inicio + 1}–${Math.min(inicio + FILAS_POR_PAGINA, total)} de ${total}`}
        </span>
        <div className="tabla-historial__controles">
          <button
            className="tabla-historial__btn"
            onClick={() => onCambiarPagina(1)}
            disabled={paginaSegura === 1}
            aria-label="Primera pagina"
          >
            «
          </button>
          <button
            className="tabla-historial__btn"
            onClick={() => onCambiarPagina(paginaSegura - 1)}
            disabled={paginaSegura === 1}
            aria-label="Pagina anterior"
          >
            ‹
          </button>
          <span className="tabla-historial__pagina">{paginaSegura} / {totalPaginas}</span>
          <button
            className="tabla-historial__btn"
            onClick={() => onCambiarPagina(paginaSegura + 1)}
            disabled={paginaSegura === totalPaginas}
            aria-label="Pagina siguiente"
          >
            ›
          </button>
          <button
            className="tabla-historial__btn"
            onClick={() => onCambiarPagina(totalPaginas)}
            disabled={paginaSegura === totalPaginas}
            aria-label="Ultima pagina"
          >
            »
          </button>
        </div>
      </div>
    </div>
  )
}

TablaHistorial.propTypes = {
  lecturas: PropTypes.arrayOf(PropTypes.shape({
    timestamp: PropTypes.string,
    cuarto_id: PropTypes.number,
    temperatura: PropTypes.number,
    estado_alarma: PropTypes.string
  })).isRequired,
  pagina: PropTypes.number.isRequired,
  onCambiarPagina: PropTypes.func.isRequired
}
