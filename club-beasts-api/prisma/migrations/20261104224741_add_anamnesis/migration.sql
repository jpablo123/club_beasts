-- CreateTable
CREATE TABLE "Anamnesis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "nombreCompleto" TEXT,
    "numeroDocumento" TEXT,
    "sexo" TEXT,
    "rh" TEXT,
    "edad" INTEGER,
    "fechaNacimiento" TEXT,
    "lugarNacimiento" TEXT,
    "estadoCivil" TEXT,
    "direccionResidencia" TEXT,
    "numeroContacto" TEXT,
    "correoElectronico" TEXT,
    "practicaDeporte" TEXT,
    "cualDeporte" TEXT,
    "tiempoQuePractica" TEXT,
    "contactoEmergencia" TEXT,
    "eps" TEXT,
    "antecedentesMedicos" TEXT,
    "antecedentesFamiliares" TEXT,
    "enfermedadRelevante" TEXT,
    "cualEnfermedad" TEXT,
    "objetivosEntrenamiento" TEXT,
    "nivelActividad" TEXT,
    "diasNoEntrenamiento" TEXT,
    "horaAcostarse" TEXT,
    "comidasPorDia" INTEGER,
    "actualizadoPorId" TEXT NOT NULL,
    "fechaActualizacion" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Anamnesis_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Anamnesis_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Anamnesis_clienteId_key" ON "Anamnesis"("clienteId");
