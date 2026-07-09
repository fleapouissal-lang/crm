import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  FolderKanban,
  Columns3,
  Calendar,
  TrendingUp,
  Megaphone,
  Wallet,
  FileText,
  Receipt,
  UserCircle,
  BarChart3,
  Bell,
  Settings,
} from "lucide-react";

export type NavBadge = "notifications" | "leads" | "quotes";

export type NavItem = {
  id: string;
  href: string;
  icon: LucideIcon;
  labelKey: keyof typeof navLabelKeys;
  badge?: NavBadge;
  adminOnly?: boolean;
};

export const navLabelKeys = {
  dashboard: "dashboard",
  leads: "leads",
  clients: "clients",
  projects: "projects",
  kanbanTasks: "kanbanTasks",
  calendar: "calendar",
  sales: "sales",
  marketing: "marketing",
  finance: "finance",
  quotes: "quotes",
  invoices: "invoices",
  templates: "templates",
  hr: "hr",
  reports: "reports",
  notifications: "notifications",
  settings: "settings",
  workspace: "workspace",
  operations: "operations",
  system: "system",
} as const;

export const workspaceNav: NavItem[] = [
  { id: "dashboard", href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
  { id: "leads", href: "/leads", icon: UserPlus, labelKey: "leads", badge: "leads" },
  { id: "clients", href: "/clients", icon: Users, labelKey: "clients" },
  { id: "projects", href: "/projects", icon: FolderKanban, labelKey: "projects" },
  { id: "tasks", href: "/tasks", icon: Columns3, labelKey: "kanbanTasks" },
  { id: "calendar", href: "/calendar", icon: Calendar, labelKey: "calendar" },
];

export const operationsNav: NavItem[] = [
  { id: "sales", href: "/sales", icon: TrendingUp, labelKey: "sales" },
  { id: "marketing", href: "/marketing", icon: Megaphone, labelKey: "marketing" },
  { id: "finance", href: "/finance", icon: Wallet, labelKey: "finance" },
  {
    id: "quotes",
    href: "/finance/quotes",
    icon: FileText,
    labelKey: "quotes",
    badge: "quotes",
    adminOnly: true,
  },
  {
    id: "invoices",
    href: "/finance/invoices",
    icon: Receipt,
    labelKey: "invoices",
    adminOnly: true,
  },
  { id: "hr", href: "/hr", icon: UserCircle, labelKey: "hr" },
  { id: "reports", href: "/reports", icon: BarChart3, labelKey: "reports" },
];

export const systemNav: NavItem[] = [
  { id: "notifications", href: "/notifications", icon: Bell, labelKey: "notifications", badge: "notifications" },
  { id: "settings", href: "/settings", icon: Settings, labelKey: "settings" },
];

export const pageMetaKeys: Record<string, { titleKey: keyof typeof navLabelKeys; subtitleKey: string }> = {
  "/dashboard": { titleKey: "dashboard", subtitleKey: "dashboardSub" },
  "/leads": { titleKey: "leads", subtitleKey: "leadsSub" },
  "/clients": { titleKey: "clients", subtitleKey: "clientsSub" },
  "/projects": { titleKey: "projects", subtitleKey: "projectsSub" },
  "/tasks": { titleKey: "kanbanTasks", subtitleKey: "tasksSub" },
  "/calendar": { titleKey: "calendar", subtitleKey: "calendarSub" },
  "/sales": { titleKey: "sales", subtitleKey: "salesSub" },
  "/marketing": { titleKey: "marketing", subtitleKey: "marketingSub" },
  "/finance": { titleKey: "finance", subtitleKey: "financeSub" },
  "/finance/quotes": { titleKey: "quotes", subtitleKey: "quotesSub" },
  "/finance/invoices": { titleKey: "invoices", subtitleKey: "invoicesSub" },
  "/finance/templates": { titleKey: "templates", subtitleKey: "templatesSub" },
  "/hr": { titleKey: "hr", subtitleKey: "hrSub" },
  "/reports": { titleKey: "reports", subtitleKey: "reportsSub" },
  "/notifications": { titleKey: "notifications", subtitleKey: "notificationsSub" },
  "/settings": { titleKey: "settings", subtitleKey: "settingsSub" },
};

export function matchPageMeta(pathname: string) {
  if (pathname.startsWith("/leads")) return pageMetaKeys["/leads"];
  if (pathname.startsWith("/crm")) return pageMetaKeys["/leads"];
  if (pathname.startsWith("/tasks")) return pageMetaKeys["/tasks"];
  if (pathname.startsWith("/hr/")) return pageMetaKeys["/hr"];
  if (pathname.startsWith("/finance/quotes")) return pageMetaKeys["/finance/quotes"];
  if (pathname.startsWith("/finance/invoices")) return pageMetaKeys["/finance/invoices"];
  if (pathname.startsWith("/finance/templates")) return pageMetaKeys["/finance/templates"];
  for (const key of Object.keys(pageMetaKeys)) {
    if (pathname === key || pathname.startsWith(key + "/")) {
      return pageMetaKeys[key];
    }
  }
  return pageMetaKeys["/dashboard"];
}
