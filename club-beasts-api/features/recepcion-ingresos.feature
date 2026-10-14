@inc03
Feature: Registro de ingresos en recepción
  Como recepcionista o dueño
  Quiero registrar el ingreso de un cliente por cédula y sede
  Para controlar quién usa el gimnasio con guardas de membresía habilitada

  # INC03-ING-01/03 (HU30-C01/C03): ingreso 201 con fila persistida
  Scenario: Registrar un ingreso crea la fila con fecha, hora, sede y usuario
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000030"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    When registro un ingreso en recepción para el cliente de prueba en sede "sede-1"
    Then el sistema retorna estado 201
    And el ingreso queda registrado en la sede "sede-1" con fecha "hoy"

  # INC03-ING-02 (CONF-03): múltiples ingresos el mismo día
  Scenario: Se permiten varios ingresos del mismo cliente en el mismo día
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000031"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    When registro un ingreso en recepción para el cliente de prueba en sede "sede-1"
    And registro un ingreso en recepción para el cliente de prueba en sede "sede-1"
    And registro un ingreso en recepción para el cliente de prueba en sede "sede-1"
    Then el sistema retorna estado 201
    And el historial de ingresos del cliente de prueba tiene total 3

  # INC03-ING-02 (CONF-03): ingresos del mismo día en sedes distintas
  Scenario: Se permiten ingresos del mismo día en sedes distintas
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000032"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    When registro un ingreso en recepción para el cliente de prueba en sede "sede-1"
    And registro un ingreso en recepción para el cliente de prueba en sede "sede-2"
    Then el sistema retorna estado 201
    And el historial de ingresos del cliente de prueba tiene total 2

  # INC03-ING-04 + ING-11: ACTIVA -> 201 (extremo fechaFin inclusivo)
  Scenario: El ingreso se acepta cuando la vigencia está ACTIVA el día de vencimiento
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000033"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy"
    When registro un ingreso en recepción para el cliente de prueba en sede "sede-1"
    Then el sistema retorna estado 201

  # INC03-ING-04 (DEC-025/CONF-02): CONGELADO permite ingreso
  Scenario: El ingreso se acepta cuando la vigencia está CONGELADA
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000034"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    And la vigencia gym del cliente de prueba está congelada de "hoy" a "hoy+5"
    When registro un ingreso en recepción para el cliente de prueba en sede "sede-1"
    Then el sistema retorna estado 201

  # INC03-ING-04: VENCIDA -> 403 (el efecto del bloqueo lo acredita VEN-04)
  Scenario: El ingreso se rechaza cuando la vigencia está VENCIDA
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000035"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy-1"
    When registro un ingreso en recepción para el cliente de prueba en sede "sede-1"
    Then el sistema retorna estado 403
    And el sistema muestra error "La membresía no está habilitada para ingresar (vencida el"
    And no se crea ingreso para el cliente de prueba

  # INC03-ING-04: PROGRAMADA -> 403
  Scenario: El ingreso se rechaza cuando la vigencia está PROGRAMADA
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000036"
    And la vigencia gym del cliente de prueba va de "hoy+1" a "hoy+30"
    When registro un ingreso en recepción para el cliente de prueba en sede "sede-1"
    Then el sistema retorna estado 403
    And el sistema muestra error "La membresía no está habilitada para ingresar (aún no inicia desde"
    And no se crea ingreso para el cliente de prueba

  # INC03-ING-04: sin vigencia -> 403
  Scenario: El ingreso se rechaza cuando el cliente no tiene vigencia gym
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000037"
    And el cliente de prueba no tiene vigencia gym
    When registro un ingreso en recepción para el cliente de prueba en sede "sede-1"
    Then el sistema retorna estado 403
    And el sistema muestra error "La membresía no está habilitada para ingresar (no tiene vigencia activa)"
    And no se crea ingreso para el cliente de prueba

  # INC03-ING-11 (DEC-006): extremo fechaFin+1 -> 403
  Scenario: El ingreso se rechaza al día siguiente del fechaFin
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000038"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy-1"
    When registro un ingreso en recepción para el cliente de prueba en sede "sede-1"
    Then el sistema retorna estado 403
    And no se crea ingreso para el cliente de prueba

  # INC03-ING-05 (HU30-C05): historial vacío
  Scenario: El historial de ingresos de un cliente sin filas responde lista vacía y total cero
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000039"
    When consulto el historial de ingresos del cliente de prueba
    Then el sistema retorna estado 200
    And el historial de ingresos del cliente de prueba tiene total 0

  # INC03-ING-05: historial ordenado desc
  Scenario: El historial lista los ingresos del cliente ordenados del más reciente al más antiguo
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000040"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    And registro un ingreso del cliente de prueba en la sede "sede-1"
    And registro un ingreso del cliente de prueba en la sede "sede-2"
    When consulto el historial de ingresos del cliente de prueba
    Then el sistema retorna estado 200
    And el historial de ingresos del cliente de prueba tiene total 2

  # INC03-ING-05: filtro por fecha exacta
  Scenario: El historial se puede filtrar por fecha exacta
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000041"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    And registro un ingreso del cliente de prueba en la sede "sede-1"
    When consulto el historial de ingresos del cliente de prueba en la fecha "hoy"
    Then el sistema retorna estado 200
    And el historial de ingresos del cliente de prueba tiene total 1

  # INC03-ING-06 (HU30-C06): cédula inexistente
  Scenario: Registrar un ingreso con cédula inexistente responde 404 sin escribir
    Given el recepcionista está autenticado
    When registro un ingreso en recepción con cédula "99999999" y sede "sede-1"
    Then el sistema retorna estado 404
    And el sistema muestra error "Cliente no encontrado"

  # INC03-ING-07 (HU30-C07): cédula inválida
  Scenario Outline: Registrar un ingreso rechaza cédulas fuera del formato numérico de 6 a 10 dígitos
    Given el recepcionista está autenticado
    When registro un ingreso en recepción con cédula "<cedula>" y sede "sede-1"
    Then el sistema retorna estado 400
    And el sistema muestra error "Cédula debe ser numérica de 6 a 10 dígitos"

    Examples:
      | cedula |
      | ABC |
      | 12345 |

  # INC03-ING-08 (HU30-C08): sedeId ausente/vacío o inexistente
  Scenario Outline: Registrar un ingreso rechaza sedeId inválido
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "8800000042"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    When registro un ingreso en recepción con cédula "8800000042" y sede "<sede>"
    Then el sistema retorna estado 400
    And el sistema muestra error "<mensaje>"

    Examples:
      | sede | mensaje |
      |  | sedeId es requerido |
      | uid-sede-inexistente | La sede indicada no existe. Verifique el identificador enviado. |

  # INC03-ING-09 (DEC-001): sin token
  Scenario: Registrar un ingreso rechaza el acceso sin token
    When registro un ingreso en recepción con cédula "8800000042" y sede "sede-1" sin token
    Then el sistema retorna estado 401

  # INC03-ING-09 (DEC-001): rol CLIENTE
  Scenario: Registrar un ingreso rechaza el acceso de un cliente del portal
    Given existe un cliente de prueba con cédula "8800000043"
    And el cliente de prueba está autenticado en el portal
    When registro un ingreso en recepción con cédula "8800000043" y sede "sede-1" con token de portal
    Then el sistema retorna estado 403

  # INC03-ING-10 (DEC-030): SUSPENDIDO con membresía ACTIVA
  Scenario Outline: Un cliente con estado general bloqueado no puede registrar ingresos
    Given el recepcionista está autenticado
    And existe un cliente de prueba con cédula "<cedula>"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    And el cliente de prueba tiene estado "<estado>"
    When registro un ingreso en recepción para el cliente de prueba en sede "sede-1"
    Then el sistema retorna estado 403
    And el sistema muestra error "El cliente está <estado> y no puede registrar ingresos"
    And no se crea ingreso para el cliente de prueba

    Examples:
      | cedula | estado |
      | 8800000044 | SUSPENDIDO |
      | 8800000045 | RETIRADO |
