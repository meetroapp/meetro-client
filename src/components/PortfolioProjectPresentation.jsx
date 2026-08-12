import { useState } from "react";
import MeetroIcon from "./MeetroIcon";
import { getBusinessPortfolioProjectImages } from "../utils/businessPortfolioStorage";

function clampIndex(index, length) {
  if (!length) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

function BusinessTrustContext({ trustContext }) {
  const reviewCount = Number(trustContext?.reviewCount || 0);
  const averageRating = Number(trustContext?.averageRating || 0);

  if (!reviewCount || !averageRating) return null;

  return (
    <div style={businessTrustCard} aria-label="Business rating and reviews">
      <span style={businessTrustLabel}>Business rating</span>
      <strong style={businessTrustScore}>★ {averageRating.toFixed(1)}</strong>
      <span style={businessTrustReviews}>
        {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
      </span>
    </div>
  );
}

function ProjectMediaPreview({ project, expanded = false }) {
  const images = getBusinessPortfolioProjectImages(project);
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = clampIndex(activeIndex, images.length);
  const activeImage = images[safeIndex] || "";
  const title = project?.title || "Portfolio project";
  const multiple = images.length > 1;

  function showPrevious() {
    setActiveIndex((current) => (current <= 0 ? images.length - 1 : current - 1));
  }

  function showNext() {
    setActiveIndex((current) => (current >= images.length - 1 ? 0 : current + 1));
  }

  return (
    <div style={expanded ? projectViewMediaGroup : cardMediaGroup}>
      <div style={expanded ? projectViewMediaFrame : cardMediaFrame}>
        {activeImage ? (
          <img
            src={activeImage}
            alt={`${title} photo ${safeIndex + 1}`}
            style={mediaImage}
            loading={expanded ? "eager" : "lazy"}
            decoding="async"
          />
        ) : (
          <div style={emptyMediaState}>
            <MeetroIcon name="photoCount" size={26} decorative />
            <span>No project photos yet</span>
          </div>
        )}

        {multiple && (
          <>
            <button
              type="button"
              style={{ ...carouselButton, left: "10px" }}
              onClick={showPrevious}
              aria-label={`Previous photo for ${title}`}
            >
              ←
            </button>
            <button
              type="button"
              style={{ ...carouselButton, right: "10px" }}
              onClick={showNext}
              aria-label={`Next photo for ${title}`}
            >
              →
            </button>
            <span style={photoPosition} aria-live="polite">
              {safeIndex + 1} of {images.length}
            </span>
          </>
        )}
      </div>

      {expanded && multiple && (
        <div style={thumbnailRow} aria-label={`All photos for ${title}`}>
          {images.map((url, index) => (
            <button
              key={`${project.id}-photo-${index}`}
              type="button"
              style={{
                ...thumbnailButton,
                ...(index === safeIndex ? activeThumbnailButton : {}),
              }}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show ${title} photo ${index + 1} of ${images.length}`}
              aria-pressed={index === safeIndex}
            >
              <img src={url} alt="" style={thumbnailImage} loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PortfolioProjectGrid({ children, ariaLabel = "Portfolio projects" }) {
  return (
    <div style={projectGrid} aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export function PortfolioProjectCard({
  project,
  businessName = "",
  trustContext = null,
  status = null,
  onView,
  managementContent = null,
}) {
  const exactProjectId = String(project?.id || "");
  const title = project?.title || "Untitled project";

  return (
    <article style={projectCard} data-portfolio-project-id={exactProjectId}>
      <ProjectMediaPreview project={project} />

      <div style={projectCardContent}>
        {status && (
          <div style={statusRow}>
            <span style={{ ...statusPill, ...(status.style || {}) }}>{status.label}</span>
            {status.secondaryLabel && (
              <span style={secondaryPill}>{status.secondaryLabel}</span>
            )}
          </div>
        )}

        <h3 style={projectTitle}>{title}</h3>
        <p style={projectDescription}>{project?.description || "No description yet."}</p>

        <div style={projectTrustContext}>
          <span style={proofLabel}>Proof of work</span>
          {businessName && <span style={businessNameLabel}>{businessName}</span>}
        </div>

        <BusinessTrustContext trustContext={trustContext} />

        <button
          type="button"
          style={viewProjectButton}
          onClick={() => onView?.(exactProjectId)}
          disabled={!exactProjectId}
        >
          View Project
        </button>

        {managementContent && <div style={managementArea}>{managementContent}</div>}
      </div>
    </article>
  );
}

export function PortfolioProjectView({
  project,
  businessName = "",
  trustContext = null,
  visibilityContext = "",
  onBack,
  onManage = null,
  manageLabel = "Edit Portfolio",
}) {
  if (!project) return null;

  return (
    <section style={projectView} aria-labelledby="portfolio-project-view-title">
      <div style={projectViewToolbar}>
        <button type="button" style={backButton} onClick={onBack}>
          ← Back to Portfolio
        </button>
        {onManage && (
          <button type="button" style={manageButton} onClick={onManage}>
            {manageLabel}
          </button>
        )}
      </div>

      <header style={projectViewHeader}>
        <div style={proofEyebrow}>Proof of Work</div>
        <h1 id="portfolio-project-view-title" style={projectViewTitle}>
          {project.title || "Untitled project"}
        </h1>
        {businessName && <p style={projectViewBusiness}>{businessName}</p>}
        {visibilityContext && <p style={visibilityText}>{visibilityContext}</p>}
      </header>

      <ProjectMediaPreview project={project} expanded />

      <div style={projectStoryCard}>
        <h2 style={projectStoryTitle}>About this project</h2>
        <p style={projectStoryText}>{project.description || "No description yet."}</p>
        <BusinessTrustContext trustContext={trustContext} />
      </div>
    </section>
  );
}

const projectGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 390px), 1fr))",
  alignItems: "stretch",
  gap: "18px",
  width: "100%",
  minWidth: 0,
};
const projectCard = {
  background: "linear-gradient(180deg, rgba(255,253,248,0.99), rgba(255,255,255,0.98))",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(74,52,40,0.12)",
  boxShadow: "0 12px 30px rgba(74,52,40,0.07)",
  minWidth: 0,
  height: "100%",
  display: "flex",
  flexDirection: "column",
};
const cardMediaGroup = { padding: "14px 14px 0", minWidth: 0 };
const cardMediaFrame = {
  position: "relative",
  width: "100%",
  aspectRatio: "16 / 9",
  overflow: "hidden",
  borderRadius: "18px",
  background: "#eef2ed",
  boxSizing: "border-box",
};
const projectViewMediaGroup = { width: "100%", maxWidth: "820px", margin: "0 auto" };
const projectViewMediaFrame = {
  ...cardMediaFrame,
  borderRadius: "24px",
  boxShadow: "0 18px 42px rgba(20,53,31,0.14)",
};
const mediaImage = { width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" };
const emptyMediaState = { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", padding: "24px", boxSizing: "border-box", background: "linear-gradient(135deg, #eef4ea, #f8f3e8)", color: "#5d665f", fontWeight: 800, textAlign: "center" };
const carouselButton = { position: "absolute", top: "50%", transform: "translateY(-50%)", width: "44px", height: "44px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.36)", background: "rgba(20,53,31,0.78)", backdropFilter: "blur(8px)", color: "white", fontSize: "20px", fontWeight: 900, cursor: "pointer", zIndex: 2 };
const photoPosition = { position: "absolute", left: "50%", bottom: "10px", transform: "translateX(-50%)", background: "rgba(20,53,31,0.8)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.24)", color: "white", padding: "7px 11px", borderRadius: "999px", fontSize: "12px", fontWeight: 900, whiteSpace: "nowrap" };
const thumbnailRow = { display: "flex", gap: "10px", overflowX: "auto", padding: "12px 2px 4px", scrollbarWidth: "thin" };
const thumbnailButton = { flex: "0 0 72px", width: "72px", height: "54px", border: "2px solid transparent", borderRadius: "12px", overflow: "hidden", padding: 0, background: "#eef2ed", cursor: "pointer" };
const activeThumbnailButton = { border: "2px solid var(--meetro-color-forest, #1f4d34)", boxShadow: "0 0 0 2px rgba(31,77,52,0.12)" };
const thumbnailImage = { width: "100%", height: "100%", display: "block", objectFit: "cover" };
const projectCardContent = { padding: "18px", minWidth: 0, flex: 1, display: "flex", flexDirection: "column" };
const statusRow = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "10px" };
const statusPill = { display: "inline-flex", padding: "7px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 900, border: "1px solid transparent" };
const secondaryPill = { ...statusPill, background: "rgba(238,244,234,0.9)", color: "var(--meetro-color-forest, #1f4d34)", borderColor: "rgba(31,77,52,0.22)" };
const projectTitle = { fontSize: "22px", margin: "0 0 8px", lineHeight: 1.2, overflowWrap: "break-word" };
const projectDescription = { color: "#4b5563", lineHeight: 1.6, whiteSpace: "pre-wrap", overflowWrap: "break-word", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", margin: "0 0 12px" };
const projectTrustContext = { display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap", color: "#5d665f", fontSize: "12px", marginTop: "auto" };
const proofLabel = { color: "var(--meetro-color-forest, #1f4d34)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.45px" };
const businessNameLabel = { fontWeight: 750 };
const businessTrustCard = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "12px", padding: "10px 12px", borderRadius: "16px", border: "1px solid rgba(31,77,52,0.12)", background: "rgba(238,244,234,0.68)", color: "#334155" };
const businessTrustLabel = { fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.35px", color: "var(--meetro-color-forest, #1f4d34)" };
const businessTrustScore = { fontSize: "14px", color: "#713f12" };
const businessTrustReviews = { fontSize: "12px", fontWeight: 750 };
const viewProjectButton = { width: "100%", minHeight: "44px", border: "1px solid rgba(31,77,52,0.22)", borderRadius: "15px", background: "rgba(255,255,255,0.86)", backdropFilter: "blur(6px)", color: "var(--meetro-color-forest, #1f4d34)", marginTop: "14px", padding: "10px 14px", fontWeight: 900, cursor: "pointer" };
const managementArea = { marginTop: "14px", paddingTop: "14px", borderTop: "1px solid rgba(74,52,40,0.12)" };
const projectView = { width: "100%", minWidth: 0, display: "grid", gap: "22px", paddingBottom: "20px" };
const projectViewToolbar = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" };
const backButton = { minHeight: "44px", border: "1px solid rgba(31,77,52,0.14)", background: "rgba(255,255,255,0.76)", backdropFilter: "blur(8px)", color: "var(--meetro-color-forest, #1f4d34)", padding: "10px 14px", borderRadius: "16px", fontWeight: 850, cursor: "pointer" };
const manageButton = { minHeight: "44px", border: "none", background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))", color: "white", padding: "10px 15px", borderRadius: "16px", fontWeight: 900, cursor: "pointer" };
const projectViewHeader = { textAlign: "center", maxWidth: "760px", margin: "0 auto", minWidth: 0 };
const proofEyebrow = { color: "var(--meetro-color-coffee, #4a3428)", fontSize: "12px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px" };
const projectViewTitle = { margin: 0, color: "#111827", fontSize: "clamp(30px, 7vw, 44px)", lineHeight: 1.08, overflowWrap: "break-word" };
const projectViewBusiness = { margin: "10px 0 0", color: "var(--meetro-color-forest, #1f4d34)", fontWeight: 850 };
const visibilityText = { margin: "8px 0 0", color: "#5d665f", lineHeight: 1.5 };
const projectStoryCard = { width: "100%", maxWidth: "820px", margin: "0 auto", background: "rgba(255,253,248,0.98)", border: "1px solid rgba(74,52,40,0.12)", borderRadius: "24px", padding: "clamp(18px, 5vw, 26px)", boxSizing: "border-box", boxShadow: "0 12px 30px rgba(74,52,40,0.06)" };
const projectStoryTitle = { margin: "0 0 10px", color: "#111827", fontSize: "22px" };
const projectStoryText = { margin: 0, color: "#4b5563", lineHeight: 1.7, whiteSpace: "pre-wrap", overflowWrap: "break-word" };
