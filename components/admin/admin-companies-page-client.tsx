"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Loader2,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";
import { EditCompanyDialog } from "@/components/admin/edit-company-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  deleteOrganization,
  setOrganizationActive,
} from "@/lib/actions/organizations";
import {
  getAllOrganizations,
  getOrganizationDirectorEmail,
  getOrganizationMemberCount,
} from "@/lib/actions/platform-admin";
import type { Organization } from "@/types/database";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { OrgLogo } from "@/components/shared/org-logo";
import { cn } from "@/lib/utils";

type CompanyRow = Organization & {
  memberCount: number;
  directorEmail: string | null;
};

export function AdminCompaniesPageClient({
  initialCompanies,
}: {
  initialCompanies: Organization[];
}) {
  const dict = useDict();
  const s = dict.fusion.settings;
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCompany, setEditCompany] = useState<CompanyRow | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const orgs = initialCompanies.length ? initialCompanies : await getAllOrganizations();
      const rows = await Promise.all(
        orgs.map(async (org) => ({
          ...org,
          memberCount: await getOrganizationMemberCount(org.id),
          directorEmail: await getOrganizationDirectorEmail(org.id),
        }))
      );
      if (!cancelled) {
        setCompanies(rows);
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialCompanies]);

  function refresh() {
    startTransition(async () => {
      const orgs = await getAllOrganizations();
      const rows = await Promise.all(
        orgs.map(async (org) => ({
          ...org,
          memberCount: await getOrganizationMemberCount(org.id),
          directorEmail: await getOrganizationDirectorEmail(org.id),
        }))
      );
      setCompanies(rows);
    });
  }

  function handleDelete(org: CompanyRow) {
    startTransition(async () => {
      const result = await deleteOrganization(org.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(s.companyDeleted);
      refresh();
    });
  }

  function handleToggleActive(org: CompanyRow) {
    const next = !(org.is_active !== false);
    startTransition(async () => {
      const result = await setOrganizationActive(org.id, next);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(next ? s.companyActivated : s.companyDeactivated);
      refresh();
    });
  }

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{s.companies}</div>
          <StatLine value={String(companies.length)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{s.activeCompanies}</div>
          <StatLine
            value={String(companies.filter((c) => c.is_active !== false).length)}
          />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{s.totalCompanyUsers}</div>
          <StatLine value={String(companies.reduce((n, c) => n + c.memberCount, 0))} />
        </div>
      </div>

      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{s.companiesTitle}</h3>
            <div className="ch-sub">{s.companiesSub}</div>
          </div>
          <Link href="/admin/companies/new" className="fl-btn primary sm">
            <Plus strokeWidth={2} />
            {s.createCompany}
          </Link>
        </div>
        <div className="fl-tbl-wrap">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-8 animate-spin text-[var(--brand-orange)]" />
            </div>
          ) : (
            <table className="fl-tbl">
              <thead>
                <tr>
                  <th>{s.companyName}</th>
                  <th>{s.emailDomain}</th>
                  <th>{s.directorAccount}</th>
                  <th>{s.membersCount}</th>
                  <th>{s.status}</th>
                  <th>{s.joined}</th>
                  <th className="w-[7.5rem]">{s.actions}</th>
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
                  companies.map((company) => {
                    const active = company.is_active !== false;
                    return (
                      <tr
                        key={company.id}
                        className={cn(!active && "opacity-60")}
                      >
                        <td>
                          <div className="flex items-center gap-2">
                            <OrgLogo
                              organizationId={company.id}
                              logoUrl={company.logo_url}
                              size="sm"
                              className="fl-tbl-org-logo"
                            />
                            <div>
                              <b>{company.name}</b>
                              {(company.city || company.country || company.activity_domain) && (
                                <div className="fl-faint fl-tny">
                                  {[
                                    company.activity_domain &&
                                      (s.activityDomains[
                                        company.activity_domain as keyof typeof s.activityDomains
                                      ] ??
                                        company.activity_domain),
                                    company.city &&
                                      (s.cities[company.city as keyof typeof s.cities] ??
                                        company.city),
                                    company.country &&
                                      (s.countries[
                                        company.country as keyof typeof s.countries
                                      ] ??
                                        company.country),
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="fl-muted">@{company.email_domain ?? "—"}</td>
                        <td className="fl-muted">{company.directorEmail ?? "—"}</td>
                        <td>
                          <span className="inline-flex items-center gap-1 fl-muted">
                            <Users className="size-3.5" />
                            {company.memberCount}
                          </span>
                        </td>
                        <td>
                          <span
                            className={cn(
                              "fl-badge text-[11px]",
                              active ? "b-green" : "b-gray"
                            )}
                          >
                            {active ? s.statusActive : s.statusInactive}
                          </span>
                        </td>
                        <td className="fl-faint fl-tny">
                          {format(new Date(company.created_at), "dd MMM yyyy", {
                            locale: dateLocale,
                          })}
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="fl-btn sm ghost"
                              disabled={pending}
                              aria-label={s.editCompany}
                              title={s.editCompany}
                              onClick={() => setEditCompany(company)}
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              className="fl-btn sm ghost"
                              disabled={pending}
                              aria-label={active ? s.deactivateCompany : s.activateCompany}
                              title={active ? s.deactivateCompany : s.activateCompany}
                              onClick={() => handleToggleActive(company)}
                            >
                              {active ? (
                                <PowerOff className="size-3.5 text-[var(--amber)]" />
                              ) : (
                                <Power className="size-3.5 text-[var(--emerald)]" />
                              )}
                            </button>
                            <ConfirmDialog
                              trigger={
                                <button
                                  type="button"
                                  className="fl-btn sm ghost text-[var(--rose)]"
                                  disabled={pending}
                                  aria-label={dict.common.delete}
                                  title={dict.common.delete}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              }
                              title={s.deleteCompanyTitle}
                              description={s.deleteCompanyConfirm.replace(
                                "{{name}}",
                                company.name
                              )}
                              confirmLabel={dict.common.delete}
                              onConfirm={() => handleDelete(company)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <EditCompanyDialog
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
