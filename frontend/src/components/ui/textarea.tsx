import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-2xl border border-line bg-cream-soft/60 px-5 py-4 text-base text-ink placeholder:text-ink-soft/70 leading-relaxed",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-white",
          "transition-colors duration-200 resize-none",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
