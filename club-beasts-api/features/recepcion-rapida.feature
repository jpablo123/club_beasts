@inc03
Feature: Creación rápida de cliente desde recepción
  Como recepcionista o dueño
  Quiero registrar un cliente nuevo con el mínimo de datos en recepción
  Para que pueda usar el gimnasio y luego completar su perfil

  # INC03-RAP-01 (DEC-031 + HU31-C01): mínimo de 4 campos -> 201
  Scenario: Crear un cliente rápido con el mínimo de datos responde 201
    Given el recepcionista está autenticado
    When creo un cliente rápido con cédula "8800000050", nombres "Pedro", apellidos "Gómez" y teléfono "3001112233"
    Then el sistema retorna estado 201
    And el cliente rápido queda creado con estado "NUEVO" y perfilPendiente verdadero

  # INC03-RAP-01 (DEC-031): sedeId opcional con default del token
  Scenario: Crear un cliente rápido sin sedeId usa la sede del recepcionista
    Given el recepcionista autenticado tiene sede asignada "sede-1"
    When creo un cliente rápido con cédula "8800000051", nombres "Rosa", apellidos "Díaz" y teléfono "3002223344"
    Then el sistema retorna estado 201
    And el cliente rápido queda asignado a la sede "Sede Principal"

  # INC03-RAP-02 (DEC-032 + HU31-C02): marca persistida en lectura posterior
  Scenario: La marca de perfil pendiente se conserva al releer el cliente
    Given el recepcionista está autenticado
    And creo un cliente rápido con cédula "8800000052", nombres "Iván", apellidos "Suárez" y teléfono "3003334455"
    When consulto la ficha del cliente rápido de prueba
    Then el sistema retorna estado 200
    And la ficha del cliente rápido de prueba muestra perfilPendiente verdadero

  # INC03-RAP-03 (DEC-033 + HU31-C03): completar perfil con email limpia la marca
  Scenario: El dueño completa el perfil con email y la marca de perfil pendiente se limpia
    Given soy un usuario autenticado como DUENO
    And creo un cliente rápido con cédula "8800000053", nombres "Nora", apellidos "Vega" y teléfono "3004445566"
    When completo el perfil del cliente rápido de prueba con email "nora@test.com"
    Then el sistema retorna estado 200
    And la ficha del cliente rápido de prueba muestra perfilPendiente falso
    And la ficha del cliente rápido de prueba conserva el email "nora@test.com"

  # INC03-RAP-04 (HU31-C04): validaciones de HU-04 en la nueva superficie
  Scenario Outline: Crear un cliente rápido rechaza datos inválidos sin escribir
    Given el recepcionista está autenticado
    When creo un cliente rápido con cédula "<cedula>", nombres "<nombres>", apellidos "<apellidos>" y teléfono "<telefono>"
    Then el sistema retorna estado 400

    Examples:
      | cedula | nombres | apellidos | telefono |
      | ABC | Pedro | Gómez | 3001112233 |
      | 8800000054 | Pedro123 | Gómez | 3001112233 |
      | 8800000055 | Pedro | Gómez | 2001234567 |

  # INC03-RAP-04: sede inexistente
  Scenario: Crear un cliente rápido con sede inexistente responde 400
    Given el recepcionista está autenticado
    When creo un cliente rápido con cédula "8800000056", nombres "Sara", apellidos "Luna" y teléfono "3005556677" y sede "uid-sede-inexistente"
    Then el sistema retorna estado 400
    And el sistema muestra error "La sede indicada no existe. Verifique el identificador enviado."

  # INC03-RAP-05 (DEC-001): sin token
  Scenario: Crear un cliente rápido rechaza el acceso sin token
    When creo un cliente rápido con cédula "8800000057", nombres "Ana", apellidos "Ríos" y teléfono "3006667788" sin token
    Then el sistema retorna estado 401

  # INC03-RAP-05 (DEC-001): rol CLIENTE
  Scenario: Crear un cliente rápido rechaza el acceso de un cliente del portal
    Given existe un cliente de prueba con cédula "8800000058"
    And el cliente de prueba está autenticado en el portal
    When creo un cliente rápido con cédula "8800000059", nombres "Eva", apellidos "Paz" y teléfono "3007778899" con token de portal
    Then el sistema retorna estado 403

  # INC03-RAP-06 (HU31-C06): estado y trazabilidad del creador
  Scenario: El cliente rápido expone estado NUEVO y el usuario que lo creó
    Given el recepcionista está autenticado
    When creo un cliente rápido con cédula "8800000060", nombres "Mario", apellidos "Castro" y teléfono "3008889900"
    Then el sistema retorna estado 201
    And el cliente rápido expone creadoPor con el nombre "María García"

  # INC03-RAP-07 (HU31-C07): cédula duplicada
  Scenario: Crear un cliente rápido con cédula duplicada responde 409 sin segunda fila
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000061"
    When creo un cliente rápido con cédula "8800000061", nombres "Clara", apellidos "Ríos" y teléfono "3009990011"
    Then el sistema retorna estado 409
    And el sistema muestra error "Ya existe un cliente con esa cédula"
