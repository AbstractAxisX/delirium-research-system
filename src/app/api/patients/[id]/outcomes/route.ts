import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// PATCH /api/patients/[id]/outcomes — update clinical outcomes
// Used in the 24h/48h follow-up visits
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const patient = await db.patient.findUnique({ where: { id } });
    if (!patient) return NextResponse.json({ error: "بیمار یافت نشد" }, { status: 404 });

    // All clinical outcome + safety fields
    const data: any = {};
    if (typeof body.hospitalStayDays === "number" || body.hospitalStayDays === null) {
      data.hospitalStayDays = body.hospitalStayDays;
    }
    if (typeof body.icuShiftCount === "number" || body.icuShiftCount === null) {
      data.icuShiftCount = body.icuShiftCount;
    }
    // Safety variables moved to follow-up visits
    if (typeof body.qtcAfter === "number" || body.qtcAfter === null) {
      data.qtcAfter = body.qtcAfter;
    }
    for (const k of [
      "needExtraDose", "earlyDischarge", "deathBefore72h", "relapse",
      "icuAdmission", "patientRefusal", "severeSideEffect", "physicalRestraint",
      "eps", "sleepiness", "tremor", "muscleStiffness",
    ]) {
      if (typeof body[k] === "boolean") data[k] = body[k];
      // YES/NO string values for safety fields
      if (typeof body[k] === "string" && (body[k] === "YES" || body[k] === "NO")) {
        data[k] = body[k];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "هیچ فیلدی برای ویرایش ارسال نشد" }, { status: 400 });
    }

    const updated = await db.patient.update({ where: { id }, data });
    await db.auditLog.create({
      data: {
        userId: me.id,
        patientId: id,
        action: "UPDATE_PATIENT",
        detail: `به‌روزرسانی پیامدهای بالینی بیمار: ${updated.code}`,
      },
    });
    return NextResponse.json({ patient: updated });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "لطفاً وارد شوید" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطای سرور: " + e.message }, { status: 500 });
  }
}
