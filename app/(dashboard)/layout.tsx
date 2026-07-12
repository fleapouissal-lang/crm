import { redirect } from "next/navigation";
import { FusionShell } from "@/components/layout/fusion-shell";
import { getCurrentProfile } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/permissions";
import type { Activity } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const platformAdmin = isPlatformAdmin(profile.role);

  if (platformAdmin) {
    return (
      <FusionShell
        profile={profile}
        activities={[]}
        leadCount={0}
        quoteCount={0}
      >
        {children}
      </FusionShell>
    );
  }

  if (!profile.organization_id) redirect("/login");

  const supabase = await createClient();
  const [activitiesRes, { count: leadCount }, { count: quoteCount }, orgRes] =
    await Promise.all([
      supabase
        .from("activities")
        .select("*, profile:profiles!activities_user_id_fkey(*)")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id)
        .not("stage", "in", '("won","lost")'),
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id)
        .in("stage", ["proposal", "negotiation"]),
      supabase
        .from("organizations")
        .select("name, logo_url, activity_domain")
        .eq("id", profile.organization_id)
        .single(),
    ]);

  const organizationName = orgRes.data?.name ?? null;
  const organizationLogoUrl = orgRes.data?.logo_url ?? null;
  const activityDomain = orgRes.data?.activity_domain ?? null;
  const activities = (activitiesRes.data as Activity[] | null) ?? [];

  return (
    <FusionShell
      profile={profile}
      organizationName={organizationName}
      organizationLogoUrl={organizationLogoUrl}
      activityDomain={activityDomain}
      activities={activities}
      leadCount={leadCount ?? 0}
      quoteCount={quoteCount ?? 0}
    >
      {children}
    </FusionShell>
  );
}
