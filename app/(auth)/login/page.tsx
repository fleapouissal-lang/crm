import { getLocalizedDict } from "@/lib/i18n/server";
import { LoginForm } from "@/components/auth/login-form";

export async function generateMetadata() {
  const dict = await getLocalizedDict();
  return { title: dict.auth.login };
}

function safeNextPath(value: string | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const nextPath = safeNextPath((await searchParams).next);
  return <LoginForm nextPath={nextPath} />;
}
