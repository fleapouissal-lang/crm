import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canAccessFiles } from "@/lib/permissions";
import { FilesPageClient } from "@/components/files/files-page-client";

export default async function FilesRoutePage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");
  if (!canAccessFiles(profile)) redirect("/dashboard");

  return <FilesPageClient />;
}
