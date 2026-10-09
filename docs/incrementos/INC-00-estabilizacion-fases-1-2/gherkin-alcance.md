# INC-00 - Alcance Gherkin (definido por QA/analista segun DEC-014)

Estado: definido (pendiente de ejecucion real, ver `INC00-QA-06` y tarea 12).
Fuente de decision: `docs/producto/decisiones.md` -> `DEC-014` (Aprobada): el alcance Gherkin de INC-00 lo define QA/analista, priorizando auth y clientes, y agregando membresias **solo si ya hay escenarios reutilizables**.

Inventario verificado (solo lectura):

- `club-beasts-api/features/auth.feature` -> 16 escenarios (12 simples + 4 outlines con 16 ejemplos) = 28 ejecuciones expandidas.
- `club-beasts-api/features/clientes.feature` -> 21 escenarios (13 simples + 8 outlines con 22 ejemplos) = 35 ejecuciones expandidas.
- Steps: `features/steps/auth.steps.ts` (13 definiciones), `features/steps/clientes.steps.ts` (31 definiciones), world: `features/support/world.ts`.
- **No existe ningun `.feature` de membresia** en todo el repositorio (glob `**/*.feature` devuelve unicamente `auth.feature` y `clientes.feature`). Por DEC-014, membresia queda **fuera del alcance Gherkin**.

---

## 1. Resumen de alcance

| Decision | Detalle |
|---|---|
| Incluido | `auth.feature` (16 escenarios) + `clientes.feature` (21 escenarios) = **37 definiciones de escenario / 63 ejecuciones expandidas** |
| Excluido | Membresia (sin escenarios reutilizables), E2E web, criterios sin escenario Gherkin equivalente (ver seccion 3) |
| Condicion | INCLUIDO condicionado a que la tarea 12 haga que los `.feature` se ejecuten realmente (`INC00-QA-06`) |

---

## 2. Escenarios INCLUIDOS

### 2.1 `features/auth.feature`

| # | Scenario | HU | Escenario simple/Outline | Ejemplos |
|---:|---|---|---|---:|
| A01 | Login exitoso del dueño | HU-01 | Simple | - |
| A02 | Login fallido con contraseña incorrecta | HU-01 | Simple | - |
| A03 | Login fallido con email inexistente | HU-01 | Simple | - |
| A04 | Rechazar email con formato inválido | HU-01 | Outline | 4 |
| A05 | Rechazar email vacío | HU-01 | Simple | - |
| A06 | Rechazar contraseña vacía | HU-01 | Simple | - |
| A07 | Login del cliente con cédula y PIN | HU-02 | Simple | - |
| A08 | Login del cliente con PIN inválido | HU-02 | Simple | - |
| A09 | Login del cliente con PIN no numérico | HU-02 | Simple | - |
| A10 | Rechazar PIN con longitud inválida | HU-02 | Outline | 4 |
| A11 | Rechazar cédula con formato inválido (login cliente) | HU-02 | Outline | 4 |
| A12 | Rechazar cédula vacía | HU-02 | Simple | - |
| A13 | Reset PIN exitoso | HU-03 | Simple | - |
| A14 | Reset PIN sin autenticar retorna 401 | HU-03 | Simple | - |
| A15 | Rechazar PIN inválido en reset | HU-03 | Outline | 4 |
| A16 | Rechazar clienteId vacío en reset | HU-03 | Simple | - |

### 2.2 `features/clientes.feature`

