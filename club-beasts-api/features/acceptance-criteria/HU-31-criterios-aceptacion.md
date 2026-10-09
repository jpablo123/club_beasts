# Criterios de Aceptación - HU-31: Creación rápida de cliente desde recepción

- Origen: `historias-usuario-gimnasio.md` §4.8 HU-31 (líneas 499-511).
- Incremento: INC-03 (`docs/producto/avance.md:127`).
- Paquete G14: 2026-10-08. Pendiente de spec en `docs/incrementos/INC-03/spec.md`.
- Estado de este documento: borrador de especificación (no cuenta puntos sin spec + implementación + prueba + evidencia + revisión, DEC-016).

## Resumen

Recepción crea un cliente con el mínimo de datos para no frenar la atención, el sistema marca que el perfil requiere completarse y después el dueño completa la información restante. Hoy no existe flujo de creación rápida desde recepción (`docs/producto/auditoria-puntos-inc00.md:127`); solo existe el alta completa `POST /clientes` de HU-04.

**Nota de rutas**: el backend no registra prefijo `/api` (`club-beasts-api/src/index.ts:23-25`); las rutas se llaman como `${API_URL}/recepcion/clientes-rapidos` y `${API_URL}/clientes/:id`.

**No duplicado con HU-04 / HU-05 (auditoría regla 3 aplicada al mismo criterio)**:
- HU-04 ya está aceptado 4/4 con `POST /clientes` completo. HU-31 **no re-acredita** esas validaciones en ese endpoint: aquí se especifica un **endpoint propio** de creación rápida (`POST /recepcion/clientes-rapidos`) que fija `perfilPendiente = true`; las validaciones se prueban sobre la nueva superficie.
- La edición genérica de clientes (`PATCH /clientes/:id`) es HU-05. HU-31 solo acredita el flujo de **completar un perfil creado rápido** y el reflejo en la marca de pendiente, no la capacidad de edición en sí.

## Mapa de bullets -> IDs de criterio

| Bullet de la HU (línea) | ID criterio | Nota |
|---|---|---|
| b1 - "La recepcion puede crear un cliente con datos minimos." (509) | `HU31-C01` + `HU31-C04` | Mínimo derivado de `schema.prisma` (NOT NULL) |
| b2 - "El sistema marca que el perfil requiere completarse despues." (510) | `HU31-C02` | Requiere campo nuevo `perfilPendiente` (HU31-AB-02) |
| b3 - "El dueno puede completar la informacion restante posteriormente." (511) | `HU31-C03` | Usa `PATCH /clientes/:id` (base HU-05) |
| (transversal) permisos | `HU31-C05` | DEC-001 |
| (transversal) trazabilidad y estado inicial | `HU31-C06` | PATRÓN de HU-04: estado `NUEVO` + `creadoPorId` |
| (transversal) unicidad de cédula | `HU31-C07` | DEC-002 → 409 |

## Criterios detallados

### HU31-C01 — Creación con datos mínimos
- **Condición previa**: token `DUENO`/`RECEPCIONISTA`; sede destino existe.
- **Disparo**: `POST /recepcion/clientes-rapidos` con `{ cedula, nombres, apellidos, telefono, sedeId }` (sin `email`, sin `observaciones`).
- **Resultado observable**: HTTP **201** con el cliente creado: `{ id, cedula, nombres, apellidos, telefono, sede, estado: "NUEVO", perfilPendiente: true, creadoPor: {id, nombre}, ... }`.
- **Códigos de error asociados**: 400 `VALIDATION_ERROR`, 409 `DUPLICATE`, 401/403 auth.
- **NO cubre**: el alta completa con email/observaciones (HU-04, ya aceptado 4/4); login del cliente (HU-02); asignación de membresía (HU-12).

