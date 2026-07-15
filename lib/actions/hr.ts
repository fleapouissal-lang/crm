"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import { isLeadership } from "@/lib/permissions/capabilities";
import { buildTeamOptions, profileToTeamOption } from "@/lib/team/members";
import type { ActionResult, Profile } from "@/types/database";
import type { EmployeeProfile, HrContractScan, HrEntry } from "@/lib/hr/types";
import { normalizeEmployeeProfile } from "@/lib/hr/types";
import {
  mergeHrWorkspace,
  type HrEntryRow,
  type HrProfileRow,
  type HrScanRow,
} from "@/lib/hr/map-rows";

const HR_BUCKET = "hr-contracts";
const SIGNED_URL_TTL = 60 * 60; // 1h
const MAX_SCAN_BYTES = 3 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

async function requireLeadership(): Promise<
  | { ok: true; profile: Profile; orgId: string }
  | { ok: false; error: string }
> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { ok: false, error: "Unauthorized" };
  }
  if (!isLeadership(profile)) {
    return { ok: false, error: "Forbidden" };
  }
  return { ok: true, profile, orgId: profile.organization_id };
}

function revalidateHr(memberId?: string) {
  revalidatePath("/hr");
  if (memberId) {
    revalidatePath(`/hr/${memberId}`);
    revalidatePath(`/hr/${memberId}/salary`);
  }
}

async function memberInOrg(
  orgId: string,
  memberId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", memberId)
    .eq("organization_id", orgId)
    .maybeSingle();
  return !!data;
}

async function signScanPaths(
  paths: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const supabase = await createClient();
  await Promise.all(
    paths.map(async (path) => {
      const { data } = await supabase.storage
        .from(HR_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (data?.signedUrl) map.set(path, data.signedUrl);
    })
  );
  return map;
}

export async function getMyMemberAccount(): Promise<EmployeeProfile | null> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || profile.role !== "member") {
    return null;
  }

  const supabase = await createClient();
  const orgId = profile.organization_id;
  const memberId = profile.id;

  const [profilesRes, entriesRes, scansRes] = await Promise.all([
    supabase
      .from("hr_employee_profiles")
      .select("*")
      .eq("organization_id", orgId)
      .eq("member_id", memberId)
      .maybeSingle(),
    supabase
      .from("hr_entries")
      .select("*")
      .eq("organization_id", orgId)
      .eq("member_id", memberId)
      .order("entry_date", { ascending: false }),
    supabase
      .from("hr_contract_scans")
      .select("*")
      .eq("organization_id", orgId)
      .eq("member_id", memberId)
      .order("uploaded_at", { ascending: false }),
  ]);

  if (profilesRes.error || entriesRes.error || scansRes.error) {
    console.error(
      "[hr] member self load failed",
      profilesRes.error ?? entriesRes.error ?? scansRes.error
    );
    return null;
  }

  const scanRows = (scansRes.data ?? []) as HrScanRow[];
  const signed = await signScanPaths(scanRows.map((s) => s.storage_path));
  const member = profileToTeamOption(profile);
  const [hrProfile] = mergeHrWorkspace(
    [member],
    profilesRes.data ? [(profilesRes.data as HrProfileRow)] : [],
    (entriesRes.data ?? []) as HrEntryRow[],
    scanRows,
    signed
  );

  return hrProfile ?? null;
}

