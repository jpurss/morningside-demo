import { Hono } from "hono";
import { logger } from "hono/logger";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { analyzeAssets } from "./lib/audit/audit";
import { AuditClientNoteRequestSchema, draftAuditClientNote } from "./lib/audit/client-note";
import { analyzeScopeGuard } from "./lib/scope-guard/scope-guard";
import { draftChangeOrderPack } from "./lib/scope-guard/change-order-pack";

const ChangeOrderPackAnalysisSchema = z.object({
  verdict: z.enum(["in_scope", "grey_area", "out_of_scope"]),
  bucket: z.enum(["bug_defect", "clarification", "change_request"]),
  estimate: z.object({
    size: z.enum(["small", "medium", "large"]),
    hours: z.number(),
    rationale: z.string(),
  }),
  clauseCitation: z.object({
    section: z.string().nullable().optional(),
    quote: z.string().min(1),
  }),
});

export function createApp() {
  const app = new Hono();
  app.use("*", logger());

  app.get("/api/health", (c) => c.json({ ok: true }));

  app.post("/api/audit", async (c) => {
    const form = await c.req.formData();
    const rawFiles = form.getAll("files");
    const files = rawFiles.filter((item): item is File => item instanceof File);

    if (files.length === 0) {
      return c.json(
        { error: "No files received. Use multipart/form-data with `files`." },
        400,
      );
    }

    try {
      const report = await analyzeAssets(files);
      return c.json(report);
    } catch (error) {
      return c.json(
        {
          error: "Audit failed.",
          detail: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  });

  app.post("/api/audit/draft-client-note", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body." }, 400);
    }

    const parsed = AuditClientNoteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid request.", detail: parsed.error.issues },
        400,
      );
    }

    try {
      const result = await draftAuditClientNote(parsed.data);
      return c.json(result);
    } catch (error) {
      return c.json(
        {
          error: "Draft generation failed.",
          detail: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  });

  app.post("/api/scope-guard", async (c) => {
    const requestId = randomUUID();
    c.header("X-Scope-Guard-Request-Id", requestId);

    const form = await c.req.formData();
    const rawSow = form.get("sow");
    const sowFile = rawSow instanceof File ? rawSow : null;
    const request = String(form.get("request") ?? "").trim();
    const projectPhaseRaw = String(form.get("phase") ?? "").trim();
    const projectPhase = projectPhaseRaw.length > 0 ? projectPhaseRaw : null;

    if (!sowFile) {
      return c.json(
        {
          error:
            "No SOW file received. Use multipart/form-data with `sow` (PDF or TXT).",
        },
        400,
      );
    }

    if (!request) {
      return c.json(
        { error: "Missing client request. Use `request` in form data." },
        400,
      );
    }

    try {
      const result = await analyzeScopeGuard({
        sowFile,
        request,
        projectPhase,
        requestId,
      });
      return c.json(result);
    } catch (error) {
      return c.json(
        {
          error: "Scope analysis failed.",
          detail: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  });

  app.post("/api/scope-guard/change-order-pack", async (c) => {
    const form = await c.req.formData();
    const rawSow = form.get("sow");
    const sowFile = rawSow instanceof File ? rawSow : null;
    const request = String(form.get("request") ?? "").trim();
    const projectPhaseRaw = String(form.get("phase") ?? "").trim();
    const projectPhase = projectPhaseRaw.length > 0 ? projectPhaseRaw : null;
    const clientRaw = String(form.get("client") ?? "").trim();
    const client = clientRaw.length > 0 ? clientRaw : "Client";

    const analysisRaw = String(form.get("analysis") ?? "").trim();

    if (!sowFile) {
      return c.json(
        {
          error: "No SOW file received. Use multipart/form-data with `sow` (PDF or TXT).",
        },
        400,
      );
    }

    if (!request) {
      return c.json(
        { error: "Missing client request. Use `request` in form data." },
        400,
      );
    }

    let analysis: z.infer<typeof ChangeOrderPackAnalysisSchema>;
    try {
      const parsedJson = JSON.parse(analysisRaw);
      const parsed = ChangeOrderPackAnalysisSchema.safeParse(parsedJson);
      if (!parsed.success) {
        return c.json(
          { error: "Invalid analysis payload.", detail: parsed.error.issues },
          400,
        );
      }
      analysis = parsed.data;
    } catch {
      return c.json(
        { error: "Invalid analysis payload. Expected JSON in `analysis`." },
        400,
      );
    }

    try {
      const pack = await draftChangeOrderPack({
        sowFile,
        request,
        client,
        projectPhase,
        analysis,
      });
      return c.json(pack);
    } catch (error) {
      return c.json(
        {
          error: "Change order pack generation failed.",
          detail: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  });

  return app;
}
