"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/actions/auth";
import {
  expenseToRow,
  invoiceToRow,
  quoteToRow,
  rowToExpense,
  rowToInvoice,
  rowToQuote,
  rowToTemplate,
  templateToRow,
  type ExpenseRow,
  type InvoiceRow,
  type QuoteRow,
  type TemplateRow,
} from "@/lib/finance/db";
import type {
  DocumentTemplate,
  ExpenseRecord,
  InvoiceRecord,
  QuoteRecord,
} from "@/lib/finance/types";
import type { ActionResult } from "@/types/database";

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

function revalidateFinance() {
  revalidatePath("/finance");
  revalidatePath("/finance/quotes");
  revalidatePath("/finance/invoices");
  revalidatePath("/finance/expenses");
  revalidatePath("/finance/templates");
}

// —— Templates ——

export async function getTemplates(): Promise<DocumentTemplate[]> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return [];
  const { data, error } = await supabase
    .from("document_templates")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[getTemplates]", error.message);
    return [];
  }
  return ((data as TemplateRow[]) ?? []).map(rowToTemplate);
}

export async function upsertTemplate(
  input: DocumentTemplate
): Promise<ActionResult<DocumentTemplate>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { success: false, error: "Not authenticated" };
  const supabase = await createClient();
  const orgId = profile.organization_id;
  const now = new Date().toISOString();

  if (isUuid(input.id)) {
    const row = templateToRow({ ...input, updatedAt: now }, orgId);
    const { id: _id, organization_id: _o, created_at: _c, ...update } = row;
    const { data, error } = await supabase
      .from("document_templates")
      .update(update)
      .eq("id", input.id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidateFinance();
    return { success: true, data: rowToTemplate(data as TemplateRow) };
  }

  const row = templateToRow(
    { ...input, createdAt: now, updatedAt: now },
    orgId
  );
  const { id: _ignore, ...insert } = row;
  const { data, error } = await supabase
    .from("document_templates")
    .insert(insert)
    .select("*")
    .single();
  if (error) return { success: false, error: error.message };
  revalidateFinance();
  return { success: true, data: rowToTemplate(data as TemplateRow) };
}

export async function deleteTemplate(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { success: false, error: "Not authenticated" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("document_templates")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id);
  if (error) return { success: false, error: error.message };
  revalidateFinance();
  return { success: true, data: undefined };
}

export async function bulkInsertTemplates(
  templates: DocumentTemplate[]
): Promise<ActionResult<{ count: number }>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { success: false, error: "Not authenticated" };
  if (!templates.length) return { success: true, data: { count: 0 } };
  const supabase = await createClient();
  const rows = templates.map((t) => {
    const row = templateToRow(t, profile.organization_id!);
    const { id: _id, ...rest } = row;
    return rest;
  });
  const { data, error } = await supabase
    .from("document_templates")
    .insert(rows)
    .select("id");
  if (error) return { success: false, error: error.message };
  revalidateFinance();
  return { success: true, data: { count: data?.length ?? 0 } };
}

// —— Quotes ——

export async function getQuotes(): Promise<QuoteRecord[]> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return [];
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[getQuotes]", error.message);
    return [];
  }
  return ((data as QuoteRow[]) ?? []).map(rowToQuote);
}

export async function upsertQuote(
  input: QuoteRecord
): Promise<ActionResult<QuoteRecord>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { success: false, error: "Not authenticated" };
  const supabase = await createClient();
  const orgId = profile.organization_id;
  const now = new Date().toISOString();
  const payload: QuoteRecord = {
    ...input,
    updatedAt: now,
    templateId:
      input.templateId && isUuid(input.templateId) ? input.templateId : null,
  };

  if (isUuid(input.id)) {
    const row = quoteToRow(payload, orgId);
    const { id: _id, organization_id: _o, created_at: _c, ...update } = row;
    const { data, error } = await supabase
      .from("quotes")
      .update(update)
      .eq("id", input.id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidateFinance();
    return { success: true, data: rowToQuote(data as QuoteRow) };
  }

  const row = quoteToRow(
    { ...payload, createdAt: input.createdAt || now },
    orgId
  );
  const { id: _ignore, ...insert } = row;
  const { data, error } = await supabase
    .from("quotes")
    .insert(insert)
    .select("*")
    .single();
  if (error) return { success: false, error: error.message };
  revalidateFinance();
  return { success: true, data: rowToQuote(data as QuoteRow) };
}

export async function deleteQuote(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { success: false, error: "Not authenticated" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id);
  if (error) return { success: false, error: error.message };
  revalidateFinance();
  return { success: true, data: undefined };
}

export async function bulkInsertQuotes(
  quotes: QuoteRecord[]
): Promise<ActionResult<{ count: number }>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { success: false, error: "Not authenticated" };
  if (!quotes.length) return { success: true, data: { count: 0 } };
  const supabase = await createClient();
  const rows = quotes.map((q) => {
    const row = quoteToRow(q, profile.organization_id!);
    const { id: _id, ...rest } = row;
    return rest;
  });
  const { data, error } = await supabase.from("quotes").insert(rows).select("id");
  if (error) return { success: false, error: error.message };
  revalidateFinance();
  return { success: true, data: { count: data?.length ?? 0 } };
}

