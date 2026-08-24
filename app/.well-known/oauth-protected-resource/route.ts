import { getPublicOrigin } from "@/lib/mcp/origin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return Response.json({ error: "OAuth server is not configured" }, { status: 503 });
  }

  const origin = getPublicOrigin(request);
  return Response.json(
    {
      resource: `${origin}/mcp`,
      authorization_servers: [`${supabaseUrl.replace(/\/$/, "")}/auth/v1`],
      scopes_supported: ["openid", "email", "profile"],
      bearer_methods_supported: ["header"],
      resource_documentation: `${origin}/settings`,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
    }
  );
}
