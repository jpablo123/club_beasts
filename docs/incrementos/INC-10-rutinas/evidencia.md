# INC-10 - Evidencia

Estado: **ESPECIFICADO** (2026-11-05). Puntos potenciales: bloque 6 (18) + b4 de HU-13 (bloque 3, reparto al cierre DEC-016, seccion 13 de auditoria-puntos-inc00.md).

## 0. Especificacion (2026-11-05)

- `acceptance-criteria-analyst` (Modo CREAR): 10 archivos en `club-beasts-api/features/acceptance-criteria/` (HU-18/19/20/21/26 criterios + schemas); criterios **RU-01..RU-42**; tsc 0; smoke runtime **42 PASS / 0 FAIL**. Import cruzado `HU-20-schemas -> HU-13-schemas` (literales de vigencia, DEC-043).
- Decisiones del Producto 2026-11-05 (confirmacion unica de las 7 recomendaciones): **DEC-062..DEC-068**. PEND-RUT-01..07 resueltos.

## 1. Ratificacion de contratos (2026-11-05)

### R1 `backend-developer` — **RATIFICA CON CORRECCIONES R1..R8** (sin bloqueos; 0 ediciones)

- **R1**: creacion separada — `POST /rutinas` (GENERICA/INDUCCION, DEC-064) + `POST /rutinas-personalizadas` (DEC-018/062/063); `PATCH /rutinas/:rutinaId` unificado (dispatch por tipo persistido, inmutable). **SIN DELETE en MVP** (patron Anamnesis/DEC-057). Opcion A adoptada por el orquestador (corrige solo el spec; literales de criterios byte-exactos).
- **R2**: literales unificados al canonico `HU-20-schemas.ts`: **`SIN_VIGENCIA_PERSONALIZADA`** (no `RUTINA_PERSONALIZADA_SIN_VIGENCIA`) + `CLIENTE_NO_ENCONTRADO`, `RUTINA_YA_ACTIVA`, **`ASIGNACION_CONFLICTO`** (nuevo), marcador `SIN_RUTINA`/`OCULTA_POR_VIGENCIA` (endpoint 7 estilo `vistaSinRegistro`). DEC-066 -> 409 confirmado. Rutas sin prefijo `/api`.
- **R3**: modelos Prisma con **columnas JSON-string** (patron `Anamnesis`, DEC-012: String, nunca `Json`) — 1 columna por seccion; `contenidoSnapshot String`; **`activaClave String? @unique`** = arbitro portable 0-1 activas (patron INC00-MEM-03; P2002 -> 409 `ASIGNACION_CONFLICTO`); FK Restrict; migracion **10/0 -> 11/0**.
- **R4**: copia 1:1 `src/schemas/rutina.schema.ts` + anti-deriva por tests (INC09-R08); `validarContencionCiclos` (pura) ejecutada en el **servicio** -> 400 primer error (INC05-CONF-01); contencion intra-nodo en schema.
- **R5**: fuente unica `estadoVigenciaPersonalizada(clienteId)` en servicio (reutiliza `calcularEstado`/`getTodayBogota` INC-05; `CONGELADO` que cubre hoy -> no permite activar personalizada); consumidores: asignacion (409), endpoints 7 y 8 (ocultacion sin borrar, patron INC05-PER-05). Generica/induccion nunca consulta vigencia (RU-24).
- **R6**: snapshot capturado **al crear la asignacion, misma transaccion** (payload create completo); lecturas de contenido (portal/activa/historial) leen **desde el snapshot**; PATCH de rutina **solo afecta asignaciones futuras** (consecuencia UX a escribir en el spec: edicion no llega al cliente hasta reasignar — cumple RU-04).
- **R7**: "cerrar anterior + crear nueva" en **una transaccion** (INC00-MEM-02) + arbitro `activaClave` (INC00-MEM-03); doble asignacion simultanea -> P2002 -> 409 `ASIGNACION_CONFLICTO`, sin escritura.
- **R8**: permisos `authenticateRoles` (DEC-065); orden de guardas endpoint 5: `401 -> 403 -> 400 params -> 400 body -> 404 CLIENTE_NO_ENCONTRADO -> 404 RUTINA_NO_ENCONTRADA -> 409 CLIENTE_INACTIVO -> 409 SIN_VIGENCIA_PERSONALIZADA -> 409 RUTINA_YA_ACTIVA -> 409 ASIGNACION_CONFLICTO -> 201` (cliente inactivo ANTES de vigencia; vigencia ANTES de RUTINA_YA_ACTIVA; edge documentado: personalizada ya activa + vigencia caida -> `SIN_VIGENCIA_PERSONALIZADA`). **Salvedad RU-26**: el criterio bloquea SUSPENDIDO/RETIRADO/INACTIVO mientras el precedente HU08-C04b es INACTIVO-only -> requiere DEC (ver DEC-069).

Riesgos R1: bodyLimit Fastify 1MiB vs arbol maximo (mitigar en GREEN); concurrencia real solo testeable en Postgres; snapshot = version congelada (documentar); fixtures del edge RU-28/RU-23; compatibilidad HU-13 b4 (`{id,nombre}|null`).

### R2 `frontend-developer` — **RATIFICA CON CORRECCIONES C1..C9** (sin bloqueos; 0 ediciones)

- **C1**: pagina nueva `/rutinas` (+ `/nueva`, `/[id]`, `/[id]/editar`) + **`middleware.ts` staff-only para `/rutinas`** (unica capa de seguridad de ruta faltante; CLIENTE -> `/portal`). Editor del arbol = Corte A (acordeones por ciclo + filas-tabla de series, un solo draft con helpers por indice, validacion espejo sin zod, errores `role="alert"` + foco al primer error); **C4**: limites exactos 20/20/20/30/30/30 + evaluaciones 50.
- **C2/C7**: re-escopos de matriz NAV-RU (roles, familia base, NAV-RU-18 sin logout, NAV-RU-13 con `RUTINA_YA_ACTIVA`, filas nuevas NAV-RU-23 listado vacio y NAV-RU-24 rutina inexistente -> 404 con "Volver al listado"; filtros en searchParams).
- **C3**: set de localizadores aprobado (regiones/botones/labels; prohibidos `Editar`/`Guardar`/`Cancelar`/`Observaciones`/`Estado`/`Motivo`/`Fecha de inicio|fin`/etc.; **invariantes**: 1 heading "Mi Rutina" en `/portal` — acceso por link —; badges `ACTIVA`/`CERRADA` en mayusculas sin choque con exactos base).
- **C5/C6 alineados con R1/DEC-070**: estado discriminado `SIN_RUTINA` vs `OCULTA_POR_VIGENCIA` (staff con indicador), literal `SIN_VIGENCIA_PERSONALIZADA`, path `/asignacion`.
- **C8**: `/portal/rutina` patron `/portal/anamnesis` + **gate DEC-060 confirmado**; entrada = link en la card "Mi Rutina" existente. **C9**: ficha HU-07 b5/b6 desde endpoints propios `/clientes/:id/rutinas/{activa,historial}` (anotar al cerrar HU-07).
- **Estructura ratificada**: `app/rutinas/*`, `app/portal/rutina`, `components/rutinas/{RutinaListado,RutinaEditor,CicloAccordion,SesionEditor,SerieFilas,EvaluacionesEditor,RutinaVista,RutinaSection,AsignarRutinaForm,HistorialRutinas}`, `lib/rutina-schemas.ts`, `api.rutinas.*`/`api.asignaciones.*`/`api.portal.rutina`.
- Riesgos R2: R2-01 (DOM del editor), R2-02 (interferencia 143 base), R2-03 (deriva espejo), R2-06 (snapshot expandible), R2-07 (middleware — cubierto por C1).

