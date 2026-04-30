# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/) y
versionado [SemVer](https://semver.org/lang/es/).

## [0.4.0] - 2026-04-29 - Sprint 4

Sprint orientado al panel de auditoria, historial de temperaturas con
exportacion CSV y el indicador de potencia de refrigeracion por cuarto.

### Added (HU-08 Indicador de potencia)
- Enrutamiento del topic `sei/cuartos/{n}/refrigeracion/estado` en el
  bridge (`topicHandler.js`, `socketServer.js` snapshot + updateSnapshot).
- `useSocket` consume `motivo` y `potencia_pct` del evento `refrigeracion`.
- `RoomCard` muestra badge de potencia con color diferenciado por motivo:
  cyan (`NORMAL`), ambar (`PUERTA_ABIERTA`), rojo (`FORZADO_MANUAL`).

### Added (HU-11 Historial de temperatura + CSV)
- `api/historial.js` con `obtenerHistorial` (rangos `24h / 7d / 30d`) y
  `descargarCsvHistorial` (descarga via blob sin pasar por el servidor).
  Mock configurable con `VITE_USE_MOCK_API=true`.
- Componente `TablaHistorial` con paginacion cliente (50 filas/pagina).
- Pagina `HistorialPanel` con selector de cuarto (1–5), selector de rango
  y boton **Exportar CSV** condicional (visible solo tras consulta exitosa).
- Ruta `/historial` protegida y enlace en `Header`.

### Added (HU-12 Log de intervenciones manuales)
- `api/intervenciones.js` con `obtenerIntervenciones`; filtra por
  `operador_id` cuando el rol es `operador`. Mock configurable.
- Componente `LogIntervenciones`: tabla auditable con columnas Timestamp,
  Tipo de accion, Cuarto, Operador ID, Rol en ejecucion; badges de color
  por tipo; selector de cuarto opcional.
- `LogIntervenciones` integrado como pestana del `HistorialPanel`.

### Added (Documentacion)
- `README.md` actualizado con seccion "Panel de auditoria (Sprint 4)",
  descripcion de HU-08, HU-11 y HU-12, topic `refrigeracion/estado` y
  tabla de capacidades por rol ampliada.
- `client/docs/tests/hu-08.md`, `hu-11.md`, `hu-12.md` — checklists
  manuales por HU con CPs de cada historia.
- `client/docs/tests/cp-sys-01.md` actualizado con pasos 9b, 12, 13, 14
  y nuevos criterios de exito para Sprint 4.

## [0.3.0] - 2026-04-27 - Sprint 3

Sprint orientado a autenticacion, roles y la integracion final del
panel con el ciclo de cierre automatico.

### Added (HU-13 Login y roles)
- `AuthContext` con persistencia en `sessionStorage`, decode de claims
  JWT y expiracion proactiva via `setTimeout`.
- Pantalla de login (`pages/Login.jsx`) con manejo de errores
  contextual (401 / red / generico).
- `ProtectedRoute` que envuelve la ruta `/` y redirige a `/login` sin
  sesion.
- `httpClient` (axios) con interceptor que inyecta
  `Authorization: Bearer <token>`.
- Validacion de `jwt_token` y propagacion de `rol` y `operador_id`
  en todos los comandos del bridge (`silenciar_alarma`,
  `forzar_cierre`, `forzar_refrigeracion`).

### Added (HU-09 Panel completo)
- Header con nombre del usuario, badge de rol (cyan operador / ambar
  supervisor) y boton **Salir**.
- Suscripcion a `sei/sistema/estado` para hidratar los 5 cuartos en
  un solo render — elimina la ventana de hasta 30s con pantalla
  vacia al entrar.
- Animacion de pulso para alarmas preventiva (ambar) y critica (rojo
  con halo). Respeta `prefers-reduced-motion`.

### Added (HU-10 Forzar refrigeracion)
- Boton **Forzar Refrigeracion** condicional (solo supervisor con
  temperatura > 3 C).
- `ConfirmDialog` reusable con accesibilidad (aria-modal, focus inicial,
  Esc, click overlay, reduced motion).
- Emisor `forzarRefrigeracion` en `useSocket` y handler en el bridge
  con validacion `rol === 'supervisor'` antes de publicar en
  `sei/cuartos/{n}/refrigeracion/cmd`.
- Boton **Silenciar Alarma** ahora gateado tras `rol === 'supervisor'`.

### Added (HU-07 Cierre automatico)
- Validacion de los 4 estados del topico `puerta` (`abierta`,
  `cerrada`, `cerrando`, `cierre_cancelado`) en el bridge.
- Bloque visual rojo **CIERRE AUTOMATICO** con segundos restantes y
  barra de progreso 0->100% durante el ciclo de 5 s.
- `ToastContext` minimo (sin librerias externas) con auto-dismiss y
  dismiss manual; notifica inicio y cancelacion del cierre.

### Added (Documentacion)
- `README.md` en raiz del repo con arquitectura, setup local, flujo
  de login, tabla de capacidades por rol y indice de tests.
- `client/docs/tests/hu-13.md`, `hu-10.md`, `hu-07.md` con checklists
  manuales por HU.
- `client/docs/tests/cp-sys-01.md` con el walkthrough E2E de los dos
  roles para el Sprint Review.

### Changed
- `App.jsx` ya no renderiza el panel inline; ahora es solo router
  (`/login`, `/` protegida, catch-all). El contenido del dashboard se
  movio a `pages/Home.jsx`.
- `useSocket` consume `useAuth()` y deriva `operadorId` y `rol` del
  JWT en lugar de leerlos de `VITE_OPERADOR_ID`.

### Removed
- Variable de entorno `VITE_OPERADOR_ID` y wrapper
  `silenciarAlarmaConOperador` (ya redundantes con el flujo de auth).

### Security
- Defensa en profundidad de UI: el operador no ve botones de
  acciones criticas. La autoridad final sigue siendo el backend Java
  (T-13-05) que valida la firma del JWT.

## [0.2.0] - Sprint 2

Sprint enfocado en alarmas (HU-04, HU-05) y respuesta a apertura de
puerta (HU-06, HU-08) en la capa HMI.

### Added
- Indicador visual amarillo para alarma preventiva (T-04-05).
- Indicador rojo + boton **Silenciar Alarma** para alarma critica
  con publicacion en `alarma/cmd` (T-05-04).
- Estado de **PUERTA** y **CORTINA** en cada tarjeta (T-06-04).

### Fixed
- Cableado de `onSilenciar` y `onCerrarPuerta` en Dashboard (los
  botones existian pero no estaban conectados).
- Handler `forzar_cierre` en el bridge para publicar en
  `sei/cuartos/{n}/puerta/cmd`.
- Barra de refrigeracion ahora refleja el porcentaje real en lugar
  del 100% hardcodeado.

## [0.1.0] - Sprint 0/1

Estructura inicial del HMI: cliente React + Vite, bridge Node con
Socket.IO y conexion MQTT al broker EMQX.
