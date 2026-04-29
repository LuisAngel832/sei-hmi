import { useEffect, useState } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useAuth } from '../context/AuthContext'
import './Header.css'

export function Header({ conectado, alarmasActivas = 0 }) {
  const [hora, setHora] = useState(new Date())
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => setHora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatHora = (fecha) => fecha.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const formatFecha = (fecha) => fecha.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const rolLabel = user?.rol === 'supervisor' ? 'Supervisor' : 'Operador'
  const rolModifier = user?.rol === 'supervisor' ? 'header__rol--supervisor' : 'header__rol--operador'

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
        <nav className="header__nav" aria-label="Navegacion principal">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `header__nav-link${isActive ? ' header__nav-link--activo' : ''}`}
          >
            Panel
          </NavLink>
          {user?.rol === 'supervisor' && (
            <NavLink
              to="/historial"
              className={({ isActive }) => `header__nav-link${isActive ? ' header__nav-link--activo' : ''}`}
            >
              Auditoria
            </NavLink>
          )}
        </nav>
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

        {user && (
          <div className="header__sesion">
            <div className="header__usuario">
              <span className="header__usuario-nombre">{user.nombre ?? `Operador #${user.operadorId}`}</span>
              <span className={`header__rol ${rolModifier}`}>{rolLabel}</span>
            </div>
            <button
              type="button"
              className="header__logout"
              onClick={handleLogout}
              aria-label="Cerrar sesion"
            >
              Salir
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

Header.propTypes = {
  conectado: PropTypes.bool,
  alarmasActivas: PropTypes.number
}
