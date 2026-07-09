import { getLocalizedDict } from "@/lib/i18n/server";

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
        <h1>{a.title}</h1>
        <p className="marketing-page__tagline">{a.subtitle}</p>
        <p className="marketing-page__intro">{a.intro}</p>
      </div>

      <div className="marketing-about__block">
        <h2>{a.missionTitle}</h2>
        <p>{a.mission}</p>
      </div>

      <div className="marketing-about__values">
        <h2>{a.valuesTitle}</h2>
        <div className="marketing-about__grid">
          {a.values.map((value) => (
            <article key={value.title} className="marketing-about__card">
              <h3>{value.title}</h3>
              <p>{value.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
