import { LoadingState } from "@/components/ui/states";
import { CommandBar } from "@/components/layout/command-bar";

export default function Loading() {
  return (
    <>
      <CommandBar crumbs={[{ label: "Loading…" }]} />
      <div className="workspace">
        <div className="col-span-12">
          <LoadingState label="Loading briefing…" />
        </div>
      </div>
    </>
  );
}
