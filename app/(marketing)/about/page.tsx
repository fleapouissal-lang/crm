import { getLocalizedDict } from "@/lib/i18n/server";
import { AboutSections } from "@/components/marketing/about-sections";

export async function generateMetadata() {
  const dict = await getLocalizedDict();
  return { title: dict.marketing.about.metaTitle };
}

export default async function AboutPage() {
  const dict = await getLocalizedDict();
  const a = dict.marketing.about;

  return (
    <section className="marketing-page marketing-page--about">
      <div className="marketing-page__hero">
        <h1>
          {a.title} <span className="marketing-page__accent">{a.titleAccent}</span>
        </h1>
        <p className="marketing-page__tagline">{a.subtitle}</p>
        <p className="marketing-page__intro">{a.intro}</p>
      </div>

      <AboutSections />
    </section>
  );
}
