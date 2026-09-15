import Image from "next/image";

// Renders the real brand mark (public/brand-logo.png, the same image used
// for the favicon). Override via NEXT_PUBLIC_BRAND_LOGO in .env.local if a
// different file should be used instead.
const LOGO_SRC = process.env.NEXT_PUBLIC_BRAND_LOGO || "/brand-logo.png";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Image
        src={LOGO_SRC}
        alt="LumeLush Studio"
        width={32}
        height={32}
        className="size-8 shrink-0 object-contain"
        priority
      />

      {!compact && (
        <span className="font-display text-base leading-none whitespace-nowrap text-ink">
          LumeLush <span className="brand-mark">Studio</span>
        </span>
      )}
    </span>
  );
}
