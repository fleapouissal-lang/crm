"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Profile } from "@/types/database";
import { buildTeamOptions, type TeamMemberOption } from "@/lib/team/members";
import type { EmployeeProfile, HrContractScan, HrEntry } from "./types";
import { buildEmptyHrProfiles, clearHrLocalCache } from "./storage";
import { emptyProfileForMember } from "./map-rows";
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
    }
  }, [initialHrProfiles]);

  useEffect(() => {
    if (initialHrProfiles) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when SSR data is absent
  }, [initialHrProfiles]);

  // Always expose one HR profile per CRM member (avoids race after create).
  const resolvedHrProfiles = useMemo(() => {
    const byId = new Map(hrProfiles.map((p) => [p.memberId, p]));
    return teamOptions.map(
      (member) => byId.get(member.id) ?? emptyProfileForMember(member)
    );
  }, [hrProfiles, teamOptions]);

  const profileByMember = useMemo(
    () => new Map(resolvedHrProfiles.map((p) => [p.memberId, p])),
    [resolvedHrProfiles]
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
          const current = p.entries ?? [];
          const idx = current.findIndex((e) => e.id === entry.id);
          if (idx >= 0) {
            const entries = [...current];
            entries[idx] = entry;
            return { ...p, entries };
          }
          return { ...p, entries: [entry, ...current] };
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
            const current = p.entries ?? [];
            const idx = current.findIndex((e) => e.id === res.data.id);
            if (idx >= 0) {
              const entries = [...current];
              entries[idx] = res.data;
              return { ...p, entries };
            }
            return { ...p, entries: [res.data, ...current] };
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
          ? { ...p, entries: (p.entries ?? []).filter((e) => e.id !== entryId) }
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
    const normalized = {
      ...profile,
      entries: profile.entries ?? [],
      contractScans: profile.contractScans ?? [],
    };
    setHrProfiles((prev) => {
      const idx = prev.findIndex((p) => p.memberId === normalized.memberId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = normalized;
        return next;
      }
      return [...prev, normalized];
    });
    startTransition(async () => {
      const res = await upsertHrEmployeeProfile(normalized);
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
      category?: "contract" | "banque";
    }): Promise<HrContractScan | null> => {
      const category = input.category === "banque" ? "banque" : "contract";
      const fd = new FormData();
      fd.set("memberId", input.memberId);
      fd.set("file", input.file);
      fd.set("category", category);
      if (input.label) fd.set("label", input.label);

      const res = await uploadHrContractScanAction(fd);
      if (!res.success) {
        toast.error(res.error);
        return null;
      }

      setHrProfiles((prev) =>
        prev.map((p) => {
          if (p.memberId !== input.memberId) return p;
          if (category === "banque") {
            return {
              ...p,
              banqueScans: [res.data, ...(p.banqueScans ?? [])],
            };
          }
          return {
            ...p,
            contractScans: [res.data, ...(p.contractScans ?? [])],
          };
        })
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
              banqueScans: (p.banqueScans ?? []).filter((s) => s.id !== scanId),
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
    hrProfiles: resolvedHrProfiles,
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
