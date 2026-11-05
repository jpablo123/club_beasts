# INC-08 - Evidencia

Estado: **LISTO** (2026-10-30). Pipeline en curso. **0 puntos MVP** (no-duplicado; WORKFLOW-NAV no certifica puntos).

## 1. Base a preservar (re-medida al arranque del RED)

| Comando | Resultado esperado (2026-10-29) | Resultado en INC-08 | Fecha |
|---|---|---|---|
| `club-beasts-api`: `npx vitest run` | 658/658 | _pendiente_ | - |
| `club-beasts-api`: `npm run test:gherkin` | 220/220 exit 0 (guard 220) | _pendiente_ | - |
| `club-beasts-web`: `npx vitest run` | 204/204 | _pendiente_ | - |
| `club-beasts-web`: `npx playwright test` | 94/94 | _pendiente_ | - |
| tsc api + web / build / migraciones | 0 / PASS / 9-0 | _pendiente_ | - |

## 2. RED (test-engineer, 2026-10-30) — COMPLETO

**28 pruebas nuevas en rojo** (7 unit + 21 E2E) + **6 pines verdes** de regresion DEC-035/guardas. **0 enmiendas C4** (inventario A1-A9: ningun test existente codifica el comportamiento pre-DEC-054; condicionales A5/A6 `cliente-payload.test.ts:75` y `cliente-estados-payload.test.ts:37` si el GREEN toca el builder con parametro obligatorio). Base re-medida al arranque (**T1 identica a la esperada**): API 658/658, Gherkin 220/220 exit 0, web 204/204, E2E 94/94, tsc 0/0, build PASS, migraciones 9/0. PIN obligatorio intacto; sin codigo de producto ni docs tocados.

| Criterio | Pruebas RED | Fallo observado (unicas 2 clases) |
|---|---|---|
| INC08-NAV-01/02/03 | unit `inc08-logout-recepcion.test.tsx` 4 (`:107`,`:119`,`:133`,`:150`) | `Unable to find role "button" name "Salir"` |
| INC08-NAV-01..06 (filas 1-7) | E2E `inc08-logout-recepcion.spec.ts` 17 + 1 PIN (`:163` guarda sin sesion -> `/login`) | `toHaveCount(1)` recibido 0 (control ausente) |
| INC08-ED-01/02/03 | unit `inc08-edicion-estado.test.tsx` 3 (`:152`,`:173`,`:189`) + 3 PIN (`:204`,`:235`,`:252`) | `hasOwnProperty(payload,'estado')` true cuando debe ser false; clave `estado` extra en payload |
| INC08-ED-01/02 (filas 8-9) | E2E `inc08-edicion-estado.spec.ts` 4 (`:189`,`:218`,`:240`,`:326`) + 2 PIN (`:272` 400 sin motivo, `:297` 200 con motivo) | idem unit (PATCH real interceptado; hoy 400 "Motivo es requerido") |

