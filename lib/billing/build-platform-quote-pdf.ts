import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { FUSION_COMPANY } from "@/lib/finance/company-info";
import { formatAmountFr, pdfSafe } from "@/lib/finance/pdf/pdf-text";
import type { Locale } from "@/lib/i18n/types";
import type { PlanKey } from "@/lib/billing/plans";
import type { PlatformQuote, PlatformQuoteStatus } from "@/types/database";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 48;
const BLACK = rgb(0.06, 0.06, 0.06);
const INK = rgb(0.15, 0.15, 0.15);
const MUTED = rgb(0.45, 0.45, 0.45);
const BORDER = rgb(0.82, 0.82, 0.82);
const SURFACE = rgb(0.96, 0.96, 0.96);
const ACCENT = rgb(0.16, 0.24, 0.45);

export type PlatformQuotePdfLabels = {
  documentTitle: string;
  quote: string;
  recipient: string;
  issuer: string;
  plan: string;
  amount: string;
  validity: string;
  validUntil: string;
  status: string;
  notes: string;
  description: string;
  monthlySubscription: string;
  thanks: string;
  plans: Record<PlanKey, string>;
  statuses: Record<PlatformQuoteStatus, string>;
  days: string;
};

const LABELS: Record<Locale, PlatformQuotePdfLabels> = {
  fr: {
    documentTitle: "Devis abonnement CRM",
    quote: "Devis",
    recipient: "Destinataire",
    issuer: "Emetteur",
    plan: "Offre",
    amount: "Montant",
    validity: "Validite",
    validUntil: "Valable jusqu'au",
    status: "Statut",
    notes: "Conditions / notes",
    description: "Description",
    monthlySubscription: "Abonnement CRM mensuel",
    thanks: "Merci pour votre confiance.",
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
    quote: "Quote",
    recipient: "Recipient",
    issuer: "Issuer",
    plan: "Plan",
    amount: "Amount",
    validity: "Validity",
    validUntil: "Valid until",
    status: "Status",
    notes: "Terms / notes",
    description: "Description",
    monthlySubscription: "Monthly CRM subscription",
    thanks: "Thank you for your trust.",
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
    quote: "Quote",
    recipient: "Recipient",
    issuer: "Issuer",
    plan: "Plan",
    amount: "Amount",
    validity: "Validity",
    validUntil: "Valid until",
    status: "Status",
    notes: "Terms / notes",
    description: "Description",
    monthlySubscription: "Monthly CRM subscription",
    thanks: "Thank you for your trust.",
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

function t(value: string): string {
  return pdfSafe(value);
}

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

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color = INK
) {
  page.drawText(t(text), { x, y, size, font, color });
}

function drawRight(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  size: number,
  font: PDFFont,
  color = INK
) {
  const safe = t(text);
  const w = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: rightX - w, y, size, font, color });
}

