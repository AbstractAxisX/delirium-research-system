import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { normalizeDigits } from "@/lib/persian";

// All page keys that can be granted to a doctor
export const ALL_PAGES = [
  { key: "dashboard", label: "داشبورد" },
  { key: "new-patient", label: "ثبت بیمار جدید" },
  { key: "search-patient", label: "جستجوی بیمار" },
  { key: "all-patients", label: "همه بیماران" },
  { key: "patient-detail", label: "جزئیات بیمار" },
  { key: "analytics", label: "تحلیل داده‌ها" },
  { key: "export", label: "خروجی داده" },
];

export async function GET() {
  try {
    await requireAdmin();
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, username: true, fullName: true, phone: true,
        role: true, active: true, groupId: true, pagePermissions: true, createdAt: true,
        group: { select: { id: true, name: true, color: true } },
        _count: { select: { patients: true } },
      },
    });
    return NextResponse.json({ users, allPages: ALL_PAGES });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const username = normalizeDigits(String(body.username || "")).trim();
    const fullName = String(body.fullName || "").trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    const role = body.role === "ADMIN" ? "ADMIN" : "DOCTOR";
    const groupId = body.groupId || null;
    const password = String(body.password || "");
    if (!username || !fullName || !password) {
      return NextResponse.json(
        { error: "نام کاربری، نام کامل و رمز عبور الزامی است" },
        { status: 400 }
      );
    }
    const exists = await db.user.findFirst({
      where: { OR: [{ username }, ...(phone ? [{ phone }] : [])] },
    });
    if (exists) {
      return NextResponse.json(
        { error: "نام کاربری یا موبایل قبلاً ثبت شده" },
        { status: 400 }
      );
    }
    const hashed = await hashPassword(password);
    // Validate pagePermissions
    let perms = "dashboard,new-patient,search-patient,all-patients,patient-detail";
    if (Array.isArray(body.pagePermissions)) {
      const valid = body.pagePermissions.filter((p: string) => ALL_PAGES.some((ap) => ap.key === p));
      perms = valid.join(",");
    }
    const user = await db.user.create({
      data: { username, fullName, phone, role, password: hashed, groupId, pagePermissions: perms },
      select: {
        id: true, username: true, fullName: true, phone: true, role: true,
        active: true, createdAt: true, groupId: true, pagePermissions: true,
        group: { select: { id: true, name: true } },
      },
    });
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "USER_MANAGE",
        detail: `ایجاد کاربر جدید: ${user.fullName} (${user.username})`,
      },
    });
    return NextResponse.json({ user });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
