import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { getLanguage, t } from "../utils/language";
import { getHomeownerLifecycleStage } from "../utils/homeownerLifecycle";
import { getAccountModeForPage } from "../utils/session";
import {
  getNotifications,
  getUnreadNotificationCount as getMeetroUnreadNotificationCount,
} from "../utils/meetroNotifications";
import {
  formatScheduleDisplayTime,
  parseUserScheduleTime,
} from "../utils/assistantScheduleTime";
import {
  AI_BUTTON_POSITION_DEFAULTS,
  clampAiButtonPosition,
  readStoredAiButtonPosition,
  writeStoredAiButtonPosition,
} from "../utils/aiButtonPosition";

const NativeSpeechRecognition = registerPlugin("SpeechRecognition");

function stopNativeSpeechRecognitionQuietly() {
  try {
    const stopResult = NativeSpeechRecognition.stop?.();
    stopResult?.catch?.(() => {});
    return stopResult;
  } catch {
    return null;
  }
}

const VOICE_PREFERENCE_KEY = "meetroAssistantVoicePreference";
const VOICE_QUALITY_ORDER = {
  en: [
    "Samantha",
    "Ava",
    "Allison",
    "Siri",
    "Google US English",
    "Google English",
  ],
  es: [
    "Paulina",
    "Mónica",
    "Monica",
    "Jorge",
    "Google español",
    "Google español de Estados Unidos",
    "Google Spanish",
  ],
};

const assistantCopy = {
  en: {
    buttonLabel: "Meetro help",
    assistantName: "Meetro Assistant",
    assistantGreetingFallback: "there",
    assistantGreetingPrefix: "Hi",
    assistantGreetingPrompt: "How can I help you today?",
    screenLabel: "Current screen",
    purposeLabel: "Purpose",
    nextStepLabel: "Suggested next step",
    quickHelpLabel: "Quick help",
    feedbackButton: "Something is confusing",
    feedbackSaved: "Thanks. Saved for TestFlight review.",
    feedbackCategoryLabel: "What feels confusing?",
    feedbackNoteLabel: "Optional note",
    feedbackNotePlaceholder: "Tell us what happened...",
    feedbackSubmit: "Save feedback",
    feedbackCancel: "Cancel",
    feedbackCount: "Saved feedback",
    notificationCount: "Unread notifications",
    emergencyTipsTitle: "Emergency help tips",
    showMoreTips: "Show more",
    showLessTips: "Show less",
    copyFeedbackSummary: "Copy feedback summary",
    copiedFeedbackSummary: "Feedback summary copied.",
    voiceButton: "Ask by voice",
    tapToTalk: "Tap To Talk",
    assistantDetails: "Details & feedback",
    hideDetails: "Hide details",
    voiceListening: "Listening...",
    voiceUnsupported: "Voice Companion is not available on this device yet. Tap a question below to test how Meetro responds.",
    transcriptLabel: "You asked",
    answerLabel: "Meetro says",
    assistantResponseLabel: "Assistant Response",
    readAloudLabel: "Read responses aloud",
    voiceTipsTitle: "Try asking Meetro...",
    professionalVoiceTips: [
      "What’s next today?",
      "What appointments do I have?",
      "Any quotes waiting?",
      "Any new messages?",
      "What should I do next?",
    ],
    homeownerVoiceTips: [
      "When is my appointment?",
      "Do I have any quotes?",
      "What’s happening with my request?",
      "Any new messages?",
      "What should I do next?",
    ],
    homeownerEmergencyTips: [
      "Stay safe first.",
      "If there is immediate danger, call 911.",
      "Add clear photos only if safe.",
      "Keep your phone nearby for professional updates.",
      "Use chat to share access instructions, gate codes, pets, or hazards.",
      "Do not attempt dangerous repairs yourself.",
    ],
    professionalEmergencyTips: [
      "Review location and issue before accepting.",
      "Confirm whether it is safe to proceed.",
      "Message the customer with ETA.",
      "Ask for access details, pets, hazards, or shutoff location.",
      "Update status when on the way, arrived, and completed.",
      "Document photos/notes for job history.",
    ],
    close: "Close",
    roleHomeowner: "Homeowner",
    roleProfessional: "Professional",
    actions: {
      requestService: "Request Service",
      myRequests: "My Requests",
      messages: "Messages",
      discover: "Find Businesses",
      workCenter: "Open Work Center",
      leads: "Open Opportunities",
      schedule: "Open Schedule",
      quotes: "Open Quotes",
      activeWork: "Open Active Work",
      closure: "Open Closure",
      history: "Open History",
      businessTools: "Open Business Tools",
      profile: "Profile",
      legal: "Open Legal",
      quoteBuilder: "Open Quote Builder",
      invoiceBuilder: "Open Invoice Builder",
    },
    actionRoutingReady: "I can help with that.",
    professionalActionUnavailable:
      "That workflow is for professionals. I can open Messages, Profile, or Legal instead.",
    feedbackCategories: [
      "I don’t know what to do next",
      "I can’t find something",
      "Something looks wrong",
      "Appointment/schedule issue",
      "Quote/payment issue",
      "Other",
    ],
    screens: {
      home: {
        name: "Home",
        purpose: "Start a request, review active service, check messages, and return to history.",
        next: "Choose Request Service if you need help, or open an active request to see its next step.",
        actions: ["requestService", "myRequests", "messages"],
      },
      discover: {
        name: "Discover",
        purpose: "Find businesses and review professional profiles before starting or continuing communication.",
        next: "Open a business profile or return to Request Service if you already know what you need.",
        actions: ["requestService", "myRequests"],
      },
      upload: {
        name: "Request Service",
        purpose: "Tell Meetro what you need so the right professional can respond.",
        next: "Add the category, details, location, and helpful photos, then submit the request.",
        actions: ["myRequests"],
      },
      myRequests: {
        name: "My Requests",
        purpose: "Track your request from communication through schedule, quote, work, completion, closure, and history.",
        next: "Open a request to review details, appointments, quotes, messages, and next steps.",
        actions: ["messages", "requestService"],
      },
      projectDetails: {
        name: "Request Details",
        purpose: "Review service details, photos, conversation, records, and current workflow status.",
        next: "Open the conversation if you need to coordinate schedule, quote, work, or completion.",
        actions: ["messages", "myRequests"],
      },
      conversationThread: {
        name: "Conversation",
        purpose: "Coordinate communication, appointments, quotes, work updates, completion, and closure details.",
        next: "Respond to the latest card or send a message if something needs clarification.",
        actions: ["messages", "myRequests"],
      },
      messagesInbox: {
        name: "Communication Center",
        purpose: "See conversations that need attention and understand each workflow status.",
        next: "Open the conversation with the most urgent next step.",
        actions: ["myRequests"],
      },
      businessDashboard: {
        name: "Business Dashboard",
        purpose: "See professional priorities, alerts, scheduled jobs, opportunities, and business performance.",
        next: "Open the Work Center section that needs action.",
        actions: ["workCenter", "leads", "messages"],
      },
      contractorDashboard: {
        name: "Work Center",
        purpose: "Manage customer relationships from first contact through closure.",
        next: "Open the workflow card with the strongest alert or continue the current section.",
        actions: ["leads", "messages"],
      },
      workCenter: {
        name: "Work Center",
        purpose: "Manage customer relationships from first contact through closure.",
        next: "Open the workflow card with the strongest alert or continue the current section.",
        actions: ["leads", "messages"],
      },
      businessLeads: {
        name: "Opportunities",
        purpose: "Review new service requests and decide whether to contact or schedule an evaluation.",
        next: "Contact the customer or schedule an evaluation before creating a quote.",
        actions: ["workCenter", "messages"],
      },
      quoteRequests: {
        name: "Lead Requests",
        purpose: "Review incoming customer requests and decide the next professional step.",
        next: "Move promising requests into communication or scheduling.",
        actions: ["workCenter", "leads"],
      },
      quoteBuilder: {
        name: "Quote Builder",
        purpose: "Create a proposal after enough information or evaluation has been gathered.",
        next: "Send the quote through Meetro Chat when it is linked to a Meetro customer.",
        actions: ["workCenter", "messages"],
      },
      projectGallery: {
        name: "Project Records",
        purpose: "Review saved work, photos, records, and relationship memory.",
        next: "Use records to understand past work before future service.",
        actions: ["workCenter"],
      },
      completedJobDetails: {
        name: "Completed Record",
        purpose: "Review completed work while remembering closure may still require obligations.",
        next: "Check whether payment, documentation, confirmation, or compliance is still pending.",
        actions: ["workCenter"],
      },
      emergency: {
        name: "Emergency Help",
        purpose: "Start urgent help without turning every request into a project.",
        next: "Share the issue, location, safety details, and photos if available.",
        actions: ["messages"],
      },
      emergencyStatus: {
        name: "Emergency Status",
        purpose: "Track urgent service response and updates.",
        next: "Watch status updates and use messages if coordination is needed.",
        actions: ["messages"],
      },
      emergencyOperationsCenter: {
        name: "Emergency Operations",
        purpose: "Manage urgent professional response work.",
        next: "Review the active dispatch or customer communication.",
        actions: ["workCenter", "messages"],
      },
      completionSheet: {
        name: "Completion",
        purpose: "Document work performed. Completion does not automatically mean closure.",
        next: "Record completion evidence, then review obligations before closure.",
        actions: ["workCenter"],
      },
      profile: {
        name: "Profile",
        purpose: "Manage account and business details.",
        next: "Update the details that help people understand who you are.",
        actions: ["home", "workCenter"],
      },
    },
    fallback: {
      name: "Meetro",
      purpose: "This screen supports the Meetro service workflow.",
      next: "Look for the clearest next step or report confusion during testing.",
      actions: ["messages"],
    },
  },
  es: {
    buttonLabel: "Ayuda de Meetro",
    assistantName: "Asistente Meetro",
    assistantGreetingFallback: "ahí",
    assistantGreetingPrefix: "Hola",
    assistantGreetingPrompt: "¿Cómo puedo ayudarte hoy?",
    screenLabel: "Pantalla actual",
    purposeLabel: "Propósito",
    nextStepLabel: "Siguiente paso sugerido",
    quickHelpLabel: "Ayuda rápida",
    feedbackButton: "Algo es confuso",
    feedbackSaved: "Gracias. Guardado para revisión de TestFlight.",
    feedbackCategoryLabel: "¿Qué se siente confuso?",
    feedbackNoteLabel: "Nota opcional",
    feedbackNotePlaceholder: "Cuéntanos qué pasó...",
    feedbackSubmit: "Guardar comentario",
    feedbackCancel: "Cancelar",
    feedbackCount: "Comentarios guardados",
    notificationCount: "Notificaciones sin leer",
    emergencyTipsTitle: "Consejos de emergencia",
    showMoreTips: "Mostrar más",
    showLessTips: "Mostrar menos",
    copyFeedbackSummary: "Copiar resumen",
    copiedFeedbackSummary: "Resumen copiado.",
    voiceButton: "Preguntar con voz",
    tapToTalk: "Toca para hablar",
    assistantDetails: "Detalles y comentarios",
    hideDetails: "Ocultar detalles",
    voiceListening: "Escuchando...",
    voiceUnsupported: "El Compañero de Voz aún no está disponible en este dispositivo. Toca una pregunta abajo para probar cómo responde Meetro.",
    transcriptLabel: "Preguntaste",
    answerLabel: "Meetro dice",
    assistantResponseLabel: "Respuesta del asistente",
    readAloudLabel: "Leer respuestas en voz alta",
    voiceTipsTitle: "Prueba preguntar a Meetro...",
    professionalVoiceTips: [
      "¿Qué sigue hoy?",
      "¿Qué citas tengo?",
      "¿Hay cotizaciones pendientes?",
      "¿Hay mensajes nuevos?",
      "¿Qué debo hacer después?",
    ],
    homeownerVoiceTips: [
      "¿Cuándo es mi cita?",
      "¿Tengo cotizaciones?",
      "¿Qué pasa con mi solicitud?",
      "¿Hay mensajes nuevos?",
      "¿Qué debo hacer después?",
    ],
    homeownerEmergencyTips: [
      "Mantente seguro primero.",
      "Si hay peligro inmediato, llama al 911.",
      "Agrega fotos claras solo si es seguro.",
      "Mantén tu teléfono cerca para recibir actualizaciones.",
      "Usa el chat para compartir acceso, códigos, mascotas o peligros.",
      "No intentes reparaciones peligrosas por tu cuenta.",
    ],
    professionalEmergencyTips: [
      "Revisa ubicación y problema antes de aceptar.",
      "Confirma si es seguro continuar.",
      "Envía al cliente una hora estimada de llegada.",
      "Pide detalles de acceso, mascotas, peligros o cierre de agua/gas/luz.",
      "Actualiza estado: en camino, llegó y completado.",
      "Documenta fotos/notas para el historial del trabajo.",
    ],
    close: "Cerrar",
    roleHomeowner: "Cliente",
    roleProfessional: "Profesional",
    actions: {
      requestService: "Solicitar servicio",
      myRequests: "Mis solicitudes",
      messages: "Mensajes",
      discover: "Buscar negocios",
      workCenter: "Abrir Work Center",
      leads: "Abrir oportunidades",
      schedule: "Abrir agenda",
      quotes: "Abrir cotizaciones",
      activeWork: "Abrir trabajo activo",
      closure: "Abrir cierre",
      history: "Abrir historial",
      businessTools: "Abrir herramientas",
      profile: "Perfil",
      legal: "Abrir Legal",
      quoteBuilder: "Abrir creador de cotizaciones",
      invoiceBuilder: "Abrir creador de facturas",
    },
    actionRoutingReady: "Puedo ayudarte con eso.",
    professionalActionUnavailable:
      "Ese flujo es para profesionales. Puedo abrir Mensajes, Perfil o Legal.",
    feedbackCategories: [
      "No sé qué hacer después",
      "No encuentro algo",
      "Algo se ve mal",
      "Problema con cita/agenda",
      "Problema con cotización/pago",
      "Otro",
    ],
    screens: {
      home: {
        name: "Inicio",
        purpose: "Inicia una solicitud, revisa servicios activos, mensajes e historial.",
        next: "Elige Solicitar servicio si necesitas ayuda, o abre una solicitud activa.",
        actions: ["requestService", "myRequests", "messages"],
      },
      discover: {
        name: "Descubrir",
        purpose: "Encuentra negocios y revisa perfiles profesionales.",
        next: "Abre un perfil o vuelve a Solicitar servicio si ya sabes qué necesitas.",
        actions: ["requestService", "myRequests"],
      },
      upload: {
        name: "Solicitar servicio",
        purpose: "Dile a Meetro qué necesitas para que responda el profesional correcto.",
        next: "Agrega categoría, detalles, ubicación y fotos útiles, luego envía.",
        actions: ["myRequests"],
      },
      myRequests: {
        name: "Mis solicitudes",
        purpose: "Sigue tu solicitud desde comunicación hasta agenda, cotización, trabajo, cierre e historial.",
        next: "Abre una solicitud para revisar detalles, citas, cotizaciones y mensajes.",
        actions: ["messages", "requestService"],
      },
      projectDetails: {
        name: "Detalles de solicitud",
        purpose: "Revisa detalles, fotos, conversación, registros y estado actual.",
        next: "Abre la conversación si necesitas coordinar agenda, cotización o finalización.",
        actions: ["messages", "myRequests"],
      },
      conversationThread: {
        name: "Conversación",
        purpose: "Coordina mensajes, citas, cotizaciones, actualizaciones, finalización y cierre.",
        next: "Responde a la tarjeta más reciente o envía un mensaje si algo no está claro.",
        actions: ["messages", "myRequests"],
      },
      messagesInbox: {
        name: "Centro de comunicación",
        purpose: "Mira conversaciones que necesitan atención y su estado de flujo.",
        next: "Abre la conversación con el siguiente paso más urgente.",
        actions: ["myRequests"],
      },
      businessDashboard: {
        name: "Panel del negocio",
        purpose: "Revisa prioridades, alertas, trabajos programados, oportunidades y rendimiento.",
        next: "Abre la sección del Work Center que necesita acción.",
        actions: ["workCenter", "leads", "messages"],
      },
      contractorDashboard: {
        name: "Work Center",
        purpose: "Gestiona relaciones con clientes desde el primer contacto hasta el cierre.",
        next: "Abre la tarjeta con alerta o continúa la sección actual.",
        actions: ["leads", "messages"],
      },
      workCenter: {
        name: "Work Center",
        purpose: "Gestiona relaciones con clientes desde el primer contacto hasta el cierre.",
        next: "Abre la tarjeta con alerta o continúa la sección actual.",
        actions: ["leads", "messages"],
      },
      businessLeads: {
        name: "Oportunidades",
        purpose: "Revisa solicitudes nuevas y decide contactar o agendar evaluación.",
        next: "Contacta al cliente o agenda evaluación antes de cotizar.",
        actions: ["workCenter", "messages"],
      },
      quoteBuilder: {
        name: "Crear cotización",
        purpose: "Crea una propuesta después de reunir información o evaluar.",
        next: "Envía la cotización por Meetro Chat cuando esté vinculada a un cliente.",
        actions: ["workCenter", "messages"],
      },
      completionSheet: {
        name: "Finalización",
        purpose: "Documenta trabajo realizado. Finalización no significa cierre automático.",
        next: "Registra evidencia y revisa obligaciones antes del cierre.",
        actions: ["workCenter"],
      },
    },
    fallback: {
      name: "Meetro",
      purpose: "Esta pantalla apoya el flujo de servicio de Meetro.",
      next: "Busca el siguiente paso más claro o reporta confusión durante pruebas.",
      actions: ["messages"],
    },
  },
};

