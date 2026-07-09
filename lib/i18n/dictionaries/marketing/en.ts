import type { MarketingDictionary } from "./fr";

export const marketingEn: MarketingDictionary = {
  nav: {
    pricing: "Pricing",
    about: "About",
    faq: "FAQ",
    contact: "Contact",
    login: "Sign in",
    signup: "Get started",
  },
  pricing: {
    metaTitle: "Pricing",
    title: "Simple pricing,",
    titleAccent: "1 month free",
    subtitle:
      "Try Fusion Leap CRM free for 30 days. Then pick the plan that fits your team.",
    trialBadge: "1 month free",
    trialNote: "No credit card · Cancel anytime",
    perMonth: "/ month",
    popular: "Popular",
    cta: "Start free trial",
    ctaContact: "Contact sales",
    packs: {
      starter: {
        name: "Starter",
        price: "29",
        description: "For small teams getting started.",
        features: [
          "Up to 5 users",
          "Leads & pipeline",
          "Clients & contacts",
          "Task kanban",
          "Email support",
        ],
      },
      business: {
        name: "Business",
        price: "79",
        description: "For growing sales teams.",
        features: [
          "Up to 25 users",
          "Everything in Starter +",
          "Quotes & invoices",
          "Reports & analytics",
          "Roles & permissions",
          "Priority support",
        ],
      },
      enterprise: {
        name: "Enterprise",
        price: "149",
        description: "Multi-company, governance & scale.",
        features: [
          "Unlimited users",
          "Everything in Business +",
          "Multi-company (STE)",
          "Isolated CRM per company",
          "Global administration",
          "Dedicated account manager",
        ],
      },
    },
  },
  about: {
    metaTitle: "About",
    title: "Fusion Leap",
    subtitle: "Intelligent Systems. Limitless Impact.",
    intro:
      "Fusion Leap builds intelligent systems for companies that need a modern, multi-tenant CRM built for growth.",
    missionTitle: "Our mission",
    mission:
      "Give every company a dedicated, secure, elegant CRM workspace — on one global platform.",
    valuesTitle: "What sets us apart",
    values: [
      {
        title: "Multi-company",
        text: "Fusion Leap, Autolog and each STE gets its own isolated CRM universe.",
      },
      {
        title: "Role-based access",
        text: "Director, manager, sales, dev — everyone sees what they need.",
      },
      {
        title: "Premium design",
        text: "A polished, fast experience built for the field.",
      },
    ],
  },
  faq: {
    metaTitle: "FAQ",
    title: "Frequently asked questions",
    subtitle: "Everything you need to know before you start.",
    items: [
      {
        q: "How does the free month work?",
        a: "You get full access to your chosen plan for 30 days with no commitment. No credit card required to start.",
      },
      {
        q: "Can I manage multiple companies (STE)?",
        a: "Yes. The Enterprise plan lets a global admin create and manage multiple STEs, each with an isolated CRM.",
      },
      {
        q: "Is data separated per company?",
        a: "Yes. Each STE has its own workspace. Users only see their company's data.",
      },
      {
        q: "Can I change plans later?",
        a: "Yes. Upgrade or downgrade anytime. Billing adjusts pro-rata.",
      },
      {
        q: "Who can access finance (quotes/invoices)?",
        a: "By default, Director and Manager. Other roles see only what matches their job.",
      },
      {
        q: "How do I reach support?",
        a: "Use the Contact page or email contact@fusionleap.com. Business and Enterprise get priority support.",
      },
    ],
  },
  contact: {
    metaTitle: "Contact",
    title: "Get in touch",
    subtitle: "Questions, demo or custom quote — we reply within 24 hours.",
    name: "Full name",
    email: "Work email",
    company: "Company",
    message: "Message",
    send: "Send message",
    infoTitle: "Contact details",
    emailLabel: "Email",
    emailValue: "contact@fusionleap.com",
    hoursTitle: "Hours",
    hoursValue: "Mon – Fri, 9 AM – 6 PM (GMT+1)",
  },
  footer: {
    rights: "All rights reserved.",
  },
};
