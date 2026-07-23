"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api-client";
import { LoginView } from "@/components/views/login-view";
import { AppShell } from "@/components/app-shell";
import { DashboardView } from "@/components/views/dashboard-view";
import { NewPatientView } from "@/components/views/new-patient-view";
import { SearchPatientView } from "@/components/views/search-patient-view";
import { PatientDetailView } from "@/components/views/patient-detail-view";
import { AllPatientsView } from "@/components/views/all-patients-view";
import { AnalyticsView } from "@/components/views/analytics-view";
import { ExportView } from "@/components/views/export-view";
import { UsersView } from "@/components/views/users-view";
import { GroupsView } from "@/components/views/groups-view";
import { AuditView } from "@/components/views/audit-view";
import { ProfileView } from "@/components/views/profile-view";
import { MdasItemsView } from "@/components/views/mdas-items-view";
import { FormItemsView } from "@/components/views/form-items-view";

export default function Page() {
  const { user, setUser, view } = useApp();

  useEffect(() => {
    api("/api/auth")
      .then((r: any) => { if (r?.user) setUser(r.user); })
      .catch(() => {});
  }, [setUser]);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    if (saved) {
      useApp.setState({ theme: saved });
      document.documentElement.classList.toggle("dark", saved === "dark");
    }
  }, []);

  if (!user) return <LoginView />;

  return (
    <AppShell>
      {view === "dashboard" && <DashboardView />}
      {view === "new-patient" && <NewPatientView />}
      {view === "search-patient" && <SearchPatientView />}
      {view === "patient-detail" && <PatientDetailView />}
      {view === "all-patients" && <AllPatientsView />}
      {view === "analytics" && <AnalyticsView />}
      {view === "export" && <ExportView />}
      {view === "users" && <UsersView />}
      {view === "groups" && <GroupsView />}
      {view === "audit" && <AuditView />}
      {view === "profile" && <ProfileView />}
      {view === "mdas-items" && <MdasItemsView />}
      {view === "form-items" && <FormItemsView />}
    </AppShell>
  );
}
