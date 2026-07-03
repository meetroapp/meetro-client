import { useEffect, useState } from "react";
import {
  glassPill,
  glassSurface,
  softPageSection,
} from "../styles/liquidGlass";

function initialsFor(value = "") {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getIdentityIconKey(value = "") {
  const normalized = String(value || "").toLowerCase();

  if (normalized.includes("chat") || normalized.includes("message")) return "chat";
  if (normalized.includes("text") || normalized.includes("sms")) return "text";
  if (normalized.includes("phone") || normalized.includes("call")) return "phone";
  if (normalized.includes("email") || normalized.includes("mail")) return "mail";
  if (normalized.includes("area") || normalized.includes("address") || normalized.includes("location")) return "pin";
  if (normalized.includes("invite") || normalized.includes("type")) return "people";
  if (normalized.includes("account") || normalized.includes("linked") || normalized.includes("status")) return "shield";
  if (normalized.includes("work") || normalized.includes("history")) return "clock";
  if (normalized.includes("invoice") || normalized.includes("document")) return "document";
  if (normalized.includes("photo")) return "photo";
  if (normalized.includes("note") || normalized.includes("memory")) return "note";
  if (normalized.includes("edit") || normalized.includes("more")) return "more";

  return "spark";
}

function IdentityIcon({ label }) {
  const iconKey = getIdentityIconKey(label);

  return (
    <span style={identityIconCapsule} aria-hidden="true">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        {iconKey === "chat" && (
          <path
            d="M5.5 6.5h13v8.2a3.8 3.8 0 0 1-3.8 3.8H10L5.5 21v-2.5h-.2a3.8 3.8 0 0 1-3.8-3.8V10.3a3.8 3.8 0 0 1 4-3.8Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {iconKey === "text" && (
          <>
            <path
              d="M4.5 7.5h15v8a3 3 0 0 1-3 3H9L4.5 21v-2.5a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3Z"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M7.5 11h9M7.5 14h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </>
        )}
        {iconKey === "phone" && (
          <path
            d="M7.4 3.8 9.8 7a1.6 1.6 0 0 1-.1 2l-1 1.1a11 11 0 0 0 5.2 5.2l1.1-1a1.6 1.6 0 0 1 2-.1l3.2 2.4a1.3 1.3 0 0 1 .3 1.8l-1.2 1.8c-.6.9-1.8 1.3-2.9 1.1C9.7 20 4 14.3 2.7 7.6c-.2-1.1.2-2.3 1.1-2.9l1.8-1.2a1.3 1.3 0 0 1 1.8.3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {iconKey === "mail" && (
          <>
            <rect x="3" y="5.5" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="1.9" />
            <path d="m4.5 8 7.5 5 7.5-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {iconKey === "pin" && (
          <>
            <path
              d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.9" />
          </>
        )}
        {iconKey === "people" && (
          <>
            <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.9" />
            <path d="M3.5 20a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            <path d="M16 11.5a2.5 2.5 0 1 0 0-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            <path d="M15.8 15.2a4.4 4.4 0 0 1 4.7 4.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </>
        )}
        {iconKey === "shield" && (
          <path
            d="M12 3.5 19 6v5.1c0 4.4-2.9 8.3-7 9.4-4.1-1.1-7-5-7-9.4V6l7-2.5Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {iconKey === "clock" && (
          <>
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.9" />
            <path d="M12 7.5v5l3.3 2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {iconKey === "document" && (
          <>
            <path d="M7 3.5h7l3 3v14H7v-17Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
            <path d="M14 3.5V7h3M9.5 11h5M9.5 14h5M9.5 17h3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </>
        )}
        {iconKey === "photo" && (
          <>
            <rect x="3.5" y="5" width="17" height="14" rx="3" stroke="currentColor" strokeWidth="1.9" />
            <path d="m5.5 16 4-4 3 3 2-2 4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="15.5" cy="9" r="1.4" fill="currentColor" />
          </>
        )}
        {iconKey === "note" && (
          <>
            <path d="M5.5 4.5h13v15h-13v-15Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
            <path d="M8.5 9h7M8.5 12h7M8.5 15h4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </>
        )}
        {iconKey === "more" && (
          <path d="M6.5 12h.1M12 12h.1M17.5 12h.1" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        )}
        {iconKey === "spark" && (
          <path
            d="M12 3.5 13.9 9l5.6 2-5.6 2L12 18.5 10.1 13l-5.6-2 5.6-2L12 3.5Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </span>
  );
}

function isImmediateRelationshipSection(section = {}) {
  const title = String(section.title || "").toLowerCase();

  return title.includes("current work");
}

export default function RelationshipIdentityPage({
  identity = {},
  onBack,
  actions = [],
  details = [],
  sections = [],
  intro = "",
  afterActions = null,
  backLabel = "Back",
}) {
  const displayName = identity.displayName || identity.name || "Relationship";
  const typeLabel = identity.typeLabel || identity.relationshipType || "Relationship";
  const initials = identity.initials || initialsFor(displayName) || "M";
  const detailRows = details.filter((item) => String(item?.value || "").trim());
  const immediateSections = sections.filter(isImmediateRelationshipSection);
  const deferredSections = sections.filter((section) => !isImmediateRelationshipSection(section));
  const deferredSectionsSignature = deferredSections
    .map((section) => `${section.title}:${section.items?.length || 0}:${section.empty || ""}`)
    .join("|");
  const [showDeferredSections, setShowDeferredSections] = useState(
    deferredSections.length === 0
  );

  useEffect(() => {
    if (deferredSections.length === 0) {
      setShowDeferredSections(true);
      return undefined;
    }

    setShowDeferredSections(false);

    const scheduleFrame =
      typeof window !== "undefined" && window.requestAnimationFrame
        ? window.requestAnimationFrame
        : (callback) => setTimeout(callback, 0);
    const cancelFrame =
      typeof window !== "undefined" && window.cancelAnimationFrame
        ? window.cancelAnimationFrame
        : clearTimeout;
    const frameId = scheduleFrame(() => {
      setShowDeferredSections(true);
    });

    return () => cancelFrame(frameId);
  }, [deferredSections.length, deferredSectionsSignature]);

  const visibleSections = showDeferredSections
    ? [...immediateSections, ...deferredSections]
    : immediateSections;

  return (
    <section style={identityPanel} aria-label="Relationship Identity">
      {onBack && (
        <div style={identityTopBar}>
          <button type="button" style={identityBackButton} onClick={onBack}>
            <span aria-hidden="true">←</span> {backLabel}
          </button>
        </div>
      )}

      <div style={identityHeader}>
        <div style={identityHeaderBlock}>
          <div style={identityAvatar}>
            {identity.avatar ? (
              <img
                src={identity.avatar}
                alt={displayName}
                style={identityAvatarImage}
                loading="eager"
                decoding="async"
              />
            ) : (
              initials
            )}
          </div>

          <div style={identityHeaderText}>
            <p style={identityEyebrow}>{typeLabel}</p>
            <h2 style={identityTitle}>{displayName}</h2>
            {identity.meta && <p style={identityMeta}>{identity.meta}</p>}
            {identity.location && <p style={identityLocation}>{identity.location}</p>}
            {identity.status && <p style={identityStatus}>{identity.status}</p>}
          </div>
        </div>
      </div>

      {intro && <p style={identityIntro}>{intro}</p>}

      {detailRows.length > 0 && (
        <div style={identityFactGrid}>
          {detailRows.map(({ label, value, span }) => (
            <div
              key={label}
              style={span === "wide" ? { ...identityFact, ...identityWide } : identityFact}
            >
              <IdentityIcon label={label} />
              <span style={identityFactText}>
                <span style={identityFactLabel}>{label}</span>
                <strong style={identityFactValue}>{value}</strong>
              </span>
            </div>
          ))}
        </div>
      )}

      {actions.length > 0 && (
        <div style={identityActionRow}>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              style={action.primary ? identityPrimaryAction : identitySecondaryAction}
              onClick={action.onClick}
            >
              <IdentityIcon label={action.label} />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {afterActions}

      {visibleSections.length > 0 && (
        <div style={identitySectionGrid}>
          {visibleSections.map(({ title, items = [], empty, span, onClick }) => {
            const sectionContent = (
              <>
                <IdentityIcon label={title} />
                <span style={identitySectionText}>
                  <span style={identitySectionTitle}>{title}</span>
                  {items.length === 0 ? (
                    <span style={identitySectionEmpty}>{empty}</span>
                  ) : (
                    <span style={identitySectionList}>
                      {items.map((item) => (
                        <span key={`${item.title}-${item.meta || ""}`} style={identitySectionRow}>
                          <strong style={identitySectionValue}>{item.title}</strong>
                          {item.meta && (
                            <span style={identitySectionLabel}>{item.meta}</span>
                          )}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                {onClick && <span style={identitySectionChevron} aria-hidden="true">›</span>}
              </>
            );
            const sectionStyle =
              span === "wide"
                ? { ...identitySection, ...identityWide }
                : identitySection;

            return onClick ? (
              <button
                key={title}
                type="button"
                style={{ ...sectionStyle, ...identitySectionButton }}
                onClick={onClick}
                aria-label={`${title}: ${empty || "Open"}`}
              >
                {sectionContent}
              </button>
            ) : (
              <section key={title} style={sectionStyle}>
                {sectionContent}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

const identityPanel = {
  width: "100%",
  maxWidth: "760px",
  minWidth: 0,
  minHeight: "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 30px)",
  borderRadius: "0",
  padding: "0 0 calc(118px + env(safe-area-inset-bottom, 0px))",
  margin: "0 auto",
  boxSizing: "border-box",
  overflowX: "hidden",
};

const identityTopBar = {
  display: "flex",
  justifyContent: "flex-start",
  marginBottom: "12px",
};

const identityHeader = {
  ...glassSurface,
  display: "flex",
  justifyContent: "center",
  gap: "16px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "14px",
  borderRadius: "30px",
  padding: "22px 18px",
  background:
    "radial-gradient(circle at 12% 4%, rgba(255,255,255,0.95), rgba(255,255,255,0.68) 48%, rgba(238,242,255,0.58)), linear-gradient(145deg, rgba(255,255,255,0.82), rgba(241,245,249,0.52))",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.9), 0 20px 42px rgba(37,99,235,0.08), 0 8px 22px rgba(15,23,42,0.05)",
  boxSizing: "border-box",
  overflow: "hidden",
};

const identityHeaderBlock = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  minWidth: 0,
  flex: "1 1 280px",
};

const identityAvatar = {
  width: "86px",
  height: "86px",
  borderRadius: "30px",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.88), rgba(226,232,240,0.58))",
  color: "#5b3df5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "950",
  fontSize: "22px",
  overflow: "hidden",
  flexShrink: 0,
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.92), 0 14px 28px rgba(15,23,42,0.12)",
  border: "1px solid rgba(255,255,255,0.78)",
};

const identityAvatarImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const identityHeaderText = {
  minWidth: 0,
  flex: 1,
  overflowWrap: "anywhere",
};

const identityEyebrow = {
  margin: "0 0 4px",
  color: "#5b3df5",
  fontSize: "11px",
  fontWeight: "950",
  letterSpacing: "0.35px",
  textTransform: "uppercase",
};

const identityTitle = {
  margin: "0 0 4px",
  color: "#0f172a",
  fontSize: "clamp(24px, 7vw, 32px)",
  lineHeight: 1.08,
  fontWeight: "950",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const identityMeta = {
  margin: "0 0 2px",
  color: "#475569",
  fontSize: "14px",
  fontWeight: "850",
  lineHeight: 1.35,
};

const identityLocation = {
  ...identityMeta,
  color: "#64748b",
};

const identityStatus = {
  ...identityMeta,
  color: "#059669",
};

const identityBackButton = {
  ...glassPill,
  border: "1px solid rgba(255,255,255,0.72)",
  borderRadius: "16px",
  color: "#5b3df5",
  padding: "9px 12px",
  fontSize: "13px",
  fontWeight: "950",
  cursor: "pointer",
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
};

const identityIntro = {
  margin: "0 0 14px",
  color: "#64748b",
  fontSize: "14px",
  fontWeight: "750",
  lineHeight: 1.45,
};

const identityFactGrid = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(170px, 100%), 1fr))",
  gap: "10px",
  alignItems: "stretch",
  marginBottom: "12px",
};

const identityFact = {
  ...softPageSection,
  width: "100%",
  minHeight: "82px",
  minWidth: 0,
  borderRadius: "20px",
  padding: "14px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.74), rgba(248,250,252,0.54))",
  border: "1px solid rgba(255,255,255,0.64)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.82), 0 10px 26px rgba(15,23,42,0.05)",
  boxSizing: "border-box",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const identityWide = {
  gridColumn: "1 / -1",
};

const identityIconCapsule = {
  width: "38px",
  height: "38px",
  borderRadius: "14px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  color: "#5b3df5",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(237,233,254,0.62))",
  border: "1px solid rgba(255,255,255,0.76)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 22px rgba(91,61,245,0.1)",
};

const identityFactText = {
  display: "grid",
  gap: "4px",
  minWidth: 0,
  flex: 1,
};

const identityFactLabel = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "900",
  lineHeight: 1.25,
  overflowWrap: "anywhere",
};

const identityFactValue = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: "950",
  lineHeight: 1.35,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const identityActionRow = {
  width: "100%",
  display: "flex",
  gap: "9px",
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: "14px",
  overflowX: "hidden",
};

const identityPrimaryAction = {
  ...glassPill,
  border: "1px solid rgba(255,255,255,0.42)",
  background:
    "linear-gradient(145deg, rgba(91,61,245,0.95), rgba(37,99,235,0.82))",
  color: "#ffffff",
  padding: "10px 13px",
  fontSize: "12px",
  fontWeight: "950",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  minHeight: "48px",
  flex: "1 1 132px",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.28), 0 15px 30px rgba(91,61,245,0.24)",
  boxSizing: "border-box",
  whiteSpace: "normal",
};

const identitySecondaryAction = {
  ...glassPill,
  border: "1px solid rgba(255,255,255,0.72)",
  color: "#111827",
  padding: "10px 12px",
  fontSize: "12px",
  fontWeight: "900",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  minHeight: "48px",
  flex: "1 1 84px",
  boxSizing: "border-box",
  whiteSpace: "normal",
};

const identitySectionGrid = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))",
  gap: "10px",
  alignItems: "stretch",
};

const identitySection = {
  ...identityFact,
  width: "100%",
  minHeight: "70px",
  alignItems: "center",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.78), rgba(248,250,252,0.56))",
};

const identitySectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "14px",
  fontWeight: "950",
  lineHeight: 1.25,
};

const identitySectionText = {
  display: "grid",
  gap: "4px",
  minWidth: 0,
  flex: 1,
  textAlign: "left",
};

const identitySectionEmpty = {
  margin: 0,
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "800",
  lineHeight: 1.35,
};

const identitySectionList = {
  display: "grid",
  gap: "8px",
};

const identitySectionRow = {
  display: "grid",
  gap: "3px",
  minWidth: 0,
};

const identitySectionValue = {
  color: "#0f172a",
  fontSize: "13px",
  fontWeight: "950",
  lineHeight: 1.3,
  overflowWrap: "anywhere",
};

const identitySectionLabel = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "800",
  lineHeight: 1.3,
  overflowWrap: "anywhere",
};

const identitySectionButton = {
  appearance: "none",
  border: identitySection.border,
  cursor: "pointer",
  textAlign: "left",
};

const identitySectionChevron = {
  color: "#94a3b8",
  fontSize: "28px",
  fontWeight: "700",
  lineHeight: 1,
  flexShrink: 0,
};
