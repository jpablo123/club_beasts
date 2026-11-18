# Criterios de Aceptación - HU-26: Visualización de rutina activa (portal del cliente)

## Resumen

El cliente visualiza en su portal **solo su rutina activa** (la personalizada
vigente si aplica, o la genérica/inducción asignada), en **solo lectura**, sin
datos internos del staff ni datos de otros clientes.

**Incremento**: INC-10-rutinas (bloque 6, 18 pts MVP; su cierre habilita este
portal junto con el bullet b4 de HU-13). Criterios **RU-36..RU-42** de esta HU
(secuencia RU-01..RU-42 única del bloque).

**Decisiones aplicadas**:

- **HU-26 c2 + HU-13 b4 (`HU13-C04` / `INC05-PER-05`)**: la personalizada solo
  se expone con vigencia personalizada `ACTIVA`; con
  `NO_CONTRATADO`/`PROGRAMADA`/`CONGELADO`/`VENCIDA` -> `null` **sin borrar la
  asignación** (PEND-RUT-05 rec (a)).
- **HU-26 c3**: sin personalizado vigente, la genérica/inducción asignada se
  muestra (no exige vigencia).
- **HU-26 c4**: solo lectura — el CLIENTE no puede editar (ningún endpoint de
  escritura accesible; UI sin controles de edición).
- **Privacidad (SEC-01/SEC-03/GAP-001, precedentes HU-10/HU-28)**: self-only;
  los DTOs del portal son `.strict()` **sin** `actor`/`actualizadoPor`.
- **PEND-RUT-07 (rec (a))**: se muestra la estructura COMPLETA de la
  personalizada (paridad con HU-28, que muestra la anamnesis completa al
  cliente); alternativas en el PEND.
- Literal de "sin rutina" **PROPUESTO**: `"No tienes una rutina activa"`
  (paridad con HU-27 c3 "el portal informa que no hay plan vigente"); lo fija el
  contrato frontend al ratificar.

Códigos HTTP/endpoints: **PROPUESTA** (`GET /portal/rutina` por token de
sesión, patrón `GET /portal/anamnesis` de INC-09).

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado inicial |
|---|-----------------|-----------|----------------|
| 1 | El cliente visualiza solo su rutina activa. | RU-36 (+ RU-42 seguridad) | NO VERIFICADO |
| 2 | Si la rutina es personalizada, el sistema muestra la versión personalizada vigente. | RU-37 | NO VERIFICADO |
| 3 | Si no tiene personalizado vigente, el sistema puede mostrar una rutina genérica o de inducción asignada. | RU-38 | NO VERIFICADO |
| 4 | El cliente no puede editar el contenido. | RU-40 | NO VERIFICADO |

Transversales: RU-39 (mensaje sin rutina), RU-41 (secciones mostradas,
PEND-RUT-07).

## Detalle por criterio

### RU-36 — El cliente visualiza solo SU rutina activa (self-only)
- **Dado** un cliente autenticado en su portal (token de sesión, sin
  `clienteId` en la petición — patrón C9 de INC-09).
- **Cuando** abre "Mi rutina".
- **Entonces** el sistema devuelve la asignación ACTIVA del cliente de la sesión
  (como máximo 1, RU-35); nunca la de otro cliente y nunca una asignación
  cerrada. Con token de otro cliente o `clienteId` ajeno en query/body -> 403/404
  sin datos de B (SEC-01/SEC-03).
- **Qué NO cubre**: historial (staff, HU-21); edición (RU-40).
- **Prueba esperada**: integración `hu26-portal-rutina.test.ts` → "cliente A
  con activa; cliente B sin nada: A ve la suya, B ve mensaje; A con token de B
  -> 403/404 sin datos de A".

### RU-37 — Personalizada: solo la versión vigente (b2)
- **Dado** un cliente con asignación ACTIVA de una rutina PERSONALIZADA.
- **Cuando** la vigencia del servicio personalizado está `ACTIVA`.
- **Entonces** el portal muestra la versión personalizada vigente (el contenido
  de la asignación activa; snapshot si PEND-RUT-06 (a)). Si la vigencia está en
  `NO_CONTRATADO`/`PROGRAMADA`/`CONGELADO`/`VENCIDA` -> la personalizada **no se
  muestra** (respuesta `sinRutinaPortalSchema` o alternativa asignada según
  RU-38) y la asignación **no se borra** (literal INC05-PER-05).
