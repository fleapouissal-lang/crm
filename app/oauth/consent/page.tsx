import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const scopeLabels: Record<string, string> = {
  openid: "Confirm your Fusion Leap identity",
  email: "Read your account email address",
  profile: "Read your basic CRM profile",
};

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const authorizationId = (await searchParams).authorization_id;
  if (!authorizationId) {
    return <ConsentError message="Missing authorization request." />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const nextPath = `/oauth/consent?authorization_id=${encodeURIComponent(
      authorizationId
    )}`;
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: authorization, error } =
    await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (error || !authorization) {
    return <ConsentError message={error?.message ?? "Invalid authorization request."} />;
  }

  if (!("authorization_id" in authorization)) {
    redirect(authorization.redirect_url);
  }

  const scopes = authorization.scope.split(" ").filter(Boolean);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-12 text-[var(--foreground)]">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500 font-bold text-white">
            FL
          </div>
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">Fusion Leap CRM</p>
            <h1 className="text-2xl font-semibold">Connect an AI application</h1>
          </div>
        </div>

        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          <strong className="text-[var(--foreground)]">{authorization.client.name}</strong>{" "}
          wants permission to use your Fusion Leap account. CRM actions will remain
          limited by your organization, role, and row-level security policies.
        </p>

        <div className="my-7 rounded-2xl border border-[var(--border)] p-4">
          <p className="mb-3 text-sm font-medium">Requested permissions</p>
          <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
            {scopes.map((scope) => (
              <li key={scope} className="flex gap-2">
                <span aria-hidden>✓</span>
                <span>{scopeLabels[scope] ?? scope}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mb-7 break-all text-xs text-[var(--muted-foreground)]">
          Redirect destination: {authorization.redirect_uri}
        </p>

        <form action="/api/oauth/decision" method="POST" className="flex gap-3">
          <input type="hidden" name="authorization_id" value={authorizationId} />
          <button
            type="submit"
            name="decision"
            value="approve"
            className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-medium text-white hover:bg-emerald-600"
          >
            Allow access
          </button>
          <button
            type="submit"
            name="decision"
            value="deny"
            className="flex-1 rounded-xl border border-[var(--border)] px-4 py-3 font-medium hover:bg-[var(--muted)]"
          >
            Deny
          </button>
        </form>
      </section>
    </main>
  );
}

function ConsentError({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] p-6">
      <section className="max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8">
        <h1 className="text-xl font-semibold">Authorization unavailable</h1>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">{message}</p>
      </section>
    </main>
  );
}
