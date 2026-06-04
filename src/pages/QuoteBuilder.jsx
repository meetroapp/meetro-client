import { useState } from "react";
import BottomNav from "../components/BottomNav";
import { updateRequestById, appendTimelineEvent } from "../utils/workflowTimeline";
import { getLanguage } from "../utils/language";

function QuoteBuilder({ setPage }) {
  const language = getLanguage();
  const isSpanish = language === "es";

  const revisedQuoteContext = JSON.parse(
    localStorage.getItem("meetroRevisedQuoteContext") || "null"
  );

  const isRevisedQuoteFlow =
    revisedQuoteContext?.source === "workflow_change_request";

  const selectedWorkCenterRequest = JSON.parse(
    localStorage.getItem("selectedWorkCenterRequest") || "null"
  );

  const selectedQuoteRequest = JSON.parse(
    localStorage.getItem("selectedQuoteRequest") || "null"
  );

  const activeQuoteRequestId =
    localStorage.getItem("activeWorkCenterQuoteRequestId") || "";

  const workCenterRequestId =
    selectedWorkCenterRequest?.requestId ||
    selectedWorkCenterRequest?.id ||
    "";

  const request = isRevisedQuoteFlow
    ? {
        requestId: revisedQuoteContext?.requestId || "",
        title: revisedQuoteContext?.projectTitle || "Project",
        description: revisedQuoteContext?.projectDescription || "",
        homeownerName: revisedQuoteContext?.homeownerName || "Homeowner",
      }
    : activeQuoteRequestId &&
      String(workCenterRequestId) === String(activeQuoteRequestId)
    ? selectedWorkCenterRequest
    : selectedQuoteRequest || selectedWorkCenterRequest || {};

  const requestId =
    request.requestId ||
    request.id ||
    activeQuoteRequestId ||
    String(Date.now());

  const [labor, setLabor] = useState("");
  const [materials, setMaterials] = useState("");
  const [timeline, setTimeline] = useState("");
  const [notes, setNotes] = useState("");
  const calculatedTotal = Number(labor || 0) + Number(materials || 0);

  const projectTitle =
    request.title || request.project_title || request.category || "Project";

  const projectDescription =
    request.description || request.project_description || "No description added.";

  function generateAiDraft() {
    const estimatedLabor = labor || "250";
    const estimatedMaterials = materials || "75";

    setLabor(estimatedLabor);
    setMaterials(estimatedMaterials);
    setTimeline(timeline || "1–2 days");
    setNotes(
      isSpanish
        ? "Cotización generada según la descripción del cliente. Incluye mano de obra, materiales básicos y tiempo estimado. Precio sujeto a cambios si se descubre trabajo adicional."
        : "Quote generated based on the customer request. Includes labor, basic materials, and estimated timeline. Price may change if additional work is discovered."
    );
    // Total is calculated automatically from labor + materials.
  }

  function sendQuote() {
    const amount = calculatedTotal;

    if (!amount || amount <= 0) {
      alert(isSpanish ? "Agrega mano de obra o materiales." : "Add labor or materials.");
      return;
    }

    const quote = {
      quoteId: `quote-${Date.now()}`,
      requestId,
      projectTitle,
      homeownerName: request.homeownerName || request.homeowner_email || "Homeowner",
      businessName: localStorage.getItem("businessName") || "Business",
      amount,
      labor: Number(labor || 0),
      materials: Number(materials || 0),
      timeline,
      notes,
      status: "sent",
      createdAt: new Date().toISOString(),
    };

    const history = JSON.parse(
      localStorage.getItem("workCenterQuoteHistory") || "[]"
    );

    localStorage.setItem(
      "workCenterQuoteHistory",
      JSON.stringify([quote, ...history])
    );

    updateRequestById(
      requestId,
      (item) => {
        const existingQuotes =
          Array.isArray(item.quotesReceived)
            ? item.quotesReceived
            : [];

        return appendTimelineEvent(
          {
            ...item,
            status: "quoted",
            quotesReceived: [
              quote,
              ...existingQuotes,
            ],
            lastQuoteAt:
              new Date().toISOString(),
          },
          {
            type: "quoteReceived",
            label:
              `Quote received from ${quote.businessName || "Business"}`,
            createdAt:
              new Date().toISOString(),
            quoteId:
              quote.quoteId || "",
            amount:
              quote.amount || "",
            businessName:
              quote.businessName || "",
          }
        );
      },
      request.title || request.project_title || ""
    );


    if (
      isRevisedQuoteFlow &&
      revisedQuoteContext?.conversationId
    ) {
      const workflowConversationKey =
        `meetro_conversation_${revisedQuoteContext.conversationId}`;

      const existingConversation = JSON.parse(
        localStorage.getItem(workflowConversationKey) || "[]"
      );

      const workflowQuoteCard = {
        id: `workflow-quote-${Date.now()}`,
        type: "workflow_revised_quote",
        role: "business",
        sender: quote.businessName || "Business",
        text: notes ||
          (isSpanish
            ? "Cotización revisada enviada."
            : "Revised quote submitted."),
        projectTitle,
        requestId,
        amount,
        labor: Number(labor || 0),
        materials: Number(materials || 0),
        timeline,
        notes,
        status: "quote_sent",
        createdAt: new Date().toISOString(),
        time: new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      };

      localStorage.setItem(
        workflowConversationKey,
        JSON.stringify([
          ...existingConversation,
          workflowQuoteCard
        ])
      );

      localStorage.setItem(
        "activeConversationId",
        revisedQuoteContext.conversationId
      );

      localStorage.setItem(
        "conversationReturnPage",
        "conversationThread"
      );

      localStorage.removeItem(
        "meetroRevisedQuoteContext"
      );
    }

    localStorage.setItem(
      "meetroGlobalToast",
      JSON.stringify({
        type: "success",
        message: isRevisedQuoteFlow
          ? isSpanish
            ? "Cotización revisada enviada al cliente."
            : "Revised quote sent to customer."
          : isSpanish
          ? "Cotización enviada al cliente."
          : "Quote sent to customer."
      })
    );

    window.dispatchEvent(
      new Event("meetro-global-toast")
    );

    localStorage.setItem("activeWorkCenterTab", "quotes");

    if (isRevisedQuoteFlow) {
      setPage("conversationThread");
    } else {
      setPage("contractorDashboard");
    }
  }

  return (
    <div style={page}>
      <button
        style={backButton}
        onClick={() =>
          setPage(isRevisedQuoteFlow ? "conversationThread" : "businessLeads")
        }
      >
        ←{" "}
        {isRevisedQuoteFlow
          ? isSpanish
            ? "Volver al chat"
            : "Back to Chat"
          : isSpanish
          ? "Volver a clientes"
          : "Back to Leads"}
      </button>

      <div style={hero}>
        {isRevisedQuoteFlow && (
          <div style={revisionBanner}>
            🔁{" "}
            {isSpanish
              ? "Cotización revisada solicitada por cambio del proyecto"
              : "Revised quote requested from project change"}
          </div>
        )}

        <p style={eyebrow}>{isSpanish ? "Constructor de Cotización" : "Quote Builder"}</p>
        <h1 style={title}>{projectTitle}</h1>
        <p style={subtitle}>{projectDescription}</p>
      </div>

      <div style={grid}>
        <div style={card}>
          <h2 style={sectionTitle}>{isSpanish ? "Solicitud del Cliente" : "Customer Request"}</h2>

          <p style={label}>{isSpanish ? "Ubicación" : "Location"}</p>
          <p style={value}>{request.location || "Location pending"}</p>

          <p style={label}>{isSpanish ? "Detalles" : "Details"}</p>
          <p style={value}>{projectDescription}</p>
        </div>

        <div style={card}>
          <h2 style={sectionTitle}>{isSpanish ? "Crear Cotización" : "Build Quote"}</h2>

          <button style={aiButton} onClick={generateAiDraft}>
            🤖 {isSpanish ? "Generar con IA" : "Generate with AI"}
          </button>

          <label style={label}>{isSpanish ? "Mano de obra" : "Labor"}</label>
          <input style={input} value={labor} onChange={(e) => setLabor(e.target.value)} placeholder="250" />

          <label style={label}>{isSpanish ? "Materiales" : "Materials"}</label>
          <input style={input} value={materials} onChange={(e) => setMaterials(e.target.value)} placeholder="75" />

          <label style={label}>{isSpanish ? "Tiempo estimado" : "Estimated Timeline"}</label>
          <input style={input} value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="1–2 days" />

          <label style={label}>{isSpanish ? "Notas" : "Notes"}</label>
          <textarea style={textarea} value={notes} onChange={(e) => setNotes(e.target.value)} />

          <label style={label}>{isSpanish ? "Total" : "Total"}</label>
          <input
            style={{ ...input, background: "#f8f7ff", fontWeight: "900" }}
            value={calculatedTotal ? `$${calculatedTotal.toFixed(2)}` : "$0.00"}
            readOnly
            placeholder="$0.00"
          />

          <button style={sendButton} onClick={sendQuote}>
            {isRevisedQuoteFlow
              ? isSpanish
                ? "Enviar Cotización Revisada"
                : "Send Revised Quote"
              : isSpanish
              ? "Enviar Cotización al Cliente"
              : "Send Quote to Customer"}
          </button>
        </div>
      </div>

      <BottomNav setPage={setPage} currentPage="businessLeads" />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg,#f8fafc,#eef2ff)",
  padding: "24px 18px 140px",
  boxSizing: "border-box",
};

const backButton = {
  border: "none",
  background: "white",
  color: "#5b3df5",
  padding: "12px 16px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
  marginBottom: "18px",
};

const hero = {
  background: "linear-gradient(135deg,#111b46,#5b3df5)",
  color: "white",
  borderRadius: "30px",
  padding: "26px",
  marginBottom: "18px",
};

const revisionBanner = {
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.25)",
  padding: "12px 14px",
  borderRadius: "14px",
  marginBottom: "16px",
  fontWeight: "800",
  fontSize: "14px",
  backdropFilter: "blur(8px)",
};

