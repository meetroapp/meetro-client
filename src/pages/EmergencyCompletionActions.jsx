import { useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage } from "../utils/language";

function EmergencyCompletionActions({ setPage }) {
  const language = getLanguage();

  const [paymentStatus, setPaymentStatus] = useState(
    localStorage.getItem("emergencyPaymentStatus") || "unpaid"
  );

  const service =
    localStorage.getItem("activeJobService") ||
    localStorage.getItem("selectedEmergencyService") ||
    "Emergency Service";

  const businessName =
    localStorage.getItem("businessName") ||
    localStorage.getItem("activeProfessionalId") ||
    "Professional";

  const labor = Number(localStorage.getItem("emergencyLaborCharge") || 0);
  const materials = Number(localStorage.getItem("emergencyMaterialCharge") || 0);
  const emergencyFee = Number(localStorage.getItem("emergencyServiceFee") || 0);
  const total = labor + materials + emergencyFee;

  function saveToHistory() {
    localStorage.setItem("emergencySavedToHistory", "true");
    localStorage.setItem("emergencyArchivedAt", new Date().toISOString());
    localStorage.setItem("activeJobStatus", "completed");
    localStorage.setItem("emergencyDispatchStatus", "completed");
    localStorage.setItem("businessAcceptedEmergency", "false");

    window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));
    window.dispatchEvent(new Event("meetro-messages-updated"));

    setPage("messagesInbox");
  }

  function markPaid() {
    localStorage.setItem("emergencyPaymentStatus", "paid");
    localStorage.setItem("emergencyPaidAt", new Date().toISOString());
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
        <div style={successIcon}>{paymentStatus === "paid" ? "💰" : "✅"}</div>

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
            <span>{language === "es" ? "Mano de obra" : "Labor"}</span>
            <strong>${labor}</strong>
          </div>

          <div style={summaryRow}>
            <span>{language === "es" ? "Materiales" : "Materials"}</span>
            <strong>${materials}</strong>
          </div>

          <div style={summaryRow}>
            <span>{language === "es" ? "Tarifa emergencia" : "Emergency fee"}</span>
            <strong>${emergencyFee}</strong>
          </div>

          <div style={totalRow}>
            <span>{language === "es" ? "Total" : "Total"}</span>
            <strong>${total}</strong>
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
            💳 {language === "es" ? `Pagar $${total}` : `Pay $${total}`}
          </button>
        )}

        <button style={primaryBtn} onClick={saveToHistory}>
          💾 {language === "es" ? "Guardar en historial" : "Save to History"}
        </button>

        <button style={secondaryBtn} onClick={continueConversation}>
          💬 {language === "es" ? "Continuar conversación" : "Continue Conversation"}
        </button>

        <button style={secondaryBtn} onClick={() => setPage("contractorDashboard")}>
          🛠️ {language === "es" ? "Volver al centro de trabajo" : "Back to Work Center"}
        </button>
      </div>

      <BottomNav setPage={setPage} currentPage="messages" />
    </div>
  );
}

const page = {
  minHeight: "100vh",
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
  color: "#64748b",
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
