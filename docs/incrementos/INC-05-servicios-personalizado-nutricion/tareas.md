# INC-05 - Tareas

## Estado

Estado actual: **ACEPTADO (2026-10-28)**. Pipeline completo del incremento:
LISTO 13/13 (2026-10-20) -> RED #11-#13 (2026-10-20) -> verificacion de modelo
#14 (modelo compartido confirmado, 9/0 sin drift) -> GREEN #15 backend + #16
web (paralelo, contrato API ratificado) -> C4 + defectos RED #15a y
VERIFICADO #17 (API 632/632 final, Gherkin 214/214, web 188/188, build PASS,
E2E 57/57 x2, migraciones 9/0) -> revision #18 (`NO ACEPTA` por H-01) -> cierre
de H-01 (regresion DEC-047 gym, 6 tests nuevos, re-revision valida) ->
**ACEPTA CON HALLAZGOS NO BLOQUEANTES** -> certificacion #19 por el orquestador
(**+6 puntos**: HU-13 3 + HU-14 3; total MVP **49/100**; bloque 3 **15/15**).
Evidencia completa: `evidencia.md` secciones 1-6 (incluida 4.9 y 5.6).

Criterios: **10** (`INC05-PER-01..05` + `INC05-NUT-01..05`); **8 puntuables en
INC-05** (`PER-01..04`, `NUT-01..04`) y **2 excluidos** (`PER-05`, `NUT-05` = b4 de
cada HU, asignaciones de rutina/plan en bloques 6/7, `mvp.md:60-61`). Puntos en
juego: **hasta +6** (HU-13 = 3, HU-14 = 3, `auditoria:114-115`); el reparto exacto
por fraccion (DEC-016) se confirma al cierre en la auditoria. El spec **no declara
puntos**.

**Base que debe permanecer intacta** en cada verificacion: API **536/536**, Gherkin
**153/153** (guard `INC00_SCENARIO_COUNT = 153`), web **183/183**, E2E **56/56**,
migraciones **9/0 sin drift** (medidas al cierre de INC-04,
`docs/incrementos/INC-04-estados-cliente/evidencia.md`).

## Backlog operativo

