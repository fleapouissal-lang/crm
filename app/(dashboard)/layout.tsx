import { redirect } from "next/navigation";
import { FusionShell } from "@/components/layout/fusion-shell";
import { getCurrentProfile } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/permissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const platformAdmin = isPlatformAdmin(profile.role);

  if (platformAdmin) {
    // Platform admin keeps the global console — no vertical CRM adaptation.
    return (
      <FusionShell
        profile={profile}
        activityCount={0}
        leadCount={0}
        quoteCount={0}
      >
        {children}
      </FusionShell>
    );
  }

  if (!profile.organization_id) redirect("/login");

  const supabase = await createClient();
  const [{ count: activityCount }, { count: leadCount }, { count: quoteCount }, orgRes] =
    await Promise.all([
      supabase
        .from("activities")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id)
        .gte(
          "created_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        ),
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

  return (
    <FusionShell
      profile={profile}
      organizationName={organizationName}
      organizationLogoUrl={organizationLogoUrl}
      activityDomain={activityDomain}
      activityCount={activityCount ?? 0}
      leadCount={leadCount ?? 0}
      quoteCount={quoteCount ?? 0}
    >
      {children}
    </FusionShell>
  );
}
