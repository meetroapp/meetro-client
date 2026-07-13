import { useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import {
  getHiringJobCategories,
  getHiringLocalJobOpenings,
} from "../utils/hiringCenterRegistry";
import { saveHiringConversation } from "../utils/hiringConversations";
import { getLocalizedHiringJobDisplay } from "../utils/hiringDisplayTranslations";
import { getLanguage, t } from "../utils/language";
import { createNotification } from "../utils/meetroNotifications";
import {
  getRuntimeHiringQaOptions,
  HIRING_QA_BUSINESS_ID,
} from "../utils/hiringFixtureGate";

const distanceOptions = ["Any distance", "10 miles", "15 miles", "25 miles", "50 miles"];
const employmentOptions = ["Any type", "Full Time", "Part Time", "Contract", "Seasonal"];

function JobsHiring({ setPage, language }) {
  const [activeLanguage, setActiveLanguage] = useState(() => language || getLanguage());
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [distance, setDistance] = useState("Any distance");
  const [employmentType, setEmploymentType] = useState("Any type");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedJob, setSelectedJob] = useState(null);
  const [notice, setNotice] = useState(null);
  const [applicationJob, setApplicationJob] = useState(null);
  const [applicationDraft, setApplicationDraft] = useState({
    name: "",
    contact: "",
    experienceSummary: "",
    availability: "",
    transportation: "",
    notes: "",
  });

  const qaOptions = getRuntimeHiringQaOptions(localStorage);
  const jobs = getHiringLocalJobOpenings({
    ...qaOptions,
    businessId: HIRING_QA_BUSINESS_ID,
    publicProjection: true,
  });
  const categories = getHiringJobCategories();
  const label = (key) => t(key, activeLanguage);
  const categoryLabel = (category) =>
    label(`jobsHiringCategory${String(category).replace(/[^a-zA-Z0-9]/g, "")}`) ||
    category;
  const employmentLabel = (type) =>
    label(`jobsHiringEmployment${String(type).replace(/[^a-zA-Z0-9]/g, "")}`) ||
    type;
  const distanceLabel = (option) =>
    label(`jobsHiringDistance${String(option).replace(/[^a-zA-Z0-9]/g, "")}`) ||
    option;

  useEffect(() => {
    const syncLanguage = () => setActiveLanguage(language || getLanguage());
    syncLanguage();
    window.addEventListener("languageChanged", syncLanguage);

    return () => window.removeEventListener("languageChanged", syncLanguage);
  }, [language]);

  const filteredJobs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const normalizedLocation = location.trim().toLowerCase();

    return jobs.filter((job) => {
      const keywordMatch =
        !normalizedKeyword ||
        [
          job.title,
          job.businessName,
          job.category,
          job.description,
          getLocalizedHiringJobDisplay(job, activeLanguage).title,
          getLocalizedHiringJobDisplay(job, activeLanguage).category,
          getLocalizedHiringJobDisplay(job, activeLanguage).description,
        ].some((value) =>
          String(value || "").toLowerCase().includes(normalizedKeyword)
        );

      const locationMatch =
        !normalizedLocation ||
        String(job.location || "").toLowerCase().includes(normalizedLocation);

      const distanceMatch =
        distance === "Any distance" || job.distance === distance;

      const employmentMatch =
        employmentType === "Any type" || job.employmentType === employmentType;

      const categoryMatch =
        selectedCategory === "All" || job.category === selectedCategory;

      return keywordMatch && locationMatch && distanceMatch && employmentMatch && categoryMatch;
    });
  }, [activeLanguage, distance, employmentType, jobs, keyword, location, selectedCategory]);

  const filteredJobsCountLabel =
    filteredJobs.length === 1
      ? label("jobsHiringOneOpeningFound")
      : label("jobsHiringOpeningsFound").replace("{count}", filteredJobs.length);

  const updateApplicationDraft = (field, value) => {
    setApplicationDraft((current) => ({ ...current, [field]: value }));
  };

  const closeApplicationSheet = () => {
    setApplicationJob(null);
  };

  const previewApplication = () => {
    setApplicationJob(null);
    setNotice({
      title: label("jobsHiringApplicationComingSoonTitle"),
      body: label("jobsHiringApplicationComingSoonBody"),
    });
  };

  const messageBusiness = (job) => {
    const applicantId =
      localStorage.getItem("userId") ||
      localStorage.getItem("userEmail") ||
      localStorage.getItem("homeownerEmail") ||
      localStorage.getItem("userName") ||
      "guest";
    const participantName =
      localStorage.getItem("userName") ||
      localStorage.getItem("homeownerName") ||
      label("jobsHiringJobSeeker");
    const selectedJobDisplay = getLocalizedHiringJobDisplay(job, activeLanguage);
    const positionTitle = selectedJobDisplay.title || job.title;
    const interestMessage = label("communityHiringInterestStarted")
      .replace("{applicant}", participantName)
      .replace("{title}", positionTitle);
    const record = saveHiringConversation({
      type: "hiring",
      userId: applicantId,
      applicantId,
      applicantName: participantName,
      jobId: job.id,
      positionId: job.sourcePositionId || job.id,
      positionTitle,
      businessId: job.businessId || job.businessName,
      businessName: job.businessName,
      participantName,
      participantRole: "applicant",
      source: "jobs_hiring",
      status: label("jobsHiringNewInquiry"),
      location: job.location || job.serviceArea || label("jobsHiringLabel"),
      returnPage: "jobsHiring",
      lastMessage: interestMessage,
    });

    createNotification({
      type: "hiring_application",
      role: "professional",
      title: label("communityHiringNotificationTitle"),
      message: interestMessage,
      conversationId: record.id,
      dedupeKey: `jobs_hiring_interest_${record.id}`,
      metadata: {
        conversationType: record.conversation_type,
        positionId: record.positionId,
        positionTitle: record.positionTitle,
        applicantId: record.applicantId,
        businessId: record.businessId,
      },
    });
    setPage("conversationThread");
  };

  if (selectedJob) {
    const selectedJobDisplay = getLocalizedHiringJobDisplay(selectedJob, activeLanguage);

    return (
      <div className="app-page meetro-responsive-page meetro-visual-page" style={page}>
        <div style={header}>
          <button type="button" style={backBtn} onClick={() => setSelectedJob(null)}>
            ← {label("jobsHiringBackToJobs")}
          </button>
          <div>
            <p style={eyebrow}>{label("jobsHiringEyebrow")}</p>
            <h1 style={title}>{selectedJobDisplay.title}</h1>
            <p style={subtitle}>{selectedJob.businessName}</p>
          </div>
        </div>

        <article className="meetro-visual-surface" style={detailCard}>
          <div style={detailTop}>
            <span style={detailIcon}>
              <MeetroIcon name="jobsHiring" size={24} decorative />
            </span>
            <div>
              <p style={categoryText}>
                {selectedJobDisplay.category || categoryLabel(selectedJob.category)}
              </p>
              <h2 style={detailTitle}>{selectedJobDisplay.title}</h2>
            </div>
          </div>

          <p style={bodyText}>{selectedJobDisplay.description}</p>

          <dl style={detailsGrid}>
            <Detail label={label("jobsHiringPayRange")} value={selectedJob.payRange} />
            <Detail label={label("jobsHiringLocation")} value={selectedJob.location} />
            <Detail label={label("jobsHiringEmploymentType")} value={employmentLabel(selectedJob.employmentType)} />
            <Detail label={label("jobsHiringDistance")} value={distanceLabel(selectedJob.distance)} />
          </dl>

          <div>
            <p style={fieldLabel}>{label("jobsHiringRequirements")}</p>
            <ul style={requirementsList}>
              {selectedJobDisplay.requirements.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          </div>

          <div style={actionRow}>
            <button
              type="button"
              className="meetro-visual-primary-button"
              style={primaryButton}
              onClick={() => messageBusiness(selectedJob)}
            >
              {label("jobsHiringApply")}
            </button>
            <button
              type="button"
              style={secondaryButton}
              onClick={() => messageBusiness(selectedJob)}
            >
              {label("jobsHiringMessageBusiness")}
            </button>
            <button
              type="button"
              style={secondaryButton}
              onClick={() =>
                setNotice({
                  title: label("jobsHiringSaveJobComingSoonTitle"),
                  body: label("jobsHiringSaveJobComingSoonBody"),
                })
              }
            >
              {label("jobsHiringSaveJob")}
            </button>
          </div>
        </article>

        <ApplicationSheet
          job={applicationJob}
          draft={applicationDraft}
          onChange={updateApplicationDraft}
          onClose={closeApplicationSheet}
          onPreview={previewApplication}
          language={activeLanguage}
        />
        <ComingSoonSheet
          notice={notice}
          onClose={() => setNotice(null)}
          language={activeLanguage}
        />
        <BottomNav setPage={setPage} currentPage="discover" />
      </div>
    );
  }

  return (
    <div className="app-page meetro-responsive-page meetro-visual-page" style={page}>
      <div style={header}>
        <button type="button" style={backBtn} onClick={() => setPage("discover")}>
          ← {label("jobsHiringBackToDiscover")}
        </button>
        <div>
          <p style={eyebrow}>{label("discover")}</p>
          <h1 style={title}>{label("jobsHiringTitle")}</h1>
          <p style={subtitle}>
            {label("jobsHiringDescription")}
          </p>
        </div>
      </div>

      <section className="meetro-visual-surface" style={section}>
        <SectionHeading
          title={label("jobsHiringSearchTitle")}
          description={label("jobsHiringSearchDescription")}
        />
        <div style={filterGrid}>
          <input
            style={input}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={label("jobsHiringKeywordPlaceholder")}
          />
          <input
            style={input}
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder={label("jobsHiringLocationPlaceholder")}
          />
          <select
            style={input}
            value={distance}
            onChange={(event) => setDistance(event.target.value)}
          >
            {distanceOptions.map((option) => (
              <option key={option} value={option}>{distanceLabel(option)}</option>
            ))}
          </select>
          <select
            style={input}
            value={employmentType}
            onChange={(event) => setEmploymentType(event.target.value)}
          >
            {employmentOptions.map((option) => (
              <option key={option} value={option}>{employmentLabel(option)}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="meetro-visual-surface" style={section}>
        <SectionHeading
          title={label("jobsHiringCategoriesTitle")}
          description={label("jobsHiringCategoriesDescription")}
        />
        <div style={categoryRow}>
          <button
            type="button"
            style={{
              ...categoryPill,
              ...(selectedCategory === "All" ? activeCategoryPill : {}),
            }}
            onClick={() => setSelectedCategory("All")}
          >
            {label("jobsHiringCategoryAll")}
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              style={{
                ...categoryPill,
                ...(selectedCategory === category ? activeCategoryPill : {}),
              }}
              onClick={() => setSelectedCategory(category)}
            >
              {categoryLabel(category)}
            </button>
          ))}
        </div>
      </section>

      <section className="meetro-visual-surface" style={section}>
        <SectionHeading
          title={label("jobsHiringFeaturedTitle")}
          description={filteredJobsCountLabel}
        />

        <div style={jobsGrid}>
          {filteredJobs.length === 0 ? (
            <div className="meetro-visual-empty-state" style={emptyState}>
              <strong>{label("jobsHiringNoMatchingOpenings")}</strong>
              <span>{label("jobsHiringNoMatchingOpeningsHelp")}</span>
            </div>
          ) : (
            filteredJobs.map((job) => {
              const jobDisplay = getLocalizedHiringJobDisplay(job, activeLanguage);

              return (
              <article key={job.id} className="meetro-visual-surface" style={jobCard}>
                <div style={jobTop}>
                  <span style={jobIcon}>
                    <MeetroIcon name="jobsHiring" size={22} decorative />
                  </span>
                  <span style={employmentBadge}>{employmentLabel(job.employmentType)}</span>
                </div>
                <p style={categoryText}>
                  {jobDisplay.category || categoryLabel(job.category)}
                </p>
                <h2 style={jobTitle}>{jobDisplay.title}</h2>
                <p style={businessName}>{job.businessName}</p>
                <p style={bodyText}>{jobDisplay.description}</p>
                <dl style={detailsGrid}>
                  <Detail label={label("jobsHiringPayRange")} value={job.payRange} />
                  <Detail label={label("jobsHiringLocation")} value={job.location} />
                </dl>
                <button
                  type="button"
                  className="meetro-visual-primary-button"
                  style={primaryButton}
                  onClick={() => setSelectedJob(job)}
                >
                  {label("jobsHiringViewJobDetails")}
                </button>
              </article>
              );
            })
          )}
        </div>
      </section>

      <ApplicationSheet
        job={applicationJob}
        draft={applicationDraft}
        onChange={updateApplicationDraft}
        onClose={closeApplicationSheet}
        onPreview={previewApplication}
        language={activeLanguage}
      />
      <ComingSoonSheet
        notice={notice}
        onClose={() => setNotice(null)}
        language={activeLanguage}
      />
      <BottomNav setPage={setPage} currentPage="discover" />
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

function ComingSoonSheet({ notice, onClose, language }) {
  if (!notice) return null;
  const label = (key) => t(key, language);

  return (
    <div style={sheetOverlay} onClick={onClose}>
      <div style={sheet} onClick={(event) => event.stopPropagation()}>
        <div style={sheetHandle}></div>
        <h2 style={sheetTitle}>{notice.title}</h2>
        <p style={sheetBody}>{notice.body}</p>
        <button type="button" className="meetro-visual-primary-button" style={primaryButton} onClick={onClose}>
          {label("jobsHiringGotIt")}
        </button>
      </div>
    </div>
  );
}

function ApplicationSheet({ job, draft, onChange, onClose, onPreview, language }) {
  if (!job) return null;
  const label = (key) => t(key, language);

  return (
    <div style={sheetOverlay} onClick={onClose}>
      <div style={sheet} onClick={(event) => event.stopPropagation()}>
        <div style={sheetHandle}></div>
        <h2 style={sheetTitle}>
          {label("jobsHiringApplyFor").replace("{title}", job.title)}
        </h2>
        <p style={sheetBody}>
          {label("jobsHiringApplicationPreviewHelp")}
        </p>

        <div style={applicationGrid}>
          <input
            style={input}
            value={draft.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder={label("jobsHiringApplicantName")}
          />
          <input
            style={input}
            value={draft.contact}
            onChange={(event) => onChange("contact", event.target.value)}
            placeholder={label("jobsHiringApplicantContact")}
          />
          <textarea
            style={textarea}
            value={draft.experienceSummary}
            onChange={(event) => onChange("experienceSummary", event.target.value)}
            placeholder={label("jobsHiringApplicantExperience")}
          />
          <input
            style={input}
            value={draft.availability}
            onChange={(event) => onChange("availability", event.target.value)}
            placeholder={label("jobsHiringApplicantAvailability")}
          />
          <input
            style={input}
            value={draft.transportation}
            onChange={(event) => onChange("transportation", event.target.value)}
            placeholder={label("jobsHiringApplicantTransportation")}
          />
          <textarea
            style={textarea}
            value={draft.notes}
            onChange={(event) => onChange("notes", event.target.value)}
            placeholder={label("jobsHiringApplicantNotes")}
          />
        </div>

        <button type="button" className="meetro-visual-primary-button" style={primaryButton} onClick={onPreview}>
          {label("jobsHiringPreviewApplication")}
        </button>
        <button type="button" style={secondaryButton} onClick={onClose}>
          {label("cancel")}
        </button>
      </div>
    </div>
  );
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
  background: "var(--meetro-gradient-community-page)",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
};

const header = {
  display: "grid",
  gap: "12px",
  marginBottom: "18px",
};

const backBtn = {
  justifySelf: "start",
  minHeight: "42px",
  padding: "0 12px",
  borderRadius: "14px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-forest)",
  boxShadow: "var(--meetro-shadow-soft)",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer",
};

const eyebrow = {
  margin: "0 0 5px",
  color: "var(--meetro-color-wood)",
  fontSize: "11px",
  fontWeight: "950",
  textTransform: "uppercase",
};

const title = {
  margin: 0,
  fontSize: "30px",
  fontWeight: "950",
  color: "var(--meetro-color-ink)",
  letterSpacing: 0,
};

const subtitle = {
  margin: "7px 0 0",
  color: "var(--meetro-color-muted)",
  fontSize: "15px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const section = {
  display: "grid",
  gap: "12px",
  marginBottom: "20px",
  padding: "16px",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "22px",
  background: "var(--meetro-surface-paper)",
  boxShadow: "var(--meetro-shadow-soft)",
};

const sectionHeading = {
  display: "grid",
  gap: "4px",
};

const sectionTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "20px",
  fontWeight: "950",
};

const sectionDescription = {
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const filterGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: "10px",
};

const input = {
  width: "100%",
  minWidth: 0,
  minHeight: "46px",
  boxSizing: "border-box",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "14px",
  padding: "0 12px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-ink)",
  fontSize: "15px",
  fontWeight: "750",
};

const categoryRow = {
  display: "flex",
  gap: "8px",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  paddingBottom: "4px",
};

const categoryPill = {
  flex: "0 0 auto",
  border: "1px solid var(--meetro-color-line)",
  padding: "8px 11px",
  borderRadius: "999px",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  fontSize: "13px",
  fontWeight: "900",
  cursor: "pointer",
};

const activeCategoryPill = {
  background: "var(--meetro-color-forest)",
  borderColor: "var(--meetro-color-forest)",
  color: "#fffdf8",
};

const jobsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))",
  gap: "12px",
};

