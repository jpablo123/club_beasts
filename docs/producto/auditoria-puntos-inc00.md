# Auditoria de puntos MVP — Bloques 1-3 tras INC-00

- **Fecha**: 2026-10-06
- **Agente**: `acceptance-criteria-analyst` — Modo AVANZAR (solo lectura sobre codigo y tests)
- **Entrada**: INC-00 `estabilizacion-fases-1-2` ACEPTADO (29/29 criterios, revision final sin bloqueantes, 2026-10-06)
- **Fuentes**: `docs/producto/mvp.md`, `docs/producto/avance.md`, `docs/incrementos/INC-00-*/spec.md` + `evidencia.md`, `historias-usuario-gimnasio.md`, `club-beasts-api/features/acceptance-criteria/*`, `club-beasts-api/features/*.feature`, `club-beasts-web/tests/e2e/*`
- **Fuente NO usada como porcentaje**: `fase1.md`, `fase2.md`

---

## 0. Metodologia de conteo (explicita)

1. **Unidad de criterio** = bullet de la HU en `historias-usuario-gimnasio.md`. Los documentos ISTQB de `features/acceptance-criteria/HU-XX-criterios-aceptacion.md` operacionalizan esos bullets (particiones, ramas, regex); sus **ramas sin prueba** se listan como gaps, no como criterio extra.
2. **Un HU suma puntos solo si el bullet tiene**: especificacion + implementacion + prueba automatizada + evidencia de ejecucion + revision sin hallazgos bloqueantes.
3. **Fraccion**: `puntos = peso_HU x (bullets cerrados / total de bullets)`. Si la fraccion no es medible (no hay criterios escritos ni pruebas), `puntos = 0`.
4. **Notas de `mvp.md` mandan**: HU-07 no completa hasta vigencias+rutina+plan+anamnesis+notas+historial; HU-13/HU-14 exigen asignaciones; HU-16 exige que el vencimiento afecte recepcion, portal y acceso.
5. **Cero inventado**: cada punto lleva archivo o comando.

### Evidencia ejecutada por este auditor (2026-10-06)

| Comando | Dir | Resultado |
|---|---|---|
| `npx vitest run` | `club-beasts-api` | **245/245** (16 archivos), 0 fallos |
| `npx vitest run` | `club-beasts-web` | **118/118** (14 archivos), 0 fallos |
| `npm run test:gherkin` | `club-beasts-api` | **63/63**, `EXIT=0` |

Evidencia heredada (reproducida por `code-reviewer` el 2026-10-06, `INC-00/evidencia.md`): `npx tsc --noEmit` 0/0 API y web, `npx playwright test` **22/22**, `npx prisma migrate status` 5/0 sin drift, `npm run build` PASS.

### Inventario verificado (solo lectura)

- **Modelos Prisma**: `Sede`, `User`, `Cliente`, `MembresiaGym`, `MembresiaGymCambio` (5). **No existen** modelos de Rutina, PlanNutricional, Anamnesis, Nota, Ingreso, Congelacion, VigenciaPersonalizado ni VigenciaNutricion.
- **Rutas API**: 11 endpoints (`auth` x4, `clientes` x4, `membresia` x3). **No existen** rutas de ingresos, anamnesis, rutinas, planes, congelacion ni consulta de recepcion.
- **Archivos ISTQB existentes**: `HU-01` .. `HU-07` (7). **No existen**: HU-08, HU-12, HU-13, HU-14, HU-15, HU-16, HU-17.
- **Features**: `auth.feature` (28 ejecuciones) + `clientes.feature` (35) = 63. No hay `.feature` de membresia (DEC-014).

---

## 1. Tabla por HU (HU-01..HU-17)

Leyenda: Criterios = existencia de documento ISTQB; Imp/Ver/Acp = implementado / verificado / aceptado.

