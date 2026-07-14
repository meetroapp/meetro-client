import { useEffect, useRef, useState } from "react";
import {
  APPLICATION_REQUIREMENT_KEYS,
  BACKGROUND_CHECK_PREFERENCE_KEYS,
  SUPPORTED_HIRING_NOTIFICATION_EVENTS,
  WORK_ELIGIBILITY_BOOLEAN_KEYS,
  addHiringCustomQuestion,
  normalizeHiringSettings,
} from "../utils/hiringSettings";
import { t } from "../utils/language";

const APPLICATION_LABELS = Object.freeze({
  resumeRequired: "hiringSettingsResumeRequired",
  phoneRequired: "hiringSettingsPhoneRequired",
  emailRequired: "hiringSettingsEmailRequired",
  addressRequired: "hiringSettingsAddressRequired",
  workHistoryRequired: "hiringSettingsWorkHistoryRequired",
  referencesRequired: "hiringSettingsReferencesRequired",
  availabilityRequired: "hiringSettingsAvailabilityRequired",
  licenseRequired: "hiringSettingsLicenseRequired",
  portfolioRequired: "hiringSettingsPortfolioRequired",
  coverNoteRequired: "hiringSettingsCoverNoteRequired",
});

const NOTIFICATION_LABELS = Object.freeze({
  newApplication: "hiringSettingsNewApplication",
  applicantMessage: "hiringSettingsApplicantMessage",
  interviewScheduled: "hiringSettingsInterviewScheduled",
  interviewRescheduled: "hiringSettingsInterviewRescheduled",
  interviewCancelled: "hiringSettingsInterviewCancelled",
  interviewCompleted: "hiringSettingsInterviewCompleted",
  teamMemberCreated: "hiringSettingsTeamMemberCreated",
});

const BACKGROUND_LABELS = Object.freeze({
  backgroundCheckRequested: "hiringSettingsBackgroundCheckRequested",
  criminalHistoryCheckPreferred: "hiringSettingsCriminalHistoryPreferred",
  drivingRecordCheckPreferred: "hiringSettingsDrivingRecordPreferred",
  identityVerificationPreferred: "hiringSettingsIdentityVerificationPreferred",
  professionalLicenseVerificationPreferred: "hiringSettingsProfessionalLicensePreferred",
  consentRequired: "hiringSettingsConsentRequired",
});

const ELIGIBILITY_LABELS = Object.freeze({
  authorizedToWorkRequired: "hiringSettingsAuthorizedToWorkRequired",
  validDriverLicenseRequired: "hiringSettingsValidDriverLicenseRequired",
  reliableTransportationRequired: "hiringSettingsReliableTransportationRequired",
  physicalRequirementsAcknowledgement: "hiringSettingsPhysicalRequirementsAcknowledgement",
  scheduleAvailabilityRequired: "hiringSettingsScheduleAvailabilityRequired",
});

