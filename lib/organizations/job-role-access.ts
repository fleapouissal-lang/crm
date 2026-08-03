import type { Role } from "@/types/database";
import { DEFAULT_ORG_JOB_ROLES } from "@/lib/organizations/default-roles";

export type JobRoleAccessKey =
  | "director"
  | "manager"
  | "dev"
  | "design"
  | "sales"
  | "intern"
  | "finance"
  | "hr"
  | "support"
  | "default";

/** Nav keys shown as chips for member access (labels from dict.nav). */
export type MemberPageNavKey =
  | "dashboard"
  | "clients"
  | "projects"
  | "tasks"
  | "calendar"
  | "reports"
  | "finance"
  | "quotes"
  | "invoices"
  | "expenses"
  | "hr"
  | "notifications"
  | "settings";

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

/**
 * Canonical job slug from DB slug and/or display name.
 * Handles renamed titles like "Stagiaire marketing" when slug is missing/custom.
 */
export function resolveJobSlug(
  slug: string | null | undefined,
  name?: string | null | undefined
): string | null {
  const s = normalizeToken(slug ?? "");
  if (
    s === "directeur" ||
    s === "gerant" ||
    s === "developpeur" ||
    s === "designer" ||
    s === "commercial" ||
    s === "stagiaire" ||
    s === "comptable" ||
    s === "rh" ||
    s === "support"
  ) {
    return s;
  }

  const title = normalizeToken(name ?? "");
  if (!title) return s || null;
  if (title.includes("commercial")) return "commercial";
  if (title.includes("developpeur") || title.includes("developer")) {
    return "developpeur";
  }
  if (title.includes("designer")) return "designer";
  if (title.includes("stagiaire") || title.includes("intern")) return "stagiaire";
  if (title.includes("comptable") || title.includes("accountant")) {
    return "comptable";
  }
  if (title.includes("ressource") || title === "rh" || title.includes("human")) {
    return "rh";
  }
  if (title.includes("support")) return "support";
  if (title.includes("directeur") || title.includes("director")) {
    return "directeur";
  }
  if (title.includes("gerant") || title.includes("manager")) return "gerant";
  return s || null;
}

export function isStagiaireJob(
  slug: string | null | undefined,
  name?: string | null | undefined
): boolean {
  return resolveJobSlug(slug, name) === "stagiaire";
}

/** Suggested CRM access level from a job-function slug/name. */
export function suggestedAccessRole(
  slug: string | null | undefined,
  name?: string | null | undefined
): Role {
  const resolved = resolveJobSlug(slug, name);
  if (resolved === "directeur") return "admin";
  if (resolved === "gerant") return "manager";
  return "member";
}

