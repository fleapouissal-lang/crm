import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import { getProjects } from "@/lib/actions/projects";
import { ProjectsPageClient } from "@/components/projects/projects-page-client";
import { Skeleton } from "@/components/ui/skeleton";

export default async function ProjectsRoutePage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");

  const [profiles, projects] = await Promise.all([
    getOrgProfiles(),
    getProjects(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <ProjectsPageClient profiles={profiles} initialProjects={projects} />
    </Suspense>
  );
}
