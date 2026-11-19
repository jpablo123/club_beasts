# Criterios de Aceptación - HU-36: Asignar rutina a clientes desde la rutina

## Resumen
Permite a DUENO asignar una rutina a uno o varios clientes desde el detalle de la rutina, con gate de vigencia personalizada (DEC-066) por cliente y respuesta parcial exitos/fallos.

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| rutinaId | UUID existente | rut-001 | UUID inexistente | rut-999 |
| clienteIds | array UUID no vacío | [c1,c2] | array vacío | [] |
| rol | DUENO | DUENO | ENTRENADOR | ENTRENADOR |

## Reglas de Validación por Campo
| Campo | Tipo | Requerido | Valores Permitidos |
|-------|------|-----------|-------------------|
| rutinaId | UUID | Sí | existe |
| clienteIds | UUID[] | Sí | min 1 |
| rol | enum | Sí | DUENO |

## Tabla de Decisiones
### Asignación por cliente (DEC-066 gate)
| Rutina activa | Cliente con vigencia personalizada activa | Acción |
|---------------|------------------------------------------|--------|
| Sí | Sí | Asigna (éxito) |
| Sí | No | Fallo por cliente (sin vigencia personalizada) |
| No | - | 409 rutina inactiva |

## Cobertura de Ramas
### Ruta: POST /api/rutinas/:id/asignar-clientes
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Asignar a un cliente válido | [c1] | 200, exitos:[c1], fallos:[] |
| 2 | Asignar a varios | [c1,c2] | exitos parciales según gate |
| 3 | Cliente sin vigencia personalizada | [c3] | fallos:[{cliente:c3, motivo}] |
| 4 | Rol no DUENO | ENTRENADOR | 403 |
| 5 | Array vacío | [] | 400 |
| 6 | Rutina inexistente | id falso | 404 |

## Pendientes bloqueantes
- PEND-PULIDO-02: asignación bulk — respuesta parcial (exitos/fallos) o todo-o-nada (recomendado: parcial).
