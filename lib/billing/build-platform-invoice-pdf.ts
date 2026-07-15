import { PDFDocument } from "pdf-lib";
import { FUSION_COMPANY } from "@/lib/finance/company-info";
import { formatAmountFr } from "@/lib/finance/pdf/pdf-text";
import type { Locale } from "@/lib/i18n/types";
import type { PlanKey } from "@/lib/billing/plans";
import type {
  PlatformBillingReason,
  PlatformInvoice,
  PlatformInvoiceStatus,
} from "@/types/database";
import {
  PAGE_H,
  createPdfFonts,
  drawAmountHighlight,
  drawLineTable,
  drawMetaGrid,
  drawNotesBlock,
  drawPartyCards,
  drawPremiumFooter,
  drawPremiumHeader,
  embedBrandLogo,
} from "@/lib/billing/platform-pdf-layout";

type InvoicePdfLabels = {
  documentTitle: string;
  invoice: string;
  recipient: string;
  issuer: string;
  plan: string;
  amount: string;
  dueDate: string;
  status: string;
  reason: string;
  notes: string;
  description: string;
  monthlySubscription: string;
  thanks: string;
  bank: string;
  totalDue: string;
  plans: Record<PlanKey, string>;
  statuses: Record<PlatformInvoiceStatus, string>;
  reasons: Record<PlatformBillingReason, string>;
};

const LABELS: Record<Locale, InvoicePdfLabels> = {
  fr: {
    documentTitle: "Facture abonnement CRM",
    invoice: "Facture",
    recipient: "Destinataire",
    issuer: "Emetteur",
    plan: "Offre",
    amount: "Montant",
    dueDate: "Echeance",
    status: "Statut",
    reason: "Motif",
    notes: "Conditions / notes",
    description: "Description",
    monthlySubscription: "Abonnement CRM mensuel",
    thanks: "Merci pour votre confiance.",
    bank: "Coordonnees bancaires",
    totalDue: "Montant a regler",
    plans: {
      free: "Gratuit",
      starter: "Essentiel",
      business: "Business",
      enterprise: "Entreprise",
    },
    statuses: {
      draft: "Brouillon",
      pending: "En attente",
      paid: "Payee",
      overdue: "En retard",
    },
    reasons: {
      subscription: "Abonnement",
      plan_change: "Changement de plan",
      renewal: "Renouvellement",
      manual: "Manuel",
    },
  },
  en: {
    documentTitle: "CRM subscription invoice",
    invoice: "Invoice",
    recipient: "Recipient",
    issuer: "Issuer",
    plan: "Plan",
    amount: "Amount",
    dueDate: "Due date",
    status: "Status",
    reason: "Reason",
    notes: "Terms / notes",
    description: "Description",
    monthlySubscription: "Monthly CRM subscription",
    thanks: "Thank you for your trust.",
    bank: "Bank details",
    totalDue: "Amount due",
    plans: {
      free: "Free",
      starter: "Starter",
      business: "Business",
      enterprise: "Enterprise",
    },
    statuses: {
      draft: "Draft",
      pending: "Pending",
      paid: "Paid",
      overdue: "Overdue",
    },
    reasons: {
      subscription: "Subscription",
      plan_change: "Plan change",
      renewal: "Renewal",
      manual: "Manual",
    },
  },
  ar: {
    documentTitle: "CRM subscription invoice",
    invoice: "Invoice",
    recipient: "Recipient",
    issuer: "Issuer",
    plan: "Plan",
    amount: "Amount",
    dueDate: "Due date",
    status: "Status",
    reason: "Reason",
    notes: "Terms / notes",
    description: "Description",
    monthlySubscription: "Monthly CRM subscription",
    thanks: "Thank you for your trust.",
    bank: "Bank details",
    totalDue: "Amount due",
    plans: {
      free: "Free",
      starter: "Starter",
      business: "Business",
      enterprise: "Enterprise",
    },
    statuses: {
      draft: "Draft",
      pending: "Pending",
      paid: "Paid",
      overdue: "Overdue",
    },
    reasons: {
      subscription: "Subscription",
      plan_change: "Plan change",
      renewal: "Renewal",
      manual: "Manual",
    },
  },
};

function fmtDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(
      locale === "ar" ? "ar-MA" : locale === "en" ? "en-GB" : "fr-FR"
    );
  } catch {
    return iso.slice(0, 10);
  }
}

export async function buildPlatformInvoicePdfBytes(
  invoice: PlatformInvoice,
  locale: Locale = "fr"
): Promise<Uint8Array> {
  const labels = LABELS[locale] ?? LABELS.fr;
  const doc = await PDFDocument.create();
  const fonts = await createPdfFonts(doc);
  const logo = await embedBrandLogo(doc);
  const page = doc.addPage([595.28, PAGE_H]);

  const companyName = invoice.organization?.name ?? "—";
  const domain = invoice.organization?.email_domain
    ? `@${invoice.organization.email_domain}`
    : "";
  const money = `${formatAmountFr(Number(invoice.amount))} ${invoice.currency || "MAD"}`;

  let y = drawPremiumHeader(page, fonts, {
    docKind: labels.invoice,
    docNumber: invoice.number,
    subtitle: labels.documentTitle,
    metaLine: `${fmtDate(invoice.created_at, locale)}  ·  ${labels.status}: ${labels.statuses[invoice.status]}`,
    logo,
    monochrome: true,
  });

  y = drawPartyCards(page, fonts, y, labels, companyName, domain || undefined, true);
  y = drawLineTable(
    page,
    fonts,
    y,
    { description: labels.description, amount: labels.amount },
    `${labels.monthlySubscription} — ${labels.plans[invoice.plan]} (${labels.reasons[invoice.billing_reason]})`,
    money,
    true
  );
  y = drawMetaGrid(page, fonts, y, [
    [labels.plan, labels.plans[invoice.plan]],
    [labels.reason, labels.reasons[invoice.billing_reason]],
    [labels.dueDate, fmtDate(invoice.due_date, locale)],
    [labels.amount, money],
  ]);
  y = drawAmountHighlight(page, fonts, y, labels.totalDue, money, true);
  y = drawNotesBlock(page, fonts, y, labels.notes, invoice.notes ?? "");

  drawPremiumFooter(
    page,
    fonts,
    labels.thanks,
    `${labels.bank}: ${FUSION_COMPANY.bank} · IBAN ${FUSION_COMPANY.iban}`
  );

  return doc.save();
}