const actionTargets = {
  requestService: "upload",
  myRequests: "myRequests",
  messages: "messagesInbox",
  discover: "discover",
  workCenter: "contractorDashboard",
  leads: "businessLeads",
  schedule: "contractorDashboard",
  quotes: "contractorDashboard",
  activeWork: "contractorDashboard",
  closure: "contractorDashboard",
  history: "contractorDashboard",
  businessTools: "businessCommandCenter",
  profile: "profile",
  legal: "legal",
  quoteBuilder: "quoteBuilder",
  invoiceBuilder: "invoiceBuilder",
  home: "home",
};

function getSelectedContext() {
  return {
    selectedRequestId: localStorage.getItem("selectedHomeownerRequestId") || "",
    selectedJobId:
      localStorage.getItem("activeJobId") ||
      localStorage.getItem("activeWorkRequestId") ||
      "",
    conversationId: localStorage.getItem("activeConversationId") || "",
    appointmentId:
      localStorage.getItem("activeWorkScheduleId") ||
      localStorage.getItem("selectedScheduleId") ||
      "",
    quoteId:
      localStorage.getItem("activeWorkQuoteId") ||
      localStorage.getItem("selectedQuoteId") ||
      localStorage.getItem("selectedQuoteRequestId") ||
      "",
    workCenterSection:
      localStorage.getItem("meetroWorkCenterTab") ||
      localStorage.getItem("activeWorkCenterTab") ||
      "",
  };
}

function isActiveEmergencyStatus(status) {
  const normalized = String(status || "").toLowerCase();
  return Boolean(
    normalized &&
      !["completed", "cancelled", "canceled", "closed", "resolved", "archived"].includes(
        normalized
      )
  );
}

function isEmergencyAssistantContext(currentPage) {
  const page = String(currentPage || "").toLowerCase();
  const context = getSelectedContext();
  const emergencyStatus =
    localStorage.getItem("emergencyDispatchStatus") ||
    safeJson("activeEmergencyRecord", {})?.status ||
    "";
  const conversationType = localStorage.getItem("meetroConversationType") || "";
  const activeConversationId = localStorage.getItem("activeConversationId") || "";
  const workCenterSection = String(context.workCenterSection || "").toLowerCase();

  if (page.includes("emergency")) return true;

  if (
    page === "conversationthread" &&
    (conversationType === "emergency" || activeConversationId.includes("emergency"))
  ) {
    return true;
  }

  if (
    ["businessdashboard", "contractordashboard", "workcenter"].includes(page) &&
    (isActiveEmergencyStatus(emergencyStatus) ||
      workCenterSection.includes("emergency") ||
      Boolean(localStorage.getItem("activeEmergencyRequestId")))
  ) {
    return true;
  }

  return false;
}

function getScreenGuide(currentPage, language) {
  const copy = assistantCopy[language] || assistantCopy.en;
  const baseGuide = copy.screens[currentPage] || copy.fallback;
  const context = getSelectedContext();

  if (
    (currentPage === "contractorDashboard" || currentPage === "workCenter") &&
    context.workCenterSection
  ) {
    const sectionName = context.workCenterSection
      .replace("pending", "Opportunities")
      .replace("active", "Active Work")
      .replace("completed", "Closure")
      .replace(/^./, (letter) => letter.toUpperCase());

    return {
      ...baseGuide,
      name: `${baseGuide.name}: ${sectionName}`,
    };
  }

  return baseGuide;
}

function getRoleLabel(currentPage, language) {
  const copy = assistantCopy[language] || assistantCopy.en;
  const mode = getAccountModeForPage(
    currentPage,
    localStorage.getItem("activeAccountMode") || "personal"
  );

  return mode === "business" ? copy.roleProfessional : copy.roleHomeowner;
}

function safeJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function getUnreadConversationCount() {
  const registry = safeJson("meetro_conversation_registry", []);
  if (!Array.isArray(registry)) return 0;

  return registry.reduce((total, item) => {
    const count = Number(item?.unreadCount || item?.unread_count || 0);
    if (count > 0) return total + count;
    return item?.unread ? total + 1 : total;
  }, 0);
}

function getConversationRegistry() {
  const registry = safeJson("meetro_conversation_registry", []);
  return Array.isArray(registry) ? registry : [];
}

function getLatestConversation() {
  return [...getConversationRegistry()].sort((first, second) => {
    const firstTime = Date.parse(
      first?.lastMessageAt || first?.updatedAt || first?.timestamp || first?.createdAt || 0
    );
    const secondTime = Date.parse(
      second?.lastMessageAt || second?.updatedAt || second?.timestamp || second?.createdAt || 0
    );
    return (Number.isNaN(secondTime) ? 0 : secondTime) - (Number.isNaN(firstTime) ? 0 : firstTime);
  })[0];
}

function getConversationLabel(conversation) {
  return (
    conversation?.customerName ||
    conversation?.businessName ||
    conversation?.title ||
    conversation?.requestTitle ||
    conversation?.service ||
    conversation?.name ||
    "the latest conversation"
  );
}

function getLocalDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAppointmentDateKey(appointment) {
  return getLocalDateKey(
    appointment?.date ||
      appointment?.appointmentDate ||
      appointment?.scheduledDate ||
      appointment?.startAt ||
      appointment?.startsAt ||
      appointment?.scheduledAt
  );
}

function getUpcomingAppointments() {
  const schedule = safeJson("meetro_business_schedule", []);
  if (!Array.isArray(schedule)) return [];

  return schedule
    .filter((item) => item && !String(item.status || "").toLowerCase().includes("cancel"))
    .sort((first, second) =>
      String(`${first.date || ""} ${first.time || ""}`).localeCompare(
        String(`${second.date || ""} ${second.time || ""}`)
      )
    );
}

function getHomeownerRequests() {
  const requests = safeJson("homeownerRequests", []);
  return Array.isArray(requests) ? requests : [];
}

function getSelectedHomeownerRequest() {
  const selectedId = localStorage.getItem("selectedHomeownerRequestId") || "";
  const requests = getHomeownerRequests();

  return (
    requests.find((request) => String(request.requestId || request.id) === String(selectedId)) ||
    requests[0] ||
    null
  );
}

function getHomeownerAppointment(request) {
  if (!request) return null;

  const requestId = String(request.requestId || request.id || "");
  const conversationId = String(request.conversationId || request.activeConversationId || "");
  const linkedAppointment = request.linkedAppointment || request.appointment || request.schedule;
  if (linkedAppointment) return linkedAppointment;

  return getUpcomingAppointments().find((appointment) => {
    const appointmentRequestId = String(
      appointment.requestId ||
        appointment.selectedHomeownerRequestId ||
        appointment.selectedHomeownerRequest?.requestId ||
        appointment.selectedHomeownerRequest?.id ||
        ""
    );
    const appointmentConversationId = String(
      appointment.conversationId ||
        appointment.activeConversationId ||
        appointment.projectConversationId ||
        ""
    );

    return (
      (requestId && appointmentRequestId && requestId === appointmentRequestId) ||
      (conversationId && appointmentConversationId && conversationId === appointmentConversationId)
    );
  });
}

function getQuoteHistory() {
  const quotes = safeJson("workCenterQuoteHistory", []);
  return Array.isArray(quotes) ? quotes : [];
}

function getQuoteStatus(quote) {
  return String(quote?.status || quote?.quoteStatus || quote?.workflowStatus || "").toLowerCase();
}

function getQuoteSummary() {
  const quotes = getQuoteHistory();
  const pending = quotes.filter((quote) =>
    ["sent", "quoted", "viewed", "pending", "draft"].includes(getQuoteStatus(quote))
  );
  const revisions = quotes.filter((quote) =>
    ["revision_requested", "changes_requested", "change_requested"].includes(getQuoteStatus(quote))
  );
  const accepted = quotes.filter((quote) =>
    ["accepted", "approved", "quote_approved"].includes(getQuoteStatus(quote))
  );

  return { quotes, pending, revisions, accepted };
}

function getEmergencySummary() {
  const status = String(localStorage.getItem("emergencyDispatchStatus") || "").toLowerCase();
  const requestId = localStorage.getItem("emergencyRequestId") || "";
  const issue = localStorage.getItem("emergencyIssue") || "";
  const customer = localStorage.getItem("emergencyCustomerName") || "";
  const inactiveStatuses = ["", "completed", "cancelled", "canceled", "closed", "resolved"];
  const active = Boolean((requestId || issue || status) && !inactiveStatuses.includes(status));

  return {
    active,
    status: status || "pending",
    issue,
    customer,
  };
}

function getActiveWorkSummary() {
  const snapshot = safeJson("activeWorkSnapshot", null);
  const hasSnapshot = snapshot && typeof snapshot === "object";
  const status =
    (hasSnapshot && (snapshot.status || snapshot.stage)) ||
    localStorage.getItem("activeWorkStatus") ||
    localStorage.getItem("activeJobStatus") ||
    localStorage.getItem("activeWorkStage") ||
    "";
  const service =
    (hasSnapshot && (snapshot.service || snapshot.title || snapshot.requestTitle)) ||
    localStorage.getItem("activeWorkService") ||
    localStorage.getItem("pendingWorkService") ||
    "";
  const count = Math.max(
    hasSnapshot ? 1 : 0,
    Number(localStorage.getItem("activeJobsCount") || "0"),
    status ? 1 : 0
  );

  return { count, status, service };
}

function getHomeownerQuotes(request) {
  const requestQuotes = Array.isArray(request?.quotesReceived) ? request.quotesReceived : [];
  const acceptedQuote = request?.acceptedQuote
    ? [request.acceptedQuote]
    : requestQuotes.filter((quote) => getQuoteStatus(quote) === "accepted");
  const requestId = String(request?.requestId || request?.id || "");
  const conversationId = String(request?.conversationId || request?.activeConversationId || "");
  const linkedWorkCenterQuotes = getQuoteHistory().filter((quote) => {
    const quoteRequestId = String(
      quote.requestId || quote.selectedHomeownerRequestId || quote.quoteRequestId || ""
    );
    const quoteConversationId = String(quote.conversationId || quote.activeConversationId || "");
    return (
      (requestId && quoteRequestId && requestId === quoteRequestId) ||
      (conversationId && quoteConversationId && conversationId === quoteConversationId)
    );
  });

  return [...acceptedQuote, ...requestQuotes, ...linkedWorkCenterQuotes];
}

function getRequestPhotoCount(request) {
  if (!request) return 0;

  const photos = [
    ...(Array.isArray(request.photos) ? request.photos : []),
    ...(Array.isArray(request.photoUrls) ? request.photoUrls : []),
    request.image_url,
    request.imageUrl,
  ].filter(Boolean);

  return new Set(photos).size;
}

function getProfessionalRequestContext() {
  const selectedQuoteRequest = safeJson("selectedQuoteRequest", null);
  const selectedActiveProject = safeJson("selectedActiveProject", null);
  const selectedChangeOrderRequest = safeJson("selectedChangeOrderRequest", null);
  const request =
    selectedQuoteRequest ||
    selectedActiveProject?.project ||
    selectedActiveProject ||
    selectedChangeOrderRequest ||
    null;

  return request && typeof request === "object" ? request : null;
}

function isServiceRequestAssistantPage(currentPage, roleMode) {
  const page = String(currentPage || "");
  if (["myRequests", "changeOrderRequest"].includes(page)) return true;

  if (page === "projectDetails") {
    return roleMode === "business" || Boolean(localStorage.getItem("selectedHomeownerRequestId"));
  }

  return false;
}

