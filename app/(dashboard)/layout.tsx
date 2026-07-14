import { redirect } from "next/navigation";
import { FusionShell } from "@/components/layout/fusion-shell";
import { getCurrentProfile } from "@/lib/auth/profile";
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
    return (
      <FusionShell profile={profile} leadCount={0} quoteCount={0}>
        {children}
      </FusionShell>
    );
  }

  if (!profile.organization_id) redirect("/login");

  const supabase = await createClient();
  // Keep layout light: org branding + tiny badge counts only.
  // Notifications load client-side after paint (see NotificationsProvider).
  const [{ count: leadCount }, { count: quoteCount }, orgRes] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id)
        .not("stage", "in", '("won","lost")'),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id)
        .in("stage", ["proposal", "negotiation"]),
      supabase
        .from("organizations")
        .select("name, logo_url, activity_domain")
        .eq("id", profile.organization_id)
        .single(),
    ]);

  return (
    <FusionShell
      profile={profile}
      organizationName={orgRes.data?.name ?? null}
      organizationLogoUrl={orgRes.data?.logo_url ?? null}
      activityDomain={orgRes.data?.activity_domain ?? null}
      leadCount={leadCount ?? 0}
      quoteCount={quoteCount ?? 0}
      loadNotifications
    >
      {children}
    </FusionShell>
  );
}
