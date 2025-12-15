import path from "node:path"

import { analyzeAssets } from "../server/lib/audit/audit"
import { createApp } from "../server/app"
import type { AuditResponse } from "../server/lib/audit/types"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function makeFile(relativePath: string, name: string, type: string) {
  const abs = path.resolve(import.meta.dir, "..", relativePath)
  const ab = await Bun.file(abs).arrayBuffer()
  return new File([ab], name, { type })
}

async function main() {
  const hasLlm = Boolean(process.env.OPENROUTER_API_KEY)

  // Direct analyzer test (no HTTP)
  const good = await makeFile("demo/good_leads.csv", "good_leads.csv", "text/csv")
  const messy = await makeFile(
    "demo/messy_supply_chain.pdf",
    "messy_supply_chain.pdf",
    "application/pdf",
  )

  const report = await analyzeAssets([good, messy])
  const goodReport = report.files.find((f) => f.filename === "good_leads.csv")
  const messyReport = report.files.find(
    (f) => f.filename === "messy_supply_chain.pdf",
  )

  assert(goodReport, "Missing report for good_leads.csv")
  assert(messyReport, "Missing report for messy_supply_chain.pdf")

  assert(goodReport.kind === "csv", "good_leads.csv kind should be csv")
  assert(goodReport.color === "green", "good_leads.csv should be green")
  assert(goodReport.score >= 80, "good_leads.csv score should be >= 80")

  assert(messyReport.kind === "pdf", "messy_supply_chain.pdf kind should be pdf")
  assert(messyReport.color === "red", "messy_supply_chain.pdf should be red")
  assert(
    messyReport.findings.some((f) => f.id === "pii.detected"),
    "messy_supply_chain.pdf should detect PII",
  )

  if (hasLlm) {
    assert(goodReport.llm, "Expected LLM analysis for good_leads.csv")
    assert(messyReport.llm, "Expected LLM analysis for messy_supply_chain.pdf")
  }

  // HTTP API test (Bun server + Hono)
  const app = createApp()
  const server = Bun.serve({ port: 0, fetch: app.fetch })
  const base = `http://127.0.0.1:${server.port}`

  try {
    const health = await fetch(`${base}/api/health`)
    assert(health.ok, `/api/health failed (${health.status})`)

    const form = new FormData()
    form.append("files", good)
    form.append("files", messy)
    const res = await fetch(`${base}/api/audit`, { method: "POST", body: form })
    const json = (await res.json()) as AuditResponse

    assert(res.ok, `/api/audit failed (${res.status})`)
    assert(Array.isArray(json.files), "Response missing files array")

    console.log(
      JSON.stringify(
        {
          ok: true,
          llmEnabled: hasLlm,
          overall: json.overall,
          files: json.files.map((f) => ({
            filename: f.filename,
            kind: f.kind,
            score: f.score,
            color: f.color,
            findingIds: (f.findings ?? []).map((x) => x.id).slice(0, 6),
            hasLlm: Boolean(f.llm),
          })),
        },
        null,
        2,
      ),
    )
  } finally {
    server.stop(true)
  }
}

await main()
