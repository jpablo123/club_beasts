-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN "debeCambiarPin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Cliente" ADD COLUMN "creadoPorId" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "actualizadoPorId" TEXT;
