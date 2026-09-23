import type { SalesStatus } from "@/types/database";

export const SALES_STATUSES: SalesStatus[] = [
  "new",
  "contacted",
  "message_sent",
  "reply_received",
  "qualified",
  "discussion",
  "meeting_proposed",
  "meeting_confirmed",
  "proposal_sent",
  "won",
  "lost",
  "follow_up",
];

export const SALES_STATUS_LABELS: Record<SalesStatus, { fr: string; en: string }> = {
  new: { fr: "Nouveau", en: "New" },
  contacted: { fr: "Contacté", en: "Contacted" },
  message_sent: { fr: "Message envoyé", en: "Message sent" },
  reply_received: { fr: "Réponse reçue", en: "Reply received" },
  qualified: { fr: "Prospect qualifié", en: "Qualified" },
  discussion: { fr: "Discussion en cours", en: "Discussion" },
  meeting_proposed: { fr: "Rendez-vous proposé", en: "Meeting proposed" },
  meeting_confirmed: { fr: "Rendez-vous confirmé", en: "Meeting confirmed" },
  proposal_sent: { fr: "Proposition envoyée", en: "Proposal sent" },
  won: { fr: "Client gagné", en: "Won" },
  lost: { fr: "Client perdu", en: "Lost" },
  follow_up: { fr: "À relancer", en: "Follow up" },
};

export const OBJECTION_PLAYBOOK = [
  "Cher / غالي : proposer un MVP (vitrine ou process simple), paiement en 2-3 fois, ou périmètre réduit. Ne jamais inventer un prix ni envoyer devis.",
  "Pas le temps : proposer un RDV de 15-20 min ou un message récap, pas un atelier long.",
  "J’ai déjà un prestataire / un développeur : proposer audit, complément (automatisation, CRM, maintenance) ou second avis, jamais dénigrer.",
  "Envoyez un prix / شحال الثمن : JAMAIS de devis ni facture ni montant. Dire que ça dépend du besoin, puis proposer (1) qu’il envoie un cahier des charges / brief, OU (2) un RDV court pour cadrer.",
  "Je vais réfléchir / نفكّر : valider, donner une date de rappel douce + un exemple concret, pas de pression.",
  "On n’a pas de budget : proposer phase 1 minimale, ou reporter clairement. Ne pas forcer.",
  "C’est urgent : cadrer le livrable minimum et une date réaliste, pas promettre l’impossible.",
  "On veut juste un site pas cher : expliquer vitrine vs e-com vs app, puis proposer brief ou RDV — sans chiffre.",
];

/** Fourchettes indicatives MAD (HT) — jamais un prix exact inventé. */
export type CatalogPack = {
  id: string;
  name: string;
  includes: string;
  fromMad: number;
  toMad: number;
  delay: string;
};

export const SERVICE_CATALOG: CatalogPack[] = [
  {
    id: "vitrine",
    name: "Site vitrine",
    includes: "5–8 pages, responsive, formulaire contact, SEO de base",
    fromMad: 4000,
    toMad: 12000,
    delay: "2–4 semaines",
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    includes: "catalogue, panier, paiement, livraison, admin",
    fromMad: 15000,
    toMad: 45000,
    delay: "4–8 semaines",
  },
  {
    id: "crm",
    name: "CRM / outil métier",
    includes: "pipeline, contacts, relances, droits, tableaux de bord",
    fromMad: 20000,
    toMad: 80000,
    delay: "6–12 semaines",
  },
  {
    id: "app",
    name: "Application web / mobile",
    includes: "MVP fonctionnel, auth, écrans clés, API",
    fromMad: 25000,
    toMad: 120000,
    delay: "8–16 semaines",
  },
  {
    id: "automation",
    name: "Automatisation WhatsApp / workflows",
    includes: "relances, notifications, intégrations légères",
    fromMad: 5000,
    toMad: 25000,
    delay: "1–4 semaines",
  },
  {
    id: "maintenance",
    name: "Maintenance / hébergement",
    includes: "suivis, sauvegardes, petites évolutions",
    fromMad: 800,
    toMad: 3500,
    delay: "mensuel",
  },
];

