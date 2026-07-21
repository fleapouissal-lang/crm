import type {
  DocumentTemplate,
  ExpenseRecord,
  InvoiceRecord,
  QuoteRecord,
} from "./types";
import { normalizeInvoice, normalizeQuote } from "./types";

const TEMPLATES_KEY = "fusion-finance-templates-v2";
const QUOTES_KEY = "fusion-finance-quotes-v3";
const INVOICES_KEY = "fusion-finance-invoices-v3";
const EXPENSES_KEY = "fusion-finance-expenses-v2";

const LEGACY_KEYS = [
  "fusion-finance-templates-v1",
  "fusion-finance-quotes-v1",
  "fusion-finance-quotes-v2",
  "fusion-finance-invoices-v1",
  "fusion-finance-invoices-v2",
  "fusion-finance-expenses-v1",
];

function clearLegacyKeys() {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key);
  }
}

function load<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  clearLegacyKeys();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadTemplates(): DocumentTemplate[] {
  return load<DocumentTemplate>(TEMPLATES_KEY);
}

export function saveTemplates(templates: DocumentTemplate[]): void {
  save(TEMPLATES_KEY, templates);
}

export function loadQuotes(): QuoteRecord[] {
  return load<QuoteRecord>(QUOTES_KEY).map(normalizeQuote);
}

export function saveQuotes(quotes: QuoteRecord[]): void {
  save(QUOTES_KEY, quotes.map(normalizeQuote));
}

export function loadInvoices(): InvoiceRecord[] {
  return load<InvoiceRecord>(INVOICES_KEY).map(normalizeInvoice);
}

export function saveInvoices(invoices: InvoiceRecord[]): void {
  save(INVOICES_KEY, invoices.map(normalizeInvoice));
}

export function loadExpenses(): ExpenseRecord[] {
  return load<ExpenseRecord>(EXPENSES_KEY);
}

export function saveExpenses(expenses: ExpenseRecord[]): void {
  save(EXPENSES_KEY, expenses);
}

export function getTemplateById(id: string | null): DocumentTemplate | undefined {
  if (!id) return undefined;
  return loadTemplates().find((t) => t.id === id);
}

/** Wipe all company finance local data (quotes, invoices, expenses, templates). */
export function clearAllFinanceLocalData(): void {
  if (typeof window === "undefined") return;
  clearLegacyKeys();
  for (const key of [TEMPLATES_KEY, QUOTES_KEY, INVOICES_KEY, EXPENSES_KEY]) {
    localStorage.removeItem(key);
  }
}
