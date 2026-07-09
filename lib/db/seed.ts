import { createAdminClient } from "@/lib/supabase/admin";
import { provisionTenantCompany } from "@/lib/organizations/provision-tenant";
import { buildCompanyEmail } from "@/lib/organizations/domain";
import type { OrgJobRole, Role } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

const TEAM_PASSWORD = "Demo123!";
const PLATFORM_ADMIN_EMAIL = "admin@fusionleap.com";
const PLATFORM_ADMIN_PASSWORD = "Admin123!";

const FUSION_LEAP_SLUG = "fusion-leap";
const AUTOLOG_SLUG = "autolog";

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

type TeamSeedMember = {
  fullName: string;
  emailLocal: string;
  jobSlug: string;
  accessRole: Role;
};

async function ensurePlatformAdmin(supabase: ReturnType<typeof createAdminClient>) {
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  let adminId = listData.users.find((u) => u.email === PLATFORM_ADMIN_EMAIL)?.id;

  if (!adminId) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: PLATFORM_ADMIN_EMAIL,
      password: PLATFORM_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Administrateur CRM" },
    });
    if (error || !created.user) return;
    adminId = created.user.id;
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
  const slugs = [FUSION_LEAP_SLUG, AUTOLOG_SLUG, "fusion-leap-demo"];
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
  member: TeamSeedMember
): Promise<string> {
  const email = buildCompanyEmail(member.emailLocal, domain);
  const jobRole = jobRoles.get(member.jobSlug);
  if (!jobRole) throw new Error(`Job role "${member.jobSlug}" not found`);

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
      role: member.accessRole,
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

async function seedFusionLeap(supabase: ReturnType<typeof createAdminClient>) {
  const { organizationId, directorId } = await provisionTenantCompany({
    organizationName: "Fusion Leap",
    emailDomain: "fusionleap.com",
    slug: FUSION_LEAP_SLUG,
    directorName: "Youssef Kaab",
    directorEmail: "youssef@fusionleap.com",
    directorPassword: TEAM_PASSWORD,
    client: supabase,
  });

  const jobRoles = await getJobRolesMap(supabase, organizationId);

  const fatimId = await addTeamMember(supabase, organizationId, "fusionleap.com", jobRoles, {
    fullName: "Fatim Ezzagra",
    emailLocal: "fatim",
    jobSlug: "gerant",
    accessRole: "manager",
  });

  const ouissalId = await addTeamMember(supabase, organizationId, "fusionleap.com", jobRoles, {
    fullName: "Ouissal",
    emailLocal: "ouissal",
    jobSlug: "developpeur",
    accessRole: "member",
  });

  const achrafId = await addTeamMember(supabase, organizationId, "fusionleap.com", jobRoles, {
    fullName: "Achraf",
    emailLocal: "achraf",
    jobSlug: "designer",
    accessRole: "member",
  });

  const oumaimaId = await addTeamMember(supabase, organizationId, "fusionleap.com", jobRoles, {
    fullName: "Oumaima",
    emailLocal: "oumaima",
    jobSlug: "stagiaire",
    accessRole: "member",
  });

  const today = new Date();
  const iso = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };

  await supabase.from("tasks").insert([
    {
      organization_id: organizationId,
      title: "Intégration API paiement — sprint 3",
      description: "Stripe + facturation récurrente",
      status: "in_progress",
      priority: "high",
      due_date: iso(3),
      assigned_to: ouissalId,
      created_by: directorId,
    },
    {
      organization_id: organizationId,
      title: "Refactor module auth multi-tenant",
      status: "todo",
      priority: "urgent",
      due_date: iso(5),
      assigned_to: ouissalId,
      created_by: ouissalId,
    },
    {
      organization_id: organizationId,
      title: "Maquettes dashboard Fusion Leap v2",
      status: "in_progress",
      priority: "medium",
      due_date: iso(4),
      assigned_to: achrafId,
      created_by: fatimId,
    },
    {
      organization_id: organizationId,
      title: "Recherche UX onboarding CRM",
      status: "todo",
      priority: "low",
      due_date: iso(7),
      assigned_to: oumaimaId,
      created_by: fatimId,
    },
    {
      organization_id: organizationId,
      title: "Revue stratégique Q3 — pipeline leads",
      status: "todo",
      priority: "medium",
      due_date: iso(2),
      assigned_to: directorId,
      created_by: fatimId,
    },
  ]);

  return { organizationId, directorId, ouissalId };
}

