export type ProspectLanguage =
  | "darija"
  | "ar"
  | "fr"
  | "es"
  | "en"
  | "mixed";

const DARIJA_LATIN =
  /\b(wach|wash|kifach|kifash|bghit|bghiti|3andak|3ndi|chno|chhal|makaynch|mzyan|safi|wakha|bzzaf|lah|rjal|l3ibat|fin|foin|wen|wayn|win|kayn|kaynin|kaynin|ina|mnin|daba|ghir|hna|hnta|nta|nti|yallah|sba7|mskin|bghina|bghit|ach|ash|3lach|3lach|fayn|fein)\b/i;

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
      return "Réponds UNIQUEMENT en darija marocaine (arabe dialectal). Style WhatsApp naturel, pas classique MSA. Tu peux écrire en alphabet arabe OU en latin (franco-arabe) en suivant le style du prospect.";
    case "ar":
      return "أجب بالعربية الفصحى البسيطة الواضحة فقط، بأسلوب واتساب قصير وطبيعي.";
    case "es":
      return "Responde ÚNICAMENTE en español, tono WhatsApp natural y corto.";
    case "en":
      return "Reply ONLY in English, short natural WhatsApp tone.";
    case "fr":
      return "Réponds UNIQUEMENT en français, ton WhatsApp naturel et court.";
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
    .replace(/\s+/g, " ")
    .trim();
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
      return `Hna Fusion Leap, société digitale f Marrakech, Maroc. Kankhdmo m3a les entreprises f Maroc o international. Digital + AI (sites, apps, CRM, automatisation…). Evana o Autolog projets mn bin les projets dyalna.${cityBit} chno bghiti n3awno fik ?`;
    case "ar":
      return `نحن Fusion Leap، شركة رقمية في مراكش، المغرب. نعمل مع شركات في المغرب وعلى المستوى الدولي. الرقمي والذكاء الاصطناعي. Evana و Autolog من مشاريعنا.${city ? ` أنتم في ${city}.` : ""} كيف يمكننا مساعدتكم؟`;
    default:
      return `On est Fusion Leap — société digitale basée à Marrakech, Maroc. On travaille avec des entreprises au Maroc et à l’international. Digital + IA. Evana et Autolog font partie de nos projets.${city ? ` Vous êtes à ${city}.` : ""} Je peux vous aider sur quoi concrètement ?`;
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
