"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  FileText,
  Globe,
  Mail,
  Pencil,
  Plus,
  Receipt,
  Users,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";
import type { PlatformAdminStats } from "@/lib/actions/platform-admin";
import { resolvePlatformCurrency } from "@/lib/billing/currency";
import { formatPlatformMoney } from "@/lib/billing/platform-docs";
import { PAYMENT_STATUS_BADGE } from "@/lib/billing/payments";
import { loadPreferences } from "@/lib/settings/storage";
import type { CurrencyCode } from "@/lib/settings/types";
import { cn } from "@/lib/utils";
import { OrgLogo } from "@/components/shared/org-logo";

export function PlatformAdminDashboard({ stats }: { stats: PlatformAdminStats }) {
  const dict = useDict();
  const s = dict.fusion.settings;
  const d = dict.fusion.platformAdmin;
  const b = dict.fusion.platformBilling;
  const pay = dict.fusion.platformPayments;
  const activeCount = stats.companies.filter((c) => c.is_active !== false).length;
  const [currency, setCurrency] = useState<CurrencyCode>("MAD");

  useEffect(() => {
    setCurrency(loadPreferences().currency);
  }, []);

  return (
    <div className="space-y-[18px]">
      <div className="fl-card fl-pad">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className="grid size-11 place-items-center rounded-xl text-white"
              style={{ background: "var(--grad-brand)" }}
            >
              <Globe className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">{d.globalSiteTitle}</h2>
              <p className="mt-1 text-sm fl-faint">{d.globalSiteSub}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/payments" className="fl-btn primary sm">
              <Wallet className="size-4" />
              {d.managePayments}
            </Link>
            <Link href="/admin/companies/new" className="fl-btn sm ghost">
              <Plus strokeWidth={2} />
              {s.createCompany}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-[18px] sm:grid-cols-2 xl:grid-cols-5">
        <div className="fl-card fl-pad">
          <div className="k-label">{s.companies}</div>
          <StatLine value={String(stats.companiesCount)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{s.activeCompanies}</div>
          <StatLine value={String(activeCount)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{d.totalUsers}</div>
          <StatLine value={String(stats.usersCount)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{d.mrrLabel}</div>
          <StatLine value={formatPlatformMoney(stats.mrr, currency)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{d.paidThisMonth}</div>
          <StatLine value={formatPlatformMoney(stats.paidThisMonth, currency)} />
        </div>
      </div>

      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{d.billingOverview}</h3>
            <div className="ch-sub">{d.billingOverviewSub}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/quotes" className="fl-btn sm ghost">
              <FileText className="size-4" />
              {d.manageQuotes}
            </Link>
            <Link href="/admin/invoices" className="fl-btn sm ghost">
              <Receipt className="size-4" />
              {d.manageInvoices}
            </Link>
            <Link href="/admin/payments" className="fl-btn primary sm">
              <Wallet className="size-4" />
              {d.managePayments}
            </Link>
          </div>
        </div>
        <div className="grid g-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-4">
            <div className="k-label">{b.openQuotes}</div>
            <StatLine value={String(stats.openQuotes)} />
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-4">
            <div className="k-label">{b.unpaidAmount}</div>
            <StatLine value={formatPlatformMoney(stats.unpaidAmount, currency)} />
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-4">
            <div className="k-label">Visa</div>
            <StatLine value={String(stats.visaCount)} />
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-4">
            <div className="k-label">Mastercard</div>
            <StatLine value={String(stats.mastercardCount)} />
          </div>
        </div>
        {stats.pastDueCompanies > 0 ? (
          <div className="fl-pad flex items-center gap-2 border-t border-[var(--border)] text-sm">
            <AlertTriangle className="size-4 text-[var(--amber)]" />
            <span>
              {d.pastDueCompanies}: <b>{stats.pastDueCompanies}</b>
            </span>
            <Link href="/admin/subscriptions" className="fl-btn sm ghost ms-auto">
              {d.manageSubscriptions}
            </Link>
          </div>
        ) : null}
      </div>

      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{d.recentPayments}</h3>
            <div className="ch-sub">{d.recentPaymentsSub}</div>
          </div>
          <Link href="/admin/payments" className="fl-btn sm ghost">
            {d.managePayments}
          </Link>
        </div>
        {stats.recentPayments.length === 0 ? (
          <p className="fl-pad py-8 text-center text-sm fl-faint">{pay.noPayments}</p>
        ) : (
          <div className="fl-tbl-wrap">
            <table className="fl-tbl">
              <thead>
                <tr>
                  <th>{b.reference}</th>
                  <th>{b.company}</th>
                  <th>{b.amount}</th>
                  <th>{pay.card}</th>
                  <th>{b.status}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentPayments.map((row) => (
                  <tr key={row.id}>
                    <td className="fl-mono">{row.number}</td>
                    <td>
                      <b>{row.organization?.name ?? "—"}</b>
                    </td>
                    <td className="fl-mono">
                      {formatPlatformMoney(
                        Number(row.amount),
                        resolvePlatformCurrency(row.currency, currency)
                      )}
                    </td>
                    <td className="text-xs fl-muted">
                      {row.method === "card" ? (
                        <span className="inline-flex items-center gap-1">
                          <CreditCard className="size-3.5" />
                          {row.card_brand
                            ? pay.cardBrands[row.card_brand]
                            : pay.methods.card}
                          {row.card_last4 ? ` · •••• ${row.card_last4}` : ""}
                        </span>
                      ) : (
                        pay.methods[row.method]
                      )}
                    </td>
                    <td>
                      <span
                        className={cn(
                          "fl-badge text-[11px]",
                          PAYMENT_STATUS_BADGE[row.status]
                        )}
                      >
                        {pay.statuses[row.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{d.platformUsers}</h3>
            <div className="ch-sub">{d.platformUsersSub}</div>
          </div>
          <Link href="/admin/users" className="fl-btn sm ghost">
            <Users className="size-4" />
            {d.manageUsers}
          </Link>
        </div>
        {stats.users.length === 0 ? (
          <p className="fl-pad py-8 text-center text-sm fl-faint">{d.noUsers}</p>
        ) : (
          <div className="fl-tbl-wrap">
            <table className="fl-tbl">
              <thead>
                <tr>
                  <th>{s.fullName}</th>
                  <th>{dict.common.email}</th>
                  <th>{s.role}</th>
                  <th>{d.companyColumn}</th>
                </tr>
              </thead>
              <tbody>
                {stats.users.slice(0, 6).map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {user.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.avatar_url}
                            alt=""
                            className="size-8 rounded-full object-cover border border-[var(--border)]"
                          />
                        ) : (
                          <span
                            className="grid size-8 place-items-center rounded-full text-white text-xs font-semibold"
                            style={{ background: "var(--grad-brand)" }}
                          >
                            {(user.full_name ?? user.email ?? "?").charAt(0).toUpperCase()}
                          </span>
                        )}
                        <b className="truncate">{user.full_name ?? "—"}</b>
                      </div>
                    </td>
                    <td className="fl-muted">{user.email ?? "—"}</td>
                    <td>
                      <span
                        className={cn(
                          "fl-badge text-[11px]",
                          user.role === "platform_admin" || user.role === "admin"
                            ? "b-blue"
                            : "b-gray"
                        )}
                      >
                        {dict.roles[user.role]}
                      </span>
                    </td>
                    <td>
                      {user.organization ? (
                        <span className="truncate">{user.organization.name}</span>
                      ) : (
                        <span className="fl-faint">{d.platformAdminOrg}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{d.tenantCrms}</h3>
            <div className="ch-sub">{d.tenantCrmsSub}</div>
          </div>
          <Link href="/admin/companies/new" className="fl-btn primary sm">
            <Plus strokeWidth={2} />
            {s.createCompany}
          </Link>
        </div>
        {stats.companies.length === 0 ? (
          <p className="fl-pad py-10 text-center text-sm fl-faint">{s.noCompanies}</p>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {stats.companies.map((company) => {
              const active = company.is_active !== false;
              return (
                <div
                  key={company.id}
                  className={cn(
                    "rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-4",
                    !active && "opacity-60"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <OrgLogo
                      organizationId={company.id}
                      logoUrl={company.logo_url}
                      size="md"
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold truncate">{company.name}</h4>
                        <span
                          className={cn(
                            "fl-badge shrink-0 text-[10px]",
                            active ? "b-green" : "b-gray"
                          )}
                        >
                          {active ? s.statusActive : s.statusInactive}
                        </span>
                        <span className="fl-badge b-gray shrink-0 text-[10px]">
                          {s.plans[company.plan ?? "free"]}
                        </span>
                        {company.subscription_status === "past_due" ? (
                          <span className="fl-badge b-rose shrink-0 text-[10px]">
                            {s.subscriptionStatuses.past_due}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs fl-faint">{d.isolatedCrm}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="inline-flex items-center gap-1 text-xs fl-muted truncate">
                          <Mail className="size-3 shrink-0" />
                          @{company.email_domain ?? "—"}
                        </p>
                        <div className="flex gap-1">
                          <Link
                            href="/admin/payments"
                            className="fl-btn sm ghost shrink-0"
                            title={pay.recordPayment}
                          >
                            <Wallet className="size-3.5" />
                          </Link>
                          <Link
                            href="/admin/companies"
                            className="fl-btn sm ghost shrink-0"
                            title={s.editCompany}
                          >
                            <Pencil className="size-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {stats.companies.length > 0 ? (
          <div className="fl-pad flex flex-wrap gap-2 border-t border-[var(--border)]">
            <span className="w-full text-xs fl-faint mb-1">{d.quickActions}</span>
            <Link href="/admin/companies" className="fl-btn sm ghost">
              <Users className="size-4" />
              {d.manageCompanies}
            </Link>
            <Link href="/admin/users" className="fl-btn sm ghost">
              <Users className="size-4" />
              {d.manageUsers}
            </Link>
            <Link href="/admin/subscriptions" className="fl-btn sm ghost">
              <CreditCard className="size-4" />
              {d.manageSubscriptions}
            </Link>
            <Link href="/admin/quotes" className="fl-btn sm ghost">
              <FileText className="size-4" />
              {d.manageQuotes}
            </Link>
            <Link href="/admin/invoices" className="fl-btn sm ghost">
              <Receipt className="size-4" />
              {d.manageInvoices}
            </Link>
            <Link href="/admin/payments" className="fl-btn sm ghost">
              <Wallet className="size-4" />
              {d.managePayments}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
