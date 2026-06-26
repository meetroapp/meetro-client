import { useState } from "react";
import BottomNav from "../components/BottomNav";
import { t } from "../utils/language";

function Assistant({ setPage }) {
  const [projectText, setProjectText] = useState("");
  const [mode, setMode] = useState("scope");

  const hasText = projectText.trim().length > 0;

  const recommendations = getAiRecommendation(projectText, mode);

  function useDraft() {
    if (projectText.trim()) {
      localStorage.setItem("aiProjectDraft", projectText.trim());
      localStorage.setItem("aiBusinessRecommendation", recommendations.businessType);
      localStorage.setItem("aiProjectScope", recommendations.scope.join("\n"));
    }

    setPage("upload");
  }

  return (
    <div style={page}>
      <div style={heroCard}>
        <p style={eyebrow}>{t("aiHelp")}</p>
        <h1 style={title}> Meetro AI</h1>
        <p style={subtitle}>
          Describe the job once. Meetro helps recommend the right business type,
          questions, photos, and next step.
        </p>
      </div>

      <div style={askCard}>
        <h2 style={askTitle}>What do you need help with?</h2>
        <p style={helperText}>
          Describe your project once, then tap a tool below to get AI answers.
        </p>

        <textarea
          style={textarea}
          value={projectText}
          onChange={(event) => setProjectText(event.target.value)}
          placeholder="Example: I need a garage door opener replaced..."
        />

        <div style={modeGrid}>
          <button
            style={mode === "scope" ? activeModeButton : modeButton}
            onClick={() => setMode("scope")}
          >
             Build Scope
          </button>

          <button
            style={mode === "estimate" ? activeModeButton : modeButton}
            onClick={() => setMode("estimate")}
          >
             Prepare Estimate
          </button>

          <button
            style={mode === "materials" ? activeModeButton : modeButton}
            onClick={() => setMode("materials")}
          >
             Check Materials
          </button>

          <button
            style={mode === "design" ? activeModeButton : modeButton}
            onClick={() => setMode("design")}
          >
             Generate Ideas
          </button>
        </div>
      </div>

      <div style={resultCard}>
        <div style={resultHeader}>
          <span style={resultIcon}>{recommendations.icon}</span>
          <div>
            <p style={resultLabel}>AI Recommendation</p>
            <h2 style={resultTitle}>
              {hasText ? recommendations.businessType : "Describe your project"}
            </h2>
          </div>
        </div>

        {!hasText ? (
          <p style={emptyText}>
            Type what you need help with, then tap Build Scope, Prepare Estimate,
            Check Materials, or Generate Ideas to get answers.
          </p>
        ) : (
          <>
            <div style={sectionBlock}>
              <strong style={sectionLabel}>Recommended business type</strong>
              <p style={sectionText}>{recommendations.businessType}</p>
            </div>

            <div style={sectionBlock}>
              <strong style={sectionLabel}>{recommendations.heading}</strong>
              {recommendations.scope.map((item) => (
                <p key={item} style={bullet}>• {item}</p>
              ))}
            </div>

            <div style={sectionBlock}>
              <strong style={sectionLabel}>Photos / details to add</strong>
              {recommendations.photos.map((item) => (
                <p key={item} style={bullet}>• {item}</p>
              ))}
            </div>

            <button style={askButton} onClick={useDraft}>
              Use This To Post Project
            </button>
          </>
        )}
      </div>

      <BottomNav setPage={setPage} currentPage="home" />
    </div>
  );
}

function getAiRecommendation(text, mode) {
  const lower = text.toLowerCase();

  let businessType = "Handyman / General Service";
  let icon = "";

  if (lower.includes("garage") || lower.includes("opener")) {
    businessType = "Garage Door Service";
    icon = "";
  } else if (lower.includes("water heater") || lower.includes("toilet") || lower.includes("sink") || lower.includes("leak")) {
    businessType = "Plumbing";
    icon = "";
  } else if (lower.includes("fan") || lower.includes("outlet") || lower.includes("switch") || lower.includes("electrical")) {
    businessType = "Electrical / Handyman";
    icon = "";
  } else if (lower.includes("paint") || lower.includes("drywall")) {
    businessType = "Painting / Drywall";
    icon = "";
  } else if (lower.includes("rental") || lower.includes("tenant") || lower.includes("property") || lower.includes("unit")) {
    businessType = "Property Management";
    icon = "";
  }

  const content = {
    scope: {
      heading: "Suggested project scope",
      scope: [
        "Describe the problem clearly.",
        "Include where the work is located.",
        "Add any measurements, brand names, or model numbers.",
        "Mention if materials are already purchased.",
      ],
    },
    estimate: {
      heading: "Estimate preparation",
      scope: [
        "Confirm the exact service needed.",
        "Add photos so professionals can price accurately.",
        "Mention preferred timing and access instructions.",
        "Avoid buying materials until size and compatibility are confirmed.",
      ],
    },
    materials: {
      heading: "Materials guidance",
      scope: [
        "Check size, model, and compatibility before purchasing.",
        "Take photos of existing parts, labels, and measurements.",
        "Ask the professional to confirm before ordering.",
        "Keep receipts and product links ready.",
      ],
    },
    design: {
      heading: "Design ideas",
      scope: [
        "Coming soon: AI visual concepts and inspiration.",
        "For now, add style preferences and example photos.",
        "Mention colors, materials, and budget range.",
        "Professionals can use this to prepare better recommendations.",
      ],
    },
  };

  return {
    businessType,
    icon,
    heading: content[mode].heading,
    scope: content[mode].scope,
    photos: [
      "Wide photo of the full area.",
      "Close-up of the issue or product label.",
      "Photo showing access, height, or surrounding space.",
    ],
  };
}

