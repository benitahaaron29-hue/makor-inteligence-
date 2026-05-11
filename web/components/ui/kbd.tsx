import * as React from "react";
import { cn } from "@/lib/utils";

const Kbd = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn("kbd", className)} {...props} />
  ),
);
Kbd.displayName = "Kbd";

export { Kbd };
