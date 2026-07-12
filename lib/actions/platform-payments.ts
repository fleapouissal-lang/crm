"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canManageCompanies } from "@/lib/permissions";
import {
  isCardBrand,
  isPaymentMethod,
  isPaymentStatus,
  maskLast4,
  nextPaymentNumber,
  type CardBrand,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/billing/payments";
import type { ActionResult, PlatformPayment } from "@/types/database";

const ORG_SELECT = "id, name, email_domain, logo_url";
const INVOICE_SELECT = "id, number, status, plan";

function revalidatePayments() {
  revalidatePath("/admin/payments");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/dashboard");
}

async function requirePlatformAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || !canManageCompanies(profile.role)) return null;
  return profile;
}

async function nextPayNumber(): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("platform_payments").select("number");
  return nextPaymentNumber((data ?? []).map((r: { number: string }) => r.number));
}

export async function listPlatformPayments(): Promise<PlatformPayment[]> {
  if (!(await requirePlatformAdmin())) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_payments")
    .select(
      `*, organization:organizations(${ORG_SELECT}), invoice:platform_invoices(${INVOICE_SELECT})`
    )
    .order("created_at", { ascending: false });
  return (data as PlatformPayment[]) ?? [];
}

export async function recordPlatformPayment(input: {
  organizationId: string;
  invoiceId?: string | null;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  cardBrand?: CardBrand | null;
  cardLast4?: string | null;
  cardHolder?: string | null;
  reference?: string;
  notes?: string;
  paidAt?: string | null;
}): Promise<ActionResult<PlatformPayment>> {
  const profile = await requirePlatformAdmin();
  if (!profile) return { success: false, error: "Platform administrator access required" };

  if (!input.organizationId || !Number.isFinite(input.amount) || input.amount < 0) {
    return { success: false, error: "Invalid payment amount" };
  }
  if (!isPaymentStatus(input.status) || !isPaymentMethod(input.method)) {
    return { success: false, error: "Invalid payment method or status" };
  }
  if (input.method === "card" && input.cardBrand && !isCardBrand(input.cardBrand)) {
    return { success: false, error: "Invalid card brand" };
  }

  const admin = createAdminClient();
  const number = await nextPayNumber();
  const last4 = input.cardLast4 ? maskLast4(input.cardLast4) : null;
  const paidAt =
    input.status === "succeeded"
      ? input.paidAt ?? new Date().toISOString()
      : input.paidAt ?? null;

  const { data, error } = await admin
    .from("platform_payments")
    .insert({
      number,
      organization_id: input.organizationId,
      invoice_id: input.invoiceId ?? null,
      amount: input.amount,
      currency: "EUR",
      status: input.status,
      method: input.method,
      card_brand: input.method === "card" ? input.cardBrand ?? null : null,
      card_last4: input.method === "card" ? last4 : null,
      card_holder: input.method === "card" ? input.cardHolder?.trim() || null : null,
      paid_at: paidAt,
      reference: input.reference?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
      created_by: profile.id,
    })
    .select(
      `*, organization:organizations(${ORG_SELECT}), invoice:platform_invoices(${INVOICE_SELECT})`
    )
    .single();

  if (error) return { success: false, error: error.message };

  // Business logic: sync invoice + subscription state
  if (input.status === "succeeded") {
    if (input.invoiceId) {
      await admin
        .from("platform_invoices")
        .update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("id", input.invoiceId);
    }
    await admin
      .from("organizations")
      .update({ subscription_status: "active" })
      .eq("id", input.organizationId)
      .in("subscription_status", ["trialing", "past_due"]);
  } else if (input.status === "failed") {
    await admin
      .from("organizations")
      .update({ subscription_status: "past_due" })
      .eq("id", input.organizationId)
      .neq("plan", "free");
    if (input.invoiceId) {
      await admin
        .from("platform_invoices")
        .update({ status: "overdue", updated_at: new Date().toISOString() })
        .eq("id", input.invoiceId)
        .in("status", ["draft", "pending"]);
    }
  }

  revalidatePayments();
  return { success: true, data: data as PlatformPayment };
}

export async function updatePlatformPaymentStatus(
  id: string,
  status: PaymentStatus
): Promise<ActionResult> {
  const profile = await requirePlatformAdmin();
  if (!profile) return { success: false, error: "Platform administrator access required" };
  if (!isPaymentStatus(status)) return { success: false, error: "Invalid status" };

  const admin = createAdminClient();
  const { data: payment, error: fetchError } = await admin
    .from("platform_payments")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !payment) {
    return { success: false, error: fetchError?.message ?? "Payment not found" };
  }

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "succeeded" && !payment.paid_at) {
    patch.paid_at = new Date().toISOString();
  }

  const { error } = await admin.from("platform_payments").update(patch).eq("id", id);
  if (error) return { success: false, error: error.message };

  if (status === "succeeded") {
    if (payment.invoice_id) {
      await admin
        .from("platform_invoices")
        .update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("id", payment.invoice_id);
    }
    await admin
      .from("organizations")
      .update({ subscription_status: "active" })
      .eq("id", payment.organization_id)
      .in("subscription_status", ["trialing", "past_due"]);
  } else if (status === "failed") {
    await admin
      .from("organizations")
      .update({ subscription_status: "past_due" })
      .eq("id", payment.organization_id)
      .neq("plan", "free");
  } else if (status === "refunded" && payment.invoice_id) {
    await admin
      .from("platform_invoices")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", payment.invoice_id);
  }

  revalidatePayments();
  return { success: true, data: undefined };
}

export async function deletePlatformPayment(id: string): Promise<ActionResult> {
  if (!(await requirePlatformAdmin())) {
    return { success: false, error: "Platform administrator access required" };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("platform_payments").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePayments();
  return { success: true, data: undefined };
}
