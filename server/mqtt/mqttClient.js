import mqtt from 'mqtt'
import { config } from '../config/index.js'

const brokerUrl = `mqtt://${config.mqtt.host}:${config.mqtt.port}`

let client = null

export function connectMqtt(onMessage) {
  client = mqtt.connect(brokerUrl, {
    clientId: config.mqtt.clientId,
    keepalive: 60,
    reconnectPeriod: 3000,
    connectTimeout: 10000
  })

  client.on('connect', () => {
    console.log(`[MQTT] Conectado a ${brokerUrl}`)
    client.subscribe('sei/cuartos/+/#', { qos: 1 }, (err) => {
      if (err) {
        console.error('[MQTT] Error al suscribirse:', err)
      } else {
        console.log('[MQTT] Suscrito a sei/cuartos/+/#')
      }
    })
  })

  client.on('message', (topic, payload) => {
    try {
      const data = JSON.parse(payload.toString())
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
    console.warn('[MQTT] Cliente offline — esperando reconexión')
  })
}