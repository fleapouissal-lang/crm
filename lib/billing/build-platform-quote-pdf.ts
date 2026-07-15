import { PDFDocument } from "pdf-lib";
import { FUSION_COMPANY } from "@/lib/finance/company-info";
import { formatAmountFr } from "@/lib/finance/pdf/pdf-text";
import type { Locale } from "@/lib/i18n/types";
import type { PlanKey } from "@/lib/billing/plans";
import type { PlatformQuote, PlatformQuoteStatus } from "@/types/database";
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
  totalDue: string;
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

  let y = drawPremiumHeader(page, fonts, {
    docKind: labels.quote,
    docNumber: quote.number,
    subtitle: labels.documentTitle,
    metaLine: `${fmtDate(quote.created_at, locale)}  ·  ${labels.status}: ${labels.statuses[quote.status]}`,
    logo,
  });

  y = drawPartyCards(page, fonts, y, labels, companyName, domain || undefined);
  y = drawLineTable(
    page,
    fonts,
    y,
    { description: labels.description, amount: labels.amount },
    `${labels.monthlySubscription} — ${labels.plans[quote.plan]}`,
    money
  );
  y = drawMetaGrid(page, fonts, y, [
    [labels.plan, labels.plans[quote.plan]],
    [labels.validity, `${quote.validity_days} ${labels.days}`],
    [labels.validUntil, fmtDate(until, locale)],
    [labels.amount, money],
  ]);
  y = drawAmountHighlight(page, fonts, y, labels.totalDue, money);
  y = drawNotesBlock(page, fonts, y, labels.notes, quote.notes ?? "");
  drawPremiumFooter(page, fonts, labels.thanks);

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