| # | Scenario | HU | Escenario simple/Outline | Ejemplos |
|---:|---|---|---|---:|
| C01 | Crear un cliente nuevo | HU-04 | Simple | - |
| C02 | No permitir cédula duplicada | HU-04 | Simple | - |
| C03 | Rechazar cédula con formato inválido al crear | HU-04 | Outline | 3 |
| C04 | Rechazar teléfono con formato inválido al crear | HU-04 | Outline | 4 |
| C05 | Rechazar nombres con caracteres inválidos | HU-04 | Outline | 2 |
| C06 | Rechazar campos requeridos vacíos | HU-04 | Simple | - |
| C07 | Rechazar email con formato inválido (crear) | HU-04 | Simple | - |
| C08 | Editar información de un cliente | HU-05 | Simple | - |
| C09 | Editar cliente inexistente retorna 404 | HU-05 | Simple | - |
| C10 | Rechazar teléfono inválido al editar | HU-05 | Outline | 2 |
| C11 | Rechazar email inválido al editar | HU-05 | Outline | 2 |
| C12 | Buscar clientes por nombre | HU-06 | Simple | - |
| C13 | Filtrar clientes por estado | HU-06 | Simple | - |
| C14 | Filtrar clientes por sede | HU-06 | Simple | - |
| C15 | Paginación funciona correctamente | HU-06 | Simple | - |
| C16 | Rechazar parámetros de paginación inválidos | HU-06 | Outline | 6 |
| C17 | Rechazar estado inválido en filtro | HU-06 | Outline | 2 |
| C18 | Ver ficha única del cliente | HU-07 | Simple | - |
| C19 | Ficha de cliente inexistente retorna 404 | HU-07 | Simple | - |
| C20 | Acceder a ficha sin autenticar retorna 401 | HU-07 | Simple | - |
| C21 | Rechazar id inválido en ficha | HU-07 | Outline | 1 |

---

## 3. Escenarios EXCLUIDOS y motivos

| Elemento excluido | Motivo | Verificado en |
|---|---|---|
| Membresia gym (INC00-MEM-01..07) | **No existen escenarios reutilizables**: no hay ningun `.feature` de membresia en el repo. DEC-014 solo la incluye si ya existen escenarios. | glob `**/*.feature` (solo `auth.feature`, `clientes.feature`) |
| Criterios INC00-AUTH-01, AUTH-02, AUTH-03, AUTH-05, AUTH-06, AUTH-07 (recuperacion de sesion / 401 vencido / 403 conserva sesion) | No hay escenarios Gherkin equivalentes en `auth.feature`; se cubren con pruebas de integracion/frontend, no con Gherkin en INC-00. | `features/auth.feature` (lineas 1-109) |
| INC00-SEC-01 (CLIENTE ve solo su propia ficha -> 403) | `clientes.feature` solo cubre DUENO consultando ficha y 401 sin auth; **no hay escenario de 403 por ficha ajena**. Cobertura queda fuera del alcance Gherkin. | `features/clientes.feature` lineas 146-169 |
| INC00-SEC-02 (permisos DUENO/RECEPCIONISTA) | No hay escenario con rol RECEPCIONISTA en los `.feature`. | ambos `.feature` |
| INC00-SEC-03 (ninguna respuesta expone hash PIN) | No hay asercion de no-fuga de hash en steps existentes. | `features/steps/*.ts` |
| INC00-SEC-04 (trazabilidad de reset de PIN: actor/auditoria) | Escenario A13 solo verifica mensaje exitoso; no verifica registro de actor. | `auth.steps.ts` lineas 100-120 |
| INC00-CLI-03 parcial (limpiar email/observaciones intencionalmente) | C11 valida email invalido, pero no hay escenario de borrado intencional (email vacio en PATCH). | `features/clientes.feature` lineas 85-94 |
| INC00-QA-01/02/03/04/05 | Criterios de calidad de pruebas, no de escenarios Gherkin. | `spec.md` |
| E2E web (Playwright) | Fuera del alcance Gherkin de la API; se gestiona en tarea 19/verificacion. | `spec.md` |

---

## 4. Mapa escenario -> criterio INC-00