| HU | Criterios existentes | Fuente de criterios | Imp | Ver | Acp | Evidencia concreta | Bullets cerrados | Puntos propuestos |
|---|---|---|---|---|---|---|---|---:|
| **HU-01** Login interno | Si | `acceptance-criteria/HU-01-criterios-aceptacion.md` + 4 bullets HU | Si | Parcial | Parcial | `tests/integration/auth.test.ts` (16), `tests/integration/auth-session-expired.test.ts` (AUTH-04/05), `features/auth.feature` A01-A06 (de 63/63), `club-beasts-web/tests/e2e/auth.spec.ts` (8), `src/middleware.ts:31-47` | 3/4 | **3** (4 x 3/4) |
| **HU-02** Login cliente cedula+PIN | Si | `HU-02-criterios-aceptacion.md` + 4 bullets | Si | Si | Si | `auth.test.ts` "Auth - Login Cliente" (6), `tests/unit/auth.schema.test.ts` (limites 5/6/10/11 digitos, PIN 3/4/5), `auth.feature` A07-A12, `tests/e2e/portal.spec.ts` (3, login real de cliente), `tests/integration/clientes-privacy.test.ts` (7, SEC-01 aceptado) | 4/4 | **4** (4 x 4/4) |
| **HU-03** Reset de PIN | Si | `HU-03-criterios-aceptacion.md` + 4 bullets | Si | Si | Si | `tests/integration/auth-reset-traceability.test.ts` (4/4, SEC-04 aceptado), `auth.test.ts` reset (3), `auth.feature` A13-A16, SEC-03 sin hash; rol DUENO/RECEPCIONISTA en `src/routes/auth.ts:63` + `auth-session-expired.test.ts:235` (403 CLIENTE) | 4/4 | **2** (2 x 4/4) |
| **HU-04** Crear cliente | Si | `HU-04-criterios-aceptacion.md` + 4 bullets | Si | Parcial | Parcial | `tests/integration/clientes.test.ts` (29: cedula 409, campos 400, `estado="NUEVO"` l.93, search por cedula l.634), `clientes.feature` C01-C07, `tests/integration/api.test.ts:83`, `tests/e2e/clientes.spec.ts` "puede crear un cliente nuevo" | 3/4 | **3** (4 x 3/4) |
| **HU-05** Editar cliente | Si | `HU-05-criterios-aceptacion.md` + 4 bullets | Si | Parcial | Parcial | `clientes.test.ts` (edicion 200/404/400, `INC00-CLI-02` l.435 RECEPCIONISTA, l.465 CLIENTE 403), `clientes-opcionales.test.ts` (4/4), `tests/unit/cliente-edicion.test.tsx` (5), `cliente-payload.test.ts` (8), `clientes.feature` C08-C11 | 3/4 | **3** (4 x 3/4) |
| **HU-06** Busqueda y filtros | Si | `HU-06-criterios-aceptacion.md` + 4 bullets | Si | Si | Si | `clientes.test.ts` (cedula l.634, sede, estado l.698-753), `api.test.ts:86` incluido/excluido, `clientes.feature` C12-C17, `tests/unit/clientes-lista.test.tsx` (11), `tests/e2e/clientes.spec.ts` (filtros + paginacion) | 4/4 | **3** (3 x 4/4) |
| **HU-07** Ficha unica | Si | `HU-07-criterios-aceptacion.md` + 6 bullets (+ nota `mvp.md:51`) | Si | Parcial | No | `src/app/clientes/[id]/page.tsx` (datos, sede, estado, `MembershipSection`), `clientes.feature:148-152`, step `features/steps/clientes.steps.ts:396-406` (solo aserta nombres/apellidos/sede/estado), `tests/e2e/membresia.spec.ts:31-32` | 3/6 | **1** (2 x 3/6) |
| **HU-08** Inactivacion | **No** (sin `HU-08-criterios*`) | 4 bullets HU | Parcial | No | No | Sin implementacion de `motivo`; `loginClient` (`src/services/auth.service.ts:14-28`) no filtra INACTIVO; UI permite estado INACTIVO (`clientes/[id]/page.tsx:40`) | 0/4 | **0** (bullets exclusivos sin implementar; el resto ya esta pagado en HU-05/HU-06) |
| **HU-12** Membresia gym | **No** propio; si `INC00-MEM-01..07` | `INC-00/spec.md` + 4 bullets HU | Si | Si | Si | `tests/integration/membresia-validacion.test.ts` (15), `membresia-estado.test.ts` (7), `membresia-conflict.test.ts` (4), `membresia-auditoria.test.ts` (`creadoPor.id` l.241), `tests/e2e/membresia.spec.ts` (30 dias inclusivos + 409), `MembershipSection.tsx` | 3/4 | **4.5** (6 x 3/4) |
| **HU-13** Personalizado | **No** | 4 bullets + nota `mvp.md:50` | No | No | No | Sin modelo ni ruta ni asignacion de rutina (grep `PERSONALIZADO|NUTRICION` solo en archivos de criterios) | 0/4 | **0** |
| **HU-14** Nutricion | **No** | 4 bullets + nota `mvp.md:50` | No | No | No | Sin modelo ni ruta ni asignacion de plan | 0/4 | **0** |
| **HU-15** Congelacion | **No** | 4 bullets HU | No | No | No | Sin `CONGELADO` en toda la API/UI (grep `CONGELAD` = 0 en `src/`) | 0/4 | **0** |
| **HU-16** Vencimiento | **No** | 4 bullets + nota `mvp.md:52` | Parcial | No | No | `calcularEstado` -> `VENCIDA` (`membresia.service.ts:18-26`) y badge UI, **pero** portal hardcodea `"Activo"` (`src/app/portal/page.tsx:122`), no hay recepcion y el login no valida vigencia | 0/4 | **0** (nota `mvp.md:52` exige recepcion+portal+acceso) |
| **HU-17** Estados generales | **No** | 3 bullets HU | Parcial | Parcial | No | `clienteEstadoEnum` (`schemas/common.schema.ts:48`), filtro por estado, badge UI, e2e de filtro; **no existe campo `motivo`** ni historial | 0/3 | **0** (bullets exclusivos sin implementar; estados y filtros ya cobran en HU-05/HU-06) |

### Bullets que no se cierran (detalle)

