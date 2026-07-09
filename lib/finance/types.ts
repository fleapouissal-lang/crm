export type TemplateKind = "quote" | "invoice";

export type QuoteStatus = "draft" | "sent" | "accepted" | "expired" | "refused";

export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue";

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

export interface QuoteRecord {
  id: string;
  number: string;
  clientName: string;
  service: string;
  amount: number;
  currency: string;
  validityDays: number;
  status: QuoteStatus;
  templateId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecord {
  id: string;
  number: string;
  clientName: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: InvoiceStatus;
  templateId: string | null;
  quoteId: string | null;
  notes: string;
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

export function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString("fr-FR")} ${currency}`;
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
