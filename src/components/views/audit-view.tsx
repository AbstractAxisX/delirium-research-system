"use client";

import { useEffect, useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ScrollText, LogIn, LogOut, UserPlus, Pencil, Trash2, ClipboardList, Shield, Search, ChevronRight, ChevronLeft, Database, AlertTriangle } from "lucide-react";
import { toJalaliDateTime, toPersianDigits } from "@/lib/persian";

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "ورود", LOGOUT: "خروج",
  CREATE_PATIENT: "ثبت بیمار", UPDATE_PATIENT: "ویرایش بیمار", DELETE_PATIENT: "حذف بیمار",
  FILL_MDAS: "ثبت MDAS", UNLOCK_MDAS: "باز کردن قفل",
  USER_MANAGE: "مدیریت کاربر", GROUP_MANAGE: "مدیریت گروه", DEPT_MANAGE: "مدیریت بخش",
  PROFILE_UPDATE: "ویرایش پروفایل",
  BACKUP: "پشتیبان‌گیری", RESTORE: "بازگردانی", WIPE_DATA: "حذف داده‌ها",
};

const ACTION_ICONS: Record<string, any> = {
  LOGIN: LogIn, LOGOUT: LogOut,
  CREATE_PATIENT: UserPlus, UPDATE_PATIENT: Pencil, DELETE_PATIENT: Trash2,
  FILL_MDAS: ClipboardList, UNLOCK_MDAS: ClipboardList,
  USER_MANAGE: Shield, GROUP_MANAGE: Shield, DEPT_MANAGE: Shield,
  PROFILE_UPDATE: Shield,
  BACKUP: Database, RESTORE: Database, WIPE_DATA: AlertTriangle,
};

const ACTION_TONES: Record<string, string> = {
  LOGIN: "info", LOGOUT: "default",
  CREATE_PATIENT: "success", UPDATE_PATIENT: "info", DELETE_PATIENT: "danger",
  FILL_MDAS: "primary", UNLOCK_MDAS: "warning",
  USER_MANAGE: "warning", GROUP_MANAGE: "warning", DEPT_MANAGE: "warning",
  PROFILE_UPDATE: "info",
  BACKUP: "info", RESTORE: "warning", WIPE_DATA: "danger",
};

const TONE_CLASSES: Record<string, string> = {
  default: "bg-muted text-muted-foreground",
  info: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  danger: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  primary: "bg-primary/15 text-primary",
};

const PAGE_SIZE = 20;

export function AuditView() {
  const { user, refreshKey } = useApp();
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    let cancelled = false;
    api("/api/audit")
      .then((r: any) => { if (!cancelled) setAllLogs(r.logs || []); })
      .catch(() => { if (!cancelled) setAllLogs([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey, user]);

  const filtered = useMemo(() => {
    let out = allLogs;
    if (actionFilter !== "ALL") out = out.filter((l) => l.action === actionFilter);
    if (search.trim()) {
      const q = search.trim();
      out = out.filter((l) =>
        (l.detail || "").includes(q) ||
        (l.user?.fullName || "").includes(q) ||
        (l.patient?.code || "").includes(q)
      );
    }
    return out;
  }, [allLogs, search, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageLogs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (user?.role !== "ADMIN") return <div className="text-center py-12 text-muted-foreground">دسترسی فقط برای مدیر</div>;
  if (loading) return <div className="grid place-items-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const availableActions = Array.from(new Set(allLogs.map((l) => l.action)));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-primary" />
          لاگ تغییرات
        </h1>
        <p className="text-sm text-muted-foreground mt-1">جستجو و فیلتر در رویدادهای سیستم - {toPersianDigits(allLogs.length)} رویداد ثبت شده</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="جستجو در جزئیات، نام کاربر یا کد بیمار..."
              className="pr-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48 h-9 text-xs"><SelectValue placeholder="نوع رویداد" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">همه رویدادها</SelectItem>
              {availableActions.map((a) => (
                <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || actionFilter !== "ALL") && (
            <Button variant="outline" size="sm" onClick={() => { setSearch(""); setActionFilter("ALL"); setPage(1); }} className="h-9">
              پاک کردن فیلتر
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {pageLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">رویدادی یافت نشد</div>
            ) : (
              pageLogs.map((log) => {
                const Icon = ACTION_ICONS[log.action] || ScrollText;
                const tone = ACTION_TONES[log.action] || "default";
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 hover:bg-accent/30">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${TONE_CLASSES[tone]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{log.user?.fullName || "سیستم"}</span>
                        <Badge variant="outline" className="text-[9px]">{ACTION_LABELS[log.action] || log.action}</Badge>
                        {log.patient && <span className="text-[10px] text-muted-foreground">بیمار: {log.patient.code}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.detail || "—"}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono shrink-0">
                      {toJalaliDateTime(log.createdAt)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t text-xs">
              <span className="text-muted-foreground">
                صفحه {toPersianDigits(page)} از {toPersianDigits(totalPages)} - {toPersianDigits(filtered.length)} رویداد
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