| HU | Bullet sin cerrar | Estado | Bloqueante |
|---|---|---|---|
| HU-01 | "El sistema muestra solo los modulos permitidos segun el rol" | Implementado en `club-beasts-web/src/middleware.ts:31-47`; **sin prueba automatizada** (no hay test de la rama CLIENTE -> `/clientes` -> `/portal`) | QA + Frontend |
| HU-04 | "El sistema deja trazabilidad de quien creo el cliente" | `creadoPorId`/`actualizadoPorId` se escriben (`cliente.service.ts:73`) pero **ningun test los aserta** (grep `creadoPorId|actualizadoPorId` en `tests/**/*.test.ts` = solo membresia) | Backend + QA |
| HU-05 | "El sistema guarda fecha de actualizacion y usuario responsable" | `updatedAt`/`actualizadoPorId` se escriben (`cliente.service.ts:102`) pero **sin prueba**; ademas `selectCliente` no expone `creadoPor`/`actualizadoPor` | Backend + QA |
| HU-07 | vigencias (3 tipos), rutina+plan, notas+historial | Solo vigencia GYM visible; sin relaciones en `cliente.service.ts:108-113` | Backend + Frontend + Producto (bloques 5-7) |
| HU-12 | "muestra si esta activa, vencida o congelada" | Sin estado `CONGELADO`; depende de HU-15 | Backend (HU-15) |
| HU-08 | motivo + bloqueo de acceso por INACTIVO | Sin campo `motivo`; `loginClient` no filtra estado; **PEND-006** pendiente | Producto + Backend |
| HU-17 | "registra motivo cuando el estado cambia" | Sin campo `motivo` ni historial | Backend + Producto |
| HU-13/14/15/16 | todos | Sin codigo; HU-13/14 ademas dependen de asignaciones (PEND-004/005) | Backend + Producto |

### Por que HU-08 y HU-17 van en 0 pese a codigo parcial (anti-duplicado)

Ambas HU comparten su bullet 1 con HU-05 y HU-06, que ya cobran esos puntos:

| Bullet compartido | Ya cobrado en | Evidencia que lo cierra |
|---|---|---|
| "manejar estados / cambiar estado" | HU-05 (4 pts) | `clientes.test.ts:435` (`INC00-CLI-02` RECEPCIONISTA cambia estado, aceptado) |
| "filtrar por estado general" | HU-06 (3 pts) | `clientes.feature` C13 + e2e de filtro (`INC00-CLI-04/05`, aceptados) |
| "no borra fisicamente" | HU-05 | No hay operacion de borrado en ninguna ruta (11 endpoints inventariados) |

Lo que **es exclusivo** de HU-08 y HU-17 no esta implementado ni probado: `motivo` del cambio, conservacion/visibilidad de historial y bloqueo de acceso del cliente INACTIVO (`auth.service.ts:14-28` no filtra estado). Por eso ambas quedan en **0**: sus bullets distintivos no tienen ni implementacion ni prueba, y sus bullets restantes ya estan pagados en HU-05/HU-06 (contarlos de nuevo seria duplicacion).

---

## 2. Propuesta de ponderacion por HU dentro de cada bloque

### Bloque 1 — Identidad, sesiones y permisos (peso **10**)

| HU | Prioridad | Peso | Justificacion de alcance relativo | Fraccion | Puntos |
|---|---|---:|---|---|---:|
| HU-01 | Alta | **4** | Puerta de entrada interna: 4 criterios + superficie de 3 ramas (login, identificacion de rol, modulos por rol) | 3/4 | 3 |
| HU-02 | Alta | **4** | Puerta de entrada cliente: 4 criterios, validacion de cedula/PIN con limites estrictos + portal | 4/4 | 4 |
| HU-03 | Media | **2** | Operacion puntual de soporte sin pantalla propia hoy; prioridad Media en la HU | 4/4 | 2 |
| | | **10** | | | **9** |

### Bloque 2 — Clientes, sedes, estados y ficha basica (peso **15**)

| HU | Prioridad | Peso | Justificacion de alcance relativo | Fraccion | Puntos |
|---|---|---:|---|---|---:|
| HU-04 | Alta | **4** | CRUD de entrada: 6 campos validados + unicidad + sede + estado inicial + trazabilidad | 3/4 | 3 |
| HU-05 | Alta | **4** | CRUD de mantenimiento: misma superficie que creacion + control de sede/estado + trazabilidad | 3/4 | 3 |
| HU-06 | Alta | **3** | Un endpoint con 4 parametros + UI de lista (filtros, estados vacios, paginacion) | 4/4 | 3 |
| HU-07 | Alta (transversal) | **2** | En este bloque solo la base (datos personales, sede, estado); el resto del peso (vigencias, rutina, plan, anamnesis, notas, historial) pertenece a bloques 3, 5, 6 y 7 segun `mvp.md:51` | 3/6 | 1 |
| HU-08 | Media | **1** | Cambio de estado sin borrado fisico: alcance estrecho | 0/4 | 0 |
| HU-17 | Media | **1** | Catalogo de estados + motivo: alcance estrecho | 0/3 | 0 |
| | | **15** | | | **10** |

### Bloque 3 — Vigencias de servicios y congelacion (peso **15**)

| HU | Prioridad | Peso | Justificacion de alcance relativo | Fraccion | Puntos |
|---|---|---:|---|---|---:|
| HU-12 | Alta | **6** | Unico servicio con ciclo completo (alta, edicion, estados, solape, concurrencia, auditoria, UI y E2E); INC-00 le dedico los 7 criterios MEM | 3/4 | 4.5 |
| HU-13 | Alta | **3** | Misma estructura que HU-12 pero depende de la asignacion de rutina personalizada (bloque 6) | 0/4 | 0 |
| HU-14 | Alta | **3** | Misma estructura que HU-12 pero depende de la asignacion de plan nutricional (bloque 7) | 0/4 | 0 |
| HU-15 | Alta | **2** | Operacion transversal sobre los 3 servicios (fecha inicio/fin/motivo + extension de vencimiento) | 0/4 | 0 |
| HU-16 | Media | **1** | Deteccion y propagacion del vencimiento; depende de recepcion/portal/acceso | 0/4 | 0 |
| | | **15** | | | **4.5** |

