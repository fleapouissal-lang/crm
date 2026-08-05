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
import {
  createEmptyLineItem,
  isImportedFinanceDoc,
  nextInvoiceNumber,
  nextQuoteNumber,
} from "@/lib/finance/types";
import type { ActionResult } from "@/types/database";

const FINANCE_IMPORT_BUCKET = "finance-imports";
const FINANCE_IMPORT_MAX_BYTES = 10 * 1024 * 1024;
const FINANCE_IMPORT_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function stripImportColumns<T extends Record<string, unknown>>(row: T): Partial<T> {
  const {
    is_imported: _i,
    import_file_name: _n,
    import_file_mime: _m,
    import_storage_path: _p,
    ...rest
  } = row as T & {
    is_imported?: unknown;
    import_file_name?: unknown;
    import_file_mime?: unknown;
    import_storage_path?: unknown;
  };
  return rest as Partial<T>;
}

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

export async function getQuoteById(id: string): Promise<QuoteRecord | null> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToQuote(data as QuoteRow);
}

export async function getInvoiceById(id: string): Promise<InvoiceRecord | null> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToInvoice(data as InvoiceRow);
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
    const existing = await getQuoteById(input.id);
    const locked: QuoteRecord =
      existing && isImportedFinanceDoc(existing)
        ? {
            ...existing,
            status: input.status,
            updatedAt: now,
          }
        : payload;

    const row = quoteToRow(locked, orgId);
    const { id: _id, organization_id: _o, created_at: _c, ...update } = row;
    let { data, error } = await supabase
      .from("quotes")
      .update(update)
      .eq("id", input.id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error && /client_details|is_imported|import_/.test(error.message)) {
      const legacy = stripImportColumns(update as Record<string, unknown>);
      const { client_details: _cd, ...withoutDetails } = legacy as Record<
        string,
        unknown
      > & { client_details?: unknown };
      ({ data, error } = await supabase
        .from("quotes")
        .update(
          error.message.includes("client_details") ? withoutDetails : legacy
        )
        .eq("id", input.id)
        .eq("organization_id", orgId)
        .select("*")
        .single());
    }
    if (error) return { success: false, error: error.message };
    revalidateFinance();
    return { success: true, data: rowToQuote(data as QuoteRow) };
  }

  const row = quoteToRow(
    { ...payload, createdAt: input.createdAt || now },
    orgId
  );
  const { id: _ignore, ...insert } = row;
  let { data, error } = await supabase
    .from("quotes")
    .insert(insert)
    .select("*")
    .single();
  if (error && error.message.includes("client_details")) {
    const { client_details: _cd, ...legacy } = insert;
    ({ data, error } = await supabase
      .from("quotes")
      .insert(legacy)
      .select("*")
      .single());
  }
  if (error) return { success: false, error: error.message };
  revalidateFinance();
  return { success: true, data: rowToQuote(data as QuoteRow) };
}

export async function deleteQuote(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { success: false, error: "Not authenticated" };
  const supabase = await createClient();
  const existing = await getQuoteById(id);
  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id);
  if (error) return { success: false, error: error.message };
  if (existing?.importStoragePath) {
    await supabase.storage
      .from(FINANCE_IMPORT_BUCKET)
      .remove([existing.importStoragePath]);
  }
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
    const existing = await getInvoiceById(input.id);
    const locked: InvoiceRecord =
      existing && isImportedFinanceDoc(existing)
        ? {
            ...existing,
            status: input.status,
            updatedAt: now,
          }
        : safePayload;

    const row = invoiceToRow(locked, orgId);
    const { id: _id, organization_id: _o, created_at: _c, ...update } = row;
    let { data, error } = await supabase
      .from("invoices")
      .update(update)
      .eq("id", input.id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error && /client_details|is_imported|import_/.test(error.message)) {
      const legacy = stripImportColumns(update as Record<string, unknown>);
      const { client_details: _cd, ...withoutDetails } = legacy as Record<
        string,
        unknown
      > & { client_details?: unknown };
      ({ data, error } = await supabase
        .from("invoices")
        .update(
          error.message.includes("client_details") ? withoutDetails : legacy
        )
        .eq("id", input.id)
        .eq("organization_id", orgId)
        .select("*")
        .single());
    }
    if (error) return { success: false, error: error.message };
    revalidateFinance();
    return { success: true, data: rowToInvoice(data as InvoiceRow) };
  }

  const row = invoiceToRow(
    { ...safePayload, createdAt: input.createdAt || now },
    orgId
  );
  const { id: _ignore, ...insert } = row;
  let { data, error } = await supabase
    .from("invoices")
    .insert(insert)
    .select("*")
    .single();
  if (error && error.message.includes("client_details")) {
    const { client_details: _cd, ...legacy } = insert;
    ({ data, error } = await supabase
      .from("invoices")
      .insert(legacy)
      .select("*")
      .single());
  }
  if (error) return { success: false, error: error.message };
  revalidateFinance();
  return { success: true, data: rowToInvoice(data as InvoiceRow) };
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { success: false, error: "Not authenticated" };
  const supabase = await createClient();
  const existing = await getInvoiceById(id);
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id);
  if (error) return { success: false, error: error.message };
  if (existing?.importStoragePath) {
    await supabase.storage
      .from(FINANCE_IMPORT_BUCKET)
      .remove([existing.importStoragePath]);
  }
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

