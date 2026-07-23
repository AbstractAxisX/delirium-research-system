import * as React from "react"

import { cn } from "@/lib/utils"

// Convert Persian/Arabic digits to English digits in a string
function normalizeDigits(s: string): string {
  if (!s) return s;
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  let out = s;
  for (let i = 0; i < 10; i++) {
    out = out.replaceAll(persian[i], String(i)).replaceAll(arabic[i], String(i));
  }
  return out;
}

function Textarea({ className, onChange, ...props }: React.ComponentProps<"textarea">) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const normalized = normalizeDigits(e.target.value);
    if (normalized !== e.target.value) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      nativeInputValueSetter?.call(e.target, normalized);
    }
    onChange?.(e);
  };

  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      onChange={handleChange}
      {...props}
    />
  )
}

export { Textarea }
