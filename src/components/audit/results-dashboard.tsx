import { AlertTriangleIcon, CheckIcon, FileTextIcon, XIcon } from "lucide-react"

import type { AuditResponse, FileAuditReport, VerdictColor } from "@/lib/deal-shield-types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScoreRing } from "@/components/audit/score-ring"
import { ClientCommunication } from "@/components/audit/client-communication"

const colorToAccent: Record<VerdictColor, string> = {
  green: "text-primary",
  yellow: "text-yellow-400",
  red: "text-red-400",
}

const colorToBorder: Record<VerdictColor, string> = {
  green: "border-primary/30",
  yellow: "border-yellow-400/25",
  red: "border-red-400/25",
}

function VerdictGlyph(props: { color: VerdictColor; className?: string }) {
  if (props.color === "green") return <CheckIcon className={props.className} />
  if (props.color === "yellow")
    return <AlertTriangleIcon className={props.className} />
  return <XIcon className={props.className} />
}

function readinessPercent(color: VerdictColor, inverted = false) {
  const raw = color === "green" ? 92 : color === "yellow" ? 55 : 12
  return inverted ? 100 - raw : raw
}

function computeVectorScores(file: FileAuditReport) {
  const hasPii = file.findings.some((f) => f.id === "pii.detected")
  const hasNonMachine = file.findings.some((f) => f.id.includes("non_machine"))
  const hasStructure = file.findings.some((f) => f.id.startsWith("structure."))
  const hasRag = file.findings.some((f) => f.id.startsWith("rag."))

  return {
    pii: hasPii ? 8 : 95,
    structure: hasStructure ? 40 : 90,
    rag: hasNonMachine || hasRag ? 28 : 92,
  }
}

