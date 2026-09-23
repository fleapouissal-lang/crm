const HANDOFF_PATTERNS = [
  /parler (à|a) (un |une )?(humain|personne|commercial|responsable|quelqu.?un)/i,
  /call me|appelez[- ]moi|rappel(ez)?[- ]moi/i,
  /human|agent humain|vrai commercial/i,
  /مدير|شخص حقيقي|موظف/i,
];

const OPT_OUT_PATTERNS = [
  /ne (me )?(plus )?contact/i,
  /stop|unsubscribe|opt[- ]?out/i,
  /supprime(z)? (mon|mes) (num|données|coord)/i,
  /ما تبقاوش|متتصلوش|وقف/i,
];

export function detectHandoffIntent(text: string): boolean {
  return HANDOFF_PATTERNS.some((re) => re.test(text));
}

export function detectOptOutIntent(text: string): boolean {
  return OPT_OUT_PATTERNS.some((re) => re.test(text));
}

export function shouldHandoffForQualification(score: number | null | undefined, interest: number | null | undefined): boolean {
  if (score != null && score >= 80) return true;
  if (interest != null && interest >= 5) return true;
  return false;
}
