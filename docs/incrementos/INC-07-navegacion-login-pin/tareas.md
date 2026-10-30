# INC-07 - Tareas

## Estado

Estado actual: **ACEPTADO (2026-10-29)** — pipeline completo LISTO 4/4 -> RED -> GREEN -> VERIFICADO -> auditoria -> REVISADO -> ACEPTADO, **0 puntos** (regla de no duplicado). Decisiones registradas: **DEC-050** (INC07-PEND-01 ratificada, opcion (a)) +
`INC07-CONF-01..03` (CON-01 enmendada para el CTA `NAV-04`) + no-duplicado
(**0 puntos**) + matriz de navegacion aprobada + contrato frontend
**RATIFICA CON CORRECCIONES C1..C6** (incorporadas al spec). **El RED esta
habilitado** para `test-engineer` (contrato propio del orquestador).

Criterios: **6** (`INC07-NAV-01..06`), todos **`SPEC`** (destino fijado por
**DEC-050**, 2026-10-29). **Puntos en juego: 0** (UX sobre flujos
aceptados; ver "Regla de no duplicado" del spec: HU-01/02/03/25 ya
acreditados, sin bullet de `mvp.md` que pague navegacion de auth). El spec
**no declara puntos** (DEC-016).

**Base que debe permanecer intacta** en cada verificacion: **INC-05 cerro el
2026-10-28**; base de referencia al arranque del RED (re-medir y anotar aqui):
API **632/632**, Gherkin **214/214**, web **188/188**, E2E **57/57 x2**,
migraciones **9/0 sin drift**. INC-07 **no toca backend**: la base API
/Gherkin solo se corre por prudencia.

## Backlog operativo

| # | Tarea | Criterios | Agente | Prioridad | Estado |
|---:|---|---|---|---|---|
| 1 | Spec de INC-07 (objetivo, inventario de pantallas, criterios, contrato propuesto, fixtures, evidencia, matriz de navegacion, riesgos) | todos | acceptance-criteria-analyst | Alta | **Completada (2026-10-20)**: paquete `spec.md` + `tareas.md` + `evidencia.md`; 6 criterios SPEC |
| 2 | Ratificar `INC07-PEND-01` (destino del link por rol/estado; recomendacion (a)) en `docs/producto/decisiones.md` | `NAV-01..04` | Producto + Orquestador | **Critica** (bloquea LISTO) | **Completada (2026-10-29)**: `DEC-050` (opcion (a)) |
| 3 | Ratificar el contrato de frontend (componentes afectados, localizadores, no-interferencia con `callbackUrl`/guarda PIN/carrera `update()`) en el spec | todos | frontend-developer | Alta (bloquea LISTO) | **Completada (2026-10-29)**: RATIFICA CON CORRECCIONES C1..C6, incorporadas; enmienda `INC07-CONF-01` |
| 4 | Registrar `INC07-CONF-01..03`, la regla de no-duplicado (**0 puntos**) y aprobar la matriz de navegacion en `docs/producto/decisiones.md` | matriz | Orquestador | Alta (bloquea LISTO) | **Completada (2026-10-29)**: seccion "Ratificaciones del orquestador (2026-10-29)" |
| 5 | Pasar el incremento a **LISTO** (checklist del spec) y habilitar el RED | todos | Orquestador | Alta | **Completada (2026-10-29)**: puerta 4/4, LISTO |
| 6 | **RED** web: unit (render + localizador + `href` exacto + orden de tab por pantalla/estado: `/login`, `/login-cliente`, rama `debeCambiarPin`, rama `pinChangeSuccess`) + E2E `inc07-navegacion-auth.spec.ts` (clic y teclado, movil/escritorio, `callbackUrl` intacto, guarda PIN intacta, atras/recarga); sin tocar `src/` | `NAV-01..06` | test-engineer | Alta | **Completado (2026-10-29)**: 10 unit + 19 E2E nuevos en rojo; bases intactas (web 188/188, E2E 57/57, API 632/632, 9/0); 4 defectos de los borradores corregidos; evidencia §1-3 |
| 7 | **GREEN** frontend: link "Volver al inicio" en `/login` y `/login-cliente`; link en la rama `debeCambiarPin` y CTA "Ir a mi portal" en `pinChangeSuccess` (ambas en `/portal`) | `NAV-01..04` | frontend-developer | Alta | **Completado (2026-10-29)**: 3 archivos `src/` (+64 lineas aditivas); 10 unit + 19 E2E del RED en verde; base 188/188 + E2E 57/57 intactas; build PASS; tsc 0; evidencia §1/§4 |
| 8 | **VERIFICADO**: bateria completa con base intacta (web/E2E x2; API/Gherkin por prudencia), registro en `evidencia.md` | todos | test-engineer | Alta | **Completado (2026-10-29)**: web 204/204, E2E 88/88 x2 -> 94/94 x2 tras cierre H-01/H-02 y W1; API 658/658, Gherkin 220/220, build PASS, tsc 0/0, 9/0 |
| 9 | **Auditoria de navegacion**: recorrer la matriz del spec (viajes por rol, movil/escritorio/teclado, URL directa/recarga/atrás, sin bucles/enlaces rotos) y devolver resultados/evidencia | matriz | ui-navigation-auditor | Alta | **Completada (2026-10-29)**: matriz 15 filas revisada; resultado por fila persistido en evidencia §5; H-01a/H-01d cerrados con `inc07-dashboard-staff.spec.ts` |
| 10 | **Revision**: no duplicado (HU-01/02/03/25), no-interferencia (`callbackUrl`, guarda `debeCambiarPin`, carrera `update()`), pruebas sin aserciones vacias | todos | code-reviewer | Alta | **Completada (2026-10-29)**: ACEPTA CON HALLAZGOS NO BLOQUEANTES; W1 cerrado, W3/W4 corregidos |
| 11 | Actualizar `docs/producto/avance.md` y `docs/producto/decisiones.md` (solo registro de la mejora UX; **0 puntos** certificados) | DEC-049 | Orquestador (delivery-orchestrator) | Media | **Completada (2026-10-29)**: incremento ACEPTADO, 0 puntos |

