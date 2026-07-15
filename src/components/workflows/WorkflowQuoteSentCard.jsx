import { getProjectIdentity } from "../../utils/projectIdentity";
import { linkQuoteToProject } from "../../utils/workflowCommands";
import {
  getQuoteLinkIdentityWarnings,
  getQuoteLinkReconciliationReport,
} from "../../utils/workCenterSelectors";
import { addNotification } from "../../utils/notifications";
import { createNotification } from "../../utils/meetroNotifications";
import { markConversationUnreadForRecipient } from "../../utils/conversationUnread";
import { saveActiveWorkSnapshot, saveActiveJobSnapshot } from "../../utils/workCenter";
import { appendTimelineEvent, updateRequestById } from "../../utils/workflowTimeline";
import MeetroIcon from "../MeetroIcon";
import { formatMessageTime } from "../../utils/displayTime";
import { t } from "../../utils/language";
import UniversalDocumentCard from "../documents/UniversalDocumentCard";
import { canReadLegacyWorkflowStorage } from "../../utils/clientWorkflowStoragePolicy";

function WorkflowQuoteSentCard({
  msg,
  language,
  currentViewerRole,
  conversation,
  setMessages,
  setMessageText,
  reviewProjectAction,
}) {
  const isCustomer =
    currentViewerRole === "homeowner" ||
    currentViewerRole === "customer" ||
    currentViewerRole === "standard";

  const quoteId = msg.quoteId || msg.id;
  const conversationId = msg.conversationId || conversation?.id || "";
  const requestId = msg.requestId || conversation?.requestId || "";

  function getSavedQuotes() {
    if (!canReadLegacyWorkflowStorage()) return [];
    try {
      const quotes = JSON.parse(
        localStorage.getItem("workCenterQuoteHistory") ||
          localStorage.getItem("meetroQuoteHistory") ||
          localStorage.getItem("quoteHistory") ||
          "[]"
      );

      return Array.isArray(quotes) ? quotes : [];
    } catch {
      return [];
    }
  }

  function writeQuoteHistories(quotes) {
    if (!canReadLegacyWorkflowStorage()) return;
    localStorage.setItem("workCenterQuoteHistory", JSON.stringify(quotes));
    localStorage.setItem("meetroQuoteHistory", JSON.stringify(quotes));
    localStorage.setItem("quoteHistory", JSON.stringify(quotes));
  }

  function updateQuoteStatus(nextStatus) {
    const now = new Date().toISOString();

    const savedQuotes = getSavedQuotes();

    let matchedQuote = null;
    const updatedQuotes = savedQuotes.map((quote) => {
      if (String(quote.quoteId) !== String(quoteId)) return quote;

      const updatedQuote = {
        ...quote,
        status: nextStatus,
        quoteStatus: nextStatus,
        workflowStage: nextStatus === "accepted" ? "approved" : quote.workflowStage,
        nextAction: nextStatus === "accepted" ? "move_to_active" : quote.nextAction,
        acceptedBy: nextStatus === "accepted" ? "customer" : quote.acceptedBy,
        conversationId: quote.conversationId || conversationId,
        requestId: quote.requestId || requestId,
        quoteId: quote.quoteId || quoteId,
        updatedAt: now,
      };

      if (nextStatus === "accepted") updatedQuote.acceptedAt = quote.acceptedAt || now;
      if (nextStatus === "revision_requested") updatedQuote.revisionRequestedAt = quote.revisionRequestedAt || now;
      if (nextStatus === "declined") updatedQuote.declinedAt = quote.declinedAt || now;

      matchedQuote = updatedQuote;
      return updatedQuote;
    });

    if (!matchedQuote) {
      matchedQuote = {
        ...msg.quotePayload,
        ...msg,
        quoteId,
        requestId,
        conversationId,
        amount: msg.amount || msg.total || 0,
        total: msg.total || msg.amount || 0,
        status: nextStatus,
        quoteStatus: nextStatus,
        workflowStage: nextStatus === "accepted" ? "approved" : msg.workflowStage,
        nextAction: nextStatus === "accepted" ? "move_to_active" : msg.nextAction,
        acceptedBy: nextStatus === "accepted" ? "customer" : msg.acceptedBy,
        updatedAt: now,
      };

      if (nextStatus === "accepted") matchedQuote.acceptedAt = now;
      if (nextStatus === "revision_requested") matchedQuote.revisionRequestedAt = now;
      if (nextStatus === "declined") matchedQuote.declinedAt = now;

      updatedQuotes.unshift(matchedQuote);
    }

    writeQuoteHistories(updatedQuotes);

    try {
      const matchedQuoteForLink = updatedQuotes.find(
        (quote) => String(quote.quoteId) === String(quoteId)
      );
      const identityRecord = matchedQuoteForLink || msg;
      const identity = getProjectIdentity({
        projectId: identityRecord?.projectId,
        requestId: identityRecord?.requestId,
        title:
          identityRecord?.projectTitle ||
          identityRecord?.title ||
          msg?.projectTitle,
      });

      if (!identity.projectId) {
        console.warn("Work Center shadow quote decision link skipped.", {
          quoteId: quoteId || "",
          action: nextStatus,
          warnings: identity.warnings,
        });
      } else {
        const shadowResult = linkQuoteToProject({
          projectId: identity.projectId,
          quoteRequestId: identityRecord?.requestId || "",
          quoteId: quoteId || "",
          metadata: {
            action: nextStatus,
            source: "workflow-quote-card",
          },
        });

        if (!shadowResult.ok || shadowResult.warnings.length > 0) {
          console.warn(
            "Work Center shadow quote decision link warning.",
            shadowResult
          );
        }

        if (shadowResult.ok && import.meta.env.DEV) {
          try {
            const reconciliation = getQuoteLinkReconciliationReport();
            const identityWarnings = getQuoteLinkIdentityWarnings();
            const commonIdentityWarnings = Object.entries(
              identityWarnings.reasonCounts
            )
              .sort(([, firstCount], [, secondCount]) =>
                secondCount - firstCount
              )
              .slice(0, 5)
              .map(([code, count]) => ({ code, count }));

            console.info("Work Center quote link reconciliation.", {
              quoteCount: reconciliation.quoteCount,
              uniqueLinkedQuoteCount: reconciliation.uniqueLinkedQuoteCount,
              missingLinkCount: reconciliation.missingLinkCount,
              safeIdentityMissingLinkCount:
                reconciliation.safeIdentityMissingLinkCount,
              coveragePercentage: reconciliation.coveragePercentage,
              commonIdentityWarnings,
            });
          } catch (error) {
            console.warn(
              "Work Center quote reconciliation logging failed.",
              error
            );
          }
        }
      }
    } catch (error) {
      console.warn("Work Center shadow quote decision link failed.", error);
    }

    window.dispatchEvent(new Event("meetroQuoteLifecycleUpdated"));

    return matchedQuote || updatedQuotes.find((quote) => String(quote.quoteId) === String(quoteId));
  }

  function updateMessageStatus(nextStatus) {
    const now = new Date().toISOString();
    const updateMessage = (message) =>
      message.id === msg.id
        ? {
            ...message,
            status: nextStatus,
            quoteStatus: nextStatus,
            workflowStage: nextStatus === "accepted" ? "approved" : message.workflowStage,
            nextAction: nextStatus === "accepted" ? "move_to_active" : message.nextAction,
            acceptedBy: nextStatus === "accepted" ? "customer" : message.acceptedBy,
            acceptedAt: nextStatus === "accepted" ? message.acceptedAt || now : message.acceptedAt,
            decisionAt: now,
          }
        : message;

    setMessages((previousMessages) => previousMessages.map(updateMessage));

    if (conversationId) {
      try {
        const storageKey = `meetro_conversation_${conversationId}`;
        const storedMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");
        if (Array.isArray(storedMessages)) {
          localStorage.setItem(
            storageKey,
            JSON.stringify(storedMessages.map(updateMessage))
          );
        }
      } catch {}
    }
  }

  function appendApprovalConfirmation(acceptedQuote) {
    if (!conversationId) return;

    const storageKey = `meetro_conversation_${conversationId}`;
    const confirmationId = `quote-approved-${quoteId}`;
    const confirmationMessage = {
      id: confirmationId,
      type: "update",
      workflowType: "quote_approved",
      sender: "system",
      senderRole: "system",
      role: "system",
      conversationId,
      requestId,
      quoteId,
      title: language === "es" ? "Cotización aprobada" : "Quote approved",
      text:
        language === "es"
          ? "Cotización aprobada. El profesional ahora puede mover este trabajo a Trabajo Activo."
          : "Quote approved. The professional can now move this job into Active Work.",
      status: "accepted",
      quoteStatus: "accepted",
      source: "quote_workflow",
      deliveryMethod: "meetro_chat",
      amount: acceptedQuote?.amount || msg.amount || msg.total || 0,
      createdAt: new Date().toISOString(),
      time: formatMessageTime(new Date()),
    };

    try {
      const storedMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const existingMessages = Array.isArray(storedMessages) ? storedMessages : [];

      if (!existingMessages.some((message) => message.id === confirmationId)) {
        localStorage.setItem(
          storageKey,
          JSON.stringify([...existingMessages, confirmationMessage])
        );
        setMessages((previousMessages) =>
          previousMessages.some((message) => message.id === confirmationId)
            ? previousMessages
            : [...previousMessages, confirmationMessage]
        );
      }
    } catch {}
  }

  function updateRequestApproval(acceptedQuote) {
    const now = new Date().toISOString();
    const quoteForRequest = {
      ...msg,
      ...acceptedQuote,
      quoteId,
      requestId,
      conversationId,
      status: "accepted",
      quoteStatus: "accepted",
      workflowStage: "approved",
      nextAction: "move_to_active",
      acceptedAt: acceptedQuote?.acceptedAt || now,
      acceptedBy: "customer",
    };

    updateRequestById(
      requestId,
      (request) => {
        const quotesReceived = Array.isArray(request.quotesReceived)
          ? request.quotesReceived
          : [];
        const hasQuote = quotesReceived.some(
          (quote) => String(quote.quoteId) === String(quoteId)
        );
        const updatedQuotes = hasQuote
          ? quotesReceived.map((quote) =>
              String(quote.quoteId) === String(quoteId)
                ? { ...quote, ...quoteForRequest }
                : quote
            )
          : [quoteForRequest, ...quotesReceived];

        return appendTimelineEvent(
          {
            ...request,
            status: "accepted",
            workflowStage: "approved",
            nextAction: "move_to_active",
            acceptedQuote: quoteForRequest,
            acceptedAt: quoteForRequest.acceptedAt,
            acceptedBy: "customer",
            conversationId: request.conversationId || conversationId,
            quotesReceived: updatedQuotes,
          },
          {
            type: "quoteAccepted",
            label: `Quote accepted from ${quoteForRequest.businessName || "Business"}`,
            createdAt: now,
            quoteId,
            requestId,
            conversationId,
            amount: quoteForRequest.amount || quoteForRequest.total || "",
            businessName: quoteForRequest.businessName || "",
          }
        );
      },
      msg.projectTitle || msg.title || conversation?.projectTitle || ""
    );
  }

  function stageAcceptedQuoteForActiveWork(acceptedQuote) {
    const service =
      acceptedQuote?.projectTitle ||
      acceptedQuote?.serviceTitle ||
      msg.projectTitle ||
      msg.title ||
      conversation?.projectTitle ||
      "Approved Quote";
    const location = acceptedQuote?.location || msg.location || "";

    saveActiveWorkSnapshot({
      requestId: requestId || acceptedQuote?.requestId || quoteId,
      quoteId,
      conversationId,
      status: "accepted",
      stage: "approved",
      service,
      location,
      type: "quote_approved",
      source: "quote_acceptance",
    });

    saveActiveJobSnapshot({
      id: quoteId,
      jobId: quoteId,
      conversationId,
      service,
      location,
      status: "accepted",
      customer: acceptedQuote?.homeownerName || acceptedQuote?.customerName || msg.customerName || "Customer",
    });
  }

  function publishApprovalEvents(acceptedQuote) {
    addNotification({
      type: "quote_accepted",
      title:
        language === "es"
          ? "El cliente aceptó esta cotización"
          : "Customer accepted this quote",
      message:
        language === "es"
          ? "La cotización fue aceptada. Puedes mover el trabajo a Trabajo Activo."
          : "The quote was accepted. You can move this job into Active Work.",
      priority: "high",
      targetRole: "professional",
      requestId,
      quoteId,
    });

    createNotification({
      type: "quote_accepted",
      title:
        language === "es"
          ? "El cliente aceptó esta cotización"
          : "Customer accepted this quote",
      message:
        language === "es"
          ? "La cotización fue aceptada. Puedes mover el trabajo a Trabajo Activo."
          : "The quote was accepted. You can move this job into Active Work.",
      role: "professional",
      requestId,
      conversationId,
      quoteId,
      dedupeKey: `quote_accepted:${quoteId}`,
    });

    if (conversationId) {
      markConversationUnreadForRecipient(conversationId, "homeowner", {
        id: conversationId,
        project_title: msg.projectTitle || msg.title || "Quote approved",
        project_description:
          language === "es"
            ? "Cotización aprobada por el cliente."
            : "Quote approved by the customer.",
        homeowner_email: acceptedQuote?.homeownerName || acceptedQuote?.customerName || "Customer",
        status: language === "es" ? "Cotización aprobada" : "Quote approved",
        conversation_type: "standard",
      });
    }

    window.dispatchEvent(new Event("meetroQuoteLifecycleUpdated"));
    window.dispatchEvent(new Event("meetro-workcenter-updated"));
    window.dispatchEvent(new Event("meetro-active-work-updated"));
    window.dispatchEvent(new Event("meetro-messages-updated"));
    window.dispatchEvent(new Event("storage"));
  }

  function acceptQuote(event) {
    event.stopPropagation();
    const acceptedQuote = updateQuoteStatus("accepted") || {
      ...msg,
      quoteId,
      requestId,
      conversationId,
      amount: msg.amount || msg.total || 0,
      acceptedAt: new Date().toISOString(),
    };
    updateMessageStatus("accepted");
    updateRequestApproval(acceptedQuote);
    stageAcceptedQuoteForActiveWork(acceptedQuote);
    appendApprovalConfirmation(acceptedQuote);
    publishApprovalEvents(acceptedQuote);
  }

  function requestRevision(event) {
    event.stopPropagation();
    updateQuoteStatus("revision_requested");
    updateMessageStatus("revision_requested");

    createNotification({
      type: "quote_revision_requested",
      title:
        language === "es"
          ? "Cliente pidió cambios"
          : "Customer requested quote changes",
      message:
        language === "es"
          ? "El cliente pidió revisar la cotización."
          : "The customer requested changes to the quote.",
      role: "professional",
      requestId,
      conversationId,
      quoteId,
      dedupeKey: `quote_revision_requested:${quoteId}`,
    });

    if (setMessageText) {
      setMessageText(
        language === "es"
          ? "Quiero solicitar un cambio en esta cotización: "
          : "I would like to request a change to this quote: "
      );
    }
  }

  function declineQuote(event) {
    event.stopPropagation();
    updateQuoteStatus("declined");
    updateMessageStatus("declined");
  }

  const status = msg.quoteStatus || msg.status || "sent";
  const amount = Number(msg.amount || msg.total || 0);
  const documentStatus =
    status === "accepted" || status === "approved"
      ? t("documentStatusApproved", language)
      : status === "revision_requested" || status === "change_requested"
      ? t("documentStatusRevisionRequested", language)
      : status === "declined"
      ? t("documentStatusDeclined", language)
      : t("documentStatusAwaitingApproval", language);
  const documentTitle =
    msg.projectTitle || msg.title || conversation?.projectTitle || t("documentQuote", language);

  return (
    <UniversalDocumentCard
      documentType="quote"
      projectTitle={documentTitle}
      amount={msg.total || msg.amount || msg.quoteAmount || ""}
      status={documentStatus}
      language={language}
      icon="quote"
      reviewProjectAction={() =>
        reviewProjectAction?.({
          ...msg,
          title: documentTitle,
          projectTitle: documentTitle,
          total: msg.total || msg.amount || msg.quoteAmount || "",
          status: documentStatus,
          type: "quote",
        })
      }
    />
  );

  const labor = Number(msg.labor || 0);
  const materials = Number(msg.materials || 0);
  const needsReviewLabel = language === "es" ? "Requiere revisión" : "Needs review";
  const formatQuoteAmount = (value) => {
    const numericValue = Number(value || 0);
    return numericValue > 0 ? `$${numericValue.toFixed(2)}` : needsReviewLabel;
  };
  const quoteDescription =
    String(msg.description || msg.projectDescription || msg.text || "").trim() ||
    (language === "es"
      ? "Revisa los detalles de la cotización antes de tomar una decisión."
      : "Review the quote details before making a decision.");
  const quoteNotesText = String(msg.notes || msg.terms || "").trim();
  const normalizeQuoteText = (value) =>
    String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  const showQuoteNotes =
    quoteNotesText &&
    normalizeQuoteText(quoteNotesText) !== normalizeQuoteText(quoteDescription);

  return (
    <div
      style={{
        ...quoteCard,
        ...(status === "accepted" ? quoteCardAccepted : {}),
      }}
    >
      <div style={quoteHeader}>
        <div>
          <p style={quoteEyebrow}>
            {language === "es" ? "Cotización recibida" : "Quote Received"}
          </p>

          <h3 style={quoteTitle}>
            {msg.projectTitle || (language === "es" ? "Proyecto" : "Project")}
          </h3>

          <span style={quoteNumber}>
            #{msg.quoteNumber || "—"}
          </span>
        </div>

        <div style={quoteAmount}>
          {formatQuoteAmount(amount)}
        </div>
      </div>

      <p style={quoteText}>
        {quoteDescription}
      </p>

      <div style={quoteBreakdown}>
        <div style={quoteRow}>
          <span>{language === "es" ? "Mano de obra" : "Labor"}</span>
          <strong>{formatQuoteAmount(labor)}</strong>
        </div>

        <div style={quoteRow}>
          <span>{language === "es" ? "Materiales" : "Materials"}</span>
          <strong>{formatQuoteAmount(materials)}</strong>
        </div>

        <div style={quoteRow}>
          <span>{language === "es" ? "Tiempo estimado" : "Timeline"}</span>
          <strong>{msg.timeline || (language === "es" ? "Pendiente" : "Pending")}</strong>
        </div>
      </div>

      {showQuoteNotes && <p style={quoteNotes}>{quoteNotesText}</p>}

      {status === "accepted" && (
        <div style={acceptedNotice}>
          <MeetroIcon name="completion" size={16} decorative /> {language === "es"
            ? "Cotización aceptada. Ahora puedes coordinar el trabajo aprobado con el profesional."
            : "Quote accepted. You can now coordinate the approved work with the professional."}
        </div>
      )}

      {status === "revision_requested" && (
        <div style={revisionNotice}>
          <MeetroIcon name="editPortfolio" size={16} decorative /> {language === "es"
            ? "Cambio solicitado. Escribe los detalles en el mensaje."
            : "Revision requested. Write the details in the message."}
        </div>
      )}

      {status === "declined" && (
        <div style={declinedNotice}>
          ✕ {language === "es" ? "Cotización rechazada." : "Quote declined."}
        </div>
      )}

      {isCustomer && status === "sent" && (
        <div style={quoteActions}>
          <button type="button" onClick={acceptQuote} style={acceptButton}>
            <MeetroIcon name="completion" size={16} decorative /> {language === "es" ? "Aceptar" : "Accept Quote"}
          </button>

          <button type="button" onClick={requestRevision} style={revisionButton}>
            <MeetroIcon name="editPortfolio" size={16} decorative /> {language === "es" ? "Pedir cambio" : "Request Revision"}
          </button>

          <button type="button" onClick={declineQuote} style={declineButton}>
            ✕ {language === "es" ? "Rechazar" : "Decline"}
          </button>
        </div>
      )}

      {!isCustomer && status === "sent" && (
        <p style={waitingText}>
          {language === "es"
            ? "Esperando decisión del cliente."
            : "Waiting for customer decision."}
        </p>
      )}
    </div>
  );
}

