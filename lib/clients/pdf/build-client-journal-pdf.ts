import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ClientRecord } from "@/lib/clients/types";
import { formatClientValue } from "@/lib/clients/types";
import { journalFilename } from "@/lib/clients/journal";
import { getClientJournalLabels } from "@/lib/clients/pdf/journal-labels";
import {
  financeIssuerFromOrganization,
  type FinanceIssuer,
} from "@/lib/finance/company-info";
import { formatAmountFr, pdfSafe } from "@/lib/finance/pdf/pdf-text";
import { formatDateFr } from "@/lib/finance/render-template";
import type { InvoiceRecord, QuoteRecord } from "@/lib/finance/types";
import type { Locale } from "@/lib/i18n/types";
import { downloadPdfBytes } from "@/lib/finance/pdf/build-finance-pdf";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const PAD_X = 42.5;
const PAD_T = 40;
const CONTENT_LEFT = PAD_X;
const CONTENT_RIGHT = PAGE_W - PAD_X;
const CONTENT_W = CONTENT_RIGHT - CONTENT_LEFT;
const FOOTER_Y = 46;

const INK = rgb(0.09, 0.09, 0.09);
const MUTED = rgb(0.43, 0.43, 0.43);
const HAIRLINE = rgb(0.87, 0.87, 0.87);
const FILL = rgb(0.965, 0.965, 0.965);

type Fonts = { regular: PDFFont; bold: PDFFont };

export type ClientJournalPdfInput = {
  client: ClientRecord;
  statusLabel: string;
  quotes: QuoteRecord[];
  invoices: InvoiceRecord[];
  locale?: Locale;
  issuer?: FinanceIssuer | null;
};

function t(text: string): string {
  return pdfSafe(text || "");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const safe = t(text);
  if (!safe) return [""];
  const words = safe.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function drawLine(
  page: PDFPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color = HAIRLINE,
  thickness = 0.75
) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness,
    color,
  });
}

function drawAligned(
  page: PDFPage,
  text: string,
  opts: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color?: ReturnType<typeof rgb>;
    align?: "left" | "right" | "center";
    maxWidth?: number;
  }
) {
  const safe = t(text);
  const width = opts.font.widthOfTextAtSize(safe, opts.size);
  let x = opts.x;
  if (opts.align === "right") x = opts.x - width;
  if (opts.align === "center") x = opts.x - width / 2;
  if (opts.maxWidth && width > opts.maxWidth) {
    let clipped = safe;
    while (
      clipped.length > 1 &&
      opts.font.widthOfTextAtSize(`${clipped}...`, opts.size) > opts.maxWidth
    ) {
      clipped = clipped.slice(0, -1);
    }
    page.drawText(`${clipped}...`, {
      x: opts.align === "right" ? opts.x - opts.font.widthOfTextAtSize(`${clipped}...`, opts.size) : x,
      y: opts.y,
      size: opts.size,
      font: opts.font,
      color: opts.color ?? INK,
    });
    return;
  }
  page.drawText(safe, {
    x,
    y: opts.y,
    size: opts.size,
    font: opts.font,
    color: opts.color ?? INK,
  });
}

function issuerLines(issuer: FinanceIssuer): string[] {
  const address = [issuer.addressLine1, issuer.addressLine2, issuer.country]
    .filter(Boolean)
    .join(", ");
  const contact = [issuer.phone, issuer.email].filter(Boolean).join("  -  ");
  return [address, contact].filter((line) => line.trim().length > 0);
}

function money(amount: number, currency: string): string {
  return `${formatAmountFr(amount)} ${t(currency)}`;
}

function ensureSpace(
  doc: PDFDocument,
  page: PDFPage,
  y: number,
  needed: number
): { page: PDFPage; y: number } {
  if (y - needed > FOOTER_Y + 16) return { page, y };
  return { page: doc.addPage([PAGE_W, PAGE_H]), y: PAGE_H - PAD_T };
}

