import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleInboundMessage } from "@/lib/ai/sales-agent/runtime";
import { resolveInboundText } from "@/lib/ai/sales-agent/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BridgeMessage = {
  key?: {
    id?: string;
    remoteJid?: string;
    remoteJidAlt?: string;
    participantAlt?: string;
    fromMe?: boolean;
  };
  _mediaType?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
    documentMessage?: { caption?: string; fileName?: string; mimetype?: string };
    audioMessage?: { ptt?: boolean };
  };
};

function messageText(message: BridgeMessage): string {
  return (
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.imageMessage?.caption ||
    message.message?.videoMessage?.caption ||
    message.message?.documentMessage?.caption ||
    ""
  ).trim();
}

function digits(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

function sameMoroccanPhone(a: string, b: string): boolean {
  const left = digits(a);
  const right = digits(b);
  if (!left || !right) return false;
  return left === right || left.slice(-9) === right.slice(-9);
}

/** Debounce rapid WhatsApp bubbles (ex: "foin kaynin" + "ina ville") into one AI turn. */
type PendingInbound = {
  texts: string[];
  timer: ReturnType<typeof setTimeout>;
  organizationId: string;
  leadId: string;
  providerMessageId: string | null;
  outreachReplyId: string | null;
};
const pendingByLead = new Map<string, PendingInbound>();

function queueInboundDebounced(options: {
  organizationId: string;
  leadId: string;
  text: string;
  providerMessageId: string | null;
  outreachReplyId: string | null;
  waitMs?: number;
}) {
  const key = `${options.organizationId}:${options.leadId}`;
  const existing = pendingByLead.get(key);
  if (existing) {
    clearTimeout(existing.timer);
    existing.texts.push(options.text);
    existing.providerMessageId =
      options.providerMessageId || existing.providerMessageId;
    existing.outreachReplyId = options.outreachReplyId || existing.outreachReplyId;
    existing.timer = setTimeout(() => {
      void flushPendingInbound(key);
    }, options.waitMs ?? 4500);
    return;
  }
  const entry: PendingInbound = {
    texts: [options.text],
    organizationId: options.organizationId,
    leadId: options.leadId,
    providerMessageId: options.providerMessageId,
    outreachReplyId: options.outreachReplyId,
    timer: setTimeout(() => {
      void flushPendingInbound(key);
    }, options.waitMs ?? 4500),
  };
  pendingByLead.set(key, entry);
}

async function flushPendingInbound(key: string) {
  const entry = pendingByLead.get(key);
  if (!entry) return;
  pendingByLead.delete(key);
  const combined = [...new Set(entry.texts.map((t) => t.trim()).filter(Boolean))].join(
    "\n"
  );
  if (!combined) return;
  const supabase = createAdminClient();
  try {
    await handleInboundMessage(supabase, entry.organizationId, entry.leadId, combined, {
      providerMessageId: entry.providerMessageId,
      outreachReplyId: entry.outreachReplyId,
    });
  } catch (error) {
    console.error(
      "[whatsapp-bridge] debounced agent failed",
      error instanceof Error ? error.message : error
    );
  }
}

export async function POST(request: Request) {
  const bridgeSecret = process.env.WA_BRIDGE_SECRET || "";
  const requestSecret =
    request.headers.get("apikey") || request.headers.get("x-api-key") || "";
  if (!bridgeSecret || requestSecret !== bridgeSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { event?: string; instance?: string; data?: { messages?: BridgeMessage[] } }
    | null;
  if (!body || !["messages.upsert", "MESSAGES_UPSERT"].includes(body.event || "")) {
    return NextResponse.json({ ok: true });
  }

  const organizationId = process.env.WA_BRIDGE_ORGANIZATION_ID;
  const instanceId = body.instance || "";
  const { salesProjectsForWhatsAppInstance } = await import(
    "@/lib/outreach/wa-instance"
  );
  const projectFilter = salesProjectsForWhatsAppInstance(instanceId);
  if (!organizationId) {
    return NextResponse.json(
      { error: "WhatsApp organization is not configured" },
      { status: 503 }
    );
  }

  const supabase = createAdminClient();
  for (const incoming of body.data?.messages || []) {
    if (incoming.key?.fromMe) continue;
    const text = messageText(incoming);
    const remotePhone = (incoming.key?.remoteJid || "").replace(/@.+$/, "");
    if (
      !remotePhone ||
      (!text &&
        !incoming._mediaType &&
        !incoming.message?.documentMessage &&
        !incoming.message?.audioMessage &&
        !incoming.message?.imageMessage &&
        !incoming.message?.videoMessage)
    ) {
      continue;
    }
    const mediaType =
      incoming._mediaType ||
      (incoming.message?.documentMessage
        ? incoming.message.documentMessage.mimetype || "document"
        : incoming.message?.audioMessage
          ? "audio"
          : incoming.message?.imageMessage
            ? "image"
            : incoming.message?.videoMessage
              ? "video"
              : "");
    const resolved = await resolveInboundText(text, {
      type: mediaType,
      messageId: incoming.key?.id || null,
      instanceId,
      caption: text,
    });
    const replyBody = resolved.text;

    let leadsQuery = supabase
      .from("leads")
      .select("id, title, phone, phone_normalized, stage, assigned_to, sales_project")
      .eq("organization_id", organizationId)
      .not("phone", "is", null);
    if (projectFilter?.length) {
      leadsQuery = leadsQuery.in("sales_project", projectFilter);
    }
    const { data: leads } = await leadsQuery;
    const lead = leads?.find((candidate) =>
      sameMoroccanPhone(remotePhone, candidate.phone_normalized || candidate.phone)
    );
    if (!lead) continue;

    const providerMessageId = incoming.key?.id || null;
    const { data: latestOutreach } = await supabase
      .from("outreach_messages")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("lead_id", lead.id)
      .eq("channel", "whatsapp")
      .in("status", ["sent", "delivered", "replied", "queued", "sending"])
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Only WhatsApp threads we started (or queued) — ignore cold inbound from unknown CRM contacts
    if (!latestOutreach?.id) {
      continue;
    }

    const { data: replyRow, error: replyError } = await supabase
      .from("outreach_replies")
      .upsert(
        {
          organization_id: organizationId,
          lead_id: lead.id,
          outreach_message_id: latestOutreach.id,
          provider_message_id: providerMessageId,
          body: replyBody,
          sentiment: "neutral",
          received_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,provider_message_id", ignoreDuplicates: false }
      )
      .select("id")
      .maybeSingle();
    if (replyError) console.error("[whatsapp-bridge] reply log failed", replyError.message);

    await supabase
      .from("outreach_messages")
      .update({ status: "replied", replied_at: new Date().toISOString() })
      .eq("id", latestOutreach.id)
      .in("status", ["sent", "delivered"]);


    await supabase
      .from("outreach_relances")
      .update({
        status: "cancelled",
        response_received_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("lead_id", lead.id)
      .eq("status", "planned");
    await supabase
      .from("outreach_relances")
      .update({
        status: "replied",
        response_received_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("lead_id", lead.id)
      .eq("status", "sent");

    // Log reply immediately; debounce AI so multi-bubble darija = one answer
    try {
      queueInboundDebounced({
        organizationId,
        leadId: lead.id,
        text: replyBody,
        providerMessageId,
        outreachReplyId: replyRow?.id ?? null,
        waitMs: 4500,
      });
    } catch (error) {
      console.error(
        "[whatsapp-bridge] agent queue failed",
        error instanceof Error ? error.message : error
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "fusionleap-whatsapp-replies",
    agent: "in-app",
  });
}
