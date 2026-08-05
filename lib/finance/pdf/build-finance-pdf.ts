import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFImage,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type { Locale } from "@/lib/i18n/types";
import {
  financeIssuerFromOrganization,
  type FinanceIssuer,
} from "../company-info";
import { formatDateFr, splitTtcAmount } from "../render-template";
import { paginateLineItems } from "../document-pagination";
import type {
  ClientDetails,
  ClientType,
  DocumentTemplate,
  InvoiceRecord,
  QuoteRecord,
} from "../types";
import { pdfSafe, formatAmountFr } from "./pdf-text";
import {
  getPdfLabels,
  resolveClientType,
  type PdfLabels,
} from "./pdf-labels";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
/** ~15 mm side margins — same left/right so the sheet looks centered. */
const PAD_X = 42.5;
const PAD_T = 40;
const CONTENT_LEFT = PAD_X;
const CONTENT_RIGHT = PAGE_W - PAD_X;
const CONTENT_W = CONTENT_RIGHT - CONTENT_LEFT;

/* Professional monochrome palette */
const INK = rgb(0.09, 0.09, 0.09);
const MUTED = rgb(0.43, 0.43, 0.43);
const HAIRLINE = rgb(0.87, 0.87, 0.87);
const WHITE = rgb(1, 1, 1);

type Fonts = { regular: PDFFont; bold: PDFFont };
type DocMeta = { label: string; value: string };

const logoBytesCache = new Map<string, Uint8Array | null>();

function issuerLogoCandidates(issuer: FinanceIssuer): string[] {
  const list: string[] = [];
  const push = (url: string | null | undefined) => {
    const trimmed = url?.trim();
    if (trimmed && !list.includes(trimmed)) list.push(trimmed);
  };

  push(issuer.logoUrl);
  push(issuer.storedLogoUrl);
  if (issuer.organizationId) {
    push(`/api/org-logos/${issuer.organizationId}`);
  }
  return list;
}

async function fetchLogoBytes(url: string): Promise<Uint8Array | null> {
  if (logoBytesCache.has(url)) return logoBytesCache.get(url) ?? null;
  try {
    const res = await fetch(url, { referrerPolicy: "no-referrer", cache: "no-store" });
    if (!res.ok) {
      logoBytesCache.set(url, null);
      return null;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (!bytes.byteLength) {
      logoBytesCache.set(url, null);
      return null;
    }
    logoBytesCache.set(url, bytes);
    return bytes;
  } catch {
    logoBytesCache.set(url, null);
    return null;
  }
}

async function imageBytesToPng(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof window === "undefined") return null;
  const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer]);
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("logo_decode_failed"));
      el.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, img.naturalWidth || img.width);
    canvas.height = Math.max(1, img.naturalHeight || img.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!pngBlob) return null;
    return new Uint8Array(await pngBlob.arrayBuffer());
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadLogoBytes(issuer: FinanceIssuer): Promise<Uint8Array | null> {
  if (typeof window === "undefined") return null;
  for (const url of issuerLogoCandidates(issuer)) {
    const bytes = await fetchLogoBytes(url);
    if (bytes) return bytes;
  }
  return null;
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
  color = HAIRLINE,
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
    align: "left" | "right" | "center";
  }
) {
  const safe = t(text);
  const w = opts.font.widthOfTextAtSize(safe, opts.size);
  const x =
    opts.align === "right"
      ? opts.x - w
      : opts.align === "center"
        ? opts.x - w / 2
        : opts.x;
  page.drawText(safe, { x, y: opts.y, size: opts.size, font: opts.font, color: opts.color });
}

/** Draws text with extra letter spacing; returns total width. */
function drawSpacedText(
  page: PDFPage,
  text: string,
  opts: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color: ReturnType<typeof rgb>;
    spacing: number;
    align?: "left" | "right";
  }
): number {
  const safe = t(text);
  const chars = [...safe];
  const total =
    chars.reduce((sum, c) => sum + opts.font.widthOfTextAtSize(c, opts.size), 0) +
    opts.spacing * Math.max(0, chars.length - 1);
  let x = opts.align === "right" ? opts.x - total : opts.x;
  for (const c of chars) {
    page.drawText(c, { x, y: opts.y, size: opts.size, font: opts.font, color: opts.color });
    x += opts.font.widthOfTextAtSize(c, opts.size) + opts.spacing;
  }
  return total;
}

