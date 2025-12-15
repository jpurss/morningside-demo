import * as React from "react"
import { ExternalLinkIcon, LinkedinIcon, MapPinIcon, XIcon } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// Stats that matter to a Head of Consulting
const PROOF_POINTS = [
  { value: "24–48h", label: "Discovery → prototype", detail: "Real data, clickable" },
  { value: "300+", label: "Coaching sessions", detail: "100 reps · sales + AI" },
  { value: "AI Academy", label: "Curriculum + strategy", detail: "Tooling · content · training" },
  { value: "Production", label: "AI tool shipped", detail: "Gemini Gem @ Lucid" },
  { value: "$1.2M", label: "Quota carried", detail: "Full-cycle AE @ Zip" },
  { value: "Top 10", label: "Bank deal", detail: "FinServ pioneer" },
]

const TOOLKIT = [
  { category: "Prototype", tools: ["Cursor", "Claude Code", "v0", "Codex", "Stitch", "OpenRouter"] },
  { category: "Sell", tools: ["Salesforce", "Gong", "Clari", "Outreach"] },
]

const TRACK_RECORD = [
  {
    metric: "300+",
    outcome: "coaching sessions across sales, business acumen, and AI",
    context: "100 reps coached",
  },
  {
    metric: "AI Academy",
    outcome: "designed GTM AI enablement curriculum + adoption strategy",
    context: "Lucid enablement",
  },
  {
    metric: "Production",
    outcome: "shipped Gemini Gems (Sales Workflows)",
    context: "Lucid sales org",
  },
  {
    metric: "20–40%",
    outcome: "quota lift for coached reps",
    context: "Lucid (field coaching)",
  },
]

function StatCard({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <div className="flex min-h-24 flex-col justify-center gap-0.5 rounded-xl border border-border/70 bg-background/20 px-3 py-2.5 text-center sm:py-3">
      <div className="text-balance text-xl font-semibold leading-tight tracking-tight text-white tabular-nums sm:text-2xl">
        {value}
      </div>
      <div className="text-balance text-xs font-medium leading-tight text-foreground/80">{label}</div>
      <div className="text-balance text-[10px] leading-tight text-foreground/60">{detail}</div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-foreground/50">
      {children}
    </div>
  )
}

