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
|   |   |-- api/            # httpClient, historial.js, intervenciones.js + mocks/
|   |   |-- components/     # Header, RoomCard, ConfirmDialog, TablaHistorial, LogIntervenciones
|   |   |-- context/        # AuthContext, ToastContext
|   |   |-- hooks/          # useSocket
|   |   |-- pages/          # Login, Home, HistorialPanel
|   |   |-- routes/         # ProtectedRoute
|   |   `-- App.jsx, main.jsx
|   `-- docs/tests/         # Checklists manuales (HU-13, HU-10, HU-07, HU-08, HU-11, HU-12)
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

| Capacidad                                           | Operador | Supervisor |
|-----------------------------------------------------|----------|------------|
| Ver estado de los 5 cuartos                         | si       | si         |
| Ver indicador de potencia y motivo de refrigeracion | si       | si         |
| Recibir alarmas preventiva / critica                | si       | si         |
| Ver countdown de cierre automatico                  | si       | si         |
| Ver toasts de cierre / cancelacion                  | si       | si         |
| Boton **Silenciar Alarma** (critica)                | no       | si         |
| Boton **Forzar Refrigeracion** (>3 C)               | no       | si         |
| Panel **Historial** (temperaturas + CSV)            | si       | si         |
| Log de intervenciones (propias)                     | si       | si         |
| Log de intervenciones (todas)                       | no       | si         |
| Cerrar sesion                                       | si       | si         |

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
- `sei/cuartos/{n}/refrigeracion/estado` — `{ cuarto_id, potencia_pct, motivo, timestamp }` con
  `motivo ∈ {NORMAL, PUERTA_ABIERTA, FORZADO_MANUAL}`.
- `sei/sistema/estado` — snapshot global publicado por el backend al arrancar.

Topicos publicados por el HMI (comandos):

- `sei/cuartos/{n}/alarma/cmd` — `{ comando: 'silenciar', operador_id, rol, jwt_token }`.
- `sei/cuartos/{n}/puerta/cmd` — `{ comando: 'forzar_cierre', ... }`.
- `sei/cuartos/{n}/refrigeracion/cmd` — `{ comando: 'forzar_encendido', potencia_pct, ... }`.

Ver el contrato completo en `10_E7_Contrato_MQTT.docx`.

## Detalle de cuarto (HU-14)

La ruta `/cuarto/:id` (1..5) muestra la operacion completa de un cuarto en una sola
pantalla. Se accede al hacer click sobre cualquier tarjeta del panel principal
(o con `Enter` / `Espacio` desde teclado).

Secciones:
- **Hero** — temperatura actual con badge de estado, grafico de evolucion
  con selector 2H / 24H / 7D y lineas punteadas en 3°C (preventivo) y
  4°C (critico). Datos via `GET /api/cuartos/{id}/historial` (mockable).
- **Sensores** — sensor de temperatura, PIR, reed switch de puerta,
  estado señal y ultima lectura.
- **Actuadores** — cortina, puerta automatica, refrigeracion (% y motivo),
  alarma visual y alarma sonora.
- **Alarma activa** — detalles de la alarma cuando hay una preventiva o
  critica activa. Mock devuelve `null` cuando el cuarto esta en estado normal.
- **Panel de acciones** — solo `supervisor`. Forzar refrigeracion (temp>3°C),
  forzar cierre (puerta=abierta) y silenciar alarma (alarma critica). Cada
  accion abre un modal de confirmacion. El operador ve un banner "Solo lectura".
- **Eventos del cuarto** — combinacion de eventos del socket filtrados por
  cuarto + intervenciones manuales (`/api/intervenciones?cuarto_id=N`).
- **Diagnostico MQTT** — solo `supervisor`. Topico, ultima publicacion,
  estado del bridge y limites de alarma.

Checklist en `client/docs/tests/hu-14.md`.

## Panel de auditoria (Sprint 4)

La ruta `/historial` (protegida, ambos roles) centraliza dos pestanas:

### Historial de temperaturas — HU-11
- Selector de cuarto (1–5) y selector de rango (`24h / 7d / 30d`).
- Boton **Consultar** llama a `GET /api/cuartos/{id}/historial?rango=<rango>`.
- Tabla `TablaHistorial` con paginacion cliente (50 filas/pagina).
- Boton **Exportar CSV** visible solo tras consulta exitosa; descarga via blob en el
  navegador sin pasar por el servidor.
- Modo mock activable con `VITE_USE_MOCK_API=true` en `client/.env.local` para
  desarrollo sin backend real.

### Log de intervenciones manuales — HU-12
- Componente `LogIntervenciones` con tabla auditable: Timestamp, Tipo de accion,
  Cuarto, Operador ID, Rol en ejecucion.
- Filtrado de visibilidad por rol: el operador solo ve sus propias intervenciones
  (`operador_id` del JWT); el supervisor ve todas.
- Selector de cuarto opcional (0 = todos los cuartos).
- Mock configurable con `VITE_USE_MOCK_API=true`.

### Indicador de potencia de refrigeracion — HU-08
El bridge enruta `sei/cuartos/{n}/refrigeracion/estado` al evento Socket.IO
`refrigeracion`. `RoomCard` muestra un badge con el porcentaje de potencia y un icono
diferenciado segun `motivo`:
- `NORMAL` — cyan.
- `PUERTA_ABIERTA` — ambar.
- `FORZADO_MANUAL` — rojo.

## Checklists manuales

Cada Historia de Usuario tiene su checklist de validacion en `client/docs/tests/`:

- `hu-13.md` — login, AuthContext, ProtectedRoute, JWT en REST y socket.
- `hu-10.md` — gating por rol, modal de confirmacion, forzar refrigeracion.
- `hu-07.md` — countdown de cierre automatico, toast de cancelacion.
- `hu-08.md` — indicador de potencia con badge diferenciado por motivo (CP-08-A/B/C).
- `hu-11.md` — historial de temperaturas, paginacion y exportacion CSV (CP-11-A/B).
- `hu-12.md` — log de intervenciones con filtrado por rol (CP-12-A al CP-12-E).
- `cp-sys-01.md` — walkthrough E2E del sistema completo para Sprint Review.

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