| # | Tarea | Criterios | Agente | Prioridad | Estado |
|---:|---|---|---|---|---|
| 1 | Spec de INC-05 (objetivo, alcance, criterios, contrato API, fixtures, evidencia, riesgos) | todos | acceptance-criteria-analyst | Alta | **Completada (2026-10-20)**: paquete `spec.md` + `tareas.md` + `evidencia.md`; 10 criterios (8 puntuables, 2 excluidos) |
| 2 | Resolver `INC05-PEND-01` (congelacion de NUTRICION, riesgo DEC-023) | `NUT-03` | Producto + Orquestador | **Critica** (bloquea LISTO) | **Hecho (2026-10-20)**: opcion **(a)** -> **DEC-042** (congelacion extendida a NUTRICION; DEC-023 enmendada); `NUT-03` queda **incluido** |
| 3 | Resolver `INC05-PEND-02` (literales `PROGRAMADA` y `CONGELADO` vs `CONGELADA`) | `PER-02`, `PER-03`, `NUT-02`, `NUT-03` | Producto | **Critica** (bloquea LISTO y el RED) | **Hecho (2026-10-20)**: **DEC-043** = `PROGRAMADA` + `CONGELADO` |
| 4 | Resolver `INC05-PEND-03` (paths y codigos `SERVICIO_SOLAPADA`/`SERVICIO_CONFLICTO`) | `PER-01`, `NUT-01` | Producto + backend | **Critica** (bloquea LISTO) | **Hecho (2026-10-20)**: opcion **(a)** -> **DEC-044** (paths propuestos y codigos nuevos) |
| 5 | Resolver `INC05-PEND-04` (superficie de UI de la ficha en INC-05) | `PER-04`, `NUT-04` | Producto + Frontend | **Critica** (bloquea LISTO) | **Hecho (2026-10-20)**: opcion **(b)** -> **DEC-045** (pintado minimo etiquetado por `tipoServicio`, sin vista unificada HU-07) |
| 6 | Resolver `INC05-PEND-05` (alcance del `PATCH` de vigencias: contradiccion "Que NO cubre" vs rama 8) | `PER-01`, `NUT-01` | Producto + backend | **Critica** (bloquea LISTO) | **Hecho (2026-10-20)**: opcion **(a)** -> **DEC-046** (`PATCH` con concurrencia optimista; con **DEC-047** como regla de duracion) |
| 7 | Ratificar el contrato del spec (paths, cuerpos, mensajes exactos, orden de evaluacion, modelo compartido, incompatibilidades #1..#10) | todos | backend-developer | Alta (bloquea LISTO) | **Hecho (2026-10-20)**: RATIFICA CON CORRECCIONES C1..C6 aplicadas al spec (C1: filtro tipo tambien en `congelarVigencia`/`editarCongelacion`; C2: orden de fechas efectivas del PATCH con DEC-047; C3: canon de congelacion G14; C4: salvedad de 3 tests + G14 HU-15; C5: errores; C6: divergencias GET) |
| 8 | Enmiendas G14 exigidas por los PEND: literal `CONGELADO` (#2), estado de `C02b` de HU-13/HU-14 (#4), frase "Que NO cubre" del `PATCH` (#5) y DEC-047 como comportamiento del `PATCH` | `PER-03`, `NUT-02/03`, `PER-01`, `NUT-01` | acceptance-criteria-analyst | Alta (bloquea RED) | **Hecho (2026-10-20)**: 4 archivos G14 enmendados (`HU-13/HU-14-criterios-aceptacion.md` + `HU-13/HU-14-schemas.ts`) con DEC-043/046/047 y notas de C02b (DEC-042/043) |
| 9 | Registrar `INC05-CONF-01..06` y la regla de no-duplicado (congelacion/vencimiento -> HU-12/15/16; guarda INACTIVO -> HU-08; vista unificada -> HU-07; DEC-047 sin puntos extra en gym) en `docs/producto/decisiones.md` | `PER-03`, `NUT-03`, `PER-04`, `NUT-04` | Orquestador | Alta (bloquea LISTO) | **Hecho (2026-10-20)**: secciones "Confirmaciones de INC-05" (CONF-01 enmendada por C2, CONF-06 con salvedad C4 autorizada) y "Regla de no duplicado de puntos INC-05" |
| 10 | Pasar el incremento a **LISTO** (checklist del spec completo) y habilitar el RED | todos | Orquestador | Alta | **Hecho (2026-10-20)**: LISTO 13/13 casillas; RED habilitado |
| 11 | **RED** de API: integracion `hu13-servicio-personalizado.test.ts` y `hu14-servicio-nutricion.test.ts` (creacion, validacion de fechas, solape por tipo, renovacion, estados calculados, `CONGELADO`, ficha, 404/403/409 inactivo, rama 8 incluida por **DEC-046** y sub-rama **DEC-047** del `PATCH`); sin tocar `src/` | `PER-01..04`, `NUT-01..04` | test-engineer | Alta | **Hecho (2026-10-20)**: 87 tests nuevos (84 rojos; base 536 intacta) |
| 12 | Escenarios **Gherkin** nuevos (`features/*.feature` + `features/steps/*`) a partir de los borradores de los G14; guardar el guard `INC00_SCENARIO_COUNT = 153` para actualizar en GREEN | todos los puntuables | test-engineer | Alta | **Hecho (2026-10-20)**: `servicio-personalizado.feature` + `servicio-nutricion.feature` (61 escenarios nuevos en rojo; guard 153 intacto -> GREEN fijara 214) |
| 13 | **RED** web + E2E (**aplica: `PEND-04 = (b)` -> DEC-045**): unit del etiquetado/filtrado por `tipoServicio` en la ficha + E2E con dos tipos de vigencia | `PER-04`, `NUT-04` | test-engineer | Media | **Hecho (2026-10-20)**: `membership-tipo-servicio.test.tsx` (5, 2 rojos) + `inc05-tipos-vigencia.spec.ts` (1 rojo); base 183 intacta |
| 14 | Modelo: verificar **sin migracion** si se ratifica el modelo compartido (`MembresiaGym.tipoServicio`); si se elige modelo nuevo, migracion portable + limpieza de FKs | `PER-01`, `NUT-01` | database-admin | Alta | **Completada (2026-10-27)**: modelo compartido confirmado (`schema.prisma:81`), `prisma validate` + `migrate status` 9/0 sin drift, `git diff prisma/` vacio |
| 15 | **GREEN** API: rutas y servicios de `servicios-personalizado`/`servicios-nutricion` (espejo de `membresia.ts`), filtro `tipoServicio` en las rutas GYM existentes (incompatibilidad #1), mapa `SERVICIO_*` (DEC-044), guarda `CLIENTE_INACTIVO` heredada en `POST` y regla **DEC-047** en el `PATCH` (incluida su regresion en el `PATCH` de gym, riesgo `INC05-R11`, sin puntos extra) | `PER-01..04`, `NUT-01..04` | backend-developer | Alta | **Completada (2026-10-27)**: rutas en `membresia.ts` + `servicio.service.ts`/`servicio.schema.ts` nuevos; filtros C1 (incl. `congelarVigencia`/`editarCongelacion`); `calcularFechasEdicion` (DEC-047, gym incluida); `tsc` exit 0 |
| 16 | **GREEN** UI (**aplica: DEC-045 = (b)**): etiquetado/filtrado por `tipoServicio` en `/clientes/[id]` (`MembershipSection`) | `PER-04`, `NUT-04` | frontend-developer | Media | **Completada (2026-10-27)**: fusion 3 fuentes + badges de tipo + acciones solo GYM + `api.servicios`; web 188/188, build PASS |
| 15a | **Salvedad C4** (autorizada en `INC05-CONF-06`): **enmienda** de los 3 tests aceptados que encodifican el alcance pre-DEC-042 (`membresia-congelacion.test.ts:789-810`, `membresia-descongelacion.test.ts:712-722`, `membresia-editar-congelacion.test.ts:812-822`, nunca se borran) + **enmienda del G14 de HU-15** (`HU-15-criterios-aceptacion.md`, `HU-15-schemas.ts`) para reflejar `{GYM, PERSONALIZADO, NUTRICION}` congelables — con **contrato propio** durante RED/GREEN | regresion de HU-15 (sin puntos nuevos) | test-engineer (tests) + acceptance-criteria-analyst (G14 HU-15) | Alta (acompana al GREEN de DEC-042) | **Completada (2026-10-27)**: G14 HU-15 enmendado (analyst, 2 archivos); 3 tests C4 enmendados + 3 nuevos de rama 409 por tipo fuera del set; step nutricion; fix fecha REG-03; guard 214 |
| 17 | **VERIFICADO**: bateria completa con base intacta (API/Gherkin/web/build/tsc/migraciones/E2E), guard de gherkin actualizado y registro en `evidencia.md` | todos | test-engineer | Alta | **Completada (2026-10-27/28)**: API 626/626 luego 632/632 (H-01), Gherkin 214/214 exit 0, web 188/188, build PASS, migraciones 9/0; E2E 57/57 pareja verde x2 + repeat-each 30/30; flaky INC-04 estabilizado (24/24) y `congelacion.spec.ts:331` enmendado (patron f2968c5); seccion 4 |
| 18 | **Revision**: permisos DEC-017, no duplicado (HU-12/15/16/08), filtro por tipo (incompat. #1), regresion de la base, pruebas sin aserciones vacias | todos | code-reviewer | Alta | **Completada (2026-10-28)**: `NO ACEPTA` inicial por **H-01** (faltaba la regresion DEC-047 gym); H-01 cerrado con `dec047-parche-gym-regresion.test.ts` (6 tests) + re-revision valida -> **ACEPTA CON HALLAZGOS NO BLOQUEANTES** (H-02/H-03 deuda menor); secciones 5 y 5.6 |
| 19 | Actualizar `docs/producto/avance.md`, `docs/producto/mvp.md` y `docs/producto/auditoria-puntos-inc00.md` con los puntos aceptados (hasta +6, solo si la revision no bloquea y el reparto DEC-016 cierra) | HU-13 + HU-14 | Orquestador (delivery-orchestrator) | Alta | **Completada (2026-10-28)**: **+6 certificados** (HU-13 3 + HU-14 3); bloque 3 a 15/15; total MVP **49/100 (49%)**; `avance.md`, `mvp.md` y seccion 11 de la auditoria actualizados |

## Orden recomendado

1. #1 (este paquete) -> #2..#6 (decisiones de Producto, **resueltas 2026-10-20 ->
   DEC-042..046**) -> #7 (ratificacion de contrato, **hecha 2026-10-20: RATIFICA CON
   CORRECCIONES C1..C6**) -> #8 (enmiendas G14, **hechas 2026-10-20**) -> #9
   (**hecha 2026-10-20**) -> #10: **puerta LISTO cerrada 13/13 (2026-10-20)**.
2. #14 (solo si aplica) y luego #11 y #12 en paralelo (RED), #13 en paralelo
   (aplica por DEC-045 = (b)).
3. #15 -> #16 (orden por dependencia de datos).
4. #17 -> #18 -> #19.

**Gate unico CERRADO**: la puerta #10 se cumplio el 2026-10-20 (13/13 casillas);
las tareas de RED (#11-#13) **ya estan habilitadas**. Literales fijados:
**DEC-043** (`PROGRAMADA`/`CONGELADO`) y **DEC-044** (`SERVICIO_SOLAPADA`/
`SERVICIO_CONFLICTO`); contrato ratificado con C1..C6. Durante RED/GREEN se ejecuta
con contrato propio la **salvedad C4** (enmienda de 3 tests aceptados + G14 de HU-15
por DEC-042).

## Archivos permitidos por agente

- `acceptance-criteria-analyst`: `docs/incrementos/INC-05-*` (este paquete) y, en la
  tarea #8, `club-beasts-api/features/acceptance-criteria/HU-13-criterios-aceptacion.md`,
  `HU-13-schemas.ts`, `HU-14-criterios-aceptacion.md`, `HU-14-schemas.ts` (solo las
  enmiendas explicitas marcadas en el spec) y, en la tarea **#15a (C4)**,
  `HU-15-criterios-aceptacion.md` + `HU-15-schemas.ts` (solo la enmienda DEC-042).
  **No** toca `features/*.feature`, `features/steps/` ni `src/`.
- `test-engineer`: `club-beasts-api/tests/integration/*.test.ts` (nuevos; en la
  tarea **#15a (C4)** tambien **enmendar** los 3 tests aceptados listados ahi, sin
  borrarlos), tests
  unit/UI de `club-beasts-web/tests/unit*`, `club-beasts-api/features/*.feature` y
  `features/steps/*` (nuevos), `club-beasts-web/tests/e2e/*.spec.ts` (nuevos),
  `club-beasts-api/vitest.cucumber.config.ts` (solo el guard de conteo en GREEN) y
  `docs/incrementos/INC-05-*/evidencia.md`.
- `database-admin`: solo si se ratifica modelo nuevo: `club-beasts-api/prisma/schema.prisma`
  + migracion nueva + seed/fixtures (limpieza de FKs). Con modelo compartido, solo
  verificacion (sin cambios).
- `backend-developer`: `club-beasts-api/src/routes/` (nuevo `servicio.ts` o
  extension de `membresia.ts` segun ratificacion), `src/services/`
  (`membresia.service.ts` parametrizado o nuevos `servicio.service.ts`), `src/schemas/`
  (equivalentes de los G14; `src/` no importa G14).
- `frontend-developer`: **aplica por DEC-045 = (b)**:
  `club-beasts-web/src/components/MembershipSection.tsx`
  y/o `src/app/clientes/[id]/page.tsx` (etiquetado por `tipoServicio`).
- `code-reviewer`: solo lectura + `docs/incrementos/INC-05-*/evidencia.md` (seccion de
  revision).
- `Orquestador`: `docs/producto/*` (fuera de este paquete: lo actualiza el
  orquestador, no este agente).

## Fuera de este incremento (no tocar)

- **INC-04 cerrado**: `routes/clientes.ts`, `services/cliente.service.ts`,
  `services/auth.service.ts` y `routes/recepcion.ts` **no** se reabren; la guarda
  `CLIENTE_INACTIVO` se **hereda** del servicio (`CONF-06` de INC-04) sin tocar su
  ruta GYM salvo el filtro `tipoServicio` aprobado en la ratificacion.
- **INC-03 cerrado**: portal e ingresos **intactos**; sus selectores ya filtran
  `tipoServicio: "GYM"` (`portal.ts:41`, `recepcion.ts:60,135`); regresion obligatoria.
- **INC-02 cerrado**: endpoints de congelacion **intactos**; solo la lista
  `TIPOS_CONGELABLES` pasa a `{GYM, PERSONALIZADO, NUTRICION}` (**DEC-042**).
- **INC-00/HU-12 (PATCH de gym)**: intacto salvo la aplicacion de **DEC-047**
  (regla aprobada por Producto: mover `fechaInicio` desplaza `fechaFin`
  conservando la duracion inclusiva) — se toca **solo** en el GREEN de INC-05 con
  pruebas de **regresion explicitas** y **sin cobrar puntos extra** (riesgo
  `INC05-R11` y seccion de no duplicado del spec).
- **HU-12, HU-15, HU-16, HU-30, HU-08, HU-17, HU-05, HU-06** ya aceptados: no se
  re-especifican ni se re-cobran.
- **Anamnesis** (HU-09/10/11/28, `PEND-003`/DEC-021), **rutinas** (HU-18..21/26,
  bloque 6), **asignacion de planes** (HU-22..24/27, bloque 7), **HU-07** (vista
  unificada de ficha), **HU-32/33/34**: fuera.
- Riesgos globales `R-01..R-11`, `D2`, `REV-01..REV-12` (backlog aparte).

## Riesgos de gestion del incremento

| Riesgo | Mitigacion |
|---|---|
| ~~5 decisiones de Producto abiertas al mismo tiempo~~ **cerradas 2026-10-20** (DEC-042..046) | Se resolvieron en una sola pasada (patron DEC-026..033 / DEC-034..041), con opciones y recomendaciones formuladas en `spec.md` |
| Contrato nuevo (paths, codigos, `PATCH`) decidido pero **sin ratificar** | Ratificacion de `backend-developer` como gate antes del RED (precedente INC-03/04); es una de las 2 casillas que faltan |
| ~~`PEND-02` cambia literales de enum~~ **cerrado 2026-10-20** (DEC-043) | Enmienda de G14 **ejecutada** 2026-10-20 (incompatibilidad #2) |
| El filtro `tipoServicio` (incompatibilidad #1) toca servicios **aceptados** | Pruebas de regresion explicitas de HU-12/INC-02/INC-04; bateria completa antes/despues |
| **DEC-047** toca el `PATCH` de gym (codigo aceptado) | Regresion explicita del `PATCH` de gym sin cobrar puntos (riesgo `INC05-R11` del spec) |
| Alcance amplio (2 HU, 10 criterios, 6 rutas) | Orden fijado; no abrir la puerta sin ratificacion y CONF; tabla de criterios con estado por ID |
| Cerrar con fraccion parcial (solo b4 excluido; `NUT-03` **ya incluido** por DEC-042) | El spec no declara puntos; el orquestador certifica solo la fraccion real cerrada (DEC-016) |
