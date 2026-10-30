@inc06
Feature: Acceso completo bloqueado sin ninguna membresia activa
  Como cliente del gimnasio
  Quiero saber cuando no tengo ninguna membresia activa
  Para activar mi membresia en recepcion y volver a acceder

  # INC-06 / INC06-ACC-01 (DEC-048 + DEC-051 PEND-01/03/04): deteccion del
  # aviso de activar membresia. Copy fijo DEC-051: "No tienes una membresia
  # activa" + "Contacta recepcion para activar tu membresia y volver a
  # acceder" (sin la palabra "suspension"); el aviso se sirve a pantalla
  # completa en /portal. El flag del contrato es `sinMembresiaActiva`
  # (R3: booleano simple; R11: sin campos nuevos).
  Scenario: Un cliente sin ninguna vigencia recibe el aviso de activar membresia
    Given existe un cliente de prueba con cédula "8806000010"
    And el cliente de prueba no tiene vigencia gym
    And el cliente de prueba está autenticado en el portal
    When consulto mi resumen del portal
    Then el sistema retorna estado 200
    And el portal responde con sinMembresiaActiva "true"

  Scenario: Un cliente con todas sus vigencias vencidas recibe el aviso de activar membresia
    Given existe un cliente de prueba con cédula "8806000011"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy-1"
    And el cliente de prueba está autenticado en el portal
    When consulto mi resumen del portal
    Then el sistema retorna estado 200
    And el portal responde con sinMembresiaActiva "true"

  # DEC-051 PEND-04(a): PROGRAMADA cuenta como sin membresia activa
  # (coherente con el 403 de ingreso PROGRAMADA ya aceptado).
  Scenario: Una vigencia programada unica cuenta como sin membresia activa
    Given existe un cliente de prueba con cédula "8806000012"
    And la vigencia gym del cliente de prueba va de "hoy+1" a "hoy+30"
    And el cliente de prueba está autenticado en el portal
    When consulto mi resumen del portal
    Then el sistema retorna estado 200
    And el portal responde con sinMembresiaActiva "true"

  # INC06-ACC-02 (DEC-026/027): un servicio vigente alcanza; acceso por
  # servicio intacto (mixto GYM vencida + nutricion activa -> sin aviso).
  Scenario: Un cliente con nutricion activa no recibe el aviso aunque su gym este vencido
    Given existe un cliente de prueba con cédula "8806000013"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy-1"
    And el cliente de prueba tiene una vigencia de nutricion del "hoy-5" al "hoy+25"
    And el cliente de prueba está autenticado en el portal
    When consulto mi resumen del portal
    Then el sistema retorna estado 200
    And el portal responde con sinMembresiaActiva "false"
    And el portal responde con estadoAccesoGym "VENCIDA"

  # INC06-ACC-03 (DEC-025): la congelacion conserva el acceso; el bloqueo no
  # aplica mientras dure la pausa.
  Scenario: La congelacion vigente conserva el acceso y no muestra el aviso
    Given existe un cliente de prueba con cédula "8806000014"
    And la vigencia gym del cliente de prueba va de "hoy-30" a "hoy+30"
    And la vigencia gym del cliente de prueba está congelada de "hoy-1" a "hoy+1"
    And el cliente de prueba está autenticado en el portal
    When consulto mi resumen del portal
    Then el sistema retorna estado 200
    And el portal responde con sinMembresiaActiva "false"
    And el portal responde con estadoAccesoGym "CONGELADO"

  # R1 (ratificacion 2026-10-29): el estado general del cliente NO entra en
  # el flag; un SUSPENDIDO con membresia activa nunca ve el copy falso
  # "No tienes una membresia activa".
  Scenario: Un cliente suspendido con membresia activa no recibe el aviso
    Given existe un cliente de prueba con cédula "8806000015"
    And la vigencia gym del cliente de prueba va de "hoy-10" a "hoy+20"
    And el cliente de prueba tiene estado "SUSPENDIDO"
    And el cliente de prueba está autenticado en el portal
    When consulto mi resumen del portal
    Then el sistema retorna estado 200
    And el portal responde con sinMembresiaActiva "false"
    And el portal responde con estadoAccesoGym "ACTIVA"
