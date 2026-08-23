import Image from "next/image";

// Renders the wordmark in the brand gradient by default. To use the real
// logo file instead, drop it in /public and set NEXT_PUBLIC_BRAND_LOGO to
// its path (e.g. "/logo.png") in .env.local.
//
// Deliberately does no filesystem lookup: this component is imported by
// client components too, and touching node:fs here breaks the browser bundle.
const LOGO_SRC = process.env.NEXT_PUBLIC_BRAND_LOGO;

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      {LOGO_SRC ? (
        <Image
          src={LOGO_SRC}
          alt="LumeLush Studio"
          width={32}
          height={32}
          className="size-8 rounded-lg object-contain"
          priority
        />
      ) : (
        <span className="accent-bar grid size-8 shrink-0 place-items-center rounded-lg font-display text-sm font-bold text-[#04121f]">
          LL
        </span>
      )}

      {!compact && (
        <span className="font-display text-base leading-none whitespace-nowrap text-ink">
          LumeLush <span className="brand-mark">Studio</span>
        </span>
      )}
    </span>
  );
}
