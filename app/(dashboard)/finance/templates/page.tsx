import { redirect } from "next/navigation";
import { TemplatesPageClient } from "@/components/finance/templates-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canViewFinanceDocumentsForRole } from "@/lib/permissions";

export default async function FinanceTemplatesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canViewFinanceDocumentsForRole(profile.role)) redirect("/dashboard");

  return <TemplatesPageClient />;
}
