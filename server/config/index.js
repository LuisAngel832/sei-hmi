import dotenv from 'dotenv'
dotenv.config({ path: '../.env' })

export const config = {
  mqtt: {
    host: process.env.MQTT_BROKER_HOST || 'localhost',
    port: process.env.MQTT_BROKER_PORT || 1883,
    clientId: 'sei-hmi-server'
  },
  server: {
    port: process.env.PORT || 3000
  }
}