### HU31-C02 — El perfil queda marcado como pendiente de completar
- **Condición previa**: cliente creado por el flujo rápido.
- **Disparo**: creación rápida y posterior lectura (respuesta 201 y cualquier consulta posterior: ficha `GET /clientes/:id` o consulta de recepción).
- **Resultado observable**: el cliente tiene `perfilPendiente = true` persistido (no solo en la respuesta de creación). Requiere el campo `Cliente.perfilPendiente` (ver HU31-AB-02); sin ese campo, el bullet no se puede acreditar (DEC-016).
- **Códigos de error asociados**: no aplica (es un estado de datos).
- **NO cubre**: la regla de cuándo pasa a `false` (HU31-AB-03, decisión abierta); notificaciones de bienvenida (no existe).

### HU31-C03 — El dueño completa la información restante
- **Condición previa**: cliente con `perfilPendiente = true`; token `DUENO` (o `RECEPCIONISTA`, ver HU31-AB-04).
- **Disparo**: `PATCH /clientes/:id` con campos faltantes (`email`, `observaciones`, o correcciones de `telefono`/`sedeId`).
- **Resultado observable**: HTTP **200** con el cliente actualizado; los campos faltantes quedan persistidos. Si Producto aprueba la regla de HU31-AB-03, el mismo criterio aserta además `perfilPendiente = false` tras la completitud.
- **Códigos de error asociados**: 400 `VALIDATION_ERROR` (campos mal formados), 404 `NOT_FOUND`, 401/403 auth.
- **NO cubre**: la edición en sí como funcionalidad (HU-05); estados generales (HU-17); reset de PIN (HU-02).

### HU31-C04 — La creación rápida respeta las mismas validaciones de HU-04
- **Condición previa**: token de recepción válido.
- **Disparo**: creación rápida con (a) cédula `ABC`/`12345`/`12345678901`, (b) cédula ya existente, (c) teléfono `2101234567`, (d) nombres `Juan123`, (e) campos faltantes (`nombres`, `apellidos`, `telefono`, `sedeId`), (f) `sedeId` inexistente.
- **Resultado observable**: (a)(c)(d)(e) **400** `VALIDATION_ERROR` con los mensajes de HU-04 (`Cédula debe ser numérica de 6 a 10 dígitos`, `Teléfono debe ser móvil colombiano (3XXXXXXXXX)`, `Nombres solo pueden contener letras y espacios`, ...); (b) **409** `{ error: "Ya existe un cliente con esa cédula", code: "DUPLICATE" }`; (f) **400** `VALIDATION_ERROR` "La sede indicada no existe...". En ningún caso se escribe la fila.
- **NO cubre**: los puntos ya aceptados de HU-04 en `POST /clientes` (se prueban aquí sobre la nueva superficie, sin recontar).

### HU31-C05 — Permisos de la creación rápida (DEC-001)
- **Condición previa**: tokens de los tres roles.
- **Disparo**: `POST /recepcion/clientes-rapidos` con (a) sin token, (b) rol `CLIENTE`, (c) rol `DUENO`, (d) rol `RECEPCIONISTA`.
- **Resultado observable**: (a) **401** `AUTH_TOKEN_*`; (b) **403** `AUTH_FORBIDDEN`; (c)(d) **201/400/409** según reglas.
- **NO cubre**: recuperación de sesión (HU-02/03); guards de menú (HU-01).

### HU31-C06 — Trazabilidad y estado inicial
- **Condición previa**: creación rápida exitosa con token de un `RECEPCIONISTA`.
- **Disparo**: creación y lectura posterior de la fila.
- **Resultado observable**: el cliente persiste `estado = "NUEVO"` (default de `schema.prisma:46`) y `creadoPorId = request.user.id`; la respuesta expone `creadoPor.{id, nombre}`.
- **NO cubre**: transiciones de estado del cliente (HU-17/HU-08); auditoría de cambios (HU-05/HU-32).

