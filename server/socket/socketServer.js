import { Server } from 'socket.io'
import { handleMessage } from '../mqtt/topicHandler.js'
import { connectMqtt } from '../mqtt/mqttClient.js'

export function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:5173', 
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    console.log(`[SOCKET] Cliente conectado: ${socket.id}`)

    socket.on('disconnect', () => {
      console.log(`[SOCKET] Cliente desconectado: ${socket.id}`)
    })
  })

  // Conectar MQTT y pasar mensajes a Socket.IO
  connectMqtt((topic, data) => {
    handleMessage(topic, data, io)
  })

  return io
}