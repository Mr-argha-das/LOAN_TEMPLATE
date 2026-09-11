/**
 * Recreation of the Cholamandalam "four flame" brand mark plus the
 * "Chola / Enter a better life" wordmark, drawn as inline SVG so no
 * external asset is required.
 *
 * The mark is a pinwheel: one petal (three tapering strokes curving out of the
 * centre) repeated at 90° steps — red on one diagonal, blue on the other.
 */
const PETAL_STROKES = [
  { d: "M50 50 C43 42 36 34 24 22", width: 7 },
  { d: "M50 50 C41 45 32 40 18 33", width: 6 },
  { d: "M50 50 C45 41 40 32 33 17", width: 6 },
];

export function CholaFlameMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Chola logo">
      {[0, 90, 180, 270].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 50 50)`}>
          {PETAL_STROKES.map((stroke) => (
            <path
              key={stroke.d}
              d={stroke.d}
              fill="none"
              strokeLinecap="round"
              strokeWidth={stroke.width}
              stroke={angle % 180 === 0 ? "var(--chola-red)" : "var(--chola-blue)"}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function CholaLogo({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <CholaFlameMark className={compact ? "h-8 w-8" : "h-10 w-10 sm:h-11 sm:w-11"} />
      <span className="leading-none">
        <span
          className={`block font-serif font-bold tracking-tight text-foreground ${
            compact ? "text-xl" : "text-2xl sm:text-[28px]"
          }`}
        >
          Chola
        </span>
        <span
          className={`block font-serif italic text-muted-foreground ${
            compact ? "text-[9px]" : "text-[10px] sm:text-[11px]"
          }`}
        >
          Enter a better life
        </span>
      </span>
    </span>
  );
}
