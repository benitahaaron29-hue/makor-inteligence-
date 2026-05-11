import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CommandBar } from "@/components/layout/command-bar";
import { EmptyState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <>
      <CommandBar
        crumbs={[
          { label: "Desk", to: "/" },
          { label: "Not Found" },
        ]}
      />
      <div className="workspace">
        <div className="col-span-12">
          <EmptyState
            title="That page is not part of the desk."
            message="The requested view does not exist on the Makor Intelligence Platform."
            action={
              <Button asChild variant="primary" size="lg">
                <Link href="/">Return to terminal</Link>
              </Button>
            }
          />
        </div>
      </div>
    </>
  );
}
