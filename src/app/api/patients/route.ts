import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireUser,
  assignDrugFromNationalId,
  generateNextPatientCode,
} from "@/lib/auth";
import { normalizeDigits, isValidNationalId } from "@/lib/persian";
import { recommendDrugDose } from "@/lib/mdas";

// GET /api/patients — list (admin: all, doctor: own)
// query: search, drugType, department, fromDate, toDate, page, pageSize
export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const drugType = url.searchParams.get("drugType") || "";
    const department = url.searchParams.get("department") || "";
    const fromDate = url.searchParams.get("fromDate") || "";
    const toDate = url.searchParams.get("toDate") || "";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);

    const where: any = {};
    if (me.role !== "ADMIN") where.createdById = me.id;
    if (drugType) where.drugType = drugType;
    if (department) where.department = department;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) {
        const t = new Date(toDate);
        t.setHours(23, 59, 59, 999);
        where.createdAt.lte = t;
      }
    }
    if (search) {
      const s = normalizeDigits(search);
      where.OR = [
        { nationalId: { contains: s } },
        { code: { contains: s.toUpperCase() } },
        { fullName: { contains: search } },
      ];
    }

    const [total, patients] = await Promise.all([
      db.patient.count({ where }),
      db.patient.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          mdasScores: { select: { timePoint: true, totalScore: true, filledAt: true, answersJson: true, q1: true } },
          createdBy: { select: { fullName: true, username: true } },
        },
      }),
    ]);
    return NextResponse.json({ patients, total, page, pageSize });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "لطفاً وارد شوید" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = await req.json();

    // Validate national ID
    const nationalId = normalizeDigits(String(body.nationalId || "")).trim();
    if (!isValidNationalId(nationalId)) {
      return NextResponse.json(
        { error: "کد ملی نامعتبر است" },
        { status: 400 }
      );
    }
    const fullName = String(body.fullName || "").trim();
    if (!fullName) {
      return NextResponse.json(
        { error: "نام بیمار الزامی است" },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await db.patient.findFirst({ where: { nationalId } });
    if (existing) {
      return NextResponse.json(
        { error: `بیماری با این کد ملی قبلاً ثبت شده است (${existing.code})` },
        { status: 400 }
      );
    }

    // Auto drug assignment
    const { drugType } = assignDrugFromNationalId(nationalId);
    const code = await generateNextPatientCode();

    // Compute MDAS total from answers
    let mdasTotal = 0;
    if (body.mdas && typeof body.mdas === "object") {
      for (const v of Object.values(body.mdas)) {
        if (typeof v === "number") mdasTotal += v;
      }
    }

    // Auto-compute drug dose from MDAS total if not provided
    let drugDose = body.drugDose || null;
    if (!drugDose && mdasTotal > 0) {
      const rec = recommendDrugDose(mdasTotal, drugType);
      if (rec) drugDose = rec.dose;
    }

    const data: any = {
      code,
      nationalId,
      fullName,
      gender: body.gender || null,
      age: typeof body.age === "number" ? body.age : null,
      phone: body.phone || null,
      address: body.address || null,
      date: body.date || null,
      causeOfDelirium: body.causeOfDelirium || null,
      deliriumSubtype: body.deliriumSubtype || null,
      department: body.department || null,
      drugAllergy: body.drugAllergy || null,
      reasonForAdmission: body.reasonForAdmission || null,
      dementiaHistory: body.dementiaHistory || null,
      admissionDate: body.admissionDate || null,
      organFailure: body.organFailure || null,
      admissionType: body.admissionType || null,
      opioidUse: body.opioidUse || null,
      benzodiazepineUse: body.benzodiazepineUse || null,
      psychiatricDrugUse: body.psychiatricDrugUse || null,
      painkillerUse: body.painkillerUse || null,
      qtcBefore: typeof body.qtcBefore === "number" ? body.qtcBefore : null,
      qtcAfter: typeof body.qtcAfter === "number" ? body.qtcAfter : null,
      eps: body.eps || null,
      sleepiness: body.sleepiness || null,
      tremor: body.tremor || null,
      muscleStiffness: body.muscleStiffness || null,
      drugType,
      drugDose: drugDose,
      hospitalStayDays: typeof body.hospitalStayDays === "number" ? body.hospitalStayDays : null,
      icuShiftCount: typeof body.icuShiftCount === "number" ? body.icuShiftCount : null,
      needExtraDose: !!body.needExtraDose,
      earlyDischarge: !!body.earlyDischarge,
      deathBefore72h: !!body.deathBefore72h,
      relapse: !!body.relapse,
      icuAdmission: !!body.icuAdmission,
      patientRefusal: !!body.patientRefusal,
      severeSideEffect: !!body.severeSideEffect,
      physicalRestraint: !!body.physicalRestraint,
      createdById: me.id,
    };

    const patient = await db.patient.create({ data });

    // Save baseline MDAS if provided
    if (body.mdas && typeof body.mdas === "object") {
      const m = body.mdas;
      // Collect all answers into a JSON map (supports both q1..q10 and custom keys)
      const answersMap: Record<string, number> = {};
      for (const [k, v] of Object.entries(m)) {
        if (typeof v === "number") answersMap[k] = v;
      }
      const total = Object.values(answersMap).reduce<number>((s, v) => s + v, 0);
      const answersJson = JSON.stringify(answersMap);
      await db.mdasScore.create({
        data: {
          patientId: patient.id,
          timePoint: "BASELINE",
          q1: m.q1 ?? null,
          q2: m.q2 ?? null,
          q3: m.q3 ?? null,
          q4: m.q4 ?? null,
          q5: m.q5 ?? null,
          q6: m.q6 ?? null,
          q7: m.q7 ?? null,
          q8: m.q8 ?? null,
          q9: m.q9 ?? null,
          q10: m.q10 ?? null,
          answersJson,
          totalScore: total,
          filledById: me.id,
          filledAt: new Date(),
        },
      });
    }

    await db.auditLog.create({
      data: {
        userId: me.id,
        patientId: patient.id,
        action: "CREATE_PATIENT",
        detail: `ثبت بیمار جدید: ${patient.code} (${patient.fullName}) - دارو: ${drugType}`,
      },
    });

    return NextResponse.json({ patient });
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
