"use client";

import { create } from "zustand";

export type AppView =
  | "dashboard"
  | "new-patient"
  | "search-patient"
  | "all-patients"
  | "patient-detail"
  | "analytics"
  | "export"
  | "users"
  | "groups"
  | "audit"
  | "profile"
  | "mdas-items"
  | "form-items";

type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: "ADMIN" | "DOCTOR";
  pagePermissions?: string[];
};

type AppState = {
  user: SessionUser | null;
  setUser: (u: SessionUser | null) => void;
  view: AppView;
  setView: (v: AppView) => void;
  activePatientId: string | null;
  setActivePatient: (id: string | null) => void;
  refreshKey: number;
  bumpRefresh: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
};

export const useApp = create<AppState>((set, get) => ({
  user: null,
  setUser: (u) => set({ user: u }),
  view: "dashboard",
  setView: (v) => set({ view: v }),
  activePatientId: null,
  setActivePatient: (id) => set({ activePatientId: id, view: id ? "patient-detail" : get().view }),
  refreshKey: 0,
  bumpRefresh: () => set({ refreshKey: get().refreshKey + 1 }),
  theme: "light",
  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("theme", next);
    }
    set({ theme: next });
  },
}));

// Helper exported for components to check page access
export function canAccess(user: SessionUser | null, view: string): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (!user.pagePermissions || user.pagePermissions.length === 0) return false;
  return user.pagePermissions.includes(view);
}