export function formatServiceCatalog(): string {
  return SERVICE_CATALOG.map(
    (p) =>
      `- ${p.name} (${p.fromMad.toLocaleString("fr-FR")}–${p.toMad.toLocaleString("fr-FR")} MAD) : ${p.includes}. Délai typique: ${p.delay}.`
  ).join("\n");
}

/** Slang darija / franco-arabe commercial → sens IT. */
export const DARIJA_GLOSSARY: Array<{ term: string; meaning: string }> = [
  { term: "لاباج / lpage / la page", meaning: "site web / page d’accueil" },
  { term: "صونيك / sonic / soniq", meaning: "souvent « site » (déformation)" },
  { term: "أبليكاسيون / appli", meaning: "application mobile ou web" },
  { term: "ستوك / stock", meaning: "stock / inventaire (souvent e-com ou gestion)" },
  { term: "فين / fin / foin / wen / wayn kaynin", meaning: "où êtes-vous / où se trouve → répondre clairement (ville / remote Maroc), PAS clarify" },
  { term: "ina ville / quelle ville", meaning: "quelle ville → dire où on est basé + demander leur ville si besoin" },
  { term: "كلي / kli / client", meaning: "client / prospect" },
  { term: "تسبيق / tasbiq", meaning: "acompte / avance" },
  { term: "فواتير / factures", meaning: "facturation / module finance" },
  { term: "الكاشي / caisse", meaning: "caisse / POS" },
  { term: "الريزو / réseau", meaning: "réseaux sociaux / présence en ligne" },
  { term: "إنستا / insta", meaning: "Instagram" },
  { term: "بوسط / boost", meaning: "publicité / ads" },
  { term: "لوقو / logo", meaning: "identité visuelle (hors scope IT pur → proposer ou handoff design)" },
  { term: "دومين / domaine", meaning: "nom de domaine" },
  { term: "هوست / host", meaning: "hébergement" },
  { term: "باك أوب / backup", meaning: "sauvegarde" },
  { term: "سيستم / système", meaning: "logiciel métier / CRM / ERP léger" },
  { term: "أتوماتيك / automatique", meaning: "automatisation / bots WhatsApp" },
  { term: "شحال الثمن / chhal tteman", meaning: "demande de prix → JAMAIS devis/facture : dire حسب الحاجة + cahier des charges ou RDV" },
  { term: "نْفكّر / nfakker", meaning: "je réfléchis → objection douce" },
  { term: "غالي / ghali", meaning: "trop cher → MVP / phases" },
  { term: "عاجل / 3ajil", meaning: "urgent → cadrer livrable min" },
  { term: "عندي مطور / 3ndi developpeur", meaning: "déjà un dev → audit / complément" },
];

export function formatDarijaGlossary(): string {
  return DARIJA_GLOSSARY.map((g) => `- ${g.term} → ${g.meaning}`).join("\n");
}

export type ProjectPlaybook = {
  offer?: string;
  price_notes?: string;
  tone?: string;
  faq?: string[];
  services?: string[];
  value_props?: string[];
};

