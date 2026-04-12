"use client";

import { useEffect } from "react";

export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Projects page error:", error);
  }, [error]);

  return (
    <div className="p-8 text-center space-y-4">
      <h2 className="text-xl font-bold text-destructive">Something went wrong</h2>
      <pre className="text-sm text-left bg-secondary p-4 rounded-xl overflow-auto max-h-60 whitespace-pre-wrap">
        {error.message}
        {"\n"}
        {error.stack}
      </pre>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
      >
        Try again
      </button>
    </div>
  );
}
