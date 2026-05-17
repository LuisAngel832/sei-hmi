import { Server } from 'socket.io'
import { handleMessage } from '../mqtt/topicHandler.js'
import { connectMqtt, publishMqtt } from '../mqtt/mqttClient.js'

// Tiempo maximo (ms) sin recibir temperatura antes de declarar sin_senal.
// El bridge es la autoridad: al recargar la pagina el cliente recibe los
// retained y reiniciaria su timeout client-side; por eso este chequeo vive aqui.
const SIGNAL_TIMEOUT_MS = 90000

// Periodo (ms) con el que se evalua el estado de cada cuarto.
const SIGNAL_CHECK_INTERVAL_MS = 15000

const CUARTO_IDS = [1, 2, 3, 4, 5]

function createInitialRoomState() {
  return {
    temperatura: null,
    estadoAlarma: 'normal',
    presencia: false,
    puerta: 'cerrada',
    cortina: 'inactiva',
    timestamp: null,
    temperaturaPico: null,
    potenciaPct: 100,
    motivoRefrigeracion: 'NORMAL'
  }
}

function emitSnapshot(socket, snapshotByRoom) {
  Object.entries(snapshotByRoom).forEach(([roomId, room]) => {
    const cuartoId = Number(roomId)

    if (room.temperatura !== null) {
      socket.emit('temperatura', {
        cuartoId,
        temperatura: room.temperatura,
        estadoAlarma: room.estadoAlarma,
        timestamp: room.timestamp
      })
    }

    socket.emit('presencia', {
      cuartoId,
      presencia: room.presencia,
      timestamp: room.timestamp
    })

    socket.emit('puerta', {
      cuartoId,
      estado: room.puerta,
      timestamp: room.timestamp
    })

    socket.emit('cortina', {
      cuartoId,
      estado: room.cortina,
      timestamp: room.timestamp
    })

    if (room.temperaturaPico !== null || room.estadoAlarma !== 'normal') {
      socket.emit('alarma', {
        cuartoId,
        estado: room.estadoAlarma,
        temperaturaPico: room.temperaturaPico,
        timestamp: room.timestamp
      })
    }

    socket.emit('refrigeracion', {
      cuartoId,
      potenciaPct: room.potenciaPct,
      motivo: room.motivoRefrigeracion,
      timestamp: room.timestamp
    })
  })
}

function updateSnapshot(snapshotByRoom, normalizedEvent) {
  if (!normalizedEvent) return

  const { event, payload } = normalizedEvent

  if (event === 'snapshot_inicial') {
    payload.cuartos?.forEach((c) => {
      const room = snapshotByRoom[c.cuartoId]
      if (!room) return
      room.temperatura = c.temperatura
      room.estadoAlarma = c.estadoAlarma
      room.presencia = c.presencia
      room.puerta = c.puerta
      room.cortina = c.cortina
      room.timestamp = c.timestamp
    })
    return
  }

  const { cuartoId } = payload
  if (!Number.isInteger(cuartoId) || !snapshotByRoom[cuartoId]) return

  const current = snapshotByRoom[cuartoId]

  switch (event) {
    case 'temperatura':
      current.temperatura = payload.temperatura
      current.estadoAlarma = payload.estadoAlarma || current.estadoAlarma
      current.timestamp = payload.timestamp || current.timestamp
      break
    case 'presencia':
      current.presencia = Boolean(payload.presencia)
      current.timestamp = payload.timestamp || current.timestamp
      break
    case 'alarma':
      current.estadoAlarma = payload.estado || current.estadoAlarma
      current.temperaturaPico = payload.temperaturaPico ?? current.temperaturaPico
      current.timestamp = payload.timestamp || current.timestamp
      break
    case 'puerta':
      current.puerta = payload.estado || current.puerta
      current.timestamp = payload.timestamp || current.timestamp
      break
    case 'cortina':
      current.cortina = payload.estado || current.cortina
      current.timestamp = payload.timestamp || current.timestamp
      break
    case 'refrigeracion':
      current.potenciaPct = typeof payload.potenciaPct === 'number' ? payload.potenciaPct : current.potenciaPct
      current.motivoRefrigeracion = payload.motivo || current.motivoRefrigeracion
      current.timestamp = payload.timestamp || current.timestamp
      break
    default:
      break
  }
}

