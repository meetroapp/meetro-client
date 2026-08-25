import { normalizeCanonicalConversationId } from "./canonicalConversationMessaging.js";
import {
  HOMEOWNER_CONVERSATION_ENTRY_ACTIONS,
  resolveHomeownerConversationEntry,
} from "./homeownerConversationEntry.js";

export const REQUEST_PRESENTATION_STATES = Object.freeze({
  REQUEST_SUBMITTED: "request_submitted",
  RESPONSE_RECEIVED: "response_received",
  SELECTION_CONFIRMATION_PENDING: "selection_confirmation_pending",
  PROFESSIONAL_SELECTED: "professional_selected",
});

const COPY = Object.freeze({
  en: {
    submittedStatus: "Request submitted",
    submittedAction: "Waiting for professional responses",
    submittedGuidance: "Your request has been received. Matching professionals can review it.",
    submittedCta: "View Request",
    responseStatus: "Professional response received",
    responseAction: "Review response",
    responseGuidance: "A professional responded to your request. Review the response and choose whether to continue with them.",
    responseCta: "Review Response",
    confirmStatus: "Confirm professional",
    confirmAction: "Confirm selection",
    confirmGuidance: "Confirm this professional to activate the relationship and open your conversation.",
    confirmCta: "Confirm Selection",
    selectedStatus: "Professional selected",
    selectedAction: "Continue conversation",
    selectedGuidance: (name) => `You’re connected with ${name || "your professional"}. Continue the conversation to coordinate the next step.`,
    selectedCta: "Continue Conversation",
  },
  es: {
    submittedStatus: "Solicitud enviada",
    submittedAction: "Esperando respuestas profesionales",
    submittedGuidance: "Recibimos tu solicitud. Los profesionales compatibles pueden revisarla.",
    submittedCta: "Ver Solicitud",
    responseStatus: "Respuesta profesional recibida",
    responseAction: "Revisar respuesta",
    responseGuidance: "Un profesional respondió a tu solicitud. Revisa la respuesta y decide si deseas continuar.",
    responseCta: "Revisar Respuesta",
    confirmStatus: "Confirmar profesional",
    confirmAction: "Confirmar selección",
    confirmGuidance: "Confirma este profesional para activar la relación y abrir la conversación.",
    confirmCta: "Confirmar Selección",
    selectedStatus: "Profesional seleccionado",
    selectedAction: "Continuar conversación",
    selectedGuidance: (name) => `Estás conectado con ${name || "tu profesional"}. Continúa la conversación para coordinar el siguiente paso.`,
    selectedCta: "Continuar Conversación",
  },
  fr: {
    submittedStatus: "Demande envoyée",
    submittedAction: "En attente de réponses professionnelles",
    submittedGuidance: "Votre demande a été reçue. Les professionnels correspondants peuvent l’examiner.",
    submittedCta: "Voir la demande",
    responseStatus: "Réponse professionnelle reçue",
    responseAction: "Examiner la réponse",
    responseGuidance: "Un professionnel a répondu à votre demande. Examinez la réponse et décidez si vous souhaitez continuer avec lui.",
    responseCta: "Examiner la réponse",
    confirmStatus: "Confirmer le professionnel",
    confirmAction: "Confirmer la sélection",
    confirmGuidance: "Confirmez ce professionnel pour activer la relation et ouvrir votre conversation.",
    confirmCta: "Confirmer la sélection",
    selectedStatus: "Professionnel sélectionné",
    selectedAction: "Continuer la conversation",
    selectedGuidance: (name) => `Vous êtes en contact avec ${name || "votre professionnel"}. Continuez la conversation pour coordonner la prochaine étape.`,
    selectedCta: "Continuer la conversation",
  },
  "pt-BR": {
    submittedStatus: "Solicitação enviada",
    submittedAction: "Aguardando respostas profissionais",
    submittedGuidance: "Sua solicitação foi recebida. Profissionais compatíveis podem analisá-la.",
    submittedCta: "Ver solicitação",
    responseStatus: "Resposta profissional recebida",
    responseAction: "Revisar resposta",
    responseGuidance: "Um profissional respondeu à sua solicitação. Revise a resposta e decida se deseja continuar.",
    responseCta: "Revisar resposta",
    confirmStatus: "Confirmar profissional",
    confirmAction: "Confirmar seleção",
    confirmGuidance: "Confirme este profissional para ativar o relacionamento e abrir a conversa.",
    confirmCta: "Confirmar seleção",
    selectedStatus: "Profissional selecionado",
    selectedAction: "Continuar conversa",
    selectedGuidance: (name) => `Você está conectado com ${name || "seu profissional"}. Continue a conversa para coordenar a próxima etapa.`,
    selectedCta: "Continuar conversa",
  },
});

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function copyFor(language) {
  return COPY[language] || COPY.en;
}

