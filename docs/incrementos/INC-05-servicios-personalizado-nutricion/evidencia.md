# INC-05 - Evidencia

Estado del incremento: **ACEPTADO (2026-10-28)**. Pipeline completo:
LISTO 13/13 (2026-10-20) -> RED ejecutado (2026-10-20) -> GREEN (2026-10-20/27:
backend `src/` + web `MembershipSection`/`api.ts`) -> C4 + verificacion #17
(2026-10-27: API 626/626, Gherkin 214/214, web 188/188, E2E pareja verde) ->
estabilizacion de flaky de base INC-04/INC-02 (patron R-10/f2968c5) ->
revision #18 (`NO ACEPTA` por H-01) -> cierre de H-01 (regresion DEC-047 gym,
6 tests nuevos) -> **re-revision: `ACEPTA CON HALLAZGOS NO BLOQUEANTES**
(2026-10-28, ver seccion 5)**. Certificacion de **+6 puntos** (HU-13 3 + HU-14 3)
por el orquestador el 2026-10-28 (seccion 6).

**Nota de estado 2026-10-20 (cierre de puerta)**: con el Producto se resolvieron
las 5 pendencias (**DEC-042..046**, mas **DEC-047**), `acceptance-criteria-analyst`
ejecuto las enmiendas G14, `backend-developer` **ratifico el contrato**
(RATIFICA CON CORRECCIONES C1..C6) y el orquestador registro **`INC05-CONF-01..06`**
(con salvedad **C4** autorizada) + la regla de no-duplicado en `decisiones.md`:
**puerta LISTO cerrada 13/13**. **No se ejecuto ningun comando** en todo el dia
(solo documentacion: decisiones, spec, tareas y G14). El RED queda **habilitado**
(tareas 11-13 de `tareas.md`). Regla de cuenta (DEC-011/DEC-016): **sin evidencia
de ejecucion no se certifica ningun punto** ni se marca ningun criterio como
verificado; **ningun criterio de este spec esta `IMPLEMENTADO` ni `ACEPTADO`**.

**Base que debe permanecer intacta** (medida al cierre de INC-04,
`docs/incrementos/INC-04-estados-cliente/evidencia.md`): API **536/536**, Gherkin
**153/153 exit 0** (guard `INC00_SCENARIO_COUNT = 153`), web **183/183**, Playwright
**56/56**, migraciones **9/0 sin drift**. Ninguna base puede perder tests; los
totales finales son la base mas los tests nuevos.

## 1. Comandos de verificacion (pendientes de ejecucion)

| # | Fase | Directorio | Comando | Esperado | Resultado | Fecha |
|---:|---|---|---|---|---|---|
| 1 | RED | `club-beasts-api` | `npx tsc --noEmit` | exit 0 (el RED no rompe la compilacion) | **exit 0** | 2026-10-20 |
| 2 | RED | `club-beasts-api` | `npx vitest run` | fallos **solo** en archivos nuevos; base 536 intacta | **exit 1: 84 rojos (solo en los 2 archivos nuevos) / 539 verdes; base 536/536 intacta en 29 archivos** | 2026-10-20 |
| 3 | RED | `club-beasts-api` | `npm run test:gherkin` | fallos solo en features nuevas; guard 153 intacto -> exit 1 esperado | **exit 1 esperado: 214 escenarios ejecutados (153 base + 61 nuevos); 57 rojos / 157 verdes; guard `INC00_SCENARIO_COUNT = 153` sin tocar** | 2026-10-20 |
| 4 | RED | `club-beasts-web` | `npx tsc --noEmit` / `npx vitest run` | exit 0 / base 183 intacta (**aplica: DEC-045 = (b)**) | **tsc exit 0; vitest exit 1: 2 rojos en `membership-tipo-servicio.test.tsx` / 186 verdes; base 183/183 intacta** | 2026-10-20 |
| 5 | RED | - | `git status --porcelain` | cero cambios en `src/`, `prisma/`, `docs/producto/` y otros incrementos | **cero cambios en `src/` y `prisma/`; `docs/producto/decisiones.md` con cambio previo del orquestador (mtime 11:36, anterior a la sesion RED); ver detalle seccion 3** | 2026-10-20 |
| 6 | GREEN | `club-beasts-api` | `npx tsc --noEmit` | exit 0, 0 errores | _sin ejecutar_ | - |
| 7 | GREEN | `club-beasts-api` | `npx vitest run` | base 536/536 intacta + tests nuevos en verde | _sin ejecutar_ | - |
| 8 | GREEN | `club-beasts-api` | `npm run test:gherkin` | base 153 + escenarios nuevos (guard actualizado **solo** aqui) | _sin ejecutar_ | - |
| 9 | Modelo | `club-beasts-api` | `npx prisma migrate status` | 9/0 sin drift (9/9 si no hay migracion, modelo compartido) | _sin ejecutar_ | - |
| 10 | GREEN | `club-beasts-web` | `npx tsc --noEmit`, `npx vitest run`, `npm run build` | exit 0 / base 183 intacta / PASS (**aplica: DEC-045 = (b)**) | _sin ejecutar_ | - |
| 11 | E2E | `club-beasts-web` | `npx playwright test --reporter=line` **x2 corridas consecutivas** | base 56/56 + E2E nuevos verdes (**aplica: DEC-045 = (b)**) | _sin ejecutar_ | - |
| 12 | Revision | api + web + `docs/` | revision `code-reviewer`: re-ejecucion de esta tabla + lectura de `spec.md`, `decisiones.md` y G14 | sin hallazgos bloqueantes | _sin ejecutar_ | - |

Comandos reproducibles (uno por verificacion):

```bash
# API
cd club-beasts-api && npx tsc --noEmit
cd club-beasts-api && npx vitest run
cd club-beasts-api && npm run test:gherkin
cd club-beasts-api && npx prisma migrate status

