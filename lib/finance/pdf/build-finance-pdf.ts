import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type { Locale } from "@/lib/i18n/types";
import { FUSION_COMPANY } from "../company-info";
import { formatDateFr, splitTtcAmount } from "../render-template";
import type { ClientType, DocumentTemplate, InvoiceRecord, QuoteRecord } from "../types";
import { pdfSafe, formatAmountFr } from "./pdf-text";
import {
  clientTypeLabel,
  getPdfLabels,
  resolveClientType,
  type PdfLabels,
} from "./pdf-labels";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 52;
const CONTENT_W = PAGE_W - M * 2;
const LOGO_W = 108;
const LOGO_H = 40;
const HEADER_BOTTOM = PAGE_H - M - 108;
const FOOTER_HEIGHT = 72;
const CONTENT_BOTTOM = M + FOOTER_HEIGHT + 16;

/* Fusion Leap brand palette */
const IRIS = rgb(0.48, 0.35, 0.95);
const GOLD = rgb(0.94, 0.58, 0.28);
const BLACK = rgb(0.04, 0.04, 0.04);
const INK = rgb(0.12, 0.12, 0.14);
const SLATE = rgb(0.35, 0.35, 0.38);
const MUTED = rgb(0.52, 0.52, 0.56);
const BORDER = rgb(0.86, 0.86, 0.88);
const SURFACE = rgb(0.97, 0.97, 0.98);
const WHITE = rgb(1, 1, 1);

type Fonts = { regular: PDFFont; bold: PDFFont };
type DocMeta = { label: string; value: string };

type PdfTheme = {
  barPrimary: ReturnType<typeof rgb>;
  barSecondary: ReturnType<typeof rgb>;
  accent: ReturnType<typeof rgb>;
  title: ReturnType<typeof rgb>;
  tableHeader: ReturnType<typeof rgb>;
  totalAccent: ReturnType<typeof rgb>;
  totalsBar: ReturnType<typeof rgb>;
};

const BRAND_THEME: PdfTheme = {
  barPrimary: IRIS,
  barSecondary: GOLD,
  accent: IRIS,
  title: IRIS,
  tableHeader: IRIS,
  totalAccent: IRIS,
  totalsBar: GOLD,
};

const MONO_THEME: PdfTheme = {
  barPrimary: BLACK,
  barSecondary: BLACK,
  accent: BLACK,
  title: BLACK,
  tableHeader: BLACK,
  totalAccent: BLACK,
  totalsBar: BLACK,
};

let logoBytesCache: Uint8Array | null = null;

async function loadLogoBytes(): Promise<Uint8Array | null> {
  if (typeof window === "undefined") return null;
  if (logoBytesCache) return logoBytesCache;
  try {
    const res = await fetch(FUSION_COMPANY.logoPath);
    if (!res.ok) return null;
    logoBytesCache = new Uint8Array(await res.arrayBuffer());
    return logoBytesCache;
  } catch {
    return null;
  }
}

function t(value: string): string {
  return pdfSafe(value);
}

function formatMoneyPdf(amount: number, currency: string): string {
  return `${formatAmountFr(amount)} ${currency}`;
}

function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const safe = t(text);
  const lines: string[] = [];
  for (const paragraph of safe.split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function drawLine(
  page: PDFPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color = BORDER,
  thickness = 0.75
) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
}

function drawAlignedText(
  page: PDFPage,
  text: string,
  opts: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color: ReturnType<typeof rgb>;
    align: "left" | "right";
  }
) {
  const safe = t(text);
  const w = opts.font.widthOfTextAtSize(safe, opts.size);
  const x = opts.align === "right" ? opts.x - w : opts.x;
  page.drawText(safe, { x, y: opts.y, size: opts.size, font: opts.font, color: opts.color });
}

