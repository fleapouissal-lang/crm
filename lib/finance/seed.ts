import type { DocumentTemplate, InvoiceRecord, QuoteRecord } from "./types";

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
    footerNote: "Fusion Leap SARL AU — ICE · RC · IF",
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
    footerNote: "Paiement mensuel à réception de facture",
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
    service: "Site vitrine + SEO",
    amount: 42000,
    currency: "MAD",
    validityDays: 30,
    status: "sent",
    templateId: "tpl-site-web",
    notes: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "q-2",
    number: "DEV-2026-011",
    clientName: "Easy Touch",
    service: "Refonte e-commerce",
    amount: 128000,
    currency: "MAD",
    validityDays: 15,
    status: "draft",
    templateId: "tpl-site-web",
    notes: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "q-3",
    number: "DEV-2026-009",
    clientName: "Natus",
    service: "Maintenance mensuelle",
    amount: 2500,
    currency: "MAD",
    validityDays: 45,
    status: "accepted",
    templateId: "tpl-maintenance",
    notes: "",
    createdAt: now,
    updatedAt: now,
  },
];

export const SEED_INVOICES: InvoiceRecord[] = [
  {
    id: "inv-1",
    number: "FAC-2026-079",
    clientName: "Pixel IT",
    amount: 48000,
    currency: "MAD",
    dueDate: "2026-06-24",
    status: "overdue",
    templateId: "tpl-facture-jalon",
    quoteId: "q-1",
    notes: "Acompte 40%",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "inv-2",
    number: "FAC-2026-076",
    clientName: "Easy Touch",
    amount: 51200,
    currency: "MAD",
    dueDate: "2026-07-15",
    status: "pending",
    templateId: "tpl-facture-jalon",
    quoteId: null,
    notes: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "inv-3",
    number: "FAC-2026-071",
    clientName: "Natus",
    amount: 2500,
    currency: "MAD",
    dueDate: "2026-07-01",
    status: "paid",
    templateId: "tpl-facture-jalon",
    quoteId: "q-3",
    notes: "Mensualité juin",
    createdAt: now,
    updatedAt: now,
  },
];