// —— Imports (external files, content locked) ——

function safeImportFileName(name: string): string {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "document.pdf";
}

function labelFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").trim() || name;
}

export async function importFinanceDocuments(
  kind: "quote" | "invoice",
  formData: FormData
): Promise<ActionResult<{ count: number; ids: string[] }>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }
  const orgId = profile.organization_id;
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (!files.length) {
    return { success: false, error: "No files" };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const existingQuotes =
    kind === "quote" ? await getQuotes() : ([] as QuoteRecord[]);
  const existingInvoices =
    kind === "invoice" ? await getInvoices() : ([] as InvoiceRecord[]);

  const createdIds: string[] = [];
  let quotePool = [...existingQuotes];
  let invoicePool = [...existingInvoices];

  for (const file of files) {
    if (file.size > FINANCE_IMPORT_MAX_BYTES) {
      return {
        success: false,
        error: `File too large (max 10 MB): ${file.name}`,
      };
    }
    const mime = (file.type || "application/pdf").toLowerCase();
    if (!FINANCE_IMPORT_MIME.has(mime)) {
      return {
        success: false,
        error: `Unsupported file type: ${file.name}`,
      };
    }

    const docId = crypto.randomUUID();
    const safeName = safeImportFileName(file.name);
    const storagePath = `${orgId}/${kind}/${docId}-${safeName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(FINANCE_IMPORT_BUCKET)
      .upload(storagePath, bytes, {
        contentType: mime,
        upsert: false,
      });

    if (uploadError) {
      console.error("[finance-import] upload", uploadError);
      return { success: false, error: uploadError.message };
    }

    const label = labelFromFileName(safeName);

    if (kind === "quote") {
      const record: QuoteRecord = {
        id: docId,
        number: nextQuoteNumber(quotePool),
        clientName: label,
        clientType: "pro",
        clientDetails: {},
        service: label,
        amount: 0,
        currency: "MAD",
        validityDays: 30,
        status: "draft",
        templateId: null,
        notes: "",
        items: [
          createEmptyLineItem({
            description: label,
            quantity: 1,
            unitPriceTtc: 0,
          }),
        ],
        isImported: true,
        importFileName: safeName,
        importFileMime: mime,
        importStoragePath: storagePath,
        createdAt: now,
        updatedAt: now,
      };
      const row = quoteToRow(record, orgId);
      const { id: _ignore, ...insert } = row;
      const { data, error } = await supabase
        .from("quotes")
        .insert(insert)
        .select("*")
        .single();
      if (error) {
        await supabase.storage.from(FINANCE_IMPORT_BUCKET).remove([storagePath]);
        return { success: false, error: error.message };
      }
      const saved = rowToQuote(data as QuoteRow);
      quotePool = [saved, ...quotePool];
      createdIds.push(saved.id);
    } else {
      const due = new Date();
      due.setDate(due.getDate() + 30);
      const record: InvoiceRecord = {
        id: docId,
        number: nextInvoiceNumber(invoicePool),
        clientName: label,
        clientType: "pro",
        clientDetails: {},
        amount: 0,
        currency: "MAD",
        dueDate: due.toISOString().slice(0, 10),
        status: "pending",
        templateId: null,
        quoteId: null,
        notes: "",
        items: [
          createEmptyLineItem({
            description: label,
            quantity: 1,
            unitPriceTtc: 0,
          }),
        ],
        isImported: true,
        importFileName: safeName,
        importFileMime: mime,
        importStoragePath: storagePath,
        createdAt: now,
        updatedAt: now,
      };
      const row = invoiceToRow(record, orgId);
      const { id: _ignore, ...insert } = row;
      const { data, error } = await supabase
        .from("invoices")
        .insert(insert)
        .select("*")
        .single();
      if (error) {
        await supabase.storage.from(FINANCE_IMPORT_BUCKET).remove([storagePath]);
        return { success: false, error: error.message };
      }
      const saved = rowToInvoice(data as InvoiceRow);
      invoicePool = [saved, ...invoicePool];
      createdIds.push(saved.id);
    }
  }

  revalidateFinance();
  return { success: true, data: { count: createdIds.length, ids: createdIds } };
}

export async function getFinanceImportSignedUrl(
  kind: "quote" | "invoice",
  id: string
): Promise<ActionResult<string>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }

  const doc =
    kind === "quote" ? await getQuoteById(id) : await getInvoiceById(id);
  if (!doc?.importStoragePath) {
    return { success: false, error: "No imported file" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(FINANCE_IMPORT_BUCKET)
    .createSignedUrl(doc.importStoragePath, 60 * 60);

  if (error || !data?.signedUrl) {
    return { success: false, error: error?.message ?? "Signed URL failed" };
  }
  return { success: true, data: data.signedUrl };
}
