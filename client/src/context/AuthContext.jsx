import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'

const STORAGE_KEY = 'sei.auth.token'

const AuthContext = createContext(null)

// --- Bypass de autenticacion para desarrollo local ---
const DISABLE_AUTH = import.meta.env.VITE_DISABLE_AUTH === 'true'

if (DISABLE_AUTH) {
  // Inyecta un JWT falso para que leerClaimsDelToken() en api/intervenciones funcione
  const b64 = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const mockJwt = `${b64({ alg: 'none' })}.${b64({ operador_id: 1, nombre: 'Dev Local', rol: 'operador', exp: 9999999999 })}.mock`
  try { sessionStorage.setItem(STORAGE_KEY, mockJwt) } catch { /* ignore */ }
}

const MOCK_USER = DISABLE_AUTH
  ? { operadorId: 1, nombre: 'Dev Local', rol: 'operador', expiresAt: Date.now() + 86400000 }
  : null
// --- Fin bypass ---

function decodeJwtPayload(token) {
  if (typeof token !== 'string' || token.split('.').length !== 3) return null
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

function buildUserFromClaims(claims) {
  if (!claims) return null
  const expSeconds = Number(claims.exp)
  if (!Number.isFinite(expSeconds) || expSeconds * 1000 <= Date.now()) return null
  const operadorId = Number(claims.operador_id)
  if (!Number.isInteger(operadorId) || operadorId <= 0) return null
  return {
    operadorId,
    nombre: claims.nombre ?? null,
    rol: claims.rol ?? 'operador',
    expiresAt: expSeconds * 1000
  }
}

function readSessionToken() {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => MOCK_USER ? 'mock' : readSessionToken())
  const [user, setUser] = useState(() => MOCK_USER ?? buildUserFromClaims(decodeJwtPayload(readSessionToken())))

  const logout = useCallback(() => {
    try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* ignore quota errors */ }
    setToken(null)
    setUser(null)
  }, [])

  const login = useCallback((nextToken) => {
    const claims = decodeJwtPayload(nextToken)
    const nextUser = buildUserFromClaims(claims)
    if (!nextUser) {
      logout()
      return false
    }
    try { sessionStorage.setItem(STORAGE_KEY, nextToken) } catch { /* ignore quota errors */ }
    setToken(nextToken)
    setUser(nextUser)
    return true
  }, [logout])

  useEffect(() => {
    if (DISABLE_AUTH || !user?.expiresAt) return undefined
    const msUntilExpiry = user.expiresAt - Date.now()
    if (msUntilExpiry <= 0) {
      logout()
      return undefined
    }
    const timeoutId = setTimeout(logout, msUntilExpiry)
    return () => clearTimeout(timeoutId)
  }, [user, logout])

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: Boolean(user),
    login,
    logout
  }), [token, user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
