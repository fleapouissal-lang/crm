import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const CANDIDATES = [
  { path: "logo.jpg", type: "image/jpeg" },
  { path: "logo.jpeg", type: "image/jpeg" },
  { path: "logo.png", type: "image/png" },
  { path: "logo.webp", type: "image/webp" },
  { path: "logo.gif", type: "image/gif" },
] as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await context.params;
  if (!organizationId || !/^[0-9a-f-]{36}$/i.test(organizationId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const admin = createAdminClient();

    for (const file of CANDIDATES) {
      const { data, error } = await admin.storage
        .from("org-logos")
        .download(`${organizationId}/${file.path}`);

      if (error || !data) continue;

      const buffer = Buffer.from(await data.arrayBuffer());
      if (buffer.byteLength === 0) continue;

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": file.type,
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
          "Content-Length": String(buffer.byteLength),
        },
      });
    }

    return new NextResponse("Not found", { status: 404 });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
