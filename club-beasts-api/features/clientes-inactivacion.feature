@inc04
Feature: Inactivación de clientes sin borrado físico
  Como dueño o recepcionista del gimnasio
  Quiero inactivar y reactivar clientes con motivo trazable
  Para bloquear accesos y servicios indebidos conservando el historial

  # INC04-CLI-04 (HU08-C04a, DEC-034): bloqueo de acceso al portal.
  # Orden obligatorio: credenciales ANTES de estado (anti-enumeración).
  Scenario: El cliente INACTIVO con PIN correcto no puede iniciar sesión en el portal
    Given existe un cliente de prueba con cédula "9914000001"
    And el cliente de prueba tiene estado "INACTIVO"
    When intento iniciar sesión en el portal con el cliente de prueba y PIN "1234"
    Then el sistema retorna estado 401
    And el sistema responde con el código de error "AUTH_CLIENTE_INACTIVO"
    And el mensaje de error es exactamente "La cuenta está inactiva. Contacte con recepción."
    And la respuesta no incluye token

  Scenario: El login con PIN incorrecto no revela que la cuenta está inactiva
    Given existe un cliente de prueba con cédula "9914000002"
    And el cliente de prueba tiene estado "INACTIVO"
    When intento iniciar sesión en el portal con el cliente de prueba y PIN "9999"
    Then el sistema retorna estado 401
    And el sistema responde con el código de error "AUTH_INVALID_CREDENTIALS"
    And la respuesta no incluye token

  Scenario: Un cliente ACTIVO sigue pudiendo iniciar sesión en el portal
    Given existe un cliente de prueba con cédula "9914000003"
    And el cliente de prueba tiene estado "ACTIVO"
    When intento iniciar sesión en el portal con el cliente de prueba y PIN "1234"
    Then el sistema retorna estado 200
    And la respuesta incluye token

  # INC04-CLI-05 (HU08-C04b): sin servicios nuevos para cliente INACTIVO.
  Scenario: No se pueden asignar membresías gym a un cliente INACTIVO
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9914000004"
    And el cliente de prueba tiene estado "INACTIVO"
    When intento crear una membresía gym para el cliente de prueba de "hoy-3" a "hoy+27"
    Then el sistema retorna estado 409
    And el sistema responde con el código de error "CLIENTE_INACTIVO"
    And el mensaje de error es exactamente "El cliente está inactivo. Reactíveolo antes de asignar servicios nuevos."
    And no se crea membresía gym para el cliente de prueba

  Scenario: Un cliente ACTIVO recibe membresías gym con normalidad
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9914000005"
    And el cliente de prueba tiene estado "ACTIVO"
    When intento crear una membresía gym para el cliente de prueba de "hoy-3" a "hoy+27"
    Then el sistema retorna estado 201
    And el cliente de prueba tiene 1 membresía gym

  Scenario: Asignar membresía gym a un cliente inexistente sigue retornando 404
    Given soy un usuario autenticado como DUENO
    When intento crear una membresía gym para un cliente inexistente
    Then el sistema retorna estado 404
    And el sistema responde con el código de error "NOT_FOUND"

  # INC04-CLI-07 (DEC-039): el ingreso físico también se bloquea por estado.
  Scenario: El cliente INACTIVO con vigencia activa no puede registrar ingresos
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "9914000007"
    And el cliente de prueba tiene estado "INACTIVO"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    When registro un ingreso en recepción para el cliente de prueba en sede "sede-1"
    Then el sistema retorna estado 403
    And el sistema responde con el código de error "INGRESO_NO_PERMITIDO"
    And el mensaje de error es exactamente "El cliente está INACTIVO y no puede registrar ingresos"
    And no se crea ingreso para el cliente de prueba

  # REGRESION INC03-ING-10 (DEC-030, aceptado en INC-03): no se re-cobra el
  # criterio aqui; solo se protege la rama existente al agregar INACTIVO.
  Scenario: Un cliente SUSPENDIDO sigue sin poder registrar ingresos
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "9914000008"
    And el cliente de prueba tiene estado "SUSPENDIDO"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    When registro un ingreso en recepción para el cliente de prueba en sede "sede-1"
    Then el sistema retorna estado 403
    And el mensaje de error es exactamente "El cliente está SUSPENDIDO y no puede registrar ingresos"
    And no se crea ingreso para el cliente de prueba

  # INC04-CLI-02 (HU08-C02): conservación de datos, búsqueda e historial.
  Scenario: Inactivar un cliente conserva la ficha, la búsqueda y registra el cambio
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9914000009"
    When cambio el estado del cliente de prueba a "INACTIVO" con motivo "Cierre temporal"
    Then el sistema retorna estado 200
    And la respuesta del cambio de estado expone el motivo "Cierre temporal"
    When consulto la ficha del cliente de prueba como staff
    Then el cliente de prueba conserva sus datos con estado "INACTIVO"
    When busco al cliente de prueba por su cédula
    Then la búsqueda de clientes encuentra al cliente de prueba
    And el historial de cambios de estado del cliente de prueba tiene 1 filas
    And el motivo del último cambio del cliente de prueba es "Cierre temporal"

  Scenario: El cliente inactivado no tiene borrado físico
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9914000010"
    When cambio el estado del cliente de prueba a "INACTIVO" con motivo "Baja voluntaria"
    And intento eliminar el cliente de prueba
    Then el sistema retorna estado 404
    And el cliente de prueba sigue existiendo en la base

  # INC04-CLI-08 (HU08-C05, DEC-020): reactivación por DUENO y RECEPCIONISTA.
  Scenario: El dueño reactiva un cliente INACTIVO y este recupera el acceso
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9914000011"
    And el cliente de prueba tiene estado "INACTIVO"
    When cambio el estado del cliente de prueba a "ACTIVO" con motivo "Reactivación autorizada"
    Then el sistema retorna estado 200
    And el último cambio del cliente de prueba registra "INACTIVO" a "ACTIVO"
    And el motivo del último cambio del cliente de prueba es "Reactivación autorizada"
    When intento iniciar sesión en el portal con el cliente de prueba y PIN "1234"
    Then el cliente de prueba puede iniciar sesión en el portal

  Scenario: El recepcionista también puede reactivar un cliente INACTIVO
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "9914000012"
    And el cliente de prueba tiene estado "INACTIVO"
    When cambio el estado del cliente de prueba a "ACTIVO" con motivo "Cliente al día"
    Then el sistema retorna estado 200
    And el actor del último cambio del cliente de prueba es el usuario autenticado

  Scenario: Reactivar un cliente sin motivo retorna 400 y el estado no cambia
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9914000013"
    And el cliente de prueba tiene estado "INACTIVO"
    When cambio el estado del cliente de prueba a "ACTIVO" con motivo "(omitido)"
    Then el sistema retorna estado 400
    And el mensaje de error es exactamente "Motivo es requerido cuando cambia el estado"
    And el cliente de prueba conserva el estado "INACTIVO"

  # INC04-CLI-06 (HU08-C04c, DEC-040): la sesión ya emitida no se revoca.
  Scenario: La sesión abierta antes de inactivar sigue respondiendo hasta su TTL
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9914000014"
    And el cliente de prueba está autenticado en el portal
    When cambio el estado del cliente de prueba a "INACTIVO" con motivo "Sesión previa"
    And consulto mi resumen del portal
    Then el sistema retorna estado 200

  # INC04-CLI-03 (DEC-041): el motivo es información interna del staff.
  Scenario: La ficha self-only del portal no expone el motivo del cambio de estado
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9914000015"
    And el cliente de prueba está autenticado en el portal
    When cambio el estado del cliente de prueba a "INACTIVO" con motivo "Cuenta morosa"
    And consulto la ficha del cliente de prueba con la sesión del portal
    Then la ficha del portal del cliente de prueba expone el motivo nulo