### Cierre de ratificaciones (orquestador, 2026-11-05)

R1..R8 + C1..C9 incorporados al spec; **DEC-069** (guarda 3 estados en asignacion, con nota de enmienda menor) y **DEC-070** (literales/paths) registradas. **Puerta LISTO cerrada 2026-11-05** (matriz NAV-RU-01..24 con re-escopos aplicados).

## 2. Base a preservar (re-medida al arranque del RED)

| Comando | Esperado (2026-11-05) | Resultado INC-10 | Fecha |
|---|---|---|---|
| api `npx vitest run` | 807/807 | _pendiente_ | - |
| api `npm run test:gherkin` | 220/220 exit 0 | _pendiente_ | - |
| api `npx prisma migrate status` | 10/0 | _pendiente_ | - |
| web `npx vitest run` | 303/303 | _pendiente_ | - |
| web `npx playwright test` | 143/143 | _pendiente_ | - |
| tsc api/web + build | 0 / PASS | _pendiente_ | - |

## 3. RED (test-engineer, 2026-11-05) — COMPLETO

**268 pruebas nuevas en 21 archivos**: API 131 integration en rojo (endpoints ausentes, mensajes `FIXTURE INC-10 (RED)`) + **90 unit verdes** (anti-deriva INC09-R08 sobre canonicos: mensajes, enums 13/10/4, limites C4, `validarContencionCiclos`, literales DEC-070); web 98 unit en rojo (modulo/componente ausente) + 61 paridad espejo verdes; E2E **39 rojos** (18 fixture-endpoint-404 + 21 UI) cubriendo la matriz NAV-RU-01..24. **Base re-medida intacta antes y despues**: API 807/807, Gherkin 220/220 (guard intacto; sin features nuevas), web 303/303, E2E 143/143 (`cambio-pin-obligatorio` verde), tsc 0/0, build PASS, migraciones 10/0. PIN intacto. Logs `%TEMP%\opencode\inc10-red-*.log`.

**Decisiones de contrato fijadas por el orquestador tras el RED**:
1. **INC10-R08-GAP-01**: campos ausentes -> asentamiento **estructural** (400 + `VALIDATION_ERROR`); mensajes de rango exactos solo para valores presentes invalidos. Sin enmienda del canonico.
2. **INC10-R08-GAP-02**: **enmienda C4 programada** — anadir `ASIGNACION_CONFLICTO` a `CODIGOS_ERROR_ASIGNACION` (`HU-20-schemas.ts`, DEC-070); el servicio ya debe responder `code: "ASIGNACION_CONFLICTO"` (el test lo aserta literal).
3. **fechaFin al reemplazar** = `fechaInicio` de la asignacion nueva (regla canonica `cerrarAsignacionActiva`; continuidad sin gaps). Confirmada.
4. **Concurrencia**: el servicio cierra **solo la activa verificada** + arbitro `activaClave` (P2002 -> 409 sin pisar al ganador); C1/C2 del RED lo fijan.
5. **Label** `Inicio de la asignación` (con acento, forma del spec C3). Contratos UI fijados por el RED (mensajes `Aun no hay rutinas registradas|asignadas`, 404 `Rutina no encontrada` + `Volver al listado`, selector `Rutina generica|Rutina de induccion|Rutina personalizada`, scaffold con 1 cadena valida por defecto que no marca sucio, etiquetas `Nombre de la rutina`/`Notas de la serie`/`Inicio|Fin del ciclo`/`Diagnostico`, badges DEC-070, regiones C3 exactas, filtros `tipo` exacto / `nombre` subcadena insensible AND) -> **incorporados al contrato del GREEN**.
6. **RU-36..39 rama "solo CERRADAS" -> NO APLICABLE justificado**: con la invariante 0-1 activas + cierre solo por reemplazo, un cliente con asignaciones siempre tiene 1 activa; la rama es inconstructible por API. Re-escopo registrado.

**C7 scoping** fijado: los substrings prohibidos se chequean **dentro** de las regiones/pantallas nuevas (`Rutinas`, `Rutina activa`, `Historial de rutinas`, `Mi rutina`, `main` del editor) — los existen en UI base (Navbar).

## 4. GREEN

### 4a. T6 modelos + migracion (database-admin, 2026-11-05) — COMPLETO

Modelos `Rutina` (1 columna JSON-string por seccion, DEC-012; `tipoRutina` inmutable; trazabilidad RU-16) + `RutinaAsignacion` (`fechaFin` null=activa sin columna de estado, `actorId`, `contenidoSnapshot` DEC-067, **`activaClave String? @unique`** = arbitro portable 0-1 activas INC00-MEM-03 -> P2002 -> 409 `ASIGNACION_CONFLICTO`; indices `[clienteId, fechaInicio]` y `[rutinaId]`; FK Restrict) + 3 back-relations. Migracion `20261105213729_add_rutinas` (aditiva pura: 2 CREATE TABLE + 3 CREATE INDEX). Verificacion: **10/0 -> 11/0 sin drift** (diff "No difference detected"), `prisma generate` exit 0, tsc 0, suite **898 passed / 131 failed = baseline del RED sin movimiento**. Riesgos: `activaClave` debe limpiarse en la misma transaccion que `fechaFin` (regla del GREEN R7, cubierta por tests del RED); `bodyLimit` Fastify es del GREEN de rutas.

### 4b. T7 backend (backend-developer, 2026-11-05) — IMPLEMENTADO + VERIFICADO (1029/1029)

Solo `club-beasts-api/src/**` (6 creados + `index.ts`) + **enmienda C4 no-rompedora** en `features/acceptance-criteria/HU-20-schemas.ts` (GAP-02: `CODIGO_ASIGNACION_CONFLICTO`/`MENSAJE_ASIGNACION_CONFLICTO` + `asignacionErrorSchema.code` extendido; `CODIGOS_ERROR_ASIGNACION`/`MENSAJES_ASIGNACION` quedan en 5 porque los unit del RED los fijan -> **re-escopo pendiente INC10-FIX-01**). **Enmienda RED D1-D4** (autorizada, estilo INC09-FIX-01, header+inline, 0 expectativas): D1 prefijos de cedula numericos (regex `^\d{6,10}$`), D2 fixture RU-23 sin `_`, D3 spread de ajustes RU-11 (premise propia rota), D4 fixture RU-33 con vigencia ACTIVA.