const quoteCard = {
  background: "linear-gradient(135deg, #ffffff, #f8fafc)",
  border: "1px solid rgba(148,163,184,0.22)",
  borderRadius: "22px",
  padding: "16px",
  boxShadow: "0 14px 30px rgba(15,23,42,0.07)",
};

const quoteCardAccepted = {
  border: "1px solid rgba(34,197,94,0.45)",
  background: "linear-gradient(135deg,#ecfdf5,#ffffff)",
  boxShadow: "0 0 0 3px rgba(34,197,94,0.16), 0 18px 38px rgba(34,197,94,0.20)",
};

const quoteHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "flex-start",
};

const quoteEyebrow = {
  margin: 0,
  fontSize: "11px",
  fontWeight: 950,
  letterSpacing: "1px",
  color: "var(--meetro-color-charcoal, #172317)",
  textTransform: "uppercase",
};

const quoteTitle = {
  margin: "4px 0",
  fontSize: "18px",
  fontWeight: 950,
  color: "#0f172a",
};

const quoteNumber = {
  fontSize: "12px",
  color: "#64748b",
  fontWeight: 800,
};

const quoteAmount = {
  fontSize: "24px",
  fontWeight: 950,
  color: "#0f172a",
  whiteSpace: "nowrap",
};

const quoteText = {
  margin: "12px 0",
  color: "#475569",
  lineHeight: 1.45,
};

