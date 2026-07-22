"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/actions/auth";
import { projectToRow, rowToProject, type ProjectRow } from "@/lib/projects/db";
import type { ProjectRecord } from "@/lib/projects/types";
import type { ActionResult } from "@/types/database";

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

export async function getProjects(): Promise<ProjectRecord[]> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return [];

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[getProjects]", error.message);
    return [];
  }
  return ((data as ProjectRow[]) ?? []).map(rowToProject);
}

export async function upsertProject(
  input: ProjectRecord
): Promise<ActionResult<ProjectRecord>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }
  if (!input.title?.trim()) {
    return { success: false, error: "Title is required" };
  }

  const supabase = await createClient();
  const orgId = profile.organization_id;

  if (isUuid(input.id)) {
    const row = projectToRow(input, orgId);
    const { id: _id, organization_id: _org, ...update } = row;
    const { data, error } = await supabase
      .from("projects")
      .update(update)
      .eq("id", input.id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath("/tasks");
    return { success: true, data: rowToProject(data as ProjectRow) };
  }

  const row = projectToRow(input, orgId);
  const { id: _ignore, ...insert } = row;
  const { data, error } = await supabase
    .from("projects")
    .insert(insert)
    .select("*")
    .single();
  if (error) return { success: false, error: error.message };
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  return { success: true, data: rowToProject(data as ProjectRow) };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  return { success: true, data: undefined };
}

export async function bulkInsertProjects(
  projects: ProjectRecord[]
): Promise<ActionResult<{ count: number }>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }
  if (projects.length === 0) {
    return { success: true, data: { count: 0 } };
  }

  const supabase = await createClient();
  const orgId = profile.organization_id;
  const rows = projects.map((p) => {
    const row = projectToRow(p, orgId);
    const { id: _id, ...rest } = row;
    return rest;
  });

  const { data, error } = await supabase.from("projects").insert(rows).select("id");
  if (error) return { success: false, error: error.message };
  revalidatePath("/projects");
  return { success: true, data: { count: data?.length ?? 0 } };
}
