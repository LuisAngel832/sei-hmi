# Plan de Implementacion - Sprint 1 Frontend
## Sistema de Enfriamiento Inteligente (SEI)

**Fecha:** Abril 2026  
**Rol:** Dev - Frontend  
**Alcance:** Dashboard principal con 5 tarjetas de cuartos frios

---

## Resumen del Sprint 1

### Tareas del Product Backlog
| ID | Descripcion | Horas |
|----|-------------|-------|
| T-01-09 | HMI: implementar suscripcion MQTT en Node.js y mostrar temperatura de 5 cuartos en React UI | 4h |
| T-03-04 | HMI: mostrar indicador de presencia por cuarto junto a la temperatura | 2h |

### Criterios de Aceptacion (Definition of Done)
- [ ] Temperatura actualizada en < 500ms despues de publicacion MQTT
- [ ] Mostrar "Sin senal" si no hay lectura en 65 segundos
- [ ] Indicadores visuales: Verde = Normal, Amarillo = Preventiva (>3C), Rojo = Critica (>4C)
- [ ] Indicador de presencia visible por cada cuarto

---

## Estado Actual del Proyecto

### Archivos Existentes
| Archivo | Estado | Accion |
|---------|--------|--------|
| `index.html` | OK | Fuentes ya incluidas (JetBrains Mono, DM Sans) |
| `src/index.css` | OK | Variables CSS ya definidas |
| `src/App.jsx` | REEMPLAZAR | Tiene template de Vite, hay que cambiarlo |
| `src/App.css` | REEMPLAZAR | Estilos del template de Vite |
| `src/hooks/useSocket.js` | MODIFICAR | Agregar logica de timeout 65s |
| `src/components/RoomCard.jsx` | MODIFICAR | Ajustar para que funcione sin servidor |
| `src/components/RoomCard.css` | OK | Ya tiene estilos del Figma |

### Servidor Node.js (`sei-hmi/server`)
- **Estado:** Completo y funcional
- **Nota:** NO lo vamos a modificar, solo el cliente React

---

## Plan de Implementacion Paso a Paso

### FASE 1: Preparacion del Entorno
**Tiempo estimado: 15 min**

#### Paso 1.1: Limpiar archivos del template Vite
- Eliminar assets innecesarios de `src/assets/` (hero.png, logos de Vite/React si no se usan)
- Mantener solo lo necesario

#### Paso 1.2: Actualizar titulo de la aplicacion
- En `index.html`: Cambiar `<title>client</title>` por `<title>SEI - Monitor de Cuartos Frios</title>`

---

### FASE 2: Implementar App.jsx (Dashboard Principal)
**Tiempo estimado: 30 min**

#### Paso 2.1: Crear estructura del dashboard
El layout debe seguir el diseno de Figma (Desktop-1):

```
+--------------------------------------------------+
|  [Logo] SEI Monitor    [Alarmas] [Hora] [Estado] |  <- Header
+--------------------------------------------------+
|                                                  |
|   [Card 1]  [Card 2]  [Card 3]  [Card 4]  [Card 5] <- Grid de cuartos
|                                                  |
+--------------------------------------------------+
```

#### Paso 2.2: Codigo para App.jsx
```jsx
import { useSocket } from './hooks/useSocket'
import { Header } from './components/Header'
import { RoomCard } from './components/RoomCard'
import './App.css'

function App() {
  const { cuartos, conectado, alarmasActivas } = useSocket()

  return (
    <div className="app">
      <Header conectado={conectado} alarmasActivas={alarmasActivas} />
      
      <main className="dashboard">
        <div className="room-grid">
          {[1, 2, 3, 4, 5].map(id => (
            <RoomCard 
              key={id} 
              cuartoId={id} 
              datos={cuartos[id]} 
            />
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
```

#### Paso 2.3: Estilos para App.css
```css
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.dashboard {
  flex: 1;
  padding: 24px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  max-width: 1700px;
}

/* Responsive: menos columnas en pantallas pequenas */
@media (max-width: 1400px) {
  .room-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .room-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .room-grid {
    grid-template-columns: 1fr;
  }
}
```

---

### FASE 3: Crear Componente Header
**Tiempo estimado: 30 min**

#### Paso 3.1: Crear archivo `src/components/Header.jsx`

