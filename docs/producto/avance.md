# Avance del MVP

Fecha de corte: 2026-10-08.

Ultima actualizacion de gestion: 2026-10-08 — **cierre de `INC-02-congelacion-hu-15` (ACEPTADO, revision `code-reviewer` sin hallazgos bloqueantes)**: +3.5 puntos certificados (HU-15 4/4 con b1 enmendado por DEC-023 + HU-12 b2). **Total: 30 de 100 puntos certificados (30%)**. Evidencia: API 379/379, web 147/147, Gherkin 63/63, E2E 30/30 x2 en `docs/incrementos/INC-02-congelacion-hu-15/evidencia.md`; trazabilidad en seccion 8 de `docs/producto/auditoria-puntos-inc00.md`. Decisiones del ciclo: DEC-022..DEC-025.

Actualizacion 2026-10-09 (sin cambio de puntos; sigue **30 de 100 certificados**):

- **INC-03 abierto**: `docs/incrementos/INC-03-vencimiento-recepcion-portal/` creado, estado **BLOQUEADO** con spec de 40 criterios (33 desbloqueados, 7 bloqueados) y contrato API. Falta resolver `INC03-PEND-01..08` (registradas en `decisiones.md`) y ratificar el contrato (`backend-developer`) para pasar a `LISTO`.
- **R-10 cerrado**: flake de `clientes.spec.ts` **reproducido a proposito** (RED: `--repeat-each=6` dio 5/6 fallos con los dos sintomas documentados) y corregido con guard + `expect.poll` determinista; 0 fallos en 50 ejecuciones post-fix. Verificacion global 2026-10-09 abajo.
- **INC02-R05 cerrado**: `role="alert"` en el mensaje de error de `CongelacionForm.tsx` con test RED; suite web sube de 147 a 148.
- Repo puesto en orden git: 3 commits (ignores, agentes, producto INC-00/01/02); antes todo el trabajo vivia solo en el worktree.

Esta medicion distingue tres estados:

- **Implementado:** existe codigo o pantalla.
- **Verificado:** hay pruebas/evidencia ejecutada para el comportamiento.
- **Aceptado:** cumple criterios, pruebas y revision sin hallazgos bloqueantes.

## Resumen ejecutivo

| Area | Implementado | Verificado | Aceptado |
|---|---|---|---|
| INC-00 - Estabilizacion fases 1 y 2 | Completo | Completo | **ACEPTADO (2026-10-06): 29/29 criterios, revision final sin bloqueantes** |
| INC-01 - Cierre de gaps G1-G4 (bloques 1-2) | Completo | Completo | **ACEPTADO (2026-10-07): 5/5 criterios, revision sin bloqueantes** |
| INC-02 - Congelacion de vigencias (HU-15 + HU-12 b2) | Completo | Completo | **ACEPTADO (2026-10-08): revision sin bloqueantes, +3.5 puntos** |
| INC-03 - Vencimiento, recepcion y portal (HU-16 + bloque 4) | Spec completo (40 criterios) | Sin ejecutar | **BLOQUEADO (2026-10-09): `INC03-PEND-01..08` sin resolver; sin puntos** |
| Fase 1 - Auth + clientes | Completo | Completo | Cerrado dentro de INC-00 (SEC-01..04, AUTH-01..07, CLI-01..05, QA-01..06) |
| Fase 2 - Sesion + membresia gym | Completo | Completo | Cerrado dentro de INC-00 (MEM-01..07) |
| MVP global | Parcial | Parcial | **30 de 100 puntos certificados (30%)** |

Nota sobre el porcentaje: INC-00, INC-01 e INC-02 tienen **peso 0 como incrementos** en `docs/producto/mvp.md`; los puntos salen de la auditoria `docs/producto/auditoria-puntos-inc00.md` (26.5 base, secciones 1-6), su ampliacion seccion 7 (2026-10-07, INC-01: +3) y la **seccion 8** (2026-10-08, INC-02: +3.5), que mapea HU <-> criterios <-> evidencia ejecutada (INC-00/01: API 252/252, web 118/118, Gherkin 63/63, E2E 25/25; INC-02: API 379/379, web 147/147, Gherkin 63/63, E2E 30/30) y reparte por fraccion los bullets de cada HU cerrados con especificacion, implementacion, prueba, evidencia y revision. La matriz de `docs/producto/mvp.md` quedo actualizada con el mismo desglose.

