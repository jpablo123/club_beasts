# INC-09 - Evidencia

Estado: **ESPECIFICADO** (2026-11-04). Pipeline en curso. Puntos potenciales: bloque 5 (12) + fraccion HU-07 b4 sin doble cobro (DEC-016); reparto final en `docs/producto/auditoria-puntos-inc00.md` seccion 12 al cierre.

## 0. Especificacion (2026-11-04)

- `acceptance-criteria-analyst` (Modo CREAR): 8 archivos en `club-beasts-api/features/acceptance-criteria/` (HU-09/10/11/28 criterios + schemas zod); criterios **AN-01..AN-33**; tsc 0; smoke runtime 26 PASS/0 FAIL. Gherkin no creado (guard exacto 220; cableado ATDD en RED con guard al alza).
- Decisiones del Producto 2026-11-04: **DEC-055** (sensibles = 5 campos con RH), **DEC-056** (snapshot 1-10), **DEC-057** (1 por cliente), **DEC-058** (solo DUENO), **DEC-059** (regex/limites). PEND-ANX-01..06 resueltos.

## 1. Ratificacion de contratos (2026-11-04) — COMPLETA

- **R1 `backend-developer`**: RATIFICA CON CORRECCIONES R1..R8, sin bloqueos. Puntos: R1 `PUT`->`PATCH` (merge honesto); R2 `SIN_REGISTRO` = 200 + `{ estado: "SIN_REGISTRO", mensaje }`; R3 semantica de borrado (ausente=conserva, `null`/`""`=vacia) + consistencia SI/NO sobre estado fusionado (habilita AN-25); R4 AN-05/rama "ausente" AN-07 a nivel schema; R5 DEC-055 = 5 sensibles en archivos del analista; R6 CLIENTE agrupado S1-S4 (`anamnesisClienteSeccionesSchema`); R7 orden de errores por endpoint (GET con 403 self-only antes de 404 — SEC-01/SEC-03; PATCH con 404 anamnesis + 400 consistencia); R8 payloads de escritura = vista DUENO, pre-llenado es del frontend. Modelo Prisma `Anamnesis` 1:1 (`@unique clienteId`), multi-selects String+JSON (SQLite sin scalar lists), estado derivado sin columna, migracion **9/0 -> 10/0**. Copia de validacion en `src/schemas/anamnesis.schema.ts` con anti-deriva por tests.
- **R2 `frontend-developer`**: RATIFICA CON CORRECCIONES C1..C9; C3a converge con R3 (resuelta); C6 = BLOQUEADO PUNTUAL -> **resuelta por DEC-056a** (pre-llenado 1,2,9,10). Puntos: C1 seccion ficha con montaje bajo demanda (anti-interferencia 2 capas); C2 pagina nueva `/portal/anamnesis` (sin `repararUrlDelPortal`, con guarda `debeCambiarPin` -> `/portal`) + gate DEC-060; C3 form parcial + badge estado + espejo de validacion `src/lib/anamnesis-schemas.ts`; C4 RECEP por presencia de clave (19/23 campos = 20/25 props; 5 claves DEC-055 ausentes en red y DOM); C5 "Descartar cambios" con `role="alertdialog"` + banner "Cambios sin guardar" + `beforeunload` (limite soft-nav documentado); C7 substrings prohibidos (122 E2E base) + `exact`/`toHaveCount`; C8 responsive/foco; C9 `GET /portal/anamnesis` por token (sesion CLIENTE sin `clienteId`).
- **Decisiones del Producto 2026-11-04 (segunda tanda)**: **DEC-056a** (pre-llenado solo 1,2,9,10; DEC-056 enmendada) y **DEC-060** (`/portal/anamnesis` gateada por servicio vigente; plan personalizado cuenta como acceso propio; sinMembresiaActiva -> deriva al aviso DEC-051).
- **Puerta LISTO cerrada 2026-11-04** (spec: contratos ratificados, DEC-056a/060, matriz NAV-AN-01..09 con re-escopos, enmiendas C4 programadas 1-4).

## 2. Base a preservar (re-medida al arranque del RED)

