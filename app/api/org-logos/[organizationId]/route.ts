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

function contentTypeForPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}

/** Extract storage object path inside org-logos from a public/signed URL or raw path. */
function storagePathFromLogoUrl(
  organizationId: string,
  logoUrl: string | null | undefined
): string | null {
  if (!logoUrl?.trim()) return null;
  const trimmed = logoUrl.trim().split("?")[0] ?? "";

  const marker = `/org-logos/`;
  const idx = trimmed.indexOf(marker);
  if (idx >= 0) {
    const path = decodeURIComponent(trimmed.slice(idx + marker.length));
    if (path.startsWith(`${organizationId}/`)) return path;
  }

  if (trimmed.startsWith(`${organizationId}/`)) return trimmed;
  return null;
}

async function respondWithObject(
  admin: ReturnType<typeof createAdminClient>,
  path: string,
  contentType: string
) {
  const { data, error } = await admin.storage.from("org-logos").download(path);
  if (error || !data) return null;

  const buffer = Buffer.from(await data.arrayBuffer());
  if (buffer.byteLength === 0) return null;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "Content-Length": String(buffer.byteLength),
    },
  });
}

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

    const { data: org } = await admin
      .from("organizations")
      .select("logo_url")
      .eq("id", organizationId)
      .maybeSingle();

    const fromDb = storagePathFromLogoUrl(organizationId, org?.logo_url);
    if (fromDb) {
      const response = await respondWithObject(
        admin,
        fromDb,
        contentTypeForPath(fromDb)
      );
      if (response) return response;
    }

    for (const file of CANDIDATES) {
      const response = await respondWithObject(
        admin,
        `${organizationId}/${file.path}`,
        file.type
      );
      if (response) return response;
    }

    // Last resort: list folder and serve the first image-like object
    const { data: listed } = await admin.storage
      .from("org-logos")
      .list(organizationId, { limit: 20 });

    const file = listed?.find((item) =>
      /\.(jpe?g|png|webp|gif|svg)$/i.test(item.name)
    );
    if (file?.name) {
      const path = `${organizationId}/${file.name}`;
      const response = await respondWithObject(
        admin,
        path,
        contentTypeForPath(path)
      );
      if (response) return response;
    }

    return new NextResponse("Not found", { status: 404 });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