/** Stable sort: default catalog order, then extras A→Z. */
export function sortJobRolesByCatalog<T extends { slug: string; name: string }>(
  roles: T[]
): T[] {
  const order = new Map<string, number>(
    DEFAULT_ORG_JOB_ROLES.map((r, i) => [r.slug, i])
  );
  return [...roles].sort((a, b) => {
    const ai = order.get(a.slug) ?? 1000;
    const bi = order.get(b.slug) ?? 1000;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

/** Maps job slug/name → i18n key for what the function unlocks in the CRM. */
export function jobRoleAccessKey(
  slug: string | null | undefined,
  name?: string | null | undefined
): JobRoleAccessKey {
  switch (resolveJobSlug(slug, name)) {
    case "directeur":
      return "director";
    case "gerant":
      return "manager";
    case "developpeur":
      return "dev";
    case "designer":
      return "design";
    case "commercial":
      return "sales";
    case "stagiaire":
      return "intern";
    case "comptable":
      return "finance";
    case "rh":
      return "hr";
    case "support":
      return "support";
    default:
      return "default";
  }
}

const BASE_MEMBER_PAGES: MemberPageNavKey[] = [
  "dashboard",
  "notifications",
  "settings",
];

/** Modules an admin can toggle on/off for a stagiaire (director-like set). */
export const STAGIAIRE_TOGGLE_PAGES: readonly MemberPageNavKey[] = [
  "clients",
  "projects",
  "tasks",
  "calendar",
  "reports",
  "finance",
  "quotes",
  "invoices",
  "expenses",
  "hr",
] as const;

/** Always kept for stagiaires (system pages). */
export const STAGIAIRE_ALWAYS_PAGES: readonly MemberPageNavKey[] = [
  "dashboard",
  "notifications",
  "settings",
] as const;

/** Default: all director pages visible; admin can uncheck to hide. */
export const STAGIAIRE_DEFAULT_TOGGLES: readonly MemberPageNavKey[] = [
  ...STAGIAIRE_TOGGLE_PAGES,
] as const;

const ALL_MEMBER_PAGE_KEYS: readonly MemberPageNavKey[] = [
  "dashboard",
  "clients",
  "projects",
  "tasks",
  "calendar",
  "reports",
  "finance",
  "quotes",
  "invoices",
  "expenses",
  "hr",
  "notifications",
  "settings",
];

export function isMemberPageNavKey(value: string): value is MemberPageNavKey {
  return (ALL_MEMBER_PAGE_KEYS as readonly string[]).includes(value);
}

/** Build stored member_pages from toggle selection. */
export function buildStagiaireMemberPages(
  toggled: readonly string[]
): MemberPageNavKey[] {
  const enabled = new Set(
    toggled.filter((p): p is MemberPageNavKey =>
      (STAGIAIRE_TOGGLE_PAGES as readonly string[]).includes(p)
    )
  );
  return [
    ...STAGIAIRE_ALWAYS_PAGES,
    ...STAGIAIRE_TOGGLE_PAGES.filter((p) => enabled.has(p)),
  ];
}

/** Toggleable subset currently enabled in a stored/default page list. */
export function stagiaireTogglesFromPages(
  pages: readonly string[] | null | undefined
): MemberPageNavKey[] {
  if (!pages?.length) return [...STAGIAIRE_DEFAULT_TOGGLES];
  return STAGIAIRE_TOGGLE_PAGES.filter((p) => pages.includes(p));
}

/** Normalize arbitrary page ids to known keys (stable order). */
export function normalizeMemberPages(
  pages: readonly string[] | null | undefined
): MemberPageNavKey[] | null {
  if (!pages?.length) return null;
  const set = new Set(pages.filter(isMemberPageNavKey));
  if (set.size === 0) return null;
  return ALL_MEMBER_PAGE_KEYS.filter((p) => set.has(p));
}

/** Effective pages for a stagiaire profile (custom or defaults). */
export function resolveStagiairePages(input: {
  member_pages?: string[] | null;
  job_role?: { slug?: string | null; name?: string | null } | null;
  job_title?: string | null;
}): MemberPageNavKey[] | null {
  if (!isStagiaireJob(input.job_role?.slug, input.job_role?.name ?? input.job_title)) {
    return null;
  }
  const custom = normalizeMemberPages(input.member_pages);
  if (custom) return custom;
  return buildStagiaireMemberPages(STAGIAIRE_DEFAULT_TOGGLES);
}

/** Pages a Member with this job function can open (personalized modules). */
export function memberPagesForJob(
  slug: string | null | undefined,
  name?: string | null | undefined
): MemberPageNavKey[] {
  const key = jobRoleAccessKey(slug, name);
  switch (key) {
    case "director":
    case "manager":
      return [
        "dashboard",
        "clients",
        "projects",
        "tasks",
        "calendar",
        "reports",
        "finance",
        "quotes",
        "invoices",
        "expenses",
        "hr",
        "notifications",
        "settings",
      ];
    case "sales":
      return [
        "dashboard",
        "clients",
        "tasks",
        "calendar",
        "notifications",
        "settings",
      ];
    case "dev":
    case "design":
      return ["dashboard", "tasks", "calendar", "notifications", "settings"];
    case "intern":
      return buildStagiaireMemberPages(STAGIAIRE_DEFAULT_TOGGLES);
    default:
      return BASE_MEMBER_PAGES;
  }
}
