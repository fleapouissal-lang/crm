"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canManageCompanies } from "@/lib/permissions";
import { provisionTenantCompany } from "@/lib/organizations/provision-tenant";
import { DEFAULT_ORG_JOB_ROLES } from "@/lib/organizations/default-roles";
import {
  buildCompanyEmail,
  extractEmailDomain,
  normalizeEmailDomain,
  slugifyRoleName,
} from "@/lib/organizations/domain";
import type { ActionResult, OrgJobRole, Organization, Profile, Role } from "@/types/database";

export async function seedOrgJobRoles(
  organizationId: string,
  client = createAdminClient()
): Promise<OrgJobRole[]> {
  const rows = DEFAULT_ORG_JOB_ROLES.map((role) => ({
    organization_id: organizationId,
    name: role.name,
    slug: role.slug,
    is_default: role.is_default,
  }));

  const { data, error } = await client
    .from("org_job_roles")
    .insert(rows)
    .select("*");

  if (error) throw new Error(error.message);
  return (data as OrgJobRole[]) ?? [];
}

export async function getOrgJobRoles(organizationId?: string): Promise<OrgJobRole[]> {
  const profile = await getCurrentProfile();
  const orgId = organizationId ?? profile?.organization_id;
  if (!orgId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("org_job_roles")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");

  const roles = (data as OrgJobRole[]) ?? [];
  if (roles.length === 0 && profile?.role === "admin" && profile.organization_id === orgId) {
    try {
      return await seedOrgJobRoles(orgId);
    } catch {
      return roles;
    }
  }

  return roles;
}

export async function getCreatedOrganizations(): Promise<Organization[]> {
  return getAllOrganizationsForManager();
}

export async function getAllOrganizationsForManager(): Promise<Organization[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];
  if (canManageCompanies(profile.role)) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });
    return (data as Organization[]) ?? [];
  }
  return [];
}

export async function deleteOrganization(orgId: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !canManageCompanies(profile.role)) {
    return { success: false, error: "Platform administrator access required" };
  }

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("profiles")
    .select("id")
    .eq("organization_id", orgId);

  const { error: orgError } = await admin.from("organizations").delete().eq("id", orgId);
  if (orgError) return { success: false, error: orgError.message };

  for (const member of members ?? []) {
    await admin.auth.admin.deleteUser(member.id);
  }

  revalidatePath("/admin/companies");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

export async function createOrganizationWithDirector(input: {
  organizationName: string;
  emailDomain: string;
  directorName: string;
  directorEmail: string;
  directorPassword: string;
}): Promise<ActionResult<{ organizationId: string }>> {
  const profile = await getCurrentProfile();
  if (!profile || !canManageCompanies(profile.role)) {
    return { success: false, error: "Platform administrator access required" };
  }

  if (input.directorPassword.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" };
  }

  try {
    const { organizationId } = await provisionTenantCompany({
      ...input,
      createdBy: profile.id,
    });
    revalidatePath("/admin/companies");
    revalidatePath("/dashboard");
    return { success: true, data: { organizationId } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Setup failed",
    };
  }
}

export async function createTeamMember(input: {
  fullName: string;
  emailLocal: string;
  password: string;
  role: Role;
  jobRoleId: string;
}): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "No organization" };
  }
  if (profile.role !== "admin") {
    return { success: false, error: "Director access required" };
  }

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("email_domain")
    .eq("id", profile.organization_id)
    .single();

  if (!org?.email_domain) {
    return { success: false, error: "Organization email domain is not configured" };
  }

  const fullName = input.fullName.trim();
  const email = buildCompanyEmail(input.emailLocal, org.email_domain);

  if (!fullName || !input.emailLocal.trim() || !input.password || !input.jobRoleId) {
    return { success: false, error: "All fields are required" };
  }

  if (input.password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" };
  }

  const { data: jobRole } = await supabase
    .from("org_job_roles")
    .select("id, name, organization_id")
    .eq("id", input.jobRoleId)
    .single();

  if (!jobRole || jobRole.organization_id !== profile.organization_id) {
    return { success: false, error: "Invalid job role" };
  }

  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? "Could not create user" };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      organization_id: profile.organization_id,
      role: input.role,
      full_name: fullName,
      email,
      job_role_id: input.jobRoleId,
      job_title: jobRole.name,
    })
    .eq("id", authData.user.id);

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { success: false, error: profileError.message };
  }

  revalidatePath("/settings");
  return { success: true, data: undefined };
}

export async function createCustomJobRole(name: string): Promise<ActionResult<OrgJobRole>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || profile.role !== "admin") {
    return { success: false, error: "Admin access required" };
  }

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Role name is required" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_job_roles")
    .insert({
      organization_id: profile.organization_id,
      name: trimmed,
      slug: slugifyRoleName(trimmed),
      is_default: false,
    })
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true, data: data as OrgJobRole };
}

export async function updateOrganizationDomain(
  emailDomain: string
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || profile.role !== "admin") {
    return { success: false, error: "Admin access required" };
  }

  const domain = normalizeEmailDomain(emailDomain);
  if (!domain) return { success: false, error: "Invalid email domain" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ email_domain: domain })
    .eq("id", profile.organization_id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true, data: undefined };
}

export async function finalizeOrganizationSetup(
  organizationId: string,
  directorId: string,
  directorName: string,
  directorEmail: string
): Promise<void> {
  const admin = createAdminClient();
  const domain = extractEmailDomain(directorEmail);
  const roles = await seedOrgJobRoles(organizationId, admin);
  const directorRole = roles.find((r) => r.slug === "directeur") ?? roles[0] ?? null;

  await admin
    .from("organizations")
    .update({
      email_domain: domain,
      director_id: directorId,
      created_by: directorId,
    })
    .eq("id", organizationId);

  await admin
    .from("profiles")
    .update({
      job_role_id: directorRole?.id ?? null,
      job_title: directorRole?.name ?? "Directeur",
    })
    .eq("id", directorId);
}
