# Criterios de Aceptación - HU-25: Visualización de información general del cliente (portal)

- Origen: `historias-usuario-gimnasio.md` §4.7 HU-25 (líneas 407-420).
- Incremento: INC-03 (`docs/producto/avance.md:127`).
- Paquete G14: 2026-10-08. Pendiente de spec en `docs/incrementos/INC-03/spec.md`.
- Estado de este documento: borrador de especificación (no cuenta puntos hasta spec + implementación + prueba + evidencia + revisión, DEC-016).

## Resumen

El portal del cliente (`club-beasts-web/src/app/portal/page.tsx`) debe mostrar información real del cliente autenticado: nombre, cédula, sede principal, estado de acceso al gym, fecha de vencimiento de la membresía y, si aplica, el rango de congelación. Hoy el portal solo pinta el nombre de la sesión y un estado `"Activo"` hardcodeado (`portal/page.tsx:122`).

**Nota de rutas**: el backend no registra prefijo `/api` (`club-beasts-api/src/index.ts:23-25`); las rutas se llaman como `${API_URL}/portal/resumen` (`club-beasts-web/src/lib/api.ts:4,69`). El prefijo `/api` solo aplica a rutas de Next.js.

**No duplicado con HU-16 (auditoría `docs/producto/auditoria-puntos-inc00.md` regla 3)**: la detección del vencimiento, su propagación al portal/recepción y el bloqueo de acceso se acreditan **una sola vez en HU-16** (`mvp.md:58`). Aquí solo se cubre la **parte de consulta/ingreso/portal**: que el portal consulte el estado real devuelto por el backend y lo pinte (contrato + UI), sin recalcular ni acreditar de nuevo la lógica de vencimiento.

## Mapa de bullets -> IDs de criterio

| Bullet de la HU (línea) | ID criterio | Nota |
|---|---|---|
| b1 - "El portal muestra nombre, cedula y sede principal." (417) | `HU25-C01` | |
| b2 - "El portal muestra estado de acceso al gym." (418) | `HU25-C02` + `HU25-C07` | Acreditación del efecto "vencido = sin acceso" → **HU-16**; aquí solo el contrato y el pintado |
| b3 - "El portal muestra fecha de vencimiento de la membresia." (419) | `HU25-C03` + `HU25-C07` | Ídem: cálculo/propagación → **HU-16** |
| b4 - "Si el cliente esta congelado, el portal muestra el rango de congelacion." (420) | `HU25-C04` | **Habilitado**: INC-02 (HU-15) ACEPTADO 2026-10-08; el rango se lee de `MembresiaGymCambio` |
| (transversal) autorización del portal | `HU25-C05` | DEC-001 |
| (transversal) cliente sin membresía | `HU25-C06` | Elimina el hardcodeo `"Activo"` |
| (transversal) extremos inclusivos al pintar | `HU25-C07` | DEC-005 / DEC-006 |

## Criterios detallados

### HU25-C01 — Portal muestra nombre, cédula y sede principal
- **Condición previa**: cliente autenticado con token JWT válido, rol `CLIENTE`; el cliente existe y tiene `sedeId` asignado.
- **Disparo**: `GET /portal/resumen`.
- **Resultado observable**: HTTP **200**; el cuerpo incluye `cliente.nombres`, `cliente.apellidos` (nombre completo), `cliente.cedula` y `cliente.sede.{id,nombre}`. Los datos salen de la base, no de la sesión.
- **Códigos de error asociados**: 401 `AUTH_TOKEN_MISSING` / `AUTH_TOKEN_INVALID` / `AUTH_TOKEN_EXPIRED`; 403 `AUTH_FORBIDDEN` (ver `HU25-C05`).
- **NO cubre**: rutina, plan nutricional, anamnesis (HU-26/27/28); edición de datos (HU-05); información de otros clientes.

