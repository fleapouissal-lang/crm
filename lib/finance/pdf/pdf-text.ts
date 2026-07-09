/** pdf-lib StandardFonts only support WinAnsi — normalize text for safe rendering */
export function pdfSafe(text: string): string {
  return text
    .replace(/[\u00a0\u202f\u2007\u2009\u2060]/g, " ")
    .replace(/[·•]/g, " - ")
    .replace(/[—–]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[…]/g, "...")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function formatAmountFr(amount: number): string {
  return pdfSafe(
    amount.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function formatAmountFrPlain(amount: number): string {
  return pdfSafe(amount.toLocaleString("fr-FR"));
}
