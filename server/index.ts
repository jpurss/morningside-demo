import path from "node:path";

import { createApp } from "./app";

const PORT = Number(process.env.PORT ?? "8787");

const app = createApp();

const distDir = path.resolve(import.meta.dir, "..", "dist");
const distIndex = Bun.file(path.join(distDir, "index.html"));

if (await distIndex.exists()) {
  app.get("*", async (c) => {
    const { pathname } = new URL(c.req.url);
    const targetPath = pathname === "/" ? "/index.html" : pathname;
    const filePath = path.resolve(distDir, `.${targetPath}`);

    // Security: Prevent path traversal attacks by ensuring resolved path stays within distDir
    if (!filePath.startsWith(distDir + path.sep) && filePath !== distDir) {
      return c.text("Forbidden", 403);
    }

    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    return new Response(distIndex);
  });
}

Bun.serve({ port: PORT, fetch: app.fetch });
console.log(`[deal-shield] api listening on http://localhost:${PORT}`);