### Confirmacion sin ponderar — Bloque 4 (Recepcion, ingresos y portal operativo)

| HU | Codigo | Puntos | Base |
|---|---|---:|---|
| HU-25 | No | **0** | `portal/page.tsx` hardcodea estado `"Activo"` (l.122); sin cedula, sede ni vencimiento en el portal |
| HU-29 | No | **0** | No existe endpoint ni pantalla de consulta por cedula en recepcion (11 rutas inventariadas) |
| HU-30 | No | **0** | No existe modelo `Ingreso` ni ruta de ingreso |
| HU-31 | No | **0** | No existe flujo de creacion rapida desde recepcion |

---

## 3. Totales propuestos

| Bloque | Peso | Puntos aceptados | % del bloque |
|---|---:|---:|---:|
| 1. Identidad, sesiones y permisos | 10 | **9** | 90% |
| 2. Clientes, sedes, estados y ficha basica | 15 | **10** | 66.7% |
| 3. Vigencias de servicios y congelacion | 15 | **4.5** | 30% |
| **Suma bloques 1-3** | **40** | **23.5** | 58.75% |
| 4. Recepcion, ingresos y portal operativo | 10 | 0 (confirmado) | 0% |
| 5-8. Resto | 50 | 0 (fuera de alcance de esta auditoria) | 0% |
| **Total MVP** | **100** | **23.5** | **23.5%** |

`avance aceptado = puntos aceptados / 100` = **23.5 / 100 = 23.5 %** (solo si el orquestador aplica las tablas de la seccion 5).

- Del **corte al 50%** (bloques 1-4): 23.5 / 50 = 47%.
- Los porcentajes de `fase1.md`/`fase2.md` no se usaron.

---

## 4. Gaps que impiden sumar mas (priorizados)

| # | Gap | Archivo / linea | Puntos que desbloquea | Responsable |
|---:|---|---|---:|---|
| G1 | Sin prueba del guard de rol en la UI (CLIENTE navegando a `/clientes` debe ir a `/portal`; sin test de la rama negativa) | `club-beasts-web/src/middleware.ts:31-47` | **+1** (HU-01 c3) | QA + Frontend |
| G2 | Trazabilidad de cliente sin asertar: `creadoPorId`, `actualizadoPorId` y `updatedAt` no se prueban; `selectCliente` ni siquiera los expone | `src/services/cliente.service.ts:24-38,73,102` | **+2** (HU-04 c4 + HU-05 c3) | Backend + QA |
| G3 | Step Gherkin enganoso: el paso se llama "datos personales, sede, estado, **rutina activa y plan nutricional**" pero solo aserta `nombres/apellidos/sede/estado` | `club-beasts-api/features/steps/clientes.steps.ts:396-406` (escenario `clientes.feature:148`) | Higiene; condiciona poder acreditar HU-07 sin falsa evidencia | QA + acceptance-criteria-analyst |
| G4 | Ficha sin relaciones: `getClienteById` no incluye membresias, rutina, plan, notas ni historial | `src/services/cliente.service.ts:108-113` | **+1** (HU-07 restante) y base de bloques 5-7 | Backend |
| G5 | Sin estado `CONGELADO` ni HU-15: ningun archivo de `src/` contiene `CONGELAD` | `membresia.service.ts:18-26`, sin modelo | **+1.5** (HU-12 c2) y **+2** (HU-15) | Backend + DBA + Frontend |
| G6 | HU-13/HU-14 sin vigencias de personalizado/nutricion ni asignaciones de rutina/plan | sin modelo; depende de PEND-004/PEND-005 | **+6** | Backend + Producto |
| G7 | HU-16: el vencimiento no afecta recepcion, portal ni acceso (portal hardcodeado, login sin vigencia) | `src/app/portal/page.tsx:122`, `src/services/auth.service.ts:14-28` | **+1** y prerequisito de HU-25/HU-29 | Producto + Backend + Frontend |
| G8 | HU-08: sin campo `motivo`, `loginClient` no bloquea INACTIVO, PEND-006 sin resolver | `auth.service.ts:14-28`, `prisma/schema.prisma:46` | **+1** | Producto + Backend |
| G9 | HU-17: sin registro de motivo ni historial de cambio de estado | `schemas/common.schema.ts:48`, sin campo | **+1** | Backend + Producto |
| G10 | Sin UI de reset de PIN: `api.auth.resetPin` existe pero **nadie lo consume** | `club-beasts-web/src/lib/api.ts:127-131` | 0 hoy (bullet no exige UI); Producto debe decidir si lo exige | Frontend + Producto |
| G11 | Rama de HU-03 sin prueba: `reset-pin` con `clienteId` inexistente -> 404 esta implementado pero sin test ni escenario | `src/routes/auth.ts:77-82` | 0 hoy (higiene de cobertura) | QA |
| G12 | `features.test.ts` heredado duplica escenarios Gherkin (riesgo D2) y puede usarse como evidencia falsa | `tests/integration/features.test.ts` | 0; higiene | QA + Orquestador |
| G13 | R-01: sin constraint de solapamiento a nivel de BD (SQLite no reproduce la carrera) | `membresia.service.ts:165-178` | Protege los **4.5** ya acreditados de HU-12 | Backend + DBA |
| G14 | Sin archivos ISTQB para HU-08, HU-12..HU-17 (7 HU del corte al 50% sin criterios escritos) | `features/acceptance-criteria/` | Requisito previo para poder puntuarlas | acceptance-criteria-analyst | **Cerrado (2026-10-08)**: creados HU-08, HU-13, HU-14, HU-15, HU-16, HU-17 (y ademas HU-25, HU-29, HU-30, HU-31 del bloque 4); HU-12 sigue sin archivo propio porque puntua con `INC00-MEM-01..07` |

