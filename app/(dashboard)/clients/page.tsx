import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canAccessClients } from "@/lib/permissions";
import { ClientsPageClient } from "@/components/clients/clients-page-client";

export default async function ClientsRoutePage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");
  if (!canAccessClients(profile)) redirect("/dashboard");

  return <ClientsPageClient />;
}
