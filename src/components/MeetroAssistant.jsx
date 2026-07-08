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
import {
  getFieldAssistantPromptChips,
  getFieldProductivityResponse,
} from "../utils/fieldProductivityAssistant";
import {
  buildGlobalInsightContextFromStorage,
  getTopInsight,
} from "../utils/insightEngine";
import { areRelationshipInsightsEnabled } from "../utils/relationshipInsightSettings";
import {
  ASSISTANT_ORB_MARK,
  ASSISTANT_WAKE_DISMISS_MS,
  COMPANION_STATES,
  getCompanionObservationScope,
  getCompanionObservationScopeKey,
  getAssistantIntentDisplayLabel,
  getAssistantWakeAnimation,
  getAssistantWakeGreeting,
  getAssistantWakeInsightMessage,
  getAssistantLauncherWakeAction,
  isHighPriorityWakeInsight,
  isCompanionObservationVisible,
} from "../utils/assistantWakeExperience";
import { getCompanionContext } from "../utils/companionContext";
import { getConversationParticipantIdentity } from "../utils/conversationIdentity";
import { readRequestCompanionContext } from "../utils/requestCompanionContext";

const NativeSpeechRecognition = registerPlugin("SpeechRecognition");
const ASSISTANT_LAUNCHER_EDGE_MARGIN = 18;
const ASSISTANT_LAUNCHER_MOBILE_EDGE_MARGIN = 20;
const ASSISTANT_EXPANDED_CARD_VIEWPORT_MARGIN = 14;
const ASSISTANT_EXPANDED_CARD_GAP = 12;

function stopNativeSpeechRecognitionQuietly() {
  try {
    const stopResult = NativeSpeechRecognition.stop?.();
    stopResult?.catch?.(() => {});
    return stopResult;
  } catch {
    return null;
  }
}

function getAssistantReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getAssistantLauncherButtonSize() {
  if (typeof window === "undefined" || !window.matchMedia) return 126;
  return window.matchMedia("(min-width: 1180px) and (hover: hover) and (pointer: fine)").matches
    ? 136
    : 126;
}

