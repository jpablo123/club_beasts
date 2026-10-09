# INC-00 - Tareas

## Estado

Estado actual: **ACEPTADO** (2026-10-06). Los 29 criterios de `spec.md` estan aceptados con revision final sin hallazgos bloqueantes (`evidencia.md`).

Decisiones y resoluciones registradas durante el incremento:

- `DEC-012`: SQLite aislado por ejecucion para pruebas automatizadas.
- `DEC-013`: fixtures deterministas por suite con limpieza automatica.
- `DEC-014`: alcance Gherkin de INC-00 definido en `gherkin-alcance.md` (auth 28 + clientes 35 = 63; membresia fuera).
- `D3` (resuelta por el orquestador, 2026-10-06): el mensaje de validacion de nombres/apellidos se alinea al criterio HU-04 (`Nombres/Apellidos solo pueden contener letras y espacios`) corrigiendo el producto, no el feature. Dejo `test:gherkin` en 63/63.
- `D1` (aplicada): alcance Gherkin acotado a los 37 escenarios ya incluidos; SEC-01/02 y AUTH-02/03/05/06/07 quedan cubiertos por integracion/E2E, no por Gherkin.
- `D2` (pendiente, no bloqueante): decidir si se migra/elimina `tests/integration/features.test.ts` (runner heredado que duplica escenarios).

## Backlog operativo

| # | Tarea | Agente | Prioridad | Estado |
|---:|---|---|---|---|
| 1 | Auditar criterios INC00 contra codigo actual con rutas y lineas | acceptance-criteria-analyst | Alta | Completado |
| 2 | Definir fixtures y aislamiento de BD de pruebas | database-admin + test-engineer | Alta | Completado: re-revision final no bloquea INC00-QA-04/05 |
| 18 | Adaptar setup SQLite aislado con seed deterministico o fixtures para suites antiguas | test-engineer + database-admin | Alta | Completado |
| 3 | Escribir pruebas de privacidad para ficha de cliente | test-engineer | Alta | Completado |
| 4 | Corregir autorizacion de ficha por propietario | backend-developer | Alta | Completado |
| 5 | Escribir pruebas de recuperacion centralizada de sesion | test-engineer | Alta | Completado |
| 6 | Conectar cliente HTTP con recuperacion de sesion | frontend-developer | Alta | Completado |
| 7 | Corregir pruebas debiles y aserciones vacias | test-engineer | Alta | Completado |
| 8 | Escribir pruebas de concurrencia de membresia | test-engineer | Alta | Completado |
| 9 | Corregir validaciones y transaccion atomica de membresia | backend-developer + database-admin | Alta | Completado |
| 10 | Ajustar UI de membresias para duracion inclusiva (GAP-008, MEM-06) | frontend-developer | Media | **Completado (2026-10-06)**: `membresia-fechas.ts` con `fin = inicio + N - 1`; RED 8/8 -> GREEN; E2E aserta 30 dias inclusivos |
| 11 | Completar filtros/sede/paginacion y limpieza de opcionales (GAP-003, CLI-02/03/05) | frontend-developer | Media | **Completado (2026-10-06)**: filtro de sede, paginacion real, selects de sede/estado y limpieza intencional; web 118/118 |
| 12 | Reparar runner Gherkin para los escenarios incluidos (QA-06, GAP-011) | test-engineer | Media | **Completado (2026-10-06)**: script `test:gherkin`, R1-R8 cerrados, 63/63 exit 0 + guard anti-skip exit 1 |
| 13 | Ejecutar verificacion completa API + web + E2E | test-engineer | Alta | **Completado (2026-10-06)**: API 245/245, Gherkin 63/63, web 118/118, build OK, E2E 22/22, tsc 0/0, migrate 5/0 |
| 14 | Revision final de seguridad, concurrencia y pruebas | code-reviewer | Alta | **Completado (2026-10-06)**: 29/29 ACEPTA, 0 bloqueantes, NB-01..NB-12 |
| 15 | Actualizar avance aceptado del MVP | Orquestador | Alta | **Completado (2026-10-06)**: `evidencia.md` y `avance.md` consolidados |
| 16 | Completar cobertura de privacidad: CLIENTE no lista clientes y no hay fuga de PIN/hash | test-engineer + backend-developer | Alta | Completado |
| 17 | Corregir etiquetas de criterios en pruebas de privacidad | test-engineer | Media | Completado |
| 19 | Reparar E2E web: selectores/textos y entorno backend/fixtures | test-engineer + frontend-developer + devops-engineer | Alta | Completado |
| 20 | Cerrar B1/B2 de revision: banner de sesion expirada y retorno/carrera de navegacion | frontend-developer | Alta | Completado |
| 21 | Esquema de trazabilidad de reset de PIN (SEC-04, GAP-002) | database-admin | Alta | **Completado (2026-10-06)**: `pinResetPorId`/`pinResetAt` + migracion `20261006235238`, status 5/0, sin drift |
| 22 | Implementar reset de PIN con actor + prueba de trazabilidad funcional (SEC-04) | backend-developer | Alta | **Completado (2026-10-06)**: RED 2/4 -> GREEN 4/4 |
| 23 | Resolver D3: mensaje de validacion de nombres/apellidos (desbloquea QA-06) | backend-developer | Alta | **Completado (2026-10-06)**: Gherkin 61/63 -> 63/63 exit 0 |
| 24 | Validar sede inexistente en POST/PATCH de clientes sin fuga interna (CLI-01) | backend-developer | Alta | **Completado (2026-10-06)**: RED 2/29 -> GREEN 29/29; 400 sin `P2003` ni rutas |
| 25 | E2E real de membresia y de expiracion de sesion (GAP-009) | test-engineer | Alta | **Completado (2026-10-06)**: `membresia.spec.ts` y `sesion-vencida.spec.ts`; expuso el bug de cookie re-emitida |
| 26 | Corregir recuperacion de sesion con E2E en rojo (AUTH-02/03) | frontend-developer | Alta | **Completado (2026-10-06)**: compuerta `session-traffic.ts` + cierre confirmado; E2E 22/22 |

## Orden recomendado (seguido)

1. Seguridad y privacidad primero.
2. Aislamiento de pruebas antes de ampliar suites dependientes de BD.
3. Tests RED antes de corregir backend/frontend.
4. Concurrencia de membresias antes de certificar fase 2.
5. E2E y build al final del incremento.

## Riesgos abiertos tras el cierre

| Riesgo | Mitigacion |
|---|---|
| Concurrencia no es fiable con SQLite y no hay constraint en BD (GAP-006 / R-01) | Definir estrategia de exclusion en Postgres antes de produccion; mantener GAP-006 abierto |
| Migraciones SQLite vs objetivo PostgreSQL (R-02) | Regenerar/validar historial contra Postgres antes de desplegar |
| D2: `features.test.ts` heredado duplica escenarios Gherkin | Decidir migracion/eliminacion; no bloquea INC-00 |
| Sin ESLint/Prettier ni hooks git (R-06) | Backlog de devops |
| PEND-002..006 sin resolver | Bloquean el avance al 50% fuera de INC-00, no el cierre de este incremento |
