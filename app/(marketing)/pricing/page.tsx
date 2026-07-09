import { getLocalizedDict } from "@/lib/i18n/server";
import { PricingCards } from "@/components/marketing/pricing-cards";

export async function generateMetadata() {
  const dict = await getLocalizedDict();
  return { title: dict.marketing.pricing.metaTitle };
}

export default async function PricingPage() {
  const dict = await getLocalizedDict();
  const p = dict.marketing.pricing;

  return (
    <section className="marketing-page marketing-page--pricing">
      <div className="marketing-page__hero">
        <span className="marketing-page__pill">{p.trialBadge}</span>
        <h1>
          {p.title} <span className="marketing-page__accent">{p.titleAccent}</span>
        </h1>
        <p>{p.subtitle}</p>
        <p className="marketing-page__note">{p.trialNote}</p>
      </div>
      <PricingCards />
    </section>
  );
}
