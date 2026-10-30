@inc05
Feature: Registro de servicio personalizado con vigencia y estados calculados
  Como dueno o recepcionista del gimnasio
  Quiero registrar y consultar la vigencia del servicio personalizado del cliente
  Para controlar si el cliente tiene una rutina personalizada vigente

  # INC-05 / INC05-PER-01 (HU13-C01, contrato ratificado 2026-10-20):
  # POST /clientes/:clienteId/servicios-personalizado.
  # Fechas DINAMICAS (DEC-005/006/013): tokens "hoy", "hoy+N", "hoy-N".
  Background:
    Given soy un usuario autenticado como DUENO
    And existe un cliente de prueba con cédula "9940000011"

  # INC05-PER-01: happy path con DTO, version 1, actor y auditoria CREACION.
  Scenario: Registrar la vigencia del servicio personalizado
    When intento registrar el servicio personalizado con inicio "hoy-5" y fin "hoy+25"
    Then el sistema retorna estado 201
    And la creación del servicio personalizado quedó registrada con versión 1

  # INC05-PER-01 / DEC-017: el recepcionista tambien gestiona vigencias.
  Scenario: Recepcionista registra una vigencia de personalizado
    Given el recepcionista está autenticado
    When intento registrar el servicio personalizado con inicio "hoy-5" y fin "hoy+25"
    Then el sistema retorna estado 201

  # INC05-PER-01: validacion por campo con los mensajes exactos del G14.
  Scenario Outline: Rechazar fechas inválidas al registrar el servicio
    When intento registrar el servicio personalizado con inicio "<inicio>" y fin "<fin>"
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

  # INC05-PER-01 / DEC-008: solape inclusive rechazado con code propio DEC-044.
  Scenario: Rechazar periodo solapado con uno existente
    Given el cliente de prueba tiene una vigencia de personalizado del "hoy-10" al "hoy+10"
    When intento registrar el servicio personalizado con inicio "hoy+10" y fin "hoy+30"
    Then el sistema retorna estado 409
    And el sistema responde con el código de error "SERVICIO_SOLAPADA"
    And el mensaje de error es exactamente "Las fechas se solapan con un período existente"
    And el cliente de prueba tiene 1 vigencia de personalizado en la base

  # INC05-PER-01 / DEC-007: renovar crea periodo nuevo, el anterior queda intacto.
  Scenario: Renovar crea un periodo nuevo sin sobrescribir el anterior
    Given el cliente de prueba tiene una vigencia de personalizado del "hoy-40" al "hoy-31"
    When intento registrar el servicio personalizado con inicio "hoy-30" y fin "hoy"
    Then el sistema retorna estado 201
    When consulto las vigencias del servicio personalizado
    Then la lista de personalizado tiene 2 vigencias
    And la vigencia de personalizado del "hoy-40" al "hoy-31" conserva la versión 1

  # INC05-PER-01 / DEC-004: el solape se evalua POR TIPO, nunca cruzado.
  Scenario: El solape se evalua por tipo y una vigencia de gym no bloquea el personalizado
    Given la vigencia gym del cliente de prueba va de "hoy-10" a "hoy+10"
    When intento registrar el servicio personalizado con inicio "hoy-10" y fin "hoy+10"
    Then el sistema retorna estado 201
    And el cliente de prueba tiene 1 vigencia de personalizado en la base

  # INC05-PER-01: 404 NOT_FOUND para cliente inexistente.
  Scenario: Registrar vigencia para cliente inexistente retorna 404
    When intento registrar el servicio personalizado para el cliente "cliente-inexistente-inc05"
    Then el sistema retorna estado 404
    And el sistema responde con el código de error "NOT_FOUND"
    And el mensaje de error es exactamente "Cliente no encontrado"

  # INC05-PER-01 / DEC-017: el rol CLIENTE no gestiona vigencias (403).
  Scenario: El rol CLIENTE no puede registrar vigencias
    Given el cliente de prueba está autenticado en el portal
    When con la sesión del cliente registro el servicio personalizado con inicio "hoy-5" y fin "hoy+25"
    Then el sistema retorna estado 403
    And el sistema responde con el código de error "AUTH_FORBIDDEN"
    And el mensaje de error es exactamente "No tienes permisos para realizar esta acción."

  # INC05-PER-01 / CONF-06: guarda heredada de HU-08 sobre servicios nuevos.
  Scenario: No se registra vigencia para un cliente inactivo
    Given el cliente de prueba tiene estado "INACTIVO"
    When intento registrar el servicio personalizado con inicio "hoy-5" y fin "hoy+25"
    Then el sistema retorna estado 409
    And el sistema responde con el código de error "CLIENTE_INACTIVO"
    And el mensaje de error es exactamente "El cliente está inactivo. Reactíveolo antes de asignar servicios nuevos."
    And el cliente de prueba tiene 0 vigencia de personalizado en la base

  # INC05-PER-01 / CONF-01: el orden fija la guarda ANTES del solape.
  Scenario: La guarda CLIENTE_INACTIVO se evalua antes del solape
    Given el cliente de prueba tiene estado "INACTIVO"
    And el cliente de prueba tiene una vigencia de personalizado del "hoy-10" al "hoy+10"
    When intento registrar el servicio personalizado con inicio "hoy" y fin "hoy+5"
    Then el sistema retorna estado 409
    And el sistema responde con el código de error "CLIENTE_INACTIVO"
    And el cliente de prueba tiene 1 vigencia de personalizado en la base

  # INC05-PER-02 (HU13-C02a): lista vacia = NO_CONTRATADO implicito.
  Scenario: Estado sin vigencias contratadas
    When consulto las vigencias del servicio personalizado
    Then el sistema retorna estado 200
    And la lista de personalizado tiene 0 vigencias

  # INC05-PER-02: bordes inclusivos (DEC-006): ACTIVA en el dia final.
  Scenario: La vigencia sigue activa en su día final
    Given el cliente de prueba tiene una vigencia de personalizado del "hoy-10" al "hoy"
    When consulto las vigencias del servicio personalizado
    Then la unica vigencia de personalizado tiene estado "ACTIVA"

  # INC05-PER-02: VENCIDA al dia siguiente del fin (inclusivo).
  Scenario: La vigencia vence al día siguiente de su fecha fin
    Given el cliente de prueba tiene una vigencia de personalizado del "hoy-30" al "hoy-1"
    When consulto las vigencias del servicio personalizado
    Then la unica vigencia de personalizado tiene estado "VENCIDA"

  # INC05-PER-02 / DEC-043: periodo futuro = PROGRAMADA (literal ratificado).
  Scenario: Un periodo futuro se muestra como PROGRAMADA
    Given el cliente de prueba tiene una vigencia de personalizado del "hoy+5" al "hoy+30"
    When consulto las vigencias del servicio personalizado
    Then la unica vigencia de personalizado tiene estado "PROGRAMADA"

  # INC05-PER-04 (HU13-C03): el listado propio FILTRA por su tipo.
  Scenario: El listado propio solo incluye las vigencias de personalizado
    Given la vigencia gym del cliente de prueba va de "hoy-20" a "hoy-15"
    And el cliente de prueba tiene una vigencia de personalizado del "hoy-10" al "hoy+10"
    And el cliente de prueba tiene una vigencia de nutricion del "hoy-15" al "hoy+5"
    When consulto las vigencias del servicio personalizado
    Then la lista de personalizado tiene 1 vigencias
    And la unica vigencia de personalizado tiene estado "ACTIVA"

  # INC05-PER-03 (HU13-C02b): CONGELADO con pausa de INC-02 (DEC-043 literal).
  Scenario: Estado CONGELADO con una pausa vigente
    Given el cliente de prueba tiene una vigencia de personalizado con pausa vigente
    When consulto las vigencias del servicio personalizado
    Then la unica vigencia de personalizado tiene estado "CONGELADO"

  # INC05-PER-03: al terminar la pausa vuelve el calculo con la extension aceptada.
  Scenario: Al terminar la pausa el estado vuelve al calculo normal con fechaFin extendida
    Given el cliente de prueba tiene una vigencia de personalizado con pausa vigente
    When hago que la pausa vigente de la vigencia de personalizado termine
    And consulto las vigencias del servicio personalizado
    Then la unica vigencia de personalizado tiene estado "ACTIVA"
    And la fecha fin de la unica vigencia de personalizado queda "hoy+13"

  # INC05-PER-04 (HU13-C03): la ficha expone la fila con fechas y estado.
  Scenario: La vigencia de personalizado es visible en la ficha con sus fechas y estado
    Given el cliente de prueba tiene una vigencia de personalizado del "hoy-10" al "hoy+10"
    When consulto la ficha del cliente de prueba como staff
    Then la ficha muestra la vigencia de personalizado del "hoy-10" al "hoy+10" con estado "ACTIVA"

  # INC05-PER-04 / NUT-04: cada fila de la ficha conserva su tipoServicio (F8).
  Scenario: La ficha expone cada fila con su tipoServicio cuando hay tipos mixtos
    Given la vigencia gym del cliente de prueba va de "hoy-30" a "hoy-20"
    And el cliente de prueba tiene una vigencia de personalizado del "hoy-10" al "hoy+10"
    And el cliente de prueba tiene una vigencia de nutricion del "hoy+20" al "hoy+40"
    When consulto la ficha del cliente de prueba como staff
    Then la ficha muestra la vigencia de personalizado del "hoy-10" al "hoy+10" con estado "ACTIVA"
    And la ficha muestra una vigencia de nutricion con estado "PROGRAMADA"

  # INC05-PER-01 rama 8 / DEC-046: concurrencia optimista, version vieja -> 409.
  Scenario: Editar con version vieja retorna 409 SERVICIO_CONFLICTO
    Given el cliente de prueba tiene una vigencia de personalizado del "hoy-10" al "hoy+10"
    When edito la vigencia de personalizado con inicio "hoy-9" y fin "hoy+11" y versión 2
    Then el sistema retorna estado 409
    And el sistema responde con el código de error "SERVICIO_CONFLICTO"
    And el mensaje de error es exactamente "Los datos fueron modificados por otro usuario. Recargue e intente nuevamente."

  # INC05-PER-01 / DEC-047: mover solo fechaInicio desplaza fechaFin por el delta.
  Scenario: Mover solo el inicio desplaza el fin por el mismo delta conservando la duración
    Given el cliente de prueba tiene una vigencia de personalizado del "hoy-10" al "hoy+19"
    When edito la vigencia de personalizado moviendo solo el inicio a "hoy-9" con versión 1
    Then el sistema retorna estado 200
    And la respuesta de la edicion expone la fecha fin "hoy+20"
    And la respuesta de la edicion expone la versión 2

  # INC05-PER-01 / DEC-047: fechaFin explicito manda y cambia la duracion.
  Scenario: Cambiar solo el fin cambia la duración pedida en el cuerpo
    Given el cliente de prueba tiene una vigencia de personalizado del "hoy-10" al "hoy+19"
    When edito la vigencia de personalizado cambiando solo el fin a "hoy+29" con versión 1
    Then el sistema retorna estado 200
    And la respuesta de la edicion expone la fecha fin "hoy+29"
    And la respuesta de la edicion expone la versión 2

  # INC05-PER-01 / correccion C2: validacion pre-desplazamiento, sin escrituras.
  Scenario: Mover el inicio más allá del fin persistido retorna 400 sin desplazar
    Given el cliente de prueba tiene una vigencia de personalizado del "hoy-10" al "hoy+10"
    When edito la vigencia de personalizado moviendo solo el inicio a "hoy+15" con versión 1
    Then el sistema retorna estado 400
    And el mensaje de error es exactamente "Fecha fin no puede ser anterior a fecha de inicio"
    And el cliente de prueba tiene 1 vigencia de personalizado en la base

  # INC05-PER-01 / DEC-008: el solape tras mover el inicio tambien es 409.
  Scenario: Editar contra otro periodo del mismo tipo retorna 409 SERVICIO_SOLAPADA
    Given el cliente de prueba tiene una vigencia de personalizado del "hoy-40" al "hoy-31"
    And el cliente de prueba tiene una vigencia de personalizado del "hoy-10" al "hoy+10"
    When edito la vigencia de personalizado moviendo solo el inicio a "hoy-35" con versión 1
    Then el sistema retorna estado 409
    And el sistema responde con el código de error "SERVICIO_SOLAPADA"
    And el cliente de prueba tiene 2 vigencia de personalizado en la base

  # INC05-PER-01 / correccion C6: la pertenencia incluye el tipoServicio.
  Scenario: Editar la ultima vigencia de gym como personalizado retorna 404
    Given la vigencia gym del cliente de prueba va de "hoy-10" a "hoy+10"
    When edito como personalizado la ultima vigencia de gym con versión 1
    Then el sistema retorna estado 404
    And el sistema responde con el código de error "NOT_FOUND"
    And el mensaje de error es exactamente "Servicio no encontrado"

  # INC05-PER-01 / correccion C6: id inexistente tambien responde 404.
  Scenario: Editar una vigencia inexistente retorna 404
    When edito como personalizado una vigencia inexistente con versión 1
    Then el sistema retorna estado 404
    And el sistema responde con el código de error "NOT_FOUND"
    And el mensaje de error es exactamente "Servicio no encontrado"

  # INC-05 regresion C1 (fixture F8): congelar GYM no sufre 409 espurio por
  # una fila PERSONALIZADO solapada (filtro de tipo exigido al backend).
  Scenario: Congelar la vigencia de gym no produce 409 espurio por una fila de personalizado solapada
    Given el cliente de prueba tiene una vigencia de gym y una de personalizado simultaneas
    When congelo la vigencia de gym del cliente de prueba con pausa del "hoy" al "hoy+2"
    Then el sistema retorna estado 200
    And la respuesta de la pausa expone estado "CONGELADO"
