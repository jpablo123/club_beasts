# INC-10 - Tareas

Estado: **ACEPTADO** (2026-11-18; ver `evidencia.md` §8). Pipeline completo: ratificacion de contratos -> LISTO -> RED -> GREEN -> VERIFICADO (INC10-VER-FINAL) -> auditoria navegacion (NAV-RU 24 plenos) -> REVISADO -> ACEPTADO -> reparto de puntos §13.

## Ratificacion de contratos (paralelo, solo analisis)

- [x] R1 `backend-developer`: ratifica contrato API (endpoints 1-8, orden de errores, DELETE de rutinas, regla DEC-066, snapshot, modelos Prisma `Rutina`/`RutinaAsignacion` — JSON vs normalizado).
- [x] R2 `frontend-developer`: ratifica contrato web (formularios por tipo, arbol macro-meso-micro, `/portal/rutina`, gate, historial ficha, matriz NAV-RU y C7).
- [x] R3 Orquestador: incorpora correcciones, re-escopos de matriz y cierra puerta LISTO.

## RED - test-engineer

- [x] T1 Re-medir base (API 807, Gherkin 220, web 303, E2E 143, migraciones 10/0).
- [x] T2 Tests API en rojo RU-01..RU-35 (CRUD, asignacion, vigencia, snapshot, historial).
- [x] T3 Tests web unit en rojo RU-36..RU-42 + formularios.
- [x] T4 E2E en rojo NAV-RU-01..22.
- [x] T5 Gherkin opcional (guard al alza si se anaden features) + calidad del rojo.

## GREEN - database-admin + backend-developer + frontend-developer

- [x] T6 `database-admin`: modelos `Rutina` + `RutinaAsignacion` + migracion (10/0 -> 11/0 sin drift).
- [x] T7 `backend-developer`: endpoints, validacion canonica, invariante 0-1 activas, snapshot, exposicion DEC-066.
- [x] T8 `frontend-developer`: gestion staff + `/portal/rutina` + ficha (historial).
- [x] T9 Tests del RED en verde sin tocar aserciones.

## VERIFICADO / Navegacion / REVISADO / Gestion

- [x] T10 `test-engineer`: bateria x2 identicas + logs.
- [x] T11 `ui-navigation-auditor`: NAV-RU-01..22 por rol.
- [x] T12 `code-reviewer`: revision sin bloqueantes.
- [x] T13 Orquestador: reparto de puntos (bloque 6 + b4 HU-13) en `auditoria-puntos-inc00.md` §13; `avance.md`/`mvp.md`.