## Evidencia de verificacion (2026-10-06, reproducida por revision)

| Comando | Resultado |
|---|---|
| `club-beasts-api`: `npx tsc --noEmit` | 0 errores |
| `club-beasts-api`: `npx vitest run` | 16 archivos, **245/245** |
| `club-beasts-api`: `npm run test:gherkin` | **63/63**, exit 0 (guard anti-skip: exit 1 con alcance incompleto) |
| `club-beasts-api`: `npx prisma migrate status` | 5 migraciones, 0 pendientes; `migrate diff` sin drift |
| `club-beasts-web`: `npx tsc --noEmit` | 0 errores |
| `club-beasts-web`: `npx vitest run` | 14 archivos, **118/118** |
| `club-beasts-web`: `npm run build` | PASS |
| `club-beasts-web`: `npx playwright test` | **22/22** (incluye E2E real de membresia y de expiracion de sesion) |

Detalle y ciclo RED/GREEN: `docs/incrementos/INC-00-estabilizacion-fases-1-2/evidencia.md`.

## Evidencia de verificacion INC-01 (2026-10-07)

| Comando | Resultado |
|---|---|
| `club-beasts-api`: `npx tsc --noEmit` | 0 errores |
| `club-beasts-api`: `npx vitest run` | 17 archivos, **252/252** (base 245 + 7 nuevos de trazabilidad/ficha) |
| `club-beasts-api`: `npm run test:gherkin` | **63/63**, exit 0 (step C18 renombrado a lo que aserta) |
| `club-beasts-web`: `npx tsc --noEmit` | 0 errores |
| `club-beasts-web`: `npx vitest run` | 14 archivos, **118/118** |
| `club-beasts-web`: `npm run build` | PASS |
| `club-beasts-web`: `npx playwright test` | **25/25** (corrida final; 22 base + 3 de `acceso-roles.spec.ts`) |
| Revision `code-reviewer` | **5/5 ACEPTA, 0 bloqueantes**, NB-01..NB-05 |

RED registrado: 3 tests fallando antes del GREEN (`expected undefined to be '<actorId>'` y `membresias` inexistente). Detalle: `docs/incrementos/INC-01-cierre-gaps-bloque-1-2/evidencia.md`.

Nota de estabilidad (R-09): la primera ejecucion de `npx vitest run` (web) del 2026-10-06 a las 22:01, corriendo en paralelo con la bateria de la API, fallo 1 de 118 tests sin que se capturara el nombre. Las 18 corridas siguientes (6 seguidas, 1 con carga paralela reproducida, 8 con `--reporter=json` y 3 bajo carga API vitest + tsc + gherkin) dieron **118/118**. No se dio por cerrado: queda el riesgo R-09 para QA.

## Evidencia de verificacion (2026-10-09, backlog R-10 + INC02-R05)

Ejecutada por el orquestador tras los cambios de test y a11y; sin cambios de logica de negocio.

| Comando | Resultado |
|---|---|
| `club-beasts-api`: `npx tsc --noEmit` | 0 errores |
| `club-beasts-api`: `npx vitest run` | 21 archivos, **379/379** (base INC-02 intacta) |
| `club-beasts-api`: `npm run test:gherkin` | **63/63**, exit 0 |
| `club-beasts-web`: `npx tsc --noEmit` | 0 errores |
| `club-beasts-web`: `npx vitest run` | 16 archivos, **148/148** (147 base + 1 test a11y de INC02-R05) |
| `club-beasts-web`: `npm run build` | PASS |
| `club-beasts-web`: `npx playwright test` | **30/30** (1.9 min, exit 0) |

