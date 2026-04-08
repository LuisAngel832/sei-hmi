import { useEffect, useState, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = 'http://localhost:3000'
const TIMEOUT_MS = 65000 // 65 segundos
const USAR_DATOS_MOCK = true // Cambiar a false cuando el servidor este listo

// Datos mock para desarrollo sin servidor
const datosMock = {
  1: { temperatura: -2.5, estadoAlarma: 'normal', presencia: false, timestamp: Date.now(), sinSenal: false },
  2: { temperatura: 1.2, estadoAlarma: 'normal', presencia: true, timestamp: Date.now(), sinSenal: false },
  3: { temperatura: 3.5, estadoAlarma: 'preventiva', presencia: false, timestamp: Date.now(), sinSenal: false },
  4: { temperatura: 5.1, estadoAlarma: 'critica', presencia: true, timestamp: Date.now(), sinSenal: false },
  5: { temperatura: -1.8, estadoAlarma: 'normal', presencia: false, timestamp: Date.now(), sinSenal: false }
}

// Estado inicial de los 5 cuartos
const estadoInicial = {
  1: { temperatura: null, estadoAlarma: 'normal', presencia: false, timestamp: null, sinSenal: false },
  2: { temperatura: null, estadoAlarma: 'normal', presencia: false, timestamp: null, sinSenal: false },
  3: { temperatura: null, estadoAlarma: 'normal', presencia: false, timestamp: null, sinSenal: false },
  4: { temperatura: null, estadoAlarma: 'normal', presencia: false, timestamp: null, sinSenal: false },
  5: { temperatura: null, estadoAlarma: 'normal', presencia: false, timestamp: null, sinSenal: false }
}

export function useSocket() {
  const [cuartos, setCuartos] = useState(USAR_DATOS_MOCK ? datosMock : estadoInicial)
  const [conectado, setConectado] = useState(USAR_DATOS_MOCK)
  const timeoutRefs = useRef({})

  // Funcion para marcar cuarto como "sin senal"
  const marcarSinSenal = useCallback((cuartoId) => {
    setCuartos(prev => ({
      ...prev,
      [cuartoId]: {
        ...prev[cuartoId],
        sinSenal: true
      }
    }))
  }, [])

  // Funcion para reiniciar el timeout de un cuarto
  const reiniciarTimeout = useCallback((cuartoId) => {
    // Limpiar timeout anterior si existe
    if (timeoutRefs.current[cuartoId]) {
      clearTimeout(timeoutRefs.current[cuartoId])
    }
    
    // Crear nuevo timeout
    timeoutRefs.current[cuartoId] = setTimeout(() => {
      marcarSinSenal(cuartoId)
    }, TIMEOUT_MS)
  }, [marcarSinSenal])

  useEffect(() => {
    // Si estamos en modo mock, no conectar al servidor
    if (USAR_DATOS_MOCK) {
      console.log('[SOCKET] Modo MOCK activo - usando datos temporales')
      return
    }

    const socket = io(SOCKET_URL)

    socket.on('connect', () => {
      console.log('[SOCKET] Conectado al servidor HMI')
      setConectado(true)
    })

    socket.on('disconnect', () => {
      console.log('[SOCKET] Desconectado del servidor HMI')
      setConectado(false)
    })

    socket.on('temperatura', ({ cuartoId, temperatura, estadoAlarma, timestamp }) => {
      setCuartos(prev => ({
        ...prev,
        [cuartoId]: {
          ...prev[cuartoId],
          temperatura,
          estadoAlarma,
          timestamp,
          sinSenal: false // Resetear bandera
        }
      }))
      reiniciarTimeout(cuartoId)
    })

    socket.on('presencia', ({ cuartoId, presencia }) => {
      setCuartos(prev => ({
        ...prev,
        [cuartoId]: {
          ...prev[cuartoId],
          presencia
        }
      }))
    })

    socket.on('alarma', ({ cuartoId, estado, temperaturaPico }) => {
      setCuartos(prev => ({
        ...prev,
        [cuartoId]: {
          ...prev[cuartoId],
          estadoAlarma: estado,
          temperaturaPico
        }
      }))
    })

    // Iniciar timeouts para todos los cuartos
    Object.keys(estadoInicial).forEach(id => {
      reiniciarTimeout(parseInt(id))
    })

    return () => {
      socket.disconnect()
      // Limpiar todos los timeouts
      Object.values(timeoutRefs.current).forEach(clearTimeout)
    }
  }, [reiniciarTimeout])

  // Calcular numero de alarmas activas
  const alarmasActivas = Object.values(cuartos).filter(
    c => c.estadoAlarma === 'critica' || c.estadoAlarma === 'preventiva'
  ).length

  return { cuartos, conectado, alarmasActivas }
}