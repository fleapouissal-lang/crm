import type { Profile, Role, Task } from "@/types/database";
import {
  resolveJobSlug,
  resolveStagiairePages,
  type MemberPageNavKey,
} from "@/lib/organizations/job-role-access";

export type NavCapability =
  | "always"
  | "leadership"
  | "leads"
  | "clients"
  | "projects"
  | "tasks"
  | "calendar"
  | "reports"
  | "files"
  | "finance"
  | "quotes"
  | "invoices"
  | "expenses"
  | "hr"
  | "finance_docs";

export function getJobSlug(
  profile: Pick<Profile, "job_role" | "job_title">
): string | null {
  const jr = profile.job_role as
    | Profile["job_role"]
    | Array<NonNullable<Profile["job_role"]>>
    | null
    | undefined;
  const joined = Array.isArray(jr) ? jr[0] : jr;
  return resolveJobSlug(
    joined?.slug,
    joined?.name ?? profile.job_title
  );
}

/** null = not a stagiaire (use job-slug rules). */
function stagiaireAllowsPage(
  profile: Profile,
  page: MemberPageNavKey
): boolean | null {
  const pages = resolveStagiairePages({
    member_pages: profile.member_pages,
    job_role: profile.job_role,
    job_title: profile.job_title,
  });
  if (!pages) return null;
  return pages.includes(page);
}

export function isLeadership(profile: Pick<Profile, "role">): boolean {
  return profile.role === "admin" || profile.role === "manager";
}

export function canViewFinanceDocumentsForRole(role: Role): boolean {
  return role === "admin" || role === "manager";
}

export function canViewFinanceDocuments(profile: Profile): boolean {
  if (canViewFinanceDocumentsForRole(profile.role)) return true;
  const finance = stagiaireAllowsPage(profile, "finance");
  const quotes = stagiaireAllowsPage(profile, "quotes");
  const invoices = stagiaireAllowsPage(profile, "invoices");
  const expenses = stagiaireAllowsPage(profile, "expenses");
  if (
    finance === null &&
    quotes === null &&
    invoices === null &&
    expenses === null
  ) {
    return false;
  }
  return (
    finance === true ||
    quotes === true ||
    invoices === true ||
    expenses === true
  );
}

export function canAccessClients(profile: Profile): boolean {
  if (isLeadership(profile)) return true;
  const custom = stagiaireAllowsPage(profile, "clients");
  if (custom !== null) return custom;
  return getJobSlug(profile) === "commercial";
}

export function canAccessTasks(profile: Profile): boolean {
  if (isLeadership(profile)) return true;
  const custom = stagiaireAllowsPage(profile, "tasks");
  if (custom !== null) return custom;
  const slug = getJobSlug(profile);
  return (
    slug === "developpeur" ||
    slug === "designer" ||
    slug === "commercial" ||
    slug === "stagiaire"
  );
}

/** Calendar for leadership + équipe who can access tasks / calendar page. */
export function canAccessCalendar(profile: Profile): boolean {
  if (isLeadership(profile)) return true;
  const custom = stagiaireAllowsPage(profile, "calendar");
  if (custom !== null) return custom;
  return canAccessTasks(profile);
}

/** Sales workspace for leadership and commercial team members. */
export function canAccessLeads(profile: Profile): boolean {
  if (isLeadership(profile)) return true;
  const custom = stagiaireAllowsPage(profile, "clients");
  if (custom !== null) return custom;
  const slug = getJobSlug(profile);
  return (
    slug === "commercial" ||
    Boolean(
      slug &&
        (slug.includes("marketing") ||
          slug.includes("markete") ||
          slug.includes("تسويق") ||
          slug.includes("مسوق"))
    )
  );
}

export function canAccessProjects(profile: Profile): boolean {
  if (isLeadership(profile)) return true;
  const custom = stagiaireAllowsPage(profile, "projects");
  if (custom !== null) return custom;
  return getJobSlug(profile) === "stagiaire";
}

export function canAccessReports(profile: Profile): boolean {
  if (isLeadership(profile)) return true;
  return stagiaireAllowsPage(profile, "reports") === true;
}

/** Files page — directeur & gérant only. */
export function canAccessFiles(profile: Profile): boolean {
  return isLeadership(profile);
}

