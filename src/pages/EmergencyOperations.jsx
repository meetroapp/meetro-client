import React, { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { t } from "../utils/language";

export default function EmergencyOperations({ setPage }) {
  const [dispatchReady, setDispatchReady] = useState(
    localStorage.getItem("meetroDispatchReady") === "true"
  );

  const [dispatchFee, setDispatchFee] = useState(
    localStorage.getItem("meetroEmergencyDispatchFee") || "85"
  );

  const [responseTime, setResponseTime] = useState(
    localStorage.getItem("meetroEmergencyResponseTime") || "15-30 min"
  );

  const [radius, setRadius] = useState(
    localStorage.getItem("meetroEmergencyRadius") || "15 miles"
  );

  useEffect(() => {
    localStorage.setItem("meetroDispatchReady", dispatchReady ? "true" : "false");
    window.dispatchEvent(new Event("meetroDispatchReadyChanged"));
  }, [dispatchReady]);

  const saveOperations = () => {
    localStorage.setItem("meetroEmergencyDispatchFee", dispatchFee);
    localStorage.setItem("meetroEmergencyResponseTime", responseTime);
    localStorage.setItem("meetroEmergencyRadius", radius);
    alert("Emergency Operations saved.");
  };

  return (
    <div className="app-page meetro-wide-page" style={pageWrap}>
      <div style={topBar}>
        <button style={backButton} onClick={() => setPage("profile")}>
          ←
        </button>
        <div>
          <div style={eyebrow}>Emergency Operations</div>
          <h1 style={title}>Dispatch Command</h1>
        </div>
      </div>

      <div style={heroCard}>
        <div>
          <div style={heroLabel}>Dispatch Ready</div>
          <div style={heroText}>
            Turn this on only when your business is actively accepting emergency dispatches.
          </div>
        </div>

        <button
          style={{
            ...toggleButton,
            background: dispatchReady ? "#16a34a" : "#e5e7eb",
            color: dispatchReady ? "#ffffff" : "#111827",
          }}
          onClick={() => setDispatchReady(!dispatchReady)}
        >
          {dispatchReady ? "Ready" : "Off"}
        </button>
      </div>

      <div style={sectionCard}>
        <h2 style={sectionTitle}>Daily Dispatch Controls</h2>

        <label style={label}>Dispatch Fee</label>
        <input
          style={input}
          value={dispatchFee}
          onChange={(e) => setDispatchFee(e.target.value)}
          placeholder="Example: 85"
        />

        <label style={label}>Current Response Time</label>
        <input
          style={input}
          value={responseTime}
          onChange={(e) => setResponseTime(e.target.value)}
          placeholder="Example: 15-30 min"
        />

        <label style={label}>Current Radius</label>
        <input
          style={input}
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          placeholder="Example: 15 miles"
        />

        <button style={primaryButton} onClick={saveOperations}>
          Save Emergency Operations
        </button>
      </div>

      <div style={grid}>
        <InfoCard title="Incoming Dispatches" value="0" />
        <InfoCard title="Active Dispatches" value="0" />
        <InfoCard title="Emergency History" value="View" />
        <InfoCard title="Emergency Revenue" value="$0" />
      </div>

      <div style={noteCard}>
        <strong>Important:</strong> Emergency Profile is customer-facing. Emergency Operations is for daily business controls.
      </div>

      <BottomNav currentPage="profile" setPage={setPage} />
    </div>
  );
}

function InfoCard({ title, value }) {
  return (
    <div style={infoCard}>
      <div style={infoTitle}>{title}</div>
      <div style={infoValue}>{value}</div>
    </div>
  );
}

const pageWrap = {
  minHeight: "100dvh",
  background: "#f8fafc",
  padding: "18px 16px 90px",
  boxSizing: "border-box",
};

const topBar = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  marginBottom: 18,
};

const backButton = {
  width: 42,
  height: 42,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  fontSize: 22,
  cursor: "pointer",
};

const eyebrow = {
  fontSize: 13,
  fontWeight: 700,
  color: "#ef4444",
  letterSpacing: 0.4,
};

const title = {
  margin: 0,
  fontSize: 26,
  color: "#111827",
};

const heroCard = {
  background: "#ffffff",
  borderRadius: 22,
  padding: 18,
  boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
  border: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "center",
  marginBottom: 16,
};

const heroLabel = {
  fontSize: 18,
  fontWeight: 800,
  color: "#111827",
  marginBottom: 6,
};

const heroText = {
  fontSize: 14,
  color: "#64748b",
  lineHeight: 1.45,
};

const toggleButton = {
  border: "none",
  borderRadius: 999,
  padding: "12px 18px",
  fontWeight: 800,
  cursor: "pointer",
  minWidth: 86,
};

const sectionCard = {
  background: "#ffffff",
  borderRadius: 22,
  padding: 18,
  boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
  border: "1px solid #e5e7eb",
  marginBottom: 16,
};

const sectionTitle = {
  margin: "0 0 16px",
  fontSize: 19,
  color: "#111827",
};

const label = {
  display: "block",
  fontSize: 13,
  fontWeight: 800,
  color: "#475569",
  margin: "14px 0 6px",
};

const input = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #d1d5db",
  borderRadius: 14,
  padding: "13px 14px",
  fontSize: 15,
  outline: "none",
  background: "#f9fafb",
};

const primaryButton = {
  width: "100%",
  marginTop: 18,
  border: "none",
  borderRadius: 16,
  padding: "14px 16px",
  background: "#111827",
  color: "#ffffff",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginBottom: 16,
};

const infoCard = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 15,
  boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
};

const infoTitle = {
  fontSize: 13,
  color: "#64748b",
  fontWeight: 700,
  marginBottom: 8,
};

const infoValue = {
  fontSize: 22,
  color: "#111827",
  fontWeight: 900,
};

const noteCard = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  borderRadius: 18,
  padding: 14,
  color: "#9a3412",
  fontSize: 14,
  lineHeight: 1.5,
};
