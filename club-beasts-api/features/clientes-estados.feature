@inc04
Feature: Cambio de estado del cliente con motivo e historial
  Como dueño o recepcionista del gimnasio
  Quiero cambiar el estado de un cliente exigiendo un motivo
  Para que cada cambio quede trazado con actor, fecha y motivo

  # INC04-EST-03 (HU17-C02, DEC-035): el motivo es obligatorio en todo
  # cambio de estado. Materialización D4 del G14: "(omitido)" = campo ausente.
  Scenario: Cambiar el estado sin motivo retorna 400 y el estado no cambia
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9924000001"
    When cambio el estado del cliente de prueba a "INACTIVO" con motivo "(omitido)"
    Then el sistema retorna estado 400
    And el mensaje de error es exactamente "Motivo es requerido cuando cambia el estado"
    And el cliente de prueba conserva el estado "ACTIVO"
    And el historial de cambios de estado del cliente de prueba tiene 0 filas

  Scenario: Un motivo de dos caracteres es rechazado con el mensaje exacto
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9924000002"
    When cambio el estado del cliente de prueba a "INACTIVO" con motivo "No"
    Then el sistema retorna estado 400
    And el mensaje de error es exactamente "Motivo debe tener al menos 3 caracteres"
    And el cliente de prueba conserva el estado "ACTIVO"

  Scenario: Un motivo de 201 caracteres es rechazado con el mensaje exacto
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9924000003"
    When cambio el estado del cliente de prueba a "INACTIVO" con motivo "(201 caracteres)"
    Then el sistema retorna estado 400
    And el mensaje de error es exactamente "Motivo no puede exceder 200 caracteres"
    And el cliente de prueba conserva el estado "ACTIVO"

  Scenario: Un motivo vacío literal también es rechazado
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9924000004"
    When cambio el estado del cliente de prueba a "INACTIVO" con motivo ""
    Then el sistema retorna estado 400
    And el mensaje de error es exactamente "Motivo debe tener al menos 3 caracteres"

  # INC04-EST-02 (HU17-C03): historial en la misma transacción del cambio.
  Scenario: El cambio de estado persiste motivo, actor e historial a la vez
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9924000005"
    When cambio el estado del cliente de prueba a "INACTIVO" con motivo "Mudanza de ciudad"
    Then el sistema retorna estado 200
    And la respuesta del cambio de estado expone el motivo "Mudanza de ciudad"
    And el historial de cambios de estado del cliente de prueba tiene 1 filas
    And el último cambio del cliente de prueba registra "ACTIVO" a "INACTIVO"
    And el motivo del último cambio del cliente de prueba es "Mudanza de ciudad"
    And el actor del último cambio del cliente de prueba es el usuario autenticado

  Scenario: El motivo del último cambio queda recuperable en la ficha
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9924000006"
    When cambio el estado del cliente de prueba a "INACTIVO" con motivo "Falta de pago"
    And edito el teléfono del cliente de prueba a "3001234567" con motivo viajero "Falta de pago"
    And consulto la ficha del cliente de prueba como staff
    Then la ficha del staff expone el motivo "Falta de pago"
    And el historial de cambios de estado del cliente de prueba tiene 1 filas

  # INC04-EST-03 / CONF-07: el motivo viajero sin estado se ignora.
  Scenario: Un motivo sin cambio de estado no escribe historial
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9924000007"
    When edito el teléfono del cliente de prueba a "3009998877" con motivo viajero "Motivo sin estado"
    Then el sistema retorna estado 200
    And el cliente de prueba conserva el estado "ACTIVO"
    And el historial de cambios de estado del cliente de prueba tiene 0 filas

  # INC04-EST-04 (HU17-C03): el historial se acumula, nunca se reemplaza.
  Scenario: Tres cambios consecutivos acumulan tres registros encadenados
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9924000008"
    When cambio el estado del cliente de prueba a "SUSPENDIDO" con motivo "Falta de pago"
    And cambio el estado del cliente de prueba a "INACTIVO" con motivo "Baja temporal"
    And cambio el estado del cliente de prueba a "ACTIVO" con motivo "Reactivación autorizada"
    Then el sistema retorna estado 200
    And el historial de cambios de estado del cliente de prueba tiene 3 filas
    And el último cambio del cliente de prueba registra "INACTIVO" a "ACTIVO"

  # INC04-EST-05 (HU17-C04, DEC-038): matriz ratificada 5x5.
  Scenario: Cambiar un cliente al mismo estado no registra historial
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9924000009"
    When cambio el estado del cliente de prueba a "ACTIVO" con motivo "Confirmación de estado"
    Then el sistema retorna estado 200
    And el cliente de prueba conserva el estado "ACTIVO"
    And el historial de cambios de estado del cliente de prueba tiene 0 filas

  Scenario: RETIRADO es un estado terminal y no admite transiciones
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9924000010"
    And el cliente de prueba tiene estado "RETIRADO"
    When cambio el estado del cliente de prueba a "ACTIVO" con motivo "Intento de reactivación"
    Then el sistema retorna estado 409
    And el sistema responde con el código de error "TRANSICION_INVALIDA"
    And el mensaje de error es exactamente "Transición de estado no permitida"
    And el cliente de prueba conserva el estado "RETIRADO"
    And el historial de cambios de estado del cliente de prueba tiene 0 filas

  Scenario: Un cliente INACTIVO puede pasar a RETIRADO
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9924000011"
    And el cliente de prueba tiene estado "INACTIVO"
    When cambio el estado del cliente de prueba a "RETIRADO" con motivo "Baja definitiva"
    Then el sistema retorna estado 200
    And el cliente de prueba conserva el estado "RETIRADO"
    And el último cambio del cliente de prueba registra "INACTIVO" a "RETIRADO"

  Scenario: Una transición fuera de la matriz retorna 409 sin escritura
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9924000012"
    And el cliente de prueba tiene estado "SUSPENDIDO"
    When cambio el estado del cliente de prueba a "NUEVO" con motivo "Reinicio de alta"
    Then el sistema retorna estado 409
    And el sistema responde con el código de error "TRANSICION_INVALIDA"
    And el cliente de prueba conserva el estado "SUSPENDIDO"
    And el historial de cambios de estado del cliente de prueba tiene 0 filas
