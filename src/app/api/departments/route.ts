import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/auth";

// GET /api/departments — list all active departments (any logged-in user)
export async function GET() {
  try {
    await requireUser();
    const depts = await db.department.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ departments: depts });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "لطفاً وارد شوید" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// POST /api/departments — create (admin only)
// If a department with the same name exists (even inactive), it gets reactivated
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "نام بخش الزامی است" }, { status: 400 });

    const existing = await db.department.findFirst({ where: { name } });
    let dept;
    if (existing) {
      // Reactivate if it was inactive
      dept = await db.department.update({
        where: { id: existing.id },
        data: { active: true, sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : existing.sortOrder },
      });
    } else {
      const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : 0;
      dept = await db.department.create({ data: { name, sortOrder } });
    }
    await db.auditLog.create({
      data: { userId: admin.id, action: "DEPT_MANAGE", detail: `ایجاد/فعال‌سازی بخش: ${name}` },
    });
    return NextResponse.json({ department: dept });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
