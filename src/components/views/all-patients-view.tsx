"use client";

import { useEffect, useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, ChevronRight, ChevronLeft, Loader2, FileX } from "lucide-react";
import { drugLabel } from "@/lib/options";
import { toJalali, toPersianDigits } from "@/lib/persian";
import { MultiSelect } from "@/components/ui/multi-select";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { computeFollowUpStatus } from "@/lib/followup";

// Helper: check if MDAS answers exist in answersJson
function hasMdasAnswers(record: any): boolean {
  if (!record) return false;
  // Check answersJson
  if (record.answersJson) {
    try {
      const ans = JSON.parse(record.answersJson);
      if (Object.keys(ans).some(k => k.startsWith("q") && typeof ans[k] === "number")) return true;
    } catch {}
  }
  // Fallback: check legacy q1 column
  return record.q1 != null;
}
import { toast } from "sonner";

type FollowUpFilter = "needs_24h" | "needs_48h" | "overdue" | "complete";

export function AllPatientsView() {
  const { setActivePatient, refreshKey, user } = useApp();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [departments, setDepartments] = useState<string[]>([]);
  const pageSize = 20;

  const [search, setSearch] = useState("");
  const [drugType, setDrugType] = useState("");
  const [department, setDepartment] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [followUpFilters, setFollowUpFilters] = useState<FollowUpFilter[]>([]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (drugType) p.set("drugType", drugType);
    if (department) p.set("department", department);
    if (fromDate) p.set("fromDate", fromDate);
    if (toDate) p.set("toDate", toDate);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p.toString();
  }, [search, drugType, department, fromDate, toDate, page]);

  useEffect(() => {
    let cancelled = false;
    api(`/api/patients?${queryString}`)
      .then((r: any) => {
        if (cancelled) return;
        setPatients(r.patients || []);
        setTotal(r.total || 0);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setPatients([]);
        setTotal(0);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [queryString, refreshKey]);

  useEffect(() => {
    api("/api/departments").then((r: any) => setDepartments((r.departments || []).map((d: any) => d.name))).catch(() => {});
  }, []);

  // Client-side filter for follow-up status (based on flexible timing)
  const filtered = useMemo(() => {
    if (followUpFilters.length === 0) return patients;
    const now = new Date();
    return patients.filter((p) => {
      const mdas = p.mdasScores || [];
      const baseline = mdas.find((m: any) => m.timePoint === "BASELINE");
      const h24 = mdas.find((m: any) => m.timePoint === "H24");
      const h48 = mdas.find((m: any) => m.timePoint === "H48");
      const info = computeFollowUpStatus(
        baseline?.filledAt, h24?.filledAt, h48?.filledAt, now,
        hasMdasAnswers(h24), hasMdasAnswers(h48)
      );
      return followUpFilters.includes(info.status as FollowUpFilter) ||
        (followUpFilters.includes("overdue") && (info.overdueHours || 0) > 0);
    });
  }, [patients, followUpFilters]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function reset() {
    setSearch(""); setDrugType(""); setDepartment("");
    setFromDate(""); setToDate(""); setPage(1); setFollowUpFilters([]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">همه بیماران</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {user?.role === "ADMIN" ? `مجموع ${toPersianDigits(total)} بیمار ثبت‌شده` : `بیماران ثبت‌شده توسط شما (${toPersianDigits(total)})`}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 lg:p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="جستجو بر اساس کد ملی، کد بیمار یا نام..."
                className="pr-9"
              />
            </div>
            <MultiSelect
              options={[
                { value: "OLANZAPINE", label: "اولانزاپین" },
                { value: "HALOPERIDOL", label: "هالوپریدول" },
              ]}
              value={drugType ? [drugType] : []}
              onChange={(v) => { setDrugType(v[v.length - 1] || ""); setPage(1); }}
              placeholder="دارو"
              pillTone="primary"
            />
            <MultiSelect
              options={departments.map((d) => ({ value: d, label: d }))}
              value={department ? [department] : []}
              onChange={(v) => { setDepartment(v[v.length - 1] || ""); setPage(1); }}
              placeholder="بخش"
              pillTone="amber"
            />
            <MultiSelect
              options={[
                { value: "needs_24h", label: "نیازمند ۲۴h" },
                { value: "needs_48h", label: "نیازمند ۴۸h" },
                { value: "overdue", label: "سررسید گذشته" },
                { value: "complete", label: "تکمیل‌شده" },
              ]}
              value={followUpFilters}
              onChange={(v) => setFollowUpFilters(v as FollowUpFilter[])}
              placeholder="وضعیت پیگیری"
              pillTone="rose"
            />
            <Button variant="outline" onClick={reset} size="sm" className="gap-1.5 h-9">
              <Filter className="h-3.5 w-3.5" />
              پاک کردن
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground whitespace-nowrap">از تاریخ:</span>
            <JalaliDatePicker value={fromDate} onChange={(v) => { setFromDate(v); setPage(1); }} placeholder="از تاریخ" className="h-9 text-xs w-36" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">تا تاریخ:</span>
            <JalaliDatePicker value={toDate} onChange={(v) => { setToDate(v); setPage(1); }} placeholder="تا تاریخ" className="h-9 text-xs w-36" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center h-40 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileX className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">هیچ بیماری با این فیلترها یافت نشد</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right text-xs">کد</TableHead>
                      <TableHead className="text-right text-xs">نام بیمار</TableHead>
                      <TableHead className="text-right text-xs">دارو</TableHead>
                      <TableHead className="text-right text-xs">بخش</TableHead>
                      <TableHead className="text-center text-xs">پایه</TableHead>
                      <TableHead className="text-center text-xs">۲۴h</TableHead>
                      <TableHead className="text-center text-xs">۴۸h</TableHead>
                      <TableHead className="text-right text-xs">وضعیت پیگیری</TableHead>
                      <TableHead className="text-right text-xs"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => {
                      const mdas = p.mdasScores || [];
                      const baseline = mdas.find((m: any) => m.timePoint === "BASELINE");
                      const h24 = mdas.find((m: any) => m.timePoint === "H24");
                      const h48 = mdas.find((m: any) => m.timePoint === "H48");
                      const fu = computeFollowUpStatus(
                        baseline?.filledAt, h24?.filledAt, h48?.filledAt,
                        new Date(),
                        hasMdasAnswers(h24), hasMdasAnswers(h48)
                      );
                      return (
                        <TableRow key={p.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setActivePatient(p.id)}>
                          <TableCell className="font-mono text-xs font-semibold">{p.code}</TableCell>
                          <TableCell className="font-medium text-sm">{p.fullName}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                p.drugType === "OLANZAPINE"
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px]"
                                  : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]"
                              }
                            >
                              {drugLabel(p.drugType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{p.department || "—"}</TableCell>
                          <TableCell className="text-center text-sm font-mono tabular-nums">{typeof baseline?.totalScore === "number" ? toPersianDigits(baseline.totalScore) : "—"}</TableCell>
                          <TableCell className="text-center text-sm font-mono tabular-nums">
                            {typeof h24?.totalScore === "number" ? toPersianDigits(h24.totalScore) : <span className="text-rose-500">—</span>}
                          </TableCell>
                          <TableCell className="text-center text-sm font-mono tabular-nums">
                            {typeof h48?.totalScore === "number" ? toPersianDigits(h48.totalScore) : <span className="text-rose-500">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                fu.tone === "danger" ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                : fu.tone === "warning" ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                : fu.tone === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : fu.tone === "primary" ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border"
                              }`}
                            >
                              {fu.label}
                            </Badge>
                          </TableCell>
                          <TableCell><ChevronLeft className="h-4 w-4 text-muted-foreground" /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between p-3 border-t text-xs">
                <span className="text-muted-foreground">
                  صفحه {toPersianDigits(page)} از {toPersianDigits(totalPages)} - کل: {toPersianDigits(total)} بیمار
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