// —— Invoices ——

export async function getInvoices(): Promise<InvoiceRecord[]> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return [];
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[getInvoices]", error.message);
    return [];
  }
  return ((data as InvoiceRow[]) ?? []).map(rowToInvoice);
}

export async function upsertInvoice(
  input: InvoiceRecord
): Promise<ActionResult<InvoiceRecord>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { success: false, error: "Not authenticated" };
  const supabase = await createClient();
  const orgId = profile.organization_id;
  const now = new Date().toISOString();
  const payload = { ...input, updatedAt: now };

  const safePayload: InvoiceRecord = {
    ...payload,
    quoteId: payload.quoteId && isUuid(payload.quoteId) ? payload.quoteId : null,
    templateId:
      payload.templateId && isUuid(payload.templateId)
        ? payload.templateId
        : null,
  };

  if (isUuid(input.id)) {
    const row = invoiceToRow(safePayload, orgId);
    const { id: _id, organization_id: _o, created_at: _c, ...update } = row;
    const { data, error } = await supabase
      .from("invoices")
      .update(update)
      .eq("id", input.id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidateFinance();
    return { success: true, data: rowToInvoice(data as InvoiceRow) };
  }

  const row = invoiceToRow(
    { ...safePayload, createdAt: input.createdAt || now },
    orgId
  );
  const { id: _ignore, ...insert } = row;
  const { data, error } = await supabase
    .from("invoices")
    .insert(insert)
    .select("*")
    .single();
  if (error) return { success: false, error: error.message };
  revalidateFinance();
  return { success: true, data: rowToInvoice(data as InvoiceRow) };
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { success: false, error: "Not authenticated" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id);
  if (error) return { success: false, error: error.message };
  revalidateFinance();
  return { success: true, data: undefined };
}

export async function bulkInsertInvoices(
  invoices: InvoiceRecord[]
): Promise<ActionResult<{ count: number }>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { success: false, error: "Not authenticated" };
  if (!invoices.length) return { success: true, data: { count: 0 } };
  const supabase = await createClient();
  const rows = invoices.map((inv) => {
    const row = invoiceToRow(
      {
        ...inv,
        quoteId: inv.quoteId && isUuid(inv.quoteId) ? inv.quoteId : null,
        templateId:
          inv.templateId && isUuid(inv.templateId) ? inv.templateId : null,
      },
      profile.organization_id!
    );
    const { id: _id, ...rest } = row;
    return rest;
  });
  const { data, error } = await supabase.from("invoices").insert(rows).select("id");
  if (error) return { success: false, error: error.message };
  revalidateFinance();
  return { success: true, data: { count: data?.length ?? 0 } };
}

// —— Expenses ——

export async function getExpenses(): Promise<ExpenseRecord[]> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return [];
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[getExpenses]", error.message);
    return [];
  }
  return ((data as ExpenseRow[]) ?? []).map(rowToExpense);
}

export async function upsertExpense(
  input: ExpenseRecord
): Promise<ActionResult<ExpenseRecord>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { success: false, error: "Not authenticated" };
  const supabase = await createClient();
  const orgId = profile.organization_id;
  const now = new Date().toISOString();
  const payload = { ...input, updatedAt: now };

  if (isUuid(input.id)) {
    const row = expenseToRow(payload, orgId);
    const { id: _id, organization_id: _o, created_at: _c, ...update } = row;
    const { data, error } = await supabase
      .from("expenses")
      .update(update)
      .eq("id", input.id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidateFinance();
    return { success: true, data: rowToExpense(data as ExpenseRow) };
  }

  const row = expenseToRow(
    { ...payload, createdAt: input.createdAt || now },
    orgId
  );
  const { id: _ignore, ...insert } = row;
  const { data, error } = await supabase
    .from("expenses")
    .insert(insert)
    .select("*")
    .single();
  if (error) return { success: false, error: error.message };
  revalidateFinance();
  return { success: true, data: rowToExpense(data as ExpenseRow) };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { success: false, error: "Not authenticated" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id);
  if (error) return { success: false, error: error.message };
  revalidateFinance();
  return { success: true, data: undefined };
}

export async function bulkInsertExpenses(
  expenses: ExpenseRecord[]
): Promise<ActionResult<{ count: number }>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { success: false, error: "Not authenticated" };
  if (!expenses.length) return { success: true, data: { count: 0 } };
  const supabase = await createClient();
  const rows = expenses.map((e) => {
    const row = expenseToRow(e, profile.organization_id!);
    const { id: _id, ...rest } = row;
    return rest;
  });
  const { data, error } = await supabase.from("expenses").insert(rows).select("id");
  if (error) return { success: false, error: error.message };
  revalidateFinance();
  return { success: true, data: { count: data?.length ?? 0 } };
}
