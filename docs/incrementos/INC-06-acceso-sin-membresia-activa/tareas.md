# INC-06 - Tareas

## Estado

Estado actual: **ACEPTADO (2026-10-29)** — pipeline completo LISTO 4/4 -> RED -> GREEN backend+web -> VERIFICADO (con enmiendas C4) -> auditoria -> REVISADO -> ACEPTADO, **0 puntos** (regla de no duplicado). Decisiones registradas: **DEC-051** (INC06-PEND-01..04 resueltas, opcion (a)
en las 4) + `INC06-CONF-01..04` + no-duplicado (**0 puntos**) + matriz de
navegacion aprobada + contrato backend **RATIFICA CON CORRECCIONES R1..R5**
(incorporadas al spec). **El RED esta habilitado** para `test-engineer`
(contrato propio del orquestador).

Criterios: **7** (`INC06-ACC-01..07`), **todos `SPEC`** desde 2026-10-29
(los 4 que estaban `BLOQUEADO` quedaron desbloqueados por **DEC-051**).
**Puntos en juego: 0** (mejora de regla de negocio;
ver "Regla de no duplicado" del spec: HU-16/HU-25/HU-30/HU-08/HU-15/HU-17 ya
acreditados, sin bullet de `mvp.md` que pague este bloqueo). El spec **no
declara puntos** (DEC-016).

**Base que debe permanecer intacta** en cada verificacion: **INC-05 cerro el
2026-10-28**; base de referencia al arranque del RED (re-medir y anotar aqui):
API **632/632**, Gherkin **214/214** (guard 214), web **188/188**,
E2E **57/57 x2**, migraciones **9/0 sin drift**.

## Backlog operativo

