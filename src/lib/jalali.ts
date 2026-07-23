// Jalali (Persian) calendar helpers — wraps jalaali-js.
import {
  toJalaali, toGregorian, isLeapJalaaliYear, jalaaliMonthLength,
} from "jalaali-js";

export function gregorianDateToJalali(d: Date): { jy: number; jm: number; jd: number } {
  return toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function jalaliDateToGregorian(jy: number, jm: number, jd: number): Date {
  const g = toGregorian(jy, jm, jd);
  return new Date(g.gy, g.gm - 1, g.gd, 12, 0, 0, 0);
}

export function isLeapJalaliYear(jy: number): boolean {
  return isLeapJalaaliYear(jy);
}

export function jalaliMonthLength(jy: number, jm: number): number {
  return jalaaliMonthLength(jy, jm);
}

export const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

export const PERSIAN_WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
export const PERSIAN_WEEKDAYS_FULL = [
  "شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه",
];

/** Persian weekday (0 = Saturday, 6 = Friday). */
export function getJalaliWeekday(jy: number, jm: number, jd: number): number {
  const d = jalaliDateToGregorian(jy, jm, jd);
  return (d.getDay() + 1) % 7;
}

/** Format Jalali date as YYYY/MM/DD. */
export function formatJalali(jy: number, jm: number, jd: number): string {
  const mm = String(jm).padStart(2, "0");
  const dd = String(jd).padStart(2, "0");
  return `${jy}/${mm}/${dd}`;
}

/** Parse "1404/04/25" or "1404-4-5" → {jy, jm, jd}. */
export function parseJalali(s: string): { jy: number; jm: number; jd: number } | null {
  if (!s) return null;
  const m = s.match(/(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})/);
  if (!m) return null;
  const a = Number(m[1]); const b = Number(m[2]); const c = Number(m[3]);
  if (m[1].length === 4) return { jy: a, jm: b, jd: c };
  if (m[3].length === 4) return { jy: c, jm: b, jd: a };
  return { jy: a, jm: b, jd: c };
}
