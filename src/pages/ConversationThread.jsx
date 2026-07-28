import { Component, memo, useEffect, useMemo, useCallback, useRef, useState } from "react";
import useAppLayoutMetrics from "../hooks/useAppLayoutMetrics";
import useLanguage from "../hooks/useLanguage";
import { getLanguage, t } from "../utils/language";
import {
  formatDateTimeDisplay,
  formatMessageTime,
  formatScheduleTime,
} from "../utils/displayTime";
import { authFetch } from "../utils/authFetch";
import {
  CANONICAL_MESSAGE_MAX_LENGTH,
  CONVERSATION_THREAD_TYPES,
  buildCanonicalMessagePayload,
  normalizeCanonicalConversationDetail,
  normalizeCanonicalConversationId,
  normalizeCanonicalMessage,
  normalizeCanonicalMessageCollection,
  parseCanonicalConversationRoute,
  validateCanonicalMessageText,
} from "../utils/canonicalConversationMessaging";
import { canReadLegacyWorkflowStorage } from "../utils/clientWorkflowStoragePolicy";
import { isProfessionalSession } from "../utils/session";
import { transitionEmergencyStatus } from "../utils/emergencyLifecycle";
import {
  EMERGENCY_DISPATCH_ACTIONS,
  transitionEmergencyDispatch,
} from "../utils/emergencyApi";
import WorkflowRenderer from "../components/workflows/WorkflowRenderer";
import HiringUnavailableState from "../components/HiringUnavailableState";
import CompletionWorkflowPresentation from "../components/workflows/presentations/CompletionWorkflowPresentation";
import InvoiceWorkflowPresentation from "../components/workflows/presentations/InvoiceWorkflowPresentation";
import MaterialsWorkflowPresentation from "../components/workflows/presentations/MaterialsWorkflowPresentation";
import RevisedQuoteWorkflowPresentation from "../components/workflows/presentations/RevisedQuoteWorkflowPresentation";
import UniversalDocumentCard from "../components/documents/UniversalDocumentCard";
import {
  getWorkflowMessageProps,
  isWorkflowMessageType,
  isWorkflowType,
} from "../utils/workflowTypes";
import { mergeConversationMessages } from "../utils/conversationMessages";
import {
  getConversationRegistry,
  isConversationUserSavedToHistory,
  markConversationRead,
  markConversationUnread,
  markConversationUnreadForRecipient,
  saveConversationToUserHistory,
  writeUnreadConversationCount,
} from "../utils/conversationUnread";
import {
  filterHiringConversationMessages,
  isHiringConversationType,
  isMessageAllowedInHiringConversation,
} from "../utils/hiringConversations";
import { addNotification } from "../utils/notifications";
import {
  CAMERA_PERMISSION_MESSAGE,
  createPhotoInputEvent,
  openJobPhotoPicker,
} from "../utils/cameraPhotoPicker";
import {
  getMediaDeferredNotice,
  guardFriendsAndFamilyMediaUpload,
  isFriendsAndFamilyMediaDeferred,
} from "../utils/mediaDeferral";

import {
  getBusinessSchedule,
  saveBusinessSchedule,
  getActiveJobSnapshot,
  getJobRecord,
  saveJobRecord,
  saveConversationMeta,
} from "../utils/workCenter";
import { reconcileConversationTimelineEvents } from "../utils/conversationTimelineReconciliation";
import { getConversationTimelineAudit } from "../utils/conversationTimelineAudit";
import {
  cancelAppointmentReminderNotifications,
  openNotificationSettings,
  scheduleAppointmentReminderNotifications,
} from "../utils/appointmentReminders";
import { createNotification } from "../utils/meetroNotifications";
import { captureConversationOriginContext } from "../utils/conversationOrigin";
import {
  getBusinessConversationIdentity,
  getPersonConversationIdentity,
} from "../utils/conversationIdentity";
import RelationshipIdentityPage from "../components/RelationshipIdentityPage";
import { resolveRelationshipIdentity } from "../utils/relationshipIdentity";
import {
  getPersonalProfilePhotoForRecord,
  getScopedProfilePhoto,
} from "../utils/profilePhotoScoping";
import {
  buildConversationIdentityInput,
  firstIdentityValue,
} from "../utils/conversationIdentityInput";
import {
  compactScopedContactRecord,
  getActiveProfileScopeDescriptor,
  getRecordContactScope,
  getRecordProfileScopeKey,
  normalizeProfileScopeKey,
  upsertProfileScopedContact,
} from "../utils/accountProfileScope";
import {
  glassActionMenu,
  glassField,
  glassNavigationSurface,
  glassPill,
  glassSurface,
  keyboardSafeFlowPage,
  nativeContactRow,
  softPageSection,
} from "../styles/liquidGlass";

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

const IconSearchClean = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7.5" stroke="currentColor" strokeWidth="2" />
    <path
      d="m20.5 20.5-4.35-4.35"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
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

const IconDocumentClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="4" width="16" height="16" rx="2.4" stroke="currentColor" strokeWidth="1.9" />
    <path
      d="M8 8h8M8 12h5M8 16h8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const IconCalendarClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <rect
      x="4"
      y="4"
      width="16"
      height="16"
      rx="2.2"
      stroke="currentColor"
      strokeWidth="1.9"
    />
    <path
      d="M8 2.2v3.2M16 2.2v3.2M4 8h16"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    <path d="m8 12h8" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const IconPhotoProgressClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <path
      d="M4 6h16v14H4z"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
      rx="2"
    />
    <path
      d="M8.5 13.4 10.8 16l3-3.5 4.2 5.8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="8" cy="9" r="1.2" fill="currentColor" />
  </svg>
);

const IconIssueClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 4.2 20.6 19H3.4z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path d="M12 9v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="12" cy="17.2" r="1" fill="currentColor" />
  </svg>
);

const IconCompletedClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <circle
      cx="12"
      cy="12"
      r="9.2"
      stroke="currentColor"
      strokeWidth="1.9"
    />
    <path
      d="M8.3 12.5 10.8 15l5.5-5.2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconHistoryClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 6.8v6.4l4.4 2.6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 3a9 9 0 1 0 9 9"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const IconPhotoDoneClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <path
      d="M4 6h16v14H4z"
      stroke="currentColor"
      strokeWidth="1.9"
      rx="2"
    />
    <path
      d="m7 14 3 3 8-8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconChangeRequestClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <path
      d="m3.8 12 3.8 3.8L20.2 3.3"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="m12.5 4.7 3.2-1.2L14.7 4l-1-1L17 2"
      stroke="currentColor"
      strokeWidth="1.6"
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

const resolveWorkflowIcon = (iconKey) => {
  const key = String(iconKey || "").toLowerCase();

  const map = {
    history: <IconHistoryClean />,
    quote: <IconApprovalClean />,
    materials: <IconMaterialsClean />,
    quickinvoice: <IconPaymentClean />,
    invoice: <IconPaymentClean />,
    completion: <IconCompletedClean />,
    notetext: <IconUpdateClean />,
    photo: <IconPhotosClean />,
    work: <IconPhotoProgressClean />,
    alert: <IconIssueClean />,
    done: <IconPhotoDoneClean />,
  };

  return (
    map[key] || <IconUpdateClean />
  );
};

const resolvePhotoWorkflowIcon = (workflowType) => {
  const key = String(workflowType || "").toLowerCase();

  const map = {
    before: <IconPhotoDoneClean />,
    progress: <IconPhotoProgressClean />,
    issue: <IconIssueClean />,
    completion: <IconCompletedClean />,
  };

  return map[key] || <IconPhotoProgressClean />;
};

