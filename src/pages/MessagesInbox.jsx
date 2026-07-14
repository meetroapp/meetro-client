import { useEffect, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getCommunicationLayout } from "../utils/communicationLayout";
import useAppLayoutMetrics from "../hooks/useAppLayoutMetrics";
import SafeBackBar from "../components/SafeBackBar";
import LoadingScreen from "../components/LoadingScreen";
import MeetroIcon from "../components/MeetroIcon";
import RelationshipIdentityPage from "../components/RelationshipIdentityPage";
import ConversationThread from "./ConversationThread";
import { authFetch, clearMeetroSession } from "../utils/authFetch";
import { getDashboardPageForAccountMode } from "../utils/session";
import {
  getAccountConnectionStateFromAuthResult,
  getStoredAccountConnectionState,
} from "../utils/accountConnection";
import { getLanguage, t } from "../utils/language";
import { formatMessageTime } from "../utils/displayTime";
import {
  getActiveJobSnapshot,
  getConversationMeta,
} from "../utils/workCenter";
import {
  getConversationRegistry as readConversationRegistry,
  isConversationUserSavedToHistory,
  isConversationUnreadForRole,
  markConversationRead,
  writeUnreadConversationCount,
} from "../utils/conversationUnread";
import { isHiringConversationType } from "../utils/hiringConversations";
import {
  applyConversationIdentity,
  getConversationParticipantIdentity,
} from "../utils/conversationIdentity";
import {
  createRelationshipLayerModel,
  isInactiveImportedContact,
  isSavedRelationshipContact,
} from "../utils/relationshipLayer";
import {
  getActiveProfileScopeDescriptor,
  readProfileScopedContacts,
} from "../utils/accountProfileScope";
import {
  CONTACT_IMPORT_TYPE_OPTIONS,
  buildImportedContactRelationship,
  normalizeImportedContact,
  parseImportedContactsFromText,
} from "../utils/contactImport";
import {
  CONTACTS_ACCESS_OFF_MESSAGE,
  getNativePhoneContacts,
  isNativeContactsAvailable,
} from "../utils/nativeContacts";
import { resolveRelationshipIdentity } from "../utils/relationshipIdentity";
import {
  getPersonalProfilePhotoForRecord,
  getScopedProfilePhoto,
} from "../utils/profilePhotoScoping";
import {
  bottomActionBar,
  glassActionMenu,
  glassField,
  glassFloatingButton,
  glassNavigationSurface,
  glassPill,
  glassPillActive,
  glassSurface,
  keyboardSafeFlowPage,
  nativeContactRow,
  softPageSection,
} from "../styles/liquidGlass";


const IconNewChat = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5.5 5.5h8.2a4.8 4.8 0 0 1 4.8 4.8v3.4a4.8 4.8 0 0 1-4.8 4.8H8.8L5 21v-2.8a4.8 4.8 0 0 1-3.5-4.6v-3.3a4.8 4.8 0 0 1 4-4.8Z"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="m14.5 4.8 3.7-3.7 2.7 2.7-3.7 3.7-3.2.5.5-3.2Z"
      fill="currentColor"
    />
  </svg>
);

const messagesMobileLayoutStyles = `
  @media (max-width: 430px) {
    .messages-hub-header {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      justify-content: stretch !important;
      align-items: stretch !important;
      gap: 10px !important;
      overflow: visible !important;
    }

    .messages-hub-title {
      min-width: 0 !important;
      width: 100% !important;
      font-size: clamp(25px, 8vw, 31px) !important;
      line-height: 1.05 !important;
    }

    .messages-header-action-wrap {
      width: 100% !important;
      max-width: 100% !important;
      justify-self: stretch !important;
    }

    .messages-header-action-button {
      width: 100% !important;
      max-width: 100% !important;
      min-height: 44px !important;
      justify-content: center !important;
    }

    .messages-section-navigation {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 8px !important;
    }

    .messages-section-navigation > * {
      min-width: 0 !important;
      max-width: 100% !important;
    }
  }
`;


function getDeletedConversationIds() {
  try {
    return JSON.parse(
      localStorage.getItem("deletedConversationIds") || "[]"
    );
  } catch {
    return [];
  }
}

function filterDeletedConversations(list) {
  const deletedIds = getDeletedConversationIds();

  return list.filter((item) => {
    if (isHiringConversationType(item)) return false;

    if (item.conversation_type === "emergency" && !item.saved_to_history) {
      return true;
    }

    return !deletedIds.includes(item.id);
  });
}

function getConversationRegistry() {
  return readConversationRegistry();
}

function getExplicitConversationAvatar(record = {}) {
  return (
    [
      record.participantAvatar,
      record.participant_avatar,
      record.businessProfilePhoto,
      record.business_profile_photo,
      record.businessProfilePhotoUrl,
      record.business_profile_photo_url,
      record.profilePhoto,
      record.profile_photo,
      record.profilePhotoUrl,
      record.profile_photo_url,
      record.businessLogo,
      record.business_logo,
      record.logo,
      record.logoUrl,
      record.logo_url,
      record.contactPhoto,
      record.contact_photo,
      record.customerAvatar,
      record.customer_avatar,
      record.homeownerAvatar,
      record.homeowner_avatar,
      record.avatar,
      record.avatarUrl,
      record.avatar_url,
    ]
      .map((value) => String(value || "").trim())
      .find(Boolean) || ""
  );
}

function applyLiveConversationAvatar(record = {}, viewerRole = "") {
  const isBusinessParticipant =
    String(viewerRole || "").toLowerCase() === "homeowner";
  const savedAvatar = isBusinessParticipant
    ? getScopedProfilePhoto("business", record)
    : getPersonalProfilePhotoForRecord(record);
  const avatar = savedAvatar || getExplicitConversationAvatar(record);

  if (!avatar) return record;

  if (isBusinessParticipant) {
    return {
      ...record,
      participantAvatar: avatar,
      businessProfilePhoto: avatar,
      profilePhoto: avatar,
      image_url: avatar,
    };
  }

  return {
    ...record,
    participantAvatar: avatar,
    profilePhoto: avatar,
    profilePhotoUrl: avatar,
  };
}

function saveConversationRegistryItem(item) {
  const registry = getConversationRegistry();
  const existing = registry.find((entry) => String(entry.id) === String(item.id));
  const userSavedToHistory =
    item.userSavedToHistory ||
    item.user_saved_to_history ||
    existing?.userSavedToHistory ||
    existing?.user_saved_to_history ||
    localStorage.getItem(`meetro_conversation_user_saved_${item.id}`) === "true";

  const normalized = {
    ...(existing || {}),
    ...item,
    id: String(item.id),
    project_title: item.project_title || item.name || "Conversation",
    project_description:
      item.project_description || item.lastMessage || "Tap to open conversation",
    homeowner_email: item.homeowner_email || item.customer || item.name || "Contact",
    location: item.location || "Saved Contact",
    status: userSavedToHistory
      ? t("savedHistory")
      : item.status || "Message",
    unread: item.unread ?? false,
    conversation_type: item.conversation_type || "standard",
    saved_to_history:
      item.saved_to_history ||
      localStorage.getItem(`meetro_conversation_saved_${item.id}`) === "true" ||
      false,
    userSavedToHistory,
    user_saved_to_history: userSavedToHistory,
    userSavedToHistoryAt:
      item.userSavedToHistoryAt || existing?.userSavedToHistoryAt || "",
    savedToHistorySource:
      item.savedToHistorySource || existing?.savedToHistorySource || "",
    savedAt: item.savedAt || new Date().toISOString(),
  };

  const withoutDuplicate = registry.filter(
    (entry) => String(entry.id) !== String(normalized.id)
  );

  const updated = [normalized, ...withoutDuplicate];

  localStorage.setItem(
    "meetro_conversation_registry",
    JSON.stringify(updated)
  );
  writeUnreadConversationCount(updated);

  window.dispatchEvent(new Event("meetro-messages-updated"));
}

function dedupeConversations(list) {
  const seen = new Set();

  return list.filter((item) => {
    const id = String(item.id || "");

    if (!id || seen.has(id)) return false;

    seen.add(id);
    return true;
  });
}

function readJsonArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Opening a conversation must not depend on optional storage writes.
  }
}

function safeRemoveStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Opening a conversation must not depend on optional storage cleanup.
  }
}

function shouldBlockMessagesForConnection(state = {}) {
  if (state.connected) return false;

  return [
    "missing_token",
    "session_stale",
    "account_inactive",
    "account_disconnected",
    "account_access_blocked",
  ].includes(String(state.reason || ""));
}

function normalizeMessageSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeRelationshipId(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const RELATIONSHIP_VIEW_OPTIONS = [
  ["all", "All Relationships"],
  ["customer", "Customers"],
  ["professional", "Professionals / Vendors"],
  ["employee", "Employees"],
  ["tenant", "Tenants"],
  ["propertyManager", "Property Managers"],
];

const CONTACT_SECTION_OPTION = ["contacts", "Contacts"];
const COMMUNICATION_SECTION_OPTIONS = [
  ["conversations", "Conversations"],
  ["hiring", "Hiring"],
  ["emergency", "Emergency"],
];
const MESSAGE_SECTION_OPTIONS = [
  CONTACT_SECTION_OPTION,
  ...COMMUNICATION_SECTION_OPTIONS,
];

function normalizeRelationshipView(value) {
  const view = String(value || "all");

  if (view === "vendor") return "professional";

  return RELATIONSHIP_VIEW_OPTIONS.some(([key]) => key === view) ? view : "all";
}

function normalizeMessageSection(value) {
  const section = String(value || "conversations");

  if (section === "all" || section === "work") return "conversations";

  return MESSAGE_SECTION_OPTIONS.some(([key]) => key === section)
    ? section
    : "conversations";
}

const CONVERSATION_SECTION_ACTIONS = [
  ["chat", "New Conversation"],
  ["group", "New Group Conversation"],
];
const SAVED_HISTORY_ACTION = ["savedHistory", "Saved Conversation History"];

const CONTACTS_SECTION_ACTIONS = [
  ["customer", "Add Customer"],
  ["professional", "Add Professional / Vendor"],
  ["employee", "Add Employee"],
  ["tenant", "Add Tenant"],
  ["propertyManager", "Add Property Manager"],
  ["import", "Import Contacts"],
  ["invite", "Invite to Meetro"],
];

const HIRING_SECTION_ACTIONS = [
  ["hiringCenter", "Open Hiring Center"],
];

const EMERGENCY_SECTION_ACTIONS = [
  ["emergencyCenter", "Open Emergency Request"],
];

const RELATIONSHIP_FIELD_BY_TYPE = {
  customer: "customerName",
  tenant: "tenantName",
  propertyManager: "propertyManagerName",
  professional: "professionalName",
  business: "businessName",
  employee: "employeeName",
  vendor: "vendorName",
  property: "propertyName",
  space: "relationshipSpaceName",
  import: "participantName",
  hiring: "applicantName",
  emergency: "customerName",
};

function createEmptyComposer(type = "customer", label = "New Relationship") {
  return {
    type,
    label,
    name: "",
    groupName: "",
    tenantRelationshipId: "",
    vendorRelationshipId: "",
    forwardedTicketConversationId: "",
    propertyUnit: "",
    purpose: "",
    phone: "",
    email: "",
    address: "",
    note: "",
  };
}

function createEmptyConversationStarter(mode = "single") {
  return {
    mode,
    step: "select",
    source: "contacts",
    selectedIds: [],
    groupName: "",
    groupPhoto: "",
    search: "",
    notice: "",
  };
}

function getDefaultImportType(activeMode = "business") {
  return activeMode === "business" ? "customer" : "vendor";
}

function createEmptyContactImport(activeMode = "business") {
  return {
    step: "source",
    source: "",
    contacts: [],
    selectedIds: [],
    defaultType: getDefaultImportType(activeMode),
    notice: "",
    manual: {
      name: "",
      phone: "",
      email: "",
      address: "",
    },
  };
}

function createEmptyTicketComposer(relationship = {}) {
  const contact =
    relationship?.contact && typeof relationship.contact === "object"
      ? relationship.contact
      : {};

  return {
    relationshipId: relationship.id || "",
    tenant: relationship.type === "tenant" ? relationship.name : "",
    propertyUnit: contact.address || "",
    description: "",
    priority: "Normal",
    assignedProfessional: "",
  };
}

function MessagesInbox({ setPage, currentPage }) {
  const activeJobSnapshot = getActiveJobSnapshot();
  const appLayoutMetrics = useAppLayoutMetrics();
  const communicationLayout = getCommunicationLayout(appLayoutMetrics);
  const isSplitPane = communicationLayout.mode === "desktop";
  const isWideWorkspace = communicationLayout.columns === 3;

  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accountConnectionState, setAccountConnectionState] = useState(() =>
    getStoredAccountConnectionState()
  );
  const [language, updateLanguage] = useState(getLanguage());
  const [activeAccountMode, setActiveAccountMode] = useState(
    localStorage.getItem("activeAccountMode") || "personal"
  );
  const [compactContextOpen, setCompactContextOpen] = useState(false);
  const [activeSplitConversationId, setActiveSplitConversationId] = useState(
    localStorage.getItem("activeConversationId") || ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSection, setMessageSectionState] = useState(
    normalizeMessageSection(localStorage.getItem("meetroMessageSection"))
  );
  const [activeRelationshipId, setActiveRelationshipId] = useState("");
  const [relationshipView, setRelationshipViewState] = useState(
    normalizeRelationshipView(localStorage.getItem("meetroRelationshipView"))
  );
  const [relationshipViewMenuOpen, setRelationshipViewMenuOpen] = useState(false);
  const [relationshipActionMenuOpen, setRelationshipActionMenuOpen] = useState(false);
  const [conversationStarter, setConversationStarter] = useState(null);
  const [relationshipComposer, setRelationshipComposer] = useState(null);
  const [contactImport, setContactImport] = useState(null);
  const [ticketComposer, setTicketComposer] = useState(null);
  const [savedHistoryOpen, setSavedHistoryOpen] = useState(
    localStorage.getItem("meetroMessagesOpenSavedHistory") === "true"
  );
  const [relationshipNotice, setRelationshipNotice] = useState("");
  const [activeContactCardId, setActiveContactCardId] = useState("");
  const [activeContactCardSnapshot, setActiveContactCardSnapshot] = useState(null);
  const [contactInviteOptionsId, setContactInviteOptionsId] = useState("");
  const [contactEditDraft, setContactEditDraft] = useState(null);
  const contactImportFileRef = useRef(null);
  const relationshipIdentityReturnScrollRef = useRef(0);
  const activeContactCard = activeContactCardSnapshot;
  const focusedMessagesFlowOpen = Boolean(
    conversationStarter ||
      relationshipComposer ||
      contactImport ||
      ticketComposer ||
      savedHistoryOpen ||
      activeContactCardId
  );
  const focusedConversationFlowOpen = Boolean(
    conversationStarter || relationshipComposer?.returnToStarter
  );

  const setMessageSection = (section) => {
    const nextSection = normalizeMessageSection(section);

    localStorage.setItem("meetroMessageSection", nextSection);
    setMessageSectionState(nextSection);
    setRelationshipViewMenuOpen(false);
    setRelationshipActionMenuOpen(false);
    setActiveRelationshipId("");
    setActiveContactCardId("");
    setActiveContactCardSnapshot(null);
    setConversationStarter(null);
    setRelationshipComposer(null);
    setTicketComposer(null);
    localStorage.removeItem("meetroMessagesOpenSavedHistory");
    setSavedHistoryOpen(false);
  };

  const setRelationshipView = (view) => {
    const nextView = normalizeRelationshipView(view);

    localStorage.setItem("meetroRelationshipView", nextView);
    setRelationshipViewState(nextView);
    setRelationshipViewMenuOpen(false);
  };

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    if (focusedMessagesFlowOpen) {
      document.body.classList.add("messages-focused-flow-open");
    } else {
      document.body.classList.remove("messages-focused-flow-open");
    }

    return () => {
      document.body.classList.remove("messages-focused-flow-open");
    };
  }, [focusedMessagesFlowOpen]);

  const isSpanish = language === "es";

  function readActiveEmergencyRecord() {
    try {
      const parsed = JSON.parse(
        localStorage.getItem("activeEmergencyRecord") || "{}"
      );

      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function getEmergencyConversation() {
  const currentUserKey =
    localStorage.getItem("userId") ||
    localStorage.getItem("userEmail") ||
    "guest";

  const activeEmergencyRecord = readActiveEmergencyRecord();

  const emergencyConversationId =
    activeEmergencyRecord.conversationId ||
    localStorage.getItem("emergencyConversationId") ||
    `emergency-active-request-${currentUserKey}`;

  const emergencySaved =
    localStorage.getItem(`meetro_conversation_${emergencyConversationId}`) ||
    localStorage.getItem(`meetro_emergency_conversation_meta_${currentUserKey}`);

  const emergencyStatus =
    activeEmergencyRecord.status ||
    localStorage.getItem("emergencyDispatchStatus") ||
    "";
  const emergencyArchived =
    localStorage.getItem(
      `meetro_conversation_saved_${emergencyConversationId}`
    ) === "true";

  const hasActiveEmergency =
    Boolean(emergencySaved || activeEmergencyRecord.id) &&
    !emergencyArchived &&
    !["cancelled", "closed", "archived"].includes(emergencyStatus);

  if (!hasActiveEmergency) return null;

  const conversationMeta = getConversationMeta(emergencyConversationId);
  const savedMessages = (() => {
    try {
      return JSON.parse(
        localStorage.getItem(`meetro_conversation_${emergencyConversationId}`) ||
          "[]"
      );
    } catch {
      return [];
    }
  })();
  const latestMessage = savedMessages[savedMessages.length - 1];
  const latestMessageText =
    latestMessage?.title ||
    latestMessage?.text ||
    conversationMeta.lastMessage ||
    "";

  const emergencyService =
    activeEmergencyRecord.service ||
    activeEmergencyRecord.title ||
    localStorage.getItem(`selectedEmergencyService_${currentUserKey}`) ||
    activeJobSnapshot?.service ||
    localStorage.getItem("activeJobService") ||
    localStorage.getItem("selectedEmergencyService") ||
    (isSpanish ? "Emergencia" : "Emergency Request");
  const emergencyBusinessName =
    activeEmergencyRecord.businessName ||
    activeEmergencyRecord.business_name ||
    activeEmergencyRecord.providerName ||
    activeEmergencyRecord.provider_name ||
    conversationMeta.businessName ||
    conversationMeta.business_name ||
    conversationMeta.providerName ||
    conversationMeta.provider_name ||
    localStorage.getItem("conversationBusinessName") ||
    localStorage.getItem("businessName") ||
    "";
  const emergencyBusinessPhoto =
    activeEmergencyRecord.businessProfilePhoto ||
    activeEmergencyRecord.business_profile_photo ||
    activeEmergencyRecord.businessProfilePhotoUrl ||
    activeEmergencyRecord.business_profile_photo_url ||
    activeEmergencyRecord.businessLogo ||
    activeEmergencyRecord.business_logo ||
    conversationMeta.businessProfilePhoto ||
    conversationMeta.businessProfilePhotoUrl ||
    conversationMeta.businessLogo ||
    localStorage.getItem("businessImageUrl") ||
    "";

  return {
    id: emergencyConversationId,
    businessName: emergencyBusinessName,
    providerName: emergencyBusinessName,
    businessProfilePhoto: emergencyBusinessPhoto,
    businessLogo: emergencyBusinessPhoto,
    project_title: emergencyService,
    project_description:
      latestMessageText ||
      activeEmergencyRecord.issue ||
      activeEmergencyRecord.project_description ||
      (isSpanish
        ? "Conversación de emergencia activa guardada."
        : "Saved active emergency conversation."),
    homeowner_email:
      activeEmergencyRecord.customerName ||
      activeEmergencyRecord.customer ||
      (isSpanish ? "Cliente de Emergencia" : "Emergency Client"),
    location:
      activeEmergencyRecord.location ||
      localStorage.getItem("emergencyLocation") ||
      "Emergency Service Location",
    status:
      emergencyStatus ||
      (isSpanish ? "emergencia" : "emergency"),
    unread:
      isConversationUnreadForRole(emergencyConversationId, undefined, false),
    conversation_type: "emergency",
    saved_to_history: false,
  };
}

  function mergeEmergencyConversation(list) {
    const emergencyConversation = getEmergencyConversation();

    if (!emergencyConversation) return list;

    const withoutDuplicate = list.filter(
      (item) =>
        String(item.id) !== String(emergencyConversation.id) &&
        !String(item.id).startsWith("emergency-active-request-")
    );

    return [emergencyConversation, ...withoutDuplicate];
  }

  useEffect(() => {
    const handleLanguageChange = () => {
      updateLanguage(getLanguage());
    };
    const handleAccountModeChange = () => {
      setActiveAccountMode(localStorage.getItem("activeAccountMode") || "personal");
    };
    const handleAccountConnectionIssue = (event) => {
      const nextConnectionState =
        event?.detail?.connected === false
          ? event.detail
          : getStoredAccountConnectionState();

      if (!shouldBlockMessagesForConnection(nextConnectionState)) {
        setAccountConnectionState({ connected: true, reason: "local_messages" });
        return;
      }

      setAccountConnectionState(nextConnectionState);
      setQuotes([]);
      setLoading(false);
      setConversationStarter(null);
      setRelationshipComposer(null);
      setContactImport(null);
      setTicketComposer(null);
      setSavedHistoryOpen(false);
    };

    window.addEventListener("languageChanged", handleLanguageChange);
    window.addEventListener("meetroLanguageChanged", handleLanguageChange);
    window.addEventListener("meetro-language-change", handleLanguageChange);
    window.addEventListener("accountModeChanged", handleAccountModeChange);
    window.addEventListener(
      "meetroAccountConnectionIssue",
      handleAccountConnectionIssue
    );
    window.addEventListener("storage", handleAccountModeChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
      window.removeEventListener("meetroLanguageChanged", handleLanguageChange);
      window.removeEventListener("meetro-language-change", handleLanguageChange);
      window.removeEventListener("accountModeChanged", handleAccountModeChange);
      window.removeEventListener(
        "meetroAccountConnectionIssue",
        handleAccountConnectionIssue
      );
      window.removeEventListener("storage", handleAccountModeChange);
    };
  }, []);

  useEffect(() => {
    fetchConversations();

    const refreshMessages = () => {
      fetchConversations();
    };

    window.addEventListener("focus", refreshMessages);
    window.addEventListener("storage", refreshMessages);
    window.addEventListener("meetro-messages-updated", refreshMessages);
    window.addEventListener(
      "meetroEmergencyConversationUpdated",
      refreshMessages
    );

    const pollingInterval = setInterval(() => {
      if (!document.hidden) {
        refreshMessages();
      }
    }, 7000);

    return () => {
      clearInterval(pollingInterval);
      window.removeEventListener("focus", refreshMessages);
      window.removeEventListener("storage", refreshMessages);
      window.removeEventListener("meetro-messages-updated", refreshMessages);
      window.removeEventListener(
        "meetroEmergencyConversationUpdated",
        refreshMessages
      );
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    writeUnreadConversationCount(quotes);

    window.dispatchEvent(new Event("storage"));
  }, [quotes]);

  function getRegistryConversationsForList() {
    return getConversationRegistry().map((item) => ({
      ...item,
      unread: isConversationUnreadForRole(item.id, undefined, item.unread),
      userSavedToHistory: isConversationUserSavedToHistory(item),
      user_saved_to_history: isConversationUserSavedToHistory(item),
      saved_to_history:
        item.saved_to_history ||
        localStorage.getItem(`meetro_conversation_saved_${item.id}`) === "true",
      status:
        isConversationUserSavedToHistory(item)
          ? isSpanish
            ? "Historial guardado"
            : t("savedHistory")
          : item.status,
    }));
  }

  function getScopedContactConversationsForList() {
    const { profileScopeKey } = getActiveProfileScopeDescriptor({
      activeAccountMode,
    });

    return readProfileScopedContacts({ profileScopeKey }).map((item) => ({
      ...item,
      unread: isConversationUnreadForRole(item.id, undefined, item.unread),
      saved_to_history: false,
      userSavedToHistory: false,
      user_saved_to_history: false,
    }));
  }

  function getLocalBusinessConversationsForList() {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith("meetro_conversation_business_"))
      .map((key) => {
        const id = key.replace("meetro_conversation_", "");
        const meta = getConversationMeta(id);

        return {
          id,
          project_title:
            meta.activeJobService ||
            meta.projectTitle ||
            localStorage.getItem("conversationBusinessName") ||
            t("projectConversation"),
          project_description:
            meta.lastMessage ||
            t("tapOpenConversation"),
          location:
            meta.location ||
            t("location"),
          status: "Message",
          relationshipScope: "business",
          accountMode: "business",
          conversation_type: "standard",
          unread:
            isConversationUnreadForRole(id, undefined, false),
        };
      });
  }

  function getLocalConversationListFallback() {
    return filterDeletedConversations(
      dedupeConversations(
        mergeEmergencyConversation([
          ...getRegistryConversationsForList(),
          ...getScopedContactConversationsForList(),
          ...getLocalBusinessConversationsForList(),
        ])
      )
    );
  }

  async function fetchConversations() {
    try {
      const storedConnectionState = getStoredAccountConnectionState();

      if (shouldBlockMessagesForConnection(storedConnectionState)) {
        setAccountConnectionState(storedConnectionState);
        setQuotes([]);
        setLoading(false);
        return;
      }

      const readConversationIds = JSON.parse(
        localStorage.getItem("readConversationIds") || "[]"
      );

      const result = await authFetch("/contractor-quote-requests", {}, setPage);
      const resultConnectionState = getAccountConnectionStateFromAuthResult(result);

      if (shouldBlockMessagesForConnection(resultConnectionState)) {
        setAccountConnectionState(resultConnectionState);
        setQuotes([]);
        return;
      }

      if (result?.response && !result.response.ok) {
        setAccountConnectionState({ connected: true, reason: "local_messages" });
      } else {
        setAccountConnectionState({ connected: true, reason: "connected" });
      }

      let nextQuotes = [];

      if (result?.response?.ok) {
        const incomingQuotes = result.data.quotes || [];

        if (incomingQuotes.length > 0) {
          nextQuotes = incomingQuotes.map((quote, index) => ({
            ...quote,
            relationshipScope: quote.relationshipScope || quote.relationship_scope || "business",
            accountMode: quote.accountMode || quote.account_mode || "business",
            conversation_type: quote.conversation_type || "standard",
            unread:
              index < 2 && !readConversationIds.includes(String(quote.id)),
          }));
        }
      }

      setQuotes(
        filterDeletedConversations(
          dedupeConversations(
            mergeEmergencyConversation([
              ...getRegistryConversationsForList(),
              ...getScopedContactConversationsForList(),
              ...nextQuotes,
              ...getLocalBusinessConversationsForList(),
            ])
          )
        )
      );
    } catch (error) {
      console.error(error);
      setAccountConnectionState({ connected: true, reason: "local_messages" });
      setQuotes(getLocalConversationListFallback());
    } finally {
      setLoading(false);
    }
  }

  function deleteConversation(e, quoteId) {
    e.stopPropagation();

    const confirmed = window.confirm(
      language === "es"
        ? "¿Eliminar esta conversación?"
        : "Delete this conversation?"
    );

    if (!confirmed) return;

    const deletedIds = getDeletedConversationIds();

    localStorage.setItem(
      "deletedConversationIds",
      JSON.stringify([...new Set([...deletedIds, quoteId])])
    );

    const updatedQuotes =
      quotes.filter((q) => q.id !== quoteId);

    setQuotes(updatedQuotes);

    localStorage.removeItem(
      `meetro_conversation_${quoteId}`
    );

    localStorage.removeItem(
      `meetro_conversation_meta_${quoteId}`
    );

    const registry = getConversationRegistry();

    localStorage.setItem(
      "meetro_conversation_registry",
      JSON.stringify(
        registry.filter((item) => String(item.id) !== String(quoteId))
      )
    );

    window.dispatchEvent(
      new Event("meetro-messages-updated")
    );
  }

  function stageConversationForThread(quote = {}) {
    const projectedQuote = applyConversationIdentity(quote, {
      viewerRole: activeAccountMode === "business" ? "business" : "homeowner",
    });
    const id = String(projectedQuote.id || quote.id || "").trim();

    if (!id) return null;

    const conversationType =
      projectedQuote.conversation_type || quote.conversation_type || quote.type || "standard";
    const activeName =
      projectedQuote.participantName ||
      projectedQuote.customerName ||
      projectedQuote.businessName ||
      projectedQuote.project_title ||
      projectedQuote.name ||
      "Conversation";

    const threadPayload = {
      ...projectedQuote,
      id,
      conversationId: projectedQuote.conversationId || quote.conversationId || id,
      activeConversationId: id,
      conversation_type: conversationType,
    };

    safeSetStorage("selectedQuoteRequestId", id);
    safeSetStorage("selectedQuoteRequest", JSON.stringify(threadPayload));
    safeSetStorage("selectedConversation", JSON.stringify(threadPayload));
    safeSetStorage(
      "selectedMessageReceiverId",
      String(projectedQuote.homeowner_id || quote.homeowner_id || "")
    );
    safeSetStorage("conversationReturnPage", "messagesInbox");
    safeSetStorage("activeConversationId", id);
    safeSetStorage("activeConversationName", activeName);
    safeSetStorage("meetroConversationType", conversationType);

    return threadPayload;
  }

  function prepareConversation(quote, options = {}) {
    const projectedQuote = stageConversationForThread(quote);
    if (!projectedQuote) return null;

    const readConversationIds = readJsonArray("readConversationIds");

    if (!readConversationIds.includes(String(projectedQuote.id))) {
      readConversationIds.push(String(projectedQuote.id));

      safeSetStorage(
        "readConversationIds",
        JSON.stringify(readConversationIds)
      );
    }

    if (options.updateList !== false) {
      const updatedQuotes = quotes.map((item) =>
        String(item.id) === String(projectedQuote.id)
          ? { ...item, unread: false }
          : item
      );

      setQuotes(updatedQuotes);
    }

    try {
      markConversationRead(projectedQuote.id, projectedQuote);
    } catch {
      // Read receipts are secondary to opening the thread.
    }

    try {
      saveConversationRegistryItem({
        ...projectedQuote,
        id: projectedQuote.id,
        project_title:
          projectedQuote.project_title ||
          projectedQuote.business_name ||
          projectedQuote.homeowner_email ||
          "Conversation",
        project_description:
          projectedQuote.project_description ||
          "Saved conversation for future communication.",
        homeowner_email:
          projectedQuote.homeowner_email ||
          projectedQuote.business_name ||
          "Contact",
        conversation_type: projectedQuote.conversation_type || "standard",
        unread: false,
        saved_to_history:
          projectedQuote.saved_to_history ||
          localStorage.getItem(`meetro_conversation_saved_${projectedQuote.id}`) === "true",
      });
    } catch {
      // Registry persistence should never block opening the active thread.
    }

    return projectedQuote;
  }

  function openConversation(quote, options = {}) {
    const conversation = prepareConversation(quote, { updateList: false });
    if (!conversation) return;

    const shouldUseSplitPane =
      isSplitPane && options.preferSplitPane === true && !options.forceRoute;

    if (shouldUseSplitPane) {
      setActiveSplitConversationId(String(conversation.id));
      window.setTimeout(() => {
        prepareConversation(conversation, { updateList: false });
      }, 0);
      return;
    }

    setActiveSplitConversationId("");
    setPage("conversationThread");
  }

  function openConversationRow(summaryOrRecord = {}, options = {}) {
    const conversation = normalizeConversationForOpen(summaryOrRecord);
    if (!conversation) return;

    setRelationshipViewMenuOpen(false);
    setRelationshipActionMenuOpen(false);
    setActiveRelationshipId("");
    setActiveContactCardId("");
    setActiveContactCardSnapshot(null);
    setConversationStarter(null);
    setRelationshipComposer(null);
    setContactImport(null);
    setTicketComposer(null);
    setContactInviteOptionsId("");
    setContactEditDraft(null);
    setSavedHistoryOpen(false);

    if (options.returnToSavedHistory) {
      localStorage.setItem("meetroMessagesOpenSavedHistory", "true");
      localStorage.setItem("conversationReturnPage", "messagesInbox");
    } else {
      safeRemoveStorage("meetroMessagesOpenSavedHistory");
    }

    openConversation(conversation, {
      preferSplitPane: isSplitPane && !options.returnToSavedHistory,
      forceRoute: !isSplitPane || options.returnToSavedHistory,
    });
  }

  const isHiringConversation = (quote) =>
    isHiringConversationType(quote.conversation_type || quote.type);
  const isEmergencyConversationType = (quote) =>
    quote.conversation_type === "emergency";
  const isWorkConversation = (quote) =>
    !quote.saved_to_history &&
    !isEmergencyConversationType(quote) &&
    !isHiringConversation(quote);

  function getWorkflowStatusLabel(quote) {
    if (quote.saved_to_history) return t("savedHistory");
    if (isHiringConversation(quote)) {
      return quote.status || (isSpanish ? "Nueva consulta" : "New inquiry");
    }
    if (quote.conversation_type === "emergency") {
      return isSpanish ? "Emergencia activa" : "Active emergency";
    }

    const rawStatus = String(quote.status || quote.workflow_status || "").toLowerCase();
    const description = String(quote.project_description || "").toLowerCase();

    if (rawStatus.includes("confirmed") || description.includes("confirmed")) {
      return t("appointmentConfirmed");
    }

    if (
      rawStatus.includes("schedule") ||
      rawStatus.includes("appointment") ||
      description.includes("appointment") ||
      description.includes("scheduled")
    ) {
      return isSpanish ? "Cita programada" : "Appointment Scheduled";
    }

    if (rawStatus.includes("quote") || description.includes("quote")) {
      return isSpanish ? "Cotización en revisión" : "Quote in Review";
    }

    if (rawStatus.includes("completion") || rawStatus.includes("completed")) {
      return isSpanish ? "Revisión de finalización" : "Completion Review";
    }

    if (rawStatus.includes("closure") || rawStatus.includes("closed")) {
      return isSpanish ? "Cierre pendiente" : "Closure Pending";
    }

    if (quote.unread) return t("messageNeedsAttention");

    return isSpanish ? "Comunicación activa" : "Active Communication";
  }

  function getConversationWorkflowLabel(quote) {
    if (quote.saved_to_history) return t("messageLabelCompleted");
    if (isEmergencyConversationType(quote)) return t("messageLabelEmergency");
    if (isHiringConversation(quote)) return t("messageLabelHiring");

    const status = String(quote.status || quote.workflow_status || "").toLowerCase();
    const description = String(quote.project_description || quote.lastMessage || "").toLowerCase();
    const title = String(quote.project_title || quote.projectTitle || "").toLowerCase();
    const combined = `${status} ${description} ${title}`;

    if (combined.includes("quote") || combined.includes("proposal")) {
      return t("messageLabelQuote");
    }

    if (
      combined.includes("schedule") ||
      combined.includes("appointment") ||
      combined.includes("visit")
    ) {
      return t("messageLabelSchedule");
    }

    return t("messageLabelProject");
  }

  function getConversationParticipantName(quote = {}) {
    return getConversationParticipantIdentity(quote, {
      viewerRole: activeAccountMode === "business" ? "business" : "homeowner",
      fallbackName: isHiringConversation(quote)
        ? t("hiring")
        : isEmergencyConversationType(quote)
        ? t("emergency")
        : t("conversation"),
    }).displayName;
  }

  function getConversationPriority(quote = {}) {
    const status = String(quote.status || quote.workflow_status || "").toLowerCase();
    const description = String(quote.project_description || quote.lastMessage || "").toLowerCase();
    const combined = `${status} ${description}`;

    if (quote.unread) return 0;
    if (isEmergencyConversationType(quote) && !quote.saved_to_history) return 1;
    if (
      combined.includes("quote") ||
      combined.includes("proposal") ||
      combined.includes("approval") ||
      combined.includes("decision")
    ) {
      return 2;
    }
    if (
      combined.includes("schedule") ||
      combined.includes("appointment") ||
      combined.includes("confirm")
    ) {
      return 3;
    }
    if (
      combined.includes("active") ||
      combined.includes("progress") ||
      combined.includes("work")
    ) {
      return 4;
    }
    if (isHiringConversation(quote)) return 5;
    if (quote.saved_to_history) return 7;
    return 6;
  }

  function getConversationSortTime(quote = {}) {
    const value =
      quote.lastTime ||
      quote.lastMessageAt ||
      quote.updatedAt ||
      quote.savedAt ||
      quote.createdAt ||
      "";
    const time = value ? new Date(value).getTime() : 0;

    return Number.isFinite(time) ? time : 0;
  }

  function sortConversationsByAttention(list) {
    return list
      .slice()
      .sort((left, right) => {
        const priorityDelta =
          getConversationPriority(left) - getConversationPriority(right);

        if (priorityDelta !== 0) return priorityDelta;

        return getConversationSortTime(right) - getConversationSortTime(left);
      });
  }

  function isSavedChatHistoryConversation(quote = {}) {
    return isConversationUserSavedToHistory(quote);
  }

  function hasLocalConversationThread(conversationId = "") {
    const id = String(conversationId || "").trim();
    if (!id) return false;

    try {
      const saved = localStorage.getItem(`meetro_conversation_${id}`);
      if (saved === null) return false;

      const parsed = JSON.parse(saved || "[]");
      return Array.isArray(parsed);
    } catch {
      return false;
    }
  }

  function isContactOnlyConversationRecord(quote = {}) {
    const statusText = normalizeMessageSearchText(
      [
        quote.status,
        quote.currentWorkStatus,
        quote.project_description,
        quote.lastMessage,
      ].filter(Boolean).join(" ")
    );

    return Boolean(
      (quote.contactImported === true && quote.meetroAccountLinked !== true) ||
        (quote.contactImported === true && quote.savedToContacts === true) ||
        quote.inviteStatus === "not_invited" ||
        statusText.includes("imported contact") ||
        statusText.includes("saved contact") ||
        statusText.includes("saved from conversation") ||
        statusText.includes("invite to meetro later")
    );
  }

  function hasInitializedConversationThread(quote = {}, conversationId = "") {
    const id = String(conversationId || "").trim();
    if (!id) return false;

    const linkedIds = [
      quote.conversationId,
      quote.threadId,
      quote.sourceConversationId,
      quote.linkedConversationId,
      quote.activeConversationId,
      quote.projectConversationId,
      quote.emergencyConversationId,
      quote.requestConversationId,
    ].map((value) => String(value || "").trim());

    return Boolean(
      hasLocalConversationThread(id) ||
        /^\d+$/.test(id) ||
        isEmergencyConversationType(quote) ||
        isHiringConversation(quote) ||
        linkedIds.includes(id) ||
        /^(relationship-chat|conversation-group|business_|conversation-business|emergency|hiring)/.test(id) ||
        quote.initializedThread === true ||
        quote.threadInitialized === true ||
        quote.lastMessage ||
        quote.lastMessageAt ||
        quote.messageCount > 0
    );
  }

  function isRealConversationThread(quote = {}) {
    const conversation = normalizeConversationForOpen(quote);
    if (!conversation) return false;
    if (isContactOnlyConversationRecord(conversation)) return false;

    return hasInitializedConversationThread(conversation, conversation.id);
  }

  function conversationMatchesMessageSection(quote = {}, section = "conversations") {
    if (!isRealConversationThread(quote)) return false;
    if (isSavedChatHistoryConversation(quote)) return false;
    if (section === "emergency") return isEmergencyConversationType(quote);
    if (section === "hiring") return isHiringConversation(quote);
    if (section === "conversations") {
      return !isEmergencyConversationType(quote) && !isHiringConversation(quote);
    }

    return false;
  }

  function getConversationNextStep(quote) {
    if (quote.saved_to_history) return t("messageNextStepSaved");
    if (isHiringConversation(quote)) {
      return isSpanish
        ? "Responder sobre la posición"
        : "Reply about this position";
    }
    if (quote.conversation_type === "emergency") return t("messageNextStepEmergency");
    if (quote.unread) return t("messageNextStepReply");

    const status = getWorkflowStatusLabel(quote).toLowerCase();

    if (status.includes("appointment") || status.includes("cita")) {
      return t("messageNextStepAppointment");
    }

    if (status.includes("quote") || status.includes("cotización")) {
      return t("messageNextStepQuote");
    }

    if (status.includes("completion") || status.includes("finalización")) {
      return t("messageNextStepCompletion");
    }

    if (status.includes("closure") || status.includes("cierre")) {
      return t("messageNextStepClosure");
    }

    return t("messageNextStepOpen");
  }

  function getConversationDisplayTime(quote = {}) {
    return (
      formatMessageTime(
        quote.lastTime ||
          quote.lastMessageAt ||
          quote.updatedAt ||
          quote.savedAt ||
          quote.createdAt
      ) || t("open")
    );
  }

  function getResolvedConversationState(quote = {}) {
    const id = String(quote.id || quote.conversationId || "");
    const activeEmergencyRecord = readActiveEmergencyRecord();
    const activeEmergencyId = String(
      activeEmergencyRecord.conversationId ||
        activeEmergencyRecord.conversation_id ||
        localStorage.getItem("activeEmergencyConversationId") ||
        ""
    );
    const emergencyState =
      isEmergencyConversationType(quote) && id && id === activeEmergencyId
        ? activeEmergencyRecord.status || localStorage.getItem("emergencyDispatchStatus")
        : "";
    const activeJobState =
      activeJobSnapshot?.conversationId &&
      String(activeJobSnapshot.conversationId) === id
        ? activeJobSnapshot.status ||
          activeJobSnapshot.workflowStatus ||
          activeJobSnapshot.workStatus ||
          activeJobSnapshot.jobStage
        : "";

    return String(
      emergencyState ||
        activeJobState ||
        quote.activeJobStatus ||
        quote.workflowStatus ||
        quote.workflow_status ||
        quote.workStatus ||
        quote.work_status ||
        quote.jobStage ||
        quote.job_stage ||
        quote.closureStatus ||
        quote.closure_status ||
        quote.status ||
        ""
    ).toLowerCase();
  }

  function isFinalConversationState(quote = {}) {
    const state = getResolvedConversationState(quote);

    return (
      state.includes("completed") ||
      state.includes("complete") ||
      state.includes("closed") ||
      state.includes("closure_completed") ||
      state.includes("history")
    );
  }

  function getConversationPreviewText(conversation = {}) {
    const userSaved = isSavedChatHistoryConversation(conversation);

    if (isEmergencyConversationType(conversation)) {
      if (isFinalConversationState(conversation)) {
        return isSpanish
          ? "Servicio de emergencia completado"
          : "Completed emergency service";
      }

      if (userSaved) {
        return isSpanish
          ? "Conversación de emergencia guardada"
          : "Emergency conversation saved";
      }
    }

    if (userSaved && isFinalConversationState(conversation)) {
      return isSpanish
        ? "Conversación completada guardada"
        : "Completed conversation saved";
    }

    return (
      conversation.lastMessage ||
      conversation.project_description ||
      conversation.status ||
      (userSaved
        ? isSpanish
          ? "Conversación guardada"
          : "Saved conversation"
        : "Conversation")
    );
  }

  function getConversationSearchText(quote = {}) {
    const typeLabels = [
      isHiringConversation(quote) ? t("hiring") : "",
      isEmergencyConversationType(quote) ? t("emergency") : "",
      isWorkConversation(quote) ? t("work") : "",
      quote.saved_to_history ? t("savedHistory") : "",
      "quote",
      "proposal",
      "project",
      "service",
      "customer",
      "professional",
      "emergency",
      "hiring",
    ];

    return normalizeMessageSearchText(
      [
        quote.homeowner_email,
        quote.homeownerName,
        quote.homeowner_name,
        quote.customerName,
        quote.customer,
        quote.participantName,
        quote.participant_name,
        quote.applicantName,
        quote.applicant_name,
        quote.professionalName,
        quote.professional_name,
        quote.businessName,
        quote.business_name,
        quote.companyName,
        quote.company_name,
        quote.project_title,
        quote.projectTitle,
        quote.positionTitle,
        quote.position_title,
        quote.serviceType,
        quote.service_type,
        quote.service,
        quote.category,
        quote.project_description,
        quote.lastMessage,
        quote.last_message,
        quote.snippet,
        quote.status,
        quote.workflow_status,
        quote.conversation_type,
        quote.type,
        quote.source,
        quote.location,
        getConversationParticipantName(quote),
        getConversationWorkflowLabel(quote),
        getWorkflowStatusLabel(quote),
        getConversationNextStep(quote),
        ...typeLabels,
      ].filter(Boolean).join(" ")
    );
  }

  function getEmptyMessageCopy() {
    if (messageSection === "conversations") {
      return {
        title: "No conversations yet",
        text: "Start a conversation when communication is ready. Active conversations will stay here.",
      };
    }

    if (messageSection === "contacts") {
      return {
        title: "No contacts yet",
        text: "Saved contacts will appear here before a Meetro conversation begins.",
      };
    }

    if (messageSection === "hiring") {
      return {
        title: "No hiring conversations yet",
        text: "Applicants will appear here after they contact you or you start a conversation from Hiring Center.",
      };
    }

    if (messageSection === "emergency") {
      return {
        title: "No emergency conversations",
        text: "Urgent service and dispatch conversations will stay separated here.",
      };
    }

    return {
      title: t("messagesCaughtUpTitle"),
      text: t("messagesCaughtUpText"),
    };
  }

  function reconnectMessagesAccount() {
    clearMeetroSession();
    setPage("login");
  }

  function retryMessagesConnection() {
    setLoading(true);
    fetchConversations();
  }

  if (activeContactCard) {
    return (
      <div
        className="app-page meetro-wide-page meetro-visual-page messages-relationship-identity-page messages-focused-flow-open"
        style={relationshipIdentityPageWrapper}
      >
        {relationshipNotice && (
          <div style={relationshipNoticeCard}>{relationshipNotice}</div>
        )}

        {renderContactCard(activeContactCard)}

        <BottomNav setPage={setPage} currentPage="messagesInbox" />
      </div>
    );
  }

  const normalizedSearchQuery = normalizeMessageSearchText(searchQuery);
  const activeViewerRole = activeAccountMode === "business" ? "business" : "homeowner";
  const activeContactProfileScope = getActiveProfileScopeDescriptor({
    activeAccountMode,
  });
  const liveIdentityQuotes = quotes.map((quote) =>
    applyLiveConversationAvatar(quote, activeViewerRole)
  );
  const savedHistoryQuotes = liveIdentityQuotes
    .filter(isSavedChatHistoryConversation)
    .sort((left, right) => getConversationSortTime(right) - getConversationSortTime(left));
  const relationshipLayer = createRelationshipLayerModel(liveIdentityQuotes, {
    viewerRole: activeViewerRole,
    activeMode: activeAccountMode === "business" ? "business" : "personal",
    activeProfileScopeKey: activeContactProfileScope.profileScopeKey,
  });
  const currentSectionShowsCategories = false;
  const sectionRelationships = getMessageSectionRelationships(
    messageSection,
    relationshipLayer.relationships
  );
  const sectionConversationQuotes = liveIdentityQuotes.filter((quote) =>
    conversationMatchesMessageSection(quote, messageSection)
  );
  const searchedRelationships = normalizedSearchQuery
    ? sectionRelationships.filter((relationship) => {
        const contact = getRelationshipContact(relationship);

        return normalizeMessageSearchText(
          [
            relationship.name,
            relationship.typeLabel,
            relationship.currentWorkStatus,
            contact.phone,
            contact.email,
            contact.address,
          ].filter(Boolean).join(" ")
        ).includes(normalizedSearchQuery);
      })
    : sectionRelationships;
  const visibleQuotes = sectionConversationQuotes;
  const prioritizedVisibleQuotes = sortConversationsByAttention(visibleQuotes);
  const searchedVisibleQuotes = normalizedSearchQuery
    ? prioritizedVisibleQuotes.filter((quote) =>
        getConversationSearchText(quote).includes(normalizedSearchQuery)
      )
    : prioritizedVisibleQuotes;
  const activeMessageSectionLabel =
    MESSAGE_SECTION_OPTIONS.find(([key]) => key === messageSection)?.[1] ||
    "Conversations";
  const activeRelationshipViewLabel =
    RELATIONSHIP_VIEW_OPTIONS.find(([key]) => key === relationshipView)?.[1] ||
    "All";
  const emptyCopy = getEmptyMessageCopy();
  const activeSplitConversation = searchedVisibleQuotes.find(
    (quote) => String(quote.id) === String(activeSplitConversationId)
  ) || liveIdentityQuotes.find((quote) => {
    const conversation = normalizeConversationForOpen(quote);
    return conversation && String(conversation.id) === String(activeSplitConversationId);
  });
  const activeWorkspaceConversation = activeSplitConversation
    ? normalizeConversationForOpen(activeSplitConversation)
    : null;
  const activeWorkspaceRelationship = activeWorkspaceConversation
    ? getRelationshipForConversation(activeWorkspaceConversation)
    : null;
  const activeRelationship = relationshipLayer.relationships.find(
    (relationship) => relationship.id === activeRelationshipId
  );
  const activeContactCardFromLayer = relationshipLayer.relationships.find(
    (relationship) => relationship.id === activeContactCardId
  );
  const tenantRelationshipOptions = relationshipLayer.relationships.filter(
    (relationship) => relationship.type === "tenant"
  );
  const vendorRelationshipOptions = relationshipLayer.relationships.filter((relationship) =>
    ["professional", "vendor", "business"].includes(relationship.type)
  );
  const openTicketOptions = relationshipLayer.relationships.flatMap((relationship) =>
    getRelationshipOpenTickets(relationship).map((ticket) => ({
      ...ticket,
      relationship,
    }))
  );
  const selectedImportContacts = contactImport
    ? contactImport.contacts.filter((contact) =>
        contactImport.selectedIds.includes(contact.id)
      )
    : [];
  const conversationStarterCandidates = conversationStarter
    ? getConversationStarterCandidates()
    : [];
  const selectedConversationStarterRelationships = conversationStarter
    ? relationshipLayer.relationships.filter((relationship) =>
        conversationStarter.selectedIds.includes(relationship.id)
      )
    : [];
  const singleSelectionCanContinue =
    conversationStarter?.mode === "single" &&
    selectedConversationStarterRelationships.some(relationshipCanOpenConversation);
  const groupSelectionCanContinue =
    conversationStarter?.mode === "group" &&
    selectedConversationStarterRelationships.filter(relationshipCanOpenConversation).length >= 2;

  function relationshipOwnsConversation(relationship = {}, conversation = {}) {
    if (!relationship || !conversation) return false;

    const conversationIds = new Set(
      [
        conversation.id,
        conversation.conversationId,
        conversation.threadId,
        conversation.sourceConversationId,
        conversation.activeConversationId,
        conversation.projectConversationId,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    );

    const relationshipConversationIds = [
      relationship.primaryConversation?.id,
      relationship.primaryConversation?.conversationId,
      relationship.primaryConversation?.threadId,
      relationship.primaryConversation?.sourceConversationId,
      ...(getRelationshipConversations(relationship).flatMap((item) => [
        item.id,
        item.conversationId,
        item.threadId,
        item.sourceConversationId,
        item.conversation?.id,
        item.conversation?.conversationId,
      ])),
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    return relationshipConversationIds.some((id) => conversationIds.has(id));
  }

  function getRelationshipForConversation(conversation = {}) {
    if (!conversation) return null;

    const relationshipId = String(
      conversation.relationshipId ||
        conversation.relationship_id ||
        conversation.sourceRelationshipId ||
        conversation.source_relationship_id ||
        ""
    ).trim();

    return (
      relationshipLayer.relationships.find((relationship) =>
        relationshipId && String(relationship.id) === relationshipId
      ) ||
      relationshipLayer.relationships.find((relationship) =>
        relationshipOwnsConversation(relationship, conversation)
      ) ||
      null
    );
  }

  function getWorkspaceContextValue(...values) {
    return (
      values
        .map((value) => String(value || "").trim())
        .find(Boolean) || ""
    );
  }

  function isGenericConversationLabel(value = "") {
    return /^(relationship|conversation|active communication|customer context)$/i.test(
      String(value || "").trim()
    );
  }

  function getCommunicationIntent(conversation = {}, relationship = null) {
    const explicitIntent = getWorkspaceContextValue(
      conversation.communicationIntent,
      conversation.communication_intent,
      conversation.conversationIntent,
      conversation.conversation_intent,
      conversation.intent,
      conversation.intentLabel,
      conversation.intent_label,
      conversation.purpose,
      relationship?.intent
    );

    if (explicitIntent) return explicitIntent;
    if (isEmergencyConversationType(conversation)) {
      return isSpanish ? "Servicio de emergencia" : "Emergency Service";
    }
    if (isHiringConversation(conversation)) {
      return isSpanish ? "Contratación" : "Hiring";
    }

    const projectTitle = getWorkspaceContextValue(
      conversation.project_title,
      conversation.projectTitle,
      conversation.requestTitle,
      conversation.request_title,
      conversation.title,
      relationship?.currentWork?.[0]?.title
    );
    const combined = [
      projectTitle,
      conversation.project_description,
      conversation.lastMessage,
      conversation.status,
      conversation.workflow_status,
      conversation.quoteStatus,
      conversation.proposalStatus,
      conversation.invoiceStatus,
    ]
      .join(" ")
      .toLowerCase();

    if (projectTitle && !isGenericConversationLabel(projectTitle)) {
      return projectTitle;
    }
    if (/permit/.test(combined)) return isSpanish ? "Seguimiento de permiso" : "Permit Follow-up";
    if (/maintenance|repair|ticket|issue/.test(combined)) {
      return isSpanish ? "Mantenimiento" : "Maintenance";
    }
    if (/quote|proposal|estimate|cotiz/.test(combined)) {
      return isSpanish ? "Conversación de estimado" : "Estimate Discussion";
    }
    if (/invoice|payment|receipt|pago/.test(combined)) {
      return isSpanish ? "Conversación de pago" : "Payment Discussion";
    }
    if (/schedule|appointment|visit|cita/.test(combined)) {
      return isSpanish ? "Visita programada" : "Scheduled Visit";
    }

    return isSpanish ? "Comunicación general" : "General Communication";
  }

  function getConversationOwnerLabel(conversation = {}, relationship = null) {
    const explicitOwner = getWorkspaceContextValue(
      conversation.currentOwner,
      conversation.current_owner,
      conversation.owner,
      conversation.nextResponsibility,
      conversation.next_responsibility,
      conversation.responsibleParty,
      conversation.responsible_party,
      relationship?.nextResponsibility
    );

    if (explicitOwner) return explicitOwner;
    if (conversation.unread) return isSpanish ? "Tú" : "You";

    const state = getResolvedConversationState(conversation);

    if (/customer|homeowner|client|tenant|approval|approve|confirm|change_requested/.test(state)) {
      return isSpanish ? "Cliente" : "Customer";
    }
    if (/professional|business|contractor|provider|technician|in_progress|scheduled|evaluation/.test(state)) {
      return isSpanish ? "Profesional" : "Professional";
    }

    return isSpanish ? "Compartido" : "Shared";
  }

  function getConversationAuthorityFacts(conversation = {}, relationship = null) {
    const statusLabel = getWorkflowStatusLabel(conversation);

    return [
      {
        label: "Intent",
        value: getCommunicationIntent(conversation, relationship),
      },
      statusLabel && { label: "Current status", value: statusLabel },
      {
        label: "Current owner",
        value: getConversationOwnerLabel(conversation, relationship),
      },
      {
        label: "Next decision",
        value: getConversationNextStep(conversation),
      },
    ].filter(Boolean);
  }

  function getWorkspaceContextFacts(conversation = {}, relationship = null) {
    if (!conversation) return [];

    const relatedJob =
      activeJobSnapshot?.conversationId &&
      String(activeJobSnapshot.conversationId) === String(conversation.id)
        ? activeJobSnapshot
        : null;

    const projectTitle =
      conversation.project_title ||
      conversation.projectTitle ||
      conversation.title ||
      relatedJob?.projectTitle ||
      relatedJob?.title ||
      "";
    const scheduleDate =
      conversation.scheduleDate ||
      conversation.scheduledDate ||
      conversation.appointmentDate ||
      conversation.visitDate ||
      relatedJob?.scheduleDate ||
      relatedJob?.scheduledDate ||
      "";
    const scheduleTime =
      conversation.scheduleTime ||
      conversation.appointmentTime ||
      conversation.visitTime ||
      relatedJob?.scheduleTime ||
      relatedJob?.appointmentTime ||
      "";
    const quoteStatus =
      conversation.quoteStatus ||
      conversation.quote_status ||
      conversation.proposalStatus ||
      conversation.proposal_status ||
      relatedJob?.quoteStatus ||
      "";
    const currentWork =
      relationship?.currentWorkStatus ||
      relatedJob?.currentWorkStatus ||
      relatedJob?.stage ||
      "";

    return [
      projectTitle && { label: "Related work", value: projectTitle },
      currentWork && { label: "Current work", value: currentWork },
      (scheduleDate || scheduleTime) && {
        label: "Schedule",
        value: [scheduleDate, scheduleTime].filter(Boolean).join(" · "),
      },
      quoteStatus && { label: "Quote status", value: quoteStatus },
    ].filter(Boolean);
  }

  function getRelationshipMemoryFacts(conversation = {}, relationship = null) {
    if (!relationship && !conversation) return [];

    const counts = relationship ? getRelationshipCounts(relationship) : {};
    const relationshipSince = getWorkspaceContextValue(
      relationship?.relationshipSince,
      conversation.relationshipSince,
      conversation.relationship_since,
      conversation.createdAt,
      conversation.created_at
    );
    const latestActivity =
      relationship?.latestActivityAt && Number.isFinite(relationship.latestActivityAt)
        ? formatMessageTime(new Date(relationship.latestActivityAt).toISOString())
        : getConversationDisplayTime(conversation);

    return [
      relationshipSince && { label: "Relationship since", value: relationshipSince },
      latestActivity && { label: "Recent activity", value: latestActivity },
      (counts.currentWork || 0) > 0 && {
        label: "Active work",
        value: `${counts.currentWork}`,
      },
      (counts.jobHistory || 0) > 0 && {
        label: "Completed work",
        value: `${counts.jobHistory}`,
      },
      (counts.invoices || 0) > 0 && { label: "Invoices", value: `${counts.invoices}` },
      ((counts.documents || 0) > 0 || (counts.photos || 0) > 0) && {
        label: "Documents",
        value: `${(counts.documents || 0) + (counts.photos || 0)}`,
      },
    ]
      .filter(Boolean)
      .slice(0, 4);
  }

  function openWorkspaceContextDetails(conversation = {}) {
    const stagedConversation = stageConversationForThread(conversation);
    if (!stagedConversation) return;

    if (activeAccountMode === "business") {
      localStorage.setItem("activeWorkCenterTab", "active");
      localStorage.setItem("meetroWorkCenterTab", "active");
      setPage("contractorDashboard");
      return;
    }

    setPage("projectDetails");
  }

  function openRelationshipConversation(relationship, options = {}) {
    if (messageSection === "contacts" && !options.fromStarter) {
      openContactCard(relationship);
      return;
    }

    if (isImportedInactiveRelationship(relationship)) {
      openContactCard(relationship);
      return;
    }

    const conversation = getRelationshipConversationForOpen(relationship);

    if (!conversation) return;

    setActiveRelationshipId("");
    setActiveContactCardId("");
    setActiveContactCardSnapshot(null);
    setRelationshipViewMenuOpen(false);
    setRelationshipActionMenuOpen(false);
    setSavedHistoryOpen(false);
    openConversation(conversation, { preferSplitPane: true });
  }

  function getConversationIdForOpen(record = {}) {
    return (
      [
        record.conversationId,
        record.threadId,
        record.sourceConversationId,
        record.linkedConversationId,
        record.activeConversationId,
        record.projectConversationId,
        record.emergencyConversationId,
        record.requestConversationId,
        record.id,
      ]
        .map((value) => String(value || "").trim())
        .find(Boolean) || ""
    );
  }

  function normalizeConversationForOpen(summaryOrRecord = {}) {
    const conversation = summaryOrRecord.conversation || summaryOrRecord;
    const id = getConversationIdForOpen({
      ...summaryOrRecord,
      ...conversation,
    });

    if (!id) return null;

    return {
      ...summaryOrRecord,
      ...conversation,
      id,
      conversationId: conversation.conversationId || id,
      saved_to_history:
        conversation.saved_to_history ??
        summaryOrRecord.saved_to_history ??
        summaryOrRecord.savedToHistory ??
        false,
      userSavedToHistory: isConversationUserSavedToHistory({
        ...summaryOrRecord,
        ...conversation,
        id,
        conversationId: conversation.conversationId || id,
      }),
      user_saved_to_history: isConversationUserSavedToHistory({
        ...summaryOrRecord,
        ...conversation,
        id,
        conversationId: conversation.conversationId || id,
      }),
      unread: conversation.unread ?? summaryOrRecord.unread ?? false,
    };
  }

  function getRelationshipConversationForOpen(relationship = {}) {
    const conversations = getRelationshipConversations(relationship)
      .map(normalizeConversationForOpen)
      .filter(Boolean);
    const primaryConversation = normalizeConversationForOpen(
      relationship.primaryConversation || {}
    );

    if (messageSection === "emergency") {
      return (
        conversations.find(
          (conversation) => conversation.conversation_type === "emergency"
        ) ||
        (primaryConversation?.conversation_type === "emergency"
          ? primaryConversation
          : null) ||
        conversations[0] ||
        primaryConversation
      );
    }

    if (messageSection === "hiring") {
      return (
        conversations.find((conversation) => isHiringConversationType(conversation)) ||
        (primaryConversation && isHiringConversationType(primaryConversation)
          ? primaryConversation
          : null) ||
        conversations[0] ||
        primaryConversation
      );
    }

    return primaryConversation || conversations[0] || null;
  }

  function getRelationshipCounts(relationship = {}) {
    return relationship?.counts && typeof relationship.counts === "object"
      ? relationship.counts
      : {};
  }

  function getRelationshipContact(relationship = {}) {
    return relationship?.contact && typeof relationship.contact === "object"
      ? relationship.contact
      : {};
  }

  function getRelationshipConversations(relationship = {}) {
    return Array.isArray(relationship?.conversations)
      ? relationship.conversations
      : [];
  }

  function getRelationshipOpenTickets(relationship = {}) {
    return Array.isArray(relationship?.openTickets)
      ? relationship.openTickets
      : [];
  }

  function getMessageSectionActions() {
    if (messageSection === "contacts") return CONTACTS_SECTION_ACTIONS;
    if (messageSection === "hiring") return HIRING_SECTION_ACTIONS;
    if (messageSection === "emergency") return EMERGENCY_SECTION_ACTIONS;

    return CONVERSATION_SECTION_ACTIONS;
  }

  function getHeaderActionLabel() {
    if (messageSection === "conversations") return "New Conversation";
    if (messageSection === "contacts") return "Add / Import";
    if (messageSection === "hiring") return "Open Hiring Center";
    if (messageSection === "emergency") return "Open Emergency";

    return `${activeMessageSectionLabel} actions`;
  }

  function getHeaderActionMenuLabel() {
    if (messageSection === "conversations") return "New Conversation";
    if (messageSection === "contacts") return "Contacts actions";

    return `${activeMessageSectionLabel} actions`;
  }

  function getMessageSearchPlaceholder() {
    if (messageSection === "contacts") return "Search Contacts";
    if (messageSection === "hiring") return "Search Applicants";
    if (messageSection === "emergency") return "Search Emergency";

    return "Search Conversations";
  }

  function getMessageSectionCount(section) {
    if (section === "contacts") {
      return getMessageSectionRelationships(
        section,
        relationshipLayer.relationships,
        { applyCategory: false }
      ).length;
    }

    return liveIdentityQuotes.filter((quote) =>
      conversationMatchesMessageSection(quote, section)
    ).length;
  }

  function relationshipHasActiveConversation(relationship = {}) {
    return getRelationshipConversations(relationship).length > 0;
  }

  function relationshipHasHiringConversation(relationship = {}) {
    return getRelationshipConversations(relationship).some((item) =>
      isHiringConversationType(item.conversation || {})
    );
  }

  function relationshipHasEmergencyConversation(relationship = {}) {
    return getRelationshipConversations(relationship).some(
      (item) => item.conversation?.conversation_type === "emergency"
    );
  }

  function relationshipMatchesCategory(relationship = {}) {
    if (relationshipView === "all") return true;
    if (relationshipView === "professional") {
      return ["professional", "vendor", "business"].includes(relationship.type);
    }

    return relationship.type === relationshipView;
  }

  function getMessageSectionRelationships(section, relationships = [], options = {}) {
    const sectionRelationships = relationships.filter((relationship) => {
      const inactiveContact = isImportedInactiveRelationship(relationship);
      const savedContact = isSavedContactRelationship(relationship);
      const hiringConversation = relationshipHasHiringConversation(relationship);
      const emergencyConversation = relationshipHasEmergencyConversation(relationship);
      const activeConversation = relationshipHasActiveConversation(relationship);

      if (section === "contacts") return inactiveContact || savedContact;
      if (section === "hiring") return !inactiveContact && hiringConversation;
      if (section === "emergency") return !inactiveContact && emergencyConversation;

      return (
        !inactiveContact &&
        activeConversation &&
        !hiringConversation &&
        !emergencyConversation
      );
    });

    return sectionRelationships;
  }

  function getRelationshipContactRecord(relationship = {}) {
    return (
      relationship.primaryContactRecord ||
      relationship.contactRecord ||
      relationship.primaryConversation ||
      relationship.conversations?.[0]?.conversation ||
      {}
    );
  }

  function isImportedInactiveRelationship(relationship = {}) {
    return Boolean(
      relationship.isInactiveImportedContact ||
        isInactiveImportedContact(relationship.primaryContactRecord) ||
        isInactiveImportedContact(relationship.primaryConversation)
    );
  }

  function isSavedContactRelationship(relationship = {}) {
    return Boolean(
      relationship.savedToContacts ||
        isSavedRelationshipContact(relationship.primaryContactRecord) ||
        isSavedRelationshipContact(relationship.primaryConversation)
    );
  }

  function getContactTypeLabel(relationship = {}) {
    const record = getRelationshipContactRecord(relationship);

    return (
      record.contactImportLabel ||
      CONTACT_IMPORT_TYPE_OPTIONS.find(
        (option) => option.relationshipType === relationship.type
      )?.label ||
      relationship.typeLabel ||
      "Contact"
    );
  }

  function getContactInviteStatus(relationship = {}) {
    const record = getRelationshipContactRecord(relationship);
    const linked = record.meetroAccountLinked === true || relationship.meetroAccountLinked === true;
    const inviteStatus = record.inviteStatus || relationship.inviteStatus || "not_invited";

    if (linked) return "Linked";
    if (inviteStatus === "sent") return "Invited";
    return "Not invited yet";
  }

  function getContactLocationFact(relationship = {}) {
    const record = getRelationshipContactRecord(relationship);
    const contact = getRelationshipContact(relationship);
    const firstText = (...values) =>
      values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
    const address = firstText(
      record.address,
      record.fullAddress,
      record.full_address,
      contact.address && !record.location ? contact.address : ""
    );

    if (address) {
      return { label: "Address", value: address || "Not added yet", span: "wide" };
    }

    const serviceArea = firstText(
      record.serviceArea,
      record.service_area,
      relationship.serviceArea,
      relationship.service_area,
      contact.serviceArea,
      record.location,
      record.customerLocation,
      record.customer_location,
      relationship.location,
      contact.address
    );

    return { label: "Service Area", value: serviceArea || "Not added yet", span: "wide" };
  }

  function getContactImportTypeId(relationship = {}) {
    const record = getRelationshipContactRecord(relationship);

    return (
      record.contactImportType ||
      CONTACT_IMPORT_TYPE_OPTIONS.find(
        (option) => option.relationshipType === relationship.type
      )?.id ||
      "customer"
    );
  }

  function openContactCard(relationship) {
    if (!relationship) return;
    relationshipIdentityReturnScrollRef.current =
      typeof window === "undefined"
        ? 0
        : window.scrollY ||
          document.documentElement?.scrollTop ||
          document.body?.scrollTop ||
          0;
    setRelationshipNotice("");
    setActiveRelationshipId("");
    setContactInviteOptionsId("");
    setContactEditDraft(null);
    setActiveContactCardSnapshot(relationship);
    setActiveContactCardId(relationship.id);
  }

  function openLinkedRelationshipChat(relationship) {
    const conversationId = getLinkedRelationshipConversationId(relationship);

    if (conversationId) {
      persistRelationshipConversationId(relationship, conversationId);
      closeContactCard({ restoreScroll: false });
      openConversationIdFast(conversationId, getConversationById(conversationId) || getRelationshipContactRecord(relationship));
      return;
    }

    const nextConversation = createConversationFromRelationship(relationship);

    if (!nextConversation?.id) {
      setRelationshipNotice("Start with a linked Meetro contact before opening a conversation.");
      return;
    }

    persistRelationshipConversationId(relationship, nextConversation.id);
    closeContactCard({ restoreScroll: false });
    openConversationIdFast(nextConversation.id, nextConversation);
  }

  function getConversationById(conversationId) {
    const id = String(conversationId || "").trim();
    if (!id) return null;

    return (
      quotes.find((item) => String(item.id || item.conversationId || "") === id) ||
      getConversationRegistry().find((item) => String(item.id || item.conversationId || "") === id) ||
      null
    );
  }

  function getLinkedRelationshipConversationId(relationship = {}) {
    const record = getRelationshipContactRecord(relationship);
    const conversation =
      relationship?.primaryConversation ||
      relationship?.conversations?.[0]?.conversation ||
      null;

    return (
      [
        conversation?.id,
        conversation?.conversationId,
        record.sourceConversationId,
        record.source_conversation_id,
        record.linkedConversationId,
        record.linked_conversation_id,
        record.activeConversationId,
        record.projectConversationId,
        record.conversationId,
        record.threadId,
      ]
        .map((value) => String(value || "").trim())
        .find(Boolean) || ""
    );
  }

  function persistRelationshipConversationId(relationship = {}, conversationId = "") {
    const id = String(conversationId || "").trim();
    if (!id) return;

    const record = getRelationshipContactRecord(relationship);
    const recordId = String(record.id || "").trim();
    const relationshipId = String(relationship.id || record.relationshipId || "").trim();
    const registry = getConversationRegistry();
    let changed = false;

    const updated = registry.map((item) => {
      const itemId = String(item.id || "").trim();
      const itemRelationshipId = String(item.relationshipId || item.relationship_id || "").trim();
      const matches =
        (recordId && itemId === recordId) ||
        (relationshipId && itemRelationshipId === relationshipId);

      if (!matches || String(item.sourceConversationId || item.linkedConversationId || "") === id) {
        return item;
      }

      changed = true;
      return {
        ...item,
        sourceConversationId: id,
        linkedConversationId: id,
        activeConversationId: id,
        updatedAt: item.updatedAt || new Date().toISOString(),
      };
    });

    if (!changed) return;

    localStorage.setItem("meetro_conversation_registry", JSON.stringify(updated));
    writeUnreadConversationCount(updated);
    window.dispatchEvent(new Event("meetro-messages-updated"));
  }

  function openConversationIdFast(conversationId, conversationRecord = {}, options = {}) {
    const id = String(conversationId || "").trim();
    if (!id) return;

    const record = {
      ...(conversationRecord || {}),
      id,
      conversationId:
        conversationRecord?.conversationId || conversationRecord?.threadId || id,
    };
    const stagedConversation = prepareConversation(record, { updateList: false });
    if (!stagedConversation) return;

    try {
      markConversationRead(id, stagedConversation);
    } catch {
      // Read receipts are secondary to opening the thread.
    }

    const shouldUseSplitPane =
      isSplitPane && options.preferSplitPane === true && !options.forceRoute;

    if (shouldUseSplitPane) {
      setActiveSplitConversationId(id);
      return;
    }

    setActiveSplitConversationId("");
    setPage("conversationThread");
  }

  function createConversationFromRelationship(relationship = {}) {
    const record = getRelationshipContactRecord(relationship);
    const contact = getRelationshipContact(relationship);
    const isLinked =
      record.meetroAccountLinked === true || relationship.meetroAccountLinked === true;

    if (!isLinked) return null;

    const resolvedIdentity = resolveRelationshipIdentity({
      relationship,
      record,
      viewerRole: activeAccountMode === "business" ? "business" : "homeowner",
      isLinked: true,
      typeLabel: getContactTypeLabel(relationship),
      status: "Connected in Meetro.",
    });
    const contactType =
      relationship.type || record.relationshipType || record.contactImportType || "professional";
    const scope = activeAccountMode === "business" ? "business" : "personal";
    const relationshipSeed = normalizeRelationshipId(
      relationship.id ||
        record.relationshipId ||
        record.id ||
        resolvedIdentity.displayName
    );
    if (!relationshipSeed) return null;

    const conversationId = `relationship-chat-${scope}-${relationshipSeed}`;
    const existingConversation = getConversationById(conversationId);

    if (existingConversation) return existingConversation;

    const item = applyLiveConversationAvatar(
      {
        ...record,
        id: conversationId,
        relationshipId: relationship.id || record.relationshipId || relationshipSeed,
        relationshipType: contactType,
        relationshipScope: scope,
        accountMode: scope,
        participantName: resolvedIdentity.displayName,
        customerName: resolvedIdentity.displayName,
        professionalName:
          ["professional", "vendor", "business"].includes(contactType)
            ? resolvedIdentity.displayName
            : record.professionalName,
        businessName:
          ["professional", "vendor", "business"].includes(contactType)
            ? resolvedIdentity.displayName
            : record.businessName,
        project_title: resolvedIdentity.displayName,
        project_description: "Conversation started from this saved relationship.",
        status: "Conversation",
        currentWorkStatus: "",
        phone: contact.phone || record.phone || "",
        email: contact.email || record.email || "",
        location: contact.address || contact.serviceArea || record.location || record.address || "",
        contactImported: false,
        meetroAccountLinked: true,
        savedToContacts: true,
        sourceRelationshipId: relationship.id || "",
        sourceConversationId: conversationId,
        linkedConversationId: conversationId,
        conversation_type: "standard",
        unread: false,
        createdAt: new Date().toISOString(),
      },
      activeAccountMode === "business" ? "business" : "homeowner"
    );

    saveConversationRegistryItem(item);
    setQuotes((current) => dedupeConversations([item, ...current]));

    return item;
  }

  function closeContactCard(options = {}) {
    const returnScrollTop = relationshipIdentityReturnScrollRef.current || 0;
    const shouldRestoreScroll = options.restoreScroll !== false;

    setActiveContactCardId("");
    setActiveContactCardSnapshot(null);
    setContactInviteOptionsId("");
    setContactEditDraft(null);
    if (shouldRestoreScroll && typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: returnScrollTop, left: 0, behavior: "auto" });
        });
      });
    }
  }

  function getContactInviteLink(relationship = {}) {
    return `https://getmeetro.com/app?invite=${encodeURIComponent(
      relationship.id || relationship.name || "contact"
    )}`;
  }

  function callRelationship(relationship) {
    const phone = getRelationshipContact(relationship).phone;
    if (!phone) {
      setRelationshipNotice("No phone number has been added for this contact.");
      return;
    }
    window.location.href = `tel:${phone}`;
  }

  function textRelationship(relationship, includeInvite = false) {
    const phone = getRelationshipContact(relationship).phone;

    if (!phone) {
      setRelationshipNotice("No phone number has been added for this contact.");
      return;
    }

    const body = includeInvite
      ? `Join me on Meetro: ${getContactInviteLink(relationship)}`
      : "";
    window.location.href = body
      ? `sms:${phone}&body=${encodeURIComponent(body)}`
      : `sms:${phone}`;
  }

  function emailRelationship(relationship, includeInvite = false) {
    const email = getRelationshipContact(relationship).email;

    if (!email) {
      setRelationshipNotice("No email address has been added for this contact.");
      return;
    }

    const body = includeInvite
      ? `Join me on Meetro: ${getContactInviteLink(relationship)}`
      : "";
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(
      includeInvite ? "Join me on Meetro" : `Message for ${relationship.name}`
    )}&body=${encodeURIComponent(body)}`;
  }

  async function copyContactInviteLink(relationship) {
    const inviteLink = getContactInviteLink(relationship);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard?.writeText(inviteLink);
      setRelationshipNotice("Invite link copied.");
    } catch {
      setRelationshipNotice(`Invite link: ${inviteLink}`);
    }
  }

  async function shareContactInvite(relationship) {
    const inviteLink = getContactInviteLink(relationship);
    const sharePayload = {
      title: "Invite to Meetro",
      text: `Join me on Meetro: ${inviteLink}`,
      url: inviteLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(sharePayload);
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    await copyContactInviteLink(relationship);
  }

  function openEditContact(relationship) {
    const record = getRelationshipContactRecord(relationship);
    const contact = getRelationshipContact(relationship);

    setContactInviteOptionsId("");
    setActiveContactCardSnapshot(relationship);
    setContactEditDraft({
      relationshipId: relationship.id,
      recordId: record.id,
      name: relationship.name || record.participantName || record.displayName || "",
      type: getContactImportTypeId(relationship),
      phone: contact.phone || record.phone || "",
      email: contact.email || record.email || "",
      address: contact.address || record.address || record.location || "",
    });
  }

  function updateContactEditDraft(field, value) {
    setContactEditDraft((current) =>
      current ? { ...current, [field]: value } : current
    );
  }

  function saveContactEdit(event) {
    event.preventDefault();
    if (!activeContactCard || !contactEditDraft) return;

    const name = contactEditDraft.name.trim();

    if (!name) {
      setRelationshipNotice("Add a name before saving this contact.");
      return;
    }

    const record = getRelationshipContactRecord(activeContactCard);
    const type =
      CONTACT_IMPORT_TYPE_OPTIONS.find((option) => option.id === contactEditDraft.type) ||
      CONTACT_IMPORT_TYPE_OPTIONS[0];
    const updatedRecord = {
      ...record,
      relationshipType: type.relationshipType,
      contactImportType: type.id,
      contactImportLabel: type.label,
      [type.identityField]: name,
      participantName: name,
      displayName: name,
      project_title: name,
      homeowner_email: contactEditDraft.email.trim() || name,
      phone: contactEditDraft.phone.trim(),
      email: contactEditDraft.email.trim(),
      address: contactEditDraft.address.trim(),
      location: contactEditDraft.address.trim(),
      status: "Imported contact",
      contactImported: true,
      meetroAccountLinked: record.meetroAccountLinked === true,
      inviteStatus: record.inviteStatus || "not_invited",
    };

    saveConversationRegistryItem(updatedRecord);
    setQuotes((current) =>
      dedupeConversations(
        current.map((item) =>
          String(item.id) === String(updatedRecord.id) ? updatedRecord : item
        )
      )
    );
    setContactEditDraft(null);
    setRelationshipNotice(`${name} was updated.`);
  }

  function openRelationshipHistory(relationship = {}, historyType = "work") {
    const record = getRelationshipContactRecord(relationship);
    const contact = getRelationshipContact(relationship);
    const relationshipContext = {
      relationshipId: relationship.id || record.relationshipId || record.id || "",
      relationshipType: relationship.type || record.relationshipType || "",
      displayName:
        relationship.name ||
        record.participantName ||
        record.displayName ||
        record.businessName ||
        record.professionalName ||
        "",
      historyType,
      phone: contact.phone || record.phone || "",
      email: contact.email || record.email || "",
      source: "messages_relationship_identity",
      returnPage: "messagesInbox",
      accountMode: activeAccountMode === "business" ? "business" : "personal",
    };

    localStorage.setItem(
      "meetroRelationshipHistoryContext",
      JSON.stringify(relationshipContext)
    );
    localStorage.setItem("customerRelationshipsReturnPage", "messagesInbox");
    localStorage.setItem("myRequestsReturnPage", "messagesInbox");
    closeContactCard();
    setPage(activeAccountMode === "business" ? "customerRelationshipsCenter" : "myRequests");
  }

  function getRelationshipPreviewText(relationship = {}) {
    if (isImportedInactiveRelationship(relationship)) {
      return "Saved contact · Invite to Meetro";
    }

    const conversation = relationship.primaryConversation || {};

    return (
      conversation.lastMessage ||
      conversation.last_message ||
      conversation.project_description ||
      conversation.status ||
      relationship.currentWorkStatus ||
      "Conversation"
    );
  }

  function getRelationshipDisplayTime(relationship = {}) {
    if (isImportedInactiveRelationship(relationship)) {
      return "Saved";
    }

    return getConversationDisplayTime(relationship.primaryConversation || {});
  }

  function getRelationshipStatusChip(relationship = {}) {
    if (isImportedInactiveRelationship(relationship)) return "";
    const conversations = getRelationshipConversations(relationship);
    const counts = getRelationshipCounts(relationship);

    if (
      conversations.some(
        (item) => item.conversation?.conversation_type === "emergency"
      )
    ) {
      return "Emergency";
    }

    if ((counts.openTickets || 0) > 0) return "Open Ticket";
    if ((counts.currentWork || 0) > 0) return "Active Work";
    if ((counts.unread || 0) > 0) return "Unread";

    return "";
  }

  function getConversationRowStatusChip(quote = {}) {
    if (isEmergencyConversationType(quote)) return "Emergency";
    if (isHiringConversation(quote)) return "Hiring";
    if (quote.unread) return "Unread";
    if (isSavedChatHistoryConversation(quote)) return "Saved";
    return "";
  }

  function renderConversationRow(quote = {}, options = {}) {
    const conversation = normalizeConversationForOpen(quote);
    if (!conversation) return null;

    const statusChip = options.statusChip || getConversationRowStatusChip(conversation);
    const rowIdentity = resolveRelationshipIdentity({
      record: conversation,
      viewerRole: activeAccountMode === "business" ? "business" : "homeowner",
      isLinked: true,
      typeLabel:
        options.typeLabel ||
        (isEmergencyConversationType(conversation)
          ? "Emergency"
          : isHiringConversation(conversation)
          ? "Hiring"
          : "Relationship"),
    });
    const isEmergencyRow = statusChip === "Emergency";

    return (
      <button
        key={options.key || conversation.id}
        type="button"
        onClick={() => openConversationRow(conversation, options)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openConversationRow(conversation, options);
          }
        }}
        style={{
          ...conversationRow,
          ...(conversation.unread ? unreadConversationRow : {}),
          ...(isEmergencyRow ? emergencyConversationRow : {}),
          ...(isSplitPane && String(activeSplitConversationId) === String(conversation.id)
            ? activeConversationRow
            : {}),
        }}
        className="meetro-visual-surface"
      >
        <div
          style={{
            ...conversationRowAvatar,
            ...(isSplitPane ? splitAvatarCircle : {}),
            ...(conversation.unread ? unreadAvatar : {}),
            ...(isEmergencyRow ? emergencyAvatar : {}),
          }}
        >
          {rowIdentity.avatar ? (
            <img
              src={rowIdentity.avatar}
              alt={rowIdentity.displayName}
              style={avatarImage}
            />
          ) : (
            rowIdentity.initials
          )}
        </div>

        <div style={conversationRowBody}>
          <div style={conversationRowTop}>
            <div style={conversationRowTitleBlock}>
              <h2 style={conversationRowName}>{rowIdentity.displayName}</h2>
              <p style={conversationRowMeta}>
                {[
                  rowIdentity.typeLabel,
                  getCommunicationIntent(conversation).trim() || "",
                ]
                  .filter((value, index, values) => value && values.indexOf(value) === index)
                  .join(" · ")}
              </p>
            </div>

            <div style={conversationRowRight}>
              <span style={timeText}>{getConversationDisplayTime(conversation)}</span>
              {conversation.unread && (
                <span style={conversationUnreadBadge}>1</span>
              )}
            </div>
          </div>

          <div style={conversationRowBottom}>
            <p style={conversationRowPreview}>
              {getConversationPreviewText(conversation)}
            </p>
            {statusChip && (
              <span
                style={{
                  ...conversationStatusChip,
                  ...(isEmergencyRow ? emergencyStatusBadge : {}),
                  ...(statusChip === "Unread" ? unreadStatusBadge : {}),
                }}
              >
                {statusChip}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  }

  function renderWorkspaceContextPanel() {
    const conversation = activeWorkspaceConversation;
    const relationship = activeWorkspaceRelationship;

    if (!conversation) {
      return (
        <aside
          style={workspaceContextPane}
          aria-label="Relationship and project context"
          className="meetro-visual-surface"
        >
          <div style={workspaceContextEmpty}>
            <div style={workspaceContextIcon}>CTX</div>
            <h2 style={workspaceContextTitle}>Relationship context</h2>
            <p style={workspaceContextText}>
              Context will appear here as this relationship develops.
            </p>
          </div>
        </aside>
      );
    }

    const contactRecord = relationship
      ? getRelationshipContactRecord(relationship)
      : conversation;
    const contact = relationship ? getRelationshipContact(relationship) : {};
    const contextIdentity = resolveRelationshipIdentity({
      relationship,
      record: contactRecord,
      viewerRole: activeAccountMode === "business" ? "business" : "homeowner",
      isLinked:
        relationship?.meetroAccountLinked === true ||
        contactRecord?.meetroAccountLinked === true ||
        conversation.meetroAccountLinked === true,
      typeLabel:
        relationship?.typeLabel ||
        (isEmergencyConversationType(conversation)
          ? "Emergency"
          : isHiringConversation(conversation)
          ? "Hiring"
          : "Relationship"),
    });
    const authorityFacts = getConversationAuthorityFacts(conversation, relationship);
    const contextFacts = getWorkspaceContextFacts(conversation, relationship);
    const memoryFacts = getRelationshipMemoryFacts(conversation, relationship);
    const hasContextFacts = contextFacts.length > 0;
    const hasMemoryFacts = memoryFacts.length > 0;
    const hasContactInfo = Boolean(contact.phone || contact.email || contact.address);
    const canOpenDetails = Boolean(
      conversation.project_title ||
        conversation.projectTitle ||
        conversation.requestId ||
        conversation.id
    );

    return (
      <aside
        style={workspaceContextPane}
        aria-label="Relationship and project context"
        className="meetro-visual-surface"
      >
        <section style={workspaceContextSection}>
          <p style={workspaceContextEyebrow}>Relationship</p>
          <div style={workspaceIdentityRow}>
            <div style={workspaceContextAvatar}>
              {contextIdentity.avatar ? (
                <img
                  src={contextIdentity.avatar}
                  alt={contextIdentity.displayName}
                  style={avatarImage}
                />
              ) : (
                contextIdentity.initials
              )}
            </div>
            <div style={workspaceIdentityCopy}>
              <h2 style={workspaceContextTitle}>{contextIdentity.displayName}</h2>
              <p style={workspaceContextMeta}>{contextIdentity.typeLabel}</p>
            </div>
          </div>
        </section>

        {hasContactInfo && (
          <section style={workspaceContextSection}>
            <p style={workspaceContextEyebrow}>Contact</p>
            <div style={workspaceFactList}>
              {contact.phone && (
                <div style={workspaceFactRow}>
                  <span style={workspaceFactLabel}>Phone</span>
                  <strong style={workspaceFactValue}>{contact.phone}</strong>
                </div>
              )}
              {contact.email && (
                <div style={workspaceFactRow}>
                  <span style={workspaceFactLabel}>Email</span>
                  <strong style={workspaceFactValue}>{contact.email}</strong>
                </div>
              )}
              {contact.address && (
                <div style={workspaceFactRow}>
                  <span style={workspaceFactLabel}>Address</span>
                  <strong style={workspaceFactValue}>{contact.address}</strong>
                </div>
              )}
            </div>
          </section>
        )}

        <section style={workspaceContextSection}>
          <p style={workspaceContextEyebrow}>Communication</p>
          <div style={workspaceFactList}>
            {authorityFacts.map((fact) => (
              <div key={fact.label} style={workspaceFactRow}>
                <span style={workspaceFactLabel}>{fact.label}</span>
                <strong style={workspaceFactValue}>{fact.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section style={workspaceContextSection}>
          <p style={workspaceContextEyebrow}>Related work</p>
          {hasContextFacts ? (
            <div style={workspaceFactList}>
              {contextFacts.map((fact) => (
                <div key={fact.label} style={workspaceFactRow}>
                  <span style={workspaceFactLabel}>{fact.label}</span>
                  <strong style={workspaceFactValue}>{fact.value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p style={workspaceContextText}>
              Context will appear here as this relationship develops.
            </p>
          )}

          {canOpenDetails && (
            <button
              type="button"
              style={workspaceContextAction}
              onClick={() => openWorkspaceContextDetails(conversation)}
            >
              {activeAccountMode === "business"
                ? t("openActiveWorkAction")
                : t("openProject")}
            </button>
          )}
        </section>

        <section style={workspaceContextSection}>
          <p style={workspaceContextEyebrow}>Memory</p>
          {hasMemoryFacts ? (
            <div style={workspaceFactList}>
              {memoryFacts.map((fact) => (
                <div key={fact.label} style={workspaceFactRow}>
                  <span style={workspaceFactLabel}>{fact.label}</span>
                  <strong style={workspaceFactValue}>{fact.value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p style={workspaceContextText}>
              Relationship memory will grow as work, decisions, and history accumulate.
            </p>
          )}
        </section>
      </aside>
    );
  }

  function openRelationshipAction(type, label) {
    setRelationshipNotice("");
    setRelationshipActionMenuOpen(false);
    setTicketComposer(null);

    if (type === "savedHistory") {
      setConversationStarter(null);
      setRelationshipComposer(null);
      setContactImport(null);
      setActiveContactCardId("");
      setActiveContactCardSnapshot(null);
      localStorage.setItem("meetroMessagesOpenSavedHistory", "true");
      setSavedHistoryOpen(true);
      return;
    }

    if (type === "hiringCenter") {
      setConversationStarter(null);
      setRelationshipComposer(null);
      setContactImport(null);
      setActiveContactCardId("");
      setActiveContactCardSnapshot(null);
      setPage("hiringCenter");
      return;
    }

    if (type === "emergencyCenter") {
      setConversationStarter(null);
      setRelationshipComposer(null);
      setContactImport(null);
      setActiveContactCardId("");
      setActiveContactCardSnapshot(null);
      setPage("emergency");
      return;
    }

    if (type === "chat") {
      setRelationshipComposer(null);
      setContactImport(null);
      setActiveContactCardId("");
      setActiveContactCardSnapshot(null);
      setConversationStarter(createEmptyConversationStarter("single"));
      return;
    }

    if (type === "group") {
      setRelationshipComposer(null);
      setContactImport(null);
      setActiveContactCardId("");
      setActiveContactCardSnapshot(null);
      setConversationStarter(createEmptyConversationStarter("group"));
      return;
    }

    setConversationStarter(null);

    if (type === "import") {
      setRelationshipComposer(null);
      setContactImport(createEmptyContactImport(activeAccountMode));
      return;
    }

    setContactImport(null);
    setRelationshipComposer({
      ...createEmptyComposer(type, label),
      section: messageSection,
    });
  }

  function closeConversationStarter() {
    setConversationStarter(null);
  }

  function updateConversationStarter(field, value) {
    setConversationStarter((current) =>
      current ? { ...current, [field]: value } : current
    );
  }

  function setConversationStarterNotice(notice) {
    setConversationStarter((current) =>
      current ? { ...current, notice } : current
    );
  }

  function relationshipCanOpenConversation(relationship = {}) {
    return (
      !isImportedInactiveRelationship(relationship) &&
      Boolean(relationship?.primaryConversation)
    );
  }

  function getConversationStarterCandidates() {
    const query = normalizeMessageSearchText(conversationStarter?.search || "");
    const source = conversationStarter?.source || "contacts";

    return relationshipLayer.relationships.filter((relationship) => {
      const hiringConversation = relationshipHasHiringConversation(relationship);
      const emergencyConversation = relationshipHasEmergencyConversation(relationship);
      const contact = getRelationshipContact(relationship);
      const searchable = normalizeMessageSearchText(
        [
          relationship.name,
          relationship.typeLabel,
          contact.phone,
          contact.email,
          contact.address,
        ].filter(Boolean).join(" ")
      );

      return (
        !hiringConversation &&
        !emergencyConversation &&
        (source === "contacts" ||
          (source === "network" && relationshipCanOpenConversation(relationship)) ||
          (source === "recent" && relationshipHasActiveConversation(relationship))) &&
        (!query || searchable.includes(query))
      );
    });
  }

  function startContactFromConversationPicker() {
    setActiveContactCardId("");
    setActiveContactCardSnapshot(null);
    setRelationshipComposer({
      ...createEmptyComposer(
        activeAccountMode === "business" ? "customer" : "professional",
        "Add Contact"
      ),
      section: "contacts",
      returnToStarter: true,
    });
  }

  function chooseConversationStarterRelationship(relationship) {
    if (!relationship) return;

    if (conversationStarter?.mode === "group") {
      if (!relationshipCanOpenConversation(relationship)) {
        setConversationStarterNotice(
          `${relationship.name} is saved as a contact. Invite them to Meetro before adding them to a group conversation.`
        );
        return;
      }

      setConversationStarter((current) => {
        if (!current) return current;
        const selected = new Set(current.selectedIds);

        if (selected.has(relationship.id)) {
          selected.delete(relationship.id);
        } else {
          selected.add(relationship.id);
        }

        return {
          ...current,
          selectedIds: [...selected],
          notice: "",
        };
      });
      return;
    }

    if (relationshipCanOpenConversation(relationship)) {
      setConversationStarter((current) => {
        if (!current) return current;

        return {
          ...current,
          selectedIds: current.selectedIds.includes(relationship.id)
            ? []
            : [relationship.id],
          notice: "",
        };
      });
      return;
    }

    setConversationStarter(null);
    openContactCard(relationship);
    setRelationshipNotice(
      `${relationship.name} is saved as a contact. Invite them to Meetro before starting a conversation.`
    );
  }

  function startSelectedConversation() {
    if (!conversationStarter || conversationStarter.mode !== "single") return;

    const selectedRelationship = relationshipLayer.relationships.find(
      (relationship) =>
        conversationStarter.selectedIds.includes(relationship.id) &&
        relationshipCanOpenConversation(relationship)
    );

    if (!selectedRelationship) {
      setConversationStarterNotice("Choose one contact to message.");
      return;
    }

    setConversationStarter(null);
    setActiveContactCardSnapshot(null);
    openRelationshipConversation(selectedRelationship, { fromStarter: true });
  }

  function startSelectedGroupConversation() {
    if (!conversationStarter || conversationStarter.mode !== "group") return;

    const selectedRelationships = relationshipLayer.relationships.filter(
      (relationship) =>
        conversationStarter.selectedIds.includes(relationship.id) &&
        relationshipCanOpenConversation(relationship)
    );

    if (selectedRelationships.length < 2) {
      setConversationStarterNotice("Choose at least two contacts for a group conversation.");
      return;
    }

    const now = Date.now();
    const relationshipId = `conversation-group-${activeAccountMode}-${now}`;
    const participantNames = selectedRelationships.map((relationship) => relationship.name);
    const groupName =
      conversationStarter.groupName.trim() ||
      participantNames.slice(0, 3).join(", ");
    const item = {
      id: `${relationshipId}-thread`,
      relationshipId,
      relationshipType: "customer",
      relationshipScope: activeAccountMode === "business" ? "business" : "personal",
      accountMode: activeAccountMode === "business" ? "business" : "personal",
      isGroupRelationship: true,
      groupConversation: true,
      participantName: groupName,
      customerName: groupName,
      participants: selectedRelationships.map((relationship) => ({
        name: relationship.name,
        role: relationship.typeLabel || "Contact",
      })),
      project_title: groupName,
      project_description: "Group conversation started in Communication Center.",
      status: "Group conversation",
      currentWorkStatus: "Group conversation",
      conversation_type: "standard",
      meetroAccountLinked: true,
      createdAt: new Date(now).toISOString(),
      unread: false,
    };

    saveConversationRegistryItem(item);
    setQuotes((current) => dedupeConversations([item, ...current]));
    setConversationStarter(null);
    setRelationshipNotice(`${groupName} was created as a group conversation.`);
    openConversation(item);
  }

  function updateRelationshipComposer(field, value) {
    setRelationshipComposer((current) =>
      current ? { ...current, [field]: value } : current
    );
  }

  function updateContactImport(patch) {
    setContactImport((current) => (current ? { ...current, ...patch } : current));
  }

  function updateManualImportContact(field, value) {
    setContactImport((current) =>
      current
        ? {
            ...current,
            manual: {
              ...current.manual,
              [field]: value,
            },
          }
        : current
    );
  }

  function addImportedContacts(nextContacts = [], source = "") {
    setContactImport((current) => {
      if (!current) return current;

      const existingIds = new Set(current.contacts.map((contact) => contact.id));
      const normalizedContacts = nextContacts
        .map((contact, index) =>
          normalizeImportedContact(
            { ...contact, source: source || contact.source || current.source || "manual" },
            current.contacts.length + index,
            current.defaultType
          )
        )
        .filter((contact) => contact.name || contact.email || contact.phone)
        .filter((contact) => {
          if (existingIds.has(contact.id)) return false;
          existingIds.add(contact.id);
          return true;
        });

      return {
        ...current,
        step: "select",
        source: source || current.source,
        contacts: [...current.contacts, ...normalizedContacts],
        selectedIds: [
          ...new Set([
            ...current.selectedIds,
            ...normalizedContacts.map((contact) => contact.id),
          ]),
        ],
        notice: normalizedContacts.length
          ? `${normalizedContacts.length} contact${normalizedContacts.length === 1 ? "" : "s"} ready to review.`
          : "No contacts were found. Add contacts manually or choose another source.",
      };
    });
  }

  async function importPhoneContacts() {
    if (isNativeContactsAvailable()) {
      const nativeResult = await getNativePhoneContacts();

      if (nativeResult.permission === "granted") {
        addImportedContacts(nativeResult.contacts, "phone");
        return;
      }

      updateContactImport({
        step: "select",
        source: "phone",
        notice:
          nativeResult.permission === "denied"
            ? CONTACTS_ACCESS_OFF_MESSAGE
            : "Phone contacts are unavailable on this device. Add contacts manually or import a file.",
      });
      return;
    }

    const contactsApi = navigator.contacts;

    if (contactsApi?.select) {
      try {
        const selectedContacts = await contactsApi.select(
          ["name", "email", "tel", "address"],
          { multiple: true }
        );

        addImportedContacts(selectedContacts, "phone");
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    updateContactImport({
      step: "select",
      source: "phone",
      notice:
        "Phone contacts are not available from this device yet. Add contacts manually or import a file.",
    });
  }

  function openContactImportFilePicker() {
    updateContactImport({ source: "file", notice: "" });
    contactImportFileRef.current?.click();
  }

  async function handleContactImportFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !contactImport) return;

    try {
      const text = await file.text();
      const contacts = parseImportedContactsFromText(text, contactImport.defaultType);

      addImportedContacts(contacts, "file");
    } catch {
      updateContactImport({
        step: "select",
        source: "file",
        notice: "Meetro could not read that file. Add contacts manually or choose another file.",
      });
    }
  }

  function startManualContactImport() {
    updateContactImport({
      step: "select",
      source: "manual",
      notice: "Add contacts manually, then review before importing.",
    });
  }

  function addManualImportContact() {
    if (!contactImport) return;

    const manual = contactImport.manual || {};
    const contact = normalizeImportedContact(
      {
        ...manual,
        source: "manual",
        type: contactImport.defaultType,
      },
      contactImport.contacts.length,
      contactImport.defaultType
    );

    if (!contact.name && !contact.email && !contact.phone) {
      updateContactImport({ notice: "Add a name, phone, or email before adding this contact." });
      return;
    }

    addImportedContacts([contact], "manual");
    setContactImport((current) =>
      current
        ? {
            ...current,
            manual: {
              name: "",
              phone: "",
              email: "",
              address: "",
            },
          }
        : current
    );
  }

  function updateImportedContact(contactId, field, value) {
    setContactImport((current) =>
      current
        ? {
            ...current,
            contacts: current.contacts.map((contact) =>
              contact.id === contactId ? { ...contact, [field]: value } : contact
            ),
          }
        : current
    );
  }

  function toggleImportedContact(contactId) {
    setContactImport((current) => {
      if (!current) return current;
      const selected = new Set(current.selectedIds);

      if (selected.has(contactId)) {
        selected.delete(contactId);
      } else {
        selected.add(contactId);
      }

      return {
        ...current,
        selectedIds: [...selected],
      };
    });
  }

  function selectAllImportedContacts() {
    setContactImport((current) =>
      current
        ? {
            ...current,
            selectedIds: current.contacts.map((contact) => contact.id),
            notice: "All contacts selected.",
          }
        : current
    );
  }

  function moveContactImportToReview() {
    if (!contactImport) return;

    if (contactImport.selectedIds.length === 0) {
      updateContactImport({ notice: "Select at least one contact before reviewing." });
      return;
    }

    updateContactImport({
      step: "review",
      notice: "Review these relationship placeholders before importing.",
    });
  }

  function saveContactImport() {
    if (!contactImport) return;

    const selectedIds = new Set(contactImport.selectedIds);
    const selectedContacts = contactImport.contacts.filter((contact) =>
      selectedIds.has(contact.id)
    );

    if (selectedContacts.length === 0) {
      updateContactImport({ notice: "Select at least one contact before importing." });
      return;
    }

    const records = selectedContacts.map((contact, index) =>
      buildImportedContactRelationship(contact, {
        activeMode: activeAccountMode,
        defaultType: contactImport.defaultType,
        index,
        createdAt: new Date(Date.now() + index).toISOString(),
      })
    );

    records.forEach(saveConversationRegistryItem);
    setQuotes((current) => dedupeConversations([...records, ...current]));
    setMessageSection("contacts");
    setContactImport(null);
    setRelationshipNotice(
      `${records.length} contact${records.length === 1 ? "" : "s"} imported as relationship row${records.length === 1 ? "" : "s"}.`
    );
  }

  function saveRelationshipComposer(event) {
    event.preventDefault();
    if (!relationshipComposer) return;

    const name = relationshipComposer.name.trim();
    const email = relationshipComposer.email.trim();

    if (relationshipComposer.type === "space") {
      const tenant = tenantRelationshipOptions.find(
        (relationship) => relationship.id === relationshipComposer.tenantRelationshipId
      );
      const vendor = vendorRelationshipOptions.find(
        (relationship) => relationship.id === relationshipComposer.vendorRelationshipId
      );
      const forwardedTicket = openTicketOptions.find(
        (ticket) => ticket.id === relationshipComposer.forwardedTicketConversationId
      );
      const tenantName = tenant?.name || relationshipComposer.name.trim();
      const vendorName = vendor?.name || relationshipComposer.note.trim();
      const groupName =
        relationshipComposer.groupName.trim() ||
        [relationshipComposer.propertyUnit.trim(), "Maintenance"].filter(Boolean).join(" ") ||
        [tenantName, vendorName].filter(Boolean).join(" + ");

      if (!tenantName || !vendorName) {
        setRelationshipNotice("Choose a tenant and a professional/vendor before creating the group conversation.");
        return;
      }

      const now = Date.now();
      const relationshipId = `relationship-space-${activeAccountMode}-${now}`;
      const item = {
        id: `${relationshipId}-thread`,
        relationshipId,
        relationshipType: "propertyManager",
        relationshipScope: "business",
        accountMode: "business",
        isGroupRelationship: true,
        participantName: groupName,
        propertyManagerName: "Property manager",
        tenantName,
        assignedProfessionalName: vendorName,
        participants: [
          { name: "Property manager", role: "Property manager" },
          { name: tenantName, role: "Tenant" },
          { name: vendorName, role: "Professional/vendor" },
        ],
        propertyUnit: relationshipComposer.propertyUnit.trim(),
        location:
          relationshipComposer.propertyUnit.trim() ||
          tenant?.contact?.address ||
          "",
        project_title: groupName,
        project_description:
          forwardedTicket
            ? `Ticket ${forwardedTicket.id} forwarded into this shared conversation.`
            : relationshipComposer.purpose.trim() ||
              "Shared conversation created in Communication Center.",
        status: forwardedTicket ? "Ticket forwarded" : "Group conversation",
        currentWorkStatus: forwardedTicket ? "Ticket forwarded" : "Group conversation",
        category: forwardedTicket ? "maintenance_ticket" : "relationship_space",
        serviceDomain: "property_management",
        forwardedTicketId: forwardedTicket?.id || "",
        ticketId: forwardedTicket?.id || "",
        invoiceOwner: "property_manager",
        conversation_type: "standard",
        createdAt: new Date(now).toISOString(),
        unread: false,
      };

      saveConversationRegistryItem(item);
      setQuotes((current) => dedupeConversations([item, ...current]));
      setActiveRelationshipId(normalizeRelationshipId(relationshipId));
      setRelationshipComposer(null);
      setRelationshipNotice(
        forwardedTicket
          ? `${groupName} was created as a shared conversation. Continue ticket assignment in Work Center.`
          : `${groupName} was created as a shared conversation.`
      );
      return;
    }

    if (!name && relationshipComposer.type !== "invite") {
      setRelationshipNotice("Add a name before saving this relationship.");
      return;
    }

    if (relationshipComposer.type === "invite") {
      if (!email) {
        setRelationshipNotice("Add an email before sending an invite.");
        return;
      }

      window.location.href = `mailto:${email}?subject=${encodeURIComponent(
        "Join me on Meetro"
      )}&body=${encodeURIComponent(
        "I'd like to connect with you on Meetro when it launches."
      )}`;
      setRelationshipComposer(null);
      setRelationshipNotice("Invite started from your email app.");
      return;
    }

    const now = Date.now();
    const composerSection = relationshipComposer.section || messageSection;
    const shouldReturnToStarter = relationshipComposer.returnToStarter === true;
    const createsContactPlaceholder =
      (composerSection === "contacts" || shouldReturnToStarter) &&
      !["invite", "import", "space", "hiring", "emergency"].includes(
        relationshipComposer.type
      );
    const relationshipType =
      relationshipComposer.type === "hiring"
        ? "employee"
        : relationshipComposer.type === "emergency"
        ? "customer"
        :
      relationshipComposer.type === "property" || relationshipComposer.type === "space"
        ? "propertyManager"
        : relationshipComposer.type === "import"
        ? activeAccountMode === "business"
          ? "customer"
          : "professional"
        : relationshipComposer.type;
    const relationshipId = `relationship-${activeAccountMode}-${relationshipType}-${now}`;
    const identityField =
      RELATIONSHIP_FIELD_BY_TYPE[relationshipComposer.type] ||
      RELATIONSHIP_FIELD_BY_TYPE[relationshipType] ||
      "participantName";
    const item = {
      id: `${relationshipId}-thread`,
      relationshipId,
      relationshipType,
      relationshipScope: activeAccountMode === "business" ? "business" : "personal",
      accountMode: activeAccountMode === "business" ? "business" : "personal",
      [identityField]: name,
      participantName: name,
      project_title: name,
      project_description:
        createsContactPlaceholder
          ? "Saved contact. Invite to Meetro later."
          : relationshipComposer.type === "hiring"
          ? relationshipComposer.note.trim() || "Hiring conversation started in Communication Center."
          : relationshipComposer.type === "emergency"
          ? relationshipComposer.note.trim() || "Emergency conversation started in Communication Center."
          : relationshipComposer.note.trim() || "Conversation started in Communication Center.",
      homeowner_email: name,
      phone: relationshipComposer.phone.trim(),
      email,
      address: relationshipComposer.address.trim(),
      location: relationshipComposer.address.trim(),
      status: createsContactPlaceholder
        ? "Saved contact"
        : relationshipComposer.type === "hiring"
        ? "Hiring conversation"
        : relationshipComposer.type === "emergency"
        ? "Emergency conversation"
        : "Conversation",
      contactImported: createsContactPlaceholder,
      meetroAccountLinked: createsContactPlaceholder ? false : undefined,
      inviteStatus: createsContactPlaceholder ? "not_invited" : undefined,
      conversation_type:
        relationshipComposer.type === "hiring"
          ? "hiring"
          : relationshipComposer.type === "emergency"
          ? "emergency"
          : "standard",
      createdAt: new Date(now).toISOString(),
      unread: false,
    };

    saveConversationRegistryItem(item);
    setQuotes((current) => dedupeConversations([item, ...current]));
    if (createsContactPlaceholder) {
      if (shouldReturnToStarter) {
        setMessageSectionState("contacts");
        localStorage.setItem("meetroMessageSection", "contacts");
        setConversationStarter((current) =>
          current
            ? {
                ...current,
                step: "select",
                source: "contacts",
                notice: `${name} was saved. Invite them to Meetro before starting a conversation.`,
              }
            : createEmptyConversationStarter("single")
        );
      } else {
        setMessageSection("contacts");
        setActiveContactCardSnapshot(null);
        setActiveContactCardId(normalizeRelationshipId(relationshipId));
      }
    } else {
      setMessageSection(
        relationshipComposer.type === "hiring"
          ? "hiring"
          : relationshipComposer.type === "emergency"
          ? "emergency"
          : "conversations"
      );
      setActiveRelationshipId(normalizeRelationshipId(relationshipId));
    }
    setRelationshipComposer(null);
    setRelationshipNotice(
      createsContactPlaceholder
        ? shouldReturnToStarter
          ? `${name} was saved as a contact.`
          : `${name} was saved as a contact.`
        : `${name} was added to Communication Center.`
    );
  }

  function updateTicketComposer(field, value) {
    setTicketComposer((current) =>
      current ? { ...current, [field]: value } : current
    );
  }

  function openTicketComposer(relationship) {
    setRelationshipNotice("");
    setTicketComposer(createEmptyTicketComposer(relationship));
  }

  function saveMaintenanceTicket(event) {
    event.preventDefault();
    if (!ticketComposer || !activeRelationship) return;

    const description = ticketComposer.description.trim();

    if (!description) {
      setRelationshipNotice("Add a short ticket description before sending.");
      return;
    }

    localStorage.setItem("meetroWorkCenterTab", "active");
    localStorage.setItem("activeWorkCenterTab", "active");
    setTicketComposer(null);
    setRelationshipNotice("Continue ticket creation in Work Center so the work stays with its owner.");
    setPage("workCenter");
  }

  function renderContactCard(relationship) {
    if (!relationship) return null;

    const record = getRelationshipContactRecord(relationship);
    const contact = getRelationshipContact(relationship);
    const isLinked = record.meetroAccountLinked === true || relationship.meetroAccountLinked === true;
    const isProfessionalBusinessContact = ["professional", "vendor", "business"].includes(
      relationship.type || record.relationshipType || record.contactImportType
    );
    const contactTypeLabel = isProfessionalBusinessContact
      ? "Professional / Business"
      : getContactTypeLabel(relationship);
    const resolvedIdentity = resolveRelationshipIdentity({
      relationship,
      record,
      viewerRole: activeAccountMode === "business" ? "business" : "homeowner",
      isLinked,
      typeLabel: contactTypeLabel,
      status: isLinked
        ? "Connected in Meetro."
        : "Invite when you are ready to continue this relationship in Meetro.",
    });
    const locationContactRow = getContactLocationFact(relationship);
    const contactRows = [
      { label: "Type", value: contactTypeLabel },
      { label: "Phone", value: contact.phone || "Not added yet" },
      { label: "Email", value: contact.email || "Not added yet", span: "wide" },
      locationContactRow,
      { label: "Invite status", value: getContactInviteStatus(relationship) },
      { label: "Meetro account", value: isLinked ? "Linked" : "Not linked yet" },
    ];
    const contactHistoryRows = [
      {
        title: "Work History",
        empty: "No work history yet.",
        items: [],
        span: "wide",
        onClick: () => openRelationshipHistory(relationship, "work"),
      },
      {
        title: "Invoice History",
        empty: "No invoices yet.",
        items: [],
        span: "wide",
        onClick: () => openRelationshipHistory(relationship, "invoice"),
      },
      { title: "Documents / Photos", empty: "No documents yet.", items: [], span: "wide" },
      {
        title: "Notes",
        empty: "No notes yet.",
        items: [],
        span: "wide",
      },
      {
        title: "Relationship Memory",
        empty: "Relationship memory will appear here later.",
        items: [],
        span: "wide",
      },
    ];

    const actions = isLinked
      ? [
          {
            label: "Meetro Chat",
            primary: true,
            onClick: () => openLinkedRelationshipChat(relationship),
          },
          { label: "Text", onClick: () => textRelationship(relationship) },
          { label: "Call", onClick: () => callRelationship(relationship) },
          { label: "Email", onClick: () => emailRelationship(relationship) },
          { label: "Edit / More", onClick: () => openEditContact(relationship) },
        ]
      : [
          {
            label: "Invite to Meetro",
            primary: true,
            onClick: () =>
              setContactInviteOptionsId((current) =>
                current === relationship.id ? "" : relationship.id
              ),
          },
          { label: "Text", onClick: () => textRelationship(relationship) },
          { label: "Call", onClick: () => callRelationship(relationship) },
          { label: "Email", onClick: () => emailRelationship(relationship) },
          { label: "Edit Contact", onClick: () => openEditContact(relationship) },
        ];
    const relationshipPanels = (
      <>
        {contactInviteOptionsId === relationship.id && (
          <div style={contactCardSubpanel}>
            <p style={contactCardSectionTitle}>Invite options</p>
            <div style={contactCardActionRow}>
              <button
                type="button"
                style={relationshipSecondaryAction}
                onClick={() => textRelationship(relationship, true)}
              >
                Send via Messages/SMS
              </button>
              <button
                type="button"
                style={relationshipSecondaryAction}
                onClick={() => emailRelationship(relationship, true)}
              >
                Email
              </button>
              <button
                type="button"
                style={relationshipSecondaryAction}
                onClick={() => copyContactInviteLink(relationship)}
              >
                Copy invite link
              </button>
              <button
                type="button"
                style={relationshipSecondaryAction}
                onClick={() => shareContactInvite(relationship)}
              >
                More share options
              </button>
            </div>
          </div>
        )}

        {contactEditDraft?.relationshipId === relationship.id && (
          <form style={contactCardSubpanel} onSubmit={saveContactEdit}>
            <p style={contactCardSectionTitle}>Edit contact</p>
            <div style={relationshipFieldGrid}>
              <label style={relationshipField}>
                <span>Name</span>
                <input
                  value={contactEditDraft.name}
                  onChange={(event) => updateContactEditDraft("name", event.target.value)}
                  style={relationshipInput}
                />
              </label>
              <label style={relationshipField}>
                <span>Type</span>
                <select
                  value={contactEditDraft.type}
                  onChange={(event) => updateContactEditDraft("type", event.target.value)}
                  style={relationshipInput}
                >
                  {CONTACT_IMPORT_TYPE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div style={relationshipFieldGrid}>
              <label style={relationshipField}>
                <span>Phone</span>
                <input
                  value={contactEditDraft.phone}
                  onChange={(event) => updateContactEditDraft("phone", event.target.value)}
                  style={relationshipInput}
                />
              </label>
              <label style={relationshipField}>
                <span>Email</span>
                <input
                  value={contactEditDraft.email}
                  onChange={(event) => updateContactEditDraft("email", event.target.value)}
                  style={relationshipInput}
                />
              </label>
            </div>
            <label style={relationshipField}>
              <span>{getContactLocationFact(relationship).label}</span>
              <input
                value={contactEditDraft.address}
                onChange={(event) => updateContactEditDraft("address", event.target.value)}
                style={relationshipInput}
              />
            </label>
            <div style={contactCardActionRow}>
              <button type="submit" style={relationshipPrimaryAction}>
                Save Contact
              </button>
              <button
                type="button"
                style={relationshipSecondaryAction}
                onClick={() => setContactEditDraft(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </>
    );

    return (
      <RelationshipIdentityPage
        identity={{
          displayName: resolvedIdentity.displayName,
          typeLabel: resolvedIdentity.typeLabel,
          avatar: resolvedIdentity.avatar,
          initials: resolvedIdentity.initials,
          status: resolvedIdentity.status,
        }}
        onBack={closeContactCard}
        backLabel="Back"
        actions={actions}
        details={contactRows}
        sections={contactHistoryRows}
        afterActions={relationshipPanels}
      />
    );
  }

  if (loading) {
    return <LoadingScreen text={t("loadingMessages")} />;
  }

  if (!accountConnectionState.connected) {
    return (
      <div
        className="app-page meetro-wide-page meetro-visual-page messages-inbox-page"
        style={{ ...pageWrapper, paddingTop: "0px" }}
      >
        <SafeBackBar
          setPage={setPage}
          fallback={getDashboardPageForAccountMode(activeAccountMode)}
          label={`← ${t("backToDashboard")}`}
          compact
        />

        <section
          style={accountRecoveryCard}
          aria-label="Communication Center account recovery"
          className="meetro-visual-surface meetro-visual-empty-state"
        >
          <p style={filterEyebrow}>Communication Center</p>
          <h1 style={accountRecoveryTitle}>
            {accountConnectionState.title || "Account connection needs attention"}
          </h1>
          <p style={accountRecoveryText}>
            {accountConnectionState.message ||
              "Reconnect your Meetro account before opening or sending messages."}
          </p>
          <div style={accountRecoveryActions}>
            <button
              type="button"
              style={relationshipPrimaryAction}
              onClick={reconnectMessagesAccount}
            >
              Reconnect Account
            </button>
            {!accountConnectionState.requiresLogin && (
              <button
                type="button"
                style={relationshipSecondaryAction}
                onClick={retryMessagesConnection}
              >
                Try Again
              </button>
            )}
          </div>
        </section>

        <BottomNav setPage={setPage} currentPage="messagesInbox" />
      </div>
    );
  }

  if (activeContactCardFromLayer) {
    return (
      <div
        className="app-page meetro-wide-page meetro-visual-page messages-relationship-identity-page messages-focused-flow-open"
        style={relationshipIdentityPageWrapper}
      >
        {relationshipNotice && (
          <div style={relationshipNoticeCard}>{relationshipNotice}</div>
        )}

        {renderContactCard(activeContactCardFromLayer)}

        <BottomNav setPage={setPage} currentPage="messagesInbox" />
      </div>
    );
  }

  return (
    <div
      className={`app-page meetro-wide-page meetro-visual-page messages-inbox-page${
        focusedMessagesFlowOpen ? " messages-focused-flow-open" : ""
      }`}
      data-communication-layout={isSplitPane ? "desktop" : "mobile"}
      data-communication-context-mode={isWideWorkspace ? "column" : isSplitPane ? "inline" : "mobile"}
      style={{
        ...pageWrapper,
        ...(isSplitPane ? splitPageWrapper : {}),
        ...(focusedConversationFlowOpen ? focusedConversationPageWrapper : {}),
        paddingTop: "0px",
      }}
    >
      <style>{messagesMobileLayoutStyles}</style>

      <SafeBackBar
        setPage={setPage}
        fallback={getDashboardPageForAccountMode(activeAccountMode)}
        label={`← ${t("backToDashboard")}`}
        compact
      />

      {(relationshipViewMenuOpen || relationshipActionMenuOpen) && (
        <button
          type="button"
          aria-label="Close relationship menu"
          style={relationshipMenuBackdrop}
          onClick={() => {
            setRelationshipViewMenuOpen(false);
            setRelationshipActionMenuOpen(false);
          }}
        />
      )}

      {!focusedConversationFlowOpen && (
        <>
          <div className="messages-hub-header" style={messagesHubHeader}>
            <h1 className="messages-hub-title" style={messagesHubTitle}>Communication Center</h1>
            <div className="messages-header-action-wrap" style={relationshipMenuWrap}>
              <button
                type="button"
                className="messages-header-action-button"
                style={
                  messageSection === "conversations"
                    ? relationshipNewChatButton
                    : relationshipAddButton
                }
                onClick={() => {
                  setRelationshipActionMenuOpen((open) => !open);
                  setRelationshipViewMenuOpen(false);
                }}
                aria-expanded={relationshipActionMenuOpen}
                aria-label={getHeaderActionLabel()}
                title={getHeaderActionLabel()}
              >
                <span style={sectionActionIcon}>
                  {messageSection === "conversations" ? <IconNewChat /> : "+"}
                </span>
                <span style={sectionActionLabel}>{getHeaderActionLabel()}</span>
              </button>

              {relationshipActionMenuOpen && (
                <div
                  style={relationshipActionDropdown}
                  role="menu"
                  aria-label={getHeaderActionMenuLabel()}
                >
                  {getMessageSectionActions().map(([type, label]) => (
                    <button
                      key={`${type}-${label}`}
                      type="button"
                      style={relationshipDropdownItem}
                      onClick={() => openRelationshipAction(type, label)}
                    >
                      <span style={relationshipDropdownItemLabel}>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div
            className="messages-section-navigation"
            style={messageSectionNavigation}
            aria-label="Communication Center navigation"
          >
            {(() => {
              const [key, label] = CONTACT_SECTION_OPTION;
              const count = getMessageSectionCount(key);

              return (
                <button
                  type="button"
                  aria-label="Open Contacts"
                  style={{
                    ...messageSectionTab,
                    ...contactsDirectoryTab,
                    ...(messageSection === key ? activeMessageSectionTab : {}),
                  }}
                  onClick={() => setMessageSection(key)}
                >
                  <span style={messageSectionTabLabel}>{label}</span>
                  {count > 0 && <strong style={messageSectionTabCount}>{count}</strong>}
                </button>
              );
            })()}

            <div style={communicationSectionTabs} aria-label="Communication contexts">
              {COMMUNICATION_SECTION_OPTIONS.map(([key, label]) => {
              const count = getMessageSectionCount(key);

              return (
                <button
                  key={key}
                  type="button"
                  style={{
                    ...messageSectionTab,
                    ...(messageSection === key ? activeMessageSectionTab : {}),
                  }}
                  onClick={() => setMessageSection(key)}
                >
                  <span style={messageSectionTabLabel}>{label}</span>
                  {count > 0 && <strong style={messageSectionTabCount}>{count}</strong>}
                </button>
              );
              })}
            </div>
          </div>

          <div style={searchWrap}>
            <label style={searchLabel} htmlFor="messages-search">
              <MeetroIcon name="discover" size={18} decorative />
              <input
                id="messages-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={getMessageSearchPlaceholder()}
                style={searchInput}
              />
            </label>

            {searchQuery && (
              <button
                type="button"
                style={searchClearButton}
                onClick={() => setSearchQuery("")}
                aria-label={t("messagesSearchClear")}
              >
                ×
              </button>
            )}
          </div>

          {isSplitPane && !isWideWorkspace && (
            <button
              type="button"
              style={compactContextToggle}
              aria-expanded={compactContextOpen}
              aria-controls="communication-inline-context"
              onClick={() => setCompactContextOpen((open) => !open)}
            >
              <span>Relationship context</span>
              <span aria-hidden="true">{compactContextOpen ? "−" : "+"}</span>
            </button>
          )}
        </>
      )}

      {relationshipNotice && (
        <div style={relationshipNoticeCard}>{relationshipNotice}</div>
      )}

      {conversationStarter && !relationshipComposer && (
        <section
          style={conversationStarterPanel}
          className="meetro-visual-surface"
          aria-label={
            conversationStarter.mode === "group"
              ? "New Group Conversation"
              : "Choose Contacts"
          }
        >
          <div style={relationshipPanelHeader}>
            <div style={relationshipPanelHeaderText}>
              <p style={filterEyebrow}>Conversations</p>
              <h2 style={relationshipPanelTitle}>
                {conversationStarter.mode === "group"
                  ? "New Group Conversation"
                  : "Choose Contacts"}
              </h2>
              <p style={relationshipSubtitle}>
                {conversationStarter.mode === "group"
                  ? "Choose people first. Name the group only if it helps."
                  : "Start from a person or business. Add a contact only if they are not here yet."}
              </p>
            </div>
            <button
              type="button"
              style={relationshipCloseButton}
              onClick={closeConversationStarter}
            >
              Cancel
            </button>
          </div>

          {conversationStarter.step === "select" && (
            <>
              <div style={conversationStarterSearchRow}>
                <label style={conversationStarterSearchLabel}>
                  <MeetroIcon name="discover" size={16} decorative />
                  <input
                    value={conversationStarter.search}
                    onChange={(event) => updateConversationStarter("search", event.target.value)}
                    placeholder="Search contacts"
                    style={conversationStarterSearchInput}
                  />
                </label>
                <button
                  type="button"
                  style={conversationStarterAddContact}
                  onClick={startContactFromConversationPicker}
                >
                  Add Contact
                </button>
              </div>

              <div style={conversationStarterSelectedRow}>
                <span style={conversationStarterToLabel}>To:</span>
                {selectedConversationStarterRelationships.length > 0
                  ? selectedConversationStarterRelationships.map((relationship) => (
                      <span key={relationship.id} style={conversationStarterSelectedChip}>
                        {relationship.name}
                      </span>
                    ))
                  : (
                    <span style={conversationStarterHint}>
                      {conversationStarter.mode === "group"
                        ? "Choose at least two contacts."
                        : "Choose one contact."}
                    </span>
                  )}
              </div>

              {conversationStarter.mode === "group" && (
                <label style={conversationStarterGroupNameField}>
                  <span>Group name optional</span>
                  <input
                    value={conversationStarter.groupName}
                    onChange={(event) => updateConversationStarter("groupName", event.target.value)}
                    placeholder="Project - 1225 Wales Dr"
                    style={relationshipInput}
                  />
                </label>
              )}

              {conversationStarter.notice && (
                <div style={conversationStarterNotice}>{conversationStarter.notice}</div>
              )}

              {conversationStarterCandidates.length === 0 ? (
                <div style={conversationStarterEmpty}>
                  No contacts match this source. Add a contact, then return here to start the conversation.
                </div>
              ) : (
                <div style={conversationStarterList}>
                  {conversationStarterCandidates.map((relationship) => {
                    const readyToMessage = relationshipCanOpenConversation(relationship);
                    const selected = conversationStarter.selectedIds.includes(relationship.id);
                    const contact = getRelationshipContact(relationship);

                    return (
                      <button
                        key={relationship.id}
                        type="button"
                        style={{
                          ...conversationStarterRow,
                          ...(selected ? conversationStarterRowSelected : {}),
                        }}
                        onClick={() => chooseConversationStarterRelationship(relationship)}
                      >
                        <span style={conversationRowAvatar}>
                          {relationship.avatar ? (
                            <img
                              src={relationship.avatar}
                              alt={relationship.name}
                              style={avatarImage}
                            />
                          ) : (
                            relationship.initials
                          )}
                        </span>
                        <span style={conversationStarterRowBody}>
                          <strong style={conversationStarterRowName}>{relationship.name}</strong>
                          <span style={conversationStarterRowMeta}>
                            {relationship.typeLabel}
                            {contact.phone ? ` · ${contact.phone}` : ""}
                          </span>
                        </span>
                        <span
                          style={{
                            ...conversationStarterRowAction,
                            ...(!readyToMessage ? conversationStarterRowActionMuted : {}),
                          }}
                        >
                          {conversationStarter.mode === "group"
                            ? selected
                              ? "Selected"
                              : readyToMessage
                              ? "Select"
                              : "Invite first"
                            : selected
                            ? "Selected"
                            : readyToMessage
                            ? "Select"
                            : "Invite first"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={conversationStarterFooterRow}>
                <button
                  type="button"
                  style={relationshipSecondaryAction}
                  onClick={closeConversationStarter}
                >
                  Cancel
                </button>
                {conversationStarter.mode === "single" && (
                  <button
                    type="button"
                    disabled={!singleSelectionCanContinue}
                    style={{
                      ...relationshipPrimaryAction,
                      ...(!singleSelectionCanContinue ? relationshipDisabledAction : {}),
                    }}
                    onClick={startSelectedConversation}
                  >
                    Message
                  </button>
                )}
                {conversationStarter.mode === "group" && (
                  <button
                    type="button"
                    disabled={!groupSelectionCanContinue}
                    style={{
                      ...relationshipPrimaryAction,
                      ...(!groupSelectionCanContinue ? relationshipDisabledAction : {}),
                    }}
                    onClick={startSelectedGroupConversation}
                  >
                    Create Group
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {contactImport && (
        <section style={relationshipPanel} aria-label="Import Contacts" className="meetro-visual-surface">
          <div style={relationshipPanelHeader}>
            <div style={relationshipPanelHeaderText}>
              <p style={filterEyebrow}>Relationships</p>
              <h2 style={relationshipPanelTitle}>Import Contacts</h2>
              <p style={relationshipSubtitle}>
                Import creates a relationship placeholder. Invite activates their Meetro participation later.
              </p>
            </div>
            <button
              type="button"
              style={relationshipCloseButton}
              onClick={() => setContactImport(null)}
            >
              Cancel
            </button>
          </div>

          <input
            ref={contactImportFileRef}
            type="file"
            accept=".csv,.txt,.vcf,text/csv,text/plain,text/vcard"
            style={hiddenFileInput}
            onChange={handleContactImportFile}
          />

          {contactImport.notice && (
            <div style={contactImportNotice}>{contactImport.notice}</div>
          )}

          {contactImport.step === "source" && (
            <div style={contactImportSourceGrid}>
              <button
                type="button"
                style={contactImportSourceButton}
                onClick={importPhoneContacts}
              >
                <strong>Import from phone contacts</strong>
                <span>Choose contacts already saved on this device.</span>
              </button>
              <button
                type="button"
                style={contactImportSourceButton}
                onClick={openContactImportFilePicker}
              >
                <strong>Import from computer file</strong>
                <span>Upload CSV, text, or vCard contacts.</span>
              </button>
              <button
                type="button"
                style={contactImportSourceButton}
                onClick={startManualContactImport}
              >
                <strong>Select contacts manually</strong>
                <span>Add names, phone numbers, emails, and context yourself.</span>
              </button>
            </div>
          )}

          {contactImport.step === "select" && (
            <div style={contactImportFlow}>
              <label style={relationshipField}>
                <span>Default relationship type</span>
                <select
                  value={contactImport.defaultType}
                  onChange={(event) =>
                    updateContactImport({ defaultType: event.target.value })
                  }
                  style={relationshipInput}
                >
                  {CONTACT_IMPORT_TYPE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div style={contactImportManualCard}>
                <p style={contactImportSectionTitle}>Add a contact manually</p>
                <div style={relationshipFieldGrid}>
                  <label style={relationshipField}>
                    <span>Name</span>
                    <input
                      value={contactImport.manual.name}
                      onChange={(event) =>
                        updateManualImportContact("name", event.target.value)
                      }
                      placeholder="Name"
                      style={relationshipInput}
                    />
                  </label>
                  <label style={relationshipField}>
                    <span>Phone</span>
                    <input
                      value={contactImport.manual.phone}
                      onChange={(event) =>
                        updateManualImportContact("phone", event.target.value)
                      }
                      placeholder="Phone"
                      style={relationshipInput}
                    />
                  </label>
                  <label style={relationshipField}>
                    <span>Email</span>
                    <input
                      value={contactImport.manual.email}
                      onChange={(event) =>
                        updateManualImportContact("email", event.target.value)
                      }
                      placeholder="Email"
                      style={relationshipInput}
                    />
                  </label>
                  <label style={relationshipField}>
                    <span>Address</span>
                    <input
                      value={contactImport.manual.address}
                      onChange={(event) =>
                        updateManualImportContact("address", event.target.value)
                      }
                      placeholder="Address or service area"
                      style={relationshipInput}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  style={relationshipSecondaryAction}
                  onClick={addManualImportContact}
                >
                  Add Contact
                </button>
              </div>

              {contactImport.contacts.length > 0 && (
                <>
                  <div style={contactImportActionRow}>
                    <button
                      type="button"
                      style={relationshipSecondaryAction}
                      onClick={selectAllImportedContacts}
                    >
                      Select all contacts
                    </button>
                    <button
                      type="button"
                      style={relationshipPrimaryAction}
                      onClick={moveContactImportToReview}
                    >
                      Review Import
                    </button>
                  </div>

                  <div style={contactImportList}>
                    {contactImport.contacts.map((contact) => (
                      <div key={contact.id} style={contactImportRow}>
                        <label style={contactImportSelectLabel}>
                          <input
                            type="checkbox"
                            checked={contactImport.selectedIds.includes(contact.id)}
                            onChange={() => toggleImportedContact(contact.id)}
                          />
                          <span style={contactImportNameBlock}>
                            <strong>{contact.name || contact.email || contact.phone}</strong>
                            <span>
                              {[contact.phone, contact.email, contact.address]
                                .filter(Boolean)
                                .join(" · ") || "No contact detail yet"}
                            </span>
                          </span>
                        </label>
                        <select
                          value={contact.type}
                          onChange={(event) =>
                            updateImportedContact(contact.id, "type", event.target.value)
                          }
                          style={contactImportTypeSelect}
                        >
                          {CONTACT_IMPORT_TYPE_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {contactImport.step === "review" && (
            <div style={contactImportFlow}>
              <p style={contactImportSectionTitle}>
                Review before importing
              </p>
              <p style={relationshipSubtitle}>
                These contacts will appear as relationship rows. They do not need Meetro accounts yet.
              </p>

              <div style={contactImportList}>
                {selectedImportContacts.map((contact) => {
                  const typeLabel =
                    CONTACT_IMPORT_TYPE_OPTIONS.find((option) => option.id === contact.type)
                      ?.label || "Relationship";

                  return (
                    <div key={contact.id} style={contactImportReviewRow}>
                      <span style={contactImportNameBlock}>
                        <strong>{contact.name || contact.email || contact.phone}</strong>
                        <span>
                          {typeLabel}
                          {[contact.phone, contact.email, contact.address]
                            .filter(Boolean)
                            .length
                            ? ` · ${[contact.phone, contact.email, contact.address]
                                .filter(Boolean)
                                .join(" · ")}`
                            : ""}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={contactImportActionRow}>
                <button
                  type="button"
                  style={relationshipSecondaryAction}
                  onClick={() => updateContactImport({ step: "select", notice: "" })}
                >
                  Back
                </button>
                <button
                  type="button"
                  style={relationshipPrimaryAction}
                  onClick={saveContactImport}
                >
                  Import Contacts
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {relationshipComposer && (
        <section
          style={relationshipPanel}
          aria-label={relationshipComposer.label}
          className="meetro-visual-surface"
        >
          <form onSubmit={saveRelationshipComposer} style={relationshipComposerForm}>
            <div style={relationshipPanelHeader}>
              <div style={relationshipPanelHeaderText}>
                <p style={filterEyebrow}>
                  {relationshipComposer.section === "contacts" ? "Contact" : activeMessageSectionLabel}
                </p>
                <h2 style={relationshipPanelTitle}>{relationshipComposer.label}</h2>
                <p style={relationshipSubtitle}>
                  {relationshipComposer.section === "contacts"
                    ? "Save the person or business first. Conversation can begin when they are ready."
                    : "Start the conversation here. Work can follow later without recreating the contact."}
                </p>
              </div>
              <button
                type="button"
                style={relationshipCloseButton}
                onClick={() => setRelationshipComposer(null)}
              >
                Cancel
              </button>
            </div>

            {relationshipComposer.type === "space" ? (
              <>
                <div style={relationshipFieldGrid}>
                  <label style={relationshipField}>
                    <span>Tenant</span>
                    <select
                      value={relationshipComposer.tenantRelationshipId}
                      onChange={(event) => updateRelationshipComposer("tenantRelationshipId", event.target.value)}
                      style={relationshipInput}
                    >
                      <option value="">Choose tenant</option>
                      {tenantRelationshipOptions.map((relationship) => (
                        <option key={relationship.id} value={relationship.id}>
                          {relationship.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={relationshipField}>
                    <span>Professional / Vendor</span>
                    <select
                      value={relationshipComposer.vendorRelationshipId}
                      onChange={(event) => updateRelationshipComposer("vendorRelationshipId", event.target.value)}
                      style={relationshipInput}
                    >
                      <option value="">Choose professional/vendor</option>
                      {vendorRelationshipOptions.map((relationship) => (
                        <option key={relationship.id} value={relationship.id}>
                          {relationship.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div style={relationshipFieldGrid}>
                  <label style={relationshipField}>
                    <span>Tenant name if not saved yet</span>
                    <input
                      value={relationshipComposer.name}
                      onChange={(event) => updateRelationshipComposer("name", event.target.value)}
                      placeholder="Tenant"
                      style={relationshipInput}
                    />
                  </label>
                  <label style={relationshipField}>
                    <span>Professional/vendor if not saved yet</span>
                    <input
                      value={relationshipComposer.note}
                      onChange={(event) => updateRelationshipComposer("note", event.target.value)}
                      placeholder="Professional or vendor"
                      style={relationshipInput}
                    />
                  </label>
                </div>
                <label style={relationshipField}>
                  <span>Group name</span>
                  <input
                    value={relationshipComposer.groupName}
                    onChange={(event) => updateRelationshipComposer("groupName", event.target.value)}
                    placeholder="Unit 204 AC issue"
                    style={relationshipInput}
                  />
                </label>
                <label style={relationshipField}>
                  <span>Property / unit</span>
                  <input
                    value={relationshipComposer.propertyUnit}
                    onChange={(event) => updateRelationshipComposer("propertyUnit", event.target.value)}
                    placeholder="Property or unit"
                    style={relationshipInput}
                  />
                </label>
                <label style={relationshipField}>
                  <span>Forward existing ticket</span>
                  <select
                    value={relationshipComposer.forwardedTicketConversationId}
                    onChange={(event) =>
                      updateRelationshipComposer("forwardedTicketConversationId", event.target.value)
                    }
                    style={relationshipInput}
                  >
                    <option value="">No ticket yet</option>
                    {openTicketOptions.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.title} · {ticket.relationship.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={relationshipField}>
                  <span>Purpose</span>
                  <textarea
                    value={relationshipComposer.purpose}
                    onChange={(event) => updateRelationshipComposer("purpose", event.target.value)}
                    placeholder="What should this group conversation coordinate?"
                    style={relationshipTextarea}
                  />
                </label>
              </>
            ) : relationshipComposer.type === "invite" ? (
              <label style={relationshipField}>
                <span>Email</span>
                <input
                  value={relationshipComposer.email}
                  onChange={(event) => updateRelationshipComposer("email", event.target.value)}
                  placeholder="name@example.com"
                  style={relationshipInput}
                />
              </label>
            ) : (
              <>
                <label style={relationshipField}>
                  <span>Name</span>
                  <input
                    value={relationshipComposer.name}
                    onChange={(event) => updateRelationshipComposer("name", event.target.value)}
                    placeholder="Name"
                    style={relationshipInput}
                  />
                </label>
                <div style={relationshipFieldGrid}>
                  <label style={relationshipField}>
                    <span>Phone</span>
                    <input
                      value={relationshipComposer.phone}
                      onChange={(event) => updateRelationshipComposer("phone", event.target.value)}
                      placeholder="Phone"
                      style={relationshipInput}
                    />
                  </label>
                  <label style={relationshipField}>
                    <span>Email</span>
                    <input
                      value={relationshipComposer.email}
                      onChange={(event) => updateRelationshipComposer("email", event.target.value)}
                      placeholder="Email"
                      style={relationshipInput}
                    />
                  </label>
                </div>
                <label style={relationshipField}>
                  <span>Address</span>
                  <input
                    value={relationshipComposer.address}
                    onChange={(event) => updateRelationshipComposer("address", event.target.value)}
                    placeholder="Address or service area"
                    style={relationshipInput}
                  />
                </label>
                <label style={relationshipField}>
                  <span>Note</span>
                  <textarea
                    value={relationshipComposer.note}
                    onChange={(event) => updateRelationshipComposer("note", event.target.value)}
                    placeholder="What should Meetro remember about this relationship?"
                    style={relationshipTextarea}
                  />
                </label>
              </>
            )}

            <button type="submit" style={relationshipPrimaryAction}>
              {relationshipComposer.type === "invite"
                ? "Start Invite"
                : relationshipComposer.type === "space"
                ? "Start Conversation"
                : relationshipComposer.section === "contacts"
                ? "Save Contact"
                : "Start Conversation"}
            </button>
          </form>
        </section>
      )}

      {ticketComposer && activeRelationship && (
        <section
          style={relationshipPanel}
          aria-label="Create maintenance ticket"
          className="meetro-visual-surface"
        >
          <form onSubmit={saveMaintenanceTicket} style={relationshipComposerForm}>
            <div style={relationshipPanelHeader}>
              <div style={relationshipPanelHeaderText}>
                <p style={filterEyebrow}>Maintenance ticket</p>
                <h2 style={relationshipPanelTitle}>Send to property manager</h2>
                <p style={relationshipSubtitle}>
                  The ticket stays inside the relationship. Assignment creates work without recreating the ticket.
                </p>
              </div>
              <button
                type="button"
                style={relationshipCloseButton}
                onClick={() => setTicketComposer(null)}
              >
                Cancel
              </button>
            </div>

            <div style={relationshipFieldGrid}>
              <label style={relationshipField}>
                <span>Tenant</span>
                <input
                  value={ticketComposer.tenant}
                  onChange={(event) => updateTicketComposer("tenant", event.target.value)}
                  placeholder="Tenant"
                  style={relationshipInput}
                />
              </label>
              <label style={relationshipField}>
                <span>Property / unit</span>
                <input
                  value={ticketComposer.propertyUnit}
                  onChange={(event) => updateTicketComposer("propertyUnit", event.target.value)}
                  placeholder="Property or unit"
                  style={relationshipInput}
                />
              </label>
            </div>

            <label style={relationshipField}>
              <span>Description</span>
              <textarea
                value={ticketComposer.description}
                onChange={(event) => updateTicketComposer("description", event.target.value)}
                placeholder="Describe the maintenance issue"
                style={relationshipTextarea}
              />
            </label>

            <div style={relationshipFieldGrid}>
              <label style={relationshipField}>
                <span>Priority</span>
                <select
                  value={ticketComposer.priority}
                  onChange={(event) => updateTicketComposer("priority", event.target.value)}
                  style={relationshipInput}
                >
                  <option>Low</option>
                  <option>Normal</option>
                  <option>High</option>
                  <option>Emergency</option>
                </select>
              </label>
              <label style={relationshipField}>
                <span>Assign professional/vendor</span>
                <input
                  value={ticketComposer.assignedProfessional}
                  onChange={(event) => updateTicketComposer("assignedProfessional", event.target.value)}
                  placeholder="Optional"
                  style={relationshipInput}
                />
              </label>
            </div>

            <div style={photoPlaceholderBox}>Photo placeholder</div>

            <button type="submit" style={relationshipPrimaryAction}>
              Send to Property Manager
            </button>
          </form>
        </section>
      )}

      {savedHistoryOpen && (
        <section
          style={relationshipPanel}
          aria-label="Saved Conversation History"
          className="meetro-visual-surface"
        >
          <div style={relationshipPanelHeader}>
            <div style={relationshipPanelHeaderText}>
              <p style={filterEyebrow}>Communication Center</p>
              <h2 style={relationshipPanelTitle}>Saved Conversation History</h2>
              <p style={relationshipSubtitle}>
                Conversations you save manually stay here for future reference.
              </p>
            </div>
            <button
              type="button"
              style={relationshipCloseButton}
              onClick={() => {
                localStorage.removeItem("meetroMessagesOpenSavedHistory");
                setSavedHistoryOpen(false);
              }}
            >
              Back
            </button>
          </div>

          {savedHistoryQuotes.length === 0 ? (
            <div style={emptyCard} className="meetro-visual-empty-state meetro-visual-surface">
              <div style={emptyIcon}>HIS</div>
              <h2 style={emptyTitle}>No saved conversation history yet</h2>
              <p style={emptyText}>Conversations you save from the conversation menu will appear here.</p>
            </div>
          ) : (
            <div style={conversationList}>
              {savedHistoryQuotes.map((quote) =>
                renderConversationRow(quote, {
                  key: `saved-${quote.id}`,
                  returnToSavedHistory: true,
                  statusChip: isEmergencyConversationType(quote) ? "Emergency" : "Saved",
                  typeLabel: isEmergencyConversationType(quote)
                    ? "Emergency"
                    : isHiringConversation(quote)
                    ? "Hiring"
                    : "Relationship",
                })
              )}
            </div>
          )}
        </section>
      )}

      {!savedHistoryOpen && (
      <div
        data-communication-columns={isWideWorkspace ? "three" : isSplitPane ? "two" : "one"}
        style={
          isSplitPane
            ? {
                ...splitShell,
                ...(isWideWorkspace ? wideWorkspaceShell : {}),
              }
            : undefined
        }
      >
        <div style={isSplitPane ? splitListPane : undefined}>
          {(messageSection === "contacts" ? searchedRelationships : searchedVisibleQuotes).length === 0 && (
            <div style={emptyCard} className="meetro-visual-empty-state meetro-visual-surface">
              <div style={emptyIcon}>MSG</div>

              <h2 style={emptyTitle}>
                {normalizedSearchQuery ? t("messagesNoSearchResults") : emptyCopy.title}
              </h2>

              <p style={emptyText}>
                {normalizedSearchQuery ? t("messagesNoSearchResultsText") : emptyCopy.text}
              </p>

              {!normalizedSearchQuery && messageSection === "hiring" && (
                <button
                  type="button"
                  style={{ ...relationshipSecondaryAction, marginTop: "14px" }}
                  onClick={() => setPage("hiringCenter")}
                >
                  Open Hiring Center
                </button>
              )}
            </div>
          )}

	          <div style={conversationList}>
	            {messageSection !== "contacts" ? (
	              searchedVisibleQuotes.map((quote) => renderConversationRow(quote))
	            ) : searchedRelationships.map((relationship) => {
              const primaryConversation = relationship.primaryConversation || {};
              const counts = getRelationshipCounts(relationship);
              const statusChip = getRelationshipStatusChip(relationship);
              const inactiveImportedContact = isImportedInactiveRelationship(relationship);
              const rowIdentity = resolveRelationshipIdentity({
                relationship,
                record: getRelationshipContactRecord(relationship),
                viewerRole: activeAccountMode === "business" ? "business" : "homeowner",
                isLinked:
                  relationship.meetroAccountLinked === true ||
                  getRelationshipContactRecord(relationship).meetroAccountLinked === true,
                typeLabel: inactiveImportedContact
                  ? getContactTypeLabel(relationship)
                  : relationship.typeLabel,
              });

              return (
              <div
                key={relationship.id}
                onClick={() => openRelationshipConversation(relationship)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openRelationshipConversation(relationship);
                  }
                }}
                role="button"
                tabIndex={0}
                style={{
                  ...conversationRow,
                  ...((counts.unread || 0) > 0 ? unreadConversationRow : {}),
                  ...(statusChip === "Emergency" ? emergencyConversationRow : {}),
                  ...(isSplitPane &&
                  String(activeSplitConversationId) === String(primaryConversation.id)
                    ? activeConversationRow
                    : {}),
                  ...(inactiveImportedContact &&
                  String(activeContactCardId) === String(relationship.id)
                    ? activeConversationRow
                    : {}),
                }}
                className="meetro-visual-surface"
              >
                <div
                  style={{
                    ...conversationRowAvatar,
                    ...(isSplitPane ? splitAvatarCircle : {}),
                    ...((counts.unread || 0) > 0 ? unreadAvatar : {}),
                    ...(statusChip === "Emergency"
                      ? emergencyAvatar
                      : {}),
                  }}
                >
                  {rowIdentity.avatar ? (
                    <img
                      src={rowIdentity.avatar}
                      alt={rowIdentity.displayName}
                      style={avatarImage}
                    />
                  ) : (
                    rowIdentity.initials
                  )}
                </div>

                <div style={conversationRowBody}>
                  <div style={conversationRowTop}>
                    <div style={conversationRowTitleBlock}>
                      <h2 style={conversationRowName}>{rowIdentity.displayName}</h2>
                      <p style={conversationRowMeta}>
                        {inactiveImportedContact
                          ? rowIdentity.typeLabel
                          : [
                              rowIdentity.typeLabel,
                              getCommunicationIntent(primaryConversation, relationship).trim() || "",
                            ]
                              .filter(
                                (value, index, values) =>
                                  value && values.indexOf(value) === index
                              )
                              .join(" · ")}
                      </p>
                    </div>

                    <div style={conversationRowRight}>
                      <span style={timeText}>{getRelationshipDisplayTime(relationship)}</span>
                      {(counts.unread || 0) > 0 && (
                        <span style={conversationUnreadBadge}>{counts.unread}</span>
                      )}
                    </div>
                  </div>

                  <div style={conversationRowBottom}>
                    <p style={conversationRowPreview}>
                      {getRelationshipPreviewText(relationship)}
                    </p>
                    {statusChip && (
                      <span
                        style={{
                          ...conversationStatusChip,
                          ...(statusChip === "Emergency" ? emergencyStatusBadge : {}),
                          ...(statusChip === "Unread" ? unreadStatusBadge : {}),
                        }}
                      >
                        {statusChip}
                      </span>
                    )}
                  </div>
                </div>
              </div>
	              );
	            })}
	          </div>

	          <div style={messagesSecondaryActions} aria-label="Communication Center secondary actions">
	            <button
	              type="button"
	              style={savedHistorySecondaryButton}
                className="meetro-visual-surface"
	              onClick={() => openRelationshipAction(...SAVED_HISTORY_ACTION)}
	            >
	              <span style={savedHistorySecondaryTitle}>Saved Conversation History</span>
	              <span style={savedHistorySecondaryMeta}>
	                {savedHistoryQuotes.length > 0
	                  ? `${savedHistoryQuotes.length} saved`
	                  : "Conversations you save manually"}
	              </span>
	            </button>
	          </div>
	        </div>

        {isSplitPane && (
          <div style={splitThreadPane}>
            {activeSplitConversation ? (
              <ConversationThread
                embedded
                setPage={(nextPage) => {
                  if (nextPage === "messagesInbox" || nextPage === "conversationThread") {
                    setActiveSplitConversationId("");
                    return;
                  }

                  setPage(nextPage);
                }}
              />
            ) : (
              <div style={splitPlaceholder} className="meetro-visual-empty-state meetro-visual-surface">
                <div style={splitPlaceholderIcon}>MSG</div>
                <h2 style={splitPlaceholderTitle}>{t("communicationCenterTitle")}</h2>
                <p style={splitPlaceholderText}>
                  {isSpanish
                    ? "Selecciona una conversación para ver mensajes, tarjetas de flujo y próximos pasos."
                    : "Select a conversation to view messages, workflow cards, and next steps."}
                </p>
              </div>
            )}
          </div>
        )}

        {isWideWorkspace && renderWorkspaceContextPanel()}
      </div>
      )}

      {isSplitPane && !isWideWorkspace && compactContextOpen && (
        <div id="communication-inline-context" style={compactContextRegion}>
          {renderWorkspaceContextPanel()}
        </div>
      )}


        <BottomNav setPage={setPage} currentPage="messagesInbox" />
    </div>
  );
}

const pageWrapper = {
  background:
    "var(--meetro-gradient-community-page, radial-gradient(circle at 18% 0%, rgba(243,236,220,0.74), transparent 32%), radial-gradient(circle at 100% 12%, rgba(225,236,221,0.52), transparent 28%), linear-gradient(to bottom, #fbfcff, #f6f8fc))",
  minHeight: "100vh",
  padding:
    "0 max(18px, env(safe-area-inset-right, 0px)) calc(132px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  color: "#111827",
  width: "100%",
  maxWidth: "min(920px, 100%)",
  minWidth: 0,
  margin: "0 auto",
  overflowX: "hidden",
  overscrollBehaviorX: "none",
  scrollPaddingBottom: "calc(160px + env(safe-area-inset-bottom, 0px))",
};

const focusedConversationPageWrapper = {
  ...keyboardSafeFlowPage,
  paddingBottom: "calc(170px + env(safe-area-inset-bottom, 0px))",
  scrollPaddingBottom: "calc(190px + env(safe-area-inset-bottom, 0px))",
};

const relationshipIdentityPageWrapper = {
  ...pageWrapper,
  ...focusedConversationPageWrapper,
  maxWidth: "min(760px, 100%)",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 10px) max(16px, env(safe-area-inset-right, 0px)) calc(132px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))",
};

const splitPageWrapper = {
  maxWidth: "min(1360px, 100%)",
};

const splitShell = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 0.38fr) minmax(0, 0.62fr)",
  gap: "18px",
  alignItems: "stretch",
  height: "min(760px, calc(100dvh - 330px))",
  minHeight: "540px",
  width: "100%",
  minWidth: 0,
  minBlockSize: 0,
  overflow: "hidden",
};

const wideWorkspaceShell = {
  gridTemplateColumns:
    "minmax(280px, 0.28fr) minmax(420px, 0.44fr) minmax(280px, 0.28fr)",
  gap: "20px",
  height: "min(780px, calc(100dvh - 300px))",
};

const compactContextToggle = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: "44px",
  margin: "0 0 12px",
  padding: "10px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  borderRadius: "16px",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "13px",
  fontWeight: "900",
  cursor: "pointer",
  boxSizing: "border-box",
};

const compactContextRegion = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  height: "min(360px, 42dvh)",
  marginTop: "14px",
  overflow: "hidden",
};

const splitListPane = {
  minWidth: 0,
  minHeight: 0,
  height: "100%",
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: "4px",
  WebkitOverflowScrolling: "touch",
};

const splitThreadPane = {
  minWidth: 0,
  minHeight: 0,
  height: "100%",
  overflow: "hidden",
  borderRadius: "30px",
  background: "var(--meetro-surface-paper, rgba(255,255,255,0.82))",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  boxShadow: "var(--meetro-shadow-soft, 0 18px 44px rgba(15,23,42,0.08))",
};

const workspaceContextPane = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: 0,
  height: "100%",
  overflowY: "auto",
  overflowX: "hidden",
  display: "grid",
  alignContent: "start",
  gap: 0,
  padding: "16px 16px calc(32px + env(safe-area-inset-bottom, 0px))",
  boxSizing: "border-box",
  WebkitOverflowScrolling: "touch",
  overscrollBehavior: "contain",
  scrollPaddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
  scrollbarGutter: "stable",
  borderRadius: "28px",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  boxShadow: "var(--meetro-shadow-soft, 0 18px 44px rgba(15,23,42,0.08))",
};

const workspaceContextCard = {
  ...glassSurface,
  borderRadius: "28px",
  padding: "18px",
  display: "grid",
  gap: "14px",
  minWidth: 0,
  overflow: "hidden",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  boxShadow: "var(--meetro-shadow-soft, 0 18px 44px rgba(15,23,42,0.08))",
};

const workspaceContextSection = {
  display: "grid",
  gap: "10px",
  minWidth: 0,
  padding: "13px 0",
  borderTop: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
};

const workspaceContextEmpty = {
  ...workspaceContextCard,
  minHeight: "100%",
  placeItems: "center",
  alignContent: "center",
  textAlign: "center",
};

const workspaceContextIcon = {
  width: "58px",
  height: "58px",
  borderRadius: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "13px",
  fontWeight: "950",
};

const workspaceContextEyebrow = {
  margin: 0,
  color: "var(--meetro-color-wood, #b7791f)",
  fontSize: "10px",
  fontWeight: "950",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const workspaceIdentityRow = {
  display: "grid",
  gridTemplateColumns: "46px minmax(0, 1fr)",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
};

const workspaceContextAvatar = {
  width: "46px",
  height: "46px",
  borderRadius: "16px",
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-forest, #1f4d34)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "950",
  fontSize: "16px",
  flexShrink: 0,
  overflow: "hidden",
};

const workspaceIdentityCopy = {
  minWidth: 0,
};

const workspaceContextTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "18px",
  lineHeight: 1.12,
  fontWeight: "950",
  overflowWrap: "break-word",
};

const workspaceContextMeta = {
  margin: "3px 0 0",
  color: "var(--meetro-color-muted, #5f6b63)",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: "800",
};

const workspaceContextText = {
  margin: 0,
  color: "var(--meetro-color-muted, #5f6b63)",
  fontSize: "14px",
  lineHeight: 1.5,
  fontWeight: "700",
};

const workspaceFactList = {
  display: "grid",
  gap: 0,
  minWidth: 0,
};

const workspaceFactRow = {
  display: "grid",
  gridTemplateColumns: "minmax(84px, 0.42fr) minmax(0, 1fr)",
  alignItems: "baseline",
  gap: "10px",
  minWidth: 0,
  padding: "7px 0",
  borderTop: "1px solid rgba(78,68,55,0.08)",
};

const workspaceFactLabel = {
  color: "var(--meetro-color-wood, #b7791f)",
  fontSize: "10px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const workspaceFactValue = {
  color: "#0f172a",
  fontSize: "14px",
  lineHeight: 1.35,
  fontWeight: "900",
  overflowWrap: "anywhere",
  textAlign: "right",
};

const workspaceContextAction = {
  border: "none",
  borderRadius: "18px",
  padding: "13px 14px",
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #1f4d34, #14351f))",
  color: "#ffffff",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "var(--meetro-shadow-lifted, 0 14px 32px rgba(31,77,52,0.22))",
};

const splitPlaceholder = {
  height: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "28px",
  borderRadius: "30px",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  boxShadow: "var(--meetro-shadow-soft, 0 18px 44px rgba(15,23,42,0.08))",
  color: "var(--meetro-color-muted, #5f6b63)",
};

const splitPlaceholderIcon = {
  width: "72px",
  height: "72px",
  borderRadius: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "34px",
  marginBottom: "16px",
};

const splitPlaceholderTitle = {
  margin: "0 0 8px",
  color: "#111827",
  fontSize: "26px",
  lineHeight: 1.1,
};

const splitPlaceholderText = {
  margin: 0,
  maxWidth: "420px",
  lineHeight: 1.55,
  fontWeight: "700",
};

const backButton = {
  border: "none",
  background: "var(--meetro-surface-warm, rgba(251,246,237,0.92))",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "10px 14px",
  borderRadius: "999px",
  fontWeight: "900",
  marginBottom: "18px",
  cursor: "pointer",
  boxShadow: "var(--meetro-shadow-soft, 0 8px 22px rgba(15,23,42,0.08))",
};

const messagesHubHeader = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  marginBottom: "12px",
  padding: "2px 2px 0",
  boxSizing: "border-box",
  overflow: "visible",
  position: "relative",
  zIndex: 70,
};

const messagesHubTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "clamp(26px, 8vw, 32px)",
  lineHeight: 1.05,
  fontWeight: "950",
  letterSpacing: 0,
  minWidth: 0,
  maxWidth: "100%",
  overflowWrap: "normal",
  wordBreak: "normal",
};

const messageSectionNavigation = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: "9px",
  alignItems: "center",
  marginBottom: "12px",
  boxSizing: "border-box",
  overflow: "hidden",
};

const messageSectionTabs = {
  ...glassNavigationSurface,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "flex",
  gap: "8px",
  marginBottom: "12px",
  padding: "5px",
  borderRadius: "24px",
  boxSizing: "border-box",
  overflowX: "auto",
  overflowY: "hidden",
  overscrollBehaviorX: "contain",
  WebkitOverflowScrolling: "touch",
  scrollPaddingInline: "8px",
  scrollbarWidth: "none",
};

const communicationSectionTabs = {
  ...messageSectionTabs,
  marginBottom: 0,
};

const messageSectionTab = {
  ...glassPill,
  flex: "0 0 auto",
  minWidth: "108px",
  minHeight: "36px",
  borderRadius: "999px",
  color: "#475569",
  padding: "8px 11px",
  display: "grid",
  gridTemplateColumns: "minmax(0, auto) auto",
  alignContent: "center",
  justifyContent: "center",
  alignItems: "center",
  gap: "6px",
  fontSize: "12px",
  fontWeight: "900",
  cursor: "pointer",
  boxSizing: "border-box",
  overflow: "hidden",
};

const contactsDirectoryTab = {
  minWidth: "104px",
  marginBottom: 0,
};

const activeMessageSectionTab = {
  ...glassPillActive,
  color: "#ffffff",
};

const messageSectionTabLabel = {
  width: "100%",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const messageSectionTabCount = {
  minWidth: "17px",
  height: "17px",
  borderRadius: "999px",
  background: "rgba(15,23,42,0.08)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 5px",
  fontSize: "9px",
  lineHeight: 1,
};

const messageSectionContext = {
  minWidth: 0,
  flex: "1 1 auto",
  display: "grid",
  gap: "2px",
  color: "#111827",
  fontSize: "13px",
  fontWeight: "900",
  overflow: "hidden",
};

const relationshipInboxToolbar = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
  marginBottom: "14px",
  position: "relative",
  overflow: "visible",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  paddingInline: "1px",
};

const relationshipInboxToolbarWithMenu = {
  paddingBottom: "306px",
};

const relationshipMenuWrap = {
  position: "relative",
  zIndex: 80,
  maxWidth: "100%",
  minWidth: 0,
  flex: "0 1 auto",
};

const relationshipMenuButton = {
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  borderRadius: "999px",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "10px 12px",
  fontSize: "12px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "var(--meetro-shadow-soft, 0 6px 16px rgba(15,23,42,0.04))",
  maxWidth: "min(180px, calc(100vw - 96px))",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  boxSizing: "border-box",
};

const relationshipAddButton = {
  ...glassFloatingButton,
  minHeight: "38px",
  minWidth: "0",
  border: "none",
  borderRadius: "999px",
  color: "#ffffff",
  padding: "8px 12px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  fontSize: "13px",
  lineHeight: 1,
  fontWeight: "950",
  cursor: "pointer",
  maxWidth: "min(190px, calc(100vw - 170px))",
  boxSizing: "border-box",
  overflow: "hidden",
};

const relationshipNewChatButton = {
  ...relationshipAddButton,
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-forest, #1f4d34)",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  boxShadow: "var(--meetro-shadow-soft, 0 10px 24px rgba(15,23,42,0.08))",
};

const sectionActionIcon = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  fontSize: "18px",
  lineHeight: 1,
};

const sectionActionLabel = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const relationshipDropdown = {
  ...glassActionMenu,
  position: "absolute",
  top: "calc(100% + 10px)",
  zIndex: 90,
  width: "min(268px, calc(100dvw - 40px))",
  maxWidth: "calc(100dvw - 40px)",
  maxHeight: "292px",
  overflowY: "auto",
  overflowX: "hidden",
  borderRadius: "16px",
  padding: "8px",
  boxSizing: "border-box",
  overscrollBehavior: "contain",
};

const relationshipViewDropdown = {
  ...relationshipDropdown,
  left: 0,
  right: "auto",
};

const relationshipActionDropdown = {
  ...relationshipDropdown,
  right: 0,
  left: "auto",
};

const relationshipMenuBackdrop = {
  position: "fixed",
  inset: 0,
  width: "100%",
  maxWidth: "100%",
  overflow: "hidden",
  zIndex: 50,
  border: "none",
  background: "rgba(15,23,42,0.01)",
  backdropFilter: "blur(1.5px)",
  WebkitBackdropFilter: "blur(1.5px)",
  cursor: "default",
};

const relationshipDropdownItem = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  border: "none",
  background: "transparent",
  color: "#334155",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  padding: "9px 10px",
  borderRadius: "11px",
  fontSize: "13px",
  fontWeight: "900",
  textAlign: "left",
  cursor: "pointer",
  boxSizing: "border-box",
  overflow: "hidden",
};

const relationshipDropdownItemLabel = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const relationshipDropdownItemCount = {
  flex: "0 0 auto",
  minWidth: "24px",
  textAlign: "right",
};

const relationshipDropdownItemActive = {
  background: "#f3f0ff",
  color: "var(--meetro-color-forest, #1f4d34)",
};

const relationshipNoticeCard = {
  background: "#f0fdfa",
  color: "#0f766e",
  border: "1px solid rgba(20,184,166,0.18)",
  borderRadius: "18px",
  padding: "12px 14px",
  marginBottom: "12px",
  fontSize: "13px",
  fontWeight: "850",
  lineHeight: 1.35,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflowWrap: "anywhere",
};

const conversationStarterPanel = {
  ...glassSurface,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 150px)",
  borderRadius: "28px",
  padding: "16px 13px calc(22px + env(safe-area-inset-bottom, 0px))",
  marginBottom: "18px",
  boxSizing: "border-box",
  overflowX: "hidden",
  overscrollBehaviorX: "none",
  display: "flex",
  flexDirection: "column",
};

const conversationStarterSearchRow = {
  ...glassNavigationSurface,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "flex",
  gap: "8px",
  alignItems: "center",
  marginBottom: "13px",
  flexWrap: "wrap",
  overflowX: "hidden",
  position: "sticky",
  top: "0px",
  zIndex: 4,
  borderRadius: "20px",
  padding: "8px",
};

const conversationStarterSearchLabel = {
  ...glassField,
  flex: "1 1 100%",
  minWidth: 0,
  minHeight: "43px",
  borderRadius: "14px",
  color: "#64748b",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "0 12px",
  boxSizing: "border-box",
  overflow: "hidden",
};

const conversationStarterSearchInput = {
  width: "100%",
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "#111827",
  fontSize: "14px",
  fontWeight: "750",
};

const conversationStarterAddContact = {
  border: "none",
  borderRadius: "999px",
  background: "transparent",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "6px 2px",
  fontSize: "12px",
  fontWeight: "950",
  cursor: "pointer",
  boxSizing: "border-box",
  whiteSpace: "nowrap",
  justifySelf: "flex-start",
};

const conversationStarterSelectedRow = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "flex",
  gap: "7px",
  flexWrap: "wrap",
  alignItems: "center",
  margin: "10px 0 12px",
  overflowX: "hidden",
};

const conversationStarterToLabel = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: "950",
  lineHeight: "28px",
  flex: "0 0 auto",
};

const conversationStarterSelectedChip = {
  maxWidth: "100%",
  minWidth: 0,
  borderRadius: "999px",
  background: "#ede9ff",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "7px 10px",
  fontSize: "12px",
  fontWeight: "900",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const conversationStarterGroupNameField = {
  display: "grid",
  gap: "6px",
  color: "#475569",
  fontSize: "12px",
  fontWeight: "900",
  minWidth: 0,
  maxWidth: "100%",
  overflowWrap: "anywhere",
  margin: "0 0 12px",
};

const conversationStarterHint = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "800",
};

const conversationStarterNotice = {
  background: "#f0fdfa",
  color: "#0f766e",
  border: "1px solid rgba(20,184,166,0.18)",
  borderRadius: "18px",
  padding: "12px 14px",
  marginBottom: "10px",
  fontSize: "13px",
  fontWeight: "850",
  lineHeight: 1.35,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflowWrap: "anywhere",
};

const conversationStarterEmpty = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  border: "1px dashed rgba(148,163,184,0.34)",
  borderRadius: "18px",
  background: "#f8fafc",
  color: "#64748b",
  padding: "16px",
  boxSizing: "border-box",
  fontSize: "13px",
  fontWeight: "800",
  lineHeight: 1.45,
  overflowWrap: "anywhere",
};

const conversationStarterList = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gap: "6px",
  marginBottom: 0,
  maxHeight: "min(54dvh, 430px)",
  overflowY: "auto",
  overflowX: "hidden",
  WebkitOverflowScrolling: "touch",
  overscrollBehavior: "contain",
  paddingBottom: "calc(118px + env(safe-area-inset-bottom, 0px))",
  scrollPaddingBottom: "calc(118px + env(safe-area-inset-bottom, 0px))",
  flex: "1 1 auto",
};

const conversationStarterRow = {
  ...nativeContactRow,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  borderRadius: "16px",
  color: "#0f172a",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "9px",
  textAlign: "left",
  cursor: "pointer",
  boxSizing: "border-box",
  overflow: "hidden",
};

const conversationStarterRowSelected = {
  border: "1px solid rgba(31,77,52,0.28)",
  background: "#f8f6ff",
};

const conversationStarterRowBody = {
  minWidth: 0,
  maxWidth: "100%",
  flex: "1 1 auto",
  display: "grid",
  gap: "3px",
  overflow: "hidden",
};

const conversationStarterRowName = {
  minWidth: 0,
  color: "#111827",
  fontSize: "14px",
  lineHeight: 1.2,
  fontWeight: "950",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const conversationStarterRowMeta = {
  minWidth: 0,
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.25,
  fontWeight: "800",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const conversationStarterRowAction = {
  flex: "0 0 auto",
  borderRadius: "999px",
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-charcoal, #172317)",
  padding: "6px 8px",
  fontSize: "11px",
  fontWeight: "950",
  whiteSpace: "nowrap",
};

const conversationStarterRowActionMuted = {
  background: "#f1f5f9",
  color: "#64748b",
};

const conversationStarterFooterRow = {
  ...bottomActionBar,
  position: "sticky",
  bottom: "calc(78px + env(safe-area-inset-bottom, 0px))",
  zIndex: 8,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))",
  gap: "10px",
  marginTop: "auto",
  padding: "12px 0 calc(10px + env(safe-area-inset-bottom, 0px))",
  boxSizing: "border-box",
  overflowX: "hidden",
};

const conversationGroupPhotoPlaceholder = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  border: "1px dashed rgba(148,163,184,0.34)",
  borderRadius: "18px",
  background: "#f8fafc",
  color: "#64748b",
  padding: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  margin: "10px 0 14px",
  fontSize: "13px",
  fontWeight: "850",
  boxSizing: "border-box",
  overflowWrap: "anywhere",
};

const conversationStarterPrimaryAction = {
  position: "sticky",
  bottom: "calc(78px + env(safe-area-inset-bottom, 0px))",
  zIndex: 5,
  marginTop: "auto",
  boxShadow: "0 10px 24px rgba(31,77,52,0.18)",
};

const emptyCard = {
  background: "white",
  borderRadius: "28px",
  padding: "34px 22px",
  textAlign: "center",
  boxShadow: "0 14px 36px rgba(0,0,0,0.07)",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflowX: "hidden",
};

const emptyIcon = {
  fontSize: "52px",
  marginBottom: "12px",
};

const emptyTitle = {
  color: "#111827",
  marginTop: 0,
};

const emptyText = {
  color: "#667085",
  marginBottom: 0,
  lineHeight: 1.5,
};

const accountRecoveryCard = {
  ...glassSurface,
  borderRadius: "28px",
  padding: "24px",
  margin: "28px 0 16px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflowX: "hidden",
};

const accountRecoveryTitle = {
  margin: "4px 0 10px",
  color: "#0f172a",
  fontSize: "clamp(24px, 7vw, 32px)",
  lineHeight: 1.08,
  fontWeight: "950",
  letterSpacing: 0,
};

const accountRecoveryText = {
  margin: 0,
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.5,
  fontWeight: "750",
};

const accountRecoveryActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
  marginTop: "18px",
};

const searchWrap = {
  position: "relative",
  marginBottom: "12px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const searchLabel = {
  ...glassField,
  width: "100%",
  minHeight: "48px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  borderRadius: "18px",
  padding: "0 44px 0 14px",
  boxSizing: "border-box",
  color: "#64748b",
};

const searchInput = {
  width: "100%",
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "#111827",
  fontSize: "15px",
  fontWeight: "750",
};

const searchClearButton = {
  position: "absolute",
  top: "50%",
  right: "10px",
  transform: "translateY(-50%)",
  width: "30px",
  height: "30px",
  border: "none",
  borderRadius: "999px",
  background: "#f1f5f9",
  color: "#475569",
  fontSize: "20px",
  fontWeight: "900",
  lineHeight: 1,
  cursor: "pointer",
};

const filterEyebrow = {
  margin: 0,
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.35px",
  textTransform: "uppercase",
};

const filterTitle = {
  margin: "4px 0 0",
  color: "#111827",
  fontSize: "22px",
  lineHeight: 1.15,
};

const relationshipSubtitle = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "750",
};

const relationshipPrimaryAction = {
  border: "none",
  borderRadius: "999px",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "#ffffff",
  padding: "10px 13px",
  fontSize: "12px",
  fontWeight: "950",
  cursor: "pointer",
  maxWidth: "100%",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  boxSizing: "border-box",
};

const relationshipSecondaryAction = {
  ...glassPill,
  border: "1px solid rgba(31,77,52,0.16)",
  borderRadius: "999px",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "10px 13px",
  fontSize: "12px",
  fontWeight: "950",
  cursor: "pointer",
  maxWidth: "100%",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  boxSizing: "border-box",
};

const relationshipDisabledAction = {
  background: "#e2e8f0",
  color: "#94a3b8",
  cursor: "not-allowed",
  boxShadow: "none",
  opacity: 0.82,
};

const relationshipPanel = {
  ...glassSurface,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  borderRadius: "28px",
  padding: "14px",
  marginBottom: "14px",
  boxSizing: "border-box",
  overflowX: "hidden",
  overscrollBehaviorX: "none",
};

const relationshipPanelHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: "12px",
  flexWrap: "wrap",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const relationshipPanelHeaderText = {
  minWidth: 0,
  maxWidth: "100%",
  flex: "1 1 220px",
  overflowWrap: "anywhere",
};

const relationshipPanelTitle = {
  margin: "4px 0 0",
  color: "#111827",
  fontSize: "24px",
  lineHeight: 1.1,
  fontWeight: "950",
  overflowWrap: "anywhere",
};

const relationshipCloseButton = {
  ...glassPill,
  border: "1px solid #e2e8f0",
  borderRadius: "999px",
  color: "#334155",
  padding: "9px 12px",
  fontSize: "12px",
  fontWeight: "900",
  cursor: "pointer",
  maxWidth: "100%",
  flexShrink: 0,
  whiteSpace: "normal",
  boxSizing: "border-box",
};

const contactCardActionRow = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: "12px",
  overflowX: "hidden",
};

const contactCardSubpanel = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  border: "1px solid rgba(31,77,52,0.14)",
  borderRadius: "18px",
  background: "rgba(248,246,255,0.72)",
  padding: "12px",
  marginBottom: "12px",
  boxSizing: "border-box",
  display: "grid",
  gap: "10px",
  overflowX: "hidden",
};

const contactCardSectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "14px",
  fontWeight: "950",
  lineHeight: 1.25,
};

const relationshipComposerForm = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gap: "12px",
  overflowX: "hidden",
};

const relationshipFieldGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))",
  gap: "10px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const relationshipField = {
  display: "grid",
  gap: "6px",
  color: "#475569",
  fontSize: "12px",
  fontWeight: "900",
  minWidth: 0,
  maxWidth: "100%",
  overflowWrap: "anywhere",
};

const relationshipInput = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid rgba(148,163,184,0.32)",
  borderRadius: "14px",
  background: "#ffffff",
  color: "#111827",
  padding: "12px",
  fontSize: "14px",
  fontWeight: "750",
  outline: "none",
  overflowWrap: "anywhere",
};

const relationshipTextarea = {
  ...relationshipInput,
  minHeight: "92px",
  resize: "vertical",
  lineHeight: 1.45,
};

const hiddenFileInput = {
  position: "absolute",
  width: "1px",
  height: "1px",
  opacity: 0,
  pointerEvents: "none",
};

const contactImportNotice = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  background: "#f8fafc",
  border: "1px solid rgba(148,163,184,0.22)",
  color: "#475569",
  borderRadius: "16px",
  padding: "10px 12px",
  marginBottom: "12px",
  fontSize: "13px",
  fontWeight: "800",
  lineHeight: 1.4,
  boxSizing: "border-box",
  overflowWrap: "anywhere",
};

const contactImportSourceGrid = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gap: "10px",
  overflowX: "hidden",
};

const contactImportSourceButton = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  border: "1px solid rgba(31,77,52,0.14)",
  borderRadius: "18px",
  background: "rgba(248,250,252,0.92)",
  color: "#0f172a",
  padding: "13px",
  display: "grid",
  gap: "5px",
  textAlign: "left",
  cursor: "pointer",
  boxSizing: "border-box",
  overflowX: "hidden",
};

const contactImportFlow = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gap: "12px",
  overflowX: "hidden",
};

const contactImportManualCard = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  border: "1px solid rgba(226,232,240,0.9)",
  borderRadius: "18px",
  background: "#fbfdff",
  padding: "12px",
  display: "grid",
  gap: "10px",
  boxSizing: "border-box",
  overflowX: "hidden",
};

const contactImportSectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "14px",
  fontWeight: "950",
  lineHeight: 1.25,
};

const contactImportActionRow = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "flex-end",
  overflowX: "hidden",
};

const contactImportList = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gap: "8px",
  overflowX: "hidden",
};

const contactImportRow = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "8px",
  border: "1px solid rgba(226,232,240,0.95)",
  borderRadius: "16px",
  background: "#ffffff",
  padding: "10px",
  boxSizing: "border-box",
  overflowX: "hidden",
};

const contactImportReviewRow = {
  ...contactImportRow,
  background: "#f8f6ff",
  border: "1px solid rgba(31,77,52,0.14)",
};

const contactImportSelectLabel = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "flex",
  alignItems: "flex-start",
  gap: "9px",
  color: "#0f172a",
  cursor: "pointer",
  overflowX: "hidden",
};

const contactImportNameBlock = {
  minWidth: 0,
  maxWidth: "100%",
  display: "grid",
  gap: "3px",
  color: "#0f172a",
  fontSize: "13px",
  fontWeight: "850",
  overflowWrap: "anywhere",
};

const contactImportTypeSelect = {
  ...relationshipInput,
  padding: "10px",
  fontSize: "13px",
};

const photoPlaceholderBox = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  border: "1px dashed rgba(31,77,52,0.26)",
  background: "#f8f6ff",
  color: "var(--meetro-color-forest, #1f4d34)",
  borderRadius: "16px",
  padding: "14px",
  fontSize: "13px",
  fontWeight: "900",
  textAlign: "center",
  boxSizing: "border-box",
  overflowWrap: "anywhere",
};

const conversationList = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gap: "8px",
  overflowX: "hidden",
};

const messagesSecondaryActions = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gap: "8px",
  marginTop: "14px",
  paddingBottom: "4px",
  overflowX: "hidden",
};

const savedHistorySecondaryButton = {
  ...glassPill,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  border: "1px solid rgba(148,163,184,0.18)",
  borderRadius: "18px",
  color: "#475569",
  padding: "12px 13px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  textAlign: "left",
  cursor: "pointer",
  boxSizing: "border-box",
  overflow: "hidden",
};

const savedHistorySecondaryTitle = {
  minWidth: 0,
  color: "#334155",
  fontSize: "13px",
  fontWeight: "950",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const savedHistorySecondaryMeta = {
  flex: "0 0 auto",
  maxWidth: "48%",
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "850",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const conversationRow = {
  ...nativeContactRow,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "flex",
  gap: "12px",
  alignItems: "center",
  borderRadius: "18px",
  padding: "12px",
  cursor: "pointer",
  textAlign: "left",
  boxSizing: "border-box",
  overflow: "hidden",
  appearance: "none",
  WebkitAppearance: "none",
  font: "inherit",
  touchAction: "manipulation",
  position: "relative",
  zIndex: 60,
};

const unreadConversationRow = {
  background: "var(--meetro-surface-sage, #eef4ea)",
  border: "1px solid rgba(31,77,52,0.18)",
};

const emergencyConversationRow = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,241,242,0.94))",
  border: "1px solid rgba(239,68,68,0.18)",
};

const activeConversationRow = {
  border: "2px solid rgba(31,77,52,0.22)",
};

const conversationRowAvatar = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-forest, #1f4d34)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "950",
  fontSize: "16px",
  flexShrink: 0,
  overflow: "hidden",
};

const conversationRowBody = {
  minWidth: 0,
  flex: 1,
  display: "grid",
  gap: "6px",
};

const conversationRowTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "flex-start",
  minWidth: 0,
  maxWidth: "100%",
};

const conversationRowTitleBlock = {
  minWidth: 0,
  maxWidth: "100%",
  overflow: "hidden",
};

const conversationRowName = {
  margin: 0,
  color: "#111827",
  fontSize: "16px",
  lineHeight: 1.18,
  fontWeight: "950",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const conversationRowMeta = {
  margin: "3px 0 0",
  color: "var(--meetro-color-wood, #b7791f)",
  fontSize: "12px",
  lineHeight: 1.25,
  fontWeight: "800",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const conversationRowRight = {
  display: "grid",
  justifyItems: "end",
  gap: "5px",
  flexShrink: 0,
  maxWidth: "42%",
};

const conversationUnreadBadge = {
  minWidth: "22px",
  height: "22px",
  padding: "0 7px",
  borderRadius: "999px",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "11px",
  fontWeight: "950",
};

const conversationRowBottom = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  minWidth: 0,
  maxWidth: "100%",
};

const conversationRowPreview = {
  margin: 0,
  color: "var(--meetro-color-muted, #5f6b63)",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: "700",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const conversationStatusChip = {
  borderRadius: "999px",
  background: "var(--meetro-surface-warm, rgba(251,246,237,0.92))",
  color: "var(--meetro-color-forest, #1f4d34)",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  padding: "6px 9px",
  fontSize: "11px",
  fontWeight: "900",
  whiteSpace: "nowrap",
  maxWidth: "45%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  flexShrink: 0,
};

const avatarImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const splitAvatarCircle = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  fontSize: "18px",
};

const unreadAvatar = {
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
};

const emergencyAvatar = {
  background: "#fee2e2",
  color: "#dc2626",
};

const timeText = {
  color: "var(--meetro-color-muted, #5f6b63)",
  fontSize: "12px",
  whiteSpace: "nowrap",
  fontWeight: "800",
};

const unreadStatusBadge = {
  background: "#ffedf2",
  color: "#ff3b5c",
};

const emergencyStatusBadge = {
  background: "rgba(239,68,68,0.12)",
  color: "#dc2626",
  border: "1px solid rgba(239,68,68,0.18)",
};

export default MessagesInbox;
