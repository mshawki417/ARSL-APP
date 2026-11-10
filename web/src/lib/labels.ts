/**
 * Class labels — ported 1:1 from the desktop app (labels.py / labels_words.py).
 * The ORDER IS THE MODEL'S OUTPUT INDEX. Do not reorder.
 */

export type SignKind = "letter" | "word";

export interface SignClass {
  /** Stable unique id, e.g. "letter:3" or "word:2". */
  id: string;
  kind: SignKind;
  /** Index in the model's output vector. */
  index: number;
  ar: string;
  en: string;
}

// index -> [arabic, english]   (31 classes; alphabetical by dataset folder name)
const LETTERS: [string, string][] = [
  ["ع", "Ain"],
  ["ال", "Al"],
  ["أ", "Alef"],
  ["ب", "Beh"],
  ["ض", "Dad"],
  ["د", "Dal"],
  ["ف", "Feh"],
  ["غ", "Ghain"],
  ["ح", "Hah"],
  ["ه", "Heh"],
  ["ج", "Jeem"],
  ["ك", "Kaf"],
  ["خ", "Khah"],
  ["لا", "Laa"],
  ["ل", "Lam"],
  ["م", "Meem"],
  ["ن", "Noon"],
  ["ق", "Qaf"],
  ["ر", "Reh"],
  ["ص", "Sad"],
  ["س", "Seen"],
  ["ش", "Sheen"],
  ["ط", "Tah"],
  ["ت", "Teh"],
  ["ة", "Teh Marbuta"],
  ["ذ", "Thal"],
  ["ث", "Theh"],
  ["و", "Waw"],
  ["ي", "Yeh"],
  ["ظ", "Zah"],
  ["ز", "Zain"],
];

// index -> [arabic, english]   (32 classes; Yemeni Arabic Sign Language words)
const WORDS: [string, string][] = [
  ["حيوانات", "Animals"],
  ["منتبه", "Attentive"],
  ["دكتور", "Doctor"],
  ["أخ", "Brother"],
  ["بنّاء", "Builder"],
  ["رخيص", "Cheap"],
  ["ممتاز", "Excellent"],
  ["صديق", "Friend"],
  ["جيد", "Good"],
  ["هو", "Him"],
  ["كيف", "How"],
  ["زوج", "Husband"],
  ["ميكانيكي", "Mechanic"],
  ["صباح", "Morning"],
  ["طيارة", "Plane"],
  ["رئيس", "President"],
  ["رضا", "Satisfaction"],
  ["مدرسة", "School"],
  ["سبعة", "Seven"],
  ["ستة", "Six"],
  ["معلم", "Teacher"],
  ["مترجم", "Translator"],
  ["خضروات", "Vegetables"],
  ["جيد جداً", "Very good"],
  ["انتظر", "Wait"],
  ["اغسل", "Wash"],
  ["صانع ساعات", "Watch maker"],
  ["ماذا", "What"],
  ["متى", "When"],
  ["من", "Who"],
  ["بإذن الله", "God willing"],
  ["لك", "Yours"],
];

export const LETTER_CLASSES: SignClass[] = LETTERS.map(([ar, en], index) => ({
  id: `letter:${index}`,
  kind: "letter",
  index,
  ar,
  en,
}));

export const WORD_CLASSES: SignClass[] = WORDS.map(([ar, en], index) => ({
  id: `word:${index}`,
  kind: "word",
  index,
  ar,
  en,
}));

export const NUM_LETTERS = LETTER_CLASSES.length; // 31
export const NUM_WORDS = WORD_CLASSES.length; // 32

if (NUM_LETTERS !== 31 || NUM_WORDS !== 32) {
  throw new Error("Label tables out of sync with the trained models");
}

export const ALL_CLASSES: SignClass[] = [...LETTER_CLASSES, ...WORD_CLASSES];

const BY_ID = new Map(ALL_CLASSES.map((c) => [c.id, c]));

export function classById(id: string): SignClass | undefined {
  return BY_ID.get(id);
}

export function classOf(kind: SignKind, index: number): SignClass {
  return kind === "letter" ? LETTER_CLASSES[index] : WORD_CLASSES[index];
}