function getServiceRequestContext(currentPage, roleMode, language) {
  if (!isServiceRequestAssistantPage(currentPage, roleMode)) {
    return { active: false };
  }

  const request =
    roleMode === "business"
      ? getProfessionalRequestContext()
      : safeJson("selectedChangeOrderRequest", null) || getSelectedHomeownerRequest();

  if (!request) {
    return { active: false };
  }

  const requestId = String(request.requestId || request.id || request.quoteRequestId || "");
  const conversationId = String(
    request.conversationId ||
      request.activeConversationId ||
      request.projectConversationId ||
      requestId ||
      ""
  );
  const appointment = getHomeownerAppointment(request);
  const quotes = getHomeownerQuotes(request);
  const quote = quotes[0] || null;
  const quoteStatus = getQuoteStatus(quote);
  const lifecycle =
    roleMode === "business" ? null : getHomeownerLifecycleStage(request, language);
  const status = String(
    request.status ||
      request.workflowStatus ||
      lifecycle?.stageLabel ||
      "submitted"
  ).toLowerCase();
  const professionalName =
    request.selectedProfessional ||
    request.businessName ||
    request.business_name ||
    request.contractorName ||
    request.assignedProfessional ||
    "";

  return {
    active: true,
    request,
    requestId,
    conversationId,
    title: request.title || request.service || request.projectTitle || "Service Request",
    status,
    statusLabel: lifecycle?.stageLabel || request.status || "Submitted",
    nextStep: lifecycle?.nextStep || "",
    photoCount: getRequestPhotoCount(request),
    appointment,
    appointmentStatus: appointment
      ? String(
          appointment.customerConfirmationStatus ||
            appointment.confirmationStatus ||
            appointment.workflowStatus ||
            appointment.status ||
            "pending"
        ).toLowerCase()
      : "",
    quote,
    quoteStatus,
    professionalName,
    unreadCount: getUnreadConversationCount(),
  };
}

function makeResponse(intent, answer, actions = [], success = true) {
  return { intent, success, answer, actions };
}

function makeAssistantAction(actionKey, language) {
  const copy = assistantCopy[language] || assistantCopy.en;
  const action = {
    label: copy.actions[actionKey] || actionKey,
    target: actionTargets[actionKey],
  };

  const workCenterSections = {
    schedule: "schedule",
    quotes: "quotes",
    activeWork: "active",
    closure: "closure",
    history: "history",
  };

  if (workCenterSections[actionKey]) {
    action.workCenterSection = workCenterSections[actionKey];
  }

  return action;
}

function makeRequestAssistantAction(actionKey, language, context = {}) {
  const request = context.request || {};
  const selectedRequestId = context.requestId || request.requestId || request.id || "";
  const conversationId = context.conversationId || request.conversationId || selectedRequestId || "";
  const actionMap = {
    editRequest: {
      label: t("assistantActionEditRequest"),
      target: "myRequests",
      action: "edit_request",
    },
    openConversation: {
      label: t("assistantActionOpenConversation"),
      target: "conversationThread",
      conversationId,
    },
    viewQuote: {
      label: t("assistantActionViewQuote"),
      target: conversationId ? "conversationThread" : "myRequests",
      conversationId,
    },
    openSchedule: {
      label: t("assistantActionOpenSchedule"),
      target: "myRequests",
    },
    requestChange: {
      label: t("assistantActionRequestChange"),
      target: "changeOrderRequest",
      action: "request_change",
    },
    backToRequests: {
      label: t("assistantActionBackToMyRequests"),
      target: "myRequests",
    },
    contactCustomer: {
      label: t("assistantRequestContactCustomer"),
      target: "conversationThread",
      conversationId,
    },
    scheduleEvaluation: {
      label: t("assistantRequestScheduleEvaluation"),
      target: "contractorDashboard",
      workCenterSection: "schedule",
    },
    createQuote: {
      label: t("assistantRequestCreateQuote"),
      target: "quoteBuilder",
    },
    reviewDetails: {
      label: t("assistantRequestReviewDetails"),
      target: conversationId ? "conversationThread" : "myRequests",
      conversationId,
    },
    moveWorkCenter: {
      label: t("assistantRequestMoveWorkCenter"),
      target: "contractorDashboard",
    },
  };

  return {
    ...(actionMap[actionKey] || actionMap.backToRequests),
    selectedRequestId,
    request,
  };
}

function getServiceRequestVoiceTips(roleMode) {
  if (roleMode === "business") {
    return [
      t("assistantRequestContactCustomer"),
      t("assistantRequestScheduleEvaluation"),
      t("assistantRequestCreateQuote"),
      t("assistantRequestReviewDetails"),
      t("assistantRequestMoveWorkCenter"),
    ];
  }

  return [
    t("assistantRequestWhatNext"),
    t("assistantRequestAddPhotos"),
    t("assistantRequestEdit"),
    t("assistantRequestMessageProfessional"),
    t("assistantRequestExplainQuote"),
    t("assistantRequestStatusMeaning"),
  ];
}

function getServiceRequestGuidanceResponse(question, roleMode, language, currentPage) {
  const context = getServiceRequestContext(currentPage, roleMode, language);
  if (!context.active) return null;

  const text = String(question || "").toLowerCase();
  const isSpanish = language === "es";
  const hasAppointment = Boolean(context.appointment);
  const hasQuote = Boolean(context.quote);
  const isCompleted = /completed|complete|done|finalizado|completado/.test(context.status);
  const isWaiting =
    /open|new|submitted|requested|pending|review|waiting|solicitado|pendiente/.test(
      context.status
    );
  const asksPhotos = /(photo|photos|picture|image|foto|fotos|imagen)/.test(text);
  const asksEdit = /(edit|change details|update request|editar|cambiar|actualizar)/.test(text);
  const asksMessage = /(message|chat|conversation|professional|mensaje|chat|conversaci)/.test(text);
  const asksQuote = /(quote|proposal|price|cost|cotiz|propuesta|precio|costo)/.test(text);
  const asksStatus = /(status|mean|happening|estado|significa|pasando)/.test(text);
  const asksNext = /(next|what should|what happens|siguiente|despu[eé]s|hacer)/.test(text);

  if (roleMode === "business") {
    if (/(quote|cotiz|propuesta)/.test(text)) {
      return makeResponse(
        "request_create_quote",
        isSpanish
          ? "Puedes crear una cotización desde esta solicitud después de revisar los detalles o completar la evaluación."
          : "You can create a quote from this request after reviewing details or completing the evaluation.",
        [
          makeRequestAssistantAction("createQuote", language, context),
          makeRequestAssistantAction("reviewDetails", language, context),
        ]
      );
    }

    if (/(schedule|appointment|evaluation|agenda|cita|evaluaci)/.test(text)) {
      return makeResponse(
        "request_schedule_evaluation",
        isSpanish
          ? "El siguiente paso seguro es coordinar una evaluación con el cliente antes de cotizar."
          : "The safe next step is to coordinate an evaluation with the customer before quoting.",
        [
          makeRequestAssistantAction("scheduleEvaluation", language, context),
          makeRequestAssistantAction("contactCustomer", language, context),
        ]
      );
    }

    return makeResponse(
      "professional_request_next_step",
      isSpanish
        ? `Estás revisando ${context.title}. Contacta al cliente, agenda evaluación o crea una cotización cuando tengas suficiente información.`
        : `You are reviewing ${context.title}. Contact the customer, schedule an evaluation, or create a quote when you have enough information.`,
      [
        makeRequestAssistantAction("contactCustomer", language, context),
        makeRequestAssistantAction("scheduleEvaluation", language, context),
        makeRequestAssistantAction("createQuote", language, context),
      ]
    );
  }

  if (asksPhotos || (asksNext && context.photoCount === 0)) {
    return makeResponse(
      "request_add_photos",
      isSpanish
        ? "Agregar fotos puede ayudar al profesional a entender el problema.\n• Usa Editar solicitud para agregar fotos.\n• Incluye fotos claras solo si es seguro."
        : "Adding photos can help the professional understand the issue.\n• Use Edit Request to add photos.\n• Include clear photos only if it is safe.",
      [makeRequestAssistantAction("editRequest", language, context)]
    );
  }

  if (asksEdit) {
    return makeResponse(
      "request_edit",
      isSpanish
        ? "Puedes actualizar los detalles desde Mis solicitudes. Abre Editar solicitud, ajusta la información y guarda los cambios."
        : "You can update the details from My Requests. Open Edit Request, adjust the information, and save your changes.",
      [makeRequestAssistantAction("editRequest", language, context)]
    );
  }

  if (asksMessage) {
    return makeResponse(
      "request_message_professional",
      isSpanish
        ? "Abre la conversación para coordinar detalles, horario, acceso o preguntas sobre la solicitud."
        : "Open the conversation to coordinate details, timing, access, or questions about the request.",
      [makeRequestAssistantAction("openConversation", language, context)]
    );
  }

  if (asksQuote || hasQuote) {
    const quoteText = hasQuote
      ? isSpanish
        ? `Tu cotización está en estado ${context.quoteStatus || "pendiente"}. Revisa alcance, precio y notas antes de aceptar o pedir cambios.`
        : `Your quote is ${context.quoteStatus || "pending"}. Review the scope, price, and notes before accepting or requesting changes.`
      : isSpanish
      ? "Todavía no veo una cotización vinculada a esta solicitud."
      : "I do not see a quote linked to this request yet.";

    return makeResponse("request_quote_guidance", quoteText, [
      hasQuote
        ? makeRequestAssistantAction("viewQuote", language, context)
        : makeRequestAssistantAction("openConversation", language, context),
      makeRequestAssistantAction("backToRequests", language, context),
    ]);
  }

  if (hasAppointment) {
    return makeResponse(
      "request_appointment_next_step",
      isSpanish
        ? `Tienes una cita vinculada. Estado: ${context.appointmentStatus || "pendiente"}. Abre la conversación si necesitas confirmar detalles o pedir otro horario.`
        : `You have a linked appointment. Status: ${context.appointmentStatus || "pending"}. Open the conversation if you need to confirm details or request a different time.`,
      [
        makeRequestAssistantAction("openConversation", language, context),
        makeRequestAssistantAction("openSchedule", language, context),
      ]
    );
  }

  if (isCompleted) {
    return makeResponse(
      "request_completed_guidance",
      isSpanish
        ? "Esta solicitud está marcada como completada. Revisa los detalles de finalización; el cierre puede depender de obligaciones, documentación o confirmación."
        : "This request is marked completed. Review completion details; closure may still depend on obligations, documentation, or confirmation.",
      [
        makeRequestAssistantAction("openConversation", language, context),
        makeRequestAssistantAction("requestChange", language, context),
      ]
    );
  }

  if (asksStatus || asksNext || isWaiting) {
    return makeResponse(
      "request_next_step",
      isSpanish
        ? `Tu solicitud está en ${context.statusLabel || "revisión"}. El siguiente paso es que un profesional revise la solicitud o te contacte.`
        : `Your request is at ${context.statusLabel || "review"}. The next step is for a professional to review the request or contact you.`,
      [
        makeRequestAssistantAction("openConversation", language, context),
        makeRequestAssistantAction("editRequest", language, context),
        makeRequestAssistantAction("backToRequests", language, context),
      ]
    );
  }

  return makeResponse(
    "request_guidance",
    isSpanish
      ? `Estás viendo ${context.title}. Revisa el estado, fotos, mensajes, citas y cotizaciones vinculadas.`
      : `You are viewing ${context.title}. Review the status, photos, messages, appointments, and linked quotes.`,
    [
      makeRequestAssistantAction("openConversation", language, context),
      makeRequestAssistantAction("backToRequests", language, context),
    ]
  );
}

function formatAssistantDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseAssistantScheduleDate(text) {
  const normalized = String(text || "").toLowerCase();
  const now = new Date();

  if (/(tomorrow|mañana)/.test(normalized)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return {
      value: formatAssistantDate(tomorrow),
      label: normalized.includes("mañana") ? "Mañana" : "Tomorrow",
    };
  }

  if (/(today|hoy)/.test(normalized)) {
    return {
      value: formatAssistantDate(now),
      label: normalized.includes("hoy") ? "Hoy" : "Today",
    };
  }

  const isoMatch = normalized.match(/\b(\d{4}-\d{1,2}-\d{1,2})\b/);
  if (isoMatch) {
    return { value: isoMatch[1], label: isoMatch[1] };
  }

  const slashMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    const rawYear = slashMatch[3] ? Number(slashMatch[3]) : now.getFullYear();
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const parsed = new Date(year, month - 1, day);
    return { value: formatAssistantDate(parsed), label: `${month}/${day}/${year}` };
  }

  return { value: "", label: "" };
}

function parseAssistantScheduleTime(text) {
  const parsed = parseUserScheduleTime(text);
  if (!parsed) return { value: "", label: "", spoken: "" };

  return {
    value: parsed.value,
    label: parsed.display,
    spoken: parsed.spoken,
  };
}

function parseAssistantScheduleLocation(text) {
  const original = String(text || "")
    .replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm|a\.m\.|p\.m\.)\b/gi, "")
    .replace(/\b(today|tomorrow|hoy|mañana)\b/gi, "");
  const matches = [
    ...original.matchAll(/\b(?:at|in|location is|address is|ubicaci[oó]n|direcci[oó]n)\s+([^,.]+(?:[, ]+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+){0,5})/gi),
  ];
  const locationMatch = matches
    .map((match) => String(match[1] || "").trim())
    .filter((value) => value && !/^\d{1,2}(?::\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?$/i.test(value))
    .pop();

  return locationMatch || "";
}

function parseAssistantScheduleNotes(text) {
  const match = String(text || "").match(/\b(?:notes?|note|about|nota)\s*[:\-]?\s*(.+)$/i);
  return match ? String(match[1] || "").trim() : "";
}

function detectScheduleCreationIntent(question) {
  const text = String(question || "");
  const normalized = text.toLowerCase();
  const hasCreationVerb =
    /(schedule|create|book|set up|add|programar|agendar|crear|reservar)/.test(normalized);
  const hasAppointmentNoun =
    /(visit|appointment|consultation|walkthrough|estimate|evaluation|cita|visita|consulta|estimado|evaluaci[oó]n)/.test(
      normalized
    );

  if (!hasCreationVerb || !hasAppointmentNoun) return null;

  const date = parseAssistantScheduleDate(text);
  const time = parseAssistantScheduleTime(text);
  const location = parseAssistantScheduleLocation(text);
  const notes = parseAssistantScheduleNotes(text);

  return {
    date,
    time,
    location,
    notes,
    title: /estimate|estimado/.test(normalized)
      ? "Estimate"
      : /consultation|consulta/.test(normalized)
      ? "Consultation"
      : /evaluation|evaluaci/.test(normalized)
      ? "Evaluation"
      : "Scheduled Visit",
  };
}

