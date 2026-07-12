"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { ContactForm } from "@/components/marketing/contact-form";

const DETAIL_ICONS = [Mail, Phone, MapPin] as const;

export function ContactBody() {
  const c = useDict().marketing.contact;

  const details = [
    {
      icon: DETAIL_ICONS[0],
      label: c.emailLabel,
      value: c.emailValue,
      href: `mailto:${c.emailValue}`,
    },
    {
      icon: DETAIL_ICONS[1],
      label: c.phoneLabel,
      value: c.phoneValue,
      href: `tel:${c.phoneValue.replace(/\s/g, "")}`,
    },
    {
      icon: DETAIL_ICONS[2],
      label: c.addressLabel,
      value: c.addressValue,
      href: undefined,
    },
  ] as const;

  return (
    <div className="marketing-contact-panel">
      <aside className="marketing-contact-panel__aside">
        <div className="marketing-contact-panel__aside-top">
          <h2>{c.sidebarTitle}</h2>
          <p>{c.sidebarIntro}</p>
        </div>

        <ul className="marketing-contact-panel__list">
          {details.map(({ icon: Icon, label, value, href }) => (
            <li key={label}>
              {href ? (
                <Link href={href} className="marketing-contact-panel__row">
                  <span className="marketing-contact-panel__icon" aria-hidden>
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <span className="marketing-contact-panel__meta">
                    <span className="marketing-contact-panel__label">{label}</span>
                    <span className="marketing-contact-panel__value">{value}</span>
                  </span>
                </Link>
              ) : (
                <div className="marketing-contact-panel__row">
                  <span className="marketing-contact-panel__icon" aria-hidden>
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <span className="marketing-contact-panel__meta">
                    <span className="marketing-contact-panel__label">{label}</span>
                    <span className="marketing-contact-panel__value">{value}</span>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </aside>

      <div className="marketing-contact-panel__form">
        <ContactForm />
      </div>
    </div>
  );
}
