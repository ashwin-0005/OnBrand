/** Shield motif: left half coral, right half white. Decorative when next to the "OnBrand" text. */
export function ShieldMark({ className = "h-7 w-7" }: { className?: string }) {
  const d = "M16 2 L28 6 V15 C28 22.5 22.8 27.8 16 30 C9.2 27.8 4 22.5 4 15 V6 Z";
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="shield-left">
          <rect x="0" y="0" width="16" height="32" />
        </clipPath>
      </defs>
      <path d={d} fill="#fff" stroke="#16181d" strokeOpacity=".15" />
      <path d={d} fill="var(--coral)" clipPath="url(#shield-left)" />
    </svg>
  );
}
