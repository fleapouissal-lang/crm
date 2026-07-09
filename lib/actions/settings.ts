"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import type { ActionResult, Organization, Profile } from "@/types/database";

export interface SettingsData {
  profile: Profile;
  organization: Organization | null;
  team: Profile[];
  stats: {
    members: number;
    leads: number;
    tasks: number;
    activities: number;
  };
  isAdmin: boolean;
}

export async function getSettingsData(): Promise<SettingsData | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const orgId = profile.organization_id;

  let organization: Organization | null = null;
  let stats = { members: 0, leads: 0, tasks: 0, activities: 0 };
  let team: Profile[] = [];

  if (orgId) {
    const [orgRes, teamList, leadsCount, tasksCount, activitiesCount] =
      await Promise.all([
        supabase.from("organizations").select("*").eq("id", orgId).single(),
        getOrgProfiles(),
        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId),
        supabase
          .from("activities")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId),
      ]);

    organization = (orgRes.data as Organization) ?? null;
    team = teamList;
    stats = {
      members: team.length,
      leads: leadsCount.count ?? 0,
      tasks: tasksCount.count ?? 0,
      activities: activitiesCount.count ?? 0,
    };
  }

  return {
    profile,
    organization,
    team,
    stats,
    isAdmin: profile.role === "admin",
  };
}

export async function updateOrganization(
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { success: false, error: "Organization name is required" };

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.organization_id) {
    return { success: false, error: "No organization" };
  }
  if (profile.role !== "admin") {
    return { success: false, error: "Admin access required" };
  }

  const { error } = await supabase
    .from("organizations")
    .update({ name })
    .eq("id", profile.organization_id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true, data: undefined };
}
