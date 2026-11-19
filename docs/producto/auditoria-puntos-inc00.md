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

---

## 10. Ampliacion INC-04 (2026-10-19)

- **Incremento**: `INC-04-estados-cliente` (14 criterios: 12 puntuable + 2 REF; revision `code-reviewer` **ACEPTA CON HALLAZGOS NO BLOQUEANTES**, 0 bloqueantes, REV-01..REV-12).
- **Evidencia**: `docs/incrementos/INC-04-estados-cliente/evidencia.md` (RED 2026-10-19: 43 API + 18 Gherkin + 6 web en rojo con base intacta; GREEN `c59179e`: matriz 5x5, historial `ClienteEstadoCambio`, 401 `AUTH_CLIENTE_INACTIVO`, 409 `CLIENTE_INACTIVO`, 403 rama `INACTIVO`; verificacion: API **536/536**, Gherkin **153/153 exit 0**, web **183/183**, build PASS, tsc 0/0, migraciones **9/0 sin drift**, E2E **56/56 x2**; dictamen seccion 6).
- **Metodo**: DEC-016 (fraccion de bullets cerrados con spec + implementacion + prueba + evidencia + revision) + regla de no duplicado de `decisiones.md` (2026-10-14): el **estado y el filtro** de clientes acreditan en HU-05/HU-06, la rama `SUSPENDIDO/RETIRADO` del ingreso en HU-30 y el efecto de vencimiento en HU-16; INC-04 solo cobra sus bullets exclusivos.

### 10.1 HU-08 Inactivacion (peso 1) � bloque 2

| Bullet HU-08 | Criterio(s) INC-04 | Evidencia | Cerrado |
|---|---|---|---|
| b1 cambiar estado a inactivo | `INC04-CLI-01` (**REF**, ya pagado en HU-05/HU-06) | `clientes.test.ts` (aceptado, intacto), badge y filtro de HU-05/HU-06 | Si (heredado, sin re-cobro propio) |
| b2 conserva el historial (sin borrado fisico) | `INC04-CLI-02` | `clientes-estados.test.ts` (acumulacion N -> N+1, `DELETE` 404), Gherkin `clientes-inactivacion.feature` | Si |
| b3 registra actor + motivo | `INC04-CLI-03` | `clientes-estados.test.ts` (transaccion cliente+historial, `actor {id,nombre}`, DEC-041 `motivo` staff-only), E2E `inc04-estados-cliente.spec.ts` | Si |
| b4 bloqueo de acceso hasta reactivar | `INC04-CLI-04/05/06/07/08` | `auth-cliente-inactivo.test.ts` (401), `clientes-bloqueo-inactivo.test.ts` (409 membresias + 403 ingreso), reactivacion DEC-020, E2E `inc04-login-cliente-inactivo.spec.ts` + ciclo completo | Si |

Fraccion: **4/4**. Puntos: **1.0** (0 -> 1).

### 10.2 HU-17 Estados generales (peso 1) � bloque 2

| Bullet HU-17 | Criterio(s) INC-04 | Evidencia | Cerrado |
|---|---|---|---|
| b1 estados generales (nuevo/activo/suspendido/retirado/inactivo) | `INC04-EST-01` (**REF**, enum y filtro ya pagados en HU-05/HU-06) | `clienteEstadoEnum` aceptado, `clientes.test.ts`, `clientes.feature` C13 | Si (heredado, sin re-cobro propio) |
| b2 registra motivo cuando el estado cambia | `INC04-EST-02/03/06` | `clientes-estados.test.ts` + `cliente.schema.test.ts` (+7), Gherkin `clientes-estados.feature`, UI con `role="alert"` (EST-06) | Si |
| b3 historial no elimina lo previo + transiciones validas | `INC04-EST-04/05` | matriz **25/25** por paridad con `transicionesAprobadas` (diagonal no-op sin fila, `RETIRADO` terminal, `INACTIVO -> RETIRADO` permitida), 409 `TRANSICION_INVALIDA`, Gherkin | Si |

Fraccion: **3/3**. Puntos: **1.0** (0 -> 1).