| Comando | Esperado (2026-10-30) | Resultado INC-09 | Fecha |
|---|---|---|---|
| api `npx vitest run` | 658/658 | _pendiente_ | - |
| api `npm run test:gherkin` | 220/220 exit 0 (guard 220) | _pendiente_ | - |
| api `npx prisma migrate status` | 9/0 | _pendiente_ | - |
| web `npx vitest run` | 215/215 | _pendiente_ | - |
| web `npx playwright test` | 122/122 | _pendiente_ | - |
| tsc api/web + build | 0 / PASS | _pendiente_ | - |

## 3. RED (test-engineer, 2026-11-04) — COMPLETO

**250 pruebas nuevas**: API **104 integracion en rojo** (endpoint inexistente, mensajes `FIXTURE INC-09 (RED)`) + **45 unit API verdes** (pines del contrato canonico + pines DEC-055 = evidencia de enmienda); web **88 unit en rojo** (modulo/componente ausente) + **13 E2E en rojo** (5 fixture-endpoint-404 + 7 locator-0 + 1 redirect DEC-060 ausente — NAV-AN-09). **Base re-medida intacta antes y despues**: API 658/658, Gherkin 220/220 (guard intacto, T6 N/A sin features nuevas), web 215/215, E2E 122/122 (`cambio-pin-obligatorio` 3/3 verde), tsc 0/0, build PASS, migraciones 9/0. PIN obligatorio intacto.

**Enmiendas C4 aplicadas (T2)**: (1) `HU-10-schemas.ts` + `.md`: DEC-055 — `CAMPOS_SENSIBLES` 5 con `rh`, `CLASIFICACION_CAMPOS.rh=SENSIBLE`, `anamnesisRecepcionSchema` omite 5 (20/25 props), textos corregidos, header POST|PATCH; (2) `HU-09-criterios-aceptacion.md`: R4 (AN-05/rama ausente AN-07 a nivel schema; filas 3/5 de cobertura -> `201/200 PENDIENTE`) + R3 (merge AN-12) + R1; (3) `HU-11-criterios-aceptacion.md`: R3 (merge: ausente=conserva, `null`/`""`=vacia en AN-23/25; AN-26 guarda de body) + R1; (4) encabezados `POST|PUT`->`POST|PATCH` (R1).

**Cobertura por criterio** (resumen): AN-01..AN-11/21/22/26 + 409 + R7-POST en `inc09-anamnesis-registro.test.ts` (53); AN-12/23/24/25/27 + merge R3/C3a + contradicciones fusionadas + R7-PATCH + sin DELETE en `inc09-anamnesis-edicion.test.ts` (30); AN-13..20 + filtro DEC-055 (`not.toHaveProperty` x5) + SIN_REGISTRO 3 roles + R7-GET en `inc09-anamnesis-permisos.test.ts` (20); AN-28..33 + `/portal/anamnesis` agrupado en `inc09-anamnesis-portal.test.ts` (12); web unit vista/editor/prefill/paridad espejo (88); E2E NAV-AN-01..09 en `inc09-anamnesis-{portal,staff,formulario}.spec.ts` (13). Convenciones C7 respetadas (substrings prohibidos, `exact`, `toHaveCount`).

Logs: `%TEMP%\opencode\inc09-red-*.log` (T1 base, T7 completos, smokes de calidad del rojo). Riesgos del RED para el GREEN: contratos de nombres fijados en headers de tests (rutas `src/routes/anamnesis.ts`, `@/components/anamnesis/*`, `@/lib/anamnesis-{prefill,schemas}`, `api.anamnesis.*`, literales de mensajes); gaps menores (clausula `?completa=true` de AN-15 sin fijar, AN-26 cuenta campos con valor, literales 400 params). Gaps para el orquestador: AN-15 `?completa=true` requiere decision (recomendacion: 200-filtrado, coherente con filtro por defecto).

## 4. GREEN

### 4a. T8 modelo + migracion (database-admin, 2026-11-04) — COMPLETO

Modelo `Anamnesis` en `prisma/schema.prisma` (23 campos opcionales para guardado parcial, sin columna `estado` — derivado, multi-selects String+JSON por SQLite/DEC-012, fechas String, trazabilidad `actualizadoPorId`+`fechaActualizacion @updatedAt`, `clienteId @unique` 1:1 DEC-057, FKs RESTRICT patron repo, back-relations minimas) + migracion `20261104224741_add_anamnesis` (solo CREATE TABLE + indice unico; aditiva pura). Verificacion: migraciones **9/0 -> 10/0 sin drift** (dos diffs: "No difference detected"), `prisma generate` exit 0, tsc 0, suite **703 passed / 104 failed = identico al baseline del RED** (los 104 rojos son los tests de integracion INC-09 esperando rutas — correcto). **Guard actualizado**: la base real del worktree post-RED es **703/104 (807 total)**; los 658/220/215/122 son la base pre-INC-09. Riesgos: FK RESTRICT (fixtures borran `Anamnesis` primero), JSON como String validado solo por Zod (INC09-R09). Handoff: `prisma.anamnesis` tipado disponible.

