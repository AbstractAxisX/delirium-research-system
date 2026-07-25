import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { computeFollowUpStatus } from "@/lib/followup";

// GET /api/dashboard — overview stats with flexible follow-up timing
export async function GET() {
  try {
    const me = await requireUser();
    const isAdmin = me.role === "ADMIN";

    const where = isAdmin ? {} : { createdById: me.id };

    const [
      total,
      byDrug,
      byDepartment,
      byUser,
      recent,
      allWithScores,
      mdasCounts,
    ] = await Promise.all([
      db.patient.count({ where }),
      db.patient.groupBy({ by: ["drugType"], where, _count: true }),
      db.patient.groupBy({ by: ["department"], where, _count: true }),
      isAdmin
        ? db.patient.groupBy({ by: ["createdById"], where, _count: true })
        : Promise.resolve([]),
      db.patient.findMany({
        where, orderBy: { createdAt: "desc" }, take: 8,
        include: {
          mdasScores: { select: { timePoint: true, totalScore: true, filledAt: true, answersJson: true, q1: true } },
          createdBy: { select: { fullName: true } },
        },
      }),
      db.patient.findMany({
        where,
        include: {
          mdasScores: { select: { timePoint: true, totalScore: true, filledAt: true, answersJson: true, q1: true } },
          createdBy: { select: { fullName: true } },
        },
      }),
      db.mdasScore.groupBy({ by: ["timePoint"], _count: true }),
    ]);

    // Compute follow-up info for each patient
    const now = new Date();
    const needs24h: any[] = [];
    const needs48h: any[] = [];
    const overdue: any[] = [];
    const complete: any[] = [];

    for (const p of allWithScores) {
      const baseline = p.mdasScores.find((m) => m.timePoint === "BASELINE");
      const h24 = p.mdasScores.find((m) => m.timePoint === "H24");
      const h48 = p.mdasScores.find((m) => m.timePoint === "H48");
      // Check if MDAS answers (q1-q10) actually exist for H24/H48
      const h24HasMdas = h24 ? (() => {
        try {
          const ans = h24.answersJson ? JSON.parse(h24.answersJson) : {};
          if (Object.keys(ans).some(k => k.startsWith("q") && typeof ans[k] === "number")) return true;
          // Fallback: check legacy q1-q10 columns
          return (h24 as any).q1 != null;
        } catch { return false; }
      })() : false;
      const h48HasMdas = h48 ? (() => {
        try {
          const ans = h48.answersJson ? JSON.parse(h48.answersJson) : {};
          if (Object.keys(ans).some(k => k.startsWith("q") && typeof ans[k] === "number")) return true;
          return (h48 as any).q1 != null;
        } catch { return false; }
      })() : false;
      const info = computeFollowUpStatus(baseline?.filledAt, h24?.filledAt, h48?.filledAt, now, h24HasMdas, h48HasMdas);
      (p as any).followUp = info;
      if (info.status === "needs_24h") needs24h.push(p);
      else if (info.status === "needs_48h") needs48h.push(p);
      else if (info.status === "complete") complete.push(p);
      if (info.overdueHours && info.overdueHours > 0) overdue.push(p);
    }

    // Recent follow-up needed (priority: overdue first, then due)
    const followUpNeeded = [...overdue, ...needs24h, ...needs48h]
      .sort((a, b) => (b.followUp.overdueHours || 0) - (a.followUp.overdueHours || 0))
      .slice(0, 50);

    // Resolve user names for byUser
    let byUserNamed: any[] = [];
    if (isAdmin && byUser.length) {
      const userIds = byUser.map((b) => b.createdById);
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true, username: true },
      });
      byUserNamed = byUser.map((b) => {
        const u = users.find((x) => x.id === b.createdById);
        return { user: u?.fullName || "—", count: b._count };
      });
    }

    return NextResponse.json({
      total,
      byDrug: byDrug.map((b) => ({ drugType: b.drugType, count: b._count })),
      byDepartment: byDepartment.filter((b) => b.department).map((b) => ({ department: b.department, count: b._count })),
      byUser: byUserNamed,
      recent: recent.map((p) => {
        const baseline = p.mdasScores.find((m) => m.timePoint === "BASELINE");
        const h24 = p.mdasScores.find((m) => m.timePoint === "H24");
        const h48 = p.mdasScores.find((m) => m.timePoint === "H48");
        const h24HasMdas = h24 ? (() => {
          try { const a = h24.answersJson ? JSON.parse(h24.answersJson) : {}; return Object.keys(a).some(k => k.startsWith("q") && typeof a[k] === "number") || (h24 as any).q1 != null; } catch { return false; }
        })() : false;
        const h48HasMdas = h48 ? (() => {
          try { const a = h48.answersJson ? JSON.parse(h48.answersJson) : {}; return Object.keys(a).some(k => k.startsWith("q") && typeof a[k] === "number") || (h48 as any).q1 != null; } catch { return false; }
        })() : false;
        return { ...p, followUp: computeFollowUpStatus(baseline?.filledAt, h24?.filledAt, h48?.filledAt, now, h24HasMdas, h48HasMdas) };
      }),
      followUpNeeded,
      counts: {
        needs24h: needs24h.length,
        needs48h: needs48h.length,
        overdue: overdue.length,
        complete: complete.length,
      },
      mdasCounts: mdasCounts.map((m) => ({ timePoint: m.timePoint, count: m._count })),
      role: me.role,
    });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "لطفاً وارد شوید" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطای سرور: " + e.message }, { status: 500 });
  }
}