# Web
cd club-beasts-web && npx tsc --noEmit
cd club-beasts-web && npx vitest run
cd club-beasts-web && npm run build
cd club-beasts-web && npx playwright test
```

## 2. Estado por criterio (pendiente de evidencia)

| Criterio | Estado spec (2026-10-20) | Estado verificado | Evidencia |
|---|---|---|---|
| `INC05-PER-01` | SPEC (decidido: DEC-044, DEC-046, DEC-047) | _pendiente_ | _sin ejecutar_ |
| `INC05-PER-02` | SPEC (decidido: DEC-043) | _pendiente_ | _sin ejecutar_ |
| `INC05-PER-03` | SPEC (decidido: DEC-043) | _pendiente_ | _sin ejecutar_ |
| `INC05-PER-04` | SPEC (decidido: DEC-045 = (b)) | _pendiente_ | _sin ejecutar_ |
| `INC05-PER-05` | **EXCLUIDO** (b4, bloque 6, DEC-018) | fuera de INC-05 | no aplica |
| `INC05-NUT-01` | SPEC (decidido: DEC-044, DEC-046, DEC-047) | _pendiente_ | _sin ejecutar_ |
| `INC05-NUT-02` | SPEC (decidido: DEC-043) | _pendiente_ | _sin ejecutar_ |
| `INC05-NUT-03` | **SPEC incluido** (decidido: DEC-042 + DEC-043) | _pendiente_ | _sin ejecutar_ |
| `INC05-NUT-04` | SPEC (decidido: DEC-045 = (b)) | _pendiente_ | _sin ejecutar_ |
| `INC05-NUT-05` | **EXCLUIDO** (b4, bloque 7, DEC-019) | fuera de INC-05 | no aplica |

Regla de no duplicado a verificar en revision (`spec.md`, seccion homonima): la
congelacion/vencimiento de GYM (HU-12/15/16) y la guarda `CLIENTE_INACTIVO` (HU-08)
ya estan pagados; en INC-05 solo se verifican **en las rutas nuevas** y **no**
aportan punto propio.

## 3. RED (ejecutado 2026-10-20)

Responsable: `test-engineer` bajo contrato del `delivery-orchestrator`
(tareas 11-13 de `tareas.md`). Entorno: Windows, Node via `npx`, corridas del
2026-10-20 entre 13:30 y 14:10. **Solo se crearon archivos de prueba** (8) y se
actualizo esta seccion: ningun archivo de `src/`, `prisma/`, tests existentes
(leidos), `docs/producto/*`, `spec.md`, `tareas.md` ni el guard
`vitest.cucumber.config.ts` (`INC00_SCENARIO_COUNT = 153`) fue modificado.

### 3.1 Archivos nuevos (8)

| # | Archivo | Contenido | Criterios trazados |
|---:|---|---|---|
| 1 | `club-beasts-api/tests/integration/hu13-servicio-personalizado.test.ts` | 46 tests (`fastify.inject`) | `INC05-PER-01..04` + regresion `REG-01..03` (C1) |
| 2 | `club-beasts-api/tests/integration/hu14-servicio-nutricion.test.ts` | 41 tests (`fastify.inject`) | `INC05-NUT-01..04` + regresion `REG-04` (C1) |
| 3 | `club-beasts-api/features/servicio-personalizado.feature` | 31 escenarios (26 simples + outline x5) `@inc05` | `INC05-PER-01..04` |
| 4 | `club-beasts-api/features/servicio-nutricion.feature` | 30 escenarios (25 simples + outline x5) `@inc05` | `INC05-NUT-01..04` |
| 5 | `club-beasts-api/features/steps/inc05-servicios.steps.ts` | ~50 step definitions nuevos (Givens/Whens/Thens) | soporte de 3 y 4 |
| 6 | `club-beasts-api/features/steps/inc05-soporte.ts` | `getInc05App()` (registro fs de `src/routes/*.ts`), fixtures y `Inc05World` extendido | soporte de 3 y 4 |
| 7 | `club-beasts-web/tests/unit/membership-tipo-servicio.test.tsx` | 5 tests (jsdom, mock de `@/lib/api`) | `INC05-PER-04` / `INC05-NUT-04` (DEC-045 = (b)) |
| 8 | `club-beasts-web/tests/e2e/inc05-tipos-vigencia.spec.ts` | 1 E2E real (fixtures por HTTP + ficha + recarga) | `INC05-PER-04` / `INC05-NUT-04` (DEC-045 = (b)) |

**No se escribieron pruebas de `INC05-PER-05` / `INC05-NUT-05` (EXCLUIDO).**

### 3.2 Comandos y resultados ejecutados

**1) `cd club-beasts-api && npx tsc --noEmit`** -> **exit 0**.
Nota: el `tsconfig` de API excluye `tests/`, por lo que este check cubre `src/`
(el RED no puede romper la compilacion de produccion).

**2) `cd club-beasts-api && npx vitest run`** -> **exit 1** (rojo deliberado).

- Total: **623 tests / 31 archivos** -> `84 failed | 539 passed`.
- Rojos: **84, solo en los 2 archivos nuevos**:
  - `hu13-servicio-personalizado.test.ts`: **46 tests -> 44 rojos / 2 verdes**.
  - `hu14-servicio-nutricion.test.ts`: **41 tests -> 40 rojos / 1 verde**.
- **Base intacta: 536/536 en 29 archivos** (29 passed; ninguno roto).
- Causas (agrupacion de los 84 fallos): las rutas nuevas aun no existen, asi
  que el `404` de Fastify sustituye al codigo esperado - `200` (28x), `400`
  (15x), `201` (13x), `409` (11x), `403` (6x), codigo `NOT_FOUND` (10x) - y un
  rojo expone la **incompatibilidad #1** del spec: `REG-01` esperaba
  `GET .../membresias-gym` con 1 fila GYM y recibio 3 (GYM + PERSONALIZADO +
  NUTRICION sin filtrar, `membresia.service.ts:407-411`). Otros rojos de
  diseno: `NUTRICION -> 409 CONGELACION_NO_PERMITIDA` (**gap DEC-042**,
  `TIPOS_CONGELABLES` en `membresia.service.ts:286` solo `{GYM, PERSONALIZADO}`)
  y los guards C1 (`409 MEMBRESIA_SOLAPADA` espurio por consultas sin filtro
  de tipo en `membresia.service.ts:772-778` y `:938-944`).
- **Verdes nuevos aditivos (3, documentados)**: 2 tests `INC05-PER-04` y 1 test
  `INC05-NUT-04` de ficha `GET /clientes/:id`, que hoy ya expone
  `tipoServicio`/`estado` por fila (`cliente.service.ts:93-99,373-375`); pasan
  en RED por ser observacion aditiva, no defecto.

**3) `cd club-beasts-api && npm run test:gherkin`** -> **exit 1** (esperado).

- Ejecutados: **214 escenarios = 153 base + 61 nuevos** (31 HU-13 + 30 HU-14).
- Resultado: `57 failed | 157 passed` en `11` archivos
  (`2 failed | 9 passed`): los 2 archivos nuevos fallan; los **9 archivos base
  pasan 153/153**.
- Causa del exit 1: la guarda de alcance - `[INC00-QA-06] Alcance Gherkin
  incompleto: se esperaban 153 escenarios ejecutados y se obtuvieron 214`.
  El guard **`INC00_SCENARIO_COUNT = 153` NO fue tocado**; en GREEN debe
  actualizarse a **214**.
- De los 61 escenarios nuevos: **57 rojos / 4 verdes**. Los verdes aditivos son
  los 2+2 escenarios de ficha (`INC05-PER-04` / `INC05-NUT-04`, mismos que en
  integracion). Los rojos se agrupan en: rutas inexistentes (404), gap de
  congelacion `NUTRICION` (DEC-042) y guards C1 de tipo (sin filtro).

**4) Web** (`cd club-beasts-web`):

- `npx tsc --noEmit` -> **exit 0** (el `tsconfig` del web **si** incluye
  `tests/`: los 2 archivos nuevos del web quedan type-clean, obligatorio aqui).
- `npx vitest run` -> **exit 1**: `2 failed | 186 passed` (188 tests / 23
  archivos). Rojos: **2, solo en `tests/unit/membership-tipo-servicio.test.tsx`**
  (etiqueta `Personalizado` ausente en la fila PERSONALIZADO y `Nutrición`
  ausente en la fila NUTRICION = **DEC-045 (b)**). **Base intacta: 183/183 en
  22 archivos**; los 3 tests nuevos de no-rotulo cruzado pasan en RED (guardas
  de GREEN, aserciones reales sobre el DOM).

**5) E2E (alcance del RED: solo la spec nueva)**

- `npx playwright test tests/e2e/inc05-tipos-vigencia.spec.ts` -> **exit 1**:
  1 test / 1 failed en la **creacion de fixture**:
  `POST /servicios-personalizado devolvio 404: {"message":"Route
  POST:/clientes/<id>/servicios-personalizado not found", ...}` (esperado 201).
  Servidores de prueba levantados por `playwright.config.ts` (API SQLite
  temporal 3001 + Next dev 3000). La suite base de Playwright **no se
  re-ejecuto en RED** (fuera del alcance del contrato; fila 11, fase GREEN).

**6) `git status --porcelain`** -> verificado el 2026-10-20.

- **Cero cambios en `club-beasts-api/src/`, `club-beasts-web/src/` y `prisma/`.**
- `docs/producto/decisiones.md` figura `M` pero **no es de este paquete**:
  mtime `2026-10-20 11:36` (anterior a la sesion RED, 13:30+), cambio del
  orquestador (registro DEC-042..047). Del mismo origen previo: `.opencode/*`,
  `AGENTS.md`, `opencode.jsonc`, G14 de HU-13/HU-14 (analyst, 11:10) y los
  directorios `docs/incrementos/INC-06-*` / `INC-07-*`.
- Aportes de este paquete en `git status`: **solo los 8 archivos nuevos** de la
  tabla 3.1 y esta seccion RED de `evidencia.md`.

### 3.3 Hallazgos del RED

1. **Endpoints inexistentes (rojo esperado)**: `POST/GET/PATCH
   .../servicios-personalizado|servicios-nutricion` devuelven 404 - red bajo
   prueba para `PER-01/02`, `NUT-01/02` y ambas ramas `DEC-047`/`DEC-046`.
2. **Incompatibilidad #1 visible en `REG-01`**: `GET .../membresias-gym` no
   filtra `tipoServicio` y devuelve las 3 filas de un cliente mixto.
3. **Gap `DEC-042`**: `congelarVigencia` rechaza `NUTRICION` con `409
   CONGELACION_NO_PERMITIDA` (`TIPOS_CONGELABLES` sin `NUTRICION`); los
   estados `CONGELADO` de `PER-03`/`NUT-03` quedan rojos hasta GREEN.
4. **Guards C1 rojos por diseno**: `congelarVigencia` (`membresia.service.ts:772-778`)
   y `editarCongelacion` (`:938-944`) consultan otros periodos **sin filtro de
   tipo** y producen `409 MEMBRESIA_SOLAPADA` espurio en clientes mixtos
   (rojo intencional de REG-02/REG-03/REG-04 y de los guards Gherkin C1).
5. **Superficie web sin etiquetar (DEC-045 (b))**: `MembershipSection` pinta
   las 3 filas sin distinguir `tipoServicio` - los 2 rojos de unit + el E2E.
6. **Verdes aditivos en RED (documentados, no son falsos rojos)**: ficha
   `GET /clientes/:id` ya expone `tipoServicio`/`estado` por fila -> 3 tests de
   integracion + 4 escenarios Gherkin pasan en RED; son observacion de un
   contrato ya existente y no sustituyen la verificacion del pintado web.
7. **Supuesto documentado del mock web**: el unit test de `@/lib/api` resuelve
   filas por nombre de metodo (`membresias.list`); si la GREEN introduce otro
   metodo de carga para los servicios (p. ej. `api.servicios.list`), hay que
   ajustar el mock sin debilitar las aserciones de etiqueta.
8. **Dependencia de diseno del E2E**: el E2E exige las 3 filas etiquetadas en
   la ficha; si en GREEN `GET .../membresias-gym` se filtra a GYM (incompatibilidad
   #1), la web debe agregar los otros dos tipos (metodo propio o ficha) para
   que el pintado minimo siga siendo observable - eso es exactamente lo que el
   criterio `INC05-PER-04`/`NUT-04` exige.

**Conteos para GREEN** (a verificar contra esta base): API `623 = 536 base +
87 nuevos (84 rojos)`; Gherkin `214 = 153 + 61` (**guard a 214**); web
`188 = 183 + 5 (2 rojos)`; E2E spec nueva 1 test rojo (base Playwright 56/56
pendiente de re-ejecucion en GREEN).

## 4. Verificacion / GREEN (ejecutado 2026-10-27, tarea #17 + enmiendas #15a + enmienda R-10-like de `congelacion.spec.ts:331`, ver 4.8)

Ejecutado por `test-engineer` bajo contrato de `delivery-orchestrator`
(incremento INC-05, tareas **#15a** y **#17**, criterios `INC05-PER-01..04` +
`INC05-NUT-01..04` + regresion HU-15/C4). **Ningun test ni asercion fue borrado.**

### 4.1 Enmiendas aplicadas (Parte A)

| # | Archivo | Enmienda exacta |
|---:|---|---|
| 1 | `club-beasts-api/tests/integration/membresia-congelacion.test.ts` | (a) Test C4 **"filas 12/31"** enmendado de `409 CONGELACION_NO_PERMITIDA` a **`200` + `estado` `CONGELADO`**, validando el DTO con `congelacionResponseSchema`, `tipoServicio` NUTRICION, `fechaFinAnterior` dia(30) -> `fechaFin` dia(40), `diasCongelados` 10, `version` 2, fila BD `version` 2 / `fechaFin` dia(40) y **1** fila `CONGELACION`; nota de procedencia "Enmendado 2026-10-20 por DEC-042 (INC-05 C4)". (b) La rama **409 por tipo** se conserva **reencuadrada** en un test nuevo con `tipoServicio = "SERVICIO_EXTERNO"` (fuera de `TIPOS_CONGELABLES`), manteniendo literales, `version` 1, `fechaFin`/`fechaInicio` intactas y atomicidad (`cambios` = 1). (c) Cabecera del archivo con la nota DEC-042. |
| 2 | `club-beasts-api/tests/integration/membresia-descongelacion.test.ts` | Test **D15** enmendado: NUTRICION con pausa vigente -> **`200`**, `descongelarResponseSchema` valido, `fechaFinAnterior` dia(40), `diasDevueltos` **8** (formula DEC-024: 2 dias ya consumidos), `fechaFin` dia(32), `estado` `ACTIVA`, `version` 3, `congelacion` `null`, fila BD + **1** fila `DESCONGELACION`; procedencia DEC-042. **Nuevo test D15'** que reencuadra el 409 por tipo con `SERVICIO_EXTERNO` y **sin pausa** (ademas fija el orden tipo -> `CONGELACION_INEXISTENTE`). |
| 3 | `club-beasts-api/tests/integration/membresia-editar-congelacion.test.ts` | Test **E14** enmendado: NUTRICION con pausa vigente -> **`200`**, `editarCongelacionResponseSchema` valido, `fechaFinAnterior` dia(40) -> `fechaFin` dia(50), `diasCongelados` 20 / `diasCongeladosAnterior` 10, `estado` `CONGELADO`, `version` 3, bloque `congelacion` completo, auditoria `EDICION_CONGELACION` y fila BD `version` 3 / `fechaFin` dia(50); procedencia DEC-042. **Nuevo test E14'** que reencuadra el 409 por tipo con `SERVICIO_EXTERNO` y sin pausa (orden tipo -> `CONGELACION_INEXISTENTE`). |
| 4 | `club-beasts-api/tests/integration/hu13-servicio-personalizado.test.ts` | **Solo la fecha de la fixture REG-03**: pausa `en(2)..en(3)` -> **`en(0)..en(2)`** (mismo patron que PER-03 lineas 917/931 y REG-04 de HU-14); la asercion `estado === "CONGELADO"` **queda intacta** y el comentario explica que `calcularEstado` (INC-02) solo da CONGELADO si hoy cae dentro de la pausa. `src/` sin tocar. |
| 5 | `club-beasts-api/features/steps/inc05-servicios.steps.ts` | **Nuevo step** `Then "la vigencia de nutricion del {string} al {string} conserva la versión {int}"` (espejo del de personalizado, lineas 704-715) con las **mismas** aserciones (`fila` definida + `version` exacta). `features/servicio-nutricion.feature` **sin cambios** (el escenario de la linea 51-57 ya era correcto). |
| 6 | `club-beasts-api/vitest.cucumber.config.ts` | **Solo** la linea 27: `INC00_SCENARIO_COUNT = 153` -> **`214`** (autorizado). |

### 4.2 Comandos y resultados (Parte B)

| # | Fase | Directorio | Comando | Esperado | Resultado | Fecha |
|---:|---|---|---|---|---|---|
| 6 | GREEN | `club-beasts-api` | `npx tsc --noEmit` | exit 0 | **exit 0** | 2026-10-27 |
| 7 | GREEN | `club-beasts-api` | `npx vitest run` | 623/623 (base 536 intacta) | **exit 0 — 626/626 en 31 archivos** (desviacion **+3** ver 4.3; base 536 **no pierde ningun test**: 539/539) | 2026-10-27 |
| 8 | GREEN | `club-beasts-api` | `npm run test:gherkin` | 214/214 exit 0 con guard 214 | **exit 0 — 214/214 en 11 archivos** (incluye `servicio-nutricion.feature` 30/30 con el step nuevo; guard acepta 214) | 2026-10-27 |
| 9 | Modelo | `club-beasts-api` | `npx prisma migrate status` | 9/0 sin drift | **exit 0 — 9 migrations found, "Database schema is up to date!"** (0 pendientes, sin drift) | 2026-10-27 |
| 10 | GREEN | `club-beasts-web` | `npx tsc --noEmit` | exit 0 | **exit 0** | 2026-10-27 |
| 11 | GREEN | `club-beasts-web` | `npx vitest run` | 188/188 | **exit 0 — 188/188 en 23 archivos** (base 183 intacta + 5 INC-05) | 2026-10-27 |
| 12 | GREEN | `club-beasts-web` | `npm run build` | PASS | **exit 0 (PASS)** — 11 rutas generadas, middleware compilado | 2026-10-27 |
| 13 | E2E | `club-beasts-web` | `npx playwright test --reporter=line` (corrida 1) | 57/57 | **exit 1 — 57 ejecutados: 56 passed / 1 failed** (flaky de la base, ver 4.4); el E2E nuevo `inc05-tipos-vigencia.spec.ts:70` **paso** | 2026-10-27 |
| 14 | E2E | `club-beasts-web` | `npx playwright test --reporter=line` (corrida 2) | 57/57 | **exit 0 — 57 passed / 0 failed / 0 skipped** | 2026-10-27 |
| 15 | E2E | `club-beasts-web` | `npx playwright test --reporter=line` (corrida 3, caracterizacion del flaky) | 57/57 | **exit 0 — 57 passed** | 2026-10-27 |
| 16 | E2E | `club-beasts-web` | `npx playwright test tests/e2e/inc04-estados-cliente.spec.ts -g "reactivar (DEC-020)" --repeat-each=3` | estable | **exit 0 — 3 passed** (el fallo de la corrida 1 no reproduce) | 2026-10-27 |
| 17 | Alcance | raiz | `git status --porcelain` | sin tocar `src/`, `prisma/`, `docs/producto/`, specs/tareas ni otros incrementos | **OK** (ver 4.5) | 2026-10-27 |
| 18 | E2E | `club-beasts-web` | `npx playwright test --reporter=line` (corrida 4) | 57/57 | **exit 1 — 55 passed / 2 failed**: `congelacion.spec.ts:331` (`toHaveCount` "Congelar" 1 -> 0) + `inc04-estados-cliente.spec.ts:152` (badge esperado "ACTIVO", recibido "INACTIVO") | 2026-10-27 |
| 19 | E2E | `club-beasts-web` | `npx playwright test tests/e2e/inc04-estados-cliente.spec.ts --reporter=line --repeat-each=6` (antes del fix) | estable | **exit 1 — 13 passed / 11 failed (24)**: `:152` 6/6 y `:191` 5/6 fallaron; `:98` y `:127` pasaron 12/12 | 2026-10-27 |
| 20 | Diagnostico | `club-beasts-web` | `npx playwright test tests/e2e/inc04-estados-cliente.spec.ts -g "inactivar con motivo" --repeat-each=6 --trace=on` | trazas del fallo | **exit 1 — 6 failed**; red + timeline conservados en `%TEMP%\opencode\cb-trace-r0` y `cb-e2e-inc04-trace2.log` | 2026-10-27 |
| 21 | Fix R-10 | `club-beasts-web` | edicion de `tests/e2e/inc04-estados-cliente.spec.ts` (helper `cambiarEstadoEnFicha`) | determinista | **Aplicado** (ver 4.7): espera de la respuesta del `GET` de recarga `/clientes/:id` + asercion `200`; `-27/+4` lineas | 2026-10-27 |
| 22 | E2E | `club-beasts-web` | `npx playwright test tests/e2e/inc04-estados-cliente.spec.ts --reporter=line --repeat-each=6` (tras el fix) | 0 fallos en 6+ repeticiones | **exit 0 — 24 passed** (6 repeticiones de los 4 tests) | 2026-10-27 |
| 23 | E2E | `club-beasts-web` | `npx playwright test --reporter=line` (corrida A) | 57/57 | **exit 0 — 57 passed / 0 failed / 0 skipped** | 2026-10-27 |
| 24 | E2E | `club-beasts-web` | `npx playwright test --reporter=line` (corrida B) | 57/57 | **exit 1 — 56 passed / 1 failed**: unicamente `congelacion.spec.ts:331` (bloqueo 4.6); los 4 tests INC-04 pasaron | 2026-10-27 |
| 25 | E2E | `club-beasts-web` | `npx playwright test --reporter=line` (corridas **C y D consecutivas**, pareja exigida) | 2 corridas 57/57 exit 0 | **exit 0 + exit 0 — 57 passed / 0 failed / 0 skipped en cada una** | 2026-10-27 |
| 26 | Tipocheck | `club-beasts-web` | `npx tsc --noEmit` (tras el fix del spec INC-04) | exit 0 | **exit 0** (sin errores) | 2026-10-27 |
| 27 | Tipocheck | `club-beasts-web` | `npx tsc --noEmit` (tras la enmienda de `congelacion.spec.ts:331`, ver 4.8) | exit 0 | **exit 0** (sin errores; el `tsconfig` incluye `tests/`) | 2026-10-27 |
| 28 | E2E | `club-beasts-web` | `npx playwright test tests/e2e/congelacion.spec.ts --reporter=line --repeat-each=6` (enmienda R-10-like, foreground) | 0 fallos en 6 repeticiones | **exit 0 — 30 passed (5.7m)**: 6 repeticiones x 5 tests; `congelacion.spec.ts:331` **6/6 verde** | 2026-10-27 |
| 29 | E2E | `club-beasts-web` | `npx playwright test --reporter=line` (corrida **E**, post-enmienda, foreground) | 57/57 | **exit 0 — 57 passed / 0 failed / 0 skipped (6.1m)** | 2026-10-27 |
| 30 | E2E | `club-beasts-web` | `npx playwright test --reporter=line` (corrida **F**, consecutiva con E — pareja que cierra el requisito) | 2 corridas 57/57 exit 0 | **exit 0 — 57 passed / 0 failed / 0 skipped (5.8m)**; con la E: **pareja E+F verdes consecutivas** | 2026-10-27 |

Desglose de los **626** tests API (31 archivos): base INC-02/INC-00 **539/539**
(536 certificados + 3 tests nuevos de la rama 409 por tipo, ver 4.3) + INC-05
**87/87** (`hu13-servicio-personalizado.test.ts` 46 + `hu14-servicio-nutricion.test.ts` 41).

### 4.3 Desviacion de conteos y decisiones de la Parte A

- **API 626 vs 623 esperados (+3)**: son exactamente los 3 tests que el contrato
  pedia en el punto A.4 para **no perder** la cobertura de la rama
  `409 CONGELACION_NO_PERMITIDA` por tipo al enmendar D15/E14. Antes de las
  enmiendas esa rama solo se alcanzaba con `tipoServicio = "NUTRICION"` (hoy
  legal por DEC-042) y **ningun test** la cubria con un tipo fuera del set, y al
  convertir D15/E14 a `200` las rutas `descongelar` y `editar` se quedaban sin
  cobertura de ese 409. Los 3 tests siembran la fila **via Prisma directo**
  (fixture de BD, patron DEC-012, campo `String` sin constraint en
  `prisma/schema.prisma:81`), son deterministas (fechas relativas a
  `getTodayBogota()`) y asientan **ademas** el orden de guarda
  (tipo -> vencida/`CONGELACION_INEXISTENTE`) y la atomicidad (`version`,
  `fechaFin`, `fechaInicio` y `cambios` sin escribir).
  **Ningun test se elimino**: 536 base -> 539, 87 nuevos INC-05 intactos.
- **Gherkin 214/214 y guard `INC00_SCENARIO_COUNT = 214`**: el unico cambio del
  guard es el numero (autorizado en el contrato); con 153 marcaba exit 1 aunque
  los 214 escenarios pasaran.
- **E2E 57 = 56 base + 1 nuevo** (`inc05-tipos-vigencia.spec.ts`), sin steps
  opcionales ni aserciones vacias y sin skips en ninguna corrida.

### 4.4 Flaky observado (reportado, sin skips y sin tocar el test)

- **Nombre exacto**: `club-beasts-web/tests/e2e/inc04-estados-cliente.spec.ts:191`
  > `INC-04: ciclo completo HU-08 (inactivar -> bloqueo -> reactivar) › reactivar (DEC-020) devuelve el acceso: el login del cliente vuelve al portal con su ultimo cambio`
- **Corrida 1: 1 failed / 56 passed (57 ejecutados, 0 skips), exit 1.**
  Corridas 2 y 3: **57/57 exit 0**; repeticion dirigida `--repeat-each=3`:
  **3/3 passed**. El detalle de la asercion de la corrida 1 no quedo en el
  buffer de salida (solo se conservo el nombre del test), por lo que se reporta
  como **flaky no reproducido** y **no** como regresion.
- **Es de la base INC-04**, fuera de mis areas permitidas: **no se toco** el
  spec, ni `src/`, ni se agrego skip/reintento. Riesgo residual a cargo del
  orquestador (precedente R-10).
- **Actualizacion (tarea #17, misma fecha): ese flaky si se reprodujo y ya
  quedo cerrado en 4.7** (`--repeat-each=6` pre-fix: 11 failed / 13 passed;
  fix determinista en el propio spec; `--repeat-each=6` post-fix: 24 passed,
  exit 0). La fila 19 y las 4.7 sustituyen a la calificacion de "no
  reproducido" de arriba. El flaky de `congelacion.spec.ts:331` **tambien
  quedo cerrado** por la enmienda de **4.8** (bloqueo de 4.6 resuelto).

### 4.5 Alcance (`git status --porcelain`, raiz)

Cambiado por esta tarea (6 archivos + esta seccion):
`club-beasts-api/tests/integration/membresia-congelacion.test.ts`,
`club-beasts-api/tests/integration/membresia-descongelacion.test.ts`,
`club-beasts-api/tests/integration/membresia-editar-congelacion.test.ts`
(modificados); `club-beasts-api/tests/integration/hu13-servicio-personalizado.test.ts`,
`club-beasts-api/features/steps/inc05-servicios.steps.ts` (archivos no
versionados ya presentes en el baseline, editados);
`club-beasts-api/vitest.cucumber.config.ts` (solo el guard) y esta
`evidencia.md` (solo seccion 4).

Sin cambios mios en `club-beasts-api/src/`, `club-beasts-web/src/`, `prisma/`,
`docs/producto/*`, `spec.md`, `tareas.md` ni incrementos ajenos. El resto de la
salida `git status` es identica al baseline tomado al inicio de la sesion
(`.opencode/*`, `AGENTS.md`, `opencode.jsonc`, `HU-13/14/15-*.{md,ts}`,
`src/routes/membresia.ts`, `src/services/membresia.service.ts`,
`MembershipSection.tsx`, `lib/api.ts`, `docs/producto/{avance,decisiones}.md`,
y sin commitear: INC-05/06/07, `src/schemas/servicio.schema.ts`,
`src/services/servicio.service.ts`, `inc05-soporte.ts`) **sin revertir ni
modificar**.

**Tarea #17 (estabilizacion E2E, misma seccion)**: el unico archivo de codigo
tocado en esta fase es
`club-beasts-web/tests/e2e/inc04-estados-cliente.spec.ts` (**+27/-4**, helper
`cambiarEstadoEnFicha` y sus 4 call-sites), autorizado expresamente para el fix
R-10. **Sin tocar** `club-beasts-api/src/`, `club-beasts-web/src/`,
`prisma/`, `tests/e2e/*.spec.ts` distintos de INC-04 (en particular
`congelacion.spec.ts` **solo lectura**), otros tests, `docs/producto/*`,
`tareas.md` ni incrementos ajenos. Sin skips, sin `waitForTimeout`, sin pasos
opcionales y sin relajar autenticacion ni PIN. La salida completa de
`git status --porcelain` quedo:

```text
 M .opencode/agents/acceptance-criteria-analyst.md
 M .opencode/agents/backend-developer.md
 M .opencode/agents/code-reviewer.md
 M .opencode/agents/database-admin.md
 M .opencode/agents/delivery-orchestrator.md
 M .opencode/agents/devops-engineer.md
 M .opencode/agents/frontend-developer.md
 M .opencode/agents/test-engineer.md
 M .opencode/commands/inc-close.md
 M .opencode/commands/inc-start.md
 M .opencode/commands/inc-status.md
 M AGENTS.md
 M club-beasts-api/features/acceptance-criteria/HU-13-criterios-aceptacion.md
 M club-beasts-api/features/acceptance-criteria/HU-13-schemas.ts
 M club-beasts-api/features/acceptance-criteria/HU-14-criterios-aceptacion.md
 M club-beasts-api/features/acceptance-criteria/HU-14-schemas.ts
 M club-beasts-api/features/acceptance-criteria/HU-15-criterios-aceptacion.md
 M club-beasts-api/features/acceptance-criteria/HU-15-schemas.ts
 M club-beasts-api/src/routes/membresia.ts
 M club-beasts-api/src/services/membresia.service.ts
 M club-beasts-api/tests/integration/membresia-congelacion.test.ts
 M club-beasts-api/tests/integration/membresia-descongelacion.test.ts
 M club-beasts-api/tests/integration/membresia-editar-congelacion.test.ts
 M club-beasts-api/vitest.cucumber.config.ts
 M club-beasts-web/src/components/MembershipSection.tsx
 M club-beasts-web/src/lib/api.ts
 M club-beasts-web/tests/e2e/inc04-estados-cliente.spec.ts   <-- unico cambio mio de la tarea #17
 M docs/producto/avance.md
 M docs/producto/decisiones.md
 M opencode.jsonc
?? .opencode/agents/ui-navigation-auditor.md
?? club-beasts-api/features/servicio-nutricion.feature
?? club-beasts-api/features/servicio-personalizado.feature
?? club-beasts-api/features/steps/inc05-servicios.steps.ts
?? club-beasts-api/features/steps/inc05-soporte.ts
?? club-beasts-api/src/schemas/servicio.schema.ts
?? club-beasts-api/src/services/servicio.service.ts
?? club-beasts-api/tests/integration/hu13-servicio-personalizado.test.ts
?? club-beasts-api/tests/integration/hu14-servicio-nutricion.test.ts
?? club-beasts-web/tests/e2e/inc05-tipos-vigencia.spec.ts
?? club-beasts-web/tests/unit/membership-tipo-servicio.test.tsx
?? docs/incrementos/INC-05-servicios-personalizado-nutricion/
?? docs/incrementos/INC-06-acceso-sin-membresia-activa/
?? docs/incrementos/INC-07-navegacion-login-pin/
```

(identico al baseline de la sesion mas `inc04-estados-cliente.spec.ts`, mi unico
cambio; `evidencia.md` esta sin commitear dentro de `docs/incrementos/INC-05-*`.)

### 4.6 Riesgos y bloqueos

- **Bloqueo 1 (tarea #17): `club-beasts-web/tests/e2e/congelacion.spec.ts:331`
  (aserciones en las lineas 372-373) — flaky reproducido, fix fuera de mi
  alcance.**
  - **Sintoma** (corridas 1, 4 y B; 3 de 7 corridas completas; las corridas
    2, 3, A, C y D pasaron):
    `expect(getByRole("button", { name: "Congelar", exact: true })).toHaveCount(1)`
    recibio **0** durante 14 intentos / 5000 ms, con el dialogo 409
    ("Los datos fueron modificados por otro usuario...") y el
    `heading "Congelar membresía"` correctamente visibles.
  - **Causa raiz**: el propio test aplica con exito una pausa por API en la
    linea 354 (`congelarApi`, que en la 360 aserta
    `version === vigencia.version + 1`, es decir: **si escribio** la pausa
    -2..+7). Las lineas 372-373 solo son ciertas mientras la fila de la UI
    conserva el snapshot previo; si `loadMembresias()` refresca la fila
    (refresco tardio/adicional, agravado por `reactStrictMode: true` en
    `club-beasts-web/next.config.ts:4`), la fila muestra legítimamente
    `Descongelar` / `Editar congelación` -> cuenta 0 -> fallo. Evidencia
    preservada: error-context de la corrida 4 y `cb-e2e-runB.log`.
  - **Por que no lo arreglé**: el fix exige editar `congelacion.spec.ts`
    (solo lectura por contrato) o `club-beasts-web/src/` (prohibido). **No
    toque ninguno de los dos.**
  - **Decision requerida del orquestador** (una de ambas, con contrato
    propio): (a) reencuadrar `congelacion.spec.ts:371-373` para exigir el
    estado que deja la pausa exitosa de la linea 354 (o eliminar esa pausa
    previa y usar un avance de version que no escriba), o (b) corregir el
    refresco de la fila en `src/`. **Mientras no se decida, la pareja de
    corridas verdes (C y D) no garantiza que la siguiente corrida sea verde.**
  - **RESUELTO (misma fecha)**: el orquestador enmendo el propio test con la
    decision (a) bajo el patron f2968c5 (enmienda autorizada de un test base
    de INC-02, contrato propio); la verificacion ejecutada que cierra el
    bloqueo (tsc + rep6 30/30 + corridas E/F 57/57 consecutivas) esta en
    **4.8**.
- **Bloqueos previos de la Parte A/B: ninguno.** Ningun fallo de esas tareas
  exigio tocar `src/`.
- **Riesgo 1**: flaky de base `inc04-estados-cliente.spec.ts` **cerrado en
  4.7** (reproducido, diagnosticado con traza y corregido en el propio test);
  queda como riesgo residual la latencia de `getSession()` en `fetchApi`
  (`club-beasts-web/src/lib/api.ts`), que es la causa subyacente: anyade
  ~2.5s antes de cada llamada y hace que las ventanas de asercion de 5s se
  queden cortas bajo carga paralela.
- **Riesgo 2**: los 3 tests nuevos de la rama 409 por tipo dependen de que
  `tipoServicio` siga siendo `String` sin constraint en Prisma; si se pasa a
  enum, habra que reencuadrarlos (no debilitarlos).
- **Riesgo 3**: la cuenta 626 = 539 base + 87 nuevos reemplaza a la
  "623 = 536 + 87" prevista en 3.3 al cierre del RED; el orquestador debe usar
  el desglose de 4.2 para el certificado.

### 4.7 Estabilizacion R-10 de `inc04-estados-cliente.spec.ts` (tarea #17)

**Reproduccion (R-10.a)** — `npx playwright test tests/e2e/inc04-estados-cliente.spec.ts
--reporter=line --repeat-each=6` **antes** del fix:

- **exit 1 — 13 passed / 11 failed (24)**.
- `:152` (ciclo HU-08): **6/6 fallos** (5 en la linea 163, badge recibido
  `NUEVO`; 1 en la 177, badge recibido `INACTIVO`).
- `:191` (reactivar): **5/6 fallos** en la linea 203, badge recibido `INACTIVO`.
- `:98` y `:127`: **12/12 pasaron**.

**Causa raiz (R-10.b, con evidencia de traza `cb-trace-r0`)**

`club-beasts-web/src/lib/api.ts` ejecuta `await getSession()` dentro de
`fetchApi` **antes de cada llamada**. Con la suite completa en paralelo esa
lectura de `/api/auth/session` cuesta ~2.5 s. Timeline monotono de la traza
del fallo (ms):

| t | evento |
|---:|---|
| 16489 | click en `Guardar` |
| 16549 → 16558 | espera `toHaveCount(0)` sobre `Guardar`: resuelve en **9 ms** (el `Button` con `loading` cambia su nombre accesible al empezar a guardar, asi que **no** es una senal del fin del guardado) |
| 16559 → 21573 | asercion `toHaveText` del badge: ventana de **5014 ms**, termina en **timeout** |
| 19013 → 19031 | `PATCH /clientes/:id` arranca **2.47 s despues del click** y responde 200 en 17.6 ms |
| 21586 | `GET /clientes/:id` (recarga de `loadCliente`) arranca **13 ms despues** de que la ventana del badge expirara; responde 200 con `estado: "INACTIVO"` |

Es decir: **los datos si llegaban y eran correctos, pero la ventana de 5 s de
la asercion empezaba antes que el propio guardado** y se agotaba justo antes
de que la recarga llegara. Con la carga de 3 workers el margen llego a ser
negativo en corridas enteras (corrida 4 e `inc04:152`).

**Fix determinista (R-10.c) — un solo archivo, `+27/-4`**

```diff
-async function cambiarEstadoEnFicha(page, estado, motivo) {
+async function cambiarEstadoEnFicha(page, clienteId, estado, motivo) {
   await page.getByRole("button", { name: "Editar" }).click();
   await page.getByLabel("Estado").selectOption(estado);
   await page.getByLabel("Motivo").fill(motivo);
+  // R-10: la recarga de la ficha tras guardar viaja por `fetchApi`, que
+  // espera a `getSession()` antes de cada llamada (~2.5s antes del PATCH y
+  // ~2.5s antes del GET de recarga): esperar esa respuesta en vez de asumir
+  // la ventana de 5s del badge (traza: GET en 21586ms vs fin del expect
+  // en 21573ms).
+  const recarga = page.waitForResponse((res) => {
+    if (res.request().method() !== "GET") return false;
+    try { return new URL(res.url()).pathname === `/clientes/${clienteId}`; }
+    catch { return false; }
+  });
   await page.getByRole("button", { name: "Guardar" }).click();
+  const respuesta = await recarga;
+  expect(respuesta.status(), "la recarga de la ficha tras guardar debe responder 200").toBe(200);
 }
```

Los 4 call-sites (`:158`, `:185`, `:199`, `:225`) pasan ahora `cliente.id`.

- Sin `waitForTimeout` ciego, sin skips/`only`, sin pasos opcionales.
- **No debilita** aserciones: agrega una (`status === 200` de la recarga) y
  las de badge siguen siendo `toHaveText(...)` con su ventana completa,
  ahora arrancando cuando la recarga ya esta en vuelo.

**Verificacion (R-10.d) y corridas completas**

| corrida | comando | resultado |
|---|---|---|
| post-fix | `...inc04-estados-cliente.spec.ts --repeat-each=6` | **exit 0 — 24 passed** (6 repeticiones, 0 fallos) |
| A | `npx playwright test --reporter=line` | **exit 0 — 57 passed** |
| B | `npx playwright test --reporter=line` | **exit 1 — 56 passed / 1 failed** (solo `congelacion.spec.ts:331`, bloqueo 4.6) |
| **C y D (pareja consecutiva)** | `npx playwright test --reporter=line` x2 | **exit 0 y exit 0 — 57 passed / 0 failed / 0 skipped en cada una** |

Logs conservados sin secretos en `C:\Users\User\AppData\Local\Temp\opencode\`:
`cb-e2e-inc04-rep6.log` (pre-fix), `cb-e2e-inc04-trace2.log`,
`cb-e2e-inc04-fix-rep6.log` (primer intento de fix — espera sobre `Guardar` —
todavia 10 failed / 14 passed), `cb-e2e-inc04-fix2-rep6.log`
(post-fix 24/24), `cb-e2e-runA.log`, `cb-e2e-runB.log`, `cb-e2e-runC.log`,
`cb-e2e-runD.log`, mas `cb-trace-r0/` (red + timeline de la traza) y
`cb-test-results-{run4,inc04rep6,trace}`.

### 4.8 Enmienda de `congelacion.spec.ts:331` (patron f2968c5, cierra el bloqueo 4.6)

**Causa (carrera snapshot vs refresh legitimo, decision (a) del bloqueo 4.6)**
El test aplica una pausa **exitosa via API** en la linea 354 (`hoy-2 ..
hoy+7`, "Viaje de trabajo", `version` 1 -> 2) y despues las lineas 371-373
exigian que la fila conservara `Congelar` con count 1. Eso solo es cierto
mientras la UI retiene el snapshot previo: cuando `loadMembresias()` refresca
(reactStrictMode + el merge de 3 fuentes anadido en el GREEN de INC-05), la
fila muestra **legitimamente** `Descongelar` porque **si existe una pausa** —
la de la API, no la del formulario. La premisa del comentario era ademas
debil ("la operacion rechazada no dejo pausa"): la pausa existente nunca fue
la del formulario. Es una carrera de render, no un defecto de negocio ni de
`src/` (el refresh es correcto; **no se toco la app**).

**Enmienda aplicada** (solo el bloque del test, `+33/-3`; nucleo intacto)

- **Conservado intacto** (lineas 344-370): dialogo 409
  `MEMBRESIA_CONFLICTO`, mensaje "Los datos fueron modificados por otro
  usuario. Recargue e intente nuevamente.", formulario `Congelar membresía`
  aun abierto y **sin** `status` de exito.
- **Reemplazado** (ex-lineas 371-373): verificacion determinista
  post-recarga (patron R-10): `page.reload()` + espera de estado cargado
  (heading "Membresías", sin texto CARGANDO); la fila refleja **la pausa de
  la API** (rango extendido `vigencia.fechaInicio .. fechaFin+10`, badge
  `Congelado`, linea `Pausa: ... Viaje de trabajo`, `Descongelar` count 1 y
  `Congelar` count 0) y **la pausa del formulario no existe** (`hoy ..
  hoy+5`, "Cambio de planes": count 0 del rango y del motivo visible).
- Sin `waitForTimeout`, sin skips, sin aserciones vacias ni conteos
  triviales: la cobertura "409 no aplica la pausa del formulario" queda
  **mas fuerte** (ademas del 409, verifica ambas pausas en estado estable
  tras recargar).

**Verificacion ejecutada (foreground)**

| # | Comando | Resultado |
|---:|---|---|
| 1 | `npx tsc --noEmit` | **exit 0** (el `tsconfig` del web incluye `tests/`) |
| 2 | `npx playwright test tests/e2e/congelacion.spec.ts --reporter=line --repeat-each=6` | **exit 0 — 30 passed (5.7m)**; `:331` **6/6 verde** |
| 3 | `npx playwright test --reporter=line` (corrida **E**) | **exit 0 — 57 passed (6.1m)** |
| 4 | `npx playwright test --reporter=line` (corrida **F**, consecutiva) | **exit 0 — 57 passed (5.8m)**; pareja **E+F** verde |

Intentos descartados (transparencia; **no** cuentan como evidencia): dos
corridas en background previas quedaron invalidas por el entorno — la primera
por liberacion de los puertos 3000/3001 durante su ejecucion (14 fallos
`ERR_CONNECTION_REFUSED`, contaminacion del entorno, no del test) y la
segunda al ser terminada para re-ejecutar en foreground por decision del
orquestador. Las corridas 28-30 de la tabla 4.2 (foreground) son las que
cierran el requisito. Las filas E/F sustituyen a la pareja C/D de 4.7 como
pareja consecutiva de cierre. Salidas completas conservadas en los buffers de
la sesion del orquestador (sin secretos). **`src/` sin tocar**: no hay bug de
refresh en la app que reportar.


### 4.9 Cierre H-01 (regresion DEC-047 en el `PATCH` de gym, `INC05-R11`)

**Archivo nuevo exclusivo**: `club-beasts-api/tests/integration/dec047-parche-gym-regresion.test.ts`
(6 pruebas **GREEN de regresion**; patron `fastify.inject`, fixtures DEC-012
con prefijo de cedula propio `9945`, limpieza deterministica antes/despues y
fechas relativas a `getTodayBogota()`). Endpoint ejercitado (verificado en
`src/routes/membresia.ts:260`): `PATCH /clientes/:clienteId/membresias-gym/:membresiaId`
-> `editarMembresia` (`membresia.service.ts:593`) -> `calcularFechasEdicion`.
**`src/` sin tocar**: las 6 pruebas pasan contra la implementacion actual, es
decir no se encontro bug de DEC-047 en gym (ninguna asercion se ajusto para
que pasara).

**Mapeo rama `INC05-R11` -> test** (spec.md:564, 220-224, 633):

| Rama | Test | Aserciones clave |
|---|---|---|
| 1. Solo `fechaInicio` +1 dia | `R11-1 mover SOLO fechaInicio +1 dia deja fechaFin en fin+1, conserva los 30 dias inclusivos, sube version 1 -> 2 y audita EDICION con las fechas efectivas` | `fechaFin` = `fin+1`; duracion inclusiva **identica** (30 -> 30); `version` 1 -> 2 en respuesta **y** BD; fila `tipoServicio: "GYM"`; auditoria `EDICION` con fechas **efectivas** C2 (anterior/nueva) |
| 2. Solo `fechaInicio` -3 dias | `R11-2 retroceder SOLO fechaInicio -3 dias retrocede fechaFin exactamente 3 y conserva la duracion inclusiva (version 2)` | `fechaFin` retrocede **exactamente 3**; duracion inclusiva 30 -> 30; `version` 2 |
| 3. `fechaFin` explicito | `R11-3 un PATCH de gym con SOLO fechaFin explicito conserva el inicio persistido y cambia la duracion inclusiva a la del cuerpo (30 -> 10, version 2)` | inicio persistido intacto; duracion inclusiva **nueva = 10** (y explicitamente `!= 30`); `version` 2 |
| 3b. Ambas fechas explicitas (ramita) | `R11-3b con fechaInicio y fechaFin explicitos en el MISMO request manda lo exactamente pedido (fin = fin cuerpo, NO fin+deltas) y la duracion inclusiva nueva es 19` | `fechaFin` = pedido (`!= fin+2`, sin desplazamiento doble); duracion inclusiva 19; auditoria con las fechas del cuerpo; `version` 2 |
| 4. Patron optimista (version+1) | `R11-4 cada edicion valida sube version +1 y un segundo PATCH con la version vieja responde 409 MEMBRESIA_CONFLICTO sin pisar fechas ni version` | edicion valida -> `version` 2; version vieja -> `409 MEMBRESIA_CONFLICTO` con literal, fechas/`version` intactas y `EDICION` count 1 |
| 5. Orden C2 sin regresion | `R11-5 (orden C2) con SOLO fechaInicio y nuevoInicio > finPersistido responde 400 VALIDATION_ERROR ANTES de desplazar fechaFin: fin intacto, version 1 y sin EDICION` | `400` + literal exacto; **`fechaFin` NO desplazado**; `version` 1; `EDICION` count 0 (sin escritura) |

**Comandos ejecutados (foreground)**:

| # | Comando (directorio) | Resultado |
|---:|---|---|
| 1 | `npx tsc --noEmit` (`club-beasts-api`) | **exit 0** (el `tsconfig` excluye `tests/`; se refuerza con #2) |
| 2 | `npx tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck tests/integration/dec047-parche-gym-regresion.test.ts` (`club-beasts-api`) | **exit 0** — el archivo nuevo typea en modo estricto; el mismo comando sobre `membresia-validacion.test.ts` (aceptado) tambien da **exit 0** (mismo modo de compilacion que los demas tests) |
| 3 | `npx vitest run` (`club-beasts-api`) | **exit 0 — 632/632 passed, 32 archivos**; base **626 intacta** (sin perdidas) + **6** del archivo nuevo (6/6 verdes) |

**Alcance**: solo el archivo nuevo de tests y esta subseccion 4.9; `src/`,
otros tests aceptados, `club-beasts-web/`, `prisma/`, `features/` (el guard de
214 escenarios no cambia), `docs/producto/*`, specs/tareas ni incrementos
ajenos (INC-06/07 y config de agentes sin commitear) fueron tocados. Sin
skips, sin aserciones vacias, sin relajar auth ni el PIN.

**Riesgos y bloqueos**: ninguno nuevo. **H-01 queda cerrado** con evidencia
ejecutada (la regresion de gym exigida por `INC05-R11` ahora existe y esta
verde); H-02/H-03 siguen tal como estaban (no bloquean).


## 5. Revision (`code-reviewer`, 2026-10-20)

**Dictamen final (tras la re-revision de cierre de H-01, 2026-10-28):
`ACEPTA CON HALLAZGOS NO BLOQUEANTES`.** El dictamen inicial (2026-10-20) fue
`NO ACEPTA` con 1 hallazgo bloqueante (**H-01**, la prueba de regresion del
`PATCH` de gym exigida por `INC05-R11` no existia); ese hallazgo **queda
CERRADO** con evidencia ejecutada (ver **5.6**). Los hallazgos **H-02** y
**H-03** siguen vigentes como **deuda menor no bloqueante**. El resto de la
revision original paso y toda la evidencia re-ejecutada quedo verde.

### 5.1 Hallazgos (por severidad; se marca quien bloquea)

| ID | Severidad | Bloquea | Hallazgo | Evidencia (archivo:linea) |
|---|---|---|---|---|
| `H-01` | **CRITICO** | **SI** | Falta la **prueba de regresion explicita del `PATCH` de gym para DEC-047** exigida por el spec: "mover `fechaInicio` +1 -> `fechaFin` +1; retroceder -> retrocede; editar `fechaFin` explicito -> cambia la duracion" (`spec.md:564`, fila riesgo `INC05-R11`, owner Backend+QA; y `spec.md:220-224`: "se prueba y se verifica"). `calcularFechasEdicion` es **nuevo en este diff** (`membresia.service.ts:127-174`, diff `@@ -127,6 +127,48 @@`) y `editarMembresia` (ruta gym) **fue modificada** para aplicarlo (`membresia.service.ts:593`, diff `@@ -521,17 +586,20 @@`): el comportamiento del `PATCH` de gym cambio sin test que lo verifique. Cobertura existente insuficiente: los 3 tests DEC-047 de `hu13-servicio-personalizado.test.ts:558-653` / `hu14-servicio-nutricion.test.ts:545-638` y los escenarios Gherkin (`servicio-personalizado.feature:169-192`, `servicio-nutricion.feature:175-192`) prueban **solo rutas nuevas**; `membresia-validacion.test.ts:220-240` y `vencimiento.test.ts:352-381` hacen `PATCH` solo-`fechaInicio` sobre gym pero **solo asercionan `status`/`fechaInicio`**, pasarian igual sin DEC-047. La afirmacion de la seccion 3 de este documento ("DEC-047 ... probado en ambas capas (nueva y gym)") **no esta sustentada por evidencia ejecutada**. |
| `H-02` | MENOR | No | Ninguna de las 6 rutas nuevas ejercita `401` sin token en su propio archivo (el plugin `authenticateRoles` esta cubierto por la base INC-00 y las suites nuevas corren autenticadas). Riesgo residual bajo. | `club-beasts-api/src/routes/membresia.ts:473-627`; `tests/integration/hu13-servicio-personalizado.test.ts`, `hu14-servicio-nutricion.test.ts` (sin caso 401) |
| `H-03` | MENOR | No | `tipoServicio` es `String` sin constraint en BD: la correccion de la incompatibilidad #1 depende del filtro de servicio (`membresia.service.ts:462,507,580,602,846,1019`; `servicio.service.ts:95,142,241`), no del schema. Un `UPDATE` fuera del servicio reintroduciria la mezcla. | `club-beasts-api/prisma/schema.prisma` (sin `@enum`); mitigacion documentada en `spec.md` (incompatibilidad #1) |

### 5.2 Checklist (los 9 puntos del contrato)

| # | Punto del contrato | Resultado |
|---|---|---|
| 1 | Permisos **DEC-017** en las 6 rutas nuevas | **PASA**: las 6 rutas (`servicios-personalizado` GET/POST, `servicios-personalizado/:id` GET/PATCH/DELETE, `nutricion` POST, `nutricion/:id` GET/PATCH/DELETE bajo `registrarRutasServicio`) usan `preHandler = [authenticateRoles(["DUENO","RECEPCIONISTA"])]` (`membresia.ts:473,479,506,...`); sin endpoints abiertos; `403 CLIENTE` y `403 RECEPCIONISTA-201` probados en `hu13:124-177` / `hu14:112-165` |
| 2 | **No duplicado**: PER-05/NUT-05 excluidas, guardas re-aplicadas solo como rama de error | **PASA**: exclusion comentada (`hu13:38`, `hu14:33`), sin tests propios; congelacion/vencimiento/INACTIVO solo como ramas 409/403 en rutas nuevas |
| 3 | Filtro `tipoServicio` (**incompatibilidad #1**) | **PASA**: filtros verificados en `membresia.service.ts:462,507,580,602,846,1019` y `servicio.service.ts:95,142,241`; regresiones REG-01..04 (`hu13:233-399`, `hu14:221-387`) y guardas C1 Gherkin verdes en re-ejecucion |
| 4 | **DEC-047** aplicado y probado | **FALLA (`H-01`)**: aplicado en codigo (nuevo `calcularFechasEdicion`, usado en `membresia.service.ts:593` y `servicio.service.ts:234`), pero la **regresion de gym exigida (`INC05-R11`, `spec.md:564,633`) no tiene prueba** |
| 5 | **C4** enmendado sin borrrados | **PASA**: 3 tests enmendados in-situ con provenance "Enmendado 2026-10-20 por DEC-042 (INC-05 C4)" (`membresia-congelacion.test.ts:794`, `membresia-descongelacion.test.ts:718`, `membresia-editar-congelacion.test.ts:818`), aserciones fortalecidas; la rama 409 se re-enmarca en 3 tests nuevos con `tipoServicio: "SERVICIO_EXTERNO"` (`:837`, `:764`, `:869`); G14 de HU-15 enmendado (`HU-15-criterios-aceptacion.md`, `HU-15-schemas.ts:99`); diff = 3 renombrados/amendados + 3 añadidos (net +3), **0 borrados** |
| 6 | Sin `.skip/.only/todo/xit` ni pasos opcionales | **PASA**: sin skips en `club-beasts-api/tests` ni `features`; matches en web sin relacion (`session-recovery`, `start-api-e2e.mjs`); step definitions Gherkin con `throw` en precondiciones; spec E2E sin `waitForTimeout`; 409 con fixtures Prisma directas y fechas relativas |
| 7 | Recuento base vs nuevo | **PASA**: API 626 = **536 base + 3 C4-409 + 87 INC-05** (hu13 46 + hu14 41); Gherkin 214 = **153 + 61** (31 + 30; guard `INC00_SCENARIO_COUNT = 214`); web 188 = **183 + 5**; E2E 57 = **56 + 1** (filas E/F de la seccion 4); migraciones **9/0** |
| 8 | Navegacion | **NO APLICABLE (sin cambios de navegacion)**: `MembershipSection.tsx` sin `router.*`, `<Link>` ni `href` (grep limpio); el incremento es etiquetado por `tipoServicio` + acotacion de acciones (acciones condicionales sin destinos nuevos); sin rutas/paginas nuevas en web (las 11 rutas del build son las base) |
| 9 | Recuento de evidencia vs afirmaciones | **PASA con observacion (`H-01`)**: todos los recuentos de la seccion 4 coinciden con la re-ejecucion; la unica afirmacion no sustentada es "DEC-047 probado en ambas capas" (seccion 3, checklist 4) |

### 5.3 Re-ejecucion de evidencia por `code-reviewer` (foreground, 2026-10-20)

| # | Comando (directorio) | Resultado ejecutado |
|---|---|---|
| R1 | `npx tsc --noEmit` (`club-beasts-api`) | exit 0 |
| R2 | `npx vitest run` (`club-beasts-api`) | **626/626 passed**, 31 archivos, exit 0 |
| R3 | `npm run test:gherkin` (`club-beasts-api`) | **214/214 passed**, 11 archivos, exit 0 |
| R4 | `npx prisma migrate status` (`club-beasts-api`) | **9 migraciones, "Database schema is up to date!"**, exit 0 |
| R5 | `npx tsc --noEmit` (`club-beasts-web`) | exit 0 |
| R6 | `npx vitest run` (`club-beasts-web`) | **188/188 passed**, 23 archivos, exit 0 |
| R7 | `npm run build` (`club-beasts-web`) | exit 0 (**PASS**, 11 rutas: `/`, `/login`, `/recuperar`, `/portal`, `/reset` y las 6 privadas) |
| R8 | `npx playwright test tests/e2e/inc05-tipos-vigencia.spec.ts --reporter=line` (`club-beasts-web`) | **1 passed** (23.7s), exit 0 (muestreo unico por contrato; la suite completa E+F 57/57 ya esta en la seccion 4) |

La suite E2E completa **no** se re-ejecuto por decision del contrato (evidencia
E/F ya ejecutada en la seccion 4, corridas 29-30).

### 5.4 Riesgos residuales

- `H-01`: mientras no exista la regresion de gym, un cambio futuro en
  `editarMembresia` puede romper DEC-047 en gym sin que ninguna prueba lo
  detecte.
- `H-02` / `H-03`: tal como estan, mitigan el riesgo de permisos y de datos;
  el `401` depende del plugin base y la correccion del tipo depende del filtro
  de servicio (documentado).
- Cierres previos con reintentos (corridas 10-15 y 19-27 de la seccion 4) no se
  reprodujeron hoy: R2-R8 pasaron al primer intento.

### 5.5 Para desbloquear (fuera del alcance de esta revision)

`H-01` se cierra con pruebas (sugerido: 3 escenarios o 1 test parametrizado en
`tests/integration/vencimiento.test.ts` o archivo dedicado) que ejerzan el
`PATCH /membresias/:id` de gym con `tipoServicio: "GYM"` y asierten las tres
ramas de `INC05-R11`: (a) solo `fechaInicio` +1 dia -> `fechaFin` +1 dia;
(b) `fechaInicio` retrocedido -> `fechaFin` retrocede el mismo delta;
(c) `fechaFin` explicito -> cambia la duracion (sin desplazar). Requiere
contrato del orquestador a `backend-developer` o `test-engineer` (no incluido
en esta revision). `H-02`/`H-03` son mejoras no bloqueantes que el orquestador
puede registrar como deuda.

### 5.6 Re-revision H-01 (`code-reviewer`, 2026-10-28)

Re-revision **limitada** al cierre del hallazgo bloqueante `H-01` (contrato
del `delivery-orchestrator`; solo lectura en todo el repo + escritura
exclusiva en esta seccion 5). El archivo nuevo
`club-beasts-api/tests/integration/dec047-parche-gym-regresion.test.ts` (6
pruebas) fue leido en su totalidad y re-ejecutado por `code-reviewer`.

**Veredicto: `H-01` CERRADO — el cierre es valido.** Puntos verificados:

1. **Cobertura de las ramas de `INC05-R11` (spec.md:564)**: las 3 ramas
   exigidas mas la ramita, la optimista y el orden C2 estan ejercitadas contra
   el endpoint real `PATCH /clientes/:clienteId/membresias-gym/:membresiaId`
   (`src/routes/membresia.ts:260-261` -> `editarMembresia`
   `membresia.service.ts:593` -> `calcularFechasEdicion` `:148-170`):
   `R11-1` solo `fechaInicio` +1 -> `fechaFin` +1; `R11-2` retroceder -3 ->
   `fechaFin` retrocede exactamente 3; `R11-3` solo `fechaFin` explicito ->
   cambia la duracion; `R11-3b` ambas explicitas -> manda lo explicito (sin
   desplazamiento doble); `R11-4` version +1 y `409 MEMBRESIA_CONFLICTO` con
   version vieja; `R11-5` `400 VALIDATION_ERROR` por `nuevoInicio >
   finPersistido` **antes** de desplazar (coincide con el throw de
   `membresia.service.ts:162`, previo al `sumarDias` de `:166`).
2. **Aserciones de fechas efectivas y duracion inclusiva (no solo `status`)**:
   cada test asienta `fechaInicio`/`fechaFin` exactas en DTO **y** fila BD
   (`leerFila`), con `diasInclusivos()` propio — `R11-1` 30 -> 30 identica,
   `R11-2` 30 -> 30, `R11-3` 30 -> 10 (con `!= 30` explicito), `R11-3b` 19 (y
   `!= finPedido+2` para descartar el desplazamiento doble); mas auditoria
   `membresiaGymCambio` EDICION con las fechas **efectivas** anterior/nueva
   (`R11-1`, `R11-3b`). `R11-4` verifica ademas atomicidad del 409 (fechas,
   `version` intactas y `EDICION` count 1) y `R11-5` la no-escritura del 400
   (`fechaFin` intacto, `version` 1, `EDICION` count 0).
3. **Sin aserciones vacias, skips ni fixtures fragiles**: grep limpio de
   `.skip`/`.only`/`.todo`/`xit`; ninguna inyeccion HTTP sin asertar; cada
   prueba crea su propio cliente (`crearCliente`, cedula unica `9945NNNNNN`),
   ninguna prueba depende del orden ni de otra; limpieza deterministica
   (`cleanupFixtures` en `beforeAll`/`afterAll`, borrando cambios, filas,
   clientes, usuarios y sede por prefijo/ids propios).
4. **Determinismo**: todas las fechas son relativas a `getTodayBogota()` (mismo
   oracle DEC-013 que el backend); el unico `expect` del `beforeAll` valida el
   login (200) antes de guardar el token. `let app: any` sigue el patron
   establecido en 26 archivos de integracion aceptados (no es hallazgo nuevo).
5. **Re-ejecucion independiente por `code-reviewer` (foreground, 2026-10-28)**:
   `npx tsc --noEmit` (`club-beasts-api`) -> **exit 0**; `npx vitest run` ->
   **exit 0 — 632/632 passed, 32 archivos** (base **626 intacta** + **6/6**
   del archivo nuevo, visible en la salida como
   `dec047-parche-gym-regresion.test.ts (6 tests)`). Coincide con el reporte
   del `test-engineer`.
6. **Integridad del documento**: la 4.9 existe y es una insercion pura entre
   4.8 y 5; las secciones 1-4.8, 5 y 6 quedaron intactas.

**Cambios de esta re-revision**: solo esta seccion 5 (dictamen + esta
subseccion). Sin tocar `src/`, tests, demas docs, ni INC-06/07.

**Dictamen actualizado**: `ACEPTA CON HALLAZGOS NO BLOQUEANTES` (H-02 y H-03
siguen como deuda menor no bloqueante).

**Riesgos residuales**:

- Ventana teorica de medianoche en `America/Bogota`: los tests llaman `hoy()`
  en varios puntos (fixture, payload y asercion); un cambio de dia entre llamadas
  haria fallar la asercion. Ventana de milisegundos una vez al dia,
  probabilidad despreciable; no bloquea (patron comun de la base aceptada).
- `H-02` (401 sin token no ejercitado en los archivos de las 6 rutas nuevas) y
  `H-03` (`tipoServicio` `String` sin constraint en Prisma) permanecen como
  **deuda menor no bloqueante**; si `tipoServicio` pasa a enum, reencuadrar sin
  debilitar (ya anotado en 4.6, Riesgo 2).
- La regresion cubre el comportamiento actual de DEC-047 en gym; un cambio
  futuro en `calcularFechasEdicion` o `editarMembresia` que rompa las 3 ramas
  si sera detectado por estas pruebas (ese era exactamente el riesgo de H-01).


## 6. Cierre y certificacion (solo el orquestador)

**CERTIFICADO 2026-10-28: `INC-05` ACEPTADO, +6 puntos** (HU-13 = 3, HU-14 = 3;
reparto fijado en `docs/producto/auditoria-puntos-inc00.md` lineas 114-115 y
confirmado en la **seccion 11** de esa auditoria). Total del MVP: **43 -> 49 de
100 (49%)**; bloque 3 "Vigencias de servicios y congelacion" queda **15/15**.

Puertas de salida verificadas antes de certificar:

- **8 criterios puntuables VERIFICADOS** (`INC05-PER-01..04`, `INC05-NUT-01..04`):
  implementacion en `src/` + pruebas (integracion, Gherkin, unit web) + E2E
  `inc05-tipos-vigencia.spec.ts` + evidencia ejecutada (secciones 4 y 4.9).
  `INC05-PER-05`/`NUT-05` siguen **EXCLUIDOS** por cambio de alcance aprobado
  (DEC-018/019, b4 asignaciones en bloques 6/7) — no son pospuestos: su
  exclusion es el alcance ratificado del incremento.
- **Compilacion**: API `tsc` exit 0, web `tsc` exit 0, web build PASS.
- **Integracion de rutas criticas**: 6 rutas nuevas con `authenticateRoles`
  DUENO/RECEPCIONISTA (revision checklist 1); base API **632/632** (536 base + 3
  C4-409 + 87 INC-05 + 6 regresion H-01; 0 perdidas), Gherkin **214/214 exit 0**
  (guard 214), web **188/188** (183 base + 5), migraciones **9/0 sin drift**.
- **E2E real**: base **56 + 1 = 57**; pareja de corridas consecutivas verdes
  (E+F de la seccion 4) + repeat-each 30/30 del spec `congelacion`; flaky de
  `inc04-estados-cliente.spec.ts:191` estabilizado (24/24) y carrera de
  `congelacion.spec.ts:331` enmendada con aserciones mas fuertes (6/6); **0
  skips, 0 pasos opcionales, 0 aserciones vacias**.
- **Revision**: `code-reviewer` ACEPTA CON HALLAZGOS NO BLOQUEANTES tras cerrar
  H-01 con evidencia ejecutada (secciones 5 y 5.6). Deuda menor no bloqueante:
  H-02 (401 sin token no ejercitado en los archivos nuevos) y H-03
  (`tipoServicio` String sin constraint).
- **Navegacion**: **NO APLICABLE** para INC-05 (checklist 8 de la seccion 5:
  sin links, rutas ni flujos nuevos; DEC-045(b) es etiquetado en ficha).
- **No duplicado**: verificado en revision (checklist 2); los bullets de
  congelacion/vencimiento/guarda INACTIVO/vista unificada NO se re-cobran.

Documentos actualizados por el orquestador con el cierre: `docs/producto/avance.md`,
`docs/producto/mvp.md` (bloque 3 a 15/15, total 49), seccion 11 de
`docs/producto/auditoria-puntos-inc00.md` y esta seccion.