export async function buildPlatformQuotePdfBytes(
  quote: PlatformQuote,
  locale: Locale = "fr"
): Promise<Uint8Array> {
  const labels = LABELS[locale] ?? LABELS.fr;
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_W, PAGE_H]);

  const companyName = quote.organization?.name ?? "—";
  const domain = quote.organization?.email_domain
    ? `@${quote.organization.email_domain}`
    : "";
  const until = validUntilDate(quote.created_at, quote.validity_days);
  const money = `${formatAmountFr(Number(quote.amount))} ${quote.currency || "MAD"}`;

  let y = PAGE_H - M;

  drawText(page, FUSION_COMPANY.name, M, y - 14, 18, bold, ACCENT);
  drawText(
    page,
    `${FUSION_COMPANY.legalForm} · ${FUSION_COMPANY.website}`,
    M,
    y - 32,
    9,
    regular,
    MUTED
  );
  drawRight(page, labels.quote.toUpperCase(), PAGE_W - M, y - 12, 12, bold, ACCENT);
  drawRight(page, quote.number, PAGE_W - M, y - 30, 14, bold, BLACK);
  y -= 56;

  page.drawRectangle({
    x: M,
    y: y - 52,
    width: PAGE_W - M * 2,
    height: 52,
    color: SURFACE,
    borderColor: BORDER,
    borderWidth: 0.75,
  });
  drawText(page, labels.documentTitle, M + 14, y - 20, 11, bold, BLACK);
  drawText(
    page,
    `${fmtDate(quote.created_at, locale)}  ·  ${labels.status}: ${labels.statuses[quote.status]}`,
    M + 14,
    y - 38,
    9,
    regular,
    MUTED
  );
  y -= 78;

  const colW = (PAGE_W - M * 2 - 16) / 2;
  page.drawRectangle({
    x: M,
    y: y - 78,
    width: colW,
    height: 78,
    borderColor: BORDER,
    borderWidth: 0.75,
  });
  page.drawRectangle({
    x: M + colW + 16,
    y: y - 78,
    width: colW,
    height: 78,
    borderColor: BORDER,
    borderWidth: 0.75,
  });

  drawText(page, labels.issuer.toUpperCase(), M + 12, y - 18, 8, bold, MUTED);
  drawText(page, FUSION_COMPANY.name, M + 12, y - 36, 11, bold, BLACK);
  drawText(page, FUSION_COMPANY.email, M + 12, y - 52, 9, regular, MUTED);
  drawText(page, FUSION_COMPANY.phone, M + 12, y - 66, 9, regular, MUTED);

  const rx = M + colW + 16;
  drawText(page, labels.recipient.toUpperCase(), rx + 12, y - 18, 8, bold, MUTED);
  drawText(page, companyName, rx + 12, y - 36, 11, bold, BLACK);
  if (domain) drawText(page, domain, rx + 12, y - 52, 9, regular, MUTED);
  y -= 104;

  // Line items header
  page.drawRectangle({
    x: M,
    y: y - 22,
    width: PAGE_W - M * 2,
    height: 22,
    color: ACCENT,
  });
  drawText(page, labels.description, M + 10, y - 15, 9, bold, rgb(1, 1, 1));
  drawRight(page, labels.amount, PAGE_W - M - 10, y - 15, 9, bold, rgb(1, 1, 1));
  y -= 22;

  page.drawRectangle({
    x: M,
    y: y - 36,
    width: PAGE_W - M * 2,
    height: 36,
    borderColor: BORDER,
    borderWidth: 0.75,
  });
  drawText(
    page,
    `${labels.monthlySubscription} — ${labels.plans[quote.plan]}`,
    M + 10,
    y - 22,
    10,
    regular,
    INK
  );
  drawRight(page, money, PAGE_W - M - 10, y - 22, 10, bold, BLACK);
  y -= 56;

  // Meta row
  const metas: [string, string][] = [
    [labels.plan, labels.plans[quote.plan]],
    [labels.validity, `${quote.validity_days} ${labels.days}`],
    [labels.validUntil, fmtDate(until, locale)],
    [labels.amount, money],
  ];
  const boxW = (PAGE_W - M * 2 - 18) / 4;
  metas.forEach(([label, value], i) => {
    const x = M + i * (boxW + 6);
    page.drawRectangle({
      x,
      y: y - 48,
      width: boxW,
      height: 48,
      color: SURFACE,
      borderColor: BORDER,
      borderWidth: 0.6,
    });
    drawText(page, label.toUpperCase(), x + 8, y - 16, 7, bold, MUTED);
    drawText(page, value, x + 8, y - 34, 9, bold, BLACK);
  });
  y -= 72;

  if (quote.notes?.trim()) {
    drawText(page, labels.notes.toUpperCase(), M, y, 8, bold, MUTED);
    y -= 14;
    const lines = t(quote.notes).split(/\r?\n/);
    for (const line of lines.slice(0, 8)) {
      drawText(page, line.slice(0, 95), M, y, 9, regular, INK);
      y -= 13;
    }
    y -= 8;
  }

  y = Math.min(y, M + 70);
  page.drawLine({
    start: { x: M, y: M + 52 },
    end: { x: PAGE_W - M, y: M + 52 },
    thickness: 0.6,
    color: BORDER,
  });
  drawText(page, labels.thanks, M, M + 34, 9, regular, MUTED);
  drawText(
    page,
    `${FUSION_COMPANY.addressLine1}, ${FUSION_COMPANY.addressLine2}`,
    M,
    M + 18,
    8,
    regular,
    MUTED
  );
  drawText(
    page,
    `${FUSION_COMPANY.ice} · ${FUSION_COMPANY.rc}`,
    M,
    M + 6,
    8,
    regular,
    MUTED
  );

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
