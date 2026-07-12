"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Building2, Plus, Search, Shield, Users } from "lucide-react";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";
import { UserAvatar } from "@/components/shared/user-avatar";
import { CreatePlatformUserDialog } from "@/components/admin/create-platform-user-dialog";
import { Input } from "@/components/ui/input";
import type { PlatformUserRow } from "@/lib/actions/platform-admin";
import type { Organization } from "@/types/database";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { cn } from "@/lib/utils";

type UserFilter = "all" | "platform" | "company";

export function AdminUsersPageClient({
  initialUsers,
  organizations,
}: {
  initialUsers: PlatformUserRow[];
  organizations: Organization[];
}) {
  const dict = useDict();
  const d = dict.fusion.platformAdmin;
  const s = dict.fusion.settings;
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const stats = useMemo(() => {
    const platformAdmins = initialUsers.filter(
      (u) => u.role === "platform_admin"
    ).length;
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
    return initialUsers.filter((u) => {
      if (filter === "platform" && u.role !== "platform_admin") return false;
      if (filter === "company" && !u.organization_id) return false;
      if (!q) return true;
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
  }, [initialUsers, query, dict.roles, filter]);

  const filters: { key: UserFilter; label: string }[] = [
    { key: "all", label: d.filterAllUsers },
    { key: "platform", label: d.filterPlatformUsers },
    { key: "company", label: d.filterCompanyUsers },
  ];

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
          <div className="flex flex-wrap items-center gap-2">
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
            <button
              type="button"
              className="fl-btn primary sm shrink-0"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-3.5" strokeWidth={2} />
              {d.addUser}
            </button>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="fl-seg">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                className={cn(filter === f.key && "on")}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
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
                        <UserAvatar
                          name={user.full_name ?? user.email ?? "?"}
                          avatarUrl={user.avatar_url}
                          userId={user.id}
                          variant="sidebar"
                        />
                        <div className="min-w-0">
                          <b className="block truncate">
                            {user.full_name ?? "—"}
                          </b>
                          {user.job_title ? (
                            <span className="fl-faint fl-tny block truncate">
                              {user.job_title}
                            </span>
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
                          <span className="truncate">
                            {user.organization.name}
                          </span>
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

      <CreatePlatformUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizations={organizations}
      />
    </div>
  );
}
