import { useState } from "react";
import BottomNav from "../components/BottomNav";
import {
  getBusinessSchedule,
  saveBusinessSchedule,
  clearActiveJobSnapshot,
  getActiveJobSnapshot,
  getActiveWorkSnapshot,
  clearActiveWorkSnapshot,
} from "../utils/workCenter";
import { getLanguage } from "../utils/language";

function CompletionSheet({ setPage }) {
  const activeJobSnapshot = getActiveJobSnapshot();
  const activeWorkSnapshot = getActiveWorkSnapshot();

  const language = getLanguage();
  const isSpanish = language === "es";

  const savedJob = JSON.parse(localStorage.getItem("activeCompletionJob") || "{}");

  const completionService =
    localStorage.getItem("completionService") ||
    activeWorkSnapshot?.service ||
    localStorage.getItem("activeWorkService") ||
    activeJobSnapshot?.service ||
    localStorage.getItem("activeJobService") ||
    savedJob.service ||
    (isSpanish ? "Trabajo de servicio" : "Service Job");

  const completionLocation =
    localStorage.getItem("completionLocation") ||
    activeWorkSnapshot?.location ||
    localStorage.getItem("activeWorkLocation") ||
    activeJobSnapshot?.location ||
    localStorage.getItem("activeJobLocation") ||
    savedJob.location ||
    (isSpanish ? "Ubicación del cliente" : "Customer location");

  const completionScheduleId = localStorage.getItem("completionScheduleId") || "";
  const conversationId =
    activeWorkSnapshot?.conversationId ||
    localStorage.getItem("activeWorkConversationId") ||
    localStorage.getItem("invoiceConversationId") ||
    localStorage.getItem("activeConversationId") ||
    "";

  const [customerTotal, setCustomerTotal] = useState(String(savedJob.amount || ""));
  const [materials, setMaterials] = useState("0");
  const [laborHours, setLaborHours] = useState("0");
  const [paymentReceived, setPaymentReceived] = useState("yes");
  const [paymentType, setPaymentType] = useState("cash");
  const [workSummary, setWorkSummary] = useState("");
  const [aiDraft, setAiDraft] = useState("");

  const total = Number(customerTotal || 0);
  const materialCost = Math.max(Number(materials || 0), 0);

  function runAiAssist() {
    const summary = workSummary.trim();

    if (!summary) {
      setAiDraft(
        isSpanish
          ? "Describe el trabajo realizado para que Meetro pueda ayudarte a preparar un resumen profesional."
          : "Describe the work performed so Meetro can help prepare a professional summary."
      );
      return;
    }

    setAiDraft(
      isSpanish
        ? `Resumen sugerido: Se completó el trabajo solicitado: ${summary}. El área fue revisada y el servicio quedó listo para el cliente.`
        : `Suggested summary: Completed the requested work: ${summary}. The area was checked and the service was left ready for the customer.`
    );
  }

  function saveCompletion() {
    const completedAt = new Date().toISOString();

    const finalNotes = workSummary || aiDraft || "";

    const completedRecord = {
      id: `completed-${Date.now()}`,
      title: completionService,
      service: completionService,
      customer: "Customer",
      location: completionLocation,
      revenue: total,
      amount: total,
      materialCost,
      laborHours,
      notes: finalNotes,
      paymentReceived,
      paymentType,
      completedAt,
      source: completionScheduleId ? "schedule" : "completion",
      scheduleId: completionScheduleId,
      conversationId,
    };

    const previousCompletedProjects = JSON.parse(
      localStorage.getItem("completedProjects") || "[]"
    );

    localStorage.setItem(
      "completedProjects",
      JSON.stringify([completedRecord, ...previousCompletedProjects])
    );

    localStorage.setItem("completedJobType", completionScheduleId ? "Scheduled" : "Service");
    localStorage.setItem("completedJobService", completionService);
    localStorage.setItem("completedJobCustomer", "Customer");
    localStorage.setItem("completedJobLocation", completionLocation);
    localStorage.setItem("completedJobDate", new Date().toLocaleDateString());
    localStorage.setItem("completedJobTime", new Date().toLocaleTimeString());
    localStorage.setItem("completedJobAmount", `+$${total}`);
    localStorage.setItem("completedJobMaterialCost", String(materialCost));
    localStorage.setItem("completedJobLaborHours", laborHours);
    localStorage.setItem("completedJobNotes", finalNotes);
    localStorage.setItem("completedJobPaymentReceived", paymentReceived);
    localStorage.setItem("completedJobPaymentType", paymentType);

    const previousCompleted = Number(localStorage.getItem("completedJobsCount") || 0);
    const previousRevenue = Number(localStorage.getItem("totalJobRevenue") || 0);

    localStorage.setItem("completedJobsCount", String(previousCompleted + 1));
    localStorage.setItem("totalJobRevenue", String(previousRevenue + total));

    if (completionScheduleId) {
      const schedule = getBusinessSchedule();

      const updatedSchedule = schedule.map((item) =>
        item.id === completionScheduleId
          ? {
              ...item,
              status: "Completed",
              amount: total,
              completedAt,
            }
          : item
      );

      saveBusinessSchedule(updatedSchedule);
    }

    if (conversationId) {
      const storageKey = `meetro_conversation_${conversationId}`;
      const existingMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");

      const invoiceMessage = {
        id: Date.now(),
        sender: "business",
        role: "business",
        type: "workflow_completion_closeout",
        text: isSpanish
          ? `Trabajo marcado como completado — Total: $${total}.`
          : `Job marked completed — Total: $${total}.`,
        title: isSpanish
          ? "Cierre del proyecto"
          : "Project Closeout",
        subtitle: isSpanish
          ? "Revisa el resumen final y confirma el cierre."
          : "Review the final summary and confirm closeout.",
        requestId:
          localStorage.getItem("activeRequestId") ||
          conversationId,
        projectTitle: completionService,
        completion: completedRecord,
        completionStatus: "awaiting_customer_confirmation",
        warrantyOffered: true,
        reviewRequested: true,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        createdAt: completedAt,
      };

      localStorage.setItem(storageKey, JSON.stringify([...existingMessages, invoiceMessage]));
      window.dispatchEvent(new Event("meetro-messages-updated"));
    }

    localStorage.setItem("activeWorkStatus", "completed");
    clearActiveWorkSnapshot();
    localStorage.setItem("emergencyDispatchStatus", "closed");

    [
      "activeJobStatus",
      "activeCompletionJob",
      "activeJobService",
      "activeJobEta",
      "selectedEmergencyService",
      "completionService",
      "completionLocation",
      "completionSource",
      "completionScheduleId",
      "activeWorkService",
      "activeWorkLocation",
      "activeWorkScheduleId",
    ].forEach((key) => localStorage.removeItem(key));

    localStorage.setItem("activeJobsCount", "0");
    localStorage.setItem("meetroWorkCenterTab", "completed");

    setPage("completedJobDetails");
  }

  return (
    <div style={page}>
      <button
        style={backButton}
        onClick={() => {
          localStorage.setItem("meetroWorkCenterTab", "completed");
          localStorage.setItem("activeWorkCenterTab", "completed");
          setPage("contractorDashboard");
        }}
      >
        ← {isSpanish ? "Volver al centro de trabajo" : "Back to Work Center"}
      </button>

      <div style={card}>
        <div style={header}>
          <span style={eyebrow}>
            {isSpanish ? "Cierre universal" : "Universal Closeout"}
          </span>

          <h1 style={title}>{completionService}</h1>
          <p style={subtitle}>{completionLocation}</p>
        </div>

        <section style={section}>
          <h2>{isSpanish ? "Resumen del trabajo" : "Work Summary"}</h2>

          <textarea
            value={workSummary}
            onChange={(e) => setWorkSummary(e.target.value)}
            style={textarea}
            placeholder={
              isSpanish
                ? "Describe lo que se realizó, piezas usadas o notas importantes..."
                : "Describe the work performed, parts used, or important notes..."
            }
          />

          <button style={aiButton} onClick={runAiAssist}>
            🪄 {isSpanish ? "Ayuda AI para resumen" : "AI Assist Summary"}
          </button>

          {aiDraft && (
            <div style={aiBox}>
              <strong>
                {isSpanish ? "Sugerencia AI" : "AI Suggested Summary"}
              </strong>

              <p>{aiDraft}</p>

              <div style={aiActionRow}>
                <button
                  style={aiSmallButton}
                  onClick={() => setWorkSummary(aiDraft)}
                >
                  {isSpanish ? "Usar sugerencia" : "Use Suggestion"}
                </button>

                <button
                  style={aiSmallButton}
                  onClick={() =>
                    setWorkSummary(
                      workSummary
                        ? `${workSummary}\n\n${aiDraft}`
                        : aiDraft
                    )
                  }
                >
                  {isSpanish ? "Agregar a mis notas" : "Add to My Notes"}
                </button>

                <button
                  style={aiGhostButton}
                  onClick={() => setAiDraft("")}
                >
                  {isSpanish ? "Mantener original" : "Keep Original"}
                </button>
              </div>
            </div>
          )}
        </section>

        <section style={section}>
          <h2>{isSpanish ? "Cobros" : "Charges"}</h2>

          <div style={formGrid}>
            <label style={field}>
              <span>{isSpanish ? "Total del cliente" : "Customer Total"}</span>
              <input
                value={customerTotal}
                onChange={(e) => setCustomerTotal(e.target.value.replace("-", ""))}
                style={input}
                type="number"
                placeholder="0"
              />
            </label>

            <label style={field}>
              <span>{isSpanish ? "Materiales" : "Materials"}</span>
              <input
                value={materials}
                onChange={(e) => setMaterials(e.target.value.replace("-", ""))}
                style={input}
                type="number"
              />
            </label>

            <label style={field}>
              <span>{isSpanish ? "Horas de labor" : "Labor Hours"}</span>
              <input
                value={laborHours}
                onChange={(e) => setLaborHours(e.target.value)}
                style={input}
                type="number"
              />
            </label>

            <label style={field}>
              <span>{isSpanish ? "Pago recibido" : "Payment Received"}</span>
              <select
                value={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.value)}
                style={input}
              >
                <option value="yes">{isSpanish ? "Sí" : "Yes"}</option>
                <option value="no">{isSpanish ? "No" : "No"}</option>
                <option value="partial">{isSpanish ? "Parcial" : "Partial"}</option>
              </select>
            </label>

            <label style={field}>
              <span>{isSpanish ? "Método de pago" : "Payment Method"}</span>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                style={input}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="zelle">Zelle</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
        </section>

        <section style={section}>
          <h2>{isSpanish ? "Fotos y archivos" : "Photos & Files"}</h2>
          <div style={photoNotice}>
            {isSpanish
              ? "Las fotos antes/después se conectarán aquí cuando el sistema de archivos del trabajo esté listo."
              : "Before/after photos will appear here once job file uploads are connected."}
          </div>
        </section>

        <div style={actionGrid}>
          <button style={saveButton} onClick={saveCompletion}>
            💾 {isSpanish ? "Guardar cierre" : "Save Completion Record"}
          </button>

          {conversationId && (
            <button
              style={secondaryButton}
              onClick={() => {
                localStorage.setItem("activeConversationId", conversationId);
                setPage("conversationThread");
              }}
            >
              💬 {isSpanish ? "Volver al chat" : "Back to Chat"}
            </button>
          )}
        </div>
      </div>

      <BottomNav setPage={setPage} currentPage="contractorDashboard" />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg,#f8fafc,#eef2ff)",
  padding: "24px 24px 220px",
  boxSizing: "border-box",
};

