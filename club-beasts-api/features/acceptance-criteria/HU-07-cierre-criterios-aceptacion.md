# Criterios de Aceptación - HU-07 (cierre saldo b4/b5/b6) - INC-13 bloque 8

- Origen: `historias-usuario-gimnasio.md` §4.2 HU-07 (líneas 126-141); saldo de bullets **b4** (línea 139), **b5** (línea 140) y **b6** (línea 141).
- Incremento: `docs/incrementos/INC-13-bloque8-historial-reportes-notificaciones/spec.md` (PROPUESTO), punto restante de HU-07.
- **Estado inicial de todos los criterios de este documento: `NO VERIFICADO`** (sin evidencia ejecutada; verificación = test + evidencia + revisión, DEC-016).
- Decisiones que rigen: DEC-065/DEC-080 (permisos staff), DEC-041 (nunca `actor` en portal), DEC-067 (snapshot al asignar rutina), DEC-079/081/082 (plan nutricional), DEC-083 (historial agregador), DEC-088 (permisos de historial/conteos), fuente única `resolverEstadoAcceso`/`calcularEstado` (America/Bogota, extremos inclusivos), INC-10 C9 (endpoints propios de rutina), INC-12 (planes).
- Preservación WR-01..06: este cierre es **aditivo**; no degrada INC-10, INC-12 ni HU-32 (ver `H7-07`).
- Archivos herederos **no modificados** por este documento: `HU-07-criterios-aceptacion.md`, `HU-07-schemas.ts` (originales), `HU-32/33/34-criterios-aceptacion.md` y `HU-32/33/34-schemas.ts` (ya existentes, ver "Gaps documentales").

## Resumen

Cierra la vista unificada del cliente en los 3 bullets que faltan: **b4** vigencias de membresía (GYM, PERSONALIZADO, NUTRICION) con estado calculado por la fuente única; **b5** rutina activa y plan nutricional activo desde los endpoints propios; **b6** notas internas (campo `observaciones`) y historial básico. No crea lógica nueva ni re-cobra puntos ya acreditados a INC-10 (b5 rutina), INC-12 (plan), INC-13/HU-32 (historial) ni a los incrementos de vigencias (ver `PEND-07`).

## Mapa de bullets -> IDs

| Bullet de la HU | ID criterio | Nota |
|---|---|---|
| b4 - vigencias de membresía (gym, personalizado, nutrición) | `H7-01` | estado = fuente única; sin puntos de INC-01/03/05 |
| b5 - rutina activa | `H7-02` | sección propia INC-10 C9; sin puntos de INC-10 |
| b5 - plan nutricional activo | `H7-03` | sección propia INC-12; marcadores SIN_PLAN/OCULTO_POR_VIGENCIA (DEC-079/082) |
| b6 - notas internas | `H7-04` | campo `observaciones`; ver `PEND-08` (visibilidad) |
| b6 - historial básico | `H7-05` | reutiliza HU-32 (`GET /clientes/:id/historial`); sin puntos de HU-32 |
| (transversal) permisos por rol | `H7-06` | DEC-065/080/088 |
| (transversal) preservación y regresión | `H7-07` | WR-01..06: base API 1034 / Gherkin 220 / web 401 / E2E 213 sin nuevos fallos |

## Criterios detallados (estado: NO VERIFICADO)

### H7-01 — Vigencias de membresía en la ficha (b4)
- **Condición previa**: cliente con vigencias de hasta 3 tipos (`GYM`, `PERSONALIZADO`, `NUTRICION`); fixtures con estados variados (PROGRAMADA, ACTIVA, VENCIDA, CONGELADO).
- **Disparo**: `GET /clientes/:id` + montaje de la sección de membresías en `/clientes/[id]`.
- **Resultado observable**: cada vigencia presente se lista con `tipoServicio`, `fechaInicio`, `fechaFin` y `estado` calculado por `resolverEstadoAcceso(...)` al corte `getTodayBogota()`; el estado **no** contradice al listado (regla VEN-05); con los 3 tipos presentes se muestran las 3; sin vigencias, sección vacía sin error.
- **NO cubre**: creación/pausa de vigencias (HU-12/HU-15, INC-01/03/05) — sin puntos propios.