function getScheduleCreationResponse(question, roleMode, language) {
  const scheduleIntent = detectScheduleCreationIntent(question);
  if (!scheduleIntent) return null;

  if (roleMode !== "business") {
    return makeResponse("schedule_creation_professional_only", assistantCopy[language]?.professionalActionUnavailable || assistantCopy.en.professionalActionUnavailable, [
      makeAssistantAction("messages", language),
      makeAssistantAction("profile", language),
    ]);
  }

  const missingDate = !scheduleIntent.date.value;
  const missingTime = !scheduleIntent.time.value;
  const prefill = {
    appointmentType: "walkthrough",
    title: scheduleIntent.title,
    date: scheduleIntent.date.value,
    dateLabel: scheduleIntent.date.label,
    time: scheduleIntent.time.value,
    timeLabel: scheduleIntent.time.label,
    spokenTime: scheduleIntent.time.spoken,
    location: scheduleIntent.location,
    notes: scheduleIntent.notes,
    source: "meetro_assistant",
    createdAt: new Date().toISOString(),
  };

  if (missingDate || missingTime) {
    const prompt = missingDate && missingTime
      ? t("assistantScheduleMissingDateTime")
      : missingDate
      ? t("assistantScheduleMissingDate")
      : t("assistantScheduleMissingTime");

    return makeResponse("schedule_creation_missing_details", prompt, [
      {
        label: t("assistantActionEditDetails"),
        target: "contractorDashboard",
        workCenterSection: "schedule",
        schedulePrefill: prefill,
      },
      makeAssistantAction("schedule", language),
    ]);
  }

  const lines = [
    t("assistantScheduleIntentReady"),
    "",
    `${t("assistantSchedulePrefillDate")}: ${scheduleIntent.date.label || scheduleIntent.date.value}`,
    `${t("assistantSchedulePrefillTime")}: ${scheduleIntent.time.spoken || scheduleIntent.time.label || scheduleIntent.time.value}`,
  ];

  if (scheduleIntent.location) {
    lines.push(`${t("assistantSchedulePrefillLocation")}: ${scheduleIntent.location}`);
  }

  if (scheduleIntent.notes) {
    lines.push(`${t("assistantSchedulePrefillNotes")}: ${scheduleIntent.notes}`);
  }

  return makeResponse("schedule_creation", lines.join("\n"), [
    {
      label: t("assistantActionCreateAppointment"),
      target: "contractorDashboard",
      workCenterSection: "schedule",
      schedulePrefill: prefill,
    },
    {
      label: t("assistantActionEditDetails"),
      target: "contractorDashboard",
      workCenterSection: "schedule",
      schedulePrefill: prefill,
    },
    makeAssistantAction("schedule", language),
  ]);
}

function detectAssistantActionIntent(question, roleMode, language) {
  const text = String(question || "").toLowerCase();
  const copy = assistantCopy[language] || assistantCopy.en;
  const isBusinessMode = roleMode === "business";
  const sharedActionKeys = ["messages", "profile", "legal"];
  const professionalActionKeys = [
    "schedule",
    "leads",
    "quotes",
    "activeWork",
    "closure",
    "history",
    "businessTools",
    "quoteBuilder",
    "invoiceBuilder",
    "workCenter",
  ];

  const routeMatches = [
    {
      key: "quoteBuilder",
      intent: "open_quote_builder",
      pattern:
        /(create|build|draft|make|start|help me create|help me build).*(quote|proposal)|(?:crear|hacer|preparar|empezar).*(cotiz|propuesta)/,
    },
    {
      key: "invoiceBuilder",
      intent: "open_invoice_builder",
      pattern:
        /(create|build|draft|make|start).*(invoice)|(?:crear|hacer|preparar).*(factura)/,
    },
    {
      key: "schedule",
      intent: "open_schedule",
      pattern:
        /(?:open|show|go to|view).*(schedule|appointment|appointments|calendar)|(?:schedule|book|set up).*(visit|appointment|evaluation|consultation)|(?:abrir|mostrar|ver|ir a).*(agenda|cita|calendario)|(?:agendar|programar).*(visita|cita|evaluaci|consulta)/,
    },
    {
      key: "leads",
      intent: "open_opportunities",
      pattern:
        /(?:open|show|go to|view|review).*(opportunit|lead|request)|(?:abrir|mostrar|ver|revisar).*(oportunidad|lead|solicitud)/,
    },
    {
      key: "messages",
      intent: "open_messages",
      pattern:
        /(?:open|show|go to|view).*(message|messages|inbox|chat|conversation)|(?:abrir|mostrar|ver|ir a).*(mensaje|mensajes|bandeja|chat|conversaci)/,
    },
    {
      key: "quotes",
      intent: "open_quotes",
      pattern:
        /(?:open|show|go to|view|review).*(quote|quotes|proposal|proposals)|(?:abrir|mostrar|ver|revisar).*(cotiz|propuesta)/,
    },
    {
      key: "activeWork",
      intent: "open_active_work",
      pattern:
        /(?:open|show|go to|view).*(active work|active job|active jobs|jobs in progress|work in progress)|(?:abrir|mostrar|ver).*(trabajo activo|trabajos activos|trabajo en progreso)/,
    },
    {
      key: "closure",
      intent: "open_closure",
      pattern:
        /(?:open|show|go to|view).*(closure|closeout)|(?:abrir|mostrar|ver).*(cierre)/,
    },
    {
      key: "history",
      intent: "open_history",
      pattern:
        /(?:open|show|go to|view).*(history|records|past work)|(?:abrir|mostrar|ver).*(historial|registros)/,
    },
    {
      key: "businessTools",
      intent: "open_business_tools",
      pattern:
        /(?:open|show|go to|view).*(business tools|tools|business setup)|(?:abrir|mostrar|ver).*(herramientas|configuraci[oó]n del negocio)/,
    },
    {
      key: "profile",
      intent: "open_profile",
      pattern:
        /(?:open|show|go to|view).*(profile|account|settings)|(?:abrir|mostrar|ver).*(perfil|cuenta|configuraci[oó]n)/,
    },
    {
      key: "legal",
      intent: "open_legal",
      pattern:
        /(?:open|show|go to|view).*(legal|terms|privacy|policy|policies)|(?:abrir|mostrar|ver).*(legal|t[eé]rminos|privacidad|pol[ií]tica)/,
    },
    {
      key: "workCenter",
      intent: "open_work_center",
      pattern:
        /(?:open|show|go to|view).*(work center|work centre|operations)|(?:abrir|mostrar|ver).*(work center|operaciones)/,
    },
  ];

  const match = routeMatches.find((route) => route.pattern.test(text));
  if (!match) return null;

  if (!isBusinessMode && professionalActionKeys.includes(match.key)) {
    return makeResponse("professional_action_blocked", copy.professionalActionUnavailable, [
      makeAssistantAction("messages", language),
      makeAssistantAction("profile", language),
      makeAssistantAction("legal", language),
    ]);
  }

  const isAllowedSharedAction = sharedActionKeys.includes(match.key);
  if (!isBusinessMode && !isAllowedSharedAction) return null;

  return makeResponse(match.intent, copy.actionRoutingReady, [
    makeAssistantAction(match.key, language),
  ]);
}