| Escenario | Criterio(s) INC-00 | Tipo de cobertura |
|---|---|---|
| A01 | INC00-QA-06 (base de sesion para AUTH-01..07) | Directa (runner) |
| A02, A03 | INC00-AUTH-04 (credenciales invalidas) | Parcial (falta asercion de codigo `AUTH_INVALID_CREDENTIALS` y de "no dispara logout global") |
| A04, A05, A06 | INC00-CLI-01 / reglas de validacion base, INC00-QA-06 | Directa (validacion de entrada) |
| A07 | INC00-SEC-03 (parcial: no verifica hash), INC00-QA-06 | Parcial |
| A08, A09, A10, A11, A12 | INC00-AUTH-04 (parcial), INC00-QA-06 | Directa |
| A13 | INC00-SEC-04 (parcial: no verifica actor/auditoria), INC00-QA-06 | Parcial |
| A14 | INC00-AUTH-05? No: es 401 por endpoint sin auth -> INC00-QA-06 | Directa (runner) |
| A15, A16 | INC00-QA-06 (validacion de reset) | Directa |
| C01 | INC00-CLI-01, INC00-QA-06 | Directa |
| C02 | INC00-CLI-01 (unicidad), INC00-QA-06 | Directa |
| C03, C04, C05, C06, C07 | INC00-CLI-01 (cedula, telefono, sede, nombres, apellidos), INC00-QA-06 | Directa |
| C08 | INC00-CLI-02 (edicion basica), INC00-QA-06 | Parcial (no cubre cambio de sede/estado con permiso) |
| C09 | INC00-CLI-02 / QA-06 | Directa |
| C10, C11 | INC00-CLI-02/03 (validacion al editar), INC00-QA-06 | Directa |
| C12, C13, C14 | INC00-CLI-04 (busqueda/filtros deterministas), INC00-QA-06 | Directa |
| C15, C16 | INC00-CLI-05 (paginacion), INC00-QA-06 | Directa |
| C17 | INC00-CLI-04 (enum estado), INC00-QA-06 | Directa |
| C18, C19 | INC00-SEC-02 (parcial, solo DUENO), INC00-QA-06 | Directa |
| C20 | INC00-AUTH-05? No: 401 sin sesion -> INC00-QA-06 | Directa |
| C21 | INC00-QA-06 | Directa |
| (sin escenario) | INC00-MEM-01..07 | **Sin cobertura Gherkin** (excluido por DEC-014; cubrir en integracion) |
| (sin escenario) | INC00-SEC-01, INC00-SEC-02 (403 ficha ajena) | **Sin cobertura Gherkin** (ver seccion 6, decision pendiente) |

Criterio que certifica este documento: **INC00-QA-06** ("Los escenarios Gherkin incluidos en el alcance se ejecutan realmente") sobre el conjunto de las 63 ejecuciones expandidas de las secciones 2.1 y 2.2.

---

## 5. Estado actual del runner (gap para INC00-QA-06)

Hallazgos verificados (solo lectura):

| # | Hallazgo | Archivo / linea | Impacto |
|---:|---|---|---|
| R1 | El suite por defecto **no incluye los `.feature`**: `include` solo cubre `tests/**/*.test.ts` | `vitest.config.ts` linea 8 | Los `.feature` nunca se ejecutan en `npm test` / `test:run` / verificacion (tarea 13) |
| R2 | Existe un config dedicado `vitest.cucumber.config.ts` con plugin `@lotun/vitest-cucumber`, pero **no hay script npm que lo ejecute** (scripts: dev/build/start/test/test:run/test:coverage/lint/db:*) | `vitest.cucumber.config.ts`; `package.json` lineas 5-17 | Runner huérfano: nadie lo invoca |
| R3 | El comando documentado `npx vitest run tests/integration/features.test.ts` ejecuta un **test escrito a mano** que duplica escenarios pero **no consume los `.feature`** (y contiene `expect(true).toBe(true)` en linea 41) | `tests/integration/features.test.ts` | Falsa evidencia de ATDD; riesgo directo para INC00-QA-01 y QA-06 |
| R4 | **Paso ambiguo duplicado**: `el sistema retorna estado {int}` esta definido en `auth.steps.ts:64` y `clientes.steps.ts:209`; el config de cucumber importa `features/steps/**/*.ts` completo | `vitest.cucumber.config.ts` linea 7 | Error de step ambiguo al ejecutar ambos features |
| R5 | El config cucumber **no aplica `tests/setup-isolated-sqlite.ts`** (DEC-012/DEC-013), ni hooks `Before/After` de limpieza en `world.ts` | `vitest.cucumber.config.ts`, `features/support/world.ts` | Los escenarios correrian contra BD no aislada -> falsos positivos/negativos |
| R6 | Steps usan import con extension `.js` (`../../src/plugins/prisma.js`) mientras `world.ts` usa `.ts`; `ApiWorld` no declara `email`, `password`, `pin` que los steps asignan | `auth.steps.ts:3,10-13,27-29`, `world.ts:3-8` | Riesgo de fallo de resolucion/typecheck bajo el runner cucumber |
| R7 | Datos de escenario incompletos: A13 (`Given existe un cliente con id "cliente-1"` solo guarda el id, no crea el cliente -> esperable 404), C01 (`el cliente tiene un PIN por defecto` usa `this.cedula` que el paso de creacion nunca asigna), C21 (id vacio -> GET `/clientes/` no produce `"id es requerido"`) | `auth.steps.ts:96-98`, `clientes.steps.ts:71-89,119-127`, `clientes.feature:162-169` | Escenarios incluidos fallarian aunque el runner arranque |
| R8 | Sin tag/etiqueta para seleccionar el alcance (ej `@inc00`) ni reporte de cobertura escenario->ejecucion | `features/*.feature` | Dificulta evidenciar QA-06 sin auditoria manual |