export default function HiringSettingsWorkspace({ settings, language, onSave, onClose }) {
  const [draft, setDraft] = useState(() => normalizeHiringSettings(settings, {
    businessId: settings?.businessId || "",
  }));
  const [questionPrompt, setQuestionPrompt] = useState("");
  const [questionError, setQuestionError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isAvailable = Boolean(draft.businessId);

  if (!isAvailable) {
    return (
      <div className="hiring-settings-overlay" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
        <section
          className="hiring-settings-workspace meetro-visual-surface"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hiring-settings-title"
        >
          <header className="hiring-settings-header">
            <div>
              <p>{t("businessTools", language)}</p>
              <h2 id="hiring-settings-title" ref={titleRef} tabIndex={-1}>
                {t("hiringSettings", language)}
              </h2>
            </div>
            <button type="button" onClick={onClose} aria-label={t("close", language)}>×</button>
          </header>
          <div className="hiring-settings-content">
            <p className="hiring-settings-intro" role="status">
              {t("hiringSettingsUnavailable", language)}
            </p>
            <div className="hiring-settings-actions">
              <button type="button" className="meetro-visual-primary-button" onClick={onClose}>
                {t("cancel", language)}
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  function updateSection(section, field, value) {
    setSaved(false);
    setDraft((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
    }));
  }

  function addQuestion() {
    const result = addHiringCustomQuestion(
      draft.applicationRequirements,
      { prompt: questionPrompt },
      {}
    );
    if (!result.ok) {
      setQuestionError(t(
        result.errors.prompt === "duplicate"
          ? "hiringSettingsDuplicateQuestion"
          : "hiringSettingsQuestionRequired",
        language
      ));
      return;
    }
    setQuestionError("");
    setQuestionPrompt("");
    setSaved(false);
    setDraft((current) => ({
      ...current,
      applicationRequirements: result.requirements,
    }));
  }

  function updateQuestion(questionId, field, value) {
    setSaved(false);
    setDraft((current) => ({
      ...current,
      applicationRequirements: {
        ...current.applicationRequirements,
        customQuestions: current.applicationRequirements.customQuestions.map((question) =>
          question.id === questionId
            ? { ...question, [field]: value, updatedAt: new Date().toISOString() }
            : question
        ),
      },
    }));
  }

  function removeQuestion(questionId) {
    setSaved(false);
    setDraft((current) => ({
      ...current,
      applicationRequirements: {
        ...current.applicationRequirements,
        customQuestions: current.applicationRequirements.customQuestions.filter(
          (question) => question.id !== questionId
        ),
      },
    }));
  }

  function submit(event) {
    event.preventDefault();
    const result = onSave(draft);
    if (!result?.ok) {
      setSaved(false);
      setSaveError(
        result?.errors?.customQuestions
          ? t("hiringSettingsQuestionRequired", language)
          : t("hiringSettingsSaveFailed", language)
      );
      return;
    }
    setDraft(result.settings);
    setSaveError("");
    setSaved(true);
  }

  return (
    <div className="hiring-settings-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <form
        className="hiring-settings-workspace meetro-visual-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hiring-settings-title"
        onSubmit={submit}
        noValidate
      >
        <header className="hiring-settings-header">
          <div>
            <p>{t("businessTools", language)}</p>
            <h2 id="hiring-settings-title" ref={titleRef} tabIndex={-1}>
              {t("hiringSettings", language)}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t("close", language)}>×</button>
        </header>

        <div className="hiring-settings-content">
          <p className="hiring-settings-intro">{t("hiringSettingsIntro", language)}</p>

          <SettingsSection title={t("hiringSettingsApplicationRequirements", language)} open>
            <p>{t("hiringSettingsApplicationHelp", language)}</p>
            <div className="hiring-settings-toggle-grid">
              {APPLICATION_REQUIREMENT_KEYS.map((key) => (
                <SettingToggle
                  key={key}
                  label={t(APPLICATION_LABELS[key], language)}
                  checked={draft.applicationRequirements[key]}
                  onChange={(checked) => updateSection("applicationRequirements", key, checked)}
                />
              ))}
            </div>

            <div className="hiring-settings-questions">
              <h4>{t("hiringSettingsCustomQuestions", language)}</h4>
              {draft.applicationRequirements.customQuestions.length === 0 && (
                <p>{t("hiringSettingsNoCustomQuestions", language)}</p>
              )}
              {draft.applicationRequirements.customQuestions.map((question, index) => (
                <div className="hiring-settings-question" key={question.id}>
                  <label htmlFor={`hiring-question-${question.id}`}>
                    <span>{t("hiringSettingsQuestion", language)} {index + 1}</span>
                    <input
                      id={`hiring-question-${question.id}`}
                      value={question.prompt}
                      aria-invalid={!question.prompt.trim()}
                      onChange={(event) => updateQuestion(question.id, "prompt", event.target.value)}
                    />
                  </label>
                  <SettingToggle
                    label={t("hiringSettingsRequired", language)}
                    checked={question.required}
                    onChange={(checked) => updateQuestion(question.id, "required", checked)}
                  />
                  <button
                    type="button"
                    className="hiring-settings-remove"
                    aria-label={`${t("hiringSettingsRemoveQuestion", language)} ${index + 1}`}
                    onClick={() => removeQuestion(question.id)}
                  >
                    {t("hiringSettingsRemoveQuestion", language)}
                  </button>
                </div>
              ))}
              <div className="hiring-settings-add-question">
                <label htmlFor="hiring-settings-new-question">
                  <span>{t("hiringSettingsQuestion", language)}</span>
                  <input
                    id="hiring-settings-new-question"
                    value={questionPrompt}
                    aria-invalid={Boolean(questionError)}
                    aria-describedby={questionError ? "hiring-settings-question-error" : undefined}
                    onChange={(event) => setQuestionPrompt(event.target.value)}
                  />
                </label>
                <button type="button" onClick={addQuestion}>
                  {t("hiringSettingsAddQuestion", language)}
                </button>
              </div>
              {questionError && <p id="hiring-settings-question-error" role="alert" className="hiring-settings-error">{questionError}</p>}
            </div>
          </SettingsSection>

          <SettingsSection title={t("hiringSettingsNotifications", language)}>
            <p>{t("hiringSettingsNotificationsHelp", language)}</p>
            <div className="hiring-settings-toggle-grid">
              {SUPPORTED_HIRING_NOTIFICATION_EVENTS.map((key) => (
                <SettingToggle
                  key={key}
                  label={t(NOTIFICATION_LABELS[key], language)}
                  checked={draft.notificationPreferences[key]}
                  onChange={(checked) => updateSection("notificationPreferences", key, checked)}
                />
              ))}
            </div>
          </SettingsSection>

          <SettingsSection title={t("hiringSettingsBackgroundChecks", language)}>
            <p>{t("hiringSettingsBackgroundDisclaimer", language)}</p>
            <div className="hiring-settings-toggle-grid">
              {BACKGROUND_CHECK_PREFERENCE_KEYS.map((key) => (
                <SettingToggle
                  key={key}
                  label={t(BACKGROUND_LABELS[key], language)}
                  checked={draft.backgroundCheckPreferences[key]}
                  onChange={(checked) => updateSection("backgroundCheckPreferences", key, checked)}
                />
              ))}
            </div>
            <TextAreaField
              id="hiring-settings-background-notes"
              label={t("hiringSettingsNotes", language)}
              value={draft.backgroundCheckPreferences.notes}
              onChange={(value) => updateSection("backgroundCheckPreferences", "notes", value)}
            />
          </SettingsSection>

          <SettingsSection title={t("hiringSettingsWorkEligibility", language)}>
            <p>{t("hiringSettingsEligibilityDisclaimer", language)}</p>
            <label className="hiring-settings-field" htmlFor="hiring-settings-minimum-age">
              <span>{t("hiringSettingsMinimumAge", language)}</span>
              <input
                id="hiring-settings-minimum-age"
                inputMode="numeric"
                value={draft.workEligibilityRequirements.minimumAgeRequirement}
                onChange={(event) => updateSection("workEligibilityRequirements", "minimumAgeRequirement", event.target.value)}
              />
            </label>
            <div className="hiring-settings-toggle-grid">
              {WORK_ELIGIBILITY_BOOLEAN_KEYS.map((key) => (
                <SettingToggle
                  key={key}
                  label={t(ELIGIBILITY_LABELS[key], language)}
                  checked={draft.workEligibilityRequirements[key]}
                  onChange={(checked) => updateSection("workEligibilityRequirements", key, checked)}
                />
              ))}
            </div>
            <label className="hiring-settings-field" htmlFor="hiring-settings-location">
              <span>{t("hiringSettingsLocationRequirement", language)}</span>
              <input
                id="hiring-settings-location"
                value={draft.workEligibilityRequirements.locationRequirement}
                onChange={(event) => updateSection("workEligibilityRequirements", "locationRequirement", event.target.value)}
              />
            </label>
            <TextAreaField
              id="hiring-settings-eligibility-notes"
              label={t("hiringSettingsCustomEligibilityNotes", language)}
              value={draft.workEligibilityRequirements.customEligibilityNotes}
              onChange={(value) => updateSection("workEligibilityRequirements", "customEligibilityNotes", value)}
            />
          </SettingsSection>

          <div className={`hiring-settings-status ${saveError ? "is-error" : saved ? "is-success" : ""}`} role={saveError ? "alert" : "status"} aria-live="polite">
            {saveError || (saved ? t("hiringSettingsUpdated", language) : "")}
          </div>

          <div className="hiring-settings-actions">
            <button type="button" onClick={onClose}>{t("cancel", language)}</button>
            <button type="submit" className="meetro-visual-primary-button">
              {t("saveChanges", language)}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function SettingsSection({ title, open = false, children }) {
  return (
    <details className="hiring-settings-section" open={open}>
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}

function SettingToggle({ label, checked, onChange }) {
  return (
    <label className="hiring-settings-toggle">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function TextAreaField({ id, label, value, onChange }) {
  return (
    <label className="hiring-settings-field" htmlFor={id}>
      <span>{label}</span>
      <textarea id={id} rows={4} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
