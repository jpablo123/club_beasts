-- CreateTable
CREATE TABLE "Rutina" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipoRutina" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "objetivo" TEXT,
    "nivelExperiencia" TEXT,
    "sesiones" TEXT,
    "informacionGeneral" TEXT,
    "diagnostico" TEXT,
    "macrociclos" TEXT,
    "tests" TEXT,
    "antropometria" TEXT,
    "analisisBiomecanico" TEXT,
    "actualizadoPorId" TEXT NOT NULL,
    "fechaActualizacion" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rutina_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RutinaAsignacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "rutinaId" TEXT NOT NULL,
    "fechaInicio" TEXT NOT NULL,
    "fechaFin" TEXT,
    "actorId" TEXT NOT NULL,
    "contenidoSnapshot" TEXT NOT NULL,
    "activaClave" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RutinaAsignacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RutinaAsignacion_rutinaId_fkey" FOREIGN KEY ("rutinaId") REFERENCES "Rutina" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RutinaAsignacion_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RutinaAsignacion_activaClave_key" ON "RutinaAsignacion"("activaClave");

-- CreateIndex
CREATE INDEX "RutinaAsignacion_clienteId_fechaInicio_idx" ON "RutinaAsignacion"("clienteId", "fechaInicio");

-- CreateIndex
CREATE INDEX "RutinaAsignacion_rutinaId_idx" ON "RutinaAsignacion"("rutinaId");