export function JosiahProfileDialog({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent size="xl" className="flex max-h-[90vh] flex-col p-0">
        <div className="relative overflow-hidden border-b border-border/70 bg-background/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_-10%,rgba(65,156,115,0.22),transparent_55%),radial-gradient(700px_circle_at_85%_0%,rgba(255,255,255,0.06),transparent_60%)]" />

          <DialogHeader className="relative border-none">
            <div className="flex min-w-0 items-start gap-4">
              <img
                src="/assets/josiah-purss.jpeg"
                alt="Josiah Purss"
                className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-border/60 sm:h-20 sm:w-20"
                draggable={false}
              />

              <div className="min-w-0">
                <DialogTitle className="text-xl sm:text-2xl">Josiah Purss</DialogTitle>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-primary/25 bg-primary/10 text-primary"
                  >
                    Forward Deployed Engineer
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-foreground/70">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPinIcon className="h-3.5 w-3.5 text-foreground/60" />
                    Atlanta, GA
                  </span>
                  <span className="text-foreground/50">•</span>
                  <a
                    href="https://linkedin.com/in/josiahpurss"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-sm text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <LinkedinIcon className="h-3.5 w-3.5" />
                    LinkedIn
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground/80 hover:text-white"
                aria-label="Close profile"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="space-y-6 p-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {PROOF_POINTS.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-5">
                <div>
                  <SectionLabel>The Pitch</SectionLabel>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    <span className="block">
                      With Cursor and agents everywhere, building is the easy part. The premium
                      is discovery: choosing the right workflow, quantifying impact, and getting
                      adoption.
                    </span>
                    <span className="mt-2 block">
                      I run the teardown with the exec sponsor and the operators who live it,
                      map the workflow and data constraints, and align the room on a measurable
                      win. If adoption is the bottleneck, I start with training + coaching so
                      the team can actually use AI. Then I{" "}
                      <span className="font-medium text-white">rapid prototype</span> a working
                      demo on real data in{" "}
                      <span className="font-medium text-white">24–48 hours</span> so the decision
                      is based on proof, not promises.
                    </span>
                  </p>
                </div>

                <div>
                  <SectionLabel>How I Work</SectionLabel>
                  <ul className="space-y-2 text-sm text-foreground/80">
                    <li className="flex gap-2">
                      <span className="text-primary">→</span>
                      <span>
                        <span className="text-white">Audit first.</span> Shadow the workflow,
                        document handoffs, and quantify time, risk, and margin impact.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">→</span>
                      <span>
                        <span className="text-white">Prioritize.</span> Impact/effort, pick a
                        wedge that ladders to a broader transformation roadmap (and a clear
                        decision path).
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">→</span>
                      <span>
                        <span className="text-white">Prototype.</span> Vibe-code the thin slice on
                        real data in 24–48h so stakeholders can click it, then iterate with users.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">→</span>
                      <span>
                        <span className="text-white">Enable adoption.</span> AI literacy workshop
                        + role-based coaching (100 reps / 300+ sessions) so it becomes habit, not
                        shelfware.
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <SectionLabel>Toolkit</SectionLabel>
                  <div className="space-y-2">
                    {TOOLKIT.map((row) => (
                      <div key={row.category} className="flex items-center gap-2">
                        <span className="w-12 text-xs font-medium text-foreground/50">
                          {row.category}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {row.tools.map((tool) => (
                            <Badge
                              key={tool}
                              variant="secondary"
                              className="bg-muted/50 text-xs font-normal text-foreground/80"
                            >
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <SectionLabel>Track Record</SectionLabel>
                  <div className="space-y-2.5">
                    {TRACK_RECORD.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-baseline gap-3 rounded-xl border border-border/70 bg-background/20 px-3 py-2"
                      >
                        <span className="text-lg font-semibold text-white tabular-nums">
                          {item.metric}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-foreground/90">{item.outcome}</span>
                          <span className="ml-2 text-xs text-foreground/50">— {item.context}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Arc</SectionLabel>
                  <div className="border-l-2 border-border/60 pl-4">
                    <div className="space-y-3 text-sm">
                      <div className="relative">
                        <div className="absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_6px_rgba(65,156,115,0.12)]" />
                        <div className="font-medium text-white">Manager, Coaching + AI Adoption</div>
                        <div className="text-xs text-foreground/60">
                          Lucid Software · 2025–Present
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full bg-foreground/30" />
                        <div className="font-medium text-foreground/90">Manager, Field Coaching + Facilitation</div>
                        <div className="text-xs text-foreground/60">Lucid Software · 2024–2025</div>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full bg-foreground/30" />
                        <div className="font-medium text-foreground/90">
                          Account Executive
                        </div>
                        <div className="text-xs text-foreground/60">Lucid + Zip · 2019–2023</div>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full bg-foreground/30" />
                        <div className="font-medium text-foreground/90">BDR → AE</div>
                        <div className="text-xs text-foreground/60">Lucid Software · 2017–2019</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <SectionLabel>Education</SectionLabel>
                  <div className="mt-3 text-xs text-foreground/60">
                    <span className="text-foreground/80">MS Finance</span>
                    <span className="text-foreground/50"> · Information Systems</span>
                    <span className="text-foreground/50"> · University of Utah · 3.7 GPA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/70 bg-background/10 px-6 py-4">
          <p className="text-center text-sm text-foreground/80">
            <span className="text-foreground/50">TL;DR:</span>{" "}
            <span className="text-white">
              I find the highest-leverage workflow, ship a clickable AI proof fast, and train people to make
              sure it gets adopted.
            </span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
