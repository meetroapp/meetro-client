import { useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import {
  getMeetroMomentHashRoute,
  getMeetroMomentRouteId,
} from "../utils/meetroMomentRoutes";
import {
  getMeetroMomentDetailModel,
  getTimelineMomentById,
  readTimelineMoments,
} from "../utils/meetroTimeline";

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function formatDate(value, options = { month: "long", year: "numeric" }) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", options);
}

function getPhotoUrl(photo) {
  if (!photo) return "";
  if (typeof photo === "string") return photo;
  return photo.url || photo.src || photo.previewUrl || photo.imageUrl || "";
}

function getSelectedMomentId() {
  const route =
    typeof window !== "undefined"
      ? window.location.hash.replace("#", "") || window.location.pathname || ""
      : "";
  const routeMomentId = getMeetroMomentRouteId(route);
  if (routeMomentId) return routeMomentId;
  return localStorage.getItem("selectedMeetroMomentId") || "";
}

function getActiveAccountContext() {
  const activeMode = localStorage.getItem("activeAccountMode") || "personal";
  const accountType = localStorage.getItem("accountType") || "";
  const businessName = localStorage.getItem("businessName") || "";
  const businessId =
    localStorage.getItem("activeBusinessId") ||
    localStorage.getItem("businessId") ||
    localStorage.getItem("contractorProfileId") ||
    "";
  const user = readJson("user", {});

  return {
    activeMode,
    accountType,
    businessId,
    businessName,
    hasBusinessProfile: Boolean(businessName || businessId),
    relationshipId:
      localStorage.getItem("activeRelationshipId") ||
      localStorage.getItem("homeownerRelationshipId") ||
      localStorage.getItem("activeConversationId") ||
      "",
    userId: user.id || user.userId || user.user_id || localStorage.getItem("userId") || "",
  };
}

function describeValue(value, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value.label) return value.label;
  if (value.summary) return value.summary;
  if (value.url) return "Saved";
  return fallback;
}

function unavailableCopy(reason = "") {
  if (reason === "unverified-source") {
    return "This accomplishment is not ready to appear as a verified Meetro Moment.";
  }
  if (reason === "not-visible-to-viewer") {
    return "This Meetro Moment is protected until the right people can see it.";
  }
  return "This Meetro Moment could not be found.";
}

function DetailCard({ icon, label, value }) {
  if (!value) return null;

  return (
    <div style={detailCard}>
      <div style={detailIcon}>
        <MeetroIcon name={icon} size={18} decorative />
      </div>
      <div style={detailTextBlock}>
        <span style={detailLabel}>{label}</span>
        <strong style={detailValue}>{value}</strong>
      </div>
    </div>
  );
}