Ciclo RED/GREEN de R-10 (test-engineer): 3 corridas base 8/8 sin reproducir; RED forzada `npx playwright test tests/e2e/clientes.spec.ts:147 --repeat-each=6` -> **5 FAILED / 1 PASSED** (tabla vacia en pagina 2 y cedulas repetidas entre paginas); guard `toHaveCount(0)` solo -> 2/6 fallos (insuficiente); guard + `expect.poll` de contenido distinto a pagina 1 -> **0 fallos en 50 ejecuciones** (3x `--repeat-each=6` + 4 corridas del spec completo). Unico archivo tocado: `club-beasts-web/tests/e2e/clientes.spec.ts`.

Ciclo RED/GREEN de INC02-R05 (frontend-developer): test `el mensaje de error expone role='alert'` falla (`Unable to find role="alert"`) -> `role="alert"` anadido en `CongelacionForm.tsx:249` -> `npx vitest run tests/unit/congelacion-ui.test.tsx` **15/15**.

## Hallazgos que bloqueaban la aceptacion de fases 1 y 2

| ID | Hallazgo | Impacto | Estado (2026-10-06) |
|---|---|---|---|
| GAP-001 | Cliente autenticado podia consultar ficha ajena | Privacidad | **Cerrado** (SEC-01/02/03 aceptados) |
| GAP-002 | Reset de PIN sin trazabilidad de actor | Trazabilidad | **Cerrado** (SEC-04 aceptado: `pinResetPorId`/`pinResetAt` atomicos + prueba funcional) |
| GAP-003 | UI de clientes sin sede, paginacion ni limpieza de opcionales | Criterios CLI-02/03/05 | **Cerrado** (CLI-02/03/05 aceptados) |
| GAP-004 | Recuperacion de sesion no centralizada en el cliente HTTP | Seguridad y UX | **Cerrado** |
| GAP-005 | 401 concurrente o tardio fuera del contrato de fase 2 | Robustez de sesion | **Cerrado** (compuerta de trafico de sesion + cierre confirmado) |
| GAP-006 | Membresias con riesgo de concurrencia en solapamiento | Integridad de datos | **ABIERTO (R-01)**: SQLite no reproduce check-then-insert concurrente; falta constraint en Postgres |
| GAP-007 | PATCH de membresias permitia fecha vacia | Validacion | **Cerrado** (MEM-07 aceptado) |
| GAP-008 | Preset de 30 dias creaba 31 dias | Regla de negocio | **Cerrado** (MEM-06 aceptado: `fin = inicio + N - 1` + E2E) |
| GAP-009 | Sin E2E real de membresias ni de recuperacion de sesion | Evidencia | **Cerrado** (2 specs nuevos; el de sesion expuso y luego se corrigio un bug de cookie re-emitida) |
| GAP-010 | Tests con aserciones vacias o filtros sin datos | Confiabilidad | **Cerrado** (QA-01..QA-05 aceptados) |
| GAP-011 | Gherkin sin conectar como ATDD real | Proceso | **Cerrado** (QA-06 aceptado: 63/63 + guard) |
| GAP-012 | BD de pruebas sin aislar | Aislamiento | **Cerrado** |

## Riesgos residuales abiertos