function sanitizeOperadorId(value) {
  const parsed = Number.parseInt(String(value), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function isJwtShaped(token) {
  if (typeof token !== 'string') return false
  const parts = token.split('.')
  return parts.length === 3 && parts.every((part) => part.length > 0)
}

export function initSocketServer(httpServer) {
  const latestByRoom = {
    1: createInitialRoomState(),
    2: createInitialRoomState(),
    3: createInitialRoomState(),
    4: createInitialRoomState(),
    5: createInitialRoomState()
  }

  // Marca de tiempo (ms epoch) de la ultima temperatura recibida por cuarto.
  // null = nunca llego una muestra desde que arranco el bridge.
  const lastSeenTemp = {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null
  }

  // Estado actual de sin_senal por cuarto. Se usa para edge-trigger:
  // solo emitimos cuando hay transicion (false -> true o true -> false).
  const sinSenalEstado = {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false
  }

  const io = new Server(httpServer, {
    cors: {
      origin: [/^http:\/\/localhost:\d+$/],
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    console.log(`[SOCKET] Cliente conectado: ${socket.id}`)
    emitSnapshot(socket, latestByRoom)
    // Tras el snapshot, replicar el estado sin_senal autoritativo del bridge
    // para que el cliente recien conectado pinte la pastilla "Sin senal"
    // sin esperar al siguiente tick del setInterval.
    CUARTO_IDS.forEach((cuartoId) => {
      if (sinSenalEstado[cuartoId]) {
        socket.emit('sin_senal', {
          cuartoId,
          timestamp: new Date().toISOString()
        })
      }
    })

    socket.on('silenciar_alarma', (payload = {}) => {
      const cuartoId = Number(payload.cuartoId)
      if (!Number.isInteger(cuartoId) || cuartoId < 1 || cuartoId > 5) {
        return
      }

      const jwtToken = payload.jwtToken ?? payload.jwt_token
      if (!isJwtShaped(jwtToken)) {
        console.warn(`[SOCKET] silenciar_alarma rechazado: jwt_token ausente o invalido (cuarto ${cuartoId})`)
        return
      }

      if (payload.rol !== 'operador') {
        console.warn(`[SOCKET] silenciar_alarma rechazado: rol declarado='${payload.rol}' no es operador (cuarto ${cuartoId})`)
        return
      }

      const operadorId = sanitizeOperadorId(payload.operadorId)
      const timestamp = payload.timestamp || new Date().toISOString()

      try {
        publishMqtt(`sei/cuartos/${cuartoId}/alarma/cmd`, {
          cuarto_id: cuartoId,
          timestamp,
          comando: 'silenciar',
          operador_id: operadorId,
          rol: payload.rol,
          jwt_token: jwtToken
        }, {
          qos: 1,
          retain: false
        })
      } catch (err) {
        console.error('[SOCKET] No se pudo publicar silenciado:', err.message)
      }
    })

    socket.on('forzar_cierre', (payload = {}) => {
      const cuartoId = Number(payload.cuartoId)
      if (!Number.isInteger(cuartoId) || cuartoId < 1 || cuartoId > 5) {
        return
      }

      const jwtToken = payload.jwtToken ?? payload.jwt_token
      if (!isJwtShaped(jwtToken)) {
        console.warn(`[SOCKET] forzar_cierre rechazado: jwt_token ausente o invalido (cuarto ${cuartoId})`)
        return
      }

      if (payload.rol !== 'operador') {
        console.warn(`[SOCKET] forzar_cierre rechazado: rol declarado='${payload.rol}' no es operador (cuarto ${cuartoId})`)
        return
      }

      const operadorId = sanitizeOperadorId(payload.operadorId)
      const timestamp = payload.timestamp || new Date().toISOString()

      try {
        publishMqtt(`sei/cuartos/${cuartoId}/puerta/cmd`, {
          cuarto_id: cuartoId,
          timestamp,
          comando: 'forzar_cierre',
          operador_id: operadorId,
          rol: payload.rol,
          jwt_token: jwtToken
        }, {
          qos: 1,
          retain: false
        })
      } catch (err) {
        console.error('[SOCKET] No se pudo publicar forzar_cierre:', err.message)
      }
    })

    socket.on('forzar_refrigeracion', (payload = {}) => {
      const cuartoId = Number(payload.cuartoId)
      if (!Number.isInteger(cuartoId) || cuartoId < 1 || cuartoId > 5) {
        return
      }

      const jwtToken = payload.jwtToken ?? payload.jwt_token
      if (!isJwtShaped(jwtToken)) {
        console.warn(`[SOCKET] forzar_refrigeracion rechazado: jwt_token ausente o invalido (cuarto ${cuartoId})`)
        return
      }

      if (payload.rol !== 'operador') {
        console.warn(`[SOCKET] forzar_refrigeracion rechazado: rol declarado='${payload.rol}' no es operador (cuarto ${cuartoId})`)
        return
      }

      const operadorId = sanitizeOperadorId(payload.operadorId)
      const potenciaPct = Number(payload.potenciaPct ?? payload.potencia_pct ?? 100)
      const potenciaSegura = Number.isFinite(potenciaPct)
        ? Math.min(Math.max(Math.round(potenciaPct), 0), 100)
        : 100
      const duracionRaw = Number(payload.duracionMinutos ?? payload.duracion_minutos ?? 10)
      const duracionMinutos = Number.isFinite(duracionRaw) && duracionRaw > 0
        ? Math.min(Math.max(Math.round(duracionRaw), 1), 240)
        : 10
      const timestamp = payload.timestamp || new Date().toISOString()

      try {
        publishMqtt(`sei/cuartos/${cuartoId}/refrigeracion/cmd`, {
          cuarto_id: cuartoId,
          timestamp,
          comando: 'forzar_encendido',
          potencia_pct: potenciaSegura,
          duracion_minutos: duracionMinutos,
          operador_id: operadorId,
          rol: payload.rol,
          jwt_token: jwtToken
        }, {
          qos: 1,
          retain: false
        })
      } catch (err) {
        console.error('[SOCKET] No se pudo publicar forzar_refrigeracion:', err.message)
      }
    })

    socket.on('disconnect', () => {
      console.log(`[SOCKET] Cliente desconectado: ${socket.id}`)
    })
  })

  connectMqtt((topic, data) => {
    const normalizedEvent = handleMessage(topic, data, io)
    updateSnapshot(latestByRoom, normalizedEvent)

    // Cuando llega temperatura fresca actualizamos el reloj autoritativo.
    // (El snapshot_inicial no cuenta como "muestra" porque puede venir de
    // retained acumulados antes de que los simuladores estuvieran vivos.)
    if (normalizedEvent?.event === 'temperatura') {
      const cuartoId = normalizedEvent.payload?.cuartoId
      if (Number.isInteger(cuartoId) && lastSeenTemp[cuartoId] !== undefined) {
        lastSeenTemp[cuartoId] = Date.now()
      }
    }
  })

  // Evaluador periodico de sin_senal: corre cada SIGNAL_CHECK_INTERVAL_MS y
  // emite el evento solo en las transiciones para no saturar al cliente.
  const signalCheckHandle = setInterval(() => {
    const ahora = Date.now()
    CUARTO_IDS.forEach((cuartoId) => {
      const ultimaMuestra = lastSeenTemp[cuartoId]
      const sinSenal = ultimaMuestra === null
        || (ahora - ultimaMuestra) > SIGNAL_TIMEOUT_MS

      if (sinSenal && !sinSenalEstado[cuartoId]) {
        sinSenalEstado[cuartoId] = true
        io.emit('sin_senal', {
          cuartoId,
          timestamp: new Date().toISOString()
        })
        console.log(`[SIGNAL] Cuarto ${cuartoId} -> sin_senal`)
      } else if (!sinSenal && sinSenalEstado[cuartoId]) {
        sinSenalEstado[cuartoId] = false
        io.emit('senal_recuperada', {
          cuartoId,
          timestamp: new Date().toISOString()
        })
        console.log(`[SIGNAL] Cuarto ${cuartoId} -> senal_recuperada`)
      }
    })
  }, SIGNAL_CHECK_INTERVAL_MS)

  // Evita leak del handle si el proceso recibe SIGINT/SIGTERM (ej. nodemon
  // o systemd reiniciando). No bloqueamos el shutdown; solo liberamos timers.
  const liberarSignalCheck = () => clearInterval(signalCheckHandle)
  process.once('SIGINT', liberarSignalCheck)
  process.once('SIGTERM', liberarSignalCheck)

  return io
}
