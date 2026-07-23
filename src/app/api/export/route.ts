import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import * as XLSX from "xlsx";
import { drugLabel, doseLabel } from "@/lib/options";

// GET /api/export?format=xlsx|csv|sav-ready
export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "xlsx";
    const fromDate = url.searchParams.get("fromDate") || "";
    const toDate = url.searchParams.get("toDate") || "";
    const department = url.searchParams.get("department") || "";
    const drugType = url.searchParams.get("drugType") || "";

    const where: any = {};
    if (me.role !== "ADMIN") where.createdById = me.id;
    if (department) where.department = department;
    if (drugType) where.drugType = drugType;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) {
        const t = new Date(toDate);
        t.setHours(23, 59, 59, 999);
        where.createdAt.lte = t;
      }
    }

    const patients = await db.patient.findMany({
      where,
      orderBy: { code: "asc" },
      include: {
        mdasScores: true,
        createdBy: { select: { fullName: true, username: true } },
      },
    });

    // Flatten into SPSS-friendly rows: one patient per row, with separate columns
    const rows = patients.map((p) => {
      const b = p.mdasScores.find((m) => m.timePoint === "BASELINE");
      const h24 = p.mdasScores.find((m) => m.timePoint === "H24");
      const h48 = p.mdasScores.find((m) => m.timePoint === "H48");
      return {
        code: p.code,
        nationalId: p.nationalId,
        fullName: p.fullName,
        gender: p.gender || "",
        age: p.age ?? "",
        phone: p.phone || "",
        department: p.department || "",
        causeOfDelirium: p.causeOfDelirium || "",
        deliriumSubtype: p.deliriumSubtype || "",
        drugAllergy: p.drugAllergy || "",
        reasonForAdmission: p.reasonForAdmission || "",
        dementiaHistory: p.dementiaHistory || "",
        organFailure: p.organFailure || "",
        admissionDate: p.admissionDate || "",
        admissionType: p.admissionType || "",
        opioidUse: p.opioidUse || "",
        benzodiazepineUse: p.benzodiazepineUse || "",
        psychiatricDrugUse: p.psychiatricDrugUse || "",
        painkillerUse: p.painkillerUse || "",
        qtcBefore: p.qtcBefore ?? "",
        qtcAfter: p.qtcAfter ?? "",
        eps: p.eps || "",
        sleepiness: p.sleepiness || "",
        tremor: p.tremor || "",
        muscleStiffness: p.muscleStiffness || "",
        drugType: p.drugType,
        drugTypeLabel: drugLabel(p.drugType),
        drugDose: p.drugDose || "",
        drugDoseLabel: doseLabel(p.drugDose),
        hospitalStayDays: p.hospitalStayDays ?? "",
        icuShiftCount: p.icuShiftCount ?? "",
        needExtraDose: p.needExtraDose ? 1 : 0,
        earlyDischarge: p.earlyDischarge ? 1 : 0,
        deathBefore72h: p.deathBefore72h ? 1 : 0,
        relapse: p.relapse ? 1 : 0,
        icuAdmission: p.icuAdmission ? 1 : 0,
        patientRefusal: p.patientRefusal ? 1 : 0,
        severeSideEffect: p.severeSideEffect ? 1 : 0,
        physicalRestraint: p.physicalRestraint ? 1 : 0,
        // MDAS baseline
        baseline_q1: b?.q1 ?? "",
        baseline_q2: b?.q2 ?? "",
        baseline_q3: b?.q3 ?? "",
        baseline_q4: b?.q4 ?? "",
        baseline_q5: b?.q5 ?? "",
        baseline_q6: b?.q6 ?? "",
        baseline_q7: b?.q7 ?? "",
        baseline_q8: b?.q8 ?? "",
        baseline_q9: b?.q9 ?? "",
        baseline_q10: b?.q10 ?? "",
        baseline_total: b?.totalScore ?? "",
        // MDAS H24
        h24_q1: h24?.q1 ?? "",
        h24_q2: h24?.q2 ?? "",
        h24_q3: h24?.q3 ?? "",
        h24_q4: h24?.q4 ?? "",
        h24_q5: h24?.q5 ?? "",
        h24_q6: h24?.q6 ?? "",
        h24_q7: h24?.q7 ?? "",
        h24_q8: h24?.q8 ?? "",
        h24_q9: h24?.q9 ?? "",
        h24_q10: h24?.q10 ?? "",
        h24_total: h24?.totalScore ?? "",
        // MDAS H48
        h48_q1: h48?.q1 ?? "",
        h48_q2: h48?.q2 ?? "",
        h48_q3: h48?.q3 ?? "",
        h48_q4: h48?.q4 ?? "",
        h48_q5: h48?.q5 ?? "",
        h48_q6: h48?.q6 ?? "",
        h48_q7: h48?.q7 ?? "",
        h48_q8: h48?.q8 ?? "",
        h48_q9: h48?.q9 ?? "",
        h48_q10: h48?.q10 ?? "",
        h48_total: h48?.totalScore ?? "",
        // Derived
        delta_24: b?.totalScore != null && h24?.totalScore != null ? b.totalScore - h24.totalScore : "",
        delta_48: b?.totalScore != null && h48?.totalScore != null ? b.totalScore - h48.totalScore : "",
        response_48_pct:
          b?.totalScore != null && h48?.totalScore != null && b.totalScore > 0
            ? Math.round(((b.totalScore - h48.totalScore) / b.totalScore) * 100)
            : "",
        registeredBy: p.createdBy?.fullName || "",
        createdAt: p.createdAt.toISOString(),
      };
    });

    if (format === "csv") {
      const ws = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(ws);
      return new NextResponse("\uFEFF" + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="patients_${Date.now()}.csv"`,
        },
      });
    }

    // default: xlsx
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    // Set RTL view
    (ws as any)["!views"] = [{ RTL: true }];
    XLSX.utils.book_append_sheet(wb, ws, "Patients");

    // Add a second sheet: per-question MDAS long-format (for SPSS)
    const longRows: any[] = [];
    for (const p of patients) {
      for (const m of p.mdasScores) {
        longRows.push({
          patientCode: p.code,
          nationalId: p.nationalId,
          drugType: p.drugType,
          timePoint: m.timePoint,
          q1: m.q1, q2: m.q2, q3: m.q3, q4: m.q4, q5: m.q5,
          q6: m.q6, q7: m.q7, q8: m.q8, q9: m.q9, q10: m.q10,
          total: m.totalScore,
          filledAt: m.filledAt?.toISOString() || "",
        });
      }
    }
    const wsLong = XLSX.utils.json_to_sheet(longRows);
    (wsLong as any)["!views"] = [{ RTL: true }];
    XLSX.utils.book_append_sheet(wb, wsLong, "MDAS_LongFormat");

    // Summary sheet (group comparison)
    const summary: any[] = [];
    for (const drug of ["OLANZAPINE", "HALOPERIDOL"] as const) {
      const list = patients.filter((p) => p.drugType === drug);
      const baseline = list.map((p) => p.mdasScores.find((m) => m.timePoint === "BASELINE")?.totalScore).filter((v): v is number => typeof v === "number");
      const h24 = list.map((p) => p.mdasScores.find((m) => m.timePoint === "H24")?.totalScore).filter((v): v is number => typeof v === "number");
      const h48 = list.map((p) => p.mdasScores.find((m) => m.timePoint === "H48")?.totalScore).filter((v): v is number => typeof v === "number");
      const mean = (a: number[]) => a.length ? +(a.reduce((s,v)=>s+v,0)/a.length).toFixed(2) : null;
      const std = (a: number[]) => {
        if (a.length < 2) return null;
        const m = a.reduce((s,v)=>s+v,0)/a.length;
        return +Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1)).toFixed(2);
      };
      summary.push({
        group: drugLabel(drug),
        n: list.length,
        baseline_mean: mean(baseline),
        baseline_sd: std(baseline),
        h24_mean: mean(h24),
        h24_sd: std(h24),
        h48_mean: mean(h48),
        h48_sd: std(h48),
      });
    }
    const wsSummary = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Group_Summary");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="patients_${Date.now()}.xlsx"`,
      },
    });
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
