# INC-13 - Tareas

Estado: ESPECIFICADO (2026-11-19). Pipeline: ESPECIFICADO -> LISTO -> RED -> GREEN -> VERIFICADO -> auditoria navegacion -> REVISADO -> ACEPTADO.

## ESPECIFICADO - acceptance-criteria-analyst

- [x] A1 `acceptance-criteria-analyst` (Modo CREAR): criterios ISTQB + Gherkin + schemas para HU-32, HU-33, HU-34.
- [x] A2 Orquestador: resolver PEND-HIS-01..06 como DEC-083..088. **CERRADO 2026-11-19**.

## Ratificacion de contratos (paralelo, solo analisis)

- [ ] R1 `backend-developer`: ratifica contrato API.
- [ ] R2 `frontend-developer`: ratifica contrato web + matriz NAV-HIS.
- [ ] R3 Orquestador: incorpora correcciones y cierra puerta LISTO.

## RED - test-engineer

- [ ] T1 Re-medir base.
- [ ] T2 Tests API en rojo.
- [ ] T3 Tests web unit en rojo.
- [ ] T4 E2E en rojo NAV-HIS.
- [ ] T5 Gherkin opcional + calidad del rojo.

## GREEN - backend-developer + frontend-developer

- [ ] T6 Backend: historial consolidado + conteos + notificaciones.
- [ ] T7 Frontend: vistas + portal.
- [ ] T8 Tests del RED en verde.

## VERIFICADO / Navegacion / REVISADO / Gestion

- [ ] T9 `test-engineer`: bateria x2 identicas + logs.
- [ ] T10 `ui-navigation-auditor`: NAV-HIS por rol.
- [ ] T11 `code-reviewer`: revision sin bloqueantes.
- [ ] T12 Orquestador: reparto de puntos (bloque 8 = 8 + cierre HU-07 b5/b6 +1) en `auditoria-puntos-inc00.md` §15; `avance.md`/`mvp.md` (total 100).