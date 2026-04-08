import { useState, useEffect } from 'react'
import './Header.css'

export function Header({ conectado, alarmasActivas = 0 }) {
  const [hora, setHora] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setHora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatHora = (fecha) => {
    return fecha.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  const formatFecha = (fecha) => {
    return fecha.toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  return (
    <header className="header">
      <div className="header__brand">
        <div className="header__logo">
          <span className="header__logo-icon">❄</span>
        </div>
        <div className="header__titles">
          <h1 className="header__title">SEI Monitor</h1>
          <span className="header__subtitle">Cuartos Frios</span>
        </div>
      </div>

      <div className="header__status">
        {alarmasActivas > 0 && (
          <div className="header__alarmas">
            <span className="header__alarmas-badge">{alarmasActivas}</span>
            <span className="header__alarmas-text">Alarmas</span>
          </div>
        )}

        <div className="header__tiempo">
          <span className="header__hora">{formatHora(hora)}</span>
          <span className="header__fecha">{formatFecha(hora)}</span>
        </div>

        <div className={`header__conexion ${conectado ? 'header__conexion--ok' : 'header__conexion--error'}`}>
          <span className="header__conexion-dot" />
          <span className="header__conexion-text">
            {conectado ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>
    </header>
  )
}
