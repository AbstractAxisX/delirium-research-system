"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Pencil, Trash2, Loader2, Shield, User, ShieldCheck, Lock } from "lucide-react";
import { toJalali, toPersianDigits } from "@/lib/persian";
import { toast } from "sonner";

type UserRow = {
  id: string; username: string; fullName: string; phone: string | null;
  role: string; active: boolean; groupId: string | null; pagePermissions: string; createdAt: string;
  group?: { id: string; name: string; color: string } | null;
  _count?: { patients: number };
};

const ALL_PAGES = [
  { key: "dashboard", label: "داشبورد" },
  { key: "new-patient", label: "ثبت بیمار جدید" },
  { key: "search-patient", label: "جستجوی بیمار" },
  { key: "all-patients", label: "همه بیماران" },
  { key: "patient-detail", label: "جزئیات بیمار" },
  { key: "analytics", label: "تحلیل داده‌ها" },
  { key: "export", label: "خروجی داده" },
];

export function UsersView() {
  const { user: me, refreshKey } = useApp();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    fullName: "", username: "", phone: "", password: "", role: "DOCTOR", active: true, groupId: "",
    pagePermissions: ["dashboard", "new-patient", "search-patient", "all-patients", "patient-detail"],
  });
  const [saving, setSaving] = useState(false);

  async function reload() {
    const [u, g]: any = await Promise.all([api("/api/users"), api("/api/groups")]);
    setUsers(u.users || []);
    setGroups(g.groups || []);
  }

  useEffect(() => {
    if (me?.role !== "ADMIN") { setLoading(false); return; }
    reload().catch(() => toast.error("خطا در بارگذاری")).finally(() => setLoading(false));
  }, [refreshKey, me]);

  function openNew() {
    setEditing(null);
    setForm({
      fullName: "", username: "", phone: "", password: "", role: "DOCTOR", active: true, groupId: "",
      pagePermissions: ["dashboard", "new-patient", "search-patient", "all-patients", "patient-detail"],
    });
    setShowForm(true);
  }
  function openEdit(u: UserRow) {
    setEditing(u);
    setForm({
      fullName: u.fullName, username: u.username, phone: u.phone || "",
      password: "", role: u.role, active: u.active, groupId: u.groupId || "",
      pagePermissions: u.pagePermissions ? u.pagePermissions.split(",").filter(Boolean) : [],
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.fullName || !form.username) { toast.error("نام کامل و نام کاربری الزامی است"); return; }
    if (!editing && !form.password) { toast.error("رمز عبور را وارد کنید"); return; }
    setSaving(true);
    try {
      const body: any = {
        fullName: form.fullName, phone: form.phone || null,
        role: form.role, active: form.active, groupId: form.groupId || null,
        pagePermissions: form.pagePermissions,
      };
      if (!editing) { body.username = form.username; body.password = form.password; }
      else if (form.password) body.password = form.password;
      if (editing) {
        await api(`/api/users/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast.success("کاربر ویرایش شد");
      } else {
        await api("/api/users", { method: "POST", body: JSON.stringify(body) });
        toast.success("کاربر جدید ایجاد شد");
      }
      setShowForm(false);
      await reload();
    } catch (e: any) {
      toast.error(e.message || "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: UserRow) {
    try {
      await api(`/api/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ active: !u.active }) });
      toast.success(u.active ? "کاربر غیرفعال شد" : "کاربر فعال شد");
      await reload();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(u: UserRow) {
    if (!confirm(`حذف کاربر «${u.fullName}»؟ این عمل قابل بازگشت نیست.`)) return;
    try {
      await api(`/api/users/${u.id}`, { method: "DELETE" });
      toast.success("کاربر حذف شد");
      await reload();
    } catch (e: any) { toast.error(e.message); }
  }

  function togglePerm(key: string) {
    setForm((f) => ({
      ...f,
      pagePermissions: f.pagePermissions.includes(key)
        ? f.pagePermissions.filter((p) => p !== key)
        : [...f.pagePermissions, key],
    }));
  }

  if (me?.role !== "ADMIN") return <div className="text-center py-12 text-muted-foreground">دسترسی فقط برای مدیر</div>;
  if (loading) return <div className="grid place-items-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">مدیریت کاربران</h1>
          <p className="text-sm text-muted-foreground mt-1">ایجاد، ویرایش و تعیین دسترسی صفحات برای پزشکان</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <UserPlus className="h-4 w-4" />کاربر جدید
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right text-xs">نام کامل</TableHead>
                  <TableHead className="text-right text-xs">نام کاربری</TableHead>
                  <TableHead className="text-right text-xs">گروه</TableHead>
                  <TableHead className="text-right text-xs">نقش</TableHead>
                  <TableHead className="text-center text-xs">دسترسی</TableHead>
                  <TableHead className="text-center text-xs">بیماران</TableHead>
                  <TableHead className="text-center text-xs">فعال</TableHead>
                  <TableHead className="text-right text-xs">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const perms = u.pagePermissions ? u.pagePermissions.split(",").filter(Boolean) : [];
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-sm">{u.fullName}</TableCell>
                      <TableCell className="font-mono text-xs" dir="ltr">{u.username}</TableCell>
                      <TableCell>
                        {u.group ? (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ background: u.group.color }} />
                            {u.group.name}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={u.role === "ADMIN" ? "border-primary/40 bg-primary/10 text-primary text-[10px]" : "text-[10px]"}>
                          {u.role === "ADMIN" ? <><ShieldCheck className="h-3 w-3 ml-1" />مدیر</> : <><User className="h-3 w-3 ml-1" />پزشک</>}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {u.role === "ADMIN" ? (
                          <span className="text-[10px] text-primary font-medium">دسترسی کامل</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">{toPersianDigits(perms.length)} صفحه</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs tabular-nums">{toPersianDigits(u._count?.patients || 0)}</TableCell>
                      <TableCell className="text-center">
                        <Switch checked={u.active} onCheckedChange={() => toggleActive(u)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(u)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {u.id !== me.id && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(u)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {editing ? "ویرایش کاربر" : "ایجاد کاربر جدید"}
            </DialogTitle>
            <DialogDescription>{editing ? `ویرایش ${editing.fullName}` : "اطلاعات کاربر جدید را وارد کنید"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-xs">نام کامل *</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="دکتر علی محمدی" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">نام کاربری {editing && "(غیرقابل تغییر)"}</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!editing} dir="ltr" className="font-mono text-left" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">موبایل</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" className="font-mono text-left" placeholder="09xxxxxxxxx" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">نقش</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOCTOR">پزشک</SelectItem>
                    <SelectItem value="ADMIN">مدیر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">گروه</Label>
                <Select value={form.groupId || "NONE"} onValueChange={(v) => setForm({ ...form, groupId: v === "NONE" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="بدون گروه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">بدون گروه</SelectItem>
                    {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{editing ? "رمز عبور جدید (اختیاری)" : "رمز عبور *"}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr" className="font-mono text-left" placeholder="••••••" />
            </div>

            {/* Page permissions */}
            {form.role === "DOCTOR" && (
              <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    دسترسی به صفحات
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    {toPersianDigits(form.pagePermissions.length)} از {toPersianDigits(ALL_PAGES.length)} صفحه
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  صفحاتی که این پزشک اجازه مشاهده آن‌ها را دارد. مدیران همیشه دسترسی کامل دارند.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ALL_PAGES.map((p) => {
                    const checked = form.pagePermissions.includes(p.key);
                    return (
                      <label
                        key={p.key}
                        className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                          checked ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                        }`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => togglePerm(p.key)} />
                        <span>{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-xs cursor-pointer">حساب کاربری فعال</Label>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 ml-1 animate-spin" />}
              {editing ? "ذخیره تغییرات" : "ایجاد کاربر"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