const isDefaultImageCaption = (value) => {
  const normalized = (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return new Set([
    "project explanation photo",
    "foto para explicar el proyecto",
    "project photo",
    "foto del proyecto",
    "customer uploaded photo",
    "foto enviada por el cliente",
    "image sent to help explain the job",
    "imagen enviada para ayudar a explicar el trabajo",
    "photo shared with customer",
    "foto compartida con el cliente",
    "image sent to explain the project",
    "imagen enviada para explicar el proyecto",
    "photo sent to explain the project",
    "customer context",
    "customer photo",
  ]).has(normalized);
};

const DOCUMENT_WORKFLOW_TYPES = new Set([
  "workflow_change_request",
  "workflow_quote_sent",
  "workflow_revised_quote",
  "workflow_invoice_request",
  "workflow_completion_closeout",
]);

const isDocumentWorkflowMessage = (msg) =>
  Boolean(msg?.type && DOCUMENT_WORKFLOW_TYPES.has(msg.type));

const isReceiptDocumentMessage = (msg) =>
  msg?.type === "receipt" ||
  msg?.type === "workflow_receipt" ||
  msg?.documentType === "receipt";

const getQuoteDocumentStatus = (msg, language) => {
  const status = msg.quoteStatus || msg.status || msg.workflowStatus || "sent";

  if (status === "accepted" || status === "approved") {
    return t("documentStatusApproved", language);
  }

  if (status === "revision_requested" || status === "change_requested") {
    return t("documentStatusRevisionRequested", language);
  }

  if (status === "declined") return t("documentStatusDeclined", language);

  return t("documentStatusAwaitingApproval", language);
};

const getChangeOrderDocumentStatus = (msg, language) => {
  const status = msg.status || "pending_review";

  if (status === "reviewed") return t("documentStatusReviewed", language);
  if (status === "needs_revised_quote") {
    return t("documentStatusRevisedQuoteNeeded", language);
  }

  return t("documentStatusAwaitingApproval", language);
};

const getChangeOrderAmount = (msg) => {
  const value =
    msg.amount ||
    msg.total ||
    msg.changeAmount ||
    msg.changeOrder?.amount ||
    msg.changeOrder?.total ||
    "";

  if (value === "" || value === null || value === undefined) return "";
  if (typeof value === "string" && value.trim().startsWith("+")) return value;

  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? `+${numeric}` : value;
};

const getReceiptDocumentStatus = (msg, language) => {
  const status = msg.receiptStatus || msg.paymentStatus || msg.status || "paid";

  if (status === "sent") return t("documentStatusSent", language);
  if (status === "created") return t("documentStatusCreated", language);

  return t("documentStatusPaid", language);
};



const MessageItem = memo(({ message }) => {
  return (
    <div style={{ overscrollBehavior: 'contain' }} className="message-item">
      {message.text || message.content}
    </div>
  );
});


function ConversationThreadInner({ setPage, embedded = false }) {
  const appLayoutMetrics = useAppLayoutMetrics();
  const isLandscape = appLayoutMetrics.layoutWidth > appLayoutMetrics.layoutHeight;
  const [language, setLanguageState] = useState(getLanguage());
  const mediaUploadDeferred = isFriendsAndFamilyMediaDeferred();
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [swipedScheduleId, setSwipedScheduleId] = useState(null);
  const [scheduleDeleteCandidate, setScheduleDeleteCandidate] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingWorkflowPhotoType, setPendingWorkflowPhotoType] = useState(null);
  const [pendingPhotoPurpose, setPendingPhotoPurpose] = useState(null);
  const [photoExplanationText, setPhotoExplanationText] = useState("");
  const [showThreadMenu, setShowThreadMenu] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [chatScheduleForm, setChatScheduleForm] = useState({
    appointmentType: "walkthrough",
    date: new Date().toISOString().slice(0, 10),
    time: "12:00",
    title: "",
    location: "",
    notes: "",
  });
  const [emergencyPanelExpanded, setEmergencyPanelExpanded] = useState(false);
  const [, setEmergencyWorkflowTick] = useState(0);
  const [showCallMenu, setShowCallMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [jobStory, setJobStory] = useState(null);
  const [threadSearchTerm, setThreadSearchTerm] = useState("");
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [appointmentReminderNotice, setAppointmentReminderNotice] = useState(null);
  const [saveNotice, setSaveNotice] = useState("");
  const [savedThreadContactSnapshot, setSavedThreadContactSnapshot] = useState(null);
  const [jobRecordCount, setJobRecordCount] = useState(0);
  const [showJobRecords, setShowJobRecords] = useState(false);
  const [jobRecords, setJobRecords] = useState([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [tenantTicketDraft, setTenantTicketDraft] = useState(null);
  const [canonicalConversationState, setCanonicalConversationState] = useState({
    phase: "idle",
    status: "",
    canSendMessages: false,
  });
  const [canonicalConversationDetail, setCanonicalConversationDetail] = useState(null);
  const [canonicalMessagesPhase, setCanonicalMessagesPhase] = useState("idle");
  const [canonicalLoadErrorKey, setCanonicalLoadErrorKey] = useState("");
  const [canonicalSendErrorKey, setCanonicalSendErrorKey] = useState("");
  const [canonicalSendPending, setCanonicalSendPending] = useState(false);
  const [canonicalReloadKey, setCanonicalReloadKey] = useState(0);
  const [canonicalDispatchPending, setCanonicalDispatchPending] =
    useState(false);
  const [canonicalDispatchErrorKey, setCanonicalDispatchErrorKey] =
    useState("");

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const bottomRef = useRef(null);
  const threadSearchInputRef = useRef(null);
  const hasInitialScrolledRef = useRef(false);
  const longPressTimerRef = useRef(null);
  const longPressTouchStartRef = useRef({ x: 0, y: 0 });
  const scheduleSwipeStartRef = useRef({ x: 0, y: 0 });
  const gallerySwipeStartRef = useRef({ x: 0, y: 0 });
  const textareaRef = useRef(null);

  const getLocalizedMessageField = useCallback(
    (message, field) => {
      const key = message?.[`${field}Key`];
      const value = key
        ? t(key, language, message?.[`${field}Variables`] || {})
        : message?.[field] || "";
      const prefix = message?.[`${field}Prefix`];
      return prefix && value ? `${prefix} • ${value}` : value;
    },
    [language]
  );

  const galleryImages = useMemo(
    () =>
      messages
        .filter((message) => Boolean(message.imageUrl))
        .map((message) => ({
          id: String(message.id),
          imageUrl: message.imageUrl,
          alt: message.fileName || getLocalizedMessageField(message, "title") || t("conversationPhoto"),
        })),
    [messages, getLocalizedMessageField]
  );

  const activeGalleryIndex = previewImage
    ? galleryImages.findIndex(
        (image) =>
          image.id === previewImage.id &&
          image.imageUrl === previewImage.imageUrl
      )
    : -1;

  const activeGalleryImage =
    activeGalleryIndex >= 0 ? galleryImages[activeGalleryIndex] : previewImage;

  function openImageGallery(message) {
    if (!message?.imageUrl) return;

    setPreviewImage({
      id: String(message.id),
      imageUrl: message.imageUrl,
      alt: message.fileName || getLocalizedMessageField(message, "title") || t("conversationPhoto"),
    });
  }

  function showGalleryImage(index) {
    const nextImage = galleryImages[index];
    if (nextImage) setPreviewImage(nextImage);
  }

  function handleGallerySwipeStart(event) {
    const touch = event.touches?.[0];
    if (!touch) return;

    gallerySwipeStartRef.current = {
      x: touch.clientX || 0,
      y: touch.clientY || 0,
    };
  }

  function handleGallerySwipeEnd(event) {
    const touch = event.changedTouches?.[0];
    if (!touch || activeGalleryIndex < 0) return;

    const dx = (touch.clientX || 0) - gallerySwipeStartRef.current.x;
    const dy = (touch.clientY || 0) - gallerySwipeStartRef.current.y;

    if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy)) return;

    if (dx < 0) {
      showGalleryImage(activeGalleryIndex + 1);
    } else {
      showGalleryImage(activeGalleryIndex - 1);
    }
  }

  const canonicalRouteContext = parseCanonicalConversationRoute(
    typeof window === "undefined" ? "" : window.location.hash
  );
  const selectedThreadPayload = (() => {
    try {
      return JSON.parse(localStorage.getItem("selectedConversation") || "null");
    } catch {
      return null;
    }
  })();

  const storedConversationType =
    localStorage.getItem("meetroConversationType") || "standard";
  const conversationType = canonicalRouteContext.valid
    ? CONVERSATION_THREAD_TYPES.CANONICAL
    : storedConversationType === CONVERSATION_THREAD_TYPES.CANONICAL
    ? "standard"
    : storedConversationType;
  const isCanonicalThread =
    conversationType === CONVERSATION_THREAD_TYPES.CANONICAL;
  const canonicalConversationId = isCanonicalThread
    ? canonicalRouteContext.conversationId
    : null;
  const conversationId = isCanonicalThread
    ? String(canonicalConversationId || "")
    : localStorage.getItem("activeConversationId") ||
      (canReadLegacyWorkflowStorage() ? "demo-homeowner-1" : "");

  const storageKey = `meetro_conversation_${conversationId}`;
  const readLocalConversationValue = () =>
    canReadLegacyWorkflowStorage() ? localStorage.getItem(storageKey) : null;
  const writeLocalConversationValue = (value) => {
    if (canReadLegacyWorkflowStorage()) {
      localStorage.setItem(storageKey, value);
    }
  };

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

  const isCanonicalEmergencyThread =
    isCanonicalThread &&
    canonicalConversationDetail?.type === "emergency";
  const isEmergencyThread =
    conversationType === "emergency" ||
    isCanonicalEmergencyThread;
  const isHiringThread = isHiringConversationType(conversationType);
  const isRequestOpportunityReadOnly =
    conversationType === CONVERSATION_THREAD_TYPES.REQUEST_OPPORTUNITY;
  const sanitizeMessagesForConversation = (items = []) =>
    isHiringThread ? filterHiringConversationMessages(items) : items;
  const conversationSearchQuery = threadSearchTerm.trim().toLowerCase();

  const threadMessages = useMemo(() => {
    const sourceMessages = sanitizeMessagesForConversation(messages);

    if (!conversationSearchQuery) return sourceMessages;

    return sourceMessages.filter((message) => {
      const values = [
        message?.title,
        message?.subtitle,
        message?.text,
        message?.content,
        message?.type,
        message?.workflowType,
        message?.status,
        message?.senderRole,
        message?.workflowStatus,
        message?.schedule?.appointmentType,
        message?.schedule?.type,
        message?.schedule?.location,
        message?.sender,
      ];

      const hasImage =
        message?.imageUrl || message?.type === "photoWorkflow" || message?.type === "image";

      if (conversationSearchQuery.includes("photo") && hasImage) {
        return true;
      }

      return values
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(conversationSearchQuery);
    });
  }, [messages, isHiringThread, conversationSearchQuery]);

  const hasThreadSearch = Boolean(conversationSearchQuery);

  const activeEmergencyRecord = (() => {
    if (!isEmergencyThread || isCanonicalThread) return {};

    try {
      return JSON.parse(localStorage.getItem("activeEmergencyRecord") || "{}");
    } catch {
      return {};
    }
  })();

  const activeJobSnapshot = isCanonicalThread
    ? null
    : getActiveJobSnapshot();
  const canonicalEmergencyWorkflow =
    isCanonicalEmergencyThread
      ? canonicalConversationDetail.workflow
      : null;
  const canonicalEmergencyAllowedActions =
    canonicalConversationDetail?.permissions
      ?.canManageWorkflow === true
      ? canonicalEmergencyWorkflow?.allowedActions || []
      : [];

  const emergencyDispatchStatus =
    canonicalEmergencyWorkflow?.status ||
    (isEmergencyThread && activeEmergencyRecord.status) ||
    (!isCanonicalThread
      ? localStorage.getItem("emergencyDispatchStatus") ||
        activeJobSnapshot?.status ||
        localStorage.getItem("activeJobStatus") ||
        ""
      : "");

  const hasActiveEmergencyJob =
    isEmergencyThread &&
    Boolean(emergencyDispatchStatus) &&
    !["cancelled", "closed", "archived"].includes(emergencyDispatchStatus);

  const isEmergencyConversation = hasActiveEmergencyJob;

  
useEffect(() => {
    const refreshEmergencyWorkflow = () =>
      setEmergencyWorkflowTick((tick) => tick + 1);

    window.addEventListener(
      "meetroEmergencyConversationUpdated",
      refreshEmergencyWorkflow
    );
    window.addEventListener(
      "meetroDispatchStatusChanged",
      refreshEmergencyWorkflow
    );

    return () => {
      window.removeEventListener(
        "meetroEmergencyConversationUpdated",
        refreshEmergencyWorkflow
      );
      window.removeEventListener(
        "meetroDispatchStatusChanged",
        refreshEmergencyWorkflow
      );
    };
  }, []);

  const advanceEmergencyFromChat = async (nextStatusOrAction) => {
    if (isCanonicalEmergencyThread) {
      const emergencyRequestId =
        canonicalConversationDetail.emergencyRequestId;

      if (
        !emergencyRequestId ||
        canonicalDispatchPending ||
        !canonicalEmergencyAllowedActions.includes(
          nextStatusOrAction
        )
      ) {
        return;
      }

      setCanonicalDispatchPending(true);
      setCanonicalDispatchErrorKey("");

      const result = await transitionEmergencyDispatch(
        emergencyRequestId,
        nextStatusOrAction,
        {
          setPage,
        }
      );

      setCanonicalDispatchPending(false);

      if (!result.ok) {
        setCanonicalDispatchErrorKey(
          "emergencyDispatchUpdateFailed"
        );
        return;
      }

      setCanonicalReloadKey((value) => value + 1);
      return;
    }

    const nextStatus = nextStatusOrAction;
    transitionEmergencyStatus(nextStatus, {
      service: activeJobService || activeName || "Emergency Service",
      businessName: activeBusinessName || "",
      customerName: activeCustomerName || "",
      location: activeLocation || activeEmergencyRecord.location || "",
    });
    setEmergencyWorkflowTick((tick) => tick + 1);
  };


  const emergencyStatusSubtitle = {
    pending:
      t("conversationWaitingForAcceptance", language),

    accepted:
      t("requestAccepted", language),

    assigned:
      t("requestAccepted", language),

    enroute:
      t("professionalOnTheWay", language),

    professional_en_route:
      t("professionalOnTheWay", language),

    arrived:
      t("statusArrived", language),

    professional_arrived:
      t("statusArrived", language),

    started:
      t("workflowNoteWorking", language),

    work_in_progress:
      t("workflowNoteWorking", language),

    completed:
      t("conversationServiceCompleted", language),
  }[emergencyDispatchStatus];

  const emergencyStepIndex = {
    pending: 0,
    accepted: 1,
    assigned: 1,
    enroute: 2,
    professional_en_route: 2,
    arrived: 3,
    professional_arrived: 3,
    started: 4,
    work_in_progress: 4,
    completed: 5,
  }[emergencyDispatchStatus] ?? 1;

  const activeAccountMode =
    localStorage.getItem("activeAccountMode") || "personal";

  const canonicalViewerRole =
    canonicalConversationDetail?.participants?.viewer?.role ===
    "professional"
      ? "business"
      : canonicalConversationDetail?.participants?.viewer?.role ===
        "homeowner"
      ? "homeowner"
      : "";
  const currentViewerRole = isCanonicalThread
    ? canonicalViewerRole || "homeowner"
    : activeAccountMode === "business"
    ? "business"
    : "homeowner";

  useEffect(() => {
    setSavedThreadContactSnapshot(null);
  }, [conversationId, activeAccountMode]);

  const normalizeEmergencySenderRole = (message = {}, fallbackRole = "") => {
    if (message.fromBusiness || message.authorRole === "business") {
      return "business";
    }

    if (message.fromCustomer || message.authorRole === "homeowner") {
      return "homeowner";
    }

    if (
      isEmergencyThread &&
      message.workflowType === "emergency_status" &&
      ["", "system", "professional", "business"].includes(
        String(message.senderRole || message.role || "")
      )
    ) {
      return "business";
    }

    return message.senderRole || fallbackRole;
  };

  const activeJobService =
    activeEmergencyRecord.service ||
    activeEmergencyRecord.title ||
    localStorage.getItem("activeWorkService") ||
    activeJobSnapshot?.service ||
    localStorage.getItem("activeJobService") ||
    localStorage.getItem("selectedEmergencyService") ||
    "";

  const activeName = isEmergencyConversation
    ? activeJobService ||
      localStorage.getItem("activeConversationName") ||
      (t("messagesSectionEmergency", language))
    : conversationBusinessName ||
      localStorage.getItem("activeConversationName") ||
      (t("conversationMeetroBusiness", language));

  const activeCategory =
    canonicalConversationDetail?.participants?.business?.category ||
    selectedBusiness?.category ||
    selectedBusiness?.businessCategory ||
    "";

  const activeLocation =
    canonicalConversationDetail?.location?.locationText ||
    selectedBusiness?.location ||
    selectedBusiness?.address ||
    "";

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

  const selectedHomeownerRequest = (() => {
    try {
      return JSON.parse(localStorage.getItem("selectedHomeownerRequest") || "null");
    } catch {
      return null;
    }
  })();

  const selectedConversation = selectedThreadPayload;

  const selectedHomeownerRequestId =
    localStorage.getItem("selectedHomeownerRequestId") || "";

  const conversationRegistryItem = getConversationRegistry().find(
    (item) =>
      String(item.id || item.conversationId || "") === String(conversationId)
  );
  const threadUserSavedToHistory = isConversationUserSavedToHistory({
    ...(conversationRegistryItem || {}),
    ...(selectedQuoteRequest || {}),
    id: conversationId,
    conversationId,
  });

  const conversationMeta = (() => {
    try {
      return JSON.parse(
        localStorage.getItem(`meetro_conversation_meta_${conversationId}`) || "{}"
      );
    } catch {
      return {};
    }
  })();

  const conversationIdentityInput = buildConversationIdentityInput({
    conversationId,
    registryEntry: conversationRegistryItem,
    meta: conversationMeta,
    selectedConversation,
    selectedQuoteRequest,
    selectedHomeownerRequest,
    selectedContractor: selectedBusiness,
    activeEmergencyRecord,
    activeJob: activeJobSnapshot,
    conversationBusinessName,
    localFallbacks: {
      activeConversationId: localStorage.getItem("activeConversationId") || "",
      activeConversationName: localStorage.getItem("activeConversationName") || "",
      activeCustomerLocation: localStorage.getItem("activeCustomerLocation") || "",
      projectLocation: localStorage.getItem("projectLocation") || "",
      conversationBusinessName: localStorage.getItem("conversationBusinessName") || "",
      businessName: localStorage.getItem("businessName") || "",
    },
  });

  const {
    linkedSelectedConversation: conversationLinkedSelectedConversation,
    linkedQuoteRequest: conversationLinkedQuoteRequest,
    linkedHomeownerRequest: conversationLinkedHomeownerRequest,
    conversationCustomerIdentity,
    requestCustomerIdentity,
    resolvedCustomerIdentity,
    customerProjectionInput,
    businessProjectionInput,
    hiring,
  } = conversationIdentityInput;

  const hiringPositionTitle = hiring.positionTitle;
  const hiringParticipantName = hiring.participantName;
  const hiringBusinessName = hiring.businessName;

  const projectedCustomerConversationIdentity =
    getPersonConversationIdentity(customerProjectionInput);

  const projectedConversationBusinessIdentity =
    getBusinessConversationIdentity(businessProjectionInput);
  const conversationBusinessIdentity = {
    name: projectedConversationBusinessIdentity.displayName,
    avatar: projectedConversationBusinessIdentity.avatar,
  };

  const activeCustomerName = isCanonicalThread
    ? canonicalConversationDetail?.participants?.homeowner?.displayName ||
      t("messagesContactType_customer", language)
    : activeEmergencyRecord.customerName ||
      projectedCustomerConversationIdentity.displayName;

  const activeBusinessName = isCanonicalThread
    ? canonicalConversationDetail?.participants?.business?.name ||
      t("messagesOwnerProfessional", language)
    : activeEmergencyRecord.businessName ||
      conversationBusinessIdentity.name ||
      conversationLinkedQuoteRequest?.businessName ||
      conversationLinkedQuoteRequest?.business_name ||
      conversationLinkedQuoteRequest?.contractorName ||
      conversationLinkedQuoteRequest?.providerName ||
      localStorage.getItem("businessName") ||
      localStorage.getItem("companyName") ||
      activeName;

  const emergencyServiceName = isCanonicalEmergencyThread
    ? canonicalConversationDetail?.relationship?.title ||
      t("messagesEmergencyService", language)
    : activeEmergencyRecord.service ||
      activeEmergencyRecord.title ||
      activeJobService ||
      localStorage.getItem("selectedEmergencyService") ||
      t("messagesEmergencyService", language);

  const emergencyCustomerName = isCanonicalEmergencyThread
    ? canonicalConversationDetail?.participants?.homeowner?.displayName ||
      t("messagesContactType_customer", language)
    : activeEmergencyRecord.customerName ||
      localStorage.getItem("emergencyCustomerName") ||
      localStorage.getItem("homeownerName") ||
      localStorage.getItem("userName") ||
      t("messagesContactType_customer", language);

  const emergencyBusinessName = isCanonicalEmergencyThread
    ? canonicalConversationDetail?.participants?.business?.name ||
      t("messagesOwnerProfessional", language)
    : activeEmergencyRecord.businessName ||
      localStorage.getItem("emergencyBusinessName") ||
      localStorage.getItem("selectedEmergencyBusiness") ||
      localStorage.getItem("businessName") ||
      t("messagesOwnerProfessional", language);

  const emergencyBusinessPhone = isCanonicalThread
    ? ""
    : activeEmergencyRecord.businessPhone ||
      localStorage.getItem("emergencyBusinessPhone") ||
      localStorage.getItem("businessEmergencyPhone") ||
      localStorage.getItem("businessPhone") ||
      localStorage.getItem("contractorPhone") ||
      "";

  const normalizeContactKey = (value) => String(value || "").trim().toLowerCase();

  const readScopedHomeownerPrivatePhone = () => {
    const customerKeys = [
      conversationCustomerIdentity.name,
      requestCustomerIdentity.name,
      resolvedCustomerIdentity.name,
      conversationRegistryItem?.homeowner_email,
      conversationRegistryItem?.customerEmail,
      conversationMeta?.homeowner_email,
      conversationMeta?.customerEmail,
      conversationLinkedSelectedConversation?.homeowner_email,
      conversationLinkedSelectedConversation?.customerEmail,
      conversationLinkedQuoteRequest?.homeowner_email,
      conversationLinkedQuoteRequest?.customerEmail,
      conversationLinkedHomeownerRequest?.homeowner_email,
      conversationLinkedHomeownerRequest?.customerEmail,
    ]
      .map(normalizeContactKey)
      .filter(Boolean);

    const scopedPhone = customerKeys
      .map((key) => localStorage.getItem(`meetroHomeownerPrivatePhone:${key}`))
      .find((phone) => String(phone || "").trim());

    if (scopedPhone) return scopedPhone;

    const ownerKeys = [
      localStorage.getItem("meetroHomeownerPrivatePhoneOwnerName"),
      localStorage.getItem("meetroHomeownerPrivatePhoneOwnerEmail"),
    ]
      .map(normalizeContactKey)
      .filter(Boolean);

    const ownerMatchesConversation = ownerKeys.some((key) =>
      customerKeys.includes(key)
    );

    return ownerMatchesConversation
      ? localStorage.getItem("meetroHomeownerPrivatePhone") ||
          localStorage.getItem("homeownerPrivatePhone") ||
          ""
      : "";
  };

  const customerCallPhone = firstIdentityValue(
    conversationRegistryItem?.customerPhone,
    conversationRegistryItem?.homeownerPhone,
    conversationMeta?.customerPhone,
    conversationMeta?.homeownerPhone,
    conversationLinkedSelectedConversation?.customerPhone,
    conversationLinkedSelectedConversation?.homeownerPhone,
    conversationLinkedQuoteRequest?.customerPhone,
    conversationLinkedQuoteRequest?.homeownerPhone,
    conversationLinkedHomeownerRequest?.customerPhone,
    conversationLinkedHomeownerRequest?.homeownerPhone,
    activeJobSnapshot?.conversationId === conversationId
      ? activeJobSnapshot?.customerPhone
      : "",
    readScopedHomeownerPrivatePhone()
  );

  const businessCallPhone = firstIdentityValue(
    activeEmergencyRecord.businessPhone,
    conversationRegistryItem?.businessPhone,
    conversationRegistryItem?.providerPhone,
    conversationMeta?.businessPhone,
    conversationMeta?.providerPhone,
    conversationLinkedSelectedConversation?.businessPhone,
    conversationLinkedSelectedConversation?.providerPhone,
    conversationLinkedQuoteRequest?.businessPhone,
    conversationLinkedQuoteRequest?.providerPhone,
    conversationLinkedHomeownerRequest?.businessPhone,
    conversationLinkedHomeownerRequest?.providerPhone,
    localStorage.getItem("conversationBusinessPhone"),
    localStorage.getItem("businessPhone"),
    localStorage.getItem("contractorPhone")
  );

  const activeCallPhone = isEmergencyThread
    ? emergencyBusinessPhone
    : isHiringThread
    ? ""
    : currentViewerRole === "business"
    ? customerCallPhone
    : businessCallPhone;
  const hasActiveCallPhone = Boolean(String(activeCallPhone || "").trim());

  function callActiveContact() {
    const phoneNumber = String(activeCallPhone || "").trim();

    if (!phoneNumber) {
      alert(
        t("conversationNoPhoneNumberHasBeenAddedForThisContact", language)
      );
      return;
    }

    window.location.href = phoneNumber.startsWith("tel:")
      ? phoneNumber
      : `tel:${phoneNumber}`;
  }

  function textActiveContact() {
    const phoneNumber = String(activeCallPhone || "").trim();

    if (!phoneNumber) {
      alert(
        t("conversationNoPhoneNumberHasBeenAddedForThisContact", language)
      );
      return;
    }

    window.location.href = phoneNumber.startsWith("sms:")
      ? phoneNumber
      : `sms:${phoneNumber}`;
  }

  function emailActiveContact() {
    const email = String(relationshipContactEmail || "").trim();

    if (!email) {
      alert(
        t("conversationNoEmailAddressHasBeenAddedForThisContact", language)
      );
      return;
    }

    window.location.href = `mailto:${email}?subject=${encodeURIComponent(
      `Message for ${activeHeaderName}`
    )}`;
  }

  function openRelationshipDetails() {
    setShowCallMenu(false);
    setShowThreadMenu(false);
    setShowAttachMenu(false);
    setActiveMessageId(null);
    setShowMobileSheet(false);
    setShowJobRecords(false);
    setShowProfileCard(true);
  }

  const activeRole =
    localStorage.getItem("activeAccountMode") || "personal";

  const canonicalParticipantName =
    currentViewerRole === "business"
      ? canonicalConversationDetail?.participants?.homeowner?.displayName
      : canonicalConversationDetail?.participants?.business?.name;

  const activeHeaderName = isCanonicalThread && canonicalParticipantName
    ? canonicalParticipantName
    : isEmergencyThread
    ? currentViewerRole === "business"
      ? emergencyCustomerName
      : emergencyBusinessName
    : isHiringThread
    ? currentViewerRole === "business"
      ? hiringParticipantName || "Applicant"
      : hiringBusinessName || activeBusinessName
    : currentViewerRole === "business"
    ? activeCustomerName
    : activeBusinessName;

  const activeHeaderProject =
    isCanonicalThread && canonicalConversationDetail?.relationship?.title
      ? canonicalConversationDetail.relationship.title
      : isEmergencyThread
    ? emergencyServiceName
    : isHiringThread
    ? hiringPositionTitle || (t("position", language))
    : firstIdentityValue(
      conversationRegistryItem?.project_title,
      conversationRegistryItem?.projectTitle,
      conversationMeta?.projectTitle,
      conversationLinkedSelectedConversation?.projectTitle,
      conversationLinkedSelectedConversation?.project_title
    ) ||
      (t("conversationProjectConversation", language));

  const activeWorkConversationId = localStorage.getItem("activeWorkConversationId") || "";
  const isActiveWorkLinkedToConversation =
    Boolean(activeWorkConversationId) &&
    String(activeWorkConversationId) === String(conversationId);

  const activeProjectStage =
    conversationLinkedQuoteRequest?.status ||
    conversationLinkedQuoteRequest?.workflowStage ||
    conversationLinkedQuoteRequest?.stage ||
    (isActiveWorkLinkedToConversation
      ? localStorage.getItem("activeWorkStage") ||
        localStorage.getItem("activeWorkStatus")
      : "") ||
    (activeJobSnapshot?.conversationId === conversationId
      ? localStorage.getItem("activeJobStatus")
      : "") ||
    "";

  const activeProjectStageLabel = (() => {
    if (isEmergencyThread) {
      return t("emergencyDispatch", language);
    }

    if (isHiringThread) {
      return t("messagesSectionHiring", language);
    }

    const stage = String(activeProjectStage || "").toLowerCase();

    if (stage.includes("quote") || stage.includes("quoted")) {
      return t("assistantProjectBriefDocumentQuote", language);
    }

    if (stage.includes("schedule") || stage.includes("visit")) {
      return t("workCenterScheduleTitle", language);
    }

    if (stage.includes("accepted")) {
      return t("accepted", language);
    }

    if (stage.includes("active") || stage.includes("working")) {
      return t("activeJob", language);
    }

    if (stage.includes("completed")) {
      return t("momentDetailJourney_completed", language);
    }

    if (stage.includes("revision")) {
      return t("workCenterRevision", language);
    }

    if (stage.includes("materials")) {
      return t("workStageMaterials", language);
    }

    return t("conversationProjectConversation", language);
  })();

  const openReviewProjectFromMessage = (messageRecord = {}) => {
    captureConversationOriginContext({
      sourcePage: "conversationThread",
      workspace: "projectDetails",
      viewerRole: currentViewerRole,
    });

    const fallbackContext =
      conversationLinkedQuoteRequest ||
      conversationLinkedHomeownerRequest ||
      selectedQuoteRequest ||
      selectedHomeownerRequest ||
      activeJobSnapshot ||
      {};

    const reviewContext = { ...fallbackContext, ...(messageRecord || {}) };

    const requestId =
      reviewContext.requestId ||
      reviewContext.id ||
      reviewContext.quoteRequestId ||
      selectedHomeownerRequestId ||
      conversationId;

    const projectTitle = firstIdentityValue(
      reviewContext.projectTitle,
      reviewContext.title,
      reviewContext.service,
      reviewContext.category,
      activeProjectTitle,
      activeHeaderProject,
      t("project", language)
    );

    const professionalName = firstIdentityValue(
      reviewContext.businessName,
      reviewContext.providerName,
      activeBusinessName,
      activeName,
      activeHeaderName
    );

    const requestPayload = {
      ...reviewContext,
      requestId,
      title: projectTitle,
      projectTitle,
      service: reviewContext.service || reviewContext.category || "",
      conversationId,
    };

    localStorage.setItem("selectedHomeownerRequestId", String(requestId));
    localStorage.setItem("selectedHomeownerRequest", JSON.stringify(requestPayload));
    localStorage.setItem("selectedQuoteRequest", JSON.stringify(requestPayload));
    localStorage.setItem("activeConversationId", String(conversationId));
    localStorage.setItem("activeConversationName", professionalName || activeName || "");
    localStorage.setItem("activeProjectTitle", projectTitle);
    localStorage.setItem("meetroConversationType", conversationType || "standard");

    const selectedConversationPayload = {
      id: conversationId,
      requestId,
      type: isHiringThread ? "hiring" : conversationType || "standard",
      category: isHiringThread ? "hiring" : "work",
      businessName: professionalName || activeBusinessName || "",
      projectTitle,
      ...reviewContext,
    };

    localStorage.setItem(
      "selectedConversation",
      JSON.stringify(selectedConversationPayload)
    );
    localStorage.setItem("conversationReturnPage", "conversationThread");
    localStorage.setItem("returnPage", "conversationThread");
    localStorage.setItem("projectDetailsReturnPage", "conversationThread");

    setPage("projectDetails");
  };

  const displayCategory =
    isHiringThread
      ? t("messagesSectionHiring", language)
      :
    currentViewerRole === "business"
      ? t("messagesContactType_customer", language)
      : activeCategory || (t("messagesOwnerProfessional", language));

  const displayLocation =
    isHiringThread
      ? hiringPositionTitle
      :
    currentViewerRole === "business"
      ? resolvedCustomerIdentity.location
      : activeLocation;

  const relationshipIdentityType = (() => {
    const labels = {
      customer: { en: "Customer", es: "Cliente", fr: "Client", "pt-BR": "Cliente" },
      professional: { en: "Professional", es: "Profesional", fr: "Professionnel", "pt-BR": "Profissional" },
      vendor: { en: "Vendor", es: "Proveedor", fr: "Fournisseur", "pt-BR": "Fornecedor" },
      employee: { en: "Employee", es: "Empleado", fr: "Employé", "pt-BR": "Funcionário" },
      tenant: { en: "Tenant", es: "Inquilino", fr: "Locataire", "pt-BR": "Inquilino" },
      propertyManager: {
        en: "Property Manager",
        es: "Administrador de propiedad",
        fr: "Gestionnaire immobilier",
        "pt-BR": "Administrador de propriedade",
      },
      business: { en: "Business", es: "Negocio", fr: "Entreprise", "pt-BR": "Empresa" },
    };
    const labelFor = (key) => labels[key]?.[language] || labels[key]?.en || labels.customer.en;
    const rawType = String(
      conversationRegistryItem?.relationshipType ||
        conversationRegistryItem?.relationship_type ||
        conversationMeta?.relationshipType ||
        selectedConversation?.relationshipType ||
        selectedQuoteRequest?.relationshipType ||
        ""
    ).toLowerCase();

    if (rawType.includes("tenant")) return labelFor("tenant");
    if (rawType.includes("propertymanager") || rawType.includes("property_manager")) {
      return labelFor("propertyManager");
    }
    if (rawType.includes("employee")) return labelFor("employee");
    if (rawType.includes("vendor")) return labelFor("vendor");
    if (rawType.includes("professional")) return labelFor("professional");
    if (rawType.includes("business")) return labelFor("business");
    if (rawType.includes("customer")) return labelFor("customer");

    if (isHiringThread) return labelFor("employee");
    return currentViewerRole === "business" ? labelFor("customer") : labelFor("professional");
  })();
  const relationshipIdentityActionLabel = t("viewRelationshipIdentity", language, {
    type: relationshipIdentityType,
  });

  const relationshipDetailSource = isCanonicalThread
    ? {
        projectTitle:
          canonicalConversationDetail?.relationship?.title || "",
        title:
          canonicalConversationDetail?.relationship?.title || "",
        status:
          canonicalConversationDetail?.workflow?.status ||
          canonicalConversationDetail?.status ||
          "",
        location:
          canonicalConversationDetail?.location?.locationText || "",
        customerName:
          canonicalConversationDetail?.participants?.homeowner
            ?.displayName || "",
        businessName:
          canonicalConversationDetail?.participants?.business?.name ||
          "",
      }
    : {
        ...conversationRegistryItem,
        ...conversationMeta,
        ...conversationLinkedSelectedConversation,
        ...conversationLinkedHomeownerRequest,
        ...conversationLinkedQuoteRequest,
        ...selectedConversation,
        ...selectedHomeownerRequest,
        ...selectedQuoteRequest,
        ...(activeJobSnapshot?.conversationId === conversationId
          ? activeJobSnapshot
          : {}),
      };

  const scopedBusinessProfilePhoto = getScopedProfilePhoto(
    "business",
    selectedBusiness || {}
  );
  const scopedConversationBusinessPhoto = getScopedProfilePhoto(
    "business",
    relationshipDetailSource
  );
  const scopedPersonalProfilePhoto = getPersonalProfilePhotoForRecord(
    relationshipDetailSource
  );

  const resolvedActiveLogo =
    isCanonicalThread && currentViewerRole !== "business"
      ? canonicalConversationDetail?.participants?.business?.imageUrl || ""
      : currentViewerRole === "business"
      ? scopedPersonalProfilePhoto || projectedCustomerConversationIdentity.avatar
      : scopedConversationBusinessPhoto ||
        conversationBusinessIdentity.avatar ||
        scopedBusinessProfilePhoto ||
        "";
  const threadRelationshipIdentity = resolveRelationshipIdentity({
    record: relationshipDetailSource,
    identity: {
      displayName: activeHeaderName,
      typeLabel: relationshipIdentityType,
      avatar: resolvedActiveLogo,
    },
    viewerRole: currentViewerRole,
    isLinked: true,
    typeLabel: relationshipIdentityType,
    meta: displayCategory || relationshipIdentityType,
    location: displayLocation,
    status: t("relationshipMeetroLinked", language),
  });
  const activeLogo = threadRelationshipIdentity.avatar;

  const relationshipContactEmail = firstIdentityValue(
    relationshipDetailSource.customerEmail,
    relationshipDetailSource.homeownerEmail,
    relationshipDetailSource.homeowner_email,
    relationshipDetailSource.businessEmail,
    relationshipDetailSource.providerEmail,
    relationshipDetailSource.email
  );

  const relationshipStreetAddress = firstIdentityValue(
    relationshipDetailSource.serviceAddress,
    relationshipDetailSource.fullServiceAddress,
    relationshipDetailSource.fullAddress,
    relationshipDetailSource.address
  );
  const relationshipServiceArea = firstIdentityValue(
    displayLocation,
    relationshipDetailSource.serviceArea,
    relationshipDetailSource.service_area,
    relationshipDetailSource.location,
    relationshipDetailSource.customerLocation,
    relationshipDetailSource.customer_location
  );
  const relationshipContactLocationFact = relationshipStreetAddress
    ? {
        label: t("relationshipAddress", language),
        value: relationshipStreetAddress,
        span: "wide",
      }
    : {
        label: t("relationshipServiceArea", language),
        value: relationshipServiceArea,
        span: "wide",
      };

  const relationshipContactRows = [
    {
      label: t("relationshipPhone", language),
      value: activeCallPhone,
    },
    {
      label: t("relationshipEmail", language),
      value: relationshipContactEmail,
    },
    relationshipContactLocationFact,
  ].filter((item) => String(item.value || "").trim());

  function normalizeSavedContactMatchKey(value = "") {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function normalizeSavedContactPhone(value = "") {
    return String(value || "").replace(/[^\d+]/g, "");
  }

  function getThreadContactScope() {
    return activeAccountMode === "business" ? "business" : "personal";
  }

  function getThreadContactProfileId() {
    return getActiveProfileScopeDescriptor({ activeAccountMode }).profileId;
  }

  function getThreadContactProfileScopeKey() {
    return getActiveProfileScopeDescriptor({ activeAccountMode }).profileScopeKey;
  }

  function getSavedContactRecordScope(record = {}) {
    return getRecordContactScope(record);
  }

  function getSavedContactProfileScopeKey(record = {}) {
    return getRecordProfileScopeKey(record);
  }

  function recordMatchesThreadContactScope(record = {}) {
    const recordScope = getSavedContactRecordScope(record);
    const targetScope = getThreadContactScope();

    if (!recordScope || recordScope !== targetScope) return false;

    const recordProfileScopeKey = getSavedContactProfileScopeKey(record);
    const targetProfileScopeKey = normalizeProfileScopeKey(
      getThreadContactProfileScopeKey()
    );

    if (recordProfileScopeKey || targetProfileScopeKey) {
      return recordProfileScopeKey === targetProfileScopeKey;
    }

    return true;
  }

  function getThreadRelationshipLinkedId(contactType = getSavedThreadContactType()) {
    const genericLinkedId = firstIdentityValue(
      relationshipDetailSource.linkedMeetroAccountId,
      relationshipDetailSource.linked_meetro_account_id,
      relationshipDetailSource.meetroAccountId,
      relationshipDetailSource.meetro_account_id
    );
    const businessLinkedId = firstIdentityValue(
      relationshipDetailSource.businessId,
      relationshipDetailSource.business_id,
      relationshipDetailSource.professionalId,
      relationshipDetailSource.professional_id,
      relationshipDetailSource.providerId,
      relationshipDetailSource.provider_id,
      relationshipDetailSource.contractorId,
      relationshipDetailSource.contractor_id,
      selectedBusiness?.id
    );
    const personLinkedId = firstIdentityValue(
      relationshipDetailSource.customerId,
      relationshipDetailSource.customer_id,
      relationshipDetailSource.homeownerId,
      relationshipDetailSource.homeowner_id,
      relationshipDetailSource.userId,
      relationshipDetailSource.user_id
    );

    if (["business", "professional", "vendor"].includes(contactType)) {
      return firstIdentityValue(businessLinkedId, genericLinkedId);
    }
    if (["customer", "tenant", "employee", "propertyManager"].includes(contactType)) {
      return firstIdentityValue(personLinkedId, genericLinkedId);
    }

    return firstIdentityValue(
      currentViewerRole === "business" ? personLinkedId : businessLinkedId,
      genericLinkedId
    );
  }

  function getSavedThreadContactRecord() {
    const contactType = getSavedThreadContactType();
    const linkedId = normalizeSavedContactMatchKey(
      getThreadRelationshipLinkedId(contactType)
    );
    const email = normalizeSavedContactMatchKey(relationshipContactEmail);
    const phone = normalizeSavedContactPhone(activeCallPhone);
    const contactRecords = getConversationRegistry().filter(
      (record) =>
        record &&
        typeof record === "object" &&
        (record.contactImported === true || record.savedToContacts === true) &&
        recordMatchesThreadContactScope(record)
    );

    const getRecordLinkedId = (record = {}) =>
      normalizeSavedContactMatchKey(
        firstIdentityValue(
          record.linkedMeetroAccountId,
          record.linked_meetro_account_id,
          record.meetroAccountId,
          record.meetro_account_id,
          record.businessId,
          record.business_id,
          record.professionalId,
          record.professional_id,
          record.providerId,
          record.provider_id,
          record.contractorId,
          record.contractor_id,
          record.customerId,
          record.customer_id,
          record.homeownerId,
          record.homeowner_id,
          record.userId,
          record.user_id
        )
      );

    if (linkedId) {
      const linkedMatch = contactRecords.find(
        (record) => getRecordLinkedId(record) === linkedId
      );

      if (linkedMatch) return linkedMatch;
    }

    return contactRecords.find((record) => {
      const recordEmail = normalizeSavedContactMatchKey(
        firstIdentityValue(record.email, record.businessEmail, record.customerEmail)
      );
      const recordPhone = normalizeSavedContactPhone(
        firstIdentityValue(record.phone, record.businessPhone, record.customerPhone)
      );

      return Boolean(
        (email && recordEmail && email === recordEmail) ||
          (phone && recordPhone && phone === recordPhone)
      );
    });
  }

  function getSavedThreadContactType() {
    const rawType = String(
      relationshipDetailSource.relationshipType ||
        relationshipDetailSource.relationship_type ||
        relationshipIdentityType ||
        ""
    ).toLowerCase();

    if (/tenant|inquilino|locataire/.test(rawType)) return "tenant";
    if (/property/.test(rawType)) return "propertyManager";
    if (/employee|applicant|hiring/.test(rawType)) return "employee";
    if (/vendor|supplier|subcontractor|proveedor|fournisseur/.test(rawType)) {
      return "vendor";
    }
    if (/business|empresa|entreprise/.test(rawType)) return "business";
    if (/customer|cliente|client/.test(rawType)) return "customer";

    return currentViewerRole === "business" ? "customer" : "professional";
  }

  function getSavedThreadContactNameField(type) {
    return {
      business: "businessName",
      customer: "customerName",
      employee: "employeeName",
      propertyManager: "propertyManagerName",
      tenant: "tenantName",
      vendor: "vendorName",
      professional: "professionalName",
    }[type] || "participantName";
  }

  function getSavedThreadContactLabel(type) {
    return {
      business: "Professional / Business",
      customer: "Customer",
      employee: "Employee",
      propertyManager: "Property Manager",
      tenant: "Tenant",
      vendor: "Professional / Business",
      professional: "Professional / Business",
    }[type] || "Contact";
  }

  const savedThreadContactRecord =
    savedThreadContactSnapshot || getSavedThreadContactRecord();
  const threadRelationshipSavedToContacts = Boolean(savedThreadContactRecord);

  function saveThreadRelationshipToContacts() {
    const existingRecord = savedThreadContactRecord || getSavedThreadContactRecord();
    const contactName = firstIdentityValue(
      threadRelationshipIdentity.displayName,
      activeHeaderName,
      activeBusinessName,
      relationshipDetailSource.businessName,
      relationshipDetailSource.providerName,
      relationshipDetailSource.professionalName,
      relationshipDetailSource.participantName,
      relationshipDetailSource.customerName,
      relationshipDetailSource.homeownerName
    );

    if (!contactName) {
      setShowThreadMenu(false);
      setSaveNotice(
        t("conversationNoContactNameWasAvailableToSave", language)
      );
      setTimeout(() => setSaveNotice(""), 2200);
      return;
    }

    const contactType = getSavedThreadContactType();
    const contactScope = getThreadContactScope();
    const contactProfileId = getThreadContactProfileId();
    const contactProfileScopeKey = getThreadContactProfileScopeKey();
    const linkedId = getThreadRelationshipLinkedId(contactType);
    const identityField = getSavedThreadContactNameField(contactType);
    const contactLabel = getSavedThreadContactLabel(contactType);
    const contactSeed = normalizeSavedContactMatchKey(
      firstIdentityValue(linkedId, relationshipContactEmail, activeCallPhone, contactName, conversationId)
    ) || String(Date.now());
    const relationshipSeed = firstIdentityValue(
      relationshipDetailSource.relationshipId,
      relationshipDetailSource.relationship_id,
      linkedId,
      `${contactType}:${contactName}`
    );
    const savedAt = new Date().toISOString();
    const linkedIdentityFields = ["business", "professional", "vendor"].includes(contactType)
      ? {
          ...(linkedId
            ? {
                businessId: linkedId,
                business_id: linkedId,
                professionalId: linkedId,
                professional_id: linkedId,
                providerId: linkedId,
                provider_id: linkedId,
              }
            : {}),
          businessPhone: activeCallPhone,
          providerPhone: activeCallPhone,
          businessEmail: relationshipContactEmail,
          providerEmail: relationshipContactEmail,
        }
      : {
          ...(linkedId
            ? {
                customerId: linkedId,
                customer_id: linkedId,
                homeownerId: linkedId,
                homeowner_id: linkedId,
                userId: linkedId,
                user_id: linkedId,
              }
            : {}),
          customerPhone: activeCallPhone,
          homeownerPhone: activeCallPhone,
          customerEmail: relationshipContactEmail,
          homeownerEmail: relationshipContactEmail,
        };

    const savedContactRecord = {
      ...(existingRecord || {}),
      ...linkedIdentityFields,
      id:
        existingRecord?.id ||
        `saved-contact-${normalizeSavedContactMatchKey(contactProfileScopeKey)}-${contactType}-${contactSeed}`,
      relationshipId: existingRecord?.relationshipId || relationshipSeed,
      relationshipType: existingRecord?.relationshipType || contactType,
      relationshipScope: contactScope,
      relationship_scope: contactScope,
      accountMode: contactScope,
      account_mode: contactScope,
      ownerProfileType: contactScope,
      owner_profile_type: contactScope,
      ownerProfileId: contactProfileId,
      owner_profile_id: contactProfileId,
      ownerProfileScopeKey: contactProfileScopeKey,
      owner_profile_scope_key: contactProfileScopeKey,
      contactProfileScopeKey,
      contact_profile_scope_key: contactProfileScopeKey,
      profileScopeKey: contactProfileScopeKey,
      profile_scope_key: contactProfileScopeKey,
      [identityField]: contactName,
      participantName: contactName,
      displayName: contactName,
      project_title: contactName,
      project_description: "Saved from conversation.",
      homeowner_email: relationshipContactEmail || contactName,
      phone: activeCallPhone,
      email: relationshipContactEmail,
      address: relationshipStreetAddress,
      location: relationshipStreetAddress || relationshipServiceArea || displayLocation,
      serviceArea: relationshipServiceArea,
      status: "Saved contact",
      currentWorkStatus: "Saved contact",
      contactImportType: contactType === "professional" ? "vendor" : contactType,
      contactImportLabel: contactLabel,
      contactImported: true,
      savedToContacts: true,
      meetroAccountLinked: true,
      linkedMeetroAccountId: linkedId,
      sourceConversationId: conversationId,
      conversation_type: "standard",
      participantAvatar: activeLogo,
      profilePhoto: activeLogo,
      businessProfilePhoto:
        ["business", "professional", "vendor"].includes(contactType) ? activeLogo : "",
      businessLogo:
        ["business", "professional", "vendor"].includes(contactType) ? activeLogo : "",
      contactPhoto:
        ["business", "professional", "vendor"].includes(contactType) ? "" : activeLogo,
      savedAt,
      updatedAt: savedAt,
      unread: false,
    };

    try {
      const compactSavedContactRecord = compactScopedContactRecord(savedContactRecord);
      upsertProfileScopedContact(compactSavedContactRecord, {
        profileScopeKey: contactProfileScopeKey,
      });
      try {
        const registry = getConversationRegistry();
        const updatedRegistry = [
          compactSavedContactRecord,
          ...registry.filter((record) => String(record.id) !== String(compactSavedContactRecord.id)),
        ];

        localStorage.setItem(
          "meetro_conversation_registry",
          JSON.stringify(updatedRegistry)
        );
        writeUnreadConversationCount(updatedRegistry);
      } catch (registryError) {
        console.warn("Saved contact store updated; registry mirror failed", registryError);
      }
      setSavedThreadContactSnapshot(compactSavedContactRecord);
      window.dispatchEvent(new Event("meetro-messages-updated"));

      setShowThreadMenu(false);
      setSaveNotice(
        t("conversationSavedToContacts", language)
      );
    } catch (error) {
      console.error("Save to Contacts failed", error);
      setShowThreadMenu(false);
      setSaveNotice(
        t("conversationCouldNotSaveToContactsPleaseTryAgain", language)
      );
    }
    setTimeout(() => setSaveNotice(""), 2200);
  }

  const activeProjectStageText = String(
    activeProjectStage ||
      relationshipDetailSource.status ||
      relationshipDetailSource.workflowStage ||
      relationshipDetailSource.stage ||
      ""
  ).toLowerCase();

  const isTerminalRelationshipWork =
    activeProjectStageText.includes("completed") ||
    activeProjectStageText.includes("closed") ||
    activeProjectStageText.includes("archived") ||
    activeProjectStageText.includes("cancelled") ||
    activeProjectStageText.includes("deleted");

  const relationshipHasCurrentWork =
    !isTerminalRelationshipWork &&
    Boolean(
      hasActiveEmergencyJob ||
        isActiveWorkLinkedToConversation ||
        activeJobSnapshot?.conversationId === conversationId ||
        conversationLinkedQuoteRequest ||
        conversationLinkedHomeownerRequest ||
        messages.some((message) =>
          ["schedule", "schedule-update", "quote", "workflow_quote"].includes(
            String(message?.type || message?.workflowType || "").toLowerCase()
          )
        )
    );
  const relationshipIdentityFactRows = [
    {
      label: t("relationshipType", language),
      value: relationshipIdentityType,
    },
    {
      label: t("relationshipMeetroStatus", language),
      value: t("relationshipMeetroLinked", language),
    },
    {
      label: t("relationshipPhone", language),
      value: activeCallPhone,
    },
    {
      label: t("relationshipEmail", language),
      value: relationshipContactEmail,
      span: "wide",
    },
    relationshipContactLocationFact,
  ].filter((item) => String(item.value || "").trim());

  const relationshipCurrentWorkItems = relationshipHasCurrentWork
    ? [
        {
          title:
            activeHeaderProject ||
            relationshipDetailSource.projectTitle ||
            relationshipDetailSource.title ||
            t("project", language),
          meta: activeProjectStageLabel,
        },
      ]
    : [];

  const relationshipCompletedWorkItems = (() => {
    const completedRecords = jobRecords
      .filter((item) => {
        const value = String(
          item.status || item.type || item.workflowType || item.title || ""
        ).toLowerCase();

        return (
          value.includes("completion") ||
          value.includes("completed") ||
          value.includes("closed") ||
          value.includes("history")
        );
      })
      .slice(0, 3)
      .map((item) => ({
        title: item.title || activeHeaderProject || t("project", language),
        meta: item.subtitle || item.time || "",
      }));

    if (completedRecords.length > 0) return completedRecords;

    if (!isTerminalRelationshipWork) return [];

    return [
      {
        title:
          activeHeaderProject ||
          relationshipDetailSource.projectTitle ||
          relationshipDetailSource.title ||
          t("project", language),
        meta: activeProjectStageLabel,
      },
    ];
  })();

  const relationshipInvoiceItems = messages
    .filter((message) => {
      const value = String(
        message?.type || message?.workflowType || message?.documentType || ""
      ).toLowerCase();

      return (
        value.includes("invoice") ||
        value.includes("receipt") ||
        Boolean(message?.invoice || message?.receipt)
      );
    })
    .slice(-3)
    .reverse()
    .map((message) => ({
      title:
        getLocalizedMessageField(message, "title") ||
        message.receipt?.service ||
        message.invoice?.service ||
        t("documentReceipt", language),
      meta:
        getLocalizedMessageField(message, "subtitle") ||
        message.receipt?.total ||
        message.invoice?.total ||
        message.time ||
        "",
    }));

  const relationshipDocumentItems = [...jobRecords, ...messages]
    .filter((item) => {
      const value = String(
        item?.type || item?.workflowType || item?.documentType || ""
      ).toLowerCase();

      return (
        Boolean(item?.imageUrl || item?.fileName) ||
        value.includes("photo") ||
        value.includes("scan") ||
        value.includes("document")
      );
    })
    .slice(0, 4)
    .map((item) => ({
      title:
        getLocalizedMessageField(item, "title") ||
        item.fileName ||
        item.photoType ||
        t("relationshipDocument", language),
      meta: getLocalizedMessageField(item, "subtitle") || item.time || item.createdAt || "",
    }));

  const relationshipMemoryItems = jobRecords.slice(0, 3).map((item) => ({
    title: getLocalizedMessageField(item, "title") || t("relationshipMemory", language),
    meta: getLocalizedMessageField(item, "subtitle") || item.savedAt || item.time || "",
  }));
  const relationshipIdentityActions = [
    {
      label: t("relationshipMeetroChat", language),
      primary: true,
      onClick: () => setShowProfileCard(false),
    },
    ...(!isCanonicalThread
      ? [
          {
            label: t("messagesTextAction", language),
            onClick: () => {
              setShowProfileCard(false);
              textActiveContact();
            },
          },
          {
            label: t("messagesCallAction", language),
            onClick: () => {
              setShowProfileCard(false);
              callActiveContact();
            },
          },
          {
            label: t("relationshipEmail", language),
            onClick: () => {
              setShowProfileCard(false);
              emailActiveContact();
            },
          },
          {
            label: t("messagesEditMore", language),
            onClick: () => {
              setShowProfileCard(false);
              setShowThreadMenu(true);
            },
          },
        ]
      : []),
  ];
  const relationshipIdentitySections = [
    {
      title: t("relationshipContactInformation", language),
      empty: t("relationshipNoContactInfoYet", language),
      items: relationshipContactRows.map((item) => ({
        title: item.label,
        meta: item.value,
      })),
    },
    {
      title: t("relationshipCurrentWork", language),
      empty: t("relationshipNoCurrentWorkYet", language),
      items: relationshipCurrentWorkItems,
    },
    {
      title: t("relationshipJobHistory", language),
      empty: t("relationshipNoCompletedWorkYet", language),
      items: relationshipCompletedWorkItems,
    },
    {
      title: t("relationshipInvoiceHistory", language),
      empty: t("relationshipNoInvoicesYet", language),
      items: relationshipInvoiceItems,
    },
    {
      title: t("relationshipDocuments", language),
      empty: t("relationshipNoDocumentsYet", language),
      items: relationshipDocumentItems,
    },
    {
      title: t("relationshipNotes", language),
      empty: t("relationshipNoNotesYet", language),
      items: [],
      span: "wide",
    },
    {
      title: t("relationshipMemory", language),
      empty: t("relationshipMemoryWillGrow", language),
      items: relationshipMemoryItems,
      span: "wide",
    },
  ];

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
    const activeConversationType = isCanonicalEmergencyThread
      ? "emergency"
      : localStorage.getItem("meetroConversationType") ||
        "standard";
    const quickReplyEmergencyStatus = isCanonicalEmergencyThread
      ? canonicalEmergencyWorkflow?.status || ""
      : localStorage.getItem("emergencyDispatchStatus") ||
        localStorage.getItem("activeJobStatus") ||
        "";
    const replies = [];

    const dedupeReplies = (list = []) => {
      const seen = new Set();
      const normalized = (value) =>
        String(value || "")
          .trim()
          .toLowerCase();

      return list
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
        .filter((entry) => {
          const normalizedEntry = normalized(entry);
          if (seen.has(normalizedEntry)) return false;
          seen.add(normalizedEntry);
          return true;
        });
    };

    const addReplies = (list = []) => {
      if (Array.isArray(list)) {
        replies.push(...list);
      }
    };

    const asEmergencyState = () => {
      const normalizedState = String(quickReplyEmergencyStatus || "")
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

      if (normalizedState.includes("complete") || normalizedState === "done") {
        return "completed";
      }
      if (normalizedState.includes("arrived") || normalizedState.includes("arrival")) {
        return "arrived";
      }
      if (
        normalizedState.includes("started") ||
        normalizedState.includes("inprogress") ||
        normalizedState.includes("working") ||
        normalizedState.includes("onsite")
      ) {
        return "started";
      }
      if (normalizedState.includes("way") || normalizedState.includes("enroute")) {
        return "onway";
      }

      return "";
    };

    const isBusinessUser =
      currentViewerRole === "business";
    const addReplyKeys = (keys) => addReplies(keys.map((key) => t(key, language)));

    if (activeConversationType === "emergency" && isBusinessUser) {
      const emergencyState = asEmergencyState();

      if (emergencyState === "completed") {
        addReplyKeys(
          isCanonicalEmergencyThread
            ? ["conversationReplyThankYou"]
            : [
                "conversationReplyThankYou",
                "conversationReplySaveHistory",
                "conversationReplySendFollowUp",
              ]
        );
      } else if (emergencyState === "started") {
        addReplyKeys(["conversationReplyCompleteJob", "conversationReplySendUpdate", "conversationReplyNeedParts"]);
      } else if (emergencyState === "arrived") {
        addReplyKeys(["conversationReplySendUpdate", "conversationReplyWorkCompleted", "conversationReplyAnythingElse"]);
      } else if (emergencyState === "onway") {
        addReplyKeys(["conversationReplyOnTheWay", "conversationReplyCalling", "conversationReplyCheckingNow"]);
      } else {
        addReplyKeys(["conversationReplyOnTheWay", "conversationReplyArrived", "conversationReplyCheckingNow", "conversationReplyJobStarted"]);
      }
    } else if (activeConversationType === "emergency" && !isBusinessUser) {
      const emergencyState = asEmergencyState();

      if (emergencyState === "completed") {
        addReplyKeys(
          isCanonicalEmergencyThread
            ? ["conversationReplyThankYou"]
            : [
                "conversationReplyThankYou",
                "conversationReplyLeaveReview",
                "conversationReplySaveHistory",
              ]
        );
      }

      if (emergencyState === "started" || emergencyState === "arrived") {
        addReplyKeys(["conversationReplyEverythingOkay", "conversationReplyThankYou", "conversationReplyNeedUpdate"]);
      } else {
        addReplyKeys(["conversationReplyAnyUpdate", "conversationReplyThankYou", "conversationReplyDoorUnlocked"]);
      }
    } else if (isHiringConversationType(activeConversationType)) {
      if (isBusinessUser) {
        addReplyKeys(["conversationReplyThanksForApplying", "conversationReplyWhenAvailable", "conversationReplyTellExperience", "conversationReplyScheduleInterview"]);
      } else {
        addReplyKeys(["conversationReplyInterested", "conversationReplyHaveTransportation", "conversationReplyAvailableThisWeek", "conversationReplyThankYou"]);
      }
    } else if (isBusinessUser) {
      addReplyKeys(["conversationReplyCanHelp", "conversationReplySendPhotos", "conversationReplyUpdateSoon", "conversationReplyThankYou"]);
    } else {
      addReplyKeys(["conversationReplyWhenAvailable", "conversationReplyCanSendPricing", "conversationReplyWillSendPhotos", "conversationReplyThankYou"]);
    }

    return dedupeReplies(replies).slice(0, 4);
  }, [
    canonicalEmergencyWorkflow?.status,
    currentViewerRole,
    isCanonicalEmergencyThread,
    language,
  ]);
  const starterMessages = useMemo(
    () => [
      {
        id: "starter-1",
        type: "text",
        sender: "client",
        text:
          t("conversationHiINeedHelpWithAProjectAtMyHouse", language),
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
    if (isCanonicalThread) {
      setJobRecords([]);
      setJobRecordCount(0);
      setShowJobRecords(false);
      return undefined;
    }

    const updateRecordCount = () => {
      const records = getJobRecord(conversationId);

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
  }, [conversationId, isCanonicalThread]);

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
          normalizeEmergencySenderRole(
            payload,
            backendMessage.sender_id === Number(localStorage.getItem("userId") || 0)
              ? currentViewerRole
              : currentViewerRole === "business"
              ? "homeowner"
              : "business"
          ),
        text: payload.text || backendMessage.message_text || "",
        imageUrl: payload.imageUrl || backendMessage.image_url || null,
        workflowType: payload.workflowType || backendMessage.workflow_type || "",
        status: payload.status || "delivered",
        createdAt: payload.createdAt || new Date(backendMessage.created_at).getTime(),
        time:
          payload.time ||
          formatMessageTime(backendMessage.created_at),
      };
    };

    const auditShadowTimeline = (legacyTimelineEvents, source) => {
      if (!import.meta.env.DEV) return;

      try {
        const shadowReconciledTimeline =
          reconcileConversationTimelineEvents(
            legacyTimelineEvents.map((event) => ({ source, event }))
          );
        const audit = getConversationTimelineAudit(
          legacyTimelineEvents,
          shadowReconciledTimeline
        );

        console.info("Conversation Timeline Audit", {
          source,
          legacyCount: audit.legacyCount,
          shadowCount: audit.shadowCount,
          missingActorCount: audit.missingActorCount,
          missingTimestampCount: audit.missingTimestampCount,
          duplicateCandidates: audit.duplicateCandidates,
          normalizationErrors: audit.normalizationErrors,
        });
      } catch {
        console.warn("Conversation Timeline Audit", {
          source,
          legacyCount: Array.isArray(legacyTimelineEvents)
            ? legacyTimelineEvents.length
            : 0,
          shadowCount: 0,
          missingActorCount: 0,
          missingTimestampCount: 0,
          duplicateCandidates: 0,
          normalizationErrors: 1,
        });
      }
    };

    const loadLocalMessages = () => {
      if (!canReadLegacyWorkflowStorage()) {
        if (!cancelled) setMessages([]);
        return [];
      }

      const saved = readLocalConversationValue();

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
            ? sanitizeMessagesForConversation(parsed)
                .filter(
                  (msg) =>
                    !isEmergencyThread ||
                    msg.workflowType !== "emergency_request"
                )
                .map((msg) => ({
                  ...msg,
                  senderRole: normalizeEmergencySenderRole(
                    msg,
                    msg.senderRoleOwner ||
                      (isEmergencyThread && msg.sender === "me"
                        ? "homeowner"
                        : msg.sender === "client"
                        ? "homeowner"
                        : oppositeRole)
                  ),
                }))
            : isEmergencyThread
            ? []
            : starterMessages;

          const shouldPersistEmergencyMigration =
            isEmergencyThread &&
            Array.isArray(parsed) &&
            migrated.some(
              (msg, index) =>
                msg.senderRole !== parsed[index]?.senderRole ||
                msg.workflowType !== parsed[index]?.workflowType
            );

          if (!cancelled) {
            auditShadowTimeline(migrated, "local-conversation");
            setMessages(migrated);

            if (
              (isEmergencyThread || isHiringThread) &&
              (migrated.length !== parsed.length ||
                shouldPersistEmergencyMigration)
            ) {
              writeLocalConversationValue(JSON.stringify(migrated));
            }
          }

          return migrated;
        } catch {
          const fallbackMessages = isEmergencyThread ? [] : starterMessages;

          if (!cancelled) {
            setMessages(fallbackMessages);
          }

          return fallbackMessages;
        }
      }

      const fallbackMessages = isEmergencyThread ? [] : starterMessages;

      if (!cancelled) {
        setMessages(fallbackMessages);
      }

      return fallbackMessages;
    };

    const loadMessages = async () => {
      if (isCanonicalThread) {
        if (!canonicalConversationId) {
          if (!cancelled) {
            setCanonicalConversationState({
              phase: "error",
              status: "",
              canSendMessages: false,
            });
            setCanonicalConversationDetail(null);
            setCanonicalMessagesPhase("error");
            setCanonicalLoadErrorKey("conversationCanonicalUnavailable");
          }
          return;
        }

        try {
          const detailResult = await authFetch(
            `/conversations/${canonicalConversationId}`,
            {},
            setPage
          );
          const detail = detailResult?.response?.ok
            ? normalizeCanonicalConversationDetail(
                detailResult.data,
                canonicalConversationId
              )
            : null;

          if (!detail) {
            if (!cancelled) {
              setCanonicalConversationState({
                phase: "error",
                status: "",
                canSendMessages: false,
              });
              setCanonicalConversationDetail(null);
              setCanonicalMessagesPhase("error");
              setCanonicalLoadErrorKey("conversationCanonicalUnavailable");
            }
            return;
          }

          if (!cancelled) {
            setCanonicalConversationDetail(detail);
            setCanonicalDispatchErrorKey("");
            setCanonicalConversationState({
              phase: "ready",
              status: detail.status,
              canSendMessages: detail.canSendMessages,
            });
          }

          const detailViewerRole =
            detail.participants?.viewer?.role ===
            "professional"
              ? "business"
              : "homeowner";
          const messageResult = await authFetch(
            `/conversations/${canonicalConversationId}/messages`,
            {},
            setPage
          );
          const canonicalMessages = messageResult?.response?.ok
            ? normalizeCanonicalMessageCollection(
                messageResult.data,
                canonicalConversationId,
                detailViewerRole
              )
            : null;

          if (!canonicalMessages) {
            if (!cancelled) {
              setCanonicalMessagesPhase("error");
              setCanonicalLoadErrorKey(
                "conversationCanonicalMessagesUnavailable"
              );
            }
            return;
          }

          if (!cancelled) {
            setMessages(
              canonicalMessages.map((message) => ({
                ...message,
                time: formatMessageTime(message.createdAt),
              }))
            );
            setCanonicalMessagesPhase("ready");
            setCanonicalLoadErrorKey("");
            try {
              markConversationRead(
                conversationId,
                {},
                detailViewerRole
              );
            } catch {
              // Read-state bookkeeping must never interrupt the visible thread.
            }
          }
        } catch (error) {
          console.error("Failed to load canonical conversation", error);
          if (!cancelled) {
            setCanonicalConversationState((current) => ({
              ...current,
              phase: current.phase === "ready" ? "ready" : "error",
              canSendMessages:
                current.phase === "ready" ? current.canSendMessages : false,
            }));
            setCanonicalMessagesPhase("error");
            setCanonicalLoadErrorKey(
              "conversationCanonicalMessagesUnavailable"
            );
          }
        }
        return;
      }

      const selectedQuoteRequestId =
        localStorage.getItem("selectedQuoteRequestId") || conversationId;
      const localMessages = loadLocalMessages();
      const canFetchBackendMessages =
        selectedQuoteRequestId &&
        !isHiringThread &&
        !isRequestOpportunityReadOnly &&
        /^\d+$/.test(String(selectedQuoteRequestId));

      if (canFetchBackendMessages) {
        try {
          const result = await authFetch(
            `/messages/${selectedQuoteRequestId}`,
            {},
            setPage
          );

          const backendMessages = result?.data?.messages;

          if (!cancelled && Array.isArray(backendMessages) && backendMessages.length > 0) {
            const mapped = backendMessages
              .map(mapBackendMessage)
              .filter(
                (message) =>
                  !isEmergencyThread ||
                  message.workflowType !== "emergency_request"
              );
            let localMessages = [];

            try {
              const savedMessages = JSON.parse(readLocalConversationValue() || "[]");
              localMessages = Array.isArray(savedMessages) ? savedMessages : [];
            } catch {
              localMessages = [];
            }

            const merged = sanitizeMessagesForConversation(
              mergeConversationMessages(localMessages, mapped)
            );

            auditShadowTimeline(merged, "backend-message");
            setMessages(merged);
            writeLocalConversationValue(JSON.stringify(merged));
            try {
              markConversationRead(conversationId, {}, currentViewerRole);
            } catch {
              // Read-state bookkeeping must never interrupt the visible thread.
            }
            return;
          }
        } catch (err) {
          console.error("Failed to load backend messages", err);
        }
      }

      try {
        markConversationRead(conversationId, {}, currentViewerRole);
      } catch {
        // Read receipts and inbox refreshes must never block the active thread.
      }
    };

    Promise.resolve().then(() => {
      if (cancelled) return;

      if (isCanonicalThread) setMessages([]);
      setCanonicalConversationDetail(null);
      setCanonicalConversationState({
        phase: isCanonicalThread ? "loading" : "idle",
        status: "",
        canSendMessages: false,
      });
      setCanonicalMessagesPhase(isCanonicalThread ? "loading" : "idle");
      setCanonicalLoadErrorKey("");
      setCanonicalSendErrorKey("");
      loadMessages();
    });

    const pollingInterval = setInterval(() => {
      if (!document.hidden) {
        loadMessages();
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(pollingInterval);
    };
  }, [
    storageKey,
    conversationId,
    starterMessages,
    activeAccountMode,
    setPage,
    isHiringThread,
    isCanonicalThread,
    canonicalConversationId,
    canonicalReloadKey,
  ]);

  useEffect(() => {
    const registry = getConversationRegistry();
    const selectedId = String(conversationId);
    const selectedItem = registry.find(
      (item) => String(item.id) === selectedId
    );

    markConversationRead(conversationId, selectedItem || {}, currentViewerRole);
  }, [conversationId]);

  useEffect(() => {
    if (isCanonicalThread) return;

    if (messages.length > 0) {
      const messagesForConversation = sanitizeMessagesForConversation(messages);

      if (isHiringThread && messagesForConversation.length !== messages.length) {
        writeLocalConversationValue(JSON.stringify(messagesForConversation));
        setMessages(messagesForConversation);
        window.dispatchEvent(new Event("meetro-messages-updated"));
        return;
      }

      writeLocalConversationValue(JSON.stringify(messagesForConversation));

      const lastMessage = messagesForConversation[messagesForConversation.length - 1];

      const lastMessageText =
        lastMessage?.type === "image"
          ? t("conversationImageAttached", language)
          : lastMessage?.type === "location"
          ? t("conversationLocationShared", language)
          : lastMessage?.type === "scan"
          ? t("conversationDocumentScan", language)
          : lastMessage?.title || lastMessage?.text || "";

      const metaPayload = {
        lastMessage: lastMessageText,
        lastTime: lastMessage?.time || "",
        unread: 0,
        updatedAt: Date.now(),
        activeJobId:
          activeJobSnapshot?.jobId ||
          localStorage.getItem("activeJobId") ||
          "",
        activeJobService:
          localStorage.getItem("activeWorkService") ||
          activeJobSnapshot?.service ||
          localStorage.getItem("activeJobService") ||
          "",
        activeJobStatus:
          activeJobSnapshot?.status ||
          localStorage.getItem("activeJobStatus") ||
          "",
        activeJobEta:
          activeJobSnapshot?.eta ||
          localStorage.getItem("activeJobEta") ||
          "",
        activeJobCustomer:
          activeJobSnapshot?.customer ||
          localStorage.getItem("activeJobCustomer") ||
          "",
      };

      saveConversationMeta(conversationId, metaPayload);

      const registry = getConversationRegistry();
      const existingRegistryItem = registry.find(
        (item) => String(item.id) === String(conversationId)
      );

      const registryItem = {
        ...(existingRegistryItem || {}),
        id: conversationId,
        project_title:
          activeHeaderProject ||
          "Conversation",
        project_description:
          lastMessageText || "Saved conversation for future communication.",
        homeowner_email:
          (isHiringThread ? hiringParticipantName : resolvedCustomerIdentity.name) ||
          existingRegistryItem?.homeowner_email ||
          "Contact",
        location:
          (isHiringThread ? "Hiring" : resolvedCustomerIdentity.location) ||
          existingRegistryItem?.location ||
          "Saved Contact",
        status:
          existingRegistryItem?.status ||
          (conversationType === "business" ? "Saved Business" : "Message"),
        unread: false,
        saved_to_history: existingRegistryItem?.saved_to_history || false,
        userSavedToHistory:
          existingRegistryItem?.userSavedToHistory ||
          existingRegistryItem?.user_saved_to_history ||
          localStorage.getItem(`meetro_conversation_user_saved_${conversationId}`) === "true",
        user_saved_to_history:
          existingRegistryItem?.user_saved_to_history ||
          existingRegistryItem?.userSavedToHistory ||
          localStorage.getItem(`meetro_conversation_user_saved_${conversationId}`) === "true",
        userSavedToHistoryAt: existingRegistryItem?.userSavedToHistoryAt || "",
        savedToHistorySource: existingRegistryItem?.savedToHistorySource || "",
        conversation_type: conversationType || "standard",
        positionTitle: existingRegistryItem?.positionTitle || hiringPositionTitle,
        positionId: existingRegistryItem?.positionId || conversationMeta?.positionId || "",
        applicantName: existingRegistryItem?.applicantName || hiringParticipantName,
        applicantId: existingRegistryItem?.applicantId || conversationMeta?.applicantId || "",
        businessName: existingRegistryItem?.businessName || hiringBusinessName,
        source: existingRegistryItem?.source || conversationMeta?.source || "",
        savedAt: new Date().toISOString(),
      };

      const updatedRegistry = [
        registryItem,
        ...registry.filter(
          (item) => String(item.id) !== String(conversationId)
        ),
      ];

      localStorage.setItem(
        "meetro_conversation_registry",
        JSON.stringify(updatedRegistry)
      );

      writeUnreadConversationCount(updatedRegistry);
    }
  }, [messages, storageKey, conversationId, language, isCanonicalThread]);

  useEffect(() => {
    if (!hasInitialScrolledRef.current && messages.length > 0) {
      hasInitialScrolledRef.current = true;
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      });
    }
  }, [messages.length]);

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
    formatMessageTime(new Date());

  const getDisplayScheduleTime = (value) => formatScheduleTime(value) || value || "—";
  const getDisplayScheduleSummary = (schedule = {}) =>
    formatDateTimeDisplay(schedule.date || "", schedule.time || "") ||
    [schedule.date, getDisplayScheduleTime(schedule.time)].filter(Boolean).join(" • ");

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
    if (isHiringThread && !isMessageAllowedInHiringConversation(message)) {
      return;
    }

    const messageWithRole = {
      ...message,
      senderRole: message.senderRole || currentViewerRole,
    };

    setMessages((prev) => {
      const nextMessages = mergeConversationMessages(prev, [messageWithRole]);

      try {
        writeLocalConversationValue(JSON.stringify(nextMessages));
      } catch (error) {
        console.warn("Conversation local save failed; message remains visible", error);
      }

      return nextMessages;
    });

    try {
      markConversationRead(conversationId, {}, currentViewerRole);
      markConversationUnreadForRecipient(conversationId, currentViewerRole, {
        project_title:
          activeHeaderProject ||
          "Conversation",
        project_description:
          messageWithRole.title ||
          messageWithRole.text ||
          "New message",
        homeowner_email:
          (isHiringThread ? hiringParticipantName : resolvedCustomerIdentity.name) ||
          "Contact",
        conversation_type: conversationType || "standard",
        positionTitle: isHiringThread ? hiringPositionTitle : "",
        applicantName: isHiringThread ? hiringParticipantName : "",
        businessName: isHiringThread ? hiringBusinessName : "",
        source: isHiringThread ? "hiring_message" : "",
        saved_to_history: false,
      });
    } catch (error) {
      console.warn("Conversation registry update failed; message remains visible", error);
    }

    try {
      window.dispatchEvent(new Event("meetro-messages-updated"));
    } catch {
      // Message rendering should not depend on cross-page refresh events.
    }

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
      updateMessageStatus(messageWithRole.id, "failed", 400);
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
      isHiringThread &&
      isBusinessUser &&
      (normalized.includes("schedule an interview") ||
        normalized.includes("schedule interview") ||
        normalized.includes("programemos entrevista") ||
        normalized.includes("programar entrevista"))
    ) {
      const applicantId = conversationRegistryItem?.applicantId || conversationMeta?.applicantId || "";
      const positionId = conversationRegistryItem?.positionId || conversationMeta?.positionId || "";
      if (applicantId && positionId) {
        localStorage.setItem("selectedHiringApplicantId", applicantId);
        localStorage.setItem("selectedHiringPositionId", positionId);
        localStorage.setItem("hiringCenterReturnPage", "conversationThread");
        setPage("hiringCenter");
        return;
      }
    }

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
      captureConversationOriginContext({
        sourcePage: "conversationThread",
        workspace: isEmergencyThread ? "emergencyComplete" : "completedJobDetails",
        viewerRole: currentViewerRole,
      });
      setPage(isEmergencyThread ? "emergencyComplete" : "completedJobDetails");
      return;
    }

    sendMessage(reply);
  };

  const sendCanonicalMessage = async (rawText) => {
    if (canonicalSendPending) return;

    if (
      !canonicalConversationId ||
      canonicalConversationState.phase !== "ready" ||
      canonicalConversationState.canSendMessages !== true
    ) {
      setCanonicalSendErrorKey("conversationCanonicalMessagingUnavailable");
      return;
    }

    const validation = validateCanonicalMessageText(rawText);

    if (!validation.valid) {
      setCanonicalSendErrorKey(
        validation.code === "MESSAGE_TEXT_TOO_LONG"
          ? "conversationCanonicalMessageTooLong"
          : "conversationCanonicalMessageRequired"
      );
      return;
    }

    setCanonicalSendPending(true);
    setCanonicalSendErrorKey("");

    try {
      const result = await authFetch(
        `/conversations/${canonicalConversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify(
            buildCanonicalMessagePayload(validation.text)
          ),
        },
        setPage
      );
      const confirmedMessage =
        result?.response?.ok &&
        result.response.status === 201 &&
        result?.data?.success === true &&
        result?.data?.code === "CONVERSATION_MESSAGE_CREATED" &&
        normalizeCanonicalConversationId(result?.data?.conversationId) ===
          canonicalConversationId
          ? normalizeCanonicalMessage(result.data.message, currentViewerRole)
          : null;

      if (!confirmedMessage) {
        if (
          result?.response?.status === 409 ||
          result?.data?.code === "CONVERSATION_CLOSED"
        ) {
          setCanonicalConversationState((current) => ({
            ...current,
            status: "closed",
            canSendMessages: false,
          }));
          setCanonicalSendErrorKey("conversationCanonicalClosed");
        } else if (result?.response?.status === 404) {
          setCanonicalConversationState({
            phase: "error",
            status: "",
            canSendMessages: false,
          });
          setCanonicalSendErrorKey("conversationCanonicalUnavailable");
        } else {
          setCanonicalSendErrorKey("conversationCanonicalSendFailed");
        }
        return;
      }

      const visibleMessage = {
        ...confirmedMessage,
        time: formatMessageTime(confirmedMessage.createdAt),
      };

      setMessages((current) =>
        mergeConversationMessages(current, [visibleMessage])
      );
      setMessageText("");
      setReplyingTo(null);
      setActiveMessageId(null);
      resetTextareaHeight();
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      });
      window.dispatchEvent(new Event("meetro-messages-updated"));
    } catch (error) {
      console.error("Failed to send canonical conversation message", error);
      setCanonicalSendErrorKey("conversationCanonicalSendFailed");
    } finally {
      setCanonicalSendPending(false);
    }
  };

  const sendMessage = (textOverride = null) => {
    if (isCanonicalThread) {
      void sendCanonicalMessage(textOverride ?? messageText);
      return;
    }

    if (isRequestOpportunityReadOnly) return;
    const text = textOverride || messageText.trim();

    if (!text && !pendingImage) return;

    const id = `msg-${Date.now()}`;

    if (pendingImage) {
      const enteredPhotoText = text || (pendingPhotoPurpose === "explain" ? photoExplanationText.trim() : "");
      const defaultTextKey = pendingPhotoPurpose === "explain"
        ? "conversationProjectExplanationPhoto"
        : currentViewerRole === "business"
          ? "conversationProjectPhoto"
          : "conversationCustomerUploadedPhoto";
      const titleKey = pendingPhotoPurpose === "explain"
        ? "conversationProjectExplanationPhoto2"
        : currentViewerRole === "business"
          ? "conversationProjectPhoto2"
          : "conversationCustomerPhoto";
      const subtitleKey = pendingPhotoPurpose === "explain"
        ? "conversationImageSentToHelpExplainTheJob"
        : currentViewerRole === "business"
          ? "conversationPhotoSharedWithCustomer"
          : "conversationImageSentToExplainTheProject";
      const imageMessagePayload = {
        id,
        type: "image",
        sender: "me",
        senderRole: currentViewerRole,
        text: enteredPhotoText,
        textKey: enteredPhotoText ? "" : defaultTextKey,
        titleKey,
        subtitleKey,
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
        const existing = getJobRecord(conversationId);

        const autoSavedItem = {
          id: `job-record-${Date.now()}`,
          conversationId,
          type: "project_explanation_photo",
          titleKey: "conversationProjectExplanationPhoto3",
          subtitleKey: "conversationCustomerProjectContext",
          text: imageMessagePayload.text || "",
          textKey: imageMessagePayload.textKey || "",
          imageUrl: imageMessagePayload.imageUrl || "",
          fileName: imageMessagePayload.fileName || "",
          workflowType: "customer_explanation",
          time: getTime(),
          savedAt: new Date().toISOString(),
          sharedWithHomeowner: true,
          sharedWithBusiness: true,
          autoSaved: true,
        };

        saveJobRecord(conversationId, [autoSavedItem, ...existing]);

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
    setShowAttachMenu(false);
    addOutgoingMessage({
      id: `loc-${Date.now()}`,
      type: "location",
      sender: "me",
      senderRole: currentViewerRole,
      textKey: "conversationLocationShared",
      titleKey: "momentDetailLocation",
      subtitleKey: "conversationMapAndAddressComingSoon",
      time: getTime(),
      status: "sending",
      unsent: false,
      replyTo: replyingTo,
      createdAt: Date.now(),
    });
  };

  const sendScanCard = () => {
    setShowAttachMenu(false);
    addOutgoingMessage({
      id: `scan-${Date.now()}`,
      type: "scan",
      sender: "me",
      senderRole: currentViewerRole,
      textKey: "conversationDocumentShared",
      titleKey: "relationshipDocument",
      subtitleKey: "conversationPermitsReceiptsEstimatesOrNotes",
      time: getTime(),
      status: "sending",
      unsent: false,
      replyTo: replyingTo,
      createdAt: Date.now(),
    });
  };

  const sendVideoCard = () => {
    setShowAttachMenu(false);
    addOutgoingMessage({
      id: `video-${Date.now()}`,
      type: "update",
      sender: "me",
      senderRole: currentViewerRole,
      textKey: "conversationVideoShared",
      titleKey: "hiringInterviewTypeVideo",
      subtitleKey: "conversationVideoAddedToThisConversation",
      time: getTime(),
      status: "sending",
      unsent: false,
      replyTo: replyingTo,
      createdAt: Date.now(),
    });
  };

  const sendVoiceMessageCard = () => {
    setShowAttachMenu(false);
    addOutgoingMessage({
      id: `voice-${Date.now()}`,
      type: "update",
      sender: "me",
      senderRole: currentViewerRole,
      textKey: "conversationVoiceMessageShared",
      titleKey: "conversationVoiceMessage",
      subtitleKey: "conversationVoiceNoteAddedToThisConversation",
      time: getTime(),
      status: "sending",
      unsent: false,
      replyTo: replyingTo,
      createdAt: Date.now(),
    });
  };

  const openWorkCenterHandoff = (section = "active") => {
    setShowAttachMenu(false);
    setShowThreadMenu(false);
    setActiveMessageId(null);
    setShowMobileSheet(false);
    setShowScheduleModal(false);
    localStorage.setItem("meetroWorkCenterTab", section);
    localStorage.setItem("activeWorkCenterTab", section);
    setPage("workCenter");
  };

  const getChatScheduleHandoffContext = () => {
    const relationshipId = firstIdentityValue(
      relationshipDetailSource.relationshipId,
      relationshipDetailSource.relationship_id,
      conversationMeta?.relationshipId,
      conversationRegistryItem?.relationshipId,
      conversationId
    );
    const customerAccountId = firstIdentityValue(
      relationshipDetailSource.customerId,
      relationshipDetailSource.customer_id,
      relationshipDetailSource.homeownerId,
      relationshipDetailSource.homeowner_id,
      relationshipDetailSource.customerAccountId,
      relationshipDetailSource.linkedCustomerId,
      conversationMeta?.customerId,
      conversationMeta?.homeownerId
    );
    const externalContactId = customerAccountId
      ? ""
      : firstIdentityValue(
          savedThreadContactRecord?.id,
          relationshipDetailSource.externalContactId,
          relationshipDetailSource.contactId,
          relationshipDetailSource.id,
          conversationRegistryItem?.contactId
        );
    const businessId = firstIdentityValue(
      relationshipDetailSource.businessId,
      relationshipDetailSource.business_id,
      relationshipDetailSource.professionalId,
      relationshipDetailSource.providerId,
      selectedBusiness?.id,
      localStorage.getItem("businessId"),
      localStorage.getItem("contractorId")
    );
    const projectTitle = firstIdentityValue(
      selectedQuoteRequest?.title,
      selectedQuoteRequest?.projectTitle,
      selectedHomeownerRequest?.title,
      selectedHomeownerRequest?.projectTitle,
      selectedConversation?.projectTitle,
      selectedConversation?.title,
      relationshipDetailSource.projectTitle,
      relationshipDetailSource.title,
      activeHeaderProject,
      activeProjectTitle,
      activeName
    );
    const location = firstIdentityValue(
      relationshipStreetAddress,
      relationshipServiceArea,
      displayLocation,
      activeLocation,
      activeEmergencyRecord.location,
      localStorage.getItem("activeCustomerLocation")
    );
    const customerName = firstIdentityValue(
      activeCustomerName,
      relationshipDetailSource.customerName,
      relationshipDetailSource.homeownerName,
      activeHeaderName
    );
    const customerPhone = firstIdentityValue(customerCallPhone, activeCallPhone);
    const isLinkedMeetroCustomer = Boolean(
      customerAccountId ||
        relationshipDetailSource.meetroAccountLinked ||
        relationshipDetailSource.isMeetroUser ||
        relationshipDetailSource.linkedMeetroAccountId ||
        conversationRegistryItem?.meetroAccountLinked ||
        conversationRegistryItem?.isMeetroUser ||
        selectedConversation?.meetroAccountLinked
    );
    const isExplicitExternalContact = Boolean(
      relationshipDetailSource.isExternalCustomer ||
        relationshipDetailSource.contactImported ||
        relationshipDetailSource.savedToContacts ||
        relationshipDetailSource.externalContactId ||
        savedThreadContactRecord?.contactImported ||
        savedThreadContactRecord?.savedToContacts ||
        externalContactId
    );
    const isExternalCustomer = Boolean(
      !isLinkedMeetroCustomer &&
        (isExplicitExternalContact ||
          (!conversationId && (customerPhone || relationshipContactEmail)))
    );

    return {
      contextSource: "conversation",
      appointmentType: isEmergencyThread ? "emergency" : "walkthrough",
      title: projectTitle
        ? projectTitle
        : customerName
          ? `Visit with ${customerName}`
          : "Scheduled Visit",
      customerName,
      phone: customerPhone,
      customerPhone,
      email: relationshipContactEmail || "",
      customerEmail: relationshipContactEmail || "",
      address: location,
      location,
      requestId:
        selectedHomeownerRequestId ||
        selectedQuoteRequest?.requestId ||
        selectedQuoteRequest?.id ||
        selectedHomeownerRequest?.requestId ||
        selectedHomeownerRequest?.id ||
        "",
      quoteId: selectedQuoteRequest?.quoteId || selectedQuoteRequest?.id || "",
      conversationId,
      relationshipId,
      customerAccountId,
      externalContactId,
      businessId,
      businessName: activeBusinessName || "",
      activeAccountMode,
      activeMode: activeAccountMode,
      activeRole: currentViewerRole,
      isExternalCustomer,
      inviteLink: "https://getmeetro.com",
      scheduleDedupeKey: [
        relationshipId || externalContactId || customerAccountId || conversationId,
        projectTitle,
      ]
        .filter(Boolean)
        .join("|"),
      services: [projectTitle].filter(Boolean),
      notes: "",
    };
  };

  const handOffChatScheduleToWorkCenter = () => {
    const handoff = getChatScheduleHandoffContext();

    localStorage.setItem("meetroAssistantSchedulePrefill", JSON.stringify(handoff));
    localStorage.setItem("meetroChatScheduleHandoff", JSON.stringify(handoff));
    localStorage.setItem(
      `meetroChatScheduleHandoff:${conversationId}`,
      JSON.stringify(handoff)
    );
    localStorage.setItem("activeConversationId", conversationId);
    localStorage.setItem("activeWorkConversationId", conversationId);
    localStorage.setItem("activeConversationName", handoff.customerName || activeHeaderName || "");
    localStorage.setItem("activeWorkService", handoff.title || "");
    localStorage.setItem("activeWorkLocation", handoff.location || "");

    openWorkCenterHandoff("schedule");
  };

  const openInvoiceBuilderHandoff = () => {
    setShowAttachMenu(false);
    setShowThreadMenu(false);
    setActiveMessageId(null);
    setShowMobileSheet(false);
    setShowScheduleModal(false);
    localStorage.setItem("activeConversationId", conversationId);
    localStorage.setItem("activeConversationName", activeName || "");
    localStorage.setItem("invoiceBuilderReturnPage", "messagesInbox");
    setPage("invoiceBuilder");
  };

  const openTenantTicketComposer = () => {
    openWorkCenterHandoff("active");
  };

  const updateTenantTicketDraft = (field, value) => {
    setTenantTicketDraft((current) =>
      current ? { ...current, [field]: value, notice: "" } : current
    );
  };

  const reviewTenantTicketDraft = (event) => {
    event.preventDefault();
    if (!tenantTicketDraft) return;

    if (!tenantTicketDraft.propertyUnit.trim() || !tenantTicketDraft.description.trim()) {
      setTenantTicketDraft((current) =>
        current
          ? {
              ...current,
              notice: "Add the property/unit and a short description before reviewing.",
            }
          : current
      );
      return;
    }

    setTenantTicketDraft((current) =>
      current ? { ...current, step: "review", notice: "" } : current
    );
  };

  const submitTenantTicketDraft = () => {
    if (!tenantTicketDraft) return;
    setTenantTicketDraft(null);
    openWorkCenterHandoff("active");
  };


const sendPaymentCard = () => {
  openInvoiceBuilderHandoff();
};


const startWorkflowPhotoUpload = (workflowType) => {
  if (mediaUploadDeferred) {
    setPendingWorkflowPhotoType("");
    setShowAttachMenu(false);
    setSaveNotice(getMediaDeferredNotice(language));
    return;
  }

  setPendingWorkflowPhotoType(workflowType);
  setShowAttachMenu(false);
  fileInputRef.current?.click();
};

  const sendMaterialsCard = () => {
  openWorkCenterHandoff("active");
};


const handleImageUpload = (event) => {
    if (
      !guardFriendsAndFamilyMediaUpload({
        event,
        language,
        onDeferred: setSaveNotice,
      })
    ) {
      setPendingWorkflowPhotoType("");
      setShowAttachMenu(false);
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);

    if (pendingWorkflowPhotoType) {
      const map = {
        before: {
          icon: "photo",
          titleKey: "conversationBeforePhoto",
          subtitleKey: "conversationAreaBeforeWorkBegins",
          textKey: "conversationBeforePhotoAdded",
        },
        progress: {
          icon: "work",
          titleKey: "conversationProgressPhoto2",
          subtitleKey: "conversationWorkProgressUpdate",
          textKey: "conversationProgressPhotoAdded",
        },
        issue: {
          icon: "alert",
          titleKey: "conversationIssueFound",
          subtitleKey: "conversationProblemOrDelayDetected",
          textKey: "conversationIssueDocumented",
        },
        completion: {
          icon: "done",
          titleKey: "conversationCompletionPhoto",
          subtitleKey: "conversationCompletedWorkResult",
          textKey: "conversationCompletionPhotoAdded",
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
        textKey: data.textKey,
        titleKey: data.titleKey,
        subtitleKey: data.subtitleKey,
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

  const openConversationCamera = async () => {
    setShowAttachMenu(false);

    if (mediaUploadDeferred) {
      setSaveNotice(getMediaDeferredNotice(language));
      return;
    }

    await openJobPhotoPicker({
      inputRef: cameraInputRef,
      fileNamePrefix: "message-photo",
      language,
      onPhotos: (photos) =>
        handleImageUpload(createPhotoInputEvent(photos.map((photo) => photo.file))),
      onError: (message) => setSaveNotice(message || CAMERA_PERMISSION_MESSAGE),
    });
  };

  const unsendMessage = (id) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id
          ? {
              ...msg,
              type: "text",
              unsent: true,
              text: "",
              textKey: "conversationMessageWasUnsent",
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

  const deleteScheduleCard = async (scheduleMessage) => {
    if (!scheduleMessage?.id) return;

    const scheduleId =
      scheduleMessage.schedule?.id ||
      scheduleMessage.scheduleId ||
      scheduleMessage.appointmentId ||
      "";

    setMessages((prev) => prev.filter((msg) => msg.id !== scheduleMessage.id));

    if (scheduleId) {
      const updatedSchedule = getBusinessSchedule().filter(
        (item) => String(item.id) !== String(scheduleId)
      );
      saveBusinessSchedule(updatedSchedule);
    }

    await cancelAppointmentReminderNotifications(
      scheduleMessage.schedule || {
        id: scheduleId,
        scheduleId,
      }
    );

    setSwipedScheduleId(null);
    setAppointmentDetails(null);
    setActiveMessageId(null);
    setShowMobileSheet(false);
    window.dispatchEvent(new Event("meetro-messages-updated"));
  };

  const getAppointmentConfirmationStatus = (message) => {
    const rawStatus =
      message?.schedule?.customerConfirmationStatus ||
      message?.customerConfirmationStatus ||
      message?.schedule?.confirmationStatus ||
      message?.confirmationStatus ||
      message?.schedule?.workflowStatus ||
      message?.workflowStatus ||
      message?.schedule?.status ||
      "";
    const normalizedStatus = String(rawStatus).toLowerCase().replace(/\s+/g, "_");

    if (
      message?.isOutdated ||
      message?.replacedAt ||
      normalizedStatus.includes("replaced") ||
      normalizedStatus.includes("outdated") ||
      normalizedStatus.includes("superseded")
    ) {
      return "replaced";
    }

    if (
      normalizedStatus.includes("confirmed") ||
      normalizedStatus === "customer_confirmed"
    ) {
      return "confirmed";
    }

    if (
      normalizedStatus.includes("change_requested") ||
      normalizedStatus.includes("reschedule") ||
      normalizedStatus.includes("needs_reschedule")
    ) {
      return "change_requested";
    }

    if (normalizedStatus.includes("cancel")) {
      return "cancelled";
    }

    return "pending_customer_confirmation";
  };

  const getAppointmentConfirmationLabel = (status) => {
    if (status === "confirmed") return t("appointmentConfirmed", language);
    if (status === "change_requested") return t("appointmentChangeRequested", language);
    if (status === "cancelled") return t("appointmentCancelled", language);
    if (status === "replaced") {
      return t("workCenterScheduleUpdated", language);
    }
    return t("appointmentPendingConfirmation", language);
  };

  const isWorkScheduleMessage = (message = {}) =>
    message?.workflowType === "work_scheduled" ||
    message?.schedule?.appointmentType === "work_visit" ||
    message?.schedule?.workflowStage === "work_scheduled" ||
    message?.schedule?.status === "work_scheduled";

  const getScheduleCardTitle = (message = {}) => {
    if (isWorkScheduleMessage(message)) {
      return t("workScheduled", language);
    }

    return getLocalizedMessageField(message, "title") || t("messagesAppointmentScheduled", language);
  };

  const getScheduleServices = (message = {}) => {
    const services = Array.isArray(message.services)
      ? message.services
      : Array.isArray(message.schedule?.services)
        ? message.schedule.services
        : [];

    if (services.length > 0) return services.filter(Boolean);

    return [
      message.schedule?.requestTitle ||
        message.schedule?.projectTitle ||
        message.schedule?.title ||
        "",
    ].filter(Boolean);
  };

  const isCustomerFacingPendingAppointment = (message) =>
    currentViewerRole !== "business" &&
    message?.type === "schedule" &&
    !message?.isOutdated &&
    !message?.replacedAt &&
    getAppointmentConfirmationStatus(message) === "pending_customer_confirmation";

  const getScheduleMessageVisitId = (message = {}) =>
    firstIdentityValue(
      message?.schedule?.visitId,
      message?.visitId,
      message?.schedule?.id,
      message?.scheduleId,
      message?.appointmentId
    );

  const editScheduleFromMessage = (scheduleMessage = {}) => {
    if (currentViewerRole !== "business") return;

    const scheduleId = getScheduleMessageVisitId(scheduleMessage);
    if (!scheduleId) {
      setSaveNotice(
        t("conversationNoLinkedVisitWasFoundToEdit", language)
      );
      setTimeout(() => setSaveNotice(""), 2400);
      return;
    }

    setAppointmentDetails(null);
    setShowThreadMenu(false);
    setShowAttachMenu(false);
    setActiveMessageId(null);
    setShowMobileSheet(false);
    localStorage.setItem("meetroScheduleEditId", scheduleId);
    localStorage.setItem("activeWorkScheduleId", scheduleId);
    localStorage.setItem("activeConversationId", conversationId);
    localStorage.setItem("activeWorkConversationId", conversationId);
    localStorage.setItem("meetroWorkCenterTab", "schedule");
    localStorage.setItem("activeWorkCenterTab", "schedule");
    setPage("workCenter");
  };

  const updateScheduleConfirmationStatus = async (scheduleMessage, confirmationStatus) => {
    if (!scheduleMessage?.id) return;

    const updatedAt = new Date().toISOString();
    const isWorkSchedule = isWorkScheduleMessage(scheduleMessage);
    const scheduleId =
      scheduleMessage.schedule?.visitId ||
      scheduleMessage.visitId ||
      scheduleMessage.schedule?.id ||
      scheduleMessage.scheduleId ||
      scheduleMessage.appointmentId ||
      "";

    const statusLabel =
      isWorkSchedule && confirmationStatus === "confirmed"
        ? t("conversationWorkConfirmed", language)
        : isWorkSchedule && confirmationStatus === "change_requested"
          ? t("conversationChangeRequested", language)
          : getAppointmentConfirmationLabel(confirmationStatus);
    const confirmationText =
      confirmationStatus === "confirmed"
        ? isWorkSchedule
          ? t("conversationWorkScheduleConfirmedTheScheduledTimeWorksForTheCustomer", language)
          : t("appointmentConfirmedChatText", language)
        : isWorkSchedule
          ? t("conversationCustomerRequestedADifferentTimeForTheScheduledWork", language)
          : t("appointmentChangeRequestedChatText", language);

    const updateSchedule = (schedule = {}) => ({
      ...schedule,
      customerConfirmationStatus: confirmationStatus,
      confirmationStatus,
      confirmationStatusLabel: statusLabel,
      status:
        confirmationStatus === "confirmed"
          ? isWorkSchedule
            ? "work_confirmed"
            : "scheduled"
          : confirmationStatus === "change_requested"
          ? "change_requested"
          : schedule.status,
      workflowStage:
        confirmationStatus === "confirmed"
          ? isWorkSchedule
            ? "work_scheduled"
            : "visit_scheduled"
          : schedule.workflowStage,
      workflowStatus:
        confirmationStatus === "confirmed"
          ? isWorkSchedule
            ? "work_confirmed"
            : "visit_scheduled"
          : confirmationStatus === "change_requested"
          ? "appointment_change_requested"
          : schedule.workflowStatus,
      nextAction:
        confirmationStatus === "confirmed" && !isWorkSchedule
          ? "record_evaluation"
          : schedule.nextAction,
      nextResponsibility:
        confirmationStatus === "confirmed" && !isWorkSchedule
          ? t("workCenterRecordEvaluation", language)
          : schedule.nextResponsibility,
      evaluationStatus:
        confirmationStatus === "confirmed" && !isWorkSchedule
          ? "ready_after_visit"
          : schedule.evaluationStatus,
      confirmedAt:
        confirmationStatus === "confirmed" ? updatedAt : schedule.confirmedAt,
      changeRequestedAt:
        confirmationStatus === "change_requested"
          ? updatedAt
          : schedule.changeRequestedAt,
      updatedAt,
    });

    let reminderSchedule = null;
    if (confirmationStatus === "confirmed") {
      reminderSchedule = await scheduleAppointmentReminderNotifications(
        updateSchedule(scheduleMessage.schedule || {}),
        { viewerRole: "customer", language }
      );

      if (reminderSchedule.permissionDenied) {
        setAppointmentReminderNotice({
          context: "conversation",
          message:
            t("workCenterMeetroCanRemindYouAboutUpcomingAppointmentsNotificationsAreBlockedOpenIPhone", language),
        });
      } else {
        setAppointmentReminderNotice(null);
      }
    }

    const mergeReminderMetadata = (schedule = {}) => ({
      ...schedule,
      reminders: reminderSchedule?.appointment?.reminders || schedule.reminders,
    });

    const updateMessage = (message) => {
      if (String(message.id) !== String(scheduleMessage.id)) return message;

      const nextSchedule = mergeReminderMetadata(updateSchedule(message.schedule || {}));

      return {
        ...message,
        customerConfirmationStatus: confirmationStatus,
        confirmationStatus,
        status: confirmationStatus,
        subtitle: `${getDisplayScheduleSummary(nextSchedule)} • ${statusLabel}`,
        text: confirmationText,
        schedule: nextSchedule,
        updatedAt,
      };
    };

    setMessages((prev) => {
      const nextMessages = prev.map(updateMessage);
      writeLocalConversationValue(JSON.stringify(nextMessages));
      return nextMessages;
    });

    if (appointmentDetails?.id === scheduleMessage.id) {
      setAppointmentDetails((prev) => (prev ? updateMessage(prev) : prev));
    }

    if (scheduleId) {
      const updatedSchedule = getBusinessSchedule().map((item) =>
        String(item.id) === String(scheduleId)
          ? mergeReminderMetadata(updateSchedule(item))
          : item
      );
      saveBusinessSchedule(updatedSchedule);
    }

    addNotification({
      type:
        confirmationStatus === "confirmed"
          ? "appointment_confirmed"
          : "appointment_change_requested",
      title:
        confirmationStatus === "confirmed"
          ? statusLabel
          : statusLabel,
      message: confirmationText,
      priority: "high",
      targetRole: "professional",
      requestId:
        scheduleMessage.requestId ||
        scheduleMessage.schedule?.requestId ||
        selectedHomeownerRequestId ||
        conversationId,
      scheduleId,
      conversationId,
    });

    createNotification({
      type:
        confirmationStatus === "confirmed"
          ? "appointment_confirmed"
          : "appointment_change_requested",
      title:
        confirmationStatus === "confirmed"
          ? statusLabel
          : statusLabel,
      message: confirmationText,
      role: "professional",
      requestId:
        scheduleMessage.requestId ||
        scheduleMessage.schedule?.requestId ||
        selectedHomeownerRequestId ||
        conversationId,
      conversationId,
      appointmentId: scheduleId,
      dedupeKey: `${confirmationStatus}:${scheduleId || scheduleMessage.id}`,
    });

    if (confirmationStatus === "change_requested") {
      setMessageText(t("appointmentDifferentTimeMessage", language));
      requestAnimationFrame(() => textareaRef.current?.focus());
    }

    window.dispatchEvent(new Event("meetro-messages-updated"));
    window.dispatchEvent(new Event("meetroJobRecordUpdated"));
    window.dispatchEvent(new Event("storage"));
  };

  const handleScheduleSwipeStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;

    scheduleSwipeStartRef.current = {
      x: touch.clientX || 0,
      y: touch.clientY || 0,
    };
  };

  const handleScheduleSwipeEnd = (event, scheduleMessage) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;

    const dx = (touch.clientX || 0) - scheduleSwipeStartRef.current.x;
    const dy = Math.abs((touch.clientY || 0) - scheduleSwipeStartRef.current.y);

    if (dx < -35 && dy < 90) {
      setSwipedScheduleId(scheduleMessage.id);
    }

    if (dx > 25) {
      setSwipedScheduleId(null);
    }
  };

  const clearLocalChat = () => {
    if (isCanonicalThread) return;

    localStorage.removeItem(storageKey);
    setMessages(starterMessages);
    setReplyingTo(null);
    setActiveMessageId(null);
    setPendingImage(null);
    setShowClearConfirm(false);
    window.dispatchEvent(new Event("meetro-messages-updated"));
  };

  const markUnread = () => {
    markConversationUnread(conversationId);
    setShowThreadMenu(false);
    setPage("messagesInbox");
  };

  const saveChatToHistory = () => {
    const latestThreadMessage = threadMessages[threadMessages.length - 1] || {};
    const latestThreadText =
      latestThreadMessage.text ||
      latestThreadMessage.content ||
      latestThreadMessage.title ||
      "";
    const fallback = {
      ...(selectedQuoteRequest || {}),
      ...(conversationRegistryItem || {}),
      id: conversationId,
      conversationId,
      project_title:
        activeHeaderProject ||
        selectedQuoteRequest?.project_title ||
        selectedQuoteRequest?.projectTitle ||
        activeHeaderName ||
        "Conversation",
      project_description:
        latestThreadText ||
        selectedQuoteRequest?.project_description ||
        selectedQuoteRequest?.projectDescription ||
        "Saved conversation for future reference.",
      homeowner_email:
        activeHeaderName ||
        selectedQuoteRequest?.homeowner_email ||
        conversationRegistryItem?.homeowner_email ||
        "Contact",
      location:
        activeLocation ||
        selectedQuoteRequest?.location ||
        conversationRegistryItem?.location ||
        "Saved Contact",
      conversation_type: conversationType || selectedQuoteRequest?.conversation_type || "standard",
      unread: false,
    };

    saveConversationToUserHistory(conversationId, fallback);
    setShowThreadMenu(false);
    setSaveNotice(
      t("conversationConversationSavedToHistory", language)
    );
    setTimeout(() => setSaveNotice(""), 2200);
  };

  const startReply = (message) => {
    setReplyingTo({
      id: message.id,
      sender: message.sender,
      text:
        message.type === "image"
          ? t("conversationImageAttached", language)
          : getLocalizedMessageField(message, "title") || getLocalizedMessageField(message, "text") || "",
    });

    setActiveMessageId(null);
    setShowMobileSheet(false);
  };

  const copyMessage = (message) => {
    const copyText = getLocalizedMessageField(message, "text");
    if (copyText) navigator.clipboard?.writeText(copyText);
    setActiveMessageId(null);
    setShowMobileSheet(false);
  };

  const openChatScheduleModal = () => {
    if (isHiringThread) return;

    setShowThreadMenu(false);
    setShowAttachMenu(false);
    setActiveMessageId(null);
    setShowMobileSheet(false);

    if (currentViewerRole !== "business") {
      setSaveNotice(
        t("conversationSchedulingIsManagedByTheProfessionalYouCanMessageThemAboutThe", language)
      );
      setTimeout(() => setSaveNotice(""), 2600);
      requestAnimationFrame(() => {
        textareaRef.current?.focus?.();
      });
      return;
    }

    handOffChatScheduleToWorkCenter();
  };

  const buildAppointmentReminderSystemMessage = (schedule, reminderResult) => {
    const scheduledReminders = reminderResult?.appointment?.reminders?.scheduled || [];
    if (!reminderResult?.ok || scheduledReminders.length === 0) return null;

    return {
      id: `appointment-reminders-${schedule.id}`,
      sender: "system",
      role: "system",
      senderRole: "system",
      type: "system",
      workflowType: "appointment_reminders",
      conversationId,
      scheduleId: schedule.id,
      text:
        t("conversationReminderScheduled1DayBefore2HoursBefore30MinutesBefore", language),
      time: formatMessageTime(new Date()),
      createdAt: new Date().toISOString(),
    };
  };

  const saveChatScheduleAppointment = async () => {
    if (isHiringThread) return;

    const schedule = getBusinessSchedule();
    const linkedRequestId =
      selectedHomeownerRequestId ||
      selectedQuoteRequest?.requestId ||
      selectedQuoteRequest?.id ||
      selectedHomeownerRequest?.requestId ||
      selectedHomeownerRequest?.id ||
      conversationId;
    const linkedRequestTitle =
      selectedQuoteRequest?.title ||
      selectedQuoteRequest?.projectTitle ||
      selectedHomeownerRequest?.title ||
      selectedHomeownerRequest?.projectTitle ||
      selectedConversation?.projectTitle ||
      activeProjectTitle ||
      chatScheduleForm.title ||
      activeName ||
      "";

    const appointmentMeta = {
      walkthrough: t("conversationWalkthrough", language),
      estimate: t("conversationEstimateVisit", language),
      consultation: t("momentDetailJourney_consultation", language),
      virtual: t("virtualMeeting", language),
      emergency: t("emergencyDispatch", language),
    };

    let newVisit = {
      id: `schedule-${Date.now()}`,
      appointmentType: chatScheduleForm.appointmentType || "walkthrough",
      date: chatScheduleForm.date || new Date().toISOString().slice(0, 10),
      time: chatScheduleForm.time || "12:00",
      title:
        chatScheduleForm.title ||
        (activeName ? `Visit with ${activeName}` : "Scheduled Visit"),
      location: chatScheduleForm.location || activeLocation || "Customer location",
      notes: chatScheduleForm.notes || "",
      status: "Scheduled",
      customerConfirmationStatus: "pending_customer_confirmation",
      confirmationStatus: "pending_customer_confirmation",
      conversationId,
      projectConversationId: conversationId,
      activeConversationId: conversationId,
      requestId: linkedRequestId,
      selectedHomeownerRequestId,
      customerName: activeCustomerName,
      homeownerName: activeCustomerName,
      businessName: activeBusinessName,
      requestTitle: linkedRequestTitle,
      projectTitle: linkedRequestTitle,
      selectedConversation,
      selectedHomeownerRequest,
      conversationType,
      source: "meetro_chat",
      workflowSource: "meetro_chat_schedule",
      workflowStage: "scheduling",
      workflowStatus: "pending_customer_confirmation",
      createdAt: new Date().toISOString(),
    };

    const reminderResult = await scheduleAppointmentReminderNotifications(newVisit, {
      viewerRole: "professional",
      language,
    });

    newVisit = reminderResult.appointment || newVisit;

    if (reminderResult.permissionDenied) {
      setAppointmentReminderNotice({
        context: "conversation",
        message:
          t("workCenterMeetroCanRemindYouAboutUpcomingAppointmentsNotificationsAreBlockedOpenIPhone", language),
      });
    } else {
      setAppointmentReminderNotice(null);
    }

    saveBusinessSchedule([newVisit, ...schedule]);

    localStorage.setItem("meetroWorkCenterTab", "schedule");
    localStorage.setItem("activeWorkCenterTab", "schedule");

    const scheduleMessage = {
      id: `schedule-msg-${Date.now()}`,
      sender: "business",
      role: "business",
      senderRole: "business",
      type: "schedule",
      conversationId,
      workflowSource: "meetro_chat_schedule",
      customerConfirmationStatus: "pending_customer_confirmation",
      confirmationStatus: "pending_customer_confirmation",
      titleKey: "messagesAppointmentScheduled",
      subtitleKey: "appointmentPendingConfirmation",
      subtitlePrefix: getDisplayScheduleSummary(newVisit),
      textKey: "conversationAppointmentScheduledMessage",
      textVariables: {
        date: newVisit.date,
        time: getDisplayScheduleTime(newVisit.time),
      },
      schedule: newVisit,
      time: formatMessageTime(new Date()),
      createdAt: new Date().toISOString(),
    };
    const reminderSystemMessage = buildAppointmentReminderSystemMessage(
      newVisit,
      reminderResult
    );
    const messagesToAdd = reminderSystemMessage
      ? [scheduleMessage, reminderSystemMessage]
      : [scheduleMessage];

    const existingMessages = JSON.parse(readLocalConversationValue() || "[]");
    writeLocalConversationValue(
      JSON.stringify([...existingMessages, ...messagesToAdd])
    );

    setMessages((prev) => [...prev, ...messagesToAdd]);

    createNotification({
      type: "appointment_scheduled",
      title: t("conversationAppointmentScheduled", language),
      message: t("conversationAppointmentNotification", language, {
        business: activeBusinessName || t("conversationProfessionalFallback", language),
        date: newVisit.date,
        time: getDisplayScheduleTime(newVisit.time),
      }),
      role: "homeowner",
      requestId: linkedRequestId,
      conversationId,
      appointmentId: newVisit.id,
      dedupeKey: `appointment_scheduled:${newVisit.id}`,
    });

    window.dispatchEvent(new Event("meetro-messages-updated"));
    window.dispatchEvent(new Event("meetroJobRecordUpdated"));
    window.dispatchEvent(new Event("storage"));

    setShowScheduleModal(false);
  };

  const saveMessageAsSchedule = async (message) => {
    if (isHiringThread) return;

    if (currentViewerRole !== "business") {
      setSaveNotice(
        t("conversationSchedulingIsManagedByTheProfessionalYouCanMessageThemAboutThe", language)
      );
      setTimeout(() => setSaveNotice(""), 2600);
      setActiveMessageId(null);
      setShowMobileSheet(false);
      return;
    }

    handOffChatScheduleToWorkCenter();
    setActiveMessageId(null);
    setShowMobileSheet(false);
  };

  const getStatusLabel = (status) => ({
    sending: t("stateSending", language),
    sent: t("stateSent", language),
    delivered: t("conversationStatusDelivered", language),
    seen: t("conversationStatusSeen", language),
    failed: t("stateFailed", language),
  })[status] || "";

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

  const openAppointmentDetails = (msg) => {
    setAppointmentDetails(msg);
    setJobStory(null);
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

    const existing = getJobRecord(conversationId);

    const savedItem = {
      id: `job-record-${Date.now()}`,
      conversationId,
      jobId:
        activeJobSnapshot?.jobId ||
        localStorage.getItem("activeJobId") ||
        conversationId,
      jobService:
        activeJobSnapshot?.service ||
        localStorage.getItem("activeJobService") ||
        localStorage.getItem("selectedEmergencyService") ||
        activeName,
      customer: activeCustomerName,
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

    saveJobRecord(conversationId, [savedItem, ...existing]);
    localStorage.setItem("lastSavedJobRecord", JSON.stringify(savedItem));

    window.dispatchEvent(new Event("meetroJobRecordUpdated"));
    setSaveNotice(
      t("conversationSavedToJobRecord", language)
    );
    setJobStory(null);

    setTimeout(() => setSaveNotice(""), 1800);
  };

  const canonicalComposerNoticeKey = !isCanonicalThread
    ? ""
    : canonicalConversationState.phase === "loading"
    ? "conversationCanonicalLoading"
    : canonicalConversationState.phase === "error"
    ? "conversationCanonicalUnavailable"
    : canonicalConversationState.canSendMessages !== true
    ? canonicalConversationState.status === "closed"
      ? "conversationCanonicalClosed"
      : "conversationCanonicalMessagingUnavailable"
    : "";
  const composerNoticeKey = isRequestOpportunityReadOnly
    ? "conversationOpportunityMessagingUnavailable"
    : canonicalComposerNoticeKey;
  const canUseMessageComposer = !composerNoticeKey;

  if (isHiringThread) {
    return (
      <div className="app-page meetro-responsive-page meetro-visual-page hiring-truth-page">
        <HiringUnavailableState
          language={language}
          onBack={() => setPage("messagesInbox")}
        />
      </div>
    );
  }

  return (
    <div
      className="conversation-thread-page chat-thread-page meetro-visual-page"
      style={embedded ? embeddedPage : page}
    >
      <style>{animations}</style>

      <div style={embedded ? embeddedPhone : phone}>
        <div className="chat-header" style={header}>
          <button
            style={headerBtn}
            onClick={() => {
              const routeReturnTo =
                window.history?.state?.returnTo ||
                window.history?.state?.usr?.returnTo ||
                "";
              const storedReturnPage =
                sessionStorage.getItem("conversationReturnPage") ||
                localStorage.getItem("conversationReturnPage") ||
                localStorage.getItem("returnPage") ||
                "";
              const returnSection =
                window.history?.state?.returnSection ||
                window.history?.state?.usr?.returnSection ||
                sessionStorage.getItem("conversationReturnSection") ||
                localStorage.getItem("conversationReturnSection") ||
                "";
              const isBusinessContext =
                isProfessionalSession() ||
                currentViewerRole === "business" ||
                currentViewerRole === "professional" ||
                localStorage.getItem("accountMode") === "business" ||
                localStorage.getItem("accountType") === "professional";

              const normalizeReturnPage = (value) => {
                if (!value) return "";
                if (value === "conversationThread") return "";
                if (value === "/contractor-dashboard") return "contractorDashboard";
                if (value === "/work-center") return "contractorDashboard";
                if (value === "/messages") return "messagesInbox";
                if (value === "/quote-builder") return "quoteBuilder";
                return value.replace(/^\//, "");
              };

              if (returnSection) {
                localStorage.setItem("meetroWorkCenterTab", returnSection);
                localStorage.setItem("activeWorkCenterTab", returnSection);
              }

              const returnPage =
                normalizeReturnPage(
                  canonicalRouteContext.returnPage
                ) ||
                normalizeReturnPage(routeReturnTo) ||
                normalizeReturnPage(storedReturnPage) ||
                (isBusinessContext ? "contractorDashboard" : "messagesInbox");

              setPage(returnPage);
            }}
          >
            <IconBack />
          </button>

          <button
            style={avatarProfileButton}
            aria-label={t("openRelationshipDetails", language)}
            onClick={openRelationshipDetails}
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

          <div
            style={headerIdentityButton}
            role="button"
            tabIndex={0}
            aria-label={t("openRelationshipDetails", language)}
            onClick={openRelationshipDetails}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openRelationshipDetails();
              }
            }}
          >
            <div style={name}>{activeHeaderName}</div>

            <div style={chatProjectLabel}>
              <span style={chatProjectTitleText}>
                 {isHiringThread
                   ? `${t("messagesSectionHiring", language)} · ${activeHeaderProject}`
                   : activeHeaderProject}
              </span>

              {!isHiringThread && relationshipHasCurrentWork && (
                <strong style={chatProjectStagePill}>
                  {activeProjectStageLabel}
                </strong>
              )}
            </div>

            {!isEmergencyConversation && (activeCategory || activeLocation) && (
              <div style={businessInfoLine}>
                {displayCategory && <span>{displayCategory}</span>}
                {displayCategory && displayLocation && <span>•</span>}
                {displayLocation && <span> {displayLocation}</span>}
              </div>
            )}

            <div style={statusRow}>
              {(!isCanonicalThread ||
                canonicalConversationState.status === "active") && (
                <span style={greenDot}></span>
              )}
              {isCanonicalThread
                ? canonicalConversationState.phase === "loading"
                  ? t("conversationCanonicalLoading", language)
                  : canonicalConversationState.phase === "error"
                  ? t("conversationCanonicalUnavailable", language)
                  : canonicalConversationState.status === "active"
                  ? t("conversationActiveNow", language)
                  : t("stateClosed", language)
                : typing
                ? t("conversationTyping", language)
                : t("conversationActiveNow", language)}

              {relationshipHasCurrentWork && (
                <span style={relationshipActiveWorkBadge}>
                  {t("relationshipActiveWork", language)}
                </span>
              )}

              {!isCanonicalThread && jobRecordCount > 0 && (
                <button
                  style={jobRecordMiniBadge}
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowJobRecords(true);
                  }}
                >
                   {jobRecordCount}
                </button>
              )}
            </div>
          </div>

          {hasActiveCallPhone && (
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
          )}

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

        {appointmentReminderNotice && (
          <div style={appointmentReminderNoticeCard}>
            <div>
              <strong>
                {t("conversationNotificationsNeeded", language)}
              </strong>
              <p>{appointmentReminderNotice.message}</p>
            </div>

            <div style={appointmentReminderNoticeActions}>
              <button
                type="button"
                style={appointmentReminderSettingsButton}
                onClick={openNotificationSettings}
              >
                {t("conversationOpenSettings", language)}
              </button>
              <button
                type="button"
                style={appointmentReminderContinueButton}
                onClick={() => setAppointmentReminderNotice(null)}
              >
                {t("conversationContinueWithoutReminders", language)}
              </button>
            </div>
          </div>
        )}

        {showProfileCard && (
          <div style={profileOverlay}>
            <RelationshipIdentityPage
              identity={{
                displayName: threadRelationshipIdentity.displayName,
                typeLabel: threadRelationshipIdentity.typeLabel,
                avatar: threadRelationshipIdentity.avatar,
                initials: threadRelationshipIdentity.initials,
                meta: threadRelationshipIdentity.meta,
                location: threadRelationshipIdentity.location,
              }}
              onBack={() => setShowProfileCard(false)}
              backLabel={t("actionBack", language)}
              intro={t("relationshipIdentityIntro", language)}
              details={relationshipIdentityFactRows}
              actions={relationshipIdentityActions}
              sections={relationshipIdentitySections}
            />
          </div>
        )}

        {tenantTicketDraft && (
          <div
            style={tenantTicketOverlay}
            role="dialog"
            aria-label={t("conversationTenantTicket", language)}
          >
            <div style={tenantTicketPanel}>
              <div style={tenantTicketHeader}>
                <button
                  type="button"
                  style={tenantTicketBackButton}
                  onClick={() => {
                    if (tenantTicketDraft.step === "review") {
                      updateTenantTicketDraft("step", "edit");
                      return;
                    }
                    setTenantTicketDraft(null);
                  }}
                >
                  {tenantTicketDraft.step === "review"
                    ? t("actionBack", language)
                    : t("actionCancel", language)}
                </button>
                <strong>
                  {tenantTicketDraft.step === "created"
                    ? t("conversationTicketCreated", language)
                    : tenantTicketDraft.step === "review"
                    ? t("conversationReviewTicket", language)
                    : t("conversationNewTenantTicket", language)}
                </strong>
                {tenantTicketDraft.step === "edit" ? (
                  <button
                    type="button"
                    style={tenantTicketHeaderAction}
                    onClick={reviewTenantTicketDraft}
                  >
                    {t("conversationReviewAction", language)}
                  </button>
                ) : tenantTicketDraft.step === "review" ? (
                  <button
                    type="button"
                    style={tenantTicketHeaderAction}
                    onClick={submitTenantTicketDraft}
                  >
                    {t("conversationSubmitAction", language)}
                  </button>
                ) : (
                  <button
                    type="button"
                    style={tenantTicketHeaderAction}
                    onClick={() => setTenantTicketDraft(null)}
                  >
                    {t("actionDone", language)}
                  </button>
                )}
              </div>

              {tenantTicketDraft.step === "edit" && (
                <form style={tenantTicketForm} onSubmit={reviewTenantTicketDraft}>
                  <label style={tenantTicketField}>
                    <span>{t("conversationPropertyUnit", language)}</span>
                    <input
                      value={tenantTicketDraft.propertyUnit}
                      onChange={(event) =>
                        updateTenantTicketDraft("propertyUnit", event.target.value)
                      }
                      placeholder="1225 Wales Dr, Unit 204"
                      style={tenantTicketInput}
                    />
                  </label>
                  <label style={tenantTicketField}>
                    <span>{t("conversationIssueType", language)}</span>
                    <select
                      value={tenantTicketDraft.issueType}
                      onChange={(event) =>
                        updateTenantTicketDraft("issueType", event.target.value)
                      }
                      style={tenantTicketInput}
                    >
                      <option value="Plumbing">{t("conversationIssuePlumbing", language)}</option>
                      <option value="HVAC">{t("conversationIssueHvac", language)}</option>
                      <option value="Electrical">{t("conversationIssueElectrical", language)}</option>
                      <option value="Appliance">{t("conversationIssueAppliance", language)}</option>
                      <option value="General Maintenance">{t("conversationIssueGeneralMaintenance", language)}</option>
                      <option value="Other">{t("conversationIssueOther", language)}</option>
                    </select>
                  </label>
                  <label style={tenantTicketField}>
                    <span>{t("conversationPriority", language)}</span>
                    <select
                      value={tenantTicketDraft.priority}
                      onChange={(event) =>
                        updateTenantTicketDraft("priority", event.target.value)
                      }
                      style={tenantTicketInput}
                    >
                      <option value="Low">{t("conversationPriorityLow", language)}</option>
                      <option value="Normal">{t("conversationPriorityNormal", language)}</option>
                      <option value="High">{t("conversationPriorityHigh", language)}</option>
                      <option value="Emergency">{t("conversationPriorityEmergency", language)}</option>
                    </select>
                  </label>
                  <label style={tenantTicketField}>
                    <span>{t("conversationDescription", language)}</span>
                    <textarea
                      value={tenantTicketDraft.description}
                      onChange={(event) =>
                        updateTenantTicketDraft("description", event.target.value)
                      }
                      placeholder={t("conversationDescribeNeedsAttention", language)}
                      style={tenantTicketTextarea}
                    />
                  </label>
                  <div style={tenantTicketPhotos}>
                    <span>{t("conversationPhotos", language)}</span>
                    <strong>{t("conversationPhotoUploadInTools", language)}</strong>
                  </div>
                  {tenantTicketDraft.notice && (
                    <p style={tenantTicketNotice}>{tenantTicketDraft.notice}</p>
                  )}
                  <button type="submit" style={tenantTicketPrimaryButton}>
                    {t("conversationReviewTicket", language)}
                  </button>
                </form>
              )}

              {tenantTicketDraft.step === "review" && (
                <div style={tenantTicketForm}>
                  <div style={tenantTicketReviewCard}>
                    <strong>{t("conversationTenantTicket", language)}</strong>
                    <span>{tenantTicketDraft.issueType}</span>
                    <div style={tenantTicketReviewRow}>
                      <span>{t("conversationPropertyUnit", language)}</span>
                      <strong>{tenantTicketDraft.propertyUnit}</strong>
                    </div>
                    <div style={tenantTicketReviewRow}>
                      <span>{t("conversationPriority", language)}</span>
                      <strong>{tenantTicketDraft.priority}</strong>
                    </div>
                    <div style={tenantTicketReviewRow}>
                      <span>{t("conversationDescription", language)}</span>
                      <strong>{tenantTicketDraft.description}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    style={tenantTicketPrimaryButton}
                    onClick={submitTenantTicketDraft}
                  >
                    {t("conversationSubmitTicket", language)}
                  </button>
                </div>
              )}

              {tenantTicketDraft.step === "created" && (
                <div style={tenantTicketSuccess}>
                  <div style={tenantTicketSuccessIcon}>✓</div>
                  <h2>{t("conversationTenantTicketCreated", language)}</h2>
                  <p>
                    {t("conversationTicketAddedToConversation", language, {
                      ticketId: tenantTicketDraft.createdTicketId,
                    })}
                  </p>
                  <button
                    type="button"
                    style={tenantTicketPrimaryButton}
                    onClick={() => setTenantTicketDraft(null)}
                  >
                    {t("continueConversation", language)}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {showCallMenu && (
          <div style={callMenu}>
            <button
              style={callMenuBtn}
              onClick={() => {
                setShowCallMenu(false);
                callActiveContact();
              }}
            >
              {t("messagesCallAction", language)}
            </button>

            <button style={callMenuBtn} onClick={openRelationshipDetails}>
              {relationshipIdentityActionLabel}
            </button>
          </div>
        )}

        {showThreadMenu && (
          <div style={threadMenu}>
            <div style={menuSection}>
              <div style={menuSectionTitle}>
                {t("conversationRelationshipKicker", language)}
              </div>

              <button
                style={threadMenuBtn}
                onClick={openRelationshipDetails}
              >
                {relationshipIdentityActionLabel}
              </button>

              {!isCanonicalThread &&
                (threadRelationshipSavedToContacts ? (
                  <button
                    style={{ ...threadMenuBtn, ...threadMenuBtnDisabled }}
                    disabled
                  >
                    {t("stateSaved", language)}
                  </button>
                ) : (
                  <button
                    style={threadMenuBtn}
                    onClick={saveThreadRelationshipToContacts}
                  >
                    {t("conversationSaveToContacts", language)}
                  </button>
                ))}

              {!isCanonicalThread && hasActiveCallPhone && (
                <button
                  style={threadMenuBtn}
                  onClick={() => {
                    setShowThreadMenu(false);
                    callActiveContact();
                  }}
                >
                  {t("messagesContactType_customer", language)}
                </button>
              )}

              {!isCanonicalThread && (
                <button
                  style={threadMenuBtn}
                  onClick={() => {
                    setShowProfileCard(false);
                    setShowThreadMenu(false);
                    setShowJobRecords(true);
                  }}
                >
                  {t("relationshipTimeline", language)}
                </button>
              )}
            </div>

            {!isCanonicalThread && (
              <div style={menuSection}>
                <div style={menuSectionTitle}>
                  {t("conversationResourcesKicker", language)}
                </div>

                <button
                  style={threadMenuBtn}
                  onClick={() => {
                    setShowThreadMenu(false);
                    setShowJobRecords(true);
                  }}
                >
                  {t("messagesDocuments", language)}
                </button>

                <button
                  style={threadMenuBtn}
                  onClick={() => {
                    setShowThreadMenu(false);
                    setShowJobRecords(true);
                  }}
                >
                  {t("assistantProjectBriefDocumentPhotos", language)}
                </button>

                {currentViewerRole === "business" && (
                <button
                  style={threadMenuBtn}
                    onClick={() => {
                      setShowThreadMenu(false);
                      openChatScheduleModal();
                    }}
                  >
                    {t("workCenterScheduleTitle", language)}
                  </button>
                )}
              </div>
            )}

            <div style={menuSection}>
              <div style={menuSectionTitle}>
                {t("conversationConversationKicker", language)}
              </div>

              <button
                style={threadMenuBtn}
                onClick={() => {
                  setShowThreadMenu(false);
                  markUnread();
                }}
              >
                {t("conversationMarkUnread", language)}
              </button>

              {!isCanonicalThread ? (
              <button
                style={{
                  ...threadMenuBtn,
                  ...(threadUserSavedToHistory ? threadMenuBtnDisabled : {}),
                }}
                onClick={() => {
                  if (threadUserSavedToHistory) return;
                  saveChatToHistory();
                }}
                disabled={threadUserSavedToHistory}
              >
                {threadUserSavedToHistory
                  ? t("conversationSavedToHistory", language)
                  : t("conversationSaveToHistory", language)}
              </button>
              ) : null}

              <button
                style={threadMenuBtn}
                onClick={() => {
                  setShowThreadMenu(false);
                  setTimeout(() => {
                    threadSearchInputRef.current?.focus();
                  }, 0);
                }}
              >
                {t("conversationSearchAction", language)}
              </button>

              {!isCanonicalThread ? (
              <button
                style={{ ...threadMenuBtn, color: "#ef4444" }}
                onClick={() => {
                  setShowThreadMenu(false);
                  setShowClearConfirm(true);
                }}
              >
                {t("conversationClearLocalChat", language)}
              </button>
              ) : null}
            </div>
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
                  {emergencyPanelExpanded
                    ? t("conversationHideDetails", language)
                    : t("conversationReviewDetails", language)}
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
                      ? t("conversationServiceCompleted", language)
                      : emergencyServiceName}
                  </div>

                  <div style={emergencyBannerSubtitle}>
                    {currentViewerRole === "business" &&
                    emergencyDispatchStatus !== "completed"
                      ? `${t("messagesContactType_customer", language)}: ${emergencyCustomerName}`
                      : `${emergencyBusinessName} • ${emergencyStatusSubtitle || ""}`}
                  </div>
                </div>
              </div>

              {currentViewerRole === "business" && (
                <div style={emergencyChatActions}>
                  {isCanonicalEmergencyThread &&
                    canonicalEmergencyAllowedActions.includes(
                      EMERGENCY_DISPATCH_ACTIONS.MARK_EN_ROUTE
                    ) && (
                      <button
                        style={emergencyPrimaryAction}
                        disabled={canonicalDispatchPending}
                        onClick={() =>
                          advanceEmergencyFromChat(
                            EMERGENCY_DISPATCH_ACTIONS.MARK_EN_ROUTE
                          )
                        }
                      >
                        {t("onTheWay", language)}
                      </button>
                    )}

                  {isCanonicalEmergencyThread &&
                    canonicalEmergencyAllowedActions.includes(
                      EMERGENCY_DISPATCH_ACTIONS.MARK_ARRIVED
                    ) && (
                      <button
                        style={emergencyPrimaryAction}
                        disabled={canonicalDispatchPending}
                        onClick={() =>
                          advanceEmergencyFromChat(
                            EMERGENCY_DISPATCH_ACTIONS.MARK_ARRIVED
                          )
                        }
                      >
                        {t("arrived", language)}
                      </button>
                    )}

                  {isCanonicalEmergencyThread &&
                    canonicalEmergencyAllowedActions.includes(
                      EMERGENCY_DISPATCH_ACTIONS.START_WORK
                    ) && (
                      <button
                        style={emergencyPrimaryAction}
                        disabled={canonicalDispatchPending}
                        onClick={() =>
                          advanceEmergencyFromChat(
                            EMERGENCY_DISPATCH_ACTIONS.START_WORK
                          )
                        }
                      >
                        {t("startWork", language)}
                      </button>
                    )}

                  {isCanonicalEmergencyThread &&
                    canonicalEmergencyAllowedActions.includes(
                      EMERGENCY_DISPATCH_ACTIONS.COMPLETE_WORK
                    ) && (
                      <button
                        style={completeFromChatBtn}
                        disabled={canonicalDispatchPending}
                        onClick={() =>
                          advanceEmergencyFromChat(
                            EMERGENCY_DISPATCH_ACTIONS.COMPLETE_WORK
                          )
                        }
                      >
                        {t("completeEmergency", language)}
                      </button>
                    )}

                  {canonicalDispatchPending && (
                    <div style={canonicalDispatchNotice} role="status">
                      {t("emergencyDispatchUpdating", language)}
                    </div>
                  )}

                  {canonicalDispatchErrorKey && (
                    <div style={canonicalDispatchError} role="alert">
                      {t(canonicalDispatchErrorKey, language)}
                    </div>
                  )}

                  {!isCanonicalEmergencyThread &&
                    (!emergencyDispatchStatus ||
                    emergencyDispatchStatus === "pending") && (
                    <button
                      style={emergencyPrimaryAction}
                      onClick={() => advanceEmergencyFromChat("accepted")}
                    >
                      {t("acceptDispatch")}
                    </button>
                  )}

                  {!isCanonicalEmergencyThread &&
                    emergencyDispatchStatus === "accepted" && (
                    <button
                      style={emergencyPrimaryAction}
                      onClick={() => advanceEmergencyFromChat("enroute")}
                    >
                      {t("onTheWay")}
                    </button>
                  )}

                  {!isCanonicalEmergencyThread &&
                    emergencyDispatchStatus === "enroute" && (
                    <button
                      style={emergencyPrimaryAction}
                      onClick={() => advanceEmergencyFromChat("arrived")}
                    >
                      {t("arrived")}
                    </button>
                  )}

                  {!isCanonicalEmergencyThread &&
                    emergencyDispatchStatus === "arrived" && (
                    <button
                      style={emergencyPrimaryAction}
                      onClick={() => advanceEmergencyFromChat("started")}
                    >
                      {t("startWork")}
                    </button>
                  )}

                  {!isCanonicalEmergencyThread &&
                    emergencyDispatchStatus === "started" && (
                    <button
                      style={completeFromChatBtn}
                      onClick={() => advanceEmergencyFromChat("completed")}
                    >
                      {t("completeEmergency")}
                    </button>
                  )}

                  {!isCanonicalEmergencyThread &&
                    emergencyDispatchStatus === "completed" && (
                    <button
                      style={completeFromChatBtn}
                      onClick={() => {
                        localStorage.setItem(
                          "completionService",
                          emergencyServiceName || "Emergency Service"
                        );
                        localStorage.setItem(
                          "completionLocation",
                          activeLocation || activeEmergencyRecord.location || ""
                        );
                        localStorage.setItem("completionSource", "emergency");
                        setPage("completionSheet");
                      }}
                    >
                      {t("openCompletionSheet")}
                    </button>
                  )}
                </div>
              )}

              {emergencyPanelExpanded && (
                <>
                  <div style={emergencyPillRow}>
                    {emergencyDispatchStatus === "completed" ? (
                      isCanonicalEmergencyThread ? (
                        <div style={completedEmergencyPill}>
                          {t("completed", language)}
                        </div>
                      ) : (
                        <>
                          <div style={completedEmergencyPill}> {t("completed")}</div>
                          <div style={completedEmergencyPill}>
                             {t("conversationClosurePending", language)}
                          </div>
                          <div style={completedEmergencyPill}> {t("summary")}</div>
                        </>
                      )
                    ) : isCanonicalEmergencyThread ? (
                      <>
                        <div style={emergencyPill}>
                          {t("active", language)}
                        </div>
                        <div style={emergencyPill}>
                          {emergencyStatusSubtitle}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={emergencyPill}>
                           {t("active")}
                        </div>

                        <div style={emergencyPill}>
                           {emergencyDispatchStatus === "started"
                            ? t("inProgress")
                            : emergencyDispatchStatus === "arrived"
                            ? t("arrived")
                            : "ETA 10m"}
                        </div>

                        <div style={emergencyPill}>
                           {emergencyDispatchStatus === "enroute"
                            ? t("live")
                            : t("status")}
                        </div>
                      </>
                    )}
                  </div>

                  <div style={emergencyTimeline}>
                {[
                  t("requested"),
                  t("accepted"),
                  t("onTheWay"),
                  t("arrived"),
                  t("workStarted"),
                  t("completed"),
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

                  {isCanonicalEmergencyThread &&
                    canonicalConversationDetail.location && (
                      <div style={canonicalEmergencyLocationCard}>
                        <strong>
                          {t("emergencyLocationDetails", language)}
                        </strong>
                        <p>
                          {
                            canonicalConversationDetail.location
                              .locationText
                          }
                        </p>
                        {canonicalConversationDetail.location
                          .unitNumber && (
                          <p>
                            <span>
                              {t("emergencyUnitLabel", language)}:
                            </span>{" "}
                            {
                              canonicalConversationDetail.location
                                .unitNumber
                            }
                          </p>
                        )}
                        {canonicalConversationDetail.location
                          .accessNotes && (
                          <p>
                            <span>
                              {t(
                                "emergencyAccessNotesLabel",
                                language
                              )}
                              :
                            </span>{" "}
                            {
                              canonicalConversationDetail.location
                                .accessNotes
                            }
                          </p>
                        )}
                      </div>
                    )}

                  {!isCanonicalEmergencyThread &&
                    emergencyDispatchStatus === "completed" &&
                    currentViewerRole !== "business" && (
                    <div style={completedActionRow}>
                      <button
                        style={historyBtn}
                        onClick={() => {
                          setPage("emergencyComplete");
                        }}
                      >
                         {t("assistantFieldActionReviewCompletion", language)}
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
                         {t("summary")}
                      </button>
                    </div>
                  )}

                  {!isCanonicalEmergencyThread &&
                    emergencyDispatchStatus !== "completed" && (
                    <div style={routePreviewCard}>
                    <div style={routePreviewTop}>
                      <div style={routePreviewTitleWrap}>
                        <div style={routePreviewTitle}>
                          {t("liveRoutePreview")}
                        </div>

                        <div style={routePreviewSubtitle}>
                          {t("professionalToCustomer")}
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
                        {t("viewRoute")}
                      </button>
                    </div>

                    <div style={routeMapPlaceholder}>
                      <div style={routeLine}></div>

                      <div style={routePinStart}></div>

                      <div style={routePinEnd}></div>
                    </div>
                    </div>
                  )}

                </>
              )}
            </div>
          )}

          {showScheduleModal && (
            <div style={scheduleModalOverlay}>
              <div style={scheduleModalCard}>
                <h3 style={scheduleModalTitle}>
                  {t("conversationScheduleEvaluation", language)}
                </h3>

                <p style={scheduleModalSubtitle}>
                  {t("conversationScheduleEvaluationHelp", language)}
                </p>

                <select
                  style={scheduleModalInput}
                  value={chatScheduleForm.appointmentType}
                  onChange={(e) =>
                    setChatScheduleForm({
                      ...chatScheduleForm,
                      appointmentType: e.target.value,
                    })
                  }
                >
                  <option value="walkthrough">
                    {t("conversationWalkthrough", language)}
                  </option>
                  <option value="estimate">
                    {t("conversationEstimateVisit", language)}
                  </option>
                  <option value="consultation">
                    {t("momentDetailJourney_consultation", language)}
                  </option>
                  <option value="virtual">
                    {t("virtualMeeting", language)}
                  </option>
                  <option value="emergency">
                    {t("emergencyDispatch", language)}
                  </option>
                </select>

                <input
                  style={scheduleModalInput}
                  value={chatScheduleForm.title}
                  placeholder={t("conversationAppointmentTitle", language)}
                  onChange={(e) =>
                    setChatScheduleForm({
                      ...chatScheduleForm,
                      title: e.target.value,
                    })
                  }
                />

                <div style={scheduleModalGrid}>
                  <input
                    style={scheduleModalInput}
                    type="date"
                    value={chatScheduleForm.date}
                    onChange={(e) =>
                      setChatScheduleForm({
                        ...chatScheduleForm,
                        date: e.target.value,
                      })
                    }
                  />

                  <input
                    style={scheduleModalInput}
                    type="time"
                    value={chatScheduleForm.time}
                    onChange={(e) =>
                      setChatScheduleForm({
                        ...chatScheduleForm,
                        time: e.target.value,
                      })
                    }
                  />
                </div>

                <input
                  style={scheduleModalInput}
                  value={chatScheduleForm.location}
                  placeholder={t("assistantProjectBriefLocation", language)}
                  onChange={(e) =>
                    setChatScheduleForm({
                      ...chatScheduleForm,
                      location: e.target.value,
                    })
                  }
                />

                <textarea
                  style={scheduleModalTextarea}
                  value={chatScheduleForm.notes}
                  placeholder={t("messagesNotes", language)}
                  onChange={(e) =>
                    setChatScheduleForm({
                      ...chatScheduleForm,
                      notes: e.target.value,
                    })
                  }
                />

                <div style={scheduleModalActions}>
                  <button
                    style={scheduleModalSecondary}
                    onClick={() => setShowScheduleModal(false)}
                  >
                    {t("actionCancel", language)}
                  </button>

                  <button
                    style={scheduleModalPrimary}
                    onClick={saveChatScheduleAppointment}
                  >
                    {t("saveAppointment", language)}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="chat-messages conversation-messages" style={messagesScroll}>
            <div style={threadSearchRow}>
              <div style={threadSearchInputWrap}>
                <span style={threadSearchIcon} aria-hidden="true">
                  <IconSearchClean />
                </span>

                <input
                  ref={threadSearchInputRef}
                  style={threadSearchInput}
                  type="text"
                  value={threadSearchTerm}
                  onChange={(event) => setThreadSearchTerm(event.target.value)}
                  placeholder={
                    t("conversationSearchPlaceholder", language)
                  }
                />

                {hasThreadSearch ? (
                  <button
                    type="button"
                    style={threadSearchClear}
                    onClick={() => setThreadSearchTerm("")}
                    aria-label={t("discoverClearSearch", language)}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>

            <div style={dateRow}>
              <span style={dateLine}></span>
              <strong>{t("today", language)}</strong>
              <span style={dateLine}></span>
            </div>

            {threadMessages.length === 0 && hasThreadSearch ? (
              <div style={{ ...timelineTopEmpty, textAlign: "center" }}>
                {t("conversationNoSearchMessages", language)}
              </div>
            ) : null}

            {isCanonicalThread && canonicalMessagesPhase === "loading" ? (
              <div style={{ ...timelineTopEmpty, textAlign: "center" }} role="status">
                {t("conversationCanonicalLoading", language)}
              </div>
            ) : null}

            {isCanonicalThread && canonicalMessagesPhase === "error" ? (
              <div style={{ ...timelineTopEmpty, textAlign: "center" }} role="alert">
                {t(
                  canonicalLoadErrorKey ||
                    "conversationCanonicalMessagesUnavailable",
                  language
                )}
              </div>
            ) : null}

            {threadMessages.length === 0 &&
            !hasThreadSearch &&
            (!isCanonicalThread || canonicalMessagesPhase === "ready") ? (
              <div style={{ ...timelineTopEmpty, textAlign: "center" }}>
                {t("conversationNoMessages", language)}
              </div>
            ) : null}

          {threadMessages.map((msg) => {
            const mine = msg.senderRole === currentViewerRole;
            const localizedTitle = getLocalizedMessageField(msg, "title");
            const localizedSubtitle = getLocalizedMessageField(msg, "subtitle");
            const localizedText = getLocalizedMessageField(msg, "text");

            const isWorkflow = isWorkflowType(msg.type);
            const workflowMessageProps = isWorkflow
              ? getWorkflowMessageProps(msg, language)
              : null;

            const workflowRenderProps = isWorkflow
                ? {
                  msg,
                  language,
                  currentViewerRole,
                  reviewProjectAction: () => openReviewProjectFromMessage(msg),
                  conversation: {
                    id: conversationId,
                    requestId: selectedQuoteRequest?.requestId || selectedQuoteRequest?.id || conversationId,
                    projectTitle: activeProjectTitle || activeName || "Project",
                    title: activeProjectTitle || activeName || "Project",
                    type: conversationType,
                  },
                  setMessages,
                  setMessageText,
                  setPage,
                }
              : null;
            const isReceiptDocument = isReceiptDocumentMessage(msg);

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
              msg.type === "tenant_ticket" ||
              msg.type === "photoWorkflow" ||
              isReceiptDocument;
            const hideDocumentOperationalHeader =
              isDocumentWorkflowMessage(msg) || isReceiptDocument;

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
                  <div style={{ position: "relative", overflow: "hidden" }}>
                    {msg.type === "schedule" &&
                      currentViewerRole === "business" &&
                      swipedScheduleId === msg.id && (
                      <button
                        style={scheduleDeleteSwipeButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          setScheduleDeleteCandidate(msg);
                        }}
                      >
                        {t("delete", language)}
                      </button>
                    )}

                    <div
                      style={{
                        ...operationalCard,
                        touchAction: msg.type === "schedule" ? "pan-y" : "auto",
                        transform:
                          msg.type === "schedule" && swipedScheduleId === msg.id
                            ? "translateX(-76px)"
                            : "translateX(0)",
                        transition: "transform 0.2s ease",
                      }}
                      onTouchStart={(event) => {
                        if (msg.type === "schedule" && currentViewerRole === "business") {
                          handleScheduleSwipeStart(event);
                        }
                      }}
                      onTouchEnd={(event) => {
                        if (msg.type === "schedule" && currentViewerRole === "business") {
                          handleScheduleSwipeEnd(event, msg);
                        }
                      }}
                      onClick={() =>
                        msg.type === "schedule"
                          ? openAppointmentDetails(msg)
                          : openJobStory(msg)
                      }
                    >
                    {!hideDocumentOperationalHeader ? (
                      <div style={operationalHeader}>
                      <span style={operationalIcon}>
                        {msg.type === "update" && <IconUpdateClean />}
                        {msg.type === "approval" && <IconApprovalClean />}
                        {msg.type === "payment" && <IconPaymentClean />}
                        {(msg.type === "materials" || msg.type === "materials-list") && (
                          <IconMaterialsClean />
                        )}
                        {(msg.type === "schedule" || msg.type === "schedule-update") && (
                          <IconCalendarClean />
                        )}
                        {(msg.type === "location" || msg.type === "location-share") && (
                          <IconLocationClean />
                        )}
                        {(msg.type === "scan" || msg.type === "scan-share") && (
                          <IconScanClean />
                        )}
                        {msg.type === "tenant_ticket" && <IconIssueClean />}
                        {msg.type === "photoWorkflow" &&
                          (resolvePhotoWorkflowIcon(msg.photoType || msg.workflowType) || workflowMessageProps?.icon)}
                        {(msg.type === "workflow_change_request" || msg.type === "workflow-change") && (
                          <IconChangeRequestClean />
                        )}
                        {!msg.type &&
                          workflowMessageProps?.icon}
                        {msg.type &&
                          ![
                            "update",
                            "approval",
                            "payment",
                            "materials",
                            "materials-list",
                            "schedule",
                            "schedule-update",
                            "location",
                            "location-share",
                            "scan",
                            "scan-share",
                            "tenant_ticket",
                            "photoWorkflow",
                            "workflow_change_request",
                            "workflow-change",
                          ].includes(msg.type) &&
                          workflowMessageProps?.icon}
                      </span>

                      <div>
                        <strong>
                          {getLocalizedMessageField(msg, "title") ||
                            (workflowMessageProps
                              ? workflowMessageProps.title
                              : msg.type === "materials-list"
                              ? t("materialsList", language)
                              : msg.type === "schedule"
                              ? t("messagesScheduledVisit", language)
                              : "")}
                        </strong>

                        <div style={operationalSubtitle}>
                          {getLocalizedMessageField(msg, "subtitle") ||
                            (workflowMessageProps
                              ? workflowMessageProps.subtitle
                              : msg.type === "materials-list"
                              ? msg.approvalRequired
                                ? t("conversationCustomerApprovalRequired", language)
                                : t("conversationMaterialsSent", language)
                              : msg.type === "schedule" && msg.schedule
                              ? getDisplayScheduleSummary(msg.schedule)
                              : "")}
                        </div>
                      </div>
                    </div>
                    ) : null}

                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt=""
                        style={operationalImage}
                        onClick={(e) => {
                          e.stopPropagation();
                          openImageGallery(msg);
                        }}
                      />
                    )}

                    {msg.type === "tenant_ticket" && msg.ticket && (
                      <div style={scheduleCardDetails}>
                        <div style={scheduleCustomerTitle}>
                          {t("conversationTicketCreated", language)}
                        </div>
                        <div style={scheduleDetailRow}>
                          <span>{t("conversationTicketNumber", language)}</span>
                          <strong>{msg.ticket.id}</strong>
                        </div>
                        {msg.ticket.propertyUnit && (
                          <div style={scheduleDetailRow}>
                            <span>{t("conversationPropertyUnit", language)}</span>
                            <strong>{msg.ticket.propertyUnit}</strong>
                          </div>
                        )}
                        {msg.ticket.issueType && (
                          <div style={scheduleDetailRow}>
                            <span>{t("conversationIssueType", language)}</span>
                            <strong>{msg.ticket.issueType}</strong>
                          </div>
                        )}
                        {msg.ticket.issue && (
                          <div style={scheduleDetailRow}>
                            <span>{t("messagesDescription", language)}</span>
                            <strong>{msg.ticket.issue}</strong>
                          </div>
                        )}
                        {msg.ticket.priority && (
                          <div style={scheduleDetailRow}>
                            <span>{t("messagesPriority", language)}</span>
                            <strong>{msg.ticket.priority}</strong>
                          </div>
                        )}
                        <div style={scheduleDetailRow}>
                          <span>{t("teamMemberStatus", language)}</span>
                          <strong>{msg.ticket.status || "Open"}</strong>
                        </div>
                      </div>
                    )}

                    {msg.type === "schedule" && msg.schedule && (
                      <div style={scheduleCardDetails}>
                        <div style={scheduleCustomerTitle}>
                          {getScheduleCardTitle(msg)}
                        </div>
                        <div style={scheduleDetailRow}>
                          <span>
                            {isWorkScheduleMessage(msg)
                              ? t("services", language)
                              : t("appointmentType", language)}
                          </span>
                          <strong>
                            {isWorkScheduleMessage(msg)
                              ? getScheduleServices(msg).length > 1
                                ? t("conversationServiceCount", language, {
                                    count: getScheduleServices(msg).length,
                                  })
                                : getScheduleServices(msg)[0] ||
                                  t("scheduledVisit", language)
                              : msg.schedule.appointmentType ||
                                msg.schedule.type ||
                                t("scheduledVisit", language)}
                          </strong>
                        </div>

                        <div style={scheduleDetailRow}>
                          <span>{t("date", language)}</span>
                          <strong>{msg.schedule.date || "—"}</strong>
                        </div>

                        <div style={scheduleDetailRow}>
                          <span>{t("time", language)}</span>
                          <strong>{getDisplayScheduleTime(msg.schedule.time)}</strong>
                        </div>

                        <div style={scheduleDetailRow}>
                          <span>{t("jobsHiringLocationPlaceholder", language)}</span>
                          <strong>{msg.schedule.location || "—"}</strong>
                        </div>

                        {isWorkScheduleMessage(msg) &&
                          getScheduleServices(msg).length > 1 && (
                            <div style={scheduleDetailNotes}>
                              <span>{t("services", language)}</span>
                              <ul style={scheduleServiceList}>
                                {getScheduleServices(msg).map((service, index) => (
                                  <li key={`${service}-${index}`}>{service}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {msg.schedule.notes && (
                          <div style={scheduleDetailNotes}>
                            <span>{t("scheduleNotes", language)}</span>
                            <p>{msg.schedule.notes}</p>
                          </div>
                        )}

                        <div style={scheduleStatusPill}>
                          {getAppointmentConfirmationLabel(
                            getAppointmentConfirmationStatus(msg)
                          )}
                        </div>

                        {isCustomerFacingPendingAppointment(msg) && (
                          <div style={appointmentActionRow}>
                            <button
                              style={appointmentConfirmButton}
                              onClick={(event) => {
                                event.stopPropagation();
                                updateScheduleConfirmationStatus(msg, "confirmed");
                              }}
                            >
                              {t("confirmAppointment", language)}
                            </button>

                            <button
                              style={appointmentRequestTimeButton}
                              onClick={(event) => {
                                event.stopPropagation();
                                updateScheduleConfirmationStatus(
                                  msg,
                                  "change_requested"
                                );
                              }}
                            >
                              {t("requestDifferentTime", language)}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {msg.type === "materials-list" &&
                      Array.isArray(msg.materials) && (
                        <div style={materialsListCard}>
                          {msg.materials.slice(0, 6).map((item) => (
                            <div key={item.id || item.title} style={materialsListRow}>
                              <span style={materialsListName}>
                                {item.title}
                              </span>

                              <strong style={materialsListAmount}>
                                {item.quantity || "1"} × {item.status || "needed"}
                              </strong>
                            </div>
                          ))}

                          {msg.materials.length > 6 && (
                            <p style={materialsMoreText}>
                              +{msg.materials.length - 6}{" "}
                              {t("conversationMore", language)}
                            </p>
                          )}
                        </div>
                      )}

                    {msg.type === "hiring-interview" && (
                      <section style={hiringInterviewMessageCard} aria-label={getLocalizedMessageField(msg, "title") || t("interviewDetails", language)}>
                        <strong>{getLocalizedMessageField(msg, "title") || t("interviewScheduled", language)}</strong>
                        <span>{t("position", language)}: {msg.positionTitle}</span>
                        <span>{t("date", language)}: {msg.interviewDate || t("required", language)}</span>
                        <span>{t("startTime", language)}: {[msg.startTime, msg.endTime].filter(Boolean).join("–")}</span>
                        <span>{t("interviewType", language)}: {t(`hiringInterviewType${msg.interviewType === "in_person" ? "InPerson" : String(msg.interviewType || "phone")[0].toUpperCase() + String(msg.interviewType || "phone").slice(1)}`, language)}</span>
                        {msg.location && <span>{t("location", language)}: {msg.location}</span>}
                        {/^https?:\/\//i.test(msg.meetingUrl || "") && <a href={msg.meetingUrl} target="_blank" rel="noreferrer" aria-label={t("meetingLink", language)}>{t("meetingLink", language)}</a>}
                        <span>{t(`hiringInterviewStatus${String(msg.interviewStatus || "scheduled")[0].toUpperCase()}${String(msg.interviewStatus || "scheduled").slice(1)}`, language)}</span>
                      </section>
                    )}

                    {msg.type === "approval" && (
                      <div style={approvalActions}>
                        <button style={approveBtn}>
                          {t("conversationApprove", language)}
                        </button>

                        <button style={requestChangeBtn}>
                          {t("requestChange", language)}
                        </button>
                      </div>
                    )}

                    {isWorkflowMessageType(msg, "workflow_change_request") && (
                      <UniversalDocumentCard
                        documentType="changeOrder"
                        language={language}
                        projectTitle={
                          msg.projectTitle ||
                          getLocalizedMessageField(msg, "title") ||
                          activeProjectTitle ||
                          selectedQuoteRequest?.projectTitle ||
                          selectedQuoteRequest?.title ||
                          t("project", language)
                        }
                        amount={getChangeOrderAmount(msg)}
                        status={getChangeOrderDocumentStatus(msg, language)}
                        icon="proposal"
                        reviewProjectAction={() =>
                          openReviewProjectFromMessage({
                            ...selectedQuoteRequest,
                            ...msg,
                            requestId:
                              msg.requestId ||
                              msg.request_id ||
                              selectedQuoteRequest?.requestId ||
                              selectedQuoteRequest?.id ||
                              selectedHomeownerRequestId ||
                              conversationId,
                          })
                        }
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

                    {isReceiptDocument && (
                      <UniversalDocumentCard
                        documentType="receipt"
                        language={language}
                        projectTitle={
                          msg.projectTitle ||
                          getLocalizedMessageField(msg, "title") ||
                          msg.receipt?.service ||
                          activeProjectTitle ||
                          selectedQuoteRequest?.projectTitle ||
                          selectedQuoteRequest?.title ||
                          t("documentReceipt", language)
                        }
                        amount={
                          msg.receipt?.total ||
                          msg.receipt?.amount ||
                          msg.total ||
                          msg.amount ||
                          ""
                        }
                        status={getReceiptDocumentStatus(msg, language)}
                        icon="quickInvoice"
                        reviewProjectAction={() =>
                          openReviewProjectFromMessage({
                            ...selectedQuoteRequest,
                            ...msg,
                            ...msg.receipt,
                            requestId:
                              msg.requestId ||
                              msg.request_id ||
                              selectedQuoteRequest?.requestId ||
                              selectedQuoteRequest?.id ||
                              selectedHomeownerRequestId ||
                              conversationId,
                          })
                        }
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

                    {isWorkflowMessageType(msg, "workflow_quote_sent") && (
                      <UniversalDocumentCard
                        documentType="quote"
                        language={language}
                        projectTitle={
                          msg.projectTitle ||
                          getLocalizedMessageField(msg, "title") ||
                          selectedQuoteRequest?.projectTitle ||
                          selectedQuoteRequest?.title ||
                          t("documentQuote", language)
                        }
                        amount={
                          msg.total ||
                          msg.amount ||
                          msg.quoteAmount ||
                          selectedQuoteRequest?.total ||
                          selectedQuoteRequest?.quoteAmount ||
                          selectedQuoteRequest?.amount
                        }
                        status={getQuoteDocumentStatus(msg, language)}
                        icon="quote"
                        reviewProjectAction={() =>
                          openReviewProjectFromMessage({
                            ...selectedQuoteRequest,
                            ...msg,
                            requestId:
                              msg.requestId ||
                              msg.request_id ||
                              selectedQuoteRequest?.requestId ||
                              selectedQuoteRequest?.id ||
                              selectedHomeownerRequestId ||
                              conversationId,
                          })
                        }
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

                    <div style={operationalTime}>{formatMessageTime(msg.time)}</div>
                    </div>
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
                          ? t("messagesOwnerYou", language)
                          : activeName}
                      </strong>
                      <span>{msg.replyTo.text}</span>
                    </div>
                  )}

                  {msg.type === "image" && msg.imageUrl && (() => {
                    const mediaText = [localizedTitle, localizedSubtitle, localizedText];
                    const normalized = (value) =>
                      (value || "").trim().toLowerCase().replace(/\s+/g, " ");
                    const imageLines = mediaText.filter(Boolean).filter(
                      (value, index, array) =>
                        array.findIndex((item) => normalized(item) === normalized(value)) === index
                    );
                    const shouldRenderImageText = Boolean(
                      localizedText &&
                        !isDefaultImageCaption(localizedText)
                    );

                    return (
                      <>
                        {imageLines[0] ? <div style={imageTitle}>{imageLines[0]}</div> : null}
                        {imageLines[1] ? (
                          <div style={imageSubtitle}>{imageLines[1]}</div>
                        ) : null}

                        <img
                          src={msg.imageUrl}
                          alt=""
                          style={imageMessage}
                          onClick={(e) => {
                            e.stopPropagation();
                            openImageGallery(msg);
                          }}
                        />

                        {shouldRenderImageText ? (
                          <div style={imageSubtitle}>{localizedText}</div>
                        ) : null}
                      </>
                    );
                  })()}

                  {msg.type === "location" && (
                    <div style={richCard}>
                      <div style={richIconWrap}>
                        <IconLocationClean />
                      </div>
                      <div>
                        <strong>{localizedTitle}</strong>
                        <p>{localizedSubtitle}</p>
                      </div>
                    </div>
                  )}

                  {msg.type === "scan" && (
                    <div style={richCard}>
                      <div style={richIconWrap}>
                        <IconScanClean />
                      </div>
                      <div>
                        <strong>{localizedTitle}</strong>
                        <p>{localizedSubtitle}</p>
                      </div>
                    </div>
                  )}

                  {msg.type !== "image" ? (
                    <div style={messageTextBlock}>{localizedText}</div>
                  ) : null}

                  <div style={timeRow}>
                    <span>{formatMessageTime(msg.time)}</span>
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
              {t("conversationReply", language)}
            </button>

            <button style={actionBtn} onClick={() => copyMessage(activeMessage)}>
              {t("conversationCopy", language)}
            </button>

            {!isHiringThread && (
              <button
                style={actionBtn}
                onClick={() => saveMessageAsSchedule(activeMessage)}
              >
                 {t("assistantActionOpenSchedule", language)}
              </button>
            )}

            {!isCanonicalThread &&
              activeMessage.senderRole === currentViewerRole && (
              <button
                style={{ ...actionBtn, color: "#ef4444" }}
                onClick={() => unsendMessage(activeMessage.id)}
              >
                {t("conversationUnsend", language)}
              </button>
            )}
          </div>
        )}

        </div>

        <div className="chat-bottom-stack" style={bottomStack}>
          {canUseMessageComposer &&
          !showAttachMenu &&
          !isLandscape &&
          !isComposerFocused && (
            <div className="quick-replies chat-quick-replies" style={quickWrap}>
              {quickReplies.slice(0, 4).map((reply) => (
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

          {canUseMessageComposer && replyingTo && (
            <div style={replyComposer}>
              <div style={{ minWidth: 0 }}>
                <strong>{t("conversationReplying", language)}</strong>
                <div style={replyComposerText}>{replyingTo.text}</div>
              </div>

              <button style={replyCloseBtn} onClick={() => setReplyingTo(null)}>
                ×
              </button>



            </div>
          )}

          {!isCanonicalThread && pendingImage && (
            <div style={pendingImageBox}>
              <img src={pendingImage.url} alt="" style={pendingImageThumb} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{t("conversationImageReady", language)}</strong>
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

          {!isCanonicalThread && showAttachMenu && (
            <div style={attachMenu}>
              <div style={menuSection}>
                <div style={menuSectionTitle}>
                  {t("documentShare", language)}
                </div>
                <div style={attachMenuGrid}>
                  <button
                    style={
                      mediaUploadDeferred
                        ? { ...attachMenuBtn, ...deferredAttachMenuBtn }
                        : attachMenuBtn
                    }
                    disabled={mediaUploadDeferred}
                    onClick={openConversationCamera}
                  >
                    <span style={attachIconCircle}>
                      <IconCameraClean />
                    </span>
                    <span>
                      {mediaUploadDeferred
                        ? t("conversationPhotosComingSoon", language)
                        : t("conversationCamera", language)}
                    </span>
                  </button>

                  <button
                    style={
                      mediaUploadDeferred
                        ? { ...attachMenuBtn, ...deferredAttachMenuBtn }
                        : attachMenuBtn
                    }
                    disabled={mediaUploadDeferred}
                    onClick={() => fileInputRef.current.click()}
                  >
                    <span style={attachIconCircle}>
                      <IconPhotosClean />
                    </span>
                    <span>
                      {mediaUploadDeferred
                        ? t("conversationPhotosComingSoon", language)
                        : t("assistantProjectBriefDocumentPhotos", language)}
                    </span>
                  </button>

                  <button style={attachMenuBtn} onClick={sendVideoCard}>
                    <span style={attachIconCircle}>
                      <IconCameraClean />
                    </span>
                    <span>{t("hiringInterviewTypeVideo", language)}</span>
                  </button>

                  <button style={attachMenuBtn} onClick={sendScanCard}>
                    <span style={attachIconCircle}>
                      <IconScanClean />
                    </span>
                    <span>{t("relationshipDocument", language)}</span>
                  </button>

                  <button style={attachMenuBtn} onClick={sendVoiceMessageCard}>
                    <span style={attachIconCircle}>
                      <IconPhone />
                    </span>
                    <span>{t("conversationVoiceMessage", language)}</span>
                  </button>

                  <button style={attachMenuBtn} onClick={sendLocationCard}>
                    <span style={attachIconCircle}>
                      <IconLocationClean />
                    </span>
                    <span>{t("assistantProjectBriefLocation", language)}</span>
                  </button>
                </div>
              </div>

              <div style={menuSection}>
                <div style={menuSectionTitle}>
                  {t("conversationWorkflow", language)}
                </div>
                <div style={attachMenuGrid}>
	                  {!isHiringThread && (
	                    <>
	                      {currentViewerRole === "business" && (
	                        <button style={menuActionPrimary} onClick={openChatScheduleModal}>
	                          <span style={attachIconCircle}>
	                            <IconCalendarClean />
	                          </span>
	                            <span>{t("assistantActionOpenSchedule", language)}</span>
	                        </button>
	                      )}

                      <button style={menuActionPrimary} onClick={openTenantTicketComposer}>
                        <span style={attachIconCircle}>
                          <IconIssueClean />
                        </span>
                        <span>{t("assistantCompanionOpenWorkCenter", language)}</span>
                      </button>

                      <button
                        style={
                          mediaUploadDeferred
                            ? { ...menuActionPrimary, ...deferredAttachMenuBtn }
                            : menuActionPrimary
                        }
                        disabled={mediaUploadDeferred}
                        onClick={() => startWorkflowPhotoUpload("progress")}
                      >
                        <span style={attachIconCircle}>
                          {resolvePhotoWorkflowIcon("progress")}
                        </span>
                        <span>
                          {t("conversationProgressPhoto", language)}
                        </span>
                      </button>

                      <button
                        style={
                          mediaUploadDeferred
                            ? { ...menuActionPrimary, ...deferredAttachMenuBtn }
                            : menuActionPrimary
                        }
                        disabled={mediaUploadDeferred}
                        onClick={() => startWorkflowPhotoUpload("issue")}
                      >
                        <span style={attachIconCircle}>
                          {resolvePhotoWorkflowIcon("issue")}
                        </span>
                        <span>{t("conversationReportIssue", language)}</span>
                      </button>

                      <button style={menuActionPrimary} onClick={sendMaterialsCard}>
                        <span style={attachIconCircle}>
                          <IconMaterialsClean />
                        </span>
                        <span>{t("assistantCompanionOpenWorkCenter", language)}</span>
                      </button>

                      <button style={menuActionPrimary} onClick={sendPaymentCard}>
                        <span style={attachIconCircle}>
                          <IconPaymentClean />
                        </span>
                        <span>{t("conversationPrepareInvoice", language)}</span>
                      </button>

                      <button
                        style={
                          mediaUploadDeferred
                            ? { ...menuActionPrimary, ...deferredAttachMenuBtn }
                            : menuActionPrimary
                        }
                        disabled={mediaUploadDeferred}
                        onClick={() => startWorkflowPhotoUpload("completion")}
                      >
                        <span style={attachIconCircle}>
                          {resolvePhotoWorkflowIcon("completion")}
                        </span>
                        <span>{t("assistantProjectBriefDocumentCompletion", language)}</span>
                      </button>

                      <button
                        style={menuActionSecondary}
                        onClick={() => {
                          setShowAttachMenu(false);
                          stopAiSpeech();
                          setShowJobRecords(true);
                        }}
                      >
                        <span style={attachIconCircle}>
                          <IconDocumentClean />
                        </span>
                        <span>
                          {t("conversationJobRecords", language)}
                          {jobRecordCount > 0 ? ` (${jobRecordCount})` : ""}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          )}


          {!isCanonicalThread && pendingPhotoPurpose === "explain" && (
            <div style={photoExplainCard}>
              <div style={photoExplainTitle}>
                {t("conversationExplainPrompt", language)}
              </div>

              <div style={photoExplainSubtitle}>
                {t("conversationExplainHelp", language)}
              </div>

              <div style={photoChipRow}>
                {[
                  t("conversationQuickLeak", language),
                  t("conversationQuickBroken", language),
                  t("conversationQuickRepair", language),
                  t("hiringSettingsQuestion", language),
                  t("homeUrgent", language),
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
                  t("conversationExplainPlaceholder", language)
                }
              />
            </div>
          )}

          {!canUseMessageComposer ? (
            <div className="meetro-visual-empty-state" style={composer} role="status">
              {t(composerNoticeKey, language)}
            </div>
          ) : (
          <>
          <div className="chat-composer message-composer" style={composer}>
            {!isCanonicalThread ? (
            <button
              className="chat-plus-button message-plus-button"
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
            ) : null}

            <div className="chat-input-wrapper message-input-wrapper" style={inputWrap}>
            <textarea
                className="chat-message-input message-input"
                ref={textareaRef}
                style={input}
                value={messageText}
                rows={1}
                maxLength={
                  isCanonicalThread ? CANONICAL_MESSAGE_MAX_LENGTH : undefined
                }
                disabled={canonicalSendPending}
                onFocus={() => setIsComposerFocused(true)}
                onBlur={() => setIsComposerFocused(false)}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                placeholder={
                  t("typeMessage", language)
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

            {!isCanonicalThread ? (
            <button
              className="chat-mic-button message-mic-button"
              style={circleBtn}
              onClick={() =>
                alert(
                  t("conversationVoiceComingSoon", language)
                )
              }
            >
              <IconMic />
            </button>
            ) : null}

            <button
              className="chat-send-button message-send-button"
              style={{
                ...sendBtn,
                ...(isEmergencyThread ? emergencySendBtn : {}),
                opacity:
                  !canonicalSendPending && (messageText.trim() || pendingImage)
                    ? 1
                    : 0.5,
              }}
              disabled={
                canonicalSendPending ||
                (isCanonicalThread && !messageText.trim())
              }
              onClick={() => sendMessage()}
            >
              <IconSend />
            </button>

            {!isCanonicalThread ? (
            <>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              accept="image/*"
              disabled={mediaUploadDeferred}
              onChange={handleImageUpload}
            />

            <input
              ref={cameraInputRef}
              type="file"
              style={{ display: "none" }}
              accept="image/*"
              capture="environment"
              disabled={mediaUploadDeferred}
              onChange={handleImageUpload}
            />
            </>
            ) : null}
          </div>
          {isCanonicalThread && canonicalSendErrorKey ? (
            <div
              className="meetro-visual-empty-state"
              style={{ ...timelineTopEmpty, textAlign: "center" }}
              role="alert"
            >
              {t(canonicalSendErrorKey, language)}
            </div>
          ) : null}
          </>
          )}
        </div>

        {showClearConfirm && (
          <div style={confirmOverlay}>
            <div style={confirmBox}>
              <h3 style={confirmTitle}>
                {t("conversationClearChatTitle", language)}
              </h3>

              <p style={confirmText}>
                {t("conversationClearChatBody", language)}
              </p>

              <div style={confirmActions}>
                <button style={confirmCancelBtn} onClick={() => setShowClearConfirm(false)}>
                  {t("actionCancel", language)}
                </button>

                <button style={confirmDeleteBtn} onClick={clearLocalChat}>
                  {t("conversationClear", language)}
                </button>
              </div>
            </div>
          </div>
        )}

        {saveNotice && (
          <div style={saveToast}>
             {saveNotice}
          </div>
        )}


        {!isCanonicalThread && showJobRecords && (
          <div style={recordOverlay}>
            <div style={recordPanel}>
              <div style={recordHeader}>
                <div>
                  <h2 style={recordTitle}>
                     {t("conversationJobRecord", language)}
                  </h2>

                  <p style={recordSubtitle}>
                    {jobRecordCount} 
                    {t("conversationSavedWorkflowItems", language)}
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
                {t("conversationJobRecordHelp", language)}
              </div>

              <div style={recordTools}>
                <button style={recordSpeakBtn} onClick={speakJobRecords}>
                  {aiSpeaking ? " Stop Meetro Voice" : " " + (t("conversationReadJobRecord", language))}
                </button>
              </div>

              <div style={recordList}>
                {jobRecords.length === 0 ? (
                  <div style={emptyRecord}>
                    {t("conversationNoJobRecords", language)}
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
                          {item.type === "approval" && <IconApprovalClean />}
                          {item.type === "payment" && <IconPaymentClean />}
                          {(item.type === "materials" ||
                            item.type === "materials-list") && <IconMaterialsClean />}
                          {(item.type === "location" || item.type === "location-share") && <IconLocationClean />}
                          {(item.type === "scan" || item.type === "scan-share") && <IconScanClean />}
                          {(item.type === "photoWorkflow" ||
                            item.type === "photoUpload" ||
                            item.type === "photo") && (
                            resolvePhotoWorkflowIcon(item.workflowType || item.photoType)
                          )}
                          {item.type === "update" && <IconUpdateClean />}
                          {item.type === "history" && <IconHistoryClean />}
                          {item.type === "completion" && <IconCompletedClean />}
                          {item.type === "schedule" && <IconCalendarClean />}
                          {!item.type && <IconDocumentClean />}
                        </div>
                      </div>

                      <div style={timelineContent}>
                        <div style={timelineTop}>
                          <strong>{item.title}</strong>
                          <span>{formatMessageTime(item.time)}</span>
                        </div>

                        <p>{item.subtitle}</p>

                        {expandedRecord === item.id && (
                          <div style={expandedPanel}>
                            <div style={expandedPreview}>
                              {t("conversationMomentPreview", language)}
                            </div>

                            <div style={expandedInfo}>
                              <div style={expandedInfoRow}>
                                {t("conversationDocumentationAttached", language)}
                              </div>

                              <div style={expandedInfoRow}>
                                {t("conversationWorkflowSummaryAvailable", language)}
                              </div>

                              <div style={expandedInfoRow}>
                                 {t("conversationSavedRelationshipMemory", language)}
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
                                ? " Stop Meetro"
                                : " Read Meetro Moment"}
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

        {scheduleDeleteCandidate && (
          <div style={scheduleDeleteConfirmOverlay}>
            <div style={scheduleDeleteConfirmCard}>
              <h3 style={scheduleDeleteConfirmTitle}>
                {t("conversationDeleteAppointmentTitle", language)}
              </h3>

              <p style={scheduleDeleteConfirmText}>
                {t("conversationDeleteAppointmentBody", language)}
              </p>

              <div style={scheduleDeleteConfirmActions}>
                <button
                  style={scheduleDeleteCancelButton}
                  onClick={() => {
                    setScheduleDeleteCandidate(null);
                    setSwipedScheduleId(null);
                  }}
                >
                  {t("actionCancel", language)}
                </button>

                <button
                  style={scheduleDeleteConfirmButton}
                  onClick={() => {
                    deleteScheduleCard(scheduleDeleteCandidate);
                    setScheduleDeleteCandidate(null);
                  }}
                >
                  {t("delete", language)}
                </button>
              </div>
            </div>
          </div>
        )}

        {appointmentDetails && (
          <div style={storyOverlay}>
            <div style={storyCard}>
              <button
                style={storyClose}
                onClick={() => setAppointmentDetails(null)}
              >
                ×
              </button>

              <div style={storyIcon}>
                <div style={storyIconInner}>
                  <IconCalendarClean />
                </div>
              </div>

              <h2 style={storyTitle}>
                {t("conversationAppointmentDetails", language)}
              </h2>

              <p style={storyText}>
                {appointmentDetails.schedule?.title ||
                  appointmentDetails.title ||
                  (t("conversationScheduledAppointment", language))}
              </p>

              <div style={appointmentDetailBox}>
                <div style={appointmentDetailRow}>
                  <span>{t("messagesType", language)}</span>
                  <strong>
                    {appointmentDetails.schedule?.appointmentType ||
                      appointmentDetails.schedule?.type ||
                      (t("journeyAppointment", language))}
                  </strong>
                </div>

                <div style={appointmentDetailRow}>
                  <span>{t("myRequestsDate", language)}</span>
                  <strong>{appointmentDetails.schedule?.date || "—"}</strong>
                </div>

                <div style={appointmentDetailRow}>
                  <span>{t("myRequestsTime", language)}</span>
                  <strong>{getDisplayScheduleTime(appointmentDetails.schedule?.time)}</strong>
                </div>

                <div style={appointmentDetailRow}>
                  <span>{t("assistantProjectBriefLocation", language)}</span>
                  <strong>{appointmentDetails.schedule?.location || "—"}</strong>
                </div>

                <div style={appointmentDetailRow}>
                  <span>{t("teamMemberStatus", language)}</span>
                  <strong>
                    {getAppointmentConfirmationLabel(
                      getAppointmentConfirmationStatus(appointmentDetails)
                    )}
                  </strong>
                </div>

                {appointmentDetails.schedule?.notes && (
                  <div style={appointmentDetailNotes}>
                    <span>{t("messagesNotes", language)}</span>
                    <p>{appointmentDetails.schedule.notes}</p>
                  </div>
                )}
              </div>

              {isCustomerFacingPendingAppointment(appointmentDetails) && (
                <div style={appointmentDetailActions}>
                  <button
                    style={appointmentConfirmButton}
                    onClick={() =>
                      updateScheduleConfirmationStatus(
                        appointmentDetails,
                        "confirmed"
                      )
                    }
                  >
                    {t("confirmAppointment", language)}
                  </button>

                  <button
                    style={appointmentRequestTimeButton}
                    onClick={() =>
                      updateScheduleConfirmationStatus(
                        appointmentDetails,
                        "change_requested"
                      )
                    }
                  >
                    {t("requestDifferentTime", language)}
                  </button>
                </div>
              )}

              {currentViewerRole === "business" && (
                <button
                  style={storySpeakBtn}
                  onClick={() => editScheduleFromMessage(appointmentDetails)}
                >
                  {t("conversationEditSchedule", language)}
                </button>
              )}

              <button
                style={storySaveBtn}
                onClick={() => setAppointmentDetails(null)}
              >
                {t("actionClose", language)}
              </button>
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

              <div style={storyIcon}>
                <div style={storyIconInner}>
                  {typeof jobStory.icon === "string"
                    ? resolveWorkflowIcon(jobStory.icon)
                    : jobStory.icon || <IconHistoryClean />}
                </div>
              </div>

              <h2 style={storyTitle}>{jobStory.title}</h2>

              <p style={storyText}>{jobStory.subtitle}</p>

              <div style={storyPreviewBox}>
                <div style={storyPreviewIcon}>
                  <IconPhotosClean />
                </div>
                <strong>
                  {t("conversationJobPreview", language)}
                </strong>
                <span>
                  {t("conversationJobPreviewHelp", language)}
                </span>
              </div>

              <button style={storySpeakBtn} onClick={speakJobStory}>
                {aiSpeaking ? " Stop Meetro Voice" : " " + (t("conversationReadSummary", language))}
              </button>

              <button style={storySaveBtn} onClick={saveToJobRecord}>
                 {t("conversationSaveJobRecord", language)}
              </button>
            </div>
          </div>
        )}

        {activeGalleryImage?.imageUrl && (
          <div style={imageModal} onClick={() => setPreviewImage(null)}>
            <button
              type="button"
              style={galleryCloseButton}
              aria-label={t("closePhotoGallery")}
              onClick={() => setPreviewImage(null)}
            >
              ×
            </button>

            <div
              style={galleryViewer}
              onClick={(event) => event.stopPropagation()}
              onTouchStart={handleGallerySwipeStart}
              onTouchEnd={handleGallerySwipeEnd}
            >
              <div style={galleryCounter}>
                {activeGalleryIndex + 1} / {galleryImages.length}
              </div>

              <img
                src={activeGalleryImage.imageUrl}
                alt={activeGalleryImage.alt}
                style={modalImage}
              />

              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    style={{ ...galleryArrowButton, left: "8px" }}
                    aria-label={t("previousPhoto")}
                    disabled={activeGalleryIndex <= 0}
                    onClick={() => showGalleryImage(activeGalleryIndex - 1)}
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    style={{ ...galleryArrowButton, right: "8px" }}
                    aria-label={t("nextPhoto")}
                    disabled={activeGalleryIndex >= galleryImages.length - 1}
                    onClick={() => showGalleryImage(activeGalleryIndex + 1)}
                  >
                    ›
                  </button>
                </>
              )}
            </div>
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

@media (orientation: landscape), (max-width: 896px) and (min-width: 600px) and (max-aspect-ratio: 21 / 9) {
  .chat-bottom-stack {
    width: 100%;
    max-width: 100%;
    padding-top: 4px;
    padding-bottom: calc(4px + env(safe-area-inset-bottom, 0px));
  }

  .chat-composer {
    max-width: 100%;
    box-sizing: border-box;
    padding: 4px 6px calc(6px + env(safe-area-inset-bottom, 0px));
    gap: 6px;
  }

  .chat-plus-button,
  .chat-mic-button,
  .chat-send-button {
    width: 34px !important;
    height: 34px !important;
  }

  .chat-input-wrapper {
    width: 100%;
    min-width: 0;
    min-height: 34px;
    border-radius: 999px;
    padding: 0 10px;
  }

  .chat-message-input {
    width: 100%;
    min-width: 0;
    font-size: 16px;
    padding-top: 4px;
    padding-bottom: 4px;
    max-height: 90px;
  }

  .chat-quick-replies {
    display: none !important;
  }
}
`;

const page = {
  height: "100dvh",
  minHeight: "100dvh",
  maxHeight: "100dvh",
  width: "100%",
  maxWidth: "100vw",
  minWidth: 0,
  background:
    "var(--meetro-gradient-community-page, linear-gradient(135deg, #f6f0e5 0%, #f8fafc 100%))",
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  padding: 0,
  boxSizing: "border-box",
  overflowX: "hidden",
  overflowY: "hidden",
};

const phone = {
  width: "100%",
  maxWidth: "860px",
  background: "var(--meetro-surface-paper, #ffffff)",
  height: "100%",
  maxHeight: "100%",
  minHeight: 0,
  position: "relative",
  paddingBottom: "0",
  overflowX: "hidden",
  overflowY: "hidden",
  boxShadow: "var(--meetro-shadow-soft, 0 20px 60px rgba(15,23,42,0.08))",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
};

const embeddedPage = {
  ...page,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  height: "100%",
  minHeight: 0,
  maxHeight: "100%",
  background: "transparent",
  alignItems: "stretch",
  justifyContent: "stretch",
};

const embeddedPhone = {
  ...phone,
  maxWidth: "100%",
  height: "100%",
  minHeight: 0,
  maxHeight: "100%",
  borderRadius: "28px",
  boxShadow: "none",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
};

const messageTextBlock = {
  whiteSpace: "pre-wrap",
  lineHeight: 1.5,
};

const messagesScroll = {
  flex: "1 1 auto",
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  WebkitOverflowScrolling: "touch",
  overscrollBehavior: "contain",
  display: "flex",
  flexDirection: "column",
  paddingTop: "12px",
  paddingBottom: "12px",
};


const avatarProfileButton = {
  border: "none",
  background: "transparent",
  padding: 0,
  cursor: "pointer",
};

const chatProjectLabel = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  flexWrap: "wrap",
  marginTop: "4px",
  marginBottom: "3px",
  width: "100%",
  maxWidth: "100%",
  color: "#475569",
  fontSize: "12px",
  fontWeight: 850,
  overflow: "hidden",
};

const chatProjectLabelStage = {
  display: "inline-flex",
};

const chatProjectTitleText = {
  display: "inline-block",
  maxWidth: "145px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const chatProjectStagePill = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "3px 7px",
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "#3730a3",
  fontSize: "11px",
  fontWeight: 950,
};

const headerIdentityButton = {
  flex: 1,
  minWidth: 0,
  maxWidth: "100%",
  overflow: "hidden",
  border: "none",
  background: "transparent",
  textAlign: "left",
  padding: 0,
  cursor: "pointer",
};

const profileOverlay = {
  position: "fixed",
  inset: 0,
  background:
    "var(--meetro-gradient-community-page, linear-gradient(180deg, rgba(251,246,237,0.98), rgba(255,253,248,0.98)))",
  backdropFilter: "blur(14px)",
  zIndex: 1200,
  display: "block",
  padding: "calc(env(safe-area-inset-top) + 12px) 14px calc(env(safe-area-inset-bottom) + 18px)",
  boxSizing: "border-box",
  overflowX: "hidden",
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
};

const relationshipActiveWorkBadge = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  marginLeft: "2px",
  borderRadius: "999px",
  padding: "3px 7px",
  background: "#ecfdf5",
  color: "#047857",
  fontSize: "11px",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const tenantTicketOverlay = {
  ...keyboardSafeFlowPage,
  position: "fixed",
  inset: 0,
  zIndex: 1250,
  padding: "calc(env(safe-area-inset-top, 0px) + 8px) 12px calc(env(safe-area-inset-bottom, 0px) + 16px)",
  boxSizing: "border-box",
  overflowY: "auto",
  overflowX: "hidden",
  WebkitOverflowScrolling: "touch",
};

const tenantTicketPanel = {
  ...glassSurface,
  width: "100%",
  maxWidth: "560px",
  minHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 24px)",
  margin: "0 auto",
  borderRadius: "26px",
  padding: "14px",
  boxSizing: "border-box",
  overflowX: "hidden",
};

const tenantTicketHeader = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "10px",
  minHeight: "44px",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: 950,
};

