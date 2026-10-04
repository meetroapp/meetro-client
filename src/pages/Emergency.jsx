import { useEffect } from "react";

// Compatibility route only. The canonical Emergency Request workspace owns
// the homeowner flow, including service choice, draft creation, and safety.
function Emergency({ setPage }) {
  useEffect(() => {
    setPage("emergencyRequest");
  }, [setPage]);

  return null;
}

export default Emergency;
