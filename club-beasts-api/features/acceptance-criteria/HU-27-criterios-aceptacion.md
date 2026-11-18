# Criterios de Aceptación - HU-27: Visualización del plan nutricional activo

## Resumen

El cliente visualiza **solo su plan nutricional activo** (alimentos, cantidades,
recomendaciones) en solo lectura; mensaje claro si no hay plan; gate por servicio
de nutricion vigente (analogia DEC-060/DEC-068). **Nunca actor** (DEC-041 analogo).

**Incremento**: INC-12-nutricion. Criterios **NU-36..NU-42**.

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado inicial |
|---|-----------------|-----------|----------------|
| 1 | El cliente visualiza solo su plan nutricional activo. | NU-36 (solo el suyo) + NU-37 (gate) | NO VERIFICADO |
| 2 | El portal muestra alimentos, cantidades y recomendaciones. | NU-38 (contenido completo) | NO VERIFICADO |
| 3 | Si no existe un plan activo, el portal muestra un mensaje claro. | NU-39 (`SIN_PLAN_MENSAJE`) + NU-40 (oculta por vigencia) | NO VERIFICADO |
| 4 | El cliente no puede editar el contenido. | NU-41 (solo lectura) | NO VERIFICADO |

Transversales: NU-42 (permisos/aislamiento por cliente).

## Detalle por criterio

### NU-36 — Solo su plan activo
- **Dado** un cliente autenticado.
- **Cuando** consulta su plan nutricional.
- **Entonces** solo ve el plan asignado a él (aislamiento por cliente; nunca otro cliente).
- **Prueba esperada**: integración `hu27-portal-plan.test.ts` → cliente A no ve plan de B.

### NU-37 — Gate por servicio de nutricion vigente
- **Dado** un cliente con plan asignado pero servicio de nutricion NO activo (VENCIDA/CONGELADO/etc.).
- **Cuando** consulta su plan.
- **Entonces** el plan se oculta (`OCULTA_POR_VIGENCIA`) y se muestra el mensaje `SIN_PLAN_MENSAJE` ("No tienes un plan nutricional activo"); la asignación queda intacta (DEC-066 analogo).
- **Prueba esperada**: integración → nutricion VENCIDA → oculto + mensaje.

### NU-38 — Contenido completo (alimentos, cantidades, recomendaciones)
- **Dado** un plan activo visible.
- **Cuando** el cliente lo consulta.
- **Entonces** ve datos biometricos/objetivos, macros (manual), tiempos de comida con alimentos y cantidades, recomendaciones y suplementacion.
- **Prueba esperada**: integración → GET portal devuelve el snapshot completo.

### NU-39 — Mensaje claro si no hay plan activo
- **Dado** un cliente sin plan activo.
- **Cuando** consulta su plan.
- **Entonces** el portal muestra `SIN_PLAN_MENSAJE` = "No tienes un plan nutricional activo" (sin error 500).
- **Prueba esperada**: integración → sin plan → mensaje.

### NU-40 — Oculto por vigencia (marcador staff vs portal)
- **Dado** un cliente con plan pero nutricion no vigente.
- **Cuando** consulta en el portal.
- **Entonces** se trata como "sin plan vigente" (mensaje claro) para el cliente; el marcador `OCULTA_POR_VIGENCIA` es interno/staff.
- **Prueba esperada**: integración → portal no expone `OCULTA_POR_VIGENCIA` al cliente.

### NU-41 — Solo lectura (sin edición)
- **Dado** un cliente.
- **Cuando** intenta editar el plan (PUT/PATCH/DELETE).
- **Entonces** 403/405; el cliente jamás edita (DEC-068 analogo).
- **Prueba esperada**: integración → intento de edición por CLIENTE → 403.

### NU-42 — Permisos y aislamiento
- **Dado** los roles DUENO, RECEPCIONISTA y CLIENTE.
- **Cuando** CLIENTE accede a `/portal/plan-nutricional`.
- **Entonces** 200 solo con su plan; DUENO/RECEPCIONISTA no usan el portal del cliente (usan gestión); sin token 401. **Nunca actor** en la respuesta.
- **Prueba esperada**: integración → matriz rol × acceso; respuesta sin `actor`.

## Partición de Equivalencia

