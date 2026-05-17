import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import './ConfirmDialog.css'

export function ConfirmDialog({
  open,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  tonoAccion = 'primario',
  warning = null,
  onConfirmar,
  onCancelar
}) {
  const confirmBtnRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCancelar?.()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    confirmBtnRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancelar])

  if (!open) return null

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onCancelar?.()
    }
  }

  return (
    <div
      className="confirm-dialog__overlay"
      role="presentation"
      onClick={handleOverlayClick}
    >
      <div
        className="confirm-dialog__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-titulo"
      >
        <h2 id="confirm-dialog-titulo" className="confirm-dialog__titulo">{titulo}</h2>
        {warning && (
          <div className="confirm-dialog__warning" role="alert">
            <span className="confirm-dialog__warning-icon" aria-hidden>⚠</span>
            <span>{warning}</span>
          </div>
        )}
        <p className="confirm-dialog__mensaje">{mensaje}</p>
        <div className="confirm-dialog__acciones">
          <button
            type="button"
            className="confirm-dialog__btn confirm-dialog__btn--cancelar"
            onClick={onCancelar}
          >
            {textoCancelar}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={`confirm-dialog__btn confirm-dialog__btn--${tonoAccion}`}
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}

ConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  titulo: PropTypes.string.isRequired,
  mensaje: PropTypes.node.isRequired,
  textoConfirmar: PropTypes.string,
  textoCancelar: PropTypes.string,
  tonoAccion: PropTypes.oneOf(['primario', 'critico']),
  warning: PropTypes.node,
  onConfirmar: PropTypes.func.isRequired,
  onCancelar: PropTypes.func.isRequired
}
