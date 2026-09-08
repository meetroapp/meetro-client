import { clearGenericNewQuoteContext } from "../utils/newQuoteCustomerSetup.js";
import { stageQuoteInvoiceInstruction } from "../utils/quoteToInvoice.js";
import { guardFriendsAndFamilyMediaUpload } from "../utils/mediaDeferral.js";
import { NativeSpeechRecognition } from "../utils/assistantSpeechRecognition.js";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import MeetroIcon from "./MeetroIcon";
import BottomNav from "./BottomNav";
import { askMeetroReply, resolveAskMeetroActions } from "../utils/askMeetro.js";
import { reviewAskMeetroCompletion, applyAskMeetroCompletion } from "../utils/askMeetroCompletion.js";
import "../styles/homeDashboard.css";
import "./AskMeetroWorkspace.css";


const suggestions = {
  business: [["Update a job", "Mark this job as completed."], ["Schedule a visit", "Schedule a consultation for Friday at 10 AM."], ["Create a quote", "Create a quote for interior painting."], ["Find new opportunities", "Show me new leads near Cape Coral."]],
  personal: [["Track my project", "Show me the next step for this project."], ["Continue a conversation", "Open my conversations."], ["Request a service", "Help me describe a new service request."], ["Review a quote", "Help me understand this quote."]],
};

