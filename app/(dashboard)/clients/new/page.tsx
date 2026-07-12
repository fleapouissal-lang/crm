import { redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { CreateClientPageClient } from "@/components/clients/create-client-page-client";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canAccessClients } from "@/lib/permissions";

export default async function CreateClientPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");
  if (!canAccessClients(profile)) redirect("/dashboard");

  return (
    <PageTransition>
      <CreateClientPageClient />
    </PageTransition>
  );
}