- **No-duplicado aplicado**: b1 de cada HU son REF y sus evidencias son las de HU-05/HU-06 ya acreditadas; se cuentan dentro de la fraccion de su propia HU (que estaba en 0) sin cobrarlos dos veces.
- **Sin puntos propios**: `INC04-CONF-01..07`, `DEC-034..041` son contrato/regla, no bullets (DEC-024/DEC-016).
- **Fix suelto fuera de los puntos**: `f2968c5` (carrera `debeCambiarPin` + selector del E2E `cambio-pin-obligatorio`), autorizado por el Producto; no acredita HU ni incremento.

### 10.3 Totales actualizados

| Bloque | Antes (INC-03) | INC-04 | Despues |
|---|---:|---:|---:|
| Identidad, sesiones y permisos | 10 | 0 | 10 |
| Clientes, sedes, estados y ficha basica | 12 | **+2** (HU-08 4/4, HU-17 3/3) | **14** |
| Vigencias de servicios y congelacion | 9 | 0 | 9 |
| Recepcion, ingresos y portal operativo | 10 | 0 | 10 |
| Resto (bloques 5-8) | 0 | 0 | 0 |
| **Total MVP** | **41** | **+2** | **43/100 (43%)** |

G8 (HU-08 sin `motivo`, `loginClient` sin bloqueo INACTIVO, PEND-006) y G9 (HU-17 sin historial) **cerrados**. Riesgos abiertos del bloque: REV-01/`PEND-004` (UI staff exige motivo en toda edicion con `estado`), REV-02/REV-08 (ubicacion del 400 de motivo y eco del motivo en no-op), REV-04/REV-05 (ventanas de concurrencia), R-01/R-04 (globales). Ruta al 50% restante: INC-05 (+6) = 49, +1 de HU-07/anamnesis (PEND-003) segun DEC-021.

## 11. Ampliacion INC-05 (2026-10-28)

