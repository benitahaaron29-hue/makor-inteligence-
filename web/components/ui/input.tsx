import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, mono = false, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn("input", mono && "input-mono", className)}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
