"use client";

import { useTransition, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { generateBriefingAction } from "@/app/actions";

interface GenerateButtonProps {
  variant?: "default" | "primary";
  size?: "default" | "sm" | "lg";
  label?: string;
}

export function GenerateButton({
  variant = "default",
  size = "default",
  label = "Generate",
}: GenerateButtonProps) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const handle = () => {
    setErr(null);
    startTransition(async () => {
      const res = await generateBriefingAction();
      if (!res.ok) setErr(res.error);
    });
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {err ? (
        <span className="caption" style={{ color: "var(--offer)" }}>
          {err}
        </span>
      ) : null}
      <Button variant={variant} size={size} onClick={handle} disabled={pending} type="button">
        <Sparkles size={12} aria-hidden style={{ marginRight: 4 }} />
        {pending ? "Generating…" : label}
        {variant === "default" ? <Kbd>G</Kbd> : null}
      </Button>
    </div>
  );
}
