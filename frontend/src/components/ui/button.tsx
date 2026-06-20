import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-heading font-semibold transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-dark shadow-soft",
        secondary:
          "bg-white text-primary border border-primary/30 hover:bg-primary-light",
        ghost: "bg-transparent text-ink-soft hover:bg-cream-soft",
        outline: "bg-transparent text-ink border border-line hover:bg-cream-soft",
      },
      size: {
        sm: "h-9 px-4 text-sm rounded-full",
        md: "h-12 px-6 text-base rounded-full",
        lg: "h-14 px-8 text-lg rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
