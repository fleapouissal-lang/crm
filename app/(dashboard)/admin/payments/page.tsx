import { redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { AdminPaymentsPageClient } from "@/components/admin/admin-payments-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { listPlatformInvoices } from "@/lib/actions/platform-billing";
import { listPlatformPayments } from "@/lib/actions/platform-payments";
import { getAllOrganizations } from "@/lib/actions/platform-admin";
import { canManageCompanies } from "@/lib/permissions";

export default async function AdminPaymentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canManageCompanies(profile.role)) redirect("/dashboard");

  const [payments, companies, invoices] = await Promise.all([
    listPlatformPayments(),
    getAllOrganizations(),
    listPlatformInvoices(),
  ]);

  return (
    <PageTransition>
      <AdminPaymentsPageClient
        initialPayments={payments}
        companies={companies}
        initialInvoices={invoices}
      />
    </PageTransition>
  );
}
