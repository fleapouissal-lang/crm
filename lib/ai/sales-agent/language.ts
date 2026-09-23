export type ProspectLanguage =
  | "darija"
  | "ar"
  | "fr"
  | "es"
  | "en"
  | "mixed";

const DARIJA_LATIN =
  /\b(wach|wash|kifach|kifash|bghit|bghiti|bghito|bghina|3andak|3ndi|chno|ach|ash|chhal|makaynch|mzyan|safi|wakha|bzzaf|bzaf|lah|fin|foin|wen|wayn|win|kayn|kaynin|ina|mnin|daba|ghir|hna|hnta|nta|nti|yallah|sba7|mskin|3lach|fayn|fein|ste|sté|cest|barra|kaml|kamal|tqado|nqado|hotel|hôtel|reserv|réserv|site|app|crm|ai|ia)\b/i;

const DARIJA_AR =
  /واش|كيفاش|بغيت|عندك|شحال|ماكاينش|مزيان|صافي|واخا|بزاف|يلاه|دابا|غير|هنا|نتا|نتي/;

const FR_HINT =
  /\b(bonjour|bonsoir|salut|merci|oui|non|svp|s'il vous plaît|je|vous|nous|réponse|prix|devis|rdv|disponible)\b/i;

const ES_HINT =
  /\b(hola|buenas|gracias|por favor|sí|si|no|precio|presupuesto|cita|disponible|usted|ustedes)\b/i;

const EN_HINT =
  /\b(hello|hi|hey|thanks|please|yes|no|price|quote|meeting|available|interested)\b/i;

const ARABIC_SCRIPT = /[\u0600-\u06FF]/;

export function detectProspectLanguage(text: string): ProspectLanguage {
  const raw = (text || "").trim();
  if (!raw) return "fr";

  const hasArabic = ARABIC_SCRIPT.test(raw);
  if (hasArabic && DARIJA_AR.test(raw)) return "darija";
  if (!hasArabic && DARIJA_LATIN.test(raw)) return "darija";
  if (hasArabic) return "ar";

  const scores = {
    fr: FR_HINT.test(raw) ? 2 : 0,
    es: ES_HINT.test(raw) ? 2 : 0,
    en: EN_HINT.test(raw) ? 2 : 0,
  };
  if (/[àâäéèêëïîôùûüç]/i.test(raw)) scores.fr += 2;
  if (/[ñáéíóúü¿¡]/i.test(raw)) scores.es += 2;

  const ranked = (Object.entries(scores) as Array<[Exclude<ProspectLanguage, "darija" | "ar" | "mixed">, number]>)
    .sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] === 0) return "mixed";
  if (ranked[0][1] === ranked[1][1]) return "mixed";
  return ranked[0][0];
}

export function vocalClarifyQuestion(lang: ProspectLanguage, attempt: number): string {
  if (attempt >= 1) {
    switch (lang) {
      case "darija":
        return "مازال ما قدرت نسمع الـ vocal. كتب لي الحاجة بجوج جمل (موقع، تطبيق، أتمتة…) باش نقدر نجاوبك.";
      case "ar":
        return "لم أستطع سماع الرسالة الصوتية. اكتب لي المطلوب بجملتين واضحتين.";
      case "es":
        return "Sigo sin pillar el audio. ¿Me lo escribes en 2 frases (web, app, automatización)?";
      case "en":
        return "Still couldn’t catch the voice note. Can you type the need in 2 short sentences?";
      default:
        return "Je n’ai toujours pas saisi le vocal. Tu peux l’écrire en 2 phrases (site, appli, automatisation) ?";
    }
  }
  switch (lang) {
    case "darija":
      return "ما قدرت نسمع مزيان الـ vocal — تقدر تكتب لي الفكرة بجوج جمل؟";
    case "ar":
      return "لم أسمع الرسالة الصوتية جيداً — هل يمكنك كتابتها في جملتين؟";
    case "es":
      return "No pillé bien el audio — ¿me lo escribes en 2 frases?";
    case "en":
      return "I couldn’t catch the voice note — can you type it in 2 sentences?";
    default:
      return "Je n’ai pas bien saisi le vocal, tu peux l’écrire en 2 phrases ?";
  }
}

