Feature: Gestión de Clientes
  Como dueño o recepcionista del gimnasio
  Quiero gestionar los clientes del gimnasio
  Para mantener la información organizada y actualizada

  # HU-04: Creación de cliente
  Scenario: Crear un cliente nuevo
    Given soy un usuario autenticado como DUENO
    When creo un cliente con cédula "1122334455", nombres "Carlos", apellidos "López", teléfono "3009876543" y sede "sede-1"
    Then el cliente se crea con estado "NUEVO"
    And el cliente tiene un PIN por defecto "1234"

  Scenario: No permitir cédula duplicada
    Given soy un usuario autenticado como DUENO
    And existe un cliente con cédula "1122334455"
    When intento crear otro cliente con cédula "1122334455"
    Then el sistema muestra error "Ya existe un cliente con esa cédula"

  Scenario Outline: Rechazar cédula con formato inválido al crear
    Given soy un usuario autenticado como DUENO
    When creo un cliente con cédula "<cedula>", nombres "Carlos", apellidos "López", teléfono "3009876543" y sede "sede-1"
    Then el sistema muestra error "<mensaje>"

    Examples:
      | cedula | mensaje |
      | 12345 | Cédula debe ser numérica de 6 a 10 dígitos |
      | 12345678901 | Cédula debe ser numérica de 6 a 10 dígitos |
      | abcdefgh | Cédula debe ser numérica de 6 a 10 dígitos |

  Scenario Outline: Rechazar teléfono con formato inválido al crear
    Given soy un usuario autenticado como DUENO
    When creo un cliente con cédula "1122334455", nombres "Carlos", apellidos "López", teléfono "<telefono>" y sede "sede-1"
    Then el sistema muestra error "<mensaje>"

    Examples:
      | telefono | mensaje |
      | 2001234567 | Teléfono debe ser móvil colombiano (3XXXXXXXXX) |
      | 300123456 | Teléfono debe ser móvil colombiano (3XXXXXXXXX) |
      | 30012345678 | Teléfono debe ser móvil colombiano (3XXXXXXXXX) |
      |abcdefghi | Teléfono debe ser móvil colombiano (3XXXXXXXXX) |

  Scenario Outline: Rechazar nombres con caracteres inválidos
    Given soy un usuario autenticado como DUENO
    When creo un cliente con cédula "1122334455", nombres "<nombres>", apellidos "López", teléfono "3009876543" y sede "sede-1"
    Then el sistema muestra error "<mensaje>"

    Examples:
      | nombres | mensaje |
      | Carlos123 | Nombres solo pueden contener letras y espacios |
      | Carlos@ | Nombres solo pueden contener letras y espacios |

  Scenario: Rechazar campos requeridos vacíos
    Given soy un usuario autenticado como DUENO
    When intento crear un cliente sin campos requeridos
    Then el sistema muestra error de validación

  Scenario: Rechazar email con formato inválido
    Given soy un usuario autenticado como DUENO
    When creo un cliente con cédula "1122334455", nombres "Carlos", apellidos "López", teléfono "3009876543", email "invalido" y sede "sede-1"
    Then el sistema muestra error "Email tiene formato inválido"

  # HU-05: Edición de cliente
  Scenario: Editar información de un cliente
    Given soy un usuario autenticado como DUENO
    And existe un cliente con cédula "1122334455"
    When actualizo el teléfono del cliente a "3001112233"
    Then el cliente tiene el teléfono actualizado "3001112233"

  Scenario: Editar cliente inexistente retorna 404
    Given soy un usuario autenticado como DUENO
    When intento editar un cliente con id "nonexistent-id"
    Then el sistema retorna estado 404

  Scenario Outline: Rechazar teléfono inválido al editar
    Given soy un usuario autenticado como DUENO
    And existe un cliente con cédula "1122334455"
    When actualizo el teléfono del cliente a "<telefono>"
    Then el sistema muestra error "<mensaje>"

    Examples:
      | telefono | mensaje |
      | 2001234567 | Teléfono debe ser móvil colombiano (3XXXXXXXXX) |
      | 300123456 | Teléfono debe ser móvil colombiano (3XXXXXXXXX) |

  Scenario Outline: Rechazar email inválido al editar
    Given soy un usuario autenticado como DUENO
    And existe un cliente con cédula "1122334455"
    When actualizo el email del cliente a "<email>"
    Then el sistema muestra error "<mensaje>"

    Examples:
      | email | mensaje |
      | invalido | Email tiene formato inválido |
      | @dominio.com | Email tiene formato inválido |

  # HU-06: Búsqueda y filtros
  Scenario: Buscar clientes por nombre
    Given soy un usuario autenticado como DUENO
    And existen clientes registrados
    When busco clientes con el término "Carlos"
    Then el sistema retorna clientes cuyo nombre o apellido contiene "Carlos"

  Scenario: Filtrar clientes por estado
    Given soy un usuario autenticado como DUENO
    And existen clientes con diferentes estados
    When filtro clientes por estado "ACTIVO"
    Then el sistema retorna solo clientes con estado "ACTIVO"

  Scenario: Filtrar clientes por sede
    Given soy un usuario autenticado como DUENO
    And existen clientes en diferentes sedes
    When filtro clientes por sede "sede-1"
    Then el sistema retorna solo clientes de la sede "sede-1"

  Scenario: Paginación funciona correctamente
    Given soy un usuario autenticado como DUENO
    And existen múltiples clientes registrados
    When busco clientes con página 1 y límite 2
    Then el sistema retorna máximo 2 clientes
    And el sistema indica el total de registros

  Scenario Outline: Rechazar parámetros de paginación inválidos
    Given soy un usuario autenticado como DUENO
    When busco clientes con página "<page>" y límite "<limit>"
    Then el sistema muestra error "<mensaje>"

    Examples:
      | page | limit | mensaje |
      | 0 | 10 | page debe ser un entero mayor o igual a 1 |
      | -1 | 10 | page debe ser un entero mayor o igual a 1 |
      | abc | 10 | page debe ser un entero mayor o igual a 1 |
      | 1 | 0 | limit debe ser un entero entre 1 y 100 |
      | 1 | 101 | limit debe ser un entero entre 1 y 100 |
      | 1 | abc | limit debe ser un entero entre 1 y 100 |

  Scenario Outline: Rechazar estado inválido en filtro
    Given soy un usuario autenticado como DUENO
    When filtro clientes por estado "<estado>"
    Then el sistema muestra error "<mensaje>"

    Examples:
      | estado | mensaje |
      | ESTADO_INVALIDO | Invalid enum value |
      | activo | Invalid enum value |

  # HU-07: Ficha única del cliente
  Scenario: Ver ficha única del cliente
    Given soy un usuario autenticado como DUENO
    And existe un cliente con cédula "1122334455"
    When consulto la ficha del cliente
    Then la ficha muestra datos personales, sede, estado, rutina activa y plan nutricional

  Scenario: Ficha de cliente inexistente retorna 404
    Given soy un usuario autenticado como DUENO
    When consulto la ficha del cliente con id "nonexistent-id"
    Then el sistema retorna estado 404

  Scenario: Acceder a ficha sin autenticar retorna 401
    When intento consultar ficha sin autenticación
    Then el sistema retorna estado 401

  Scenario Outline: Rechazar id inválido en ficha
    Given soy un usuario autenticado como DUENO
    When consulto la ficha del cliente con id "<id>"
    Then el sistema muestra error "<mensaje>"

    Examples:
      | id | mensaje |
      | | id es requerido |
