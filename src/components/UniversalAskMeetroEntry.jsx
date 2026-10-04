import { getAskMeetroWorkflowCopy } from "../utils/askMeetroWorkflowLanguage.js";

// An entry point only. AskMeetroHost owns the conversation and its composer.
export default function UniversalAskMeetroEntry({ language = "en", context = {}, contextName = "", mediaControls, children }) {
  return <>
    <button type="button" className="contextual-ask-meetro-trigger" style={styles.entry}
      onClick={() => window.dispatchEvent(new CustomEvent("meetro:assistant:open", {
        detail: { context: { ...context, label: contextName || context.label || "" } },
      }))}>
      <span style={styles.mark} aria-hidden="true">M</span>
      {getAskMeetroWorkflowCopy(language).title}
    </button>
    {mediaControls}
    {children}
  </>;
}
const styles = {
  entry: { display: "inline-flex", alignItems: "center", justifySelf: "start", gap: 9, minHeight: 44, padding: "4px 14px 4px 5px", border: "1px solid #7f9f88", borderRadius: 12, background: "#f7faf7", color: "#174b2c", font: "inherit", fontWeight: 800, cursor: "pointer" },
  mark: { display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 9, background: "#174b2c", color: "#fff", fontWeight: 900 },
};
