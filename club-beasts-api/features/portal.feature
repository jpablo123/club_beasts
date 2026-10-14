@inc03
Feature: Portal del cliente con estado real de acceso GYM
  Como cliente del gimnasio
  Quiero ver en mi portal mi estado de acceso, sede y vencimiento reales
  Para saber si puedo usar el servicio GYM hoy

  # INC03-POR-01/02/03 (HU25-C01..C03): identidad + enum + fecha de vencimiento
  Scenario: El portal devuelve identidad, sede, estado de acceso y fecha de vencimiento
    Given existe un cliente de prueba con cédula "8800000010" con nombres "Ana" y apellidos "Torres"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    And el cliente de prueba está autenticado en el portal
    When consulto mi resumen del portal
    Then el sistema retorna estado 200
    And el portal responde con nombre completo "Ana Torres"
    And el portal responde con la cédula del cliente de prueba
    And el portal responde con sede "Sede Principal"
    And el portal responde con estadoAccesoGym "ACTIVA"
    And el portal responde con fechaVencimiento "hoy+30"

  # INC03-POR-04 (HU25-C04 + INC-02): rango de congelación cuando corresponde
  Scenario: El portal expone el rango de congelación cuando el cliente está congelado
    Given existe un cliente de prueba con cédula "8800000011"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    And la vigencia gym del cliente de prueba está congelada de "hoy" a "hoy+5"
    And el cliente de prueba está autenticado en el portal
    When consulto mi resumen del portal
    Then el sistema retorna estado 200
    And el portal responde con estadoAccesoGym "CONGELADO"
    And el portal responde con congelacion de "hoy" a "hoy+5"

  # INC03-POR-05 (DEC-001): sin token -> 401
  Scenario: El portal rechaza la consulta sin token
    When consulto mi resumen del portal sin token
    Then el sistema retorna estado 401

  # INC03-POR-05 (DEC-001): staff no accede al portal de cliente
  Scenario: El portal rechaza el acceso de un usuario staff
    Given soy un usuario autenticado como DUENO
    When consulto mi resumen del portal con token de staff
    Then el sistema retorna estado 403

  # INC03-POR-06 (HU25-C06): sin membresía -> SIN_VIGENCIA + fecha null
  Scenario: Un cliente sin membresía ve SIN_VIGENCIA y sin fecha de vencimiento
    Given existe un cliente de prueba con cédula "8800000012"
    And el cliente de prueba no tiene vigencia gym
    And el cliente de prueba está autenticado en el portal
    When consulto mi resumen del portal
    Then el sistema retorna estado 200
    And el portal responde con estadoAccesoGym "SIN_VIGENCIA"
    And el portal responde con fechaVencimiento nula

  # INC03-POR-07 (HU25-C07): bordes inclusivos en el portal
  Scenario Outline: El portal refleja el estado calculado en los extremos de la vigencia
    Given existe un cliente de prueba con cédula "<cedula>"
    And la vigencia gym del cliente de prueba va de "<inicio>" a "<fin>"
    And el cliente de prueba está autenticado en el portal
    When consulto mi resumen del portal
    Then el sistema retorna estado 200
    And el portal responde con estadoAccesoGym "<estado>"

    Examples:
      | cedula | inicio | fin | estado |
      | 8800000013 | hoy+1 | hoy+30 | PROGRAMADA |
      | 8800000014 | hoy-30 | hoy | ACTIVA |
      | 8800000015 | hoy-30 | hoy-1 | VENCIDA |
