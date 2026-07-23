"use client";

import { useState, useMemo } from "react";
import {
  gregorianDateToJalali, jalaliMonthLength,
  getJalaliWeekday, formatJalali, parseJalali,
  PERSIAN_MONTHS, PERSIAN_WEEKDAYS,
} from "@/lib/jalali";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronRight, ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toPersianDigits, normalizeDigits } from "@/lib/persian";

type Props = {
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function JalaliDatePicker({ value, onChange, placeholder = "۱۴۰۴/۰۴/۲۵", className, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => gregorianDateToJalali(new Date()), []);
  const parsed = value ? parseJalali(value) : null;
  const [viewYear, setViewYear] = useState(parsed?.jy ?? today.jy);
  const [viewMonth, setViewMonth] = useState(parsed?.jm ?? today.jm);

  function handleTextChange(t: string) {
    const persianT = toPersianDigits(t);
    const p = parseJalali(normalizeDigits(t));
    if (p && p.jy >= 1300 && p.jy <= 1500 && p.jm >= 1 && p.jm <= 12 && p.jd >= 1 && p.jd <= 31) {
      onChange(formatJalali(p.jy, p.jm, p.jd));
    } else {
      onChange(persianT);
    }
  }

  function pick(jy: number, jm: number, jd: number) {
    onChange(formatJalali(jy, jm, jd));
    setOpen(false);
  }

  const monthLength = jalaliMonthLength(viewYear, viewMonth);
  const firstWeekday = getJalaliWeekday(viewYear, viewMonth, 1);

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }
  function prevYear() { setViewYear(viewYear - 1); }
  function nextYear() { setViewYear(viewYear + 1); }
  function goToToday() { setViewYear(today.jy); setViewMonth(today.jm); pick(today.jy, today.jm, today.jd); }
  function clear() { onChange(""); setOpen(false); }

  const days: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) days.push(null);
  for (let d = 1; d <= monthLength; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);

  const display = value ? toPersianDigits(value) : "";

  return (
    <div className="flex gap-1">
      <Input
        value={display}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder={placeholder}
        className={cn("font-mono text-left", className)}
        dir="ltr"
        disabled={disabled}
      />
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o && parsed) { setViewYear(parsed.jy); setViewMonth(parsed.jm); }
        }}
      >
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" disabled={disabled} className="shrink-0">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={prevYear} title="سال قبل">
                  <ChevronRight className="h-3.5 w-3.5" />
                  <ChevronRight className="h-3.5 w-3.5 -mr-2" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth} title="ماه قبل">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm font-semibold">
                {PERSIAN_MONTHS[viewMonth - 1]} {toPersianDigits(viewYear)}
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth} title="ماه بعد">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={nextYear} title="سال بعد">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <ChevronLeft className="h-3.5 w-3.5 -mr-2" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {PERSIAN_WEEKDAYS.map((w, i) => (
                <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((d, i) => {
                if (d === null) return <div key={i} />;
                const isSelected = parsed?.jy === viewYear && parsed?.jm === viewMonth && parsed?.jd === d;
                const isToday = today.jy === viewYear && today.jm === viewMonth && today.jd === d;
                const isWeekend = i % 7 === 6;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pick(viewYear, viewMonth, d)}
                    className={cn(
                      "h-8 w-8 rounded-md text-xs font-medium transition-colors",
                      isSelected && "bg-primary text-primary-foreground",
                      !isSelected && isToday && "ring-1 ring-primary text-primary",
                      !isSelected && isWeekend && "text-rose-600 dark:text-rose-400",
                      !isSelected && !isToday && !isWeekend && "hover:bg-accent"
                    )}
                  >
                    {toPersianDigits(d)}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t">
              <Button type="button" variant="ghost" size="sm" onClick={clear} className="text-xs h-7">
                <X className="h-3 w-3 ml-1" />پاک کردن
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={goToToday} className="text-xs h-7">
                امروز
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