function MeetroMomentDetails({ setPage }) {
  const account = getActiveAccountContext();
  const [selectedMomentId, setSelectedMomentId] = useState(getSelectedMomentId);
  const moments = useMemo(() => readTimelineMoments(localStorage), []);
  const moment = useMemo(
    () => getTimelineMomentById(moments, selectedMomentId),
    [moments, selectedMomentId]
  );
  const model = useMemo(
    () => getMeetroMomentDetailModel(moment, account, moments),
    [
      moment,
      moments,
      account.activeMode,
      account.accountType,
      account.businessId,
      account.businessName,
      account.relationshipId,
      account.userId,
    ]
  );

  useEffect(() => {
    const handleMomentRouteChange = () => {
      setSelectedMomentId(getSelectedMomentId());
    };

    window.addEventListener("hashchange", handleMomentRouteChange);

    return () => {
      window.removeEventListener("hashchange", handleMomentRouteChange);
    };
  }, []);

  const goBack = () => setPage("meetroMoments");
  const openRelatedMoment = (relatedMoment) => {
    const momentId = String(relatedMoment?.id || "").trim();
    if (!momentId) return;
    localStorage.setItem("selectedMeetroMomentId", momentId);
    setPage(getMeetroMomentHashRoute(momentId));
  };
  const openRelationshipHistory = () => {
    if (account.activeMode === "business") {
      setPage("customerRelationshipsCenter");
      return;
    }
    setPage("myRequests");
  };

  if (!model.visible) {
    return (
      <div className="app-page meetro-readable-page" style={page}>
        <button type="button" style={backButton} onClick={goBack}>
          Back to Meetro Moments
        </button>

        <section style={unavailablePanel}>
          <div style={unavailableIcon}>
            <MeetroIcon name="verified" size={28} decorative />
          </div>
          <h1 style={unavailableTitle}>Meetro Moment unavailable</h1>
          <p style={unavailableText}>{unavailableCopy(model.reason)}</p>
        </section>

        <BottomNav setPage={setPage} currentPage="meetroMoments" />
      </div>
    );
  }

  const completionDate = formatDate(model.completionDate);
  const exactCompletionDate = formatDate(model.completionDate, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const photos = model.visual.photos || [];
  const heroPhoto = getPhotoUrl(photos[0]);
  const beforePhoto = getPhotoUrl(model.visual.beforePhotos?.[0]);
  const afterPhoto = getPhotoUrl(model.visual.afterPhotos?.[0]);
  const relatedMoments = model.relatedMoments || [];
  const detailItems = [
    { icon: "tools", label: "Project type", value: model.details.projectType },
    { icon: "schedule", label: "Completed", value: exactCompletionDate || completionDate },
    { icon: "clockAlert", label: "Duration", value: model.details.duration },
    { icon: "shield", label: "Warranty", value: describeValue(model.details.warranty) },
    { icon: "invoiceDoc", label: "Receipt", value: describeValue(model.details.receipt) },
    { icon: "docSearch", label: "Permit", value: model.details.permit },
    { icon: "creditCard", label: "Investment", value: model.details.investment },
    { icon: "location", label: "Project location", value: model.details.address },
  ].filter((item) => item.value);

  return (
    <div className="app-page meetro-readable-page" style={page}>
      <button type="button" style={backButton} onClick={goBack}>
        Back to Meetro Moments
      </button>

      <header style={header}>
        <span style={verifiedBadge}>Verified Meetro Moment</span>
        <h1 style={title}>{model.title}</h1>
        <div style={headerMeta}>
          <span>{model.category}</span>
          {completionDate && <span>{`Completed ${completionDate}`}</span>}
        </div>
        <p style={privacyMessage}>{model.privacy.message}</p>
      </header>

      <section style={heroVisual} aria-label="Main visual">
        {heroPhoto ? (
          <img src={heroPhoto} alt="" style={heroImage} />
        ) : (
          <div style={heroFallback}>
            <MeetroIcon name="verified" size={44} decorative />
            <span>Project history preserved</span>
          </div>
        )}
        <div style={heroOverlay}>
          <span style={heroKicker}>Why this moment matters</span>
          <p style={heroStory}>{model.story.whyItMattered}</p>
        </div>
        {model.visual.photoCount > 1 && (
          <span style={photoCount}>{`${model.visual.photoCount} photos`}</span>
        )}
      </section>

      {(beforePhoto || afterPhoto) && (
        <section style={beforeAfterGrid} aria-label="Before and after preview">
          {beforePhoto && (
            <figure style={beforeAfterFrame}>
              <img src={beforePhoto} alt="" style={beforeAfterImage} />
              <figcaption style={beforeAfterCaption}>Before</figcaption>
            </figure>
          )}
          {afterPhoto && (
            <figure style={beforeAfterFrame}>
              <img src={afterPhoto} alt="" style={beforeAfterImage} />
              <figcaption style={beforeAfterCaption}>After</figcaption>
            </figure>
          )}
        </section>
      )}

      <main style={contentGrid}>
        <section style={primaryColumn}>
          <section style={sectionCard}>
            <span style={sectionKicker}>Story</span>
            <h2 style={sectionTitle}>Why this moment matters</h2>
            <p style={bodyText}>{model.story.summary}</p>
            {model.story.thankYouMessage && (
              <p style={thankYou}>{model.story.thankYouMessage}</p>
            )}
          </section>

          <section style={sectionCard}>
            <span style={sectionKicker}>Project Journey</span>
            <h2 style={sectionTitle}>From first conversation to closure</h2>
            <ol style={journeyList}>
              {model.journey.map((step, index) => (
                <li key={step} style={journeyItem}>
                  <span style={journeyDot}>{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section style={sectionCard}>
            <span style={sectionKicker}>Related Moments</span>
            <h2 style={sectionTitle}>Relationship History</h2>
            {relatedMoments.length > 0 ? (
              <div style={relatedGrid}>
                {relatedMoments.map((relatedMoment) => (
                  <button
                    key={relatedMoment.id}
                    type="button"
                    style={relatedCard}
                    onClick={() => openRelatedMoment(relatedMoment)}
                  >
                    <span style={relatedDate}>
                      {formatDate(relatedMoment.completionDate || relatedMoment.closureDate)}
                    </span>
                    <strong style={relatedTitle}>
                      {relatedMoment.projectTitle || "Completed Project"}
                    </strong>
                    <span style={relatedCategory}>
                      {relatedMoment.projectCategory || "Verified work"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p style={emptyText}>
                Related Moments will appear as more verified work becomes part of this history.
              </p>
            )}
          </section>
        </section>

        <aside style={sideColumn}>
          <section style={sectionCard}>
            <span style={sectionKicker}>Relationship Context</span>
            <h2 style={sectionTitle}>People connected to this work</h2>
            <div style={relationshipStack}>
              {model.relationshipContext.customerName && (
                <div style={relationshipRow}>
                  <MeetroIcon name="people" size={18} decorative />
                  <span>{model.relationshipContext.customerName}</span>
                </div>
              )}
              {model.relationshipContext.businessName && (
                <div style={relationshipRow}>
                  <MeetroIcon name="businessProfile" size={18} decorative />
                  <span>{model.relationshipContext.businessName}</span>
                </div>
              )}
              {model.relationshipContext.relationshipDuration && (
                <div style={relationshipRow}>
                  <MeetroIcon name="history" size={18} decorative />
                  <span>{model.relationshipContext.relationshipDuration}</span>
                </div>
              )}
            </div>
            {model.relationshipContext.relationshipId && (
              <button type="button" style={secondaryButton} onClick={openRelationshipHistory}>
                Open Relationship History
              </button>
            )}
          </section>

          <section style={sectionCard}>
            <span style={sectionKicker}>Moment Details</span>
            <h2 style={sectionTitle}>Project proof</h2>
            {detailItems.length > 0 ? (
              <div style={detailsGrid}>
                {detailItems.map((item) => (
                  <DetailCard key={item.label} {...item} />
                ))}
              </div>
            ) : (
              <p style={emptyText}>
                More proof will appear here when it is confirmed and safe to show.
              </p>
            )}
            {model.details.reviewRating && (
              <div style={reviewCard}>
                <span style={reviewStars}>{`${model.details.reviewRating}/5 confirmed rating`}</span>
                {model.details.reviewText && <p style={reviewText}>{model.details.reviewText}</p>}
              </div>
            )}
          </section>
        </aside>
      </main>

      <BottomNav setPage={setPage} currentPage="meetroMoments" />
    </div>
  );
}

const page = {
  minHeight: "100dvh",
  width: "100%",
  maxWidth: "1180px",
  margin: "0 auto",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 18px) max(16px, env(safe-area-inset-right, 0px)) calc(108px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  background:
    "radial-gradient(circle at 15% 0%, rgba(251,191,36,0.16), transparent 30%), linear-gradient(180deg, #fffaf0 0%, #f8fafc 52%, var(--meetro-surface-sage, #eef4ea) 100%)",
  color: "#111827",
};

const backButton = {
  border: "1px solid rgba(226,232,240,0.9)",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.86)",
  color: "#4338ca",
  padding: "11px 14px",
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 14px 28px rgba(15,23,42,0.08)",
  marginBottom: "14px",
};

const header = {
  marginBottom: "16px",
};

const verifiedBadge = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "8px 11px",
  background: "#ecfdf5",
  color: "#047857",
  border: "1px solid #bbf7d0",
  fontSize: "12px",
  fontWeight: 950,
};

const title = {
  margin: "14px 0 8px",
  fontSize: "clamp(2rem, 6vw, 4.1rem)",
  lineHeight: 0.98,
  fontWeight: 950,
  letterSpacing: 0,
};

const headerMeta = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  color: "#475569",
  fontWeight: 850,
};

const privacyMessage = {
  margin: "10px 0 0",
  color: "#64748b",
  lineHeight: 1.5,
  fontWeight: 760,
};

const heroVisual = {
  position: "relative",
  minHeight: "clamp(330px, 48vw, 560px)",
  borderRadius: "34px",
  overflow: "hidden",
  background: "linear-gradient(135deg, #0f172a, #312e81)",
  boxShadow: "0 28px 70px rgba(15,23,42,0.22)",
  border: "1px solid rgba(255,255,255,0.78)",
  marginBottom: "16px",
};

const heroImage = {
  width: "100%",
  height: "100%",
  minHeight: "clamp(330px, 48vw, 560px)",
  objectFit: "cover",
  display: "block",
};

const heroFallback = {
  minHeight: "clamp(330px, 48vw, 560px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  color: "#fef3c7",
  fontWeight: 950,
};

const heroOverlay = {
  position: "absolute",
  left: "clamp(18px, 5vw, 42px)",
  bottom: "clamp(18px, 5vw, 42px)",
  width: "min(560px, calc(100% - 36px))",
  color: "#ffffff",
  textShadow: "0 12px 28px rgba(0,0,0,0.38)",
};

const heroKicker = {
  display: "block",
  color: "#fde68a",
  fontSize: "12px",
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: "8px",
};

const heroStory = {
  margin: 0,
  fontSize: "clamp(1.25rem, 3vw, 2.3rem)",
  lineHeight: 1.15,
  fontWeight: 900,
};

const photoCount = {
  position: "absolute",
  right: "18px",
  top: "18px",
  borderRadius: "999px",
  padding: "8px 11px",
  background: "rgba(15,23,42,0.72)",
  color: "#fff",
  fontSize: "12px",
  fontWeight: 950,
  backdropFilter: "blur(14px)",
};

const beforeAfterGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
  marginBottom: "16px",
};

const beforeAfterFrame = {
  margin: 0,
  borderRadius: "24px",
  overflow: "hidden",
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(226,232,240,0.9)",
  boxShadow: "0 16px 38px rgba(15,23,42,0.08)",
};

const beforeAfterImage = {
  width: "100%",
  height: "190px",
  objectFit: "cover",
  display: "block",
};

const beforeAfterCaption = {
  padding: "10px 12px",
  color: "#475569",
  fontSize: "12px",
  fontWeight: 950,
};

const contentGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
  gap: "16px",
};

const primaryColumn = {
  display: "grid",
  gap: "16px",
  minWidth: 0,
};

const sideColumn = {
  display: "grid",
  alignContent: "start",
  gap: "16px",
  minWidth: 0,
};

const sectionCard = {
  borderRadius: "28px",
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(226,232,240,0.9)",
  boxShadow: "0 18px 42px rgba(15,23,42,0.08)",
  padding: "20px",
  minWidth: 0,
};

const sectionKicker = {
  display: "block",
  color: "#b7791f",
  fontSize: "12px",
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: "8px",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "22px",
  lineHeight: 1.15,
  fontWeight: 950,
};

const bodyText = {
  margin: "12px 0 0",
  color: "#334155",
  fontSize: "16px",
  lineHeight: 1.62,
  fontWeight: 720,
};

const thankYou = {
  margin: "14px 0 0",
  borderRadius: "20px",
  background: "#fffbeb",
  color: "#78350f",
  padding: "14px",
  lineHeight: 1.5,
  fontWeight: 800,
};

const journeyList = {
  listStyle: "none",
  display: "grid",
  gap: "10px",
  padding: 0,
  margin: "16px 0 0",
};

const journeyItem = {
  display: "grid",
  gridTemplateColumns: "34px 1fr",
  alignItems: "center",
  gap: "10px",
  color: "#334155",
  fontWeight: 850,
};

const journeyDot = {
  width: "34px",
  height: "34px",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #f59e0b, var(--meetro-color-charcoal, #172317))",
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  fontWeight: 950,
};

const relatedGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "10px",
  marginTop: "14px",
};

const relatedCard = {
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  background: "#ffffff",
  padding: "14px",
  display: "grid",
  gap: "6px",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(15,23,42,0.06)",
  font: "inherit",
};

const relatedDate = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 850,
};

const relatedTitle = {
  color: "#111827",
  fontSize: "15px",
  lineHeight: 1.2,
  overflowWrap: "anywhere",
};

const relatedCategory = {
  color: "#475569",
  fontSize: "12px",
  fontWeight: 800,
};

const emptyText = {
  margin: "12px 0 0",
  color: "#64748b",
  lineHeight: 1.5,
  fontWeight: 750,
};

const relationshipStack = {
  display: "grid",
  gap: "10px",
  marginTop: "14px",
};

const relationshipRow = {
  display: "grid",
  gridTemplateColumns: "24px 1fr",
  alignItems: "center",
  gap: "10px",
  color: "#334155",
  fontWeight: 850,
  overflowWrap: "anywhere",
};

const secondaryButton = {
  width: "100%",
  border: "none",
  borderRadius: "18px",
  background: "linear-gradient(135deg, #f59e0b, var(--meetro-color-charcoal, #172317))",
  color: "#fff",
  padding: "12px 14px",
  fontWeight: 950,
  cursor: "pointer",
  marginTop: "16px",
  boxShadow: "0 16px 28px rgba(23,35,23,0.18)",
};

const detailsGrid = {
  display: "grid",
  gap: "10px",
  marginTop: "14px",
};

const detailCard = {
  display: "grid",
  gridTemplateColumns: "42px 1fr",
  gap: "10px",
  alignItems: "start",
  borderRadius: "20px",
  background: "#f8fafc",
  padding: "12px",
  border: "1px solid #e2e8f0",
};

const detailIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #ede9fe, #dbeafe)",
  color: "var(--meetro-color-charcoal, #172317)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const detailTextBlock = {
  minWidth: 0,
};

const detailLabel = {
  display: "block",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 850,
  marginBottom: "4px",
};

const detailValue = {
  display: "block",
  color: "#111827",
  fontSize: "14px",
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};

const reviewCard = {
  marginTop: "12px",
  borderRadius: "20px",
  background: "#fffbeb",
  color: "#78350f",
  padding: "14px",
};

const reviewStars = {
  display: "block",
  fontWeight: 950,
};

const reviewText = {
  margin: "8px 0 0",
  lineHeight: 1.5,
  fontWeight: 760,
};

const unavailablePanel = {
  borderRadius: "30px",
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(226,232,240,0.9)",
  boxShadow: "0 18px 42px rgba(15,23,42,0.08)",
  padding: "28px",
};

const unavailableIcon = {
  width: "64px",
  height: "64px",
  borderRadius: "22px",
  background: "linear-gradient(135deg, #ede9fe, #dbeafe)",
  color: "var(--meetro-color-charcoal, #172317)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "16px",
};

const unavailableTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "28px",
  lineHeight: 1.1,
  fontWeight: 950,
};

const unavailableText = {
  margin: "10px 0 0",
  color: "#64748b",
  lineHeight: 1.5,
  fontWeight: 760,
};

export default MeetroMomentDetails;
