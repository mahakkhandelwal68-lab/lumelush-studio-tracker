import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { BrandMark } from "@/components/BrandMark";

const NAV = [
  { href: "/consultant", label: "Meetings" },
  { href: "/consultant/availability", label: "Availability" },
  { href: "/consultant/tools", label: "Tools" },
];

export default async function ConsultantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile("consultant");

  const initials = profile.full_name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-edge bg-base/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-4">
            <BrandMark />
            <span className="hidden h-5 w-px bg-edge-strong sm:block" />
            <span className="data hidden text-xs font-medium tracking-widest text-ink-faint uppercase sm:block">
              Sales Consultant
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="data text-sm leading-tight text-ink">
                {profile.full_name}
              </p>
              <p className="data text-xs text-ink-faint">{profile.email}</p>
            </div>
            <span
              className="data grid size-9 place-items-center rounded-full border text-xs font-semibold"
              style={{ borderColor: "#1c5a44", background: "#0d2b22", color: "#4fc08d" }}
            >
              {initials}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="data rounded-lg border border-edge-strong bg-overlay px-3 py-1.5 text-xs text-ink-dim transition hover:bg-hover hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <nav className="mx-auto flex max-w-[1400px] gap-1 px-6">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="data rounded-t-lg px-3.5 py-2 text-sm text-ink-dim transition hover:bg-overlay hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">{children}</main>
    </div>
  );
}