## Orden recomendado

1. #1 (este paquete) -> #2 (ratificacion PEND-01) -> #3 (contrato) -> #4 (CONF
   + matriz) -> #5: **puerta LISTO**.
2. #6 (RED) -> #7 (GREEN) -> #8 (VERIFICADO) -> #9 (auditoria) -> #10
   (revision) -> #11 (certificacion).

**Gate unico ABIERTO**: hasta cerrar #2..#5 el RED no arranca (Definition of
Ready). El destino exacto de los links depende de PEND-01: hasta su ratificacion
el contrato del spec es **propuesto**.

## Archivos permitidos por agente

- `acceptance-criteria-analyst`: `docs/incrementos/INC-07-*` (este paquete).
  **No** toca `src/`, tests, E2E, G14, `features/` ni `docs/producto/`.
- `test-engineer`: `club-beasts-web/tests/unit*` (nuevos), 
  `club-beasts-web/tests/e2e/inc07-navegacion-auth.spec.ts` (nuevo) y
  `docs/incrementos/INC-07-*/evidencia.md`. **No** modifica E2E aceptados
  (`cambio-pin-obligatorio.spec.ts`, `auth.spec.ts`, `sesion-vencida.spec.ts`,
  `acceso-roles.spec.ts`, `portal.spec.ts`); si un localizador suyo se ve
  afectado por el link nuevo, lo **reporta** al orquestador (enmienda con
  contrato propio, patron C4 de INC-05).
- `frontend-developer`: `club-beasts-web/src/app/login/page.tsx`,
  `club-beasts-web/src/app/login-cliente/page.tsx`,
  `club-beasts-web/src/app/portal/page.tsx` (solo las dos ramas de PIN:
  `debeCambiarPin` y `pinChangeSuccess`). **No** toca `ChangePinForm.tsx`
  (logica), `Navbar.tsx`, `redirect.ts`, `session-recovery.ts`,
  `session-traffic.ts` ni ninguna otra pagina.
- `database-admin`: **no aplica** (sin cambios de modelo/migracion).
- `ui-navigation-auditor`: solo lectura + resultados de la matriz hacia el
  orquestador (no edita producto, tests ni documentos de entrega).
- `code-reviewer`: solo lectura + `docs/incrementos/INC-07-*/evidencia.md`
  (seccion de revision).
- `Orquestador`: `docs/producto/*` (fuera de este paquete).

## Fuera de este incremento (no tocar)

- **Backend** (`club-beasts-api`): **sin cambios** (DEC-049 es 100% frontend);
  las baterias API/Gherkin solo se corrren como base intacta.
- **INC-06** (`acceso-sin-membresia-activa`): incremento **independiente**; no
  se mezclan alcances ni archivos (riesgo si ambos tocan `/portal/page.tsx`:
  secuenciar GREENs o coordinar fusion por el orquestador).
- **Guardas y flujos de sesion** (`resolvePostLoginPath`, `session-recovery`,
  `session-traffic`, flag `debeCambiarPin`, carrera `update()`): intactos; solo
  no-interferencia verificada.
- **Diseno/UX de las pantallas** (layout, Navbar de login, copy de errores):
  fuera; solo se agrega el link/CTA.
- **HU-01/02/03/25 aceptados**: no se re-especifican ni se re-cobran.
- Riesgos globales `R-01..R-11`, `D2`, `REV-01..REV-12` (backlog aparte).

## Riesgos de gestion del incremento

| Riesgo | Mitigacion |
|---|---|
| Ambiguedad de destino ("dashboard" no existe para anonimo; `/portal` es el dashboard del cliente) | `INC07-PEND-01(a)` adoptada como recomendacion y ratificable en la puerta LISTO; no se cierra la puerta sin esa ratificacion |
| Regresion de `callbackUrl` (INC00-AUTH-03) y de la carrera del cambio de PIN (fix `f2968c5`) | `NAV-05/06` + riesgos `INC07-R01/R02`; los E2E aceptados son la red de seguridad |
| Localizadores nuevos rompen E2E aceptados (precedente `strict mode violation`) | Asertar `href` exacto + nombre de rol; enmiendas solo con contrato propio (patron C4) |
| **0 puntos**: riesgo de expectativa de avance | Declarado en spec, tareas y evidencia; el orquestador no certifica fraccion (DEC-016) |
| Solape de archivos con INC-06 (ambos pueden tocar `/portal/page.tsx`) | Secuenciar los GREENs o coordinar la fusion por el orquestador |