### 4b. T9 backend (backend-developer, 2026-11-04) — IMPLEMENTADO + VERIFICADO (pendiente VERIFICADO global)

Solo `club-beasts-api/src/**` (4 archivos): `schemas/anamnesis.schema.ts` (copia verbatim canonica INC09-R08 + `CAMPOS_ANAMNESIS` whitelist, `guardarParcialSinConsistenciaSchema`, `anamnesisParamsSchema`, `mensajePrimerErrorZod`), `services/anamnesis.service.ts` (CRUD: (de)serializacion JSON solo aqui INC09-R09, whitelist explicita INC09-R05, estado derivado sin columna R5, merge R3/C3a con `null`/`""`/`[]`=vacia, contradicciones sobre estado fusionado, trazabilidad DEC-057, POST check + fallback P2002 -> 409 `ANAMNESIS_EXISTENTE`), `routes/anamnesis.ts` (4 endpoints, orden R7 determinista, `authenticateRoles`, 403 self-only ANTES de 404, sin DELETE; **montaje: router standalone registrado en `src/index.ts`** — documentado en header), `index.ts` (+2 lineas).

Verificacion: tsc **0**; **API 807/807** (703 base + 104 INC-09 verdes; 45 unit intactos); Gherkin **220/220** (guard intacto); migraciones **10/0**; spot-check manual **20/20** (filtro DEC-055 con guarda positiva: RECEP 24 claves exactas sin las 5 sensibles ni valores ni claves; orden R7 por endpoint; literales del contrato).

**Contratos de nombres fijados para frontend**: endpoints y codigos (`VALIDATION_ERROR`, `NOT_FOUND`, `ANAMNESIS_NO_ENCONTRADA`, `ANAMNESIS_EXISTENTE`, `AUTH_FORBIDDEN`, `AUTH_TOKEN_*`); literales (404 cliente "Cliente no encontrado", 404 anamnesis "El cliente no tiene una anamnesis registrada", 409 "El cliente ya tiene una anamnesis registrada. Use la actualizacion.", AN-26 "La anamnesis debe tener al menos un campo diligenciado", SIN_REGISTRO "Aun no hay una anamnesis registrada para este cliente.", claves desconocidas "Campos no permitidos en el formulario: <claves>"); vistas por rol (DUENO 29 claves plana, RECEP 24 claves, CLIENTE agrupada `secciones.{S1..S4}` sin `actualizadoPorId`, SIN_REGISTRO uniforme); estado `"PENDIENTE"|"COMPLETA"`; merge PATCH.

Decisiones reportadas (no silenciosas): (1) multi-select `[]` presente = sin diligenciar (vaciar; borde sin impacto — C3a envia `null`); (2) body PATCH valida sin contradicciones (R7: 404 anamnesis antes del 400 de consistencia; contradicciones sobre fusionado); (3) RH regex copiada con `/i` (verbatim canonico); (4) `/portal/anamnesis` sin 404 cliente (identidad del token); (5) 403 self-only con mensaje estandar no revelador. Nota: desglose 53/30/20/12 del contrato vs `it` reales 53/27/16/8 = 104 total (coincide). **Pendiente del orquestador**: artefactos `zz-probe-*` en `club-beasts-web/` (scratch ajeno probable de T10 — decidir destino al cierre).

### 4c. T10 frontend (frontend-developer, 2026-11-04) — IMPLEMENTADO + VERIFICADO (1 fixture RED -> INC09-FIX-01)

