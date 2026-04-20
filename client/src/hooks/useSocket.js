import { useEffect, useState, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'
const TIMEOUT_MS = 65000
const USAR_DATOS_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const OPERADOR_ID = Number.parseInt(import.meta.env.VITE_OPERADOR_ID || '1', 10)

const datosMock = {
  1: { temperatura: -2.5, estadoAlarma: 'normal', presencia: false, puerta: 'cerrada', cortina: 'inactiva', refrigeracion: 100, timestamp: Date.now(), sinSenal: false },
  2: { temperatura: 1.2, estadoAlarma: 'normal', presencia: true, puerta: 'cerrada', cortina: 'inactiva', refrigeracion: 100, timestamp: Date.now(), sinSenal: false },
  3: { temperatura: 3.5, estadoAlarma: 'preventiva', presencia: false, puerta: 'abierta', cortina: 'activa', refrigeracion: 100, timestamp: Date.now(), sinSenal: false },
  4: { temperatura: 5.1, estadoAlarma: 'critica', presencia: true, puerta: 'abierta', cortina: 'activa', refrigeracion: 100, timestamp: Date.now(), sinSenal: false },
  5: { temperatura: -1.8, estadoAlarma: 'normal', presencia: false, puerta: 'cerrada', cortina: 'inactiva', refrigeracion: 100, timestamp: Date.now(), sinSenal: false }
}

const estadoInicial = {
  1: { temperatura: null, estadoAlarma: 'normal', presencia: false, puerta: 'cerrada', cortina: 'inactiva', refrigeracion: 100, timestamp: null, sinSenal: false },
  2: { temperatura: null, estadoAlarma: 'normal', presencia: false, puerta: 'cerrada', cortina: 'inactiva', refrigeracion: 100, timestamp: null, sinSenal: false },
  3: { temperatura: null, estadoAlarma: 'normal', presencia: false, puerta: 'cerrada', cortina: 'inactiva', refrigeracion: 100, timestamp: null, sinSenal: false },
  4: { temperatura: null, estadoAlarma: 'normal', presencia: false, puerta: 'cerrada', cortina: 'inactiva', refrigeracion: 100, timestamp: null, sinSenal: false },
  5: { temperatura: null, estadoAlarma: 'normal', presencia: false, puerta: 'cerrada', cortina: 'inactiva', refrigeracion: 100, timestamp: null, sinSenal: false }
}

const formatHora = () => new Date().toLocaleTimeString('es-MX', {
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
})

export function useSocket() {
  const nextEventoIdRef = useRef(2)
  const [cuartos, setCuartos] = useState(USAR_DATOS_MOCK ? datosMock : estadoInicial)
  const [conectado, setConectado] = useState(USAR_DATOS_MOCK)
  const [eventosLog, setEventosLog] = useState([
    {
      id: 1,
      hora: formatHora(),
      cuartoId: null,
      descripcion: 'Sistema iniciado — esperando datos',
      tipo: 'info'
    }
  ])
  const timeoutRefs = useRef({})
  const socketRef = useRef(null)

  const agregarEvento = useCallback((cuartoId, descripcion, tipo = 'info') => {
    const evento = {
      id: nextEventoIdRef.current++,
      hora: formatHora(),
      cuartoId,
      descripcion,
      tipo
    }
    setEventosLog(prev => [...prev, evento].slice(-20))
  }, [])

  const esCuartoValido = useCallback((cuartoId) => {
    return Number.isInteger(cuartoId) && cuartoId >= 1 && cuartoId <= 5
  }, [])

  const toBoolean = (value) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value === 1
    if (typeof value === 'string') {
      const n = value.trim().toLowerCase()
      return n === 'true' || n === '1' || n === 'si' || n === 'sí'
    }
    return false
  }

  const marcarSinSenal = useCallback((cuartoId) => {
    setCuartos(prev => ({ ...prev, [cuartoId]: { ...prev[cuartoId], sinSenal: true } }))
    agregarEvento(cuartoId, `Cuarto ${cuartoId} — sin señal`, 'critica')
  }, [agregarEvento])

  const reiniciarTimeout = useCallback((cuartoId) => {
    if (timeoutRefs.current[cuartoId]) clearTimeout(timeoutRefs.current[cuartoId])
    timeoutRefs.current[cuartoId] = setTimeout(() => marcarSinSenal(cuartoId), TIMEOUT_MS)
  }, [marcarSinSenal])

  // Función para emitir comandos al backend vía socket
  const emitirComando = useCallback((evento, payload) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(evento, payload)
      agregarEvento(payload.cuartoId, `Comando: ${evento} → Cuarto ${payload.cuartoId}`, 'info')
    } else {
      console.warn('Socket no conectado — comando descartado:', evento, payload)
    }
  }, [agregarEvento])

  const silenciarAlarma = useCallback((cuartoId, operadorId = 1) => {
    emitirComando('silenciar_alarma', {
      cuartoId,
      operadorId,
      operador_id: operadorId,
      timestamp: new Date().toISOString()
    })
  }, [emitirComando])

  const cerrarPuerta = useCallback((cuartoId, operadorId = 1) => {
    emitirComando('forzar_cierre', { cuartoId, operadorId, timestamp: new Date().toISOString() })
  }, [emitirComando])

  useEffect(() => {
    if (USAR_DATOS_MOCK) return

    const socket = io(SOCKET_URL)
    socketRef.current = socket

    socket.on('connect', () => {
      setConectado(true)
      agregarEvento(null, 'Conectado al servidor SEI', 'info')
    })

    socket.on('disconnect', () => {
      setConectado(false)
      agregarEvento(null, 'Desconectado del servidor', 'critica')
    })

    socket.on('temperatura', ({ cuartoId, temperatura, estadoAlarma, timestamp }) => {
      if (!esCuartoValido(cuartoId)) return
      setCuartos(prev => ({
        ...prev,
        [cuartoId]: {
          ...prev[cuartoId],
          temperatura,
          estadoAlarma: estadoAlarma || prev[cuartoId].estadoAlarma,
          timestamp: timestamp || Date.now(),
          sinSenal: false
        }
      }))
      reiniciarTimeout(cuartoId)
    })

    socket.on('presencia', ({ cuartoId, presencia, timestamp }) => {
      if (!esCuartoValido(cuartoId)) return
      setCuartos(prev => ({
        ...prev,
        [cuartoId]: {
          ...prev[cuartoId],
          presencia: toBoolean(presencia),
          timestamp: timestamp || prev[cuartoId].timestamp,
          sinSenal: false
        }
      }))
      reiniciarTimeout(cuartoId)
    })

    socket.on('alarma', ({ cuartoId, estado, temperaturaPico, timestamp }) => {
      if (!esCuartoValido(cuartoId)) return
      setCuartos(prev => ({
        ...prev,
        [cuartoId]: {
          ...prev[cuartoId],
          estadoAlarma: estado || prev[cuartoId].estadoAlarma,
          temperaturaPico,
          timestamp: timestamp || prev[cuartoId].timestamp,
          sinSenal: false
        }
      }))
      reiniciarTimeout(cuartoId)
    })

    socket.on('puerta', ({ cuartoId, estado, origen, timestamp }) => {
      if (!esCuartoValido(cuartoId)) return
      setCuartos(prev => ({
        ...prev,
        [cuartoId]: {
          ...prev[cuartoId],
          puerta: estado || prev[cuartoId].puerta,
          timestamp: timestamp || prev[cuartoId].timestamp,
          sinSenal: false
        }
      }))
      agregarEvento(cuartoId, `Puerta Cuarto ${cuartoId}: ${estado} (${origen || 'manual'})`, 'info')
      reiniciarTimeout(cuartoId)
    })

    socket.on('cortina', ({ cuartoId, estado }) => {
      if (!esCuartoValido(cuartoId)) return
      setCuartos(prev => ({
        ...prev,
        [cuartoId]: { ...prev[cuartoId], cortina: estado }
      }))
      agregarEvento(cuartoId, `Cortina Cuarto ${cuartoId}: ${estado}`, 'info')
    })

    socket.on('refrigeracion', ({ cuartoId, potenciaPct }) => {
      if (!esCuartoValido(cuartoId)) return
      setCuartos(prev => ({
        ...prev,
        [cuartoId]: { ...prev[cuartoId], refrigeracion: potenciaPct }
      }))
    })

    Object.keys(estadoInicial).forEach(id => reiniciarTimeout(Number(id)))

    return () => {
      socket.disconnect()
      socketRef.current = null
      Object.values(timeoutRefs.current).forEach(clearTimeout)
    }
  }, [esCuartoValido, reiniciarTimeout, agregarEvento])

  const alarmasActivas = Object.values(cuartos).filter(
    c => c.estadoAlarma === 'critica' || c.estadoAlarma === 'preventiva'
  ).length

  const silenciarAlarmaConOperador = useCallback((cuartoId) => {
    silenciarAlarma(cuartoId, Number.isInteger(OPERADOR_ID) && OPERADOR_ID > 0 ? OPERADOR_ID : 1)
  }, [silenciarAlarma])

  return { cuartos, conectado, alarmasActivas, eventosLog, silenciarAlarma: silenciarAlarmaConOperador, cerrarPuerta }
}