### HU25-C02 — Portal muestra el estado de acceso al gym (no hardcodeado)
- **Condición previa**: cliente con o sin vigencia gym; `fechaActual` calculada en `America/Bogota` (DEC-005).
- **Disparo**: `GET /portal/resumen`.
- **Resultado observable**: HTTP **200** con `estadoAccesoGym ∈ {ACTIVA, VENCIDA, PROGRAMADA, CONGELADO, SIN_VIGENCIA}` calculado por el backend (reutiliza `calcularEstado`, `membresia.service.ts:18-40`); la UI deja de pintar `"Activo"` fijo (`portal/page.tsx:122`).
- **Códigos de error asociados**: 401 / 403 (auth).
- **NO cubre**: la detección de vencimiento ni el bloqueo de acceso → **HU-16** (regla 3 de no duplicado); el cálculo del estado `CONGELADO` (ya acreditado en **INC-02/HU-15**); el estado en ficha administrativa (HU-07/HU-12).

### HU25-C03 — Portal muestra la fecha de vencimiento de la membresía
- **Condición previa**: cliente con al menos una vigencia `MembresiaGym`.
- **Disparo**: `GET /portal/resumen`.
- **Resultado observable**: HTTP **200** con `fechaVencimiento = fechaFin` (formato `YYYY-MM-DD`) de la vigencia gym vigente; si `hoy == fechaFin` el estado sigue `ACTIVA` (extremo inclusivo, DEC-006).
- **Códigos de error asociados**: 401 / 403 (auth).
- **NO cubre**: la propagación del vencido a recepción/acceso → **HU-16**; renovaciones (DEC-007, HU-12); vigencias de personalizado/nutrición (DEC-004, HU-13/HU-14).

### HU25-C04 — Portal muestra el rango de congelación si aplica (DEPENDENCIA CERRADA: INC-02)
- **Condición previa**: **INC-02 (HU-15) ACEPTADO el 2026-10-08**: el estado `CONGELADO` y el rango de la pausa existen y están probados (DEC-022..DEC-025). Este criterio queda **habilitado para INC-03** (ya no está `PENDIENTE-INC-02`).
- **Disparo**: `GET /portal/resumen`.
- **Resultado observable**: HTTP **200** con `congelacion = { fechaInicio, fechaFin }` (`YYYY-MM-DD`); sin congelación → `congelacion = null`.
- **Códigos de error asociados**: 401 / 403 (auth).
- **NO cubre**: crear/editar congelaciones ni la extensión automática de `fechaFin` (HU-15 b2/b3/b4).

### HU25-C05 — Autorización del portal (DEC-001)
- **Condición previa**: tokens de los tres roles disponibles.
- **Disparo**: `GET /portal/resumen` con: (a) sin Authorization, (b) token de `DUENO`, (c) token de `RECEPCIONISTA`, (d) token de `CLIENTE`.
- **Resultado observable**: (a) **401** `AUTH_TOKEN_MISSING` o `AUTH_TOKEN_INVALID` o `AUTH_TOKEN_EXPIRED`; (b)(c) **403** `AUTH_FORBIDDEN`; (d) **200** con los datos **del propio cliente** derivados del token (`request.user.id`), sin parámetro de identificación ajeno.
- **NO cubre**: recuperación de sesión vencida (HU-02/HU-03); guards de menú en UI (HU-01).

### HU25-C06 — Cliente sin membresía gym: el portal no dice "Activo"
- **Condición previa**: cliente sin filas en `MembresiaGym`.
- **Disparo**: `GET /portal/resumen`.
- **Resultado observable**: HTTP **200** con `estadoAccesoGym = "SIN_VIGENCIA"` y `fechaVencimiento = null`; la UI muestra un mensaje claro de "sin vigencia" y **nunca** la etiqueta "Activo".
- **Códigos de error asociados**: 401 / 403 (auth).
- **NO cubre**: alta de membresías (HU-12); notificación de vencimiento (HU-34).