const backButton = {
  border: "none",
  background: "white",
  borderRadius: "18px",
  padding: "12px 16px",
  fontWeight: "900",
  cursor: "pointer",
  marginBottom: "18px",
};

const card = {
  maxWidth: "860px",
  margin: "0 auto",
  background: "white",
  borderRadius: "30px",
  padding: "24px",
  boxShadow: "0 18px 44px rgba(15,23,42,.08)",
};

const header = {
  marginBottom: "18px",
};

const eyebrow = {
  display: "inline-flex",
  background: "#eef2ff",
  color: "#5b3df5",
  padding: "7px 12px",
  borderRadius: "999px",
  fontWeight: "900",
};

const title = {
  fontSize: "34px",
  margin: "14px 0 6px",
};

const subtitle = {
  color: "#475569",
  fontWeight: "800",
};

const section = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  padding: "18px",
  marginBottom: "16px",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const field = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "14px",
  fontWeight: "900",
};

const input = {
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "14px",
  fontSize: "16px",
  background: "white",
};

const textarea = {
  ...input,
  width: "100%",
  minHeight: "120px",
  fontSize: "16px",
  boxSizing: "border-box",
};

const aiButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "16px",
  padding: "12px 14px",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: "10px",
};

const aiActionRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "12px",
};

const aiSmallButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "12px",
  padding: "9px 11px",
  fontWeight: "900",
  cursor: "pointer",
};

const aiGhostButton = {
  ...aiSmallButton,
  background: "#eef2ff",
  color: "#5b3df5",
};

const aiBox = {
  background: "white",
  border: "1px solid #ddd6fe",
  color: "#312e81",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "800",
  lineHeight: 1.5,
  marginTop: "12px",
};

const photoNotice = {
  background: "white",
  border: "1px dashed #cbd5e1",
  color: "#475569",
  borderRadius: "18px",
  padding: "22px",
  textAlign: "center",
  fontWeight: "800",
};

const actionGrid = {
  display: "grid",
  gap: "10px",
};

const saveButton = {
  width: "100%",
  border: "none",
  borderRadius: "18px",
  padding: "16px",
  background: "#111827",
  color: "white",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
};

const secondaryButton = {
  ...saveButton,
  background: "#eef2ff",
  color: "#5b3df5",
};

export default CompletionSheet;
