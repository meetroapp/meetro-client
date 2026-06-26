import { useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import { getLanguage } from "../utils/language";
import { getActiveJobSnapshot, saveActiveJobSnapshot } from "../utils/workCenter";
import {
  normalizeLaborPricingType,
  normalizePricingModel,
} from "../utils/pricingCalculations";

function EmergencyCompletionActions({ setPage }) {
  const activeJobSnapshot = getActiveJobSnapshot();

  const activeEmergencyRecord = (() => {
    try {
      return JSON.parse(localStorage.getItem("activeEmergencyRecord") || "{}");
    } catch {
      return {};
    }
  })();

  function saveEmergencyRecordPatch(patch = {}) {
    const nextRecord = {
      ...activeEmergencyRecord,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem("activeEmergencyRecord", JSON.stringify(nextRecord));

    if (nextRecord.id) {
      localStorage.setItem(
        `meetro_emergency_record_${nextRecord.id}`,
        JSON.stringify(nextRecord)
      );
    }

    return nextRecord;
  }

  const language = getLanguage();

  const [paymentStatus, setPaymentStatus] = useState(
    localStorage.getItem("emergencyPaymentStatus") || "unpaid"
  );

  const service =
    activeEmergencyRecord.service ||
    activeEmergencyRecord.title ||
    activeJobSnapshot?.service ||
    localStorage.getItem("activeJobService") ||
    localStorage.getItem("selectedEmergencyService") ||
    "Emergency Service";

  const businessName =
    activeEmergencyRecord.businessName ||
    localStorage.getItem("emergencyBusinessName") ||
    localStorage.getItem("selectedEmergencyBusiness") ||
    localStorage.getItem("businessName") ||
    localStorage.getItem("activeProfessionalId") ||
    "Professional";

  const laborPricingType = normalizeLaborPricingType(
    localStorage.getItem("emergencyLaborPricingType") || "flat_fee"
  );
  const pricingModel = normalizePricingModel({
    laborPricingType,
    laborFee:
      localStorage.getItem("emergencyLaborFee") ||
      localStorage.getItem("emergencyLaborCharge") ||
      activeEmergencyRecord.laborFee ||
      activeEmergencyRecord.labor,
    laborHours:
      localStorage.getItem("emergencyLaborHours") ||
      activeEmergencyRecord.laborHours,
    laborRate:
      localStorage.getItem("emergencyLaborRate") ||
      activeEmergencyRecord.laborRate,
    materials:
      localStorage.getItem("emergencyMaterialCharge") ||
      activeEmergencyRecord.materials,
    serviceFee:
      localStorage.getItem("emergencyServiceFee") ||
      activeEmergencyRecord.emergencyFee,
    total: activeEmergencyRecord.total,
  });
  const labor = pricingModel.laborTotal;
  const materials = pricingModel.materialsTotal;
  const emergencyFee = Number(localStorage.getItem("emergencyServiceFee") || activeEmergencyRecord.emergencyFee || 0);
  const total = pricingModel.customerTotal;
  const pricingPatch = {
    laborPricingType: pricingModel.laborPricingType,
    laborTotal: pricingModel.laborTotal,
    materialsTotal: pricingModel.materialsTotal,
    emergencyFee,
    subtotal: pricingModel.subtotal,
    total,
  };

  function saveToHistory() {
    localStorage.setItem("emergencySavedToHistory", "true");
    localStorage.setItem("emergencyArchivedAt", new Date().toISOString());
    saveActiveJobSnapshot({
      status: "completed",
      service,
      location:
        activeJobSnapshot?.location ||
        localStorage.getItem("activeJobLocation") ||
        "",
    });

    localStorage.setItem("activeJobStatus", "completed");
    localStorage.setItem("emergencyDispatchStatus", "completed");
    localStorage.setItem("businessAcceptedEmergency", "false");

    saveEmergencyRecordPatch({
      status: "completed",
      savedToHistory: true,
      archivedAt: new Date().toISOString(),
      service,
      businessName,
      paymentStatus,
      total,
      ...pricingPatch,
    });

    window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));
    window.dispatchEvent(new Event("meetro-messages-updated"));

    localStorage.setItem("meetroConversationType", "emergency");
    localStorage.setItem(
      "activeConversationId",
      activeEmergencyRecord.conversationId ||
        activeEmergencyRecord.emergencyConversationId ||
        localStorage.getItem("emergencyConversationId") ||
        localStorage.getItem("activeConversationId") ||
        ""
    );
    localStorage.setItem("conversationReturnPage", "emergencyComplete");
    setPage("conversationThread");
  }

  function markPaid() {
    localStorage.setItem("emergencyPaymentStatus", "paid");
    localStorage.setItem("emergencyPaidAt", new Date().toISOString());

    saveEmergencyRecordPatch({
      paymentStatus: "paid",
      paidAt: new Date().toISOString(),
      service,
      businessName,
      total,
      ...pricingPatch,
    });

    setPaymentStatus("paid");
  }

  function continueConversation() {
    localStorage.setItem("meetroConversationType", "emergency");
    localStorage.setItem("conversationReturnPage", "messagesInbox");
    setPage("conversationThread");
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={successIcon}>
          <MeetroIcon name={paymentStatus === "paid" ? "payment" : "completion"} size={42} decorative />
        </div>

        <h1 style={title}>
          {paymentStatus === "paid"
            ? language === "es"
              ? "Trabajo finalizado"
              : "Job Finalized"
            : language === "es"
            ? "Resumen del trabajo"
            : "Job Summary"}
        </h1>

        <p style={subtitle}>
          {language === "es"
            ? "Revisa el trabajo completado, cargos y pago para finalizar el servicio."
            : "Review the completed work, charges, and payment to finalize the service."}
        </p>

        <div style={summaryCard}>
          <div style={sectionTitle}>
            {language === "es" ? "Trabajo realizado" : "Work Completed"}
          </div>

          <div style={summaryRow}>
            <span>{language === "es" ? "Servicio" : "Service"}</span>
            <strong>{service}</strong>
          </div>

          <div style={summaryRow}>
            <span>{language === "es" ? "Profesional" : "Professional"}</span>
            <strong>{businessName}</strong>
          </div>

          <div style={summaryRow}>
            <span>{language === "es" ? "Descripción" : "Description"}</span>
            <strong>
              {language === "es"
                ? "Servicio de emergencia completado"
                : "Emergency service completed"}
            </strong>
          </div>
        </div>

        <div style={summaryCard}>
          <div style={sectionTitle}>
            {language === "es" ? "Cargos" : "Charges"}
          </div>

          <div style={summaryRow}>
            <span>{language === "es" ? "Tipo de mano de obra" : "Labor Type"}</span>
            <strong>
              {pricingModel.laborPricingType === "hourly"
                ? language === "es"
                  ? "Por hora"
                  : "Hourly"
                : language === "es"
                ? "Tarifa fija"
                : "Flat Fee"}
            </strong>
          </div>

          <div style={summaryRow}>
            <span>{language === "es" ? "Costo de mano de obra" : "Labor Cost"}</span>
            <strong>${labor.toFixed(2)}</strong>
          </div>

          <div style={summaryRow}>
            <span>{language === "es" ? "Costo de materiales" : "Material Cost"}</span>
            <strong>${materials.toFixed(2)}</strong>
          </div>

          <div style={summaryRow}>
            <span>{language === "es" ? "Tarifa emergencia" : "Emergency fee"}</span>
            <strong>${emergencyFee.toFixed(2)}</strong>
          </div>

          <div style={totalRow}>
            <span>{language === "es" ? "Total cobrado" : "Total Charged"}</span>
            <strong>${total.toFixed(2)}</strong>
          </div>
        </div>

        <div style={paymentBox}>
          <span>{language === "es" ? "Estado de pago" : "Payment Status"}</span>
          <strong style={paymentStatus === "paid" ? paidText : unpaidText}>
            {paymentStatus === "paid"
              ? language === "es"
                ? "Pagado"
                : "Paid"
              : language === "es"
              ? "Pendiente"
              : "Pending"}
          </strong>
        </div>

        {paymentStatus !== "paid" && (
          <button style={payBtn} onClick={markPaid}>
            <MeetroIcon name="payment" size={18} decorative /> {language === "es" ? `Pagar $${total.toFixed(2)}` : `Pay $${total.toFixed(2)}`}
          </button>
        )}

        <button style={primaryBtn} onClick={saveToHistory}>
          <MeetroIcon name="history" size={18} decorative /> {language === "es" ? "Guardar en historial" : "Save to History"}
        </button>

        <button style={secondaryBtn} onClick={continueConversation}>
          <MeetroIcon name="messages" size={18} decorative /> {language === "es" ? "Continuar conversación" : "Continue Conversation"}
        </button>

        <button style={secondaryBtn} onClick={() => setPage("contractorDashboard")}>
          <MeetroIcon name="workCenter" size={18} decorative /> {language === "es" ? "Volver al centro de trabajo" : "Back to Work Center"}
        </button>
      </div>

      <BottomNav setPage={setPage} currentPage="messages" />
    </div>
  );
}

