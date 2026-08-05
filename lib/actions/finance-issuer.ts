"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import {
  financeIssuerFromOrganization,
  resolveTvaRate,
  type FinanceIssuer,
} from "@/lib/finance/company-info";
import { isLeadership } from "@/lib/permissions";
import type { PriceMode } from "@/lib/finance/types";

const ORG_FINANCE_SELECT =
  "id, name, logo_url, rc, country, city, phone, email_domain, finance_price_mode, finance_tva_rate";

export async function getCurrentFinanceIssuer(): Promise<FinanceIssuer> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return financeIssuerFromOrganization(null);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select(ORG_FINANCE_SELECT)
    .eq("id", profile.organization_id)
    .single();

  return financeIssuerFromOrganization(data);
}

export async function updateFinancePriceMode(
  mode: PriceMode
): Promise<{ success: boolean; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "No organization" };
  }
  if (!isLeadership(profile)) {
    return { success: false, error: "Leadership access required" };
  }
  if (mode !== "ht" && mode !== "ttc") {
    return { success: false, error: "Invalid price mode" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ finance_price_mode: mode })
    .eq("id", profile.organization_id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateFinanceTvaRate(
  rate: number
): Promise<{ success: boolean; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "No organization" };
  }
  if (!isLeadership(profile)) {
    return { success: false, error: "Leadership access required" };
  }

  const normalized = resolveTvaRate(rate);
  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ finance_tva_rate: normalized })
    .eq("id", profile.organization_id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}
