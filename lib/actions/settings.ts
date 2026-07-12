"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import { getOrgJobRoles } from "@/lib/actions/organizations";
import { canManageUsers } from "@/lib/permissions";
import type { ActionResult, Organization, OrgJobRole, Profile } from "@/types/database";

export interface SettingsData {
  profile: Profile;
  organization: Organization | null;
  team: Profile[];
  jobRoles: OrgJobRole[];
  stats: {
    members: number;
    leads: number;
    tasks: number;
    activities: number;
  };
  isAdmin: boolean;
  canManageUsers: boolean;
}

export async function getSettingsData(): Promise<SettingsData | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  if (profile.role === "platform_admin") {
    return {
      profile,
      organization: null,
      team: [],
      jobRoles: [],
      stats: { members: 0, leads: 0, tasks: 0, activities: 0 },
      isAdmin: false,
      canManageUsers: false,
    };
  }

  const supabase = await createClient();
  const orgId = profile.organization_id;

  let organization: Organization | null = null;
  let stats = { members: 0, leads: 0, tasks: 0, activities: 0 };
  let team: Profile[] = [];
  let jobRoles: OrgJobRole[] = [];

  if (orgId) {
    const [orgRes, teamList, rolesList, leadsCount, tasksCount, activitiesCount] =
      await Promise.all([
        supabase.from("organizations").select("*").eq("id", orgId).single(),
        getOrgProfiles(),
        getOrgJobRoles(orgId),
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
    jobRoles = rolesList;
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
    jobRoles,
    stats,
    isAdmin: profile.role === "admin",
    canManageUsers: canManageUsers(profile.role),
  };
}

export async function updateOrganization(
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const emailDomain = String(formData.get("email_domain") ?? "").trim();
  if (!name) return { success: false, error: "Organization name is required" };

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.organization_id) {
    return { success: false, error: "No organization" };
  }
  if (profile.role !== "admin") {
    return { success: false, error: "Admin access required" };
  }

  const patch: { name: string; email_domain?: string } = { name };
  if (emailDomain) {
    patch.email_domain = emailDomain.replace(/^@+/, "").toLowerCase();
  }

  const { error } = await supabase
    .from("organizations")
    .update(patch)
    .eq("id", profile.organization_id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true, data: undefined };
}
