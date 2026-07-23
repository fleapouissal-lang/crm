"use client";

import { useEffect, useState, useTransition } from "react";
import { useTheme } from "@/components/shared/theme-provider";
import { format } from "date-fns";
import {
  Bell,
  Building2,
  Loader2,
  KeyRound,
  LogOut,
  Lock,
  Moon,
  Palette,
  Pencil,
  Plus,
  Sun,
  Trash2,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { setLocale } from "@/lib/actions/locale";
import { updateProfile, signOut, updatePassword } from "@/lib/actions/auth";
import { clearHrLocalCache } from "@/lib/hr/storage";
import { updateOrganization } from "@/lib/actions/settings";
import type { SettingsData } from "@/lib/actions/settings";
import { deleteTeamMember } from "@/lib/actions/organizations";
import {
  canRemoveTeamMember,
  canResetTeamMemberPassword,
} from "@/lib/permissions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useRouter } from "next/navigation";
import {
  clearDemoLocalData,
  loadPreferences,
  savePreferences,
} from "@/lib/settings/storage";
import {
  CURRENCY_OPTIONS,
  DEFAULT_PREFERENCES,
  TIMEZONE_OPTIONS,
  type CurrencyCode,
  type TimezoneId,
  type WorkspacePreferences,
} from "@/lib/settings/types";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { CellMain, FlChip, StatLine } from "@/components/fusion/primitives";
import { ProfileAvatarEditor } from "@/components/settings/profile-avatar-editor";
import { MemberAccountPanel } from "@/components/settings/member-account-panel";
import { TeamMemberDialog } from "@/components/settings/team-member-dialog";
import { TeamMemberPasswordDialog } from "@/components/settings/team-member-password-dialog";
import { TeamMemberAccessDialog } from "@/components/settings/team-member-access-dialog";
import type { Profile } from "@/types/database";
import { UserAvatar } from "@/components/shared/user-avatar";
import { DataPagination } from "@/components/shared/data-pagination";
import { useAdaptivePagination } from "@/hooks/use-adaptive-pagination";
import { jobRoleAccessKey } from "@/lib/organizations/job-role-access";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/types";

type SettingsTab = "profile" | "account" | "workspace" | "appearance" | "notifications" | "team";

function FlToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[25px] w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-[var(--iris)]" : "bg-[var(--track)]",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] size-[19px] rounded-full bg-white shadow transition-[inset-inline-start]",
          checked ? "inset-inline-start-[22px]" : "inset-inline-start-[3px]"
        )}
      />
    </button>
  );
}

