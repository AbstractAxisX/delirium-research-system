import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data: any = {};
    if (body.name) data.name = String(body.name).trim();
    if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
    if (typeof body.active === "boolean") data.active = body.active;
    const dept = await db.department.update({ where: { id }, data });
    await db.auditLog.create({
      data: { userId: admin.id, action: "DEPT_MANAGE", detail: `ویرایش بخش: ${dept.name}` },
    });
    return NextResponse.json({ department: dept });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const dept = await db.department.delete({ where: { id } });
    await db.auditLog.create({
      data: { userId: admin.id, action: "DEPT_MANAGE", detail: `حذف بخش: ${dept.name}` },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