### HU31-C07 — Cédula duplicada → 409
- **Condición previa**: cliente existente con cédula X.
- **Disparo**: creación rápida con la misma cédula X (incluso si el resto de datos difiere).
- **Resultado observable**: HTTP **409** `{ error: "Ya existe un cliente con esa cédula", code: "DUPLICATE" }`; no se crea una segunda fila (restricción `Cliente.cedula @unique`).
- **NO cubre**: búsqueda del cliente existente (HU-06/HU-29).

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| cedula | 6-10 dígitos, única | `1234567890` | Formato inválido / duplicada | `ABC`, `12345`, existente |
| nombres | Solo letras, 1-100 | `Juan Carlos` | Vacío / con números | `""`, `Juan123` |
| apellidos | Solo letras, 1-100 | `Perez Gomez` | Vacío / con números | `""`, `Perez1` |
| telefono | Móvil CO 3XXXXXXXXX | `3101234567` | No móvil / vacío | `2101234567`, `""` |
| sedeId | Existente | `uid-sede-1` | Inexistente / vacío | `uid-xxx`, `""` |
| email / observaciones | Ausentes (mínimo) | no enviados | Formato inválido si se envían | `abc` |
| perfilPendiente | true tras creación rápida | `true` | false sin completar | `false` → incumple HU31-C02 |

## Análisis de Valores Límite
| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| cedula (dígitos) | num | 6 | 10 | 5 → 400 | 11 → 400 |
| nombres / apellidos | string | 1 | 100 | 0 → 400 | 101 → 400 |
| telefono | string | 10 (`3000000000`) | 10 | 9 → 400 | 11 → 400 |
| campos enviados (mínimo) | int | 5 (`cedula,nombres,apellidos,telefono,sedeId`) | 7 (con `email`,`observaciones`) | 4 → 400 | - |
| sedeId | string | 1 | 36 | 0 → 400 | 37 → 400 |

## Tabla de Decisiones
### Creación rápida
| Rol | cedula ok | cedula única | campos mínimos ok | sede existe | Acción |
|---|---|---|---|---|---|
| sin token / CLIENTE | * | * | * | * | 401 / 403 `AUTH_FORBIDDEN` |
| DUENO/RECEPCIONISTA | no | * | * | * | 400 `VALIDATION_ERROR` |
| DUENO/RECEPCIONISTA | sí | no | * | * | 409 `DUPLICATE` |
| DUENO/RECEPCIONISTA | sí | sí | no | * | 400 `VALIDATION_ERROR` (campos faltantes) |
| DUENO/RECEPCIONISTA | sí | sí | sí | no | 400 `VALIDATION_ERROR` (sede) |
| DUENO/RECEPCIONISTA | sí | sí | sí | sí | **201 cliente `NUEVO` + `perfilPendiente: true`** |

### Completitud del perfil (provisional, sujeto a HU31-AB-03)
| `perfilPendiente` al crear | PATCH posterior | Resultado |
|---|---|---|
| true | sin cambios | sigue `true` (HU31-C02) |
| true | completa campos faltantes | `200` y (si aprueba HU31-AB-03) `perfilPendiente: false` |
| false (cliente creado por HU-04) | cualquier PATCH | no aplica la marca de HU-31 |

## Transiciones de Estado
### Cliente
```
[no existe] --POST /recepcion/clientes-rapidos valido--> [NUEVO] (perfilPendiente=true)
[NUEVO] --PATCH completitud (DUENO)--> [NUEVO | ACTIVO] (perfilPendiente=false si HU31-AB-03 lo aprueba)
```
Transiciones inválidas: `[RETIRADO] --creacion rapida-->` no aplica (es creación, no transición); las transiciones de estado general pertenecen a HU-17/HU-08.

