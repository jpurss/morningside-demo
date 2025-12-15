type ExtractedSow = {
  deliverables: string[];
  exclusions: string[];
  excerpt: string;
};

const DELIVERABLES_HEADINGS: RegExp[] = [
  /\bin scope\b/i,
  /\bdeliverables\b/i,
  /\bincluded\b/i,
];

const EXCLUSIONS_HEADINGS: RegExp[] = [
  /\bout of scope\b/i,
  /\bexclusions\b/i,
  /\bnot included\b/i,
];

const BULLET_RE = /^\s*[-•*]\s+(.*\S)\s*$/;
const MAJOR_HEADING_RE = /^\s*\d+\.\s+\S/;

function findHeadingLineIndex(lines: string[], patterns: RegExp[]) {
  return lines.findIndex((line) => patterns.some((re) => re.test(line)));
}

function extractBullets(lines: string[]) {
  const items: string[] = [];
  for (const line of lines) {
    const m = line.match(BULLET_RE);
    if (m?.[1]) items.push(m[1].trim());
  }
  return Array.from(new Set(items)).slice(0, 30);
}

function findNextMajorHeading(lines: string[], fromIndex: number) {
  for (let i = fromIndex + 1; i < lines.length; i += 1) {
    if (MAJOR_HEADING_RE.test(lines[i] ?? "")) return i;
  }
  return -1;
}

export function extractSowContext(text: string): ExtractedSow {
  const normalized = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  const lines = normalized
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  const deliverablesStart = findHeadingLineIndex(lines, DELIVERABLES_HEADINGS);
  const exclusionsStart = findHeadingLineIndex(lines, EXCLUSIONS_HEADINGS);

  const excerptStart =
    deliverablesStart !== -1
      ? deliverablesStart
      : exclusionsStart !== -1
        ? Math.max(0, exclusionsStart - 20)
        : 0;

  let excerptEnd = lines.length;
  if (exclusionsStart !== -1) {
    const nextMajor = findNextMajorHeading(lines, exclusionsStart);
    if (nextMajor !== -1) excerptEnd = nextMajor;
  }

  const excerpt = lines
    .slice(excerptStart, excerptEnd)
    .join("\n")
    .trim()
    .slice(0, 18_000);

  const deliverablesLines =
    deliverablesStart !== -1
      ? lines.slice(
          deliverablesStart + 1,
          exclusionsStart !== -1 ? exclusionsStart : excerptEnd,
        )
      : [];

  const exclusionsLines =
    exclusionsStart !== -1 ? lines.slice(exclusionsStart + 1, excerptEnd) : [];

  const deliverables = extractBullets(deliverablesLines);
  const exclusions = extractBullets(exclusionsLines);

  return { deliverables, exclusions, excerpt };
}