const quoteBreakdown = {
  display: "grid",
  gap: "8px",
  background: "#f8fafc",
  border: "1px solid rgba(148,163,184,0.20)",
  borderRadius: "16px",
  padding: "12px",
};

const quoteRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  color: "#64748b",
  fontWeight: 800,
};

const quoteNotes = {
  margin: "12px 0 0",
  color: "#334155",
  lineHeight: 1.45,
};

const quoteActions = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "9px",
  marginTop: "14px",
};

const acceptButton = {
  border: "none",
  borderRadius: "16px",
  padding: "13px",
  background: "linear-gradient(135deg, #10b981, #059669)",
  color: "#ffffff",
  fontWeight: 950,
  cursor: "pointer",
};

const revisionButton = {
  border: "1px solid rgba(249,115,22,0.28)",
  borderRadius: "16px",
  padding: "13px",
  background: "#fff7ed",
  color: "#9a3412",
  fontWeight: 950,
  cursor: "pointer",
};

const declineButton = {
  border: "1px solid rgba(239,68,68,0.26)",
  borderRadius: "16px",
  padding: "13px",
  background: "#ffffff",
  color: "#991b1b",
  fontWeight: 950,
  cursor: "pointer",
};

const acceptedNotice = {
  marginTop: "14px",
  padding: "12px",
  borderRadius: "16px",
  background: "#dcfce7",
  color: "#166534",
  fontWeight: 900,
};

const revisionNotice = {
  marginTop: "14px",
  padding: "12px",
  borderRadius: "16px",
  background: "#fff7ed",
  color: "#9a3412",
  fontWeight: 900,
};

const declinedNotice = {
  marginTop: "14px",
  padding: "12px",
  borderRadius: "16px",
  background: "#fee2e2",
  color: "#991b1b",
  fontWeight: 900,
};

const waitingText = {
  margin: "12px 0 0",
  color: "#64748b",
  fontWeight: 850,
};

export default WorkflowQuoteSentCard;