export function ResultsDashboard(props: {
  report: AuditResponse
  onReset: () => void
}) {
  const { overall } = props.report

  const firstFile = props.report.files[0]
  const vectors = firstFile ? computeVectorScores(firstFile) : { pii: 50, structure: 50, rag: 50 }

  return (
    <div className="space-y-6">
      <div className={cn("rounded-2xl border bg-card/60 p-6 backdrop-blur-xl", colorToBorder[overall.color])}>
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="text-sm text-foreground/70">Audit Results</div>
            <div className="mt-1 flex items-center gap-3">
              <VerdictGlyph
                color={overall.color}
                className={cn("h-6 w-6", colorToAccent[overall.color])}
              />
              <div className="text-2xl font-semibold tracking-tight text-white">
                {overall.headline}
              </div>
            </div>
            <div className="mt-2 max-w-3xl text-sm text-foreground/80">
              {overall.rationale}
            </div>
          </div>
          <Button variant="secondary" onClick={props.onReset}>
            New Audit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="bg-card/60 backdrop-blur-xl lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-white">Morningside Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <ScoreRing score={overall.score} color={overall.color} />
            <div className="text-sm text-foreground/80">
              {overall.color === "green"
                ? "Excellent health. Low risk profile."
                : overall.color === "yellow"
                  ? "Medium risk. Expect cleanup before ingestion."
                  : "High risk. Significant remediation required."}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xl lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-white">Go/No-Go Recommendation</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[300px] flex-col items-center justify-center text-center">
            <div
              className={cn(
                "grid h-20 w-20 place-items-center rounded-full border",
                overall.color === "green"
                  ? "border-primary/30 bg-primary/15"
                  : overall.color === "yellow"
                    ? "border-yellow-400/25 bg-yellow-400/10"
                    : "border-red-400/25 bg-red-400/10",
              )}
            >
              <VerdictGlyph
                color={overall.color}
                className={cn("h-10 w-10", colorToAccent[overall.color])}
              />
            </div>
            <div className={cn("mt-4 text-3xl font-semibold", colorToAccent[overall.color])}>
              {overall.headline}
            </div>
            <div className="mt-3 max-w-xs text-sm text-foreground/80">
              {overall.rationale}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xl lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-white">3-Point Risk Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <RiskRow title="PII & Compliance" value={vectors.pii} detail={firstFile?.llm?.pii_compliance?.output ?? (vectors.pii < 50 ? "PII exposure identified." : "Minimal PII exposure identified.")} />
            <RiskRow title="Structure Consistency" value={vectors.structure} detail={firstFile?.llm?.structure_consistency?.output ?? (vectors.structure < 60 ? "Formatting appears chaotic." : "Formatting appears consistent.")} />
            <RiskRow title="Context Richness" value={vectors.rag} detail={firstFile?.llm?.context_richness?.output ?? (vectors.rag < 60 ? "Low text density for QA." : "High value metadata present.")} />
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xl lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-white">
              {overall.requiresConsultation ? "Expert Consultation" : "Margin Impact"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {overall.requiresConsultation && overall.consultation ? (
              <>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-foreground/50">
                    Recommended Service
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {overall.consultation.description}
                  </div>
                  <div className="mt-1 text-sm text-foreground/70">
                    This asset requires architectural guidance, not data cleanup.
                  </div>
                </div>
                <div className="border-t border-border/50" />
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-foreground/50">
                    Consultation Fee
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tracking-tight text-primary">
                      ${overall.consultation.totalCost.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-foreground/40">
                    {overall.consultation.estimatedHours}h @ ${overall.consultation.hourlyRate}/hr + ${overall.consultation.baseFee} base fee
                  </div>
                </div>
                <div className="mt-auto pt-2">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-xs text-primary">
                    Expert consultation recommended
                  </span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-foreground/50">
                    Internal Estimate
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className={cn("text-3xl font-semibold tracking-tight", colorToAccent[overall.color])}>
                      {overall.estimatedExtraHours} hrs
                    </span>
                    <span className="text-sm text-foreground/60">
                      (${overall.estimatedExtraCost.toLocaleString()})
                    </span>
                  </div>
                </div>
                <div className="border-t border-border/50" />
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-foreground/50">
                    Client Quote
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className={cn("text-3xl font-semibold tracking-tight", colorToAccent[overall.color])}>
                      {overall.clientEstimateHours} hrs
                    </span>
                    <span className="text-sm text-foreground/60">
                      (${overall.clientEstimateCost.toLocaleString()})
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-foreground/40">
                    Includes 1.5x buffer for scope creep
                  </div>
                </div>
                <div className="mt-auto pt-2">
                  <span className="inline-flex items-center rounded-full bg-foreground/5 px-3 py-1.5 text-xs text-foreground/50">
                    Based on ${overall.hourlyRate}/hr rate
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {overall.generatedClause ? (
        <Card className="bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Generated Caveat Clause</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/85">
            {overall.generatedClause}
          </CardContent>
        </Card>
      ) : null}

      <Card className="bg-card/60 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Per-File Findings</CardTitle>
          <div className="text-xs text-foreground/70">
            {props.report.files.length} file(s) analyzed
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {props.report.files.map((file) => (
            <FileRow key={file.filename} file={file} />
          ))}

          <div className="border-t border-border/50 pt-5">
            <ClientCommunication report={props.report} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RiskRow(props: { title: string; value: number; detail: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">{props.title}</div>
        <div className="text-xs text-foreground/80">{props.value}%</div>
      </div>
      <Progress value={props.value} className="mt-3" />
      <div className="mt-3 text-sm text-foreground/80">{props.detail}</div>
    </div>
  )
}

function FileRow(props: { file: FileAuditReport }) {
  const accent = colorToAccent[props.file.color]
  const readiness = readinessPercent(props.file.color)
  const findings = props.file.findings
    .filter((f) => f.severity !== "info")
    .slice(0, 4)

  return (
    <div className="rounded-xl border border-border/70 bg-background/20 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-border/70 bg-card/40">
            <FileTextIcon className="h-5 w-5 text-foreground/80" />
          </div>
          <div>
            <div className="font-medium text-white">{props.file.filename}</div>
            <div className="text-xs text-foreground/70">
              {props.file.kind.toUpperCase()} • Score {props.file.score}
            </div>
          </div>
        </div>
        <div className={cn("text-sm font-semibold", accent)}>
          {props.file.color.toUpperCase()}
        </div>
      </div>

      <div className="mt-4">
        <Progress value={readiness} />
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {findings.length > 0 ? (
          findings.map((f) => (
            <div key={f.id} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-1 inline-block h-2 w-2 rounded-full",
                  f.severity === "critical"
                    ? "bg-red-400"
                    : f.severity === "warn"
                      ? "bg-yellow-400"
                      : "bg-foreground/40",
                )}
              />
              <div>
                <span className="font-medium text-white">{f.title}</span>{" "}
                {f.unfixable && (
                  <span className="mr-1 inline-flex items-center rounded bg-foreground/10 px-1.5 py-0.5 text-xs text-foreground/60">
                    Unfixable
                  </span>
                )}
                <span className="text-foreground/80">{f.detail}</span>
                {f.unfixable && f.remediation && (
                  <div className="mt-1 rounded border border-foreground/10 bg-foreground/5 p-2 text-xs text-foreground/70">
                    <span className="font-medium">Remediation:</span> {f.remediation}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-foreground/80">
            No material risks flagged in the sample.
          </div>
        )}
      </div>

      {props.file.sample.textPreview ? (
        <div className="mt-4 rounded-lg border border-border/70 bg-background/25 p-3">
          <div className="mb-2 text-xs font-medium text-foreground/70">
            Sample preview (masked)
          </div>
          <pre className="max-h-44 overflow-auto whitespace-pre-wrap text-xs text-foreground/80">
            {props.file.sample.textPreview}
          </pre>
        </div>
      ) : null}
    </div>
  )
}
