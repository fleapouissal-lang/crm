import type { Lead } from "@/types/database";

/** Directory / aggregator hosts that are not real prospects. */
export const JUNK_HOST_RE =
  /telecontact\.ma|pagesjaunes|pages-jaunes|annuaire|yelp\.|tripadvisor|facebook\.com\/sharer|linkedin\.com\/pulse|wikipedia\.|duckduckgo|google\.[a-z.]+\/search|bing\.com\/search|amazon\.|apple\.com|microsoft\.com|youtube\.com|instagram\.com\/p\/|twitter\.com|x\.com\/|booking\.com|airbnb\.|leboncoin|avito\.ma\/fr\/(?:annonce|search)|jumia\.|aliexpress|stackoverflow|github\.com/i;

export const JUNK_TITLE_RE =
  /telecontact|pages?\s*jaunes|annuaire|r[eé]sultats?\s+de\s+recherche|search\s+results|meilleures?\s+agences|top\s+\d+|liste\s+des|comparateur|guide\s+complet|tout\s+savoir/i;

export const JUNK_COMPANY_RE =
  /^(à\s*,?|les\s+pages|telecontact|pages?\s*jaunes|annuaire|undefined|null|\.+\s*$)/i;

export type LeadQualityInput = {
  company?: string | null;
  title?: string | null;
  phone?: string | null;
  phone_normalized?: string | null;
  email?: string | null;
  website?: string | null;
  source_url?: string | null;
  city?: string | null;
  memory_facts?: Record<string, string> | null;
  research_notes?: string | null;
};

export type LeadQualityResult = {
  score: number;
  junk: boolean;
  reasons: string[];
};

function digitsPhone(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

function hostOf(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function isJunkHost(url: string | null | undefined): boolean {
  const host = hostOf(url);
  return Boolean(host && JUNK_HOST_RE.test(host + " " + (url || "")));
}

export function isJunkTitle(text: string | null | undefined): boolean {
  return Boolean(text && JUNK_TITLE_RE.test(text));
}

export function isJunkCompany(name: string | null | undefined): boolean {
  const n = String(name || "").trim();
  if (n.length < 3) return true;
  if (JUNK_COMPANY_RE.test(n)) return true;
  if (/^,|^\.|^\s*-\s*$/.test(n)) return true;
  if (/telecontact|pages?\s*jaunes|annuaire/i.test(n)) return true;
  return false;
}

/**
 * Score 0–100 for outreach readiness.
 * Phone + own website dominate; directories / junk names → 0.
 */
export function scoreLeadQuality(input: LeadQualityInput): LeadQualityResult {
  const reasons: string[] = [];
  const company = input.company || input.title || "";
  const website = input.website || input.source_url || null;
  const phoneDigits = digitsPhone(input.phone_normalized || input.phone);

  if (isJunkHost(website) || isJunkTitle(company) || isJunkCompany(company)) {
    reasons.push("annuaire_ou_nom_invalide");
    return { score: 0, junk: true, reasons };
  }
  if (isJunkTitle(input.research_notes || "")) {
    reasons.push("notes_annuaire");
    return { score: 0, junk: true, reasons };
  }

  let score = 0;

  if (phoneDigits.length >= 9 && phoneDigits.length <= 15) {
    score += 40;
    reasons.push("telephone");
  } else if (phoneDigits.length > 0) {
    score += 10;
    reasons.push("telephone_faible");
  }

  if (website && !isJunkHost(website)) {
    const host = hostOf(website);
    if (/instagram\.com/i.test(host)) {
      score += 20;
      reasons.push("instagram");
    } else {
      score += 25;
      reasons.push("site_web");
      if (/\.ma$|\.com$|\.co\.ma$/i.test(host) && !/blog|wordpress|wix|blogspot/i.test(host)) {
        score += 5;
        reasons.push("domaine_pro");
      }
    }
  }

  if (input.memory_facts?.instagram && !/instagram\.com/i.test(hostOf(website))) {
    score += 10;
    reasons.push("instagram_lien");
  }

  if (input.memory_facts?.canal === "maps" && phoneDigits.length >= 9) {
    score += 5;
    reasons.push("maps_local");
  }

  if (input.email && /@/.test(input.email) && !/example\.|test@/i.test(input.email)) {
    score += 15;
    reasons.push("email");
  }

  if (company.trim().length >= 4 && !isJunkCompany(company)) {
    score += 10;
    reasons.push("nom_societe");
  }

  if (input.city) {
    score += 5;
    reasons.push("ville");
  }

  if (input.memory_facts?.secteur) {
    score += 5;
    reasons.push("secteur");
  }

  score = Math.max(0, Math.min(100, score));
  const junk = score < 25;
  if (junk) reasons.push("score_bas");
  return { score, junk, reasons };
}

export function scoreFromLead(
  lead: Pick<
    Lead,
    | "company"
    | "title"
    | "phone"
    | "phone_normalized"
    | "email"
    | "website"
    | "source_url"
    | "city"
    | "memory_facts"
    | "research_notes"
  >
): LeadQualityResult {
  return scoreLeadQuality(lead);
}

/** Threshold: auto-discover junk cleanup & skip-on-create. */
export const JUNK_SCORE_MAX = 35;
export const MIN_CREATE_SCORE = 30;
