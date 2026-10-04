import { authFetch } from "./authFetch.js";
import { createIntelligenceKey, IntelligenceApiError } from "./contextualIntelligence.js";

export const WORKFLOW_TRANSCRIPTION_ROUTE = "/api/intelligence/transcriptions";
export const WORKFLOW_AUDIO_CONTEXTS = Object.freeze([
  "job_request",
  "evaluation",
  "estimate",
  "invoice",
]);

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
]);

export class MicrophoneInputError extends Error {
  constructor(message, { code = "MICROPHONE_UNAVAILABLE" } = {}) {
    super(message);
    this.name = "MicrophoneInputError";
    this.code = code;
  }
}

function normalizedMimeType(value) {
  return String(value || "").split(";")[0].trim().toLowerCase();
}

function selectAudioMimeType(MediaRecorderImpl) {
  const candidates = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"];
  if (typeof MediaRecorderImpl?.isTypeSupported !== "function") return "";
  return candidates.find((type) => MediaRecorderImpl.isTypeSupported(type)) || "";
}

function stopStream(stream) {
  for (const track of stream?.getTracks?.() || []) track.stop?.();
}

function microphoneFailure(error) {
  const name = String(error?.name || "");
  if (["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(name)) {
    return new MicrophoneInputError("Microphone permission was denied.", { code: "MICROPHONE_PERMISSION_DENIED" });
  }
  if (["NotFoundError", "DevicesNotFoundError"].includes(name)) {
    return new MicrophoneInputError("No microphone is available.", { code: "MICROPHONE_NOT_FOUND" });
  }
  return new MicrophoneInputError("The microphone could not start.");
}

export async function startWorkflowAudioCapture({
  mediaDevices = globalThis.navigator?.mediaDevices,
  MediaRecorderImpl = globalThis.MediaRecorder,
} = {}) {
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function" ||
      typeof MediaRecorderImpl !== "function") {
    throw new MicrophoneInputError("Voice input is unavailable on this device.");
  }

  let stream;
  try {
    stream = await mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    });
  } catch (error) {
    throw microphoneFailure(error);
  }

  const selectedMimeType = selectAudioMimeType(MediaRecorderImpl);
  let recorder;
  try {
    recorder = selectedMimeType
      ? new MediaRecorderImpl(stream, { mimeType: selectedMimeType })
      : new MediaRecorderImpl(stream);
  } catch (error) {
    stopStream(stream);
    throw microphoneFailure(error);
  }

  const chunks = [];
  let cancelled = false;
  let settled = false;
  let resolveStopped;
  let rejectStopped;
  const stopped = new Promise((resolve, reject) => {
    resolveStopped = resolve;
    rejectStopped = reject;
  });
  recorder.addEventListener("dataavailable", (event) => {
    if (!cancelled && event.data?.size > 0) chunks.push(event.data);
  });
  recorder.addEventListener("error", () => {
    if (settled) return;
    settled = true;
    stopStream(stream);
    rejectStopped(new MicrophoneInputError("The recording could not be completed."));
  });
  recorder.addEventListener("stop", () => {
    if (settled) return;
    settled = true;
    stopStream(stream);
    if (cancelled) return resolveStopped(null);
    const mimeType = normalizedMimeType(recorder.mimeType || selectedMimeType || chunks[0]?.type);
    if (!ALLOWED_AUDIO_TYPES.has(mimeType)) {
      return rejectStopped(new MicrophoneInputError("This recording format is unavailable."));
    }
    const blob = new Blob(chunks, { type: mimeType });
    if (!blob.size) return rejectStopped(new MicrophoneInputError("No voice recording was captured."));
    return resolveStopped(blob);
  });
  recorder.start();

  return Object.freeze({
    mimeType: normalizedMimeType(recorder.mimeType || selectedMimeType),
    async stop() {
      if (recorder.state !== "inactive") recorder.stop();
      return stopped;
    },
    async cancel() {
      cancelled = true;
      if (recorder.state !== "inactive") recorder.stop();
      else if (!settled) {
        settled = true;
        stopStream(stream);
        resolveStopped(null);
      }
      return stopped;
    },
  });
}

export async function requestWorkflowTranscription({
  audio,
  contextLabel,
  locale = "en-US",
  idempotencyKey = createIntelligenceKey(),
  setPage,
  authFetchImpl = authFetch,
}) {
  const normalizedContext = String(contextLabel || "").trim().toLowerCase();
  const mimeType = normalizedMimeType(audio?.type);
  if (!(audio instanceof Blob) || !audio.size || !WORKFLOW_AUDIO_CONTEXTS.includes(normalizedContext) ||
      !ALLOWED_AUDIO_TYPES.has(mimeType)) {
    throw new TypeError("A governed Ask Meetro voice recording is required.");
  }
  const query = new URLSearchParams({ context: normalizedContext, locale });
  const { response, data } = await authFetchImpl(
    `${WORKFLOW_TRANSCRIPTION_ROUTE}?${query.toString()}`,
    {
      method: "POST",
      headers: { "Content-Type": mimeType, "Idempotency-Key": idempotencyKey },
      body: audio,
    },
    setPage
  );
  const result = data?.result;
  const valid = result?.schemaVersion === 1 &&
    result?.authorityClassification === "USER_TRANSCRIPT_NON_CANONICAL" &&
    result?.explicitSubmitRequired === true &&
    result?.audioPersisted === false &&
    result?.contextLabel === normalizedContext &&
    typeof result?.transcript === "string" && result.transcript.trim() && result.transcript.length <= 4000;
  if (!response.ok || data?.success !== true || !valid) {
    throw new IntelligenceApiError(
      data?.message || "Ask Meetro could not transcribe this recording.",
      { status: response.status, code: data?.code || "INTELLIGENCE_TRANSCRIPTION_FAILED" }
    );
  }
  return {
    transcript: result.transcript.trim(),
    provider: result.provider,
    replayed: data.code === "INTELLIGENCE_OPERATION_REPLAYED",
  };
}
