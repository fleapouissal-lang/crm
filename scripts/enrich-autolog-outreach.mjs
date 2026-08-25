import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase admin credentials are missing");

const supabase = createClient(url, key, { auth: { persistSession: false } });
const organizationId = process.env.OUTREACH_ORGANIZATION_ID || "8d7e5761-68e0-49df-bf6c-3afcc50b7fca";

const prospects = [
  {
    company: "Samicar",
    confidence: "high",
    snapshot: "Samicar opère depuis 2001, couvre plusieurs villes et propose la livraison à l'aéroport ou à l'hôtel.",
    opportunity: "La coordination des réservations, disponibilités et livraisons entre plusieurs points peut vite devenir dispersée.",
    value: "Autolog peut centraliser le parc, les réservations, les contrats et les remises de véhicules dans un même flux.",
    hook: "Couverture multi-ville et livraison aéroport/hôtel.",
    sources: ["https://www.samicar.com/marrakech.php"],
    parts: [
      "Bonjour l’équipe Samicar, votre couverture multi-ville et vos livraisons aéroport/hôtel depuis plus de deux décennies montrent une opération déjà bien structurée.",
      "Autolog peut surtout vous aider à garder réservations, contrats et disponibilité du parc alignés entre agences. Je peux vous montrer un exemple concret du suivi multi-agence ?",
    ],
  },
  {
    company: "GoRide",
    confidence: "high",
    snapshot: "GoRide présente une marketplace de location et référence plus de quinze agences à Casablanca.",
    opportunity: "Le volume de partenaires et de demandes crée un besoin de suivi clair des disponibilités, dossiers et relances.",
    value: "Autolog peut offrir un cockpit opérationnel pour suivre partenaires, réservations et statuts sans perdre le contexte client.",
    hook: "Marketplace avec un réseau dense d'agences à Casablanca.",
    sources: ["https://www.goride.ma/agences/casablanca?page=2", "https://www.goride.ma/contact"],
    parts: [
      "Bonjour GoRide — j’ai vu que votre marketplace regroupe déjà plus de 15 agences à Casablanca. À cette échelle, le vrai défi devient souvent le suivi opérationnel entre partenaires.",
      "Nous développons Autolog pour centraliser demandes, disponibilités et relances dans un seul cockpit. Cela vaut-il le coup de comparer votre flux actuel pendant 15 minutes ?",
    ],
  },
  {
    company: "Medloc Maroc",
    confidence: "high",
    snapshot: "Medloc dispose de points à Marrakech et Casablanca, propose une assistance 24/7 et une flotte comprenant 4x4 et minibus.",
    opportunity: "Une flotte variée sur plusieurs implantations demande une visibilité fiable sur l'affectation et la disponibilité.",
    value: "Autolog peut unifier le planning du parc, les contrats et le suivi des dossiers entre les deux villes.",
    hook: "Deux implantations et flotte variée avec assistance continue.",
    sources: ["https://www.medloc.ma/it/"],
    parts: [
      "Bonjour Medloc Maroc, votre présence à Marrakech et Casablanca, avec une flotte allant jusqu’aux 4x4 et minibus, implique une vraie coordination au quotidien.",
      "Autolog peut donner à l’équipe une vue unique sur disponibilités, affectations et contrats entre les deux villes. Souhaitez-vous voir comment cela fonctionnerait sur un dossier réel ?",
    ],
  },
  {
    company: "Oyama Car",
    confidence: "high",
    snapshot: "Oyama Car propose un devis et une réservation en ligne, notamment depuis l'aéroport de Marrakech, avec plusieurs catégories de véhicules.",
    opportunity: "Le passage du devis web à l'affectation du véhicule et au contrat peut générer des ressaisies manuelles.",
    value: "Autolog peut transformer la demande en dossier suivi, puis en contrat et remise de véhicule.",
    hook: "Parcours de devis instantané et réservation en ligne.",
    sources: ["https://www.oyamacar.fr/contactez-nous"],
    parts: [
      "Bonjour Oyama Car, votre parcours de devis instantané est un bon point d’entrée client. La friction arrive souvent juste après, quand il faut affecter le véhicule puis préparer le contrat.",
      "Autolog relie ces étapes dans un seul dossier, de la demande à la remise du véhicule. Je vous envoie un aperçu adapté à votre parcours actuel ?",
    ],
  },
  {
    company: "Abid Cars",
    confidence: "high",
    snapshot: "Abid Cars indique plus de trente ans d'activité et une présence dans plusieurs grandes villes marocaines.",
    opportunity: "Une activité historique multi-agence gagne à partager une donnée parc et client cohérente entre sites.",
    value: "Autolog peut centraliser disponibilités, contrats et suivi commercial tout en gardant une vue par agence.",
    hook: "Plus de trente ans d'expérience et plusieurs implantations.",
    sources: ["https://www.abidcars.com/en-contact.jsp"],
    parts: [
      "Bonjour Abid Cars, plus de 30 ans d’activité et plusieurs implantations, c’est une profondeur opérationnelle rare sur le marché.",
      "Autolog peut apporter une vue commune du parc et des contrats tout en conservant le pilotage par agence. Est-ce un sujet que vous cherchez encore à fluidifier ?",
    ],
  },
  {
    company: "CasaRide",
    confidence: "high",
    snapshot: "CasaRide propose location courte durée et LLD, avec livraison possible aux aéroports et gares.",
    opportunity: "Les durées de contrat différentes et les lieux de remise multiplient les échéances et mouvements à suivre.",
    value: "Autolog peut regrouper planning, échéances contractuelles, livraisons et retours.",
    hook: "Mix courte durée/LLD et livraisons aéroport/gare.",
    sources: ["https://www.casaride.ma/"],
    parts: [
      "Bonjour CasaRide, entre la courte durée, la LLD et les livraisons en gare ou aéroport, vos équipes gèrent plusieurs rythmes de contrat en parallèle.",
      "Autolog permet de suivre échéances, remises et retours dans le même planning. Une courte démo sur ce cas précis vous serait utile ?",
    ],
  },
  {
    company: "Agaluxe Cars",
    confidence: "high",
    snapshot: "Agaluxe Cars propose réservation en ligne, livraison à l'aéroport ou à l'hôtel et prestations avec chauffeur.",
    opportunity: "Les demandes standards et personnalisées nécessitent un suivi différencié sans perdre les détails logistiques.",
    value: "Autolog peut centraliser chaque demande, son affectation véhicule/chauffeur et les tâches de livraison.",
    hook: "Réservations personnalisées, livraison et options avec chauffeur.",
    sources: ["https://agaluxecars.com/contactez-nous/", "https://agaluxecars.com/location-de-voiture-a-agadir/"],
    parts: [
      "Bonjour Agaluxe Cars, j’ai remarqué que vous combinez réservation classique, demandes personnalisées et prestations avec chauffeur.",
      "Autolog peut garder dans un seul dossier le véhicule, le chauffeur, les horaires et les tâches de livraison. Puis-je vous montrer ce flux en quelques minutes ?",
    ],
  },
  {
    company: "4ACAR",
    confidence: "high",
    snapshot: "4ACAR dispose d'un moteur de réservation, couvre plusieurs villes et aéroports et annonce une assistance 24/7.",
    opportunity: "La couverture multi-ville rend critique la synchronisation des disponibilités et des remises.",
    value: "Autolog peut fournir une vue temps réel du parc, des réservations et des opérations par point de livraison.",
    hook: "Moteur de réservation et couverture de plusieurs aéroports.",
    sources: ["https://www.4acar.ma/"],
    parts: [
      "Bonjour l’équipe 4ACAR, votre couverture de plusieurs villes et aéroports donne beaucoup de choix au client — et beaucoup de mouvements à coordonner en interne.",
      "Autolog centralise disponibilités, remises et dossiers par point de livraison. Seriez-vous ouvert à voir une vue multi-ville pensée pour ce fonctionnement ?",
    ],
  },
  {
    company: "AchourCar",
    confidence: "high",
    snapshot: "AchourCar reçoit des demandes précisant modèle et durée depuis son agence d'Agdal à Rabat.",
    opportunity: "Une demande structurée peut encore demander plusieurs manipulations avant de devenir devis, réservation puis contrat.",
    value: "Autolog peut convertir la demande en pipeline suivi et conserver toutes les étapes jusqu'au contrat.",
    hook: "Formulaire axé sur le modèle souhaité et la durée.",
    sources: ["https://achourcar.com/accueil/contact/"],
    parts: [
      "Bonjour AchourCar, votre formulaire capte déjà les deux informations clés : le modèle et la durée. C’est une excellente base pour automatiser la suite du dossier.",
      "Avec Autolog, la demande passe au devis, à la réservation puis au contrat sans ressaisie. Voulez-vous voir ce parcours appliqué à votre formulaire actuel ?",
    ],
  },
  {
    company: "Car 360",
    confidence: "high",
    snapshot: "Car 360 propose réservation en ligne, véhicules récents et une formule d'abonnement en plus de la location.",
    opportunity: "Location ponctuelle et abonnement exigent des suivis de facturation et d'échéance distincts.",
    value: "Autolog peut suivre les deux modèles dans une vue unique avec alertes de contrat et paiements.",
    hook: "Combinaison location et abonnement automobile.",
    sources: ["https://car360.ma/"],
    parts: [
      "Bonjour Car 360, votre formule d’abonnement en plus de la location classique crée un modèle commercial intéressant — mais aussi deux logiques de suivi différentes.",
      "Autolog peut réunir contrats, échéances et paiements des deux offres dans une seule vue. Un échange rapide pour comparer avec votre organisation actuelle ?",
    ],
  },
  {
    company: "Venture Mobility",
    confidence: "high",
    snapshot: "Venture Mobility affiche ses modèles et tarifs avec une recherche de disponibilité en ligne et propose le kilométrage illimité.",
    opportunity: "La promesse de disponibilité en ligne dépend d'un parc interne constamment synchronisé.",
    value: "Autolog peut relier disponibilité du parc, réservation et état contractuel pour réduire les écarts.",
    hook: "Recherche de disponibilité et tarifs visibles en ligne.",
    sources: ["https://www.venture-mobility.ma/"],
    parts: [
      "Bonjour Venture Mobility, votre site rend les modèles, tarifs et disponibilités faciles à consulter. Pour tenir cette promesse, la donnée du parc doit rester parfaitement synchronisée.",
      "Autolog relie réservation, disponibilité réelle et contrat. Est-ce que la synchronisation web/opérations est aujourd’hui totalement automatisée chez vous ?",
    ],
  },
  {
    company: "Tourvilles",
    confidence: "high",
    snapshot: "Tourvilles indique une activité depuis 1984, avec agences en ville et à l'aéroport et une disponibilité 24/7.",
    opportunity: "Une organisation historique peut numériser le suivi sans perdre la qualité de service construite avec le temps.",
    value: "Autolog peut donner une vue opérationnelle moderne des réservations, contrats et remises tout en conservant les méthodes de l'équipe.",
    hook: "Agence historique avec points ville/aéroport.",
    sources: ["https://tourvilles.net/contact"],
    parts: [
      "Bonjour Tourvilles, depuis 1984 avec des points en ville et à l’aéroport, vous avez construit des méthodes terrain que peu d’outils savent respecter.",
      "Autolog vise justement à numériser réservations, contrats et remises sans bouleverser le savoir-faire de l’équipe. Puis-je vous présenter cette approche ?",
    ],
  },
  {
    company: "Ouarssani Car",
    confidence: "high",
    snapshot: "Ouarssani Car propose des locations courte, hebdomadaire et longue durée, avec livraison dans plusieurs villes du Maroc.",
    opportunity: "La variété des durées et zones de livraison rend le suivi des échéances et déplacements du parc plus complexe.",
    value: "Autolog peut regrouper calendriers, contrats et mouvements du parc selon chaque durée.",
    hook: "Plusieurs durées de location et livraison à travers le Maroc.",
    sources: ["https://www.ouarssanicar.com/"],
    parts: [
      "Bonjour Ouarssani Car, votre offre courte, hebdomadaire et longue durée, avec livraison dans plusieurs villes, demande un planning particulièrement clair.",
      "Autolog réunit les échéances de contrat et les mouvements du parc dans une seule vue. Je peux vous envoyer un exemple adapté à ces trois durées ?",
    ],
  },
  {
    company: "RBPS Car",
    confidence: "high",
    snapshot: "RBPS Car annonce vingt-trois points dans onze villes, avec réservation en ligne, présence à la gare de Kénitra et service 24/7.",
    opportunity: "Un réseau étendu a besoin d'une source unique pour les disponibilités, transferts et remises par ville.",
    value: "Autolog peut piloter le parc et les opérations multi-sites depuis un tableau commun.",
    hook: "Réseau annoncé de 23 points dans 11 villes.",
    sources: ["https://www.rbps-car.com/", "https://www.rbps-car.com/agences/kenitra"],
    parts: [
      "Bonjour RBPS Car, avec 23 points annoncés dans 11 villes, votre enjeu n’est probablement plus de trouver les dossiers, mais d’avoir la même information partout au bon moment.",
      "Autolog apporte une vue multi-site des disponibilités, transferts et remises. Est-ce pertinent de vous montrer ce pilotage sur un scénario Kénitra/autre ville ?",
    ],
  },
  {
    company: "Dinsky Car",
    confidence: "high",
    snapshot: "Dinsky Car propose livraison à l'aéroport Oujda-Angads, services pour MRE et entreprises, ainsi que location avec chauffeur.",
    opportunity: "Plusieurs segments clients et prestations exigent des dossiers, documents et suivis adaptés.",
    value: "Autolog peut structurer chaque segment avec son flux de contrat, de livraison et de relance.",
    hook: "Offres MRE, entreprises et chauffeur depuis Oujda.",
    sources: ["https://www.oujda-voiture.com/"],
    parts: [
      "Bonjour Dinsky Car, vos offres pour MRE, entreprises et location avec chauffeur ne suivent pas toutes le même parcours client.",
      "Autolog peut créer un flux clair pour chaque segment, du document demandé jusqu’à la livraison à Oujda-Angads. Quel segment vous prend aujourd’hui le plus de temps à suivre ?",
    ],
  },
  {
    company: "Louizi Car Rentals",
    confidence: "high",
    snapshot: "Louizi Car Rentals propose livraison gratuite à l'aéroport, kilométrage illimité et contenus locaux autour d'Essaouira.",
    opportunity: "Une promesse de service local forte dépend d'une bonne coordination des arrivées, livraisons et retours.",
    value: "Autolog peut planifier les remises et retours et conserver le contexte du voyageur dans chaque dossier.",
    hook: "Positionnement local à Essaouira et livraison gratuite à l'aéroport.",
    sources: ["https://louizicarentals.com/?lang=en"],
    parts: [
      "Bonjour Louizi Car Rentals, votre approche locale d’Essaouira et la livraison gratuite à l’aéroport donnent une expérience très pratique au voyageur.",
      "Autolog peut aider l’équipe à planifier arrivées, remises et retours sans perdre le contexte de chaque client. Souhaitez-vous voir un planning conçu pour ce type de service ?",
    ],
  },
];

