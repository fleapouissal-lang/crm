import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getClients } from "@/lib/actions/clients";
import { canAccessClients } from "@/lib/permissions";
import { ClientsPageClient } from "@/components/clients/clients-page-client";

export default async function ClientsRoutePage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");
  if (!canAccessClients(profile)) redirect("/dashboard");

  const clients = await getClients();
  return <ClientsPageClient initialClients={clients} />;
}
