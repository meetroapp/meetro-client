import { useMemo } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import { getMeetroMomentHashRoute } from "../utils/meetroMomentRoutes";
import { getLanguage, t } from "../utils/language";
import {
  getMeetroMomentsExperience,
  getTimelineMomentPrivacyLabel,
  getTimelineMomentsForViewer,
  isVerifiedTimelineMoment,
  readTimelineMoments,
} from "../utils/meetroTimeline";
import { canReadLegacyWorkflowStorage } from "../utils/clientWorkflowStoragePolicy";

const STAGED_MOMENT_INSPIRATION = [
  {
    id: "home-story",
    type: "Home Story",
    title: "The kitchen where Sunday dinners began",
    body: "One finished room became the place people returned to, again and again.",
    imageUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80",
    icon: "home",
  },
  {
    id: "relationship-story",
    type: "Relationship Story",
    title: "One project became years of trust",
    body: "A promise kept can turn a first visit into a relationship people remember.",
    imageUrl: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80",
    icon: "people",
  },
  {
    id: "business-legacy",
    type: "Business Legacy",
    title: "The thank-you that became a reputation",
    body: "Great work lasts longer when people remember how carefully they were treated.",
    imageUrl: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
    icon: "businessProfile",
  },
  {
    id: "community-impact",
    type: "Community Impact",
    title: "Neighbors had one more place to belong",
    body: "Some work matters because it gives everyday life a little more connection.",
    imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
    icon: "trust",
  },
];

const WONDER_HERO = {
  imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1600&q=82",
};

const STAGED_REFLECTION = {
  title: "Summer evenings became family traditions",
  body: "One completed project can become the reason people gather, feel safe, and remember what changed.",
  imageUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1400&q=80",
};

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getPhotoUrl(photo) {
  if (!photo) return "";
  if (typeof photo === "string") return photo;
  return photo.url || photo.src || photo.previewUrl || photo.imageUrl || "";
}

function getMomentPrimaryPhoto(moment = {}) {
  return (
    getPhotoUrl(moment.afterPhotos?.[0]) ||
    getPhotoUrl(moment.beforePhotos?.[0]) ||
    getPhotoUrl(moment.photos?.[0]) ||
    ""
  );
}

function getMomentIconName(moment = {}) {
  const category = String(moment.projectCategory || moment.category || "").toLowerCase();

  if (category.includes("roof")) return "home";
  if (category.includes("hvac") || category.includes("plumb")) return "tools";
  if (category.includes("electric")) return "bolt";
  if (category.includes("landscape")) return "assetHome";
  if (category.includes("review")) return "reviews";
  if (category.includes("warranty")) return "shield";
  if (category.includes("certification")) return "sealCheck";

  return "verified";
}

function getRelationshipContext(moment = {}, audience = "") {
  if (audience === "business") {
    return [moment.customerName, moment.projectCategory].filter(Boolean).join(" · ");
  }

  if (audience === "homeowner") {
    return [moment.businessName, moment.projectCategory].filter(Boolean).join(" · ");
  }

  return [moment.businessName, moment.customerName, moment.projectCategory].filter(Boolean).join(" · ");
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
    employee: activeMode === "employee" || accountType === "employee",
    relationshipId:
      localStorage.getItem("activeRelationshipId") ||
      localStorage.getItem("homeownerRelationshipId") ||
      localStorage.getItem("activeConversationId") ||
      "",
    userId: user.id || user.userId || user.user_id || localStorage.getItem("userId") || "",
  };
}

function getVisibleMoments(account) {
  if (!canReadLegacyWorkflowStorage()) return [];
  const moments = readTimelineMoments(localStorage);
  return getTimelineMomentsForViewer(moments, account);
}

