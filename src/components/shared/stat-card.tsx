"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
};

const TONES: Record<string, string> = {
  default: "border-border",
  primary: "border-primary/30 bg-primary/5",
  success: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  danger: "border-rose-500/30 bg-rose-500/5",
};

const ICON_TONES: Record<string, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/15 text-primary",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  danger: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  className,
  tone = "default",
}: StatCardProps) {
  return (
    <Card className={cn("border shadow-sm hover:shadow-md transition-shadow", TONES[tone], className)}>
      <CardContent className="p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {title}
            </p>
            <p className="text-2xl lg:text-3xl font-bold tabular-nums leading-none">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl shrink-0", ICON_TONES[tone])}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