### HU25-C07 — Extremos inclusivos al pintar (DEC-005 / DEC-006)
- **Condición previa**: vigencia gym con `fechaInicio` y `fechaFin` conocidas; fecha actual de prueba controlada (`America/Bogota`).
- **Disparo**: tres consultas `GET /portal/resumen` con: (1) `hoy = fechaInicio - 1`, (2) `hoy = fechaFin`, (3) `hoy = fechaFin + 1`.
- **Resultado observable**: HTTP **200** en las tres; `estadoAccesoGym` = `PROGRAMADA`, `ACTIVA`, `VENCIDA` respectivamente; `fechaVencimiento` siempre = `fechaFin`. El portal no recalcula fechas en el cliente.
- **Códigos de error asociados**: 401 / 403 (auth).
- **NO cubre**: el algoritmo `calcularEstado` en sí (ya cubierto por MEM-01..07, `membresia.service.ts:18-40`); la propagación del estado vencido a recepción/acceso → **HU-16**.

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| token rol | CLIENTE propio | JWT `{id, rol:"CLIENTE"}` | Sin token, rol staff, token vencido | -, JWT DUENO, expirado |
| vigencia gym | ACTIVA vigente | 2026-10-01..2026-11-30, hoy 2026-10-08 | VENCIDA / PROGRAMADA / inexistente | 2026-09-01..2026-10-01 / sin fila |
| rango congelación | Congelación vigente (INC-02) | 2026-10-05..2026-10-12 | Sin congelación (hoy) | `congelacion: null` |
| fechaVencimiento | `YYYY-MM-DD` | `2026-11-30` | N/A (siempre calculada por backend) | - |

## Análisis de Valores Límite
| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| hoy vs fechaFin (día del vencimiento) | fecha | `hoy = fechaFin` → ACTIVA | - | `hoy = fechaFin + 1` → VENCIDA | - |
| hoy vs fechaInicio | fecha | `hoy = fechaInicio` → ACTIVA | `hoy = fechaFin` → ACTIVA | `hoy = fechaInicio - 1` → PROGRAMADA | `hoy = fechaFin + 1` → VENCIDA |
| cedula (dígitos, salida) | num | 6 | 10 | 5 (dato ya validado al crear, HU-04) | 11 |

## Tabla de Decisiones
### Pintado del estado de acceso en portal
| Vigencia gym existe | hoy < fechaInicio | hoy ∈ [fechaInicio, fechaFin] | hoy > fechaFin | congelación vigente | `estadoAccesoGym` | HTTP |
|---|---|---|---|---|---|---|
| no | - | - | - | - | `SIN_VIGENCIA` | 200 |
| sí | sí | - | - | - | `PROGRAMADA` | 200 |
| sí | no | sí | - | no | `ACTIVA` | 200 |
| sí | no | sí | - | sí (INC-02) | `CONGELADO` | 200 |
| sí | no | - | sí | - | `VENCIDA` | 200 |

### Autorización
| Sin token | Rol | Resultado |
|---|---|---|
| sí | - | 401 `AUTH_TOKEN_*` |
| no | DUENO / RECEPCIONISTA | 403 `AUTH_FORBIDDEN` |
| no | CLIENTE | 200 (datos propios) |

## Transiciones de Estado
### Vigencia gym (vista por el portal)
```
[PROGRAMADA] --hoy == fechaInicio--> [ACTIVA]
[ACTIVA]      --hoy == fechaFin (inclusivo, DEC-006)--> [ACTIVA]
[ACTIVA]      --hoy == fechaFin + 1--> [VENCIDA]
[ACTIVA]      --congelación vigente (INC-02)--> [CONGELADO]
[VENCIDA]     --nueva vigencia (HU-12/DEC-007)--> [ACTIVA]
```
Transiciones inválidas: `VENCIDA --> ACTIVA` sin nueva vigencia; `PROGRAMADA --> VENCIDA` sin pasar por el rango.

## Cobertura de Ramas
### Ruta: GET /portal/resumen
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path con vigencia activa | token CLIENTE, vigencia 2026-10-01..2026-11-30, hoy 2026-10-08 | 200 nombre+cédula+sede+`ACTIVA`+`2026-11-30`+`congelacion:null` |
| 2 | Sin token | sin header Authorization | 401 `AUTH_TOKEN_*` |
| 3 | Token vencido | JWT expirado | 401 `AUTH_TOKEN_EXPIRED` |
| 4 | Rol staff | token DUENO o RECEPCIONISTA | 403 `AUTH_FORBIDDEN` |
| 5 | Sin vigencia gym | cliente sin `MembresiaGym` | 200 `SIN_VIGENCIA`, `fechaVencimiento:null` (no "Activo") |
| 6 | Día exacto del vencimiento | `hoy = fechaFin` | 200 `ACTIVA` (inclusivo) |
| 7 | Día posterior al vencimiento | `hoy = fechaFin + 1` | 200 `VENCIDA` |
| 8 | Día previo al inicio | `hoy = fechaInicio - 1` | 200 `PROGRAMADA` |
| 9 | Congelado (INC-02) | congelación vigente | 200 `CONGELADO` + rango `[fechaInicio, fechaFin]` — **habilitado: INC-02 aceptado 2026-10-08** |
| 10 | Portal pintado | UI `/portal` | La UI muestra `estadoAccesoGym` y `fechaVencimiento` del backend; `"Activo"` hardcodeado eliminado |

