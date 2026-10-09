# INC-01 - Tareas

## Estado

Estado actual: **ACEPTADO** (2026-10-07). 5/5 criterios con revision de `code-reviewer` sin hallazgos bloqueantes (`evidencia.md`); puntos certificados en `docs/producto/avance.md` y `mvp.md` (23.5 -> 26.5) con trazabilidad en la seccion 7 de `docs/producto/auditoria-puntos-inc00.md`.

## Backlog operativo

| # | Tarea | Agente | Criterios | Prioridad | Estado |
|---:|---|---|---|---|---|
| 1 | Escribir E2E `acceso-roles.spec.ts` (CLIENTE -> `/clientes` redirige a `/portal`; RECEPCIONISTA accede y ve modulos) y ejecutarlo capturando resultado | test-engineer | INC01-ROL-01 | Alta | **Completada** (2026-10-07): 3 tests; `npx playwright test` verde en las 3 corridas completas, corrida final **25/25 EXIT=0** (base 22 + 3) |
| 2 | Escribir pruebas de integracion de trazabilidad: `POST` y `PATCH` de clientes asertando `creadoPorId`/`actualizadoPorId`/`updatedAt` en respuesta y BD; ejecutar y capturar RED | test-engineer | INC01-TRZ-01, INC01-TRZ-02 | Alta | **Completada** (2026-10-07): RED capturado (**3 failed / 7** en el archivo; **3 failed / 249 passed** en suite); ahora verde: `npx vitest run` **252/252** |
| 3 | Renombrar step C18 a lo que aserta (`features/clientes.feature` + `features/steps/clientes.steps.ts`); `npm run test:gherkin` 63/63 exit 0 | test-engineer | INC01-FIC-01 | Alta | **Completada** (2026-10-07): step = `Then la ficha muestra datos personales, sede y estado`; `npm run test:gherkin` **63/63 EXIT=0** con guard anti-skip |
| 4 | Prueba RED de `membresias` en `GET /clientes/:id` | test-engineer | INC01-FIC-02 | Media | **Completada** (2026-10-07): RED capturado (3er fallo del archivo: `Target cannot be null or undefined`); ahora verde en **252/252** (incluye asercion de que el listado no expone `membresias`) |
| 5 | Exponer `creadoPorId`/`actualizadoPorId` en `selectCliente` y `membresias` en `getClienteById` (solo ficha), sin exponer datos del usuario interno mas alla del id | backend-developer | INC01-TRZ-01/02, INC01-FIC-02 | Alta | **Completada (2026-10-07)**: `src/services/cliente.service.ts` unico archivo tocado; `npx vitest run` 252/252, `npx tsc --noEmit` 0 errores, `npm run test:gherkin` 63/63 exit 0; revision NB-03 (no bloqueante) |
| 6 | Bateria completa API + web + E2E y registro en `evidencia.md` | test-engineer | Todos | Alta | **Completada** (2026-10-07): 6 comandos ejecutados — playwright 25/25 (corrida final; ver detalle de corridas 1-2 con fallo flaky preexistente en `evidencia.md`), web vitest 118/118, web build PASS, api vitest 252/252, api tsc 0, gherkin 63/63 |
| 7 | Revision de seguridad/privacidad/calidad | code-reviewer | Todos | Alta | **Completada (2026-10-07)**: **5/5 ACEPTA, 0 bloqueantes**; NB-01..NB-05 (NB-05 = flake preexistente, dictamen no bloqueante); reprodujo api 252/252 + tsc 0 + Gherkin 63/63 y web 118/118 + tsc 0 |
| 8 | Actualizar `docs/producto/avance.md` y `mvp.md` con puntos certificados | Orquestador | INC01-ROL-01, TRZ-01/02 | Alta | **Completada (2026-10-07)**: 23.5 -> **26.5**; `mvp.md` bloques 1 y 2, `avance.md` (evidencia INC-01, riesgos R-10/R-11, siguiente accion) y `auditoria-puntos-inc00.md` seccion 7 |

## Orden recomendado

1. Tareas 1-4 en paralelo sobre archivos disjuntos (RED y step).
2. Tarea 5 (GREEN) apenas las pruebas RED esten registradas.
3. Tareas 6-8 secuenciales.

## Archivos permitidos por agente

- `test-engineer`: `club-beasts-web/tests/e2e/acceso-roles.spec.ts` (nuevo), `club-beasts-api/tests/integration/clientes-trazabilidad.test.ts` (nuevo), `club-beasts-api/features/clientes.feature`, `club-beasts-api/features/steps/clientes.steps.ts`, `docs/incrementos/INC-01-*/evidencia.md`.
- `backend-developer`: `club-beasts-api/src/services/cliente.service.ts`, si hace falta `club-beasts-api/src/routes/clientes.ts` y tipos web de soporte en `club-beasts-web/src/app/clientes/[id]/page.tsx` (solo tipo, sin UI nueva).

## Riesgos

| Riesgo | Mitigacion |
|---|---|
| E2E de roles depende de login de cliente (cedula+PIN) ya cubierto en `portal.spec.ts` | Reutilizar flujo del spec existente |
| Exponer ids de usuarios podria verse como fuga | Solo id, sin nombre/email; SEC-03 no cubre ids de staff |
| Sumar `membresias` al select compartido encarece el listado | Relacion solo en `getClienteById` |
| Fallo flaky **preexistente** en `club-beasts-web/tests/e2e/clientes.spec.ts:147` (INC00-CLI-05): 2 de 3 corridas de la suite completa dieron 24/25, la 3ra dio 25/25 (carrera en el test: lee `allTextContents()` sin esperar el refetch de la pagina 2; ver diagnostico en `evidencia.md`) | Reportado; corregir en el dueño del spec con `await expect(page.getByText("Cargando clientes...")).toHaveCount(0)` antes de leer la tabla. No bloquea los criterios de INC-01; puede volver a fallar corridas futuras de E2E hasta corregirse |
