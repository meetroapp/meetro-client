import { lazy, memo, useEffect, useMemo, useCallback, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage } from "../utils/language";
import { authFetch } from "../utils/authFetch";
import { isProfessionalSession } from "../utils/session";
const WorkflowRenderer =  lazy(() => import("../components/workflows/WorkflowRenderer"));
const CompletionWorkflowPresentation = lazy(() => import("../components/workflows/presentations/CompletionWorkflowPresentation"));
const InvoiceWorkflowPresentation = lazy(() => import("../components/workflows/presentations/InvoiceWorkflowPresentation"));
const MaterialsWorkflowPresentation = lazy(() => import("../components/workflows/presentations/MaterialsWorkflowPresentation"));
const RevisedQuoteWorkflowPresentation = lazy(() => import("../components/workflows/presentations/RevisedQuoteWorkflowPresentation"));
import {
  getWorkflowMessageProps,
  isWorkflowMessageType,
  isWorkflowType,
} from "../utils/workflowTypes";

import {
  updateMatchingHomeownerRequests,
  prependProjectTimeline,
} from "../utils/workflowTimeline";

const IconBack = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M15 18 9 12l6-6"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconPhone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 11.2 19a19.3 19.3 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6.1 6.1l1.6-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6A2 2 0 0 1 22 16.9z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconMore = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 5.5h.01M12 12h.01M12 18.5h.01"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const IconPlus = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 5v14M5 12h14"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
);

const IconMic = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 14.5c1.7 0 3-1.3 3-3V5c0-1.7-1.3-3-3-3S9 3.3 9 5v6.5c0 1.7 1.3 3 3 3Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M5 10.8c0 3.9 3.1 7 7 7s7-3.1 7-7M12 17.8V22"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const IconSend = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 19V5M6 11l6-6 6 6"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconCameraClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <path
      d="M8.2 7.2 9.8 5h4.4l1.6 2.2h2.4c1.1 0 2 .9 2 2v7.7c0 1.1-.9 2-2 2H5.8c-1.1 0-2-.9-2-2V9.2c0-1.1.9-2 2-2h2.4Z"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.9" />
  </svg>
);

const IconPhotosClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="6" width="14" height="13" rx="2.4" stroke="currentColor" strokeWidth="1.9" />
    <path
      d="M8.2 15.8 11 13l2.2 2.1 1.4-1.5 2.8 2.9"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8.8 4h9.1c1.7 0 3.1 1.4 3.1 3.1v8.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="15.2" cy="9.8" r="1" fill="currentColor" />
  </svg>
);

const IconLocationClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 21s6.2-5.6 6.2-11.1A6.2 6.2 0 0 0 5.8 9.9C5.8 15.4 12 21 12 21Z"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="9.9" r="2.1" stroke="currentColor" strokeWidth="1.9" />
  </svg>
);


const IconUpdateClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 6v6l4 2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="12"
      r="8"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const IconApprovalClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <path
      d="M7 12.5 10 15.5 17 8.5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const IconPaymentClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <rect
      x="3"
      y="6"
      width="18"
      height="12"
      rx="3"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M3 10h18"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle
      cx="16"
      cy="14"
      r="1.5"
      fill="currentColor"
    />
  </svg>
);

const IconMaterialsClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <path
      d="M6 7h12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M8 7v10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M16 7v10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M5 17h14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);


const IconScanClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <path
      d="M7 3H5.5A2.5 2.5 0 0 0 3 5.5V7M17 3h1.5A2.5 2.5 0 0 1 21 5.5V7M7 21H5.5A2.5 2.5 0 0 1 3 18.5V17M17 21h1.5a2.5 2.5 0 0 0 2.5-2.5V17"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    <rect x="7" y="6" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9.5 10h5M9.5 13h5M9.5 16h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);



const MessageItem = memo(({ message }) => {
  return (
    <div style={{ overscrollBehavior: 'contain' }} className="message-item">
      {message.text || message.content}
    </div>
  );
});