const tenantTicketBackButton = {
  border: "none",
  background: "transparent",
  color: "#2563eb",
  padding: "8px 0",
  fontSize: "13px",
  fontWeight: 850,
};

const tenantTicketHeaderAction = {
  ...tenantTicketBackButton,
  fontWeight: 950,
};

const tenantTicketForm = {
  display: "grid",
  gap: "12px",
  marginTop: "18px",
  minWidth: 0,
};

const tenantTicketField = {
  display: "grid",
  gap: "6px",
  color: "#475569",
  fontSize: "12px",
  fontWeight: 900,
  minWidth: 0,
};

const tenantTicketInput = {
  ...glassField,
  width: "100%",
  minHeight: "46px",
  borderRadius: "14px",
  color: "#0f172a",
  padding: "0 12px",
  fontSize: "14px",
  fontWeight: 800,
  boxSizing: "border-box",
  outline: "none",
};

const tenantTicketTextarea = {
  ...tenantTicketInput,
  minHeight: "112px",
  padding: "12px",
  resize: "vertical",
  lineHeight: 1.4,
};

const tenantTicketPhotos = {
  ...softPageSection,
  border: "1px dashed rgba(148,163,184,0.36)",
  borderRadius: "16px",
  color: "#64748b",
  padding: "14px",
  display: "grid",
  gap: "4px",
  fontSize: "13px",
  fontWeight: 800,
};

