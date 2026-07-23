import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_ORG_JOB_ROLES } from "@/lib/organizations/default-roles";
import { normalizeEmailDomain, normalizePersonEmail } from "@/lib/organizations/domain";

function slugifyOrg(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

async function seedOrgJobRoles(
  organizationId: string,
  client: SupabaseClient
) {
  const rows = DEFAULT_ORG_JOB_ROLES.map((role) => ({
    organization_id: organizationId,
    name: role.name,
    slug: role.slug,
    is_default: role.is_default,
  }));
  const { data, error } = await client.from("org_job_roles").insert(rows).select("*");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function provisionTenantCompany(input: {
  organizationName: string;
  emailDomain: string;
  slug?: string;
  directorName: string;
  directorEmail: string;
  directorPassword: string;
  createdBy?: string | null;
  logoUrl?: string | null;
  rc?: string | null;
  activityDomain?: string | null;
  country?: string | null;
  city?: string | null;
  phone?: string | null;
  plan?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  client?: SupabaseClient;
}): Promise<{ organizationId: string; directorId: string }> {
  const client = input.client ?? createAdminClient();
  const orgName = input.organizationName.trim();
  const domain = input.emailDomain.trim()
    ? normalizeEmailDomain(input.emailDomain)
    : "";
  const directorName = input.directorName.trim();
  const emailCheck = normalizePersonEmail(input.directorEmail);

  if (!orgName || !directorName || !emailCheck.ok || !input.directorPassword) {
    throw new Error(
      !emailCheck.ok ? emailCheck.error : "All fields are required"
    );
  }
  const directorEmail = emailCheck.email;

  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email: directorEmail,
    password: input.directorPassword,
    email_confirm: true,
    user_metadata: { full_name: directorName },
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "Could not create director account");
  }

  const directorId = authData.user.id;

  const { data: org, error: orgError } = await client
    .from("organizations")
    .insert({
      name: orgName,
      slug: input.slug ?? slugifyOrg(orgName),
      email_domain: domain || null,
      director_id: directorId,
      created_by: input.createdBy ?? null,
      logo_url: input.logoUrl ?? null,
      rc: input.rc?.trim() || null,
      activity_domain: input.activityDomain?.trim() || null,
      country: input.country?.trim() || null,
      city: input.city?.trim() || null,
      phone: input.phone?.trim() || null,
      plan: input.plan?.trim() || "free",
      subscription_status: input.subscriptionStatus?.trim() || "active",
      trial_ends_at: input.trialEndsAt ?? null,
      current_period_end: input.currentPeriodEnd ?? null,
    })
    .select("*")
    .single();

  if (orgError || !org) {
    await client.auth.admin.deleteUser(directorId);
    throw new Error(orgError?.message ?? "Could not create organization");
  }

  try {
    const roles = await seedOrgJobRoles(org.id, client);
    const directorRole = roles.find((r) => r.slug === "directeur") ?? roles[0] ?? null;

    const { error: profileError } = await client
      .from("profiles")
      .update({
        organization_id: org.id,
        role: "admin",
        full_name: directorName,
        email: directorEmail,
        job_role_id: directorRole?.id ?? null,
        job_title: directorRole?.name ?? "Directeur",
      })
      .eq("id", directorId);

    if (profileError) throw new Error(profileError.message);
  } catch (err) {
    await client.from("organizations").delete().eq("id", org.id);
    await client.auth.admin.deleteUser(directorId);
    throw err;
  }

  return { organizationId: org.id, directorId };
}
