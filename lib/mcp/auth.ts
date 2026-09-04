import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

export type McpAuthContext = {
  accessToken: string;
  clientId: string;
  profile: Profile;
  supabase: SupabaseClient;
  user: { id: string };
};

export type McpAuthResult =
  | { ok: true; context: McpAuthContext }
  | { ok: false; status: 401 | 403; message: string };

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export async function authenticateMcpRequest(
  request: Request
): Promise<McpAuthResult> {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return { ok: false, status: 401, message: "Missing bearer token" };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, status: 403, message: "MCP authentication is not configured" };
  }

  const supabase = createSupabaseClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims(accessToken);

  const clientId = claimsData?.claims?.client_id;
  const userId = claimsData?.claims?.sub;
  if (
    claimsError ||
    typeof userId !== "string" ||
    typeof clientId !== "string"
  ) {
    return { ok: false, status: 401, message: "Invalid OAuth access token" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*, job_role:org_job_roles(*)")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile?.organization_id || profile.role === "platform_admin") {
    return { ok: false, status: 403, message: "No company workspace is available" };
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("is_active")
    .eq("id", profile.organization_id)
    .maybeSingle();

  if (!organization?.is_active) {
    return { ok: false, status: 403, message: "The company workspace is inactive" };
  }

  return {
    ok: true,
    context: {
      accessToken,
      clientId,
      profile: profile as Profile,
      supabase,
      user: { id: userId },
    },
  };
}
