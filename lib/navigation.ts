import type { LucideIcon } from "lucide-react";
import type { NavCapability } from "@/lib/permissions/capabilities";
import {
  LayoutDashboard,
  Building2,
  UserPlus,
  Users,
  FolderKanban,
  Columns3,
  CheckSquare,
  Calendar,
  TrendingUp,
  Wallet,
  FileText,
  Receipt,
  CircleDollarSign,
  BarChart3,
  Bell,
  Settings,
  CreditCard,
} from "lucide-react";

export type NavBadge = "notifications" | "leads" | "quotes";

export type NavItem = {
  id: string;
  href: string;
  icon: LucideIcon;
  labelKey: keyof typeof navLabelKeys;
  badge?: NavBadge;
  /** Devis & factures — directeur + gérant */
  adminOnly?: boolean;
  capability?: NavCapability;
};

export const navLabelKeys = {
  dashboard: "dashboard",
  leads: "leads",
  clients: "clients",
  projects: "projects",
  tasks: "tasks",
  kanbanTasks: "kanbanTasks",
  calendar: "calendar",
  sales: "sales",
  marketing: "marketing",
  finance: "finance",
  quotes: "quotes",
  invoices: "invoices",
  expenses: "expenses",
  templates: "templates",
  hr: "hr",
  reports: "reports",
  notifications: "notifications",
  settings: "settings",
  companies: "companies",
  subscriptions: "subscriptions",
  payments: "payments",
  users: "users",
  createCompany: "createCompany",
  newClient: "newClient",
  newTask: "newTask",
  workspace: "workspace",
  operations: "operations",
  system: "system",
} as const;

