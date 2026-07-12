"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Building2, Search, Shield, Users } from "lucide-react";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";
import { Input } from "@/components/ui/input";
import type { PlatformUserRow } from "@/lib/actions/platform-admin";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { cn } from "@/lib/utils";

export function AdminUsersPageClient({
  initialUsers,
}: {
  initialUsers: PlatformUserRow[];
}) {
  const dict = useDict();
  const d = dict.fusion.platformAdmin;
  const s = dict.fusion.settings;
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const platformAdmins = initialUsers.filter((u) => u.role === "platform_admin").length;
    const directors = initialUsers.filter((u) => u.role === "admin").length;
    const withCompany = initialUsers.filter((u) => u.organization_id).length;
    return {
      total: initialUsers.length,
      platformAdmins,
      directors,
      withCompany,
    };
  }, [initialUsers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialUsers;
    return initialUsers.filter((u) => {
      const hay = [
        u.full_name,
        u.email,
        u.job_title,
        u.role,
        u.organization?.name,
        dict.roles[u.role],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [initialUsers, query, dict.roles]);

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{d.totalUsers}</div>
          <StatLine value={String(stats.total)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{d.platformAdminsCount}</div>
          <StatLine value={String(stats.platformAdmins)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{d.directorsCount}</div>
          <StatLine value={String(stats.directors)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{d.companyUsersCount}</div>
          <StatLine value={String(stats.withCompany)} />
        </div>
      </div>

      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{d.platformUsers}</h3>
            <div className="ch-sub">{d.platformUsersSub}</div>
          </div>
          <div className="fl-clients-search-wrap max-w-xs">
            <Search strokeWidth={2} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="fl-toolbar-search"
              placeholder={d.searchUsers}
              aria-label={d.searchUsers}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="fl-pad py-10 text-center text-sm fl-faint">
            {initialUsers.length === 0 ? d.noUsers : d.noUsersMatch}
          </p>
        ) : (
          <div className="fl-tbl-wrap">
            <table className="fl-tbl">
              <thead>
                <tr>
                  <th>{s.fullName}</th>
                  <th>{dict.common.email}</th>
                  <th>{s.role}</th>
                  <th>{d.companyColumn}</th>
                  <th>{s.joined}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
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
                        <div className="min-w-0">
                          <b className="block truncate">{user.full_name ?? "—"}</b>
                          {user.job_title ? (
                            <span className="fl-faint fl-tny block truncate">{user.job_title}</span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="fl-muted">{user.email ?? "—"}</td>
                    <td>
                      <span
                        className={cn(
                          "fl-badge inline-flex items-center gap-1 text-[11px]",
                          user.role === "platform_admin" || user.role === "admin"
                            ? "b-blue"
                            : "b-gray"
                        )}
                      >
                        {user.role === "platform_admin" ? (
                          <Shield className="size-3" />
                        ) : null}
                        {dict.roles[user.role]}
                      </span>
                    </td>
                    <td>
                      {user.organization ? (
                        <span className="inline-flex items-center gap-2">
                          {user.organization.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.organization.logo_url}
                              alt=""
                              className="size-5 rounded object-cover border border-[var(--border)]"
                            />
                          ) : (
                            <Building2 className="size-3.5 fl-faint" />
                          )}
                          <span className="truncate">{user.organization.name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 fl-faint">
                          <Users className="size-3.5" />
                          {d.platformAdminOrg}
                        </span>
                      )}
                    </td>
                    <td className="fl-faint fl-tny">
                      {format(new Date(user.created_at), "dd MMM yyyy", {
                        locale: dateLocale,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