### Pruebas sugeridas por criterio pendiente

| Criterio | Prueba sugerida | Tipo |
|---|---|---|
| HU-01 c3 | `tests/e2e/acceso-roles.spec.ts`: CLIENTE logueado -> `goto("/clientes")` -> espera `/portal`; RECEPCIONISTA logueado -> ve links Clientes/Dashboard | E2E |
| HU-04 c4 | `tests/integration/clientes.test.ts`: tras `POST /clientes` con token DUENO, leer BD y `expect(cliente.creadoPorId).toBe(actorId)` | Integracion |
| HU-05 c3 | Tras `PATCH /clientes/:id`, `expect(updatedAt)` posterior al previo y `actualizadoPorId === actorId`; exponer campos en `selectCliente` o leer BD | Integracion |
| HU-07 (ficha) | Renombrar el step C18 a lo que aserta; nuevo step `la ficha muestra vigencias, rutina, plan, notas e historial` en **RED** hasta que existan las relaciones | Gherkin/ATDD |
| HU-12 c2 | Tras aplicar HU-15, asertar estado `CONGELADO` en API, badge en UI y extension de `fechaFin` | Integracion + E2E |
| HU-08 | `POST /auth/login-cliente` con cliente INACTIVO -> 401 con codigo propio; PATCH estado con `motivo` persistido | Integracion |
| HU-17 | PATCH `estado` con `motivo` -> persiste motivo + registra actor; transiciones invalidas rechazadas | Integracion |
| HU-16 | E2E: vigencia vencida -> portal muestra vencido, recepcion lo bloquea y el acceso denegado | E2E |

### Decisiones de producto pendientes que afectan estos puntos

| Decision | HU afectada | Impacto en puntos |
|---|---|---|
| **PEND-002** — permiso de recepcion sobre vigencias | HU-12, HU-15 | Hoy `src/routes/membresia.ts:82,92` ya permite `DUENO` y `RECEPCIONISTA`; hay que confirmar que coincide con el acuerdo de fase 2 |
| **PEND-004** — estructura de rutina personalizada | HU-13 (+ HU-20) | Sin resolver no se puede puntuar HU-13 (3) |
| **PEND-005** — estructura de plan nutricional | HU-14 (+ HU-23) | Sin resolver no se puede puntuar HU-14 (3) |
| **PEND-006** — regla de reactivacion de cliente inactivo | HU-08 | Sin resolver HU-08 queda en 0 |
| **Nueva (propuesta)** — ¿se exige UI de reset de PIN por DUENO/RECEPCIONISTA? | HU-03 | Si Producto la exige, HU-03 pasa a 4/5 bullets y cae de 2 a 1.5 |
| **D1 / D2** de `gherkin-alcance.md` — alcance Gherkin SEC-01/02 y destino de `features.test.ts` | HU-01, HU-02, HU-07 | Higiene de evidencia ATDD |

### Riesgos de alcance parcial o duplicado

1. **Duplicado HU-07 / HU-12 (vigencias en ficha)**: la visibilidad de la vigencia se acredita **una sola vez**, en HU-12 (bullet 3). En HU-07 (bullet 4) queda en 0 hasta que existan las 3 vigencias.
2. **Duplicado HU-07 / HU-16 (estado en ficha)**: HU-16 no acredita nada por la nota `mvp.md:52`; cuando se cierre, verificar que el mismo dato no se pinte dos veces en contadores distintos.
3. **Duplicado HU-16 / bloque 4 (HU-25, HU-29)**: el vencimiento debe probarse en portal y recepcion una sola vez; asignar el criterio al bloque donde se cierre primero y no contarlo en ambos.
4. **Parcialidad de HU-12**: 4.5 puntos dependen de un riesgo abierto (R-01, constraint en Postgres). Si `code-reviewer` lo eleva a bloqueante en produccion, esos puntos quedan condicionados.
5. **Evidencia falsa potencial**: `features.test.ts` (D2) y el step enganoso (G3) pueden hacer parecer cubierta una HU que no lo esta.
6. **Sin criterios escritos no se puntua**: HU-08, HU-12..HU-17 no tienen archivo ISTQB propio. HU-12 se puntua igual porque sus criterios operativos existen y estan aceptados (`INC00-MEM-01..07`); las demas quedan en 0 hasta que `acceptance-criteria-analyst` genere sus documentos (G14) y exista codigo que probar.

---

## 5. Tablas exactas para aplicar por el orquestador

### 5.1 `docs/producto/mvp.md` -> tabla "Bloques del MVP", columna **Estado actual**