export async function getHrWorkspace(): Promise<{
  teamProfiles: Profile[];
  hrProfiles: EmployeeProfile[];
} | null> {
  const gate = await requireLeadership();
  if (!gate.ok) return null;

  const teamProfiles = await getOrgProfiles();
  const team = buildTeamOptions(teamProfiles);
  const supabase = await createClient();

  const [profilesRes, entriesRes, scansRes] = await Promise.all([
    supabase
      .from("hr_employee_profiles")
      .select("*")
      .eq("organization_id", gate.orgId),
    supabase
      .from("hr_entries")
      .select("*")
      .eq("organization_id", gate.orgId)
      .order("entry_date", { ascending: false }),
    supabase
      .from("hr_contract_scans")
      .select("*")
      .eq("organization_id", gate.orgId)
      .order("uploaded_at", { ascending: false }),
  ]);

  if (profilesRes.error || entriesRes.error || scansRes.error) {
    console.error(
      "[hr] load failed",
      profilesRes.error ?? entriesRes.error ?? scansRes.error
    );
    return { teamProfiles, hrProfiles: mergeHrWorkspace(team, [], [], [], new Map()) };
  }

  const scanRows = (scansRes.data ?? []) as HrScanRow[];
  const signed = await signScanPaths(scanRows.map((s) => s.storage_path));

  return {
    teamProfiles,
    hrProfiles: mergeHrWorkspace(
      team,
      (profilesRes.data ?? []) as HrProfileRow[],
      (entriesRes.data ?? []) as HrEntryRow[],
      scanRows,
      signed
    ),
  };
}

export async function upsertHrEmployeeProfile(
  profile: EmployeeProfile
): Promise<ActionResult<EmployeeProfile>> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const normalized = normalizeEmployeeProfile(profile);
  if (!(await memberInOrg(gate.orgId, normalized.memberId))) {
    return { success: false, error: "Member not in organization" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("hr_employee_profiles").upsert(
    {
      organization_id: gate.orgId,
      member_id: normalized.memberId,
      role_title: normalized.roleTitle,
      department: normalized.department,
      business_unit: normalized.businessUnit ?? "",
      phone: normalized.phone ?? "",
      email: normalized.email ?? "",
      base_salary:
        normalized.baseSalary != null && normalized.baseSalary > 0
          ? normalized.baseSalary
          : null,
      salary_currency: normalized.salaryCurrency || "MAD",
      overtime_rate:
        normalized.overtimeRate != null && normalized.overtimeRate > 0
          ? normalized.overtimeRate
          : null,
      contract_type: normalized.contractType,
      utilization: Math.min(100, Math.max(0, normalized.utilization || 0)),
      status: normalized.status,
      contract_start: normalized.contractStart || null,
      contract_end: normalized.contractEnd || null,
    },
    { onConflict: "organization_id,member_id" }
  );

  if (error) {
    console.error("[hr] upsert profile", error);
    return { success: false, error: error.message };
  }

  revalidateHr(normalized.memberId);
  return { success: true, data: normalized };
}

export async function upsertHrEntryAction(
  entry: HrEntry
): Promise<ActionResult<HrEntry>> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  if (!(await memberInOrg(gate.orgId, entry.memberId))) {
    return { success: false, error: "Member not in organization" };
  }

  const allowed = new Set([
    "bonus",
    "commission",
    "overtime",
    "lateness",
    "leave",
    "note",
  ]);
  if (!allowed.has(entry.type)) {
    return { success: false, error: "Invalid entry type" };
  }
  if (!entry.date) {
    return { success: false, error: "Date required" };
  }

  const supabase = await createClient();
  const payload = {
    id: entry.id,
    organization_id: gate.orgId,
    member_id: entry.memberId,
    type: entry.type,
    entry_date: entry.date,
    amount: entry.amount ?? null,
    currency: entry.currency || "MAD",
    hours: entry.hours ?? null,
    minutes: entry.minutes ?? null,
    days: entry.days ?? null,
    leave_end_date: entry.endDate ?? null,
    note: entry.note ?? "",
    created_by: gate.profile.id,
    created_at: entry.createdAt || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("hr_entries")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    console.error("[hr] upsert entry", error);
    return { success: false, error: error.message };
  }

  const row = data as HrEntryRow;
  revalidateHr(entry.memberId);
  return {
    success: true,
    data: {
      id: row.id,
      memberId: row.member_id,
      type: row.type as HrEntry["type"],
      date: row.entry_date,
      amount: row.amount != null ? Number(row.amount) : undefined,
      currency: row.currency ?? "MAD",
      hours: row.hours != null ? Number(row.hours) : undefined,
      minutes: row.minutes ?? undefined,
      days: row.days != null ? Number(row.days) : undefined,
      endDate: row.leave_end_date ?? undefined,
      note: row.note ?? "",
      createdAt: row.created_at,
    },
  };
}

