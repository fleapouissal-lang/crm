import { redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { CreateInvoicePageClient } from "@/components/finance/create-invoice-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getInvoices, getTemplates } from "@/lib/actions/finance-docs";
import { canViewFinanceDocumentsForRole } from "@/lib/permissions";

export default async function CreateInvoicePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canViewFinanceDocumentsForRole(profile.role)) redirect("/dashboard");

  const [invoices, templates] = await Promise.all([
    getInvoices(),
    getTemplates(),
  ]);

  return (
    <PageTransition>
      <CreateInvoicePageClient
        initialInvoices={invoices}
        initialTemplates={templates}
      />
    </PageTransition>
  );
}
