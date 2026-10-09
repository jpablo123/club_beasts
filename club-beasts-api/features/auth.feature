@inc00
Feature: Autenticación
  Como dueño o recepcionista del gimnasio
  Quiero iniciar sesión con mis credenciales
  Para acceder al sistema según mi rol

  # HU-01: Login dueño/recepcionista
  Scenario: Login exitoso del dueño
    Given un usuario registrado con email "admin@clubbeasts.com" y contraseña "admin123"
    When el usuario ingresa email "admin@clubbeasts.com" y contraseña "admin123"
    Then el sistema muestra un token JWT válido
    And el rol del usuario es "DUENO"

  Scenario: Login fallido con contraseña incorrecta
    Given un usuario registrado con email "admin@clubbeasts.com" y contraseña "admin123"
    When el usuario ingresa email "admin@clubbeasts.com" y contraseña "incorrecta"
    Then el sistema muestra error "Credenciales inválidas"

  Scenario: Login fallido con email inexistente
    When el usuario ingresa email "noexiste@test.com" y contraseña "123456"
    Then el sistema muestra error "Credenciales inválidas"

  Scenario Outline: Rechazar email con formato inválido
    When el usuario ingresa email "<email>" y contraseña "admin123"
    Then el sistema muestra error "<mensaje>"

    Examples:
      | email | mensaje |
      | sinformato | Email tiene formato inválido |
      | @dominio.com | Email tiene formato inválido |
      | usuario@ | Email tiene formato inválido |
      | usuario@.com | Email tiene formato inválido |

  Scenario: Rechazar email vacío
    When el usuario ingresa email "" y contraseña "admin123"
    Then el sistema muestra error "Email es requerido"

  Scenario: Rechazar contraseña vacía
    When el usuario ingresa email "admin@clubbeasts.com" y contraseña ""
    Then el sistema muestra error "Contraseña es requerida"

  # HU-02: Login cliente con cédula y PIN
  Scenario: Login del cliente con cédula y PIN
    Given un cliente registrado con cédula "1234567890" y PIN "1234"
    When el cliente ingresa cédula "1234567890" y PIN "1234"
    Then el sistema muestra un token JWT válido
    And el sistema retorna los datos del cliente

  Scenario: Login del cliente con PIN inválido
    Given un cliente registrado con cédula "1234567890" y PIN "1234"
    When el cliente ingresa cédula "1234567890" y PIN "9999"
    Then el sistema muestra error "Cédula o PIN inválido"

  Scenario: Login del cliente con PIN no numérico
    When el cliente ingresa cédula "1234567890" y PIN "abcd"
    Then el sistema muestra error "PIN debe ser de 4 dígitos"

  Scenario Outline: Rechazar PIN con longitud inválida
    When el cliente ingresa cédula "1234567890" y PIN "<pin>"
    Then el sistema muestra error "PIN debe ser de 4 dígitos"

    Examples:
      | pin |
      | 123 |
      | 12345 |
      | 12 |
      | 123456 |

  Scenario Outline: Rechazar cédula con formato inválido
    When el cliente ingresa cédula "<cedula>" y PIN "1234"
    Then el sistema muestra error "Cédula debe ser numérica de 6 a 10 dígitos"

    Examples:
      | cedula |
      | 12345 |
      | 12345678901 |
      | abcdefgh |
      | 12-345678 |

  Scenario: Rechazar cédula vacía
    When el cliente ingresa cédula "" y PIN "1234"
    Then el sistema muestra error "Cédula es requerida"

  # HU-03: Restablecimiento de PIN
  Scenario: Reset PIN exitoso
    Given soy un usuario autenticado como DUENO
    And existe un cliente con id "cliente-1"
    When restablezco el PIN del cliente "cliente-1" a "5678"
    Then el sistema muestra mensaje "PIN actualizado correctamente"

  Scenario: Reset PIN sin autenticar retorna 401
    When intento restablecer PIN sin autenticación
    Then el sistema retorna estado 401

  Scenario Outline: Rechazar PIN inválido en reset
    Given soy un usuario autenticado como DUENO
    When restablezco el PIN del cliente "cliente-1" a "<pin>"
    Then el sistema muestra error "PIN debe ser de 4 dígitos"

    Examples:
      | pin |
      | 123 |
      | 12345 |
      | abcd |
      | 12ab |

  Scenario: Rechazar clienteId vacío en reset
    Given soy un usuario autenticado como DUENO
    When restablezco el PIN del cliente "" a "5678"
    Then el sistema muestra error "clienteId es requerido"
