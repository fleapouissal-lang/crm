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
    subtitle:
      "The essentials about Fusion Leap CRM — trial, pricing, multi-company and support.",
    contactPrompt: "Can't find your answer?",
    contactLink: "Contact us",
    items: [
      {
        q: "How does the free month work?",
        a: "30 days of full access to your chosen plan, no credit card required. When it ends, continue, switch plans or stop — your data stays exportable.",
      },
      {
        q: "Can I manage multiple companies (STE)?",
        a: "Yes. The Enterprise plan lets you create multiple STEs (Fusion Leap, Autolog, etc.) each with an isolated CRM: separate leads, clients, quotes and teams.",
      },
      {
        q: "Is data isolated between companies?",
        a: "Yes. Each STE has its own space with server-side access rules. Users only see data from their organization.",
      },
      {
        q: "Can I change plans anytime?",
        a: "Yes. Upgrades apply immediately with pro-rated billing. Downgrades take effect at the next renewal. Monthly pricing, no hidden fees.",
      },
      {
        q: "How do roles and permissions work?",
        a: "Directors and managers access finance and admin. Sales, dev and other profiles see only their assigned modules — configurable per STE.",
      },
      {
        q: "How do I contact support?",
        a: "Via the Contact page or at contact@fusionleap.com. We reply within one business day. Guided demos and custom quotes available.",
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