let updated = 0;
for (const item of prospects) {
  const { data: leads, error: leadError } = await supabase
    .from("leads")
    .select("id, company, title")
    .eq("organization_id", organizationId)
    .eq("sales_project", "Autolog")
    .or(`company.ilike.${item.company},title.ilike.${item.company}`);
  if (leadError) throw leadError;

  for (const lead of leads || []) {
    const researchNotes = [
      `Profil vérifié : ${item.snapshot}`,
      `Opportunité observée : ${item.opportunity}`,
      `Valeur Autolog : ${item.value}`,
      `Angle de personnalisation : ${item.hook}`,
      `Confiance de la recherche : ${item.confidence}`,
    ].join("\n");

    const { error: updateLeadError } = await supabase
      .from("leads")
      .update({
        research_notes: researchNotes,
        research_sources: item.sources,
        researched_at: new Date().toISOString(),
        ai_summary: `${item.snapshot} ${item.opportunity}`.slice(0, 3000),
      })
      .eq("id", lead.id);
    if (updateLeadError) throw updateLeadError;

    const { error: messageError } = await supabase
      .from("outreach_messages")
      .update({ body: item.parts.join("\n\n"), message_parts: item.parts })
      .eq("lead_id", lead.id)
      .eq("status", "draft");
    if (messageError) throw messageError;
    updated += 1;
    console.log(`Enriched ${lead.company || lead.title}`);
  }
}

console.log(`Done: ${updated} Autolog leads enriched.`);

const unverifiedCompanies = ["Voiture Marrakech", "Tanger Car Hire", "Salam Car", "RAKB"];
const { data: unverifiedLeads, error: unverifiedError } = await supabase
  .from("leads")
  .select("id, company, title")
  .eq("organization_id", organizationId)
  .eq("sales_project", "Autolog")
  .in("company", unverifiedCompanies);
if (unverifiedError) throw unverifiedError;

for (const lead of unverifiedLeads || []) {
  const { error } = await supabase
    .from("outreach_messages")
    .update({
      status: "cancelled",
      error_message: "Research gate: exact company identity or official source could not be verified.",
    })
    .eq("lead_id", lead.id)
    .in("status", ["draft", "approved", "failed"]);
  if (error) throw error;
  console.log(`Withheld unverified outreach: ${lead.company || lead.title}`);
}