## Cobertura de Ramas
### Ruta: POST /recepcion/clientes-rapidos
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path mínimo | cédula+nombres+apellidos+teléfono+sede | 201 cliente `NUEVO`, `perfilPendiente:true`, `creadoPor` = actor |
| 2 | Con opcionales | + email y observaciones | 201 igual (los opcionales también se aceptan) |
| 3 | Cédula inválida | `cedula:"ABC"` | 400 `VALIDATION_ERROR` |
| 4 | Cédula de 5 / 11 dígitos | `12345` / `12345678901` | 400 `VALIDATION_ERROR` |
| 5 | Cédula duplicada | cédula existente | 409 `DUPLICATE`, sin fila nueva |
| 6 | Teléfono no móvil | `telefono:"2101234567"` | 400 `VALIDATION_ERROR` |
| 7 | Nombres con número | `nombres:"Juan123"` | 400 `VALIDATION_ERROR` |
| 8 | Campo mínimo faltante | sin `telefono` | 400 `VALIDATION_ERROR` |
| 9 | Sede inexistente | `sedeId:"uid-xxx"` | 400 `VALIDATION_ERROR` "La sede indicada no existe..." |
| 10 | Sin token | sin Authorization | 401 `AUTH_TOKEN_*` |
| 11 | Rol CLIENTE | token cliente | 403 `AUTH_FORBIDDEN` |
| 12 | Persistencia de la marca | lectura posterior | `perfilPendiente:true` también en BD/consulta |

### Ruta: PATCH /clientes/:id (flujo de completitud, base HU-05)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 13 | Dueño completa el perfil | `email` + `observaciones` | 200 campos persistidos |
| 14 | Corrección de teléfono | `telefono:"3109998877"` | 200 |
| 15 | Email inválido durante completitud | `email:"abc"` | 400 `VALIDATION_ERROR` |
| 16 | Cliente inexistente | id no existente | 404 `NOT_FOUND` |
| 17 | Marca de pendiente | lectura tras completar | `perfilPendiente:false` **solo si HU31-AB-03 lo aprueba** |

## Reglas de Validación por Campo
### Request POST /recepcion/clientes-rapidos
| Campo | Tipo | Requerido | Regex | Longitud | Valores Permitidos |
|-------|------|-----------|-------|----------|-------------------|
| cedula | string | **sí** | `/^\d{6,10}$/` | 6-10 | numérico, única (DEC-002) |
| nombres | string | **sí** | `/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/` | 1-100 | solo letras |
| apellidos | string | **sí** | `/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/` | 1-100 | solo letras |
| telefono | string | **sí** | `/^3\d{9}$/` | 10 | móvil colombiano |
| sedeId | string | **sí** | - | 1-36 | id existente en `Sede` |
| email | string | no | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | 0-254 | formato email |
| observaciones | string | no | - | 0-500 | texto libre |

*Conjunto mínimo = los 5 campos "sí": derivado de los `NOT NULL` de `club-beasts-api/prisma/schema.prisma:35-44`. Si Producto permite omitir `sedeId` (HU31-AB-01), el mínimo baja a 4.*

### Respuesta (cliente rápido)
| Campo | Tipo | Requerido | Regex / Valores | Longitud | Notas |
|-------|------|-----------|-----------------|----------|-------|
| id | string | sí | - | 1-36 | |
| cedula | string | sí | `/^\d{6,10}$/` | 6-10 | |
| estado | enum | sí | `NUEVO` | - | default `schema.prisma:46` |
| perfilPendiente | boolean | sí | `true` | - | requiere campo nuevo (HU31-AB-02) |
| creadoPor | object \| null | sí | `{id, nombre}` | - | trazabilidad HU-04 |
| sede | object | sí | `{id, nombre}` | - | |

## Escenarios Gherkin (borrador — los conecta `test-engineer` en el RED; NO crear `.feature` desde aquí)

