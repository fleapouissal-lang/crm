"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { Building2, CreditCard, Loader2, Pencil } from "lucide-react";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";
import { DataPagination } from "@/components/shared/data-pagination";
import { useAdaptivePagination } from "@/hooks/use-adaptive-pagination";
import { EditSubscriptionDialog } from "@/components/admin/edit-subscription-dialog";
import { getAllOrganizations } from "@/lib/actions/platform-admin";
import {
  PLAN_KEYS,
  PLAN_PRICES_EUR,
  formatPlanPrice,
  type PlanKey,
} from "@/lib/billing/plans";
import type { Organization } from "@/types/database";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { cn } from "@/lib/utils";

function statusBadgeClass(status: Organization["subscription_status"]) {
  switch (status) {
    case "trialing":
      return "b-amber";
    case "active":
      return "b-green";
    case "past_due":
      return "b-rose";
    case "cancelled":
      return "b-gray";
    default:
      return "b-gray";
  }
}

export function AdminSubscriptionsPageClient({
  initialCompanies,
}: {
  initialCompanies: Organization[];
}) {
  const dict = useDict();
  const s = dict.fusion.settings;
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const [companies, setCompanies] = useState<Organization[]>(initialCompanies);
  const [loading, setLoading] = useState(false);
  const [editCompany, setEditCompany] = useState<Organization | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setCompanies(initialCompanies);
  }, [initialCompanies]);

  const stats = useMemo(() => {
    const byPlan = Object.fromEntries(PLAN_KEYS.map((k) => [k, 0])) as Record<
      PlanKey,
      number
    >;
    let mrr = 0;
    let trialing = 0;
    for (const c of companies) {
      const plan = (c.plan ?? "free") as PlanKey;
      byPlan[plan] = (byPlan[plan] ?? 0) + 1;
      if (c.subscription_status === "active" || c.subscription_status === "trialing") {
        mrr += PLAN_PRICES_EUR[plan] ?? 0;
      }
      if (c.subscription_status === "trialing") trialing += 1;
    }
    return { byPlan, mrr, trialing };
  }, [companies]);

  const pagination = useAdaptivePagination(companies, { rowHeight: 64 });

  function refresh() {
    startTransition(async () => {
      setLoading(true);
      const orgs = await getAllOrganizations();
      setCompanies(orgs);
      setLoading(false);
    });
  }

  function formatDate(value: string | null) {
    if (!value) return "—";
    return format(new Date(value), "dd MMM yyyy", { locale: dateLocale });
  }

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{s.subscriptions}</div>
          <StatLine value={String(companies.length)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{s.mrrLabel}</div>
          <StatLine value={`â‚¬${stats.mrr}`} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{s.trialingCount}</div>
          <StatLine value={String(stats.trialing)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{s.plans.business}</div>
          <StatLine value={String(stats.byPlan.business + stats.byPlan.enterprise)} />
        </div>
      </div>

      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{s.subscriptionsTitle}</h3>
            <div className="ch-sub">{s.subscriptionsSub}</div>
          </div>
        </div>
        <div className="fl-tbl-wrap">
          {loading && companies.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-8 animate-spin text-[var(--brand-orange)]" />
            </div>
          ) : (
            <table className="fl-tbl">
              <thead>
                <tr>
                  <th>{s.companyName}</th>
                  <th>{s.plan}</th>
                  <th>{s.price}</th>
                  <th>{s.subscriptionStatus}</th>
                  <th>{s.trialEndsAt}</th>
                  <th>{s.currentPeriodEnd}</th>
                  <th className="w-[4.5rem]">{s.actions}</th>
                </tr>
              </thead>
              <tbody>
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm fl-faint">
                      {s.noCompanies}
                    </td>
                  </tr>
                ) : (
                  pagination.pageItems.map((company) => {
                    const plan = (company.plan ?? "free") as PlanKey;
                    const status = company.subscription_status ?? "active";
                    return (
                      <tr key={company.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <Building2 className="size-4 fl-faint" />
                            <div>
                              <b>{company.name}</b>
                              <div className="fl-faint fl-tny">
                                @{company.email_domain ?? "—"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1.5">
                            <CreditCard className="size-3.5 fl-faint" />
                            {s.plans[plan]}
                          </span>
                        </td>
                        <td className="fl-muted">{formatPlanPrice(plan)}/{s.perMonthShort}</td>
                        <td>
                          <span className={cn("fl-badge text-[11px]", statusBadgeClass(status))}>
                            {s.subscriptionStatuses[status]}
                          </span>
                        </td>
                        <td className="fl-faint fl-tny">{formatDate(company.trial_ends_at)}</td>
                        <td className="fl-faint fl-tny">
                          {formatDate(company.current_period_end)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="fl-btn sm ghost"
                            disabled={pending}
                            aria-label={s.editSubscription}
                            title={s.editSubscription}
                            onClick={() => setEditCompany(company)}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
        <DataPagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          onPageChange={pagination.setPage}
        />
      </div>

      <EditSubscriptionDialog
        company={editCompany}
        open={Boolean(editCompany)}
        onOpenChange={(open) => {
          if (!open) setEditCompany(null);
        }}
        onSaved={refresh}
      />
    </div>
  );
}
