-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cedula" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "sedeId" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "debeCambiarPin" BOOLEAN NOT NULL DEFAULT true,
    "estado" TEXT NOT NULL DEFAULT 'NUEVO',
    "observaciones" TEXT,
    "creadoPorId" TEXT,
    "actualizadoPorId" TEXT,
    "pinResetPorId" TEXT,
    "pinResetAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cliente_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Cliente_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Cliente_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Cliente_pinResetPorId_fkey" FOREIGN KEY ("pinResetPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Cliente" ("actualizadoPorId", "apellidos", "cedula", "creadoPorId", "createdAt", "debeCambiarPin", "email", "estado", "id", "nombres", "observaciones", "pin", "sedeId", "telefono", "updatedAt") SELECT "actualizadoPorId", "apellidos", "cedula", "creadoPorId", "createdAt", "debeCambiarPin", "email", "estado", "id", "nombres", "observaciones", "pin", "sedeId", "telefono", "updatedAt" FROM "Cliente";
DROP TABLE "Cliente";
ALTER TABLE "new_Cliente" RENAME TO "Cliente";
CREATE UNIQUE INDEX "Cliente_cedula_key" ON "Cliente"("cedula");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
