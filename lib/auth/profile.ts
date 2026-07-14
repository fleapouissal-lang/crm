import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/** Deduped per request — layout + pages share one profile fetch. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
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
});
