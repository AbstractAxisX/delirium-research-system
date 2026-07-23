import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/auth";
import { MDAS_ITEMS, DEFAULT_OPTIONS } from "@/lib/mdas";

// GET /api/mdas-items — list all active MDAS items (any logged-in user)
// Query: timePoint=BASELINE|H24|H48 — filter items by time point
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const timePoint = url.searchParams.get("timePoint") || "";
    const includeInactive = url.searchParams.get("includeInactive") === "1";

    let items = await db.mdasItem.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    // Auto-seed if empty
    if (items.length === 0) {
      await seedDefaults();
      items = await db.mdasItem.findMany({
        where: includeInactive ? {} : { active: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
    }

    // Filter by timePoint if specified
    let filteredItems = items;
    if (timePoint) {
      filteredItems = items.filter((it) => {
        const tps = (it.timePoints || "BASELINE,H24,H48").split(",").map((s) => s.trim());
        return tps.includes(timePoint);
      });
    }

    // Parse optionsJson for each item; fall back to DEFAULT_OPTIONS
    const result = filteredItems.map((it) => {
      let options = DEFAULT_OPTIONS;
      try {
        if (it.optionsJson) {
          const parsed = JSON.parse(it.optionsJson);
          if (Array.isArray(parsed) && parsed.length > 0) options = parsed;
        }
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

// POST /api/mdas-items — create new item (admin only)
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const title = String(body.title || "").trim();
    if (!title) return NextResponse.json({ error: "متن سؤال الزامی است" }, { status: 400 });
    const description = body.description ? String(body.description) : null;
    const required = typeof body.required === "boolean" ? body.required : true;
    const timePoints = typeof body.timePoints === "string" && body.timePoints
      ? body.timePoints
      : "BASELINE,H24,H48";
    // Validate options if provided
    let optionsJson = null;
    if (Array.isArray(body.options) && body.options.length > 0) {
      // Validate each option has value and label
      const valid = body.options.every((o: any) =>
        typeof o.value === "number" && typeof o.label === "string" && o.label.trim()
      );
      if (!valid) return NextResponse.json({ error: "گزینه‌ها نامعتبر است" }, { status: 400 });
      optionsJson = JSON.stringify(body.options);
    }
    const count = await db.mdasItem.count();
    const key = body.key ? String(body.key) : `q${count + 1}_${Date.now().toString(36)}`;
    const order = typeof body.order === "number" ? body.order : count;
    const exists = await db.mdasItem.findFirst({ where: { key } });
    if (exists) return NextResponse.json({ error: "کلید تکراری است" }, { status: 400 });
    const item = await db.mdasItem.create({
      data: { key, title, description, optionsJson, timePoints, required, order, active: true },
    });
    await db.auditLog.create({
      data: { userId: admin.id, action: "MDAS_ITEM_MANAGE", detail: `ایجاد سؤال MDAS: ${title.slice(0, 50)}` },
    });
    return NextResponse.json({ item });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور: " + e.message }, { status: 500 });
  }
}

// Seed the 10 default MDAS questions if none exist
async function seedDefaults() {
  for (let i = 0; i < MDAS_ITEMS.length; i++) {
    const item = MDAS_ITEMS[i];
    await db.mdasItem.upsert({
      where: { key: item.key },
      update: {},
      create: {
        key: item.key,
        title: item.title,
        // Store the item's custom options if available, else default
        optionsJson: item.options ? JSON.stringify(item.options) : null,
        timePoints: "BASELINE,H24,H48",
        order: i,
        required: true,
        active: true,
      },
    });
  }
}
