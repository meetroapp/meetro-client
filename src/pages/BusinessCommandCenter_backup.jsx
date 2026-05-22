import { useState } from "react";
import BottomNav from "../components/BottomNav";

function BusinessCommandCenter({ setPage }) {
  const [activeTool, setActiveTool] = useState("quotes");

  const tools = [
    {
      id: "quotes",
      icon: "🧾",
      title: "AI Quote Builder",
      desc: "Create estimates, 3-tier pricing, labor, material notes, and customer-ready quote summaries.",
      badge: "Pro",
    },
    {
      id: "jobs",
      icon: "📂",
      title: "Open Jobs",
      desc: "Track active jobs, pending quotes, deposits, balances, and incomplete work.",
      badge: "Tracker",
    },
    {
      id: "permits",
      icon: "🏛️",
      title: "Permit Helper",
      desc: "Organize permit questions, inspection reminders, and local requirement notes.",
      badge: "AI Assist",
    },
    {
      id: "plans",
      icon: "📐",
      title: "Floor Plans",
      desc: "Plan layouts, upload job photos, prepare material lists, and design concepts.",
      badge: "Design",
    },
    {
      id: "reminders",
      icon: "⏰",
      title: "Reminders",
      desc: "Follow up with customers, deposits, permits, material orders, and unfinished jobs.",
      badge: "Workflow",
    },
    {
      id: "customers",
      icon: "👥",
      title: "Customers",
      desc: "Keep customer notes, job history, quotes, messages, and follow-up status together.",
      badge: "CRM",
    },
  ];

  const active = tools.find((tool) => tool.id === activeTool);

  return (
    <div style={page}>
      <div style={header}>
        <button style={backBtn} onClick={() => setPage("businessDashboard")}>
          ←
        </button>

        <div>
          <h1 style={title}>Business Command Center</h1>
          <p style={subtitle}>
            Meetro Pro tools for quotes, jobs, permits, reminders, floor plans, and customer tracking.
          </p>
        </div>
      </div>

      <div style={trialCard}>
        <div style={trialBadge}>MEETRO PRO</div>
        <h2 style={trialTitle}>7-day free trial</h2>
        <p style={trialText}>
          Unlock AI business tools designed to help contractors quote faster, organize customers,
          track jobs, and manage follow-ups.
        </p>
        <button style={trialBtn}>Start Trial</button>
      </div>

      <div style={toolsGrid}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            style={{
              ...toolCard,
              ...(activeTool === tool.id ? activeToolCard : {}),
            }}
            onClick={() => setActiveTool(tool.id)}
          >
            <div style={toolTop}>
              <span style={toolIcon}>{tool.icon}</span>
              <span style={toolBadge}>{tool.badge}</span>
            </div>

            <h3 style={toolTitle}>{tool.title}</h3>
            <p style={toolDesc}>{tool.desc}</p>
          </button>
        ))}
      </div>

      <div style={workspace}>
        <div style={workspaceTop}>
          <div>
            <div style={workspaceLabel}>ACTIVE WORKSPACE</div>
            <h2 style={workspaceTitle}>
              {active?.icon} {active?.title}
            </h2>
          </div>

          <span style={workspacePill}>Coming Soon</span>
        </div>

        <p style={workspaceText}>{active?.desc}</p>

        <div style={previewBox}>
          {activeTool === "quotes" && (
            <>
              <strong>Quote Builder Preview</strong>
              <p>
                Future flow: job type → photos → measurements → labor/materials →
                3-tier estimate → send to customer.
              </p>
            </>
          )}

          {activeTool === "jobs" && (
            <>
              <strong>Open Jobs Preview</strong>
              <p>
                Future flow: new lead → pending quote → approved job → deposit →
                in progress → balance due → completed.
              </p>
            </>
          )}

          {activeTool === "permits" && (
            <>
              <strong>Permit Helper Preview</strong>
              <p>
                Future flow: project type → location → likely permit notes →
                inspection reminders → permit status tracking.
              </p>
            </>
          )}

          {activeTool === "plans" && (
            <>
              <strong>Floor Plan Preview</strong>
              <p>
                Future flow: upload photos → describe project → layout concept →
                material list → customer visual.
              </p>
            </>
          )}

          {activeTool === "reminders" && (
            <>
              <strong>Reminder System Preview</strong>
              <p>
                Future flow: follow up with customers, deposits, permit checks,
                job completion reminders, and payment balance alerts.
              </p>
            </>
          )}

          {activeTool === "customers" && (
            <>
              <strong>Customer Tracker Preview</strong>
              <p>
                Future flow: customer profile → job notes → quotes → messages →
                balances → follow-up history.
              </p>
            </>
          )}
        </div>

        <button
          style={openBtn}
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("meetroPremiumNotice", {
                detail: {
                  title: `${active?.title} coming soon`,
                  message:
                    "This Meetro Pro business tool is being prepared for contractors.",
                  type: "comingSoon",
                },
              })
            )
          }
        >
          Open {active?.title}
        </button>
      </div>

      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding: "22px 18px 95px",
  background:
    "radial-gradient(circle at top, rgba(91,61,245,0.20), transparent 34%), #f8fafc",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
};

