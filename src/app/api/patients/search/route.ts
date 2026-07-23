import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { normalizeDigits } from "@/lib/persian";

// GET /api/patients/search?q=...&nationalId=...
// Doctors can search & view their own; admins can view all.
// Returning a patient here lets the doctor open the file for follow-up (24h / 48h).
export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const nationalId = normalizeDigits(url.searchParams.get("nationalId") || "");

    if (!q && !nationalId) {
      return NextResponse.json(
        { error: "عبارت جستجو را وارد کنید" },
        { status: 400 }
      );
    }

    const where: any = { AND: [] };
    if (me.role !== "ADMIN") {
      // Doctors may search globally so they can fill follow-up data,
      // but only if they know the national ID. Free-text search restricted to own.
      if (nationalId) {
        where.AND.push({ nationalId });
      } else {
        where.AND.push({ createdById: me.id });
      }
    } else {
      if (nationalId) where.AND.push({ nationalId });
    }
    if (q && !nationalId) {
      const s = normalizeDigits(q);
      where.AND.push({
        OR: [
          { nationalId: { contains: s } },
          { code: { contains: s.toUpperCase() } },
          { fullName: { contains: q } },
        ],
      });
    }

    const patients = await db.patient.findMany({
      where,
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        mdasScores: { select: { timePoint: true, totalScore: true, filledAt: true } },
        createdBy: { select: { fullName: true, username: true } },
      },
    });
    return NextResponse.json({ patients });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "لطفاً وارد شوید" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
