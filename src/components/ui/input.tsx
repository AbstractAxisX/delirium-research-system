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

function Input({ className, type, onChange, ...props }: React.ComponentProps<"input">) {
  // Skip digit normalization for password fields (login) and file inputs
  const shouldNormalize = type !== "password" && type !== "file";

  const handleChange = shouldNormalize
    ? (e: React.ChangeEvent<HTMLInputElement>) => {
        // Normalize digits in the input value
        const normalized = normalizeDigits(e.target.value);
        if (normalized !== e.target.value) {
          e.target.value = normalized;
          // Trigger React's synthetic event update
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;
          nativeInputValueSetter?.call(e.target, normalized);
        }
        onChange?.(e);
      }
    : onChange;

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      onChange={handleChange}
      {...props}
    />
  )
}

export { Input }
