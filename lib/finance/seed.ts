import type {
  DocumentTemplate,
  ExpenseRecord,
  InvoiceRecord,
  QuoteRecord,
} from "./types";

const now = new Date().toISOString();

export const SEED_TEMPLATES: DocumentTemplate[] = [
  {
    id: "tpl-site-web",
    name: "Devis site web",
    kind: "quote",
    description: "Prestation site vitrine / e-commerce par phases",
    content: `DEVIS N° {{numero}}
Client : {{client}}
Prestation : {{prestation}}

Phase 1 — Discovery & UX/UI
Phase 2 — Développement
Phase 3 — Mise en ligne & formation

Montant total : {{montant}} {{devise}}
Validité : {{validite}} jours
Acompte à la signature : 40%`,
    footerNote: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "tpl-maintenance",
    name: "Devis maintenance",
    kind: "quote",
    description: "Abonnement maintenance & hébergement mensuel",
    content: `DEVIS MAINTENANCE
Client : {{client}}
Forfait mensuel : {{montant}} {{devise}}

Inclus : mises à jour, sauvegardes, support email
Hors scope : nouvelles fonctionnalités`,
    footerNote: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "tpl-facture-jalon",
    name: "Facture jalon",
    kind: "invoice",
    description: "Facture acompte ou jalon projet",
    content: `FACTURE N° {{numero}}
Client : {{client}}
Prestation : {{prestation}}

Montant TTC : {{montant}} {{devise}}
Échéance : {{echeance}}

IBAN : {{iban}}`,
    footerNote: "Merci pour votre confiance",
    createdAt: now,
    updatedAt: now,
  },
];

export const SEED_QUOTES: QuoteRecord[] = [
  {
    id: "q-1",
    number: "DEV-2026-014",
    clientName: "Pixel IT",
    clientType: "pro",
    service: "Site vitrine, SEO technique",
    amount: 42000,
    currency: "MAD",
    validityDays: 30,
    status: "sent",
    templateId: "tpl-site-web",
    notes: "",
    items: [
      {
        id: "li-q1-1",
        description: "Site vitrine",
        quantity: 1,
        unitPriceTtc: 32000,
      },
      {
        id: "li-q1-2",
        description: "SEO technique",
        quantity: 1,
        unitPriceTtc: 10000,
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "q-2",
    number: "DEV-2026-011",
    clientName: "Easy Touch",
    clientType: "pro",
    service: "Refonte e-commerce",
    amount: 128000,
    currency: "MAD",
    validityDays: 15,
    status: "draft",
    templateId: "tpl-site-web",
    notes: "",
    items: [
      {
        id: "li-q2-1",
        description: "Refonte e-commerce",
        quantity: 1,
        unitPriceTtc: 128000,
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "q-3",
    number: "DEV-2026-009",
    clientName: "Natus",
    clientType: "particulier",
    service: "Maintenance mensuelle",
    amount: 2500,
    currency: "MAD",
    validityDays: 45,
    status: "accepted",
    templateId: "tpl-maintenance",
    notes: "",
    items: [
      {
        id: "li-q3-1",
        description: "Maintenance mensuelle",
        quantity: 1,
        unitPriceTtc: 2500,
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
];

export const SEED_INVOICES: InvoiceRecord[] = [
  {
    id: "inv-1",
    number: "FAC-2026-079",
    clientName: "Pixel IT",
    clientType: "pro",
    amount: 16800,
    currency: "MAD",
    dueDate: "2026-06-24",
    status: "overdue",
    templateId: "tpl-facture-jalon",
    quoteId: "q-1",
    notes: "Acompte 40%",
    items: [
      {
        id: "li-inv1-1",
        description: "Acompte 40% — Site vitrine + SEO",
        quantity: 1,
        unitPriceTtc: 16800,
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "inv-2",
    number: "FAC-2026-076",
    clientName: "Easy Touch",
    clientType: "pro",
    amount: 51200,
    currency: "MAD",
    dueDate: "2026-07-15",
    status: "pending",
    templateId: "tpl-facture-jalon",
    quoteId: null,
    notes: "",
    items: [
      {
        id: "li-inv2-1",
        description: "Jalon développement",
        quantity: 1,
        unitPriceTtc: 51200,
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "inv-3",
    number: "FAC-2026-071",
    clientName: "Natus",
    clientType: "particulier",
    amount: 2500,
    currency: "MAD",
    dueDate: "2026-07-01",
    status: "paid",
    templateId: "tpl-facture-jalon",
    quoteId: "q-3",
    notes: "Mensualité juin",
    items: [
      {
        id: "li-inv3-1",
        description: "Mensualité juin — Maintenance",
        quantity: 1,
        unitPriceTtc: 2500,
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
];

export const SEED_EXPENSES: ExpenseRecord[] = [
  {
    id: "exp-1",
    number: "DEP-2026-001",
    title: "Loyer bureaux — juillet",
    category: "rent",
    vendor: "Immobilière Atlas",
    amount: 18500,
    currency: "MAD",
    date: "2026-07-01",
    status: "paid",
    notes: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "exp-2",
    number: "DEP-2026-002",
    title: "Abonnements SaaS (Figma, Notion)",
    category: "software",
    vendor: "Divers",
    amount: 2400,
    currency: "MAD",
    date: "2026-07-05",
    status: "paid",
    notes: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "exp-3",
    number: "DEP-2026-003",
    title: "Campagne Meta Ads",
    category: "marketing",
    vendor: "Meta",
    amount: 6500,
    currency: "MAD",
    date: "2026-07-12",
    status: "pending",
    notes: "Lead gen Q3",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "exp-4",
    number: "DEP-2026-004",
    title: "Déplacement client Casablanca",
    category: "travel",
    vendor: "ONCF / Taxi",
    amount: 820,
    currency: "MAD",
    date: "2026-07-15",
    status: "draft",
    notes: "",
    createdAt: now,
    updatedAt: now,
  },
];