function ConversationThread({ setPage }) {
  const [language, setLanguageState] = useState(getLanguage());
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingWorkflowPhotoType, setPendingWorkflowPhotoType] = useState(null);
  const [pendingPhotoPurpose, setPendingPhotoPurpose] = useState(null);
  const [photoExplanationText, setPhotoExplanationText] = useState("");
  const [showThreadMenu, setShowThreadMenu] = useState(false);
  const [emergencyPanelExpanded, setEmergencyPanelExpanded] = useState(true);
  const [showCallMenu, setShowCallMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [jobStory, setJobStory] = useState(null);
  const [saveNotice, setSaveNotice] = useState("");
  const [jobRecordCount, setJobRecordCount] = useState(0);
  const [showJobRecords, setShowJobRecords] = useState(false);
  const [jobRecords, setJobRecords] = useState([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [showProfileCard, setShowProfileCard] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const bottomRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const textareaRef = useRef(null);

  const conversationId =
    localStorage.getItem("activeConversationId") || "demo-homeowner-1";

  const storageKey = `meetro_conversation_${conversationId}`;

  const selectedBusiness = (() => {
    try {
      return JSON.parse(localStorage.getItem("selectedContractor") || "null");
    } catch {
      return null;
    }
  })();

  const conversationBusinessName =
    localStorage.getItem("conversationBusinessName") ||
    selectedBusiness?.business_name ||
    selectedBusiness?.name ||
    "";

  const conversationType =
    localStorage.getItem("meetroConversationType") || "standard";

  const isEmergencyThread = conversationType === "emergency";

  const emergencyDispatchStatus =
    localStorage.getItem("emergencyDispatchStatus") ||
    localStorage.getItem("activeJobStatus") ||
    "";

  const hasActiveEmergencyJob =
    isEmergencyThread &&
    Boolean(emergencyDispatchStatus) &&
    emergencyDispatchStatus !== "completed";

  const isEmergencyConversation = hasActiveEmergencyJob;


  const emergencyStatusSubtitle = {
    pending:
      language === "es"
        ? "Esperando aceptación"
        : "Waiting for acceptance",

    accepted:
      language === "es"
        ? "Solicitud aceptada"
        : "Request accepted",

    enroute:
      language === "es"
        ? "Profesional en camino"
        : "Professional on the way",

    arrived:
      language === "es"
        ? "Profesional llegó"
        : "Professional arrived",

    started:
      language === "es"
        ? "Trabajo en progreso"
        : "Work in progress",

    completed:
      language === "es"
        ? "Conversación archivada en historial"
        : "Conversation archived in history",
  }[emergencyDispatchStatus];

  const emergencyStepIndex = {
    pending: 0,
    accepted: 1,
    enroute: 2,
    arrived: 3,
    started: 4,
    completed: 5,
  }[emergencyDispatchStatus] ?? 1;

  const activeAccountMode =
    localStorage.getItem("activeAccountMode") || "personal";

  const currentViewerRole =
    activeAccountMode === "business"
      ? "business"
      : "homeowner";

  const activeJobService =
    localStorage.getItem("activeWorkService") ||
    localStorage.getItem("activeJobService") ||
    localStorage.getItem("selectedEmergencyService") ||
    "";

  const activeName = isEmergencyConversation
    ? activeJobService ||
      localStorage.getItem("activeConversationName") ||
      (language === "es" ? "Emergencia" : "Emergency")
    : conversationBusinessName ||
      localStorage.getItem("activeConversationName") ||
      (language === "es" ? "Negocio de Meetro" : "Meetro Business");

  const activeCategory =
    selectedBusiness?.category || selectedBusiness?.businessCategory || "";

  const activeLocation =
    selectedBusiness?.location || selectedBusiness?.address || "";

  const activeProjectTitle =
    localStorage.getItem("activeProjectTitle") ||
    localStorage.getItem("conversationBusinessName") ||
    localStorage.getItem("activeWorkService") ||
    localStorage.getItem("activeJobService") ||
    "";

  const selectedQuoteRequest = (() => {
    try {
      return JSON.parse(localStorage.getItem("selectedQuoteRequest") || "null");
    } catch {
      return null;
    }
  })();

  const activeCustomerName =
    selectedQuoteRequest?.homeownerName ||
    selectedQuoteRequest?.homeowner_name ||
    selectedQuoteRequest?.customerName ||
    selectedQuoteRequest?.homeowner_email ||
    localStorage.getItem("activeJobCustomer") ||
    localStorage.getItem("homeownerName") ||
    localStorage.getItem("activeConversationName") ||
    "Customer";

  const activeBusinessName =
    selectedQuoteRequest?.businessName ||
    selectedQuoteRequest?.business_name ||
    selectedQuoteRequest?.contractorName ||
    selectedQuoteRequest?.providerName ||
    conversationBusinessName ||
    localStorage.getItem("conversationBusinessName") ||
    localStorage.getItem("businessName") ||
    localStorage.getItem("companyName") ||
    activeName;

  const activeRole =
    localStorage.getItem("activeAccountMode") || "personal";

  const activeHeaderName =
    currentViewerRole === "business"
      ? activeCustomerName
      : activeBusinessName;

  const activeHeaderProject =
    activeProjectTitle ||
    activeName ||
    (language === "es" ? "Conversación de proyecto" : "Project Conversation");

  const displayCategory =
    currentViewerRole === "business"
      ? language === "es"
        ? "Cliente"
        : "Customer"
      : activeCategory || (language === "es" ? "Profesional" : "Professional");

  const displayLocation =
    currentViewerRole === "business"
      ? localStorage.getItem("activeCustomerLocation") ||
        localStorage.getItem("projectLocation") ||
        ""
      : activeLocation;

  const personalProfilePhoto =
    localStorage.getItem("meetroPersonalProfilePhoto") || "";

  const businessProfilePhoto =
    localStorage.getItem("meetroBusinessProfilePhoto") || "";

  const activeLogo =
    currentViewerRole === "business"
      ? personalProfilePhoto ||
        selectedBusiness?.logo ||
        selectedBusiness?.imageUrl ||
        selectedBusiness?.profileImage ||
        ""
      : businessProfilePhoto ||
        selectedBusiness?.logo ||
        selectedBusiness?.imageUrl ||
        selectedBusiness?.profileImage ||
        "";

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    const refreshLanguage = () => setLanguageState(getLanguage());

    refreshLanguage();
    window.addEventListener("storage", refreshLanguage);
    window.addEventListener("focus", refreshLanguage);
    window.addEventListener("meetroLanguageChanged", refreshLanguage);
    window.addEventListener("meetro-language-change", refreshLanguage);

    return () => {
      window.removeEventListener("storage", refreshLanguage);
      window.removeEventListener("focus", refreshLanguage);
      window.removeEventListener("meetroLanguageChanged", refreshLanguage);
      window.removeEventListener("meetro-language-change", refreshLanguage);
    };
  }, []);

  const quickReplies = useMemo(() => {
    const activeConversationType =
      localStorage.getItem("meetroConversationType") || "standard";

    const isBusinessUser =
      currentViewerRole === "business";

    if (activeConversationType === "emergency" && isBusinessUser) {

      const emergencyDispatchStatus =
        localStorage.getItem("emergencyDispatchStatus") ||
        localStorage.getItem("activeJobStatus") ||
        "";

      if (emergencyDispatchStatus === "completed") {
        return language === "es"
          ? ["Gracias", "Guardar historial", "Enviar seguimiento"]
          : ["Thank you", "Save history", "Send follow-up"];
      }

      if (emergencyDispatchStatus === "started") {
        return language === "es"
          ? [
              "Completar trabajo",
              "Enviar actualización",
              "Necesito piezas",
            ]
          : [
              "Complete Job",
              "Send update",
              "Need parts",
            ];
      }

      return language === "es"
        ? ["Voy en camino", "Llegué", "Estoy revisando", "Trabajo iniciado"]
        : ["On the way", "I arrived", "Checking now", "Job started"];
    }

    if (activeConversationType === "emergency" && !isBusinessUser) {
      const emergencyDispatchStatus =
        localStorage.getItem("emergencyDispatchStatus") ||
        localStorage.getItem("activeJobStatus") ||
        "";

      if (emergencyDispatchStatus === "completed") {
        return language === "es"
          ? ["Gracias", "Dejar reseña", "Guardar historial"]
          : ["Thank you", "Leave review", "Save history"];
      }

      return language === "es"
        ? ["¿Alguna actualización?", "Gracias", "La puerta está abierta", "Llámame"]
        : ["Any update?", "Thank you", "Door is unlocked", "Please call me"];
    }

    if (isBusinessUser) {
      return language === "es"
        ? ["Puedo ayudarte", "Envíame fotos", "Te aviso pronto", "Gracias"]
        : ["I can help", "Send me photos", "I’ll update you soon", "Thank you"];
    }

    return language === "es"
      ? ["¿Cuándo estás disponible?", "¿Me puedes dar precio?", "Te envío fotos", "Gracias"]
      : ["When are you available?", "Can you send pricing?", "I’ll send photos", "Thank you"];
  }, [language, currentViewerRole]);
  const starterMessages = useMemo(
    () => [
      {
        id: "starter-1",
        type: "text",
        sender: "client",
        text:
          language === "es"
            ? "Hola, necesito ayuda con un proyecto en mi casa."
            : "Hi, I need help with a project at my house.",
        time: "9:42 AM",
        status: "seen",
        seenAt: "9:44 AM",
        unsent: false,
        createdAt: Date.now() - 1000 * 60 * 10,
      },
    ],
    [language]
  );

  useEffect(() => {
    const updateRecordCount = () => {
      const recordKey = `meetro_job_record_${conversationId}`;
      const records = JSON.parse(localStorage.getItem(recordKey) || "[]");

      setJobRecords(Array.isArray(records) ? records : []);
      setJobRecordCount(Array.isArray(records) ? records.length : 0);
    };

    updateRecordCount();

    window.addEventListener("meetroJobRecordUpdated", updateRecordCount);
    window.addEventListener("storage", updateRecordCount);

    return () => {
      window.removeEventListener("meetroJobRecordUpdated", updateRecordCount);
      window.removeEventListener("storage", updateRecordCount);
    };
  }, [conversationId]);

  useEffect(() => {
    let cancelled = false;

    const mapBackendMessage = (backendMessage) => {
      const payload = backendMessage.workflow_payload || {};

      return {
        ...payload,
        id: payload.id || `backend-msg-${backendMessage.id}`,
        backendId: backendMessage.id,
        type: payload.type || backendMessage.message_type || "text",
        sender:
          backendMessage.sender_id === Number(localStorage.getItem("userId") || 0)
            ? "me"
            : "them",
        senderRole:
          payload.senderRole ||
          (backendMessage.sender_id === Number(localStorage.getItem("userId") || 0)
            ? currentViewerRole
            : currentViewerRole === "business"
            ? "homeowner"
            : "business"),
        text: payload.text || backendMessage.message_text || "",
        imageUrl: payload.imageUrl || backendMessage.image_url || null,
        workflowType: payload.workflowType || backendMessage.workflow_type || "",
        status: payload.status || "delivered",
        createdAt: payload.createdAt || new Date(backendMessage.created_at).getTime(),
        time:
          payload.time ||
          new Date(backendMessage.created_at).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
      };
    };

    const loadMessages = async () => {
      const selectedQuoteRequestId =
        localStorage.getItem("selectedQuoteRequestId") || conversationId;

      if (
        selectedQuoteRequestId &&
        !String(selectedQuoteRequestId).startsWith("demo")
      ) {
        try {
          const result = await authFetch(
            `/messages/${selectedQuoteRequestId}`,
            {},
            setPage
          );

          const backendMessages = result?.data?.messages;

          if (!cancelled && Array.isArray(backendMessages) && backendMessages.length > 0) {
            const mapped = backendMessages.map(mapBackendMessage);
            setMessages(mapped);
            localStorage.setItem(storageKey, JSON.stringify(mapped));
            localStorage.setItem(`meetro_conversation_read_${conversationId}`, "true");
            window.dispatchEvent(new Event("meetro-messages-updated"));
            return;
          }
        } catch (err) {
          console.error("Failed to load backend messages", err);
        }
      }

      const saved = localStorage.getItem(storageKey);

      if (saved) {
        try {
          const parsed = JSON.parse(saved);

          const conversationOwnerRoleKey = `meetro_conversation_owner_role_${conversationId}`;
          const savedOwnerRole =
            localStorage.getItem(conversationOwnerRoleKey) ||
            currentViewerRole;

          localStorage.setItem(conversationOwnerRoleKey, savedOwnerRole);

          const oppositeRole =
            savedOwnerRole === "business" ? "homeowner" : "business";

          const migrated = Array.isArray(parsed)
            ? parsed.map((msg) => ({
                ...msg,
                senderRole:
                  msg.senderRole ||
                  msg.senderRoleOwner ||
                  (msg.sender === "client" ? "homeowner" : oppositeRole),
              }))
            : starterMessages;

          if (!cancelled) {
            setMessages(migrated);
          }
        } catch {
          if (!cancelled) {
            setMessages(starterMessages);
          }
        }
      } else if (!cancelled) {
        setMessages(starterMessages);
      }

      localStorage.setItem(`meetro_conversation_read_${conversationId}`, "true");
      window.dispatchEvent(new Event("meetro-messages-updated"));
    };

    loadMessages();

    const pollingInterval = setInterval(() => {
      if (!document.hidden) {
        loadMessages();
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(pollingInterval);
    };
  }, [storageKey, conversationId, starterMessages, currentViewerRole, setPage]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));

      const lastMessage = messages[messages.length - 1];

      const lastMessageText =
        lastMessage?.type === "image"
          ? language === "es"
            ? "Imagen adjunta"
            : "Image attached"
          : lastMessage?.type === "location"
          ? language === "es"
            ? "Ubicación compartida"
            : "Location shared"
          : lastMessage?.type === "scan"
          ? language === "es"
            ? "Documento escaneado"
            : "Document scan"
          : lastMessage?.title || lastMessage?.text || "";

      const metaPayload = {
        lastMessage: lastMessageText,
        lastTime: lastMessage?.time || "",
        unread: 0,
        updatedAt: Date.now(),
        activeJobId: localStorage.getItem("activeJobId") || "",
        activeJobService:
          localStorage.getItem("activeWorkService") ||
          localStorage.getItem("activeJobService") ||
          "",
        activeJobStatus: localStorage.getItem("activeJobStatus") || "",
        activeJobEta: localStorage.getItem("activeJobEta") || "",
        activeJobCustomer: localStorage.getItem("activeJobCustomer") || "",
      };

      localStorage.setItem(
        `meetro_conversation_meta_${conversationId}`,
        JSON.stringify(metaPayload)
      );

      const registry = JSON.parse(
        localStorage.getItem("meetro_conversation_registry") || "[]"
      );

      const registryItem = {
        id: conversationId,
        project_title:
          activeName ||
          localStorage.getItem("activeConversationName") ||
          localStorage.getItem("conversationBusinessName") ||
          "Conversation",
        project_description:
          lastMessageText || "Saved conversation for future communication.",
        homeowner_email:
          localStorage.getItem("activeConversationName") ||
          localStorage.getItem("conversationBusinessName") ||
          activeName ||
          "Contact",
        location:
          activeLocation ||
          localStorage.getItem("activeWorkService") ||
          localStorage.getItem("activeJobService") ||
          "Saved Contact",
        status: conversationType === "business" ? "Saved Business" : "Message",
        unread: false,
        conversation_type: conversationType || "standard",
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(
        "meetro_conversation_registry",
        JSON.stringify([
          registryItem,
          ...registry.filter(
            (item) => String(item.id) !== String(conversationId)
          ),
        ])
      );

      window.dispatchEvent(new Event("meetro-messages-updated"));
    }
  }, [messages, storageKey, conversationId, language]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, replyingTo, pendingImage, showAttachMenu]);

  const stopAiSpeech = () => {
    window.speechSynthesis?.cancel();
    setAiSpeaking(false);
  };

  const closeMenus = () => {
    stopAiSpeech();
    setShowThreadMenu(false);
    setShowCallMenu(false);
    setShowAttachMenu(false);
    setActiveMessageId(null);
    setShowMobileSheet(false);
  };

  const getTime = () =>
    new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

  const updateMessageStatus = (id, status, delay) => {
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === id
            ? {
                ...msg,
                status,
                seenAt: status === "seen" ? getTime() : msg.seenAt,
              }
            : msg
        )
      );
    }, delay);
  };

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const addOutgoingMessage = async (message) => {
    const messageWithRole = {
      ...message,
      senderRole: message.senderRole || currentViewerRole,
    };

    setMessages((prev) => [...prev, messageWithRole]);

    localStorage.setItem(`meetro_conversation_read_${conversationId}`, "true");

    localStorage.setItem("mockUnreadMessages", "0");

    window.dispatchEvent(new Event("meetro-messages-updated"));

    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    });

    const selectedQuoteRequestId =
      localStorage.getItem("selectedQuoteRequestId") || conversationId;

    const receiverId = localStorage.getItem("selectedMessageReceiverId") || "";

    if (
      selectedQuoteRequestId &&
      receiverId &&
      !String(selectedQuoteRequestId).startsWith("demo")
    ) {
      try {
        const result = await authFetch(
          "/messages",
          {
            method: "POST",
            body: JSON.stringify({
              quote_request_id: Number(selectedQuoteRequestId),
              receiver_id: Number(receiverId),
              message_text: messageWithRole.text || "",
              image_url: messageWithRole.imageUrl || null,
              message_type: messageWithRole.type || "text",
              workflow_type:
                messageWithRole.workflowType ||
                (messageWithRole.type?.startsWith("workflow_")
                  ? messageWithRole.type
                  : null),
              workflow_status: messageWithRole.status || null,
              workflow_payload: messageWithRole,
            }),
          },
          setPage
        );

        if (result?.response?.ok && result?.data?.data?.id) {
          const resolvedWorkflowType =
            messageWithRole.workflowType ||
            (messageWithRole.type?.startsWith("workflow_")
              ? messageWithRole.type
              : null);

          if (resolvedWorkflowType) {
            authFetch(
              "/workflow-events",
              {
                method: "POST",
                body: JSON.stringify({
                  quote_request_id: Number(selectedQuoteRequestId),
                  workflow_type: resolvedWorkflowType,
                  workflow_status: messageWithRole.status || null,
                  workflow_payload: messageWithRole,
                  event_label:
                    messageWithRole.title ||
                    messageWithRole.label ||
                    messageWithRole.text ||
                    resolvedWorkflowType,
                }),
              },
              setPage
            ).catch((workflowErr) => {
              console.warn(
                "Workflow event mirror failed; message persistence remains active",
                workflowErr
              );
            });
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageWithRole.id
                ? {
                    ...msg,
                    backendId: result.data.data.id,
                    status: "sent",
                  }
                : msg
            )
          );
        } else {
          updateMessageStatus(messageWithRole.id, "failed", 0);
        }
      } catch (err) {
        console.error("Failed to persist message to backend", err);
        updateMessageStatus(messageWithRole.id, "failed", 0);
      }
    } else {
      updateMessageStatus(messageWithRole.id, "sent", 400);
    }

    setReplyingTo(null);
    setActiveMessageId(null);
    setShowMobileSheet(false);
    setShowThreadMenu(false);
    setShowCallMenu(false);
    setShowAttachMenu(false);
    setTyping(true);

    setTimeout(() => setTyping(false), 1200);
  };

  const handleQuickReply = (reply) => {
    const normalized = String(reply).toLowerCase();

    if (
      normalized.includes("save history") ||
      normalized.includes("guardar historial")
    ) {
      setPage("messagesInbox");
      return;
    }

    if (
      normalized.includes("leave review") ||
      normalized.includes("dejar reseña")
    ) {
      setPage("completionSheet");
      return;
    }

    sendMessage(reply);
  };

  const sendMessage = (textOverride = null) => {
    const text = textOverride || messageText.trim();

    if (!text && !pendingImage) return;

    const id = `msg-${Date.now()}`;

    if (pendingImage) {
      const imageMessagePayload = {
        id,
        type: "image",
        sender: "me",
        senderRole: currentViewerRole,
        text:
          text ||
          (pendingPhotoPurpose === "explain"
            ? photoExplanationText.trim() ||
              (language === "es"
                ? "Foto para explicar el proyecto"
                : "Project explanation photo")
            : currentViewerRole === "business"
            ? language === "es"
              ? "Foto del proyecto"
              : "Project photo"
            : language === "es"
            ? "Foto enviada por el cliente"
            : "Customer uploaded photo"),
        title:
          pendingPhotoPurpose === "explain"
            ? language === "es"
              ? "Explicación con foto"
              : "Project Explanation Photo"
            : currentViewerRole === "business"
            ? language === "es"
              ? "Foto del proyecto"
              : "Project Photo"
            : language === "es"
            ? "Foto del cliente"
            : "Customer Photo",
        subtitle:
          pendingPhotoPurpose === "explain"
            ? language === "es"
              ? "Imagen enviada para ayudar a explicar el trabajo"
              : "Image sent to help explain the job"
            : currentViewerRole === "business"
            ? language === "es"
              ? "Foto compartida con el cliente"
              : "Photo shared with customer"
            : language === "es"
            ? "Imagen enviada para explicar el proyecto"
            : "Image sent to explain the project",
        imageUrl: pendingImage.url,
        fileName: pendingImage.name,
        time: getTime(),
        status: "sending",
        unsent: false,
        replyTo: replyingTo,
        createdAt: Date.now(),
      };

      addOutgoingMessage(imageMessagePayload);

      if (pendingPhotoPurpose === "explain") {
        const recordKey = `meetro_job_record_${conversationId}`;

        const existing = JSON.parse(
          localStorage.getItem(recordKey) || "[]"
        );

        const autoSavedItem = {
          id: `job-record-${Date.now()}`,
          conversationId,
          type: "project_explanation_photo",
          title:
            language === "es"
              ? "Foto de explicación"
              : "Project Explanation Photo",
          subtitle:
            language === "es"
              ? "Contexto enviado por el cliente"
              : "Customer project context",
          text: imageMessagePayload.text || "",
          imageUrl: imageMessagePayload.imageUrl || "",
          fileName: imageMessagePayload.fileName || "",
          workflowType: "customer_explanation",
          time: getTime(),
          savedAt: new Date().toISOString(),
          sharedWithHomeowner: true,
          sharedWithBusiness: true,
          autoSaved: true,
        };

        localStorage.setItem(
          recordKey,
          JSON.stringify([autoSavedItem, ...existing])
        );

        window.dispatchEvent(
          new Event("meetroJobRecordUpdated")
        );
      }

      setPendingImage(null);
      setPendingPhotoPurpose(null);
      setPhotoExplanationText("");
      setMessageText("");
      resetTextareaHeight();
      return;
    }

    addOutgoingMessage({
      id,
      type: "text",
      sender: "me",
      senderRole: currentViewerRole,
      text,
      time: getTime(),
      status: "sending",
      unsent: false,
      replyTo: replyingTo,
      createdAt: Date.now(),
    });

    setMessageText("");
    resetTextareaHeight();
  };

  const sendLocationCard = () => {
    addOutgoingMessage({
      id: `loc-${Date.now()}`,
      type: "location",
      sender: "me",
      senderRole: currentViewerRole,
      text: language === "es" ? "Ubicación compartida" : "Location shared",
      title: language === "es" ? "Ubicación del proyecto" : "Project location",
      subtitle:
        language === "es"
          ? "Mapa y dirección próximamente"
          : "Map and address coming soon",
      time: getTime(),
      status: "sending",
      unsent: false,
      replyTo: replyingTo,
      createdAt: Date.now(),
    });
  };

  const sendScanCard = () => {
    addOutgoingMessage({
      id: `scan-${Date.now()}`,
      type: "scan",
      sender: "me",
      senderRole: currentViewerRole,
      text: language === "es" ? "Escaneo de documento" : "Document scan",
      title: language === "es" ? "Escaneo preparado" : "Scan prepared",
      subtitle:
        language === "es"
          ? "Permisos, recibos, estimados o notas"
          : "Permits, receipts, estimates, or notes",
      time: getTime(),
      status: "sending",
      unsent: false,
      replyTo: replyingTo,
      createdAt: Date.now(),
    });
  };

  
const sendUpdateCard = () => {
  addOutgoingMessage({
    id: `update-${Date.now()}`,
    type: "update",
    sender: "me",
    senderRole: currentViewerRole,
    text:
      language === "es"
        ? "Actualización enviada"
        : "Job update sent",
    title:
      language === "es"
        ? "Actualización de trabajo"
        : "Job Update",
    subtitle:
      language === "es"
        ? "Progreso enviado al cliente"
        : "Progress update sent to customer",
    time: getTime(),
    status: "sending",
    unsent: false,
    createdAt: Date.now(),
  });
};

const sendApprovalCard = () => {
  addOutgoingMessage({
    id: `approval-${Date.now()}`,
    type: "approval",
    sender: "me",
    senderRole: currentViewerRole,
    text:
      language === "es"
        ? "Aprobación solicitada"
        : "Approval requested",
    title:
      language === "es"
        ? "Solicitud de aprobación"
        : "Approval Request",
    subtitle:
      language === "es"
        ? "Esperando respuesta del cliente"
        : "Waiting for customer response",
    time: getTime(),
    status: "sending",
    unsent: false,
    createdAt: Date.now(),
  });
};

const sendPaymentCard = () => {
  addOutgoingMessage({
    id: `payment-${Date.now()}`,
    type: "payment",
    sender: "me",
    senderRole: currentViewerRole,
    text:
      language === "es"
        ? "Pago solicitado"
        : "Payment requested",
    title:
      language === "es"
        ? "Solicitud de pago"
        : "Payment Request",
    subtitle:
      language === "es"
        ? "Factura enviada al cliente"
        : "Invoice sent to customer",
    time: getTime(),
    status: "sending",
    unsent: false,
    createdAt: Date.now(),
  });
};


const startWorkflowPhotoUpload = (workflowType) => {
  setPendingWorkflowPhotoType(workflowType);
  setShowAttachMenu(false);
  fileInputRef.current?.click();
};

const sendPhotoWorkflow = (workflowType) => {
  const map = {
    before: {
      icon: "📸",
      title: language === "es" ? "Foto Antes" : "Before Photo",
      subtitle: language === "es" ? "Área antes del trabajo" : "Area before work begins",
      text: language === "es" ? "Foto antes enviada" : "Before photo added",
    },
    progress: {
      icon: "🔧",
      title: language === "es" ? "Foto Progreso" : "Progress Photo",
      subtitle: language === "es" ? "Actualización de progreso" : "Work progress update",
      text: language === "es" ? "Foto de progreso enviada" : "Progress photo added",
    },
    issue: {
      icon: "⚠️",
      title: language === "es" ? "Problema Encontrado" : "Issue Found",
      subtitle: language === "es" ? "Problema o retraso detectado" : "Problem or delay detected",
      text: language === "es" ? "Problema documentado" : "Issue documented",
    },
    completion: {
      icon: "✅",
      title: language === "es" ? "Trabajo Finalizado" : "Completion Photo",
      subtitle: language === "es" ? "Trabajo completado" : "Completed work result",
      text: language === "es" ? "Foto final enviada" : "Completion photo added",
    },
  };

  const data = map[workflowType];

  addOutgoingMessage({
    id: `photo-workflow-${workflowType}-${Date.now()}`,
    type: "photoWorkflow",
    workflowType,
    icon: data.icon,
    sender: "me",
    senderRole: currentViewerRole,
    text: data.text,
    title: data.title,
    subtitle: data.subtitle,
    time: getTime(),
    status: "sending",
    unsent: false,
    createdAt: Date.now(),
  });

  setShowAttachMenu(false);
};


