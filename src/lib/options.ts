// Drug options per protocol
export const OLANZAPINE_DOSES = [
  { value: "OLANZAPINE_2_5", label: "اولانزاپین ۲.۵ میلی‌گرم" },
  { value: "OLANZAPINE_5", label: "اولانزاپین ۵ میلی‌گرم" },
  { value: "OLANZAPINE_10", label: "اولانزاپین ۱۰ میلی‌گرم" },
];

export const HALOPERIDOL_DOSES = [
  { value: "HALOPERIDOL_1", label: "هالوپریدول ۱ میلی‌گرم" },
  { value: "HALOPERIDOL_2", label: "هالوپریدول ۲ میلی‌گرم" },
  { value: "HALOPERIDOL_4", label: "هالوپریدول ۴ میلی‌گرم" },
];

export const DRUG_LABELS: Record<string, string> = {
  OLANZAPINE: "اولانزاپین",
  HALOPERIDOL: "هالوپریدول",
};

export function doseLabel(doseValue: string | null | undefined): string {
  if (!doseValue) return "—";
  const all = [...OLANZAPINE_DOSES, ...HALOPERIDOL_DOSES];
  return all.find((d) => d.value === doseValue)?.label || doseValue;
}

export function drugLabel(drugType: string | null | undefined): string {
  if (!drugType) return "—";
  return DRUG_LABELS[drugType] || drugType;
}

// NOTE: Departments are now managed dynamically in the database.
// Use the DepartmentSelect component instead of a hardcoded list.

export const DELIRIUM_SUBTYPES = [
  { value: "HYPERACTIVE", label: "بیش‌فعال" },
  { value: "HYPOACTIVE", label: "کم‌فعال" },
  { value: "MIXED", label: "مختلط" },
];

export const YES_NO = [
  { value: "YES", label: "بله" },
  { value: "NO", label: "خیر" },
];

export const GENDERS = [
  { value: "MALE", label: "مرد" },
  { value: "FEMALE", label: "زن" },
];

export const ADMISSION_TYPES = [
  { value: "EMERGENCY", label: "اورژانس" },
  { value: "ELECTIVE", label: "الکتیو" },
];
