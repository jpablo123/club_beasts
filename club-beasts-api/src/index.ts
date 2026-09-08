import Fastify from "fastify";
import cors from "@fastify/cors";
import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";
import authRoutes from "./routes/auth.js";
import clienteRoutes from "./routes/clientes.js";

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

  await server.register(authRoutes);
  await server.register(clienteRoutes);

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
