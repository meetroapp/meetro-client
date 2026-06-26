import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { updateRequestById } from "../utils/workflowTimeline";
import { getLanguage, t } from "../utils/language";
import {
  getProfessionalReviews,
  getProfessionalReviewStats,
  saveProfessionalReview,
} from "../utils/reviewStorage";

function EmergencyComplete({ setPage }) {
  const [language, setLanguage] = useState(getLanguage());
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [saved, setSaved] = useState(false);

  const completedProject = JSON.parse(
    localStorage.getItem("lastCompletedProject") || "null"
  );

  const activeEmergencyRecord = (() => {
    try {
      return JSON.parse(localStorage.getItem("activeEmergencyRecord") || "{}");
    } catch {
      return {};
    }
  })();

  function saveEmergencyRecordPatch(patch = {}) {
    const emergencyRequestId =
      activeEmergencyRecord.id ||
      completedProject?.emergencyRequestId ||
      "";

    const archivedRecord = (() => {
      if (!emergencyRequestId) return {};

      try {
        return JSON.parse(
          localStorage.getItem(
            `meetro_emergency_record_${emergencyRequestId}`
          ) || "{}"
        );
      } catch {
        return {};
      }
    })();

    const nextRecord = {
      ...archivedRecord,
      ...activeEmergencyRecord,
      ...patch,
      id: emergencyRequestId,
      updatedAt: new Date().toISOString(),
    };

    if (emergencyRequestId) {
      localStorage.setItem(
        `meetro_emergency_record_${emergencyRequestId}`,
        JSON.stringify(nextRecord)
      );
    }

    return nextRecord;
  }

  const selectedService =
    activeEmergencyRecord.service ||
    activeEmergencyRecord.title ||
    completedProject?.title ||
    completedProject?.category ||
    localStorage.getItem("selectedEmergencyService") ||
    "Home Project";

  const professionalName =
    activeEmergencyRecord.businessName ||
    localStorage.getItem("emergencyBusinessName") ||
    localStorage.getItem("selectedEmergencyBusiness") ||
    localStorage.getItem("selectedProfessionalName") ||
    completedProject?.selectedProfessional ||
    completedProject?.businessName ||
    completedProject?.acceptedQuote?.businessName ||
    localStorage.getItem("businessName") ||
    "Professional";

  useEffect(() => {
    const handleLanguageChange = () => {
      setLanguage(getLanguage());
    };

    window.addEventListener("languageChanged", handleLanguageChange);
    window.addEventListener("meetro-language-change", handleLanguageChange);
    window.addEventListener("meetroLanguageChanged", handleLanguageChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
      window.removeEventListener("meetro-language-change", handleLanguageChange);
      window.removeEventListener("meetroLanguageChanged", handleLanguageChange);
    };
  }, []);

  const pageText = {
    title: t("projectCompleted"),
    subtitle: t("projectCompletedSubtitle"),
    contractor: t("contractor"),
    service: t("completedProject"),
    ratingTitle: t("howWasExperience"),
    reviewPlaceholder: t("writeReview"),
    save: t("submitReview"),
    saved: t("reviewSubmitted"),
    invoice: t("projectSummary"),
    invoiceNote: t("completedProjectSaved"),
    home: t("done"),
    emergency: t("viewMyRequests"),
  };

  const translatedService =
    language === "es"
      ? selectedService
          ?.replace("Emergency Plumbing", "Plomería de Emergencia")
          ?.replace("Emergency Electrical", "Electricista de Emergencia")
          ?.replace("Roof Leak Repair", "Reparación de Techo")
          ?.replace("Locksmith", "Cerrajero")
          ?.replace("Storm Prep Help", "Preparación para Tormentas")
          ?.replace("Other Emergency", "Otra Emergencia")
      : selectedService;

function submitReview() {
  const professionalId =
    localStorage.getItem("selectedProfessionalId") ||
    completedProject?.acceptedQuote?.businessId ||
    activeEmergencyRecord.businessId ||
    activeEmergencyRecord.professionalId ||
    localStorage.getItem("activeProfessionalId") ||
    localStorage.getItem("businessName") ||
    "Professional";

  saveProfessionalReview({
    professionalId,
    professionalName,
    customerDisplayName:
      localStorage.getItem("userName") ||
      completedProject?.homeownerName ||
      activeEmergencyRecord.customerName ||
      "Customer",
    service: selectedService,
    rating,
    comment: review,
    jobId:
      completedProject?.requestId ||
      completedProject?.id ||
      activeEmergencyRecord.id ||
      localStorage.getItem("selectedHomeownerRequestId") ||
      "",
    requestId:
      completedProject?.requestId ||
      completedProject?.id ||
      activeEmergencyRecord.id ||
      localStorage.getItem("selectedHomeownerRequestId") ||
      "",
    createdAt: new Date().toISOString(),
    source: completedProject ? "job_completion_review" : "homeowner_review",
    projectTitle:
      completedProject?.title ||
      completedProject?.category ||
      selectedService,
  });

  const professionalReviews = getProfessionalReviews({
    professionalId,
    professionalName,
  });
  const reviewStats = getProfessionalReviewStats(professionalReviews);

  localStorage.setItem(
    "professionalRatingAverage",
    reviewStats.averageRating || "5.0"
  );

  localStorage.setItem(
    "professionalReviewCount",
    String(reviewStats.totalReviews)
  );

  localStorage.setItem("emergencyNeedsReview", "false");
  localStorage.setItem("homeownerNeedsReview", "false");

  if (completedProject) {
    updateRequestById(
      completedProject.requestId ||
        completedProject.id,
      (request) => ({
        ...request,
        needsReview: false,
        reviewSubmitted: true,
        reviewSubmittedAt:
          new Date().toISOString(),
      })
    );
  }
  localStorage.setItem("emergencyDispatchStatus", "closed");
  localStorage.setItem("emergencyWorkOrderClosed", "true");

  saveEmergencyRecordPatch({
    status: "closed",
    reviewSubmitted: true,
    reviewSubmittedAt: new Date().toISOString(),
    businessName: professionalName,
    service: selectedService,
  });

  window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));
  window.dispatchEvent(new Event("meetroProfessionalReviewUpdated"));

  setSaved(true);
}

  return (
    <div className="app-page meetro-readable-page" style={page}>
      <div style={card}>
        <div style={successCircle}>✓</div>

        <h1 style={title}>{pageText.title}</h1>
        <p style={subtitle}>{pageText.subtitle}</p>
        <div style={closureNotice}>
          {language === "es"
            ? "Confirma que el trabajo fue realizado y comparte tu experiencia. El Cierre de pagos, documentos y otras obligaciones se verifica por separado."
            : "Confirm the work was performed and share your experience. Closure of payment, documentation, and other obligations is verified separately."}
        </div>

        <div style={summaryCard}>
          <div style={contractorTop}>
            <div style={avatar}>PRO</div>

            <div>
              <strong style={contractorName}>{professionalName}</strong>
              <p style={serviceText}>{translatedService}</p>
            </div>
          </div>

          <div style={divider}></div>

          <span style={label}>{pageText.service}</span>
          <strong style={completedService}>{translatedService}</strong>
        </div>

        <div style={reviewCard}>
          <h3 style={sectionTitle}>{pageText.ratingTitle}</h3>

          <div style={stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                style={star <= rating ? activeStar : starButton}
                onClick={() => setRating(star)}
              >
                {star}
              </button>
            ))}
          </div>

          <textarea
            style={textarea}
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder={pageText.reviewPlaceholder}
          />

          <button
            style={saved ? savedButton : saveButton}
            onClick={submitReview}
          >
            {saved ? pageText.saved : pageText.save}
          </button>
        </div>

        <div style={invoiceCard}>
          <strong>{pageText.invoice}</strong>
          <span>{pageText.invoiceNote}</span>
        </div>

        <button style={primaryButton} onClick={() => setPage("home")}>
          {pageText.home}
        </button>

        <button style={darkButton} onClick={() => setPage("myRequests")}>
          {pageText.emergency}
        </button>
      </div>

      <BottomNav currentPage="emergency" setPage={setPage} />
    </div>
  );
}

