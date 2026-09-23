import type { ClientRecord } from "@/lib/clients/types";
import type { InvoiceRecord, QuoteRecord } from "@/lib/finance/types";

export function normalizeClientKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function matchClientFinanceDocs(
  client: ClientRecord,
  quotes: QuoteRecord[],
  invoices: InvoiceRecord[]
): { quotes: QuoteRecord[]; invoices: InvoiceRecord[] } {
  const key = normalizeClientKey(client.name);
  if (!key) return { quotes: [], invoices: [] };
  return {
    quotes: quotes.filter((row) => normalizeClientKey(row.clientName) === key),
    invoices: invoices.filter((row) => normalizeClientKey(row.clientName) === key),
  };
}

export function journalFilename(clientName: string): string {
  const slug = normalizeClientKey(clientName)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `journal-client-${slug || "dossier"}.pdf`;
}