function drawPaymentStamp(page: PDFPage, fonts: Fonts, labels: PdfLabels, paid: boolean) {
  const label = paid ? labels.paid : labels.unpaid;
  const size = 28;
  const text = t(label);
  const tw = fonts.bold.widthOfTextAtSize(text, size);
  const padX = 14;
  const padY = 10;
  const boxW = tw + padX * 2;
  const boxH = size + padY * 2;
  const cx = PAGE_W / 2;
  const cy = PAGE_H / 2 - 20;
  const angle = degrees(-18);

  page.drawRectangle({
    x: cx - boxW / 2,
    y: cy - boxH / 2,
    width: boxW,
    height: boxH,
    borderColor: INK,
    borderWidth: 2,
    color: WHITE,
    opacity: 0.35,
    borderOpacity: 0.65,
    rotate: angle,
  });
  page.drawText(text, {
    x: cx - tw / 2,
    y: cy - size * 0.32,
    size,
    font: fonts.bold,
    color: INK,
    rotate: angle,
    opacity: 0.65,
  });
}

function issuerHeaderLinesPdf(issuer: FinanceIssuer): string[] {
  const address = [issuer.addressLine1, issuer.addressLine2, issuer.country]
    .filter(Boolean)
    .join(", ");
  const contact = [issuer.phone, issuer.email, issuer.website]
    .filter(Boolean)
    .join("  -  ");
  return [address, contact].filter((l) => l.trim().length > 0);
}

function issuerLegalLinesPdf(issuer: FinanceIssuer): string[] {
  const identity = [issuer.name, issuer.legalForm].filter(Boolean).join(" - ");
  const legal = [issuer.ice, issuer.rc, issuer.taxId, issuer.capital]
    .filter(Boolean)
    .join("  -  ");
  const banking = [issuer.bank, issuer.iban].filter(Boolean).join("  -  ");
  return [
    [identity, legal].filter(Boolean).join("   |   "),
    banking,
  ].filter((l) => l.trim().length > 0);
}

function clientDetailLinesPdf(details?: ClientDetails | null): string[] {
  if (!details) return [];
  return [
    details.ice?.trim() ? `ICE : ${details.ice.trim()}` : "",
    details.rc?.trim() ? `RC : ${details.rc.trim()}` : "",
    details.address?.trim() ?? "",
  ].filter(Boolean);
}

function drawLegalFooter(page: PDFPage, fonts: Fonts, issuer: FinanceIssuer) {
  const lines = issuerLegalLinesPdf(issuer);
  if (!lines.length) return;
  const topY = 30 + lines.length * 9;
  drawLine(page, CONTENT_LEFT, topY, CONTENT_RIGHT, topY, HAIRLINE, 0.75);
  let y = topY - 12;
  for (const line of lines) {
    drawAlignedText(page, line, {
      x: PAGE_W / 2,
      y,
      size: 6,
      font: fonts.regular,
      color: MUTED,
      align: "center",
    });
    y -= 9;
  }
}

type TableItem = { description: string; quantity: number; unitPriceTtc: number };