**T7 (post-RED)**: web tsc 0; web vitest **214** = 204 base verdes + 7 RED/3 PIN; Playwright **118** = 94 base verdes + 21 RED/3 PIN (9.8m, exit 1 esperado); API 658/658 + Gherkin 220/220 sin movimiento. Calidad del rojo verificada: 0 errores de sintaxis/fixtures/timeout. Logs `%TEMP%\opencode\inc08-red-*.log` (run final E2E valido: `inc08-red-pw.log`). Justificacion fila 7 (creacion rapida solo RECEPCIONISTA: DUENO sin sede -> 400 INC-03 #5). Revision INC08-R02: selectores base intactos (`cambio-pin-obligatorio.spec.ts:58`, `inc04`, `auth`, `inc06`), base 94/94 verde con archivos nuevos presentes.

## 3. GREEN (frontend-developer, 2026-10-30) — IMPLEMENTADO (2 fallos de fixture del RED -> INC08-FIX-01)

Solo codigo de producto web; **0 tests tocados**; `src/lib/cliente-payload.ts` byte-identico (A5/A6 sin riesgo: diff a nivel de pagina); `Navbar.tsx`, `middleware.ts`, API y `package.json` intactos. PIN obligatorio intacto.

| Archivo | Cambio |
|---|---|
| `club-beasts-web/src/app/recepcion/page.tsx` | Control **"Salir"** en `PageHeader` (`:61-80`): `<button>` nativo via `Button variant="secondary"`, handler `signOut({ callbackUrl: "/" })` (`:75`), label "Salir", solo `esStaff`, **fuera de `<nav>`** (unico "Salir" por pantalla) |
| `club-beasts-web/src/app/clientes/[id]/page.tsx` | Diff de `estado` en `handleSave` (`:90-99`): `cambioEstado = Boolean(form.estado) && form.estado !== cliente?.estado` (`:94`); `estado`/`motivo` al builder **solo con cambio real** (`:97-98`); sin cambio -> payload sin claves `estado`/`motivo` -> 200 sin motivo; con cambio -> DEC-035 intacta |

Verificacion: tsc web **0**; web vitest **214/214** (3 pines unit verdes); Playwright **116 passed / 2 failed** (94 base verdes + 22/24 nuevas; 3 pines E2E verdes); API **658/658** + Gherkin **220/220** sin movimiento; build **PASS**; foco real Tab+Enter/Space y sin overflow movil/escritorio verdes (filas 3 y 6). Log `%TEMP%\opencode\inc08-green-pw.log`.

Criterio -> implementacion: INC08-NAV-01 `recepcion/page.tsx:70-80`; NAV-02 `:75`; NAV-03 `Button.tsx:30` + ring foco; NAV-04/05 header sin estado transitorio; NAV-06 regresion demostrada por base verde con control presente (**salvedad**: 2 viajes propios en rojo por fixture, ver INC08-FIX-01); INC08-ED-01 `clientes/[id]/page.tsx:94-99`; ED-02 payload completo con cambio -> 400/200 backend intactos; ED-03 `:97-98`; ED-04 builder/contrato API intactos (658/220/204/94).

**INC08-FIX-01 (BLOQUEO parcial, ownership `test-engineer`)**: los viajes fila 7 `inc08-logout-recepcion.spec.ts:335` (DUENO) y `:370` (RECEPCIONISTA) fallan por **defecto del fixture del RED**, no por producto: el fixture crea cliente con `crearClienteApi` (estado NUEVO, sin vigencia) y espera "Ingreso registrado", pero la regla aceptada (HU-30/DEC-030/INC-06) responde **403 `INGRESO_NO_PERMITIDO` "no tiene vigencia activa"** (confirmado en `error-context.md`; backend correcto, verde en 658/658). Fix: en ambos viajes, antes del ingreso, `cambiarEstadoCliente(..., "ACTIVO")` + `crearVigenciaApi(...)` (patron del fixture base `recepcion.spec.ts:71`, verde con el control presente). Fila 7 queda **NO VERIFICADO** hasta el fix + reejecucion.

## 3b. INC08-FIX-01 (test-engineer, 2026-10-30) — CERRADO

Fixture corregido en `inc08-logout-recepcion.spec.ts` (unico archivo tocado): helpers existentes `cambiarEstadoCliente(...,"ACTIVO")` + `crearVigenciaApi(..., hoy-30, hoy+30)` en los viajes fila 7 (ahora `:347` DUENO y `:390` RECEPCIONISTA; refs de linea actualizadas en este documento), patron `recepcion.spec.ts:75-84`. **Enmienda INC08-FIX-01 documentada** en header + inline (patron C4): **0 cambios de expectativa** (aserciones byte a byte), 0 cambios de producto, PIN intacto. Verificacion: tsc web 0, web vitest **214/214** (3 pines unit verdes), **Playwright 118/118** (8.8m; `:347` y `:390` verdes; 6 pines verdes; 94 base verdes; 0 failed/flaky), API **658/658** + Gherkin **220/220**. Log `%TEMP%\opencode\inc08-fix01-pw.log`. Fila 7 pasa a tener evidencia ejecutada.

## 4. VERIFICADO (test-engineer, 2026-10-30) — COMPLETO, bateria x2 identicas

> **Nota de trazabilidad (H-REV08-01, revision 2026-10-30)**: las refs de linea de esta seccion y de la §5 son **as-of-run (pre-FIX-02)**; las inserciones aditivas de FIX-02 desplazaron los viajes del spec (fila 7 `:347/:390` -> hoy `:369/:412`; filas 1-6 +2/+22). Las refs **actuales** (post-FIX-02) estan en la §5b. Las trazas de log estan fechadas y el spot-check de la revision re-ejecuto los 28 viajes INC-08 contra las refs actuales: 28/28 verdes.

Bateria completa **x2 corridas identicas consecutivas** (8 comandos x 2 = 16 logs en `%TEMP%\opencode\inc08-verificado-run{1,2}-*.log`; SHA256 de Playwright distintos entre corridas = corridas genuinamente independientes). **0 failed / 0 flaky / 0 timed out**. Sin modificaciones de archivos por esta tarea.

| Comando | Run 1 | Run 2 |
|---|---|---|
| api `npx tsc --noEmit` | 0 errores | 0 errores |
| api `npx vitest run` | **658/658** | **658/658** |
| api `npm run test:gherkin` | **220/220 exit 0** (guard 220) | **220/220 exit 0** |
| api `npx prisma migrate status` | 9/0 sin drift | 9/0 sin drift |
| web `npx tsc --noEmit` | 0 errores | 0 errores |
| web `npx vitest run` | **214/214** (3 pines unit) | **214/214** |
| web `npm run build` | PASS | PASS |
| web `npx playwright test` | **118/118** (8.2m) | **118/118** (8.3m) |

Filas 1-9 con viajes verdes confirmados (run1 y run2): filas 1-6 `inc08-logout-recepcion.spec.ts:159/167/175/186/201/219/233/247/265/274/289/303/324/333`; **fila 7 `:347` (DUENO) y `:390` (RECEPCIONISTA)** (post-FIX-01); filas 8-9 `inc08-edicion-estado.spec.ts:189/218/240/326` + PIN `:272/297`. Pines E2E `cambio-pin-obligatorio.spec.ts:48/71/88` verdes (PIN obligatorio intacto). Hallazgos cosmeticos no bloqueantes: warnings `act(...)` (H-01 preexistente), warning workspace root Next (H-02 preexistente).

## 5. Auditoria de navegacion (ui-navigation-auditor, 2026-10-30) — EJECUTADA sobre evidencia Playwright (D-01)

> Refs de linea de esta seccion: **as-of-run (pre-FIX-02)** — ver nota H-REV08-01 en §4; refs actuales en §5b.

Matriz del spec (filas 1-9) revisada fila a fila contra la traza `%TEMP%\opencode\inc08-fix01-pw.log` + bateria x2 (procedencia test-engineer; el auditor sin navegador propio lo declara — evidencia ejecutada por QA valida por decision D-01). **Todas las filas 1-9: VERIFICADO** con evidencia de corrida (chromium, workers 1, fixtures aislados). Sin enlaces rotos ni bucles (destino "Salir" -> `/` exacto; atras tras logout -> `/login`; sin reabertura de sesion). Recorridos por rol: inicio/URL directa, recarga, atras tras logout, logout, teclado (Enter ambos roles) — VERIFICADO en DUENO y RECEPCIONISTA; movil 375px/escritorio 1280px sin overflow — VERIFICADO (4/4). Interferencia: "Salir" del Navbar intacto (`auth.spec.ts` verde), `nav a[href="/"]` de `cambio-pin-obligatorio.spec.ts:58` intacto, unico "Salir" en `/recepcion` (`toHaveCount(1)`). Aplicabilidad confirmada: app movil nativa **No aplicable**; creacion rapida solo RECEPCIONISTA **justificado** (INC-03 #5, DUENO sin sede -> 400); sub-fila sin sesion **NO APLICABLE** como viaje nuevo (guarda re-verificada por PIN `:175`).

**H-03 (logout propio en `/recepcion`): CERRADO** — control "Salir" en `recepcion/page.tsx:67-80`, `signOut({ callbackUrl: "/" })` (`:75`, patron Navbar), visible solo staff, teclado con foco visible, cierre de sesion efectivo sin reabertura por atras. Evidencia: log fix01 + bateria x2.

Hallazgos del auditor (sin bloqueantes para filas 1-9; **H-INC08-04 desmentido**: la bateria x2 tiene sus 16 logs completos — el auditor tomo snapshot parcial en la corrida paralela):
| ID | Severidad | Estado | Reasignacion |
|---|---|---|---|
| H-INC08-01 | Media-baja | "Cancelar" de la edicion de ficha (`clientes/[id]/page.tsx:184-186`) sin viaje ejecutado (recorrido NO VERIFICADO) | test-engineer (viaje) -> INC08-FIX-02 |
| H-INC08-02 | Baja | CLIENTE -> `/recepcion` (fallback "Volver a mi portal", `:83-95`) sin viaje E2E | test-engineer -> INC08-FIX-02 |
| H-INC08-03 | Baja (cobertura) | Activacion Space solo con DUENO (`:247`); falta RECEPCIONISTA | test-engineer -> INC08-FIX-02 |
| H-INC08-04 | Informativa | **DESMENTIDO** (snapshot parcial): bateria x2 completa con 16 logs | cerrado |

## 5b. INC08-FIX-02 (test-engineer, 2026-10-30) — CERRADO: H-INC08-01/02/03 con viaje ejecutado

Solo tests (append; 0 aserciones existentes tocadas; 0 cambios de producto; PIN intacto). 3 archivos: `inc08-edicion-estado.spec.ts` (+118 lineas: viajes "Cancelar" DUENO `:477` y RECEPCIONISTA `:490`, helpers `capturarPatches`/`fichaEdicionApi`/`viajeCancelarEdicion`), `inc08-logout-recepcion.spec.ts` (viaje Space RECEPCIONISTA `:269` en describe fila 3 + viaje CLIENTE->`/recepcion`->`/portal` `:492` como describe nuevo), `inc08-logout-recepcion.test.tsx` (unit contrato capa 2 del fallback `:179`).

| Hallazgo | Viaje | Resultado |
|---|---|---|
| H-INC08-01 | "Cancelar" en edicion: valores originales intactos, **0 PATCH** (red interceptada), historial sin filas nuevas — DUENO `:477` + RECEPCIONISTA `:490` | **VERIFICADO** (run1+run2) |
| H-INC08-02 | CLIENTE (login real cedula+PIN) -> URL directa `/recepcion` -> salida segura -> **`/portal`**, 0 fuga de UI de recepcion — `:492` | **VERIFICADO** (run1+run2; capa alcanzable = `middleware.ts:36`) |
| H-INC08-03 | Space "Salir" con RECEPCIONISTA (`toBeFocused` + `:focus-visible` + landing `/`) — `:269` | **VERIFICADO** (run1+run2; paridad con DUENO `:249`) |

Verificacion: web tsc **0**; web vitest **215/215** (214+1 unit nuevo); Playwright **run 1: 121 passed + 1 worker-crash transitorio** (`congelacion.spec.ts:408`, `0xC0000409` fail-fast de Windows sin fallo de asercion; aislado verde 11.6s — **H-FIX02-01 cerrado**, flake de infraestructura) y **run 2: 122/122 (9.0m) 0 failed 0 flaky** (118+4); API **658/658** + Gherkin **220/220**. Logs `%TEMP%\opencode\inc08-fix02-pw.log`, `inc08-fix02-pw-run2.log`, `inc08-fix02-api-vitest.log`, `inc08-fix02-gherkin.log`.

**Decision del orquestador (aplicabilidad capa 2 del fallback)**: el enlace "Volver a mi portal" (`recepcion/page.tsx:83-95`) es **defensa en profundidad inalcanzable por navegador** con middleware activo (la capa 1 redirige siempre primero para CLIENTE). La evidencia del recorrido obligatorio (CLIENTE -> `/recepcion` -> salida segura -> `/portal`) esta **ejecutada** (`:492`, E2E real); el unit `:179` fija el contrato del enlace. **No se exige travesia literal del enlace**: exigirla requeriria una excepcion de middleware (cambio de producto innecesario). Caso registrado como **NO APLICABLE justificado** en la matriz.

## 6. REVISADO (code-reviewer, 2026-10-30) — **ACEPTA CON HALLAZGOS NO BLOQUEANTES**

Dictamen: **ACEPTA CON HALLAZGOS NO BLOQUEANTES** (0 bloqueantes). Checklist 6/6 VERIFICADO: seguridad/sesion (signOut real, guardas intactas, fallback sin fuga de UI), DEC-054 sin regresiones (builder `cliente-payload.ts` byte-intacto, claves exactas del payload asertadas, DEC-035 intacta con 400 real en E2E `:272`), calidad de pruebas (0 `waitForTimeout`/`isVisible` condicional/`skip`; localizadores endurecidos; fixtures aisladas; pines fijan lo que dicen), enmiendas documentadas (INC08-FIX-01 header `:59-65` + inline `:373-377`/`:416-418`, 0 cambios de expectativa; FIX-02 append-only), regresiones/selectores (unicidad "Salir", `nav a[href="/"]` intacto, Navbar sin tocar) y diseno/UX (patron Navbar, foco `focus:ring-2 focus:ring-royal`, Enter/Space ambos roles). **Spot-check independiente del reviewer**: 28/28 E2E INC-08 + 11/11 unit + tsc 0 verdes en re-ejecucion propia.

Hallazgos:
| ID | Severidad | Estado | Detalle |
|---|---|---|---|
| H-REV08-01 | BAJO | **CERRADO por el orquestador (2026-10-30)**: notas de trazabilidad "refs as-of-run (pre-FIX-02)" anadidas en §4 y §5 | refs de linea desactualizadas por FIX-02 (fila 7 `:347/:390` -> `:369/:412`) |
| H-REV08-02 | SUGGERIMENTO | Backlog (opcional, test-engineer si Producto lo exige) | `tabHastaSalir` (`inc08-logout-recepcion.spec.ts:138-141`) traga errores intermedios de `evaluate`; sin impacto en validez (el fallo de foco se detecta igual) |
| H-REV08-03 | SUGGERIMENTO | Backlog (opcional, test-engineer si Producto lo exige) | PIN unit `inc08-edicion-estado.test.tsx:204-229` simula el 400 sin asertar literal/`role="alert"` (el literal lo fija el E2E `:272` contra backend real); conjunto sin hueco de cobertura |

Riesgos residuales del reviewer: **R1** (bajo) garantia de "0 ediciones silenciosas" limitada por archivos de test untracked (mitigacion: commitear baselines en incrementos futuros); **R2** (bajo, preexistente fuera de alcance) `loadCliente()` sin `await` en `clientes/[id]/page.tsx:103` (carrera teorica de re-entrada a edicion; ticket aparte); **R3** (bajo, infraestructura) worker-crash `0xC0000409` de Windows (H-FIX02-01, aislado y verde; vigilar en CI); **R4** (informativo) H-REV08-01 ya corregido.

## 7. ACEPTADO (2026-10-30)

**INC-08 ACEPTADO — 0 puntos MVP certificados** (no-duplicado: DEC-053 es WORKFLOW-NAV sobre flujos ya cobrados y DEC-054 es correccion UX sobre HU-05/HU-08/HU-17 ya cobradas; ver regla en `spec.md`).

Condiciones de salida (todas cumplidas):
- [x] Criterios incluidos verificados: INC08-NAV-01..06 + INC08-ED-01..04 (10/10) con evidencia ejecutada (RED -> GREEN -> bateria x2 -> spot-check review).
- [x] Web compila (build PASS x2), API intacta (658/658 + Gherkin 220/220 x2, guard 220), migraciones 9/0.
- [x] Rutas criticas con integracion (payload PATCH asertado contra backend real) y flujos criticos con E2E real (28 viajes INC-08, movil/escritorio/teclado/URL directa/recarga/atras/logout/cancelar por rol).
- [x] Sin aserciones vacias ni pasos opcionales (revision punto 3 VERIFICADO).
- [x] Revision sin hallazgos bloqueantes (ACEPTA CON HALLAZGOS NO BLOQUEANTES).
- [x] Navegacion: matriz filas 1-9 VERIFICADO con evidencia ejecutada; auditoria sin bloqueantes; H-03 CERRADO; H-INC08-01/02/03 cerrados con viajes (FIX-02); capa 2 del fallback NO APLICABLE justificado (decision del orquestador, §5b).
- [x] `docs/producto/avance.md` actualizado (0 puntos; cierre de H-03 y PEND-004/REV-01 — ver actualizacion 2026-10-30).

## 7. ACEPTADO

_Condiciones de salida y puntos certificados (0)._