const jobCard = {
  display: "grid",
  gap: "10px",
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  boxShadow: "var(--meetro-shadow-soft)",
};

const jobTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};

const jobIcon = {
  width: "40px",
  height: "40px",
  borderRadius: "14px",
  display: "grid",
  placeItems: "center",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
};

const employmentBadge = {
  padding: "5px 8px",
  borderRadius: "999px",
  background: "#ecfdf5",
  color: "#047857",
  fontSize: "11px",
  fontWeight: "900",
};

const categoryText = {
  margin: 0,
  color: "var(--meetro-color-wood)",
  fontSize: "12px",
  fontWeight: "950",
  textTransform: "uppercase",
};

const jobTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "20px",
  fontWeight: "950",
};

const businessName = {
  margin: 0,
  color: "var(--meetro-color-coffee)",
  fontSize: "14px",
  fontWeight: "850",
};

const bodyText = {
  margin: 0,
  color: "var(--meetro-color-muted)",
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

const detailItem = {
  display: "grid",
  gap: "3px",
  padding: "9px",
  borderRadius: "12px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-coffee)",
  fontSize: "12px",
  fontWeight: "750",
};

const primaryButton = {
  width: "100%",
  minHeight: "46px",
  border: "0",
  borderRadius: "14px",
  background: "var(--meetro-gradient-community-action)",
  color: "#fffdf8",
  boxShadow: "0 14px 28px rgba(31, 77, 52, 0.18)",
  fontSize: "15px",
  fontWeight: "950",
  cursor: "pointer",
};

const secondaryButton = {
  ...primaryButton,
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  border: "1px solid var(--meetro-color-line)",
  boxShadow: "none",
};

const detailCard = {
  display: "grid",
  gap: "14px",
  padding: "16px",
  borderRadius: "20px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  boxShadow: "var(--meetro-shadow-soft)",
};

const detailTop = {
  display: "grid",
  gridTemplateColumns: "48px 1fr",
  gap: "12px",
  alignItems: "center",
};

const detailIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  display: "grid",
  placeItems: "center",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
};

const detailTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "22px",
  fontWeight: "950",
};

const fieldLabel = {
  margin: "0 0 6px",
  color: "var(--meetro-color-muted)",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const requirementsList = {
  margin: 0,
  paddingLeft: "20px",
  color: "var(--meetro-color-coffee)",
  fontSize: "13px",
  lineHeight: 1.55,
  fontWeight: "700",
};

const actionRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: "10px",
};

const emptyState = {
  display: "grid",
  gap: "5px",
  padding: "14px",
  borderRadius: "16px",
  border: "1px dashed var(--meetro-color-line)",
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.45,
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
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  boxShadow: "var(--meetro-shadow-lifted)",
};

const sheetHandle = {
  width: "48px",
  height: "5px",
  borderRadius: "999px",
  background: "var(--meetro-color-line)",
  justifySelf: "center",
};

const sheetTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "20px",
  fontWeight: "950",
};

const sheetBody = {
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "14px",
  lineHeight: 1.5,
  fontWeight: "700",
};

const applicationGrid = {
  display: "grid",
  gap: "10px",
  maxHeight: "calc(100dvh - 340px)",
  overflowY: "auto",
  paddingBottom: "4px",
};

const textarea = {
  ...input,
  minHeight: "82px",
  paddingTop: "12px",
  resize: "vertical",
  lineHeight: 1.45,
};

export default JobsHiring;
