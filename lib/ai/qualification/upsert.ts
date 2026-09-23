import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadQualification } from "@/types/database";

export type QualificationPatch = Partial<{
  need: string | null;
  budget: string | null;
  timeline: string | null;
  service_interest: string | null;
  interest_level: number | null;
  score: number | null;
  availability: string | null;
  objections: string[];
  questions: string[];
  notes: string | null;
}>;

export async function upsertQualification(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string,
  patch: QualificationPatch,
  updatedBy: "ai" | "human" = "ai"
): Promise<LeadQualification | null> {
  if (!patch || Object.keys(patch).length === 0) return null;
  const row = {
    organization_id: organizationId,
    lead_id: leadId,
    updated_by: updatedBy,
    ...patch,
  };
  const { data, error } = await supabase
    .from("lead_qualifications")
    .upsert(row, { onConflict: "lead_id" })
    .select("*")
    .single();
  if (error) {
    console.error("[upsertQualification]", error.message);
    return null;
  }
  if (typeof patch.score === "number") {
    await supabase
      .from("leads")
      .update({ ai_score: patch.score })
      .eq("id", leadId)
      .eq("organization_id", organizationId);
  }
  return data as LeadQualification;
}
