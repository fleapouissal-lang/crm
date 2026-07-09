export const marketingFr = {
  nav: {
    pricing: "Tarifs",
    about: "À propos",
    faq: "FAQ",
    contact: "Contact",
    login: "Connexion",
    signup: "Commencer",
  },
  pricing: {
    metaTitle: "Tarifs",
    title: "Des tarifs simples,",
    titleAccent: "1 mois gratuit",
    subtitle:
      "Essayez Fusion Leap CRM gratuitement pendant 30 jours. Choisissez ensuite le pack adapté à votre équipe.",
    trialBadge: "1 mois gratuit",
    trialNote: "Sans carte bancaire · Annulation à tout moment",
    perMonth: "/ mois",
    popular: "Populaire",
    cta: "Commencer l'essai gratuit",
    ctaContact: "Contacter les ventes",
    packs: {
      starter: {
        name: "Essentiel",
        price: "29",
        description: "Pour les petites équipes qui démarrent.",
        features: [
          "Jusqu'à 5 utilisateurs",
          "Leads & pipeline",
          "Clients & contacts",
          "Kanban tâches",
          "Support email",
        ],
      },
      business: {
        name: "Business",
        price: "79",
        description: "Pour les équipes commerciales en croissance.",
        features: [
          "Jusqu'à 25 utilisateurs",
          "Tout Essentiel +",
          "Devis & factures",
          "Rapports & analytics",
          "Rôles & permissions",
          "Support prioritaire",
        ],
      },
      enterprise: {
        name: "Entreprise",
        price: "149",
        description: "Multi-STE, gouvernance et scale.",
        features: [
          "Utilisateurs illimités",
          "Tout Business +",
          "Multi-entreprises (STE)",
          "CRM isolé par société",
          "Administration globale",
          "Account manager dédié",
        ],
      },
    },
  },
  about: {
    metaTitle: "À propos",
    title: "Fusion Leap",
    subtitle: "Intelligent Systems. Limitless Impact.",
    intro:
      "Fusion Leap conçoit des systèmes intelligents pour les entreprises qui veulent un CRM moderne, multi-tenant et prêt pour la croissance.",
    missionTitle: "Notre mission",
    mission:
      "Offrir à chaque entreprise un espace CRM dédié, sécurisé et élégant — sur une plateforme globale unique.",
    valuesTitle: "Ce qui nous distingue",
    values: [
      {
        title: "Multi-entreprises",
        text: "Fusion Leap, Autolog et chaque STE dispose de son univers CRM isolé.",
      },
      {
        title: "Accès par rôle",
        text: "Directeur, gérant, commercial, dev — chacun voit ce dont il a besoin.",
      },
      {
        title: "Design premium",
        text: "Une expérience soignée, rapide et pensée pour le terrain.",
      },
    ],
  },
  faq: {
    metaTitle: "FAQ",
    title: "Questions fréquentes",
    subtitle: "Tout ce qu'il faut savoir avant de démarrer.",
    items: [
      {
        q: "Comment fonctionne le mois gratuit ?",
        a: "Vous accédez à toutes les fonctionnalités du pack choisi pendant 30 jours, sans engagement. Aucune carte n'est requise pour démarrer.",
      },
      {
        q: "Puis-je gérer plusieurs entreprises (STE) ?",
        a: "Oui. Le pack Entreprise permet à un administrateur global de créer et gérer plusieurs STE, chacune avec son CRM isolé.",
      },
      {
        q: "Les données sont-elles séparées par entreprise ?",
        a: "Oui. Chaque STE dispose de son propre espace. Les utilisateurs ne voient que les données de leur entreprise.",
      },
      {
        q: "Puis-je changer de pack plus tard ?",
        a: "Oui, vous pouvez upgrader ou downgrader à tout moment. La facturation s'ajuste au prorata.",
      },
      {
        q: "Qui peut accéder à la finance (devis/factures) ?",
        a: "Par défaut, le Directeur et le Gérant. Les autres rôles voient uniquement ce qui correspond à leur métier.",
      },
      {
        q: "Comment contacter le support ?",
        a: "Via la page Contact ou par email à contact@fusionleap.com. Les clients Business et Entreprise bénéficient d'un support prioritaire.",
      },
    ],
  },
  contact: {
    metaTitle: "Contact",
    title: "Contactez-nous",
    subtitle: "Une question, une démo ou un devis sur mesure — notre équipe vous répond sous 24 h.",
    name: "Nom complet",
    email: "Email professionnel",
    company: "Entreprise",
    message: "Message",
    send: "Envoyer le message",
    infoTitle: "Coordonnées",
    emailLabel: "Email",
    emailValue: "contact@fusionleap.com",
    hoursTitle: "Horaires",
    hoursValue: "Lun – Ven, 9 h – 18 h (GMT+1)",
  },
  footer: {
    rights: "Tous droits réservés.",
  },
} as const;

type DeepString<T> = {
  [K in keyof T]: T[K] extends readonly (infer U)[]
    ? U extends object
      ? readonly DeepString<U>[]
      : readonly string[]
    : T[K] extends object
      ? DeepString<T[K]>
      : string;
};

export type MarketingDictionary = DeepString<typeof marketingFr>;
