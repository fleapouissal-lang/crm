"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/types/database";
import { useDict } from "@/components/shared/i18n-provider";
import { EmployeeProfileContent } from "@/components/hr/employee-profile-content";
import {
  EmployeeProfileFormDialog,
  HrEntryFormDialog,
} from "@/components/hr/hr-form-dialogs";
import type { EmployeeProfile, HrEntryType } from "@/lib/hr/types";
import { hrSalaryPath } from "@/lib/hr/paths";
import { useHrStore } from "@/lib/hr/use-hr-store";
import { cn } from "@/lib/utils";

export function EmployeeProfilePageClient({
  memberId,
  profiles,
  initialHrProfiles,
}: {
  memberId: string;
  profiles: Profile[];
  initialHrProfiles: EmployeeProfile[];
}) {
  const dict = useDict();
  const h = dict.fusion.hr;

  const {
    hydrated,
    getMember,
    getProfile,
    saveEntry,
    saveProfile,
    uploadScan,
    deleteScan,
  } = useHrStore(profiles, initialHrProfiles);

  const member = getMember(memberId);
  const profile = getProfile(memberId);

  const [entryOpen, setEntryOpen] = useState(false);
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [entryDefaultType, setEntryDefaultType] = useState<HrEntryType | undefined>();

  function openEntry(type?: HrEntryType) {
    setEntryDefaultType(type);
    setEntryOpen(true);
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
          <Link href={hrSalaryPath(memberId)} className="fl-btn sm primary">
            <Wallet className="size-3.5" strokeWidth={2} />
            {h.openSalaryAccount}
          </Link>
          <button
            type="button"
            className="fl-btn sm"
            onClick={() => setProfileFormOpen(true)}
          >
            <Pencil className="size-3.5" strokeWidth={2} />
            {h.editProfile}
          </button>
          <button type="button" className="fl-btn sm" onClick={() => openEntry()}>
            {h.addEntry}
          </button>
        </div>
      </div>

      <div>
        <h1 className={cn("text-2xl font-semibold tracking-tight")}>{member.name}</h1>
        <p className="mt-1 text-sm fl-muted">{profile.roleTitle}</p>
      </div>

      <EmployeeProfileContent
        member={member}
        profile={profile}
        onAddEntry={() => openEntry()}
        onQuickAdd={(type) => openEntry(type)}
        onUploadScan={uploadScan}
        onDeleteScan={(scanId) => {
          deleteScan(memberId, scanId);
          toast.success(h.scanDeleted);
        }}
      />

      <HrEntryFormDialog
        open={entryOpen}
        onOpenChange={setEntryOpen}
        member={member}
        defaultType={entryDefaultType}
        onSave={saveEntry}
      />

      <EmployeeProfileFormDialog
        open={profileFormOpen}
        onOpenChange={setProfileFormOpen}
        profile={profile}
        member={member}
        onSave={saveProfile}
      />
    </div>
  );
}
