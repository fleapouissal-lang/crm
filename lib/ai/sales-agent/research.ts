import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead } from "@/types/database";
import { generateSalesAgentText, isSalesAgentConfigured } from "./client";

export type SearchHit = { url: string; title: string; snippet: string };

const SECTOR_HINTS: Array<{ label: string; re: RegExp }> = [
  { label: "restauration / café", re: /\b(restaurant|resto|café|cafe|snack|traiteur|pâtisserie|patisserie|fast[\s-]?food|قھوة|مطعم)\b/i },
  { label: "hôtel / tourisme", re: /\b(hôtel|hotel|riad|auberge|agence de voyage|tourisme|voyage)\b/i },
  { label: "commerce / retail", re: /\b(boutique|magasin|retail|e-?commerce|parapharmacie|pharmacie|épicerie)\b/i },
  { label: "immobilier", re: /\b(immobilier|agence immobilière|promoteu|housing)\b/i },
  { label: "santé", re: /\b(clinique|cabinet|dentaire|médecin|laboratoire|santé)\b/i },
  { label: "éducation", re: /\b(école|ecole|université|formation|centre de formation|collège)\b/i },
  { label: "industrie / BTP", re: /\b(usine|industrie|btp|chantier|construction|menuiserie|métallurg)\b/i },
  { label: "auto / transport", re: /\b(garage|automobile|transport|logistique|location de voiture)\b/i },
  { label: "agence / services", re: /\b(agence|cabinet|consulting|comptable|avocat|assurance|notaire)\b/i },
  { label: "IT / digital", re: /\b(software|saas|informatique|digital|développement web|startup)\b/i },
];

function isPublicHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local")) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const [a, b] = host.split(".").map(Number);
      if (a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function normalizeWebsite(website: string | null | undefined): string | null {
  const raw = (website || "").trim();
  if (!raw) return null;
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return isPublicHttpUrl(withProto) ? withProto : null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40);
}

function extractIce(text: string): string | null {
  const match = text.match(/\b(?:ICE|I\.C\.E\.?)\s*[:.\-–]?\s*(\d{9,15})\b/i);
  return match?.[1] || null;
}

function extractRc(text: string): string | null {
  const match = text.match(/\b(?:RC|R\.C\.?|registre de commerce)\s*[:.\-–]?\s*(\d{3,8})\b/i);
  return match?.[1] || null;
}

function guessSector(text: string): string | null {
  const hit = SECTOR_HINTS.find((s) => s.re.test(text));
  return hit?.label || null;
}

