"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { isLeadership } from "@/lib/permissions/capabilities";
import type { ActionResult, Profile } from "@/types/database";

const BUCKET = "project-reports";
const SIGNED_URL_TTL = 60 * 60;
const MAX_BYTES = 10 * 1024 * 1024;

export type ReportFolder = {
  id: string;
  name: string;
  createdAt: string;
  fileCount: number;
};

export type ReportFolderFile = {
  id: string;
  folderId: string;
  fileName: string;
  mimeType: string;
  label: string;
  uploadedAt: string;
  signedUrl: string | null;
};

type FolderRow = {
  id: string;
  name: string;
  created_at: string;
};

type FileRow = {
  id: string;
  folder_id: string;
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

function mapFile(row: FileRow, signed: Map<string, string>): ReportFolderFile {
  return {
    id: row.id,
    folderId: row.folder_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    label: row.label || row.file_name,
    uploadedAt: row.uploaded_at,
    signedUrl: signed.get(row.storage_path) ?? null,
  };
}

export async function listReportFoldersAction(): Promise<
  ActionResult<{ folders: ReportFolder[]; files: ReportFolderFile[] }>
> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const [foldersRes, filesRes] = await Promise.all([
    supabase
      .from("report_folders")
      .select("id, name, created_at")
      .eq("organization_id", gate.orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("report_folder_files")
      .select("*")
      .eq("organization_id", gate.orgId)
      .order("uploaded_at", { ascending: false }),
  ]);

  if (foldersRes.error) {
    return { success: false, error: foldersRes.error.message };
  }
  if (filesRes.error) {
    return { success: false, error: filesRes.error.message };
  }

  const fileRows = (filesRes.data ?? []) as FileRow[];
  const signed = await signPaths(fileRows.map((r) => r.storage_path));
  const files = fileRows.map((row) => mapFile(row, signed));

  const countByFolder = new Map<string, number>();
  for (const file of files) {
    countByFolder.set(file.folderId, (countByFolder.get(file.folderId) ?? 0) + 1);
  }

  const folders = ((foldersRes.data ?? []) as FolderRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    fileCount: countByFolder.get(row.id) ?? 0,
  }));

  return { success: true, data: { folders, files } };
}

export async function createReportFolderAction(
  name: string
): Promise<ActionResult<ReportFolder>> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const folderName = name.trim();
  if (!folderName) {
    return { success: false, error: "Folder name is required" };
  }
  if (folderName.length > 120) {
    return { success: false, error: "Folder name is too long" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_folders")
    .insert({
      organization_id: gate.orgId,
      name: folderName,
      created_by: gate.profile.id,
    })
    .select("id, name, created_at")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const row = data as FolderRow;
  revalidateReports();
  return {
    success: true,
    data: {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      fileCount: 0,
    },
  };
}

export async function renameReportFolderAction(
  folderId: string,
  name: string
): Promise<ActionResult<ReportFolder>> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const folderName = name.trim();
  if (!folderName) {
    return { success: false, error: "Folder name is required" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_folders")
    .update({ name: folderName })
    .eq("id", folderId)
    .eq("organization_id", gate.orgId)
    .select("id, name, created_at")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const row = data as FolderRow;
  revalidateReports();
  return {
    success: true,
    data: {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      fileCount: 0,
    },
  };
}

export async function deleteReportFolderAction(
  folderId: string
): Promise<ActionResult> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data: files } = await supabase
    .from("report_folder_files")
    .select("storage_path")
    .eq("folder_id", folderId)
    .eq("organization_id", gate.orgId);

  const paths = ((files ?? []) as { storage_path: string }[]).map(
    (f) => f.storage_path
  );

  const { error } = await supabase
    .from("report_folders")
    .delete()
    .eq("id", folderId)
    .eq("organization_id", gate.orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  if (paths.length) {
    await supabase.storage.from(BUCKET).remove(paths);
  }

  revalidateReports();
  return { success: true, data: undefined };
}

export async function uploadReportFolderFileAction(
  formData: FormData
): Promise<ActionResult<ReportFolderFile>> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const folderId = String(formData.get("folderId") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const file = formData.get("file");

  if (!folderId || !(file instanceof File)) {
    return { success: false, error: "Invalid upload" };
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return { success: false, error: "File too large (max 10 MB)" };
  }
  if (file.type !== "application/pdf") {
    return { success: false, error: "PDF only" };
  }

  const supabase = await createClient();
  const { data: folder } = await supabase
    .from("report_folders")
    .select("id")
    .eq("id", folderId)
    .eq("organization_id", gate.orgId)
    .maybeSingle();

  if (!folder) {
    return { success: false, error: "Folder not found" };
  }

  const fileId = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  const storagePath = `${gate.orgId}/folders/${folderId}/${fileId}-${safeName || "report.pdf"}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data, error } = await supabase
    .from("report_folder_files")
    .insert({
      id: fileId,
      organization_id: gate.orgId,
      folder_id: folderId,
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
    return { success: false, error: error.message };
  }

  const row = data as FileRow;
  const signed = await signPaths([row.storage_path]);
  revalidateReports();
  return { success: true, data: mapFile(row, signed) };
}

export async function renameReportFolderFileAction(
  fileId: string,
  label: string
): Promise<ActionResult<ReportFolderFile>> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const nextLabel = label.trim();
  if (!nextLabel) {
    return { success: false, error: "File name is required" };
  }
  if (nextLabel.length > 160) {
    return { success: false, error: "File name is too long" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_folder_files")
    .update({ label: nextLabel })
    .eq("id", fileId)
    .eq("organization_id", gate.orgId)
    .select("*")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const row = data as FileRow;
  const signed = await signPaths([row.storage_path]);
  revalidateReports();
  return { success: true, data: mapFile(row, signed) };
}

export async function deleteReportFolderFileAction(
  fileId: string
): Promise<ActionResult> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data: row, error: findError } = await supabase
    .from("report_folder_files")
    .select("id, storage_path")
    .eq("id", fileId)
    .eq("organization_id", gate.orgId)
    .maybeSingle();

  if (findError || !row) {
    return { success: false, error: findError?.message ?? "Not found" };
  }

  const { error } = await supabase
    .from("report_folder_files")
    .delete()
    .eq("id", fileId)
    .eq("organization_id", gate.orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.storage.from(BUCKET).remove([row.storage_path as string]);
  revalidateReports();
  return { success: true, data: undefined };
}

export async function getReportFolderFileSignedUrlAction(
  fileId: string,
  options?: { download?: boolean }
): Promise<ActionResult<string>> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("report_folder_files")
    .select("storage_path, file_name, label")
    .eq("id", fileId)
    .eq("organization_id", gate.orgId)
    .maybeSingle();

  if (error || !row) {
    return { success: false, error: error?.message ?? "Not found" };
  }

  const downloadName =
    (row.label as string) || (row.file_name as string) || "report.pdf";
  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(
      row.storage_path as string,
      SIGNED_URL_TTL,
      options?.download
        ? {
            download: downloadName.toLowerCase().endsWith(".pdf")
              ? downloadName
              : `${downloadName}.pdf`,
          }
        : undefined
    );

  if (signError || !data?.signedUrl) {
    return { success: false, error: signError?.message ?? "Signed URL failed" };
  }

  return { success: true, data: data.signedUrl };
}
