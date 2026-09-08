# Criterios de Aceptación - HU-07: Ficha única del cliente

## Resumen
Vista unificada que muestra datos personales, sede, estado, vigencias de membresía (gym, personalizado, nutrición), rutina activa, plan nutricional, notas internas e historial básico.

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| id | UUID existente | uid-123 | No existe | uid-xxx |

## Cobertura de Ramas
### Ruta: GET /api/clientes/:id
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path | id existente | 200 ficha completa |
| 2 | cliente inexistente | id no existente | 404 Cliente no encontrado |
| 3 | sin membresías | id sin membresías | 200 ficha con array vacío de membresías |
| 4 | sin rutina | id sin rutina activa | 200 ficha con rutina null |
| 5 | sin plan nutricional | id sin plan | 200 ficha con planNutricional null |
| 6 | sin notas | id sin notas | 200 ficha con array vacío de notas |

## Estructura de respuesta esperada
```json
{
  "id": "string",
  "cedula": "string",
  "nombres": "string",
  "apellidos": "string",
  "telefono": "string",
  "email": "string | null",
  "estado": "string",
  "observaciones": "string | null",
  "sede": { "id": "string", "nombre": "string", "direccion": "string | null" },
  "membresias": [
    {
      "id": "string",
      "tipo": "GYM | PERSONALIZADO | NUTRICION",
      "fechaInicio": "date",
      "fechaFin": "date",
      "estado": "string"
    }
  ],
  "rutinaActiva": { "id": "string", "nombre": "string", ... } | null,
  "planNutricionalActivo": { "id": "string", "nombre": "string", ... } | null,
  "notasInternas": [{ "id": "string", "contenido": "string", "createdAt": "date" }],
  "historial": [{ "id": "string", "accion": "string", "fecha": "date", "usuario": "string" }]
}
```

## Reglas de Validación por Campo
| Campo | Tipo | Requerido | Regex | Longitud | Valores Permitidos |
|-------|------|-----------|-------|----------|-------------------|
| id | string | sí (params) | - | 1-36 | UUID |

## Gaps vs código actual
- `src/routes/clientes.ts:25-32` solo retorna `getClienteById` que hace include de `sede`, pero NO incluye membresías, rutina, planNutricional, notasInternas ni historial.
- `src/services/cliente.service.ts:44-48` solo incluye `sede`, faltan relaciones: membresías, rutinas, planes, notas, historial.
- No existe endpoint dedicado para ficha unica; la HU requiere que el dueño vea la información completa en una sola vista.
- Falta RBAC: cualquier usuario autenticado puede ver la ficha completa (debería ser solo DUENO según la HU).
