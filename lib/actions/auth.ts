"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocalizedDict } from "@/lib/i18n/server";
import {
  AVATAR_TYPES,
  blobFromBase64,
  ensureAvatarsBucket,
  getAvatarBlob,
  removeAvatarFromBucket,
  uploadAvatarToBucket,
} from "@/lib/avatars/storage";
import type { ActionResult, Profile } from "@/types/database";
import { getCurrentProfile } from "@/lib/auth/profile";

export { getCurrentProfile };

export async function signUp(_formData: FormData): Promise<ActionResult> {
  const dict = await getLocalizedDict();
  return { success: false, error: dict.auth.companyCreatedByAdmin };
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const dict = await getLocalizedDict();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { success: false, error: dict.auth.errors.emailPassword };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profile?.organization_id && profile.role !== "platform_admin") {
      const { data: org } = await supabase
        .from("organizations")
        .select("is_active")
        .eq("id", profile.organization_id)
        .single();

      if (org && org.is_active === false) {
        await supabase.auth.signOut();
        return { success: false, error: dict.auth.errors.companyInactive };
      }
    }
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getOrgProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return [];

  const { data } = await supabase
    .from("profiles")
    .select("*, job_role:org_job_roles(*)")
    .eq("organization_id", profile.organization_id)
    .order("full_name");

  return (data as Profile[]) ?? [];
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const jobTitle = String(formData.get("job_title") ?? "").trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
      job_title: jobTitle || null,
    })
    .eq("id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

async function persistAvatarUrl(
  userId: string,
  avatarUrl: string
): Promise<ActionResult<{ avatar_url: string }>> {
  const supabase = await createClient();
  const { data: updated, error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId)
    .select("avatar_url")
    .single();

  if (!profileError) {
    revalidatePath("/", "layout");
    revalidatePath("/settings");
    return {
      success: true,
      data: { avatar_url: updated?.avatar_url ?? avatarUrl },
    };
  }

  try {
    const admin = createAdminClient();
    const { data: adminUpdated, error: adminProfileError } = await admin
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId)
      .select("avatar_url")
      .single();
    if (adminProfileError) {
      return { success: false, error: adminProfileError.message };
    }
    revalidatePath("/", "layout");
    revalidatePath("/settings");
    return {
      success: true,
      data: { avatar_url: adminUpdated?.avatar_url ?? avatarUrl },
    };
  } catch {
    return { success: false, error: profileError.message };
  }
}

async function storeAvatarForUser(
  userId: string,
  blob: Blob,
  contentType: string,
  uploadFailedFallback: string
): Promise<ActionResult<{ avatar_url: string }>> {
  // Always use service role for storage so the file is actually written,
  // then expose it through /api/avatars/[userId].
  try {
    const admin = createAdminClient();
    await ensureAvatarsBucket(admin);
    const avatarUrl = await uploadAvatarToBucket(
      admin,
      userId,
      blob,
      contentType
    );
    return persistAvatarUrl(userId, avatarUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "upload_failed";
    if (message === "invalid_type" || message === "too_large") {
      return { success: false, error: message };
    }
    try {
      const supabase = await createClient();
      const avatarUrl = await uploadAvatarToBucket(
        supabase,
        userId,
        blob,
        contentType
      );
      return persistAvatarUrl(userId, avatarUrl);
    } catch (fallbackErr) {
      const fallbackMessage =
        fallbackErr instanceof Error ? fallbackErr.message : message;
      return {
        success: false,
        error: fallbackMessage || uploadFailedFallback,
      };
    }
  }
}

export async function uploadAvatar(
  formData: FormData
): Promise<ActionResult<{ avatar_url: string }>> {
  const dict = await getLocalizedDict();
  const s = dict.fusion.settings;
  const parsed = getAvatarBlob(formData);

  if (!parsed) {
    return { success: false, error: dict.auth.errors.required };
  }

  if (!AVATAR_TYPES.has(parsed.type)) {
    return { success: false, error: s.avatarInvalidType };
  }

  if (parsed.blob.size > AVATAR_MAX_BYTES) {
    return { success: false, error: s.avatarTooLarge };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const result = await storeAvatarForUser(
    user.id,
    parsed.blob,
    parsed.type,
    s.avatarUploadFailed
  );

  if (!result.success) {
    if (result.error === "invalid_type") {
      return { success: false, error: s.avatarInvalidType };
    }
    if (result.error === "too_large") {
      return { success: false, error: s.avatarTooLarge };
    }
  }

  return result;
}

/** Preferred upload path — avoids empty FormData File in Server Actions. */
export async function uploadAvatarBase64(input: {
  base64: string;
  contentType: string;
}): Promise<ActionResult<{ avatar_url: string }>> {
  const dict = await getLocalizedDict();
  const s = dict.fusion.settings;
  const contentType = input.contentType || "image/jpeg";

  if (!AVATAR_TYPES.has(contentType)) {
    return { success: false, error: s.avatarInvalidType };
  }

  if (!input.base64?.trim()) {
    return { success: false, error: dict.auth.errors.required };
  }

  let blob: Blob;
  try {
    blob = blobFromBase64(input.base64, contentType);
  } catch {
    return { success: false, error: s.avatarUploadFailed };
  }

  if (blob.size === 0) {
    return { success: false, error: dict.auth.errors.required };
  }
  if (blob.size > AVATAR_MAX_BYTES) {
    return { success: false, error: s.avatarTooLarge };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const result = await storeAvatarForUser(
    user.id,
    blob,
    contentType,
    s.avatarUploadFailed
  );

  if (!result.success) {
    if (result.error === "invalid_type") {
      return { success: false, error: s.avatarInvalidType };
    }
    if (result.error === "too_large") {
      return { success: false, error: s.avatarTooLarge };
    }
  }

  return result;
}

export async function removeAvatar(): Promise<ActionResult> {
  const dict = await getLocalizedDict();
  const s = dict.fusion.settings;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  try {
    await removeAvatarFromBucket(supabase, user.id);
  } catch {
    try {
      await removeAvatarFromBucket(createAdminClient(), user.id);
    } catch {
      /* still clear DB even if storage cleanup fails */
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) {
    try {
      const { error: adminError } = await createAdminClient()
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);
      if (adminError) {
        return { success: false, error: adminError.message || s.avatarUploadFailed };
      }
    } catch {
      return { success: false, error: error.message || s.avatarUploadFailed };
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  return { success: true, data: undefined };
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const dict = await getLocalizedDict();
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { success: false, error: dict.auth.errors.required };
  }

  if (newPassword.length < 6) {
    return { success: false, error: dict.auth.errors.passwordMin };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: dict.fusion.settings.passwordMismatch };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { success: false, error: dict.auth.errors.emailPassword };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return { success: false, error: dict.fusion.settings.wrongPassword };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true, data: undefined };
}