Solo `club-beasts-web/src/**` (8 creados + 3 modificados; 0 tests tocados, 0 dependencias nuevas, `package.json`/`middleware.ts` intactos): `lib/anamnesis-schemas.ts` (espejo sin zod, INC09-R06), `lib/anamnesis-campos.ts` (25 metadatos + `RH_OPCIONES` 8), `lib/anamnesis-prefill.ts` (DEC-056a: 1,2,9,10), `components/anamnesis/{MultiSelectCheckboxes,AnamnesisVista,AnamnesisEditor,AnamnesisSection}.tsx` (C1 montaje bajo demanda + gate DUENO, C3 form 25 props + `null` explicito C3a, C4 render por presencia de clave, C5 banner+beforeunload+alertdialog, AN-10 "Ninguno" exclusivo, AN-26 `role="alert"`), `app/portal/anamnesis/page.tsx` (HU-28 S1-S4, SIN_REGISTRO `role="alert"`, guarda PIN -> `/portal`, **gate DEC-060**: resumen antes de consultar anamnesis), `api.ts` (`api.anamnesis.{get,create,update}` + `api.portal.anamnesis`), `clientes/[id]/page.tsx` (seccion tras `MembershipSection`), `portal/page.tsx` (card "Mi anamnesis" fuera de `<nav>`).

Verificacion: tsc **0**; web vitest **302/303** (215 base + 87/88 nuevas; **1 fallo = fixture defectuoso del RED -> INC09-FIX-01**); **Playwright 135/135 (9.6m)** — 13/13 INC-09 verdes + base **122/122 intacta** (`cambio-pin-obligatorio` 3/3, specs INC-08); build **PASS**. Log `%TEMP%\opencode\inc09-green-pw.log`. C7 verificado en ejecucion real (unico cruce "Estado civil" neutralizado por montaje bajo demanda + `exact`).

**INC09-FIX-01 (test-engineer, 2026-11-04) — CERRADO**: enmienda C4 en `inc09-anamnesis-schemas-paridad.test.ts` (header + inline): `"Ganar"` (5 chars, valido por `min(5)` inclusivo) -> `"Gana"` (4 chars, invalido con mensaje canonico identico); caso se mantiene en `CASOS_INVALIDOS` con intencion intacta; **0 cambios de expectativa de paridad**. Verificacion: tsc 0, web **303/303** (215+88), API **807/807**, Gherkin **220/220**. Log `%TEMP%\opencode\inc09-fix01-pw*.log`.

