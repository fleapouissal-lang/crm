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
      value: c.emailValue,
      href: `mailto:${c.emailValue}`,
    },
    {
      icon: DETAIL_ICONS[1],
      value: c.phoneValue,
      href: `tel:${c.phoneValue.replace(/\s/g, "")}`,
    },
    {
      icon: DETAIL_ICONS[2],
      value: c.addressValue,
      href: undefined,
    },
  ] as const;

  return (
    <div className="marketing-contact-card">
      <div className="marketing-contact-card__info">
        <h1 className="marketing-contact-card__title">
          {c.title}{" "}
          <span className="marketing-page__accent">{c.titleAccent}</span>
        </h1>
        <p className="marketing-contact-card__desc">{c.touchDesc}</p>

        <ul className="marketing-contact-card__details">
          {details.map(({ icon: Icon, value, href }) => (
            <li key={value}>
              <span className="marketing-contact-card__icon" aria-hidden>
                <Icon size={20} strokeWidth={2} />
              </span>
              {href ? (
                <Link href={href} className="marketing-contact-card__link">
                  {value}
                </Link>
              ) : (
                <span className="marketing-contact-card__link">{value}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <ContactForm />
    </div>
  );
}