function drawPageHeader(
  page: PDFPage,
  fonts: Fonts,
  labels: PdfLabels,
  docTitle: string,
  docNumber: string,
  theme: PdfTheme,
  logo?: PDFImage | null
) {
  const rtl = labels.rtl;
  const textAnchor = rtl ? PAGE_W - M : M;
  const textAlign: "left" | "right" = rtl ? "right" : "left";
  const logoX = rtl ? M : PAGE_W - M - LOGO_W;

  page.drawRectangle({ x: 0, y: PAGE_H - 5, width: PAGE_W / 2, height: 5, color: theme.barPrimary });
  page.drawRectangle({
    x: PAGE_W / 2,
    y: PAGE_H - 5,
    width: PAGE_W / 2,
    height: 5,
    color: theme.barSecondary,
  });

  if (logo) {
    const aspect = logo.width / logo.height;
    let drawW = LOGO_W;
    let drawH = LOGO_H;
    if (aspect > LOGO_W / LOGO_H) drawH = LOGO_W / aspect;
    else drawW = LOGO_H * aspect;
    page.drawImage(logo, {
      x: logoX + (LOGO_W - drawW) / 2,
      y: PAGE_H - M - LOGO_H + 2,
      width: drawW,
      height: drawH,
    });
  }

  let y = PAGE_H - M - 4;
  drawAlignedText(page, docTitle, {
    x: textAnchor,
    y,
    size: 26,
    font: fonts.bold,
    color: theme.title,
    align: textAlign,
  });
  y -= 20;
  drawAlignedText(page, docNumber, {
    x: textAnchor,
    y,
    size: 9,
    font: fonts.regular,
    color: SLATE,
    align: textAlign,
  });
  y -= 18;

  const companyLines = [
    `${FUSION_COMPANY.name}  ·  ${FUSION_COMPANY.legalForm}`,
    `${FUSION_COMPANY.addressLine1}, ${FUSION_COMPANY.addressLine2}`,
    FUSION_COMPANY.country,
    `${FUSION_COMPANY.ice}   ${FUSION_COMPANY.rc}   ${FUSION_COMPANY.taxId}`,
    FUSION_COMPANY.capital,
    `${FUSION_COMPANY.phone}   ${FUSION_COMPANY.email}   ${FUSION_COMPANY.website}`,
  ];

  for (const line of companyLines) {
    drawAlignedText(page, line, {
      x: textAnchor,
      y,
      size: 7.5,
      font: fonts.regular,
      color: MUTED,
      align: textAlign,
    });
    y -= 10;
  }

  drawLine(page, M, HEADER_BOTTOM, PAGE_W - M, HEADER_BOTTOM, theme.accent, 1.2);
}

function drawPageFooter(
  page: PDFPage,
  fonts: Fonts,
  labels: PdfLabels,
  pageIndex: number,
  totalPages: number,
  options: {
    showBankDetails?: boolean;
    footerNote?: string;
    dueLabel?: string;
    dueValue?: string;
  } = {}
) {
  const {
    showBankDetails = false,
    footerNote = "",
    dueLabel,
    dueValue,
  } = options;
  const rtl = labels.rtl;
  const footerTop = M + FOOTER_HEIGHT;
  const leftX = rtl ? PAGE_W - M : M;
  const leftAlign: "left" | "right" = rtl ? "right" : "left";
  const rightX = rtl ? M : PAGE_W - M;
  const rightAlign: "left" | "right" = rtl ? "left" : "right";

  drawLine(page, M, footerTop, PAGE_W - M, footerTop, BORDER, 0.5);

  if (showBankDetails) {
    drawAlignedText(page, labels.bankDetails.toUpperCase(), {
      x: leftX,
      y: footerTop - 12,
      size: 6.5,
      font: fonts.bold,
      color: SLATE,
      align: leftAlign,
    });
    drawAlignedText(page, `${FUSION_COMPANY.bank}  ·  IBAN ${FUSION_COMPANY.iban}`, {
      x: leftX,
      y: footerTop - 24,
      size: 7.5,
      font: fonts.regular,
      color: INK,
      align: leftAlign,
    });

    const legal = `${FUSION_COMPANY.name} ${FUSION_COMPANY.legalForm}  ·  ${FUSION_COMPANY.website}`;
    drawAlignedText(page, legal, {
      x: leftX,
      y: footerTop - 36,
      size: 6.5,
      font: fonts.regular,
      color: MUTED,
      align: leftAlign,
    });

    if (footerNote.trim()) {
      const note = wrapLines(footerNote, fonts.regular, 6.5, CONTENT_W * 0.5)[0] ?? "";
      drawAlignedText(page, note, {
        x: leftX,
        y: footerTop - 48,
        size: 6.5,
        font: fonts.regular,
        color: MUTED,
        align: leftAlign,
      });
    }
  }

  if (dueLabel && dueValue) {
    drawAlignedText(page, dueLabel, {
      x: rightX,
      y: footerTop - 24,
      size: 7.5,
      font: fonts.regular,
      color: MUTED,
      align: rightAlign,
    });
    drawAlignedText(page, dueValue, {
      x: rightX,
      y: footerTop - 36,
      size: 9,
      font: fonts.bold,
      color: BLACK,
      align: rightAlign,
    });
  }

  drawAlignedText(page, `${labels.page} ${pageIndex} / ${totalPages}`, {
    x: rightX,
    y: M + 8,
    size: 7,
    font: fonts.regular,
    color: MUTED,
    align: rightAlign,
  });
}

