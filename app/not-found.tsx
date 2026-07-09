import { getLocalizedDict } from "@/lib/i18n/server";
import { NotFoundView } from "@/components/auth/not-found-view";

export async function generateMetadata() {
  const dict = await getLocalizedDict();
  return { title: dict.errors.notFoundTitle };
}

export default function NotFoundPage() {
  return (
    <div className="auth-layout">
      <NotFoundView />
    </div>
  );
}
