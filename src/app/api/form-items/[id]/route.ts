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
    if (typeof body.title === "string") data.title = body.title.trim();
    if (body.description !== undefined) data.description = body.description ? String(body.description) : null;
    if (typeof body.required === "boolean") data.required = body.required;
    if (typeof body.order === "number") data.order = body.order;
    if (typeof body.active === "boolean") data.active = body.active;
    if (typeof body.timePoints === "string" && body.timePoints) data.timePoints = body.timePoints;
    if (typeof body.category === "string") data.category = body.category;
    if (typeof body.fieldType === "string") data.fieldType = body.fieldType;
    if (Array.isArray(body.options) && body.options.length > 0) {
      const valid = body.options.every((o: any) =>
        typeof o.value === "string" && typeof o.label === "string" && o.label.trim()
      );
      if (!valid) return NextResponse.json({ error: "گزینه‌ها نامعتبر است" }, { status: 400 });
      data.optionsJson = JSON.stringify(body.options);
    }
    if (body.options !== undefined && (!Array.isArray(body.options) || body.options.length === 0)) {
      data.optionsJson = null;
    }
    const item = await db.formItem.update({ where: { id }, data });
    await db.auditLog.create({
      data: { userId: admin.id, action: "FORM_ITEM_MANAGE", detail: `ویرایش سؤال: ${item.title.slice(0, 50)}` },
    });
    return NextResponse.json({ item });
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
    const item = await db.formItem.delete({ where: { id } });
    await db.auditLog.create({
      data: { userId: admin.id, action: "FORM_ITEM_MANAGE", detail: `حذف سؤال: ${item.title.slice(0, 50)}` },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