### H7-02 — Rutina activa en la ficha (b5)
- **Condición previa**: cliente con y sin rutina asignada (INC-10).
- **Disparo**: montaje de la sección de rutina en `/clientes/[id]` (endpoint propio `/clientes/:id/rutinas/activa`).
- **Resultado observable**: con rutina vigente se muestra nombre/datos de la rutina activa; sin rutina se muestra estado vacío/mensaje sin error y sin romper el resto de la ficha.
- **NO cubre**: creación/edición/asignación de rutinas (INC-10) — sin puntos propios.

### H7-03 — Plan nutricional activo en la ficha (b5)
- **Condición previa**: cliente con plan activo, sin plan, y con plan cuya vigencia de servicio nutrición venció (DEC-079).
- **Disparo**: montaje de la sección de plan nutricional en `/clientes/[id]`.
- **Resultado observable**: con plan vigente se muestra el plan activo; sin plan → `SIN_PLAN` ("No tienes un plan nutricional activo"); con vigencia vencida → `OCULTO_POR_VIGENCIA` sin borrar la asignación (patrón INC05-PER-05); el 409 `SIN_VIGENCIA_NUTRICION` sigue emitiéndose al asignar (regresión INC-12).
- **NO cubre**: creación/asignación de planes (INC-12) — sin puntos propios.

### H7-04 — Notas internas en la ficha (b6)
- **Condición previa**: cliente con y sin `observaciones`; tokens de los 3 roles.
- **Disparo**: modo lectura/edición en `/clientes/[id]`; `PATCH /clientes/:id`.
- **Resultado observable**: en modo lectura se muestra el texto o `-` si está vacío; en modo edición (solo `DUENO`/`RECEPCIONISTA`, `canEdit`) el textarea permite escribir y **Guardar** persiste vía PATCH (200); **Cancelar** (page.tsx:216) vuelve a lectura descartando el cambio; `observaciones` vacío → `null`; >500 caracteres → 400 `VALIDATION_ERROR` ("Observaciones no pueden exceder 500 caracteres").
- **Pendiente de producto**: visibilidad para rol `CLIENTE` → `PEND-08`.

### H7-05 — Historial básico en la ficha y en el portal (b6)
- **Condición previa**: cliente con entradas de rutina, plan nutricional e ingreso (HU-32/DEC-083).
- **Disparo**: sección de historial en `/clientes/[id]` (staff) y `/portal/historial` (CLIENTE); `GET /clientes/:id/historial?tipo=&limit=&offset=`.
- **Resultado observable**: la vista lista entradas con `tipo`, `fecha` (America/Bogota) y `actor` (solo staff); el filtro por tipo restringe la lista; el CLIENTE ve **solo** el suyo y **nunca** `actor` (DEC-041); sin entradas → lista vacía sin error.
- **NO cubre**: el consolidado HU-32 (criterios `HU32-C01..C06`); aquí solo se exige su presencia y uso correcto en la ficha.

### H7-06 — Permisos transversales de la ficha (b6/transversal)
- **Condición previa**: tokens DUENO, RECEPCIONISTA, CLIENTE (propio/ajeno), sin token, rol desconocido.
- **Disparo**: `GET /clientes/:id`, `PATCH /clientes/:id`, UI `/clientes/[id]`.
- **Resultado observable**: DUENO/RECEPCIONISTA → 200 con secciones staff y edición habilitada; CLIENTE propio → 200; CLIENTE ajeno → 403 `AUTH_FORBIDDEN`; rol no permitido → 403; sin token → 401; `PATCH` con CLIENTE → 403 (preHandler de roles); en la UI, el CLIENTE nunca ve los controles de edición (`canEdit`).

### H7-07 — Preservación y regresión (WR-01..06)
- **Condición previa**: base de INC-13-bloque8: API 1034/1034, Gherkin 220/220 (guard), web 401/401, E2E 213/213, tsc 0, build PASS, migraciones 11/0 (re-medir al arranque del RED).
- **Disparo**: ejecutar la batería antes y después de los cambios del incremento.
- **Resultado observable**: 0 fallos nuevos; los fallos previos se distinguen de los nuevos sin ocultar ninguno; los endpoints y secciones de INC-10/INC-12/HU-32 siguen operativos; no se eliminan ni debilitan tests.

## Partición de Equivalencia

| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| rol (ficha) | DUENO, RECEPCIONISTA, CLIENTE propio | token DUENO | CLIENTE ajeno, rol desconocido, sin token | CLIENTE con id de otro |
| vigencia tipo | GYM, PERSONALIZADO, NUTRICION | `tipoServicio: "NUTRICION"` | tipo fuera del enum | `tipoServicio: "PILATES"` |
| estado vigencia | PROGRAMADA, ACTIVA, VENCIDA, CONGELADO, SIN_VIGENCIA | fechaFin = hoy → ACTIVA | (n/a: es derivado, no entrada) | — |
| rutina | con asignación vigente, sin asignación | cliente con rutina | id de rutina inexistente | id fantasma → 404 |
| plan nutricional | con plan vigente, sin plan, plan oculto por vigencia | SIN_PLAN | asignar sin servicio nutrición ACTIVO → 409 | 409 SIN_VIGENCIA_NUTRICION |
| observaciones | texto 1..500, vacío (→ null) | "Refuerzo lumbares" | >500 caracteres | 501 chars → 400 |
| historial tipo | RUTINA, PLAN_NUTRICIONAL, INGRESO, omitido (todos) | `?tipo=INGRESO` | valor fuera del enum | `?tipo=X` → 400 |

## Análisis de Valores Límite

| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| observaciones (length) | string/null | 0 (vacío → null, válido) | 500 | N/A (vacío permitido, justificado) | 501 → 400 |
| `limit` (historial) | int | 1 | 100 | 0 → 400 | 101 → 400 |
| `offset` (historial) | int | 0 | — | -1 → 400 | — |
| `id` params (ficha) | string | 1 | 36 | vacío → 400 | 37 → 400 |
| fechaFin vs corte (estado) | date | — | — | hoy-1 día → VENCIDA (extremo inclusivo: hoy = ACTIVA) | fechaInicio = hoy+1 → PROGRAMADA |
| tipos de vigencia en ficha | enum | 1 presente (vacío válido) | 3 | 0 → sección vacía sin error | 4 tipos → inexistente en modelo |

Los cortes de fecha son **heredados** de la fuente única (regresión INC-01/03/05); aquí solo se exige consistencia en `H7-01`, sin puntos propios.

## Tabla de Decisiones

### DT-1: Acceso a la ficha `GET /clientes/:id`
| Token | Rol | id = propio | Acción | Resultado |
|-------|-----|-------------|--------|-----------|
| ausente/inválido | — | — | GET | 401 |
| válido | DUENO | cualquiera existente | GET | 200 ficha con secciones b4/b5/b6 |
| válido | RECEPCIONISTA | cualquiera existente | GET | 200 ficha con secciones b4/b5/b6 |
| válido | CLIENTE | sí | GET | 200 (datos propios) |
| válido | CLIENTE | no | GET | 403 `AUTH_FORBIDDEN` |
| válido | otro rol | cualquiera | GET | 403 `AUTH_FORBIDDEN` |
| válido | DUENO/REC | inexistente | GET | 404 Cliente no encontrado |

### DT-2: Edición de notas internas (`observaciones`)
| Rol | Modo UI | Acción | Resultado |
|-----|---------|--------|-----------|
| DUENO | lectura | ver | muestra texto o `-` |
| DUENO/RECEPCIONISTA | edición | escribir + Guardar | PATCH 200; texto persiste tras recarga |
| DUENO/RECEPCIONISTA | edición | Cancelar | vuelve a lectura; el cambio NO persiste |
| CLIENTE | sin controles | intentar PATCH | 403 |
| cualquiera | edición | 501 caracteres | 400 `VALIDATION_ERROR` |

### DT-3: Historial en ficha/portal
| Rol | Entrada | `actor` visible | Resultado |
|-----|---------|-----------------|-----------|
| DUENO | ficha cliente | sí | lista con fechas + actor |
| RECEPCIONISTA | ficha cliente | sí | lista con fechas + actor (solo lectura) |
| CLIENTE | `/portal/historial` (id propio, login PIN) | no (DEC-041) | lista propia sin actor |
| CLIENTE | ficha/URL de otro cliente | — | 403 sin datos |

## Transiciones de Estado

