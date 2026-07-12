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

/** Suggested CRM access level from a job-function slug. */
export function suggestedAccessRole(slug: string | null | undefined): Role {
  if (slug === "directeur") return "admin";
  if (slug === "gerant") return "manager";
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

/** Maps job slug → i18n key for what the function unlocks in the CRM. */
export function jobRoleAccessKey(slug: string | null | undefined): JobRoleAccessKey {
  switch (slug) {
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