class PdfWriter {
  private readonly pages: PDFPage[] = [];
  private page!: PDFPage;
  y = HEADER_BOTTOM - 20;
  private readonly theme: PdfTheme;

  constructor(
    private readonly doc: PDFDocument,
    private readonly fonts: Fonts,
    private readonly labels: PdfLabels,
    private readonly docTitle: string,
    private readonly docNumber: string,
    private readonly logo: PDFImage | null,
    private readonly footer: {
      showBankDetails?: boolean;
      footerNote?: string;
      dueLabel?: string;
      dueValue?: string;
    } = {},
    blackAndWhite = false
  ) {
    this.theme = blackAndWhite ? MONO_THEME : BRAND_THEME;
    this.newPage();
  }

  private newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.pages.push(this.page);
    drawPageHeader(
      this.page,
      this.fonts,
      this.labels,
      this.docTitle,
      this.docNumber,
      this.theme,
      this.logo
    );
    this.y = HEADER_BOTTOM - 20;
  }

  private ensureSpace(height: number) {
    if (this.y - height < CONTENT_BOTTOM) this.newPage();
  }

  finalize() {
    const total = this.pages.length;
    this.pages.forEach((page, index) => {
      const last = index === total - 1;
      drawPageFooter(page, this.fonts, this.labels, index + 1, total, {
        showBankDetails: this.footer.showBankDetails,
        footerNote: this.footer.footerNote,
        dueLabel: last ? this.footer.dueLabel : undefined,
        dueValue: last ? this.footer.dueValue : undefined,
      });
    });
  }

  /** Meta info strip — light gray background */
  drawMetaStrip(rows: DocMeta[]) {
    const stripH = 14 * rows.length + 16;
    this.ensureSpace(stripH);

    this.page.drawRectangle({
      x: M,
      y: this.y - stripH + 8,
      width: CONTENT_W,
      height: stripH,
      color: SURFACE,
      borderColor: BORDER,
      borderWidth: 0.75,
    });
    this.page.drawRectangle({
      x: M,
      y: this.y - stripH + 8,
      width: 4,
      height: stripH,
      color: this.theme.accent,
    });

    let cy = this.y - 6;
    const rtl = this.labels.rtl;

    for (const row of rows) {
      if (rtl) {
        drawAlignedText(this.page, t(row.value), {
          x: M + 12,
          y: cy,
          size: 8.5,
          font: this.fonts.bold,
          color: INK,
          align: "left",
        });
        drawAlignedText(this.page, t(row.label), {
          x: PAGE_W - M - 12,
          y: cy,
          size: 8.5,
          font: this.fonts.regular,
          color: SLATE,
          align: "right",
        });
      } else {
        drawAlignedText(this.page, t(row.label), {
          x: M + 12,
          y: cy,
          size: 8.5,
          font: this.fonts.regular,
          color: SLATE,
          align: "left",
        });
        drawAlignedText(this.page, t(row.value), {
          x: PAGE_W - M - 12,
          y: cy,
          size: 8.5,
          font: this.fonts.bold,
          color: INK,
          align: "right",
        });
      }
      cy -= 14;
    }
    this.y = this.y - stripH - 8;
  }

  /** Client card with left black accent bar */
  drawClientBlock(clientName: string, clientType: ClientType) {
    const blockH = 52;
    this.ensureSpace(blockH);
    const rtl = this.labels.rtl;
    const typeLabel = clientTypeLabel(clientType, this.labels);
    const typeW = this.fonts.bold.widthOfTextAtSize(t(typeLabel), 7.5) + 20;

    this.page.drawRectangle({
      x: M,
      y: this.y - blockH + 6,
      width: CONTENT_W,
      height: blockH,
      color: SURFACE,
    });

    /* Accent bar */
    if (rtl) {
      this.page.drawRectangle({
        x: PAGE_W - M - 3,
        y: this.y - blockH + 6,
        width: 3,
        height: blockH,
        color: this.theme.barSecondary,
      });
    } else {
      this.page.drawRectangle({
        x: M,
        y: this.y - blockH + 6,
        width: 3,
        height: blockH,
        color: this.theme.accent,
      });
    }

    const labelX = rtl ? PAGE_W - M - 14 : M + 14;
    const labelAlign: "left" | "right" = rtl ? "right" : "left";
    const badgeX = rtl ? M + 10 : PAGE_W - M - typeW - 10;

    drawAlignedText(this.page, this.labels.client, {
      x: labelX,
      y: this.y - 8,
      size: 7,
      font: this.fonts.bold,
      color: SLATE,
      align: labelAlign,
    });

    this.page.drawRectangle({
      x: badgeX,
      y: this.y - 22,
      width: typeW,
      height: 15,
      borderColor: this.theme.accent,
      borderWidth: 0.75,
      color: WHITE,
    });
    drawAlignedText(this.page, typeLabel, {
      x: badgeX + typeW - 10,
      y: this.y - 19,
      size: 7.5,
      font: this.fonts.bold,
      color: this.theme.accent,
      align: "right",
    });

    drawAlignedText(this.page, clientName, {
      x: labelX,
      y: this.y - 32,
      size: 14,
      font: this.fonts.bold,
      color: BLACK,
      align: labelAlign,
    });

    this.y -= blockH + 12;
  }

  drawItemsTable(items: { description: string; quantity: number; unitPriceTtc: number }[], currency: string) {
    const rows =
      items.length > 0
        ? items
        : [{ description: "—", quantity: 1, unitPriceTtc: 0 }];
    const colX = [M, M + 268, M + 318, M + 398, M + CONTENT_W];
    const headerH = 24;
    const baseRowH = 22;

    const prepared = rows.map((row) => {
      const lineTtc = Math.round(row.quantity * row.unitPriceTtc * 100) / 100;
      const { ht } = splitTtcAmount(lineTtc);
      const unitHt =
        row.quantity > 0
          ? Math.round((ht / row.quantity) * 100) / 100
          : ht;
      const descLines = wrapLines(row.description || "—", this.fonts.regular, 9, 248);
      const rowH = Math.max(baseRowH, descLines.length * 12 + 10);
      return { descLines, quantity: row.quantity, unitHt, totalHt: ht, rowH };
    });

    const bodyH = prepared.reduce((s, r) => s + r.rowH, 0);
    this.ensureSpace(headerH + bodyH + 8);

    const tableTop = this.y;

    this.page.drawRectangle({
      x: M,
      y: tableTop - headerH,
      width: CONTENT_W,
      height: headerH,
      color: this.theme.accent,
    });

    const headers = [this.labels.designation, this.labels.qty, this.labels.unitHt, this.labels.totalHt];
    const headerX = [colX[0] + 10, colX[1] + 10, colX[2] + 10, colX[3] + 10];
    headers.forEach((h, i) => {
      this.page.drawText(t(h).toUpperCase(), {
        x: headerX[i]!,
        y: tableTop - headerH + 8,
        size: 7,
        font: this.fonts.bold,
        color: WHITE,
      });
    });

    let cursorY = tableTop - headerH;
    prepared.forEach((row, index) => {
      const rowTop = cursorY;
      cursorY -= row.rowH;
      if (index % 2 === 1) {
        this.page.drawRectangle({
          x: M,
          y: cursorY,
          width: CONTENT_W,
          height: row.rowH,
          color: SURFACE,
        });
      }

      let textY = rowTop - 14;
      for (const line of row.descLines) {
        this.page.drawText(line, {
          x: colX[0] + 10,
          y: textY,
          size: 9,
          font: this.fonts.regular,
          color: INK,
        });
        textY -= 12;
      }

      const valueY = rowTop - 14;
      this.page.drawText(String(row.quantity), {
        x: colX[1] + 10,
        y: valueY,
        size: 9,
        font: this.fonts.regular,
        color: INK,
      });
      this.page.drawText(t(formatMoneyPdf(row.unitHt, currency)), {
        x: colX[2] + 10,
        y: valueY,
        size: 9,
        font: this.fonts.regular,
        color: INK,
      });
      this.page.drawText(t(formatMoneyPdf(row.totalHt, currency)), {
        x: colX[3] + 10,
        y: valueY,
        size: 9,
        font: this.fonts.bold,
        color: BLACK,
      });
    });

    const tableBottom = cursorY;
    drawLine(this.page, M, tableTop, PAGE_W - M, tableTop, BLACK, 0.5);
    drawLine(this.page, M, tableBottom, PAGE_W - M, tableBottom, BORDER, 0.5);
    drawLine(this.page, M, tableTop, M, tableBottom, BORDER, 0.5);
    drawLine(this.page, PAGE_W - M, tableTop, PAGE_W - M, tableBottom, BORDER, 0.5);

    this.y = tableBottom - 24;
  }

  drawTotals(amountTtc: number, currency: string) {
    const { ht, tva, ttc } = splitTtcAmount(amountTtc);
    const rtl = this.labels.rtl;
    const boxW = 220;
    const boxX = rtl ? M : PAGE_W - M - boxW;
    const boxH = 72;
    this.ensureSpace(boxH + 8);

    this.page.drawRectangle({
      x: boxX,
      y: this.y - boxH,
      width: boxW,
      height: boxH,
      color: SURFACE,
      borderColor: BORDER,
      borderWidth: 0.75,
    });
    this.page.drawRectangle({ x: boxX, y: this.y - 4, width: boxW, height: 4, color: this.theme.totalsBar });
    drawLine(this.page, boxX, this.y, boxX + boxW, this.y, this.theme.accent, 0.5);

    const labelX = rtl ? boxX + 12 : boxX + 12;
    const valueX = rtl ? boxX + boxW - 12 : boxX + boxW - 12;
    const labelAlign: "left" | "right" = "left";
    const valueAlign: "left" | "right" = "right";

    let cy = this.y - 16;
    const rows = [
      { label: this.labels.totalHtLabel, value: formatMoneyPdf(ht, currency), bold: false },
      {
        label: `${this.labels.tva} (${Math.round(FUSION_COMPANY.tvaRate * 100)} %)`,
        value: formatMoneyPdf(tva, currency),
        bold: false,
      },
      { label: this.labels.totalTtc, value: formatMoneyPdf(ttc, currency), bold: true },
    ];

    for (const row of rows) {
      const font = row.bold ? this.fonts.bold : this.fonts.regular;
      const size = row.bold ? 11 : 8.5;
      drawAlignedText(this.page, row.label, {
        x: labelX,
        y: cy,
        size,
        font,
        color: row.bold ? BLACK : SLATE,
        align: labelAlign,
      });
      drawAlignedText(this.page, row.value, {
        x: valueX,
        y: cy,
        size,
        font,
        color: row.bold ? this.theme.totalAccent : BLACK,
        align: valueAlign,
      });
      cy -= row.bold ? 22 : 16;
    }

    this.y = this.y - boxH - 16;
  }

  drawBodyFlow(body: string) {
    if (!body.trim()) return;

    this.ensureSpace(24);
    drawLine(this.page, M, this.y, PAGE_W - M, this.y, BORDER, 0.5);
    this.y -= 20;

    const lines = wrapLines(body, this.fonts.regular, 8.5, CONTENT_W);
    for (const line of lines) {
      if (!line.trim()) {
        this.y -= 6;
        continue;
      }
      this.ensureSpace(12);
      this.page.drawText(line, {
        x: M,
        y: this.y,
        size: 8.5,
        font: this.fonts.regular,
        color: SLATE,
      });
      this.y -= 12;
    }
  }
}

