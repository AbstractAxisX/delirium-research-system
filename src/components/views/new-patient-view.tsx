"use client";

import { useState, useMemo, useEffect } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { DepartmentSelect } from "@/components/ui/department-select";
import {
  GENDERS, DELIRIUM_SUBTYPES, YES_NO, ADMISSION_TYPES,
  OLANZAPINE_DOSES, HALOPERIDOL_DOSES,
} from "@/lib/options";
import { MDAS_ITEMS, DEFAULT_OPTIONS } from "@/lib/mdas";
import { normalizeDigits, isValidNationalId, toPersianDigits } from "@/lib/persian";
import { gregorianDateToJalali, formatJalali } from "@/lib/jalali";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Loader2, Save, UserPlus,
  AlertCircle, Pill, ClipboardList,
} from "lucide-react";

type Step = 0 | 1 | 2 | 3;

export function NewPatientView() {
  const { setView, setActivePatient, bumpRefresh } = useApp();
  const [step, setStep] = useState<Step>(0);
  const [submitting, setSubmitting] = useState(false);
  const [mdasItems, setMdasItems] = useState<any[]>([]);

  // Load MDAS items from DB (BASELINE only)
  useEffect(() => {
    api("/api/form-items?timePoint=BASELINE&category=mdas")
      .then((r: any) => setMdasItems(r.items || []))
      .catch(() => {
        // Fallback to defaults if API fails
        setMdasItems(MDAS_ITEMS.map((item, i) => ({
          id: item.key, key: item.key, title: item.title, required: true, active: true, order: i,
          options: DEFAULT_OPTIONS,
        })));
      });
  }, []);

  // Demographics & registration
  const [fullName, setFullName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState(() => {
    const t = gregorianDateToJalali(new Date());
    return formatJalali(t.jy, t.jm, t.jd);
  });

  // Default dates on mount
  useEffect(() => {
    const t = gregorianDateToJalali(new Date());
    const todayStr = formatJalali(t.jy, t.jm, t.jd);
    setDate((cur) => cur || todayStr);
    setAdmissionDate((cur) => cur || todayStr);
  }, []);

  // Clinical
  const [causeOfDelirium, setCauseOfDelirium] = useState("");
  const [deliriumSubtype, setDeliriumSubtype] = useState("");
  const [department, setDepartment] = useState("");
  const [drugAllergy, setDrugAllergy] = useState("");
  const [reasonForAdmission, setReasonForAdmission] = useState("");
  const [dementiaHistory, setDementiaHistory] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");
  const [organFailure, setOrganFailure] = useState("");

  // Concomitant variables
  const [admissionType, setAdmissionType] = useState("");
  const [opioidUse, setOpioidUse] = useState("");
  const [benzodiazepineUse, setBenzodiazepineUse] = useState("");
  const [psychiatricDrugUse, setPsychiatricDrugUse] = useState("");
  const [painkillerUse, setPainkillerUse] = useState("");

  // Safety
  const [qtcBefore, setQtcBefore] = useState<number | "">("");
  const [qtcAfter, setQtcAfter] = useState<number | "">("");
  const [eps, setEps] = useState("");
  const [sleepiness, setSleepiness] = useState("");
  const [tremor, setTremor] = useState("");
  const [muscleStiffness, setMuscleStiffness] = useState("");

  // Drug dose (auto-assigned type, manual dose)
  const [drugDose, setDrugDose] = useState("");

  // MDAS baseline scores
  const [mdas, setMdas] = useState<Record<string, number>>({});

  const assignedDrug = useMemo(() => {
    const digits = normalizeDigits(nationalId).replace(/\D/g, "");
    if (digits.length === 0) return null;
    const last = parseInt(digits[digits.length - 1], 10);
    return last % 2 === 1 ? "OLANZAPINE" : "HALOPERIDOL";
  }, [nationalId]);

  const mdasTotal = useMemo(() => {
    return Object.values(mdas).reduce<number>((s, v) => s + v, 0);
  }, [mdas]);

  // Auto-compute recommended dose from MDAS total score (per protocol table)
  const recommendedDose = useMemo(() => {
    if (!assignedDrug || mdasTotal === 0) return null;
    // Per protocol:
    // 10-15: Olanzapine 2.5 / Haloperidol 1
    // 16-22: Olanzapine 5   / Haloperidol 2
    // 23+:   Olanzapine 10  / Haloperidol 4
    let dose = "";
    let doseLabel = "";
    let range = "";
    if (mdasTotal >= 10 && mdasTotal <= 15) {
      dose = assignedDrug === "OLANZAPINE" ? "OLANZAPINE_2_5" : "HALOPERIDOL_1";
      doseLabel = assignedDrug === "OLANZAPINE" ? "اولانزاپین ۲.۵ میلی‌گرم" : "هالوپریدول ۱ میلی‌گرم";
      range = "۱۰-۱۵";
    } else if (mdasTotal >= 16 && mdasTotal <= 22) {
      dose = assignedDrug === "OLANZAPINE" ? "OLANZAPINE_5" : "HALOPERIDOL_2";
      doseLabel = assignedDrug === "OLANZAPINE" ? "اولانزاپین ۵ میلی‌گرم" : "هالوپریدول ۲ میلی‌گرم";
      range = "۱۶-۲۲";
    } else if (mdasTotal >= 23) {
      dose = assignedDrug === "OLANZAPINE" ? "OLANZAPINE_10" : "HALOPERIDOL_4";
      doseLabel = assignedDrug === "OLANZAPINE" ? "اولانزاپین ۱۰ میلی‌گرم" : "هالوپریدول ۴ میلی‌گرم";
      range = "۲۳+";
    }
    return dose ? { dose, doseLabel, range } : null;
  }, [mdasTotal, assignedDrug]);

  const steps = [
    { label: "اطلاعات هویتی", icon: UserPlus },
    { label: "اطلاعات بالینی", icon: ClipboardList },
    { label: "متغیرهای همراه و ایمنی", icon: AlertCircle },
    { label: "نمره MDAS پایه", icon: ClipboardList },
  ];

  function validateStep(s: Step): string | null {
    if (s === 0) {
      if (!fullName.trim()) return "نام بیمار الزامی است";
      if (!isValidNationalId(normalizeDigits(nationalId))) return "کد ملی نامعتبر است (۱۰ رقم صحیح)";
      if (!gender) return "جنسیت را انتخاب کنید";
      if (typeof age !== "number" || age <= 0) return "سن را به عدد وارد کنید";
    }
    if (s === 1) {
      if (!department) return "بخش بستری را انتخاب کنید";
      if (!deliriumSubtype) return "ساب‌تایپ دلیریوم را انتخاب کنید";
      if (!drugAllergy) return "سابقه حساسیت دارویی را مشخص کنید";
      if (!dementiaHistory) return "سابقه نقص شناختی یا دمانس را مشخص کنید";
      if (!organFailure) return "نارسایی کبدی/کلیوی یا کمبود ویتامین را مشخص کنید";
    }
    if (s === 3) {
      // Validate required MDAS items
      for (const item of mdasItems) {
        if (item.required && mdas[item.key] === undefined) {
          return `سؤال الزامی پر نشده: ${item.title.slice(0, 40)}${item.title.length > 40 ? "..." : ""}`;
        }
      }
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    setStep((s) => (s + 1) as Step);
  }
  function back() {
    setStep((s) => (Math.max(0, s - 1)) as Step);
  }

  async function submit() {
    const err = validateStep(0) || validateStep(1) || validateStep(3);
    if (err) { toast.error(err); return; }
    if (!recommendedDose) {
      toast.error("نمره MDAS برای تعیین دوز دارو کافی نیست (حداقل ۱۰)");
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        fullName: fullName.trim(),
        nationalId: normalizeDigits(nationalId),
        gender: gender || null,
        age: typeof age === "number" ? age : null,
        phone: phone || null,
        address: address || null,
        date: date || null,
        causeOfDelirium: causeOfDelirium || null,
        deliriumSubtype: deliriumSubtype || null,
        department: department || null,
        drugAllergy: drugAllergy || null,
        reasonForAdmission: reasonForAdmission || null,
        dementiaHistory: dementiaHistory || null,
        admissionDate: admissionDate || null,
        organFailure: organFailure || null,
        admissionType: admissionType || null,
        opioidUse: opioidUse || null,
        benzodiazepineUse: benzodiazepineUse || null,
        psychiatricDrugUse: psychiatricDrugUse || null,
        painkillerUse: painkillerUse || null,
        // Only QTc before treatment is captured at baseline; rest moved to follow-ups
        qtcBefore: typeof qtcBefore === "number" ? qtcBefore : null,
        // drugDose is now computed automatically from MDAS total score
        drugDose: recommendedDose.dose,
        mdas,
      };
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

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ثبت بیمار جدید</h1>
        <p className="text-sm text-muted-foreground mt-1">
          تکمیل فرم چک‌لیست در ۵ مرحله — نوع دارو به‌صورت خودکار بر اساس رقم آخر کد ملی تعیین می‌شود
        </p>
      </div>

      {/* Stepper */}
      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              مرحله {toPersianDigits(step + 1)} از {toPersianDigits(steps.length)}: {steps[step].label}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">{toPersianDigits(Math.round(progress))}٪</span>
          </div>
          <Progress value={progress} className="h-2 [direction:ltr]" dir="ltr" />
          <div className="hidden sm:grid grid-cols-5 gap-2 mt-4">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <button
                  key={i}
                  onClick={() => i < step && setStep(i as Step)}
                  disabled={i > step}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-lg text-[11px] transition-colors ${
                    i === step
                      ? "text-primary"
                      : i < step
                      ? "text-muted-foreground hover:text-foreground"
                      : "text-muted-foreground/50"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-9 h-9 rounded-full ${
                      i === step
                        ? "bg-primary text-primary-foreground"
                        : i < step
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {s.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step content */}
      <Card>
        <CardContent className="p-4 lg:p-6 space-y-4">
          {/* Step 0: Demographics */}
          {step === 0 && (
            <>
              <SectionTitle title="اطلاعات هویتی و تماس" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="نام و نام خانوادگی" required>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="مثلاً: علی محمدی" />
                </Field>
                <Field label="کد ملی" required hint="نوع دارو از روی رقم آخر کد ملی تعیین می‌شود">
                  <Input
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="۱۰ رقم"
                    dir="ltr"
                    className="text-left font-mono"
                    maxLength={10}
                  />
                  {nationalId && assignedDrug && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">داروی تخصیص‌یافته:</span>
                      <Badge
                        variant="outline"
                        className={
                          assignedDrug === "OLANZAPINE"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        }
                      >
                        {assignedDrug === "OLANZAPINE" ? "اولانزاپین" : "هالوپریدول"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        (رقم آخر: {normalizeDigits(nationalId).slice(-1) || "؟"} - {normalizeDigits(nationalId).slice(-1) && (parseInt(normalizeDigits(nationalId).slice(-1)) % 2 === 1 ? "فرد" : "زوج")})
                      </span>
                    </div>
                  )}
                </Field>
                <Field label="جنسیت" required>
                  <RadioOptions options={GENDERS} value={gender} onChange={setGender} />
                </Field>
                <Field label="سن (سال)" required>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={age}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d۰-۹٠-٩]/g, "");
                      const normalized = v.replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
                                           .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
                      setAge(normalized ? Number(normalized) : "");
                    }}
                    placeholder="مثلاً: ۶۵"
                    min={0}
                    max={120}
                  />
                </Field>
                <Field label="شماره تماس">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="text-left font-mono" placeholder="09xxxxxxxxx" />
                </Field>
                <Field label="تاریخ ثبت">
                  <JalaliDatePicker value={date} onChange={setDate} />
                </Field>
              </div>
              <Field label="آدرس">
                <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="آدرس محل سکونت بیمار" />
              </Field>
            </>
          )}

          {/* Step 1: Clinical */}
          {step === 1 && (
            <>
              <SectionTitle title="اطلاعات بالینی و بستری" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="بخش بستری" required>
                  <DepartmentSelect value={department} onChange={setDepartment} placeholder="انتخاب بخش" />
                </Field>
                <Field label="ساب‌تایپ دلیریوم" required>
                  <RadioOptions options={DELIRIUM_SUBTYPES} value={deliriumSubtype} onChange={setDeliriumSubtype} />
                </Field>
                <Field label="علت دلیریوم">
                  <Input value={causeOfDelirium} onChange={(e) => setCauseOfDelirium(e.target.value)} placeholder="مثلاً: عفونت، متابولیک" />
                </Field>
                <Field label="علت بستری">
                  <Input value={reasonForAdmission} onChange={(e) => setReasonForAdmission(e.target.value)} placeholder="علت اصلی بستری" />
                </Field>
                <Field label="تاریخ بستری">
                  <JalaliDatePicker value={admissionDate} onChange={setAdmissionDate} />
                </Field>
                <Field label="سابقه حساسیت دارویی به اولانزاپین یا هالوپریدول" required>
                  <RadioOptions options={YES_NO} value={drugAllergy} onChange={setDrugAllergy} />
                </Field>
                <Field label="سابقه نقص شناختی یا دمانس" required>
                  <RadioOptions options={YES_NO} value={dementiaHistory} onChange={setDementiaHistory} />
                </Field>
                <Field label="نارسایی کبدی یا کلیوی یا کمبود ویتامین" required>
                  <RadioOptions options={YES_NO} value={organFailure} onChange={setOrganFailure} />
                </Field>
              </div>
            </>
          )}

          {/* Step 2: Concomitant & Safety */}
          {step === 2 && (
            <>
              <SectionTitle title="متغیرهای همراه" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="نوع پذیرش">
                  <RadioOptions options={ADMISSION_TYPES} value={admissionType} onChange={setAdmissionType} />
                </Field>
                <Field label="مصرف اپیوئید">
                  <RadioOptions options={YES_NO} value={opioidUse} onChange={setOpioidUse} />
                </Field>
                <Field label="مصرف بنزودیازپین">
                  <RadioOptions options={YES_NO} value={benzodiazepineUse} onChange={setBenzodiazepineUse} />
                </Field>
                <Field label="مصرف داروهای روان‌پزشکی">
                  <RadioOptions options={YES_NO} value={psychiatricDrugUse} onChange={setPsychiatricDrugUse} />
                </Field>
                <Field label="مصرف داروهای ضد درد">
                  <RadioOptions options={YES_NO} value={painkillerUse} onChange={setPainkillerUse} />
                </Field>
              </div>

              <SectionTitle title="متغیرهای ایمنی (پایه)" />
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 mb-3">
                <p className="font-medium mb-1">توجه:</p>
                <p>در این مرحله فقط QTc قبل از درمان ثبت می‌شود. سایر متغیرهای ایمنی (QTc بعد از درمان، EPS، خواب‌آلودگی، لرزش، سفتی عضلات) در ویزیت‌های ۲۴ و ۴۸ ساعت بعد تکمیل خواهند شد.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="QTc قبل از درمان (ms)">
                  <Input type="text" inputMode="numeric" value={qtcBefore} onChange={(e) => setQtcBefore(e.target.value ? Number(e.target.value) : "")} dir="ltr" className="text-left font-mono" placeholder="مثلاً: ۴۲۰" />
                </Field>
              </div>
            </>
          )}

          {/* Step 3: MDAS baseline (was step 4) */}
          {step === 3 && (
            <>
              <SectionTitle title="نمره MDAS قبل از تزریق دارو (پایه)" />
              <div className="text-xs text-muted-foreground mb-3 bg-primary/5 p-3 rounded-lg border border-primary/20" dir="rtl">
                <p>هر سؤال را بر اساس معاینه بیمار با نمره ۰ تا ۳ ثبت کنید. نمره کل به‌صورت خودکار محاسبه می‌شود. سؤالات دارای <span className="text-destructive">*</span> الزامی هستند.</p>
                <p className="mt-1.5">پس از تکمیل نمره MDAS، دوز دارو به‌صورت خودکار بر اساس جدول پروتکل تعیین می‌شود.</p>
              </div>

              <div className="space-y-3" dir="rtl">
                {mdasItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    در حال بارگذاری سؤالات...
                  </div>
                ) : (
                  mdasItems.map((item: any, idx: number) => {
                    const options = item.options && item.options.length > 0 ? item.options : DEFAULT_OPTIONS;
                    return (
                      <div key={item.id || item.key} className="border rounded-lg p-3 lg:p-4 bg-card" dir="rtl">
                        <div className="flex items-start gap-2 mb-3" dir="rtl">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">
                            {toPersianDigits(idx + 1)}
                          </span>
                          <p className="text-sm font-medium leading-relaxed flex-1" dir="rtl">
                            {item.title}
                            {item.required && <span className="text-destructive mr-1">*</span>}
                          </p>
                        </div>
                        <RadioGroup
                          value={mdas[item.key] !== undefined ? String(mdas[item.key]) : ""}
                          onValueChange={(v) => setMdas((m) => ({ ...m, [item.key]: Number(v) }))}
                          className="grid sm:grid-cols-2 gap-1.5"
                        >
                          {options.map((opt: any) => (
                            <label
                              key={opt.value}
                              className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer hover:bg-accent transition-colors text-xs ${
                                mdas[item.key] !== undefined && String(mdas[item.key]) === String(opt.value) ? "border-primary bg-primary/5" : "border-border"
                              }`}
                              dir="rtl"
                            >
                              <RadioGroupItem value={String(opt.value)} id={`${item.key}-${opt.value}`} className="mt-0.5" />
                              <div>
                                <span className="font-mono font-bold">{toPersianDigits(opt.value)}.</span>
                                <span className="mr-1.5">{opt.label}</span>
                              </div>
                            </label>
                          ))}
                        </RadioGroup>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Show drug + recommended dose after MDAS is filled */}
              {mdasTotal > 0 && assignedDrug && (
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5" dir="rtl">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">داروی تخصیص‌یافته (سیستمی):</p>
                      <p className="text-lg font-semibold">
                        {assignedDrug === "OLANZAPINE" ? "اولانزاپین (Olanzapine)" : "هالوپریدول (Haloperidol)"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        بر اساس رقم آخر کد ملی: {normalizeDigits(nationalId).slice(-1)} ({parseInt(normalizeDigits(nationalId).slice(-1) || "0") % 2 === 1 ? "فرد" : "زوج"})
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground mb-1">دوز پیشنهادی (محاسبه خودکار):</p>
                      {recommendedDose ? (
                        <>
                          <p className="text-lg font-bold text-primary">{recommendedDose.doseLabel}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            نمره MDAS: {toPersianDigits(mdasTotal)} (بازه {recommendedDose.range})
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {mdasTotal < 10 ? `نمره ${toPersianDigits(mdasTotal)} کمتر از حداقل (۱۰) است` : "در حال محاسبه..."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="sticky bottom-0 bg-background border-t p-3 -mx-4 lg:-mx-6 flex items-center justify-between rounded-t-lg shadow-lg" dir="rtl">
                <div>
                  <span className="text-xs text-muted-foreground">نمره کل MDAS (پایه):</span>
                  <span className="text-2xl font-bold tabular-nums mr-2">{toPersianDigits(mdasTotal)}</span>
                  <span className="text-xs text-muted-foreground mr-1">از {toPersianDigits(mdasItems.length * 3)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bottom nav */}
      <div className="flex items-center justify-between sticky bottom-0 bg-background/95 backdrop-blur p-3 -mx-4 lg:-mx-6 border-t rounded-t-lg">
        <Button variant="ghost" onClick={back} disabled={step === 0 || submitting}>
          <ChevronRight className="h-4 w-4 ml-1" />
          مرحله قبل
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={next} disabled={submitting}>
            مرحله بعد
            <ChevronLeft className="h-4 w-4 mr-1" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 ml-1 animate-spin" />
                در حال ثبت...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 ml-1" />
                ثبت نهایی بیمار
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="h-5 w-1 rounded bg-primary" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function RadioOptions({
  options, value, onChange,
}: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <label
          key={o.value}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer text-xs transition-colors ${
            value === o.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-accent"
          }`}
        >
          <RadioGroupItem value={o.value} id={o.value} className="scale-90" />
          {o.label}
        </label>
      ))}
    </RadioGroup>
  );
}
