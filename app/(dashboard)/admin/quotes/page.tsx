import { redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { AdminQuotesPageClient } from "@/components/admin/admin-quotes-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { listPlatformQuotes } from "@/lib/actions/platform-billing";
import { getAllOrganizations } from "@/lib/actions/platform-admin";
import { canManageCompanies } from "@/lib/permissions";

export default async function AdminQuotesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canManageCompanies(profile.role)) redirect("/dashboard");

  const [quotes, companies] = await Promise.all([
    listPlatformQuotes(),
    getAllOrganizations(),
  ]);

  return (
    <PageTransition>
      <AdminQuotesPageClient initialQuotes={quotes} companies={companies} />
    </PageTransition>
  );
}
