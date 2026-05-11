import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * shadcn-style Card components, themed against the Makor design system's
 * .panel CSS classes (panel / panel-research / panel-header / panel-body / panel-footer).
 *
 * Use Card for any data widget. Use `variant="research"` for editorial /
 * reading panels (briefing detail, hero copy).
 */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "research";
  highlight?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", highlight = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "panel",
        variant === "research" && "panel-research",
        highlight && "panel-highlight",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  premium?: boolean;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, eyebrow, title, actions, premium = false, children, ...props }, ref) => {
    if (eyebrow !== undefined || title !== undefined || actions !== undefined) {
      return (
        <div
          ref={ref}
          className={cn("panel-header", premium && "panel-header-prem", className)}
          {...props}
        >
          <div className="panel-header-title">
            {eyebrow !== undefined ? <span className="eyebrow">{eyebrow}</span> : null}
            {title !== undefined ? <span className="heading-4">{title}</span> : null}
          </div>
          {actions !== undefined ? <div className="panel-header-actions">{actions}</div> : null}
        </div>
      );
    }
    return (
      <div
        ref={ref}
        className={cn("panel-header", premium && "panel-header-prem", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
CardHeader.displayName = "CardHeader";

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  density?: "default" | "premium" | "editorial" | "flush";
}

const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, density = "default", ...props }, ref) => {
    if (density === "flush") {
      return <div ref={ref} className={cn("panel-flush", className)} {...props} />;
    }
    return (
      <div
        ref={ref}
        className={cn(
          "panel-body",
          density === "premium" && "panel-body-prem",
          density === "editorial" && "panel-body-edit",
          className,
        )}
        {...props}
      />
    );
  },
);
CardBody.displayName = "CardBody";

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  left?: React.ReactNode;
  right?: React.ReactNode;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, left, right, children, ...props }, ref) => {
    if (children) {
      return <div ref={ref} className={cn("panel-footer", className)} {...props}>{children}</div>;
    }
    return (
      <div ref={ref} className={cn("panel-footer", className)} {...props}>
        <span>{left}</span>
        <span>{right}</span>
      </div>
    );
  },
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardBody, CardFooter };