## Reglas de Validación por Campo (respuesta)
| Campo | Tipo | Requerido | Regex / Valores | Longitud | Notas |
|-------|------|-----------|-----------------|----------|-------|
| cliente.id | string | sí | - | 1-36 | cuid/UUID |
| cliente.nombres | string | sí | letras y espacios | 1-100 | hereda HU-04 |
| cliente.apellidos | string | sí | letras y espacios | 1-100 | hereda HU-04 |
| cliente.cedula | string | sí | `/^\d{6,10}$/` | 6-10 | DEC-002, unicidad HU-04 |
| cliente.sede.id | string | sí | - | 1-36 | |
| cliente.sede.nombre | string | sí | - | 1-100 | |
| estadoAccesoGym | enum | sí | `ACTIVA\|VENCIDA\|PROGRAMADA\|CONGELADO\|SIN_VIGENCIA` | - | calculado en backend |
| fechaVencimiento | string \| null | sí (nullable) | `/^\d{4}-\d{2}-\d{2}$/` | 10 | = `fechaFin` vigente |
| congelacion | object \| null | sí (nullable) | fechas `YYYY-MM-DD` | - | INC-02 |
| fechaActual | string | sí | `/^\d{4}-\d{2}-\d{2}$/` | 10 | `America/Bogota` (DEC-005) |

## Escenarios Gherkin (borrador — los conecta `test-engineer` en el RED; NO crear `.feature` desde aquí)

```gherkin
Feature: Portal del cliente con informacion real (HU-25)
  Como cliente
  Quiero ver mi informacion general en el portal
  Para saber mi estado actual dentro del gimnasio

  Background:
    Given soy un usuario autenticado como CLIENTE con cedula "1234567890"

  # Happy path
  Scenario: El portal muestra nombre, cedula y sede principal
    When consulto "GET /portal/resumen"
    Then la respuesta HTTP es 200
    And el cuerpo contiene nombre completo "Juan Carlos Perez"
    And el cuerpo contiene cedula "1234567890"
    And el cuerpo contiene la sede principal con nombre "Sede Norte"

  Scenario: El portal muestra estado de acceso y fecha de vencimiento reales
    Given la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    And la fecha actual en America/Bogota es "2026-10-08"
    When consulto "GET /portal/resumen"
    Then la respuesta HTTP es 200
    And el campo "estadoAccesoGym" es "ACTIVA"
    And el campo "fechaVencimiento" es "2026-11-30"

  # Valores limite (DEC-005 / DEC-006, extremos inclusivos)
  Scenario: El dia exacto del vencimiento sigue con acceso
    Given la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    And la fecha actual en America/Bogota es "2026-11-30"
    When consulto "GET /portal/resumen"
    Then la respuesta HTTP es 200
    And el campo "estadoAccesoGym" es "ACTIVA"

  Scenario: Un dia despues del vencimiento el estado es VENCIDA
    Given la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    And la fecha actual en America/Bogota es "2026-12-01"
    When consulto "GET /portal/resumen"
    Then la respuesta HTTP es 200
    And el campo "estadoAccesoGym" es "VENCIDA"

  Scenario: Un dia antes del inicio el estado es PROGRAMADA
    Given la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    And la fecha actual en America/Bogota es "2026-09-30"
    When consulto "GET /portal/resumen"
    Then la respuesta HTTP es 200
    And el campo "estadoAccesoGym" es "PROGRAMADA"

  # Ramas de error / datos ausentes
  Scenario: Cliente sin membresia gym no aparece como activo
    Given el cliente no tiene membresia gym
    When consulto "GET /portal/resumen"
    Then la respuesta HTTP es 200
    And el campo "estadoAccesoGym" es "SIN_VIGENCIA"
    And el campo "fechaVencimiento" es nulo

  Scenario: Sin token no hay resumen del portal
    Given no estoy autenticado
    When consulto "GET /portal/resumen"
    Then la respuesta HTTP es 401
    And el cuerpo contiene codigo "AUTH_TOKEN_MISSING" o "AUTH_TOKEN_INVALID"

  Scenario: El rol staff no accede al portal del cliente
    Given soy un usuario autenticado como RECEPCIONISTA
    When consulto "GET /portal/resumen"
    Then la respuesta HTTP es 403
    And el cuerpo contiene codigo "AUTH_FORBIDDEN"

  # Habilitado: INC-02 (HU-15) aceptado 2026-10-08 - escribir en RED en INC-03
  @inc-02-cerrado
  Scenario: El portal muestra el rango de congelacion
    Given la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    And el cliente tiene una congelacion de "2026-10-05" a "2026-10-12"
    And la fecha actual en America/Bogota es "2026-10-08"
    When consulto "GET /portal/resumen"
    Then la respuesta HTTP es 200
    And el campo "estadoAccesoGym" es "CONGELADO"
    And el campo "congelacion" tiene fechaInicio "2026-10-05" y fechaFin "2026-10-12"
```

