-- CreateTable
CREATE TABLE "MembresiaGym" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "fechaInicio" TEXT NOT NULL,
    "fechaFin" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "actualizadoPorId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MembresiaGym_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MembresiaGym_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MembresiaGym_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MembresiaGymCambio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "membresiaId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fechaInicioAnterior" TEXT,
    "fechaFinAnterior" TEXT,
    "fechaInicioNueva" TEXT NOT NULL,
    "fechaFinNueva" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MembresiaGymCambio_membresiaId_fkey" FOREIGN KEY ("membresiaId") REFERENCES "MembresiaGym" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MembresiaGymCambio_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MembresiaGym_clienteId_fechaInicio_idx" ON "MembresiaGym"("clienteId", "fechaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "MembresiaGymCambio_membresiaId_version_key" ON "MembresiaGymCambio"("membresiaId", "version");