const page = {
  minHeight: "100dvh",
  background: "linear-gradient(135deg, #f7fff9, #f8fafc)",
  padding: "24px 20px 120px",
};

const card = {
  maxWidth: "500px",
  margin: "0 auto",
  background: "#ffffff",
  borderRadius: "32px",
  padding: "24px",
  boxShadow: "0 20px 60px rgba(15,23,42,0.10)",
  border: "1px solid #e5e7eb",
  textAlign: "center",
};

const successIcon = {
  width: "86px",
  height: "86px",
  borderRadius: "28px",
  background: "#ecfdf5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "44px",
  margin: "0 auto 18px",
};

const title = {
  fontSize: "28px",
  fontWeight: "900",
  margin: "0 0 10px",
  color: "#064e3b",
};

const subtitle = {
  fontSize: "14px",
  lineHeight: 1.5,
  color: "#475569",
  marginBottom: "20px",
};

const summaryCard = {
  background: "#f8fafc",
  borderRadius: "24px",
  padding: "16px",
  marginBottom: "16px",
  textAlign: "left",
};

const sectionTitle = {
  fontSize: "13px",
  fontWeight: "900",
  color: "#0f172a",
  marginBottom: "8px",
};

const summaryRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  padding: "10px 0",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "13px",
};

const totalRow = {
  display: "flex",
  justifyContent: "space-between",
  paddingTop: "14px",
  fontSize: "18px",
  fontWeight: "900",
  color: "#064e3b",
};

const paymentBox = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#f8fafc",
  borderRadius: "20px",
  padding: "14px 16px",
  marginBottom: "14px",
  fontSize: "14px",
};

const paidText = {
  color: "#059669",
};

const unpaidText = {
  color: "#dc2626",
};

const payBtn = {
  width: "100%",
  padding: "16px",
  border: "none",
  borderRadius: "18px",
  background: "#111827",
  color: "white",
  fontWeight: "900",
  marginBottom: "12px",
  cursor: "pointer",
};

const primaryBtn = {
  width: "100%",
  padding: "16px",
  border: "none",
  borderRadius: "18px",
  background: "#10b981",
  color: "white",
  fontWeight: "900",
  marginBottom: "12px",
  cursor: "pointer",
};

const secondaryBtn = {
  width: "100%",
  padding: "15px",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  background: "#ffffff",
  color: "#111827",
  fontWeight: "900",
  marginBottom: "12px",
  cursor: "pointer",
};

export default EmergencyCompletionActions;
