// Persian (Jalali) date helpers
import { format } from "date-fns-jalali";

const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

/** Convert a Gregorian date (or ISO string) to Jalali Y/m/d string. */
export function toJalali(dateInput: Date | string): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  try {
    return format(d, "yyyy/MM/dd");
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function toJalaliDateTime(dateInput: Date | string): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  try {
    return `${format(d, "yyyy/MM/dd")} - ${format(d, "HH:mm")}`;
  } catch {
    return d.toISOString();
  }
}

export function jalaliMonthName(monthIndex: number): string {
  return PERSIAN_MONTHS[monthIndex] || "";
}

/** Convert Persian/Arabic digits in a string to ASCII digits. */
export function normalizeDigits(input: string): string {
  if (!input) return "";
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  let out = input;
  for (let i = 0; i < 10; i++) {
    out = out.replaceAll(persian[i], String(i)).replaceAll(arabic[i], String(i));
  }
  return out;
}

/** Convert ASCII digits to Persian digits for display. */
export function toPersianDigits(input: string | number): string {
  const s = String(input);
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  let out = "";
  for (const ch of s) {
    const n = ch.charCodeAt(0) - 48;
    if (n >= 0 && n <= 9) out += persian[n];
    else out += ch;
  }
  return out;
}

/** Validate Iranian national ID (10 digits, basic checksum). */
export function isValidNationalId(input: string): boolean {
  const digits = normalizeDigits(input).replace(/\D/g, "");
  if (digits.length !== 10) return false;
  if (/^0+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * (10 - i);
  }
  const remainder = sum % 11;
  const lastDigit = parseInt(digits[9], 10);
  if (remainder < 2) return lastDigit === remainder;
  return lastDigit === 11 - remainder;
}
