"use client";

import { useState, useRef } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Download, FileSpreadsheet, FileText, Database, Loader2, Table,
  Upload, Trash2, AlertTriangle, ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

export function ExportView() {
  const { user } = useApp();
  const [filters, setFilters] = useState({
    departments: [] as string[],
    drugTypes: [] as string[],
    fromDate: "",
    toDate: "",
  });
  const [downloading, setDownloading] = useState<string>("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [showBackup, setShowBackup] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [showWipe, setShowWipe] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [wipeConfirm, setWipeConfirm] = useState("");
  const [working, setWorking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreFile, setRestoreFile] = useState<any>(null);

  // Load departments
  useState(() => {
    api("/api/departments").then((r: any) => setDepartments((r.departments || []).map((d: any) => d.name))).catch(() => {});
  });

  function buildQuery() {
    const p = new URLSearchParams();
    if (filters.departments.length > 0) p.set("department", filters.departments[0]);
    if (filters.drugTypes.length > 0) p.set("drugType", filters.drugTypes[0]);
    if (filters.fromDate) p.set("fromDate", filters.fromDate);
    if (filters.toDate) p.set("toDate", filters.toDate);
    return p.toString();
  }

  async function download(format: "xlsx" | "csv") {
    setDownloading(format);
    try {
      const res = await fetch(`/api/export?format=${format}&${buildQuery()}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "خطا در دانلود");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `patients_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("فایل دانلود شد");
    } catch (e: any) {
      toast.error(e.message || "خطا");
    } finally {
      setDownloading("");
    }
  }

  async function doBackup() {
    setWorking(true);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: adminPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "خطا");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `delirium_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("فایل پشتیبان کل سایت دانلود شد");
      setShowBackup(false);
      setAdminPassword("");
    } catch (e: any) {
      toast.error(e.message || "خطا");
    } finally {
      setWorking(false);
    }
  }

  async function doRestore() {
    if (!restoreFile) { toast.error("فایل پشتیبان را انتخاب کنید"); return; }
    setWorking(true);
    try {
      const res = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: adminPassword, data: restoreFile }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "خطا");
      }
      toast.success("داده‌ها با موفقیت بازگردانی شد");
      setShowRestore(false);
      setAdminPassword("");
      setRestoreFile(null);
    } catch (e: any) {
      toast.error(e.message || "خطا");
    } finally {
      setWorking(false);
    }
  }

  async function doWipe() {
    setWorking(true);
    try {
      const res = await fetch("/api/wipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: adminPassword, confirmText: wipeConfirm }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "خطا");
      }
      const r = await res.json();
      toast.success(`حذف شد: ${r.deleted.patients} بیمار، ${r.deleted.mdas} نمره MDAS`);
      setShowWipe(false);
      setAdminPassword("");
      setWipeConfirm("");
    } catch (e: any) {
      toast.error(e.message || "خطا");
    } finally {
      setWorking(false);
    }
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setRestoreFile(parsed);
        toast.success(`فایل بارگذاری شد (${parsed._meta?.counts?.patients || 0} بیمار)`);
      } catch {
        toast.error("فایل JSON نامعتبر است");
      }
    };
    reader.readAsText(file);
  }

  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">خروجی داده</h1>
        <p className="text-sm text-muted-foreground mt-1">دریافت داده‌ها در قالب‌های مختلف برای تحلیل آماری (SPSS، Excel، R)</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">فیلتر خروجی</CardTitle>
          <CardDescription>می‌توانید بخشی از داده‌ها را برای خروجی انتخاب کنید</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <MultiSelect
              options={departments.map((d) => ({ value: d, label: d }))}
              value={filters.departments}
              onChange={(v) => setFilters({ ...filters, departments: v })}
              placeholder="بخش"
              pillTone="amber"
            />
            <MultiSelect
              options={[
                { value: "OLANZAPINE", label: "اولانزاپین" },
                { value: "HALOPERIDOL", label: "هالوپریدول" },
              ]}
              value={filters.drugTypes}
              onChange={(v) => setFilters({ ...filters, drugTypes: v })}
              placeholder="دارو"
              pillTone="primary"
            />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">از تاریخ:</Label>
              <JalaliDatePicker value={filters.fromDate} onChange={(v) => setFilters({ ...filters, fromDate: v })} className="h-9 text-xs w-36" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">تا تاریخ:</Label>
              <JalaliDatePicker value={filters.toDate} onChange={(v) => setFilters({ ...filters, toDate: v })} className="h-9 text-xs w-36" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Format options */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Excel (.xlsx)</h3>
                <Badge variant="outline" className="text-[10px]">پیشنهادی</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              فایل اکسل با ۳ شیت: داده‌های بیماران، فرمت بلند MDAS برای SPSS و خلاصه گروه‌ها.
            </p>
            <Button onClick={() => download("xlsx")} disabled={!!downloading} className="w-full">
              {downloading === "xlsx" ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Download className="h-4 w-4 ml-1" />}
              دانلود Excel
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted text-muted-foreground">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">CSV</h3>
                <Badge variant="outline" className="text-[10px]">UTF-8</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              فایل متنی با جداکننده کاما (با BOM برای پشتیبانی از فارسی). مناسب برای R، Python.
            </p>
            <Button onClick={() => download("csv")} disabled={!!downloading} variant="outline" className="w-full">
              {downloading === "csv" ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Download className="h-4 w-4 ml-1" />}
              دانلود CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/15 text-primary">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">SPSS-ready</h3>
                <Badge variant="outline" className="text-[10px]">از Excel</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              شیت «MDAS_LongFormat» برای import مستقیم در SPSS. هر ردیف = یک اندازه‌گیری MDAS.
            </p>
            <Button onClick={() => download("xlsx")} disabled={!!downloading} variant="outline" className="w-full">
              <Table className="h-4 w-4 ml-1" />دانلود برای SPSS
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Admin: Backup / Restore / Wipe */}
      {isAdmin && (
        <Card className="border-rose-500/30 bg-rose-500/[0.02]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-rose-700 dark:text-rose-300">
              <ShieldAlert className="h-5 w-5" />
              مدیریت کلان داده‌ها (فقط مدیر)
            </CardTitle>
            <CardDescription>پشتیبان‌گیری، بازگردانی یا حذف کامل داده‌های سایت - نیاز به تأیید رمز عبور مدیر</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
            <Button onClick={() => setShowBackup(true)} variant="outline" className="h-auto py-4 flex flex-col gap-1.5">
              <Database className="h-6 w-6 text-emerald-600" />
              <span className="text-sm font-medium">خروجی کل سایت</span>
              <span className="text-[10px] text-muted-foreground font-normal">دانلود فایل JSON پشتیبان</span>
            </Button>
            <Button onClick={() => setShowRestore(true)} variant="outline" className="h-auto py-4 flex flex-col gap-1.5">
              <Upload className="h-6 w-6 text-sky-600" />
              <span className="text-sm font-medium">بازگردانی از فایل</span>
              <span className="text-[10px] text-muted-foreground font-normal">آپلود فایل پشتیبان JSON</span>
            </Button>
            <Button onClick={() => setShowWipe(true)} variant="outline" className="h-auto py-4 flex flex-col gap-1.5 border-rose-500/40 hover:bg-rose-500/5">
              <Trash2 className="h-6 w-6 text-rose-600" />
              <span className="text-sm font-medium text-rose-700 dark:text-rose-300">حذف همه داده‌ها</span>
              <span className="text-[10px] text-muted-foreground font-normal">پاک کردن بیماران و نمرات</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data dictionary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">راهنمای متغیرهای خروجی</CardTitle>
          <CardDescription>توضیح ستون‌های فایل خروجی</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <DictionaryItem name="code" desc="کد یکتای بیمار (D001, D002, ...)" />
            <DictionaryItem name="nationalId" desc="کد ملی" />
            <DictionaryItem name="drugType" desc="نوع دارو (OLANZAPINE / HALOPERIDOL)" />
            <DictionaryItem name="drugDose" desc="دوز دارو" />
            <DictionaryItem name="baseline_total" desc="نمره کل MDAS پایه (۰ تا ۳۰)" />
            <DictionaryItem name="h24_total" desc="نمره کل MDAS در ۲۴ ساعت" />
            <DictionaryItem name="h48_total" desc="نمره کل MDAS در ۴۸ ساعت" />
            <DictionaryItem name="delta_24" desc="تغییر نمره از پایه تا ۲۴h" />
            <DictionaryItem name="delta_48" desc="تغییر نمره از پایه تا ۴۸h" />
            <DictionaryItem name="response_48_pct" desc="درصد بهبود در ۴۸ ساعت" />
          </div>
        </CardContent>
      </Card>

      {/* Backup dialog */}
      <Dialog open={showBackup} onOpenChange={setShowBackup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600" />خروجی کامل داده‌های سایت
            </DialogTitle>
            <DialogDescription>برای تأیید، رمز عبور خود را وارد کنید</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              این عمل تمام داده‌های سایت (بیماران، کاربران، گروه‌ها، بخش‌ها، نمرات MDAS و لاگ‌ها) را در یک فایل JSON دانلود می‌کند. این فایل می‌تواند بعداً از طریق «بازگردانی» به سایت بازگردانده شود.
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">رمز عبور مدیر *</Label>
              <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} dir="ltr" className="font-mono text-left" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBackup(false)}>انصراف</Button>
            <Button onClick={doBackup} disabled={working || !adminPassword} className="gap-1.5">
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              دانلود فایل پشتیبان
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore dialog */}
      <Dialog open={showRestore} onOpenChange={setShowRestore}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-sky-600" />بازگردانی داده‌ها
            </DialogTitle>
            <DialogDescription>آپلود فایل پشتیبان JSON برای بازگردانی</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>این عمل تمام داده‌های فعلی را با محتوای فایل پشتیبان جایگزین می‌کند. این کار قابل بازگشت نیست!</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">فایل پشتیبان JSON</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={onFileSelected}
                className="block w-full text-xs file:ml-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer file:hover:opacity-90"
              />
              {restoreFile && (
                <p className="text-[10px] text-emerald-600 mt-1">
                  فایل بارگذاری شد: {restoreFile._meta?.counts?.patients || 0} بیمار، {restoreFile._meta?.counts?.users || 0} کاربر
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">رمز عبور مدیر *</Label>
              <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} dir="ltr" className="font-mono text-left" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestore(false)}>انصراف</Button>
            <Button onClick={doRestore} disabled={working || !adminPassword || !restoreFile} className="gap-1.5">
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              بازگردانی داده‌ها
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wipe dialog */}
      <Dialog open={showWipe} onOpenChange={setShowWipe}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
              <Trash2 className="h-5 w-5" />حذف همه داده‌ها
            </DialogTitle>
            <DialogDescription>این عمل تمام بیماران و نمرات MDAS را حذف می‌کند</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">هشدار جدی!</p>
                <p>تمام بیماران، نمرات MDAS و لاگ‌های تغییرات حذف خواهند شد. کاربران و گروه‌ها باقی می‌مانند. این عمل قابل بازگشت نیست!</p>
                <p className="mt-1">پیشنهاد می‌شود ابتدا یک فایل پشتیبان تهیه کنید.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">برای تأیید، عبارت «حذف همه» را وارد کنید *</Label>
              <Input value={wipeConfirm} onChange={(e) => setWipeConfirm(e.target.value)} placeholder="حذف همه" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">رمز عبور مدیر *</Label>
              <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} dir="ltr" className="font-mono text-left" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWipe(false)}>انصراف</Button>
            <Button
              onClick={doWipe}
              disabled={working || !adminPassword || wipeConfirm !== "حذف همه"}
              variant="destructive"
              className="gap-1.5"
            >
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              حذف دائمی همه داده‌ها
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DictionaryItem({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
      <code className="text-[10px] font-mono bg-background border px-1.5 py-0.5 rounded shrink-0">{name}</code>
      <span className="text-muted-foreground">{desc}</span>
    </div>
  );
}