```gherkin
Feature: Creacion rapida de cliente desde recepcion (HU-31)
  Como recepcionista
  Quiero crear un cliente rapido con pocos datos
  Para no frenar la atencion cuando llegue una persona nueva

  Background:
    Given soy un usuario autenticado como RECEPCIONISTA
    And existe la sede "Sede Norte" con id "uid-sede-norte"

  # Happy path (b1)
  Scenario: Crear cliente con los datos minimos
    When envio "POST /recepcion/clientes-rapidos" con cedula "1234567890", nombres "Juan Carlos", apellidos "Perez Gomez", telefono "3101234567" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 201
    And el cuerpo contiene cedula "1234567890" y estado "NUEVO"
    And el campo "creadoPor.id" es el id del usuario autenticado

  # b2: marca de perfil a completar
  Scenario: El perfil creado rapido queda marcado como pendiente
    When envio "POST /recepcion/clientes-rapidos" con cedula "1234567890", nombres "Juan Carlos", apellidos "Perez Gomez", telefono "3101234567" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 201
    And el campo "perfilPendiente" es true
    And al consultar la ficha del cliente el campo "perfilPendiente" sigue en true

  # b3: completitud posterior
  Scenario: El dueno completa la informacion restante
    Given existe un cliente creado desde recepcion con cedula "1234567890" y perfil pendiente
    Given soy un usuario autenticado como DUENO
    When envio "PATCH /clientes/<id>" con email "juan@correo.com" y observaciones "Ficha completa"
    Then la respuesta HTTP es 200
    And el cuerpo contiene email "juan@correo.com" y observaciones "Ficha completa"

  # Validacion por campo (mismas reglas que HU-04)
  Scenario Outline: Rechazar datos invalidos en la creacion rapida
    When envio "POST /recepcion/clientes-rapidos" con cedula "<cedula>", nombres "<nombres>", apellidos "<apellidos>", telefono "<telefono>" y sedeId "<sedeId>"
    Then la respuesta HTTP es 400
    And el cuerpo contiene codigo "VALIDATION_ERROR"

    Examples:
      | cedula | nombres | apellidos | telefono | sedeId |
      | ABC | Juan | Perez | 3101234567 | uid-sede-norte |
      | 12345 | Juan | Perez | 3101234567 | uid-sede-norte |
      | 12345678901 | Juan | Perez | 3101234567 | uid-sede-norte |
      | 1234567890 | Juan123 | Perez | 3101234567 | uid-sede-norte |
      | 1234567890 | Juan | Perez | 2101234567 | uid-sede-norte |
      | 1234567890 | Juan | Perez | 3101234567 | uid-xxx |

  Scenario: Falta un campo obligatorio minimo
    When envio "POST /recepcion/clientes-rapidos" con cedula "1234567890", nombres "Juan Carlos", apellidos "Perez Gomez" y sedeId "uid-sede-norte" sin telefono
    Then la respuesta HTTP es 400
    And el cuerpo contiene codigo "VALIDATION_ERROR"

  # Unicidad (DEC-002)
  Scenario: Cedula duplicada responde 409
    Given existe el cliente con cedula "1234567890"
    When envio "POST /recepcion/clientes-rapidos" con cedula "1234567890", nombres "Otro Nombre", apellidos "Otro Apellido", telefono "3109998877" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 409
    And el cuerpo contiene codigo "DUPLICATE"
    And la cuenta de clientes con cedula "1234567890" es 1

  # Permisos (DEC-001)
  Scenario: Sin token no se crea
    Given no estoy autenticado
    When envio "POST /recepcion/clientes-rapidos" con cedula "1234567890", nombres "Juan Carlos", apellidos "Perez Gomez", telefono "3101234567" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 401

  Scenario: Un cliente autenticado no crea clientes
    Given soy un usuario autenticado como CLIENTE
    When envio "POST /recepcion/clientes-rapidos" con cedula "1234567890", nombres "Juan Carlos", apellidos "Perez Gomez", telefono "3101234567" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 403
    And el cuerpo contiene codigo "AUTH_FORBIDDEN"

  # BLOQUEADO por HU31-AB-03: la regla de "perfil completado" sin aprobacion
  @bloqueado-producto
  Scenario: El perfil deja de estar pendiente cuando se completa
    Given existe un cliente creado desde recepcion con cedula "1234567890" y perfil pendiente
    When envio "PATCH /clientes/<id>" con email "juan@correo.com"
    Then la respuesta HTTP es 200
    And el campo "perfilPendiente" es false
```

