import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// PATCH /api/patients/[id]/followup — update follow-up fields (safety + outcomes)
// Body: { timePoint: "H24"|"H48", ...fields }
// Stores non-MDAS fields that apply to H24/H48 visits
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

    // All follow-up fields (safety + outcomes)
    const data: any = {};
    const allowedFields = [
      // Safety (H24/H48)
      "qtcAfter", "eps", "sleepiness", "tremor", "muscleStiffness",
      // Outcomes (H24/H48)
      "hospitalStayDays", "icuShiftCount",
      "needExtraDose", "earlyDischarge", "deathBefore72h", "relapse",
      "icuAdmission", "patientRefusal", "severeSideEffect", "physicalRestraint",
    ];

    for (const k of allowedFields) {
      if (k in body) {
        const v = body[k];
        if (typeof v === "boolean") data[k] = v;
        else if (typeof v === "number") data[k] = v;
        else if (typeof v === "string" && (v === "YES" || v === "NO")) data[k] = v;
        else if (v === null) data[k] = null;
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
        detail: `به‌روزرسانی فرم پیگیری ${body.timePoint || ""} بیمار: ${updated.code}`,
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
