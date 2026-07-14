"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Profile } from "@/types/database";
import { buildTeamOptions, type TeamMemberOption } from "@/lib/team/members";
import type { EmployeeProfile, HrContractScan, HrEntry } from "./types";
import { buildEmptyHrProfiles, clearHrLocalCache } from "./storage";
import {
  deleteHrContractScanAction,
  deleteHrEntryAction,
  getHrWorkspace,
  upsertHrEmployeeProfile,
  upsertHrEntryAction,
  uploadHrContractScanAction,
} from "@/lib/actions/hr";

export function useHrStore(
  profiles: Profile[],
  initialHrProfiles?: EmployeeProfile[]
) {
  const teamOptions = useMemo(() => buildTeamOptions(profiles), [profiles]);
  const [hrProfiles, setHrProfiles] = useState<EmployeeProfile[]>(
    () => initialHrProfiles ?? buildEmptyHrProfiles(teamOptions)
  );
  const [hydrated, setHydrated] = useState(Boolean(initialHrProfiles));
  const [, startTransition] = useTransition();

  useEffect(() => {
    clearHrLocalCache();
  }, []);

  useEffect(() => {
    if (initialHrProfiles) {
      setHrProfiles(initialHrProfiles);
      setHydrated(true);
      return;
    }

    let cancelled = false;
    startTransition(async () => {
      const data = await getHrWorkspace();
      if (cancelled) return;
      if (data) {
        setHrProfiles(data.hrProfiles);
      } else {
        setHrProfiles(buildEmptyHrProfiles(teamOptions));
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [initialHrProfiles, teamOptions]);

  const profileByMember = useMemo(
    () => new Map(hrProfiles.map((p) => [p.memberId, p])),
    [hrProfiles]
  );

  const getMember = useCallback(
    (memberId: string): TeamMemberOption | null =>
      teamOptions.find((m) => m.id === memberId) ?? null,
    [teamOptions]
  );

  const getProfile = useCallback(
    (memberId: string): EmployeeProfile | null =>
      profileByMember.get(memberId) ?? null,
    [profileByMember]
  );

  const saveEntry = useCallback(
    (entry: HrEntry) => {
      setHrProfiles((prev) =>
        prev.map((p) => {
          if (p.memberId !== entry.memberId) return p;
          const idx = p.entries.findIndex((e) => e.id === entry.id);
          if (idx >= 0) {
            const entries = [...p.entries];
            entries[idx] = entry;
            return { ...p, entries };
          }
          return { ...p, entries: [entry, ...p.entries] };
        })
      );
      startTransition(async () => {
        const res = await upsertHrEntryAction(entry);
        if (!res.success) {
          toast.error(res.error);
          const data = await getHrWorkspace();
          if (data) setHrProfiles(data.hrProfiles);
          return;
        }
        setHrProfiles((prev) =>
          prev.map((p) => {
            if (p.memberId !== res.data.memberId) return p;
            const idx = p.entries.findIndex((e) => e.id === res.data.id);
            if (idx >= 0) {
              const entries = [...p.entries];
              entries[idx] = res.data;
              return { ...p, entries };
            }
            return { ...p, entries: [res.data, ...p.entries] };
          })
        );
      });
    },
    []
  );

  const deleteEntry = useCallback((memberId: string, entryId: string) => {
    setHrProfiles((prev) =>
      prev.map((p) =>
        p.memberId === memberId
          ? { ...p, entries: p.entries.filter((e) => e.id !== entryId) }
          : p
      )
    );
    startTransition(async () => {
      const res = await deleteHrEntryAction(memberId, entryId);
      if (!res.success) {
        toast.error(res.error);
        const data = await getHrWorkspace();
        if (data) setHrProfiles(data.hrProfiles);
      }
    });
  }, []);

  const saveProfile = useCallback((profile: EmployeeProfile) => {
    setHrProfiles((prev) =>
      prev.map((p) => (p.memberId === profile.memberId ? profile : p))
    );
    startTransition(async () => {
      const res = await upsertHrEmployeeProfile(profile);
      if (!res.success) {
        toast.error(res.error);
        const data = await getHrWorkspace();
        if (data) setHrProfiles(data.hrProfiles);
      }
    });
  }, []);

  const uploadScan = useCallback(
    async (input: {
      memberId: string;
      file: File;
      label?: string;
    }): Promise<HrContractScan | null> => {
      const fd = new FormData();
      fd.set("memberId", input.memberId);
      fd.set("file", input.file);
      if (input.label) fd.set("label", input.label);

      const res = await uploadHrContractScanAction(fd);
      if (!res.success) {
        toast.error(res.error);
        return null;
      }

      setHrProfiles((prev) =>
        prev.map((p) =>
          p.memberId === input.memberId
            ? {
                ...p,
                contractScans: [res.data, ...(p.contractScans ?? [])],
              }
            : p
        )
      );
      return res.data;
    },
    []
  );

  const deleteScan = useCallback((memberId: string, scanId: string) => {
    setHrProfiles((prev) =>
      prev.map((p) =>
        p.memberId === memberId
          ? {
              ...p,
              contractScans: (p.contractScans ?? []).filter((s) => s.id !== scanId),
            }
          : p
      )
    );
    startTransition(async () => {
      const res = await deleteHrContractScanAction(memberId, scanId);
      if (!res.success) {
        toast.error(res.error);
        const data = await getHrWorkspace();
        if (data) setHrProfiles(data.hrProfiles);
      }
    });
  }, []);

  return {
    hydrated,
    teamOptions,
    hrProfiles,
    profileByMember,
    getMember,
    getProfile,
    saveEntry,
    deleteEntry,
    saveProfile,
    uploadScan,
    deleteScan,
  };
}
