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
  // INC-03 / DEC-031: el recepcionista opera en una sede concreta; su sede se usa
  // como default cuando la creacion rapida (#5) omite sedeId. update: { sedeId }
  // tambien backfillea BDs de dev ya sembradas (idempotente).
  const recepHashed = await bcrypt.hash("recep123", 10);
  const recepcionista = await prisma.user.upsert({
    where: { email: "recep@clubbeasts.com" },
    update: { sedeId: "sede-1" },
    create: {
      email: "recep@clubbeasts.com",
      contrasena: recepHashed,
      nombre: "María García",
      rol: "RECEPCIONISTA",
      sedeId: "sede-1",
    },
  });

  console.log("Recepcionista creado:", { email: recepcionista.email, rol: recepcionista.rol, sedeId: recepcionista.sedeId });

  // Crear cliente de prueba
  const clienteHashed = await bcrypt.hash("1234", 10);
  const cliente = await prisma.cliente.upsert({
    where: { cedula: "1234567890" },
    // Idempotencia real de credenciales: el `update` vacio no restauraba el PIN
    // si algun test/manual cambio el cliente seed (el login devolvia
    // AUTH_INVALID_CREDENTIALS con el PIN documentado 1234). Mismo patron que
    // tests/setup-isolated-sqlite.ts (que ya re-fija `pin`). `debeCambiarPin`
    // vuelve a `true` para que el estado coincida con el de un cliente recien
    // creado (schema default) y permita probar el cambio obligatorio en /portal.
    update: { pin: clienteHashed, debeCambiarPin: true },
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

  // INC-12: clientes adicionales para tests de nutricion (idempotente por cedula)
  const clientesExtra = [
    { cedula: "1234567891", nombres: "Cliente", apellidos: "Inactivo", estado: "INACTIVO" },
    { cedula: "1234567892", nombres: "Cliente", apellidos: "Suspendido", estado: "SUSPENDIDO" },
    { cedula: "1234567893", nombres: "Cliente", apellidos: "SinServicio", estado: "ACTIVO" },
  ];
  for (const c of clientesExtra) {
    await prisma.cliente.upsert({
      where: { cedula: c.cedula },
      update: { estado: c.estado, pin: clienteHashed, debeCambiarPin: true },
      create: {
        cedula: c.cedula,
        nombres: c.nombres,
        apellidos: c.apellidos,
        telefono: "3000000000",
        email: `${c.cedula}@test.com`,
        sedeId: "sede-1",
        pin: clienteHashed,
        estado: c.estado,
      },
    });
  }

  // INC-12: plan nutricional seed (id pn-1)
  await prisma.planNutricional.upsert({
    where: { id: "pn-1" },
    update: {},
    create: {
      id: "pn-1",
      nombre: "Plan Seed",
      datosBiometricos: { peso: 70, altura: 175 },
      comidas: [],
      creadoPorId: admin.id,
      actualizadoPorId: admin.id,
    },
  });

  // INC-12: servicio de nutricion ACTIVO para cliente 1 (vigencia valida)
  const today = new Date().toISOString().slice(0, 10);
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await prisma.membresiaGym.create({
    data: {
      clienteId: cliente.id,
      fechaInicio: today,
      fechaFin: future,
      tipoServicio: "NUTRICION",
      creadoPorId: admin.id,
      actualizadoPorId: admin.id,
    },
  }).catch(() => {});
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
