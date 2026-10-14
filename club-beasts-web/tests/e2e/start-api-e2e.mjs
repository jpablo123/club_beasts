import { exec } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(currentDir, "../..");
const workspaceDir = path.resolve(webDir, "..");
const apiDir = path.join(workspaceDir, "club-beasts-api");
const requireFromApi = createRequire(path.join(apiDir, "package.json"));
const { PrismaClient } = requireFromApi("@prisma/client");
const bcrypt = requireFromApi("bcryptjs");

const quote = (value) => `"${String(value).replace(/"/g, '\\"')}"`;
const tempDir = await mkdtemp(path.join(os.tmpdir(), "club-beasts-e2e-"));
const dbPath = path.join(tempDir, "e2e.db");
const schemaPath = path.join(tempDir, "schema.prisma");
const databaseUrl = `file:${dbPath.replace(/\\/g, "/")}`;

async function cleanup() {
  await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
}

function shutdown(child) {
  child.kill();
  cleanup().finally(() => process.exit(0));
}

async function prepareSchema() {
  const sourceSchema = await readFile(path.join(apiDir, "prisma/schema.prisma"), "utf8");
  const e2eSchema = sourceSchema.replace(
    /url\s+=\s+"file:\.\/dev\.db"/,
    'url      = env("DATABASE_URL")',
  );

  if (e2eSchema === sourceSchema || /url\s+=\s+"file:\.\/dev\.db"/.test(e2eSchema)) {
    throw new Error("INC00-QA-05: no se pudo aislar SQLite para E2E sin tocar prisma/dev.db.");
  }

  await writeFile(schemaPath, e2eSchema, "utf8");
  await execAsync(
    `${quote(process.execPath)} ${quote(path.join(apiDir, "node_modules/prisma/build/index.js"))} db push --schema ${quote(schemaPath)} --skip-generate`,
    { cwd: apiDir, env: { ...process.env, DATABASE_URL: databaseUrl } },
  );
}

async function seedDeterministicFixtures() {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    const [adminPassword, receptionistPassword, clientPin] = await Promise.all([
      bcrypt.hash("admin123", 10),
      bcrypt.hash("recep123", 10),
      bcrypt.hash("1234", 10),
    ]);

    await prisma.sede.upsert({
      where: { id: "sede-1" },
      update: { nombre: "Sede Principal", direccion: "Direccion por definir" },
      create: { id: "sede-1", nombre: "Sede Principal", direccion: "Direccion por definir" },
    });

    await prisma.sede.upsert({
      where: { id: "sede-2" },
      update: { nombre: "Sede Secundaria", direccion: "Direccion por definir" },
      create: { id: "sede-2", nombre: "Sede Secundaria", direccion: "Direccion por definir" },
    });

    await prisma.user.upsert({
      where: { email: "admin@clubbeasts.com" },
      update: { contrasena: adminPassword, nombre: "David Rozo", rol: "DUENO" },
      create: {
        email: "admin@clubbeasts.com",
        contrasena: adminPassword,
        nombre: "David Rozo",
        rol: "DUENO",
      },
    });

    await prisma.user.upsert({
      where: { email: "recep@clubbeasts.com" },
      // INC-03 / DEC-031 (GAP-RED-01): el recepcionista opera en una sede
      // concreta; su `sedeId` es el default de la creacion rapida de
      // clientes. Espejo exacto de `club-beasts-api/prisma/seed.ts` (el
      // fixture E2E se alinea con el GREEN; el alta rapida sin `sedeId`
      // respondria 400 "sedeId es requerido"). El DUENO del seed NO tiene
      // sede: comportamiento ratificado en el spec INC-03 #5.
      update: {
        contrasena: receptionistPassword,
        nombre: "Maria Garcia",
        rol: "RECEPCIONISTA",
        sedeId: "sede-1",
      },
      create: {
        email: "recep@clubbeasts.com",
        contrasena: receptionistPassword,
        nombre: "Maria Garcia",
        rol: "RECEPCIONISTA",
        sedeId: "sede-1",
      },
    });

    await prisma.cliente.upsert({
      where: { cedula: "1234567890" },
      update: {
        nombres: "Carlos",
        apellidos: "Rodriguez",
        telefono: "3001234567",
        email: "carlos@test.com",
        sedeId: "sede-1",
        pin: clientPin,
        debeCambiarPin: false,
        estado: "ACTIVO",
      },
      create: {
        cedula: "1234567890",
        nombres: "Carlos",
        apellidos: "Rodriguez",
        telefono: "3001234567",
        email: "carlos@test.com",
        sedeId: "sede-1",
        pin: clientPin,
        debeCambiarPin: false,
        estado: "ACTIVO",
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

await prepareSchema();
await seedDeterministicFixtures();

const { spawn } = await import("node:child_process");
const child = spawn(
  process.execPath,
  [path.join(apiDir, "node_modules/tsx/dist/cli.mjs"), "watch", "src/index.ts"],
  {
  cwd: apiDir,
  env: {
    ...process.env,
    VITEST: "1",
    DATABASE_URL: databaseUrl,
    JWT_SECRET: "playwright-e2e-jwt-secret",
    PORT: "3001",
  },
  stdio: "inherit",
  },
);

process.on("SIGINT", () => shutdown(child));
process.on("SIGTERM", () => shutdown(child));
process.on("exit", () => child.kill());
child.on("exit", (code) => cleanup().finally(() => process.exit(code ?? 0)));
