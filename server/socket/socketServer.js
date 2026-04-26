import { Server } from 'socket.io'
import { handleMessage } from '../mqtt/topicHandler.js'
import { connectMqtt, publishMqtt } from '../mqtt/mqttClient.js'

function createInitialRoomState() {
  return {
    temperatura: null,
    estadoAlarma: 'normal',
    presencia: false,
    puerta: 'cerrada',
    cortina: 'inactiva',
    timestamp: null,
    temperaturaPico: null
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
  })
}

function updateSnapshot(snapshotByRoom, normalizedEvent) {
  if (!normalizedEvent) return

  const { event, payload } = normalizedEvent
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

  const io = new Server(httpServer, {
    cors: {
      origin: [/^http:\/\/localhost:\d+$/],
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    console.log(`[SOCKET] Cliente conectado: ${socket.id}`)
    emitSnapshot(socket, latestByRoom)

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

      const operadorId = sanitizeOperadorId(payload.operadorId)
      const timestamp = payload.timestamp || new Date().toISOString()

      try {
        publishMqtt(`sei/cuartos/${cuartoId}/alarma/cmd`, {
          cuarto_id: cuartoId,
          timestamp,
          comando: 'silenciar',
          operador_id: operadorId,
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

      const operadorId = sanitizeOperadorId(payload.operadorId)
      const timestamp = payload.timestamp || new Date().toISOString()

      try {
        publishMqtt(`sei/cuartos/${cuartoId}/puerta/cmd`, {
          cuarto_id: cuartoId,
          timestamp,
          comando: 'forzar_cierre',
          operador_id: operadorId,
          jwt_token: jwtToken
        }, {
          qos: 1,
          retain: false
        })
      } catch (err) {
        console.error('[SOCKET] No se pudo publicar forzar_cierre:', err.message)
      }
    })

    socket.on('disconnect', () => {
      console.log(`[SOCKET] Cliente desconectado: ${socket.id}`)
    })
  })

  connectMqtt((topic, data) => {
    const normalizedEvent = handleMessage(topic, data, io)
    updateSnapshot(latestByRoom, normalizedEvent)
  })

  return io
}
