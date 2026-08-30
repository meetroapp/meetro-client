import { useEffect, useState } from "react";
import { fetchProfessionalSubscription } from "../utils/subscriptionApi";
import { getBusinessPlanPresentation } from "../utils/subscriptionPresentation";

export default function BusinessPlanStatusCard({ setPage, className = "", hideQa = false }) {
  const [subscriptionState, setSubscriptionState] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchProfessionalSubscription(setPage)
      .then((state) => {
        if (!active) return;
        setSubscriptionState(state);
        setLoadFailed(false);
      })
      .catch(() => {
        if (!active) return;
        setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, [setPage]);

  const loading = subscriptionState === null && !loadFailed;
  const presentation = loading
    ? {
        eyebrow: "Business Plan",
        planName: "Checking plan…",
        statusLabel: "Verifying",
        seatLabel: "",
        billingLabel: "",
        manageLabel: "Plan & Subscription",
      }
    : getBusinessPlanPresentation(loadFailed ? {} : subscriptionState);

  if (hideQa && (loading || presentation.kind === "qa")) return null;

  return (
    <section
      className={`business-plan-status-card ${className}`.trim()}
      style={cardStyle}
      aria-label="Business Plan"
    >
      <div style={contentStyle}>
        <span style={eyebrowStyle}>{presentation.eyebrow}</span>
        <div style={titleRowStyle}>
          <h2 style={titleStyle}>{presentation.planName}</h2>
          <span style={statusStyle}>{presentation.statusLabel}</span>
        </div>
        {presentation.billingLabel && (
          <p style={billingStyle}>{presentation.billingLabel}</p>
        )}
        {presentation.seatLabel && (
          <p style={seatStyle}>{presentation.seatLabel}</p>
        )}
      </div>
      <button
        type="button"
        className="meetro-visual-primary-button"
        style={manageStyle}
        onClick={() => setPage("professionalSubscription")}
        disabled={loading}
      >
        {presentation.manageLabel}
      </button>
    </section>
  );
}

const cardStyle = {
  background: "var(--meetro-surface-paper, #fffdf8)",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  borderRadius: "22px",
  padding: "18px",
  display: "flex",
  flexWrap: "wrap",
  gap: "16px",
  alignItems: "center",
  justifyContent: "space-between",
  boxShadow: "var(--meetro-shadow-soft, 0 12px 28px rgba(49,35,20,0.08))",
};
const contentStyle = { minWidth: 0, flex: "1 1 240px" };
const eyebrowStyle = {
  display: "block",
  color: "var(--meetro-color-muted, #60766e)",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};
const titleRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  alignItems: "center",
  marginTop: "7px",
};
const titleStyle = {
  margin: 0,
  color: "var(--meetro-color-ink, #17352b)",
  fontSize: "21px",
};
const statusStyle = {
  background: "var(--meetro-surface-sage, #edf7f0)",
  color: "var(--meetro-color-forest, #1f4d34)",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: 850,
};
const billingStyle = { margin: "8px 0 0", color: "#405c52", fontWeight: 750 };
const seatStyle = { margin: "7px 0 0", color: "#5c6f68", fontSize: "14px", fontWeight: 700 };
const manageStyle = {
  minHeight: "42px",
  padding: "0 15px",
  border: 0,
  borderRadius: "12px",
  background: "var(--meetro-gradient-community-action, #1f4d34)",
  color: "white",
  fontWeight: 850,
  cursor: "pointer",
};