| Bloque | Peso | HU relacionadas | Estado actual |
|---|---:|---|---|
| Identidad, sesiones y permisos | 10 | HU-01, HU-02, HU-03 | **9/10**: HU-01 3/4 (falta prueba del guard de rol en UI), HU-02 4/4, HU-03 4/4 |
| Clientes, sedes, estados y ficha basica | 15 | HU-04, HU-05, HU-06, HU-07, HU-08, HU-17 | **10/15**: HU-04 3/4 y HU-05 3/4 (trazabilidad sin probar), HU-06 4/4, HU-07 3/6 (transversal, ver nota), HU-08 0, HU-17 0 |
| Vigencias de servicios y congelacion | 15 | HU-12, HU-13, HU-14, HU-15, HU-16 | **4.5/15**: HU-12 3/4 (falta estado congelado), HU-13 0, HU-14 0, HU-15 0, HU-16 0 |
| Recepcion, ingresos y portal operativo | 10 | HU-25, HU-29, HU-30, HU-31 | **0/10 confirmado**: sin codigo en las cuatro HU |
| Anamnesis y privacidad | 12 | HU-09, HU-10, HU-11, HU-28 | Pendiente |
| Rutinas, asignacion e historial | 18 | HU-18, HU-19, HU-20, HU-21, HU-26 | Pendiente |
| Nutricion, asignacion e historial | 12 | HU-22, HU-23, HU-24, HU-27 | Pendiente |
| Historial, reportes y notificaciones | 8 | HU-32, HU-33, HU-34 | Pendiente |
| **Total** | **100** | HU-01 a HU-34 | **23.5 puntos aceptados (23.5%)** |

### 5.2 `docs/producto/avance.md` -> tabla "Tabla de avance por bloque", columna **Puntos aceptados**

| Bloque | Peso | Estado actual (columna existente) | Puntos aceptados |
|---|---:|---|---:|
| Identidad, sesiones y permisos | 10 | INC-00 aceptado (SEC-01..04, AUTH-01..07); ponderacion por HU aplicada 2026-10-06 | **9** |
| Clientes, sedes, estados y ficha basica | 15 | INC-00 aceptado (CLI-01..05); HU-07 sigue siendo transversal; ponderacion por HU aplicada 2026-10-06 | **10** |
| Vigencias de servicios y congelacion | 15 | Membresia gym verificada y aceptada (MEM-01..07); faltan personalizado, nutricion y congelacion (HU-13..HU-16) | **4.5** |
| Recepcion, ingresos y portal operativo | 10 | Confirmado sin codigo: HU-25, HU-29, HU-30, HU-31 | **0** |
| Anamnesis y privacidad | 12 | Pendiente | **0** |
| Rutinas, asignacion e historial | 18 | Pendiente | **0** |
| Nutricion, asignacion e historial | 12 | Pendiente | **0** |
| Historial, reportes y notificaciones | 8 | Pendiente | **0** |
| **Total aceptado certificado** | **100** | | **23.5** |

> Nota adicional (no pedida, pero necesaria para coherencia): en `avance.md` hay que actualizar el resumen ejecutivo ("**0 de 100 puntos certificados**" -> **23.5 de 100**) y la nota del porcentaje, citando esta auditoria como base.

---

## 6. Formato minimo de reporte al orquestador

- **Criterios auditados**: 7 documentos ISTQB (`HU-01`..`HU-07`) + 29 criterios INC-00 (ya aceptados). **Creados**: 0 (Modo AVANZAR).
- **Gaps por archivo y criterio**: G1 `middleware.ts:31-47`; G2 `cliente.service.ts:24-38,73,102`; G3 `clientes.steps.ts:396-406`; G4 `cliente.service.ts:108-113`; G5 `membresia.service.ts:18-26`; G7 `portal/page.tsx:122` + `auth.service.ts:14-28`; G8 `schema.prisma:46`; G10 `api.ts:127-131`; G11 `auth.ts:77-82`; G12 `features.test.ts`.
- **Decisiones pendientes**: PEND-002, PEND-004, PEND-005, PEND-006, D1/D2 (gherkin-alcance) y la nueva "¿UI obligatoria de reset de PIN?".
- **Pruebas sugeridas**: tabla de la seccion 4 (8 propuestas, una por criterio abierto).
- **Riesgos de alcance parcial o duplicado**: seccion 4, apartado final (6 riesgos).
- **BLOQUEADO?**: no. No hay pregunta que frene esta auditoria; las decisiones pendientes afectan puntos **futuros** (HU-08, HU-13, HU-14), no los 23.5 propuestos.

### Hoja de ruta inmediata (puntos desbloqueables sin decision de producto)

| Orden | Accion | Responsable | Puntos |
|---:|---|---|---:|
| 1 | E2E del guard de rol (G1) | QA + Frontend | +1 |
| 2 | Pruebas de trazabilidad de cliente (G2) | Backend + QA | +2 |
| 3 | Relaciones de ficha + step honesto (G3, G4) | Backend + QA | +1 |
| 4 | **Subtotal inmediato** | | **27.5** |
| 5 | HU-15 congelacion (G5) — requiere modelado, no decision de producto | Backend + DBA + Frontend | +3.5 |
| 6 | **Subtotal con congelacion** | | **31** |
| 7 | HU-13/HU-14/HU-16/HU-08/HU-17 (G6-G9) | requiere PEND-004/005/006 + bloques 5-7 | +9 |

---

## 7. Ampliacion INC-01 (2026-10-07)

