import type { Locale } from "@/lib/i18n/types";
import type { ClientType } from "../types";

export type PdfLabels = {
  rtl: boolean;
  docQuote: string;
  docInvoice: string;
  client: string;
  clientParticulier: string;
  clientPro: string;
  date: string;
  validity: string;
  dueDate: string;
  designation: string;
  qty: string;
  unitHt: string;
  totalHt: string;
  totalHtLabel: string;
  tva: string;
  totalTtc: string;
  bankDetails: string;
  bank: string;
  page: string;
  days: string;
  until: string;
};

const LABELS: Record<Locale, PdfLabels> = {
  fr: {
    rtl: false,
    docQuote: "DEVIS",
    docInvoice: "FACTURE",
    client: "CLIENT",
    clientParticulier: "Particulier",
    clientPro: "Professionnel",
    date: "Date",
    validity: "Validite",
    dueDate: "Echeance",
    designation: "Designation",
    qty: "Qte",
    unitHt: "PU HT",
    totalHt: "Total HT",
    totalHtLabel: "Total HT",
    tva: "TVA",
    totalTtc: "Total TTC",
    bankDetails: "COORDONNEES BANCAIRES",
    bank: "Banque",
    page: "Page",
    days: "jours",
    until: "jusqu'au",
  },
  en: {
    rtl: false,
    docQuote: "QUOTE",
    docInvoice: "INVOICE",
    client: "CLIENT",
    clientParticulier: "Individual",
    clientPro: "Business",
    date: "Date",
    validity: "Validity",
    dueDate: "Due date",
    designation: "Description",
    qty: "Qty",
    unitHt: "Unit excl.",
    totalHt: "Total excl.",
    totalHtLabel: "Subtotal excl.",
    tva: "VAT",
    totalTtc: "Total incl.",
    bankDetails: "BANK DETAILS",
    bank: "Bank",
    page: "Page",
    days: "days",
    until: "until",
  },
  ar: {
    rtl: true,
    docQuote: "DEVIS",
    docInvoice: "FACTURE",
    client: "CLIENT",
    clientParticulier: "Particulier",
    clientPro: "Professionnel",
    date: "Date",
    validity: "Validite",
    dueDate: "Echeance",
    designation: "Designation",
    qty: "Qte",
    unitHt: "PU HT",
    totalHt: "Total HT",
    totalHtLabel: "Total HT",
    tva: "TVA",
    totalTtc: "Total TTC",
    bankDetails: "COORDONNEES BANCAIRES",
    bank: "Banque",
    page: "Page",
    days: "jours",
    until: "jusqu'au",
  },
};

export function getPdfLabels(locale: Locale): PdfLabels {
  return LABELS[locale] ?? LABELS.fr;
}

export function clientTypeLabel(type: ClientType, labels: PdfLabels): string {
  return type === "particulier" ? labels.clientParticulier : labels.clientPro;
}

export function resolveClientType(type?: ClientType | null): ClientType {
  return type === "particulier" ? "particulier" : "pro";
}
