-- AlterTable
ALTER TABLE "MembresiaGym" ADD COLUMN "tipoServicio" TEXT NOT NULL DEFAULT 'GYM';

-- AlterTable
ALTER TABLE "MembresiaGymCambio" ADD COLUMN "motivo" TEXT;
ALTER TABLE "MembresiaGymCambio" ADD COLUMN "congelacionInicio" TEXT;
ALTER TABLE "MembresiaGymCambio" ADD COLUMN "congelacionFin" TEXT;
