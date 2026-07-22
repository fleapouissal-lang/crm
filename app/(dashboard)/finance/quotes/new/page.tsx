import { redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { CreateQuotePageClient } from "@/components/finance/create-quote-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getQuotes, getTemplates } from "@/lib/actions/finance-docs";
import { canViewFinanceDocumentsForRole } from "@/lib/permissions";

export default async function CreateQuotePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canViewFinanceDocumentsForRole(profile.role)) redirect("/dashboard");

  const [quotes, templates] = await Promise.all([getQuotes(), getTemplates()]);

  return (
    <PageTransition>
      <CreateQuotePageClient
        initialQuotes={quotes}
        initialTemplates={templates}
      />
    </PageTransition>
  );
}
