import { PDFParse } from "pdf-parse";

export type SowKind = "pdf" | "txt";

function kindFromFilename(name: string): SowKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".txt")) return "txt";
  return null;
}

export async function readSowText(file: File): Promise<{
  filename: string;
  kind: SowKind;
  text: string;
}> {
  const filename = file.name || "sow";
  const kind = kindFromFilename(filename);
  if (!kind) {
    throw new Error("Unsupported SOW file. Supported types: PDF, TXT.");
  }

  if (kind === "txt") {
    const text = (await file.text()).trim();
    if (!text) throw new Error("SOW text file is empty.");
    return { filename, kind, text: text.slice(0, 80_000) };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText({ first: 20 });
  await parser.destroy().catch(() => undefined);

  const rawText = String(textResult.text ?? "").trim();
  const text = rawText.slice(0, 80_000);

  if (text.length < 200) {
    throw new Error(
      "PDF text extraction is near-empty. This looks scanned/images-only; export to text or run OCR and upload a TXT.",
    );
  }

  return { filename, kind, text };
}

