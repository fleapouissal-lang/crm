"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocalizedDict } from "@/lib/i18n/server";
import type { ActionResult, Profile } from "@/types/database";

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

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*, job_role:org_job_roles(*)")
    .eq("id", user.id)
    .single();

  return data as Profile | null;
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
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function avatarExtension(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export async function uploadAvatar(
  formData: FormData
): Promise<ActionResult<{ avatar_url: string }>> {
  const dict = await getLocalizedDict();
  const s = dict.fusion.settings;
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: dict.auth.errors.required };
  }

  if (!AVATAR_TYPES.has(file.type)) {
    return { success: false, error: s.avatarInvalidType };
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return { success: false, error: s.avatarTooLarge };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const ext = avatarExtension(file.type);
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  revalidatePath("/", "layout");
  return { success: true, data: { avatar_url: avatarUrl } };
}

export async function removeAvatar(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { data: files } = await supabase.storage.from("avatars").list(user.id);

  if (files?.length) {
    const paths = files.map((f) => `${user.id}/${f.name}`);
    await supabase.storage.from("avatars").remove(paths);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
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
