import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  mean, std, ci95, cohensD, welchTTest, pairedTTest,
  oneWayAnova, formatPValue, fmtNum,
} from "@/lib/stats";

// GET /api/analytics — comprehensive analytics with statistical tests
export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const url = new URL(req.url);
    const fromDate = url.searchParams.get("fromDate") || "";
    const toDate = url.searchParams.get("toDate") || "";
    const department = url.searchParams.get("department") || "";
    const drugType = url.searchParams.get("drugType") || "";
    const patientIds = url.searchParams.get("patientIds") || ""; // comma-separated IDs for multi-select

    const patientWhere: any = {};
    if (me.role !== "ADMIN") patientWhere.createdById = me.id;
    if (department) patientWhere.department = department;
    if (drugType) patientWhere.drugType = drugType;
    if (patientIds) {
      const ids = patientIds.split(",").filter(Boolean);
      if (ids.length > 0) patientWhere.id = { in: ids };
    }
    if (fromDate || toDate) {
      patientWhere.createdAt = {};
      if (fromDate) patientWhere.createdAt.gte = new Date(fromDate);
      if (toDate) {
        const t = new Date(toDate);
        t.setHours(23, 59, 59, 999);
        patientWhere.createdAt.lte = t;
      }
    }

    const patients = await db.patient.findMany({
      where: patientWhere,
      include: {
        mdasScores: true,
        createdBy: { select: { fullName: true } },
        group: { select: { id: true, name: true, color: true } },
      },
    });

    // ---------- Helper: extract arrays for each time point per drug group ----------
    function extractScores(list: typeof patients, tp: string): number[] {
      const out: number[] = [];
      for (const p of list) {
        const m = p.mdasScores.find((s) => s.timePoint === tp);
        if (m && typeof m.totalScore === "number") out.push(m.totalScore);
      }
      return out;
    }
    function extractDeltas(list: typeof patients, fromTp: string, toTp: string): number[] {
      const out: number[] = [];
      for (const p of list) {
        const a = p.mdasScores.find((s) => s.timePoint === fromTp);
        const b = p.mdasScores.find((s) => s.timePoint === toTp);
        if (a && b && typeof a.totalScore === "number" && typeof b.totalScore === "number") {
          out.push(a.totalScore - b.totalScore); // positive = improvement
        }
      }
      return out;
    }
    /** Pairs (baseline, 48h) for paired t-test on same patients. */
    function extractPairs(list: typeof patients): { baseline: number; h48: number }[] {
      const out: { baseline: number; h48: number }[] = [];
      for (const p of list) {
        const b = p.mdasScores.find((s) => s.timePoint === "BASELINE");
        const h48 = p.mdasScores.find((s) => s.timePoint === "H48");
        if (b && h48 && typeof b.totalScore === "number" && typeof h48.totalScore === "number") {
          out.push({ baseline: b.totalScore, h48: h48.totalScore });
        }
      }
      return out;
    }

    const olanzapinePatients = patients.filter((p) => p.drugType === "OLANZAPINE");
    const haloperidolPatients = patients.filter((p) => p.drugType === "HALOPERIDOL");

    // Per-group stats
    type GroupStats = {
      group: string; n: number;
      baseline: number[]; h24: number[]; h48: number[];
      delta24: number[]; delta48: number[];
      baselineMean: number | null; h24Mean: number | null; h48Mean: number | null;
      delta24Mean: number | null; delta48Mean: number | null;
      baselineSd: number | null; h48Sd: number | null;
      baselineCI: { lower: number; upper: number } | null;
      h48CI: { lower: number; upper: number } | null;
      responder48h: number; responderRate48h: number | null;
      withH24: number; withH48: number;
    };
    function buildGroup(name: string, list: typeof patients): GroupStats {
      const baseline = extractScores(list, "BASELINE");
      const h24 = extractScores(list, "H24");
      const h48 = extractScores(list, "H48");
      const delta24 = extractDeltas(list, "BASELINE", "H24");
      const delta48 = extractDeltas(list, "BASELINE", "H48");
      const responder = delta48.filter((d) => d >= 0).filter((_, i) =>
        baseline[i] > 0 && delta48[i] / baseline[i] >= 0.5
      ).length;
      return {
        group: name,
        n: list.length,
        baseline, h24, h48, delta24, delta48,
        baselineMean: mean(baseline),
        h24Mean: mean(h24),
        h48Mean: mean(h48),
        delta24Mean: mean(delta24),
        delta48Mean: mean(delta48),
        baselineSd: std(baseline),
        h48Sd: std(h48),
        baselineCI: ci95(baseline),
        h48CI: ci95(h48),
        responder48h: responder,
        responderRate48h: baseline.length > 0 ? responder / baseline.length : null,
        withH24: h24.length,
        withH48: h48.length,
      };
    }

    const ol = buildGroup("اولانزاپین", olanzapinePatients);
    const ha = buildGroup("هالوپریدول", haloperidolPatients);

    // ---------- Statistical tests ----------
    // Welch's t-test on baseline (to check randomization balance)
    const baselineBalanceTest = welchTTest(ol.baseline, ha.baseline);
    // Welch's t-test on 48h scores (primary outcome)
    const h48Test = welchTTest(ol.h48, ha.h48);
    // Welch's t-test on delta 48 (improvement)
    const delta48Test = welchTTest(ol.delta48, ha.delta48);
    // Welch's t-test on delta 24
    const delta24Test = welchTTest(ol.delta24, ha.delta24);
    // Effect sizes
    const cohensDH48 = cohensD(ol.h48, ha.h48);
    const cohensDDelta48 = cohensD(ol.delta48, ha.delta48);
    // Paired t-tests within each group (baseline vs 48h)
    const olPairs = extractPairs(olanzapinePatients);
    const haPairs = extractPairs(haloperidolPatients);
    const olPaired = pairedTTest(
      olPairs.map((p) => p.baseline),
      olPairs.map((p) => p.h48)
    );
    const haPaired = pairedTTest(
      haPairs.map((p) => p.baseline),
      haPairs.map((p) => p.h48)
    );
    // One-way ANOVA on 48h across departments
    const deptGroups = new Map<string, number[]>();
    for (const p of patients) {
      const dep = p.department || "نامشخص";
      const h48 = p.mdasScores.find((m) => m.timePoint === "H48");
      if (h48 && typeof h48.totalScore === "number") {
        if (!deptGroups.has(dep)) deptGroups.set(dep, []);
        deptGroups.get(dep)!.push(h48.totalScore);
      }
    }
    const anovaByDept = oneWayAnova(Array.from(deptGroups.values()));

    // ---------- Per-item analysis ----------
    const itemKeys = ["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10"] as const;
    const perItem = itemKeys.map((k, idx) => {
      const olB: number[] = []; const olH24: number[] = []; const olH48: number[] = [];
      const haB: number[] = []; const haH24: number[] = []; const haH48: number[] = [];
      for (const p of patients) {
        const b = p.mdasScores.find((m) => m.timePoint === "BASELINE");
        const h24 = p.mdasScores.find((m) => m.timePoint === "H24");
        const h48 = p.mdasScores.find((m) => m.timePoint === "H48");
        const arr = p.drugType === "OLANZAPINE" ? [olB, olH24, olH48] : [haB, haH24, haH48];
        if (b && typeof (b as any)[k] === "number") arr[0].push((b as any)[k]);
        if (h24 && typeof (h24 as any)[k] === "number") arr[1].push((h24 as any)[k]);
        if (h48 && typeof (h48 as any)[k] === "number") arr[2].push((h48 as any)[k]);
      }
      const ttest48 = welchTTest(olH48, haH48);
      return {
        key: k,
        index: idx + 1,
        olanzapine: { baseline: mean(olB), h24: mean(olH24), h48: mean(olH48) },
        haloperidol: { baseline: mean(haB), h24: mean(haH24), h48: mean(haH48) },
        ttest48,
      };
    });

    // ---------- Histograms ----------
    function histogram(values: number[], min: number, max: number, binSize: number) {
      const bins: { label: string; count: number; olanzapine: number; haloperidol: number }[] = [];
      for (let start = min; start < max; start += binSize) {
        bins.push({
          label: `${start}-${start + binSize - 1}`,
          count: 0, olanzapine: 0, haloperidol: 0,
        });
      }
      bins.push({ label: `${max}`, count: 0, olanzapine: 0, haloperidol: 0 });
      for (const v of values) {
        let idx = Math.floor((v - min) / binSize);
        if (v === max) idx = bins.length - 1;
        if (idx >= 0 && idx < bins.length) bins[idx].count++;
      }
      // Fill per-group
      for (const p of patients) {
        const h48 = p.mdasScores.find((m) => m.timePoint === "H48");
        if (h48 && typeof h48.totalScore === "number") {
          let idx = Math.floor((h48.totalScore - min) / binSize);
          if (h48.totalScore === max) idx = bins.length - 1;
          if (idx >= 0 && idx < bins.length) {
            if (p.drugType === "OLANZAPINE") bins[idx].olanzapine++;
            else bins[idx].haloperidol++;
          }
        }
      }
      return bins;
    }
    const baselineHist = histogram(
      patients.map((p) => p.mdasScores.find((m) => m.timePoint === "BASELINE")?.totalScore).filter((v): v is number => typeof v === "number"),
      0, 30, 5
    );

    // ---------- Trajectories ----------
    const trajectories = patients.map((p) => {
      const b = p.mdasScores.find((m) => m.timePoint === "BASELINE");
      const h24 = p.mdasScores.find((m) => m.timePoint === "H24");
      const h48 = p.mdasScores.find((m) => m.timePoint === "H48");
      const baseline = b?.totalScore ?? null;
      const h48Score = h48?.totalScore ?? null;
      const responsePct = baseline != null && h48Score != null && baseline > 0
        ? Math.round(((baseline - h48Score) / baseline) * 100)
        : null;
      return {
        id: p.id, code: p.code, fullName: p.fullName, nationalId: p.nationalId,
        drugType: p.drugType, department: p.department, gender: p.gender, age: p.age,
        baseline, h24: h24?.totalScore ?? null, h48: h48Score,
        delta24: baseline != null && h24?.totalScore != null ? baseline - h24.totalScore : null,
        delta48: baseline != null && h48Score != null ? baseline - h48Score : null,
        responsePct,
        responder: responsePct != null && responsePct >= 50,
        groupName: p.group?.name,
      };
    });

    // ---------- Outcomes ----------
    const outcomes = {
      needExtraDose: patients.filter((p) => p.needExtraDose).length,
      earlyDischarge: patients.filter((p) => p.earlyDischarge).length,
      deathBefore72h: patients.filter((p) => p.deathBefore72h).length,
      relapse: patients.filter((p) => p.relapse).length,
      icuAdmission: patients.filter((p) => p.icuAdmission).length,
      patientRefusal: patients.filter((p) => p.patientRefusal).length,
      severeSideEffect: patients.filter((p) => p.severeSideEffect).length,
      physicalRestraint: patients.filter((p) => p.physicalRestraint).length,
    };
    // Outcomes by drug
    const outcomesByDrug = {
      OLANZAPINE: {
        needExtraDose: olanzapinePatients.filter((p) => p.needExtraDose).length,
        earlyDischarge: olanzapinePatients.filter((p) => p.earlyDischarge).length,
        deathBefore72h: olanzapinePatients.filter((p) => p.deathBefore72h).length,
        relapse: olanzapinePatients.filter((p) => p.relapse).length,
        icuAdmission: olanzapinePatients.filter((p) => p.icuAdmission).length,
        severeSideEffect: olanzapinePatients.filter((p) => p.severeSideEffect).length,
        physicalRestraint: olanzapinePatients.filter((p) => p.physicalRestraint).length,
        n: olanzapinePatients.length,
      },
      HALOPERIDOL: {
        needExtraDose: haloperidolPatients.filter((p) => p.needExtraDose).length,
        earlyDischarge: haloperidolPatients.filter((p) => p.earlyDischarge).length,
        deathBefore72h: haloperidolPatients.filter((p) => p.deathBefore72h).length,
        relapse: haloperidolPatients.filter((p) => p.relapse).length,
        icuAdmission: haloperidolPatients.filter((p) => p.icuAdmission).length,
        severeSideEffect: haloperidolPatients.filter((p) => p.severeSideEffect).length,
        physicalRestraint: haloperidolPatients.filter((p) => p.physicalRestraint).length,
        n: haloperidolPatients.length,
      },
    };

    // ---------- Department stats ----------
    const departmentMap = new Map<string, { count: number; baseline: number[]; h48: number[]; olCount: number; haCount: number }>();
    for (const p of patients) {
      const dep = p.department || "نامشخص";
      if (!departmentMap.has(dep)) departmentMap.set(dep, { count: 0, baseline: [], h48: [], olCount: 0, haCount: 0 });
      const e = departmentMap.get(dep)!;
      e.count++;
      if (p.drugType === "OLANZAPINE") e.olCount++; else e.haCount++;
      const b = p.mdasScores.find((m) => m.timePoint === "BASELINE")?.totalScore;
      const h48 = p.mdasScores.find((m) => m.timePoint === "H48")?.totalScore;
      if (typeof b === "number") e.baseline.push(b);
      if (typeof h48 === "number") e.h48.push(h48);
    }
    const departmentStats = Array.from(departmentMap.entries()).map(([dep, e]) => ({
      department: dep, count: e.count, olCount: e.olCount, haCount: e.haCount,
      baselineMean: mean(e.baseline), h48Mean: mean(e.h48),
    }));

    // ---------- Group stats (for groups view in analytics) ----------
    const groupMap = new Map<string, { count: number; baseline: number[]; h48: number[]; color: string }>();
    for (const p of patients) {
      const gname = p.group?.name || "بدون گروه";
      const gcolor = p.group?.color || "#94a3b8";
      if (!groupMap.has(gname)) groupMap.set(gname, { count: 0, baseline: [], h48: [], color: gcolor });
      const e = groupMap.get(gname)!;
      e.count++;
      const b = p.mdasScores.find((m) => m.timePoint === "BASELINE")?.totalScore;
      const h48 = p.mdasScores.find((m) => m.timePoint === "H48")?.totalScore;
      if (typeof b === "number") e.baseline.push(b);
      if (typeof h48 === "number") e.h48.push(h48);
    }
    const groupStats = Array.from(groupMap.entries()).map(([name, e]) => ({
      name, color: e.color, count: e.count,
      baselineMean: mean(e.baseline), h48Mean: mean(e.h48),
      deltaMean: (mean(e.baseline) != null && mean(e.h48) != null) ? (mean(e.baseline)! - mean(e.h48)!) : null,
    }));

    return NextResponse.json({
      total: patients.length,
      olanzapine: ol,
      haloperidol: ha,
      // Statistical tests
      stats: {
        baselineBalanceTest,
        h48Test,
        delta24Test,
        delta48Test,
        cohensDH48,
        cohensDDelta48,
        olPaired,
        haPaired,
        anovaByDept,
      },
      perItem,
      baselineHist,
      departmentStats,
      groupStats,
      outcomes,
      outcomesByDrug,
      trajectories,
      role: me.role,
    });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "لطفاً وارد شوید" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطای سرور: " + e.message }, { status: 500 });
  }
}
