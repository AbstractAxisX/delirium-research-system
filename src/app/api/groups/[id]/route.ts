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
    if (body.description !== undefined) data.description = body.description ? String(body.description) : null;
    if (body.color) data.color = String(body.color);
    const group = await db.group.update({ where: { id }, data });
    await db.auditLog.create({
      data: { userId: admin.id, action: "GROUP_MANAGE", detail: `ویرایش گروه: ${group.name}` },
    });
    return NextResponse.json({ group });
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
    // Unlink users & patients before delete
    await db.user.updateMany({ where: { groupId: id }, data: { groupId: null } });
    await db.patient.updateMany({ where: { groupId: id }, data: { groupId: null } });
    const group = await db.group.delete({ where: { id } });
    await db.auditLog.create({
      data: { userId: admin.id, action: "GROUP_MANAGE", detail: `حذف گروه: ${group.name}` },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