function renderFinanceDocumentPdf(options: {
  doc: PDFDocument;
  fonts: Fonts;
  labels: PdfLabels;
  issuer: FinanceIssuer;
  logo: PDFImage | null;
  documentKind: "quote" | "invoice";
  docTitle: string;
  statusLabel?: string;
  metaRows: DocMeta[];
  clientName: string;
  clientType: ClientType;
  clientDetails?: ClientDetails | null;
  items: TableItem[];
  amountTtc: number;
  currency: string;
  notes?: string | null;
  showPayStamp?: boolean;
  isPaid?: boolean;
}) {
  const {
    doc,
    fonts,
    labels,
    issuer,
    logo,
    documentKind,
    docTitle,
    statusLabel,
    metaRows,
    clientName,
    clientDetails,
    items,
    amountTtc,
    currency,
    notes,
    showPayStamp,
    isPaid,
  } = options;

  const recipientLabel =
    documentKind === "quote" ? labels.clientTo : labels.billedTo;
  const docNumber = metaRows[0]?.value ?? "";
  const infoRows = metaRows.slice(1);
  const clientLines = clientDetailLinesPdf(clientDetails);

  const rows =
    items.length > 0 ? items : [{ description: "—", quantity: 1, unitPriceTtc: 0 }];
  const pages = paginateLineItems(rows);
  const totalPages = pages.length;
  const priceMode = issuer.priceMode;
  const unitLabel = priceMode === "ht" ? labels.unitHt : labels.lineUnitTtc;
  const { ht, tva, ttc } = splitTtcAmount(amountTtc, issuer.tvaRate);
  const tvaPct = Math.round(issuer.tvaRate * 1000) / 10;

  /* Balanced columns — designation ~48%, numeric cols share the rest evenly */
  const colQty = 50;
  const colUnit = 100;
  const colAmt = 100;
  const colDesc = CONTENT_W - colQty - colUnit - colAmt;
  const colDescX = CONTENT_LEFT;
  const colQtyRight = CONTENT_LEFT + colDesc + colQty;
  const colUnitRight = colQtyRight + colUnit;
  const colAmtRight = CONTENT_RIGHT;

  pages.forEach((pageItems, pageIndex) => {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    const isFirst = pageIndex === 0;
    const isLast = pageIndex === totalPages - 1;
    let y = PAGE_H - PAD_T;

    if (isFirst) {
      /* Masthead: logo + company left, bill-to right */
      const mastTop = y;
      let coX = CONTENT_LEFT;
      let coBottom = mastTop - 12;
      if (logo) {
        const maxW = 78;
        const maxH = 32;
        const scale = Math.min(maxW / logo.width, maxH / logo.height, 1);
        const w = logo.width * scale;
        const h = logo.height * scale;
        page.drawImage(logo, {
          x: CONTENT_LEFT,
          y: mastTop - h + 2,
          width: w,
          height: h,
        });
        coX = CONTENT_LEFT + w + 10;
      }
      page.drawText(t(issuer.name), {
        x: coX,
        y: mastTop - 9,
        size: 11.5,
        font: fonts.bold,
        color: INK,
      });
      let coY = mastTop - 21;
      for (const line of issuerHeaderLinesPdf(issuer)) {
        page.drawText(t(line), {
          x: coX,
          y: coY,
          size: 6.5,
          font: fonts.regular,
          color: MUTED,
        });
        coY -= 9;
      }
      coBottom = coY;

      drawSpacedText(page, t(recipientLabel).toUpperCase(), {
        x: CONTENT_RIGHT,
        y: mastTop - 6,
        size: 6.5,
        font: fonts.bold,
        color: MUTED,
        spacing: 1.2,
        align: "right",
      });
      drawAlignedText(page, clientName || "—", {
        x: CONTENT_RIGHT,
        y: mastTop - 22,
        size: 12,
        font: fonts.bold,
        color: INK,
        align: "right",
      });
      let clientY = mastTop - 34;
      for (const line of clientLines) {
        drawAlignedText(page, line, {
          x: CONTENT_RIGHT,
          y: clientY,
          size: 7,
          font: fonts.regular,
          color: MUTED,
          align: "right",
        });
        clientY -= 9;
      }

      /* Full-width rule */
      const ruleY = Math.min(coBottom, clientY) - 10;
      drawLine(page, CONTENT_LEFT, ruleY, CONTENT_RIGHT, ruleY, INK, 2.25);

      /* Below rule: document title left, meta right */
      let infoY = ruleY - 20;
      drawSpacedText(page, t(docTitle).toUpperCase(), {
        x: CONTENT_LEFT,
        y: infoY,
        size: 16,
        font: fonts.bold,
        color: INK,
        spacing: 2.4,
      });
      page.drawText(t(docNumber), {
        x: CONTENT_LEFT,
        y: infoY - 14,
        size: 9,
        font: fonts.bold,
        color: INK,
      });
      let titleBottom = infoY - 14;
      if (statusLabel) {
        drawSpacedText(page, t(statusLabel).toUpperCase(), {
          x: CONTENT_LEFT,
          y: infoY - 26,
          size: 6,
          font: fonts.bold,
          color: MUTED,
          spacing: 1.2,
        });
        titleBottom = infoY - 26;
      }

      const metaW = 168;
      const metaLeft = CONTENT_RIGHT - metaW;
      const metaLabelRight = metaLeft + 58;
      let metaY = infoY;
      for (const row of infoRows) {
        drawAlignedText(page, row.label, {
          x: metaLabelRight,
          y: metaY,
          size: 7.5,
          font: fonts.regular,
          color: MUTED,
          align: "right",
        });
        drawAlignedText(page, row.value, {
          x: CONTENT_RIGHT,
          y: metaY,
          size: 7.5,
          font: fonts.bold,
          color: INK,
          align: "right",
        });
        metaY -= 13;
      }

      y = Math.min(titleBottom, metaY) - 14;
    } else {
      drawAlignedText(
        page,
        `${t(docTitle).toUpperCase()} — ${t(labels.documentContinuation).toUpperCase()}`,
        {
          x: CONTENT_LEFT,
          y: y - 8,
          size: 8,
          font: fonts.bold,
          color: INK,
          align: "left",
        }
      );
      drawAlignedText(page, docNumber, {
        x: CONTENT_RIGHT,
        y: y - 8,
        size: 8,
        font: fonts.bold,
        color: INK,
        align: "right",
      });
      drawLine(page, CONTENT_LEFT, y - 16, CONTENT_RIGHT, y - 16, INK, 2.25);
      y -= 34;
    }

    /* Items table — headers share the same right edges as cell values */
    const tableTop = y;
    const headerBaseline = tableTop - 8;
    page.drawText(t(labels.designation).toUpperCase(), {
      x: colDescX,
      y: headerBaseline,
      size: 6.5,
      font: fonts.bold,
      color: INK,
    });
    drawAlignedText(page, t(labels.qty).toUpperCase(), {
      x: colQtyRight,
      y: headerBaseline,
      size: 6.5,
      font: fonts.bold,
      color: INK,
      align: "right",
    });
    drawAlignedText(page, t(unitLabel).toUpperCase(), {
      x: colUnitRight,
      y: headerBaseline,
      size: 6.5,
      font: fonts.bold,
      color: INK,
      align: "right",
    });
    drawAlignedText(page, t(labels.lineAmount).toUpperCase(), {
      x: colAmtRight,
      y: headerBaseline,
      size: 6.5,
      font: fonts.bold,
      color: INK,
      align: "right",
    });
    drawLine(page, CONTENT_LEFT, tableTop - 14, CONTENT_RIGHT, tableTop - 14, INK, 1.35);

    let cursorY = tableTop - 14;
    const baseRowH = 21;
    const prepared = pageItems.map((row) => {
      const lineTtc = Math.round(row.quantity * row.unitPriceTtc * 100) / 100;
      const split = splitTtcAmount(lineTtc, issuer.tvaRate);
      const unitHt =
        row.quantity > 0
          ? Math.round((split.ht / row.quantity) * 100) / 100
          : split.ht;
      const unitDisplay = priceMode === "ht" ? unitHt : row.unitPriceTtc;
      const totalDisplay = priceMode === "ht" ? split.ht : lineTtc;
      const descLines = wrapLines(
        row.description || "—",
        fonts.regular,
        8,
        colDesc - 8
      );
      const rowH = Math.max(baseRowH, descLines.length * 10 + 11);
      return { descLines, quantity: row.quantity, unitDisplay, totalDisplay, rowH };
    });

    prepared.forEach((row) => {
      const rowTop = cursorY;
      cursorY -= row.rowH;

      const valueY = rowTop - 14;
      let textY = valueY;
      for (const line of row.descLines) {
        page.drawText(line, {
          x: colDescX,
          y: textY,
          size: 8,
          font: fonts.regular,
          color: INK,
        });
        textY -= 10;
      }
      drawAlignedText(page, String(row.quantity), {
        x: colQtyRight,
        y: valueY,
        size: 8,
        font: fonts.regular,
        color: INK,
        align: "right",
      });
      drawAlignedText(page, formatMoneyPdf(row.unitDisplay, currency), {
        x: colUnitRight,
        y: valueY,
        size: 8,
        font: fonts.regular,
        color: INK,
        align: "right",
      });
      drawAlignedText(page, formatMoneyPdf(row.totalDisplay, currency), {
        x: colAmtRight,
        y: valueY,
        size: 8,
        font: fonts.bold,
        color: INK,
        align: "right",
      });
      drawLine(page, CONTENT_LEFT, cursorY, CONTENT_RIGHT, cursorY, HAIRLINE, 0.6);
    });

    if (isLast) {
      /* Totals: same right edge as amount column, width = unit + amount */
      const sumsW = colUnit + colAmt;
      const sumsX = CONTENT_RIGHT - sumsW;
      const sumRowH = 17;
      let sumsY = cursorY - 10;

      const sumRows = [
        { label: labels.subtotal, value: formatMoneyPdf(ht, currency) },
        {
          label: `${labels.tva} (${tvaPct} %)`,
          value: formatMoneyPdf(tva, currency),
        },
      ];
      for (const sumRow of sumRows) {
        page.drawText(t(sumRow.label), {
          x: sumsX,
          y: sumsY - 11,
          size: 7.5,
          font: fonts.regular,
          color: MUTED,
        });
        drawAlignedText(page, sumRow.value, {
          x: CONTENT_RIGHT,
          y: sumsY - 11,
          size: 7.5,
          font: fonts.bold,
          color: INK,
          align: "right",
        });
        drawLine(
          page,
          sumsX,
          sumsY - sumRowH,
          CONTENT_RIGHT,
          sumsY - sumRowH,
          HAIRLINE,
          0.6
        );
        sumsY -= sumRowH;
      }

      sumsY -= 4;
      drawLine(page, sumsX, sumsY, CONTENT_RIGHT, sumsY, INK, 2);
      drawSpacedText(page, t(labels.totalToPay).toUpperCase(), {
        x: sumsX,
        y: sumsY - 15,
        size: 7.5,
        font: fonts.bold,
        color: INK,
        spacing: 1,
      });
      drawAlignedText(page, formatMoneyPdf(ttc, currency), {
        x: CONTENT_RIGHT,
        y: sumsY - 16,
        size: 11.5,
        font: fonts.bold,
        color: INK,
        align: "right",
      });

      /* Bottom: terms left + signature right, above the legal footer */
      const bottomTop = Math.max(sumsY - 58, 128);

      if (notes?.trim()) {
        drawSpacedText(page, t(labels.terms).toUpperCase(), {
          x: CONTENT_LEFT,
          y: bottomTop,
          size: 6.5,
          font: fonts.bold,
          color: INK,
          spacing: 1.2,
        });
        const termLines = wrapLines(notes, fonts.regular, 7, CONTENT_W * 0.5);
        let lineY = bottomTop - 11;
        for (const line of termLines.slice(0, 5)) {
          page.drawText(line, {
            x: CONTENT_LEFT,
            y: lineY,
            size: 7,
            font: fonts.regular,
            color: MUTED,
          });
          lineY -= 9;
        }
      }

      const sigW = sumsW * 0.72;
      const sigRight = CONTENT_RIGHT;
      const sigLeft = sigRight - sigW;
      const sigMid = (sigLeft + sigRight) / 2;
      drawLine(page, sigLeft, bottomTop - 18, sigRight, bottomTop - 18, INK, 0.9);
      drawAlignedText(page, issuer.name, {
        x: sigMid,
        y: bottomTop - 29,
        size: 8,
        font: fonts.bold,
        color: INK,
        align: "center",
      });
      drawAlignedText(page, t(labels.signature).toUpperCase(), {
        x: sigMid,
        y: bottomTop - 39,
        size: 6,
        font: fonts.regular,
        color: MUTED,
        align: "center",
      });
    }

    drawLegalFooter(page, fonts, issuer);

    if (isFirst && showPayStamp && typeof isPaid === "boolean") {
      drawPaymentStamp(page, fonts, labels, isPaid);
    }
  });
}

