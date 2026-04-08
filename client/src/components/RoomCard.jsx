import './RoomCard.css'

export function RoomCard({ cuartoId, datos }) {
  const {
    temperatura,
    estadoAlarma = 'normal',
    presencia = false,
    puerta = 'cerrada',
    refrigeracion = 100
  } = datos

  const getTemperaturaColor = () => {
    if (temperatura === null) return 'var(--text-muted)'
    if (estadoAlarma === 'critica') return 'var(--color-critica)'
    if (estadoAlarma === 'preventiva') return 'var(--color-preventiva)'
    return 'var(--text-cyan)'
  }

  const getBarColor = () => {
    if (estadoAlarma === 'critica') return 'var(--color-critica)'
    if (estadoAlarma === 'preventiva') return 'var(--color-preventiva)'
    return 'var(--text-cyan)'
  }

  const getBarWidth = () => {
    if (temperatura === null) return '0%'
    // Mapea -20°C → 0% y +8°C → 100%
    const pct = ((temperatura + 20) / 28) * 100
    return `${Math.min(Math.max(pct, 0), 100)}%`
  }

  const getBadgeStyle = () => {
    if (estadoAlarma === 'critica') return {
      background: 'rgba(239, 68, 68, 0.14)',
      border: '1px solid rgba(239, 68, 68, 0.35)',
      color: 'var(--color-critica)',
      dotColor: 'var(--color-critica)'
    }
    if (estadoAlarma === 'preventiva') return {
      background: 'rgba(245, 158, 11, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.35)',
      color: 'var(--color-preventiva)',
      dotColor: 'var(--color-preventiva)'
    }
    return {
      background: 'rgba(16, 185, 129, 0.1)',
      border: '1px solid rgba(16, 185, 129, 0.25)',
      color: 'var(--color-normal)',
      dotColor: 'var(--color-normal)'
    }
  }

  const badge = getBadgeStyle()

  const formatTemperatura = (temp, sinSenal) => {
    if (sinSenal || temp === null) return 'Sin señal'
    const signo = temp > 0 ? '+' : ''
    return `${signo}${temp.toFixed(1)}°C`
  }

  const getPuertaColor = () => {
    if (puerta === 'abierta') return 'var(--color-preventiva)'
    return 'var(--color-normal)'
  }

  const getPresenciaColor = () => {
    if (presencia) return 'var(--text-presencia)'
    return '#334155'
  }

  const showSilenciarBtn = estadoAlarma === 'critica' || estadoAlarma === 'preventiva'
  const showCerrarBtn = estadoAlarma === 'critica' && puerta === 'abierta'

  return (
    <div className={`room-card room-card--${estadoAlarma}`}>

      {/* Header */}
      <div className="room-card__header">
        <div>
          <h3 className="room-card__titulo">Cuarto {cuartoId}</h3>
          <span className="room-card__subtitulo">SEI / CUARTO-0{cuartoId}</span>
        </div>
        <div
          className="room-card__badge"
          style={{
            background: badge.background,
            border: badge.border,
            color: badge.color
          }}
        >
          <span
            className="room-card__badge-dot"
            style={{ background: badge.dotColor }}
          />
          {estadoAlarma.charAt(0).toUpperCase() + estadoAlarma.slice(1)}
        </div>
      </div>

      {/* Temperatura */}
      <div className="room-card__temp-section">
        <span className="room-card__temp-label">TEMPERATURA</span>
        <div className="room-card__temp-bar-wrap">
          <div className="room-card__temp-bar-bg" />
          <div
            className="room-card__temp-bar-fill"
            style={{ width: getBarWidth(), background: getBarColor() }}
          />
        </div>
        <span
          className="room-card__temp-value"
          style={{ color: getTemperaturaColor() }}
        >
          {formatTemperatura(temperatura, datos.sinSenal)}
        </span>
      </div>

      {/* Puerta y Presencia */}
      <div className="room-card__sensores">
        <div className="room-card__sensor">
          <span className="room-card__sensor-label">PUERTA</span>
          <div className="room-card__sensor-value">
            <span
              className="room-card__sensor-dot"
              style={{ background: getPuertaColor() }}
            />
            <span style={{ color: getPuertaColor() }}>
              {puerta.charAt(0).toUpperCase() + puerta.slice(1)}
            </span>
          </div>
        </div>
        <div className="room-card__sensor">
          <span className="room-card__sensor-label">PRESENCIA</span>
          <div className="room-card__sensor-value">
            <span
              className="room-card__sensor-dot"
              style={{ background: getPresenciaColor() }}
            />
            <span style={{ color: getPresenciaColor() }}>
              {presencia ? 'Detectada' : 'Sin presencia'}
            </span>
          </div>
        </div>
      </div>

      {/* Refrigeración */}
      <div className="room-card__refrig">
        <span className="room-card__sensor-label">REFRIGERACIÓN</span>
        <div className="room-card__refrig-bar-wrap">
          <div className="room-card__temp-bar-bg" />
          <div
            className="room-card__temp-bar-fill"
            style={{ width: '100%', background: 'var(--text-cyan)' }}
          />
        </div>
        <span className="room-card__refrig-value">{refrigeracion}%</span>
      </div>

      {/* Botones de acción */}
      <div className="room-card__actions">
        {showCerrarBtn ? (
          <button className="room-card__btn room-card__btn--cerrar">
            Cerrar Puerta
          </button>
        ) : (
          <button className="room-card__btn room-card__btn--abrir">
            Abrir puerta
          </button>
        )}
        {showSilenciarBtn && (
          <button className="room-card__btn room-card__btn--silenciar">
            Silenciar<br />Alarma
          </button>
        )}
      </div>

    </div>
  )
}