# Criterios de Aceptación - HU-22: Creación de plan nutricional estructurado

## Resumen

Permitir al DUENO crear un **plan nutricional estructurado** (datos biometricos y
objetivos caloricos, distribucion manual de macronutrientes, tiempos de comida con
alimentos y cantidades, recomendaciones y suplementacion). El sistema **NO calcula
macros automaticamente** (HU-22 c5, DEC-019).

**Incremento**: INC-12-nutricion (bloque 7, 12 pts MVP). Criterios **NU-01..NU-08**
de esta HU (secuencia NU-01..NU-42 unica del bloque).

**Decisiones aplicadas**:
- DEC-019: el plan nutricional usa **plantilla simple** (no macro-meso-micro).
- DEC-065 (analogia): solo DUENO crea/edita (PEND-NUT-06 rec (a)).
- DEC-066 (analogia): gate de vigencia (PEND-NUT-05).
- DEC-016: fraccion por bullets; la asignacion se acredita en HU-23.
- PEND-NUT-01..04: estructura biometricos/macros/tiempos/recomendaciones (pendientes).
- Sin calculo automatico de macros (no-goals).

Códigos HTTP/endpoints: **PROPUESTA**.

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado inicial |
|---|-----------------|-----------|----------------|
| 1 | Registrar datos biometricos y objetivos caloricos. | NU-01 (+ NU-02) | NO VERIFICADO |
| 2 | Registrar distribucion de macronutrientes manual. | NU-03 (+ NU-02) | NO VERIFICADO |
| 3 | Registrar tiempos de comida y detalle de alimentos. | NU-04 (+ NU-02) | NO VERIFICADO |
| 4 | Registrar recomendaciones y suplementacion. | NU-05 (+ NU-02) | NO VERIFICADO |
| 5 | El sistema no calcula macros automaticamente. | NU-06 (guarda de no-calculo) | NO VERIFICADO |

Transversales: NU-07 (permisos), NU-08 (recurso inexistente/contrato cerrado).

## Detalle por criterio

### NU-01 — Creación con datos biometricos y objetivos caloricos
- **Dado** un actor DUENO autenticado.
- **Cuando** envía `crearPlanNutricionalSchema` con `datosBiometricos` válido y `objetivosCaloricos` válido.
- **Entonces** el sistema registra el plan (201 PROPUESTA) con los datos exactos.
- **Prueba esperada**: integración `hu22-plan-creacion.test.ts` → POST 201.

### NU-02 — Validación de campos de creación
- **Dado** un envío `crearPlanNutricionalSchema`.
- **Cuando** falta un campo requerido o está fuera de rango.
- **Entonces** 400 con mensaje específico por campo.
- **Prueba esperada**: unidad (schema) → cada tabla de valores límite y partición.

### NU-03 — Distribucion manual de macronutrientes
- **Dado** un envío con `macronutrientes` (proteinas/carbohidratos/grasas en g o %).
- **Cuando** los valores son válidos (texto/numero manual, PEND-NUT-02).
- **Entonces** se persisten tal cual, sin recalcular ni derivar.
- **Qué NO cubre**: calculo automatico (NU-06 lo prohíbe).
- **Prueba esperada**: integración → POST con macros; GET devuelve los mismos valores.

### NU-04 — Tiempos de comida y detalle de alimentos
- **Dado** un envío con `tiemposComida[]` (nombre del tiempo + alimentos con cantidad/unidad).
- **Cuando** hay al menos 1 tiempo con al menos 1 alimento.
- **Entonces** se persisten ordenados.
- **Prueba esperada**: integración → POST con 2 tiempos; GET devuelve la estructura.

### NU-05 — Recomendaciones y suplementacion
- **Dado** un envío con `recomendaciones` y/o `suplementacion`.
- **Cuando** son texto libre válido (PEND-NUT-04).
- **Entonces** se persisten tal cual.
- **Prueba esperada**: integración → POST; GET devuelve texto.

### NU-06 — No calculo automatico de macros (guarda)
- **Dado** cualquier entrada.
- **Cuando** se crea/edita un plan.
- **Entonces** el sistema NO calcula, deriva ni valida coherencia calorica/macros; solo persiste lo enviado. Si un campo de "calculo" llega en el body → 400 (strict).
- **Prueba esperada**: unidad → no existe función de cálculo; integración → body con campo `caloriasCalculadas` → 400.