Elementos del header segun Figma:
- Logo SEI (izquierda)
- Titulo "Monitor Cuartos Frios"
- Badge de alarmas activas (si hay)
- Reloj en tiempo real
- Indicador de conexion Socket.IO

```jsx
import { useState, useEffect } from 'react'
import './Header.css'

export function Header({ conectado, alarmasActivas = 0 }) {
  const [hora, setHora] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setHora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatHora = (fecha) => {
    return fecha.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  const formatFecha = (fecha) => {
    return fecha.toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  return (
    <header className="header">
      <div className="header__brand">
        <div className="header__logo">
          <span className="header__logo-icon">*</span>
        </div>
        <div className="header__titles">
          <h1 className="header__title">SEI Monitor</h1>
          <span className="header__subtitle">Cuartos Frios</span>
        </div>
      </div>

      <div className="header__status">
        {alarmasActivas > 0 && (
          <div className="header__alarmas">
            <span className="header__alarmas-badge">{alarmasActivas}</span>
            <span className="header__alarmas-text">Alarmas</span>
          </div>
        )}

        <div className="header__tiempo">
          <span className="header__hora">{formatHora(hora)}</span>
          <span className="header__fecha">{formatFecha(hora)}</span>
        </div>

        <div className={`header__conexion ${conectado ? 'header__conexion--ok' : 'header__conexion--error'}`}>
          <span className="header__conexion-dot" />
          <span className="header__conexion-text">
            {conectado ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>
    </header>
  )
}
```

#### Paso 3.2: Crear archivo `src/components/Header.css`
```css
.header {
  background: var(--bg-navbar);
  border-bottom: 1px solid var(--border-subtle);
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header__logo {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--text-cyan), #0891b2);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header__logo-icon {
  font-size: 24px;
  color: var(--bg-app);
}

.header__titles {
  display: flex;
  flex-direction: column;
}

.header__title {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.header__subtitle {
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--text-muted);
}

.header__status {
  display: flex;
  align-items: center;
  gap: 24px;
}

.header__alarmas {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
}

.header__alarmas-badge {
  background: var(--color-critica);
  color: white;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.header__alarmas-text {
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--color-critica);
}

.header__tiempo {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.header__hora {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.header__fecha {
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--text-muted);
}

.header__conexion {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  border: 1px solid;
}

.header__conexion--ok {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

.header__conexion--error {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.header__conexion-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.header__conexion--ok .header__conexion-dot {
  background: var(--color-normal);
  box-shadow: 0 0 8px var(--color-normal);
}

.header__conexion--error .header__conexion-dot {
  background: var(--color-critica);
}

.header__conexion-text {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
}

.header__conexion--ok .header__conexion-text {
  color: var(--color-normal);
}

.header__conexion--error .header__conexion-text {
  color: var(--color-critica);
}
```

---

### FASE 4: Modificar useSocket.js (Timeout 65s + Datos Temporales)
**Tiempo estimado: 30 min**

#### Paso 4.1: Agregar logica de timeout y datos mock

Como no tenemos el servidor MQTT/Node.js corriendo, necesitamos:
1. Datos temporales (mock) para desarrollo
2. Logica de timeout de 65 segundos
3. Bandera para activar/desactivar modo mock

```jsx
import { useEffect, useState, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = 'http://localhost:3000'
const TIMEOUT_MS = 65000 // 65 segundos
const USAR_DATOS_MOCK = true // Cambiar a false cuando el servidor este listo

// Datos mock para desarrollo sin servidor
const datosMock = {
  1: { temperatura: -2.5, estadoAlarma: 'normal', presencia: false, timestamp: Date.now() },
  2: { temperatura: 1.2, estadoAlarma: 'normal', presencia: true, timestamp: Date.now() },
  3: { temperatura: 3.5, estadoAlarma: 'preventiva', presencia: false, timestamp: Date.now() },
  4: { temperatura: 5.1, estadoAlarma: 'critica', presencia: true, timestamp: Date.now() },
  5: { temperatura: -1.8, estadoAlarma: 'normal', presencia: false, timestamp: Date.now() }
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
```

---

### FASE 5: Actualizar RoomCard.jsx para "Sin Senal"
**Tiempo estimado: 15 min**

#### Paso 5.1: Modificar RoomCard para manejar estado sinSenal

