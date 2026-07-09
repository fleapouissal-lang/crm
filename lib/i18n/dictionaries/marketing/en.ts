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
    titleAccent: "for every team",
    subtitle:
      "A free account forever to get started, or a 1-month trial on paid plans.",
    trialBadge: "1-month trial",
    freeBadge: "100% free forever",
    priceFree: "Free",
    freeForever: "forever",
    trialNote: "Trial with no credit card · Cancel anytime",
    perMonth: "/ month",
    popular: "Popular",
    cta: "Start free trial",
    ctaFree: "Create free account",
    ctaContact: "Contact sales",
    packs: {
      free: {
        name: "Free",
        price: "0",
        description: "Discover Fusion Leap CRM with no commitment.",
        features: [
          "1 user",
          "Leads & contacts",
          "Basic pipeline",
          "Task kanban",
          "Community support",
        ],
      },
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
    highlights: {
      title: "Why choose Fusion Leap?",
      subtitle: "A CRM platform built for teams that want to perform from day one.",
      items: [
        {
          title: "Security & isolation",
          text: "Encrypted data and isolated CRM workspaces per company, with role-based access.",
        },
        {
          title: "Multi-company (STE)",
          text: "Manage several companies on one platform, each with its own dedicated workspace.",
        },
        {
          title: "Fast onboarding",
          text: "Free account forever or a 1-month trial — up and running in minutes.",
        },
      ],
    },
    comparison: {
      title: "Compare plans",
      subtitle: "All key features, no hidden surprises.",
      featureCol: "Feature",
      rows: [
        {
          label: "Users",
          values: { free: "1", starter: "5", business: "25", enterprise: "Unlimited" },
        },
        {
          label: "Leads & pipeline",
          values: { free: "check", starter: "check", business: "check", enterprise: "check" },
        },
        {
          label: "Quotes & invoices",
          values: { free: "dash", starter: "dash", business: "check", enterprise: "check" },
        },
        {
          label: "Reports & analytics",
          values: { free: "dash", starter: "dash", business: "check", enterprise: "check" },
        },
        {
          label: "Multi-company (STE)",
          values: { free: "dash", starter: "dash", business: "dash", enterprise: "check" },
        },
        {
          label: "Support",
          values: {
            free: "Community",
            starter: "Email",
            business: "Priority",
            enterprise: "Dedicated",
          },
        },
      ],
    },
    bottomCta: {
      title: "Need help choosing?",
      text: "Our team will help you find the plan that fits your structure and goals.",
      button: "Talk to an expert",
    },
  },
  about: {
    metaTitle: "About",
    title: "Fusion Leap,",
    titleAccent: "CRM built to scale",
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
    vision: {
      title: "Our vision",
      text: "We believe a CRM shouldn't be just another tool — it should be the nerve center of commercial growth. Fusion Leap unifies leads, clients, quotes and teams in a seamless experience built for multi-site, multi-country companies.",
    },
    approach: {
      title: "Our approach",
      subtitle: "From design to deployment, we build systems built to last.",
      items: [
        {
          title: "Design with purpose",
          text: "Multi-tenant architecture, isolated STE workspaces and journeys tailored to each business role.",
        },
        {
          title: "Deploy fast",
          text: "Free account or 1-month trial, guided onboarding and go-live in a matter of days.",
        },
        {
          title: "Support long-term",
          text: "Responsive support, continuous product evolution and a dedicated account manager for enterprise.",
        },
      ],
    },
    stats: {
      title: "Fusion Leap in numbers",
      items: [
        { value: "100%", label: "Data isolated per STE" },
        { value: "Multi", label: "Companies on one platform" },
        { value: "24h", label: "Business-day support response" },
        { value: "3", label: "Languages · EN · FR · AR" },
      ],
    },
    bottomCta: {
      title: "Ready to transform your CRM?",
      text: "Explore our pricing or contact us for a personalized demo.",
      primaryButton: "View pricing",
      secondaryButton: "Contact us",
    },
  },
  faq: {
    metaTitle: "FAQ",
    title: "Got questions?",
    titleAccent: "We've got answers",
    subtitle:
      "Everything you need to know about Fusion Leap CRM — trial, pricing, multi-company and support.",
    sidebarTitle: "Browse by category",
    articlesCount: "{count} questions",
    stillQuestion: "Still have questions?",
    stillQuestionDesc:
      "Can't find the answer? Our team replies within one business day.",
    contactCta: "Contact support",
    categories: {
      trial: "Getting started",
      ste: "Multi-company",
      security: "Security",
      billing: "Billing",
      roles: "Roles & access",
      support: "Support",
    },
    items: [
      {
        category: "trial",
        q: "How does the free month work?",
        a: "30 days of full access to your chosen plan, no credit card required. Test the CRM with your real workflows before committing.",
      },
      {
        category: "trial",
        q: "Do I need a credit card for the trial?",
        a: "No. Signup requires no payment method. You only activate a paid subscription if you decide to continue.",
      },
      {
        category: "trial",
        q: "How many users can I invite?",
        a: "Up to your plan limit: 5 on Starter, 25 on Business, unlimited on Enterprise. Ideal for team validation.",
      },
      {
        category: "trial",
        q: "What features are included?",
        a: "All features of your selected plan: pipeline, leads, quotes, invoices, reports and team management.",
      },
      {
        category: "trial",
        q: "Can I import my existing data?",
        a: "Yes. Import your leads and contacts during the trial to test with your real data.",
      },
      {
        category: "trial",
        q: "What happens after 30 days?",
        a: "Continue on the same plan, switch tiers or stop. Your data stays exportable with no automatic charge.",
      },
      {
        category: "trial",
        q: "Can my whole team try it?",
        a: "Yes. Invite sales reps, managers and admins to validate roles, pipeline and workflows together.",
      },
      {
        category: "trial",
        q: "How do I create my account?",
        a: "Click Sign in, enter your work email and choose your plan. Your workspace is ready in minutes.",
      },
      {
        category: "ste",
        q: "Can I manage multiple companies (STE)?",
        a: "Yes. The Enterprise plan lets you create multiple STEs each with an isolated CRM.",
      },
      {
        category: "security",
        q: "Is data isolated between companies?",
        a: "Yes. Each STE has its own space with server-side access rules.",
      },
      {
        category: "billing",
        q: "Can I change plans anytime?",
        a: "Yes. Upgrades apply immediately with pro-rated billing. Downgrades at next renewal.",
      },
      {
        category: "roles",
        q: "How do roles and permissions work?",
        a: "Directors and managers access finance. Other profiles see only their modules — configurable per STE.",
      },
      {
        category: "support",
        q: "How do I contact support?",
        a: "Via the Contact page or at contact@fusionleap.com. We reply within one business day.",
      },
    ],
  },
  contact: {
    metaTitle: "Contact",
    title: "Let's build something",
    titleAccent: "amazing together",
    touchDesc:
      "Questions about Fusion Leap CRM, a project idea or a demo — our team is ready to help.",
    nameLabel: "Full name",
    namePlaceholder: "Enter your full name",
    locationLabel: "Location",
    locationPlaceholder: "Where are you located?",
    emailFieldLabel: "Email",
    emailPlaceholder: "Enter your email address",
    phoneFieldLabel: "Phone number",
    phonePlaceholder: "Your phone number",
    projectLabel: "Project name",
    projectPlaceholder: "What's your project called?",
    messageLabel: "Message",
    messagePlaceholder: "Write your message here...",
    send: "Send",
    emailLabel: "Email",
    emailValue: "contact@fusionleap.com",
    phoneLabel: "Phone",
    phoneValue: "+212 522 00 00 00",
    addressLabel: "Address",
    addressValue: "Casablanca, Morocco",
    mapLabel: "Find us",
  },
  footer: {
    rights: "All rights reserved.",
  },
};
