"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { load, save } from "./storage";
import { landAr, landEn } from "./i18n-landing";

export type Lang = "ar" | "en";

type Dict = Record<string, string>;

const ar: Dict = {
  "app.title": "مترجم لغة الإشارة العربية",
  "app.tagline": "من الإشارة إلى الكلمة… في لحظات",
  "app.by": "تطوير",
  "common.start": "ابدأ",
  "common.back": "رجوع",
  "common.home": "الرئيسية",
  "common.retry": "إعادة المحاولة",
  "common.letters": "حروف",
  "common.words": "كلمات",
  "common.letter": "حرف",
  "common.word": "كلمة",
  "common.on": "تشغيل",
  "common.off": "إيقاف",
  "common.ms": "مللي ثانية",

  "intro.cta": "ابدأ التجربة",
  "intro.chip.letters": "{n} حرفًا عربيًا",
  "intro.chip.words": "{n} كلمة بلغة الإشارة",
  "intro.chip.private": "يعمل على جهازك — الفيديو لا يغادره",
  "intro.loading": "جارٍ تجهيز الذكاء الاصطناعي…",
  "intro.ready": "الذكاء الاصطناعي جاهز",
  "intro.hint": "اضغط Enter للبدء · F للشاشة الكاملة",
  "intro.supervised": "بإشراف",

  "hub.title": "اختر تجربتك",
  "hub.live": "التعرف المباشر",
  "hub.live.desc": "اعمل إشارة أمام الكاميرا وشاهد الترجمة والنطق فورًا",
  "hub.challenge": "تحدي الإشارات",
  "hub.challenge.desc": "نقاط ومستويات وسلاسل نجاح — هل تقدر تجمع النجوم؟",
  "hub.stats": "لوحة الإحصائيات",
  "hub.stats.desc": "السرعة والدقة وألبوم الإشارات التي اكتشفتها",
  "hub.tech": "كيف يعمل؟",
  "hub.tech.desc": "رحلة الإشارة من الكاميرا إلى الكلمة في 5 خطوات",
  "hub.album": "ألبوم الإشارات",
  "hub.keys": "اختصارات: 1 مباشر · 2 تحدي · 3 إحصائيات · 4 شرح · Esc للرئيسية",

  "engine.loading": "جارٍ تحميل النماذج…",
  "engine.error": "تعذّر تحميل النماذج",
  "engine.hands.error": "تعذّر تحميل نموذج اليد. يلزم اتصال بالإنترنت أول مرة.",
  "engine.waiting": "النماذج ما زالت تُحمَّل، لحظات…",

  "cam.starting": "جارٍ تشغيل الكاميرا…",
  "cam.denied": "تم رفض إذن الكاميرا. اسمح بالوصول من إعدادات المتصفح ثم أعد المحاولة.",
  "cam.nocam": "لم يتم العثور على كاميرا. وصّل كاميرا ثم أعد المحاولة.",
  "cam.busy": "الكاميرا مستخدمة من تطبيق آخر. أغلقه ثم أعد المحاولة.",
  "cam.error": "تعذّر تشغيل الكاميرا",
  "cam.insecure": "الكاميرا تحتاج اتصالًا آمنًا (HTTPS).",
  "cam.select": "الكاميرا",
  "cam.nohand": "ارفع يدك أمام الكاميرا ✋",

  "live.title": "التعرف المباشر",
  "live.mode.both": "الكل",
  "live.mode.alphabet": "حروف",
  "live.mode.words": "كلمات",
  "live.sensitivity": "الحساسية",
  "live.detected": "الإشارة المكتشفة",
  "live.waiting": "في انتظار إشارة…",
  "live.confidence": "الثقة",
  "live.hold": "اثبت الإشارة لإضافتها",
  "live.sentence": "الجملة",
  "live.sentence.empty": "ستظهر الإشارات التي تضيفها هنا",
  "live.add": "أضف",
  "live.space": "مسافة",
  "live.back": "حذف",
  "live.clear": "مسح",
  "live.speak": "انطق",
  "live.autospeak": "نطق تلقائي",
  "live.nonvoice": "لا يوجد صوت عربي على هذا الجهاز — جرّب Chrome أو Edge.",
  "live.stable": "ثابتة",
  "live.hands": "الأيدي",

  "ch.title": "تحدي الإشارات",
  "ch.pick": "اختر المستوى",
  "ch.l1": "المستوى 1 · حروف",
  "ch.l1.desc": "8 حروف عشوائية",
  "ch.l2": "المستوى 2 · كلمات",
  "ch.l2.desc": "8 كلمات عشوائية",
  "ch.l3": "المستوى 3 · مزيج",
  "ch.l3.desc": "10 إشارات من الاثنين",
  "ch.best": "أفضل نتيجة",
  "ch.howto": "اعمل الإشارة المطلوبة واثبت عليها. كلما كنت أسرع زادت النقاط، وسلسلة النجاح تضاعفها.",
  "ch.hintnote": "التلميح يظهر بعد أن يتعرّف التطبيق على الإشارة مرة واحدة على الأقل (جرّبها في التعرف المباشر).",
  "ch.get_ready": "استعد…",
  "ch.target": "اعمل هذه الإشارة",
  "ch.roundShort": "الجولة",
  "ch.score": "النقاط",
  "ch.streak": "سلسلة",
  "ch.skip": "تخطّي",
  "ch.hint": "تلميح",
  "ch.nohint": "لا يوجد تلميح بعد لهذه الإشارة. جرّبها في التعرف المباشر أولاً أو أضف صورة.",
  "ch.hold": "اثبت!",
  "ch.great": "ممتاز!",
  "ch.timeup": "انتهى الوقت",
  "ch.seeing": "يرى التطبيق",
  "ch.result": "النتيجة",
  "ch.solved": "إشارات صحيحة",
  "ch.accuracy": "الدقة",
  "ch.bestStreak": "أطول سلسلة",
  "ch.newbest": "رقم قياسي جديد! 🎉",
  "ch.again": "العب مرة أخرى",
  "ch.menu": "قائمة المستويات",
  "ch.bonus": "مكافأة السرعة",
  "ch.mult": "مضاعف",

  "st.title": "لوحة الإحصائيات",
  "st.live": "الأداء المباشر",
  "st.empty": "ابدأ التعرف المباشر لتظهر الأرقام هنا.",
  "st.fps": "إطار/ثانية",
  "st.mediapipe": "اكتشاف اليد",
  "st.words": "نموذج الكلمات",
  "st.alphabet": "نموذج الحروف",
  "st.total": "الزمن الكلي للإطار",
  "st.conf": "ثقة التعرف عبر الزمن",
  "st.recognitions": "إشارات تم تأكيدها",
  "st.frames": "إطارات تمت معالجتها",
  "st.backend": "المحرك",
  "st.load": "زمن التحميل",
  "st.privacy": "الخصوصية",
  "st.privacy.v": "كل المعالجة تتم داخل المتصفح. لا يتم رفع أي فيديو أو صور إلى أي خادم.",
  "st.models": "النماذج",
  "st.album": "ألبوم الإشارات",
  "st.album.reset": "تصفير الألبوم",
  "st.classes": "{n} فئة",
  "st.mb": "{n} ميجابايت",

  "tech.title": "كيف يعمل؟",
  "tech.sub": "رحلة الإشارة في خمس خطوات",
  "tech.s1.t": "الكاميرا",
  "tech.s1.d": "يلتقط المتصفح الفيديو مباشرة من كاميرتك. لا يُرسل أي شيء إلى الإنترنت.",
  "tech.s2.t": "اكتشاف اليد",
  "tech.s2.d": "نموذج MediaPipe يجد اليدين ويحدد 21 نقطة مفصلية لكل يد.",
  "tech.s3.t": "نموذجان متخصصان",
  "tech.s3.d": "نموذج صور (EfficientNetB0) يقرأ شكل اليد للحروف، ونموذج خفيف يقرأ هندسة النقاط للكلمات.",
  "tech.s4.t": "الأعلى ثقة يفوز",
  "tech.s4.d": "يتم دمج النتيجتين مع تنعيم زمني، فلا تتذبذب الترجمة بين إطار وآخر.",
  "tech.s5.t": "نص وصوت",
  "tech.s5.d": "تتحول الإشارة إلى نص عربي، ويمكن نطقه بصوت عربي مباشرة.",
  "tech.why": "لماذا هذا مهم؟",
  "tech.w1": "الخصوصية: لا يغادر الفيديو الجهاز، فلا يوجد تخزين أو نقل لصور المستخدمين.",
  "tech.w2": "السرعة: الاستجابة خلال أجزاء من الثانية بدون خادم أو اتصال مستمر.",
  "tech.w3": "التكلفة: لا حاجة لخوادم معالجة؛ الموقع يُستضاف كملف ثابت.",
  "tech.w4": "المرونة: إضافة كلمات جديدة تعني إعادة تدريب نموذج الكلمات الصغير فقط (≈1.2 ميجابايت).",
  "tech.stack": "التقنيات",
  "tech.live": "أرقام حية من هذه الجلسة",
  "tech.credits": "طُوّر تحت إشراف الأكاديمية العسكرية المصرية بالتعاون مع DiGiLiANS. نموذج الكلمات مدرَّب على قاعدة بيانات KArSL-502، ونموذج الحروف على قاعدة بيانات RGB Arabic Alphabets Sign Language (Al-Barham وآخرون، 2023).",
};