### NU-07 — Permisos de gestión
- **Dado** los roles DUENO, RECEPCIONISTA y CLIENTE.
- **Cuando** cualquiera distinto de DUENO intenta crear/editar.
- **Entonces** 403; DUENO sí. CLIENTE jamás (solo portal HU-27).
- **Prueba esperada**: integración → matriz rol × operación.

### NU-08 — Recurso inexistente y contrato cerrado
- **Dado** operación sobre `planId` inexistente o body con campos desconocidos.
- **Entonces** 404 `NOT_FOUND` / 400 (strict).
- **Prueba esperada**: integración → 404; unidad → campo desconocido.

## Partición de Equivalencia

| Campo | Partición | Ejemplo | Válido/Inválido |
|-------|-----------|---------|-----------------|
| `datosBiometricos` | Válida: objeto con peso/talla/% grasa | `{ pesoKg: 70, tallaCm: 175 }` | Válido |
| `datosBiometricos` | Inválida: vacío / campos no numéricos | `{ pesoKg: "x" }` | Inválido |
| `objetivosCaloricos` | Válida: entero 500..6000 | `2200` | Válido |
| `objetivosCaloricos` | Inválida: <500 o >6000 | `100`, `10000` | Inválido |
| `macronutrientes` | Válida: proteínas/carbohidratos/grasas manual | `{ proteinaG: 150, carboG: 200, grasaG: 70 }` | Válido |
| `tiemposComida[]` | Válida: ≥1 tiempo con ≥1 alimento | 1 tiempo | Válido |
| `tiemposComida[]` | Inválida: 0 tiempos | `[]` | Inválido |
| `tiempo.alimentos[]` | Inválida: 0 alimentos | `[]` | Inválido |
| `recomendaciones`/`suplementacion` | Válida: 1..2000 chars o null | `"Tomar agua"` | Válido |
| body | Inválido: campo desconocido | `{ extra: 1 }` | Inválido (strict) |
| body | Inválido: campo de cálculo | `{ caloriasCalculadas: 2000 }` | Inválido (strict, NU-06) |

## Análisis de Valores Límite

| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| `objetivosCaloricos` | int | 500 | 6000 | 499 → 400 | 6001 → 400 |
| `pesoKg` | number | 30 | 300 | 29.9 → 400 | 300.1 → 400 |
| `tallaCm` | int | 100 | 250 | 99 → 400 | 251 → 400 |
| `tiemposComida[]` | array | 1 | 12 | 0 → 400 | 13 → 400 |
| `tiempo.alimentos[]` | array | 1 | 30 | 0 → 400 | 31 → 400 |
| `recomendaciones` | string | 1 | 2000 | 0 → 400 | 2001 → 400 |

## Tabla de Decisiones

### Creación (NU-01/NU-02)
| datosBiometricos válido | objetivosCaloricos válido | tiemposComida ≥1 | Resto válido | Acción |
|-------------------------|--------------------------|------------------|--------------|--------|
| Sí | Sí | Sí | Sí | 201 creado (NU-01) |
| Sí | Sí | Sí | No | 400 mensaje por campo (NU-02) |
| Sí | Sí | No | — | 400 "Debe registrar al menos 1 tiempo de comida" |
| Sí | No | — | — | 400 "Objetivos calóricos fuera de rango" |
| No | — | — | — | 400 "Datos biométricos inválidos" |
| Campo desconocido/cálculo | — | — | — | 400 (strict, NU-06/NU-08) |

### Rol × operación (NU-07, PEND-NUT-06 rec (a))
| DUENO | RECEPCIONISTA | CLIENTE | Operación | Acción |
|-------|---------------|---------|-----------|--------|
| Sí | — | — | crear/editar plan | 201/200 |
| — | Sí | — | crear/editar plan | 403 |
| — | — | Sí | crear/editar plan | 403 |
| — | — | — | sin token | 401 |

## Cobertura de Ramas

