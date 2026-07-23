"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canAccessClients } from "@/lib/permissions";
import { clientToRow, rowToClient, type ClientRow } from "@/lib/clients/db";
import type { ClientRecord } from "@/lib/clients/types";
import type { ActionResult } from "@/types/database";

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

export async function getClients(): Promise<ClientRecord[]> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return [];
  if (!canAccessClients(profile)) return [];

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[getClients]", error.message);
    return [];
  }
  return ((data as ClientRow[]) ?? []).map(rowToClient);
}

export async function upsertClient(
  input: ClientRecord
): Promise<ActionResult<ClientRecord>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }
  if (!input.name?.trim()) {
    return { success: false, error: "Name is required" };
  }

  const supabase = await createClient();
  const orgId = profile.organization_id;
  const existing = isUuid(input.id);

  if (existing) {
    const row = clientToRow(input, orgId);
    const { id: _id, organization_id: _org, ...update } = row;
    const { data, error } = await supabase
      .from("clients")
      .update(update)
      .eq("id", input.id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath("/clients");
    return { success: true, data: rowToClient(data as ClientRow) };
  }

  const row = clientToRow(input, orgId);
  const { id: _ignore, ...insert } = row;
  const { data, error } = await supabase
    .from("clients")
    .insert(insert)
    .select("*")
    .single();
  if (error) return { success: false, error: error.message };
  revalidatePath("/clients");
  return { success: true, data: rowToClient(data as ClientRow) };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/clients");
  return { success: true, data: undefined };
}

export async function bulkInsertClients(
  clients: ClientRecord[]
): Promise<ActionResult<{ count: number }>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }
  if (clients.length === 0) {
    return { success: true, data: { count: 0 } };
  }

  const supabase = await createClient();
  const orgId = profile.organization_id;
  const rows = clients.map((c) => {
    const row = clientToRow(c, orgId);
    const { id: _id, ...rest } = row;
    return rest;
  });

  const { data, error } = await supabase.from("clients").insert(rows).select("id");
  if (error) return { success: false, error: error.message };
  revalidatePath("/clients");
  return { success: true, data: { count: data?.length ?? 0 } };
}