const tenantTicketNotice = {
  margin: 0,
  borderRadius: "14px",
  background: "#fff7ed",
  color: "#9a3412",
  padding: "10px 12px",
  fontSize: "13px",
  fontWeight: 850,
};

const tenantTicketPrimaryButton = {
  width: "100%",
  border: "none",
  borderRadius: "16px",
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #1f4d34, #14351f))",
  color: "#ffffff",
  minHeight: "48px",
  padding: "0 14px",
  fontSize: "14px",
  fontWeight: 950,
  boxShadow: "var(--meetro-shadow-lifted, 0 12px 24px rgba(15,42,68,0.18))",
};

const tenantTicketReviewCard = {
  ...glassSurface,
  borderRadius: "20px",
  padding: "14px",
  display: "grid",
  gap: "10px",
  boxSizing: "border-box",
  minWidth: 0,
};

const tenantTicketReviewRow = {
  display: "grid",
  gap: "4px",
  paddingTop: "8px",
  borderTop: "1px solid #f1f5f9",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 850,
  overflowWrap: "anywhere",
};

const tenantTicketSuccess = {
  minHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 150px)",
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  gap: "12px",
  textAlign: "center",
  color: "#0f172a",
};

const tenantTicketSuccessIcon = {
  width: "64px",
  height: "64px",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#10b981",
  color: "#ffffff",
  fontSize: "30px",
  fontWeight: 950,
};

