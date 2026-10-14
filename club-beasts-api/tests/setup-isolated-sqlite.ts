import { exec } from "node:child_process";
import { rmSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const execAsync = promisify(exec);
const currentDir = path.dirname(fileURLToPath(import.meta.url));

type TestDbState = {
  ready?: Promise<void>;
  tempDir?: string;
  cleanupRegistered?: boolean;
};

const state = globalThis as typeof globalThis & {
  __clubBeastsTestDb?: TestDbState;
};

function registerCleanup() {
  if (state.__clubBeastsTestDb?.cleanupRegistered) return;

  state.__clubBeastsTestDb ??= {};
  state.__clubBeastsTestDb.cleanupRegistered = true;

  process.once("exit", () => {
    const tempDir = state.__clubBeastsTestDb?.tempDir;
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
}

function buildTestSchema(sourceSchema: string) {
  const testSchema = sourceSchema.replace(
    /url\s+=\s+"file:\.\/dev\.db"/,
    'url      = env("DATABASE_URL")',
  );

  if (testSchema === sourceSchema || !testSchema.includes('url      = env("DATABASE_URL")')) {
    throw new Error(
      'INC00-QA-04: test schema isolation failed: datasource db.url was not replaced with env("DATABASE_URL").',
    );
  }

  if (/url\s+=\s+"file:\.\/dev\.db"/.test(testSchema)) {
    throw new Error(
      "INC00-QA-04: test schema isolation failed: temporary schema still points to prisma/dev.db.",
    );
  }

  return testSchema;
}

async function seedDeterministicFixtures(databaseUrl: string) {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    const [adminPassword, receptionistPassword, clientPin] = await Promise.all([
      bcrypt.hash("admin123", 10),
      bcrypt.hash("recep123", 10),
      bcrypt.hash("1234", 10),
    ]);

    await prisma.sede.upsert({
      where: { id: "sede-1" },
      update: { nombre: "Sede Principal", direccion: "Dirección por definir" },
      create: { id: "sede-1", nombre: "Sede Principal", direccion: "Dirección por definir" },
    });

    await prisma.sede.upsert({
      where: { id: "sede-2" },
      update: { nombre: "Sede Secundaria", direccion: "Dirección por definir" },
      create: { id: "sede-2", nombre: "Sede Secundaria", direccion: "Dirección por definir" },
    });

    // INC-03 (DEC-031 / GAP-RED-01): staff del seed con sede `sede-1` (igual
    // que prisma/seed.ts para el recepcionista) para que el flujo rapido sin
    // `sedeId` pueda resolver la sede default del token (RAP-01 y RAP-05
    // ejercitan el camino default con el token del dueno y del recepcionista).
    await prisma.user.upsert({
      where: { email: "admin@clubbeasts.com" },
      update: {
        contrasena: adminPassword,
        nombre: "David Rozo",
        rol: "DUENO",
        sedeId: "sede-1",
      },
      create: {
        email: "admin@clubbeasts.com",
        contrasena: adminPassword,
        nombre: "David Rozo",
        rol: "DUENO",
        sedeId: "sede-1",
      },
    });

    // INC-03 (DEC-031 / GAP-RED-01): el recepcionista del seed lleva sede
    // `sede-1` (igual que prisma/seed.ts) para que el flujo rapido sin
    // `sedeId` pueda resolver la sede default del token.
    await prisma.user.upsert({
      where: { email: "recep@clubbeasts.com" },
      update: {
        contrasena: receptionistPassword,
        nombre: "María García",
        rol: "RECEPCIONISTA",
        sedeId: "sede-1",
      },
      create: {
        email: "recep@clubbeasts.com",
        contrasena: receptionistPassword,
        nombre: "María García",
        rol: "RECEPCIONISTA",
        sedeId: "sede-1",
      },
    });

    await prisma.cliente.upsert({
      where: { cedula: "1234567890" },
      update: {
        nombres: "Carlos",
        apellidos: "Rodríguez",
        telefono: "3001234567",
        email: "carlos@test.com",
        sedeId: "sede-1",
        pin: clientPin,
        estado: "ACTIVO",
      },
      create: {
        cedula: "1234567890",
        nombres: "Carlos",
        apellidos: "Rodríguez",
        telefono: "3001234567",
        email: "carlos@test.com",
        sedeId: "sede-1",
        pin: clientPin,
        estado: "ACTIVO",
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function prepareIsolatedSqliteDatabase() {
  state.__clubBeastsTestDb ??= {};

  if (state.__clubBeastsTestDb.ready) {
    await state.__clubBeastsTestDb.ready;
    return;
  }

  state.__clubBeastsTestDb.ready = (async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "club-beasts-api-vitest-"));
    state.__clubBeastsTestDb!.tempDir = tempDir;
    registerCleanup();

    const dbPath = path.join(tempDir, "test.db");
    const schemaPath = path.join(tempDir, "schema.prisma");
    const sourceSchemaPath = path.resolve(currentDir, "../prisma/schema.prisma");
    const sourceSchema = await readFile(sourceSchemaPath, "utf8");
    const testSchema = buildTestSchema(sourceSchema);

    await writeFile(schemaPath, testSchema, "utf8");

    const databaseUrl = `file:${dbPath.replace(/\\/g, "/")}`;
    process.env.DATABASE_URL = databaseUrl;
    process.env.JWT_SECRET ??= "vitest-isolated-sqlite-secret";

    const projectRoot = path.resolve(currentDir, "..");
    const quote = (value: string) => `"${value.replace(/"/g, '\\"')}"`;
    const npmCommand = process.env.npm_execpath
      ? `${quote(process.execPath)} ${quote(process.env.npm_execpath)}`
      : quote(process.platform === "win32" ? "npm.cmd" : "npm");
    const command = [
      npmCommand,
      "exec",
      "--prefix",
      quote(projectRoot),
      "--",
      "prisma",
      "db",
      "push",
      "--schema",
      quote(schemaPath),
      "--skip-generate",
    ].join(" ");

    await execAsync(command, {
      cwd: tempDir,
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    await seedDeterministicFixtures(databaseUrl);
  })();

  await state.__clubBeastsTestDb.ready;
}

await prepareIsolatedSqliteDatabase();
