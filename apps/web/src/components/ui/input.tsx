import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, onFocus, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex min-h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:min-h-9 md:py-1 md:text-sm",
          className,
        )}
        ref={ref}
        onFocus={(e) => {
          onFocus?.(e);
          if (typeof window === "undefined" || window.innerWidth >= 768) return;
          window.setTimeout(() => {
            e.target.scrollIntoView({ block: "center", behavior: "smooth" });
          }, 350);
        }}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