const header = {
  ...glassNavigationSurface,
  flex: "0 0 auto",
  minHeight: "76px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "calc(env(safe-area-inset-top) + 8px) 12px 10px",
  position: "relative",
  zIndex: 20,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflowX: "hidden",
};

const headerBtn = {
  ...glassPill,
  width: "44px",
  height: "44px",
  borderRadius: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#111827",
};

const activeHeaderBtn = {
  border: "1px solid rgba(31,77,52,0.18)",
  color: "var(--meetro-color-forest, #1f4d34)",
  background: "var(--meetro-surface-sage, #eef4ea)",
};

const appointmentReminderNoticeCard = {
  flex: "0 0 auto",
  margin: "10px 12px 0",
  padding: "12px",
  borderRadius: "18px",
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#92400e",
  display: "grid",
  gap: "10px",
  boxSizing: "border-box",
};

const appointmentReminderNoticeActions = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "8px",
};

const appointmentReminderSettingsButton = {
  border: "none",
  borderRadius: "14px",
  padding: "10px 12px",
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #1f4d34, #14351f))",
  color: "#ffffff",
  fontWeight: 900,
};

const appointmentReminderContinueButton = {
  border: "1px solid #fbbf24",
  borderRadius: "14px",
  padding: "10px 12px",
  background: "#ffffff",
  color: "#92400e",
  fontWeight: 900,
};