function MeetroMoments({ setPage }) {
  const language = getLanguage();
  const account = getActiveAccountContext();
  const experience = getMeetroMomentsExperience({
    role: account.employee ? "employee" : account.activeMode,
    activeMode: account.activeMode,
    accountType: account.accountType,
    hasBusinessProfile: account.hasBusinessProfile,
  });
  const moments = useMemo(() => getVisibleMoments(account), [
    account.activeMode,
    account.accountType,
    account.businessId,
    account.businessName,
    account.hasBusinessProfile,
  ]);

  const openMomentDetails = (moment) => {
    const momentId = String(moment?.id || "").trim();
    if (!momentId) return;
    localStorage.setItem("selectedMeetroMomentId", momentId);
    setPage(getMeetroMomentHashRoute(momentId));
  };
  const stagedMoments = STAGED_MOMENT_INSPIRATION.slice(
    0,
    Math.max(0, STAGED_MOMENT_INSPIRATION.length - moments.length)
  );
  const reflectionMoment = moments[0] || null;
  const reflectionImage = reflectionMoment
    ? getMomentPrimaryPhoto(reflectionMoment) || STAGED_REFLECTION.imageUrl
    : STAGED_REFLECTION.imageUrl;
  const reflectionTitle = reflectionMoment?.projectTitle || STAGED_REFLECTION.title;
  const reflectionBody = reflectionMoment
    ? t("momentsVerifiedReflectionBody", language)
    : STAGED_REFLECTION.body;
  const scrollToInspiration = () => {
    document.getElementById("meetro-moments-inspiration")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="app-page meetro-readable-page" style={page}>
      <button type="button" style={backButton} onClick={() => setPage("profile")}>
        {t("momentsBackToProfile", language)}
      </button>

      <header style={welcomeHero}>
        <img src={WONDER_HERO.imageUrl} alt="" style={welcomeHeroImage} />
        <div style={welcomeHeroShade} />
        <div style={welcomeCopy}>
          <span style={eyebrow}>{t("momentsEyebrow", language)}</span>
          <h1 style={title}>{experience.title}</h1>
          <p style={subtitle}>{experience.subtitle}</p>
          <p style={welcomeText}>
            {t("momentsWelcomeText", language)}
          </p>
          <div
            style={preservationStatement}
            aria-label={t("momentsPreservationStatementAria", language)}
          >
            <strong style={preservationStatementTitle}>
              {t("momentsPreservationStatementTitle", language)}
            </strong>
            <span style={preservationStatementText}>
              {t("momentsPreservationStatementText", language)}
            </span>
          </div>
        </div>

        <div style={welcomePromise} aria-label={t("momentsPromiseAria", language)}>
          <MeetroIcon name="verified" size={24} decorative />
          <span>{t("momentsPromiseText", language)}</span>
        </div>
      </header>

      <section style={reflectionSection} aria-label={t("momentsReflectionAria", language)}>
        <img src={reflectionImage} alt="" style={reflectionImageStyle} />
        <div style={reflectionShade} />
        <div style={reflectionContent}>
          <span style={reflectionLabel}>
            {t("momentsReflectionLabel", language)}
          </span>
          <h2 style={reflectionTitleStyle}>{reflectionTitle}</h2>
          <p style={reflectionText}>{reflectionBody}</p>
          <button
            type="button"
            style={reflectionButton}
            onClick={() =>
              reflectionMoment ? openMomentDetails(reflectionMoment) : scrollToInspiration()
            }
          >
            {reflectionMoment
              ? t("momentsViewMoment", language)
              : t("momentsSeeWhatMomentsBecome", language)}
          </button>
        </div>
      </section>

      <section id="meetro-moments-inspiration" style={inspirationSection}>
        <div style={sectionHeader}>
          <span style={sectionEyebrow}>{t("momentsStoryInspiration", language)}</span>
          <h2 style={sectionTitle}>
            {moments.length > 0
              ? t("momentsStoryTakingOver", language)
              : t("momentsStoryCanBecome", language)}
          </h2>
          <p style={sectionText}>
            {t("momentsInspirationText", language)}
          </p>
        </div>

        {stagedMoments.length > 0 ? (
          <div style={stagedGrid} aria-label={t("momentsInspirationAria", language)}>
            {stagedMoments.map((stagedMoment) => (
              <article key={stagedMoment.id} style={stagedCard}>
                <img src={stagedMoment.imageUrl} alt="" style={stagedImage} />
                <div style={stagedOverlay} />
                <div style={stagedContent}>
                  <span style={stagedType}>
                    <MeetroIcon name={stagedMoment.icon} size={15} decorative />
                    {stagedMoment.type}
                  </span>
                  <h3 style={stagedTitle}>{stagedMoment.title}</h3>
                  <p style={stagedBody}>{stagedMoment.body}</p>
                  <span style={stagedNote}>{t("momentsFutureMemory", language)}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div style={legacyCompleteCard}>
            <MeetroIcon name="verified" size={26} decorative />
            <p>{t("momentsCompleteOwnStory", language)}</p>
          </div>
        )}
      </section>

      <section style={momentList} aria-label={t("momentsYourMoments", language)}>
        <div style={sectionHeader}>
          <span style={sectionEyebrow}>{t("momentsVerifiedHistory", language)}</span>
          <h2 style={sectionTitle}>{t("momentsYourMoments", language)}</h2>
        </div>

        {moments.length === 0 ? (
          <div style={momentsEmptyCard}>
            <MeetroIcon name="verified" size={26} decorative />
            <div>
              <h3 style={momentsEmptyTitle}>{t("momentsEmptyTitle", language)}</h3>
              <p style={momentsEmptyText}>{t("momentsEmptyText", language)}</p>
            </div>
          </div>
        ) : (
          moments.map((moment) => {
            const privacy = getTimelineMomentPrivacyLabel(moment);
            const verified = isVerifiedTimelineMoment(moment);
            const relationshipContext = getRelationshipContext(moment, experience.audience);
            const completionDate = formatDate(moment.completionDate || moment.closureDate);
            const confirmed = privacy.publicVisible === true || moment.customerConfirmed === true;
            const beforePhoto = confirmed ? getPhotoUrl(moment.beforePhotos?.[0]) : "";
            const afterPhoto = confirmed ? getPhotoUrl(moment.afterPhotos?.[0]) : "";
            const hasPhotoPreview = Boolean(beforePhoto || afterPhoto);
            const privacyStyle = {
              ...privacyPill,
              ...(privacy.key === "published"
                ? privacyPillPublished
                : privacy.key === "pending"
                  ? privacyPillPending
                  : privacy.key === "private"
                    ? privacyPillPrivate
                    : privacyPillHidden),
            };

            return (
              <button
                key={moment.id}
                type="button"
                style={{ ...momentCard, ...momentCardButton }}
                onClick={() => openMomentDetails(moment)}
                aria-label={`Open ${moment.projectTitle || "Meetro Moment"}`}
              >
                <div style={momentIcon}>
                  <MeetroIcon name={getMomentIconName(moment)} size={24} decorative />
                </div>

                <div style={momentBody}>
                  <div style={momentTopline}>
                    <span style={momentMeta}>
                      {completionDate ? `Completed ${completionDate}` : "Completed Project"}
                    </span>
                    <span style={privacyStyle}>{privacy.label}</span>
                  </div>

                  <h2 style={momentTitle}>{moment.projectTitle || "Completed Project"}</h2>

                  {relationshipContext && (
                    <p style={momentDetails}>{relationshipContext}</p>
                  )}

                  <p style={privacyText}>{privacy.message}</p>

                  {(confirmed && moment.reviewRating) || moment.warranty || moment.receipt ? (
                    <div style={momentPills}>
                      {confirmed && moment.reviewRating && (
                        <span style={momentPill}>{`${moment.reviewRating}/5 Review`}</span>
                      )}
                      {moment.warranty && <span style={momentPill}>Warranty Included</span>}
                      {moment.receipt && (
                        <span style={momentPill}>{t("momentsReceiptSaved", language)}</span>
                      )}
                    </div>
                  ) : null}

                  {hasPhotoPreview && (
                    <div style={photoPreview} aria-label={t("momentsBeforeAfterPreviewAria", language)}>
                      {beforePhoto && (
                        <figure style={photoFrame}>
                          <img src={beforePhoto} alt="" style={photoImage} />
                          <figcaption style={photoCaption}>Before</figcaption>
                        </figure>
                      )}
                      {afterPhoto && (
                        <figure style={photoFrame}>
                          <img src={afterPhoto} alt="" style={photoImage} />
                          <figcaption style={photoCaption}>After</figcaption>
                        </figure>
                      )}
                    </div>
                  )}

                  {moment.thankYouMessage && (
                    <p style={thankYouText}>{moment.thankYouMessage}</p>
                  )}

                  {verified && (
                    <span style={verifiedLabel}>{t("momentsVerifiedLabel", language)}</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </section>

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
    "calc(env(safe-area-inset-top, 0px) + 18px) max(16px, env(safe-area-inset-right, 0px)) calc(104px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  background:
    "radial-gradient(circle at 14% 0%, rgba(245,158,11,0.16), transparent 30%), linear-gradient(180deg, #fffaf0 0%, #f8fafc 48%, var(--meetro-surface-sage, #eef4ea) 100%)",
  color: "#111827",
};

const backButton = {
  border: "none",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.88)",
  color: "#4338ca",
  padding: "12px 14px",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
  marginBottom: "14px",
};

const welcomeHero = {
  position: "relative",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: "18px",
  alignItems: "stretch",
  minHeight: "clamp(360px, 42vw, 520px)",
  background: "#111827",
  borderRadius: "32px",
  padding: "clamp(22px, 4vw, 34px)",
  boxShadow: "0 28px 70px rgba(15,23,42,0.18)",
  border: "1px solid rgba(255,255,255,0.8)",
  marginBottom: "16px",
  overflow: "hidden",
  isolation: "isolate",
};

const welcomeHeroImage = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  filter: "saturate(1.02) contrast(1.04)",
  transform: "scale(1.01)",
  zIndex: 0,
};

const welcomeHeroShade = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(90deg, rgba(15,23,42,0.86), rgba(15,23,42,0.58) 46%, rgba(15,23,42,0.18)), linear-gradient(0deg, rgba(15,23,42,0.68), rgba(15,23,42,0.08) 58%)",
  zIndex: 1,
};

const welcomeCopy = {
  position: "relative",
  zIndex: 2,
  minWidth: 0,
  alignSelf: "end",
  maxWidth: "720px",
};

const welcomePromise = {
  position: "relative",
  zIndex: 2,
  alignSelf: "end",
  justifySelf: "end",
  maxWidth: "300px",
  borderRadius: "26px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.24), rgba(255,255,255,0.12))",
  border: "1px solid rgba(255,255,255,0.28)",
  color: "#fff7ed",
  padding: "18px",
  display: "grid",
  alignContent: "center",
  gap: "10px",
  fontSize: "18px",
  fontWeight: 950,
  lineHeight: 1.25,
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), 0 18px 38px rgba(2,6,23,0.18)",
};

const eyebrow = {
  display: "block",
  color: "#fde68a",
  fontSize: "12px",
  fontWeight: 950,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "8px",
};

const title = {
  margin: 0,
  fontSize: "clamp(2.4rem, 6vw, 4.8rem)",
  lineHeight: 0.96,
  fontWeight: 950,
  color: "#fff",
  textShadow: "0 16px 38px rgba(0,0,0,0.44)",
};

const subtitle = {
  margin: "12px 0 0",
  color: "rgba(255,255,255,0.88)",
  fontSize: "clamp(1rem, 2.1vw, 1.22rem)",
  lineHeight: 1.45,
  fontWeight: 780,
  maxWidth: "620px",
  textShadow: "0 12px 30px rgba(0,0,0,0.42)",
};

const welcomeText = {
  margin: "16px 0 0",
  color: "rgba(255,255,255,0.94)",
  fontSize: "clamp(1.1rem, 2.3vw, 1.48rem)",
  lineHeight: 1.5,
  fontWeight: 820,
  maxWidth: "680px",
  textShadow: "0 12px 30px rgba(0,0,0,0.42)",
};

const preservationStatement = {
  marginTop: "18px",
  width: "min(620px, 100%)",
  borderRadius: "22px",
  background: "rgba(255,255,255,0.16)",
  border: "1px solid rgba(255,255,255,0.26)",
  padding: "15px 16px",
  display: "grid",
  gap: "5px",
  color: "#fff",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 18px 38px rgba(2,6,23,0.18)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

const preservationStatementTitle = {
  fontSize: "13px",
  lineHeight: 1.2,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#fde68a",
};

const preservationStatementText = {
  fontSize: "15px",
  lineHeight: 1.45,
  fontWeight: 780,
  color: "rgba(255,255,255,0.92)",
};

const reflectionSection = {
  position: "relative",
  minHeight: "clamp(360px, 48vw, 520px)",
  borderRadius: "34px",
  overflow: "hidden",
  marginBottom: "18px",
  background: "#111827",
  boxShadow: "0 28px 70px rgba(15,23,42,0.22)",
  border: "1px solid rgba(255,255,255,0.82)",
};

const reflectionImageStyle = {
  width: "100%",
  height: "100%",
  minHeight: "clamp(360px, 48vw, 520px)",
  display: "block",
  objectFit: "cover",
};

const reflectionShade = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(90deg, rgba(15,23,42,0.88), rgba(15,23,42,0.46) 48%, rgba(15,23,42,0.18)), linear-gradient(0deg, rgba(15,23,42,0.58), transparent 54%)",
};

const reflectionContent = {
  position: "absolute",
  left: "clamp(20px, 5vw, 46px)",
  bottom: "clamp(22px, 5vw, 46px)",
  width: "min(620px, calc(100% - 40px))",
  color: "#fff",
};

const reflectionLabel = {
  display: "block",
  color: "#fde68a",
  fontSize: "12px",
  fontWeight: 950,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "10px",
};

const reflectionTitleStyle = {
  margin: 0,
  fontSize: "clamp(2rem, 6vw, 4rem)",
  lineHeight: 0.98,
  letterSpacing: 0,
  fontWeight: 950,
  textShadow: "0 16px 34px rgba(0,0,0,0.42)",
};

const reflectionText = {
  margin: "14px 0 0",
  fontSize: "clamp(1rem, 2.4vw, 1.35rem)",
  lineHeight: 1.48,
  fontWeight: 760,
  textShadow: "0 10px 26px rgba(0,0,0,0.38)",
};

const reflectionButton = {
  marginTop: "20px",
  border: "1px solid rgba(255,255,255,0.28)",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #d97706, #f59e0b)",
  color: "#fff",
  padding: "12px 16px",
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 16px 34px rgba(217,119,6,0.28)",
};

const inspirationSection = {
  marginBottom: "18px",
};

const sectionHeader = {
  margin: "0 0 12px",
};

const sectionEyebrow = {
  display: "block",
  color: "#b7791f",
  fontSize: "12px",
  fontWeight: 950,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "6px",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "clamp(1.45rem, 3vw, 2rem)",
  lineHeight: 1.12,
  fontWeight: 950,
};

const sectionText = {
  margin: "8px 0 0",
  color: "#64748b",
  lineHeight: 1.55,
  fontWeight: 760,
  maxWidth: "760px",
};

const stagedGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
  gap: "14px",
};

const stagedCard = {
  position: "relative",
  minHeight: "310px",
  borderRadius: "28px",
  overflow: "hidden",
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.84)",
  boxShadow: "0 18px 44px rgba(15,23,42,0.12)",
};

const stagedImage = {
  width: "100%",
  height: "100%",
  minHeight: "310px",
  display: "block",
  objectFit: "cover",
};

const stagedOverlay = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(0deg, rgba(15,23,42,0.84), rgba(15,23,42,0.28) 58%, rgba(15,23,42,0.10))",
};

const stagedContent = {
  position: "absolute",
  inset: "auto 16px 16px",
  color: "#fff",
};

const stagedType = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.16)",
  border: "1px solid rgba(255,255,255,0.18)",
  padding: "7px 9px",
  fontSize: "11px",
  fontWeight: 950,
  backdropFilter: "blur(12px)",
};

const stagedTitle = {
  margin: "12px 0 0",
  fontSize: "20px",
  lineHeight: 1.12,
  fontWeight: 950,
  textShadow: "0 10px 26px rgba(0,0,0,0.36)",
};

const stagedBody = {
  margin: "8px 0 0",
  lineHeight: 1.42,
  fontSize: "13px",
  fontWeight: 760,
  color: "rgba(255,255,255,0.88)",
};

const stagedNote = {
  display: "inline-block",
  marginTop: "11px",
  color: "#fde68a",
  fontSize: "11px",
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const legacyCompleteCard = {
  borderRadius: "26px",
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(226,232,240,0.88)",
  boxShadow: "0 16px 38px rgba(15,23,42,0.08)",
  padding: "20px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: "#047857",
  fontWeight: 900,
};

const momentList = {
  display: "grid",
  gap: "14px",
};

const momentsEmptyCard = {
  borderRadius: "24px",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(226,232,240,0.9)",
  boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
  padding: "18px",
  display: "grid",
  gridTemplateColumns: "44px 1fr",
  gap: "13px",
  alignItems: "start",
  color: "#111827",
};

const momentsEmptyTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
  lineHeight: 1.2,
  fontWeight: 950,
};

const momentsEmptyText = {
  margin: "7px 0 0",
  color: "#64748b",
  lineHeight: 1.5,
  fontWeight: 760,
};

const momentCard = {
  display: "grid",
  gridTemplateColumns: "52px 1fr",
  gap: "14px",
  alignItems: "start",
  background: "rgba(255,255,255,0.94)",
  borderRadius: "24px",
  padding: "18px",
  boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
  border: "1px solid rgba(226,232,240,0.9)",
};

const momentCardButton = {
  width: "100%",
  appearance: "none",
  textAlign: "left",
  font: "inherit",
  cursor: "pointer",
};

const momentIcon = {
  width: "52px",
  height: "52px",
  borderRadius: "18px",
  background: "linear-gradient(135deg, #ede9fe, #dbeafe)",
  color: "var(--meetro-color-charcoal, #172317)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const momentBody = {
  minWidth: 0,
};

const momentTopline = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "6px",
};

const momentMeta = {
  display: "block",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 850,
  marginBottom: "6px",
};

const privacyPill = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "6px 9px",
  fontSize: "11px",
  fontWeight: 950,
  border: "1px solid transparent",
};