const sendMaterialsCard = () => {
  const materialsRequest = {
    id: `materials-approval-${Date.now()}`,
    type: "workflow_materials_approval",
    sender: "me",
    senderRole: currentViewerRole,
    role: currentViewerRole,
    text:
      language === "es"
        ? "Solicitud de materiales enviada para aprobación."
        : "Materials request sent for approval.",
    title:
      language === "es"
        ? "Aprobación de materiales"
        : "Materials Approval",
    subtitle:
      language === "es"
        ? "Revisa quién proveerá los materiales y aprueba para continuar."
        : "Review who will provide materials and approve to continue.",
    materials: [
      {
        id: "material-pvc",
        title: language === "es" ? "PVC / conectores" : "PVC / fittings",
        qty: "1",
        source: "business",
      },
      {
        id: "material-supplies",
        title: language === "es" ? "Suministros básicos" : "Basic supplies",
        qty: "1",
        source: "business",
      },
    ],
    provider:
      language === "es"
        ? "El profesional comprará los materiales"
        : "Business will purchase materials",
    status: "pending_materials_approval",
    requestId:
      conversation?.requestId ||
      conversation?.id ||
      activeConversationId ||
      "",
    projectTitle:
      conversation?.projectTitle ||
      conversation?.title ||
      activeName ||
      "Project",
    time: getTime(),
    unsent: false,
    createdAt: Date.now(),
  };

  addOutgoingMessage(materialsRequest);

  updateMatchingHomeownerRequests(
    materialsRequest,
    (request) =>
      prependProjectTimeline(
        {
          ...request,
          status: "waiting_materials_approval",
          materialsApprovalPending: true,
          materialsApprovalRequestedAt: new Date().toISOString(),
        },
        {
          type: "materialsApprovalRequested",
          label:
            language === "es"
              ? "Aprobación de materiales solicitada"
              : "Materials approval requested",
        }
      )
  );

  setShowAttachMenu(false);
};


