import { useCallback, useEffect, useRef, useState } from "react";
import MeetroAssistant from "./MeetroAssistant";
import AskMeetroWorkspace from "./AskMeetroWorkspace";
import { captureAskMeetroContext } from "../utils/askMeetro.js";
import { getAccountModeForPage, subscribeAuthenticatedIdentity } from "../utils/session.js";

export default function AskMeetroHost({ children, currentPage, setPage, enabled = true }) {
  const [entry, setEntry] = useState(null);
  const [session, setSession] = useState(null);
  const opener = useRef(null);
  const role = getAccountModeForPage(currentPage, localStorage.getItem("activeAccountMode") || "personal");
  const open = useCallback((detail = {}) => {
    opener.current = document.activeElement;
    let supplied = detail.context || {};
    window.dispatchEvent(new CustomEvent("meetro:assistant:context-request", { detail: {
      provide(value) { supplied = { ...value, ...supplied }; },
    } }));
    const context = captureAskMeetroContext(window.location.hash || currentPage, supplied);
    setSession((previous) => previous?.contextKey === JSON.stringify(context) ? previous : null);
    setEntry({ context, initialQuestion: String(detail.initialQuestion || detail.question || "").slice(0, 5000) });
  }, [currentPage]);
  function close() { setEntry(null); requestAnimationFrame(() => opener.current?.focus?.()); }
  function navigate(route) { setEntry(null); setPage(route); }
  useEffect(() => {
    const reset = () => { setEntry(null); setSession(null); };
    const closeOnRoute = () => setEntry(null);
    const unsubscribe = subscribeAuthenticatedIdentity(reset);
    window.addEventListener("accountModeChanged", reset);
    window.addEventListener("meetroAuthExpired", reset);
    window.addEventListener("hashchange", closeOnRoute);
    return () => { unsubscribe(); window.removeEventListener("accountModeChanged", reset); window.removeEventListener("meetroAuthExpired", reset); window.removeEventListener("hashchange", closeOnRoute); };
  }, []);
  return <>
    {/* Keep the original workspace mounted so opening Ask cannot discard a local draft. */}
    <div hidden={Boolean(entry)} style={{ display: entry ? "none" : "contents" }}>
      {children}
      {enabled ? <MeetroAssistant currentPage={currentPage} setPage={setPage} onOpenWorkspace={open} /> : null}
    </div>
    {entry ? <AskMeetroWorkspace context={entry.context} initialQuestion={entry.initialQuestion} role={role} currentPage={currentPage} onClose={close} setPage={navigate} session={session} onSessionChange={setSession} /> : null}
  </>;
}