Agregar al componente existente:
- Verificar propiedad `sinSenal` de los datos
- Mostrar "Sin senal" cuando `sinSenal === true` o `temperatura === null`

```jsx
// En RoomCard.jsx, modificar la funcion formatTemperatura:

const formatTemperatura = (temp, sinSenal) => {
  if (sinSenal || temp === null) return 'Sin senal'
  const signo = temp > 0 ? '+' : ''
  return `${signo}${temp.toFixed(1)}C`
}

// Y en el JSX, pasar sinSenal:
<span
  className="room-card__temp-value"
  style={{ color: getTemperaturaColor() }}
>
  {formatTemperatura(temperatura, datos.sinSenal)}
</span>
```

---

### FASE 6: Conectar Header con Alarmas
**Tiempo estimado: 10 min**

#### Paso 6.1: Pasar alarmasActivas al Header

En `App.jsx`:
```jsx
const { cuartos, conectado, alarmasActivas } = useSocket()

// ...

<Header conectado={conectado} alarmasActivas={alarmasActivas} />
```

---

## Resumen de Archivos a Crear/Modificar

### Crear Nuevos
| Archivo | Descripcion |
|---------|-------------|
| `src/components/Header.jsx` | Componente del encabezado |
| `src/components/Header.css` | Estilos del encabezado |

### Modificar Existentes
| Archivo | Cambios |
|---------|---------|
| `index.html` | Cambiar titulo |
| `src/App.jsx` | Reemplazar completamente |
| `src/App.css` | Reemplazar completamente |
| `src/hooks/useSocket.js` | Agregar timeout 65s y datos mock |
| `src/components/RoomCard.jsx` | Agregar manejo de sinSenal |

### Eliminar
| Archivo | Razon |
|---------|-------|
| `src/assets/hero.png` | Asset del template Vite |

---

## Orden de Implementacion Recomendado

1. **Paso 1:** Actualizar `index.html` (titulo)
2. **Paso 2:** Modificar `useSocket.js` (timeout + mock data)
3. **Paso 3:** Crear `Header.jsx` y `Header.css`
4. **Paso 4:** Reemplazar `App.jsx` y `App.css`
5. **Paso 5:** Actualizar `RoomCard.jsx` (sinSenal)
6. **Paso 6:** Probar la aplicacion con `npm run dev`

---

## Pruebas Manuales

### Sin servidor (Modo Mock)
1. Ejecutar `npm run dev` en `sei-hmi/client`
2. Verificar que se muestran 5 tarjetas con datos mock
3. Verificar que el header muestra "Conectado"
4. Verificar que el reloj se actualiza cada segundo
5. Verificar colores: normal (verde), preventiva (amarillo), critica (rojo)

### Con servidor (cuando este disponible)
1. Ejecutar EMQX broker
2. Ejecutar servidor Node.js (`sei-hmi/server`)
3. Ejecutar cliente React (`sei-hmi/client`)
4. Cambiar `USAR_DATOS_MOCK = false` en useSocket.js
5. Publicar mensajes MQTT de prueba
6. Verificar actualizacion en < 500ms
7. Esperar 65s sin publicar y verificar "Sin senal"

---

## Notas Importantes

### Constante USAR_DATOS_MOCK
- Ubicacion: `src/hooks/useSocket.js`
- `true` = Datos falsos para desarrollo
- `false` = Conexion real al servidor Socket.IO
- **Recordar cambiar a `false` antes de integrar con el backend**

### Responsive
- 5 columnas en pantallas > 1400px
- 3 columnas en pantallas 900-1400px
- 2 columnas en pantallas 600-900px
- 1 columna en pantallas < 600px

### Fuentes
- **JetBrains Mono**: Valores numericos (temperatura, hora, porcentajes)
- **DM Sans**: Etiquetas, titulos, texto general

---

## Proximos Pasos (Fuera de Sprint 1)

- [ ] Sprint 2: Vista detalle de cuarto (Desktop-2)
- [ ] Sprint 2: Historial y graficas (Desktop-3)
- [ ] Sprint 3: Modales de alarma (Desktop-5, Desktop-6)
- [ ] Sprint 3: React Router para navegacion
- [ ] Integracion con simuladores Python
- [ ] Configuracion de EMQX en Docker