| # | Tarea | Criterios | Agente | Prioridad | Estado |
|---:|---|---|---|---|---|
| 1 | Spec de INC-06 (objetivo, alcance, criterios, contrato propuesto, fixtures, evidencia, matriz de navegacion, riesgos) | todos | acceptance-criteria-analyst | Alta | **Completada (2026-10-20)**: paquete `spec.md` + `tareas.md` + `evidencia.md`; 7 criterios (3 SPEC, 4 bloqueados) |
| 2 | Resolver `INC06-PEND-01` (copy del aviso: "suspension activa" vs "sin membresia activa" + CTA) | `ACC-06`, `ACC-01` | Producto | **Critica** (bloquea LISTO) | **Completada (2026-10-29)**: `DEC-051` opcion (a) |
| 3 | Resolver `INC06-PEND-02` (superficie: login intacto vs bloqueado) | `ACC-05`, `ACC-01` | Producto | **Critica** (bloquea LISTO y el contrato) | **Completada (2026-10-29)**: `DEC-051` opcion (a): login intacto |
| 4 | Resolver `INC06-PEND-03` (superficie del aviso: pantalla completa vs banner vs ruta propia) | `ACC-01`, `ACC-06` | Producto | **Critica** (bloquea LISTO) | **Completada (2026-10-29)**: `DEC-051` opcion (a): pantalla completa |
| 5 | Resolver `INC06-PEND-04` (`PROGRAMADA` cuenta como sin membresia activa?) | `ACC-01` | Producto | **Critica** (bloquea LISTO) | **Completada (2026-10-29)**: `DEC-051` opcion (a): si cuenta |
| 6 | Ratificar el contrato del spec (resolucion multi-servicio, forma de respuesta de `/portal/resumen`, orden de evaluacion, impacto en login segun PEND-02) | todos | backend-developer | Alta (bloquea LISTO) | **Completada (2026-10-29)**: RATIFICA CON CORRECCIONES R1..R5, incorporadas al spec |
| 7 | Registrar `INC06-CONF-01..04`, la regla de no-duplicado (**0 puntos**) y aprobar la matriz de navegacion en `docs/producto/decisiones.md` | matriz, `ACC-02/03/04` | Orquestador | Alta (bloquea LISTO) | **Completada (2026-10-29)**: seccion "Ratificaciones del orquestador (2026-10-29)" |
| 8 | Pasar el incremento a **LISTO** (checklist del spec) y habilitar el RED | todos | Orquestador | Alta | **Completada (2026-10-29)**: puerta 4/4, LISTO |
| 9 | **RED** API: integracion `inc06-acceso-sin-membresia.test.ts` (resolucion sobre 3 tipos: 0 filas, todos VENCIDA, mixto F3, CONGELADO F4, PROGRAMADA F5; portal aditivo; regresiones de ingreso y login); sin tocar `src/` | `ACC-01..05`, `ACC-07` | test-engineer | Alta | **Completado (2026-10-29)**: 26 tests (10 rojos flag ausente + 16 regresion verdes); base API 632/632 intacta; R1/R3/R4 cubiertos |
| 10 | **RED** web + E2E: unit del aviso (render, copy, accesibilidad) + `inc06-acceso-membresia.spec.ts` (login->portal aviso, recarga, atras, movil/escritorio, sesion expirada, recepcion 403, regresion portal mixto/con acceso) — matriz de navegacion | `ACC-01`, `ACC-04..07` | test-engineer | Alta | **Completado (2026-10-29)**: 4/6 unit rojos + 11/12 E2E rojos; base web 188/188 y E2E 57/57 intactas (rojos preexistentes INC-07 no tocados) |
| 11 | Escenarios **Gherkin** nuevos solo si el copy de PEND-01 queda fijo aqui (guard `153` para actualizar en GREEN) | `ACC-01`, `ACC-06` | test-engineer | Media | **Completado (2026-10-29)**: 6 escenarios nuevos en rojo (guard 214 actualizado a 220 en GREEN; guard sin tocar) |
| 12 | **GREEN** API: `resolverAccesoApp` (fuente unica `calcularEstado`/`resolverEstadoAcceso`, sin modelo nuevo), `GET /portal/resumen` aditivo (`sinMembresiaActiva`), login **solo** si PEND-02 = (b) | `ACC-01..05`, `ACC-07` | backend-developer | Alta | Pendiente |
| 13 | **GREEN** web: pantalla de aviso en `/portal` (PEND-03(a)) con copy de PEND-01; pintado actual intacto cuando hay acceso | `ACC-01`, `ACC-06`, `ACC-07` | frontend-developer | Alta | Pendiente |
| 14 | **VERIFICADO**: bateria completa con base intacta (API/Gherkin/web/build/tsc/migraciones/E2E x2), registro en `evidencia.md` | todos | test-engineer | Alta | **Completado (2026-10-29)**: API 658/658, Gherkin 220/220 x2, web 204/204, build PASS, 9/0, E2E 88/88 x2 -> 94/94 x2 (enmiendas C4 incluidas) |
| 15 | **Auditoria de navegacion**: recorrer la matriz de navegacion/aplicabilidad del spec (viajes ejecutados por rol, movil/escritorio/teclado, URL directa/recarga/atrás, sin bucles) y devolver resultados/evidencia | matriz | ui-navigation-auditor | Alta | **Completada (2026-10-29)**: matriz 12 filas revisada; resultado por fila persistido en evidencia §5; H-01b/H-01c/H-02 cerrados |
| 16 | **Revision**: no duplicado (HU-16/25/30/08/15/17 ya cobrados), fuente unica de estado, orden de guardas intacto (DEC-030/039), base sin perdida, pruebas sin aserciones vacias | todos | code-reviewer | Alta | **Completada (2026-10-29)**: ACEPTA CON HALLAZGOS NO BLOQUEANTES |
| 17 | Actualizar `docs/producto/avance.md`, `docs/producto/mvp.md` y `docs/producto/decisiones.md` (solo registro del cambio de regla; **0 puntos** certificados) | DEC-048 | Orquestador (delivery-orchestrator) | Media | **Completada (2026-10-29)**: incremento ACEPTADO, 0 puntos; PEND-005 registrado |

## Orden recomendado

1. #1 (este paquete) -> #2..#5 (decisiones de Producto) -> #6 (ratificacion de
   contrato) -> #7 (CONF + matriz) -> #8: **puerta LISTO**.
2. #9 y #10 en paralelo (RED); #11 solo si PEND-01 fija copy.
3. #12 -> #13 (orden por dependencia de datos).
4. #14 -> #15 -> #16 -> #17.

**Gate unico ABIERTO**: hasta cerrar #2..#8 el RED no arranca (Definition of
Ready). Literales y superficie dependen de PEND-01..04: hasta entonces el
contrato del spec es **propuesto**.

## Archivos permitidos por agente

- `acceptance-criteria-analyst`: `docs/incrementos/INC-06-*` (este paquete).
  **No** toca `features/*.feature`, G14 existentes, `src/` ni `docs/producto/`.
