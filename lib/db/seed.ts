import { createAdminClient } from "@/lib/supabase/admin";

const DEMO_EMAIL = "demo@fusionleap.ma";
const DEMO_PASSWORD = "Demo123!";
const DEMO_ORG_SLUG = "fusion-leap-demo";

export type SeedResult =
  | { status: "success"; message: string; email: string; password: string }
  | { status: "skipped"; message: string }
  | { status: "error"; message: string };

export async function runSeed(options?: { force?: boolean }): Promise<SeedResult> {
  const supabase = createAdminClient();

  const { data: existingOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", DEMO_ORG_SLUG)
    .maybeSingle();

  if (existingOrg && !options?.force) {
    return {
      status: "skipped",
      message: `Seed déjà présent (org: ${DEMO_ORG_SLUG}). Utilisez --force pour réinitialiser.`,
    };
  }

  if (existingOrg && options?.force) {
    await supabase.from("organizations").delete().eq("id", existingOrg.id);
  }

  let userId: string | undefined;

  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = listData.users.find((u) => u.email === DEMO_EMAIL);

  if (existingUser) {
    userId = existingUser.id;
    if (options?.force) {
      await supabase.auth.admin.updateUserById(userId, {
        password: DEMO_PASSWORD,
        user_metadata: { full_name: "Youssef Kaab" },
      });
    }
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Youssef Kaab" },
    });
    if (error || !created.user) {
      return { status: "error", message: error?.message ?? "Échec création utilisateur" };
    }
    userId = created.user.id;
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: "Fusion Leap Demo", slug: DEMO_ORG_SLUG })
    .select("id")
    .single();

  if (orgError || !org) {
    return { status: "error", message: orgError?.message ?? "Échec création organisation" };
  }

  const orgId = org.id;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      organization_id: orgId,
      role: "admin",
      full_name: "Youssef Kaab",
      email: DEMO_EMAIL,
    })
    .eq("id", userId);

  if (profileError) {
    return { status: "error", message: profileError.message };
  }

  const leads = [
    {
      organization_id: orgId,
      title: "Easy Touch — Phase 2 modules",
      company: "لمسة سهلة",
      contact_name: "Abu Nasser",
      email: "contact@easytouch.sa",
      phone: "+966 50 000 0000",
      value: 96000,
      stage: "negotiation" as const,
      notes: "AI scribe · ZATCA · LiveKit voice",
      assigned_to: userId,
      created_by: userId,
    },
    {
      organization_id: orgId,
      title: "Makkah Chamber — website redesign",
      company: "غرفة مكة",
      contact_name: "via Pixel IT",
      email: "rfp@makkahchamber.sa",
      value: 410000,
      stage: "proposal" as const,
      notes: "Dirasat Faniyya · due Jul 10",
      assigned_to: userId,
      created_by: userId,
    },
    {
      organization_id: orgId,
      title: "Natus — growth retainer",
      company: "Natus Marrakech",
      contact_name: "Hayat Ettaki",
      email: "hayat@natus.ma",
      value: 120000,
      stage: "won" as const,
      notes: "10K MAD/mo + 10%",
      assigned_to: userId,
      created_by: userId,
    },
    {
      organization_id: orgId,
      title: "Samnan — AI voice support",
      company: "Samnan Water Solutions",
      contact_name: "Support director",
      email: "info@samnan.sa",
      value: 80000,
      stage: "qualified" as const,
      assigned_to: userId,
      created_by: userId,
    },
    {
      organization_id: orgId,
      title: "Aghbalou site refresh",
      company: "Association Aghbalou",
      contact_name: "Monsieur Ibrahim",
      email: "contact@aghbalou.ma",
      value: 24000,
      stage: "new" as const,
      assigned_to: userId,
      created_by: userId,
    },
    {
      organization_id: orgId,
      title: "Shegl Marketplace maintenance",
      company: "Shegl",
      contact_name: "Nasser Aleidan",
      email: "nasser@shegl.com",
      value: 18500,
      stage: "won" as const,
      assigned_to: userId,
      created_by: userId,
    },
    {
      organization_id: orgId,
      title: "AutoLog fleet pilot",
      company: "ILM Voyages",
      contact_name: "Youssef Kaab",
      email: "fleet@ilmvoyages.ma",
      value: 45000,
      stage: "contacted" as const,
      assigned_to: userId,
      created_by: userId,
    },
  ];

  const { data: insertedLeads, error: leadsError } = await supabase
    .from("leads")
    .insert(leads)
    .select("id, title");

  if (leadsError || !insertedLeads?.length) {
    return { status: "error", message: leadsError?.message ?? "Échec insertion leads" };
  }

  const leadByTitle = Object.fromEntries(insertedLeads.map((l) => [l.title, l.id]));

  const today = new Date();
  const iso = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };

  const tasks = [
    {
      organization_id: orgId,
      title: "Finalize Arabic technical proposal appendix",
      description: "Makkah Chamber RFP — Dirasat Faniyya",
      status: "in_progress" as const,
      priority: "high" as const,
      due_date: iso(1),
      assigned_to: userId,
      lead_id: leadByTitle["Makkah Chamber — website redesign"],
      created_by: userId,
    },
    {
      organization_id: orgId,
      title: "Wire LiveKit into Easy Touch voice pipeline",
      description: "ElevenLabs Professional Clone cutover",
      status: "todo" as const,
      priority: "urgent" as const,
      due_date: iso(4),
      assigned_to: userId,
      lead_id: leadByTitle["Easy Touch — Phase 2 modules"],
      created_by: userId,
    },
    {
      organization_id: orgId,
      title: "Send Natus monthly growth report",
      description: "E-commerce KPIs + skin-scanner MVP scope",
      status: "todo" as const,
      priority: "medium" as const,
      due_date: iso(0),
      assigned_to: userId,
      lead_id: leadByTitle["Natus — growth retainer"],
      created_by: userId,
    },
    {
      organization_id: orgId,
      title: "Prepare Samnan ROI document (Arabic)",
      description: "10 agents replaced — voice AI comparison",
      status: "done" as const,
      priority: "medium" as const,
      due_date: iso(-2),
      assigned_to: userId,
      lead_id: leadByTitle["Samnan — AI voice support"],
      created_by: userId,
    },
    {
      organization_id: orgId,
      title: "Integrate Teltonika FMB920 GPS sync",
      description: "AutoLog staging deployment",
      status: "in_progress" as const,
      priority: "medium" as const,
      due_date: iso(7),
      assigned_to: userId,
      lead_id: leadByTitle["AutoLog fleet pilot"],
      created_by: userId,
    },
    {
      organization_id: orgId,
      title: "Review Aghbalou wireframes",
      status: "todo" as const,
      priority: "low" as const,
      due_date: iso(14),
      assigned_to: userId,
      lead_id: leadByTitle["Aghbalou site refresh"],
      created_by: userId,
    },
  ];

  const { error: tasksError } = await supabase.from("tasks").insert(tasks);
  if (tasksError) {
    return { status: "error", message: tasksError.message };
  }

  const activities = [
    {
      organization_id: orgId,
      type: "lead_created" as const,
      entity_type: "lead" as const,
      entity_id: leadByTitle["Easy Touch — Phase 2 modules"],
      message: 'Created lead "Easy Touch — Phase 2 modules"',
      user_id: userId,
    },
    {
      organization_id: orgId,
      type: "lead_stage_changed" as const,
      entity_type: "lead" as const,
      entity_id: leadByTitle["Natus — growth retainer"],
      message: 'Moved "Natus — growth retainer" to Won',
      user_id: userId,
    },
    {
      organization_id: orgId,
      type: "task_created" as const,
      entity_type: "task" as const,
      entity_id: null,
      message: 'Created task "Finalize Arabic technical proposal appendix"',
      user_id: userId,
    },
    {
      organization_id: orgId,
      type: "task_completed" as const,
      entity_type: "task" as const,
      entity_id: null,
      message: 'Completed task "Prepare Samnan ROI document (Arabic)"',
      user_id: userId,
    },
    {
      organization_id: orgId,
      type: "lead_updated" as const,
      entity_type: "lead" as const,
      entity_id: leadByTitle["Makkah Chamber — website redesign"],
      message: "Updated Makkah Chamber proposal value to SAR 410,000",
      user_id: userId,
    },
  ];

  const { error: actError } = await supabase.from("activities").insert(activities);
  if (actError) {
    return { status: "error", message: actError.message };
  }

  return {
    status: "success",
    message: `Seed OK — ${insertedLeads.length} leads, ${tasks.length} tasks, ${activities.length} activities`,
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  };
}
