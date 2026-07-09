import { getLocalizedDict } from "@/lib/i18n/server";
import { FaqList } from "@/components/marketing/faq-list";

export async function generateMetadata() {
  const dict = await getLocalizedDict();
  return { title: dict.marketing.faq.metaTitle };
}

export default async function FaqPage() {
  const dict = await getLocalizedDict();
  const f = dict.marketing.faq;

  return (
    <section className="marketing-page marketing-page--faq">
      <div className="marketing-page__hero">
        <h1>{f.title}</h1>
        <p>{f.subtitle}</p>
      </div>
      <FaqList />
    </section>
  );
}