| ID | Riesgo | Responsable |
|---|---|---|
| R-01 | Sin constraint de solapamiento a nivel de BD (GAP-006) | Backend + DBA |
| R-02 | Migraciones SQLite vs objetivo PostgreSQL | DevOps + DBA |
| R-03 | Determinismo de filtros/orden en Postgres | Backend |
| R-04 | Sin `setErrorHandler` global y un `parse` lanzado en `GET membresias` | Backend |
| R-06 | Sin ESLint/Prettier ni hooks git instalados | DevOps |
| R-07 | Compuerta de sesion con garantia mejor-esfuerza (timeouts 3 s / 10 s) | Frontend |
| R-08 | Sedes hardcodeadas en UI y secretos locales de E2E | Producto + Frontend |
| R-10 | Fallo flaky preexistente en `club-beasts-web/tests/e2e/clientes.spec.ts:147` (INC00-CLI-05) | test-engineer | **Cerrado (2026-10-09)**: reproducido a proposito (RED 5/6 con `--repeat-each=6`) y corregido con guard + `expect.poll` determinista; 0 fallos en 50 ejecuciones; ver evidencia arriba |
| R-11 | NB-02 de INC-01: el CLIENTE en su propia ficha ve `creadoPorId`/`actualizadoPorId` (ids de staff, sin nombre/email/hash). Contrato fijado en el spec de INC-01 y aceptado en revision; si Producto no lo quiere, excluirlos de la respuesta cuando el rol sea CLIENTE | Producto + Backend |
| INC02-R04 | Revision INC-02 (BAJO): sin escenario E2E para `PATCH .../congelacion` (editar pausa); cubierto con 35/35 integracion + 14 unit de UI. No exigido por el criterio (unit+integracion) | test-engineer (si Producto exige UI) |
| INC02-R05 | Revision INC-02 (BAJO, a11y): el mensaje de error de `CongelacionForm.tsx` no tiene `role="alert"` | frontend-developer | **Cerrado (2026-10-09)**: test RED + `role="alert"` en la linea 249; `congelacion-ui.test.tsx` 15/15 |
| R-09 | Un fallo intermitente sin capturar: la primera ejecucion de `npx vitest run` (web) del 2026-10-06 a las 22:01, bajo carga paralela (API vitest + tsc + gherkin), fallo 1 de 118 tests; no se registro el nombre. Las 18 corridas siguientes (incluida la reproduccion con carga paralela) dieron 118/118 | QA debe capturar con `--reporter=json` en CI antes de dar por cerrada la estabilidad de la suite |
| D2 | `features.test.ts` heredado duplica escenarios Gherkin | QA + Orquestador |

## Tabla de avance por bloque

| Bloque | Peso | Estado actual | Puntos aceptados |
|---|---:|---|---:|
| Identidad, sesiones y permisos | 10 | INC-00 + INC-01 aceptados. HU-01 4/4 (E2E `acceso-roles.spec.ts`), HU-02 4/4, HU-03 4/4 | **10** |
| Clientes, sedes, estados y ficha basica | 15 | INC-00 + INC-01 aceptados. HU-04 4/4 y HU-05 4/4 (trazabilidad asertada en respuesta y BD), HU-06 4/4, HU-07 3/6 (transversal; FIC-02 solo es base del bullet 4), HU-08 0, HU-17 0 | **12** |
| Vigencias de servicios y congelacion | 15 | INC-02 aceptado (2026-10-08): HU-12 4/4 (bullet de estado congelado cerrado con `CONGELADO` en API/UI), HU-15 4/4 (b1 enmendado DEC-023: GYM + PERSONALIZADO); HU-13/HU-14 requieren asignaciones; HU-16 pendiente INC-03 | **8** |
| Recepcion, ingresos y portal operativo | 10 | Confirmado sin codigo (HU-25, HU-29, HU-30, HU-31) | 0 |
| Anamnesis y privacidad | 12 | Pendiente | 0 |
| Rutinas, asignacion e historial | 18 | Pendiente | 0 |
| Nutricion, asignacion e historial | 12 | Pendiente | 0 |
| Historial, reportes y notificaciones | 8 | Pendiente | 0 |
| **Total aceptado certificado** | **100** | Auditoria `docs/producto/auditoria-puntos-inc00.md` + ampliaciones INC-01 (seccion 7) e INC-02 (seccion 8) | **30** |

## Siguiente accion concreta

Actualizacion 2026-10-09: **`INC-03-vencimiento-recepcion-portal` esta BLOQUEADO** en la puerta de entrada. El spec, los 40 criterios y la plantilla de evidencia estan escritos; 33 criterios ya estan desbloqueados. Para desbloquear:

1. **Producto**: resolver `INC03-PEND-01..08` (una sola pasada; opciones ya formuladas en el spec y replicadas en `decisiones.md`). Es la unica decision que falta para abrir la ejecucion.
2. **backend-developer**: ratificar el contrato API del spec (paths, cuerpos, errores, orden de evaluacion).
3. **Orquestador**: pasar INC-03 a `LISTO`, habilitar RED y ejecutar el plan de `tareas.md` (tareas 12-21) hasta la revision.

