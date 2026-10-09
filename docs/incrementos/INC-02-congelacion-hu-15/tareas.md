# INC-02 - Tareas

## Estado

Estado actual: **ACEPTADO** (2026-10-08). Pipeline completo: LISTO -> RED (121/127 rojos, base 252/252 intacta) -> IMPLEMENTADO (migracion `20261008184627`, GREEN backend 379/379, GREEN web 147/147 + build PASS) -> VERIFICADO (E2E `congelacion.spec.ts` 5/5, bateria completa en verde, Playwright 30/30 x2) -> REVISADO (`code-reviewer`: **SIN HALLAZGOS BLOQUEANTES**, ejes 1-7 cumplidos) -> ACEPTADO (+3.5 certificados). H-01 (test contradictorio) resuelto durante el ciclo. Evidencia completa en `evidencia.md`.

## Backlog operativo

| # | Tarea | Criterios | Agente | Prioridad | Estado |
|---:|---|---|---|---|---|
| 1 | Generar `HU-15-criterios-aceptacion.md` + `HU-15-schemas.ts` (G14) y resolver la opcion del "Riesgo de alcance" del spec | INC02-CON-01..06 | acceptance-criteria-analyst | Alta | **Completada (2026-10-08)**: `HU15-C01..C06` + 19 escenarios Gherkin en borrador; `HU16-C01..C04` + 10 escenarios (paquete G14 completo: 20 archivos `HU-08/13/14/15/16/17/25/29/30/31`); `tsc --strict` OK en schemas. Decision de alcance de `HU15-C01` **pendiente en la puerta LISTO** (opcion 1 fixture 3 tipos vs opcion 2 cierre parcial) |
| 2 | Formalizar spec con contrato API final y pasar a ESPECIFICADO -> LISTO (puerta de entrada) | Todos | Orquestador | Alta | **Completada (2026-10-08)**: contrato fijado por backend-developer (path `POST /clientes/:clienteId/vigencias/:vigenciaId/congelar`, body con `version`, errores 400/403/404/409 y orden de evaluacion), modelo (extender `MembresiaGymCambio` + `tipoServicio`), fixtures F1-F7; 10/10 ajustes de criterios aplicados por el analista; estado LISTO |
| 3 | Tests RED de congelacion: unit de calculo de fechas/estado, integracion de API (validaciones, permisos, 409) | INC02-CON-02..06, HU15-C07/C08 | test-engineer | Alta | **Completada (2026-10-08)**: 4 archivos, 127 tests, RED capturado **121 fallando / 127** con base 252/252 intacta; evidencia en `evidencia.md` |
| 4 | Modelo de congelacion + migracion Prisma + seed/fixture | INC02-CON-01..04 | database-admin | Alta | **Completada (2026-10-08)**: `tipoServicio` + `motivo`/`congelacionInicio`/`congelacionFin`; migracion `20261008184627_add_congelacion_hu15` SQL portable (ADD COLUMN puro); status 6/0, sin drift, `tsc` 0, suite base 252/252 |
| 5 | GREEN backend: endpoint de congelacion, reglas de extension de `fechaFin`, permisos, auditoria | INC02-CON-01..06, HU15-C07/C08 | backend-developer | Alta | **Completada (2026-10-08)**: 3 endpoints + formula DEC-024 + acciones de auditoria + `CONGELACION_INEXISTENTE`; **379/379**, `tsc` 0, Gherkin 63/63 |
| 6 | GREEN frontend: badge `CONGELADO` + accion de congelar en la ficha (sede de membresia) | INC02-CON-03, 05 | frontend-developer | Alta | **Completada (2026-10-08)**: badge/rango/acciones gated por rol, `CongelacionForm.tsx`, API client, 29 tests web nuevos; web **147/147**, `tsc` 0, `build` PASS. Desviacion de archivos a revisar: `CongelacionForm.tsx` y `src/lib/api.ts` autorizados por el contrato de tarea |
| 3b | Fix H-01 (test contradictorio de `fechaFinTrasEdicion`) | HU15-C08 | test-engineer | Alta | **Completada (2026-10-08)**: adjudicado contra el spec (caso limite 7 correcto); test corregido con aritmetica local; **379/379**, `tsc` 0 |
| 7 | E2E del flujo de congelacion (ficha -> congelar -> estado y vencimiento extendido) | INC02-CON-03, 04 | test-engineer | Media | **Completada (2026-10-08)**: `tests/e2e/congelacion.spec.ts` (5 tests: flujo feliz congelar, pausa futura, descongelar, 409 por version, permisos DEC-017); **5/5** dirigido y **30/30** en suite completa x2 |
| 8 | Bateria completa API + web + E2E y registro en `evidencia.md` | Todos | test-engineer | Alta | **Completada (2026-10-08)**: API 379/379 + tsc 0 + Gherkin 63/63; web tsc 0 + 147/147 + build PASS; Playwright 30/30 x2; R-10 no se reprodujo; todo en `evidencia.md` |
| 9 | Revision de seguridad, permisos y calidad de pruebas | Todos | code-reviewer | Alta | **Completada (2026-10-08)**: **SIN HALLAZGOS BLOQUEANTES**; ejes 1-7 cumplidos (seguridad, concurrencia, reglas de negocio, BD, frontend, pruebas, integridad de proceso); hallazgos no bloqueantes R-01/R-02 (docs, cerrados aqui), R-03 (R-10 residual), R-04 (E2E de edicion no exigido), R-05 (a11y `role="alert"`, backlog) |
| 10 | Actualizar `avance.md`, `mvp.md` y auditoria con puntos aceptados (+3.5) solo si la revision no bloquea | HU-15, HU-12 b2 | Orquestador | Alta | **Completada (2026-10-08)**: revision sin bloqueantes -> certificados **+3.5** (HU-15 4/4 = 2.0 + HU-12 b2 = 1.5); `mvp.md` 26.5 -> **30**, `avance.md` bloque 3 4.5 -> **8**, auditoria seccion 8 |
| 11 | Criterios de la ampliacion DEC-024: `descongelar` y `editar congelacion` (+ cerrar abiertos #7/#8 con DEC-024/025 en el doc) | Nuevos HU15-C07/C08 (0 puntos) | acceptance-criteria-analyst | Alta | **Completada (2026-10-08)**: `HU15-C07` (cobertura D1..D20) y `HU15-C08` (E1..E20), 8/8 ajustes aplicados, abiertos #7/#8 cerrados, expectativa DEC-025 en C03, `tsc --strict` 0 errores |
| 12 | Contrato de la ampliacion DEC-024 en el spec (endpoints, body, errores, regla de dias) | Nuevos HU15-C07/C08 | backend-developer | Alta | **Completada (2026-10-08)**: `POST .../descongelar` y `PATCH .../congelacion`, codigo nuevo `409 CONGELACION_INEXISTENTE`, formula de dias, acciones `DESCONGELACION`/`EDICION_CONGELACION`, fixtures F8..F11, seccion de ajustes para el analista; ratificada por el orquestador |

## Orden recomendado

1. #1 y #2 en paralelo con la generacion del resto del paquete G14 (no bloquea este incremento).
2. #3 (RED) antes de #4/#5/#6.
3. #4 -> #5 -> #6.
4. #7 -> #8 -> #9 -> #10.

## Archivos permitidos por agente

- `acceptance-criteria-analyst`: `club-beasts-api/features/acceptance-criteria/HU-15-*` (nuevo). No toca `features/*.feature` ni `steps/` (los escenarios Gherkin los agrega test-engineer en el RED).
- `test-engineer`: `club-beasts-api/tests/integration/membresia-congelacion.test.ts` (nuevo), `club-beasts-api/tests/unit/membresia-logic.test.ts` (solo si hace falta), `club-beasts-web/tests/e2e/congelacion.spec.ts` (nuevo), `docs/incrementos/INC-02-*/evidencia.md`.
- `database-admin`: `club-beasts-api/prisma/schema.prisma`, migracion nueva, seed/fixtures.
- `backend-developer`: `club-beasts-api/src/routes/membresia.ts`, `src/services/membresia.service.ts`, `src/schemas/membresia.schema.ts`.
- `frontend-developer`: `club-beasts-web/src/components/MembershipSection.tsx`, `src/components/CongelacionForm.tsx` (nuevo, autorizado por el contrato de la tarea 6), `src/app/clientes/[id]/page.tsx` (solo seccion de membresia), `src/lib/membresia-fechas.ts`, `src/lib/api.ts` (autorizado por el contrato de la tarea 6; desviacion R-02 de la revision, documentada).

## Fuera de este incremento (no tocar)

- Cualquier archivo de bloques 4-8, anamnesis, rutinas, planes, notificaciones.
- `routes/auth`, `auth.service.ts` (HU-08/HU-16 van en INC-03/INC-04).
- Riesgos globales R-01/R-02/R-04/R-06 (backlog aparte).

## Riesgos

| Riesgo | Mitigacion |
|---|---|
| HU-15 b1 pide los 3 tipos de servicio y solo existe GYM | Resolver en la puerta LISTO (opcion 1 u 2 del spec) y registrarlo |
| El estado `CONGELADO` choca con `calcularEstado` actual (`membresia.service.ts:18-26`) | Pruebas RED primero; no romper los 31 tests de membresia ya aceptados |
| Extension de `fechaFin` puede duplicar dias si se aplica dos veces | Regla explicita en criterios + prueba de doble congelacion consecutiva |
