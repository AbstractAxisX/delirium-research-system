"use client";

import { useEffect, useState, useRef } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight, Loader2, Save, Activity, Pill,
  TrendingDown, TrendingUp, Minus, Printer,
  Lock, Unlock, Clock, CheckCircle2, BarChart3,
  ChevronDown, ChevronUp, Star,
} from "lucide-react";
import { TIME_POINTS, DEFAULT_OPTIONS, type TimePoint } from "@/lib/mdas";
import { drugLabel, doseLabel, GENDERS, DELIRIUM_SUBTYPES, YES_NO, ADMISSION_TYPES } from "@/lib/options";
import { toJalali, toJalaliDateTime, toPersianDigits } from "@/lib/persian";
import { toast } from "sonner";
import { computeFollowUpStatus } from "@/lib/followup";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Area, AreaChart,
} from "recharts";
import { CATEGORY_LABELS } from "@/lib/form-items";

const SEVERITY_COLORS: Record<string, string> = {
  none: "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
  mild: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  moderate: "border-orange-500/40 bg-orange-500/5 text-orange-700 dark:text-orange-300",
  severe: "border-rose-500/40 bg-rose-500/5 text-rose-700 dark:text-rose-300",
};

const CATEGORY_COLORS: Record<string, string> = {
  demographic: "bg-primary",
  clinical: "bg-emerald-500",
  concomitant: "bg-violet-500",
  safety: "bg-amber-500",
  mdas: "bg-sky-500",
  outcome: "bg-rose-500",
};

