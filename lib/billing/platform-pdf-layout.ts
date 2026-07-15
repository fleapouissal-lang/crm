import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { FUSION_COMPANY } from "@/lib/finance/company-info";
import { pdfSafe } from "@/lib/finance/pdf/pdf-text";

export const PAGE_W = 595.28;
export const PAGE_H = 841.89;
export const M = 48;
export const CONTENT_W = PAGE_W - M * 2;

export const IRIS = rgb(0.48, 0.35, 0.95);
export const GOLD = rgb(0.94, 0.58, 0.28);
export const BLACK = rgb(0.06, 0.06, 0.06);
export const INK = rgb(0.14, 0.14, 0.16);
export const SLATE = rgb(0.38, 0.38, 0.42);
export const MUTED = rgb(0.52, 0.52, 0.56);
export const BORDER = rgb(0.88, 0.88, 0.9);
export const SURFACE = rgb(0.97, 0.97, 0.98);
export const WHITE = rgb(1, 1, 1);

export type PdfFonts = { regular: PDFFont; bold: PDFFont };

type LayoutTheme = {
  barPrimary: ReturnType<typeof rgb>;
  barSecondary: ReturnType<typeof rgb>;
  accent: ReturnType<typeof rgb>;
  accentAlt: ReturnType<typeof rgb>;
  highlight: ReturnType<typeof rgb>;
};

function layoutTheme(monochrome = false): LayoutTheme {
  if (monochrome) {
    return {
      barPrimary: BLACK,
      barSecondary: BLACK,
      accent: BLACK,
      accentAlt: BLACK,
      highlight: BLACK,
    };
  }
  return {
    barPrimary: IRIS,
    barSecondary: GOLD,
    accent: IRIS,
    accentAlt: GOLD,
    highlight: GOLD,
  };
}

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

