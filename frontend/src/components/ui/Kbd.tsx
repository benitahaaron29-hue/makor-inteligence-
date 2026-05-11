import type { ReactNode } from "react";

interface KbdProps {
  children: ReactNode;
}

export function Kbd({ children }: KbdProps) {
  return <span className="kbd">{children}</span>;
}

interface KbdShortcutProps {
  keys: string[];
  separator?: string;
}

export function KbdShortcut({ keys, separator = "" }: KbdShortcutProps) {
  return (
    <span style={{ display: "inline-flex", gap: separator ? 4 : 2, alignItems: "center" }}>
      {keys.map((k, i) => (
        <span key={`${k}-${i}`} style={{ display: "inline-flex", gap: 4 }}>
          {i > 0 && separator ? <span className="caption">{separator}</span> : null}
          <Kbd>{k}</Kbd>
        </span>
      ))}
    </span>
  );
}