export function PatientDetailView() {
  const { activePatientId, setView, bumpRefresh, refreshKey, user } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activePatientId) return;
    let cancelled = false;
    api(`/api/patients/${activePatientId}`)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) { setData(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [activePatientId, refreshKey]);

  if (loading) {
    return <div className="grid place-items-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data) return <div className="text-center py-12 text-muted-foreground">بیمار یافت نشد</div>;

  const { patient, me } = data;
  const canEdit = me.role === "ADMIN" || patient.createdById === me.id;

  return (
    <div className="space-y-3 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setView("all-patients")} className="h-9 w-9">
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted">{patient.code}</span>
              <h1 className="text-lg lg:text-xl font-bold">{patient.fullName}</h1>
              <Badge variant="outline" className={
                patient.drugType === "OLANZAPINE"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }>
                <Pill className="h-3 w-3 ml-1" />{drugLabel(patient.drugType)}
              </Badge>
              {patient.drugDose && <Badge variant="outline" className="text-[10px]">{doseLabel(patient.drugDose)}</Badge>}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              کد ملی: <span dir="ltr" className="font-mono">{patient.nationalId}</span>
              {patient.department && <span className="mr-3">بخش: {patient.department}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => printPatientPDF(patient)} className="h-8">
            <Printer className="h-3.5 w-3.5 ml-1" />چاپ
          </Button>
          {(me.role === "ADMIN" || patient.createdById === me.id) && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!confirm(`حذف بیمار «${patient.fullName}» (${patient.code})؟ این عمل قابل بازگشت نیست.`)) return;
                try {
                  await api(`/api/patients/${patient.id}`, { method: "DELETE" });
                  toast.success("بیمار حذف شد");
                  setView("all-patients");
                } catch (e: any) {
                  toast.error(e.message || "خطا در حذف");
                }
              }}
              className="h-8 text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              حذف بیمار
            </Button>
          )}
        </div>
      </div>

      {/* Simple form — one page, time selector + all questions */}
      <SimplePatientForm patient={patient} canEdit={canEdit} me={me} onSave={bumpRefresh} />

      {/* Audit log (admin only) */}
      {user?.role === "ADMIN" && patient.auditLogs?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">تاریخچه تغییرات</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {patient.auditLogs.slice(0, 15).map((log: any) => (
                <div key={log.id} className="flex items-start gap-2 text-[11px] p-1.5 border rounded">
                  <span className="font-mono text-muted-foreground shrink-0">{toJalaliDateTime(log.createdAt)}</span>
                  <span className="flex-1">{log.user?.fullName || "—"}: {log.detail || log.action}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// SimplePatientForm — ONE page, time selector + all questions
// ============================================================
function SimplePatientForm({ patient, canEdit, me, onSave }: any) {
  const [timePoint, setTimePoint] = useState<TimePoint>("BASELINE");
  const [items, setItems] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [mdasRecord, setMdasRecord] = useState<any>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTpRef = useRef<TimePoint>("BASELINE");

  const isAdmin = me.role === "ADMIN";

  // Load form items for selected timepoint
  useEffect(() => {
    setLoading(true);
    api(`/api/form-items?timePoint=${timePoint}`)
      .then((r: any) => {
        setItems(r.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [timePoint]);

  // Load scores for selected timepoint
  useEffect(() => {
    currentTpRef.current = timePoint;
    // IMMEDIATELY clear ALL scores when switching timepoint
    setScores({});
    setMdasRecord(null);

    // Load MDAS scores from /api/mdas (per-timepoint)
    api(`/api/mdas?patientId=${patient.id}`)
      .then((r: any) => {
        if (currentTpRef.current !== timePoint) return;
        const rec = r.records.find((m: any) => m.timePoint === timePoint);
        const loaded: Record<string, any> = {};
        if (rec) {
          if (rec.answers && Object.keys(rec.answers).length > 0) {
            for (const [k, v] of Object.entries(rec.answers)) {
              if (typeof v === "number") loaded[k] = v;
            }
          }
          setMdasRecord(rec);
        }
        // Load non-MDAS fields from patient record (these are shared across timepoints)
        for (const item of items) {
          if (item.category === "mdas") continue;
          const val = (patient as any)[item.key];
          if (val !== null && val !== undefined && val !== "") {
            loaded[item.key] = val;
          }
        }
        setScores(loaded);
      })
      .catch(() => {});
  }, [timePoint, patient.id, items]);

  function setAnswer(key: string, value: any) {
    if (!canEdit) return;
    // For MDAS items, validate 0-3
    const item = items.find((i) => i.key === key);
    if (item && item.category === "mdas") {
      const numVal = typeof value === "string" ? Number(value) : value;
      if (Number.isNaN(numVal) || numVal < 0 || numVal > 3) return;
      value = numVal;
    }
    const next = { ...scores, [key]: value };
    setScores(next);

    // Auto-save MDAS answers
    if (item && item.category === "mdas") {
      scheduleMdasSave(next);
    } else {
      // Save non-MDAS fields to patient record
      scheduleFieldSave(key, value);
    }
  }

  function scheduleMdasSave(currentScores: Record<string, any>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      // Only save MDAS answers
      const mdasAnswers: Record<string, number> = {};
      for (const item of items) {
        if (item.category === "mdas" && typeof currentScores[item.key] === "number") {
          mdasAnswers[item.key] = currentScores[item.key];
        }
      }
      if (Object.keys(mdasAnswers).length === 0) return;
      try {
        await api("/api/mdas", {
          method: "POST",
          body: JSON.stringify({
            patientId: patient.id,
            timePoint,
            answers: mdasAnswers,
          }),
        });
        onSave();
      } catch (e: any) {
        toast.error(e.message || "خطا در ذخیره");
      }
    }, 1000);
  }

  async function scheduleFieldSave(key: string, value: any) {
    // Save non-MDAS fields via patient PATCH or followup PATCH
    try {
      const isFollowup = timePoint !== "BASELINE";
      const endpoint = isFollowup
        ? `/api/patients/${patient.id}/followup`
        : `/api/patients/${patient.id}`;
      await api(endpoint, {
        method: "PATCH",
        body: JSON.stringify(isFollowup ? { timePoint, [key]: value } : { [key]: value }),
      });
      onSave();
    } catch (e: any) {
      toast.error(e.message || "خطا در ذخیره");
    }
  }

  async function submitMdas() {
    const mdasItems = items.filter((i) => i.category === "mdas");
    const mdasAnswers: Record<string, number> = {};
    for (const item of mdasItems) {
      if (typeof scores[item.key] === "number") mdasAnswers[item.key] = scores[item.key];
    }
    if (Object.keys(mdasAnswers).length === 0) {
      toast.error("حداقل یک پاسخ ثبت کنید");
      return;
    }
    // Validate required items
    for (const item of mdasItems) {
      if (item.required && typeof scores[item.key] !== "number") {
        toast.error(`سؤال الزامی پر نشده: ${item.title.slice(0, 40)}`);
        return;
      }
    }
    setSaving(true);
    try {
      await api("/api/mdas", {
        method: "POST",
        body: JSON.stringify({
          patientId: patient.id,
          timePoint,
          answers: mdasAnswers,
          submit: true,
        }),
      });
      toast.success("فرم ثبت و قفل شد");
      onSave();
    } catch (e: any) {
      toast.error(e.message || "خطا");
    } finally {
      setSaving(false);
    }
  }

  // Group items by category
  const grouped: Record<string, any[]> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }
  const categoryOrder = ["demographic", "clinical", "concomitant", "safety", "mdas", "outcome"];

  const mdasItems = items.filter((i) => i.category === "mdas");
  const mdasTotal = mdasItems.reduce((s, item) => s + (typeof scores[item.key] === "number" ? scores[item.key] : 0), 0);

  // Follow-up status
  const mdasScores = patient.mdasScores || [];
  const baseline = mdasScores.find((m: any) => m.timePoint === "BASELINE");
  const h24 = mdasScores.find((m: any) => m.timePoint === "H24");
  const h48 = mdasScores.find((m: any) => m.timePoint === "H48");
  const fu = computeFollowUpStatus(baseline?.filledAt, h24?.filledAt, h48?.filledAt);

  if (loading) {
    return <div className="grid place-items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3" dir="rtl">
      {/* Follow-up status badge */}
      <div className="flex items-center justify-center gap-2" dir="rtl">
        <Badge variant="outline" className={`text-xs px-3 py-1.5 ${
          fu.tone === "danger" ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          : fu.tone === "warning" ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : fu.tone === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-border"
        }`}>
          {fu.label}
        </Badge>
      </div>

      {/* Time selector — 3 BIG buttons */}
      <div className="grid grid-cols-3 gap-2" dir="rtl">
        {TIME_POINTS.map((tp) => {
          const existing = mdasScores.find((m: any) => m.timePoint === tp.key);
          const isActive = timePoint === tp.key;
          return (
            <button
              key={tp.key}
              onClick={() => setTimePoint(tp.key)}
              className={`p-3 rounded-xl border text-center transition-all min-h-[56px] touch-manipulation ${
                isActive ? "border-primary bg-primary/5 shadow-sm scale-[1.02]" : "border-border hover:bg-accent"
              }`}
            >
              <p className="text-xs font-bold">{tp.label}</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">
                {typeof existing?.totalScore === "number" ? toPersianDigits(existing.totalScore) : "—"}
              </p>
              {existing && (
                <p className="text-[9px] text-muted-foreground">{existing.locked ? "قفل" : "ثبت"}</p>
              )}
            </button>
          );
        })}
      </div>

      {/* MDAS total + analysis toggle */}
      {mdasItems.length > 0 && (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border" dir="rtl">
          <div>
            <span className="text-xs text-muted-foreground">نمره MDAS:</span>
            <span className="text-xl font-bold tabular-nums mr-2">{toPersianDigits(mdasTotal)}</span>
            <span className="text-xs text-muted-foreground mr-1">از {toPersianDigits(mdasItems.length * 3)}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowCharts(!showCharts)} className="text-xs gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            {showCharts ? "پنهان تحلیل" : "نمایش تحلیل"}
            {showCharts ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
      )}

      {/* Charts (collapsible) */}
      {showCharts && <PatientCharts patient={patient} />}

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
                <span className="text-[10px] text-muted-foreground">({toPersianDigits(catItems.length)} سؤال)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2" dir="rtl">
              {catItems.map((item, idx) => (
                <FormItemRenderer
                  key={item.id || item.key}
                  item={item}
                  idx={idx}
                  value={scores[item.key]}
                  canEdit={canEdit}
                  onChange={(v) => setAnswer(item.key, v)}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Submit button for MDAS */}
      {mdasItems.length > 0 && canEdit && (
        <div className="sticky bottom-16 lg:bottom-0 bg-background border-t pt-3 -mx-4 lg:-mx-6 px-4 lg:px-6" dir="rtl">
          <Button onClick={submitMdas} disabled={saving} className="w-full min-h-[48px]" size="lg">
            {saving ? (
              <><Loader2 className="h-4 w-4 ml-2 animate-spin" />در حال ثبت...</>
            ) : (
              <><Save className="h-4 w-4 ml-2" />ثبت نهایی فرم {timePoint === "BASELINE" ? "پایه" : timePoint === "H24" ? "۲۴ ساعت" : "۴۸ ساعت"}</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// FormItemRenderer — render a single form item based on type
// ============================================================
function FormItemRenderer({ item, idx, value, canEdit, onChange }: any) {
  const options = item.options && item.options.length > 0 ? item.options : DEFAULT_OPTIONS;

  // Get display label for a value
  function valueLabel(v: any): string {
    if (v === undefined || v === null || v === "") return "—";
    const opt = options.find((o: any) => String(o.value) === String(v));
    return opt ? opt.label : String(v);
  }

  // Radio options
  if (item.fieldType === "radio" || item.fieldType === "select") {
    return (
      <div className={`border rounded-lg overflow-hidden ${value !== undefined ? "border-primary/30" : "border-border"}`} dir="rtl">
        <div className="p-2.5 bg-muted/20" dir="rtl">
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
                disabled={!canEdit}
                onClick={() => onChange(opt.value)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm min-h-[44px] touch-manipulation transition-all ${
                  isSelected ? `${colorClass} ring-1 ring-primary font-medium` : "border-border hover:bg-accent"
                } ${!canEdit && !isSelected ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
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
    const checked = !!value;
    return (
      <label
        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm min-h-[44px] touch-manipulation ${
          checked ? "border-rose-500/40 bg-rose-500/5" : "border-border hover:bg-accent"
        } ${!canEdit ? "opacity-70 cursor-not-allowed" : ""}`}
        dir="rtl"
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={!canEdit}
          className="w-5 h-5 accent-rose-500 shrink-0"
        />
        <span className={checked ? "text-rose-700 dark:text-rose-300 font-medium" : ""}>
          {item.required && <span className="text-destructive ml-1">*</span>}
          {item.title}
        </span>
      </label>
    );
  }

  // Text/number/date/textarea
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
          disabled={!canEdit}
          rows={2}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[44px] disabled:opacity-50"
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
          disabled={!canEdit}
          dir={item.fieldType === "number" || item.fieldType === "date" ? "ltr" : "rtl"}
          className={`min-h-[44px] ${item.fieldType === "number" || item.fieldType === "date" ? "text-left font-mono" : ""}`}
        />
      )}
    </div>
  );
}

// ============================================================
// PatientCharts — collapsible analysis
// ============================================================
function PatientCharts({ patient }: any) {
  const mdasScores = patient.mdasScores || [];
  const baseline = mdasScores.find((m: any) => m.timePoint === "BASELINE");
  const h24 = mdasScores.find((m: any) => m.timePoint === "H24");
  const h48 = mdasScores.find((m: any) => m.timePoint === "H48");

  if (!baseline && !h24 && !h48) return null;

  const trendData = [
    { time: "پایه", value: baseline?.totalScore ?? null },
    { time: "۲۴ ساعت", value: h24?.totalScore ?? null },
    { time: "۴۸ ساعت", value: h48?.totalScore ?? null },
  ];

  const delta = baseline?.totalScore != null && h48?.totalScore != null
    ? baseline.totalScore - h48.totalScore : null;

  return (
    <Card dir="rtl">
      <CardHeader><CardTitle className="text-sm">تحلیل روند بیمار</CardTitle></CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="cs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 30]} />
              <Tooltip contentStyle={{ fontSize: "12px", direction: "rtl" }} />
              <Area type="monotone" dataKey="value" name="نمره" stroke="var(--primary)" strokeWidth={2.5} fill="url(#cs)" dot={{ r: 5 }} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {delta != null && (
          <p className="text-center text-sm mt-2">
            تغییر: <span className={delta > 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
              {delta > 0 ? `+${toPersianDigits(delta)}` : toPersianDigits(delta)}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Print patient PDF — includes ALL form items and answers
// ============================================================
function printPatientPDF(patient: any) {
  const mdasScores = patient.mdasScores || [];
  const baseline = mdasScores.find((m: any) => m.timePoint === "BASELINE");
  const h24 = mdasScores.find((m: any) => m.timePoint === "H24");
  const h48 = mdasScores.find((m: any) => m.timePoint === "H48");

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) { toast.error("لطفاً pop-up را اجازه دهید"); return; }

  // Helper: get label for a value from options
  function getLabel(options: any[], val: any): string {
    if (val === null || val === undefined || val === "") return "—";
    const opt = options?.find((o: any) => String(o.value) === String(val));
    return opt ? opt.label : String(val);
  }

  // Helper: get MDAS answer for a question
  function getMdasAnswer(record: any, key: string): string {
    if (!record) return "—";
    const answers = record.answers || {};
    const val = answers[key] ?? (record as any)[key];
    if (val === null || val === undefined) return "—";
    return String(val);
  }

  // Build MDAS questions table rows
  const mdasKeys = ["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10"];
  const mdasTitles = [
    "کاهش سطح هوشیاری", "گم‌گشتگی", "اختلال حافظه کوتاه‌مدت", "اختلال حافظه عددی",
    "کاهش توانایی توجه", "تفکر به هم ریخته", "آشفتگی ادراکی", "هذیان",
    "کاهش/افزایش فعالیت", "آشفتگی چرخه خواب"
  ];
  const mdasRows = mdasKeys.map((k, i) => `
    <tr>
      <td class="c">${i+1}</td>
      <td>${mdasTitles[i]}</td>
      <td class="c">${getMdasAnswer(baseline, k)}</td>
      <td class="c">${getMdasAnswer(h24, k)}</td>
      <td class="c">${getMdasAnswer(h48, k)}</td>
    </tr>
  `).join("");

  // Outcome checkboxes
  const outcomes = [
    ["needExtraDose", "نیاز به دوز اضافی"], ["earlyDischarge", "ترخیص زودهنگام"],
    ["deathBefore72h", "فوت قبل از ۴۸ ساعت"], ["relapse", "عود زودرس"],
    ["icuAdmission", "بستری ICU"], ["patientRefusal", "عدم تمایل بیمار"],
    ["severeSideEffect", "عارضه شدید"], ["physicalRestraint", "محدودیت فیزیکی"],
  ];
  const outcomeRows = outcomes.map(([k, l]) => `
    <tr><th>${l}</th><td class="c">${patient[k] ? "بله" : "خیر"}</td></tr>
  `).join("");

  w.document.open();
  w.document.write(`<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
  <title>فرم ${patient.code}</title>
  <style>
  @page{size:A4;margin:15mm}
  body{font-family:Tahoma,sans-serif;font-size:10pt;color:#222;line-height:1.5}
  h1{font-size:15pt;color:#0d9488;margin:0 0 4pt}
  h2{font-size:11pt;margin:10pt 0 4pt;padding:3pt 8pt;background:#f0fdfa;border-right:3pt solid #0d9488;border-radius:3pt}
  table{width:100%;border-collapse:collapse;margin:3pt 0;font-size:9pt}
  th,td{border:1pt solid #ccc;padding:4pt 6pt;text-align:right}
  th{background:#f0fdfa;color:#0d9488;font-weight:600}
  td.c,th.c{text-align:center}
  .badge{display:inline-block;padding:2pt 8pt;border-radius:8pt;font-size:8pt;font-weight:600}
  .badge.ol{background:#d1fae5;color:#047857}.badge.ha{background:#fef3c7;color:#92400e}
  .sb{display:grid;grid-template-columns:repeat(4,1fr);gap:5pt;margin:6pt 0}
  .sb>div{border:1pt solid #ccc;border-radius:5pt;padding:5pt;text-align:center}
  .sb .l{font-size:7pt;color:#666}.sb .v{font-size:16pt;font-weight:700;color:#0d9488}
  .ft{margin-top:15pt;padding-top:6pt;border-top:1pt solid #ccc;font-size:8pt;color:#666;text-align:center}
  .tb{position:fixed;top:8px;left:8px;z-index:99}
  .tb button{padding:5pt 10pt;background:#0d9488;color:#fff;border:none;border-radius:3pt;cursor:pointer;font-size:9pt;margin-left:3pt}
  </style></head><body>
  <div class="tb no-print"><button onclick="window.print()">چاپ</button><button onclick="window.close()">بستن</button></div>
  <h1>فرم ثبت بیمار ${patient.code}</h1>
  <p style="font-size:8pt;color:#666">مطالعه مقایسه‌ای اولانزاپین و هالوپریدول در درمان دلیریوم — دکتر شکریان</p>
  <hr style="border:1.5pt solid #0d9488;margin:6pt 0">

  <h2>اطلاعات هویتی</h2>
  <table>
  <tr><th style="width:25%">نام</th><td>${patient.fullName}</td><th style="width:25%">کد ملی</th><td dir="ltr">${patient.nationalId}</td></tr>
  <tr><th>جنسیت</th><td>${getLabel(GENDERS,patient.gender)}</td><th>سن</th><td>${patient.age??'—'} سال</td></tr>
  <tr><th>بخش</th><td>${patient.department||'—'}</td><th>تلفن</th><td dir="ltr">${patient.phone||'—'}</td></tr>
  </table>

  <h2>اطلاعات بالینی</h2>
  <table>
  <tr><th style="width:25%">ساب‌تایپ دلیریوم</th><td>${getLabel(DELIRIUM_SUBTYPES,patient.deliriumSubtype)}</td><th style="width:25%">علت بستری</th><td>${patient.reasonForAdmission||'—'}</td></tr>
  <tr><th>حساسیت دارویی</th><td>${getLabel(YES_NO,patient.drugAllergy)}</td><th>سابقه دمانس</th><td>${getLabel(YES_NO,patient.dementiaHistory)}</td></tr>
  <tr><th>نارسایی عضوی</th><td>${getLabel(YES_NO,patient.organFailure)}</td><th>علت دلیریوم</th><td>${patient.causeOfDelirium||'—'}</td></tr>
  </table>

  <h2>داروی تخصیص‌یافته</h2>
  <table>
  <tr><th style="width:25%">نوع دارو</th><td><span class="badge ${patient.drugType==='OLANZAPINE'?'ol':'ha'}">${drugLabel(patient.drugType)}</span></td><th style="width:25%">دوز</th><td>${doseLabel(patient.drugDose)}</td></tr>
  </table>

  <h2>خلاصه نمرات MDAS</h2>
  <div class="sb">
  <div><div class="l">پایه</div><div class="v">${baseline?.totalScore??'—'}</div></div>
  <div><div class="l">۲۴ ساعت</div><div class="v">${h24?.totalScore??'—'}</div></div>
  <div><div class="l">۴۸ ساعت</div><div class="v">${h48?.totalScore??'—'}</div></div>
  <div><div class="l">تغییر</div><div class="v">${baseline?.totalScore!=null&&h48?.totalScore!=null?baseline.totalScore-h48.totalScore:'—'}</div></div>
  </div>

  <h2>جزئیات نمرات MDAS</h2>
  <table>
  <tr><th class="c" style="width:5%">#</th><th>سؤال</th><th class="c" style="width:10%">پایه</th><th class="c" style="width:10%">۲۴h</th><th class="c" style="width:10%">۴۸h</th></tr>
  ${mdasRows}
  </table>

  <h2>متغیرهای ایمنی</h2>
  <table>
  <tr><th style="width:25%">QTc قبل</th><td>${patient.qtcBefore??'—'} ms</td><th style="width:25%">QTc بعد</th><td>${patient.qtcAfter??'—'} ms</td></tr>
  <tr><th>EPS</th><td>${getLabel(YES_NO,patient.eps)}</td><th>خواب‌آلودگی</th><td>${getLabel(YES_NO,patient.sleepiness)}</td></tr>
  <tr><th>لرزش</th><td>${getLabel(YES_NO,patient.tremor)}</td><th>سفتی عضلات</th><td>${getLabel(YES_NO,patient.muscleStiffness)}</td></tr>
  </table>

  <h2>پیامدهای بالینی</h2>
  <table>
  <tr><th style="width:25%">مدت بستری</th><td>${patient.hospitalStayDays??'—'} روز</td><th style="width:25%">شیفت ICU</th><td>${patient.icuShiftCount??'—'}</td></tr>
  ${outcomeRows}
  </table>

  <div class="ft">سامانه پژوهش دلیریوم — ${new Date().toLocaleString('fa-IR')}</div>
  </body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 500);
}
