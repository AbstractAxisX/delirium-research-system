"use client";

import { useEffect, useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis,
  PieChart, Pie, Cell, ComposedChart, Area, AreaChart,
} from "recharts";
import {
  Loader2, TrendingDown, Users, Pill, BarChart3, Activity, Award,
  Target, FlaskConical, Sigma, AlertTriangle, CheckCircle2, XCircle,
  LayoutDashboard, Filter, PieChart as PieIcon, GitCompare,
} from "lucide-react";
import { drugLabel, DEPARTMENTS } from "@/lib/options";
import { toPersianDigits } from "@/lib/persian";
import { StatCard } from "@/components/shared/stat-card";
import { MDAS_ITEMS } from "@/lib/mdas";
import { fmtNum, formatPValue } from "@/lib/stats";

type AnalyticsData = any;

const COLORS = {
  primary: "var(--primary)",
  olanzapine: "#10b981",
  haloperidol: "#f59e0b",
  grid: "var(--border)",
  muted: "var(--muted-foreground)",
};

const PIE_COLORS = ["#0d9488", "#f59e0b", "#7c3aed", "#db2777", "#0891b2", "#ea580c", "#16a34a", "#ca8a04"];

export function AnalyticsView() {
  const { refreshKey } = useApp();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    department: "", drugType: "", fromDate: "", toDate: "",
    selectedPatientIds: [] as string[],
  });

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.department) p.set("department", filters.department);
    if (filters.drugType) p.set("drugType", filters.drugType);
    if (filters.fromDate) p.set("fromDate", filters.fromDate);
    if (filters.toDate) p.set("toDate", filters.toDate);
    if (filters.selectedPatientIds.length > 0) p.set("patientIds", filters.selectedPatientIds.join(","));
    return p.toString();
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api(`/api/analytics?${queryString}`),
      api("/api/patients?pageSize=1000"),
      api("/api/departments"),
    ])
      .then(([d, p, depts]: any) => {
        if (cancelled) return;
        setData(d);
        setAllPatients((p.patients || []).map((x: any) => ({ id: x.id, code: x.code, fullName: x.fullName, drugType: x.drugType })));
        setDepartments((depts.departments || []).map((x: any) => x.name));
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setData(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [queryString, refreshKey]);

  if (loading || !data) {
    return <div className="grid place-items-center h-64 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const ol = data.olanzapine;
  const ha = data.haloperidol;
  const stats = data.stats || {};

  // Build trend data with error bars
  const trendData = [
    { time: "پایه", اولانزاپین: ol.baselineMean, هالوپریدول: ha.baselineMean },
    { time: "۲۴ ساعت", اولانزاپین: ol.h24Mean, هالوپریدول: ha.h24Mean },
    { time: "۴۸ ساعت", اولانزاپین: ol.h48Mean, هالوپریدول: ha.h48Mean },
  ];

  // Pie: drug distribution
  const drugPie = [
    { name: "اولانزاپین", value: ol.n, color: COLORS.olanzapine },
    { name: "هالوپریدول", value: ha.n, color: COLORS.haloperidol },
  ].filter((d) => d.value > 0);

  // Pie: responder status
  const responderPie = [
    { name: "پاسخگو (≥۵۰٪ بهبود)", value: (ol.responder48h || 0) + (ha.responder48h || 0), color: "#10b981" },
    { name: "غیر پاسخگو", value: ((ol.n - (ol.responder48h || 0)) + (ha.n - (ha.responder48h || 0))), color: "#94a3b8" },
  ].filter((d) => d.value > 0);

  // Department distribution
  const deptData = data.departmentStats?.map((d: any) => ({
    name: d.department, تعداد: d.count, اولانزاپین: d.olCount, هالوپریدول: d.haCount,
  })) || [];

  // Group comparison
  const groupComparison = [
    { name: "نمره پایه", اولانزاپین: ol.baselineMean, هالوپریدول: ha.baselineMean },
    { name: "نمره ۲۴h", اولانزاپین: ol.h24Mean, هالوپریدول: ha.h24Mean },
    { name: "نمره ۴۸h", اولانزاپین: ol.h48Mean, هالوپریدول: ha.h48Mean },
    { name: "Δ ۲۴h", اولانزاپین: ol.delta24Mean, هالوپریدول: ha.delta24Mean },
    { name: "Δ ۴۸h", اولانزاپین: ol.delta48Mean, هالوپریدول: ha.delta48Mean },
  ];

  const radarData48 = data.perItem?.map((item: any, i: number) => ({
    item: `Q${toPersianDigits(i + 1)}`,
    اولانزاپین: item.olanzapine.h48 ?? 0,
    هالوپریدول: item.haloperidol.h48 ?? 0,
  })) || [];

  const outcomesData = Object.entries(data.outcomes || {}).map(([k, v]) => ({
    name: OUTCOME_LABELS[k] || k, count: v as number,
  }));

  const scatterOl = (data.trajectories || []).filter((t: any) => t.drugType === "OLANZAPINE" && t.baseline != null && t.h48 != null).map((t: any) => ({ x: t.baseline, y: t.h48, name: t.code }));
  const scatterHa = (data.trajectories || []).filter((t: any) => t.drugType === "HALOPERIDOL" && t.baseline != null && t.h48 != null).map((t: any) => ({ x: t.baseline, y: t.h48, name: t.code }));

  // Patient-level trajectory for selected patients
  const selectedTrajectories = (data.trajectories || []).filter((t: any) => filters.selectedPatientIds.includes(t.id));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          تحلیل هوشمند داده‌ها (BI)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          داشبورد تحلیلی کامل با نمودارهای پیشرفته و آزمون‌های آماری
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <MultiSelect
              options={departments.map((d) => ({ value: d, label: d }))}
              value={filters.department ? [filters.department] : []}
              onChange={(v) => setFilters({ ...filters, department: v[0] || "" })}
              placeholder="بخش"
              pillTone="amber"
            />
            <MultiSelect
              options={[
                { value: "OLANZAPINE", label: "اولانزاپین" },
                { value: "HALOPERIDOL", label: "هالوپریدول" },
              ]}
              value={filters.drugType ? [filters.drugType] : []}
              onChange={(v) => setFilters({ ...filters, drugType: v[0] || "" })}
              placeholder="دارو"
              pillTone="primary"
            />
            <JalaliDatePicker value={filters.fromDate} onChange={(v) => setFilters({ ...filters, fromDate: v })} className="h-9 text-xs w-36" />
            <JalaliDatePicker value={filters.toDate} onChange={(v) => setFilters({ ...filters, toDate: v })} className="h-9 text-xs w-36" />
          </div>
          {/* Patient multi-select */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground whitespace-nowrap">بیماران:</span>
            <MultiSelect
              options={allPatients.map((p) => ({ value: p.id, label: `${p.code} - ${p.fullName}` }))}
              value={filters.selectedPatientIds}
              onChange={(v) => setFilters({ ...filters, selectedPatientIds: v })}
              placeholder="همه بیماران"
              pillTone="emerald"
            />
            {filters.selectedPatientIds.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setFilters({ ...filters, selectedPatientIds: [] })}>
                همه بیماران
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="کل نمونه‌ها" value={toPersianDigits(data.total)} icon={<Users className="h-5 w-5" />} tone="primary" />
        <StatCard title="اولانزاپین" value={toPersianDigits(ol.n)} subtitle={`پاسخگو: ${toPersianDigits(ol.responder48h)}`} icon={<Pill className="h-5 w-5" />} tone="success" />
        <StatCard title="هالوپریدول" value={toPersianDigits(ha.n)} subtitle={`پاسخگو: ${toPersianDigits(ha.responder48h)}`} icon={<Pill className="h-5 w-5" />} tone="warning" />
        <StatCard
          title="Cohen's d (Δ ۴۸h)"
          value={fmtNum(stats.cohensDDelta48, 2)}
          subtitle={effectSizeLabel(stats.cohensDDelta48)}
          icon={<Sigma className="h-5 w-5" />}
          tone="primary"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-3">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto">
          <TabsTrigger value="overview" className="text-xs"><LayoutDashboard className="h-3.5 w-3.5 ml-1" />نمای کلی</TabsTrigger>
          <TabsTrigger value="trend" className="text-xs"><Activity className="h-3.5 w-3.5 ml-1" />روند MDAS</TabsTrigger>
          <TabsTrigger value="stats" className="text-xs"><FlaskConical className="h-3.5 w-3.5 ml-1" />آزمون آماری</TabsTrigger>
          <TabsTrigger value="items" className="text-xs"><Target className="h-3.5 w-3.5 ml-1" />سؤال‌ها</TabsTrigger>
          <TabsTrigger value="individual" className="text-xs"><Users className="h-3.5 w-3.5 ml-1" />فردی</TabsTrigger>
          <TabsTrigger value="outcomes" className="text-xs"><Award className="h-3.5 w-3.5 ml-1" />پیامدها</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB — BI dashboard with multiple charts */}
        <TabsContent value="overview" className="space-y-3">
          <div className="grid lg:grid-cols-3 gap-3">
            {/* Drug distribution pie */}
            <Card>
              <CardHeader><CardTitle className="text-sm">توزیع دارو</CardTitle></CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={drugPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                        {drugPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: "11px", direction: "rtl" }} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Responder pie */}
            <Card>
              <CardHeader><CardTitle className="text-sm">نرخ پاسخ‌دهی (۴۸h)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={responderPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                        {responderPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: "11px", direction: "rtl" }} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Mean comparison */}
            <Card>
              <CardHeader><CardTitle className="text-sm">میانگین نمرات</CardTitle></CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={groupComparison.slice(0, 3)}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                      <XAxis dataKey="name" stroke={COLORS.muted} fontSize={9} />
                      <YAxis stroke={COLORS.muted} fontSize={10} domain={[0, 30]} />
                      <Tooltip contentStyle={{ fontSize: "11px", direction: "rtl" }} />
                      <Legend wrapperStyle={{ fontSize: "10px" }} />
                      <Bar dataKey="اولانزاپین" fill={COLORS.olanzapine} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="هالوپریدول" fill={COLORS.haloperidol} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department bar chart */}
          {deptData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">توزیع بیماران بر اساس بخش</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptData} layout="vertical" margin={{ left: 30, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                      <XAxis type="number" stroke={COLORS.muted} fontSize={10} />
                      <YAxis type="category" dataKey="name" stroke={COLORS.muted} fontSize={10} width={100} />
                      <Tooltip contentStyle={{ fontSize: "11px", direction: "rtl" }} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="اولانزاپین" stackId="a" fill={COLORS.olanzapine} />
                      <Bar dataKey="هالوپریدول" stackId="a" fill={COLORS.haloperidol} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected patients trajectory */}
          {selectedTrajectories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">روند بیماران انتخاب‌شده ({toPersianDigits(selectedTrajectories.length)} بیمار)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={["BASELINE", "H24", "H48"].map((tp, i) => {
                      const point: any = { time: ["پایه", "۲۴h", "۴۸h"][i] };
                      selectedTrajectories.forEach((t: any) => {
                        const val = i === 0 ? t.baseline : i === 1 ? t.h24 : t.h48;
                        if (val != null) point[t.code] = val;
                      });
                      return point;
                    })}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                      <XAxis dataKey="time" stroke={COLORS.muted} fontSize={11} />
                      <YAxis stroke={COLORS.muted} fontSize={11} domain={[0, 30]} />
                      <Tooltip contentStyle={{ fontSize: "11px", direction: "rtl" }} />
                      <Legend wrapperStyle={{ fontSize: "10px" }} />
                      {selectedTrajectories.map((t: any, i: number) => (
                        <Line key={t.id} type="monotone" dataKey={t.code} stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trend tab */}
        <TabsContent value="trend" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">روند میانگین نمرات MDAS</CardTitle>
              <CardDescription>میانگین نمره کل (۰ تا ۳۰) در هر گروه درمانی</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                    <XAxis dataKey="time" stroke={COLORS.muted} fontSize={12} />
                    <YAxis stroke={COLORS.muted} fontSize={12} domain={[0, 30]} />
                    <Tooltip contentStyle={{ fontFamily: "inherit", fontSize: "12px", direction: "rtl" }} />
                    <Legend />
                    <Line type="monotone" dataKey="اولانزاپین" stroke={COLORS.olanzapine} strokeWidth={2.5} dot={{ r: 5 }} />
                    <Line type="monotone" dataKey="هالوپریدول" stroke={COLORS.haloperidol} strokeWidth={2.5} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 gap-3">
            <GroupSummaryCard title="گروه اولانزاپین" data={ol} color="emerald" />
            <GroupSummaryCard title="گروه هالوپریدول" data={ha} color="amber" />
          </div>
        </TabsContent>

        {/* Stats tab */}
        <TabsContent value="stats" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                آزمون اصلی: مقایسه تغییر نمره ۴۸ ساعت
              </CardTitle>
              <CardDescription>Welch's t-test بین دو گروه درمانی (مهم‌ترین آزمون)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.delta48Test ? (
                <TestResult
                  title="Welch's t-test (تغییر نمره از پایه تا ۴۸ ساعت)"
                  result={stats.delta48Test}
                  cohenD={stats.cohensDDelta48}
                  interpretation={
                    stats.delta48Test.pValue < 0.05
                      ? "تفاوت معنادار است — احتمالاً یکی از داروها مؤثرتر است"
                      : "تفاوت معنادار نیست — هر دو دارو عملکرد مشابهی دارند"
                  }
                />
              ) : <NoData />}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">تعادل گروه‌ها (پایه)</CardTitle>
                <CardDescription>آیا گروه‌ها قبل از درمان متوازن بودند؟</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.baselineBalanceTest ? (
                  <TestResult compact result={stats.baselineBalanceTest}
                    interpretation={stats.baselineBalanceTest.pValue > 0.05 ? "گروه‌ها متوازن هستند ✓" : "گروه‌ها نامتوازن هستند ✗"}
                  />
                ) : <NoData />}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">مقایسه نمره ۴۸ ساعت</CardTitle>
                <CardDescription>Welch's t-test نمره نهایی</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.h48Test ? (
                  <TestResult compact result={stats.h48Test} cohenD={stats.cohensDH48} />
                ) : <NoData />}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">آزمون زوجی (Paired t-test): قبل و بعد در هر گروه</CardTitle>
              <CardDescription>تغییر معنادار در نمره ۴۸h نسبت به پایه</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              {stats.olPaired ? (
                <div className="p-3 rounded-lg border bg-emerald-500/5">
                  <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">گروه اولانزاپین</h4>
                  <TestResult compact result={stats.olPaired} />
                </div>
              ) : <NoData />}
              {stats.haPaired ? (
                <div className="p-3 rounded-lg border bg-amber-500/5">
                  <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">گروه هالوپریدول</h4>
                  <TestResult compact result={stats.haPaired} />
                </div>
              ) : <NoData />}
            </CardContent>
          </Card>

          {stats.anovaByDept && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">ANOVA: مقایسه بین بخش‌ها</CardTitle>
                <CardDescription>آیا میانگین نمره ۴۸h بین بخش‌ها تفاوت دارد؟</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">F-statistic</p>
                    <p className="text-xl font-bold tabular-nums">{fmtNum(stats.anovaByDept.f, 3)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">df (بین، درون)</p>
                    <p className="text-xl font-bold tabular-nums">{toPersianDigits(stats.anovaByDept.dfBetween)}, {toPersianDigits(stats.anovaByDept.dfWithin)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">p-value</p>
                    <p className="text-xl font-bold tabular-nums">{formatPValue(stats.anovaByDept.pValue)}</p>
                  </div>
                </div>
                <p className="text-xs mt-3 text-muted-foreground">
                  {stats.anovaByDept.pValue < 0.05 ? "تفاوت معنادار بین بخش‌ها وجود دارد" : "تفاوت معناداری بین بخش‌ها یافت نشد"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Items tab */}
        <TabsContent value="items" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">رادار: مقایسه سؤال به سؤال (۴۸ ساعت)</CardTitle>
              <CardDescription>میانگین نمره هر سؤال در دو گروه پس از درمان</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData48}>
                    <PolarGrid stroke={COLORS.grid} />
                    <PolarAngleAxis dataKey="item" stroke={COLORS.muted} fontSize={11} />
                    <PolarRadiusAxis stroke={COLORS.muted} fontSize={9} domain={[0, 3]} />
                    <Radar name="اولانزاپین" dataKey="اولانزاپین" stroke={COLORS.olanzapine} fill={COLORS.olanzapine} fillOpacity={0.4} />
                    <Radar name="هالوپریدول" dataKey="هالوپریدول" stroke={COLORS.haloperidol} fill={COLORS.haloperidol} fillOpacity={0.4} />
                    <Legend />
                    <Tooltip contentStyle={{ fontSize: "11px", direction: "rtl" }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">جدول تفصیلی هر سؤال با آزمون آماری</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-2">#</th>
                    <th className="text-right p-2">سؤال</th>
                    <th className="text-center p-2">اولانزاپین</th>
                    <th className="text-center p-2">هالوپریدول</th>
                    <th className="text-center p-2">t</th>
                    <th className="text-center p-2">p-value</th>
                    <th className="text-center p-2">معناداری</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.perItem || []).map((item: any, i: number) => (
                    <tr key={item.key} className="border-b hover:bg-accent/30">
                      <td className="p-2 font-mono">{toPersianDigits(i + 1)}</td>
                      <td className="p-2 text-right max-w-xs">{MDAS_ITEMS[i].title}</td>
                      <td className="p-2 text-center font-mono">{item.olanzapine.h48 != null ? toPersianDigits(item.olanzapine.h48.toFixed(2)) : "—"}</td>
                      <td className="p-2 text-center font-mono">{item.haloperidol.h48 != null ? toPersianDigits(item.haloperidol.h48.toFixed(2)) : "—"}</td>
                      <td className="p-2 text-center font-mono">{item.ttest48 ? fmtNum(item.ttest48.t, 2) : "—"}</td>
                      <td className="p-2 text-center font-mono">{item.ttest48 ? formatPValue(item.ttest48.pValue) : "—"}</td>
                      <td className="p-2 text-center">
                        {item.ttest48 && (
                          item.ttest48.pValue < 0.05
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 inline" />
                            : <XCircle className="h-3.5 w-3.5 text-muted-foreground inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual tab */}
        <TabsContent value="individual" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">پراکندگی: نمره پایه در برابر ۴۸ ساعت</CardTitle>
              <CardDescription>نقاط زیر خط قطری = بهبود</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                    <XAxis type="number" dataKey="x" name="نمره پایه" domain={[0, 30]} stroke={COLORS.muted} fontSize={11} label={{ value: "نمره پایه", position: "bottom", fontSize: 11 }} />
                    <YAxis type="number" dataKey="y" name="نمره ۴۸h" domain={[0, 30]} stroke={COLORS.muted} fontSize={11} label={{ value: "نمره ۴۸h", angle: -90, position: "insideLeft", fontSize: 11 }} />
                    <ZAxis range={[60, 60]} />
                    <Tooltip contentStyle={{ fontSize: "11px", direction: "rtl" }} />
                    <Legend />
                    <Scatter name="اولانزاپین" data={scatterOl} fill={COLORS.olanzapine} />
                    <Scatter name="هالوپریدول" data={scatterHa} fill={COLORS.haloperidol} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">جدول مسیر هر بیمار</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-2">کد</th>
                    <th className="text-right p-2">نام</th>
                    <th className="text-center p-2">دارو</th>
                    <th className="text-center p-2">پایه</th>
                    <th className="text-center p-2">۲۴h</th>
                    <th className="text-center p-2">۴۸h</th>
                    <th className="text-center p-2">Δ ۲۴h</th>
                    <th className="text-center p-2">Δ ۴۸h</th>
                    <th className="text-center p-2">٪ بهبود</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.trajectories || []).map((t: any) => (
                    <tr key={t.id} className="border-b hover:bg-accent/30">
                      <td className="p-2 font-mono">{t.code}</td>
                      <td className="p-2">{t.fullName}</td>
                      <td className="p-2 text-center">
                        <Badge variant="outline" className={`text-[9px] ${t.drugType === "OLANZAPINE" ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300" : "border-amber-500/40 text-amber-700 dark:text-amber-300"}`}>
                          {drugLabel(t.drugType)}
                        </Badge>
                      </td>
                      <td className="p-2 text-center font-mono">{t.baseline != null ? toPersianDigits(t.baseline) : "—"}</td>
                      <td className="p-2 text-center font-mono">{t.h24 != null ? toPersianDigits(t.h24) : "—"}</td>
                      <td className="p-2 text-center font-mono">{t.h48 != null ? toPersianDigits(t.h48) : "—"}</td>
                      <td className="p-2 text-center font-mono">{t.delta24 != null ? toPersianDigits(t.delta24) : "—"}</td>
                      <td className="p-2 text-center font-mono">{t.delta48 != null ? toPersianDigits(t.delta48) : "—"}</td>
                      <td className="p-2 text-center font-mono">
                        {t.responsePct != null ? (
                          <span className={t.responsePct >= 50 ? "text-emerald-600 font-semibold" : t.responsePct >= 0 ? "text-amber-600" : "text-rose-600"}>
                            {toPersianDigits(t.responsePct)}٪
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outcomes tab */}
        <TabsContent value="outcomes" className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <Card>
              <CardHeader><CardTitle className="text-base">پیامدهای بالینی (کل)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={outcomesData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                      <XAxis type="number" stroke={COLORS.muted} fontSize={11} />
                      <YAxis type="category" dataKey="name" stroke={COLORS.muted} fontSize={10} width={120} />
                      <Tooltip contentStyle={{ fontSize: "11px", direction: "rtl" }} />
                      <Bar dataKey="count" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">پیامدها بر اساس دارو</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-2">پیامد</th>
                      <th className="text-center p-2">اولانزاپین</th>
                      <th className="text-center p-2">هالوپریدول</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(OUTCOME_LABELS).map(([k, label]) => (
                      <tr key={k} className="border-b hover:bg-accent/30">
                        <td className="p-2">{label}</td>
                        <td className="p-2 text-center font-mono">
                          {toPersianDigits(data.outcomesByDrug?.OLANZAPINE?.[k] || 0)}
                          <span className="text-[10px] text-muted-foreground"> / {toPersianDigits(data.outcomesByDrug?.OLANZAPINE?.n || 0)}</span>
                        </td>
                        <td className="p-2 text-center font-mono">
                          {toPersianDigits(data.outcomesByDrug?.HALOPERIDOL?.[k] || 0)}
                          <span className="text-[10px] text-muted-foreground"> / {toPersianDigits(data.outcomesByDrug?.HALOPERIDOL?.n || 0)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">تحلیل بر اساس بخش</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-2">بخش</th>
                    <th className="text-center p-2">تعداد</th>
                    <th className="text-center p-2">اولانزاپین</th>
                    <th className="text-center p-2">هالوپریدول</th>
                    <th className="text-center p-2">میانگین پایه</th>
                    <th className="text-center p-2">میانگین ۴۸h</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.departmentStats || []).map((d: any) => (
                    <tr key={d.department} className="border-b hover:bg-accent/30">
                      <td className="p-2">{d.department}</td>
                      <td className="p-2 text-center font-mono">{toPersianDigits(d.count)}</td>
                      <td className="p-2 text-center font-mono">{toPersianDigits(d.olCount)}</td>
                      <td className="p-2 text-center font-mono">{toPersianDigits(d.haCount)}</td>
                      <td className="p-2 text-center font-mono">{d.baselineMean != null ? toPersianDigits(d.baselineMean.toFixed(2)) : "—"}</td>
                      <td className="p-2 text-center font-mono">{d.h48Mean != null ? toPersianDigits(d.h48Mean.toFixed(2)) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const OUTCOME_LABELS: Record<string, string> = {
  needExtraDose: "نیاز به دوز اضافی", earlyDischarge: "ترخیص زودهنگام",
  deathBefore72h: "فوت قبل از ۴۸h", relapse: "عود زودرس",
  icuAdmission: "بستری ICU", patientRefusal: "عدم تمایل",
  severeSideEffect: "عارضه شدید", physicalRestraint: "محدودیت فیزیکی",
};

function effectSizeLabel(d: number | null | undefined): string {
  if (d == null) return "—";
  const abs = Math.abs(d);
  if (abs < 0.2) return "اثر ناچیز";
  if (abs < 0.5) return "اثر کوچک";
  if (abs < 0.8) return "اثر متوسط";
  if (abs < 1.2) return "اثر بزرگ";
  return "اثر بسیار بزرگ";
}

function GroupSummaryCard({ title, data, color }: any) {
  const ring = color === "emerald" ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5";
  const text = color === "emerald" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300";
  const fmt = (v: any) => v != null ? toPersianDigits(Math.round(v * 100) / 100) : "—";
  return (
    <Card className={ring}>
      <CardHeader><CardTitle className={`text-base ${text}`}>{title}</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm">
        <Row label="تعداد بیماران" value={toPersianDigits(data.n)} />
        <Row label="با نمره ۲۴h" value={toPersianDigits(data.withH24)} />
        <Row label="با نمره ۴۸h" value={toPersianDigits(data.withH48)} />
        <Row label="پاسخگو ۴۸h" value={toPersianDigits(data.responder48h)} />
        <Row label="میانگین پایه ± SD" value={`${fmt(data.baselineMean)} ± ${fmt(data.baselineSd)}`} />
        <Row label="میانگین ۴۸h ± SD" value={`${fmt(data.h48Mean)} ± ${fmt(data.h48Sd)}`} />
        <Row label="CI ۹۵٪ پایه" value={data.baselineCI ? `${fmt(data.baselineCI.lower)} تا ${fmt(data.baselineCI.upper)}` : "—"} />
        <Row label="CI ۹۵٪ ۴۸h" value={data.h48CI ? `${fmt(data.h48CI.lower)} تا ${fmt(data.h48CI.upper)}` : "—"} />
        <Row label="Δ میانگین ۴۸h" value={fmt(data.delta48Mean)} highlight={data.delta48Mean > 0 ? "good" : "bad"} />
      </CardContent>
    </Card>
  );
}

function Row({ label, value, highlight }: any) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`font-bold tabular-nums ${highlight === "good" ? "text-emerald-600" : highlight === "bad" ? "text-rose-600" : ""}`}>{value}</span>
    </div>
  );
}

function TestResult({ title, result, cohenD, interpretation, compact }: any) {
  const significant = result.pValue < 0.05;
  return (
    <div className={compact ? "" : "p-3 rounded-lg border"}>
      {title && <h4 className="text-sm font-semibold mb-2">{title}</h4>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Stat label="t-statistic" value={fmtNum(result.t, 3)} />
        <Stat label="درجه آزادی (df)" value={toPersianDigits(Math.round(result.df))} />
        <Stat label="p-value" value={formatPValue(result.pValue)} tone={significant ? "good" : "default"} />
        {cohenD != null && <Stat label="Cohen's d" value={fmtNum(cohenD, 2)} />}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs">
        {significant ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className={significant ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}>
          {interpretation || (significant ? "تفاوت معنادار است (p < ۰٫۰۵)" : "تفاوت معنادار نیست (p ≥ ۰٫۰۵)")}
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: any) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${tone === "good" ? "text-emerald-600" : ""}`}>{value}</p>
    </div>
  );
}

function NoData() {
  return (
    <div className="text-center py-6 text-xs text-muted-foreground">
      <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-50" />
      داده کافی برای آزمون آماری وجود ندارد (حداقل ۲ نمونه در هر گروه لازم است)
    </div>
  );
}
