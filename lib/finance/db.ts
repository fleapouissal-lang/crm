import type {
  DocumentTemplate,
  ExpenseRecord,
  FinanceLineItem,
  InvoiceRecord,
  QuoteRecord,
} from "@/lib/finance/types";
import { normalizeInvoice, normalizeQuote } from "@/lib/finance/types";

export type TemplateRow = {
  id: string;
  organization_id: string;
  name: string;
  kind: string;
  description: string;
  content: string;
  footer_note: string;
  created_at: string;
  updated_at: string;
};

export type QuoteRow = {
  id: string;
  organization_id: string;
  number: string;
  client_id: string | null;
  client_name: string;
  client_type: string;
  service: string;
  amount: number | string;
  currency: string;
  validity_days: number;
  status: string;
  template_id: string | null;
  notes: string;
  items: FinanceLineItem[] | string;
  created_at: string;
  updated_at: string;
};

export type InvoiceRow = {
  id: string;
  organization_id: string;
  number: string;
  client_id: string | null;
  client_name: string;
  client_type: string;
  amount: number | string;
  currency: string;
  due_date: string | null;
  status: string;
  template_id: string | null;
  quote_id: string | null;
  notes: string;
  items: FinanceLineItem[] | string;
  created_at: string;
  updated_at: string;
};

export type ExpenseRow = {
  id: string;
  organization_id: string;
  number: string;
  title: string;
  category: string;
  vendor: string;
  amount: number | string;
  currency: string;
  expense_date: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

function parseItems(raw: FinanceLineItem[] | string): FinanceLineItem[] {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw) as FinanceLineItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rowToTemplate(row: TemplateRow): DocumentTemplate {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as DocumentTemplate["kind"],
    description: row.description ?? "",
    content: row.content ?? "",
    footerNote: row.footer_note ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function templateToRow(
  t: DocumentTemplate,
  organizationId: string
): Omit<TemplateRow, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
} {
  return {
    id: t.id,
    organization_id: organizationId,
    name: t.name,
    kind: t.kind,
    description: t.description,
    content: t.content,
    footer_note: t.footerNote,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

export function rowToQuote(row: QuoteRow): QuoteRecord {
  return normalizeQuote({
    id: row.id,
    number: row.number,
    clientName: row.client_name ?? "",
    clientType: (row.client_type as QuoteRecord["clientType"]) ?? "pro",
    service: row.service ?? "",
    amount: Number(row.amount) || 0,
    currency: row.currency ?? "MAD",
    validityDays: Number(row.validity_days) || 30,
    status: row.status as QuoteRecord["status"],
    templateId: row.template_id,
    notes: row.notes ?? "",
    items: parseItems(row.items),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function quoteToRow(
  q: QuoteRecord,
  organizationId: string,
  clientId: string | null = null
) {
  const normalized = normalizeQuote(q);
  return {
    id: normalized.id,
    organization_id: organizationId,
    number: normalized.number,
    client_id: clientId,
    client_name: normalized.clientName,
    client_type: normalized.clientType,
    service: normalized.service,
    amount: normalized.amount,
    currency: normalized.currency,
    validity_days: normalized.validityDays,
    status: normalized.status,
    template_id: normalized.templateId,
    notes: normalized.notes,
    items: normalized.items,
    created_at: normalized.createdAt,
    updated_at: normalized.updatedAt,
  };
}

export function rowToInvoice(row: InvoiceRow): InvoiceRecord {
  return normalizeInvoice({
    id: row.id,
    number: row.number,
    clientName: row.client_name ?? "",
    clientType: (row.client_type as InvoiceRecord["clientType"]) ?? "pro",
    amount: Number(row.amount) || 0,
    currency: row.currency ?? "MAD",
    dueDate: row.due_date ?? "",
    status: row.status as InvoiceRecord["status"],
    templateId: row.template_id,
    quoteId: row.quote_id,
    notes: row.notes ?? "",
    items: parseItems(row.items),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function invoiceToRow(
  inv: InvoiceRecord,
  organizationId: string,
  clientId: string | null = null
) {
  const normalized = normalizeInvoice(inv);
  return {
    id: normalized.id,
    organization_id: organizationId,
    number: normalized.number,
    client_id: clientId,
    client_name: normalized.clientName,
    client_type: normalized.clientType,
    amount: normalized.amount,
    currency: normalized.currency,
    due_date: normalized.dueDate || null,
    status: normalized.status,
    template_id: normalized.templateId,
    quote_id: normalized.quoteId,
    notes: normalized.notes,
    items: normalized.items,
    created_at: normalized.createdAt,
    updated_at: normalized.updatedAt,
  };
}

export function rowToExpense(row: ExpenseRow): ExpenseRecord {
  return {
    id: row.id,
    number: row.number,
    title: row.title ?? "",
    category: row.category as ExpenseRecord["category"],
    vendor: row.vendor ?? "",
    amount: Number(row.amount) || 0,
    currency: row.currency ?? "MAD",
    date: row.expense_date,
    status: row.status as ExpenseRecord["status"],
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function expenseToRow(e: ExpenseRecord, organizationId: string) {
  return {
    id: e.id,
    organization_id: organizationId,
    number: e.number,
    title: e.title,
    category: e.category,
    vendor: e.vendor,
    amount: e.amount,
    currency: e.currency,
    expense_date: e.date,
    status: e.status,
    notes: e.notes,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}
