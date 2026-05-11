"use client";

import { useEffect } from "react";
import { CommandBar } from "@/components/layout/command-bar";
import { ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("App error:", error);
  }, [error]);

  return (
    <>
      <CommandBar crumbs={[{ label: "Error" }]} />
      <div className="workspace">
        <div className="col-span-12">
          <ErrorState
            title="Something went wrong"
            message={error.message || "Unknown error"}
            detail="Check the FastAPI backend is running on http://127.0.0.1:8000"
            action={
              <Button variant="primary" onClick={reset}>
                Retry
              </Button>
            }
          />
        </div>
      </div>
    </>
  );
}
