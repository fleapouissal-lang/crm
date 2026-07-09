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
      <div className="marketing-page__hero marketing-page__hero--faq">
        <h1>
          {f.title}{" "}
          <span className="marketing-page__accent">{f.titleAccent}</span>
        </h1>
        <p>{f.subtitle}</p>
      </div>
      <FaqList />
    </section>
  );
}
