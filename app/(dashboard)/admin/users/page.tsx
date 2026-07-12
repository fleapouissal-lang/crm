import { redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { AdminUsersPageClient } from "@/components/admin/admin-users-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getPlatformUsers } from "@/lib/actions/platform-admin";
import { canManageCompanies } from "@/lib/permissions";

export default async function AdminUsersPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canManageCompanies(profile.role)) redirect("/dashboard");

  const users = await getPlatformUsers();

  return (
    <PageTransition>
      <AdminUsersPageClient initialUsers={users} />
    </PageTransition>
  );
}
