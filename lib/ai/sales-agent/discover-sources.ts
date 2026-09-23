import { duckDuckGoSearch, type SearchHit } from "./research";

export type DiscoverChannel = "web" | "instagram" | "maps";

export type DiscoverHit = SearchHit & {
  channel: DiscoverChannel;
  phoneHint?: string | null;
  emailHint?: string | null;
  websiteHint?: string | null;
};

function asciiFold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeInstagramUrl(url: string): string | null {
  const m = url.match(
    /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]{2,40})\/?(?:\?|$)/i
  );
  if (!m) return null;
  const handle = m[1].toLowerCase();
  if (
    /^(p|reel|reels|stories|explore|accounts|about|developer|legal|directory)$/i.test(
      handle
    )
  ) {
    return null;
  }
  return `https://www.instagram.com/${m[1]}`;
}

function companyFromOsmName(displayName: string, sector: string, city: string): string {
  const first = displayName.split(",")[0]?.trim() || displayName;
  return first
    .replace(new RegExp(sector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "")
    .replace(new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200) || first.slice(0, 200);
}

/** Public Instagram business profiles via DuckDuckGo (no IG login). */
export async function searchInstagramProspects(
  sector: string,
  city: string,
  limit = 5
): Promise<DiscoverHit[]> {
  const q = asciiFold(
    `site:instagram.com ${sector} ${city} Maroc`
  );
  const hits = await duckDuckGoSearch(q, limit + 2);
  const out: DiscoverHit[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    const ig = normalizeInstagramUrl(hit.url);
    if (!ig || seen.has(ig)) continue;
    seen.add(ig);
    out.push({
      url: ig,
      title: hit.title || ig.split("/").pop() || sector,
      snippet: hit.snippet,
      channel: "instagram",
      websiteHint: ig,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Local businesses via OpenStreetMap Nominatim (public, rate-limited).
 * Policy: identify app + max 1 req/s.
 */
export async function searchOsmMapsProspects(
  sector: string,
  city: string,
  limit = 5
): Promise<DiscoverHit[]> {
  try {
    const q = asciiFold(`${sector} ${city} Maroc`);
    const url =
      `https://nominatim.openstreetmap.org/search?` +
      new URLSearchParams({
        q,
        format: "json",
        addressdetails: "1",
        extratags: "1",
        limit: String(Math.min(8, limit + 3)),
        countrycodes: "ma",
      }).toString();

    const response = await fetch(url, {
      headers: {
        "user-agent": "FusionLeapCRM/1.0 (sales-discover; contact@fusionleap.ma)",
        accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];
    const rows = (await response.json()) as Array<{
      display_name?: string;
      name?: string;
      lat?: string;
      lon?: string;
      osm_type?: string;
      osm_id?: number;
      extratags?: Record<string, string>;
      type?: string;
      class?: string;
    }>;

    const out: DiscoverHit[] = [];
    const seen = new Set<string>();
    for (const row of rows || []) {
      const tags = row.extratags || {};
      const name =
        row.name ||
        companyFromOsmName(row.display_name || "", sector, city);
      if (!name || name.length < 2) continue;
      const website =
        tags.website ||
        tags["contact:website"] ||
        (tags.phone || tags["contact:phone"]
          ? `https://www.openstreetmap.org/${row.osm_type}/${row.osm_id}`
          : null);
      const phone = tags.phone || tags["contact:phone"] || tags["contact:mobile"] || null;
      const email = tags.email || tags["contact:email"] || null;
      const key = `${name.toLowerCase()}|${city}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const mapsUrl =
        row.lat && row.lon
          ? `https://www.openstreetmap.org/?mlat=${row.lat}&mlon=${row.lon}#map=17/${row.lat}/${row.lon}`
          : website;

      out.push({
        url: mapsUrl || `https://www.openstreetmap.org/${row.osm_type}/${row.osm_id}`,
        title: name,
        snippet: [
          row.display_name,
          phone ? `Tél: ${phone}` : "",
          website && !String(website).includes("openstreetmap.org")
            ? `Site: ${website}`
            : "",
          row.class && row.type ? `${row.class}/${row.type}` : "",
        ]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 280),
        channel: "maps",
        phoneHint: phone,
        emailHint: email,
        websiteHint:
          website && !/openstreetmap\.org/i.test(website) ? website : null,
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

/** DDG queries biased toward Google Maps / local listings with phone. */
export async function searchMapsWebProspects(
  sector: string,
  city: string,
  limit = 4
): Promise<DiscoverHit[]> {
  const q = asciiFold(`${sector} ${city} Maroc adresse telephone`);
  const hits = await duckDuckGoSearch(q, limit);
  return hits.map((h) => ({
    ...h,
    channel: "maps" as const,
  }));
}

export async function gatherDiscoverHits(options: {
  sector: string;
  city: string;
  hint?: string;
  /** Which channels to hit this round */
  channels?: DiscoverChannel[];
}): Promise<{ hits: DiscoverHit[]; queries: string[] }> {
  const { sector, city, hint = "" } = options;
  const channels = options.channels?.length
    ? options.channels
    : (["web", "instagram", "maps"] as DiscoverChannel[]);
  const queries: string[] = [];
  const hits: DiscoverHit[] = [];
  const seen = new Set<string>();

  const push = (batch: DiscoverHit[]) => {
    for (const h of batch) {
      const key = h.url.split("?")[0].toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push(h);
    }
  };

  if (channels.includes("web")) {
    const base = asciiFold(`${sector} ${city}`);
    const qList = [
      asciiFold(`${base} Maroc ${hint}`.trim()),
      asciiFold(`${base} contact telephone`),
      asciiFold(`${sector} ${city} Maroc`),
    ].filter((q, i, arr) => arr.indexOf(q) === i);
    for (const q of qList) {
      queries.push(`web:${q}`);
      if (queries.length > 1) await sleep(350);
      const batch = await duckDuckGoSearch(q, 5);
      push(batch.map((h) => ({ ...h, channel: "web" as const })));
    }
  }

  if (channels.includes("instagram")) {
    const q = asciiFold(`site:instagram.com ${sector} ${city} Maroc`);
    queries.push(`instagram:${q}`);
    await sleep(350);
    push(await searchInstagramProspects(sector, city, 5));
  }

  if (channels.includes("maps")) {
    queries.push(`maps:osm:${asciiFold(`${sector} ${city}`)}`);
    await sleep(1100); // Nominatim courtesy
    push(await searchOsmMapsProspects(sector, city, 5));
    const mq = asciiFold(`${sector} ${city} Maroc adresse telephone`);
    queries.push(`maps:web:${mq}`);
    await sleep(350);
    push(await searchMapsWebProspects(sector, city, 3));
  }

  return { hits, queries };
}
