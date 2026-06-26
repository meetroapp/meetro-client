import { useState } from "react";
import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import MeetroIcon from "../components/MeetroIcon";
import { getLanguage, t } from "../utils/language";
import {
  getHiringApplicants,
  getHiringApplicantsForPosition,
  getHiringInterviews,
  getHiringOpenPositions,
  getHiringTeamMembers,
  HIRING_EMPLOYMENT_TYPES,
  saveHiringPosition,
  validateHiringPositionDraft,
} from "../utils/hiringCenterRegistry";
import { saveHiringConversation } from "../utils/hiringConversations";

function HiringCenter({ setPage }) {
  const language = getLanguage();
  const isSpanish = language === "es";
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [notice, setNotice] = useState(null);
  const [isCreatePositionOpen, setIsCreatePositionOpen] = useState(false);
  const [createPositionError, setCreatePositionError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [positionDraft, setPositionDraft] = useState(() => createBlankPositionDraft());
  const positions = getHiringOpenPositions();
  const applicants = getHiringApplicants();
  const interviews = getHiringInterviews();
  const teamMembers = getHiringTeamMembers();

  const copy = {
    back: t("backToBusinessTools", language),
    eyebrow: isSpanish ? "HERRAMIENTAS DEL NEGOCIO" : "BUSINESS TOOLS",
    title: isSpanish ? "Centro de contratación" : "Hiring Center",
    subtitle: isSpanish
      ? "Crea y administra tu equipo."
      : "Build and manage your team.",
    preview: isSpanish ? "Vista previa" : "Preview",
    comingSoon: isSpanish ? "Próximamente" : "Coming Soon",
  };

  const openPreview = (title, body) => {
    setNotice({ title, body });
  };

  const openCreatePosition = () => {
    setCreatePositionError("");
    setPositionDraft(createBlankPositionDraft());
    setIsCreatePositionOpen(true);
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

    const result = saveHiringPosition(nextDraft);
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

          <div style={actionRow}>
            {["Message Applicant", "Schedule Interview", "Mark Reviewing", "Mark Hired", "Archive"].map((action) => (
              <button
                key={action}
                type="button"
                style={previewAction}
                onClick={() => {
                  if (action === "Message Applicant") {
                    messageApplicant(selectedApplicant);
                    return;
                  }

                  openPreview(
                    `${action} is coming soon`,
                    "Applicant workflow actions are preview-only and do not change hiring records yet."
                  );
                }}
              >
                {action}{action === "Message Applicant" ? "" : ` · ${copy.preview}`}
              </button>
            ))}
          </div>
        </article>

        <PreviewSheet notice={notice} onClose={() => setNotice(null)} />
      </HiringPageShell>
    );
  }

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      <BusinessToolsPageHeader
        title={copy.title}
        description={copy.subtitle}
        categoryLabel={copy.eyebrow}
        backLabel={copy.back}
        onBack={() => setPage("businessCommandCenter")}
      />

      <div style={previewCard}>
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

                      openPreview(
                        `${action} is coming soon`,
                        "Applicant actions are preview-only in this hiring foundation."
                      );
                    }}
                  >
                    {action}{action === "Message" ? "" : ` · ${copy.preview}`}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={section}>
        <SectionHeading title="Interviews" description="Preview-only interview coordination." />
        <button
          type="button"
          style={secondaryWideButton}
          onClick={() =>
            openPreview(
              "Schedule Interview is coming soon",
              "Interview scheduling will connect applicants, times, and notes in a future version."
            )
          }
        >
          Schedule Interview · {copy.preview}
        </button>
        <div style={cardGrid}>
          {interviews.map((interview) => (
            <article
              key={interview.id}
              style={{ ...recordCard, ...interactiveCard }}
              onClick={() =>
                openPreview(
                  "Interview detail is coming soon",
                  `${interview.applicantName} for ${interview.positionTitle} is available as a preview record.`
                )
              }
            >
              <h2 style={cardTitle}>{interview.applicantName}</h2>
              <p style={bodyText}>{interview.positionTitle}</p>
              <span style={applicantBadge}>{interview.status}</span>
            </article>
          ))}
        </div>
      </section>

      <section style={section}>
        <SectionHeading title="Team Members" description="People hired into your business." />
        {teamMembers.length === 0 ? (
          <div style={emptyState}>
            <strong>No team members yet.</strong>
            <span>Team members will appear after successful hires.</span>
          </div>
        ) : (
          <div style={cardGrid}>
            {teamMembers.map((member) => (
              <article key={member.id} style={{ ...recordCard, ...interactiveCard }}>
                <h2 style={cardTitle}>{member.name}</h2>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={section}>
        <SectionHeading title="Hiring Settings" description="Future hiring preferences." />
        <div style={settingsList}>
          {[
            "Application requirements",
            "Hiring notifications",
            "Background-check preferences",
            "Work eligibility requirements",
          ].map((item) => (
            <button
              key={item}
              type="button"
              style={settingRow}
              onClick={() =>
                openPreview(
                  "Hiring Settings are coming soon",
                  `${item} will be configurable in a future hiring release.`
                )
              }
            >
              <span>{item}</span>
              <span style={soonBadge}>{copy.comingSoon}</span>
            </button>
          ))}
        </div>
      </section>

      <CreatePositionSheet
        isOpen={isCreatePositionOpen}
        draft={positionDraft}
        error={createPositionError}
        onChange={updatePositionDraft}
        onCancel={closeCreatePosition}
        onSaveDraft={() => savePosition("Draft")}
        onPublish={() => savePosition("Open")}
      />
      <PreviewSheet notice={notice} onClose={() => setNotice(null)} />
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
    <div className="app-page meetro-responsive-page" style={page}>
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
  color: "#4338ca",
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
  border: "1px solid #ddd6fe",
  background: "#ffffff",
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
  background: "#ede9fe",
  color: "#5b35f5",
};

const section = {
  display: "grid",
  gap: "12px",
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
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
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
  background: "#eef2ff",
  color: "#3730a3",
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
  border: "1px solid #c4b5fd",
  background: "#ffffff",
  color: "#5b35f5",
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
  cursor: "pointer",
};

const soonBadge = {
  ...baseBadge,
  background: "#f1f5f9",
  color: "#475569",
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
  background: "#5b35f5",
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
