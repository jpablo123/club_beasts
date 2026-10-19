import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.contrasena);
  if (!valid) return null;

  return { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol };
}

export async function loginClient(cedula: string, pin: string) {
  const cliente = await prisma.cliente.findUnique({ where: { cedula } });
  if (!cliente) return null;

  const valid = await bcrypt.compare(pin, cliente.pin);
  if (!valid) return null;

  return {
    id: cliente.id,
    cedula: cliente.cedula,
    nombres: cliente.nombres,
    apellidos: cliente.apellidos,
    debeCambiarPin: cliente.debeCambiarPin,
    // INC-04 (HU-08 b4 / DEC-034): la ruta lo usa para el bloqueo de login
    // del cliente INACTIVO; NUNCA se expone en la respuesta de exito ni en
    // el token (la ruta lo separa antes de firmar).
    estado: cliente.estado,
  };
}

export async function resetPin(clienteId: string, newPin: string, actorId: string) {
  const hashed = await bcrypt.hash(newPin, 10);
  // Una unica operacion atomica: PIN nuevo + trazabilidad del actor (INC00-SEC-04).
  await prisma.cliente.update({
    where: { id: clienteId },
    data: {
      pin: hashed,
      debeCambiarPin: false,
      pinResetPorId: actorId,
      pinResetAt: new Date(),
    },
  });
}

export async function changePin(
  clienteId: string,
  currentPin: string,
  newPin: string
) {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) throw new Error("NOT_FOUND");

  const valid = await bcrypt.compare(currentPin, cliente.pin);
  if (!valid) throw new Error("INVALID_CURRENT_PIN");

  const hashed = await bcrypt.hash(newPin, 10);
  await prisma.cliente.update({
    where: { id: clienteId },
    data: { pin: hashed, debeCambiarPin: false },
  });

  return { message: "PIN actualizado correctamente" };
}