const avatar = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #1f4d34, #14351f))",
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
  color: "var(--meetro-color-muted, #5f6b63)",
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
  background: "var(--meetro-surface-warm, rgba(251,246,237,0.92))",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "4px 8px",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: "900",
};


const callMenu = {
  ...glassActionMenu,
  position: "fixed",
  top: "72px",
  right: "max(68px, env(safe-area-inset-right, 0px))",
  width: "min(210px, calc(100vw - 40px))",
  maxWidth: "calc(100vw - 40px)",
  borderRadius: "16px",
  padding: "6px",
  zIndex: 81,
  boxSizing: "border-box",
  overflowX: "hidden",
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
  ...glassActionMenu,
  position: "fixed",
  top: "72px",
  right: "max(16px, env(safe-area-inset-right, 0px))",
  width: "min(250px, calc(100vw - 32px))",
  maxWidth: "calc(100vw - 32px)",
  maxHeight: "75vh",
  overflowY: "auto",
  overflowX: "hidden",
  borderRadius: "16px",
  padding: "8px",
  zIndex: 120,
  boxSizing: "border-box",
};

const menuActionBase = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
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

const menuActionPrimary = {
  ...menuActionBase,
  ...nativeContactRow,
  minHeight: "46px",
  color: "#111827",
  fontSize: "12px",
  fontWeight: "800",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
};