### Ficha (modo de edición)
```
[LECTURA] --editar (canEdit)--> [EDICION]
[EDICION] --Guardar OK--> [LECTURA]   (PATCH 200, datos nuevos visibles)
[EDICION] --Cancelar--> [LECTURA]     (cambios descartados)
[LECTURA/EDICION] --session_expired--> [LOGIN]  (salida con mensaje, sin bucle)
[LECTURA] --logout--> [LOGIN]
```

### Vigencia (heredada, fuente única — consistencia exigida en H7-01, sin puntos propios)
```
[PROGRAMADA] --fechaInicio <= hoy--> [ACTIVA]
[ACTIVA] --fechaFin < hoy (corte Bogota)--> [VENCIDA]
[ACTIVA] --pausa/congelacion--> [CONGELADO] --> [ACTIVA]
[...] --sin vigencia--> [SIN_VIGENCIA]
Transiciones inválidas: reactivar SIN_VIGENCIA sin nueva vigencia (409, regresión INC-03).
```

## Cobertura de Ramas

### Ruta: GET /clientes/:id
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path | id existente + token staff | 200 ficha con vigencias, rutina, plan, observaciones, historial |
| 2 | Sin token | — | 401 |
| 3 | CLIENTE ajeno | id de otro cliente | 403 `AUTH_FORBIDDEN` |
| 4 | Rol no permitido | rol desconocido | 403 |
| 5 | Cliente inexistente | id inexistente + staff | 404 |
| 6 | Id inválido | id >36 chars / vacío | 400 `VALIDATION_ERROR` |
| 7 | Sin membresías | cliente sin vigencias | 200, sección vacía sin error |
| 8 | Sin rutina | cliente sin rutina | 200, estado vacío sin error |
| 9 | Sin plan nutricional | cliente sin plan | 200, `SIN_PLAN` |
| 10 | Sesión expirada (carga) | token expirado | salida a login con mensaje (page.tsx:82-89) |

### UI: /clientes/[id] (edición de observaciones)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Guardar OK | texto ≤500 + token staff | PATCH 200, texto visible en lectura y tras recarga |
| 2 | Cancelar | escribir y cancelar | lectura con valor anterior |
| 3 | Guardado con sesión expirada | token expirado al guardar | salida a login con mensaje (page.tsx:119-124) |
| 4 | Exceso de longitud | 501 caracteres | 400, mensaje en español, sin persistir |
| 5 | CLIENTE | sin `canEdit` | sin controles de edición; PATCH propio → 403 |

## Matriz de navegación NAV-BL8 (cierre HU-07) — estado NO VERIFICADO

| ID | Pantalla/estado | Rol | Entrada | Salida esperada | Prueba | Resultado |
|---|---|---|---|---|---|---|
| NAV-BL8-01 | Ficha `/clientes/[id]` (b4/b5/b6) | DUENO/RECEPCIONISTA | lista de clientes → clic en cliente | detalle con vigencias, rutina, plan, observaciones e historial | E2E | NO VERIFICADO |
| NAV-BL8-02 | Volver desde la ficha | DUENO/RECEPCIONISTA | botón volver / atrás del navegador | lista de clientes; sin bucle | E2E | NO VERIFICADO |
| NAV-BL8-03 | Inicio tras salir de la ficha | DUENO | logo/inicio | dashboard según rol | E2E | NO VERIFICADO |
| NAV-BL8-04 | Cancelar edición | DUENO/RECEPCIONISTA | `Cancelar` (page.tsx:216) | modo lectura con valores previos | E2E | NO VERIFICADO |
| NAV-BL8-05 | Logout desde la ficha | DUENO/RECEPCIONISTA | logout en navbar | pantalla de login; re-login no reutiliza sesión previa | E2E | NO VERIFICADO |
| NAV-BL8-06 | URL directa / recarga (F5) / atras en la ficha | DUENO/RECEPCIONISTA | pegar URL, F5, back | sesión conservada, destino correcto, sin bucles ni enlaces rotos | E2E | NO VERIFICADO |
| NAV-BL8-07 | Móvil / desktop / teclado en la ficha | DUENO/RECEPCIONISTA | viewport 375px y 1280px; navegación con Tab/Enter | secciones apiladas en móvil, foco visible, operable por teclado | E2E | NO VERIFICADO |
| NAV-BL8-08 | Sesión expirada en la ficha (carga o guardado) | todos | token expirado | salida a login con mensaje, sin bucle ni datos a medio mostrar | E2E | NO VERIFICADO |
| NAV-BL8-09 | Portal CLIENTE: login con **PIN obligatorio** → `/portal/historial` | CLIENTE | login-cliente (cédula + PIN) | historial propio sin `actor`; sin PIN → 401/403, sin avance | E2E + integración | NO VERIFICADO |
| NAV-BL8-10 | URL directa a ficha ajena desde portal | CLIENTE | pegar URL de otro cliente | 403 sin datos, sin fuga | integración | NO VERIFICADO |
| NAV-BL8-11 | Recorrido de enlaces y bucles | todos | dashboard → clientes → ficha → volver; portal → historial → portal | todos los destinos existen, sin bucles ni 404 | E2E | NO VERIFICADO |

