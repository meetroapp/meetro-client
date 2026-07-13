import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import MeetroIcon from "../components/MeetroIcon";
import HiringInterviewEditor from "../components/HiringInterviewEditor";
import HiringSettingsWorkspace from "../components/HiringSettingsWorkspace";
import { getLanguage, t } from "../utils/language";
import {
  getHiringApplicants,
  getHiringApplicantById,
  getHiringApplicantsForPosition,
  getHiringOpenPositions,
  getHiringPositionById,
  HIRING_EMPLOYMENT_TYPES,
  saveHiringPosition,
  validateHiringPositionDraft,
} from "../utils/hiringCenterRegistry";
import {
  resolveHiringConversation,
  saveHiringConversation,
  upsertHiringInterviewMessage,
} from "../utils/hiringConversations";
import {
  cancelHiringInterview,
  completeHiringInterview,
  createHiringInterview,
  filterHiringInterviews,
  formatHiringInterviewSummary,
  projectHiringInterviewNotification,
  readHiringInterviews,
  updateHiringInterview,
} from "../utils/hiringInterviews";
import { upsertNotification } from "../utils/meetroNotifications";
import {
  applyHiringSettingsToPositionDraft,
  getHiringSettingsSummary,
  isHiringNotificationEnabled,
  projectSettingsIntoApplicationReview,
  readHiringSettings,
  saveHiringSettings,
} from "../utils/hiringSettings";
import {
  createTeamMember,
  listTeamMembers,
} from "../utils/teamMembers";

