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
  lineUnitTtc: string;
  totalHt: string;
  lineTotalTtc: string;
  totalHtLabel: string;
  tva: string;
  totalTtc: string;
  bankDetails: string;
  bank: string;
  page: string;
  days: string;
  until: string;
  paid: string;
  unpaid: string;
  subtotal: string;
  totalToPay: string;
  sender: string;
  billedTo: string;
  clientTo: string;
  docNumber: string;
  signature: string;
  documentContinuation: string;
  lineAmount: string;
  terms: string;
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
    lineUnitTtc: "PU TTC",
    totalHt: "Total HT",
    lineTotalTtc: "Total TTC",
    totalHtLabel: "Total HT",
    tva: "TVA",
    totalTtc: "Total TTC",
    bankDetails: "COORDONNEES BANCAIRES",
    bank: "Banque",
    page: "Page",
    days: "jours",
    until: "jusqu'au",
    paid: "PAYEE",
    unpaid: "NON PAYEE",
    subtotal: "Sous-total",
    totalToPay: "Total a payer",
    sender: "Expediteur",
    billedTo: "Facture a",
    clientTo: "Client",
    docNumber: "N° de document",
    signature: "Signature",
    documentContinuation: "Suite",
    lineAmount: "Montant",
    terms: "Termes & conditions",
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
    lineUnitTtc: "Unit incl.",
    totalHt: "Total excl.",
    lineTotalTtc: "Total incl.",
    totalHtLabel: "Subtotal excl.",
    tva: "VAT",
    totalTtc: "Total incl.",
    bankDetails: "BANK DETAILS",
    bank: "Bank",
    page: "Page",
    days: "days",
    until: "until",
    paid: "PAID",
    unpaid: "UNPAID",
    subtotal: "Subtotal",
    totalToPay: "Total due",
    sender: "Sender",
    billedTo: "Bill to",
    clientTo: "Client",
    docNumber: "Document no.",
    signature: "Signature",
    documentContinuation: "Continued",
    lineAmount: "Amount",
    terms: "Terms & conditions",
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
    lineUnitTtc: "PU TTC",
    totalHt: "Total HT",
    lineTotalTtc: "Total TTC",
    totalHtLabel: "Total HT",
    tva: "TVA",
    totalTtc: "Total TTC",
    bankDetails: "COORDONNEES BANCAIRES",
    bank: "Banque",
    page: "Page",
    days: "jours",
    until: "jusqu'au",
    paid: "PAYEE",
    unpaid: "NON PAYEE",
    subtotal: "Sous-total",
    totalToPay: "Total a payer",
    sender: "Expediteur",
    billedTo: "Facture a",
    clientTo: "Client",
    docNumber: "N° de document",
    signature: "Signature",
    documentContinuation: "Suite",
    lineAmount: "Montant",
    terms: "Termes & conditions",
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
