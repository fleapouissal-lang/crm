import type { Profile, Role, Task } from "@/types/database";

export type NavCapability =
  | "always"
  | "leadership"
  | "leads"
  | "clients"
  | "tasks"
  | "calendar"
  | "finance_docs";

export function getJobSlug(profile: Pick<Profile, "job_role">): string | null {
  return profile.job_role?.slug ?? null;
}

export function isLeadership(profile: Pick<Profile, "role">): boolean {
  return profile.role === "admin" || profile.role === "manager";
}

export function canViewFinanceDocumentsForRole(role: Role): boolean {
  return role === "admin" || role === "manager";
}

export function canViewFinanceDocuments(profile: Pick<Profile, "role">): boolean {
  return canViewFinanceDocumentsForRole(profile.role);
}

export function canAccessClients(profile: Profile): boolean {
  if (isLeadership(profile)) return true;
  return getJobSlug(profile) === "commercial";
}

export function canAccessTasks(profile: Profile): boolean {
  if (isLeadership(profile)) return true;
  const slug = getJobSlug(profile);
  return (
    slug === "developpeur" ||
    slug === "designer" ||
    slug === "commercial" ||
    slug === "stagiaire"
  );
}

/** Calendar for leadership + équipe who can access tasks. */
export function canAccessCalendar(profile: Profile): boolean {
  return isLeadership(profile) || canAccessTasks(profile);
}

export function canAccessLeads(profile: Profile): boolean {
  if (isLeadership(profile)) return true;
  return getJobSlug(profile) === "commercial";
}

export function canAccessFullCrm(profile: Profile): boolean {
  return isLeadership(profile);
}

export function isTaskOwnedBy(
  profile: Pick<Profile, "id">,
  task: Pick<Task, "assigned_to" | "created_by">
): boolean {
  return task.assigned_to === profile.id || task.created_by === profile.id;
}

export function canViewAllTasks(profile: Profile): boolean {
  return isLeadership(profile);
}

export function canCreateTask(profile: Profile): boolean {
  return canAccessTasks(profile);
}

export function canModifyTask(
  profile: Profile,
  task: Pick<Task, "assigned_to" | "created_by">
): boolean {
  if (isLeadership(profile)) return true;
  if (!canAccessTasks(profile)) return false;
  return isTaskOwnedBy(profile, task);
}

export function canDeleteTaskForProfile(
  profile: Profile,
  task?: Pick<Task, "assigned_to" | "created_by">
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
  if (capability === "tasks") return canAccessTasks(profile);
  if (capability === "calendar") return canAccessCalendar(profile);
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
    case "tasks":
    case "kanban":
      return canAccessTasks(profile);
    case "calendar":
      return canAccessCalendar(profile);
    default:
      return false;
  }
}
