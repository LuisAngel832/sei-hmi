import express from 'express'
import { createServer } from 'http'
import { config } from './config/index.js'
import { initSocketServer } from './socket/socketServer.js'

const app = express()
const httpServer = createServer(app)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

initSocketServer(httpServer)

httpServer.listen(config.server.port, () => {
  console.log(`[SERVER] SEI HMI corriendo en puerto ${config.server.port}`)
})