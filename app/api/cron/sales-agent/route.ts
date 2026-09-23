import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSalesAgentConfigured } from "@/lib/ai/sales-agent/client";
import { discoverProfileForProject } from "@/lib/ai/sales-agent/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.SALES_AGENT_CRON_SECRET || process.env.WA_BRIDGE_SECRET || "";
  if (!secret) return false;
  const header =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.headers.get("x-cron-secret") ||
    "";
  return header === secret;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    organization_id?: string;
  } | null;
  const organizationId =
    process.env.WA_BRIDGE_ORGANIZATION_ID || body?.organization_id;
  if (!organizationId) {
    return NextResponse.json({ error: "organization_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const results = {
    firstTouch: 0,
    firstTouchErrors: [] as string[],
    firstTouchMeta: {
      limit: 0,
      alreadyToday: 0,
      skipped: 0,
    },
    discover: {
      created: 0,
      enriched: 0,
      skipped: 0,
      errors: [] as string[],
    },
    scheduledSent: 0,
    scheduledErrors: [] as string[],
    reminders: 0,
    geminiConfigured: isSalesAgentConfigured(),
  };

  const { flushDueAiWhatsApp, processDailyAutoFirstTouch } = await import(
    "@/lib/ai/sales-agent/runtime"
  );
  const flushed = await flushDueAiWhatsApp(supabase, organizationId, 30);
  results.scheduledSent = flushed.sent;
  results.scheduledErrors = flushed.errors;

  const batch = await processDailyAutoFirstTouch(supabase, organizationId);
  results.firstTouch = batch.queued;
  results.firstTouchErrors = batch.errors;
  results.firstTouchMeta = {
    limit: batch.limit,
    alreadyToday: batch.alreadyToday,
    skipped: batch.skipped,
  };

  const { data: discoverSettings } = await supabase
    .from("sales_agent_settings")
    .select(
      "sales_project, auto_discover, daily_discover_limit, discover_cities, discover_sectors, enabled"
    )
    .eq("organization_id", organizationId)
    .eq("enabled", true)
    .eq("auto_discover", true);

  if (discoverSettings?.length) {
    const { processAutoDiscoverProspects } = await import(
      "@/lib/ai/sales-agent/discover"
    );
    for (const row of discoverSettings) {
      const profile = discoverProfileForProject(row.sales_project);
      const disc = await processAutoDiscoverProspects(supabase, organizationId, {
        salesProject: row.sales_project,
        dailyLimit: Number(row.daily_discover_limit ?? 20),
        cities: row.discover_cities?.length
          ? row.discover_cities
          : profile.cities,
        sectors: row.discover_sectors?.length
          ? row.discover_sectors
          : profile.sectors,
        enrichResearch: true,
      });
      results.discover.created += disc.created;
      results.discover.enriched += disc.enriched;
      results.discover.skipped += disc.skipped;
      results.discover.errors.push(...disc.errors);
    }
  }

  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60_000).toISOString();
  const { data: dueReminders } = await supabase
    .from("appointments")
    .select("id, lead_id, starts_at, meet_url, location, type")
    .eq("organization_id", organizationId)
    .in("status", ["proposed", "confirmed"])
    .lte("reminder_at", inOneHour)
    .gte("starts_at", now.toISOString())
    .limit(20);

  for (const apt of dueReminders || []) {
    const when = new Date(apt.starts_at).toLocaleString("fr-FR");
    const place =
      apt.type === "online"
        ? apt.meet_url || "en ligne"
        : apt.location || "sur place";
    const bodyText = `Rappel : notre rendez-vous est prévu le ${when} (${place}). Dites-moi si vous devez décaler.`;
    const { data: message } = await supabase
      .from("outreach_messages")
      .insert({
        organization_id: organizationId,
        lead_id: apt.lead_id,
        channel: "whatsapp",
        status: "queued",
        body: bodyText,
        message_parts: [bodyText],
        idempotency_key: `appt-reminder-${apt.id}`,
        provider: "easytouch",
        approved_at: now.toISOString(),
      })
      .select("id")
      .maybeSingle();
    if (message?.id) {
      const { dispatchOutreachMessage } = await import("@/lib/outreach/dispatch");
      await dispatchOutreachMessage(supabase, organizationId, message.id);
      await supabase
        .from("appointments")
        .update({ reminder_at: null })
        .eq("id", apt.id);
      results.reminders += 1;
    }
  }

  return NextResponse.json(results);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    status: "ok",
    service: "sales-agent-cron",
    geminiConfigured: isSalesAgentConfigured(),
  });
}
