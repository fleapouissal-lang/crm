import { redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { CreateCompanyPageClient } from "@/components/admin/create-company-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canManageCompanies } from "@/lib/permissions";

export default async function CreateCompanyPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canManageCompanies(profile.role)) redirect("/dashboard");

  return (
    <PageTransition>
      <CreateCompanyPageClient />
    </PageTransition>
  );
}