export const DEFAULT_PLAYBOOKS: Record<string, ProjectPlaybook> = {
  "Fusion Leap": {
    offer:
      "Agence IT Fusion Leap : on couvre tout ce qui touche à l’informatique et au digital pour entreprises et commerces (Maroc & international).",
    price_notes:
      "INTERDIT d’envoyer devis, facture ou montant WhatsApp. Le prix dépend du besoin : demander un cahier des charges / brief, ou proposer un RDV de cadrage. Un humain enverra le devis après.",
    tone:
      "Commercial IT patient et clair : écoute d’abord, explique simplement, négocie proprement, sans jargon inutile.",
    services: [
      "Sites web & e-commerce",
      "Applications web / mobile",
      "CRM & outils métier",
      "Automatisation (WhatsApp, emails, workflows)",
      "Intégrations API / systèmes",
      "Logiciels sur mesure",
      "Hébergement, maintenance, support",
      "SEO / présence digitale",
      "Dashboards & reporting",
      "Transformation digitale / conseil IT",
      "Tout projet lié à l’IT / informatique",
    ],
    value_props: [
      "On fait (presque) tout ce qui est IT : du site simple au système métier",
      "On écoute le besoin puis on propose la bonne solution",
      "Accompagnement humain + livraison concrète",
      "Adapté PME, commerces et équipes locales",
    ],
    faq: [
      "Oui : site, app, CRM, automatisation, intégrations, maintenance — tout ce qui est informatique.",
      "Le tarif dépend de votre besoin — on cadre via cahier des charges ou RDV, puis devis humain.",
      "On peut démarrer petit (MVP / pilote) puis élargir.",
      "Délais et budget se clarifient ensemble après le brief.",
    ],
  },
  Autolog: {
    offer: "Solutions flotte, location et gestion automobile.",
    price_notes:
      "Pas de devis auto. Tarif selon besoin → brief ou RDV.",
    tone: "Commercial terrain, concret, orienté résultats.",
    services: ["Flotte", "Location", "Suivi véhicules"],
    value_props: ["Gain de temps", "Visibilité parc", "Support local"],
    faq: ["On peut démarrer par un pilote sur quelques véhicules."],
  },
  Evana: {
    offer:
      "Evana — immobilier : accompagnement digital et outils pour agences, promoteurs et locations.",
    price_notes:
      "Pas de devis auto. Tarif selon besoin → brief ou RDV.",
    tone: "Commercial immobilier clair, orienté terrain Maroc.",
    services: [
      "Sites agence immobilière",
      "Annonces / vitrine biens",
      "CRM immobilier",
      "Portails location / vente",
    ],
    value_props: ["Visibilité des biens", "Suivi prospects", "Outils métier immo"],
    faq: ["On adapte au volume d’annonces et au process de l’agence."],
  },
};

/** Cibles de prospection web par projet commercial. */
export type DiscoverProfile = {
  cities: string[];
  sectors: string[];
  /** Extra query suffixes to bias results toward the project offer */
  queryHints: string[];
};

export const PROJECT_DISCOVER_PROFILES: Record<string, DiscoverProfile> = {
  "Fusion Leap": {
    cities: ["Casablanca", "Rabat", "Marrakech", "Tanger", "Fès", "Agadir"],
    sectors: [
      "PME digitale",
      "commerce sans site web",
      "startup Maroc",
      "cabinet comptable",
      "clinique privée",
      "école privée",
      "usine industrie",
      "agence marketing",
    ],
    queryHints: ["site web", "CRM", "digitalisation", "informatique"],
  },
  Autolog: {
    cities: ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès"],
    sectors: [
      "location de voitures",
      "agence de location véhicules",
      "flotte entreprise",
      "transport logistique",
      "garage automobile",
      "société de transport",
      "livraison course",
      "autopartage",
    ],
    queryHints: ["flotte", "parc auto", "location voiture Maroc"],
  },
  Evana: {
    cities: ["Casablanca", "Rabat", "Marrakech", "Tanger", "Fès", "Agadir"],
    sectors: [
      "agence immobiliere",
      "promoteur immobilier",
      "syndic immobilier",
      "location appartements",
      "vente villas",
      "immobilier neuf",
      "transaction immobiliere",
    ],
    queryHints: ["immobilier Maroc", "annonces immobilieres", "agence immo"],
  },
};

export function discoverProfileForProject(project: string): DiscoverProfile {
  return (
    PROJECT_DISCOVER_PROFILES[project] ||
    PROJECT_DISCOVER_PROFILES["Fusion Leap"]
  );
}
