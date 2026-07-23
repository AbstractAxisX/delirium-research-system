"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Loader2, Lock, User as UserIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function LoginView() {
  const { setUser } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api("/api/auth")
      .then((r: any) => {
        if (r?.user) setUser(r.user);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [setUser]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast.error("نام کاربری و رمز عبور را وارد کنید");
      return;
    }
    setLoading(true);
    try {
      const r: any = await api("/api/auth", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setUser(r.user);
      toast.success(`خوش آمدید، ${r.user.fullName}`);
    } catch (e: any) {
      toast.error(e.message || "ورود ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-emerald-700 text-primary-foreground">
        {/* Decorative shapes */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="absolute top-1/2 right-1/3 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        </div>
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative flex flex-col justify-between p-12 lg:p-16 w-full">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-lg leading-tight">سامانه پژوهش دلیریوم</p>
              <p className="text-xs text-primary-foreground/70 leading-tight">Delirium Research System</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
              مطالعه بالینی مقایسه<br />
              اولانزاپین و هالوپریدول
            </h2>
            <p className="text-base text-primary-foreground/80 leading-relaxed max-w-md">
              سامانه یکپارچه ثبت داده‌های کارآزمایی بالینی با مقیاس ارزیابی MDAS، تحلیل آماری پیشرفته و گزارش‌گیری حرفه‌ای
            </p>

            <div className="grid grid-cols-3 gap-4 pt-4 max-w-md">
              <FeatureStat icon="users" value="MDAS" label="مقیاس ارزیابی" />
              <FeatureStat icon="chart" value="BI" label="تحلیل هوشمند" />
              <FeatureStat icon="shield" value="JWT" label="امنیت سراسری" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-primary-foreground/60">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>تمام ارتباطات رمزنگاری‌شده • اطلاعات شما محفوظ است</span>
          </div>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/30 p-4 sm:p-8 relative">
        {/* Mobile decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <Activity className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">سامانه پژوهش دلیریوم</h1>
              <p className="text-xs text-muted-foreground mt-0.5">مطالعه مقایسه‌ای اولانزاپین و هالوپریدول</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">ورود به سامانه</h2>
            <p className="text-sm text-muted-foreground">
              برای ادامه، نام کاربری و رمز عبور خود را وارد کنید
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-medium">
                نام کاربری
              </Label>
              <div className="relative group">
                <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="username"
                  className="pr-9 h-11 bg-background border-border focus:border-primary"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  dir="ltr"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium">
                رمز عبور
              </Label>
              <div className="relative group">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="password"
                  type="password"
                  className="pr-9 h-11 bg-background border-border focus:border-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  dir="ltr"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  در حال ورود...
                </>
              ) : (
                "ورود به سامانه"
              )}
            </Button>
          </form>

          <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>ورود فقط برای کاربران تعریف‌شده توسط مدیر سامانه</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureStat({ icon, value, label }: { icon: "users" | "chart" | "shield"; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 border border-white/10">
      <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
      <p className="text-[10px] text-primary-foreground/70 leading-tight mt-0.5">{label}</p>
    </div>
  );
}
