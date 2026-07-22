import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Building2,
  Calendar,
  ClipboardList,
  Columns3,
  CircleDollarSign,
  FileText,
  FolderKanban,
  Home,
  Receipt,
  Ticket,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  normalizeActivityDomain,
  type ActivityDomainKey,
} from "@/lib/organizations/company-profile-options";

/** Always kept regardless of vertical (quotes/invoices/hr still gated by role capability). */
export const ALWAYS_VISIBLE_NAV_IDS = [
  "dashboard",
  "quotes",
  "invoices",
  "expenses",
  "hr",
  "notifications",
  "settings",
] as const;

export type VerticalNavId =
  | "dashboard"
  | "leads"
  | "clients"
  | "projects"
  | "tasks"
  | "kanban"
  | "calendar"
  | "sales"
  | "marketing"
  | "finance"
  | "quotes"
  | "invoices"
  | "expenses"
  | "hr"
  | "reports"
  | "notifications"
  | "settings";

export type VerticalPresetKey = "digital" | "finance_insurance" | "real_estate" | "default";

export type VerticalNavPreset = {
  key: VerticalPresetKey;
  /** Module ids visible in sidebar (plus ALWAYS_VISIBLE_NAV_IDS). */
  visibleIds: readonly VerticalNavId[];
  /** Override nav labelKey → vertical i18n key under fusion.verticalNav[preset]. */
  labelOverrides?: Partial<Record<VerticalNavId, string>>;
  iconOverrides?: Partial<Record<VerticalNavId, LucideIcon>>;
};

const DEFAULT_VISIBLE: readonly VerticalNavId[] = [
  "dashboard",
  "leads",
  "clients",
  "projects",
  "tasks",
  "kanban",
  "calendar",
  "sales",
  "finance",
  "quotes",
  "invoices",
  "expenses",
  "hr",
  "reports",
  "notifications",
  "settings",
];

export const VERTICAL_PRESETS: Record<VerticalPresetKey, VerticalNavPreset> = {
  default: {
    key: "default",
    visibleIds: DEFAULT_VISIBLE,
  },
  digital: {
    key: "digital",
    visibleIds: [
      "dashboard",
      "leads",
      "clients",
      "projects",
      "tasks",
      "kanban",
      "calendar",
      "sales",
      "quotes",
      "invoices",
      "expenses",
      "hr",
      "reports",
      "notifications",
      "settings",
    ],
    labelOverrides: {
      leads: "leads",
      clients: "clients",
      projects: "projects",
      tasks: "tasks",
      sales: "sales",
      quotes: "quotes",
      invoices: "invoices",
      expenses: "expenses",
      reports: "reports",
    },
    iconOverrides: {
      projects: FolderKanban,
      tasks: Ticket,
      kanban: Columns3,
      leads: UserPlus,
      clients: Building2,
      quotes: FileText,
      invoices: Receipt,
      expenses: CircleDollarSign,
    },
  },
  finance_insurance: {
    key: "finance_insurance",
    visibleIds: [
      "dashboard",
      "clients",
      "finance",
      "quotes",
      "invoices",
      "expenses",
      "hr",
      "calendar",
      "reports",
      "notifications",
      "settings",
    ],
    labelOverrides: {
      clients: "clients",
      finance: "finance",
      quotes: "quotes",
      invoices: "invoices",
      expenses: "expenses",
      calendar: "calendar",
      reports: "reports",
    },
    iconOverrides: {
      clients: Briefcase,
      finance: Wallet,
      quotes: FileText,
      invoices: Receipt,
      expenses: CircleDollarSign,
      calendar: ClipboardList,
    },
  },
  real_estate: {
    key: "real_estate",
    visibleIds: [
      "dashboard",
      "leads",
      "clients",
      "projects",
      "calendar",
      "sales",
      "quotes",
      "invoices",
      "expenses",
      "hr",
      "reports",
      "notifications",
      "settings",
    ],
    labelOverrides: {
      leads: "leads",
      clients: "clients",
      projects: "projects",
      calendar: "calendar",
      sales: "sales",
      quotes: "quotes",
      invoices: "invoices",
      expenses: "expenses",
    },
    iconOverrides: {
      projects: Home,
      leads: UserPlus,
      clients: Users,
      calendar: Calendar,
      tasks: Columns3,
      expenses: CircleDollarSign,
    },
  },
};

const DOMAIN_TO_PRESET: Partial<Record<ActivityDomainKey, VerticalPresetKey>> = {
  digital: "digital",
  telecom: "digital",
  finance_insurance: "finance_insurance",
  real_estate: "real_estate",
};

export function resolveVerticalPresetKey(
  activityDomain: string | null | undefined
): VerticalPresetKey {
  const normalized = normalizeActivityDomain(activityDomain);
  if (!normalized) return "default";
  return DOMAIN_TO_PRESET[normalized as ActivityDomainKey] ?? "default";
}

export function getVerticalPreset(
  activityDomain: string | null | undefined
): VerticalNavPreset {
  return VERTICAL_PRESETS[resolveVerticalPresetKey(activityDomain)];
}

export function isNavIdVisibleInPreset(
  preset: VerticalNavPreset,
  navId: string
): boolean {
  if ((ALWAYS_VISIBLE_NAV_IDS as readonly string[]).includes(navId)) return true;
  return (preset.visibleIds as readonly string[]).includes(navId);
}

/** Map pathname → nav module id for access checks. */
export function pathnameToNavId(pathname: string): VerticalNavId | null {
  if (pathname.startsWith("/admin")) return null;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "dashboard";
  if (pathname.startsWith("/leads") || pathname.startsWith("/crm")) return "leads";
  if (pathname.startsWith("/clients")) return "clients";
  if (pathname.startsWith("/projects")) return "projects";
  if (pathname.startsWith("/tasks")) return "tasks";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/sales") || pathname.startsWith("/marketing")) {
    return "sales";
  }
  if (pathname.startsWith("/finance/quotes")) return "quotes";
  if (pathname.startsWith("/finance/invoices")) return "invoices";
  if (pathname.startsWith("/finance/expenses")) return "expenses";
  if (pathname.startsWith("/finance/templates")) return "finance";
  if (pathname.startsWith("/finance")) return "finance";
  if (pathname.startsWith("/hr")) return "hr";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/notifications")) return "notifications";
  if (pathname.startsWith("/settings")) return "settings";
  return null;
}

export function canAccessModule(
  activityDomain: string | null | undefined,
  pathname: string
): boolean {
  // Platform admin routes are never gated by vertical presets.
  if (pathname.startsWith("/admin")) return true;
  const navId = pathnameToNavId(pathname);
  if (!navId) return true;
  const preset = getVerticalPreset(activityDomain);
  return isNavIdVisibleInPreset(preset, navId);
}