export async function buildClientJournalPdfBytes(
  input: ClientJournalPdfInput
): Promise<Uint8Array> {
  const locale = input.locale ?? "fr";
  const labels = getClientJournalLabels(locale);
  const issuer = input.issuer ?? financeIssuerFromOrganization(null);
  const { client, quotes, invoices } = input;
  const issuedOn = formatDateFr(new Date().toISOString());
  const currency =
    invoices[0]?.currency || quotes[0]?.currency || client.valueCurrency || "MAD";

  const invoicedTotal = invoices.reduce((sum, row) => sum + (row.amount || 0), 0);
  const outstandingTotal = invoices
    .filter((row) => row.status === "pending" || row.status === "overdue")
    .reduce((sum, row) => sum + (row.amount || 0), 0);

  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  let page = doc.addPage([PAGE_W, PAGE_H]);
  const footer = (p: PDFPage, index: number, total: number) => {
    drawLine(p, CONTENT_LEFT, FOOTER_Y + 14, CONTENT_RIGHT, FOOTER_Y + 14, HAIRLINE, 0.6);
    drawAligned(p, `${t(issuer.name)}  -  ${labels.title}`, {
      x: CONTENT_LEFT,
      y: FOOTER_Y,
      size: 7,
      font: fonts.regular,
      color: MUTED,
    });
    drawAligned(p, `${labels.page} ${index} / ${total}`, {
      x: CONTENT_RIGHT,
      y: FOOTER_Y,
      size: 7,
      font: fonts.regular,
      color: MUTED,
      align: "right",
    });
  };

  let y = PAGE_H - PAD_T;
  page.drawText(t(issuer.name), {
    x: CONTENT_LEFT,
    y: y - 8,
    size: 11.5,
    font: fonts.bold,
    color: INK,
  });
  drawAligned(page, labels.title, {
    x: CONTENT_RIGHT,
    y: y - 6,
    size: 15,
    font: fonts.bold,
    color: INK,
    align: "right",
  });
  drawAligned(page, `${labels.generated} ${issuedOn}`, {
    x: CONTENT_RIGHT,
    y: y - 20,
    size: 8,
    font: fonts.regular,
    color: MUTED,
    align: "right",
  });

  let infoY = y - 24;
  for (const line of issuerLines(issuer)) {
    page.drawText(t(line), {
      x: CONTENT_LEFT,
      y: infoY,
      size: 7,
      font: fonts.regular,
      color: MUTED,
    });
    infoY -= 10;
  }

  const ruleY = Math.min(infoY, y - 28) - 8;
  drawLine(page, CONTENT_LEFT, ruleY, CONTENT_RIGHT, ruleY, INK, 2.25);
  y = ruleY - 22;

  page.drawText(t(labels.account).toUpperCase(), {
    x: CONTENT_LEFT,
    y,
    size: 7,
    font: fonts.bold,
    color: MUTED,
  });
  y -= 16;
  page.drawText(t(client.name), {
    x: CONTENT_LEFT,
    y,
    size: 16,
    font: fonts.bold,
    color: INK,
  });
  y -= 14;
  if (client.subtitle?.trim()) {
    const subtitleLines = wrapText(client.subtitle, fonts.regular, 9, CONTENT_W);
    for (const line of subtitleLines.slice(0, 3)) {
      page.drawText(t(line), {
        x: CONTENT_LEFT,
        y,
        size: 9,
        font: fonts.regular,
        color: MUTED,
      });
      y -= 12;
    }
  }

  y -= 6;
  const details: Array<[string, string]> = [
    [labels.contact, client.contact || "-"],
    [labels.market, `${client.marketCode}  ${client.location}`.trim()],
    [labels.engagement, client.engagement || "-"],
    [labels.lifetimeValue, formatClientValue(client)],
    [labels.status, input.statusLabel],
  ];

  for (const [label, value] of details) {
    page.drawText(t(label), {
      x: CONTENT_LEFT,
      y,
      size: 8,
      font: fonts.regular,
      color: MUTED,
    });
    page.drawText(t(value), {
      x: CONTENT_LEFT + 110,
      y,
      size: 8.5,
      font: fonts.bold,
      color: INK,
    });
    y -= 14;
  }

  y -= 10;
  page.drawText(t(labels.summary).toUpperCase(), {
    x: CONTENT_LEFT,
    y,
    size: 7,
    font: fonts.bold,
    color: MUTED,
  });
  y -= 18;

  const cards = [
    { label: labels.quotes, value: String(quotes.length) },
    { label: labels.invoices, value: String(invoices.length) },
    { label: labels.invoiced, value: money(invoicedTotal, currency) },
    { label: labels.outstanding, value: money(outstandingTotal, currency) },
  ];
  const gap = 8;
  const cardW = (CONTENT_W - gap * 3) / 4;
  const cardH = 42;
  cards.forEach((card, index) => {
    const x = CONTENT_LEFT + index * (cardW + gap);
    page.drawRectangle({
      x,
      y: y - cardH + 16,
      width: cardW,
      height: cardH,
      color: FILL,
      borderColor: HAIRLINE,
      borderWidth: 0.6,
    });
    page.drawText(t(card.label).toUpperCase(), {
      x: x + 8,
      y: y + 4,
      size: 6.5,
      font: fonts.bold,
      color: MUTED,
    });
    drawAligned(page, card.value, {
      x: x + 8,
      y: y - 14,
      size: card.value.length > 12 ? 9 : 11,
      font: fonts.bold,
      color: INK,
      maxWidth: cardW - 16,
    });
  });
  y -= cardH + 18;

  const drawSectionTitle = (p: PDFPage, title: string, currentY: number) => {
    p.drawText(t(title).toUpperCase(), {
      x: CONTENT_LEFT,
      y: currentY,
      size: 7,
      font: fonts.bold,
      color: MUTED,
    });
    return currentY - 14;
  };

  const drawTableHeader = (
    p: PDFPage,
    currentY: number,
    columns: Array<{ label: string; x: number; align?: "left" | "right"; width?: number }>
  ) => {
    p.drawRectangle({
      x: CONTENT_LEFT,
      y: currentY - 4,
      width: CONTENT_W,
      height: 16,
      color: FILL,
    });
    for (const col of columns) {
      drawAligned(p, col.label, {
        x: col.x,
        y: currentY,
        size: 7,
        font: fonts.bold,
        color: MUTED,
        align: col.align,
        maxWidth: col.width,
      });
    }
    return currentY - 18;
  };

  y = drawSectionTitle(page, labels.quotes, y);
  const quoteCols = [
    { label: labels.reference, x: CONTENT_LEFT + 2, width: 72 },
    { label: labels.date, x: CONTENT_LEFT + 80, width: 58 },
    { label: labels.service, x: CONTENT_LEFT + 146, width: 190 },
    { label: labels.amount, x: CONTENT_RIGHT - 88, align: "right" as const, width: 80 },
    { label: labels.status, x: CONTENT_RIGHT - 2, align: "right" as const, width: 70 },
  ];
  ({ page, y } = ensureSpace(doc, page, y, 40));
  y = drawTableHeader(page, y, quoteCols);

  if (quotes.length === 0) {
    page.drawText(t(labels.emptyQuotes), {
      x: CONTENT_LEFT,
      y,
      size: 8,
      font: fonts.regular,
      color: MUTED,
    });
    y -= 22;
  } else {
    for (const quote of quotes) {
      ({ page, y } = ensureSpace(doc, page, y, 18));
      drawAligned(page, quote.number, {
        x: CONTENT_LEFT + 2,
        y,
        size: 8,
        font: fonts.bold,
        maxWidth: 72,
      });
      drawAligned(page, formatDateFr(quote.createdAt), {
        x: CONTENT_LEFT + 80,
        y,
        size: 8,
        font: fonts.regular,
        color: MUTED,
        maxWidth: 58,
      });
      drawAligned(page, quote.service || "-", {
        x: CONTENT_LEFT + 146,
        y,
        size: 8,
        font: fonts.regular,
        maxWidth: 190,
      });
      drawAligned(page, money(quote.amount, quote.currency), {
        x: CONTENT_RIGHT - 88,
        y,
        size: 8,
        font: fonts.bold,
        align: "right",
        maxWidth: 80,
      });
      drawAligned(page, labels.quoteStatus[quote.status] ?? quote.status, {
        x: CONTENT_RIGHT - 2,
        y,
        size: 8,
        font: fonts.regular,
        color: MUTED,
        align: "right",
        maxWidth: 70,
      });
      y -= 16;
      drawLine(page, CONTENT_LEFT, y + 10, CONTENT_RIGHT, y + 10, HAIRLINE, 0.4);
    }
    y -= 8;
  }

  ({ page, y } = ensureSpace(doc, page, y, 40));
  y = drawSectionTitle(page, labels.invoices, y);
  const invoiceCols = [
    { label: labels.reference, x: CONTENT_LEFT + 2, width: 72 },
    { label: labels.date, x: CONTENT_LEFT + 80, width: 58 },
    { label: labels.dueDate, x: CONTENT_LEFT + 146, width: 70 },
    { label: labels.amount, x: CONTENT_RIGHT - 88, align: "right" as const, width: 80 },
    { label: labels.status, x: CONTENT_RIGHT - 2, align: "right" as const, width: 70 },
  ];
  y = drawTableHeader(page, y, invoiceCols);

  if (invoices.length === 0) {
    page.drawText(t(labels.emptyInvoices), {
      x: CONTENT_LEFT,
      y,
      size: 8,
      font: fonts.regular,
      color: MUTED,
    });
  } else {
    for (const invoice of invoices) {
      ({ page, y } = ensureSpace(doc, page, y, 18));
      drawAligned(page, invoice.number, {
        x: CONTENT_LEFT + 2,
        y,
        size: 8,
        font: fonts.bold,
        maxWidth: 72,
      });
      drawAligned(page, formatDateFr(invoice.createdAt), {
        x: CONTENT_LEFT + 80,
        y,
        size: 8,
        font: fonts.regular,
        color: MUTED,
        maxWidth: 58,
      });
      drawAligned(page, formatDateFr(invoice.dueDate), {
        x: CONTENT_LEFT + 146,
        y,
        size: 8,
        font: fonts.regular,
        color: MUTED,
        maxWidth: 70,
      });
      drawAligned(page, money(invoice.amount, invoice.currency), {
        x: CONTENT_RIGHT - 88,
        y,
        size: 8,
        font: fonts.bold,
        align: "right",
        maxWidth: 80,
      });
      drawAligned(page, labels.invoiceStatus[invoice.status] ?? invoice.status, {
        x: CONTENT_RIGHT - 2,
        y,
        size: 8,
        font: fonts.regular,
        color: MUTED,
        align: "right",
        maxWidth: 70,
      });
      y -= 16;
      drawLine(page, CONTENT_LEFT, y + 10, CONTENT_RIGHT, y + 10, HAIRLINE, 0.4);
    }
  }

  const pages = doc.getPages();
  pages.forEach((p, index) => footer(p, index + 1, pages.length));
  return doc.save();
}

export async function downloadClientJournalPdf(input: ClientJournalPdfInput) {
  const bytes = await buildClientJournalPdfBytes(input);
  downloadPdfBytes(bytes, journalFilename(input.client.name));
}
