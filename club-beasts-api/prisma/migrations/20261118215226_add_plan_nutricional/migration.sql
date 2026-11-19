-- CreateTable
CREATE TABLE "PlanNutricional" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "datosBiometricos" JSONB NOT NULL,
    "macronutrientes" JSONB,
    "comidas" JSONB NOT NULL,
    "recomendaciones" TEXT,
    "suplementacion" TEXT,
    "observacionesGenerales" TEXT,
    "creadoPorId" TEXT,
    "actualizadoPorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlanNutricional_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PlanNutricional_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanNutricionalAsignacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "fechaInicio" TEXT NOT NULL,
    "fechaFin" TEXT,
    "actorId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "activaClave" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlanNutricionalAsignacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlanNutricionalAsignacion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanNutricional" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlanNutricionalAsignacion_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanNutricionalAsignacion_activaClave_key" ON "PlanNutricionalAsignacion"("activaClave");

-- CreateIndex
CREATE INDEX "PlanNutricionalAsignacion_clienteId_fechaInicio_idx" ON "PlanNutricionalAsignacion"("clienteId", "fechaInicio");

-- CreateIndex
CREATE INDEX "PlanNutricionalAsignacion_planId_idx" ON "PlanNutricionalAsignacion"("planId");
