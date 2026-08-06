"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { isLeadership } from "@/lib/permissions/capabilities";
import type { ActionResult, Profile } from "@/types/database";

const BUCKET = "org-files";
const SIGNED_URL_TTL = 60 * 60;
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export type FileFolder = {
  id: string;
  name: string;
  createdAt: string;
  fileCount: number;
};

export type FileFolderItem = {
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

type ItemRow = {
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

function revalidateFiles() {
  revalidatePath("/files");
}

function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime.toLowerCase());
}

function isImageMime(mime: string): boolean {
  return mime.toLowerCase().startsWith("image/");
}

function extensionForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === "application/pdf") return ".pdf";
  if (m === "image/png") return ".png";
  if (m === "image/webp") return ".webp";
  if (m === "image/jpeg" || m === "image/jpg") return ".jpg";
  return "";
}

function downloadName(label: string, fileName: string, mime: string): string {
  const base = (label || fileName || "file").trim() || "file";
  const ext = extensionForMime(mime);
  if (!ext) return base;
  if (base.toLowerCase().endsWith(ext)) return base;
  return `${base}${ext}`;
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

function mapItem(row: ItemRow, signed: Map<string, string>): FileFolderItem {
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

export async function listFileFoldersAction(): Promise<
  ActionResult<{ folders: FileFolder[]; files: FileFolderItem[] }>
> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const [foldersRes, filesRes] = await Promise.all([
    supabase
      .from("file_folders")
      .select("id, name, created_at")
      .eq("organization_id", gate.orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("file_folder_items")
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

  const fileRows = (filesRes.data ?? []) as ItemRow[];
  const signed = await signPaths(fileRows.map((r) => r.storage_path));
  const files = fileRows.map((row) => mapItem(row, signed));

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

export async function createFileFolderAction(
  name: string
): Promise<ActionResult<FileFolder>> {
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
    .from("file_folders")
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
  revalidateFiles();
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

export async function deleteFileFolderAction(
  folderId: string
): Promise<ActionResult> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data: files } = await supabase
    .from("file_folder_items")
    .select("storage_path")
    .eq("folder_id", folderId)
    .eq("organization_id", gate.orgId);

  const paths = ((files ?? []) as { storage_path: string }[]).map(
    (f) => f.storage_path
  );

  const { error } = await supabase
    .from("file_folders")
    .delete()
    .eq("id", folderId)
    .eq("organization_id", gate.orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  if (paths.length) {
    await supabase.storage.from(BUCKET).remove(paths);
  }

  revalidateFiles();
  return { success: true, data: undefined };
}

export async function uploadFileFolderItemAction(
  formData: FormData
): Promise<ActionResult<FileFolderItem>> {
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

  const mime = (file.type || "").toLowerCase();
  if (!isAllowedMime(mime)) {
    return { success: false, error: "PDF or image only (JPG, PNG, WebP)" };
  }

  const supabase = await createClient();
  const { data: folder } = await supabase
    .from("file_folders")
    .select("id")
    .eq("id", folderId)
    .eq("organization_id", gate.orgId)
    .maybeSingle();

  if (!folder) {
    return { success: false, error: "Folder not found" };
  }

  const fileId = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  const fallback =
    isImageMime(mime) ? `image${extensionForMime(mime)}` : "document.pdf";
  const storagePath = `${gate.orgId}/folders/${folderId}/${fileId}-${safeName || fallback}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: mime === "image/jpg" ? "image/jpeg" : mime,
      upsert: false,
    });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const storedMime = mime === "image/jpg" ? "image/jpeg" : mime;
  const { data, error } = await supabase
    .from("file_folder_items")
    .insert({
      id: fileId,
      organization_id: gate.orgId,
      folder_id: folderId,
      file_name: safeName || file.name || fallback,
      mime_type: storedMime,
      storage_path: storagePath,
      label: label || safeName || file.name || fallback,
      uploaded_by: gate.profile.id,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { success: false, error: error.message };
  }

  const row = data as ItemRow;
  const signed = await signPaths([row.storage_path]);
  revalidateFiles();
  return { success: true, data: mapItem(row, signed) };
}

export async function renameFileFolderItemAction(
  fileId: string,
  label: string
): Promise<ActionResult<FileFolderItem>> {
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
    .from("file_folder_items")
    .update({ label: nextLabel })
    .eq("id", fileId)
    .eq("organization_id", gate.orgId)
    .select("*")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const row = data as ItemRow;
  const signed = await signPaths([row.storage_path]);
  revalidateFiles();
  return { success: true, data: mapItem(row, signed) };
}

export async function deleteFileFolderItemAction(
  fileId: string
): Promise<ActionResult> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data: row, error: findError } = await supabase
    .from("file_folder_items")
    .select("id, storage_path")
    .eq("id", fileId)
    .eq("organization_id", gate.orgId)
    .maybeSingle();

  if (findError || !row) {
    return { success: false, error: findError?.message ?? "Not found" };
  }

  const { error } = await supabase
    .from("file_folder_items")
    .delete()
    .eq("id", fileId)
    .eq("organization_id", gate.orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.storage.from(BUCKET).remove([row.storage_path as string]);
  revalidateFiles();
  return { success: true, data: undefined };
}

export async function getFileFolderItemSignedUrlAction(
  fileId: string,
  options?: { download?: boolean }
): Promise<ActionResult<string>> {
  const gate = await requireLeadership();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("file_folder_items")
    .select("storage_path, file_name, label, mime_type")
    .eq("id", fileId)
    .eq("organization_id", gate.orgId)
    .maybeSingle();

  if (error || !row) {
    return { success: false, error: error?.message ?? "Not found" };
  }

  const name = downloadName(
    row.label as string,
    row.file_name as string,
    row.mime_type as string
  );
  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(
      row.storage_path as string,
      SIGNED_URL_TTL,
      options?.download ? { download: name } : undefined
    );

  if (signError || !data?.signedUrl) {
    return { success: false, error: signError?.message ?? "Signed URL failed" };
  }

  return { success: true, data: data.signedUrl };
}