function HiringCenter({ setPage }) {
  const language = getLanguage();
  const isSpanish = language === "es";
  const businessId = localStorage.getItem("businessId") || localStorage.getItem("contractorId") || "local-business";
  const accountMode = localStorage.getItem("activeAccountMode") || "business";
  const initialHiringSettings = readHiringSettings({ businessId, accountMode });
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(() =>
    getHiringApplicantById(localStorage.getItem("selectedHiringApplicantId"))
  );
  const [notice, setNotice] = useState(null);
  const [isCreatePositionOpen, setIsCreatePositionOpen] = useState(false);
  const [createPositionError, setCreatePositionError] = useState("");
  const [, setRefreshKey] = useState(0);
  const [hiringSettings, setHiringSettings] = useState(
    () => initialHiringSettings.settings
  );
  const [isHiringSettingsOpen, setIsHiringSettingsOpen] = useState(false);
  const [positionDraft, setPositionDraft] = useState(() =>
    applyHiringSettingsToPositionDraft(createBlankPositionDraft(), initialHiringSettings.settings)
  );
  const [interviews, setInterviews] = useState(() => readHiringInterviews({ businessId }));
  const [interviewEditor, setInterviewEditor] = useState(null);
  const [interviewErrors, setInterviewErrors] = useState({});
  const positions = getHiringOpenPositions();
  const applicants = getHiringApplicants();
  const teamMembers = listTeamMembers({ businessId });

  useEffect(() => {
    localStorage.removeItem("selectedHiringApplicantId");
    localStorage.removeItem("selectedHiringPositionId");
  }, []);

  const copy = {
    back: t("backToBusinessTools", language),
    eyebrow: isSpanish ? "HERRAMIENTAS DEL NEGOCIO" : "BUSINESS TOOLS",
    title: isSpanish ? "Centro de contratación" : "Hiring Center",
    subtitle: isSpanish
      ? "Crea y administra tu equipo."
      : "Build and manage your team.",
    preview: isSpanish ? "Vista previa" : "Preview",
  };

  const openPreview = (title, body) => {
    setNotice({ title, body });
  };

  const openCreatePosition = () => {
    setCreatePositionError("");
    setPositionDraft(
      applyHiringSettingsToPositionDraft(createBlankPositionDraft(), hiringSettings)
    );
    setIsCreatePositionOpen(true);
  };

  const persistHiringSettings = (draft) => {
    const result = saveHiringSettings(draft, { businessId, accountMode });
    if (result.ok) setHiringSettings(result.settings);
    return result;
  };

  const updatePositionDraft = (field, value) => {
    setPositionDraft((current) => ({ ...current, [field]: value }));
  };

  const closeCreatePosition = () => {
    setIsCreatePositionOpen(false);
    setCreatePositionError("");
  };

  const savePosition = (status) => {
    const nextDraft = { ...positionDraft, status };
    const validation = validateHiringPositionDraft(nextDraft);
    if (!validation.valid) {
      const labels = {
        title: "Position title",
        description: "Short description",
        serviceArea: "Service area",
      };
      setCreatePositionError(
        `Add ${validation.missingFields.map((field) => labels[field] || field).join(", ")} before saving.`
      );
      return;
    }

    const result = saveHiringPosition(nextDraft, { hiringSettings });
    if (!result.ok || !result.position) {
      setCreatePositionError("Position could not be saved. Check the required fields and try again.");
      return;
    }

    setRefreshKey((key) => key + 1);
    setSelectedPosition(result.position);
    setSelectedApplicant(null);
    setIsCreatePositionOpen(false);
    setCreatePositionError("");
    setNotice({
      title: status === "Open" ? "Position published" : "Draft saved",
      body:
        status === "Open"
          ? "This position now appears in Open Positions and Jobs & Hiring."
          : "This draft is saved in Open Positions with Draft status.",
    });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const openPosition = (position) => {
    setSelectedPosition(position);
    setSelectedApplicant(null);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const openApplicant = (applicant) => {
    setSelectedApplicant(applicant);
    setSelectedPosition(null);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const ensureHiringConversation = (applicant, position) => {
    const context = { businessId, positionId: position.id, applicantId: applicant.id };
    const existing = resolveHiringConversation(context);
    if (existing) return existing;
    return saveHiringConversation({
      type: "hiring_application",
      businessId,
      businessName: localStorage.getItem("businessName") || position.businessName || "Business",
      positionId: position.id,
      positionTitle: position.title,
      applicantId: applicant.id,
      applicantName: applicant.name,
      participantName: applicant.name,
      participantRole: "applicant",
      source: "hiring_interview",
      status: applicant.status || "Reviewing",
      returnPage: "hiringCenter",
      lastMessage: `Hiring conversation for ${position.title}.`,
    });
  };

  const openInterview = (applicant, interview = null) => {
    if (accountMode !== "business") {
      setNotice({ title: t("businessAccountRequired", language), body: t("hiringInterviewIdentityError", language) });
      return;
    }
    const position = getHiringPositionById(applicant.positionId);
    if (!position || position.businessId !== businessId || applicant.businessId !== businessId) {
      setNotice({ title: t("required", language), body: t("hiringInterviewIdentityError", language) });
      return;
    }
    setInterviewErrors({});
    setInterviewEditor({ applicant, position, interview });
  };

  const refreshInterviews = () => setInterviews(readHiringInterviews({ businessId }));

  const syncInterviewArtifacts = (interview, notify = true) => {
    upsertHiringInterviewMessage(interview);
    if (notify && ["scheduled", "rescheduled", "cancelled", "completed"].includes(interview.status)) {
      const notification = projectHiringInterviewNotification(interview);
      if (isHiringNotificationEnabled(notification, { businessId, accountMode })) {
        upsertNotification(notification);
      }
    }
    refreshInterviews();
  };

  const saveInterview = (form) => {
    if (!interviewEditor) return;
    const { applicant, position, interview } = interviewEditor;
    const conversation = ensureHiringConversation(applicant, position);
    const draft = {
      ...form,
      businessId,
      positionId: position.id,
      applicantId: applicant.id,
      conversationId: conversation.id,
      title: `Interview · ${position.title}`,
      createdBy: localStorage.getItem("userId") || localStorage.getItem("userEmail") || "business-user",
    };
    const options = { businessId, accountMode, position, applicant };
    const result = interview
      ? updateHiringInterview(interview.id, draft, options)
      : createHiringInterview(draft, options);
    if (!result.ok) {
      setInterviewErrors(result.errors || {});
      return;
    }
    syncInterviewArtifacts(result.interview, result.created !== false || result.interview.status === "rescheduled");
    setInterviewEditor(null);
    setNotice({ title: t(result.interview.status === "rescheduled" ? "rescheduleInterview" : "interviewScheduled", language), body: formatHiringInterviewSummary(result.interview) });
  };

  const cancelInterview = () => {
    if (!interviewEditor?.interview) return;
    const result = cancelHiringInterview(interviewEditor.interview.id, { businessId, accountMode });
    if (!result.ok) return;
    syncInterviewArtifacts(result.interview, true);
    setInterviewEditor(null);
    setNotice({ title: t("interviewCancelled", language), body: formatHiringInterviewSummary(result.interview) });
  };

  const completeInterview = () => {
    if (!interviewEditor?.interview) return;
    const result = completeHiringInterview(interviewEditor.interview.id, { businessId, accountMode });
    if (!result.ok) return;
    syncInterviewArtifacts(result.interview, true);
    setInterviewEditor(null);
    setNotice({ title: t("interviewCompleted", language), body: formatHiringInterviewSummary(result.interview) });
  };

  const closeDetail = () => {
    setSelectedPosition(null);
    setSelectedApplicant(null);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const messageApplicant = (applicant) => {
    saveHiringConversation({
      type: "hiring_application",
      applicantId: applicant.id,
      applicantName: applicant.name,
      participantName: applicant.name,
      participantRole: "applicant",
      positionId: applicant.positionId,
      positionTitle: applicant.positionAppliedFor,
      businessId: localStorage.getItem("businessId") || "local-business",
      businessName:
        localStorage.getItem("businessName") ||
        "Bgone Home Renovation & Handyman Services",
      source: "hiring_center",
      status: applicant.status || "New inquiry",
      returnPage: "hiringCenter",
      lastMessage: `Hiring conversation started with ${applicant.name}.`,
    });
    setPage("conversationThread");
  };

  const createMemberFromApplicant = (applicant, interview) => {
    const position = getHiringPositionById(applicant.positionId);
    const result = createTeamMember(
      {
        displayName: applicant.name,
        email: applicant.email || "",
        phone: applicant.phone || "",
        positionId: applicant.positionId,
        positionTitle: applicant.positionAppliedFor || position?.title || "",
        role: applicant.positionAppliedFor || position?.title || "",
        memberType: "employee",
        status: "active",
        hireDate: new Date().toISOString().slice(0, 10),
        notes: applicant.notes || "",
        sourceApplicantId: applicant.id,
        sourceInterviewId: interview?.id || "",
        hiringDecision: "offer_accepted",
      },
      {
        businessId,
        accountMode,
        onNotification: (notification) => {
          if (isHiringNotificationEnabled(notification, { businessId, accountMode })) {
            upsertNotification(notification);
          }
        },
      }
    );

    if (!result.ok) {
      setNotice({
        title: t("teamMemberCreateFromApplicant", language),
        body: t("teamMemberRequiredFields", language),
      });
      return;
    }

    localStorage.setItem("selectedTeamMemberId", result.member.id);
    setRefreshKey((value) => value + 1);
    setPage("teamMembers");
  };

  if (selectedPosition) {
    const positionApplicants = getHiringApplicantsForPosition(selectedPosition.id);

    return (
      <HiringPageShell
        setPage={setPage}
        backLabel="Back to Hiring Center"
        onBack={closeDetail}
        eyebrow="HIRING CENTER"
        title={selectedPosition.title}
        subtitle={selectedPosition.businessName}
      >
        <article style={detailCard}>
          <p style={bodyText}>{selectedPosition.description}</p>
          <dl style={detailsGrid}>
            <Detail label="Business Name" value={selectedPosition.businessName} />
            <Detail label="Pay Range" value={selectedPosition.payRange} />
            <Detail label="Service Area" value={selectedPosition.serviceArea} />
            <Detail label="Employment Type" value={selectedPosition.employmentType} />
            <Detail label="Experience" value={selectedPosition.experienceRequired} />
            <Detail label="Skills Needed" value={(selectedPosition.skillsNeeded || selectedPosition.requirements || []).join(", ") || "Not listed"} />
            <Detail label="Schedule" value={selectedPosition.scheduleAvailability || "Not listed"} />
            <Detail label="Contact Preference" value={selectedPosition.contactPreference || "Not listed"} />
            <Detail label="Status" value={selectedPosition.status} />
            <Detail label="Vehicle Required" value={selectedPosition.vehicleRequired ? "Yes" : "No"} />
            <Detail label="Background Check" value={selectedPosition.backgroundCheckRequired ? "Required" : "Not required"} />
          </dl>

          <div>
            <p style={fieldLabel}>Requirements</p>
            <ul style={requirementsList}>
              {(selectedPosition.requirements || []).map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          </div>

          <div>
            <p style={fieldLabel}>Applicants for this position</p>
            <div style={miniList}>
              {positionApplicants.length === 0 ? (
                <span style={mutedText}>No applicants yet.</span>
              ) : (
                positionApplicants.map((applicant) => (
                  <button
                    key={applicant.id}
                    type="button"
                    style={miniListButton}
                    onClick={() => openApplicant(applicant)}
                  >
                    <span>{applicant.name}</span>
                    <strong>{applicant.status}</strong>
                  </button>
                ))
              )}
            </div>
          </div>

          <div style={actionRow}>
            {["Edit Position", "Pause Position", "Close Position", "View Applicants"].map((action) => (
              <button
                key={action}
                type="button"
                style={previewAction}
                onClick={() =>
                  openPreview(
                    `${action} is coming soon`,
                    "Position management actions are preview-only in this TestFlight foundation."
                  )
                }
              >
                {action} · {copy.preview}
              </button>
            ))}
          </div>
        </article>

        <PreviewSheet notice={notice} onClose={() => setNotice(null)} />
      </HiringPageShell>
    );
  }

  if (selectedApplicant) {
    const applicantInterviews = filterHiringInterviews(interviews, { applicantId: selectedApplicant.id });
    const activeInterview = applicantInterviews.find((item) => ["scheduled", "rescheduled"].includes(item.status));
    const latestInterview = activeInterview || applicantInterviews[0] || null;
    const applicationGuidance = projectSettingsIntoApplicationReview(
      hiringSettings,
      getHiringPositionById(selectedApplicant.positionId) || {},
      selectedApplicant
    );
    const applicationSummary = getHiringSettingsSummary({
      ...hiringSettings,
      applicationRequirements: applicationGuidance.requirements,
    });
    const applicationReviewSummary = t("hiringSettingsReviewSummary", language)
      .replace("{count}", String(applicationSummary.requiredApplicationFieldCount))
      .replace("{questions}", String(applicationSummary.customQuestionCount));
    return (
      <HiringPageShell
        setPage={setPage}
        backLabel="Back to Hiring Center"
        onBack={closeDetail}
        eyebrow="HIRING CENTER"
        title={selectedApplicant.name}
        subtitle={selectedApplicant.positionAppliedFor}
      >
        <article style={detailCard}>
          <p style={bodyText}>{selectedApplicant.experienceSummary}</p>
          <dl style={detailsGrid}>
            <Detail label="Position Applied For" value={selectedApplicant.positionAppliedFor} />
            <Detail label="Application Date" value={selectedApplicant.applicationDate} />
            <Detail label="Status" value={selectedApplicant.status} />
            <Detail label="Contact Preference" value={selectedApplicant.contactPreference || "Not provided"} />
          </dl>

          <div style={notesBox}>
            <p style={fieldLabel}>Notes</p>
            <p style={bodyText}>{selectedApplicant.notes || "No notes yet."}</p>
          </div>

          <section style={interviewSection} aria-labelledby="applicant-requirements-heading">
            <div>
              <p style={fieldLabel}>{t("hiringSettingsApplicationRequirements", language)}</p>
              <h2 id="applicant-requirements-heading" style={cardTitle}>
                {t("hiringSettingsReviewGuidance", language)}
              </h2>
              <p style={bodyText}>{applicationReviewSummary}</p>
            </div>
          </section>

          <section style={interviewSection} aria-labelledby="applicant-interview-heading">
            <div>
              <p style={fieldLabel}>{t("interviewDetails", language)}</p>
              <h2 id="applicant-interview-heading" style={cardTitle}>
                {latestInterview
                  ? t(`hiringInterviewStatus${latestInterview.status[0].toUpperCase()}${latestInterview.status.slice(1)}`, language)
                  : t("noInterviewsScheduled", language)}
              </h2>
              {latestInterview && <p style={bodyText}>{formatHiringInterviewSummary(latestInterview)}</p>}
            </div>
            <button type="button" className="meetro-visual-primary-button" style={interviewPrimaryAction} onClick={() => openInterview(selectedApplicant, latestInterview)}>
              {activeInterview ? t("rescheduleInterview", language) : latestInterview ? t("interviewDetails", language) : t("scheduleInterview", language)}
            </button>
            {latestInterview?.status === "cancelled" && (
              <button type="button" style={previewAction} onClick={() => openInterview(selectedApplicant, null)}>
                {t("scheduleInterview", language)}
              </button>
            )}
          </section>

          {latestInterview?.status === "completed" && (
            <section style={interviewSection} aria-labelledby="applicant-hiring-decision-heading">
              <div>
                <p style={fieldLabel}>{t("teamMemberHiringDecision", language)}</p>
                <h2 id="applicant-hiring-decision-heading" style={cardTitle}>
                  {teamMembers.some((member) => member.sourceApplicantId === selectedApplicant.id)
                    ? t("teamMemberOfferAccepted", language)
                    : t("teamMemberDecisionReady", language)}
                </h2>
                <p style={bodyText}>
                  {teamMembers.some((member) => member.sourceApplicantId === selectedApplicant.id)
                    ? t("teamMemberCreatedHelp", language)
                    : t("teamMemberDecisionReadyHelp", language)}
                </p>
              </div>
              {teamMembers.some((member) => member.sourceApplicantId === selectedApplicant.id) ? (
                <button type="button" style={previewAction} onClick={() => setPage("teamMembers")}>
                  {t("teamMemberManage", language)}
                </button>
              ) : (
                <button
                  type="button"
                  className="meetro-visual-primary-button"
                  style={interviewPrimaryAction}
                  onClick={() => createMemberFromApplicant(selectedApplicant, latestInterview)}
                >
                  {t("teamMemberOfferAcceptedCreate", language)}
                </button>
              )}
            </section>
          )}

          <div style={actionRow}>
            {["Message Applicant", "Schedule Interview", "Mark Reviewing", "Archive"].map((action) => (
              <button
                key={action}
                type="button"
                style={previewAction}
                onClick={() => {
                  if (action === "Message Applicant") {
                    messageApplicant(selectedApplicant);
                    return;
                  }

                  if (action === "Schedule Interview") {
                    openInterview(selectedApplicant, activeInterview);
                    return;
                  }

                  openPreview(
                    `${action} is coming soon`,
                    "Applicant workflow actions are preview-only and do not change hiring records yet."
                  );
                }}
              >
                {action}{["Message Applicant", "Schedule Interview"].includes(action) ? "" : ` · ${copy.preview}`}
              </button>
            ))}
          </div>
        </article>

        <PreviewSheet notice={notice} onClose={() => setNotice(null)} />
        {interviewEditor && (
          <HiringInterviewEditor
            key={interviewEditor.interview?.id || `new-${interviewEditor.applicant.id}`}
            {...interviewEditor}
            errors={interviewErrors}
            onSave={saveInterview}
            onCancelInterview={cancelInterview}
            onComplete={completeInterview}
            onClose={() => setInterviewEditor(null)}
          />
        )}
      </HiringPageShell>
    );
  }

  return (
    <div className="app-page meetro-responsive-page meetro-visual-page" style={page}>
      <BusinessToolsPageHeader
        title={copy.title}
        description={copy.subtitle}
        categoryLabel={copy.eyebrow}
        backLabel={copy.back}
        onBack={() => setPage("businessCommandCenter")}
      />

      <div className="meetro-visual-surface" style={previewCard}>
        <span style={previewIcon}>
          <MeetroIcon name="hiringCenter" size={20} decorative />
        </span>
        <div>
          <strong>{copy.preview}</strong>
          <span>
            {isSpanish
              ? "Esta fundación organiza posiciones, solicitantes y entrevistas sin cambiar flujos activos."
              : "This foundation organizes positions, applicants, and interviews without changing active job workflows."}
          </span>
        </div>
      </div>

      <section style={section}>
        <SectionHeading
          title={isSpanish ? "Posiciones abiertas" : "Open Positions"}
          description={
            isSpanish
              ? "Roles locales que el negocio podria publicar o administrar."
              : "Local roles the business could publish or manage."
          }
        />
        <button
          type="button"
          style={secondaryWideButton}
          onClick={openCreatePosition}
        >
          Create Position · {copy.preview}
        </button>

        <div style={cardGrid}>
          {positions.map((position) => (
            <article
              key={position.id}
              className="meetro-visual-surface"
              style={{ ...recordCard, ...interactiveCard }}
              onClick={() => openPosition(position)}
            >
              <div style={cardTop}>
                <div>
                  <p style={fieldLabel}>
                    {isSpanish ? "Puesto" : "Position"}
                  </p>
                  <h2 style={cardTitle}>{position.title}</h2>
                </div>
                <span style={statusBadge(position.status)}>
                  {position.status}
                </span>
              </div>

              <p style={bodyText}>{position.description}</p>

              <dl style={detailsGrid}>
                <Detail label="Pay Range" value={position.payRange} />
                <Detail label="Service Area" value={position.serviceArea} />
                <Detail label="Employment Type" value={position.employmentType} />
                <Detail label="Experience" value={position.experienceRequired} />
                <Detail
                  label="Vehicle Required"
                  value={position.vehicleRequired ? "Yes" : "No"}
                />
                <Detail
                  label="Background Check"
                  value={position.backgroundCheckRequired ? "Required" : "Not required"}
                />
              </dl>
              <button type="button" style={secondaryWideButton}>
                View Position
              </button>
            </article>
          ))}
        </div>
      </section>

      <section style={section}>
        <SectionHeading
          title={isSpanish ? "Solicitantes" : "Applicants"}
          description={
            isSpanish
              ? "Vista previa de personas que aplicaron a roles abiertos."
              : "Preview of people who applied to open roles."
          }
        />

        <div style={cardGrid}>
          {applicants.map((applicant) => (
            <article
              key={applicant.id}
              style={{ ...recordCard, ...interactiveCard }}
              onClick={() => openApplicant(applicant)}
            >
              <div style={cardTop}>
                <div>
                  <p style={fieldLabel}>
                    {isSpanish ? "Solicitante" : "Applicant"}
                  </p>
                  <h2 style={cardTitle}>{applicant.name}</h2>
                </div>
                <span style={applicantBadge}>{applicant.status}</span>
              </div>

              <p style={bodyText}>{applicant.experienceSummary}</p>

              <dl style={detailsGrid}>
                <Detail label="Position" value={applicant.positionAppliedFor} />
                <Detail label="Application Date" value={applicant.applicationDate} />
              </dl>

              <div style={actionRow}>
                {["Message", "Schedule Interview", "Archive"].map((action) => (
                  <button
                    key={action}
                    type="button"
                    style={previewAction}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (action === "Message") {
                        messageApplicant(applicant);
                        return;
                      }

                      if (action === "Schedule Interview") {
                        const active = filterHiringInterviews(interviews, { applicantId: applicant.id }).find((item) => ["scheduled", "rescheduled"].includes(item.status));
                        openInterview(applicant, active || null);
                        return;
                      }

                      openPreview(
                        `${action} is coming soon`,
                        "Applicant actions are preview-only in this hiring foundation."
                      );
                    }}
                  >
                    {action}{["Message", "Schedule Interview"].includes(action) ? "" : ` · ${copy.preview}`}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={section}>
        <SectionHeading title={t("upcomingInterviews", language)} description={t("interviewDetails", language)} />
        {interviews.length === 0 && <div style={emptyState}><strong>{t("noInterviewsScheduled", language)}</strong></div>}
        <div style={cardGrid}>
          {interviews.map((interview) => (
            <article
              key={interview.id}
              style={{ ...recordCard, ...interactiveCard }}
              onClick={() => {
                const applicant = getHiringApplicantById(interview.applicantId);
                if (applicant) openInterview(applicant, interview);
              }}
            >
              <h2 style={cardTitle}>{interview.applicantName}</h2>
              <p style={bodyText}>{interview.positionTitle}</p>
              <p style={bodyText}>{formatHiringInterviewSummary(interview)}</p>
              <span style={applicantBadge}>{t(`hiringInterviewStatus${interview.status[0].toUpperCase()}${interview.status.slice(1)}`, language)}</span>
            </article>
          ))}
        </div>
      </section>

      <section style={section}>
        <SectionHeading title={t("teamMembers", language)} description={t("teamMembersSubtitle", language)} />
        {teamMembers.length === 0 ? (
          <div style={emptyState}>
            <strong>{t("teamMembersEmpty", language)}</strong>
            <span>{t("teamMembersEmptyHelp", language)}</span>
          </div>
        ) : (
          <div style={cardGrid}>
            {teamMembers.map((member) => (
              <article key={member.id} style={{ ...recordCard, ...interactiveCard }}>
                <h2 style={cardTitle}>{member.displayName}</h2>
                <p style={bodyText}>{member.positionTitle}</p>
              </article>
            ))}
          </div>
        )}
        <button type="button" style={previewAction} onClick={() => setPage("teamMembers")}>
          {t("teamMemberManage", language)}
        </button>
      </section>

      <section style={section}>
        <SectionHeading title={t("hiringSettings", language)} description={t("hiringSettingsSectionHelp", language)} />
        <div style={settingsList}>
          {[
            t("hiringSettingsApplicationRequirements", language),
            t("hiringSettingsNotifications", language),
            t("hiringSettingsBackgroundChecks", language),
            t("hiringSettingsWorkEligibility", language),
          ].map((item) => <div key={item} style={settingRow}><span>{item}</span></div>)}
        </div>
        <button type="button" className="meetro-visual-primary-button" style={interviewPrimaryAction} onClick={() => setIsHiringSettingsOpen(true)}>
          {t("hiringSettingsManage", language)}
        </button>
      </section>

      <CreatePositionSheet
        isOpen={isCreatePositionOpen}
        draft={positionDraft}
        error={createPositionError}
        onChange={updatePositionDraft}
        onCancel={closeCreatePosition}
        onSaveDraft={() => savePosition("Draft")}
        onPublish={() => savePosition("Open")}
        applicationRequirements={positionDraft.applicationRequirements}
        language={language}
      />
      {isHiringSettingsOpen && (
        <HiringSettingsWorkspace
          settings={hiringSettings}
          language={language}
          onSave={persistHiringSettings}
          onClose={() => setIsHiringSettingsOpen(false)}
        />
      )}
      <PreviewSheet notice={notice} onClose={() => setNotice(null)} />
      {interviewEditor && (
        <HiringInterviewEditor
          key={interviewEditor.interview?.id || `new-${interviewEditor.applicant.id}`}
          {...interviewEditor}
          errors={interviewErrors}
          onSave={saveInterview}
          onCancelInterview={cancelInterview}
          onComplete={completeInterview}
          onClose={() => setInterviewEditor(null)}
        />
      )}
      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

function createBlankPositionDraft() {
  return {
    title: "",
    description: "",
    payRange: "",
    employmentType: "Contract",
    experienceRequired: "",
    serviceArea: "",
    skillsNeeded: "",
    scheduleAvailability: "",
    contactPreference: "",
    status: "Draft",
  };
}

function CreatePositionSheet({
  isOpen,
  draft,
  error,
  onChange,
  onCancel,
  onSaveDraft,
  onPublish,
  applicationRequirements,
  language,
}) {
  if (!isOpen) return null;

  return (
    <div style={sheetOverlay} onClick={onCancel}>
      <form
        style={formSheet}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onPublish();
        }}
      >
        <div style={sheetHandle}></div>
        <div>
          <p style={fieldLabel}>Hiring Center</p>
          <h2 style={sheetTitle}>Create Position</h2>
          <p style={sheetBody}>
            Create a local hiring role for your business. Required fields are title,
            description, and service area.
          </p>
        </div>

        {error && <div style={validationNotice}>{error}</div>}

        <label style={formField}>
          <span>Position title</span>
          <input
            style={input}
            value={draft.title}
            onChange={(event) => onChange("title", event.target.value)}
            placeholder="Field Handyman Helper"
          />
        </label>

        <div style={notesBox}>
          <p style={fieldLabel}>{t("hiringSettingsApplicationRequirements", language)}</p>
          <p style={sheetBody}>{t("hiringSettingsPositionDefaultsHelp", language)}</p>
          <strong>
            {Object.entries(applicationRequirements || {}).filter(
              ([key, value]) => key !== "customQuestions" && value === true
            ).length} {t("hiringSettingsRequired", language).toLowerCase()}
          </strong>
        </div>

        <label style={formField}>
          <span>Short description</span>
          <textarea
            style={textarea}
            value={draft.description}
            onChange={(event) => onChange("description", event.target.value)}
            placeholder="Describe the role and what this person will help with."
          />
        </label>

        <div style={formGrid}>
          <label style={formField}>
            <span>Pay range</span>
            <input
              style={input}
              value={draft.payRange}
              onChange={(event) => onChange("payRange", event.target.value)}
              placeholder="$20-$28/hr"
            />
          </label>

          <label style={formField}>
            <span>Employment type</span>
            <select
              style={input}
              value={draft.employmentType}
              onChange={(event) => onChange("employmentType", event.target.value)}
            >
              {HIRING_EMPLOYMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={formField}>
          <span>Experience requirement</span>
          <input
            style={input}
            value={draft.experienceRequired}
            onChange={(event) => onChange("experienceRequired", event.target.value)}
            placeholder="1+ year home repair or maintenance experience"
          />
        </label>

        <label style={formField}>
          <span>Service area</span>
          <input
            style={input}
            value={draft.serviceArea}
            onChange={(event) => onChange("serviceArea", event.target.value)}
            placeholder="Lee County, FL"
          />
        </label>

        <label style={formField}>
          <span>Skills needed</span>
          <textarea
            style={textareaSmall}
            value={draft.skillsNeeded}
            onChange={(event) => onChange("skillsNeeded", event.target.value)}
            placeholder="Basic tools, reliable transportation, customer-friendly communication"
          />
        </label>

        <div style={formGrid}>
          <label style={formField}>
            <span>Schedule / availability</span>
            <input
              style={input}
              value={draft.scheduleAvailability}
              onChange={(event) => onChange("scheduleAvailability", event.target.value)}
              placeholder="Weekdays, occasional weekends"
            />
          </label>

          <label style={formField}>
            <span>Contact preference</span>
            <input
              style={input}
              value={draft.contactPreference}
              onChange={(event) => onChange("contactPreference", event.target.value)}
              placeholder="Text, phone, or email"
            />
          </label>
        </div>

        <div style={sheetActionGrid}>
          <button type="button" style={secondarySheetButton} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" style={secondarySheetButton} onClick={onSaveDraft}>
            Save Draft
          </button>
          <button type="submit" style={primarySheetButton}>
            Publish Position
          </button>
        </div>
      </form>
    </div>
  );
}

function HiringPageShell({
  setPage,
  backLabel,
  onBack,
  eyebrow: eyebrowText,
  title: titleText,
  subtitle: subtitleText,
  children,
}) {
  return (
    <div className="app-page meetro-responsive-page meetro-visual-page" style={page}>
      <BusinessToolsPageHeader
        title={titleText}
        description={subtitleText}
        categoryLabel={eyebrowText}
        backLabel={backLabel}
        onBack={onBack}
      />
      {children}
      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

function PreviewSheet({ notice, onClose }) {
  if (!notice) return null;

  return (
    <div style={sheetOverlay} onClick={onClose}>
      <div style={sheet} onClick={(event) => event.stopPropagation()}>
        <div style={sheetHandle}></div>
        <h2 style={sheetTitle}>{notice.title}</h2>
        <p style={sheetBody}>{notice.body}</p>
        <button type="button" style={primarySheetButton} onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}

function SectionHeading({ title, description }) {
  return (
    <div style={sectionHeading}>
      <h2 style={sectionTitle}>{title}</h2>
      <p style={sectionDescription}>{description}</p>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div style={detailItem}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function statusBadge(status) {
  if (status === "Open") return { ...baseBadge, background: "#ecfdf5", color: "#047857" };
  if (status === "Paused") return { ...baseBadge, background: "#fff7ed", color: "#9a3412" };
  return { ...baseBadge, background: "#f1f5f9", color: "#475569" };
}

const page = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: "100vh",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 50px) max(18px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 96px) max(18px, env(safe-area-inset-left, 0px))",
  overflowY: "auto",
  overflowX: "hidden",
  WebkitOverflowScrolling: "touch",
  boxSizing: "border-box",
  background: "#f8fafc",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
};

const header = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gap: "12px",
  alignItems: "start",
  marginBottom: "14px",
};

const backBtn = {
  justifySelf: "start",
  minHeight: "42px",
  padding: "0 12px",
  borderRadius: "14px",
  border: "1px solid rgba(148,163,184,0.35)",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer",
};

const eyebrow = {
  margin: "0 0 5px",
  color: "var(--meetro-color-coffee, #4a3428)",
  fontSize: "11px",
  fontWeight: "950",
  textTransform: "uppercase",
};

const title = {
  margin: 0,
  fontSize: "28px",
  fontWeight: "950",
  color: "#0f172a",
  letterSpacing: 0,
};

const subtitle = {
  margin: "7px 0 0",
  color: "#475569",
  fontSize: "15px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const previewCard = {
  display: "grid",
  gridTemplateColumns: "38px 1fr",
  gap: "10px",
  padding: "13px",
  borderRadius: "16px",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.45,
  marginBottom: "18px",
};

const previewIcon = {
  width: "38px",
  height: "38px",
  borderRadius: "14px",
  display: "grid",
  placeItems: "center",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
};

const section = {
  display: "grid",
  gap: "16px",
  marginBottom: "20px",
};

const sectionHeading = {
  display: "grid",
  gap: "4px",
};

const sectionTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "20px",
  fontWeight: "950",
};

const sectionDescription = {
  margin: 0,
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))",
  gap: "12px",
};

const recordCard = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "grid",
  gap: "12px",
  padding: "18px",
  borderRadius: "16px",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  boxShadow: "var(--meetro-shadow-soft, 0 16px 38px rgba(49,35,20,0.08))",
};

const interactiveCard = {
  cursor: "pointer",
};

const detailCard = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "grid",
  gap: "14px",
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
};

const interviewSection = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "14px",
  borderRadius: "8px",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
};

const interviewPrimaryAction = {
  minHeight: "44px",
  borderRadius: "8px",
  padding: "10px 14px",
  cursor: "pointer",
};

const cardTop = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
};

const fieldLabel = {
  margin: "0 0 5px",
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const cardTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "17px",
  fontWeight: "950",
};

const bodyText = {
  margin: 0,
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.5,
  fontWeight: "650",
};

const detailsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 130px), 1fr))",
  gap: "8px",
  margin: 0,
};

const requirementsList = {
  margin: 0,
  paddingLeft: "20px",
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.55,
  fontWeight: "700",
};

const miniList = {
  display: "grid",
  gap: "8px",
};

const miniListButton = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  padding: "10px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "850",
  cursor: "pointer",
};