function detectVoiceIntent(question, roleMode) {
  const text = String(question || "").toLowerCase();

  if (/(next|do next|what should|what's next|whats next|siguiente|hacer)/.test(text)) {
    return "suggested_next_step";
  }

  if (/(notification|notifications|alert|alerts|reminder|reminders|notificaci|alerta|recordatorio)/.test(text)) {
    return "notifications";
  }

  if (/(message|messages|unread|inbox|chat|mensaje|mensajes)/.test(text)) {
    return "unread_messages";
  }

  if (/(quote|quotes|proposal|payment|cotiz|pago|propuesta)/.test(text)) {
    return roleMode === "business" ? "pending_quotes" : "quote_status";
  }

  if (/(appointment|schedule|today|visit|cita|agenda|visita|hoy)/.test(text)) {
    return roleMode === "business" ? "schedule" : "appointment_status";
  }

  if (/(active|job|work|trabajo|activo)/.test(text)) {
    return roleMode === "business" ? "active_jobs" : "request_status";
  }

  if (/(request|status|happening|solicitud|estado|pasando)/.test(text)) {
    return "request_status";
  }

  return "suggested_next_step";
}

function formatAppointment(appointment, language) {
  if (!appointment) {
    return language === "es"
      ? "No encontré una cita vinculada todavía."
      : "I do not see a linked appointment yet.";
  }

  const title = appointment.title || appointment.requestTitle || appointment.projectTitle || "appointment";
  const date = appointment.date || "date pending";
  const time = appointment.time || "time pending";
  const status =
    appointment.customerConfirmationStatus ||
    appointment.confirmationStatus ||
    appointment.workflowStatus ||
    appointment.status ||
    "pending";

  return language === "es"
    ? `${title}: ${date} a las ${time}. Estado: ${status}.`
    : `${title}: ${date} at ${time}. Status: ${status}.`;
}

function getEvaluationToQuoteResponse(question, roleMode, language) {
  if (roleMode !== "business") return null;

  const text = String(question || "").toLowerCase();
  const hasVisitContext =
    /(visited|visit|saw|met|walked|walkthrough|evaluation|evaluated|inspected|went to|fui|visité|visita|evaluaci[oó]n|inspeccion)/.test(
      text
    );
  const hasQuoteNeed =
    /(create|make|send|draft|build|prepare|need).*(quote|proposal|estimate)|(?:quote|proposal|estimate).*(customer|client|send|create|draft)|(?:crear|hacer|enviar|preparar).*(cotiz|propuesta|estimado)/.test(
      text
    );

  if (!hasVisitContext || !hasQuoteNeed) return null;

  return makeResponse(
    "evaluation_to_quote_guidance",
    language === "es"
      ? "Puedo ayudar. Primero registra la evaluación para guardar lo que viste, materiales y notas. Después crea la cotización desde esa evaluación."
      : "I can help. Record the evaluation first so Meetro saves what you saw, materials, and notes. Then create the quote from that evaluation.",
    [
      {
        label: language === "es" ? "Notas de evaluación" : "Evaluation Notes",
        target: "contractorDashboard",
        workCenterSection: "schedule",
      },
      {
        label: language === "es" ? "Crear cotización" : "Create Quote",
        target: "quoteBuilder",
      },
      makeAssistantAction("schedule", language),
    ]
  );
}

function getVoiceResponse(question, roleMode, language, guide, currentPage = "") {
  const scheduleCreation = getScheduleCreationResponse(question, roleMode, language);
  if (scheduleCreation) return scheduleCreation;

  const evaluationToQuote = getEvaluationToQuoteResponse(question, roleMode, language);
  if (evaluationToQuote) return evaluationToQuote;

  const requestGuidance = getServiceRequestGuidanceResponse(
    question,
    roleMode,
    language,
    currentPage
  );
  if (requestGuidance) return requestGuidance;

  const actionResponse = detectAssistantActionIntent(question, roleMode, language);
  if (actionResponse) return actionResponse;

  const intent = detectVoiceIntent(question, roleMode);
  const unreadCount = getUnreadConversationCount();
  const latestConversation = getLatestConversation();
  const notificationRole = roleMode === "business" ? "professional" : "homeowner";
  const unreadNotificationCount = getMeetroUnreadNotificationCount(notificationRole);
  const latestNotification = getNotifications(notificationRole).find((item) => !item.read);
  const openMessagesAction = { label: language === "es" ? "Abrir mensajes" : "Open Messages", target: "messagesInbox" };

  if (intent === "notifications") {
    return makeResponse(
      intent,
      unreadNotificationCount > 0
        ? language === "es"
          ? `Tienes ${unreadNotificationCount} notificación(es) sin leer${latestNotification?.title ? `. La más reciente: ${latestNotification.title}.` : "."}`
          : `You have ${unreadNotificationCount} unread notification(s)${latestNotification?.title ? `. Latest: ${latestNotification.title}.` : "."}`
        : language === "es"
        ? "No veo notificaciones sin leer ahora."
        : "I do not see unread notifications right now.",
      [openMessagesAction]
    );
  }

  if (roleMode === "business") {
    const appointments = getUpcomingAppointments();
    const today = getLocalDateKey();
    const todaysAppointments = appointments.filter((item) => getAppointmentDateKey(item) === today);
    const nextAppointment = todaysAppointments[0] || appointments[0];
    const quoteSummary = getQuoteSummary();
    const emergency = getEmergencySummary();
    const activeWork = getActiveWorkSummary();
    const openScheduleAction = {
      label: language === "es" ? "Abrir agenda" : "Open Schedule",
      target: "contractorDashboard",
      workCenterSection: "schedule",
    };
    const openQuotesAction = {
      label: language === "es" ? "Abrir cotizaciones" : "Open Quotes",
      target: "contractorDashboard",
      workCenterSection: "quotes",
    };
    const openActiveWorkAction = {
      label: language === "es" ? "Abrir trabajo activo" : "Open Active Work",
      target: "contractorDashboard",
      workCenterSection: "active",
    };
    const openEmergencyAction = {
      label: language === "es" ? "Abrir emergencias" : "Open Emergency Center",
      target: "emergencyOperationsCenter",
    };
    const remindLaterAction = {
      label: language === "es" ? "Recordarme después" : "Remind Me Later",
      action: "dismiss",
    };

    if (intent === "suggested_next_step") {
      if (emergency.active) {
        return makeResponse(
          intent,
          language === "es"
            ? `Tienes una emergencia ${emergency.status} que necesita atención${emergency.customer ? ` para ${emergency.customer}` : ""}.`
            : `You have an emergency ${emergency.status} that needs attention${emergency.customer ? ` for ${emergency.customer}` : ""}.`,
          [openEmergencyAction, remindLaterAction]
        );
      }

      if (todaysAppointments.length > 0) {
        return makeResponse(
          intent,
          language === "es"
            ? `Tienes ${todaysAppointments.length} cita(s) programadas hoy. La próxima es ${formatAppointment(nextAppointment, language)}`
            : `You have ${todaysAppointments.length} appointment(s) scheduled today. Your next one is ${formatAppointment(nextAppointment, language)}`,
          [openScheduleAction, remindLaterAction]
        );
      }

      if (quoteSummary.accepted.length > 0) {
        return makeResponse(
          intent,
          language === "es"
            ? `Tienes ${quoteSummary.accepted.length} cotización aceptada lista para mover a trabajo activo.`
            : `You have ${quoteSummary.accepted.length} accepted quote ready to move into Active Work.`,
          [openQuotesAction, openActiveWorkAction]
        );
      }

      if (quoteSummary.revisions.length > 0 || quoteSummary.pending.length > 0) {
        return makeResponse(
          intent,
          language === "es"
            ? `Tienes ${quoteSummary.revisions.length} revisión(es) solicitadas y ${quoteSummary.pending.length} cotización(es) esperando respuesta.`
            : `You have ${quoteSummary.revisions.length} revision request(s) and ${quoteSummary.pending.length} quote(s) waiting for customer response.`,
          [openQuotesAction]
        );
      }

      if (unreadCount > 0) {
        return makeResponse(
          intent,
          language === "es"
            ? `Tienes ${unreadCount} mensaje(s) sin leer${latestConversation ? ` en ${getConversationLabel(latestConversation)}` : ""}.`
            : `You have ${unreadCount} unread message(s)${latestConversation ? ` in ${getConversationLabel(latestConversation)}` : ""}.`,
          [openMessagesAction]
        );
      }

      if (activeWork.count > 0) {
        return makeResponse(
          intent,
          language === "es"
            ? `${activeWork.service || "Tu trabajo activo"} está ${activeWork.status || "en progreso"}.`
            : `${activeWork.service || "Your active work"} is ${activeWork.status || "in progress"}.`,
          [openActiveWorkAction]
        );
      }

      return makeResponse(
        intent,
        language === "es"
          ? "No veo nada urgente ahora. Revisa Work Center para mantener el flujo al día."
          : "I do not see anything urgent right now. Review Work Center to keep the workflow moving.",
        [{ label: language === "es" ? "Abrir Work Center" : "Open Work Center", target: "contractorDashboard" }]
      );
    }

    if (intent === "schedule") {
      return makeResponse(
        intent,
        nextAppointment
          ? language === "es"
            ? `Tienes ${todaysAppointments.length} cita(s) hoy. La próxima: ${formatAppointment(nextAppointment, language)}`
            : `You have ${todaysAppointments.length} appointment(s) today. Next: ${formatAppointment(nextAppointment, language)}`
          : language === "es"
          ? "No veo citas programadas todavía."
          : "I do not see scheduled appointments yet.",
        [openScheduleAction]
      );
    }

    if (intent === "pending_quotes") {
      return makeResponse(
        intent,
        language === "es"
          ? `Cotizaciones: ${quoteSummary.pending.length} esperando, ${quoteSummary.revisions.length} con revisión solicitada, ${quoteSummary.accepted.length} aceptada(s) listas.`
          : `Quotes: ${quoteSummary.pending.length} waiting, ${quoteSummary.revisions.length} revision requested, ${quoteSummary.accepted.length} accepted and ready.`,
        [openQuotesAction]
      );
    }

    if (intent === "unread_messages") {
      return makeResponse(
        intent,
        language === "es"
          ? `Tienes ${unreadCount} mensaje(s) sin leer${latestConversation ? ` en ${getConversationLabel(latestConversation)}` : ""}.`
          : `You have ${unreadCount} unread message(s)${latestConversation ? ` in ${getConversationLabel(latestConversation)}` : ""}.`,
        [openMessagesAction]
      );
    }

    if (intent === "active_jobs") {
      return makeResponse(
        intent,
        activeWork.count > 0
          ? language === "es"
            ? `${activeWork.service || "Tu trabajo activo"} está ${activeWork.status || "en progreso"}.`
            : `${activeWork.service || "Your active work"} is ${activeWork.status || "in progress"}.`
          : language === "es"
          ? "No veo trabajo activo seleccionado ahora."
          : "I do not see a selected active job right now.",
        [openActiveWorkAction]
      );
    }

    return makeResponse(intent, guide.next, [
      { label: language === "es" ? "Abrir Work Center" : "Open Work Center", target: "contractorDashboard" },
    ]);
  }

  const request = getSelectedHomeownerRequest();
  const lifecycle = request ? getHomeownerLifecycleStage(request, language) : null;
  const appointment = getHomeownerAppointment(request);
  const homeownerQuotes = getHomeownerQuotes(request);
  const acceptedQuote = homeownerQuotes.find((quote) =>
    ["accepted", "approved", "quote_approved"].includes(getQuoteStatus(quote))
  );
  const pendingHomeownerQuotes = homeownerQuotes.filter((quote) =>
    ["sent", "quoted", "viewed", "pending"].includes(getQuoteStatus(quote))
  );
  const openRequestAction = {
    label: language === "es" ? "Abrir solicitud" : "Open Request",
    target: "myRequests",
  };

  if (intent === "appointment_status") {
    return makeResponse(intent, formatAppointment(appointment, language), [
      appointment ? openMessagesAction : openRequestAction,
    ]);
  }

  if (intent === "quote_status") {
    return makeResponse(
      intent,
      acceptedQuote
        ? language === "es"
          ? `Tu cotización está aceptada. El profesional puede mover el trabajo al siguiente paso.`
          : `Your quote is accepted. The professional can move the work to the next step.`
        : pendingHomeownerQuotes.length > 0
        ? language === "es"
          ? `Tienes ${pendingHomeownerQuotes.length} cotización(es) para revisar.`
          : `You have ${pendingHomeownerQuotes.length} quote(s) ready to review.`
        : language === "es"
        ? "No veo cotizaciones vinculadas todavía."
        : "I do not see linked quotes yet.",
      [openMessagesAction, openRequestAction]
    );
  }

  if (intent === "unread_messages") {
    return makeResponse(
      intent,
      language === "es"
        ? `Tienes ${unreadCount} mensaje(s) sin leer${latestConversation ? ` en ${getConversationLabel(latestConversation)}` : ""}.`
        : `You have ${unreadCount} unread message(s)${latestConversation ? ` in ${getConversationLabel(latestConversation)}` : ""}.`,
      [openMessagesAction]
    );
  }

  if (intent === "request_status") {
    return makeResponse(
      intent,
      request
        ? language === "es"
          ? `Tu solicitud está en ${lifecycle?.stageLabel || request.status || "progreso"}. Siguiente paso: ${lifecycle?.nextStep || guide.next}`
          : `Your request is at ${lifecycle?.stageLabel || request.status || "in progress"}. Next step: ${lifecycle?.nextStep || guide.next}`
        : language === "es"
        ? "No veo una solicitud activa todavía."
        : "I do not see an active request yet.",
      [openRequestAction],
      Boolean(request)
    );
  }

  if (appointment) {
    return makeResponse(
      intent,
      language === "es"
        ? `Tu siguiente paso es revisar la cita: ${formatAppointment(appointment, language)}`
        : `Your next step is to review the appointment: ${formatAppointment(appointment, language)}`,
      [openMessagesAction]
    );
  }

  if (pendingHomeownerQuotes.length > 0 || acceptedQuote) {
    return makeResponse(
      intent,
      acceptedQuote
        ? language === "es"
          ? "Tu cotización fue aceptada. Espera el siguiente paso del profesional."
          : "Your quote was accepted. Watch for the professional’s next step."
        : language === "es"
        ? "Tienes una cotización lista para revisar."
        : "You have a quote ready to review.",
      [openMessagesAction, openRequestAction]
    );
  }

  if (unreadCount > 0) {
    return makeResponse(
      intent,
      language === "es"
        ? `Tienes ${unreadCount} mensaje(s) sin leer.`
        : `You have ${unreadCount} unread message(s).`,
      [openMessagesAction]
    );
  }

  return makeResponse(intent, lifecycle?.nextStep || guide.next, [openRequestAction], Boolean(request));
}

function saveVoiceHistory(entry) {
  try {
    const history = safeJson("meetro_voice_test_history", []);
    const nextHistory = Array.isArray(history) ? [entry, ...history] : [entry];
    localStorage.setItem("meetro_voice_test_history", JSON.stringify(nextHistory));
  } catch {}
}

function normalizeVoiceName(name = "") {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function findVoiceByName(voices, voiceName, languagePrefix) {
  const normalizedTarget = normalizeVoiceName(voiceName);

  return voices.find((voice) => {
    const normalizedName = normalizeVoiceName(voice.name || "");
    const voiceLanguage = String(voice.lang || "").toLowerCase();
    const matchesLanguage = voiceLanguage.startsWith(languagePrefix);

    return matchesLanguage && normalizedName.includes(normalizedTarget);
  });
}

function getNaturalAssistantVoice(language) {
  try {
    if (!window.speechSynthesis?.getVoices) return null;

    const voices = window.speechSynthesis.getVoices() || [];
    const languageKey = language === "es" ? "es" : "en";
    const preferredPrefix = languageKey;
    const preferredLocale = language === "es" ? "es-US" : "en-US";
    const savedPreference =
      localStorage.getItem(VOICE_PREFERENCE_KEY) || "auto";

    if (savedPreference && savedPreference !== "auto") {
      const selectedVoice = findVoiceByName(
        voices,
        savedPreference,
        preferredPrefix
      );

      if (selectedVoice) return selectedVoice;
    }

    const rankedVoice = VOICE_QUALITY_ORDER[languageKey]
      .map((voiceName) => findVoiceByName(voices, voiceName, preferredPrefix))
      .find(Boolean);

    if (rankedVoice) return rankedVoice;

    const premiumVoice = voices.find((voice) => {
      const normalizedName = normalizeVoiceName(voice.name || "");
      const voiceLanguage = String(voice.lang || "").toLowerCase();

      return (
        voiceLanguage.startsWith(preferredPrefix) &&
        (normalizedName.includes("siri") ||
          normalizedName.includes("google") ||
          normalizedName.includes("enhanced") ||
          normalizedName.includes("premium"))
      );
    });

    if (premiumVoice) return premiumVoice;

    return (
      voices.find((voice) => voice.lang === preferredLocale) ||
      voices.find((voice) =>
        String(voice.lang || "").toLowerCase().startsWith(preferredPrefix)
      ) ||
      null
    );
  } catch {
    return null;
  }
}

function getPreferredVoice(language) {
  return getNaturalAssistantVoice(language);
}

function stopAssistantSpeech() {
  try {
    window.speechSynthesis?.cancel?.();
  } catch {}
}

function formatDateForAssistantSpeech(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeForAssistantSpeech(value) {
  const explicitTime = parseUserScheduleTime(value);
  if (explicitTime) return explicitTime.spoken;

  const match = String(value || "").match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return value;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return formatScheduleDisplayTime(hour, minute);
}

function numberWordForAssistantSpeech(value) {
  const number = Number(value);
  const words = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
  ];

  return Number.isInteger(number) && number >= 0 && number <= 10
    ? words[number]
    : value;
}

function normalizeAssistantSpeechText(text) {
  return String(text || "")
    .replace(/\bAssistant Response\b:?/gi, "")
    .replace(/\bMeetro says\b:?/gi, "")
    .replace(/\bappointment\(s\)/gi, "appointments")
    .replace(/\bquote\(s\)/gi, "quotes")
    .replace(/\bmessage\(s\)/gi, "messages")
    .replace(/\bjob\(s\)/gi, "jobs")
    .replace(/\brequest\(s\)/gi, "requests")
    .replace(/\bnotification\(s\)/gi, "notifications")
    .replace(/\bconversation\(s\)/gi, "conversations")
    .replace(/\b(\d+)\s+(appointments|quotes|messages|jobs|requests|notifications|conversations)\b/gi, (_match, count, noun) => `${numberWordForAssistantSpeech(count)} ${noun}`)
    .replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (_match, date) => formatDateForAssistantSpeech(date))
    .replace(/\b(\d{1,2})(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)(?=\s|$|[,.!?])/gi, (match) =>
      formatTimeForAssistantSpeech(match)
    )
    .replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b(?!\s*(?:AM|PM|A\.M\.|P\.M\.))/gi, (_match, hour, minute) =>
      formatTimeForAssistantSpeech(`${hour}:${minute}`)
    )
    .replace(/\bStatus:\s*/gi, "Status is ")
    .replace(/\bNext:\s*Visit\b/g, "Your next visit")
    .replace(/\bNext:\s*Appointment\b/g, "Your next appointment")
    .replace(/\bNext:\s*/gi, "Your next ")
    .replace(/\bDate:\s*/gi, "Date is ")
    .replace(/\bTime:\s*/gi, "Time is ")
    .replace(/\bLocation:\s*/gi, "Location is ")
    .replace(/\bNotes:\s*/gi, "Notes are ")
    .replace(/[•·]/g, ". ")
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*:\s*(?=[A-Z][a-z]+\s+\d{1,2},\s+\d{4}\b)/g, " is ")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/([.!?])\s+/g, "$1 ")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function speakAssistantText(text, language, handlers = {}) {
  try {
    if (!text || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      return false;
    }

    stopAssistantSpeech();

    const utterance = new SpeechSynthesisUtterance(
      normalizeAssistantSpeechText(text)
    );
    utterance.lang = language === "es" ? "es-US" : "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const preferredVoice = getNaturalAssistantVoice(language);

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = handlers.onStart;
    utterance.onend = handlers.onEnd;
    utterance.onerror = handlers.onError;

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    handlers.onError?.();
    return false;
  }
}

function isNativeSpeechUnavailable(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("not implemented") ||
    message.includes("not available") ||
    message.includes("unavailable") ||
    message.includes("plugin")
  );
}

function hasDeniedSpeechPermission(permissions = {}) {
  return Object.values(permissions).some((value) =>
    ["denied", "restricted"].includes(String(value || "").toLowerCase())
  );
}

function hasGrantedSpeechPermission(permissions = {}) {
  const values = Object.values(permissions);
  return (
    values.length > 0 &&
    values.every((value) =>
      ["granted", "authorized"].includes(String(value || "").toLowerCase())
    )
  );
}

function extractNativeSpeechTranscript(result = {}) {
  const matches = result.matches || result.value || result.results || result.transcripts || [];

  if (Array.isArray(matches)) {
    return String(matches[0] || "").trim();
  }

  return String(matches || result.transcript || "").trim();
}

function getAssistantFirstName() {
  const storedName =
    localStorage.getItem("userName") ||
    localStorage.getItem("profileName") ||
    safeJson("currentUser", {})?.name ||
    "";

  return String(storedName || "").trim().split(/\s+/)[0] || "";
}

