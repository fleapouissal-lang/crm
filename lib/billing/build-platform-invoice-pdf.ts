import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb } from "pdf-lib";
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
  PAGE_W,
  M,
  CONTENT_W,
  BLACK,
  INK,
  SLATE,
  MUTED,
  WHITE,
  createPdfFonts,
  embedBrandLogo,
  t,
  type PdfFonts,
} from "@/lib/billing/platform-pdf-layout";

type InvoicePdfLabels = {
  documentTitle: string;
  invoice: string;
  billTo: string;
  from: string;
  plan: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  status: string;
  reason: string;
  notes: string;
  description: string;
  qty: string;
  unit: string;
  monthlySubscription: string;
  thanks: string;
  bank: string;
  totalDue: string;
  paymentInfo: string;
  plans: Record<PlanKey, string>;
  statuses: Record<PlatformInvoiceStatus, string>;
  reasons: Record<PlatformBillingReason, string>;
};

const LABELS: Record<Locale, InvoicePdfLabels> = {
  fr: {
    documentTitle: "Facture d'abonnement CRM",
    invoice: "FACTURE",
    billTo: "Facturer a",
    from: "Emetteur",
    plan: "Offre",
    amount: "Montant",
    issueDate: "Date d'emission",
    dueDate: "Date d'echeance",
    status: "Statut",
    reason: "Motif",
    notes: "Conditions",
    description: "Designation",
    qty: "Qte",
    unit: "P.U.",
    monthlySubscription: "Abonnement CRM mensuel",
    thanks: "Merci pour votre confiance.",
    bank: "Reglement",
    totalDue: "Total a payer",
    paymentInfo: "Informations de paiement",
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
    invoice: "INVOICE",
    billTo: "Bill to",
    from: "From",
    plan: "Plan",
    amount: "Amount",
    issueDate: "Issue date",
    dueDate: "Due date",
    status: "Status",
    reason: "Reason",
    notes: "Terms",
    description: "Description",
    qty: "Qty",
    unit: "Unit",
    monthlySubscription: "Monthly CRM subscription",
    thanks: "Thank you for your trust.",
    bank: "Payment",
    totalDue: "Amount due",
    paymentInfo: "Payment information",
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
    invoice: "INVOICE",
    billTo: "Bill to",
    from: "From",
    plan: "Plan",
    amount: "Amount",
    issueDate: "Issue date",
    dueDate: "Due date",
    status: "Status",
    reason: "Reason",
    notes: "Terms",
    description: "Description",
    qty: "Qty",
    unit: "Unit",
    monthlySubscription: "Monthly CRM subscription",
    thanks: "Thank you for your trust.",
    bank: "Payment",
    totalDue: "Amount due",
    paymentInfo: "Payment information",
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

function text(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color = INK
) {
  page.drawText(t(value), { x, y, size, font, color });
}

function textRight(
  page: PDFPage,
  value: string,
  rightX: number,
  y: number,
  size: number,
  font: PDFFont,
  color = INK
) {
  const safe = t(value);
  page.drawText(safe, {
    x: rightX - font.widthOfTextAtSize(safe, size),
    y,
    size,
    font,
    color,
  });
}

/**
 * Clean professional B&W invoice:
 * - no HR between sections (spacing only)
 * - no bordered table body / grey strip under rows
 * - one black table header + plain line item
 */
function drawInvoiceDocument(
  page: PDFPage,
  fonts: PdfFonts,
  logo: PDFImage | null,
  labels: InvoicePdfLabels,
  opts: {
    number: string;
    status: string;
    issueDate: string;
    dueDate: string;
    clientName: string;
    clientDomain?: string;
    planLabel: string;
    reasonLabel: string;
    lineLabel: string;
    money: string;
  }
) {
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 5,
    width: PAGE_W,
    height: 5,
    color: BLACK,
  });

  let y = PAGE_H - 42;

  if (logo) {
    const maxW = 108;
    const maxH = 32;
    const aspect = logo.width / logo.height;
    let w = maxW;
    let h = maxH;
    if (aspect > maxW / maxH) h = maxW / aspect;
    else w = maxH * aspect;
    page.drawImage(logo, { x: M, y: y - h + 4, width: w, height: h });
  } else {
    text(page, FUSION_COMPANY.name, M, y - 10, 17, fonts.bold, BLACK);
  }

  textRight(page, labels.invoice, PAGE_W - M, y - 2, 20, fonts.bold, BLACK);
  textRight(page, opts.number, PAGE_W - M, y - 22, 11, fonts.bold, INK);
  textRight(page, opts.status, PAGE_W - M, y - 38, 8.5, fonts.regular, MUTED);

  y -= 64;

  // Parties — spacing, no separators
  const mid = M + CONTENT_W * 0.52;
  text(page, labels.from.toUpperCase(), M, y, 7, fonts.bold, MUTED);
  text(page, labels.billTo.toUpperCase(), mid, y, 7, fonts.bold, MUTED);
  y -= 15;

  text(page, FUSION_COMPANY.name, M, y, 12, fonts.bold, BLACK);
  text(page, opts.clientName, mid, y, 12, fonts.bold, BLACK);
  y -= 13;

  text(page, FUSION_COMPANY.legalForm, M, y, 8.5, fonts.regular, SLATE);
  if (opts.clientDomain) {
    text(page, opts.clientDomain, mid, y, 9, fonts.regular, SLATE);
  }
  y -= 12;
  text(
    page,
    `${FUSION_COMPANY.addressLine1}, ${FUSION_COMPANY.addressLine2}`,
    M,
    y,
    8,
    fonts.regular,
    MUTED
  );
  y -= 11;
  text(page, `${FUSION_COMPANY.country}  ·  ${FUSION_COMPANY.email}`, M, y, 8, fonts.regular, MUTED);
  y -= 11;
  text(page, FUSION_COMPANY.phone, M, y, 8, fonts.regular, MUTED);

  y -= 32;

  // Table: designation (with offre + motif) + emission + échéance + qté + P.U. + montant
  const colDesc = M + 6;
  const colIssue = M + CONTENT_W * 0.38;
  const colDue = M + CONTENT_W * 0.54;
  const colQty = M + CONTENT_W * 0.70;
  const colUnit = M + CONTENT_W * 0.78;
  const colAmt = PAGE_W - M - 6;

  page.drawRectangle({
    x: M,
    y: y - 26,
    width: CONTENT_W,
    height: 26,
    color: BLACK,
  });
  text(page, labels.description.toUpperCase(), colDesc, y - 17, 7, fonts.bold, WHITE);
  text(page, labels.issueDate.toUpperCase(), colIssue, y - 17, 6.5, fonts.bold, WHITE);
  text(page, labels.dueDate.toUpperCase(), colDue, y - 17, 6.5, fonts.bold, WHITE);
  text(page, labels.qty.toUpperCase(), colQty, y - 17, 7, fonts.bold, WHITE);
  text(page, labels.unit.toUpperCase(), colUnit, y - 17, 7, fonts.bold, WHITE);
  textRight(page, labels.amount.toUpperCase(), colAmt, y - 17, 7, fonts.bold, WHITE);
  y -= 26;

  y -= 16;
  text(page, opts.lineLabel, colDesc, y, 9.5, fonts.regular, INK);
  text(page, opts.issueDate, colIssue, y, 8.5, fonts.regular, INK);
  text(page, opts.dueDate, colDue, y, 8.5, fonts.regular, INK);
  text(page, "1", colQty, y, 9.5, fonts.regular, INK);
  text(page, opts.money, colUnit, y, 8.5, fonts.regular, INK);
  textRight(page, opts.money, colAmt, y, 10, fonts.bold, BLACK);
  y -= 13;
  text(
    page,
    `${labels.plan}: ${opts.planLabel}  ·  ${labels.reason}: ${opts.reasonLabel}`,
    colDesc,
    y,
    8,
    fonts.regular,
    MUTED
  );

  y -= 36;

  // Total — right aligned, clean black block (no extra under-table element)
  const totalW = 200;
  const totalX = PAGE_W - M - totalW;
  page.drawRectangle({
    x: totalX,
    y: y - 48,
    width: totalW,
    height: 48,
    color: BLACK,
  });
  text(
    page,
    labels.totalDue.toUpperCase(),
    totalX + 12,
    y - 16,
    7,
    fonts.bold,
    rgb(0.72, 0.72, 0.72)
  );
  textRight(page, opts.money, PAGE_W - M - 12, y - 34, 15, fonts.bold, WHITE);

  // Footer only — light text, no line clutter
  const footerY = M + 28;
  text(page, labels.thanks, M, footerY + 14, 8.5, fonts.regular, MUTED);
  text(
    page,
    `${FUSION_COMPANY.ice} · ${FUSION_COMPANY.rc} · ${FUSION_COMPANY.website}`,
    M,
    footerY,
    7,
    fonts.regular,
    MUTED
  );
  textRight(page, labels.documentTitle, PAGE_W - M, footerY, 7, fonts.regular, MUTED);
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

  drawInvoiceDocument(page, fonts, logo, labels, {
    number: invoice.number,
    status: `${labels.status}: ${labels.statuses[invoice.status]}`,
    issueDate: fmtDate(invoice.created_at, locale),
    dueDate: fmtDate(invoice.due_date, locale),
    clientName: companyName,
    clientDomain: domain || undefined,
    planLabel: labels.plans[invoice.plan],
    reasonLabel: labels.reasons[invoice.billing_reason],
    lineLabel: labels.monthlySubscription,
    money,
  });

  return doc.save();
}
