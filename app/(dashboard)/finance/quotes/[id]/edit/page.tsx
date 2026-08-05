import { notFound, redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { EditQuotePageClient } from "@/components/finance/edit-quote-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getQuoteById } from "@/lib/actions/finance-docs";
import { canViewFinanceDocumentsForRole } from "@/lib/permissions";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canViewFinanceDocumentsForRole(profile.role)) redirect("/dashboard");

  const { id } = await params;
  const quote = await getQuoteById(id);
  if (!quote) notFound();

  return (
    <PageTransition>
      <EditQuotePageClient quote={quote} />
    </PageTransition>
  );
}