**INC09-FIX-02 (test-engineer, 2026-11-04) — CERRADO — H-INC09-FLAKY-01 estabilizado**: solo `membresia.spec.ts` (+61/-1; enmienda documentada `FIX INC09-FIX-02` en header). Cambio unico: la **forma de esperar** (aserciones de negocio intactas) — `expectFilaMembresia` con `toHaveCount(1, { timeout: 30_000 })` anclado a contenido unico del fixture, `page.waitForResponse` del POST `/clientes/:id/membresias-gym` 201 registrado antes del click, `test.setTimeout(90_000)` en los viajes `:71`/:102`. **Reproduccion pre-fix 2/12 (16.7%) con `--repeat-each=6` -> post-fix 0/12 + suite completa 135/135 (10.1m) + web 303/303 + tsc 0.** Revalidacion del producto confirmada existente (`MembershipSection.tsx:403` `await loadMembresias()`) — el flaky era 100% del test; sin hallazgo de producto. Logs `%TEMP%\opencode\inc09-fix02-{pre,post,pw}.log`. El ancla `waitForResponse` añade validacion de contrato API en E2E (refuerzo).

Nota de coordinacion AN-26/PATCH: el body de solo-nulos `{campo:null}` cae en la guarda AN-26 (body sin nada diligenciado -> 400), consecuencia documentada ya en el RED (edicion pura de limpieza requiere >=1 campo diligenciado); los tests de integracion T9 (807/807) y el E2E de degradacion (mixto) fijan esta semantica — sin contradiccion.

## 5. VERIFICADO (test-engineer, 2026-11-04) — COMPLETO, bateria x2 identicas

Bateria completa **x2 corridas identicas consecutivas** (8 comandos x 2 = 16 logs `%TEMP%\opencode\inc09-verificado-run{1,2}-*.log`; comandos bloqueantes, timeout 1200000). **0 failed / 0 flaky / 0 timed out / 0 skipped** en ambas corridas; **run 1 ≡ run 2** (mismos conteos, archivos, exit codes).

| Comando | Run 1 | Run 2 |
|---|---|---|
| api `npx tsc --noEmit` | 0 errores | 0 errores |
| api `npx vitest run` | **807/807** (38 archivos) | **807/807** |
| api `npm run test:gherkin` | **220/220 exit 0** (guard 220) | **220/220** |
| api `npx prisma migrate status` | **10/0** up to date | **10/0** |
| web `npx tsc --noEmit` | 0 errores | 0 errores |
| web `npx vitest run` | **303/303** (31 archivos) | **303/303** |
| web `npm run build` | PASS (12/12) | PASS |
| web `npx playwright test` | **135/135** (10.5m) | **135/135** (10.5m) |

13/13 viajes INC-09 verdes en ambas corridas (formulario 5 + portal 5 + staff 3); **base 122 intacta** con `cambio-pin-obligatorio` 3/3 (PIN obligatorio intacto) y `membresia.spec.ts` estable tras INC09-FIX-02. Informativo: `NativeCommandError` de PowerShell por stderr de `.env` en prisma status (ruido, exit 0).

## 6. Auditoria de navegacion (ui-navigation-auditor, 2026-11-04) — EJECUTADA sobre evidencia Playwright (D-01)

Matriz NAV-AN-01..09 revisada fila a fila contra la traza `%TEMP%\opencode\inc09-fix02-pw.log` (135/135, filas `[103..115/135]`) + API run 1 (807/807). **Las 9 filas: expectativa principal VERIFICADO con viaje ejecutado**. Sin enlaces rotos ni bucles (redirects asertados como URL exacta). Recorridos por rol: CLIENTE (inicio/URL directa/recarga/atras sin datos ajenos/URL staff manipulada -> `/portal`), DUENO (sesion expirada -> login sin 500, descartar con alertdialog conservando lo escrito, guardar con pre-llenado y `null` explicito), RECEPCIONISTA (ficha 19/23 sin sensibles ni controles) — VERIFICADO. Movil 375/escritorio 1280/teclado en editor VERIFICADO (C8).

**Privacidad**: DEC-055 VERIFICADO en dos capas ejecutadas (DOM con guarda positiva + red cruda `not.toHaveProperty` x5 + `not.toContain` de valores; filtro en API con whitelist — defensa en profundidad correcta). DEC-041 VERIFICADO en API (`not.toHaveProperty("actualizadoPorId")` x3) + UI estatica. NAV-AN-04 VERIFICADO (redirect middleware sin datos + 403 self-only antes de 404 sin datos; portal sin id en URL por diseño). **DEC-060 VERIFICADO** (link no pintado + URL directa -> aviso DEC-051 sin datos; puerta de resumen antes de consultar anamnesis). Interferencia base 122 VERIFICADA (cambio-pin 3/3, inc08 28/28, clientes, inc04, congelacion verdes con la seccion montada).

**Hallazgos (sin bloqueantes en filas; NAV-F-02 prioridad para ACEPTADO):**
| ID | Severidad | Estado | Reasignacion |
|---|---|---|---|
| NAV-F-02 | **Medio** | guarda PIN (`debeCambiarPin`) en `/portal/anamnesis` solo verificada estaticamente; sin viaje ejecutado | test-engineer (E2E fixture `debeCambiarPin`; SIN relajar el PIN) -> INC09-FIX-03 |
| NAV-F-03 | Bajo | foco/gestion del `alertdialog` sin ejecucion | test-engineer -> INC09-FIX-03 |
| NAV-F-04 | Bajo | editabilidad explicita de campos 2,9,10/3-8 sin `toBeEnabled()` | test-engineer -> INC09-FIX-03 |
| NAV-F-05 | Bajo | teclado en links "Mi anamnesis"/"Volver al portal" sin ejecucion | test-engineer -> INC09-FIX-03 |
| NAV-F-01 | Bajo | salida "Volver al portal" sin viaje de click | test-engineer -> INC09-FIX-03 |
| NAV-F-06 | Bajo (opcional) | ausencia textual de `actualizadoPorId` en DOM sin asercion | test-engineer -> INC09-FIX-03 |

Recorridos NO VERIFICADO con motivo: guarda PIN en ruta nueva (NAV-F-02), teclado links (NAV-F-05), foco alertdialog (NAV-F-03), editabilidad explicita (NAV-F-04), salida "Volver al portal" (NAV-F-01). No-aplicables justificados confirmados: cancelar para RECEP/CLIENTE (sin editor, DEC-058), logout por viaje propio (sin cambios sobre navegacion de sesion INC-07/08; re-verificado en base), soft-nav (limite C5 aprobado, 0 referencias a storage), app movil nativa. Dependencia: bateria x2 con solo run 1 al momento de la auditoria (run 2 en curso por `test-engineer`; se registra en §7 al llegar).

## 6b. INC09-FIX-03 (test-engineer, 2026-11-04) — CERRADO: NAV-F-01/02/04/05/06 con viaje verde; NAV-F-03 -> micro-fix NAV-F-03b

Solo tests (1 archivo nuevo `inc09-anamnesis-portada-teclado.spec.ts` 314 lineas + append puro en `inc09-anamnesis-formulario.spec.ts` y `inc09-anamnesis-staff.spec.ts`; 13 viajes existentes intactos; 0 codigo de producto; PIN intacto). **Viajes E2E: 135 -> 143** (8 nuevos: 7 verdes + 1 rojo documentado; doble ejecucion identica -> sin flaky; 135 existentes todos verdes).

| Hallazgo | Viaje (`archivo:lina`) | Resultado |
|---|---|---|
| NAV-F-02 (MEDIO) | guarda `debeCambiarPin` en `/portal/anamnesis`: URL `/portal` + formulario PIN + **0 peticiones** a `/portal/anamnesis` ni `/clientes/*/anamnesis` (red interceptada) — `inc09-anamnesis-portada-teclado.spec.ts:90` | **VERDE** |
| NAV-F-01 | click "Volver al portal" -> `/portal` — `:163` | **VERDE** |
| NAV-F-05 x2 | Tab+Enter "Mi anamnesis" (`:197`) y "Volver al portal" (`:234`), `toBeFocused` + `:focus-visible` | **VERDE** |
| NAV-F-06 | DOM sin `actualizadoPorId`/metadatos staff (guardas positivas) — `:275` | **VERDE** |
| NAV-F-04 | editabilidad explicita campos 1,2,9,10 prellenados + 3-8 vacios (`toBeEnabled`+fill) — `inc09-anamnesis-staff.spec.ts:243` | **VERDE** |
| NAV-F-03 | foco del alertdialog: Tab alcanza ambos botones + sin trampa — `inc09-anamnesis-formulario.spec.ts:280`; **foco inicial dentro del dialogo** — `:244` | **ROJO DOCUMENTADO** (gap de producto: `AnamnesisEditor.tsx:376-408` sin gestion de foco inicial; el foco permanece en el disparador) -> **NAV-F-03b micro-fix frontend** |

Verificacion FIX-03: tsc 0 (1 error propio de sintaxis corregido), web **303/303**, Playwright **142 passed / 1 failed de 143** (11.4m; log `%TEMP%\opencode\inc09-fix03-pw.log`), API **807/807** + Gherkin **220/220**. Decision del orquestador: no aceptar la lectura laxa — se encomienda micro-fix **NAV-F-03b** (`autoFocus` o equivalente en "Si, descartar") para cerrar el viaje estricto verde antes de ACEPTADO.

**NAV-F-03b (frontend-developer, 2026-11-05) — CERRADO**: micro-fix en `AnamnesisEditor.tsx` (unico archivo; 4 cambios minimos): foco inicial al **contenedor del `alertdialog` con `tabindex="-1"`** al abrir + cleanup que devuelve el foco al disparador al cerrar (diseno elegido para preservar el viaje `:280`: el primer Tab debe aterrizar en "Si, descartar"; con `autoFocus` en ese boton se romperia). Comportamiento/labels/patron accesible intactos; tests intactos. Verificacion: tsc 0, web **303/303**, spec formulario **7/7** (viaje `:244` **VERDE** + `:280` verde), **suite completa 143/143 (10.7m)**. Logs `%TEMP%\opencode\inc09-fix03b-pw{,-full}.log`. Riesgos menores verificados: doble-invoco de React StrictMode deja foco neto correcto; `focus:outline-none` usa `:focus` (anillos `:focus-visible` de C8 intactos — confirmado en run completo). **NAV-F-01..06 todos cerrados con viaje ejecutado.**

## 7. REVISADO (code-reviewer, 2026-11-05) — **ACEPTA CON HALLAZGOS NO BLOQUEANTES**

Dictamen: **ACEPTA CON HALLAZGOS NO BLOQUEANTES** (0 bloqueantes). Checklist **7/7 CONFORME**: privacidad DEC-055 (whitelist en API, render por presencia de clave, `not.toHaveProperty` x5 + crudo, sin `console.*`, CLIENTE sin `actualizadoPorId`), seguridad/permisos (solo DUENO escribe, self-only antes de 404, orden R7 con sin escritura en 4xx, PIN/guardas intactos, migracion aditiva FK RESTRICT), DEC-057/estado derivado (409 + P2002, trazabilidad con actor real, sin columna), merge R3/C3a (ausente=conserva/`null`=vacia, contradicciones sobre fusionado, AN-25 alcanzable, AN-26 guarda de body), calidad de pruebas (sin vacias/skips/`waitForTimeout`; localizadores C4; enmiendas C4 documentadas; pines DEC-055/DEC-041), regresiones (API 807/807, Gherkin 220/220, web 303/303, tsc 0/0, 10/0; E2E 142/143 con el unico fallo = flaky de base desambiguado 6/6 aislado) y diseno/UX/acc (NAV-F-03b, responsive, SIN_REGISTRO, DEC-060). Spot-check propio: 149/149 INC-09 API, 88/88 unit web, suite completa.

Hallazgos:
| ID | Severidad | Estado | Detalle |
|---|---|---|---|
| H-REV-01 | MEDIO | **CERRADO (INC09-FIX-04, 2026-11-05)** | flaky de BASE `inc06-acceso-membresia.spec.ts:358` (teclado/foco bajo carga; 1/143, 6/6 aislado) — estabilizado con patron FIX-02 (espera anclada a estado de foco); bateria final **143/143** |
| H-REV-02 | MEDIO | **RESUELTO por Producto (DEC-061, 2026-11-05)** | vaciar un solo campo en form diligenciado -> 400 AN-26 (guarda sobre body); **aceptado como limite conocido** (estilo C5); sin cambios de codigo/tests |
| H-REV-03 | BAJO | Cerrado por el orquestador: nota corregida en §4c ("integracion", no "E2E") | imprecision documental sobre la cobertura de AN-25 |
| H-REV-04 | BAJO | Backlog (endurecimiento INC09-R09) | `deserializarMulti` sin validar tipos de elementos |
| H-REV-05 | BAJO | Backlog (aceptado en MVP: escritor unico DEC-058) | PATCH read-modify-write sin transaccion |
| H-REV-06 | BAJO | **Cerrado en gestion**: commits separados INC-08/INC-09 al cierre | atribucion de worktree |
| H-REV-07 | SUGGERIMENTO | Backlog | paridad espejo con entradas no-string |
| H-REV-08 | SUGGERIMENTO | Backlog (decision de accesibilidad) | `aria-modal` sin foco trap (el viaje `:280` exige Tab sin trampa) |

## 8. ACEPTADO (2026-11-05)

**INC-09 ACEPTADO — +12 puntos MVP certificados** (bloque 5 completo: HU-09 4/4 = 4, HU-10 4/4 = 4, HU-11 3/3 = 2, HU-28 3/3 = 2; reparto y no-duplicado en **seccion 12** de `docs/producto/auditoria-puntos-inc00.md`). **Total: 61 de 100 (61%) — corte objetivo del 50% SUPERADO.**

Condiciones de salida (todas cumplidas):
- [x] Criterios verificados: AN-01..AN-33 (33/33) + NAV-AN-01..09 + NAV-F-01..06, con evidencia ejecutada (RED -> GREEN -> bateria x2 -> FIXs -> spot-check review -> 143/143).
- [x] API y web compilan (tsc 0/0, build PASS x2), migracion **10/0** sin drift, Gherkin guard 220 intacto.
- [x] Rutas criticas con integracion (149 pruebas API de INC-09: registro/edicion/permisos/portal) y flujos criticos con E2E real (21 viajes INC-09: portal/ficha/formulario/portada-teclado).
- [x] Sin aserciones vacias ni pasos opcionales (revision punto 5 CONFORME).
- [x] Revision sin hallazgos bloqueantes (7/7 CONFORME; H-REV-01/02 cerrados antes del cierre).
- [x] Navegacion: NAV-AN-01..09 VERIFICADO con evidencia ejecutada; auditoria sin bloqueantes; NAV-F-01..06 cerrados con viaje; no-aplicables justificados (cancelar RECEP/CLIENTE, logout propio, soft-nav C5, app movil).
- [x] `docs/producto/avance.md`, `mvp.md` y `auditoria-puntos-inc00.md` §12 actualizados.
