# INC-02 - Evidencia

Estado del incremento: **ACEPTADO — REVISION SIN HALLAZGOS BLOQUEANTES — +3.5 CERTIFICADOS** (2026-10-08). La
implementacion minima de `congelar` / `descongelar` / `PATCH .../congelacion`
pasa **127/127** tests de la bateria nueva y **379/379** de la suite completa
(base 252/252 intacta, 0 regresiones); `tsc --noEmit` 0 errores y Gherkin 63/63
exit 0. El unico rojo del GREEN (hallazgo **H-01**, un test unitario que se
contradecia a si mismo) fue corregido por `test-engineer` el mismo dia: ver
"Hallazgo H-01" abajo. La fase RED (121 fallos granulares) queda registrada
sin cambios en la seccion `## RED (2026-10-08)`.

Tareas #7 y #8 (verificacion final) **cerradas**: E2E real en navegador
`congelacion.spec.ts` 5/5, bateria completa API + web + Playwright en verde y
**Playwright 30/30 en dos corridas consecutivas** (25 base + 5 nuevos). El
riesgo **R-10 no se reprodujo** (`clientes.spec.ts` sin cambios). Todo el detalle
en la seccion `## Verificacion final (2026-10-08)`.

Tarea #9 (revision `code-reviewer`) **cerrada**: ver seccion `## Revisiones` —
**SIN HALLAZGOS BLOQUEANTES**, ejes 1-7 cumplidos, con verificacion propia del
revisor (API 379/379, web 147/147, Gherkin, `migrate status` 6/0, Playwright
29/30 + 30/30 documentando el flake base R-03). Tarea #10 (certificacion)
cerrada: **+3.5 puntos** (HU-15 4/4 + HU-12 b2) reflejados en
`docs/producto/mvp.md` (26.5 -> 30), `avance.md` y seccion 8 de
`auditoria-puntos-inc00.md`.

## GREEN (2026-10-08)

### Comandos de verificacion

| Fecha | Comando | Entorno | Resultado |
|---|---|---|---|
| 2026-10-08 | `npx vitest run tests/integration/membresia-congelacion.test.ts tests/integration/membresia-descongelacion.test.ts tests/integration/membresia-editar-congelacion.test.ts tests/unit/membresia-logic-congelacion.test.ts` | `club-beasts-api` (Vitest 3.2.7, SQLite aislado DEC-012) | **GREEN parcial**: `Tests 1 failed \| 126 passed (127)`, `Test Files 1 failed \| 3 passed (4)` — congelar **40/40**, descongelar **27/27**, editar **35/35**, unidad **24/25** (el 1 fallo es H-01) |
| 2026-10-08 | `npx vitest run` | `club-beasts-api` (bateria completa, 21 archivos) | **378 passed \| 1 failed (379)** — los **252 tests preexistentes siguen en verde (0 fallos, 0 regresiones)**; 126 de los 127 nuevos en verde + el fallo H-01 |
| 2026-10-08 | `npx tsc --noEmit` | `club-beasts-api` (`tsconfig.json`, strict) | **exit 0** — 0 errores de tipo |
| 2026-10-08 | `npm run test:gherkin` | `club-beasts-api` (Vitest + Cucumber) | **exit 0**, `Tests 63 passed (63)`, `Test Files 2 passed (2)` — sin cambios respecto a la base |

### GREEN: que se implemento (por archivo)