const mutedText = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "700",
};

const notesBox = {
  display: "grid",
  gap: "6px",
  padding: "12px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const detailItem = {
  display: "grid",
  gap: "3px",
  padding: "9px",
  borderRadius: "12px",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "12px",
  fontWeight: "750",
};

const baseBadge = {
  padding: "5px 8px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const applicantBadge = {
  ...baseBadge,
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
};

const actionRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const previewAction = {
  minHeight: "36px",
  padding: "0 10px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#475569",
  fontSize: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const secondaryWideButton = {
  minHeight: "42px",
  width: "100%",
  borderRadius: "14px",
  border: "1px solid rgba(31,77,52,0.22)",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "13px",
  fontWeight: "950",
  cursor: "pointer",
};

const emptyState = {
  display: "grid",
  gap: "5px",
  padding: "14px",
  borderRadius: "16px",
  border: "1px dashed #cbd5e1",
  background: "#ffffff",
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.45,
};

const settingsList = {
  display: "grid",
  gap: "8px",
};

const settingRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "800",
};

const sheetOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  background: "rgba(15,23,42,0.35)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding:
    "20px max(14px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 92px) max(14px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
};

const sheet = {
  width: "100%",
  maxWidth: "520px",
  display: "grid",
  gap: "12px",
  padding: "16px",
  borderRadius: "22px",
  background: "#ffffff",
  boxShadow: "0 18px 50px rgba(15,23,42,0.25)",
};