async function createFonts(doc: PDFDocument): Promise<Fonts> {
  return {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
}

async function embedLogo(doc: PDFDocument): Promise<PDFImage | null> {
  const bytes = await loadLogoBytes();
  if (!bytes) return null;
  try {
    return await doc.embedPng(bytes);
  } catch {
    return null;
  }
}

export async function buildQuotePdfBytes(
  quote: QuoteRecord,
  _template?: DocumentTemplate,
  locale: Locale = "fr"
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontSet = await createFonts(doc);
  const logo = await embedLogo(doc);
  const labels = getPdfLabels(locale);

  const issueDate = formatDateFr(quote.createdAt);
  const validUntil = formatDateFr(
    new Date(new Date(quote.createdAt).getTime() + quote.validityDays * 86400000).toISOString()
  );
  const clientType = resolveClientType(quote.clientType);

  const writer = new PdfWriter(
    doc,
    fontSet,
    labels,
    labels.docQuote,
    quote.number,
    logo,
    { showBankDetails: false }
  );

  writer.drawMetaStrip([
    { label: labels.date, value: issueDate },
    {
      label: labels.validity,
      value: `${quote.validityDays} ${labels.days} (${labels.until} ${validUntil})`,
    },
  ]);
  writer.drawClientBlock(quote.clientName, clientType);
  writer.drawItemsTable(quote.items ?? [], quote.currency);
  writer.drawTotals(quote.amount, quote.currency);

  writer.finalize();
  return doc.save();
}

export async function buildInvoicePdfBytes(
  invoice: InvoiceRecord,
  template?: DocumentTemplate,
  linkedQuote?: QuoteRecord,
  locale: Locale = "fr"
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontSet = await createFonts(doc);
  const logo = await embedLogo(doc);
  const labels = getPdfLabels(locale);

  const service = linkedQuote?.service || invoice.notes || "Prestation";
  const footerNote = template?.footerNote ?? "Merci pour votre confiance";
  const clientType = resolveClientType(invoice.clientType ?? linkedQuote?.clientType);
  const items =
    invoice.items?.length
      ? invoice.items
      : linkedQuote?.items?.length
        ? linkedQuote.items
        : [
            {
              description: service,
              quantity: 1,
              unitPriceTtc: invoice.amount,
            },
          ];

  const writer = new PdfWriter(
    doc,
    fontSet,
    labels,
    labels.docInvoice,
    invoice.number,
    logo,
    {
      showBankDetails: true,
      footerNote,
      dueLabel: labels.dueDate,
      dueValue: formatDateFr(invoice.dueDate),
    },
    true
  );

  writer.drawMetaStrip([
    { label: labels.date, value: formatDateFr(invoice.createdAt) },
    { label: labels.dueDate, value: formatDateFr(invoice.dueDate) },
  ]);
  writer.drawClientBlock(invoice.clientName, clientType);
  writer.drawItemsTable(items, invoice.currency);
  writer.drawTotals(invoice.amount, invoice.currency);

  writer.finalize();
  return doc.save();
}

export function downloadPdfBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as BlobPart], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadQuotePdf(
  quote: QuoteRecord,
  template?: DocumentTemplate,
  locale: Locale = "fr"
) {
  const bytes = await buildQuotePdfBytes(quote, template, locale);
  downloadPdfBytes(bytes, `${quote.number}.pdf`);
}

export async function downloadInvoicePdf(
  invoice: InvoiceRecord,
  template?: DocumentTemplate,
  linkedQuote?: QuoteRecord,
  locale: Locale = "fr"
) {
  const bytes = await buildInvoicePdfBytes(invoice, template, linkedQuote, locale);
  downloadPdfBytes(bytes, `${invoice.number}.pdf`);
}
