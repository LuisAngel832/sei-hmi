import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { httpClient } from '../api/httpClient'
import './Login.css'

export function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await httpClient.post('/api/login', {
        usuario: usuario.trim(),
        password
      })
      const ok = login(data?.jwt_token)
      if (!ok) {
        setError('Token recibido invalido. Intenta de nuevo.')
        return
      }
      navigate('/', { replace: true })
    } catch (err) {
      const status = err.response?.status
      if (status === 401 || status === 403) {
        setError('Usuario o contrasena incorrectos.')
      } else if (err.code === 'ERR_NETWORK') {
        setError('Sin conexion al servidor de autenticacion.')
      } else {
        setError('No fue posible iniciar sesion. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const submitDisabled = loading || !usuario.trim() || !password

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit} noValidate>
        <div className="login__brand">
          <span className="login__logo">SEI</span>
          <span className="login__subtitulo">Sistema de Enfriamiento Inteligente</span>
        </div>

        <h1 className="login__titulo">Iniciar sesion</h1>

        <label className="login__field">
          <span className="login__label">Usuario</span>
          <input
            type="text"
            value={usuario}
            onChange={(event) => setUsuario(event.target.value)}
            autoComplete="username"
            autoFocus
            required
            disabled={loading}
          />
        </label>

        <label className="login__field">
          <span className="login__label">Contrasena</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            disabled={loading}
          />
        </label>

        {error && (
          <p className="login__error" role="alert">{error}</p>
        )}

        <button
          type="submit"
          className="login__submit"
          disabled={submitDisabled}
        >
          {loading ? 'Validando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