export async function createPdfFonts(doc: PDFDocument): Promise<PdfFonts> {
  return {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
}

export async function embedBrandLogo(doc: PDFDocument): Promise<PDFImage | null> {
  const bytes = await loadLogoBytes();
  if (!bytes) return null;
  try {
    return await doc.embedPng(bytes);
  } catch {
    return null;
  }
}

export function t(value: string): string {
  return pdfSafe(value);
}

export function drawText(
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

export function drawRight(
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

export function drawBrandBar(page: PDFPage, monochrome = false) {
  const theme = layoutTheme(monochrome);
  page.drawRectangle({ x: 0, y: PAGE_H - 5, width: PAGE_W / 2, height: 5, color: theme.barPrimary });
  page.drawRectangle({
    x: PAGE_W / 2,
    y: PAGE_H - 5,
    width: PAGE_W / 2,
    height: 5,
    color: theme.barSecondary,
  });
}

export function drawPremiumHeader(
  page: PDFPage,
  fonts: PdfFonts,
  opts: {
    docKind: string;
    docNumber: string;
    subtitle: string;
    metaLine: string;
    logo?: PDFImage | null;
    monochrome?: boolean;
  }
) {
  const theme = layoutTheme(opts.monochrome);
  drawBrandBar(page, opts.monochrome);

  const logoW = 96;
  const logoH = 34;
  if (opts.logo) {
    const aspect = opts.logo.width / opts.logo.height;
    let drawW = logoW;
    let drawH = logoH;
    if (aspect > logoW / logoH) drawH = logoW / aspect;
    else drawW = logoH * aspect;
    page.drawImage(opts.logo, {
      x: M,
      y: PAGE_H - M - logoH,
      width: drawW,
      height: drawH,
    });
  } else {
    drawText(page, FUSION_COMPANY.name, M, PAGE_H - M - 18, 16, fonts.bold, theme.accent);
  }

  drawText(page, FUSION_COMPANY.legalForm, M, PAGE_H - M - 36, 8, fonts.regular, MUTED);
  drawText(
    page,
    `${FUSION_COMPANY.addressLine1}, ${FUSION_COMPANY.addressLine2}`,
    M,
    PAGE_H - M - 48,
    7.5,
    fonts.regular,
    MUTED
  );

  drawRight(page, opts.docKind.toUpperCase(), PAGE_W - M, PAGE_H - M - 16, 11, fonts.bold, theme.accent);
  drawRight(page, opts.docNumber, PAGE_W - M, PAGE_H - M - 34, 16, fonts.bold, BLACK);

  const ribbonY = PAGE_H - M - 88;
  page.drawRectangle({
    x: M,
    y: ribbonY,
    width: CONTENT_W,
    height: 44,
    color: SURFACE,
    borderColor: BORDER,
    borderWidth: 0.75,
  });
  page.drawRectangle({ x: M, y: ribbonY, width: 4, height: 44, color: theme.accent });

  drawText(page, opts.subtitle, M + 14, ribbonY + 26, 11, fonts.bold, BLACK);
  drawText(page, opts.metaLine, M + 14, ribbonY + 10, 8.5, fonts.regular, SLATE);

  return ribbonY - 16;
}

export function drawPartyCards(
  page: PDFPage,
  fonts: PdfFonts,
  y: number,
  labels: { issuer: string; recipient: string },
  recipientName: string,
  recipientSub?: string,
  monochrome = false
): number {
  const theme = layoutTheme(monochrome);
  const colW = (CONTENT_W - 14) / 2;
  const cardH = 82;

  page.drawRectangle({
    x: M,
    y: y - cardH,
    width: colW,
    height: cardH,
    color: WHITE,
    borderColor: BORDER,
    borderWidth: 0.75,
  });
  page.drawRectangle({
    x: M + colW + 14,
    y: y - cardH,
    width: colW,
    height: cardH,
    color: WHITE,
    borderColor: BORDER,
    borderWidth: 0.75,
  });
  page.drawRectangle({ x: M, y: y - cardH, width: 3, height: cardH, color: theme.accent });
  page.drawRectangle({
    x: M + colW + 14,
    y: y - cardH,
    width: 3,
    height: cardH,
    color: theme.accentAlt,
  });

  drawText(page, labels.issuer.toUpperCase(), M + 12, y - 18, 7, fonts.bold, MUTED);
  drawText(page, FUSION_COMPANY.name, M + 12, y - 36, 11, fonts.bold, BLACK);
  drawText(page, FUSION_COMPANY.email, M + 12, y - 52, 8.5, fonts.regular, SLATE);
  drawText(page, FUSION_COMPANY.phone, M + 12, y - 66, 8.5, fonts.regular, SLATE);

  const rx = M + colW + 14;
  drawText(page, labels.recipient.toUpperCase(), rx + 12, y - 18, 7, fonts.bold, MUTED);
  drawText(page, recipientName, rx + 12, y - 36, 11, fonts.bold, BLACK);
  if (recipientSub) {
    drawText(page, recipientSub, rx + 12, y - 52, 8.5, fonts.regular, SLATE);
  }

  return y - cardH - 20;
}

export function drawLineTable(
  page: PDFPage,
  fonts: PdfFonts,
  y: number,
  labels: { description: string; amount: string },
  lineLabel: string,
  amount: string,
  monochrome = false
): number {
  const theme = layoutTheme(monochrome);
  page.drawRectangle({
    x: M,
    y: y - 24,
    width: CONTENT_W,
    height: 24,
    color: theme.accent,
  });
  drawText(page, labels.description.toUpperCase(), M + 10, y - 16, 8, fonts.bold, WHITE);
  drawRight(page, labels.amount.toUpperCase(), PAGE_W - M - 10, y - 16, 8, fonts.bold, WHITE);
  y -= 24;

  page.drawRectangle({
    x: M,
    y: y - 40,
    width: CONTENT_W,
    height: 40,
    color: WHITE,
    borderColor: BORDER,
    borderWidth: 0.75,
  });
  drawText(page, lineLabel, M + 10, y - 24, 10, fonts.regular, INK);
  drawRight(page, amount, PAGE_W - M - 10, y - 24, 11, fonts.bold, BLACK);

  return y - 56;
}

export function drawMetaGrid(
  page: PDFPage,
  fonts: PdfFonts,
  y: number,
  metas: [string, string][]
): number {
  const count = metas.length;
  const gap = 6;
  const boxW = (CONTENT_W - gap * (count - 1)) / count;
  const boxH = 52;

  metas.forEach(([label, value], i) => {
    const x = M + i * (boxW + gap);
    page.drawRectangle({
      x,
      y: y - boxH,
      width: boxW,
      height: boxH,
      color: SURFACE,
      borderColor: BORDER,
      borderWidth: 0.6,
    });
    drawText(page, label.toUpperCase(), x + 8, y - 16, 6.5, fonts.bold, MUTED);
    const valueSize = value.length > 18 ? 8 : 9;
    drawText(page, value, x + 8, y - 34, valueSize, fonts.bold, BLACK);
  });

  return y - boxH - 18;
}

export function drawAmountHighlight(
  page: PDFPage,
  fonts: PdfFonts,
  y: number,
  label: string,
  amount: string,
  monochrome = false
): number {
  const theme = layoutTheme(monochrome);
  const boxW = 240;
  const boxH = 56;
  const boxX = PAGE_W - M - boxW;

  page.drawRectangle({
    x: boxX,
    y: y - boxH,
    width: boxW,
    height: boxH,
    color: SURFACE,
    borderColor: BORDER,
    borderWidth: 0.75,
  });
  page.drawRectangle({ x: boxX, y: y - 4, width: boxW, height: 4, color: theme.highlight });

  drawText(page, label.toUpperCase(), boxX + 12, y - 20, 7, fonts.bold, MUTED);
  drawRight(page, amount, PAGE_W - M - 12, y - 40, 16, fonts.bold, theme.accent);

  return y - boxH - 16;
}

export function drawNotesBlock(
  page: PDFPage,
  fonts: PdfFonts,
  y: number,
  label: string,
  notes: string
): number {
  if (!notes.trim()) return y;
  drawText(page, label.toUpperCase(), M, y, 7.5, fonts.bold, MUTED);
  y -= 14;
  const lines = t(notes).split(/\r?\n/);
  for (const line of lines.slice(0, 6)) {
    drawText(page, line.slice(0, 95), M, y, 9, fonts.regular, INK);
    y -= 13;
  }
  return y - 8;
}

export function drawPremiumFooter(page: PDFPage, fonts: PdfFonts, thanks: string, bankLine?: string) {
  const footerTop = M + 58;
  page.drawLine({
    start: { x: M, y: footerTop },
    end: { x: PAGE_W - M, y: footerTop },
    thickness: 0.6,
    color: BORDER,
  });

  if (bankLine) {
    drawText(page, bankLine, M, footerTop - 14, 8.5, fonts.regular, INK);
  }

  drawText(page, thanks, M, footerTop - 28, 9, fonts.regular, MUTED);
  drawText(
    page,
    `${FUSION_COMPANY.addressLine1}, ${FUSION_COMPANY.addressLine2} · ${FUSION_COMPANY.country}`,
    M,
    footerTop - 42,
    7.5,
    fonts.regular,
    MUTED
  );
  drawText(
    page,
    `${FUSION_COMPANY.ice} · ${FUSION_COMPANY.rc} · ${FUSION_COMPANY.website}`,
    M,
    footerTop - 54,
    7.5,
    fonts.regular,
    MUTED
  );
}