| Entrada | Partición | Ejemplo | Válido/Inválido |
|---------|-----------|---------|-----------------|
| cliente autenticado | Válida: CLIENTE | — | Válido |
| cliente autenticado | Inválida: DUENO/RECEPCIONISTA en portal | — | Inválido (403) |
| plan activo | Válida: existe y vigente | — | Válido |
| plan activo | Inválida: no existe | — | Inválido (NU-39) |
| servicio nutricion | Válida: ACTIVA | — | Válido |
| servicio nutricion | Inválida: VENCIDA/CONGELADO/etc. | — | Inválido (NU-37/40) |
| operación | Válida: GET (lectura) | — | Válido |
| operación | Inválida: POST/PUT/PATCH/DELETE | — | Inválido (NU-41) |

## Análisis de Valores Límite

| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| planes visibles al cliente | int | 0 | 1 | — | 2 → imposible (invariante 0-1) |

## Tabla de Decisiones

### Lectura en portal
| Cliente autenticado | Plan asignado activo | Servicio nutricion vigente | Acción |
|---------------------|----------------------|---------------------------|--------|
| Sí (CLIENTE) | Sí | ACTIVA | 200 plan completo (NU-38) |
| Sí (CLIENTE) | Sí | VENCIDA/CONGELADO/etc. | 200 mensaje "No tienes un plan nutricional activo" (NU-37/40) |
| Sí (CLIENTE) | No | — | 200 mensaje "No tienes un plan nutricional activo" (NU-39) |
| Sí (DUENO/RECEPCIONISTA) | — | — | 403 (NU-42) |
| No (sin token) | — | — | 401 (NU-42) |

### Operación × rol
| Rol | GET /portal/plan-nutricional | POST/PUT/PATCH/DELETE | Acción |
|-----|------------------------------|----------------------|--------|
| CLIENTE | 200 (solo el suyo) | 403/405 | NU-41/42 |
| DUENO | 403 (usa gestión) | 403 | NU-42 |
| RECEPCIONISTA | 403 | 403 | NU-42 |

## Cobertura de Ramas

### Ruta: GET /portal/plan-nutricional (PROPUESTA)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy con plan vigente | CLIENTE con plan + nutricion ACTIVA | 200 plan completo (sin actor) |
| 2 | Sin plan | CLIENTE sin asignación | 200 `SIN_PLAN_MENSAJE` |
| 3 | Oculto por vigencia | nutricion VENCIDA | 200 `SIN_PLAN_MENSAJE` |
| 4 | rol no autorizado | DUENO/RECEPCIONISTA | 403 |
| 5 | sin token | — | 401 |
| 6 | intento de edición | PATCH/DELETE por CLIENTE | 403/405 |

## Reglas de Validación por Campo

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| respuesta plan | object | — | snapshot completo (HU-22) |
| `actor` | — | — | **nunca se expone** al cliente (DEC-041 analogo) |
| `SIN_PLAN_MENSAJE` | string | — | "No tienes un plan nutricional activo" |

Fuente canónica: `HU-27-schemas.ts` + `HU-22-schemas.ts` + `HU-23-schemas.ts`.

## Navegación propuesta

| ID | Pantalla | Estado | Entrada | Salida | Rol | Prueba | Resultado | Evidencia |
|----|----------|--------|---------|--------|-----|--------|-----------|-----------|
| NAV-NUT-21 | Portal → Mi plan nutricional | Con plan vigente | Portal → "Mi plan nutricional" | Vista completa solo lectura; Volver → portal | CLIENTE | E2E | NO VERIFICADO | _pendiente_ |
| NAV-NUT-22 | Portal → Mi plan nutricional | Sin plan / oculto por vigencia | Portal → "Mi plan nutricional" | Mensaje claro; Volver → portal | CLIENTE | E2E | NO VERIFICADO | _pendiente_ |
| NAV-NUT-23 | Portal → Mi plan nutricional | Recarga / URL directa / atrás | Recarga, URL directa, botón Atrás | Vista coherente con la asignación persistida; sin bucles | CLIENTE | E2E | NO VERIFICADO | _pendiente_ |
| NAV-NUT-24 | Portal → Mi plan nutricional | Sesión expirada | Token expirado | Redirect a login; sin datos sensibles | CLIENTE | E2E | NO VERIFICADO | _pendiente_ |

Transversal: móvil/escritorio, teclado con foco visible, guarda PIN obligatorio intacta. No aplica: gestión staff (HU-22/23/24).

## PENDs de esta HU

### PEND-NUT-07 — Portal solo lectura (analogia DEC-068)
- **Recomendación (a)**: el cliente ve su plan completo en solo lectura; nunca actor; sin edición.