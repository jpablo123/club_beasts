import Fastify from "fastify";
import cors from "@fastify/cors";
import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";
import anamnesisRoutes from "./routes/anamnesis.js";
import asignacionesRoutes from "./routes/asignaciones.js";
import asignacionesNutricionRoutes from "./routes/asignaciones-nutricion.js";
import authRoutes from "./routes/auth.js";
import clienteRoutes from "./routes/clientes.js";
import membresiaRoutes from "./routes/membresia.js";
import planesNutricionalesRoutes from "./routes/planes-nutricionales.js";
import portalRoutes from "./routes/portal.js";
import portalPlanNutricionalRoutes from "./routes/portal-plan-nutricional.js";
import recepcionRoutes from "./routes/recepcion.js";
import rutinasRoutes from "./routes/rutinas.js";
import rutinasPersonalizadasRoutes from "./routes/rutinas-personalizadas.js";
import historialRoutes from "./routes/historial.js";
import conteosRoutes from "./routes/conteos.js";
import notificacionesRoutes from "./routes/notificaciones.js";

const server = Fastify({
  logger: true,
});

async function start() {
  await server.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  await server.register(prismaPlugin);
  await server.register(authPlugin);

  await server.register(anamnesisRoutes);
  await server.register(asignacionesRoutes);
  await server.register(asignacionesNutricionRoutes);
  await server.register(authRoutes);
  await server.register(clienteRoutes);
  await server.register(membresiaRoutes);
  await server.register(planesNutricionalesRoutes);
  await server.register(portalRoutes);
  await server.register(portalPlanNutricionalRoutes);
  await server.register(recepcionRoutes);
  await server.register(rutinasRoutes);
  await server.register(rutinasPersonalizadasRoutes);
  await server.register(historialRoutes);
  await server.register(conteosRoutes);
  await server.register(notificacionesRoutes);

  server.get("/health", async () => ({ status: "ok" }));

  const port = parseInt(process.env.PORT || "3001", 10);

  try {
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`Server running on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
