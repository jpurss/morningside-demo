export type Readability = {
  textLength: number;
  garbageRatio: number;
};

export type ContextRichness = {
  wordCount: number;
  alphaRatio: number;
};

export function computeReadability(text: string): Readability {
  const textLength = text.length;
  if (textLength === 0) return { textLength: 0, garbageRatio: 1 };

  let garbage = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    const isWhitespace = /\s/u.test(ch);
    const isAsciiPrintable = code >= 0x20 && code <= 0x7e;
    const isCommonUnicode = /[\p{L}\p{N}\p{P}\p{S}]/u.test(ch);
    if (!isWhitespace && !(isAsciiPrintable || isCommonUnicode)) garbage += 1;
  }

  return {
    textLength,
    garbageRatio: garbage / textLength,
  };
}

export function computeContextRichness(text: string): ContextRichness {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const nonWhitespace = text.replace(/\s+/g, "");
  if (nonWhitespace.length === 0) return { wordCount, alphaRatio: 0 };

  let letters = 0;
  for (const ch of nonWhitespace) {
    if (/\p{L}/u.test(ch)) letters += 1;
  }

  return { wordCount, alphaRatio: letters / nonWhitespace.length };
}

export type StructureSignals = {
  mixedDateFormats: boolean;
  currencySymbols: string[];
};

export function analyzeTextStructure(text: string): StructureSignals {
  const mdY =
    /\b(?:0?[1-9]|1[0-2])[/.-](?:0?[1-9]|[12]\d|3[01])[/.-](?:19|20)\d{2}\b/g;
  const dmY =
    /\b(?:0?[1-9]|[12]\d|3[01])[/.-](?:0?[1-9]|1[0-2])[/.-](?:19|20)\d{2}\b/g;

  const hasMdY = mdY.test(text);
  const hasDmY = dmY.test(text);

  const currency = new Set<string>();
  for (const sym of ["$", "€", "£", "¥"]) {
    if (text.includes(sym)) currency.add(sym);
  }
  const codeRe = /\b(?:USD|EUR|GBP|JPY|CAD|AUD)\b/g;
  for (const match of text.matchAll(codeRe)) currency.add(match[0]);

  return {
    mixedDateFormats: hasMdY && hasDmY,
    currencySymbols: Array.from(currency),
  };
}
