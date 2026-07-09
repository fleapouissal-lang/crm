import { getLocalizedDict } from "@/lib/i18n/server";
import { ContactForm } from "@/components/marketing/contact-form";

export async function generateMetadata() {
  const dict = await getLocalizedDict();
  return { title: dict.marketing.contact.metaTitle };
}

export default async function ContactPage() {
  const dict = await getLocalizedDict();
  const c = dict.marketing.contact;

  return (
    <section className="marketing-page marketing-page--contact">
      <div className="marketing-page__hero">
        <h1>{c.title}</h1>
        <p>{c.subtitle}</p>
      </div>

      <div className="marketing-contact__layout">
        <ContactForm />

        <aside className="marketing-contact__info">
          <h2>{c.infoTitle}</h2>
          <div className="marketing-contact__info-block">
            <span>{c.emailLabel}</span>
            <a href={`mailto:${c.emailValue}`}>{c.emailValue}</a>
          </div>
          <div className="marketing-contact__info-block">
            <span>{c.hoursTitle}</span>
            <p>{c.hoursValue}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
