import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import './ToastContext.css'

const ToastContext = createContext(null)

const DURACION_DEFAULT_MS = 4000

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextIdRef = useRef(1)
  const timeoutsRef = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const handle = timeoutsRef.current.get(id)
    if (handle) {
      clearTimeout(handle)
      timeoutsRef.current.delete(id)
    }
  }, [])

  const showToast = useCallback((mensaje, opciones = {}) => {
    const id = nextIdRef.current++
    const tipo = opciones.tipo ?? 'info'
    const duracion = opciones.duracion ?? DURACION_DEFAULT_MS
    setToasts((prev) => [...prev, { id, mensaje, tipo }])
    const handle = setTimeout(() => dismiss(id), duracion)
    timeoutsRef.current.set(id, handle)
    return id
  }, [dismiss])

  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      timeouts.forEach((handle) => clearTimeout(handle))
      timeouts.clear()
    }
  }, [])

  const value = useMemo(() => ({ showToast, dismiss }), [showToast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" role="region" aria-label="Notificaciones">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`toast toast--${t.tipo}`}
            onClick={() => dismiss(t.id)}
            aria-label="Descartar notificacion"
          >
            <span className="toast__mensaje">{t.mensaje}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

ToastProvider.propTypes = {
  children: PropTypes.node
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
