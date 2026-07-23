"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string; color?: string };

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "انتخاب کنید",
  className,
  pillTone = "default",
}: {
  options: Option[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  className?: string;
  pillTone?: "default" | "primary" | "amber" | "emerald" | "rose";
}) {
  const [open, setOpen] = useState(false);

  function toggle(v: string) {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }
  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange([]);
  }

  const selectedLabels = options.filter((o) => value.includes(o.value));
  const toneClasses = {
    default: "bg-muted text-foreground hover:bg-muted/80",
    primary: "bg-primary/15 text-primary hover:bg-primary/20",
    amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20",
    emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20",
    rose: "bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20",
  }[pillTone];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1 h-9 px-3 rounded-full border text-xs font-medium transition-colors",
            "border-border bg-background hover:bg-accent",
            value.length > 0 && "border-primary/40 bg-primary/5",
            className
          )}
        >
          {selectedLabels.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <>
              <span className="flex items-center gap-1 flex-wrap">
                {selectedLabels.slice(0, 2).map((o) => (
                  <span key={o.value} className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-medium", toneClasses)}>
                    {o.label}
                  </span>
                ))}
                {selectedLabels.length > 2 && (
                  <span className="text-[10px] text-muted-foreground">+{selectedLabels.length - 2}</span>
                )}
              </span>
              <X className="h-3 w-3 ml-1 text-muted-foreground hover:text-foreground" onClick={clear} />
            </>
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground mr-1" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <div className="max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-4">موردی موجود نیست</div>
          ) : (
            options.map((o) => {
              const checked = value.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className="w-full flex items-center gap-2 p-2 rounded-md text-xs hover:bg-accent transition-colors text-right"
                >
                  <div className={cn(
                    "flex items-center justify-center w-4 h-4 rounded border shrink-0",
                    checked ? "bg-primary border-primary text-primary-foreground" : "border-input"
                  )}>
                    {checked && <Check className="h-3 w-3" />}
                  </div>
                  <span className="flex-1 truncate">{o.label}</span>
                </button>
              );
            })
          )}
        </div>
        {value.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full mt-1 text-xs h-7"
            onClick={() => { onChange([]); setOpen(false); }}
          >
            پاک کردن همه
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
