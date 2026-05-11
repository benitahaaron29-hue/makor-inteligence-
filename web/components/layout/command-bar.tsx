"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { MakorLogo } from "@/components/ui/makor-logo";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: ReactNode;
  to?: string;
}

interface CommandBarProps {
  crumbs: Crumb[];
  leftExtras?: ReactNode;
  rightActions?: ReactNode;
  searchPlaceholder?: string;
}

export function CommandBar({
  crumbs,
  leftExtras,
  rightActions,
  searchPlaceholder = "Search briefings, tickers, themes, events…",
}: CommandBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const m = /(\d{4}-\d{2}-\d{2})/.exec(query);
    if (m) {
      router.push(`/briefings/${m[1]}`);
    } else {
      router.push(`/archive?q=${encodeURIComponent(query.trim())}`);
    }
    setSearchOpen(false);
    setQuery("");
  };

  return (
    <div className="command-bar">
      <div className="command-bar-left">
        <span className="command-bar-brand" aria-label="Makor Intelligence">
          <MakorLogo height={22} tone="light" alt="Makor Securities" />
        </span>
        <span className="command-bar-mark-divider" aria-hidden />
        <nav className="breadcrumb">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={i} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                {i > 0 ? <span className="sep">/</span> : null}
                {isLast ? (
                  <span className="current">{c.label}</span>
                ) : c.to ? (
                  <Link href={c.to}>{c.label}</Link>
                ) : (
                  <span>{c.label}</span>
                )}
              </span>
            );
          })}
        </nav>
        {leftExtras ? (
          <>
            <span className="divider-v" style={{ height: 18 }} />
            {leftExtras}
          </>
        ) : null}
      </div>

      <div className="command-bar-center">
        {searchOpen ? (
          <form onSubmit={onSearchSubmit} className="command-search" style={{ paddingRight: 8 }}>
            <Search size={14} className="command-search-icon" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => { if (!query) setSearchOpen(false); }}
              placeholder={searchPlaceholder}
              style={{
                flex: 1,
                background: "transparent",
                border: 0,
                outline: 0,
                color: "var(--text-primary)",
                fontSize: "var(--text-body-sm-size)",
                fontFamily: "inherit",
              }}
            />
            <span className="command-search-hint">
              <Kbd>↵</Kbd>
            </span>
          </form>
        ) : (
          <button
            type="button"
            className={cn("command-search")}
            onClick={() => setSearchOpen(true)}
            aria-label="Open search"
          >
            <Search size={14} className="command-search-icon" aria-hidden />
            <span className="command-search-text">{searchPlaceholder}</span>
            <span className="command-search-hint">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
        )}
      </div>

      <div className="command-bar-right">{rightActions}</div>
    </div>
  );
}