- **Qué NO cubre**: el efecto de vencimiento en acceso (HU-16, ya aceptado);
  auto-cierre de la asignación (PEND-RUT-05).
- **Prueba esperada**: integración/tabla → los 5 estados de la vigencia ×
  respuesta del portal; unidad → `visibleEnPortal`.

### RU-38 — Sin personalizado vigente: genérica/inducción asignada (b3)
- **Dado** un cliente sin servicio personalizado vigente con una asignación
  ACTIVA de rutina GENERICA o INDUCCION.
- **Cuando** abre "Mi rutina".
- **Entonces** el sistema muestra esa rutina (genéricas/inducción no exigen
  vigencia; HU-26 c3 "puede mostrar una rutina genérica o de inducción
  asignada").
- **Prueba esperada**: integración → "vigencia VENCIDA + asignación GENERICA
  ACTIVA -> la rutina se muestra".

### RU-39 — Sin rutina visible: mensaje claro
- **Dado** un cliente sin asignación activa (o con personalizada oculta por
  vigencia sin alternativa asignada).
- **Cuando** abre "Mi rutina".
- **Entonces** el portal informa con un mensaje claro ("No tienes una rutina
  activa" — literal PROPUESTO) en lugar de una vista vacía o un error (paridad
  con HU-27 c3).
- **Prueba esperada**: integración → "sin asignación -> 200 con
  `sinRutinaPortalSchema` y el mensaje exacto"; E2E -> el mensaje es visible.

### RU-40 — Solo lectura: el cliente no puede editar (b4)
- **Dado** la vista de rutina del portal.
- **Cuando** el cliente intenta editar (UI o API directa: POST/PATCH/PUT/DELETE
  sobre rutinas/asignaciones con token CLIENTE).
- **Entonces** la UI no presenta controles de edición (solo lectura) y la API
  responde 403 (sin rutas de escritura accesibles a CLIENTE); el contenido no
  cambia.
- **Prueba esperada**: integración → "matriz de escrituras con token CLIENTE ->
  403/405 todas"; E2E -> "la vista no tiene botones de edición; el contenido es
  solo texto".

### RU-41 — Secciones mostradas al cliente (PEND-RUT-07 (a))
- **Dado** la rutina visible (personalizada o genérica/inducción).
- **Cuando** se renderiza en el portal.
- **Entonces** con la rec (a) se muestra la **estructura completa** de la
  personalizada (`informacionGeneral`, `diagnostico`, `macrociclos` con
  microciclos/sesiones/ejercicios/series, `tests`, `antropometria`,
  `analisisBiomecanico`) y la estructura base de genérica/inducción
  (`sesiones`), en solo lectura; la respuesta NUNCA incluye `actor`,
  `actualizadoPor` ni campos de staff (strict, SEC-01/SEC-03). Con la
  alternativa (b) se muestra solo el plan de sesiones (el DTO se reduce con
  `.pick()`).
- **Prueba esperada**: integración → "el DTO portal personalizada contiene las
  3 secciones de evaluación y el árbol de ciclos; no contiene `actor`";
  E2E -> las secciones se renderizan en orden.

### RU-42 — Seguridad de sesión y aislamiento
- **Dado** cualquier acceso a "Mi rutina".
- **Cuando** el token es inválido/expirado (-> 401), o el usuario intenta acceder
  a datos de otro cliente (-> 403/404 sin datos, SEC-01/SEC-03), o un rol staff
  usa el endpoint del portal (-> responde SOLO la rutina del cliente de la
  sesión, o 403 según contrato ratificado).
- **Entonces** el comportamiento es el indicado y ningún dato ajeno viaja en la
  respuesta.
- **Prueba esperada**: integración → "sin token 401; token expirado 401;
  `clienteId` ajeno -> 403/404 con `not.toHaveProperty` sobre datos de A".

## Partición de Equivalencia

| Entrada | Partición | Ejemplo | Válido/Inválido |
|---------|-----------|---------|-----------------|
| sesión | Válida: cliente con asignación ACTIVA | token de A | Válido |
| sesión | Válida: cliente sin asignación | token de B | Válido (mensaje RU-39) |
| sesión | Inválida: sin token / expirado | — | Inválido (401) |
| sesión | Inválida: token ajeno / `clienteId` de otro | token de A pidiendo B | Inválido (403/404) |
| tipo de rutina activa | Válida: GENERICA/INDUCCION (sin vigencia) | INDUCCION | Válido |
| tipo de rutina activa | Válida: PERSONALIZADA + vigencia ACTIVA | — | Válido (RU-37) |
| tipo de rutina activa | Inválida (oculta): PERSONALIZADA + CONGELADO/VENCIDA/PROGRAMADA/NO_CONTRATADO | + VENCIDA | No visible (RU-37) |
| contenido | Válido: solo lectura | vista sin formularios | Válido |
| contenido | Inválido: intento de escritura | PATCH con token CLIENTE | Inválido (403, RU-40) |
| respuesta | Inválida: incluye `actor`/`actualizadoPor` | DTO con actor | Inválido (strict, RU-41) |

## Análisis de Valores Límite

| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| asignaciones ACTIVAS mostradas | int | 0 (mensaje) | 1 | — | 2 → imposible (RU-35/RU-36) |
| registros de `tests`/`antropometria`/`analisisBiomecanico` mostrados | int | 0 | 50 | — | 51 → imposible (ya validado en creación) |

## Tabla de Decisiones

### Respuesta de "Mi rutina" (RU-36..RU-39)

| ¿Asignación ACTIVA? | Tipo | ¿Vigencia personalizada ACTIVA? | Respuesta del portal |
|---------------------|------|----------------------------------|----------------------|
| Sí | GENERICA/INDUCCION | — (no aplica) | Rutina visible (RU-38) |
| Sí | PERSONALIZADA | Sí | Versión personalizada vigente visible (RU-37) |
| Sí | PERSONALIZADA | No (NO_CONTRATADO/PROGRAMADA/CONGELADO/VENCIDA) | Sin rutina visible -> mensaje (RU-39); asignación intacta |
| No | — | — | Mensaje "No tienes una rutina activa" (RU-39) |

### Rol × operación en el portal (RU-40/RU-42)

| CLIENTE leer su rutina | CLIENTE editar | CLIENTE leer rutina ajena | staff leer por token de cliente | Acción |
|------------------------|----------------|---------------------------|--------------------------------|--------|
| Sí | — | — | — | 200 (RU-36) |
| — | Sí | — | — | 403/405 (RU-40) |
| — | — | Sí | — | 403/404 sin datos (SEC-01/SEC-03) |
| — | — | — | Sí | solo la rutina de la sesión (o 403 al ratificar) |
| token inválido/expirado | — | — | — | 401 (RU-42) |

## Transiciones de Estado

### Visibilidad de la rutina en el portal (estado derivado de exposición)
| Estado Actual | Evento | Estado Siguiente | Válido |
|--------------|--------|-----------------|--------|
| VISIBLE (genérica/inducción) | — | VISIBLE | Sí |
| VISIBLE (personalizada) | vigencia pasa a CONGELADO/VENCIDA/… | OCULTA (mensaje; asignación intacta) | Sí |
| OCULTA (personalizada) | vigencia vuelve a ACTIVA | VISIBLE | Sí |
| OCULTA | cliente edita | — | **No** (solo lectura, RU-40) |

## Cobertura de Ramas

### Ruta: GET /api/portal/rutina (PROPUESTA)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy personalizada vigente | vigencia ACTIVA | 200 `rutinaPortalPersonalizadaSchema` |
| 2 | Happy genérica/inducción | sin vigencia | 200 `rutinaPortalBaseSchema` |
| 3 | Personalizada con vigencia VENCIDA | — | 200 `sinRutinaPortalSchema` (mensaje) |
| 4 | Personalizada con vigencia CONGELADO | — | 200 mensaje (asignación intacta) |
| 5 | Sin asignación activa | — | 200 mensaje |
| 6 | Cliente con historial cerrado | solo CERRADAS | 200 mensaje (solo se muestra la activa) |
| 7 | sin token / expirado | — | 401 |
| 8 | `clienteId` ajeno | query/body con B | 403/404 sin datos de B |
| 9 | Escritura con token CLIENTE | PATCH/POST/DELETE | 403/405 (RU-40) |
| 10 | Respuesta con `actor` | — | imposible (DTO strict sin campos de staff) |

## Reglas de Validación por Campo

| Campo (DTO portal) | Tipo | Requerido | Regla | Visibilidad |
|--------------------|------|-----------|-------|-------------|
| `tipoRutina` | enum | Sí | `GENERICA`/`INDUCCION`/`PERSONALIZADA` | CLIENTE |
| `asignacionId` | string | Sí | — | CLIENTE |
| `fechaInicio` | fecha | Sí | de la asignación activa | CLIENTE |
| `nombre` | string | Sí | 3..100 | CLIENTE |
| `descripcion`/`objetivo` | string \| null | Sí (nullable) | 1..500 | CLIENTE |
| `nivelExperiencia` | enum \| null | Sí (nullable) | 3 literales | CLIENTE |
| `sesiones[]` | array | Sí (base) | 1..30, `sesionSchema` | CLIENTE |
| `informacionGeneral` | objeto | Sí (personalizada) | `informacionGeneralSchema` | CLIENTE (PEND-07 (a)) |
| `diagnostico` | objeto | Sí (personalizada) | `diagnosticoSchema` | CLIENTE (PEND-07 (a)) |
| `macrociclos[]` | array | Sí (personalizada) | 1..20, `macrocicloSchema` | CLIENTE (PEND-07 (a)) |
| `tests[]`/`antropometria[]`/`analisisBiomecanico[]` | array | Sí (nullable/[]) | 0..50 | CLIENTE (PEND-07 (a)) |
| `mensaje` | string | Sí (sin rutina) | literal PROPUESTO | CLIENTE |
| `actor`/`actualizadoPor` | — | — | **nunca en la respuesta** | STAFF (ficha HU-21) |

Fuente canónica: `HU-26-schemas.ts` (`rutinaPortalSchema`,
`sinRutinaPortalSchema`, `visibleEnPortal`).

## Navegación propuesta

| ID | Pantalla | Estado | Entrada | Salida | Rol | Prueba | Resultado | Evidencia |
|----|----------|--------|---------|--------|-----|--------|-----------|-----------|
| NAV-RU-18 | Portal → "Mi rutina" | Con rutina visible | Card "Mi rutina" desde /portal (fuera de `<nav>`, patrón INC-09) | Volver al portal → /portal; logout → login | CLIENTE | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-19 | Portal → "Mi rutina" | Sin rutina (mensaje) | Card "Mi rutina" | Mensaje visible; Volver al portal; sin bucles | CLIENTE | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-20 | Portal → "Mi rutina" | URL directa / recarga / atrás | URL directa con sesión, recarga, botón Atrás | Misma vista coherente (activa o mensaje); atrás no redirige en bucle | CLIENTE | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-21 | Portal → "Mi rutina" | Solo lectura | Tabulación por la vista | Sin controles de edición alcanzables; foco visible; móvil responsive | CLIENTE | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-22 | Portal → "Mi rutina" | Sesión expirada / PIN obligatorio | Sesión expirada; guard `debeCambiarPin` | 401/redirect al login; guarda PIN -> /portal (patrón INC-09); PIN obligatorio intacto | CLIENTE | E2E | NO VERIFICADO | _pendiente_ |

## PENDs de esta HU

### PEND-RUT-07 — Secciones de la personalizada visibles al cliente
- **Pregunta**: ¿el cliente ve la estructura completa de su personalizada
  (información general, diagnóstico, ciclos, evaluaciones) o solo el plan de
  sesiones?
- **Recomendación (a)**: **estructura completa en solo lectura** (ya modelada en
  `HU-26-schemas.ts`): consistente con HU-28 (el cliente consulta su anamnesis
  completa, incluidos datos de salud, en modo lectura) y con el propósito de
  HU-26 ("consultar mi plan de entrenamiento cuando lo necesite"); los datos son
  del propio cliente y la respuesta excluye campos de staff.
- **Alternativa (b)**: solo el plan de sesiones (oculta diagnóstico, tests,
  antropometría y análisis biomecánico como uso interno del staff) — el DTO se
  reduce con `.pick({ nombre, macrociclos })`; criterio RU-41 se re-equipa.
- **Alternativa (c)**: plan de sesiones + diagnóstico resumen (intermedia).
