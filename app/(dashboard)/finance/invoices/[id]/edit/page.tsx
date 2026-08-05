import { notFound, redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { EditInvoicePageClient } from "@/components/finance/edit-invoice-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getInvoiceById } from "@/lib/actions/finance-docs";
import { canViewFinanceDocumentsForRole } from "@/lib/permissions";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canViewFinanceDocumentsForRole(profile.role)) redirect("/dashboard");

  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();

  return (
    <PageTransition>
      <EditInvoicePageClient invoice={invoice} />
    </PageTransition>
  );
}
