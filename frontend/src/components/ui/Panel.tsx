import { type HTMLAttributes, type ReactNode } from "react";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "research";
  highlight?: boolean;
  children: ReactNode;
}

export function Panel({
  variant = "default",
  highlight = false,
  className,
  children,
  ...rest
}: PanelProps) {
  const classes = [
    "panel",
    variant === "research" ? "panel-research" : "",
    highlight ? "panel-highlight" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

interface PanelHeaderProps {
  eyebrow: ReactNode;
  title: ReactNode;
  actions?: ReactNode;
  premium?: boolean;
}

export function PanelHeader({ eyebrow, title, actions, premium = false }: PanelHeaderProps) {
  return (
    <div className={`panel-header ${premium ? "panel-header-prem" : ""}`}>
      <div className="panel-header-title">
        <span className="eyebrow">{eyebrow}</span>
        <span className="heading-4">{title}</span>
      </div>
      {actions ? <div className="panel-header-actions">{actions}</div> : null}
    </div>
  );
}

interface PanelBodyProps extends HTMLAttributes<HTMLDivElement> {
  density?: "default" | "premium" | "editorial" | "flush";
  children: ReactNode;
}

export function PanelBody({ density = "default", className, children, ...rest }: PanelBodyProps) {
  const densityClass =
    density === "premium"
      ? "panel-body-prem"
      : density === "editorial"
        ? "panel-body-edit"
        : density === "flush"
          ? ""
          : "";
  const flush = density === "flush";
  if (flush) {
    return (
      <div className={`panel-flush ${className ?? ""}`} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <div className={`panel-body ${densityClass} ${className ?? ""}`.trim()} {...rest}>
      {children}
    </div>
  );
}

interface PanelFooterProps {
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
}

export function PanelFooter({ left, right, children }: PanelFooterProps) {
  if (children) return <div className="panel-footer">{children}</div>;
  return (
    <div className="panel-footer">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}
