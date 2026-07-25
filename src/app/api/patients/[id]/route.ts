import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { computeMdasTotal } from "@/lib/mdas";

// GET /api/patients/[id] — single patient full data
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const patient = await db.patient.findUnique({
      where: { id },
      include: {
        mdasScores: true,
        createdBy: { select: { id: true, fullName: true, username: true } },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { user: { select: { fullName: true } } },
        },
      },
    });
    if (!patient) {
      return NextResponse.json({ error: "بیمار یافت نشد" }, { status: 404 });
    }
    // Doctors can view any patient's record (for follow-up), but not edit other doctors' metadata.
    return NextResponse.json({ patient, me });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "لطفاً وارد شوید" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// PATCH — update patient fields (admin only, or owner for clinical outcomes)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const patient = await db.patient.findUnique({ where: { id } });
    if (!patient) {
      return NextResponse.json({ error: "بیمار یافت نشد" }, { status: 404 });
    }
    const isAdmin = me.role === "ADMIN";
    const isOwner = patient.createdById === me.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "شما فقط می‌توانید بیماران خودتان را ویرایش کنید" },
        { status: 403 }
      );
    }
    const allowed: string[] = [
      "gender", "age", "phone", "address", "date",
      "causeOfDelirium", "deliriumSubtype", "department",
      "drugAllergy", "reasonForAdmission", "dementiaHistory",
      "admissionDate", "organFailure",
      "admissionType", "opioidUse", "benzodiazepineUse",
      "psychiatricDrugUse", "painkillerUse",
      "qtcBefore", "qtcAfter", "eps", "sleepiness", "tremor", "muscleStiffness",
      "drugDose",
      "hospitalStayDays", "icuShiftCount",
      "needExtraDose", "earlyDischarge", "deathBefore72h", "relapse",
      "icuAdmission", "patientRefusal", "severeSideEffect", "physicalRestraint",
      "fullName",
    ];
    const data: any = {};
    // Boolean fields that need conversion from YES/NO/true/false
    const boolFields = [
      "needExtraDose", "earlyDischarge", "deathBefore72h", "relapse",
      "icuAdmission", "patientRefusal", "severeSideEffect", "physicalRestraint",
    ];
    // String YES/NO fields
    const yesNoFields = ["eps", "sleepiness", "tremor", "muscleStiffness"];
    for (const key of allowed) {
      if (key in body) {
        const v = body[key];
        if (boolFields.includes(key)) {
          // Convert to boolean
          if (typeof v === "boolean") data[key] = v;
          else if (v === "YES" || v === "yes" || v === 1) data[key] = true;
          else if (v === "NO" || v === "no" || v === 0) data[key] = false;
          else data[key] = !!v;
        } else if (yesNoFields.includes(key)) {
          // Keep as string YES/NO
          if (typeof v === "boolean") data[key] = v ? "YES" : "NO";
          else if (v === "YES" || v === "NO") data[key] = v;
          else if (v === null) data[key] = null;
        } else if (key === "age" || key === "qtcBefore" || key === "qtcAfter" || key === "hospitalStayDays" || key === "icuShiftCount") {
          // Number fields
          if (v === null || v === "") data[key] = null;
          else if (typeof v === "number") data[key] = v;
          else data[key] = Number(v) || null;
        } else {
          data[key] = v;
        }
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
        detail: `ویرایش اطلاعات بیمار: ${updated.code}`,
      },
    });
    return NextResponse.json({ patient: updated });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "لطفاً وارد شوید" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "خطای سرور: " + e.message },
      { status: 500 }
    );
  }
}

// DELETE — admin only
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireUser();
    if (me.role !== "ADMIN") {
      return NextResponse.json({ error: "فقط مدیر" }, { status: 403 });
    }
    const { id } = await params;
    const patient = await db.patient.delete({ where: { id } });
    await db.auditLog.create({
      data: {
        userId: me.id,
        action: "DELETE_PATIENT",
        detail: `حذف بیمار: ${patient.code} (${patient.fullName})`,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "لطفاً وارد شوید" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
