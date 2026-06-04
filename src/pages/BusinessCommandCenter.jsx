import { useState } from "react";
import BottomNav from "../components/BottomNav";
import { t } from "../utils/language";

function BusinessCommandCenter({ setPage }) {
  const [activeTool, setActiveTool] = useState(
    localStorage.getItem("meetroCommandTool") || "quotes"
  );

  const tools = [
    {
      id: "quotes",
      icon: "🧾",
      title: t("quotes"),
      desc: t("quotesDesc"),
      badge: t("quotesBadge"),
    },
    {
      id: "jobs",
      icon: "📂",
      title: t("projects"),
      desc: t("projectsDesc"),
      badge: t("projectsBadge"),
    },
    {
      id: "permits",
      icon: "🏛️",
      title: t("permits"),
      desc: t("permitsDesc"),
      badge: t("permitsBadge"),
    },
    {
      id: "plans",
      icon: "📐",
      title: t("designFiles"),
      desc: t("designDesc"),
      badge: t("designBadge"),
    },
    {
      id: "reminders",
      icon: "⏰",
      title: t("followUps"),
      desc: t("remindersDesc"),
      badge: t("remindersBadge"),
    },
    {
      id: "customers",
      icon: "👥",
      title: t("clients"),
      desc: t("clientsDesc"),
      badge: t("clientsBadge"),
    },
  ];

  const active = tools.find((tool) => tool.id === activeTool);

  const workspaceContent = {
    quotes: {
      title: t("quoteWorkspaceTitle"),
      text: t("quoteWorkspaceText"),
      steps: [
        t("stepSelectProject"),
        t("stepAnswerQuestions"),
        t("stepGenerateQuote"),
        t("stepSaveToFolder"),
      ],
    },
    jobs: {
      title: t("jobsWorkspaceTitle"),
      text: t("jobsWorkspaceText"),
      steps: [
        t("stepPendingQuote"),
        t("stepApproved"),
        t("stepInProgress"),
        t("stepBalanceDue"),
      ],
    },
    permits: {
      title: t("permitsWorkspaceTitle"),
      text: t("permitsWorkspaceText"),
      steps: [
        t("stepProjectType"),
        t("stepPermitNotes"),
        t("stepInspectionReminder"),
        t("stepStatus"),
      ],
    },
    plans: {
      title: t("plansWorkspaceTitle"),
      text: t("plansWorkspaceText"),
      steps: [
        t("stepUploadPhotos"),
        t("stepDesignNotes"),
        t("stepMaterialList"),
        t("stepSave"),
      ],
    },
    reminders: {
      title: t("remindersWorkspaceTitle"),
      text: t("remindersWorkspaceText"),
      steps: [
        t("stepCustomer"),
        t("stepProject"),
        t("stepDueDate"),
        t("stepReminder"),
      ],
    },
    customers: {
      title: t("customersWorkspaceTitle"),
      text: t("customersWorkspaceText"),
      steps: [
        t("stepCustomer"),
        t("stepProjects"),
        t("stepQuotes"),
        t("stepInvoices"),
      ],
    },
  };

  const current = workspaceContent[activeTool];

  return (
    <div style={page}>
      <div style={header}>
        <button style={backBtn} onClick={() => setPage("businessDashboard")}>
          ←
        </button>

        <div>
          <h1 style={title}>{t("businessCommandCenter")}</h1>
          <p style={subtitle}>{t("commandCenterSubtitle")}</p>
        </div>
      </div>

      <div style={trialCard}>
        <div style={trialBadge}>{t("ccMeetroPro")}</div>
        <h2 style={trialTitle}>{t("ccSevenDayTrial")}</h2>
        <p style={trialText}>{t("ccTrialText")}</p>
        <button style={trialBtn}>{t("ccStartTrial")}</button>
      </div>

      <div style={flowCard}>
        <strong style={flowTitle}>{t("correctWorkflow")}</strong>
        <p style={flowText}>{t("correctWorkflowText")}</p>
      </div>

      <div style={toolsGrid}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            style={{
              ...toolCard,
              ...(activeTool === tool.id ? activeToolCard : {}),
            }}
            onClick={() => {
              localStorage.setItem("meetroCommandTool", tool.id);

              if (tool.id === "jobs") {
                setPage("projectGallery");
                return;
              }

              setActiveTool(tool.id);
            }}
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
            <div style={workspaceLabel}>
              {t("projectFolderModule").toUpperCase()}
            </div>
            <h2 style={workspaceTitle}>
              {active?.icon} {active?.title}
            </h2>
          </div>

          <span style={workspacePill}>{t("connected")}</span>
        </div>

        <p style={workspaceText}>{active?.desc}</p>

        <div style={previewBox}>
          <strong>{current.title}</strong>
          <p>{current.text}</p>

          <div style={stepGrid}>
            {current.steps.map((step, index) => (
              <div key={step} style={stepCard}>
                <span style={stepNumber}>{index + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          style={openBtn}
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("meetroPremiumNotice", {
                detail: {
                  title: `${active?.title} ${t("ccComingSoonTitle")}`,
                  message: t("ccComingSoonMessage"),
                  type: "comingSoon",
                },
              })
            )
          }
        >
          {t("openProjectFolderTool")}
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
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
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
  background:
    "linear-gradient(135deg, rgba(91,61,245,0.96), rgba(124,58,237,0.90))",
  color: "white",
  boxShadow: "0 22px 50px rgba(91,61,245,0.28)",
  marginBottom: "14px",
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

const flowCard = {
  padding: "14px",
  borderRadius: "22px",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(226,232,240,0.9)",
  boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
  marginBottom: "16px",
};

const flowTitle = {
  display: "block",
  fontSize: "14px",
  color: "#0f172a",
  marginBottom: "5px",
};

const flowText = {
  margin: 0,
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.45,
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
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,243,255,0.95))",
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

const stepGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: "10px",
  marginTop: "12px",
};

const stepCard = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  padding: "10px",
  borderRadius: "16px",
  background: "white",
  border: "1px solid #e2e8f0",
  fontSize: "12px",
  fontWeight: "800",
};

const stepNumber = {
  width: "22px",
  height: "22px",
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  background: "rgba(91,61,245,0.10)",
  color: "#5b3df5",
  fontSize: "12px",
  fontWeight: "950",
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
