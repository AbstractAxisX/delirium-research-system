// Follow-up timing helpers
//
// Per protocol: 24h and 48h follow-ups are NOT exact 24/48 hour marks.
// Since doctors may not be at the hospital 24/7, the system uses
// flexible windows:
//
// - Baseline (BASELINE) filled at time T
// - 24h window: T + 12h opens, stays open for ~36h
//   => if now > T + 12h and H24 not filled → "نیازمند ویزیت ۲۴ ساعت"
// - After H24 filled at time T24:
//   48h window: T24 + 12h opens, stays open for ~36h
//   => if now > T24 + 12h and H48 not filled → "نیازمند ویزیت ۴۸ ساعت"
//
// This is informational — the form is always open to fill if the doctor
// clicks into the patient record. The "due" status is shown on lists and
// dashboard to surface who needs follow-up.

export type FollowUpStatus =
  | "no_baseline"        // baseline not yet done
  | "needs_24h"          // baseline done, 24h not filled → IMMEDIATELY after baseline
  | "needs_48h"          // 24h done, 48h not filled → IMMEDIATELY after 24h
  | "complete";          // all 3 done

export type FollowUpInfo = {
  status: FollowUpStatus;
  label: string;          // short label
  description: string;    // longer explanation
  tone: "default" | "primary" | "warning" | "danger" | "success";
  dueAt?: Date;           // when follow-up becomes due
  overdueHours?: number;  // how many hours past due (0 if not yet due)
};

const WINDOW_OPEN_HOURS = 0;        // follow-up needed immediately after baseline/24h
const WINDOW_EXPIRE_HOURS = 72;    // overdue after 72h

export function computeFollowUpStatus(
  baselineAt: Date | string | null | undefined,
  h24At: Date | string | null | undefined,
  h48At: Date | string | null | undefined,
  now: Date = new Date()
): FollowUpInfo {
  const baseT = baselineAt ? new Date(baselineAt) : null;
  const h24T = h24At ? new Date(h24At) : null;
  const h48T = h48At ? new Date(h48At) : null;

  if (!baseT) {
    return {
      status: "no_baseline",
      label: "بدون نمره پایه",
      description: "هنوز نمره پایه (قبل از تزریق) ثبت نشده است",
      tone: "default",
    };
  }

  if (!h24T) {
    const expireAt = new Date(baseT.getTime() + WINDOW_EXPIRE_HOURS * 3600_000);
    const isOverdue = now.getTime() >= expireAt.getTime();
    return {
      status: "needs_24h",
      label: isOverdue ? "نیازمند ویزیت ۲۴h (گذشته)" : "نیازمند ویزیت ۲۴h",
      description: isOverdue
        ? `بازده ویزیت ۲۴ ساعت گذشته است (${Math.floor((now.getTime() - expireAt.getTime()) / 3600_000)} ساعت تأخیر)`
        : `پایه ثبت شده — ویزیت ۲۴ ساعت باید انجام شود`,
      tone: isOverdue ? "danger" : "warning",
      overdueHours: isOverdue ? Math.floor((now.getTime() - expireAt.getTime()) / 3600_000) : 0,
    };
  }

  if (!h48T) {
    const expireAt = new Date(h24T.getTime() + WINDOW_EXPIRE_HOURS * 3600_000);
    const isOverdue = now.getTime() >= expireAt.getTime();
    return {
      status: "needs_48h",
      label: isOverdue ? "نیازمند ویزیت ۴۸h (گذشته)" : "نیازمند ویزیت ۴۸h",
      description: isOverdue
        ? `بازده ویزیت ۴۸ ساعت گذشته است (${Math.floor((now.getTime() - expireAt.getTime()) / 3600_000)} ساعت تأخیر)`
        : `۲۴ ساعت ثبت شده — ویزیت ۴۸ ساعت باید انجام شود`,
      tone: isOverdue ? "danger" : "warning",
      overdueHours: isOverdue ? Math.floor((now.getTime() - expireAt.getTime()) / 3600_000) : 0,
    };
  }

  return {
    status: "complete",
    label: "تکمیل شده",
    description: "هر سه نمره پایه، ۲۴h و ۴۸h تکمیل شده‌اند",
    tone: "success",
  };
}

function formatJalaliShort(d: Date): string {
  // Use Intl for Persian formatting (returns Persian digits)
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d) + " ساعت";
  } catch {
    return d.toLocaleString();
  }
}
