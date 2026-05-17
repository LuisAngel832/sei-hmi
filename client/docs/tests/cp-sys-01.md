# CP-SYS-01 — Escenario completo · Walkthrough HMI

Recorrido del **caso de prueba de sistema** del Plan de Pruebas v2.0
filtrado a lo que se verifica desde el HMI. La validacion de
persistencia en BD, SLAs de timing del backend y la firma del JWT
quedan listadas como verificaciones cruzadas a ejecutar por el
equipo de backend.

Actualizado en Sprint 4 para cubrir HU-08 (indicador de potencia),
HU-11 (historial + CSV) y HU-12 (log de intervenciones).

## Precondiciones
- Sistema completo integrado: backend Java arriba, EMQX en
  `192.168.1.100:1883`, simuladores activos en los 5 cuartos.
- Cuartos 1 a 5 con temperatura normal (`< 3 C`).
- Usuarios `jperez/1234` (operador) y `alopez/5678` (supervisor)
  poblados en BD.
- HMI corriendo en `http://localhost:5173/` con `npm run dev`.
- `VITE_USE_MOCK_API` **no** definido (o en `false`) para pruebas
  integradas contra el backend real.

## Paso 1 — Login como operador
1. Abrir `http://localhost:5173/`. Verificar redireccion a `/login`.
2. Ingresar `jperez/1234`. Click **Entrar**.
3. Verificar:
   - Redireccion a `/`.
   - Header muestra **jperez** (o el `nombre` del JWT) con badge **Operador** cyan.
   - 5 tarjetas pintadas con datos en menos de 1s (snapshot inicial).

## Paso 2 — Apertura de puerta cuarto 3
1. Disparar la apertura desde el simulador (CLI o boton fisico).
2. Tarjeta del cuarto 3:
   - **PUERTA**: "Abierta" en ambar.
   - **CORTINA**: "Activa" en ambar (backend la activa en menos de 500 ms).
   - Barra de **REFRIGERACION** sube a 100% (backend en menos de 2 s).
3. Verificar el badge de potencia en la tarjeta del cuarto 3 (HU-08):
   - Muestra el porcentaje de potencia (ej. `100%`).
   - El badge tiene color **ambar** y motivo `PUERTA_ABIERTA`.
4. Log lateral del HMI muestra la entrada "Puerta Cuarto 3: abierta (manual)".

## Paso 3 — Mantener puerta abierta y subir temperatura
1. Dejar la puerta abierta ~2 minutos.
2. Cuando la temperatura llega a 3 C:
   - Tarjeta cambia a **Preventiva** (badge ambar) y empieza a pulsar en ambar.
   - Color del numero de temperatura cambia a ambar.
3. Cuando llega a 4 C:
   - Tarjeta cambia a **Critica** (badge rojo) con halo rojo perceptible.
   - **El boton "Silenciar Alarma" NO aparece** (operador).

## Paso 4 — Validar restriccion de operador
1. Verificar visualmente que en la tarjeta del cuarto 3:
   - **NO** hay boton Silenciar Alarma.
   - **NO** hay boton Forzar Refrigeracion (aunque temperatura > 3 C).
2. Abrir DevTools -> React DevTools -> confirmar `useAuth().user.rol === 'operador'`.

> Cubre CP-AUTH-01 del Plan de Pruebas v2.0.

## Paso 5 — Logout y re-login como supervisor
1. Click en **Salir** del header. Verificar redireccion a `/login`.
2. `sessionStorage.sei.auth.token` debe estar vacio.
3. Ingresar `alopez/5678`. Click **Entrar**.
4. Verificar badge **Supervisor** ambar en el header.

## Paso 6 — Supervisor ve los botones criticos
1. En la tarjeta del cuarto 3 (sigue en estado critico):
   - Ahora aparece **Silenciar Alarma** (rojo).
   - Aparece **Forzar Refrigeracion** (cyan, porque temp > 3 C).

## Paso 7 — Cierre automatico (sin presencia)
1. Apagar la simulacion de presencia del cuarto 3.
2. El backend publica `sei/cuartos/3/puerta` con `estado: 'cerrando'`.
3. En la tarjeta:
   - Aparece bloque rojo **CIERRE AUTOMATICO** con segundos `5s -> 4s -> 3s ...`.
   - **PUERTA** muestra "Cerrando" en rojo.
   - Toast critico bottom-right: "Cierre automatico iniciado en Cuarto 3."

## Paso 8 — Cancelacion por presencia
1. Reiniciar el escenario (puerta abierta otra vez, sin presencia, esperar `cerrando`).
2. **A los 3 segundos** del countdown, activar presencia en el simulador.
3. Backend publica `cierre_cancelado`.
4. En el HMI:
   - Bloque del countdown desaparece de inmediato.
   - **PUERTA** muestra "Cierre cancelado" en verde.
   - Toast preventivo: "Cierre automatico cancelado en Cuarto 3 — presencia detectada."

## Paso 9 — Cierre exitoso (sin presencia)
1. Repetir escenario, mantener presencia desactivada.
2. Tras 5 s completos, backend publica `cerrada`.
3. Tarjeta:
   - Bloque del countdown desaparece.
   - **PUERTA** muestra "Cerrada" en verde.
   - **CORTINA** vuelve a "Inactiva" (cuando el backend la apaga).

