/** Rows that fit on page 1 (header + parties + table). */
export const A4_FIRST_PAGE_ROWS = 11;

/** Rows on middle continuation pages (table only). */
export const A4_CONTINUATION_PAGE_ROWS = 17;

/** Max data rows on the last page (totals + notes + signature reserved). */
export const A4_LAST_PAGE_ROWS = 9;

export function paginateLineItems<T>(items: T[]): T[][] {
  if (items.length <= A4_FIRST_PAGE_ROWS) {
    return [items];
  }

  const pages: T[][] = [];
  let cursor = 0;

  pages.push(items.slice(0, A4_FIRST_PAGE_ROWS));
  cursor = A4_FIRST_PAGE_ROWS;

  while (cursor < items.length) {
    const remaining = items.length - cursor;

    if (remaining <= A4_LAST_PAGE_ROWS) {
      pages.push(items.slice(cursor));
      break;
    }

    if (remaining <= A4_CONTINUATION_PAGE_ROWS + A4_LAST_PAGE_ROWS) {
      const middleCount = remaining - A4_LAST_PAGE_ROWS;
      if (middleCount > 0) {
        pages.push(items.slice(cursor, cursor + middleCount));
        cursor += middleCount;
      }
      pages.push(items.slice(cursor));
      break;
    }

    pages.push(items.slice(cursor, cursor + A4_CONTINUATION_PAGE_ROWS));
    cursor += A4_CONTINUATION_PAGE_ROWS;
  }

  return pages;
}

export function fillerRowsForPage(
  _pageIndex: number,
  _totalPages: number,
  _rowCount: number
): number {
  return 0;
}