const page = {
  minHeight: "100vh",
  padding: "calc(env(safe-area-inset-top, 0px) + 62px) 18px 110px",
  background:
    "radial-gradient(circle at top, rgba(91,61,245,0.18), transparent 34%), #f8fafc",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
};

const heroCard = {
  padding: "22px",
  borderRadius: "30px",
  background:
    "linear-gradient(135deg, rgba(91,61,245,0.98), rgba(124,58,237,0.92))",
  color: "white",
  boxShadow: "0 24px 54px rgba(91,61,245,0.25)",
  marginBottom: "16px",
};

const eyebrow = {
  margin: "0 0 8px",
  fontSize: "12px",
  fontWeight: "950",
  letterSpacing: "0.8px",
  textTransform: "uppercase",
  opacity: 0.82,
};

const title = {
  margin: 0,
  fontSize: "32px",
  fontWeight: "950",
  letterSpacing: "-1px",
};

const subtitle = {
  margin: "10px 0 0",
  fontSize: "15px",
  lineHeight: 1.45,
  color: "rgba(255,255,255,0.9)",
};

const askCard = {
  padding: "18px",
  borderRadius: "28px",
  background: "rgba(255,255,255,0.96)",
  border: "1px solid rgba(226,232,240,0.95)",
  boxShadow: "0 18px 42px rgba(15,23,42,0.08)",
  marginBottom: "16px",
};

const askTitle = {
  margin: "0 0 12px",
  fontSize: "21px",
  fontWeight: "950",
  color: "#0f172a",
};

const helperText = {
  margin: "-4px 0 12px",
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.4,
  fontWeight: "700",
};

const textarea = {
  width: "100%",
  minHeight: "112px",
  border: "1px solid #dbe3ef",
  borderRadius: "20px",
  padding: "14px",
  fontSize: "15px",
  lineHeight: 1.4,
  outline: "none",
  boxSizing: "border-box",
  resize: "vertical",
  fontFamily: "inherit",
};

const modeGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "12px",
};

const modeButton = {
  padding: "12px 10px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "900",
};

const activeModeButton = {
  ...modeButton,
  background: "#5b3df5",
  color: "white",
  border: "1px solid #5b3df5",
};

const resultCard = {
  padding: "18px",
  borderRadius: "28px",
  background: "rgba(255,255,255,0.98)",
  border: "1px solid rgba(226,232,240,0.95)",
  boxShadow: "0 18px 42px rgba(15,23,42,0.08)",
};

const resultHeader = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  marginBottom: "14px",
};

const resultIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "rgba(91,61,245,0.10)",
  display: "grid",
  placeItems: "center",
  fontSize: "24px",
};

const resultLabel = {
  margin: 0,
  fontSize: "12px",
  fontWeight: "950",
  color: "#7c3aed",
  textTransform: "uppercase",
};

const resultTitle = {
  margin: "3px 0 0",
  fontSize: "21px",
  fontWeight: "950",
  color: "#0f172a",
};

const emptyText = {
  margin: 0,
  color: "#475569",
  lineHeight: 1.45,
};

const sectionBlock = {
  padding: "13px",
  borderRadius: "18px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  marginTop: "10px",
};

const sectionLabel = {
  display: "block",
  color: "#0f172a",
  fontSize: "13px",
  fontWeight: "950",
  marginBottom: "6px",
};

const sectionText = {
  margin: 0,
  color: "#334155",
  fontSize: "14px",
};

const bullet = {
  margin: "5px 0",
  color: "#334155",
  fontSize: "14px",
  lineHeight: 1.35,
};

const askButton = {
  marginTop: "14px",
  width: "100%",
  padding: "14px",
  borderRadius: "20px",
  border: "0",
  background: "#5b3df5",
  color: "white",
  fontSize: "15px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 14px 30px rgba(91,61,245,0.24)",
};

export default Assistant;
