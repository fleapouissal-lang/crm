import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function avatarExtension(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

/** Accept File or Blob from Server Action FormData. */
export function getAvatarBlob(
  formData: FormData,
  field = "avatar"
): { blob: Blob; type: string } | null {
  const raw = formData.get(field);
  if (!raw || typeof raw === "string") return null;

  const blob = raw as Blob;
  if (!(blob instanceof Blob) || blob.size === 0) return null;

  const type = blob.type || "image/jpeg";
  if (!AVATAR_TYPES.has(type)) return null;

  return { blob, type };
}

export function blobFromBase64(
  base64: string,
  contentType: string
): Blob {
  const cleaned = base64.replace(/^data:[^;]+;base64,/, "");
  const binary = Buffer.from(cleaned, "base64");
  return new Blob([binary], { type: contentType });
}

export async function ensureAvatarsBucket(
  client: SupabaseClient
): Promise<void> {
  const { data: buckets } = await client.storage.listBuckets();
  const exists = buckets?.some((b) => b.id === "avatars" || b.name === "avatars");
  if (!exists) {
    const { error } = await client.storage.createBucket("avatars", {
      public: true,
      fileSizeLimit: AVATAR_MAX_BYTES,
      allowedMimeTypes: [...AVATAR_TYPES],
    });
    if (error && !/already exists|duplicate/i.test(error.message)) {
      throw new Error(error.message);
    }
    return;
  }

  await client.storage.updateBucket("avatars", {
    public: true,
    fileSizeLimit: AVATAR_MAX_BYTES,
    allowedMimeTypes: [...AVATAR_TYPES],
  });
}

export async function uploadAvatarToBucket(
  client: SupabaseClient,
  userId: string,
  blob: Blob,
  contentType: string
): Promise<string> {
  if (!AVATAR_TYPES.has(contentType)) {
    throw new Error("invalid_type");
  }
  if (blob.size > AVATAR_MAX_BYTES) {
    throw new Error("too_large");
  }

  const ext = avatarExtension(contentType);
  const path = `${userId}/avatar.${ext}`;

  // Remove previous avatar variants (jpg/png/webp/gif) so only one remains.
  const { data: existing } = await client.storage.from("avatars").list(userId);
  if (existing?.length) {
    const paths = existing.map((f) => `${userId}/${f.name}`);
    await client.storage.from("avatars").remove(paths);
  }

  const { error: uploadError } = await client.storage
    .from("avatars")
    .upload(path, blob, {
      upsert: true,
      contentType,
      cacheControl: "3600",
    });

  if (uploadError) throw new Error(uploadError.message);

  return `/api/avatars/${userId}?v=${Date.now()}`;
}

export async function removeAvatarFromBucket(
  client: SupabaseClient,
  userId: string
): Promise<void> {
  const { data: files } = await client.storage.from("avatars").list(userId);
  if (!files?.length) return;
  const paths = files.map((f) => `${userId}/${f.name}`);
  await client.storage.from("avatars").remove(paths);
}
