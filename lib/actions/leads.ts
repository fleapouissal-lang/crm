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
  LeadContactMethod,
  LeadStage,
} from "@/types/database";
import { LEAD_STAGE_LABELS } from "@/types/database";

function normalizePhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits || null;
}

function normalizedLeadFields(values: {
  phone?: string | null;
  email?: string | null;
}) {
  return {
    phone_normalized: normalizePhone(values.phone),
    email_normalized: values.email?.trim().toLowerCase() || null,
  };
}

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
    .select("*, assigned_profile:profiles!leads_assigned_to_fkey(*), relances:outreach_relances(sequence,status,scheduled_for,sent_at)")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  if (filters?.stage && filters.stage !== "all") {
    query = query.or(`sales_status.eq.${filters.stage},stage.eq.${filters.stage}`);
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
    .select(
      "*, assigned_profile:profiles!leads_assigned_to_fkey(*), client:clients!client_id(id, name, status_key, location, engagement)"
    )
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
  if (values.stage === "contacted" && !values.last_contact_method) {
    return { success: false, error: "Select how the client was contacted" };
  }
  const supabase = await createClient();
  const website = values.website?.trim()
    ? /^https?:\/\//i.test(values.website.trim())
      ? values.website.trim()
      : `https://${values.website.trim()}`
    : null;
  const sourceUrl = values.source_url?.trim()
    ? /^https?:\/\//i.test(values.source_url.trim())
      ? values.source_url.trim()
      : `https://${values.source_url.trim()}`
    : null;

  const { data, error } = await supabase
    .from("leads")
    .insert({
      organization_id: profile.organization_id,
      title: values.title,
      company: values.company || null,
      contact_name: values.contact_name || null,
      email: values.email || null,
      phone: values.phone || null,
      website,
      city: values.city || null,
      country: values.country || null,
      source: values.source || null,
      source_url: sourceUrl,
      sales_project: values.sales_project,
      ai_score: values.ai_score ?? null,
      ai_summary: values.ai_summary || null,
      contact_permission: values.contact_permission,
      last_contact_method: values.last_contact_method ?? null,
      next_follow_up_at: values.next_follow_up_at || null,
      ...normalizedLeadFields(values),
      value: values.value,
      stage: values.stage as LeadStage,
      sales_status: "new",
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
  if (values.stage === "contacted" && !values.last_contact_method) {
    return { success: false, error: "Select how the client was contacted" };
  }
  const supabase = await createClient();
  const website = values.website?.trim()
    ? /^https?:\/\//i.test(values.website.trim())
      ? values.website.trim()
      : `https://${values.website.trim()}`
    : null;

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
      website,
      city: values.city || null,
      country: values.country || null,
      source: values.source || null,
      sales_project: values.sales_project,
      last_contact_method: values.last_contact_method ?? null,
      ...normalizedLeadFields(values),
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
  stage: LeadStage,
  contactMethod?: LeadContactMethod
): Promise<ActionResult<Lead>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();
  if (stage === "contacted" && !contactMethod) {
    return { success: false, error: "Select how the client was contacted" };
  }
  const contactedAt = stage === "contacted" ? new Date().toISOString() : undefined;
  const salesStatus =
    stage === "proposal"
      ? "proposal_sent"
      : stage === "negotiation"
        ? "discussion"
        : stage;
  const { data, error } = await supabase
    .from("leads")
    .update({
      stage,
      sales_status: salesStatus,
      ...(contactMethod ? { last_contact_method: contactMethod } : {}),
      ...(contactedAt ? { last_contacted_at: contactedAt } : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await logActivity(
    profile.organization_id,
    profile.id,
    "lead_stage_changed",
    id,
    `Moved "${data.title}" to ${LEAD_STAGE_LABELS[stage]}${contactMethod ? ` via ${contactMethod}` : ""}`
  );

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true, data: data as Lead };
}

export async function updateLeadSalesStatus(
  id: string,
  salesStatus: import("@/types/database").SalesStatus,
  contactMethod?: LeadContactMethod
): Promise<ActionResult<Lead>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }
  const supabase = await createClient();
  if (
    (salesStatus === "contacted" || salesStatus === "message_sent") &&
    !contactMethod
  ) {
    // contact method optional for AI-driven statuses
  }
  const { data, error } = await supabase
    .from("leads")
    .update({
      sales_status: salesStatus,
      ...(contactMethod ? { last_contact_method: contactMethod } : {}),
      ...(salesStatus === "contacted" || salesStatus === "message_sent"
        ? { last_contacted_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  revalidatePath("/leads");
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

function normalizeWebsiteInput(raw: string | null | undefined): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** CSV headers: title,company,contact_name,phone,email,website,city,country,source,notes,sales_project */
export async function importLeadsFromCsv(
  csvText: string,
  defaultSalesProject = "Fusion Leap"
): Promise<ActionResult<{ imported: number; skipped: number; errors: string[] }>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !canAccessLeads(profile)) {
    return { success: false, error: "Not allowed" };
  }

  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { success: false, error: "CSV vide — besoin d’une ligne d’en-tête + au moins 1 lead" };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = headers.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };

  const col = {
    title: idx(["title", "titre", "nom", "name"]),
    company: idx(["company", "entreprise", "societe", "société"]),
    contact: idx(["contact_name", "contact", "prenom", "name_contact"]),
    phone: idx(["phone", "telephone", "téléphone", "whatsapp", "tel"]),
    email: idx(["email", "mail"]),
    website: idx(["website", "site", "url"]),
    city: idx(["city", "ville"]),
    country: idx(["country", "pays"]),
    source: idx(["source"]),
    notes: idx(["notes", "note", "commentaire"]),
    project: idx(["sales_project", "projet", "project"]),
  };

  if (col.title < 0 && col.company < 0 && col.phone < 0) {
    return {
      success: false,
      error:
        "En-têtes CSV requis: title/company/phone (ou titre/entreprise/telephone)",
    };
  }

  const supabase = await createClient();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const rows: Array<Record<string, unknown>> = [];

  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLine(lines[r]);
    const get = (i: number) => (i >= 0 ? cells[i]?.trim() || "" : "");
    const company = get(col.company);
    const contact = get(col.contact);
    const phone = get(col.phone);
    const title = get(col.title) || company || contact || phone;
    if (!title) {
      skipped += 1;
      continue;
    }
    if (!phone && !get(col.email)) {
      skipped += 1;
      errors.push(`Ligne ${r + 1}: pas de téléphone ni email — ignorée`);
      continue;
    }

    const website = normalizeWebsiteInput(get(col.website));
    rows.push({
      organization_id: profile.organization_id,
      title: title.slice(0, 200),
      company: company || null,
      contact_name: contact || null,
      email: get(col.email) || null,
      phone: phone || null,
      website,
      city: get(col.city) || null,
      country: get(col.country) || "Maroc",
      source: get(col.source) || "csv_import",
      sales_project: get(col.project) || defaultSalesProject,
      contact_permission: "legitimate_interest",
      value: 0,
      stage: "new" as LeadStage,
      sales_status: "new",
      notes: get(col.notes) || null,
      created_by: profile.id,
      ...normalizedLeadFields({ phone, email: get(col.email) }),
    });
  }

  if (!rows.length) {
    return {
      success: true,
      data: { imported: 0, skipped, errors: errors.slice(0, 20) },
    };
  }

  const chunkSize = 50;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error, data } = await supabase.from("leads").insert(chunk).select("id");
    if (error) {
      errors.push(error.message);
      skipped += chunk.length;
    } else {
      imported += data?.length || chunk.length;
    }
  }

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return {
    success: true,
    data: { imported, skipped, errors: errors.slice(0, 20) },
  };
}