### No aplicables (justificados)
- **PIN en pantallas staff**: el PIN es la credencial de login del CLIENTE (`auth.service.loginClient`); el staff usa JWT → no aplica (fila NAV-BL8-09 lo cubre donde sí aplica).
- **Reportes / notificaciones**: cubiertos por `NAV-HIS-01..09` del incremento `INC-13-historial-reportes` (ACEPTADO); no se duplican filas aquí.
- **Máquinas de estado de vigencia/ingreso**: heredadas de INC-01/03/05 con sus propias matrices; en este cierre solo se exige consistencia de lectura (`H7-01`).

## Reglas de Validación por Campo

| Campo | Tipo | Requerido | Regex/Regla | Longitud | Valores Permitidos |
|-------|------|-----------|-------------|----------|-------------------|
| id (params) | string | sí | — | 1-36 | id de Cliente |
| observaciones | string \| null | no | vacío → null | 0-500 | texto libre |
| membresias[].tipoServicio | enum | sí | — | — | GYM, PERSONALIZADO, NUTRICION |
| membresias[].estado | enum derivado | sí | fuente única | — | PROGRAMADA, ACTIVA, VENCIDA, CONGELADO, SIN_VIGENCIA |
| historial tipo (query) | enum | no | — | — | RUTINA, PLAN_NUTRICIONAL, INGRESO (omitido = todos) |
| historial limit/offset | int | no | — | 1-100 / ≥0 | — |

## PENDs 1-8 (formulados por este documento)

> Los PENDs 1-6 corresponden al alcance HU-32/33/34; sus documentos existentes **no se modifican** por contrato y se listan aquí para trazabilidad. Los PENDs 7-8 pertenecen a este saldo HU-07. Recomendación por defecto: **opción (a)**.

