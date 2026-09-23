import type { Locale } from "@/lib/i18n/types";
import type { InvoiceStatus, QuoteStatus } from "@/lib/finance/types";

export type ClientJournalLabels = {
  title: string;
  generated: string;
  account: string;
  contact: string;
  market: string;
  engagement: string;
  lifetimeValue: string;
  status: string;
  summary: string;
  quotes: string;
  invoices: string;
  invoiced: string;
  outstanding: string;
  reference: string;
  date: string;
  service: string;
  amount: string;
  dueDate: string;
  emptyQuotes: string;
  emptyInvoices: string;
  page: string;
  quoteStatus: Record<QuoteStatus, string>;
  invoiceStatus: Record<InvoiceStatus, string>;
};

const LABELS: Record<Locale, ClientJournalLabels> = {
  fr: {
    title: "JOURNAL CLIENT",
    generated: "Edite le",
    account: "Fiche compte",
    contact: "Contact",
    market: "Marche",
    engagement: "Mission",
    lifetimeValue: "Valeur client",
    status: "Statut",
    summary: "Synthese commerciale",
    quotes: "Devis",
    invoices: "Factures",
    invoiced: "Facture",
    outstanding: "Impaye",
    reference: "Ref.",
    date: "Date",
    service: "Prestation",
    amount: "Montant",
    dueDate: "Echeance",
    emptyQuotes: "Aucun devis rattache a ce client.",
    emptyInvoices: "Aucune facture rattachee a ce client.",
    page: "Page",
    quoteStatus: {
      draft: "Brouillon",
      sent: "Envoye",
      accepted: "Accepte",
      expired: "Expire",
      refused: "Refuse",
    },
    invoiceStatus: {
      draft: "Brouillon",
      pending: "En attente",
      paid: "Payee",
      overdue: "En retard",
    },
  },
  en: {
    title: "CLIENT JOURNAL",
    generated: "Issued on",
    account: "Account sheet",
    contact: "Contact",
    market: "Market",
    engagement: "Job",
    lifetimeValue: "Client value",
    status: "Status",
    summary: "Commercial summary",
    quotes: "Quotes",
    invoices: "Invoices",
    invoiced: "Invoiced",
    outstanding: "Outstanding",
    reference: "Ref.",
    date: "Date",
    service: "Service",
    amount: "Amount",
    dueDate: "Due date",
    emptyQuotes: "No quotes linked to this client.",
    emptyInvoices: "No invoices linked to this client.",
    page: "Page",
    quoteStatus: {
      draft: "Draft",
      sent: "Sent",
      accepted: "Accepted",
      expired: "Expired",
      refused: "Refused",
    },
    invoiceStatus: {
      draft: "Draft",
      pending: "Pending",
      paid: "Paid",
      overdue: "Overdue",
    },
  },
  ar: {
    title: "JOURNAL CLIENT",
    generated: "Edite le",
    account: "Fiche compte",
    contact: "Contact",
    market: "Marche",
    engagement: "Mission",
    lifetimeValue: "Valeur client",
    status: "Statut",
    summary: "Synthese commerciale",
    quotes: "Devis",
    invoices: "Factures",
    invoiced: "Facture",
    outstanding: "Impaye",
    reference: "Ref.",
    date: "Date",
    service: "Prestation",
    amount: "Montant",
    dueDate: "Echeance",
    emptyQuotes: "Aucun devis rattache a ce client.",
    emptyInvoices: "Aucune facture rattachee a ce client.",
    page: "Page",
    quoteStatus: {
      draft: "Brouillon",
      sent: "Envoye",
      accepted: "Accepte",
      expired: "Expire",
      refused: "Refuse",
    },
    invoiceStatus: {
      draft: "Brouillon",
      pending: "En attente",
      paid: "Payee",
      overdue: "En retard",
    },
  },
};

export function getClientJournalLabels(locale: Locale): ClientJournalLabels {
  return LABELS[locale] ?? LABELS.fr;
}