const page = {
  minHeight: "100dvh",
  background:
    "linear-gradient(160deg, #eef2ff 0%, #ffffff 50%, #f5f3ff 100%)",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 24px) max(20px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
};

const card = {
  maxWidth: "430px",
  margin: "0 auto",
  textAlign: "center",
  paddingBottom: "90px",
};

const successCircle = {
  width: "72px",
  height: "72px",
  borderRadius: "30px",
  margin: "16px auto 22px",
  background: "#10b981",
  color: "white",
  fontSize: "38px",
  fontWeight: "900",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 18px 40px rgba(16,185,129,0.28)",
};

const title = {
  fontSize: "32px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "8px",
};

const subtitle = {
  color: "#6b7280",
  fontSize: "16px",
  lineHeight: "1.5",
  marginBottom: "22px",
};

const closureNotice = {
  margin: "-8px auto 22px",
  padding: "13px 15px",
  borderRadius: "16px",
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  fontSize: "13px",
  lineHeight: 1.5,
  fontWeight: 700,
};

const summaryCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  textAlign: "left",
  boxShadow: "0 16px 40px rgba(0,0,0,0.07)",
  marginBottom: "18px",
};

const contractorTop = {
  display: "flex",
  gap: "14px",
  alignItems: "center",
};

const avatar = {
  width: "58px",
  height: "58px",
  borderRadius: "20px",
  background: "#5b3df5",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  fontSize: "15px",
};

