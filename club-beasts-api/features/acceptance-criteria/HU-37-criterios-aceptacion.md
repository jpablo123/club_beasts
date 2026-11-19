# Criterios de Aceptación - HU-37: Presets de duración para servicio personalizado

## Resumen
Permite a DUENO elegir duración (1/3/6 meses) al crear un servicio personalizado; fechaFin se calcula automáticamente pero editable manualmente después.

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| duracionMeses | 1,3,6 | 3 | 0,2,7 | 2 |
| fechaInicio | fecha válida | 2026-11-19 | fecha pasada inválida | "" |
| fechaFin | calculada o manual | 2027-02-19 | anterior a inicio | 2026-10-01 |

## Reglas de Validación por Campo
| Campo | Tipo | Requerido | Valores Permitidos |
|-------|------|-----------|-------------------|
| duracionMeses | number | Sí (preset) | 1,3,6 |
| fechaInicio | date | Sí | ISO date |
| fechaFin | date | Sí | >= fechaInicio |

## Tabla de Decisiones
### Preset vs manual
| Preset seleccionado | fechaFin | Acción |
|--------------------|----------|--------|
| Sí | auto | calcula fechaInicio + N meses |
| No (personalizado) | manual | valida fechaFin >= fechaInicio |

## Cobertura de Ramas
### Ruta: POST /api/servicios (personalizado)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Preset 1 mes | duracionMeses=1 | fechaFin = inicio +1 mes |
| 2 | Preset 3 meses | duracionMeses=3 | fechaFin = inicio +3 meses |
| 3 | Preset 6 meses | duracionMeses=6 | fechaFin = inicio +6 meses |
| 4 | fechaFin manual válida | fechaFin > inicio | acepta |
| 5 | fechaFin anterior a inicio | fechaFin < inicio | 400 |
| 6 | duracionMeses inválida | 2 | 400 |

## Pendientes bloqueantes
- PEND-PULIDO-03: presets 1/3/6 meses o también personalizado (recomendado: presets + edición manual).
