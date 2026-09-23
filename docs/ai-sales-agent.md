# AI Sales Agent — Ops runbook

Agent commercial WhatsApp autonome (Gemini in-app, full auto), branché sur EasyTouch.

## Prérequis env

```env
GEMINI_API_KEY=...
SALES_AGENT_MODEL=gemini-2.5-flash
SALES_AGENT_CRON_SECRET=long-random-secret

WA_BRIDGE_URL=https://bridge.example.com
WA_BRIDGE_SECRET=...
WA_BRIDGE_ORGANIZATION_ID=<org uuid>
WA_BRIDGE_INSTANCE_ID_FUSION_LEAP=fusionleap_crm
WA_BRIDGE_INSTANCE_ID_AUTOLOG=autolog_crm
# Evana uses the same session as Fusion Leap (no separate instance)
OUTREACH_PROVIDER=easytouch
OUTREACH_QUALIFIED_ASSIGNEE_ID=<profile uuid optional>
```

## Langue & timing humain

- `match_prospect_language` : répond dans la langue du prospect (darija / arabe / FR / ES / EN).
- `reply_delay_min_sec` / `reply_delay_max_sec` : délai aléatoire avant envoi WhatsApp (pas instantané). Les messages sont mis en `queued` + `scheduled_for`, puis envoyés par le cron.
- `first_touch_stagger_*` : décale les premiers messages pour éviter des envois synchrones.
- `send_window_*` : fenêtre d’envoi (heures Africa/Casablanca).

Le cron `/api/cron/sales-agent` flush aussi les messages WhatsApp dus (`flushDueAiWhatsApp`) et lance le **first-touch auto quotidien** (`processDailyAutoFirstTouch`) : jusqu’à `daily_first_touch_limit` (défaut **30**) leads `new` avec téléphone, planifiés à des heures différentes dans la fenêtre Casablanca.

## Commercial intelligent (mémoire, timing, objections, recherche)

- **Mémoire** : `leads.ai_summary` se met à jour après chaque échange ; matching `clients` (tél / email / nom) + devis / factures dans le brief.
- **Vocal / image / PDF / vidéo** : média EasyTouch. Images → Claude Vision. PDF → Claude Document. Vocaux → bridge `/transcribe` puis Groq (`GROQ_API_KEY`) puis OpenAI Whisper. Sinon 1 question « écrire » puis Urgent.
- **Apprentissage** : chaque réponse manuelle CRM est stockée (`sales_agent_examples`) et réinjectée si le inbound ressemble.
- **Mémoire longue** : 20 derniers + jusqu’à 400 messages scannés + `ai_summary` + `memory_facts` (besoin, budget, délai, décideur…).
- **Clarify** : jusqu’à 2 questions (langue du prospect) avant Urgent. Compteur reset après une vraie réponse.
- **Outils agent** : créneaux RDV libres (agenda), liens portfolio. **Pas de devis/facture auto** : sur demande de prix → « حسب الحاجة » + cahier des charges / brief **ou** RDV. Le devis reste manuel (humain).
- **Recherche** : site, guess `.ma` / `.com` / `.co.ma`, DuckDuckGo multi-requêtes (officiel, Instagram, Facebook, ICE, secteur), extraits + réseaux, synthèse commerciale. Aussi au reply inbound, pas seulement first touch. Fait `secteur` / `ice` / `instagram` dans `memory_facts`.
- **Timing** : réponse plus rapide si le prospect enchaîne ; hors fenêtre (nuit) → envoi le matin Casablanca ; vendredi / jour férié → ton plus léger.
- **Objections** : playbook (cher, déjà prestataire, « envoyez un prix », « نفكّر »…).
- **Recherche** : avant first touch **et** au reply, fetch site + web (Instagram / ICE / secteur).


Settings → **AI Agent** → désactiver `Agent enabled`.

Flags utiles :

- `auto_first_touch` / `auto_reply`
- `require_human_approval` (revient au mode approbation)
- limites messages / lead / org
- assignee handoff
- playbook offre par projet

## Cron first-touch + rappels RDV

```bash
curl -X POST http://localhost:3000/api/cron/sales-agent \
  -H "Authorization: Bearer $SALES_AGENT_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"organization_id":"<optional if WA_BRIDGE_ORGANIZATION_ID set>"}'
```

## Relances

Toujours via `scripts/process-relances.mjs` + timer systemd. Les corps sont générés par Gemini si la clé est présente.

## Flux

1. Lead « new » + téléphone → cron first-touch auto (jusqu’à N/jour, horaires étalés) **ou** bouton **Send first touch**
2. Reply inbound **uniquement** si on a déjà écrit à ce lead → `handleInboundMessage` → reply / handoff / opt-out / RDV
3. Relances seulement pour les leads déjà contactés (après first send)
4. Mode `human` → inbox handoff + panneau conversation lead
5. Demande de prix → brief / RDV (pas de devis auto). Proposition manuelle → `createProposalFromLead`

## Tables

`sales_agent_settings`, `ai_conversations` (`clarify_count`), `conversation_messages`, `lead_qualifications`, `appointments`, `ai_action_logs`, `quotes.lead_id`, `leads.sales_status`, `leads.memory_facts`, `leads.ai_summary`

## Découverte auto de prospects

Settings → AI Agent → projet (**Fusion Leap** / **Autolog** / **Evana**) → **Découvrir des prospects** + villes/secteurs + limite/jour.

Chaque projet a son profil de cibles (ex. Autolog → flotte/location auto, Evana → agences immo, Fusion Leap → PME/digital). Le cron (ou bouton **Découvrir** /leads) alterne 3 canaux : **web** (DuckDuckGo), **Instagram** (profils publics), **Maps** (OpenStreetMap Nominatim + adresse/téléphone), ouvre les sites, extrait téléphone/email si publics, crée des leads `source=auto_discover` avec le bon `sales_project` + `memory_facts.canal`, puis enrichit `research_notes`.

**Limite:** infos publiques seulement — pas tous les commerces ont un numéro en ligne. First-touch WhatsApp nécessite un téléphone.

**Qualité:** chaque lead découvert reçoit un `ai_score` (0–100) selon téléphone / site / email / nom. Annuaires (Telecontact, Pages Jaunes…) sont ignorés. Sur `/leads` → **Nettoyer junk** supprime les `auto_discover` non contactés avec score ≤ 35.

**Dashboard découverte:** sur `/leads` (pipeline) → bandeau **Découverte auto** : créés aujourd’hui + sparkline 7j, avec téléphone, réponses / taux, score moyen ; tableau par projet si filtre « tous ».

Sur `/leads` → **Import CSV**. Colonnes: `title,company,contact_name,phone,email,website,city,country,source,notes,sales_project`. Téléphone ou email obligatoire.

Sur la fiche lead → **Recherche IA** force une recherche web (site / Instagram / ICE / secteur).

Utiliser `scripts/*whatsapp-test*` puis vérifier :

- Settings AI Agent
- First touch sur un lead test
- Reply → conversation
- Take over / Resume AI
- Relance processor
- Dashboard `/sales` KPIs
