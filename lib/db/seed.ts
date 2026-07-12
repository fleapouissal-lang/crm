import { createAdminClient } from "@/lib/supabase/admin";
import { provisionTenantCompany } from "@/lib/organizations/provision-tenant";
import { buildCompanyEmail } from "@/lib/organizations/domain";
import { DEFAULT_ORG_JOB_ROLES } from "@/lib/organizations/default-roles";
import { defaultTrialEndsAt, type PlanKey, type SubscriptionStatus } from "@/lib/billing/plans";
import type { OrgJobRole, Role } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

const TEAM_PASSWORD = "Demo123!";
const PLATFORM_ADMIN_EMAIL = "administrateur@crmfleap.com";
const PLATFORM_ADMIN_PASSWORD = "Admin123!";
const LEGACY_ADMIN_EMAILS = ["admin@fusionleap.com"];

type CompanySeedConfig = {
  name: string;
  slug: string;
  domain: string;
  plan: PlanKey;
  subscriptionStatus: SubscriptionStatus;
  activityDomain: string;
  director: { fullName: string; emailLocal: string };
  /** Staff excluding directeur (created by provisionTenantCompany) */
  staff: Array<{ fullName: string; emailLocal: string; jobSlug: string }>;
};

const COMPANIES: CompanySeedConfig[] = [
  {
    name: "Fusion Leap",
    slug: "fusion-leap",
    domain: "fusionleap.com",
    plan: "enterprise",
    subscriptionStatus: "active",
    activityDomain: "digital",
    director: { fullName: "Youssef Kaab", emailLocal: "directeur" },
    staff: [
      { fullName: "Fatim Ezzagra", emailLocal: "gerant", jobSlug: "gerant" },
      { fullName: "Ouissal Benali", emailLocal: "developpeur", jobSlug: "developpeur" },
      { fullName: "Achraf Amrani", emailLocal: "designer", jobSlug: "designer" },
      { fullName: "Sara Idrissi", emailLocal: "commercial", jobSlug: "commercial" },
      { fullName: "Karim Bennani", emailLocal: "comptable", jobSlug: "comptable" },
      { fullName: "Nadia El Fassi", emailLocal: "rh", jobSlug: "rh" },
      { fullName: "Amine Tazi", emailLocal: "support", jobSlug: "support" },
      { fullName: "Oumaima Chraibi", emailLocal: "stagiaire", jobSlug: "stagiaire" },
    ],
  },
  {
    name: "Autolog",
    slug: "autolog",
    domain: "autolog.ma",
    plan: "business",
    subscriptionStatus: "trialing",
    activityDomain: "transport_logistics",
    director: { fullName: "Hassan Alaoui", emailLocal: "directeur" },
    staff: [
      { fullName: "Fatim Ezzahra", emailLocal: "gerant", jobSlug: "gerant" },
      { fullName: "Yassine Mansouri", emailLocal: "developpeur", jobSlug: "developpeur" },
      { fullName: "Imane Kadiri", emailLocal: "designer", jobSlug: "designer" },
      { fullName: "Dalal Saidi", emailLocal: "commercial", jobSlug: "commercial" },
      { fullName: "Mehdi Lahlou", emailLocal: "comptable", jobSlug: "comptable" },
      { fullName: "Salma Benkirane", emailLocal: "rh", jobSlug: "rh" },
      { fullName: "Rachid Ouazzani", emailLocal: "support", jobSlug: "support" },
      { fullName: "Aya Filali", emailLocal: "stagiaire", jobSlug: "stagiaire" },
    ],
  },
  {
    name: "Evana",
    slug: "evana",
    domain: "evana.ma",
    plan: "starter",
    subscriptionStatus: "active",
    activityDomain: "real_estate",
    director: { fullName: "Sofia Benjelloun", emailLocal: "directeur" },
    staff: [
      { fullName: "Omar Cherkaoui", emailLocal: "gerant", jobSlug: "gerant" },
      { fullName: "Hiba Ziani", emailLocal: "developpeur", jobSlug: "developpeur" },
      { fullName: "Nour El Amrani", emailLocal: "designer", jobSlug: "designer" },
      { fullName: "Reda Berrada", emailLocal: "commercial", jobSlug: "commercial" },
      { fullName: "Leila Moussaoui", emailLocal: "comptable", jobSlug: "comptable" },
      { fullName: "Samira Haddad", emailLocal: "rh", jobSlug: "rh" },
      { fullName: "Anas Kettani", emailLocal: "support", jobSlug: "support" },
      { fullName: "Ines Bakkali", emailLocal: "stagiaire", jobSlug: "stagiaire" },
    ],
  },
];

