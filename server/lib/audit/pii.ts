const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const CC_CANDIDATE_RE = /\b(?:\d[ -]*?){13,19}\b/g;

function luhnCheck(numberString: string) {
  let sum = 0;
  let shouldDouble = false;

  for (let i = numberString.length - 1; i >= 0; i -= 1) {
    const digit = numberString.charCodeAt(i) - 48;
    if (digit < 0 || digit > 9) return false;

    let addend = digit;
    if (shouldDouble) {
      addend *= 2;
      if (addend > 9) addend -= 9;
    }
    sum += addend;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export type PiiScan = {
  emails: string[];
  ssns: string[];
  creditCards: string[];
};

export function scanPii(text: string): PiiScan {
  const emails = Array.from(text.matchAll(EMAIL_RE), (m) => m[0]);
  const ssns = Array.from(text.matchAll(SSN_RE), (m) => m[0]);

  const creditCards: string[] = [];
  for (const match of text.matchAll(CC_CANDIDATE_RE)) {
    const raw = match[0];
    const digits = raw.replace(/[^\d]/g, "");
    if (digits.length < 13 || digits.length > 19) continue;
    if (!luhnCheck(digits)) continue;
    creditCards.push(digits);
  }

  return {
    emails: unique(emails),
    ssns: unique(ssns),
    creditCards: unique(creditCards),
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

