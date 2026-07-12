"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canManageCompanies } from "@/lib/permissions";
import { PLAN_PRICES_EUR, type PlanKey } from "@/lib/billing/plans";
import type { Organization, PlatformPayment, Profile } from "@/types/database";

export type PlatformUserRow = Profile & {
  organization?: Pick<Organization, "id" | "name" | "logo_url"> | null;
};

export interface PlatformAdminStats {
  companiesCount: number;
  usersCount: number;
  companies: Organization[];
  users: PlatformUserRow[];
  openQuotes: number;
  unpaidInvoices: number;
  unpaidAmount: number;
  mrr: number;
  paidThisMonth: number;
  pastDueCompanies: number;
  recentPayments: PlatformPayment[];
  visaCount: number;
  mastercardCount: number;
}

export async function getPlatformAdminStats(): Promise<PlatformAdminStats | null> {
  const profile = await getCurrentProfile();
  if (!profile || !canManageCompanies(profile.role)) return null;

  const admin = createAdminClient();
  const [
    { data: companies },
    { data: users },
    { data: quotes },
    { data: invoices },
    { data: payments },
  ] = await Promise.all([
    admin.from("organizations").select("*").order("created_at", { ascending: false }),
    admin
      .from("profiles")
      .select(
        "*, organization:organizations(id, name, logo_url)"
      )
      .order("created_at", { ascending: false }),
    admin.from("platform_quotes").select("status"),
    admin.from("platform_invoices").select("status, amount"),
    admin
      .from("platform_payments")
      .select(
        `*, organization:organizations(id, name, email_domain, logo_url), invoice:platform_invoices(id, number, status, plan)`
      )
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const platformUsers = (users as PlatformUserRow[]) ?? [];

  const orgs = (companies as Organization[]) ?? [];
  const openQuotes = (quotes ?? []).filter(
    (q: { status: string }) => q.status === "draft" || q.status === "sent"
  ).length;
  const unpaid = (invoices ?? []).filter(
    (i: { status: string }) =>
      i.status === "pending" || i.status === "overdue" || i.status === "draft"
  );
  const unpaidAmount = unpaid.reduce(
    (n: number, i: { amount: number | string }) => n + Number(i.amount),
    0
  );

  const mrr = orgs
    .filter(
      (c) =>
        c.is_active !== false &&
        (c.subscription_status === "active" || c.subscription_status === "trialing")
    )
    .reduce((n, c) => n + (PLAN_PRICES_EUR[(c.plan ?? "free") as PlanKey] ?? 0), 0);

  const pastDueCompanies = orgs.filter(
    (c) => c.subscription_status === "past_due"
  ).length;

  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const { data: monthPays } = await admin
    .from("platform_payments")
    .select("amount, paid_at, status, card_brand")
    .eq("status", "succeeded");

  const paidThisMonth = (monthPays ?? [])
    .filter((p: { paid_at: string | null }) => {
      if (!p.paid_at) return false;
      const d = new Date(p.paid_at);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .reduce((n: number, p: { amount: number | string }) => n + Number(p.amount), 0);

  const visaCount = (monthPays ?? []).filter(
    (p: { card_brand: string | null }) => p.card_brand === "visa"
  ).length;
  const mastercardCount = (monthPays ?? []).filter(
    (p: { card_brand: string | null }) => p.card_brand === "mastercard"
  ).length;

  return {
    companiesCount: orgs.length,
    usersCount: platformUsers.length,
    companies: orgs,
    users: platformUsers,
    openQuotes,
    unpaidInvoices: unpaid.length,
    unpaidAmount,
    mrr,
    paidThisMonth,
    pastDueCompanies,
    recentPayments: (payments as PlatformPayment[]) ?? [],
    visaCount,
    mastercardCount,
  };
}

export async function getAllOrganizations(): Promise<Organization[]> {
  const profile = await getCurrentProfile();
  if (!profile || !canManageCompanies(profile.role)) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  return (data as Organization[]) ?? [];
}

export async function getOrganizationMemberCount(orgId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);
  return count ?? 0;
}

export async function getOrganizationDirectorEmail(orgId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("director_id")
    .eq("id", orgId)
    .single();
  if (!org?.director_id) return null;
  const { data: director } = await admin
    .from("profiles")
    .select("email")
    .eq("id", org.director_id)
    .single();
  return director?.email ?? null;
}

export async function getPlatformUsers(): Promise<PlatformUserRow[]> {
  const profile = await getCurrentProfile();
  if (!profile || !canManageCompanies(profile.role)) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("*, organization:organizations(id, name, logo_url)")
    .order("created_at", { ascending: false });

  return (data as PlatformUserRow[]) ?? [];
}
