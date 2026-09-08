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
  };
}

export async function resetPin(clienteId: string, newPin: string) {
  const hashed = await bcrypt.hash(newPin, 10);
  await prisma.cliente.update({
    where: { id: clienteId },
    data: { pin: hashed },
  });
}