function MeetroAssistant({ currentPage = "", setPage }) {
  const [open, setOpen] = useState(false);
  const [launcherPosition, setLauncherPosition] = useState(null);
  const [assistantClosing, setAssistantClosing] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [feedbackFormOpen, setFeedbackFormOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState("");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackCount, setFeedbackCount] = useState(() => getFeedbackCount());
  const [feedbackCopied, setFeedbackCopied] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceAnswer, setVoiceAnswer] = useState("");
  const [voiceIntent, setVoiceIntent] = useState("");
  const [voiceActions, setVoiceActions] = useState([]);
  const [voiceError, setVoiceError] = useState("");
  const [readAloud, setReadAloud] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [voiceThinking, setVoiceThinking] = useState(false);
  const [voiceResponseUnavailable, setVoiceResponseUnavailable] = useState(false);
  const [showAllEmergencyTips, setShowAllEmergencyTips] = useState(false);
  const [showAdvancedHelp, setShowAdvancedHelp] = useState(false);
  const lastInputModeRef = useRef("typed");
  const launcherDragRef = useRef(null);
  const voiceThinkingTimerRef = useRef(null);
  const assistantCloseTimerRef = useRef(null);
  const browserSpeechRecognitionRef = useRef(null);
  const language = getLanguage();
  const copy = assistantCopy[language] || assistantCopy.en;
  const guide = useMemo(
    () => getScreenGuide(currentPage, language),
    [currentPage, language]
  );
  const roleLabel = getRoleLabel(currentPage, language);
  const isChat = currentPage === "conversationThread" || currentPage === "emergencyChat";
  const launcherBottomClearance = isChat ? 104 : 94;
  const launcherFallbackBottom = `calc(${launcherBottomClearance}px + env(safe-area-inset-bottom))`;
  const launcherPositionOptions = {
    ...AI_BUTTON_POSITION_DEFAULTS,
    bottomClearance: launcherBottomClearance,
  };
  const isBusinessMode =
    getAccountModeForPage(
      currentPage,
      localStorage.getItem("activeAccountMode") || "personal"
    ) === "business";
  const roleMode = isBusinessMode ? "business" : "personal";
  const serviceRequestContext = getServiceRequestContext(currentPage, roleMode, language);
  const voiceTips = serviceRequestContext.active
    ? getServiceRequestVoiceTips(roleMode)
    : isBusinessMode
    ? copy.professionalVoiceTips
    : copy.homeownerVoiceTips;
  const notificationRole = isBusinessMode ? "professional" : "homeowner";
  const unreadNotificationCount = getMeetroUnreadNotificationCount(notificationRole);
  const isEmergencyContext = isEmergencyAssistantContext(currentPage);
  const emergencyTips = isBusinessMode
    ? copy.professionalEmergencyTips
    : copy.homeownerEmergencyTips;
  const visibleEmergencyTips = showAllEmergencyTips
    ? emergencyTips
    : emergencyTips.slice(0, 3);
  const voiceResponseSupported =
    typeof window !== "undefined" &&
    Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
  const voiceStatusLabel = assistantSpeaking
    ? t("speaking")
    : voiceListening
    ? copy.voiceListening
    : voiceThinking
    ? t("assistantThinking")
    : t("assistantReady");
  const assistantMode = assistantSpeaking
    ? "speaking"
    : voiceListening
    ? "listening"
    : voiceThinking
    ? "thinking"
    : "ready";
  const assistantFirstName = getAssistantFirstName() || copy.assistantGreetingFallback;

  function getLauncherViewport() {
    return {
      width: typeof window === "undefined" ? 0 : window.innerWidth,
      height: typeof window === "undefined" ? 0 : window.innerHeight,
    };
  }

  useEffect(() => {
    return () => {
      stopAssistantSpeech();
      if (voiceThinkingTimerRef.current) {
        window.clearTimeout(voiceThinkingTimerRef.current);
      }
      if (assistantCloseTimerRef.current) {
        window.clearTimeout(assistantCloseTimerRef.current);
      }
      try {
        browserSpeechRecognitionRef.current?.abort?.();
      } catch {}
      stopNativeSpeechRecognitionQuietly();
    };
  }, []);

  useEffect(() => {
    const storedPosition = readStoredAiButtonPosition({
      viewport: getLauncherViewport(),
      options: launcherPositionOptions,
    });
    setLauncherPosition(storedPosition);
  }, [launcherBottomClearance]);

  useEffect(() => {
    function handleViewportChange() {
      setLauncherPosition((currentPosition) => {
        if (!currentPosition) return currentPosition;
        return clampAiButtonPosition(
          currentPosition,
          getLauncherViewport(),
          launcherPositionOptions
        );
      });
    }

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
    };
  }, [launcherBottomClearance]);

  useEffect(() => {
    if (!open) return undefined;

    function handleAssistantKeyDown(event) {
      if (event.key === "Escape") {
        closeAssistant();
      }
    }

    window.addEventListener("keydown", handleAssistantKeyDown);

    return () => {
      window.removeEventListener("keydown", handleAssistantKeyDown);
    };
  }, [open]);

  useEffect(() => {
    stopAssistantSpeech();
    setAssistantSpeaking(false);
  }, [currentPage]);

  useEffect(() => {
    if (!open) {
      stopAssistantSpeech();
      setAssistantSpeaking(false);
    }
  }, [open]);

  const quickActions = (guide.actions || copy.fallback.actions || []).filter((action) => {
    if (!isBusinessMode && ["workCenter", "leads", "schedule", "quotes"].includes(action)) {
      return false;
    }

    if (isBusinessMode && ["requestService", "myRequests", "discover"].includes(action)) {
      return false;
    }

    return true;
  });

  function getStoredFeedback(key) {
    try {
      const savedFeedback = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(savedFeedback) ? savedFeedback : [];
    } catch {
      return [];
    }
  }

  function getFeedbackCount() {
    try {
      return getStoredFeedback("meetro_testflight_review_queue").length;
    } catch {
      return 0;
    }
  }

  function saveFeedback() {
    const context = getSelectedContext();
    const roleMode = getAccountModeForPage(
      currentPage,
      localStorage.getItem("activeAccountMode") || "personal"
    );
    const category = feedbackCategory || copy.feedbackCategories[0];
    const feedbackItem = {
      id: `feedback-${Date.now()}`,
      screen: currentPage || "unknown",
      screenName: guide.name,
      timestamp: new Date().toISOString(),
      roleMode,
      role: roleMode,
      mode: roleMode,
      route: window.location.hash || currentPage || "",
      page: currentPage || "unknown",
      category,
      feedbackCategory: category,
      note: feedbackNote.trim(),
      requestId: context.selectedRequestId,
      selectedRequestId: context.selectedRequestId,
      selectedJobId: context.selectedJobId,
      conversationId: context.conversationId,
      appointmentId: context.appointmentId,
      quoteId: context.quoteId,
      workCenterSection: context.workCenterSection,
      type: "confusing",
    };

    try {
      ["meetro_ai_test_feedback", "meetro_testflight_review_queue"].forEach((key) => {
        const savedFeedback = getStoredFeedback(key);
        localStorage.setItem(key, JSON.stringify([feedbackItem, ...savedFeedback]));
      });
      setFeedbackSaved(true);
      setFeedbackFormOpen(false);
      setFeedbackCategory("");
      setFeedbackNote("");
      setFeedbackCount(getFeedbackCount());
    } catch {
      setFeedbackSaved(true);
    }
  }

  function stopAssistantVoiceResponse() {
    stopAssistantSpeech();
    setAssistantSpeaking(false);
  }

  function speakAssistantResponseText(responseText) {
    if (!responseText) return false;

    if (!voiceResponseSupported) {
      setVoiceResponseUnavailable(true);
      return false;
    }

    setVoiceResponseUnavailable(false);

    const started = speakAssistantText(responseText, language, {
      onStart: () => setAssistantSpeaking(true),
      onEnd: () => setAssistantSpeaking(false),
      onError: () => {
        setAssistantSpeaking(false);
        setVoiceResponseUnavailable(true);
      },
    });

    if (!started) {
      setVoiceResponseUnavailable(true);
    }

    return started;
  }

  function speakCurrentAssistantResponse() {
    speakAssistantResponseText(voiceAnswer);
  }

  function showVoiceThinkingBriefly() {
    if (voiceThinkingTimerRef.current) {
      window.clearTimeout(voiceThinkingTimerRef.current);
    }

    setVoiceThinking(true);
    voiceThinkingTimerRef.current = window.setTimeout(() => {
      setVoiceThinking(false);
      voiceThinkingTimerRef.current = null;
    }, 450);
  }

  function toggleAssistantVoiceResponse() {
    if (assistantSpeaking) {
      stopAssistantVoiceResponse();
      return;
    }

    speakCurrentAssistantResponse();
  }

  async function copyFeedbackSummary() {
    const queue = getStoredFeedback("meetro_testflight_review_queue");
    const summary = queue
      .slice(0, 12)
      .map((item, index) =>
        [
          `#${index + 1} ${item.timestamp || ""}`,
          `Screen: ${item.screenName || item.screen || ""}`,
          `Role: ${item.roleMode || ""}`,
          `Category: ${item.feedbackCategory || item.category || ""}`,
          `Note: ${item.note || ""}`,
          `Request: ${item.requestId || item.selectedRequestId || ""}`,
          `Conversation: ${item.conversationId || ""}`,
          `Appointment: ${item.appointmentId || ""}`,
          `Quote: ${item.quoteId || ""}`,
        ].join("\n")
      )
      .join("\n\n");

    try {
      await navigator.clipboard?.writeText(summary || "No feedback saved yet.");
      setFeedbackCopied(true);
    } catch {
      setFeedbackCopied(false);
    }
  }

  function processVoiceQuestion(question, options = {}) {
    stopAssistantVoiceResponse();
    setVoiceResponseUnavailable(false);
    showVoiceThinkingBriefly();

    const inputMode = options.inputMode || lastInputModeRef.current || "typed";
    lastInputModeRef.current = inputMode;

    const roleMode = getAccountModeForPage(
      currentPage,
      localStorage.getItem("activeAccountMode") || "personal"
    );
    const response = getVoiceResponse(question, roleMode, language, guide, currentPage);
    const context = getSelectedContext();

    setVoiceTranscript(question);
    setVoiceAnswer(response.answer);
    setVoiceIntent(response.intent);
    setVoiceActions(Array.isArray(response.actions) ? response.actions : []);
    setVoiceError("");

    saveVoiceHistory({
      id: `voice-${Date.now()}`,
      question,
      recognizedIntent: response.intent,
      timestamp: new Date().toISOString(),
      role: roleMode,
      screen: currentPage || "unknown",
      success: response.success,
      actions: Array.isArray(response.actions)
        ? response.actions.map((action) => action.label || action.target || action.action)
        : [],
      requestId: context.selectedRequestId,
      conversationId: context.conversationId,
      appointmentId: context.appointmentId,
      quoteId: context.quoteId,
    });

    if (response.answer && (inputMode === "voice" || readAloud)) {
      speakAssistantResponseText(response.answer);
    }

    lastInputModeRef.current = "typed";
  }

  async function startNativeVoiceInput() {
    stopAssistantVoiceResponse();
    lastInputModeRef.current = "voice";

    if (!Capacitor.isNativePlatform?.()) return false;

    let partialResultsListener = null;

    try {
      const availability = await NativeSpeechRecognition.available?.();
      const isAvailable =
        availability?.available ??
        availability?.speechRecognition ??
        availability?.value ??
        true;

      if (isAvailable === false) return false;

      const currentPermissions =
        (await NativeSpeechRecognition.checkPermissions?.().catch(() => null)) || {};

      if (!hasGrantedSpeechPermission(currentPermissions)) {
        if (hasDeniedSpeechPermission(currentPermissions)) {
          setVoiceError(copy.voiceUnsupported);
          setVoiceAnswer("");
          setVoiceActions([]);
          return true;
        }

        const requestedPermissions =
          (await NativeSpeechRecognition.requestPermissions?.().catch(() => null)) || {};

        if (!hasGrantedSpeechPermission(requestedPermissions)) {
          setVoiceError(copy.voiceUnsupported);
          setVoiceAnswer("");
          setVoiceActions([]);
          return true;
        }
      }

      setVoiceListening(true);
      setVoiceError("");

      partialResultsListener = await NativeSpeechRecognition.addListener?.(
        "partialResults",
        (data) => {
          const transcript = extractNativeSpeechTranscript(data);
          if (transcript) setVoiceTranscript(transcript);
        }
      );

      const result = await NativeSpeechRecognition.start({
        language: language === "es" ? "es-US" : "en-US",
        maxResults: 1,
        partialResults: true,
        popup: false,
        prompt:
          language === "es"
            ? "Pregunta a Meetro"
            : "Ask Meetro",
      });
      const transcript = extractNativeSpeechTranscript(result);

      if (transcript) {
        processVoiceQuestion(transcript, { inputMode: "voice" });
      } else {
        setVoiceError(
          language === "es"
            ? "No pude escuchar claramente. Toca una pregunta abajo o intenta de nuevo."
            : "I could not hear that clearly. Tap a question below or try again."
        );
      }

      return true;
    } catch (error) {
      if (isNativeSpeechUnavailable(error)) return false;

      setVoiceError(copy.voiceUnsupported);
      setVoiceAnswer("");
      setVoiceActions([]);
      saveVoiceHistory({
        id: `voice-${Date.now()}`,
        question: "",
        recognizedIntent: "native_speech_error",
        timestamp: new Date().toISOString(),
        role: getAccountModeForPage(
          currentPage,
          localStorage.getItem("activeAccountMode") || "personal"
        ),
        screen: currentPage || "unknown",
        success: false,
        failureReason: "native_speech_unavailable",
      });
      return true;
    } finally {
      setVoiceListening(false);
      await stopNativeSpeechRecognitionQuietly();
      try {
        await partialResultsListener?.remove?.();
      } catch {}
    }
  }

  async function startVoiceInput() {
    stopAssistantVoiceResponse();
    lastInputModeRef.current = "voice";

    const usedNativeSpeech = await startNativeVoiceInput();
    if (usedNativeSpeech) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(copy.voiceUnsupported);
      setVoiceAnswer("");
      setVoiceActions([]);
      saveVoiceHistory({
        id: `voice-${Date.now()}`,
        question: "",
        recognizedIntent: "unsupported",
        timestamp: new Date().toISOString(),
        role: getAccountModeForPage(
          currentPage,
          localStorage.getItem("activeAccountMode") || "personal"
        ),
        screen: currentPage || "unknown",
        success: false,
        failureReason: "speech_recognition_unavailable",
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      browserSpeechRecognitionRef.current = recognition;
      recognition.lang = language === "es" ? "es-US" : "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setVoiceListening(true);
        setVoiceError("");
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results || [])
          .map((result) => result?.[0]?.transcript || "")
          .join(" ")
          .trim();

        if (transcript) {
          processVoiceQuestion(transcript, { inputMode: "voice" });
        }
      };

      recognition.onerror = (event) => {
        setVoiceError(
          event?.error === "not-allowed" || event?.error === "service-not-allowed"
            ? copy.voiceUnsupported
            : language === "es"
            ? "No pude escuchar claramente. Intenta de nuevo."
            : "I could not hear that clearly. Try again."
        );
        saveVoiceHistory({
          id: `voice-${Date.now()}`,
          question: "",
          recognizedIntent: "speech_error",
          timestamp: new Date().toISOString(),
          role: getAccountModeForPage(
            currentPage,
            localStorage.getItem("activeAccountMode") || "personal"
          ),
          screen: currentPage || "unknown",
          success: false,
          failureReason: event?.error || "unknown",
        });
      };

      recognition.onend = () => {
        setVoiceListening(false);
        browserSpeechRecognitionRef.current = null;
      };
      recognition.start();
    } catch (error) {
      setVoiceListening(false);
      setVoiceError(copy.voiceUnsupported);
    }
  }

  function handleQuickAction(action) {
    const target = actionTargets[action];
    if (!target || !setPage) return;

    const workCenterSections = {
      schedule: "schedule",
      quotes: "quotes",
      activeWork: "active",
      closure: "closure",
      history: "history",
    };
    const section = workCenterSections[action];
    if (section) {
      localStorage.setItem("meetroWorkCenterTab", section);
      localStorage.setItem("activeWorkCenterTab", section);
    }

    stopAssistantVoiceResponse();
    setOpen(false);
    setPage(target);
  }

  function handleVoiceAction(action) {
    if (!action) return;

    if (action.action === "dismiss") {
      stopAssistantVoiceResponse();
      setOpen(false);
      return;
    }

    if (action.workCenterSection) {
      localStorage.setItem("meetroWorkCenterTab", action.workCenterSection);
      localStorage.setItem("activeWorkCenterTab", action.workCenterSection);
    }

    if (action.schedulePrefill) {
      try {
        localStorage.setItem(
          "meetroAssistantSchedulePrefill",
          JSON.stringify(action.schedulePrefill)
        );
      } catch {}
    }

    if (action.selectedRequestId) {
      localStorage.setItem("selectedHomeownerRequestId", String(action.selectedRequestId));
      localStorage.setItem("selectedQuoteRequestId", String(action.selectedRequestId));
    }

    if (action.request) {
      try {
        localStorage.setItem("selectedHomeownerRequest", JSON.stringify(action.request));
        localStorage.setItem("selectedChangeOrderRequest", JSON.stringify(action.request));
        localStorage.setItem("selectedQuoteRequest", JSON.stringify(action.request));
      } catch {}
    }

    if (action.conversationId) {
      localStorage.setItem("activeConversationId", action.conversationId);
    }

    if (action.action === "edit_request") {
      localStorage.setItem("meetroAssistantRequestAction", "edit_request");
    }

    if (action.action === "request_change" && action.request) {
      try {
        localStorage.setItem("selectedChangeOrderRequest", JSON.stringify(action.request));
      } catch {}
    }

    if (!action.target || !setPage) return;

    stopAssistantVoiceResponse();
    setOpen(false);
    setPage(action.target);
  }

  function closeAssistant() {
    if (assistantClosing) return;

    stopAssistantVoiceResponse();
    setVoiceListening(false);
    setVoiceThinking(false);

    try {
      browserSpeechRecognitionRef.current?.abort?.();
      browserSpeechRecognitionRef.current = null;
    } catch {}

    stopNativeSpeechRecognitionQuietly();

    setAssistantClosing(true);

    if (assistantCloseTimerRef.current) {
      window.clearTimeout(assistantCloseTimerRef.current);
    }

    assistantCloseTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setAssistantClosing(false);
      assistantCloseTimerRef.current = null;
    }, 180);
  }

  function openAssistantFromLauncher() {
    if (assistantCloseTimerRef.current) {
      window.clearTimeout(assistantCloseTimerRef.current);
      assistantCloseTimerRef.current = null;
    }
    stopAssistantVoiceResponse();
    setAssistantClosing(false);
    setVoiceListening(false);
    setVoiceThinking(false);
    setVoiceTranscript("");
    setVoiceAnswer("");
    setVoiceIntent("");
    setVoiceActions([]);
    setVoiceError("");
    setVoiceResponseUnavailable(false);
    lastInputModeRef.current = "typed";
    setOpen(true);
    setFeedbackSaved(false);
  }

  function handleLauncherPointerDown(event) {
    if (open) return;
    const rect = event.currentTarget.getBoundingClientRect();
    launcherDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
      suppressClick: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleLauncherPointerMove(event) {
    const dragState = launcherDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(deltaX, deltaY) < 6) return;

    dragState.moved = true;
    dragState.suppressClick = true;
    event.preventDefault();

    const nextPosition = clampAiButtonPosition(
      {
        x: event.clientX - dragState.offsetX,
        y: event.clientY - dragState.offsetY,
      },
      getLauncherViewport(),
      launcherPositionOptions
    );

    dragState.lastPosition = nextPosition;
    setLauncherPosition(nextPosition);
  }

  function handleLauncherPointerUp(event) {
    const dragState = launcherDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (dragState.moved) {
      event.preventDefault();
      const fallbackPosition = {
        x: event.clientX - dragState.offsetX,
        y: event.clientY - dragState.offsetY,
      };
      const snappedPosition = writeStoredAiButtonPosition(
        dragState.lastPosition || launcherPosition || fallbackPosition,
        {
          viewport: getLauncherViewport(),
          options: launcherPositionOptions,
        }
      );
      setLauncherPosition(snappedPosition);
    }

    launcherDragRef.current = {
      ...dragState,
      suppressClick: dragState.moved,
    };

    window.setTimeout(() => {
      if (launcherDragRef.current?.pointerId === event.pointerId) {
        launcherDragRef.current = null;
      }
    }, 0);
  }

  function handleLauncherClick(event) {
    if (launcherDragRef.current?.suppressClick) {
      event.preventDefault();
      launcherDragRef.current = null;
      return;
    }

    openAssistantFromLauncher();
  }

  const launcherPositionStyle = launcherPosition
    ? {
        left: `${launcherPosition.x}px`,
        top: `${launcherPosition.y}px`,
        right: "auto",
        bottom: "auto",
      }
    : {
        right: "max(12px, env(safe-area-inset-right, 0px))",
        bottom: launcherFallbackBottom,
      };

  return (
    <>
      <button
        className="meetro-assistant-launcher"
        type="button"
        aria-label={copy.buttonLabel}
        onPointerDown={handleLauncherPointerDown}
        onPointerMove={handleLauncherPointerMove}
        onPointerUp={handleLauncherPointerUp}
        onPointerCancel={handleLauncherPointerUp}
        onClick={handleLauncherClick}
        style={{
          ...assistantButton,
          ...launcherPositionStyle,
        }}
      >
        AI
      </button>

      {open && (
        <div
          className={`meetro-assistant-overlay ${
            assistantClosing ? "meetro-assistant-overlay-closing" : "meetro-assistant-overlay-open"
          }`}
          style={assistantOverlay}
          onClick={closeAssistant}
        >
          <div
            className={`meetro-assistant-presence meetro-assistant-presence-${assistantMode} ${
              assistantClosing ? "meetro-assistant-presence-closing" : "meetro-assistant-presence-open"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="meetro-assistant-ambient-glow" aria-hidden="true" />
            <div className="meetro-assistant-ambient-ring" aria-hidden="true" />

          <div
            className={`meetro-assistant-sheet meetro-assistant-sheet-${assistantMode}`}
            style={{
              ...assistantSheet,
              ...(assistantModeGlow[assistantMode] || assistantModeGlow.ready),
              paddingBottom: isChat
                ? "calc(18px + env(safe-area-inset-bottom))"
                : "calc(22px + env(safe-area-inset-bottom))",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={assistantHandle} />

            <div style={assistantHeader}>
              <div>
                <span style={assistantEyebrow}>{roleLabel}</span>
                <h2 style={assistantTitle}> {copy.assistantName}</h2>
                <p style={assistantGreetingText}>
                  {copy.assistantGreetingPrefix} {assistantFirstName},
                </p>
                <p style={assistantPromptText}>{copy.assistantGreetingPrompt}</p>
              </div>

              <button type="button" style={assistantCloseButton} onClick={closeAssistant}>
                {copy.close}
              </button>
            </div>

            <div style={voiceCard}>
              <div style={voiceHero}>
                <button
                  type="button"
                  style={{
                    ...voiceButton,
                    ...(voiceListening ? voiceButtonListening : {}),
                    ...(voiceThinking ? voiceButtonThinking : {}),
                    ...(assistantSpeaking ? voiceButtonSpeaking : {}),
                  }}
                  onClick={startVoiceInput}
                  disabled={voiceListening}
                  aria-label={copy.voiceButton}
                >
                  {voiceListening ? "…" : ""}
                </button>

                <div style={voiceHeroText}>
                  <div style={voiceTitleRow}>
                    <strong style={voiceTitle}>{copy.tapToTalk}</strong>
                    <span
                      style={{
                        ...voiceStatusPill,
                        ...(voiceStatusStyles[assistantMode] || voiceStatusStyles.ready),
                      }}
                    >
                      <span style={voiceStatusDot} />
                      {voiceStatusLabel}
                    </span>
                  </div>
                  <p style={voiceHintText}>{t("assistantHeyMeetroHint")}</p>
                </div>
              </div>

              {voiceAnswer && (
                <div style={voiceAnswerBox}>
                  <div style={voiceAnswerHeader}>
                    <span style={assistantLabel}>
                      {copy.assistantResponseLabel || copy.answerLabel}
                    </span>

                    {voiceResponseSupported ? (
                      <button
                        type="button"
                        style={{
                          ...voiceSpeakButton,
                          ...(assistantSpeaking ? voiceSpeakButtonActive : {}),
                        }}
                        onClick={toggleAssistantVoiceResponse}
                        aria-label={
                          assistantSpeaking
                            ? t("stopSpeaking")
                            : t("speakResponse")
                        }
                      >
                        {assistantSpeaking ? "■" : ""}{" "}
                        {assistantSpeaking ? t("stopSpeaking") : t("speakResponse")}
                      </button>
                    ) : (
                      <span style={voiceUnavailablePill}>
                        {t("voiceResponseUnavailable")}
                      </span>
                    )}
                  </div>

                  <p style={voiceAnswerText}>{voiceAnswer}</p>
                  {assistantSpeaking && (
                    <span style={voiceSpeakingPill}>{t("speaking")}</span>
                  )}
                  {voiceResponseUnavailable && (
                    <p style={voiceErrorText}>{t("voiceResponseUnavailable")}</p>
                  )}
                  {voiceIntent && <span style={voiceIntentPill}>{voiceIntent}</span>}

                  {voiceActions.length > 0 && (
                    <div style={voiceActionGrid}>
                      {voiceActions.map((action, index) => (
                        <button
                          key={`${action.label || action.target || action.action}-${index}`}
                          type="button"
                          style={voiceActionButton}
                          onClick={() => handleVoiceAction(action)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {voiceTranscript && (
                <div style={voiceResultBox}>
                  <span style={assistantLabel}>{copy.transcriptLabel}</span>
                  <p style={voiceTranscriptText}>{voiceTranscript}</p>
                </div>
              )}

              {voiceError && <p style={voiceErrorText}>{voiceError}</p>}

              <div style={voiceTipsSection}>
                <span style={voiceTipsTitle}>{copy.voiceTipsTitle}</span>
                <div style={voiceTipsGrid}>
                  {voiceTips.map((tip) => (
                    <button
                      key={tip}
                      type="button"
                      style={voiceTipChip}
                      onClick={() => processVoiceQuestion(tip)}
                    >
                      {tip}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {quickActions.length > 0 && (
              <div style={assistantQuickActions}>
                <span style={assistantLabel}>{copy.quickHelpLabel}</span>
                <div style={assistantActionGrid}>
                  {quickActions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      style={assistantActionButton}
                      onClick={() => handleQuickAction(action)}
                    >
                      {copy.actions[action] || action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              style={advancedToggle}
              onClick={() => setShowAdvancedHelp((current) => !current)}
            >
              {showAdvancedHelp ? copy.hideDetails : copy.assistantDetails}
            </button>

            {showAdvancedHelp && (
              <div style={advancedPanel}>
                <div style={assistantInfoCard}>
                  <span style={assistantLabel}>{copy.screenLabel}</span>
                  <strong style={assistantScreenName}>{guide.name}</strong>
                </div>

                <div style={assistantStack}>
                  <section style={assistantSection}>
                    <span style={assistantLabel}>{copy.nextStepLabel}</span>
                    <p style={assistantText}>{guide.next}</p>
                  </section>
                </div>

                <label style={voiceReadAloudLabel}>
                  <input
                    type="checkbox"
                    checked={readAloud}
                    onChange={(event) => setReadAloud(event.target.checked)}
                  />
                  {copy.readAloudLabel}
                </label>

                <span style={assistantNotificationPill}>
                  {copy.notificationCount}: {unreadNotificationCount}
                </span>

                {isEmergencyContext && (
                  <section style={emergencyTipsCard}>
                    <div style={emergencyTipsHeader}>
                      <span style={emergencyTipsTitle}>{copy.emergencyTipsTitle}</span>
                      {emergencyTips.length > 3 && (
                        <button
                          type="button"
                          style={emergencyTipsToggle}
                          onClick={() => setShowAllEmergencyTips((current) => !current)}
                        >
                          {showAllEmergencyTips ? copy.showLessTips : copy.showMoreTips}
                        </button>
                      )}
                    </div>

                    <ul style={emergencyTipsList}>
                      {visibleEmergencyTips.map((tip) => (
                        <li key={tip} style={emergencyTipItem}>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {!feedbackFormOpen ? (
                  <button
                    type="button"
                    style={feedbackButton}
                    onClick={() => {
                      setFeedbackFormOpen(true);
                      setFeedbackSaved(false);
                      setFeedbackCopied(false);
                      setFeedbackCategory(copy.feedbackCategories[0]);
                    }}
                  >
                    {copy.feedbackButton}
                  </button>
                ) : (
                  <div style={feedbackFormCard}>
                    <label style={feedbackFormLabel}>
                      {copy.feedbackCategoryLabel}
                      <select
                        value={feedbackCategory}
                        onChange={(event) => setFeedbackCategory(event.target.value)}
                        style={feedbackSelect}
                      >
                        {copy.feedbackCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={feedbackFormLabel}>
                      {copy.feedbackNoteLabel}
                      <textarea
                        value={feedbackNote}
                        onChange={(event) => setFeedbackNote(event.target.value)}
                        placeholder={copy.feedbackNotePlaceholder}
                        style={feedbackTextarea}
                      />
                    </label>

                    <div style={feedbackFormActions}>
                      <button type="button" style={feedbackSubmitButton} onClick={saveFeedback}>
                        {copy.feedbackSubmit}
                      </button>

                      <button
                        type="button"
                        style={feedbackCancelButton}
                        onClick={() => {
                          setFeedbackFormOpen(false);
                          setFeedbackCategory("");
                          setFeedbackNote("");
                        }}
                      >
                        {copy.feedbackCancel}
                      </button>
                    </div>
                  </div>
                )}

                {feedbackSaved && <p style={feedbackSavedText}>{copy.feedbackSaved}</p>}

                <div style={feedbackReviewRow}>
                  <span>
                    {copy.feedbackCount}: {feedbackCount}
                  </span>

                  <button type="button" style={feedbackCopyButton} onClick={copyFeedbackSummary}>
                    {copy.copyFeedbackSummary}
                  </button>
                </div>

                {feedbackCopied && <p style={feedbackCopiedText}>{copy.copiedFeedbackSummary}</p>}
              </div>
            )}
          </div>
          </div>
        </div>
      )}
    </>
  );
}

const assistantButton = {
  position: "fixed",
  right: "max(12px, env(safe-area-inset-right, 0px))",
  zIndex: 9998,
  width: 52,
  height: 52,
  maxWidth: "calc(100% - 24px)",
  boxSizing: "border-box",
  contain: "layout paint",
  borderRadius: "50%",
  border: "1px solid rgba(124, 58, 237, 0.25)",
  background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
  color: "#ffffff",
  fontSize: 15,
  fontWeight: 950,
  boxShadow:
    "0 0 0 6px rgba(124, 58, 237, 0.10), 0 14px 34px rgba(91, 61, 245, 0.34)",
  cursor: "pointer",
  touchAction: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
};

const assistantOverlay = {
  position: "fixed",
  inset: "0",
  left: 0,
  right: 0,
  width: "100%",
  maxWidth: "100%",
  zIndex: 10000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "radial-gradient(circle at 50% 24%, rgba(30, 41, 101, 0.56), transparent 36%), rgba(2, 6, 23, 0.76)",
  backdropFilter: "blur(9px)",
  WebkitBackdropFilter: "blur(9px)",
  padding:
    "max(18px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left))",
  overflowX: "hidden",
  overflowY: "auto",
  boxSizing: "border-box",
};

const assistantSheet = {
  width: "100%",
  maxWidth: "100%",
  maxHeight: "min(86dvh, 720px)",
  overflowY: "auto",
  overflowX: "hidden",
  boxSizing: "border-box",
  background: "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(248,250,255,0.97))",
  border: "1px solid rgba(221, 214, 254, 0.9)",
  borderRadius: 34,
  padding: "20px max(18px, env(safe-area-inset-right)) 18px max(18px, env(safe-area-inset-left))",
  margin: 0,
  boxShadow:
    "0 28px 90px rgba(2, 6, 23, 0.28), inset 0 1px 0 rgba(255,255,255,0.82)",
};

const assistantModeGlow = {
  ready: {
    boxShadow:
      "0 28px 90px rgba(2, 6, 23, 0.28), 0 0 42px rgba(124, 58, 237, 0.16), inset 0 1px 0 rgba(255,255,255,0.82)",
  },
  listening: {
    border: "1px solid rgba(236, 72, 153, 0.34)",
    boxShadow:
      "0 28px 96px rgba(2, 6, 23, 0.30), 0 0 54px rgba(124, 58, 237, 0.22), 0 0 42px rgba(236, 72, 153, 0.22), inset 0 1px 0 rgba(255,255,255,0.84)",
  },
  thinking: {
    border: "1px solid rgba(14, 165, 233, 0.30)",
    boxShadow:
      "0 28px 96px rgba(2, 6, 23, 0.30), 0 0 48px rgba(14, 165, 233, 0.20), 0 0 42px rgba(124, 58, 237, 0.17), inset 0 1px 0 rgba(255,255,255,0.84)",
  },
  speaking: {
    border: "1px solid rgba(16, 185, 129, 0.32)",
    boxShadow:
      "0 28px 96px rgba(2, 6, 23, 0.30), 0 0 48px rgba(16, 185, 129, 0.20), 0 0 42px rgba(124, 58, 237, 0.15), inset 0 1px 0 rgba(255,255,255,0.84)",
  },
};

const assistantHandle = {
  width: 46,
  height: 5,
  borderRadius: 999,
  background: "#cbd5e1",
  margin: "0 auto 14px",
};

const assistantHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 10,
};

const assistantEyebrow = {
  display: "block",
  marginBottom: 4,
  color: "#7c3aed",
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const assistantTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: 24,
  lineHeight: 1.1,
  fontWeight: 950,
};

const assistantPurposeText = {
  margin: "5px 0 0",
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.35,
  fontWeight: 800,
  maxWidth: 360,
};

const assistantGreetingText = {
  margin: "8px 0 0",
  color: "#312e81",
  fontSize: 18,
  lineHeight: 1.2,
  fontWeight: 950,
};

const assistantPromptText = {
  margin: "3px 0 0",
  color: "#475569",
  fontSize: 15,
  lineHeight: 1.3,
  fontWeight: 850,
};

const assistantNotificationPill = {
  display: "inline-flex",
  marginTop: 8,
  padding: "5px 8px",
  borderRadius: 999,
  background: "#eef2ff",
  color: "#5b21b6",
  fontSize: 11,
  lineHeight: 1.1,
  fontWeight: 950,
};

const assistantCloseButton = {
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#475569",
  borderRadius: 14,
  padding: "9px 11px",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
};

const assistantInfoCard = {
  padding: 13,
  borderRadius: 18,
  background: "linear-gradient(135deg,#f5f3ff,#eef2ff)",
  border: "1px solid #ddd6fe",
  marginBottom: 12,
};

const assistantLabel = {
  display: "block",
  marginBottom: 5,
  color: "#64748b",
  fontSize: 11,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
};

const assistantScreenName = {
  display: "block",
  color: "#312e81",
  fontSize: 17,
  lineHeight: 1.25,
  fontWeight: 950,
};

const assistantStack = {
  display: "grid",
  gap: 10,
};

const assistantSection = {
  padding: 13,
  borderRadius: 18,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const assistantText = {
  margin: 0,
  color: "#334155",
  fontSize: 14,
  lineHeight: 1.45,
  fontWeight: 700,
};

const emergencyTipsCard = {
  marginTop: 12,
  padding: 13,
  borderRadius: 18,
  background: "#fff7ed",
  border: "1px solid #fed7aa",
};

const emergencyTipsHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 8,
};

const emergencyTipsTitle = {
  color: "#9a3412",
  fontSize: 12,
  lineHeight: 1.1,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const emergencyTipsToggle = {
  border: "1px solid #fdba74",
  background: "#ffffff",
  color: "#c2410c",
  borderRadius: 999,
  padding: "6px 9px",
  fontSize: 11,
  lineHeight: 1,
  fontWeight: 950,
  cursor: "pointer",
  flexShrink: 0,
};

const emergencyTipsList = {
  margin: 0,
  paddingLeft: 18,
  color: "#7c2d12",
};

const emergencyTipItem = {
  marginBottom: 6,
  fontSize: 13,
  lineHeight: 1.35,
  fontWeight: 850,
};

const voiceCard = {
  marginTop: 10,
  padding: 14,
  borderRadius: 24,
  background:
    "radial-gradient(circle at top left, rgba(124,58,237,0.16), transparent 38%), linear-gradient(135deg,#ffffff,#f8f7ff)",
  border: "1px solid rgba(124,58,237,0.18)",
  boxShadow: "0 18px 42px rgba(91,61,245,0.13)",
};

const voiceHeader = {
  display: "flex",
  alignItems: "center",
  gap: 11,
};

const voiceHero = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const voiceHeroText = {
  flex: 1,
  minWidth: 0,
};

const voiceButton = {
  width: 82,
  height: 82,
  borderRadius: "50%",
  border: "1px solid rgba(167,139,250,0.55)",
  background: "linear-gradient(135deg,#6d28d9,#a78bfa)",
  color: "#ffffff",
  fontSize: 34,
  fontWeight: 950,
  cursor: "pointer",
  flexShrink: 0,
  boxShadow:
    "0 0 0 8px rgba(124,58,237,0.10), 0 18px 34px rgba(91,61,245,0.28)",
};

const voiceButtonListening = {
  background: "linear-gradient(135deg,#7c3aed,#ec4899)",
  border: "1px solid #c4b5fd",
  boxShadow:
    "0 0 0 10px rgba(236,72,153,0.12), 0 18px 38px rgba(124,58,237,0.32)",
};

const voiceButtonThinking = {
  background: "linear-gradient(135deg,#2563eb,#7c3aed)",
  boxShadow:
    "0 0 0 9px rgba(37,99,235,0.11), 0 18px 38px rgba(91,61,245,0.28)",
};

const voiceButtonSpeaking = {
  background: "linear-gradient(135deg,#059669,#7c3aed)",
  boxShadow:
    "0 0 0 9px rgba(16,185,129,0.12), 0 18px 38px rgba(5,150,105,0.24)",
};

const voiceTitleRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 5,
};

const voiceTitle = {
  display: "inline-flex",
  color: "#0f172a",
  fontSize: 24,
  lineHeight: 1.2,
  fontWeight: 950,
};

const voiceStatusPill = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "4px 8px",
  borderRadius: 999,
  background: "#f5f3ff",
  color: "#6d28d9",
  border: "1px solid #ddd6fe",
  fontSize: 10,
  lineHeight: 1,
  fontWeight: 950,
};

const voiceStatusDot = {
  width: 6,
  height: 6,
  borderRadius: 999,
  background: "currentColor",
  boxShadow: "0 0 0 3px rgba(124,58,237,0.10)",
};

const voiceStatusStyles = {
  ready: {
    background: "#f5f3ff",
    color: "#6d28d9",
    border: "1px solid #ddd6fe",
  },
  listening: {
    background: "#fdf2f8",
    color: "#be185d",
    border: "1px solid #fbcfe8",
  },
  thinking: {
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
  },
  speaking: {
    background: "#ecfdf5",
    color: "#047857",
    border: "1px solid #a7f3d0",
  },
};

const voiceHintText = {
  margin: "0",
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.35,
  fontWeight: 850,
};

const voiceReadAloudLabel = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  color: "#475569",
  fontSize: 12,
  fontWeight: 850,
};

const voiceTipsSection = {
  marginTop: 14,
};

const voiceTipsTitle = {
  display: "block",
  marginBottom: 8,
  color: "#0369a1",
  fontSize: 11,
  lineHeight: 1.1,
  fontWeight: 950,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

const voiceTipsGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: 7,
};

const voiceTipChip = {
  maxWidth: "100%",
  border: "1px solid #bae6fd",
  background: "#ffffff",
  color: "#0369a1",
  borderRadius: 999,
  padding: "8px 10px",
  fontSize: 12,
  lineHeight: 1.15,
  fontWeight: 900,
  cursor: "pointer",
};

const assistantEmptySuggestions = {
  marginTop: 10,
  paddingTop: 11,
  borderTop: "1px solid rgba(186, 230, 253, 0.75)",
};

const assistantStarterChip = {
  ...voiceTipChip,
  border: "1px solid #ddd6fe",
  background: "#f5f3ff",
  color: "#5b21b6",
};

const voiceResultBox = {
  marginTop: 11,
  padding: 11,
  borderRadius: 15,
  background: "#ffffff",
  border: "1px solid #e0f2fe",
};

const voiceAnswerBox = {
  marginTop: 10,
  padding: 11,
  borderRadius: 15,
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
};

const voiceAnswerHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 8,
};

const voiceSpeakButton = {
  border: "1px solid #a7f3d0",
  background: "#ffffff",
  color: "#047857",
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 11,
  lineHeight: 1,
  fontWeight: 950,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const voiceSpeakButtonActive = {
  background: "#047857",
  borderColor: "#047857",
  color: "#ffffff",
};

const voiceUnavailablePill = {
  display: "inline-flex",
  padding: "6px 8px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#64748b",
  fontSize: 10,
  lineHeight: 1.1,
  fontWeight: 900,
};

const voiceSpeakingPill = {
  display: "inline-flex",
  marginBottom: 8,
  padding: "5px 8px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#047857",
  fontSize: 10,
  lineHeight: 1.1,
  fontWeight: 950,
};

const voiceTranscriptText = {
  margin: 0,
  color: "#334155",
  fontSize: 13,
  lineHeight: 1.4,
  fontWeight: 800,
};

const voiceAnswerText = {
  margin: 0,
  color: "#14532d",
  fontSize: 14,
  lineHeight: 1.45,
  fontWeight: 850,
  whiteSpace: "pre-line",
};

const voiceIntentPill = {
  display: "inline-flex",
  marginTop: 8,
  padding: "5px 8px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#166534",
  fontSize: 11,
  fontWeight: 950,
};

const voiceActionGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 11,
};

const voiceActionButton = {
  border: "1px solid #86efac",
  background: "#ffffff",
  color: "#166534",
  borderRadius: 999,
  padding: "8px 11px",
  fontSize: 12,
  lineHeight: 1.1,
  fontWeight: 950,
  cursor: "pointer",
};

const voiceErrorText = {
  margin: "10px 0 0",
  color: "#b45309",
  fontSize: 13,
  lineHeight: 1.4,
  fontWeight: 850,
};

const assistantQuickActions = {
  marginTop: 12,
};

const assistantActionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
  gap: 8,
};

const assistantActionButton = {
  border: "1px solid #ddd6fe",
  background: "#ffffff",
  color: "#5b21b6",
  borderRadius: 15,
  padding: "11px 10px",
  fontSize: 13,
  fontWeight: 950,
  cursor: "pointer",
};

const advancedToggle = {
  width: "100%",
  marginTop: 12,
  border: "1px solid rgba(148,163,184,0.32)",
  background: "#ffffff",
  color: "#475569",
  borderRadius: 16,
  padding: "11px 12px",
  fontSize: 13,
  fontWeight: 950,
  cursor: "pointer",
};

const advancedPanel = {
  marginTop: 10,
  padding: 12,
  borderRadius: 20,
  background: "#f8fafc",
  border: "1px solid rgba(226,232,240,0.95)",
};

const feedbackButton = {
  width: "100%",
  marginTop: 13,
  border: "1px solid #fed7aa",
  background: "#fff7ed",
  color: "#c2410c",
  borderRadius: 16,
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 950,
  cursor: "pointer",
};

const feedbackFormCard = {
  marginTop: 13,
  padding: 13,
  borderRadius: 18,
  background: "#fff7ed",
  border: "1px solid #fed7aa",
};

const feedbackFormLabel = {
  display: "flex",
  flexDirection: "column",
  gap: 7,
  color: "#9a3412",
  fontSize: 12,
  fontWeight: 950,
  marginBottom: 10,
};

const feedbackSelect = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #fdba74",
  borderRadius: 14,
  background: "#ffffff",
  color: "#0f172a",
  padding: "11px 12px",
  fontSize: 14,
  fontWeight: 800,
  outline: "none",
};

const feedbackTextarea = {
  width: "100%",
  minHeight: 86,
  boxSizing: "border-box",
  border: "1px solid #fdba74",
  borderRadius: 14,
  background: "#ffffff",
  color: "#0f172a",
  padding: "11px 12px",
  fontSize: 14,
  lineHeight: 1.4,
  fontWeight: 700,
  outline: "none",
  resize: "vertical",
};

const feedbackFormActions = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
  minWidth: 0,
  maxWidth: "100%",
};

const feedbackSubmitButton = {
  border: "none",
  borderRadius: 14,
  background: "#ea580c",
  color: "#ffffff",
  padding: "11px 10px",
  fontSize: 13,
  fontWeight: 950,
  cursor: "pointer",
};

const feedbackCancelButton = {
  border: "1px solid #fdba74",
  borderRadius: 14,
  background: "#ffffff",
  color: "#c2410c",
  padding: "11px 10px",
  fontSize: 13,
  fontWeight: 950,
  cursor: "pointer",
};

const feedbackSavedText = {
  margin: "10px 0 0",
  color: "#047857",
  fontSize: 13,
  fontWeight: 900,
  textAlign: "center",
};

const feedbackReviewRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginTop: 12,
  color: "#64748b",
  fontSize: 12,
  fontWeight: 900,
};

const feedbackCopyButton = {
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#475569",
  borderRadius: 12,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const feedbackCopiedText = {
  margin: "8px 0 0",
  color: "#4f46e5",
  fontSize: 12,
  fontWeight: 900,
  textAlign: "center",
};

export default MeetroAssistant;
