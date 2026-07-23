// Default form items - all fields across all categories and time points
// Used to seed the FormItem table

export type DefaultFormItem = {
  key: string;
  title: string;
  description?: string;
  category: "demographic" | "clinical" | "concomitant" | "safety" | "mdas" | "outcome";
  fieldType: "text" | "number" | "radio" | "select" | "checkbox" | "date" | "textarea";
  options?: { value: string | number; severity?: string; label: string }[];
  timePoints: string; // comma-separated
  required: boolean;
  order: number;
};

export const DEFAULT_FORM_ITEMS: DefaultFormItem[] = [
  // ============ Demographic (BASELINE only) ============
  { key: "fullName", title: "نام و نام خانوادگی", category: "demographic", fieldType: "text",
    timePoints: "BASELINE", required: true, order: 1 },
  { key: "nationalId", title: "کد ملی", category: "demographic", fieldType: "text",
    timePoints: "BASELINE", required: true, order: 2 },
  { key: "gender", title: "جنسیت", category: "demographic", fieldType: "radio",
    options: [{ value: "MALE", label: "مرد" }, { value: "FEMALE", label: "زن" }],
    timePoints: "BASELINE", required: true, order: 3 },
  { key: "age", title: "سن (سال)", category: "demographic", fieldType: "number",
    timePoints: "BASELINE", required: true, order: 4 },
  { key: "phone", title: "شماره تماس", category: "demographic", fieldType: "text",
    timePoints: "BASELINE", required: false, order: 5 },
  { key: "address", title: "آدرس", category: "demographic", fieldType: "textarea",
    timePoints: "BASELINE", required: false, order: 6 },
  { key: "date", title: "تاریخ ثبت", category: "demographic", fieldType: "date",
    timePoints: "BASELINE", required: false, order: 7 },

  // ============ Clinical (BASELINE only) ============
  { key: "causeOfDelirium", title: "علت دلیریوم", category: "clinical", fieldType: "text",
    timePoints: "BASELINE", required: false, order: 10 },
  { key: "deliriumSubtype", title: "ساب‌تایپ دلیریوم", category: "clinical", fieldType: "radio",
    options: [{ value: "HYPERACTIVE", label: "بیش‌فعال" }, { value: "HYPOACTIVE", label: "کم‌فعال" }, { value: "MIXED", label: "مختلط" }],
    timePoints: "BASELINE", required: true, order: 11 },
  { key: "department", title: "بخش بستری", category: "clinical", fieldType: "select",
    timePoints: "BASELINE", required: true, order: 12 },
  { key: "drugAllergy", title: "سابقه حساسیت دارویی به اولانزاپین یا هالوپریدول", category: "clinical", fieldType: "radio",
    options: [{ value: "YES", label: "بله" }, { value: "NO", label: "خیر" }],
    timePoints: "BASELINE", required: true, order: 13 },
  { key: "reasonForAdmission", title: "علت بستری", category: "clinical", fieldType: "text",
    timePoints: "BASELINE", required: false, order: 14 },
  { key: "dementiaHistory", title: "سابقه نقص شناختی یا دمانس", category: "clinical", fieldType: "radio",
    options: [{ value: "YES", label: "دارد" }, { value: "NO", label: "ندارد" }],
    timePoints: "BASELINE", required: true, order: 15 },
  { key: "admissionDate", title: "تاریخ بستری", category: "clinical", fieldType: "date",
    timePoints: "BASELINE", required: false, order: 16 },
  { key: "organFailure", title: "نارسایی کبدی یا کلیوی یا کمبود ویتامین", category: "clinical", fieldType: "radio",
    options: [{ value: "YES", label: "دارد" }, { value: "NO", label: "ندارد" }],
    timePoints: "BASELINE", required: true, order: 17 },

  // ============ Concomitant variables (BASELINE only) ============
  { key: "admissionType", title: "نوع پذیرش", category: "concomitant", fieldType: "radio",
    options: [{ value: "EMERGENCY", label: "اورژانس" }, { value: "ELECTIVE", label: "الکتیو" }],
    timePoints: "BASELINE", required: false, order: 20 },
  { key: "opioidUse", title: "مصرف اپیوئید", category: "concomitant", fieldType: "radio",
    options: [{ value: "YES", label: "بله" }, { value: "NO", label: "خیر" }],
    timePoints: "BASELINE", required: false, order: 21 },
  { key: "benzodiazepineUse", title: "مصرف بنزودیازپین", category: "concomitant", fieldType: "radio",
    options: [{ value: "YES", label: "بله" }, { value: "NO", label: "خیر" }],
    timePoints: "BASELINE", required: false, order: 22 },
  { key: "psychiatricDrugUse", title: "مصرف داروهای روان‌پزشکی", category: "concomitant", fieldType: "radio",
    options: [{ value: "YES", label: "بله" }, { value: "NO", label: "خیر" }],
    timePoints: "BASELINE", required: false, order: 23 },
  { key: "painkillerUse", title: "مصرف داروهای ضد درد", category: "concomitant", fieldType: "radio",
    options: [{ value: "YES", label: "بله" }, { value: "NO", label: "خیر" }],
    timePoints: "BASELINE", required: false, order: 24 },

  // ============ Safety - baseline ============
  { key: "qtcBefore", title: "QTc قبل از درمان (ms)", category: "safety", fieldType: "number",
    timePoints: "BASELINE", required: false, order: 30 },

  // ============ Safety - follow-up (H24, H48) ============
  { key: "qtcAfter", title: "QTc بعد از درمان (ms)", category: "safety", fieldType: "number",
    timePoints: "H24,H48", required: false, order: 31 },
  { key: "eps", title: "بروز EPS", category: "safety", fieldType: "radio",
    options: [{ value: "YES", label: "بله" }, { value: "NO", label: "خیر" }],
    timePoints: "H24,H48", required: false, order: 32 },
  { key: "sleepiness", title: "خواب‌آلودگی", category: "safety", fieldType: "radio",
    options: [{ value: "YES", label: "بله" }, { value: "NO", label: "خیر" }],
    timePoints: "H24,H48", required: false, order: 33 },
  { key: "tremor", title: "لرزش", category: "safety", fieldType: "radio",
    options: [{ value: "YES", label: "بله" }, { value: "NO", label: "خیر" }],
    timePoints: "H24,H48", required: false, order: 34 },
  { key: "muscleStiffness", title: "سفتی عضلات", category: "safety", fieldType: "radio",
    options: [{ value: "YES", label: "بله" }, { value: "NO", label: "خیر" }],
    timePoints: "H24,H48", required: false, order: 35 },

  // ============ MDAS - all 3 time points ============
  { key: "q1", title: "کاهش سطح هوشیاری (آگاهی)", category: "mdas", fieldType: "radio",
    options: [
      { value: 0, severity: "none", label: "۰ - بدون مشکل / طبیعی" },
      { value: 1, severity: "mild", label: "۱ - خفیف" },
      { value: 2, severity: "moderate", label: "۲ - متوسط" },
      { value: 3, severity: "severe", label: "۳ - شدید" },
    ],
    timePoints: "BASELINE,H24,H48", required: true, order: 40 },
  { key: "q2", title: "گم‌گشتگی (تاریخ، ماه، روز، سال، فصل، طبقه، نام بیمارستان، شهر، استان، کشور)", category: "mdas", fieldType: "radio",
    options: [
      { value: 0, severity: "none", label: "۰ - بدون مشکل / طبیعی" },
      { value: 1, severity: "mild", label: "۱ - خفیف" },
      { value: 2, severity: "moderate", label: "۲ - متوسط" },
      { value: 3, severity: "severe", label: "۳ - شدید" },
    ],
    timePoints: "BASELINE,H24,H48", required: true, order: 41 },
  { key: "q3", title: "اختلال حافظه کوتاه‌مدت (نام ۳ شیء — تکرار بعد از ۱ دقیقه)", category: "mdas", fieldType: "radio",
    options: [
      { value: 0, severity: "none", label: "۰ - بدون مشکل / طبیعی" },
      { value: 1, severity: "mild", label: "۱ - خفیف" },
      { value: 2, severity: "moderate", label: "۲ - متوسط" },
      { value: 3, severity: "severe", label: "۳ - شدید" },
    ],
    timePoints: "BASELINE,H24,H48", required: true, order: 42 },
  { key: "q4", title: "اختلال حافظه عددی (تکرار اعداد به ترتیب و معکوس)", category: "mdas", fieldType: "radio",
    options: [
      { value: 0, severity: "none", label: "۰ - بدون مشکل / طبیعی" },
      { value: 1, severity: "mild", label: "۱ - خفیف" },
      { value: 2, severity: "moderate", label: "۲ - متوسط" },
      { value: 3, severity: "severe", label: "۳ - شدید" },
    ],
    timePoints: "BASELINE,H24,H48", required: true, order: 43 },
  { key: "q5", title: "کاهش توانایی حفظ و جابه‌جایی توجه", category: "mdas", fieldType: "radio",
    options: [
      { value: 0, severity: "none", label: "۰ - بدون مشکل / طبیعی" },
      { value: 1, severity: "mild", label: "۱ - خفیف" },
      { value: 2, severity: "moderate", label: "۲ - متوسط" },
      { value: 3, severity: "severe", label: "۳ - شدید" },
    ],
    timePoints: "BASELINE,H24,H48", required: true, order: 44 },
  { key: "q6", title: "تفکر به هم ریخته (گفتار نامرتبط، بی‌ربط، حاشیه‌پردازی)", category: "mdas", fieldType: "radio",
    options: [
      { value: 0, severity: "none", label: "۰ - بدون مشکل / طبیعی" },
      { value: 1, severity: "mild", label: "۱ - خفیف" },
      { value: 2, severity: "moderate", label: "۲ - متوسط" },
      { value: 3, severity: "severe", label: "۳ - شدید" },
    ],
    timePoints: "BASELINE,H24,H48", required: true, order: 45 },
  { key: "q7", title: "آشفتگی ادراکی (توهم، خطاهای حسی)", category: "mdas", fieldType: "radio",
    options: [
      { value: 0, severity: "none", label: "۰ - بدون مشکل / طبیعی" },
      { value: 1, severity: "mild", label: "۱ - خفیف" },
      { value: 2, severity: "moderate", label: "۲ - متوسط" },
      { value: 3, severity: "severe", label: "۳ - شدید" },
    ],
    timePoints: "BASELINE,H24,H48", required: true, order: 46 },
  { key: "q8", title: "هذیان", category: "mdas", fieldType: "radio",
    options: [
      { value: 0, severity: "none", label: "۰ - بدون مشکل / طبیعی" },
      { value: 1, severity: "mild", label: "۱ - خفیف" },
      { value: 2, severity: "moderate", label: "۲ - متوسط" },
      { value: 3, severity: "severe", label: "۳ - شدید" },
    ],
    timePoints: "BASELINE,H24,H48", required: true, order: 47 },
  { key: "q9", title: "کاهش یا افزایش فعالیت روانی-حرکتی", category: "mdas", fieldType: "radio",
    options: [
      { value: 0, severity: "none", label: "۰ - بدون مشکل / طبیعی" },
      { value: 1, severity: "mild", label: "۱ - خفیف" },
      { value: 2, severity: "moderate", label: "۲ - متوسط" },
      { value: 3, severity: "severe", label: "۳ - شدید" },
    ],
    timePoints: "BASELINE,H24,H48", required: true, order: 48 },
  { key: "q10", title: "آشفتگی چرخه خواب-بیداری (مشاهده مستقیم و گزارش پرستار)", category: "mdas", fieldType: "radio",
    options: [
      { value: 0, severity: "none", label: "۰ - بدون مشکل / طبیعی" },
      { value: 1, severity: "mild", label: "۱ - خفیف" },
      { value: 2, severity: "moderate", label: "۲ - متوسط" },
      { value: 3, severity: "severe", label: "۳ - شدید" },
    ],
    timePoints: "BASELINE,H24,H48", required: true, order: 49 },

  // ============ Outcomes (H24, H48) ============
  { key: "hospitalStayDays", title: "مدت زمان بستری در بیمارستان (روز)", category: "outcome", fieldType: "number",
    timePoints: "H24,H48", required: false, order: 60 },
  { key: "icuShiftCount", title: "تعداد شیفت بستری از زمان تشخیص دلیریوم", category: "outcome", fieldType: "number",
    timePoints: "H24,H48", required: false, order: 61 },
  { key: "needExtraDose", title: "نیاز به دوز اضافی یا داروی دوم", category: "outcome", fieldType: "checkbox",
    timePoints: "H24,H48", required: false, order: 62 },
  { key: "earlyDischarge", title: "ترخیص زودهنگام از بیمارستان", category: "outcome", fieldType: "checkbox",
    timePoints: "H24,H48", required: false, order: 63 },
  { key: "deathBefore72h", title: "فوت بیمار (قبل از ۴۸ ساعت)", category: "outcome", fieldType: "checkbox",
    timePoints: "H24,H48", required: false, order: 64 },
  { key: "relapse", title: "عود زودرس", category: "outcome", fieldType: "checkbox",
    timePoints: "H24,H48", required: false, order: 65 },
  { key: "icuAdmission", title: "بستری ICU", category: "outcome", fieldType: "checkbox",
    timePoints: "H24,H48", required: false, order: 66 },
  { key: "patientRefusal", title: "عدم تمایل بیمار/همراه برای ادامه", category: "outcome", fieldType: "checkbox",
    timePoints: "H24,H48", required: false, order: 67 },
  { key: "severeSideEffect", title: "بروز عارضه جانبی شدید غیرقابل تحمل", category: "outcome", fieldType: "checkbox",
    timePoints: "H24,H48", required: false, order: 68 },
  { key: "physicalRestraint", title: "نیاز به استفاده محدودیت فیزیکی", category: "outcome", fieldType: "checkbox",
    timePoints: "H24,H48", required: false, order: 69 },
];

export const CATEGORY_LABELS: Record<string, string> = {
  demographic: "اطلاعات هویتی",
  clinical: "اطلاعات بالینی",
  concomitant: "متغیرهای همراه",
  safety: "متغیرهای ایمنی",
  mdas: "نمرات MDAS",
  outcome: "پیامدهای بالینی",
};

export const CATEGORY_COLORS: Record<string, string> = {
  demographic: "primary",
  clinical: "emerald",
  concomitant: "violet",
  safety: "amber",
  mdas: "sky",
  outcome: "rose",
};

export const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "متن",
  number: "عدد",
  radio: "تک‌گزینشی",
  select: "لیست کشویی",
  checkbox: "چک‌باکس",
  date: "تاریخ",
  textarea: "متن چندخطی",
};
