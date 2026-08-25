"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { canAccessLeads, isLeadership } from "@/lib/permissions";
import { dispatchOutreachMessage } from "@/lib/outreach/dispatch";
import type { ActionResult, OutreachMessage } from "@/types/database";

const idSchema = z.string().uuid();

export async function getOutreachMessages(limit = 100): Promise<OutreachMessage[]> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !canAccessLeads(profile)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("outreach_messages")
    .select("*, lead:leads(id, title, company, contact_name, phone, email, sales_project)")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));
  return (data as OutreachMessage[]) ?? [];
}

export async function getOutreachRelances() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !canAccessLeads(profile)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("outreach_relances")
    .select("id,lead_id,sequence,status,scheduled_for,sent_at,lost_at,lead:leads(title,contact_name,sales_project)")
    .eq("organization_id", profile.organization_id)
    .order("scheduled_for", { ascending: true })
    .limit(100);
  return data ?? [];
}

export async function approveOutreachMessage(id: string): Promise<ActionResult<OutreachMessage>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { success: false, error: "Invalid message id" };
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !isLeadership(profile)) {
    return { success: false, error: "Only leadership can approve outreach" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outreach_messages")
    .update({
      status: "approved",
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", parsed.data)
    .eq("organization_id", profile.organization_id)
    .eq("status", "draft")
    .select()
    .maybeSingle();
  if (error || !data) return { success: false, error: error?.message || "Draft not found" };
  revalidatePath("/leads");
  return { success: true, data: data as OutreachMessage };
}

export async function sendOutreachMessage(id: string): Promise<ActionResult<{ provider_message_id: string | null }>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { success: false, error: "Invalid message id" };
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !isLeadership(profile)) {
    return { success: false, error: "Only leadership can send outreach" };
  }
  const supabase = await createClient();
  const { data: message } = await supabase
    .from("outreach_messages")
    .select("status, lead_id, lead:leads(id, contact_permission)")
    .eq("id", parsed.data)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();
  const lead = Array.isArray(message?.lead) ? message.lead[0] : message?.lead;
  if (message && ["approved", "queued", "failed"].includes(message.status) && lead?.contact_permission === "unknown") {
    const { error: permissionError } = await supabase
      .from("leads")
      .update({ contact_permission: "legitimate_interest" })
      .eq("id", message.lead_id)
      .eq("organization_id", profile.organization_id)
      .eq("contact_permission", "unknown");
    if (permissionError) return { success: false, error: permissionError.message };
    await supabase.from("activities").insert({
      organization_id: profile.organization_id,
      type: "lead_updated",
      entity_type: "lead",
      entity_id: message.lead_id,
      message: "Leadership verified legitimate interest before outreach",
      user_id: profile.id,
    });
  }
  const result = await dispatchOutreachMessage(supabase, profile.organization_id, parsed.data);
  revalidatePath("/leads");
  if (!result.success) return result;
  return { success: true, data: { provider_message_id: result.providerMessageId } };
}

export async function cancelOutreachMessage(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { success: false, error: "Invalid message id" };
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !canAccessLeads(profile)) {
    return { success: false, error: "Outreach access is not allowed" };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("outreach_messages")
    .update({ status: "cancelled" })
    .eq("id", parsed.data)
    .eq("organization_id", profile.organization_id)
    .in("status", ["draft", "approved", "queued", "failed"]);
  if (error) return { success: false, error: error.message };
  revalidatePath("/leads");
  return { success: true, data: undefined };
}
