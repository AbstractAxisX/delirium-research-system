"use client";

import { useState, useEffect, useMemo } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DepartmentSelect } from "@/components/ui/department-select";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { CATEGORY_LABELS } from "@/lib/form-items";
import { MDAS_ITEMS, DEFAULT_OPTIONS, DRUG_DOSE_TABLE, recommendDrugDose } from "@/lib/mdas";
import { normalizeDigits, isValidNationalId, toPersianDigits } from "@/lib/persian";
import { gregorianDateToJalali, formatJalali } from "@/lib/jalali";
import { toast } from "sonner";
import {
  Loader2, Save, UserPlus, Pill, Star,
} from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  demographic: "bg-primary",
  clinical: "bg-emerald-500",
  concomitant: "bg-violet-500",
  safety: "bg-amber-500",
  mdas: "bg-sky-500",
  outcome: "bg-rose-500",
};

const SEVERITY_COLORS: Record<string, string> = {
  none: "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
  mild: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  moderate: "border-orange-500/40 bg-orange-500/5 text-orange-700 dark:text-orange-300",
  severe: "border-rose-500/40 bg-rose-500/5 text-rose-700 dark:text-rose-300",
};

export function NewPatientView() {
  const { setView, setActivePatient, bumpRefresh } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, any>>({});
  const [departments, setDepartments] = useState<string[]>([]);

  // Load ALL BASELINE form items (not just MDAS)
  useEffect(() => {
    api("/api/form-items?timePoint=BASELINE")
      .then((r: any) => {
        setItems(r.items || []);
        // Initialize default values
        const defaults: Record<string, any> = {};
        const t = gregorianDateToJalali(new Date());
        defaults.date = formatJalali(t.jy, t.jm, t.jd);
        defaults.admissionDate = formatJalali(t.jy, t.jm, t.jd);
        setValues(defaults);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // Load departments
    api("/api/departments").then((r: any) => setDepartments((r.departments || []).map((d: any) => d.name))).catch(() => {});
  }, []);

  // Auto-compute drug type from national ID
  const assignedDrug = useMemo(() => {
    const digits = normalizeDigits(values.nationalId || "").replace(/\D/g, "");
    if (digits.length === 0) return null;
    const last = parseInt(digits[digits.length - 1], 10);
    return last % 2 === 1 ? "OLANZAPINE" : "HALOPERIDOL";
  }, [values.nationalId]);

  // Auto-compute recommended dose from MDAS total
  const mdasItems = items.filter((i) => i.category === "mdas");
  const mdasTotal = useMemo(() => {
    return mdasItems.reduce((s, item) => {
      const v = values[item.key];
      return s + (typeof v === "number" ? v : 0);
    }, 0);
  }, [values, mdasItems]);

  const recommendedDose = useMemo(() => {
    if (!assignedDrug || mdasTotal === 0) return null;
    return recommendDrugDose(mdasTotal, assignedDrug);
  }, [mdasTotal, assignedDrug]);

  function setField(key: string, value: any) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function validate(): string | null {
    for (const item of items) {
      if (item.required) {
        const v = values[item.key];
        if (v === undefined || v === null || v === "") {
          return `سؤال الزامی پر نشده: ${item.title.slice(0, 40)}`;
        }
      }
    }
    // Validate national ID
    const nid = normalizeDigits(values.nationalId || "");
    if (!isValidNationalId(nid)) return "کد ملی نامعتبر است (۱۰ رقم صحیح)";
    return null;
  }

  async function submit() {
    const err = validate();
    if (err) { toast.error(err); return; }
    if (!recommendedDose) {
      toast.error("نمره MDAS برای تعیین دوز دارو کافی نیست (حداقل ۱۰)");
      return;
    }
    setSubmitting(true);
    try {
      // Build MDAS answers
      const mdasAnswers: Record<string, number> = {};
      for (const item of mdasItems) {
        if (typeof values[item.key] === "number") mdasAnswers[item.key] = values[item.key];
      }

      const payload: any = {
        fullName: values.fullName?.trim(),
        nationalId: normalizeDigits(values.nationalId),
        drugDose: recommendedDose.dose,
        mdas: mdasAnswers,
      };
      // Add all other fields
      for (const item of items) {
        if (item.category === "mdas") continue;
        const v = values[item.key];
        if (v !== undefined && v !== null && v !== "") {
          payload[item.key] = v;
        } else {
          payload[item.key] = null;
        }
      }

      const r: any = await api("/api/patients", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(`بیمار ${r.patient.code} با موفقیت ثبت شد`);
      bumpRefresh();
      setActivePatient(r.patient.id);
    } catch (e: any) {
      toast.error(e.message || "خطا در ثبت بیمار");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="grid place-items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // Group items by category
  const grouped: Record<string, any[]> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }
  const categoryOrder = ["demographic", "clinical", "concomitant", "safety", "mdas"];

  return (
    <div className="space-y-3" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ثبت بیمار جدید</h1>
        <p className="text-sm text-muted-foreground mt-1">
          تمام فیلدها را پر کنید. نوع دارو و دوز به‌صورت خودکار تعیین می‌شود.
        </p>
      </div>

      {/* All form items grouped by category */}
      {categoryOrder.map((cat) => {
        const catItems = grouped[cat];
        if (!catItems || catItems.length === 0) return null;
        return (
          <Card key={cat} dir="rtl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className={`w-2 h-4 rounded ${CATEGORY_COLORS[cat] || "bg-muted"}`} />
                {CATEGORY_LABELS[cat] || cat}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2" dir="rtl">
              {catItems.map((item) => (
                <NewFormItem key={item.id || item.key} item={item} value={values[item.key]} onChange={(v) => setField(item.key, v)} departments={departments} />
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Drug + dose display */}
      {mdasTotal > 0 && assignedDrug && (
        <Card className="border-primary/30 bg-primary/5" dir="rtl">
          <CardContent className="p-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-muted-foreground">داروی تخصیص‌یافته:</p>
              <p className="font-bold">{assignedDrug === "OLANZAPINE" ? "اولانزاپین" : "هالوپریدول"}</p>
              <p className="text-[10px] text-muted-foreground">رقم آخر کد ملی: {normalizeDigits(values.nationalId || "").slice(-1)}</p>
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">دوز پیشنهادی:</p>
              {recommendedDose ? (
                <>
                  <p className="font-bold text-primary">{recommendedDose.doseLabel}</p>
                  <p className="text-[10px] text-muted-foreground">نمره: {toPersianDigits(mdasTotal)} (بازه {recommendedDose.range})</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{toPersianDigits(mdasTotal)} &lt; ۱۰</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit button */}
      <div className="sticky bottom-16 lg:bottom-0 bg-background border-t pt-3 -mx-4 lg:-mx-6 px-4 lg:px-6" dir="rtl">
        <Button onClick={submit} disabled={submitting} className="w-full min-h-[48px]" size="lg">
          {submitting ? (
            <><Loader2 className="h-4 w-4 ml-2 animate-spin" />در حال ثبت...</>
          ) : (
            <><Save className="h-4 w-4 ml-2" />ثبت بیمار</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// NewFormItem — render a single form item for new patient form
// ============================================================
function NewFormItem({ item, value, onChange, departments }: any) {
  const options = item.options && item.options.length > 0 ? item.options : DEFAULT_OPTIONS;

  // Department select
  if (item.key === "department") {
    return (
      <div className="space-y-1" dir="rtl">
        <Label className="text-xs font-medium">
          {item.title}
          {item.required && <span className="text-destructive mr-1">*</span>}
        </Label>
        <DepartmentSelect value={value || ""} onChange={onChange} placeholder="انتخاب بخش" />
      </div>
    );
  }

  // Date picker
  if (item.fieldType === "date") {
    return (
      <div className="space-y-1" dir="rtl">
        <Label className="text-xs font-medium">
          {item.title}
          {item.required && <span className="text-destructive mr-1">*</span>}
        </Label>
        <JalaliDatePicker value={value || ""} onChange={onChange} />
      </div>
    );
  }

  // Radio
  if (item.fieldType === "radio" || item.fieldType === "select") {
    return (
      <div className={`border rounded-lg overflow-hidden ${value !== undefined ? "border-primary/30" : "border-border"}`} dir="rtl">
        <div className="p-2 bg-muted/20" dir="rtl">
          <div className="flex items-center gap-1.5" dir="rtl">
            {item.required && <span className="text-destructive text-sm">*</span>}
            <p className="text-sm font-medium flex-1">{item.title}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1 p-1.5" dir="rtl">
          {options.map((opt: any) => {
            const isSelected = value !== undefined && String(value) === String(opt.value);
            const colorClass = SEVERITY_COLORS[opt.severity || ""] || "border-primary/30 bg-primary/5 text-primary";
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm min-h-[44px] touch-manipulation transition-all ${
                  isSelected ? `${colorClass} ring-1 ring-primary font-medium` : "border-border hover:bg-accent"
                } cursor-pointer`}
                dir="rtl"
              >
                <span className={`flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 ${
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                }`}>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-primary-foreground" />}
                </span>
                <span className="flex-1 text-right">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Checkbox
  if (item.fieldType === "checkbox") {
    return (
      <label
        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm min-h-[44px] touch-manipulation ${
          !!value ? "border-rose-500/40 bg-rose-500/5" : "border-border hover:bg-accent"
        }`}
        dir="rtl"
      >
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-5 h-5 accent-rose-500 shrink-0"
        />
        <span>
          {item.required && <span className="text-destructive ml-1">*</span>}
          {item.title}
        </span>
      </label>
    );
  }

  // Text/number/textarea
  return (
    <div className="space-y-1" dir="rtl">
      <Label className="text-xs font-medium">
        {item.title}
        {item.required && <span className="text-destructive mr-1">*</span>}
      </Label>
      {item.fieldType === "textarea" ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[44px]"
          dir="rtl"
        />
      ) : (
        <Input
          type="text"
          inputMode={item.fieldType === "number" ? "numeric" : undefined}
          value={value !== undefined && value !== null ? String(value) : ""}
          onChange={(e) => {
            let v: any = e.target.value;
            if (item.fieldType === "number") {
              v = v.replace(/[^\d۰-۹٠-٩]/g, "");
              const normalized = v.replace(/[۰-۹]/g, (d: string) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
                                   .replace(/[٠-٩]/g, (d: string) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
              v = normalized ? Number(normalized) : "";
            }
            onChange(v);
          }}
          dir={item.fieldType === "number" ? "ltr" : "rtl"}
          className={`min-h-[44px] ${item.fieldType === "number" ? "text-left font-mono" : ""}`}
        />
      )}
    </div>
  );
}
