import * as React from "react"
import { DocusealForm } from "@docuseal/react"
import {
  ArrowLeftIcon,
  CopyIcon,
  FileSignatureIcon,
  PrinterIcon,
  SendIcon,
  XIcon,
} from "lucide-react"

import type { ChangeOrderPackResponse } from "@/lib/deal-shield-types"
import { cn } from "@/lib/utils"
import { MorningsideLogo } from "@/components/morningside-logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"

const DOCUSEAL_FORM_URL_STORAGE_KEY = "deal_shield_docuseal_form_url_v1"

function formatMoneyUsd(value: number) {
  const safe = Number.isFinite(value) ? value : 0
  return safe.toLocaleString(undefined, { style: "currency", currency: "USD" })
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function buildPrintHtml(args: { data: ChangeOrderPackResponse }) {
  const { pack } = args.data

  const ul = (items: string[]) =>
    items.length > 0
      ? `<ul>${items.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`
      : "<div class=\"muted\">—</div>"

  const citation = pack.clauseCitation.section
    ? `${pack.clauseCitation.section}\n\n${pack.clauseCitation.quote}`
    : pack.clauseCitation.quote

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(pack.title)}</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; padding: 32px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial, sans-serif; color: #0f172a; background: #ffffff; }
      .page { max-width: 820px; margin: 0 auto; }
      .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
      h1 { font-size: 24px; margin: 0; letter-spacing: -0.02em; }
      .meta { font-size: 12px; color: #475569; }
      .section { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
      .label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; }
      .muted { color: #64748b; font-size: 13px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
      ul { margin: 10px 0 0 18px; padding: 0; }
      li { margin: 6px 0; font-size: 13px; line-height: 1.4; }
      .quote { white-space: pre-wrap; font-size: 13px; color: #0f172a; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
      .sig { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .sig .line { border: 1px dashed #cbd5e1; border-radius: 12px; padding: 14px; font-size: 13px; }
      @media print { body { padding: 0; } .page { max-width: none; } }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="top">
        <div>
          <div class="meta">${escapeHtml(pack.projectPhase ? `Project phase: ${pack.projectPhase}` : "Project phase: (not provided)")}</div>
          <h1>${escapeHtml(pack.title)}</h1>
          <div class="muted">Prepared for <strong>${escapeHtml(pack.client)}</strong> • Prepared by <strong>Morningside</strong></div>
        </div>
        <div class="meta">${escapeHtml(new Date(args.data.generatedAt).toLocaleString())}</div>
      </div>

      <div class="section">
        <div class="label">Summary</div>
        <div style="margin-top:8px; font-size: 13px; line-height: 1.5;">${escapeHtml(pack.summary)}</div>
      </div>

      <div class="section grid">
        <div class="card">
          <div class="label">Scope (Inclusions)</div>
          ${ul(pack.scope.inclusions)}
        </div>
        <div class="card">
          <div class="label">Estimate</div>
          <div style="margin-top:10px; display:grid; gap:8px; font-size: 13px;">
            <div><strong>${escapeHtml(String(pack.estimate.engineeringHours))}h</strong> @ ${escapeHtml(formatMoneyUsd(pack.estimate.hourlyRateUsd))}/hr</div>
            <div>Total: <strong>${escapeHtml(formatMoneyUsd(pack.estimate.totalUsd))}</strong></div>
            <div class="muted">Timeline: ${escapeHtml(pack.timeline.duration)}</div>
          </div>
        </div>
      </div>

      <div class="section grid">
        <div class="card">
          <div class="label">Assumptions</div>
          ${ul(pack.scope.assumptions)}
        </div>
        <div class="card">
          <div class="label">Exclusions / Notes</div>
          ${ul(pack.scope.exclusions)}
        </div>
      </div>

      <div class="section grid">
        <div class="card">
          <div class="label">Timeline Milestones</div>
          ${ul(pack.timeline.milestones)}
        </div>
        <div class="card">
          <div class="label">Next Questions</div>
          ${ul(pack.nextQuestions)}
        </div>
      </div>

      <div class="section">
        <div class="label">SOW Citation</div>
        <div class="quote" style="margin-top:10px;">${escapeHtml(citation)}</div>
      </div>

      <div class="section sig">
        <div class="line">${escapeHtml(pack.signature.clientLine)}</div>
        <div class="line">${escapeHtml(pack.signature.morningsideLine)}</div>
      </div>
    </div>
  </body>
</html>`
}

async function copyText(value: string) {
  const text = value ?? ""
  if (!text.trim()) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const el = document.createElement("textarea")
    el.value = text
    el.style.position = "fixed"
    el.style.left = "-9999px"
    document.body.appendChild(el)
    el.focus()
    el.select()
    document.execCommand("copy")
    document.body.removeChild(el)
  }
}

function packToText(args: { data: ChangeOrderPackResponse }) {
  const { pack } = args.data
  const citation = pack.clauseCitation.section
    ? `${pack.clauseCitation.section}\n\n${pack.clauseCitation.quote}`
    : pack.clauseCitation.quote

  return [
    pack.title,
    `Client: ${pack.client}`,
    `Project phase: ${pack.projectPhase ?? "(not provided)"}`,
    "",
    "Summary",
    pack.summary,
    "",
    "Scope (Inclusions)",
    ...(pack.scope.inclusions.length ? pack.scope.inclusions.map((x) => `- ${x}`) : ["- (none)"]),
    "",
    "Estimate",
    `- ${pack.estimate.engineeringHours}h @ ${pack.estimate.hourlyRateUsd}/hr = ${pack.estimate.totalUsd}`,
    `- Timeline: ${pack.timeline.duration}`,
    "",
    "Assumptions",
    ...(pack.scope.assumptions.length ? pack.scope.assumptions.map((x) => `- ${x}`) : ["- (none)"]),
    "",
    "Exclusions / Notes",
    ...(pack.scope.exclusions.length ? pack.scope.exclusions.map((x) => `- ${x}`) : ["- (none)"]),
    "",
    "Milestones",
    ...(pack.timeline.milestones.length ? pack.timeline.milestones.map((x) => `- ${x}`) : ["- (none)"]),
    "",
    "Next Questions",
    ...(pack.nextQuestions.length ? pack.nextQuestions.map((x) => `- ${x}`) : ["- (none)"]),
    "",
    "SOW Citation",
    citation,
    "",
    "Signature",
    pack.signature.clientLine,
    pack.signature.morningsideLine,
  ].join("\n")
}

export function ChangeOrderPackModal(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: ChangeOrderPackResponse | null
}) {
  const { toast } = useToast()
  const [mode, setMode] = React.useState<"preview" | "signature">("preview")
  const [email, setEmail] = React.useState("")
  const [customFormSrc, setCustomFormSrc] = React.useState(() => {
    if (typeof window === "undefined") return ""
    return window.localStorage.getItem(DOCUSEAL_FORM_URL_STORAGE_KEY) ?? ""
  })

  React.useEffect(() => {
    if (props.open) return
    setMode("preview")
    setEmail("")
  }, [props.open])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(DOCUSEAL_FORM_URL_STORAGE_KEY, customFormSrc)
    } catch {
      // ignore
    }
  }, [customFormSrc])

  const envFormSrc = import.meta.env.VITE_DOCUSEAL_FORM_URL
  const formSrc = (envFormSrc || customFormSrc).trim()

  const canSign = Boolean(formSrc && email.trim())

  const pack = props.data?.pack

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent size="xl" className="p-0">
        <DialogHeader className="border-b border-border/60">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl border border-primary/25 bg-primary/10">
                <FileSignatureIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate">Change Order Pack</DialogTitle>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground/70">
                  {props.data ? (
                    <>
                      <Badge variant="outline" className="border-border/70 bg-background/30 text-foreground/80">
                        {props.data.model ?? "heuristics"}
                      </Badge>
                      <span className="text-foreground/60">•</span>
                      <span>{new Date(props.data.generatedAt).toLocaleString()}</span>
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {props.data ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-2 px-2 text-foreground/80"
                onClick={() => {
                  const data = props.data
                  if (!data) return
                  void copyText(packToText({ data }))
                  toast({
                    title: "Copied",
                    description: "Change order pack copied to clipboard.",
                    tone: "success",
                  })
                }}
              >
                <CopyIcon className="h-4 w-4" />
                Copy
              </Button>
            ) : null}

            <DialogClose asChild>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-foreground/80">
                <XIcon className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="max-h-[78vh] overflow-auto p-6">
          {!props.data || !pack ? (
            <div className="rounded-2xl border border-border/70 bg-background/20 p-10 text-sm text-foreground/80">
              No pack generated yet.
            </div>
          ) : mode === "signature" ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-border/70 bg-background/20 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold text-white">Send for signature</div>
                    <div className="mt-1 text-sm text-foreground/80">
                      Embed a Docuseal signing form for the authorized signer.
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-2 px-2 text-foreground/80"
                    onClick={() => setMode("preview")}
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to pack
                  </Button>
                </div>

                <div className="mt-4 grid gap-2 sm:max-w-md">
                  <Label htmlFor="docuseal-email">Signer email</Label>
                  <Input
                    id="docuseal-email"
                    type="email"
                    placeholder="signer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {!envFormSrc ? (
                    <>
                      <div className="mt-3 grid gap-2">
                        <Label htmlFor="docuseal-form">Docuseal form URL</Label>
                        <Input
                          id="docuseal-form"
                          type="url"
                          placeholder="https://docuseal.com/d/YOUR_FORM_ID"
                          value={customFormSrc}
                          onChange={(e) => setCustomFormSrc(e.target.value)}
                        />
                        <div className="text-xs text-foreground/60">
                          Tip: set{" "}
                          <code className="rounded bg-foreground/10 px-1 py-0.5 text-foreground/90">
                            VITE_DOCUSEAL_FORM_URL
                          </code>{" "}
                          in your <code className="rounded bg-foreground/10 px-1 py-0.5 text-foreground/90">.env</code>{" "}
                          for a default (requires restarting the dev server).
                        </div>
                      </div>
                    </>
                  ) : null}

                  {!formSrc ? (
                    <div className="text-xs text-yellow-300">
                      Missing Docuseal form URL. Set{" "}
                      <span className="font-medium">VITE_DOCUSEAL_FORM_URL</span> or paste a
                      form URL above.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/10">
                {formSrc ? (
                  canSign ? (
                    <DocusealForm
                      src={formSrc}
                      email={email.trim()}
                      onComplete={(data) => {
                        console.log("[docuseal] complete", data)
                        toast({
                          title: "Signature complete",
                          description: "Docuseal reported completion for this signer.",
                          tone: "success",
                        })
                      }}
                    />
                  ) : (
                    <div className="p-10 text-sm text-foreground/80">
                      Enter the signer email to load the signing form.
                    </div>
                  )
                ) : (
                  <div className="p-10 text-sm text-foreground/80">
                    Configure{" "}
                    <code className="rounded bg-foreground/10 px-1 py-0.5 text-foreground/90">
                      VITE_DOCUSEAL_FORM_URL
                    </code>{" "}
                    (or paste a form URL above) to enable embedded signing.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border/60 bg-white">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <MorningsideLogo className="h-7 w-auto" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          SOW Addendum • Change Order Pack
                        </div>
                        <div className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-900">
                          {pack.title}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          Prepared for <span className="font-medium text-slate-900">{pack.client}</span>{" "}
                          • Prepared by{" "}
                          <span className="font-medium text-slate-900">Morningside</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right text-xs text-slate-500">
                    <div>{new Date(props.data.generatedAt).toLocaleDateString()}</div>
                    <div className="mt-1">
                      {pack.projectPhase ? `Phase: ${pack.projectPhase}` : "Phase: —"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 px-6 py-6">
                <Section title="Summary">
                  <div className="text-sm leading-relaxed text-slate-700">{pack.summary}</div>
                </Section>

                <div className="grid gap-4 md:grid-cols-2">
                  <Section title="Scope (Inclusions)">
                    <BulletList items={pack.scope.inclusions} tone="slate" empty="No inclusions listed." />
                  </Section>

                  <Section title="Estimate">
                    <div className="grid gap-3">
                      <Metric label="Engineering hours" value={`${pack.estimate.engineeringHours}h`} />
                      <Metric label="Hourly rate" value={`${formatMoneyUsd(pack.estimate.hourlyRateUsd)}/hr`} />
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          Total
                        </div>
                        <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                          {formatMoneyUsd(pack.estimate.totalUsd)}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Timeline: <span className="font-medium text-slate-900">{pack.timeline.duration}</span>
                        </div>
                      </div>
                    </div>
                  </Section>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Section title="Assumptions">
                    <BulletList items={pack.scope.assumptions} tone="slate" empty="No assumptions listed." />
                  </Section>
                  <Section title="Exclusions / Notes">
                    <BulletList items={pack.scope.exclusions} tone="slate" empty="No exclusions listed." />
                  </Section>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Section title="Timeline milestones">
                    <BulletList items={pack.timeline.milestones} tone="slate" empty="No milestones listed." />
                  </Section>
                  <Section title="Next questions">
                    <BulletList items={pack.nextQuestions} tone="slate" empty="No questions listed." />
                  </Section>
                </div>

                <Section title="SOW clause citation">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                      {pack.clauseCitation.section ? `${pack.clauseCitation.section}\n\n` : ""}
                      {pack.clauseCitation.quote}
                    </pre>
                  </div>
                </Section>

                <div className="grid gap-4 md:grid-cols-2">
                  <SignatureBlock label="Client" value={pack.signature.clientLine} />
                  <SignatureBlock label="Morningside" value={pack.signature.morningsideLine} />
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                  Draft for review. Final terms are subject to approval and signature by both parties.
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sticky bottom-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {props.data ? (
              <div className="text-xs text-foreground/70">
                {mode === "preview" ? "Preview ready to share." : "Signing embed ready."}
              </div>
            ) : (
              <div className="text-xs text-foreground/70">—</div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!props.data}
                onClick={() => {
                  const data = props.data
                  if (!data) return
                  const html = buildPrintHtml({ data })
                  const w = window.open("", "_blank", "noopener,noreferrer")
                  if (!w) {
                    toast({
                      title: "Pop-up blocked",
                      description: "Allow pop-ups to print the change order pack.",
                      tone: "warning",
                    })
                    return
                  }
                  w.document.open()
                  w.document.write(html)
                  w.document.close()
                  w.focus()
                  w.print()
                }}
              >
                <PrinterIcon className="h-4 w-4" /> Print
              </Button>

              <Button
                size="sm"
                disabled={!props.data}
                onClick={() => {
                  if (!props.data) return
                  setMode("signature")
                }}
              >
                <SendIcon className="h-4 w-4" />
                Send for signature
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Section(props: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", props.className)}>
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{props.title}</div>
      {props.children}
    </div>
  )
}

function BulletList(props: { items: string[]; empty: string; tone: "slate"; className?: string }) {
  const items = props.items.filter((x) => String(x ?? "").trim().length > 0)
  if (items.length === 0) {
    return <div className={cn("text-sm text-slate-600", props.className)}>{props.empty}</div>
  }
  return (
    <ul className={cn("space-y-2 text-sm text-slate-700", props.className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Metric(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{props.label}</div>
      <div className="mt-1 text-base font-semibold text-slate-900">{props.value}</div>
    </div>
  )
}

function SignatureBlock(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{props.label}</div>
      <div className="mt-3 text-sm text-slate-700">{props.value}</div>
    </div>
  )
}
