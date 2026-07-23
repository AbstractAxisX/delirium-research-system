import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";

// GET /api/profile — current user's full profile
export async function GET() {
  try {
    const me = await getSession();
    if (!me) return NextResponse.json({ error: "لطفاً وارد شوید" }, { status: 401 });
    const user = await db.user.findUnique({
      where: { id: me.id },
      select: {
        id: true, username: true, fullName: true, phone: true, role: true,
        groupId: true, createdAt: true,
        group: { select: { id: true, name: true, color: true } },
      },
    });
    if (!user) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// PATCH /api/profile — update fullName, phone, password (with current password)
export async function PATCH(req: NextRequest) {
  try {
    const me = await getSession();
    if (!me) return NextResponse.json({ error: "لطفاً وارد شوید" }, { status: 401 });
    const body = await req.json();
    const data: any = {};

    if (typeof body.fullName === "string" && body.fullName.trim()) {
      data.fullName = body.fullName.trim();
    }
    if (typeof body.phone === "string") {
      data.phone = body.phone.trim() || null;
    }

    // Password change requires current password verification
    if (body.newPassword) {
      if (!body.currentPassword) {
        return NextResponse.json({ error: "رمز فعلی را وارد کنید" }, { status: 400 });
      }
      const user = await db.user.findUnique({ where: { id: me.id } });
      if (!user) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
      const ok = await verifyPassword(body.currentPassword, user.password);
      if (!ok) {
        return NextResponse.json({ error: "رمز فعلی نادرست است" }, { status: 400 });
      }
      if (String(body.newPassword).length < 6) {
        return NextResponse.json({ error: "رمز جدید باید حداقل ۶ کاراکتر باشد" }, { status: 400 });
      }
      data.password = await hashPassword(body.newPassword);
    }

    const updated = await db.user.update({
      where: { id: me.id },
      data,
      select: { id: true, username: true, fullName: true, phone: true, role: true },
    });

    await db.auditLog.create({
      data: {
        userId: me.id,
        action: "PROFILE_UPDATE",
        detail: `ویرایش پروفایل${body.newPassword ? " + تغییر رمز" : ""}`,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (e: any) {
    return NextResponse.json({ error: "خطای سرور: " + e.message }, { status: 500 });
  }
}
