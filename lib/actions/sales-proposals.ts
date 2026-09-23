"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessLeads, isLeadership } from "@/lib/permissions";
import { nextQuoteNumber, type QuoteRecord } from "@/lib/finance/types";
import type { ActionResult } from "@/types/database";
import { quoteToRow, rowToQuote, type QuoteRow } from "@/lib/finance/db";
import { dispatchOutreachMessage } from "@/lib/outreach/dispatch";

export async function createProposalFromLead(
  leadId: string,
  amount: number,
  service: string
): Promise<ActionResult<{ quoteId: string; number: string }>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !isLeadership(profile)) {
    return { success: false, error: "Only leadership can create proposals" };
  }
  if (!canAccessLeads(profile)) return { success: false, error: "Not allowed" };

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("organization_id", profile.organization_id)
    .single();
  if (!lead) return { success: false, error: "Lead not found" };

  const { data: existingQuotes } = await supabase
    .from("quotes")
    .select("number")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })
    .limit(50);
  const number = nextQuoteNumber(
    (existingQuotes || []).map((q) => ({ number: q.number }) as QuoteRecord)
  );
  const now = new Date().toISOString();
  const quote: QuoteRecord = {
    id: crypto.randomUUID(),
    number,
    clientName: lead.company || lead.contact_name || lead.title,
    clientType: "pro",
    service: service.trim() || "Proposition commerciale",
    amount: Math.max(0, amount),
    currency: "MAD",
    validityDays: 15,
    status: "sent",
    templateId: null,
    notes: `Généré depuis le lead ${lead.title}`,
    items: [
      {
        id: crypto.randomUUID(),
        description: service.trim() || "Prestation",
        quantity: 1,
        unitPriceTtc: Math.max(0, amount),
      },
    ],
    leadId,
    createdAt: now,
    updatedAt: now,
  };

  const row = quoteToRow(quote, profile.organization_id);
  const { id: _id, ...insert } = row;
  const { data, error } = await supabase
    .from("quotes")
    .insert(insert)
    .select("*")
    .single();
  if (error || !data) return { success: false, error: error?.message || "Quote create failed" };

  await supabase
    .from("leads")
    .update({ sales_status: "proposal_sent", stage: "proposal", value: amount })
    .eq("id", leadId);

  if (lead.phone) {
    const admin = createAdminClient();
    const body = `Bonjour${lead.contact_name ? ` ${lead.contact_name}` : ""}, je vous ai préparé une proposition (${number}) pour ${quote.service}. Montant indicatif : ${amount.toLocaleString("fr-FR")} MAD. Je reste disponible pour en discuter.`;
    const { data: message } = await admin
      .from("outreach_messages")
      .insert({
        organization_id: profile.organization_id,
        lead_id: leadId,
        channel: "whatsapp",
        status: "queued",
        body,
        message_parts: [body],
        created_by: profile.id,
        approved_by: profile.id,
        approved_at: now,
        idempotency_key: `proposal-${data.id}`,
        provider: "easytouch",
      })
      .select("id")
      .single();
    if (message?.id) {
      await dispatchOutreachMessage(admin, profile.organization_id, message.id);
    }
  }

  revalidatePath("/leads");
  revalidatePath("/finance/quotes");
  return {
    success: true,
    data: { quoteId: (rowToQuote(data as QuoteRow) as QuoteRecord).id, number },
  };
}
