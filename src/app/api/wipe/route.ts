import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, verifyPassword } from "@/lib/auth";

// POST /api/wipe — admin only, requires password + confirm text
// Wipes ALL patient data: patients, mdasScores, auditLogs
// KEEPS system configuration: users, groups, departments, formItems
// This is the "delete all research data" button.
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const password = String(body.password || "");
    const confirmText = String(body.confirmText || "");

    // Double confirmation: password + exact text "حذف همه"
    if (confirmText !== "حذف همه") {
      return NextResponse.json(
        { error: "برای تأیید، عبارت «حذف همه» را وارد کنید" },
        { status: 400 }
      );
    }

    const adminUser = await db.user.findUnique({ where: { id: admin.id } });
    if (!adminUser) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    const ok = await verifyPassword(password, adminUser.password);
    if (!ok) return NextResponse.json({ error: "رمز عبور نادرست است" }, { status: 401 });

    // Wipe in dependency order (children first, parents last)
    // Use a transaction so it's atomic — if anything fails, nothing is deleted
    const counts = await db.$transaction(async (tx) => {
      const c1 = await tx.mdasScore.deleteMany();
      const c2 = await tx.auditLog.deleteMany();
      const c3 = await tx.patient.deleteMany();
      return { mdas: c1.count, audit: c2.count, patients: c3.count };
    }, {
      timeout: 30000,
    });

    // Log the wipe (outside the transaction so it always succeeds)
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "WIPE_DATA",
        detail: `حذف کامل داده‌های تحقیق (${counts.patients} بیمار، ${counts.mdas} نمره MDAS، ${counts.audit} لاگ تغییرات)`,
      },
    });

    return NextResponse.json({ ok: true, deleted: counts });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور: " + e.message }, { status: 500 });
  }
}
