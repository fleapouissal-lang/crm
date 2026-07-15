"use server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import {
  financeIssuerFromOrganization,
  type FinanceIssuer,
} from "@/lib/finance/company-info";

export async function getCurrentFinanceIssuer(): Promise<FinanceIssuer> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return financeIssuerFromOrganization(null);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, name, logo_url, rc, country, city, phone, email_domain")
    .eq("id", profile.organization_id)
    .single();

  return financeIssuerFromOrganization(data);
}