- **Incremento**: `INC-01-cierre-gaps-bloque-1-2` (ACEPTADO, 5/5 criterios, revision sin bloqueantes).
- **Evidencia**: `docs/incrementos/INC-01-cierre-gaps-bloque-1-2/evidencia.md` (RED 3 failed/7 -> GREEN; API 252/252, tsc 0/0, Gherkin 63/63, web 118/118, build PASS, E2E 25/25; revision 5/5 ACEPTA, 0 bloqueantes).
- **Metodo**: DEC-016 (fraccion de bullets cerrados con spec + implementacion + prueba + evidencia + revision).

| HU | Bullet cerrado por INC-01 | Fraccion nueva | Puntos antes -> despues |
|---|---|---|---|
| HU-01 (peso 4) | "El sistema muestra solo los modulos permitidos segun el rol" (E2E `acceso-roles.spec.ts`, 3 tests) | 4/4 | 3 -> **4** (+1) |
| HU-04 (peso 4) | "El sistema deja trazabilidad de quien creo el cliente" (`creadoPorId`/`actualizadoPorId` asertados en respuesta y BD, `clientes-trazabilidad.test.ts`) | 4/4 | 3 -> **4** (+1) |
| HU-05 (peso 4) | "El sistema guarda fecha de actualizacion y usuario responsable" (`actualizadoPorId` + `updatedAt` > previo, respuesta y BD; `creadoPorId` inmutable) | 4/4 | 3 -> **4** (+1) |
| HU-07 (peso 2) | Ninguno nuevo: INC01-FIC-02 solo expone la vigencia GYM en la ficha; el bullet 4 exige las 3 vigencias y el step C18 se corrigio solo de higiene (G3) | 3/6 | 1 -> **1** (sin cambio) |

**Totales actualizados**: bloque 1 = **10/10**, bloque 2 = **12/15**, bloque 3 = 4.5/15, **total MVP = 26.5/100**.

Gaps de la seccion 4 cerrados: **G1**, **G2**, **G3**; **G4 parcial** (relacion `membresias` GYM en ficha, orden `fechaInicio` desc y estado con `calcularEstado(getTodayBogota())`, asertado; faltan personalizado/nutricion, notas e historial). Riesgos abiertos por INC-01: **R-10** (flake preexistente `clientes.spec.ts:147`) y **R-11** (NB-02: ids de staff visibles al CLIENTE en su propia ficha, contrato aceptado).

---

## 8. Ampliacion INC-02 (2026-10-08)

- **Incremento**: `INC-02-congelacion-hu-15` (ACEPTADO, revision `code-reviewer` **sin hallazgos bloqueantes**).
- **Evidencia**: `docs/incrementos/INC-02-congelacion-hu-15/evidencia.md` (RED 121 fallos/127, GREEN API **379/379** + web **147/147** + build PASS, Gherkin 63/63, E2E `congelacion.spec.ts` 5/5 y Playwright **30/30 x2**, H-01 resuelto, revision tabla "Revisiones").
- **Metodo**: DEC-016 (fraccion de bullets cerrados con spec + implementacion + prueba + evidencia + revision).

| HU | Bullet cerrado por INC-02 | Fraccion nueva | Puntos antes -> despues |
|---|---|---|---|
| HU-12 (peso 6) | b2 "muestra si esta activa, vencida o congelada" — estado `CONGELADO` calculado (`calcularEstado` con rangos de pausa), badge en UI y E2E (gap **G5**, pruebas `HU15-C03` + `congelacion.spec.ts` esc. 1-3) | 4/4 | 3/4 -> **4/4** (4.5 -> **6**, **+1.5**) |
| HU-15 (peso 2) | Los 4 bullets: b1 congelar servicios (alcance **enmendado por DEC-023**: GYM + PERSONALIZADO; nutricion fuera), b2 exige inicio/fin/motivo, b3 estado `CONGELADO`, b4 extension inclusiva America/Bogota de `fechaFin` | 4/4 | 0/4 -> **4/4** (0 -> **2**, **+2.0**) |
| Ampliacion DEC-024/025 | `descongelar`, `editar congelacion` y "sin bloqueo de acceso" | 0 puntos | **0** (sin bullet propio HU-15; DEC-016) |

- **Nota de alcance (DEC-023)**: HU-15 b1 ("los 3 tipos de servicio") se cierra **enmendado** a GYM + PERSONALIZADO por decision explicita del Producto en `docs/producto/decisiones.md` (no es un criterio pospuesto: el bullet queda cerrado con alcance cambiado y el riesgo HU-14 b2 queda asumido en INC-05).

**Totales actualizados**: bloque 3 = 4.5 + 3.5 = **8/15**, **total MVP = 30/100 (30%)**.

Cierres de la seccion 4 que afectan a este incremento: **G5** (estado `CONGELADO` / HU-15) cerrado. Gaps restantes del bloque 3: HU-13/HU-14 (G6/G8, DEC-018/019 resueltas, pendientes de INC-05) y HU-16 (G7, DEC-021, INC-03).

---

## 9. Ampliacion INC-03 (2026-10-14)