export function clarifyQuestion(lang: ProspectLanguage, attempt: number): string {
  if (attempt >= 1) {
    switch (lang) {
      case "darija":
        return "باش ما نغلطش: كتب لي الحاجة بجملة واضحة (موقع، تطبيق، CRM، أتمتة…) وشحال تقريبا الميزانية.";
      case "ar":
        return "للتوضيح فقط: ما الخدمة المطلوبة بالضبط، وما الإطار الزمني؟";
      case "es":
        return "Para no equivocarme: ¿sitio, app o automatización, y para cuándo lo necesitan?";
      case "en":
        return "Just to be sure: is this a website, an app, or automation — and what’s the timeline?";
      default:
        return "Pour être sûr : site, appli ou automatisation — et pour quand en avez-vous besoin ?";
    }
  }
  switch (lang) {
    case "darija":
      return "باش نفهم مزيان: واش كتهضر على موقع، تطبيق، ولا أتمتة؟";
    case "ar":
      return "للتوضيح: هل تقصد موقعاً، تطبيقاً، أم أتمتة؟";
    case "es":
      return "Para entenderte bien: ¿hablas de web, app o automatización?";
    case "en":
      return "Just to understand: is this about a website, an app, or automation?";
    default:
      return "Pour bien comprendre : site, appli, ou automatisation ?";
  }
}

export function briefOrMeetingPrompt(lang: ProspectLanguage): string {
  switch (lang) {
    case "darija":
      return "الثمن كيكون على حساب الحاجة ديالك. تقدر تصيفط ليا cahier des charges / brief، ولا ناخدو RDV قصير باش نفهمو المشروع مزيان؟";
    case "ar":
      return "السعر حسب احتياجك. يمكنك إرسال دفتر الشروط / موجز، أو نحدد موعداً قصيراً لنوضح المشروع؟";
    case "es":
      return "El precio depende de tu necesidad. ¿Me envías un brief / pliego, o agendamos una llamada corta para concretar?";
    case "en":
      return "Pricing depends on your needs. Can you share a brief / requirements doc, or shall we book a short call to scope it?";
    default:
      return "Le tarif dépend de votre besoin. Vous pouvez m’envoyer un cahier des charges / brief, ou on prend un RDV court pour cadrer ?";
  }
}

export function languageInstruction(lang: ProspectLanguage): string {
  switch (lang) {
    case "darija":
      return [
        "Réponds UNIQUEMENT en darija marocaine franco-arabe (latin), style WhatsApp terrain.",
        "Naturel, court, humain — PAS un mélange bizarre français littéraire + darija + emoji.",
        "Évite : « Ah d'accord ! 😊 », phrases trop longues, franglais cassé.",
        "Préfère : 2 phrases max + 1 question. Exemple de ton : « Hna Fusion Leap f Marrakech. Kankhdmo digital o AI m3a des entreprises f Maroc o barra. Chno bghiti n3awno fik ? »",
        "« ste / sté / cest » = « c'est », JAMAIS une société appelée STE.",
      ].join(" ");
    case "ar":
      return "أجب بالعربية الفصحى البسيطة الواضحة فقط، بأسلوب واتساب قصير وطبيعي.";
    case "es":
      return "Responde ÚNICAMENTE en español, tono WhatsApp natural y corto.";
    case "en":
      return "Reply ONLY in English, short natural WhatsApp tone.";
    case "fr":
      return [
        "Réponds UNIQUEMENT en français WhatsApp pro, court et naturel.",
        "Pas d’emoji excessifs, pas de darija mélangé si le prospect écrit en français.",
        "2–3 phrases max + une question.",
        "« ste » en message mixte = souvent « c’est », pas une entreprise STE.",
      ].join(" ");
    default:
      return "Détecte la langue dominante du dernier message prospect et réponds STRICTEMENT dans cette même langue (darija / arabe / français / espagnol / anglais). Ne mélange pas les langues.";
  }
}

