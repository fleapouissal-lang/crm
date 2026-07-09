import { redirect } from "next/navigation";
import { QuotesPageClient } from "@/components/finance/quotes-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canViewFinanceDocuments } from "@/lib/permissions";

export default async function FinanceQuotesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canViewFinanceDocuments(profile.role)) redirect("/dashboard");

  return <QuotesPageClient />;
}
