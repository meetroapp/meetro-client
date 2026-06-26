import { useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage, t } from "../utils/language";

import termsOfUse from "../../docs/KnowledgeBase/MEETRO_COMMUNITY_TERMS_OF_USE.md?raw";
import privacyPolicy from "../../docs/KnowledgeBase/MEETRO_COMMUNITY_PRIVACY_POLICY.md?raw";
import communityGuidelines from "../../docs/KnowledgeBase/MEETRO_COMMUNITY_GUIDELINES.md?raw";
import emergencyDisclaimer from "../../docs/KnowledgeBase/MEETRO_COMMUNITY_EMERGENCY_DISCLAIMER.md?raw";
import aiAssistanceDisclaimer from "../../docs/KnowledgeBase/MEETRO_COMMUNITY_AI_ASSISTANCE_DISCLAIMER.md?raw";

const LEGAL_DOCUMENTS = [
  {
    id: "terms",
    titleKey: "termsOfUse",
    content: termsOfUse,
  },
  {
    id: "privacy",
    titleKey: "privacyPolicy",
    content: privacyPolicy,
  },
  {
    id: "guidelines",
    titleKey: "communityGuidelines",
    content: communityGuidelines,
  },
  {
    id: "emergency",
    titleKey: "emergencyDisclaimer",
    content: emergencyDisclaimer,
  },
  {
    id: "ai",
    titleKey: "aiAssistanceDisclaimer",
    content: aiAssistanceDisclaimer,
  },
];

function Legal({ setPage }) {
  const language = getLanguage();
  const [selectedDocumentId, setSelectedDocumentId] = useState(
    localStorage.getItem("meetroSelectedLegalDocument") || "terms"
  );
  const selectedDocument =
    LEGAL_DOCUMENTS.find((document) => document.id === selectedDocumentId) ||
    LEGAL_DOCUMENTS[0];
  const hasToken = Boolean(localStorage.getItem("token"));
  const legalReturnPage = localStorage.getItem("meetroLegalReturnPage") || "";

  function openDocument(documentId) {
    localStorage.setItem("meetroSelectedLegalDocument", documentId);
    setSelectedDocumentId(documentId);
  }

  function goBack() {
    const returnPage =
      legalReturnPage ||
      (hasToken ? "profile" : "login");

    localStorage.removeItem("meetroLegalReturnPage");
    setPage(returnPage);
  }

  return (
    <div className="app-page meetro-readable-page" style={pageWrapper}>
      <button type="button" style={backButton} onClick={goBack}>
        ←{" "}
        {legalReturnPage === "businessCommandCenter"
          ? "Back to Business Tools"
          : t("back")}
      </button>

      <section style={heroCard}>
        <p style={eyebrow}>{t("legal")}</p>
        <h1 style={title}>{t("legal")}</h1>
        <p style={purpose}>{t("legalPurpose")}</p>
      </section>

      <section style={documentNav} aria-label={t("legalDocuments")}>
        {LEGAL_DOCUMENTS.map((document) => {
          const active = document.id === selectedDocument.id;

          return (
            <button
              key={document.id}
              type="button"
              style={{
                ...documentButton,
                ...(active ? activeDocumentButton : {}),
              }}
              onClick={() => openDocument(document.id)}
            >
              {t(document.titleKey)}
            </button>
          );
        })}
      </section>

      <article style={documentCard}>
        <MarkdownDocument content={selectedDocument.content} language={language} />
      </article>

      {hasToken && <BottomNav setPage={setPage} currentPage="profile" />}
    </div>
  );
}

function MarkdownDocument({ content }) {
  return (
    <div>
      {content.split("\n").map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={`space-${index}`} style={spacer} />;
        }

        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={index} style={docTitle}>
              {trimmed.replace(/^# /, "")}
            </h1>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={index} style={docHeading}>
              {trimmed.replace(/^## /, "")}
            </h2>
          );
        }

        if (trimmed.startsWith("- ")) {
          return (
            <p key={index} style={listItem}>
              • {trimmed.replace(/^- /, "")}
            </p>
          );
        }

        return (
          <p key={index} style={docParagraph}>
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

const pageWrapper = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 18px) max(18px, env(safe-area-inset-right, 0px)) calc(82px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  color: "#0f172a",
  width: "100%",
  maxWidth: "900px",
  margin: "0 auto",
};

const backButton = {
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#0f172a",
  borderRadius: "16px",
  padding: "11px 14px",
  fontWeight: "900",
  marginBottom: "14px",
  boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
  cursor: "pointer",
};

const heroCard = {
  background: "linear-gradient(135deg, #5b3df5 0%, #8b5cf6 100%)",
  color: "white",
  borderRadius: "28px",
  padding: "24px",
  marginBottom: "16px",
  boxShadow: "0 18px 40px rgba(91,61,245,0.25)",
};

const eyebrow = {
  margin: "0 0 8px",
  opacity: 0.82,
  fontSize: "13px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const title = {
  margin: "0 0 8px",
  fontSize: "34px",
  lineHeight: 1,
  fontWeight: "950",
};

const purpose = {
  margin: 0,
  fontSize: "15px",
  lineHeight: 1.45,
  opacity: 0.92,
};

const documentNav = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
  marginBottom: "16px",
};

const documentButton = {
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#334155",
  borderRadius: "16px",
  padding: "12px",
  fontWeight: "900",
  textAlign: "left",
  cursor: "pointer",
};

const activeDocumentButton = {
  borderColor: "#7c3aed",
  background: "#f3f0ff",
  color: "#5b3df5",
  boxShadow: "0 10px 22px rgba(91,61,245,0.12)",
};

const documentCard = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "24px",
  padding: "20px",
  boxShadow: "0 14px 32px rgba(15,23,42,0.07)",
  textAlign: "left",
  lineHeight: 1.58,
};

const docTitle = {
  margin: "0 0 14px",
  fontSize: "26px",
  lineHeight: 1.12,
};

const docHeading = {
  margin: "20px 0 8px",
  fontSize: "18px",
  lineHeight: 1.25,
};

const docParagraph = {
  margin: "0 0 10px",
  color: "#334155",
  fontSize: "14px",
  lineHeight: 1.6,
};

const listItem = {
  margin: "0 0 7px",
  color: "#334155",
  fontSize: "14px",
  lineHeight: 1.5,
};

const spacer = {
  height: "8px",
};

export default Legal;