const deferredAttachMenuBtn = {
  cursor: "not-allowed",
  opacity: 0.62,
};

const menuActionSecondary = {
  ...menuActionPrimary,
  background: "var(--meetro-surface-warm, rgba(251,246,237,0.92))",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
};

const menuActionTertiary = {
  ...menuActionBase,
  minHeight: "40px",
  fontSize: "13px",
  fontWeight: "700",
};

const threadMenuBtn = {
  ...menuActionTertiary,
};

const threadMenuBtnDisabled = {
  color: "#94a3b8",
  cursor: "default",
  opacity: 0.78,
};

const menuSection = {
  borderTop: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  paddingTop: "8px",
  marginTop: "8px",
};

const menuSectionTitle = {
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: "800",
  color: "var(--meetro-color-wood, #b7791f)",
  padding: "2px 12px 6px",
};


const emergencyBanner = {
  position: "sticky",
  top: "8px",
  zIndex: 20,
  marginBottom: "12px",
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
  minWidth: "106px",
  height: "30px",
  padding: "0 10px",
  borderRadius: "999px",
  border: "1px solid rgba(239,68,68,0.16)",
  background: "#ffffff",
  color: "#dc2626",
  fontSize: "11px",
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
  flexWrap: "wrap",
  overflowX: "hidden",
  marginTop: "14px",
  paddingBottom: "2px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const emergencyStep = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  whiteSpace: "nowrap",
  color: "#475569",
  fontSize: "10px",
  fontWeight: "800",
  maxWidth: "100%",
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

const emergencyChatActions = {
  marginTop: "12px",
};

const canonicalDispatchNotice = {
  marginTop: "10px",
  color: "#7f1d1d",
  fontSize: "12px",
  fontWeight: "800",
  textAlign: "center",
};

const canonicalDispatchError = {
  ...canonicalDispatchNotice,
  padding: "10px 12px",
  borderRadius: "12px",
  background: "#ffffff",
  color: "#b91c1c",
};

const canonicalEmergencyLocationCard = {
  display: "grid",
  gap: "6px",
  marginTop: "14px",
  padding: "13px 14px",
  border: "1px solid rgba(239,68,68,0.14)",
  borderRadius: "16px",
  background: "#ffffff",
  color: "#374151",
  fontSize: "12px",
  lineHeight: 1.45,
};

const emergencyPrimaryAction = {
  ...completeFromChatBtn,
  marginTop: 0,
  background: "#dc2626",
  boxShadow: "0 10px 24px rgba(220,38,38,0.2)",
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
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  overflow: "hidden",
};

const routePreviewTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "12px",
};