const formSheet = {
  ...sheet,
  maxHeight: "calc(100dvh - 120px)",
  overflowY: "auto",
  paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
};

const sheetHandle = {
  width: "48px",
  height: "5px",
  borderRadius: "999px",
  background: "#cbd5e1",
  justifySelf: "center",
};

const sheetTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "20px",
  fontWeight: "950",
};

const sheetBody = {
  margin: 0,
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.5,
  fontWeight: "700",
};

const primarySheetButton = {
  width: "100%",
  minHeight: "46px",
  border: 0,
  borderRadius: "14px",
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "950",
  cursor: "pointer",
};

const validationNotice = {
  padding: "10px 12px",
  borderRadius: "14px",
  border: "1px solid #fed7aa",
  background: "#fff7ed",
  color: "#9a3412",
  fontSize: "13px",
  fontWeight: "850",
  lineHeight: 1.4,
};

const formField = {
  display: "grid",
  gap: "6px",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "900",
};

const input = {
  width: "100%",
  maxWidth: "100%",
  minHeight: "46px",
  padding: "0 12px",
  borderRadius: "14px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "700",
  boxSizing: "border-box",
};

const textarea = {
  ...input,
  minHeight: "96px",
  padding: "12px",
  resize: "vertical",
  lineHeight: 1.45,
};

const textareaSmall = {
  ...textarea,
  minHeight: "76px",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
  gap: "10px",
};

const sheetActionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
  gap: "8px",
};

const secondarySheetButton = {
  width: "100%",
  minHeight: "46px",
  borderRadius: "14px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontSize: "14px",
  fontWeight: "950",
  cursor: "pointer",
};

export default HiringCenter;
