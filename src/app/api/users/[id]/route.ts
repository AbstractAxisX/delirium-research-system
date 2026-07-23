import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { ALL_PAGES } from "@/app/api/users/route";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data: any = {};
    if (body.fullName) data.fullName = String(body.fullName).trim();
    if (body.phone !== undefined) data.phone = body.phone ? String(body.phone) : null;
    if (body.role) data.role = body.role === "ADMIN" ? "ADMIN" : "DOCTOR";
    if (typeof body.active === "boolean") data.active = body.active;
    if (body.groupId !== undefined) data.groupId = body.groupId || null;
    if (body.password) data.password = await hashPassword(String(body.password));
    if (Array.isArray(body.pagePermissions)) {
      const valid = body.pagePermissions.filter((p: string) => ALL_PAGES.some((ap) => ap.key === p));
      data.pagePermissions = valid.join(",");
    }
    const user = await db.user.update({
      where: { id },
      data,
      select: { id: true, username: true, fullName: true, phone: true, role: true, active: true, groupId: true, pagePermissions: true,
        group: { select: { id: true, name: true } } },
    });
    await db.auditLog.create({
      data: { userId: admin.id, action: "USER_MANAGE", detail: `ویرایش کاربر: ${user.fullName}` },
    });
    return NextResponse.json({ user });
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
    if (id === admin.id) {
      return NextResponse.json({ error: "امکان حذف حساب کاربری خودتان وجود ندارد" }, { status: 400 });
    }
    const user = await db.user.delete({ where: { id } });
    await db.auditLog.create({
      data: { userId: admin.id, action: "USER_MANAGE", detail: `حذف کاربر: ${user.fullName}` },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
