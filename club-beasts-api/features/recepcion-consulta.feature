@inc03
Feature: Consulta de cliente por cédula en recepción
  Como recepcionista o dueño
  Quiero consultar un cliente por cédula con estado real, vencimiento y alertas
  Para atenderlo en el mostrador con información confiable

  # INC03-REC-01/02/03 (HU29-C01..C03): identidad + estado + vencimiento
  Scenario: La consulta devuelve identidad, sede, estado de acceso y fecha de vencimiento
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000020" con nombres "Luis" y apellidos "Mendoza"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+10"
    When consulto en recepción la cédula del cliente de prueba
    Then el sistema retorna estado 200
    And la consulta de recepción responde con nombre completo "Luis Mendoza"
    And la consulta de recepción responde con la cédula del cliente de prueba
    And la consulta de recepción responde con sede "Sede Principal"
    And la consulta de recepción responde con estadoAccesoGym "ACTIVA"
    And la consulta de recepción responde con fechaVencimiento "hoy+10"
    And la consulta de recepción responde con foto nula

  # INC03-REC-03: rango de congelación en recepción
  Scenario: La consulta expone la congelación vigente del cliente
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000021"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    And la vigencia gym del cliente de prueba está congelada de "hoy" a "hoy+5"
    When consulto en recepción la cédula del cliente de prueba
    Then el sistema retorna estado 200
    And la consulta de recepción responde con estadoAccesoGym "CONGELADO"
    And la consulta de recepción responde con congelacion de "hoy" a "hoy+5"

  # INC03-REC-04 (HU29-C04): sin ingresos previos
  Scenario: Un cliente sin ingresos previos no tiene último ingreso
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000022"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    When consulto en recepción la cédula del cliente de prueba
    Then el sistema retorna estado 200
    And la consulta de recepción responde con último ingreso nulo

  # INC03-REC-04: último ingreso del historial
  Scenario: La consulta muestra el último ingreso registrado
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000023"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    And registro un ingreso del cliente de prueba en la sede "sede-1"
    When consulto en recepción la cédula del cliente de prueba
    Then el sistema retorna estado 200
    And la consulta de recepción responde con último ingreso del día "hoy" en sede "sede-1"

  # INC03-REC-05 (DEC-028): alerta MEMBRESIA_VENCIDA
  Scenario: La consulta alerta cuando la membresía está vencida
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000024"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy-1"
    When consulto en recepción la cédula del cliente de prueba
    Then el sistema retorna estado 200
    And la consulta de recepción responde con alerta "MEMBRESIA_VENCIDA"

  # INC03-REC-05 (DEC-028): alerta ESTADO_CLIENTE
  Scenario: La consulta alerta cuando el cliente está SUSPENDIDO
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000025"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    And el cliente de prueba tiene estado "SUSPENDIDO"
    When consulto en recepción la cédula del cliente de prueba
    Then el sistema retorna estado 200
    And la consulta de recepción responde con alerta "ESTADO_CLIENTE"

  # INC03-REC-05: sin alertas cuando todo está en regla
  Scenario: Un cliente activo con membresía vigente no tiene alertas
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000026"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    When consulto en recepción la cédula del cliente de prueba
    Then el sistema retorna estado 200
    And la consulta de recepción responde sin alertas

  # INC03-REC-06 (HU29-C06): cédulas mal formadas
  Scenario Outline: La consulta rechaza cédulas fuera del formato numérico de 6 a 10 dígitos
    Given el recepcionista está autenticado
    When consulto en recepción la cédula "<cedula>"
    Then el sistema retorna estado 400
    And el sistema muestra error "Cédula debe ser numérica de 6 a 10 dígitos"

    Examples:
      | cedula |
      | ABC |
      | 12345 |
      | 12345678901 |
      |  |

  # INC03-REC-07 (HU29-C07): cédula bien formada inexistente
  Scenario: La consulta de una cédula inexistente responde 404
    Given el recepcionista está autenticado
    When consulto en recepción la cédula "99999999"
    Then el sistema retorna estado 404
    And el sistema muestra error "Cliente no encontrado"

  # INC03-REC-08 (DEC-001): sin token
  Scenario: La consulta rechaza el acceso sin token
    When consulto en recepción la cédula "8800000020" sin token
    Then el sistema retorna estado 401

  # INC03-REC-08 (DEC-001): rol CLIENTE no consulta recepción
  Scenario: La consulta rechaza el acceso de un cliente del portal
    Given existe un cliente de prueba con cédula "8800000027"
    And el cliente de prueba está autenticado en el portal
    When consulto en recepción la cédula del cliente de prueba con token de portal
    Then el sistema retorna estado 403

  # INC03-REC-09/10 (HU29-C09/C10): un objeto único y sin datos sensibles
  Scenario: La respuesta es un único objeto cliente sin datos sensibles
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000028"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    When consulto en recepción la cédula del cliente de prueba
    Then el sistema retorna estado 200
    And la consulta de recepción responde un único objeto cliente
    And la consulta de recepción no expone datos sensibles
