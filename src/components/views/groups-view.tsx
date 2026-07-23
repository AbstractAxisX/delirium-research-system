"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Group as GroupIcon, Plus, Pencil, Trash2, Loader2, Users, UserCircle } from "lucide-react";
import { toJalali, toPersianDigits } from "@/lib/persian";
import { toast } from "sonner";

const COLORS = ["#0d9488", "#0891b2", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#ca8a04", "#dc2626"];

export function GroupsView() {
  const { user, refreshKey } = useApp();
  const [groups, setGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: COLORS[0] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    Promise.all([api("/api/groups"), api("/api/users")])
      .then(([g, u]: any) => {
        setGroups(g.groups || []);
        setUsers(u.users || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshKey, user]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", description: "", color: COLORS[0] });
    setShowForm(true);
  }
  function openEdit(g: any) {
    setEditing(g);
    setForm({ name: g.name, description: g.description || "", color: g.color });
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error("نام گروه الزامی است"); return; }
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/groups/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
        toast.success("گروه ویرایش شد");
      } else {
        await api("/api/groups", { method: "POST", body: JSON.stringify(form) });
        toast.success("گروه ایجاد شد");
      }
      setShowForm(false);
      const r: any = await api("/api/groups");
      setGroups(r.groups || []);
    } catch (e: any) {
      toast.error(e.message || "خطا");
    } finally {
      setSaving(false);
    }
  }

  async function remove(g: any) {
    if (!confirm(`حذف گروه «${g.name}»؟ کاربران و بیماران این گروه به حالت بدون گروه درمی‌آیند.`)) return;
    try {
      await api(`/api/groups/${g.id}`, { method: "DELETE" });
      toast.success("گروه حذف شد");
      const r: any = await api("/api/groups");
      setGroups(r.groups || []);
    } catch (e: any) {
      toast.error(e.message || "خطا");
    }
  }

  if (user?.role !== "ADMIN") {
    return <div className="text-center py-12 text-muted-foreground">دسترسی فقط برای مدیر</div>;
  }
  if (loading) return <div className="grid place-items-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GroupIcon className="h-6 w-6 text-primary" />
            گروه‌های پزشکان
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ایجاد گروه‌های پزشکی برای دسته‌بندی بیماران (مثلاً بخش‌ها، شیفت‌ها، تیم‌ها)
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          گروه جدید
        </Button>
      </div>

      {/* Group cards */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <GroupIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">هنوز گروهی ساخته نشده</p>
            <p className="text-xs text-muted-foreground">با ساختن گروه می‌توانید پزشکان و بیماران را دسته‌بندی کنید</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map((g) => {
            const members = users.filter((u) => u.groupId === g.id);
            return (
              <Card key={g.id} className="overflow-hidden">
                <div className="h-1.5" style={{ background: g.color }} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0" style={{ background: `${g.color}20`, color: g.color }}>
                        <GroupIcon className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{g.name}</h3>
                        <p className="text-[10px] text-muted-foreground">{toJalali(g.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(g)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(g)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {g.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{g.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">پزشکان</p>
                      <p className="text-lg font-bold tabular-nums">{toPersianDigits(members.length)}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">بیماران</p>
                      <p className="text-lg font-bold tabular-nums">{toPersianDigits(g._count?.patients || 0)}</p>
                    </div>
                  </div>
                  {members.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-[10px] text-muted-foreground mb-1.5">اعضای گروه:</p>
                      <div className="flex flex-wrap gap-1">
                        {members.slice(0, 5).map((m) => (
                          <Badge key={m.id} variant="outline" className="text-[10px] gap-1">
                            <UserCircle className="h-2.5 w-2.5" />
                            {m.fullName}
                          </Badge>
                        ))}
                        {members.length > 5 && (
                          <Badge variant="outline" className="text-[10px]">+{toPersianDigits(members.length - 5)}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GroupIcon className="h-5 w-5 text-primary" />
              {editing ? "ویرایش گروه" : "ایجاد گروه جدید"}
            </DialogTitle>
            <DialogDescription>
              گروه‌ها برای دسته‌بندی پزشکان و بیماران استفاده می‌شوند
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">نام گروه *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثلاً: بخش ICU - شیفت صبح" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">توضیحات (اختیاری)</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="توضیح کوتاه درباره این گروه" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">رنگ گروه</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      form.color === c ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 ml-1 animate-spin" />}
              {editing ? "ذخیره" : "ایجاد گروه"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
