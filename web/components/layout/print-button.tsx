"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintButtonProps {
  label?: string;
  size?: "default" | "sm" | "lg";
}

export function PrintButton({ label = "Print", size = "sm" }: PrintButtonProps) {
  const handle = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };
  return (
    <Button size={size} onClick={handle} type="button">
      <Printer size={12} aria-hidden style={{ marginRight: 4 }} />
      {label}
    </Button>
  );
}
