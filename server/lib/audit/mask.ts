import type { PiiScan } from "./pii";

const CC_CANDIDATE_RE = /\b(?:\d[ -]*?){13,19}\b/g;

export function maskPiiInText(text: string, pii: PiiScan) {
  let masked = text;

  for (const email of pii.emails) {
    masked = masked.replaceAll(email, maskEmail(email));
  }
  for (const ssn of pii.ssns) {
    masked = masked.replaceAll(ssn, maskSsn(ssn));
  }

  masked = masked.replace(CC_CANDIDATE_RE, (match) => {
    const digits = match.replace(/[^\d]/g, "");
    if (!pii.creditCards.includes(digits)) return match;
    return `**** **** **** ${digits.slice(-4)}`;
  });

  return masked;
}

export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***@***";
  return `${user[0]}***@${domain}`;
}

export function maskSsn(ssn: string) {
  const last4 = ssn.slice(-4);
  return `***-**-${last4}`;
}

export function maskedExamples(pii: PiiScan) {
  return {
    emails: pii.emails.slice(0, 3).map(maskEmail),
    ssns: pii.ssns.slice(0, 3).map(maskSsn),
    creditCards: pii.creditCards
      .slice(0, 3)
      .map((digits) => `**** **** **** ${digits.slice(-4)}`),
  };
}
