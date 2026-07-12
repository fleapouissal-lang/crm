import { redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { AdminSubscriptionsPageClient } from "@/components/admin/admin-subscriptions-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getAllOrganizations } from "@/lib/actions/platform-admin";
import { canManageCompanies } from "@/lib/permissions";

export default async function AdminSubscriptionsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canManageCompanies(profile.role)) redirect("/dashboard");

  const companies = await getAllOrganizations();

  return (
    <PageTransition>
      <AdminSubscriptionsPageClient initialCompanies={companies} />
    </PageTransition>
  );
}
