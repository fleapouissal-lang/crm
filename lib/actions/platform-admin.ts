"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canManageCompanies } from "@/lib/permissions";
import type { Organization } from "@/types/database";

export interface PlatformAdminStats {
  companiesCount: number;
  usersCount: number;
  companies: Organization[];
}

export async function getPlatformAdminStats(): Promise<PlatformAdminStats | null> {
  const profile = await getCurrentProfile();
  if (!profile || !canManageCompanies(profile.role)) return null;

  const admin = createAdminClient();
  const [{ data: companies }, { count: usersCount }] = await Promise.all([
    admin.from("organizations").select("*").order("created_at", { ascending: false }),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("organization_id", "is", null),
  ]);

  return {
    companiesCount: companies?.length ?? 0,
    usersCount: usersCount ?? 0,
    companies: (companies as Organization[]) ?? [],
  };
}

export async function getAllOrganizations(): Promise<Organization[]> {
  const profile = await getCurrentProfile();
  if (!profile || !canManageCompanies(profile.role)) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  return (data as Organization[]) ?? [];
}

export async function getOrganizationMemberCount(orgId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);
  return count ?? 0;
}

export async function getOrganizationDirectorEmail(orgId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("director_id")
    .eq("id", orgId)
    .single();
  if (!org?.director_id) return null;
  const { data: director } = await admin
    .from("profiles")
    .select("email")
    .eq("id", org.director_id)
    .single();
  return director?.email ?? null;
}
