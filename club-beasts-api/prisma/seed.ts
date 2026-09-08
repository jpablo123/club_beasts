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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
