import { useRef, useState } from "react";
import { normalizeEmergencyRequestId } from "../utils/emergencyApi.js";
import { buildEmergencyFollowUpRequestRoute, getEmergencyFollowUpRequestCopy } from "../utils/emergencyFollowUpRequestRoute.js";

// Only the homeowner screen's authenticated, route-owned canonical response is passed here.
export default function EmergencyFollowUpAction({ emergencyRequest, language, setPage }) {
  const navigating = useRef(false);
  const [pending, setPending] = useState(false);
  const id = normalizeEmergencyRequestId(emergencyRequest?.id);
  if (emergencyRequest?.status !== "completed" || !id) return null;
  const copy = getEmergencyFollowUpRequestCopy(language);
  return (
    <section data-emergency-follow-up style={{ padding: 20, borderRadius: 18, background: "var(--meetro-surface, #fff)", border: "1px solid #e5e7eb", marginTop: 16, overflowWrap: "anywhere" }}>
      <style>{`.emergency-follow-up-button { width: 100%; white-space: normal; padding: 12px 16px; border-radius: 12px; border: 1px solid #15803d; background: var(--meetro-gradient-community-action, #166534); color: white; font: inherit; font-weight: 700; cursor: pointer; } .emergency-follow-up-button:focus-visible { outline: 3px solid #166534; outline-offset: 4px; } .emergency-follow-up-button:disabled { opacity: .65; cursor: wait; }`}</style>
      <p>{copy.supporting}</p>
      <p style={{ fontSize: 14, lineHeight: 1.5 }}>{copy.rules}</p>
      <button type="button" className="emergency-follow-up-button" disabled={pending} aria-busy={pending}
        onClick={() => {
          if (navigating.current) return;
          navigating.current = true;
          setPending(true);
          setPage(buildEmergencyFollowUpRequestRoute({ emergencyRequestId: id }));
        }}>
        {copy.action}
      </button>
    </section>
  );
}
