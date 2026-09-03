import { useCallback, useEffect, useRef, useState } from "react";

import MeetroIcon from "./MeetroIcon.jsx";
import { getAskMeetroWorkflowCopy } from "../utils/askMeetroWorkflowLanguage.js";
import {
  requestWorkflowTranscription,
  startWorkflowAudioCapture,
} from "../utils/contextualMicrophone.js";

export default function WorkflowMicrophoneInput({
  language = "en",
  contextLabel,
  disabled = false,
  onTranscript,
  setPage,
  startCapture = startWorkflowAudioCapture,
  requestTranscription = requestWorkflowTranscription,
  idleLabel,
  compact = false,
}) {
  const copy = getAskMeetroWorkflowCopy(language);
  const captureRef = useRef(null);
  const wrapperRef = useRef(null);
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("status");

  const cancel = useCallback(async ({ announce = true } = {}) => {
    const capture = captureRef.current;
    captureRef.current = null;

    if (capture) {
      await capture.cancel().catch(() => null);
    }

    setState("idle");

    if (announce) {
      setMessage("");
    }
  }, []);

  useEffect(() => {
    const cancelWhenHidden = () => {
      if (document.visibilityState === "hidden" && captureRef.current) {
        void cancel({ announce: false });
      }
    };

    document.addEventListener("visibilitychange", cancelWhenHidden);

    return () => {
      document.removeEventListener("visibilitychange", cancelWhenHidden);

      if (captureRef.current) {
        void captureRef.current.cancel().catch(() => null);
      }

      captureRef.current = null;
    };
  }, [cancel]);

  useEffect(() => {
    if (state !== "recording" && state !== "error") {
      return undefined;
    }

    const closeFromOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        void cancel();
      }
    };

    document.addEventListener("pointerdown", closeFromOutside);

    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
    };
  }, [cancel, state]);

  const start = async () => {
    setMessage("");

    try {
      captureRef.current = await startCapture();
      setState("recording");
    } catch (error) {
      setState("error");
      setMessageType("alert");
      setMessage(
        error?.code === "MICROPHONE_PERMISSION_DENIED"
          ? copy.microphoneDenied
          : copy.microphoneUnavailable
      );
    }
  };

  const stop = async () => {
    const capture = captureRef.current;

    if (!capture) {
      return;
    }

    captureRef.current = null;
    setState("transcribing");
    setMessage("");

    try {
      const audio = await capture.stop();

      if (!audio) {
        setState("idle");
        return;
      }

      const result = await requestTranscription({
        audio,
        contextLabel,
        locale: language,
        setPage,
      });

      onTranscript?.(result.transcript);
      setMessageType("status");
      setMessage(copy.transcriptReady);
      setState("idle");
    } catch (error) {
      setState("error");
      setMessageType("alert");
      setMessage(error?.message || copy.microphoneUnavailable);
    }
  };

  /*
   * Compact presentation for mobile messaging-style composers.
   * Other WorkflowMicrophoneInput consumers retain the original
   * full-size presentation below.
   */
  if (compact) {
    if (state === "recording") {
      return (
        <div
          ref={wrapperRef}
          className="workflow-microphone-compact workflow-microphone-compact-recording"
          role="group"
          aria-label={copy.recording}
        >
          <button
            type="button"
            className="workflow-microphone-compact-cancel"
            aria-label={copy.cancelRecording}
            title={copy.cancelRecording}
            onClick={() => void cancel()}
          >
            <MeetroIcon name="close" size={18} decorative />
          </button>

          <span
            className="workflow-microphone-compact-live"
            role="status"
          >
            <span
              className="workflow-microphone-compact-dot"
              aria-hidden="true"
            />
            <span className="workflow-microphone-compact-status-text">
              {copy.recording}
            </span>
          </span>

          <button
            type="button"
            className="workflow-microphone-compact-stop"
            aria-label={copy.stopRecording}
            title={copy.stopRecording}
            onClick={() => void stop()}
          >
            <MeetroIcon name="stopRecording" size={18} decorative />
          </button>
        </div>
      );
    }

    if (state === "error") {
      return (
        <div
          ref={wrapperRef}
          className="workflow-microphone-compact workflow-microphone-compact-error"
        >
          <button
            type="button"
            className="workflow-microphone-compact-dismiss"
            aria-label="Dismiss microphone message"
            title="Dismiss microphone message"
            onClick={() => void cancel()}
          >
            <MeetroIcon name="close" size={18} decorative />
          </button>

          <span
            role="alert"
            className="workflow-microphone-compact-message"
          >
            {message}
          </span>
        </div>
      );
    }

    const label =
      state === "transcribing"
        ? copy.transcribing
        : idleLabel || copy.startRecording;

    return (
      <div
        ref={wrapperRef}
        className={`workflow-microphone-compact${
          state === "transcribing" ? " is-transcribing" : ""
        }`}
      >
        <button
          type="button"
          className="workflow-microphone-compact-trigger"
          disabled={disabled || state === "transcribing"}
          aria-label={label}
          aria-busy={state === "transcribing"}
          title={label}
          onClick={() => void start()}
        >
          <MeetroIcon name="microphone" size={20} decorative />
        </button>
      </div>
    );
  }

  if (state === "recording") {
    return (
      <div
        ref={wrapperRef}
        style={styles.group}
        role="group"
        aria-label={copy.recording}
      >
        <button
          type="button"
          style={styles.button}
          onClick={() => void cancel()}
        >
          <MeetroIcon name="microphone" size={18} />
          {copy.cancelRecording}
        </button>

        <span style={styles.recording} role="status">
          <span style={styles.indicator} aria-hidden="true" />
          {copy.recording}
        </span>

        <button
          type="button"
          style={styles.button}
          onClick={() => void stop()}
        >
          <MeetroIcon name="stopRecording" size={18} />
          {copy.stopRecording}
        </button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div ref={wrapperRef} style={styles.wrapper}>
        <button
          type="button"
          style={styles.button}
          onClick={() => void cancel()}
          aria-label="Dismiss microphone message"
        >
          <MeetroIcon name="close" size={18} />
          Dismiss
        </button>

        <span role="alert" style={styles.error}>
          {message}
        </span>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} style={styles.wrapper}>
      <button
        type="button"
        style={styles.button}
        disabled={disabled || state === "transcribing"}
        aria-label={
          state === "transcribing"
            ? copy.transcribing
            : idleLabel || copy.startRecording
        }
        title={
          state === "transcribing"
            ? copy.transcribing
            : idleLabel || copy.startRecording
        }
        onClick={() => void start()}
      >
        <MeetroIcon name="microphone" size={18} />
        {state === "transcribing"
          ? copy.transcribing
          : idleLabel || copy.startRecording}
      </button>

      {message && (
        <span
          role={messageType}
          style={messageType === "alert" ? styles.error : styles.notice}
        >
          {message}
        </span>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    minWidth: 0,
  },
  group: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    minWidth: 0,
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 44,
    padding: "0 12px",
    border: "1px solid #82978a",
    borderRadius: 6,
    background: "#fff",
    color: "#174b2c",
    fontWeight: 750,
    cursor: "pointer",
  },
  recording: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    minHeight: 44,
    color: "#8f1b13",
    fontWeight: 800,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#c6281f",
    boxShadow: "0 0 0 4px #fbe9e7",
  },
  notice: {
    color: "#365340",
    fontSize: 13,
    lineHeight: 1.4,
  },
  error: {
    color: "#8f1b13",
    fontSize: 13,
    lineHeight: 1.4,
  },
};
