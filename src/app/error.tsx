"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

/** True for the "Failed to find Server Action" error Next.js throws when a
 * page loaded before a deploy tries to call an action ID the new build
 * doesn't recognize anymore — see AGENTS.md notes on frequent redeploys. */
function isStaleActionError(error: Error) {
  return /Failed to find Server Action|was not found on the server/i.test(
    error.message
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const stale = isStaleActionError(error);
  const [reloading, setReloading] = useState(stale);

  useEffect(() => {
    if (!stale) return;
    const t = setTimeout(() => window.location.reload(), 1200);
    return () => clearTimeout(t);
  }, [stale]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-6">
      <div className="w-full max-w-sm rounded-2xl border border-edge bg-raised p-6 text-center">
        {stale ? (
          <>
            <h1 className="font-display text-lg text-ink">
              The app was just updated
            </h1>
            <p className="mt-2 text-sm text-ink-dim">
              {reloading
                ? "Refreshing the page automatically…"
                : "This page was open before an update — refresh to continue."}
            </p>
            <Button
              variant="primary"
              className="mt-4 w-full"
              onClick={() => {
                setReloading(true);
                window.location.reload();
              }}
            >
              Refresh now
            </Button>
          </>
        ) : (
          <>
            <h1 className="font-display text-lg text-ink">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-ink-dim">
              Try again, or refresh the page if that doesn&apos;t help.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => reset()}
              >
                Try again
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => window.location.reload()}
              >
                Refresh page
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
