import { redirect } from "next/navigation";
import { FusionShell } from "@/components/layout/fusion-shell";
import { getCurrentProfile } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.organization_id) redirect("/login");

  const supabase = await createClient();
  const [{ count: activityCount }, { count: leadCount }, { count: quoteCount }] =
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
  ]);

  return (
    <FusionShell
      profile={profile}
      activityCount={activityCount ?? 0}
      leadCount={leadCount ?? 0}
      quoteCount={quoteCount ?? 0}
    >
      {children}
    </FusionShell>
  );
}
