import { redirect } from "next/navigation";
import { InvoicesPageClient } from "@/components/finance/invoices-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import {
  getInvoices,
  getQuotes,
  getTemplates,
} from "@/lib/actions/finance-docs";
import { canViewFinanceDocumentsForRole } from "@/lib/permissions";

export default async function FinanceInvoicesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canViewFinanceDocumentsForRole(profile.role)) redirect("/dashboard");

  const [invoices, quotes, templates] = await Promise.all([
    getInvoices(),
    getQuotes(),
    getTemplates(),
  ]);

  return (
    <InvoicesPageClient
      initialInvoices={invoices}
      initialQuotes={quotes}
      initialTemplates={templates}
    />
  );
}