async function createFonts(doc: PDFDocument): Promise<Fonts> {
  return {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
}

async function embedLogo(
  doc: PDFDocument,
  issuer: FinanceIssuer
): Promise<PDFImage | null> {
  const bytes = await loadLogoBytes(issuer);
  if (!bytes) return null;

  try {
    return await doc.embedPng(bytes);
  } catch {
    /* try jpg next */
  }
  try {
    return await doc.embedJpg(bytes);
  } catch {
    /* convert via canvas */
  }

  const png = await imageBytesToPng(bytes);
  if (!png) return null;
  try {
    return await doc.embedPng(png);
  } catch {
    return null;
  }
}

function resolveIssuer(issuer?: FinanceIssuer | null): FinanceIssuer {
  return issuer ?? financeIssuerFromOrganization(null);
}

export async function buildQuotePdfBytes(
  quote: QuoteRecord,
  _template?: DocumentTemplate,
  locale: Locale = "fr",
  issuerInput?: FinanceIssuer | null
): Promise<Uint8Array> {
  const issuer = resolveIssuer(issuerInput);
  const doc = await PDFDocument.create();
  const fontSet = await createFonts(doc);
  const labels = getPdfLabels(locale);
  const logo = await embedLogo(doc, issuer);

  const issueDate = formatDateFr(quote.createdAt);
  const validUntil = formatDateFr(
    new Date(new Date(quote.createdAt).getTime() + quote.validityDays * 86400000).toISOString()
  );

  renderFinanceDocumentPdf({
    doc,
    fonts: fontSet,
    labels,
    issuer,
    logo,
    documentKind: "quote",
    docTitle: labels.docQuote,
    metaRows: [
      { label: labels.docNumber, value: quote.number },
      { label: labels.date, value: issueDate },
      {
        label: labels.validity,
        value: `${quote.validityDays} ${labels.days} - ${validUntil}`,
      },
    ],
    clientDetails: quote.clientDetails,
    clientName: quote.clientName,
    clientType: resolveClientType(quote.clientType),
    items: quote.items ?? [],
    amountTtc: quote.amount,
    currency: quote.currency,
    notes: quote.notes,
  });

  return doc.save();
}

export async function buildInvoicePdfBytes(
  invoice: InvoiceRecord,
  _template?: DocumentTemplate,
  linkedQuote?: QuoteRecord,
  locale: Locale = "fr",
  issuerInput?: FinanceIssuer | null
): Promise<Uint8Array> {
  const issuer = resolveIssuer(issuerInput);
  const doc = await PDFDocument.create();
  const fontSet = await createFonts(doc);
  const labels = getPdfLabels(locale);
  const logo = await embedLogo(doc, issuer);

  const service = linkedQuote?.service || invoice.notes || "Prestation";
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

  const issueDate = formatDateFr(invoice.createdAt);
  const isPaid = invoice.status === "paid";
  const metaRows: DocMeta[] = [
    { label: labels.docNumber, value: invoice.number },
    { label: labels.date, value: issueDate },
  ];

  renderFinanceDocumentPdf({
    doc,
    fonts: fontSet,
    labels,
    issuer,
    logo,
    documentKind: "invoice",
    docTitle: labels.docInvoice,
    metaRows,
    clientDetails: invoice.clientDetails,
    clientName: invoice.clientName,
    clientType: resolveClientType(invoice.clientType ?? linkedQuote?.clientType),
    items,
    amountTtc: invoice.amount,
    currency: invoice.currency,
    notes: invoice.notes,
    showPayStamp: true,
    isPaid,
  });

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
  locale: Locale = "fr",
  issuer?: FinanceIssuer | null
) {
  const bytes = await buildQuotePdfBytes(quote, template, locale, issuer);
  downloadPdfBytes(bytes, `${quote.number}.pdf`);
}

export async function downloadInvoicePdf(
  invoice: InvoiceRecord,
  template?: DocumentTemplate,
  linkedQuote?: QuoteRecord,
  locale: Locale = "fr",
  issuer?: FinanceIssuer | null
) {
  const bytes = await buildInvoicePdfBytes(invoice, template, linkedQuote, locale, issuer);
  downloadPdfBytes(bytes, `${invoice.number}.pdf`);
}
