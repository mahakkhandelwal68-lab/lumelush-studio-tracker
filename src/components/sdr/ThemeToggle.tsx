"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@/components/sdr/icons";

const STORAGE_KEY = "sdr-theme";

export function ThemeToggle() {
  // Starts null so this button renders nothing until it knows the real
  // theme (set synchronously by the inline script in layout.tsx) — avoids
  // a flash of the wrong icon.
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".sdr-app");
    setTheme((root?.getAttribute("data-theme") as "light" | "dark") ?? "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.querySelector<HTMLElement>(".sdr-app")?.setAttribute("data-theme", next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  if (!theme) return <span className="size-9" />;

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="grid size-9 place-items-center rounded-lg border transition"
      style={{ borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}
    >
      {theme === "dark" ? <SunIcon className="size-4.5" /> : <MoonIcon className="size-4.5" />}
    </button>
  );
}