/** Normalize common latin-darija typos before LLM / intent checks. */
export function normalizeDarijaLatin(text: string): string {
  return String(text || "")
    .replace(/\bfoin\b/gi, "fin")
    .replace(/\bfein\b/gi, "fin")
    .replace(/\bfayn\b/gi, "fin")
    .replace(/\bwayn\b/gi, "fin")
    .replace(/\bwen\b/gi, "fin")
    .replace(/\bwin\b/gi, "fin")
    .replace(/\bkayn\b/gi, "kaynin")
    // "ste" / "sté" / "cest" = c'est (PAS un nom d'entreprise)
    .replace(/\bste\b/gi, "c'est")
    .replace(/\bsté\b/gi, "c'est")
    .replace(/\bcest\b/gi, "c'est")
    .replace(/\bc est\b/gi, "c'est")
    .replace(/\bbghito\b/gi, "bghiti")
    .replace(/\btqado\b/gi, "nqado")
    .replace(/\bkaml\b/gi, "kamel")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Short FR gloss to help the model understand latin-darija before answering.
 * Not shown to the prospect — only injected in the LLM prompt.
 */
export function glossProspectMessage(text: string): string {
  const raw = normalizeDarijaLatin(text);
  const hints: string[] = [];
  if (isLocationAsk(raw)) hints.push("demande OÙ on est basé / quelle ville");
  if (/\b(chno|ach|ash)\b/i.test(raw)) hints.push("demande QUOI / quel besoin");
  if (/\b(wach|wash)\b/i.test(raw)) hints.push("question oui/non (wach…)");
  if (/\b(chhal|ثمن|prix|tarif|combien|budget)\b/i.test(raw))
    hints.push("demande de PRIX → pas de montant, brief ou RDV");
  if (/\b(bghit|bghiti|bghina)\b/i.test(raw)) hints.push("exprime un SOUHAIT / besoin");
  if (/\b(rdv|rendez|meeting|visio|appel)\b/i.test(raw)) hints.push("parle de RDV / appel");
  if (/\b(site|lpage|page|app|crm|ai|ia|automat)\b/i.test(raw))
    hints.push("besoin digital / outil");
  if (/\b(hotel|hôtel|immo|agence|reservation|réserv)\b/i.test(raw))
    hints.push("contexte hôtel / immobilier");
  if (/\b(merci|ok|safi|mzyan|wakha)\b/i.test(raw)) hints.push("accusé positif / accord");
  if (!hints.length) hints.push("lire le message littéralement et répondre à la question posée");
  return `Message normalisé: « ${raw} ». Lecture probable: ${hints.join(" · ")}.`;
}

/** Prospect asks where we / the business is based. */
export function isLocationAsk(text: string): boolean {
  const t = normalizeDarijaLatin(text).toLowerCase();
  return (
    /\b(fin|kaynin|ina\s*ville|quelle?\s*ville|où\s*(êtes|etes|vous|êtes-vous|etes-vous)|where\s*(are|you)|location|adresse)\b/i.test(
      t
    ) || /فين|وين|كاينين|فين كاين/.test(text)
  );
}

export function locationAnswer(
  lang: ProspectLanguage,
  _project: string,
  prospectCity?: string | null
): string {
  const city = (prospectCity || "").trim();
  const cityBit =
    city && lang === "darija"
      ? ` Nti f ${city} —`
      : city && lang === "fr"
        ? ` Vous êtes à ${city} —`
        : "";
  switch (lang) {
    case "darija":
      return `Hna Fusion Leap, société digitale f Marrakech. Kankhdmo m3a les entreprises f Maroc o international (digital + AI). Evana o Autolog = projets dyalna.${cityBit} Chno bghiti n3awno fik ?`;
    case "ar":
      return `نحن Fusion Leap في مراكش. نعمل مع شركات في المغرب وعلى المستوى الدولي (رقمي + ذكاء اصطناعي). Evana و Autolog من مشاريعنا.${city ? ` أنتم في ${city}.` : ""} كيف نقدر نساعدكم؟`;
    default:
      return `Fusion Leap — société digitale à Marrakech. On accompagne des entreprises au Maroc et à l’international (digital + IA). Evana et Autolog font partie de nos projets.${city ? ` Vous êtes à ${city}.` : ""} Sur quoi puis-je vous aider concrètement ?`;
  }
}

export function randomIntInclusive(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/** Casablanca local hour 0-23 */
export function casablancaHour(date = new Date()): number {
  const hourStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Casablanca",
    hour: "numeric",
    hour12: false,
  }).format(date);
  return Number(hourStr) % 24;
}

/** Start of today in Africa/Casablanca as UTC Date */
export function casablancaDayStart(date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return new Date(`${ymd}T00:00:00+01:00`);
}

/** Next occurrence of Casablanca local hour:minute from `from` (today or tomorrow) */
export function casablancaWallTime(hour: number, minute = 0, from = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(from);
  let target = new Date(
    `${ymd}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+01:00`
  );
  if (target.getTime() <= from.getTime()) {
    const next = new Date(from.getTime() + 24 * 3600_000);
    const ymd2 = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Casablanca",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(next);
    target = new Date(
      `${ymd2}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+01:00`
    );
  }
  return target;
}

export function isWithinSendWindow(
  startHour: number,
  endHour: number,
  date = new Date()
): boolean {
  const h = casablancaHour(date);
  if (startHour === endHour) return true;
  if (startHour < endHour) return h >= startHour && h < endHour;
  return h >= startHour || h < endHour;
}
