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
            detail="The desk data service did not respond. Retry, or refresh the page."
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
