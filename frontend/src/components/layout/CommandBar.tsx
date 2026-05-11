import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Kbd } from "../ui/Kbd";

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
  return (
    <div className="command-bar">
      <div className="command-bar-left">
        <nav className="breadcrumb">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={i} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                {i > 0 ? <span className="sep">/</span> : null}
                {isLast ? (
                  <span className="current">{c.label}</span>
                ) : c.to ? (
                  <Link to={c.to}>{c.label}</Link>
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
        <button type="button" className="command-search" tabIndex={0}>
          <span className="command-search-icon" aria-hidden>⌕</span>
          <span className="command-search-text">{searchPlaceholder}</span>
          <span className="command-search-hint">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      <div className="command-bar-right">
        {rightActions}
      </div>
    </div>
  );
}
