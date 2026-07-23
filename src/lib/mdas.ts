// MDAS (Memorial Delirium Assessment Scale) definition
// 10 items, each scored 0..3 — total range 0..30
// Filled 3 times: BASELINE, H24, H48
//
// NOTE: The `MDAS_ITEMS` array below is the DEFAULT seed.
// In production, items are loaded from the database via `/api/mdas-items`.
// Admins can add/edit/delete/reorder questions and toggle required flag.

export type TimePoint = "BASELINE" | "H24" | "H48";

export const TIME_POINTS: { key: TimePoint; label: string; short: string }[] = [
  { key: "BASELINE", label: "قبل از تزریق (پایه)", short: "پایه" },
  { key: "H24", label: "۲۴ ساعت بعد", short: "۲۴h" },
  { key: "H48", label: "۴۸ ساعت بعد", short: "۴۸h" },
];

// Standard severity levels for the 4 options (0,1,2,3)
export const MDAS_OPTIONS = [
  { value: 0, severity: "none", label: "طبیعی / بدون مشکل" },
  { value: 1, severity: "mild", label: "خفیف" },
  { value: 2, severity: "moderate", label: "متوسط" },
  { value: 3, severity: "severe", label: "شدید" },
];

// Default 10 MDAS questions (used for seeding the database)
export type DefaultMdasItem = {
  key: "q1" | "q2" | "q3" | "q4" | "q5" | "q6" | "q7" | "q8" | "q9" | "q10";
  title: string;
  options: { value: number; severity: "none" | "mild" | "moderate" | "severe"; label: string }[];
};

// Standard 4 options for MDAS questions
export const DEFAULT_OPTIONS = [
  { value: 0, severity: "none", label: "۰ - بدون مشکل / طبیعی" },
  { value: 1, severity: "mild", label: "۱ - خفیف" },
  { value: 2, severity: "moderate", label: "۲ - متوسط" },
  { value: 3, severity: "severe", label: "۳ - شدید" },
];

// Drug dose recommendation table based on MDAS total score
// Per protocol (image from customer):
//   10-15: Olanzapine 2.5mg / Haloperidol 1mg
//   16-22: Olanzapine 5mg   / Haloperidol 2mg
//   23+:   Olanzapine 10mg  / Haloperidol 4mg
export const DRUG_DOSE_TABLE = [
  { minScore: 10, maxScore: 15, olanzapine: "OLANZAPINE_2_5", haloperidol: "HALOPERIDOL_1",
    olanzapineLabel: "اولانزاپین ۲.۵ میلی‌گرم", haloperidolLabel: "هالوپریدول ۱ میلی‌گرم" },
  { minScore: 16, maxScore: 22, olanzapine: "OLANZAPINE_5", haloperidol: "HALOPERIDOL_2",
    olanzapineLabel: "اولانزاپین ۵ میلی‌گرم", haloperidolLabel: "هالوپریدول ۲ میلی‌گرم" },
  { minScore: 23, maxScore: 99, olanzapine: "OLANZAPINE_10", haloperidol: "HALOPERIDOL_4",
    olanzapineLabel: "اولانزاپین ۱۰ میلی‌گرم", haloperidolLabel: "هالوپریدول ۴ میلی‌گرم" },
];

export function recommendDrugDose(totalScore: number, drugType: string): {
  dose: string;
  doseLabel: string;
  range: string;
} | null {
  const row = DRUG_DOSE_TABLE.find((r) => totalScore >= r.minScore && totalScore <= r.maxScore);
  if (!row) return null;
  const isOlanzapine = drugType === "OLANZAPINE";
  const range = row.maxScore === 99 ? `${row.minScore}+` : `${row.minScore}-${row.maxScore}`;
  return {
    dose: isOlanzapine ? row.olanzapine : row.haloperidol,
    doseLabel: isOlanzapine ? row.olanzapineLabel : row.haloperidolLabel,
    range,
  };
}

