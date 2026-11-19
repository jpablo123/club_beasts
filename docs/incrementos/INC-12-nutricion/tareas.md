# INC-12 - Tareas

Estado: ACEPTADO (2026-11-18). Pipeline: ACEPTADO.

## ESPECIFICADO - acceptance-criteria-analyst

- [x] A1 `acceptance-criteria-analyst` (Modo CREAR): criterios ISTQB + Gherkin + schemas para HU-22, HU-23, HU-24, HU-27 (analogia HU-18..26) en `club-beasts-api/features/acceptance-criteria/`.
- [x] A2 Orquestador: incorporar correcciones, registrar PEND-NUT-01..08 resueltas como DEC-075..082. **CERRADO 2026-11-18**.

## Ratificacion de contratos (paralelo, solo analisis)

- [x] R1 `backend-developer`: ratifica contrato API (endpoints, orden de errores, snapshot, modelos Prisma). **RATIFICA sin correcciones.**
- [x] R2 `frontend-developer`: ratifica contrato web (formularios, portal, matriz NAV-NUT). **RATIFICA CON CORRECCIONES C1..C8 (incorporadas).**
- [x] R3 Orquestador: incorpora correcciones y cierra puerta LISTO. **CERRADO 2026-11-18.**

## RED - test-engineer

- [ ] T1 Re-medir base.
- [ ] T2 Tests API en rojo.
- [ ] T3 Tests web unit en rojo.
- [ ] T4 E2E en rojo NAV-NUT.
- [ ] T5 Gherkin opcional + calidad del rojo.

## GREEN - database-admin + backend-developer + frontend-developer

- [ ] T6 `database-admin`: modelos + migracion.
- [ ] T7 `backend-developer`: endpoints.
- [ ] T8 `frontend-developer`: gestion staff + portal + ficha.
- [ ] T9 Tests del RED en verde.

## VERIFICADO / Navegacion / REVISADO / Gestion

- [ ] T10 `test-engineer`: bateria x2 identicas + logs.
- [ ] T11 `ui-navigation-auditor`: NAV-NUT por rol.
- [ ] T12 `code-reviewer`: revision sin bloqueantes.
- [ ] T13 Orquestador: reparto de puntos (bloque 7 = 12 + cierre HU-07 b5/b6 +1) en `auditoria-puntos-inc00.md` §14; `avance.md`/`mvp.md`.