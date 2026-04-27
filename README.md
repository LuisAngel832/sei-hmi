# SEI HMI

Capa de visualizacion y control para el **Sistema de Enfriamiento Inteligente (SEI)** —
descarga de productos carnicos.
Cliente React + bridge Node.js que se conecta al broker EMQX y al backend Spring Boot
construidos por equipos separados.

> Este repo cubre **solo el HMI**. El backend Java (`BackEnfriadores`) y los simuladores
> Python viven en otros repos del proyecto.

## Arquitectura

```
+-----------------+        +---------------------+        +----------------------+
|   React (Vite)  | <----> |  Node bridge       | <----> |  EMQX (broker MQTT) |
|   client/       | socket |  server/           |  mqtt  |  192.168.1.100:1883  |
+-----------------+        +---------------------+        +----------------------+
                                       ^
                                       |  publica/suscribe los mismos topicos
                                       v
                          +---------------------------+
                          |  Backend Spring Boot      |
                          |  (autoridad de alarmas,   |
                          |   control y persistencia) |
                          +---------------------------+
```

- El cliente se autentica contra el backend (`POST /api/login`) y guarda el JWT en
  `sessionStorage`.
- El bridge mantiene una conexion MQTT al broker, transforma los topicos a eventos
  Socket.IO para el navegador y firma los comandos del operador con el JWT recibido por socket.
- El backend Spring Boot es la autoridad final: valida la firma del JWT, ejecuta la
  logica de alarmas / control y persiste todo en PostgreSQL.

## Estructura del repo

```
sei-hmi/
|-- client/                 # React + Vite
|   |-- src/
|   |   |-- api/            # httpClient (axios + interceptor Bearer)
|   |   |-- components/     # Header, RoomCard, ConfirmDialog
|   |   |-- context/        # AuthContext, ToastContext
|   |   |-- hooks/          # useSocket
|   |   |-- pages/          # Login, Home
|   |   |-- routes/         # ProtectedRoute
|   |   `-- App.jsx, main.jsx
|   `-- docs/tests/         # Checklists manuales (HU-13, HU-10, HU-07)
|-- server/                 # Bridge MQTT <-> Socket.IO
|   |-- mqtt/               # cliente MQTT y topic handler
|   |-- socket/             # servidor Socket.IO con validacion de comandos
|   |-- config/
|   `-- index.js
`-- README.md (este archivo)
```

## Setup local

### Prerrequisitos
- Node.js 20+
- EMQX 5.x corriendo en `192.168.1.100:1883` (o ajusta `MQTT_HOST` / `MQTT_PORT`).
- Backend Spring Boot del proyecto `BackEnfriadores` arriba en `http://localhost:8080`.

### Variables de entorno del cliente
`client/.env.local`:

```
VITE_API_URL=http://localhost:8080
VITE_SOCKET_URL=http://localhost:3000
```

### Variables de entorno del bridge
`server/.env`:

```
MQTT_HOST=192.168.1.100
MQTT_PORT=1883
PORT=3000
```

### Levantar el HMI

```bash
# Terminal 1 — bridge
cd server
npm install
node index.js

# Terminal 2 — cliente
cd client
npm install
npm run dev
```

El cliente queda en `http://localhost:5173/`.

## Autenticacion y roles

### Flujo de login

1. El usuario abre el HMI -> `ProtectedRoute` detecta que no hay sesion y redirige a `/login`.
2. La pantalla de login envia `POST /api/login` con `{ usuario, password }` al backend.
3. Si las credenciales son validas, el backend retorna `{ jwt_token }` con claims
   `{ operador_id, nombre, rol, exp }` firmados con HS256.
4. `AuthContext` guarda el token en `sessionStorage.sei.auth.token`, decodifica los claims
   y programa un `setTimeout` que dispara `logout()` automaticamente al vencer `exp`.
5. El usuario queda redirigido a `/` (panel) y el `Header` muestra su nombre + badge de rol.

### Credenciales de prueba

| Usuario  | Contrasena | Rol         |
|----------|------------|-------------|
| `jperez` | `1234`     | operador    |
| `alopez` | `5678`     | supervisor  |

### Comportamiento por rol

| Capacidad                              | Operador | Supervisor |
|----------------------------------------|----------|------------|
| Ver estado de los 5 cuartos            | si       | si         |
| Recibir alarmas preventiva / critica   | si       | si         |
| Ver countdown de cierre automatico     | si       | si         |
| Ver toasts de cierre / cancelacion     | si       | si         |
| Boton **Silenciar Alarma** (critica)   | no       | si         |
| Boton **Forzar Refrigeracion** (>3 C)  | no       | si         |
| Cerrar sesion                          | si       | si         |

La proteccion en el HMI es defensa en profundidad. La autoridad final esta en el backend
Java, que valida la firma del JWT y rechaza comandos cuyo `rol` declarado en payload no
coincide con el claim del token.

### Propagacion del JWT

- **REST:** todas las llamadas pasan por `client/src/api/httpClient.js`, una instancia de
  `axios` con un interceptor que inyecta `Authorization: Bearer <token>` desde sessionStorage.
- **MQTT:** los comandos disparados desde el HMI (`silenciar_alarma`, `forzar_cierre`,
  `forzar_refrigeracion`) viajan via socket al bridge. `useSocket` enriquece cada payload
  con `operador_id`, `rol` y `jwt_token`. El bridge valida que el token tenga forma JWT y
  que `rol === 'supervisor'` antes de publicar en los topicos `*/cmd`.

## Topicos MQTT relevantes

Topicos consumidos por el HMI (publicados por el simulador o el backend):

- `sei/cuartos/{n}/temperatura` — lectura periodica.
- `sei/cuartos/{n}/presencia` — booleano del PIR.
- `sei/cuartos/{n}/alarma` — `{normal|preventiva|critica}` publicado por el backend.
- `sei/cuartos/{n}/puerta` — `{abierta|cerrada|cerrando|cierre_cancelado}`.
- `sei/cuartos/{n}/cortina` — `{activa|inactiva}`.
- `sei/sistema/estado` — snapshot global publicado por el backend al arrancar.

Topicos publicados por el HMI (comandos):

- `sei/cuartos/{n}/alarma/cmd` — `{ comando: 'silenciar', operador_id, rol, jwt_token }`.
- `sei/cuartos/{n}/puerta/cmd` — `{ comando: 'forzar_cierre', ... }`.
- `sei/cuartos/{n}/refrigeracion/cmd` — `{ comando: 'forzar_encendido', potencia_pct, ... }`.

Ver el contrato completo en `10_E7_Contrato_MQTT.docx`.

## Checklists manuales

Cada Historia de Usuario tiene su checklist de validacion en `client/docs/tests/`:

- `hu-13.md` — login, AuthContext, ProtectedRoute, JWT en REST y socket.
- `hu-10.md` — gating por rol, modal de confirmacion, forzar refrigeracion.
- `hu-07.md` — countdown de cierre automatico, toast de cancelacion.

Para el sprint review se ejecutan en orden y se firman.

## Scripts utiles

```bash
# Cliente
cd client
npm run dev       # vite dev
npm run build     # produccion
npm run lint      # eslint

# Bridge
cd server
node index.js     # arranca en :3000
curl http://localhost:3000/health      # health check
curl http://localhost:3000/diag/mqtt   # diagnostico de la conexion MQTT
```
