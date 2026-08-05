import { FUSION_COMPANY } from "./company-info";
import type { InvoiceRecord, QuoteRecord, PriceMode } from "./types";

export function renderQuoteTemplate(content: string, quote: QuoteRecord): string {
  return content
    .replace(/\{\{numero\}\}/g, quote.number)
    .replace(/\{\{client\}\}/g, quote.clientName)
    .replace(/\{\{prestation\}\}/g, quote.service)
    .replace(/\{\{montant\}\}/g, quote.amount.toLocaleString("fr-FR"))
    .replace(/\{\{devise\}\}/g, quote.currency)
    .replace(/\{\{validite\}\}/g, String(quote.validityDays));
}

export function renderInvoiceTemplate(
  content: string,
  invoice: InvoiceRecord,
  service?: string,
  iban = ""
): string {
  const prestation = service || invoice.notes || "—";
  return content
    .replace(/\{\{numero\}\}/g, invoice.number)
    .replace(/\{\{client\}\}/g, invoice.clientName)
    .replace(/\{\{montant\}\}/g, invoice.amount.toLocaleString("fr-FR"))
    .replace(/\{\{devise\}\}/g, invoice.currency)
    .replace(/\{\{echeance\}\}/g, formatDateFr(invoice.dueDate))
    .replace(/\{\{prestation\}\}/g, prestation)
    .replace(/\{\{iban\}\}/g, iban);
}

export function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatMoneyFr(amount: number, currency: string): string {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function splitTtcAmount(ttc: number, rate: number = FUSION_COMPANY.tvaRate) {
  const ht = Math.round((ttc / (1 + rate)) * 100) / 100;
  const tva = Math.round((ttc - ht) * 100) / 100;
  return { ht, tva, ttc };
}

export function splitHtAmount(ht: number, rate: number = FUSION_COMPANY.tvaRate) {
  const tva = Math.round(ht * rate * 100) / 100;
  const ttc = Math.round((ht + tva) * 100) / 100;
  return { ht, tva, ttc };
}

export function splitAmount(
  amount: number,
  mode: PriceMode,
  rate: number = FUSION_COMPANY.tvaRate
) {
  return mode === "ttc" ? splitTtcAmount(amount, rate) : splitHtAmount(amount, rate);
}

export function htFromTtc(ttc: number, rate: number = FUSION_COMPANY.tvaRate): number {
  return splitTtcAmount(ttc, rate).ht;
}

export function ttcFromHt(ht: number, rate: number = FUSION_COMPANY.tvaRate): number {
  return splitHtAmount(ht, rate).ttc;
}

export function unitPriceDisplay(
  unitPriceTtc: number,
  mode: PriceMode,
  rate: number = FUSION_COMPANY.tvaRate
): number {
  if (mode === "ttc") return unitPriceTtc;
  return htFromTtc(unitPriceTtc, rate);
}

export function unitPriceToStored(
  display: number,
  mode: PriceMode,
  rate: number = FUSION_COMPANY.tvaRate
): number {
  if (mode === "ttc") return display;
  return ttcFromHt(display, rate);
}