export const platformAdminNav: NavItem[] = [
  { id: "dashboard", href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
  { id: "companies", href: "/admin/companies", icon: Building2, labelKey: "companies" },
  { id: "users", href: "/admin/users", icon: Users, labelKey: "users" },
  { id: "subscriptions", href: "/admin/subscriptions", icon: CreditCard, labelKey: "subscriptions" },
  { id: "quotes", href: "/admin/quotes", icon: FileText, labelKey: "quotes" },
  { id: "invoices", href: "/admin/invoices", icon: Receipt, labelKey: "invoices" },
  { id: "payments", href: "/admin/payments", icon: Wallet, labelKey: "payments" },
  { id: "settings", href: "/settings", icon: Settings, labelKey: "settings" },
];

export const workspaceNav: NavItem[] = [
  { id: "dashboard", href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard", capability: "always" },
  { id: "leads", href: "/leads", icon: UserPlus, labelKey: "leads", badge: "leads", capability: "leadership" },
  { id: "clients", href: "/clients", icon: Users, labelKey: "clients", capability: "clients" },
  { id: "projects", href: "/projects", icon: FolderKanban, labelKey: "projects", capability: "leadership" },
  { id: "reports", href: "/reports", icon: BarChart3, labelKey: "reports", capability: "leadership" },
  { id: "tasks", href: "/tasks?view=list", icon: CheckSquare, labelKey: "tasks", capability: "tasks" },
  { id: "kanban", href: "/tasks?view=board", icon: Columns3, labelKey: "kanbanTasks", capability: "tasks" },
  { id: "calendar", href: "/calendar", icon: Calendar, labelKey: "calendar", capability: "calendar" },
];

export const operationsNav: NavItem[] = [
  { id: "sales", href: "/sales", icon: TrendingUp, labelKey: "sales", capability: "leadership" },
  { id: "finance", href: "/finance", icon: Wallet, labelKey: "finance", capability: "leadership" },
  {
    id: "quotes",
    href: "/finance/quotes",
    icon: FileText,
    labelKey: "quotes",
    badge: "quotes",
    adminOnly: true,
    capability: "finance_docs",
  },
  {
    id: "invoices",
    href: "/finance/invoices",
    icon: Receipt,
    labelKey: "invoices",
    adminOnly: true,
    capability: "finance_docs",
  },
  {
    id: "expenses",
    href: "/finance/expenses",
    icon: CircleDollarSign,
    labelKey: "expenses",
    adminOnly: true,
    capability: "finance_docs",
  },
  { id: "hr", href: "/hr", icon: Users, labelKey: "hr", capability: "leadership" },
];

export const systemNav: NavItem[] = [
  { id: "notifications", href: "/notifications", icon: Bell, labelKey: "notifications", badge: "notifications", capability: "always" },
  { id: "settings", href: "/settings", icon: Settings, labelKey: "settings", capability: "always" },
];

export const pageMetaKeys: Record<string, { titleKey: keyof typeof navLabelKeys; subtitleKey: string }> = {
  "/dashboard": { titleKey: "dashboard", subtitleKey: "dashboardSub" },
  "/leads": { titleKey: "leads", subtitleKey: "leadsSub" },
  "/clients": { titleKey: "clients", subtitleKey: "clientsSub" },
  "/clients/new": { titleKey: "newClient", subtitleKey: "clientsSub" },
  "/projects": { titleKey: "projects", subtitleKey: "projectsSub" },
  "/tasks": { titleKey: "tasks", subtitleKey: "tasksSub" },
  "/tasks/new": { titleKey: "newTask", subtitleKey: "tasksSub" },
  "/calendar": { titleKey: "calendar", subtitleKey: "calendarSub" },
  "/sales": { titleKey: "sales", subtitleKey: "salesSub" },
  "/finance": { titleKey: "finance", subtitleKey: "financeSub" },
  "/finance/quotes": { titleKey: "quotes", subtitleKey: "quotesSub" },
  "/finance/invoices": { titleKey: "invoices", subtitleKey: "invoicesSub" },
  "/finance/expenses": { titleKey: "expenses", subtitleKey: "expensesSub" },
  "/finance/templates": { titleKey: "templates", subtitleKey: "templatesSub" },
  "/hr": { titleKey: "hr", subtitleKey: "hrSub" },
  "/reports": { titleKey: "reports", subtitleKey: "reportsSub" },
  "/notifications": { titleKey: "notifications", subtitleKey: "notificationsSub" },
  "/settings": { titleKey: "settings", subtitleKey: "settingsSub" },
  "/admin/companies": { titleKey: "companies", subtitleKey: "companiesSub" },
  "/admin/companies/new": { titleKey: "createCompany", subtitleKey: "createCompanySub" },
  "/admin/users": { titleKey: "users", subtitleKey: "usersSub" },
  "/admin/subscriptions": { titleKey: "subscriptions", subtitleKey: "subscriptionsSub" },
  "/admin/quotes": { titleKey: "quotes", subtitleKey: "adminQuotesSub" },
  "/admin/invoices": { titleKey: "invoices", subtitleKey: "adminInvoicesSub" },
  "/admin/payments": { titleKey: "payments", subtitleKey: "paymentsSub" },
};

export function matchPageMeta(pathname: string) {
  if (pathname.startsWith("/admin/subscriptions")) return pageMetaKeys["/admin/subscriptions"];
  if (pathname.startsWith("/admin/payments")) return pageMetaKeys["/admin/payments"];
  if (pathname.startsWith("/admin/quotes")) return pageMetaKeys["/admin/quotes"];
  if (pathname.startsWith("/admin/invoices")) return pageMetaKeys["/admin/invoices"];
  if (pathname.startsWith("/admin/users")) return pageMetaKeys["/admin/users"];
  if (pathname.startsWith("/admin/companies/new")) return pageMetaKeys["/admin/companies/new"];
  if (pathname.startsWith("/admin/companies")) return pageMetaKeys["/admin/companies"];
  if (pathname.startsWith("/clients/new")) return pageMetaKeys["/clients/new"];
  if (pathname.startsWith("/leads")) return pageMetaKeys["/leads"];
  if (pathname.startsWith("/crm")) return pageMetaKeys["/leads"];
  if (pathname.startsWith("/tasks/new")) return pageMetaKeys["/tasks/new"];
  if (pathname.startsWith("/tasks")) return pageMetaKeys["/tasks"];
  if (pathname.startsWith("/hr/")) return pageMetaKeys["/hr"];
  if (pathname.startsWith("/finance/quotes")) return pageMetaKeys["/finance/quotes"];
  if (pathname.startsWith("/finance/invoices")) return pageMetaKeys["/finance/invoices"];
  if (pathname.startsWith("/finance/expenses")) return pageMetaKeys["/finance/expenses"];
  if (pathname.startsWith("/finance/templates")) return pageMetaKeys["/finance/templates"];
  for (const key of Object.keys(pageMetaKeys)) {
    if (pathname === key || pathname.startsWith(key + "/")) {
      return pageMetaKeys[key];
    }
  }
  return pageMetaKeys["/dashboard"];
}
