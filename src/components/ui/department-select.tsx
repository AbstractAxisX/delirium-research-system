"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Settings2, Trash2, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";

type Dept = { id: string; name: string; sortOrder: number; active: boolean };

export function DepartmentSelect({
  value,
  onChange,
  placeholder = "انتخاب بخش",
  className,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { user } = useApp();
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManage, setShowManage] = useState(false);
  const [newName, setNewName] = useState("");

  async function load() {
    try {
      // For admin: load all (including inactive) so they can manage
      const r: any = await api("/api/departments");
      setDepartments(r.departments || []);
    } catch {
      /* ignore */
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function addDept() {
    if (!newName.trim()) return;
    try {
      // The API will reactivate if name exists but inactive
      await api("/api/departments", { method: "POST", body: JSON.stringify({ name: newName.trim() }) });
      toast.success("بخش اضافه/فعال شد");
      setNewName("");
      await load();
    } catch (e: any) { toast.error(e.message || "خطا"); }
  }

  async function toggleActive(d: Dept) {
    try {
      await api(`/api/departments/${d.id}`, { method: "PATCH", body: JSON.stringify({ active: !d.active }) });
      await load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function removeDept(d: Dept) {
    if (!confirm(`حذف بخش «${d.name}»؟`)) return;
    try {
      await api(`/api/departments/${d.id}`, { method: "DELETE" });
      toast.success("بخش حذف شد");
      await load();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className={`flex gap-1 ${className || ""}`}>
      <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
        <SelectTrigger className="flex-1"><SelectValue placeholder={loading ? "در حال بارگذاری..." : placeholder} /></SelectTrigger>
        <SelectContent>
          {departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
          {departments.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">هنوز بخشی تعریف نشده</div>}
        </SelectContent>
      </Select>
      {user?.role === "ADMIN" && (
        <Button type="button" variant="outline" size="icon" onClick={() => setShowManage(true)} disabled={disabled} title="مدیریت بخش‌ها">
          <Settings2 className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={showManage} onOpenChange={setShowManage}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              مدیریت بخش‌های بستری
            </DialogTitle>
            <DialogDescription>
              بخش‌های بیمارستان را اینجا تعریف کنید. این فهرست در همه فرم‌های بیمار استفاده می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="نام بخش جدید (مثلاً: بخش قلب)" onKeyDown={(e) => { if (e.key === "Enter") addDept(); }} />
              <Button onClick={addDept} className="gap-1.5 shrink-0"><Plus className="h-4 w-4" />افزودن</Button>
            </div>
            <div className="border rounded-lg max-h-80 overflow-y-auto">
              {departments.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">هنوز بخشی تعریف نشده</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right text-xs">نام بخش</TableHead>
                      <TableHead className="text-center text-xs">فعال</TableHead>
                      <TableHead className="text-right text-xs">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium text-sm">{d.name}</TableCell>
                        <TableCell className="text-center"><Switch checked={d.active} onCheckedChange={() => toggleActive(d)} /></TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeDept(d)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
