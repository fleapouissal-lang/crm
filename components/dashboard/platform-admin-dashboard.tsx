"use client";

import Link from "next/link";
import { Building2, Globe, Mail, Plus, Users } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";
import type { PlatformAdminStats } from "@/lib/actions/platform-admin";

export function PlatformAdminDashboard({ stats }: { stats: PlatformAdminStats }) {
  const dict = useDict();
  const s = dict.fusion.settings;
  const d = dict.fusion.platformAdmin;

  return (
    <div className="space-y-[18px]">
      <div className="fl-card fl-pad">
        <div className="flex items-start gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-neutral-900 text-white">
            <Globe className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">{d.globalSiteTitle}</h2>
            <p className="mt-1 text-sm fl-faint">{d.globalSiteSub}</p>
          </div>
        </div>
      </div>

      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{s.companies}</div>
          <StatLine value={String(stats.companiesCount)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{s.totalCompanyUsers}</div>
          <StatLine value={String(stats.usersCount)} />
        </div>
      </div>

      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{d.tenantCrms}</h3>
            <div className="ch-sub">{d.tenantCrmsSub}</div>
          </div>
          <Link href="/admin/companies" className="fl-btn primary sm">
            <Plus strokeWidth={2} />
            {s.createCompany}
          </Link>
        </div>
        {stats.companies.length === 0 ? (
          <p className="fl-pad py-10 text-center text-sm fl-faint">{s.noCompanies}</p>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {stats.companies.map((company) => (
              <div
                key={company.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-neutral-900 text-white">
                    <Building2 className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold">{company.name}</h4>
                    <p className="mt-0.5 text-xs fl-faint">{d.isolatedCrm}</p>
                    <div className="mt-3 space-y-1 text-xs fl-muted">
                      <p className="inline-flex items-center gap-1">
                        <Mail className="size-3" />@{company.email_domain ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {stats.companies.length > 0 ? (
          <div className="fl-pad border-t border-[var(--border)]">
            <Link href="/admin/companies" className="fl-btn sm ghost">
              <Users className="size-4" />
              {d.manageCompanies}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
