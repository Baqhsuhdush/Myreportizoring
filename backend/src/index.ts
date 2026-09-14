import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./middleware/auth";
import { attachAuth } from "./middleware/auth";
import authRoutes from "./routes/auth";
import classesRoutes from "./routes/classes";
import sectionsRoutes from "./routes/sections";
import lessonsRoutes from "./routes/lessons";
import conspectsRoutes from "./routes/conspects";
import adminRoutes from "./routes/admin";
import pushRoutes from "./routes/push";

const app = new Hono<AppEnv>();

app.use("*", async (c, next) => {
  const corsMiddleware = cors({
    origin: (origin) => (origin === c.env.FRONTEND_ORIGIN ? origin : undefined),
    credentials: true,
  });
  return corsMiddleware(c, next);
});

app.use("*", attachAuth);

app.get("/api/health", (c) =>
  c.json({ status: "ok", environment: c.env.ENVIRONMENT })
);

app.route("/api/auth", authRoutes);
app.route("/api/classes", classesRoutes);
app.route("/api/sections", sectionsRoutes);
app.route("/api/lessons", lessonsRoutes);
app.route("/api/conspects", conspectsRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/push", pushRoutes);

app.notFound((c) => c.json({ error: "Маршрут не найден" }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Внутренняя ошибка сервера" }, 500);
});

export default app;