export async function deleteHrEntryAction(
  memberId: string,
  entryId: string
): Promise<ActionResult> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("hr_entries")
    .delete()
    .eq("id", entryId)
    .eq("organization_id", gate.orgId)
    .eq("member_id", memberId);

  if (error) {
    console.error("[hr] delete entry", error);
    return { success: false, error: error.message };
  }

  revalidateHr(memberId);
  return { success: true, data: undefined };
}

export async function uploadHrContractScanAction(
  formData: FormData
): Promise<ActionResult<HrContractScan>> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const memberId = String(formData.get("memberId") ?? "");
  const file = formData.get("file");
  const label = String(formData.get("label") ?? "").trim();

  if (!memberId || !(file instanceof File)) {
    return { success: false, error: "Invalid upload" };
  }
  if (!(await memberInOrg(gate.orgId, memberId))) {
    return { success: false, error: "Member not in organization" };
  }
  if (file.size <= 0 || file.size > MAX_SCAN_BYTES) {
    return { success: false, error: "File too large" };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { success: false, error: "Unsupported file type" };
  }

  const scanId = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  const storagePath = `${gate.orgId}/${memberId}/${scanId}-${safeName}`;

  const supabase = await createClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(HR_BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[hr] storage upload", uploadError);
    return { success: false, error: uploadError.message };
  }

  const { data, error } = await supabase
    .from("hr_contract_scans")
    .insert({
      id: scanId,
      organization_id: gate.orgId,
      member_id: memberId,
      file_name: safeName || file.name,
      mime_type: file.type,
      storage_path: storagePath,
      label: label || safeName || file.name,
      uploaded_by: gate.profile.id,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(HR_BUCKET).remove([storagePath]);
    console.error("[hr] scan row", error);
    return { success: false, error: error.message };
  }

  const row = data as HrScanRow;
  const signed = await signScanPaths([row.storage_path]);
  revalidateHr(memberId);

  return {
    success: true,
    data: {
      id: row.id,
      memberId: row.member_id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      dataUrl: signed.get(row.storage_path) ?? "",
      storagePath: row.storage_path,
      uploadedAt: row.uploaded_at,
      label: row.label ?? undefined,
    },
  };
}

export async function deleteHrContractScanAction(
  memberId: string,
  scanId: string
): Promise<ActionResult> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data: row, error: findError } = await supabase
    .from("hr_contract_scans")
    .select("id, storage_path")
    .eq("id", scanId)
    .eq("organization_id", gate.orgId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (findError || !row) {
    return { success: false, error: findError?.message ?? "Not found" };
  }

  const { error } = await supabase
    .from("hr_contract_scans")
    .delete()
    .eq("id", scanId)
    .eq("organization_id", gate.orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.storage.from(HR_BUCKET).remove([row.storage_path as string]);
  revalidateHr(memberId);
  return { success: true, data: undefined };
}

export async function getHrContractScanSignedUrlAction(
  memberId: string,
  scanId: string
): Promise<ActionResult<string>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Unauthorized" };
  }
  const isSelf = profile.id === memberId;
  if (!isSelf && !isLeadership(profile)) {
    return { success: false, error: "Forbidden" };
  }

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("hr_contract_scans")
    .select("storage_path")
    .eq("id", scanId)
    .eq("organization_id", profile.organization_id)
    .eq("member_id", memberId)
    .maybeSingle();

  if (error || !row?.storage_path) {
    return { success: false, error: error?.message ?? "Not found" };
  }

  const signed = await signScanPaths([row.storage_path as string]);
  const url = signed.get(row.storage_path as string);
  if (!url) {
    return { success: false, error: "Could not sign URL" };
  }

  return { success: true, data: url };
}
