import type { MarketingDictionary } from "./fr";

export const marketingAr: MarketingDictionary = {
  nav: {
    pricing: "الأسعار",
    about: "حول",
    faq: "الأسئلة",
    contact: "اتصل",
    login: "تسجيل الدخول",
    signup: "ابدأ",
  },
  pricing: {
    metaTitle: "الأسعار",
    title: "أسعار بسيطة،",
    titleAccent: "شهر مجاني",
    subtitle:
      "جرّب Fusion Leap CRM مجاناً لمدة 30 يوماً. ثم اختر الباقة المناسبة لفريقك.",
    trialBadge: "شهر مجاني",
    trialNote: "بدون بطاقة بنكية · إلغاء في أي وقت",
    perMonth: "/ شهر",
    popular: "الأكثر شعبية",
    cta: "ابدأ التجربة المجانية",
    ctaContact: "اتصل بالمبيعات",
    packs: {
      starter: {
        name: "أساسي",
        price: "29",
        description: "للفرق الصغيرة في البداية.",
        features: [
          "حتى 5 مستخدمين",
          "Leads & pipeline",
          "العملاء والجهات",
          "Kanban المهام",
          "دعم بالبريد",
        ],
      },
      business: {
        name: "Business",
        price: "79",
        description: "للفرق التجارية النامية.",
        features: [
          "حتى 25 مستخدماً",
          "كل الأساسي +",
          "عروض وفواتير",
          "تقارير وتحليلات",
          "أدوار وصلاحيات",
          "دعم أولوي",
        ],
      },
      enterprise: {
        name: "Enterprise",
        price: "149",
        description: "multi-STE، حوكمة وتوسع.",
        features: [
          "مستخدمون غير محدودين",
          "كل Business +",
          "multi-entreprises (STE)",
          "CRM معزول لكل شركة",
          "إدارة عالمية",
          "مدير حساب مخصص",
        ],
      },
    },
  },
  about: {
    metaTitle: "حول",
    title: "Fusion Leap",
    subtitle: "Intelligent Systems. Limitless Impact.",
    intro:
      "Fusion Leap تبني أنظمة ذكية للشركات التي تحتاج CRM حديثاً multi-tenant جاهز للنمو.",
    missionTitle: "مهمتنا",
    mission:
      "منح كل شركة مساحة CRM مخصصة وآمنة وأنيقة — على منصة عالمية واحدة.",
    valuesTitle: "ما يميزنا",
    values: [
      {
        title: "Multi-entreprises",
        text: "Fusion Leap و Autolog وكل STE لها CRM معزول.",
      },
      {
        title: "صلاحيات حسب الدور",
        text: "مدير، gérant، commercial، dev — كل واحد يرى ما يحتاج.",
      },
      {
        title: "تصميم premium",
        text: "تجربة سريعة وأنيقة مbuilt للميدان.",
      },
    ],
  },
  faq: {
    metaTitle: "الأسئلة",
    title: "الأسئلة الشائعة",
    subtitle:
      "أساسيات Fusion Leap CRM — التجربة، الأسعار، multi-entreprises والدعم.",
    contactPrompt: "لم تجد إجابتك؟",
    contactLink: "تواصل معنا",
    items: [
      {
        q: "كيف تعمل التجربة المجانية؟",
        a: "30 يوماً وصول كامل للباقة المختارة، بدون بطاقة بنكية. في النهاية تستمر، تغيّر الباقة أو تتوقف — بياناتك قابلة للتصدير.",
      },
      {
        q: "هل يمكن إدارة عدة شركات (STE)؟",
        a: "نعم. باقة Enterprise تتيح إنشاء STEs متعددة (Fusion Leap، Autolog، إلخ) مع CRM معزول لكل واحدة.",
      },
      {
        q: "هل البيانات معزولة بين الشركات؟",
        a: "نعم. كل STE لها مساحة خاصة مع قواعد وصول على الخادم. المستخدم يرى بيانات منظمته فقط.",
      },
      {
        q: "هل يمكن تغيير الباقة في أي وقت؟",
        a: "نعم. الترقية فورية مع فوترة pro-rata. التخفيض عند التجديد التالي. أسعار شهرية بدون رسوم مخفية.",
      },
      {
        q: "كيف تعمل الأدوار والصلاحيات؟",
        a: "المدير و gérant يصلون للمالية والإدارة. المبيعات والتقني يرون الوحدات المخصصة لهم — قابلة للتخصيص لكل STE.",
      },
      {
        q: "كيف أتواصل مع الدعم؟",
        a: "عبر صفحة Contact أو contact@fusionleap.com. الرد خلال 24 ساعة عمل. demo موجه وعروض مخصصة متاحة.",
      },
    ],
  },
  contact: {
    metaTitle: "اتصل",
    title: "تواصل معنا",
    subtitle: "سؤال، demo أو عرض مخصص — نرد خلال 24 ساعة.",
    name: "الاسم الكامل",
    email: "البريد المهني",
    company: "الشركة",
    message: "الرسالة",
    send: "إرسال",
    infoTitle: "معلومات الاتصال",
    emailLabel: "البريد",
    emailValue: "contact@fusionleap.com",
    hoursTitle: "الساعات",
    hoursValue: "الإثنين – الجمعة، 9 – 18 (GMT+1)",
  },
  footer: {
    rights: "جميع الحقوق محفوظة.",
  },
};
