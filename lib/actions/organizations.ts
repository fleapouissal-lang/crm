"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/actions/auth";
import {
  canManageCompanies,
  canManageUsers,
  canRemoveTeamMember,
  canResetTeamMemberPassword,
} from "@/lib/permissions";
import { sortJobRolesByCatalog } from "@/lib/organizations/job-role-access";
import { provisionTenantCompany } from "@/lib/organizations/provision-tenant";
import { DEFAULT_ORG_JOB_ROLES } from "@/lib/organizations/default-roles";
import {
  extractEmailDomain,
  normalizeEmailDomain,
  normalizePersonEmail,
  slugifyRoleName,
} from "@/lib/organizations/domain";
import {
  isPlanKey,
  isSubscriptionStatus,
  type PlanKey,
  type SubscriptionStatus,
} from "@/lib/billing/plans";
import { createSubscriptionInvoice } from "@/lib/actions/platform-billing";
import { uploadOrgLogoFile } from "@/lib/organizations/logo";
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
    .eq("organization_id", orgId);

  let roles = (data as OrgJobRole[]) ?? [];

  // Existing orgs may have an empty catalog (e.g. after cleanup). Seed defaults once.
  if (roles.length === 0) {
    try {
      roles = await seedOrgJobRoles(orgId);
    } catch (err) {
      console.error("[org_job_roles] seed failed", err);
      const { data: retry } = await supabase
        .from("org_job_roles")
        .select("*")
        .eq("organization_id", orgId);
      roles = (retry as OrgJobRole[]) ?? [];
    }
  }

  return sortJobRolesByCatalog(roles);
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
  revalidatePath("/admin/subscriptions");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