function requestIdentity(request = {}) {
  return normalizeCanonicalConversationId(request.requestId ?? request.id);
}

function responsesForRequest(responses = [], requestId) {
  return Array.isArray(responses)
    ? responses.filter(
        (response) =>
          normalizeCanonicalConversationId(response?.requestId) === requestId
      )
    : [];
}

export function isRequestPresentationLifecycleApplicable(request = {}) {
  const status = text(request.status).toLowerCase();
  const requestStage = ["", "open", "pending", "submitted", "requested"].includes(status);
  const laterAuthorityVisible = Boolean(
    request.acceptedQuote ||
      request.paymentStatus ||
      request.scheduledAt ||
      request.appointmentDate ||
      request.completionRecord ||
      request.completedAt ||
      request.closedAt ||
      (Array.isArray(request.quotesReceived) && request.quotesReceived.length > 0)
  );
  return requestStage && !laterAuthorityVisible;
}

export function deriveRequestPresentationState({
  request = {},
  responses = [],
  conversations = [],
  confirmationResponseId = null,
  language = "en",
} = {}) {
  const labels = copyFor(language);
  const applicable = isRequestPresentationLifecycleApplicable(request);
  const requestId = requestIdentity(request);
  const requestResponses = responsesForRequest(responses, requestId);
  const selectedResponse = requestResponses.find((response) => response?.selected === true) || null;
  const pendingResponses = requestResponses.filter((response) => response?.unresolved === true);
  const conversationEntry = resolveHomeownerConversationEntry({
    request,
    canonicalConversations: conversations,
  });
  const hasConversation =
    conversationEntry.action === HOMEOWNER_CONVERSATION_ENTRY_ACTIONS.CONVERSATION;
  const conversationBusinessName =
    text(conversationEntry.conversation?.businessName) ||
    text(conversationEntry.conversation?.business_name);
  const businessName = conversationBusinessName || text(selectedResponse?.businessName);

  if (hasConversation) {
    return {
      key: REQUEST_PRESENTATION_STATES.PROFESSIONAL_SELECTED,
      applicable,
      requestId,
      statusLabel: labels.selectedStatus,
      nextActionLabel: labels.selectedAction,
      guidance: labels.selectedGuidance(businessName),
      ctaLabel: labels.selectedCta,
      businessName,
      responseCount: requestResponses.length,
      attentionCount: 0,
      conversationId: conversationEntry.conversationId,
      conversationEntry,
      canOpenConversation: true,
      shouldReviewResponse: false,
    };
  }

  const normalizedConfirmationId = String(confirmationResponseId ?? "").trim();
  const confirmationResponse = normalizedConfirmationId
    ? pendingResponses.find(
        (response) => response.responseId === normalizedConfirmationId
      )
    : null;

  if (confirmationResponse) {
    return {
      key: REQUEST_PRESENTATION_STATES.SELECTION_CONFIRMATION_PENDING,
      applicable,
      requestId,
      statusLabel: labels.confirmStatus,
      nextActionLabel: labels.confirmAction,
      guidance: labels.confirmGuidance,
      ctaLabel: labels.confirmCta,
      businessName: text(confirmationResponse.businessName),
      responseCount: requestResponses.length,
      attentionCount: pendingResponses.length,
      conversationId: null,
      conversationEntry,
      canOpenConversation: false,
      shouldReviewResponse: true,
    };
  }

  if (pendingResponses.length > 0) {
    return {
      key: REQUEST_PRESENTATION_STATES.RESPONSE_RECEIVED,
      applicable,
      requestId,
      statusLabel: labels.responseStatus,
      nextActionLabel: labels.responseAction,
      guidance: labels.responseGuidance,
      ctaLabel: labels.responseCta,
      businessName: text(pendingResponses[0]?.businessName),
      responseCount: requestResponses.length,
      attentionCount: pendingResponses.length,
      conversationId: null,
      conversationEntry,
      canOpenConversation: false,
      shouldReviewResponse: true,
    };
  }

  return {
    key: REQUEST_PRESENTATION_STATES.REQUEST_SUBMITTED,
    applicable,
    requestId,
    statusLabel: labels.submittedStatus,
    nextActionLabel: labels.submittedAction,
    guidance: labels.submittedGuidance,
    ctaLabel: labels.submittedCta,
    businessName: "",
    responseCount: requestResponses.length,
    attentionCount: 0,
    conversationId: null,
    conversationEntry,
    canOpenConversation: false,
    shouldReviewResponse: false,
  };
}
