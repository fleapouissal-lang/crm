import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb } from "pdf-lib";
import { FUSION_COMPANY } from "@/lib/finance/company-info";
import { formatAmountFr } from "@/lib/finance/pdf/pdf-text";
import type { Locale } from "@/lib/i18n/types";
import type { PlanKey } from "@/lib/billing/plans";
import type { PlatformQuote, PlatformQuoteStatus } from "@/types/database";
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

export type PlatformQuotePdfLabels = {
  documentTitle: string;
  quote: string;
  billTo: string;
  from: string;
  plan: string;
  amount: string;
  issueDate: string;
  validUntil: string;
  validity: string;
  status: string;
  description: string;
  qty: string;
  unit: string;
  monthlySubscription: string;
  thanks: string;
  totalDue: string;
  plans: Record<PlanKey, string>;
  statuses: Record<PlatformQuoteStatus, string>;
  days: string;
};

const LABELS: Record<Locale, PlatformQuotePdfLabels> = {
  fr: {
    documentTitle: "Devis d'abonnement CRM",
    quote: "DEVIS",
    billTo: "Destinataire",
    from: "Emetteur",
    plan: "Offre",
    amount: "Montant",
    issueDate: "Date d'emission",
    validUntil: "Valable jusqu'au",
    validity: "Validite",
    status: "Statut",
    description: "Designation",
    qty: "Qte",
    unit: "P.U.",
    monthlySubscription: "Abonnement CRM mensuel",
    thanks: "Merci pour votre confiance.",
    totalDue: "Montant du devis",
    plans: {
      free: "Gratuit",
      starter: "Essentiel",
      business: "Business",
      enterprise: "Entreprise",
    },
    statuses: {
      draft: "Brouillon",
      sent: "Envoye",
      accepted: "Accepte",
      expired: "Expire",
      refused: "Refuse",
    },
    days: "jours",
  },
  en: {
    documentTitle: "CRM subscription quote",
    quote: "QUOTE",
    billTo: "Recipient",
    from: "From",
    plan: "Plan",
    amount: "Amount",
    issueDate: "Issue date",
    validUntil: "Valid until",
    validity: "Validity",
    status: "Status",
    description: "Description",
    qty: "Qty",
    unit: "Unit",
    monthlySubscription: "Monthly CRM subscription",
    thanks: "Thank you for your trust.",
    totalDue: "Quote total",
    plans: {
      free: "Free",
      starter: "Starter",
      business: "Business",
      enterprise: "Enterprise",
    },
    statuses: {
      draft: "Draft",
      sent: "Sent",
      accepted: "Accepted",
      expired: "Expired",
      refused: "Refused",
    },
    days: "days",
  },
  ar: {
    documentTitle: "CRM subscription quote",
    quote: "QUOTE",
    billTo: "Recipient",
    from: "From",
    plan: "Plan",
    amount: "Amount",
    issueDate: "Issue date",
    validUntil: "Valid until",
    validity: "Validity",
    status: "Status",
    description: "Description",
    qty: "Qty",
    unit: "Unit",
    monthlySubscription: "Monthly CRM subscription",
    thanks: "Thank you for your trust.",
    totalDue: "Quote total",
    plans: {
      free: "Free",
      starter: "Starter",
      business: "Business",
      enterprise: "Enterprise",
    },
    statuses: {
      draft: "Draft",
      sent: "Sent",
      accepted: "Accepted",
      expired: "Expired",
      refused: "Refused",
    },
    days: "days",
  },
};

function fmtDate(iso: string, locale: Locale): string {
  try {
    return new Date(iso).toLocaleDateString(
      locale === "ar" ? "ar-MA" : locale === "en" ? "en-GB" : "fr-FR"
    );
  } catch {
    return iso.slice(0, 10);
  }
}

function validUntilDate(createdAt: string, validityDays: number): string {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + Math.max(1, validityDays));
  return d.toISOString();
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

