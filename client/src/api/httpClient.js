import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

// Debe coincidir con la STORAGE_KEY usada en context/AuthContext.jsx.
// Se duplica intencionalmente para que httpClient (capa de datos)
// no dependa del provider de React (capa de UI).
const STORAGE_KEY = 'sei.auth.token'

function readToken() {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export const httpClient = axios.create({
  baseURL: API_URL,
  timeout: 8000
})

httpClient.interceptors.request.use((config) => {
  const token = readToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
