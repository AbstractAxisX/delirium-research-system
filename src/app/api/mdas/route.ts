import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { computeTotalFromAnswers, computeMdasTotal, type TimePoint } from "@/lib/mdas";

const AUTO_LOCK_MS = 60 * 1000;

// POST /api/mdas  { patientId, timePoint, answers: {itemId: value}, submit?: boolean }
// Also accepts legacy q1..q10 format for backwards compat
export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = await req.json();
    const patientId = String(body.patientId || "");
    const timePoint = (String(body.timePoint || "").toUpperCase() as TimePoint);
    const submit = !!body.submit;

    if (!patientId || !["BASELINE", "H24", "H48"].includes(timePoint)) {
      return NextResponse.json({ error: "patientId و timePoint معتبر لازم است" }, { status: 400 });
    }
    const patient = await db.patient.findUnique({ where: { id: patientId } });
    if (!patient) return NextResponse.json({ error: "بیمار یافت نشد" }, { status: 404 });

    const isAdmin = me.role === "ADMIN";
    const existing = await db.mdasScore.findUnique({
      where: { patientId_timePoint: { patientId, timePoint } },
    });

    if (existing && existing.locked && !isAdmin) {
      return NextResponse.json({ error: "این فرم قفل شده است. برای ویرایش با مدیر سامانه تماس بگیرید.", locked: true }, { status: 403 });
    }

    if (existing && existing.lastSavedAt && !isAdmin && !submit) {
      const elapsed = Date.now() - existing.lastSavedAt.getTime();
      if (elapsed > AUTO_LOCK_MS) {
        await db.mdasScore.update({
          where: { id: existing.id },
          data: { locked: true, lockedAt: new Date() },
        });
        return NextResponse.json({ error: "زمان ویرایش به پایان رسیده است (۶۰ ثانیه). فرم قفل شد.", locked: true }, { status: 403 });
      }
    }

    // Collect answers - support both new {answers: {itemId: v}} and legacy q1..q10
    const answersMap: Record<string, number> = {};
    if (body.answers && typeof body.answers === "object") {
      for (const [k, v] of Object.entries(body.answers)) {
        // Accept both number and string values (convert string to number)
        const numVal = typeof v === "number" ? v : (typeof v === "string" ? Number(v) : NaN);
        if (!Number.isNaN(numVal)) answersMap[k] = numVal;
      }
    }
    // Legacy: also store q1..q10 if present
    const legacyScores: Record<string, number | null> = {};
    for (const k of ["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10"]) {
      const v = body[k];
      if (typeof v === "number") {
        legacyScores[k] = v;
        // Also add to answersMap if not already there
        if (!answersMap[k]) answersMap[k] = v;
      } else if (typeof v === "undefined") {
        // Don't touch
      }
    }

    // Compute total from all answers
    const total = Object.keys(answersMap).length > 0
      ? computeTotalFromAnswers(answersMap)
      : (Object.keys(legacyScores).length > 0 ? computeMdasTotal(legacyScores) : null);

    const now = new Date();
    const firstSaveAt = existing?.createdAt ?? now;

    let shouldLock = existing?.locked ?? false;
    let lockedAt = existing?.lockedAt ?? null;
    if (submit) {
      shouldLock = true;
      lockedAt = now;
    } else if (!isAdmin) {
      const elapsedSinceFirst = now.getTime() - firstSaveAt.getTime();
      if (elapsedSinceFirst > AUTO_LOCK_MS) {
        shouldLock = true;
        lockedAt = now;
      }
    }

    const answersJson = JSON.stringify(answersMap);

    const data: any = {
      answersJson,
      totalScore: total,
      lastSavedAt: now,
      filledById: me.id,
      filledAt: now,
      locked: shouldLock,
      lockedAt,
      submittedAt: submit ? now : existing?.submittedAt,
    };
    // Sync q1..q10 from answersMap so legacy fields stay correct per timepoint
    for (const k of ["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10"]) {
      if (k in answersMap) {
        data[k] = answersMap[k];
      } else if (existing) {
        // If answer was removed (not in new answers), clear it
        data[k] = null;
      }
    }

    let record;
    if (existing) {
      record = await db.mdasScore.update({ where: { id: existing.id }, data });
    } else {
      record = await db.mdasScore.create({ data: { patientId, timePoint, ...data } });
    }

    await db.auditLog.create({
      data: {
        userId: me.id,
        patientId,
        action: "FILL_MDAS",
        detail: `ثبت ${timePoint === "BASELINE" ? "پایه" : timePoint === "H24" ? "۲۴ ساعت" : "۴۸ ساعت"}${submit ? " (نهایی)" : ""} - نمره: ${total ?? "-"}`,
      },
    });

    const remainingMs = !shouldLock && !isAdmin
      ? Math.max(0, AUTO_LOCK_MS - (now.getTime() - firstSaveAt.getTime()))
      : 0;

    return NextResponse.json({
      mdas: record,
      locked: record.locked,
      remainingMs,
      autoLockMs: AUTO_LOCK_MS,
    });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "لطفاً وارد شوید" }, { status: 401 });
    return NextResponse.json({ error: "خطای سرور: " + e.message }, { status: 500 });
  }
}

// GET /api/mdas?patientId=... — get all MDAS records for a patient
export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const url = new URL(req.url);
    const patientId = url.searchParams.get("patientId");
    if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });
    const records = await db.mdasScore.findMany({
      where: { patientId },
      include: { filledBy: { select: { fullName: true, username: true } } },
    });
    const isAdmin = me.role === "ADMIN";
    const now = Date.now();
    const result = records.map((r) => {
      let remainingMs = 0;
      if (!r.locked && !isAdmin) {
        const elapsed = now - r.createdAt.getTime();
        remainingMs = Math.max(0, AUTO_LOCK_MS - elapsed);
      }
      // Parse answersJson
      let answers: Record<string, number> = {};
      try {
        if (r.answersJson) answers = JSON.parse(r.answersJson);
      } catch {}
      // Also include legacy q1..q10 if not in answers
      for (const k of ["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10"]) {
        if (!(k in answers) && typeof (r as any)[k] === "number") {
          answers[k] = (r as any)[k];
        }
      }
      return { ...r, answers, remainingMs };
    });
    return NextResponse.json({ records: result, autoLockMs: AUTO_LOCK_MS });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "لطفاً وارد شوید" }, { status: 401 });
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
