import { Link } from "react-router-dom";
import { CommandBar } from "../components/layout/CommandBar";
import { EmptyState } from "../components/ui/States";

export function NotFoundPage() {
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
              <Link to="/" className="btn btn-primary btn-lg">
                Return to Morning Briefing
              </Link>
            }
          />
        </div>
      </div>
    </>
  );
}
