# INC-09 - Tareas

Estado: ESPECIFICADO (2026-11-04). Pipeline: ratificacion de contratos -> LISTO -> RED -> GREEN -> VERIFICADO -> auditoria navegacion -> REVISADO -> ACEPTADO.

## Ratificacion de contratos (paralelo, solo analisis)

- [x] R1 `backend-developer`: **RATIFICA CON CORRECCIONES R1..R8** (2026-11-04, sin bloqueos): PATCH no PUT, SIN_REGISTRO 200+marcador, semantica merge `null`=limpiar/ausente=mantener, AN-05/AN-07 re-escopados a schema, DEC-055=5 sensibles, CLIENTE agrupado S1-S4, orden de errores por endpoint, payload escritura vista DUENO; modelo Prisma `Anamnesis` 1:1 (multi-selects JSON-string), migracion 9/0->10/0; endpoint 1b `GET /portal/anamnesis`.
- [x] R2 `frontend-developer`: **RATIFICA CON CORRECCIONES C1..C9** (2026-11-04): seccion ficha montaje bajo demanda (anti-interferencia), pagina nueva `/portal/anamnesis`, form parcial + `null` explicito (C3a=R3), RECEP por presencia de clave (19/23 campos), "Descartar cambios" con alertdialog + banner, C6 resuelta por DEC-056a, localizadores C4 con substrings prohibidos, responsive/foco, `GET /portal/anamnesis` (C9).
- [x] R3 Orquestador: correcciones incorporadas al spec; DEC-056a y DEC-060 registradas; **puerta LISTO CERRADA 2026-11-04**.

## RED - test-engineer

- [ ] T1 Re-medir base (API 658, Gherkin 220, web 215, E2E 122, migraciones 9/0) y registrar.
- [ ] T2 Enmienda C4 de `features/acceptance-criteria/HU-10-schemas.ts` + `.md` por DEC-055 (rh -> SENSIBLE; omit de 5 campos), documentada.
- [ ] T3 Tests API en rojo AN-01..AN-27 (registro, permisos por rol, filtro sensibles, guardado parcial, trazabilidad).
- [ ] T4 Tests web unit en rojo AN-28..AN-33 + UI de ficha/portal.
- [ ] T5 E2E en rojo filas NAV-AN-01..08.
- [ ] T6 Gherkin: si se anaden features, actualizar guard al alza (nunca bajar); cableado ATDD.
- [ ] T7 Calidad del rojo verificada (solo comportamiento ausente).

## GREEN - database-admin + backend-developer + frontend-developer (secuencial por dependencia)

- [x] T8 `database-admin`: modelo `Anamnesis` 1:1 `Cliente` + migracion `20261104224741_add_anamnesis` (**9/0 -> 10/0 sin drift**, dos diffs "No difference detected").
- [x] T9 `backend-developer`: endpoints 1-3 + `GET /portal/anamnesis`, validacion (copia `src/schemas/anamnesis.schema.ts`), filtro por rol (whitelist), estado derivado, merge R3/C3a, orden R7 — **API 807/807**, spot-check 20/20.
- [x] T10 `frontend-developer`: seccion ficha (montaje bajo demanda, editor solo DUENO), `/portal/anamnesis` (gate DEC-060 + guarda PIN), prefill 1/2/9/10 (DEC-056a), C4/C5/C7/C8 — **E2E 135/135**, build PASS, tsc 0.
- [x] T11 Tests del RED en verde — API 104/104, web 87/88 (1 fixture -> **INC09-FIX-01**), E2E 13/13.

## FIX - test-engineer

- [ ] F1 **INC09-FIX-01**: enmienda C4 de `inc09-anamnesis-schemas-paridad.test.ts` (fixture `"Ganar"` 5 chars es valido por `min(5)` inclusivo -> `"Gana"`), documentada. En curso (2026-11-04).

## VERIFICADO - test-engineer

- [x] T12 Bateria completa x2 identicas + logs en `%TEMP%\opencode\` — **API 807/807 x2, Gherkin 220/220 x2, web 303/303 x2, E2E 135/135 x2** (16 logs `inc09-verificado-run{1,2}-*`).

## FIX - test-engineer / frontend-developer

- [x] F1 **INC09-FIX-01**: fixture paridad `"Ganar"`->`"Gana"` (enmienda C4). CERRADO.
- [x] F2 **INC09-FIX-02**: flaky `membresia.spec.ts` (patron R-10). CERRADO (0/12 repeat + 135/135).
- [x] F3 **INC09-FIX-03**: viajes NAV-F-01/02/04/05/06 (7 verdes) + NAV-F-03 parcial. CERRADO.
- [x] F4 **NAV-F-03b** (frontend): foco inicial del alertdialog (contenedor `tabindex=-1`). CERRADO (143/143).
- [x] F5 **INC09-FIX-04**: flaky de base `inc06-acceso-membresia.spec.ts:358` (H-REV-01). CERRADO (143/143 final).

## Navegacion

- [x] T13 `ui-navigation-auditor`: NAV-AN-01..09 **VERIFICADO** (evidencia ejecutada); NAV-F-01..06 cerrados; privacidad DEC-055/DEC-041 y gate DEC-060 verificados en dos capas.

## REVISADO - code-reviewer

- [x] T14 **ACEPTA CON HALLAZGOS NO BLOQUEANTES** (2026-11-05; 7/7 CONFORME; H-REV-01/02 cerrados antes del cierre; H-REV-03..08 backlog/gestion).

## Gestion - delivery-orchestrator

- [x] T15 Trazabilidad de puntos en `auditoria-puntos-inc00.md` **seccion 12** (reparto HU-09 4 + HU-10 4 + HU-11 2 + HU-28 2; no-duplicado 1-10/HU-07 b4/DEC-060).
- [x] T16 `avance.md` y `mvp.md` actualizados: **61/100 (61%) — corte al 50% SUPERADO**. DEC-061 registrada.
