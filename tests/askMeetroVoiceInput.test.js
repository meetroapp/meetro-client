import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createAskMeetroVoiceInput, ASK_VOICE_NOTICE } from "../src/utils/askMeetroVoiceInput.js";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
function fixture(overrides = {}) {
  const states = [], transcripts = [], notices = [], calls = [], events = {};
  let resolveStart, rejectStart;
  const plugin = {
    available: async () => ({ available: true, supported: true }),
    checkPermissions: async () => ({ speechRecognition: "granted", microphone: "granted" }),
    requestPermissions: async () => ({ speechRecognition: "granted", microphone: "granted" }),
    addListener: async (name, listener) => { events[name] = listener; return { remove: async () => { delete events[name]; calls.push(`remove:${name}`); } }; },
    start: async (options) => { calls.push(["start", options]); events.listeningState({ status: "started" }); return new Promise((resolve, reject) => { resolveStart = resolve; rejectStart = reject; }); },
    stop: async () => { calls.push("stop"); resolveStart?.({ matches: [] }); },
    ...overrides.plugin,
  };
  const voice = createAskMeetroVoiceInput({ native: true, onState: (s) => states.push(s), onTranscript: (s) => transcripts.push(s), onNotice: (s) => notices.push(s), ...overrides, plugin });
  return { voice, states, transcripts, notices, calls, events, resolve: (value) => resolveStart(value), reject: (value) => rejectStart(value) };
}

test("native selection requests permission when needed and returns text only", async () => {
  let requested = 0;
  const f = fixture({ plugin: { checkPermissions: async () => ({ speechRecognition: "prompt", microphone: "prompt" }), requestPermissions: async () => { requested++; return { speechRecognition: "granted", microphone: "granted" }; } } });
  const started = f.voice.start(); await tick();
  assert.equal(requested, 1); assert.deepEqual(f.states, ["starting", "permission", "listening"]);
  assert.deepEqual(f.calls[0][1], { language: "en-US", maxResults: 1, partialResults: true, popup: false });
  f.resolve({ matches: ["Complete this job"] }); await started;
  assert.deepEqual(f.transcripts, ["Complete this job"]);
  assert.equal(f.states.at(-1), "idle"); assert.equal(Object.keys(f.events).length, 0);
});
for (const [label, options, expected] of [
  ["missing native bridge", { pluginAvailable: false }, ASK_VOICE_NOTICE.unsupported],
  ["unsupported native locale", { plugin: { available: async () => ({ supported: false, available: false }) } }, ASK_VOICE_NOTICE.unsupported],
  ["temporarily unavailable recognizer", { plugin: { available: async () => ({ supported: true, available: false }) } }, ASK_VOICE_NOTICE.unavailable],
  ["denied permission", { plugin: { checkPermissions: async () => ({ speechRecognition: "denied" }) } }, ASK_VOICE_NOTICE.denied],
  ["permission prompt denied", { plugin: { checkPermissions: async () => ({ speechRecognition: "prompt" }), requestPermissions: async () => ({ speechRecognition: "denied" }) } }, ASK_VOICE_NOTICE.denied],
  ["unsupported browser", { native: false }, ASK_VOICE_NOTICE.browserUnsupported],
]) test(`${label} preserves a truthful typed-input fallback`, async () => {
  const f = fixture(options); await f.voice.start();
  assert.equal(f.notices.at(-1), expected); assert.equal(f.states.at(-1), "idle");
  assert.deepEqual(f.transcripts, []); assert.ok(!f.calls.some((call) => Array.isArray(call) && call[0] === "start"));
});
for (const [code, expected] of [["SPEECH_RECOGNITION_FAILED", "recognition"], ["SPEECH_INTERRUPTED", "interrupted"], ["SPEECH_PERMISSION_DENIED", "denied"], ["SPEECH_UNAVAILABLE", "unavailable"]]) test(`native ${code} is distinct and permits another attempt`, async () => {
  const f = fixture(); const first = f.voice.start(); await tick();
  f.reject({ code }); await first;
  assert.equal(f.notices.at(-1), ASK_VOICE_NOTICE[expected]);
  const second = f.voice.start(); await tick(); f.resolve({ matches: ["Try again"] }); await second;
  assert.deepEqual(f.transcripts, ["Try again"]);
});
test("native stop preserves the latest partial once and cleans up", async () => {
  const f = fixture(); const started = f.voice.start(); await tick();
  f.events.partialResults({ matches: ["Window repair"] });
  await f.voice.stop(); await started;
  assert.deepEqual(f.transcripts, ["Window repair"]); assert.equal(Object.keys(f.events).length, 0);
});
test("duplicate start and teardown cannot inject a late transcript", async () => {
  const f = fixture(); const started = f.voice.start(); await tick();
  await f.voice.start(); assert.equal(f.calls.filter((call) => Array.isArray(call)).length, 1);
  const oldResult = f.events.partialResults;
  await f.voice.cancel(); oldResult({ matches: ["Must not appear"] }); await started;
  assert.deepEqual(f.transcripts, []); assert.equal(Object.keys(f.events).length, 0);
});
test("cancelling during permission does not start a late native recording", async () => {
  let completePermission;
  const f = fixture({ plugin: { checkPermissions: () => new Promise((resolve) => { completePermission = resolve; }) } });
  const started = f.voice.start(); await tick(); await f.voice.cancel();
  completePermission({ speechRecognition: "granted" }); await started;
  assert.ok(!f.calls.some((call) => Array.isArray(call))); assert.deepEqual(f.transcripts, []);
});
test("a missing final callback times out and releases recording", async () => {
  const f = fixture({ timeoutMs: 5 }); const started = f.voice.start(); await started;
  assert.equal(f.states.at(-1), "idle"); assert.equal(f.notices.at(-1), ASK_VOICE_NOTICE.recognition);
});
test("browser path reports permission denial and can retry without using native speech", async () => {
  let recognition;
  class Recognition { constructor() { recognition = this; } start() { this.onstart(); } abort() {} }
  const f = fixture({ native: false, Recognition }); await f.voice.start();
  recognition.onerror({ error: "not-allowed" }); await tick();
  assert.equal(f.notices.at(-1), ASK_VOICE_NOTICE.denied);
  await f.voice.start(); const result = [{ transcript: "Editable words" }]; result.isFinal = true;
  recognition.onresult({ results: [result] }); await tick();
  assert.deepEqual(f.transcripts, ["Editable words"]); assert.deepEqual(f.calls, []);
});
test("native bridge, source inclusion and usage descriptions exist without another dependency", () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
  const source = read("../ios/App/App/SpeechRecognition.swift");
  assert.match(source, /import Speech/); assert.match(source, /import AVFoundation/);
  assert.match(source, /generation == currentGeneration/);
  assert.match(source, /recognitionTask\?\.cancel\(\)/);
  assert.match(source, /setActive\(false/);
  assert.match(source, /Speech recognition is temporarily unavailable/);
  assert.match(source, /sampleRate > 0, format.channelCount > 0/);
  assert.match(read("../ios/App/App/MainViewController.swift"), /registerPluginInstance\(SpeechRecognition\(\)\)/);
  assert.match(read("../ios/App/App/Base.lproj/Main.storyboard"), /customClass="MainViewController"/);
  assert.match(read("../ios/App/App.xcodeproj/project.pbxproj"), /SpeechRecognition.swift in Sources/);
  const plist = read("../ios/App/App/Info.plist");
  assert.match(plist, /NSMicrophoneUsageDescription/); assert.match(plist, /NSSpeechRecognitionUsageDescription/);
  // Structural/capability tests and an unsigned native build do not certify a physical microphone.
});
