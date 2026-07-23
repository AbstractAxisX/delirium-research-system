import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { MDAS_ITEMS } from "@/lib/mdas";

// POST /api/mdas-items/seed — seed default 10 MDAS questions if not present
export async function POST() {
  try {
    await requireAdmin();
    let created = 0;
    for (let i = 0; i < MDAS_ITEMS.length; i++) {
      const item = MDAS_ITEMS[i];
      const existing = await db.mdasItem.findUnique({ where: { key: item.key } });
      if (!existing) {
        await db.mdasItem.create({
          data: { key: item.key, title: item.title, order: i, required: true, active: true },
        });
        created++;
      }
    }
    return NextResponse.json({ ok: true, created, total: MDAS_ITEMS.length });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
