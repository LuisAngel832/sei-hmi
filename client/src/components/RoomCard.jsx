import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import './RoomCard.css'

const CIERRE_DURACION_MS = 5000

export function RoomCard({ cuartoId, datos, userRol, onSilenciar, onCerrarPuerta, onForzarRefrigeracion }) {
  const navigate = useNavigate()
  const {
    temperatura,
    estadoAlarma = 'normal',
    presencia = false,
    puerta = 'cerrada',
    cortina = 'inactiva',
    refrigeracion = 100,
    motivoRefrigeracion = 'NORMAL',
    cerrandoIniciadoEn = null,
    sinSenal = false
  } = datos

  const [tickAhora, setTickAhora] = useState(() => Date.now())

  const irADetalle = () => navigate(`/cuarto/${cuartoId}`)
  const handleKeyDownCard = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      irADetalle()
    }
  }
  const stopFromCard = (handler) => (e) => {
    e.stopPropagation()
    handler?.(cuartoId)
  }

  useEffect(() => {
    if (puerta !== 'cerrando' || !cerrandoIniciadoEn) return undefined
    const intervalo = setInterval(() => setTickAhora(Date.now()), 200)
    return () => clearInterval(intervalo)
  }, [puerta, cerrandoIniciadoEn])

  const segundosRestantes = puerta === 'cerrando' && cerrandoIniciadoEn
    ? Math.max(0, Math.ceil((cerrandoIniciadoEn + CIERRE_DURACION_MS - tickAhora) / 1000))
    : null

  const progresoCierre = puerta === 'cerrando' && cerrandoIniciadoEn
    ? Math.min(100, Math.max(0, ((tickAhora - cerrandoIniciadoEn) / CIERRE_DURACION_MS) * 100))
    : 0

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
      border: '1px solid rgba(245, 158, 11, 0.35)',
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
    if (puerta === 'cerrando') return 'var(--color-critica)'
    return 'var(--color-normal)'
  }

  const formatPuertaLabel = (estado) => {
    if (estado === 'cierre_cancelado') return 'Cierre cancelado'
    return estado.charAt(0).toUpperCase() + estado.slice(1)
  }

  const getPresenciaColor = () => {
    if (presencia) return 'var(--text-presencia)'
    return '#334155'
  }

  const esOperador = userRol === 'operador'
  // Sin senal: no permitir acciones sobre un cuarto desconectado.
  const showSilenciarBtn = !sinSenal && estadoAlarma === 'critica' && esOperador
  // Bloqueado por seguridad: no cerrar la puerta si hay presencia detectada.
  const showCerrarBtn = !sinSenal && estadoAlarma === 'critica' && puerta === 'abierta' && !presencia
  const showForzarBtn = !sinSenal && esOperador && typeof temperatura === 'number' && temperatura > 3

  // Motivo efectivo para la badge/barra de refrigeracion.
  // Le damos PRIORIDAD al estado actual de la puerta antes que al
  // motivoRefrigeracion (que puede quedar cacheado si el back no
  // republica con motivo=NORMAL al cerrar la puerta).
  const refrigMotivoEfectivo = puerta === 'abierta'
    ? 'PUERTA_ABIERTA'
    : motivoRefrigeracion === 'FORZADO_MANUAL' ? 'FORZADO_MANUAL' : 'NORMAL'

  const badgeStyleEfectivo = sinSenal
    ? {
        background: 'rgba(100, 116, 139, 0.18)',
        border: '1px solid rgba(148, 163, 184, 0.45)',
        color: '#94a3b8',
        dotColor: '#94a3b8'
      }
    : badge
  const badgeLabel = sinSenal
    ? 'Sin señal'
    : estadoAlarma.charAt(0).toUpperCase() + estadoAlarma.slice(1)
  const dashSiSinSenal = (valor) => sinSenal ? '—' : valor

  return (
    <div
      className={`room-card room-card--${estadoAlarma} room-card--clickable${sinSenal ? ' room-card--sin-senal' : ''}`}
      role="button"
      tabIndex={0}
      onClick={irADetalle}
      onKeyDown={handleKeyDownCard}
      aria-label={`Ver detalle del Cuarto ${cuartoId}`}
    >

      {/* Header */}
      <div className="room-card__header">
        <div>
          <h3 className="room-card__titulo">Cuarto {cuartoId}</h3>
          <span className="room-card__subtitulo">SEI / CUARTO-0{cuartoId}</span>
        </div>
        <div
          className="room-card__badge"
          style={{
            background: badgeStyleEfectivo.background,
            border: badgeStyleEfectivo.border,
            color: badgeStyleEfectivo.color
          }}
        >
          <span
            className="room-card__badge-dot"
            style={{ background: badgeStyleEfectivo.dotColor }}
          />
          {badgeLabel}
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
              style={{ background: sinSenal ? '#334155' : getPuertaColor() }}
            />
            <span style={{ color: sinSenal ? 'var(--text-muted)' : getPuertaColor() }}>
              {dashSiSinSenal(formatPuertaLabel(puerta))}
            </span>
          </div>
        </div>
        <div className="room-card__sensor">
          <span className="room-card__sensor-label">PRESENCIA</span>
          <div className="room-card__sensor-value">
            <span
              className="room-card__sensor-dot"
              style={{ background: sinSenal ? '#334155' : getPresenciaColor() }}
            />
            <span style={{ color: sinSenal ? 'var(--text-muted)' : getPresenciaColor() }}>
              {dashSiSinSenal(presencia ? 'Detectada' : 'Sin presencia')}
            </span>
          </div>
        </div>
      </div>

      {puerta === 'cerrando' && segundosRestantes !== null && (
        <div className="room-card__cierre" role="status" aria-live="polite">
          <div className="room-card__cierre-header">
            <span className="room-card__cierre-label">CIERRE AUTOMATICO</span>
            <span className="room-card__cierre-segundos">{segundosRestantes}s</span>
          </div>
          <div className="room-card__cierre-bar-bg">
            <div
              className="room-card__cierre-bar-fill"
              style={{ width: `${progresoCierre}%` }}
            />
          </div>
        </div>
      )}

      <div className="room-card__sensor">
        <span className="room-card__sensor-label">CORTINA</span>
        <div className="room-card__sensor-value">
          <span
            className="room-card__sensor-dot"
            style={{ background: sinSenal ? '#334155' : (cortina === 'activa' ? 'var(--color-preventiva)' : '#334155') }}
          />
          <span style={{ color: sinSenal ? 'var(--text-muted)' : (cortina === 'activa' ? 'var(--color-preventiva)' : 'var(--text-muted)') }}>
            {dashSiSinSenal(cortina === 'activa' ? 'Activa' : 'Inactiva')}
          </span>
        </div>
      </div>

      {/* Refrigeración */}
      <div className={`room-card__refrig${!sinSenal && refrigMotivoEfectivo !== 'NORMAL' ? ' room-card__refrig--activo' : ''}`}>
        <div className="room-card__refrig-header">
          <span className="room-card__sensor-label">REFRIGERACIÓN</span>
          {/* REQ-01: badge "PUERTA ABIERTA" eliminado — la información ya
              está en el sensor de PUERTA arriba. Mantenemos "FORZADO" porque
              indica una intervención manual sin otra señal en la tarjeta. */}
          {!sinSenal && refrigMotivoEfectivo === 'FORZADO_MANUAL' && (
            <span className="room-card__refrig-badge room-card__refrig-badge--forzado">
              FORZADO
            </span>
          )}
        </div>
        <div className="room-card__refrig-bar-wrap">
          <div className="room-card__temp-bar-bg" />
          <div
            className="room-card__temp-bar-fill"
            style={{
              width: sinSenal ? '0%' : `${Math.min(Math.max(refrigeracion, 0), 100)}%`,
              // Barra siempre azul (REQ-01). El motivo se comunica en el badge
              // de arriba ("PUERTA ABIERTA" / "FORZADO"), no en el color.
              background: sinSenal ? '#334155' : 'var(--text-cyan)'
            }}
          />
        </div>
        <span className="room-card__refrig-value" style={sinSenal ? { color: 'var(--text-muted)' } : undefined}>
          {dashSiSinSenal(`${refrigeracion}%`)}
        </span>
      </div>

      {/* Botones de acción */}
      <div className="room-card__actions">
        {showCerrarBtn && (
          <button
            className="room-card__btn room-card__btn--cerrar"
            onClick={stopFromCard(onCerrarPuerta)}
          >
            Cerrar Puerta
          </button>
        )}
        {showSilenciarBtn && (
          <button
            className="room-card__btn room-card__btn--silenciar"
            onClick={stopFromCard(onSilenciar)}
          >
            Silenciar<br />Alarma
          </button>
        )}
        {showForzarBtn && (
          <button
            className="room-card__btn room-card__btn--forzar"
            onClick={stopFromCard(onForzarRefrigeracion)}
          >
            Forzar<br />Refrigeración
          </button>
        )}
      </div>

    </div>
  )
}

RoomCard.propTypes = {
  cuartoId: PropTypes.number.isRequired,
  datos: PropTypes.shape({
    temperatura: PropTypes.number,
    estadoAlarma: PropTypes.string,
    presencia: PropTypes.bool,
    puerta: PropTypes.string,
    cortina: PropTypes.string,
    refrigeracion: PropTypes.number,
    motivoRefrigeracion: PropTypes.oneOf(['NORMAL', 'PUERTA_ABIERTA', 'FORZADO_MANUAL']),
    sinSenal: PropTypes.bool,
    cerrandoIniciadoEn: PropTypes.number
  }).isRequired,
  userRol: PropTypes.oneOf(['operador', 'supervisor']),
  onSilenciar: PropTypes.func,
  onCerrarPuerta: PropTypes.func,
  onForzarRefrigeracion: PropTypes.func
}
