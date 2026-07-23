import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, verifyPassword } from "@/lib/auth";

// POST /api/backup — admin only, requires password confirmation
// Returns a JSON file containing ALL data in the system.
// This is the ONLY way to migrate between hosts — nothing must be lost.
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const password = String(body.password || "");

    const adminUser = await db.user.findUnique({ where: { id: admin.id } });
    if (!adminUser) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    const ok = await verifyPassword(password, adminUser.password);
    if (!ok) return NextResponse.json({ error: "رمز عبور نادرست است" }, { status: 401 });

    // Export ALL tables — nothing must be left behind
    const [users, groups, patients, mdasScores, auditLogs, departments, formItems] = await Promise.all([
      db.user.findMany({
        // Exclude password hashes for security — users will need to reset passwords after restore
        select: {
          id: true, username: true, fullName: true, phone: true, role: true,
          active: true, groupId: true, pagePermissions: true,
          createdAt: true, updatedAt: true,
        },
      }),
      db.group.findMany(),
      db.patient.findMany(),
      db.mdasScore.findMany(),
      db.auditLog.findMany(),
      db.department.findMany(),
      db.formItem.findMany(),
    ]);

    const counts = {
      users: users.length,
      groups: groups.length,
      patients: patients.length,
      mdasScores: mdasScores.length,
      auditLogs: auditLogs.length,
      departments: departments.length,
      formItems: formItems.length,
    };

    const payload = {
      _meta: {
        version: "3.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: admin.fullName,
        counts,
      },
      users,
      groups,
      patients,
      mdasScores,
      auditLogs,
      departments,
      formItems,
    };

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "BACKUP",
        detail: `خروجی کامل داده‌ها (${patients.length} بیمار، ${users.length} کاربر، ${mdasScores.length} نمره، ${formItems.length} سؤال)`,
      },
    });

    return NextResponse.json(payload, {
      headers: {
        "Content-Disposition": `attachment; filename="delirium_backup_${Date.now()}.json"`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور: " + e.message }, { status: 500 });
  }
}
