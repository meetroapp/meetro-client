import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  requestWorkflowTranscription,
  startWorkflowAudioCapture,
} from "../src/utils/contextualMicrophone.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

class FakeMediaRecorder {
  static isTypeSupported(type) { return type.startsWith("audio/webm"); }

  constructor(_stream, options = {}) {
    this.mimeType = options.mimeType || "audio/webm";
    this.state = "inactive";
    this.listeners = new Map();
  }

  addEventListener(name, handler) { this.listeners.set(name, handler); }
  start() { this.state = "recording"; }
  stop() {
    this.state = "inactive";
    this.listeners.get("dataavailable")?.({ data: new Blob(["voice"], { type: "audio/webm" }) });
    this.listeners.get("stop")?.();
  }
}

function mediaFixture() {
  let stopped = 0;
  return {
    mediaDevices: {
      async getUserMedia() {
        return { getTracks: () => [{ stop() { stopped += 1; } }] };
      },
    },
    stopped: () => stopped,
  };
}

test("microphone stop yields reviewable audio and cancel discards it", async () => {
  const stopFixture = mediaFixture();
  const capture = await startWorkflowAudioCapture({
    mediaDevices: stopFixture.mediaDevices,
    MediaRecorderImpl: FakeMediaRecorder,
  });
  const audio = await capture.stop();
  assert.equal(audio instanceof Blob, true);
  assert.equal(audio.type, "audio/webm");
  assert.equal(stopFixture.stopped(), 1);

  const cancelFixture = mediaFixture();
  const cancelled = await startWorkflowAudioCapture({
    mediaDevices: cancelFixture.mediaDevices,
    MediaRecorderImpl: FakeMediaRecorder,
  });
  assert.equal(await cancelled.cancel(), null);
  assert.equal(cancelFixture.stopped(), 1);
});

test("permission denial is classified without browser credential or storage workarounds", async () => {
  await assert.rejects(
    startWorkflowAudioCapture({
      mediaDevices: { async getUserMedia() { throw Object.assign(new Error("denied"), { name: "NotAllowedError" }); } },
      MediaRecorderImpl: FakeMediaRecorder,
    }),
    (error) => error.code === "MICROPHONE_PERMISSION_DENIED"
  );
});

test("transcription adapter requires non-canonical transcript truth and explicit submit", async () => {
  const calls = [];
  const result = await requestWorkflowTranscription({
    audio: new Blob(["voice"], { type: "audio/webm" }),
    contextLabel: "evaluation",
    locale: "fr",
    idempotencyKey: "5bf5b260-ee94-4bfa-9f8d-246a4ae6c587",
    authFetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          code: "INTELLIGENCE_OPERATION_COMPLETED",
          result: {
            schemaVersion: 1,
            authorityClassification: "USER_TRANSCRIPT_NON_CANONICAL",
            transcript: "Inspecter le robinet.",
            contextLabel: "evaluation",
            audioPersisted: false,
            explicitSubmitRequired: true,
            provider: { name: "openai", model: "fixture" },
          },
        },
      };
    },
  });

  assert.equal(result.transcript, "Inspecter le robinet.");
  assert.match(calls[0].url, /context=evaluation/);
  assert.equal(calls[0].options.headers["Content-Type"], "audio/webm");
  assert.equal(calls[0].options.body instanceof Blob, true);
});

test("shared microphone remains transcript-only across all four workflows", () => {
  const control = read("src/components/WorkflowMicrophoneInput.jsx");
  const panel = read("src/components/ContextualAskMeetro.jsx");
  const styles = read("src/index.css");
  const upload = read("src/pages/Upload.jsx");
  const evaluation = read("src/components/CanonicalJobEvaluation.jsx");
  const quote = read("src/pages/QuoteBuilder.jsx");
  const invoice = read("src/components/ProfessionalInvoiceWorkspace.jsx");
  const documentWorkspace = read("src/components/UnifiedBusinessDocumentWorkspace.jsx");

  assert.match(control, /onTranscript\?\.\(result\.transcript\)/);
  assert.doesNotMatch(control, /onRequest|handleConversationSubmit|evaluation\.complete|quote\.issue|invoice\.issue/);
  assert.match(panel, /WorkflowMicrophoneInput/);
  assert.match(upload, /contextLabel="job_request"/);
  assert.match(evaluation, /contextLabel="evaluation"/);
  assert.match(quote, /voiceContextLabel="estimate"/);
  assert.match(invoice, /contextLabel="invoice"/);
  assert.match(documentWorkspace, /contextLabel=\{\s*activeDocument === "quote"\s*\?\s*"estimate"\s*:\s*"invoice"\s*\}/);
  assert.doesNotMatch(documentWorkspace, /contextLabel=\{`business-\$\{activeDocument\}`\}/);
  assert.match(documentWorkspace, /onTranscript=\{\s*\(transcript\)\s*=>\s*setMessage\(\(current\)\s*=>\s*\[current, transcript\]/);
  assert.match(control, /visibilitychange/);
  assert.match(control, /minHeight: 44/);
  assert.match(upload, /data-ask-meetro-context="job-request"/);
  assert.match(styles, /body:has\(\.request-help-page\) \.meetro-assistant-launcher/);
  assert.match(styles, /body:has\(\.contextual-ask-meetro-trigger\) \.meetro-assistant-launcher/);
  assert.match(styles, /body:has\(\.contextual-ask-meetro\) \.meetro-assistant-launcher/);
});

test("microphone chrome is localized for all active languages", () => {
  const source = read("src/utils/askMeetroWorkflowLanguage.js");
  for (const key of ["startRecording", "recording", "stopRecording", "cancelRecording", "transcribing", "transcriptReady", "microphoneDenied", "microphoneUnavailable"]) {
    assert.equal((source.match(new RegExp(`${key}:`, "g")) || []).length, 4);
  }
});

test("active microphone and error states are reversible without submitting transcript", () => {
  const control = read("src/components/WorkflowMicrophoneInput.jsx");
  const recording = control.slice(control.indexOf('state === "recording"'), control.indexOf('state === "error"'));

  assert.match(recording, /onClick=\{\(\) => void cancel\(\)\}/);
  assert.match(recording, /copy\.cancelRecording/);
  assert.match(control, /document\.addEventListener\("pointerdown", closeFromOutside\)/);
  assert.match(control, /wrapperRef\.current\?\.contains\(event\.target\)/);
  assert.match(control, /if \(state === "error"\)[\s\S]*aria-label="Dismiss microphone message"/);
  assert.match(control, /if \(state === "error"\)[\s\S]*onClick=\{\(\) => void cancel\(\)\}/);
  assert.match(control, />\s*Dismiss\s*</);
  assert.match(control, /minHeight: 44/);

  const cancelBlock = control.slice(control.indexOf("const cancel"), control.indexOf("useEffect", control.indexOf("const cancel")));
  assert.doesNotMatch(cancelBlock, /onTranscript|requestTranscription|setMessage\([^""]|setPage/);
});
