import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// PATCH /api/patients/[id]/outcomes — update clinical outcomes + safety
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

    const data: any = {};

    // Number fields
    if (body.hospitalStayDays !== undefined) {
      data.hospitalStayDays = typeof body.hospitalStayDays === "number" ? body.hospitalStayDays : null;
    }
    if (body.icuShiftCount !== undefined) {
      data.icuShiftCount = typeof body.icuShiftCount === "number" ? body.icuShiftCount : null;
    }
    if (body.qtcAfter !== undefined) {
      data.qtcAfter = typeof body.qtcAfter === "number" ? body.qtcAfter : null;
    }

    // Boolean fields — convert YES/NO/true/false to boolean
    const boolFields = [
      "needExtraDose", "earlyDischarge", "deathBefore72h", "relapse",
      "icuAdmission", "patientRefusal", "severeSideEffect", "physicalRestraint",
    ];
    for (const k of boolFields) {
      if (k in body) {
        const v = body[k];
        if (typeof v === "boolean") data[k] = v;
        else if (v === "YES" || v === "yes" || v === 1) data[k] = true;
        else if (v === "NO" || v === "no" || v === 0) data[k] = false;
        else data[k] = false;
      }
    }

    // String YES/NO fields (safety)
    const stringFields = ["eps", "sleepiness", "tremor", "muscleStiffness"];
    for (const k of stringFields) {
      if (k in body) {
        const v = body[k];
        if (typeof v === "string" && (v === "YES" || v === "NO")) data[k] = v;
        else if (typeof v === "boolean") data[k] = v ? "YES" : "NO";
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
