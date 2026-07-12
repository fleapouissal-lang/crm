import type { SupabaseClient } from "@supabase/supabase-js";

export const ORG_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const ORG_LOGO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function orgLogoExtension(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export async function uploadOrgLogoFile(
  client: SupabaseClient,
  organizationId: string,
  file: File
): Promise<string> {
  if (!ORG_LOGO_TYPES.has(file.type)) {
    throw new Error("invalid_logo_type");
  }
  if (file.size > ORG_LOGO_MAX_BYTES) {
    throw new Error("logo_too_large");
  }

  const ext = orgLogoExtension(file.type);
  const path = `${organizationId}/logo.${ext}`;

  const { error: uploadError } = await client.storage
    .from("org-logos")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = client.storage.from("org-logos").getPublicUrl(path);

  return `${publicUrl}?v=${Date.now()}`;
}
