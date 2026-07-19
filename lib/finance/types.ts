export type TemplateKind = "quote" | "invoice";

export type QuoteStatus = "draft" | "sent" | "accepted" | "expired" | "refused";

export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue";

export type ExpenseStatus = "draft" | "pending" | "paid" | "cancelled";

export type ExpenseCategory =
  | "rent"
  | "salaries"
  | "software"
  | "marketing"
  | "travel"
  | "supplies"
  | "utilities"
  | "other";

export type ClientType = "particulier" | "pro";

export interface DocumentTemplate {
  id: string;
  name: string;
  kind: TemplateKind;
  description: string;
  content: string;
  footerNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceTtc: number;
}

export interface QuoteRecord {
  id: string;
  number: string;
  clientName: string;
  clientType: ClientType;
  /** Summary of line descriptions (search / templates). */
  service: string;
  /** Sum of line totals TTC. */
  amount: number;
  currency: string;
  validityDays: number;
  status: QuoteStatus;
  templateId: string | null;
  notes: string;
  items: FinanceLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecord {
  id: string;
  number: string;
  clientName: string;
  clientType: ClientType;
  amount: number;
  currency: string;
  dueDate: string;
  status: InvoiceStatus;
  templateId: string | null;
  quoteId: string | null;
  notes: string;
  items: FinanceLineItem[];
  createdAt: string;
  updatedAt: string;
}

export const QUOTE_STATUS_BADGE: Record<QuoteStatus, string> = {
  draft: "b-amber",
  sent: "b-blue",
  accepted: "b-green",
  expired: "b-rose",
  refused: "b-gray",
};

export const INVOICE_STATUS_BADGE: Record<InvoiceStatus, string> = {
  draft: "b-amber",
  pending: "b-blue",
  paid: "b-green",
  overdue: "b-rose",
};

export const EXPENSE_STATUS_BADGE: Record<ExpenseStatus, string> = {
  draft: "b-gray",
  pending: "b-amber",
  paid: "b-green",
  cancelled: "b-rose",
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "rent",
  "salaries",
  "software",
  "marketing",
  "travel",
  "supplies",
  "utilities",
  "other",
];

export interface ExpenseRecord {
  id: string;
  number: string;
  title: string;
  category: ExpenseCategory;
  vendor: string;
  amount: number;
  currency: string;
  date: string;
  status: ExpenseStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString("fr-FR")} ${currency}`;
}

export function createEmptyLineItem(
  partial?: Partial<FinanceLineItem>
): FinanceLineItem {
  return {
    id: `li-${Math.random().toString(36).slice(2, 10)}`,
    description: "",
    quantity: 1,
    unitPriceTtc: 0,
    ...partial,
  };
}

export function lineItemTotalTtc(item: FinanceLineItem): number {
  const q = Number(item.quantity) || 0;
  const p = Number(item.unitPriceTtc) || 0;
  return Math.round(q * p * 100) / 100;
}

export function documentAmountTtc(items: FinanceLineItem[]): number {
  return Math.round(items.reduce((s, i) => s + lineItemTotalTtc(i), 0) * 100) / 100;
}

export function summarizeService(items: FinanceLineItem[]): string {
  return items
    .map((i) => i.description.trim())
    .filter(Boolean)
    .join(", ");
}

export function syncDocumentFromItems<
  T extends { items: FinanceLineItem[]; amount: number; service?: string },
>(doc: T): T {
  const amount = documentAmountTtc(doc.items);
  if ("service" in doc) {
    return {
      ...doc,
      amount,
      service: summarizeService(doc.items) || doc.service || "",
    };
  }
  return { ...doc, amount };
}

export function normalizeQuote(quote: QuoteRecord): QuoteRecord {
  if (quote.items?.length) {
    return syncDocumentFromItems(quote);
  }
  return syncDocumentFromItems({
    ...quote,
    items: [
      createEmptyLineItem({
        id: `li-${quote.id}`,
        description: quote.service || "Prestation",
        quantity: 1,
        unitPriceTtc: quote.amount || 0,
      }),
    ],
  });
}

export function normalizeInvoice(invoice: InvoiceRecord): InvoiceRecord {
  if (invoice.items?.length) {
    return syncDocumentFromItems(invoice);
  }
  const description = invoice.notes?.trim() || "Prestation";
  return syncDocumentFromItems({
    ...invoice,
    items: [
      createEmptyLineItem({
        id: `li-${invoice.id}`,
        description,
        quantity: 1,
        unitPriceTtc: invoice.amount || 0,
      }),
    ],
  });
}

/** Expiry date = createdAt + validityDays (end of that day). */
export function quoteExpiresAt(quote: Pick<QuoteRecord, "createdAt" | "validityDays">): Date {
  const d = new Date(quote.createdAt);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + Math.max(0, quote.validityDays));
  return d;
}

export function quoteExpiryIso(quote: Pick<QuoteRecord, "createdAt" | "validityDays">): string {
  return quoteExpiresAt(quote).toISOString().slice(0, 10);
}

export function isQuoteExpiringSoon(
  quote: QuoteRecord,
  withinDays = 7
): boolean {
  if (quote.status !== "sent" && quote.status !== "draft") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expires = quoteExpiresAt(quote);
  const diff = Math.ceil((expires.getTime() - today.getTime()) / 86_400_000);
  return diff >= 0 && diff <= withinDays;
}

export function isQuotePastExpiry(quote: QuoteRecord): boolean {
  if (quote.status === "accepted" || quote.status === "refused") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return quoteExpiresAt(quote) < today;
}

export function nextQuoteNumber(quotes: QuoteRecord[]): string {
  const year = new Date().getFullYear();
  const prefix = `DEV-${year}-`;
  const nums = quotes
    .map((q) => q.number)
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function nextInvoiceNumber(invoices: InvoiceRecord[]): string {
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;
  const nums = invoices
    .map((i) => i.number)
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function nextExpenseNumber(expenses: ExpenseRecord[]): string {
  const year = new Date().getFullYear();
  const prefix = `DEP-${year}-`;
  const nums = expenses
    .map((e) => e.number)
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}
