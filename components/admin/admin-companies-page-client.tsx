"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { Building2, Loader2, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";
import { CreateCompanyDialog } from "@/components/settings/create-company-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteOrganization } from "@/lib/actions/organizations";
import {
  getAllOrganizations,
  getOrganizationDirectorEmail,
  getOrganizationMemberCount,
} from "@/lib/actions/platform-admin";
import type { Organization } from "@/types/database";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";

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
  const [dialogOpen, setDialogOpen] = useState(false);
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

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{s.companies}</div>
          <StatLine value={String(companies.length)} />
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
          <button type="button" className="fl-btn primary sm" onClick={() => setDialogOpen(true)}>
            <Plus strokeWidth={2} />
            {s.createCompany}
          </button>
        </div>
        <div className="fl-tbl-wrap">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-8 animate-spin text-neutral-900" />
            </div>
          ) : (
            <table className="fl-tbl">
              <thead>
                <tr>
                  <th>{s.companyName}</th>
                  <th>{s.emailDomain}</th>
                  <th>{s.directorAccount}</th>
                  <th>{s.membersCount}</th>
                  <th>{s.joined}</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm fl-faint">
                      {s.noCompanies}
                    </td>
                  </tr>
                ) : (
                  companies.map((company) => (
                    <tr key={company.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 fl-faint" />
                          <b>{company.name}</b>
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
                      <td className="fl-faint fl-tny">
                        {format(new Date(company.created_at), "dd MMM yyyy", {
                          locale: dateLocale,
                        })}
                      </td>
                      <td>
                        <ConfirmDialog
                          trigger={
                            <button
                              type="button"
                              className="fl-btn sm ghost text-[var(--rose)]"
                              disabled={pending}
                              aria-label={dict.common.delete}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          }
                          title={s.deleteCompanyTitle}
                          description={s.deleteCompanyConfirm.replace("{{name}}", company.name)}
                          confirmLabel={dict.common.delete}
                          onConfirm={() => handleDelete(company)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <CreateCompanyDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) refresh();
        }}
      />
    </div>
  );
}
