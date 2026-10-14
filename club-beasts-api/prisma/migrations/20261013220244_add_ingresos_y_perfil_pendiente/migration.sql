-- CreateTable
CREATE TABLE "Ingreso" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ingreso_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ingreso_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ingreso_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- AlterTable
-- Portabilizado (precedente INC-02, migracion 20261008184627): el motor de Prisma
-- genera RedefineTables para columnas NOT NULL con default en SQLite; aqui se usa
-- ADD COLUMN puro, compatible con SQLite (dev) y PostgreSQL (prod), sin rewrite de
-- filas existentes (todas quedan perfilPendiente = false, DEC-032).
ALTER TABLE "Cliente" ADD COLUMN "perfilPendiente" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Ingreso_clienteId_fecha_idx" ON "Ingreso"("clienteId", "fecha");