export async function updateOrganizationAsAdmin(
  formData: FormData
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !canManageCompanies(profile.role)) {
    return { success: false, error: "Platform administrator access required" };
  }

  const organizationId = String(formData.get("organizationId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const domain = normalizeEmailDomain(String(formData.get("emailDomain") ?? ""));
  const rc = String(formData.get("rc") ?? "").trim() || null;
  const activityDomain = String(formData.get("activityDomain") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const removeLogo = formData.get("removeLogo") === "1";
  const logo = formData.get("logo");
  const logoFile = logo instanceof File && logo.size > 0 ? logo : null;

  if (!organizationId || !name) {
    return { success: false, error: "Company name is required" };
  }

  const admin = createAdminClient();
  let logoUrl: string | undefined;

  if (removeLogo) {
    return { success: false, error: "Company logo is required" };
  }

  if (logoFile) {
    try {
      logoUrl = await uploadOrgLogoFile(admin, organizationId, logoFile);
    } catch (err) {
      const code = err instanceof Error ? err.message : "upload_failed";
      if (code === "invalid_logo_type") {
        return { success: false, error: "Invalid image type (JPG, PNG, WebP, GIF)" };
      }
      if (code === "logo_too_large") {
        return { success: false, error: "Logo must be under 2 MB" };
      }
      return { success: false, error: code };
    }
  }

  const patch: Record<string, unknown> = {
    name,
    email_domain: domain || null,
    rc,
    activity_domain: activityDomain,
    country,
    city,
    phone,
  };
  if (logoUrl !== undefined) patch.logo_url = logoUrl;

  const { error } = await admin
    .from("organizations")
    .update(patch)
    .eq("id", organizationId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/companies");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

export async function setOrganizationActive(
  organizationId: string,
  isActive: boolean
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !canManageCompanies(profile.role)) {
    return { success: false, error: "Platform administrator access required" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({ is_active: isActive })
    .eq("id", organizationId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/companies");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

export async function updateOrganizationSubscription(input: {
  organizationId: string;
  plan: PlanKey;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
}): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !canManageCompanies(profile.role)) {
    return { success: false, error: "Platform administrator access required" };
  }

  if (!isPlanKey(input.plan) || !isSubscriptionStatus(input.subscriptionStatus)) {
    return { success: false, error: "Invalid plan or status" };
  }

  const admin = createAdminClient();
  const { data: previous } = await admin
    .from("organizations")
    .select("plan")
    .eq("id", input.organizationId)
    .single();

  const { error } = await admin
    .from("organizations")
    .update({
      plan: input.plan,
      subscription_status: input.subscriptionStatus,
      trial_ends_at: input.trialEndsAt ?? null,
      current_period_end: input.currentPeriodEnd ?? null,
    })
    .eq("id", input.organizationId);

  if (error) return { success: false, error: error.message };

  const previousPlan = (previous?.plan as PlanKey | undefined) ?? null;
  const planChanged = previousPlan !== input.plan;

  if (planChanged && input.plan !== "free") {
    await createSubscriptionInvoice({
      organizationId: input.organizationId,
      plan: input.plan,
      previousPlan,
      periodEnd: input.currentPeriodEnd ?? null,
      createdBy: profile.id,
    });
  }

  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/companies");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/quotes");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

export async function createOrganizationWithDirector(
  formData: FormData
): Promise<ActionResult<{ organizationId: string }>> {
  const profile = await getCurrentProfile();
  if (!profile || !canManageCompanies(profile.role)) {
    return { success: false, error: "Platform administrator access required" };
  }

  const organizationName = String(formData.get("organizationName") ?? "");
  const emailDomain = String(formData.get("emailDomain") ?? "");
  const directorName = String(formData.get("directorName") ?? "");
  const directorEmailRaw = String(formData.get("directorEmail") ?? "");
  const directorPassword = String(formData.get("directorPassword") ?? "");

  const emailCheck = normalizePersonEmail(directorEmailRaw);
  if (!emailCheck.ok) {
    return { success: false, error: emailCheck.error };
  }
  const directorEmail = emailCheck.email;
  const rc = String(formData.get("rc") ?? "").trim() || null;
  const activityDomain = String(formData.get("activityDomain") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const planRaw = String(formData.get("plan") ?? "free").trim();
  const statusRaw = String(formData.get("subscriptionStatus") ?? "active").trim();
  const trialEndsRaw = String(formData.get("trialEndsAt") ?? "").trim();
  const periodEndRaw = String(formData.get("currentPeriodEnd") ?? "").trim();
  const logo = formData.get("logo");
  const logoFile = logo instanceof File && logo.size > 0 ? logo : null;

  const plan: PlanKey = isPlanKey(planRaw) ? planRaw : "free";
  const subscriptionStatus: SubscriptionStatus = isSubscriptionStatus(statusRaw)
    ? statusRaw
    : plan === "free"
      ? "active"
      : "trialing";
  const trialEndsAt = trialEndsRaw
    ? new Date(`${trialEndsRaw}T12:00:00.000Z`).toISOString()
    : null;
  const currentPeriodEnd = periodEndRaw
    ? new Date(`${periodEndRaw}T12:00:00.000Z`).toISOString()
    : null;

  if (directorPassword.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" };
  }

  if (!logoFile) {
    return { success: false, error: "Company logo is required" };
  }

  try {
    const admin = createAdminClient();
    const { organizationId } = await provisionTenantCompany({
      organizationName,
      emailDomain,
      directorName,
      directorEmail,
      directorPassword,
      createdBy: profile.id,
      rc,
      activityDomain,
      country,
      city,
      phone,
      plan,
      subscriptionStatus,
      trialEndsAt,
      currentPeriodEnd,
      client: admin,
    });

    if (logoFile) {
      try {
        const logoUrl = await uploadOrgLogoFile(admin, organizationId, logoFile);
        await admin
          .from("organizations")
          .update({ logo_url: logoUrl })
          .eq("id", organizationId);
      } catch (err) {
        await deleteOrganization(organizationId);
        const code = err instanceof Error ? err.message : "upload_failed";
        if (code === "invalid_logo_type") {
          return { success: false, error: "Invalid image type (JPG, PNG, WebP, GIF)" };
        }
        if (code === "logo_too_large") {
          return { success: false, error: "Logo must be under 2 MB" };
        }
        return { success: false, error: code };
      }
    }

    if (plan !== "free") {
      await createSubscriptionInvoice({
        organizationId,
        plan,
        previousPlan: null,
        periodEnd: currentPeriodEnd,
        createdBy: profile.id,
      });
    }

    revalidatePath("/admin/companies");
    revalidatePath("/admin/subscriptions");
    revalidatePath("/admin/invoices");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");
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
  /** Full personal email — not tied to the company domain */
  email: string;
  password: string;
  role: Role;
  jobRoleId: string;
}): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "No organization" };
  }
  if (!canManageUsers(profile.role)) {
    return { success: false, error: "Director or manager access required" };
  }
  if (input.role === "platform_admin") {
    return { success: false, error: "Invalid role" };
  }
  if (profile.role === "manager" && input.role === "admin") {
    return { success: false, error: "Managers cannot create director accounts" };
  }

  const supabase = await createClient();
  const fullName = input.fullName.trim();
  const emailCheck = normalizePersonEmail(input.email);
  if (!emailCheck.ok) {
    return { success: false, error: emailCheck.error };
  }
  const email = emailCheck.email;

  if (!fullName || !input.password || !input.jobRoleId) {
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

  const { data: existingMember } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .ilike("email", email)
    .maybeSingle();

  if (existingMember) {
    return {
      success: false,
      error: `This email is already used by a team member (${email})`,
    };
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
  revalidatePath("/hr");
  return { success: true, data: undefined };
}

export async function deleteTeamMember(memberId: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "No organization" };
  }
  if (!canManageUsers(profile.role)) {
    return { success: false, error: "Director or manager access required" };
  }

  const admin = createAdminClient();
  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, role, organization_id, full_name, email")
    .eq("id", memberId)
    .maybeSingle();

  if (targetError) return { success: false, error: targetError.message };
  if (!target || target.organization_id !== profile.organization_id) {
    return { success: false, error: "Member not found" };
  }

  if (
    !canRemoveTeamMember(profile, {
      id: target.id,
      role: target.role as Role,
    })
  ) {
    if (profile.id === target.id) {
      return { success: false, error: "You cannot remove your own account" };
    }
    if (profile.role === "manager" && target.role === "admin") {
      return { success: false, error: "Managers cannot remove directors" };
    }
    return { success: false, error: "You don't have permission to remove this member" };
  }

  if (target.role === "admin") {
    const { count, error: countError } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id)
      .eq("role", "admin");

    if (countError) return { success: false, error: countError.message };
    if ((count ?? 0) <= 1) {
      return {
        success: false,
        error: "Cannot remove the last director of the company",
      };
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(target.id);
  if (deleteError) return { success: false, error: deleteError.message };

  revalidatePath("/settings");
  revalidatePath("/hr");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

export async function updateTeamMemberPassword(input: {
  memberId: string;
  password: string;
}): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "No organization" };
  }
  if (!canManageUsers(profile.role)) {
    return { success: false, error: "Director or manager access required" };
  }

  const password = input.password.trim();
  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" };
  }

  const admin = createAdminClient();
  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, role, organization_id")
    .eq("id", input.memberId)
    .maybeSingle();

  if (targetError) return { success: false, error: targetError.message };
  if (!target || target.organization_id !== profile.organization_id) {
    return { success: false, error: "Member not found" };
  }

  if (
    !canResetTeamMemberPassword(profile, {
      id: target.id,
      role: target.role as Role,
    })
  ) {
    if (profile.id === target.id) {
      return {
        success: false,
        error: "Use your profile settings to change your own password",
      };
    }
    if (profile.role === "manager" && target.role === "admin") {
      return {
        success: false,
        error: "Managers cannot change a director's password",
      };
    }
    return {
      success: false,
      error: "You don't have permission to change this password",
    };
  }

  const { error } = await admin.auth.admin.updateUserById(target.id, {
    password,
  });
  if (error) return { success: false, error: error.message };

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
