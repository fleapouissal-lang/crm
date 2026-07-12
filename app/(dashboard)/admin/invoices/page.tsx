import { redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { AdminInvoicesPageClient } from "@/components/admin/admin-invoices-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { listPlatformInvoices } from "@/lib/actions/platform-billing";
import { getAllOrganizations } from "@/lib/actions/platform-admin";
import { canManageCompanies } from "@/lib/permissions";

export default async function AdminInvoicesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canManageCompanies(profile.role)) redirect("/dashboard");

  const [invoices, companies] = await Promise.all([
    listPlatformInvoices(),
    getAllOrganizations(),
  ]);

  return (
    <PageTransition>
      <AdminInvoicesPageClient initialInvoices={invoices} companies={companies} />
    </PageTransition>
  );
}