- `test-engineer`: `club-beasts-api/tests/integration/inc06-*.test.ts` (nuevos),
  tests unit/UI de `club-beasts-web/tests/unit*`, `club-beasts-api/features/*.feature`
  y `features/steps/*` (nuevos, solo si PEND-01 fija copy),
  `club-beasts-web/tests/e2e/inc06-*.spec.ts` (nuevos),
  `club-beasts-api/vitest.cucumber.config.ts` (solo guard en GREEN) y
  `docs/incrementos/INC-06-*/evidencia.md`. **No** modifica specs existentes de
  HU ni E2E ajenos; si un E2E aceptado (`portal.spec.ts`,
  `acceso-vencimiento.spec.ts`, `recepcion.spec.ts`) se ve afectado por el
  cambio de contrato, lo **reporta** al orquestador (enmienda con contrato
  propio, patron C4 de INC-05).
- `backend-developer`: `club-beasts-api/src/services/membresia.service.ts`
  (o nuevo modulo de resolucion de acceso), `src/routes/portal.ts`,
  `src/routes/auth.ts` (**solo** si PEND-02 = (b)), `src/schemas/`.
  **No** toca `recepcion.ts` (salvo reporte), `clientes.ts`, `membresia.ts` ni
  la guarda de estado general.
- `frontend-developer`: `club-beasts-web/src/app/portal/page.tsx` (+ componente
  nuevo del aviso si aplica). **No** toca login, Navbar, ChangePinForm ni
  demas paginas.
- `database-admin`: **sin migracion** esperada (el calculo es derivado);
  verificar esquema sin cambios.
- `ui-navigation-auditor`: solo lectura + resultados de la matriz hacia el
  orquestador (no edita producto, tests ni documentos de entrega).
- `code-reviewer`: solo lectura + `docs/incrementos/INC-06-*/evidencia.md`
  (seccion de revision).
- `Orquestador`: `docs/producto/*` (fuera de este paquete).

## Fuera de este incremento (no tocar)

- **INC-03 cerrado**: `recepcion.ts` intacto (guardas DEC-030/039); el portal
  solo cambia de forma **aditiva** (`INC06-CONF-01`); regresion obligatoria.
- **INC-04 cerrado**: `clientes.ts`, `cliente.service.ts`, `auth.service.ts`
  (rama `AUTH_CLIENTE_INACTIVO`) intactos.
- **INC-02 cerrado**: congelacion intacta; `CONGELADO` solo se **consume**.
- **INC-05 en curso**: las rutas nuevas de personalizado/nutricion **no** se
  tocan; la resolucion de acceso de INC-06 debe reutilizar su calculo por tipo
  sin duplicarlo (`INC06-CONF-01`, riesgo `INC06-R06`).
- **INC-07** (`navegacion-login-pin`): incremento **independiente**; no se
  mezclan alcances ni archivos.
- **HU-12/13/14/15/16/17/25/29/30/31, HU-02/03/05/06/08** aceptados: no se
  re-especifican ni se re-cobran.
- **App movil**, compra/activacion online, alertas nuevas de recepcion
  (`INC06-CONF-02`): fuera.
- Riesgos globales `R-01..R-11`, `D2`, `REV-01..REV-12` (backlog aparte).

## Riesgos de gestion del incremento

| Riesgo | Mitigacion |
|---|---|
| 4 decisiones de Producto abiertas (copy, login, superficie, PROGRAMADA) | Se formularon en una sola pasada con opciones y recomendaciones (patron DEC-026..033/042..046); el incremento arranca **BLOQUEADO** deliberadamente |
| Contrato sin ratificar | Ratificacion de `backend-developer` como gate antes del RED (precedente INC-03/04/05) |
| **0 puntos** sobre codigo aceptado: riesgo de expectativa de avance | Declarado en spec, tareas y evidencia; el orquestador no certifica fraccion (DEC-016) |
| Regresion sobre INC-03/INC-04 aceptados (portal, ingresos, login) | Cambio aditivo + regresiones explicitas + matriz de navegacion + auditoria posterior |
| El calculo multi-servicio choca con INC-05 (filas de otros tipos, fixture F8) | `INC06-CONF-01` (fuente unica) y fixture F3 reutilizando F8; ratificacion backend |
| Copy ambiguo si se elige "suspension activa" | PEND-01 formaliza la decision; recomendacion (a) sin la palabra "suspension" |