## Paso 9b — Verificar indicador de potencia en estado normal (HU-08)
1. Con todos los cuartos en estado normal (temperatura < 3 C, puertas cerradas):
   - Cada tarjeta muestra el badge de potencia con color **cyan** y motivo `NORMAL`.
2. Con un cuarto en refrigeracion forzada (ver Paso 10):
   - El badge muestra color **rojo** y motivo `FORZADO_MANUAL`.

## Paso 10 — Forzar refrigeracion como supervisor
1. Provocar temperatura del cuarto 2 a > 3 C.
2. Click en **Forzar Refrigeracion**.
3. Verificar `ConfirmDialog`:
   - Titulo: "Forzar refrigeracion — Cuarto 2".
   - Mensaje incluye temperatura actual y nota de registro en `intervenciones_manuales`.
4. Click **Forzar al 100%**.
5. EMQX Dashboard (`http://localhost:18083`) debe mostrar publicacion en
   `sei/cuartos/2/refrigeracion/cmd` con:
   - `comando: 'forzar_encendido'`
   - `potencia_pct: 100`
   - `operador_id: <id de alopez>`
   - `rol: 'supervisor'`
   - `jwt_token: <token activo>`
6. Log lateral del HMI: "Comando: forzar_refrigeracion -> Cuarto 2".

## Paso 11 — Silenciar alarma critica como supervisor
1. Click en **Silenciar Alarma** del cuarto 3.
2. EMQX muestra publicacion en `sei/cuartos/3/alarma/cmd` con `comando: 'silenciar'`,
   `operador_id`, `rol: 'supervisor'`, `jwt_token`.
3. Backend confirma con `sei/cuartos/3/alarma { estado: 'normal' }`.
4. Tarjeta vuelve a verde, badge **Normal**, deja de pulsar.

## Paso 12 — Panel de historial de temperaturas (HU-11)
1. Hacer click en **Historial** en el Header (ruta `/historial`).
2. Seleccionar cuarto 3 y rango **24h**. Click **Consultar**.
3. Verificar:
   - La tabla muestra filas con Timestamp y Temperatura de las ultimas 24 h.
   - La paginacion funciona (50 filas/pagina; botones Anterior / Siguiente activos).
4. Click **Exportar CSV**:
   - El navegador descarga un archivo `.csv` sin recarga de pagina.
   - El archivo se puede abrir en Excel y contiene las mismas filas que la tabla.
5. Cambiar a rango **7d**. Verificar que la tabla se actualiza con mas registros.

## Paso 13 — Log de intervenciones como operador (HU-12)
1. Sesion activa de `jperez` (operador).
2. Ir a **Historial** → pestana **Intervenciones**.
3. Verificar:
   - Solo aparecen intervenciones cuyo `operador_id` coincide con el de `jperez`.
   - Hay aviso informativo: "Solo se muestran tus propias intervenciones".
   - Los badges de tipo tienen color correcto: rojo silenciar, cyan forzar_refrig, ambar forzar_puerta.

## Paso 14 — Log de intervenciones como supervisor (HU-12)
1. Hacer logout y re-login con `alopez` (supervisor).
2. Ir a **Historial** → pestana **Intervenciones**.
3. Verificar:
   - Aparecen todas las intervenciones del sistema (sin filtro por operador).
   - No hay aviso de restriccion.
4. Usar el selector de cuarto (ej. Cuarto 3) para filtrar. Verificar que la tabla
   solo muestra filas de ese cuarto.
5. Volver a cuarto 0 (todos). Verificar que se restauran todas las filas.

## Verificaciones cruzadas con backend (fuera del HMI)

Estas verificaciones se delegan al equipo del backend; el HMI solo provee
el trigger:

- [ ] `alarmas.silenciada_por = ID_alopez` y `silenciada_en` poblado.
- [ ] `intervenciones_manuales` tiene fila con `tipo_accion='forzar_refrigeracion'`,
      `rol_en_ejecucion='supervisor'`, `operador_id=ID_alopez`.
- [ ] `eventos_puerta` registra `accion='cierre_automatico'` y
      `accion='cierre_cancelado_por_presencia'` con timestamps consistentes.
- [ ] `GET /api/cuartos/3/historial?rango=24h` retorna el JSON que el CSV del
      Paso 12 debe reflejar fielmente.
- [ ] Los registros de historial de temperatura del cuarto 3 muestran la curva
      ascendente capturada en el paso 3.

## Criterio de exito (HMI)

- [ ] Login funciono con ambos usuarios y los badges de rol fueron correctos.
- [ ] El operador NO vio botones de silenciar ni forzar.
- [ ] El supervisor SI vio ambos botones cuando las condiciones lo permitieron.
- [ ] El countdown de cierre automatico aparecio puntualmente y se cancelo
      ante presencia.
- [ ] Los toasts de cierre / cancelacion fueron claros y se autodescartaron.
- [ ] El badge de potencia reflejo el motivo correcto (`NORMAL` / `PUERTA_ABIERTA` /
      `FORZADO_MANUAL`) con el color esperado en cada transicion.
- [ ] El historial de cuarto 3 cargo en menos de 3 s con datos del backend real.
- [ ] El CSV descargado contiene las mismas filas que la tabla paginada.
- [ ] El operador solo vio sus propias intervenciones; el supervisor vio todas.
- [ ] No hubo errores no controlados en la consola durante el ciclo completo.

**Estado:** [ ] Pass  [ ] Fail  Fecha: ___  Firmas: ___
