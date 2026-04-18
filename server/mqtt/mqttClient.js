import mqtt from 'mqtt'
import { config } from '../config/index.js'

const brokerUrl = `mqtt://${config.mqtt.host}:${config.mqtt.port}`

let client = null
let mqttConnected = false
let liveMessages = 0
let retainedMessages = 0
let skippedRetainedStale = 0
let lastTimestampSeen = null
let lastMessageAt = null
let lastLiveAt = null
let lastRetainedAt = null

function resetMqttStats() {
  mqttConnected = false
  liveMessages = 0
  retainedMessages = 0
  skippedRetainedStale = 0
  lastTimestampSeen = null
  lastMessageAt = null
  lastLiveAt = null
  lastRetainedAt = null
}

function warnIfOnlyRetained() {
  // Si despues de un tiempo solo hay retained, casi seguro estamos en el broker equivocado.
  if (liveMessages === 0 && retainedMessages > 0) {
    const ageText = lastTimestampSeen
      ? `${Math.floor((Date.now() - new Date(lastTimestampSeen).getTime()) / 1000)}s de antiguedad`
      : 'sin timestamp'

    console.warn(
      `[MQTT][WARN] Solo se recibieron mensajes retained y ningun mensaje live en ${brokerUrl}. ` +
      `Ultimo timestamp observado: ${lastTimestampSeen || 'n/a'} (${ageText}). ` +
      'Verifica que simuladores y HMI usen el mismo broker (host/puerto).'
    )
  }
}

function getMessageAgeSeconds(timestamp) {
  if (!timestamp) return null
  const ms = Date.now() - new Date(timestamp).getTime()
  if (Number.isNaN(ms)) return null
  return Math.floor(ms / 1000)
}

export function getMqttDiagnostics() {
  return {
    brokerUrl,
    connected: mqttConnected,
    liveMessages,
    retainedMessages,
    skippedRetainedStale,
    lastTimestampSeen,
    lastMessageAt,
    lastLiveAt,
    lastRetainedAt,
    maxRetainedAgeSec: config.mqtt.maxRetainedAgeSec
  }
}

export function connectMqtt(onMessage) {
  resetMqttStats()

  client = mqtt.connect(brokerUrl, {
    clientId: config.mqtt.clientId,
    keepalive: 60,
    reconnectPeriod: 3000,
    connectTimeout: 10000
  })

  client.on('connect', () => {
    mqttConnected = true
    console.log(`[MQTT] Conectado a ${brokerUrl}`)
    setTimeout(warnIfOnlyRetained, 15000)

    client.subscribe('sei/cuartos/+/#', { qos: 1 }, (err) => {
      if (err) {
        console.error('[MQTT] Error al suscribirse:', err)
      } else {
        console.log('[MQTT] Suscrito a sei/cuartos/+/#')
      }
    })
  })

  client.on('message', (topic, payload, packet) => {
    try {
      lastMessageAt = new Date().toISOString()

      const rawPayload = payload.toString()
      if (!rawPayload.trim()) {
        console.log(`[MQTT][SKIP] Payload vacío ignorado en ${topic}`)
        return
      }

      const retain = packet?.retain ? 'retain=true' : 'retain=false'
      console.log(`[MQTT][RAW] ${topic} (${retain}) -> ${rawPayload}`)

      if (packet?.retain) {
        retainedMessages += 1
        lastRetainedAt = new Date().toISOString()
      } else {
        liveMessages += 1
        lastLiveAt = new Date().toISOString()
      }

      const data = JSON.parse(rawPayload)
      const ageSec = getMessageAgeSeconds(data?.timestamp)

      if (data?.timestamp) {
        lastTimestampSeen = data.timestamp
      }

      if (ageSec !== null) {
        console.log(`[MQTT][AGE] ${topic} -> ${ageSec}s`)
      }

      if (packet?.retain && ageSec !== null && ageSec > config.mqtt.maxRetainedAgeSec) {
        skippedRetainedStale += 1
        console.warn(
          `[MQTT][SKIP] Retained viejo ignorado en ${topic}. ` +
          `Edad=${ageSec}s, limite=${config.mqtt.maxRetainedAgeSec}s.`
        )
        return
      }

      console.log('[MQTT][PARSED]', data)
      onMessage(topic, data)
    } catch (err) {
      console.error(`[MQTT] Payload inválido en ${topic}:`, err.message)
    }
  })

  client.on('reconnect', () => {
    console.log('[MQTT] Reconectando...')
  })

  client.on('error', (err) => {
    console.error('[MQTT] Error de conexión:', err.message)
  })

  client.on('offline', () => {
    mqttConnected = false
    console.warn('[MQTT] Cliente offline — esperando reconexión')
  })

  client.on('close', () => {
    mqttConnected = false
  })
}

export function publishMqtt(topic, message, options = {}) {
  if (!client || !mqttConnected) {
    throw new Error('MQTT no conectado')
  }

  const payload = JSON.stringify(message)
  const publishOptions = {
    qos: options.qos ?? 1,
    retain: options.retain ?? false
  }

  client.publish(topic, payload, publishOptions, (err) => {
    if (err) {
      console.error(`[MQTT][PUB][ERROR] ${topic}`, err.message)
      return
    }
    console.log(`[MQTT][PUB] ${topic} -> ${payload}`)
  })
}
