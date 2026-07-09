import { redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { AdminCompaniesPageClient } from "@/components/admin/admin-companies-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getAllOrganizations } from "@/lib/actions/platform-admin";
import { canManageCompanies } from "@/lib/permissions";

export default async function AdminCompaniesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canManageCompanies(profile.role)) redirect("/dashboard");

  const companies = await getAllOrganizations();

  return (
    <PageTransition>
      <AdminCompaniesPageClient initialCompanies={companies} />
    </PageTransition>
  );
}
