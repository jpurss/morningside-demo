import type { Finding, VerdictColor } from "./types";

export function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreFromFindings(findings: Finding[]) {
  const penalty = findings.reduce((sum, f) => sum + f.penalty, 0);
  return clampScore(100 - penalty);
}

export function colorFrom(score: number, hasCritical: boolean): VerdictColor {
  if (hasCritical || score < 50) return "red";
  if (score < 80) return "yellow";
  return "green";
}

export function headlineFrom(color: VerdictColor) {
  if (color === "green") return "SAFE TO SIGN";
  if (color === "yellow") return "SIGN WITH CAVEATS";
  return "DO NOT SIGN";
}

export function estimateErrorUnits(findings: Finding[]) {
  return findings.reduce((sum, f) => sum + f.errorUnits, 0);
}

