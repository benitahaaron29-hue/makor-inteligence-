import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Status / risk pill. Combines the Makor design system's `.status-pill`
 * and risk-tone classes into a shadcn-style Badge with variants.
 */

const badgeVariants = cva("status-pill", {
  variants: {
    variant: {
      default: "",
      published: "status-pill-published",
      draft: "status-pill-draft",
      archived: "status-pill-archived",
      failed: "status-pill-failed",
      alert: "status-pill-alert",
      "risk-on": "risk-on",
      "risk-off": "risk-off",
      "risk-mixed": "risk-mixed",
      "risk-neutral": "risk-neutral",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