## Contrato API propuesto (para `test-engineer` y `backend-developer`)

- **Endpoint**: `GET /portal/resumen` — `preHandler: [fastify.authenticateRoles(["CLIENTE"])]` (DEC-001).
- **Request**: sin parámetros; la identidad sale del token (`request.user.id`).
- **Respuesta 200**: ver `HU-25-schemas.ts` → `portalResumenResponseSchema`.
- **Errores**: 401 `AUTH_TOKEN_*`, 403 `AUTH_FORBIDDEN` (cuerpo `{ error, code }`, convención de `src/lib/errors.ts`).

## Decisiones abiertas / dependencias

| ID | Tema | Estado | Pregunta concreta |
|---|---|---|---|
| HU25-AB-01 | Rango de congelación en portal (b4) | **RESUELTO: INC-02 ACEPTADO (2026-10-08)** | Ya no es decisión: `CONGELADO` y el rango están implementados y probados en INC-02 (DEC-022..025). HU-25-C04 queda **habilitado** para INC-03; el rango se lee de `MembresiaGymCambio` (`congelacionInicio`/`congelacionFin`), sin modelo nuevo. |
| HU25-AB-02 | Etiquetas UI del estado | Abierto (UX, no bloqueante) | ¿La UI muestra rótulos en español ("Activo", "Vencido", "Programado", "Congelado", "Sin vigencia") mapeados desde el enum del backend, o muestra el enum en crudo? |
| HU25-AB-03 | No duplicado con HU-16 | Regla aplicada | Los bullets de HU-16 ("estado se refleja ... en recepcion" y "el cliente deja de tener acceso") se acreditan en **HU-16** (`HU16-C03` / `HU16-C04` en `HU-16-criterios-aceptacion.md`); HU-25 solo acredita contrato+pintado del portal. Recíproco: `HU16-C03` delega en este documento la superficie "portal" solo como consumidora del estado. Confirmar en `auditoria-puntos-inc00.md` al cierre para no contar dos veces. |

## Gaps vs código actual
- `club-beasts-web/src/app/portal/page.tsx:121-123` hardcodea el estado `"Activo"`; no hay cédula, sede ni fecha de vencimiento en el portal.
- No existe endpoint de portal en `club-beasts-api/src/routes/` (solo `auth.ts`, `clientes.ts`, `membresia.ts`).
- No existe consumidor de API en `portal/page.tsx` (solo `session.user.name`).
- `club-beasts-api/prisma/schema.prisma` no tiene un modelo dedicado de congelación, **pero
  no hace falta crearlo**: el rango de la pausa persiste en `MembresiaGymCambio.congelacionInicio`
  / `congelacionFin` con `accion = "CONGELACION" | "EDICION_CONGELACION"` (`schema.prisma:79-99`),
  y la extensión de `fechaFin` ya está en la vigencia (`schema.prisma:65`). El helper que
  filtra las pausas vigentes (`pausasActivas`, `membresia.service.ts:169`) **no está exportado**:
  `backend-developer` debe exportarlo (o extraerlo) para que portal/recepción consuman la misma
  fuente que el listado.
