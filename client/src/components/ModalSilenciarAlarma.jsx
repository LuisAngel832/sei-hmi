import { useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import './ModalSilenciarAlarma.css'

function formatHoraInicio(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function formatDeltaDesde(iso, ahora) {
  if (!iso) return ''
  const d = new Date(iso).getTime()
  if (!Number.isFinite(d)) return ''
  const seg = Math.max(0, Math.floor((ahora - d) / 1000))
  const m = Math.floor(seg / 60)
  const s = seg % 60
  if (m <= 0) return `${s}s`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

function formatPuerta(estado) {
  if (!estado) return '—'
  if (estado === 'cierre_cancelado') return 'Cierre cancelado'
  return estado.charAt(0).toUpperCase() + estado.slice(1)
}

export function ModalSilenciarAlarma({
  open,
  cuartoId,
  datos,
  alarma,
  onConfirmar,
  onCancelar
}) {
  const confirmBtnRef = useRef(null)
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancelar?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    confirmBtnRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancelar])

  useEffect(() => {
    if (!open) return undefined
    const tick = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [open])

  const tiempoActiva = useMemo(
    () => formatDeltaDesde(alarma?.inicio, ahora),
    [alarma?.inicio, ahora]
  )

  if (!open) return null

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) onCancelar?.()
  }

  const tempActual = typeof datos?.temperatura === 'number'
    ? `${datos.temperatura > 0 ? '+' : ''}${datos.temperatura.toFixed(1)}°C`
    : '—'
  const tempPico = typeof alarma?.temperaturaPico === 'number'
    ? `${alarma.temperaturaPico > 0 ? '+' : ''}${alarma.temperaturaPico.toFixed(1)}°C`
    : tempActual
  const umbral = typeof alarma?.umbralSuperado === 'number'
    ? `${alarma.umbralSuperado.toFixed(1)}°C`
    : '4.0°C'
  const presenciaDetectada = Boolean(datos?.presencia ?? alarma?.presenciaEnCuarto)
  const cierreBloqueado = Boolean(alarma?.cierreBloqueado || (datos?.puerta === 'abierta' && presenciaDetectada))
  const subtituloId = alarma?.id ? `#${alarma.id}` : `#ALM-${String(cuartoId).padStart(4, '0')}`

  return (
    <div
      className="silenciar-modal__overlay"
      role="presentation"
      onClick={handleOverlayClick}
    >
      <div
        className="silenciar-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="silenciar-modal-titulo"
      >
        <button
          type="button"
          className="silenciar-modal__cerrar"
          aria-label="Cerrar"
          onClick={onCancelar}
        >
          ×
        </button>

        <header className="silenciar-modal__header">
          <h2 id="silenciar-modal-titulo" className="silenciar-modal__titulo">
            Alarma Crítica — Cuarto {cuartoId}
          </h2>
          <p className="silenciar-modal__subtitulo">
            ID: {subtituloId} · Activa desde {formatHoraInicio(alarma?.inicio)} · hace {tiempoActiva}
          </p>
        </header>

        <div className="silenciar-modal__metricas">
          <div className="silenciar-modal__metrica">
            <span className="silenciar-modal__metrica-label">Temperatura actual</span>
            <span className="silenciar-modal__metrica-valor silenciar-modal__metrica-valor--critico">
              {tempActual}
            </span>
          </div>
          <div className="silenciar-modal__metrica">
            <span className="silenciar-modal__metrica-label">Temperatura pico</span>
            <span className="silenciar-modal__metrica-valor silenciar-modal__metrica-valor--critico">
              {tempPico}
            </span>
          </div>
          <div className="silenciar-modal__metrica">
            <span className="silenciar-modal__metrica-label">Umbral superado</span>
            <span className="silenciar-modal__metrica-valor silenciar-modal__metrica-valor--alerta">
              {umbral}
            </span>
          </div>
          <div className="silenciar-modal__metrica">
            <span className="silenciar-modal__metrica-label">Tiempo activa</span>
            <span className="silenciar-modal__metrica-valor silenciar-modal__metrica-valor--alerta">
              {tiempoActiva || '—'}
            </span>
          </div>
          <div className="silenciar-modal__metrica">
            <span className="silenciar-modal__metrica-label">Estado puerta</span>
            <span className="silenciar-modal__metrica-valor silenciar-modal__metrica-valor--alerta">
              {formatPuerta(datos?.puerta)}
            </span>
          </div>
          <div className="silenciar-modal__metrica">
            <span className="silenciar-modal__metrica-label">Presencia en cuarto</span>
            <span className="silenciar-modal__metrica-valor silenciar-modal__metrica-valor--alerta">
              {presenciaDetectada ? 'Detectada' : 'No detectada'}
            </span>
          </div>
        </div>

        {presenciaDetectada && (
          <aside className="silenciar-modal__warning" role="note">
            <span className="silenciar-modal__warning-icono" aria-hidden>i</span>
            <div>
              <strong>Hay personas dentro del cuarto.</strong>
              <p>
                {cierreBloqueado
                  ? 'El cierre automático de puerta está bloqueado. Evacuación requerida antes del cierre.'
                  : 'Evacuación recomendada antes de continuar.'}
              </p>
            </div>
          </aside>
        )}

        <div className="silenciar-modal__cierre-info">
          <span className="silenciar-modal__cierre-label">
            Cierre automático {cierreBloqueado ? 'bloqueado por presencia' : 'pendiente del backend'}
          </span>
          <p className="silenciar-modal__cierre-help">
            La advertencia sonora se activará 5 segundos antes del cierre.
          </p>
        </div>

        <div className="silenciar-modal__acciones">
          <button
            type="button"
            className="silenciar-modal__btn silenciar-modal__btn--cancelar"
            onClick={onCancelar}
          >
            Cancelar
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className="silenciar-modal__btn silenciar-modal__btn--critico"
            onClick={onConfirmar}
          >
            Silenciar alarma crítica
          </button>
        </div>
      </div>
    </div>
  )
}

ModalSilenciarAlarma.propTypes = {
  open: PropTypes.bool.isRequired,
  cuartoId: PropTypes.number.isRequired,
  datos: PropTypes.shape({
    temperatura: PropTypes.number,
    puerta: PropTypes.string,
    presencia: PropTypes.bool
  }),
  alarma: PropTypes.shape({
    id: PropTypes.string,
    inicio: PropTypes.string,
    temperaturaPico: PropTypes.number,
    umbralSuperado: PropTypes.number,
    presenciaEnCuarto: PropTypes.bool,
    cierreBloqueado: PropTypes.bool
  }),
  onConfirmar: PropTypes.func.isRequired,
  onCancelar: PropTypes.func.isRequired
}