export const MDAS_ITEMS: DefaultMdasItem[] = [
  {
    key: "q1",
    title: "کاهش سطح هوشیاری (آگاهی)",
    options: [
      { value: 0, severity: "none", label: "آگاه از محیط، تعامل خودانگیخته مناسب" },
      { value: 1, severity: "mild", label: "خفیف — عدم آگاهی از برخی عناصر، با تحریک تعامل می‌کند" },
      { value: 2, severity: "moderate", label: "متوسط — ناآگاه از بیشتر محیط، تعامل ناکامل با تحریک شدید" },
      { value: 3, severity: "severe", label: "شدید — ناآگاه کامل، بدون تعامل خودانگیخته، مصاحبه غیرممکن" },
    ],
  },
  {
    key: "q2",
    title: "گم‌گشتگی (تاریخ، ماه، روز، سال، فصل، طبقه، نام بیمارستان، شهر، استان، کشور)",
    options: [
      { value: 0, severity: "none", label: "بدون اشتباه یا فقط ۱ اشتباه" },
      { value: 1, severity: "mild", label: "خفیف — ۲ تا ۳ اشتباه" },
      { value: 2, severity: "moderate", label: "متوسط — ۴ تا ۵ اشتباه" },
      { value: 3, severity: "severe", label: "شدید — ۶ اشتباه یا بیشتر" },
    ],
  },
  {
    key: "q3",
    title: "اختلال حافظه کوتاه‌مدت (نام ۳ شیء — تکرار بعد از ۱ دقیقه)",
    options: [
      { value: 0, severity: "none", label: "هر ۳ شیء را به یاد می‌آورد" },
      { value: 1, severity: "mild", label: "۲ شیء را به یاد می‌آورد" },
      { value: 2, severity: "moderate", label: "۱ شیء را به یاد می‌آورد" },
      { value: 3, severity: "severe", label: "هیچ‌کدام را به یاد نمی‌آورد" },
    ],
  },
  {
    key: "q4",
    title: "اختلال حافظه عددی (تکرار اعداد به ترتیب و معکوس)",
    options: [
      { value: 0, severity: "none", label: "تکرار ≥۵ عدد به ترتیب و ≥۳ عدد معکوس" },
      { value: 1, severity: "mild", label: "تکرار ≥۵ عدد به ترتیب ولی <۳ عدد معکوس" },
      { value: 2, severity: "moderate", label: "تکرار فقط ۳-۴ عدد به ترتیب، بدون معکوس" },
      { value: 3, severity: "severe", label: "تکرار ≤۳ عدد به ترتیب" },
    ],
  },
  {
    key: "q5",
    title: "کاهش توانایی حفظ و جابه‌جایی توجه",
    options: [
      { value: 0, severity: "none", label: "بدون مشکل — توجه عادی" },
      { value: 1, severity: "mild", label: "خفیف — مشکلات گاه‌به‌گاه، بدون طولانی شدن مصاحبه" },
      { value: 2, severity: "moderate", label: "متوسط — مشکلات مکرر، طولانی شدن مصاحبه" },
      { value: 3, severity: "severe", label: "شدید — مشکلات دائمی، مختل‌کننده مصاحبه" },
    ],
  },
  {
    key: "q6",
    title: "تفکر به هم ریخته (گفتار نامرتبط، بی‌ربط، حاشیه‌پردازی)",
    options: [
      { value: 0, severity: "none", label: "منسجم و هدفمند" },
      { value: 1, severity: "mild", label: "خفیف — گاهی دور از هدف، کمی دشوار" },
      { value: 2, severity: "moderate", label: "متوسط — آشکارا به هم ریخته، مصاحبه طولانی می‌شود" },
      { value: 3, severity: "severe", label: "شدید — معاینه بسیار دشوار یا غیرممکن" },
    ],
  },
  {
    key: "q7",
    title: "آشفتگی ادراکی (توهم، خطاهای حسی)",
    options: [
      { value: 0, severity: "none", label: "هیچ توهم یا خطای حسی" },
      { value: 1, severity: "mild", label: "خفیف — توهمات گذرا (۱-۲ مورد)، بدون رفتار نامناسب" },
      { value: 2, severity: "moderate", label: "متوسط — توهمات مکرر در چند موقعیت، اختلال جزئی" },
      { value: 3, severity: "severe", label: "شدید — توهمات شدید و مکرر با رفتار نامناسب مداوم" },
    ],
  },
  {
    key: "q8",
    title: "هذیان",
    options: [
      { value: 0, severity: "none", label: "بدون هذیان یا تفسیر اشتباه" },
      { value: 1, severity: "mild", label: "خفیف — شکاکیت یا تفسیر اشتباه بدون هذیان واضح" },
      { value: 2, severity: "moderate", label: "متوسط — هذیان‌های گزارش شده یا مشهود، اختلال اندک" },
      { value: 3, severity: "severe", label: "شدید — هذیان‌های مداوم و شدید همراه با رفتار نامناسب" },
    ],
  },
  {
    key: "q9",
    title: "کاهش یا افزایش فعالیت روانی-حرکتی",
    options: [
      { value: 0, severity: "none", label: "طبیعی" },
      { value: 1, severity: "mild", label: "خفیف — کم‌فعالی یا بی‌قراری خفیف" },
      { value: 2, severity: "moderate", label: "متوسط — کم‌فعالی واضح (کندی حرکات) یا بیش‌فعالی (حرکت مداوم)" },
      { value: 3, severity: "severe", label: "شدید — کاتاتونی یا بیش‌فعالی شدید نیازمند محدودیت" },
    ],
  },
  {
    key: "q10",
    title: "آشفتگی چرخه خواب-بیداری (مشاهده مستقیم و گزارش پرستار)",
    options: [
      { value: 0, severity: "none", label: "طبیعی — شب خوب می‌خوابد، روز بیدار می‌ماند" },
      { value: 1, severity: "mild", label: "خفیف — انحراف جزئی (دشواری در به خواب رفتن/خواب‌آلودگی روزانه)" },
      { value: 2, severity: "moderate", label: "متوسط — انحراف متوسط (بیداری‌های مکرر شب، چرت‌های طولانی روز)" },
      { value: 3, severity: "severe", label: "شدید — انحراف شدید (شب نخوابیدن، خواب‌آلودگی مداوم روز)" },
    ],
  },
];

// Severity labels for display
export const SEVERITY_LABELS: Record<string, string> = {
  none: "طبیعی", mild: "خفیف", moderate: "متوسط", severe: "شدید",
};

// For default items: get the 4 options for a given default item key
export function getDefaultOptions() {
  return MDAS_ITEMS[0].options; // all default items share the same option structure
}

// Compute total from an answers map {itemId: value} or {q1: value, q2: value, ...}
export function computeTotalFromAnswers(answers: Record<string, number | null | undefined>): number | null {
  let total = 0;
  let any = false;
  for (const v of Object.values(answers)) {
    if (typeof v === "number" && !Number.isNaN(v)) {
      total += v;
      any = true;
    }
  }
  return any ? total : null;
}

// Legacy helper for old q1-q10 records
export function computeMdasTotal(scores: Partial<Record<string, number | null>>): number | null {
  let total = 0;
  let any = false;
  for (const k of ["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10"]) {
    const v = (scores as any)[k];
    if (typeof v === "number" && !Number.isNaN(v)) {
      total += v;
      any = true;
    }
  }
  return any ? total : null;
}
