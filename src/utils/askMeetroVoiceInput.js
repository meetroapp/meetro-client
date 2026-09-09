// Voice supplies editable text only. This controller has no record/action API.
export const ASK_VOICE_NOTICE = Object.freeze({
  unsupported: "Voice input is not available in this app build. You can type your message.",
  browserUnsupported: "Voice is unavailable in this browser. You can type your message.",
  denied: "Microphone or speech access was denied. Enable access for Meetro in Settings, or type your message.",
  interrupted: "Voice input was interrupted. Tap the microphone to try again, or type your message.",
  unavailable: "Speech recognition is temporarily unavailable. Try again, or type your message.",
  timeout: "Voice input reached its time limit. Review any captured text or tap the microphone to try again.",
  recognition: "Voice could not hear you. Try again or type your message.",
});

export function classifyAskVoiceError(error = {}) {
  const value = `${error.code || error.error || ""} ${error.message || ""}`.toLowerCase();
  if (/timeout|timed out/.test(value)) return "timeout";
  if (/denied|permission|not-allowed|restricted/.test(value)) return "denied";
  if (/unimplemented|not implemented|unsupported|not supported/.test(value)) return "unsupported";
  if (/interrupted|aborted|cancel/.test(value)) return "interrupted";
  if (/unavailable|network|audio-capture|audio_format/.test(value)) return "unavailable";
  return "recognition";
}

export function createAskMeetroVoiceInput({ native = false, plugin, pluginAvailable = true, Recognition,
  language = "en-US", onState = () => {}, onTranscript = () => {}, onNotice = () => {},
  timeoutMs = 60000 } = {}) {
  let active = null, closing = false;
  function permissionGranted(value) {
    return value?.speechRecognition === "granted" && (!value.microphone || value.microphone === "granted");
  }
  function isCurrent(run) { return active === run; }
  async function finish(run, { text = "", notice = "", cancel = false } = {}) {
    if (!isCurrent(run)) return;
    active = null; closing = true; clearTimeout(run.timer);
    for (const listener of run.listeners) { try { await listener.remove(); } catch { /* listener already removed */ } }
    if (native) { try { await plugin.stop(); } catch { /* preserve the original recognition outcome */ } }
    else if (run.recognition) {
      run.recognition.onstart = run.recognition.onresult = run.recognition.onerror = run.recognition.onend = null;
      try { run.recognition.abort(); } catch { /* already ended */ }
    }
    if (!cancel && text.trim()) onTranscript(text.trim());
    if (!cancel && notice && (!text.trim() || notice === ASK_VOICE_NOTICE.timeout)) onNotice(notice);
    closing = false; onState("idle");
  }
  async function start() {
    if (active || closing) return;
    const run = { listeners: [], transcript: "", recognition: null, timer: null };
    active = run; onNotice(""); onState("starting");
    run.timer = setTimeout(() => { void finish(run, { text: run.transcript, notice: ASK_VOICE_NOTICE.timeout }); }, timeoutMs);
    try {
      if (native) {
        if (!pluginAvailable) return await finish(run, { notice: ASK_VOICE_NOTICE.unsupported });
        const capability = await plugin.available({ language });
        if (!isCurrent(run)) return;
        if (capability.supported === false) return await finish(run, { notice: ASK_VOICE_NOTICE.unsupported });
        if (!capability.available) return await finish(run, { notice: ASK_VOICE_NOTICE.unavailable });
        let permission = await plugin.checkPermissions();
        if (!isCurrent(run)) return;
        if (permission.speechRecognition === "denied" || permission.microphone === "denied") return await finish(run, { notice: ASK_VOICE_NOTICE.denied });
        if (!permissionGranted(permission)) {
          onState("permission"); permission = await plugin.requestPermissions();
        }
        if (!isCurrent(run)) return;
        if (!permissionGranted(permission)) return await finish(run, { notice: ASK_VOICE_NOTICE.denied });
        for (const [event, listener] of [
          ["partialResults", (result) => { if (isCurrent(run)) run.transcript = String(result.matches?.[0] || ""); }],
          ["listeningState", (result) => { if (isCurrent(run) && result.status === "started") onState("listening"); }],
        ]) {
          const handle = await plugin.addListener(event, listener);
          if (!isCurrent(run)) { await handle.remove(); return; }
          run.listeners.push(handle);
        }
        if (!isCurrent(run)) return;
        const result = await plugin.start({ language, maxResults: 1, partialResults: true, popup: false });
        await finish(run, { text: String(result.matches?.[0] || run.transcript), notice: result.reason === "timeout" ? ASK_VOICE_NOTICE.timeout : (!result.matches?.[0] && !run.transcript ? ASK_VOICE_NOTICE.recognition : "") });
      } else {
        if (!Recognition) return await finish(run, { notice: ASK_VOICE_NOTICE.browserUnsupported });
        const recognition = new Recognition(); run.recognition = recognition;
        recognition.lang = language; recognition.interimResults = true; recognition.continuous = false;
        recognition.onstart = () => { if (isCurrent(run)) onState("listening"); };
        recognition.onresult = (event) => {
          if (!isCurrent(run)) return;
          run.transcript = Array.from(event.results).map((result) => result[0]?.transcript || "").join(" ").trim();
          if (event.results[event.results.length - 1]?.isFinal) void finish(run, { text: run.transcript });
        };
        recognition.onerror = (error) => { void finish(run, { notice: ASK_VOICE_NOTICE[classifyAskVoiceError(error)] }); };
        recognition.onend = () => { void finish(run, { text: run.transcript, notice: ASK_VOICE_NOTICE.recognition }); };
        recognition.start();
      }
    } catch (error) { await finish(run, { notice: ASK_VOICE_NOTICE[classifyAskVoiceError(error)] }); }
  }
  return {
    start,
    stop: () => active ? finish(active, { text: active.transcript, notice: ASK_VOICE_NOTICE.recognition }) : Promise.resolve(),
    cancel: () => active ? finish(active, { cancel: true }) : Promise.resolve(),
  };
}
