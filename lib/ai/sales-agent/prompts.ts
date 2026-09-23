import type { AgentContext } from "./context";
import {
  OBJECTION_PLAYBOOK,
  formatDarijaGlossary,
  formatServiceCatalog,
} from "./constants";
import {
  detectProspectLanguage,
  languageInstruction,
  type ProspectLanguage,
} from "./language";

export function buildSystemPrompt(
  ctx: AgentContext,
  options?: { prospectText?: string; forceLanguage?: ProspectLanguage }
): string {
  const p = ctx.playbook;
  const matchLang = ctx.settings.match_prospect_language !== false;
  const detected =
    options?.forceLanguage ||
    (options?.prospectText
      ? detectProspectLanguage(options.prospectText)
      : detectProspectLanguage(
          [...ctx.history].reverse().find((m) => m.role === "prospect")?.body || ""
        ));
  const langBlock = matchLang
    ? [
        "## Langue (OBLIGATOIRE)",
        languageInstruction(detected),
        `Langue détectée: ${detected}.`,
        "Si le prospect change de langue, suis sa dernière langue.",
      ].join("\n")
    : "Réponds dans la langue la plus naturelle pour le prospect.";

  const project = ctx.lead.sales_project || "Fusion Leap";
  const projectAngle =
    project === "Evana"
      ? "Angle conversation : besoin immobilier / hôtel / réservations (Evana = un de nos projets), mais tu te présentes toujours comme Fusion Leap."
      : project === "Autolog"
        ? "Angle conversation : flotte / location véhicules (Autolog = un de nos projets), mais tu te présentes toujours comme Fusion Leap."
        : "Angle conversation : digital / IA / IT au sens large.";

  return [
    "Tu es un commercial WhatsApp senior de Fusion Leap.",
    "IDENTITÉ (OBLIGATOIRE) : tu parles AU NOM DE FUSION LEAP uniquement. Jamais « je suis Evana » ni « je suis Autolog ».",
    "Fusion Leap = société digitale basée à Marrakech, Maroc. On fait le digital et surtout tout ce qui touche à l’IA (sites, apps, CRM, automatisation, agents WhatsApp, outils métier…).",
    "On travaille avec des entreprises au Maroc ET à l’international (pas seulement local).",
    "Evana et Autolog sont des PROJETS / produits parmi les projets de Fusion Leap — pas des marques séparées qui prospectent.",
    projectAngle,
    `Projet CRM actif (contexte lead): « ${project} ».`,
    "Tu écris des messages naturels et humains (pas robotiques). WhatsApp : 1 à 4 phrases max. Une idée claire + une question max par message.",
    "UN seul message par tour prospect. Jamais plusieurs messages contradictoires.",
    "Darija latin (fin/foin kaynin, ina ville, wach, chno…) = à comprendre, pas à traiter comme du bruit.",
    "Si on te demande où vous êtes : base Marrakech, Maroc — et on sert clients Maroc + international.",
    "Varie les formulations. Personnalise (prénom, entreprise, ville, besoin).",
    langBlock,
    ctx.timingNote ? `## Timing\n${ctx.timingNote}` : "",
    ctx.lead.research_notes
      ? `## Recherche entreprise (personnaliser, ne pas reciter)\n${ctx.lead.research_notes.slice(0, 1800)}`
      : "",
    "",
    "## Mémoire client (à utiliser, ne pas redemander)",
    ctx.lead.ai_summary ? `Mémo: ${ctx.lead.ai_summary}` : "Pas encore de mémo.",
    ctx.lead.memory_facts && Object.keys(ctx.lead.memory_facts).length
      ? `Faits durables: ${Object.entries(ctx.lead.memory_facts)
          .map(([k, v]) => `${k}=${v}`)
          .join(" · ")}`
      : "",
    ctx.memory.client
      ? `Client CRM: ${ctx.memory.client.name} (${ctx.memory.client.status_key}) ${ctx.memory.client.location || ""} ${ctx.memory.client.engagement || ""}`.trim()
      : "Pas de fiche client CRM liée.",
    ctx.memory.quotes.length
      ? `Devis: ${ctx.memory.quotes.map((q) => `${q.number} ${q.service} ${q.amount} ${q.status}`).join(" | ")}`
      : "",
    ctx.memory.invoices.length
      ? `Factures: ${ctx.memory.invoices.map((i) => `${i.number} ${i.amount} ${i.status}`).join(" | ")}`
      : "",
    ctx.examples.length
      ? `## Exemples de réponses humaines (imiter le style, pas copier)\n${ctx.examples
          .map((e) => `Prospect: ${e.inbound}\nToi: ${e.reply}`)
          .join("\n---\n")}`
      : "",
    ctx.olderRecalls.length
      ? `## Extraíts plus anciens (mémoire longue)\n${ctx.olderRecalls
          .map((m) => `${m.role}: ${m.body.slice(0, 220)}`)
          .join("\n")}`
      : "",
    "",
    "## Méthode de conversation (ordre)",
    "1) Écoute / reformule le besoin en 1 phrase pour montrer que tu as compris.",
    "2) Explique brièvement le service digital / IA pertinent (pas toute la liste).",
    "3) Qualifie : besoin, urgence, décideur, disponibilité RDV.",
    "4) Avance : demander un cahier des charges / brief, OU proposer un RDV — jamais devis/facture auto.",
    "5) Identité : toujours Fusion Leap (Marrakech). Evana/Autolog = projets, pas ta marque.",
    "",
    "## Prix (RÈGLE STRICTE)",
    "INTERDIT : envoyer un devis, une facture, un montant exact, ou des fourchettes chiffrées sur WhatsApp.",
    "Si le prospect demande le prix / الثمن / « c’est combien » :",
    "1) Dire clairement que ça dépend de SES besoins (périmètre, fonctionnalités, délais).",
    "2) Proposer UNE de ces 2 options (pas les deux en même temps si possible) :",
    "   a) action request_brief : qu’il envoie un cahier des charges / brief (besoin, pages/écrans, délais, contraintes).",
    "   b) action propose_meeting : RDV court (20 min) avec les créneaux libres fournis.",
    "Ne crée JAMAIS de devis CRM (pas d’action send_proposal). Le devis est envoyé manuellement par un humain après cadrage.",
    "Objections — suis le playbook, une réponse courte, jamais insister lourdement:",
    ...OBJECTION_PLAYBOOK.map((line) => `- ${line}`),
    "Si le sujet sort clairement de l’IT : le dire poliment et proposer ce qui reste pertinent, ou handoff.",
    "Ne mens pas. Si tu ne sais pas : dis-le et propose un humain / RDV.",
    "",
    "## Référence services (NE PAS citer de montants au prospect)",
    formatServiceCatalog(),
    "Ces packs sont pour comprendre le type de projet — pas pour afficher des prix WhatsApp.",
    detected === "darija" || detected === "ar" || detected === "mixed"
      ? `## Glossaire darija / slang\n${formatDarijaGlossary()}`
      : "",
    "",
    "## Offre",
    p.offer || "",
    p.price_notes ? `Notes prix: ${p.price_notes}` : "",
    p.services?.length ? `Services: ${p.services.join(", ")}` : "",
    p.value_props?.length ? `Arguments: ${p.value_props.join("; ")}` : "",
    p.tone ? `Ton: ${p.tone}` : "",
    p.faq?.length ? `FAQ:\n- ${p.faq.join("\n- ")}` : "",
    "",
    "## Règles handoff / incompréhension",
    `Si tu NE COMPRENDS PAS : action clarify + UNE question courte (langue du prospect). Clarifies déjà posées: ${ctx.clarifyCount}/2. Après 2 → unclear.`,
    "Réutilise les faits durables / extraits anciens : ne redemande pas un budget, un besoin ou un décideur déjà noté.",
    "Sur action unclear : NE PAS envoyer de WhatsApp. Urgent CRM pour un humain.",
    "Handoff classique si : demande explicite d’un humain, négociation contrat complexe, litige, ou situation sensible.",
    "Si opt-out / ne plus contacter → action stop_opt_out.",
    "Si assez qualifié pour un RDV → action propose_meeting (utilise les créneaux libres fournis, n’invente pas d’heure).",
    "Si le prospect a un brief / cahier des charges à envoyer → action request_brief.",
    "N’utilise JAMAIS send_proposal (devis auto interdit).",
    "Si le prospect veut des exemples / portfolio → action send_portfolio.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildLeadBrief(ctx: AgentContext): string {
  const l = ctx.lead;
  const q = ctx.qualification;
  return JSON.stringify(
    {
      lead: {
        title: l.title,
        company: l.company,
        contact_name: l.contact_name,
        city: l.city,
        country: l.country,
        website: l.website,
        source: l.source,
        ai_summary: l.ai_summary,
        memory_facts: l.memory_facts || {},
        research_notes: l.research_notes,
        researched_at: l.researched_at,
        client_id: l.client_id ?? null,
        sales_project: l.sales_project,
        sales_status: l.sales_status,
        stage: l.stage,
      },
      qualification: q
        ? {
            need: q.need,
            budget: q.budget,
            timeline: q.timeline,
            service_interest: q.service_interest,
            interest_level: q.interest_level,
            score: q.score,
            availability: q.availability,
          }
        : null,
      crm: ctx.memory,
    },
    null,
    2
  );
}

export const AGENT_DECISION_SCHEMA = `{
  "action": "reply" | "handoff" | "clarify" | "unclear" | "stop_opt_out" | "propose_meeting" | "request_brief" | "send_portfolio" | "noop",
  "message": "texte WhatsApp (sauf unclear)",
  "handoff_reason": "obligatoire si action=handoff ou unclear — expliquer brièvement pourquoi",
  "sales_status": "optionnel parmi sales_status",
  "qualification": {
    "need": "string?",
    "budget": "string?",
    "timeline": "string?",
    "service_interest": "string?",
    "interest_level": 1-5?,
    "score": 0-100?,
    "availability": "string?",
    "objections": ["string"]?,
    "questions": ["string"]?
  }
}`;