function getViewportSafeAreaInsets() {
  if (typeof document === "undefined") {
    return { safeAreaTop: 0, safeAreaRight: 0, safeAreaBottom: 0, safeAreaLeft: 0 };
  }

  const probe = document.createElement("div");
  probe.style.cssText = [
    "position:fixed",
    "visibility:hidden",
    "pointer-events:none",
    "inset:0",
    "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",
  ].join(";");
  document.body.appendChild(probe);
  const style = window.getComputedStyle(probe);
  const insets = {
    safeAreaTop: parseFloat(style.paddingTop) || 0,
    safeAreaRight: parseFloat(style.paddingRight) || 0,
    safeAreaBottom: parseFloat(style.paddingBottom) || 0,
    safeAreaLeft: parseFloat(style.paddingLeft) || 0,
  };
  document.body.removeChild(probe);
  return insets;
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
    buttonLabel: "Meetro",
    assistantName: "Meetro",
    assistantGreetingFallback: "there",
    assistantGreetingPrefix: "Hi",
    assistantGreetingPrompt: "Review what matters next.",
    screenLabel: "Current screen",
    purposeLabel: "Purpose",
    nextStepLabel: "Suggested next step",
    quickHelpLabel: "Next steps",
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
    assistantDetails: "Context & feedback",
    hideDetails: "Hide details",
    voiceListening: "Listening...",
    voiceUnsupported: "Voice Companion is not available on this device yet. Tap a question below to test how Meetro responds.",
    transcriptLabel: "You asked",
    answerLabel: "Meetro says",
    assistantResponseLabel: "Recommendation",
    readAloudLabel: "Read responses aloud",
    voiceTipsTitle: "Ask about this work...",
    professionalVoiceTips: [
      "What’s next today?",
      "What appointments do I have?",
      "Any quotes waiting?",
      "Any new conversations?",
      "What should I do next?",
    ],
    homeownerVoiceTips: [
      "When is my appointment?",
      "Do I have any quotes?",
      "What’s happening with my request?",
      "Any new conversations?",
      "What should I do next?",
    ],
    homeownerEmergencyTips: [
      "Stay safe first.",
      "If there is immediate danger, call 911.",
      "Add clear photos only if safe.",
      "Keep your phone nearby for professional updates.",
      "Use the conversation to share access instructions, gate codes, pets, or hazards.",
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
      messages: "Communication Center",
      discover: "Find Businesses",
      workCenter: "Review Work Center",
      leads: "Review Opportunities",
      schedule: "Review Schedule",
      quotes: "Review Proposals",
      activeWork: "Continue Active Work",
      closure: "Review Closure",
      history: "View History",
      businessTools: "Review Business Tools",
      profile: "Profile",
      legal: "Review Legal",
      quoteBuilder: "Prepare Proposal",
      invoiceBuilder: "Review Invoice",
    },
    actionRoutingReady: "I can help with that.",
    professionalActionUnavailable:
      "That workflow is for professionals. I can open Communication Center, Profile, or Legal instead.",
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
        purpose: "Start a request, review active service, check conversations, and return to history.",
        next: "Choose Request Service if you need help, or open an active request to see its next step.",
        actions: ["requestService", "myRequests", "messages"],
      },
      discover: {
        name: "Discover",
        purpose: "Find businesses and review professional profiles before starting or continuing communication.",
        next: "Review a business profile or return to Request Service if you already know what you need.",
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
        next: "Review a request to check details, appointments, quotes, conversations, and next steps.",
        actions: ["messages", "requestService"],
      },
      projectDetails: {
        name: "Request Details",
        purpose: "Review service details, photos, conversation, records, and current workflow status.",
        next: "Continue the conversation if you need to coordinate schedule, quote, work, or completion.",
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
        next: "Continue the conversation with the most urgent next step.",
        actions: ["myRequests"],
      },
      businessDashboard: {
        name: "Business Dashboard",
        purpose: "See professional priorities, alerts, scheduled jobs, opportunities, and business performance.",
        next: "Review the Work Center section that needs action.",
        actions: ["workCenter", "leads", "messages"],
      },
      contractorDashboard: {
        name: "Work Center",
        purpose: "Keep customer work moving from first contact through closure.",
        next: "Review the workflow card with the strongest alert or continue the current section.",
        actions: ["leads", "messages"],
      },
      workCenter: {
        name: "Work Center",
        purpose: "Keep customer work moving from first contact through closure.",
        next: "Review the workflow card with the strongest alert or continue the current section.",
        actions: ["leads", "messages"],
      },
      businessLeads: {
        name: "Opportunities",
        purpose: "Review new service requests and decide whether to contact or schedule an evaluation.",
        next: "Contact the customer or schedule an evaluation before creating a quote.",
        actions: ["workCenter", "messages"],
      },
      schedule: {
        name: "Schedule",
        purpose: "Review visits and appointments that need timing, customer details, or follow-up.",
        next: "Check today's visits, confirm missing details, or save the appointment.",
        actions: ["schedule", "messages"],
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
        next: "Watch status updates and continue the conversation if coordination is needed.",
        actions: ["messages"],
      },
      emergencyOperationsCenter: {
        name: "Emergency Operations",
        purpose: "Coordinate urgent professional response work.",
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
        purpose: "Review account and business details.",
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
    buttonLabel: "Asistente Meetro",
    assistantName: "Asistente Meetro",
    assistantGreetingFallback: "ahí",
    assistantGreetingPrefix: "Hola",
    assistantGreetingPrompt: "Revisa lo que sigue.",
    screenLabel: "Pantalla actual",
    purposeLabel: "Propósito",
    nextStepLabel: "Siguiente paso sugerido",
    quickHelpLabel: "Próximos pasos",
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
    assistantDetails: "Contexto y comentarios",
    hideDetails: "Ocultar detalles",
    voiceListening: "Escuchando...",
    voiceUnsupported: "El Compañero de Voz aún no está disponible en este dispositivo. Toca una pregunta abajo para probar cómo responde Meetro.",
    transcriptLabel: "Preguntaste",
    answerLabel: "Meetro dice",
    assistantResponseLabel: "Recomendación",
    readAloudLabel: "Leer respuestas en voz alta",
    voiceTipsTitle: "Pregunta sobre este trabajo...",
    professionalVoiceTips: [
      "¿Qué sigue hoy?",
      "¿Qué citas tengo?",
      "¿Hay cotizaciones pendientes?",
      "¿Hay conversaciones nuevas?",
      "¿Qué debo hacer después?",
    ],
    homeownerVoiceTips: [
      "¿Cuándo es mi cita?",
      "¿Tengo cotizaciones?",
      "¿Qué pasa con mi solicitud?",
      "¿Hay conversaciones nuevas?",
      "¿Qué debo hacer después?",
    ],
    homeownerEmergencyTips: [
      "Mantente seguro primero.",
      "Si hay peligro inmediato, llama al 911.",
      "Agrega fotos claras solo si es seguro.",
      "Mantén tu teléfono cerca para recibir actualizaciones.",
      "Usa la conversación para compartir acceso, códigos, mascotas o peligros.",
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
      messages: "Centro de comunicación",
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
      "Ese flujo es para profesionales. Puedo abrir Centro de comunicación, Perfil o Legal.",
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
        purpose: "Inicia una solicitud, revisa servicios activos, conversaciones e historial.",
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
        next: "Revisa una solicitud para ver detalles, citas, cotizaciones y conversaciones.",
        actions: ["messages", "requestService"],
      },
      projectDetails: {
        name: "Detalles de solicitud",
        purpose: "Revisa detalles, fotos, conversación, registros y estado actual.",
        next: "Continúa la conversación si necesitas coordinar agenda, cotización o finalización.",
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
        next: "Continúa la conversación con el siguiente paso más urgente.",
        actions: ["myRequests"],
      },
      businessDashboard: {
        name: "Panel del negocio",
        purpose: "Revisa prioridades, alertas, trabajos programados, oportunidades y rendimiento.",
        next: "Revisa la sección del Work Center que necesita acción.",
        actions: ["workCenter", "leads", "messages"],
      },
      contractorDashboard: {
        name: "Work Center",
        purpose: "Mantén el trabajo con clientes avanzando desde el primer contacto hasta el cierre.",
        next: "Revisa la tarjeta con alerta o continúa la sección actual.",
        actions: ["leads", "messages"],
      },
      workCenter: {
        name: "Work Center",
        purpose: "Mantén el trabajo con clientes avanzando desde el primer contacto hasta el cierre.",
        next: "Revisa la tarjeta con alerta o continúa la sección actual.",
        actions: ["leads", "messages"],
      },
      businessLeads: {
        name: "Oportunidades",
        purpose: "Revisa solicitudes nuevas y decide contactar o agendar evaluación.",
        next: "Contacta al cliente o agenda evaluación antes de cotizar.",
        actions: ["workCenter", "messages"],
      },
      schedule: {
        name: "Agenda",
        purpose: "Revisa visitas y citas que necesitan horario, datos del cliente o seguimiento.",
        next: "Revisa las visitas de hoy, confirma detalles faltantes o guarda la cita.",
        actions: ["schedule", "messages"],
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
  const requestDetailContext = readRequestCompanionContext();

  return {
    selectedRequestId:
      requestDetailContext?.requestId ||
      localStorage.getItem("selectedHomeownerRequestId") ||
      "",
    selectedProjectId: requestDetailContext?.projectId || "",
    selectedJobId:
      requestDetailContext?.projectId ||
      localStorage.getItem("activeJobId") ||
      localStorage.getItem("activeWorkRequestId") ||
      "",
    conversationId:
      requestDetailContext?.conversationId ||
      localStorage.getItem("activeConversationId") ||
      "",
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
  return getConversationParticipantIdentity(conversation, {
    viewerRole:
      getAccountModeForPage(
        "conversationThread",
        localStorage.getItem("activeAccountMode") || "personal"
      ) === "business"
        ? "business"
        : "homeowner",
    fallbackName:
      conversation?.title ||
      conversation?.requestTitle ||
      conversation?.service ||
      conversation?.name ||
      "the latest conversation",
  }).displayName;
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

function doesEmergencyRecordBelongToAccount(record = {}, scope = {}) {
  const activeAccount = String(scope?.accountId || "").trim().toLowerCase();
  if (!activeAccount) return false;

  const candidateValues = [
    record.accountId,
    record.customerAccountId,
    record.homeownerAccountId,
    record.userId,
    record.customerId,
    record.email,
    record.userEmail,
    record.customerEmail,
    record.homeownerEmail,
    record.id,
    record.requestId,
    record.emergencyRequestId,
    record.conversationId,
  ];

  return candidateValues.some((value) =>
    String(value || "").trim().toLowerCase().includes(activeAccount)
  );
}

function getEmergencySummary(scope = {}) {
  const activeRecord = safeJson("activeEmergencyRecord", {});
  const status = String(localStorage.getItem("emergencyDispatchStatus") || "").toLowerCase();
  const requestId =
    activeRecord.id ||
    activeRecord.requestId ||
    activeRecord.emergencyRequestId ||
    localStorage.getItem("emergencyRequestId") ||
    "";
  const issue =
    activeRecord.service ||
    activeRecord.title ||
    activeRecord.issue ||
    localStorage.getItem("emergencyIssue") ||
    "";
  const customer =
    activeRecord.customerName ||
    activeRecord.customer ||
    localStorage.getItem("emergencyCustomerName") ||
    "";
  const inactiveStatuses = ["", "completed", "cancelled", "canceled", "closed", "resolved"];
  const recordStatus = String(activeRecord.status || status || "").toLowerCase();
  const baseActive = Boolean(
    (requestId || issue || recordStatus) && !inactiveStatuses.includes(recordStatus)
  );
  const activeRole = scope.role === "business" ? "business" : "personal";
  const belongsToActiveHomeowner = doesEmergencyRecordBelongToAccount(activeRecord, scope);
  const active = Boolean(
    baseActive && (activeRole === "business" || belongsToActiveHomeowner)
  );

  return {
    active,
    status: recordStatus || "pending",
    issue,
    customer,
    accountId: activeRole === "personal" && belongsToActiveHomeowner ? scope.accountId : "",
    role: activeRole === "business" ? "business" : "personal",
    homeownerSafe: activeRole === "personal" && belongsToActiveHomeowner,
    requestId,
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

  const requestDetailContext = readRequestCompanionContext();
  if (
    requestDetailContext &&
    requestDetailContext.pageContext === "request_detail" &&
    ["projectDetails", "myRequests"].includes(String(currentPage || ""))
  ) {
    return {
      active: true,
      pageContext: "request_detail",
      request: null,
      requestId: String(requestDetailContext.requestId || ""),
      projectId: String(requestDetailContext.projectId || ""),
      conversationId: String(requestDetailContext.conversationId || ""),
      title: requestDetailContext.title || requestDetailContext.serviceType || "Service Request",
      status: String(requestDetailContext.status || "visible").toLowerCase(),
      statusLabel: requestDetailContext.status || "",
      nextStep: requestDetailContext.nextStep || "",
      serviceType: requestDetailContext.serviceType || "",
      rolePerspective: requestDetailContext.rolePerspective || roleMode,
      quoteStatus: requestDetailContext.quoteStatus || "",
      scheduleStatus: requestDetailContext.scheduleStatus || "",
      photoCount: 0,
      appointment: null,
      appointmentStatus: requestDetailContext.scheduleStatus || "",
      quote: requestDetailContext.quoteStatus
        ? { status: requestDetailContext.quoteStatus }
        : null,
      professionalName: "",
      unreadCount: getUnreadConversationCount(),
      source: "request_detail_context",
    };
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
  const isRequestDetailContext = context.pageContext === "request_detail";
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
    if (isRequestDetailContext) {
      const visibleSummary = [
        context.statusLabel && `${isSpanish ? "Estado" : "Status"}: ${context.statusLabel}`,
        context.nextStep && `${isSpanish ? "Siguiente paso" : "Next step"}: ${context.nextStep}`,
        context.serviceType && `${isSpanish ? "Servicio" : "Service"}: ${context.serviceType}`,
        context.quoteStatus && `${isSpanish ? "Propuesta" : "Proposal"}: ${context.quoteStatus}`,
        context.scheduleStatus && `${isSpanish ? "Visita" : "Visit"}: ${context.scheduleStatus}`,
      ].filter(Boolean);

      return makeResponse(
        "professional_request_detail_context",
        visibleSummary.length > 0
          ? isSpanish
            ? `Puedo ayudarte a avanzar este trabajo con lo visible aquí. ${visibleSummary.join(". ")}.`
            : `I can help you move this job forward using what is visible here. ${visibleSummary.join(". ")}.`
          : isSpanish
          ? "Puedo ayudarte con este trabajo, pero no veo detalles verificados suficientes para afirmar el siguiente paso."
          : "I can help with this job, but I do not see enough verified visible detail to claim the next step.",
        [
          makeRequestAssistantAction("contactCustomer", language, context),
          makeRequestAssistantAction("reviewDetails", language, context),
        ],
        visibleSummary.length > 0
      );
    }

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

  if (isRequestDetailContext) {
    const visibleSummary = [
      context.statusLabel && `${isSpanish ? "Estado" : "Status"}: ${context.statusLabel}`,
      context.nextStep && `${isSpanish ? "Siguiente paso" : "Next step"}: ${context.nextStep}`,
      context.serviceType && `${isSpanish ? "Servicio" : "Service"}: ${context.serviceType}`,
      context.quoteStatus && `${isSpanish ? "Cotización" : "Quote"}: ${context.quoteStatus}`,
      context.scheduleStatus && `${isSpanish ? "Visita" : "Visit"}: ${context.scheduleStatus}`,
    ].filter(Boolean);

    return makeResponse(
      "homeowner_request_detail_context",
      visibleSummary.length > 0
        ? isSpanish
          ? `Puedo ayudarte a entender dónde está esta solicitud. ${visibleSummary.join(". ")}.`
          : `I can help you understand where this request stands. ${visibleSummary.join(". ")}.`
        : isSpanish
        ? "Puedo ayudarte con esta solicitud, pero no veo detalles verificados suficientes para afirmar el siguiente paso."
        : "I can help with this request, but I do not see enough verified visible detail to claim the next step.",
      [
        makeRequestAssistantAction("openConversation", language, context),
        makeRequestAssistantAction("backToRequests", language, context),
      ],
      visibleSummary.length > 0
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
        ? "Puedes actualizar los detalles desde Mis solicitudes. Usa Editar solicitud, ajusta la información y guarda los cambios."
        : "You can update the details from My Requests. Use Edit Request, adjust the information, and save your changes.",
      [makeRequestAssistantAction("editRequest", language, context)]
    );
  }

  if (asksMessage) {
    return makeResponse(
      "request_message_professional",
      isSpanish
        ? "Continúa la conversación para coordinar detalles, horario, acceso o preguntas sobre la solicitud."
        : "Continue the conversation to coordinate details, timing, access, or questions about the request.",
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
        ? `Tienes una cita vinculada. Estado: ${context.appointmentStatus || "pendiente"}. Continúa la conversación si necesitas confirmar detalles o pedir otro horario.`
        : `You have a linked appointment. Status: ${context.appointmentStatus || "pending"}. Continue the conversation if you need to confirm details or request a different time.`,
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

  const fieldProductivity = getFieldProductivityResponse({
    question,
    currentPage,
    language,
  });
  if (fieldProductivity) return fieldProductivity;

  const actionResponse = detectAssistantActionIntent(question, roleMode, language);
  if (actionResponse) return actionResponse;

  const intent = detectVoiceIntent(question, roleMode);
  const unreadCount = getUnreadConversationCount();
  const latestConversation = getLatestConversation();
  const notificationRole = roleMode === "business" ? "professional" : "homeowner";
  const unreadNotificationCount = getMeetroUnreadNotificationCount(notificationRole);
  const latestNotification = getNotifications(notificationRole).find((item) => !item.read);
  const openMessagesAction = {
    label:
      language === "es"
        ? "Continuar en Centro de Comunicación"
        : "Continue in Communication Center",
    target: "messagesInbox",
  };

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
      label: language === "es" ? "Revisar agenda" : "Review Schedule",
      target: "contractorDashboard",
      workCenterSection: "schedule",
    };
    const openQuotesAction = {
      label: language === "es" ? "Revisar propuestas" : "Review Proposals",
      target: "contractorDashboard",
      workCenterSection: "quotes",
    };
    const openActiveWorkAction = {
      label: language === "es" ? "Continuar trabajo activo" : "Continue Active Work",
      target: "contractorDashboard",
      workCenterSection: "active",
    };
    const openEmergencyAction = {
      label: language === "es" ? "Continuar emergencia" : "Continue Emergency Work",
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
        [{ label: language === "es" ? "Revisar Work Center" : "Review Work Center", target: "contractorDashboard" }]
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
      { label: language === "es" ? "Revisar Work Center" : "Review Work Center", target: "contractorDashboard" },
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
    label: language === "es" ? "Revisar solicitud" : "Review Request",
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
  const speechPermission =
    permissions.speechRecognition ??
    permissions.speech ??
    permissions.recognition ??
    permissions.microphone;
  return ["granted", "authorized"].includes(
    String(speechPermission || "").toLowerCase()
  );
}

function extractNativeSpeechTranscript(result = {}) {
  if (typeof result === "string") return result.trim();

  const matches =
    result.matches ||
    result.value ||
    result.results ||
    result.transcripts ||
    result.transcript ||
    result.words ||
    [];

  if (Array.isArray(matches)) {
    const firstMatch = matches.find((match) => String(match || "").trim());
    if (typeof firstMatch === "string") return firstMatch.trim();
    if (firstMatch?.transcript) return String(firstMatch.transcript).trim();
    if (firstMatch?.text) return String(firstMatch.text).trim();
    if (firstMatch?.value) return String(firstMatch.value).trim();
  }

  if (matches && typeof matches === "object") {
    return extractNativeSpeechTranscript(matches);
  }

  if (result.result) return extractNativeSpeechTranscript(result.result);

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
  const [wakeOpen, setWakeOpen] = useState(false);
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
  const [voiceStatusChip, setVoiceStatusChip] = useState(null);
  const [voiceError, setVoiceError] = useState("");
  const [readAloud, setReadAloud] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [voiceThinking, setVoiceThinking] = useState(false);
  const [typedQuestion, setTypedQuestion] = useState("");
  const [voiceResponseUnavailable, setVoiceResponseUnavailable] = useState(false);
  const [showAllEmergencyTips, setShowAllEmergencyTips] = useState(false);
  const [showAdvancedHelp, setShowAdvancedHelp] = useState(false);
  const [companionMode, setCompanionMode] = useState(COMPANION_STATES.briefing);
  const lastInputModeRef = useRef("typed");
  const launcherDragRef = useRef(null);
  const voiceThinkingTimerRef = useRef(null);
  const assistantCloseTimerRef = useRef(null);
  const assistantWakeTimerRef = useRef(null);
  const browserSpeechRecognitionRef = useRef(null);
  const latestNativeTranscriptRef = useRef("");
  const nativeTranscriptProcessedRef = useRef(false);
  const nativeSpeechTimeoutRef = useRef(null);
  const assistantSheetRef = useRef(null);
  const voiceAnswerRef = useRef(null);
  const language = getLanguage();
  const copy = assistantCopy[language] || assistantCopy.en;
  const workCenterSectionForAssistant =
    localStorage.getItem("meetroWorkCenterTab") ||
    localStorage.getItem("activeWorkCenterTab") ||
    "";
  const assistantContextPage =
    ["contractorDashboard", "workCenter"].includes(currentPage) &&
    String(workCenterSectionForAssistant || "").toLowerCase().includes("schedule")
      ? "schedule"
      : currentPage;
  const guide = useMemo(
    () => getScreenGuide(assistantContextPage, language),
    [assistantContextPage, language]
  );
  const roleLabel = getRoleLabel(currentPage, language);
  const isChat = currentPage === "conversationThread" || currentPage === "emergencyChat";
  const launcherBottomClearance = isChat ? 104 : 94;
  const launcherFallbackBottom = `calc(${launcherBottomClearance}px + env(safe-area-inset-bottom))`;
  const launcherButtonSize = getAssistantLauncherButtonSize();
  const launcherEdgeMargin =
    typeof window !== "undefined" && window.innerWidth <= 768
      ? ASSISTANT_LAUNCHER_MOBILE_EDGE_MARGIN
      : ASSISTANT_LAUNCHER_EDGE_MARGIN;
  const launcherPositionOptions = {
    ...AI_BUTTON_POSITION_DEFAULTS,
    buttonSize: launcherButtonSize,
    bottomClearance: launcherBottomClearance,
    edgeMargin: launcherEdgeMargin,
  };
  const isBusinessMode =
    getAccountModeForPage(
      currentPage,
      localStorage.getItem("activeAccountMode") || "personal"
    ) === "business";
  const roleMode = isBusinessMode ? "business" : "personal";
  const companionObservationScope = getCompanionObservationScope({
    storage: localStorage,
    currentPage: assistantContextPage,
    role: roleMode,
  });
  const companionObservationScopeKey =
    getCompanionObservationScopeKey(companionObservationScope);
  const companionObservationScopeRef = useRef(companionObservationScopeKey);
  const serviceRequestContext = getServiceRequestContext(currentPage, roleMode, language);
  const voiceTips = serviceRequestContext.active
    ? getServiceRequestVoiceTips(roleMode)
    : isBusinessMode
    ? copy.professionalVoiceTips
    : copy.homeownerVoiceTips;
  const fieldPromptChips = getFieldAssistantPromptChips({
    currentPage: assistantContextPage,
    language,
  });
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
    ? t("assistantResponding", language)
    : voiceListening
    ? copy.voiceListening
    : voiceThinking
    ? t("assistantThinking")
    : voiceAnswer
    ? t("assistantResponding", language)
    : t("assistantReady");
  const isConversationMode = companionMode === COMPANION_STATES.conversation;
  const isGuidanceMode = companionMode === COMPANION_STATES.guidance;
  const assistantMode = !isConversationMode
    ? "ready"
    : assistantSpeaking
    ? "responding"
    : voiceListening
    ? "listening"
    : voiceThinking
    ? "thinking"
    : voiceAnswer
    ? "responding"
    : "ready";
  const assistantFirstName = getAssistantFirstName();
  const companionTopInsight = useMemo(() => {
    try {
      if (!areRelationshipInsightsEnabled()) return null;
      return getTopInsight(
        buildGlobalInsightContextFromStorage({
          storage: localStorage,
          currentPage: assistantContextPage,
        })
      );
    } catch {
      return null;
    }
  }, [assistantContextPage]);
  const wakeEmergencySummary = getEmergencySummary(companionObservationScope);
  const wakeEmergencyCandidate = wakeEmergencySummary.active
    ? {
        id: `wake:emergency:${wakeEmergencySummary.requestId || companionObservationScope.requestId || "active"}`,
        type: "emergency",
        priority: "critical",
        accountId: wakeEmergencySummary.accountId,
        role: wakeEmergencySummary.role,
        homeownerSafe: wakeEmergencySummary.homeownerSafe,
        requestId: wakeEmergencySummary.requestId,
        message:
          wakeEmergencySummary.issue || wakeEmergencySummary.customer
            ? `${wakeEmergencySummary.issue || t("emergencyNeedsAttention", language)} ${
                wakeEmergencySummary.customer ? `for ${wakeEmergencySummary.customer}` : ""
              }`.trim()
            : t("emergencyNeedsAttention", language),
      }
    : null;
  const wakeEmergencyInsight = isCompanionObservationVisible(
    wakeEmergencyCandidate,
    companionObservationScope
  )
    ? wakeEmergencyCandidate
    : null;
  const wakeTopInsight = wakeEmergencyInsight || (
    isHighPriorityWakeInsight(companionTopInsight)
      ? companionTopInsight
      : null
  );
  const wakeObservationType = wakeEmergencyInsight ? "emergency" : "insight";
  const wakeObservationMessage = wakeTopInsight
    ? getAssistantWakeInsightMessage(wakeTopInsight, language)
    : "";
  const lanternContext = useMemo(
    () =>
      getCompanionContext({
        currentPage: assistantContextPage,
        language,
        hasObservation: Boolean(wakeTopInsight),
        storage: localStorage,
        roleMode,
      }),
    [assistantContextPage, language, roleMode, wakeTopInsight]
  );
  const compactCompanionTitle = wakeTopInsight
    ? t("assistantCompanionINoticed", language)
    : lanternContext.title;
  const compactCompanionMessage =
    wakeObservationMessage || lanternContext.message;
  const compactCompanionPrimaryLabel =
    wakeObservationType === "emergency"
      ? t("openEmergencyChat", language)
      : lanternContext.primaryActionLabel;
  const companionGreeting = getAssistantWakeGreeting({
    name: assistantFirstName,
    language,
  }).greeting;
  const companionWorkspaceGreeting = wakeTopInsight
    ? compactCompanionMessage
    : `${companionGreeting} ${lanternContext.message}`;
  const companionGuidanceObservation =
    !isConversationMode && voiceAnswer ? voiceAnswer : companionWorkspaceGreeting;
  const companionGuidanceRecommendation = wakeTopInsight
    ? lanternContext.message
    : lanternContext.guidance?.recommendation ||
      t("assistantCompanionRecommendationDefault", language);

  function getLauncherViewport() {
    const safeAreaInsets = getViewportSafeAreaInsets();
    return {
      width: typeof window === "undefined" ? 0 : window.innerWidth,
      height: typeof window === "undefined" ? 0 : window.innerHeight,
      ...safeAreaInsets,
    };
  }

  function getLauncherFallbackPosition(viewport = getLauncherViewport()) {
    return clampAiButtonPosition(
      {
        x:
          Number(viewport.width || 0) -
          launcherEdgeMargin -
          Number(viewport.safeAreaRight || 0) -
          launcherButtonSize,
        y: Number(viewport.height || 0) - launcherBottomClearance - 50,
      },
      viewport,
      launcherPositionOptions
    );
  }

  function preserveLauncherPosition(position) {
    const viewport = getLauncherViewport();
    const nextPosition = writeStoredAiButtonPosition(position, {
      viewport,
      options: launcherPositionOptions,
    });
    setLauncherPosition(nextPosition);
    return nextPosition;
  }

  function ensureExpandedCompanionViewportSafety(nextMode) {
    const viewport = getLauncherViewport();
    const currentPosition =
      launcherPosition ||
      readStoredAiButtonPosition({
        viewport,
        options: launcherPositionOptions,
      }) ||
      getLauncherFallbackPosition(viewport);
    const metrics = getCompanionAnchorMetrics({
      launcherPosition: currentPosition,
      launcherButtonSize,
      viewport,
      fallbackBottom: launcherBottomClearance,
      companionMode: nextMode,
      launcherEdgeMargin,
    });

    if (!metrics.positionAdjustmentRequired) return currentPosition;

    return preserveLauncherPosition({
      ...currentPosition,
      y: currentPosition.y + metrics.launcherAdjustmentY,
    });
  }

  function adjustAssistantPositionForMeasuredSheet() {
    const sheetNode = assistantSheetRef.current;
    if (!sheetNode) return;

    const viewport = getLauncherViewport();
    const rect = sheetNode.getBoundingClientRect();
    const visibleTop =
      ASSISTANT_EXPANDED_CARD_VIEWPORT_MARGIN + Number(viewport.safeAreaTop || 0);
    const visibleBottom =
      Number(viewport.height || window.innerHeight || 0) -
      ASSISTANT_EXPANDED_CARD_VIEWPORT_MARGIN -
      Number(viewport.safeAreaBottom || 0) -
      launcherBottomClearance;
    const overflowTop = Math.max(0, visibleTop - rect.top);
    const overflowBottom = Math.max(0, rect.bottom - visibleBottom);
    if (overflowTop < 1 && overflowBottom < 1) return;

    const currentPosition = launcherPosition || getLauncherFallbackPosition(viewport);
    const adjustedPosition = {
      ...currentPosition,
      y: currentPosition.y + overflowTop - overflowBottom,
    };

    preserveLauncherPosition(adjustedPosition);
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
      if (assistantWakeTimerRef.current) {
        window.clearTimeout(assistantWakeTimerRef.current);
      }
      if (nativeSpeechTimeoutRef.current) {
        window.clearTimeout(nativeSpeechTimeoutRef.current);
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

  useEffect(() => {
    if (!open || !isConversationMode || !voiceAnswer) return;

    const answerNode = voiceAnswerRef.current;
    const sheetNode = assistantSheetRef.current;
    if (!answerNode || !sheetNode) return;

    const answerRect = answerNode.getBoundingClientRect();
    const sheetRect = sheetNode.getBoundingClientRect();
    const viewportBottom =
      typeof window === "undefined" ? sheetRect.bottom : window.innerHeight;
    const visibleBottom = Math.min(sheetRect.bottom, viewportBottom) - 12;
    const visibleTop = sheetRect.top + 12;
    const alreadyVisible =
      answerRect.top >= visibleTop && answerRect.bottom <= visibleBottom;

    if (alreadyVisible) return;

    answerNode.scrollIntoView({
      behavior: getAssistantReducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
  }, [open, isConversationMode, voiceAnswer]);

  useEffect(() => {
    if (!open) return undefined;

    const frame = window.requestAnimationFrame(() => {
      adjustAssistantPositionForMeasuredSheet();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, companionMode, voiceAnswer, voiceTranscript, launcherBottomClearance]);

  useEffect(() => {
    if (!wakeOpen) return undefined;
    if (assistantWakeTimerRef.current) {
      window.clearTimeout(assistantWakeTimerRef.current);
    }
    assistantWakeTimerRef.current = window.setTimeout(() => {
      setWakeOpen(false);
      assistantWakeTimerRef.current = null;
    }, ASSISTANT_WAKE_DISMISS_MS);

    return () => {
      if (assistantWakeTimerRef.current) {
        window.clearTimeout(assistantWakeTimerRef.current);
        assistantWakeTimerRef.current = null;
      }
    };
  }, [wakeOpen, currentPage]);

  useEffect(() => {
    if (companionObservationScopeRef.current === companionObservationScopeKey) {
      return undefined;
    }

    resetTemporaryCompanionState();
    companionObservationScopeRef.current = companionObservationScopeKey;
    return undefined;
  }, [companionObservationScopeKey]);

  useEffect(() => {
    function handleAssistantOpen(event) {
      const detail = event?.detail || {};
      const initialQuestion = String(detail.initialQuestion || detail.question || "").trim();

      if (initialQuestion) {
        openAssistantFromLauncher({ initialQuestion });
        return;
      }

      setWakeOpen(true);
    }

    window.addEventListener("meetro:assistant:open", handleAssistantOpen);

    return () => {
      window.removeEventListener("meetro:assistant:open", handleAssistantOpen);
    };
  }, [currentPage, assistantContextPage]);

  useEffect(() => {
    function handleCompanionIdentityChange() {
      resetTemporaryCompanionState();
      companionObservationScopeRef.current = getCompanionObservationScopeKey(
        getCompanionObservationScope({
          storage: localStorage,
          currentPage: assistantContextPage,
          role: getAccountModeForPage(
            currentPage,
            localStorage.getItem("activeAccountMode") || "personal"
          ),
        })
      );
    }

    window.addEventListener("accountModeChanged", handleCompanionIdentityChange);
    window.addEventListener("meetro-account-switched", handleCompanionIdentityChange);
    return () => {
      window.removeEventListener("accountModeChanged", handleCompanionIdentityChange);
      window.removeEventListener("meetro-account-switched", handleCompanionIdentityChange);
    };
  }, [assistantContextPage, currentPage]);

  const quickActions = (guide.actions || copy.fallback.actions || []).filter((action) => {
    if (!isBusinessMode && ["workCenter", "leads", "schedule", "quotes"].includes(action)) {
      return false;
    }

    if (isBusinessMode && ["requestService", "myRequests", "discover"].includes(action)) {
      return false;
    }

    return true;
  });
  const companionSuggestedActions = quickActions.slice(0, 4).map((actionKey) => ({
    key: actionKey,
    label: copy.actions[actionKey] || actionKey,
  }));
  const companionPrimaryGuidanceAction = companionSuggestedActions[0] || null;

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
    const response = getVoiceResponse(question, roleMode, language, guide, assistantContextPage);
    const context = getSelectedContext();

    setVoiceTranscript(question);
    setVoiceAnswer(response.answer);
    setVoiceIntent(response.intent);
    setVoiceActions(Array.isArray(response.actions) ? response.actions : []);
    setVoiceStatusChip(response.statusChip || null);
    setVoiceError("");
    setTypedQuestion("");

    saveVoiceHistory({
      id: `voice-${Date.now()}`,
      question,
      recognizedIntent: response.intent,
      timestamp: new Date().toISOString(),
      role: roleMode,
      screen: currentPage || "unknown",
      contextPage: assistantContextPage || currentPage || "unknown",
      success: response.success,
      actions: Array.isArray(response.actions)
        ? response.actions.map((action) => action.label || action.target || action.action)
        : [],
      requestId: context.selectedRequestId,
      projectId: context.selectedProjectId,
      conversationId: context.conversationId,
      appointmentId: context.appointmentId,
      quoteId: context.quoteId,
    });

    if (response.answer && (inputMode === "voice" || readAloud)) {
      speakAssistantResponseText(response.answer);
    }

    lastInputModeRef.current = "typed";
  }

  function submitTypedQuestion(event) {
    event.preventDefault();
    const question = typedQuestion.trim();
    if (!question) return;

    processVoiceQuestion(question, { inputMode: "typed" });
  }

  function clearNativeSpeechTimeout() {
    if (nativeSpeechTimeoutRef.current) {
      window.clearTimeout(nativeSpeechTimeoutRef.current);
      nativeSpeechTimeoutRef.current = null;
    }
  }

  function processLatestNativeTranscript(reason = "native_end") {
    if (nativeTranscriptProcessedRef.current) return false;

    const transcript = String(latestNativeTranscriptRef.current || "").trim();
    if (!transcript) return false;

    nativeTranscriptProcessedRef.current = true;
    clearNativeSpeechTimeout();
    console.log("Native speech transcript", transcript);
    console.log("Native speech completion", reason);
    setVoiceTranscript(transcript);
    processVoiceQuestion(transcript, { inputMode: "voice" });
    setVoiceListening(false);
    return true;
  }

  async function startNativeVoiceInput() {
    stopAssistantVoiceResponse();
    lastInputModeRef.current = "voice";
    latestNativeTranscriptRef.current = "";
    nativeTranscriptProcessedRef.current = false;
    clearNativeSpeechTimeout();

    if (!Capacitor.isNativePlatform?.()) return false;

    let partialResultsListener = null;

    try {
      const availability = await NativeSpeechRecognition.available?.();
      console.log("Native speech available", availability);
      const isAvailable =
        availability?.available ??
        availability?.speechRecognition ??
        availability?.value ??
        true;

      if (isAvailable === false) return false;

      const currentPermissions =
        (await NativeSpeechRecognition.checkPermissions?.().catch(() => null)) || {};
      console.log("Native speech permission result", currentPermissions);

      if (!hasGrantedSpeechPermission(currentPermissions)) {
        if (hasDeniedSpeechPermission(currentPermissions)) {
          setVoiceListening(false);
          setVoiceError(copy.voiceUnsupported);
          setVoiceAnswer("");
          setVoiceActions([]);
          setVoiceStatusChip(null);
          return true;
        }

        const requestedPermissions =
          (await NativeSpeechRecognition.requestPermissions?.().catch(() => null)) || {};
        console.log("Native speech permission result", requestedPermissions);

        if (!hasGrantedSpeechPermission(requestedPermissions)) {
          setVoiceListening(false);
          setVoiceError(copy.voiceUnsupported);
          setVoiceAnswer("");
          setVoiceActions([]);
          setVoiceStatusChip(null);
          return true;
        }
      }

      setVoiceListening(true);
      setVoiceError("");

      partialResultsListener = await NativeSpeechRecognition.addListener?.(
        "partialResults",
        (data) => {
          const transcript = extractNativeSpeechTranscript(data);
          if (transcript) {
            console.log("Native speech transcript", transcript);
            latestNativeTranscriptRef.current = transcript;
            setVoiceTranscript(transcript);
          }
        }
      );

      nativeSpeechTimeoutRef.current = window.setTimeout(async () => {
        if (processLatestNativeTranscript("native_timeout")) {
          await stopNativeSpeechRecognitionQuietly();
          return;
        }

        nativeTranscriptProcessedRef.current = true;
        setVoiceListening(false);
        setVoiceError(
          language === "es"
            ? "No pude escuchar claramente. Toca una pregunta abajo o intenta de nuevo."
            : "I could not hear that clearly. Tap a question below or try again."
        );
        await stopNativeSpeechRecognitionQuietly();
      }, 7000);

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
        console.log("Native speech transcript", transcript);
        latestNativeTranscriptRef.current = transcript;
        setVoiceTranscript(transcript);
        processLatestNativeTranscript("native_final");
      } else if (processLatestNativeTranscript("native_end")) {
        // Latest partial result was enough to answer.
      } else {
        console.log("Native speech error", "empty transcript", result);
        setVoiceError(
          language === "es"
            ? "No pude escuchar claramente. Toca una pregunta abajo o intenta de nuevo."
            : "I could not hear that clearly. Tap a question below or try again."
        );
      }

      return true;
    } catch (error) {
      console.log("Native speech error", error);
      if (nativeTranscriptProcessedRef.current) return true;
      if (processLatestNativeTranscript("native_error")) return true;
      if (isNativeSpeechUnavailable(error)) return false;

      setVoiceListening(false);
      setVoiceError(copy.voiceUnsupported);
      setVoiceAnswer("");
      setVoiceActions([]);
      setVoiceStatusChip(null);
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
      clearNativeSpeechTimeout();
      processLatestNativeTranscript("native_finished");
      setVoiceListening(false);
      await stopNativeSpeechRecognitionQuietly();
      try {
        await partialResultsListener?.remove?.();
      } catch {}
    }
  }

  async function startVoiceInput() {
    console.log("Meetro mic tapped");
    stopAssistantVoiceResponse();
    lastInputModeRef.current = "voice";
    latestNativeTranscriptRef.current = "";
    nativeTranscriptProcessedRef.current = false;
    clearNativeSpeechTimeout();
    setVoiceListening(true);
    setVoiceError("");
    const usedNativeSpeech = await startNativeVoiceInput();
    if (usedNativeSpeech) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceListening(false);
      setVoiceError(copy.voiceUnsupported);
      setVoiceAnswer("");
      setVoiceActions([]);
      setVoiceStatusChip(null);
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

  function clearAssistantWake() {
    if (assistantWakeTimerRef.current) {
      window.clearTimeout(assistantWakeTimerRef.current);
      assistantWakeTimerRef.current = null;
    }
    setWakeOpen(false);
  }

  function resetTemporaryCompanionState() {
    clearAssistantWake();
    setOpen(false);
    setAssistantClosing(false);
    setVoiceListening(false);
    setVoiceThinking(false);
    setVoiceTranscript("");
    setVoiceAnswer("");
    setVoiceIntent("");
    setVoiceActions([]);
    setVoiceStatusChip(null);
    setVoiceError("");
    setTypedQuestion("");
    setVoiceResponseUnavailable(false);
    setShowAdvancedHelp(false);
    setCompanionMode(COMPANION_STATES.idle);
    stopNativeSpeechRecognitionQuietly();
  }

  function openAssistantFromLauncher(options = {}) {
    const initialQuestion = String(options.initialQuestion || "").trim();
    const requestedConversation =
      Boolean(initialQuestion) ||
      options.mode === COMPANION_STATES.conversation ||
      options.fullConversation === true;
    const nextCompanionMode = requestedConversation
      ? COMPANION_STATES.conversation
      : COMPANION_STATES.guidance;
    clearAssistantWake();
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
    setVoiceStatusChip(null);
    setVoiceError("");
    setTypedQuestion("");
    setVoiceResponseUnavailable(false);
    lastInputModeRef.current = "typed";
    setShowAdvancedHelp(false);
    ensureExpandedCompanionViewportSafety(nextCompanionMode);
    setCompanionMode(nextCompanionMode);
    setOpen(true);
    setFeedbackSaved(false);
    if (initialQuestion) {
      processVoiceQuestion(initialQuestion, { inputMode: "typed" });
    }
  }

  function enterCompanionConversation() {
    ensureExpandedCompanionViewportSafety(COMPANION_STATES.conversation);
    setCompanionMode(COMPANION_STATES.conversation);
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
    const launcherAction = getAssistantLauncherWakeAction({
      open,
      wakeOpen,
      dragSuppressed: launcherDragRef.current?.suppressClick,
    });

    if (launcherAction === "suppress") {
      event.preventDefault();
      launcherDragRef.current = null;
      return;
    }

    if (launcherAction === "open") {
      openAssistantFromLauncher();
      return;
    }

    if (launcherAction === "wake") {
      setWakeOpen(true);
    }
  }

  function handleWakePrimaryObservation() {
    clearAssistantWake();
    if (wakeObservationType === "emergency") {
      setOpen(false);
      setPage?.(isBusinessMode ? "emergencyOperationsCenter" : "emergencyStatus");
      return;
    }

    handleWakeReviewInsights();
  }

  function handleWakeAskMeetro() {
    openAssistantFromLauncher({ mode: COMPANION_STATES.conversation });
  }

  function handleWakeReviewInsights() {
    const answer =
      wakeObservationMessage ||
      (companionTopInsight
        ? getAssistantWakeInsightMessage(companionTopInsight, language)
        : t("assistantCompanionNoUrgent", language));
    clearAssistantWake();
    setAssistantClosing(false);
    setVoiceListening(false);
    setVoiceThinking(false);
    setVoiceTranscript(t("assistantCompanionReviewInsights", language));
    setVoiceAnswer(answer);
    setVoiceIntent("review_insights");
    setVoiceActions([]);
    setVoiceStatusChip(null);
    setVoiceError("");
    setVoiceResponseUnavailable(false);
    setShowAdvancedHelp(false);
    ensureExpandedCompanionViewportSafety(COMPANION_STATES.guidance);
    setCompanionMode(COMPANION_STATES.guidance);
    setOpen(true);
  }

  function handleWorkspaceGuidancePrimaryAction() {
    if (wakeTopInsight && wakeObservationType === "emergency") {
      handleWakePrimaryObservation();
      return;
    }

    if (companionPrimaryGuidanceAction?.key) {
      handleQuickAction(companionPrimaryGuidanceAction.key);
      return;
    }

    enterCompanionConversation();
  }

  const launcherPositionStyle = launcherPosition
    ? {
        left: `${launcherPosition.x}px`,
        top: `${launcherPosition.y}px`,
        right: "auto",
        bottom: "auto",
      }
    : {
        right: `max(${launcherEdgeMargin}px, env(safe-area-inset-right, 0px))`,
        bottom: launcherFallbackBottom,
      };
  const companionAnchorStyle = getCompanionAnchorStyle({
    launcherPosition,
    launcherButtonSize,
    viewport: getLauncherViewport(),
    fallbackBottom: launcherBottomClearance,
    companionMode,
    launcherEdgeMargin,
  });

  return (
    <>
      <button
        className="meetro-assistant-launcher"
        type="button"
        aria-label={copy.assistantName || copy.buttonLabel}
        onPointerDown={handleLauncherPointerDown}
        onPointerMove={handleLauncherPointerMove}
        onPointerUp={handleLauncherPointerUp}
        onPointerCancel={handleLauncherPointerUp}
        onClick={handleLauncherClick}
        style={{
          ...assistantButton,
          ...(wakeOpen ? assistantButtonWake : {}),
          ...launcherPositionStyle,
        }}
      >
        <span style={assistantButtonMark} aria-hidden="true">
          {ASSISTANT_ORB_MARK}
        </span>
        <span style={assistantButtonText}>{t("assistantCompanionAskMeetro", language)}</span>
        <span style={assistantPresenceDot} aria-hidden="true" />
      </button>

      {wakeOpen && !open && (
        <section
          style={getAssistantWakeBubbleStyle({
            launcherPosition,
            launcherButtonSize,
            viewport: getLauncherViewport(),
            fallbackBottom: launcherBottomClearance,
            reducedMotion: getAssistantReducedMotion(),
          })}
          role="status"
          aria-live="polite"
          aria-label={t("assistantWakeAriaLabel", language)}
        >
          <button
            type="button"
            style={assistantWakeDismissButton}
            onClick={clearAssistantWake}
            aria-label={t("assistantWakeDismiss", language)}
          >
            ×
          </button>
          <div style={assistantWakeIcon} aria-hidden="true">
            {ASSISTANT_ORB_MARK}
          </div>
          <p style={assistantWakeStatus}>{lanternContext.status}</p>
          <p style={assistantWakeGreeting}>{compactCompanionTitle}</p>
          <p style={assistantWakePrompt}>{compactCompanionMessage}</p>
          <div style={assistantWakeActions}>
            <button
              type="button"
              style={assistantWakeAction}
              onClick={handleWakePrimaryObservation}
            >
              {compactCompanionPrimaryLabel}
            </button>
            <button
              type="button"
              style={assistantWakeSecondaryAction}
              onClick={handleWakeAskMeetro}
            >
              {lanternContext.secondaryActionLabel}
            </button>
          </div>
        </section>
      )}

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
            style={companionAnchorStyle}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="meetro-assistant-ambient-glow" aria-hidden="true" />
            <div className="meetro-assistant-ambient-ring" aria-hidden="true" />

          <div
            className={`meetro-assistant-sheet meetro-assistant-sheet-${assistantMode}`}
            ref={assistantSheetRef}
            style={{
              ...assistantSheet,
              ...companionStateStyles[companionMode],
              ...(assistantModeGlow[assistantMode] || assistantModeGlow.ready),
              paddingBottom: isChat
                ? "calc(18px + env(safe-area-inset-bottom))"
                : "calc(22px + env(safe-area-inset-bottom))",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={assistantHandle} />

            <div style={assistantHeader}>
              <div style={assistantHeaderCopy}>
                <span style={assistantEyebrow}>{lanternContext.title}</span>
                <h2 style={assistantTitle}>{t("assistantCompanionPanelTitle", language)}</h2>
                <p style={assistantPromptText}>{companionWorkspaceGreeting}</p>
              </div>

              <div style={assistantHeaderActions}>
                <button type="button" style={assistantCloseButton} onClick={closeAssistant}>
                  {copy.close}
                </button>
              </div>
            </div>

            {isGuidanceMode && (
              <section
                style={companionGuidancePanel}
                aria-label={t("assistantCompanionWorkspaceGuidance", language)}
              >
                <div style={companionGuidanceItem}>
                  <span style={companionGuidanceLabel}>
                    {t("assistantCompanionObservation", language)}
                  </span>
                  <p style={companionGuidanceText}>{companionGuidanceObservation}</p>
                </div>

                <div style={companionGuidanceItem}>
                  <span style={companionGuidanceLabel}>
                    {t("assistantCompanionRecommendation", language)}
                  </span>
                  <p style={companionGuidanceText}>{companionGuidanceRecommendation}</p>
                </div>

                <div style={companionGuidanceActions}>
                  <button
                    type="button"
                    style={companionGuidancePrimaryAction}
                    onClick={handleWorkspaceGuidancePrimaryAction}
                  >
                    {companionPrimaryGuidanceAction?.label ||
                      compactCompanionPrimaryLabel ||
                      t("companionContextReviewNextStep", language)}
                  </button>

                  <button
                    type="button"
                    style={companionGuidanceAskAction}
                    onClick={enterCompanionConversation}
                  >
                    {t("assistantCompanionAskMeetro", language)}
                  </button>
                </div>
              </section>
            )}

            {isConversationMode && (
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
                  {voiceListening ? "..." : "Mic"}
                </button>

                <div style={voiceHeroText}>
                  <div style={voiceTitleRow}>
                    <strong style={voiceTitle}>{lanternContext.status}</strong>
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

              {companionSuggestedActions.length > 0 && (
                <div style={companionSuggestionPanel}>
                  <span style={companionSuggestionTitle}>
                    {t("assistantCompanionSuggestedActions", language)}
                  </span>
                  <div style={companionSuggestionGrid}>
                    {companionSuggestedActions.map((action) => (
                      <button
                        key={action.key}
                        type="button"
                        style={companionSuggestionButton}
                        onClick={() => handleQuickAction(action.key)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {voiceAnswer && (
                <div style={voiceAnswerBox} ref={voiceAnswerRef}>
                  <div style={voiceAnswerHeader}>
                    <span style={assistantLabel}>
                      {t("meetroName", language)}
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
                  <div style={voiceMetaRow}>
                    {voiceStatusChip && (
                      <span
                        style={{
                          ...workflowStatusChip,
                          ...(workflowStatusChipStyles[voiceStatusChip.level] ||
                            workflowStatusChipStyles.yellow),
                        }}
                      >
                        <span style={workflowStatusDot} />
                        {voiceStatusChip.label}
                      </span>
                    )}
                    {voiceIntent && (
                      <span style={voiceIntentPill}>
                        {getAssistantIntentDisplayLabel(voiceIntent, language)}
                      </span>
                    )}
                  </div>

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

              <form style={companionInputForm} onSubmit={submitTypedQuestion}>
                <input
                  value={typedQuestion}
                  onChange={(event) => setTypedQuestion(event.target.value)}
                  placeholder={t("assistantCompanionInputPlaceholder", language)}
                  style={companionInput}
                  aria-label={t("assistantCompanionInputPlaceholder", language)}
                />
                <button
                  type="submit"
                  style={{
                    ...companionInputSubmit,
                    ...(!typedQuestion.trim() ? companionInputSubmitDisabled : {}),
                  }}
                  disabled={!typedQuestion.trim()}
                >
                  {t("assistantCompanionSend", language)}
                </button>
              </form>

            </div>
            )}

            {false && showAdvancedHelp && (
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
  right: "max(18px, env(safe-area-inset-right, 0px))",
  zIndex: 9998,
  minWidth: 126,
  height: 50,
  padding: "7px 11px 7px 8px",
  maxWidth: "calc(100% - 24px)",
  boxSizing: "border-box",
  contain: "layout paint",
  borderRadius: 999,
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  background:
    "linear-gradient(135deg, var(--meetro-surface-paper, rgba(255,253,248,0.94)), var(--meetro-surface-sage, rgba(238,244,234,0.9)))",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: 15,
  fontWeight: 950,
  boxShadow:
    "var(--meetro-shadow-soft, 0 16px 38px rgba(49, 35, 20, 0.08))",
  cursor: "pointer",
  touchAction: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const assistantButtonWake = {
  boxShadow:
    "0 0 0 8px rgba(31, 77, 52, 0.10), 0 22px 44px rgba(49, 35, 20, 0.16), inset 0 1px 0 rgba(255,255,255,0.78)",
  transform: "scale(1.025)",
};

const assistantButtonMark = {
  width: 32,
  height: 32,
  display: "grid",
  placeItems: "center",
  borderRadius: "50%",
  background:
    "linear-gradient(145deg, var(--meetro-surface-paper, rgba(255,253,248,0.94)), var(--meetro-surface-warm, rgba(251,246,237,0.92)))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: 17,
  fontWeight: 950,
  letterSpacing: 0,
  lineHeight: 1,
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.9), 0 5px 14px rgba(49, 35, 20, 0.12)",
};

const assistantButtonText = {
  display: "inline-flex",
  alignItems: "center",
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontSize: 13,
  lineHeight: 1,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const assistantPresenceDot = {
  width: 8,
  height: 8,
  borderRadius: 999,
  background: "var(--meetro-color-forest, #1f4d34)",
  boxShadow:
    "0 0 0 4px rgba(31, 77, 52, 0.12), 0 0 14px rgba(31, 77, 52, 0.22)",
  flexShrink: 0,
};

function getAssistantWakeBubbleStyle({
  launcherPosition = null,
  launcherButtonSize = 52,
  viewport = { width: 390, height: 844 },
  fallbackBottom = 94,
  reducedMotion = false,
} = {}) {
  const width = 280;
  const safeWidth = Math.max(280, Number(viewport.width) || 390);
  const safeHeight = Math.max(320, Number(viewport.height) || 844);
  const base = {
    ...assistantWakeBubble,
    width,
    animation: getAssistantWakeAnimation(reducedMotion),
  };

  if (launcherPosition) {
    const x = Math.min(
      Math.max(12, Number(launcherPosition.x || 0) - width + launcherButtonSize),
      Math.max(12, safeWidth - width - 12)
    );
    const y = Math.min(
      Math.max(16, Number(launcherPosition.y || 0) - 194),
      Math.max(16, safeHeight - 260)
    );
    return {
      ...base,
      left: x,
      top: y,
      right: "auto",
      bottom: "auto",
    };
  }

  return {
    ...base,
    right: "max(18px, env(safe-area-inset-right, 0px))",
    bottom: `calc(${fallbackBottom + 64}px + env(safe-area-inset-bottom, 0px))`,
  };
}

function getEstimatedCompanionExpandedHeight({
  companionMode = COMPANION_STATES.guidance,
  viewport = {},
  fallbackBottom = 94,
} = {}) {
  const safeHeight = Math.max(520, Number(viewport.height || 0));
  const safeAreaTop = Number(viewport.safeAreaTop || 0);
  const safeAreaBottom = Number(viewport.safeAreaBottom || 0);
  const protectedHeight =
    safeAreaTop +
    safeAreaBottom +
    fallbackBottom +
    ASSISTANT_EXPANDED_CARD_VIEWPORT_MARGIN * 2;
  const availableHeight = Math.max(280, safeHeight - protectedHeight);
  const modeHeight =
    companionMode === COMPANION_STATES.conversation
      ? Math.min(safeHeight * 0.86, 720)
      : companionMode === COMPANION_STATES.guidance
      ? Math.min(safeHeight * 0.72, 520)
      : Math.min(safeHeight * 0.84, 620);

  return Math.min(availableHeight, modeHeight);
}

function getCompanionAnchorMetrics({
  launcherPosition = null,
  launcherButtonSize = 126,
  viewport = {},
  fallbackBottom = 94,
  companionMode = COMPANION_STATES.guidance,
  launcherEdgeMargin = ASSISTANT_LAUNCHER_EDGE_MARGIN,
} = {}) {
  const safeWidth = Math.max(320, Number(viewport.width || 0));
  const safeHeight = Math.max(520, Number(viewport.height || 0));
  const companionWidth = Math.min(388, Math.max(288, safeWidth - 32));
  const launcherHeight = 50;
  const viewportPadding = safeWidth < 520 ? 12 : 16;
  const safeAreaTop = Number(viewport.safeAreaTop || 0);
  const safeAreaBottom = Number(viewport.safeAreaBottom || 0);
  const visibleTop = ASSISTANT_EXPANDED_CARD_VIEWPORT_MARGIN + safeAreaTop;
  const visibleBottom =
    safeHeight -
    ASSISTANT_EXPANDED_CARD_VIEWPORT_MARGIN -
    safeAreaBottom -
    fallbackBottom;
  const estimatedCompanionHeight = getEstimatedCompanionExpandedHeight({
    companionMode,
    viewport,
    fallbackBottom,
  });
  const fallbackLauncherPosition = {
    x: safeWidth - launcherEdgeMargin - launcherButtonSize,
    y: safeHeight - fallbackBottom - launcherHeight,
  };
  const anchorPosition = launcherPosition || fallbackLauncherPosition;
  const launcherY = Number(anchorPosition.y || 0);
  const availableAbove =
    launcherY - ASSISTANT_EXPANDED_CARD_GAP - visibleTop;
  const availableBelow =
    visibleBottom -
    (launcherY + launcherHeight + ASSISTANT_EXPANDED_CARD_GAP);
  const hasRoomAbove = availableAbove >= estimatedCompanionHeight;
  const placeBelow =
    availableBelow >= estimatedCompanionHeight ||
    (availableBelow > availableAbove && !hasRoomAbove);
  const targetLeft =
    Number(anchorPosition.x || 0) + launcherButtonSize / 2 < safeWidth / 2
      ? Number(anchorPosition.x || 0)
      : Number(anchorPosition.x || 0) + launcherButtonSize - companionWidth;
  const maxLeft = Math.max(viewportPadding, safeWidth - companionWidth - viewportPadding);
  const left = Math.min(Math.max(viewportPadding, targetLeft), maxLeft);
  const desiredVisualTop = launcherY + launcherHeight + ASSISTANT_EXPANDED_CARD_GAP;
  const desiredVisualBottom = launcherY - ASSISTANT_EXPANDED_CARD_GAP;
  const visualTop = placeBelow
    ? Math.min(
        Math.max(visibleTop, desiredVisualTop),
        Math.max(visibleTop, visibleBottom - estimatedCompanionHeight)
      )
    : Math.min(
        Math.max(visibleTop, desiredVisualBottom - estimatedCompanionHeight),
        Math.max(visibleTop, visibleBottom - estimatedCompanionHeight)
      );
  const visualBottom = placeBelow
    ? visualTop + estimatedCompanionHeight
    : Math.min(
        Math.max(visibleTop + estimatedCompanionHeight, desiredVisualBottom),
        visibleBottom
      );
  const top = placeBelow ? visualTop : visualBottom;
  const desiredAnchor = placeBelow ? desiredVisualTop : desiredVisualBottom;
  const clampedAnchor = top;
  const launcherAdjustmentY = clampedAnchor - desiredAnchor;

  return {
    left,
    top,
    transform: placeBelow ? "none" : "translateY(-100%)",
    estimatedCompanionHeight,
    visualTop: placeBelow ? visualTop : visualBottom - estimatedCompanionHeight,
    visualBottom,
    launcherAdjustmentY,
    positionAdjustmentRequired: Math.abs(launcherAdjustmentY) >= 1,
    placeBelow,
  };
}

function getCompanionAnchorStyle(options = {}) {
  const metrics = getCompanionAnchorMetrics(options);

  return {
    position: "fixed",
    left: metrics.left,
    top: metrics.top,
    right: "auto",
    bottom: "auto",
    margin: 0,
    transform: metrics.transform,
    transition: "left 160ms ease, top 160ms ease, transform 160ms ease",
  };
}

const assistantWakeBubble = {
  position: "fixed",
  zIndex: 9999,
  maxWidth: "calc(100vw - 24px)",
  boxSizing: "border-box",
  borderRadius: 22,
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  background:
    "linear-gradient(145deg, var(--meetro-surface-paper, rgba(255,253,248,0.94)), var(--meetro-surface-warm, rgba(251,246,237,0.92)))",
  backdropFilter: "blur(22px)",
  WebkitBackdropFilter: "blur(22px)",
  boxShadow:
    "var(--meetro-shadow-soft, 0 16px 38px rgba(49, 35, 20, 0.08))",
  padding: "14px 14px 13px",
  color: "var(--meetro-color-ink, #172317)",
  overflow: "hidden",
  animation: "meetroAssistantWakeIn 180ms ease-out",
};

const assistantWakeDismissButton = {
  position: "absolute",
  top: 7,
  right: 8,
  width: 28,
  height: 28,
  border: "none",
  borderRadius: "50%",
  background: "rgba(31, 77, 52, 0.08)",
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: 18,
  lineHeight: "28px",
  cursor: "pointer",
};

const assistantWakeIcon = {
  width: 30,
  height: 30,
  display: "grid",
  placeItems: "center",
  borderRadius: "50%",
  background: "var(--meetro-surface-warm, rgba(251,246,237,0.92))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: 14,
  fontWeight: 950,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
  marginBottom: 8,
};

const assistantWakeStatus = {
  display: "inline-flex",
  margin: "0 34px 6px 0",
  padding: "4px 8px",
  borderRadius: 999,
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: 11,
  lineHeight: 1,
  fontWeight: 950,
};

const assistantWakeGreeting = {
  margin: "0 34px 3px 0",
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontSize: 15,
  fontWeight: 850,
  lineHeight: 1.25,
};

const assistantWakePrompt = {
  margin: "0 0 11px",
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: 13,
  fontWeight: 650,
  lineHeight: 1.35,
};

const assistantWakeActions = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const assistantWakeAction = {
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  borderRadius: 999,
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: 12,
  fontWeight: 850,
  padding: "8px 10px",
  cursor: "pointer",
  maxWidth: "100%",
};

const assistantWakeSecondaryAction = {
  ...assistantWakeAction,
  background: "var(--meetro-surface-warm, rgba(251,246,237,0.92))",
  color: "var(--meetro-color-muted, #65705f)",
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
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
    "radial-gradient(circle at 50% 24%, rgba(20, 53, 31, 0.24), transparent 36%), rgba(20, 18, 14, 0.58)",
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
  maxHeight: "min(84dvh, 720px)",
  overflowY: "auto",
  overflowX: "hidden",
  boxSizing: "border-box",
  background:
    "linear-gradient(145deg, var(--meetro-surface-paper, rgba(255,253,248,0.94)), var(--meetro-surface-warm, rgba(251,246,237,0.92)))",
  backdropFilter: "blur(22px)",
  WebkitBackdropFilter: "blur(22px)",
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  borderRadius: 34,
  padding: "20px max(18px, env(safe-area-inset-right)) 18px max(18px, env(safe-area-inset-left))",
  margin: 0,
  boxShadow:
    "var(--meetro-shadow-lifted, 0 24px 70px rgba(49, 35, 20, 0.14))",
  transition:
    "max-height 180ms ease, padding 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
  willChange: "max-height",
};

const companionStateStyles = {
  [COMPANION_STATES.guidance]: {
    maxHeight: "min(72dvh, 520px)",
  },
  [COMPANION_STATES.conversation]: {
    maxHeight: "min(86dvh, 720px)",
  },
};

const assistantModeGlow = {
  ready: {
    boxShadow:
      "var(--meetro-shadow-lifted, 0 24px 70px rgba(49, 35, 20, 0.14))",
  },
  listening: {
    border: "1px solid rgba(183, 121, 31, 0.24)",
    boxShadow:
      "0 28px 96px rgba(49, 35, 20, 0.18), 0 0 36px rgba(183, 121, 31, 0.12), inset 0 1px 0 rgba(255,255,255,0.84)",
  },
  thinking: {
    border: "1px solid rgba(31, 77, 52, 0.24)",
    boxShadow:
      "0 28px 96px rgba(49, 35, 20, 0.18), 0 0 34px rgba(31, 77, 52, 0.12), inset 0 1px 0 rgba(255,255,255,0.84)",
  },
  speaking: {
    border: "1px solid rgba(31, 77, 52, 0.26)",
    boxShadow:
      "0 28px 96px rgba(49, 35, 20, 0.18), 0 0 34px rgba(31, 77, 52, 0.13), inset 0 1px 0 rgba(255,255,255,0.84)",
  },
  responding: {
    border: "1px solid rgba(31, 77, 52, 0.26)",
    boxShadow:
      "0 28px 96px rgba(49, 35, 20, 0.18), 0 0 34px rgba(31, 77, 52, 0.13), inset 0 1px 0 rgba(255,255,255,0.84)",
  },
};

const assistantHandle = {
  width: 46,
  height: 5,
  borderRadius: 999,
  background: "rgba(101, 112, 95, 0.26)",
  margin: "0 auto 14px",
};

const assistantHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 10,
  maxWidth: "100%",
};

const assistantHeaderCopy = {
  minWidth: 0,
  flex: "1 1 auto",
};

const assistantHeaderActions = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: 7,
  flexShrink: 0,
  maxWidth: "45%",
};

const assistantEyebrow = {
  display: "block",
  marginBottom: 4,
  color: "var(--meetro-color-coffee, #4a3428)",
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const assistantTitle = {
  margin: 0,
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontSize: 26,
  lineHeight: 1.1,
  fontWeight: 950,
};

const assistantPurposeText = {
  margin: "5px 0 0",
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: 13,
  lineHeight: 1.35,
  fontWeight: 800,
  maxWidth: 360,
};

const assistantGreetingText = {
  margin: "8px 0 0",
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontSize: 17,
  lineHeight: 1.2,
  fontWeight: 950,
};

const assistantPromptText = {
  margin: "3px 0 0",
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: 15,
  lineHeight: 1.3,
  fontWeight: 850,
};

const companionNoticePanel = {
  padding: 14,
  borderRadius: 22,
  background:
    "linear-gradient(145deg, var(--meetro-surface-paper, rgba(255,253,248,0.94)), var(--meetro-surface-sage, rgba(238,244,234,0.9)))",
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  boxShadow: "var(--meetro-shadow-soft, 0 16px 38px rgba(49, 35, 20, 0.08))",
  marginBottom: 12,
};

const companionNoticeList = {
  display: "grid",
  gap: 7,
  margin: "7px 0 11px",
  padding: 0,
  listStyle: "none",
};

const companionNoticeItem = {
  margin: 0,
  color: "var(--meetro-color-ink, #172317)",
  fontSize: 14,
  lineHeight: 1.38,
  fontWeight: 760,
};

const companionIntentGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
  marginBottom: 12,
};

const companionIntentButton = {
  minHeight: 42,
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  borderRadius: 15,
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: 12,
  lineHeight: 1.15,
  fontWeight: 900,
  padding: "9px 8px",
  cursor: "pointer",
};

const companionIntentButtonActive = {
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  border: "1px solid rgba(31, 77, 52, 0.22)",
  color: "var(--meetro-color-forest-deep, #14351f)",
};

const companionInsightPanel = {
  padding: 13,
  borderRadius: 18,
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  marginBottom: 12,
};

const companionInsightText = {
  margin: 0,
  color: "var(--meetro-color-ink, #172317)",
  fontSize: 14,
  lineHeight: 1.42,
  fontWeight: 760,
};

const assistantNotificationPill = {
  display: "inline-flex",
  marginTop: 8,
  padding: "5px 8px",
  borderRadius: 999,
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: 11,
  lineHeight: 1.1,
  fontWeight: 950,
};

const assistantCloseButton = {
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-muted, #65705f)",
  borderRadius: 14,
  padding: "9px 11px",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
};

const assistantBackButton = {
  ...assistantCloseButton,
  background: "var(--meetro-surface-warm, rgba(251,246,237,0.92))",
  color: "var(--meetro-color-forest, #1f4d34)",
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
};

const assistantInfoCard = {
  padding: 13,
  borderRadius: 18,
  background:
    "linear-gradient(135deg, var(--meetro-surface-paper, rgba(255,253,248,0.94)), var(--meetro-surface-sage, rgba(238,244,234,0.9)))",
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  marginBottom: 12,
};

const assistantLabel = {
  display: "block",
  marginBottom: 5,
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: 11,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
};

const assistantScreenName = {
  display: "block",
  color: "var(--meetro-color-forest-deep, #14351f)",
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
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
};

const assistantText = {
  margin: 0,
  color: "var(--meetro-color-ink, #172317)",
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
    "radial-gradient(circle at top left, rgba(31,77,52,0.08), transparent 38%), linear-gradient(145deg, var(--meetro-surface-paper, rgba(255,253,248,0.94)), var(--meetro-surface-sage, rgba(238,244,234,0.9)))",
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  boxShadow: "var(--meetro-shadow-soft, 0 16px 38px rgba(49, 35, 20, 0.08))",
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
  width: 56,
  height: 56,
  borderRadius: "50%",
  border: "1px solid rgba(31, 77, 52, 0.18)",
  background:
    "radial-gradient(circle at 35% 25%, rgba(255,255,255,0.84), rgba(223,232,216,0.78) 58%, rgba(31,77,52,0.14))",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: 24,
  fontWeight: 950,
  cursor: "pointer",
  flexShrink: 0,
  boxShadow:
    "0 0 0 5px rgba(31,77,52,0.08), 0 12px 26px rgba(49,35,20,0.14)",
};

const voiceButtonListening = {
  background:
    "linear-gradient(135deg, var(--meetro-color-wood, #b7791f), var(--meetro-color-coffee, #4a3428))",
  border: "1px solid rgba(183, 121, 31, 0.34)",
  boxShadow:
    "0 0 0 10px rgba(183,121,31,0.10), 0 18px 38px rgba(74,52,40,0.20)",
};

const voiceButtonThinking = {
  background:
    "linear-gradient(135deg, var(--meetro-color-forest, #1f4d34), var(--meetro-color-forest-deep, #14351f))",
  boxShadow:
    "0 0 0 9px rgba(31,77,52,0.10), 0 18px 38px rgba(49,35,20,0.18)",
};

const voiceButtonSpeaking = {
  background:
    "linear-gradient(135deg, var(--meetro-color-forest, #1f4d34), var(--meetro-color-coffee, #4a3428))",
  boxShadow:
    "0 0 0 9px rgba(31,77,52,0.10), 0 18px 38px rgba(49,35,20,0.18)",
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
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontSize: 18,
  lineHeight: 1.2,
  fontWeight: 950,
};

const voiceStatusPill = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "4px 8px",
  borderRadius: 999,
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  border: "1px solid rgba(31, 77, 52, 0.14)",
  fontSize: 10,
  lineHeight: 1,
  fontWeight: 950,
};

const voiceStatusDot = {
  width: 6,
  height: 6,
  borderRadius: 999,
  background: "currentColor",
  boxShadow: "0 0 0 3px rgba(31,77,52,0.10)",
};

const voiceStatusStyles = {
  ready: {
    background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
    color: "var(--meetro-color-forest, #1f4d34)",
    border: "1px solid rgba(31, 77, 52, 0.14)",
  },
  listening: {
    background: "rgba(251, 246, 237, 0.96)",
    color: "var(--meetro-color-wood, #b7791f)",
    border: "1px solid rgba(183, 121, 31, 0.24)",
  },
  thinking: {
    background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
    color: "var(--meetro-color-forest, #1f4d34)",
    border: "1px solid rgba(31, 77, 52, 0.18)",
  },
  speaking: {
    background: "rgba(223, 232, 216, 0.92)",
    color: "var(--meetro-color-forest-deep, #14351f)",
    border: "1px solid rgba(31, 77, 52, 0.18)",
  },
  responding: {
    background: "rgba(223, 232, 216, 0.92)",
    color: "var(--meetro-color-forest-deep, #14351f)",
    border: "1px solid rgba(31, 77, 52, 0.18)",
  },
};

const voiceHintText = {
  margin: "0",
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: 13,
  lineHeight: 1.35,
  fontWeight: 850,
};

const companionGuidancePanel = {
  display: "grid",
  gap: 12,
  borderRadius: 24,
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  background:
    "linear-gradient(145deg, var(--meetro-surface-paper, rgba(255,253,248,0.94)), var(--meetro-surface-sage, rgba(238,244,234,0.9)))",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.82), var(--meetro-shadow-soft, 0 16px 38px rgba(49, 35, 20, 0.08))",
  padding: 14,
};

const companionGuidanceItem = {
  display: "grid",
  gap: 6,
};

const companionGuidanceLabel = {
  color: "var(--meetro-color-coffee, #4a3428)",
  fontSize: 11,
  lineHeight: 1,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const companionGuidanceText = {
  margin: 0,
  color: "var(--meetro-color-ink, #172317)",
  fontSize: 14,
  lineHeight: 1.42,
  fontWeight: 820,
};

const companionGuidanceActions = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  flexWrap: "wrap",
  marginTop: 2,
};

const companionGuidancePrimaryAction = {
  flex: "1 1 160px",
  minHeight: 42,
  border: "1px solid rgba(20, 53, 31, 0.24)",
  borderRadius: 999,
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "#fff",
  fontSize: 13,
  fontWeight: 950,
  padding: "0 15px",
  cursor: "pointer",
  boxShadow: "0 12px 26px rgba(49, 35, 20, 0.14)",
};

const companionGuidanceAskAction = {
  flex: "0 0 auto",
  minHeight: 42,
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  borderRadius: 999,
  background:
    "linear-gradient(145deg, var(--meetro-surface-paper, rgba(255,253,248,0.94)), var(--meetro-surface-warm, rgba(251,246,237,0.92)))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: 13,
  fontWeight: 950,
  padding: "0 15px",
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.84)",
};

const companionSuggestionPanel = {
  borderRadius: 22,
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
  padding: 12,
};

const companionSuggestionTitle = {
  display: "block",
  marginBottom: 8,
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: 11,
  lineHeight: 1,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const companionSuggestionGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 8,
};

const companionSuggestionButton = {
  width: "100%",
  minHeight: 38,
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  borderRadius: 999,
  background:
    "linear-gradient(145deg, var(--meetro-surface-paper, rgba(255,253,248,0.94)), var(--meetro-surface-warm, rgba(251,246,237,0.92)))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: 13,
  fontWeight: 850,
  textAlign: "left",
  padding: "10px 13px",
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.82)",
};

const companionInputForm = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  minWidth: 0,
  marginTop: 2,
  boxSizing: "border-box",
};

const companionInput = {
  flex: "1 1 auto",
  minWidth: 0,
  height: 42,
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  borderRadius: 999,
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-ink, #172317)",
  fontSize: 14,
  fontWeight: 750,
  padding: "0 14px",
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.84)",
};

const companionInputSubmit = {
  flex: "0 0 auto",
  minWidth: 58,
  height: 42,
  border: "1px solid rgba(20, 53, 31, 0.24)",
  borderRadius: 999,
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "#fff",
  fontSize: 13,
  fontWeight: 900,
  padding: "0 13px",
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(49, 35, 20, 0.14)",
};

const companionInputSubmitDisabled = {
  opacity: 0.45,
  cursor: "not-allowed",
  boxShadow: "none",
};

const voiceReadAloudLabel = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: 12,
  fontWeight: 850,
};

const voiceTipsSection = {
  marginTop: 14,
};

const voiceTipsTitle = {
  display: "block",
  marginBottom: 8,
  color: "var(--meetro-color-coffee, #4a3428)",
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

const fieldPromptSection = {
  marginTop: 13,
  paddingTop: 12,
  borderTop: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
};

const fieldPromptGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: 7,
  maxWidth: "100%",
};

const fieldPromptChip = {
  maxWidth: "100%",
  border: "1px solid rgba(31, 77, 52, 0.16)",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  borderRadius: 999,
  padding: "8px 10px",
  fontSize: 12,
  lineHeight: 1.15,
  fontWeight: 950,
  cursor: "pointer",
  overflowWrap: "normal",
  wordBreak: "normal",
};

const voiceTipChip = {
  maxWidth: "100%",
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-coffee, #4a3428)",
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
  borderTop: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
};

const assistantStarterChip = {
  ...voiceTipChip,
  border: "1px solid rgba(31, 77, 52, 0.16)",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
};

const voiceResultBox = {
  marginTop: 11,
  padding: 11,
  borderRadius: 15,
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
};

const voiceAnswerBox = {
  marginTop: 10,
  padding: 13,
  borderRadius: 18,
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  boxShadow: "var(--meetro-shadow-soft, 0 16px 38px rgba(49, 35, 20, 0.08))",
};

const voiceAnswerHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 8,
};

const voiceSpeakButton = {
  border: "1px solid rgba(31, 77, 52, 0.18)",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-forest, #1f4d34)",
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 11,
  lineHeight: 1,
  fontWeight: 950,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const voiceSpeakButtonActive = {
  background: "var(--meetro-color-forest, #1f4d34)",
  borderColor: "var(--meetro-color-forest, #1f4d34)",
  color: "#ffffff",
};

const voiceUnavailablePill = {
  display: "inline-flex",
  padding: "6px 8px",
  borderRadius: 999,
  background: "var(--meetro-surface-warm, rgba(251,246,237,0.92))",
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: 10,
  lineHeight: 1.1,
  fontWeight: 900,
};

const voiceSpeakingPill = {
  display: "inline-flex",
  marginBottom: 8,
  padding: "5px 8px",
  borderRadius: 999,
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: 10,
  lineHeight: 1.1,
  fontWeight: 950,
};

const voiceTranscriptText = {
  margin: 0,
  color: "var(--meetro-color-ink, #172317)",
  fontSize: 13,
  lineHeight: 1.4,
  fontWeight: 800,
};

const voiceAnswerText = {
  margin: 0,
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontSize: 14,
  lineHeight: 1.45,
  fontWeight: 850,
  whiteSpace: "pre-line",
};

const voiceIntentPill = {
  display: "inline-flex",
  padding: "5px 8px",
  borderRadius: 999,
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: 11,
  fontWeight: 950,
};

const voiceMetaRow = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 7,
  marginTop: 8,
};

const workflowStatusChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 8px",
  borderRadius: 999,
  border: "1px solid transparent",
  fontSize: 11,
  lineHeight: 1.1,
  fontWeight: 950,
};

const workflowStatusDot = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "currentColor",
  flex: "0 0 auto",
};

const workflowStatusChipStyles = {
  green: {
    background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
    borderColor: "rgba(31, 77, 52, 0.18)",
    color: "var(--meetro-color-forest, #1f4d34)",
  },
  yellow: {
    background: "rgba(251, 246, 237, 0.96)",
    borderColor: "rgba(183, 121, 31, 0.24)",
    color: "var(--meetro-color-wood, #b7791f)",
  },
  red: {
    background: "rgba(250, 228, 214, 0.96)",
    borderColor: "rgba(143, 63, 18, 0.24)",
    color: "#8f3f12",
  },
};

const voiceActionGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 11,
};

const voiceActionButton = {
  border: "1px solid rgba(31, 77, 52, 0.18)",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-forest, #1f4d34)",
  borderRadius: 999,
  padding: "8px 11px",
  fontSize: 12,
  lineHeight: 1.1,
  fontWeight: 950,
  cursor: "pointer",
};

const voiceErrorText = {
  margin: "10px 0 0",
  color: "var(--meetro-color-wood, #b7791f)",
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
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-forest, #1f4d34)",
  borderRadius: 15,
  padding: "11px 10px",
  fontSize: 13,
  fontWeight: 950,
  cursor: "pointer",
};

const advancedToggle = {
  width: "100%",
  marginTop: 12,
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-muted, #65705f)",
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
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
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
  color: "var(--meetro-color-charcoal, #172317)",
  fontSize: 12,
  fontWeight: 900,
  textAlign: "center",
};

export default MeetroAssistant;
