@inc03
Feature: Vencimiento de membresía GYM detectado en todas las superficies
  Como dueño o recepcionista del gimnasio
  Quiero que el vencimiento se derive en cada lectura y bloquee el acceso
  Para que un cliente con membresía vencida no use el servicio GYM

  # INC03-VEN-01 (HU16-C01): hoy == fechaFin -> vigente (extremo inclusivo DEC-006)
  Scenario: La vigencia que termina hoy sigue estando ACTIVA
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "8800000001"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy"
    When consulto las membresías gym del cliente de prueba
    Then la vigencia gym del cliente de prueba tiene estado "ACTIVA"

  # INC03-VEN-01 (HU16-C01): hoy == fechaFin+1 -> vencida
  Scenario: La vigencia cuyo fechaFin fue ayer queda VENCIDA
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "8800000002"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy-1"
    When consulto las membresías gym del cliente de prueba
    Then la vigencia gym del cliente de prueba tiene estado "VENCIDA"

  # INC03-VEN-02 (HU16-C02): postergar fechaFin restaura el estado
  Scenario: Al postergar la fechaFin la vigencia vuelve a quedar ACTIVA
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "8800000003"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy-1"
    When postergo la fechaFin de la vigencia del cliente de prueba a "hoy+30"
    And consulto las membresías gym del cliente de prueba
    Then la vigencia gym del cliente de prueba tiene estado "ACTIVA"

  # INC03-VEN-03 (HU16-C03 + mvp.md:58): VENCIDA visible en el portal
  Scenario: El portal del cliente expone estadoAccesoGym VENCIDA
    Given existe un cliente de prueba con cédula "8800000004"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy-1"
    And el cliente de prueba está autenticado en el portal
    When consulto mi resumen del portal
    Then el sistema retorna estado 200
    And el portal responde con estadoAccesoGym "VENCIDA"

  # INC03-VEN-03: VENCIDA visible en la consulta de recepción
  Scenario: La consulta de recepción expone estadoAccesoGym VENCIDA
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "8800000005"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy-1"
    When consulto en recepción la cédula del cliente de prueba
    Then el sistema retorna estado 200
    And la consulta de recepción responde con estadoAccesoGym "VENCIDA"

  # INC03-VEN-04 (HU16-C04 + DEC-026): acceso denegado en el ingreso
  Scenario: El ingreso se rechaza con membresía vencida
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "8800000006"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy-1"
    When registro un ingreso en recepción para el cliente de prueba en sede "sede-1"
    Then el sistema retorna estado 403
    And el sistema muestra error "La membresía no está habilitada para ingresar (vencida el"

  # INC03-VEN-05 (HU16-C01/C03 "unica fuente"): ficha y listado no se contradicen en CONGELADO
  Scenario: La ficha y el listado exponen el mismo estado CONGELADO
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "8800000007"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    And la vigencia gym del cliente de prueba está congelada de "hoy" a "hoy+5"
    When consulto las membresías gym del cliente de prueba
    Then la vigencia gym del cliente de prueba tiene estado "CONGELADO"
    When consulto la ficha del cliente de prueba
    Then la ficha del cliente de prueba muestra la vigencia con estado "CONGELADO"