const header = {
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
  marginBottom: "18px",
};

const backBtn = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(255,255,255,0.92)",
  fontSize: "22px",
  fontWeight: "900",
  cursor: "pointer",
};

const title = {
  margin: 0,
  fontSize: "27px",
  fontWeight: "950",
  color: "#0f172a",
  letterSpacing: "-0.8px",
};

const subtitle = {
  margin: "7px 0 0",
  fontSize: "14px",
  lineHeight: 1.45,
  color: "#64748b",
};

const trialCard = {
  padding: "18px",
  borderRadius: "26px",
  background: "linear-gradient(135deg, rgba(91,61,245,0.96), rgba(124,58,237,0.90))",
  color: "white",
  boxShadow: "0 22px 50px rgba(91,61,245,0.28)",
  marginBottom: "18px",
};

const trialBadge = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.18)",
  fontSize: "11px",
  fontWeight: "900",
  letterSpacing: "0.8px",
};

const trialTitle = {
  margin: "12px 0 6px",
  fontSize: "24px",
  fontWeight: "950",
};

const trialText = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.5,
  opacity: 0.92,
};

const trialBtn = {
  marginTop: "16px",
  width: "100%",
  padding: "13px",
  borderRadius: "18px",
  border: "0",
  background: "white",
  color: "#5b3df5",
  fontSize: "15px",
  fontWeight: "950",
  cursor: "pointer",
};

const toolsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
  gap: "12px",
  marginBottom: "18px",
};

const toolCard = {
  textAlign: "left",
  padding: "15px",
  borderRadius: "22px",
  border: "1px solid rgba(226,232,240,0.9)",
  background: "rgba(255,255,255,0.92)",
  boxShadow: "0 14px 30px rgba(15,23,42,0.07)",
  cursor: "pointer",
};

const activeToolCard = {
  border: "1px solid rgba(91,61,245,0.55)",
  boxShadow: "0 18px 38px rgba(91,61,245,0.18)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,243,255,0.95))",
};

const toolTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const toolIcon = {
  fontSize: "24px",
};

const toolBadge = {
  padding: "5px 8px",
  borderRadius: "999px",
  background: "#f1f5f9",
  color: "#475569",
  fontSize: "10px",
  fontWeight: "900",
};

const toolTitle = {
  margin: "12px 0 6px",
  fontSize: "15px",
  fontWeight: "950",
  color: "#0f172a",
};

const toolDesc = {
  margin: 0,
  fontSize: "12px",
  lineHeight: 1.4,
  color: "#64748b",
};

const workspace = {
  padding: "18px",
  borderRadius: "28px",
  background: "rgba(255,255,255,0.95)",
  border: "1px solid rgba(226,232,240,0.9)",
  boxShadow: "0 18px 42px rgba(15,23,42,0.08)",
};

const workspaceTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
};

const workspaceLabel = {
  fontSize: "11px",
  fontWeight: "950",
  color: "#7c3aed",
  letterSpacing: "0.7px",
};

const workspaceTitle = {
  margin: "6px 0 0",
  fontSize: "22px",
  fontWeight: "950",
  color: "#0f172a",
};

const workspacePill = {
  padding: "7px 10px",
  borderRadius: "999px",
  background: "rgba(91,61,245,0.10)",
  color: "#5b3df5",
  fontSize: "11px",
  fontWeight: "950",
  whiteSpace: "nowrap",
};

const workspaceText = {
  margin: "12px 0",
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.5,
};

const previewBox = {
  padding: "14px",
  borderRadius: "20px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: "14px",
  lineHeight: 1.5,
};

const openBtn = {
  marginTop: "14px",
  width: "100%",
  padding: "13px",
  borderRadius: "18px",
  border: "0",
  background: "#5b3df5",
  color: "white",
  fontSize: "15px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 14px 30px rgba(91,61,245,0.25)",
};

export default BusinessCommandCenter;
