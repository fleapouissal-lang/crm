import { redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { CreateInvoicePageClient } from "@/components/finance/create-invoice-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canViewFinanceDocumentsForRole } from "@/lib/permissions";

export default async function CreateInvoicePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canViewFinanceDocumentsForRole(profile.role)) redirect("/dashboard");

  return (
    <PageTransition>
      <CreateInvoicePageClient />
    </PageTransition>
  );
}