export function canAccessFinanceHub(profile: Profile): boolean {
  if (isLeadership(profile)) return true;
  return stagiaireAllowsPage(profile, "finance") === true;
}

export function canAccessQuotes(profile: Profile): boolean {
  if (isLeadership(profile)) return true;
  const custom = stagiaireAllowsPage(profile, "quotes");
  if (custom !== null) return custom;
  return stagiaireAllowsPage(profile, "finance") === true;
}

export function canAccessInvoices(profile: Profile): boolean {
  if (isLeadership(profile)) return true;
  const custom = stagiaireAllowsPage(profile, "invoices");
  if (custom !== null) return custom;
  return stagiaireAllowsPage(profile, "finance") === true;
}

export function canAccessExpenses(profile: Profile): boolean {
  if (isLeadership(profile)) return true;
  const custom = stagiaireAllowsPage(profile, "expenses");
  if (custom !== null) return custom;
  return stagiaireAllowsPage(profile, "finance") === true;
}

export function canAccessHr(profile: Profile): boolean {
  if (isLeadership(profile)) return true;
  return stagiaireAllowsPage(profile, "hr") === true;
}

export function canAccessFullCrm(profile: Profile): boolean {
  return isLeadership(profile);
}

export function isTaskOwnedBy(
  profile: Pick<Profile, "id">,
  task: Pick<Task, "assigned_to" | "created_by" | "assignee_ids">
): boolean {
  if (task.assigned_to === profile.id || task.created_by === profile.id) {
    return true;
  }
  return (task.assignee_ids ?? []).includes(profile.id);
}

export function canViewAllTasks(profile: Profile): boolean {
  return isLeadership(profile);
}

export function canCreateTask(profile: Profile): boolean {
  return canAccessTasks(profile);
}

export function canModifyTask(
  profile: Profile,
  task: Pick<Task, "assigned_to" | "created_by" | "assignee_ids">
): boolean {
  if (isLeadership(profile)) return true;
  if (!canAccessTasks(profile)) return false;
  return isTaskOwnedBy(profile, task);
}

export function canDeleteTaskForProfile(
  profile: Profile,
  task?: Pick<Task, "assigned_to" | "created_by" | "assignee_ids">
): boolean {
  if (isLeadership(profile)) return true;
  if (!task) return false;
  if (getJobSlug(profile) !== "developpeur") return false;
  return isTaskOwnedBy(profile, task);
}

export function hasNavCapability(
  profile: Profile,
  capability?: NavCapability
): boolean {
  if (!capability || capability === "always") return true;
  if (capability === "leadership") return isLeadership(profile);
  if (capability === "leads") return canAccessLeads(profile);
  if (capability === "clients") return canAccessClients(profile);
  if (capability === "projects") return canAccessProjects(profile);
  if (capability === "tasks") return canAccessTasks(profile);
  if (capability === "calendar") return canAccessCalendar(profile);
  if (capability === "reports") return canAccessReports(profile);
  if (capability === "files") return canAccessFiles(profile);
  if (capability === "finance") return canAccessFinanceHub(profile);
  if (capability === "quotes") return canAccessQuotes(profile);
  if (capability === "invoices") return canAccessInvoices(profile);
  if (capability === "expenses") return canAccessExpenses(profile);
  if (capability === "hr") return canAccessHr(profile);
  if (capability === "finance_docs") return canViewFinanceDocuments(profile);
  return true;
}

export function canAccessNavItem(profile: Profile, itemId: string): boolean {
  if (isLeadership(profile)) return true;

  switch (itemId) {
    case "dashboard":
    case "settings":
    case "notifications":
      return true;
    case "leads":
      return canAccessLeads(profile);
    case "clients":
      return canAccessClients(profile);
    case "projects":
      return canAccessProjects(profile);
    case "tasks":
    case "kanban":
      return canAccessTasks(profile);
    case "calendar":
      return canAccessCalendar(profile);
    case "reports":
      return canAccessReports(profile);
    case "files":
      return canAccessFiles(profile);
    case "finance":
      return canAccessFinanceHub(profile);
    case "quotes":
      return canAccessQuotes(profile);
    case "invoices":
      return canAccessInvoices(profile);
    case "expenses":
      return canAccessExpenses(profile);
    case "hr":
      return canAccessHr(profile);
    default:
      return false;
  }
}