export type SeedAccount = {
  name: string;
  email: string;
  password: string;
  company: string;
  role: string;
};

export type SeedResult =
  | {
      status: "success";
      message: string;
      accounts: SeedAccount[];
    }
  | { status: "skipped"; message: string }
  | { status: "error"; message: string };

function accessRoleForJob(jobSlug: string): Role {
  if (jobSlug === "directeur") return "admin";
  if (jobSlug === "gerant") return "manager";
  return "member";
}

function jobLabel(slug: string): string {
  return DEFAULT_ORG_JOB_ROLES.find((r) => r.slug === slug)?.name ?? slug;
}

async function ensurePlatformAdmin(supabase: ReturnType<typeof createAdminClient>) {
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const users = listData.users ?? [];

  for (const legacyEmail of LEGACY_ADMIN_EMAILS) {
    const legacy = users.find((u) => u.email === legacyEmail);
    if (!legacy) continue;
    await supabase
      .from("profiles")
      .update({
        role: "member",
        organization_id: null,
        job_role_id: null,
        job_title: null,
      })
      .eq("id", legacy.id);
    await supabase.auth.admin.deleteUser(legacy.id);
  }

  let adminId = users.find((u) => u.email === PLATFORM_ADMIN_EMAIL)?.id;

  if (!adminId) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: PLATFORM_ADMIN_EMAIL,
      password: PLATFORM_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Administrateur CRM" },
    });
    if (error || !created.user) {
      throw new Error(error?.message ?? "Could not create platform admin");
    }
    adminId = created.user.id;
  } else {
    await supabase.auth.admin.updateUserById(adminId, {
      password: PLATFORM_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Administrateur CRM" },
    });
  }

  await supabase
    .from("profiles")
    .update({
      role: "platform_admin",
      organization_id: null,
      full_name: "Administrateur CRM",
      email: PLATFORM_ADMIN_EMAIL,
      job_title: "Administrateur plateforme",
      job_role_id: null,
    })
    .eq("id", adminId);
}

async function wipeDemoOrgs(supabase: ReturnType<typeof createAdminClient>) {
  const slugs = [
    ...COMPANIES.map((c) => c.slug),
    "fusion-leap-demo",
  ];

  for (const slug of slugs) {
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!org) continue;

    const { data: members } = await supabase
      .from("profiles")
      .select("id")
      .eq("organization_id", org.id);

    await supabase.from("organizations").delete().eq("id", org.id);

    for (const member of members ?? []) {
      await supabase.auth.admin.deleteUser(member.id);
    }
  }
}

async function getJobRolesMap(
  supabase: SupabaseClient,
  orgId: string
): Promise<Map<string, OrgJobRole>> {
  const { data } = await supabase
    .from("org_job_roles")
    .select("*")
    .eq("organization_id", orgId);
  const map = new Map<string, OrgJobRole>();
  for (const role of (data as OrgJobRole[]) ?? []) {
    map.set(role.slug, role);
  }
  return map;
}

async function addTeamMember(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  domain: string,
  jobRoles: Map<string, OrgJobRole>,
  member: { fullName: string; emailLocal: string; jobSlug: string }
): Promise<string> {
  const email = buildCompanyEmail(member.emailLocal, domain);
  const jobRole = jobRoles.get(member.jobSlug);
  if (!jobRole) throw new Error(`Job role "${member.jobSlug}" not found for ${domain}`);

  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: TEAM_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: member.fullName },
  });

  if (error || !created.user) {
    throw new Error(error?.message ?? `Could not create ${email}`);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      organization_id: orgId,
      role: accessRoleForJob(member.jobSlug),
      full_name: member.fullName,
      email,
      job_role_id: jobRole.id,
      job_title: jobRole.name,
    })
    .eq("id", created.user.id);

  if (profileError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    throw new Error(profileError.message);
  }

  return created.user.id;
}