export default function AskMeetroWorkspace({ context = {}, role = "personal", initialQuestion = "", currentPage = "home", onClose, setPage, session, onSessionChange, completionApi = { review: reviewAskMeetroCompletion, apply: applyAskMeetroCompletion } }) {
  const [input, setInput] = useState(initialQuestion);
  const [messages, setMessages] = useState(session?.messages || []);
  const [actions, setActions] = useState(session?.actions || []);
  const [receipts, setReceipts] = useState(session?.receipts || []);
  const [files, setFiles] = useState([]);
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [viewport, setViewport] = useState(null);
  const composerRef = useRef(null), attachRef = useRef(null), photoRef = useRef(null), bottomRef = useRef(null), speechRef = useRef(null);
  const inFlight = useRef(false), mounted = useRef(true), filesRef = useRef([]);

  useEffect(() => { onSessionChange?.({ messages, actions, receipts, contextKey: JSON.stringify(context) }); }, [messages, actions, receipts, context, onSessionChange]);
  useEffect(() => { if (messages.length || actions.length || receipts.length) bottomRef.current?.scrollIntoView({ block: "nearest" }); }, [messages, actions, receipts]);
  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => setViewport(vv ? { height: vv.height, top: vv.offsetTop, keyboard: window.innerHeight - vv.height > 120 } : null);
    update(); vv?.addEventListener("resize", update); vv?.addEventListener("scroll", update);
    return () => { vv?.removeEventListener("resize", update); vv?.removeEventListener("scroll", update); };
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      speechRef.current?.abort?.();
      if (Capacitor.isNativePlatform()) void NativeSpeechRecognition.stop().catch(() => {});
      filesRef.current.forEach((file) => { if (file.url) URL.revokeObjectURL(file.url); });
    };
  }, []);

  async function send(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const next = await resolveAskMeetroActions(text, { context, role, setPage });
      if (!mounted.current) return;
      setMessages((current) => [...current, { role: "user", text }, { role: "assistant", text: next.find((action) => action.blockedReason)?.blockedReason || askMeetroReply(next) }]);
      setActions(next); setReview(null); setInput("");
    } catch { if (mounted.current) setError("The record could not be verified. Try again from the exact record."); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  function attach(event) {
    if (!guardFriendsAndFamilyMediaUpload({ event, onDeferred: setError })) return;
    const selected = [...event.target.files].filter((file) => file.size <= 20 * 1024 * 1024).slice(0, 10 - filesRef.current.length);
    if (selected.length !== event.target.files.length) setError("Choose files smaller than 20 MB.");
    const next = [...filesRef.current, ...selected.map((file) => ({ file, name: file.name, url: file.type.startsWith("image/") ? URL.createObjectURL(file) : "" }))].slice(0, 10);
    filesRef.current = next; setFiles(next); event.target.value = "";
  }
  function removeFile(index) {
    if (files[index]?.url) URL.revokeObjectURL(files[index].url);
    filesRef.current = files.filter((_, i) => i !== index); setFiles(filesRef.current);
  }
  async function voice() {
    setError("");
    if (listening) { speechRef.current?.stop?.(); if (Capacitor.isNativePlatform()) await NativeSpeechRecognition.stop(); setListening(false); return; }
    if (Capacitor.isNativePlatform()) {
      try {
        await NativeSpeechRecognition.requestPermissions(); setListening(true);
        const result = await NativeSpeechRecognition.start({ language: "en-US", maxResults: 1, partialResults: false, popup: true });
        if (mounted.current) { setInput((previous) => [previous, result.matches?.[0]].filter(Boolean).join(" ")); setListening(false); }
      } catch { if (mounted.current) { setListening(false); setError("Voice is unavailable. You can type your message."); } }
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setError("Voice is unavailable in this browser. You can type your message."); return; }
    const recognition = new Recognition(); speechRef.current = recognition; recognition.lang = "en-US";
    recognition.onresult = (event) => { if (mounted.current) setInput((previous) => [previous, event.results[0][0].transcript].filter(Boolean).join(" ")); };
    recognition.onend = () => { if (mounted.current) setListening(false); };
    recognition.onerror = () => { if (mounted.current) { setListening(false); setError("Voice could not hear you. Try again or type your message."); } };
    try { recognition.start(); setListening(true); } catch { setError("Voice is unavailable. You can type your message."); }
  }
  async function openReview(selection) {
    if (inFlight.current) return;
    setError(""); setReview({ actions: selection, prepared: null });
    if (selection.length === 1 && selection[0].kind === "COMPLETE_JOB" && context.jobId && role === "business") {
      inFlight.current = true; setBusy(true);
      try {
        const prepared = await completionApi.review(selection[0], { role, setPage });
        if (mounted.current) setReview({ actions: selection, prepared });
      } catch (failure) { if (mounted.current) setError(failure.message); }
      finally { inFlight.current = false; if (mounted.current) setBusy(false); }
    }
  }
  async function apply() {
    if (!review?.prepared || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const receipt = await completionApi.apply(review.prepared, { role, setPage, confirmed: true });
      if (mounted.current) {
        setReceipts((current) => [...current, receipt]);
        setActions((current) => current.filter((action) => action.id !== review.prepared.action.id));
        setReview(null);
      }
    } catch (failure) { if (mounted.current) setError(`${failure.message} No completion receipt was confirmed.`); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  function openRecord(action) {
    if (!action.route) return;
    // Navigation delegates to the original reviewer; it is never a success receipt.
    if (action.kind === "NEW_QUOTE") clearGenericNewQuoteContext();
    if (action.kind === "QUOTE_TO_INVOICE") stageQuoteInvoiceInstruction(action.route, action.instruction);
    setReview(null); setPage(action.route);
  }
  const subject = context.label || context.draftId || context.jobId || context.invoiceId || context.requestId || context.conversationId || context.relationshipId;
  return <div className={`ask-meetro-shell${viewport?.keyboard ? " is-keyboard-open" : ""}`} style={viewport ? { height: viewport.height, top: viewport.top } : undefined}>
    <main className="ask-meetro-workspace" aria-labelledby="ask-meetro-title">
      <header className="ask-meetro-header"><div><span className="ask-meetro-mark" aria-hidden="true">M</span><h1 id="ask-meetro-title">Ask Meetro</h1></div><button type="button" onClick={onClose} disabled={busy} aria-label="Close Ask Meetro">×</button></header>
      {subject ? <div className="ask-meetro-context"><MeetroIcon name="workCenter" size={18} decorative /><span>Working with: {subject}</span><small>Exact record context · changes require review</small></div> : null}
      <div className="ask-meetro-conversation" role="region" aria-label="Ask Meetro conversation">
        {!messages.length ? <section className="ask-meetro-welcome"><span className="ask-meetro-welcome-mark" aria-hidden="true">M</span><h2>Your assistant for real work.</h2><p>Tell me what you need. I'll help you take action, find information, and keep your work organized.</p><div className="ask-meetro-capabilities"><span>Understand</span><span>Take Action</span><span>Keep It Organized</span></div><div className="ask-meetro-suggestions">{suggestions[role === "business" ? "business" : "personal"].map(([title, prompt]) => <button key={title} type="button" onClick={() => { setInput(prompt); composerRef.current?.focus(); }}><strong>{title}</strong><span>{prompt}</span><MeetroIcon name="openExternal" size={20} decorative /></button>)}</div></section> : <div role="log" aria-live="polite">{messages.map((message, index) => <article key={index} className={`ask-meetro-message is-${message.role}`}><strong>{message.role === "user" ? "You" : "Meetro"}</strong><p>{message.text}</p></article>)}</div>}
        {actions.length > 0 && !review ? <section className="ask-meetro-actions" aria-label="Proposed actions"><div className="ask-meetro-section-heading"><h2>{actions.length} {actions.length === 1 ? "action" : "actions"} to review</h2><button type="button" onClick={() => openReview(actions)}>Review all</button></div>{actions.map((action) => <article key={action.id}><div><span>Proposed · not applied</span><h3>{action.title}</h3><p>{action.blockedReason || (action.route ? "Continue with the exact record and its existing review." : "Choose the exact record in Meetro before applying changes.")}</p><dl>{action.details?.map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl></div><button type="button" onClick={() => openReview([action])}>Review</button></article>)}</section> : null}
        {review ? <section className="ask-meetro-review" aria-label="Review actions"><h2>Review {review.actions.length} {review.actions.length === 1 ? "action" : "actions"}</h2><p>I'll only update information with your confirmation.</p>{review.actions.map((action) => <article key={action.id}><h3>{action.title}</h3><blockquote>{action.instruction}</blockquote><dl>{action.details?.map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}<div><dt>Record</dt><dd>{action.context?.label || action.context?.draftId || subject || "Exact record not selected"}</dd></div><div><dt>Status</dt><dd>{review.prepared ? "Eligible for completion · not applied" : "Review required in the existing Meetro workflow"}</dd></div>{review.prepared ? <div><dt>Reviewed Job version</dt><dd>{review.prepared.review.currentVersion}</dd></div> : null}</dl>{!review.prepared && action.route ? <button type="button" disabled={busy} onClick={() => openRecord(action)}>Open record to review</button> : null}{!action.route && !review.prepared ? <button type="button" onClick={() => setPage(role === "business" ? "contractorDashboard" : "myRequests")}>Choose record in Work Center</button> : null}</article>)}{busy ? <p role="status">Checking the exact record…</p> : null}<div className="ask-meetro-review-controls"><button type="button" disabled={busy} onClick={() => { setInput(review.actions[0].instruction); setReview(null); composerRef.current?.focus(); }}>Change details</button><button type="button" disabled={busy} onClick={() => { setReview(null); setError(""); }}>Cancel</button>{review.prepared ? <button type="button" className="ask-meetro-primary" disabled={busy} onClick={apply}>Confirm &amp; Apply</button> : null}</div></section> : null}
        {receipts.length ? <section className="ask-meetro-receipts" aria-label="Actions Completed"><h2>Actions Completed</h2>{receipts.map((receipt) => <article key={receipt.evidenceId}><div><h3>✓ {receipt.title}</h3><p>{receipt.detail}</p><small>Record {receipt.recordId} · Version {receipt.version}</small></div><button type="button" onClick={() => setPage(receipt.route)}>View</button></article>)}<p>These confirmed actions have been saved to the appropriate Meetro records.{actions.length ? " Other proposed actions still need review." : ""}</p></section> : null}
        <div ref={bottomRef} />
      </div>
      <footer className="ask-meetro-footer">
        {error ? <p className="ask-meetro-error" role="alert">{error}</p> : null}
        {files.length ? <section className="ask-meetro-attachments" aria-label="Local attachments">{files.map((file, index) => <div key={`${file.name}-${index}`}>{file.url ? <img src={file.url} alt={file.name} /> : <MeetroIcon name="requestDetails" size={20} decorative />}<span>{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => removeFile(index)}>×</button></div>)}<p>Local attachments are not yet saved to a Meetro record. Use the Project Folder's reviewed upload to document them.</p></section> : null}
        <form className="ask-meetro-composer" onSubmit={send}><input ref={attachRef} type="file" multiple hidden onChange={attach} /><input ref={photoRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={attach} /><button type="button" aria-label="Attach" onClick={() => attachRef.current?.click()}><MeetroIcon name="addProject" size={20} decorative /></button><button type="button" aria-label="Photo" onClick={() => photoRef.current?.click()}><MeetroIcon name="portfolio" size={20} decorative /></button><textarea ref={composerRef} aria-label="Ask Meetro anything" placeholder="Ask Meetro anything..." value={input} maxLength={5000} rows={1} onChange={(event) => setInput(event.target.value)} /><button type="button" aria-label={listening ? "Stop voice" : "Voice"} aria-pressed={listening} onClick={voice}><MeetroIcon name="microphone" size={20} decorative /></button><button type="submit" className="ask-meetro-send" aria-label="Send" disabled={!input.trim() || busy}><MeetroIcon name="publishProject" size={20} decorative /></button></form>
        <p className="ask-meetro-principle">Ask Meetro talks. Meetro records.</p>
      </footer>
    </main>
    <BottomNav setPage={setPage} currentPage={currentPage} />
  </div>;
}
