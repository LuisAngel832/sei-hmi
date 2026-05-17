import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { registrar } from '../api/usuarios'
import './Registro.css'

const REDIRECT_MS = 3000

export function Registro() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [nombre, setNombre] = useState('')
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rol, setRol] = useState('operador')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(null)
  const redirectTimerRef = useRef(null)

  useEffect(() => () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
  }, [])

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setExito(null)

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const data = await registrar({
        nombre: nombre.trim(),
        usuario: usuario.trim(),
        password,
        rol
      })

      const activo = Boolean(data?.activo)
      const mensaje = activo
        ? 'Tu cuenta fue creada. Ya puedes iniciar sesion.'
        : 'Tu cuenta fue creada. Un operador activo debe aprobarla antes de que puedas iniciar sesion.'
      setExito(mensaje)

      redirectTimerRef.current = setTimeout(() => {
        navigate('/login', { replace: true })
      }, REDIRECT_MS)
    } catch (err) {
      const status = err.response?.status
      if (status === 409) {
        setError('El nombre de usuario ya esta en uso.')
      } else {
        setError('Ocurrio un error. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const submitDisabled =
    loading ||
    Boolean(exito) ||
    !nombre.trim() ||
    !usuario.trim() ||
    !password ||
    !confirmPassword

  return (
    <div className="registro">
      <form className="registro__card" onSubmit={handleSubmit} noValidate>
        <div className="registro__brand">
          <span className="registro__logo">SEI</span>
          <span className="registro__subtitulo">Sistema de Enfriamiento Inteligente</span>
        </div>

        <h1 className="registro__titulo">Crear cuenta</h1>

        <label className="registro__field">
          <span className="registro__label">Nombre completo</span>
          <input
            type="text"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            autoComplete="name"
            autoFocus
            required
            disabled={loading || Boolean(exito)}
          />
        </label>

        <label className="registro__field">
          <span className="registro__label">Nombre de usuario</span>
          <input
            type="text"
            value={usuario}
            onChange={(event) => setUsuario(event.target.value)}
            autoComplete="username"
            required
            disabled={loading || Boolean(exito)}
          />
        </label>

        <label className="registro__field">
          <span className="registro__label">Contrasena</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            disabled={loading || Boolean(exito)}
          />
        </label>

        <label className="registro__field">
          <span className="registro__label">Confirmar contrasena</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
            disabled={loading || Boolean(exito)}
          />
        </label>

        <label className="registro__field">
          <span className="registro__label">Rol</span>
          <select
            value={rol}
            onChange={(event) => setRol(event.target.value)}
            disabled={loading || Boolean(exito)}
          >
            <option value="operador">Operador de planta</option>
            <option value="supervisor">Supervisor de calidad</option>
          </select>
        </label>

        {error && (
          <p className="registro__error" role="alert">{error}</p>
        )}

        {exito && (
          <p className="registro__exito" role="status">{exito}</p>
        )}

        <button
          type="submit"
          className="registro__submit"
          disabled={submitDisabled}
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>

        <Link to="/login" className="registro__volver">
          Volver a iniciar sesion
        </Link>
      </form>
    </div>
  )
}