function extractSocials(html: string): Record<string, string> {
  const found: Record<string, string> = {};
  const pairs: Array<[string, RegExp]> = [
    ["instagram", /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)/i],
    ["facebook", /https?:\/\/(?:www\.)?facebook\.com\/([A-Za-z0-9.]+)/i],
    ["linkedin", /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/([A-Za-z0-9_-]+)/i],
    ["tiktok", /https?:\/\/(?:www\.)?tiktok\.com\/@([A-Za-z0-9._]+)/i],
    ["maps", /https?:\/\/(?:www\.)?google\.[a-z.]+\/maps\/[^\s"'<>]+/i],
  ];
  for (const [key, re] of pairs) {
    const m = html.match(re);
    if (!m) continue;
    if (key === "maps") found[key] = m[0];
    else if (key === "instagram") found[key] = `https://www.instagram.com/${m[1]}`;
    else if (key === "facebook") found[key] = `https://www.facebook.com/${m[1]}`;
    else if (key === "linkedin") found[key] = m[0].split("?")[0];
    else found[key] = `https://www.tiktok.com/@${m[1]}`;
  }
  return found;
}

function metaFromHtml(html: string, url: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
  const desc =
    html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i)?.[1];
  const siteName = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i)?.[1];
  const body = stripHtml(html).slice(0, 1400);
  const socials = extractSocials(html);
  const ice = extractIce(html) || extractIce(body);
  const rc = extractRc(html) || extractRc(body);
  const sector = guessSector(`${title || ""} ${desc || ""} ${body}`);
  return [
    `URL: ${url}`,
    title ? `Titre: ${title}` : "",
    siteName ? `Marque: ${siteName}` : "",
    desc ? `Meta: ${desc}` : "",
    sector ? `Secteur probable: ${sector}` : "",
    ice ? `ICE: ${ice}` : "",
    rc ? `RC: ${rc}` : "",
    Object.keys(socials).length
      ? `Réseaux: ${Object.entries(socials)
          .map(([k, v]) => `${k}=${v}`)
          .join(" · ")}`
      : "",
    body ? `Extrait: ${body}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 2600);
}

export async function fetchCompanySnapshot(website: string): Promise<string | null> {
  const url = normalizeWebsite(website);
  if (!url) return null;
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; FusionLeapCRM/1.0; +https://fusionleap.ma) research",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const html = (await response.text()).slice(0, 100_000);
    return metaFromHtml(html, url);
  } catch {
    return null;
  }
}

/** Extract public contact fields from HTML (phone / email / title). */
export function extractPublicContacts(htmlOrText: string): {
  phones: string[];
  emails: string[];
} {
  const text = stripHtml(htmlOrText);
  const phones = [
    ...text.matchAll(
      /(?:\+212|00212|0)\s*[5-7](?:[\s.-]*\d){8}|\+212\s*[5-7]\d{8}/g
    ),
  ].map((m) => m[0].replace(/\s+/g, " ").trim());
  const emails = [
    ...text.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g),
  ]
    .map((m) => m[0].toLowerCase())
    .filter((e) => !/example\.|sentry|wixpress|cloudflare|schema\.org/i.test(e));
  return {
    phones: [...new Set(phones)].slice(0, 3),
    emails: [...new Set(emails)].slice(0, 3),
  };
}

export async function fetchPageHtml(website: string): Promise<string | null> {
  const url = normalizeWebsite(website);
  if (!url) return null;
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; FusionLeapCRM/1.0; +https://fusionleap.ma) research",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return (await response.text()).slice(0, 120_000);
  } catch {
    return null;
  }
}

export async function duckDuckGoSearch(query: string, limit = 5): Promise<SearchHit[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 FusionLeapCRM/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const html = await response.text();
    const blocks = [...html.matchAll(/<a[^>]+class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    const snippets = [...html.matchAll(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|td|div)>/gi)].map((m) =>
      stripHtml(m[1]).slice(0, 280)
    );
    const hits: SearchHit[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const href = blocks[i][1];
      const uddg = href.match(/uddg=([^&"]+)/);
      let target = href;
      if (uddg) {
        try {
          target = decodeURIComponent(uddg[1]);
        } catch {
          target = href;
        }
      }
      if (!/^https?:\/\//i.test(target) || target.includes("duckduckgo.com")) continue;
      hits.push({
        url: target,
        title: stripHtml(blocks[i][2]).slice(0, 140),
        snippet: snippets[i] || "",
      });
    }
    const unique: SearchHit[] = [];
    const seen = new Set<string>();
    for (const hit of hits) {
      if (seen.has(hit.url)) continue;
      seen.add(hit.url);
      unique.push(hit);
      if (unique.length >= limit) break;
    }
    return unique;
  } catch {
    return [];
  }
}

async function searchMany(queries: string[]): Promise<SearchHit[]> {
  const batches = await Promise.all(queries.filter(Boolean).map((q) => duckDuckGoSearch(q, 4)));
  const merged: SearchHit[] = [];
  const seen = new Set<string>();
  for (const batch of batches) {
    for (const hit of batch) {
      if (seen.has(hit.url)) continue;
      seen.add(hit.url);
      merged.push(hit);
    }
  }
  return merged.slice(0, 12);
}

function preferFetchUrls(hits: SearchHit[]): string[] {
  const score = (url: string) => {
    const u = url.toLowerCase();
    if (u.includes("instagram.com") || u.includes("facebook.com") || u.includes("linkedin.com")) return 2;
    if (u.includes("pagesjaunes") || u.includes("google.com/maps")) return 1;
    if (u.endsWith(".ma") || u.includes(".ma/")) return 4;
    return 3;
  };
  return [...hits]
    .sort((a, b) => score(b.url) - score(a.url))
    .map((h) => h.url)
    .filter((u) => !/wikipedia|youtube\.com|tiktok\.com\/explore/i.test(u))
    .slice(0, 4);
}

function factsFromNotes(notes: string): Record<string, string> {
  const facts: Record<string, string> = {};
  const ice = notes.match(/\bICE[:\s]+(\d{9,15})/i)?.[1];
  const sector = notes.match(/Secteur probable:\s*(.+)/i)?.[1]?.trim();
  const instagram = notes.match(/https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._]+/i)?.[0];
  const facebook = notes.match(/https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9.]+/i)?.[0];
  const site = notes.match(/^URL:\s*(https?:\/\/\S+)/im)?.[1];
  if (ice) facts.ice = ice;
  if (sector) facts.secteur = sector;
  if (instagram) facts.instagram = instagram;
  if (facebook) facts.facebook = facebook;
  if (site) facts.site_web = site;
  return facts;
}

async function synthesizeResearch(lead: Lead, raw: string): Promise<string | null> {
  if (!isSalesAgentConfigured()) return null;
  try {
    const text = await generateSalesAgentText({
      maxTokens: 350,
      system:
        "Tu résumes une recherche entreprise pour un commercial IT au Maroc. Réponds en 8 lignes max, faits seulement. Mentionne secteur, ville, réseaux, ICE si trouvés, et UN angle WhatsApp personnalisé. N’invente rien.",
      user: JSON.stringify({
        entreprise: lead.company || lead.title,
        ville: lead.city,
        site: lead.website,
        extraits: raw.slice(0, 4500),
      }),
    });
    return text || null;
  } catch {
    return null;
  }
}

export async function researchLeadIfNeeded(
  supabase: SupabaseClient,
  organizationId: string,
  lead: Lead,
  options?: { force?: boolean }
): Promise<string | null> {
  const fresh =
    !options?.force &&
    lead.researched_at &&
    Date.now() - new Date(lead.researched_at).getTime() < 14 * 24 * 3600_000 &&
    (lead.research_notes?.trim().length || 0) >= 180;
  if (fresh) return lead.research_notes;

  const parts: string[] = [];
  const sources: string[] = [];
  const company = (lead.company || lead.title || "").trim();
  const city = (lead.city || "").trim();
  const slug = slugify(company);

  if (lead.website) {
    const snapshot = await fetchCompanySnapshot(lead.website);
    if (snapshot) {
      parts.push(snapshot);
      sources.push(lead.website);
    }
  }

  if (company && slug.length >= 4 && parts.length < 2) {
    const guesses = [
      `https://www.${slug}.ma`,
      `https://${slug}.ma`,
      `https://www.${slug}.com`,
      `https://${slug}.co.ma`,
    ];
    for (const guess of guesses) {
      if (lead.website && normalizeWebsite(lead.website) === normalizeWebsite(guess)) continue;
      const snap = await fetchCompanySnapshot(guess);
      if (snap) {
        parts.push(snap);
        sources.push(guess);
        break;
      }
    }
  }

  if (company) {
    const hits = await searchMany([
      [company, city, "Maroc"].filter(Boolean).join(" "),
      `${company} site officiel ${city}`.trim(),
      `${company} Instagram`,
      `${company} Facebook ${city}`.trim(),
      `${company} ICE Maroc`,
      city ? `${company} ${city} secteur activité` : `${company} Maroc activité`,
    ]);
    if (hits.length) {
      const linkBlock = hits
        .slice(0, 8)
        .map((h) => `- ${h.title || h.url}${h.snippet ? ` — ${h.snippet}` : ""}\n  ${h.url}`)
        .join("\n");
      parts.push(`Liens / extraits web:\n${linkBlock}`);
      sources.push(...hits.map((h) => h.url));

      const socialHits = hits.filter((h) =>
        /instagram\.com|facebook\.com|linkedin\.com|tiktok\.com|maps\.google/i.test(h.url)
      );
      if (socialHits.length) {
        parts.push(
          `Présence digitale:\n${socialHits.map((h) => `- ${h.url}${h.snippet ? ` (${h.snippet})` : ""}`).join("\n")}`
        );
      }

      const iceFromSnippets = extractIce(hits.map((h) => `${h.title} ${h.snippet}`).join(" "));
      if (iceFromSnippets) parts.push(`ICE (recherche): ${iceFromSnippets}`);

      const sectorFromSnippets = guessSector(hits.map((h) => `${h.title} ${h.snippet}`).join(" "));
      if (sectorFromSnippets) parts.push(`Secteur probable: ${sectorFromSnippets}`);

      for (const url of preferFetchUrls(hits)) {
        if (sources.includes(url) && parts.length >= 3) continue;
        const snap = await fetchCompanySnapshot(url);
        if (snap) {
          parts.push(snap);
          sources.push(url);
        }
        if (parts.length >= 6) break;
      }
    }
  }

  if (!parts.length) return lead.research_notes;

  const raw = [`Recherche auto ${new Date().toISOString().slice(0, 10)}`, ...parts].join("\n\n");
  const summary = await synthesizeResearch(lead, raw);
  const notes = [summary ? `Synthèse commerciale:\n${summary}` : "", raw].filter(Boolean).join("\n\n").slice(0, 7000);

  const researchFacts = factsFromNotes(notes);
  const nextFacts = { ...(lead.memory_facts || {}), ...researchFacts };

  await supabase
    .from("leads")
    .update({
      research_notes: notes,
      researched_at: new Date().toISOString(),
      research_sources: [...new Set(sources.filter(Boolean))].slice(0, 12),
      memory_facts: Object.fromEntries(
        Object.entries(nextFacts).filter(([, v]) => Boolean(v && String(v).trim()))
      ),
    })
    .eq("id", lead.id)
    .eq("organization_id", organizationId);
  return notes;
}
