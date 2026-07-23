"use client";

import { Badge } from "@/components/ui/badge";
import { drugLabel, doseLabel } from "@/lib/options";
import type { Patient } from "@prisma/client";
import { toJalali } from "@/lib/persian";

type PatientForCard = Patient & {
  mdasScores?: { timePoint: string; totalScore: number | null }[];
  createdBy?: { fullName: string } | null;
};

export function PatientCard({
  patient,
  onOpen,
}: {
  patient: PatientForCard;
  onOpen?: (id: string) => void;
}) {
  const mdas = patient.mdasScores || [];
  const baseline = mdas.find((m) => m.timePoint === "BASELINE");
  const h24 = mdas.find((m) => m.timePoint === "H24");
  const h48 = mdas.find((m) => m.timePoint === "H48");

  const isOlanzapine = patient.drugType === "OLANZAPINE";

  return (
    <div
      onClick={() => onOpen?.(patient.id)}
      className="group bg-card border rounded-xl p-4 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted">
              {patient.code}
            </span>
            <Badge
              variant="outline"
              className={
                isOlanzapine
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px]"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]"
              }
            >
              {drugLabel(patient.drugType)}
            </Badge>
          </div>
          <p className="font-medium text-sm truncate mt-1.5">{patient.fullName}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            کد ملی: <span dir="ltr">{patient.nationalId}</span>
            {patient.department && <span className="mr-2">• {patient.department}</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        {[
          { label: "پایه", val: baseline?.totalScore },
          { label: "۲۴ ساعت", val: h24?.totalScore },
          { label: "۴۸ ساعت", val: h48?.totalScore },
        ].map((s) => (
          <div
            key={s.label}
            className="text-center rounded-lg bg-muted/50 py-2 px-1"
          >
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
            <p className="text-base font-bold tabular-nums mt-0.5">
              {typeof s.val === "number" ? s.val : "—"}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t text-[10px] text-muted-foreground">
        <span>{toJalali(patient.createdAt)}</span>
        {patient.createdBy && <span>توسط: {patient.createdBy.fullName}</span>}
      </div>
    </div>
  );
}