const contractorName = {
  fontSize: "17px",
  color: "#111827",
};

const serviceText = {
  margin: "5px 0 0",
  color: "#6b7280",
  fontSize: "14px",
};

const divider = {
  height: "1px",
  background: "#e5e7eb",
  margin: "18px 0",
};

const label = {
  display: "block",
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "800",
  marginBottom: "6px",
};

const completedService = {
  color: "#5b3df5",
  fontSize: "17px",
};

const reviewCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "0 16px 40px rgba(0,0,0,0.07)",
  marginBottom: "18px",
};

const sectionTitle = {
  margin: "0 0 14px",
  fontSize: "20px",
  fontWeight: "900",
  color: "#111827",
};

const stars = {
  display: "flex",
  justifyContent: "center",
  gap: "8px",
  marginBottom: "16px",
};

const starButton = {
  border: "none",
  background: "#e5e7eb",
  color: "#475569",
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  fontSize: "22px",
  fontWeight: "900",
  cursor: "pointer",
};

const activeStar = {
  border: "none",
  background: "#fef3c7",
  color: "#f59e0b",
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  fontSize: "22px",
  fontWeight: "900",
  cursor: "pointer",
};

const textarea = {
  width: "100%",
  minHeight: "92px",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "15px",
  fontSize: "16px",
  boxSizing: "border-box",
  outline: "none",
  resize: "vertical",
  fontFamily: "inherit",
  marginBottom: "14px",
};

const saveButton = {
  width: "100%",
  padding: "15px",
  borderRadius: "18px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer",
};

const savedButton = {
  width: "100%",
  padding: "15px",
  borderRadius: "18px",
  border: "none",
  background: "#10b981",
  color: "white",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer",
};

const invoiceCard = {
  background: "white",
  borderRadius: "24px",
  padding: "18px",
  display: "grid",
  gap: "6px",
  color: "#374151",
  boxShadow: "0 12px 32px rgba(0,0,0,0.05)",
  marginBottom: "18px",
  textAlign: "left",
};

const primaryButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
  marginBottom: "12px",
};

const darkButton = {
  width: "100%",
  padding: "15px",
  borderRadius: "18px",
  border: "none",
  background: "#111827",
  color: "white",
  fontSize: "15px",
  fontWeight: "800",
  cursor: "pointer",
};

export default EmergencyComplete;
