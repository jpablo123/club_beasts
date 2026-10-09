import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Crear sedes por defecto
  const sede1 = await prisma.sede.upsert({
    where: { id: "sede-1" },
    update: {},
    create: { id: "sede-1", nombre: "Sede Principal", direccion: "Dirección por definir" },
  });

  const sede2 = await prisma.sede.upsert({
    where: { id: "sede-2" },
    update: {},
    create: { id: "sede-2", nombre: "Sede Secundaria", direccion: "Dirección por definir" },
  });

  console.log("Sedes creadas:", { sede1, sede2 });

  // Crear usuario admin (dueño)
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@clubbeasts.com" },
    update: {},
    create: {
      email: "admin@clubbeasts.com",
      contrasena: hashedPassword,
      nombre: "David Rozo",
      rol: "DUENO",
    },
  });

  console.log("Admin creado:", { email: admin.email, rol: admin.rol });

  // Crear recepcionista
  const recepHashed = await bcrypt.hash("recep123", 10);
  const recepcionista = await prisma.user.upsert({
    where: { email: "recep@clubbeasts.com" },
    update: {},
    create: {
      email: "recep@clubbeasts.com",
      contrasena: recepHashed,
      nombre: "María García",
      rol: "RECEPCIONISTA",
    },
  });

  console.log("Recepcionista creado:", { email: recepcionista.email, rol: recepcionista.rol });

  // Crear cliente de prueba
  const clienteHashed = await bcrypt.hash("1234", 10);
  const cliente = await prisma.cliente.upsert({
    where: { cedula: "1234567890" },
    update: {},
    create: {
      cedula: "1234567890",
      nombres: "Carlos",
      apellidos: "Rodríguez",
      telefono: "3001234567",
      email: "carlos@test.com",
      sedeId: "sede-1",
      pin: clienteHashed,
      estado: "ACTIVO",
    },
  });

  console.log("Cliente creado:", { cedula: cliente.cedula, nombre: `${cliente.nombres} ${cliente.apellidos}` });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