function SettingRow({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-4 last:border-0">
      <div className="min-w-0">
        <b className="block text-[13.5px]">{title}</b>
        {hint ? <small className="mt-0.5 block text-xs fl-faint">{hint}</small> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#52525b,#3ecf8e)",
  "linear-gradient(135deg,#e6b567,#f2557a)",
  "linear-gradient(135deg,#71717a,#52525b)",
  "linear-gradient(135deg,#3ecf8e,#52525b)",
];

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
};

export function SettingsPageClient({ data }: { data: SettingsData }) {
  const dict = useDict();
  const s = dict.fusion.settings;
  const l = dict.fusion.labels;
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    data.isTeamMember ? "account" : "profile"
  );
  const [fullName, setFullName] = useState(data.profile.full_name ?? "");
  const [phone, setPhone] = useState(data.profile.phone ?? "");
  const [jobTitle, setJobTitle] = useState(data.profile.job_title ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(data.profile.avatar_url);
  const [orgName, setOrgName] = useState(data.organization?.name ?? "");
  const [emailDomain, setEmailDomain] = useState(data.organization?.email_domain ?? "");
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [accessTarget, setAccessTarget] = useState<Profile | null>(null);
  const platformAdmin = data.profile.role === "platform_admin";
  const isTeamMember = data.isTeamMember;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [prefs, setPrefs] = useState<WorkspacePreferences>(DEFAULT_PREFERENCES);
  const [pending, startTransition] = useTransition();
  const teamPagination = useAdaptivePagination(data.team, {
    rowHeight: 68,
    resetKey: activeTab,
  });

  useEffect(() => {
    setMounted(true);
    setPrefs(loadPreferences());
  }, []);

  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = isTeamMember
    ? [
        {
          key: "account",
          label: s.account,
          icon: <Wallet className="size-3.5" />,
        },
        { key: "profile", label: s.profile, icon: <User className="size-3.5" /> },
        {
          key: "appearance",
          label: s.appearance,
          icon: <Palette className="size-3.5" />,
        },
      ]
    : [
        { key: "profile", label: s.profile, icon: <User className="size-3.5" /> },
        ...(platformAdmin
          ? []
          : [
              {
                key: "workspace" as const,
                label: s.workspace,
                icon: <Building2 className="size-3.5" />,
              },
              {
                key: "team" as const,
                label: s.team,
                icon: <Users className="size-3.5" />,
              },
            ]),
        { key: "appearance", label: s.appearance, icon: <Palette className="size-3.5" /> },
        ...(platformAdmin
          ? []
          : [
              {
                key: "notifications" as const,
                label: s.notifications,
                icon: <Bell className="size-3.5" />,
              },
            ]),
      ];

  function updatePrefs(patch: Partial<WorkspacePreferences>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePreferences(next);
    toast.success(s.prefsSaved);
  }

  function saveProfile() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("full_name", fullName);
      fd.set("phone", phone);
      fd.set("job_title", jobTitle);
      const result = await updateProfile(fd);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(s.profileSaved);
    });
  }

  function savePassword() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("current_password", currentPassword);
      fd.set("new_password", newPassword);
      fd.set("confirm_password", confirmPassword);
      const result = await updatePassword(fd);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(s.passwordSaved);
    });
  }

  function saveWorkspace() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", orgName);
      fd.set("email_domain", emailDomain);
      const result = await updateOrganization(fd);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(s.workspaceSaved);
    });
  }

  function changeLocale(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
    });
  }

  const profileName = data.profile.full_name ?? dict.common.user;
  const profileInitials = initialsFromName(profileName);

  return (
    <div className="space-y-[18px]">
      <div
        className="flex w-full items-stretch gap-0 overflow-x-auto border-b border-[var(--border)] bg-[color-mix(in_oklch,var(--glass-hi),transparent_40%)] px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors",
              activeTab === tab.key
                ? "border-[var(--iris)] text-[var(--text)]"
                : "border-transparent fl-faint hover:text-[var(--text)]"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "account" && isTeamMember && data.memberAccount ? (
        <MemberAccountPanel
          profile={data.memberAccount}
          crmProfile={data.profile}
        />
      ) : null}

      {activeTab === "account" && isTeamMember && !data.memberAccount ? (
        <div className="fl-card fl-pad mx-auto max-w-lg text-center">
          <h3 className="text-[15px] font-semibold">{s.accountTitle}</h3>
          <p className="mt-2 text-sm fl-faint">{s.accountEmpty}</p>
        </div>
      ) : null}

      {activeTab === "profile" ? (
        <div className="space-y-[18px]">
        <div className="grid gap-[18px] lg:grid-cols-[1fr_320px]">
          <div className="fl-card fl-pad">
            <h3 className="text-[15px] font-semibold">{s.profileTitle}</h3>
            <p className="mt-1 text-sm fl-faint">{s.profileSub}</p>

            <div className="mt-6 border-b border-[var(--border)] pb-6">
              <ProfileAvatarEditor
                name={profileName}
                userId={data.profile.id}
                initialUrl={data.profile.avatar_url}
                onChange={setAvatarUrl}
              />
            </div>

            <div className="mt-5 space-y-4">
              <div className="fl-field">
                <label className="fl-field-label" htmlFor="full_name">
                  {s.fullName}
                </label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="fl-input"
                />
              </div>
              <div className="fl-field">
                <label className="fl-field-label" htmlFor="job_title">
                  {s.jobTitle}
                </label>
                <Input
                  id="job_title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder={s.jobTitlePlaceholder}
                  className="fl-input"
                />
              </div>
              <div className="fl-field">
                <label className="fl-field-label" htmlFor="phone">
                  {s.phone}
                </label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={s.phonePlaceholder}
                  className="fl-input"
                />
              </div>
              <div className="fl-field">
                <label className="fl-field-label">{dict.common.email}</label>
                <Input
                  value={data.profile.email ?? ""}
                  readOnly
                  disabled
                  className="fl-input opacity-70"
                />
              </div>
              <div className="fl-field">
                <label className="fl-field-label">{s.role}</label>
                <div>
                  <FlChip>
                    {dict.roles[data.profile.role]}
                  </FlChip>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="fl-btn primary"
                disabled={pending || !fullName.trim()}
                onClick={saveProfile}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {s.saveProfile}
              </button>
            </div>
          </div>
          <div className="fl-card fl-pad">
            <div className="flex items-center gap-[11px]">
              <UserAvatar
                name={profileName}
                avatarUrl={avatarUrl}
                userId={data.profile.id}
                variant="profile"
              />
              <div>
                <div className="font-medium">{profileName}</div>
                {jobTitle ? (
                  <div className="cell-sub text-[11.5px] fl-faint">{jobTitle}</div>
                ) : null}
                {data.profile.email ? (
                  <div className="cell-sub text-[11.5px] fl-faint">{data.profile.email}</div>
                ) : null}
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="fl-faint">{s.memberSince}</span>
                <span className="fl-mono fl-tny">
                  {format(new Date(data.profile.created_at), "dd MMM yyyy", {
                    locale: dateLocale,
                  })}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="fl-faint">{l.organizationName}</span>
                <span>
                  {data.organization?.name ??
                    (platformAdmin ? dict.auth.globalPortal : "—")}
                </span>
              </div>
              {phone ? (
                <div className="flex justify-between gap-3">
                  <span className="fl-faint">{s.phone}</span>
                  <span>{phone}</span>
                </div>
              ) : null}
            </div>
            <div className="mt-6 border-t border-[var(--border)] pt-4">
              <SettingRow title={s.signOut} hint={s.signOutHint}>
                <button
                  type="button"
                  className="fl-btn sm"
                  onClick={() =>
                    startTransition(() => {
                      clearHrLocalCache();
                      void signOut();
                    })
                  }
                >
                  <LogOut className="size-3.5" />
                  {s.signOut}
                </button>
              </SettingRow>
            </div>
          </div>
        </div>

        <div className="fl-card fl-pad">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[color-mix(in_oklch,var(--gold),transparent_88%)] text-[var(--gold)]">
              <Lock className="size-4" strokeWidth={1.75} />
            </span>
            <div>
              <h3 className="text-[15px] font-semibold">{s.passwordTitle}</h3>
              <p className="mt-1 text-sm fl-faint">{s.passwordSub}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="fl-field">
              <label className="fl-field-label" htmlFor="current_password">
                {s.currentPassword}
              </label>
              <PasswordInput
                id="current_password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                inputClassName="fl-input"
              />
            </div>
            <div className="fl-field">
              <label className="fl-field-label" htmlFor="new_password">
                {s.newPassword}
              </label>
              <PasswordInput
                id="new_password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                inputClassName="fl-input"
              />
            </div>
            <div className="fl-field">
              <label className="fl-field-label" htmlFor="confirm_password">
                {s.confirmPassword}
              </label>
              <PasswordInput
                id="confirm_password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                inputClassName="fl-input"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="fl-btn primary"
              disabled={
                pending ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
              onClick={savePassword}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {s.savePassword}
            </button>
          </div>
        </div>
        </div>
      ) : null}

      {activeTab === "workspace" && !platformAdmin && !isTeamMember ? (
        <div className="space-y-[18px]">
          <div className="grid g-4">
            <div className="fl-card fl-pad">
              <div className="k-label">{s.membersCount}</div>
              <StatLine value={String(data.stats.members)} />
            </div>
            <div className="fl-card fl-pad">
              <div className="k-label">{s.leadsCount}</div>
              <StatLine value={String(data.stats.leads)} />
            </div>
            <div className="fl-card fl-pad">
              <div className="k-label">{s.tasksCount}</div>
              <StatLine value={String(data.stats.tasks)} />
            </div>
            <div className="fl-card fl-pad">
              <div className="k-label">{s.activitiesCount}</div>
              <StatLine value={String(data.stats.activities)} />
            </div>
          </div>

          <div className="fl-card fl-pad">
            <h3 className="text-[15px] font-semibold">{s.workspaceTitle}</h3>
            <p className="mt-1 text-sm fl-faint">{s.workspaceSub}</p>
            <div className="mt-5 space-y-4">
              <div className="fl-field">
                <label className="fl-field-label" htmlFor="org_name">
                  {l.organizationName}
                  {!data.isAdmin ? (
                    <span className="ml-2 text-xs fl-faint">({s.adminOnly})</span>
                  ) : null}
                </label>
                <Input
                  id="org_name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={!data.isAdmin}
                  className="fl-input"
                />
              </div>
              <div className="fl-field">
                <label className="fl-field-label">{s.emailDomain}</label>
                <Input
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value.replace(/^@+/, ""))}
                  disabled={!data.isAdmin}
                  className="fl-input"
                  placeholder="fusionleap.com"
                />
                <small className="mt-1 block text-xs fl-faint">{s.emailDomainHint}</small>
              </div>
              <div className="fl-field">
                <label className="fl-field-label">{s.orgSlug}</label>
                <Input
                  value={data.organization?.slug ?? ""}
                  readOnly
                  disabled
                  className="fl-input opacity-70"
                />
              </div>
            </div>
            {data.isAdmin ? (
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  className="fl-btn primary"
                  disabled={pending || !orgName.trim()}
                  onClick={saveWorkspace}
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {s.saveWorkspace}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeTab === "appearance" ? (
        <div className="grid gap-[18px] lg:grid-cols-2">
          <div className="fl-card fl-pad">
            <h3 className="mb-4 text-[15px] font-semibold">{s.theme}</h3>
            <div className="grid grid-cols-2 gap-3">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={!mounted}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "fl-card fl-pad flex flex-col items-center gap-2 border-2 transition-colors",
                    mounted && theme === t
                      ? "border-[var(--iris)]"
                      : "border-transparent"
                  )}
                >
                  {t === "light" ? (
                    <Sun className="size-5" />
                  ) : (
                    <Moon className="size-5" />
                  )}
                  <span className="text-sm font-medium">
                    {t === "light" ? s.themeLight : s.themeDark}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="fl-card fl-pad">
            <h3 className="mb-4 text-[15px] font-semibold">{s.language}</h3>
            <div className="fl-seg w-full">
              {(Object.keys(LOCALE_LABELS) as Locale[]).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  className={cn(locale === loc && "on", "flex-1")}
                  disabled={pending}
                  onClick={() => changeLocale(loc)}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>
          </div>

          <div className="fl-card fl-pad lg:col-span-2">
            <SettingRow title={l.defaultCurrency} hint={s.currencyHint}>
              <Select
                value={prefs.currency}
                onValueChange={(v) =>
                  updatePrefs({ currency: (v ?? "MAD") as CurrencyCode })
                }
              >
                <SelectTrigger className="w-[140px] fl-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow title={l.timezone} hint={s.timezoneHint}>
              <Select
                value={prefs.timezone}
                onValueChange={(v) =>
                  updatePrefs({ timezone: (v ?? "Africa/Casablanca") as TimezoneId })
                }
              >
                <SelectTrigger className="w-[200px] fl-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>
          </div>
        </div>
      ) : null}

      {activeTab === "notifications" && !platformAdmin && !isTeamMember ? (
        <div className="fl-card fl-pad">
          <h3 className="text-[15px] font-semibold">{s.notifications}</h3>
          <p className="mt-1 text-sm fl-faint">{l.appearanceHint}</p>
          <div className="mt-2">
            <SettingRow title={l.emailNotifications} hint={s.emailNotificationsHint}>
              <FlToggle
                checked={prefs.emailNotifications}
                onChange={(v) => updatePrefs({ emailNotifications: v })}
              />
            </SettingRow>
            <SettingRow title={s.activityDigest} hint={s.activityDigestHint}>
              <FlToggle
                checked={prefs.activityDigest}
                onChange={(v) => updatePrefs({ activityDigest: v })}
              />
            </SettingRow>
            <SettingRow title={s.taskReminders} hint={s.taskRemindersHint}>
              <FlToggle
                checked={prefs.taskReminders}
                onChange={(v) => updatePrefs({ taskReminders: v })}
              />
            </SettingRow>
            <SettingRow title={s.leadAlerts} hint={s.leadAlertsHint}>
              <FlToggle
                checked={prefs.leadAlerts}
                onChange={(v) => updatePrefs({ leadAlerts: v })}
              />
            </SettingRow>
          </div>
        </div>
      ) : null}

      {activeTab === "team" && !platformAdmin && !isTeamMember ? (
        <div className="space-y-[18px]">
          <div className="fl-card fl-pad">
            <h3 className="text-[15px] font-semibold">{s.functionsTitle}</h3>
            <p className="mt-1 text-sm fl-faint">{s.functionsSub}</p>
            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] px-3.5 py-3 text-[12.5px] leading-relaxed fl-muted">
              <b className="text-[var(--text)]">{s.functionsLogicTitle}</b>
              <p className="mt-1">{s.functionsLogicBody}</p>
            </div>
            {data.jobRoles.length === 0 ? (
              <p className="mt-4 py-6 text-center text-sm fl-faint">{s.noJobRoles}</p>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--border)]">
                {data.jobRoles.map((jr) => {
                  const key = jobRoleAccessKey(jr.slug);
                  return (
                    <li
                      key={jr.id}
                      className="flex flex-wrap items-start justify-between gap-2 py-2.5"
                    >
                      <div className="min-w-0">
                        <b className="text-[13.5px]">{jr.name}</b>
                        <p className="mt-0.5 text-[12px] fl-faint">
                          {s.jobAccess[key]}
                        </p>
                      </div>
                      <FlChip>{jr.slug}</FlChip>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="fl-card">
            <div className="fl-card-head">
              <div className="fl-card-head__title">
                <h3>{s.teamTitle}</h3>
                <div className="ch-sub">{s.teamSub}</div>
              </div>
              {data.canManageUsers ? (
                <button
                  type="button"
                  className="fl-btn primary sm fl-toolbar-create"
                  onClick={() => setMemberDialogOpen(true)}
                >
                  <Plus strokeWidth={2} />
                  {s.addMember}
                </button>
              ) : null}
            </div>
            <div className="fl-tbl-wrap">
              <table className="fl-tbl">
                <thead>
                  <tr>
                    <th>{l.person}</th>
                    <th>{dict.common.email}</th>
                    <th>{s.jobFunction}</th>
                    <th>{s.roleColumn}</th>
                    <th>{s.joined}</th>
                    {data.canManageUsers ? <th className="col-actions" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {data.team.length === 0 ? (
                    <tr>
                      <td
                        colSpan={data.canManageUsers ? 6 : 5}
                        className="py-10 text-center text-sm fl-faint"
                      >
                        {s.noTeam}
                      </td>
                    </tr>
                  ) : (
                    teamPagination.pageItems.map((member, i) => {
                      const name =
                        member.full_name ?? member.email ?? dict.common.user;
                      const jobRoleName =
                        member.job_role?.name ?? member.job_title ?? "—";
                      const canRemove =
                        data.canManageUsers &&
                        canRemoveTeamMember(data.profile, member);
                      const canResetPassword =
                        data.canManageUsers &&
                        canResetTeamMemberPassword(data.profile, member);
                      return (
                        <tr key={member.id}>
                          <td>
                            <CellMain
                              initials={initialsFromName(name)}
                              gradient={
                                AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]!
                              }
                              title={name}
                              sub={
                                member.id === data.profile.id ? s.you : undefined
                              }
                            />
                          </td>
                          <td className="fl-muted">{member.email ?? "—"}</td>
                          <td>
                            <FlChip>{jobRoleName}</FlChip>
                          </td>
                          <td>
                            <div className="flex flex-col gap-0.5">
                              <FlChip>{dict.roles[member.role]}</FlChip>
                              <span className="fl-tny fl-faint max-w-[10rem]">
                                {member.role === "admin"
                                  ? s.accessAdminHint
                                  : member.role === "manager"
                                    ? s.accessManagerHint
                                    : s.accessMemberHint}
                              </span>
                            </div>
                          </td>
                          <td className="fl-faint fl-tny">
                            {format(new Date(member.created_at), "dd MMM yyyy", {
                              locale: dateLocale,
                            })}
                          </td>
                          {data.canManageUsers ? (
                            <td className="col-actions">
                              <div className="flex items-center justify-end gap-1">
                                {canResetPassword ? (
                                  <button
                                    type="button"
                                    className="fl-btn sm ghost"
                                    disabled={pending}
                                    aria-label={s.editMemberAccess}
                                    title={s.editMemberAccess}
                                    onClick={() => setAccessTarget(member)}
                                  >
                                    <Pencil className="size-3.5" />
                                  </button>
                                ) : null}
                                {canResetPassword ? (
                                  <button
                                    type="button"
                                    className="fl-btn sm ghost"
                                    disabled={pending}
                                    aria-label={s.resetMemberPassword}
                                    title={s.resetMemberPassword}
                                    onClick={() =>
                                      setPasswordTarget({
                                        id: member.id,
                                        name,
                                      })
                                    }
                                  >
                                    <KeyRound className="size-3.5" />
                                  </button>
                                ) : null}
                                {canRemove ? (
                                  <ConfirmDialog
                                    trigger={
                                      <button
                                        type="button"
                                        className="fl-btn sm ghost text-[var(--rose)]"
                                        disabled={pending}
                                        aria-label={s.removeMember}
                                        title={s.removeMember}
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    }
                                    title={s.removeMemberTitle}
                                    description={s.removeMemberConfirm.replace(
                                      "{name}",
                                      name
                                    )}
                                    confirmLabel={dict.common.delete}
                                    onConfirm={async () => {
                                      const result = await deleteTeamMember(
                                        member.id
                                      );
                                      if (!result.success) {
                                        toast.error(result.error);
                                        return;
                                      }
                                      toast.success(s.memberRemoved);
                                      router.refresh();
                                    }}
                                  />
                                ) : null}
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <DataPagination
              page={teamPagination.page}
              pageSize={teamPagination.pageSize}
              totalItems={teamPagination.totalItems}
              totalPages={teamPagination.totalPages}
              onPageChange={teamPagination.setPage}
            />
            <TeamMemberDialog
              open={memberDialogOpen}
              onOpenChange={setMemberDialogOpen}
              jobRoles={data.jobRoles}
              emailDomain={data.organization?.email_domain ?? null}
              actorRole={data.profile.role}
              onCreated={() => router.refresh()}
            />
            <TeamMemberPasswordDialog
              open={!!passwordTarget}
              onOpenChange={(open) => {
                if (!open) setPasswordTarget(null);
              }}
              memberId={passwordTarget?.id ?? null}
              memberName={passwordTarget?.name ?? ""}
            />
            <TeamMemberAccessDialog
              open={!!accessTarget}
              onOpenChange={(open) => {
                if (!open) setAccessTarget(null);
              }}
              member={accessTarget}
              jobRoles={data.jobRoles}
              actorRole={data.profile.role}
              onUpdated={() => router.refresh()}
            />
          </div>
        </div>
      ) : null}

      {!isTeamMember ? (
      <div className="fl-card fl-pad border border-[color-mix(in_oklch,var(--rose),transparent_70%)]">
        <h3 className="text-[15px] font-semibold text-[var(--rose)]">
          {s.dangerZone}
        </h3>
        <SettingRow title={s.clearLocalData} hint={s.clearLocalDataHint}>
          <button
            type="button"
            className="fl-btn sm"
            onClick={() => {
              clearDemoLocalData();
              setPrefs(loadPreferences());
              toast.success(s.clearLocalDataConfirm);
            }}
          >
            <Trash2 className="size-3.5" />
            {s.clearLocalData}
          </button>
        </SettingRow>
      </div>
      ) : null}
    </div>
  );
}
