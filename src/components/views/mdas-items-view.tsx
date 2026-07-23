"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ClipboardList, Plus, Pencil, Trash2, Loader2, GripVertical, Star, AlertCircle, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { toPersianDigits } from "@/lib/persian";
import { DEFAULT_OPTIONS, TIME_POINTS, type TimePoint } from "@/lib/mdas";

type Option = { value: number; severity?: string; label: string };

type MdasItem = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  options: Option[];
  optionsJson: string | null;
  timePoints: string;
  order: number;
  required: boolean;
  active: boolean;
  createdAt: string;
};

export function MdasItemsView() {
  const { user, refreshKey } = useApp();
  const [items, setItems] = useState<MdasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MdasItem | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    required: true,
    order: 0,
    timePoints: ["BASELINE", "H24", "H48"] as TimePoint[],
    options: [...DEFAULT_OPTIONS] as Option[],
    useCustomOptions: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role !== "ADMIN") { setLoading(false); return; }
    loadItems();
  }, [refreshKey, user]);

  async function loadItems() {
    try {
      const r: any = await api("/api/mdas-items?includeInactive=1");
      setItems(r.items || []);
    } catch {
      try {
        const r: any = await api("/api/mdas-items");
        setItems(r.items || []);
      } catch (e: any) { toast.error(e.message); }
    } finally { setLoading(false); }
  }

  function openNew() {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      required: true,
      order: items.length,
      timePoints: ["BASELINE", "H24", "H48"],
      options: [...DEFAULT_OPTIONS],
      useCustomOptions: false,
    });
    setShowForm(true);
  }

  function openEdit(item: MdasItem) {
    let tps: TimePoint[] = ["BASELINE", "H24", "H48"];
    try {
      tps = (item.timePoints || "BASELINE,H24,H48").split(",").filter(Boolean) as TimePoint[];
    } catch {}
    let opts: Option[] = item.options && item.options.length > 0 ? item.options : [...DEFAULT_OPTIONS];
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description || "",
      required: item.required,
      order: item.order,
      timePoints: tps,
      options: opts,
      useCustomOptions: item.options && item.options.length > 0 &&
        JSON.stringify(item.options) !== JSON.stringify(DEFAULT_OPTIONS),
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.title.trim()) { toast.error("متن سؤال الزامی است"); return; }
    if (form.timePoints.length === 0) { toast.error("حداقل یک زمان سؤال را انتخاب کنید"); return; }
    setSaving(true);
    try {
      const body: any = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        required: form.required,
        order: form.order,
        timePoints: form.timePoints.join(","),
      };
      // Only send options if useCustomOptions is true
      if (form.useCustomOptions) {
        if (form.options.length === 0) {
          toast.error("حداقل یک گزینه لازم است");
          setSaving(false);
          return;
        }
        body.options = form.options;
      }
      if (editing) {
        await api(`/api/mdas-items/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast.success("سؤال ویرایش شد");
      } else {
        await api("/api/mdas-items", { method: "POST", body: JSON.stringify(body) });
        toast.success("سؤال جدید اضافه شد");
      }
      setShowForm(false);
      await loadItems();
    } catch (e: any) {
      toast.error(e.message || "خطا");
    } finally { setSaving(false); }
  }

  async function toggleRequired(item: MdasItem) {
    try {
      await api(`/api/mdas-items/${item.id}`, {
        method: "PATCH", body: JSON.stringify({ required: !item.required }),
      });
      toast.success(item.required ? "سؤال اختیاری شد" : "سؤال الزامی شد");
      await loadItems();
    } catch (e: any) { toast.error(e.message); }
  }

  async function toggleActive(item: MdasItem) {
    try {
      await api(`/api/mdas-items/${item.id}`, {
        method: "PATCH", body: JSON.stringify({ active: !item.active }),
      });
      toast.success(item.active ? "سؤال غیرفعال شد" : "سؤال فعال شد");
      await loadItems();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(item: MdasItem) {
    if (!confirm(`حذف سؤال «${item.title.slice(0, 50)}...»؟`)) return;
    try {
      await api(`/api/mdas-items/${item.id}`, { method: "DELETE" });
      toast.success("سؤال حذف شد");
      await loadItems();
    } catch (e: any) { toast.error(e.message); }
  }

  async function moveOrder(item: MdasItem, direction: "up" | "down") {
    const newOrder = direction === "up" ? item.order - 1 : item.order + 1;
    try {
      await api(`/api/mdas-items/${item.id}`, {
        method: "PATCH", body: JSON.stringify({ order: newOrder }),
      });
      await loadItems();
    } catch (e: any) { toast.error(e.message); }
  }

  function toggleTimePoint(tp: TimePoint) {
    setForm((f) => ({
      ...f,
      timePoints: f.timePoints.includes(tp)
        ? f.timePoints.filter((x) => x !== tp)
        : [...f.timePoints, tp],
    }));
  }

  function updateOption(idx: number, field: "value" | "label" | "severity", v: any) {
    setForm((f) => {
      const opts = [...f.options];
      opts[idx] = { ...opts[idx], [field]: v };
      return { ...f, options: opts };
    });
  }

  function addOption() {
    setForm((f) => ({
      ...f,
      options: [...f.options, { value: f.options.length, severity: "mild", label: "" }],
    }));
  }

  function removeOption(idx: number) {
    setForm((f) => ({
      ...f,
      options: f.options.filter((_, i) => i !== idx),
    }));
  }

  if (user?.role !== "ADMIN") {
    return <div className="text-center py-12 text-muted-foreground">دسترسی فقط برای مدیر</div>;
  }

  if (loading) {
    return <div className="grid place-items-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            مدیریت سؤالات MDAS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            افزودن، ویرایش، حذف و تعیین الزامی بودن سؤالات فرم MDAS
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
              <li>هر سؤال می‌تواند برای یکی، دو یا هر سه زمان (پایه، ۲۴h، ۴۸h) فعال باشد</li>
              <li>می‌توانید گزینه‌های اختصاصی برای هر سؤال تعریف کنید (در غیر این صورت ۴ گزینه استاندارد ۰-۳ نمایش داده می‌شود)</li>
              <li>سؤالات الزامی با <Star className="h-3 w-3 inline text-destructive" /> نشان داده می‌شوند</li>
              <li>غیرفعال کردن سؤال، آن را از فرم‌های جدید پنهان می‌کند اما داده‌های قبلی حفظ می‌شوند</li>
              <li>برای تغییر ترتیب نمایش، از فلش‌های بالا/پایین استفاده کنید</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right text-xs w-20">#</TableHead>
                  <TableHead className="text-right text-xs">متن سؤال</TableHead>
                  <TableHead className="text-center text-xs w-32">زمان‌ها</TableHead>
                  <TableHead className="text-center text-xs w-24">الزامی</TableHead>
                  <TableHead className="text-center text-xs w-24">فعال</TableHead>
                  <TableHead className="text-right text-xs w-28">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                      هنوز سؤالی تعریف نشده. روی «سؤال جدید» بزنید.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, idx) => {
                    const tps = (item.timePoints || "BASELINE,H24,H48").split(",");
                    return (
                      <TableRow key={item.id} className={!item.active ? "opacity-50" : ""}>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <div className="flex flex-col">
                              <button onClick={() => moveOrder(item, "up")} className="text-muted-foreground hover:text-foreground" title="بالا">
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button onClick={() => moveOrder(item, "down")} className="text-muted-foreground hover:text-foreground" title="پایین">
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
                              {item.description && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">{item.description}</p>
                              )}
                              {item.options && item.options.length > 0 && JSON.stringify(item.options) !== JSON.stringify(DEFAULT_OPTIONS) && (
                                <p className="text-[10px] text-primary mt-0.5">گزینه‌های اختصاصی ({toPersianDigits(item.options.length)})</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap gap-0.5 justify-center">
                            {tps.includes("BASELINE") && <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary">پایه</span>}
                            {tps.includes("H24") && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">۲۴h</span>}
                            {tps.includes("H48") && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">۴۸h</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={item.required} onCheckedChange={() => toggleRequired(item)} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={item.active} onCheckedChange={() => toggleActive(item)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(item)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {editing ? "ویرایش سؤال" : "سؤال جدید"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "متن سؤال، گزینه‌ها و تنظیمات را ویرایش کنید" : "متن سؤال جدید را وارد کنید"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2" dir="rtl">
            <div className="space-y-1.5">
              <Label className="text-xs">متن سؤال *</Label>
              <Textarea
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                rows={3}
                placeholder="مثلاً: کاهش سطح هوشیاری (آگاهی)"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">توضیحات (اختیاری)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="توضیح اضافی درباره سؤال"
              />
            </div>

            {/* Time points */}
            <div className="space-y-1.5">
              <Label className="text-xs">در کدام زمان‌ها نمایش داده شود؟ *</Label>
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

            {/* Custom options */}
            <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">گزینه‌های اختصاصی</Label>
                  <p className="text-[10px] text-muted-foreground">اگر فعال نباشد، ۴ گزینه استاندارد (۰، ۱، ۲، ۳) نمایش داده می‌شود</p>
                </div>
                <Switch
                  checked={form.useCustomOptions}
                  onCheckedChange={(v) => setForm({ ...form, useCustomOptions: v })}
                />
              </div>
              {form.useCustomOptions && (
                <div className="space-y-2">
                  {form.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="text" inputMode="numeric"
                        value={opt.value}
                        onChange={(e) => updateOption(idx, "value", Number(e.target.value))}
                        className="w-16 text-center font-mono"
                        dir="ltr"
                        min={0}
                      />
                      <select
                        value={opt.severity || "mild"}
                        onChange={(e) => updateOption(idx, "severity", e.target.value)}
                        className="h-9 rounded-md border bg-background px-2 text-xs"
                      >
                        <option value="none">طبیعی</option>
                        <option value="mild">خفیف</option>
                        <option value="moderate">متوسط</option>
                        <option value="severe">شدید</option>
                      </select>
                      <Input
                        value={opt.label}
                        onChange={(e) => updateOption(idx, "label", e.target.value)}
                        placeholder="متن گزینه"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive shrink-0"
                        onClick={() => removeOption(idx)}
                      >
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