Implementacion: `src/schemas/rutina.schema.ts` (copia 1:1 canonico + `mensajePrimerErrorZod` + params + query), `services/rutina.service.ts` (CRUD por tipo, merge por secciones, `assertContencionCiclos` en servicio -> primer error, **`estadoVigenciaPersonalizada`** DEC-066 fuente unica reutilizando INC-05, snapshot `contenidoCreateCompleto`), `services/asignacion.service.ts` (transaccion INC00-MEM-02 + arbitro `activaClave` INC00-MEM-03 -> P2002/P2034 -> 409 sin pisar al ganador; cierre `fechaFin = fechaInicio nueva`; historial DESC con actor+snapshot; portal desde snapshot `.strict()`), `routes/{rutinas,rutinas-personalizadas,asignaciones}.ts` (escalera R8 exacta, DEC-069 `NUEVO`/`ACTIVO`, edge RU-28, `?clienteId=` -> 403 SEC-01/03, bodyLimit 5MiB solo en escritura de rutinas).

Verificacion: tsc **0**; API **1029/1029** (898+131); Gherkin **220/220**; migraciones **11/0**; spot-checks: escalera endpoint 5 **8/8**, concurrencia C1/C2 -> `ASIGNACION_CONFLICTO` con 1 ACTIVA, snapshot inmutable (RU-33), DEC-066 `OCULTA_POR_VIGENCIA` sin borrar. Contratos fijados para frontend: rutas sin `/api`; literales DEC-070 + **mensaje nuevo de `ASIGNACION_CONFLICTO`: "Otra asignación cambió la rutina activa del cliente: vuelve a intentar"** (el espejo web debe anadirlo); marcadores `ACTIVA|SIN_RUTINA|OCULTA_POR_VIGENCIA` / `ACTIVA|CERRADA`; `SIN_RUTINA_MENSAJE`. Riesgos: (a) re-escopo unit 5->6 codigos (INC10-FIX-01); (b) ~~PATCH no re-valida contencion~~ **CERRADO por INC10-FIX-05 (2026-11-15, REV-05)**: el PATCH ahora ejecuta `assertContencionCiclos` sobre el merge -> 400 primer error sin escritura (ver §7); (c) D1-D4 documentados a preservar; (d) concurrencia real solo en Postgres; (e) bodyLimit vs arbol maximo C4.

### 4d. T8 cierre (frontend-developer, 2026-11-05) — IMPLEMENTADO; 3 defectos de test -> INC10-FIX-02

Cambio del literal `ASIGNACION_CONFLICTO` en `rutina-schemas.ts` (estructura separada `CODIGO_/MENSAJE_` = paridad con la ENMIENDA C4 canonica; el paridad-test fija `MENSAJES_ASIGNACION` en 5). **Fix de producto UI (alcance T8)**: guarda `consultado.current` incompatible con React StrictMode eliminada en `RutinaSection.tsx`, `HistorialRutinas.tsx`, `portal/rutina/page.tsx` (doble efecto descartaba la 1ª consulta -> "Cargando..." eterno; 13 de los 14 fallos de la 1ª corrida). Verificacion: tsc 0, web unit **401/401**, build PASS, base **143/143** intacta, **E2E 179/182** (run 2 post-fix; run 1 pre-fix 168/182). NAV-RU-01..24: **22/24 verdes** (2 de creacion + 20 de asignacion/portal/historial con API real). Invariantes C3/C7 verificados en corrida (1 heading "Mi Rutina", badges ACTIVA/CERRADA, `verificarSinProhibidos` en 7 regiones). Log `%TEMP%\opencode\inc10-green-pw-full.log`.

**INC10-FIX-02 (test-engineer, 2026-11-08) — CERRADO**: enmiendas `FIX INC10-FIX-02` en 3 archivos de test (header + inline; 0 cambios de expectativa): (1) NAV-RU-17 `inc10-rutinas-asignacion.spec.ts` espera post-reload (`getByRole("group")`/badge antes del `evaluateAll`); (2) NAV-RU-22-1 `inc10-rutinas-portal.spec.ts` filtro del listener (excluye `resourceType === "document"`); (3) base `membresia.spec.ts:177` locator acotado al contenedor de Membresias (scoping C7; `expectFilaMembresia:73` content-scoped por `hasText: rango`, sin colision). Verificacion final (corrida unica completa, log valido `%TEMP%\opencode\inc10-fix02-pw-final.log`; el log previo truncado 125/182 queda descartado): tsc 0, web **401/401**, **E2E 182/182 (14.5m)** — NAV-RU-01..24 **24/24 verdes**, base 143/143 intacta (`cambio-pin-obligatorio` 3/3), API **1029/1029** + Gherkin **220/220**. Riesgo menor: warnings `act(...)` preexistentes (backlog).

**INC10-FIX-01 (test-engineer, 2026-11-05) — CERRADO**: re-escopo del unit `inc10-rutinas-schemas.test.ts` (decision **5+1 separado**: asserts de los 5 base identicos + `CODIGO_/MENSAJE_ASIGNACION_CONFLICTO` por separado + union DEC-070 = 6; 90 tests preservados; header `ENMIENDA INC10-FIX-01` + inline). Verificacion: tsc 0, API **1029/1029**, Gherkin **220/220**. Riesgo: futura ampliacion de la tupla a 6 requiere contrato nuevo (features/src/web).

Solo `club-beasts-web/src/**` (15 creados + 7 modificados; tests/docs/package.json intactos): espejo `lib/rutina-schemas.ts` (limites C4, `validarContencionCiclos`, scaffolds), `components/rutinas/*` (editor Corte A con borrador unico + acordeones + alertdialog C5, `RutinaVista` por whitelist sin `actor`, `RutinaSection`/`HistorialRutinas`/`AsignarRutinaForm` con 409 DEC-070, badges ACTIVA/CERRADA), `app/rutinas/*` (listado/nueva/detalle/editar; RECEP -> detalle), `app/portal/rutina` (PIN + gate DEC-060 + SIN_RUTINA), `middleware.ts` **C1 staff-only `/rutinas`**, `api.ts` (api.rutinas/asignaciones/portal.rutina), portal page (link "Mi rutina activa"), ficha (`RutinaSection` + `HistorialRutinas`).