| Archivo | Cambio |
|---|---|
| `src/schemas/membresia.schema.ts` | `createCongelacionSchema` (`fechaInicio`, `fechaFin`, `motivo` 1-500 sin vacio tras trim, `version` entero positivo + refine `fin >= inicio`), `descongelarSchema` (`version` requerida, `motivo` opcional con la misma regla si viaja), `updateCongelacionSchema = createCongelacionSchema`, `vigenciaParamsSchema` (`clienteId` + `vigenciaId`) y la constante `MENSAJE_FECHA_FIN_NO_ANTERIOR_A_HOY` para la regla post-Zod |
| `src/services/membresia.service.ts` | `calcularEstado` con 4to parametro opcional de rangos de pausa (precedencia `CONGELADO` sobre PROGRAMADA/ACTIVA/VENCIDA, sin romper las llamadas de 3 argumentos); helpers puros `diasInclusivos`/`sumarDias`/`diasCalendario`; **`diasDevueltos`** (DEC-024 total sobre los 3 estados) y **`fechaFinTrasEdicion`** (`fechaFin - N_anterior + N_nuevo`); `pausaVigente` (ultima fila de la secuencia de pausa) y `pausasActivas` (CONGELACION abre, EDICION_CONGELACION reemplaza, DESCONGELACION cierra) usados por el estado, el solape DEC-008 y la exclusion de la pausa editada; `congelarVigencia`, `descongelarVigencia` y `editarCongelacion`, cada una en `prisma.$transaction` con los guardas en el orden exacto del spec, `updateMany` condicional sobre `version` (lock optimista INC00-MEM-03) y fila de auditoria `CONGELACION`/`DESCONGELACION`/`EDICION_CONGELACION` con rango + motivo (INC00-MEM-04); DTO extendido con `tipoServicio`, `motivo`, `congelacionInicio`, `congelacionFin` en `cambios` y bloques `fechaFinAnterior` / `diasCongelados` / `diasDevueltos` / `congelacion` |
| `src/routes/membresia.ts` | `RESPUESTAS_ERROR` += `MEMBRESIA_VENCIDA`, `CONGELACION_NO_PERMITIDA`, `CONGELACION_NO_PERMITIDA_RANGO` (misma clave `code` con dos mensajes) y `CONGELACION_INEXISTENTE`; 3 endpoints sin prefijo `/api` con `authenticateRoles(["DUENO","RECEPCIONISTA"])`, parse Zod de params+body, regla post-Zod `fechaFin >= hoy(Bogota)` y `responderError` |
| `src/lib/errors.ts` | **Sin cambios**: el codigo `409 CONGELACION_INEXISTENTE` y los demas de pausa viven en el mapa `RESPUESTAS_ERROR` de `src/routes/membresia.ts`, que es donde la convencion del proyecto registra los codigos de negocio de membresia (`mapPrismaError`/`esErrorPrismaClient` no necesitan nada nuevo) |

Fuera de alcance cumplido: sin bloqueo de acceso (DEC-025), sin rutas ni
servicios ajenos a membresias, sin archivos de negocio nuevos, `prisma/`,
`features/`, criterios y `club-beasts-web/` intactos.

Integridad de los tests RED verificada: los 4 archivos tienen fecha de
modificacion 2026-10-08 14:18-14:25 (escritura del `test-engineer`, previa a las
corridas GREEN de 14:44) y no fueron tocados en esta fase.

### Hallazgo H-01 (bloqueante para 127/127, no del backend) — RESUELTO 2026-10-08

**Test contradictorio**: `tests/unit/membresia-logic-congelacion.test.ts` llama a
`fechaFinTrasEdicion` con **exactamente los mismos 5 argumentos** en dos tests y
espera dos salidas distintas, por lo que es imposible que pasen ambos con una
funcion pura (la formula es la misma):

| Lineas | Entrada | Esperado |
|---|---|---|
| 239-249 (`caso limite 7`) | `("2026-04-10","2026-02-01","2026-02-10","2026-02-01","2026-02-10")` | `"2026-04-10"` |
| 306-325 (`revertir primero...`) | `("2026-04-10","2026-02-01","2026-02-10","2026-02-01","2026-02-10")` | `"2026-03-31"` |

- La entrada y el esperado de las lineas 239-249 **son los del spec**: caso
  limite 7 ("rango identico, `N' = N` -> `fechaFin` sin cambio") y la formula
  `fechaFin' = fechaFin - N_anterior + N_nuevo` = `2026-04-10 - 10 + 10`.
- Las lineas 315 esperan el **paso intermedio** descrito en su propio comentario
  (`fechaFinRev = 2026-04-10 - 10 = 2026-03-31`, es decir solo revertir sin
  aplicar `N'`), que no es el resultado de `fechaFinTrasEdicion` sino de
  `sumarDias(fechaFin, -N_anterior)`.
- El GREEN implementa la formula del spec (por eso ese test recibe `2026-04-10`)
  y **no ha editado el archivo RED**: corregirlo es decision de `test-engineer`
  / orquestador (una sola de las dos lineas tiene que cambiar; la de la linea
  315 deberia esperar `2026-04-10` o invocar el revert de otra forma).

Estado del resto de la bateria: **378/379**, sin skips ni `only`, sin aserciones
tocadas.

### H-01: CORREGIDO por `test-engineer` (2026-10-08)

**Que se corrigio**: unicamente el test
`"revertir primero y aplicar despues da el mismo resultado que la formula directa"`
(de `tests/unit/membresia-logic-congelacion.test.ts`). No se toco la
implementacion ni ningun otro test.

**Por que el test era el defectuoso** (y no la implementacion ni el caso limite 7):

