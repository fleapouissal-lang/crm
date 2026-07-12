import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const CANDIDATES = [
  { path: "avatar.jpg", type: "image/jpeg" },
  { path: "avatar.jpeg", type: "image/jpeg" },
  { path: "avatar.png", type: "image/png" },
  { path: "avatar.webp", type: "image/webp" },
  { path: "avatar.gif", type: "image/gif" },
] as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const admin = createAdminClient();

    for (const file of CANDIDATES) {
      const { data, error } = await admin.storage
        .from("avatars")
        .download(`${userId}/${file.path}`);

      if (error || !data) continue;

      const buffer = Buffer.from(await data.arrayBuffer());
      if (buffer.byteLength === 0) continue;

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": file.type,
          "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
          "Content-Length": String(buffer.byteLength),
        },
      });
    }

    return new NextResponse("Not found", { status: 404 });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
