import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { fullName: true, username: true } },
        patient: { select: { code: true } },
      },
    });
    return NextResponse.json({ logs });
  } catch {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }
}
