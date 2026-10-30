@inc05
Feature: Registro de servicio de nutricion con vigencia y estados calculados
  Como dueno o recepcionista del gimnasio
  Quiero registrar y consultar la vigencia del servicio de nutricion del cliente
  Para controlar si el cliente tiene un plan nutricional con servicio vigente

  # INC-05 / INC05-NUT-01 (HU14-C01, contrato ratificado 2026-10-20):
  # POST /clientes/:clienteId/servicios-nutricion (espejo de HU-13).
  # Fechas DINAMICAS (DEC-005/006/013): tokens "hoy", "hoy+N", "hoy-N".
  Background:
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9941000011"

  # INC05-NUT-01: happy path con DTO, version 1, actor y auditoria CREACION.
  Scenario: Registrar la vigencia del servicio de nutricion
    When intento registrar el servicio de nutricion con inicio "hoy-5" y fin "hoy+25"
    Then el sistema retorna estado 201
    And la creación del servicio de nutricion quedó registrada con versión 1

  # INC05-NUT-01 / DEC-017: el recepcionista tambien gestiona vigencias.
  Scenario: Recepcionista registra una vigencia de nutricion
    Given el recepcionista está autenticado
    When intento registrar el servicio de nutricion con inicio "hoy-5" y fin "hoy+25"
    Then el sistema retorna estado 201

  # INC05-NUT-01: validacion por campo con los mensajes exactos del G14.
  Scenario Outline: Rechazar fechas inválidas al registrar el servicio de nutricion
    When intento registrar el servicio de nutricion con inicio "<inicio>" y fin "<fin>"
    Then el sistema retorna estado 400
    And el sistema responde con el código de error "VALIDATION_ERROR"
    And el mensaje de error es exactamente "<mensaje>"

    Examples:
      | inicio | fin    | mensaje                                              |
      |        | hoy+20 | Fecha de inicio es requerida                        |
      | hoy-5  |        | Fecha fin es requerida                              |
      | hoy-5  | hoy-10 | Fecha fin no puede ser anterior a fecha de inicio   |
      | 2026-02-30 | hoy+20 | Fecha de inicio debe ser una fecha válida (YYYY-MM-DD) |
      | hoy-5  | 2026-02-30 | Fecha fin debe ser una fecha válida (YYYY-MM-DD) |

  # INC05-NUT-01 / DEC-008: solape inclusive rechazado con code propio DEC-044.
  Scenario: Rechazar periodo solapado de nutricion con uno existente
    Given el cliente de prueba tiene una vigencia de nutricion del "hoy-10" al "hoy+10"
    When intento registrar el servicio de nutricion con inicio "hoy+10" y fin "hoy+30"
    Then el sistema retorna estado 409
    And el sistema responde con el código de error "SERVICIO_SOLAPADA"
    And el mensaje de error es exactamente "Las fechas se solapan con un período existente"
    And el cliente de prueba tiene 1 vigencia de nutricion en la base

  # INC05-NUT-01 / DEC-007: renovar crea periodo nuevo, el anterior queda intacto.
  Scenario: Renovar crea un periodo nuevo de nutricion sin sobrescribir el anterior
    Given el cliente de prueba tiene una vigencia de nutricion del "hoy-40" al "hoy-31"
    When intento registrar el servicio de nutricion con inicio "hoy-30" y fin "hoy"
    Then el sistema retorna estado 201
    When consulto las vigencias del servicio de nutricion
    Then la lista de nutricion tiene 2 vigencias
    And la vigencia de nutricion del "hoy-40" al "hoy-31" conserva la versión 1

  # INC05-NUT-01 / DEC-004: el solape se evalua POR TIPO, nunca cruzado.
  Scenario: El solape se evalua por tipo y gym y personalizado no bloquean la nutricion
    Given la vigencia gym del cliente de prueba va de "hoy-10" a "hoy+10"
    And el cliente de prueba tiene una vigencia de personalizado del "hoy-10" al "hoy+10"
    When intento registrar el servicio de nutricion con inicio "hoy-10" y fin "hoy+10"
    Then el sistema retorna estado 201
    And el cliente de prueba tiene 1 vigencia de nutricion en la base

  # INC05-NUT-01: 404 NOT_FOUND para cliente inexistente.
  Scenario: Registrar vigencia de nutricion para cliente inexistente retorna 404
    When intento registrar el servicio de nutricion para el cliente "cliente-inexistente-inc05"
    Then el sistema retorna estado 404
    And el sistema responde con el código de error "NOT_FOUND"
    And el mensaje de error es exactamente "Cliente no encontrado"

  # INC05-NUT-01 / DEC-017: el rol CLIENTE no gestiona vigencias (403).
  Scenario: El rol CLIENTE no puede registrar vigencias de nutricion
    Given el cliente de prueba está autenticado en el portal
    When con la sesión del cliente registro el servicio de nutricion con inicio "hoy-5" y fin "hoy+25"
    Then el sistema retorna estado 403
    And el sistema responde con el código de error "AUTH_FORBIDDEN"
    And el mensaje de error es exactamente "No tienes permisos para realizar esta acción."

  # INC05-NUT-01 / CONF-06: guarda heredada de HU-08 sobre servicios nuevos.
  Scenario: No se registra vigencia de nutricion para un cliente inactivo
    Given el cliente de prueba tiene estado "INACTIVO"
    When intento registrar el servicio de nutricion con inicio "hoy-5" y fin "hoy+25"
    Then el sistema retorna estado 409
    And el sistema responde con el código de error "CLIENTE_INACTIVO"
    And el mensaje de error es exactamente "El cliente está inactivo. Reactíveolo antes de asignar servicios nuevos."
    And el cliente de prueba tiene 0 vigencia de nutricion en la base

  # INC05-NUT-01 / CONF-01: el orden fija la guarda ANTES del solape.
  Scenario: La guarda CLIENTE_INACTIVO de nutricion se evalua antes del solape
    Given el cliente de prueba tiene estado "INACTIVO"
    And el cliente de prueba tiene una vigencia de nutricion del "hoy-10" al "hoy+10"
    When intento registrar el servicio de nutricion con inicio "hoy" y fin "hoy+5"
    Then el sistema retorna estado 409
    And el sistema responde con el código de error "CLIENTE_INACTIVO"
    And el cliente de prueba tiene 1 vigencia de nutricion en la base

  # INC05-NUT-02 (HU14-C02a): lista vacia = NO_CONTRATADO implicito.
  Scenario: Estado sin vigencias de nutricion contratadas
    When consulto las vigencias del servicio de nutricion
    Then el sistema retorna estado 200
    And la lista de nutricion tiene 0 vigencias

  # INC05-NUT-02: bordes inclusivos (DEC-006): ACTIVA en el dia final.
  Scenario: La vigencia de nutricion sigue activa en su día final
    Given el cliente de prueba tiene una vigencia de nutricion del "hoy-10" al "hoy"
    When consulto las vigencias del servicio de nutricion
    Then la unica vigencia de nutricion tiene estado "ACTIVA"

  # INC05-NUT-02: VENCIDA al dia siguiente del fin (inclusivo).
  Scenario: La vigencia de nutricion vence al día siguiente de su fecha fin
    Given el cliente de prueba tiene una vigencia de nutricion del "hoy-30" al "hoy-1"
    When consulto las vigencias del servicio de nutricion
    Then la unica vigencia de nutricion tiene estado "VENCIDA"

  # INC05-NUT-02 / DEC-043: periodo futuro = PROGRAMADA (literal ratificado).
  Scenario: Un periodo futuro de nutricion se muestra como PROGRAMADA
    Given el cliente de prueba tiene una vigencia de nutricion del "hoy+5" al "hoy+30"
    When consulto las vigencias del servicio de nutricion
    Then la unica vigencia de nutricion tiene estado "PROGRAMADA"

  # INC05-NUT-04 (HU14-C03): el listado propio FILTRA por su tipo.
  Scenario: El listado propio solo incluye las vigencias de nutricion
    Given la vigencia gym del cliente de prueba va de "hoy-20" a "hoy-15"
    And el cliente de prueba tiene una vigencia de personalizado del "hoy-15" al "hoy+5"
    And el cliente de prueba tiene una vigencia de nutricion del "hoy-10" al "hoy+10"
    When consulto las vigencias del servicio de nutricion
    Then la lista de nutricion tiene 1 vigencias
    And la unica vigencia de nutricion tiene estado "ACTIVA"

  # INC05-NUT-03 (HU14-C02b, incluido por DEC-042): CONGELADO en nutricion.
  # En RED /congelar sobre NUTRICION devuelve 409 CONGELACION_NO_PERMITIDA
  # (gap de DEC-042 en TIPOS_CONGELABLES, cerrado en GREEN).
  Scenario: Estado CONGELADO en nutricion con una pausa vigente
    Given el cliente de prueba tiene una vigencia de nutricion del "hoy-10" al "hoy+10"
    When congelo la vigencia de nutricion del cliente de prueba con pausa del "hoy" al "hoy+2"
    Then el sistema retorna estado 200
    And la respuesta de la pausa expone estado "CONGELADO"

  # INC05-NUT-03: al terminar la pausa vuelve el calculo con la extension aceptada.
  Scenario: Al terminar la pausa de nutricion vuelve el calculo con fechaFin extendida
    Given el cliente de prueba tiene una vigencia de nutricion del "hoy-10" al "hoy+10"
    When congelo la vigencia de nutricion del cliente de prueba con pausa del "hoy" al "hoy+2"
    Then el sistema retorna estado 200
    When hago que la pausa vigente de la vigencia de nutricion termine
    And consulto las vigencias del servicio de nutricion
    Then la unica vigencia de nutricion tiene estado "ACTIVA"
    And la fecha fin de la unica vigencia de nutricion queda "hoy+13"

  # INC05-NUT-04 (HU14-C03): la ficha expone la fila con fechas y estado.
  Scenario: La vigencia de nutricion es visible en la ficha con sus fechas y estado
    Given el cliente de prueba tiene una vigencia de nutricion del "hoy-10" al "hoy+10"
    When consulto la ficha del cliente de prueba como staff
    Then la ficha muestra la vigencia de nutricion del "hoy-10" al "hoy+10" con estado "ACTIVA"

  # INC05-NUT-04 / PER-04: cada fila de la ficha conserva su tipoServicio (F8).
  Scenario: La ficha expone cada fila con su tipoServicio cuando hay tipos mixtos
    Given la vigencia gym del cliente de prueba va de "hoy-30" a "hoy-20"
    And el cliente de prueba tiene una vigencia de nutricion del "hoy-10" al "hoy+10"
    And el cliente de prueba tiene una vigencia de personalizado del "hoy+20" al "hoy+40"
    When consulto la ficha del cliente de prueba como staff
    Then la ficha muestra la vigencia de nutricion del "hoy-10" al "hoy+10" con estado "ACTIVA"
    And la ficha muestra una vigencia de personalizado con estado "PROGRAMADA"

  # INC05-NUT-01 rama 8 / DEC-046: concurrencia optimista, version vieja -> 409.
  Scenario: Editar con version vieja retorna 409 SERVICIO_CONFLICTO en nutricion
    Given el cliente de prueba tiene una vigencia de nutricion del "hoy-10" al "hoy+10"
    When edito la vigencia de nutricion con inicio "hoy-9" y fin "hoy+11" y versión 2
    Then el sistema retorna estado 409
    And el sistema responde con el código de error "SERVICIO_CONFLICTO"
    And el mensaje de error es exactamente "Los datos fueron modificados por otro usuario. Recargue e intente nuevamente."

  # INC05-NUT-01 / DEC-047: mover solo fechaInicio desplaza fechaFin por el delta.
  Scenario: Mover solo el inicio desplaza el fin de nutricion por el mismo delta
    Given el cliente de prueba tiene una vigencia de nutricion del "hoy-10" al "hoy+19"
    When edito la vigencia de nutricion moviendo solo el inicio a "hoy-9" con versión 1
    Then el sistema retorna estado 200
    And la respuesta de la edicion expone la fecha fin "hoy+20"
    And la respuesta de la edicion expone la versión 2

  # INC05-NUT-01 / DEC-047: fechaFin explicito manda y cambia la duracion.
  Scenario: Cambiar solo el fin de nutricion cambia la duración pedida en el cuerpo
    Given el cliente de prueba tiene una vigencia de nutricion del "hoy-10" al "hoy+19"
    When edito la vigencia de nutricion cambiando solo el fin a "hoy+29" con versión 1
    Then el sistema retorna estado 200
    And la respuesta de la edicion expone la fecha fin "hoy+29"
    And la respuesta de la edicion expone la versión 2

  # INC05-NUT-01 / correccion C2: validacion pre-desplazamiento, sin escrituras.
  Scenario: Mover el inicio de nutricion más allá del fin persistido retorna 400 sin desplazar
    Given el cliente de prueba tiene una vigencia de nutricion del "hoy-10" al "hoy+10"
    When edito la vigencia de nutricion moviendo solo el inicio a "hoy+15" con versión 1
    Then el sistema retorna estado 400
    And el mensaje de error es exactamente "Fecha fin no puede ser anterior a fecha de inicio"
    And el cliente de prueba tiene 1 vigencia de nutricion en la base

  # INC05-NUT-01 / DEC-008: el solape tras mover el inicio tambien es 409.
  Scenario: Editar nutricion contra otro periodo del mismo tipo retorna 409 SERVICIO_SOLAPADA
    Given el cliente de prueba tiene una vigencia de nutricion del "hoy-40" al "hoy-31"
    And el cliente de prueba tiene una vigencia de nutricion del "hoy-10" al "hoy+10"
    When edito la vigencia de nutricion moviendo solo el inicio a "hoy-35" con versión 1
    Then el sistema retorna estado 409
    And el sistema responde con el código de error "SERVICIO_SOLAPADA"
    And el cliente de prueba tiene 2 vigencia de nutricion en la base

  # INC05-NUT-01 / correccion C6: la pertenencia incluye el tipoServicio.
  Scenario: Editar la ultima vigencia de gym como nutricion retorna 404
    Given la vigencia gym del cliente de prueba va de "hoy-10" a "hoy+10"
    When edito como nutricion la ultima vigencia de gym con versión 1
    Then el sistema retorna estado 404
    And el sistema responde con el código de error "NOT_FOUND"
    And el mensaje de error es exactamente "Servicio no encontrado"

  # INC-05 regresion C1 (fixture F8): editar la pausa de una vigencia GYM no
  # sufre 409 MEMBRESIA_SOLAPADA espurio por una fila NUTRICION solapada.
  Scenario: Editar la pausa de gym no produce 409 espurio por una fila de nutricion solapada
    Given el cliente de prueba tiene una vigencia de gym y una de nutricion simultaneas
    When congelo la vigencia de gym del cliente de prueba con pausa del "hoy" al "hoy+2"
    Then el sistema retorna estado 200
    When edito la pausa de la vigencia de gym del cliente de prueba del "hoy" al "hoy+3"
    Then el sistema retorna estado 200
    And la respuesta de la pausa expone estado "CONGELADO"
