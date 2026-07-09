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
    const email = String(data.get("email") ?? "");
    const company = String(data.get("company") ?? "");
    const message = String(data.get("message") ?? "");

    const subject = encodeURIComponent(`Contact Fusion Leap — ${company || name}`);
    const body = encodeURIComponent(
      `Nom: ${name}\nEmail: ${email}\nEntreprise: ${company}\n\n${message}`
    );

    window.location.href = `mailto:${c.emailValue}?subject=${subject}&body=${body}`;
    toast.success(c.send);
    form.reset();
    setPending(false);
  }

  return (
    <form className="marketing-contact__form" onSubmit={handleSubmit}>
      <div className="marketing-contact__field">
        <label htmlFor="contact-name">{c.name}</label>
        <input id="contact-name" name="name" required autoComplete="name" />
      </div>
      <div className="marketing-contact__field">
        <label htmlFor="contact-email">{c.email}</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div className="marketing-contact__field">
        <label htmlFor="contact-company">{c.company}</label>
        <input id="contact-company" name="company" autoComplete="organization" />
      </div>
      <div className="marketing-contact__field">
        <label htmlFor="contact-message">{c.message}</label>
        <textarea id="contact-message" name="message" rows={5} required />
      </div>
      <button type="submit" className="marketing-contact__submit" disabled={pending}>
        {c.send}
      </button>
    </form>
  );
}
