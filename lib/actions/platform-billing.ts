"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canManageCompanies } from "@/lib/permissions";
import { isPlanKey, type PlanKey } from "@/lib/billing/plans";
import {
  defaultDueDate,
  defaultPeriodRange,
  nextPlatformDocNumber,
  planAmount,
} from "@/lib/billing/platform-docs";
import type {
  ActionResult,
  PlatformBillingReason,
  PlatformInvoice,
  PlatformInvoiceStatus,
  PlatformQuote,
  PlatformQuoteStatus,
} from "@/types/database";

const ORG_SELECT = "id, name, email_domain";

function revalidateBilling() {
  revalidatePath("/admin/quotes");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/dashboard");
}

async function requirePlatformAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || !canManageCompanies(profile.role)) {
    return null;
  }
  return profile;
}

async function nextNumber(kind: "quote" | "invoice"): Promise<string> {
  const admin = createAdminClient();
  const table = kind === "quote" ? "platform_quotes" : "platform_invoices";
  const { data } = await admin.from(table).select("number");
  return nextPlatformDocNumber(
    (data ?? []).map((r: { number: string }) => r.number),
    kind
  );
}

export async function listPlatformQuotes(): Promise<PlatformQuote[]> {
  if (!(await requirePlatformAdmin())) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_quotes")
    .select(`*, organization:organizations(${ORG_SELECT})`)
    .order("created_at", { ascending: false });
  return (data as PlatformQuote[]) ?? [];
}

export async function listPlatformInvoices(): Promise<PlatformInvoice[]> {
  if (!(await requirePlatformAdmin())) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_invoices")
    .select(`*, organization:organizations(${ORG_SELECT})`)
    .order("created_at", { ascending: false });
  return (data as PlatformInvoice[]) ?? [];
}

export async function getPlatformBillingStats(): Promise<{
  openQuotes: number;
  unpaidInvoices: number;
  unpaidAmount: number;
  paidAmount: number;
}> {
  if (!(await requirePlatformAdmin())) {
    return { openQuotes: 0, unpaidInvoices: 0, unpaidAmount: 0, paidAmount: 0 };
  }
  const [quotes, invoices] = await Promise.all([
    listPlatformQuotes(),
    listPlatformInvoices(),
  ]);
  const openQuotes = quotes.filter(
    (q) => q.status === "draft" || q.status === "sent"
  ).length;
  const unpaid = invoices.filter(
    (i) => i.status === "pending" || i.status === "overdue" || i.status === "draft"
  );
  const paid = invoices.filter((i) => i.status === "paid");
  return {
    openQuotes,
    unpaidInvoices: unpaid.length,
    unpaidAmount: unpaid.reduce((n, i) => n + Number(i.amount), 0),
    paidAmount: paid.reduce((n, i) => n + Number(i.amount), 0),
  };
}

export async function createPlatformQuote(input: {
  organizationId: string;
  plan: PlanKey;
  amount?: number;
  validityDays?: number;
  status?: PlatformQuoteStatus;
  notes?: string;
}): Promise<ActionResult<PlatformQuote>> {
  const profile = await requirePlatformAdmin();
  if (!profile) return { success: false, error: "Platform administrator access required" };
  if (!isPlanKey(input.plan)) return { success: false, error: "Invalid plan" };

  const admin = createAdminClient();
  const number = await nextNumber("quote");
  const amount = input.amount ?? planAmount(input.plan);

  const { data, error } = await admin
    .from("platform_quotes")
    .insert({
      number,
      organization_id: input.organizationId,
      plan: input.plan,
      amount,
      currency: "EUR",
      validity_days: input.validityDays ?? 30,
      status: input.status ?? "draft",
      notes: input.notes ?? "",
      created_by: profile.id,
    })
    .select(`*, organization:organizations(${ORG_SELECT})`)
    .single();

  if (error) return { success: false, error: error.message };
  revalidateBilling();
  return { success: true, data: data as PlatformQuote };
}