| # | Tema | Recomendación (a) | Alternativas | Estado | Responsable |
|---|------|-------------------|--------------|--------|-------------|
| 1 | Canal/proveedor de correo | Ratificar **DEC-086** (ya aprobada): `EMAIL_PROVIDER=stub\|smtp\|resend` por env; stub en dev/test registra en log/BD sin red | (b) proveedor fijo único; (c) solo log sin envío nunca | **RESUELTO por DEC-086** | Producto (ratificado) |
| 2 | Disparador vs precedente "sin jobs" (DEC-066) | Ratificar **DEC-085** (ya aprobada): envío **on-demand** `POST /notificaciones/vencimiento/enviar` por DUENO, sin cron/jobs | (b) cron diario (rompe DEC-066); (c) disparo manual en login de recepción | **RESUELTO por DEC-085** | Producto (ratificado) |
| 3 | Destinatarios y días antes | Destinatario = **email del cliente**; sin email → `omitidos` sin error; una sola ventana `DIAS_ANTES` con N configurable en request (default 3, 1..30) más `DIA_VENCIMIENTO` | (b) N fijo global por env `NOTIFY_DAYS_BEFORE`; (c) múltiples avisos (7/3/1) con dedup por cada N | **ABIERTO** (parcial en `HU34-C01`; sin DEC) | Producto |
| 4 | Anti-duplicados + reintentos | Ratificar **DEC-087** (dedup por `(clienteId, servicioId, fechaVencimiento, tipoAviso)`) **y** persistir el registro **solo en envío exitoso** (o con estado que permita reintento), para que un fallo no condena la clave | (b) dedup estricto desde el primer intento (sin reintento); (c) reintento ilimitado sin registro | Dedup **RESUELTO por DEC-087**; reintento **ABIERTO** | Producto + backend |
| 5 | Alcance de conteos (corte, sede, TZ) | Ratificar **DEC-084** y definir: estados con fuente única `calcularEstado` a corte `getTodayBogota()` (America/Bogota); **sede = sede principal del cliente**; `fecha` query default hoy; `ingresosHoy` = ingresos de esa sede y fecha | (b) sede de la vigencia (hoy `MembresiaGym` sin `sedeId`, requiere modelo nuevo); (c) conteos globales sin sede | Endpoint **RESUELTO por DEC-084**; detalle de alcance **ABIERTO** | Producto + backend |
| 6 | Fuentes y orden del historial | Ratificar **DEC-083**: fuentes = asignaciones de rutina (snapshot DEC-067), asignaciones de plan (INC-12) e ingresos (INC-03); orden fecha desc, **desempate `createdAt` desc**; paginación `limit`/offset server-side (hoy en memoria, backlog) | (b) solo fechas de cambio sin snapshot; (c) sumar anamnesis/estados (fuera de alcance) | **RESUELTO por DEC-083**; tie-break/paginación **ABIERTO (menor)** | Producto + backend |
| 7 | Reparto de puntos HU-07 b4/b5/b6 sin doble cobro | Reconocer que la **sección 15 de `auditoria-puntos-inc00.md` ya acreditó** +8 (HU-32/33/34) +1 (HU-07 b5/b6) = 100/100: el incremento `INC-13-bloque8-...` (PROPUESTO, +9) sería **doble cobro** → pasar a **0 puntos nuevos** (solo verificación/cierre documental), o acreditar **únicamente la fracción b4** si la revisión la encuentra sin cerrar, con método DEC-016 y REF sin punto para INC-10/INC-12/HU-32; actualizar `mvp.md` (fila bloque 8 aún "Pendiente", fila bloque 2 aún "HU-07 3/6") | (b) revertir §15 y mantener +9 del bloque8 (requiere aprobación explícita old/new, WR-01..06); (c) no abrir incremento (duplicado) | **ABIERTO (bloqueante para el gate)** | Producto + Orquestador |
| 8 | Notas internas: modelo y visibilidad | Adoptar `observaciones: string\|null` (máx 500) como "notas internas" del bullet b6; **visibilidad solo staff**: excluir/mask del payload para rol CLIENTE en `GET /clientes/:id` y no mostrarlo en portal; alinear `HU-07-schemas.ts` (declara `notasInternas[]` e `historial[]` embebidos que la API no devuelve) por el orquestador | (b) modelo `notasInternas[]` con timestamps + endpoint propio (migración); (c) visibilidad total para el cliente propio | **ABIERTO (permisos/datos — bloqueante para el gate)** | Producto |

## Gaps documentales y de código (informativo; lectura estática, sin ejecución)

1. `HU-07-schemas.ts` (existente, no modificado) declara `notasInternas: [{id, contenido, createdAt}]` e `historial: [...]` embebidos en la ficha; la API entregada devuelve `observaciones: string|null` y el historial vive en `GET /clientes/:id/historial` (DEC-083). Corrección documental a cargo del orquestador (`PEND-08`).
2. `GET /clientes/:id` permite a `CLIENTE` leer su propia ficha con `observaciones` incluido (`selectFichaCliente` → `selectCliente.observaciones: true`, `routes/clientes.ts:118-137`): posible fuga de notas internas → `PEND-08` (decisión de permisos/datos).
3. `HistorialCliente.tsx` filtra el tipo **en memoria** sobre la página por defecto (20 items, sin `?tipo=&limit=&offset=`): con >20 entradas el filtro no garantiza cobertura total (residual de paginación ya registrado en INC-13; no bloquea este documento).
4. `HistorialCliente.tsx` usa `i.id` como key pero `historialItemSchema` (HU-32) no declara `id`: riesgo de keys undefined (backlog menor).
5. `docs/producto/mvp.md`: fila bloque 8 = "Pendiente" (línea 46) y fila bloque 2 = "HU-07 3/6" (línea 40) contrastan con Total 100/100 y con la sección 15 de la auditoría → `PEND-07` (actualización de orquestador/producto, fuera de este documento).
