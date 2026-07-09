"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/types/database";
import { useDict } from "@/components/shared/i18n-provider";
import { EmployeeProfileContent } from "@/components/hr/employee-profile-content";
import {
  EmployeeProfileFormDialog,
  HrEntryFormDialog,
} from "@/components/hr/hr-form-dialogs";
import type { EmployeeProfile, HrContractScan, HrEntry, HrEntryType } from "@/lib/hr/types";
import {
  addContractScan,
  loadHrProfiles,
  removeContractScan,
  saveHrProfiles,
  updateEmployeeProfile,
  upsertHrEntry,
} from "@/lib/hr/storage";
import { buildTeamOptions } from "@/lib/team/members";
import { cn } from "@/lib/utils";

export function EmployeeProfilePageClient({
  memberId,
  profiles,
}: {
  memberId: string;
  profiles: Profile[];
}) {
  const dict = useDict();
  const h = dict.fusion.hr;

  const teamOptions = useMemo(() => buildTeamOptions(profiles), [profiles]);
  const member = teamOptions.find((m) => m.id === memberId) ?? null;

  const [hrProfiles, setHrProfiles] = useState<EmployeeProfile[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [entryDefaultType, setEntryDefaultType] = useState<HrEntryType | undefined>();

  useEffect(() => {
    setHrProfiles(loadHrProfiles(teamOptions));
    setHydrated(true);
  }, [teamOptions]);

  const persist = useCallback((next: EmployeeProfile[]) => {
    setHrProfiles(next);
    saveHrProfiles(next);
  }, []);

  const profile = hrProfiles.find((p) => p.memberId === memberId) ?? null;

  function openEntry(type?: HrEntryType) {
    setEntryDefaultType(type);
    setEntryOpen(true);
  }

  function handleSaveEntry(entry: HrEntry) {
    persist(upsertHrEntry(hrProfiles, entry));
  }

  function handleSaveProfile(updated: EmployeeProfile) {
    persist(updateEmployeeProfile(hrProfiles, updated));
  }

  function handleUploadScan(scan: HrContractScan) {
    persist(addContractScan(hrProfiles, scan));
  }

  function handleDeleteScan(scanId: string) {
    persist(removeContractScan(hrProfiles, memberId, scanId));
    toast.success(h.scanDeleted);
  }

  if (!hydrated) {
    return <div className="h-40 animate-pulse rounded-xl bg-[var(--glass-hi)]" />;
  }

  if (!member || !profile) {
    return (
      <div className="fl-card fl-pad mx-auto max-w-lg text-center">
        <p className="text-sm fl-faint">{h.memberNotFound}</p>
        <Link href="/hr" className="fl-btn sm primary mt-4 inline-flex">
          <ArrowLeft className="size-4" strokeWidth={2} />
          {h.backToTeam}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/hr" className="fl-btn sm ghost -ms-1">
          <ArrowLeft className="size-4" strokeWidth={2} />
          {h.backToTeam}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="fl-btn sm"
            onClick={() => setProfileFormOpen(true)}
          >
            <Pencil className="size-3.5" strokeWidth={2} />
            {h.editProfile}
          </button>
          <button
            type="button"
            className="fl-btn sm primary"
            onClick={() => openEntry()}
          >
            {h.addEntry}
          </button>
        </div>
      </div>

      <div>
        <h1 className={cn("text-2xl font-semibold tracking-tight")}>
          {member.name}
        </h1>
        <p className="mt-1 text-sm fl-muted">{profile.roleTitle}</p>
      </div>

      <EmployeeProfileContent
        member={member}
        profile={profile}
        onAddEntry={() => openEntry()}
        onQuickAdd={(type) => openEntry(type)}
        onUploadScan={handleUploadScan}
        onDeleteScan={handleDeleteScan}
      />

      <HrEntryFormDialog
        open={entryOpen}
        onOpenChange={setEntryOpen}
        member={member}
        defaultType={entryDefaultType}
        onSave={handleSaveEntry}
      />

      <EmployeeProfileFormDialog
        open={profileFormOpen}
        onOpenChange={setProfileFormOpen}
        profile={profile}
        member={member}
        onSave={handleSaveProfile}
      />
    </div>
  );
}
