-- CreateTable
CREATE TABLE "NotificacionEnvio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "fechaVencimiento" DATETIME NOT NULL,
    "tipoAviso" TEXT NOT NULL,
    "enviadoEn" DATETIME NOT NULL,
    "canal" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    CONSTRAINT "NotificacionEnvio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "NotificacionEnvio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "MembresiaGym" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificacionEnvio_clienteId_servicioId_fechaVencimiento_tipoAviso_key" ON "NotificacionEnvio"("clienteId", "servicioId", "fechaVencimiento", "tipoAviso");
