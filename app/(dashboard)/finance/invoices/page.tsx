import { redirect } from "next/navigation";
import { InvoicesPageClient } from "@/components/finance/invoices-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canViewFinanceDocumentsForRole } from "@/lib/permissions";

export default async function FinanceInvoicesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canViewFinanceDocumentsForRole(profile.role)) redirect("/dashboard");

  return <InvoicesPageClient />;
}
