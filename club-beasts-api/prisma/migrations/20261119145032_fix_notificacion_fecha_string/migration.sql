-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NotificacionEnvio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "fechaVencimiento" TEXT NOT NULL,
    "tipoAviso" TEXT NOT NULL,
    "enviadoEn" DATETIME NOT NULL,
    "canal" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    CONSTRAINT "NotificacionEnvio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "NotificacionEnvio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "MembresiaGym" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_NotificacionEnvio" ("canal", "clienteId", "enviadoEn", "estado", "fechaVencimiento", "id", "servicioId", "tipoAviso") SELECT "canal", "clienteId", "enviadoEn", "estado", "fechaVencimiento", "id", "servicioId", "tipoAviso" FROM "NotificacionEnvio";
DROP TABLE "NotificacionEnvio";
ALTER TABLE "new_NotificacionEnvio" RENAME TO "NotificacionEnvio";
CREATE UNIQUE INDEX "NotificacionEnvio_clienteId_servicioId_fechaVencimiento_tipoAviso_key" ON "NotificacionEnvio"("clienteId", "servicioId", "fechaVencimiento", "tipoAviso");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
