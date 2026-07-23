"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ClipboardList, Plus, Pencil, Trash2, Loader2, Star, AlertCircle, X, ChevronDown, ChevronUp, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { toPersianDigits } from "@/lib/persian";
import { TIME_POINTS, type TimePoint } from "@/lib/mdas";
import { CATEGORY_LABELS, FIELD_TYPE_LABELS } from "@/lib/form-items";

type Option = { value: string; label: string };

type FormItem = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  category: string;
  fieldType: string;
  options: Option[];
  optionsJson: string | null;
  timePoints: string;
  order: number;
  required: boolean;
  active: boolean;
  createdAt: string;
};

export function FormItemsView() {
  const { user, refreshKey } = useApp();
  const [items, setItems] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FormItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "mdas",
    fieldType: "radio",
    required: true,
    order: 0,
    timePoints: ["BASELINE"] as TimePoint[],
    options: [] as Option[],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role !== "ADMIN") { setLoading(false); return; }
    loadItems();
  }, [refreshKey, user]);

  async function loadItems() {
    try {
      const r: any = await api("/api/form-items?includeInactive=1");
      setItems(r.items || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  }

  function openNew() {
    setEditing(null);
    setForm({
      title: "", description: "", category: "mdas", fieldType: "radio",
      required: true, order: items.length, timePoints: ["BASELINE"], options: [],
    });
    setShowForm(true);
  }

  function openEdit(item: FormItem) {
    let tps: TimePoint[] = ["BASELINE"];
    try { tps = (item.timePoints || "BASELINE").split(",").filter(Boolean) as TimePoint[]; } catch {}
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description || "",
      category: item.category,
      fieldType: item.fieldType,
      required: item.required,
      order: item.order,
      timePoints: tps,
      options: item.options || [],
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.title.trim()) { toast.error("متن سؤال الزامی است"); return; }
    if (form.timePoints.length === 0) { toast.error("حداقل یک فرم را انتخاب کنید"); return; }
    if ((form.fieldType === "radio" || form.fieldType === "select") && form.options.length === 0) {
      toast.error("برای این نوع سؤال حداقل یک گزینه لازم است");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        fieldType: form.fieldType,
        required: form.required,
        order: form.order,
        timePoints: form.timePoints.join(","),
      };
      if (form.fieldType === "radio" || form.fieldType === "select") {
        body.options = form.options;
      }
      if (editing) {
        await api(`/api/form-items/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast.success("سؤال ویرایش شد");
      } else {
        await api("/api/form-items", { method: "POST", body: JSON.stringify(body) });
        toast.success("سؤال جدید اضافه شد");
      }
      setShowForm(false);
      await loadItems();
    } catch (e: any) {
      toast.error(e.message || "خطا");
    } finally { setSaving(false); }
  }

  async function toggleRequired(item: FormItem) {
    try {
      await api(`/api/form-items/${item.id}`, { method: "PATCH", body: JSON.stringify({ required: !item.required }) });
      toast.success(item.required ? "اختیاری شد" : "الزامی شد");
      await loadItems();
    } catch (e: any) { toast.error(e.message); }
  }

  async function toggleActive(item: FormItem) {
    try {
      await api(`/api/form-items/${item.id}`, { method: "PATCH", body: JSON.stringify({ active: !item.active }) });
      toast.success(item.active ? "غیرفعال شد" : "فعال شد");
      await loadItems();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(item: FormItem) {
    if (!confirm(`حذف سؤال «${item.title.slice(0, 50)}...»؟`)) return;
    try {
      await api(`/api/form-items/${item.id}`, { method: "DELETE" });
      toast.success("حذف شد");
      await loadItems();
    } catch (e: any) { toast.error(e.message); }
  }

  async function moveOrder(item: FormItem, direction: "up" | "down") {
    const newOrder = direction === "up" ? item.order - 1 : item.order + 1;
    try {
      await api(`/api/form-items/${item.id}`, { method: "PATCH", body: JSON.stringify({ order: newOrder }) });
      await loadItems();
    } catch (e: any) { toast.error(e.message); }
  }

  function toggleTimePoint(tp: TimePoint) {
    setForm((f) => ({
      ...f,
      timePoints: f.timePoints.includes(tp) ? f.timePoints.filter((x) => x !== tp) : [...f.timePoints, tp],
    }));
  }

  function updateOption(idx: number, field: "value" | "label", v: string) {
    setForm((f) => {
      const opts = [...f.options];
      opts[idx] = { ...opts[idx], [field]: v };
      return { ...f, options: opts };
    });
  }

  function addOption() {
    setForm((f) => ({ ...f, options: [...f.options, { value: String(f.options.length), label: "" }] }));
  }

  function removeOption(idx: number) {
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== idx) }));
  }

  if (user?.role !== "ADMIN") {
    return <div className="text-center py-12 text-muted-foreground">دسترسی فقط برای مدیر</div>;
  }

  if (loading) {
    return <div className="grid place-items-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // Group items by category
  const categories = ["demographic", "clinical", "concomitant", "safety", "mdas", "outcome"];
  const filteredItems = categoryFilter === "ALL" ? items : items.filter((i) => i.category === categoryFilter);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            مدیریت سؤالات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            مدیریت همه سؤالات فرم: هویتی، بالینی، متغیرهای همراه، ایمنی، MDAS و پیامدهای بالینی
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          سؤال جدید
        </Button>
      </div>

      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardContent className="p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-0.5">راهنما:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>هر سؤال برای یکی، دو یا هر سه فرم (پایه، ۲۴h، ۴۸h) قابل تنظیم است</li>
              <li>سؤالات در ۶ دسته تقسیم می‌شوند: هویتی، بالینی، متغیرهای همراه، ایمنی، MDAS، پیامدها</li>
              <li>سؤالات الزامی با <Star className="h-3 w-3 inline text-destructive" /> نشان داده می‌شوند</li>
              <li>غیرفعال کردن سؤال، آن را از فرم‌ها پنهان می‌کند اما داده‌های قبلی حفظ می‌شوند</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <button
          onClick={() => setCategoryFilter("ALL")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            categoryFilter === "ALL" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
          }`}
        >
          همه ({toPersianDigits(items.length)})
        </button>
        {categories.map((cat) => {
          const count = items.filter((i) => i.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                categoryFilter === cat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
              }`}
            >
              {CATEGORY_LABELS[cat]} ({toPersianDigits(count)})
            </button>
          );
        })}
      </div>

      {/* Items table grouped by category */}
      {categoryFilter === "ALL" ? (
        categories.map((cat) => {
          const catItems = items.filter((i) => i.category === cat);
          if (catItems.length === 0) return null;
          return (
            <Card key={cat}>
              <CardHeader className="pb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full`} style={{ background: CATEGORY_COLOR_HEX[cat] || "#888" }} />
                  {CATEGORY_LABELS[cat]}
                  <Badge variant="outline" className="text-[10px]">{toPersianDigits(catItems.length)}</Badge>
                </h3>
              </CardHeader>
              <CardContent className="p-0">
                <ItemsTable items={catItems} onEdit={openEdit} onToggleReq={toggleRequired} onToggleActive={toggleActive} onDelete={remove} onMove={moveOrder} />
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card>
          <CardContent className="p-0">
            <ItemsTable items={filteredItems} onEdit={openEdit} onToggleReq={toggleRequired} onToggleActive={toggleActive} onDelete={remove} onMove={moveOrder} />
          </CardContent>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {editing ? "ویرایش سؤال" : "سؤال جدید"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "متن سؤال و تنظیمات را ویرایش کنید" : "سؤال جدید را تعریف کنید"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2" dir="rtl">
            <div className="space-y-1.5">
              <Label className="text-xs">متن سؤال *</Label>
              <Textarea
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                rows={2}
                placeholder="مثلاً: نام و نام خانوادگی بیمار"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">توضیحات (اختیاری)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="توضیح کوتاه"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">دسته سؤال *</Label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">نوع فیلد *</Label>
                <select
                  value={form.fieldType}
                  onChange={(e) => setForm({ ...form, fieldType: e.target.value })}
                  className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                >
                  {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">در کدام فرم‌ها نمایش داده شود؟ *</Label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_POINTS.map((tp) => {
                  const checked = form.timePoints.includes(tp.key);
                  return (
                    <label
                      key={tp.key}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        checked ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                      }`}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleTimePoint(tp.key)} />
                      <span>{tp.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-xs cursor-pointer">سؤال الزامی</Label>
                  <p className="text-[10px] text-muted-foreground">با ستاره نشان داده می‌شود</p>
                </div>
                <Switch checked={form.required} onCheckedChange={(v) => setForm({ ...form, required: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ترتیب نمایش</Label>
                <Input
                  type="text" inputMode="numeric"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                  dir="ltr"
                  className="text-left font-mono"
                  min={0}
                />
              </div>
            </div>

            {(form.fieldType === "radio" || form.fieldType === "select") && (
              <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                <Label className="text-xs font-semibold">گزینه‌ها</Label>
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={opt.value}
                      onChange={(e) => updateOption(idx, "value", e.target.value)}
                      className="w-24 font-mono text-center"
                      placeholder="value"
                    />
                    <Input
                      value={opt.label}
                      onChange={(e) => updateOption(idx, "label", e.target.value)}
                      className="flex-1"
                      placeholder="متن گزینه"
                    />
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeOption(idx)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addOption} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />افزودن گزینه
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 ml-1 animate-spin" />}
              {editing ? "ذخیره" : "افزودن سؤال"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CATEGORY_COLOR_HEX: Record<string, string> = {
  demographic: "#0d9488",
  clinical: "#10b981",
  concomitant: "#7c3aed",
  safety: "#f59e0b",
  mdas: "#0891b2",
  outcome: "#e11d48",
};

function ItemsTable({ items, onEdit, onToggleReq, onToggleActive, onDelete, onMove }: {
  items: FormItem[];
  onEdit: (i: FormItem) => void;
  onToggleReq: (i: FormItem) => void;
  onToggleActive: (i: FormItem) => void;
  onDelete: (i: FormItem) => void;
  onMove: (i: FormItem, d: "up" | "down") => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-right text-xs w-16">#</TableHead>
            <TableHead className="text-right text-xs">متن سؤال</TableHead>
            <TableHead className="text-center text-xs w-20">نوع</TableHead>
            <TableHead className="text-center text-xs w-32">فرم‌ها</TableHead>
            <TableHead className="text-center text-xs w-20">الزامی</TableHead>
            <TableHead className="text-center text-xs w-20">فعال</TableHead>
            <TableHead className="text-right text-xs w-24">عملیات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">
                موردی در این دسته نیست
              </TableCell>
            </TableRow>
          ) : (
            items.map((item, idx) => {
              const tps = (item.timePoints || "BASELINE").split(",");
              return (
                <TableRow key={item.id} className={!item.active ? "opacity-50" : ""}>
                  <TableCell className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <div className="flex flex-col">
                        <button onClick={() => onMove(item, "up")} className="text-muted-foreground hover:text-foreground" title="بالا">
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button onClick={() => onMove(item, "down")} className="text-muted-foreground hover:text-foreground" title="پایین">
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="font-mono text-xs font-bold">{toPersianDigits(idx + 1)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-start gap-1.5">
                      {item.required && <Star className="h-3 w-3 text-destructive fill-destructive shrink-0 mt-1" />}
                      <div>
                        <p className="font-medium leading-relaxed">{item.title}</p>
                        {item.description && <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-[10px] text-muted-foreground">
                    {FIELD_TYPE_LABELS[item.fieldType] || item.fieldType}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-wrap gap-0.5 justify-center">
                      {tps.includes("BASELINE") && <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary">پایه</span>}
                      {tps.includes("H24") && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">۲۴h</span>}
                      {tps.includes("H48") && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">۴۸h</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => onToggleReq(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium min-w-[60px] min-h-[36px] transition-colors touch-manipulation ${
                        item.required
                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {item.required ? "الزامی ★" : "اختیاری"}
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => onToggleActive(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium min-w-[60px] min-h-[36px] transition-colors touch-manipulation ${
                        item.active
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {item.active ? "فعال" : "غیرفعال"}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button onClick={() => onEdit(item)} className="p-2 rounded-lg hover:bg-accent min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => onDelete(item)} className="p-2 rounded-lg hover:bg-rose-500/10 text-destructive min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
