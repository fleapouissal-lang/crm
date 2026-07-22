"use client";

import { bulkInsertClients, getClients } from "@/lib/actions/clients";
import { bulkInsertProjects, getProjects } from "@/lib/actions/projects";
import {
  bulkInsertExpenses,
  bulkInsertInvoices,
  bulkInsertQuotes,
  bulkInsertTemplates,
  getExpenses,
  getInvoices,
  getQuotes,
  getTemplates,
} from "@/lib/actions/finance-docs";
import { loadClients } from "@/lib/clients/storage";
import { loadProjects } from "@/lib/projects/storage";
import {
  loadExpenses,
  loadInvoices,
  loadQuotes,
  loadTemplates,
} from "@/lib/finance/storage";

const FLAG = "fusion-db-migrated-v1";

export async function migrateLocalCrmToDb(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(FLAG) === "1") return false;

  let migrated = false;

  try {
    const localClients = loadClients();
    if (localClients.length > 0) {
      const dbClients = await getClients();
      if (dbClients.length === 0) {
        const res = await bulkInsertClients(localClients);
        if (res.success) {
          localStorage.removeItem("fusion-clients-v2");
          localStorage.removeItem("fusion-clients-v1");
          migrated = true;
        }
      } else {
        localStorage.removeItem("fusion-clients-v2");
        localStorage.removeItem("fusion-clients-v1");
      }
    }

    const localProjects = loadProjects([]);
    if (localProjects.length > 0) {
      const dbProjects = await getProjects();
      if (dbProjects.length === 0) {
        const res = await bulkInsertProjects(localProjects);
        if (res.success) {
          localStorage.removeItem("fusion-projects-v3");
          localStorage.removeItem("fusion-projects-v2");
          localStorage.removeItem("fusion-projects-v1");
          migrated = true;
        }
      } else {
        localStorage.removeItem("fusion-projects-v3");
        localStorage.removeItem("fusion-projects-v2");
        localStorage.removeItem("fusion-projects-v1");
      }
    }

    const localTemplates = loadTemplates();
    if (localTemplates.length > 0) {
      const dbTemplates = await getTemplates();
      if (dbTemplates.length === 0) {
        const res = await bulkInsertTemplates(localTemplates);
        if (res.success) {
          localStorage.removeItem("fusion-finance-templates-v2");
          localStorage.removeItem("fusion-finance-templates-v1");
          migrated = true;
        }
      } else {
        localStorage.removeItem("fusion-finance-templates-v2");
        localStorage.removeItem("fusion-finance-templates-v1");
      }
    }

    const localQuotes = loadQuotes();
    if (localQuotes.length > 0) {
      const dbQuotes = await getQuotes();
      if (dbQuotes.length === 0) {
        const cleaned = localQuotes.map((q) => ({
          ...q,
          templateId: null,
        }));
        const res = await bulkInsertQuotes(cleaned);
        if (res.success) {
          localStorage.removeItem("fusion-finance-quotes-v3");
          localStorage.removeItem("fusion-finance-quotes-v2");
          localStorage.removeItem("fusion-finance-quotes-v1");
          migrated = true;
        }
      } else {
        localStorage.removeItem("fusion-finance-quotes-v3");
        localStorage.removeItem("fusion-finance-quotes-v2");
        localStorage.removeItem("fusion-finance-quotes-v1");
      }
    }

    const localInvoices = loadInvoices();
    if (localInvoices.length > 0) {
      const dbInvoices = await getInvoices();
      if (dbInvoices.length === 0) {
        const cleaned = localInvoices.map((inv) => ({
          ...inv,
          templateId: null,
          quoteId: null,
        }));
        const res = await bulkInsertInvoices(cleaned);
        if (res.success) {
          localStorage.removeItem("fusion-finance-invoices-v3");
          localStorage.removeItem("fusion-finance-invoices-v2");
          localStorage.removeItem("fusion-finance-invoices-v1");
          migrated = true;
        }
      } else {
        localStorage.removeItem("fusion-finance-invoices-v3");
        localStorage.removeItem("fusion-finance-invoices-v2");
        localStorage.removeItem("fusion-finance-invoices-v1");
      }
    }

    const localExpenses = loadExpenses();
    if (localExpenses.length > 0) {
      const dbExpenses = await getExpenses();
      if (dbExpenses.length === 0) {
        const res = await bulkInsertExpenses(localExpenses);
        if (res.success) {
          localStorage.removeItem("fusion-finance-expenses-v2");
          localStorage.removeItem("fusion-finance-expenses-v1");
          migrated = true;
        }
      } else {
        localStorage.removeItem("fusion-finance-expenses-v2");
        localStorage.removeItem("fusion-finance-expenses-v1");
      }
    }

    localStorage.removeItem("fusion-task-projects-v1");
  } catch (err) {
    console.error("[migrateLocalCrmToDb]", err);
    return false;
  }

  localStorage.setItem(FLAG, "1");
  return migrated;
}
