"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { isLeadership } from "@/lib/permissions/capabilities";
import type { ActionResult, Profile } from "@/types/database";

const BUCKET = "project-reports";
const SIGNED_URL_TTL = 60 * 60;
const MAX_BYTES = 10 * 1024 * 1024;

export type ProjectReportFile = {
  id: string;
  projectId: string;
  projectTitle: string;
  fileName: string;
  mimeType: string;
  label: string;
  uploadedAt: string;
  signedUrl: string | null;
};

type ProjectReportRow = {
  id: string;
  organization_id: string;
  project_id: string;
  project_title: string;
  file_name: string;
  mime_type: string;
  storage_path: string;
  label: string;
  uploaded_at: string;
};

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

function revalidateReports() {
  revalidatePath("/reports");
}

async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!paths.length) return map;
  const supabase = await createClient();
  await Promise.all(
    paths.map(async (path) => {
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (data?.signedUrl) map.set(path, data.signedUrl);
    })
  );
  return map;
}

function mapRow(
  row: ProjectReportRow,
  signed: Map<string, string>
): ProjectReportFile {
  return {
    id: row.id,
    projectId: row.project_id,
    projectTitle: row.project_title,
    fileName: row.file_name,
    mimeType: row.mime_type,
    label: row.label || row.file_name,
    uploadedAt: row.uploaded_at,
    signedUrl: signed.get(row.storage_path) ?? null,
  };
}

export async function listProjectReportsAction(): Promise<
  ActionResult<ProjectReportFile[]>
> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_reports")
    .select("*")
    .eq("organization_id", gate.orgId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("[project-reports] list", error);
    return { success: false, error: error.message };
  }

  const rows = (data ?? []) as ProjectReportRow[];
  const signed = await signPaths(rows.map((r) => r.storage_path));
  return { success: true, data: rows.map((row) => mapRow(row, signed)) };
}

export async function uploadProjectReportAction(
  formData: FormData
): Promise<ActionResult<ProjectReportFile>> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const projectId = String(formData.get("projectId") ?? "").trim();
  const projectTitle = String(formData.get("projectTitle") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const file = formData.get("file");

  if (!projectId || !(file instanceof File)) {
    return { success: false, error: "Invalid upload" };
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return { success: false, error: "File too large (max 10 MB)" };
  }
  if (file.type !== "application/pdf") {
    return { success: false, error: "PDF only" };
  }

  const reportId = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  const storagePath = `${gate.orgId}/${projectId}/${reportId}-${safeName || "report.pdf"}`;

  const supabase = await createClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    console.error("[project-reports] upload", uploadError);
    return { success: false, error: uploadError.message };
  }

  const { data, error } = await supabase
    .from("project_reports")
    .insert({
      id: reportId,
      organization_id: gate.orgId,
      project_id: projectId,
      project_title: projectTitle || projectId,
      file_name: safeName || file.name || "report.pdf",
      mime_type: "application/pdf",
      storage_path: storagePath,
      label: label || safeName || file.name || "report.pdf",
      uploaded_by: gate.profile.id,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    console.error("[project-reports] insert", error);
    return { success: false, error: error.message };
  }

  const row = data as ProjectReportRow;
  const signed = await signPaths([row.storage_path]);
  revalidateReports();
  return { success: true, data: mapRow(row, signed) };
}

export async function deleteProjectReportAction(
  reportId: string
): Promise<ActionResult> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data: row, error: findError } = await supabase
    .from("project_reports")
    .select("id, storage_path")
    .eq("id", reportId)
    .eq("organization_id", gate.orgId)
    .maybeSingle();

  if (findError || !row) {
    return { success: false, error: findError?.message ?? "Not found" };
  }

  const { error } = await supabase
    .from("project_reports")
    .delete()
    .eq("id", reportId)
    .eq("organization_id", gate.orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.storage.from(BUCKET).remove([row.storage_path as string]);
  revalidateReports();
  return { success: true, data: undefined };
}

export async function getProjectReportSignedUrlAction(
  reportId: string
): Promise<ActionResult<string>> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("project_reports")
    .select("storage_path")
    .eq("id", reportId)
    .eq("organization_id", gate.orgId)
    .maybeSingle();

  if (error || !row) {
    return { success: false, error: error?.message ?? "Not found" };
  }

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path as string, SIGNED_URL_TTL);

  if (signError || !data?.signedUrl) {
    return { success: false, error: signError?.message ?? "Signed URL failed" };
  }

  return { success: true, data: data.signedUrl };
}