export async function updatePlatformQuote(input: {
  id: string;
  organizationId: string;
  plan: PlanKey;
  amount: number;
  validityDays: number;
  status: PlatformQuoteStatus;
  notes?: string;
}): Promise<ActionResult> {
  if (!(await requirePlatformAdmin())) {
    return { success: false, error: "Platform administrator access required" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_quotes")
    .update({
      organization_id: input.organizationId,
      plan: input.plan,
      amount: input.amount,
      validity_days: input.validityDays,
      status: input.status,
      notes: input.notes ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) return { success: false, error: error.message };
  revalidateBilling();
  return { success: true, data: undefined };
}

export async function deletePlatformQuote(id: string): Promise<ActionResult> {
  if (!(await requirePlatformAdmin())) {
    return { success: false, error: "Platform administrator access required" };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("platform_quotes").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidateBilling();
  return { success: true, data: undefined };
}

export async function createPlatformInvoice(input: {
  organizationId: string;
  plan: PlanKey;
  amount?: number;
  dueDate?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  status?: PlatformInvoiceStatus;
  quoteId?: string | null;
  billingReason?: PlatformBillingReason;
  notes?: string;
  createdBy?: string | null;
}): Promise<ActionResult<PlatformInvoice>> {
  const profile = await requirePlatformAdmin();
  if (!profile && !input.createdBy) {
    return { success: false, error: "Platform administrator access required" };
  }
  if (!isPlanKey(input.plan)) return { success: false, error: "Invalid plan" };

  const admin = createAdminClient();
  const number = await nextNumber("invoice");
  const amount = input.amount ?? planAmount(input.plan);
  const period = defaultPeriodRange(input.periodEnd);

  const { data, error } = await admin
    .from("platform_invoices")
    .insert({
      number,
      organization_id: input.organizationId,
      plan: input.plan,
      amount,
      currency: "EUR",
      due_date: input.dueDate ?? defaultDueDate(),
      period_start: input.periodStart ?? period.period_start,
      period_end: input.periodEnd ?? period.period_end,
      status: input.status ?? (amount > 0 ? "pending" : "paid"),
      quote_id: input.quoteId ?? null,
      billing_reason: input.billingReason ?? "manual",
      notes: input.notes ?? "",
      created_by: profile?.id ?? input.createdBy ?? null,
    })
    .select(`*, organization:organizations(${ORG_SELECT})`)
    .single();

  if (error) return { success: false, error: error.message };
  revalidateBilling();
  return { success: true, data: data as PlatformInvoice };
}

/** Internal helper used by subscription updates (already auth-checked). */
export async function createSubscriptionInvoice(input: {
  organizationId: string;
  plan: PlanKey;
  previousPlan?: PlanKey | null;
  periodEnd?: string | null;
  createdBy: string;
}): Promise<ActionResult<PlatformInvoice | null>> {
  if (input.plan === "free" || planAmount(input.plan) <= 0) {
    return { success: true, data: null };
  }

  const admin = createAdminClient();
  const period = defaultPeriodRange(input.periodEnd);

  // Avoid duplicate open invoice for same org + plan + period
  const { data: existing } = await admin
    .from("platform_invoices")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("plan", input.plan)
    .eq("period_end", period.period_end)
    .in("status", ["draft", "pending"])
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: true, data: null };
  }

  const reason: PlatformBillingReason =
    input.previousPlan && input.previousPlan !== input.plan
      ? "plan_change"
      : "subscription";

  return createPlatformInvoice({
    organizationId: input.organizationId,
    plan: input.plan,
    periodStart: period.period_start,
    periodEnd: period.period_end,
    billingReason: reason,
    notes:
      reason === "plan_change"
        ? `Changement de plan ${input.previousPlan} → ${input.plan}`
        : `Abonnement CRM — plan ${input.plan}`,
    createdBy: input.createdBy,
    status: "pending",
  });
}

export async function updatePlatformInvoice(input: {
  id: string;
  organizationId: string;
  plan: PlanKey;
  amount: number;
  dueDate?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  status: PlatformInvoiceStatus;
  notes?: string;
}): Promise<ActionResult> {
  if (!(await requirePlatformAdmin())) {
    return { success: false, error: "Platform administrator access required" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_invoices")
    .update({
      organization_id: input.organizationId,
      plan: input.plan,
      amount: input.amount,
      due_date: input.dueDate ?? null,
      period_start: input.periodStart ?? null,
      period_end: input.periodEnd ?? null,
      status: input.status,
      notes: input.notes ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) return { success: false, error: error.message };
  revalidateBilling();
  return { success: true, data: undefined };
}

export async function setPlatformInvoiceStatus(
  id: string,
  status: PlatformInvoiceStatus
): Promise<ActionResult> {
  if (!(await requirePlatformAdmin())) {
    return { success: false, error: "Platform administrator access required" };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_invoices")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidateBilling();
  return { success: true, data: undefined };
}

export async function deletePlatformInvoice(id: string): Promise<ActionResult> {
  if (!(await requirePlatformAdmin())) {
    return { success: false, error: "Platform administrator access required" };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("platform_invoices").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidateBilling();
  return { success: true, data: undefined };
}

export async function convertQuoteToInvoice(
  quoteId: string
): Promise<ActionResult<PlatformInvoice>> {
  const profile = await requirePlatformAdmin();
  if (!profile) return { success: false, error: "Platform administrator access required" };

  const admin = createAdminClient();
  const { data: quote, error } = await admin
    .from("platform_quotes")
    .select("*")
    .eq("id", quoteId)
    .single();

  if (error || !quote) {
    return { success: false, error: error?.message ?? "Quote not found" };
  }

  await admin
    .from("platform_quotes")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", quoteId);

  return createPlatformInvoice({
    organizationId: quote.organization_id,
    plan: quote.plan as PlanKey,
    amount: Number(quote.amount),
    quoteId: quote.id,
    billingReason: "manual",
    notes: `Issu du devis ${quote.number}`,
    status: "pending",
  });
}
