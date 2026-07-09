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
      <ContactBody />

      <div className="marketing-contact-map" aria-label={c.mapLabel}>
        <iframe
          title={c.mapLabel}
          className="marketing-contact-map__frame"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src="https://www.openstreetmap.org/export/embed.html?bbox=-7.6500%2C33.5600%2C-7.5800%2C33.6000&layer=mapnik&marker=33.5731%2C-7.5898"
        />
      </div>
    </section>
  );
}