## Contrato API propuesto (para `test-engineer` y `backend-developer`)

- **Alta rápida**: `POST /recepcion/clientes-rapidos` — `preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])]` (DEC-001).
  - Request: `crearClienteRapidoSchema` (`HU-31-schemas.ts`).
  - Respuesta: 201 `clienteRapidoResponseSchema`.
- **Completitud**: `PATCH /clientes/:id` (ruta existente de HU-05, `src/routes/clientes.ts:171`) con `completarPerfilSchema`.
- **Errores**: 400 `VALIDATION_ERROR`, 409 `DUPLICATE`, 404 `NOT_FOUND`, 401 `AUTH_TOKEN_*`, 403 `AUTH_FORBIDDEN` (cuerpo `{ error, code }`).
- **Modelo de datos requerido** (database-admin, fuera de los archivos de este paquete): campo `Cliente.perfilPendiente Boolean @default(false)` — ver HU31-AB-02.

## Decisiones abiertas / dependencias

| ID | Tema | Estado | Pregunta concreta |
|---|---|---|---|
| HU31-AB-01 | **`sedeId` ¿obligatorio en la creación rápida?** | Abierto (datos/UX) | **Pregunta a Producto: ¿la creación rápida exige sede (como HU-04) o usa por defecto la sede del recepcionista?** El mínimo actual (5 campos) sale de los `NOT NULL` de `schema.prisma:35-44`; si se permite default, el mínimo baja a 4 y cambia HU31-C01 y su Gherkin. |
| HU31-AB-02 | **Campo de marca "perfil pendiente"** | Abierto (datos) | **Pregunta a Producto + database-admin: ¿se crea `Cliente.perfilPendiente Boolean @default(false)` o se deriva de datos faltantes (p.ej. `email == null`)?** Sin campo ni regla de derivación, HU31-C02 no es verificable y no se puntúa (DEC-016). |
| HU31-AB-03 | **¿Cuándo deja de estar pendiente el perfil?** | **BLOQUEADO (UX/datos)** | **Pregunta a Producto: ¿qué condición exacta limpia `perfilPendiente`?** Opciones: (a) cualquier PATCH exitoso del dueño, (b) solo al tener `email`, (c) al tener `email` + `observaciones`, (d) acción manual "marcar como completo". Afecta UX y datos → sin respuesta, HU31-C03 se acredita solo con la completitud de campos y la marca queda pendiente. |
| HU31-AB-04 | **¿Puede `RECEPCIONISTA` completar el perfil?** | Abierto (permisos) | La HU dice "el dueno puede completar", pero `PATCH /clientes/:id` ya permite `DUENO` y `RECEPCIONISTA` (HU-05, aceptada 4/4). **Pregunta a Producto: ¿se mantiene el permiso de HU-05 (recomendado, sin cambio) o la completitud queda solo para `DUENO`?** |
| HU31-AB-05 | No duplicado con HU-04/HU-05 | Regla aplicada | El endpoint rápido es propio; las validaciones no re-acreditan HU-04 y el PATCH no re-acredita HU-05. Confirmar al cierre en `auditoria-puntos-inc00.md`. |

## Gaps vs código actual
- No existe `POST /recepcion/clientes-rapidos`: `club-beasts-api/src/routes/` solo tiene `auth.ts`, `clientes.ts`, `membresia.ts`.
- `club-beasts-api/prisma/schema.prisma` no tiene campo `perfilPendiente` (HU31-AB-02).
- `PATCH /clientes/:id` existe y funciona (`src/routes/clientes.ts:171-206`) pero no toca ninguna marca de completitud (HU31-AB-03).
- `club-beasts-web` no tiene pantalla de creación rápida en recepción.