const en: Dict = {
  "app.title": "Arabic Sign Language Translator",
  "app.tagline": "From a sign to a word — in an instant",
  "app.by": "By",
  "common.start": "Start",
  "common.back": "Back",
  "common.home": "Home",
  "common.retry": "Try again",
  "common.letters": "Letters",
  "common.words": "Words",
  "common.letter": "Letter",
  "common.word": "Word",
  "common.on": "On",
  "common.off": "Off",
  "common.ms": "ms",

  "intro.cta": "Start the experience",
  "intro.chip.letters": "{n} Arabic letters",
  "intro.chip.words": "{n} sign-language words",
  "intro.chip.private": "Runs on your device — video never leaves it",
  "intro.loading": "Getting the AI ready…",
  "intro.ready": "AI is ready",
  "intro.hint": "Press Enter to start · F for fullscreen",
  "intro.supervised": "Under the supervision of",

  "hub.title": "Choose your experience",
  "hub.live": "Live recognition",
  "hub.live.desc": "Sign in front of the camera and see the translation and speech instantly",
  "hub.challenge": "Sign challenge",
  "hub.challenge.desc": "Points, levels and streaks — can you collect all the stars?",
  "hub.stats": "Stats dashboard",
  "hub.stats.desc": "Speed, accuracy and the album of signs you have discovered",
  "hub.tech": "How it works",
  "hub.tech.desc": "A sign's journey from camera to word in 5 steps",
  "hub.album": "Sign album",
  "hub.keys": "Shortcuts: 1 live · 2 challenge · 3 stats · 4 how · Esc home",

  "engine.loading": "Loading models…",
  "engine.error": "Could not load the models",
  "engine.hands.error": "Could not load the hand model. An internet connection is needed the first time.",
  "engine.waiting": "Models are still loading, one moment…",

  "cam.starting": "Starting camera…",
  "cam.denied": "Camera permission was denied. Allow it in your browser settings, then try again.",
  "cam.nocam": "No camera found. Connect one and try again.",
  "cam.busy": "The camera is in use by another app. Close it and try again.",
  "cam.error": "Could not start the camera",
  "cam.insecure": "The camera needs a secure connection (HTTPS).",
  "cam.select": "Camera",
  "cam.nohand": "Raise your hand to the camera ✋",

  "live.title": "Live recognition",
  "live.mode.both": "Both",
  "live.mode.alphabet": "Letters",
  "live.mode.words": "Words",
  "live.sensitivity": "Sensitivity",
  "live.detected": "Detected sign",
  "live.waiting": "Waiting for a sign…",
  "live.confidence": "Confidence",
  "live.hold": "Hold the sign to add it",
  "live.sentence": "Sentence",
  "live.sentence.empty": "Signs you add will appear here",
  "live.add": "Add",
  "live.space": "Space",
  "live.back": "Delete",
  "live.clear": "Clear",
  "live.speak": "Speak",
  "live.autospeak": "Auto-speak",
  "live.nonvoice": "No Arabic voice on this device — try Chrome or Edge.",
  "live.stable": "Stable",
  "live.hands": "Hands",

  "ch.title": "Sign challenge",
  "ch.pick": "Pick a level",
  "ch.l1": "Level 1 · Letters",
  "ch.l1.desc": "8 random letters",
  "ch.l2": "Level 2 · Words",
  "ch.l2.desc": "8 random words",
  "ch.l3": "Level 3 · Mixed",
  "ch.l3.desc": "10 signs from both",
  "ch.best": "Best score",
  "ch.howto": "Make the requested sign and hold it. The faster you are, the more points; a streak multiplies them.",
  "ch.hintnote": "The hint appears once the app has recognised that sign at least once (try it in Live recognition).",
  "ch.get_ready": "Get ready…",
  "ch.target": "Make this sign",
  "ch.roundShort": "Round",
  "ch.score": "Score",
  "ch.streak": "Streak",
  "ch.skip": "Skip",
  "ch.hint": "Hint",
  "ch.nohint": "No hint for this sign yet. Try it in Live recognition first, or add a photo.",
  "ch.hold": "Hold it!",
  "ch.great": "Great!",
  "ch.timeup": "Time's up",
  "ch.seeing": "The app sees",
  "ch.result": "Result",
  "ch.solved": "Signs solved",
  "ch.accuracy": "Accuracy",
  "ch.bestStreak": "Best streak",
  "ch.newbest": "New record! 🎉",
  "ch.again": "Play again",
  "ch.menu": "Level menu",
  "ch.bonus": "Speed bonus",
  "ch.mult": "Multiplier",

  "st.title": "Stats dashboard",
  "st.live": "Live performance",
  "st.empty": "Start Live recognition and the numbers will show up here.",
  "st.fps": "frames/sec",
  "st.mediapipe": "Hand detection",
  "st.words": "Words model",
  "st.alphabet": "Letters model",
  "st.total": "Total time per frame",
  "st.conf": "Recognition confidence over time",
  "st.recognitions": "Signs confirmed",
  "st.frames": "Frames processed",
  "st.backend": "Engine",
  "st.load": "Load time",
  "st.privacy": "Privacy",
  "st.privacy.v": "All processing happens inside the browser. No video or images are uploaded to any server.",
  "st.models": "Models",
  "st.album": "Sign album",
  "st.album.reset": "Reset album",
  "st.classes": "{n} classes",
  "st.mb": "{n} MB",

  "tech.title": "How it works",
  "tech.sub": "A sign's journey in five steps",
  "tech.s1.t": "Camera",
  "tech.s1.d": "The browser captures video straight from your camera. Nothing is sent to the internet.",
  "tech.s2.t": "Hand detection",
  "tech.s2.d": "A MediaPipe model finds both hands and marks 21 joint points on each.",
  "tech.s3.t": "Two specialist models",
  "tech.s3.d": "An image model (EfficientNetB0) reads hand shape for letters; a light model reads point geometry for words.",
  "tech.s4.t": "Highest confidence wins",
  "tech.s4.d": "Both results are merged with temporal smoothing so the translation doesn't flicker between frames.",
  "tech.s5.t": "Text & voice",
  "tech.s5.d": "The sign becomes Arabic text and can be spoken aloud in Arabic.",
  "tech.why": "Why it matters",
  "tech.w1": "Privacy: video never leaves the device, so no user images are stored or transmitted.",
  "tech.w2": "Speed: responses within a fraction of a second, no server or constant connection.",
  "tech.w3": "Cost: no processing servers; the site is hosted as static files.",
  "tech.w4": "Flexibility: adding new words means retraining only the small words model (≈1.2 MB).",
  "tech.stack": "Technology",
  "tech.live": "Live numbers from this session",
  "tech.credits": "Developed under the supervision of the Egyptian Military Academy in collaboration with DiGiLiANS. The words model is trained on KArSL-502; the letters model on the RGB Arabic Alphabets Sign Language dataset (Al-Barham et al., 2023).",
};

const DICTS: Record<Lang, Dict> = { ar: { ...ar, ...landAr }, en: { ...en, ...landEn } };

interface I18n {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Number formatting — Western digits in both languages for readability. */
  n: (v: number, digits?: number) => string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const saved = load<Lang>("lang", "ar");
    if (saved === "en" || saved === "ar") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    save("lang", l);
  }, []);

  const value = useMemo<I18n>(() => {
    const dict = DICTS[lang];
    return {
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang,
      t: (key, params) => {
        let s = dict[key] ?? DICTS.en[key] ?? key;
        if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
        return s;
      },
      n: (v, digits = 0) => v.toFixed(digits),
    };
  }, [lang, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used inside <I18nProvider>");
  return v;
}