async function seedAutolog(supabase: ReturnType<typeof createAdminClient>) {
  const { organizationId, directorId } = await provisionTenantCompany({
    organizationName: "Autolog",
    emailDomain: "autolog.ma",
    slug: AUTOLOG_SLUG,
    directorName: "Youssef Kaab",
    directorEmail: "youssef@autolog.ma",
    directorPassword: TEAM_PASSWORD,
    client: supabase,
  });

  const jobRoles = await getJobRolesMap(supabase, organizationId);

  const fatimId = await addTeamMember(supabase, organizationId, "autolog.ma", jobRoles, {
    fullName: "Fatim Ezzahra",
    emailLocal: "fatim",
    jobSlug: "gerant",
    accessRole: "manager",
  });

  const dalalId = await addTeamMember(supabase, organizationId, "autolog.ma", jobRoles, {
    fullName: "Dalal",
    emailLocal: "dalal",
    jobSlug: "commercial",
    accessRole: "member",
  });

  const today = new Date();
  const iso = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };

  await supabase.from("tasks").insert([
    {
      organization_id: organizationId,
      title: "Prospection flotte ILM Voyages",
      description: "Premier contact + démo AutoLog",
      status: "in_progress",
      priority: "high",
      due_date: iso(1),
      assigned_to: dalalId,
      created_by: dalalId,
    },
    {
      organization_id: organizationId,
      title: "Relance devis transport Marrakech",
      status: "todo",
      priority: "medium",
      due_date: iso(3),
      assigned_to: dalalId,
      created_by: dalalId,
    },
    {
      organization_id: organizationId,
      title: "Validation contrat partenaire GPS Teltonika",
      status: "todo",
      priority: "medium",
      due_date: iso(5),
      assigned_to: fatimId,
      created_by: directorId,
    },
  ]);

  return { organizationId, dalalId };
}

function buildAccountsList(): SeedAccount[] {
  return [
    { name: "Administrateur global", email: PLATFORM_ADMIN_EMAIL, password: PLATFORM_ADMIN_PASSWORD, company: "Portail", role: "Platform admin" },
    { name: "Youssef Kaab", email: "youssef@fusionleap.com", password: TEAM_PASSWORD, company: "Fusion Leap", role: "Directeur" },
    { name: "Fatim Ezzagra", email: "fatim@fusionleap.com", password: TEAM_PASSWORD, company: "Fusion Leap", role: "Gérant" },
    { name: "Ouissal", email: "ouissal@fusionleap.com", password: TEAM_PASSWORD, company: "Fusion Leap", role: "Développeur" },
    { name: "Achraf", email: "achraf@fusionleap.com", password: TEAM_PASSWORD, company: "Fusion Leap", role: "Designer" },
    { name: "Oumaima", email: "oumaima@fusionleap.com", password: TEAM_PASSWORD, company: "Fusion Leap", role: "Stagiaire" },
    { name: "Youssef Kaab", email: "youssef@autolog.ma", password: TEAM_PASSWORD, company: "Autolog", role: "Directeur" },
    { name: "Fatim Ezzahra", email: "fatim@autolog.ma", password: TEAM_PASSWORD, company: "Autolog", role: "Gérant" },
    { name: "Dalal", email: "dalal@autolog.ma", password: TEAM_PASSWORD, company: "Autolog", role: "Commerciale" },
  ];
}

export async function runSeed(options?: { force?: boolean }): Promise<SeedResult> {
  const supabase = createAdminClient();

  const { data: existingOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", FUSION_LEAP_SLUG)
    .maybeSingle();

  if (existingOrg && !options?.force) {
    await ensurePlatformAdmin(supabase);
    return {
      status: "skipped",
      message: `Seed déjà présent (${FUSION_LEAP_SLUG}). Utilisez --force pour réinitialiser.`,
    };
  }

  if (options?.force) {
    await wipeDemoOrgs(supabase);
  }

  try {
    await seedFusionLeap(supabase);
    await seedAutolog(supabase);
    await ensurePlatformAdmin(supabase);
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Échec du seed",
    };
  }

  return {
    status: "success",
    message: "Seed OK — Fusion Leap (5) + Autolog (3) + admin global",
    accounts: buildAccountsList(),
  };
}
