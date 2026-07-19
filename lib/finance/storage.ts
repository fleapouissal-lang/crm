import type {
  DocumentTemplate,
  ExpenseRecord,
  InvoiceRecord,
  QuoteRecord,
} from "./types";
import { normalizeInvoice, normalizeQuote } from "./types";
import {
  SEED_EXPENSES,
  SEED_INVOICES,
  SEED_QUOTES,
  SEED_TEMPLATES,
} from "./seed";

const TEMPLATES_KEY = "fusion-finance-templates-v1";
const QUOTES_KEY = "fusion-finance-quotes-v2";
const INVOICES_KEY = "fusion-finance-invoices-v2";
const EXPENSES_KEY = "fusion-finance-expenses-v1";

function load<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seed;
  } catch {
    return seed;
  }
}

function save<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadTemplates(): DocumentTemplate[] {
  return load(TEMPLATES_KEY, SEED_TEMPLATES);
}

export function saveTemplates(templates: DocumentTemplate[]): void {
  save(TEMPLATES_KEY, templates);
}

export function loadQuotes(): QuoteRecord[] {
  return load(QUOTES_KEY, SEED_QUOTES).map(normalizeQuote);
}

export function saveQuotes(quotes: QuoteRecord[]): void {
  save(QUOTES_KEY, quotes.map(normalizeQuote));
}

export function loadInvoices(): InvoiceRecord[] {
  return load(INVOICES_KEY, SEED_INVOICES).map(normalizeInvoice);
}

export function saveInvoices(invoices: InvoiceRecord[]): void {
  save(INVOICES_KEY, invoices.map(normalizeInvoice));
}

export function loadExpenses(): ExpenseRecord[] {
  return load(EXPENSES_KEY, SEED_EXPENSES);
}

export function saveExpenses(expenses: ExpenseRecord[]): void {
  save(EXPENSES_KEY, expenses);
}

export function getTemplateById(id: string | null): DocumentTemplate | undefined {
  if (!id) return undefined;
  return loadTemplates().find((t) => t.id === id);
}
