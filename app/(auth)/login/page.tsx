import { getLocalizedDict } from "@/lib/i18n/server";
import { LoginForm } from "@/components/auth/login-form";

export async function generateMetadata() {
  const dict = await getLocalizedDict();
  return { title: dict.auth.login };
}

export default function LoginPage() {
  return <LoginForm />;
}