const routePreviewTitleWrap = {
  flex: "1 1 auto",
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
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
  padding: "8px clamp(16px, 3vw, 34px)",
};

const scheduleDeleteConfirmOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  background: "rgba(15, 23, 42, 0.45)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const scheduleDeleteConfirmCard = {
  width: "min(340px, calc(100% - 40px))",
  background: "#ffffff",
  borderRadius: "22px",
  padding: "20px",
  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.25)",
  border: "1px solid rgba(226, 232, 240, 0.95)",
};

const scheduleDeleteConfirmTitle = {
  margin: "0 0 8px",
  fontSize: "20px",
  fontWeight: 900,
  color: "#0f172a",
};

const scheduleDeleteConfirmText = {
  margin: "0 0 18px",
  fontSize: "14px",
  lineHeight: 1.45,
  color: "#64748b",
};

const scheduleDeleteConfirmActions = {
  display: "flex",
  gap: "10px",
  justifyContent: "flex-end",
};

const scheduleDeleteCancelButton = {
  border: "1px solid rgba(148, 163, 184, 0.45)",
  background: "#ffffff",
  color: "#334155",
  borderRadius: "14px",
  padding: "11px 14px",
  fontWeight: 800,
};

const scheduleDeleteConfirmButton = {
  border: "none",
  background: "#ef4444",
  color: "#ffffff",
  borderRadius: "14px",
  padding: "11px 14px",
  fontWeight: 900,
};

const scheduleDeleteSwipeButton = {
  position: "absolute",
  right: "10px",
  top: "50%",
  transform: "translateY(-50%)",
  width: "70px",
  height: "42px",
  border: "none",
  borderRadius: "12px",
  background: "#ef4444",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 800,
  zIndex: 1,
};

const scheduleModalOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(15, 23, 42, 0.45)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "18px",
};

const scheduleModalCard = {
  width: "calc(100% - 32px)",
  maxWidth: "360px",
  background: "#ffffff",
  borderRadius: "24px",
  padding: "16px",
  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.25)",
  border: "1px solid rgba(226, 232, 240, 0.95)",
};

const scheduleModalTitle = {
  margin: "0 0 6px",
  fontSize: "20px",
  fontWeight: 900,
  color: "#0f172a",
};

const scheduleModalSubtitle = {
  margin: "0 0 16px",
  fontSize: "13px",
  lineHeight: 1.45,
  color: "#64748b",
};

const scheduleModalGrid = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const scheduleModalInput = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  WebkitAppearance: "none",
  appearance: "none",
  border: "1px solid rgba(148, 163, 184, 0.45)",
  borderRadius: "14px",
  padding: "10px 12px",
  marginBottom: "10px",
  fontSize: "15px",
  outline: "none",
  background: "#f8fafc",
  color: "#0f172a",
};

const scheduleModalTextarea = {
  ...scheduleModalInput,
  minHeight: "86px",
  resize: "vertical",
};

const scheduleModalActions = {
  display: "flex",
  gap: "10px",
  justifyContent: "flex-end",
  marginTop: "4px",
};

const scheduleModalSecondary = {
  border: "1px solid rgba(148, 163, 184, 0.45)",
  background: "#ffffff",
  color: "#334155",
  borderRadius: "14px",
  padding: "11px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const scheduleModalPrimary = {
  border: "none",
  background: "#0f172a",
  color: "#ffffff",
  borderRadius: "14px",
  padding: "11px 16px",
  fontWeight: 900,
  cursor: "pointer",
};

const appointmentDetailBox = {
  width: "100%",
  display: "grid",
  gap: "10px",
  margin: "16px 0",
};

const appointmentDetailRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  padding: "12px 14px",
  borderRadius: "14px",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "14px",
};

const appointmentDetailNotes = {
  padding: "12px 14px",
  borderRadius: "14px",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "14px",
};

const appointmentDetailActions = {
  width: "100%",
  display: "grid",
  gap: "10px",
  marginBottom: "12px",
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

const threadSearchRow = {
  width: "100%",
  maxWidth: "860px",
  margin: "0 auto 8px",
  padding: "0 16px",
  boxSizing: "border-box",
};

const threadSearchInputWrap = {
  width: "100%",
  height: "38px",
  background: "#f8f9fc",
  border: "1px solid #e5e7eb",
  borderRadius: "999px",
  padding: "0 11px 0 12px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  boxSizing: "border-box",
};

const threadSearchIcon = {
  width: "18px",
  height: "18px",
  color: "#6b7280",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const threadSearchInput = {
  width: "100%",
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: "700",
};

const threadSearchClear = {
  width: "22px",
  height: "22px",
  borderRadius: "999px",
  border: "none",
  background: "#e5e7eb",
  color: "#111827",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
  padding: "0",
  fontSize: "14px",
  lineHeight: "1",
};

const dateLine = {
  width: "60px",
  height: "1px",
  background: "#e5e7eb",
};

const timelineTopEmpty = {
  width: "min(86%, 860px)",
  color: "#667085",
  fontWeight: "700",
  fontSize: "14px",
  background: "#f8fafc",
  border: "1px solid #eef2f7",
  borderRadius: "16px",
  padding: "18px",
  margin: "0 auto 18px",
  boxSizing: "border-box",
};

const messageRow = {
  display: "flex",
  marginBottom: "12px",
};


const operationalRow = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "18px",
  width: "100%",
};

const operationalCard = {
  width: "100%",
  maxWidth: "min(520px, calc(100% - 20px))",
  maxWidth: "100%",
  background: "var(--meetro-surface-paper, #ffffff)",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  borderRadius: "24px",
  padding: "16px",
  boxShadow: "var(--meetro-shadow-soft, 0 14px 34px rgba(15,23,42,0.08))",
  boxSizing: "border-box",
  overflow: "hidden",
};

const operationalHeader = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  color: "#111827",
  width: "100%",
  minWidth: 0,
};

const operationalIcon = {
  width: "44px",
  height: "44px",
  borderRadius: "16px",
  background: "var(--meetro-surface-sage, #eef4ea)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
};

const operationalSubtitle = {
  marginTop: "4px",
  color: "var(--meetro-color-muted, #5f6b63)",
  fontSize: "13px",
  fontWeight: "700",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  lineHeight: 1.35,
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

const scheduleCustomerTitle = {
  margin: "0 0 2px",
  color: "#0f172a",
  fontSize: "18px",
  fontWeight: "950",
  lineHeight: 1.15,
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
  alignItems: "flex-start",
};

const scheduleDetailLabel = {
  flex: "0 1 auto",
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  maxWidth: "45%",
};

const scheduleDetailValue = {
  flex: "1 1 auto",
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  textAlign: "right",
};

const scheduleDetailNotes = {
  background: "rgba(255,255,255,0.74)",
  border: "1px solid rgba(226,232,240,0.95)",
  borderRadius: "14px",
  padding: "10px 12px",
  color: "#334155",
  boxSizing: "border-box",
};

const scheduleServiceList = {
  margin: "6px 0 0",
  paddingLeft: "18px",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "800",
  lineHeight: 1.45,
};

const scheduleStatusPill = {
  justifySelf: "start",
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "7px 11px",
  background: "#fef3c7",
  color: "#92400e",
  fontSize: "12px",
  fontWeight: "900",
};

const appointmentActionRow = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
  marginTop: "4px",
};

const appointmentConfirmButton = {
  border: "none",
  borderRadius: "16px",
  padding: "12px 14px",
  background: "#5b35d5",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "900",
  cursor: "pointer",
};

const appointmentRequestTimeButton = {
  border: "1px solid rgba(31,77,52,0.18)",
  borderRadius: "16px",
  padding: "12px 14px",
  background: "#ffffff",
  color: "#4338ca",
  fontSize: "14px",
  fontWeight: "900",
  cursor: "pointer",
};

const materialsListCard = {
  marginTop: "12px",
  display: "grid",
  gap: "8px",
};

const hiringInterviewMessageCard = {
  display: "grid",
  gap: "6px",
  minWidth: 0,
  marginTop: "10px",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid rgba(49, 95, 66, 0.2)",
  background: "rgba(238, 244, 234, 0.92)",
  color: "#244532",
  fontSize: "13px",
  lineHeight: 1.45,
  overflowWrap: "anywhere",
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
  alignItems: "flex-start",
};

const materialsListName = {
  flex: "1 1 auto",
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const materialsListAmount = {
  flex: "0 0 auto",
  minWidth: 0,
  textAlign: "right",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
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
  color: "var(--meetro-color-forest, #1f4d34)",
  border: "2px solid var(--meetro-color-forest, #1f4d34)",
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
  border: "1px solid rgba(23,35,23,.14)",
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
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "hidden",
  overflowWrap: "anywhere",
  wordBreak: "normal",
};

const closeoutWorkflowHeader = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "14px",
  alignItems: "flex-start",
  minWidth: 0,
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
  lineHeight: 1.2,
  overflowWrap: "anywhere",
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
  overflowWrap: "anywhere",
  wordBreak: "normal",
};

const closeoutWorkflowBreakdown = {
  display: "grid",
  gap: "8px",
  marginTop: "10px",
};

const closeoutWorkflowRow = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "12px",
  background: "#f8fafc",
  borderRadius: "14px",
  padding: "10px 12px",
  color: "#334155",
  fontWeight: "800",
  minWidth: 0,
  overflowWrap: "anywhere",
};

const closeoutWorkflowActions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
  gap: "10px",
  marginTop: "14px",
  width: "100%",
  maxWidth: "100%",
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
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-charcoal, #172317)",
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
  color: "var(--meetro-color-forest, #1f4d34)",
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
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-charcoal, #172317)",
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
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-charcoal, #172317)",
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
  color: "var(--meetro-color-forest, #1f4d34)",
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
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-charcoal, #172317)",
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
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-charcoal, #172317)",
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
  background: "linear-gradient(135deg,var(--meetro-color-forest, #1f4d34),var(--meetro-color-charcoal, #172317))",
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
  color: "var(--meetro-color-charcoal, #172317)",
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
  maxWidth: "calc(100% - 58px)",
  overflow: "hidden",
  wordBreak: "break-word",
  padding: "13px 15px",
  borderRadius: "26px",
  fontSize: "15px",
  lineHeight: 1.5,
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
  boxShadow: "0 8px 22px rgba(31,77,52,0.10)",
  borderBottomRightRadius: "10px",
};

const imageCardBubble = {
  background: "#ffffff",
  color: "#111827",
  border: "1px solid rgba(124,92,255,0.28)",
  boxShadow: "0 10px 30px rgba(31,77,52,0.18)",
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
  marginTop: "7px",
  fontSize: "10px",
  opacity: 0.72,
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
  borderLeft: "3px solid var(--meetro-color-forest, #1f4d34)",
  display: "flex",
  flexDirection: "column",
  fontSize: "10px",
};



const imageBubble = {
  width: "min(100%, 430px)",
  maxWidth: "min(100%, 430px)",
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
  left: 0,
  right: 0,
  bottom: "calc(240px + env(safe-area-inset-bottom))",
  margin: "0 auto",
  width: "calc(100% - 24px)",
  maxWidth: "460px",
  background: "#ffffff",
  borderRadius: "20px",
  padding: "8px",
  display: "flex",
  gap: "8px",
  boxShadow: "0 18px 42px rgba(15,23,42,0.16)",
  zIndex: 60,
  boxSizing: "border-box",
  overflowX: "hidden",
};

const actionBtn = {
  flex: 1,
  height: "40px",
  border: "none",
  borderRadius: "14px",
  background: "#f6f7fb",
  fontWeight: "700",
  cursor: "pointer",
  boxSizing: "border-box",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const bottomStack = {
  flex: "0 0 auto",
  width: "100%",
  maxWidth: "860px",
  background: "rgba(255,255,255,0.97)",
  backdropFilter: "blur(14px)",
  zIndex: 20,
  borderTop: "1px solid #eef2f7",
  boxSizing: "border-box",
  overflowX: "hidden",
  paddingBottom: 0,
};

const quickWrap = {
  flex: "0 0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(84px, 1fr))",
  alignItems: "center",
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  overflowY: "auto",
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
  gap: "6px",
  padding: "6px 12px 2px",
  maxHeight: "84px",
  boxSizing: "border-box",
};


const emergencyQuickBtn = {
  color: "#dc2626",
  border: "1px solid rgba(239,68,68,0.22)",
  background: "#fff7f7",
};

const quickBtn = {
  flexShrink: 0,
  minHeight: "24px",
  lineHeight: "1.18",
  border: "1px solid #e7eaf2",
  background: "#ffffff",
  color: "#111827",
  borderRadius: "999px",
  padding: "6px 9px",
  fontSize: "10px",
  fontWeight: "800",
  cursor: "pointer",
  whiteSpace: "nowrap",
  textAlign: "center",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const replyComposer = {
  margin: "0 16px calc(env(safe-area-inset-bottom) + 8px)",
  background: "#f7f8fb",
  borderLeft: "4px solid var(--meetro-color-forest, #1f4d34)",
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
  borderLeft: "4px solid var(--meetro-color-forest, #1f4d34)",
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
  ...glassActionMenu,
  margin: "0 16px calc(env(safe-area-inset-bottom) + 8px)",
  maxHeight: "230px",
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  borderRadius: "24px",
  padding: "10px",
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "8px",
  animation: "meetroSheetIn 180ms ease-out",
};

const attachMenuGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "8px",
};

const attachMenuBtn = {
  ...glassPill,
  minHeight: "52px",
  border: "none",
  borderRadius: "19px",
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
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-forest, #1f4d34)",
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
  background: "var(--meetro-surface-sage, #eef4ea)",
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
  flex: "0 0 auto",
  margin: 0,
  width: "100%",
  background: "var(--meetro-surface-paper, rgba(255,255,255,0.98))",
  border: "0",
  borderTop: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  borderRadius: 0,
  padding: "8px 12px calc(8px + env(safe-area-inset-bottom))",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  boxShadow: "none",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflowX: "hidden",
};

const circleBtn = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  background: "var(--meetro-surface-paper, #ffffff)",
  color: "#0ea5ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "180ms ease",
  flexShrink: 0,
};

const activeCircleBtn = {
  background: "var(--meetro-surface-sage, #eef4ea)",
  border: "1px solid rgba(31,77,52,0.18)",
  color: "var(--meetro-color-forest, #1f4d34)",
  transform: "rotate(45deg)",
  boxShadow: "var(--meetro-shadow-soft, 0 8px 18px rgba(15,23,42,0.12))",
};

const inputWrap = {
  flex: 1,
  minWidth: 0,
  maxWidth: "100%",
  minHeight: "40px",
  display: "flex",
  alignItems: "center",
  border: "1.5px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  background: "var(--meetro-surface-warm, rgba(251,246,237,0.92))",
  borderRadius: "999px",
  padding: "0 14px",
  boxSizing: "border-box",
};

const input = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: "22px",
  maxHeight: "120px",
  border: "none",
  outline: "none",
  fontSize: "16px",
  lineHeight: "1.2",
  color: "#0f172a",
  background: "transparent",
  resize: "none",
  overflowY: "auto",
  fontFamily: "inherit",
  padding: "10px 0",
};


const emergencySendBtn = {
  background: "linear-gradient(135deg, #ff6b6b, #ef4444)",
  boxShadow: "0 10px 24px rgba(239,68,68,0.24)",
};

const sendBtn = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
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
  padding: "16px",
};

const confirmBox = {
  width: "100%",
  maxWidth: "340px",
  background: "#ffffff",
  borderRadius: "24px",
  padding: "16px",
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
  background: "var(--meetro-color-forest, #1f4d34)",
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
  background: "var(--meetro-surface-sage, #eef4ea)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  boxShadow: "0 8px 16px rgba(31,77,52,0.12)",
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
  background: "var(--meetro-surface-sage, #eef4ea)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "800",
  color: "var(--meetro-color-forest, #1f4d34)",
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
  background: "var(--meetro-color-forest, #1f4d34)",
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
  background: "var(--meetro-surface-sage, #eef4ea)",
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
  padding: "16px",
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
  background: "var(--meetro-surface-sage, #eef4ea)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "34px",
  margin: "0 auto 14px",
};

const storyIconInner = {
  width: "36px",
  height: "36px",
  borderRadius: "14px",
  background: "#ffffff",
  color: "var(--meetro-color-forest, #1f4d34)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
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
  background: "var(--meetro-color-forest, #1f4d34)",
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
  padding: "16px",
  backdropFilter: "blur(6px)",
};

const galleryViewer = {
  position: "relative",
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  touchAction: "pan-y",
};

const galleryCounter = {
  position: "absolute",
  top: "calc(env(safe-area-inset-top, 0px) + 20px)",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 2,
  padding: "7px 12px",
  borderRadius: "999px",
  background: "rgba(15,23,42,0.72)",
  color: "white",
  fontSize: "14px",
  fontWeight: "800",
};

const galleryCloseButton = {
  position: "absolute",
  top: "calc(env(safe-area-inset-top, 0px) + 56px)",
  right: "16px",
  zIndex: 3,
  width: "46px",
  height: "46px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.35)",
  background: "rgba(15,23,42,0.72)",
  color: "white",
  fontSize: "28px",
  lineHeight: 1,
  cursor: "pointer",
};

const galleryArrowButton = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 2,
  width: "46px",
  height: "58px",
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.35)",
  background: "rgba(15,23,42,0.68)",
  color: "white",
  fontSize: "38px",
  lineHeight: 1,
  cursor: "pointer",
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



class ConversationThreadErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ConversationThread crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui", color: "#111827" }}>
          <h2>{t("conversationErrorTitle", this.props.language)}</h2>
          <p>{t("conversationErrorBody", this.props.language)}</p>
          <pre style={{ whiteSpace: "pre-wrap", background: "#fee2e2", padding: 12, borderRadius: 12 }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button onClick={() => this.props.setPage("messagesInbox")}>
            {t("conversationBackToCenter", this.props.language)}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function ConversationThread({ setPage, embedded = false }) {
  const language = useLanguage();
  return (
    <ConversationThreadErrorBoundary setPage={setPage} language={language}>
      <ConversationThreadInner setPage={setPage} embedded={embedded} />
    </ConversationThreadErrorBoundary>
  );
}

export default ConversationThread;
