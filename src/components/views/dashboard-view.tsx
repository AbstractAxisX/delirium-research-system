"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api-client";
import { StatCard } from "@/components/shared/stat-card";
import { PatientCard } from "@/components/shared/patient-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Pill, AlertCircle, Activity, UserCheck, Clock, ChevronLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { drugLabel } from "@/lib/options";
import { toJalali, toJalaliDateTime, toPersianDigits } from "@/lib/persian";
import { computeFollowUpStatus, type FollowUpInfo } from "@/lib/followup";

type DashboardData = {
  total: number;
  byDrug: { drugType: string; count: number }[];
  byDepartment: { department: string; count: number }[];
  byUser: { user: string; count: number }[];
  recent: any[];
  followUpNeeded: any[];
  counts: {
    needs24h: number;
    needs48h: number;
    overdue: number;
    complete: number;
  };
  mdasCounts: { timePoint: string; count: number }[];
  role: string;
};

export function DashboardView() {
  const { setView, setActivePatient, refreshKey, user } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api("/api/dashboard")
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setData(null); setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (loading || !data) {
    return <div className="grid place-items-center h-64 text-muted-foreground">در حال بارگذاری داشبورد...</div>;
  }

  const olanzapineCount = data.byDrug.find((b) => b.drugType === "OLANZAPINE")?.count || 0;
  const haloperidolCount = data.byDrug.find((b) => b.drugType === "HALOPERIDOL")?.count || 0;
  const baselineCount = data.mdasCounts.find((m) => m.timePoint === "BASELINE")?.count || 0;
  const h24Count = data.mdasCounts.find((m) => m.timePoint === "H24")?.count || 0;
  const h48Count = data.mdasCounts.find((m) => m.timePoint === "H48")?.count || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">داشبورد</h1>
          <p className="text-sm text-muted-foreground mt-1">خلاصه‌ای از وضعیت ثبت بیماران و پیگیری‌ها</p>
        </div>
        <Button onClick={() => setView("new-patient")} className="gap-2">
          <UserCheck className="h-4 w-4" />ثبت بیمار جدید
        </Button>
      </div>

      {/* Clickable stat cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <button onClick={() => setView("all-patients")} className="text-right">
          <StatCard
            title="کل بیماران"
            value={toPersianDigits(data.total)}
            subtitle={`${toPersianDigits(baselineCount)} نمره پایه ثبت شده`}
            icon={<Users className="h-5 w-5" />}
            tone="primary"
            className="cursor-pointer hover:scale-[1.02] transition-transform w-full"
          />
        </button>
        <button onClick={() => setView("all-patients")} className="text-right">
          <StatCard
            title="گروه اولانزاپین"
            value={toPersianDigits(olanzapineCount)}
            subtitle="رقم آخر کد ملی فرد"
            icon={<Pill className="h-5 w-5" />}
            tone="success"
            className="cursor-pointer hover:scale-[1.02] transition-transform w-full"
          />
        </button>
        <button onClick={() => setView("all-patients")} className="text-right">
          <StatCard
            title="گروه هالوپریدول"
            value={toPersianDigits(haloperidolCount)}
            subtitle="رقم آخر کد ملی زوج"
            icon={<Pill className="h-5 w-5" />}
            tone="warning"
            className="cursor-pointer hover:scale-[1.02] transition-transform w-full"
          />
        </button>
        <button onClick={() => setView("all-patients")} className="text-right">
          <StatCard
            title="نیازمند پیگیری"
            value={toPersianDigits(data.counts.needs24h + data.counts.needs48h)}
            subtitle={data.counts.overdue > 0 ? `${toPersianDigits(data.counts.overdue)} بیمار سررسید گذشته` : "بیماران در بازه ویزیت"}
            icon={<AlertCircle className="h-5 w-5" />}
            tone="danger"
            className="cursor-pointer hover:scale-[1.02] transition-transform w-full"
          />
        </button>
      </div>

      {/* Follow-up summary cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="border-amber-500/30 bg-amber-500/[0.03]">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">نیازمند ویزیت ۲۴h</p>
                <p className="text-2xl lg:text-3xl font-bold tabular-nums mt-0.5 text-amber-600 dark:text-amber-400">
                  {toPersianDigits(data.counts.needs24h)}
                </p>
              </div>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/[0.03]">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">نیازمند ویزیت ۴۸h</p>
                <p className="text-2xl lg:text-3xl font-bold tabular-nums mt-0.5 text-amber-600 dark:text-amber-400">
                  {toPersianDigits(data.counts.needs48h)}
                </p>
              </div>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-rose-500/30 bg-rose-500/[0.03]">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">سررسید گذشته</p>
                <p className="text-2xl lg:text-3xl font-bold tabular-nums mt-0.5 text-rose-600 dark:text-rose-400">
                  {toPersianDigits(data.counts.overdue)}
                </p>
              </div>
              <AlertTriangle className="h-5 w-5 text-rose-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/30 bg-emerald-500/[0.03]">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">تکمیل‌شده (هر دو)</p>
                <p className="text-2xl lg:text-3xl font-bold tabular-nums mt-0.5 text-emerald-600 dark:text-emerald-400">
                  {toPersianDigits(data.counts.complete)}
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MDAS progress — clickable to analytics */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView("analytics")}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              پیشرفت ثبت نمرات MDAS
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              مشاهده تحلیل <ChevronLeft className="h-3 w-3" />
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: "نمره پایه (قبل از تزریق)", count: baselineCount, color: "bg-primary" },
              { label: "نمره ۲۴ ساعت بعد", count: h24Count, color: "bg-emerald-500" },
              { label: "نمره ۴۸ ساعت بعد", count: h48Count, color: "bg-amber-500" },
            ].map((s) => {
              const pct = data.total > 0 ? Math.round((s.count / data.total) * 100) : 0;
              return (
                <div key={s.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-medium tabular-nums">
                      {toPersianDigits(s.count)} از {toPersianDigits(data.total)} ({toPersianDigits(pct)}٪)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${s.color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Follow-up needed */}
      {data.followUpNeeded.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Clock className="h-4 w-4" />
              بیماران نیازمند پیگیری ({toPersianDigits(data.followUpNeeded.length)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.followUpNeeded.slice(0, 15).map((p: any) => {
                const fu = p.followUp;
                return (
                  <div
                    key={p.id}
                    onClick={() => setActivePatient(p.id)}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted">{p.code}</span>
                      <div>
                        <p className="text-sm font-medium">{p.fullName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {drugLabel(p.drugType)} • پایه: {toJalali(p.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <Badge
                        variant="outline"
                        className={
                          fu.tone === "danger"
                            ? "text-rose-700 border-rose-500/40 bg-rose-500/10 text-[10px]"
                            : fu.tone === "warning"
                            ? "text-amber-700 border-amber-500/40 bg-amber-500/10 text-[10px]"
                            : "text-primary border-primary/40 bg-primary/10 text-[10px]"
                        }
                      >
                        {fu.label}
                      </Badge>
                      {fu.dueAt && (
                        <span className="text-[9px] text-muted-foreground font-mono">
                          {toJalaliDateTime(fu.dueAt)}
                        </span>
                      )}
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent patients */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">آخرین بیماران ثبت‌شده</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setView("all-patients")} className="text-xs">
            مشاهده همه <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              هنوز بیماری ثبت نشده است. برای شروع، روی «ثبت بیمار جدید» بزنید.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.recent.map((p: any) => (
                <PatientCard key={p.id} patient={p} onOpen={(id) => setActivePatient(id)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department breakdown (admin only) */}
      {user?.role === "ADMIN" && data.byDepartment.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">توزیع بر اساس بخش بستری</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.byDepartment.map((d) => {
                const pct = data.total > 0 ? Math.round((d.count / data.total) * 100) : 0;
                return (
                  <div key={d.department} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{d.department}</span>
                      <span className="tabular-nums">{toPersianDigits(d.count)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">ثبت توسط کاربران</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.byUser.length === 0 ? (
                <p className="text-sm text-muted-foreground">داده‌ای موجود نیست</p>
              ) : (
                data.byUser.map((u, i) => {
                  const pct = data.total > 0 ? Math.round((u.count / data.total) * 100) : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{u.user}</span>
                        <span className="tabular-nums">{toPersianDigits(u.count)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-emerald-500/70" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
