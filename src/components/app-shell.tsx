"use client";

import { useApp, canAccess, type AppView } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, UserPlus, Search, Users, BarChart3, Download,
  Shield, LogOut, Sun, Moon, Activity, Menu, X, ScrollText,
  UserCircle, Group, ClipboardList,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

type NavItem = { view: AppView; label: string; icon: ReactNode; adminOnly?: boolean };

const ALL_NAV_ITEMS: NavItem[] = [
  { view: "dashboard", label: "داشبورد", icon: <LayoutDashboard className="h-4 w-4" /> },
  { view: "new-patient", label: "ثبت بیمار جدید", icon: <UserPlus className="h-4 w-4" /> },
  { view: "search-patient", label: "جستجوی بیمار", icon: <Search className="h-4 w-4" /> },
  { view: "all-patients", label: "همه بیماران", icon: <Users className="h-4 w-4" /> },
  { view: "analytics", label: "تحلیل داده‌ها", icon: <BarChart3 className="h-4 w-4" /> },
  { view: "export", label: "خروجی داده", icon: <Download className="h-4 w-4" /> },
  { view: "form-items", label: "مدیریت سؤالات", icon: <ClipboardList className="h-4 w-4" />, adminOnly: true },
  { view: "users", label: "مدیریت کاربران", icon: <Shield className="h-4 w-4" />, adminOnly: true },
  { view: "groups", label: "گروه‌های پزشکان", icon: <Group className="h-4 w-4" />, adminOnly: true },
  { view: "audit", label: "لاگ تغییرات", icon: <ScrollText className="h-4 w-4" />, adminOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, setUser, view, setView, theme, toggleTheme, setActivePatient } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;
  const items = ALL_NAV_ITEMS.filter((i) => {
    if (i.adminOnly) return user.role === "ADMIN";
    return canAccess(user, i.view);
  });

  async function logout() {
    try {
      await api("/api/auth", { method: "DELETE" });
      setUser(null);
      toast.success("خارج شدید");
    } catch { toast.error("خروج ناموفق بود"); }
  }

  function handleNav(v: AppView) {
    setActivePatient(null);
    setView(v);
    setMobileOpen(false);
  }

  const fallbackView = items[0]?.view || "profile";
  const effectiveView = items.some((i) => i.view === view) || view === "profile" ? view : fallbackView;

  const initials = user.fullName.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("");

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="sticky top-0 z-40 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between h-14 px-3 lg:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
                <Activity className="h-4.5 w-4.5" />
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold leading-tight">پژوهش دلیریوم</p>
                <p className="text-[10px] text-muted-foreground leading-tight">MDAS · اولانزاپین vs هالوپریدول</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={toggleTheme} title="تغییر تم" className="h-9 w-9">
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2 h-9">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
                      {initials || "؟"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-xs font-medium leading-tight">{user.fullName}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {user.role === "ADMIN" ? "مدیر" : "پزشک"}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs">
                  <p className="font-medium">{user.fullName}</p>
                  <p className="text-muted-foreground">@{user.username}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleNav("profile")}>
                  <UserCircle className="h-4 w-4 ml-2" />
                  پروفایل من
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 ml-2" />
                  خروج از سامانه
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="hidden lg:flex w-60 flex-col border-l bg-background sticky top-14 h-[calc(100vh-3.5rem)]">
          <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.view}
                onClick={() => handleNav(item.view)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  effectiveView === item.view
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                    : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                }`}
              >
                {item.icon}
                <span className="text-[13px]">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-3 border-t">
            <div className="text-[10px] text-muted-foreground text-center">سامانه پژوهش دلیریوم</div>
          </div>
        </aside>

        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setMobileOpen(false)}>
            <aside
              className="absolute right-0 top-0 bottom-0 w-72 bg-background shadow-xl p-3 space-y-1 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 px-3 py-3 mb-2 border-b">
                <Activity className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">منو</span>
              </div>
              {items.map((item) => (
                <button
                  key={item.view}
                  onClick={() => handleNav(item.view)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    effectiveView === item.view ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          <div className="container mx-auto p-3 lg:p-6 max-w-7xl">{children}</div>
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t">
        <div className="grid grid-cols-5 h-16">
          {([
            { view: "dashboard" as AppView, icon: LayoutDashboard, label: "خانه", perm: canAccess(user, "dashboard") },
            { view: "new-patient" as AppView, icon: UserPlus, label: "ثبت", perm: canAccess(user, "new-patient") },
            { view: "search-patient" as AppView, icon: Search, label: "جستجو", perm: canAccess(user, "search-patient") },
            { view: "all-patients" as AppView, icon: Users, label: "بیماران", perm: canAccess(user, "all-patients") },
            { view: "analytics" as AppView, icon: BarChart3, label: "تحلیل", perm: canAccess(user, "analytics") },
          ]).filter((it) => it.perm).slice(0, 5).map((it) => {
            const Icon = it.icon;
            const active = effectiveView === it.view || (it.view === "search-patient" && effectiveView === "patient-detail");
            return (
              <button
                key={it.view}
                onClick={() => handleNav(it.view)}
                className={`flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                {it.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
