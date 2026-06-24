import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import type { HttpBindings } from "@hono/node-server";

export function serveStaticFiles(app: Hono<{ Bindings: HttpBindings }>) {
  app.use("/*", serveStatic({ root: "./dist/public" }));
  app.get("/*", serveStatic({ path: "./dist/public/index.html" }));
}
