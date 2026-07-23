"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PatientCard } from "@/components/shared/patient-card";
import { Search, Loader2, SearchX, UserSearch } from "lucide-react";
import { toast } from "sonner";
import { normalizeDigits } from "@/lib/persian";

export function SearchPatientView() {
  const { setActivePatient, user } = useApp();
  const [nationalId, setNationalId] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    const q = nationalId.trim();
    if (!q) {
      toast.error("کد ملی یا عبارت جستجو را وارد کنید");
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      const normalized = normalizeDigits(q);
      const isNationalId = /^\d{8,10}$/.test(normalized);
      const r: any = await api(
        `/api/patients/search?${isNationalId ? `nationalId=${encodeURIComponent(normalized)}` : `q=${encodeURIComponent(q)}`}`
      );
      setResults(r.patients || []);
      if (r.patients?.length === 0) {
        toast.warning("بیماری با این مشخصات یافت نشد");
      }
    } catch (e: any) {
      toast.error(e.message || "خطا در جستجو");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">جستجوی بیمار</h1>
        <p className="text-sm text-muted-foreground mt-1">
          برای تکمیل پرونده بیمار قبلی، کد ملی وی را وارد کنید تا فرم باز شود
        </p>
      </div>

      <Card>
        <CardContent className="p-4 lg:p-6">
          <form onSubmit={search} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="کد ملی بیمار (۱۰ رقم) یا نام / کد بیمار..."
                  className="pr-9 h-12 text-base font-mono"
                  dir="ltr"
                  autoFocus
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-8" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 ml-2" />
                )}
                جستجو
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {user?.role === "ADMIN"
                ? "به‌عنوان مدیر، به تمام بیماران دسترسی دارید."
                : "برای دسترسی به پرونده بیمار، کد ملی وی را وارد کنید. این روش امکان تکمیل نمرات ۲۴ و ۴۸ ساعت توسط پزشک دیگر را فراهم می‌کند."}
            </p>
          </form>
        </CardContent>
      </Card>

      {loading && (
        <div className="grid place-items-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mb-2" />
          در حال جستجو...
        </div>
      )}

      {!loading && results !== null && (
        <Card>
          <CardContent className="p-4 lg:p-6">
            {results.length === 0 ? (
              <div className="text-center py-12">
                <SearchX className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">هیچ بیماری یافت نشد</p>
                <p className="text-xs text-muted-foreground mt-1">از کد ملی صحیح استفاده کنید یا ثبت بیمار جدید را انتخاب نمایید</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <UserSearch className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {results.length} بیمار یافت شد
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((p) => (
                    <PatientCard key={p.id} patient={p} onOpen={(id) => setActivePatient(id)} />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