### Ruta: POST /planes-nutricionales (PROPUESTA)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path completo | body completo válido | 201 + DTO |
| 2 | datosBiometricos faltante | sin datosBiometricos | 400 |
| 3 | objetivosCaloricos fuera de rango | 100 / 10000 | 400 |
| 4 | tiemposComida vacío | `[]` | 400 |
| 5 | alimento sin cantidad | `{}` | 400 |
| 6 | campo de cálculo | `{ caloriasCalculadas }` | 400 (strict) |
| 7 | campo desconocido | `{ extra }` | 400 (strict) |
| 8 | rol no autorizado | RECEPCIONISTA/CLIENTE | 403 |
| 9 | sin token | — | 401 |

### Ruta: PATCH /planes-nutricionales/:planId (PROPUESTA)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Update parcial | solo recomendaciones | 200, resto conservado |
| 2 | plan inexistente | id fantasma | 404 |
| 3 | campo de cálculo | `{ caloriasCalculadas }` | 400 (strict) |
| 4 | rol no autorizado | RECEPCIONISTA | 403 |

## Reglas de Validación por Campo

| Campo | Tipo | Requerido | Regex / Rango | Longitud | Valores Permitidos |
|-------|------|-----------|---------------|----------|-------------------|
| `datosBiometricos` | object | Sí | — | — | `{ pesoKg, tallaCm, porcentajeGrasa?, ... }` (PEND-NUT-01) |
| `objetivosCaloricos` | int | Sí | 500..6000 | — | — |
| `macronutrientes` | object | No (nullish) | manual (g o %) | — | PEND-NUT-02 |
| `tiemposComida[]` | array | Sí | — | 1..12 | `tiempoComidaSchema` |
| `tiempo.nombre` | string | Sí | — | 1..60 | — |
| `tiempo.alimentos[]` | array | Sí | — | 1..30 | `alimentoSchema` |
| `alimento.nombre` | string | Sí | — | 1..120 | — |
| `alimento.cantidad` | number | Sí | >0 | — | — |
| `alimento.unidad` | string | Sí | — | 1..20 | g, ml, porcion, etc. |
| `recomendaciones` | string | No (nullish) | — | 1..2000 | — |
| `suplementacion` | string | No (nullish) | — | 1..2000 | — |

Fuente canónica: `HU-22-schemas.ts`.

## Navegación propuesta (matriz criterio/pantalla/estado/entrada/salida/rol/prueba)

| ID | Pantalla | Estado | Entrada | Salida | Rol | Prueba | Resultado | Evidencia |
|----|----------|--------|---------|--------|-----|--------|-----------|-----------|
| NAV-NUT-01 | Listado de planes nutricionales | Normal | Menú staff / URL directa con sesión | "Crear plan" → formulario; detalle → vista | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-NUT-02 | Formulario crear plan | Vacío | Listado → "Crear plan" | Guardar → detalle/listado; Cancelar → listado; Volver → listado | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-NUT-03 | Formulario crear plan | Con datos sin guardar | Intento de salida | Confirmación o salida sin persistir (patrón C5 INC-09) | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-NUT-04 | Formulario crear plan | Recarga / URL directa / atrás | Recarga, URL directa, botón Atrás | Estado coherente; sin bucles | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-NUT-05 | Gestión de planes | Sesión expirada / rol no autorizado | URL directa de gestión | 403/redirect; logout → login | DUENO | E2E | NO VERIFICADO | _pendiente_ |

Transversal: responsive móvil/escritorio, teclado con foco visible, sin enlaces rotos ni bucles, guarda PIN obligatorio intacta. No aplica: portal del cliente (HU-27).

## PENDs de esta HU

### PEND-NUT-01 — Estructura de datos biometricos y objetivos caloricos
- **Pregunta**: ¿campos fijos (peso, talla, % grasa, etc.) o libres?
- **Recomendación (a)**: campos fijos tipados (pesoKg, tallaCm, porcentajeGrasa, etc.) con rangos.
- **Alternativa (b)**: objeto libre (JSON) sin validación estricta.

### PEND-NUT-02 — Formato de macros
- **Pregunta**: ¿texto libre o números con unidad?
- **Recomendación (a)**: números con unidad (g o %), manual, sin cálculo.

### PEND-NUT-03 — Tiempos de comida
- **Pregunta**: ¿estructura fija (desayuno/almuerzo/...) o libre?
- **Recomendación (a)**: libre (nombre del tiempo + alimentos), mínimo 1.

### PEND-NUT-04 — Recomendaciones y suplementacion
- **Pregunta**: ¿texto libre o estructurado?
- **Recomendación (a)**: texto libre con límite de longitud.