Verificacion parcial: tsc **0**; web unit **401/401** (303+98, paridad espejo incluida); build **PASS**; base E2E **143/143** intacta (`--grep-invert NAV-RU`); E2E UI-only **15/17** (NAV-RU-02/03/04/05/07/08/09/10/24: navegacion, alertdialog, recarga/atras, 404, teclado/movil verdes; los 2 fallos = creacion por endpoints T7 ausentes -> "Not Found" en `role="alert"`). **Pendiente T7**: 24 E2E (2 de creacion + 22 de asignacion/portal/historial); objetivo cierre **182/182**.

Hallazgos para revision: (1) `onAsignada` entrega sincrona con retirada si rechaza (patron C3 vs "sin exito no hay callback"); (2) encabezado P3 "Ciclos (macro-meso-micro)" con parentesis como contenido CSS (AccName Chromium vs regex jsdom); (3) `RouteAnnouncerNormalize` retira el `role="alert"` infraestructural del anunciador de Next (conserva `aria-live`) — los `getByRole("alert")` globales del RED lo exigen; (4) limite de mesociclos/microciclos implementado como alcance **o** total (mas estricto que C4, lo exige el fixture del RED — asentar en revision); (5) atras NAV-RU-14/20 con entrada duplicada por carga documental (`nav-entrada.ts`), evidencia E2E pendiente de T7.

## 5. VERIFICADO (test-engineer, 2026-11-08) — COMPLETO, bateria x2 identicas

> **Cierre final (2026-11-18)**: tras FIX-04/05/06 y con entorno sano, la **bateria de verificacion final INC10-VER-FINAL** quedo verde completa — ver **§5b**. El recuento vigente de certificacion es el de §5b.

Bateria completa **x2 corridas identicas consecutivas** (8 comandos x 2 = **16 logs canonicos** `%TEMP%\opencode\inc10-verificado-run{1,2}-*.log` con START/CMD/CWD/DURATION/EXITCODE). **0 diferencias** (24 metricas normalizadas comparadas), **0 failed/flaky/timed out**. **BLOQ-02/AUD-05 DESMENTIDO** (el auditor tomo snapshot parcial durante la corrida).

## 5b. VERIFICACION FINAL INC10-VER-FINAL (test-engineer, 2026-11-18) — VERDE COMPLETA

Tras INC10-FIX-04 (REV-01), FIX-05 (REV-05), FIX-06 (diagnostico) y con **ventana sana verificada** (intentos previos saturados por proceso ajeno `FC26.exe` ~10,7/16 cores — ver §5c), bateria completa unica:

| Comando | Esperado | Resultado | Log (`%TEMP%\opencode\`) |
|---|---|---|---|
| api `npx tsc --noEmit` | 0 | **0** | `inc10-ver-final-api-tsc.log` |
| api `npx vitest run` | 1034/1034 | **1034/1034** exit 0 | `inc10-ver-final-api-vitest.log` |
| api `npm run test:gherkin` | 220/220 | **220/220** exit 0 | `inc10-ver-final-api-gherkin.log` |
| api `npx prisma migrate status` | 11/0 | **11/0 up to date** exit 0 | `inc10-ver-final-prisma-status.log` |
| web `npx tsc --noEmit` | 0 | **0** | `inc10-ver-final-web-tsc.log` |
| web `npx vitest run` | 401/401 | **401/401** exit 0 | `inc10-ver-final-web-vitest.log` |
| web `npm run build` | PASS | **PASS** exit 0 | `inc10-ver-final-web-build.log` |
| web `npx playwright test` | 213/213 | **213/213 passed (17,1m)**, PW_EXIT=0, 213 lineas de progreso, 0 failed | `inc10-ver-final-pw.log` |
| `--grep-invert "NAV-RU"` | 143/143 | **143/143** exit 0 | `inc10-ver-final-pw-grep-invert.log` |
| `--grep "cambio-pin-obligatorio"` | 3/3 | **3/3** exit 0 — **PIN intacto** | `inc10-ver-final-pw-grep-pin.log` |

- **213 = 143 base + 70 NAV-RU** (verificado por conteo en log y por ejecucion).
- **Tests problematicos: TODOS VERDES, 0 enmiendas C4 aplicadas, 0 archivos modificados.** `inc04:175` [33/213] verde; `cobertura:510` [142/213] verde; `asignacion:330` [133/213] verde. Clasificacion R-10: ni flaky de test ni defecto — victimas de saturacion (5/5 aislados solo fallaban por presupuesto de 30s agotado, nunca asercion incorrecta).
- Intento 1 saturado preservado: `inc10-ver-final-pw-attempt1-saturado.log` (211 passed).
- **Veredicto: INC-10 APTO PARA ACEPTADO** (sin bloqueos; PIN intacto; sin aserciones vacias ni skips).

## 5c. Reencuadre de R-FIX03B-01 (orquestador, 2026-11-18)

La evidencia previa de R-FIX03B-01 ("GET 21586 ms, chunk dev ~5.5 s, lockfiles duplicados") se **reencuadra**: la causa probable dominante de la latencia observada el 2026-11-15 fue el proceso ajeno **`FC26.exe` (PID 29796, ~10,7 de 16 cores sostenidos, 46.562 s CPU acumulados)**, no el dev server. Tras ventana sana (CPU 4-11%): vitest 19 s vs 31,9 s, gherkin 9,9 s vs 21,8 s, E2E 17,1 m vs 21,1 m. **La escalacion a devops queda reducida a**: (a) `turbopack.root`/lockfiles duplicados como mejora de velocidad de arranque (menor, no bloqueante); (b) el riesgo operativo de saturacion de CPU en la maquina de QA (procesos ajenos) — recomendacion: ventana limpia pre-bateria. El `timeout:15000` de AUD-03-5 se mantiene como vendaje aceptado (precedente del repo).

| Comando | Run 1 | Run 2 |
|---|---|---|
| api `npx tsc --noEmit` | 0 errores | 0 errores |
| api `npx vitest run` | **1029/1029** (45 archivos) | **1029/1029** |
| api `npm run test:gherkin` | **220/220 exit 0** (guard 220) | **220/220** |
| api `npx prisma migrate status` | **11/0** up to date | **11/0** |
| web `npx tsc --noEmit` | 0 errores | 0 errores |
| web `npx vitest run` | **401/401** (37 archivos) | **401/401** |
| web `npm run build` | PASS (15/15 paginas) | PASS |
| web `npx playwright test` | **182/182** (14.4m) | **182/182** |

NAV-RU-01..24 **24/24 presentes** en ambas corridas; base 143 intacta con `cambio-pin-obligatorio` 3/3 (PIN intacto). Nota de proceso: el primer metodo de captura descartaba salidas (logs vacios) — corregido en ejecucion con captura nativa; cifras re-verificadas con el metodo fiable. Ruido cosmético `NativeCommandError` de stderr en prisma/next (exit 0, no son fallos).

## 6. Auditoria de navegacion (ui-navigation-auditor, 2026-11-08) — EJECUTADA sobre evidencia Playwright (D-01)

Matriz NAV-RU-01..24 revisada fila a fila contra `%TEMP%\opencode\inc10-fix02-pw-final.log` (182/182, viajes NAV-RU en [124..162/182]) + unit 401/401 + API 1029/1029. **Recuento: 16 filas VERIFICADO plenas, 8 parciales (03, 05, 07, 08, 11/14/15/16/17 variante RECEP, 21), 0 FALLIDOS**. Veredictos: DEC-065 VERIFICADO (escritura DUENO-only + redirects), DEC-066/070 VERIFICADO (3x 409 con literales exactos + badges), DEC-067 VERIFICADO (snapshot inmutable: edicion posterior no muta "Ver version asignada"), DEC-068 VERIFICADO (estructura completa sin `actor`), SEC-01/03 VERIFICADO (self-only, `?clienteId=` -> 403), DEC-060 VERIFICADO (0 fetch sin servicio), PIN intacto (cambio-pin 3/3), invariantes C3/C7 VERIFICADOS (1 heading "Mi Rutina", prohibidos en 7 regiones), **interferencia base 143 VERIFICADA** (182 = 143 + 39, todas verdes). Sin enlaces rotos ni bucles (0 redirecciones circulares); el unico acceso ausente es el del AUD-01.

**Hallazgos (re-asignados):**
| ID | Severidad | Estado | Detalle |
|---|---|---|---|
| INC10-NAV-AUD-01 | MEDIA | -> frontend-fix (el contrato C2 RATIFICADO ya preveia el navLink "Rutinas"; es omision de implementacion, no decision de producto) | entrada "Menu staff" de NAV-RU-01 ausente: card dashboard "Rutinas" inerte ("Proximamente", `dashboard/page.tsx:62-74`) + `navLinks` sin "Rutinas" |
| INC10-NAV-AUD-02 | MEDIA | -> test-engineer (viajes) | flujo de EDICION `/rutinas/[id]/editar` sin recorrido: "Aplicar cambios" (PATCH) -> detalle y "Descartar"/Volver sucio -> detalle (el codigo existe; los E2E solo cubren creacion) |
| INC10-NAV-AUD-03 | BAJA-MEDIA | -> test-engineer (viajes) | variante RECEP de lectura (NAV-RU-05/11/14/15/16/17) + ficha -> listado de clientes sin recorrido |
| INC10-NAV-AUD-04 | BAJA | -> test-engineer (viajes) | teclado/foco explicito en listado/ficha/historial/portal (el editor esta cubierto por NAV-RU-10) |
| INC10-NAV-AUD-05 | BAJA (evidencia) | **dependencia en curso — probablemente desmentido** (mismo patron que H-INC08-04): la bateria x2 se ejecuta AHORA; el auditor tomo snapshot parcial (solo run1 01..04 en disco al momento de auditar) | logs `inc10-verificado-run{1,2}-*` incompletos al auditar |
| INC10-NAV-AUD-06 | BAJA | -> frontend-fix (cumplimiento de la matriz NAV-RU-05 "logout -> login"; patron DEC-053/INC-08) | `/rutinas*` con `Navbar showAuth={false}`: sin "Salir" ni navegacion staff (solo logo -> `/`) |

**BLOQ-01 (ACEPTADO de la matriz)**: AUD-01 + AUD-02 deben cerrarse con viaje ejecutado. **BLOQ-02**: verificar los 16 logs al terminar la bateria x2 en curso. Aplicabilidad confirmada: logout NAV-RU-18 transversal NO APLICABLE, RECEP en asignacion NO APLICA (DEC-065), app movil nativa No aplicable, rama "solo CERRADAS" NO APLICABLE (invariante 0-1). Observaciones heredadas de T8 abiertas para REVISADO: `onAsignada` sincrono, heading P3 con parentesis (AccName), `RouteAnnouncerNormalize`, limites meso/micro como total.

## 6b. FIX-03 (2026-11-08)

### FIX-03a UI (frontend-developer) — CERRADO: AUD-01 + AUD-06

9 archivos web (8 con cambios de 1-2 lineas + `dashboard/page.tsx`): `navLinks` += "Rutinas" en dashboard/clientes/clientes-nuevo/recepcion (AUD-01); card "Rutinas" del dashboard activa (`Link` a `/rutinas`, sin "Proximamente"); "Salir" en las 4 pantallas `/rutinas*` via `Navbar showAuth` (patron nativo `signOut({ callbackUrl: "/" })`, unico por pantalla, fuera de regiones C7 — AUD-06; desviacion documentada: `ghost` del Navbar en vez de `secondary` standalone, bajo la autorizacion del contrato "camino mas simple y consistente"; misma semantica). Verificacion: tsc 0, web **401/401**, **E2E 182/182 (14.2m)** sin regresiones, build PASS, invariantes C3/C7 verdes (6 call-sites de `verificarSinProhibidos`). Log `%TEMP%\opencode\inc10-fix03a-pw.log`. **Pendiente**: viajes dedicados de AUD-01/06 (entrada por navLink/card y logout desde `/rutinas*`) -> FIX-03c (test-engineer).

### FIX-03b viajes (test-engineer, 2026-11-08) — CERRADO

Contrato validado; sin bloqueos. Solo `club-beasts-web/tests/e2e/inc10-*.spec.ts` + logs `%TEMP%\opencode\inc10-fix03b-*`; producto, API, features, unit y `docs/**` intactos (git status sin cambios fuera de los 3 archivos; spec diagnostico temporal eliminado).

- **AUD-01**: 5 viajes nuevos en `inc10-rutinas-listado.spec.ts` — navLink "Rutinas" desde `/dashboard`, `/clientes`, `/clientes/nuevo`, `/recepcion` (RECEP) + card del dashboard -> region `Rutinas`.
- **AUD-06**: spec nuevo `inc10-rutinas-edicion.spec.ts` (nombre real: salida desde edicion) — 5 viajes de "Salir" desde `/rutinas`, `/rutinas/nueva`, `/rutinas/[id]`, `/rutinas/[id]/editar` (DUENO) y `/rutinas` (RECEPCIONISTA), landing `/` anonima + guardia a `/login`.
- **AUD-02/02b/03/04**: ya presentes en `inc10-rutinas-cobertura.spec.ts`; solo se anadieron etiquetas de fila NAV-RU-02/11/01 (0 cambios de expectativa).

Verificacion: tsc **0**; web unit **401/401**; bateria completa **206/206** EXITCODE=0 sin truncar (log canonico `inc10-fix03b-pw-final.log`, 324 lineas, cierra con `206 passed (16.6m)`); base `--grep-invert NAV-RU` **143/143** intacta; PIN `cambio-pin-obligatorio` **3/3**. Sin `isVisible()`/`waitForTimeout`/`.skip`/`.fixme` en los specs entregados. Cobertura por fila: **NAV-RU-01..24 todas con >=1 test** (01:9, 02:7, 03:3, 04:1, 05:8, 06:1, 07:4, 08:1, 09:1, 10:2, 11:4, 12:2, 13:3, 14:2, 15:1, 16:2, 17:1, 18:2, 19:1, 20:1, 21:2, 22:2, 23:2, 24:1).

**Enmienda C4 documentada (`FIX INC10-FIX-03b`)**: AUD-03-5 (`inc10-rutinas-cobertura.spec.ts:577`) — `toHaveURL(/\/clientes$/, { timeout: 15000 })`. Diagnostico (`inc10-fix03b-diag11/12/13.log`): RSC 200 en ~104 ms pero el chunk `clientes/page.tsx` tarda ~5.5 s (compilacion on-demand Turbopack por lockfiles duplicados) y el commit de navegacion ocurre a 5942-5995 ms (6/6 muestras), siempre sobre el default 5000 ms; con ventana 30 s navega siempre (URL + heading correctos). **0 cambios de expectativa** (mismo patron, mismo destino); precedente `inc10-acceso-membresia.spec.ts:425` (15000). **No es defecto de producto**; riesgo R-FIX03B-01 abierto (ver abajo). Repeticiones: `--grep "AUD-03-5" --repeat-each=3` = 3/3.

**Riesgos/gaps**: (1) R-FIX03B-01 latencia dev ~5.9 s por chunk on-demand — recomendacion a devops/frontend: fijar `turbopack.root` (lockfiles duplicados en `beasts/` y `club-beasts-web/`); (2) batera 1 worker ~17 min, estabilidad demostrada en corrida completa 206/206 + 3 repeticiones; (3) AUD-05 fuera de alcance de este contrato (ya desmentido); (4) nada commiteado — cambios en working tree.

### FIX-03c viajes AUD-07..10 (test-engineer, 2026-11-15) — CERRADO

Solo 2 specs `inc10-*` editados (`inc10-rutinas-cobertura.spec.ts`, `inc10-rutinas-creacion-personalizada.spec.ts`); `creacion-base.spec.ts` sin cambios; spec temporal de diagnostico eliminado; producto/docs/ajenos intactos.

- **AUD-07 (NAV-RU-07) — CERRADO**: 3 viajes de edicion de familia personalizada — Aplicar cambios -> detalle persistido **con recarga**; Descartar sucio -> C5 -> "Seguir editando" conserva arbol / "Si, descartar" -> sin persistir; Volver al listado sucio -> C5.
- **AUD-08 (NAV-RU-03/08) — CERRADO**: 2 viajes `page.goBack()` con borrador sucio (base + personalizada) -> desmontaje sin persistencia, listado `/rutinas` estable sin bucle; guard `beforeunload` **armado** con borrador sucio y **liberado** fuera del editor. Diseno del viaje fundamentado en medicion (`inc10-fix03c-pw-diag3.log`): la hipotesis "dialog nativo descartado" fue DESMENTIDA (el primer `goBack` es misma-documento hasta el paso-selector; 0 eventos `dialog`); re-encuadrado en lo observable, sin aserciones vacias.
- **AUD-09 (NAV-RU-10) — CERRADO**: Tab **real** por niveles hasta "Agregar macrociclo" (`:focus-visible` + Enter) y anidamiento hasta "Agregar mesociclo"; test con `focus()` previo preservado (augment).
- **AUD-10 (cierre AUD-04) — CERRADO 4/4**: Tab por la ficha hasta "Ver version asignada" en region "Historial de rutinas" (`:focus-visible` + Enter) -> snapshot desplegado + sweep C7.

Verificacion: tsc **0**; web **401/401**; bateria completa **213/213** (206 + 7 nuevos), `213 passed (16.4m)`, exit 0, log canonico `inc10-fix03c-pw-final.log` 58.625 bytes/331 lineas con cierre de conteo (no truncado, `PW_EXIT=0`, 0 failed/flaky); invert **143/143**; PIN **3/3**. **0 enmiendas C4** (ninguna expectativa existente modificada; 0 viajes revelaron defecto de producto — sin BLOQUEADO). Cobertura nueva declarada: AUD-07/09 pasaron a la primera (comportamiento ya implementado); AUD-10 fallo 1a vez por fixture (nombre con digitos rechazado por API) — corregido. **Filas NAV-RU-03/07/08/10 -> VERIFICADO pleno pendiente de ratificacion del auditor** (ratificacion lanzada 2026-11-15). Riesgos: R-FIX03B-01 vivo; viaje AUD-08 sensible a cambios futuros del flujo de creacion; nada commiteado.

## 6c. Re-auditoria de navegacion (ui-navigation-auditor, 2026-11-08) — EJECUTADA

Re-auditoria NAV-RU-01..24 sobre evidencia ejecutada (metodologia D-01): log canonico `inc10-fix03b-pw-final.log` (206/206 integro, viajes NAV-RU en [124..186], 0 failed/flaky) + invert 143/143 + PIN 3/3 + vitest 401/401 + logs de diagnostico AUD-03-5. Entorno: chromium desktop 1278x720 (+ 390x844 movil), workers 1, dev server, fixtures aisladas, logins reales sin bypass.

**Conteo final: 20 VERIFICADO plenos / 4 parciales (NAV-RU-03, 07, 08, 10) / 0 FALLIDOS / 0 NO VERIFICADO / 0 NO APLICABLE completos.** Delta: +4 plenas vs la auditoria previa (16/8). Sin enlaces rotos ni bucles. Aplicabilidad sin cambios respecto a LISTO.

**BLOQ-01 CERRADO** (AUD-01 y AUD-02 con viaje ejecutado, sin aserciones vacias). Hallazgos: **AUD-01/02/02b/03/05/06 CERRADOS** (AUD-05 desmentido); **AUD-04 parcial 3/4**. Enmienda C4 de AUD-03-5 **ACEPTADA** por el auditor (0 cambios de expectativa; fallo previo = timeout 5.9 s > default 5 s, no destino erroneo; precedente repo; si supera 15 s falla ruido — R-FIX03B-01 sigue vivo).

**Hallazgos nuevos (todos BAJA, sin bloqueantes MEDIA+):**
| ID | Responsable | Detalle |
|---|---|---|
| INC10-NAV-AUD-07 | test-engineer | sin Tab + `:focus-visible` + Enter en "Historial de rutinas" (cierre AUD-04) |
| INC10-NAV-AUD-08 | test-engineer | NAV-RU-03/08: entrada "navegacion" (atras/documento con datos sucios) sin viaje |
| INC10-NAV-AUD-09 | test-engineer | NAV-RU-07: sin viaje de edicion de la familia personalizada (Guardar/Descartar en `/rutinas/[id]/editar` con arbol) |
| INC10-NAV-AUD-10 | test-engineer | NAV-RU-10: test usa `focus()` programatico; sin Tab real por niveles ni asercion `:focus-visible` |
| R-FIX03B-01 (confirmado) | devops + frontend | latencia dev ~5.9 s por chunk on-demand; fijar `turbopack.root` (lockfiles duplicados) |
| Observacion INFO | Producto | NAV-RU-05 "logout -> login" se cumple via landing `/` + guardia (patron repo); si se exige `/login` literal, es decision de producto |

**Veredicto: APTO para REVISADO si; condiciones para ACEPTADO:** (1) cerrar AUD-07..10 con viajes (FIX-03c) o re-escopar filas con decision explicita; (2) llevar a revision las observaciones T8 (`onAsignada` sincrono, heading P3 parentesis, `RouteAnnouncerNormalize`, limites meso/micro total) + R-FIX03B-01; (3) no certificar "24/24 plenas" — el recuento real es 20 plenas / 4 parciales hasta cerrar FIX-03c.

**Actualizacion 2026-11-15**: FIX-03c **CERRADO** (AUD-07/08/09/10 con viajes ejecutados, bateria 213/213, ver arriba) — las filas **NAV-RU-03/07/08/10 pasan a VERIFICADO pleno pendiente de ratificacion** por el auditor (BLOQ-01 ya estaba cerrado; la condicion (1) del veredicto queda cumplida con evidencia). Recuento tras ratificacion esperado: **24 plenas / 0 parciales / 0 fallidas**.

**RATIFICACION FINAL del auditor (2026-11-15) — condicion (1) de ACEPTADO CERRADA:**
- **NAV-RU-03/07/08/10 -> VERIFICADO pleno** (viajes: `cobertura.spec.ts:1009`, `:761/:822/:883`, `:1030`, `creacion-personalizada.spec.ts:254`); AUD-04 cerrado **4/4** (viaje historial `cobertura.spec.ts:708`).
- **Re-encuadre AUD-08 ACEPTADO**: sin asercion vacia (guard armado/liberado medido, desmontaje, no-persistencia, URL estable); sub-entrada "salida del documento" cubierta por NAV-RU-04/09; diag3 desmentio la hipotesis del dialog nativo.
- **Conteo final matriz: 24 VERIFICADO plenos / 0 parciales / 0 fallidos / 0 NO VERIFICADO completos.** AUD-01..10 todos CERRADOS; BLOQ-01 CERRADO. Hallazgos de la auditoria (INC10-NAV-AUD-01..10) **todos cerrados**.
- Recuento de bateria CONFIRMADO contra log: `213 passed` = 143 base + 70 NAV-RU (grep de 70 titulos) = 206 + 7; `PW_EXIT=0`, 0 failed/flaky, PIN 3/3.
- Residuos no bloqueantes: **INC10-NAV-AUD-11 (INFO)** — niveles micro/sesión/ejercicio no tabulados uno a uno; el auditor **ratifica la cobertura actual como suficiente** (backlog, no condicion de ACEPTADO). **Cross-reference INFO para docs**: `cobertura.spec.ts:705` atribuye el viaje del historial a "INC10-NAV-AUD-10" cuando cierra AUD-07 (el AUD-10 correcto esta en `creacion-personalizada.spec.ts:249-251`) — registro del orquestador, sin impacto en ejecucion. R-FIX03B-01 sigue vivo (devops+frontend).
- Condiciones restantes de ACEPTADO: **(2)** REV-01/REV-05 (en curso: INC10-FIX-04 frontend + INC10-FIX-05 backend) y **(3)** commitear el working tree.

## 7. REVISADO (code-reviewer, 2026-11-15)

**Dictamen: ACEPTA CON HALLAZGOS NO BLOQUEANTES.** Revision solo lectura con re-ejecucion propia: api tsc 0 + vitest **1029/1029** + Gherkin **220/220** + migraciones up to date; web tsc 0 + vitest **401/401** + build **PASS** (15 paginas); E2E por log canonico `inc10-fix03b-pw-final.log` **206/206** (mas reciente al momento de la revision; FIX-03c cerro despues con 213/213).

Checklist: seguridad/autorizacion PASS (escalera de roles, middleware staff-only, `?clienteId=` -> 403), privacidad PASS (portal `.strict()` sin `actor`), **PIN PASS** (auth sin cambios, guarda E2E, 3/3), concurrencia PASS (transaccion + arbitro `activaClave`, carrera real solo Postgres residual), DEC-062..070 PASS, calidad de pruebas PASS con notas (0 skips/vacios; enmiendas C4/D1-D4/FIX-01/02/03b documentadas), regresiones PASS, sin-duplicado PASS (RU-05/18 REF; HU-13 b4 y HU-07 b5/b6 para reparto DEC-016).

**Hallazgos NO BLOQUEANTES REV-01..REV-11** (resumen): REV-01 (MEDIA) botones "Agregar" del editor con cap **global** 20/20/30 mas estricto que C4 por-nodo — la validacion API/espejo si cumple C4; requiere decision: Producto formaliza el cap global (DEC) o frontend corrige con enmienda de test. REV-02 (baja) `mockClear` hook de test en producto (`AsignarRutinaForm.tsx:58`) + entrega sincrona (patron C3 aceptado). REV-03 `RouteAnnouncerNormalize` aceptable con nota (conserva `aria-live`; asentar como decision, vigilar upgrades Next). REV-04 regex sin escapar en unit del heading P3 (literal verificado en Chromium via E2E). REV-05 (MEDIA) PATCH de rutina **no re-valida contencion** (asimetria con creacion; conforme al contrato ratificado; UI espejo si valida) — decision: re-validar con enmienda o asentar la asimetria. REV-06 error de red pintado como `SIN_RUTINA`. REV-07 entrada de historia duplicada (doble atras) inconsistente entre pantallas. REV-08 `fechaInicio` retroactiva puede invertir rangos en historial. REV-09 `JSON.parse(snapshot)` sin guardia. REV-10 = condicion FIX-03c (cerrada). REV-11 listado sin paginacion (backlog).

**Evaluacion de las 7 observaciones heredadas**: (1) `onAsignada` sincrona ACEPTABLE (patron C3; `mockClear` -> REV-02); (2) heading P3 parentesis ACEPTABLE con nota (Chromium incluye `::before`; escapar regex); (3) `RouteAnnouncerNormalize` ACEPTABLE con nota; (4) limites meso/micro **ACEPTABLE CON ASENTAMIENTO OBLIGATORIO** (REV-01: decision de Producto); (5) R-FIX03B-01 + C4 timeout 15000 **CONFIRMADA** (no defecto de producto; vendaje, no cura); (6) enmiendas de contrato GAP-01/GAP-02/FIX-01/D1-D4/FIX-02/FIX-03b **CONFIRMADAS**, sin cambios silenciosos; (7) PATCH sin contencion ACEPTABLE CON NOTA (REV-05: decision de Producto).

**Condiciones para ACEPTADO**: (1) ratificacion de las filas NAV-RU-03/07/08/10 tras FIX-03c (en curso); (2) asentamiento de REV-01 y REV-05 — decision de Producto o registro explicito como backlog; (3) commitear el working tree (15 modificados + ~45 nuevos sin commitear) para no perder evidencia.

**Cierre de condiciones (2026-11-15):**
- **Condicion (1) CERRADA**: ratificacion del auditor — matriz **24 plenas / 0 parciales / 0 fallidas** (ver §6c).
- **Condicion (2) en curso**: REV-01 -> **INC10-FIX-04** (`frontend-developer`, decision de Producto: UI a C4 por nodo; tsc 0 + web 401/401, E2E en curso). REV-05 -> **INC10-FIX-05 CERRADO** (`backend-developer`, decision de Producto: re-validar en PATCH): RED 2 fallos -> GREEN, `assertContencionCiclos` sobre el merge en `rutina.service.ts` -> 400 `VALIDATION_ERROR` primer error sin escritura, orden intacto; enmienda C4 del test 520-534 (200 -> 400, header+inline) + 2 tests nuevos (merge corregido -> 200 reemplazo; PATCH parcial solo-nombre -> 200 arbol intacto); **RU-17 enmendado sin tocar `features/`** (el literal "200 para arbol no contenido" vivia en comentario de servicio + test, no en el criterio); verificacion: tsc 0, API **1031/1031** (1029+2), Gherkin 220/220, migraciones 11/0; logs `inc10-fix05-{red,green,tsc,vitest-full,gherkin,migrate}.log`. Riesgo residual: fila PERSONALIZADA legada no contenida bloquearia su PATCH (hoy imposible via API).
- Condicion (3) commit: pendiente tras la verificacion final.

### INC10-FIX-06 diagnostico de los 2 fallos 211/213 (backend-developer, 2026-11-15) — ENTORNO, no regresion

**Veredicto: los fallos de `inc04-estados-cliente.spec.ts:175` y `inc10-rutinas-cobertura.spec.ts:510` (AUD-03-4) son saturacion del dev server (R-FIX03B-01), NO regresion de REV-05 ni defecto de producto.** Evidencia en 4 capas: (a) repro API con fixture exacta AUD-03-4 (`tests/integration/inc10-fix06-repro-aud034.test.ts`) → 200 en **2-4 ms** x3 corridas, orden DESC, snapshot parseable; (b) el delta de FIX-05 vive solo dentro de `actualizarRutina()` — inalcanzable desde los GET (rutas/servicio sin cambios desde 5/11; sin imports/evaluacion a nivel modulo); (c) correlacion temporal: baseline 18:42 = 213/213 en 16.4m vs run fallido 21:38 = 211/213 en **21.2m (+29%)**, `GET de recarga en 21586ms`, timeouts 30s, `MissingCSRF` en teardown; (d) semantica: en error los componentes pintan fallback, no "Cargando..." → el fetch a `:3001` estuvo **pendiente** (lentitud). Sin fix de producto. Verificacion: tsc 0, API **1034/1034** (1031 + 3 del repro, declarado), Gherkin 220/220, logs `inc10-fix06-*`. Responsable del cierre: test-engineer (batería final con servidor sano) + R-FIX03B-01 a devops. Riesgo: AUD-03-4 asienta en ventana de 5 s mientras el entorno saturado siga asi.

**Riesgos residuales**: R-FIX03B-01 (devops: `turbopack.root`/lockfile duplicado); concurrencia real solo Postgres; `bodyLimit` 5 MiB < teorico C4 (INC10-R05); snapshot congelado por disenio (DEC-067); UX "atrás" REV-07; AccName REV-03/04 a vigilar en upgrades; integridad via API directa REV-05/08; conteo E2E basado en log 13/11 (cualquier cambio posterior exige re-corrida); reparto de puntos exclusivo del orquestador (DEC-016).

## 8. ACEPTADO (orquestador, 2026-11-18)

**`INC-10-rutinas` ACEPTADO.** Condiciones de salida cumplidas:

1. **Criterios RU-01..RU-42**: todos verificados (RED 268 pruebas → GREEN T6/T7/T8 → FIX-01/02/03a/03b/03c; enmiendas C4/D1-D4 documentadas, 0 borrados). RU-05/RU-18 REF sin puntos; rama "solo CERRADAS" NO APLICABLE justificada.
2. **Compilacion**: api tsc 0, web tsc 0, build PASS.
3. **Integracion critica**: API **1034/1034** + Gherkin **220/220** + migraciones **11/0 sin drift**.
4. **E2E real**: bateria **213/213** (143 base + 70 NAV-RU) + invert 143/143 + PIN 3/3 — §5b, ventana sana 2026-11-18.
5. **Sin aserciones vacias ni skips**: verificado por code-reviewer y auditor.
6. **Revision**: `code-reviewer` **ACEPTA CON HALLAZGOS NO BLOQUEANTES** (§7); REV-01 → FIX-04 (UI a C4 por nodo, decision de Producto 2026-11-15) y REV-05 → FIX-05 (PATCH re-valida contencion, decision de Producto 2026-11-15) **cerrados**; REV-02/03/04/06/07/08/09/11 → backlog explicito (registrados en §7).
7. **Navegacion**: matriz **NAV-RU-01..24: 24 plenas / 0 parciales / 0 fallidas** (ratificacion §6c); AUD-01..10 cerrados; BLOQ-01 y BLOQ-02 cerrados; sin enlaces rotos ni bucles; movil/escritorio/teclado/URL directa/recarga/atras con evidencia ejecutada; inicio/volver/cancelar/logout por rol verificados; PIN obligatorio intacto. Residuo INFO: INC10-NAV-AUD-11 (ratificado suficiente, backlog).
8. **Puntos**: reparto por DEC-016 en `docs/producto/auditoria-puntos-inc00.md` **seccion 13** (bloque 6 = 18 puntos + b4 de HU-13 segun reparto; no-duplicado: RU-05/18 REF, HU-07 b5/b6 anotados para su cierre, DEC-018 macro-meso-micro ya cobrado en HU-13 solo si aplica — ver seccion 13). **CUMPLIDO 2026-11-18**: §13 escrita (13.1 reparto HU-18 4 + HU-19 5 + HU-20 4 + HU-21 3 + HU-26 2 = 18; 13.1b HU-13 b4 4/4 con **+0** por peso ya al maximo; 13.2 no-duplicado; 13.3 totales **79/100**); `mvp.md` y `avance.md` actualizados.

**Riesgos residuales al cierre**: R-FIX03B-01 reencuadrado (§5c: causa probable FC26; mejora `turbopack.root` pendiente devops); concurrencia real solo Postgres; `bodyLimit` 5 MiB (INC10-R05); REV-07 doble atras; REV-09 JSON.parse sin guardia; INC10-NAV-AUD-11 backlog; commit del working tree pendiente (condicion de gestion, no de criterio).
