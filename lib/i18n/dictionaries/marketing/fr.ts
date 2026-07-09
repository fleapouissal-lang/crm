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
    subtitle:
      "L'essentiel sur Fusion Leap CRM — essai, tarifs, multi-entreprises et support.",
    contactPrompt: "Vous ne trouvez pas votre réponse ?",
    contactLink: "Contactez-nous",
    items: [
      {
        q: "Comment fonctionne le mois gratuit ?",
        a: "30 jours d'accès complet au pack choisi, sans carte bancaire. À la fin, vous continuez, changez de formule ou arrêtez — vos données restent exportables.",
      },
      {
        q: "Puis-je gérer plusieurs entreprises (STE) ?",
        a: "Oui. Le pack Entreprise permet de créer plusieurs STE (Fusion Leap, Autolog, etc.) avec un CRM isolé pour chacune : leads, clients, devis et équipes séparés.",
      },
      {
        q: "Les données sont-elles isolées entre entreprises ?",
        a: "Oui. Chaque STE dispose de son propre espace avec des règles d'accès côté serveur. Les utilisateurs ne voient que les données de leur organisation.",
      },
      {
        q: "Puis-je changer de pack à tout moment ?",
        a: "Oui. Upgrade immédiat avec facturation au prorata. Downgrade au renouvellement suivant. Tarifs mensuels, sans frais cachés.",
      },
      {
        q: "Comment fonctionnent les rôles et permissions ?",
        a: "Directeur et gérant accèdent à la finance et à l'administration. Commerciaux, dev et autres profils voient uniquement les modules qui leur sont assignés, configurables par STE.",
      },
      {
        q: "Comment contacter le support ?",
        a: "Via la page Contact ou à contact@fusionleap.com. Réponse sous 24 h ouvrées. Démo guidée et devis sur mesure disponibles.",
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