Backlog ya cerrado en esta fecha: R-10 y INC02-R05 (evidencia arriba). Riesgos abiertos restantes sin dueno asignado nuevo: R-01..R-04, R-06..R-09, R-11, INC02-R04, D2.

Actualizacion 2026-10-08 (cierre): **`INC-02-congelacion-hu-15` ACEPTADO** con el pipeline completo (RED 121/127, migracion `20261008184627`, GREEN API 379/379 + web 147/147, E2E 5/5 y bateria 30/30 x2, revision `code-reviewer` sin hallazgos bloqueantes). **+3.5 puntos certificados: 26.5 -> 30 de 100 (30%)**. Decisiones del ciclo: DEC-022 (reglas de rango), DEC-023 (GYM + PERSONALIZADO; NUTRICION fuera, riesgo HU-14 en INC-05), DEC-024 (descongelar/editar, 0 puntos), DEC-025 (sin bloqueo de acceso). Siguiente incremento natural: **`INC-03`** (HU-16 + bloque 4, +11).

Gaps priorizados que desbloquean mas puntos (detalle en `auditoria-puntos-inc00.md`):

| # | Gap | Puntos que desbloquea | Responsable | Estado |
|---:|---|---:|---|---|
| G1 | Sin test del guard de rol en UI | +1 (HU-01) | QA + Frontend | **Cerrado (INC-01, 2026-10-07)** |
| G2 | Trazabilidad de cliente escrita pero sin asertar | +2 (HU-04, HU-05) | Backend + QA | **Cerrado (INC-01, 2026-10-07)** |
| G3 | Step Gherkin enganoso de HU-07 | Higiene | QA + Analista | **Cerrado (INC-01, 2026-10-07)** |
| G4 | Ficha sin relacion `membresias` | Base de HU-07/bloques 3 y 5-7 | Backend | **Parcial (INC-01): `membresias` GYM expuesta y probada; faltan personalizado/nutricion, notas e historial** |
| G5 | Sin estado `CONGELADO` / HU-15 | +3.5 | Backend + DBA + Frontend | **Cerrado (INC-02, 2026-10-08)**: estado `CONGELADO`, congelar/descongelar/editar, UI y E2E; revision sin bloqueantes; +3.5 certificados |
| G6..G9 | HU-13/HU-14/HU-16/HU-08/HU-17 | +9 | Producto + Backend + Frontend | **Criterios G14 ya escritos** (paquete completo 2026-10-08, ver auditoria) y decisiones DEC-018/019/020 resueltas; faltan los incrementos: INC-03 (BLOQUEADO por INC03-PEND-01..08), INC-04 e INC-05 |

Ruta al corte del 50% fijada el 2026-10-08 y actualizada con el cierre de INC-02 (30 + 20 = 50; proyeccion, no avance aceptado):

| INC | Alcance | Puntos | Bloqueado por |
|---|---|---:|---|
| INC-02 | G5 congelacion (HU-15 + HU-12 b2) | +3.5 | **ACEPTADO (2026-10-08)** — cerrado, fuera de la ruta restante |
| INC-03 | HU-16 (G7) + bloque 4 completo (HU-25/29/30/31) | +11 | **BLOQUEADO (2026-10-09)**: spec creado y criterios G14 escritos; faltan `INC03-PEND-01..08` (Producto) y ratificacion de contrato (backend) |
| INC-04 | HU-08 + HU-17 | +2 | Criterios escritos (G14); DEC-020 resuelta; pendiente crear el incremento |
| INC-05 | HU-13 + HU-14 (+ cierre de HU-07 si procede) | +6 y el resto hasta 50 | Criterios escritos (G14); DEC-018/019 resueltas; pendiente crear el incremento |

Nota DEC-021: HU-07 no se cierra con anamnesis minima; si INC-05 no alcanza los 50, el punto restante se busca en el incremento de anamnesis (bloque 5), donde antes hay que resolver los campos de PEND-003.

Decisiones de producto pendientes: solo **PEND-003** (campos de anamnesis; ruta decidida en DEC-021, se resuelve al especificar el incremento de bloque 5).