- **Incremento**: `INC-03-vencimiento-recepcion-portal` (ACEPTADO, 40/40 criterios, revision `code-reviewer` ACEPTA sin hallazgos bloqueantes, REV-01..05 no bloqueantes).
- **Evidencia**: `docs/incrementos/INC-03-vencimiento-recepcion-portal/evidencia.md` (RED 2026-10-13: 86 API + 26 web + 63 escenarios en rojo con base intacta; GREEN 2026-10-14: API **471/471**, Gherkin **126/126 x2**, web **174/174**, tsc 0/0 API y web, build PASS, migraciones 8/0 sin drift incl. `add_ingresos_y_perfil_pendiente` + `add_user_sede`; E2E **47/47 x2** con specs `recepcion`, `recepcion-creacion-rapida`, `acceso-vencimiento` nuevos y `portal` extendido; dictamen seccion 6).
- **Metodo**: DEC-016 (fraccion de bullets cerrados con spec + implementacion + prueba + evidencia + revision) + regla de no-duplicado de `decisiones.md` (2026-10-10): el efecto "vencido = sin acceso" se acredita **una sola vez en HU-16**; el bloque 4 acredita su contrato y pintado (INC03-R05).

### 9.1 HU-16 (peso 1) — bloque 3

| Bullet HU-16 | Criterio(s) INC-03 | Evidencia | Cerrado |
|---|---|---|---|
| b1 deteccion de vencimiento | `INC03-VEN-01` | `vencimiento.test.ts` (bordes `fechaFin`/`fechaFin+1`), Gherkin `vencimiento.feature`, fuente unica `resolverEstadoAcceso` | Si |
| b2 estado `VENCIDA` en API/UI y reversible | `INC03-VEN-02` | `vencimiento.test.ts` (postergar `fechaFin`), badge UI | Si |
| b3 estado visible en las 3 superficies (ficha, portal, recepcion) | `INC03-VEN-03` + `INC03-VEN-05` | portal E2E (fin del hardcode "Activo"), recepcion E2E, mismo estado en ficha/listado/portal/recepcion (divergencia corregida) | Si |
| b4 acceso denegado observable | `INC03-VEN-04` | ingreso 403 `INGRESO_NO_PERMITIDO` (rama `VENCIDA` de `ING-04`), portal sin acceso, login intacto (DEC-026); E2E `acceso-vencimiento.spec.ts` | Si |

Fraccion: **4/4**. Puntos: **1.0** (0 -> 1).

### 9.2 Bloque 4 (10 puntos, reparto INC03-R05) — HU-25/29/30/31

Reparto fijado por el orquestador al cierre (10 puntos sin ponderar por HU en `mvp.md`; pesos asignados aqui por alcance/bullets y prioridad de la HU): **HU-25 = 3, HU-29 = 3, HU-30 = 3, HU-31 = 1**.

| HU (peso asignado) | Bullets cerrados | Criterios INC-03 | Evidencia | Puntos |
|---|---|---|---|---:|
| **HU-25** portal estado real (3) | b1 nombre/cedula/sede, b2 estado de acceso, b3 fecha de vencimiento, b4 rango de congelacion | `POR-01..07` | `portal.test.ts` (12), unit web portal, `portal.spec.ts` (8 E2E), Gherkin `portal.feature` | **3.0** (3 x 4/4) |
| **HU-29** consulta por cedula (3) | b1 identidad+sede+foto, b2 estado, b3 vencimiento/congelacion, b4 ultimo ingreso, b5 alertas no sensibles | `REC-01..10` | `recepcion-consulta.test.ts` (22), unit web consulta, `recepcion.spec.ts`, Gherkin (DEC-028/029) | **3.0** (3 x 5/5) |
| **HU-30** registro de ingreso (3) | b1 multiples ingresos/dia, b2 fecha/hora/sede/usuario, b3 solo si habilitada, b4 historial visible | `ING-01..11` | `recepcion-ingresos.test.ts` (29), unit web ingreso, `recepcion.spec.ts`, Gherkin (DEC-025/030, CONF-03/06) | **3.0** (3 x 4/4) |
| **HU-31** creacion rapida (1) | b1 datos minimos, b2 marca de perfil pendiente, b3 dueno completa despues | `RAP-01..07` | `recepcion-rapida.test.ts` (22), unit web rapida, `recepcion-creacion-rapida.spec.ts`, Gherkin (DEC-031/032/033) | **1.0** (1 x 3/3) |

- **No-duplicado aplicado**: la rama `VENCIDA -> 403` de `ING-04` se prueba en HU-30 pero el punto del efecto acredita **HU-16** (9.1), ya cobrado; el bloque 4 no lo duplica.
- **Sin puntos propios**: `CONF-01..06`, `DEC-026..033` (login intacto, sede default, sin `foto`, 403 suspendido, etc.) son contrato/regla, no bullets.

Subtotal bloque 4: **10.0** (0 -> 10).

### 9.3 Totales actualizados

| Bloque | Antes (INC-02) | INC-03 | Despues |
|---|---:|---:|---:|
| Identidad, sesiones y permisos | 10 | 0 | 10 |
| Clientes, sedes, estados y ficha basica | 12 | 0 | 12 |
| Vigencias de servicios y congelacion | 8 | **+1** (HU-16 4/4) | **9** |
| Recepcion, ingresos y portal operativo | 0 | **+10** | **10** |
| Resto (bloques 5-8) | 0 | 0 | 0 |
| **Total MVP** | **30** | **+11** | **41/100 (41%)** |

G7 (HU-16 sin efecto en recepcion/portal/acceso) **cerrado**. Riesgos abiertos que tocan este bloque: R-01 (concurrencia de vigencias en Postgres), REV-01 (DUENO sin sede en alta rapida, sin test propio), REV-02 (divergencia de fixtures DUENO-con-sede). Ruta al 50% restante: INC-04 (+2) + INC-05 (+6) = 49, +1 de HU-07/anamnesis (PEND-003) segun DEC-021.