Estado: **runner NO ejecuta los `.feature`**. INC00-QA-06 en estado no cumplido hasta cerrar la tarea 12.

---

## 6. Requisitos para tarea 12 (Reparar runner Gherkin)

Definicion de hecho para la tarea 12 (agente `test-engineer`):

1. Hacer ejecutable el alcance: crear script npm (p.ej. `test:gherkin` -> `vitest run -c vitest.cucumber.config.ts`) o integrar los `.feature` como proyecto dentro del `vitest` principal; **prohibido** usar `features.test.ts` como sustituto de la evidencia de QA-06.
2. Resolver el step ambiguo R4 (dejar una unica definicion de `el sistema retorna estado {int}`).
3. Aplicar aislamiento DEC-012/DEC-013 al runner cucumber: `setupFiles` con SQLite aislado + fixtures/seed deterministico y limpieza (`Before`/`After` en `world.ts`).
4. Corregir los datos de escenario R7 (seed real para A13, asignar `this.cedula` en el paso de creacion, validar id en C21 o ajustar el paso) para que los 63 casos expandidos pasen.
5. Unificar extensiones de import y tipar `ApiWorld` (`email`, `password`, `pin`) para que el runner no falle por resolucion/typecheck (R6).
6. Garantizar que escenarios undefined/ambiguos o con asercion fallida devuelvan **exit code != 0** (sin skips ocultos) y agregar tags `@inc00` si se decide acotar el alcance por comando (R8).
7. Evidencia requerida en `evidencia.md`: comando exacto, fecha, cantidad de escenarios/ejecuciones expandidas ejecutadas (37/63), pasados y fallidos, captura o salida resumida.
8. No modificar el alcance de este documento sin una nueva decision en `docs/producto/decisiones.md`.

### Decisiones pendientes

| # | Pregunta concreta | Afecta | Estado |
|---:|---|---|---|
| D1 | INC00-SEC-01 y INC00-SEC-02 (403 por ficha ajena, permisos RECEPCIONISTA) quedan **fuera del alcance Gherkin** y se cubren solo con pruebas de integracion, o se exige agregar escenarios nuevos a `clientes.feature` (lo cual cambiaria este alcance)? | Alcance Gherkin, esfuerzo tarea 12 | PENDIENTE (no bloquea arrancar tarea 12 sobre el alcance actual) |
| D2 | Se mantiene `features.test.ts` como suite paralela o se migra/elimina para eliminar la duplicacion y el `expect(true).toBe(true)` (INC00-QA-01)? | QA-01, QA-06 | PENDIENTE (propiedad de test-engineer/orquestador) |

Ninguna decision de la lista bloquea la ejecucion de la tarea 12 sobre los 37 escenarios ya incluidos; ambas se refieren a cobertura adicional o limpieza.