/** Same clean B&W layout as the platform invoice. */
function drawQuoteDocument(
  page: PDFPage,
  fonts: PdfFonts,
  logo: PDFImage | null,
  labels: PlatformQuotePdfLabels,
  opts: {
    number: string;
    status: string;
    issueDate: string;
    validUntil: string;
    clientName: string;
    clientDomain?: string;
    planLabel: string;
    validityLabel: string;
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

  textRight(page, labels.quote, PAGE_W - M, y - 2, 20, fonts.bold, BLACK);
  textRight(page, opts.number, PAGE_W - M, y - 22, 11, fonts.bold, INK);
  textRight(page, opts.status, PAGE_W - M, y - 38, 8.5, fonts.regular, MUTED);

  y -= 64;

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
  text(
    page,
    `${FUSION_COMPANY.country}  ·  ${FUSION_COMPANY.email}`,
    M,
    y,
    8,
    fonts.regular,
    MUTED
  );
  y -= 11;
  text(page, FUSION_COMPANY.phone, M, y, 8, fonts.regular, MUTED);

  y -= 32;

  const colDesc = M + 6;
  const colIssue = M + CONTENT_W * 0.38;
  const colUntil = M + CONTENT_W * 0.54;
  const colQty = M + CONTENT_W * 0.7;
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
  text(page, labels.validUntil.toUpperCase(), colUntil, y - 17, 6.5, fonts.bold, WHITE);
  text(page, labels.qty.toUpperCase(), colQty, y - 17, 7, fonts.bold, WHITE);
  text(page, labels.unit.toUpperCase(), colUnit, y - 17, 7, fonts.bold, WHITE);
  textRight(page, labels.amount.toUpperCase(), colAmt, y - 17, 7, fonts.bold, WHITE);
  y -= 26;

  y -= 16;
  text(page, opts.lineLabel, colDesc, y, 9.5, fonts.regular, INK);
  text(page, opts.issueDate, colIssue, y, 8.5, fonts.regular, INK);
  text(page, opts.validUntil, colUntil, y, 8.5, fonts.regular, INK);
  text(page, "1", colQty, y, 9.5, fonts.regular, INK);
  text(page, opts.money, colUnit, y, 8.5, fonts.regular, INK);
  textRight(page, opts.money, colAmt, y, 10, fonts.bold, BLACK);
  y -= 13;
  text(
    page,
    `${labels.plan}: ${opts.planLabel}  ·  ${labels.validity}: ${opts.validityLabel}`,
    colDesc,
    y,
    8,
    fonts.regular,
    MUTED
  );

  y -= 36;

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

export async function buildPlatformQuotePdfBytes(
  quote: PlatformQuote,
  locale: Locale = "fr"
): Promise<Uint8Array> {
  const labels = LABELS[locale] ?? LABELS.fr;
  const doc = await PDFDocument.create();
  const fonts = await createPdfFonts(doc);
  const logo = await embedBrandLogo(doc);
  const page = doc.addPage([595.28, PAGE_H]);

  const companyName = quote.organization?.name ?? "—";
  const domain = quote.organization?.email_domain
    ? `@${quote.organization.email_domain}`
    : "";
  const until = validUntilDate(quote.created_at, quote.validity_days);
  const money = `${formatAmountFr(Number(quote.amount))} ${quote.currency || "MAD"}`;

  drawQuoteDocument(page, fonts, logo, labels, {
    number: quote.number,
    status: `${labels.status}: ${labels.statuses[quote.status]}`,
    issueDate: fmtDate(quote.created_at, locale),
    validUntil: fmtDate(until, locale),
    clientName: companyName,
    clientDomain: domain || undefined,
    planLabel: labels.plans[quote.plan],
    validityLabel: `${quote.validity_days} ${labels.days}`,
    lineLabel: labels.monthlySubscription,
    money,
  });

  return doc.save();
}

export function downloadPdfBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob(
    [
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as BlobPart,
    ],
    { type: "application/pdf" }
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