const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);

    if (pendingWorkflowPhotoType) {
      const map = {
        before: {
          icon: "📸",
          title: language === "es" ? "Foto Antes" : "Before Photo",
          subtitle:
            language === "es"
              ? "Área antes del trabajo"
              : "Area before work begins",
          text: language === "es" ? "Foto antes enviada" : "Before photo added",
        },
        progress: {
          icon: "🔧",
          title: language === "es" ? "Foto Progreso" : "Progress Photo",
          subtitle:
            language === "es"
              ? "Actualización de progreso"
              : "Work progress update",
          text:
            language === "es"
              ? "Foto de progreso enviada"
              : "Progress photo added",
        },
        issue: {
          icon: "⚠️",
          title: language === "es" ? "Problema Encontrado" : "Issue Found",
          subtitle:
            language === "es"
              ? "Problema o retraso detectado"
              : "Problem or delay detected",
          text:
            language === "es"
              ? "Problema documentado"
              : "Issue documented",
        },
        completion: {
          icon: "✅",
          title:
            language === "es"
              ? "Trabajo Finalizado"
              : "Completion Photo",
          subtitle:
            language === "es"
              ? "Trabajo completado"
              : "Completed work result",
          text:
            language === "es"
              ? "Foto final enviada"
              : "Completion photo added",
        },
      };

      const data = map[pendingWorkflowPhotoType];

      addOutgoingMessage({
        id: `photo-workflow-${pendingWorkflowPhotoType}-${Date.now()}`,
        type: "photoWorkflow",
        workflowType: pendingWorkflowPhotoType,
        icon: data.icon,
        sender: "me",
        senderRole: currentViewerRole,
        text: data.text,
        title: data.title,
        subtitle: data.subtitle,
        imageUrl,
        fileName: file.name,
        time: getTime(),
        status: "sending",
        unsent: false,
        createdAt: Date.now(),
      });

      setPendingWorkflowPhotoType(null);
      event.target.value = "";
      return;
    }

    setPendingImage({
      url: imageUrl,
      name: file.name,
    });

    setShowAttachMenu(false);
    event.target.value = "";
  };

  const unsendMessage = (id) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id
          ? {
              ...msg,
              type: "text",
              unsent: true,
              text: language === "es" ? "Mensaje eliminado" : "Message was unsent",
              imageUrl: null,
              amount: null,
              title: null,
              subtitle: null,
              replyTo: null,
              status: null,
            }
          : msg
      )
    );

    setActiveMessageId(null);
    setShowMobileSheet(false);
  };

  const clearLocalChat = () => {
    localStorage.removeItem(storageKey);
    setMessages(starterMessages);
    setReplyingTo(null);
    setActiveMessageId(null);
    setPendingImage(null);
    setShowClearConfirm(false);
    window.dispatchEvent(new Event("meetro-messages-updated"));
  };

  const markUnread = () => {
    localStorage.setItem(`meetro_conversation_read_${conversationId}`, "false");
    const currentUnread = Number(localStorage.getItem("mockUnreadMessages") || 0);
    localStorage.setItem("mockUnreadMessages", String(Math.max(currentUnread, 1)));
    window.dispatchEvent(new Event("meetro-messages-updated"));
    setShowThreadMenu(false);
    setPage("messagesInbox");
  };

  const startReply = (message) => {
    setReplyingTo({
      id: message.id,
      sender: message.sender,
      text:
        message.type === "image"
          ? language === "es"
            ? "Imagen adjunta"
            : "Image attached"
          : message.title || message.text || "",
    });

    setActiveMessageId(null);
    setShowMobileSheet(false);
  };

  const copyMessage = (message) => {
    if (message?.text) navigator.clipboard?.writeText(message.text);
    setActiveMessageId(null);
    setShowMobileSheet(false);
  };

  const saveMessageAsSchedule = (message) => {
    const schedule = JSON.parse(
      localStorage.getItem("meetro_business_schedule") || "[]"
    );

    const newVisit = {
      id: `schedule-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      time: "12:00 PM",
      title: activeName ? `Visit with ${activeName}` : "Scheduled Visit",
      location: activeLocation || "Customer location",
      status: "Scheduled",
      conversationId,
      source: "chat-message",
      notes: message?.text || "",
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "meetro_business_schedule",
      JSON.stringify([newVisit, ...schedule])
    );

    const scheduleMessage = {
      id: Date.now(),
      sender: "business",
      role: "business",
      type: "schedule",
      text:
        language === "es"
          ? `📅 Mensaje guardado como visita programada para hoy a las ${newVisit.time}.`
          : `📅 Message saved as a scheduled visit for today at ${newVisit.time}.`,
      schedule: newVisit,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      createdAt: new Date().toISOString(),
    };

    const storageKey = `meetro_conversation_${conversationId}`;
    const existingMessages = JSON.parse(
      localStorage.getItem(storageKey) || "[]"
    );

    localStorage.setItem(
      storageKey,
      JSON.stringify([...existingMessages, scheduleMessage])
    );

    window.dispatchEvent(new Event("meetro-messages-updated"));
    setActiveMessageId(null);
    setShowMobileSheet(false);
  };

  const getStatusLabel = (status) => {
    if (language === "es") {
      if (status === "sending") return "Enviando...";
      if (status === "sent") return "Enviado";
      if (status === "delivered") return "Entregado";
      if (status === "seen") return "Visto";
      if (status === "failed") return "Falló";
      return "";
    }

    if (status === "sending") return "Sending...";
    if (status === "sent") return "Sent";
    if (status === "delivered") return "Delivered";
    if (status === "seen") return "Seen";
    if (status === "failed") return "Failed";
    return "";
  };

  const startLongPress = (msg, event = null) => {
    clearTimeout(longPressTimerRef.current);

    const touch = event?.touches?.[0];

    if (touch) {
      longPressTouchStartRef.current = {
        x: touch.clientX || 0,
        y: touch.clientY || 0,
      };
    }

    longPressTimerRef.current = setTimeout(() => {
      if (!msg.unsent) {
        setActiveMessageId(msg.id);
        setShowMobileSheet(true);
        setShowCallMenu(false);
        setShowThreadMenu(false);
        setShowAttachMenu(false);
      }
    }, 520);
  };

  const cancelLongPress = () => {
    clearTimeout(longPressTimerRef.current);
  };

  const handleLongPressMove = (event) => {
    const touch = event?.touches?.[0];
    if (!touch) return;

    const dx = Math.abs((touch.clientX || 0) - longPressTouchStartRef.current.x);
    const dy = Math.abs((touch.clientY || 0) - longPressTouchStartRef.current.y);

    if (dx > 8 || dy > 8) {
      cancelLongPress();
    }
  };

  const activeMessage = messages.find((msg) => msg.id === activeMessageId);

  const openJobStory = (msg) => {
    setJobStory(msg);
    setShowAttachMenu(false);
    setShowThreadMenu(false);
    setShowCallMenu(false);
  };

  const speakJobStory = () => {
    if (!jobStory || !window.speechSynthesis) return;

    const summary = `${jobStory.title}. ${jobStory.subtitle}. This item is saved in the job conversation timeline for documentation.`;

    if (aiSpeaking) {
      stopAiSpeech();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(summary);
    utterance.onend = () => setAiSpeaking(false);

    window.speechSynthesis.cancel();
    setAiSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const speakJobRecords = () => {
    if (!window.speechSynthesis || jobRecords.length === 0) return;

    const summary = jobRecords
      .slice()
      .reverse()
      .map((item) => `${item.title}. ${item.subtitle}.`)
      .join(" ");

    if (aiSpeaking) {
      stopAiSpeech();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(
      summary || "No saved job records yet."
    );

    utterance.onend = () => setAiSpeaking(false);

    window.speechSynthesis.cancel();
    setAiSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };



  const saveToJobRecord = () => {
    if (!jobStory) return;

    const recordKey = `meetro_job_record_${conversationId}`;
    const existing = JSON.parse(localStorage.getItem(recordKey) || "[]");

    const savedItem = {
      id: `job-record-${Date.now()}`,
      conversationId,
      jobId: localStorage.getItem("activeJobId") || conversationId,
      jobService:
        localStorage.getItem("activeJobService") ||
        localStorage.getItem("selectedEmergencyService") ||
        activeName,
      customer: activeName,
      type: jobStory.type,
      title: jobStory.title,
      subtitle: jobStory.subtitle,
      text: jobStory.text || "",
      imageUrl: jobStory.imageUrl || "",
      fileName: jobStory.fileName || "",
      workflowType: jobStory.workflowType || "",
      time: jobStory.time || getTime(),
      savedAt: new Date().toISOString(),
      sharedWithHomeowner: true,
      sharedWithBusiness: true,
    };

    localStorage.setItem(recordKey, JSON.stringify([savedItem, ...existing]));
    localStorage.setItem("lastSavedJobRecord", JSON.stringify(savedItem));

    window.dispatchEvent(new Event("meetroJobRecordUpdated"));
    setSaveNotice(
      language === "es"
        ? "Guardado en el registro del trabajo"
        : "Saved to job record"
    );
    setJobStory(null);

    setTimeout(() => setSaveNotice(""), 1800);
  };

  return (
    <div style={page}>
      <style>{animations}</style>

      <div style={phone}>
        <div style={header}>
          <button
            style={headerBtn}
            onClick={() => {
              const returnPage =
                localStorage.getItem("conversationReturnPage") ||
                localStorage.getItem("returnPage") ||
                "messagesInbox";

              setPage(returnPage);
            }}
          >
            <IconBack />
          </button>

          <button
            style={avatarProfileButton}
            onClick={() => setShowProfileCard(true)}
          >
            <div style={avatar}>
              {activeLogo ? (
                <img src={activeLogo} alt={activeHeaderName} style={avatarImage} />
              ) : (
                activeHeaderName
                  .split(" ")
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              )}
            </div>
          </button>

          <button
            style={headerIdentityButton}
            onClick={() => setShowProfileCard(true)}
          >
            <div style={name}>{activeHeaderName}</div>

            {!isEmergencyConversation && (activeCategory || activeLocation) && (
              <div style={businessInfoLine}>
                {displayCategory && <span>{displayCategory}</span>}
                {displayCategory && displayLocation && <span>•</span>}
                {displayLocation && <span>📍 {displayLocation}</span>}
              </div>
            )}

            <div style={statusRow}>
              <span style={greenDot}></span>
              {typing
                ? language === "es"
                  ? "Escribiendo..."
                  : "Typing..."
                : language === "es"
                ? "Activo ahora"
                : "Active now"}

              {jobRecordCount > 0 && (
                <button
                  style={jobRecordMiniBadge}
                  onClick={() => setShowJobRecords(true)}
                >
                  📁 {jobRecordCount}
                </button>
              )}
            </div>
          </button>

          <button
            style={{ ...headerBtn, ...(showCallMenu ? activeHeaderBtn : {}) }}
            onClick={() => {
              setShowThreadMenu(false);
              setShowAttachMenu(false);
              setActiveMessageId(null);
              setShowMobileSheet(false);
              setShowCallMenu((prev) => !prev);
            }}
          >
            <IconPhone />
          </button>

          <button
            style={{ ...headerBtn, ...(showThreadMenu ? activeHeaderBtn : {}) }}
            onClick={() => {
              setShowCallMenu(false);
              setShowAttachMenu(false);
              setActiveMessageId(null);
              setShowMobileSheet(false);
              setShowThreadMenu((prev) => !prev);
            }}
          >
            <IconMore />
          </button>
        </div>

        {showProfileCard && (
          <div style={profileOverlay} onClick={() => setShowProfileCard(false)}>
            <div style={profileMiniCard} onClick={(event) => event.stopPropagation()}>
              <button
                style={profileCloseButton}
                onClick={() => setShowProfileCard(false)}
              >
                ×
              </button>

              <div style={profileHeroMini}>
                <div style={profileLargeAvatar}>
                  {activeLogo ? (
                    <img src={activeLogo} alt={activeHeaderName} style={profileLargeAvatarImage} />
                  ) : (
                    activeHeaderName
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>

                <h2 style={profileCardTitle}>{activeHeaderName}</h2>

                <p style={profileCardMeta}>
                  {displayCategory || (language === "es" ? "Perfil conectado" : "Connected profile")}
                </p>

                {displayLocation && (
                  <p style={profileCardLocation}>📍 {displayLocation}</p>
                )}
              </div>

              <div style={profileInfoGrid}>
                <div style={profileInfoBox}>
                  <strong>{language === "es" ? "Estado" : "Status"}</strong>
                  <span>{language === "es" ? "Activo ahora" : "Active now"}</span>
                </div>

                <div style={profileInfoBox}>
                  <strong>{language === "es" ? "Proyecto" : "Project"}</strong>
                  <span>{activeHeaderProject || (language === "es" ? "Conversación" : "Conversation")}</span>
                </div>
              </div>

              <div style={profileActionRow}>
                <button
                  style={profilePrimaryAction}
                  onClick={() => {
                    setShowProfileCard(false);
                    setShowCallMenu(true);
                  }}
                >
                  📞 {language === "es" ? "Llamar" : "Call"}
                </button>

                <button
                  style={profileSecondaryAction}
                  onClick={() => {
                    setShowProfileCard(false);
                    setShowJobRecords(true);
                  }}
                >
                  📁 {language === "es"
                    ? "Registro del trabajo"
                    : "Job Records"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showCallMenu && (
          <div style={callMenu}>
            <button style={callMenuBtn} onClick={() => setShowCallMenu(false)}>
              {language === "es" ? "Llamar" : "Call"}
            </button>

            <button style={callMenuBtn} onClick={() => setShowCallMenu(false)}>
              {language === "es" ? "Detalles" : "Details"}
            </button>
          </div>
        )}

        {showThreadMenu && (
          <div style={threadMenu}>
            <button style={threadMenuBtn} onClick={() => setShowThreadMenu(false)}>
              {language === "es" ? "Ver detalles" : "View details"}
            </button>

            <button style={threadMenuBtn} onClick={markUnread}>
              {language === "es" ? "Marcar como no leído" : "Mark as unread"}
            </button>

            <button
              style={threadMenuBtn}
              onClick={() => {
                const schedule = JSON.parse(
                  localStorage.getItem("meetro_business_schedule") || "[]"
                );

                const newVisit = {
                  id: `schedule-${Date.now()}`,
                  time: "12:00 PM",
                  title: activeName
                    ? `Visit with ${activeName}`
                    : "Scheduled Visit",
                  location: activeLocation || "Customer location",
                  status: "Scheduled",
                  conversationId,
                  source: "chat",
                  createdAt: new Date().toISOString(),
                };

                localStorage.setItem(
                  "meetro_business_schedule",
                  JSON.stringify([newVisit, ...schedule])
                );

                const scheduleMessage = {
                  id: Date.now(),
                  sender: "business",
                  role: "business",
                  type: "schedule",
                  text:
                    language === "es"
                      ? `📅 Visita programada para hoy a las ${newVisit.time}.`
                      : `📅 Visit scheduled for today at ${newVisit.time}.`,
                  schedule: newVisit,
                  time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  createdAt: new Date().toISOString(),
                };

                const storageKey = `meetro_conversation_${conversationId}`;
                const existingMessages = JSON.parse(
                  localStorage.getItem(storageKey) || "[]"
                );

                localStorage.setItem(
                  storageKey,
                  JSON.stringify([...existingMessages, scheduleMessage])
                );

                window.dispatchEvent(new Event("meetro-messages-updated"));
                setShowThreadMenu(false);
              }}
            >
              📅 {language === "es" ? "Programar visita" : "Schedule Visit"}
            </button>

            <button
              style={threadMenuBtn}
              onClick={() => {
                localStorage.setItem("invoiceConversationId", conversationId);
                localStorage.setItem("invoiceCustomerName", activeName || "Customer");
                localStorage.setItem("invoiceCustomerLocation", activeLocation || "");
                localStorage.setItem(
                  "invoiceJobType",
                  isEmergencyThread ? "Emergency Service" : "Service Job"
                );
                setShowThreadMenu(false);
                localStorage.setItem("completionService", activeName || "Service Job");
                localStorage.setItem("completionLocation", activeLocation || "");
                localStorage.setItem("completionSource", isEmergencyThread ? "emergency" : "chat");
                setPage("completionSheet");
              }}
            >
              🧾 {language === "es" ? "Crear factura" : "Create Invoice"}
            </button>

            <button
              style={{ ...threadMenuBtn, color: "#047857" }}
              onClick={() => {
                localStorage.setItem(`meetro_conversation_saved_${conversationId}`, "true");
                localStorage.setItem("conversationSavedToHistory", "true");
                localStorage.setItem("conversationArchivedAt", new Date().toISOString());

                if (isEmergencyThread) {
                  localStorage.setItem("emergencySavedToHistory", "true");
                  localStorage.setItem("emergencyArchivedAt", new Date().toISOString());
                  localStorage.setItem("activeJobStatus", "completed");
                  localStorage.setItem("emergencyDispatchStatus", "completed");
                  localStorage.setItem("businessAcceptedEmergency", "false");
                }

                const registry = JSON.parse(
                  localStorage.getItem("meetro_conversation_registry") || "[]"
                );

                const activeId =
                  localStorage.getItem("activeConversationId") || conversationId;

                const existingItem = registry.find(
                  (item) => String(item.id) === String(activeId)
                );

                const savedItem = {
                  ...(existingItem || {}),
                  id: String(activeId),
                  project_title: activeName || "Conversation",
                  project_description:
                    messages[messages.length - 1]?.text ||
                    "Saved conversation history.",
                  homeowner_email: activeName || "Contact",
                  location: activeLocation || "Saved Contact",
                  conversation_type: isEmergencyThread ? "emergency" : "standard",
                  saved_to_history: true,
                  status:
                    language === "es"
                      ? "Historial guardado"
                      : "Saved History",
                  archivedAt: new Date().toISOString(),
                  savedAt: new Date().toISOString(),
                  unread: false,
                };

                const updatedRegistry = [
                  savedItem,
                  ...registry.filter(
                    (item) => String(item.id) !== String(activeId)
                  ),
                ];

                localStorage.setItem(
                  "meetro_conversation_registry",
                  JSON.stringify(updatedRegistry)
                );

                window.dispatchEvent(new Event("meetro-messages-updated"));
                window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));

                setShowThreadMenu(false);
                setSaveNotice(
                  language === "es"
                    ? "Guardado en historial"
                    : "Saved to history"
                );
              }}
            >
              💾 {language === "es" ? "Guardar historial" : "Save to History"}
            </button>

            <button
              style={{ ...threadMenuBtn, color: "#ef4444" }}
              onClick={() => {
                setShowThreadMenu(false);
                setShowClearConfirm(true);
              }}
            >
              {language === "es" ? "Limpiar chat local" : "Clear local chat"}
            </button>
          </div>
        )}

        <div style={chatArea} onClick={closeMenus}>

          {hasActiveEmergencyJob && (
            <div
              style={{
                ...emergencyBanner,
                ...(emergencyDispatchStatus === "completed"
                  ? completedEmergencyBanner
                  : {}),
              }}
            >
              <div style={emergencyBannerTop}>

                <button
                  style={emergencyExpandBtn}
                  onClick={() =>
                    setEmergencyPanelExpanded((prev) => !prev)
                  }
                >
                  {emergencyPanelExpanded ? "−" : "+"}
                </button>

                <div
                  style={{
                    ...emergencyDot,
                    ...(emergencyDispatchStatus === "completed"
                      ? completedEmergencyDot
                      : {}),
                  }}
                ></div>

                <div>
                  <div style={emergencyBannerTitle}>
                    {emergencyDispatchStatus === "completed"
                      ? language === "es"
                        ? "Servicio completado"
                        : "Service Completed"
                      : language === "es"
                      ? "Emergencia activa"
                      : "Emergency Active"}
                  </div>

                  <div style={emergencyBannerSubtitle}>
                    {activeAccountMode === "business" &&
                    emergencyDispatchStatus !== "completed"
                      ? language === "es"
                        ? "Cliente esperando actualización"
                        : "Customer awaiting update"
                      : emergencyStatusSubtitle}
                  </div>
                </div>
              </div>

              {emergencyPanelExpanded && (
                <>
                  <div style={emergencyPillRow}>
                    {emergencyDispatchStatus === "completed" ? (
                      <>
                        <div style={completedEmergencyPill}>✅ Completed</div>
                        <div style={completedEmergencyPill}>💾 History</div>
                        <div style={completedEmergencyPill}>🧾 Summary</div>
                      </>
                    ) : (
                      <>
                        <div style={emergencyPill}>
                          🚨 {language === "es" ? "Activo" : "Active"}
                        </div>

                        <div style={emergencyPill}>
                          ⏱ {emergencyDispatchStatus === "started"
                            ? language === "es"
                              ? "En progreso"
                              : "In progress"
                            : emergencyDispatchStatus === "arrived"
                            ? language === "es"
                              ? "Llegó"
                              : "Arrived"
                            : "ETA 10m"}
                        </div>

                        <div style={emergencyPill}>
                          📍 {emergencyDispatchStatus === "enroute"
                            ? "Live"
                            : language === "es"
                            ? "Estado"
                            : "Status"}
                        </div>
                      </>
                    )}
                  </div>

                  <div style={emergencyTimeline}>
                {[
                  language === "es" ? "Solicitado" : "Requested",
                  language === "es" ? "Aceptado" : "Accepted",
                  language === "es" ? "En camino" : "On the way",
                  language === "es" ? "Llegó" : "Arrived",
                  language === "es" ? "Trabajando" : "Work started",
                  language === "es" ? "Completado" : "Completed",
                ].map((step, index) => (
                  <div
                    key={step}
                    style={{
                      ...emergencyStep,
                      ...(index <= emergencyStepIndex ? emergencyStepActive : {}),
                    }}
                  >
                    <div
                      style={{
                        ...emergencyStepDot,
                        ...(index <= emergencyStepIndex ? emergencyStepDotActive : {}),
                      }}
                    />

                    <span>{step}</span>
                  </div>
                ))}
                  </div>

                  {activeAccountMode === "business" &&
                    emergencyDispatchStatus === "started" && (
                      <button
                        style={completeFromChatBtn}
                        onClick={() => {
                          localStorage.setItem("activeJobStatus", "completed");
                          localStorage.setItem("emergencyDispatchStatus", "completed");
                          localStorage.setItem("businessAcceptedEmergency", "false");
                          localStorage.setItem("emergencyNeedsReview", "true");
                          localStorage.setItem("emergencyCompletedAt", new Date().toISOString());
                          localStorage.setItem("dispatchReturnPage", "conversationThread");
                          window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));
                          localStorage.setItem("completionService", activeName || "Service Job");
                localStorage.setItem("completionLocation", activeLocation || "");
                localStorage.setItem("completionSource", isEmergencyThread ? "emergency" : "chat");
                setPage("completionSheet");
                        }}
                      >
                        ✅ {language === "es" ? "Completar servicio" : "Complete Service"}
                      </button>
                    )}

                  {emergencyDispatchStatus === "completed" && (
                    <div style={completedActionRow}>
                      <button
                        style={historyBtn}
                        onClick={() => {
                          localStorage.setItem("emergencySavedToHistory", "true");
                          localStorage.setItem("emergencyArchivedAt", new Date().toISOString());
                          localStorage.setItem(`meetro_conversation_saved_${conversationId}`, "true");
                          localStorage.setItem("conversationSavedToHistory", "true");

                          [
                            "activeInvoiceWorkPerformed",
                            "activeInvoiceLabor",
                            "activeInvoiceMaterials",
                            "activeInvoiceFee",
                            "activeInvoiceDiscount",
                            "activeInvoiceNotes",
                            "activeInvoiceTotal",
                            "activeInvoiceStatus",
                            "emergencyLaborCharge",
                            "emergencyMaterialCharge",
                            "emergencyServiceFee",
                            "emergencyDispatchStatus",
                            "activeJobStatus",
                            "businessAcceptedEmergency",
                            "activeJobEta",
                            "activeJobId",
                            "activeJobService",
                            "activeJobCustomer",
                            "emergencyArchivedAt",
                            "emergencyCompletedAt",
                            "emergencyJobCompletedAt",
                            "jobCompletedAt",
                            "completedEmergency",
                            "completedJob",
                          ].forEach((key) => localStorage.removeItem(key));

                          localStorage.removeItem("emergencyDispatchStatus");
                          localStorage.removeItem("activeJobStatus");
                          localStorage.setItem("businessAcceptedEmergency", "false");

                          window.dispatchEvent(new Event("meetroDispatchStatusChanged"));
                          window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));
                          window.dispatchEvent(new Event("meetro-messages-updated"));
                          setPage("messagesInbox");
                        }}
                      >
                        💾 {language === "es" ? "Guardar historial" : "Save History"}
                      </button>

                      <button
                        style={summaryBtn}
                        onClick={() =>
                          setPage(
                            emergencyDispatchStatus === "completed"
                              ? "emergencyCompletionActions"
                              : activeAccountMode === "business"
                              ? "emergencyDispatch"
                              : "emergencyStatus"
                          )
                        }
                      >
                        🧾 {language === "es" ? "Resumen" : "Summary"}
                      </button>
                    </div>
                  )}

                  {emergencyDispatchStatus !== "completed" && (
                    <div style={routePreviewCard}>
                    <div style={routePreviewTop}>
                      <div>
                        <div style={routePreviewTitle}>
                          {language === "es"
                            ? "Vista previa de ruta"
                            : "Live Route Preview"}
                        </div>

                        <div style={routePreviewSubtitle}>
                          {language === "es"
                            ? "Profesional → Cliente"
                            : "Professional → Customer"}
                        </div>
                      </div>

                      <button
                        style={routePreviewBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          localStorage.setItem("dispatchReturnPage", "conversationThread");
                          localStorage.setItem("conversationReturnPage", "conversationThread");
                          setPage(
                            emergencyDispatchStatus === "completed"
                              ? "emergencyCompletionActions"
                              : activeAccountMode === "business"
                              ? "emergencyDispatch"
                              : "emergencyStatus"
                          );
                        }}
                      >
                        {language === "es"
                          ? "Ver ruta"
                          : "View Route"}
                      </button>
                    </div>

                    <div style={routeMapPlaceholder}>
                      <div style={routeLine}></div>

                      <div style={routePinStart}>🚐</div>

                      <div style={routePinEnd}>📍</div>
                    </div>
                    </div>
                  )}

                </>
              )}
            </div>
          )}

          <div style={messagesScroll}>
          <div style={dateRow}>
            <span style={dateLine}></span>
            <strong>{language === "es" ? "Hoy" : "Today"}</strong>
            <span style={dateLine}></span>
          </div>

          {messages.map((msg) => {
            const mine = msg.senderRole === currentViewerRole;

            const isWorkflow = isWorkflowType(msg.type);
            const workflowMessageProps = isWorkflow
              ? getWorkflowMessageProps(msg, language)
              : null;

            const workflowRenderProps = isWorkflow
              ? {
                  msg,
                  language,
                  currentViewerRole,
                  conversation,
                  setMessages,
                  setMessageText,
                  setPage,
                }
              : null;

            const isOperational =
              msg.type === "update" ||
              msg.type === "approval" ||
              msg.type === "payment" ||
              msg.type === "materials" ||
              msg.type === "materials-list" ||
              isWorkflow ||
              msg.type === "schedule" ||
              msg.type === "location" ||
              msg.type === "scan" ||
              msg.type === "photoWorkflow";

            if (isOperational) {
              return (
                <div
                  key={msg.id}
                  className="meetro-message-enter"
                  style={{
                    ...operationalRow,
                    overscrollBehavior: "contain",
                  }}
                >
                  <div style={operationalCard} onClick={() => openJobStory(msg)}>
                    <div style={operationalHeader}>
                      <span style={operationalIcon}>
                        {msg.type === "update" && "📣"}
                        {msg.type === "approval" && "✅"}
                        {msg.type === "payment" && "💵"}
                        {msg.type === "materials" && "🧰"}
                        {msg.type === "materials-list" && "📦"}
                        {workflowMessageProps?.icon}
                        {msg.type === "schedule" && "📅"}
                        {msg.type === "location" && "📍"}
                        {msg.type === "scan" && "📄"}
                        {msg.type === "photoWorkflow" && (msg.icon || "📸")}
                      </span>

                      <div>
                        <strong>
                          {msg.title ||
                            (workflowMessageProps
                              ? workflowMessageProps.title
                              : msg.type === "materials-list"
                              ? language === "es"
                                ? "Lista de materiales"
                                : "Materials List"
                              : msg.type === "schedule"
                              ? language === "es"
                                ? "Visita programada"
                                : "Scheduled Visit"
                              : "")}
                        </strong>

                        <div style={operationalSubtitle}>
                          {msg.subtitle ||
                            (workflowMessageProps
                              ? workflowMessageProps.subtitle
                              : msg.type === "materials-list"
                              ? msg.approvalRequired
                                ? language === "es"
                                  ? "Requiere aprobación del cliente"
                                  : "Customer approval required"
                                : language === "es"
                                ? "Materiales enviados al cliente"
                                : "Materials sent to customer"
                              : msg.type === "schedule" && msg.schedule
                              ? `${msg.schedule.date || ""} • ${msg.schedule.time || ""}`
                              : "")}
                        </div>
                      </div>
                    </div>

                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt=""
                        style={operationalImage}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(msg.imageUrl);
                        }}
                      />
                    )}

                    {msg.type === "schedule" && msg.schedule && (
                      <div style={scheduleCardDetails}>
                        <div style={scheduleDetailRow}>
                          <span>{language === "es" ? "Fecha" : "Date"}</span>
                          <strong>{msg.schedule.date || "—"}</strong>
                        </div>

                        <div style={scheduleDetailRow}>
                          <span>{language === "es" ? "Hora" : "Time"}</span>
                          <strong>{msg.schedule.time || "—"}</strong>
                        </div>

                        <div style={scheduleDetailRow}>
                          <span>{language === "es" ? "Lugar" : "Location"}</span>
                          <strong>{msg.schedule.location || "—"}</strong>
                        </div>
                      </div>
                    )}

                    {msg.type === "materials-list" &&
                      Array.isArray(msg.materials) && (
                        <div style={materialsListCard}>
                          {msg.materials.slice(0, 6).map((item) => (
                            <div key={item.id || item.title} style={materialsListRow}>
                              <span>
                                {item.title}
                              </span>

                              <strong>
                                {item.quantity || "1"} × {item.status || "needed"}
                              </strong>
                            </div>
                          ))}

                          {msg.materials.length > 6 && (
                            <p style={materialsMoreText}>
                              +{msg.materials.length - 6}{" "}
                              {language === "es" ? "más" : "more"}
                            </p>
                          )}
                        </div>
                      )}

                    {msg.type === "approval" && (
                      <div style={approvalActions}>
                        <button style={approveBtn}>
                          {language === "es" ? "Aprobar" : "Approve"}
                        </button>

                        <button style={requestChangeBtn}>
                          {language === "es" ? "Cambios" : "Request Change"}
                        </button>
                      </div>
                    )}

                    {isWorkflowMessageType(msg, "workflow_change_request") && (
                      <WorkflowRenderer
                        {...workflowRenderProps}
                        styles={{
                          changeRequestBody,
                          changeRequestText,
                          changeRequestStatus,
                          changeRequestActions,
                          reviewChangeButton,
                          revisedQuoteButton,
                        }}
                      />
                    )}

                    {isWorkflowMessageType(msg, "workflow_completion_closeout") && (
                      <CompletionWorkflowPresentation
                        msg={msg}
                        language={language}
                        workflowRenderProps={workflowRenderProps}
                        styles={{
                          closeoutWorkflowBody,
                          closeoutWorkflowHeader,
                          closeoutWorkflowEyebrow,
                          closeoutWorkflowTitle,
                          closeoutWorkflowAmount,
                          closeoutWorkflowText,
                          closeoutWorkflowBreakdown,
                          closeoutWorkflowRow,
                          closeoutConfirmedNotice,
                          closeoutFollowupNotice,
                          leaveReviewButton,
                        }}
                      />
                    )}

                    {isWorkflowMessageType(msg, "workflow_invoice_request") && (
                      <InvoiceWorkflowPresentation
                        msg={msg}
                        language={language}
                        workflowRenderProps={workflowRenderProps}
                        styles={{
                          invoiceWorkflowBody,
                          invoiceWorkflowHeader,
                          invoiceWorkflowEyebrow,
                          invoiceWorkflowTitle,
                          invoiceWorkflowAmount,
                          invoiceWorkflowText,
                          invoiceWorkflowBreakdown,
                          invoiceWorkflowRow,
                          invoiceWorkflowNotes,
                          invoiceWorkflowActions,
                          markInvoicePaidButton,
                          invoiceQuestionButton,
                          invoicePaidNotice,
                          invoiceQuestionNotice,
                        }}
                      />
                    )}

                    {isWorkflowMessageType(msg, "workflow_materials_approval") && (
                      <MaterialsWorkflowPresentation
                        msg={msg}
                        language={language}
                        workflowRenderProps={workflowRenderProps}
                        styles={{
                          materialsApprovalBody,
                          materialsApprovalHeader,
                          materialsApprovalEyebrow,
                          materialsApprovalTitle,
                          materialsApprovalStatus,
                          materialsApprovalText,
                          materialsProviderBox,
                          materialsApprovalList,
                          materialsApprovalRow,
                          materialsApprovalActions,
                          approveMaterialsButton,
                          customerProvideMaterialsButton,
                          requestMaterialsChangeButton,
                          materialsApprovedNotice,
                          materialsChangeNotice,
                          materialsCustomerProvidingNotice,
                        }}
                      />
                    )}

                    {isWorkflowMessageType(msg, "workflow_revised_quote") && (
                      <RevisedQuoteWorkflowPresentation
                        msg={msg}
                        language={language}
                        workflowRenderProps={workflowRenderProps}
                        styles={{
                          revisedQuoteBody,
                          revisedQuoteHeader,
                          revisedQuoteEyebrow,
                          revisedQuoteTitle,
                          revisedQuoteAmount,
                          revisedQuoteText,
                          revisedQuoteBreakdown,
                          revisedQuoteRow,
                          revisedQuoteNotes,
                          revisedQuoteActions,
                          approveRevisedQuoteButton,
                          requestRevisedQuoteChangeButton,
                          revisedQuoteApproved,
                          revisedQuotePending,
                        }}
                      />
                    )}

                    <div style={operationalTime}>{msg.time}</div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className="meetro-message-enter"
                style={{
                  ...messageRow,
                  justifyContent: mine ? "flex-end" : "flex-start",
                  overscrollBehavior: "contain",
                }}
                onMouseDown={() => startLongPress(msg)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={(event) => startLongPress(msg, event)}
                onTouchMove={handleLongPressMove}
                onTouchEnd={cancelLongPress}
              >
                <div
                  style={{
                    ...bubble,
                    ...(msg.type === "image" ? imageBubble : {}),
                    ...(mine ? myBubble : theirBubble),
                    ...(msg.type === "image" ? imageCardBubble : {}),
                    ...(isEmergencyThread
                      ? msg.type === "image"
                        ? emergencyImageCardBubble
                        : mine
                        ? emergencyMyBubble
                        : emergencyTheirBubble
                      : {}),
                    fontStyle: msg.unsent ? "italic" : "normal",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCallMenu(false);
                    setShowThreadMenu(false);
                    setShowAttachMenu(false);
                    setShowMobileSheet(false);
                    setActiveMessageId(activeMessageId === msg.id ? null : msg.id);
                  }}
                >
                  {msg.replyTo && (
                    <div style={mine ? replyPreviewMine : replyPreviewTheirs}>
                      <strong>
                        {mine
                          ? language === "es"
                            ? "Tú"
                            : "You"
                          : activeName}
                      </strong>
                      <span>{msg.replyTo.text}</span>
                    </div>
                  )}

                  {msg.type === "image" && msg.imageUrl && (
                    <>
                      {msg.title && (
                        <div style={imageTitle}>{msg.title}</div>
                      )}

                      {msg.subtitle && (
                        <div style={imageSubtitle}>{msg.subtitle}</div>
                      )}

                      <img
                        src={msg.imageUrl}
                        alt=""
                        style={imageMessage}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(msg.imageUrl);
                        }}
                      />
                    </>
                  )}

                  {msg.type === "location" && (
                    <div style={richCard}>
                      <div style={richIconWrap}>
                        <IconLocationClean />
                      </div>
                      <div>
                        <strong>{msg.title}</strong>
                        <p>{msg.subtitle}</p>
                      </div>
                    </div>
                  )}

                  {msg.type === "scan" && (
                    <div style={richCard}>
                      <div style={richIconWrap}>
                        <IconScanClean />
                      </div>
                      <div>
                        <strong>{msg.title}</strong>
                        <p>{msg.subtitle}</p>
                      </div>
                    </div>
                  )}

                  <div>{msg.text}</div>

                  <div style={timeRow}>
                    <span>{msg.time}</span>
                    {mine && !msg.unsent && <span>{getStatusLabel(msg.status)}</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {typing && (
            <div style={typingRow}>
              <div style={typingBubble}>
                <span style={{ overscrollBehavior: 'contain' }} className="typing-dot"></span>
                <span style={{ overscrollBehavior: 'contain' }} className="typing-dot"></span>
                <span style={{ overscrollBehavior: 'contain' }} className="typing-dot"></span>
              </div>
            </div>
          )}

          <div ref={bottomRef}></div>
        </div>

        {activeMessage && !activeMessage.unsent && (
          <div style={actionMenu}>
            <button style={actionBtn} onClick={() => startReply(activeMessage)}>
              {language === "es" ? "Responder" : "Reply"}
            </button>

            <button style={actionBtn} onClick={() => copyMessage(activeMessage)}>
              {language === "es" ? "Copiar" : "Copy"}
            </button>

            <button
              style={actionBtn}
              onClick={() => saveMessageAsSchedule(activeMessage)}
            >
              📅 {language === "es" ? "Guardar como visita" : "Save as Schedule"}
            </button>

            {(activeMessage.senderRole === currentViewerRole) && (
              <button
                style={{ ...actionBtn, color: "#ef4444" }}
                onClick={() => unsendMessage(activeMessage.id)}
              >
                {language === "es" ? "Eliminar" : "Unsend"}
              </button>
            )}
          </div>
        )}

        </div>

        <div style={bottomStack}>
          {!showAttachMenu && (
            <div style={quickWrap}>
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  style={{
                    ...quickBtn,
                    ...(isEmergencyThread ? emergencyQuickBtn : {}),
                  }}
                  onClick={() => handleQuickReply(reply)}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {replyingTo && (
            <div style={replyComposer}>
              <div style={{ minWidth: 0 }}>
                <strong>{language === "es" ? "Respondiendo" : "Replying"}</strong>
                <div style={replyComposerText}>{replyingTo.text}</div>
              </div>

              <button style={replyCloseBtn} onClick={() => setReplyingTo(null)}>
                ×
              </button>



            </div>
          )}

          {pendingImage && (
            <div style={pendingImageBox}>
              <img src={pendingImage.url} alt="" style={pendingImageThumb} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{language === "es" ? "Imagen lista para enviar" : "Image ready to send"}</strong>
                <div style={pendingImageName}>{pendingImage.name}</div>
              </div>

              <button
                style={replyCloseBtn}
                onClick={() => {
                  setPendingImage(null);
                  setPendingPhotoPurpose(null);
                }}
              >
                ×
              </button>
            </div>
          )}

          {showAttachMenu && (
            <div style={attachMenu}>
              <button style={attachMenuBtn} onClick={() => cameraInputRef.current.click()}>
                <span style={attachIconCircle}>
                  <IconCameraClean />
                </span>
                <span>{language === "es" ? "Cámara" : "Camera"}</span>
              </button>

              <button style={attachMenuBtn} onClick={() => fileInputRef.current.click()}>
                <span style={attachIconCircle}>
                  <IconPhotosClean />
                </span>
                <span>{language === "es" ? "Fotos" : "Photos"}</span>
              </button>

              <button style={attachMenuBtn} onClick={sendLocationCard}>
                <span style={attachIconCircle}>
                  <IconLocationClean />
                </span>
                <span>{language === "es" ? "Ubicación" : "Location"}</span>
              </button>

              <button style={attachMenuBtn} onClick={sendScanCard}>
                <span style={attachIconCircle}>
                  <IconScanClean />
                </span>
                <span>{language === "es" ? "Escanear" : "Scan"}</span>
              </button>

              {currentViewerRole === "business" ? (
                <>
                  <button style={attachMenuBtn} onClick={sendUpdateCard}>
                    <span style={attachIconCircle}>
                      <IconUpdateClean />
                    </span>
                    <span>{language === "es" ? "Actualización" : "Update"}</span>
                  </button>

                  <button style={attachMenuBtn} onClick={sendApprovalCard}>
                    <span style={attachIconCircle}>
                      <IconApprovalClean />
                    </span>
                    <span>{language === "es" ? "Aprobación" : "Approval"}</span>
                  </button>

                  <button style={attachMenuBtn} onClick={sendPaymentCard}>
                    <span style={attachIconCircle}>
                      <IconPaymentClean />
                    </span>
                    <span>{language === "es" ? "Pago" : "Payment"}</span>
                  </button>

                  <button style={attachMenuBtn} onClick={sendMaterialsCard}>
                    <span style={attachIconCircle}>
                      <IconMaterialsClean />
                    </span>
                    <span>{language === "es" ? "Materiales" : "Materials"}</span>
                  </button>

                  <button style={attachMenuBtn} onClick={() => startWorkflowPhotoUpload("before")}>
                    <span style={attachIconCircle}>📸</span>
                    <span>{language === "es" ? "Antes" : "Before"}</span>
                  </button>

                  <button style={attachMenuBtn} onClick={() => startWorkflowPhotoUpload("progress")}>
                    <span style={attachIconCircle}>🔧</span>
                    <span>{language === "es" ? "Progreso" : "Progress"}</span>
                  </button>

                  <button style={attachMenuBtn} onClick={() => startWorkflowPhotoUpload("issue")}>
                    <span style={attachIconCircle}>⚠️</span>
                    <span>{language === "es" ? "Problema" : "Issue"}</span>
                  </button>

                  <button style={attachMenuBtn} onClick={() => startWorkflowPhotoUpload("completion")}>
                    <span style={attachIconCircle}>✅</span>
                    <span>{language === "es" ? "Finalizado" : "Completion"}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    style={attachMenuBtn}
                    onClick={() => {
                      const workflowMessage = {
                        id: `workflow-change-${Date.now()}`,
                        type: "workflow_change_request",
                        sender: "me",
                        senderRole: currentViewerRole,
                        title:
                          language === "es"
                            ? "Solicitud de cambio"
                            : "Change Request",
                        subtitle:
                          language === "es"
                            ? "Cambio solicitado por el cliente"
                            : "Customer requested project change",
                        text:
                          language === "es"
                            ? "Me gustaría hacer un cambio en este proyecto."
                            : "I would like to request a change to this project.",
                        priority: "normal",
                        status: "pending_review",
                        time: new Date().toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        }),
                        createdAt: Date.now(),
                      };

                      setMessages((prev) => [...prev, workflowMessage]);
                      setShowAttachMenu(false);

                      window.dispatchEvent(
                        new Event("meetro-messages-updated")
                      );
                    }}
                  >
                    <span style={attachIconCircle}>🔁</span>
                    <span>
                      {language === "es"
                        ? "Solicitar cambio"
                        : "Request Change"}
                    </span>
                  </button>

                  <button
                    style={attachMenuBtn}
                    onClick={() => {
                      setPendingPhotoPurpose("explain");
                      fileInputRef.current.click();
                    }}
                  >
                    <span style={attachIconCircle}>🖼️</span>
                    <span>{language === "es" ? "Explicar con fotos" : "Explain with Photos"}</span>
                  </button>
                </>
              )}

              <button
                style={attachMenuBtn}
                onClick={() => {
                  setShowAttachMenu(false);
                  stopAiSpeech();
                  setShowJobRecords(true);
                }}
              >
                <span style={attachIconCircle}>📁</span>
                <span>
                  {language === "es"
                    ? "Registro"
                    : "Job Record"}
                  {jobRecordCount > 0 ? ` (${jobRecordCount})` : ""}
                </span>
              </button>

            </div>
          )}


          {pendingPhotoPurpose === "explain" && (
            <div style={photoExplainCard}>
              <div style={photoExplainTitle}>
                {language === "es"
                  ? "¿Qué te gustaría explicarle al profesional?"
                  : "What would you like the professional to know?"}
              </div>

              <div style={photoExplainSubtitle}>
                {language === "es"
                  ? "Ayuda a explicar el problema o el trabajo que necesitas."
                  : "Help explain the issue or work you need done."}
              </div>

              <div style={photoChipRow}>
                {[
                  language === "es" ? "Fuga" : "Leak",
                  language === "es" ? "Roto" : "Broken",
                  language === "es" ? "Reparación" : "Repair",
                  language === "es" ? "Pregunta" : "Question",
                  language === "es" ? "Urgente" : "Urgent",
                ].map((chip) => (
                  <button
                    key={chip}
                    style={photoChip}
                    onClick={() =>
                      setPhotoExplanationText((prev) =>
                        prev ? `${prev}, ${chip}` : chip
                      )
                    }
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <textarea
                style={photoExplainInput}
                rows={2}
                value={photoExplanationText}
                onChange={(e) => setPhotoExplanationText(e.target.value)}
                placeholder={
                  language === "es"
                    ? "Explica lo que está pasando..."
                    : "Explain what is going on..."
                }
              />
            </div>
          )}

          <div style={composer}>
            <button
              style={{ ...circleBtn, ...(showAttachMenu ? activeCircleBtn : {}) }}
              onClick={() => {
                setShowCallMenu(false);
                setShowThreadMenu(false);
                stopAiSpeech();
                setShowAttachMenu((prev) => !prev);
              }}
            >
              <IconPlus />
            </button>

            <div style={inputWrap}>
              <textarea
                ref={textareaRef}
                style={input}
                value={messageText}
                rows={1}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                placeholder={
                  language === "es"
                    ? "Escribe un mensaje..."
                    : "Type a message..."
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                    e.currentTarget.style.height = "auto";
                  }
                }}
              />
            </div>

            <button
              style={circleBtn}
              onClick={() =>
                alert(
                  language === "es"
                    ? "Notas de voz próximamente."
                    : "Voice notes coming soon."
                )
              }
            >
              <IconMic />
            </button>

            <button
              style={{
                ...sendBtn,
                ...(isEmergencyThread ? emergencySendBtn : {}),
                opacity: messageText.trim() || pendingImage ? 1 : 0.5,
              }}
              onClick={() => sendMessage()}
            >
              <IconSend />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              accept="image/*"
              onChange={handleImageUpload}
            />

            <input
              ref={cameraInputRef}
              type="file"
              style={{ display: "none" }}
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
            />
          </div>
        </div>

        {showClearConfirm && (
          <div style={confirmOverlay}>
            <div style={confirmBox}>
              <h3 style={confirmTitle}>
                {language === "es" ? "¿Limpiar chat?" : "Clear chat?"}
              </h3>

              <p style={confirmText}>
                {language === "es"
                  ? "Esto eliminará los mensajes guardados localmente en este dispositivo."
                  : "This will delete locally saved messages on this device."}
              </p>

              <div style={confirmActions}>
                <button style={confirmCancelBtn} onClick={() => setShowClearConfirm(false)}>
                  {language === "es" ? "Cancelar" : "Cancel"}
                </button>

                <button style={confirmDeleteBtn} onClick={clearLocalChat}>
                  {language === "es" ? "Limpiar" : "Clear"}
                </button>
              </div>
            </div>
          </div>
        )}

        {saveNotice && (
          <div style={saveToast}>
            ✅ {saveNotice}
          </div>
        )}


        {showJobRecords && (
          <div style={recordOverlay}>
            <div style={recordPanel}>
              <div style={recordHeader}>
                <div>
                  <h2 style={recordTitle}>
                    📁 {language === "es" ? "Registro del trabajo" : "Job Record"}
                  </h2>

                  <p style={recordSubtitle}>
                    {jobRecordCount} 
                    {language === "es"
                      ? " elementos guardados"
                      : " saved workflow items"}
                  </p>
                </div>

                <button
                  style={recordClose}
                  onClick={() => {
                    stopAiSpeech();
                    setShowJobRecords(false);
                  }}
                >
                  ×
                </button>
              </div>

              <div style={recordDescription}>
                {language === "es"
                  ? "El Registro del Trabajo guarda fotos, actualizaciones, aprobaciones, materiales y eventos importantes del proyecto en un historial operativo permanente."
                  : "Job Record saves photos, updates, approvals, materials, and important project events into a permanent operating history."}
              </div>

              <div style={recordTools}>
                <button style={recordSpeakBtn} onClick={speakJobRecords}>
                  {aiSpeaking ? "⏹ Stop AI Voice" : "🔊 " + (language === "es" ? "Explicar registro" : "AI Speak Job Record")}
                </button>
              </div>

              <div style={recordList}>
                {jobRecords.length === 0 ? (
                  <div style={emptyRecord}>
                    {language === "es"
                      ? "Aún no hay registros guardados."
                      : "No saved job records yet."}
                  </div>
                ) : (
                  jobRecords.map((item) => (
                    <div
                      key={item.id}
                      style={timelineItem}
                      onClick={() =>
                        setExpandedRecord(
                          expandedRecord === item.id ? null : item.id
                        )
                      }
                    >
                      <div style={timelineRail}>
                        <div style={timelineLine} />

                        <div style={timelineDot}>
                          {item.type === "approval" && "✅"}
                          {item.type === "payment" && "💵"}
                          {item.type === "materials" && "🧰"}
                          {item.type === "location" && "📍"}
                          {item.type === "scan" && "📄"}
                          {item.type === "photoWorkflow" && "📸"}
                          {item.type === "update" && "📣"}
                        </div>
                      </div>

                      <div style={timelineContent}>
                        <div style={timelineTop}>
                          <strong>{item.title}</strong>
                          <span>{item.time}</span>
                        </div>

                        <p>{item.subtitle}</p>

                        {expandedRecord === item.id && (
                          <div style={expandedPanel}>
                            <div style={expandedPreview}>
                              🖼️ Timeline preview
                            </div>

                            <div style={expandedInfo}>
                              <div style={expandedInfoRow}>
                                📄 Documentation attached
                              </div>

                              <div style={expandedInfoRow}>
                                🤖 AI workflow summary available
                              </div>

                              <div style={expandedInfoRow}>
                                🕒 Saved to permanent project history
                              </div>
                            </div>

                            <button
                              style={expandedSpeakBtn}
                              onClick={(e) => {
                                e.stopPropagation();

                                const summary =
                                  item.title +
                                  ". " +
                                  item.subtitle;

                                if (aiSpeaking) {
                                  stopAiSpeech();
                                  return;
                                }

                                const utterance =
                                  new SpeechSynthesisUtterance(summary);

                                utterance.onend = () =>
                                  setAiSpeaking(false);

                                window.speechSynthesis.cancel();
                                setAiSpeaking(true);
                                window.speechSynthesis.speak(utterance);
                              }}
                            >
                              {aiSpeaking
                                ? "⏹ Stop AI"
                                : "🔊 Explain Timeline Item"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {jobStory && (
          <div style={storyOverlay}>
            <div style={storyCard}>
              <button
                style={storyClose}
                onClick={() => {
                  window.speechSynthesis?.cancel();
                  setJobStory(null);
                }}
              >
                ×
              </button>

              <div style={storyIcon}>{jobStory.icon || "📋"}</div>

              <h2 style={storyTitle}>{jobStory.title}</h2>

              <p style={storyText}>{jobStory.subtitle}</p>

              <div style={storyPreviewBox}>
                <div style={storyPreviewIcon}>🖼️</div>
                <strong>
                  {language === "es" ? "Vista previa del trabajo" : "Job preview"}
                </strong>
                <span>
                  {language === "es"
                    ? "Fotos, notas y documentación aparecerán aquí."
                    : "Photos, notes, and documentation will appear here."}
                </span>
              </div>

              <button style={storySpeakBtn} onClick={speakJobStory}>
                {aiSpeaking ? "⏹ Stop AI Voice" : "🔊 " + (language === "es" ? "Explicar con AI" : "AI Speak Summary")}
              </button>

              <button style={storySaveBtn} onClick={saveToJobRecord}>
                📁 {language === "es" ? "Guardar en trabajo" : "Save to Job Record"}
              </button>
            </div>
          </div>
        )}

        

        {previewImage && (
          <div style={imageModal} onClick={() => setPreviewImage(null)}>
            <img src={previewImage} alt="" style={modalImage} />
          </div>
        )}
      </div>
    </div>
  );
}

const animations = `
@keyframes meetroMessageIn {
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.meetro-message-enter {
  animation: meetroMessageIn 190ms ease-out;
}

@keyframes meetroSheetIn {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes meetroImageIn {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes typingBounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
  40% { transform: translateY(-4px); opacity: 1; }
}

.typing-dot {
  width: 6px;
  height: 6px;
  background: #8b90a0;
  border-radius: 50%;
  display: inline-block;
  animation: typingBounce 1s infinite ease-in-out;
}

.typing-dot:nth-child(2) { animation-delay: 0.15s; }
.typing-dot:nth-child(3) { animation-delay: 0.3s; }

@media (max-width: 520px) {
  .meetro-message-enter {
    animation-duration: 160ms;
  }
}
`;

const page = {
  height: "var(--meetro-safe-vh)",
  maxHeight: "var(--meetro-safe-vh)",
  background: "linear-gradient(135deg, #eef1f8 0%, #f8fafc 100%)",
  display: "flex",
  justifyContent: "center",
  padding: "calc(env(safe-area-inset-top) + 64px) 0 0",
  boxSizing: "border-box",
  overflowX: "hidden",
  overflowY: "hidden",
};

const phone = {
  width: "100%",
  maxWidth: "860px",
  background: "#ffffff",
  height: "100%",
  maxHeight: "100%",
  minHeight: 0,
  position: "relative",
  paddingBottom: "0",
  overflowX: "hidden",
  overflowY: "hidden",
  boxShadow: "0 20px 60px rgba(15,23,42,0.08)",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
};

const messagesScroll = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  WebkitOverflowScrolling: "touch",
  overscrollBehavior: "contain",
  display: "flex",
  flexDirection: "column",
  paddingBottom: "118px",
};


const avatarProfileButton = {
  border: "none",
  background: "transparent",
  padding: 0,
  cursor: "pointer",
};

const headerIdentityButton = {
  flex: 1,
  minWidth: 0,
  border: "none",
  background: "transparent",
  textAlign: "left",
  padding: 0,
  cursor: "pointer",
};

const profileOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.28)",
  zIndex: 999,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "calc(env(safe-area-inset-top) + 18px) 18px 18px",
  boxSizing: "border-box",
};

const profileMiniCard = {
  width: "100%",
  maxWidth: "420px",
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "0 24px 60px rgba(15,23,42,0.24)",
  position: "relative",
};

const profileCloseButton = {
  position: "absolute",
  top: "14px",
  right: "14px",
  border: "none",
  background: "#f1f5f9",
  width: "34px",
  height: "34px",
  borderRadius: "999px",
  fontSize: "22px",
  fontWeight: "800",
  cursor: "pointer",
};

const profileHeroMini = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
};

const profileLargeAvatar = {
  width: "92px",
  height: "92px",
  borderRadius: "999px",
  background: "linear-gradient(135deg,#5b3df5,#8b5cf6)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  fontSize: "28px",
  overflow: "hidden",
};

const profileLargeAvatarImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const profileCardTitle = {
  margin: "14px 0 4px",
  fontSize: "24px",
  fontWeight: "950",
  color: "#0f172a",
};

const profileCardMeta = {
  margin: 0,
  color: "#475569",
  fontWeight: "800",
};

const profileCardLocation = {
  margin: "8px 0 0",
  color: "#475569",
  fontWeight: "700",
};

const profileInfoGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "18px",
};

const profileInfoBox = {
  background: "#f8fafc",
  borderRadius: "18px",
  padding: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "5px",
  color: "#0f172a",
};

const profileActionRow = {
  display: "flex",
  gap: "10px",
  marginTop: "18px",
};

const profilePrimaryAction = {
  flex: 1,
  border: "none",
  background: "linear-gradient(135deg,#5b3df5,#7c3aed)",
  color: "white",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
};

const profileSecondaryAction = {
  flex: 1,
  border: "none",
  background: "#f1f5f9",
  color: "#0f172a",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
};

const header = {
  minHeight: "112px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "calc(env(safe-area-inset-top) + 42px) 16px 14px",
  borderBottom: "1px solid #edf0f5",
  background: "rgba(255,255,255,0.98)",
  backdropFilter: "blur(14px)",
  position: "sticky",
  top: 0,
  zIndex: 20,
};

const headerBtn = {
  width: "44px",
  height: "44px",
  borderRadius: "18px",
  border: "1px solid #e7eaf2",
  background: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#111827",
  boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
};

const activeHeaderBtn = {
  border: "1px solid #5b3df5",
  color: "#5b3df5",
  background: "#f5f3ff",
};

const avatar = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #7c5cff, #5b3df5)",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  fontSize: "18px",
  overflow: "hidden",
  flexShrink: 0,
};

const avatarImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  borderRadius: "50%",
};

const name = {
  fontSize: "18px",
  fontWeight: "900",
  color: "#111827",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

const businessInfoLine = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  marginTop: "3px",
  color: "#475569",
  fontWeight: "700",
  fontSize: "12px",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

const statusRow = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  marginTop: "4px",
  color: "#10b981",
  fontWeight: "700",
  fontSize: "13px",
};

const greenDot = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: "#10b981",
};


const jobRecordMiniBadge = {
  marginLeft: "8px",
  background: "#eef2ff",
  color: "#5b3df5",
  padding: "4px 8px",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: "900",
};


const callMenu = {
  position: "fixed",
  top: "72px",
  right: "max(68px, calc((100vw - 860px) / 2 + 68px))",
  width: "210px",
  background: "#ffffff",
  border: "1px solid #e8ebf3",
  borderRadius: "16px",
  boxShadow: "0 18px 42px rgba(15,23,42,0.14)",
  padding: "6px",
  zIndex: 81,
};

const callMenuBtn = {
  width: "100%",
  height: "40px",
  border: "none",
  borderRadius: "12px",
  background: "transparent",
  color: "#111827",
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
  textAlign: "left",
  padding: "0 12px",
};

const threadMenu = {
  position: "fixed",
  top: "72px",
  right: "max(16px, calc((100vw - 860px) / 2 + 16px))",
  width: "250px",
  maxHeight: "70vh",
  overflowY: "auto",
  background: "#ffffff",
  border: "1px solid #e8ebf3",
  borderRadius: "16px",
  boxShadow: "0 18px 42px rgba(15,23,42,0.14)",
  padding: "8px",
  zIndex: 120,
};

const threadMenuBtn = {
  width: "100%",
  height: "40px",
  border: "none",
  borderRadius: "12px",
  background: "transparent",
  color: "#111827",
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
  textAlign: "left",
  padding: "0 12px",
};


const emergencyBanner = {
  position: "sticky",
  top: "78px",
  zIndex: 20,
  marginBottom: "18px",
  padding: "14px",
  borderRadius: "24px",
  background: "linear-gradient(135deg, #fff7f7, #fff1f1)",
  border: "1px solid rgba(239,68,68,0.14)",
  boxShadow: "0 10px 28px rgba(239,68,68,0.08)",
  backdropFilter: "blur(12px)",
};


const completedEmergencyBanner = {
  background: "linear-gradient(135deg, #f0fdf4, #ffffff)",
  border: "1px solid rgba(16,185,129,0.18)",
  boxShadow: "0 10px 28px rgba(16,185,129,0.08)",
};

const emergencyBannerTop = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};


const emergencyExpandBtn = {
  width: "28px",
  height: "28px",
  borderRadius: "999px",
  border: "1px solid rgba(239,68,68,0.16)",
  background: "#ffffff",
  color: "#dc2626",
  fontSize: "18px",
  fontWeight: "900",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const emergencyDot = {
  width: "12px",
  height: "12px",
  borderRadius: "999px",
  background: "#ef4444",
  boxShadow: "0 0 0 6px rgba(239,68,68,0.12)",
  flexShrink: 0,
};


const completedEmergencyDot = {
  background: "#10b981",
  boxShadow: "0 0 0 6px rgba(16,185,129,0.12)",
};

const emergencyBannerTitle = {
  fontSize: "14px",
  fontWeight: "900",
  color: "#991b1b",
};

const emergencyBannerSubtitle = {
  fontSize: "12px",
  color: "#7f1d1d",
  opacity: 0.82,
  marginTop: "2px",
};

const emergencyPillRow = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "12px",
};


const emergencyTimeline = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  overflowX: "auto",
  marginTop: "14px",
  paddingBottom: "2px",
};

const emergencyStep = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  whiteSpace: "nowrap",
  color: "#475569",
  fontSize: "10px",
  fontWeight: "800",
};

const emergencyStepActive = {
  color: "#dc2626",
};

const emergencyStepDot = {
  width: "8px",
  height: "8px",
  borderRadius: "999px",
  background: "#d1d5db",
};

const emergencyStepDotActive = {
  background: "#ef4444",
  boxShadow: "0 0 0 4px rgba(239,68,68,0.12)",
};



const completeFromChatBtn = {
  width: "100%",
  marginTop: "14px",
  padding: "14px",
  border: "none",
  borderRadius: "18px",
  background: "#10b981",
  color: "#ffffff",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(16,185,129,0.18)",
};


const completedActionRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "14px",
};

const historyBtn = {
  padding: "13px",
  border: "none",
  borderRadius: "16px",
  background: "#10b981",
  color: "#ffffff",
  fontWeight: "900",
  cursor: "pointer",
};

const summaryBtn = {
  padding: "13px",
  border: "1px solid rgba(239,68,68,0.14)",
  borderRadius: "16px",
  background: "#ffffff",
  color: "#991b1b",
  fontWeight: "900",
  cursor: "pointer",
};

const routePreviewCard = {
  marginTop: "14px",
  padding: "14px",
  borderRadius: "22px",
  background: "#ffffff",
  border: "1px solid rgba(239,68,68,0.12)",
};

const routePreviewTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "12px",
};

const routePreviewTitle = {
  fontSize: "13px",
  fontWeight: "900",
  color: "#991b1b",
};

const routePreviewSubtitle = {
  fontSize: "10px",
  color: "#7f1d1d",
  opacity: 0.882,
  marginTop: "2px",
};

const routePreviewBtn = {
  border: "none",
  borderRadius: "999px",
  padding: "8px 12px",
  background: "#fef2f2",
  color: "#dc2626",
  fontWeight: "800",
  fontSize: "10px",
  cursor: "pointer",
};

const routeMapPlaceholder = {
  position: "relative",
  height: "90px",
  borderRadius: "18px",
  background:
    "linear-gradient(135deg, #fff7f7, #ffffff)",
  overflow: "hidden",
};

const routeLine = {
  position: "absolute",
  left: "18%",
  right: "18%",
  top: "50%",
  height: "4px",
  borderRadius: "999px",
  background:
    "linear-gradient(90deg, #fca5a5, #ef4444)",
};

const routePinStart = {
  position: "absolute",
  left: "12%",
  top: "36%",
  fontSize: "22px",
};

const routePinEnd = {
  position: "absolute",
  right: "12%",
  top: "36%",
  fontSize: "22px",
};



const completedEmergencyPill = {
  padding: "7px 12px",
  borderRadius: "999px",
  background: "#ecfdf5",
  border: "1px solid rgba(16,185,129,0.16)",
  color: "#047857",
  fontSize: "10px",
  fontWeight: "800",
};

const emergencyPill = {
  padding: "7px 12px",
  borderRadius: "999px",
  background: "#ffffff",
  border: "1px solid rgba(239,68,68,0.12)",
  color: "#991b1b",
  fontSize: "10px",
  fontWeight: "800",
};

const chatArea = {
  flex: "1 1 auto",
  minHeight: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  padding: "22px clamp(16px, 3vw, 34px)",
};

const dateRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  marginBottom: "24px",
  color: "#475569",
  fontSize: "13px",
};

const dateLine = {
  width: "60px",
  height: "1px",
  background: "#e5e7eb",
};

const messageRow = {
  display: "flex",
  marginBottom: "12px",
};


const operationalRow = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "18px",
};

const operationalCard = {
  width: "min(92%, 520px)",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "24px",
  padding: "16px",
  boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
};

const operationalHeader = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: "#111827",
};

const operationalIcon = {
  width: "44px",
  height: "44px",
  borderRadius: "16px",
  background: "#eef2ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
};

const operationalSubtitle = {
  marginTop: "4px",
  color: "#667085",
  fontSize: "13px",
  fontWeight: "700",
};

const scheduleCardDetails = {
  width: "100%",
  maxWidth: "100%",
  overflow: "hidden",
  marginTop: "12px",
  display: "grid",
  gap: "8px",
  boxSizing: "border-box",
};

const scheduleDetailRow = {
  width: "100%",
  minWidth: 0,
  overflow: "hidden",
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  background: "rgba(255,255,255,0.74)",
  border: "1px solid rgba(226,232,240,0.95)",
  borderRadius: "14px",
  padding: "10px 12px",
  color: "#334155",
  boxSizing: "border-box",
};

const materialsListCard = {
  marginTop: "12px",
  display: "grid",
  gap: "8px",
};

const materialsListRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  background: "rgba(255,255,255,0.74)",
  border: "1px solid rgba(226,232,240,0.95)",
  borderRadius: "14px",
  padding: "10px 12px",
  color: "#334155",
  fontSize: "13px",
};

const materialsMoreText = {
  margin: "4px 0 0",
  color: "#475569",
  fontSize: "13px",
  fontWeight: "700",
};

const approvalActions = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "14px",
};

const approveBtn = {
  border: "none",
  background: "#16a34a",
  color: "white",
  borderRadius: "14px",
  padding: "11px",
  fontWeight: "900",
  cursor: "pointer",
};

const requestChangeBtn = {
  background: "#ffffff",
  color: "#5b3df5",
  border: "2px solid #5b3df5",
  fontWeight: "900",

  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#111827",
  borderRadius: "14px",
  padding: "11px",
  fontWeight: "900",
  cursor: "pointer",
};


const operationalImage = {
  width: "100%",
  minHeight: "180px",
  maxHeight: "420px",
  objectFit: "cover",
  borderRadius: "18px",
  marginTop: "12px",
  cursor: "zoom-in",
  display: "block",
};

const changeRequestBody = {
  marginTop: "12px",
  background: "rgba(255,255,255,.78)",
  border: "1px solid rgba(124,58,237,.14)",
  borderRadius: "16px",
  padding: "12px",
};

const changeRequestText = {
  margin: "0 0 10px",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "750",
  lineHeight: 1.45,
};

const closeoutWorkflowBody = {
  marginTop: "14px",
  background: "linear-gradient(180deg,#ffffff,#f8fafc)",
  border: "1px solid #dcfce7",
  borderRadius: "22px",
  padding: "16px",
};

const closeoutWorkflowHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "flex-start",
};

const closeoutWorkflowEyebrow = {
  margin: 0,
  color: "#16a34a",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const closeoutWorkflowTitle = {
  margin: "4px 0 0",
  color: "#111827",
  fontSize: "18px",
};

const closeoutWorkflowAmount = {
  background: "#dcfce7",
  color: "#166534",
  borderRadius: "16px",
  padding: "10px 12px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const closeoutWorkflowText = {
  color: "#475569",
  fontWeight: "700",
  lineHeight: 1.5,
  margin: "12px 0",
};

const closeoutWorkflowBreakdown = {
  display: "grid",
  gap: "8px",
  marginTop: "10px",
};

const closeoutWorkflowRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  background: "#f8fafc",
  borderRadius: "14px",
  padding: "10px 12px",
  color: "#334155",
  fontWeight: "800",
};

const closeoutWorkflowActions = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "14px",
};

const confirmCloseoutButton = {
  border: "none",
  borderRadius: "16px",
  padding: "12px",
  background: "#16a34a",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const closeoutFollowupButton = {
  border: "none",
  borderRadius: "16px",
  padding: "12px",
  background: "#fff7ed",
  color: "#9a3412",
  fontWeight: "900",
  cursor: "pointer",
};

const closeoutConfirmedNotice = {
  marginTop: "14px",
  background: "#dcfce7",
  color: "#166534",
  borderRadius: "16px",
  padding: "12px",
  fontWeight: "900",
};

const closeoutFollowupNotice = {
  marginTop: "14px",
  background: "#fff7ed",
  color: "#9a3412",
  borderRadius: "16px",
  padding: "12px",
  fontWeight: "900",
};

const leaveReviewButton = {
  width: "100%",
  border: "none",
  borderRadius: "16px",
  padding: "12px",
  background: "#eef2ff",
  color: "#4f46e5",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: "12px",
};

const invoiceWorkflowBody = {
  marginTop: "14px",
  background: "linear-gradient(180deg,#ffffff,#f8fafc)",
  border: "1px solid #e0e7ff",
  borderRadius: "22px",
  padding: "16px",
};

const invoiceWorkflowHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "flex-start",
};

const invoiceWorkflowEyebrow = {
  margin: 0,
  color: "#5b3df5",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const invoiceWorkflowTitle = {
  margin: "4px 0 0",
  color: "#111827",
  fontSize: "18px",
};

const invoiceWorkflowAmount = {
  background: "#eef2ff",
  color: "#4f46e5",
  borderRadius: "16px",
  padding: "10px 12px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const invoiceWorkflowText = {
  color: "#475569",
  fontWeight: "700",
  lineHeight: 1.5,
  margin: "12px 0",
};

const invoiceWorkflowBreakdown = {
  display: "grid",
  gap: "8px",
  marginTop: "10px",
};

const invoiceWorkflowRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  background: "#f8fafc",
  borderRadius: "14px",
  padding: "10px 12px",
  color: "#334155",
  fontWeight: "800",
};

const invoiceWorkflowNotes = {
  margin: "12px 0 0",
  color: "#475569",
  fontWeight: "700",
  lineHeight: 1.5,
};

const invoiceWorkflowActions = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "14px",
};

const markInvoicePaidButton = {
  border: "none",
  borderRadius: "16px",
  padding: "12px",
  background: "#16a34a",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const invoiceQuestionButton = {
  border: "none",
  borderRadius: "16px",
  padding: "12px",
  background: "#eef2ff",
  color: "#4f46e5",
  fontWeight: "900",
  cursor: "pointer",
};

const invoicePaidNotice = {
  marginTop: "14px",
  background: "#dcfce7",
  color: "#166534",
  borderRadius: "16px",
  padding: "12px",
  fontWeight: "900",
};

const invoiceQuestionNotice = {
  marginTop: "14px",
  background: "#fff7ed",
  color: "#9a3412",
  borderRadius: "16px",
  padding: "12px",
  fontWeight: "900",
};

const materialsApprovalBody = {
  marginTop: "14px",
  background: "linear-gradient(180deg,#ffffff,#f8fafc)",
  border: "1px solid #dbeafe",
  borderRadius: "22px",
  padding: "16px",
};

const materialsApprovalHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "flex-start",
};

const materialsApprovalEyebrow = {
  margin: 0,
  color: "#2563eb",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const materialsApprovalTitle = {
  margin: "4px 0 0",
  color: "#111827",
  fontSize: "18px",
};

const materialsApprovalStatus = {
  background: "#eff6ff",
  color: "#1d4ed8",
  borderRadius: "16px",
  padding: "10px 12px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const materialsApprovalText = {
  color: "#475569",
  fontWeight: "700",
  lineHeight: 1.5,
  margin: "12px 0",
};

const materialsProviderBox = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "12px",
  color: "#334155",
  fontWeight: "900",
  marginBottom: "12px",
};

const materialsApprovalList = {
  display: "grid",
  gap: "8px",
};

const materialsApprovalRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  background: "#f8fafc",
  borderRadius: "14px",
  padding: "10px 12px",
  color: "#334155",
  fontWeight: "800",
};

const materialsApprovalActions = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
  marginTop: "14px",
};

const approveMaterialsButton = {
  border: "none",
  borderRadius: "16px",
  padding: "12px",
  background: "#16a34a",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const customerProvideMaterialsButton = {
  border: "none",
  borderRadius: "16px",
  padding: "12px",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontWeight: "900",
  cursor: "pointer",
};

const requestMaterialsChangeButton = {
  border: "none",
  borderRadius: "16px",
  padding: "12px",
  background: "#fff7ed",
  color: "#9a3412",
  fontWeight: "900",
  cursor: "pointer",
};

const materialsApprovedNotice = {
  marginTop: "14px",
  background: "#dcfce7",
  color: "#166534",
  borderRadius: "16px",
  padding: "12px",
  fontWeight: "900",
};

const materialsCustomerProvidingNotice = {
  marginTop: "14px",
  background: "#fef9c3",
  color: "#854d0e",
  borderRadius: "16px",
  padding: "12px",
  fontWeight: "900",
};

const materialsChangeNotice = {
  marginTop: "14px",
  background: "#fff7ed",
  color: "#9a3412",
  borderRadius: "16px",
  padding: "12px",
  fontWeight: "900",
};

const revisedQuoteBody = {
  marginTop: "14px",
  background: "linear-gradient(180deg,#ffffff,#f8fafc)",
  border: "1px solid #e0e7ff",
  borderRadius: "22px",
  padding: "16px",
};

const revisedQuoteHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "flex-start",
};

const revisedQuoteEyebrow = {
  margin: 0,
  color: "#5b3df5",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const revisedQuoteTitle = {
  margin: "4px 0 0",
  color: "#111827",
  fontSize: "18px",
};

const revisedQuoteAmount = {
  background: "#eef2ff",
  color: "#4f46e5",
  borderRadius: "16px",
  padding: "10px 12px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const revisedQuoteText = {
  color: "#475569",
  fontWeight: "700",
  lineHeight: 1.5,
  margin: "12px 0",
};

const revisedQuoteBreakdown = {
  display: "grid",
  gap: "8px",
  marginTop: "10px",
};

const revisedQuoteRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  background: "#f8fafc",
  borderRadius: "14px",
  padding: "10px 12px",
  color: "#334155",
  fontWeight: "800",
};

const revisedQuoteNotes = {
  margin: "12px 0 0",
  color: "#475569",
  fontWeight: "700",
  lineHeight: 1.5,
};

const revisedQuoteActions = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "14px",
};

const approveRevisedQuoteButton = {
  border: "none",
  borderRadius: "16px",
  padding: "12px",
  background: "#16a34a",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const requestRevisedQuoteChangeButton = {
  border: "none",
  borderRadius: "16px",
  padding: "12px",
  background: "#eef2ff",
  color: "#4f46e5",
  fontWeight: "900",
  cursor: "pointer",
};

const revisedQuoteApproved = {
  marginTop: "14px",
  background: "#dcfce7",
  color: "#166534",
  borderRadius: "16px",
  padding: "12px",
  fontWeight: "900",
};

const revisedQuotePending = {
  marginTop: "14px",
  background: "#fff7ed",
  color: "#9a3412",
  borderRadius: "16px",
  padding: "12px",
  fontWeight: "900",
};

const changeRequestActions = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
  marginTop: "10px",
};

const reviewChangeButton = {
  border: "none",
  background: "#ecfdf5",
  color: "#047857",
  borderRadius: "12px",
  padding: "10px",
  fontWeight: "900",
  cursor: "pointer",
};

const revisedQuoteButton = {
  border: "none",
  background: "linear-gradient(135deg,#5b3df5,#7c3aed)",
  color: "white",
  borderRadius: "12px",
  padding: "10px",
  fontWeight: "900",
  cursor: "pointer",
};

const changeRequestStatus = {
  display: "inline-flex",
  padding: "7px 10px",
  borderRadius: "999px",
  background: "#f5f3ff",
  color: "#6d28d9",
  fontSize: "10px",
  fontWeight: "900",
};

const operationalTime = {
  marginTop: "10px",
  color: "#475569",
  fontSize: "10px",
  fontWeight: "800",
  textAlign: "right",
};


const bubble = {
  minWidth: "0",
  maxWidth: "calc(100vw - 58px)",
  overflow: "hidden",
  wordBreak: "break-word",
  padding: "12px 14px",
  borderRadius: "26px",
  fontSize: "14px",
  lineHeight: 1.45,
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
  boxSizing: "border-box",
};

const theirBubble = {
  background: "#f7f7fb",
  color: "#111827",
  borderBottomLeftRadius: "8px",
};

const myBubble = {
  background: "linear-gradient(135deg, #f1eaff, #ded2ff)",
  color: "#2f1f75",
  border: "1px solid rgba(124,92,255,0.20)",
  boxShadow: "0 8px 22px rgba(91,61,245,0.10)",
  borderBottomRightRadius: "10px",
};

const imageCardBubble = {
  background: "#ffffff",
  color: "#111827",
  border: "1px solid rgba(124,92,255,0.28)",
  boxShadow: "0 10px 30px rgba(91,61,245,0.18)",
};

const emergencyMyBubble = {
  background: "linear-gradient(135deg, #ffeaea, #ffd4d4)",
  color: "#7f1d1d",
  border: "1px solid rgba(239,68,68,0.22)",
  boxShadow: "0 8px 22px rgba(239,68,68,0.10)",
  borderBottomRightRadius: "10px",
};

const emergencyTheirBubble = {
  background: "#fff7f7",
  color: "#7f1d1d",
  border: "1px solid rgba(239,68,68,0.16)",
  borderBottomLeftRadius: "8px",
};

const emergencyImageCardBubble = {
  background: "#ffffff",
  color: "#111827",
  border: "1px solid rgba(239,68,68,0.28)",
  boxShadow: "0 10px 30px rgba(239,68,68,0.16)",
};

const timeRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  marginTop: "6px",
  fontSize: "9px",
  opacity: 1,
  fontWeight: "700",
};

const replyPreviewMine = {
  marginBottom: "8px",
  padding: "8px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.18)",
  borderLeft: "3px solid rgba(255,255,255,0.75)",
  display: "flex",
  flexDirection: "column",
  fontSize: "10px",
};

const replyPreviewTheirs = {
  marginBottom: "8px",
  padding: "8px",
  borderRadius: "12px",
  background: "#ffffff",
  borderLeft: "3px solid #5b3df5",
  display: "flex",
  flexDirection: "column",
  fontSize: "10px",
};



const imageBubble = {
  width: "min(86vw, 430px)",
  maxWidth: "min(86vw, 430px)",
  padding: "12px",
};

const imageTitle = {
  fontSize: "13px",
  fontWeight: "900",
  marginBottom: "2px",
  textAlign: "center",
};

const imageSubtitle = {
  fontSize: "10px",
  opacity: 0.884,
  marginBottom: "6px",
  lineHeight: 1.3,
  textAlign: "center",
};
const imageMessage = {
  width: "100%",
  minHeight: "180px",
  maxHeight: "420px",
  objectFit: "cover",
  borderRadius: "20px",
  marginBottom: "6px",
  cursor: "zoom-in",
  display: "block",
};

const richCard = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px",
  marginBottom: "8px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.22)",
};

const richIconWrap = {
  width: "42px",
  height: "42px",
  borderRadius: "15px",
  background: "rgba(255,255,255,0.22)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const typingRow = {
  display: "flex",
  marginBottom: "16px",
};

const typingBubble = {
  background: "#f3f4f6",
  borderRadius: "18px",
  padding: "12px",
  display: "flex",
  gap: "4px",
};

const actionMenu = {
  position: "fixed",
  left: "50%",
  bottom: "calc(240px + env(safe-area-inset-bottom))",
  transform: "translateX(-50%)",
  width: "calc(100% - 32px)",
  maxWidth: "460px",
  background: "#ffffff",
  borderRadius: "20px",
  padding: "8px",
  display: "flex",
  gap: "8px",
  boxShadow: "0 18px 42px rgba(15,23,42,0.16)",
  zIndex: 60,
};

const actionBtn = {
  flex: 1,
  height: "40px",
  border: "none",
  borderRadius: "14px",
  background: "#f6f7fb",
  fontWeight: "700",
  cursor: "pointer",
};

const bottomStack = {
  flexShrink: 0,
  position: "fixed",
  bottom: "0",
  left: "50%",
  transform: "translateX(-50%)",
  width: "100%",
  maxWidth: "860px",
  background: "rgba(255,255,255,0.97)",
  backdropFilter: "blur(14px)",
  zIndex: 1200,
  borderTop: "1px solid #eef2f7",
  boxSizing: "border-box",
  overflowX: "hidden",
  paddingBottom: "env(safe-area-inset-bottom)",
};

const quickWrap = {
  display: "flex",
  width: "100%",
  maxWidth: "100%",
  overflowX: "auto",
  overscrollBehaviorX: "contain",
  overflowY: "hidden",
  WebkitOverflowScrolling: "touch",
  gap: "8px",
  padding: "8px 16px",
  boxSizing: "border-box",
};


const emergencyQuickBtn = {
  color: "#dc2626",
  border: "1px solid rgba(239,68,68,0.22)",
  background: "#fff7f7",
};

const quickBtn = {
  flexShrink: 0,
  border: "1px solid #e7eaf2",
  background: "#ffffff",
  color: "#111827",
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: "800",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const replyComposer = {
  margin: "0 16px calc(env(safe-area-inset-bottom) + 8px)",
  background: "#f7f8fb",
  borderLeft: "4px solid #5b3df5",
  borderRadius: "16px",
  padding: "10px 12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const replyComposerText = {
  fontSize: "12px",
  color: "#6b7280",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  maxWidth: "280px",
};

const replyCloseBtn = {
  width: "28px",
  height: "28px",
  borderRadius: "10px",
  border: "none",
  background: "#ffffff",
  cursor: "pointer",
};

const pendingImageBox = {
  margin: "0 16px calc(env(safe-area-inset-bottom) + 8px)",
  background: "#f7f8fb",
  borderLeft: "4px solid #5b3df5",
  borderRadius: "16px",
  padding: "10px 12px",
  display: "flex",
  gap: "10px",
  alignItems: "center",
};

const pendingImageThumb = {
  width: "86px",
  height: "70px",
  borderRadius: "16px",
  objectFit: "cover",
};

const pendingImageName = {
  fontSize: "12px",
  color: "#6b7280",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

const attachMenu = {
  margin: "0 16px calc(env(safe-area-inset-bottom) + 8px)",
  maxHeight: "170px",
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  background: "#ffffff",
  border: "1px solid #e7eaf2",
  borderRadius: "24px",
  padding: "10px",
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "8px",
  boxShadow: "0 18px 45px rgba(15,23,42,0.14)",
  animation: "meetroSheetIn 180ms ease-out",
};

const attachMenuBtn = {
  minHeight: "52px",
  border: "none",
  borderRadius: "19px",
  background: "#f8fafc",
  color: "#111827",
  fontSize: "10px",
  fontWeight: "800",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
};

const attachIconCircle = {
  width: "32px",
  height: "32px",
  borderRadius: "15px",
  background: "#eef2ff",
  color: "#5b3df5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};


const photoExplainCard = {
  background: "rgba(255,255,255,0.92)",
  borderRadius: "22px",
  padding: "14px",
  margin: "0 14px 10px",
  boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
  border: "1px solid rgba(148,163,184,0.14)",
};

const photoExplainTitle = {
  fontSize: "14px",
  fontWeight: "800",
  marginBottom: "4px",
};

const photoExplainSubtitle = {
  fontSize: "12px",
  opacity: 0.88,
  lineHeight: 1.4,
  marginBottom: "12px",
};

const photoChipRow = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const photoChip = {
  border: "none",
  background: "#eef2ff",
  color: "#4338ca",
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: "700",
  cursor: "pointer",
};

const photoExplainInput = {
  width: "100%",
  borderRadius: "16px",
  border: "1px solid rgba(148,163,184,0.22)",
  padding: "12px",
  fontSize: "14px",
  resize: "none",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
const composer = {
  margin: "0 16px calc(env(safe-area-inset-bottom) + 8px)",
  background: "#ffffff",
  border: "1px solid #e7eaf2",
  borderRadius: "24px",
  padding: "8px",
  display: "flex",
  alignItems: "flex-end",
  gap: "6px",
  boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
};

const circleBtn = {
  width: "38px",
  height: "38px",
  borderRadius: "14px",
  border: "1px solid #e7eaf2",
  background: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "180ms ease",
  flexShrink: 0,
};

const activeCircleBtn = {
  background: "#f5f3ff",
  border: "1px solid #5b3df5",
  color: "#5b3df5",
  transform: "rotate(45deg)",
  boxShadow: "0 8px 18px rgba(91,61,245,0.18)",
};

const inputWrap = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
};

const input = {
  width: "100%",
  minHeight: "22px",
  maxHeight: "120px",
  border: "none",
  outline: "none",
  fontSize: "16px",
  lineHeight: "1.45",
  background: "transparent",
  resize: "none",
  overflowY: "auto",
  fontFamily: "inherit",
  paddingTop: "8px",
  paddingBottom: "6px",
};


const emergencySendBtn = {
  background: "linear-gradient(135deg, #ff6b6b, #ef4444)",
  boxShadow: "0 10px 24px rgba(239,68,68,0.24)",
};

const sendBtn = {
  width: "40px",
  height: "40px",
  borderRadius: "16px",
  border: "none",
  background: "linear-gradient(135deg, #7c5cff, #4f2df0)",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
};

const confirmOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.35)",
  zIndex: 95,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const confirmBox = {
  width: "100%",
  maxWidth: "340px",
  background: "#ffffff",
  borderRadius: "24px",
  padding: "20px",
  boxShadow: "0 24px 80px rgba(15,23,42,0.24)",
};

const confirmTitle = {
  margin: "0 0 8px",
  fontSize: "18px",
  fontWeight: "900",
};

const confirmText = {
  fontSize: "14px",
  color: "#6b7280",
};

const confirmActions = {
  display: "flex",
  gap: "10px",
  marginTop: "18px",
};

const confirmCancelBtn = {
  flex: 1,
  height: "42px",
  border: "none",
  borderRadius: "15px",
  background: "#f3f4f8",
  fontWeight: "700",
  cursor: "pointer",
};

const confirmDeleteBtn = {
  flex: 1,
  height: "42px",
  border: "none",
  borderRadius: "15px",
  background: "#ef4444",
  color: "#ffffff",
  fontWeight: "700",
  cursor: "pointer",
};




const recordOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  zIndex: 115,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "18px",
};

const recordPanel = {
  width: "100%",
  maxWidth: "520px",
  maxHeight: "82vh",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  background: "white",
  borderRadius: "30px",
  boxShadow: "0 28px 80px rgba(15,23,42,0.28)",
};

const recordHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "22px",
  borderBottom: "1px solid #eef2f7",
};

const recordTitle = {
  margin: 0,
  fontSize: "24px",
  fontWeight: "900",
  color: "#111827",
};

const recordSubtitle = {
  margin: "6px 0 0",
  color: "#667085",
  fontWeight: "700",
};

const recordClose = {
  width: "40px",
  height: "40px",
  borderRadius: "14px",
  border: "none",
  background: "#f3f4f6",
  fontSize: "22px",
  cursor: "pointer",
};



const recordDescription = {
  padding: "0 22px 18px",
  marginTop: "-4px",
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.5,
  fontWeight: "650",
};

const recordTools = {
  padding: "14px 18px 0",
};

const recordSpeakBtn = {
  width: "100%",
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: "900",
  cursor: "pointer",
};




const recordList = {
  overflowY: "auto",
  padding: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};


const timelineItem = {
  display: "grid",
  gridTemplateColumns: "42px 1fr",
  gap: "12px",
  alignItems: "stretch",
};

const timelineRail = {
  position: "relative",
  display: "flex",
  justifyContent: "center",
};

const timelineLine = {
  position: "absolute",
  top: "34px",
  bottom: "-20px",
  width: "2px",
  background: "#d9def0",
};

const timelineDot = {
  width: "38px",
  height: "38px",
  borderRadius: "16px",
  background: "#eef2ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  boxShadow: "0 8px 16px rgba(91,61,245,0.12)",
  zIndex: 2,
};


const expandedPanel = {
  marginTop: "14px",
  borderTop: "1px solid #e7eaf3",
  paddingTop: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const expandedPreview = {
  height: "140px",
  borderRadius: "18px",
  background: "#eef2ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "800",
  color: "#5b3df5",
};

const expandedInfo = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const expandedInfoRow = {
  background: "#f8fafc",
  borderRadius: "14px",
  padding: "10px 12px",
  fontWeight: "700",
  color: "#475467",
};

const expandedSpeakBtn = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  padding: "13px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
};


const timelineContent = {
  background: "#f8fafc",
  border: "1px solid #eef2f7",
  borderRadius: "20px",
  padding: "14px",
};

const timelineTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "6px",
  color: "#111827",
};


const recordItem = {
  display: "flex",
  gap: "14px",
  alignItems: "center",
  padding: "16px",
  borderRadius: "22px",
  background: "#f8fafc",
  border: "1px solid #eef2f7",
};

const recordItemIcon = {
  width: "54px",
  height: "54px",
  borderRadius: "18px",
  background: "#eef2ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  flexShrink: 0,
};

const recordItemTitle = {
  fontWeight: "900",
  color: "#111827",
  marginBottom: "4px",
};

const recordItemText = {
  color: "#667085",
  fontWeight: "700",
  fontSize: "14px",
};

const recordTime = {
  fontSize: "12px",
  fontWeight: "800",
  color: "#475569",
};

const emptyRecord = {
  padding: "40px 20px",
  textAlign: "center",
  color: "#475569",
  fontWeight: "700",
};


const saveToast = {
  position: "fixed",
  left: "50%",
  bottom: "180px",
  transform: "translateX(-50%)",
  background: "#111827",
  color: "white",
  padding: "12px 16px",
  borderRadius: "999px",
  fontWeight: "900",
  zIndex: 140,
  boxShadow: "0 14px 34px rgba(15,23,42,0.22)",
};

const storyOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  zIndex: 120,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const storyCard = {
  width: "100%",
  maxWidth: "460px",
  background: "white",
  borderRadius: "30px",
  padding: "24px",
  boxShadow: "0 28px 80px rgba(15,23,42,0.28)",
  position: "relative",
  textAlign: "center",
};

const storyClose = {
  position: "absolute",
  top: "14px",
  right: "14px",
  width: "36px",
  height: "36px",
  borderRadius: "14px",
  border: "none",
  background: "#f3f4f6",
  fontSize: "22px",
  cursor: "pointer",
};

const storyIcon = {
  width: "70px",
  height: "70px",
  borderRadius: "24px",
  background: "#eef2ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "34px",
  margin: "0 auto 14px",
};

const storyTitle = {
  margin: "0 0 8px",
  fontSize: "26px",
  fontWeight: "900",
  color: "#111827",
};

const storyText = {
  color: "#667085",
  fontWeight: "800",
};

const storyPreviewBox = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  padding: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  margin: "18px 0",
};

const storyPreviewIcon = {
  fontSize: "42px",
};

const storySpeakBtn = {
  width: "100%",
  padding: "14px",
  borderRadius: "18px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
  marginBottom: "10px",
};

const storySaveBtn = {
  width: "100%",
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#111827",
  fontWeight: "900",
  cursor: "pointer",
};



const imageModal = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.92)",
  zIndex: 120,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  backdropFilter: "blur(6px)",
};

const modalImage = {
  width: "auto",
  maxWidth: "96vw",
  maxHeight: "92vh",
  borderRadius: "22px",
  objectFit: "contain",
  boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
  animation: "meetroImageIn 180ms ease-out",
};


export default ConversationThread;
