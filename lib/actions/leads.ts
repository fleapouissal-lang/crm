"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canAccessLeads, canDeleteLead } from "@/lib/permissions";
import { leadSchema } from "@/lib/validations/lead";
import type {
  ActionResult,
  ActivityType,
  Lead,
  LeadStage,
} from "@/types/database";
import { LEAD_STAGE_LABELS } from "@/types/database";

async function logActivity(
  orgId: string,
  userId: string,
  type: ActivityType,
  entityId: string,
  message: string
) {
  const supabase = await createClient();
  await supabase.from("activities").insert({
    organization_id: orgId,
    type,
    entity_type: "lead",
    entity_id: entityId,
    message,
    user_id: userId,
  });
}

export async function getLeads(filters?: {
  q?: string;
  stage?: string;
}): Promise<Lead[]> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return [];
  if (!canAccessLeads(profile)) return [];

  let query = supabase
    .from("leads")
    .select("*, assigned_profile:profiles!leads_assigned_to_fkey(*)")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  if (filters?.stage && filters.stage !== "all") {
    query = query.eq("stage", filters.stage);
  }

  if (filters?.q) {
    const q = `%${filters.q}%`;
    query = query.or(
      `title.ilike.${q},company.ilike.${q},contact_name.ilike.${q},email.ilike.${q}`
    );
  }

  const { data } = await query;
  return (data as Lead[]) ?? [];
}

export async function getLead(id: string): Promise<Lead | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("*, assigned_profile:profiles!leads_assigned_to_fkey(*)")
    .eq("id", id)
    .single();
  return data as Lead | null;
}

export async function createLead(
  input: unknown
): Promise<ActionResult<Lead>> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }

  const values = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .insert({
      organization_id: profile.organization_id,
      title: values.title,
      company: values.company || null,
      contact_name: values.contact_name || null,
      email: values.email || null,
      phone: values.phone || null,
      value: values.value,
      stage: values.stage as LeadStage,
      notes: values.notes || null,
      assigned_to: values.assigned_to || null,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await logActivity(
    profile.organization_id,
    profile.id,
    "lead_created",
    data.id,
    `Created lead "${data.title}"`
  );

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true, data: data as Lead };
}

export async function updateLead(
  id: string,
  input: unknown
): Promise<ActionResult<Lead>> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }

  const values = parsed.data;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("leads")
    .select("stage, title")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("leads")
    .update({
      title: values.title,
      company: values.company || null,
      contact_name: values.contact_name || null,
      email: values.email || null,
      phone: values.phone || null,
      value: values.value,
      stage: values.stage as LeadStage,
      notes: values.notes || null,
      assigned_to: values.assigned_to || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  if (existing && existing.stage !== values.stage) {
    await logActivity(
      profile.organization_id,
      profile.id,
      "lead_stage_changed",
      id,
      `Moved "${data.title}" to ${LEAD_STAGE_LABELS[values.stage as LeadStage]}`
    );
  } else {
    await logActivity(
      profile.organization_id,
      profile.id,
      "lead_updated",
      id,
      `Updated lead "${data.title}"`
    );
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/dashboard");
  return { success: true, data: data as Lead };
}

export async function updateLeadStage(
  id: string,
  stage: LeadStage
): Promise<ActionResult<Lead>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ stage })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await logActivity(
    profile.organization_id,
    profile.id,
    "lead_stage_changed",
    id,
    `Moved "${data.title}" to ${LEAD_STAGE_LABELS[stage]}`
  );

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true, data: data as Lead };
}

export async function deleteLead(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }

  if (!canDeleteLead(profile.role)) {
    return { success: false, error: "You don't have permission to delete leads" };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("leads")
    .select("title")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  if (existing) {
    await logActivity(
      profile.organization_id,
      profile.id,
      "lead_deleted",
      id,
      `Deleted lead "${existing.title}"`
    );
  }

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}