async function seedCompany(
  supabase: ReturnType<typeof createAdminClient>,
  company: CompanySeedConfig
) {
  const directorEmail = buildCompanyEmail(company.director.emailLocal, company.domain);

  const { organizationId, directorId } = await provisionTenantCompany({
    organizationName: company.name,
    emailDomain: company.domain,
    slug: company.slug,
    directorName: company.director.fullName,
    directorEmail,
    directorPassword: TEAM_PASSWORD,
    client: supabase,
  });

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await supabase
    .from("organizations")
    .update({
      plan: company.plan,
      subscription_status: company.subscriptionStatus,
      activity_domain: company.activityDomain,
      trial_ends_at:
        company.subscriptionStatus === "trialing" ? defaultTrialEndsAt() : null,
      current_period_end:
        company.plan === "free" ? null : periodEnd.toISOString(),
    })
    .eq("id", organizationId);

  const jobRoles = await getJobRolesMap(supabase, organizationId);

  for (const member of company.staff) {
    await addTeamMember(supabase, organizationId, company.domain, jobRoles, member);
  }

  // Light demo tasks for the director + first staff member if any
  const firstStaff = company.staff[0];
  if (firstStaff) {
    const assigneeEmail = buildCompanyEmail(firstStaff.emailLocal, company.domain);
    const { data: assignee } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", assigneeEmail)
      .maybeSingle();

    const due = new Date();
    due.setDate(due.getDate() + 3);

    await supabase.from("tasks").insert([
      {
        organization_id: organizationId,
        title: `Onboarding équipe — ${company.name}`,
        description: "Configurer les accès et valider les rôles métier",
        status: "in_progress",
        priority: "high",
        due_date: due.toISOString().slice(0, 10),
        assigned_to: assignee?.id ?? directorId,
        created_by: directorId,
      },
      {
        organization_id: organizationId,
        title: `Revue pipeline — ${company.name}`,
        status: "todo",
        priority: "medium",
        due_date: due.toISOString().slice(0, 10),
        assigned_to: directorId,
        created_by: directorId,
      },
    ]);
  }

  return { organizationId, directorId };
}

function buildAccountsList(): SeedAccount[] {
  const accounts: SeedAccount[] = [
    {
      name: "Administrateur CRM",
      email: PLATFORM_ADMIN_EMAIL,
      password: PLATFORM_ADMIN_PASSWORD,
      company: "Portail",
      role: "Administrateur plateforme",
    },
  ];

  for (const company of COMPANIES) {
    accounts.push({
      name: company.director.fullName,
      email: buildCompanyEmail(company.director.emailLocal, company.domain),
      password: TEAM_PASSWORD,
      company: company.name,
      role: jobLabel("directeur"),
    });

    for (const member of company.staff) {
      accounts.push({
        name: member.fullName,
        email: buildCompanyEmail(member.emailLocal, company.domain),
        password: TEAM_PASSWORD,
        company: company.name,
        role: jobLabel(member.jobSlug),
      });
    }
  }

  return accounts;
}

export async function runSeed(options?: { force?: boolean }): Promise<SeedResult> {
  const supabase = createAdminClient();
  const primarySlug = COMPANIES[0]?.slug ?? "fusion-leap";

  const { data: existingOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", primarySlug)
    .maybeSingle();

  if (existingOrg && !options?.force) {
    await ensurePlatformAdmin(supabase);
    return {
      status: "skipped",
      message: `Seed déjà présent (${primarySlug}). Utilisez --force pour réinitialiser.`,
    };
  }

  if (options?.force) {
    await wipeDemoOrgs(supabase);
  }

  try {
    for (const company of COMPANIES) {
      await seedCompany(supabase, company);
    }
    await ensurePlatformAdmin(supabase);
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Échec du seed",
    };
  }

  const accounts = buildAccountsList();
  return {
    status: "success",
    message: `Seed OK — ${COMPANIES.length} entreprises × ${DEFAULT_ORG_JOB_ROLES.length} rôles + admin plateforme`,
    accounts,
  };
}
