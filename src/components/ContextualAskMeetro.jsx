import { useEffect, useId, useRef, useState } from "react";

import MeetroIcon from "./MeetroIcon.jsx";
import WorkflowMicrophoneInput from "./WorkflowMicrophoneInput.jsx";
import { getAskMeetroWorkflowCopy } from "../utils/askMeetroWorkflowLanguage.js";

export default function ContextualAskMeetro({
  language = "en",
  contextLabel,
  contextName,
  actions = [],
  busy = false,
  error = "",
  notice = "",
  onRequest,
  mediaControls,
  children,
  defaultOpen = false,
  setPage,
  voiceContextLabel = contextLabel,
}) {
  const copy = getAskMeetroWorkflowCopy(language);
  const titleId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [selectedAction, setSelectedAction] = useState(actions[0]?.id || "");
  const [prompt, setPrompt] = useState("");
  const regionRef = useRef(null);

  useEffect(() => {
    if (open) regionRef.current?.focus();
  }, [open]);

  const activeAction = actions.some((action) => action.id === selectedAction)
    ? selectedAction
    : actions[0]?.id || "";

  if (!open) {
    return (
      <button
        type="button"
        className="contextual-ask-meetro-trigger"
        style={styles.trigger}
        aria-expanded="false"
        onClick={() => setOpen(true)}
      >
        <MeetroIcon name="assistant" size={20} />
        {copy.title}
      </button>
    );
  }

  return (
    <section
      ref={regionRef}
      tabIndex={-1}
      className="contextual-ask-meetro"
      style={styles.panel}
      aria-labelledby={titleId}
      data-ask-meetro-context={contextLabel}
    >
      <div style={styles.header}>
        <div style={styles.identity}>
          <span style={styles.icon}><MeetroIcon name="assistant" size={20} /></span>
          <div style={styles.headerCopy}>
            <h3 id={titleId} style={styles.title}>{copy.title}</h3>
            <span style={styles.context}>{copy.exactContext}: {contextName}</span>
          </div>
        </div>
        <button type="button" style={styles.close} onClick={() => setOpen(false)} aria-label={copy.close}>
          <MeetroIcon name="close" size={20} />
        </button>
      </div>

      <p style={styles.advisory}>{copy.advisory} {copy.noSilentChanges}</p>

      <div style={styles.actionGrid} role="group" aria-label={copy.promptLabel}>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            style={{ ...styles.action, ...(activeAction === action.id ? styles.actionSelected : {}) }}
            aria-pressed={activeAction === action.id}
            onClick={() => setSelectedAction(action.id)}
          >
            {action.label}
          </button>
        ))}
      </div>

      {mediaControls ? <div style={styles.mediaControls}>{mediaControls}</div> : null}

      <label style={styles.label}>
        {copy.promptLabel}
        <textarea
          value={prompt}
          maxLength={4000}
          rows={3}
          style={styles.textarea}
          placeholder={copy.promptPlaceholder}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </label>
      <WorkflowMicrophoneInput
        language={language}
        contextLabel={voiceContextLabel}
        disabled={busy}
        setPage={setPage}
        onTranscript={setPrompt}
      />
      <button
        type="button"
        style={styles.primary}
        disabled={busy || !activeAction}
        onClick={() => onRequest?.(activeAction, prompt.trim())}
      >
        {busy ? copy.preparing : copy.prepare}
      </button>

      {error && <p role="alert" style={styles.error}>{error}</p>}
      {notice && <p role="status" style={styles.notice}>{notice}</p>}
      {children && <div style={styles.results}>{children}</div>}
    </section>
  );
}

const styles = {
  trigger: { display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 14px", border: "1px solid #7f9f88", borderRadius: 6, background: "#f7faf7", color: "#174b2c", fontWeight: 800, cursor: "pointer" },
  panel: { display: "grid", gap: 14, minWidth: 0, padding: 16, border: "1px solid #9db4a3", borderRadius: 8, background: "#f8fbf8", outline: "none" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  identity: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  icon: { display: "grid", placeItems: "center", width: 36, height: 36, flex: "0 0 36px", borderRadius: "50%", background: "#e5f2e8", color: "#174b2c" },
  headerCopy: { display: "grid", gap: 3, minWidth: 0 },
  title: { margin: 0, fontSize: 18, letterSpacing: 0 },
  context: { color: "#526257", fontSize: 13, overflowWrap: "anywhere" },
  close: { width: 44, height: 44, flex: "0 0 44px", border: 0, background: "transparent", color: "#405047", fontSize: 26, cursor: "pointer" },
  advisory: { margin: 0, color: "#526257", lineHeight: 1.45 },
  actionGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  action: { minHeight: 44, padding: "0 13px", border: "1px solid #a9b7ad", borderRadius: 6, background: "#fff", color: "#263b2d", fontWeight: 750, cursor: "pointer" },
  actionSelected: { borderColor: "#1f6a3a", background: "#e9f4ec", color: "#174b2c" },
  mediaControls: {
    display: "grid",
    gap: 8,
    marginTop: 6,
  },
  label: { display: "grid", gap: 6, minWidth: 0, color: "#314239", fontWeight: 700 },
  textarea: { width: "100%", minWidth: 0, minHeight: 92, boxSizing: "border-box", padding: 10, border: "1px solid #93a59a", borderRadius: 6, background: "#fff", color: "#172317", font: "inherit", lineHeight: 1.45, resize: "vertical" },
  primary: { minHeight: 44, justifySelf: "start", padding: "0 16px", border: "1px solid #1f5132", borderRadius: 6, background: "#1f5132", color: "#fff", fontWeight: 800, cursor: "pointer" },
  error: { margin: 0, padding: 10, borderLeft: "3px solid #b42318", background: "#fff4f2", color: "#8f1b13" },
  notice: { margin: 0, padding: 10, borderLeft: "3px solid #238636", background: "#eef8f0", color: "#175c28" },
  results: { display: "grid", gap: 12, minWidth: 0, borderTop: "1px solid #d6e0d8", paddingTop: 14 },
};
