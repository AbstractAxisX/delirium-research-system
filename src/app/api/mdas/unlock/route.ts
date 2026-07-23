import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// POST /api/mdas/unlock  { id } — admin can unlock a locked MDAS form
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const record = await db.mdasScore.update({
      where: { id },
      data: { locked: false, lockedAt: null, lastSavedAt: new Date() },
    });
    await db.auditLog.create({
      data: {
        userId: admin.id,
        patientId: record.patientId,
        action: "UNLOCK_MDAS",
        detail: `باز کردن قفل فرم MDAS (${record.timePoint})`,
      },
    });
    return NextResponse.json({ ok: true, mdas: record });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "فقط مدیر" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
