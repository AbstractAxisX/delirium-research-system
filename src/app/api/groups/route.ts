import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// GET /api/groups — list all groups (with member count, patient count)
export async function GET() {
  try {
    await requireAdmin();
    const groups = await db.group.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, patients: true } },
      },
    });
    return NextResponse.json({ groups });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// POST /api/groups — create new group
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const name = String(body.name || "").trim();
    const description = body.description ? String(body.description) : null;
    const color = body.color ? String(body.color) : "#0d9488";
    if (!name) return NextResponse.json({ error: "نام گروه الزامی است" }, { status: 400 });
    const exists = await db.group.findFirst({ where: { name } });
    if (exists) return NextResponse.json({ error: "نام گروه تکراری است" }, { status: 400 });
    const group = await db.group.create({ data: { name, description, color } });
    await db.auditLog.create({
      data: { userId: admin.id, action: "GROUP_MANAGE", detail: `ایجاد گروه: ${name}` },
    });
    return NextResponse.json({ group });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