const eyebrow = { margin: 0, fontWeight: "900", opacity: 0.9 };
const title = { margin: "10px 0", fontSize: "34px" };
const subtitle = { margin: 0, lineHeight: 1.5, opacity: 0.95 };

const grid = {
  display: "grid",
  gap: "18px",
};

const card = {
  background: "white",
  borderRadius: "26px",
  padding: "22px",
  boxShadow: "0 14px 34px rgba(15,23,42,0.07)",
};

const sectionTitle = {
  marginTop: 0,
  color: "#111827",
};

const label = {
  display: "block",
  marginTop: "12px",
  marginBottom: "6px",
  color: "#111827",
  fontWeight: "900",
};

const value = {
  color: "#64748b",
  fontWeight: "700",
  lineHeight: 1.5,
};

const input = {
  width: "100%",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #dbeafe",
  fontSize: "16px",
  boxSizing: "border-box",
};

const textarea = {
  ...input,
  minHeight: "110px",
  resize: "vertical",
};

const aiButton = {
  width: "100%",
  border: "none",
  background: "#eef2ff",
  color: "#5b3df5",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
  cursor: "pointer",
  marginBottom: "10px",
};

const sendButton = {
  width: "100%",
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "16px",
  padding: "15px",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: "16px",
};

export default QuoteBuilder;
