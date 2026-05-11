interface SparklineProps {
  points: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
}

export function Sparkline({
  points,
  color = "currentColor",
  width = 72,
  height = 16,
  strokeWidth = 1.25,
}: SparklineProps) {
  if (points.length < 2) {
    return (
      <span className="sparkline" style={{ color }}>
        <svg width={width} height={height} aria-hidden="true" />
      </span>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);

  const pathPoints = points
    .map((p, i) => `${(i * step).toFixed(2)},${(height - ((p - min) / span) * height).toFixed(2)}`)
    .join(" ");

  return (
    <span className="sparkline" style={{ color }}>
      <svg width={width} height={height} aria-hidden="true">
        <polyline
          points={pathPoints}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/**
 * Pick a series color from a direction or a numeric value.
 * Resolves to a CSS variable so it harmonises with the token palette.
 */
export function sparkColor(direction: "pos" | "neg" | "neu"): string {
  if (direction === "pos") return "var(--bid)";
  if (direction === "neg") return "var(--offer)";
  return "var(--neutral)";
}
