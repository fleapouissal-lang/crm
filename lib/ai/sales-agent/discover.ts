import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead, LeadStage, SalesStatus } from "@/types/database";
import {
  extractPublicContacts,
  fetchCompanySnapshot,
  fetchPageHtml,
  researchLeadIfNeeded,
} from "./research";
import { casablancaDayStart } from "./language";
import { logAiAction } from "./context";
import { discoverProfileForProject } from "./constants";
import {
  isJunkCompany,
  isJunkHost,
  isJunkTitle,
  MIN_CREATE_SCORE,
  scoreLeadQuality,
} from "./lead-quality";
import {
  gatherDiscoverHits,
  type DiscoverChannel,
  type DiscoverHit,
} from "./discover-sources";

function normalizePhone(value: string | null | undefined): string | null {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 9 ? digits : null;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x27;|&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#x2F;/gi, "/")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    );
}

function companyFromTitle(title: string, sector: string, city: string): string {
  const cleanTitle = decodeHtmlEntities(title);
  let name = cleanTitle
    .replace(/\s*[\-|–|•].*$/, "")
    .replace(new RegExp(sector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "")
    .replace(new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "")
    .replace(/\b(Maroc|Morocco|telephone|téléphone|contact|officiel|accueil)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (name.length < 3) name = cleanTitle.slice(0, 80).trim();
  return name.slice(0, 200) || `${sector} ${city}`;
}

function isSocialOrMapsOnly(url: string | null): boolean {
  if (!url) return false;
  return /instagram\.com|openstreetmap\.org|google\.[a-z.]+\/maps/i.test(url);
}

const CHANNEL_ROTATION: DiscoverChannel[][] = [
  ["web"],
  ["instagram"],
  ["maps"],
  ["web", "instagram"],
];

export type DiscoverOptions = {
  cities?: string[];
  sectors?: string[];
  salesProject?: string;
  dailyLimit?: number;
  enrichResearch?: boolean;
};

export async function processAutoDiscoverProspects(
  supabase: SupabaseClient,
  organizationId: string,
  options: DiscoverOptions = {}
): Promise<{
  created: number;
  enriched: number;
  skipped: number;
  errors: string[];
  queries: string[];
  salesProject: string;
}> {
  const salesProject = options.salesProject || "Fusion Leap";
  const profile = discoverProfileForProject(salesProject);
  const cities = (options.cities?.length ? options.cities : profile.cities).slice(0, 8);
  const sectors = (options.sectors?.length ? options.sectors : profile.sectors).slice(0, 10);
  const hints = profile.queryHints;
  const dailyLimit = Math.max(0, Math.min(100, options.dailyLimit ?? 20));
  const errors: string[] = [];
  const queries: string[] = [];

  if (dailyLimit <= 0) {
    return { created: 0, enriched: 0, skipped: 0, errors: [], queries, salesProject };
  }

  const dayStart = casablancaDayStart().toISOString();
  const { count: already } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("sales_project", salesProject)
    .eq("source", "auto_discover")
    .gte("created_at", dayStart);
  const remaining = Math.max(0, dailyLimit - (already ?? 0));
  if (remaining <= 0) {
    return { created: 0, enriched: 0, skipped: 0, errors: [], queries, salesProject };
  }

  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const pairs: Array<{ city: string; sector: string; channels: DiscoverChannel[] }> =
    [];
  const maxPairs = Math.min(4, sectors.length);
  for (let i = 0; i < maxPairs; i++) {
    const sector = sectors[(dayIndex + i) % sectors.length];
    const city = cities[i % Math.min(3, cities.length)];
    pairs.push({
      city,
      sector,
      channels: CHANNEL_ROTATION[i % CHANNEL_ROTATION.length],
    });
  }

  let created = 0;
  let enriched = 0;
  let skipped = 0;

  for (let p = 0; p < pairs.length; p++) {
    const { city, sector, channels } = pairs[p];
    if (created + enriched >= remaining) break;
    const hint = hints[p % hints.length] || "";
    const gathered = await gatherDiscoverHits({
      sector,
      city,
      hint,
      channels,
    });
    queries.push(...gathered.queries);

    for (const hit of gathered.hits as DiscoverHit[]) {
      if (created + enriched >= remaining) break;
      if (isJunkHost(hit.url) || isJunkTitle(hit.title)) {
        skipped += 1;
        continue;
      }

      const company = companyFromTitle(hit.title, sector, city);
      if (isJunkCompany(company) || isJunkTitle(company)) {
        skipped += 1;
        continue;
      }

      const preferredSite =
        hit.websiteHint ||
        (hit.url.startsWith("http") && !/openstreetmap\.org/i.test(hit.url)
          ? hit.url.split("?")[0]
          : null);
      const website = preferredSite;

      let existingId: string | null = null;
      if (website) {
        const byWebsite = await supabase
          .from("leads")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("sales_project", salesProject)
          .eq("website", website)
          .limit(1)
          .maybeSingle();
        existingId = byWebsite.data?.id ?? null;
        if (!existingId) {
          const bySource = await supabase
            .from("leads")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("sales_project", salesProject)
            .eq("source_url", website)
            .limit(1)
            .maybeSingle();
          existingId = bySource.data?.id ?? null;
        }
      }
      if (!existingId) {
        const { data } = await supabase
          .from("leads")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("sales_project", salesProject)
          .ilike("company", company)
          .eq("city", city)
          .limit(1)
          .maybeSingle();
        existingId = data?.id ?? null;
      }

      let phone: string | null = hit.phoneHint || null;
      let email: string | null = hit.emailHint || null;
      let snapshot: string | null = null;
      const skipHeavyFetch = isSocialOrMapsOnly(website) || hit.channel === "instagram";
      if (website && !skipHeavyFetch) {
        const html = await fetchPageHtml(website);
        if (html) {
          const contacts = extractPublicContacts(html + " " + hit.snippet);
          phone = phone || contacts.phones[0] || null;
          email = email || contacts.emails[0] || null;
          snapshot = await fetchCompanySnapshot(website);
        } else {
          const fromSnippet = extractPublicContacts(hit.snippet);
          phone = phone || fromSnippet.phones[0] || null;
          email = email || fromSnippet.emails[0] || null;
        }
      } else {
        const fromSnippet = extractPublicContacts(hit.snippet);
        phone = phone || fromSnippet.phones[0] || null;
        email = email || fromSnippet.emails[0] || null;
      }

      const phoneNormalized = normalizePhone(phone);
      const instagramUrl =
        hit.channel === "instagram"
          ? website
          : website && /instagram\.com/i.test(website)
            ? website
            : null;
      const memoryFacts: Record<string, string> = {
        secteur: sector,
        ville: city,
        projet: salesProject,
        canal: hit.channel,
        ...(website ? { site_web: website } : {}),
        ...(instagramUrl ? { instagram: instagramUrl } : {}),
      };

      const quality = scoreLeadQuality({
        company,
        title: company,
        phone,
        phone_normalized: phoneNormalized,
        email,
        website,
        source_url: website,
        city,
        memory_facts: memoryFacts,
        research_notes: hit.snippet,
      });
      if (quality.junk || quality.score < MIN_CREATE_SCORE) {
        skipped += 1;
        continue;
      }

      const notes = [
        `Découverte auto ${new Date().toISOString().slice(0, 10)} · projet ${salesProject}`,
        `Canal: ${hit.channel}`,
        `Secteur recherché: ${sector}`,
        `Ville: ${city}`,
        `Qualité: ${quality.score}/100 (${quality.reasons.join(", ")})`,
        hit.snippet ? `Snippet: ${hit.snippet}` : "",
        snapshot ? snapshot.slice(0, 1500) : "",
      ]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 4000);

      if (existingId) {
        const patch: Record<string, unknown> = {
          research_notes: notes,
          researched_at: new Date().toISOString(),
          research_sources: website ? [website] : [],
          ai_score: quality.score,
          memory_facts: memoryFacts,
        };
        if (phone) patch.phone = phone;
        if (phoneNormalized) patch.phone_normalized = phoneNormalized;
        if (email) {
          patch.email = email;
          patch.email_normalized = email.toLowerCase();
        }
        if (website && !/openstreetmap\.org/i.test(website)) patch.website = website;
        await supabase
          .from("leads")
          .update(patch)
          .eq("id", existingId)
          .eq("organization_id", organizationId);
        enriched += 1;
        continue;
      }

      const { data: createdLead, error } = await supabase
        .from("leads")
        .insert({
          organization_id: organizationId,
          title: company,
          company,
          contact_name: null,
          email,
          phone,
          phone_normalized: phoneNormalized,
          email_normalized: email?.toLowerCase() || null,
          website:
            website && !/openstreetmap\.org/i.test(website) ? website : null,
          city,
          country: "Maroc",
          source: "auto_discover",
          source_url: website,
          sales_project: salesProject,
          contact_permission: "legitimate_interest",
          value: 0,
          stage: "new" as LeadStage,
          sales_status: "new" as SalesStatus,
          notes: `Prospect ${salesProject} (${sector} · ${city} · ${hit.channel})`,
          research_notes: notes,
          research_sources: website ? [website] : [],
          researched_at: new Date().toISOString(),
          ai_score: quality.score,
          ai_summary: `${sector} à ${city} — cible ${salesProject} via ${hit.channel}. Score ${quality.score}.`,
          memory_facts: {
            ...memoryFacts,
            qualite: String(quality.score),
          },
          created_by: null,
        })
        .select("id")
        .single();
      if (error || !createdLead) {
        errors.push(error?.message || "insert failed");
        skipped += 1;
        continue;
      }
      created += 1;

      await logAiAction(supabase, {
        organization_id: organizationId,
        lead_id: createdLead.id,
        sales_project: salesProject,
        action: "auto_discover",
        success: true,
        summary: `${company} · ${city} · ${sector} · ${salesProject} · ${hit.channel}`,
        metadata: {
          website,
          phone: Boolean(phone),
          channel: hit.channel,
          project: salesProject,
        },
      });

      if (options.enrichResearch !== false && !skipHeavyFetch) {
        const { data: full } = await supabase
          .from("leads")
          .select("*")
          .eq("id", createdLead.id)
          .single();
        if (full) {
          await researchLeadIfNeeded(supabase, organizationId, full as Lead, {
            force: false,
          }).catch(() => null);
        }
      }
    }
  }

  return {
    created,
    enriched,
    skipped,
    errors: errors.slice(0, 20),
    queries: queries.slice(0, 24),
    salesProject,
  };
}
