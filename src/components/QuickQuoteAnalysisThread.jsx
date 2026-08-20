import { useRef, useState } from "react";

import MeetroIcon from "./MeetroIcon.jsx";
import WorkflowMicrophoneInput from "./WorkflowMicrophoneInput.jsx";
import { getQuickQuoteConversationCopy } from "../utils/quickQuoteConversationLanguage.js";

function turnMessage(turn) {
  if (
    turn?.role === "PROFESSIONAL" &&
    typeof turn?.payload?.message === "string"
  ) {
    return turn.payload.message.trim();
  }

  if (
    turn?.role === "MEETRO" &&
    typeof turn?.payload?.assistantMessage === "string"
  ) {
    return turn.payload.assistantMessage.trim();
  }

  return "";
}

export default function QuickQuoteAnalysisThread({
  language = "en",
  turns = [],
  busy = false,
  onContinue,
  setPage,
}) {
  const copy =
    getQuickQuoteConversationCopy(language);

  const composerRef =
    useRef(null);

  const [
    followUpMessage,
    setFollowUpMessage,
  ] = useState("");

  const renderableTurns =
    Array.isArray(turns)
      ? turns
          .map((turn) => ({
            ...turn,
            displayMessage:
              turnMessage(turn),
          }))
          .filter(
            (turn) =>
              turn.displayMessage &&
              [
                "PROFESSIONAL",
                "MEETRO",
              ].includes(turn.role)
          )
          .sort(
            (a, b) =>
              a.turnIndex -
              b.turnIndex
          )
      : [];

  async function submitFollowUp() {
    const message =
      followUpMessage.trim();

    if (
      busy ||
      !message ||
      typeof onContinue !==
        "function"
    ) {
      return;
    }

    const accepted =
      await onContinue(message);

    if (accepted === true) {
      setFollowUpMessage("");
      composerRef.current?.focus();
    }
  }

  return (
    <section
      className="quick-quote-analysis-conversation"
      aria-labelledby="quick-quote-analysis-conversation-title"
    >
      <div className="quick-quote-analysis-conversation-heading">
        <div>
          <strong id="quick-quote-analysis-conversation-title">
            {copy.analysisConversationTitle}
          </strong>

          <p>
            {copy.analysisConversationHelp}
          </p>
        </div>
      </div>

      <div
        className="quick-quote-analysis-thread"
        aria-live="polite"
      >
        {renderableTurns.map(
          (turn) => (
            <article
              key={turn.turnId}
              className={[
                "quick-quote-analysis-turn",
                turn.role ===
                "PROFESSIONAL"
                  ? "quick-quote-analysis-turn-professional"
                  : "quick-quote-analysis-turn-meetro",
              ].join(" ")}
            >
              <strong>
                {turn.role ===
                "PROFESSIONAL"
                  ? copy.professionalTurnLabel
                  : copy.assistant}
              </strong>

              <p>
                {turn.displayMessage}
              </p>
            </article>
          )
        )}
      </div>

      <div className="quick-quote-follow-up">
        <label className="quick-quote-follow-up-label">
          <span>
            {copy.followUpLabel}
          </span>

          <textarea
            ref={composerRef}
            value={followUpMessage}
            rows={3}
            maxLength={4000}
            disabled={busy}
            placeholder={
              copy.followUpPlaceholder
            }
            onChange={(event) =>
              setFollowUpMessage(
                event.target.value
              )
            }
          />
        </label>

        <div
          className="quick-quote-follow-up-actions"
          role="group"
          aria-label={copy.followUpLabel}
        >
          <WorkflowMicrophoneInput
            language={language}
            contextLabel="quick-quote-analysis-follow-up"
            idleLabel={copy.speak}
            setPage={setPage}
            disabled={busy}
            onTranscript={(transcript) =>
              setFollowUpMessage(
                (current) =>
                  [
                    current,
                    transcript,
                  ]
                    .filter(Boolean)
                    .join(" ")
              )
            }
          />

          <button
            type="button"
            className="quick-quote-primary-action"
            disabled={
              busy ||
              !followUpMessage.trim()
            }
            onClick={() =>
              void submitFollowUp()
            }
          >
            <MeetroIcon
              name="assistant"
              size={18}
            />

            {busy
              ? copy.continuingAnalysis
              : copy.sendFollowUp}
          </button>
        </div>
      </div>
    </section>
  );
}
