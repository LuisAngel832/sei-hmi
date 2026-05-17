import { httpClient } from './httpClient'

/**
 * Registra una nueva cuenta de usuario.
 * El backend marca activo=false para operadores (requieren aprobacion)
 * y activo=true para supervisores.
 *
 * @param {{ nombre: string, usuario: string, password: string, rol: 'operador'|'supervisor' }} payload
 * @returns {Promise<{ id: number, nombre: string, usuario: string, rol: string, activo: boolean }>}
 */
export async function registrar({ nombre, usuario, password, rol }) {
  const { data } = await httpClient.post('/api/usuarios/registro', {
    nombre,
    usuario,
    password,
    rol
  })
  return data
}

/**
 * Lista las cuentas pendientes de aprobacion (activo=false).
 * Solo accesible para operadores.
 *
 * @returns {Promise<Array<{ id: number, nombre: string, usuario: string, rol: string, fechaSolicitud: string }>>}
 */
export async function getPendientes() {
  const { data } = await httpClient.get('/api/usuarios/pendientes')
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.usuarios)) return data.usuarios
  return []
}

/**
 * Aprueba una cuenta pendiente (cambia activo=true).
 * Solo accesible para operadores.
 *
 * @param {number} id  identificador de la cuenta a aprobar
 */
export async function aprobar(id) {
  const { data } = await httpClient.patch(`/api/usuarios/${id}/aprobar`)
  return data
}
