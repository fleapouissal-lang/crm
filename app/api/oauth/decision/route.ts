import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const decisionSchema = z.object({
  authorization_id: z.string().min(1).max(500),
  decision: z.enum(["approve", "deny"]),
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestOrigin =
    forwardedProto && forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : new URL(request.url).origin;
  if (origin && origin !== requestOrigin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const formData = await request.formData();
  const parsed = decisionSchema.safeParse({
    authorization_id: formData.get("authorization_id"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid authorization decision" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const operation =
    parsed.data.decision === "approve"
      ? supabase.auth.oauth.approveAuthorization(parsed.data.authorization_id, {
          skipBrowserRedirect: true,
        })
      : supabase.auth.oauth.denyAuthorization(parsed.data.authorization_id, {
          skipBrowserRedirect: true,
        });
  const { data, error } = await operation;

  if (error || !data?.redirect_url) {
    return NextResponse.json(
      { error: error?.message ?? "Authorization failed" },
      { status: 400 }
    );
  }

  return NextResponse.redirect(data.redirect_url, 303);
}
