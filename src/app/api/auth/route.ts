import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSession,
  setSessionCookie,
  verifyPassword,
  type SessionUser,
} from "@/lib/auth";
import { normalizeDigits } from "@/lib/persian";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user: s });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let username = normalizeDigits(String(body.username || "")).trim();
    const password = String(body.password || "");
    if (!username || !password) {
      return NextResponse.json(
        { error: "نام کاربری و رمز عبور را وارد کنید" },
        { status: 400 }
      );
    }
    const user = await db.user.findFirst({
      where: { OR: [{ username }, { phone: username }] },
    });
    if (!user || !user.active) {
      return NextResponse.json(
        { error: "کاربر یافت نشد یا غیرفعال است" },
        { status: 401 }
      );
    }
    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      return NextResponse.json(
        { error: "رمز عبور نادرست است" },
        { status: 401 }
      );
    }
    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as "ADMIN" | "DOCTOR",
      pagePermissions: user.role === "ADMIN" ? undefined : user.pagePermissions.split(",").filter(Boolean),
    };
    await setSessionCookie(sessionUser);
    await db.auditLog.create({
      data: { userId: user.id, action: "LOGIN", detail: "ورود موفق" },
    });
    return NextResponse.json({ user: sessionUser });
  } catch (e) {
    return NextResponse.json(
      { error: "خطای سرور در ورود" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const s = await getSession();
  if (s) {
    await db.auditLog.create({
      data: { userId: s.id, action: "LOGOUT", detail: "خروج" },
    });
  }
  const { clearSessionCookie } = await import("@/lib/auth");
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