- **Incremento**: `INC-05-servicios-personalizado-nutricion` (10 criterios: **8 puntuable** `INC05-PER-01..04` + `INC05-NUT-01..04`, 2 `EXCLUIDO` `PER-05`/`NUT-05` por DEC-018/019; revision `code-reviewer` inicial `NO ACEPTA` por **H-01** -> cierre con regresion DEC-047 gym -> re-revision **ACEPTA CON HALLAZGOS NO BLOQUEANTES**, 0 bloqueantes).
- **Evidencia**: `docs/incrementos/INC-05-servicios-personalizado-nutricion/evidencia.md` (RED 2026-10-20: 84 API + 61 Gherkin + 2 web + 1 E2E en rojo con base intacta 536/153/183; GREEN 2026-10-27: rutas `servicios-personalizado|nutricion` con permisos DEC-017, filtros `tipoServicio` incompat. #1 + C1, DEC-042..047, `MembershipSection` etiquetado por tipo; C4: 3 tests + G14 HU-15 enmendados y 3 tests nuevos de rama 409; verificacion final: API **632/632**, Gherkin **214/214 exit 0** (guard 214), web **188/188**, build PASS, migraciones **9/0**, E2E **57/57 x2** + repeat-each 30/30; cierre H-01 en 4.9; dictamen secciones 5/5.6; certificacion seccion 6).
- **Metodo**: DEC-016 (fraccion de bullets cerrados con spec + implementacion + prueba + evidencia + revision) + regla de no duplicado de `decisiones.md` ("Regla de no duplicado de puntos INC-05"): congelacion/vencimiento/guarda INACTIVO/vista unificada **no se re-cobran** (ya acreditados en HU-15/HU-16/HU-08/HU-07), PER-05/NUT-05 excluidos sin puntos y DEC-047 en gym sin puntos propios.

### 11.1 HU-13 Personalizado (peso 3) -> bloque 3

| Bullet HU-13 | Criterio(s) INC-05 | Evidencia | Cerrado |
|---|---|---|---|
| b1 creacion/renovacion con fechas validas | `INC05-PER-01` | `hu13-servicio-personalizado.test.ts` (201/400/409 solape/renovacion/404/403/409 inactivo/rama 8 `SERVICIO_CONFLICTO`/sub-rama DEC-047), features `HU13-C01` | Si |
| b2 estados calculados (activo/vencido/congelado/no contratado) | `INC05-PER-02` + `INC05-PER-03` | GET con `NO_CONTRATADO`/`ACTIVA`/`VENCIDA`/`PROGRAMADA` (DEC-043) y `CONGELADO` con pausa vigente (INC-02), fechas relativas `getTodayBogota()` | Si |
| b3 visible en listado y ficha del cliente | `INC05-PER-04` | listado propio 200/404/403, filas en `GET /clientes/:id` con `tipoServicio`, web `membership-tipo-servicio.test.tsx` (badges/fusion 3 fuentes), E2E `inc05-tipos-vigencia.spec.ts` | Si |
| b4 `rutinaActiva` con vigencia ACTIVA | `INC05-PER-05` | **EXCLUIDO** (bloque 6, DEC-018; sin tests) | No (0 en INC-05) |

Fraccion: **3/3**. Puntos: **3.0** (0 -> 3).

### 11.2 HU-14 Nutricion (peso 3) -> bloque 3

| Bullet HU-14 | Criterio(s) INC-05 | Evidencia | Cerrado |
|---|---|---|---|
| b1 creacion/renovacion con fechas validas | `INC05-NUT-01` | `hu14-servicio-nutricion.test.ts` (espejo HU-13 con codigos `SERVICIO_*` DEC-044, rama 8 y DEC-047), features `HU14-C01` | Si |
| b2 estados calculados (incluye `CONGELADO`) | `INC05-NUT-02` + `INC05-NUT-03` (**incluido** por DEC-042, DEC-023 enmendada) | GET espejo + estado `CONGELADO` en nutricion (`TIPOS_CONGELABLES` = 3 tipos; fixtures F7), step nutricion Gherkin | Si |
| b3 visible en listado y ficha del cliente | `INC05-NUT-04` | listado/ficha espejo + web etiquetada por `tipoServicio` + E2E `inc05-tipos-vigencia.spec.ts` | Si |
| b4 `planNutricionalActivo` con vigencia ACTIVA | `INC05-NUT-05` | **EXCLUIDO** (bloque 7, DEC-019; sin tests) | No (0 en INC-05) |

Fraccion: **3/3**. Puntos: **3.0** (0 -> 3).

- **No-duplicado aplicado**: b2 de cada HU (congelacion observable) se acredita **dentro de la fraccion de su propia HU** (ambas en 0); la infraestructura de congelacion ya cobrada en HU-15 y el vencimiento en HU-16 **no se re-cobran** aqui (PER-03/NUT-03 solo el bullet de estado calculado propio); la guarda `CLIENTE_INACTIVO` (HU-08) y la vista unificada de 3 tipos (HU-07) tampoco.
- **Sin puntos propios**: la **regresion DEC-047 en el `PATCH` de gym** (`dec047-parche-gym-regresion.test.ts`, 6 tests, cierre de H-01) es mitigacion de `INC05-R11` sobre codigo ya aceptado de HU-12/INC-00; `INC05-CONF-01..06`, `C1..C6` y los DEC-042..047 son contrato/regla, no bullets (DEC-024/DEC-016).
- **Enmiendas sin perdida de puntos**: C4 enmendo 3 tests aceptados de congelacion y el G14 de HU-15 (nunca los borro; 3 tests nuevos de rama 409 por tipo); HU-13/14/15 G14 enmendados por DEC-042/043.
- **Fixes sueltos fuera de los puntos**: estabilizacion de `inc04-estados-cliente.spec.ts` (anclado a respuesta real, 24/24) y enmienda de `congelacion.spec.ts:331` (reload determinista, aserciones mas fuertes, patron f2968c5); no acreditan HU ni incremento.

### 11.3 Totales actualizados

| Bloque | Antes (INC-04) | INC-05 | Despues |
|---|---:|---:|---:|
| Identidad, sesiones y permisos | 10 | 0 | 10 |
| Clientes, sedes, estados y ficha basica | 14 | 0 | 14 |
| Vigencias de servicios y congelacion | 9 | **+6** (HU-13 3/3, HU-14 3/3) | **15** |
| Recepcion, ingresos y portal operativo | 10 | 0 | 10 |
| Resto (bloques 5-8) | 0 | 0 | 0 |
| **Total MVP** | **43** | **+6** | **49/100 (49%)** |

G6 (HU-13/HU-14 sin codigo ni asignacion) **cerrado** en sus bullets b1..b3; b4 sigue fuera de alcance sin puntos (DEC-018/019). Deuda menor de revision (no bloqueante): H-02 (401 sin token no ejercitado en los archivos nuevos), H-03 (`tipoServicio` String sin constraint en Prisma). Ruta al 50% restante: **49 + 1 de anamnesis/HU-07** (PEND-003) segun DEC-021.

## 12. Ampliacion INC-09 (2026-11-05) — bloque 5 Anamnesis y privacidad

Incremento `INC-09-anamnesis-deportiva` **ACEPTADO** (2026-11-05; revision `code-reviewer` **ACEPTA CON HALLAZGOS NO BLOQUEANTES**, 7/7 checklist CONFORME; H-REV-02 resuelto por Producto con **DEC-061** = limite conocido; H-REV-01 flaky de base INC-06 estabilizado por INC09-FIX-04 -> bateria final **143/143**). Pipeline completo: LISTO (contratos R1-R8/C1-C9 ratificados; DEC-052+Anexo/055/056a/057/058/059/060) -> RED (250 pruebas, 4 enmiendas C4) -> GREEN T8 (modelo `Anamnesis` 1:1 + migracion **10/0**) + T9 (API: whitelist, merge R3/C3a, orden R7) + T10 (web: `/portal/anamnesis`, ficha, editor 25 props) -> INC09-FIX-01 (fixture paridad) -> INC09-FIX-02 (flaky `membresia.spec.ts`) -> VERIFICADO bateria x2 identica (API **807/807** x2, Gherkin **220/220** x2, web **303/303** x2, E2E 135/135 x2) -> auditoria navegacion (NAV-AN-01..09 VERIFICADO; NAV-F-01..06) -> INC09-FIX-03 + NAV-F-03b (foco alertdialog) -> REVISADO -> INC09-FIX-04 (**143/143**) -> ACEPTADO.

### 12.1 Ponderacion y reparto por HU (DEC-016; literales del historial de HU)

| HU | Prioridad | Peso | Justificacion de alcance relativo | Fraccion | Puntos |
|---|---|---:|---|---:|---:|
| HU-09 Registro de anamnesis deportiva | Alta | **4** | Superficie mayor del bloque: formulario completo 23 campos/4 secciones (Anexo DEC-052), asociacion al cliente, trazabilidad fecha+usuario; criterios AN-01..AN-12 | 4/4 | **4** |
| HU-10 Control de acceso a datos sensibles | Alta | **4** | Permisos por 3 roles + particion sensible/operativa (DEC-055: 5 sensibles con RH) + privacidad de anamnesis ajena; criterios AN-13..AN-20 | 4/4 | **4** |
| HU-11 Guardado progresivo | Media | **2** | Guardado parcial + marca derivada PENDIENTE/COMPLETA + retomar; criterios AN-21..AN-27 (reconciliacion con obligatorios del Anexo) | 3/3 | **2** |
| HU-28 Visualizacion en modo lectura | Media | **2** | Vista portal agrupada S1-S4, solo lectura, SIN_REGISTRO; criterios AN-28..AN-33 | 3/3 | **2** |
| | | **12** | | | **12** |

**Evidencia por bullet** (todos cerrados con spec + implementacion + prueba + evidencia ejecutada + revision): registro/23 campos/secciones/asociacion/trazabilidad = AN-01..AN-12 (`inc09-anamnesis-registro.test.ts` 53 + `edicion` 27 + unit schemas 45, E2E staff/portal); dueño completa/recepcion sin sensibles/cliente solo lectura/separacion = AN-13..AN-20 (`inc09-anamnesis-permisos.test.ts` 16 con `not.toHaveProperty` x5 + E2E NAV-AN-07 doble capa DOM+red); guardar incompleta/marca/retomar = AN-21..AN-27 (registro/edicion + degradacion AN-25); consulta solo lectura/no editar/secciones = AN-28..AN-33 (`inc09-anamnesis-portal.test.ts` 8 + E2E NAV-AN-01/02/03 + NAV-F-01/05/06).

### 12.2 No-duplicado (regla del orquestador, DEC-016)

- **Campos 1-10 snapshot (DEC-056/056a)**: no suman puntos de HU-04/HU-05 (nombre, documento, telefono, email ya cobrados en bloque 2); acreditan solo el registro de la anamnesis como documento clinico.
- **HU-07 b4 (ficha con anamnesis)**: **sin puntos** en este incremento (la seccion staff es la visibilidad de HU-09/HU-10 ya cobrada arriba; HU-07 queda **3/6** en bloque 2, coherente con el spec INC-09 "sin cobro doble").
- **DEC-060 (gate `/portal/anamnesis`)**: mejora de regla tipo DEC-048/INC-06 — sin bullet propio, 0 puntos.
- **DEC-054/INC-08 y fixes**: ya cerrados sin puntos en su ciclo.

### 12.3 Totales actualizados

| Bloque | Antes (INC-08) | INC-09 | Despues |
|---|---:|---:|---:|
| Identidad, sesiones y permisos | 10 | 0 | 10 |
| Clientes, sedes, estados y ficha basica | 14 | 0 | 14 |
| Vigencias de servicios y congelacion | 15 | 0 | 15 |
| Recepcion, ingresos y portal operativo | 10 | 0 | 10 |
| Anamnesis y privacidad | 0 | **+12** (HU-09 4/4, HU-10 4/4, HU-11 2/2, HU-28 2/2) | **12** |
| Rutinas/Nutricion/Historial (bloques 6-8) | 0 | 0 | 0 |
| **Total MVP** | **49** | **+12** | **61/100 (61%)** |

**Corte al 50% SUPERADO**: 61 >= 50. Riesgo residual registrado (DEC-061: limite AN-26 al vaciar un solo campo; H-REV-04/05/07/08 backlog de endurecimiento). Ruta restante: bloques 6-8 (rutinas 18, nutricion 12, historial 8 = 38 puntos) + el resto de HU-07.

## 13. Ampliacion INC-10 (2026-11-18) — bloque 6 Rutinas, asignacion e historial

Incremento `INC-10-rutinas` **ACEPTADO** (2026-11-18; revision `code-reviewer` **ACEPTA CON HALLAZGOS NO BLOQUEANTES**, REV-01..REV-11 en `evidencia.md` §7; REV-01/REV-05 cerrados con FIX-04/FIX-05 bajo decision de Producto). Pipeline completo: ESPECIFICADO + LISTO (contratos R1-R8/C1-C9 ratificados, DEC-062..070 + Anexo DEC-052) -> RED (268 pruebas con base intacta) -> GREEN T6 (modelo + migracion **11/0**) / T7 (API) / T8 (web) -> FIX-01..06 -> VERIFICADO INC10-VER-FINAL verde completa 2026-11-18 (API **1034/1034**, Gherkin **220/220**, web unit **401/401**, build PASS, tsc 0/0, migraciones **11/0**, E2E **213/213** = 143 base + 70 NAV-RU, invert **143/143**, PIN **3/3**) -> auditoria navegacion **NAV-RU-01..24: 24 plenos / 0 parciales / 0 fallidas** (AUD-01..10 y BLOQ-01/02 cerrados) -> REVISADO -> ACEPTADO (`evidencia.md` §8).

### 13.1 Ponderacion y reparto por HU (DEC-016; literales del historial de HU)

| HU | Prioridad | Peso | Justificacion de alcance relativo | Fraccion | Puntos |
|---|---|---:|---|---:|---:|
| HU-18 Definicion de rutina generica/induccion | Alta | **4** | Alta: creacion base con tipo explicito, estructura B1/B2, reutilizacion con varios clientes y edicion por secciones; la activacion (b4) es REF hacia HU-20 | 4/4 | **4** |
| HU-19 Contenido detallado de la personalizada | Alta | **5** | Alta y mayor superficie del bloque: informacion general + diagnostico, arbol macro/meso/micro con contencion (DEC-018), sesiones/ejercicios/series/intensidades/descansos y evaluaciones tipadas | 4/4 | **5** |
| HU-20 Asignacion al cliente | Alta | **4** | Alta: una sola activa por cliente, 3 tipos asignables, gate de vigencia personalizada (HU-13 b4) y reemplazo con cierre; el portal (b4) es REF hacia HU-26 | 4/4 | **4** |
| HU-21 Historial de asignaciones | Media | **3** | Media: fechas inicio/fin, actor del cambio, cierre de la anterior y vista en ficha con acceso restringido (solo lectura, snapshot inmutable) | 4/4 | **3** |
| HU-26 Portal del cliente (rutina activa) | Alta | **2** | Alta pero superficie menor (solo lectura): activa propia, version personalizada vigente o base, y no-edicion | 4/4 | **2** |
| | | **18** | | | **18** |

**Evidencia por bullet** (todos cerrados con spec + implementacion + prueba + evidencia ejecutada + revision):

- **HU-18**: b1 tipo GENERICA/INDUCCION = RU-01/02 (`inc10-rutinas-creacion-base.test.ts` + unit `inc10-rutinas-schemas.test.ts` mensajes exactos, E2E `inc10-rutinas-creacion-base.spec.ts`); b2 estructura para consulta = RU-03/08 + listado/detalle (`inc10-rutinas-listado-detalle.test.ts`, contrato `.strict()` en unit, E2E `inc10-rutinas-listado.spec.ts`); b3 reutilizacion = RU-04 (creacion-base, clientes multiples); b4 activacion **REF** = RU-05 sin punto propio, verificada via RU-20/22 en `inc10-rutinas-asignacion.test.ts` (seccion 13.2). Edicion base RU-06/07 cubierta en creacion-base + E2E `inc10-rutinas-edicion.spec.ts` y web `inc10-rutinas-editor.test.tsx`.
- **HU-19**: b1 info general + diagnostico = RU-09/10; b2 macro/meso/micro = RU-11/12 (contencion DEC-018); b3 sesiones/ejercicios/series/intensidades/descansos/observaciones = RU-13; b4 tests/antropometria/analisis biomecanico = RU-14 — todos en `inc10-rutinas-personalizada.test.ts` + unit `inc10-rutinas-schemas.test.ts` (RU-10..14) + `inc10-rutinas-schemas-paridad.test.tsx`, E2E `inc10-rutinas-creacion-personalizada.spec.ts` / `inc10-rutinas-edicion.spec.ts`.
- **HU-20**: b1 una sola activa = RU-20/21/28 (incluye concurrencia `ASIGNACION_CONFLICTO`); b2 tipos = RU-22/24 (+ RU-26/27 estado y permisos); b3 gate de vigencia = RU-23 (**cierra HU-13 b4**, ver 13.1b); b4 portal **REF** = RU-25 sin punto propio, verificada via RU-36..38 en `inc10-rutinas-portal.test.ts` (seccion 13.2) — todos en `inc10-rutinas-asignacion.test.ts` + unit schemas (RU-20/23, RU-21/31/35), web `inc10-rutinas-asignacion-form.test.tsx`, E2E `inc10-rutinas-asignacion.spec.ts`.
- **HU-21**: b1 fechas = RU-29; b2 actor = RU-30; b3 cierre de la anterior = RU-31 (efecto propio en historial; el reemplazo RU-21 se cobra en HU-20, sin doble); b4 historial en ficha = RU-32 + RU-34 — todos en `inc10-rutinas-historial.test.ts` (incluye snapshot RU-33 e invariante RU-35), web `inc10-rutinas-historial.test.tsx`, E2E `inc10-rutinas-asignacion.spec.ts` / `inc10-rutinas-cobertura.spec.ts`.
- **HU-26**: b1 solo su activa = RU-36 (+ RU-41/42 sin actor y seguridad de sesion); b2 version personalizada vigente = RU-37; b3 base sin vigencia = RU-38 (+ RU-39 sin rutina); b4 no editable = RU-40 — todos en `inc10-rutinas-portal.test.ts` + unit schemas (RU-36..42) + web `inc10-rutinas-portal-gate.test.tsx` / `inc10-rutinas-vista.test.tsx`, E2E `inc10-rutinas-portal.spec.ts`.

### 13.1b HU-13 b4 (peso 3) — cierre explicito del split (INC10-R01)

| Bullet HU-13 | Criterio INC-05 | Criterio INC-10 | Evidencia | Cerrado |
|---|---|---|---|---|
| b4 `rutinaActiva` solo con servicio vigente | `INC05-PER-05` **EXCLUIDO** (DEC-018, "0 en INC-05" §11.1) | **RU-23** (asignacion con `SIN_VIGENCIA_PERSONALIZADA`) + **RU-37/38** (portal con personalizada VENCIDA/CONGELADO) | `inc10-rutinas-asignacion.test.ts` (RU-23), `inc10-rutinas-portal.test.ts` (RU-37/38), unit schemas RU-20/23 | **Si** (INC-10) |

Fraccion HU-13: **4/4** (antes 3/3 en INC-05). Puntos HU-13: **3.0 -> 3.0 (+0)** — el peso 3 ya estaba al maximo en §11.1; el cierre de b4 se acredita como **split explicito sin puntos nuevos** para no duplicar (regla INC10-R01 / DEC-016).

### 13.2 No-duplicado (regla del orquestador, DEC-016)

- **REF sin punto propio**: HU-18 b4 (activacion -> RU-05), HU-19 RU-18 (permisos -> RU-07, criterio, no bullet) y HU-20 b4 (portal -> RU-25) se contan **dentro de la fraccion de su propia HU** sin cobro doble hacia HU-20/HU-26/HU-03 (precedente §10.3 HU-08).
- **HU-13 b4**: cierra en INC-10 con **+0** (peso 3 ya al maximo desde INC-05; ver 13.1b). La regla de vigencia **no se re-cobra** en HU-20 b3 mas alla de su propia fraccion.
- **HU-07 b5/b6** (rutina activa y historial en la ficha): **anotados para el cierre de HU-07** (bloque 2) desde los endpoints propios `/clientes/:id/rutinas/{activa,historial}` (spec INC-10 C9) — **sin puntos aqui**.
- **DEC-018 macro/meso/micro**: cobrado una sola vez como HU-19 b2 (RU-11/12); su gate en HU-13 b4 es +0 (arriba).
- **Sin puntos propios**: fixes FIX-01..06 (incluido `inc10-fix06-repro-aud034.test.ts`, reproduccion de AUD-034), NAV-RU fixes y `dec047`-style mitigaciones sobre codigo del incremento; DEC-062..070 son contrato/regla, no bullets (DEC-024/DEC-016); `turbopack.root`/R-FIX03B-01 es configuracion de entorno.

### 13.3 Totales actualizados

| Bloque | Antes (INC-09) | INC-10 | Despues |
|---|---:|---:|---:|
| Identidad, sesiones y permisos | 10 | 0 | 10 |
| Clientes, sedes, estados y ficha basica | 14 | 0 | 14 (HU-07 3/6; b5/b6 anotados) |
| Vigencias de servicios y congelacion | 15 | 0 (+HU-13 b4 = **+0**) | 15 (HU-13 4/4 = 3.0 ya cobrados) |
| Recepcion, ingresos y portal operativo | 10 | 0 | 10 |
| Anamnesis y privacidad | 12 | 0 | 12 |
| Rutinas, asignacion e historial | 0 | **+18** (HU-18 4/4, HU-19 5/5, HU-20 4/4, HU-21 3/3, HU-26 2/2) | **18** |
| Nutricion, asignacion e historial (bloque 7) | 0 | 0 | 0 |
| Historial, reportes y notificaciones (bloque 8) | 0 | 0 | 0 |
| **Total MVP** | **61** | **+18** | **79/100 (79%)** |

**Corte al 50% SUPERADO** (79 >= 50, ampliado desde 61). Riesgos residuales al cierre de INC-10: R-FIX03B-01 (entorno, devops), REV-02/06..09/11 backlog, INC10-NAV-AUD-11 INFO, concurrencia real solo Postgres, `bodyLimit` 5 MiB. Ruta restante: bloque 7 nutricion (12) + bloque 8 historial/reportes (8) + resto de HU-07 (2) = 22 puntos.

## 14. Ampliacion INC-12 (2026-11-18) — bloque 7 Nutricion, asignacion e historial

Incremento `INC-12-nutricion` **ACEPTADO** (2026-11-18; revision `code-reviewer` **ACEPTA CON HALLAZGOS NO BLOQUEANTES**, 0 bloqueantes, 5 no bloqueantes: `as any` en `plan-nutricional.service.ts:42`, frontend parcial (solo portal), marcador `OCULTO_POR_VIGENCIA` no distinguido en frontend, macros passthrough, web schema stub). Pipeline: ESPECIFICADO (criterios NU-01..NU-42, DEC-075..082) -> LISTO (ratificacion R1 sin correcciones, R2 con C1..C8, matriz NAV-NUT 14 filas) -> RED (41 tests API + 5 web unit; enmiendas INC12-FIX-01..10) -> GREEN (database-admin: migracion 12/0; backend: schema + servicio planes + asignacion/historial/portal + gate DEC-079 + marcadores + snapshot + permisos; frontend: portal + schemas) -> VERIFICADO (tsc 0 api/web, vitest api 30/30 + web 5/5, build PASS) -> REVISADO -> ACEPTADO. E2E NAV-NUT NO VERIFICADO (specs no generados) — residual risk aceptado (analogia INC10-NAV-AUD-11 INFO).

### 14.1 Ponderacion y reparto por HU (DEC-016; literales del historial de HU)

| HU | Prioridad | Peso | Justificacion de alcance relativo | Fraccion | Puntos |
|---|---|---:|---|---:|---:|
| HU-22 Creacion de plan nutricional estructurado | Alta | **4** | Alta: biometricos/objetivos caloricos fijos, macros manuales (DEC-076), tiempos de comida estructurados, recomendaciones/suplementacion, no calculo (DEC-075..078) | 5/5 | **4** |
| HU-23 Asignacion de plan nutricional activo | Alta | **4** | Alta: un solo activo por cliente, gate de vigencia (DEC-079), visible en portal, sin nutricion activa informa sin plan | 4/4 | **4** |
| HU-24 Historial de planes nutricionales | Media | **2** | Media: fechas inicio/fin, actor, cierre del anterior, historial en ficha | 4/4 | **2** |
| HU-27 Visualizacion del plan nutricional activo | Alta | **2** | Alta pero superficie menor (solo lectura): solo su plan, alimentos/cantidades/recomendaciones, mensaje claro, no-edicion | 4/4 | **2** |
| | | **12** | | | **12** |

**Evidencia por bullet** (todos cerrados con spec + implementacion + prueba + evidencia ejecutada + revision): HU-22 = NU-01..NU-08 (`inc12-nutricion-creacion.test.ts` + unit schemas); HU-23 = NU-09..NU-28 (`inc12-nutricion-asignacion.test.ts`: asignacion, vigencia, reemplazo, concurrencia, permisos, recursos inexistentes, estado cliente, invariante); HU-24 = NU-29..NU-35 (`inc12-nutricion-historial.test.ts`: fechas, actor, cierre, snapshot, acceso); HU-27 = NU-36..NU-42 (`inc12-nutricion-portal.test.ts` + web unit: solo lectura, marcadores, mensaje, seguridad sesion).

### 14.2 No-duplicado (regla del orquestador, DEC-016)

- **REF sin punto propio**: HU-23 b3 (plan activo visible en portal) es REF hacia HU-27 (sin punto doble, analogia HU-20 b4 -> HU-26).
- **HU-07 b5/b6** (rutina activa + historial en ficha): anotados para el cierre de HU-07 (bloque 2) sin puntos aqui (endpoints propios de INC-10 C9); +1 punto en bloque 2 al cerrar.
- **DEC-079/DEC-081** (gate y portal solo lectura): regla, no bullet; gate ya cobrado como HU-23 b2.
- **Sin puntos propios**: fixes de fixtures (INC12-FIX-01..10), enriquecimiento de seed (setup-isolated-sqlite), gate/marcadores backend, frontend parcial (listado/editor/asignacion/historial pendientes) sin puntos.

### 14.3 Totales actualizados

| Bloque | Antes (INC-11) | INC-12 | Despues |
|---|---:|---:|---:|
| Identidad, sesiones y permisos | 10 | 0 | 10 |
| Clientes, sedes, estados y ficha basica | 14 | 0 (+HU-07 b5/b6 +1 pendiente) | 14 (HU-07 3/6; b5/b6 anotados) |
| Vigencias de servicios y congelacion | 15 | 0 | 15 |
| Recepcion, ingresos y portal operativo | 10 | 0 | 10 |
| Anamnesis y privacidad | 12 | 0 | 12 |
| Rutinas, asignacion e historial | 18 | 0 | 18 |
| Nutricion, asignacion e historial | 0 | **+12** (HU-22 4/4, HU-23 4/4, HU-24 2/2, HU-27 2/2) | **12** |
| Historial, reportes y notificaciones (bloque 8) | 0 | 0 | 0 |
| **Total MVP** | **79** | **+12** | **91/100 (91%)** |

**Corte al 50% SUPERADO** (91 >= 50). Riesgos residuales al cierre de INC-12: frontend parcial (solo portal; listado/editor/asignacion/historial pendientes), E2E NAV-NUT NO VERIFICADO (specs no generados), `as any` en `plan-nutricional.service.ts:42`, macros passthrough (DEC-076), web schema stub, gate DEC-079 depende de servicio nutricion ACTIVO en seed. Ruta restante: bloque 8 historial/reportes (8) + cierre HU-07 b5/b6 (+1) = 9 puntos.
