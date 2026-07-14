"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import type { Activity } from "@/types/database";

export async function getNotifications(limit = 40): Promise<Activity[]> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("*, profile:profiles!activities_user_id_fkey(*)")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as Activity[] | null) ?? [];
}
