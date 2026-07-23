import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/auth";
import { DEFAULT_FORM_ITEMS } from "@/lib/form-items";

// GET /api/form-items — list form items
// Query: timePoint=BASELINE|H24|H48 — filter by time point
// Query: category=demographic|clinical|... — filter by category
// Query: includeInactive=1 — include inactive (admin)
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const timePoint = url.searchParams.get("timePoint") || "";
    const category = url.searchParams.get("category") || "";
    const includeInactive = url.searchParams.get("includeInactive") === "1";

    let items = await db.formItem.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    // Auto-seed if empty
    if (items.length === 0) {
      await seedDefaults();
      items = await db.formItem.findMany({
        where: includeInactive ? {} : { active: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
    }

    // Filter by timePoint
    if (timePoint) {
      items = items.filter((it) => {
        const tps = (it.timePoints || "BASELINE").split(",").map((s) => s.trim());
        return tps.includes(timePoint);
      });
    }

    // Filter by category
    if (category) {
      items = items.filter((it) => it.category === category);
    }

    // Parse optionsJson and ensure values are proper type
    const result = items.map((it) => {
      let options: any[] = [];
      try {
        if (it.optionsJson) options = JSON.parse(it.optionsJson);
      } catch {}
      return { ...it, options };
    });

    return NextResponse.json({ items: result });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "لطفاً وارد شوید" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطای سرور: " + e.message }, { status: 500 });
  }
}

// POST /api/form-items — create new item (admin only)
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const title = String(body.title || "").trim();
    if (!title) return NextResponse.json({ error: "متن سؤال الزامی است" }, { status: 400 });

    const validCategories = ["demographic", "clinical", "concomitant", "safety", "mdas", "outcome"];
    const category = validCategories.includes(body.category) ? body.category : "mdas";
    const validFieldTypes = ["text", "number", "radio", "select", "checkbox", "date", "textarea"];
    const fieldType = validFieldTypes.includes(body.fieldType) ? body.fieldType : "radio";
    const timePoints = typeof body.timePoints === "string" && body.timePoints
      ? body.timePoints
      : "BASELINE";
    const required = typeof body.required === "boolean" ? body.required : true;
    const description = body.description ? String(body.description) : null;
    const order = typeof body.order === "number" ? body.order : 0;

    let optionsJson = null;
    if (Array.isArray(body.options) && body.options.length > 0) {
      const valid = body.options.every((o: any) =>
        typeof o.value === "string" && typeof o.label === "string" && o.label.trim()
      );
      if (!valid) return NextResponse.json({ error: "گزینه‌ها نامعتبر است" }, { status: 400 });
      optionsJson = JSON.stringify(body.options);
    }

    const count = await db.formItem.count();
    const key = body.key ? String(body.key) : `${category}_${count + 1}_${Date.now().toString(36)}`;
    const exists = await db.formItem.findFirst({ where: { key } });
    if (exists) return NextResponse.json({ error: "کلید تکراری است" }, { status: 400 });

    const item = await db.formItem.create({
      data: { key, title, description, category, fieldType, optionsJson, timePoints, required, order, active: true },
    });
    await db.auditLog.create({
      data: { userId: admin.id, action: "FORM_ITEM_MANAGE", detail: `ایجاد سؤال: ${title.slice(0, 50)}` },
    });
    return NextResponse.json({ item });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور: " + e.message }, { status: 500 });
  }
}

// Seed default form items
async function seedDefaults() {
  for (const item of DEFAULT_FORM_ITEMS) {
    const exists = await db.formItem.findUnique({ where: { key: item.key } });
    if (!exists) {
      await db.formItem.create({
        data: {
          key: item.key,
          title: item.title,
          description: item.description || null,
          category: item.category,
          fieldType: item.fieldType,
          optionsJson: item.options ? JSON.stringify(item.options) : null,
          timePoints: item.timePoints,
          required: item.required,
          order: item.order,
          active: true,
        },
      });
    }
  }
}
