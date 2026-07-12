import { getLocalizedDict } from "@/lib/i18n/server";
import { ContactBody } from "@/components/marketing/contact-body";

export async function generateMetadata() {
  const dict = await getLocalizedDict();
  return { title: dict.marketing.contact.metaTitle };
}

export default async function ContactPage() {
  const dict = await getLocalizedDict();
  const c = dict.marketing.contact;

  return (
    <section className="marketing-page marketing-page--contact">
      <div className="marketing-page__hero marketing-page__hero--faq">
        <h1>
          {c.title}{" "}
          <span className="marketing-page__accent">{c.titleAccent}</span>
        </h1>
        <p>{c.touchDesc}</p>
      </div>

      <ContactBody />
    </section>
  );
}
