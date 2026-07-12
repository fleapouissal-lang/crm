import type { Role } from "@/types/database";
export {
  canAccessCalendar,
  canAccessClients,
  canAccessFullCrm,
  canAccessLeads,
  canAccessNavItem,
  canAccessTasks,
  canCreateTask,
  canDeleteTaskForProfile,
  canModifyTask,
  canViewAllTasks,
  canViewFinanceDocuments,
  canViewFinanceDocumentsForRole,
  getJobSlug,
  hasNavCapability,
  isLeadership,
  isTaskOwnedBy,
  type NavCapability,
} from "@/lib/permissions/capabilities";

export function isPlatformAdmin(role: Role): boolean {
  return role === "platform_admin";
}

export function isCompanyUser(role: Role): boolean {
  return role === "admin" || role === "manager" || role === "member";
}

export function canManageCompanies(role: Role): boolean {
  return role === "platform_admin";
}

export function canManageUsers(role: Role): boolean {
  return role === "admin" || role === "manager";
}

export function canDeleteLead(role: Role): boolean {
  if (role === "platform_admin") return false;
  return role === "admin" || role === "manager";
}

export function canDeleteTask(role: Role): boolean {
  if (role === "platform_admin") return false;
  return role === "admin" || role === "manager";
}

/** @deprecated Use canDeleteTaskForProfile(profile, task) for scoped access */
export function canDeleteTaskByRole(role: Role): boolean {
  return canDeleteTask(role);
}

export function canAssignLead(role: Role): boolean {
  if (role === "platform_admin") return false;
  return role === "admin" || role === "manager";
}

export function canAssignTask(role: Role): boolean {
  if (role === "platform_admin") return false;
  return role === "admin" || role === "manager";
}

export function canEditAnyLead(role: Role): boolean {
  if (role === "platform_admin") return false;
  return role === "admin" || role === "manager";
}

export function canEditAnyTask(role: Role): boolean {
  if (role === "platform_admin") return false;
  return role === "admin" || role === "manager";
}

export function canCreateLead(role: Role): boolean {
  if (role === "platform_admin") return false;
  return role === "admin" || role === "manager" || role === "member";
}

/** @deprecated Use canCreateTask(profile) from capabilities */
export function canCreateTaskByRole(role: Role): boolean {
  if (role === "platform_admin") return false;
  return role === "admin" || role === "manager" || role === "member";
}

/** Routes allowed for platform administrators only */
export const PLATFORM_ADMIN_PREFIXES = ["/dashboard", "/admin", "/settings"];

/** Company CRM routes — blocked for platform admin */
export const COMPANY_ONLY_PREFIXES = [
  "/leads",
  "/crm",
  "/clients",
  "/projects",
  "/tasks",
  "/calendar",
  "/sales",
  "/marketing",
  "/finance",
  "/hr",
  "/reports",
  "/notifications",
];

export function isPlatformAdminPath(pathname: string): boolean {
  if (pathname === "/dashboard") return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/settings")) return true;
  return false;
}

export function isCompanyOnlyPath(pathname: string): boolean {
  return COMPANY_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
