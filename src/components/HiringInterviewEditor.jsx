import { useEffect, useRef, useState } from "react";
import { t } from "../utils/language";
import { HIRING_INTERVIEW_TYPES } from "../utils/hiringInterviews";

const EMPTY_FORM = Object.freeze({
  interviewType: "phone",
  date: "",
  startTime: "",
  endTime: "",
  timezone: "America/New_York",
  location: "",
  meetingUrl: "",
  notes: "",
});

function formFromInterview(interview) {
  return interview
    ? Object.fromEntries(Object.keys(EMPTY_FORM).map((key) => [key, interview[key] || EMPTY_FORM[key]]))
    : { ...EMPTY_FORM };
}

export default function HiringInterviewEditor({
  applicant,
  position,
  interview,
  errors = {},
  onSave,
  onCancelInterview,
  onComplete,
  onClose,
}) {
  const [form, setForm] = useState(() => formFromInterview(interview));
  const titleRef = useRef(null);
  const finalStatus = ["completed", "cancelled", "no_show"].includes(interview?.status);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    if (!finalStatus) onSave(form);
  }

  return (
    <div className="meetro-interview-workspace" role="presentation" onClick={onClose}>
      <form
        className="meetro-interview-sheet meetro-visual-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hiring-interview-title"
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        noValidate
      >
        <div style={handle} />
        <header style={header}>
          <div>
            <p style={eyebrow}>{t("hiringCenter")}</p>
            <h2 id="hiring-interview-title" tabIndex={-1} ref={titleRef} style={title}>
              {finalStatus ? t("interviewDetails") : interview ? t("rescheduleInterview") : t("scheduleInterview")}
            </h2>
          </div>
          <button type="button" style={closeButton} onClick={onClose} aria-label={t("close")}>×</button>
        </header>

        {interview?.status && (
          <div style={statusNotice} role="status" aria-live="polite">
            {t(`hiringInterviewStatus${interview.status[0].toUpperCase()}${interview.status.slice(1)}`)}
          </div>
        )}

        <div style={identityGrid}>
          <ReadOnlyField label={t("applicant")} value={applicant?.name} />
          <ReadOnlyField label={t("position")} value={position?.title} />
        </div>

        <label style={fieldLabel}>
          {t("interviewType")}
          <select style={input} value={form.interviewType} disabled={finalStatus} onChange={(event) => update("interviewType", event.target.value)}>
            {HIRING_INTERVIEW_TYPES.map((type) => (
              <option key={type} value={type}>{t(`hiringInterviewType${type === "in_person" ? "InPerson" : type[0].toUpperCase() + type.slice(1)}`)}</option>
            ))}
          </select>
          <FieldError value={errors.interviewType} />
        </label>

        <div style={dateGrid}>
          <InterviewField id="interview-date" type="date" label={t("date")} value={form.date} disabled={finalStatus} error={errors.date} onChange={(value) => update("date", value)} />
          <InterviewField id="interview-start" type="time" label={t("startTime")} value={form.startTime} disabled={finalStatus} error={errors.startTime} onChange={(value) => update("startTime", value)} />
          <InterviewField id="interview-end" type="time" label={t("endTime")} value={form.endTime} disabled={finalStatus} error={errors.endTime} onChange={(value) => update("endTime", value)} />
        </div>

        <InterviewField id="interview-timezone" label={t("timeZone")} value={form.timezone} disabled={finalStatus} error={errors.timezone} onChange={(value) => update("timezone", value)} />

        {form.interviewType === "in_person" && (
          <InterviewField id="interview-location" label={t("location")} value={form.location} disabled={finalStatus} error={errors.location} onChange={(value) => update("location", value)} />
        )}
        {form.interviewType === "video" && (
          <InterviewField id="interview-meeting-url" type="url" label={t("meetingLink")} value={form.meetingUrl} disabled={finalStatus} error={errors.meetingUrl} onChange={(value) => update("meetingUrl", value)} />
        )}

        <label style={fieldLabel} htmlFor="interview-notes">
          {t("notes")}
          <textarea id="interview-notes" style={textarea} value={form.notes} disabled={finalStatus} onChange={(event) => update("notes", event.target.value)} />
        </label>

        {errors.accountMode && <div role="alert" style={errorBanner}>{t("businessAccountRequired")}</div>}
        {(errors.businessId || errors.positionId || errors.applicantId || errors.status) && (
          <div role="alert" style={errorBanner}>{t("hiringInterviewIdentityError")}</div>
        )}

        <div style={actions}>
          {finalStatus ? (
            <button type="button" className="meetro-visual-primary-button" style={primaryButton} onClick={onClose}>{t("close")}</button>
          ) : (
            <>
              {interview && <button type="button" style={dangerButton} onClick={onCancelInterview}>{t("cancelInterview")}</button>}
              {interview && <button type="button" style={secondaryButton} onClick={onComplete}>{t("markInterviewComplete")}</button>}
              <button type="button" style={secondaryButton} onClick={onClose}>{t("close")}</button>
              <button type="submit" className="meetro-visual-primary-button" style={primaryButton}>{interview ? t("saveChanges") : t("scheduleInterview")}</button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return <div style={readOnlyField}><span>{label}</span><strong>{value || t("required")}</strong></div>;
}

function InterviewField({ id, label, value, error, onChange, type = "text", disabled }) {
  return (
    <label style={fieldLabel} htmlFor={id}>
      {label}
      <input id={id} type={type} style={{ ...input, ...(error ? inputError : {}) }} value={value} disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => onChange(event.target.value)} />
      <FieldError id={`${id}-error`} value={error} />
    </label>
  );
}

function FieldError({ id, value }) {
  if (!value) return null;
  const key = value === "invalid_date" ? "invalidDate" : value === "invalid_time" ? "invalidTime" : value === "invalid_url" ? "invalidMeetingLink" : value === "end_before_start" ? "endAfterStart" : "required";
  return <span id={id} role="alert" style={errorText}>{t(key)}</span>;
}

const handle = { width: 52, height: 5, borderRadius: 999, background: "#c8c4b8", margin: "0 auto 14px" };
const header = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 };
const eyebrow = { margin: "0 0 4px", color: "var(--meetro-color-forest, #1f4d34)", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const title = { margin: 0, color: "#15271d", fontSize: 24, lineHeight: 1.2, outline: "none" };
const closeButton = { width: 44, height: 44, borderRadius: 999, border: "1px solid #d8d1c2", background: "#fffdf8", color: "#173c28", fontSize: 28, cursor: "pointer" };
const statusNotice = { padding: "10px 12px", borderRadius: 8, background: "#e8efe7", color: "#28553a", fontWeight: 800 };
const identityGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 10 };
const readOnlyField = { display: "grid", gap: 4, padding: 12, borderRadius: 8, border: "1px solid #ddd5c5", background: "#f8f4eb", color: "#405247", minWidth: 0 };
const fieldLabel = { display: "grid", gap: 7, color: "#253a2e", fontSize: 14, fontWeight: 800, minWidth: 0 };
const dateGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))", gap: 10 };
const input = { width: "100%", maxWidth: "100%", minWidth: 0, minHeight: 48, boxSizing: "border-box", borderRadius: 8, border: "1px solid #d8d1c2", background: "#fffdf8", color: "#17251d", padding: "10px 12px", fontSize: 16, outlineColor: "#315f42" };
const inputError = { borderColor: "#a43b34" };
const textarea = { ...input, minHeight: 96, resize: "vertical" };
const errorText = { color: "#9b302b", fontSize: 13, fontWeight: 700 };
const errorBanner = { padding: 12, borderRadius: 8, background: "#fff1ef", color: "#8f2f29", fontWeight: 800 };
const actions = { display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 10, paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))" };
const secondaryButton = { minHeight: 44, borderRadius: 8, border: "1px solid #bdb5a4", background: "#fffdf8", color: "#244532", padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const dangerButton = { ...secondaryButton, color: "#9b302b", borderColor: "#d7aaa5" };
const primaryButton = { minHeight: 44, borderRadius: 8, padding: "10px 16px", cursor: "pointer" };
