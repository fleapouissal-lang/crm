"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";

export function ContactForm() {
  const c = useDict().marketing.contact;
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);

    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "");
    const location = String(data.get("location") ?? "");
    const email = String(data.get("email") ?? "");
    const phone = String(data.get("phone") ?? "");
    const project = String(data.get("project") ?? "");
    const message = String(data.get("message") ?? "");

    const subject = encodeURIComponent(
      project ? `Contact Fusion Leap — ${project}` : `Contact Fusion Leap — ${name}`
    );
    const body = encodeURIComponent(
      `Nom: ${name}\nLocalisation: ${location}\nEmail: ${email}\nTéléphone: ${phone}\nProjet: ${project}\n\n${message}`
    );

    window.location.href = `mailto:${c.emailValue}?subject=${subject}&body=${body}`;
    toast.success(c.send);
    form.reset();
    setPending(false);
  }

  return (
    <form className="marketing-contact-form" onSubmit={handleSubmit}>
      <div className="marketing-contact-form__row marketing-contact-form__row--2">
        <div className="marketing-contact-form__field">
          <label htmlFor="contact-name">{c.nameLabel}</label>
          <input
            id="contact-name"
            name="name"
            placeholder={c.namePlaceholder}
            required
            autoComplete="name"
          />
        </div>
        <div className="marketing-contact-form__field">
          <label htmlFor="contact-location">{c.locationLabel}</label>
          <input
            id="contact-location"
            name="location"
            placeholder={c.locationPlaceholder}
            autoComplete="address-level2"
          />
        </div>
      </div>

      <div className="marketing-contact-form__row marketing-contact-form__row--2">
        <div className="marketing-contact-form__field">
          <label htmlFor="contact-email">{c.emailFieldLabel}</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            placeholder={c.emailPlaceholder}
            required
            autoComplete="email"
          />
        </div>
        <div className="marketing-contact-form__field">
          <label htmlFor="contact-phone">{c.phoneFieldLabel}</label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            placeholder={c.phonePlaceholder}
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="marketing-contact-form__field">
        <label htmlFor="contact-project">{c.projectLabel}</label>
        <input
          id="contact-project"
          name="project"
          placeholder={c.projectPlaceholder}
          autoComplete="off"
        />
      </div>

      <div className="marketing-contact-form__field">
        <label htmlFor="contact-message">{c.messageLabel}</label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          placeholder={c.messagePlaceholder}
          required
        />
      </div>

      <button type="submit" className="marketing-contact-form__submit" disabled={pending}>
        {c.send}
      </button>
    </form>
  );
}
