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
export const INK = rgb(0.12, 0.12, 0.12);
export const SLATE = rgb(0.35, 0.35, 0.35);
export const MUTED = rgb(0.48, 0.48, 0.48);
export const BORDER = rgb(0.82, 0.82, 0.82);
export const SURFACE = rgb(0.96, 0.96, 0.96);
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
  if (monochrome) {
    page.drawRectangle({
      x: 0,
      y: PAGE_H - 4,
      width: PAGE_W,
      height: 4,
      color: BLACK,
    });
    return;
  }
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 5,
    width: PAGE_W / 2,
    height: 5,
    color: theme.barPrimary,
  });
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
    drawText(page, FUSION_COMPANY.name, M, PAGE_H - M - 18, 16, fonts.bold, BLACK);
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

  drawRight(
    page,
    opts.docKind.toUpperCase(),
    PAGE_W - M,
    PAGE_H - M - 16,
    10,
    fonts.bold,
    opts.monochrome ? BLACK : theme.accent
  );
  drawRight(page, opts.docNumber, PAGE_W - M, PAGE_H - M - 34, 15, fonts.bold, BLACK);

  const ribbonY = PAGE_H - M - 88;
  page.drawRectangle({
    x: M,
    y: ribbonY,
    width: CONTENT_W,
    height: 44,
    color: opts.monochrome ? WHITE : SURFACE,
    borderColor: BORDER,
    borderWidth: 0.8,
  });
  page.drawRectangle({
    x: M,
    y: ribbonY,
    width: opts.monochrome ? 2.5 : 4,
    height: 44,
    color: BLACK,
  });

  drawText(page, opts.subtitle, M + 14, ribbonY + 26, 11, fonts.bold, BLACK);
  drawText(page, opts.metaLine, M + 14, ribbonY + 10, 8.5, fonts.regular, SLATE);

  return ribbonY - 18;
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
  const rail = monochrome ? 2.5 : 3;

  page.drawRectangle({
    x: M,
    y: y - cardH,
    width: colW,
    height: cardH,
    color: WHITE,
    borderColor: BORDER,
    borderWidth: 0.8,
  });
  page.drawRectangle({
    x: M + colW + 14,
    y: y - cardH,
    width: colW,
    height: cardH,
    color: WHITE,
    borderColor: BORDER,
    borderWidth: 0.8,
  });
  page.drawRectangle({
    x: M,
    y: y - cardH,
    width: rail,
    height: cardH,
    color: theme.accent,
  });
  page.drawRectangle({
    x: M + colW + 14,
    y: y - cardH,
    width: rail,
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

  return y - cardH - 22;
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
    y: y - 26,
    width: CONTENT_W,
    height: 26,
    color: theme.accent,
  });
  drawText(page, labels.description.toUpperCase(), M + 10, y - 17, 8, fonts.bold, WHITE);
  drawRight(page, labels.amount.toUpperCase(), PAGE_W - M - 10, y - 17, 8, fonts.bold, WHITE);
  y -= 26;

  page.drawRectangle({
    x: M,
    y: y - 42,
    width: CONTENT_W,
    height: 42,
    color: WHITE,
    borderColor: BORDER,
    borderWidth: 0.8,
  });
  drawText(page, lineLabel, M + 10, y - 25, 10, fonts.regular, INK);
  drawRight(page, amount, PAGE_W - M - 10, y - 25, 11, fonts.bold, BLACK);

  return y - 58;
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
      color: WHITE,
      borderColor: BORDER,
      borderWidth: 0.7,
    });
    drawText(page, label.toUpperCase(), x + 8, y - 16, 6.5, fonts.bold, MUTED);
    const valueSize = value.length > 18 ? 8 : 9;
    drawText(page, value, x + 8, y - 34, valueSize, fonts.bold, BLACK);
  });

  return y - boxH - 20;
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
  const boxW = 248;
  const boxH = 58;
  const boxX = PAGE_W - M - boxW;

  if (monochrome) {
    page.drawRectangle({
      x: boxX,
      y: y - boxH,
      width: boxW,
      height: boxH,
      color: BLACK,
    });
    drawText(page, label.toUpperCase(), boxX + 14, y - 20, 7, fonts.bold, rgb(0.72, 0.72, 0.72));
    drawRight(page, amount, PAGE_W - M - 14, y - 40, 16, fonts.bold, WHITE);
  } else {
    page.drawRectangle({
      x: boxX,
      y: y - boxH,
      width: boxW,
      height: boxH,
      color: SURFACE,
      borderColor: BORDER,
      borderWidth: 0.75,
    });
    page.drawRectangle({
      x: boxX,
      y: y - 4,
      width: boxW,
      height: 4,
      color: theme.highlight,
    });
    drawText(page, label.toUpperCase(), boxX + 12, y - 20, 7, fonts.bold, MUTED);
    drawRight(page, amount, PAGE_W - M - 12, y - 40, 16, fonts.bold, theme.accent);
  }

  return y - boxH - 18;
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

export function drawPremiumFooter(
  page: PDFPage,
  fonts: PdfFonts,
  thanks: string,
  bankLine?: string
) {
  const footerTop = M + 58;
  page.drawLine({
    start: { x: M, y: footerTop },
    end: { x: PAGE_W - M, y: footerTop },
    thickness: 0.7,
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
