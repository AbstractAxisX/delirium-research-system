// One-time seed: create admin user if not exists.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST() {
  try {
    const exists = await db.user.findFirst({ where: { OR: [{ username: "admin" }, { role: "ADMIN" }] } });
    if (exists) {
      return NextResponse.json({ ok: true, message: "admin already exists", username: exists.username });
    }
    const hashed = await hashPassword("admin123");
    const admin = await db.user.create({
      data: {
        username: "admin",
        fullName: "مدیر سامانه",
        phone: "09120000000",
        role: "ADMIN",
        password: hashed,
      },
      select: { id: true, username: true, fullName: true, role: true },
    });
    return NextResponse.json({ ok: true, admin });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
