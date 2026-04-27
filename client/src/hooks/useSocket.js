import { useEffect, useState, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'
const TIMEOUT_MS = 65000
const USAR_DATOS_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

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
  const { token, user } = useAuth()
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
    if (!token || !user) {
      console.warn('Comando descartado — sin sesion activa:', evento)
      return
    }
    if (!socketRef.current?.connected) {
      console.warn('Socket no conectado — comando descartado:', evento, payload)
      return
    }
    const payloadConAuth = {
      ...payload,
      operadorId: user.operadorId,
      operador_id: user.operadorId,
      rol: user.rol,
      jwtToken: token,
      jwt_token: token
    }
    socketRef.current.emit(evento, payloadConAuth)
    agregarEvento(payload.cuartoId, `Comando: ${evento} → Cuarto ${payload.cuartoId}`, 'info')
  }, [agregarEvento, token, user])

  const silenciarAlarma = useCallback((cuartoId) => {
    emitirComando('silenciar_alarma', {
      cuartoId,
      timestamp: new Date().toISOString()
    })
  }, [emitirComando])

  const cerrarPuerta = useCallback((cuartoId) => {
    emitirComando('forzar_cierre', {
      cuartoId,
      timestamp: new Date().toISOString()
    })
  }, [emitirComando])

  const forzarRefrigeracion = useCallback((cuartoId, potenciaPct = 100) => {
    emitirComando('forzar_refrigeracion', {
      cuartoId,
      potenciaPct,
      potencia_pct: potenciaPct,
      timestamp: new Date().toISOString()
    })
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

    socket.on('snapshot_inicial', ({ cuartos: snapshotCuartos }) => {
      if (!Array.isArray(snapshotCuartos) || snapshotCuartos.length === 0) return
      setCuartos(prev => {
        const next = { ...prev }
        snapshotCuartos.forEach((c) => {
          if (!esCuartoValido(c.cuartoId)) return
          next[c.cuartoId] = {
            ...prev[c.cuartoId],
            temperatura: c.temperatura,
            estadoAlarma: c.estadoAlarma,
            presencia: toBoolean(c.presencia),
            puerta: c.puerta,
            cortina: c.cortina,
            timestamp: c.timestamp || Date.now(),
            sinSenal: false
          }
        })
        return next
      })
      snapshotCuartos.forEach((c) => {
        if (esCuartoValido(c.cuartoId)) reiniciarTimeout(c.cuartoId)
      })
      agregarEvento(null, `Snapshot inicial — ${snapshotCuartos.length} cuartos sincronizados`, 'info')
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
      setCuartos(prev => {
        const previo = prev[cuartoId]
        const cerrandoIniciadoEn = estado === 'cerrando'
          ? Date.now()
          : null
        return {
          ...prev,
          [cuartoId]: {
            ...previo,
            puerta: estado || previo.puerta,
            cerrandoIniciadoEn,
            timestamp: timestamp || previo.timestamp,
            sinSenal: false
          }
        }
      })
      const tipoEvento = estado === 'cerrando' || estado === 'cierre_cancelado' ? 'preventiva' : 'info'
      agregarEvento(cuartoId, `Puerta Cuarto ${cuartoId}: ${estado} (${origen || 'manual'})`, tipoEvento)
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

  return {
    cuartos,
    conectado,
    alarmasActivas,
    eventosLog,
    silenciarAlarma,
    cerrarPuerta,
    forzarRefrigeracion
  }
}
