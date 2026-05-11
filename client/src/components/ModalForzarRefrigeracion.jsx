import { useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import './ModalForzarRefrigeracion.css'

const DURACIONES = [5, 10, 15, 30]

function formatTemp(t) {
  if (typeof t !== 'number') return '—'
  return `${t > 0 ? '+' : ''}${t.toFixed(1)}°C`
}

function formatPuerta(estado) {
  if (!estado) return '—'
  if (estado === 'cierre_cancelado') return 'Cierre cancelado'
  return estado.charAt(0).toUpperCase() + estado.slice(1)
}

function badgeAlarma(estado) {
  if (estado === 'critica') return { label: 'Alarma crítica', className: 'forzar-modal__badge--critica' }
  if (estado === 'preventiva') return { label: 'Alarma preventiva', className: 'forzar-modal__badge--preventiva' }
  return null
}

export function ModalForzarRefrigeracion({
  open,
  cuartos,
  cuartoIdInicial,
  onConfirmar,
  onCancelar
}) {
  const confirmBtnRef = useRef(null)
  const [cuartoSeleccionado, setCuartoSeleccionado] = useState(cuartoIdInicial ?? null)
  const [duracion, setDuracion] = useState(10)
  const [potencia, setPotencia] = useState(100)

  useEffect(() => {
    if (open) {
      setCuartoSeleccionado(cuartoIdInicial ?? null)
      setDuracion(10)
      setPotencia(100)
    }
  }, [open, cuartoIdInicial])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancelar?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    confirmBtnRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancelar])

  const datosSeleccionado = useMemo(() => {
    if (!cuartoSeleccionado) return null
    return cuartos?.[cuartoSeleccionado] ?? null
  }, [cuartos, cuartoSeleccionado])

  if (!open) return null

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) onCancelar?.()
  }

  const puedeConfirmar = cuartoSeleccionado !== null && duracion > 0 && potencia > 0

  const handleConfirmar = () => {
    if (!puedeConfirmar) return
    onConfirmar?.({
      cuartoId: cuartoSeleccionado,
      duracionMinutos: duracion,
      potenciaPct: potencia
    })
  }

  const badge = datosSeleccionado ? badgeAlarma(datosSeleccionado.estadoAlarma) : null

  return (
    <div
      className="forzar-modal__overlay"
      role="presentation"
      onClick={handleOverlayClick}
    >
      <div
        className="forzar-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forzar-modal-titulo"
      >
        <button
          type="button"
          className="forzar-modal__cerrar"
          aria-label="Cerrar"
          onClick={onCancelar}
        >
          ×
        </button>

        <header className="forzar-modal__header">
          <span className="forzar-modal__icono" aria-hidden>❄</span>
          <div>
            <h2 id="forzar-modal-titulo" className="forzar-modal__titulo">
              Forzar Refrigeración
            </h2>
            <p className="forzar-modal__subtitulo">
              Selecciona el cuarto y confirma los parámetros
            </p>
          </div>
        </header>

        <section className="forzar-modal__seccion">
          <span className="forzar-modal__label">Seleccionar cuarto</span>
          <div className="forzar-modal__cuartos">
            {[1, 2, 3, 4, 5].map((id) => {
              const c = cuartos?.[id]
              const seleccionado = cuartoSeleccionado === id
              const estado = c?.estadoAlarma
              const cls = [
                'forzar-modal__cuarto',
                seleccionado && 'forzar-modal__cuarto--seleccionado',
                estado === 'critica' && 'forzar-modal__cuarto--critica',
                estado === 'preventiva' && 'forzar-modal__cuarto--preventiva'
              ].filter(Boolean).join(' ')
              return (
                <button
                  key={id}
                  type="button"
                  className={cls}
                  onClick={() => setCuartoSeleccionado(id)}
                  aria-pressed={seleccionado}
                >
                  <span className="forzar-modal__cuarto-id">C{id}</span>
                  <span className="forzar-modal__cuarto-temp">
                    {formatTemp(c?.temperatura)}
                  </span>
                  {estado === 'preventiva' && (
                    <span className="forzar-modal__cuarto-estado">Preventiva</span>
                  )}
                  {estado === 'critica' && (
                    <span className="forzar-modal__cuarto-estado">Crítica</span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {datosSeleccionado && (
          <section className="forzar-modal__detalle">
            <header className="forzar-modal__detalle-header">
              <strong>Cuarto {cuartoSeleccionado} — seleccionado</strong>
              {badge && (
                <span className={`forzar-modal__badge ${badge.className}`}>
                  {badge.label}
                </span>
              )}
            </header>
            <div className="forzar-modal__detalle-grid">
              <div>
                <span className="forzar-modal__metrica-label">Temp actual</span>
                <span className="forzar-modal__metrica-valor forzar-modal__metrica-valor--alerta">
                  {formatTemp(datosSeleccionado.temperatura)}
                </span>
              </div>
              <div>
                <span className="forzar-modal__metrica-label">Refrig actual</span>
                <span className="forzar-modal__metrica-valor">
                  {typeof datosSeleccionado.refrigeracion === 'number'
                    ? `${datosSeleccionado.refrigeracion}%`
                    : '—'}
                </span>
              </div>
              <div>
                <span className="forzar-modal__metrica-label">Puerta</span>
                <span className="forzar-modal__metrica-valor">
                  {formatPuerta(datosSeleccionado.puerta)}
                </span>
              </div>
            </div>
          </section>
        )}

        <section className="forzar-modal__seccion">
          <span className="forzar-modal__label">Duración del forzado</span>
          <div className="forzar-modal__duraciones">
            {DURACIONES.map((min) => (
              <button
                key={min}
                type="button"
                className={`forzar-modal__chip${duracion === min ? ' forzar-modal__chip--activo' : ''}`}
                onClick={() => setDuracion(min)}
                aria-pressed={duracion === min}
              >
                {min} min
              </button>
            ))}
          </div>
        </section>

        <section className="forzar-modal__seccion">
          <div className="forzar-modal__slider-header">
            <span className="forzar-modal__label">Potencia de refrigeración</span>
            <span className="forzar-modal__slider-valor">{potencia}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={potencia}
            onChange={(e) => setPotencia(Number(e.target.value))}
            className="forzar-modal__slider"
            aria-label="Potencia de refrigeración"
          />
        </section>

        <aside className="forzar-modal__warning" role="note">
          <span className="forzar-modal__warning-icono" aria-hidden>⚠</span>
          <p>
            El forzado se cancelará automáticamente al cumplirse la duración o cuando
            la temperatura vuelva a ser normal. Quedará registrado en el sistema con tu nombre.
          </p>
        </aside>

        <div className="forzar-modal__acciones">
          <button
            type="button"
            className="forzar-modal__btn forzar-modal__btn--cancelar"
            onClick={onCancelar}
          >
            Cancelar
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className="forzar-modal__btn forzar-modal__btn--primario"
            onClick={handleConfirmar}
            disabled={!puedeConfirmar}
          >
            Confirmar forzado
          </button>
        </div>
      </div>
    </div>
  )
}

ModalForzarRefrigeracion.propTypes = {
  open: PropTypes.bool.isRequired,
  cuartos: PropTypes.object,
  cuartoIdInicial: PropTypes.number,
  onConfirmar: PropTypes.func.isRequired,
  onCancelar: PropTypes.func.isRequired
}
