# INC-00 - Estabilizacion de Fases 1 y 2

## Objetivo

Convertir lo ya construido en fases 1 y 2 en una base aceptable, segura y verificable antes de avanzar hacia el 50% del MVP.

Este incremento no agrega alcance funcional nuevo salvo lo necesario para cumplir criterios ya comprometidos. Su salida es evidencia confiable para certificar puntos del MVP.

## Alcance incluido

- Privacidad y autorizacion de fichas de cliente.
- Recuperacion de sesion por token vencido, invalido o ausente.
- Cierre de criterios faltantes de clientes basicos.
- Cierre de reglas de membresia gym basica.
- Aislamiento de pruebas y correccion de pruebas debiles.
- Conexion real de Gherkin/ATDD para los escenarios incluidos en el alcance.
- Evidencia reproducible de typecheck, unit, integration, E2E y build segun aplique.

## Fuera de alcance

- Personalizado y nutricion como servicios completos.
- Congelacion de vigencias.
- Recepcion e ingresos.
- Anamnesis.
- Rutinas y planes nutricionales.
- Notificaciones.

## Agentes responsables

| Area | Agente |
|---|---|
| Reglas y criterios | acceptance-criteria-analyst |
| Datos, migraciones y aislamiento | database-admin |
| API y negocio | backend-developer |
| UI y recuperacion de sesion | frontend-developer |
| Pruebas y ATDD/E2E | test-engineer |
| Revision final | code-reviewer |
| Automatizacion local/CI | devops-engineer |

## Criterios de aceptacion

### Seguridad y privacidad

| ID | Criterio |
|---|---|
| INC00-SEC-01 | Un CLIENTE autenticado solo puede consultar su propia ficha. Intentar consultar otro cliente devuelve 403 sin datos privados. |
| INC00-SEC-02 | DUENO y RECEPCIONISTA pueden consultar clientes segun permisos operativos aprobados. |
| INC00-SEC-03 | Ninguna respuesta de cliente, auth o membresia expone hash de PIN. |
| INC00-SEC-04 | Reset de PIN registra actor y queda cubierto por prueba de trazabilidad funcional. |

### Sesion

| ID | Criterio |
|---|---|
| INC00-AUTH-01 | JWT vencido devuelve 401 `AUTH_TOKEN_EXPIRED` y dispara una sola recuperacion centralizada. |
| INC00-AUTH-02 | La recuperacion cierra sesion, limpia datos privados y muestra el mensaje aprobado. |
| INC00-AUTH-03 | El usuario vuelve al login correcto segun tipo de sesion y puede regresar a la pantalla original cuando aplica. |
| INC00-AUTH-04 | Credenciales invalidas devuelven `AUTH_INVALID_CREDENTIALS` y no disparan logout global. |
| INC00-AUTH-05 | 403 conserva sesion y muestra mensaje de permiso insuficiente. |
| INC00-AUTH-06 | Error de red conserva sesion y ofrece reintento o mensaje de indisponibilidad. |
| INC00-AUTH-07 | Un 401 tardio de una sesion anterior no cierra una sesion nueva. |

### Clientes

| ID | Criterio |
|---|---|
| INC00-CLI-01 | Crear cliente valida cedula, telefono, sede, nombres, apellidos y unicidad. |
| INC00-CLI-02 | Editar cliente permite actualizar sede y estado cuando el permiso lo autoriza. |
| INC00-CLI-03 | Email y observaciones pueden limpiarse de forma intencional. |
| INC00-CLI-04 | Buscar y filtrar por cedula, nombre, sede y estado funciona con resultados deterministas. |
| INC00-CLI-05 | La UI cubre filtros acordados, estados vacios, errores y paginacion definida para la lista. |

### Membresia gym

| ID | Criterio |
|---|---|
| INC00-MEM-01 | Crear periodo rechaza fecha invalida, fin anterior a inicio y duracion menor a un dia. |
| INC00-MEM-02 | Crear o editar periodo rechaza solapamientos con 409 `MEMBRESIA_SOLAPADA`. |
| INC00-MEM-03 | Dos cambios concurrentes sobre la misma version dejan exactamente uno persistido; el otro recibe 409 `MEMBRESIA_CONFLICTO`. |
| INC00-MEM-04 | La auditoria registra actor, accion, version y fechas anteriores/nuevas dentro de la misma transaccion. |
| INC00-MEM-05 | El estado sin membresia, programada, activa o vencida se calcula con `America/Bogota` y extremos inclusivos. |
| INC00-MEM-06 | Un preset de 30 dias produce exactamente 30 dias calendario inclusivos. |
| INC00-MEM-07 | La API no permite persistir fechas vacias. |

### Pruebas y evidencia

| ID | Criterio |
|---|---|
| INC00-QA-01 | No quedan pruebas con `expect(true).toBe(true)` para simular aceptacion. |
| INC00-QA-02 | Los E2E criticos no dependen de `if (isVisible())` para saltar pasos del flujo. |
| INC00-QA-03 | Los filtros se prueban con fixtures que garantizan al menos un resultado esperado y un resultado excluido. |
| INC00-QA-04 | Las pruebas de integracion usan datos aislados o limpieza deterministica. |
| INC00-QA-05 | Existe evidencia de comandos ejecutados y resultado para API y web. |
| INC00-QA-06 | Los escenarios Gherkin incluidos en el alcance se ejecutan realmente. |

## Plan de ejecucion por agentes

1. `acceptance-criteria-analyst`: convertir estos criterios en casos verificables y gaps por archivo.
2. `test-engineer`: escribir o corregir pruebas RED para los gaps bloqueantes.
3. `database-admin`: resolver aislamiento de BD y revisar restricciones necesarias para concurrencia.
4. `backend-developer`: corregir privacidad, validaciones y transacciones.
5. `frontend-developer`: corregir recuperacion de sesion, filtros y membresias UI.
6. `test-engineer`: completar integracion/E2E y ejecutar verificacion.
7. `code-reviewer`: revisar seguridad, concurrencia, privacidad y calidad de pruebas.
8. `devops-engineer`: dejar comandos reproducibles y, si aplica, CI.
9. Orquestador: actualizar `docs/producto/avance.md` con puntos aceptados.

## Evidencia requerida

| Tipo | Evidencia minima |
|---|---|
| API typecheck | Comando, fecha, salida resumida |
| API unit/integration | Comando, numero de tests, fallos o aprobacion |
| Prisma | Validacion/generacion y migracion si aplica |
| Web typecheck | Comando y salida resumida |
| Web unit | Comando y resultado |
| Web build | Comando y resultado |
| E2E | Comando, navegador, entorno y resultado |
| Revision | Lista de hallazgos cerrados o riesgos residuales |
