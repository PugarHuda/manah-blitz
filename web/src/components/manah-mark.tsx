import { cn } from "@/lib/cn";

export function ManahMark({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-brand", className)}
      aria-label="Manah"
    >
      {/* Drawn bow + arrow nocked, pulled back */}
      <path
        d="M6 4 C 22 4, 26 16, 22 28"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M6 4 L 24 16 L 6 28"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        fill="none"
        opacity="0.5"
      />
      <line
        x1="14"
        y1="16"
        x2="30"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M28 14 L 31 16 L 28 18 Z"
        fill="currentColor"
      />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}
