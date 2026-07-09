import { redirect } from "next/navigation";
import { InvoicesPageClient } from "@/components/finance/invoices-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canViewFinanceDocuments } from "@/lib/permissions";

export default async function FinanceInvoicesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canViewFinanceDocuments(profile.role)) redirect("/dashboard");

  return <InvoicesPageClient />;
}
