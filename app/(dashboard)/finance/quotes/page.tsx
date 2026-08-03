import { redirect } from "next/navigation";
import { QuotesPageClient } from "@/components/finance/quotes-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import {
  getInvoices,
  getQuotes,
  getTemplates,
} from "@/lib/actions/finance-docs";
import { canAccessQuotes } from "@/lib/permissions";

export default async function FinanceQuotesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canAccessQuotes(profile)) redirect("/dashboard");

  const [quotes, templates, invoices] = await Promise.all([
    getQuotes(),
    getTemplates(),
    getInvoices(),
  ]);

  return (
    <QuotesPageClient
      initialQuotes={quotes}
      initialTemplates={templates}
      initialInvoices={invoices}
    />
  );
}