const privacyPillPublished = {
  background: "#ecfdf5",
  color: "#047857",
  borderColor: "#bbf7d0",
};

const privacyPillPending = {
  background: "#fff7ed",
  color: "#c2410c",
  borderColor: "#fed7aa",
};

const privacyPillPrivate = {
  background: "#f8fafc",
  color: "#475569",
  borderColor: "#e2e8f0",
};

const privacyPillHidden = {
  background: "#f1f5f9",
  color: "#334155",
  borderColor: "#cbd5e1",
};

const momentTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
  lineHeight: 1.15,
  fontWeight: 950,
};

const momentDetails = {
  margin: "8px 0 0",
  color: "#475569",
  lineHeight: 1.45,
  fontWeight: 750,
  overflowWrap: "anywhere",
};

const privacyText = {
  margin: "10px 0 0",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: 760,
};

const momentPills = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "12px",
};

const momentPill = {
  borderRadius: "999px",
  background: "#f3f0ff",
  color: "#4338ca",
  padding: "7px 10px",
  fontSize: "12px",
  fontWeight: 900,
};

const photoPreview = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: "10px",
  marginTop: "14px",
};

const photoFrame = {
  margin: 0,
  borderRadius: "18px",
  overflow: "hidden",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const photoImage = {
  width: "100%",
  height: "104px",
  objectFit: "cover",
  display: "block",
};

const photoCaption = {
  padding: "7px 9px",
  color: "#475569",
  fontSize: "12px",
  fontWeight: 900,
};

const thankYouText = {
  margin: "12px 0 0",
  color: "#334155",
  lineHeight: 1.5,
  fontWeight: 760,
};

const verifiedLabel = {
  display: "inline-block",
  marginTop: "12px",
  color: "#059669",
  fontSize: "12px",
  fontWeight: 950,
};

export default MeetroMoments;
