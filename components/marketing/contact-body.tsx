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
    <div className="marketing-faq-card marketing-contact-card">
      <div className="marketing-faq marketing-contact-layout">
        <aside className="marketing-faq__sidebar marketing-contact-layout__sidebar">
          <h2 className="marketing-faq__sidebar-title">{c.sidebarTitle}</h2>
          <p className="marketing-contact-layout__intro">{c.sidebarIntro}</p>

          <ul className="marketing-contact-layout__details">
            {details.map(({ icon: Icon, label, value, href }) => (
              <li key={label}>
                <div className="marketing-contact-layout__detail">
                  <span className="marketing-faq__category-icon" aria-hidden>
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <div className="marketing-contact-layout__detail-text">
                    <p className="marketing-contact-layout__detail-label">{label}</p>
                    {href ? (
                      <Link href={href} className="marketing-contact-layout__detail-value">
                        {value}
                      </Link>
                    ) : (
                      <p className="marketing-contact-layout__detail-value">{value}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <div className="marketing-faq__main marketing-contact-layout__main">
          <h2 className="marketing-contact-layout__form-title">{c.formTitle}</h2>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
