import type { ReactNode } from "react";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ---------------------------------------------------------- Card */

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-edge bg-raised shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_18px_40px_-24px_rgba(0,0,0,0.8)]",
        className
      )}
    >
      {children}
    </section>
  );
}

/**
 * Icon-circle colour per card. Deliberately varied so cards read as
 * distinct at a glance instead of every icon being the same teal —
 * pulled from across the brand palette, not just the primary accent.
 */
export const ICON_TONES = {
  blue: { border: "#1d4a75", bg: "#0e2942", text: "#4aa3f0" },
  teal: { border: "var(--border-subtle)", bg: "var(--surface-overlay)", text: "var(--brand-teal)" },
  mint: { border: "#1c5a44", bg: "#0d2b22", text: "#4fc08d" },
  amber: { border: "#6b5210", bg: "#2b220a", text: "#f0b429" },
  indigo: { border: "#2a3a8f", bg: "#141c3f", text: "#5b7cfa" },
} as const;

export type IconTone = keyof typeof ICON_TONES;

export function CardHeader({
  title,
  subtitle,
  icon,
  iconTone = "teal",
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  iconTone?: IconTone;
  action?: ReactNode;
}) {
  const tone = ICON_TONES[iconTone];
  return (
    <header className="flex items-start justify-between gap-4 border-b border-edge px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span
            className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border"
            style={{ borderColor: tone.border, background: tone.bg, color: tone.text }}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="font-display text-lg leading-tight text-ink">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-ink-dim">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/* -------------------------------------------------------- Button */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "text-[#04121f] font-semibold [background:var(--accent-gradient)] hover:brightness-110 active:brightness-95",
  secondary:
    "border border-edge-strong bg-overlay text-ink hover:bg-hover",
  ghost: "text-ink-dim hover:bg-overlay hover:text-ink",
  danger:
    "border border-[#5c2027] bg-[#2a1218] text-status-dead hover:bg-[#37171e]",
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className,
  ...props
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "data inline-flex items-center justify-center gap-1.5 rounded-lg transition disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
        BUTTON_STYLES[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------------- Badge */

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "new" | "callback" | "noanswer" | "dead" | "booked";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-edge-strong bg-overlay text-ink-dim",
    new: "border-[#1d4a75] bg-[#0e2942] text-status-new",
    callback: "border-[#6b5210] bg-[#2b220a] text-status-callback",
    noanswer: "border-[#3a4260] bg-[#1a2136] text-status-noanswer",
    dead: "border-[#5c2027] bg-[#2a1218] text-status-dead",
    booked: "border-[#1c5a44] bg-[#0d2b22] text-status-booked",
  };

  return (
    <span
      className={cn(
        "data inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------------- Input */

const FIELD_BASE =
  "data w-full rounded-lg border border-edge-strong bg-overlay px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition focus:border-brand-teal";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(FIELD_BASE, props.className)} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea {...props} className={cn(FIELD_BASE, "resize-y", props.className)} />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(FIELD_BASE, props.className)} />;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="data mb-1.5 block text-xs font-medium tracking-wide text-ink-dim uppercase">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

/* --------------------------------------------------- Empty state */

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="font-display text-base text-ink-dim">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-faint">{hint}</p>}
    </div>
  );
}
