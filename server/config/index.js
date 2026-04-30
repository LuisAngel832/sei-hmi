import dotenv from 'dotenv'
dotenv.config({ path: '../.env' })

function normalizeMqttHost(rawHost) {
  if (!rawHost) return 'localhost'

  const host = String(rawHost).trim()

  // Soporta entradas como "http://192.168.1.100:18083/" y extrae solo el hostname.
  if (host.startsWith('http://') || host.startsWith('https://') || host.startsWith('mqtt://')) {
    try {
      return new URL(host).hostname || 'localhost'
    } catch {
      return host
    }
  }

  // Si por error incluyen host:puerto en esta variable, nos quedamos con el host.
  return host.split(':')[0] || 'localhost'
}

export const config = {
  mqtt: {
    host: normalizeMqttHost(process.env.MQTT_BROKER_HOST),
    port: process.env.MQTT_BROKER_PORT || 1883,
    clientId: 'sei-hmi-server',
    maxRetainedAgeSec: Number(process.env.MQTT_MAX_RETAINED_AGE_SEC || 120)
  },
  server: {
    port: process.env.PORT || 3000
  }
}