- El contrato de `fechaFinTrasEdicion` (spec INC-02, formula
  `fechaFin' = fechaFin - N_anterior + N_nuevo`) devuelve el **resultado FINAL**
  (revert + aplicar en una sola operacion), nunca un intermedio.
- El test original esperaba `"2026-03-31"` (solo el revert, sin aplicar `N'`)
  para la entrada de **rango identico** `("2026-04-10","2026-02-01","2026-02-10","2026-02-01","2026-02-10")`,
  es decir esperaba el paso intermedio de su propio comentario
  (`fechaFinRev = 2026-04-10 - 10`), que **no es** el resultado de la funcion.
- Esa misma entrada con argumentos identicos es exactamente el **caso limite 7**
  del spec (lineas 239-249), que espera `"2026-04-10"` = `2026-04-10 - 10 + 10`
  (correcto). Dos tests con la misma entrada pura exigian dos salidas distintas:
  imposible de satisfacer; el test que violaba el contrato era el de la linea 315.
- **Correccion aplicada**: el intermedio `fechaFin - N_anterior = 2026-03-31`
  ahora se calcula con aritmetica de fechas **local dentro del test** (helper
  `sumarDias`), sin invocar `fechaFinTrasEdicion` para obtener un intermedio que
  no es su contrato. Se conserva la intencion original (revertir y luego aplicar
  == formula directa) con 4 aserciones:
  1. intermedio local `2026-04-10 - 10 = "2026-03-31"`;
  2. `fechaFinTrasEdicion` con **rango identico** → `"2026-04-10"` (consistente
     con el caso limite 7);
  3. `fechaFinTrasEdicion` con el **rango nuevo 2026-02-08..2026-02-09** (N' = 2)
     → `"2026-04-02"` (la asercion que ya existia);
  4. `intermedio + N' (2) == formula directa` (la equivalencia revert-primero /
     aplicar-despues que da nombre al test).

**Verificacion tras la correccion** (comandos ejecutados en `club-beasts-api/`):

| Fecha | Comando | Resultado |
|---|---|---|
| 2026-10-08 | `npx vitest run tests/unit/membresia-logic-congelacion.test.ts` | **25/25** (`Tests 25 passed (25)`, `Test Files 1 passed (1)`) |
| 2026-10-08 | `npx vitest run` | **379/379** (`Tests 379 passed (379)`, `Test Files 21 passed (21)`) |
| 2026-10-08 | `npx tsc --noEmit` | **exit 0** - 0 errores de tipo |

La bateria nueva queda en **127/127** y la suite completa en **379/379**, sin
skips ni `only`.

## RED (2026-10-08)

Puerta de entrada cumplida (criterios +
contrato + decisiones DEC-017/022/023/024/025); se registran abajo la primera y segunda
ejecucion del ciclo: la bateria base sigue verde y los 4 archivos nuevos fallan de forma
granular sobre las rutas/formulas que aun no existen.

### Comandos de verificacion

| Fecha | Comando | Entorno | Resultado |
|---|---|---|---|
| 2026-10-08 | `npx vitest run tests/integration/membresia-congelacion.test.ts tests/integration/membresia-descongelacion.test.ts tests/integration/membresia-editar-congelacion.test.ts tests/unit/membresia-logic-congelacion.test.ts` | `club-beasts-api` (Vitest 3.2.7, SQLite aislado DEC-012) | **RED**: `Tests 121 failed \| 6 passed (127)`, `Test Files 4 failed (4)` — todos los archivos recogidos, ningun error de coleccion |
| 2026-10-08 | `npx vitest run --reporter=json --outputFile=%TEMP%\opencode\inc02-red-full.json` | `club-beasts-api` (bateria completa) | **RED controlado**: `exit 1`; `TOTAL passed=258 failed=121 total=379` — los **252 tests preexistentes siguen en verde (0 fallos)**; los 121 fallos son exclusivamente de los 4 archivos nuevos |
| 2026-10-08 | `npx tsc --noEmit --strict --skipLibCheck --esModuleInterop --target es2022 --module esnext --moduleResolution bundler --resolveJsonModule <los 4 archivos nuevos>` | `club-beasts-api` | **exit 0** — los 4 archivos nuevos compilan sin errores de tipo (el `tsconfig.json` del paquete excluye `tests/`, por eso se chequea aparte) |

JSON de la bateria completa: `C:\Users\User\AppData\Local\Temp\opencode\inc02-red-full.json`.

### Estado de criterios (RED)

| Criterio | Estado | Evidencia |
|---|---|---|
| `HU15-C01..C06` (congelar) | **RED** | `tests/integration/membresia-congelacion.test.ts` — 40 tests, **38 fallan**: la ruta `POST .../congelar` tampoco existe (grep `(?i)congel` en `club-beasts-api/src/` = **0 ocurrencias**; `src/routes/membresia.ts` solo registra GET:80 / POST:90 / PATCH:138 de CRUD base). 2 pasan (guardas de frontera con fixtures reales, ver abajo) |
| `HU15-C07` (descongelar) | **RED** | `tests/integration/membresia-descongelacion.test.ts` — 27 tests, **27 fallan** (la ruta `POST .../descongelar` no existe: `expected 404 to be ...`) |
| `HU15-C08` (editar congelacion) | **RED** | `tests/integration/membresia-editar-congelacion.test.ts` — 35 tests, **35 fallan** (la ruta `PATCH .../congelacion` no existe) |
| Unidad DEC-024 (formula + estado) | **RED** | `tests/unit/membresia-logic-congelacion.test.ts` — 25 tests, **21 fallan** (16 por exports inexistentes, 5 por `CONGELADO` no devuelto) y 4 pasan (regresion del calculo base) |
| `INC02-CON-01..06` (historico) | PENDIENTE de GREEN | ver `HU-15-criterios-aceptacion.md` |

### Evidencia RED registrada

#### Archivos creados (solo tests; cero cambios en `src/`, `prisma/`, `features/`)

| Archivo | Tests | Fallan | Pasan | Criterio / cobertura |
|---|---|---|---|---|
| `club-beasts-api/tests/integration/membresia-congelacion.test.ts` | 40 | 38 | 2 | `HU15-C01..C06` + `DEC-025` (filas 1..32) |
| `club-beasts-api/tests/integration/membresia-descongelacion.test.ts` | 27 | 27 | 0 | `HU15-C07` (D1..D20) |
| `club-beasts-api/tests/integration/membresia-editar-congelacion.test.ts` | 35 | 35 | 0 | `HU15-C08` (E1..E20) |
| `club-beasts-api/tests/unit/membresia-logic-congelacion.test.ts` | 25 | 21 | 4 | `diasDevueltos` (3 estados), `fechaFinTrasEdicion` (casos limite 5/6/7), `calcularEstado` con congelaciones (F7, cov. 28) |
| **Total nuevos** | **127** | **121** | **6** | |

#### Distribucion de los 121 fallos (modo de fallo)

| Modo | Cantidad | Lectura |
|---|---|---|
| `expected 404 to be 400` | 32 | Ninguna de las 3 rutas esta registrada: Fastify 404 en vez de la validacion Zod esperada (E9/E10, D8/D9, filas 3..9b/15) |
| `expected 404 to be 200` | 26 | Happy paths bloqueados por la ausencia de las rutas (fila 1/16/17/18/20/21/23/30, D1/D2/D3/D10/D11/D18, E1..E5/E19/E20) |
| `expected 404 to be 409` | 22 | Orden de 409 no comprobable aun (filas 10..14/19/22/31, D4..D7/D15..D17, E6..E8/E13..E18) |
| `expected 404 to be 401` | 9 | Auth no evaluada (la ruta no existe: filas 25, D13, E12) |
| `expected undefined to be 'NOT_FOUND'` | 6 | Ownership: el 404 de Fastify no trae `code` (asercion `code`+`error` evita el falso positivo de estado 404) |
| `expected 404 to be 403` | 3 | Rol CLIENTE (fila 24, D14, E12) |
| `expected 'X' to be 'CONGELADO'` | 7 | Estado: `calcularEstado` ignora el 4to argumento y la lista de pausas (F7/DEC-025: 2 integracion + 5 unidad) |
| `Contrato RED INC-02 (DEC-024): falta exportar ...` | 16 | `diasDevueltos` (8) y `fechaFinTrasEdicion` (8) no exportados en `membresia.service.ts` |
| **Total** | **121** | |

Verificacion del alcance del RED: `grep -i congel club-beasts-api/src` = **0 resultados**
(las tres rutas, `RESPUESTAS_ERROR.CONGELACION_*`, `descongelarSchema`,
`updateCongelacionSchema` y la logica del servicio no existen). La **migracion del modelo
si esta aplicada** (`prisma/migrations/20261008184627_add_congelacion_hu15`: `tipoServicio`,
`motivo`, `congelacionInicio`, `congelacionFin`), por lo que las fixtures directas en BD
funcionan y los 127 tests se recolectan sin errores de Prisma.

#### Los 6 tests que pasan en RED (justificacion; ninguno es vacuo)

| Test | Por que pasa | Por que se queda |
|---|---|---|
| congelacion: *"fila 29 terminado el rango el estado vuelve al calculo normal con la fechaFin extendida"* | La extension se aplica con **fixture directa en BD** (`aplicarPausaDirecta`) y `calcularEstado` ya devuelve `ACTIVA` para una pausa cuyo `congelacionFin < hoy` | Frontera real: fallara si la implementacion devuelve `CONGELADO` para pausas terminadas; asienta `fechaFin = hoy+41` (N = 11 aplicado) |
| congelacion: *"regresion HU15-C03 los estados base sin pausa siguen siendo ACTIVA, VENCIDA y PROGRAMADA"* | Comportamiento base ya existente | Guarda de no-regresion obligatoria antes de extender `calcularEstado` a `CONGELADO` |
| unidad: *"pausa ya terminada vuelve al estado base VENCIDA"*, *"pausa futura vuelve al estado base ACTIVA"*, *"sin congelaciones (3 argumentos) conserva ACTIVA"*, *"lista vacia conserva VENCIDA"* | `calcularEstado` ignora hoy el 4to argumento y produce justo el estado base esperado cuando **no** hay pausa vigente que cubra `hoy` | Delimitan la extension: solo `hoy ∈ [cInicio, cFin]` debe cambiar el resultado; fallaran si la implementacion sobre-aplica `CONGELADO` |

Ningun test del paquete pasa sin fixture ni con asercion trivial (`expect(true)` / `>= 0` no
existen en estos archivos); los 6 verdes exigen fixtures concretas y valores numericos fijos.

#### Comandos de apoyo

```bash
# RED granular de los 4 archivos nuevos
npx vitest run tests/integration/membresia-congelacion.test.ts \
               tests/integration/membresia-descongelacion.test.ts \
               tests/integration/membresia-editar-congelacion.test.ts \
               tests/unit/membresia-logic-congelacion.test.ts
# -> Tests 121 failed | 6 passed (127); Test Files 4 failed (4)

# Bateria completa con evidencia estructurada (incluye la base)
npx vitest run --reporter=json --outputFile=%TEMP%\opencode\inc02-red-full.json
# -> exit 1; passed=258 failed=121 total=379 (base 252/252 verde)
```

#### Riesgos y gaps abiertos del RED

1. **Mensaje `CONGELACION_INEXISTENTE`** usado en los 3 archivos:
   `No hay una congelación vigente en esta membresía` (literal de
   `HU-15-criterios-aceptacion.md`, gap "Ampliacion DEC-024"); si el GREEN lo implementa
   distinto, la correccion es de criterios, no del test.
2. **Contratos unitarios propuestos** (`diasDevueltos`, `fechaFinTrasEdicion`) no estan en
   el spec como firmas: el GREEN puede exportarlas con ese nombre u otro equivalente; si el
   orquestador prefiere otra firma, se renombra el test (la formula es la misma).
3. **Cruce de medianoche Bogota**: `HOY` se captura al cargar el modulo y las rutas usan
   `getTodayBogota()` en tiempo de request; una corrida justo en el cambio de dia podria
   desfasar los fixtures dinamicos (riesgo aceptado, mismo patrón que la base).
4. **Lint**: `package.json` define `lint: "eslint src/ tests/"` pero **no hay config de
   ESLint** (`eslint.config.*` / `.eslintrc*` = 0 en `club-beasts-api/`), asi que no se
   ejecuta; el typecheck de los 4 archivos nuevos si corrio (`--strict`, exit 0, ver tabla
   de comandos). El `tsc -p tsconfig.json` (src) tambien da exit 0.
5. Cobertura E2E (`club-beasts-web/tests/e2e/congelacion.spec.ts`) y Gherkin
   (`features/*.feature` D/E) **fuera del alcance de este RED** (tareas #7/#8 de `tareas.md`).

## Verificacion final (2026-10-08) — tareas #7 y #8

Puerta de salida de INC-02: E2E real en navegador del flujo de congelacion
(tarea #7) + bateria completa API / web / Playwright (tarea #8). Todo en verde;
`club-beasts-api/src/`, `club-beasts-web/src/`, `prisma/`, criterios y
`tareas.md` **sin cambios** en esta fase.

### Tarea A — E2E creado: `club-beasts-web/tests/e2e/congelacion.spec.ts` (435 lineas, 5 tests)

| # | Escenario (titulo del test) | Criterios | Que verifica en navegador |
|---:|---|---|---|
| 1 | flujo feliz: congelar un rango contenido en la vigencia deja el badge Congelado, la pausa visible y la fechaFin extendida | `INC02-CON-03`, `INC02-CON-04`, `HU15-C04` | Login DUENO -> cliente + vigencia ACTIVA `[hoy-30 .. hoy+30]` creadas por API -> ficha -> `Congelar` -> rango `[hoy-2 .. hoy+7]` (N = 10 dias inclusivos, contenido en la vigencia, cubre hoy) + motivo -> enviar. Asercion: mensaje de exito con el rango, `fechaFin = hoy+40` y "10 dias congelados"; badge **Congelado**; linea `Pausa: dd/mm/yyyy — dd/mm/yyyy · Viaje de trabajo`; fila con la `fechaFin` extendida; las acciones cambian a `Descongelar` + `Editar congelación`; **persiste tras `page.reload()`** |
| 2 | pausa futura contenido en la vigencia extiende la fechaFin pero el estado sigue Activa | `INC02-CON-03` (rama negativa), `HU15-C03`, `INC02-CON-04` | Rango 100% futuro `[hoy+5 .. hoy+14]` (N = 10) -> `fechaFin` extendida + mensaje de exito, pero el badge sigue **Activa** (`CONGELADO` solo aplica si `hoy ∈ rango`) y la linea `Pausa:` si aparece, con acciones `Descongelar`/`Editar congelación` |
| 3 | descongelar una pausa vigente quita la pausa y muestra los dias devueltos | `INC02-CON-07`, `HU15-C07`, DEC-024 | Fixture: pausa en curso `[hoy-2 .. hoy+7]` via API (version 1 -> 2, `fechaFin = hoy+40`) -> en la ficha `Descongelar` -> confirmar. Asercion: `diasDevueltos = 8` (`(hoy+7) - hoy + 1`), `fechaFin = hoy+32`, mensaje "8 dias devueltos"; **desaparece** la pausa (sin linea `Pausa:`), badge vuelve a **Activa**, reaparece `Congelar` y desaparece `Descongelar`; persiste tras recargar |
| 4 | una ficha con version obsoleta recibe 409 MEMBRESIA_CONFLICTO y no aplica la pausa | contrato 49.1 (`MEMBRESIA_CONFLICTO`), INC00-MEM-03 | Se abre el formulario (snapshot version 1), otra congelacion concurrente avanza la version a 2 via API, se envia -> mensaje "Los datos fueron modificados por otro usuario. Recargue e intente nuevamente.", el formulario sigue abierto, **sin** feedback de exito y la fila queda sin pausa (accion `Congelar` sigue ahi) |
| 5 | una sesion CLIENTE no ve las acciones Congelar/Descongelar y el backend responde 403 | `INC02-CON-05`, DEC-017 | Sesion CLIENTE (`/login-cliente`): en `/portal` **no existen** los botones `Congelar`/`Descongelar` (0 coincidencias); al navegar a `/clientes/<id>` el middleware redirige a `/portal` y tampoco existen; autoridad backend: `GET .../membresias-gym` y `POST .../congelar` con el token CLIENTE responden **403 `AUTH_FORBIDDEN`** con mensaje `No tienes permisos para realizar esta acción.` |

Notas de diseno del spec:

- **Fechas 100% dinamicas**: `hoyBogota()` + `sumarDias()` de
  `tests/e2e/e2e-helpers.ts` (America/Bogota, DEC-005/DEC-013); cero fechas de
  calendario fijas. Los fixtures (cliente con cedula unica + vigencia GYM) se
  crean por la misma API que usa el navegador y cada test es independiente.
- **Sin esperas arbitrarias**: solo web-first assertions (`toHaveCount`,
  `toContainText`, `toBeVisible`, `toHaveURL`); la espera de la seccion usa
  `expect(page.getByText(/Cargando membresías/i)).toHaveCount(0)` (mismo patron
  diagnosticado para R-10) antes de leer la tabla.
- **Sin `skip`, sin `test.only`, sin `isVisible()` condicional, sin aserciones
  vacias** (verificado por grep: 0 ocurrencias fuera del comentario de cabecera).
- La decision del rango del escenario 1: el encargo pedia "rango futuro" y
  "badge visible"; como el badge `CONGELADO` solo aplica si `hoy ∈ rango`, el
  happy path usa un rango que **cubre hoy y se extiende al futuro** (escenario 1,
  badge `Congelado` + pausa + `fechaFin`) y el rango **100% futuro** tiene su
  propio escenario (escenario 2, badge `Activa` + pausa + extension). Asi se
  cubren las dos lecturas sin sacrificar `INC02-CON-03`.

**Corrida dirigida previa** (`npx playwright test congelacion.spec.ts`): primera
ejecucion **4/5** — el unico fallo fue del propio test nuevo (asumio que la
sesion CLIENTE podia listar las vigencias; el endpoint es de staff y responde
403). Corregido en el test (sin tocar codigo de producto) a la contraparte real
del contrato: se usa el `vigenciaId` del fixture y se afirma el 403 explicito.
Corrida de reemplazo **1/1** y despues **5/5** en el contexto completo.

### Tarea B — Bateria completa (6 comandos + Playwright)

| Fecha | Directorio | Comando | Resultado |
|---|---|---|---|
| 2026-10-08 | `club-beasts-api` | `npx vitest run` | **379/379** — `Test Files 21 passed (21)`, `Tests 379 passed (379)`, exit 0 (duration 6.20s) |
| 2026-10-08 | `club-beasts-api` | `npx tsc --noEmit` | **exit 0** — 0 errores de tipo |
| 2026-10-08 | `club-beasts-api` | `npm run test:gherkin` | **63/63** — `Test Files 2 passed (2)`, `Tests 63 passed (63)`, exit 0 |
| 2026-10-08 | `club-beasts-web` | `npx tsc --noEmit` | **exit 0** — 0 errores; corrida limpia tras borrar `tsconfig.tsbuildinfo` para forzar el chequeo completo del spec nuevo |
| 2026-10-08 | `club-beasts-web` | `npx vitest run` | **147/147** — `Test Files 16 passed (16)`, `Tests 147 passed (147)`, exit 0 |
| 2026-10-08 | `club-beasts-web` | `npm run build` | **PASS** — exit 0, `Compiled successfully`, 10 rutas generadas |
| 2026-10-08 | `club-beasts-web` | `npx playwright test` (corrida 1) | **30/30** — `30 passed (1.9m)`, exit 0: 25 base + 5 de `congelacion.spec.ts` |
| 2026-10-08 | `club-beasts-web` | `npx playwright test` (corrida 2, estabilidad) | **30/30** — `30 passed (2.0m)`, exit 0 |

Lineas de comandos para reproducir (una por verificacion):

```bash
# 1) Suite unit/integration de la API (379/379)
cd club-beasts-api && npx vitest run

# 2) Typecheck de la API (exit 0)
cd club-beasts-api && npx tsc --noEmit

# 3) Gherkin (63/63)
cd club-beasts-api && npm run test:gherkin

# 4) Typecheck del web, incluyendo tests/e2e/congelacion.spec.ts (exit 0)
cd club-beasts-web && npx tsc --noEmit

# 5) Unit/component tests del web (147/147)
cd club-beasts-web && npx vitest run

# 6) Build de produccion del web (PASS)
cd club-beasts-web && npm run build

# 7) E2E completo en navegador (30/30; levanta API E2E SQLite aislado en 3001 + Next en 3000)
cd club-beasts-web && npx playwright test

# 7b) Solo los escenarios nuevos de INC-02 (5/5)
cd club-beasts-web && npx playwright test congelacion.spec.ts
```

### R-10 (flaky en `clientes.spec.ts:147`) — NO se reprodujo

- El test *"pagina la lista cuando los resultados no caben en una pagina"*
  (linea 147, `allTextContents` en lineas 181/193) paso en **las dos corridas
  completas** (4.8s en la corrida 1; sin reintentos, `retries: 0` fuera de CI).
- En consecuencia **`club-beasts-web/tests/e2e/clientes.spec.ts` quedo intacto**
  (el fix diagnostico `expect(getByText(/loading/i)).toHaveCount(0)` solo aplica
  si se reproduce; ademas es fuera del alcance salvo reproduccion).
- Riesgo residual abierto: la lista muestra `Cargando clientes...`
  (`src/app/clientes/page.tsx:172`) mientras recarga; si R-10 vuelve a aparecer,
  el guard ya probado en `congelacion.spec.ts` es
  `await expect(page.getByText(/Cargando clientes/i)).toHaveCount(0);` antes de
  las lecturas de `allTextContents`.

### Archivos tocados en la verificacion final

| Archivo | Cambio |
|---|---|
| `club-beasts-web/tests/e2e/congelacion.spec.ts` | **nuevo** (435 lineas, 5 tests) |
| `docs/incrementos/INC-02-congelacion-hu-15/evidencia.md` | esta seccion + actualizacion del estado del encabezado |
| `club-beasts-web/tsconfig.tsbuildinfo` | artefacto de build borrado y regenerado por `tsc` (para forzar chequeo limpio) |

Sin cambios: `club-beasts-api/src/`, `club-beasts-web/src/`, `prisma/`,
`features/`, criterios, `tareas.md` y el resto de specs
(`clientes.spec.ts` incluido).

### Hallazgos y riesgos para la revision

1. **R-10 sin reproducir** en 2 corridas completas; quedo como riesgo residual
   con el guard ya probado (arriba), no como cierre definitivo.
2. **409 por version** cubierto en E2E con una carrera controlada (una sola
   operacion concurrente via API, sin tiempos de espera): es estable porque el
   `request` del fixture se await-ea antes de enviar el formulario.
3. **Permisos DEC-017**: el E2E prueba la capa de ruta (middleware -> `/portal`)
   + el 403 del backend; el gate `canManage` del componente ya esta cubierto por
   `tests/unit/congelacion-ui.test.tsx` (14 tests). No existe ruta de UI para
   renderizar la ficha con sesion no gestora (el middleware la bloquea), por lo
   que no hay forma de probar el boton oculto sin forzar el render del componente.
4. **Cobertura E2E no cubierta por especificacion**: `PATCH .../congelacion`
   (editar pausa, `HU15-C08`) no tiene escenario E2E (si lo tiene en
   integracion: 35/35). Si el orquestador lo exige para aceptar
   `INC02-CON-08` en UI, se agrega un 6o test con el mismo patron del 3.
5. **Medianoche Bogota**: mismo riesgo aceptado que en el RED (los fixtures se
   calculan en cada test con `hoyBogota()`; una corrida exacta sobre el cambio
   de dia podria desfasar el rango).

## Revisiones

| Fecha | Alcance | Revisor | Dictamen |
|---|---|---|---|
| 2026-10-08 | Ciclo GREEN completo + verificacion final (E2E + bateria); ejes 1-7 (seguridad/autorizacion, concurrencia, reglas de negocio DEC-017/022/023/024/025, SQL/migracion, frontend, pruebas, integridad de proceso) | `code-reviewer` | **SIN HALLAZGOS BLOQUEANTES** — 0 bloqueantes; 5 hallazgos no bloqueantes: R-01 MEDIO (`tareas.md` desactualizado, **cerrado** por el orquestador), R-02 BAJO (desviacion `CongelacionForm.tsx`/`api.ts`, **aceptada y documentada**), R-03 BAJO (flake base R-10, no se reprodujo, backlog), R-04 BAJO (sin E2E de `PATCH .../congelacion`, no exigido por criterio: HU15-C08 exige unit+integracion, 35/35), R-05 BAJO (falta `role="alert"` en mensaje de error de `CongelacionForm.tsx:248`, backlog a11y). Revision propia del revisor: API 379/379, tsc 0/0, web 147/147, Gherkin PASS, `migrate status` 6/0 sin drift, Playwright 29/30 (flake R-03 aislado y confirmado) + 30/30. Ejes 1-7: **todos CUMPLEN** |

## Cierre

**INC-02 ACEPTADO (2026-10-08)**: pipeline completo `LISTO -> RED -> IMPLEMENTADO -> VERIFICADO -> REVISADO -> ACEPTADO`.

- **RED**: 121 fallos granulares / 127 tests nuevos, base 252/252 intacta (seccion `## RED`).
- **IMPLEMENTADO**: migracion `20261008184627_add_congelacion_hu15` (4 `ADD COLUMN` portables, sin drift); GREEN backend 3 endpoints + formula DEC-024 + auditoria; GREEN web badge/acciones/formularios.
- **VERIFICADO**: 127/127 nuevos, API **379/379**, tsc **0**, Gherkin **63/63**, web 147/147, build PASS, E2E **30/30 x2** (5 escenarios nuevos). H-01 resuelto (test corregido, no la implementacion).
- **REVISADO**: `code-reviewer` sin hallazgos bloqueantes (tabla de Revisiones).
- **ACEPTADO**: +3.5 puntos certificados = HU-15 4/4 (2.0, alcance b1 enmendado por DEC-023) + HU-12 b2 "muestra ... congelada" (1.5). Trazabilidad en `docs/producto/auditoria-puntos-inc00.md` seccion 8; `mvp.md` 26.5 -> 30; `avance.md` bloque 3 4.5 -> 8.

Riesgos residuales abiertos (ninguno bloquea): R-10 (flake base `clientes.spec.ts:147`, guard documentado), R-03/R-04/R-05 de la revision (ver tabla), medianoche Bogota en fixtures (aceptado), `diasDevueltos`/`fechaFinTrasEdicion` como firmas propuestas del RED (ya implementadas con esos nombres).
