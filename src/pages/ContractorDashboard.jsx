import { useEffect, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import { jsPDF } from "jspdf";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";
import FloatingBackButton from "../components/FloatingBackButton";
import CanonicalJobEvaluation from "../components/CanonicalJobEvaluation";
import { t as translate } from "../utils/language";
import { formatDateTimeDisplay, formatScheduleTime as formatDisplayScheduleTime } from "../utils/displayTime";
import { formatLocaleCurrency, formatLocaleDate, formatLocaleNumber, getFormattingLocale } from "../utils/localeFormat";
import {
  CAMERA_PERMISSION_MESSAGE,
  createPhotoInputEvent,
  openJobPhotoPicker,
} from "../utils/cameraPhotoPicker";
import {
  getMediaDeferredCopy,
  getMediaDeferredNotice,
  guardFriendsAndFamilyMediaUpload,
  isFriendsAndFamilyMediaDeferred,
} from "../utils/mediaDeferral";
import { getNotifications } from "../utils/notifications";
import {
  getStoredProfessionalMatchProfile,
  inferRequestCategory,
} from "../utils/professionalRequestMatching";
import { canProfessionalSeeLocalLead } from "../utils/localLeadVisibility";
import {
  isRequestConnectedToProfessional,
  isRequestClosedForProfessionalProjection,
  isRequestProfessionalWork,
} from "../utils/professionalLifecycleProjection";
import { openActiveEmergencyConversation } from "../utils/emergencyLifecycle";
import {
  getActiveJobSnapshot,
  getActiveWorkSnapshot,
  saveActiveWorkSnapshot,
  saveActiveJobSnapshot,
  getJobRecord,
  saveJobRecord,
  saveSelectedActiveProject,
} from "../utils/workCenter";
import { markConversationUnreadForRecipient } from "../utils/conversationUnread";
import { getProjectIdentity } from "../utils/projectIdentity";
import { updateProjectLifecycleState } from "../utils/projectLifecycleSync";
import {
  appendProjectTimelineEvent,
  linkQuoteToProject,
  linkScheduleToProject,
} from "../utils/workflowCommands";
import {
  cancelAppointmentReminderNotifications,
  openNotificationSettings,
  scheduleAppointmentReminderNotifications,
} from "../utils/appointmentReminders";
import {
  getQuoteLinkIdentityWarnings,
  getQuoteLinkReconciliationReport,
  getScheduleLinkIdentityWarnings,
  getScheduleLinkReconciliationReport,
  getTimelineIdentityWarnings,
  getTimelineReconciliationReport,
} from "../utils/workCenterSelectors";
import {
  getContexts,
  getServiceTypes,
  resolveEvaluationTemplate,
} from "../utils/evaluationTemplateRegistry";
import {
  buildVisitEvaluationPayload,
  canScheduleWork,
  hasSavedEvaluation,
  hasPaymentOrDepositEvidence,
} from "../utils/evaluationWorkflowGates";
import { normalizeEvaluationFindingsPayload } from "../utils/findingsEngineRegistry";
import { evaluateWorkCenterClosureReadiness } from "../utils/completionClosureValidation";
import { setActiveAccountMode } from "../utils/session";
import { createWorkCenterJobListPresentation } from "../utils/workCenterJobListPresentation";
import { getEvaluationPanelMode } from "../utils/evaluationPanelMode";
import {
  getSupportingRecordActionStyleVariant,
  getSupportingRecordsDefaultOpen,
} from "../utils/supportingRecordsPresentation";
import { getWorkCenterPrimaryCtaLabel } from "../utils/workCenterCtaLabels";
import { getProfessionalWorkMetrics } from "../utils/dashboardMetrics";
import { readBusinessAvailability } from "../utils/businessAvailability";
import { canReadLegacyWorkflowStorage } from "../utils/clientWorkflowStoragePolicy";
import {
  canonicalEvaluationContentToForm,
  getCanonicalEvaluationSourceContext,
  parseCanonicalEvaluationRoute,
} from "../utils/canonicalEvaluation";
import {
  completeCanonicalEvaluationDraft,
  loadCanonicalEvaluationForRecord,
  saveCanonicalEvaluationDraft,
} from "../utils/evaluationAuthorityController";
import {
  fetchWorkCenterLifecycleProjection,
  getWorkCenterLifecycleProjectionTarget,
} from "../utils/workCenterLifecycleProjection";
import {
  fetchCanonicalWorkCenterEntries,
  isCanonicalWorkCenterEntry,
  mergeCanonicalWorkCenterEntries,
} from "../utils/workCenterCanonicalHydration";
import {
  appendWorkflowOverrideHistory,
  getPendingWorkflowDependencies,
  shouldWarnBeforeAction,
} from "../utils/workflowDependencyAlerts";
import {
  appendWorkflowDependencyHistoryEvent,
  buildWorkflowDependencyReportSection,
  createWorkflowDependencyIdentifiedEvent,
  getWorkflowDependencyHistory,
} from "../utils/workflowDependencyHistory";

function createBlankScheduleForm(overrides = {}) {
  return {
    contextSource: "manual",
    appointmentType: "walkthrough",
    title: "",
    manualCustomerName: "",
    manualCustomerPhone: "",
    manualCustomerEmail: "",
    manualCustomerAddress: "",
    requestId: "",
    conversationId: "",
    quoteId: "",
    relationshipId: "",
    customerAccountId: "",
    externalContactId: "",
    businessId: "",
    businessName: "",
    activeAccountMode: "",
    activeRole: "",
    isExternalCustomer: false,
    inviteLink: "",
    scheduleDedupeKey: "",
    services: [],
    date: new Date().toISOString().slice(0, 10),
    time: "12:00",
    location: "",
    notes: "",
    ...overrides,
  };
}

const MEETRO_PUBLIC_INVITE_LINK = "https://getmeetro.com";

export function getScheduleVisitLocation({
  customerAddress = "",
  overrideLocation = "",
  fallback = "",
} = {}) {
  const address = String(customerAddress || "").trim();
  const override = String(overrideLocation || "").trim();
  if (override && override.toLowerCase() !== address.toLowerCase()) return override;
  return address || override || fallback;
}

function createDefaultWorkAppointmentDraft() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return {
    date: date.toISOString().slice(0, 10),
    time: "09:00",
    notes: "",
    shareWithCustomer: true,
  };
}

function createDefaultPaymentDraft(total = "") {
  return {
    amount: total ? String(total) : "",
    paymentType: "deposit",
    method: "card",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  };
}

function createDefaultClosureDraft() {
  return {
    notes: "",
    confirmMoveToHistory: false,
  };
}

function createDefaultApprovalDraft() {
  return {
    note: "",
    confirmed: false,
  };
}

function getQuoteLaborAmount(quote = {}) {
  return Number(
    quote.laborAmount ??
      quote.pricingBreakdown?.laborAmount ??
      quote.labor ??
      0
  );
}

function getQuoteMaterialsAmount(quote = {}) {
  return Number(
    quote.materialsAmount ??
      quote.pricingBreakdown?.materialsAmount ??
      (typeof quote.materials === "number" || typeof quote.materials === "string"
        ? quote.materials
        : 0) ??
      0
  );
}

function getQuoteTotalAmount(quote = {}) {
  return Number(
    quote.totalAmount ??
      quote.quoteTotal ??
      quote.pricingBreakdown?.totalAmount ??
      quote.amount ??
      quote.total ??
      getQuoteLaborAmount(quote) + getQuoteMaterialsAmount(quote)
  );
}

function parseMeetroAmount(value) {
  const cleaned = String(value ?? "").replace(/[$,\s]/g, "").trim();
  if (!cleaned) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

function getMaterialLineTotal(material = {}) {
  const quantity = parseMeetroAmount(material.quantity);
  const unitPrice = parseMeetroAmount(material.unitPrice ?? material.unit);

  if (quantity === null || unitPrice === null) return null;
  return quantity * unitPrice;
}

function getEvaluationMaterialsTotal(workItems = []) {
  return workItems.reduce((total, workItem) => {
    const materials = Array.isArray(workItem.materials) ? workItem.materials : [];
    return (
      total +
      materials.reduce((materialTotal, material) => {
        const lineTotal = getMaterialLineTotal(material);
        return materialTotal + (lineTotal === null ? 0 : lineTotal);
      }, 0)
    );
  }, 0);
}

function readMeetroJson(key, fallback) {
  if (!canReadLegacyWorkflowStorage()) return fallback;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed ?? fallback;
  } catch (error) {
    console.warn("Work Center storage read failed.", {
      key,
      errorName: error?.name || "Error",
    });
    return fallback;
  }
}

function readMeetroArray(key) {
  const value = readMeetroJson(key, []);
  return Array.isArray(value) ? value : [];
}

function readMeetroObject(key) {
  const value = readMeetroJson(key, {});
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function ContractorDashboard({ setPage, language = "en" }) {
  const activeJobSnapshot = getActiveJobSnapshot();
  const activeWorkSnapshot = getActiveWorkSnapshot();
  const userRole = localStorage.getItem("businessCategory") || "Handyman";
  const [refreshKey, setRefreshKey] = useState(0);
  const [availableNow, setAvailableNow] = useState(readBusinessAvailability());
  const [activeTab, setActiveTab] = useState(
    localStorage.getItem("meetroWorkCenterTab") || "pending"
  );
  const [isWorkCenterSectionOpen, setIsWorkCenterSectionOpen] = useState(
    Boolean(localStorage.getItem("meetroWorkCenterTab"))
  );
  const [viewedOpportunityCount, setViewedOpportunityCount] = useState(() =>
    Number(localStorage.getItem("meetroViewedOpportunityCount") || "0")
  );
  const [selectedWorkCenterJob, setSelectedWorkCenterJob] = useState(null);
  const [selectedJobDetailView, setSelectedJobDetailView] = useState("");
  const [isEditingCompletedEvaluation, setIsEditingCompletedEvaluation] = useState(false);
  const [isJobHistoryMode, setIsJobHistoryMode] = useState(false);
  const [jobMenuTab, setJobMenuTab] = useState("current");
  const [jobActionToast, setJobActionToast] = useState(null);
  const [scheduleFilter, setScheduleFilter] = useState(
    localStorage.getItem("workCenterScheduleFilter") || ""
  );
  const [activeWorkFilter, setActiveWorkFilter] = useState("all");
  const dynamicSectionRef = useRef(null);
  const workCenterPanelRef = useRef(null);
  const jobScopedDetailRef = useRef(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [scheduleDeleteTarget, setScheduleDeleteTarget] = useState(null);
  const [appointmentReminderNotice, setAppointmentReminderNotice] = useState(null);
  const [pendingScheduleDelivery, setPendingScheduleDelivery] = useState(null);
  const canonicalEvaluationRouteRecordRef = useRef(
    parseCanonicalEvaluationRoute(
      typeof window === "undefined" ? "" : window.location.hash
    )
  );
  const [evaluationTarget, setEvaluationTarget] = useState(() =>
    canonicalEvaluationRouteRecordRef.current
      ? {
          ...canonicalEvaluationRouteRecordRef.current,
          type: "canonical_emergency_evaluation",
        }
      : null
  );
  const [evaluationForm, setEvaluationForm] = useState({
    serviceType: "",
    context: "",
    evaluationTemplate: null,
    templateRequirements: [],
	    photos: [],
	    findings: "",
	    findingRecords: [],
	    materialsNeeded: "",
    laborNotes: "",
    safetyNotes: "",
    photoNotes: "",
    notes: "",
    workItems: [],
    nextStep: "quote",
  });
  const [evaluationSaveNotice, setEvaluationSaveNotice] = useState("");
  const [evaluationSaveError, setEvaluationSaveError] = useState("");
  const [evaluationToast, setEvaluationToast] = useState(null);
  const [canonicalEvaluation, setCanonicalEvaluation] = useState(null);
  const [canonicalEvaluationLoading, setCanonicalEvaluationLoading] = useState(
    Boolean(canonicalEvaluationRouteRecordRef.current)
  );
  const canonicalEvaluationContextRef = useRef("");
  const [workCenterLifecycleProjection, setWorkCenterLifecycleProjection] =
    useState({
      status: "idle",
      reason: "",
      httpStatus: 0,
      postId: null,
      projection: null,
    });
  const workCenterLifecycleContextRef = useRef("");
  const [canonicalWorkCenterHydration, setCanonicalWorkCenterHydration] =
    useState({
      status: "loading",
      reason: "",
      entries: [],
    });
  const [visitOutcomeTarget, setVisitOutcomeTarget] = useState(null);
  const [quoteViewTarget, setQuoteViewTarget] = useState(null);
  const [jobReportTarget, setJobReportTarget] = useState(null);
  const [historyActionNotice, setHistoryActionNotice] = useState("");
  const [scheduleForm, setScheduleForm] = useState(() => createBlankScheduleForm());
  const [showWorkAppointmentForm, setShowWorkAppointmentForm] = useState(false);
  const [workAppointmentDraft, setWorkAppointmentDraft] = useState(() =>
    createDefaultWorkAppointmentDraft()
  );
  const [showApprovalConfirmFlow, setShowApprovalConfirmFlow] = useState(false);
  const [approvalDraft, setApprovalDraft] = useState(() =>
    createDefaultApprovalDraft()
  );
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState(() => createDefaultPaymentDraft());
  const [showCloseJobForm, setShowCloseJobForm] = useState(false);
  const [closureDraft, setClosureDraft] = useState(() => createDefaultClosureDraft());
  const [showProposalSendFlow, setShowProposalSendFlow] = useState(false);
  const [showReceiptSendFlow, setShowReceiptSendFlow] = useState(false);
  const [sendFlowDraft, setSendFlowDraft] = useState({
    method: "meetro_chat",
    note: "",
  });
  const [workflowDependencyPrompt, setWorkflowDependencyPrompt] = useState(null);
  const workflowDependencyDialogRef = useRef(null);
  const workflowDependencyReturnFocusRef = useRef(null);

  const [materialsDraft, setMaterialsDraft] = useState("");
  const [materialsAiSuggestion, setMaterialsAiSuggestion] = useState("");
  const [materialsCatalogMatches, setMaterialsCatalogMatches] = useState([]);
  const [materialsSearch, setMaterialsSearch] = useState("");
  const [materialDeleteTarget, setMaterialDeleteTarget] = useState(null);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [showManualMaterials, setShowManualMaterials] = useState(false);
  const [isListeningMaterials, setIsListeningMaterials] = useState(false);
  const [materialsMicError, setMaterialsMicError] = useState("");
  const [showMaterialsMicSettingsHelp, setShowMaterialsMicSettingsHelp] =
    useState(false);
  const [materialsInputMode, setMaterialsInputMode] = useState("type");
  const materialsRecognitionRef = useRef(null);

  const [materialForm, setMaterialForm] = useState({
    title: "",
    quantity: "1",
    provider: "customer",
    status: "needed",
  });
  const activeLanguage = language;
  const mediaUploadDeferred = isFriendsAndFamilyMediaDeferred();
  const mediaDeferredCopy = getMediaDeferredCopy(activeLanguage);
  const ui = (key) => translate(key, activeLanguage);
  const isPropertyManagementBusiness =
    String(userRole).toLowerCase().replace(/[\s_-]/g, "") ===
    "propertymanagement";
  const evaluationServiceTypeOptions = getServiceTypes({
    industry: "handyman",
    businessType: "handyman",
  });
  const evaluationContextOptions = getContexts({ industry: "handyman" });

  const selectedWorkCenterRequest = readMeetroJson(
    "selectedWorkCenterRequest",
    null
  );

  function getWorkflowDependencyJobRecord(source = {}) {
    return {
      ...source,
      id:
        source.id ||
        source.jobId ||
        source.projectId ||
        source.requestId ||
        source.scheduleId ||
        localStorage.getItem("activeWorkScheduleId") ||
        localStorage.getItem("selectedQuoteRequestId") ||
        "active-work",
      customerName:
        source.customerName ||
        source.customer ||
        source.homeownerName ||
        localStorage.getItem("activeConversationName") ||
        localStorage.getItem("completionCustomer") ||
        "Customer",
      conversationId:
        source.conversationId ||
        source.projectConversationId ||
        source.activeConversationId ||
        localStorage.getItem("activeWorkConversationId") ||
        localStorage.getItem("activeConversationId") ||
        "",
      workflowStage:
        source.workflowStage ||
        source.stage ||
        source.workflowStatus ||
        source.status ||
        localStorage.getItem("activeWorkStage") ||
        "",
      projectTimeline: Array.isArray(source.projectTimeline) ? source.projectTimeline : [],
    };
  }

  function getPrimaryWorkflowDependency(source = {}) {
    return getPendingWorkflowDependencies(getWorkflowDependencyJobRecord(source))[0] || null;
  }

  function getWorkflowDependencyActionLabel(action = "") {
    const labels = {
      schedule_visit: "Schedule Visit",
      record_evaluation: "Record Evaluation",
      create_proposal: "Create Proposal",
      mark_approved: "Mark Approved",
      record_payment: "Record Payment",
      schedule_work: "Schedule Work",
      on_the_way: "On The Way",
      arrived: "Arrived",
      start_work: "Start Work",
      perform_additional_work: "Perform Additional Work",
      complete_work: "Complete Work",
      finalize_invoice: "Finalize Invoice",
      send_final_invoice: "Send Final Invoice",
      create_receipt: "Create Receipt",
      close_job: "Close Job",
      move_to_history: "Move to History",
    };
    return (
      labels[action] ||
      String(action || "Continue")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    );
  }

  function recordWorkflowDependencyOverride(jobRecord = {}, dependency, action) {
    const nextRecord = appendWorkflowOverrideHistory(jobRecord, dependency, action);
    try {
      localStorage.setItem("lastWorkflowDependencyOverride", JSON.stringify(nextRecord.projectTimeline?.[0] || null));
      if (nextRecord.conversationId) {
        saveJobRecord(nextRecord.conversationId, nextRecord.projectTimeline || []);
      }
    } catch (error) {
      console.warn("Workflow dependency override history could not be recorded.", {
        errorName: error?.name || "Error",
      });
    }
  }

  function recordWorkflowDependencyHistoryEvent(jobRecord = {}, event = {}) {
    const eventKey = event?.id ? `workflowDependencyHistory:${event.id}` : "";
    if (eventKey && localStorage.getItem(eventKey) === "recorded") return;
    const nextRecord = appendWorkflowDependencyHistoryEvent(jobRecord, event);
    try {
      if (eventKey) localStorage.setItem(eventKey, "recorded");
      if (nextRecord.conversationId) {
        saveJobRecord(nextRecord.conversationId, nextRecord.projectTimeline || []);
      }
    } catch (error) {
      console.warn("Workflow dependency history could not be recorded.", {
        errorName: error?.name || "Error",
      });
    }
  }

  function requestWorkflowDependencyAdvance(source, action, continueAction) {
    const jobRecord = getWorkflowDependencyJobRecord(source);
    const warning = shouldWarnBeforeAction(jobRecord, action);
    if (!warning.shouldWarn) {
      continueAction?.();
      return;
    }

    workflowDependencyReturnFocusRef.current =
      typeof document !== "undefined" ? document.activeElement : null;
    recordWorkflowDependencyHistoryEvent(
      jobRecord,
      createWorkflowDependencyIdentifiedEvent(warning.dependency, action)
    );

    setWorkflowDependencyPrompt({
      jobRecord,
      action,
      dependency: warning.dependency,
      continueAction,
    });
  }

  function continueWorkflowDependencyPrompt() {
    if (!workflowDependencyPrompt) return;
    recordWorkflowDependencyOverride(
      workflowDependencyPrompt.jobRecord,
      workflowDependencyPrompt.dependency,
      workflowDependencyPrompt.action
    );
    const continueAction = workflowDependencyPrompt.continueAction;
    setWorkflowDependencyPrompt(null);
    continueAction?.();
  }

  function dismissWorkflowDependencyPrompt() {
    setWorkflowDependencyPrompt(null);
    setTimeout(() => {
      workflowDependencyReturnFocusRef.current?.focus?.();
    }, 0);
  }

  function sendWorkflowDependencyReminder() {
    const dependency = workflowDependencyPrompt?.dependency;
    if (!dependency?.conversationId) return;
    localStorage.setItem("activeConversationId", dependency.conversationId);
    localStorage.setItem("meetroConversationType", "standard");
    localStorage.setItem("conversationReturnPage", "contractorDashboard");
    setWorkflowDependencyPrompt(null);
    setPage("conversationThread");
  }

  useEffect(() => {
    const record = canonicalEvaluationRouteRecordRef.current;
    if (!record) return undefined;
    let active = true;

    loadCanonicalEvaluationForRecord({ record, setPage })
      .then((confirmed) => {
        if (!active) return;
        setCanonicalEvaluation(confirmed);
        if (confirmed) {
          setEvaluationForm((current) =>
            canonicalEvaluationContentToForm(confirmed, current) || current
          );
        }
      })
      .catch((error) => {
        if (!active) return;
        setEvaluationSaveError(
          error?.message || "The Evaluation could not be confirmed by the server."
        );
      })
      .finally(() => {
        if (active) setCanonicalEvaluationLoading(false);
      });

    return () => {
      active = false;
    };
  }, [setPage]);

  useEffect(() => {
    let active = true;

    void fetchCanonicalWorkCenterEntries({ setPage }).then((result) => {
      if (active) setCanonicalWorkCenterHydration(result);
    });

    return () => {
      active = false;
    };
  }, [setPage]);

  useEffect(() => {
    if (!selectedWorkCenterJob) {
      workCenterLifecycleContextRef.current = "";
      Promise.resolve().then(() => {
        if (workCenterLifecycleContextRef.current !== "") return;
        setWorkCenterLifecycleProjection({
          status: "idle",
          reason: "",
          httpStatus: 0,
          postId: null,
          projection: null,
        });
      });
      return undefined;
    }

    const target = getWorkCenterLifecycleProjectionTarget(selectedWorkCenterJob);
    const contextKey = `${selectedWorkCenterJob.id || ""}:${target.postId || ""}:${
      target.reason || "ready"
    }`;
    workCenterLifecycleContextRef.current = contextKey;

    if (!target.available) {
      Promise.resolve().then(() => {
        if (workCenterLifecycleContextRef.current !== contextKey) return;
        setWorkCenterLifecycleProjection({
          status: "unavailable",
          reason: target.reason,
          httpStatus: 0,
          postId: null,
          projection: null,
        });
      });
      return undefined;
    }

    let active = true;
    Promise.resolve().then(() => {
      if (!active || workCenterLifecycleContextRef.current !== contextKey) return;
      setWorkCenterLifecycleProjection({
        status: "loading",
        reason: "",
        httpStatus: 0,
        postId: target.postId,
        projection: null,
      });
    });

    void fetchWorkCenterLifecycleProjection({
      record: selectedWorkCenterJob,
      setPage,
    })
      .then((result) => {
        if (!active || workCenterLifecycleContextRef.current !== contextKey) return;
        setWorkCenterLifecycleProjection(result);
      })
      .catch(() => {
        if (!active || workCenterLifecycleContextRef.current !== contextKey) return;
        setWorkCenterLifecycleProjection({
          status: "error",
          reason: "NETWORK_ERROR",
          httpStatus: 0,
          postId: target.postId,
          projection: null,
        });
      });

    return () => {
      active = false;
    };
  }, [selectedWorkCenterJob, setPage]);

  useEffect(() => {
    if (!workflowDependencyPrompt?.dependency) return;
    workflowDependencyDialogRef.current?.focus?.();
  }, [workflowDependencyPrompt]);

  const leadWorkflowStage =
    localStorage.getItem("leadWorkflowStage") || "";

  const leadWorkflowIntent =
    localStorage.getItem("leadWorkflowIntent") || "";

  const hasScheduleRequestContext = Boolean(
    selectedWorkCenterRequest && (leadWorkflowStage || leadWorkflowIntent)
  );

  useEffect(() => {
    try {
      const rawPrefill = localStorage.getItem("meetroAssistantSchedulePrefill");
      if (!rawPrefill) return;

      const prefill = JSON.parse(rawPrefill);
      if (!prefill || typeof prefill !== "object") return;

      setActiveTab("schedule");
      setIsWorkCenterSectionOpen(true);
      setShowScheduleForm(true);
      setEditingScheduleId(null);
      setScheduleForm((current) => ({
        ...current,
        contextSource: prefill.contextSource || current.contextSource || "conversation",
        appointmentType: prefill.appointmentType || current.appointmentType || "walkthrough",
        title: prefill.title || current.title || "",
        manualCustomerName:
          prefill.customerName ||
          prefill.manualCustomerName ||
          current.manualCustomerName ||
          "",
        manualCustomerPhone:
          prefill.phone ||
          prefill.customerPhone ||
          prefill.manualCustomerPhone ||
          current.manualCustomerPhone ||
          "",
        manualCustomerEmail:
          prefill.email ||
          prefill.customerEmail ||
          prefill.manualCustomerEmail ||
          current.manualCustomerEmail ||
          "",
        manualCustomerAddress:
          prefill.address ||
          prefill.location ||
          prefill.manualCustomerAddress ||
          current.manualCustomerAddress ||
          "",
        date: prefill.date || current.date || new Date().toISOString().slice(0, 10),
        time: prefill.time || current.time || "12:00",
        location:
          prefill.visitLocationOverride ||
          prefill.overrideLocation ||
          current.location ||
          "",
        notes: prefill.notes || current.notes || "",
        requestId: prefill.requestId || current.requestId || "",
        conversationId: prefill.conversationId || current.conversationId || "",
        quoteId: prefill.quoteId || current.quoteId || "",
        services: Array.isArray(prefill.services)
          ? prefill.services.filter(Boolean)
          : current.services || [],
        relationshipId:
          prefill.relationshipId ||
          prefill.relationship_id ||
          current.relationshipId ||
          "",
        customerAccountId:
          prefill.customerAccountId ||
          prefill.customerId ||
          prefill.homeownerId ||
          current.customerAccountId ||
          "",
        externalContactId:
          prefill.externalContactId ||
          prefill.contactId ||
          current.externalContactId ||
          "",
        businessId:
          prefill.businessId ||
          prefill.business_id ||
          current.businessId ||
          "",
        businessName:
          prefill.businessName ||
          prefill.business_name ||
          current.businessName ||
          "",
        activeAccountMode:
          prefill.activeAccountMode ||
          prefill.activeMode ||
          current.activeAccountMode ||
          "",
        activeRole: prefill.activeRole || current.activeRole || "",
        isExternalCustomer: Boolean(
          prefill.isExternalCustomer || current.isExternalCustomer
        ),
        inviteLink:
          prefill.inviteLink ||
          prefill.meetroInviteLink ||
          current.inviteLink ||
          MEETRO_PUBLIC_INVITE_LINK,
        scheduleDedupeKey:
          prefill.scheduleDedupeKey ||
          current.scheduleDedupeKey ||
          "",
      }));
      localStorage.setItem("meetroWorkCenterTab", "schedule");
      localStorage.setItem("activeWorkCenterTab", "schedule");
      localStorage.removeItem("meetroAssistantSchedulePrefill");
    } catch {
      localStorage.removeItem("meetroAssistantSchedulePrefill");
    }
  }, []);

  useEffect(() => {
    const scheduleEditId = localStorage.getItem("meetroScheduleEditId");
    if (!scheduleEditId) return;
    if (!canReadLegacyWorkflowStorage()) {
      localStorage.removeItem("meetroScheduleEditId");
      return;
    }

    try {
      const schedule = JSON.parse(
        localStorage.getItem("meetro_business_schedule") || "[]"
      );
      const visit = Array.isArray(schedule)
        ? schedule.find(
            (item) =>
              String(item.id || item.scheduleId || item.visitId || "") ===
              String(scheduleEditId)
          )
        : null;

      if (visit) {
        setActiveTab("schedule");
        setIsWorkCenterSectionOpen(true);
        localStorage.setItem("meetroWorkCenterTab", "schedule");
        localStorage.setItem("activeWorkCenterTab", "schedule");
        startEditScheduleVisit(visit);
      }
    } catch (error) {
      console.warn("Could not open schedule edit handoff.", error);
    } finally {
      localStorage.removeItem("meetroScheduleEditId");
    }
  }, []);

  useEffect(() => {
    const syncAvailability = () => {
      setAvailableNow(readBusinessAvailability());
    };

    window.addEventListener("meetroAvailabilityChanged", syncAvailability);
    window.addEventListener("storage", syncAvailability);

    return () => {
      window.removeEventListener("meetroAvailabilityChanged", syncAvailability);
      window.removeEventListener("storage", syncAvailability);
    };
  }, []);

  useEffect(() => {
    window.addEventListener("meetroWorkCenterResetToLanding", resetWorkCenterToLanding);

    return () => {
      window.removeEventListener("meetroWorkCenterResetToLanding", resetWorkCenterToLanding);
    };
  }, []);

  useEffect(() => {
    const isEvaluationSurfaceOpen =
      Boolean(evaluationTarget) || selectedJobDetailView === "evaluation";

    document.body.classList.toggle(
      "meetro-evaluation-notes-open",
      isEvaluationSurfaceOpen
    );

    return () => {
      document.body.classList.remove("meetro-evaluation-notes-open");
    };
  }, [evaluationTarget, selectedJobDetailView]);

  useEffect(() => {
    const isDenseScheduleList =
      isWorkCenterSectionOpen &&
      activeTab === "schedule" &&
      !evaluationTarget;

    document.body.classList.toggle(
      "meetro-work-center-schedule-open",
      isDenseScheduleList
    );

    return () => {
      document.body.classList.remove("meetro-work-center-schedule-open");
    };
  }, [activeTab, evaluationTarget, isWorkCenterSectionOpen]);

  useEffect(() => {
    const returnScheduleId = localStorage.getItem(
      "quoteBuilderReturnEvaluationScheduleId"
    );
    if (!returnScheduleId) return;
    if (!canReadLegacyWorkflowStorage()) {
      localStorage.removeItem("quoteBuilderReturnEvaluationScheduleId");
      return;
    }

    try {
      const schedule = JSON.parse(
        localStorage.getItem("meetro_business_schedule") || "[]"
      );
      const visit = Array.isArray(schedule)
        ? schedule.find(
            (item) =>
              String(item.id || item.scheduleId || item.visitId || "") ===
              String(returnScheduleId)
          )
        : null;

      if (visit) {
        setActiveTab("schedule");
        setIsWorkCenterSectionOpen(true);
        localStorage.setItem("meetroWorkCenterTab", "schedule");
        localStorage.setItem("activeWorkCenterTab", "schedule");
        openVisitDetail(visit);
      }
    } catch (error) {
      console.warn("Could not return to Evaluation Notes.", error);
    } finally {
      localStorage.removeItem("quoteBuilderReturnEvaluationScheduleId");
    }
  }, []);

  useEffect(() => {
    if (!evaluationToast || evaluationToast.type !== "success") return;

    const timeoutId = window.setTimeout(() => {
      setEvaluationToast(null);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [evaluationToast]);

  useEffect(() => {
    if (!jobActionToast || jobActionToast.type !== "success") return;

    const timeoutId = window.setTimeout(() => {
      setJobActionToast(null);
    }, 2800);

    return () => window.clearTimeout(timeoutId);
  }, [jobActionToast]);

  useEffect(() => {
    if (!selectedWorkCenterJob) return;

    window.setTimeout(() => {
      const target = workCenterPanelRef.current;

      if (!target) return;

      const y = target.getBoundingClientRect().top + window.pageYOffset - 70;

      window.scrollTo({
        top: y,
        behavior: "smooth",
      });
    }, 80);
  }, [selectedWorkCenterJob]);

  useEffect(() => {
    function syncEmergency() {
      setRefreshKey((prev) => prev + 1);
    }

    window.addEventListener("meetroEmergencyConversationUpdated", syncEmergency);
    window.addEventListener("meetro-active-work-updated", syncEmergency);
    window.addEventListener("storage", syncEmergency);

    const createQuotePdfDocument = (quote) => {
    const businessName =
      quote.businessName ||
      localStorage.getItem("businessName") ||
      localStorage.getItem("companyName") ||
      "Meetro Professional";

    const quoteNumber =
      quote.quoteNumber ||
      quote.quote_number ||
      quote.quoteId ||
      "Quote";

    const today = quote.createdAt
      ? new Date(quote.createdAt).toLocaleDateString()
      : new Date().toLocaleDateString();

    const doc = new jsPDF();

    doc.setFillColor(32, 24, 95);
    doc.rect(0, 0, 210, 42, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text(businessName, 14, 18);

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text(translate("workCenterProfessionalEstimate", activeLanguage), 14, 28);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text(translate("quoteSummary", activeLanguage), 14, 56);

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`${translate("journeyQuote", activeLanguage)} #: ${quoteNumber}`, 145, 54);
    doc.text(`${translate("date", activeLanguage)}: ${today}`, 145, 61);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 68, 196, 68);

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(translate("project", activeLanguage), 14, 82);

    doc.setFont(undefined, "normal");
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(quote.projectTitle || "Project", 170), 14, 90);

    doc.setFont(undefined, "bold");
    doc.text(translate("wcCustomer", activeLanguage), 14, 108);
    doc.setFont(undefined, "normal");
    doc.text(doc.splitTextToSize(quote.homeownerName || quote.customer || "Customer", 170), 14, 116);

    doc.setFont(undefined, "bold");
    doc.text(translate("jobsHiringLocationPlaceholder", activeLanguage), 14, 134);
    doc.setFont(undefined, "normal");
    doc.text(doc.splitTextToSize(quote.location || "Location pending", 170), 14, 142);

    const tableTop = 174;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, tableTop - 10, 182, 48, 4, 4, "F");

    doc.setFont(undefined, "bold");
    doc.text(translate("workCenterPricing", activeLanguage), 20, tableTop);

    doc.setFont(undefined, "normal");
    doc.text(translate("workCenterLabor", activeLanguage), 20, tableTop + 12);
    doc.text(`$${getQuoteLaborAmount(quote).toFixed(2)}`, 165, tableTop + 12, { align: "right" });

    doc.text(translate("workTabMaterials", activeLanguage), 20, tableTop + 24);
    doc.text(`$${getQuoteMaterialsAmount(quote).toFixed(2)}`, 165, tableTop + 24, { align: "right" });

    doc.setDrawColor(203, 213, 225);
    doc.line(20, tableTop + 30, 190, tableTop + 30);

    doc.setFont(undefined, "bold");
    doc.text("Total", 20, tableTop + 40);
    doc.text(`$${getQuoteTotalAmount(quote).toFixed(2)}`, 165, tableTop + 40, { align: "right" });

    doc.setFont(undefined, "bold");
    doc.text(translate("estimatedTimeline", activeLanguage), 14, 232);
    doc.setFont(undefined, "normal");
    doc.text(quote.timeline || "—", 14, 240);

    doc.setFont(undefined, "bold");
    doc.text(translate("jobsHiringApplicantNotes", activeLanguage), 14, 254);
    doc.setFont(undefined, "normal");
    doc.text(doc.splitTextToSize(quote.notes || "—", 170), 14, 262);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Powered by Meetro Community", 105, 286, { align: "center" });

    return { doc, quoteNumber };
  };

  const shareQuotePdfFromHistory = async (quote) => {
    const { doc, quoteNumber } = createQuotePdfDocument(quote);

    const fileName = `${quoteNumber}-${quote.projectTitle || "quote"}.pdf`.replace(
      /[^a-z0-9-_\.]/gi,
      "_"
    );

    try {
      const pdfDataUri = doc.output("datauristring");
      const base64Data = pdfDataUri.split(",")[1];

      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title: `Quote - ${quote.projectTitle || "Project"}`,
        text:
          translate("workCenterAttachedIsTheProfessionalQuote", activeLanguage),
        url: savedFile.uri,
        dialogTitle:
          translate("workCenterShareQuote", activeLanguage),
      });
    } catch (error) {
      console.error("Native quote share failed:", error);
      doc.save(fileName);
    }
  };

  const printQuotePdfFromHistory = (quote) => {
    const { doc, quoteNumber } = createQuotePdfDocument(quote);
    doc.save(`${quoteNumber}-${quote.projectTitle || "quote"}.pdf`.replace(/[^a-z0-9-_\.]/gi, "_"));
  };


  return () => {
      window.removeEventListener(
        "meetroEmergencyConversationUpdated",
        syncEmergency
      );
      window.removeEventListener("meetro-active-work-updated", syncEmergency);
      window.removeEventListener("storage", syncEmergency);
    };
  }, []);

  const text = {
    en: {
      title: translate("workCenter"),
      subtitle: translate("workCenterSubtitle"),
      requests: "Incoming Requests",
      activeJobs: "Active Jobs",
      noRequests: "No new requests right now.",
      noActiveJob: "No emergency job status right now.",
      accept: "Accept Request",
      decline: "Decline",
      openDispatch: "Open Dispatch",
      back: "Back",
      activeNow: "Active Now",
      statusPending: "Waiting for professional",
      statusAccepted: translate("acceptedShort"),
      statusEnroute: "On the way",
      statusArrived: translate("arrivedShort"),
      statusStarted: translate("started"),
      statusCompleted: translate("completed"),
      statusCancelled: "Cancelled",
      service: "Service",
      homeowner: "Homeowner Waiting",
      location: "Cape Coral, FL",
      completedNote: translate("completedJobNote"),
      cancelledNote: translate("cancelledJobNote"),
    },
    es: {
      title: "Centro de Trabajo",
      subtitle: "Administra solicitudes, trabajos activos e historial.",
      requests: "Solicitudes Entrantes",
      activeJobs: "Trabajos Activos",
      noRequests: "No hay nuevas solicitudes.",
      noActiveJob: "No hay estado de trabajo de emergencia.",
      accept: "Aceptar Solicitud",
      decline: "Rechazar",
      openDispatch: "Abrir Despacho",
      back: "Regresar",
      activeNow: "Activo Ahora",
      statusPending: "Esperando profesional",
      statusAccepted: "Aceptado",
      statusEnroute: "En camino",
      statusArrived: "Llegó",
      statusStarted: "Trabajo en progreso",
      statusCompleted: translate("completed"),
      statusCancelled: "Cancelado",
      service: "Servicio",
      homeowner: "Propietario esperando",
      location: "Cape Coral, FL",
      completedNote: "Este trabajo de emergencia fue completado.",
      cancelledNote: "Esta solicitud de emergencia fue cancelada.",
    },
  };

  const t = text[language] || text.en;

  const materialsMicBlockedMessage =
    translate("workCenterMicrophoneAccessIsCurrentlyDisabled", activeLanguage);

  function showMaterialsMicrophonePermissionCard() {
    setIsListeningMaterials(false);
    setMaterialsInputMode("type");
    setMaterialsMicError(materialsMicBlockedMessage);
  }

  async function refreshMaterialsMicrophonePermission() {
    try {
      if (!navigator.permissions?.query) return;

      const permission = await navigator.permissions.query({
        name: "microphone",
      });

      if (permission?.state === "granted") {
        setMaterialsMicError("");
        setShowMaterialsMicSettingsHelp(false);
      }
    } catch {
      // Some iOS/WebKit surfaces do not expose microphone permission status.
    }
  }

  async function openMaterialsMicrophoneSettings() {
    setShowMaterialsMicSettingsHelp(true);

    try {
      const appPlugin = Capacitor?.Plugins?.App;

      if (
        Capacitor?.isNativePlatform?.() &&
        typeof appPlugin?.openSettings === "function"
      ) {
        await appPlugin.openSettings();
        return;
      }
    } catch {
      // Fall through to the inline iOS instructions below.
    }
  }

  useEffect(() => {
    const handlePermissionReturn = () => {
      if (document.visibilityState === "visible") {
        refreshMaterialsMicrophonePermission();
      }
    };

    window.addEventListener("focus", refreshMaterialsMicrophonePermission);
    document.addEventListener("visibilitychange", handlePermissionReturn);

    return () => {
      window.removeEventListener("focus", refreshMaterialsMicrophonePermission);
      document.removeEventListener("visibilitychange", handlePermissionReturn);
    };
  }, []);

  function toggleMaterialsMic() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showMaterialsMicrophonePermissionCard();
      return;
    }

    if (isListeningMaterials && materialsRecognitionRef.current) {
      materialsRecognitionRef.current.stop();
      setIsListeningMaterials(false);
      setMaterialsInputMode("type");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = getFormattingLocale(activeLanguage);
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListeningMaterials(true);
      setMaterialsInputMode("voice");
      setMaterialsMicError("");
      setShowMaterialsMicSettingsHelp(false);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");

      setMaterialsDraft((prev) =>
        prev ? `${prev}, ${transcript}` : transcript
      );
    };

    recognition.onerror = (event) => {
      const blockedErrors = [
        "not-allowed",
        "service-not-allowed",
        "permission-denied",
        "permission denied",
        "notallowederror",
      ];
      const errorName = String(event?.error || event?.name || "").toLowerCase();

      if (
        blockedErrors.some((blockedError) => errorName.includes(blockedError))
      ) {
        showMaterialsMicrophonePermissionCard();
        return;
      }

      showMaterialsMicrophonePermissionCard();
    };

    recognition.onend = () => {
      setIsListeningMaterials(false);
    };

    materialsRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      showMaterialsMicrophonePermissionCard();
    }
  }

  function getActiveWorkContext() {
    return {
      id:
        activeWorkSnapshot?.requestId ||
        localStorage.getItem("activeWorkRequestId") ||
        activeJobSnapshot?.jobId ||
        localStorage.getItem("activeJobId") ||
        activeWorkSnapshot?.quoteId ||
        localStorage.getItem("activeWorkQuoteId") ||
        activeWorkSnapshot?.conversationId ||
        localStorage.getItem("activeWorkConversationId") ||
        "",
      service:
        activeWorkSnapshot?.service ||
        localStorage.getItem("activeWorkService") ||
        activeJobSnapshot?.service ||
        localStorage.getItem("activeJobService") ||
        "",
      location:
        activeWorkSnapshot?.location ||
        localStorage.getItem("activeWorkLocation") ||
        activeJobSnapshot?.location ||
        localStorage.getItem("activeJobLocation") ||
        "",
      type:
        activeWorkSnapshot?.type ||
        localStorage.getItem("activeWorkType") ||
        activeWorkSnapshot?.source ||
        localStorage.getItem("activeWorkSource") ||
        "",
      stage:
        localStorage.getItem("activeWorkStage") ||
        activeWorkSnapshot?.status ||
        activeJobSnapshot?.status ||
        localStorage.getItem("activeJobStatus") ||
        "",
    };
  }

  function openWorkTab(tab) {
    setSelectedWorkCenterJob(null);
    localStorage.setItem("meetroWorkCenterTab", tab);
    localStorage.setItem("activeWorkCenterTab", tab);
    setActiveTab(tab);
    if (tab === "pending") {
      localStorage.setItem("meetroViewedOpportunityCount", String(opportunitiesCount));
      localStorage.setItem("meetroOpportunitiesViewedAt", new Date().toISOString());
      setViewedOpportunityCount(opportunitiesCount);
    }
    if (tab !== "schedule") {
      localStorage.removeItem("workCenterScheduleFilter");
      setScheduleFilter("");
    } else {
      setScheduleFilter(localStorage.getItem("workCenterScheduleFilter") || "");
    }
    setIsWorkCenterSectionOpen(true);

    window.setTimeout(() => {
      const target = dynamicSectionRef.current || workCenterPanelRef.current;

      if (!target) return;

      const y =
        target.getBoundingClientRect().top +
        window.pageYOffset -
        70;

      window.scrollTo({
        top: y,
        behavior: "smooth",
      });
    }, 120);
  }

  function openWorkCenterJobsPage(mode = "current") {
    setJobMenuTab(mode);
    setIsJobHistoryMode(false);
    setHistoryActionNotice("");
    openWorkTab(mode === "history" ? "jobHistory" : "currentJobs");
  }

  function openBusinessLeadOpportunityDetail(request = {}) {
    const requestId = request.requestId || request.id || "";

    localStorage.removeItem("lastCompletedProject");
    localStorage.removeItem("selectedHomeownerRequestId");
    localStorage.removeItem("selectedWorkCenterRequest");
    localStorage.removeItem("activeWorkCenterQuoteRequestId");
    localStorage.setItem("leadWorkflowStage", "project_review");
    localStorage.setItem("leadWorkflowIntent", "review_contact_schedule");
    localStorage.setItem("selectedPostId", requestId || "");
    localStorage.setItem("selectedQuoteRequest", JSON.stringify(request));
    localStorage.setItem("projectDetailsReturnPage", "businessLeads");
    localStorage.setItem("meetroViewedOpportunityCount", String(opportunitiesCount));
    localStorage.setItem("meetroOpportunitiesViewedAt", new Date().toISOString());
    setViewedOpportunityCount(opportunitiesCount);
    setPage("projectDetails");
  }

  function resetWorkCenterToLanding() {
    localStorage.removeItem("meetroWorkCenterTab");
    localStorage.removeItem("activeWorkCenterTab");
    localStorage.removeItem("workCenterScheduleFilter");
    localStorage.removeItem("conversationReturnSection");
    localStorage.removeItem("quoteStatusFilter");
    setSelectedWorkCenterJob(null);
    setSelectedJobDetailView("");
    setIsJobHistoryMode(false);
    setJobMenuTab("current");
    setHistoryActionNotice("");
    setScheduleFilter("");
    setShowScheduleForm(false);
    setEditingScheduleId(null);
    setScheduleDeleteTarget(null);
    setActiveTab("pending");
    setIsWorkCenterSectionOpen(false);
  }

  function getScheduleFilter() {
    return scheduleFilter || localStorage.getItem("workCenterScheduleFilter") || "";
  }

  const evaluationMeasurementUnits = [
    { value: "inches", label: translate("workCenterInches", activeLanguage) },
    { value: "feet", label: translate("workCenterFeet", activeLanguage) },
    { value: "feet_inches", label: translate("workCenterFeetInches", activeLanguage) },
    { value: "centimeters", label: translate("workCenterCentimeters", activeLanguage) },
    { value: "meters", label: translate("workCenterMeters", activeLanguage) },
    { value: "count", label: translate("workCenterCount", activeLanguage) },
    { value: "square_feet", label: translate("workCenterSquareFeet", activeLanguage) },
    { value: "linear_feet", label: translate("workCenterLinearFeet", activeLanguage) },
  ];

  function getEvaluationMeasurementUnitLabel(unit = "") {
    return (
      evaluationMeasurementUnits.find((option) => option.value === unit)?.label ||
      unit ||
      ""
    );
  }

  function normalizeEvaluationMeasurement(seed = {}) {
    const unit = seed.unit || "";

    return {
      id: seed.id || `measurement-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label: seed.label || "",
      value: unit === "feet_inches" ? "" : seed.value || "",
      unit,
      feet: seed.feet || "",
      inches: seed.inches || "",
      width: seed.width || "",
      height: seed.height || "",
      depth: seed.depth || "",
      quantity: seed.quantity || "",
      notes: seed.notes || "",
    };
  }

  function formatEvaluationMeasurement(measurement = {}) {
    const unitLabel = getEvaluationMeasurementUnitLabel(measurement.unit);
    const dimensionParts = [
      measurement.width ? `${translate("workCenterWidth", activeLanguage)} ${measurement.width}` : "",
      measurement.height ? `${translate("workCenterHeight", activeLanguage)} ${measurement.height}` : "",
      measurement.depth ? `${translate("workCenterDepth", activeLanguage)} ${measurement.depth}` : "",
    ].filter(Boolean);
    const measurementValue =
      measurement.unit === "feet_inches"
        ? [
            measurement.feet ? `${measurement.feet} ${translate("workCenterFt", activeLanguage)}` : "",
            measurement.inches ? `${measurement.inches} ${translate("workCenterIn", activeLanguage)}` : "",
          ]
            .filter(Boolean)
            .join(" ")
        : [measurement.value, unitLabel].filter(Boolean).join(" ");

    return [
      measurement.label,
      dimensionParts.length > 0
        ? `${dimensionParts.join(" × ")}${unitLabel ? ` ${unitLabel}` : ""}`
        : measurementValue,
      measurement.quantity ? `${translate("workCenterQty", activeLanguage)} ${measurement.quantity}` : "",
      measurement.notes,
    ]
      .filter(Boolean)
      .join(" ");
  }

  function isDimensionMeasurementUnit(unit = "") {
    return ["inches", "feet", "feet_inches", "centimeters", "meters"].includes(unit);
  }

  function autoResizeTextarea(event) {
    const textarea = event.currentTarget;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 156)}px`;
  }

  function createEvaluationWorkItem(seed = {}) {
    return {
      id: seed.id || `work-item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: seed.title || "",
      notes: seed.notes || "",
      safetyNotes: seed.safetyNotes || "",
      status: seed.status || "open",
      priority: seed.priority || "",
      photos: Array.isArray(seed.photos) ? seed.photos : [],
      measurements: Array.isArray(seed.measurements)
        ? seed.measurements.map((measurement) =>
            normalizeEvaluationMeasurement(measurement)
          )
        : [],
      materials: Array.isArray(seed.materials) ? seed.materials : [],
    };
  }

  function sanitizeEvaluationText(value = "") {
    return String(value || "").slice(0, 5000);
  }

  function sanitizeEvaluationPhoto(photo = {}) {
    return {
      id: sanitizeEvaluationText(photo.id),
      name: sanitizeEvaluationText(photo.name),
      addedAt: sanitizeEvaluationText(photo.addedAt),
      source: sanitizeEvaluationText(photo.source),
      workItemId: sanitizeEvaluationText(photo.workItemId),
      workItemTitle: sanitizeEvaluationText(photo.workItemTitle),
    };
  }

  function sanitizeEvaluationMaterial(material = {}) {
    const lineTotal = getMaterialLineTotal(material);
    return {
      id: sanitizeEvaluationText(material.id),
      name: sanitizeEvaluationText(material.name),
      quantity: sanitizeEvaluationText(material.quantity),
      unitPrice: sanitizeEvaluationText(material.unitPrice ?? material.unit),
      lineTotal,
      provider: sanitizeEvaluationText(material.provider),
      notes: sanitizeEvaluationText(material.notes),
    };
  }

  function sanitizeEvaluationMeasurement(measurement = {}) {
    return normalizeEvaluationMeasurement({
      id: sanitizeEvaluationText(measurement.id),
      label: sanitizeEvaluationText(measurement.label),
      value: sanitizeEvaluationText(measurement.value),
      unit: sanitizeEvaluationText(measurement.unit),
      feet: sanitizeEvaluationText(measurement.feet),
      inches: sanitizeEvaluationText(measurement.inches),
      width: sanitizeEvaluationText(measurement.width),
      height: sanitizeEvaluationText(measurement.height),
      depth: sanitizeEvaluationText(measurement.depth),
      quantity: sanitizeEvaluationText(measurement.quantity),
      notes: sanitizeEvaluationText(measurement.notes),
    });
  }

  function sanitizeEvaluationWorkItem(workItem = {}) {
    const normalized = createEvaluationWorkItem(workItem);

    return {
      id: sanitizeEvaluationText(normalized.id),
      title: sanitizeEvaluationText(normalized.title),
      notes: sanitizeEvaluationText(normalized.notes),
      safetyNotes: sanitizeEvaluationText(normalized.safetyNotes),
      status: sanitizeEvaluationText(normalized.status),
      priority: sanitizeEvaluationText(normalized.priority),
      photos: (normalized.photos || []).map(sanitizeEvaluationPhoto),
      measurements: (normalized.measurements || []).map(sanitizeEvaluationMeasurement),
      materials: (normalized.materials || []).map(sanitizeEvaluationMaterial),
    };
  }

  function getEvaluationFindingNotes(savedEvaluation = {}, fallback = "") {
    if (typeof savedEvaluation.findingsNotes === "string") {
      return savedEvaluation.findingsNotes;
    }
    if (typeof savedEvaluation.findingsText === "string") {
      return savedEvaluation.findingsText;
    }
    if (typeof savedEvaluation.findings === "string") {
      return savedEvaluation.findings;
    }
    return fallback || "";
  }

  function getEvaluationFindingSeeds(savedEvaluation = {}, record = {}) {
    if (Array.isArray(savedEvaluation.findings)) return savedEvaluation.findings;
    if (Array.isArray(savedEvaluation.findingRecords)) {
      return savedEvaluation.findingRecords;
    }
    if (Array.isArray(record.evaluationFindings)) return record.evaluationFindings;
    if (Array.isArray(record.findings)) return record.findings;
    return [];
  }

  function getEvaluationCustomerScope(record = {}) {
    return (
      record.customerId ||
      record.customerUid ||
      record.manualCustomerContactId ||
      record.relationshipId ||
      record.conversationId ||
      record.projectConversationId ||
      record.activeConversationId ||
      record.customerName ||
      record.homeownerName ||
      record.customer ||
      ""
    );
  }

  function buildStructuredEvaluationFindings({
    evaluationId,
    customerId,
    requestId,
    findings,
  }) {
    return normalizeEvaluationFindingsPayload({
      evaluationId,
      customerId,
      requestId,
      findings: Array.isArray(findings) ? findings : [],
    });
  }

  function getEvaluationSelectionSeed(record = {}) {
    const evaluation = record.evaluation || {};

    return {
      serviceType:
        evaluation.serviceType ||
        record.serviceType ||
        record.evaluationServiceType ||
        "",
      context:
        evaluation.context ||
        record.context ||
        record.evaluationContext ||
        "",
    };
  }

  function resolveEvaluationSelection(form = evaluationForm) {
    const resolution = resolveEvaluationTemplate({
      serviceType: form.serviceType,
      context: form.context,
    });

    return {
      serviceType: resolution.serviceType,
      context: resolution.context,
      evaluationTemplate: resolution.found ? resolution.evaluationTemplate : null,
      evaluationTemplateMatched: resolution.found,
      templateRequirements: resolution.found
        ? [...(resolution.template?.requirements || [])]
        : [],
    };
  }

  function hasEvaluationSelection(form = evaluationForm) {
    return Boolean(form.serviceType && form.context);
  }

  function getEvaluationTemplateRequirements(form = evaluationForm) {
    if (!hasEvaluationSelection(form)) return [];
    return resolveEvaluationSelection(form).templateRequirements;
  }

  function buildEvaluationSelectionFields() {
    const templateRequirements = getEvaluationTemplateRequirements();

    return (
      <div style={evaluationSelectionPanel}>
        <label style={evaluationFieldLabel}>
          {translate("serviceType", activeLanguage)}
        </label>
        <select
          style={evaluationSelect}
          value={evaluationForm.serviceType}
          onChange={(event) =>
            setEvaluationForm((current) => {
              const next = {
                ...current,
                serviceType: event.target.value,
              };
              return {
                ...next,
                evaluationTemplate: resolveEvaluationSelection(next).evaluationTemplate,
                templateRequirements:
                  resolveEvaluationSelection(next).templateRequirements,
              };
            })
          }
        >
          <option value="">
            {translate("workCenterSelectServiceType", activeLanguage)}
          </option>
          {evaluationServiceTypeOptions.map((serviceType) => (
            <option key={serviceType.id} value={serviceType.id}>
              {serviceType.label}
            </option>
          ))}
        </select>

        <label style={evaluationFieldLabel}>
          {translate("workCenterContext", activeLanguage)}
        </label>
        <select
          style={evaluationSelect}
          value={evaluationForm.context}
          onChange={(event) =>
            setEvaluationForm((current) => {
              const next = {
                ...current,
                context: event.target.value,
              };
              return {
                ...next,
                evaluationTemplate: resolveEvaluationSelection(next).evaluationTemplate,
                templateRequirements:
                  resolveEvaluationSelection(next).templateRequirements,
              };
            })
          }
        >
          <option value="">
            {translate("workCenterSelectContext", activeLanguage)}
          </option>
          {evaluationContextOptions.map((context) => (
            <option key={context.id} value={context.id}>
              {context.label}
            </option>
          ))}
        </select>

        {hasEvaluationSelection() && (
          <p style={evaluationSelectionHint}>
            {evaluationForm.evaluationTemplate
              ? translate("workCenterTemplateValue", activeLanguage, {
                  template: evaluationForm.evaluationTemplate,
                })
              : translate("workCenterNoExactTemplateMatchYouCanContinueWithEvaluationNotes", activeLanguage)}
          </p>
        )}

        {hasEvaluationSelection() && (
          <div style={evaluationRequirementPreview}>
            <strong>
              {templateRequirements.length > 0
                ? translate("workCenterRecommendedDocumentationForThisEvaluation", activeLanguage)
                : translate("workCenterNoSpecificTemplateFound", activeLanguage)}
            </strong>
            {templateRequirements.length > 0 ? (
              <ul style={evaluationRequirementList}>
                {templateRequirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            ) : (
              <p style={evaluationRequirementEmpty}>
                {translate("workCenterUseGeneralEvaluationNotes", activeLanguage)}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  function getEvaluationToastMessage(type, message) {
    return { type, message, id: `evaluation-toast-${Date.now()}` };
  }

  function showEvaluationSaveFeedback(type, message) {
    setEvaluationToast(getEvaluationToastMessage(type, message));

    if (type === "error") {
      setEvaluationSaveError(message);
      setEvaluationSaveNotice("");
      return;
    }

    setEvaluationSaveNotice(message);
    setEvaluationSaveError("");
  }

  function canonicalEvaluationErrorMessage(error) {
    if (error?.code === "STALE_EVALUATION_VERSION") {
      return "This Evaluation changed on another session. Reopen it to load the current version.";
    }
    if (error?.code === "EVALUATION_COMPLETED") {
      return "This Evaluation is completed and cannot be edited or reopened.";
    }
    return error?.message || "The Evaluation could not be confirmed by the server.";
  }

  function canonicalEvaluationContextKey(record) {
    const context = getCanonicalEvaluationSourceContext(record);
    if (!context) return "";
    return context.type === "ordinary_job"
      ? `${context.type}:${context.jobId}`
      : `${context.type}:${context.emergencyRequestId}`;
  }

  async function hydrateCanonicalEvaluation(record) {
    const contextKey = canonicalEvaluationContextKey(record);
    canonicalEvaluationContextRef.current = contextKey;
    setCanonicalEvaluationLoading(true);
    setCanonicalEvaluation(null);
    try {
      const confirmed = await loadCanonicalEvaluationForRecord({ record, setPage });
      if (canonicalEvaluationContextRef.current !== contextKey) return null;
      setCanonicalEvaluation(confirmed);
      if (confirmed) {
        setEvaluationForm((current) =>
          canonicalEvaluationContentToForm(confirmed, current) || current
        );
      }
      return confirmed;
    } catch (error) {
      if (canonicalEvaluationContextRef.current !== contextKey) return null;
      showEvaluationSaveFeedback("error", canonicalEvaluationErrorMessage(error));
      return null;
    } finally {
      if (canonicalEvaluationContextRef.current === contextKey) {
        setCanonicalEvaluationLoading(false);
      }
    }
  }

  async function persistCanonicalEvaluation(record, { complete = false } = {}) {
    const contextKey = canonicalEvaluationContextKey(record);
    canonicalEvaluationContextRef.current = contextKey;
    const currentContext = canonicalEvaluation?.aggregate?.sourceContext;
    const scopedCurrent =
      currentContext &&
      `${currentContext.type}:${currentContext.emergencyRequestId}` ===
        contextKey
        ? canonicalEvaluation
        : null;
    setCanonicalEvaluationLoading(true);
    setEvaluationSaveError("");
    setEvaluationSaveNotice("");
    try {
      const confirmed = complete
        ? await completeCanonicalEvaluationDraft({
            record,
            form: evaluationForm,
            currentEvaluation: scopedCurrent,
            setPage,
          })
        : await saveCanonicalEvaluationDraft({
            record,
            form: evaluationForm,
            currentEvaluation: scopedCurrent,
            setPage,
          });
      if (canonicalEvaluationContextRef.current !== contextKey) return confirmed;
      setCanonicalEvaluation(confirmed);
      showEvaluationSaveFeedback(
        "success",
        complete
          ? `Evaluation completed at server version ${confirmed.aggregate.version}.`
          : `Evaluation saved at server version ${confirmed.aggregate.version}.`
      );
      return confirmed;
    } catch (error) {
      if (canonicalEvaluationContextRef.current !== contextKey) return null;
      showEvaluationSaveFeedback("error", canonicalEvaluationErrorMessage(error));
      return null;
    } finally {
      if (canonicalEvaluationContextRef.current === contextKey) {
        setCanonicalEvaluationLoading(false);
      }
    }
  }

  function getVisitEvaluationWorkItems(item = {}) {
    const savedItems =
      item.evaluation?.workItems ||
      item.evaluationItems ||
      item.workItems ||
      [];

    if (Array.isArray(savedItems) && savedItems.length > 0) {
      return savedItems.map((workItem) => createEvaluationWorkItem(workItem));
    }

    if (
      item.evaluationNotes ||
      item.evaluationVisitNotes ||
      item.evaluationFindings ||
      item.evaluationMaterialsNeeded
    ) {
      return [
        createEvaluationWorkItem({
          title: item.requestTitle || item.title || "",
          notes: item.evaluationVisitNotes || item.evaluationNotes || "",
          safetyNotes: item.evaluationSafetyNotes || "",
          photos: Array.isArray(item.evaluationPhotos) ? item.evaluationPhotos : [],
          measurements: item.evaluationFindings
            ? [
                {
                  id: `measurement-${Date.now()}`,
                  label: translate("workCenterMeasurementsFindings", activeLanguage),
                  value: item.evaluationFindings,
                  unit: "count",
                  notes: "",
                },
              ]
            : [],
          materials: item.evaluationMaterialsNeeded
            ? [
                {
                  id: `material-${Date.now()}`,
                  name: item.evaluationMaterialsNeeded,
                  quantity: "",
                  unitPrice: "",
                  lineTotal: null,
                  provider: "",
                  notes: "",
                },
              ]
            : [],
        }),
      ];
    }

    return [createEvaluationWorkItem()];
  }

  function openVisitDetail(item) {
    setEvaluationTarget(item);
    setEvaluationSaveNotice("");
    setEvaluationSaveError("");
    const savedEvaluation = item.evaluation || {};
    const evaluationSelection = getEvaluationSelectionSeed(item);
    const evaluationTemplate = resolveEvaluationTemplate(evaluationSelection);
    setEvaluationForm({
      serviceType: evaluationSelection.serviceType,
      context: evaluationSelection.context,
      evaluationTemplate: evaluationTemplate.found
        ? evaluationTemplate.evaluationTemplate
        : null,
      templateRequirements: evaluationTemplate.found
        ? [...(evaluationTemplate.template?.requirements || [])]
        : [],
	      photos: Array.isArray(savedEvaluation.photos) ? savedEvaluation.photos : [],
	      findings: getEvaluationFindingNotes(
	        savedEvaluation,
	        typeof item.evaluationFindings === "string" ? item.evaluationFindings : ""
	      ),
	      findingRecords: getEvaluationFindingSeeds(savedEvaluation, item),
      materialsNeeded:
        savedEvaluation.materialsNeeded || item.evaluationMaterialsNeeded || "",
      laborNotes: savedEvaluation.laborNotes || item.evaluationLaborNotes || "",
      safetyNotes: savedEvaluation.safetyNotes || item.evaluationSafetyNotes || "",
      photoNotes: savedEvaluation.photoNotes || item.evaluationPhotoNotes || "",
      notes:
        savedEvaluation.visitNotes ||
        item.evaluationVisitNotes ||
        item.evaluationNotes ||
        "",
      workItems: getVisitEvaluationWorkItems(item),
      nextStep: savedEvaluation.recommendedNextStep || "quote",
    });
    if (!canReadLegacyWorkflowStorage()) {
      void hydrateCanonicalEvaluation(item);
    }
    setShowScheduleForm(false);
  }

  function buildEvaluationSummary(form = evaluationForm) {
    const workItemSections = (form.workItems || [])
      .filter((workItem) =>
        [
          workItem.title,
          workItem.notes,
          workItem.safetyNotes,
          ...(workItem.measurements || []).map((measurement) =>
            formatEvaluationMeasurement(measurement)
          ),
          ...(workItem.materials || []).map((material) =>
            [
              material.name,
              material.quantity,
              material.unitPrice ?? material.unit,
              getMaterialLineTotal(material) === null
                ? ""
                : `$${getMaterialLineTotal(material).toFixed(2)}`,
              material.provider,
              material.notes,
            ]
              .filter(Boolean)
              .join(" ")
          ),
        ].some((value) => String(value || "").trim())
      )
      .map((workItem, index) => {
        const lines = [
          `${translate("workCenterWorkItem", activeLanguage)} ${index + 1}: ${
            workItem.title || (translate("workCenterUntitled", activeLanguage))
          }`,
        ];

        if (workItem.notes) lines.push(`${translate("jobsHiringApplicantNotes", activeLanguage)}: ${workItem.notes}`);
        if (workItem.safetyNotes) lines.push(`${translate("workCenterSafety", activeLanguage)}: ${workItem.safetyNotes}`);
        if (Array.isArray(workItem.photos) && workItem.photos.length > 0) {
          lines.push(`${translate("photos", activeLanguage)}: ${workItem.photos.length}`);
        }
        if (Array.isArray(workItem.measurements) && workItem.measurements.length > 0) {
          lines.push(
            `${translate("workCenterMeasurements", activeLanguage)}: ${workItem.measurements
              .map((measurement) =>
                formatEvaluationMeasurement(measurement)
              )
              .filter(Boolean)
              .join("; ")}`
          );
        }
        if (Array.isArray(workItem.materials) && workItem.materials.length > 0) {
          lines.push(
            `${translate("workTabMaterials", activeLanguage)}: ${workItem.materials
              .map((material) =>
                [
                  material.name,
                  material.quantity
                    ? `${translate("workCenterQty", activeLanguage)} ${material.quantity}`
                    : "",
                  parseMeetroAmount(material.unitPrice) !== null
                    ? `${translate("workCenterUnitPrice", activeLanguage)} $${parseMeetroAmount(material.unitPrice).toFixed(2)}`
                    : "",
                  getMaterialLineTotal(material) === null
                    ? ""
                    : `${translate("workCenterLineTotal", activeLanguage)} $${getMaterialLineTotal(material).toFixed(2)}`,
                  material.provider,
                  material.notes,
                ]
                  .filter(Boolean)
                  .join(" ")
              )
              .filter(Boolean)
              .join("; ")}`
          );
        }

        return lines.join("\n");
      });

    const sections = [
      {
        label: translate("workCenterVisitNotes", activeLanguage),
        value: form.notes,
      },
      {
        label: translate("workCenterMeasurementsFindings", activeLanguage),
        value: form.findings,
      },
      {
        label: translate("workCenterMaterialsPricing", activeLanguage),
        value: form.materialsNeeded,
      },
      {
        label: translate("workCenterLaborNotes", activeLanguage),
        value: form.laborNotes,
      },
      {
        label: translate("tenantTicketFieldSafetyNotes", activeLanguage),
        value: form.safetyNotes,
      },
      {
        label: translate("photos", activeLanguage),
        value:
          form.photoNotes ||
          (Array.isArray(form.photos) && form.photos.length > 0
            ? `${form.photos.length} ${translate("workCenterPhotoSAdded", activeLanguage)}`
            : ""),
      },
    ];

    return sections
      .filter((section) => String(section.value || "").trim())
      .map((section) => `${section.label}: ${String(section.value).trim()}`)
      .concat(workItemSections)
      .join("\n\n");
  }

  function addEvaluationPhotos(event) {
    if (
      !guardFriendsAndFamilyMediaUpload({
        event,
        language: activeLanguage,
        onDeferred: setEvaluationSaveError,
      })
    ) {
      return;
    }

    const files = Array.from(event.target.files || []).slice(0, 8);
    if (files.length === 0) return;

    Promise.all(
      files.map(
        (file, index) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                id: `evaluation-photo-${Date.now()}-${index}`,
                name: file.name,
                dataUrl: reader.result,
                addedAt: new Date().toISOString(),
              });
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          })
      )
    ).then((photos) => {
      const nextPhotos = photos.filter(Boolean);
      if (nextPhotos.length === 0) return;
      setEvaluationForm((current) => ({
        ...current,
        photos: [...(current.photos || []), ...nextPhotos].slice(0, 12),
      }));
    });

    event.target.value = "";
  }

  function removeEvaluationPhoto(photoId) {
    setEvaluationForm((current) => ({
      ...current,
      photos: (current.photos || []).filter((photo) => photo.id !== photoId),
    }));
  }

  function updateEvaluationWorkItem(index, patch) {
    setEvaluationForm((current) => {
      const workItems = [...(current.workItems || [])];
      workItems[index] = {
        ...createEvaluationWorkItem(workItems[index] || {}),
        ...patch,
      };
      return { ...current, workItems };
    });
  }

  function addEvaluationWorkItem() {
    setEvaluationForm((current) => ({
      ...current,
      workItems: [...(current.workItems || []), createEvaluationWorkItem()],
    }));
  }

  function removeEvaluationWorkItem(index) {
    setEvaluationForm((current) => {
      const workItems = (current.workItems || []).filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        workItems: workItems.length > 0 ? workItems : [createEvaluationWorkItem()],
      };
    });
  }

  function addEvaluationWorkItemPhotos(index, event) {
    if (
      !guardFriendsAndFamilyMediaUpload({
        event,
        language: activeLanguage,
        onDeferred: setEvaluationSaveError,
      })
    ) {
      return;
    }

    const files = Array.from(event.target.files || []).slice(0, 8);
    if (files.length === 0) return;

    Promise.all(
      files.map(
        (file, fileIndex) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                id: `work-item-photo-${Date.now()}-${fileIndex}`,
                name: file.name,
                dataUrl: reader.result,
                addedAt: new Date().toISOString(),
              });
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          })
      )
    ).then((photos) => {
      const nextPhotos = photos.filter(Boolean);
      if (nextPhotos.length === 0) return;

      setEvaluationForm((current) => {
        const workItems = [...(current.workItems || [])];
        const currentItem = createEvaluationWorkItem(workItems[index] || {});
        workItems[index] = {
          ...currentItem,
          photos: [...(currentItem.photos || []), ...nextPhotos].slice(0, 12),
        };
        return { ...current, workItems };
      });
    });

    event.target.value = "";
  }

  async function openEvaluationWorkItemPhotoPicker(index) {
    setEvaluationSaveError("");

    if (mediaUploadDeferred) {
      setEvaluationSaveError(getMediaDeferredNotice(activeLanguage));
      return;
    }

    await openJobPhotoPicker({
      fileNamePrefix: "evaluation-photo",
      language: activeLanguage,
      onPhotos: (photos) =>
        addEvaluationWorkItemPhotos(
          index,
          createPhotoInputEvent(photos.map((photo) => photo.file))
        ),
      onError: (message) =>
        setEvaluationSaveError(message || CAMERA_PERMISSION_MESSAGE),
    });
  }

  function removeEvaluationWorkItemPhoto(itemIndex, photoId) {
    setEvaluationForm((current) => {
      const workItems = [...(current.workItems || [])];
      const currentItem = createEvaluationWorkItem(workItems[itemIndex] || {});
      workItems[itemIndex] = {
        ...currentItem,
        photos: (currentItem.photos || []).filter((photo) => photo.id !== photoId),
      };
      return { ...current, workItems };
    });
  }

  function updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, patch) {
    setEvaluationForm((current) => {
      const workItems = [...(current.workItems || [])];
      const currentItem = createEvaluationWorkItem(workItems[itemIndex] || {});
      const measurements = [...(currentItem.measurements || [])];
      measurements[measurementIndex] = {
        ...normalizeEvaluationMeasurement(measurements[measurementIndex] || {}),
        ...patch,
      };
      workItems[itemIndex] = { ...currentItem, measurements };
      return { ...current, workItems };
    });
  }

  function addEvaluationWorkItemMeasurement(itemIndex) {
    setEvaluationForm((current) => {
      const workItems = [...(current.workItems || [])];
      const currentItem = createEvaluationWorkItem(workItems[itemIndex] || {});
      workItems[itemIndex] = {
        ...currentItem,
        measurements: [
          ...(currentItem.measurements || []),
          {
            ...normalizeEvaluationMeasurement({
              id: `measurement-${Date.now()}`,
              unit: "inches",
            }),
          },
        ],
      };
      return { ...current, workItems };
    });
  }

  function removeEvaluationWorkItemMeasurement(itemIndex, measurementIndex) {
    setEvaluationForm((current) => {
      const workItems = [...(current.workItems || [])];
      const currentItem = createEvaluationWorkItem(workItems[itemIndex] || {});
      workItems[itemIndex] = {
        ...currentItem,
        measurements: (currentItem.measurements || []).filter(
          (_, index) => index !== measurementIndex
        ),
      };
      return { ...current, workItems };
    });
  }

  function updateEvaluationWorkItemMaterial(itemIndex, materialIndex, patch) {
    setEvaluationForm((current) => {
      const workItems = [...(current.workItems || [])];
      const currentItem = createEvaluationWorkItem(workItems[itemIndex] || {});
      const materials = [...(currentItem.materials || [])];
      const currentMaterial = materials[materialIndex] || {};
      materials[materialIndex] = {
        id: currentMaterial.id || `material-${Date.now()}`,
        name: "",
        quantity: "",
        unitPrice: "",
        lineTotal: null,
        provider: "",
        notes: "",
        ...currentMaterial,
        ...patch,
      };
      materials[materialIndex].lineTotal = getMaterialLineTotal(materials[materialIndex]);
      workItems[itemIndex] = { ...currentItem, materials };
      return { ...current, workItems };
    });
  }

  function addEvaluationWorkItemMaterial(itemIndex) {
    setEvaluationForm((current) => {
      const workItems = [...(current.workItems || [])];
      const currentItem = createEvaluationWorkItem(workItems[itemIndex] || {});
      workItems[itemIndex] = {
        ...currentItem,
        materials: [
          ...(currentItem.materials || []),
          {
            id: `material-${Date.now()}`,
            name: "",
            quantity: "",
            unitPrice: "",
            lineTotal: null,
            provider: "",
            notes: "",
          },
        ],
      };
      return { ...current, workItems };
    });
  }

  function removeEvaluationWorkItemMaterial(itemIndex, materialIndex) {
    setEvaluationForm((current) => {
      const workItems = [...(current.workItems || [])];
      const currentItem = createEvaluationWorkItem(workItems[itemIndex] || {});
      workItems[itemIndex] = {
        ...currentItem,
        materials: (currentItem.materials || []).filter(
          (_, index) => index !== materialIndex
        ),
      };
      return { ...current, workItems };
    });
  }

  function hasEvaluationNoteContent(form = evaluationForm) {
    return Boolean(
      buildEvaluationSummary(form).trim() ||
        (form.workItems || []).some((workItem) =>
          [
            workItem.title,
            workItem.notes,
            workItem.safetyNotes,
            ...(workItem.photos || []),
            ...(workItem.measurements || []).map((measurement) =>
              [measurement.label, measurement.value, measurement.unit, measurement.notes]
                .filter(Boolean)
                .join(" ")
            ),
            ...(workItem.materials || []).map((material) =>
              [material.name, material.quantity, material.unit, material.provider, material.notes]
                .filter(Boolean)
                .join(" ")
            ),
          ].some((value) => String(value || "").trim())
        )
    );
  }

  function getScheduleRecordKey(item = {}) {
    return (
      item.conversationId ||
      item.projectConversationId ||
      item.requestId ||
      "schedule"
    );
  }

  function hasEvaluationForAppointment(item = {}) {
    const scheduleId = String(item.id || item.scheduleId || "");
    if (!scheduleId) return false;

    if (hasSavedEvaluation(item)) return true;

    const records = getJobRecord(getScheduleRecordKey(item));
    return records.some((record) => {
      if (record?.type !== "evaluation") return false;
      return (
        String(record.visitId || record.appointmentId || record.scheduleId || "") === scheduleId &&
        Boolean(record.savedAt || record.updatedAt)
      );
    });
  }

  function hasQuoteForAppointment(item = {}) {
    return Boolean(getQuoteForAppointment(item));
  }

  function getQuoteForAppointment(item = {}) {
    const scheduleId = String(item.id || "");
    const requestId = String(item.requestId || "");
    const conversationId = String(item.conversationId || item.projectConversationId || "");

    return quoteHistory.find((quote) => {
      if (scheduleId && String(quote.scheduleId || "") === scheduleId) return true;
      if (
        requestId &&
        String(quote.requestId || quote.projectId || "") === requestId &&
        quote.source === "schedule_evaluation"
      ) {
        return true;
      }
      return (
        conversationId &&
        String(quote.conversationId || quote.projectConversationId || "") === conversationId &&
        quote.source === "schedule_evaluation"
      );
    }) || null;
  }

  function getJobWorkspaceCustomer(item = {}) {
    const customerValue =
      typeof item.customer === "string" ? item.customer : item.customer?.name;

    return (
      item.customerName ||
      item.homeownerName ||
      customerValue ||
      (translate("wcCustomer", activeLanguage))
    );
  }

  function getJobWorkspaceAddress(item = {}) {
    const customerAddress =
      typeof item.customer === "object" && item.customer !== null
        ? item.customer.address
        : "";

    return (
      item.customerAddress ||
      item.address ||
      item.location ||
      customerAddress ||
      (translate("workCenterAddressPending", activeLanguage))
    );
  }

  function getJobWorkspaceService(item = {}) {
    return (
      item.projectTitle ||
      item.requestTitle ||
      item.service ||
      item.title ||
      translate("scheduledVisit")
    );
  }

  function getJobWorkspaceStatus(item = {}) {
    const quote = getQuoteForAppointment(item);
    const quoteStatus = String(
      quote?.status || quote?.quoteStatus || quote?.workflowStatus || ""
    ).toLowerCase();
    const quotePaymentSatisfied = hasPaymentOrDepositEvidence(quote || {});
    const visitStatus = String(
      item.customerConfirmationStatus ||
        item.confirmationStatus ||
        item.status ||
        item.workflowStatus ||
        ""
    ).toLowerCase();

    if (
      item.appointmentType === "work_visit" ||
      item.workflowStage === "work_scheduled" ||
      visitStatus === "work_scheduled"
    ) {
      return translate("workScheduled", activeLanguage);
    }

    if (["completed", "work_completed"].includes(visitStatus)) {
      return translate("completed", activeLanguage);
    }

    if (
      ["approved", "accepted", "customer_accepted", "quote_approved"].includes(
        quoteStatus
      )
    ) {
      return translate("documentStatusApproved", activeLanguage);
    }

    if (quote) {
      return translate("workCenterProposalSent", activeLanguage);
    }

    if (hasEvaluationForAppointment(item)) {
      return translate("workCenterReadyForProposal", activeLanguage);
    }

    if (isSchedulePast(item)) {
      return translate("workCenterVisitCompleted", activeLanguage);
    }

    return translate("workCenterVisitScheduled", activeLanguage);
  }

  function getJobWorkspaceNextStep(item = {}) {
    const quote = getQuoteForAppointment(item);
    const quoteStatus = String(
      quote?.status || quote?.quoteStatus || quote?.workflowStatus || ""
    ).toLowerCase();

    if (
      item.appointmentType === "work_visit" ||
      item.workflowStage === "work_scheduled" ||
      String(item.status || "").toLowerCase() === "work_scheduled"
    ) {
      return translate("workCenterPerformTheWork", activeLanguage);
    }

    if (
      ["approved", "accepted", "customer_accepted", "quote_approved"].includes(
        quoteStatus
      ) &&
      quotePaymentSatisfied
    ) {
      return translate("workCenterScheduleWorkOrRequestADeposit", activeLanguage);
    }

    if (
      ["approved", "accepted", "customer_accepted", "quote_approved"].includes(
        quoteStatus
      )
    ) {
      return translate("workCenterRecordPaymentOrDepositBeforeSchedulingWork", activeLanguage);
    }

    if (quote) {
      return translate("workCenterAwaitCustomerApproval", activeLanguage);
    }

    if (hasEvaluationForAppointment(item)) {
      return translate("workCenterCreateACustomerProposal", activeLanguage);
    }

    if (isSchedulePast(item)) {
      return translate("workCenterCaptureNotesFromTheVisit", activeLanguage);
    }

    return translate("workCenterAttendTheScheduledVisit", activeLanguage);
  }

  function getJobWorkspacePrimaryAction(item = {}) {
    const quote = getQuoteForAppointment(item);
    const quoteStatus = String(
      quote?.status || quote?.quoteStatus || quote?.workflowStatus || ""
    ).toLowerCase();
    const quotePaymentSatisfied = hasPaymentOrDepositEvidence(quote || {});

    if (
      item.appointmentType === "work_visit" ||
      item.workflowStage === "work_scheduled" ||
      String(item.status || "").toLowerCase() === "work_scheduled"
    ) {
      return {
        label: translate("openActiveWorkAction", activeLanguage),
        onClick: () => {
          setEvaluationTarget(null);
          openWorkTab("active");
        },
      };
    }

    if (canScheduleWork({ quote: quote || {} })) {
      return {
        label: translate("workCenterScheduleWork", activeLanguage),
        onClick: () => {
          setEvaluationTarget(null);
          setShowScheduleForm(true);
          setScheduleForm(
            createBlankScheduleForm({
              title: getJobWorkspaceService(item),
              contextSource: "approved_quote_work",
              appointmentType: "work_visit",
              requestId: item.requestId || quote?.requestId || "",
              conversationId:
                item.conversationId ||
                item.projectConversationId ||
                quote?.conversationId ||
                quote?.projectConversationId ||
                "",
              quoteId: quote?.quoteId || quote?.id || "",
              services: Array.isArray(quote?.workItems)
                ? quote.workItems
                    .map((workItem) => workItem.title)
                    .filter(Boolean)
                : [getJobWorkspaceService(item)].filter(Boolean),
              manualCustomerName: getJobWorkspaceCustomer(item),
              manualCustomerPhone: item.customerPhone || item.phone || "",
              manualCustomerEmail: item.customerEmail || item.email || "",
              manualCustomerAddress: getJobWorkspaceAddress(item),
              location: getJobWorkspaceAddress(item),
              notes: translate("workCenterReturnVisitForApprovedWork", activeLanguage),
            })
          );
        },
      };
    }

    if (
      ["approved", "accepted", "customer_accepted", "quote_approved"].includes(
        quoteStatus
      )
    ) {
      return {
        label: translate("assistantActionViewQuote", activeLanguage),
        onClick: () => setQuoteViewTarget(quote),
      };
    }

    if (quote) {
      return {
        label: translate("assistantActionViewQuote", activeLanguage),
        onClick: () => setQuoteViewTarget(quote),
      };
    }

    if (hasEvaluationForAppointment(item)) {
      return {
        label: translate("assistantProjectBriefNextCreateProposal", activeLanguage),
        onClick: () => continueEvaluationToQuote(item),
      };
    }

    if (isSchedulePast(item)) {
      return {
        label: translate("workCenterAddVisitNotes", activeLanguage),
        onClick: () => {
          const notesSection = document.getElementById("job-evaluation-notes");
          if (notesSection) {
            notesSection.open = true;
            notesSection.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        },
      };
    }

    return {
      label: translate("workCenterEditVisit", activeLanguage),
      onClick: () => startEditScheduleVisit(item),
    };
  }

  function getQuoteServiceLines(quote = {}) {
    const workItems = Array.isArray(quote.workItems)
      ? quote.workItems
      : Array.isArray(quote.evaluationItems)
        ? quote.evaluationItems
        : [];
    const services = workItems
      .map((workItem) => workItem.title || workItem.name)
      .filter(Boolean);

    return services.length > 0
      ? services
      : [
          quote.projectTitle ||
            quote.project_title ||
            quote.title ||
            quote.service ||
            "",
        ].filter(Boolean);
  }

  function startScheduleWorkFromQuote(quote = {}) {
    const customerName =
      quote.homeownerName ||
      quote.customerName ||
      quote.customer?.name ||
      quote.homeowner_email ||
      quote.homeownerEmail ||
      "";
    const address =
      quote.address ||
      quote.location ||
      quote.customerAddress ||
      quote.customer?.address ||
      "";
    const serviceTitle =
      quote.projectTitle ||
      quote.project_title ||
      quote.title ||
      quote.service ||
      (translate("workCenterApprovedWork", activeLanguage));

    setEvaluationTarget(null);
    setShowScheduleForm(true);
    setEditingScheduleId(null);
    setScheduleForm(
      createBlankScheduleForm({
        contextSource: "approved_quote_work",
        appointmentType: "work_visit",
        title: serviceTitle,
        manualCustomerName: customerName,
        manualCustomerPhone: quote.customerPhone || quote.phone || "",
        manualCustomerEmail: quote.customerEmail || quote.email || "",
        manualCustomerAddress: address,
        location: address,
        requestId: quote.requestId || quote.projectId || quote.id || "",
        conversationId:
          quote.conversationId ||
          quote.projectConversationId ||
          quote.activeConversationId ||
          "",
        quoteId: quote.quoteId || quote.id || "",
        services: getQuoteServiceLines(quote),
        notes:
          translate("workCenterCustomerApprovedWorkShareTheScheduledWorkDateAndTime", activeLanguage),
      })
    );
    localStorage.setItem("meetroWorkCenterTab", "schedule");
    localStorage.setItem("activeWorkCenterTab", "schedule");
    openWorkTab("schedule");
  }

  function saveEvaluationRecord(item = evaluationTarget, options = {}) {
    if (!canReadLegacyWorkflowStorage()) {
      void persistCanonicalEvaluation(item);
      return null;
    }
    setEvaluationSaveNotice("");
    setEvaluationSaveError("");
    setEvaluationToast(null);

    const scheduleId = String(item?.id || item?.scheduleId || "");
    if (!item || !scheduleId) {
      const message =
        translate("workCenterVisitRecordIsMissingOpenTheVisitAgainAndTrySaving", activeLanguage);
      console.warn("Evaluation Notes save blocked: missing visit identity.", {
        hasItem: Boolean(item),
        scheduleId,
      });
      showEvaluationSaveFeedback("error", message);
      return null;
    }

    const normalizedWorkItems = Array.isArray(evaluationForm.workItems)
      ? evaluationForm.workItems.map(sanitizeEvaluationWorkItem)
      : [];

    const evaluationPhotos = Array.isArray(evaluationForm.photos)
      ? evaluationForm.photos.map(sanitizeEvaluationPhoto)
      : [];

    try {
      JSON.stringify({
        photos: evaluationPhotos,
        workItems: normalizedWorkItems,
      });
    } catch (error) {
      const message =
        translate("workCenterEvaluationNotesCouldNotBePreparedForSaving", activeLanguage);
      console.warn("Evaluation Notes save blocked: unserializable payload.", {
        scheduleId,
        error,
      });
      showEvaluationSaveFeedback("error", message);
      return null;
    }

    let schedule = [];
    try {
      schedule = JSON.parse(localStorage.getItem("meetro_business_schedule") || "[]");
    } catch (error) {
      const message =
        translate("workCenterSavedScheduleCouldNotBeRead", activeLanguage);
      console.warn("Evaluation Notes save blocked: schedule JSON parse failed.", {
        scheduleId,
        error,
      });
      showEvaluationSaveFeedback("error", message);
      return null;
    }

    if (!Array.isArray(schedule)) {
      const message =
        translate("workCenterSavedScheduleIsNotInAValidFormat", activeLanguage);
      console.warn("Evaluation Notes save blocked: schedule storage is not an array.", {
        scheduleId,
        scheduleType: typeof schedule,
      });
      showEvaluationSaveFeedback("error", message);
      return null;
    }

    const matchingVisit = schedule.find(
      (visit) => String(visit.id || visit.scheduleId || "") === scheduleId
    );

    if (!matchingVisit) {
      const message =
        translate("workCenterThisVisitWasNotFoundInTheSavedSchedule", activeLanguage);
      console.warn("Evaluation Notes save blocked: visit not found in schedule.", {
        scheduleId,
        availableVisitIds: schedule.map((visit) => visit.id || visit.scheduleId).filter(Boolean),
      });
      showEvaluationSaveFeedback("error", message);
      return null;
    }

    if (!hasEvaluationSelection()) {
      const message =
        translate("workCenterSelectServiceTypeAndContextBeforeSavingEvaluationNotes", activeLanguage);
      showEvaluationSaveFeedback("error", message);
      return null;
    }

    const selection = resolveEvaluationSelection(evaluationForm);
	    const conversationId =
	      getScheduleRecordKey({ ...matchingVisit, ...item });
	    const createdAt = new Date().toISOString();
	    const evaluationId =
	      item.evaluation?.id || matchingVisit.evaluation?.id || `evaluation-${scheduleId}`;
	    const customerId = getEvaluationCustomerScope({
	      ...matchingVisit,
	      ...item,
	      conversationId,
	    });
	    const requestId = item.requestId || matchingVisit.requestId || "";
	    const structuredFindings = buildStructuredEvaluationFindings({
	      evaluationId,
	      customerId,
	      requestId,
	      findings: evaluationForm.findingRecords,
	    });
	    const summary = buildEvaluationSummary({
      ...evaluationForm,
      photos: evaluationPhotos,
      workItems: normalizedWorkItems,
    });
    const evaluationRecord = buildVisitEvaluationPayload({
      schedule: matchingVisit,
      customerId,
      evaluation: {
	      id: evaluationId,
      type: "evaluation",
      source: "schedule",
      title: translate("workCenterEvaluationRecorded", activeLanguage),
      text: summary,
      notes: summary,
      serviceType: selection.serviceType,
      context: selection.context,
      evaluationTemplate: selection.evaluationTemplate,
      evaluationTemplateMatched: selection.evaluationTemplateMatched,
      templateRequirements: selection.templateRequirements,
      visitNotes: sanitizeEvaluationText(evaluationForm.notes),
      customerNeeds: sanitizeEvaluationText(evaluationForm.notes),
	      findings: structuredFindings.findings,
	      findingsNotes: sanitizeEvaluationText(evaluationForm.findings),
	      findingsText: sanitizeEvaluationText(evaluationForm.findings),
	      serviceRecommendations: structuredFindings.serviceRecommendations,
	      findingsNormalizationErrors: structuredFindings.errors,
      materialsNeeded: sanitizeEvaluationText(evaluationForm.materialsNeeded),
      laborNotes: sanitizeEvaluationText(evaluationForm.laborNotes),
      safetyNotes: sanitizeEvaluationText(evaluationForm.safetyNotes),
      photoNotes: sanitizeEvaluationText(evaluationForm.photoNotes),
      photos: evaluationPhotos,
      workItems: normalizedWorkItems,
      recommendedNextStep: sanitizeEvaluationText(evaluationForm.nextStep || "quote"),
      appointmentId: scheduleId,
      scheduleId,
      visitId: item.visitId || matchingVisit.visitId || scheduleId,
	      evaluationId,
	      customerId,
	      requestId,
      conversationId,
      customer: item.customerName || matchingVisit.customerName || item.homeownerName || "",
      jobService:
        item.requestTitle ||
        matchingVisit.requestTitle ||
        item.projectTitle ||
        matchingVisit.projectTitle ||
        item.title ||
        matchingVisit.title ||
        translate("scheduledVisit"),
      createdAt: matchingVisit.evaluation?.createdAt || createdAt,
      savedAt: createdAt,
      updatedAt: createdAt,
      },
    });

    let updatedVisit = null;
    const updatedSchedule = schedule.map((visit) => {
      if (String(visit.id || visit.scheduleId || "") !== scheduleId) return visit;

      updatedVisit = {
        ...visit,
        evaluation: evaluationRecord,
        serviceType: evaluationRecord.serviceType,
        context: evaluationRecord.context,
        evaluationTemplate: evaluationRecord.evaluationTemplate,
        evaluationTemplateMatched: evaluationRecord.evaluationTemplateMatched,
        templateRequirements: evaluationRecord.templateRequirements,
        evaluationServiceType: evaluationRecord.serviceType,
        evaluationContext: evaluationRecord.context,
        evaluationItems: evaluationRecord.workItems,
        workItems: evaluationRecord.workItems,
        evaluationNotes: summary,
        evaluationVisitNotes: evaluationRecord.visitNotes,
	        evaluationFindings: evaluationRecord.findingsNotes,
	        evaluationStructuredFindings: evaluationRecord.findings,
	        serviceRecommendations: evaluationRecord.serviceRecommendations,
        evaluationMaterialsNeeded: evaluationRecord.materialsNeeded,
        evaluationLaborNotes: evaluationRecord.laborNotes,
        evaluationSafetyNotes: evaluationRecord.safetyNotes,
        evaluationPhotoNotes: evaluationRecord.photoNotes,
        evaluationPhotos: evaluationRecord.photos,
        evaluationStatus: "saved",
        evaluationSavedAt: createdAt,
        nextAction: "create_quote",
        workflowStage: "evaluation_recorded",
        workflowStatus: "evaluation_recorded",
        updatedAt: createdAt,
      };

      return updatedVisit;
    });

    try {
      localStorage.setItem(
        "meetro_business_schedule",
        JSON.stringify(updatedSchedule)
      );
      if (options.keepOpen && updatedVisit) setEvaluationTarget(updatedVisit);
      if (!options.silent) {
        showEvaluationSaveFeedback(
          "success",
          translate("workCenterEvaluationNotesSaved", activeLanguage)
        );
      }
      window.dispatchEvent(new Event("storage"));
    } catch (error) {
      const message =
        translate("workCenterEvaluationNotesCouldNotBeSaved", activeLanguage);
      console.warn("Evaluation Notes save failed: schedule write failed.", {
        scheduleId,
        errorName: error?.name || "Error",
        message: error?.message || "",
      });
      showEvaluationSaveFeedback("error", message);
      return null;
    }

    try {
      const existingRecords = getJobRecord(conversationId);
      saveJobRecord(conversationId, [evaluationRecord, ...existingRecords]);
      localStorage.setItem("lastSavedJobRecord", JSON.stringify(evaluationRecord));
    } catch (error) {
      console.warn("Evaluation Notes saved, but job record mirror failed.", {
        scheduleId,
        conversationId,
        errorName: error?.name || "Error",
        message: error?.message || "",
      });
    }

    window.dispatchEvent(new Event("meetroJobRecordUpdated"));

    if (!options.keepOpen) {
      setEvaluationTarget(null);
    }

    setRefreshKey((prev) => prev + 1);
    return evaluationRecord;
  }

  function continueEvaluationToQuote(item = evaluationTarget) {
    setEvaluationSaveNotice("");
    setEvaluationSaveError("");

    const scheduleId = String(item?.id || item?.scheduleId || "");
    if (!item || !scheduleId) {
      showEvaluationSaveFeedback(
        "error",
        translate("workCenterVisitRecordIsMissingOpenTheVisitAgainAndTryCreatingA", activeLanguage)
      );
      return;
    }

    const currentWorkItems = Array.isArray(evaluationForm.workItems)
      ? evaluationForm.workItems
      : [];
    if (currentWorkItems.length === 0) {
      showEvaluationSaveFeedback(
        "error",
        translate("workCenterAddAtLeastOneWorkItemBeforeCreatingAQuote", activeLanguage)
      );
      return;
    }

    if (!hasEvaluationNoteContent()) {
      showEvaluationSaveFeedback(
        "error",
        translate("workCenterAddNotesPhotosMeasurementsOrMaterialsBeforeCreatingAQuote", activeLanguage)
      );
      return;
    }

    const evaluationRecord = saveEvaluationRecord(item, { keepOpen: true, silent: true });
    if (!evaluationRecord) return;
    const evaluationSummary = evaluationRecord?.notes || buildEvaluationSummary();
    const normalizedWorkItems = Array.isArray(evaluationRecord.workItems)
      ? evaluationRecord.workItems
      : [];
    const quoteWorkItems = currentWorkItems.map((workItem) => {
      const normalized = createEvaluationWorkItem(workItem);
      return {
        ...normalized,
        materials: (normalized.materials || []).map((material) => ({
          ...material,
          unitPrice: material.unitPrice ?? material.unit ?? "",
          lineTotal: getMaterialLineTotal(material),
        })),
      };
    });
    const materialsTotal = getEvaluationMaterialsTotal(quoteWorkItems);
    const materialItems = quoteWorkItems.flatMap((workItem) =>
      (workItem.materials || []).map((material) => ({
        ...material,
        workItemId: workItem.id || "",
        workItemTitle: workItem.title || "",
        unitPrice: material.unitPrice ?? material.unit ?? "",
        lineTotal: getMaterialLineTotal(material),
      }))
    );
    const workItemPhotos = quoteWorkItems.flatMap((workItem) =>
      (workItem.photos || []).map((photo) => ({
        id: photo.id || "",
        name: photo.name || "",
        addedAt: photo.addedAt || "",
        dataUrl: photo.dataUrl || "",
        source: "evaluation_work_item",
        workItemId: workItem.id || "",
        workItemTitle: workItem.title || "",
      }))
    );

    const quoteRequest = {
      id: item.requestId || item.id || "",
      requestId: item.requestId || item.id || "",
      scheduleId,
      visitId: item.visitId || scheduleId,
      evaluationId: evaluationRecord.id || "",
      visitDate: item.date || "",
      visitTime: item.time || "",
      conversationId: item.conversationId || item.projectConversationId || "",
      projectConversationId: item.projectConversationId || item.conversationId || "",
      title: item.requestTitle || item.projectTitle || item.title || "",
      service: item.requestTitle || item.projectTitle || item.title || "",
      description: evaluationSummary || item.notes || "",
      project_description: evaluationSummary || item.notes || "",
      scope: evaluationSummary || item.notes || "",
      location: item.location || "",
      address: item.customerAddress || item.address || item.location || "",
      homeownerName: item.customerName || item.homeownerName || item.customer || "",
      customerName: item.customerName || item.homeownerName || item.customer || "",
      customer: {
        name: item.customerName || item.homeownerName || item.customer || "",
        phone: item.customerPhone || item.phone || "",
        email: item.customerEmail || item.email || "",
        address: item.customerAddress || item.address || item.location || "",
        isMeetroUser: item.isMeetroUser,
        source: item.source || item.customerSource || "",
      },
      customerPhone: item.customerPhone || "",
      customerEmail: item.customerEmail || "",
      customerAddress: item.customerAddress || item.location || "",
      manualCustomerContactId: item.manualCustomerContactId || "",
      isMeetroUser: item.isMeetroUser,
      evaluationNotes: evaluationSummary,
      evaluation: evaluationRecord,
      serviceType: evaluationRecord.serviceType,
      context: evaluationRecord.context,
      evaluationTemplate: evaluationRecord.evaluationTemplate,
      templateRequirements: evaluationRecord.templateRequirements,
      customerNeeds: evaluationForm.notes || "",
      visitNotes: evaluationForm.notes || "",
      findings: evaluationForm.findings || "",
      materialsNeeded: evaluationForm.materialsNeeded || "",
      laborNotes: evaluationForm.laborNotes || "",
      safetyNotes: evaluationForm.safetyNotes || "",
      photoNotes: evaluationForm.photoNotes || "",
      evaluationPhotos: workItemPhotos,
      photosMetadata: [
        ...(Array.isArray(evaluationRecord.photos) ? evaluationRecord.photos : []).map(
          (photo) => ({
            id: photo.id || "",
            name: photo.name || "",
            addedAt: photo.addedAt || "",
            source: "evaluation",
          })
        ),
        ...workItemPhotos,
      ],
      evaluationItems: quoteWorkItems,
      workItems: quoteWorkItems,
      materialItems,
      materialsTotal,
      calculatedMaterialsTotal: materialsTotal,
      measurements: quoteWorkItems.flatMap((workItem) =>
        (workItem.measurements || []).map((measurement) => ({
          ...measurement,
          workItemId: workItem.id || "",
          workItemTitle: workItem.title || "",
        }))
      ),
      materials: materialItems,
      addPricingRequired: true,
      source: "schedule_evaluation",
    };

    try {
      localStorage.setItem("selectedQuoteRequest", JSON.stringify(quoteRequest));
      if (quoteRequest.requestId || quoteRequest.id || quoteRequest.scheduleId) {
        localStorage.setItem(
          "selectedQuoteRequestId",
          String(quoteRequest.requestId || quoteRequest.id || quoteRequest.scheduleId)
        );
      } else {
        localStorage.removeItem("selectedQuoteRequestId");
      }
      localStorage.setItem("quoteBuilderReturnPage", "workCenter");
      localStorage.setItem("meetroWorkCenterTab", "quotes");
      localStorage.setItem("activeWorkCenterTab", "quotes");
      localStorage.setItem("quoteBuilderSource", "schedule_evaluation");
      localStorage.setItem("quoteBuilderScheduleId", scheduleId);
      showEvaluationSaveFeedback(
        "success",
        translate("workCenterNotesSavedOpeningQuoteBuilder", activeLanguage)
      );
      if (typeof setPage !== "function") {
        throw new Error("Quote Builder navigation is unavailable.");
      }
      setEvaluationTarget(null);
      setPage("quoteBuilder");
    } catch (error) {
      console.warn("Could not open Quote Builder after saving notes.", error);
      showEvaluationSaveFeedback(
        "error",
        translate("workCenterNotesSavedButQuoteBuilderDidNotOpen", activeLanguage)
      );
    }
  }

  function openWorkCenterConversationAction() {
    const activeContext = getActiveWorkContext();
    const conversationId =
      activeContext.conversationId ||
      localStorage.getItem("activeConversationId") ||
      localStorage.getItem("selectedQuoteRequestId") ||
      "";

    setWorkCenterReturn();

    if (conversationId) {
      localStorage.setItem("activeConversationId", String(conversationId));
      localStorage.setItem("selectedQuoteRequestId", String(conversationId));
      localStorage.setItem("conversationReturnPage", "contractorDashboard");
      localStorage.setItem("meetroConversationType", "standard");
      setPage("conversationThread");
      return;
    }

    setPage("messagesInbox");
  }

  function getOpenedSectionActions() {
    if (activeTab === "pending") {
      return [
        {
          label: translate("openConversation"),
          onClick: openWorkCenterConversationAction,
        },
        {
          label: translate("scheduleEvaluation"),
          onClick: () => {
            setShowScheduleForm(true);
            openWorkTab("schedule");
          },
        },
      ];
    }

    if (activeTab === "schedule") {
      return [];
    }

    if (activeTab === "quotes") {
      return [
        {
          label: translate("openQuotesAction"),
          onClick: () => openWorkTab("quotes"),
        },
      ];
    }

    if (activeTab === "active" || activeTab === "materials") {
      return [
        {
          label: translate("openActiveWorkAction"),
          onClick: () => openWorkTab("active"),
        },
      ];
    }

    if (activeTab === "completed") {
      return [];
    }

    if (activeTab === "records") {
      return [
        {
          label: translate("openHistoryAction"),
          onClick: () => openWorkTab("records"),
        },
      ];
    }

    if (activeTab === "revenue") {
      return [];
    }

    return [];
  }

  function returnToWorkCenterDashboard() {
    setSelectedWorkCenterJob(null);
    setIsWorkCenterSectionOpen(false);

    window.setTimeout(() => {
      const target = workCenterPanelRef.current;

      if (!target) return;

      const y =
        target.getBoundingClientRect().top +
        window.pageYOffset -
        70;

      window.scrollTo({
        top: y,
        behavior: "smooth",
      });
    }, 80);
  }

  function getActiveMaterialsKey() {
    const activeProjectId =
      activeWorkSnapshot?.requestId ||
      localStorage.getItem("activeWorkRequestId") ||
      activeJobSnapshot?.jobId ||
      localStorage.getItem("activeJobId") ||
      activeWorkSnapshot?.quoteId ||
      localStorage.getItem("activeWorkQuoteId") ||
      activeWorkSnapshot?.conversationId ||
      localStorage.getItem("activeWorkConversationId") ||
      "general";

    return `meetro_work_materials_${activeProjectId}`;
  }

  function getActiveProjectMaterials() {
    const projectMaterials = JSON.parse(
      localStorage.getItem(getActiveMaterialsKey()) || "[]"
    );

    if (projectMaterials.length > 0) return projectMaterials;

    return JSON.parse(localStorage.getItem(getActiveMaterialsKey()) || "[]");
  }

  function saveActiveProjectMaterials(materials) {
    localStorage.setItem(getActiveMaterialsKey(), JSON.stringify(materials));
  }

  function generateMaterialsSuggestion() {
    const description = materialsDraft.trim();

    if (!description) {
      setMaterialsCatalogMatches([]);
      setMaterialsAiSuggestion(
        translate("workCenterDescribeTheMissingMaterialsOrUseYourPhoneMicrophoneToDictateThem", activeLanguage)
      );
      return;
    }

    const country = localStorage.getItem("meetroCountry") || "US";

    const materialsCatalog = [
      {
        id: "us-pex-elbow-12",
        title: "1/2 in. PEX Elbow",
        category: "plumbing",
        country: "US",
        estimatedPrice: "2.49",
        supplier: "Home Depot / Lowe's",
        keywords: ["pex", "elbow", "fitting", "plumbing"],
      },
      {
        id: "us-braided-supply-line",
        title: "Braided Faucet Supply Line",
        category: "plumbing",
        country: "US",
        estimatedPrice: "7.98",
        supplier: "Home Depot / Lowe's",
        keywords: ["supply line", "faucet", "sink", "vanity", "water line"],
      },
      {
        id: "us-p-trap-kit",
        title: "Bathroom Sink P-Trap Kit",
        category: "plumbing",
        country: "US",
        estimatedPrice: "12.98",
        supplier: "Home Depot / Lowe's",
        keywords: ["p trap", "ptrap", "drain", "sink", "bathroom"],
      },
      {
        id: "us-silicone-clear",
        title: "Clear Kitchen & Bath Silicone",
        category: "sealant",
        country: "US",
        estimatedPrice: "8.98",
        supplier: "Home Depot / Lowe's",
        keywords: ["silicone", "caulk", "sealant", "bathroom", "sink"],
      },
      {
        id: "us-shutoff-valve-12",
        title: "1/2 in. Angle Shut-Off Valve",
        category: "plumbing",
        country: "US",
        estimatedPrice: "9.98",
        supplier: "Home Depot / Lowe's",
        keywords: ["shutoff", "valve", "angle stop", "water valve", "sink"],
      },
      {
        id: "us-drywall-compound",
        title: "All-Purpose Joint Compound",
        category: "drywall",
        country: "US",
        estimatedPrice: "15.98",
        supplier: "Home Depot / Lowe's",
        keywords: ["drywall", "compound", "mud", "patch", "repair"],
      },
    ];

    const searchWords = description.toLowerCase().split(/\s+|,|\n/).filter(Boolean);

    const matchedCatalogItems = materialsCatalog.filter((item) => {
      if (item.country !== country && item.country !== "US") return false;

      const searchable = [
        item.title,
        item.category,
        item.supplier,
        ...(item.keywords || []),
      ]
        .join(" ")
        .toLowerCase();

      return searchWords.some((word) => searchable.includes(word));
    });

    const rawItems = description
      .split(/,|\n|\band\b|\by\b/i)
      .map((item) => item.trim())
      .filter(Boolean);

    const fallbackItems = rawItems.map((item) => ({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: item,
      category: "custom",
      country,
      estimatedPrice: "",
      supplier: translate("workCenterNotConfirmed", activeLanguage),
      keywords: [item],
      customItem: true,
    }));

    const suggestions = matchedCatalogItems.length
      ? matchedCatalogItems
      : fallbackItems;

    setMaterialsCatalogMatches(suggestions);

    setMaterialsAiSuggestion(
      matchedCatalogItems.length
        ? translate("workCenterCatalogMaterialsFound", activeLanguage, {
            count: matchedCatalogItems.length,
          })
        : translate("workCenterNoExactCatalogMatchFoundCustomReviewItemsWerePrepared", activeLanguage)
    );
  }

  function addCatalogMaterialToProject(material) {
    const currentMaterials = JSON.parse(
      localStorage.getItem(getActiveMaterialsKey()) || "[]"
    );

    const newMaterial = {
      id: `material-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: material.title,
      quantity: "1",
      provider: "business",
      status: "needed",
      catalogId: material.id,
      category: material.category || "",
      country: material.country || localStorage.getItem("meetroCountry") || "US",
      estimatedPrice: material.estimatedPrice || "",
      supplier: material.supplier || "",
      fromCatalog: !material.customItem,
      aiGenerated: true,
      jobService: activeWorkSnapshot?.service || localStorage.getItem("activeWorkService") || "",
      jobLocation: activeWorkSnapshot?.location || localStorage.getItem("activeWorkLocation") || "",
      activeWorkRequestId: activeWorkSnapshot?.requestId || localStorage.getItem("activeWorkRequestId") || "",
      activeWorkQuoteId: activeWorkSnapshot?.quoteId || localStorage.getItem("activeWorkQuoteId") || "",
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      getActiveMaterialsKey(),
      JSON.stringify([newMaterial, ...currentMaterials])
    );

    saveActiveWorkSnapshot({
      stage: "pausedMaterials",
      pauseReason: "materials",
    });

    localStorage.setItem("activeWorkStage", "pausedMaterials");
    localStorage.setItem("activeWorkPauseReason", "materials");

    setMaterialsAiSuggestion(translate("workCenterMaterialAddedToList", activeLanguage, {
      material: material.title,
    }));

    setMaterialsCatalogMatches((items) =>
      items.filter((item) => item.id !== material.id)
    );

    window.dispatchEvent(new Event("meetro-active-work-updated"));
    setRefreshKey((prev) => prev + 1);
  }

  function saveMaterialItem() {
    const currentMaterials = JSON.parse(
      localStorage.getItem(getActiveMaterialsKey()) || "[]"
    );

    const materialPayload = {
      title: materialForm.title || "Material needed",
      quantity: materialForm.quantity || "1",
      provider: materialForm.provider,
      status: materialForm.status,
      jobService: activeWorkSnapshot?.service || localStorage.getItem("activeWorkService") || "",
      jobLocation: activeWorkSnapshot?.location || localStorage.getItem("activeWorkLocation") || "",
    };

    const updatedMaterials = editingMaterial
      ? currentMaterials.map((item) =>
          item.id === editingMaterial.id
            ? {
                ...item,
                ...materialPayload,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      : [
          {
            id: `material-${Date.now()}`,
            ...materialPayload,
            createdAt: new Date().toISOString(),
          },
          ...currentMaterials,
        ];

    localStorage.setItem(
      getActiveMaterialsKey(),
      JSON.stringify(updatedMaterials)
    );

    saveActiveWorkSnapshot({
      stage: "pausedMaterials",
      pauseReason: "materials",
    });

    localStorage.setItem("activeWorkStage", "pausedMaterials");
    localStorage.setItem("activeWorkPauseReason", "materials");

    setMaterialForm({
      title: "",
      quantity: "1",
      provider: "customer",
      status: "needed",
    });

    setEditingMaterial(null);

    alert(
      editingMaterial
        ? translate("workCenterMaterialUpdated", activeLanguage)
        : translate("workCenterMaterialSavedAndJobPausedForMaterials", activeLanguage)
    );

    window.dispatchEvent(
      new Event("meetro-active-work-updated")
    );

    setRefreshKey((prev) => prev + 1);
  }

  function getMaterialsShareContext(materials = []) {
    const activeContext = getActiveWorkContext();

    let selectedRequest = {};
    try {
      selectedRequest = JSON.parse(
        localStorage.getItem("selectedWorkCenterRequest") ||
          localStorage.getItem("selectedQuoteRequest") ||
          "{}"
      );
    } catch {
      selectedRequest = {};
    }

    return {
      conversationId:
        activeWorkSnapshot?.conversationId ||
        localStorage.getItem("activeWorkConversationId") ||
        activeJobSnapshot?.conversationId ||
        localStorage.getItem("activeConversationId") ||
        "",
      requestId:
        activeWorkSnapshot?.requestId ||
        localStorage.getItem("activeWorkRequestId") ||
        selectedRequest?.requestId ||
        selectedRequest?.id ||
        "",
      service:
        activeContext.service ||
        selectedRequest?.title ||
        selectedRequest?.service ||
        (translate("workCenterActiveWorkTitle", activeLanguage)),
      location:
        activeContext.location ||
        selectedRequest?.location ||
        selectedRequest?.address ||
        "",
      customerName:
        selectedRequest?.homeownerName ||
        selectedRequest?.customerName ||
        localStorage.getItem("activeConversationName") ||
        localStorage.getItem("activeJobCustomer") ||
        (translate("wcCustomer", activeLanguage)),
      customerPhone:
        selectedRequest?.phone ||
        selectedRequest?.customerPhone ||
        selectedRequest?.homeownerPhone ||
        localStorage.getItem("activeCustomerPhone") ||
        "",
      customerEmail:
        selectedRequest?.email ||
        selectedRequest?.homeowner_email ||
        selectedRequest?.customerEmail ||
        localStorage.getItem("activeCustomerEmail") ||
        "",
      count: materials.length,
    };
  }

  function getMaterialProviderLabel(provider) {
    const value = String(provider || "").toLowerCase();

    if (value === "customer" || value === "homeowner") {
      return translate("wcCustomer", activeLanguage);
    }

    if (value === "business" || value === "professional" || value === "pro") {
      return translate("business", activeLanguage);
    }

    if (value === "supplier") {
      return translate("workCenterSupplier", activeLanguage);
    }

    return provider || (translate("workCenterNotSpecified", activeLanguage));
  }

  function getMaterialStatusLabel(status) {
    const value = String(status || "").toLowerCase();

    if (value === "needed") return translate("needed", activeLanguage);
    if (value === "ordered") return translate("workCenterOrdered", activeLanguage);
    if (value === "ready") return translate("ready", activeLanguage);
    if (value === "delivered") return translate("workCenterDelivered", activeLanguage);

    return status || (translate("workCenterNotSpecified", activeLanguage));
  }

  function buildMaterialsShareText(materials = []) {
    const context = getMaterialsShareContext(materials);
    const notProvided = translate("workCenterNotProvided", activeLanguage);
    const lines = materials.flatMap((item, index) => {
      const materialName = item.title || translate("material");
      const itemLines = [
        `${index + 1}. ${materialName}`,
        `   ${translate("workCenterQty", activeLanguage)}: ${item.quantity || "1"}`,
        `   ${translate("homeStatus", activeLanguage)}: ${getMaterialStatusLabel(item.status)}`,
        `   ${translate("workCenterProvidedBy", activeLanguage)}: ${getMaterialProviderLabel(item.provider)}`,
      ];

      if (item.notes) {
        itemLines.push(`   ${translate("jobsHiringApplicantNotes", activeLanguage)}: ${item.notes}`);
      }

      return itemLines;
    });

    return [
      translate("materialsList", activeLanguage),
      `${translate("workCenterJob", activeLanguage)}: ${context.service}`,
      `${translate("jobsHiringLocationPlaceholder", activeLanguage)}: ${context.location || notProvided}`,
      "",
      translate("workCenterItems", activeLanguage),
      ...lines,
      "",
      translate("workCenterPurpose", activeLanguage),
      translate("workCenterSharedByTheProfessionalForJobPreparation", activeLanguage),
      translate("workCenterThisListDoesNotRequestApprovalOrChangeJobStatus", activeLanguage),
    ]
      .join("\n");
  }

  function recordMaterialsShare(method, materials = []) {
    const context = getMaterialsShareContext(materials);
    const conversationId = context.conversationId || context.requestId || "materials";
    const existingRecords = getJobRecord(conversationId);
    const now = new Date().toISOString();

    const note = {
      id: `materials-shared-${Date.now()}`,
      conversationId,
      jobId: context.requestId || conversationId,
      jobService: context.service,
      customer: context.customerName,
      type: "materials_shared",
      workflowType: "materialsListShared",
      title: translate("workCenterMaterialsListShared", activeLanguage),
      subtitle: method,
      text: translate("workCenterMaterialsSharedVia", activeLanguage, { method }),
      materialCount: materials.length,
      method,
      savedAt: now,
      createdAt: now,
      sharedWithHomeowner: method === "Meetro Chat",
      sharedWithBusiness: true,
    };

    saveJobRecord(conversationId, [note, ...existingRecords]);
    localStorage.setItem("lastSavedJobRecord", JSON.stringify(note));
    localStorage.setItem("meetroMaterialsListLastSharedAt", now);
    window.dispatchEvent(new Event("meetroJobRecordUpdated"));
  }

  async function copyMaterialsShareText(text) {
    try {
      await navigator.clipboard?.writeText(text);
      alert(
        translate("workCenterMaterialsListCopiedYouCanPasteItIntoMessagesMailNotesOr", activeLanguage)
      );
    } catch {
      alert(
        translate("workCenterCouldNotCopyAutomaticallyCopyTheMaterialsListTextManually", activeLanguage)
      );
    }
  }

  async function shareMaterialsOutsideMeetro(materials) {
    if (materials.length === 0) {
      alert(
        translate("workCenterAddMaterialsBeforeSharingTheList", activeLanguage)
      );
      return;
    }

    const text = buildMaterialsShareText(materials);

    try {
      if (Share?.share) {
        await Share.share({
          title: translate("materialsList", activeLanguage),
          text,
          dialogTitle:
            translate("workCenterShareMaterialsList", activeLanguage),
        });
      } else if (navigator.share) {
        await navigator.share({
          title: translate("materialsList", activeLanguage),
          text,
        });
      } else {
        await copyMaterialsShareText(text);
      }

      recordMaterialsShare("Outside Meetro", materials);
    } catch (error) {
      if (error?.name !== "AbortError") {
        await copyMaterialsShareText(text);
        recordMaterialsShare("Outside Meetro", materials);
      }
    }
  }

  function sendMaterialsThroughMeetroChat(materials = []) {
    const context = getMaterialsShareContext(materials);

    if (materials.length === 0) {
      alert(
        translate("workCenterAddMaterialsBeforeSharingTheList", activeLanguage)
      );
      return;
    }

    if (!context.conversationId) {
      alert(
        translate("workCenterNoLinkedCustomerConversationFoundForThisMaterialsList", activeLanguage)
      );
      return;
    }

    const storageKey = `meetro_conversation_${context.conversationId}`;
    const existingMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const materialMessage = {
      id: `materials-list-${Date.now()}`,
      sender: "business",
      role: "business",
      senderRole: "business",
      type: "materials-list",
      workflowType: "materials_list",
      workflowSource: "materials-center",
      conversationId: context.conversationId,
      requestId: context.requestId,
      title: translate("materialsList", activeLanguage),
      subtitle:
        translate("workCenterSharedByProfessionalForJobPreparation", activeLanguage),
      approvalRequired: false,
      jobService: context.service,
      jobLocation: context.location,
      text: buildMaterialsShareText(materials),
      materials,
      source: "work_center_materials",
      deliveryMethod: "meetro_chat",
      time: formatDisplayScheduleTime(new Date()),
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      storageKey,
      JSON.stringify([...existingMessages, materialMessage])
    );

    markConversationUnreadForRecipient(context.conversationId, "business", {
      id: context.conversationId,
      project_title: context.service,
      project_description:
        translate("workCenterMaterialsListShared2", activeLanguage),
      homeowner_email: context.customerName,
      status: translate("workCenterMaterialsShared", activeLanguage),
      conversation_type: "standard",
    });

    recordMaterialsShare("Meetro Chat", materials);
    localStorage.setItem("meetroMaterialsListSent", "true");
    window.dispatchEvent(new Event("meetro-messages-updated"));
    window.dispatchEvent(new Event("storage"));
    alert(
      translate("workCenterMaterialsListSentThroughMeetroChat", activeLanguage)
    );
  }

  function saveMaterialsListPdf(materials = []) {
    if (materials.length === 0) {
      alert(
        translate("workCenterAddMaterialsBeforeCreatingThePDF", activeLanguage)
      );
      return;
    }

    const context = getMaterialsShareContext(materials);
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(translate("materialsList", activeLanguage), 14, 20);
    doc.setFontSize(11);
    doc.text(`${translate("workCenterJob", activeLanguage)}: ${context.service}`, 14, 32);
    if (context.location) {
      doc.text(`${translate("jobsHiringLocationPlaceholder", activeLanguage)}: ${context.location}`, 14, 40);
    }

    let y = context.location ? 54 : 46;
    materials.forEach((item, index) => {
      const line = `${index + 1}. ${item.title || translate("material")} — Qty ${item.quantity || "1"} — ${item.provider || ""} — ${item.status || ""}`;
      doc.text(doc.splitTextToSize(line, 180), 14, y);
      y += 10;
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`materials-list-${Date.now()}.pdf`);
    recordMaterialsShare("PDF / Print", materials);
  }

  function resetScheduleForm() {
    setScheduleForm(createBlankScheduleForm());
    setEditingScheduleId(null);
    setShowScheduleForm(false);
  }

  function getScheduleVisitId(item = {}) {
    return (
      item.id ||
      item.scheduleId ||
      item.appointmentId ||
      item.visitId ||
      item.workAppointmentId ||
      ""
    );
  }

  function normalizeScheduleTime(value) {
    if (!value) return "12:00";
    if (value.includes("AM") || value.includes("PM")) return value;
    return value;
  }

  function formatScheduleTime(value) {
    if (!value) return translate("timeTbd");
    return formatDisplayScheduleTime(value) || value;
  }

  function buildExternalScheduleShareText(visit = {}) {
    const displayTime = formatScheduleTime(visit.time);
    const lines = [
      visit.scheduleUpdate || visit.isScheduleUpdate
        ? translate("workCenterProfessionalUpdatedAppointment", activeLanguage, {
            business: visit.businessName || translate("workCenterYourProfessional", activeLanguage),
          })
        : translate("workCenterProfessionalScheduledAppointment", activeLanguage, {
            business: visit.businessName || translate("workCenterYourProfessional", activeLanguage),
          }),
      "",
      `${translate("service", activeLanguage)}: ${
        visit.requestTitle || visit.title || translate("scheduledVisit")
      }`,
      `${translate("date", activeLanguage)}: ${visit.date || ""}`,
      `${translate("myRequestsTime", activeLanguage)}: ${displayTime}`,
      `${translate("jobsHiringLocationPlaceholder", activeLanguage)}: ${
        visit.location || visit.customerAddress || translate("customerLocation")
      }`,
      "",
      translate("workCenterReviewMeetroHere", activeLanguage, {
        link: visit.inviteLink || MEETRO_PUBLIC_INVITE_LINK,
      }),
    ];

    return lines.filter((line) => line !== null && line !== undefined).join("\n");
  }

  async function shareExternalScheduleVisit(visit = {}) {
    const text = buildExternalScheduleShareText(visit);
    const title =
      translate("workCenterMeetroAppointment", activeLanguage);

    try {
      if (Share?.share) {
        await Share.share({
          title,
          text,
          dialogTitle: title,
        });
        return true;
      }
    } catch {
      // Fall through to browser/SMS fallback.
    }

    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        return true;
      }
    } catch {
      // Fall through to SMS fallback.
    }

    const phone = String(visit.customerPhone || "").replace(/\s/g, "");
    if (phone) {
      const separator = /iPad|iPhone|iPod/i.test(navigator.userAgent || "")
        ? "&"
        : "?";
      window.location.href = `sms:${encodeURIComponent(phone)}${separator}body=${encodeURIComponent(text)}`;
      return true;
    }

    setAppointmentReminderNotice({
      title:
        translate("workCenterShareByText", activeLanguage),
      actions: false,
      message:
        translate("workCenterVisitSavedAddTheCustomersPhoneNumberToShareItThroughMessages", activeLanguage),
    });
    return false;
  }

  function isLinkedMeetroScheduleCustomer(visit = {}) {
    const conversationId = visit.conversationId || visit.projectConversationId || "";
    if (visit.isExternalCustomer) return false;
    if (!conversationId) return false;
    return Boolean(
      conversationId ||
        visit.customerAccountId ||
        visit.customerId ||
        visit.isMeetroUser
    );
  }

  function sendScheduleVisitToMeetroChat(visit = {}) {
    const conversationId = visit.conversationId || visit.projectConversationId || "";
    if (!conversationId) return false;

    const storageKey = `meetro_conversation_${conversationId}`;
    const existingMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const isWorkSchedule = visit.appointmentType === "work_visit";
    const isScheduleUpdate = Boolean(visit.scheduleUpdate || visit.isScheduleUpdate);
    const serviceLines = Array.isArray(visit.services) && visit.services.length > 0
      ? visit.services
      : [visit.requestTitle || visit.title].filter(Boolean);
    const customerScheduleTitle = isWorkSchedule
      ? translate("workScheduled", activeLanguage)
      : isScheduleUpdate
        ? translate("workCenterAppointmentUpdated", activeLanguage)
        : translate("appointmentScheduled", activeLanguage);
    const displayVisitTime = formatScheduleTime(visit.time);
    const customerScheduleText = isWorkSchedule
      ? isScheduleUpdate
        ? translate("workCenterWorkScheduleUpdated", activeLanguage, { date: visit.date, time: displayVisitTime })
        : translate("workCenterWorkScheduledMessage", activeLanguage, { date: visit.date, time: displayVisitTime })
      : isScheduleUpdate
        ? translate("workCenterAppointmentUpdatedMessage", activeLanguage, { title: visit.title, date: visit.date, time: displayVisitTime })
        : translate("workCenterAppointmentScheduledLabelMessage", activeLanguage, { label: visit.appointmentLabel, title: visit.title, date: visit.date, time: displayVisitTime });
    const scheduleMessageId = isScheduleUpdate
      ? `schedule-update-msg-${visit.id}-${Date.now()}`
      : Date.now();
    const replacedScheduleMessageIds = [];
    const updatedExistingMessages = isScheduleUpdate
      ? existingMessages.map((message) => {
          const messageVisitId =
            message.schedule?.visitId ||
            message.visitId ||
            message.schedule?.id ||
            message.scheduleId ||
            message.appointmentId ||
            "";

          if (
            message.type !== "schedule" ||
            String(messageVisitId) !== String(visit.id) ||
            message.replacedAt
          ) {
            return message;
          }

          replacedScheduleMessageIds.push(message.id);

          return {
            ...message,
            isOutdated: true,
            replacedAt: visit.updatedAt,
            replacedByScheduleMessageId: scheduleMessageId,
            customerConfirmationStatus: "replaced",
            confirmationStatus: "replaced",
            status: "replaced",
            subtitle: `${message.schedule?.date || ""} • ${formatScheduleTime(
              message.schedule?.time
            )} • ${translate("workCenterScheduleUpdated", activeLanguage)}`,
            schedule: {
              ...(message.schedule || {}),
              customerConfirmationStatus: "replaced",
              confirmationStatus: "replaced",
              status: "replaced",
              replacedAt: visit.updatedAt,
              replacedByVisitId: visit.id,
              replacedByScheduleMessageId: scheduleMessageId,
            },
          };
        })
      : existingMessages;

    const scheduleMessage = {
      id: scheduleMessageId,
      sender: "business",
      role: "business",
      type: "schedule",
      workflowSource: "work-center-schedule",
      workflowType: isWorkSchedule
        ? "work_scheduled"
        : isScheduleUpdate
          ? "appointment_updated"
          : "appointment_scheduled",
      conversationId,
      appointmentId: visit.id,
      scheduleId: visit.id,
      visitId: visit.visitId || visit.id,
      relationshipId: visit.relationshipId || "",
      customerAccountId: visit.customerAccountId || "",
      customerId: visit.customerId || "",
      externalContactId: visit.externalContactId || "",
      businessId: visit.businessId || "",
      customerConfirmationStatus: "pending_customer_confirmation",
      confirmationStatus: "pending_customer_confirmation",
      scheduleUpdate: isScheduleUpdate,
      isScheduleUpdate,
      replacesScheduleMessageIds: replacedScheduleMessageIds,
      title: customerScheduleTitle,
      subtitle: `${visit.date || ""} • ${displayVisitTime} • ${translate("appointmentPendingConfirmation")}`,
      text: customerScheduleText,
      services: serviceLines,
      schedule: visit,
      time: formatDisplayScheduleTime(new Date()),
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      storageKey,
      JSON.stringify([...updatedExistingMessages, scheduleMessage])
    );

    markConversationUnreadForRecipient(conversationId, "business", {
      id: conversationId,
      conversationId,
      relationshipId: visit.relationshipId || "",
      project_title: visit.requestTitle || visit.title || customerScheduleTitle,
      project_description: customerScheduleText,
    });
    window.dispatchEvent(new Event("meetro-messages-updated"));
    return true;
  }

  function openScheduleDeliveryChoice(visit = {}) {
    setPendingScheduleDelivery({
      visit,
      visitId: visit.visitId || visit.id || "",
      conversationId: visit.conversationId || visit.projectConversationId || "",
      isScheduleUpdate: Boolean(visit.scheduleUpdate || visit.isScheduleUpdate),
      linkedMeetroCustomer: false,
      primaryMethod: "share",
    });
  }

  function confirmScheduleSentInMeetroChat(visit = {}) {
    const isScheduleUpdate = Boolean(visit.scheduleUpdate || visit.isScheduleUpdate);
    setPendingScheduleDelivery(null);
    setAppointmentReminderNotice({
      title: isScheduleUpdate
        ? translate("workCenterAppointmentUpdated", activeLanguage)
        : translate("workCenterAppointmentSent", activeLanguage),
      actions: false,
      message:
        translate("workCenterAppointmentCardSentInTheSameMeetroChat", activeLanguage),
    });
  }

  async function handleScheduleDeliveryChoice(method) {
    const visit = pendingScheduleDelivery?.visit;
    if (!visit) return;

    if (method === "chat") {
      const sent = sendScheduleVisitToMeetroChat(visit);
      if (!sent) {
        setAppointmentReminderNotice({
          title:
            translate("workCenterChooseAnotherDeliveryMethod", activeLanguage),
          actions: false,
          message:
            translate("workCenterThisVisitDoesNotHaveALinkedMeetroChatShareItBy", activeLanguage),
        });
        return;
      }

      setPendingScheduleDelivery(null);
      setAppointmentReminderNotice({
        title:
          translate("workCenterAppointmentSent", activeLanguage),
        actions: false,
        message:
          translate("workCenterAppointmentCardSentInMeetroChat", activeLanguage),
      });
      setRefreshKey((prev) => prev + 1);
      return;
    }

    const shared = await shareExternalScheduleVisit(visit);
    if (shared) {
      setPendingScheduleDelivery(null);
      setAppointmentReminderNotice({
        title:
          translate("workCenterShareAppointment", activeLanguage),
        actions: false,
        message:
          translate("workCenterMessageSharingOpenedForThisAppointment", activeLanguage),
      });
      setRefreshKey((prev) => prev + 1);
    }
  }

  function readManualCustomerContacts() {
    try {
      const contacts = JSON.parse(
        localStorage.getItem("meetro_manual_customer_contacts") || "[]"
      );
      return Array.isArray(contacts) ? contacts : [];
    } catch (error) {
      return [];
    }
  }

  function saveManualCustomerContact(contact) {
    if (!contact?.customerName) return null;

    const contacts = readManualCustomerContacts();
    const normalizedPhone = String(contact.phone || "").replace(/\D/g, "");
    const normalizedEmail = String(contact.email || "").trim().toLowerCase();
    const normalizedName = String(contact.customerName || "").trim().toLowerCase();
    const normalizedAddress = String(contact.address || "").trim().toLowerCase();

    const existingContact = contacts.find((item) => {
      const itemPhone = String(item.phone || "").replace(/\D/g, "");
      const itemEmail = String(item.email || "").trim().toLowerCase();
      const itemName = String(item.customerName || "").trim().toLowerCase();
      const itemAddress = String(item.address || "").trim().toLowerCase();

      if (normalizedPhone && itemPhone === normalizedPhone) return true;
      if (normalizedEmail && itemEmail === normalizedEmail) return true;
      return (
        normalizedName &&
        normalizedAddress &&
        itemName === normalizedName &&
        itemAddress === normalizedAddress
      );
    });

    const now = new Date().toISOString();
    const nextContact = {
      ...(existingContact || {}),
      ...contact,
      id: existingContact?.id || contact.id || `manual-customer-${Date.now()}`,
      source: "manual_customer_entry",
      isMeetroUser: false,
      invited: Boolean(existingContact?.invited || contact.invited),
      createdAt: existingContact?.createdAt || contact.createdAt || now,
      updatedAt: now,
    };

    const nextContacts = existingContact
      ? contacts.map((item) => (item.id === existingContact.id ? nextContact : item))
      : [nextContact, ...contacts];

    localStorage.setItem(
      "meetro_manual_customer_contacts",
      JSON.stringify(nextContacts)
    );

    return nextContact;
  }

  function getScheduleStatusLabel(status, item = {}) {
    const rawStatus =
      item.customerConfirmationStatus ||
      item.confirmationStatus ||
      item.workflowStatus ||
      status;
    const normalized = String(rawStatus || "").toLowerCase().replace(/\s+/g, "_");

    if (normalized === "work_scheduled") {
      return translate("workScheduled", activeLanguage);
    }
    if (normalized === "completed") return translate("completed");
    if (
      normalized === "confirmed" ||
      normalized === "appointment_confirmed" ||
      normalized === "customer_confirmed"
    ) {
      return translate("appointmentConfirmed");
    }
    if (
      normalized === "change_requested" ||
      normalized === "appointment_change_requested" ||
      normalized.includes("reschedule")
    ) {
      return translate("appointmentChangeRequested");
    }
    if (normalized === "pending_customer_confirmation") {
      return translate("appointmentPendingConfirmation");
    }
    if (normalized === "scheduled") return translate("scheduled");

    return rawStatus || translate("scheduled");
  }

  function getScheduleReminderLabels(item = {}) {
    const labels = [];
    const appointmentDateTime = new Date(`${item.date || ""} ${item.time || "09:00"}`);

    if (item.reminders?.enabled) {
      labels.push(translate("workCenterReminderSet", activeLanguage));
    }

    if (!Number.isNaN(appointmentDateTime.getTime())) {
      const now = new Date();
      const sameDay =
        appointmentDateTime.getFullYear() === now.getFullYear() &&
        appointmentDateTime.getMonth() === now.getMonth() &&
        appointmentDateTime.getDate() === now.getDate();
      const minutesUntil = (appointmentDateTime.getTime() - now.getTime()) / 60000;

      if (sameDay) labels.push(translate("workCenterDueToday", activeLanguage));
      if (minutesUntil >= 0 && minutesUntil <= 120) {
        labels.push(translate("workCenterStartingSoon", activeLanguage));
      }
    }

    return labels;
  }

  function getScheduleConfirmationState(item = {}) {
    const rawStatus =
      item.customerConfirmationStatus ||
      item.confirmationStatus ||
      item.workflowStatus ||
      item.status ||
      "";
    const normalized = String(rawStatus).toLowerCase().replace(/\s+/g, "_");

    if (
      normalized === "confirmed" ||
      normalized === "appointment_confirmed" ||
      normalized === "customer_confirmed"
    ) {
      return "confirmed";
    }

    if (
      normalized === "change_requested" ||
      normalized === "appointment_change_requested" ||
      normalized.includes("reschedule")
    ) {
      return "change_requested";
    }

    if (normalized === "pending_customer_confirmation") {
      return "pending";
    }

    return normalized || "scheduled";
  }

  function isSchedulePast(item = {}) {
    const parsed = new Date(`${item.date || ""} ${item.time || "23:59"}`);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed.getTime() < Date.now();
  }

  function getScheduleAppointmentOptions() {
    return [
      {
        value: "walkthrough",
        label: translate("walkthrough"),
        title: translate("scheduledWalkthrough"),
      },
      {
        value: "estimate_visit",
        label: translate("estimateVisit"),
        title: translate("scheduledEstimateVisit"),
      },
      {
        value: "consultation",
        label: translate("consultation"),
        title: translate("scheduledConsultation"),
      },
      {
        value: "emergency_dispatch",
        label: translate("emergencyDispatch"),
        title: translate("scheduledEmergencyDispatch"),
      },
      {
        value: "virtual_meeting",
        label: translate("virtualMeeting"),
        title: translate("scheduledVirtualMeeting"),
      },
      {
        value: "work_visit",
        label: translate("scheduledWork", activeLanguage),
        title: translate("workScheduled", activeLanguage),
      },
    ];
  }

  function getScheduleAppointmentMeta(type) {
    return (
      getScheduleAppointmentOptions().find((option) => option.value === type) ||
      getScheduleAppointmentOptions()[0]
    );
  }


  async function saveManualScheduleVisit() {
    if (!canReadLegacyWorkflowStorage()) return;
    const schedule = JSON.parse(
      localStorage.getItem("meetro_business_schedule") || "[]"
    );
    const existingVisit = schedule.find(
      (item) => String(getScheduleVisitId(item)) === String(editingScheduleId)
    );
    const isScheduleUpdate = Boolean(editingScheduleId && existingVisit);
    const selectedScheduleContext =
      scheduleForm.contextSource === "selected_work_center_request"
        ? selectedWorkCenterRequest
        : null;
    const canUseAmbientConversationContext = Boolean(
      editingScheduleId ||
        scheduleForm.contextSource === "conversation" ||
        scheduleForm.contextSource === "assistant_conversation"
    );
    const conversationId =
      existingVisit?.conversationId ||
      existingVisit?.projectConversationId ||
      scheduleForm.conversationId ||
      selectedScheduleContext?.conversationId ||
      selectedScheduleContext?.projectConversationId ||
      (canUseAmbientConversationContext
        ? localStorage.getItem("activeWorkConversationId") ||
          localStorage.getItem("activeConversationId")
        : "") ||
      "";
    const requestId =
      existingVisit?.requestId ||
      scheduleForm.requestId ||
      selectedScheduleContext?.requestId ||
      selectedScheduleContext?.id ||
      "";

    const appointmentMeta = getScheduleAppointmentMeta(
      scheduleForm.appointmentType || "walkthrough"
    );
    const isWorkSchedule = scheduleForm.appointmentType === "work_visit";
    const manualCustomerName = String(scheduleForm.manualCustomerName || "").trim();
    const manualCustomerPhone = String(scheduleForm.manualCustomerPhone || "").trim();
    const manualCustomerEmail = String(scheduleForm.manualCustomerEmail || "").trim();
    const manualCustomerAddress = String(
      scheduleForm.manualCustomerAddress || ""
    ).trim();
    const relationshipId = String(
      scheduleForm.relationshipId || existingVisit?.relationshipId || ""
    ).trim();
    const customerAccountId = String(
      scheduleForm.customerAccountId ||
        existingVisit?.customerAccountId ||
        existingVisit?.customerId ||
        ""
    ).trim();
    const externalContactId = String(
      scheduleForm.externalContactId ||
        existingVisit?.externalContactId ||
        existingVisit?.manualCustomerContactId ||
        ""
    ).trim();
    const businessId = String(
      scheduleForm.businessId || existingVisit?.businessId || ""
    ).trim();
    const businessName = String(
      scheduleForm.businessName ||
        existingVisit?.businessName ||
        localStorage.getItem("businessName") ||
        localStorage.getItem("companyName") ||
        ""
    ).trim();
    const activeScheduleMode = String(
      scheduleForm.activeAccountMode || existingVisit?.activeAccountMode || ""
    ).trim();
    const activeScheduleRole = String(
      scheduleForm.activeRole || existingVisit?.activeRole || "business"
    ).trim();
    const visitLocation = getScheduleVisitLocation({
      customerAddress: manualCustomerAddress,
      overrideLocation: scheduleForm.location,
      fallback: translate("customerLocation"),
    });
    const hasManualCustomerEntry = Boolean(
      manualCustomerName ||
        manualCustomerPhone ||
        manualCustomerEmail ||
        manualCustomerAddress
    );
    const isManualOutsideCustomer = hasManualCustomerEntry && !conversationId && !requestId;
    const isExternalCustomer = Boolean(
      scheduleForm.isExternalCustomer ||
        existingVisit?.isExternalCustomer ||
        (!customerAccountId && (externalContactId || isManualOutsideCustomer))
    );
    const scheduleDedupeKey =
      scheduleForm.scheduleDedupeKey ||
      [
        relationshipId || externalContactId || customerAccountId || conversationId,
        scheduleForm.date,
        normalizeScheduleTime(scheduleForm.time),
        scheduleForm.title || appointmentMeta.title || translate("scheduledVisit"),
      ]
        .filter(Boolean)
        .join("|");
    const manualCustomerContact = hasManualCustomerEntry
      ? saveManualCustomerContact({
          id:
            existingVisit?.manualCustomerContactId ||
            existingVisit?.customer?.id ||
            externalContactId,
          customerName:
            manualCustomerName ||
            existingVisit?.customerName ||
            selectedScheduleContext?.customerName ||
            selectedScheduleContext?.homeownerName ||
            "Customer",
          phone: manualCustomerPhone || existingVisit?.customerPhone || "",
          email: manualCustomerEmail || existingVisit?.customerEmail || "",
          address:
            manualCustomerAddress ||
            existingVisit?.customerAddress ||
            existingVisit?.location ||
            "",
          source: "manual_customer_entry",
          isMeetroUser: false,
          invited: false,
        })
      : null;

    let newVisit = {
      id: editingScheduleId || `schedule-${Date.now()}`,
      visitId:
        existingVisit?.visitId ||
        existingVisit?.id ||
        editingScheduleId ||
        "",
      appointmentType: scheduleForm.appointmentType || "walkthrough",
      appointmentLabel: appointmentMeta.label,
      workflowStage: isWorkSchedule ? "work_scheduled" : "scheduling",
      workflowStatus: isWorkSchedule ? "work_scheduled" : "pending_customer_confirmation",
      title: scheduleForm.title || appointmentMeta.title || translate("scheduledVisit"),
      date: scheduleForm.date,
      time: normalizeScheduleTime(scheduleForm.time),
      location: visitLocation,
      notes: scheduleForm.notes,
      status: isWorkSchedule ? "work_scheduled" : "scheduled",
      customerConfirmationStatus: "pending_customer_confirmation",
      confirmationStatus: "pending_customer_confirmation",
      confirmationStatusLabel: translate("appointmentPendingConfirmation"),
      scheduleRevision: Number(existingVisit?.scheduleRevision || 0) + 1,
      scheduleUpdate: isScheduleUpdate,
      isScheduleUpdate,
      source:
        existingVisit?.source ||
        (scheduleForm.contextSource === "conversation" ? "conversation_schedule_handoff" : "") ||
        (conversationId ? "meetro_customer" : "") ||
        (isManualOutsideCustomer ? "manual_customer_entry" : "") ||
        "manual",
      conversationId,
      projectConversationId: conversationId,
      activeConversationId: conversationId,
      requestId,
      relationshipId,
      customerAccountId,
      customerId: customerAccountId,
      externalContactId,
      businessId,
      businessName,
      activeAccountMode: activeScheduleMode,
      activeRole: activeScheduleRole,
      isExternalCustomer,
      inviteLink: scheduleForm.inviteLink || MEETRO_PUBLIC_INVITE_LINK,
      scheduleDedupeKey,
      quoteId: scheduleForm.quoteId || existingVisit?.quoteId || "",
      services: Array.isArray(scheduleForm.services)
        ? scheduleForm.services.filter(Boolean)
        : [],
      nextAction:
        isWorkSchedule
          ? "open_active_work"
          : existingVisit?.nextAction || "record_evaluation_after_visit",
      nextResponsibility:
        existingVisit?.nextResponsibility ||
        (translate("workCenterRecordEvaluation", activeLanguage)),
      selectedHomeownerRequestId:
        existingVisit?.selectedHomeownerRequestId ||
        localStorage.getItem("selectedHomeownerRequestId") ||
        "",
      customerName:
        manualCustomerContact?.customerName ||
        manualCustomerName ||
        existingVisit?.customerName ||
        selectedScheduleContext?.customerName ||
        selectedScheduleContext?.homeownerName ||
        selectedScheduleContext?.homeowner_email ||
        (canUseAmbientConversationContext
          ? localStorage.getItem("activeConversationName")
          : "") ||
        "Customer",
      customerPhone:
        manualCustomerContact?.phone ||
        manualCustomerPhone ||
        existingVisit?.customerPhone ||
        "",
      customerEmail:
        manualCustomerContact?.email ||
        manualCustomerEmail ||
        existingVisit?.customerEmail ||
        "",
      customerAddress:
        manualCustomerContact?.address ||
        manualCustomerAddress ||
        existingVisit?.customerAddress ||
        visitLocation ||
        "",
      manualCustomerContactId:
        manualCustomerContact?.id ||
        existingVisit?.manualCustomerContactId ||
        "",
      customer: manualCustomerContact || existingVisit?.customer || null,
      isMeetroUser:
        manualCustomerContact
          ? false
          : Boolean(existingVisit?.isMeetroUser || customerAccountId || conversationId),
      invited: Boolean(existingVisit?.invited),
      requestTitle:
        existingVisit?.requestTitle ||
        selectedScheduleContext?.title ||
        selectedScheduleContext?.service ||
        selectedScheduleContext?.projectTitle ||
        scheduleForm.title ||
        "",
      createdAt:
        existingVisit?.createdAt ||
        new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    newVisit.visitId = newVisit.visitId || newVisit.id;

    const duplicateVisit = !editingScheduleId && scheduleDedupeKey
      ? schedule.find(
          (item) =>
            item.scheduleDedupeKey === scheduleDedupeKey ||
            (
              String(item.conversationId || "") === String(conversationId || "") &&
              String(item.relationshipId || "") === String(relationshipId || "") &&
              String(item.date || "") === String(newVisit.date || "") &&
              String(normalizeScheduleTime(item.time || "")) ===
                String(normalizeScheduleTime(newVisit.time || "")) &&
              String(item.title || item.requestTitle || "") ===
                String(newVisit.title || newVisit.requestTitle || "")
            )
        )
      : null;

    if (duplicateVisit) {
      setAppointmentReminderNotice({
        message:
          translate("workCenterThisVisitIsAlreadySavedForThisCustomer", activeLanguage),
      });
      localStorage.setItem("activeWorkScheduleId", getScheduleVisitId(duplicateVisit));
      resetScheduleForm();
      return;
    }

    const reminderResult = await scheduleAppointmentReminderNotifications(newVisit, {
      viewerRole: "professional",
      language: activeLanguage,
    });

    newVisit = reminderResult.appointment || newVisit;
    newVisit.visitId = newVisit.visitId || newVisit.id;

    if (reminderResult.permissionDenied) {
      setAppointmentReminderNotice({
        message:
          translate("workCenterMeetroCanRemindYouAboutUpcomingAppointmentsNotificationsAreBlockedOpenIPhone", activeLanguage),
      });
    } else {
      setAppointmentReminderNotice(null);
    }

    const updatedSchedule = editingScheduleId
      ? schedule.map((item) =>
          String(getScheduleVisitId(item)) === String(editingScheduleId)
            ? newVisit
            : item
        )
      : [newVisit, ...schedule];

    localStorage.setItem(
      "meetro_business_schedule",
      JSON.stringify(updatedSchedule)
    );

    if (isWorkSchedule) {
      const activeWorkId =
        newVisit.requestId || newVisit.quoteId || newVisit.id || newVisit.conversationId;
      saveActiveWorkSnapshot({
        requestId: newVisit.requestId || activeWorkId,
        quoteId: newVisit.quoteId || "",
        scheduleId: newVisit.id,
        conversationId: newVisit.conversationId || "",
        status: "scheduled",
        stage: "work_scheduled",
        service: newVisit.requestTitle || newVisit.title || translate("scheduledVisit"),
        location: newVisit.location || "",
        customer: newVisit.customerName || "",
        type: "work_scheduled",
        source: "schedule",
      });
      saveActiveJobSnapshot({
        id: activeWorkId,
        jobId: activeWorkId,
        quoteId: newVisit.quoteId || "",
        scheduleId: newVisit.id,
        conversationId: newVisit.conversationId || "",
        service: newVisit.requestTitle || newVisit.title || translate("scheduledVisit"),
        location: newVisit.location || "",
        status: "scheduled",
        customer: newVisit.customerName || "",
      });
      localStorage.setItem("activeWorkStatus", "scheduled");
      localStorage.setItem("activeWorkStage", "work_scheduled");
      localStorage.setItem("activeWorkType", "work_scheduled");
      localStorage.setItem("activeWorkSource", "schedule");
      localStorage.setItem("activeWorkScheduleId", newVisit.id);
      localStorage.setItem("activeWorkConversationId", newVisit.conversationId || "");
      localStorage.setItem("activeWorkService", newVisit.requestTitle || newVisit.title || "");
      localStorage.setItem("activeWorkLocation", newVisit.location || "");
    }

    try {
      const identityRecord = editingScheduleId
        ? existingVisit
        : selectedScheduleContext;
      const identity = getProjectIdentity({
        projectId: identityRecord?.projectId,
        requestId: identityRecord?.requestId,
        title: identityRecord?.title,
        name: identityRecord?.name,
      });

      if (!identity.projectId) {
        console.warn("Work Center shadow schedule link skipped.", {
          scheduleId: newVisit.id,
          warnings: identity.warnings,
        });
      } else {
        const shadowResult = linkScheduleToProject({
          projectId: identity.projectId,
          scheduleId: newVisit.id,
          metadata: {
            action: editingScheduleId ? "updated" : "created",
            source: newVisit.source || "manual",
          },
        });

        if (!shadowResult.ok || shadowResult.warnings.length > 0) {
          console.warn(
            "Work Center shadow schedule link warning.",
            shadowResult
          );
        }

        if (shadowResult.ok && import.meta.env.DEV) {
          try {
            const reconciliation = getScheduleLinkReconciliationReport();
            const identityWarnings = getScheduleLinkIdentityWarnings();
            const commonIdentityWarnings = Object.entries(
              identityWarnings.reasonCounts
            )
              .sort(([, firstCount], [, secondCount]) =>
                secondCount - firstCount
              )
              .slice(0, 5)
              .map(([code, count]) => ({ code, count }));

            console.info("Work Center schedule link reconciliation.", {
              scheduleCount: reconciliation.scheduleCount,
              uniqueLinkedScheduleCount:
                reconciliation.uniqueLinkedScheduleCount,
              missingLinkCount: reconciliation.missingLinkCount,
              safeIdentityMissingLinkCount:
                reconciliation.safeIdentityMissingLinkCount,
              coveragePercentage: reconciliation.coveragePercentage,
              commonIdentityWarnings,
            });
          } catch (error) {
            console.warn(
              "Work Center schedule reconciliation logging failed.",
              error
            );
          }
        }
      }
    } catch (error) {
      console.warn("Work Center shadow schedule link failed.", error);
    }

    if (isLinkedMeetroScheduleCustomer(newVisit)) {
      const sent = sendScheduleVisitToMeetroChat(newVisit);
      if (sent) {
        confirmScheduleSentInMeetroChat(newVisit);
      } else {
        openScheduleDeliveryChoice(newVisit);
      }
    } else {
      openScheduleDeliveryChoice(newVisit);
    }
    resetScheduleForm();
    setRefreshKey((prev) => prev + 1);
  }

  function startEditScheduleVisit(item) {
    const scheduleId = getScheduleVisitId(item);

    if (!scheduleId) {
      alert(
        translate("workCenterThisVisitIsMissingAnEditableAppointmentIdOpenTheScheduleAgain", activeLanguage)
      );
      return;
    }

    setEvaluationTarget(null);
    setEditingScheduleId(scheduleId);
    const editCustomerAddress =
      item.customerAddress ||
      item.customer?.address ||
      item.location ||
      "";
    const editVisitLocation = String(item.location || "").trim();
    const editLocationOverride =
      editVisitLocation &&
      editCustomerAddress &&
      editVisitLocation.toLowerCase() !== String(editCustomerAddress).trim().toLowerCase()
        ? editVisitLocation
        : "";
    setScheduleForm({
      contextSource: item.conversationId || item.requestId ? "conversation" : "manual",
      appointmentType: item.appointmentType || "walkthrough",
      title: item.title || "",
      requestId: item.requestId || "",
      conversationId: item.conversationId || item.projectConversationId || "",
      quoteId: item.quoteId || "",
      services: Array.isArray(item.services) ? item.services.filter(Boolean) : [],
      relationshipId: item.relationshipId || item.relationship_id || "",
      customerAccountId:
        item.customerAccountId ||
        item.customerId ||
        item.homeownerId ||
        "",
      externalContactId:
        item.externalContactId ||
        item.manualCustomerContactId ||
        item.contactId ||
        "",
      businessId: item.businessId || item.business_id || "",
      businessName:
        item.businessName ||
        localStorage.getItem("businessName") ||
        localStorage.getItem("companyName") ||
        "",
      activeAccountMode: item.activeAccountMode || item.activeMode || "",
      activeRole: item.activeRole || "business",
      isExternalCustomer: Boolean(item.isExternalCustomer),
      inviteLink: item.inviteLink || MEETRO_PUBLIC_INVITE_LINK,
      scheduleDedupeKey: item.scheduleDedupeKey || "",
      manualCustomerName:
        item.customerName ||
        item.customer?.customerName ||
        item.homeownerName ||
        "",
      manualCustomerPhone:
        item.customerPhone ||
        item.customer?.phone ||
        "",
      manualCustomerEmail:
        item.customerEmail ||
        item.customer?.email ||
        "",
      manualCustomerAddress: editCustomerAddress,
      date: item.date || new Date().toISOString().slice(0, 10),
      time: item.time && item.time.includes("AM") ? "12:00" : item.time || "12:00",
      location: editLocationOverride,
      notes: item.notes || "",
    });
    setShowScheduleForm(true);
  }

  function appendWorkflowTimelineEvent(event, identityRecord = event) {
    const timeline = JSON.parse(
      localStorage.getItem("meetroWorkflowTimeline") || "[]"
    );

    const nextEvent = {
      id: event.id || `timeline-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...event,
    };

    localStorage.setItem(
      "meetroWorkflowTimeline",
      JSON.stringify([nextEvent, ...timeline])
    );

    const projectTimeline = JSON.parse(
      localStorage.getItem("projectTimeline") || "[]"
    );

    localStorage.setItem(
      "projectTimeline",
      JSON.stringify([nextEvent, ...projectTimeline])
    );

    try {
      const identity = getProjectIdentity({
        projectId: identityRecord.projectId,
        requestId: identityRecord.requestId,
      });

      if (!identity.projectId) {
        console.warn("Work Center shadow timeline skipped.", {
          eventType: event.type || "",
          warnings: identity.warnings,
        });
        return;
      }

      const shadowResult = appendProjectTimelineEvent({
        projectId: identity.projectId,
        event: nextEvent,
      });

      if (!shadowResult.ok || shadowResult.warnings.length > 0) {
        console.warn("Work Center shadow timeline warning.", shadowResult);
      }

      if (shadowResult.ok && import.meta.env.DEV) {
        try {
          const reconciliation = getTimelineReconciliationReport();
          const identityWarnings = getTimelineIdentityWarnings();
          const commonIdentityWarnings = Object.entries(
            identityWarnings.reasonCounts
          )
            .sort(([, firstCount], [, secondCount]) =>
              secondCount - firstCount
            )
            .slice(0, 5)
            .map(([code, count]) => ({ code, count }));

          console.info("Work Center timeline reconciliation.", {
            coveragePercentage: reconciliation.coveragePercentage,
            legacyCount: reconciliation.legacyEventCount,
            shadowCount: reconciliation.shadowEventCount,
            missingShadowCount: reconciliation.missingShadowCount,
            commonIdentityWarnings,
          });
        } catch (error) {
          console.warn(
            "Work Center timeline reconciliation logging failed.",
            error
          );
        }
      }
    } catch (error) {
      console.warn("Work Center shadow timeline failed.", error);
    }
  }

  function markScheduleCompleted(item) {
    setVisitOutcomeTarget(item);
  }

  function completeScheduleVisit(item, outcome) {
    if (!canReadLegacyWorkflowStorage()) return;
    const schedule = JSON.parse(
      localStorage.getItem("meetro_business_schedule") || "[]"
    );

    const updatedSchedule = schedule.map((visit) =>
      visit.id === item.id
        ? {
            ...visit,
            status: "Completed",
            completedAt: new Date().toISOString(),
            visitOutcome: outcome,
          }
        : visit
    );

    localStorage.setItem(
      "meetro_business_schedule",
      JSON.stringify(updatedSchedule)
    );

    appendWorkflowTimelineEvent(
      {
        type: "appointment_completed",
        title:
          translate("workCenterVisitCompleted2", activeLanguage),
        service: item.title || "",
        location: item.location || "",
        scheduleId: item.id || "",
        conversationId:
          item.projectConversationId ||
          item.conversationId ||
          item.requestId ||
          "",
        outcome,
      },
      item
    );
  }

  function applyVisitOutcome(outcome) {
    if (!visitOutcomeTarget) return;

    const item = visitOutcomeTarget;

    const workflowConversationId =
      item.projectConversationId ||
      item.conversationId ||
      item.requestId ||
      "";

    const baseRequest = {
      id: item.requestId || item.id || `request-${Date.now()}`,
      requestId: item.requestId || item.id || "",
      scheduleId: item.id || "",
      title: item.title || translate("scheduledVisit"),
      service: item.title || translate("scheduledVisit"),
      description: item.notes || "",
      location: item.location || "",
      conversationId: workflowConversationId,
      projectConversationId: workflowConversationId,
      workflowSource: "visit_outcome",
      visitOutcome: outcome,
      visitOutcomeDate: new Date().toISOString(),
    };

    localStorage.setItem("selectedWorkCenterRequest", JSON.stringify(baseRequest));
    localStorage.setItem("projectOutcome", outcome);
    localStorage.setItem("projectOutcomeDate", new Date().toISOString());
    localStorage.setItem("projectWorkflowStatus", outcome);

    completeScheduleVisit(item, outcome);

    if (workflowConversationId) {
      localStorage.setItem("activeConversationId", workflowConversationId);
      localStorage.setItem("meetroConversationType", "standard");
    }

    if (outcome === "quote_required") {
      localStorage.removeItem("selectedQuoteForEdit");
      localStorage.removeItem("lastManualQuoteNumber");
      localStorage.setItem("activeWorkCenterQuoteRequestId", baseRequest.requestId || baseRequest.id);
      localStorage.setItem("workflowSource", "visit_outcome");
      localStorage.setItem("quoteBuilderReturnPage", "workCenter");
      localStorage.setItem("meetroWorkCenterTab", "quotes");
      localStorage.setItem("activeWorkCenterTab", "quotes");

      appendWorkflowTimelineEvent(
        {
          type: "quote_required",
          title:
            translate("workCenterQuoteRequired", activeLanguage),
          service: baseRequest.service,
          location: baseRequest.location,
          requestId: baseRequest.requestId,
          conversationId: workflowConversationId,
        },
        item
      );

      setVisitOutcomeTarget(null);
      setPage("quoteBuilder");
      return;
    }

    if (outcome === "start_work_immediately" || outcome === "emergency_dispatch") {
      const activeStatus =
        outcome === "emergency_dispatch" ? "on_the_way" : "ready_to_start";

      localStorage.setItem("activeWorkStatus", activeStatus);
      localStorage.setItem("activeWorkType", item.appointmentType || "scheduled");
      localStorage.setItem("activeWorkSource", "visit_outcome");
      localStorage.setItem("activeWorkService", baseRequest.service);
      localStorage.setItem("activeWorkLocation", baseRequest.location);
      localStorage.setItem("activeWorkConversationId", workflowConversationId);

      saveActiveWorkSnapshot({
        id: baseRequest.id,
        conversationId: workflowConversationId,
        service: baseRequest.service,
        location: baseRequest.location,
        type: item.appointmentType || "scheduled",
        source: "visit_outcome",
        status: activeStatus,
        stage: "active",
        updatedAt: new Date().toISOString(),
      });

      saveActiveJobSnapshot({
        id: baseRequest.id,
        conversationId: workflowConversationId,
        service: baseRequest.service,
        location: baseRequest.location,
        status: activeStatus,
        stage: "active",
        source: "visit_outcome",
        updatedAt: new Date().toISOString(),
      });

      appendWorkflowTimelineEvent(
        {
          type: outcome,
          title:
            outcome === "emergency_dispatch"
              ? translate("workCenterEmergencyDispatchStarted", activeLanguage)
              : translate("workCenterWorkReadyToStart", activeLanguage),
          service: baseRequest.service,
          location: baseRequest.location,
          requestId: baseRequest.requestId,
          conversationId: workflowConversationId,
        },
        item
      );

      localStorage.setItem("meetroWorkCenterTab", "active");
      localStorage.setItem("activeWorkCenterTab", "active");

      setVisitOutcomeTarget(null);
      openWorkTab("active");
      setRefreshKey((prev) => prev + 1);
      return;
    }

    if (outcome === "need_materials") {
      const materialsWorkflow = JSON.parse(
        localStorage.getItem("meetroMaterialsWorkflow") || "[]"
      );

      const materialsRecord = {
        id: `materials-${Date.now()}`,
        requestId: baseRequest.requestId || baseRequest.id,
        scheduleId: item.id || "",
        conversationId: workflowConversationId,
        projectTitle: baseRequest.title,
        service: baseRequest.service,
        location: baseRequest.location,
        status: "needed",
        provider: "undecided",
        source: "visit_outcome",
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(
        "meetroMaterialsWorkflow",
        JSON.stringify([materialsRecord, ...materialsWorkflow])
      );

      localStorage.setItem("pendingWorkStatus", "waiting_materials");
      localStorage.setItem("pendingWorkType", item.appointmentType || "scheduled");
      localStorage.setItem("pendingWorkWorkflowStage", "materials");
      localStorage.setItem("pendingWorkWorkflowStatus", "waiting_materials");
      localStorage.setItem("pendingWorkSource", "visit_outcome");
      localStorage.setItem("pendingWorkService", baseRequest.service);
      localStorage.setItem("pendingWorkLocation", baseRequest.location);
      localStorage.setItem("pendingWorkConversationId", workflowConversationId);
      localStorage.setItem("pendingWorkScheduleId", item.id || "");
      localStorage.setItem("pendingWorkRequestId", baseRequest.requestId || baseRequest.id);
      localStorage.setItem("pendingWorkReason", "waiting_materials");

      appendWorkflowTimelineEvent(
        {
          type: "materials_needed",
          title:
            translate("workCenterMaterialsNeeded", activeLanguage),
          service: baseRequest.service,
          location: baseRequest.location,
          requestId: baseRequest.requestId,
          conversationId: workflowConversationId,
        },
        item
      );

      localStorage.setItem("meetroWorkCenterTab", "quotes");
      localStorage.setItem("activeWorkCenterTab", "quotes");

      setVisitOutcomeTarget(null);
      openWorkTab("quotes");
      setRefreshKey((prev) => prev + 1);
      return;
    }

    const pendingStatusMap = {
      waiting_customer_decision: "waiting_customer",
      follow_up_required: "follow_up_required",
      not_good_fit: "archived_not_good_fit",
    };

    const pendingStatus = pendingStatusMap[outcome] || "waiting_customer";

    localStorage.setItem("pendingWorkStatus", pendingStatus);
    localStorage.setItem("pendingWorkType", item.appointmentType || "scheduled");
    localStorage.setItem("pendingWorkWorkflowStage", "pending_decision");
    localStorage.setItem("pendingWorkWorkflowStatus", pendingStatus);
    localStorage.setItem("pendingWorkSource", "visit_outcome");
    localStorage.setItem("pendingWorkService", baseRequest.service);
    localStorage.setItem("pendingWorkLocation", baseRequest.location);
    localStorage.setItem("pendingWorkConversationId", workflowConversationId);
    localStorage.setItem("pendingWorkScheduleId", item.id || "");
    localStorage.setItem("pendingWorkRequestId", baseRequest.requestId || baseRequest.id);
    localStorage.setItem("pendingWorkReason", outcome);

    appendWorkflowTimelineEvent(
      {
        type: outcome,
        title:
          outcome === "follow_up_required"
            ? translate("workCenterFollowUpRequired", activeLanguage)
            : outcome === "not_good_fit"
            ? translate("workCenterNotAGoodFit", activeLanguage)
            : translate("workCenterWaitingCustomerDecision", activeLanguage),
        service: baseRequest.service,
        location: baseRequest.location,
        requestId: baseRequest.requestId,
        conversationId: workflowConversationId,
      },
      item
    );

    localStorage.setItem("meetroWorkCenterTab", "pending");
    localStorage.setItem("activeWorkCenterTab", "pending");

    setVisitOutcomeTarget(null);
    openWorkTab("pending");
    setRefreshKey((prev) => prev + 1);
  }

  async function confirmDeleteScheduleVisit() {
    if (!scheduleDeleteTarget) return;
    if (!canReadLegacyWorkflowStorage()) return;

    const schedule = JSON.parse(
      localStorage.getItem("meetro_business_schedule") || "[]"
    );

    const updatedSchedule = schedule.filter(
      (item) => item.id !== scheduleDeleteTarget.id
    );

    localStorage.setItem(
      "meetro_business_schedule",
      JSON.stringify(updatedSchedule)
    );

    await cancelAppointmentReminderNotifications(scheduleDeleteTarget);

    setScheduleDeleteTarget(null);
    setRefreshKey((prev) => prev + 1);
  }

  const activeEmergencyRecord = (() => {
    if (!canReadLegacyWorkflowStorage()) return {};
    try {
      return JSON.parse(
        localStorage.getItem("activeEmergencyRecord") || "{}"
      );
    } catch {
      return {};
    }
  })();

  const selectedService =
    canReadLegacyWorkflowStorage()
      ? activeEmergencyRecord.service ||
        activeEmergencyRecord.title ||
        localStorage.getItem("selectedEmergencyService") ||
        ""
      : "";

  const dispatchStatus =
    canReadLegacyWorkflowStorage()
      ? activeEmergencyRecord.status ||
        localStorage.getItem("emergencyDispatchStatus") ||
        ""
      : "";

  const hasActiveEmergency =
    canReadLegacyWorkflowStorage() &&
    Boolean(dispatchStatus) &&
    dispatchStatus !== "completed" &&
    dispatchStatus !== "cancelled" &&
    dispatchStatus !== "closed" &&
    dispatchStatus !== "archived";

  const storedCompletedJobsCount = canReadLegacyWorkflowStorage()
    ? Number(localStorage.getItem("completedJobsCount") || "0")
    : 0;

  const [quoteHistoryVersion, setQuoteHistoryVersion] = useState(0);
  quoteHistoryVersion;

  const [quoteStatusFilter, setQuoteStatusFilter] = useState("pending");

  const quoteHistory = readMeetroArray("workCenterQuoteHistory");

  const quoteLifecycleStatuses = [
    "all",
    "draft",
    "sent",
    "viewed",
    "accepted",
    "revision_requested",
    "declined",
    "expired",
    "converted_to_job",
    "completed",
  ];

  const quoteStatusLabels = {
    all: translate("jobsHiringCategoryAll", activeLanguage),
    draft: translate("quoteDraft", activeLanguage),
    drafts: translate("workCenterDrafts", activeLanguage),
    pending: translate("teamMemberStatusPending", activeLanguage),
    sent: translate("documentStatusSent", activeLanguage),
    viewed: translate("workCenterViewed", activeLanguage),
    accepted: translate("workCenterAccepted", activeLanguage),
    revision_requested: translate("workCenterRevision", activeLanguage),
    waiting_approval: translate("workCenterWaitingApproval", activeLanguage),
    approved: translate("documentStatusApproved", activeLanguage),
    paid: translate("documentStatusPaid", activeLanguage),
    declined: translate("documentStatusDeclined", activeLanguage),
    expired: translate("workCenterExpired", activeLanguage),
    converted_to_job: translate("activeJob", activeLanguage),
    completed: translate("completed", activeLanguage),
  };

  function getQuoteDisplayGroup(quote = {}) {
    const status = normalizeQuoteStatus(quote);

    if (["accepted", "approved", "paid", "converted_to_job", "completed"].includes(status)) {
      return "accepted";
    }

    if (["draft", "drafts"].includes(status)) {
      return "drafts";
    }

    return "pending";
  }

  function getQuoteDisplayTime(quote = {}) {
    const status = normalizeQuoteStatus(quote);
    const dateValue =
      quote.sentAt ||
      quote.updatedAt ||
      quote.createdAt ||
      quote.revisionRequestedAt ||
      "";

    const prefix =
      status === "draft"
        ? translate("workCenterUpdated", activeLanguage)
        : translate("documentStatusSent", activeLanguage);

    if (!dateValue) {
      return translate("workCenterDocumentPending", activeLanguage, { prefix });
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    const daysAgo = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (daysAgo <= 0) {
      return translate("workCenterDocumentToday", activeLanguage, { prefix });
    }

    if (daysAgo === 1) {
      return translate("workCenterDocumentYesterday", activeLanguage, { prefix });
    }

    if (daysAgo < 7) {
      return translate("workCenterDaysAgo", activeLanguage, { prefix, count: daysAgo });
    }

    return `${prefix} ${formatLocaleDate(date, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }, activeLanguage)}`;
  }

  function normalizeQuoteStatus(quote) {
    return quote?.status || quote?.quoteStatus || "draft";
  }

  function openQuoteBuilderForOperationalQuote(quote = {}) {
    if (quote.quoteId || quote.id || normalizeQuoteStatus(quote) !== "evaluation_complete") {
      localStorage.setItem("selectedQuoteForEdit", JSON.stringify(quote));
    } else {
      localStorage.removeItem("selectedQuoteForEdit");
    }

    localStorage.setItem(
      "selectedWorkCenterRequest",
      JSON.stringify({
        requestId: quote.requestId || quote.projectId || quote.id || quote.quoteId || "",
        id: quote.requestId || quote.projectId || quote.id || quote.quoteId || "",
        title: quote.projectTitle || quote.title || quote.service || "",
        description: quote.description || quote.notes || "",
        homeownerName: quote.homeownerName || quote.customerName || quote.customer || "",
        customerName: quote.homeownerName || quote.customerName || quote.customer || "",
        evaluationComplete: true,
        sourceQuote: quote,
      })
    );
    localStorage.setItem("quoteBuilderReturnPage", "workCenter");
    localStorage.setItem("meetroWorkCenterTab", "quotes");
    localStorage.setItem("activeWorkCenterTab", "quotes");
    setPage("quoteBuilder");
  }

  function getQuoteWorkflowPresentation(quote = {}) {
    const status = normalizeQuoteStatus(quote);
    const statusLabel = quoteStatusLabels[status] || quoteStatusLabels.draft;
    const makeStatusUpdate = (nextStatus, nextFilter = quoteStatusFilter) => () => {
      updateQuoteLifecycleStatus(quote.quoteId || quote.id, nextStatus);
      if (nextFilter) setQuoteStatusFilter(nextFilter);
    };

    if (["evaluation_complete", "evaluation_completed"].includes(status)) {
      return {
        statusLabel: translate("workCenterEvaluationComplete", activeLanguage),
        nextStep: translate("workCenterPrepareTheCustomerProposal", activeLanguage),
        actionLabel: translate("assistantProjectBriefNextCreateProposal", activeLanguage),
        onAction: () => openQuoteBuilderForOperationalQuote(quote),
      };
    }

    if (["draft", "drafts"].includes(status)) {
      return {
        statusLabel,
        nextStep: translate("workCenterContinueTheProposalBeforeSending", activeLanguage),
        actionLabel: translate("assistantFieldActionContinueProposal", activeLanguage),
        onAction: () => openQuoteBuilderForOperationalQuote(quote),
      };
    }

    if (["proposal_ready", "ready", "ready_to_send"].includes(status)) {
      return {
        statusLabel: translate("workCenterProposalReady", activeLanguage),
        nextStep: translate("workCenterSendTheProposalToTheCustomer", activeLanguage),
        actionLabel: translate("assistantProjectBriefNextSendProposal", activeLanguage),
        onAction: makeStatusUpdate("sent", "pending"),
      };
    }

    if (["sent", "viewed", "waiting_approval", "proposal_sent"].includes(status)) {
      return {
        statusLabel: status === "waiting_approval" || status === "proposal_sent"
          ? quoteStatusLabels.waiting_approval
          : statusLabel,
        nextStep: translate("workCenterRecordApprovalWhenTheCustomerAccepts", activeLanguage),
        actionLabel: translate("workCenterRecordApproval", activeLanguage),
        onAction: makeStatusUpdate("accepted", "accepted"),
      };
    }

    if (["accepted", "approved", "quote_approved"].includes(status)) {
      return {
        statusLabel: translate("documentStatusApproved", activeLanguage),
        nextStep: translate("workCenterRecordPaymentOrDeposit", activeLanguage),
        actionLabel: translate("workCenterRecordPayment", activeLanguage),
        onAction: makeStatusUpdate("paid", "accepted"),
      };
    }

    if (["paid", "payment_received", "deposit_received"].includes(status)) {
      return {
        statusLabel: quoteStatusLabels.paid,
        nextStep: translate("workCenterScheduleTheWorkDate", activeLanguage),
        actionLabel: translate("workCenterScheduleWork", activeLanguage),
        onAction: () => startScheduleWorkFromQuote(quote),
      };
    }

    if (status === "revision_requested") {
      return {
        statusLabel,
        nextStep: translate("workCenterUpdateAndResendTheProposal", activeLanguage),
        actionLabel: translate("assistantFieldActionContinueProposal", activeLanguage),
        onAction: () => openQuoteBuilderForOperationalQuote(quote),
      };
    }

    if (status === "converted_to_job") {
      return {
        statusLabel,
        nextStep: translate("workCenterContinueFromActiveWork", activeLanguage),
        actionLabel: translate("openActiveWorkAction", activeLanguage),
        onAction: () => openWorkTab("active"),
      };
    }

    return {
      statusLabel,
      nextStep: getQuoteOperationalNextAction(quote),
      actionLabel: translate("reviewJob", activeLanguage),
      onAction: () => setQuoteViewTarget(quote),
    };
  }

  function isExternalQuote(quote) {
    return (
      quote?.source === "external" ||
      quote?.quoteSource === "external" ||
      quote?.type === "external"
    );
  }

  function formatQuoteCurrency(value) {
    const amount = Number(value || 0);
    return `$${Number.isFinite(amount) ? amount.toFixed(0) : "0"}`;
  }

  function getQuoteOperationalNextAction(quote = {}) {
    const status = normalizeQuoteStatus(quote);

    if (status === "accepted") {
      return translate("workCenterScheduleWorkOrCreateTheActiveJob", activeLanguage);
    }

    if (status === "revision_requested") {
      return translate("workCenterReviewAndSendAnUpdatedQuote", activeLanguage);
    }

    if (status === "declined") {
      return translate("workCenterNoPendingAction", activeLanguage);
    }

    if (status === "converted_to_job") {
      return translate("workCenterContinueThisJobFromActiveWork", activeLanguage);
    }

    if (status === "completed") {
      return translate("workCenterReviewTheRecordInHistory", activeLanguage);
    }

    return isExternalQuote(quote)
      ? translate("workCenterMarkTheResponseManuallyOrInviteTheCustomer", activeLanguage)
      : translate("workCenterWaitForTheCustomerDecision", activeLanguage);
  }

  function getActiveJobOperationalNextAction(status) {
    const normalized = normalizeWorkflowStage(status || "active");

    if (normalized === "on_the_way") {
      return translate("nextStepArrive");
    }

    if (normalized === "arrived") {
      return translate("nextStepBeginWork");
    }

    if (normalized === "working") {
      return translate("nextStepContinueWork");
    }

    if (normalized === "paused_materials") {
      return translate("nextStepResumeMaterials");
    }

    if (normalized === "completed") {
      return translate("workCenterCreateReceiptOrReviewClosure", activeLanguage);
    }

    return translate("workCenterReviewDetailsToContinueTheWork", activeLanguage);
  }

  function isMeetroLinkedSchedule(item) {
    return Boolean(
      item?.conversationId ||
        item?.projectConversationId ||
        item?.activeConversationId ||
        item?.requestId ||
        item?.selectedHomeownerRequestId ||
        item?.source === "meetro_chat" ||
        item?.workflowSource === "meetro_chat_schedule" ||
        item?.workflowSource === "meetro_chat_message_schedule"
    );
  }

  function getScheduleSourceLabel(item) {
    if (isMeetroLinkedSchedule(item)) {
      return translate("workCenterMeetroCustomerAppointment", activeLanguage);
    }

    if (
      item?.source === "manual_customer_entry" ||
      item?.customer?.source === "manual_customer_entry" ||
      item?.isMeetroUser === false
    ) {
      return translate("workCenterManualCustomer", activeLanguage);
    }

    if (item?.source === "manual") {
      return translate("workCenterManual", activeLanguage);
    }

    return item?.source || translate("schedule");
  }

  const quoteFilterTabs = [
    { key: "pending", label: translate("teamMemberStatusPending", activeLanguage) },
    { key: "accepted", label: translate("workCenterAccepted2", activeLanguage) },
    { key: "drafts", label: translate("workCenterDrafts", activeLanguage) },
  ];

  const quoteFilterCounts = quoteFilterTabs.reduce((counts, tab) => {
    counts[tab.key] = quoteHistory.filter(
      (quote) => quote && getQuoteDisplayGroup(quote) === tab.key
    ).length;
    return counts;
  }, {});

  const filteredQuoteHistory = quoteHistory.filter(
    (quote) => quote && getQuoteDisplayGroup(quote) === quoteStatusFilter
  );

  function updateQuoteLifecycleStatus(quoteId, nextStatus) {
    if (!canReadLegacyWorkflowStorage()) return;
    const savedQuotes = JSON.parse(
      localStorage.getItem("workCenterQuoteHistory") ||
        localStorage.getItem("meetroQuoteHistory") ||
        localStorage.getItem("quoteHistory") ||
        "[]"
    );

    const now = new Date().toISOString();

    const updatedQuotes = savedQuotes.map((quote) => {
      if (String(quote.quoteId || quote.id || "") !== String(quoteId || "")) return quote;

      const updatedQuote = {
        ...quote,
        status: nextStatus,
        quoteStatus: nextStatus,
        updatedAt: now,
      };

      if (nextStatus === "sent") updatedQuote.sentAt = quote.sentAt || now;
      if (nextStatus === "viewed") updatedQuote.viewedAt = quote.viewedAt || now;
      if (nextStatus === "accepted") updatedQuote.acceptedAt = quote.acceptedAt || now;
      if (nextStatus === "paid") updatedQuote.paidAt = quote.paidAt || now;
      if (nextStatus === "revision_requested") {
        updatedQuote.revisionRequestedAt = quote.revisionRequestedAt || now;
      }
      if (nextStatus === "declined") updatedQuote.declinedAt = quote.declinedAt || now;
      if (nextStatus === "converted_to_job") {
        updatedQuote.convertedToJobAt = quote.convertedToJobAt || now;

        const activeJobFromQuote = {
          ...updatedQuote,
          jobId: updatedQuote.jobId || `job-${Date.now()}`,
          source: "quote",
          type: "quote",
          status: "active",
          stage: "active",
          createdFromQuote: true,
        };

        localStorage.setItem(
          "activeJobSnapshot",
          JSON.stringify(activeJobFromQuote)
        );

        localStorage.setItem(
          "activeWorkSnapshot",
          JSON.stringify(activeJobFromQuote)
        );

        localStorage.setItem("activeJobStatus", "active");
        localStorage.setItem("activeWorkStage", "active");
      }
      if (nextStatus === "completed") updatedQuote.completedAt = quote.completedAt || now;

      return updatedQuote;
    });

    localStorage.setItem("workCenterQuoteHistory", JSON.stringify(updatedQuotes));
    localStorage.setItem("meetroQuoteHistory", JSON.stringify(updatedQuotes));
    localStorage.setItem("quoteHistory", JSON.stringify(updatedQuotes));

    try {
      const updatedQuote = updatedQuotes.find(
        (quote) => String(quote.quoteId || quote.id || "") === String(quoteId || "")
      );
      const identity = getProjectIdentity({
        projectId: updatedQuote?.projectId,
        requestId: updatedQuote?.requestId,
        title: updatedQuote?.projectTitle || updatedQuote?.title,
      });

      if (!identity.projectId) {
        console.warn("Work Center shadow quote lifecycle link skipped.", {
          quoteId: quoteId || "",
          action: nextStatus,
          warnings: identity.warnings,
        });
      } else {
        const shadowResult = linkQuoteToProject({
          projectId: identity.projectId,
          quoteRequestId: updatedQuote?.requestId || "",
          quoteId: updatedQuote?.quoteId || quoteId || "",
          metadata: {
            action: nextStatus,
            source: "work-center-quote-history",
          },
        });

        if (!shadowResult.ok || shadowResult.warnings.length > 0) {
          console.warn(
            "Work Center shadow quote lifecycle link warning.",
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
      console.warn("Work Center shadow quote lifecycle link failed.", error);
    }

    setQuoteHistoryVersion((version) => version + 1);
  }


  const acceptedQuoteReadyItems = quoteHistory.filter((quote) => {
    if (!quote) return false;
    const status = normalizeQuoteStatus(quote);
    return (
      !quote.movedToActiveAt &&
      ["accepted", "approved", "quote_approved"].includes(status)
    );
  });
  const acceptedQuoteHistoryAlerts = acceptedQuoteReadyItems.length;
  const firstAcceptedQuoteReady = acceptedQuoteReadyItems[0] || null;

  const revisionQuoteAlerts = quoteHistory.filter(
    (quote) =>
      quote &&
      !quote.movedToActiveAt &&
      quote.status === "revision_requested"
  ).length;

  const professionalNotifications = getNotifications().filter(
    (item) =>
      !item.read &&
      (item.targetRole === "professional" || item.targetRole === "all")
  );

  const quoteAcceptedAlerts = professionalNotifications.filter(
    (item) => item.type === "quote_accepted"
  ).length;

  const quoteRevisionNotifications = professionalNotifications.filter(
    (item) => item.type === "quote_revision_requested"
  ).length;

  const scheduleResponseNotifications = professionalNotifications.filter((item) =>
    ["appointment_confirmed", "appointment_change_requested", "schedule_response"].includes(
      item.type
    )
  );

  const firstScheduleResponseNotification = scheduleResponseNotifications[0];

  const totalQuoteAlerts =
    acceptedQuoteHistoryAlerts +
    revisionQuoteAlerts;

  const pendingAlertsCount = 0;

  const activeJobsAlertCount =
    ["accepted", "enroute", "arrived", "started"].includes(dispatchStatus)
      ? 1
      : 0;

  const materialsAlertCount =
    dispatchStatus === "paused_materials" ? 1 : 0;

  const storedTotalJobRevenue = canReadLegacyWorkflowStorage()
    ? Number(localStorage.getItem("totalJobRevenue") || "0")
    : 0;

  const businessCategory =
    localStorage.getItem("businessCategory") || "";

  const professionalLeadMatchProfile = {
    ...getStoredProfessionalMatchProfile(),
    businessCategory,
    category: businessCategory,
  };

  const emergencyCategory =
    localStorage.getItem("selectedEmergencyCategory") ||
    inferRequestCategory({ service: selectedService });

  const canBusinessSeeEmergency =
    canProfessionalSeeLocalLead(
      professionalLeadMatchProfile,
      {
        category: emergencyCategory,
        service: selectedService,
        type: "emergency",
        isEmergency: true,
      }
    );
  const hasEmergencyChatWorkflow =
    selectedService &&
    canBusinessSeeEmergency &&
    ["pending", "accepted", "enroute", "arrived", "started", "completed"].includes(
      dispatchStatus
    );

  const homeownerRequests = readMeetroArray("homeownerRequests");
  const businessName =
    localStorage.getItem("businessName") ||
    localStorage.getItem("companyName") ||
    "";
  const professionalWorkMetrics = getProfessionalWorkMetrics({
    homeownerRequests,
    professional: professionalLeadMatchProfile,
  });

  const savedCompletedProjects = readMeetroArray("completedProjects");

  const completedHomeownerProjects = homeownerRequests
    .filter((project) => project && project.status === "completed")
    .map((project) => ({
      ...project,
      revenue:
        project.revenue ||
        project.acceptedQuote?.amount ||
        project.quoteAmount ||
        0,
      source: "homeownerProject",
    }));

  const completedScheduleProjects = readMeetroArray("meetro_business_schedule")
    .filter((item) => item && item.status === "Completed")
    .map((item) => ({
      title: item.title,
      customer: item.location || "Customer",
      revenue: item.amount || 0,
      completedAt: item.completedAt || new Date().toISOString(),
      source: "schedule",
    }));

  const completedProjects = [
    ...completedScheduleProjects,
    ...savedCompletedProjects,
    ...completedHomeownerProjects.filter(
      (project) =>
        project &&
        !savedCompletedProjects.some(
          (saved) =>
            saved &&
            (saved.requestId || saved.id) ===
            (project.requestId || project.id)
        )
    ),
  ].filter(Boolean);

  const completedProjectsRevenue = completedProjects.reduce(
    (sum, project) =>
      sum +
      Number(
        project?.revenue ||
          project?.acceptedQuote?.amount ||
          project?.quoteAmount ||
          0
      ),
    0
  );

  const completedJobsCount =
    professionalWorkMetrics.completedJobsCount || storedCompletedJobsCount;

  const totalJobRevenue =
    professionalWorkMetrics.totalJobRevenue || storedTotalJobRevenue || completedProjectsRevenue;

  const averageJobValue =
    professionalWorkMetrics.averageJobValue ||
    (Number(completedJobsCount) > 0
      ? Math.round(Number(totalJobRevenue) / Number(completedJobsCount))
      : 0);

  function isDirectRelationshipRequest(request = {}) {
    return (
      request.requestChannel === "direct" ||
      request.visibility === "direct" ||
      request.directRequest === true ||
      request.isDirectRequest === true ||
      request.source === "hire_again_direct_request"
    );
  }

  function isDirectRequestForThisBusiness(request = {}) {
    const businessNameValue = String(businessName || "").trim().toLowerCase();
    const targetName = String(
      request.targetProfessionalName ||
        request.assignedProfessionalName ||
        request.selectedProfessional ||
        ""
    )
      .trim()
      .toLowerCase();

    return Boolean(
      isDirectRelationshipRequest(request) &&
        businessNameValue &&
        targetName &&
        businessNameValue === targetName
    );
  }

  const pendingProjectRequests = professionalWorkMetrics.newLeads.filter(
    (request) => request && !isDirectRelationshipRequest(request)
  );

  const hasPendingRequest =
    selectedService &&
    canBusinessSeeEmergency &&
    dispatchStatus === "pending";

  const hasJobStatus =
    selectedService &&
    canBusinessSeeEmergency &&
    ["accepted", "enroute", "arrived", "started"].includes(
      dispatchStatus
    );

  const canOpenDispatch =
    ["accepted", "enroute", "arrived", "started"].includes(dispatchStatus);

  const projectedActiveRequestJobs = homeownerRequests
    .filter((request) => request && isRequestProfessionalWork(request))
    .filter((request) => !isRequestClosedForProfessionalProjection(request))
    .filter(
      (request) =>
        isDirectRequestForThisBusiness(request) ||
        isRequestConnectedToProfessional(request, professionalLeadMatchProfile)
    )
    .map((request) => ({
      ...request,
      id: request.requestId || request.id || request.projectId,
      jobId: request.jobId || request.requestId || request.id,
      requestId: request.requestId || request.id,
      conversationId: request.conversationId || request.projectConversationId || "",
      service:
        request.service ||
        request.serviceCategory ||
        request.category ||
        request.title ||
        translate("activeWorkFallback"),
      location:
        request.location ||
        request.fullAddress ||
        request.address ||
        "",
      customer:
        request.customerName ||
        request.homeownerName ||
        request.name ||
        (translate("wcCustomer", activeLanguage)),
      status:
        request.workStatus ||
        request.activeWorkStatus ||
        request.workflowStage ||
        request.status ||
        "active",
      source: "homeownerRequests",
    }));

  const activeJobs = [
    ...(hasJobStatus
      ? [
          {
            id: "emergency-active-1",
            service: selectedService,
            status: dispatchStatus,
            eta: dispatchStatus === "completed" ? "0" : "12",
            customer:
              translate("workCenterHomeownerWaitingForUpdate", activeLanguage),
          },
        ]
      : []),
    ...projectedActiveRequestJobs,
  ];

  const missionPendingStatus =
    localStorage.getItem("pendingWorkStatus") || "";

  const missionChangeOrders = homeownerRequests.flatMap((project) =>
    (project?.changeOrders || [])
      .filter((order) => order.status === "pending_professional_review")
      .map((order) => ({ ...order, project }))
  );

  const missionActiveContext = getActiveWorkContext();
  const missionActiveStage = normalizeWorkflowStage(
    missionActiveContext.stage || missionActiveContext.type
  );
  const missionActiveCustomer =
    missionActiveContext.customerName ||
    missionActiveContext.homeownerName ||
    missionActiveContext.customer ||
    localStorage.getItem("pendingWorkCustomer") ||
    localStorage.getItem("activeWorkCustomer") ||
    (translate("wcCustomer", activeLanguage));
  const missionActiveService =
    missionActiveContext.service ||
    missionActiveContext.title ||
    missionActiveContext.projectTitle ||
    localStorage.getItem("pendingWorkService") ||
    localStorage.getItem("activeWorkService") ||
    (translate("workCenterServiceVisit", activeLanguage));
  const missionHasCurrentWork =
    Boolean(missionActiveContext.id || missionActiveContext.service) &&
    !["completed", "cancelled"].includes(missionActiveStage);
  const missionActiveConversationId =
    activeWorkSnapshot?.conversationId ||
    localStorage.getItem("activeWorkConversationId") ||
    activeJobSnapshot?.conversationId ||
    localStorage.getItem("activeConversationId") ||
    "";
  const missionMaterialsBlocked =
    materialsAlertCount > 0 ||
    missionActiveStage === "paused_materials" ||
    missionPendingStatus === "waiting_materials";

  const missionSchedule = readMeetroArray("meetro_business_schedule");
  const missionTodayKey = new Date().toISOString().slice(0, 10);
  const missionTodaySchedule = missionSchedule
    .filter(
      (item) =>
        item &&
        item.status !== "Completed" &&
        (!item.date || item.date === missionTodayKey)
    )
    .slice(0, 3);
  const missionTodayAction = missionTodaySchedule[0] || null;
  const missionActionQuote =
    quoteHistory.find(
      (quote) =>
        quote &&
        !quote.movedToActiveAt &&
        ["accepted", "revision_requested"].includes(
          normalizeQuoteStatus(quote)
        )
    ) || null;
  const missionHasActiveJob =
    missionHasCurrentWork &&
    [
      "active",
      "quote_approved",
      "on_the_way",
      "arrived",
      "working",
      "paused_materials",
      "waiting_customer",
    ].includes(missionActiveStage);

  const missionCurrentAction = (() => {
    if (hasEmergencyChatWorkflow) {
      return {
        type: "emergency",
        status: getStatusLabel(),
        title: selectedService,
        meta: translate("emergencyContinuesInChat"),
        next: translate("openEmergencyChat"),
        button: translate("openEmergencyChat"),
      };
    }

    if (missionHasActiveJob) {
      return {
        type: "activeJob",
        status: getWorkflowStageLabel(missionActiveStage),
        title:
          missionActiveContext.service || translate("activeWorkFallback"),
        meta:
          missionActiveContext.location || translate("locationPending"),
        next:
          missionActiveStage === "paused_materials"
            ? translate("nextStepResumeMaterials")
            : missionActiveStage === "arrived"
            ? translate("nextStepBeginWork")
            : missionActiveStage === "on_the_way"
            ? translate("nextStepArrive")
            : translate("nextStepContinueWork"),
        button: missionActiveConversationId
          ? translate("openChat")
          : translate("openProject"),
      };
    }

    if (missionTodayAction) {
      return {
        type: "scheduledVisit",
        status: translate("today"),
        title: missionTodayAction.title || translate("scheduledVisit"),
        meta: [
          formatScheduleTime(missionTodayAction.time),
          missionTodayAction.location,
        ]
          .filter(Boolean)
          .join(" • "),
        next: translate("prepareJob"),
        button: translate("prepareJob"),
      };
    }

    if (missionActionQuote) {
      const quoteStatus = normalizeQuoteStatus(missionActionQuote);

      return {
        type: "quote",
        status: quoteStatusLabels[quoteStatus],
        title:
          missionActionQuote.projectTitle ||
          missionActionQuote.project_title ||
          translate("quotesNeedAction"),
        meta:
          missionActionQuote.homeownerName ||
          missionActionQuote.customer ||
          "",
        next: translate("quotesNeedAction"),
        button:
          quoteStatus === "revision_requested"
            ? translate("reviseQuoteAction")
            : translate("createActiveJobAction"),
      };
    }

    if (missionPendingStatus) {
      return {
        type: "pendingReview",
        status: getWorkflowStageLabel("review"),
        title:
          localStorage.getItem("pendingWorkService") ||
          translate("pendingOperationalReview"),
        meta:
          localStorage.getItem("pendingWorkLocation") ||
          translate("pendingOperationalReview"),
        next: translate("pendingDecisionWarning"),
        button: translate("openPendingReview"),
      };
    }

    return null;
  })();

  function acceptEmergencyRequest() {
    openActiveEmergencyConversation(setPage, "contractorDashboard");
  }

  function declineEmergencyRequest() {
    localStorage.setItem("emergencyDispatchStatus", "cancelled");
    window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));
    setRefreshKey((prev) => prev + 1);
  }

  function normalizeWorkflowStage(stage) {
    const rawStage = String(stage || "").trim();

    const normalized = rawStage
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/-/g, "_")
      .toLowerCase();

    const stageMap = {
      pending: "requested",
      review: "review",
      pending_professional_review: "review",
      scheduled: "scheduled",

      quote: "quote_required",
      quote_required: "quote_required",
      quote_sent: "quote_sent",
      quote_accepted: "quote_approved",
      quote_approved: "quote_approved",

      accepted: "active",
      active: "active",

      enroute: "on_the_way",
      on_the_way: "on_the_way",
      ontheway: "on_the_way",

      arrived: "arrived",

      started: "working",
      working: "working",

      pausedmaterials: "paused_materials",
      paused_materials: "paused_materials",
      waiting_materials: "paused_materials",

      waiting_customer: "waiting_customer",
      paused_customer: "waiting_customer",

      completed: "completed",
      cancelled: "cancelled",
      canceled: "cancelled",
    };

    return stageMap[normalized] || normalized || "review";
  }

  function getWorkflowStageLabel(stage) {
    const normalized = normalizeWorkflowStage(stage);

    const labels = {
      requested: translate("workflowRequested", activeLanguage),
      review: translate("homeReview", activeLanguage),
      scheduled: translate("scheduled", activeLanguage),
      quote_required: translate("workflowQuoteNeeded", activeLanguage),
      quote_sent: translate("workflowQuoteSent", activeLanguage),
      quote_approved: translate("workflowQuoteApproved", activeLanguage),
      active: translate("homeMyProjectsActive", activeLanguage),
      on_the_way: translate("workflowOnTheWay", activeLanguage),
      arrived: translate("arrivedShort", activeLanguage),
      working: translate("working", activeLanguage),
      paused_materials: translate("workflowPausedMaterials", activeLanguage),
      waiting_customer: translate("workflowWaitingCustomer", activeLanguage),
      completed: translate("completed", activeLanguage),
      cancelled: translate("workflowCancelled", activeLanguage),
    };

    return labels[normalized] || normalized;
  }

  function normalizeWorkflowStage(stage) {
    const rawStage = String(stage || "").trim();

    const normalized = rawStage
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/-/g, "_")
      .toLowerCase();

    const stageMap = {
      pending: "requested",
      review: "review",
      pending_professional_review: "review",
      scheduled: "scheduled",

      quote: "quote_required",
      quote_required: "quote_required",
      quote_sent: "quote_sent",
      quote_accepted: "quote_approved",
      quote_approved: "quote_approved",

      accepted: "active",
      active: "active",

      enroute: "on_the_way",
      on_the_way: "on_the_way",
      ontheway: "on_the_way",

      arrived: "arrived",

      started: "working",
      working: "working",

      pausedmaterials: "paused_materials",
      paused_materials: "paused_materials",
      waiting_materials: "paused_materials",

      waiting_customer: "waiting_customer",
      paused_customer: "waiting_customer",

      completed: "completed",
      cancelled: "cancelled",
      canceled: "cancelled",
    };

    return stageMap[normalized] || normalized || "review";
  }

  function getWorkflowStageLabel(stage) {
    const normalized = normalizeWorkflowStage(stage);

    const labelKeys = {
      requested: "workflowRequested",
      review: "workflowReview",
      scheduled: "workflowScheduled",
      quote_required: "workflowQuoteNeeded",
      quote_sent: "workflowQuoteSent",
      quote_approved: "workflowQuoteApproved",
      active: "workflowActive",
      on_the_way: "workflowOnTheWay",
      arrived: "workflowArrived",
      working: "workflowWorking",
      paused_materials: "workflowPausedMaterials",
      waiting_customer: "workflowWaitingCustomer",
      completed: "workflowCompleted",
      cancelled: "workflowCancelled",
    };

    return translate(labelKeys[normalized] || "workflowReview");
  }

  function getWorkflowActivityNote(stage) {
    const normalized = normalizeWorkflowStage(stage);

    const noteKeys = {
      on_the_way: "workflowNoteOnTheWay",
      arrived: "workflowNoteArrived",
      working: "workflowNoteWorking",
      paused_materials: "workflowNotePausedMaterials",
      active: "workflowNoteActive",
      review: "workflowNoteReview",
      requested: "workflowNoteReview",
      scheduled: "workflowNoteReview",
      quote_required: "workflowNoteReview",
      quote_sent: "workflowNoteReview",
      quote_approved: "workflowNoteActive",
    };

    return translate(noteKeys[normalized] || "workflowNoteReview");
  }

  function getStatusLabel() {
    if (dispatchStatus === "pending") return t.statusPending;
    if (dispatchStatus === "accepted") return t.statusAccepted;
    if (dispatchStatus === "enroute") return t.statusEnroute;
    if (dispatchStatus === "arrived") return t.statusArrived;
    if (dispatchStatus === "started") return t.statusStarted;
    if (dispatchStatus === "completed") return t.statusCompleted;
    if (dispatchStatus === "cancelled") return t.statusCancelled;
    return "";
  }

  function saveActiveJobContext(job) {
    const jobId = job.id || job.requestId || `job-${Date.now()}`;
    const conversationId =
      job.conversationId ||
      job.activeConversationId ||
      job.projectConversationId ||
      job.schedule?.conversationId ||
      job.quote?.conversationId ||
      job.active?.conversationId ||
      job.request?.conversationId ||
      job.project?.conversationId ||
      `active-job-${jobId}`;

    saveActiveJobSnapshot({
      id: jobId,
      jobId,
      conversationId,
      service: job.service || job.title || "Active Job",
      status: job.status || "active",
      eta: job.eta || "",
      customer: job.customer || job.username || "Customer",
      location: job.location || job.address || "",
    });

    localStorage.setItem("activeJobId", jobId);
    localStorage.setItem("activeConversationId", conversationId);
    localStorage.setItem("activeJobService", job.service || job.title || "Active Job");
    if (job.status) {
      localStorage.setItem("activeJobStatus", job.status);
    }
    localStorage.setItem("activeJobEta", job.eta || "");
    localStorage.setItem("activeJobCustomer", job.customer || job.username || "Customer");
    localStorage.setItem("activeConversationName", job.customer || job.username || "Customer");
    localStorage.setItem("meetroConversationType", "activeJob");

    saveSelectedActiveProject({
      ...job,
      id: jobId,
      conversationId,
      source: job.source || "activeJob",
      project: {
        ...(job.project || job),
        id: jobId,
        conversationId,
      },
    });
  }

  function getRelationshipConversationId(record = {}) {
    return (
      record.conversationId ||
      record.activeConversationId ||
      record.projectConversationId ||
      record.schedule?.conversationId ||
      record.quote?.conversationId ||
      record.active?.conversationId ||
      record.request?.conversationId ||
      record.project?.conversationId ||
      record.requestId ||
      record.projectId ||
      record.id ||
      ""
    );
  }

  function openWorkCenterRelationshipConversation(record = {}, returnSection = "job") {
    const conversationId = getRelationshipConversationId(record);

    if (!conversationId) return false;

    const requestId =
      record.requestId ||
      record.projectId ||
      record.jobId ||
      record.id ||
      record.schedule?.requestId ||
      record.quote?.requestId ||
      conversationId;
    const customerName =
      record.customer ||
      record.customerName ||
      record.username ||
      record.homeownerName ||
      record.schedule?.customerName ||
      record.quote?.customerName ||
      "Customer";
    const projectTitle =
      record.title ||
      record.service ||
      record.projectTitle ||
      record.requestTitle ||
      record.schedule?.title ||
      record.quote?.projectTitle ||
      "Project";

    setWorkCenterReturn();
    localStorage.setItem("selectedPostId", String(requestId));
    localStorage.setItem("selectedHomeownerRequestId", String(requestId));
    localStorage.setItem("selectedQuoteRequest", JSON.stringify(record.project || record));
    localStorage.setItem("activeConversationId", String(conversationId));
    localStorage.setItem("activeConversationName", customerName);
    localStorage.setItem("meetroConversationType", "standard");
    localStorage.setItem("conversationReturnPage", "workCenter");
    localStorage.setItem("returnPage", "workCenter");
    localStorage.setItem("conversationReturnSection", returnSection);
    localStorage.setItem(
      "selectedConversation",
      JSON.stringify({
        id: conversationId,
        type: "work",
        category: "work",
        participantName: customerName,
        homeownerName: customerName,
        projectTitle,
        requestId,
      })
    );
    setPage("conversationThread");
    return true;
  }

  function openActiveWorkProject(job = {}) {
    const conversationId = getRelationshipConversationId(job);
    saveActiveJobContext({
      ...job,
      conversationId,
    });

    if (openWorkCenterRelationshipConversation({ ...job, conversationId }, "active")) {
      return;
    }

    openWorkTab("active");
  }

  function setOperationalActiveWorkStatus(job = {}, nextStatus = "active") {
    if (!canReadLegacyWorkflowStorage()) return;
    const jobId = job.id || job.requestId || job.jobId || `job-${Date.now()}`;
    const nextStage = normalizeWorkflowStage(nextStatus);
    const updatedJob = {
      ...job,
      id: jobId,
      status: nextStage,
      stage: nextStage,
      service: job.service || job.title || "Active Job",
      customer: job.customer || job.username || "Customer",
      location: job.location || job.address || "",
    };

    saveActiveJobSnapshot(updatedJob);
    saveActiveWorkSnapshot({
      ...updatedJob,
      requestId: job.requestId || jobId,
      status: nextStage,
      stage: nextStage,
      source: job.source || "activeJob",
    });

    localStorage.setItem("activeJobId", jobId);
    localStorage.setItem("activeJobStatus", nextStage);
    localStorage.setItem("activeWorkStatus", nextStage);
    localStorage.setItem("activeWorkStage", nextStage);
    localStorage.setItem("activeWorkService", updatedJob.service);
    localStorage.setItem("activeWorkLocation", updatedJob.location);

    if (job.source === "homeownerProject") {
      try {
        const homeownerProjects = JSON.parse(
          localStorage.getItem("homeownerRequests") || "[]"
        );
        const updatedProjects = homeownerProjects.map((project) => {
          const projectId = project.requestId || project.id;
          return String(projectId) === String(jobId)
            ? { ...project, status: nextStage, workStatus: nextStage }
            : project;
        });
        localStorage.setItem("homeownerRequests", JSON.stringify(updatedProjects));
      } catch {
        // Snapshot persistence still keeps the active work card usable.
      }
    }

    updateProjectLifecycleState(updatedJob, nextStage, {
      title: updatedJob.title || updatedJob.service,
      service: updatedJob.service,
      customerName: updatedJob.customer,
      customer: updatedJob.customer,
      location: updatedJob.location,
      requestId: updatedJob.requestId || jobId,
      conversationId: updatedJob.conversationId || job.conversationId || "",
      scheduleId: updatedJob.scheduleId || job.scheduleId || "",
      statusLabel: getWorkflowStageLabel(nextStage),
    });

    window.dispatchEvent(new Event("meetro-active-work-updated"));
    window.dispatchEvent(new Event("storage"));
    setRefreshKey((prev) => prev + 1);
  }

  function openReceiptBuilderForOperationalActiveWork(job = {}) {
    saveActiveJobContext(job);
    localStorage.setItem("activeJobService", job.service || job.title || translate("scheduledWork"));
    localStorage.setItem("activeJobLocation", job.location || job.address || "");
    localStorage.setItem("activeJobCustomer", job.customer || job.username || "");
    localStorage.setItem("invoiceBuilderReturnPage", "workCenter");
    localStorage.setItem("meetroWorkCenterTab", "active");
    localStorage.setItem("activeWorkCenterTab", "active");
    setPage("invoiceBuilder");
  }

  function getActiveWorkWorkflowPresentation(job = {}) {
    const syncedJobStatus =
      job.source === "homeownerProject"
        ? localStorage.getItem("activeWorkStatus") ||
          localStorage.getItem("activeJobStatus") ||
          job.status
        : job.status;
    const normalized = normalizeWorkflowStage(
      syncedJobStatus || "active"
    );
    const currentStatus =
      normalized === "active"
        ? translate("workScheduled", activeLanguage)
        : normalized === "working"
        ? translate("wcFilterInProgress", activeLanguage)
        : normalized === "completed"
        ? translate("completed", activeLanguage)
        : normalized === "receipt_created"
        ? translate("workCenterReceiptCreated", activeLanguage)
        : getWorkflowStageLabel(normalized);

    if (["scheduled", "active", "quote_approved", "work_scheduled"].includes(normalized)) {
      return {
        statusLabel: translate("workScheduled", activeLanguage),
        nextStep: translate("workCenterMarkOnTheWayWhenYouLeave", activeLanguage),
        actionLabel: translate("onTheWay", activeLanguage),
        onAction: () => setOperationalActiveWorkStatus(job, "on_the_way"),
      };
    }

    if (normalized === "on_the_way") {
      return {
        statusLabel: currentStatus,
        nextStep: translate("nextStepArrive"),
        actionLabel: translate("workCenterArrived", activeLanguage),
        onAction: () => setOperationalActiveWorkStatus(job, "arrived"),
      };
    }

    if (normalized === "arrived") {
      return {
        statusLabel: currentStatus,
        nextStep: translate("nextStepBeginWork"),
        actionLabel: translate("assistantProjectBriefNextStartWork", activeLanguage),
        onAction: () => setOperationalActiveWorkStatus(job, "working"),
      };
    }

    if (["working", "started", "in_progress"].includes(normalized)) {
      return {
        statusLabel: translate("wcFilterInProgress", activeLanguage),
        nextStep: translate("workCenterRecordCompletionWhenReady", activeLanguage),
        actionLabel: translate("lifecycleDashboardActionUnavailable", activeLanguage),
        onAction: () => setPage("completionSheet"),
      };
    }

    if (["completed", "ready_for_completion"].includes(normalized)) {
      return {
        statusLabel: translate("completed", activeLanguage),
        nextStep: translate("workCenterCreateInvoiceOrReceipt", activeLanguage),
        actionLabel: translate("workCenterCreateReceipt", activeLanguage),
        onAction: () => openReceiptBuilderForOperationalActiveWork(job),
      };
    }

    if (["receipt_created", "invoice_created"].includes(normalized)) {
      return {
        statusLabel: translate("workCenterReceiptCreated", activeLanguage),
        nextStep: translate("workCenterReviewClosureBeforeMovingThisToHistory", activeLanguage),
        actionLabel: translate("openClosureCenterAction", activeLanguage),
        onAction: showLifecycleAuthorityUnavailable,
      };
    }

    return {
      statusLabel: currentStatus,
      nextStep: getActiveJobOperationalNextAction(normalized),
      actionLabel: translate("reviewJob", activeLanguage),
      onAction: () => openActiveWorkProject(job),
    };
  }

  function setWorkCenterReturn() {
    localStorage.setItem("previousPage", "contractorDashboard");
    localStorage.setItem("returnPage", "contractorDashboard");
    localStorage.setItem("conversationReturnPage", "contractorDashboard");
    localStorage.setItem("projectGalleryReturnPage", "contractorDashboard");
    localStorage.setItem("projectDetailsReturnPage", "contractorDashboard");
    localStorage.setItem("completionReturnPage", "contractorDashboard");
    localStorage.setItem("dispatchReturnPage", "contractorDashboard");
  }

  function openMissionCurrentWork() {
    if (hasEmergencyChatWorkflow) {
      openActiveEmergencyConversation(setPage, "contractorDashboard");
      return;
    }

    if (missionActiveConversationId) {
      localStorage.setItem(
        "activeConversationId",
        missionActiveConversationId
      );
      localStorage.setItem("conversationReturnPage", "contractorDashboard");
      localStorage.setItem("meetroConversationType", "standard");
      setPage("conversationThread");
      return;
    }

    openWorkTab("active");
  }

  function prepareMissionScheduleItem(item) {
    const conversationId =
      item.projectConversationId ||
      item.conversationId ||
      item.requestId ||
      "";

    localStorage.setItem("pendingWorkStatus", "review");
    localStorage.setItem("pendingWorkType", item.appointmentType || "scheduled");
    localStorage.setItem(
      "pendingWorkWorkflowStage",
      item.workflowStage || "scheduling"
    );
    localStorage.setItem(
      "pendingWorkWorkflowStatus",
      item.workflowStatus || item.status || "scheduled"
    );
    localStorage.setItem("pendingWorkSource", item.source || "schedule");
    localStorage.setItem(
      "pendingWorkService",
      item.title || translate("scheduledVisit")
    );
    localStorage.setItem("pendingWorkLocation", item.location || "");
    localStorage.setItem("pendingWorkConversationId", conversationId);
    localStorage.setItem("pendingWorkScheduleId", item.id || "");
    localStorage.setItem("pendingWorkReason", "schedule_review");

    openWorkTab("pending");
    setRefreshKey((prev) => prev + 1);
  }

  function openMissionPriorityAction() {
    if (!missionCurrentAction) return;

    if (missionCurrentAction.type === "emergency") {
      openActiveEmergencyConversation(setPage, "contractorDashboard");
      return;
    }

    if (missionCurrentAction.type === "activeJob") {
      openMissionCurrentWork();
      return;
    }

    if (missionCurrentAction.type === "scheduledVisit") {
      prepareMissionScheduleItem(missionTodayAction);
      return;
    }

    if (missionCurrentAction.type === "quote") {
      setQuoteStatusFilter(normalizeQuoteStatus(missionActionQuote));
      openWorkTab("quotes");
      return;
    }

    openWorkTab("pending");
  }

  const workCenterTodayKey = new Date().toISOString().slice(0, 10);
  const opportunitiesCount =
    professionalWorkMetrics.newLeadCount + (hasPendingRequest ? 1 : 0);
  const hasNewWorkCenterOpportunities =
    opportunitiesCount > 0 && opportunitiesCount > viewedOpportunityCount;
  const upcomingScheduleCount = professionalWorkMetrics.scheduleItems.filter((item) => {
    const status = String(item?.status || "").toLowerCase();
    const isFinished = ["completed", "cancelled", "canceled"].includes(status);
    const isUpcoming = !item?.date || item.date >= workCenterTodayKey;

    return !isFinished && isUpcoming;
  }).length;
  const quoteAttentionCount =
    professionalWorkMetrics.pendingQuoteCount +
    professionalWorkMetrics.quoteResponseAlertCount;
  const activeWorkCount = professionalWorkMetrics.activeWorkCount;
  const savedJobRecordCount = Object.keys(localStorage).filter((key) => {
    if (!key.startsWith("meetro_job_record_")) return false;

    try {
      const records = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(records) && records.length > 0;
    } catch {
      return false;
    }
  }).length;
  const historyRecordCount =
    professionalWorkMetrics.completedJobsCount + savedJobRecordCount;
  const compactCountBadge = (count, labelKey) =>
    `${Number(count) || 0} ${translate(labelKey)}`;
  const closureStatusKeys = [
    "closureStatusReady",
    "closureStatusAwaitingCustomer",
    "closureStatusAwaitingPayment",
    "closureStatusAwaitingDocumentation",
    "closureStatusAwaitingCompliance",
    "closureStatusClosed",
  ];
  const hasResolvedStatus = (value) =>
    ["complete", "completed", "confirmed", "delivered", "paid", "passed", "approved", "resolved", "not_required"].includes(
      String(value || "").toLowerCase()
    );
  const buildClosureReview = (project) => {
    const rawClosureStatus = String(
      project?.closureStatus || project?.closure_status || ""
    ).toLowerCase();
    const isClosed =
      Boolean(project?.closedAt || project?.closureDecisionRef) ||
      rawClosureStatus === "closed";
    const workResolved = Boolean(
      project?.completedAt ||
        project?.completionId ||
        project?.completionRef ||
        hasResolvedStatus(project?.status)
    );
    const customerResolved = Boolean(
      project?.customerConfirmed === true ||
        project?.customerConfirmationRef ||
        project?.customerConfirmedAt ||
        hasResolvedStatus(project?.customerConfirmationStatus)
    );
    const financialResolved = Boolean(
      project?.paymentConfirmed === true ||
        project?.paidAt ||
        project?.paymentReceiptRef ||
        hasResolvedStatus(project?.paymentStatus)
    );
    const documentationResolved = Boolean(
      project?.documentationComplete === true ||
        project?.documentsDeliveredAt ||
        project?.documentationRef ||
        (Array.isArray(project?.documentRefs) && project.documentRefs.length > 0)
    );
    const complianceResolved = Boolean(
      project?.complianceComplete === true ||
        project?.complianceRef ||
        hasResolvedStatus(project?.complianceStatus) ||
        hasResolvedStatus(project?.permitStatus) ||
        hasResolvedStatus(project?.inspectionStatus)
    );

    const categories = [
      {
        key: "work",
        icon: "activeWork",
        title: translate("closureCenterCategoryWork"),
        description: translate("closureCenterCategoryWorkDescription"),
        resolved: workResolved,
      },
      {
        key: "customer",
        icon: "customerRelationships",
        title: translate("closureCenterCategoryCustomer"),
        description: translate("closureCenterCategoryCustomerDescription"),
        resolved: customerResolved,
      },
      {
        key: "financial",
        icon: "payment",
        title: translate("closureCenterCategoryFinancial"),
        description: translate("closureCenterCategoryFinancialDescription"),
        resolved: financialResolved,
      },
      {
        key: "documentation",
        icon: "reportsCenter",
        title: translate("closureCenterCategoryDocumentation"),
        description: translate("closureCenterCategoryDocumentationDescription"),
        resolved: documentationResolved,
      },
      {
        key: "compliance",
        icon: "complianceCenter",
        title: translate("closureCenterCategoryCompliance"),
        description: translate("closureCenterCategoryComplianceDescription"),
        resolved: complianceResolved,
      },
    ];

    const explicitStatusMap = {
      ready: "closureStatusReady",
      ready_for_closure: "closureStatusReady",
      awaiting_customer: "closureStatusAwaitingCustomer",
      awaiting_payment: "closureStatusAwaitingPayment",
      awaiting_documentation: "closureStatusAwaitingDocumentation",
      awaiting_compliance: "closureStatusAwaitingCompliance",
      closed: "closureStatusClosed",
    };
    let statusKey = explicitStatusMap[rawClosureStatus] || "";
    if (isClosed) statusKey = "closureStatusClosed";
    else if (!statusKey && !customerResolved) {
      statusKey = "closureStatusAwaitingCustomer";
    } else if (!statusKey && !financialResolved) {
      statusKey = "closureStatusAwaitingPayment";
    } else if (!statusKey && !documentationResolved) {
      statusKey = "closureStatusAwaitingDocumentation";
    } else if (!statusKey && !complianceResolved) {
      statusKey = "closureStatusAwaitingCompliance";
    } else if (!statusKey) {
      statusKey = "closureStatusReady";
    }

    return {
      project,
      categories,
      statusKey,
      resolvedCount: categories.filter((category) => category.resolved).length,
    };
  };
  const closureReviews = completedProjects.map(buildClosureReview);
  const closureStatusCounts = closureStatusKeys.reduce((counts, statusKey) => {
    counts[statusKey] = closureReviews.filter(
      (review) => review.statusKey === statusKey
    ).length;
    return counts;
  }, {});
  const closureReadyCount = closureStatusCounts.closureStatusReady || 0;
  const dashboardCustomerLabel = (record, fallback) =>
    record?.customerName ||
    record?.homeownerName ||
    record?.homeowner_email ||
    record?.customer ||
    record?.location ||
    fallback;
  const firstOpportunity =
    pendingProjectRequests[0] ||
    (hasPendingRequest
      ? {
          customer: translate("workCenterEmergencyCustomer", activeLanguage),
          title: selectedService,
        }
      : null);
  const firstScheduleItem =
    missionTodayAction ||
    missionSchedule.find((item) => {
      const status = String(item?.status || "").toLowerCase();
      return !["completed", "cancelled", "canceled"].includes(status);
    });
  const firstActiveWorkItem =
    activeJobs[0] ||
    (missionHasCurrentWork
      ? {
          customer: missionActiveCustomer,
          title: missionActiveService,
          status: missionCurrentAction?.status,
        }
      : null);
  const firstClosureReview = closureReviews[0];
  const firstHistoryRecord = completedProjects[0];

  const getWorkCenterJobCustomer = (record = {}) => {
    const customerValue =
      typeof record.customer === "string"
        ? record.customer
        : record.customer?.customerName || record.customer?.name;

    return (
      record.customerName ||
      record.homeownerName ||
      record.homeowner_email ||
      record.homeownerEmail ||
      customerValue ||
      record.username ||
      (translate("wcCustomer", activeLanguage))
    );
  };

  const getWorkCenterJobAddress = (record = {}) => {
    const customerAddress =
      typeof record.customer === "object" && record.customer !== null
        ? record.customer.address
        : "";

    return (
      record.address ||
      record.location ||
      record.customerAddress ||
      customerAddress ||
      (translate("workCenterAddressPending", activeLanguage))
    );
  };

  const getWorkCenterJobTitle = (record = {}) =>
    record.projectTitle ||
    record.project_title ||
    record.requestTitle ||
    record.service ||
    record.title ||
    translate("scheduledVisit");

  const getCanonicalLifecycleUnavailableText = (state = {}) => {
    if (state.status === "loading") {
      return "Loading canonical lifecycle evidence.";
    }
    if (state.reason === "unsupported_legacy_record") {
      return "Canonical lifecycle evidence is not available for this legacy record.";
    }
    if (state.reason === "missing_post_id") {
      return "Canonical lifecycle evidence is unavailable because this Work Center record has no lifecycle-v2 request identity.";
    }
    if (state.httpStatus === 401 || state.httpStatus === 403) {
      return "Canonical lifecycle evidence is unavailable for this account.";
    }
    if (state.httpStatus === 404) {
      return "Canonical lifecycle evidence was not found for this request.";
    }
    if (state.status === "error") {
      return "Canonical lifecycle evidence could not be loaded.";
    }
    return translate("lifecycleHistoryUnavailable", activeLanguage);
  };

  const getWorkCenterJobKey = (record = {}) =>
    String(
      record.requestId ||
        record.projectId ||
        record.id ||
        record.scheduleId ||
        record.quoteId ||
        record.conversationId ||
        record.projectConversationId ||
        `${getWorkCenterJobCustomer(record)}-${getWorkCenterJobTitle(record)}`
    );

  const createWorkCenterJobBase = (record = {}) => ({
    id: getWorkCenterJobKey(record),
    customer: getWorkCenterJobCustomer(record),
    title: getWorkCenterJobTitle(record),
    address: getWorkCenterJobAddress(record),
    conversationId: record.conversationId || record.projectConversationId || "",
    requestId: record.requestId || record.projectId || record.id || "",
    sourceRecords: [],
    schedule: null,
    quote: null,
    active: null,
    request: null,
    history: null,
  });

  const getScheduleWorkflowRank = (schedule = {}) => {
    const status = String(
      schedule.jobStage ||
        schedule.workStatus ||
        schedule.status ||
        schedule.workflowStage ||
        schedule.workflowStatus ||
        ""
    ).toLowerCase();
    const appointmentType = String(schedule.appointmentType || "").toLowerCase();
    if (status === "closed") return 90;
    if (["invoice_sent", "receipt_sent"].includes(status)) return 80;
    if (["invoice_created", "receipt_created"].includes(status)) return 70;
    if (["completed", "work_completed"].includes(status)) return 60;
    if (["working", "arrived", "on_the_way", "en_route", "work_scheduled"].includes(status)) return 50;
    if (appointmentType === "work" || schedule.workAppointmentId) return 45;
    if (schedule.paymentReceivedAt || schedule.paymentStatus) return 40;
    if (hasEvaluationForAppointment(schedule)) return 30;
    if (appointmentType === "evaluation") return 20;
    if (status === "scheduled") return 10;
    return 0;
  };

  const shouldPreferScheduleRecord = (candidate = {}, current = null) => {
    if (!current) return true;
    const candidateRank = getScheduleWorkflowRank(candidate);
    const currentRank = getScheduleWorkflowRank(current);
    if (candidateRank !== currentRank) return candidateRank > currentRank;
    return String(candidate.updatedAt || candidate.createdAt || "").localeCompare(
      String(current.updatedAt || current.createdAt || "")
    ) > 0;
  };

  const mergeWorkCenterJob = (jobs, record, recordType) => {
    if (!record) return;
    const key = getWorkCenterJobKey(record);
    const existing = jobs.get(key) || createWorkCenterJobBase(record);
    const nextJob = {
      ...existing,
      customer: existing.customer || getWorkCenterJobCustomer(record),
      title:
        existing.title === translate("scheduledVisit")
          ? getWorkCenterJobTitle(record)
          : existing.title || getWorkCenterJobTitle(record),
      address:
        existing.address === (translate("workCenterAddressPending", activeLanguage))
          ? getWorkCenterJobAddress(record)
          : existing.address || getWorkCenterJobAddress(record),
      conversationId:
        existing.conversationId || record.conversationId || record.projectConversationId || "",
      requestId:
        existing.requestId || record.requestId || record.projectId || record.id || "",
      sourceRecords: [...existing.sourceRecords, { type: recordType, record }],
    };

    if (recordType === "schedule" && shouldPreferScheduleRecord(record, nextJob.schedule)) {
      nextJob.schedule = record;
    }
    if (recordType === "quote") nextJob.quote = record;
    if (recordType === "active") nextJob.active = record;
    if (recordType === "request") nextJob.request = record;
    if (recordType === "history") {
      nextJob.history = record;
      nextJob.schedule = nextJob.schedule || record.schedule || record.visitSchedule || null;
      nextJob.quote = nextJob.quote || record.quote || record.proposal || null;
      nextJob.active = nextJob.active || record.activeWork || null;
      nextJob.request = nextJob.request || record.request || null;
      nextJob.conversationId =
        nextJob.conversationId || record.conversationId || record.schedule?.conversationId || "";
      nextJob.requestId =
        nextJob.requestId || record.requestId || record.schedule?.requestId || record.quote?.requestId || "";
    }

    jobs.set(key, nextJob);
  };

  const SARAH_JOB_STATE_ORDER = [
    "lead",
    "visit_scheduled",
    "evaluation_complete",
    "quote_created",
    "proposal_sent",
    "approved",
    "payment_received",
    "work_scheduled",
    "en_route",
    "arrived",
    "working",
    "completed",
    "receipt_created",
    "receipt_sent",
    "closed",
  ];

  const SARAH_JOB_STATE_ALIASES = {
    review: "lead",
    new_request: "lead",
    request: "lead",
    lead: "lead",
    visit_scheduled: "visit_scheduled",
    scheduled: "visit_scheduled",
    visit_confirmed: "visit_scheduled",
    confirmed: "visit_scheduled",
    evaluation_ready: "visit_scheduled",
    evaluation_completed: "evaluation_complete",
    evaluation_complete: "evaluation_complete",
    proposal_created: "quote_created",
    quote_created: "quote_created",
    quote_ready: "quote_created",
    proposal_sent: "proposal_sent",
    quote_sent: "proposal_sent",
    awaiting_approval: "proposal_sent",
    approved: "approved",
    accepted: "approved",
    payment_needed: "approved",
    deposit_needed: "approved",
    payment_received: "payment_received",
    deposit_received: "payment_received",
    paid: "payment_received",
    work_scheduled: "work_scheduled",
    on_the_way: "en_route",
    en_route: "en_route",
    enroute: "en_route",
    arrived: "arrived",
    working: "working",
    started: "working",
    completed: "completed",
    work_completed: "completed",
    invoice_created: "receipt_created",
    receipt_created: "receipt_created",
    invoice_sent: "receipt_sent",
    receipt_sent: "receipt_sent",
    closed: "closed",
  };

  const getSarahJobStateDefinitions = () => ({
    lead: {
      statusLabel: translate("workCenterNewLead", activeLanguage),
      nextStep: translate("workCenterScheduleTheFirstVisit", activeLanguage),
      primaryButton: getWorkCenterPrimaryCtaLabel("schedule_visit", activeLanguage),
      customerNotification:
        translate("workCenterTheProfessionalIsReadyToScheduleAVisit", activeLanguage),
      timelineEntry: translate("workCenterFirstContact", activeLanguage),
      toast: translate("workCenterFirstContactSaved", activeLanguage),
      storageStage: "new_request",
      primaryActionType: "schedule_visit",
      tone: { background: "var(--meetro-surface-sage, #eef4ea)", color: "var(--meetro-color-charcoal, #172317)", border: "rgba(31,77,52,0.18)" },
    },
    visit_scheduled: {
      statusLabel: translate("workCenterVisitConfirmed", activeLanguage),
      nextStep: translate("workCenterRecordEvaluationNotes", activeLanguage),
      primaryButton: getWorkCenterPrimaryCtaLabel("start_evaluation", activeLanguage),
      customerNotification:
        translate("workCenterTheVisitHasBeenScheduled", activeLanguage),
      timelineEntry: translate("workCenterVisitScheduled2", activeLanguage),
      toast: translate("workCenterVisitScheduled3", activeLanguage),
      storageStage: "visit_scheduled",
      primaryActionType: "start_evaluation",
      tone: { background: "var(--meetro-surface-sage, #eef4ea)", color: "var(--meetro-color-charcoal, #172317)", border: "rgba(31,77,52,0.18)" },
    },
    evaluation_complete: {
      statusLabel: translate("workCenterEvaluationComplete2", activeLanguage),
      nextStep: translate("workCenterCreateTheCustomerProposal", activeLanguage),
      primaryButton: getWorkCenterPrimaryCtaLabel("create_proposal", activeLanguage),
      customerNotification:
        translate("workCenterTheEvaluationIsCompleteTheProposalWillBePrepared", activeLanguage),
      timelineEntry: translate("workCenterEvaluationComplete3", activeLanguage),
      toast: translate("workCenterEvaluationSaved", activeLanguage),
      storageStage: "evaluation_completed",
      primaryActionType: "create_proposal",
      tone: { background: "#faf5ff", color: "#7e22ce", border: "#e9d5ff" },
    },
    quote_created: {
      statusLabel: translate("workCenterProposalCreated", activeLanguage),
      nextStep: translate("workCenterSendTheProposalToTheCustomer", activeLanguage),
      primaryButton: getWorkCenterPrimaryCtaLabel("send_proposal", activeLanguage),
      customerNotification:
        translate("workCenterTheProposalIsReadyForReview", activeLanguage),
      timelineEntry: translate("workCenterProposalCreated2", activeLanguage),
      toast: translate("workCenterProposalCreated3", activeLanguage),
      storageStage: "proposal_created",
      primaryActionType: "send_proposal",
      tone: { background: "#faf5ff", color: "#7e22ce", border: "#e9d5ff" },
    },
    proposal_sent: {
      statusLabel:
        translate("workCenterWaitingForCustomerApproval", activeLanguage),
      nextStep:
        translate("workCenterCustomerReviewsAndApprovesTheProposal", activeLanguage),
      primaryButton: getWorkCenterPrimaryCtaLabel("open_conversation", activeLanguage),
      customerNotification:
        translate("workCenterTheProposalHasBeenSentForReview", activeLanguage),
      timelineEntry: translate("workCenterProposalSent2", activeLanguage),
      toast: translate("workCenterProposalSent3", activeLanguage),
      storageStage: "proposal_sent",
      primaryActionType: "open_conversation",
      tone: { background: "#f5f3ff", color: "var(--meetro-color-charcoal, #172317)", border: "#ddd6fe" },
    },
    approved: {
      statusLabel: translate("documentStatusApproved", activeLanguage),
      nextStep: translate("workCenterRecordPaymentOrDeposit", activeLanguage),
      primaryButton: getWorkCenterPrimaryCtaLabel("record_payment", activeLanguage),
      customerNotification:
        translate("workCenterTheProposalHasBeenApproved", activeLanguage),
      timelineEntry: translate("documentStatusApproved", activeLanguage),
      toast: translate("workCenterApprovalSaved", activeLanguage),
      storageStage: "approved",
      primaryActionType: "record_payment",
      tone: { background: "#ecfdf5", color: "#047857", border: "#bbf7d0" },
    },
    payment_received: {
      statusLabel: translate("paymentReceived", activeLanguage),
      nextStep: translate("workCenterScheduleTheWorkDate", activeLanguage),
      primaryButton: getWorkCenterPrimaryCtaLabel("schedule_work", activeLanguage),
      customerNotification:
        translate("workCenterPaymentHasBeenReceivedWorkCanBeScheduled", activeLanguage),
      timelineEntry: translate("workCenterPaymentReceived", activeLanguage),
      toast: translate("workCenterPaymentSaved", activeLanguage),
      storageStage: "payment_received",
      primaryActionType: "schedule_work",
      tone: { background: "#f0fdfa", color: "#0f766e", border: "#99f6e4" },
    },
    work_scheduled: {
      statusLabel: translate("workScheduled", activeLanguage),
      nextStep: translate("workCenterGoOnTheWayWhenItIsTime", activeLanguage),
      primaryButton: getWorkCenterPrimaryCtaLabel("mark_en_route", activeLanguage),
      customerNotification:
        translate("workCenterTheWorkHasBeenScheduled", activeLanguage),
      timelineEntry: translate("workCenterWorkScheduled", activeLanguage),
      toast: translate("workCenterWorkScheduled2", activeLanguage),
      storageStage: "work_scheduled",
      primaryActionType: "mark_en_route",
      tone: { background: "#f5f3ff", color: "var(--meetro-color-charcoal, #172317)", border: "#ddd6fe" },
    },
    en_route: {
      statusLabel: translate("onTheWay", activeLanguage),
      nextStep: translate("workCenterMarkArrivedAtTheSite", activeLanguage),
      primaryButton: getWorkCenterPrimaryCtaLabel("mark_arrived", activeLanguage),
      customerNotification:
        translate("workCenterProfessionalIsOnTheWay", activeLanguage),
      timelineEntry: translate("workflowOnTheWay", activeLanguage),
      toast: translate("workCenterOnTheWaySaved", activeLanguage),
      storageStage: "on_the_way",
      primaryActionType: "mark_arrived",
      tone: { background: "var(--meetro-surface-sage, #eef4ea)", color: "#2563eb", border: "#bfdbfe" },
    },
    arrived: {
      statusLabel: translate("arrivedShort", activeLanguage),
      nextStep: translate("workCenterStartWork", activeLanguage),
      primaryButton: getWorkCenterPrimaryCtaLabel("start_work", activeLanguage),
      customerNotification:
        translate("workCenterProfessionalHasArrivedAndWillBeginShortly", activeLanguage),
      timelineEntry: translate("arrivedShort", activeLanguage),
      toast: translate("workCenterArrivedSaved", activeLanguage),
      storageStage: "arrived",
      primaryActionType: "start_work",
      tone: { background: "#ecfdf5", color: "#047857", border: "#bbf7d0" },
    },
    working: {
      statusLabel: translate("working", activeLanguage),
      nextStep: translate("lifecycleDashboardActionUnavailable", activeLanguage),
      primaryButton: translate("lifecycleDashboardActionUnavailable", activeLanguage),
      customerNotification:
        translate("workCenterWorkIsNowInProgress", activeLanguage),
      timelineEntry: translate("workCenterWorkStarted", activeLanguage),
      toast: translate("workCenterWorkStarted2", activeLanguage),
      storageStage: "working",
      primaryActionType: "complete_work",
      tone: { background: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    },
    completed: {
      statusLabel: translate("completed", activeLanguage),
      nextStep: translate("workCenterCreateInvoiceOrReceipt", activeLanguage),
      primaryButton: getWorkCenterPrimaryCtaLabel("create_receipt", activeLanguage),
      customerNotification:
        translate("workCenterWorkHasBeenCompletedInvoiceReceiptWillBeSentShortly", activeLanguage),
      timelineEntry: translate("workCenterWorkCompleted", activeLanguage),
      toast: translate("workCenterWorkCompleted2", activeLanguage),
      storageStage: "completed",
      primaryActionType: "create_receipt",
      tone: { background: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
    },
    receipt_created: {
      statusLabel: translate("workCenterReceiptReady", activeLanguage),
      nextStep: translate("workCenterSendInvoiceOrReceipt", activeLanguage),
      primaryButton: getWorkCenterPrimaryCtaLabel("send_receipt", activeLanguage),
      customerNotification:
        translate("workCenterInvoiceReceiptIsReadyToSend", activeLanguage),
      timelineEntry: translate("workCenterReceiptCreated2", activeLanguage),
      toast: translate("workCenterReceiptCreated3", activeLanguage),
      storageStage: "invoice_created",
      primaryActionType: "send_receipt",
      tone: { background: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
    },
    receipt_sent: {
      statusLabel: translate("workCenterInvoiceReceiptSent", activeLanguage),
      nextStep: translate("lifecycleDashboardActionUnavailable", activeLanguage),
      primaryButton: translate("lifecycleDashboardActionUnavailable", activeLanguage),
      customerNotification:
        translate("workCenterInvoiceReceiptHasBeenSent", activeLanguage),
      timelineEntry: translate("workCenterReceiptSent", activeLanguage),
      toast: translate("workCenterReceiptSent2", activeLanguage),
      storageStage: "invoice_sent",
      primaryActionType: "close_job",
      tone: { background: "#f0fdfa", color: "#0f766e", border: "#99f6e4" },
    },
    closed: {
      statusLabel: translate("stateClosed", activeLanguage),
      nextStep: translate("workCenterViewTheJobHistory", activeLanguage),
      primaryButton: getWorkCenterPrimaryCtaLabel("view_history", activeLanguage),
      customerNotification:
        translate("workCenterJobHasBeenCompletedAndClosedFinalDocumentationIsAvailable", activeLanguage),
      timelineEntry: translate("workCenterJobClosed", activeLanguage),
      toast:
        translate("workCenterJobClosedAndMovedToWorkHistory", activeLanguage),
      storageStage: "closed",
      primaryActionType: "view_history",
      tone: { background: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
    },
  });

  const normalizeSarahJobStateKey = (stage = "") => {
    const normalized = String(stage || "").trim().toLowerCase();
    return SARAH_JOB_STATE_ALIASES[normalized] || normalized || "lead";
  };

  const getSarahJobStateKey = (job = {}) =>
    normalizeSarahJobStateKey(getWorkCenterJobStage(job));

  const getSarahJobStateDefinition = (jobOrStage = {}) => {
    const definitions = getSarahJobStateDefinitions();
    const key =
      typeof jobOrStage === "string"
        ? normalizeSarahJobStateKey(jobOrStage)
        : getSarahJobStateKey(jobOrStage);
    return definitions[key] || definitions.lead;
  };

  const getWorkCenterJobStatus = (job = {}) =>
    getSarahJobStateDefinition(job).statusLabel;

  const getWorkCenterJobNextStep = (job = {}) =>
    getSarahJobStateDefinition(job).nextStep;

  const getWorkCenterJobPrimaryAction = (job = {}) =>
    getSarahJobStateDefinition(job).primaryButton;

  const getWorkCenterJobStatusTone = (job = {}) =>
    getSarahJobStateDefinition(job).tone;

  const resolveCustomerJobWorkflowState = (job = {}) => {
    const stateKey = getSarahJobStateKey(job);
    const state = getSarahJobStateDefinition(job);
    const externalCustomer = isExternalCustomerJob(job);
    const schedulePending = isCustomerResponsePending(job.schedule || {});
    const isVisitAwaitingCustomer =
      stateKey === "visit_scheduled" && schedulePending;
    const isWorkDateAwaitingCustomer =
      stateKey === "work_scheduled" && schedulePending;
    const appointmentSummary = getWorkCenterScheduleSummary(job);
    const paymentSummary = getWorkCenterPaymentSummary(job);
    const paymentType = String(
      job.quote?.paymentType ||
        job.schedule?.paymentType ||
        job.quote?.paymentRecord?.paymentType ||
        job.schedule?.paymentRecord?.paymentType ||
        ""
    ).toLowerCase();
    const photoCount = getWorkCenterJobPhotos(job).length;
    const services = job.title || getWorkCenterJobTitle(job);
    const supportingSummary = [];

    if (["visit_scheduled", "work_scheduled", "en_route", "arrived"].includes(stateKey)) {
      supportingSummary.push({
        label: translate("journeyAppointment", activeLanguage),
        value: appointmentSummary,
      });
    }

    if (["approved", "payment_received", "completed", "receipt_created", "receipt_sent", "closed"].includes(stateKey)) {
      supportingSummary.push({
        label: translate("workCenterPayment", activeLanguage),
        value: paymentSummary,
      });
    }

    if (services) {
      supportingSummary.push({
        label: translate("service", activeLanguage),
        value: services,
      });
    }

    if (photoCount > 0 && ["evaluation_complete", "quote_created", "proposal_sent", "approved", "payment_received", "closed"].includes(stateKey)) {
      supportingSummary.push({
        label: translate("photos", activeLanguage),
        value: translate("workCenterPhotosSavedCount", activeLanguage, { count: photoCount }),
      });
    }

    return {
      stateKey,
      statusLabel:
        isWorkDateAwaitingCustomer
          ? translate("workCenterWaitingForWorkDateConfirmation", activeLanguage)
          : isVisitAwaitingCustomer
          ? translate("workCenterWaitingForCustomerConfirmation", activeLanguage)
          : stateKey === "payment_received" && paymentType === "deposit"
            ? translate("workCenterDepositReceived", activeLanguage)
          : stateKey === "payment_received" && paymentType === "full"
            ? translate("workCenterPaidInFull", activeLanguage)
          : state.statusLabel,
      nextActionLabel:
        isVisitAwaitingCustomer || isWorkDateAwaitingCustomer
          ? externalCustomer
            ? translate("workCenterRecordTheExternalCustomerResponse", activeLanguage)
            : translate("workCenterCustomerCanConfirmOrRequestADifferentTimeInMeetro", activeLanguage)
          : state.nextStep,
      primaryButtonLabel: state.primaryButton,
      primaryActionType: state.primaryActionType,
      awaitingCustomerResponse:
        !externalCustomer && (isVisitAwaitingCustomer || isWorkDateAwaitingCustomer),
      customerNotification: state.customerNotification,
      timelineEntry: state.timelineEntry,
      tone: state.tone,
      supportingSummary,
    };
  };

  const getWorkCenterJobListPresentation = (job = {}) => {
    const baseState = getSarahJobStateDefinition(job);
    return createWorkCenterJobListPresentation(resolveCustomerJobWorkflowState(job), {
      statusLabel: baseState.statusLabel,
      nextStepLabel: baseState.nextStep,
    });
  };

  const getWorkCenterJobProgressItems = (job = {}) => {
    const stage = String(normalizeSarahJobStateKey(getWorkCenterJobStage(job)) || "").toLowerCase();
    const statusText = [
      stage,
      job.status,
      job.schedule?.status,
      job.schedule?.workflowStage,
      job.quote?.status,
      job.quote?.workflowStatus,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const hasAny = (...tokens) => tokens.some((token) => statusText.includes(token));
    const hasSchedule = Boolean(job.schedule) || hasAny("scheduled", "visit");
    const hasEvaluation =
      Boolean(job.schedule?.evaluation || job.schedule?.evaluationNotes || job.evaluation) ||
      hasAny("evaluation", "quote", "proposal", "payment", "work", "closed");
    const hasQuote = Boolean(job.quote) || hasAny("quote", "proposal", "payment", "work", "closed");
    const hasWork = Boolean(job.active) || hasAny("work", "active", "completed", "closed");

    return [
      { label: translate("workCenterVisit", activeLanguage), done: hasSchedule },
      { label: translate("assistantFieldStage_evaluation", activeLanguage), done: hasEvaluation },
      { label: translate("companionContextQuoteTitle", activeLanguage), done: hasQuote },
      { label: translate("journeyWork", activeLanguage), done: hasWork },
    ];
  };

  const isExternalCustomerJob = (job = {}) => {
    const conversationId =
      job.conversationId ||
      job.schedule?.conversationId ||
      job.quote?.conversationId ||
      job.history?.conversationId ||
      "";
    const scheduleSource = String(job.schedule?.source || "").toLowerCase();
    const customer = job.schedule?.customer || job.customer || {};
    return Boolean(
      !conversationId ||
        scheduleSource === "manual_customer_entry" ||
        scheduleSource === "manual" ||
        job.schedule?.deliveryMethod === "external_prepared" ||
        job.quote?.deliveryMethod === "external_prepared" ||
        job.schedule?.isMeetroUser === false ||
        customer?.isMeetroUser === false
    );
  };

  const isCustomerResponsePending = (record = {}) => {
    const status = String(
      record.customerConfirmationStatus ||
        record.confirmationStatus ||
        record.customerResponseStatus ||
        ""
    ).toLowerCase();
    return !status || status.includes("pending") || status.includes("waiting");
  };

  const getExternalCustomerManualActions = (job = {}, workflowState = {}) => {
    if (!isExternalCustomerJob(job)) return [];

    const stateKey = workflowState.stateKey || getSarahJobStateKey(job);
    const schedulePending = isCustomerResponsePending(job.schedule || {});
    const quoteResponse = String(
      job.quote?.customerResponseStatus || job.quote?.revisionStatus || ""
    ).toLowerCase();

    if (stateKey === "visit_scheduled" && schedulePending) {
      return [
        { type: "visit_confirmed", label: translate("workCenterMarkVisitConfirmed", activeLanguage) },
        { type: "reschedule_visit", label: translate("workCenterRescheduleVisit", activeLanguage) },
        { type: "visit_waiting", label: translate("workCenterWaitingForCustomer", activeLanguage) },
      ];
    }

    if (stateKey === "proposal_sent") {
      return [
        { type: "proposal_approved", label: translate("workCenterMarkApproved", activeLanguage) },
        { type: "proposal_changes_requested", label: translate("workCenterRequestedChanges", activeLanguage) },
        { type: "proposal_waiting", label: translate("workCenterStillWaiting", activeLanguage) },
      ];
    }

    if (stateKey === "work_scheduled" && schedulePending) {
      return [
        { type: "work_date_confirmed", label: translate("workCenterMarkWorkDateConfirmed", activeLanguage) },
        { type: "reschedule_work", label: translate("workCenterRescheduleWork", activeLanguage) },
        { type: "work_waiting", label: translate("workCenterStillWaiting", activeLanguage) },
      ];
    }

    if (
      stateKey === "receipt_created" &&
      job.schedule?.receiptDeliveryStatus === "external_send_prepared"
    ) {
      return [
        { type: "mark_receipt_sent", label: translate("workCenterMarkReceiptSentExternally", activeLanguage) },
      ];
    }

    return [];
  };

  const hasCustomerJobReachedState = (stateKey = "", targetState = "") => {
    const currentIndex = SARAH_JOB_STATE_ORDER.indexOf(normalizeSarahJobStateKey(stateKey));
    const targetIndex = SARAH_JOB_STATE_ORDER.indexOf(normalizeSarahJobStateKey(targetState));
    return currentIndex >= 0 && targetIndex >= 0 && currentIndex >= targetIndex;
  };

  const getCustomerJobSupportingLinks = (job = {}, workflowState = {}) => {
    const stateKey = workflowState.stateKey || getSarahJobStateKey(job);
    const links = [
      {
        label: translate("messagesConversationFallback", activeLanguage),
        view: "conversation",
      },
    ];

    if (getWorkCenterJobPhotos(job).length > 0) {
      links.push({
        label: translate("photos", activeLanguage),
        view: "photos",
      });
    }

    if (job.schedule || hasCustomerJobReachedState(stateKey, "visit_scheduled")) {
      links.push({
        label: translate("workCenterScheduleTitle", activeLanguage),
        view: "schedule",
      });
    }

    if (hasCustomerJobReachedState(stateKey, "evaluation_complete")) {
      links.push({
        label: translate("guideEvaluationNotesTitle", activeLanguage),
        view: "evaluation",
      });
    }

    if (job.quote || hasCustomerJobReachedState(stateKey, "quote_created")) {
      links.push({
        label: translate("companionContextQuoteTitle", activeLanguage),
        view: "quote",
      });
    }

    if (hasCustomerJobReachedState(stateKey, "approved")) {
      links.push({
        label: translate("workCenterPayment", activeLanguage),
        view: "payments",
      });
    }

    if (hasCustomerJobReachedState(stateKey, "receipt_created")) {
      links.push({
        label: translate("documentReceipt", activeLanguage),
        view: "quote",
      });
    }

    if (stateKey === "closed" || job.history) {
      links.push({
        label: translate("homeMyProjectsHistory", activeLanguage),
        view: "history",
      });
    }

    return links;
  };

  const getWorkCenterPaymentSummary = (job = {}) => {
    const total = getWorkCenterJobFinalTotal(job);
    const historyPayments = Array.isArray(job.history?.payments)
      ? job.history.payments
      : [job.history?.payment, job.history?.payments].filter(Boolean);
    const paymentReceived = Boolean(
      job.quote?.paymentReceivedAt ||
        job.quote?.depositPaidAt ||
        job.quote?.paidAt ||
        job.schedule?.paymentReceivedAt ||
        historyPayments.some(
          (payment) =>
            payment?.paymentReceivedAt ||
            payment?.paidAt ||
            ["paid", "received", "payment_received"].includes(
              String(payment?.status || "").toLowerCase()
            )
        )
    );
    const paymentLabel = paymentReceived
      ? translate("documentStatusPaid", activeLanguage)
      : translate("teamMemberStatusPending", activeLanguage);

    return total > 0 ? `${paymentLabel} • $${total.toFixed(2)}` : paymentLabel;
  };

  const getWorkCenterScheduleSummary = (job = {}) => {
    const schedule = job.schedule || job.history?.schedule || job.history?.visitSchedule || {};
    const date = schedule.date || schedule.workDate || "";
    const time = schedule.time || schedule.workTime || "";
    if (!date && !time) return translate("workCenterNotScheduled", activeLanguage);
    return `${date || ""}${date && time ? " • " : ""}${time ? formatScheduleTime(time) : ""}`;
  };

  const getWorkflowActionMeta = (nextStage = "") => {
    const customerSent =
      translate("workCenterCustomerUpdateSent", activeLanguage);
    const customerPrepared =
      translate("workCenterCustomerUpdatePrepared", activeLanguage);

    const state = getSarahJobStateDefinition(nextStage);
    return {
      label: state.timelineEntry || state.statusLabel,
      toast:
        state.toast ||
        (translate("workCenterStatusSaved", activeLanguage)),
      customerSent,
      customerPrepared,
    };
  };

  const getWorkCenterJobStage = (job = {}) => {
    const quoteStatus = normalizeQuoteStatus(job.quote || {});
    const scheduleStatus = String(
      job.schedule?.jobStage ||
        job.schedule?.workStatus ||
        job.schedule?.status ||
        job.schedule?.workflowStatus ||
        ""
    ).toLowerCase();
    const invoiceStatus = String(job.schedule?.invoiceStatus || job.quote?.invoiceStatus || "").toLowerCase();
    const isPaid = Boolean(
      job.schedule?.paymentReceivedAt ||
        job.quote?.paymentReceivedAt ||
        job.quote?.depositPaidAt ||
        job.quote?.paidAt ||
        job.quote?.paymentStatus === "paid" ||
        job.quote?.paymentStatus === "deposit_received"
    );

    if (
      job.type === "closed_job" ||
      job.history?.type === "closed_job" ||
      job.closedAt ||
      job.closeDate ||
      job.closureStatus === "closed" ||
      job.status === "closed" ||
      job.history?.closedAt ||
      job.history?.closeDate ||
      job.history?.closureStatus === "closed" ||
      job.schedule?.closedAt ||
      job.schedule?.jobStage === "closed"
    ) return "closed";
    if (invoiceStatus === "sent") return "invoice_sent";
    if (invoiceStatus === "created") return "invoice_created";
    if (["completed", "work_completed"].includes(scheduleStatus)) return "completed";
    if (["working", "started"].includes(scheduleStatus)) return "working";
    if (scheduleStatus === "arrived") return "arrived";
    if (["on_the_way", "enroute"].includes(scheduleStatus)) return "on_the_way";
    if (scheduleStatus === "work_scheduled" || job.active) return "work_scheduled";
    if (isPaid) return "payment_received";
    if (["accepted", "approved", "quote_approved"].includes(quoteStatus)) return "approved";
    if (["sent", "viewed"].includes(quoteStatus)) return "proposal_sent";
    if (job.quote) return "proposal_created";
    if (job.schedule && hasEvaluationForAppointment(job.schedule)) return "evaluation_completed";
    if (job.schedule) return "visit_scheduled";
    if (job.request) return "new_request";
    return "review";
  };

  const getWorkCenterJobTimeline = (job = {}) => {
    const stage = getSarahJobStateKey(job);
    const definitions = getSarahJobStateDefinitions();
    const stageIndex = SARAH_JOB_STATE_ORDER.indexOf(stage);
    const isDone = (stateKey) => {
      const targetIndex = SARAH_JOB_STATE_ORDER.indexOf(stateKey);
      if (targetIndex === -1) return false;
      if (stageIndex === -1) return false;
      return stageIndex >= targetIndex;
    };

    return SARAH_JOB_STATE_ORDER.map((stateKey) => {
      const state = definitions[stateKey];
      return {
        key: state.storageStage || stateKey,
        state: stateKey,
        label: state.timelineEntry || state.statusLabel,
        done: isDone(stateKey),
      };
    });
  };

  const getWorkCenterJobSavedTimelineEvents = (job = {}) => {
    const sources = [
      job.schedule?.jobTimelineEvents,
      job.schedule?.timelineEvents,
      job.history?.jobTimelineEvents,
      job.history?.timelineEvents,
    ];
    const events = sources.find((source) => Array.isArray(source)) || [];
    return events.filter(Boolean);
  };

  const formatJobTimelineEventTime = (timestamp) => {
    if (!timestamp) return translate("stateSaved", activeLanguage);
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return translate("stateSaved", activeLanguage);
    return formatDateTimeDisplay(timestamp);
  };

  const getWorkCenterJobWorkItems = (job = {}) => {
    const schedule = job.schedule || {};
    const evaluation = schedule.evaluation || {};
    if (Array.isArray(evaluation.workItems)) return evaluation.workItems;
    if (Array.isArray(schedule.workItems)) return schedule.workItems;
    if (Array.isArray(schedule.evaluationItems)) return schedule.evaluationItems;
    if (Array.isArray(job.quote?.workItems)) return job.quote.workItems;
    return [];
  };

  const getWorkCenterJobPhotos = (job = {}) => {
    const schedulePhotos = Array.isArray(job.schedule?.evaluationPhotos)
      ? job.schedule.evaluationPhotos
      : [];
    const workItemPhotos = getWorkCenterJobWorkItems(job).flatMap((workItem) =>
      Array.isArray(workItem.photos) ? workItem.photos : []
    );
    const historyPhotos = [
      ...(Array.isArray(job.history?.photos) ? job.history.photos : []),
      ...(Array.isArray(job.history?.completionPhotos)
        ? job.history.completionPhotos
        : []),
      ...(Array.isArray(job.history?.completion?.photos)
        ? job.history.completion.photos
        : []),
    ];
    return [...schedulePhotos, ...workItemPhotos, ...historyPhotos].filter(
      (photo, index, photos) =>
        photos.findIndex(
          (candidate) =>
            (candidate?.id && candidate.id === photo?.id) || candidate === photo
        ) === index
    );
  };

  const getWorkCenterJobMaterials = (job = {}) =>
    getWorkCenterJobWorkItems(job).flatMap((workItem) =>
      (Array.isArray(workItem.materials) ? workItem.materials : []).map((material) => ({
        ...material,
        workItemTitle: workItem.title || "",
      }))
    );

  const getHistoryEvaluation = (job = {}) =>
    job.history?.evaluation || job.schedule?.evaluation || job.evaluation || {};

  const getHistoryFindings = (job = {}) => {
    const evaluation = getHistoryEvaluation(job);
    if (Array.isArray(evaluation.findings)) return evaluation.findings;
    if (Array.isArray(job.history?.findings)) return job.history.findings;
    if (Array.isArray(job.schedule?.evaluationStructuredFindings)) {
      return job.schedule.evaluationStructuredFindings;
    }
    return [];
  };

  const getHistoryServiceRecommendations = (job = {}) => {
    const evaluation = getHistoryEvaluation(job);
    if (Array.isArray(evaluation.serviceRecommendations)) {
      return evaluation.serviceRecommendations;
    }
    if (Array.isArray(job.history?.serviceRecommendations)) {
      return job.history.serviceRecommendations;
    }
    if (Array.isArray(job.schedule?.serviceRecommendations)) {
      return job.schedule.serviceRecommendations;
    }
    return [];
  };

  const getHistoryEvaluationNotes = (job = {}) => {
    const evaluation = getHistoryEvaluation(job);
    return (
      evaluation.notes ||
      evaluation.visitNotes ||
      evaluation.findingsNotes ||
      job.history?.evaluationNotes ||
      job.schedule?.evaluationNotes ||
      ""
    );
  };

  const getHistoryCompletionNotes = (job = {}) =>
    job.history?.completion?.notes ||
    job.history?.completionNotes ||
    job.schedule?.completionNotes ||
    "";

  const getHistoryClosureNotes = (job = {}) =>
    job.history?.closureNotes || job.schedule?.closureNotes || "";

  const getHistoryReceiptSummary = (job = {}) =>
    job.history?.receipt?.status ||
    job.history?.invoice?.receipt?.status ||
    job.schedule?.receipt?.status ||
    job.schedule?.receiptStatus ||
    job.schedule?.invoiceStatus ||
    "";

  const getHistoryDocumentDate = (job = {}) =>
    job.history?.closeDate ||
    job.history?.closedAt ||
    job.schedule?.closedAt ||
    job.schedule?.date ||
    "";

  const getHistoryFindingLabel = (finding = {}) => {
    if (typeof finding === "string") return finding;
    return finding.title || finding.description || finding.findingType || finding.id || "";
  };

  const getHistoryServiceRecommendationLabel = (service = {}) => {
    if (typeof service === "string") return service;
    return service.title || service.name || service.serviceType || service.id || "";
  };

  const formatHistoryList = (items = [], getLabel = (item) => item) => {
    const labels = items.map(getLabel).filter(Boolean);
    return labels.length > 0 ? labels.join(", ") : "—";
  };

  const formatHistoryBulletList = (items = [], getLabel = (item) => item) => {
    const labels = items.map(getLabel).filter(Boolean);
    return labels.length > 0 ? labels.map((label) => `* ${label}`).join("\n") : "—";
  };

  const buildJobHistoryReportText = (job = {}) => {
    const evaluation = getHistoryEvaluation(job);
    const quote = job.quote || job.history?.quote || job.history?.proposal || {};
    const findings = getHistoryFindings(job);
    const serviceRecommendations = getHistoryServiceRecommendations(job);
    const timeline = getWorkCenterJobSavedTimelineEvents(job)
      .map((event) => event.label || event.stage)
      .filter(Boolean)
      .join(" -> ");
    const dependencyHistory = getWorkflowDependencyHistory(job);
    const dependencyReportSection = buildWorkflowDependencyReportSection(dependencyHistory);

    return [
      "Meetro Job History Report",
      "",
      `Customer: ${job.customer || getWorkCenterJobCustomer(job)}`,
      `Job: ${job.title || getWorkCenterJobTitle(job)}`,
      `Address: ${job.address || getWorkCenterJobAddress(job)}`,
      `Date: ${getHistoryDocumentDate(job) || "—"}`,
      `Status: Closed`,
      "",
      "Evaluation Summary",
      `Service Type: ${evaluation.serviceType || job.serviceType || "—"}`,
      `Context: ${evaluation.context || job.context || "—"}`,
      `Evaluation Notes: ${getHistoryEvaluationNotes(job) || "—"}`,
      `Template Requirements:\n${formatHistoryBulletList(evaluation.templateRequirements || [])}`,
      `Photos: ${getWorkCenterJobPhotos(job).length}`,
      "",
      "Findings",
      formatHistoryBulletList(findings, getHistoryFindingLabel),
      "",
      "Service Recommendations",
      formatHistoryBulletList(serviceRecommendations, getHistoryServiceRecommendationLabel),
      "",
      `Proposal Summary: ${
        Object.keys(quote).length > 0
          ? `$${getQuoteTotalAmount(quote).toFixed(2)}`
          : "No quote saved for this job."
      }`,
      `Payment Summary: ${getWorkCenterPaymentSummary(job)}`,
      `Invoice / Receipt Summary: ${getHistoryReceiptSummary(job) || "No invoice saved for this job."}`,
      "",
      "Completion Summary",
      `Completion Notes: ${getHistoryCompletionNotes(job) || "—"}`,
      `Closure Notes: ${getHistoryClosureNotes(job) || "—"}`,
      `Timeline: ${timeline || "—"}`,
      ...(dependencyReportSection ? ["", dependencyReportSection] : []),
    ].join("\n");
  };

  const copyHistoryDocumentText = async (text, successMessage) => {
    if (!navigator.clipboard?.writeText) {
      setHistoryActionNotice(text);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setHistoryActionNotice(successMessage);
    } catch {
      setHistoryActionNotice(text);
    }
  };

  const shareHistoryDocumentText = async ({ title, text }) => {
    try {
      await Share.share({
        title,
        text,
        dialogTitle: title,
      });
      setHistoryActionNotice(
        translate("workCenterDocumentReadyToShare", activeLanguage)
      );
      return;
    } catch {
      // Fall through to browser share/copy fallback.
    }

    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        setHistoryActionNotice(
          translate("workCenterDocumentReadyToShare", activeLanguage)
        );
        return;
      }
    } catch {
      // Fall through to copy fallback.
    }

    await copyHistoryDocumentText(
      text,
      translate("workCenterSummaryCopied", activeLanguage)
    );
  };

  const printJobHistoryReport = (job = {}) => {
    const text = buildJobHistoryReportText(job);
    const printWindow = window.open("", "_blank", "noopener,noreferrer");

    if (!printWindow) {
      copyHistoryDocumentText(
        text,
        translate("workCenterSummaryCopiedForPrinting", activeLanguage)
      );
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Meetro Job Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; color: #0f172a; }
            pre { white-space: pre-wrap; line-height: 1.5; font-size: 14px; }
          </style>
        </head>
        <body><pre>${text.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]))}</pre></body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => {
      printWindow.print();
    }, 100);
    printWindow.print();
  };

  const buildQuoteDocumentText = (quote = {}, label = "Quote / Proposal") =>
    [
      `Meetro ${label}`,
      "",
      `Customer: ${quote.homeownerName || quote.customerName || quote.customer || "—"}`,
      `Job: ${quote.projectTitle || quote.title || "—"}`,
      `Address: ${quote.address || quote.location || "—"}`,
      `Labor: $${getQuoteLaborAmount(quote).toFixed(2)}`,
      `Materials: $${getQuoteMaterialsAmount(quote).toFixed(2)}`,
      `Total: $${getQuoteTotalAmount(quote).toFixed(2)}`,
      `Timeline: ${quote.timeline || "—"}`,
      `Notes: ${quote.notes || "—"}`,
    ].join("\n");

  const getJobDetailViewLabel = (view) => {
    const labels = {
      conversation: translate("messagesConversationFallback", activeLanguage),
      photos: translate("photos", activeLanguage),
      evaluation: translate("guideEvaluationNotesTitle", activeLanguage),
      quote: translate("journeyQuote", activeLanguage),
      payments: translate("workCenterPayments", activeLanguage),
      materials: translate("workTabMaterials", activeLanguage),
      schedule: translate("workCenterScheduleTitle", activeLanguage),
      history: translate("homeMyProjectsHistory", activeLanguage),
    };
    return labels[view] || "";
  };

  const getScopedIdentityValues = (record = {}) => {
    const values = [
      record.jobId,
      record.id,
      record.requestId,
      record.projectId,
      record.scheduleId,
      record.visitId,
      record.quoteId,
      record.conversationId,
      record.projectConversationId,
      record.activeConversationId,
      record.customerId,
      record.manualCustomerContactId,
      record.selectedHomeownerRequestId,
      record.schedule?.id,
      record.schedule?.scheduleId,
      record.quote?.quoteId,
      record.quote?.id,
      record.quote?.requestId,
      record.quote?.scheduleId,
      record.quote?.conversationId,
      record.active?.id,
      record.active?.jobId,
      record.active?.requestId,
      record.active?.conversationId,
      record.history?.id,
      record.history?.requestId,
      record.history?.conversationId,
    ];

    return values
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  };

  const normalizeScopedText = (value) =>
    String(value || "").trim().toLowerCase();

  const jobMatchesScopedRecord = (job = {}, record = {}) => {
    const jobIds = getScopedIdentityValues(job);
    const recordIds = getScopedIdentityValues(record);
    const hasIdMatch =
      jobIds.length > 0 &&
      recordIds.length > 0 &&
      jobIds.some((id) => recordIds.includes(id));

    if (hasIdMatch) return true;
    if (jobIds.length > 0 && recordIds.length > 0) return false;

    const jobCustomer = normalizeScopedText(job.customer || getWorkCenterJobCustomer(job));
    const recordCustomer = normalizeScopedText(getWorkCenterJobCustomer(record));
    const jobAddress = normalizeScopedText(job.address || getWorkCenterJobAddress(job));
    const recordAddress = normalizeScopedText(getWorkCenterJobAddress(record));

    return Boolean(
      jobCustomer &&
        recordCustomer &&
        jobCustomer === recordCustomer &&
        jobAddress &&
        recordAddress &&
        jobAddress === recordAddress
    );
  };

  const getScopedJobQuotes = (job = {}) =>
    quoteHistory.filter((quote) => jobMatchesScopedRecord(job, quote));

  const getScopedJobSchedules = (job = {}) =>
    missionSchedule.filter((schedule) => jobMatchesScopedRecord(job, schedule));

  const getScopedJobActiveRecords = (job = {}) =>
    activeJobs.filter((activeJob) => jobMatchesScopedRecord(job, activeJob));

  const getScopedJobHistoryRecords = (job = {}) =>
    completedProjects.filter((historyRecord) =>
      jobMatchesScopedRecord(job, historyRecord)
    );

  const getScopedJobAlerts = (job = {}) =>
    professionalNotifications.filter((notification) =>
      jobMatchesScopedRecord(job, notification)
    );

  const getWorkCenterJobFinalTotal = (job = {}) => {
    const quote = job.quote || job.history?.quote || job.history?.proposal || {};
    const historyTotal =
      job.finalTotal ||
      job.history?.finalTotal ||
      job.history?.revenue ||
      job.history?.quoteAmount ||
      job.history?.acceptedQuote?.amount;
    const quoteTotal = quote ? getQuoteTotalAmount(quote) : 0;
    return Number(historyTotal || quoteTotal || 0);
  };

  const legacyWorkCenterJobs = (() => {
    const jobs = new Map();
    pendingProjectRequests.forEach((record) => mergeWorkCenterJob(jobs, record, "request"));

    missionSchedule.forEach((record) => mergeWorkCenterJob(jobs, record, "schedule"));
    quoteHistory.filter(Boolean).forEach((record) => mergeWorkCenterJob(jobs, record, "quote"));
    activeJobs.forEach((record) => mergeWorkCenterJob(jobs, record, "active"));
    if (missionHasCurrentWork) {
      mergeWorkCenterJob(
        jobs,
        {
          id: localStorage.getItem("activeWorkRequestId") || "active-work",
          customerName: missionActiveCustomer,
          title: missionActiveService,
          location: localStorage.getItem("activeWorkLocation") || "",
          conversationId: missionActiveConversationId,
          status: localStorage.getItem("activeWorkStatus") || "active",
        },
        "active"
      );
    }
    completedProjects.forEach((record) => mergeWorkCenterJob(jobs, record, "history"));

    return Array.from(jobs.values()).sort((first, second) => {
      const firstDate = first.schedule?.date || first.quote?.updatedAt || first.request?.createdAt || "";
      const secondDate = second.schedule?.date || second.quote?.updatedAt || second.request?.createdAt || "";
      return String(secondDate).localeCompare(String(firstDate));
    });
  })();

  const workCenterJobs = mergeCanonicalWorkCenterEntries(
    legacyWorkCenterJobs,
    canonicalWorkCenterHydration.entries
  );

  const workCenterActiveJobs = workCenterJobs.filter(
    (job) => getWorkCenterJobStage(job) !== "closed"
  );

  const workCenterHistoryJobs = workCenterJobs.filter(
    (job) => getWorkCenterJobStage(job) === "closed"
  );

  const workCenterPrimaryNavigationCards = [
    {
      key: "opportunities",
      icon: "opportunities",
      title: translate("workCenterOpportunitiesTitle", activeLanguage),
      purpose:
        translate("workCenterNewRequestsThatNeedADecision", activeLanguage),
      meta: translate("workCenterNewCount", activeLanguage, { count: opportunitiesCount }),
      actionLabel:
        translate("viewOpportunities"),
      tone: "#fff7ed",
      accent: "#ea580c",
      alert: hasNewWorkCenterOpportunities,
      onClick: () => openWorkTab("pending"),
    },
    {
      key: "current",
      icon: "currentJobs",
      title: translate("workCenterCurrentJobsTitle", activeLanguage),
      purpose:
        translate("workCenterAcceptedWorkThatStillNeedsAction", activeLanguage),
      meta: translate("workCenterActiveCount", activeLanguage, { count: workCenterActiveJobs.length }),
      actionLabel: translate("continueWork", activeLanguage),
      tone: "#f8fafc",
      accent: "#334155",
      onClick: () => openWorkCenterJobsPage("current"),
    },
    {
      key: "schedule",
      icon: "schedule",
      title: translate("workCenterScheduleTitle", activeLanguage),
      purpose:
        translate("workCenterUpcomingVisitsAndAppointments", activeLanguage),
      meta: translate("workCenterUpcomingCount", activeLanguage, { count: upcomingScheduleCount }),
      actionLabel: translate("assistantActionOpenSchedule", activeLanguage),
      tone: "#eff6ff",
      accent: "#2563eb",
      onClick: () => openWorkTab("schedule"),
    },
    {
      key: "quotes",
      icon: "quote",
      title: translate("workCenterQuotesTitle", activeLanguage),
      purpose:
        translate("workCenterProposalsThatNeedReviewOrResponse", activeLanguage),
      meta: translate("workCenterRecordsCount", activeLanguage, { count: quoteHistory.length }),
      actionLabel: translate("openQuotesAction", activeLanguage),
      tone: "#f5f3ff",
      accent: "var(--meetro-color-charcoal, #172317)",
      onClick: () => openWorkTab("quotes"),
    },
    {
      key: "activeWork",
      icon: "activeWork",
      title: translate("workCenterActiveWorkTitle", activeLanguage),
      purpose:
        translate("workCenterOnSiteWorkThatNeedsAnUpdate", activeLanguage),
      meta: translate("workCenterActiveCount", activeLanguage, { count: activeJobs.length }),
      actionLabel: translate("openActiveWorkAction", activeLanguage),
      tone: "#ecfdf5",
      accent: "#16a34a",
      onClick: () => openWorkTab("active"),
    },
    {
      key: "history",
      icon: "jobHistory",
      title: translate("workCenterHistoryTitle", activeLanguage),
      purpose:
        translate("workCenterClosedJobsAndSavedRecords", activeLanguage),
      meta: translate("workCenterClosedCount", activeLanguage, { count: workCenterHistoryJobs.length }),
      actionLabel: translate("openHistoryAction", activeLanguage),
      tone: "var(--meetro-surface-sage, #eef4ea)",
      accent: "var(--meetro-color-charcoal, #172317)",
      onClick: () => openWorkCenterJobsPage("history"),
    },
    {
      key: "revenue",
      icon: "revenue",
      title: translate("workCenterRevenueTitle", activeLanguage),
      purpose:
        translate("workCenterPaymentsBalancesAndClosedJobs", activeLanguage),
      meta:
        totalJobRevenue > 0
          ? `$${formatLocaleNumber(totalJobRevenue, {}, activeLanguage)}`
          : translate("workCenterReadyToReview", activeLanguage),
      actionLabel: translate("workCenterReviewRevenue", activeLanguage),
      tone: "#ecfdf5",
      accent: "#059669",
      onClick: () => openWorkTab("revenue"),
    },
  ];

  const workCenterLandingAlert = hasActiveEmergency
    ? {
        type: "emergency",
        eyebrow:
          translate("workCenterUrgentAction", activeLanguage),
        title:
          translate("workCenterEmergencyActionNeeded", activeLanguage),
        message:
          translate("workCenterACustomerEmergencyIsActiveContinueTheEmergencyJobToUpdateDispatch", activeLanguage),
        meta:
          selectedService ||
          (translate("messagesEmergencyService", activeLanguage)),
        status: getStatusLabel(),
        primaryLabel:
          translate("workCenterContinueEmergency", activeLanguage),
        secondaryLabel:
          translate("assistantActionOpenConversation", activeLanguage),
        onPrimary: () => {
          setActiveAccountMode("business");
          localStorage.setItem("dispatchReturnPage", "contractorDashboard");
          setPage("contractorDashboard");
        },
        onSecondary: () =>
          openActiveEmergencyConversation(setPage, "contractorDashboard"),
      }
    : null;

  const updateWorkCenterJobScheduleRecord = (job = {}, patch = {}) => {
    if (!canReadLegacyWorkflowStorage()) return null;
    if (!job.schedule?.id) return null;
    const schedule = readMeetroArray("meetro_business_schedule");
    let updatedRecord = null;
    const updatedSchedule = schedule.map((item) => {
      if (String(item.id || item.scheduleId || "") !== String(job.schedule.id || job.schedule.scheduleId || "")) {
        return item;
      }

      updatedRecord = {
        ...item,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      return updatedRecord;
    });

    localStorage.setItem("meetro_business_schedule", JSON.stringify(updatedSchedule));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("meetroJobRecordUpdated"));

    if (updatedRecord) {
      setSelectedWorkCenterJob((current) =>
        current && current.id === job.id
          ? { ...current, schedule: updatedRecord }
          : current
      );
    }

    return updatedRecord;
  };

  const updateWorkCenterJobQuoteRecord = (job = {}, patch = {}) => {
    if (!canReadLegacyWorkflowStorage()) return null;
    if (!job.quote?.quoteId && !job.quote?.id) return null;
    const quoteId = String(job.quote.quoteId || job.quote.id);
    const savedQuotes = readMeetroArray("workCenterQuoteHistory");
    let updatedQuote = null;
    const updatedQuotes = savedQuotes.map((quote) => {
      if (String(quote.quoteId || quote.id || "") !== quoteId) return quote;
      updatedQuote = {
        ...quote,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      return updatedQuote;
    });

    localStorage.setItem("workCenterQuoteHistory", JSON.stringify(updatedQuotes));
    localStorage.setItem("meetroQuoteHistory", JSON.stringify(updatedQuotes));
    localStorage.setItem("quoteHistory", JSON.stringify(updatedQuotes));
    window.dispatchEvent(new Event("storage"));

    if (updatedQuote) {
      setSelectedWorkCenterJob((current) =>
        current && current.id === job.id
          ? { ...current, quote: updatedQuote }
          : current
      );
    }

    return updatedQuote;
  };

  const createSarahPageVisitRecord = (job = {}) => {
    if (!canReadLegacyWorkflowStorage()) return null;
    const now = new Date().toISOString();
    const visitId = `job-visit-${Date.now()}`;
    const newVisit = {
      id: visitId,
      scheduleId: visitId,
      visitId,
      source: "job_page_v1",
      workflowSource: "job_page",
      appointmentType: "evaluation",
      appointmentLabel: translate("workCenterEvaluationVisit", activeLanguage),
      title: job.title || translate("scheduledVisit"),
      requestTitle: job.title || translate("scheduledVisit"),
      customerName: job.customer || "",
      customerAddress: job.address || "",
      location: job.address || "",
      address: job.address || "",
      services: [job.title || translate("scheduledVisit")].filter(Boolean),
      requestId: job.requestId || job.request?.id || job.id || "",
      conversationId: job.conversationId || job.request?.conversationId || "",
      date: new Date().toISOString().slice(0, 10),
      time: "09:00",
      status: "scheduled",
      workStatus: "scheduled",
      jobStage: "visit_scheduled",
      customerConfirmationStatus: "pending_customer_confirmation",
      confirmationStatus: "pending_customer_confirmation",
      createdAt: now,
      updatedAt: now,
      ...buildJobTimelinePatch(job, "visit_scheduled"),
    };
    const schedule = readMeetroArray("meetro_business_schedule");
    localStorage.setItem(
      "meetro_business_schedule",
      JSON.stringify([newVisit, ...schedule])
    );
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("meetroJobRecordUpdated"));
    const customerUpdate = createCustomerAppointmentCard(job, newVisit);
    setSelectedWorkCenterJob((current) =>
      current && current.id === job.id ? { ...current, schedule: newVisit } : current
    );
    setRefreshKey((key) => key + 1);
    showJobActionSavedToast("visit_scheduled", customerUpdate);
    return newVisit;
  };

  const createSarahPageWorkAppointmentRecord = (job = {}) => {
    if (!canReadLegacyWorkflowStorage()) return null;
    const now = new Date().toISOString();
    const workAppointmentId = `job-work-${Date.now()}`;
    const evaluationVisit =
      job.schedule && String(job.schedule.appointmentType || "").toLowerCase() !== "work"
        ? job.schedule
        : getScopedJobSchedules(job).find(
            (schedule) =>
              String(schedule.appointmentType || "").toLowerCase() === "evaluation" ||
              hasEvaluationForAppointment(schedule)
          ) || null;
    const serviceLines = [job.title || translate("scheduledVisit")].filter(Boolean);
    const workAppointment = {
      id: workAppointmentId,
      scheduleId: workAppointmentId,
      visitId: workAppointmentId,
      workAppointmentId,
      evaluationVisitId:
        evaluationVisit?.id ||
        evaluationVisit?.scheduleId ||
        evaluationVisit?.visitId ||
        "",
      parentScheduleId:
        evaluationVisit?.id ||
        evaluationVisit?.scheduleId ||
        evaluationVisit?.visitId ||
        "",
      source: "job_page_v1",
      workflowSource: "job_page_work_appointment",
      appointmentType: "work",
      appointmentLabel: translate("workCenterWorkAppointment", activeLanguage),
      purpose: translate("workCenterPerformApprovedWork", activeLanguage),
      title: job.title || translate("scheduledVisit"),
      requestTitle: job.title || translate("scheduledVisit"),
      customerName: job.customer || "",
      customerAddress: job.address || "",
      location: job.address || "",
      address: job.address || "",
      services: serviceLines,
      requestId: job.requestId || job.schedule?.requestId || job.quote?.requestId || job.id || "",
      conversationId: job.conversationId || job.schedule?.conversationId || job.quote?.conversationId || "",
      quoteId: job.quote?.quoteId || job.quote?.id || job.schedule?.quoteId || "",
      date: workAppointmentDraft.date,
      time: normalizeScheduleTime(workAppointmentDraft.time),
      notes: workAppointmentDraft.notes,
      shareWithCustomer: Boolean(workAppointmentDraft.shareWithCustomer),
      status: "work_scheduled",
      workStatus: "work_scheduled",
      jobStage: "work_scheduled",
      workflowStage: "work_scheduled",
      workflowStatus: "work_scheduled",
      workScheduledAt: now,
      customerConfirmationStatus: "pending_customer_confirmation",
      confirmationStatus: "pending_customer_confirmation",
      evaluationVisit,
      createdAt: now,
      updatedAt: now,
      ...buildJobTimelinePatch({ ...job, schedule: evaluationVisit || job.schedule }, "work_scheduled"),
    };

    const schedule = readMeetroArray("meetro_business_schedule");
    localStorage.setItem(
      "meetro_business_schedule",
      JSON.stringify([workAppointment, ...schedule])
    );

    const activeWorkId =
      workAppointment.requestId ||
      workAppointment.quoteId ||
      workAppointment.id ||
      workAppointment.conversationId;
    saveActiveWorkSnapshot({
      requestId: workAppointment.requestId || activeWorkId,
      quoteId: workAppointment.quoteId || "",
      scheduleId: workAppointment.id,
      conversationId: workAppointment.conversationId || "",
      status: "scheduled",
      stage: "work_scheduled",
      service: workAppointment.requestTitle || workAppointment.title || translate("scheduledVisit"),
      location: workAppointment.location || "",
      customer: workAppointment.customerName || "",
      type: "work_scheduled",
      source: "job_page_work_appointment",
    });
    saveActiveJobSnapshot({
      id: activeWorkId,
      jobId: activeWorkId,
      quoteId: workAppointment.quoteId || "",
      scheduleId: workAppointment.id,
      conversationId: workAppointment.conversationId || "",
      service: workAppointment.requestTitle || workAppointment.title || translate("scheduledVisit"),
      location: workAppointment.location || "",
      status: "scheduled",
      customer: workAppointment.customerName || "",
    });
    localStorage.setItem("activeWorkStatus", "scheduled");
    localStorage.setItem("activeWorkStage", "work_scheduled");
    localStorage.setItem("activeWorkType", "work_scheduled");
    localStorage.setItem("activeWorkSource", "job_page_work_appointment");
    localStorage.setItem("activeWorkScheduleId", workAppointment.id);
    localStorage.setItem("activeWorkConversationId", workAppointment.conversationId || "");
    localStorage.setItem("activeWorkService", workAppointment.requestTitle || workAppointment.title || "");
    localStorage.setItem("activeWorkLocation", workAppointment.location || "");

    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("meetroJobRecordUpdated"));

    const customerUpdate = workAppointment.shareWithCustomer
      ? createCustomerAppointmentCard(job, workAppointment)
      : null;
    setSelectedWorkCenterJob((current) =>
      current && current.id === job.id
        ? { ...current, schedule: workAppointment, active: { status: "scheduled", scheduleId: workAppointment.id } }
        : current
    );
    setShowWorkAppointmentForm(false);
    setWorkAppointmentDraft(createDefaultWorkAppointmentDraft());
    setRefreshKey((key) => key + 1);
    showJobActionSavedToast("work_scheduled", customerUpdate);
    return workAppointment;
  };

  const saveManualJobNote = (job = {}, stage = "", label = "") => {
    if (!job.schedule?.id && !job.schedule?.scheduleId) {
      showJobActionErrorToast();
      return null;
    }

    const updatedRecord = updateWorkCenterJobScheduleRecord(job, {
      ...buildManualJobTimelinePatch(job, stage, label),
      manualWorkflowNote: label,
      manualWorkflowStage: stage,
      manualWorkflowSavedAt: new Date().toISOString(),
    });

    if (!updatedRecord) {
      showJobActionErrorToast();
      return null;
    }

    setJobActionToast({
      type: "success",
      message: label,
    });
    return updatedRecord;
  };

  const recordSarahPayment = (job = {}, paymentStatus = "deposit_received", label = "") => {
    const now = new Date().toISOString();
    const updatedQuote = updateWorkCenterJobQuoteRecord(job, {
      paymentStatus,
      paymentReceivedAt: now,
      ...(paymentStatus === "paid" ? { paidAt: now } : { depositPaidAt: now }),
    });

    if (!updatedQuote) {
      showJobActionErrorToast();
      return null;
    }

    const updatedSchedule = job.schedule
      ? updateWorkCenterJobScheduleRecord(job, {
          ...buildManualJobTimelinePatch(
            { ...job, quote: updatedQuote },
            "payment_received",
            label ||
              (paymentStatus === "paid"
                ? translate("workCenterFullPaymentRecordedManually", activeLanguage)
                : translate("workCenterDepositRecordedManually", activeLanguage))
          ),
          paymentStatus,
          paymentReceivedAt: now,
        })
      : null;

    setSelectedWorkCenterJob((current) =>
      current && current.id === job.id
        ? { ...current, quote: updatedQuote, schedule: updatedSchedule || current.schedule }
        : current
    );
    setRefreshKey((key) => key + 1);
    setJobActionToast({
      type: "success",
      message:
        label ||
        (paymentStatus === "paid"
          ? translate("workCenterFullPaymentRecorded", activeLanguage)
          : translate("workCenterDepositRecorded", activeLanguage)),
    });
    return updatedQuote;
  };

  const handleExternalCustomerManualAction = (job = {}, actionType = "") => {
    if (!job) return;

    if (actionType === "visit_confirmed") {
      const updatedRecord = appendManualCustomerResponseHistoryNote(
        job,
        "visit_confirmed",
        translate("workCenterVisitConfirmedManuallyByProfessional", activeLanguage),
        {
          status: "visit_scheduled",
          workStatus: "visit_scheduled",
          jobStage: "visit_scheduled",
          workflowStatus: "visit_scheduled",
          customerConfirmationStatus: "confirmed",
          confirmationStatus: "confirmed",
          customerResponseStatus: "confirmed",
        }
      );
      if (!updatedRecord) showJobActionErrorToast();
      else {
        setJobActionToast({
          type: "success",
          message:
            translate("workCenterVisitConfirmed2", activeLanguage),
        });
      }
      return;
    }

    if (actionType === "reschedule_visit") {
      appendManualCustomerResponseHistoryNote(
        job,
        "visit_reschedule_requested",
        translate("workCenterVisitRescheduleRecorded", activeLanguage),
        {
          customerConfirmationStatus: "reschedule_requested",
          confirmationStatus: "reschedule_requested",
          customerResponseStatus: "reschedule_requested",
        }
      );
      openJobScopedDetail("schedule", job);
      return;
    }

    if (actionType === "visit_waiting") {
      appendManualCustomerResponseHistoryNote(
        job,
        "visit_waiting",
        translate("workCenterWaitingForCustomerConfirmation2", activeLanguage),
        {
          customerConfirmationStatus: "pending_customer_confirmation",
          confirmationStatus: "pending_customer_confirmation",
          customerResponseStatus: "waiting",
        }
      );
      return;
    }

    if (actionType === "proposal_approved") {
      const updatedQuote = updateSarahPageQuoteStatus(job, "accepted", "approved");
      if (updatedQuote) {
        appendManualCustomerResponseHistoryNote(
          { ...job, quote: updatedQuote },
          "proposal_approved",
          translate("workCenterProposalApprovedByExternalCustomer", activeLanguage),
          {
            proposalCustomerResponseStatus: "approved",
            customerProposalResponseStatus: "approved",
          }
        );
      }
      return;
    }

    if (actionType === "proposal_changes_requested") {
      const updatedQuote = updateWorkCenterJobQuoteRecord(job, {
        customerResponseStatus: "changes_requested",
        revisionStatus: "requested",
        changesRequestedAt: new Date().toISOString(),
      });
      const updatedSchedule = appendManualCustomerResponseHistoryNote(
        job,
        "proposal_changes_requested",
        translate("workCenterExternalCustomerRequestedProposalChanges", activeLanguage),
        {
          proposalCustomerResponseStatus: "changes_requested",
          customerProposalResponseStatus: "changes_requested",
        }
      );
      if (!updatedQuote && !updatedSchedule) showJobActionErrorToast();
      else {
        setJobActionToast({
          type: "success",
          message:
            translate("workCenterChangeRequestRecorded", activeLanguage),
        });
      }
      return;
    }

    if (actionType === "proposal_waiting") {
      appendManualCustomerResponseHistoryNote(
        job,
        "proposal_waiting",
        translate("workCenterProposalStillWaitingForResponse", activeLanguage),
        {
          proposalCustomerResponseStatus: "waiting",
          customerProposalResponseStatus: "waiting",
        }
      );
      return;
    }

    if (actionType === "record_deposit") {
      recordSarahPayment(
        job,
        "deposit_received",
        translate("workCenterDepositRecordedManually", activeLanguage)
      );
      return;
    }

    if (actionType === "mark_paid_full") {
      recordSarahPayment(
        job,
        "paid",
        translate("workCenterFullPaymentRecordedManually", activeLanguage)
      );
      return;
    }

    if (actionType === "payment_pending") {
      saveManualJobNote(
        job,
        "payment_pending",
        translate("workCenterPaymentPendingRecorded", activeLanguage)
      );
      return;
    }

    if (actionType === "work_date_confirmed") {
      const updatedRecord = appendManualCustomerResponseHistoryNote(
        job,
        "work_date_confirmed",
        translate("workCenterWorkDateConfirmedByExternalCustomer", activeLanguage),
        {
          status: "work_scheduled",
          workStatus: "work_scheduled",
          jobStage: "work_scheduled",
          workflowStatus: "work_scheduled",
          customerConfirmationStatus: "confirmed",
          confirmationStatus: "confirmed",
          customerResponseStatus: "confirmed",
        }
      );
      if (!updatedRecord) showJobActionErrorToast();
      else {
        setJobActionToast({
          type: "success",
          message:
            translate("workCenterWorkDateConfirmed", activeLanguage),
        });
      }
      return;
    }

    if (actionType === "reschedule_work") {
      setShowWorkAppointmentForm(true);
      appendManualCustomerResponseHistoryNote(
        job,
        "work_reschedule_requested",
        translate("workCenterWorkRescheduleRecorded", activeLanguage),
        {
          customerConfirmationStatus: "reschedule_requested",
          confirmationStatus: "reschedule_requested",
          customerResponseStatus: "reschedule_requested",
        }
      );
      return;
    }

    if (actionType === "work_waiting") {
      appendManualCustomerResponseHistoryNote(
        job,
        "work_waiting",
        translate("workCenterWorkDateStillWaitingForConfirmation", activeLanguage),
        {
          customerConfirmationStatus: "pending_customer_confirmation",
          confirmationStatus: "pending_customer_confirmation",
          customerResponseStatus: "waiting",
        }
      );
      return;
    }

    if (actionType === "mark_receipt_sent") {
      const now = new Date().toISOString();
      const updatedRecord = appendManualCustomerResponseHistoryNote(
        job,
        "receipt_sent_externally",
        translate("workCenterReceiptSentExternally", activeLanguage),
        {
          invoiceStatus: "sent",
          receiptStatus: "sent",
          invoiceSentAt: now,
          receiptSentAt: now,
          receiptSendMethod: "external_share",
          receiptDeliveryMethod: "external_share",
        }
      );
      if (updatedRecord) {
        setRefreshKey((key) => key + 1);
        showJobActionSavedToast("invoice_sent");
      }
      return;
    }
  };

  const createSarahPageQuoteRecord = (job = {}) => {
    if (!canReadLegacyWorkflowStorage()) return null;
    const now = new Date().toISOString();
    const quoteId = `job-quote-${Date.now()}`;
    const quote = {
      quoteId,
      id: quoteId,
      source: "job_page_v1",
      workflowSource: "job_page",
      status: "draft",
      quoteStatus: "draft",
      projectTitle: job.title || translate("scheduledVisit"),
      title: job.title || translate("scheduledVisit"),
      homeownerName: job.customer || "",
      customerName: job.customer || "",
      address: job.address || "",
      location: job.address || "",
      requestId: job.requestId || job.schedule?.requestId || job.schedule?.id || job.id || "",
      scheduleId: job.schedule?.id || job.schedule?.scheduleId || "",
      visitId: job.schedule?.visitId || job.schedule?.id || "",
      conversationId: job.conversationId || job.schedule?.conversationId || "",
      laborAmount: "",
      materialsAmount: "",
      totalAmount: "",
      pricingNeedsReview: true,
      evaluationNotes: job.schedule?.evaluationNotes || job.schedule?.evaluation?.notes || "",
      workItems: getWorkCenterJobWorkItems(job),
      createdAt: now,
      updatedAt: now,
    };
    const savedQuotes = readMeetroArray("workCenterQuoteHistory");
    const updatedQuotes = [quote, ...savedQuotes];
    localStorage.setItem("workCenterQuoteHistory", JSON.stringify(updatedQuotes));
    localStorage.setItem("meetroQuoteHistory", JSON.stringify(updatedQuotes));
    localStorage.setItem("quoteHistory", JSON.stringify(updatedQuotes));
    const scheduleWithTimeline = updateWorkCenterJobScheduleRecord(job, {
      ...buildJobTimelinePatch(job, "proposal_created"),
      quoteId,
    });
    window.dispatchEvent(new Event("storage"));
    setSelectedWorkCenterJob((current) =>
      current && current.id === job.id
        ? { ...current, quote, schedule: scheduleWithTimeline || current.schedule }
        : current
    );
    setRefreshKey((key) => key + 1);
    showJobActionSavedToast("proposal_created");
    return quote;
  };

  const updateSarahPageQuoteStatus = (job = {}, nextStatus = "", timelineStage = nextStatus) => {
    const updatedQuote = updateWorkCenterJobQuoteRecord(job, {
      status: nextStatus,
      quoteStatus: nextStatus,
      ...(nextStatus === "sent" ? { sentAt: new Date().toISOString() } : {}),
      ...(nextStatus === "accepted" ? { acceptedAt: new Date().toISOString() } : {}),
    });
    if (!updatedQuote) {
      showJobActionErrorToast();
      return null;
    }
    const updatedSchedule = job.schedule
      ? updateWorkCenterJobScheduleRecord(job, {
          ...buildJobTimelinePatch({ ...job, quote: updatedQuote }, timelineStage),
          quoteId: updatedQuote.quoteId || updatedQuote.id || "",
        })
      : null;
    const updatedJob = {
      ...job,
      quote: updatedQuote,
      schedule: updatedSchedule || job.schedule,
    };
    const customerUpdate = ["proposal_sent", "approved"].includes(timelineStage)
      ? createCustomerWorkflowUpdate(updatedJob, timelineStage)
      : null;
    setSelectedWorkCenterJob((current) =>
      current && current.id === job.id
        ? { ...current, quote: updatedQuote, schedule: updatedSchedule || current.schedule }
        : current
    );
    setRefreshKey((key) => key + 1);
    showJobActionSavedToast(timelineStage, customerUpdate);
    return updatedQuote;
  };

  const getCustomerWorkflowUpdateText = (nextStage, job = {}) => {
    const service = job.title || translate("scheduledVisit");
    const state = getSarahJobStateDefinition(nextStage);
    return state.customerNotification || `${service}: ${getWorkCenterJobStatus(job)}`;
  };

  const createCustomerWorkflowUpdate = (job = {}, nextStage = "") => {
    const conversationId =
      job.conversationId ||
      job.schedule?.conversationId ||
      job.quote?.conversationId ||
      job.history?.conversationId ||
      "";
    const messageText = getCustomerWorkflowUpdateText(nextStage, job);
    const updateRecord = {
      id: `job-status-${nextStage || "update"}-${Date.now()}`,
      sender: "business",
      role: "business",
      senderRole: "business",
      type: "job-status-update",
      workflowType: "job_status_update",
      workflowSource: "job_workspace",
      deliveryMethod: conversationId ? "meetro_chat" : "external_prepared",
      conversationId,
      requestId: job.requestId || job.schedule?.requestId || job.quote?.requestId || "",
      scheduleId: job.schedule?.id || job.schedule?.scheduleId || "",
      quoteId: job.quote?.quoteId || job.quote?.id || "",
      title: getWorkCenterJobStatus({
        ...job,
        schedule: {
          ...(job.schedule || {}),
          jobStage: nextStage,
          workStatus: nextStage,
          status: nextStage,
        },
      }),
      text: messageText,
      customerName: job.customer || "",
      service: job.title || "",
      location: job.address || "",
      createdAt: new Date().toISOString(),
      time: formatDisplayScheduleTime(new Date()),
    };

    if (conversationId) {
      const storageKey = `meetro_conversation_${conversationId}`;
      const existingMessages = readMeetroArray(storageKey);
      localStorage.setItem(
        storageKey,
        JSON.stringify([...existingMessages, updateRecord])
      );
      markConversationUnreadForRecipient(conversationId, "business", {
        id: conversationId,
        conversationId,
        customerName: job.customer || "",
        project_description: job.title || "",
        lastMessage: messageText,
        requestId: updateRecord.requestId,
      });
      window.dispatchEvent(new Event("meetro-messages-updated"));
    } else {
      const preparedUpdates = readMeetroArray("meetro_external_customer_updates");
      localStorage.setItem(
        "meetro_external_customer_updates",
        JSON.stringify([updateRecord, ...preparedUpdates])
      );
    }

    return updateRecord;
  };

  const createCustomerAppointmentCard = (job = {}, visit = {}) => {
    const conversationId =
      visit.conversationId ||
      job.conversationId ||
      job.request?.conversationId ||
      "";
    const serviceLines = Array.isArray(visit.services) && visit.services.length > 0
      ? visit.services
      : [visit.requestTitle || visit.title || job.title].filter(Boolean);
    const isWorkAppointment =
      String(visit.appointmentType || "").toLowerCase() === "work" ||
      String(visit.workflowStage || visit.jobStage || visit.workStatus || "").toLowerCase() ===
        "work_scheduled" ||
      Boolean(visit.workAppointmentId);
    const formattedTime = formatScheduleTime(visit.time);
    const appointmentMessage = {
      id: `appointment-${visit.id || Date.now()}`,
      sender: "business",
      role: "business",
      senderRole: "business",
      type: "schedule",
      workflowType: isWorkAppointment ? "work_scheduled" : "appointment_scheduled",
      workflowSource: isWorkAppointment ? "job_page_work_appointment" : "job_page_schedule_visit",
      deliveryMethod: conversationId ? "meetro_chat" : "external_prepared",
      conversationId,
      requestId: visit.requestId || job.requestId || job.id || "",
      appointmentId: visit.id || visit.scheduleId || "",
      scheduleId: visit.id || visit.scheduleId || "",
      customerConfirmationStatus: "pending_customer_confirmation",
      confirmationStatus: "pending_customer_confirmation",
      title: isWorkAppointment
        ? translate("workScheduled", activeLanguage)
        : translate("appointmentScheduled", activeLanguage),
      subtitle: `${visit.date || ""} • ${formattedTime} • ${translate("appointmentPendingConfirmation")}`,
      text: isWorkAppointment
        ? translate("workCenterScheduledWorkDetail", activeLanguage, {
            date: visit.date,
            time: formattedTime,
            services: serviceLines.join(", "),
            address: visit.location || job.address || "",
          })
        : translate("workCenterEvaluationVisitScheduledDetail", activeLanguage, {
            date: visit.date,
            time: formattedTime,
          }),
      services: serviceLines,
      schedule: visit,
      customerName: job.customer || visit.customerName || "",
      service: job.title || visit.title || "",
      location: job.address || visit.location || "",
      createdAt: new Date().toISOString(),
      time: formatDisplayScheduleTime(new Date()),
    };

    if (conversationId) {
      const storageKey = `meetro_conversation_${conversationId}`;
      const existingMessages = readMeetroArray(storageKey);
      localStorage.setItem(
        storageKey,
        JSON.stringify([...existingMessages, appointmentMessage])
      );
      markConversationUnreadForRecipient(conversationId, "business", {
        id: conversationId,
        conversationId,
        customerName: job.customer || visit.customerName || "",
        project_description: job.title || visit.title || "",
        lastMessage: appointmentMessage.text,
        requestId: appointmentMessage.requestId,
      });
      window.dispatchEvent(new Event("meetro-messages-updated"));
    } else {
      const preparedUpdates = readMeetroArray("meetro_external_customer_updates");
      localStorage.setItem(
        "meetro_external_customer_updates",
        JSON.stringify([appointmentMessage, ...preparedUpdates])
      );
    }

    return appointmentMessage;
  };

  const buildJobTimelinePatch = (job = {}, nextStage = "") => {
    const meta = getWorkflowActionMeta(nextStage);
    const timestamp = new Date().toISOString();
    const existingEvents = getWorkCenterJobSavedTimelineEvents(job);
    const event = {
      id: `job-event-${nextStage || "status"}-${Date.now()}`,
      stage: nextStage,
      label: meta.label,
      savedAt: timestamp,
      timestamp,
      status: "saved",
      source: "job_workspace",
    };

    return {
      jobTimelineEvents: [...existingEvents, event],
      timelineEvents: [...existingEvents, event],
      lastWorkflowEvent: event,
    };
  };

  const buildManualJobTimelinePatch = (job = {}, stage = "", label = "") => {
    const timestamp = new Date().toISOString();
    const existingEvents = getWorkCenterJobSavedTimelineEvents(job);
    const event = {
      id: `manual-job-event-${stage || "note"}-${Date.now()}`,
      stage,
      label: label || (translate("workCenterNoteSaved", activeLanguage)),
      savedAt: timestamp,
      timestamp,
      status: "saved",
      source: "job_workspace_manual_entry",
    };

    return {
      jobTimelineEvents: [...existingEvents, event],
      timelineEvents: [...existingEvents, event],
      lastWorkflowEvent: event,
    };
  };

  const appendManualCustomerResponseHistoryNote = (
    job = {},
    stage = "",
    label = "",
    patch = {}
  ) => {
    if (!canReadLegacyWorkflowStorage()) return null;
    const scheduleId = String(job.schedule?.id || job.schedule?.scheduleId || "");
    if (!scheduleId) {
      showJobActionErrorToast();
      return null;
    }

    const schedule = readMeetroArray("meetro_business_schedule");
    let updatedRecord = null;
    const updatedSchedule = schedule.map((item) => {
      if (String(item.id || item.scheduleId || "") !== scheduleId) return item;

      const manualPatch = buildManualJobTimelinePatch(
        { ...job, schedule: item },
        stage,
        label
      );
      updatedRecord = {
        ...item,
        ...manualPatch,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      return updatedRecord;
    });

    if (!updatedRecord) {
      showJobActionErrorToast();
      return null;
    }

    localStorage.setItem("meetro_business_schedule", JSON.stringify(updatedSchedule));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("meetroJobRecordUpdated"));
    setSelectedWorkCenterJob((current) =>
      current && current.id === job.id
        ? { ...current, schedule: updatedRecord }
        : current
    );

    return updatedRecord;
  };

  const showJobActionSavedToast = (nextStage = "", customerUpdate = null) => {
    const meta = getWorkflowActionMeta(nextStage);
    const customerSuffix = customerUpdate
      ? customerUpdate.deliveryMethod === "meetro_chat"
        ? meta.customerSent
        : meta.customerPrepared
      : "";
    setJobActionToast({
      type: "success",
      message: [meta.toast, customerSuffix].filter(Boolean).join(" "),
    });
  };

  const showJobActionErrorToast = () => {
    setJobActionToast({
      type: "error",
      message:
        translate("workCenterCouldNotSaveStatusTryAgain", activeLanguage),
    });
  };

  const advanceWorkCenterJobSchedule = (job = {}, nextStage = "", patch = {}) => {
    const updatedRecord = updateWorkCenterJobScheduleRecord(job, {
      ...patch,
      ...buildJobTimelinePatch(job, nextStage),
      status: nextStage,
      workStatus: nextStage,
      jobStage: nextStage,
    });

    if (!updatedRecord) {
      showJobActionErrorToast();
      return null;
    }

    const customerUpdate = createCustomerWorkflowUpdate(
      {
        ...job,
        schedule: updatedRecord,
      },
      nextStage
    );
    showJobActionSavedToast(nextStage, customerUpdate);

    return updatedRecord;
  };

  const createProposalFromWorkCenterJob = (job = {}) => {
    const schedule = job.schedule || {};
    const evaluation = schedule.evaluation || {};
    const workItems = Array.isArray(evaluation.workItems)
      ? evaluation.workItems
      : Array.isArray(schedule.workItems)
        ? schedule.workItems
        : Array.isArray(schedule.evaluationItems)
          ? schedule.evaluationItems
          : [];
    const materialItems = workItems.flatMap((workItem) =>
      (Array.isArray(workItem.materials) ? workItem.materials : []).map((material) => ({
        ...material,
        workItemId: workItem.id || "",
        workItemTitle: workItem.title || "",
        lineTotal: getMaterialLineTotal(material),
      }))
    );

    localStorage.setItem(
      "selectedQuoteRequest",
      JSON.stringify({
        id: schedule.requestId || schedule.id || job.id || "",
        requestId: schedule.requestId || job.requestId || "",
        scheduleId: schedule.id || "",
        visitId: schedule.visitId || schedule.id || "",
        evaluationId: evaluation.id || "",
        conversationId: job.conversationId || schedule.conversationId || "",
        projectConversationId: job.conversationId || schedule.projectConversationId || "",
        title: job.title || schedule.title || translate("scheduledVisit"),
        service: job.title || schedule.title || translate("scheduledVisit"),
        description: evaluation.notes || schedule.evaluationNotes || schedule.notes || "",
        project_description: evaluation.notes || schedule.evaluationNotes || schedule.notes || "",
        scope: evaluation.notes || schedule.evaluationNotes || schedule.notes || "",
        location: job.address || schedule.location || "",
        address: job.address || schedule.location || "",
        homeownerName: job.customer || schedule.customerName || "",
        customerName: job.customer || schedule.customerName || "",
        customerPhone: schedule.customerPhone || "",
        customerEmail: schedule.customerEmail || "",
        customerAddress: job.address || schedule.customerAddress || schedule.location || "",
        evaluationNotes: evaluation.notes || schedule.evaluationNotes || "",
        evaluation,
        evaluationItems: workItems,
        workItems,
        materialItems,
        materials: materialItems,
        materialsTotal: getEvaluationMaterialsTotal(workItems),
        calculatedMaterialsTotal: getEvaluationMaterialsTotal(workItems),
        addPricingRequired: true,
        source: "job_workspace",
      })
    );
    localStorage.setItem("quoteBuilderSource", "job_workspace");
    localStorage.setItem("quoteBuilderScheduleId", schedule.id || "");
    localStorage.setItem("quoteBuilderReturnPage", "workCenter");
    localStorage.setItem("workCenterReturnCustomer", job.customer || "");
    localStorage.setItem("meetroWorkCenterTab", "quotes");
    localStorage.setItem("activeWorkCenterTab", "quotes");
    setSelectedWorkCenterJob(null);
    setPage("quoteBuilder");
  };

  const openProposalBuilderForWorkCenterJob = (job = {}) => {
    if (job.quote?.quoteId || job.quote?.id) {
      localStorage.setItem("selectedQuoteForEdit", JSON.stringify(job.quote));
      localStorage.setItem("quoteBuilderReturnPage", "workCenter");
      localStorage.setItem("workCenterReturnCustomer", job.customer || "");
      localStorage.setItem("meetroWorkCenterTab", "quotes");
      localStorage.setItem("activeWorkCenterTab", "quotes");
      setSelectedWorkCenterJob(null);
      setPage("quoteBuilder");
      return;
    }

    createProposalFromWorkCenterJob(job);
  };

  const openProposalSendFlowForWorkCenterJob = (job = {}) => {
    setShowApprovalConfirmFlow(false);
    setShowPaymentForm(false);
    setShowWorkAppointmentForm(false);
    setShowCloseJobForm(false);
    setShowReceiptSendFlow(false);
    setSendFlowDraft({
      method:
        job.conversationId || job.schedule?.conversationId || job.quote?.conversationId
          ? "meetro_chat"
          : "external_share",
      note: "",
    });
    setShowProposalSendFlow(true);
  };

  const confirmProposalSendForWorkCenterJob = (job = {}) => {
    if (!job.quote) {
      setJobActionToast({
        type: "error",
        message:
          translate("workCenterCreateTheProposalBeforeSendingIt", activeLanguage),
      });
      return null;
    }

    const updatedQuote = updateSarahPageQuoteStatus(job, "sent", "proposal_sent");
    if (!updatedQuote) return null;

    setShowProposalSendFlow(false);
    setSendFlowDraft({ method: "meetro_chat", note: "" });
    return updatedQuote;
  };

  const openPaymentFormForWorkCenterJob = (job = {}) => {
    setShowApprovalConfirmFlow(false);
    setShowWorkAppointmentForm(false);
    setShowCloseJobForm(false);
    setShowProposalSendFlow(false);
    setShowReceiptSendFlow(false);
    setPaymentDraft(
      createDefaultPaymentDraft(
        getWorkCenterJobFinalTotal(job) || getQuoteTotalAmount(job.quote || {})
      )
    );
    setShowPaymentForm(true);
  };

  const openApprovalConfirmationForWorkCenterJob = () => {
    setShowPaymentForm(false);
    setShowWorkAppointmentForm(false);
    setShowProposalSendFlow(false);
    setShowReceiptSendFlow(false);
    setShowCloseJobForm(false);
    setApprovalDraft(createDefaultApprovalDraft());
    setShowApprovalConfirmFlow(true);
  };

  const confirmApprovalForWorkCenterJob = (job = {}) => {
    if (!approvalDraft.confirmed) {
      setJobActionToast({
        type: "error",
        message:
          translate("workCenterConfirmThatTheCustomerApprovedTheProposal", activeLanguage),
      });
      return null;
    }

    const updatedQuote = updateSarahPageQuoteStatus(job, "accepted", "approved");
    if (!updatedQuote) return null;

    if (approvalDraft.note && job.schedule) {
      updateWorkCenterJobScheduleRecord(job, {
        approvalNote: approvalDraft.note,
        approvalConfirmedAt: updatedQuote.acceptedAt || new Date().toISOString(),
      });
    }

    setShowApprovalConfirmFlow(false);
    setApprovalDraft(createDefaultApprovalDraft());
    return updatedQuote;
  };

  const savePaymentForWorkCenterJob = (job = {}) => {
    const amount = parseMeetroAmount(paymentDraft.amount);
    if (amount === null || amount <= 0) {
      setJobActionToast({
        type: "error",
        message:
          translate("workCenterAddAValidAmountBeforeSavingThePayment", activeLanguage),
      });
      return null;
    }

    const now = new Date().toISOString();
    const paymentStatus =
      paymentDraft.paymentType === "full" ? "paid" : "deposit_received";
    const paymentRecord = {
      amount,
      paymentType: paymentDraft.paymentType,
      method: paymentDraft.method,
      date: paymentDraft.date,
      note: paymentDraft.note,
      savedAt: now,
    };
    const updatedQuote = updateWorkCenterJobQuoteRecord(job, {
      paymentStatus,
      paymentAmount: amount,
      paymentType: paymentDraft.paymentType,
      paymentMethod: paymentDraft.method,
      paymentDate: paymentDraft.date,
      paymentNote: paymentDraft.note,
      paymentReceivedAt: now,
      paymentRecord,
      ...(paymentStatus === "paid" ? { paidAt: now } : { depositPaidAt: now }),
    });

    if (!updatedQuote) {
      showJobActionErrorToast();
      return null;
    }

    const updatedSchedule = job.schedule
      ? updateWorkCenterJobScheduleRecord(job, {
          ...buildJobTimelinePatch({ ...job, quote: updatedQuote }, "payment_received"),
          paymentStatus,
          paymentAmount: amount,
          paymentType: paymentDraft.paymentType,
          paymentMethod: paymentDraft.method,
          paymentDate: paymentDraft.date,
          paymentNote: paymentDraft.note,
          paymentReceivedAt: now,
          paymentRecord,
        })
      : null;

    setSelectedWorkCenterJob((current) =>
      current && current.id === job.id
        ? { ...current, quote: updatedQuote, schedule: updatedSchedule || current.schedule }
        : current
    );
    setShowPaymentForm(false);
    setPaymentDraft(createDefaultPaymentDraft());
    setRefreshKey((key) => key + 1);
    showJobActionSavedToast("payment_received");
    return paymentRecord;
  };

  const openCompletionFormForWorkCenterJob = () => setPage("completionSheet");

  const openReceiptBuilderForWorkCenterJob = (job = {}) => {
    const conversationId =
      job.conversationId || job.schedule?.conversationId || job.quote?.conversationId || "";
    if (conversationId) localStorage.setItem("activeConversationId", conversationId);
    localStorage.setItem("activeJobService", job.title || translate("scheduledWork"));
    localStorage.setItem("activeJobLocation", job.address || "");
    localStorage.setItem("activeJobCustomer", job.customer || "");
    localStorage.setItem("workCenterReturnCustomer", job.customer || "");
    localStorage.setItem("invoiceBuilderReturnPage", "workCenter");
    localStorage.setItem(
      "invoiceBuilderScheduleId",
      job.schedule?.id || job.schedule?.scheduleId || ""
    );
    localStorage.setItem(
      "invoiceBuilderQuoteId",
      job.quote?.quoteId || job.quote?.id || job.schedule?.quoteId || ""
    );
    setPage("invoiceBuilder");
  };

  const openReceiptSendFlowForWorkCenterJob = (job = {}) => {
    setShowApprovalConfirmFlow(false);
    setShowPaymentForm(false);
    setShowWorkAppointmentForm(false);
    setShowCloseJobForm(false);
    setShowProposalSendFlow(false);
    setSendFlowDraft({
      method:
        job.conversationId || job.schedule?.conversationId || job.quote?.conversationId
          ? "meetro_chat"
          : "external_share",
      note: "",
    });
    setShowReceiptSendFlow(true);
  };

  const confirmReceiptSendForWorkCenterJob = (job = {}) => {
    if (!job.schedule) {
      showJobActionErrorToast();
      return null;
    }

    const now = new Date().toISOString();
    if (sendFlowDraft.method === "external_share") {
      const updatedRecord = appendManualCustomerResponseHistoryNote(
        job,
        "receipt_external_send_prepared",
        translate("workCenterReceiptPreparedForExternalSending", activeLanguage),
        {
          receiptDeliveryStatus: "external_send_prepared",
          receiptSendMethod: "external_share",
          receiptPreparedAt: now,
        }
      );

      if (!updatedRecord) return null;

      setShowReceiptSendFlow(false);
      setSendFlowDraft({ method: "meetro_chat", note: "" });
      setRefreshKey((key) => key + 1);
      setJobActionToast({
        type: "success",
        message:
          translate("workCenterReadyToMarkTheReceiptSentExternally", activeLanguage),
      });
      return updatedRecord;
    }

    const updatedRecord = updateWorkCenterJobScheduleRecord(job, {
      ...buildJobTimelinePatch(job, "invoice_sent"),
      invoiceStatus: "sent",
      receiptStatus: "sent",
      invoiceSentAt: now,
      receiptSentAt: now,
      receiptSendMethod: sendFlowDraft.method,
      receiptSendNote: sendFlowDraft.note,
    });

    if (!updatedRecord) {
      showJobActionErrorToast();
      return null;
    }

    const updatedJob = { ...job, schedule: updatedRecord };
    const customerUpdate = createCustomerWorkflowUpdate(updatedJob, "invoice_sent");
    setSelectedWorkCenterJob((current) =>
      current && current.id === job.id
        ? { ...current, schedule: updatedRecord }
        : current
    );
    setShowReceiptSendFlow(false);
    setSendFlowDraft({ method: "meetro_chat", note: "" });
    setRefreshKey((key) => key + 1);
    showJobActionSavedToast("invoice_sent", customerUpdate);
    return updatedRecord;
  };

  function showLifecycleAuthorityUnavailable() {
    setShowCloseJobForm(false);
    setJobActionToast({
      type: "error",
      message: translate("lifecycleDashboardActionUnavailable", activeLanguage),
    });
  }

  const openCloseJobConfirmationForWorkCenterJob = () => {
    showLifecycleAuthorityUnavailable();
  };

  const confirmCloseWorkCenterJob = () => {
    showLifecycleAuthorityUnavailable();
    return null;
  };

  const openWorkCenterJobPrimaryAction = (job = selectedWorkCenterJob) => {
    if (!job) return;
    if (isCanonicalWorkCenterEntry(job)) {
      showLifecycleAuthorityUnavailable();
      return;
    }
    const stage = getSarahJobStateKey(job);

    if (stage === "lead") {
      createSarahPageVisitRecord(job);
      return;
    }

    if (stage === "visit_scheduled") {
      if (isCustomerResponsePending(job.schedule || {})) {
        setJobActionToast({
          type: "error",
          message:
            translate("workCenterRecordTheCustomerConfirmationBeforeStartingEvaluation", activeLanguage),
        });
        return;
      }
      openJobScopedDetail("evaluation", job);
      return;
    }

    if (stage === "evaluation_complete") {
      openProposalBuilderForWorkCenterJob(job);
      return;
    }

    if (stage === "quote_created") {
      openProposalSendFlowForWorkCenterJob(job);
      return;
    }

    if (stage === "proposal_sent") {
      openApprovalConfirmationForWorkCenterJob();
      return;
    }

    if (stage === "approved") {
      openPaymentFormForWorkCenterJob(job);
      return;
    }

    if (stage === "payment_received") {
      setShowPaymentForm(false);
      setShowProposalSendFlow(false);
      setShowReceiptSendFlow(false);
      setShowCloseJobForm(false);
      setWorkAppointmentDraft(createDefaultWorkAppointmentDraft());
      setShowWorkAppointmentForm(true);
      return;
    }

    if (stage === "work_scheduled") {
      if (isCustomerResponsePending(job.schedule || {})) {
        setJobActionToast({
          type: "error",
          message:
            translate("workCenterRecordTheWorkDateConfirmationBeforeMarkingOnTheWay", activeLanguage),
        });
        return;
      }
      advanceWorkCenterJobSchedule(job, "on_the_way");
      return;
    }

    if (stage === "en_route") {
      advanceWorkCenterJobSchedule(job, "arrived");
      return;
    }

    if (stage === "arrived") {
      advanceWorkCenterJobSchedule(job, "working");
      return;
    }

    if (stage === "working") {
      openCompletionFormForWorkCenterJob(job);
      return;
    }

    if (stage === "completed") {
      openReceiptBuilderForWorkCenterJob(job);
      return;
    }

    if (stage === "receipt_created") {
      openReceiptSendFlowForWorkCenterJob(job);
      return;
    }

    if (stage === "receipt_sent") {
      openCloseJobConfirmationForWorkCenterJob();
      return;
    }

    if (stage === "closed") {
      setIsJobHistoryMode(true);
      setSelectedJobDetailView("history");
      return;
    }

    createSarahPageVisitRecord(job);
  };

  const seedJobPageEvaluationForm = (job = {}) => {
    const schedule = job.schedule || {};
    const savedEvaluation = schedule.evaluation || {};
    const evaluationSelection = getEvaluationSelectionSeed(schedule);
    const evaluationTemplate = resolveEvaluationTemplate(evaluationSelection);
    setEvaluationSaveNotice("");
    setEvaluationSaveError("");
    setEvaluationForm({
      serviceType: evaluationSelection.serviceType,
      context: evaluationSelection.context,
      evaluationTemplate: evaluationTemplate.found
        ? evaluationTemplate.evaluationTemplate
        : null,
      templateRequirements: evaluationTemplate.found
        ? [...(evaluationTemplate.template?.requirements || [])]
        : [],
	      photos: Array.isArray(savedEvaluation.photos) ? savedEvaluation.photos : [],
	      findings: getEvaluationFindingNotes(
	        savedEvaluation,
	        typeof schedule.evaluationFindings === "string" ? schedule.evaluationFindings : ""
	      ),
	      findingRecords: getEvaluationFindingSeeds(savedEvaluation, schedule),
      materialsNeeded:
        savedEvaluation.materialsNeeded || schedule.evaluationMaterialsNeeded || "",
      laborNotes: savedEvaluation.laborNotes || schedule.evaluationLaborNotes || "",
      safetyNotes: savedEvaluation.safetyNotes || schedule.evaluationSafetyNotes || "",
      photoNotes: savedEvaluation.photoNotes || schedule.evaluationPhotoNotes || "",
      notes:
        savedEvaluation.visitNotes ||
        schedule.evaluationVisitNotes ||
        schedule.evaluationNotes ||
        "",
      workItems: getVisitEvaluationWorkItems({
        ...schedule,
        title: schedule.title || job.title || "",
        requestTitle: schedule.requestTitle || job.title || "",
      }),
      nextStep: savedEvaluation.recommendedNextStep || "quote",
    });
    if (!canReadLegacyWorkflowStorage()) {
      void hydrateCanonicalEvaluation(job);
    }
  };

  const saveSarahPageEvaluationNotes = (job = {}) => {
    if (!job.schedule?.id && !job.schedule?.scheduleId) {
      showJobActionErrorToast();
      return null;
    }

    if (!hasEvaluationSelection()) {
      setJobActionToast({
        type: "error",
        message:
          translate("workCenterSelectServiceTypeAndContextBeforeSavingEvaluationNotes", activeLanguage),
      });
      return null;
    }

    if (!canReadLegacyWorkflowStorage()) {
      void persistCanonicalEvaluation(job);
      return null;
    }

    const normalizedWorkItems = Array.isArray(evaluationForm.workItems)
      ? evaluationForm.workItems.map(sanitizeEvaluationWorkItem)
      : [];
    const evaluationPhotos = Array.isArray(evaluationForm.photos)
      ? evaluationForm.photos.map(sanitizeEvaluationPhoto)
      : [];
    const createdAt = new Date().toISOString();
    const summary = buildEvaluationSummary({
      ...evaluationForm,
      photos: evaluationPhotos,
      workItems: normalizedWorkItems,
    });
	    const selection = resolveEvaluationSelection(evaluationForm);
	    const evaluationId =
	      job.schedule?.evaluation?.id || `evaluation-${job.schedule?.id || Date.now()}`;
	    const customerId = getEvaluationCustomerScope({
	      ...job,
	      ...(job.schedule || {}),
	    });
	    const requestId = job.requestId || job.schedule?.requestId || "";
	    const structuredFindings = buildStructuredEvaluationFindings({
	      evaluationId,
	      customerId,
	      requestId,
	      findings: evaluationForm.findingRecords,
	    });
	    const evaluationRecord = buildVisitEvaluationPayload({
	      schedule: job.schedule || {},
	      customerId,
	      evaluation: {
	      id: evaluationId,
      type: "evaluation",
      source: "job_page_v1",
      scheduleId: job.schedule?.id || job.schedule?.scheduleId || "",
      visitId: job.schedule?.visitId || job.schedule?.id || "",
	      appointmentId: job.schedule?.id || job.schedule?.scheduleId || "",
	      evaluationId,
	      customerId,
	      requestId,
      conversationId: job.conversationId || job.schedule?.conversationId || "",
      notes: summary,
      serviceType: selection.serviceType,
      context: selection.context,
      evaluationTemplate: selection.evaluationTemplate,
      evaluationTemplateMatched: selection.evaluationTemplateMatched,
      templateRequirements: selection.templateRequirements,
      visitNotes: sanitizeEvaluationText(evaluationForm.notes),
      customerNeeds: sanitizeEvaluationText(evaluationForm.notes),
	      findings: structuredFindings.findings,
	      findingsNotes: sanitizeEvaluationText(evaluationForm.findings),
	      findingsText: sanitizeEvaluationText(evaluationForm.findings),
	      serviceRecommendations: structuredFindings.serviceRecommendations,
	      findingsNormalizationErrors: structuredFindings.errors,
      materialsNeeded: sanitizeEvaluationText(evaluationForm.materialsNeeded),
      laborNotes: sanitizeEvaluationText(evaluationForm.laborNotes),
      safetyNotes: sanitizeEvaluationText(evaluationForm.safetyNotes),
      photoNotes: sanitizeEvaluationText(evaluationForm.photoNotes),
      photos: evaluationPhotos,
      workItems: normalizedWorkItems,
      recommendedNextStep: sanitizeEvaluationText(evaluationForm.nextStep || "quote"),
      savedAt: createdAt,
      updatedAt: createdAt,
	      },
	    });

    const updatedRecord = updateWorkCenterJobScheduleRecord(job, {
      ...buildJobTimelinePatch(job, "evaluation_completed"),
      evaluation: evaluationRecord,
      serviceType: evaluationRecord.serviceType,
      context: evaluationRecord.context,
      evaluationTemplate: evaluationRecord.evaluationTemplate,
      evaluationTemplateMatched: evaluationRecord.evaluationTemplateMatched,
      templateRequirements: evaluationRecord.templateRequirements,
      evaluationServiceType: evaluationRecord.serviceType,
      evaluationContext: evaluationRecord.context,
      evaluationItems: evaluationRecord.workItems,
      workItems: evaluationRecord.workItems,
      evaluationNotes: summary,
      evaluationVisitNotes: evaluationRecord.visitNotes,
	      evaluationFindings: evaluationRecord.findingsNotes,
	      evaluationStructuredFindings: evaluationRecord.findings,
	      serviceRecommendations: evaluationRecord.serviceRecommendations,
      evaluationMaterialsNeeded: evaluationRecord.materialsNeeded,
      evaluationLaborNotes: evaluationRecord.laborNotes,
      evaluationSafetyNotes: evaluationRecord.safetyNotes,
      evaluationPhotoNotes: evaluationRecord.photoNotes,
      evaluationPhotos: evaluationRecord.photos,
      evaluationStatus: "saved",
      evaluationSavedAt: createdAt,
    });

    if (!updatedRecord) {
      showJobActionErrorToast();
      return null;
    }

    setSelectedWorkCenterJob((current) =>
      current && current.id === job.id
        ? { ...current, schedule: updatedRecord }
        : current
    );
    if (hasCustomerJobReachedState(getSarahJobStateKey(job), "quote_created")) {
      setIsEditingCompletedEvaluation(false);
    }
    setRefreshKey((key) => key + 1);
    showJobActionSavedToast("evaluation_completed");
    return evaluationRecord;
  };

  const openJobScopedDetail = (view, job = selectedWorkCenterJob) => {
    if (view === "evaluation") {
      seedJobPageEvaluationForm(job);
      setIsEditingCompletedEvaluation(false);
    } else {
      setIsEditingCompletedEvaluation(false);
    }
    setSelectedJobDetailView((currentView) => (currentView === view ? "" : view));
    window.setTimeout(() => {
      jobScopedDetailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 60);
  };

  const workCenterSections = [
    {
      key: "pending",
      icon: "opportunities",
      title: translate("workCenterOpportunitiesTitle"),
      customer: dashboardCustomerLabel(
        firstOpportunity,
        translate("workCenterNewCustomer", activeLanguage)
      ),
      status:
        opportunitiesCount > 0
          ? translate("workCenterNewRequest", activeLanguage)
          : translate("workCenterNoNewRequests", activeLanguage),
      nextStep:
        opportunitiesCount > 0
          ? translate("workCenterContactOrScheduleVisit", activeLanguage)
          : translate("workCenterWaitForANewRequest", activeLanguage),
      primaryAction:
        translate("viewOpportunities", activeLanguage),
      badge: compactCountBadge(
        opportunitiesCount,
        "workCenterBadgeNew"
      ),
      tone: "#fff7ed",
      accent: "#ea580c",
    },
    {
      key: "schedule",
      icon: "schedule",
      title: translate("workCenterScheduleTitle"),
      customer: dashboardCustomerLabel(
        firstScheduleItem,
        translate("workCenterScheduledCustomer", activeLanguage)
      ),
      status:
        scheduleResponseNotifications.length > 0
          ? translate("workCenterCustomerResponded", activeLanguage)
          : upcomingScheduleCount > 0
          ? translate("workCenterVisitScheduled2", activeLanguage)
          : translate("workCenterNoUpcomingVisits", activeLanguage),
      nextStep:
        scheduleResponseNotifications.length > 0
          ? translate("workCenterReviewResponse", activeLanguage)
          : upcomingScheduleCount > 0
          ? translate("workCenterPerformVisit", activeLanguage)
          : translate("workCenterAddVisit", activeLanguage),
      primaryAction:
        upcomingScheduleCount > 0 || scheduleResponseNotifications.length > 0
          ? translate("assistantActionOpenSchedule", activeLanguage)
          : translate("workCenterAddVisit2", activeLanguage),
      badge:
        scheduleResponseNotifications.length > 0
          ? translate("workCenterResponseCount", activeLanguage, { count: scheduleResponseNotifications.length })
          : compactCountBadge(
              upcomingScheduleCount,
              "workCenterBadgeUpcoming"
            ),
      isPriority: scheduleResponseNotifications.length > 0,
      tone: "#eff6ff",
      accent: "#2563eb",
    },
    {
      key: "quotes",
      icon: "quote",
      title: translate("workCenterQuotesTitle"),
      customer: dashboardCustomerLabel(
        firstAcceptedQuoteReady || quoteHistory[0],
        translate("workCenterProposalCustomer", activeLanguage)
      ),
      status:
        acceptedQuoteReadyItems.length > 0
          ? translate("workCenterProposalApproved", activeLanguage)
          : quoteAttentionCount > 0
          ? translate("workCenterProposalSent2", activeLanguage)
          : translate("workCenterNoPendingProposals", activeLanguage),
      nextStep:
        acceptedQuoteReadyItems.length > 0
          ? translate("workCenterMoveToActiveWork", activeLanguage)
          : quoteAttentionCount > 0
          ? translate("workCenterAwaitApproval", activeLanguage)
          : translate("workCenterCreateProposalAfterVisitNotes", activeLanguage),
      primaryAction:
        acceptedQuoteReadyItems.length > 0
          ? translate("workCenterMoveToActiveWork2", activeLanguage)
          : translate("openQuotesAction", activeLanguage),
      badge:
        acceptedQuoteReadyItems.length > 0
          ? translate("workCenterAcceptedQuoteReadyCount", activeLanguage, { count: acceptedQuoteReadyItems.length })
          : compactCountBadge(
              quoteAttentionCount,
              "workCenterBadgeAttention"
            ),
      isPriority: acceptedQuoteReadyItems.length > 0,
      tone: "#f5f3ff",
      accent: "var(--meetro-color-charcoal, #172317)",
    },
    {
      key: "active",
      icon: "activeWork",
      title: translate("workCenterActiveWorkTitle"),
      customer: dashboardCustomerLabel(
        firstActiveWorkItem,
        translate("workCenterActiveCustomer", activeLanguage)
      ),
      status:
        activeWorkCount > 0
          ? translate("assistantFieldStage_activeWork", activeLanguage)
          : translate("workCenterNoActiveWork", activeLanguage),
      nextStep:
        activeWorkCount > 0
          ? translate("workCenterCompleteTheWork", activeLanguage)
          : translate("workCenterWaitForApproval", activeLanguage),
      primaryAction:
        translate("workCenterContinueJob", activeLanguage),
      badge: compactCountBadge(
        activeWorkCount,
        "workCenterBadgeActive"
      ),
      tone: "#f0fdf4",
      accent: "#16a34a",
    },
    {
      key: "completed",
      icon: "completion",
      title: translate("workCenterClosureTitle"),
      customer: dashboardCustomerLabel(
        firstClosureReview?.project,
        translate("workCenterPendingCustomer", activeLanguage)
      ),
      status:
        closureReadyCount > 0
          ? translate("workCenterReadyForClosure", activeLanguage)
          : translate("workCenterNoClosureReady", activeLanguage),
      nextStep:
        closureReadyCount > 0
          ? translate("workCenterVerifyObligations", activeLanguage)
          : translate("workCenterCompleteWorkFirst", activeLanguage),
      primaryAction:
        translate("openClosureCenterAction", activeLanguage),
      openedTitle: translate("closureCenterTitle"),
      openedDescription: translate("closureCenterPurpose"),
      openedNextStep: translate("closureCenterNextStep"),
      badge: compactCountBadge(
        closureReadyCount,
        "workCenterBadgeReady"
      ),
      tone: "#f8fafc",
      accent: "#475569",
    },
    {
      key: "records",
      icon: "jobHistory",
      title: translate("workCenterHistoryTitle"),
      customer: dashboardCustomerLabel(
        firstHistoryRecord,
        translate("workCenterRelationshipMemory", activeLanguage)
      ),
      status:
        historyRecordCount > 0
          ? translate("workCenterRecordSaved", activeLanguage)
          : translate("workCenterNoHistoryYet", activeLanguage),
      nextStep:
        historyRecordCount > 0
          ? translate("workCenterUseForFutureService", activeLanguage)
          : translate("workCenterCloseCompletedWork", activeLanguage),
      primaryAction:
        translate("openHistoryAction", activeLanguage),
      badge: compactCountBadge(
        historyRecordCount,
        "workCenterBadgeRecords"
      ),
      tone: "var(--meetro-surface-sage, #eef4ea)",
      accent: "var(--meetro-color-charcoal, #172317)",
    },
    {
      key: "revenue",
      icon: "revenue",
      title: translate("workCenterRevenueTitle"),
      customer: translate("business", activeLanguage),
      status:
        totalJobRevenue > 0
          ? translate("workCenterRevenueRecorded", activeLanguage)
          : translate("workCenterReadyToReview", activeLanguage),
      nextStep:
        translate("workCenterReviewRevenueMetrics", activeLanguage),
      primaryAction:
        translate("workCenterReviewRevenue", activeLanguage),
      badge:
        totalJobRevenue > 0
          ? `$${Number(totalJobRevenue).toLocaleString()}`
          : translate("workCenterBadgeReviewPerformance"),
      tone: "#ecfdf5",
      accent: "#059669",
    },
  ];

  const activeSection =
    workCenterSections.find((sectionItem) => {
      if (activeTab === "materials") return sectionItem.key === "active";
      return sectionItem.key === activeTab;
    }) || workCenterSections[0];
  const compactWorkCenterChildTabs = [
    "pending",
    "quotes",
    "active",
    "schedule",
    "revenue",
    "jobHistory",
  ];
  const isCompactWorkCenterChildPageOpen =
    isWorkCenterSectionOpen && compactWorkCenterChildTabs.includes(activeTab);

  function renderWorkflowDependencyBanner(source = {}) {
    const dependency = getPrimaryWorkflowDependency(source);
    if (!dependency) return null;
    const severityLabel =
      dependency.severity === "critical_warning" ? "Critical warning" : "Advisory warning";

    return (
      <div style={workflowDependencyBanner} aria-label="Waiting on Customer">
        <span style={workflowDependencySeverity}>{severityLabel}</span>
        <strong style={workflowDependencyTitle}>{dependency.title}</strong>
        <span style={workflowDependencyText}>
          Waiting on: {dependency.waitingOn}. Recommended: wait or send a reminder.
        </span>
        {dependency.requestedAt && (
          <span style={workflowDependencyMeta}>Requested {formatDateTimeDisplay(dependency.requestedAt)}</span>
        )}
        {dependency.lastReminderAt && (
          <span style={workflowDependencyMeta}>Last reminder {formatDateTimeDisplay(dependency.lastReminderAt)}</span>
        )}
      </div>
    );
  }

  function renderWorkflowDependencyPrompt() {
    if (!workflowDependencyPrompt?.dependency) return null;
    const dependency = workflowDependencyPrompt.dependency;
    const severityLabel =
      dependency.severity === "critical_warning" ? "Critical warning" : "Advisory warning";
    const attemptedActionLabel = getWorkflowDependencyActionLabel(
      workflowDependencyPrompt.action || dependency.attemptedNextAction
    );
    return (
      <div style={workflowDependencyDialogBackdrop} role="presentation">
        <section
          ref={workflowDependencyDialogRef}
          style={workflowDependencyDialog}
          role="alertdialog"
          aria-modal="true"
          aria-label={`${severityLabel}: ${dependency.title}`}
          aria-describedby="workflow-dependency-dialog-summary workflow-dependency-dialog-warning"
          tabIndex={-1}
        >
          <p style={workflowDependencyDialogEyebrow}>{severityLabel}</p>
          <h2 style={workflowDependencyDialogTitle}>{dependency.title}</h2>
          <p id="workflow-dependency-dialog-summary" style={workflowDependencyDialogText}>
            {dependency.message}
          </p>
          <div style={workflowDependencyDialogFacts}>
            <span>Attempting: {attemptedActionLabel}</span>
            <span>Waiting on: {dependency.waitingOn}</span>
            <span>Recommended: wait or send a reminder.</span>
          </div>
          <p id="workflow-dependency-dialog-warning" style={workflowDependencyDialogWarning}>
            {dependency.continueWarning}
          </p>
          {Array.isArray(dependency.relatedDependencies) &&
            dependency.relatedDependencies.length > 1 && (
              <div style={workflowDependencySummary}>
                <p style={workflowDependencySummaryTitle}>Still unresolved</p>
                <ul style={workflowDependencySummaryList}>
                  {dependency.relatedDependencies.map((item) => (
                    <li key={item.id || item.type} style={workflowDependencySummaryItem}>
                      {item.expectedAction}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          <div style={workflowDependencyDialogActions}>
            <button
              type="button"
              style={workflowDependencyRecommendedButton}
              onClick={dismissWorkflowDependencyPrompt}
            >
              Wait
            </button>
            {dependency.conversationId && (
              <button
                type="button"
                style={workflowDependencySecondaryButton}
                onClick={sendWorkflowDependencyReminder}
              >
                Send Reminder
              </button>
            )}
            <button
              type="button"
              style={workflowDependencyRiskButton}
              data-risk-action="workflow-dependency-continue-anyway"
              onClick={continueWorkflowDependencyPrompt}
            >
              Continue Anyway
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app-page contractor-dashboard meetro-wide-page meetro-visual-page" style={page}>
      <style>
        {`
          .revenue-spark span {
            flex: 1;
            border-radius: 999px;
            background: rgba(31,77,52,0.35);
            display: block;
          }
        `}
      </style>
      {renderWorkflowDependencyPrompt()}
      {!isCompactWorkCenterChildPageOpen && (
        <div style={topBar}>
          {!isWorkCenterSectionOpen && (
            <FloatingBackButton onClick={() => setPage("businessDashboard")} />
          )}

          <div
            style={{
              ...availabilityPill,
              background: availableNow ? "#10b981" : "#64748b",
            }}
          >
            {availableNow
              ? translate("activeNow")
              : translate("workCenterOffline", activeLanguage)}
          </div>
        </div>
      )}

      {isWorkCenterSectionOpen && !isCompactWorkCenterChildPageOpen && (
        <>
          <div style={header}>
            <h1 style={title}>{t.title}</h1>
          </div>

          <div style={rolePill}>
            {translate("businessType")}: {String(userRole).toLowerCase() === "handyman" ? translate("handymanLabel") : userRole}
          </div>
        </>
      )}

      <div ref={workCenterPanelRef}>
        {!isWorkCenterSectionOpen ? (
          <section className="work-center-dashboard" style={workCenterDashboard}>
            <div className="work-center-dashboard-hero meetro-visual-hero" style={workCenterDashboardIntro}>
              <span style={workCenterDashboardEyebrow}>
                {translate("workCenterHeaderEyebrow")}
              </span>
              <h2 style={workCenterDashboardTitle}>
                {translate("workCenterDashboardTitle")}
              </h2>
              <p style={workCenterDashboardPurpose}>
                {translate("workCenterPurposeStatement")}
              </p>
              <p style={workCenterDashboardPerspective}>
                {translate("workCenterProfessionalPerspectiveLine")}
              </p>
              {isPropertyManagementBusiness && (
                <p style={propertyManagementWorkCenterFoundationNote}>
                  {translate("propertyManagementWorkCenterNote")}
                </p>
              )}
            </div>

            {workCenterLandingAlert && (
              <section className="meetro-visual-surface" style={workCenterAlertGuidanceCard}>
                <div style={workCenterAlertGuidanceTop}>
                  <span style={workCenterAlertGuidanceIcon}>!</span>
                  <div style={workCenterAlertGuidanceText}>
                    <span style={workCenterAlertGuidanceEyebrow}>
                      {workCenterLandingAlert.eyebrow}
                    </span>
                    <strong style={workCenterAlertGuidanceTitle}>
                      {workCenterLandingAlert.title}
                    </strong>
                    <p style={workCenterAlertGuidanceMessage}>
                      {workCenterLandingAlert.message}
                    </p>
                    <span style={workCenterAlertGuidanceMeta}>
                      {workCenterLandingAlert.meta} • {workCenterLandingAlert.status}
                    </span>
                  </div>
                </div>
                <div style={workCenterAlertGuidanceActions}>
                  <button
                    type="button"
                    className="meetro-visual-primary-button"
                    style={workCenterAlertPrimaryButton}
                    onClick={workCenterLandingAlert.onPrimary}
                  >
                    {workCenterLandingAlert.primaryLabel}
                  </button>
                  <button
                    type="button"
                    style={workCenterAlertSecondaryButton}
                    onClick={workCenterLandingAlert.onSecondary}
                  >
                    {workCenterLandingAlert.secondaryLabel}
                  </button>
                </div>
              </section>
            )}

            {!selectedWorkCenterJob && (
            <div
              style={workCenterPrimaryNavGrid}
              aria-label={translate("workCenterAreasAccessibility", activeLanguage)}
            >
              {workCenterPrimaryNavigationCards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  className={`meetro-visual-surface work-center-navigation-card${
                    isWorkCenterSectionOpen && activeTab === card.key
                      ? " meetro-selected-card"
                      : ""
                  }`}
                  style={{
                    ...workCenterPrimaryNavCard,
                    ...(card.alert ? workCenterPrimaryNavCardAlert : {}),
                    ...(card.alert ? { borderColor: "#fb923c" } : {}),
                  }}
                  onClick={card.onClick}
                >
                  <span
                    style={{
                      ...workCenterPrimaryNavIcon,
                      background: card.tone,
                      color: card.accent,
                    }}
                    aria-hidden="true"
                  >
                    <MeetroIcon name={card.icon} size={24} decorative />
                  </span>
                  <span style={workCenterPrimaryNavContent}>
                    <span style={workCenterPrimaryNavTitleRow}>
                      <strong style={workCenterPrimaryNavTitle}>{card.title}</strong>
                      <span
                        style={{
                          ...workCenterPrimaryNavMeta,
                          background: card.tone,
                          color: card.accent,
                          ...(card.alert ? workCenterPrimaryNavMetaAlert : {}),
                        }}
                      >
                        {card.meta}
                      </span>
                    </span>
                    <span style={workCenterPrimaryNavPurpose}>{card.purpose}</span>
                    <span style={{ ...workCenterPrimaryNavAction, color: card.accent }}>
                      {card.actionLabel}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            )}

            {selectedWorkCenterJob ? (() => {
              const isCanonicalReadOnlyJob =
                isCanonicalWorkCenterEntry(selectedWorkCenterJob);
              const scopedQuotes = isCanonicalReadOnlyJob
                ? []
                : getScopedJobQuotes(selectedWorkCenterJob);
              const scopedSchedules = isCanonicalReadOnlyJob
                ? []
                : getScopedJobSchedules(selectedWorkCenterJob);
              const scopedActiveRecords = isCanonicalReadOnlyJob
                ? []
                : getScopedJobActiveRecords(selectedWorkCenterJob);
              const scopedHistoryRecords = isCanonicalReadOnlyJob
                ? []
                : getScopedJobHistoryRecords(selectedWorkCenterJob);
              const scopedAlerts = isCanonicalReadOnlyJob
                ? []
                : getScopedJobAlerts(selectedWorkCenterJob);
              const primaryScopedQuote = scopedQuotes[0] || selectedWorkCenterJob.quote || null;
              const primaryScopedSchedule = scopedSchedules[0] || selectedWorkCenterJob.schedule || null;
              const primaryScopedHistory = scopedHistoryRecords[0] || selectedWorkCenterJob.history || null;
              const scopedJob = {
                ...selectedWorkCenterJob,
                quote: primaryScopedQuote,
                schedule: primaryScopedSchedule,
                active: scopedActiveRecords[0] || selectedWorkCenterJob.active || null,
                history: primaryScopedHistory,
              };
              const historyEvaluation = getHistoryEvaluation(scopedJob);
              const historyFindings = getHistoryFindings(scopedJob);
              const historyServiceRecommendations =
                getHistoryServiceRecommendations(scopedJob);
              const workflowState = resolveCustomerJobWorkflowState(scopedJob);
              const supportingLinks = getCustomerJobSupportingLinks(scopedJob, workflowState);
              const externalManualActions = getExternalCustomerManualActions(scopedJob, workflowState);
              const isProposalSentState = workflowState.stateKey === "proposal_sent";
              const visibleExternalManualActions = isProposalSentState
                ? []
                : externalManualActions;
              const jobStatusTone = isCanonicalReadOnlyJob
                ? {
                    background: "#f8fafc",
                    color: "#334155",
                    border: "#cbd5e1",
                  }
                : workflowState.tone;
              const jobDisplayStatus = isCanonicalReadOnlyJob
                ? "Review"
                : isJobHistoryMode
                  ? translate("stateClosed", activeLanguage)
                  : workflowState.statusLabel;
              const jobDisplayNextStep = isCanonicalReadOnlyJob
                ? "Review canonical lifecycle details"
                : isJobHistoryMode
                  ? translate("workCenterReviewTheFullJobHistory", activeLanguage)
                  : workflowState.nextActionLabel;
              const persistentContextCustomer =
                selectedWorkCenterJob.customer ||
                scopedJob.customer ||
                (translate("wcCustomer", activeLanguage));
              const persistentContextService =
                selectedWorkCenterJob.title ||
                scopedJob.title ||
                (translate("relationshipCurrentStage", activeLanguage));
              const persistentContextAddress =
                selectedWorkCenterJob.address || scopedJob.address || "";
              const currentStateDefinition = getSarahJobStateDefinition(scopedJob);
              const evaluationPanelMode = getEvaluationPanelMode({
                workflowState: workflowState.stateKey,
                hasEvaluation: Boolean(
                  primaryScopedSchedule && hasEvaluationForAppointment(primaryScopedSchedule)
                ),
                isEditing: isEditingCompletedEvaluation,
              });
              const supportingRecordsDefaultOpen = getSupportingRecordsDefaultOpen();
              const supportingRecordActionStyle =
                getSupportingRecordActionStyleVariant() === "secondary"
                  ? miniInlineButton
                  : startScheduleBtn;
	              const hasOpenWorkflowForm =
	                showProposalSendFlow ||
	                showApprovalConfirmFlow ||
	                showPaymentForm ||
	                showWorkAppointmentForm ||
	                showReceiptSendFlow ||
	                showCloseJobForm;
	              const hasHistoryReceipt = Boolean(
	                getHistoryReceiptSummary(scopedJob) ||
	                  primaryScopedQuote?.invoiceStatus ||
	                  primaryScopedQuote?.receiptStatus ||
	                  primaryScopedQuote?.paymentReceivedAt ||
	                  primaryScopedQuote?.depositPaidAt
	              );
              const handleWorkflowPrimaryAction = () => {
                if (isCanonicalReadOnlyJob) {
                  showLifecycleAuthorityUnavailable();
                  return;
                }
                if (workflowState.primaryActionType === "open_conversation") {
                  if (scopedJob.conversationId) {
                    localStorage.setItem("activeConversationId", scopedJob.conversationId);
                    localStorage.setItem("conversationReturnPage", "workCenter");
                    localStorage.setItem("conversationReturnSection", "job");
                    localStorage.setItem("meetroConversationType", "standard");
                    setPage("conversationThread");
                    return;
                  }

                  openJobScopedDetail("conversation", scopedJob);
                  return;
                }

                openWorkCenterJobPrimaryAction(scopedJob);
              };

              return (
              <div className="meetro-visual-surface" style={jobWorkspacePanel}>
                <button
                  type="button"
                  style={workCenterBackButton}
	                  onClick={() => {
	                    setSelectedJobDetailView("");
	                    setSelectedWorkCenterJob(null);
	                    const returnTab = isJobHistoryMode ? "jobHistory" : "currentJobs";
	                    setActiveTab(returnTab);
	                    setJobMenuTab(isJobHistoryMode ? "history" : "current");
	                    setIsJobHistoryMode(false);
	                    setIsWorkCenterSectionOpen(true);
	                    localStorage.setItem("meetroWorkCenterTab", returnTab);
	                    localStorage.setItem("activeWorkCenterTab", returnTab);
	                  }}
                >
                  <span aria-hidden="true">‹</span>
                  {isJobHistoryMode
                    ? translate("workCenterBackToHistory", activeLanguage)
                    : translate("workCenterBackToJobs", activeLanguage)}
                </button>

                <div style={jobWorkflowFirstHero}>
                  <div
                    className="meetro-job-persistent-context"
                    style={jobPersistentContextRegion}
                    aria-label={
                      translate("workCenterPersistentWorkContext", activeLanguage)
                    }
                  >
                    <div style={jobPersistentContextIdentity}>
                      <span style={jobWorkspaceEyebrow}>
                        {isJobHistoryMode
                          ? translate("homeMyProjectsHistory", activeLanguage)
                          : translate("workCenterCurrentJob", activeLanguage)}
                      </span>
                      <h2 style={jobPersistentContextCustomer}>
                        {persistentContextCustomer}
                      </h2>
                      <p style={jobWorkflowServiceSummary}>{persistentContextService}</p>
                      {persistentContextAddress && (
                        <p style={jobWorkspaceAddress}>{persistentContextAddress}</p>
                      )}
                    </div>
                    <div style={jobPersistentContextFocus}>
                      <span
                        style={{
                          ...jobWorkspaceStatusPill,
                          background: jobStatusTone.background,
                          color: jobStatusTone.color,
                          borderColor: jobStatusTone.border,
                        }}
                      >
                        {jobDisplayStatus}
                      </span>
                      <div style={jobPersistentContextNext}>
                        <span style={jobPersistentContextNextLabel}>
                          {translate("workCenterNextResponsibility", activeLanguage)}
                        </span>
                        <strong style={jobPersistentContextNextText}>
                          {jobDisplayNextStep}
                        </strong>
                      </div>
                      {!isJobHistoryMode && scopedJob.conversationId && (
                        <button
                          type="button"
                          style={jobPersistentContextAction}
                          onClick={() => {
                            localStorage.setItem("activeConversationId", scopedJob.conversationId);
                            localStorage.setItem("conversationReturnPage", "workCenter");
                            localStorage.setItem("conversationReturnSection", "job");
                            localStorage.setItem("meetroConversationType", "standard");
                            setPage("conversationThread");
                          }}
                        >
                          {translate("relationshipMessage", activeLanguage)}
                        </button>
                      )}
                    </div>
                  </div>

                  <section
                    style={workCenterCanonicalLifecycleSection}
                    aria-label="Canonical lifecycle evidence"
                    aria-live="polite"
                  >
                    <div style={workCenterCanonicalLifecycleHeader}>
                      <div>
                        <span style={jobWorkflowStepLabel}>Canonical backend read</span>
                        <h3 style={workCenterCanonicalLifecycleTitle}>
                          {translate("reportedConcernHistory", activeLanguage)}
                        </h3>
                      </div>
                      <span style={workCenterCanonicalLifecycleBadge}>
                        {workCenterLifecycleProjection.status === "ready"
                          ? "Confirmed"
                          : workCenterLifecycleProjection.status === "loading"
                            ? "Loading"
                            : "Unavailable"}
                      </span>
                    </div>

                    {workCenterLifecycleProjection.status === "loading" && (
                      <p role="status" style={workCenterCanonicalLifecycleNotice}>
                        {getCanonicalLifecycleUnavailableText(
                          workCenterLifecycleProjection
                        )}
                      </p>
                    )}

                    {workCenterLifecycleProjection.status !== "loading" &&
                      workCenterLifecycleProjection.status !== "ready" && (
                        <p role="status" style={workCenterCanonicalLifecycleNotice}>
                          {getCanonicalLifecycleUnavailableText(
                            workCenterLifecycleProjection
                          )}
                        </p>
                      )}

                    {workCenterLifecycleProjection.status === "ready" &&
                      workCenterLifecycleProjection.projection && (
                        <div style={workCenterCanonicalLifecycleGrid}>
                          <div style={workCenterCanonicalLifecycleCard}>
                            <strong style={workCenterCanonicalLifecycleLabel}>
                              {translate("workCenterJob", activeLanguage)}
                            </strong>
                            <span style={workCenterCanonicalLifecycleValue}>
                              {workCenterLifecycleProjection.projection.job?.present
                                ? "Lifecycle-v2 Job confirmed"
                                : translate("lifecycleHistoryUnavailable", activeLanguage)}
                            </span>
                          </div>

                          <div style={workCenterCanonicalLifecycleCard}>
                            <strong style={workCenterCanonicalLifecycleLabel}>
                              Customer Concern
                            </strong>
                            <span style={workCenterCanonicalConcernText}>
                              {workCenterLifecycleProjection.projection.customerConcern
                                ?.originalText ||
                                translate("lifecycleHistoryUnavailable", activeLanguage)}
                            </span>
                            {workCenterLifecycleProjection.projection.customerConcern
                              ?.clarifications?.length > 0 && (
                              <ul style={workCenterCanonicalClarificationList}>
                                {workCenterLifecycleProjection.projection.customerConcern.clarifications.map(
                                  (clarification) => (
                                    <li key={clarification.id}>
                                      {clarification.text}
                                    </li>
                                  )
                                )}
                              </ul>
                            )}
                          </div>

                          <div style={workCenterCanonicalLifecycleCard}>
                            <strong style={workCenterCanonicalLifecycleLabel}>
                              {translate("knownJobParticipants", activeLanguage)}
                            </strong>
                            {workCenterLifecycleProjection.projection.participants.length > 0 ? (
                              <ul style={workCenterCanonicalParticipantList}>
                                {workCenterLifecycleProjection.projection.participants.map(
                                  (participant, index) => (
                                    <li
                                      key={`${participant.displayName || "participant"}-${index}`}
                                      style={workCenterCanonicalParticipantItem}
                                    >
                                      <span>
                                        {participant.displayName ||
                                          translate("lifecycleParticipant", activeLanguage)}
                                      </span>
                                      <span style={workCenterCanonicalParticipantRoles}>
                                        {participant.roles
                                          .map((role) =>
                                            role.labelKey
                                              ? translate(role.labelKey, activeLanguage)
                                              : role.role
                                          )
                                          .join(", ") || "—"}
                                      </span>
                                    </li>
                                  )
                                )}
                              </ul>
                            ) : (
                              <span style={workCenterCanonicalLifecycleValue}>—</span>
                            )}
                          </div>
                        </div>
                      )}
                  </section>

                  {isCanonicalReadOnlyJob &&
                    workCenterLifecycleProjection.status === "ready" &&
                    workCenterLifecycleProjection.projection && (
                      <CanonicalJobEvaluation
                        record={{
                          ...selectedWorkCenterJob,
                          lifecycleVerified: true,
                          lifecycleContractVersion: 2,
                          jobId:
                            workCenterLifecycleProjection.projection.job?.id ||
                            null,
                          postId:
                            workCenterLifecycleProjection.projection.requestId ||
                            workCenterLifecycleProjection.postId,
                          requestId:
                            workCenterLifecycleProjection.projection.requestId ||
                            workCenterLifecycleProjection.postId,
                        }}
                        customerConcern={
                          workCenterLifecycleProjection.projection.customerConcern
                            ?.originalText || ""
                        }
                        setPage={setPage}
                      />
                    )}

                  {!isCanonicalReadOnlyJob && (
                    <div
                      style={{
                        ...jobDynamicFocusArea,
                        ...jobWorkflowCurrentStepCard,
                        background: `linear-gradient(135deg, ${jobStatusTone.background}, #ffffff)`,
                        borderColor: jobStatusTone.border,
                      }}
                    >
                    <span style={{ ...jobWorkflowStepLabel, color: jobStatusTone.color }}>
                      {translate("wcCurrentStatus", activeLanguage)}
                    </span>
                    <strong style={jobWorkflowStepStatus}>{jobDisplayStatus}</strong>

                    {workflowState.supportingSummary.length > 0 && (
                      <div style={jobWorkflowSummaryStack}>
                        {workflowState.supportingSummary.map((item) => (
                          <div key={item.label} style={jobWorkflowContextLine}>
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                          </div>
                        ))}
                      </div>
                    )}

                    <span style={jobWorkflowStepLabel}>
                      {translate("homeNextAction", activeLanguage)}
                    </span>
                    <strong style={jobWorkflowNextAction}>{jobDisplayNextStep}</strong>
                    {!isJobHistoryMode &&
                      visibleExternalManualActions.length > 0 &&
                      !hasOpenWorkflowForm && (
                        <div style={jobWorkflowManualActions}>
                          <span style={jobWorkflowStepLabel}>
                            {translate("workCenterExternalCustomerResponse", activeLanguage)}
                          </span>
                          <div style={jobWorkflowManualActionGrid}>
                            {visibleExternalManualActions.map((action) => (
                              <button
                                key={action.type}
                                type="button"
                                style={jobWorkflowManualActionButton}
                                onClick={() =>
                                  handleExternalCustomerManualAction(scopedJob, action.type)
                                }
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    {!isJobHistoryMode &&
                      workflowState.awaitingCustomerResponse &&
                      !hasOpenWorkflowForm &&
                      visibleExternalManualActions.length === 0 && (
                        <div style={jobWorkflowInlineForm}>
                          <span style={jobWorkflowStepLabel}>
                            {translate("workCenterCustomerResponse", activeLanguage)}
                          </span>
                          <p style={jobWorkspaceDisclosureText}>
                            {workflowState.nextActionLabel}
                          </p>
                          {scopedJob.conversationId && (
                            <button
                              type="button"
                              style={miniInlineButton}
                              onClick={() => {
                                localStorage.setItem("activeConversationId", scopedJob.conversationId);
                                localStorage.setItem("conversationReturnPage", "workCenter");
                                localStorage.setItem("conversationReturnSection", "job");
                                localStorage.setItem("meetroConversationType", "standard");
                                setPage("conversationThread");
                              }}
                            >
                              {translate("assistantActionOpenConversation", activeLanguage)}
                            </button>
                          )}
                        </div>
                      )}
                    {!isJobHistoryMode &&
                      !hasOpenWorkflowForm &&
                      !workflowState.awaitingCustomerResponse &&
                      visibleExternalManualActions.length === 0 && (
                      <div style={jobWorkflowActionStack}>
                        <button
                          type="button"
                          style={jobWorkflowPrimaryButton}
                          onClick={handleWorkflowPrimaryAction}
                        >
                          {workflowState.primaryButtonLabel}
                        </button>
                        {isProposalSentState && (
                          <button
                            type="button"
                            style={jobWorkflowSecondaryButton}
                            onClick={openApprovalConfirmationForWorkCenterJob}
                          >
                            {translate("workCenterRecordApprovalManually", activeLanguage)}
                          </button>
                        )}
                      </div>
                    )}
                    {!isJobHistoryMode &&
                      workflowState.primaryActionType === "send_proposal" &&
                      showProposalSendFlow && (
                        <div style={jobWorkflowInlineForm}>
                          <span style={jobWorkflowStepLabel}>
                            {translate("assistantProjectBriefNextSendProposal", activeLanguage)}
                          </span>
                          <label style={jobWorkflowFieldLabel}>
                            {translate("workCenterMethod", activeLanguage)}
                            <select
                              style={input}
                              value={sendFlowDraft.method}
                              onChange={(event) =>
                                setSendFlowDraft((current) => ({
                                  ...current,
                                  method: event.target.value,
                                }))
                              }
                            >
                              <option value="meetro_chat">
                                {translate("relationshipMeetroChat", activeLanguage)}
                              </option>
                              <option value="external_share">
                                {translate("workCenterExternalShare", activeLanguage)}
                              </option>
                            </select>
                          </label>
                          <label style={jobWorkflowFieldLabel}>
                            {translate("workCenterOptionalNote", activeLanguage)}
                            <textarea
                              style={jobWorkflowNotesInput}
                              value={sendFlowDraft.note}
                              placeholder={
                                translate("workCenterMessageToIncludeWithTheProposal", activeLanguage)
                              }
                              onChange={(event) =>
                                setSendFlowDraft((current) => ({
                                  ...current,
                                  note: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <div style={jobWorkflowFormActions}>
                            <button
                              type="button"
                              style={startScheduleBtn}
                              onClick={() => confirmProposalSendForWorkCenterJob(scopedJob)}
                            >
                              {translate("assistantProjectBriefNextSendProposal", activeLanguage)}
                            </button>
                            <button
                              type="button"
                              style={miniInlineButton}
                              onClick={() => setShowProposalSendFlow(false)}
                            >
                              {translate("cancel", activeLanguage)}
                            </button>
                          </div>
                        </div>
                      )}
                    {!isJobHistoryMode &&
                      workflowState.primaryActionType === "open_conversation" &&
                      showApprovalConfirmFlow && (
                        <div style={jobWorkflowInlineForm}>
                          <span style={jobWorkflowStepLabel}>
                            {translate("workCenterConfirmApproval", activeLanguage)}
                          </span>
                          <p style={jobWorkspaceDisclosureText}>
                            {translate("workCenterSaveApprovalOnlyAfterTheCustomerHasConfirmedTheProposal", activeLanguage)}
                          </p>
                          <label style={jobWorkflowFieldLabel}>
                            {translate("workCenterOptionalNote", activeLanguage)}
                            <textarea
                              style={jobWorkflowNotesInput}
                              value={approvalDraft.note}
                              placeholder={
                                translate("workCenterExampleApprovedByTextMessage", activeLanguage)
                              }
                              onChange={(event) =>
                                setApprovalDraft((current) => ({
                                  ...current,
                                  note: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label style={jobWorkflowCheckboxLine}>
                            <input
                              type="checkbox"
                              checked={approvalDraft.confirmed}
                              onChange={(event) =>
                                setApprovalDraft((current) => ({
                                  ...current,
                                  confirmed: event.target.checked,
                                }))
                              }
                            />
                            {translate("workCenterIConfirmTheCustomerApprovedTheProposal", activeLanguage)}
                          </label>
                          <div style={jobWorkflowFormActions}>
                            <button
                              type="button"
                              style={startScheduleBtn}
                              onClick={() => confirmApprovalForWorkCenterJob(scopedJob)}
                            >
                              {translate("workCenterSaveApproval", activeLanguage)}
                            </button>
                            <button
                              type="button"
                              style={miniInlineButton}
                              onClick={() => {
                                setShowApprovalConfirmFlow(false);
                                setApprovalDraft(createDefaultApprovalDraft());
                              }}
                            >
                              {translate("cancel", activeLanguage)}
                            </button>
                          </div>
                        </div>
                      )}
                    {!isJobHistoryMode &&
                      workflowState.primaryActionType === "record_payment" &&
                      showPaymentForm && (
                        <div style={jobWorkflowInlineForm}>
                          <span style={jobWorkflowStepLabel}>
                            {translate("workCenterPayment", activeLanguage)}
                          </span>
                          <div style={jobWorkflowFormGrid}>
                            <label style={jobWorkflowFieldLabel}>
                              {translate("homeAmount", activeLanguage)}
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                style={input}
                                value={paymentDraft.amount}
                                onChange={(event) =>
                                  setPaymentDraft((current) => ({
                                    ...current,
                                    amount: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label style={jobWorkflowFieldLabel}>
                              {translate("relationshipType", activeLanguage)}
                              <select
                                style={input}
                                value={paymentDraft.paymentType}
                                onChange={(event) =>
                                  setPaymentDraft((current) => ({
                                    ...current,
                                    paymentType: event.target.value,
                                  }))
                                }
                              >
                                <option value="deposit">
                                  {translate("deposit", activeLanguage)}
                                </option>
                                <option value="full">
                                  {translate("workCenterFullPayment", activeLanguage)}
                                </option>
                              </select>
                            </label>
                            <label style={jobWorkflowFieldLabel}>
                              {translate("workCenterMethod", activeLanguage)}
                              <select
                                style={input}
                                value={paymentDraft.method}
                                onChange={(event) =>
                                  setPaymentDraft((current) => ({
                                    ...current,
                                    method: event.target.value,
                                  }))
                                }
                              >
                                <option value="card">{translate("cardPayment", activeLanguage)}</option>
                                <option value="cash">{translate("cash", activeLanguage)}</option>
                                <option value="check">{translate("workCenterCheck", activeLanguage)}</option>
                                <option value="bank_transfer">
                                  {translate("workCenterBankTransfer", activeLanguage)}
                                </option>
                                <option value="other">{translate("communityInterestOther", activeLanguage)}</option>
                              </select>
                            </label>
                            <label style={jobWorkflowFieldLabel}>
                              {translate("date", activeLanguage)}
                              <input
                                type="date"
                                style={input}
                                value={paymentDraft.date}
                                onChange={(event) =>
                                  setPaymentDraft((current) => ({
                                    ...current,
                                    date: event.target.value,
                                  }))
                                }
                              />
                            </label>
                          </div>
                          <label style={jobWorkflowFieldLabel}>
                            {translate("note", activeLanguage)}
                            <textarea
                              style={jobWorkflowNotesInput}
                              value={paymentDraft.note}
                              onChange={(event) =>
                                setPaymentDraft((current) => ({
                                  ...current,
                                  note: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <div style={jobWorkflowFormActions}>
                            <button
                              type="button"
                              style={startScheduleBtn}
                              onClick={() => savePaymentForWorkCenterJob(scopedJob)}
                            >
                              {translate("workCenterSavePayment", activeLanguage)}
                            </button>
                            <button
                              type="button"
                              style={miniInlineButton}
                              onClick={() => setShowPaymentForm(false)}
                            >
                              {translate("cancel", activeLanguage)}
                            </button>
                          </div>
                        </div>
                      )}
                    {!isJobHistoryMode &&
                      workflowState.primaryActionType === "schedule_work" &&
                      showWorkAppointmentForm && (
                        <div style={jobWorkflowInlineForm}>
                          <span style={jobWorkflowStepLabel}>
                            {translate("workCenterWorkAppointment", activeLanguage)}
                          </span>
                          <div style={jobWorkflowFormGrid}>
                            <label style={jobWorkflowFieldLabel}>
                              {translate("date", activeLanguage)}
                              <input
                                type="date"
                                style={input}
                                value={workAppointmentDraft.date}
                                onChange={(event) =>
                                  setWorkAppointmentDraft((current) => ({
                                    ...current,
                                    date: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label style={jobWorkflowFieldLabel}>
                              {translate("myRequestsTime", activeLanguage)}
                              <input
                                type="time"
                                style={input}
                                value={workAppointmentDraft.time}
                                onChange={(event) =>
                                  setWorkAppointmentDraft((current) => ({
                                    ...current,
                                    time: event.target.value,
                                  }))
                                }
                              />
                            </label>
                          </div>
                          <label style={jobWorkflowFieldLabel}>
                            {translate("workCenterOptionalNotes", activeLanguage)}
                            <textarea
                              style={jobWorkflowNotesInput}
                              value={workAppointmentDraft.notes}
                              placeholder={
                                translate("workCenterDetailsToRememberBeforeTheWork", activeLanguage)
                              }
                              onChange={(event) =>
                                setWorkAppointmentDraft((current) => ({
                                  ...current,
                                  notes: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label style={jobWorkflowCheckboxLine}>
                            <input
                              type="checkbox"
                              checked={workAppointmentDraft.shareWithCustomer}
                              onChange={(event) =>
                                setWorkAppointmentDraft((current) => ({
                                  ...current,
                                  shareWithCustomer: event.target.checked,
                                }))
                              }
                            />
                            {translate("workCenterShareWithCustomer", activeLanguage)}
                          </label>
                          <div style={jobWorkflowFormActions}>
                            <button
                              type="button"
                              style={startScheduleBtn}
                              onClick={() => createSarahPageWorkAppointmentRecord(scopedJob)}
                            >
                              {translate("workCenterCreateWorkAppointment", activeLanguage)}
                            </button>
                            <button
                              type="button"
                              style={miniInlineButton}
                              onClick={() => setShowWorkAppointmentForm(false)}
                            >
                              {translate("cancel", activeLanguage)}
                            </button>
                          </div>
                        </div>
                      )}
                    {!isJobHistoryMode &&
                      workflowState.primaryActionType === "send_receipt" &&
                      showReceiptSendFlow && (
                        <div style={jobWorkflowInlineForm}>
                          <span style={jobWorkflowStepLabel}>
                            {translate("workCenterSendReceipt", activeLanguage)}
                          </span>
                          <label style={jobWorkflowFieldLabel}>
                            {translate("workCenterMethod", activeLanguage)}
                            <select
                              style={input}
                              value={sendFlowDraft.method}
                              onChange={(event) =>
                                setSendFlowDraft((current) => ({
                                  ...current,
                                  method: event.target.value,
                                }))
                              }
                            >
                              <option value="meetro_chat">
                                {translate("relationshipMeetroChat", activeLanguage)}
                              </option>
                              <option value="external_share">
                                {translate("workCenterExternalShare", activeLanguage)}
                              </option>
                            </select>
                          </label>
                          <label style={jobWorkflowFieldLabel}>
                            {translate("workCenterOptionalNote", activeLanguage)}
                            <textarea
                              style={jobWorkflowNotesInput}
                              value={sendFlowDraft.note}
                              placeholder={
                                translate("workCenterMessageToIncludeWithTheReceipt", activeLanguage)
                              }
                              onChange={(event) =>
                                setSendFlowDraft((current) => ({
                                  ...current,
                                  note: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <div style={jobWorkflowFormActions}>
                            <button
                              type="button"
                              style={startScheduleBtn}
                              onClick={() => confirmReceiptSendForWorkCenterJob(scopedJob)}
                            >
                              {translate("workCenterSendReceipt", activeLanguage)}
                            </button>
                            <button
                              type="button"
                              style={miniInlineButton}
                              onClick={() => setShowReceiptSendFlow(false)}
                            >
                              {translate("cancel", activeLanguage)}
                            </button>
                          </div>
                        </div>
                      )}
                    {!isJobHistoryMode &&
                      workflowState.primaryActionType === "close_job" &&
                      showCloseJobForm && (
                        <div style={jobWorkflowInlineForm}>
                          <span style={jobWorkflowStepLabel}>
                            {translate("companionContextCompletionTitle", activeLanguage)}
                          </span>
                          {(() => {
                            const closureReadiness =
                              evaluateWorkCenterClosureReadiness(scopedJob);
                            return (
                              <div style={closureGateCard}>
                                <strong>
                                  {translate("workCenterClosureStatus", activeLanguage)}
                                  :{" "}
                                  {closureReadiness.closureReady
                                    ? translate("workCenterEligible", activeLanguage)
                                    : translate("assistantWorkflowStatusBlocked", activeLanguage)}
                                </strong>
                                {!closureReadiness.closureReady && (
                                  <p style={jobWorkspaceDisclosureText}>
                                    {translate("workCenterClosureBlockedOutstandingObligationsMustBeSatisfiedBeforeClosingThisJob", activeLanguage)}
                                  </p>
                                )}
                                <div style={closureGateGrid}>
                                  <div>
                                    <span style={jobWorkflowStepLabel}>
                                      {translate("workCenterOutstandingObligations", activeLanguage)}
                                    </span>
                                    <ul style={closureGateList}>
                                      {closureReadiness.outstandingObligations.length > 0
                                        ? closureReadiness.outstandingObligations.map((obligation) => (
                                            <li key={obligation.id}>
                                              {obligation.title || obligation.id}
                                            </li>
                                          ))
                                        : (
                                            <li>
                                              {translate("workCenterNone", activeLanguage)}
                                            </li>
                                          )}
                                    </ul>
                                  </div>
                                  <div>
                                    <span style={jobWorkflowStepLabel}>
                                      {translate("workCenterSatisfiedObligations", activeLanguage)}
                                    </span>
                                    <ul style={closureGateList}>
                                      {closureReadiness.satisfiedObligations.map((obligation) => (
                                        <li key={obligation.id}>
                                          {obligation.title || obligation.id}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          <label style={jobWorkflowFieldLabel}>
                            {translate("workCenterOptionalClosureNotes", activeLanguage)}
                            <textarea
                              style={jobWorkflowNotesInput}
                              value={closureDraft.notes}
                              onChange={(event) =>
                                setClosureDraft((current) => ({
                                  ...current,
                                  notes: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label style={jobWorkflowCheckboxLine}>
                            <input
                              type="checkbox"
                              checked={closureDraft.confirmMoveToHistory}
                              onChange={(event) =>
                                setClosureDraft((current) => ({
                                  ...current,
                                  confirmMoveToHistory: event.target.checked,
                                }))
                              }
                            />
                            {translate("workCenterConfirmMoveToHistory", activeLanguage)}
                          </label>
                          <div style={jobWorkflowFormActions}>
                            <button
                              type="button"
                              style={startScheduleBtn}
                              onClick={confirmCloseWorkCenterJob}
                            >
                              {translate("lifecycleDashboardActionUnavailable", activeLanguage)}
                            </button>
                            <button
                              type="button"
                              style={miniInlineButton}
                              onClick={() => setShowCloseJobForm(false)}
                            >
                              {translate("cancel", activeLanguage)}
                            </button>
                          </div>
                        </div>
                      )}
	                    </div>
                  )}

                  {!isCanonicalReadOnlyJob && !isJobHistoryMode && (
                    <p style={jobWorkflowGpsHint}>
                      {translate("workCenterMeetroShowsOnlyTheCurrentStepRecordsStaySavedBehindThisJob", activeLanguage)}
                    </p>
                  )}
                </div>

	                {isJobHistoryMode && (
	                  <div style={jobHistoryReadOnlyPanel}>
		                    <div style={jobScopedDetailHeader}>
		                      <strong>
		                        {translate("workCenterHistoryTitle", activeLanguage)}
	                      </strong>
	                      <span style={jobWorkspaceStatusPill}>
		                        {translate("readOnlyStatus", activeLanguage)}
		                      </span>
		                    </div>
		                    <div style={jobHistoryDocumentActions}>
		                      <button
		                        type="button"
		                        style={jobHistoryDocumentButton}
		                        onClick={() => setJobReportTarget(scopedJob)}
		                      >
		                        {translate("workCenterReviewJobReport", activeLanguage)}
		                      </button>
		                      <button
		                        type="button"
		                        style={jobHistoryDocumentButton}
		                        onClick={() => printJobHistoryReport(scopedJob)}
		                      >
		                        {translate("workCenterPrintJobReport", activeLanguage)}
		                      </button>
		                      <button
		                        type="button"
		                        style={jobHistoryDocumentButton}
		                        onClick={() =>
		                          shareHistoryDocumentText({
		                            title: translate("workCenterJobReport", activeLanguage),
		                            text: buildJobHistoryReportText(scopedJob),
		                          })
		                        }
		                      >
		                        {translate("workCenterShareJobReport", activeLanguage)}
		                      </button>
		                      <button
		                        type="button"
		                        style={jobHistoryDocumentButton}
		                        onClick={() =>
		                          copyHistoryDocumentText(
		                            buildJobHistoryReportText(scopedJob),
		                            translate("workCenterSummaryCopied", activeLanguage)
		                          )
		                        }
		                      >
		                        {translate("workCenterCopySummary", activeLanguage)}
		                      </button>
		                      <button
		                        type="button"
		                        style={jobHistoryDocumentButton}
		                        onClick={() => {
		                          if (!primaryScopedQuote) {
		                            setHistoryActionNotice(
		                              translate("workCenterNoQuoteSavedForThisJob", activeLanguage)
		                            );
		                            return;
		                          }
		                          setQuoteViewTarget({
		                            ...primaryScopedQuote,
		                            readOnlyHistory: true,
		                            documentLabel:
		                              translate("myRequestsQuoteProposal", activeLanguage),
		                          });
		                        }}
		                      >
		                        {translate("assistantActionViewQuote", activeLanguage)}
		                      </button>
		                      <button
		                        type="button"
		                        style={jobHistoryDocumentButton}
		                        onClick={() => {
		                          if (!primaryScopedQuote) {
		                            setHistoryActionNotice(
		                              translate("workCenterNoQuoteSavedForThisJob", activeLanguage)
		                            );
		                            return;
		                          }
		                          shareHistoryDocumentText({
		                            title:
		                              translate("myRequestsQuoteProposal", activeLanguage),
		                            text: buildQuoteDocumentText(
		                              primaryScopedQuote,
		                              translate("myRequestsQuoteProposal", activeLanguage)
		                            ),
		                          });
		                        }}
		                      >
		                        {translate("workCenterShareQuoteProposal", activeLanguage)}
		                      </button>
		                      <button
		                        type="button"
		                        style={jobHistoryDocumentButton}
		                        onClick={() => {
		                          if (!primaryScopedQuote || !hasHistoryReceipt) {
		                            setHistoryActionNotice(
		                              translate("workCenterNoInvoiceSavedForThisJob", activeLanguage)
		                            );
		                            return;
		                          }
		                          setQuoteViewTarget({
		                            ...primaryScopedQuote,
		                            readOnlyHistory: true,
		                            documentLabel:
		                              translate("guideInvoiceReceiptTitle", activeLanguage),
		                          });
		                        }}
		                      >
		                        {translate("workCenterReviewInvoiceReceipt", activeLanguage)}
		                      </button>
		                      <button
		                        type="button"
		                        style={jobHistoryDocumentButton}
		                        onClick={() => {
		                          if (!primaryScopedQuote || !hasHistoryReceipt) {
		                            setHistoryActionNotice(
		                              translate("workCenterNoInvoiceSavedForThisJob", activeLanguage)
		                            );
		                            return;
		                          }
		                          shareHistoryDocumentText({
		                            title:
		                              translate("guideInvoiceReceiptTitle", activeLanguage),
		                            text: buildQuoteDocumentText(
		                              primaryScopedQuote,
		                              translate("guideInvoiceReceiptTitle", activeLanguage)
		                            ),
		                          });
		                        }}
		                      >
		                        {translate("workCenterShareInvoiceReceipt", activeLanguage)}
		                      </button>
		                    </div>
		                    {historyActionNotice && (
		                      <p style={jobHistoryActionNotice}>{historyActionNotice}</p>
		                    )}
		                    <div style={jobHistoryReasoningTrail}>
		                      <div style={jobHistoryReasoningHeader}>
		                        <strong>
		                          {translate("workCenterEvaluationSummary", activeLanguage)}
		                        </strong>
		                        <span>
		                          {translate("workCenterRequestEvaluationFindingsRecommendedServices", activeLanguage)}
		                        </span>
		                      </div>
		                      <div style={jobHistoryReadOnlyGrid}>
		                        <div style={jobHistoryReadOnlySection}>
		                          <strong>
		                            {translate("serviceType", activeLanguage)}
		                          </strong>
		                          <span>
		                            {historyEvaluation.serviceType ||
		                              scopedJob.serviceType ||
		                              "—"}
		                          </span>
		                        </div>
		                        <div style={jobHistoryReadOnlySection}>
		                          <strong>Context</strong>
		                          <span>
		                            {historyEvaluation.context ||
		                              scopedJob.context ||
		                              "—"}
		                          </span>
		                        </div>
		                        <div style={jobHistoryReadOnlySection}>
		                          <strong>
		                            {translate("guideEvaluationNotesTitle", activeLanguage)}
		                          </strong>
		                          <span>{getHistoryEvaluationNotes(scopedJob) || "—"}</span>
		                        </div>
		                        <div style={jobHistoryReadOnlySection}>
		                          <strong>
		                            {translate("workCenterTemplateRequirements", activeLanguage)}
		                          </strong>
		                          <span>
		                            {formatHistoryList(
		                              historyEvaluation.templateRequirements || []
		                            )}
		                          </span>
		                        </div>
		                      </div>
		                      <div style={jobHistoryRecordSection}>
		                        <strong>
		                          {translate("assistantProjectBriefFindingsSection", activeLanguage)}
		                        </strong>
		                        {historyFindings.length > 0 ? (
		                          <ul style={jobHistoryRecordList}>
		                            {historyFindings.map((finding, index) => (
		                              <li
		                                key={
		                                  finding.id ||
		                                  finding.findingId ||
		                                  finding.findingType ||
		                                  index
		                                }
		                              >
		                                {getHistoryFindingLabel(finding)}
		                              </li>
		                            ))}
		                          </ul>
		                        ) : (
		                          <span style={jobHistoryEmptyText}>—</span>
		                        )}
		                      </div>
		                      <div style={jobHistoryRecordSection}>
		                        <strong>
		                          {translate("workCenterRecommendedServices", activeLanguage)}
		                        </strong>
		                        {historyServiceRecommendations.length > 0 ? (
		                          <ul style={jobHistoryRecordList}>
		                            {historyServiceRecommendations.map((service, index) => (
		                              <li
		                                key={
		                                  service.id ||
		                                  service.serviceType ||
		                                  service.title ||
		                                  index
		                                }
		                              >
		                                {getHistoryServiceRecommendationLabel(service)}
		                              </li>
		                            ))}
		                          </ul>
		                        ) : (
		                          <span style={jobHistoryEmptyText}>—</span>
		                        )}
		                      </div>
		                    </div>
		                    <div style={jobHistoryReadOnlyGrid}>
	                      <div style={jobHistoryReadOnlySection}>
	                        <strong>{translate("wcCustomer", activeLanguage)}</strong>
	                        <span>{selectedWorkCenterJob.customer}</span>
	                      </div>
	                      <div style={jobHistoryReadOnlySection}>
	                        <strong>{translate("workCenterJob", activeLanguage)}</strong>
	                        <span>{selectedWorkCenterJob.title}</span>
	                      </div>
	                      <div style={jobHistoryReadOnlySection}>
	                        <strong>{translate("date", activeLanguage)}</strong>
	                        <span>
	                          {primaryScopedHistory?.closeDate ||
	                          primaryScopedHistory?.closedAt ||
	                          primaryScopedSchedule?.closedAt ||
	                          primaryScopedSchedule?.date ||
	                          "—"}
	                        </span>
	                      </div>
	                      <div style={jobHistoryReadOnlySection}>
	                        <strong>{translate("homeStatus", activeLanguage)}</strong>
	                        <span>{translate("stateClosed", activeLanguage)}</span>
	                      </div>
	                      <div style={jobHistoryReadOnlySection}>
	                        <strong>{translate("workCenterProposalQuote", activeLanguage)}</strong>
	                        <span>
	                          {primaryScopedQuote
	                            ? `$${getQuoteTotalAmount(primaryScopedQuote).toFixed(2)}`
	                            : "—"}
	                        </span>
	                      </div>
	                      <div style={jobHistoryReadOnlySection}>
	                        <strong>{translate("photos", activeLanguage)}</strong>
	                        <span>{getWorkCenterJobPhotos(scopedJob).length}</span>
	                      </div>
	                      <div style={jobHistoryReadOnlySection}>
	                        <strong>{translate("workCenterPayment", activeLanguage)}</strong>
	                        <span>{getWorkCenterPaymentSummary(scopedJob)}</span>
	                      </div>
	                      <div style={jobHistoryReadOnlySection}>
	                        <strong>{translate("documentReceipt", activeLanguage)}</strong>
	                        <span>{getHistoryReceiptSummary(scopedJob) || "—"}</span>
	                      </div>
	                      <div style={jobHistoryReadOnlySection}>
	                        <strong>
	                          {translate("workCenterCompletionNotes", activeLanguage)}
	                        </strong>
	                        <span>{getHistoryCompletionNotes(scopedJob) || "—"}</span>
	                      </div>
	                      <div style={jobHistoryReadOnlySection}>
	                        <strong>{translate("workCenterClosureNotes", activeLanguage)}</strong>
	                        <span>{getHistoryClosureNotes(scopedJob) || "—"}</span>
	                      </div>
	                      <div style={jobHistoryReadOnlySection}>
	                        <strong>{translate("assistantRelationshipMemoryProjectHistorySection", activeLanguage)}</strong>
	                        <span>
	                          {getWorkCenterJobSavedTimelineEvents(scopedJob).length > 0
	                            ? getWorkCenterJobSavedTimelineEvents(scopedJob)
	                                .map((event) => event.label || event.stage)
	                                .filter(Boolean)
	                                .join(" → ")
	                            : "—"}
	                        </span>
	                      </div>
	                      {getWorkflowDependencyHistory(scopedJob).length > 0 && (
	                        <div style={jobHistoryReadOnlySection}>
	                          <strong>Workflow Dependencies</strong>
	                          <span style={workflowDependencyHistoryList}>
	                            {getWorkflowDependencyHistory(scopedJob).map((event) => (
	                              <span key={event.id} style={workflowDependencyHistoryItem}>
	                                {event.summary}
	                                {event.affectedWorkflowAction
	                                  ? ` · Action: ${event.affectedWorkflowAction}`
	                                  : ""}
	                              </span>
	                            ))}
	                          </span>
	                        </div>
	                      )}
	                    </div>
	                  </div>
	                )}

	                {!isCanonicalReadOnlyJob && !isJobHistoryMode && (
	                <details
                    style={jobSupportingSlimDisclosure}
                    defaultOpen={supportingRecordsDefaultOpen}
                  >
	                  <summary style={jobSupportingSlimSummary}>
                      <span>{translate("workCenterSupportingRecords", activeLanguage)}</span>
                      <span style={jobSupportingReadOnlyHint}>
                        {supportingLinks.length} ·{" "}
                        {translate("readOnlyStatus", activeLanguage)}
                      </span>
	                  </summary>
                  <div style={jobSupportingSlimBody}>
                    <div style={jobSupportingChipRow}>
                      {supportingLinks.map((detail) => (
                        <button
                          type="button"
                          key={`${detail.view}-${detail.label}`}
                          className={
                            selectedJobDetailView === detail.view
                              ? "meetro-selected-card-soft"
                              : ""
                          }
                          style={{
                            ...jobSupportingChip,
                            ...(selectedJobDetailView === detail.view
                              ? jobSupportingChipActive
                              : {}),
                          }}
                          onClick={() => openJobScopedDetail(detail.view, scopedJob)}
                        >
                          {detail.label}
                        </button>
                      ))}
                    </div>
                    {getWorkCenterJobSavedTimelineEvents(scopedJob).length > 0 && (
                      <details style={jobSupportingMoreDisclosure}>
                        <summary style={jobSupportingMoreSummary}>
                          {translate("workCenterSavedTimeline", activeLanguage)}
                        </summary>
                        <div style={jobSavedTimelineList}>
                          {getWorkCenterJobSavedTimelineEvents(scopedJob).map((event) => (
                            <div key={event.id || `${event.stage}-${event.timestamp}`} style={jobSavedTimelineItem}>
                              <span>{event.label || event.stage || currentStateDefinition.timelineEntry}</span>
                              <small>
                                {formatJobTimelineEventTime(event.savedAt || event.timestamp)} ·{" "}
                                {translate("stateSaved", activeLanguage)}
                              </small>
                            </div>
                          ))}
                        </div>
                      </details>
	                    )}
                    {!isJobHistoryMode && getWorkflowDependencyHistory(scopedJob).length > 0 && (
                      <details style={jobSupportingMoreDisclosure}>
                        <summary style={jobSupportingMoreSummary}>
                          Workflow Dependencies
                        </summary>
                        <div style={jobSavedTimelineList}>
                          {getWorkflowDependencyHistory(scopedJob).slice(-5).map((event) => (
                            <div key={event.id} style={jobSavedTimelineItem}>
                              <span>{event.summary}</span>
                              <small>
                                {formatJobTimelineEventTime(event.timestamp)} · Read-only
                              </small>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
	                  </div>
	                </details>
	                )}

	                {!isCanonicalReadOnlyJob && !isJobHistoryMode && selectedJobDetailView && (
	                  <div ref={jobScopedDetailRef} style={jobScopedDetailPanel}>
                    <div style={jobScopedDetailHeader}>
                      <strong>
                        {selectedWorkCenterJob.customer} ·{" "}
                        {getJobDetailViewLabel(selectedJobDetailView)}
                      </strong>
                      <button
                        type="button"
                        style={miniInlineButton}
                        onClick={() => {
                          setIsEditingCompletedEvaluation(false);
                          setSelectedJobDetailView("");
                        }}
                      >
                        {translate("close", activeLanguage)}
                      </button>
                    </div>

                    {selectedJobDetailView === "conversation" && (
                      <div style={jobScopedDetailBody}>
                        <p style={jobWorkspaceDisclosureText}>
                          {selectedWorkCenterJob.conversationId
                            ? translate("workCenterContinueThisJobsConversationOnly", activeLanguage)
                            : translate("workCenterThisJobDoesNotHaveALinkedConversationYet", activeLanguage)}
                        </p>
                        {selectedWorkCenterJob.conversationId && (
                          <button
                            type="button"
                            style={startScheduleBtn}
                            onClick={() => {
                              localStorage.setItem("activeConversationId", selectedWorkCenterJob.conversationId);
                              localStorage.setItem("conversationReturnPage", "workCenter");
                              localStorage.setItem("conversationReturnSection", "job");
                              localStorage.setItem("meetroConversationType", "standard");
                              setPage("conversationThread");
                            }}
                          >
                            {translate("assistantActionOpenConversation", activeLanguage)}
                          </button>
                        )}
                      </div>
                    )}

                    {selectedJobDetailView === "quote" && (
                      <div style={jobScopedDetailBody}>
                        {primaryScopedQuote ? (
                          <>
                            <p style={jobWorkspaceDisclosureText}>
                              {translate("documentTotal", activeLanguage)}:{" "}
                              <strong>${getQuoteTotalAmount(primaryScopedQuote).toFixed(2)}</strong>
                            </p>
                            <button
                              type="button"
                              style={supportingRecordActionStyle}
                              onClick={() => setQuoteViewTarget(primaryScopedQuote)}
                            >
                              {translate("assistantActionViewQuote", activeLanguage)}
                            </button>
                          </>
                        ) : (
                          <p style={jobWorkspaceDisclosureText}>
                            {translate("workCenterNoQuoteForThisJobYet", activeLanguage)}
                          </p>
                        )}
                      </div>
                    )}

                    {selectedJobDetailView === "schedule" && (
                      <div style={jobScopedDetailBody}>
                        {primaryScopedSchedule ? (
                          <>
                            <p style={jobWorkspaceDisclosureText}>
                              {primaryScopedSchedule.date || "—"} ·{" "}
                              {formatScheduleTime(primaryScopedSchedule.time)} ·{" "}
                              {primaryScopedSchedule.location || selectedWorkCenterJob.address}
                            </p>
                            {!isJobHistoryMode && (
                              <button
                                type="button"
                                style={supportingRecordActionStyle}
                                onClick={() => {
                                  openVisitDetail(primaryScopedSchedule);
                                  setSelectedJobDetailView("");
                                  setSelectedWorkCenterJob(null);
                                  setIsJobHistoryMode(false);
                                }}
                              >
                                {translate("assistantActionOpenSchedule", activeLanguage)}
                              </button>
                            )}
                          </>
                        ) : (
                          <p style={jobWorkspaceDisclosureText}>
                            {translate("workCenterNoScheduleForThisJobYet", activeLanguage)}
                          </p>
                        )}
                      </div>
                    )}

                    {selectedJobDetailView === "photos" && (
                      <div style={jobScopedDetailBody}>
                        {getWorkCenterJobPhotos(scopedJob).length > 0 ? (
                          <div style={evaluationPhotoGrid}>
                            {getWorkCenterJobPhotos(scopedJob).map((photo, index) => (
                              <div key={photo.id || index} style={evaluationPhotoCard}>
                                {photo.dataUrl ? (
                                  <img
                                    src={photo.dataUrl}
                                    alt={photo.name || ""}
                                    style={evaluationPhotoThumb}
                                  />
                                ) : (
                                  <div style={evaluationPhotoMetadataThumb}>
                                    <span></span>
                                    <small>{photo.name || "Photo documented"}</small>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={jobWorkspaceDisclosureText}>
                            {translate("workCenterNoPhotosForThisJobYet", activeLanguage)}
                          </p>
                        )}
                      </div>
                    )}

                    {selectedJobDetailView === "payments" && (
                      <div style={jobScopedDetailBody}>
                        <p style={jobWorkspaceDisclosureText}>
                          {primaryScopedQuote?.paymentReceivedAt ||
                          primaryScopedQuote?.depositPaidAt ||
                          primaryScopedQuote?.paidAt
                            ? translate("workCenterPaymentRecordedForThisJob", activeLanguage)
                            : translate("workCenterNoPaymentsRecordedForThisJobYet", activeLanguage)}
                        </p>
                      </div>
                    )}

                    {selectedJobDetailView === "materials" && (
                      <div style={jobScopedDetailBody}>
                        {getWorkCenterJobMaterials(scopedJob).length > 0 ? (
                          <div style={jobScopedList}>
                            {getWorkCenterJobMaterials(scopedJob).map((material, index) => (
                              <div key={material.id || index} style={jobScopedListItem}>
                                <strong>{material.name || material.title || translate("material")}</strong>
                                <span>
                                  {translate("workCenterQty", activeLanguage)}: {material.quantity || "—"}
                                </span>
                                {getMaterialLineTotal(material) !== null && (
                                  <span>
                                    {translate("workCenterLineTotal", activeLanguage)}: ${getMaterialLineTotal(material).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={jobWorkspaceDisclosureText}>
                            {translate("workCenterNoMaterialsForThisJobYet", activeLanguage)}
                          </p>
                        )}
                      </div>
                    )}

                    {selectedJobDetailView === "evaluation" && (
                      <div style={jobScopedDetailBody}>
                        {primaryScopedSchedule ? (
                          evaluationPanelMode.readOnly ? (
                            <>
                              <div style={jobScopedList}>
                                <div style={jobScopedListItem}>
                                  <strong>
                                    {translate("workCenterEvaluationSummary", activeLanguage)}
                                  </strong>
                                  <span>
                                    {primaryScopedSchedule.evaluation?.visitNotes ||
                                      primaryScopedSchedule.evaluationNotes ||
                                      primaryScopedSchedule.evaluation?.notes ||
                                      (translate("workCenterEvaluationNotesSaved2", activeLanguage))}
                                  </span>
                                </div>

                                <div style={jobScopedListItem}>
                                  <strong>
                                    {translate("workCenterServiceTypeAndContext", activeLanguage)}
                                  </strong>
                                  <span>
                                    {translate("service", activeLanguage)}:{" "}
                                    {primaryScopedSchedule.evaluation?.serviceType ||
                                      primaryScopedSchedule.serviceType ||
                                      primaryScopedSchedule.evaluationServiceType ||
                                      "—"}
                                  </span>
                                  <span>
                                    {translate("workCenterContext", activeLanguage)}:{" "}
                                    {primaryScopedSchedule.evaluation?.context ||
                                      primaryScopedSchedule.context ||
                                      primaryScopedSchedule.evaluationContext ||
                                      "—"}
                                  </span>
                                  <span>
                                    {translate("workCenterTemplate", activeLanguage)}:{" "}
                                    {primaryScopedSchedule.evaluation?.evaluationTemplate ||
                                      primaryScopedSchedule.evaluationTemplate ||
                                      (translate("workCenterNoMatch", activeLanguage))}
                                  </span>
                                </div>

                                {(primaryScopedSchedule.evaluation?.templateRequirements ||
                                  primaryScopedSchedule.templateRequirements ||
                                  []).length > 0 && (
                                  <div style={jobScopedListItem}>
                                    <strong>
                                      {translate("workCenterExpectedDocumentation", activeLanguage)}
                                    </strong>
                                    <span>
                                      {(primaryScopedSchedule.evaluation?.templateRequirements ||
                                        primaryScopedSchedule.templateRequirements ||
                                        []).join(", ")}
                                    </span>
                                  </div>
                                )}

                                {(primaryScopedSchedule.evaluation?.findingsNotes ||
                                  primaryScopedSchedule.evaluationFindings) && (
                                  <div style={jobScopedListItem}>
                                    <strong>
                                      {translate("assistantProjectBriefFindingsSection", activeLanguage)}
                                    </strong>
                                    <span>
                                      {primaryScopedSchedule.evaluation?.findingsNotes ||
                                        primaryScopedSchedule.evaluationFindings}
                                    </span>
                                  </div>
                                )}

                                {(primaryScopedSchedule.evaluation?.serviceRecommendations ||
                                  primaryScopedSchedule.serviceRecommendations ||
                                  []).length > 0 && (
                                  <div style={jobScopedListItem}>
                                    <strong>
                                      {translate("workCenterRecommendedServices", activeLanguage)}
                                    </strong>
                                    <span>
                                      {(primaryScopedSchedule.evaluation?.serviceRecommendations ||
                                        primaryScopedSchedule.serviceRecommendations ||
                                        [])
                                        .map((recommendation) =>
                                          typeof recommendation === "string"
                                            ? recommendation
                                            : recommendation.title ||
                                              recommendation.label ||
                                              recommendation.service ||
                                              recommendation.serviceId
                                        )
                                        .filter(Boolean)
                                        .join(", ")}
                                    </span>
                                  </div>
                                )}

                                <div style={jobScopedListItem}>
                                  <strong>
                                    {translate("workCenterMaterialsPhotosAndDocumentedWork", activeLanguage)}
                                  </strong>
                                  <span>
                                    {translate("workTabMaterials", activeLanguage)}:{" "}
                                    {primaryScopedSchedule.evaluation?.materialsNeeded ||
                                      primaryScopedSchedule.evaluationMaterialsNeeded ||
                                      (translate("workCenterNotListed", activeLanguage))}
                                  </span>
                                  <span>
                                    {translate("workCenterWorkItems", activeLanguage)}:{" "}
                                    {(primaryScopedSchedule.evaluation?.workItems ||
                                      primaryScopedSchedule.evaluationItems ||
                                      primaryScopedSchedule.workItems ||
                                      []).length}
                                  </span>
                                  <span>
                                    {translate("photos", activeLanguage)}:{" "}
                                    {(primaryScopedSchedule.evaluation?.photos ||
                                      primaryScopedSchedule.evaluationPhotos ||
                                      []).length}
                                  </span>
                                </div>
                              </div>

                              <p style={jobWorkspaceDisclosureText}>
                                {translate("workCenterThisEvaluationIsSavedAndNowServesAsSupportingDocumentationForThe", activeLanguage)}
                              </p>

                              {evaluationPanelMode.canEdit && (
                                <button
                                  type="button"
                                  style={miniInlineButton}
                                  onClick={() => setIsEditingCompletedEvaluation(true)}
                                >
                                  {translate("workCenterEditEvaluation", activeLanguage)}
                                </button>
                              )}
                            </>
                          ) : (
                          <>
                            {buildEvaluationSelectionFields()}
                            {!hasEvaluationSelection() && (
                              <p style={jobWorkspaceDisclosureText}>
                                {translate("workCenterSelectServiceTypeAndContextToOpenEvaluationNotes", activeLanguage)}
                              </p>
                            )}
                            {hasEvaluationSelection() && (
                              <>
                            <label style={evaluationFieldLabel}>
                              {translate("guideEvaluationNotesTitle", activeLanguage)}
                            </label>
                            <textarea
                              value={evaluationForm.notes}
                              style={evaluationTextarea}
                              placeholder={
                                translate("workCenterDocumentWhatYouSawWhatTheCustomerNeedsAndWhatHappensNext", activeLanguage)
                              }
                              onInput={autoResizeTextarea}
                              onChange={(event) =>
                                setEvaluationForm((current) => ({
                                  ...current,
                                  notes: event.target.value,
                                }))
                              }
                            />

                            {(evaluationForm.workItems || []).map((workItem, itemIndex) => (
                              <div key={workItem.id || itemIndex} style={evaluationVisitSection}>
                                <div style={evaluationVisitSectionHeader}>
                                  <div>
                                    <h4 style={evaluationVisitSectionTitle}>
                                      {translate("workCenterDocumentedWork", activeLanguage)}
                                    </h4>
                                    <p style={evaluationVisitSectionText}>
                                      {translate("workCenterPhotosMeasurementsAndMaterialsStayAttachedToSarah", activeLanguage)}
                                    </p>
                                  </div>
                                </div>

                                <label style={evaluationFieldLabel}>
                                  {translate("workCenterServiceTask", activeLanguage)}
                                </label>
                                <input
                                  style={input}
                                  value={workItem.title}
                                  placeholder={selectedWorkCenterJob.title}
                                  onChange={(event) =>
                                    updateEvaluationWorkItem(itemIndex, {
                                      title: event.target.value,
                                    })
                                  }
                                />

                                <label style={evaluationFieldLabel}>
                                  {translate("photos", activeLanguage)}
                                </label>
                                <button
                                  type="button"
                                  style={
                                    mediaUploadDeferred
                                      ? {
                                          ...evaluationAddPhotoButton,
                                          ...disabledEvaluationAddPhotoButton,
                                        }
                                      : evaluationAddPhotoButton
                                  }
                                  disabled={mediaUploadDeferred}
                                  onClick={() => openEvaluationWorkItemPhotoPicker(itemIndex)}
                                >
                                  {mediaUploadDeferred
                                    ? mediaDeferredCopy.title
                                    : translate("workCenterAddPhotos", activeLanguage)}
                                </button>
                                {(workItem.photos || []).length > 0 ? (
                                  <div style={evaluationPhotoGrid}>
                                    {(workItem.photos || []).map((photo) => (
                                      <div key={photo.id} style={evaluationPhotoCard}>
                                        {photo.dataUrl ? (
                                          <img
                                            src={photo.dataUrl}
                                            alt={photo.name || ""}
                                            style={evaluationPhotoThumb}
                                          />
                                        ) : (
                                          <div style={evaluationPhotoMetadataThumb}>
                                            <span></span>
                                            <small>{photo.name || "Photo documented"}</small>
                                          </div>
                                        )}
                                        <button
                                          type="button"
                                          style={evaluationPhotoRemove}
                                          onClick={() =>
                                            removeEvaluationWorkItemPhoto(itemIndex, photo.id)
                                          }
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={evaluationPhotoEmpty}>
                                    {translate("workCenterNoPhotosAddedYet", activeLanguage)}
                                  </div>
                                )}

                                <div style={evaluationInlineSectionHeader}>
                                  <strong>{translate("workCenterMeasurements", activeLanguage)}</strong>
                                  <button
                                    type="button"
                                    style={miniInlineButton}
                                    onClick={() => addEvaluationWorkItemMeasurement(itemIndex)}
                                  >
                                    {translate("workCenterMeasurement", activeLanguage)}
                                  </button>
                                </div>
                                {(workItem.measurements || []).map((measurement, measurementIndex) => (
                                  <div key={measurement.id || measurementIndex} style={jobScopedListItem}>
                                    <input
                                      style={input}
                                      value={measurement.label}
                                      placeholder={translate("workCenterWhatAreYouMeasuring", activeLanguage)}
                                      onChange={(event) =>
                                        updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, {
                                          label: event.target.value,
                                        })
                                      }
                                    />
                                    <select
                                      style={evaluationSelect}
                                      value={measurement.unit}
                                      onChange={(event) =>
                                        updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, {
                                          unit: event.target.value,
                                          value: "",
                                          feet: "",
                                          inches: "",
                                        })
                                      }
                                    >
                                      {evaluationMeasurementUnits.map((unitOption) => (
                                        <option key={unitOption.value} value={unitOption.value}>
                                          {unitOption.label}
                                        </option>
                                      ))}
                                    </select>
                                    {measurement.unit === "feet_inches" ? (
                                      <div style={jobWorkspaceSummaryGrid}>
                                        <input
                                          style={input}
                                          value={measurement.feet}
                                          placeholder={translate("workCenterFeet", activeLanguage)}
                                          onChange={(event) =>
                                            updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, {
                                              feet: event.target.value,
                                            })
                                          }
                                        />
                                        <input
                                          style={input}
                                          value={measurement.inches}
                                          placeholder={translate("workCenterInches", activeLanguage)}
                                          onChange={(event) =>
                                            updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, {
                                              inches: event.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                    ) : (
                                      <input
                                        style={input}
                                        value={measurement.value}
                                        placeholder={translate("workCenterValue", activeLanguage)}
                                        onChange={(event) =>
                                          updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, {
                                            value: event.target.value,
                                          })
                                        }
                                      />
                                    )}
                                    <input
                                      style={input}
                                      value={measurement.quantity}
                                      placeholder={translate("workCenterQuantityOptional", activeLanguage)}
                                      onChange={(event) =>
                                        updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, {
                                          quantity: event.target.value,
                                        })
                                      }
                                    />
                                    <button
                                      type="button"
                                      style={inlineCircleDeleteButton}
                                      onClick={() =>
                                        removeEvaluationWorkItemMeasurement(itemIndex, measurementIndex)
                                      }
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}

                                <div style={evaluationInlineSectionHeader}>
                                  <strong>{translate("workTabMaterials", activeLanguage)}</strong>
                                  <button
                                    type="button"
                                    style={miniInlineButton}
                                    onClick={() => addEvaluationWorkItemMaterial(itemIndex)}
                                  >
                                    {translate("workCenterMaterial", activeLanguage)}
                                  </button>
                                </div>
                                {(workItem.materials || []).map((material, materialIndex) => (
                                  <div key={material.id || materialIndex} style={jobScopedListItem}>
                                    <input
                                      style={input}
                                      value={material.name}
                                      placeholder={translate("workCenterMaterialName", activeLanguage)}
                                      onChange={(event) =>
                                        updateEvaluationWorkItemMaterial(itemIndex, materialIndex, {
                                          name: event.target.value,
                                        })
                                      }
                                    />
                                    <input
                                      style={input}
                                      value={material.quantity}
                                      placeholder={translate("quantity", activeLanguage)}
                                      onChange={(event) =>
                                        updateEvaluationWorkItemMaterial(itemIndex, materialIndex, {
                                          quantity: event.target.value,
                                        })
                                      }
                                    />
                                    <input
                                      style={input}
                                      value={material.unitPrice}
                                      placeholder={translate("workCenterUnitPrice", activeLanguage)}
                                      onChange={(event) =>
                                        updateEvaluationWorkItemMaterial(itemIndex, materialIndex, {
                                          unitPrice: event.target.value,
                                        })
                                      }
                                    />
                                    <span>
                                      {translate("workCenterLineTotal", activeLanguage)}:{" "}
                                      {getMaterialLineTotal(material) === null
                                        ? translate("workCenterNeedsReview", activeLanguage)
                                        : `$${getMaterialLineTotal(material).toFixed(2)}`}
                                    </span>
                                    <button
                                      type="button"
                                      style={inlineCircleDeleteButton}
                                      onClick={() =>
                                        removeEvaluationWorkItemMaterial(itemIndex, materialIndex)
                                      }
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ))}

                            <button
                              type="button"
                              style={startScheduleBtn}
                              disabled={canonicalEvaluationLoading}
                              onClick={() => saveSarahPageEvaluationNotes(scopedJob)}
                            >
                              {canonicalEvaluationLoading
                                ? "Saving Evaluation…"
                                : translate("workCenterSaveEvaluationNotes", activeLanguage)}
                            </button>
                            {!canReadLegacyWorkflowStorage() && canonicalEvaluation && (
                              <>
                                <p style={jobWorkspaceDisclosureText}>
                                  Server-confirmed {canonicalEvaluation.evaluation.status} · version{" "}
                                  {canonicalEvaluation.aggregate.version}. Quote and Authorization remain unavailable.
                                </p>
                                {canonicalEvaluation.evaluation.status === "draft" && (
                                  <button
                                    type="button"
                                    style={secondaryScheduleBtn}
                                    disabled={canonicalEvaluationLoading}
                                    onClick={() => void persistCanonicalEvaluation(scopedJob, { complete: true })}
                                  >
                                    Complete Evaluation
                                  </button>
                                )}
                              </>
                            )}
                              </>
                            )}
                          </>
                          )
                        ) : (
                          <>
                            <p style={jobWorkspaceDisclosureText}>
                              {translate("workCenterScheduleAVisitBeforeSavingEvaluationNotes", activeLanguage)}
                            </p>
                            <button
                              type="button"
                              style={startScheduleBtn}
                              onClick={() => createSarahPageVisitRecord(scopedJob)}
                            >
                              {translate("companionContextScheduleTitle", activeLanguage)}
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {selectedJobDetailView === "active" && (
                      <div style={jobScopedDetailBody}>
                        {scopedActiveRecords.length > 0 || scopedJob.active ? (
                          <div style={jobScopedList}>
                            {(scopedActiveRecords.length > 0
                              ? scopedActiveRecords
                              : [scopedJob.active]
                            ).filter(Boolean).map((activeRecord, index) => (
                              <div key={activeRecord.id || activeRecord.jobId || index} style={jobScopedListItem}>
                                <strong>
                                  {activeRecord.service ||
                                    activeRecord.title ||
                                    selectedWorkCenterJob.title}
                                </strong>
                                <span>
                                  {translate("homeStatus", activeLanguage)}:{" "}
                                  {activeRecord.status || getWorkCenterJobStatus(scopedJob)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={jobWorkspaceDisclosureText}>
                            {translate("workCenterNoActiveWorkForThisJobYet", activeLanguage)}
                          </p>
                        )}
                      </div>
                    )}

                    {selectedJobDetailView === "completion" && (
                      <div style={jobScopedDetailBody}>
                        <p style={jobWorkspaceDisclosureText}>
                          {["completed", "work_completed"].includes(
                            String(primaryScopedSchedule?.status || primaryScopedSchedule?.workStatus || "").toLowerCase()
                          )
                            ? translate("workCenterThisJobIsMarkedCompleted", activeLanguage)
                            : translate("workCenterCompletionForThisJobIsStillPending", activeLanguage)}
                        </p>
                      </div>
                    )}

                    {selectedJobDetailView === "alerts" && (
                      <div style={jobScopedDetailBody}>
                        {scopedAlerts.length > 0 ? (
                          <div style={jobScopedList}>
                            {scopedAlerts.map((alert, index) => (
                              <div key={alert.id || index} style={jobScopedListItem}>
                                <strong>{alert.title || alert.type || "Alert"}</strong>
                                <span>{alert.message || ""}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={jobWorkspaceDisclosureText}>
                            {translate("workCenterNoAlertsForThisJob", activeLanguage)}
                          </p>
                        )}
                      </div>
                    )}

                    {selectedJobDetailView === "closure" && (
                      <div style={jobScopedDetailBody}>
                        <p style={jobWorkspaceDisclosureText}>
                          {primaryScopedSchedule?.closedAt || primaryScopedHistory?.closedAt
                            ? translate("workCenterThisJobIsClosed", activeLanguage)
                            : translate("workCenterClosureForThisJobIsStillPending", activeLanguage)}
                        </p>
                      </div>
                    )}

                    {selectedJobDetailView === "history" && (
                      <div style={jobScopedDetailBody}>
                        <p style={jobWorkspaceDisclosureText}>
                          {primaryScopedHistory
                            ? translate("workCenterHistorySavedForThisJob", activeLanguage)
                            : translate("workCenterThisJobsHistoryAppearsAfterClosure", activeLanguage)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })() : null}
          </section>
        ) : ["currentJobs", "jobHistory"].includes(activeTab) ? (
          <section
            ref={dynamicSectionRef}
            className="meetro-visual-surface"
            style={
              activeTab === "jobHistory"
                ? section
                : {
                    ...workCenterOpenedSection,
                    borderColor: "#e2e8f0",
                  }
            }
          >
            <button
              style={workCenterBackButton}
              onClick={returnToWorkCenterDashboard}
            >
              <span aria-hidden="true">‹</span>
              {translate("backToWorkCenter")}
            </button>

            {activeTab === "currentJobs" ? (
              <>
                <div style={jobListHeader}>
                  <div>
                    <h3 style={jobListTitle}>
                      {translate("workCenterCurrentJobsTitle", activeLanguage)}
                    </h3>
                    <p style={jobListSubtitle}>
                      {translate("workCenterContinueAnActiveJobToMoveTheCustomerWorkflowForward", activeLanguage)}
                    </p>
                  </div>
                  <span style={jobCountPill}>{workCenterActiveJobs.length}</span>
                </div>

                <div style={jobListGrid}>
                  {workCenterActiveJobs.length > 0 ? (
                    workCenterActiveJobs.map((job) => {
                      const isCanonicalReadOnlyJob =
                        isCanonicalWorkCenterEntry(job);
                      const jobListPresentation = isCanonicalReadOnlyJob
                        ? {
                            statusLabel: "Review",
                            nextStepLabel: "View canonical details",
                          }
                        : getWorkCenterJobListPresentation(job);

                      return (
                        <button
                          key={job.id}
                          type="button"
                          className="meetro-visual-surface"
                          style={jobListCard}
                          onClick={() => {
                            if (!isCanonicalReadOnlyJob) {
                              openWorkCenterRelationshipConversation(job, "currentJobs");
                              return;
                            }
                            setSelectedJobDetailView("");
                            setIsJobHistoryMode(false);
                            setIsWorkCenterSectionOpen(false);
                            setSelectedWorkCenterJob(job);
                          }}
                        >
                          <span style={jobListCardMain}>
                            <strong style={jobListCustomer}>{job.customer}</strong>
                            {job.address && <span style={jobListMeta}>{job.address}</span>}
                            <span style={jobListMeta}>{job.title}</span>
                            <span style={jobListStatus}>
                              {translate("homeStatus", activeLanguage)}:{" "}
                              {jobListPresentation.statusLabel}
                            </span>
                            <span style={jobListNextStep}>
                              {translate("myRequestsNextStep", activeLanguage)}:{" "}
                              {jobListPresentation.nextStepLabel}
                            </span>
                            {!isCanonicalReadOnlyJob && (
                              <span style={jobProgressChecklist} aria-label={translate("workCenterJobProgress", activeLanguage)}>
                                {getWorkCenterJobProgressItems(job).map((item) => (
                                  <span
                                    key={item.label}
                                    style={{
                                      ...jobProgressItem,
                                      ...(item.done ? jobProgressItemDone : {}),
                                    }}
                                  >
                                    <span aria-hidden="true">{item.done ? "✓" : "•"}</span>
                                    {item.label}
                                  </span>
                                ))}
                              </span>
                            )}
                          </span>
                          <span style={jobListAction}>
                            {translate("workCenterJobDetails", activeLanguage)}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="meetro-visual-empty-state" style={jobListEmpty}>
                      {translate("workCenterCurrentJobsWillAppearHere", activeLanguage)}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={workCenterChildHeader}>
                  <h2 style={workCenterChildTitle}>
                    {ui("workCenterHistoryTitle")}
                  </h2>
                  <p style={workCenterChildSummary}>
                    {workCenterHistoryJobs.length > 0
                      ? `${workCenterHistoryJobs.length} ${ui("workCenterChildHistorySummary")}`
                      : ui("workCenterChildHistoryEmptySummary")}
                  </p>
                </div>

                <p role="status" style={lifecycleHistoryNotice}>
                  {translate("lifecycleLegacyHistoryNotice", activeLanguage)}
                </p>

                <div style={jobListGrid}>
                  {workCenterHistoryJobs.length > 0 ? (
                    workCenterHistoryJobs.map((job) => (
                      <button
                        key={`history-${job.id}`}
                        type="button"
                        className="meetro-visual-surface"
                        style={jobListCard}
                        onClick={() => {
                          setSelectedJobDetailView("");
                          setIsJobHistoryMode(true);
	                          setJobMenuTab("history");
	                          setHistoryActionNotice("");
	                          setSelectedWorkCenterJob(job);
	                          setIsWorkCenterSectionOpen(false);
	                        }}
                      >
                        <span style={jobListCardMain}>
                          <strong style={jobListCustomer}>{job.customer}</strong>
	                          <span style={jobListMeta}>{job.title}</span>
	                          <span style={jobListMeta}>{job.address}</span>
	                          {job.history?.sourceType === "emergency" && (
	                            <span style={jobHistorySourceLabel}>
	                              {translate("emergency", activeLanguage)}
	                            </span>
	                          )}
	                          <span style={jobListStatus}>
	                            {translate("workCenterFinalStatus", activeLanguage)}:{" "}
	                            {translate("stateClosed", activeLanguage)}
	                          </span>
	                          <span style={jobListNextStep}>
	                            {translate("workCenterFinalTotal", activeLanguage)}:{" "}
	                            ${getWorkCenterJobFinalTotal(job).toFixed(2)}
	                          </span>
	                          <span style={jobListMeta}>
	                            {translate("workCenterCloseDate", activeLanguage)}:{" "}
	                            {job.history?.closeDate || job.history?.closedAt || job.schedule?.closedAt
	                              ? new Date(
	                                  job.history?.closeDate ||
	                                    job.history?.closedAt ||
	                                    job.schedule?.closedAt
	                                ).toLocaleDateString()
	                              : "—"}
	                          </span>
	                        </span>
                        <span style={jobListAction}>
                          {translate("workCenterReviewJobHistory", activeLanguage)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="meetro-visual-empty-state" style={jobListEmpty}>
                      {translate("workCenterClosedJobsWillAppearHere", activeLanguage)}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        ) : activeTab === "schedule" ? (
          <div ref={dynamicSectionRef} style={scheduleOpenedPage}>
            <button
              style={workCenterBackButton}
              onClick={returnToWorkCenterDashboard}
            >
              <span aria-hidden="true">‹</span>
              {translate("backToWorkCenter")}
            </button>
            <h2 style={workCenterChildTitle}>
              {ui("workCenterScheduleTitle")}
            </h2>
            <p style={workCenterChildSummary}>
              {upcomingScheduleCount > 0
                ? `${upcomingScheduleCount} ${ui("workCenterChildScheduleSummary")}`
                : ui("workCenterChildScheduleEmptySummary")}
            </p>
          </div>
        ) : ["pending", "quotes", "active", "revenue", "completed"].includes(activeTab) ? null : (
          <section
            ref={dynamicSectionRef}
            className="meetro-visual-surface"
            style={{
              ...workCenterOpenedSection,
              borderColor: `${activeSection.accent}2f`,
            }}
          >
            <button
              style={workCenterBackButton}
              onClick={returnToWorkCenterDashboard}
            >
              <span aria-hidden="true">‹</span>
              {translate("backToWorkCenter")}
            </button>

            <div style={workCenterOpenedSectionHeading}>
              <span
                style={{
                  ...workCenterOpenedSectionIcon,
                  background: activeSection.tone,
                  color: activeSection.accent,
                }}
              >
                <MeetroIcon
                  name={activeTab === "materials" ? "materials" : activeSection.icon}
                  size={28}
                  decorative
                />
              </span>
              <div>
                <span style={workCenterOpenedSectionEyebrow}>
                  {translate("workCenterWorkflowArea")}
                </span>
                <h2 style={workCenterOpenedSectionTitle}>
                  {activeTab === "materials"
                    ? translate("workTabMaterials")
                    : activeSection.openedTitle || activeSection.title}
                </h2>
                <p style={workCenterOpenedSectionDescription}>
                  {activeTab === "materials"
                    ? translate("workGuidanceMaterials")
                    : activeSection.openedDescription ||
                      activeSection.description}
                </p>
                <div
                  style={{
                    ...workCenterOpenedSectionNextStep,
                    background: activeSection.tone,
                    borderColor: `${activeSection.accent}24`,
                  }}
                >
                  <span
                    style={{
                      ...workCenterOpenedSectionNextStepLabel,
                      color: activeSection.accent,
                    }}
                  >
                    {translate("workCenterNextStepLabel")}
                  </span>
                  <strong style={workCenterOpenedSectionNextStepText}>
                    {activeSection.openedNextStep || activeSection.nextStep}
                  </strong>
                </div>
                <div style={workCenterOpenedSectionActions}>
                  {getOpenedSectionActions().map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      className="meetro-visual-primary-button"
                      style={{
                        ...workCenterOpenedSectionActionButton,
                        background: activeSection.accent,
                      }}
                      onClick={action.onClick}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {["active", "materials"].includes(activeTab) && (
              <div style={workCenterSubNavigation}>
                <button
                  style={
                    activeTab === "active"
                      ? workCenterSubNavigationActive
                      : workCenterSubNavigationButton
                  }
                  onClick={() => openWorkTab("active")}
                >
                  {translate("workCenterActiveWorkTitle")}
                </button>
                <button
                  style={
                    activeTab === "materials"
                      ? workCenterSubNavigationActive
                      : workCenterSubNavigationButton
                  }
                  onClick={() => openWorkTab("materials")}
                >
                  {translate("workTabMaterials")}
                  {materialsAlertCount > 0 && (
                    <span style={quoteAlertBadge}>{materialsAlertCount}</span>
                  )}
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      {isWorkCenterSectionOpen && (
        <>
      {["materials", "records"].includes(activeTab) && (() => {
        const activeContext = getActiveWorkContext();

        if (!activeContext.id && !activeContext.service) return null;

        return (
          <div style={activeProjectContextCard}>
            <div>
              <span style={activeProjectContextLabel}>
                {activeTab === "records"
                  ? translate("momentDetailRelationshipContext", activeLanguage)
                  : activeTab === "quotes"
                  ? translate("workCenterQuoteContext", activeLanguage)
                  : activeTab === "pending"
                  ? translate("workCenterRequestContext", activeLanguage)
                  : translate("workCenterActiveWorkContext", activeLanguage)}
              </span>

              <h3 style={activeProjectContextTitle}>
                {activeContext.service ||
                  translate("activeWorkFallback")}
              </h3>

              <p style={activeProjectContextMeta}>
                {activeContext.location ||
                  (translate("workCenterNoLocationAssigned", activeLanguage))}
              </p>
            </div>

            <div style={activeProjectContextStatus}>
              {getWorkflowStageLabel(activeContext.stage || activeContext.type || "review")}
            </div>
          </div>
        );
      })()}

      {activeTab === "schedule" && (
        <div style={scheduleContentSection}>
          <div style={scheduleCompactHeader}>
            <div>
              <h2 style={scheduleCompactTitle}>
                {translate("workSchedule")}
              </h2>
              <p style={scheduleCompactPurpose}>
                {translate("workCenterAddAndManageCustomerVisits", activeLanguage)}
              </p>
            </div>

            <button
              style={schedulePrimaryAction}
              onClick={() => {
                if (showScheduleForm) {
                  resetScheduleForm();
                } else {
                  setScheduleForm(createBlankScheduleForm());
                  setEditingScheduleId(null);
                  setShowScheduleForm(true);
                }
              }}
            >
              {showScheduleForm
                ? translate("closeForm")
                : translate("workCenterAddVisit3", activeLanguage)}
            </button>
          </div>

          {appointmentReminderNotice && (
            <div style={appointmentReminderNoticeCard}>
              <div>
                <strong>
                  {appointmentReminderNotice.title ||
                    (translate("conversationNotificationsNeeded", activeLanguage))}
                </strong>
                <p>{appointmentReminderNotice.message}</p>
              </div>

              {appointmentReminderNotice.actions !== false && (
                <div style={appointmentReminderNoticeActions}>
                  <button
                    type="button"
                    style={appointmentReminderSettingsButton}
                    onClick={openNotificationSettings}
                  >
                    {translate("conversationOpenSettings", activeLanguage)}
                  </button>
                  <button
                    type="button"
                    style={appointmentReminderContinueButton}
                    onClick={() => setAppointmentReminderNotice(null)}
                  >
                    {translate("conversationContinueWithoutReminders", activeLanguage)}
                  </button>
                </div>
              )}
            </div>
          )}

          {pendingScheduleDelivery && (
            <div style={scheduleDeliveryChoiceCard}>
              <div>
                <strong>
                  {pendingScheduleDelivery.isScheduleUpdate
                    ? translate("workCenterAppointmentUpdated", activeLanguage)
                    : translate("workCenterVisitSaved", activeLanguage)}
                </strong>
                <p style={scheduleDeliveryChoiceText}>
                  {translate("workCenterThisCustomerIsNotLinkedInMeetroYetShareTheAppointmentBy", activeLanguage)}
                </p>
              </div>

              <div style={scheduleDeliverySummary}>
                <span>{pendingScheduleDelivery.visit?.customerName || "Customer"}</span>
                <span>
                  {pendingScheduleDelivery.visit?.date || "—"} ·{" "}
                  {formatScheduleTime(pendingScheduleDelivery.visit?.time || "") || "—"}
                </span>
              </div>

              <div style={scheduleDeliveryActions}>
                <button
                  type="button"
                  style={scheduleDeliveryPrimaryButton}
                  onClick={() => handleScheduleDeliveryChoice("share")}
                >
                  {translate("workCenterShareByTextIOSMessage", activeLanguage)}
                </button>
              </div>
            </div>
          )}

          {evaluationTarget && (() => {
            const jobWorkspaceAction = getJobWorkspacePrimaryAction(evaluationTarget);
            const linkedJobQuote = getQuoteForAppointment(evaluationTarget);
            const jobWorkItems = Array.isArray(evaluationForm.workItems)
              ? evaluationForm.workItems
              : [];
            const jobPhotosCount = jobWorkItems.reduce(
              (total, workItem) =>
                total + (Array.isArray(workItem.photos) ? workItem.photos.length : 0),
              0
            );
            const jobMeasurementsCount = jobWorkItems.reduce(
              (total, workItem) =>
                total +
                (Array.isArray(workItem.measurements)
                  ? workItem.measurements.length
                  : 0),
              0
            );
            const jobMaterialsCount = jobWorkItems.reduce(
              (total, workItem) =>
                total +
                (Array.isArray(workItem.materials) ? workItem.materials.length : 0),
              0
            );

            return (
            <div style={visitDetailPage}>
              <button
                type="button"
                style={workCenterBackButton}
                onClick={() => setEvaluationTarget(null)}
              >
                <span aria-hidden="true">‹</span>
                {translate("workCenterBackToSchedule", activeLanguage)}
              </button>

              <div style={jobWorkspaceHero}>
                <div style={jobWorkspaceHeaderRow}>
                  <div>
                    <span style={jobWorkspaceEyebrow}>
                      {translate("workCenterJobWorkspace", activeLanguage)}
                    </span>
                    <h2 style={visitDetailTitle}>
                      {getJobWorkspaceCustomer(evaluationTarget)}
                    </h2>
                    <p style={jobWorkspaceAddress}>
                      {getJobWorkspaceAddress(evaluationTarget)}
                    </p>
                  </div>
                  <span style={jobWorkspaceStatusPill}>
                    {getJobWorkspaceStatus(evaluationTarget)}
                  </span>
                </div>

                <div style={jobWorkspaceNextStepCard}>
                  <span>{translate("myRequestsNextStep", activeLanguage)}</span>
                  <strong>{getJobWorkspaceNextStep(evaluationTarget)}</strong>
                  <button
                    type="button"
                    style={startScheduleBtn}
                    onClick={jobWorkspaceAction.onClick}
                  >
                    {jobWorkspaceAction.label}
                  </button>
                </div>

                <div style={jobWorkspaceSummaryGrid}>
                  <div style={visitDetailMetaCell}>
                    <span>{translate("workCenterServicesSummary", activeLanguage)}</span>
                    <strong>{getJobWorkspaceService(evaluationTarget)}</strong>
                  </div>
                  <div style={visitDetailMetaCell}>
                    <span>{translate("workCenterDateTime", activeLanguage)}</span>
                    <strong>
                      {evaluationTarget.date || translate("today")} ·{" "}
                      {formatScheduleTime(evaluationTarget.time)}
                    </strong>
                  </div>
                </div>
                {evaluationTarget.notes && (
                  <p style={visitDetailNotes}>{evaluationTarget.notes}</p>
                )}
                <div style={jobWorkspaceActionRow}>
                  {evaluationTarget.conversationId && (
                    <button
                      type="button"
                      style={secondaryScheduleBtn}
                      onClick={() => {
                        localStorage.setItem("activeConversationId", evaluationTarget.conversationId);
                        localStorage.setItem("meetroConversationType", "standard");
                        localStorage.setItem("conversationReturnPage", "workCenter");
                        localStorage.setItem("returnPage", "workCenter");
                        localStorage.setItem("conversationReturnSection", "schedule");
                        setPage("conversationThread");
                      }}
                    >
                      {translate("sendToCustomer", activeLanguage)}
                    </button>
                  )}
                  {linkedJobQuote && (
                    <button
                      type="button"
                      style={secondaryScheduleBtn}
                      onClick={() => setQuoteViewTarget(linkedJobQuote)}
                    >
                      {translate("assistantActionViewQuote", activeLanguage)}
                    </button>
                  )}
                </div>
              </div>

              {(evaluationSaveNotice || evaluationSaveError) && (
                <div
                  role={evaluationSaveError ? "alert" : "status"}
                  style={
                    evaluationSaveError
                      ? evaluationSaveErrorCard
                      : evaluationSaveNoticeCard
                  }
                >
                  {evaluationSaveError || evaluationSaveNotice}
                </div>
              )}

              <div style={jobWorkspaceDisclosureStack}>
                <details style={jobWorkspaceDisclosure}>
                  <summary style={jobWorkspaceSummary}>
                    <span>{translate("photos", activeLanguage)}</span>
                    <small>{jobPhotosCount}</small>
                  </summary>
                  <p style={jobWorkspaceDisclosureText}>
                    {jobPhotosCount > 0
                      ? translate("workCenterPhotosDocumentedCount", activeLanguage, { count: jobPhotosCount })
                      : translate("workCenterNoPhotosDocumentedYet", activeLanguage)}
                  </p>
                </details>
                <details style={jobWorkspaceDisclosure}>
                  <summary style={jobWorkspaceSummary}>
                    <span>{translate("companionContextQuoteTitle", activeLanguage)}</span>
                    <small>
                      {linkedJobQuote
                        ? getJobWorkspaceStatus(evaluationTarget)
                        : translate("teamMemberStatusPending", activeLanguage)}
                    </small>
                  </summary>
                  <p style={jobWorkspaceDisclosureText}>
                    {linkedJobQuote
                      ? translate("workCenterTheProposalIsLinkedToThisVisit", activeLanguage)
                      : translate("workCenterCreateAProposalWhenTheVisitNotesAreReady", activeLanguage)}
                  </p>
                </details>
                <details style={jobWorkspaceDisclosure}>
                  <summary style={jobWorkspaceSummary}>
                    <span>{translate("workTabMaterials", activeLanguage)}</span>
                    <small>{jobMaterialsCount}</small>
                  </summary>
                  <p style={jobWorkspaceDisclosureText}>
                    {translate("workCenterMaterialsTotal", activeLanguage, {
                      amount: formatLocaleCurrency(
                        getEvaluationMaterialsTotal(jobWorkItems),
                        "USD",
                        {},
                        activeLanguage
                      ),
                    })}
                  </p>
                </details>
                <details style={jobWorkspaceDisclosure}>
                  <summary style={jobWorkspaceSummary}>
                    <span>{translate("workCenterMeasurements", activeLanguage)}</span>
                    <small>{jobMeasurementsCount}</small>
                  </summary>
                  <p style={jobWorkspaceDisclosureText}>
                    {jobMeasurementsCount > 0
                      ? translate("workCenterMeasurementsAreSavedInTheVisitNotes", activeLanguage)
                      : translate("workCenterNoMeasurementsSavedYet", activeLanguage)}
                  </p>
                </details>
                <details style={jobWorkspaceDisclosure}>
                  <summary style={jobWorkspaceSummary}>
                    <span>{translate("workCenterPaymentHistory", activeLanguage)}</span>
                    <small>{translate("workCenterNone2", activeLanguage)}</small>
                  </summary>
                  <p style={jobWorkspaceDisclosureText}>
                    {translate("workCenterPaymentsWillAppearHereWhenTheyAreRecorded", activeLanguage)}
                  </p>
                </details>
                <details style={jobWorkspaceDisclosure}>
                  <summary style={jobWorkspaceSummary}>
                    <span>{translate("workCenterHistoryTitle", activeLanguage)}</span>
                    <small>{translate("workCenterLocal", activeLanguage)}</small>
                  </summary>
                  <p style={jobWorkspaceDisclosureText}>
                    {translate("workCenterSavedNotesProposalsAndUpdatesBecomeTheJobHistory", activeLanguage)}
                  </p>
                </details>
              </div>

              <details id="job-evaluation-notes" style={jobWorkspaceDisclosure}>
                <summary style={jobWorkspaceSummary}>
                  <span>{translate("guideEvaluationNotesTitle", activeLanguage)}</span>
                  <small>{translate("edit", activeLanguage)}</small>
                </summary>
                <div style={visitEvaluationHeader}>
                  <div>
                    <h3 style={visitEvaluationTitle}>
                      {translate("guideEvaluationNotesTitle", activeLanguage)}
                    </h3>
                    <p style={visitEvaluationHelp}>
                      {translate("workCenterRecordObservationsFindingsMeasurementsPhotosAndRecommendedServicesFromThisVisit", activeLanguage)}
                    </p>
                  </div>
                  <button
                    type="button"
                    style={secondaryScheduleBtn}
                    onClick={addEvaluationWorkItem}
                  >
                    + {translate("workCenterWorkItem2", activeLanguage)}
                  </button>
                </div>

                {buildEvaluationSelectionFields()}
                {!hasEvaluationSelection() && (
                  <p style={jobWorkspaceDisclosureText}>
                    {translate("workCenterSelectServiceTypeAndContextToOpenEvaluationNotes", activeLanguage)}
                  </p>
                )}
                {hasEvaluationSelection() && (
                  <>
              <div style={visitWorkItemList}>
                {(evaluationForm.workItems || []).map((workItem, itemIndex) => (
                  <div key={workItem.id || itemIndex} style={visitWorkItemCard}>
                    <div style={visitWorkItemHeader}>
                      <strong>
                        {translate("workCenterWorkItem", activeLanguage)}{" "}
                        {itemIndex + 1}
                      </strong>
                      {(evaluationForm.workItems || []).length > 1 && (
                        <button
                          type="button"
                          style={inlineCircleDeleteButton}
                          aria-label={
                            translate("workCenterDeleteWorkItem", activeLanguage)
                          }
                          onClick={() => removeEvaluationWorkItem(itemIndex)}
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <input
                      style={scheduleInput}
                      value={workItem.title}
                      onChange={(event) =>
                        updateEvaluationWorkItem(itemIndex, { title: event.target.value })
                      }
                      placeholder={
                        translate("workCenterItemTitle", activeLanguage)
                      }
                    />

                    <div style={evaluationVisitSection}>
                      <div style={evaluationVisitSectionHeader}>
                        <h4 style={evaluationVisitSectionTitle}>
                          {translate("photos", activeLanguage)}
                        </h4>
                        <button
                          type="button"
                          style={
                            mediaUploadDeferred
                              ? {
                                  ...evaluationAddPhotoButton,
                                  ...disabledEvaluationAddPhotoButton,
                                }
                              : evaluationAddPhotoButton
                          }
                          disabled={mediaUploadDeferred}
                          onClick={() => openEvaluationWorkItemPhotoPicker(itemIndex)}
                        >
                          {mediaUploadDeferred
                            ? mediaDeferredCopy.title
                            : `+ ${translate("workCenterAddPhoto", activeLanguage)}`}
                        </button>
                      </div>
                      {workItem.photos?.length > 0 ? (
                        <div style={evaluationPhotoGrid}>
                          {workItem.photos.map((photo) => (
                            <div key={photo.id} style={evaluationPhotoCard}>
                              {photo.dataUrl ? (
                                <img
                                  src={photo.dataUrl}
                                  alt={photo.name || ""}
                                  style={evaluationPhotoThumb}
                                />
                              ) : (
                                <div style={evaluationPhotoMetadataThumb}>
                                  <span></span>
                                  <small>{photo.name || "Photo saved"}</small>
                                </div>
                              )}
                              <button
                                type="button"
                                style={evaluationPhotoRemove}
                                onClick={() => removeEvaluationWorkItemPhoto(itemIndex, photo.id)}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={evaluationPhotoEmpty}>
                          {translate("workCenterNoPhotosYet", activeLanguage)}
                        </div>
                      )}
                    </div>

                    <textarea
                      style={evaluationTextarea}
                      value={workItem.notes}
                      onInput={autoResizeTextarea}
                      onFocus={autoResizeTextarea}
                      onChange={(event) => {
                        autoResizeTextarea(event);
                        updateEvaluationWorkItem(itemIndex, { notes: event.target.value });
                      }}
                      placeholder={
                        translate("workCenterWorkItemNotes", activeLanguage)
                      }
                    />

                    <div style={visitNestedSection}>
                      <div style={visitNestedHeader}>
                        <strong>{translate("workCenterMeasurements", activeLanguage)}</strong>
                        <button
                          type="button"
                          style={miniInlineButton}
                          onClick={() => addEvaluationWorkItemMeasurement(itemIndex)}
                        >
                          + {translate("workCenterMeasurement2", activeLanguage)}
                        </button>
                      </div>
                      {(workItem.measurements || []).map((measurement, measurementIndex) => (
                        <div
                          key={measurement.id || measurementIndex}
                          style={visitMeasurementGrid}
                        >
                          <input
                            style={scheduleInput}
                            value={measurement.label || ""}
                            onChange={(event) =>
                              updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, {
                                label: event.target.value,
                              })
                            }
                            placeholder={
                              translate("workCenterWhatAreYouMeasuring2", activeLanguage)
                            }
                          />
                          <select
                            style={scheduleInput}
                            value={measurement.unit || ""}
                            onChange={(event) =>
                              updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, {
                                unit: event.target.value,
                                value:
                                  event.target.value === "feet_inches"
                                    ? ""
                                    : measurement.value || "",
                                feet:
                                  event.target.value === "feet_inches"
                                    ? measurement.feet || ""
                                    : "",
                                inches:
                                  event.target.value === "feet_inches"
                                    ? measurement.inches || ""
                                    : "",
                                width: isDimensionMeasurementUnit(event.target.value)
                                  ? measurement.width || ""
                                  : "",
                                height: isDimensionMeasurementUnit(event.target.value)
                                  ? measurement.height || ""
                                  : "",
                                depth: isDimensionMeasurementUnit(event.target.value)
                                  ? measurement.depth || ""
                                  : "",
                              })
                            }
                          >
                            <option value="">
                              {translate("workCenterMeasurementType", activeLanguage)}
                            </option>
                            {evaluationMeasurementUnits.map((unitOption) => (
                              <option key={unitOption.value} value={unitOption.value}>
                                {unitOption.label}
                              </option>
                            ))}
                          </select>
                          {measurement.unit === "feet_inches" ? (
                            <>
                              <input
                                style={scheduleInput}
                                value={measurement.feet || ""}
                                onChange={(event) =>
                                  updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, {
                                    feet: event.target.value,
                                    value: "",
                                  })
                                }
                                placeholder={translate("workCenterFeet", activeLanguage)}
                              />
                              <input
                                style={scheduleInput}
                                value={measurement.inches || ""}
                                onChange={(event) =>
                                  updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, {
                                    inches: event.target.value,
                                    value: "",
                                  })
                                }
                                placeholder={translate("workCenterInches", activeLanguage)}
                              />
                            </>
                          ) : isDimensionMeasurementUnit(measurement.unit) ? (
                            <>
                              <input
                                style={scheduleInput}
                                value={measurement.width || ""}
                                onChange={(event) =>
                                  updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, {
                                    width: event.target.value,
                                    value: "",
                                  })
                                }
                                placeholder={translate("workCenterWidth", activeLanguage)}
                              />
                              <input
                                style={scheduleInput}
                                value={measurement.height || ""}
                                onChange={(event) =>
                                  updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, {
                                    height: event.target.value,
                                    value: "",
                                  })
                                }
                                placeholder={translate("workCenterHeight", activeLanguage)}
                              />
                              <input
                                style={scheduleInput}
                                value={measurement.depth || ""}
                                onChange={(event) =>
                                  updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, {
                                    depth: event.target.value,
                                    value: "",
                                  })
                                }
                                placeholder={
                                  translate("workCenterDepthOptional", activeLanguage)
                                }
                              />
                            </>
                          ) : (
                            <input
                              style={scheduleInput}
                              value={measurement.value || ""}
                              onChange={(event) =>
                                updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, {
                                  value: event.target.value,
                                  feet: "",
                                  inches: "",
                                  width: "",
                                  height: "",
                                  depth: "",
                                })
                              }
                              placeholder={translate("workCenterValue", activeLanguage)}
                            />
                          )}
                          <input
                            style={scheduleInput}
                            value={measurement.quantity || ""}
                            onChange={(event) =>
                              updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, {
                                quantity: event.target.value,
                              })
                            }
                            placeholder={
                              translate("workCenterQuantityOptional", activeLanguage)
                            }
                          />
                          <input
                            style={scheduleInput}
                            value={measurement.notes || ""}
                            onChange={(event) =>
                              updateEvaluationWorkItemMeasurement(itemIndex, measurementIndex, {
                                notes: event.target.value,
                              })
                            }
                            placeholder={translate("jobsHiringApplicantNotes", activeLanguage)}
                          />
                          <button
                            type="button"
                            style={inlineCircleDeleteButton}
                            aria-label={
                              translate("workCenterDeleteMeasurement", activeLanguage)
                            }
                            onClick={() =>
                              removeEvaluationWorkItemMeasurement(itemIndex, measurementIndex)
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <div style={visitNestedSection}>
                      <div style={visitNestedHeader}>
                        <strong>{translate("workTabMaterials", activeLanguage)}</strong>
                        <button
                          type="button"
                          style={miniInlineButton}
                          onClick={() => addEvaluationWorkItemMaterial(itemIndex)}
                        >
                          + {translate("material", activeLanguage)}
                        </button>
                      </div>
                      {(workItem.materials || []).map((material, materialIndex) => (
                        <div key={material.id || materialIndex} style={visitNestedGrid}>
                          <input
                            style={scheduleInput}
                            value={material.name || ""}
                            onChange={(event) =>
                              updateEvaluationWorkItemMaterial(itemIndex, materialIndex, {
                                name: event.target.value,
                              })
                            }
                            placeholder={translate("material", activeLanguage)}
                          />
                          <input
                            style={scheduleInput}
                            value={material.quantity || ""}
                            onChange={(event) =>
                              updateEvaluationWorkItemMaterial(itemIndex, materialIndex, {
                                quantity: event.target.value,
                              })
                            }
                            placeholder={translate("workCenterQty", activeLanguage)}
                          />
                          <input
                            style={scheduleInput}
                            inputMode="decimal"
                            value={material.unitPrice ?? material.unit ?? ""}
                            onChange={(event) =>
                              updateEvaluationWorkItemMaterial(itemIndex, materialIndex, {
                                unitPrice: event.target.value,
                              })
                            }
                            placeholder={translate("workCenterUnitPrice", activeLanguage)}
                          />
                          <input
                            style={scheduleInput}
                            value={material.provider || ""}
                            onChange={(event) =>
                              updateEvaluationWorkItemMaterial(itemIndex, materialIndex, {
                                provider: event.target.value,
                              })
                            }
                            placeholder={translate("workCenterProvider", activeLanguage)}
                          />
                          <div style={materialLineTotalPill}>
                            {translate("workCenterLineTotal", activeLanguage)}:{" "}
                            {getMaterialLineTotal(material) === null
                              ? translate("needsReview")
                              : `$${getMaterialLineTotal(material).toFixed(2)}`}
                          </div>
                          <button
                            type="button"
                            style={inlineCircleDeleteButton}
                            aria-label={
                              translate("workCenterDeleteMaterial", activeLanguage)
                            }
                            onClick={() =>
                              removeEvaluationWorkItemMaterial(itemIndex, materialIndex)
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {(workItem.materials || []).length > 0 && (
                        <div style={materialsTotalSummary}>
                          {translate("workCenterMaterialsTotal", activeLanguage)}:{" "}
                          <strong>
                            ${getEvaluationMaterialsTotal([workItem]).toFixed(2)}
                          </strong>
                        </div>
                      )}
                    </div>

                    <textarea
                      style={evaluationCompactTextarea}
                      value={workItem.safetyNotes}
                      onInput={autoResizeTextarea}
                      onFocus={autoResizeTextarea}
                      onChange={(event) => {
                        autoResizeTextarea(event);
                        updateEvaluationWorkItem(itemIndex, {
                          safetyNotes: event.target.value,
                        });
                      }}
                      placeholder={
                        translate("workCenterOptionalSafetyNotes", activeLanguage)
                      }
                    />
                  </div>
                ))}
              </div>
                  </>
                )}
              </details>

              <div style={visitDetailActions}>
                <button
                  type="button"
                  style={secondaryScheduleBtn}
                  disabled={canonicalEvaluationLoading}
                  onClick={() => saveEvaluationRecord(evaluationTarget, { keepOpen: true })}
                >
                  {canonicalEvaluationLoading
                    ? "Saving Evaluation…"
                    : translate("workCenterSaveEvaluation", activeLanguage)}
                </button>
                {!canReadLegacyWorkflowStorage() && canonicalEvaluation && (
                  <>
                    <p style={{ ...jobWorkspaceDisclosureText, gridColumn: "1 / -1" }}>
                      Server-confirmed {canonicalEvaluation.evaluation.status} · version{" "}
                      {canonicalEvaluation.aggregate.version}. Quote and Authorization remain unavailable.
                    </p>
                    {canonicalEvaluation.evaluation.status === "draft" && (
                      <button
                        type="button"
                        style={startScheduleBtn}
                        disabled={canonicalEvaluationLoading}
                        onClick={() => void persistCanonicalEvaluation(evaluationTarget, { complete: true })}
                      >
                        Complete Evaluation
                      </button>
                    )}
                  </>
                )}
                {!hasEvaluationForAppointment(evaluationTarget) &&
                  !canonicalEvaluation && (
                  <p style={{ ...jobWorkspaceDisclosureText, gridColumn: "1 / -1" }}>
                    {translate("workCenterRecordEvaluationNotesBeforePreparingAProposal", activeLanguage)}
                  </p>
                )}
                {hasEvaluationForAppointment(evaluationTarget) && (
                  <button
                    type="button"
                    style={{
                      ...startScheduleBtn,
                      cursor: "pointer",
                    }}
                    onClick={() => continueEvaluationToQuote(evaluationTarget)}
                  >
                    {translate("assistantProjectBriefNextCreateProposal", activeLanguage)}
                  </button>
                )}
              </div>
            </div>
            );
          })()}

          {!evaluationTarget && showScheduleForm && (
            <div style={scheduleFormCard}>
              <select
                style={scheduleInput}
                value={scheduleForm.appointmentType || "walkthrough"}
                onChange={(e) => {
                  setScheduleForm({
                    ...scheduleForm,
                    appointmentType: e.target.value,
                  });
                }}
              >
                {getScheduleAppointmentOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <input
                style={scheduleInput}
                placeholder={
                  translate("workCenterWhatIsThisVisitFor", activeLanguage)
                }
                value={scheduleForm.title}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, title: e.target.value })
                }
              />

              <div style={manualCustomerFieldsCard}>
                <div>
                  <strong>
                    {translate("workCenterExistingOrOutsideCustomer", activeLanguage)}
                  </strong>
                  <p style={manualScheduleNoticeText}>
                    {translate("workCenterScheduleAVisitEvenIfTheCustomerDoesNotHaveAMeetro", activeLanguage)}
                  </p>
                </div>

                <input
                  style={scheduleInput}
                  placeholder={
                    translate("workCenterCustomerName", activeLanguage)
                  }
                  value={scheduleForm.manualCustomerName || ""}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      manualCustomerName: e.target.value,
                    })
                  }
                />

                <div style={scheduleFormGrid}>
                  <input
                    style={scheduleInput}
                    placeholder={
                      translate("workCenterPhoneNumber", activeLanguage)
                    }
                    value={scheduleForm.manualCustomerPhone || ""}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        manualCustomerPhone: e.target.value,
                      })
                    }
                  />

                  <input
                    style={scheduleInput}
                    placeholder={
                      translate("workCenterEmailOptional", activeLanguage)
                    }
                    value={scheduleForm.manualCustomerEmail || ""}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        manualCustomerEmail: e.target.value,
                      })
                    }
                  />
                </div>

                <input
                  style={scheduleInput}
                  placeholder={
                    translate("workCenterAddressOrLocation", activeLanguage)
                  }
                  value={scheduleForm.manualCustomerAddress || ""}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      manualCustomerAddress: e.target.value,
                    })
                  }
                />

                <div style={manualCustomerInviteNotice}>
                  {translate("workCenterCustomerInviteComingSoonYouCanSaveTheVisitNow", activeLanguage)}
                </div>
              </div>

              <div style={scheduleFormGrid}>
                <input
                  style={scheduleInput}
                  type="date"
                  value={scheduleForm.date}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, date: e.target.value })
                  }
                />

                <input
                  style={scheduleInput}
                  type="time"
                  value={scheduleForm.time && scheduleForm.time.includes("AM") ? "12:00" : scheduleForm.time}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, time: e.target.value })
                  }
                />
              </div>

              <input
                style={scheduleInput}
                placeholder={
                  translate("workCenterDifferentVisitLocationOptional", activeLanguage)
                }
                value={scheduleForm.location}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, location: e.target.value })
                }
              />

              <textarea
                style={scheduleTextarea}
                placeholder={
                  translate("workCenterAddAnythingToRememberBeforeTheVisit", activeLanguage)
                }
                value={scheduleForm.notes}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, notes: e.target.value })
                }
              />

              <button style={saveScheduleButton} onClick={saveManualScheduleVisit}>
                {editingScheduleId
                  ? translate("updateAppointment")
                  : translate("saveAppointment")}
              </button>

              <div style={manualScheduleNotice}>
                <strong>
                  {translate("manualScheduleEntry", activeLanguage)}
                </strong>

                <p style={manualScheduleNoticeText}>
                  {translate("manualScheduleNotice", activeLanguage)}
                </p>
              </div>
            </div>
          )}

          {!evaluationTarget && (() => {
            const rawScheduleItems = readMeetroArray("meetro_business_schedule");
            const todayKey = new Date().toISOString().slice(0, 10);
            const isTodayFilter = getScheduleFilter() === "today";
            const scheduleItems = isTodayFilter
              ? [...rawScheduleItems].sort((first, second) => {
                  const firstIsToday = first?.date === todayKey ? 0 : 1;
                  const secondIsToday = second?.date === todayKey ? 0 : 1;
                  return firstIsToday - secondIsToday;
                })
              : rawScheduleItems;
            const upcomingVisits = scheduleItems.filter(
              (item) => !isSchedulePast(item)
            );
            const evaluationNeededItems = scheduleItems.filter(
              (item) => isSchedulePast(item) && !hasEvaluationForAppointment(item)
            );
            const quoteNeededItems = scheduleItems.filter(
              (item) =>
                hasEvaluationForAppointment(item) &&
                !hasQuoteForAppointment(item)
            );
            const scheduledFollowUpItems = scheduleItems.filter((item) => {
              const isUpcoming = upcomingVisits.some(
                (visit) => String(visit.id) === String(item.id)
              );
              const needsEvaluation = evaluationNeededItems.some(
                (visit) => String(visit.id) === String(item.id)
              );
              const needsQuote = quoteNeededItems.some(
                (visit) => String(visit.id) === String(item.id)
              );
              return !isUpcoming && !needsEvaluation && !needsQuote;
            });
            const scheduleGroups = [
              {
                key: "upcoming",
                title: translate("workCenterUpcomingVisits", activeLanguage),
                empty:
                  translate("workCenterNoUpcomingVisits2", activeLanguage),
                items: upcomingVisits,
              },
              {
                key: "evaluation",
                title: translate("workCenterConfirmedVisits", activeLanguage),
                empty:
                  translate("workCenterConfirmedOrPastVisitsWillAppearHere", activeLanguage),
                items: evaluationNeededItems,
              },
              {
                key: "quote",
                title: translate("workCenterVisitFollowUp", activeLanguage),
                empty:
                  translate("workCenterVisitsReadyForTheNextStepWillAppearHere", activeLanguage),
                items: quoteNeededItems,
              },
            ];
            const scheduleNextStepText =
              scheduleItems.length === 0
                ? translate("workCenterAddAVisitToStartSchedulingWork", activeLanguage)
                : upcomingVisits.length > 0
                ? translate("workCenterAttendTheScheduledVisit", activeLanguage)
                : evaluationNeededItems.length > 0
                ? translate("workCenterCaptureEvaluationNotesFromTheVisit", activeLanguage)
                : quoteNeededItems.length > 0
                ? translate("workCenterCreateAQuoteFromTheVisitNotes", activeLanguage)
                : translate("workCenterReviewSavedVisitsOrAddANewVisit", activeLanguage);
            const renderScheduleCard = (item, groupKey) => (
              (() => {
                const linkedQuote = getQuoteForAppointment(item);
                const hasEvaluation = hasEvaluationForAppointment(item);
                const visitDateKey = item.date || "";
                const isTodayOrPastVisit = Boolean(
                  visitDateKey && visitDateKey <= todayKey
                );
                const isWorkSchedule =
                  item.appointmentType === "work_visit" ||
                  item.workflowStage === "work_scheduled" ||
                  item.status === "work_scheduled";
                const primaryAction = "open_visit";
                const customerLabel =
                  item.customerName ||
                  item.homeownerName ||
                  (typeof item.customer === "string"
                    ? item.customer
                    : item.customer?.customerName || item.customer?.name) ||
                  (translate("wcCustomer", activeLanguage));

                return (
              <div key={`${groupKey}-${item.id}`} style={jobCard}>
                <div style={scheduleCardTop}>
                  <div style={scheduleTimeBlock}>
                    <strong>{formatScheduleTime(item.time)}</strong>
                    <span>{item.date || translate("today")}</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{item.title}</strong>
                    <p style={jobMeta}>
                      {customerLabel}
                    </p>
                    {isWorkSchedule && (
                      <p style={jobMeta}>
                        <strong>
                          {translate("myRequestsNextStep", activeLanguage)}:
                        </strong>{" "}
                        {translate("workCenterPerformWork", activeLanguage)}
                      </p>
                    )}
                    <p style={jobMeta}>
                      {item.requestTitle ||
                        item.projectTitle ||
                        item.service ||
                        item.appointmentLabel ||
                        translate("scheduledVisit")}
                    </p>
                    <p style={jobMeta}>
                      {item.location || "Customer location"}
                    </p>

                    {(item.customerPhone || item.customerEmail) && (
                      <p style={jobMeta}>
                        {[item.customerPhone, item.customerEmail]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    )}

                    {item.notes && <p style={jobMeta}>{item.notes}</p>}

                    <div style={scheduleSourceRow}>
                      <span style={sourcePill}>
                        {getScheduleSourceLabel(item)}
                      </span>

                      <span style={item.status === "Completed" ? completedPill : statusPill}>
                        {getScheduleStatusLabel(item.status, item)}
                      </span>
                    </div>

                    {getScheduleReminderLabels(item).length > 0 && (
                      <div style={scheduleReminderRow}>
                        {getScheduleReminderLabels(item).map((label) => (
                          <span key={label} style={scheduleReminderPill}>
                            {label}
                          </span>
                        ))}
                      </div>
                    )}

                    {!isMeetroLinkedSchedule(item) && (
                      <div style={manualScheduleCardNotice}>
                        <div>
                           {translate("manualCustomerWarning", activeLanguage)}
                        </div>

                        <button
                          style={manualScheduleHelpButton}
                          onClick={() => {
                            localStorage.setItem(
                              "selectedManualScheduleCustomer",
                              JSON.stringify(item)
                            );

                            alert(
                              translate("manualCustomerConnectSteps", activeLanguage)
                            );
                          }}
                        >
                          {translate("manualCustomerHowToConnect")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={scheduleCardActions}>
                  {item.conversationId && (
                    <button
                      style={secondaryScheduleBtn}
                      onClick={() => {
                        localStorage.setItem("activeConversationId", item.conversationId);
                        localStorage.setItem("meetroConversationType", "standard");
                        localStorage.setItem("conversationReturnPage", "workCenter");
                        localStorage.setItem("returnPage", "workCenter");
                        localStorage.setItem("conversationReturnSection", "schedule");
                        setPage("conversationThread");
                      }}
                    >
                      {translate("openChat")}
                    </button>
                  )}

                  {getScheduleConfirmationState(item) === "pending" && (
                    <span style={waitingConfirmationPill}>
                      {translate("workCenterWaitingForConfirmation", activeLanguage)}
                    </span>
                  )}

                  {primaryAction === "open_visit" && (
                    <button
                      style={startScheduleBtn}
                      onClick={() =>
                        isWorkSchedule
                          ? openWorkCenterRelationshipConversation(item, "schedule") ||
                            openWorkTab("active")
                          : openVisitDetail(item)
                      }
                    >
                      {isWorkSchedule
                        ? translate("openActiveWorkAction", activeLanguage)
                        : translate("viewVisit", activeLanguage)}
                    </button>
                  )}

                  {linkedQuote && (
                    <button
                      style={secondaryScheduleBtn}
                      onClick={() => setQuoteViewTarget(linkedQuote)}
                    >
                      {translate("assistantActionViewQuote", activeLanguage)}
                    </button>
                  )}

                  <button
                    style={secondaryScheduleBtn}
                    onClick={() => startEditScheduleVisit(item)}
                  >
                    {translate("workCenterEditVisit", activeLanguage)}
                  </button>

                  <button
                    style={deleteScheduleBtn}
                    onClick={() => setScheduleDeleteTarget(item)}
                  >
                    {translate("delete")}
                  </button>
                </div>
              </div>
                );
              })()
            );

            return (
              <>
              {isTodayFilter && rawScheduleItems.length > 0 && (
                <div style={scheduleFilterNotice}>
                  {translate("workCenterTodaysScheduledJobs", activeLanguage)}
                </div>
              )}

              <div style={scheduleNextStepNotice}>
                <strong>
                  {translate("requestGuidanceNextStepLabel", activeLanguage)}:
                </strong>{" "}
                {scheduleNextStepText}
              </div>

              {scheduleItems.length === 0 ? (
              hasScheduleRequestContext ? (
                <div style={jobCard}>
                  <div style={scheduleCardTop}>
                    <div style={scheduleTimeBlock}>
                      <strong></strong>
                      <span>
                        {translate("ready", activeLanguage)}
                      </span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong>
                        {translate("workCenterReadyToSchedule", activeLanguage)}
                      </strong>

                      <p style={jobMeta}>
                        {selectedWorkCenterRequest.title ||
                          selectedWorkCenterRequest.service ||
                          selectedWorkCenterRequest.projectTitle ||
                          (translate("workCenterCustomerRequest", activeLanguage))}
                      </p>

                      <p style={jobMeta}>
                        {selectedWorkCenterRequest.description ||
                          selectedWorkCenterRequest.project_description ||
                          selectedWorkCenterRequest.details ||
                          selectedWorkCenterRequest.notes ||
                          selectedWorkCenterRequest.location ||
                          ""}
                      </p>

                      <div style={scheduleSourceRow}>
                        <span style={sourcePill}>
                          {leadWorkflowIntent === "schedule_before_quote"
                            ? translate("workCenterBeforeQuote", activeLanguage)
                            : translate("workCenterCustomerFlow", activeLanguage)}
                        </span>

                        <span style={statusPill}>
                          {leadWorkflowStage === "customer_contact"
                            ? translate("workCenterCustomerContact", activeLanguage)
                            : translate("teamMemberStatusPending", activeLanguage)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={scheduleCardActions}>
                    <button
                      style={startScheduleBtn}
                      onClick={() => {
                        setScheduleForm({
                          contextSource: "selected_work_center_request",
                          appointmentType: "walkthrough",
                          title:
                            selectedWorkCenterRequest.title ||
                            selectedWorkCenterRequest.service ||
                            selectedWorkCenterRequest.projectTitle ||
                            "",
                          manualCustomerName:
                            selectedWorkCenterRequest.customerName ||
                            selectedWorkCenterRequest.homeownerName ||
                            selectedWorkCenterRequest.customer ||
                            "",
                          manualCustomerPhone:
                            selectedWorkCenterRequest.phone ||
                            selectedWorkCenterRequest.customerPhone ||
                            "",
                          manualCustomerEmail:
                            selectedWorkCenterRequest.email ||
                            selectedWorkCenterRequest.homeowner_email ||
                            selectedWorkCenterRequest.customerEmail ||
                            "",
                          manualCustomerAddress:
                            selectedWorkCenterRequest.location ||
                            selectedWorkCenterRequest.address ||
                            "",
                          date: new Date().toISOString().slice(0, 10),
                          time: "12:00",
                          location: "",
                          notes:
                            selectedWorkCenterRequest.description ||
                            selectedWorkCenterRequest.project_description ||
                            selectedWorkCenterRequest.details ||
                            selectedWorkCenterRequest.notes ||
                            "",
                        });
                        setShowScheduleForm(true);
                      }}
                    >
                      {translate("addVisit", activeLanguage)}
                    </button>

                    <button
                      style={secondaryScheduleBtn}
                      onClick={() => {
                        const conversationId =
                          selectedWorkCenterRequest.conversationId ||
                          selectedWorkCenterRequest.projectConversationId ||
                          selectedWorkCenterRequest.requestId ||
                          selectedWorkCenterRequest.id ||
                          "";

                        if (conversationId) {
                          localStorage.setItem("activeConversationId", conversationId);
                          localStorage.setItem("meetroConversationType", "standard");
                          localStorage.setItem("conversationReturnPage", "workCenter");
                          localStorage.setItem("returnPage", "workCenter");
                          setPage("conversationThread");
                        }
                      }}
                    >
                      {translate("openChat")}
                    </button>

                    <button
                      style={secondaryScheduleBtn}
                      onClick={() => setPage("businessLeads")}
                    >
                      {translate("workCenterBackToLeads", activeLanguage)}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="meetro-visual-empty-state" style={emptyCard}>
                  <div style={emptyIcon}>CAL</div>

                  <strong>
                    {translate("noScheduledVisits", activeLanguage)}
                  </strong>

                  <p style={emptyText}>
                    {translate("scheduledVisitsFromChat", activeLanguage)}
                  </p>
                </div>
              )
            ) : (
              <div style={scheduleWorkflowStack}>
                {scheduleGroups.map((group) => (
                  <div key={group.key} style={scheduleWorkflowSection}>
                    <div style={scheduleWorkflowHeader}>
                      <h3 style={scheduleWorkflowTitle}>{group.title}</h3>
                      <span style={scheduleWorkflowCount}>
                        {group.items.length}
                      </span>
                    </div>

                    {group.items.length > 0 ? (
                      <div style={activeJobsList}>
                        {group.items.map((item) =>
                          renderScheduleCard(item, group.key)
                        )}
                      </div>
                    ) : (
                      <div style={scheduleWorkflowEmpty}>{group.empty}</div>
                    )}
                  </div>
                ))}

                {scheduledFollowUpItems.length > 0 && (
                  <div style={scheduleWorkflowSection}>
                    <div style={scheduleWorkflowHeader}>
                      <h3 style={scheduleWorkflowTitle}>
                        {translate("workCenterScheduledVisitRecords", activeLanguage)}
                      </h3>
                      <span style={scheduleWorkflowCount}>
                        {scheduledFollowUpItems.length}
                      </span>
                    </div>

                    <div style={activeJobsList}>
                      {scheduledFollowUpItems.map((item) =>
                        renderScheduleCard(item, "records")
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
              </>
            );
          })()}

          {visitOutcomeTarget && (
            <div style={confirmOverlay}>
              <div style={confirmCard}>
                <h3>
                  {translate("evaluationOutcomeTitle")}
                </h3>

                <p>
                  {translate("evaluationOutcomeInstruction")}
                </p>

                <div style={visitOutcomeGrid}>
                  <button
                    style={visitOutcomeButton}
                    onClick={() => applyVisitOutcome("quote_required")}
                  >
                     {translate("evaluationQuoteRequired")}
                  </button>

                  <button
                    style={visitOutcomeButton}
                    onClick={() => applyVisitOutcome("start_work_immediately")}
                  >
                     {translate("customerApprovedStartWork")}
                  </button>

                  <button
                    style={visitOutcomeButton}
                    onClick={() => applyVisitOutcome("need_materials")}
                  >
                     {translate("workCenterNeedMaterials", activeLanguage)}
                  </button>

                  <button
                    style={visitOutcomeButton}
                    onClick={() => applyVisitOutcome("waiting_customer_decision")}
                  >
                     {translate("workCenterWaitingCustomerDecision2", activeLanguage)}
                  </button>

                  <button
                    style={visitOutcomeButton}
                    onClick={() => applyVisitOutcome("follow_up_required")}
                  >
                     {translate("workCenterFollowUpRequired2", activeLanguage)}
                  </button>

                  <button
                    style={visitOutcomeButton}
                    onClick={() => applyVisitOutcome("emergency_dispatch")}
                  >
                     {translate("emergencyDispatch", activeLanguage)}
                  </button>

                  <button
                    style={visitOutcomeDangerButton}
                    onClick={() => applyVisitOutcome("not_good_fit")}
                  >
                     {translate("workCenterNotAGoodFit2", activeLanguage)}
                  </button>
                </div>

                <div style={confirmActions}>
                  <button
                    style={secondaryScheduleBtn}
                    onClick={() => setVisitOutcomeTarget(null)}
                  >
                    {translate("cancel")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {scheduleDeleteTarget && (
            <div style={confirmOverlay}>
              <div style={confirmCard}>
                <h3>
                  {translate("deleteVisit")}
                </h3>

                <p>
                  {translate("workCenterThisWillRemoveTheVisitFromYourSchedule", activeLanguage)}
                </p>

                <div style={confirmActions}>
                  <button
                    style={secondaryScheduleBtn}
                    onClick={() => setScheduleDeleteTarget(null)}
                  >
                    {translate("cancel")}
                  </button>

                  <button
                    style={deleteScheduleBtn}
                    onClick={confirmDeleteScheduleVisit}
                  >
                    {translate("delete")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "pending" && (
      <div style={section}>
        <div ref={dynamicSectionRef} style={opportunitiesCompactHeader}>
          <button
            style={workCenterBackButton}
            onClick={returnToWorkCenterDashboard}
          >
            <span aria-hidden="true">‹</span>
            {translate("backToWorkCenter")}
          </button>
          <h2 style={opportunitiesCompactTitle}>
            {translate("workCenterOpportunitiesTitle")}
          </h2>
          <p style={opportunitiesCompactSummary}>
            {opportunitiesCount > 0
              ? `${opportunitiesCount} ${
                  opportunitiesCount === 1
                    ? translate("newOpportunity")
                    : translate("newOpportunities")
                } • ${translate("awaitingReview")}`
              : translate("noNewOpportunities")}
          </p>
        </div>

        {(() => {
          const pendingWorkStatus = localStorage.getItem("pendingWorkStatus") || "";
          const pendingWorkService = localStorage.getItem("pendingWorkService") || "";
          const pendingWorkLocation = localStorage.getItem("pendingWorkLocation") || "";
          const pendingWorkConversationId = localStorage.getItem("pendingWorkConversationId") || "";
          const pendingWorkReason = localStorage.getItem("pendingWorkReason") || "";

          if (!pendingWorkStatus) return null;

          return (
            <div style={pendingReviewCard}>
              <div style={pendingReviewTop}>
                <div style={pendingReviewIcon}>REV</div>

                <div>
                  <strong style={pendingReviewTitle}>
                    {translate("pendingOperationalReview", activeLanguage)}
                  </strong>

                  <p style={pendingReviewMeta}>
                    {pendingWorkService || (translate("workCenterScheduledJob", activeLanguage))}
                  </p>

                  {pendingWorkLocation && (
                    <p style={pendingReviewLocation}>
                       {pendingWorkLocation}
                    </p>
                  )}
                </div>
              </div>

              <div style={pendingReviewNotice}>
                {translate("pendingDecisionWarning")}
              </div>

              <div style={pendingReviewActions}>
                {pendingWorkConversationId && (
                  <button
                    style={pendingSecondaryButton}
                    onClick={() => {
                      localStorage.setItem("activeConversationId", pendingWorkConversationId);
                      localStorage.setItem("meetroConversationType", "standard");
                      setPage("conversationThread");
                    }}
                  >
                     {translate("assistantActionOpenConversation", activeLanguage)}
                  </button>
                )}

                <button
                  style={pendingSecondaryButton}
                  onClick={() => {
                    localStorage.setItem("meetroCommandTool", "quotes");
                    openWorkTab("quotes");
                  }}
                >
                   {translate("quoteAfterEvaluation")}
                </button>

                <button
                  style={pendingPrimaryButton}
                  onClick={() => {
                    localStorage.setItem("activeWorkStatus", "started");
                    localStorage.setItem("activeWorkType", localStorage.getItem("pendingWorkType") || "scheduled");
                    localStorage.setItem("activeWorkSource", localStorage.getItem("pendingWorkSource") || "pending");
                    const pendingProjectId =
                      localStorage.getItem("pendingWorkRequestId") ||
                      localStorage.getItem("pendingWorkScheduleId") ||
                      pendingWorkConversationId ||
                      `pending-${Date.now()}`;

                    saveActiveWorkSnapshot({
                      requestId: pendingProjectId,
                      conversationId: pendingWorkConversationId,
                      status: "started",
                      service: pendingWorkService,
                      location: pendingWorkLocation,
                      type: localStorage.getItem("pendingWorkType") || "scheduled",
                      source: localStorage.getItem("pendingWorkSource") || "pending",
                    });

                    localStorage.setItem("activeWorkService", pendingWorkService);
                    localStorage.setItem("activeWorkLocation", pendingWorkLocation);
                    localStorage.setItem("activeWorkConversationId", pendingWorkConversationId);
                    localStorage.setItem("activeWorkRequestId", pendingProjectId);
                    localStorage.setItem("activeWorkType", localStorage.getItem("pendingWorkType") || "scheduled");
                    localStorage.setItem("activeWorkSource", localStorage.getItem("pendingWorkSource") || "pending");
                    saveActiveJobSnapshot({
                      id: pendingProjectId,
                      jobId: pendingProjectId,
                      conversationId: pendingWorkConversationId,
                      service: pendingWorkService,
                      location: pendingWorkLocation,
                      status: "started",
                    });

                    localStorage.setItem("activeJobService", pendingWorkService);
                    localStorage.setItem("activeJobLocation", pendingWorkLocation);
                    localStorage.setItem("activeJobStatus", "started");

                    localStorage.removeItem("pendingWorkStatus");
                    localStorage.removeItem("pendingWorkReason");

                    openWorkTab("active");
                    setRefreshKey((prev) => prev + 1);
                  }}
                >
                   {translate("moveToActiveJob")}
                </button>
              </div>
            </div>
          );
        })()}

        {!hasPendingRequest &&
        pendingProjectRequests.length === 0 &&
        !localStorage.getItem("pendingWorkStatus") ? (
          <div className="meetro-visual-empty-state" style={emptyCard}>
            <div style={emptyIcon}>LEAD</div>

            <strong>
              {translate("workCenterNoPendingRequestsRightNow", activeLanguage)}
            </strong>

            <p style={emptyText}>
              {translate("workCenterWhileYouWaitKeepYourBusinessReadyForTheNextJob", activeLanguage)}
            </p>

            <div style={emptyActionGrid}>
              <button
                style={emptyActionButton}
                onClick={() => setPage("businessLeads")}
              >
                 {translate("workCenterViewLeads", activeLanguage)}
              </button>

              <button
                style={emptyActionButton}
                onClick={() => setPage("contractorProfile")}
              >
                 {translate("workCenterEmergencySettings", activeLanguage)}
              </button>
            </div>
          </div>
        ) : (
          <div style={activeJobList}>
            {pendingProjectRequests.map((request) => {
              const requestId = request.requestId || request.id;
              const title =
                request.title ||
                request.projectTitle ||
                request.category ||
                (translate("homeServiceRequest", activeLanguage));
              const details =
                request.description ||
                request.details ||
                request.notes ||
                (translate("workCenterReviewTheDetailsBeforeResponding", activeLanguage));

              return (
                <div
                  key={requestId || title}
                  style={{ ...requestCard, ...requestCardOpportunityAlert }}
                >
                  <div style={requestTop}>
                    <div style={requestIcon}>
                      <MeetroIcon name="opportunities" size={24} decorative />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={requestTitle}>{title}</strong>
                      <p style={requestLocation}>
                        {request.location ||
                          request.fullAddress ||
                          request.city ||
                          (translate("workCenterLocalArea", activeLanguage))}
                      </p>

                      <div style={requestMeta}>
                        <span style={opportunityStatusChip}>
                          <span style={opportunityStatusDot} aria-hidden="true" />
                          {translate("newOpportunity")}
                        </span>
                        <span style={requestServiceMeta}>
                          {request.category ||
                            request.requestCategory ||
                            (translate("service", activeLanguage))}
                        </span>
                      </div>

                      <div style={requestTimer}>{details}</div>
                    </div>
                  </div>

                  <div style={{ ...buttonGrid, gridTemplateColumns: "1fr" }}>
                    <button
                      style={acceptButton}
                      onClick={() => openBusinessLeadOpportunityDetail(request)}
                    >
                      {translate("viewOpportunity")}
                    </button>
                  </div>
                </div>
              );
            })}

            {hasPendingRequest && (
              <div style={requestCard}>
                <div style={liveBadge}>
                  {translate("workCenterLiveEmergencyRequest", activeLanguage)}
                </div>

                <div style={requestTop}>
                  <div style={emergencyBadge}></div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={requestTitle}>{selectedService === "Emergency Plumbing" ? translate("emergencyPlumbing") : selectedService}</strong>
                    <p style={requestLocation}>{t.location}</p>

                    <div style={requestMeta}>
                      <span> {getStatusLabel()}</span>
                      <span>•</span>
                      <span> {t.homeowner}</span>
                    </div>

                    <div style={requestTimer}>
                       {translate("workCenterRecommendedResponseUnder2Min", activeLanguage)}
                    </div>
                  </div>
                </div>

                <div style={buttonGrid}>
                  <button style={acceptButton} onClick={acceptEmergencyRequest}>
                    {translate("openEmergencyChat")}
                  </button>

                  <button style={declineButton} onClick={declineEmergencyRequest}>
                    {t.decline}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {activeTab === "active" && (
        <div style={section}>
          <button
            style={workCenterBackButton}
            onClick={returnToWorkCenterDashboard}
          >
            <span aria-hidden="true">‹</span>
            {translate("backToWorkCenter")}
          </button>

          <div style={workCenterChildHeader}>
              <h2 style={workCenterChildTitle}>
                {ui("workCenterActiveWorkTitle")}
              </h2>
              <p style={workCenterChildSummary}>
                {activeJobs.length > 0
                  ? `${activeJobs.length} ${ui("workCenterChildActiveSummary")}`
                  : ui("workCenterChildActiveEmptySummary")}
              </p>
          </div>

          {(() => {
            const homeownerProjects = readMeetroArray("homeownerRequests");

            const scheduledProjects = homeownerProjects
              .filter((project) =>
                ["accepted", "scheduled", "active"].includes(project.status)
              )
              .map((project) => ({
                id: project.requestId || project.id,
                service: project.title || project.category || "Home Project",
                customer: project.homeownerName || "Homeowner",
                eta: project.status === "scheduled" ? translate("scheduled") : translate("acceptedShort"),
                status: project.status,
                source: "homeownerProject",
                project,
              }));

            const combinedActiveJobs = [
              ...scheduledProjects.filter(
                (job) => job.status !== "completed"
              ),
              ...activeJobs.filter(
                (job) =>
                  job.status !== "completed" &&
                  job.status !== "cancelled" &&
                  job.status !== "canceled" &&
                  Boolean(job.service)
              ),
            ];

            const pendingChangeOrders = homeownerProjects.flatMap((project) =>
              (project.changeOrders || [])
                .filter(
                  (order) =>
                    order.status === "pending_professional_review"
                )
                .map((order) => ({
                  ...order,
                  project,
                }))
            );

            const getActiveWorkCardStatus = (job = {}) => {
              const syncedJobStatus =
                job.source === "homeownerProject"
                  ? localStorage.getItem("activeWorkStatus") ||
                    localStorage.getItem("activeJobStatus") ||
                    job.status
                  : job.status;

              return syncedJobStatus === "working"
                ? "started"
                : syncedJobStatus === "on_the_way"
                ? "enroute"
                : syncedJobStatus;
            };

            const visibleCombinedActiveJobs = combinedActiveJobs.filter((job) => {
              if (activeWorkFilter === "all") return true;
              const status = String(getActiveWorkCardStatus(job) || "").toLowerCase();
              if (activeWorkFilter === "on_site") {
                return ["arrived", "started", "working", "in_progress"].some((token) =>
                  status.includes(token)
                );
              }
              if (activeWorkFilter === "in_progress") {
                return ["started", "working", "in_progress", "active"].some((token) =>
                  status.includes(token)
                );
              }
              return true;
            });

            const universalActiveWork = {
              status: activeWorkSnapshot?.status || localStorage.getItem("activeWorkStatus") || "",
              type: activeWorkSnapshot?.type || localStorage.getItem("activeWorkType") || "",
              service: activeWorkSnapshot?.service || localStorage.getItem("activeWorkService") || "",
              location: activeWorkSnapshot?.location || localStorage.getItem("activeWorkLocation") || "",
              conversationId:
                activeWorkSnapshot?.conversationId ||
                localStorage.getItem("activeWorkConversationId") || "",
              stage:
                localStorage.getItem("activeWorkStage") || "working",
            };

            const universalActiveWorkVisible =
              !hasActiveEmergency &&
              universalActiveWork.status &&
              !["completed", "cancelled", "canceled", "closed"].includes(
                String(universalActiveWork.status || "").toLowerCase()
              ) &&
              (universalActiveWork.service || universalActiveWork.location);

            const activeWorkMatchesFilter = (job) => {
              if (activeWorkFilter === "all") return true;
              const status = String(getActiveWorkCardStatus(job) || "").toLowerCase();
              if (activeWorkFilter === "on_site") {
                return ["arrived", "started", "working", "in_progress"].some((token) =>
                  status.includes(token)
                );
              }
              if (activeWorkFilter === "in_progress") {
                return ["started", "working", "in_progress", "active"].some((token) =>
                  status.includes(token)
                );
              }
              return true;
            };

            const universalActiveWorkCountsAsInProgress = Boolean(universalActiveWorkVisible);
            const activeWorkFilterOptions = [
              {
                key: "all",
                label: ui("wcFilterAll"),
                count: combinedActiveJobs.length + (universalActiveWorkVisible ? 1 : 0),
              },
              {
                key: "on_site",
                label: ui("wcFilterOnSite"),
                count:
                  combinedActiveJobs.filter((job) => {
                    const status = String(getActiveWorkCardStatus(job) || "").toLowerCase();
                    return ["arrived", "started", "working", "in_progress"].some((token) =>
                      status.includes(token)
                    );
                  }).length + (universalActiveWorkCountsAsInProgress ? 1 : 0),
              },
              {
                key: "in_progress",
                label: ui("wcFilterInProgress"),
                count:
                  combinedActiveJobs.filter((job) => {
                    const status = String(getActiveWorkCardStatus(job) || "").toLowerCase();
                    return ["started", "working", "in_progress", "active"].some((token) =>
                      status.includes(token)
                    );
                  }).length + (universalActiveWorkCountsAsInProgress ? 1 : 0),
              },
            ];

            return combinedActiveJobs.length === 0 &&
              (!universalActiveWork.status ||
                universalActiveWork.status === "completed") ? (
            <div className="meetro-visual-empty-state" style={emptyCard}>
              <div style={emptyIcon}>JOB</div>

              <strong>
                {ui("wcNoActiveWorkTitle")}
              </strong>

              <p style={emptyText}>
                {ui("wcNoActiveWorkText")}
              </p>

              <div style={emptyActionGrid}>
                <button
                  style={emptyActionButton}
                  onClick={() => openWorkTab("pending")}
                >
                   {ui("wcCheckPending")}
                </button>

                <button
                  style={emptyActionButton}
                  onClick={() => setPage("businessLeads")}
                >
                   {ui("wcFindLeads")}
                </button>
              </div>
            </div>
          ) : (
            <div style={activeJobList}>
              <div style={activeWorkFilterRow} aria-label={ui("wcActiveWorkFilters")}>
                {activeWorkFilterOptions.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    style={{
                      ...activeWorkFilterChip,
                      ...(activeWorkFilter === filter.key ? activeWorkFilterChipActive : {}),
                    }}
                    onClick={() => setActiveWorkFilter(filter.key)}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>

              {pendingChangeOrders.length > 0 && (
                <div style={changeOrderAlertWrap}>
                  {pendingChangeOrders.map((order) => (
                    <div key={order.id} style={changeOrderAlertCard}>
                      <div style={changeOrderAlertTop}>
                        <div>
                          <span style={changeOrderBadge}>
                             {translate("workCenterChangeOrderRequested", activeLanguage)}
                          </span>

                          <h3 style={changeOrderTitle}>
                            {order.projectTitle}
                          </h3>

                          <p style={changeOrderCustomer}>
                            {order.project?.homeownerName ||
                              (translate("wcCustomer", activeLanguage))}
                          </p>
                        </div>

                        <div
                          style={
                            order.urgency === "urgent"
                              ? urgentChangeBadge
                              : normalChangeBadge
                          }
                        >
                          {order.urgency === "urgent"
                            ? translate("homeUrgent", activeLanguage)
                            : translate("messagesPriorityNormal", activeLanguage)}
                        </div>
                      </div>

                      <div style={changeOrderMessageBox}>
                        {order.message}
                      </div>

                      <div style={changeOrderNotice}>
                         {translate("workCenterProjectMayRequireRevisedPricingAndTimeline", activeLanguage)}
                      </div>

                      <div style={changeOrderActions}>
                        <button
                          style={reviewChangeButton}
                          onClick={() => {
                            localStorage.setItem(
                              "selectedProfessionalChangeOrder",
                              JSON.stringify(order)
                            );

                            setPage("quoteBuilder");
                          }}
                        >
                           {translate("workCenterReviewChange", activeLanguage)}
                        </button>

                        <button
                          style={messageCustomerButton}
                          onClick={() => {
                            const conversationId =
                              order.project?.conversationId ||
                              order.project?.projectConversationId ||
                              order.project?.activeConversationId ||
                              order.conversationId ||
                              `project-${order.requestId}`;

                            localStorage.setItem(
                              "activeConversationId",
                              conversationId
                            );

                            localStorage.setItem(
                              "meetroConversationType",
                              "standard"
                            );

                            localStorage.setItem(
                              "activeConversationName",
                              order.project?.homeownerName ||
                                order.homeownerName ||
                                "Customer"
                            );

                            localStorage.setItem(
                              "conversationBusinessName",
                              order.projectTitle || "Service Change"
                            );

                            setPage("conversationThread");
                          }}
                        >
                           {translate("relationshipMessage", activeLanguage)}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!hasActiveEmergency &&
                universalActiveWork.status &&
                !["completed", "cancelled", "canceled", "closed"].includes(
                  String(universalActiveWork.status || "").toLowerCase()
                ) &&
                (universalActiveWork.service || universalActiveWork.location) && (
                <div style={activeJobPanel}>
                  {renderWorkflowDependencyBanner(universalActiveWork)}
                  <div style={activeJobTop}>
                    <div>
                      <span
                        style={
                          universalActiveWork.type === "scheduled"
                            ? scheduledJobBadge
                            : activeJobBadge
                        }
                      >
                        {translate("scheduledWork", activeLanguage)}
                      </span>

                      <h3 style={activeJobTitle}>
                        {universalActiveWork.service || translate("activeWorkFallback")}
                      </h3>

                      <p style={activeJobSub}>
                        {universalActiveWork.location ||
                          translate("locationPending", activeLanguage)}
                      </p>

                      <div style={jobActivityNote}>
                        {getWorkflowActivityNote(universalActiveWork.stage || "working")}
                      </div>
                    </div>

                    <div style={activeEtaBox}>
                      <strong>
                        {translate("homeMyProjectsActive", activeLanguage)}
                      </strong>

                      <span>
                        {getWorkflowStageLabel(universalActiveWork.stage || "working")}
                      </span>
                    </div>
                  </div>

                  <div style={activeWorkflowGuide}>
                    <strong style={activeWorkflowGuideTitle}>
                      {translate("currentStatus")}
                    </strong>

                    <p style={activeWorkflowGuideText}>
                      {universalActiveWork.stage === "onTheWay"
                        ? translate("nextStepArrive")
                        : universalActiveWork.stage === "arrived"
                        ? translate("nextStepBeginWork")
                        : universalActiveWork.stage === "pausedMaterials"
                        ? translate("nextStepResumeMaterials")
                        : universalActiveWork.stage === "working"
                        ? translate("nextStepContinueWork")
                        : translate("nextStepUpdateStatus")}
                    </p>
                  </div>

                  <div style={stageActions}>
                    <button
                      style={{
                        ...stageButton,
                        ...(universalActiveWork.stage === "on_the_way"
                          ? activeStageButton
                          : {}),
                      }}
                      onClick={() => {
                        requestWorkflowDependencyAdvance(universalActiveWork, "on_the_way", () => {
                          saveActiveWorkSnapshot({
                            stage: "on_the_way",
                            status: "on_the_way",
                          });

                          localStorage.setItem("activeWorkStage", "on_the_way");
                          localStorage.setItem("activeWorkStatus", "on_the_way");
                          localStorage.setItem("activeJobStatus", "on_the_way");
                          localStorage.removeItem("activeWorkPauseReason");
                          setRefreshKey((prev) => prev + 1);
                        });
                      }}
                    >
                       {getWorkflowStageLabel("on_the_way")}
                    </button>

                    {universalActiveWork.stage === "pausedMaterials" && (
                      <button
                        style={resumeWorkButton}
                        onClick={() => {
                          saveActiveWorkSnapshot({
                            stage: "working",
                          });

                          localStorage.setItem(
                            "activeWorkStage",
                            "working"
                          );

                          localStorage.removeItem(
                            "activeWorkPauseReason"
                          );

                          setRefreshKey((prev) => prev + 1);
                        }}
                      >
                         {translate("resumeWork")}
                      </button>
                    )}

                    <button
                      style={{
                        ...stageButton,
                        ...(universalActiveWork.stage === "arrived"
                          ? activeStageButton
                          : {}),
                      }}
                      onClick={() => {
                        requestWorkflowDependencyAdvance(universalActiveWork, "arrived", () => {
                          saveActiveWorkSnapshot({
                            stage: "arrived",
                          });

                          localStorage.setItem("activeWorkStage", "arrived");
                          localStorage.setItem("activeWorkStatus", "arrived");
                          localStorage.setItem("activeJobStatus", "arrived");
                          localStorage.removeItem("activeWorkPauseReason");
                          setRefreshKey((prev) => prev + 1);
                        });
                      }}
                    >
                       {getWorkflowStageLabel("arrived")}
                    </button>

                    <button
                      style={{
                        ...stageButton,
                        ...(universalActiveWork.stage === "working"
                          ? activeStageButton
                          : {}),
                      }}
                      onClick={() => {
                        requestWorkflowDependencyAdvance(universalActiveWork, "start_work", () => {
                          saveActiveWorkSnapshot({
                            stage: "working",
                          });

                          localStorage.setItem("activeWorkStage", "working");
                            localStorage.setItem("activeWorkStatus", "working");
                            localStorage.setItem("activeJobStatus", "working");
                          localStorage.removeItem("activeWorkPauseReason");
                          setRefreshKey((prev) => prev + 1);
                        });
                      }}
                    >
                       {getWorkflowStageLabel("working")}
                    </button>

                    <button
                      style={{
                        ...stageButton,
                        ...(universalActiveWork.stage === "pausedMaterials"
                          ? pausedStageButton
                          : {}),
                      }}
                      onClick={() => {
                        saveActiveWorkSnapshot({
                          stage: "pausedMaterials",
                          pauseReason: "materials",
                        });

                        localStorage.setItem("activeWorkStage", "pausedMaterials");
                        localStorage.setItem("activeWorkPauseReason", "materials");
                        setRefreshKey((prev) => prev + 1);
                      }}
                    >
                       {translate("pauseForMaterials")}
                    </button>
                  </div>

                  <div style={jobActions}>
                    <button
                      style={secondaryActionButton}
                      onClick={() => openWorkTab("materials")}
                    >
                       {translate("workTabMaterials")}
                    </button>

                    {universalActiveWork.conversationId && (
                      <button
                        style={dispatchButton}
                        onClick={() => {
                          localStorage.setItem(
                            "activeConversationId",
                            universalActiveWork.conversationId
                          );

                          localStorage.setItem(
                            "meetroConversationType",
                            "standard"
                          );

                          setPage("conversationThread");
                        }}
                      >
                         {translate("openChat", activeLanguage)}
                      </button>
                    )}

                    <button
                      style={completeButton}
                      onClick={() => setPage("completionSheet")}
                    >
                       {translate("lifecycleDashboardActionUnavailable", activeLanguage)}
                    </button>
                  </div>
                </div>
              )}

              {visibleCombinedActiveJobs.length === 0 && activeWorkFilter !== "all" && (
                <div className="meetro-visual-empty-state" style={jobListEmpty}>
                  {ui("wcNoActiveWorkFilter")}
                </div>
              )}

              {visibleCombinedActiveJobs.map((job) => {
                const normalizedSyncedStatus = getActiveWorkCardStatus(job);
                const activeWorkTitle =
                  job.service === "Emergency Plumbing"
                    ? translate("emergencyPlumbing")
                    : job.service || ui("wcProject");
                const activeWorkCustomer =
                  job.customer || ui("wcCustomer");
                const activeWorkStatusLabel = getWorkflowStageLabel(
                  normalizedSyncedStatus || "active"
                );
                const activeWorkTask = getActiveJobOperationalNextAction(
                  normalizedSyncedStatus
                );
                const activeWorkIsOnSite = ["arrived", "started", "working", "in_progress"].some(
                  (token) => String(normalizedSyncedStatus || "").toLowerCase().includes(token)
                );
                const activeWorkLocationState = activeWorkIsOnSite
                  ? ui("wcFilterOnSite")
                  : activeWorkStatusLabel;
                const activeWorkStartTime =
                  job.project?.scheduledTime ||
                  job.project?.time ||
                  job.time ||
                  job.startTime ||
                  job.eta ||
                  "";
                const activeWorkStartLabel = activeWorkStartTime
                  ? String(activeWorkStartTime).toLowerCase().includes("min")
                    ? activeWorkStartTime
                    : formatScheduleTime(activeWorkStartTime)
                  : ui("wcStartPending");
                const activeWorkWorkflow = getActiveWorkWorkflowPresentation({
                  ...job,
                  status: normalizedSyncedStatus,
                });
                const activeWorkAttemptedAction = activeWorkIsOnSite
                  ? "complete_work"
                  : "start_work";

                return (
                <div style={activeJobPanel} key={job.id}>
                  {renderWorkflowDependencyBanner(job)}
                  <div style={activeWorkCardTop}>
                    <div style={activeWorkCardIdentity}>
                      <h3 style={activeJobTitle}>{activeWorkTitle}</h3>
                      <p style={activeJobSub}>{activeWorkCustomer}</p>
                    </div>

                    <button
                      type="button"
                      aria-label={ui("wcViewProjectAria")}
                      style={quoteChevronButton}
                      onClick={() => openActiveWorkProject(job)}
                    >
                      ›
                    </button>
                  </div>

                  <div style={workflowCardSummary}>
                    <div style={workflowSummaryItem}>
                      <span style={workflowSummaryLabel}>
                        {ui("wcCurrentStatus")}
                      </span>
                      <strong style={workflowSummaryValue}>
                        {activeWorkWorkflow.statusLabel}
                      </strong>
                    </div>
                    <div style={workflowSummaryItem}>
                      <span style={workflowSummaryLabel}>
                        {ui("wcNextStep")}
                      </span>
                      <strong style={workflowSummaryValue}>
                        {activeWorkWorkflow.nextStep}
                      </strong>
                    </div>
                    <button
                      type="button"
                      style={workflowPrimaryActionButton}
                      onClick={() =>
                        requestWorkflowDependencyAdvance(
                          job,
                          activeWorkAttemptedAction,
                          activeWorkWorkflow.onAction
                        )
                      }
                    >
                      {activeWorkWorkflow.actionLabel}
                    </button>
                  </div>

                  <div style={activeWorkDivider} />

                  <div style={activeWorkFooterRow}>
                    <span>
                      {ui("wcStart")} {activeWorkStartLabel}
                    </span>
                    <button
                      type="button"
                      style={quoteInlineDetailsButton}
                      onClick={() => openActiveWorkProject(job)}
                    >
                      {ui("wcViewProject")}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          );
          })()}
        </div>
      )}

      {activeTab === "completed" && (
        <div style={closureCenterSection}>
          <button
            style={workCenterBackButton}
            onClick={returnToWorkCenterDashboard}
          >
            <span aria-hidden="true">‹</span>
            {translate("backToWorkCenter")}
          </button>

          <div style={workCenterChildHeader}>
            <h2 style={workCenterChildTitle}>
              {translate("closureCenterTitle")}
            </h2>
            <p style={workCenterChildSummary}>
              {closureReviews.length > 0
                ? `${closureReviews.length} ${translate("closureCenterReviewTitle")}`
                : translate("closureCenterNoRecords")}
            </p>
          </div>

          {isPropertyManagementBusiness && (
            <div style={propertyManagementClosureFoundationNote}>
              {translate("propertyManagementClosureNote")}
            </div>
          )}

          <div style={closureStatusGrid}>
            {closureStatusKeys.map((statusKey) => (
              <div style={closureStatusSummaryCard} key={statusKey}>
                <strong style={closureStatusSummaryCount}>
                  {closureStatusCounts[statusKey] || 0}
                </strong>
                <span style={closureStatusSummaryLabel}>
                  {translate(statusKey)}
                </span>
              </div>
            ))}
          </div>

          <div style={closureReviewHeader}>
            <h2 style={sectionTitle}>
              {translate("closureCenterReviewTitle")}
            </h2>
            <p style={closureReviewDescription}>
              {translate("closureCenterReviewDescription")}
            </p>
          </div>

          <p role="status" style={lifecycleHistoryNotice}>
            {translate("lifecycleLegacyHistoryNotice", activeLanguage)}
          </p>

          <div style={closureReviewList}>
            {closureReviews.length === 0 ? (
              <div className="meetro-visual-empty-state" style={emptyCard}>
                <div style={emptyIcon}>OK</div>

                <strong>
                  {translate("closureCenterNoRecords")}
                </strong>
              </div>
            ) : (
              closureReviews.map((review, index) => {
                const { project } = review;
                const completedDate = project.completedAt
                  ? new Date(project.completedAt)
                  : null;

                return (
                  <div
                    style={closureProjectCard}
                    key={project.id || project.completionId || project.requestId || index}
                  >
                    <div style={closureProjectHeader}>
                      <div style={closureProjectIdentity}>
                        <span style={closureProjectIcon}>✓</span>
                        <div>
                          <strong style={closureProjectTitle}>
                            {project.title ||
                              project.service ||
                              (translate("homeHistoryEyebrow", activeLanguage))}
                          </strong>
                          <span style={closureProjectMeta}>
                            {project.customer ||
                              project.homeownerName ||
                              project.username ||
                              (translate("wcCustomer", activeLanguage))}
                            {completedDate
                              ? ` · ${completedDate.toLocaleDateString()}`
                              : ""}
                          </span>
                        </div>
                      </div>
                      <span
                        style={{
                          ...closureStatusBadge,
                          ...(review.statusKey === "closureStatusClosed"
                            ? closureStatusBadgeClosed
                            : review.statusKey === "closureStatusReady"
                            ? closureStatusBadgeReady
                            : closureStatusBadgePending),
                        }}
                      >
                        {translate(review.statusKey)}
                      </span>
                    </div>

                    <div style={closureCategoryGrid}>
                      {review.categories.map((category) => (
                        <div style={closureCategoryCard} key={category.key}>
                          <span style={closureCategoryIcon}>
                            <MeetroIcon name={category.icon} size={18} decorative />
                          </span>
                          <div style={closureCategoryContent}>
                            <strong style={closureCategoryTitle}>
                              {category.title}
                            </strong>
                            <span style={closureCategoryDescription}>
                              {category.description}
                            </span>
                          </div>
                          <span
                            style={
                              category.resolved
                                ? closureCategoryResolved
                                : closureCategoryPending
                            }
                          >
                            {category.resolved
                              ? translate("closureCenterEvidenceAvailable")
                              : translate("closureCenterNeedsReview")}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      style={closureOpenRecordButton}
                      onClick={() => setPage("completedJobDetails")}
                    >
                      {translate("closureCenterOpenRecord")}
                      <span aria-hidden="true">›</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === "quotes" && (
        <div style={section}>
          <button
            style={workCenterBackButton}
            onClick={returnToWorkCenterDashboard}
          >
            <span aria-hidden="true">‹</span>
            {translate("backToWorkCenter")}
          </button>

          <div style={workCenterChildHeader}>
              <h2 style={workCenterChildTitle}>
                {ui("workCenterQuotesTitle")}
              </h2>
              <p style={workCenterChildSummary}>
                {quoteHistory.length > 0
                  ? `${quoteHistory.length} ${ui("workCenterChildQuotesSummary")}`
                  : ui("workCenterChildQuotesEmptySummary")}
              </p>
          </div>

          <div style={quoteStatusFilterRow} aria-label={ui("wcQuoteFilters")}>
            {quoteFilterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setQuoteStatusFilter(tab.key)}
                style={{
                  ...quoteStatusFilterButton,
                  ...(quoteStatusFilter === tab.key
                    ? quoteStatusFilterButtonActive
                    : {}),
                }}
              >
                {tab.label} ({quoteFilterCounts[tab.key] || 0})
              </button>
            ))}
          </div>

          {filteredQuoteHistory.length === 0 ? (
            <div className="meetro-visual-empty-state" style={emptyCard}>
              <div style={emptyIcon}>QUOTE</div>

              <strong>
                {ui("wcNoQuotesTitle")}
              </strong>

              <p style={emptyText}>
                {ui("wcNoQuotesText")}
              </p>

              <div style={emptyActionGrid}>
                <button
                  style={emptyActionButton}
                  onClick={() => setPage("businessLeads")}
                >
                   {ui("wcViewLeads")}
                </button>

                <button
                  style={emptyActionButton}
                  onClick={() => {
                    localStorage.removeItem("selectedQuoteForEdit");
                    localStorage.removeItem("lastManualQuoteNumber");
                    localStorage.setItem("quoteBuilderReturnPage", "workCenter");
                    localStorage.setItem("meetroWorkCenterTab", "quotes");
                    localStorage.setItem("activeWorkCenterTab", "quotes");
                    setPage("quoteBuilder");
                  }}
                >
                   {translate("quoteAfterEvaluation")}
                </button>
              </div>
            </div>
          ) : (
            <div style={quoteHistoryList}>
              {filteredQuoteHistory.map((quote) => {
                const quoteWorkflow = getQuoteWorkflowPresentation(quote);

                return (
                <div style={quoteHistoryCard} key={quote.quoteId}>
                  <div style={quoteHistoryTop}>
                    <div style={quoteCardIdentity}>
                      <h3 style={quoteHistoryTitle}>
                        {quote.projectTitle ||
                          ui("wcProject")}
                      </h3>

                      <p style={quoteHistoryMeta}>
                        {quote.homeownerName ||
                          ui("wcHomeowner")}
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label={ui("wcViewQuoteDetailsAria")}
                      style={quoteChevronButton}
                      onClick={() => setQuoteViewTarget(quote)}
                    >
                      ›
                    </button>
                  </div>

                  <div style={quoteCardAmountRow}>
                    <strong style={quoteAmount}>
                      {formatQuoteCurrency(getQuoteTotalAmount(quote))}
                    </strong>
                    <span
                      style={{
                        ...quoteLifecycleBadge,
                        ...(normalizeQuoteStatus(quote) === "accepted" || normalizeQuoteStatus(quote) === "approved"
                          ? quoteLifecycleBadgeAccepted
                          : {}),
                        ...(normalizeQuoteStatus(quote) === "revision_requested"
                          ? quoteLifecycleBadgeRevision
                          : {}),
                        ...(normalizeQuoteStatus(quote) === "declined"
                          ? quoteLifecycleBadgeDeclined
                          : {}),
                        ...(normalizeQuoteStatus(quote) === "converted_to_job"
                          ? quoteLifecycleBadgeActive
                          : {}),
                        ...(normalizeQuoteStatus(quote) === "completed"
                          ? quoteLifecycleBadgeCompleted
                          : {}),
                      }}
                    >
                      {quoteWorkflow.statusLabel}
                    </span>
                  </div>

                  <div style={workflowCardSummary}>
                    <div style={workflowSummaryItem}>
                      <span style={workflowSummaryLabel}>
                        {ui("wcCurrentStatus")}
                      </span>
                      <strong style={workflowSummaryValue}>
                        {quoteWorkflow.statusLabel}
                      </strong>
                    </div>
                    <div style={workflowSummaryItem}>
                      <span style={workflowSummaryLabel}>
                        {ui("wcNextStep")}
                      </span>
                      <strong style={workflowSummaryValue}>
                        {quoteWorkflow.nextStep}
                      </strong>
                    </div>
                    <button
                      type="button"
                      style={workflowPrimaryActionButton}
                      onClick={quoteWorkflow.onAction}
                    >
                      {quoteWorkflow.actionLabel}
                    </button>
                  </div>

                  <div style={quoteCardFooterRow}>
                    <span>{getQuoteDisplayTime(quote)}</span>
                    <button
                      type="button"
                      style={quoteInlineDetailsButton}
                      onClick={() => setQuoteViewTarget(quote)}
                    >
                      {ui("wcViewDetails")}
                      <span aria-hidden="true">›</span>
                    </button>
                  </div>

                  {normalizeQuoteStatus(quote) === "accepted" && (
                    <div style={acceptedQuoteAlertCard}>
                      <strong>
                         {translate("myRequestsQuoteAccepted", activeLanguage)}
                      </strong>

                      <p>
                        {translate("workCenterChooseTheNextStepToContinueThisJob", activeLanguage)}
                      </p>

                      <div style={acceptedQuoteNextStepGrid}>
                        <button
                          style={acceptedQuoteSecondaryButton}
                          onClick={() => startScheduleWorkFromQuote(quote)}
                        >
                           {translate("workCenterScheduleTitle", activeLanguage)}
                        </button>

                        <button
                          style={acceptedQuoteSecondaryButton}
                          onClick={() => {
                            const inviteText = translate("workCenterImInvitingYouToContinueThisProjectInMeetroForMessagesScheduling", activeLanguage);

                            if (navigator.share) {
                              navigator.share({
                                title: "Meetro",
                                text: inviteText,
                              });
                            } else {
                              navigator.clipboard?.writeText(inviteText);
                              alert(translate("workCenterInvitationCopied", activeLanguage));
                            }
                          }}
                        >
                           {translate("workCenterInvite", activeLanguage)}
                        </button>
                      </div>

                      <button
                        style={moveToActiveButton}
                        onClick={() => {
                          if (!canReadLegacyWorkflowStorage()) return;
                          const homeownerRequests = JSON.parse(
                            localStorage.getItem("homeownerRequests") || "[]"
                          );

                          const updatedRequests = homeownerRequests.map((project) => {
                            const projectId = project.requestId || project.id;

                            if (String(projectId) !== String(quote.requestId)) {
                              return project;
                            }

                            return {
                              ...project,
                              status: "active",
                              activeStartedAt: new Date().toISOString(),
                              quoteAlertCleared: true,
                            };
                          });

                          localStorage.setItem(
                            "homeownerRequests",
                            JSON.stringify(updatedRequests)
                          );

                          const quoteHistory = JSON.parse(
                            localStorage.getItem("workCenterQuoteHistory") || "[]"
                          );

                          const updatedQuoteHistory = quoteHistory.map((savedQuote) =>
                            String(savedQuote.quoteId) === String(quote.quoteId)
                              ? {
                                  ...savedQuote,
                                  status: "active",
                                  movedToActiveAt: new Date().toISOString(),
                                }
                              : savedQuote
                          );

                          localStorage.setItem(
                            "workCenterQuoteHistory",
                            JSON.stringify(updatedQuoteHistory)
                          );

                          const activeConversationId =
                            quote.conversationId ||
                            quote.projectConversationId ||
                            quote.activeConversationId ||
                            `quote-active-${quote.requestId || quote.quoteId}`;

                          const activeQuoteProjectId =
                            quote.requestId ||
                            quote.projectId ||
                            quote.id ||
                            quote.quoteId ||
                            activeConversationId;

                          localStorage.setItem("activeWorkStatus", "active");
                          localStorage.setItem("activeWorkStage", "working");
                          localStorage.setItem("activeWorkStatus", "working");
                          localStorage.setItem("activeJobStatus", "working");
                          localStorage.setItem("activeWorkType", "quote_approved");
                          localStorage.setItem("activeWorkSource", "quote");
                          localStorage.setItem("activeWorkRequestId", activeQuoteProjectId);
                          localStorage.setItem(
                            "activeWorkService",
                            quote.projectTitle || quote.project_title || "Approved Quote"
                          );
                          localStorage.setItem(
                            "activeWorkLocation",
                            quote.location || ""
                          );
                          localStorage.setItem(
                            "activeWorkConversationId",
                            activeConversationId
                          );
                          localStorage.setItem(
                            "activeWorkQuoteId",
                            quote.quoteId || quote.id || ""
                          );
                          localStorage.setItem(
                            "activeWorkRequestId",
                            quote.requestId || ""
                          );

                          saveActiveWorkSnapshot({
                            requestId: quote.requestId || activeQuoteProjectId,
                            quoteId: quote.quoteId || quote.id || "",
                            conversationId: activeConversationId,
                            status: "active",
                            service: quote.projectTitle || quote.project_title || "Approved Quote",
                            location: quote.location || "",
                            type: "quote_approved",
                            source: "quote",
                          });

                          saveActiveJobSnapshot({
                            id: quote.quoteId || quote.id || quote.requestId || activeConversationId,
                            jobId: quote.quoteId || quote.id || quote.requestId || activeConversationId,
                            conversationId: activeConversationId,
                            service: quote.projectTitle || quote.project_title || "Approved Quote",
                            location: quote.location || "",
                            status: "active",
                            customer:
                              quote.homeownerName ||
                              quote.homeowner_email ||
                              quote.homeownerEmail ||
                              "Customer",
                          });

                          localStorage.setItem(
                            "activeJobService",
                            quote.projectTitle || quote.project_title || "Approved Quote"
                          );
                          localStorage.setItem("activeJobLocation", quote.location || "");
                          localStorage.setItem("activeJobStatus", "active");
                          localStorage.setItem("activeConversationId", activeConversationId);
                          localStorage.setItem(
                            "activeConversationName",
                            quote.homeownerName ||
                              quote.homeowner_email ||
                              quote.homeownerEmail ||
                              "Customer"
                          );

                          window.dispatchEvent(new Event("meetro-active-work-updated"));
                          window.dispatchEvent(new Event("meetroJobRecordUpdated"));
                          window.dispatchEvent(new Event("storage"));

                          localStorage.setItem("meetroWorkCenterTab", "active");
                          localStorage.setItem("activeWorkCenterTab", "active");

                          openWorkTab("active");
                          setRefreshKey((prev) => prev + 1);
                        }}
                      >
                         {translate("workCenterCreateActiveJob", activeLanguage)}
                      </button>
                    </div>
                  )}

                  {quote.status === "revision_requested" && quote.revisionNote && (
                    <div style={revisionRequestCard}>
                      <strong>
                        {translate("workCenterCustomerRequestedChanges", activeLanguage)}
                      </strong>

                      <p>{quote.revisionNote}</p>

                      {quote.revisionRequestedAt && (
                        <small>
                          {formatLocaleDate(
                            quote.revisionRequestedAt,
                            { month: "short", day: "numeric", year: "numeric" },
                            activeLanguage
                          )}
                        </small>
                      )}

                      <button
                        style={reviseQuoteButton}
                        onClick={() => {
                          localStorage.setItem(
                            "selectedWorkCenterRequest",
                            JSON.stringify({
                              requestId: quote.requestId,
                              id: quote.requestId,
                              title: quote.projectTitle,
                              description: quote.revisionNote || quote.notes || "",
                              homeownerName: quote.homeownerName,
                              revisionQuoteId: quote.quoteId,
                              revisionRequested: true,
                              previousQuote: quote,
                            })
                          );

                          localStorage.setItem(
                            "activeWorkCenterQuoteRequestId",
                            quote.requestId || ""
                          );

                          setPage("quoteBuilder");
                        }}
                      >
                        {translate("reviseQuoteAction", activeLanguage)}
                      </button>
                    </div>
                  )}

                  {isExternalQuote(quote) && normalizeQuoteStatus(quote) === "sent" && (
                    <span style={externalQuoteChip}>
                      {translate("workCenterExternalCustomer", activeLanguage)}
                    </span>
                  )}

                  {isExternalQuote(quote) && normalizeQuoteStatus(quote) === "sent" && (
                    <div style={externalQuoteActions}>
                      <button
                        type="button"
                        style={externalAcceptButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          updateQuoteLifecycleStatus(quote.quoteId, "accepted");
                          localStorage.setItem("quoteStatusFilter", "accepted");
                          setQuoteStatusFilter("accepted");

                          window.setTimeout(() => {
                            const target = workCenterPanelRef.current;
                            if (!target) return;

                            const y =
                              target.getBoundingClientRect().top +
                              window.pageYOffset -
                              70;

                            window.scrollTo({
                              top: y,
                              behavior: "smooth",
                            });
                          }, 180);
                        }}
                      >
                         {translate("workCenterCustomerAccepted", activeLanguage)}
                      </button>

                      <button
                        type="button"
                        style={externalRevisionButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          updateQuoteLifecycleStatus(quote.quoteId, "revision_requested");
                        }}
                      >
                         {translate("workCenterNeedsRevision", activeLanguage)}
                      </button>

                      <button
                        type="button"
                        style={externalDeclineButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          updateQuoteLifecycleStatus(quote.quoteId, "declined");
                        }}
                      >
                        ✕ {translate("workCenterCustomerDeclined", activeLanguage)}
                      </button>

                      <button
                        type="button"
                        style={externalInviteButton}
                        onClick={() => {
                          const inviteText = translate("workCenterImInvitingYouToContinueThisProjectInMeetroSoYouCan", activeLanguage);

                          if (navigator.share) {
                            navigator.share({
                              title: "Meetro",
                              text: inviteText,
                            });
                          } else {
                            navigator.clipboard?.writeText(inviteText);
                            alert(translate("workCenterInvitationCopied", activeLanguage));
                          }
                        }}
                      >
                         {translate("messagesInviteToMeetro", activeLanguage)}
                      </button>
                    </div>
                  )}

                  {normalizeQuoteStatus(quote) === "accepted" && (
                    <div style={quoteHistoryActions}>
                      <button
                        type="button"
                        style={quoteMiniStatusButtonActive}
                        onClick={() =>
                          updateQuoteLifecycleStatus(quote.quoteId, "converted_to_job")
                        }
                      >
                         {translate("workCenterCreateJob", activeLanguage)}
                      </button>
                    </div>
                  )}

                </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            style={workCenterFullWidthPrimaryButton}
            onClick={() => {
              localStorage.removeItem("selectedQuoteForEdit");
              localStorage.removeItem("lastManualQuoteNumber");
              localStorage.setItem("quoteBuilderReturnPage", "workCenter");
              localStorage.setItem("meetroWorkCenterTab", "quotes");
              localStorage.setItem("activeWorkCenterTab", "quotes");
              setPage("quoteBuilder");
            }}
          >
            <span aria-hidden="true">+</span>
            {translate("workCenterNewQuote", activeLanguage)}
          </button>
        </div>
      )}


	      {quoteViewTarget && (
	        <div style={quoteViewOverlay}>
          <div style={quoteViewCard}>
	            <div style={quoteViewHeader}>
	              <div>
	                <p style={quoteViewEyebrow}>
	                  {quoteViewTarget.documentLabel ||
	                    (translate("workCenterQuotePreview", activeLanguage))}
	                </p>
                <h2 style={quoteViewTitle}>
                  {quoteViewTarget.quoteNumber ||
                    quoteViewTarget.quote_number ||
                    quoteViewTarget.manualQuoteNumber ||
                    quoteViewTarget.quoteId ||
                    "Quote"}
                </h2>
              </div>

              <button
                style={quoteViewCloseButton}
                onClick={() => setQuoteViewTarget(null)}
              >
                ✕
              </button>
            </div>

            <div style={quoteViewHero}>
              <strong>
                {quoteViewTarget.projectTitle ||
                  (translate("project", activeLanguage))}
              </strong>
              <span>
                {quoteViewTarget.homeownerName ||
                  quoteViewTarget.customer ||
                  (translate("wcCustomer", activeLanguage))}
              </span>
            </div>

            <div style={quoteViewSection}>
              <div style={quoteViewRow}>
                <span>{translate("workCenterLabor", activeLanguage)}</span>
                <strong>${getQuoteLaborAmount(quoteViewTarget).toFixed(2)}</strong>
              </div>

              <div style={quoteViewRow}>
                <span>{translate("workTabMaterials", activeLanguage)}</span>
                <strong>${getQuoteMaterialsAmount(quoteViewTarget).toFixed(2)}</strong>
              </div>

              <div style={quoteViewTotalRow}>
                <span>Total</span>
                <strong>${getQuoteTotalAmount(quoteViewTarget).toFixed(2)}</strong>
              </div>
            </div>

            <div style={quoteViewInfoBlock}>
              <strong>{translate("estimatedTimeline", activeLanguage)}</strong>
              <p>{quoteViewTarget.timeline || "—"}</p>
            </div>

            <div style={quoteViewInfoBlock}>
              <strong>{translate("jobsHiringApplicantNotes", activeLanguage)}</strong>
              <p>{quoteViewTarget.notes || "—"}</p>
            </div>

	            {!quoteViewTarget.readOnlyHistory && (
	              <div style={quoteViewActions}>
	                <button
	                  style={quoteViewPrimaryButton}
	                  onClick={() => {
	                    localStorage.setItem("selectedQuoteForEdit", JSON.stringify(quoteViewTarget));
	                    localStorage.setItem("quoteBuilderReturnPage", "workCenter");
	                    localStorage.setItem("meetroWorkCenterTab", "quotes");
	                    localStorage.setItem("activeWorkCenterTab", "quotes");
	                    setQuoteViewTarget(null);
	                    setPage("quoteBuilder");
	                  }}
	                >
	                   {translate("edit", activeLanguage)}
	                </button>
	              </div>
	            )}
	          </div>
	        </div>
	      )}

	      {jobReportTarget && (
	        <div style={quoteViewOverlay}>
	          <div style={jobReportCard}>
	            <div style={quoteViewHeader}>
	              <div>
	                <p style={quoteViewEyebrow}>
	                  {translate("workCenterJobReport", activeLanguage)}
	                </p>
	                <h2 style={quoteViewTitle}>
	                  {jobReportTarget.title || getWorkCenterJobTitle(jobReportTarget)}
	                </h2>
	              </div>
	              <button
	                type="button"
	                style={quoteViewCloseButton}
	                onClick={() => setJobReportTarget(null)}
	              >
	                ✕
	              </button>
	            </div>

	            <pre style={jobReportText}>{buildJobHistoryReportText(jobReportTarget)}</pre>

	            <div style={jobHistoryDocumentActions}>
	              <button
	                type="button"
	                style={jobHistoryDocumentButton}
	                onClick={() => printJobHistoryReport(jobReportTarget)}
	              >
	                {translate("documentPrint", activeLanguage)}
	              </button>
	              <button
	                type="button"
	                style={jobHistoryDocumentButton}
	                onClick={() =>
	                  shareHistoryDocumentText({
	                    title: translate("workCenterJobReport", activeLanguage),
	                    text: buildJobHistoryReportText(jobReportTarget),
	                  })
	                }
	              >
	                {translate("documentShare", activeLanguage)}
	              </button>
	              <button
	                type="button"
	                style={jobHistoryDocumentButton}
	                onClick={() =>
	                  copyHistoryDocumentText(
	                    buildJobHistoryReportText(jobReportTarget),
	                    translate("workCenterSummaryCopied", activeLanguage)
	                  )
	                }
	              >
	                {translate("workCenterCopySummary", activeLanguage)}
	              </button>
	            </div>
	          </div>
	        </div>
	      )}

	      {activeTab === "materials" && (
        <div style={materialsPageShell}>
          <div style={materialsHero}>
            <div style={materialsHeroIcon}>MAT</div>
            <h2 style={materialsHeroTitle}>
              {translate("materialsCenter")}
            </h2>
            <p style={materialsHeroText}>
              {translate("workCenterOrganizeMaterialsForActiveWorkSendListsThroughMeetroChatOrShare", activeLanguage)}
            </p>
          </div>
          <div style={materialsAssistantCard}>
            <div style={materialsSectionEyebrow}>
              {translate("workCenterAddMaterials", activeLanguage)}
            </div>

            <div style={materialsVoiceHeader}>
              <button
                type="button"
                style={{
                  ...materialsFloatingMic,
                  ...(isListeningMaterials
                    ? materialsFloatingMicActive
                    : {}),
                }}
                onClick={toggleMaterialsMic}
                title={
                  translate("workCenterDictateMaterials", activeLanguage)
                }
              >
                {isListeningMaterials ? "" : ""}
              </button>

              <div>
                <h3 style={materialsVoiceTitle}>
                  {translate("workCenterSpeakTypeOrAddManually", activeLanguage)}
                </h3>

                <p style={materialsModeHint}>
                  {translate("workCenterChooseTheMethodThatWorksBestIfMicrophoneAccessIsBlockedTyping", activeLanguage)}
                </p>
              </div>
            </div>

            <div style={materialsInputModeRow}>
              <button
                type="button"
                style={
                  materialsInputMode === "voice"
                    ? materialsInputModeButtonActive
                    : materialsInputModeButton
                }
                onClick={toggleMaterialsMic}
              >
                 {translate("workCenterSpeakMaterials", activeLanguage)}
              </button>

              <button
                type="button"
                style={
                  materialsInputMode === "type"
                    ? materialsInputModeButtonActive
                    : materialsInputModeButton
                }
                onClick={() => {
                  if (isListeningMaterials && materialsRecognitionRef.current) {
                    materialsRecognitionRef.current.stop();
                  }
                  setIsListeningMaterials(false);
                  setMaterialsInputMode("type");
                }}
              >
                 {translate("workCenterTypeMaterials", activeLanguage)}
              </button>

              <button
                type="button"
                style={
                  showManualMaterials
                    ? materialsInputModeButtonActive
                    : materialsInputModeButton
                }
                onClick={() => setShowManualMaterials((prev) => !prev)}
              >
                ＋ {translate("manualAdd")}
              </button>
            </div>

            {materialsMicError && (
              <div style={materialsMicErrorBox}>
                <strong>
                  {translate("workCenterMicrophoneAccessNeeded", activeLanguage)}
                </strong>

                <p>
                  {translate("workCenterMeetroCanUseVoiceToQuicklyCreateMaterialsListsNotesAndFuture", activeLanguage)}
                </p>

                <p>{materialsMicError}</p>

                {showMaterialsMicSettingsHelp && (
                  <div style={permissionInstructionsBox}>
                    <strong>
                      {translate("workCenterToEnableItOnIPhone", activeLanguage)}
                    </strong>
                    <span>
                      {translate("workCenterSettingsMeetroMicrophoneAllow", activeLanguage)}
                    </span>
                  </div>
                )}

                <div style={materialsMicErrorActions}>
                  <button
                    type="button"
                    style={materialsMicRetryButton}
                    onClick={openMaterialsMicrophoneSettings}
                  >
                    {translate("workCenterOpenSettings", activeLanguage)}
                  </button>

                  <button
                    type="button"
                    style={materialsMicSecondaryButton}
                    onClick={() => {
                      if (isListeningMaterials && materialsRecognitionRef.current) {
                        materialsRecognitionRef.current.stop();
                      }
                      setIsListeningMaterials(false);
                      setMaterialsInputMode("type");
                      setMaterialsMicError("");
                      setShowMaterialsMicSettingsHelp(false);
                    }}
                  >
                    {translate("workCenterTypeInstead", activeLanguage)}
                  </button>
                </div>
              </div>
            )}

            <textarea
              value={materialsDraft}
              onChange={(e) => {
                setMaterialsInputMode("type");
                setMaterialsDraft(e.target.value);
              }}
              style={materialsDraftTextarea}
              placeholder={
                translate("workCenterExamplePVCPipeSiliconeShutoffValve", activeLanguage)
              }
            />

            {showManualMaterials && (
              <div style={materialsFormInner}>
                <div style={formGrid}>
                  <label style={field}>
                    <span>{translate("material")}</span>

                    <input
                      style={input}
                      value={materialForm.title}
                      onChange={(e) =>
                        setMaterialForm({
                          ...materialForm,
                          title: e.target.value,
                        })
                      }
                      placeholder={
                        translate("workCenterExampleBaseCabinet", activeLanguage)
                      }
                    />
                  </label>

                  <label style={field}>
                    <span>
                      {translate("quantity")}
                    </span>

                    <input
                      style={input}
                      value={materialForm.quantity}
                      onChange={(e) =>
                        setMaterialForm({
                          ...materialForm,
                          quantity: e.target.value,
                        })
                      }
                    />
                  </label>

                  <label style={field}>
                    <span>
                      {translate("providedBy")}
                    </span>

                    <select
                      style={input}
                      value={materialForm.provider}
                      onChange={(e) =>
                        setMaterialForm({
                          ...materialForm,
                          provider: e.target.value,
                        })
                      }
                    >
                      <option value="customer">
                        {translate("wcCustomer", activeLanguage)}
                      </option>

                      <option value="business">
                        {translate("business", activeLanguage)}
                      </option>

                      <option value="approval">
                        {translate("needsApproval")}
                      </option>
                    </select>
                  </label>

                  <label style={field}>
                    <span>Status</span>

                    <select
                      style={input}
                      value={materialForm.status}
                      onChange={(e) =>
                        setMaterialForm({
                          ...materialForm,
                          status: e.target.value,
                        })
                      }
                    >
                      <option value="needed">
                        {translate("needed", activeLanguage)}
                      </option>

                      <option value="requested">
                        {translate("workflowRequested", activeLanguage)}
                      </option>

                      <option value="received">
                        {translate("received", activeLanguage)}
                      </option>
                    </select>
                  </label>
                </div>

                <div style={emptyActionGrid}>
                  <button style={emptyActionButton} onClick={saveMaterialItem}>
                     {editingMaterial
                      ? translate("updateMaterial")
                      : translate("saveMaterial")}
                  </button>

                  {editingMaterial && (
                    <button
                      style={materialCancelEditButton}
                      onClick={() => {
                        setEditingMaterial(null);
                        setMaterialForm({
                          title: "",
                          quantity: "1",
                          provider: "customer",
                          status: "needed",
                        });
                      }}
                    >
                      {translate("cancelEdit")}
                    </button>
                  )}

                  <button
                    style={pauseMaterialsButton}
                    onClick={() => {
                      localStorage.setItem("activeWorkStage", "pausedMaterials");
                      localStorage.setItem("activeWorkPauseReason", "materials");
                      openWorkTab("active");
                      setRefreshKey((prev) => prev + 1);
                    }}
                  >
                     {translate("pauseJob")}
                  </button>
                </div>
              </div>
            )}

            <div style={materialsActionRow}>
              <button
                style={generateMaterialsButton}
                onClick={generateMaterialsSuggestion}
              >
                 {translate("generateMaterialsList")}
              </button>
            </div>

            {materialsAiSuggestion && (
              <div style={aiBox}>
                <strong>
                  {translate("workCenterMeetroSuggestedMaterials", activeLanguage)}
                </strong>

                <pre style={materialsPreview}>
                  {materialsAiSuggestion}
                </pre>
              </div>
            )}

            {materialsCatalogMatches.length > 0 && (
              <div style={catalogMatchesWrap}>
                <strong style={catalogMatchesTitle}>
                  {translate("workCenterCatalogMatches", activeLanguage)}
                </strong>

                <div style={catalogMatchesGrid}>
                  {materialsCatalogMatches.map((material) => (
                    <div key={material.id} style={catalogMatchCard}>
                      <strong style={catalogMatchName}>{material.title}</strong>

                      <p style={catalogMatchMeta}>
                        {material.category} • {material.country}
                        {material.estimatedPrice
                          ? ` • $${material.estimatedPrice}`
                          : ""}
                      </p>

                      <p style={catalogMatchSupplier}>
                        {material.supplier ||
                          (translate("workCenterSupplierNotConfirmed", activeLanguage))}
                      </p>

                      <button
                        style={catalogAddButton}
                        onClick={() => addCatalogMaterialToProject(material)}
                      >
                         {translate("workCenterAdd", activeLanguage)}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

            {(() => {
              const materials = JSON.parse(
                localStorage.getItem(getActiveMaterialsKey()) || "[]"
              );

              const filteredMaterials = materials.filter((item) =>
                String(item.title || "")
                  .toLowerCase()
                  .includes(materialsSearch.toLowerCase())
              );

              const neededCount = materials.filter(
                (item) => item.status !== "received"
              ).length;

              const receivedCount = materials.filter(
                (item) => item.status === "received"
              ).length;
              const activityContext = getMaterialsShareContext(materials);
              const materialsActivity = getJobRecord(
                activityContext.conversationId ||
                  activityContext.requestId ||
                  "materials"
              )
                .filter((record) => record.type === "materials_shared")
                .slice(0, 3);

              return (
                <>
                <div style={materialsListPanel}>
                  <div style={materialsListHeader}>
                    <div>
                      <strong>
                        {`${translate("materialsList", activeLanguage)} (${materials.length})`}
                      </strong>

                      <p style={jobMeta}>
                        {receivedCount}{" "}
                        {translate("workCenterReceived", activeLanguage)} •{" "}
                        {neededCount}{" "}
                        {translate("emergencyStatusPending", activeLanguage)}
                      </p>
                    </div>

                    <div style={materialsToolbar}>
                      <input
                        style={materialsSearchBox}
                        value={materialsSearch}
                        onChange={(e) => setMaterialsSearch(e.target.value)}
                        placeholder={translate("searchMaterials")}
                      />
                    </div>
                  </div>

                  {materials.length === 0 ? (
                    <div style={materialsEmptyBox}>
                      <strong>
                        {translate("workCenterNoMaterialsAddedYet", activeLanguage)}
                      </strong>
                      <span>
                        {translate("workCenterAddMaterialsAboveOrGenerateAList", activeLanguage)}
                      </span>
                    </div>
                  ) : (
                    <div style={materialsCardsWrap}>
                      {filteredMaterials.map((item) => {
                        const title = String(item.title || "");
                        const lowerTitle = title.toLowerCase();

                        const icon = lowerTitle.includes("pipe")
                          ? ""
                          : lowerTitle.includes("cement")
                          ? ""
                          : lowerTitle.includes("tape")
                          ? ""
                          : lowerTitle.includes("elbow")
                          ? ""
                          : "";

                        const providerLabel =
                          item.provider === "customer"
                            ? translate("wcCustomer", activeLanguage)
                            : item.provider === "business"
                            ? translate("business", activeLanguage)
                            : translate("momentDetailJourney_approval", activeLanguage);

                        return (
                          <div key={item.id} style={materialCompactCard}>
                            <div style={materialCompactTop}>
                              <div style={materialThumb}>{icon}</div>

                              <div style={materialCompactInfo}>
                                <strong style={materialCompactName}>
                                  {item.title}
                                </strong>

                                <div style={materialCompactMeta}>
                                  <span>
                                    Qty {item.quantity}
                                  </span>

                                  <span>
                                    {item.provider === "customer" ? " " : " "}
                                    {providerLabel}
                                  </span>

                                  <span>
                                     {item.createdAt
                                      ? new Date(item.createdAt).toLocaleDateString()
                                      : translate("today")}
                                  </span>
                                </div>
                              </div>

                              <span
                                style={
                                  item.status === "received"
                                    ? materialReceivedPill
                                    : item.status === "requested"
                                    ? materialRequestedPill
                                    : materialNeededPill
                                }
                              >
                                {item.status === "received"
                                  ? translate("received")
                                  : item.status === "requested"
                                  ? translate("requested")
                                  : translate("needed")}
                              </span>
                            </div>

                            <div style={materialDivider} />

                            <div style={materialCompactActions}>

                              <div style={materialActionGroup}>
                                <button
                                  style={materialEditButton}
                                  onClick={() => {
                                    setEditingMaterial(item);
                                    setMaterialForm({
                                      title: item.title || "",
                                      quantity: item.quantity || "1",
                                      provider: item.provider || "customer",
                                      status: item.status || "needed",
                                    });

                                    setShowManualMaterials(true);
                                  }}
                                >
                                   {translate("edit")}
                                </button>

                                {item.status !== "received" ? (
                                  <button
                                    style={markReceivedButton}
                                    onClick={() => {
                                      const updatedMaterials = materials.map((mat) =>
                                        mat.id === item.id
                                          ? {
                                              ...mat,
                                              status: "received",
                                              receivedAt: new Date().toISOString(),
                                            }
                                          : mat
                                      );

                                      localStorage.setItem(
                                        getActiveMaterialsKey(),
                                        JSON.stringify(updatedMaterials)
                                      );

                                      setRefreshKey((prev) => prev + 1);
                                    }}
                                  >
                                    ✓ {translate("markReceived")}
                                  </button>
                                ) : (
                                  <button style={receivedDisabledButton}>
                                    ✓ {translate("received", activeLanguage)}
                                  </button>
                                )}

                                <button
                                  style={materialDeleteButton}
                                  onClick={() => {
                                    setMaterialDeleteTarget(item);
                                }}
                              >

                              </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <button style={addMaterialInlineButton}>
                        + {translate("workCenterAddMaterial", activeLanguage)}
                      </button>
                    </div>
                  )}

                  {materials.length > 0 && (
                    <div style={materialsSummaryPanel}>
                      <div>
                        <strong>{translate("workCenterMaterialsSummary", activeLanguage)}</strong>

                        <div style={materialsSummaryGrid}>
                          <div style={summaryCountBox}>
                            <strong>{materials.length}</strong>
                            <span>Total</span>
                          </div>

                          <div style={summaryCountBox}>
                            <strong>
                              {materials.filter((item) => item.status === "needed").length}
                            </strong>
                            <span>{translate("workCenterNeeded", activeLanguage)}</span>
                          </div>

                          <div style={summaryCountBox}>
                            <strong>
                              {materials.filter((item) => item.status === "requested").length}
                            </strong>
                            <span>{translate("workCenterRequested", activeLanguage)}</span>
                          </div>

                          <div style={summaryCountBox}>
                            <strong>{receivedCount}</strong>
                            <span>{translate("workCenterReceived2", activeLanguage)}</span>
                          </div>
                        </div>
                      </div>

                      <div style={summaryReadyBox}>
                        <strong>
                          {receivedCount} of {materials.length}{" "}
                          {translate("materialsReceived", activeLanguage)}
                        </strong>

                        <div style={progressBarOuter}>
                          <div
                            style={{
                              ...progressBarInner,
                              width: `${Math.round(
                                (receivedCount / materials.length) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <button
                        style={
                          neededCount === 0
                            ? resumeReadyButton
                            : resumeDisabledButton
                        }
                        onClick={() => {
                          if (neededCount !== 0) return;

                          saveActiveWorkSnapshot({
                            stage: "working",
                          });

                          localStorage.setItem("activeWorkStage", "working");
                          localStorage.setItem("activeWorkStatus", "working");
                          localStorage.setItem("activeJobStatus", "working");
                          localStorage.removeItem("activeWorkPauseReason");

                          window.dispatchEvent(
                            new Event("meetro-active-work-updated")
                          );

                          openWorkTab("active");
                          setRefreshKey((prev) => prev + 1);
                        }}
                      >
                        {neededCount === 0
                          ? translate("workCenterAllMaterialsReadyResumeJob", activeLanguage)
                          : translate("workCenterWaitingMaterialsCount", activeLanguage, { count: neededCount })}
                      </button>
                    </div>
                  )}
                </div>
                <div style={materialsSharePanel}>
                  <div>
                    <strong>
                      {translate("workCenterShareMaterialsList", activeLanguage)}
                    </strong>
                    <p style={materialsShareHelp}>
                      {materials.length === 0
                        ? translate("workCenterAddMaterialsBeforeSharing", activeLanguage)
                        : translate("workCenterSendInsideMeetroOrShareOutsideMeetroForJobPreparationThisDoes", activeLanguage)}
                    </p>
                  </div>

                  <div style={materialsShareGrid}>
                    <button
                      type="button"
                      style={
                        materials.length === 0
                          ? sendMaterialsDisabledButton
                          : sendMaterialsButton
                      }
                      disabled={materials.length === 0}
                      onClick={() => sendMaterialsThroughMeetroChat(materials)}
                    >
                       {translate("workCenterSendThroughMeetroChat", activeLanguage)}
                    </button>

                    <button
                      type="button"
                      style={materials.length === 0 ? materialsShareOptionButtonDisabled : materialsShareOptionButton}
                      disabled={materials.length === 0}
                      onClick={() => shareMaterialsOutsideMeetro(materials)}
                    >
                       {translate("workCenterShareOutsideMeetro", activeLanguage)}
                    </button>
                  </div>

                  <p style={materialsShareHelp}>
                    {translate("workCenterUseMessagesMailNotesAirDropOrAnyAppToSendTheList", activeLanguage)}
                  </p>
                </div>

                <div style={materialsActivityPanel}>
                  <strong>
                    {translate("workCenterRecentMaterialsActivity", activeLanguage)}
                  </strong>

                  {materialsActivity.length === 0 ? (
                    <p style={materialsShareHelp}>
                      {translate("workCenterSharedMaterialsActivityWillAppearHere", activeLanguage)}
                    </p>
                  ) : (
                    <div style={materialsActivityList}>
                      {materialsActivity.map((activity) => (
                        <div key={activity.id} style={materialsActivityItem}>
                          <span>{activity.title}</span>
                          <small>
                            {activity.method || activity.subtitle} •{" "}
                            {activity.savedAt
                              ? new Date(activity.savedAt).toLocaleDateString()
                              : translate("today")}
                          </small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                </>
              );
            })()}
        </div>
      )}

      {activeTab === "records" && (
        <div style={section}>
          <h2 style={sectionTitle}>
            {translate("relationshipHistoryTitle")}
          </h2>

          <p style={recordsIntroText}>
            {translate("relationshipHistoryDescription")}
          </p>

          {(() => {
            const recordGroups = Object.keys(localStorage)
              .filter((key) => key.startsWith("meetro_job_record_"))
              .map((key) => {
                const conversationId = key.replace("meetro_job_record_", "");
                const records = JSON.parse(localStorage.getItem(key) || "[]");
                const latest = records[0] || {};

                return {
                  conversationId,
                  records,
                  latest,
                  count: records.length,
                  title:
                    latest.jobService ||
                    latest.title ||
                    (translate("project", activeLanguage)),
                  customer:
                    latest.customer ||
                    (translate("wcCustomer", activeLanguage)),
                  lastUpdate:
                    latest.savedAt ||
                    latest.createdAt ||
                    "",
                };
              })
              .filter((group) => group.count > 0);

            if (recordGroups.length === 0) {
              return (
                <div className="meetro-visual-empty-state" style={emptyCard}>
                  <div style={emptyIcon}>REC</div>

                  <strong>
                    {translate("relationshipHistoryEmpty")}
                  </strong>

                  <p style={emptyText}>
                    {translate("relationshipHistoryEmptyDescription")}
                  </p>
                </div>
              );
            }

            return (
              <div style={recordsGrid}>
                {recordGroups.map((group) => (
                  <div style={projectRecordCard} key={group.conversationId}>
                    <div style={projectRecordTop}>
                      <div style={projectRecordIcon}>REC</div>

                      <div>
                        <h3 style={projectRecordTitle}>{group.customer}</h3>

                        <p style={projectRecordMeta}>
                          {group.title}
                        </p>
                      </div>
                    </div>

                    <div style={projectRecordStats}>
                      <span>
                         {group.count}{" "}
                        {translate("workCenterBadgeRecords", activeLanguage)}
                      </span>

                      {group.lastUpdate && (
                        <span>
                          {" "}
                          {new Date(group.lastUpdate).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {group.latest?.title && (
                      <div style={latestRecordBox}>
                        <strong>
                          {translate("workCenterLatestEvent", activeLanguage)}
                        </strong>

                        <p>{group.latest.title}</p>

                        {group.latest.subtitle && (
                          <small>{group.latest.subtitle}</small>
                        )}
                      </div>
                    )}

                    <div style={projectRecordActions}>
                      <button
                        style={projectRecordPrimary}
                        onClick={() => {
                          localStorage.setItem(
                            "activeConversationId",
                            group.conversationId
                          );

                          localStorage.setItem(
                            "activeWorkConversationId",
                            group.conversationId
                          );

                          localStorage.setItem(
                            "activeWorkRequestId",
                            group.conversationId
                          );

                          saveActiveWorkSnapshot({
                            requestId: group.conversationId,
                            conversationId: group.conversationId,
                            service: group.title || "",
                            source: "job_record",
                          });

                          saveActiveWorkSnapshot({
                            requestId: group.conversationId,
                            conversationId: group.conversationId,
                            service: group.title || "",
                            source: "job_record",
                          });

                          localStorage.setItem(
                            "activeWorkService",
                            group.title || ""
                          );

                          localStorage.setItem(
                            "activeConversationName",
                            group.customer || ""
                          );

                          localStorage.setItem(
                            "meetroConversationType",
                            "standard"
                          );

                          localStorage.setItem(
                            "openJobRecordsOnLoad",
                            "true"
                          );

                          setPage("conversationThread");
                        }}
                      >
                         {translate("homeViewRecord", activeLanguage)}
                      </button>

                      <button
                        style={projectRecordSecondary}
                        onClick={() => {
                          localStorage.setItem(
                            "activeConversationId",
                            group.conversationId
                          );

                          localStorage.setItem(
                            "activeWorkConversationId",
                            group.conversationId
                          );

                          localStorage.setItem(
                            "activeWorkRequestId",
                            group.conversationId
                          );

                          localStorage.setItem(
                            "activeWorkService",
                            group.title || ""
                          );

                          localStorage.setItem(
                            "activeConversationName",
                            group.customer || ""
                          );

                          localStorage.setItem(
                            "meetroConversationType",
                            "standard"
                          );

                          setPage("conversationThread");
                        }}
                      >
                         {translate("chat", activeLanguage)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "timeline" && (
        <div style={section}>
          <div style={sectionHeaderRow}>
            <h2 style={sectionTitle}>
              {translate("workCenterWorkflowTimeline", activeLanguage)}
            </h2>
          </div>

          {(() => {
            const workflowTimeline = JSON.parse(
              localStorage.getItem("meetroWorkflowTimeline") || "[]"
            );

            const projectTimeline = JSON.parse(
              localStorage.getItem("projectTimeline") || "[]"
            );

            const timelineItems = [...workflowTimeline, ...projectTimeline]
              .filter((item, index, self) => {
                const key = item.id || `${item.type}-${item.createdAt}-${item.title}`;
                return index === self.findIndex((entry) => {
                  const entryKey =
                    entry.id || `${entry.type}-${entry.createdAt}-${entry.title}`;
                  return entryKey === key;
                });
              })
              .sort((a, b) => {
                return new Date(b.createdAt || b.savedAt || 0) - new Date(a.createdAt || a.savedAt || 0);
              });

            return timelineItems.length === 0 ? (
              <div className="meetro-visual-empty-state" style={emptyCard}>
                <div style={emptyIcon}>TIME</div>

                <strong>
                  {translate("workCenterNoTimelineEventsYet", activeLanguage)}
                </strong>

                <p style={emptyText}>
                  {translate("workCenterAppointmentsVisitsQuotesMaterialsAndWorkUpdatesWillAppearHere", activeLanguage)}
                </p>
              </div>
            ) : (
              <div style={workflowTimelineList}>
                {timelineItems.map((item) => (
                  <div key={item.id || `${item.type}-${item.createdAt}`} style={workflowTimelineItem}>
                    <div style={workflowTimelineDot}>
                      {item.type === "appointment_completed"
                        ? "OK"
                        : item.type === "quote_required"
                        ? "$"
                        : item.type === "materials_needed"
                        ? "MAT"
                        : item.type === "start_work_immediately"
                        ? "JOB"
                        : item.type === "emergency_dispatch"
                        ? "SOS"
                        : item.type === "follow_up_required"
                        ? "CALL"
                        : item.type === "waiting_customer_decision"
                        ? "WAIT"
                        : "EVT"}
                    </div>

                    <div style={workflowTimelineContent}>
                      <strong>
                        {item.title ||
                          (translate("workCenterWorkflowEvent", activeLanguage))}
                      </strong>

                      {(item.service || item.location) && (
                        <p style={jobMeta}>
                          {[item.service, item.location].filter(Boolean).join(" • ")}
                        </p>
                      )}

                      {item.createdAt && (
                        <small style={workflowTimelineDate}>
                          {formatDateTimeDisplay(item.createdAt, "", {
                            language: activeLanguage,
                          })}
                        </small>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "revenue" && (
        <div ref={dynamicSectionRef} style={section}>
          <button
            style={workCenterBackButton}
            onClick={returnToWorkCenterDashboard}
          >
            <span aria-hidden="true">‹</span>
            {translate("backToWorkCenter")}
          </button>

          <div style={workCenterChildHeader}>
            <h2 style={workCenterChildTitle}>
              {ui("workCenterRevenueTitle")}
            </h2>
            <p style={workCenterChildSummary}>
              {ui("workCenterChildRevenueSummary")}
            </p>
          </div>

          <div style={revenueCard}>
            <div style={revenueGrid}>
              <div style={revenueMiniCard}>
                <div>
                  <span style={revenueLabel}>
                    {ui("wcThisWeek")}
                  </span>
                  <strong style={revenueBig}>
                    ${Number(totalJobRevenue || 0).toLocaleString()}
                  </strong>
                  <div style={miniSub}>
                    {`${completedJobsCount} ${ui("wcJobs")}`}
                  </div>
                </div>
              </div>

              <div style={revenueMiniCard}>
                <div>
                  <span style={revenueLabel}>
                    {ui("wcThisMonth")}
                  </span>
                  <strong style={revenueBig}>
                    ${Number(totalJobRevenue || 0).toLocaleString()}
                  </strong>
                  <div style={miniSub}>
                    {`${quoteHistory.length} ${ui("wcQuotes")}`}
                  </div>
                </div>
              </div>

              <div style={revenueMiniCard}>
                <div>
                  <span style={revenueLabel}>
                    {ui("wcCompletedJobs")}
                  </span>
                  <strong style={revenueBig}>{completedJobsCount}</strong>
                  <div style={miniSub}>
                    {`${ui("wcAvg")} $${averageJobValue}`}
                  </div>
                </div>
              </div>

              <div style={revenueMiniCard}>
                <div>
                  <span style={revenueLabel}>
                    {ui("wcPendingRevenue")}
                  </span>
                  <strong style={revenueBig}>
                    {totalQuoteAlerts > 0 ? totalQuoteAlerts : 0}
                  </strong>
                  <div style={miniSub}>
                    {totalQuoteAlerts > 0
                      ? ui("wcNeedAttention")
                      : ui("wcOpen")}
                  </div>
                </div>
              </div>
            </div>

            <div style={revenueCompactNote}>
              <span>
                {ui("wcRevenueNote")}
              </span>
            </div>
          </div>
        </div>
      )}

      {materialDeleteTarget && (
        <div style={confirmOverlay}>
          <div style={confirmCard}>
            <h3>
              {translate("deleteMaterial", activeLanguage)}
            </h3>

            <p>
              {translate("workCenterRemoveMaterialFromList", activeLanguage, {
                material: materialDeleteTarget.title,
              })}
            </p>

            <div style={confirmActions}>
              <button
                style={secondaryScheduleBtn}
                onClick={() => setMaterialDeleteTarget(null)}
              >
                {translate("cancel")}
              </button>

              <button
                style={deleteScheduleBtn}
                onClick={() => {
                  const materials = JSON.parse(
                    localStorage.getItem(getActiveMaterialsKey()) || "[]"
                  );

                  const updatedMaterials = materials.filter(
                    (item) => item.id !== materialDeleteTarget.id
                  );

                  localStorage.setItem(
                    getActiveMaterialsKey(),
                    JSON.stringify(updatedMaterials)
                  );

                  setMaterialDeleteTarget(null);
                  setRefreshKey((prev) => prev + 1);
                }}
              >
                {translate("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {evaluationToast && (
        <div
          role={evaluationToast.type === "error" ? "alert" : "status"}
          style={{
            ...evaluationBottomToast,
            ...(evaluationToast.type === "error"
              ? evaluationBottomToastError
              : {}),
          }}
        >
          {evaluationToast.message}
        </div>
      )}

      {jobActionToast && (
        <div
          role={jobActionToast.type === "error" ? "alert" : "status"}
          style={{
            ...evaluationBottomToast,
            ...(jobActionToast.type === "error"
              ? evaluationBottomToastError
              : {}),
          }}
        >
          {jobActionToast.message}
        </div>
      )}

      <BottomNav setPage={setPage} currentPage="contractorDashboard" />
    </div>
  );
}

const page = {
  minHeight: "100dvh",
  background: "var(--meetro-gradient-community-page)",
  padding:
    "72px max(16px, env(safe-area-inset-right)) calc(68px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
  boxSizing: "border-box",
  overflowX: "hidden",
};

const topBar = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "flex-start",
  width: "100%",
  marginBottom: "11px",
  paddingTop: "18px",
  paddingRight: "11px",
  boxSizing: "border-box",
};

const backButton = {
  width: "39px",
  height: "39px",
  borderRadius: "10px",
  border: "none",
  background: "white",
  fontSize: "12px",
  cursor: "pointer",
  boxShadow: "0 8px 11px rgba(0,0,0,0.06)",
};

const availabilityPill = {
  background: "#10b981",
  color: "white",
  padding: "9px 10px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
};

const header = {
  textAlign: "center",
  marginBottom: "10px",
};

const title = {
  fontSize: "29px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "6px",
};

const subtitle = {
  color: "#6b7280",
  fontSize: "12px",
};

const rolePill = {
  display: "inline-flex",
  background: "white",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "10px 9px",
  borderRadius: "999px",
  fontWeight: "900",
  marginBottom: "9px",
  boxShadow: "0 8px 10px rgba(0,0,0,0.05)",
};

const missionControl = {
  display: "grid",
  gap: "14px",
  margin: "10px 0 18px",
};

const missionSection = {
  background: "rgba(255,255,255,0.96)",
  border: "1px solid rgba(148,163,184,0.20)",
  borderRadius: "24px",
  padding: "16px",
  boxShadow: "0 14px 34px rgba(15,23,42,0.07)",
};

const missionSectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "12px",
};

const missionEyebrow = {
  display: "block",
  color: "var(--meetro-color-charcoal, #172317)",
  fontSize: "10px",
  fontWeight: 950,
  letterSpacing: "0.12em",
  marginBottom: "4px",
};

const missionSectionTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "20px",
  fontWeight: 950,
};

const missionAttentionGrid = {
  display: "grid",
  gap: "9px",
};

const missionAlertCard = {
  width: "100%",
  border: "1px solid rgba(245,158,11,0.24)",
  borderRadius: "18px",
  padding: "12px",
  background: "linear-gradient(135deg, #fffbeb, #ffffff)",
  display: "grid",
  gridTemplateColumns: "40px minmax(0, 1fr) 20px",
  alignItems: "center",
  gap: "10px",
  color: "#0f172a",
  textAlign: "left",
  cursor: "pointer",
};

const missionClearCard = {
  ...missionAlertCard,
  border: "1px solid rgba(34,197,94,0.20)",
  background: "linear-gradient(135deg, #f0fdf4, #ffffff)",
};

const missionAlertIcon = {
  width: "40px",
  height: "40px",
  borderRadius: "14px",
  background: "#ffffff",
  display: "grid",
  placeItems: "center",
  fontSize: "19px",
  boxShadow: "0 6px 16px rgba(15,23,42,0.08)",
};

const missionAlertContent = {
  minWidth: 0,
  display: "grid",
  gap: "3px",
};

const missionArrow = {
  color: "var(--meetro-color-charcoal, #172317)",
  fontSize: "24px",
  fontWeight: 900,
};

const missionCurrentCard = {
  borderRadius: "22px",
  padding: "16px",
  background: "linear-gradient(135deg, #1e1b4b, var(--meetro-color-forest, #1f4d34))",
  color: "#ffffff",
  boxShadow: "0 18px 38px rgba(31,77,52,0.22)",
};

const missionCurrentTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
};

const missionCurrentStatus = {
  display: "inline-flex",
  padding: "6px 9px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.15)",
  fontSize: "11px",
  fontWeight: 900,
};

const missionCurrentTitle = {
  margin: "10px 0 4px",
  fontSize: "21px",
  fontWeight: 950,
};

const missionCurrentMeta = {
  margin: 0,
  color: "rgba(255,255,255,0.78)",
  fontSize: "13px",
  fontWeight: 700,
};

const missionNextAction = {
  display: "grid",
  gap: "3px",
  margin: "14px 0",
  padding: "11px 12px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.10)",
  fontSize: "13px",
};

const missionPrimaryButton = {
  width: "100%",
  minHeight: "46px",
  border: "none",
  borderRadius: "15px",
  background: "#ffffff",
  color: "#4338ca",
  fontWeight: 950,
  cursor: "pointer",
};

const missionTextButton = {
  border: "none",
  background: "transparent",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const missionTodayList = {
  display: "grid",
  gap: "9px",
};

const missionTodayCard = {
  display: "grid",
  gridTemplateColumns: "64px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "10px",
  padding: "11px",
  borderRadius: "18px",
  border: "1px solid rgba(37,99,235,0.16)",
  background: "linear-gradient(135deg, #eff6ff, #ffffff)",
};

const missionTimeBlock = {
  display: "grid",
  gap: "2px",
  color: "#1d4ed8",
  fontSize: "12px",
};

const missionTodayContent = {
  minWidth: 0,
  display: "grid",
  gap: "3px",
  color: "#0f172a",
};

const missionPrepareButton = {
  minHeight: "40px",
  border: "none",
  borderRadius: "13px",
  padding: "8px 10px",
  background: "#2563eb",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: 900,
  cursor: "pointer",
};

const missionEmptyCard = {
  display: "grid",
  gap: "4px",
  padding: "14px",
  borderRadius: "18px",
  background: "#f8fafc",
  color: "#64748b",
  fontSize: "13px",
};



const overviewGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "14px",
  margin: "18px 0 20px",
};

const emergencyChatBanner = {
  display: "grid",
  gap: "14px",
  marginTop: "16px",
  padding: "18px",
  borderRadius: "24px",
  background: "linear-gradient(135deg, #991b1b, #ef4444)",
  color: "#ffffff",
  boxShadow: "0 18px 38px rgba(220,38,38,0.24)",
  cursor: "pointer",
};

const emergencyChatBannerTitle = {
  display: "block",
  fontSize: "19px",
  fontWeight: "900",
};

const emergencyChatBannerText = {
  margin: "5px 0 0",
  opacity: 0.9,
  fontWeight: "700",
};

const emergencyChatBannerButton = {
  minHeight: "48px",
  border: "none",
  borderRadius: "16px",
  background: "#ffffff",
  color: "#991b1b",
  fontWeight: "900",
  cursor: "pointer",
};

const overviewCard = {
  background: "linear-gradient(135deg, #ffffff, #f8fbff)",
  borderRadius: "18px",
  padding: "13px",
  boxShadow: "0 14px 30px rgba(15,23,42,0.08)",
  border: "1px solid rgba(31,77,52,0.10)",
};

const dispatchOverviewCard = {
  background: "linear-gradient(135deg, #f8fbff, #ffffff)",
  borderRadius: "26px",
  padding: "22px 18px 24px",
  boxShadow: "0 18px 42px rgba(15,23,42,0.08)",
  border: "1px solid rgba(148,163,184,0.24)",
  position: "relative",
  overflow: "hidden",
  minHeight: "250px",
};

const dispatchOverviewIcon = {
  width: "38px",
  height: "38px",
  borderRadius: "16px",
  display: "grid",
  placeItems: "center",
  fontSize: "19px",
  marginBottom: "10px",
  background: "linear-gradient(135deg, #ef4444, #f97316)",
  color: "#ffffff",
  boxShadow: "0 10px 22px rgba(239,68,68,0.25)",
};

const summaryOverviewCard = {
  background: "linear-gradient(135deg, #ffffff, #f8fafc)",
  borderRadius: "22px",
  padding: "10px 14px",
  boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
  border: "1px solid rgba(148,163,184,0.18)",
  minHeight: "140px",
};


const summaryTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "18px",
};

const summaryEyebrow = {
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "1.5px",
  color: "var(--meetro-color-charcoal, #172317)",
  marginBottom: "4px",
};

const summaryMainTitle = {
  fontSize: "32px",
  fontWeight: 900,
  color: "#0f172a",
};

const summaryActionButton = {
  border: "1px solid rgba(23,35,23,0.20)",
  background: "#ffffff",
  color: "var(--meetro-color-charcoal, #172317)",
  borderRadius: "999px",
  padding: "12px 24px",
  fontWeight: 800,
  fontSize: "16px",
  cursor: "pointer",
};

const summaryStatsRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
};

const summaryStat = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  color: "#475569",
};

const summaryOverviewIcon = {
  width: "52px",
  height: "52px",
  borderRadius: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "26px",
  marginBottom: "6px",
  background: "linear-gradient(135deg, #e0f2fe, #dbeafe)",
};

const overviewIcon = {
  width: "34px",
  height: "34px",
  borderRadius: "14px",
  display: "grid",
  placeItems: "center",
  fontSize: "17px",
  marginBottom: "10px",
  background: "linear-gradient(135deg, #fee2e2, #fff7ed)",
  boxShadow: "inset 0 0 0 1px rgba(248,113,113,0.16)",
};

const overviewTitle={
display:"block",
fontSize:"11px",
fontWeight:"900",
marginBottom:"10px",
};

const overviewText={
color:"#6b7280",
marginBottom:"8px",
fontWeight:"700",
};

const miniPill={
display:"inline-flex",
padding:"8px 9px",
borderRadius:"999px",
background:"var(--meetro-surface-sage, #eef4ea)",
color:"var(--meetro-color-forest, #1f4d34)",
fontWeight:"800",
marginBottom:"9px",
};

const miniButton={
width:"100%",
padding:"10px 9px",
border:"none",
borderRadius:"10px",
background:"var(--meetro-color-forest, #1f4d34)",
color:"white",
fontWeight:"900",
cursor:"pointer",
};



const quoteStatusFilterRow = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "8px",
  overflowX: "auto",
  padding: "2px 0 8px",
  marginBottom: "2px",
};

const quoteStatusFilterButton = {
  minHeight: "44px",
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#263653",
  borderRadius: "14px",
  padding: "10px 8px",
  fontSize: "14px",
  fontWeight: 900,
  whiteSpace: "nowrap",
  cursor: "pointer",
  boxShadow: "0 6px 14px rgba(15,23,42,0.03)",
};

const quoteStatusFilterButtonActive = {
  background: "#f7f4ff",
  color: "#4f28e8",
  border: "1px solid #8b7cff",
  boxShadow: "0 10px 22px rgba(31,77,52,0.12)",
};

const quoteLifecycleBadge = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "flex-start",
  borderRadius: "999px",
  padding: "5px 8px",
  fontSize: "12px",
  fontWeight: 900,
  background: "#fef3c7",
  color: "#b45309",
  border: "1px solid rgba(245,158,11,0.22)",
  marginBottom: "0",
};

const quoteLifecycleBadgeAccepted = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid rgba(34,197,94,0.22)",
};

const quoteLifecycleBadgeRevision = {
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid rgba(249,115,22,0.22)",
};

const quoteLifecycleBadgeDeclined = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid rgba(239,68,68,0.22)",
};

const quoteLifecycleBadgeActive = {
  background: "#ecfdf5",
  color: "#047857",
  border: "1px solid rgba(16,185,129,0.22)",
};

const quoteLifecycleBadgeCompleted = {
  background: "#f1f5f9",
  color: "#334155",
  border: "1px solid rgba(100,116,139,0.20)",
};

const quoteLifecycleActions = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "12px",
  marginBottom: "12px",
};

const quoteMiniStatusButton = {
  border: "1px solid rgba(148,163,184,0.24)",
  background: "#ffffff",
  color: "#334155",
  borderRadius: "999px",
  padding: "8px 11px",
  fontSize: "12px",
  fontWeight: 850,
  cursor: "pointer",
};

const quoteMiniStatusButtonActive = {
  border: "1px solid rgba(16,185,129,0.28)",
  background: "linear-gradient(135deg, #10b981, #059669)",
  color: "#ffffff",
  borderRadius: "999px",
  padding: "8px 11px",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(16,185,129,0.22)",
};

const externalQuoteChip = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "flex-start",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: 900,
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid rgba(245,158,11,0.24)",
  marginBottom: "4px",
};

const externalQuoteActions = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  margin: "10px 0 12px",
};

const externalAcceptButton = {
  border: "none",
  borderRadius: "999px",
  padding: "9px 12px",
  background: "linear-gradient(135deg, #10b981, #059669)",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const externalRevisionButton = {
  border: "1px solid rgba(249,115,22,0.28)",
  borderRadius: "999px",
  padding: "9px 12px",
  background: "#fff7ed",
  color: "#9a3412",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const externalDeclineButton = {
  border: "1px solid rgba(239,68,68,0.24)",
  borderRadius: "999px",
  padding: "9px 12px",
  background: "#ffffff",
  color: "#991b1b",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const externalInviteButton = {
  border: "1px solid rgba(31,77,52,0.22)",
  borderRadius: "999px",
  padding: "9px 12px",
  background: "#ffffff",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const acceptedQuoteNextStepGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  margin: "12px 0",
};

const acceptedQuoteSecondaryButton = {
  border: "1px solid rgba(31,77,52,0.20)",
  borderRadius: "16px",
  padding: "12px 10px",
  background: "#ffffff",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "13px",
  fontWeight: 900,
  cursor: "pointer",
};

const quoteDecisionState = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  margin: "12px 0",
  padding: "12px 14px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid rgba(148,163,184,0.20)",
  color: "#334155",
};

const operationalSummaryGrid = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
  gap: "8px",
  margin: "10px 0",
};

const operationalSummaryItem = {
  minWidth: 0,
  display: "grid",
  gap: "4px",
  padding: "10px 11px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid rgba(148,163,184,0.20)",
  color: "#334155",
  fontSize: "12px",
  lineHeight: 1.35,
};

const operationalSummaryItemWide = {
  ...operationalSummaryItem,
  gridColumn: "1 / -1",
};

const quoteHistoryList = {
  display: "grid",
  gap: "16px",
  paddingBottom: "8px",
};




const activeQuotePill = {
  background: "#e0f2fe",
  color: "#0369a1",
};

const acceptedQuotePill = {
  background: "#dcfce7",
  color: "#15803d",
};

const acceptedQuoteAlertCard = {
  marginTop: "16px",
  background: "linear-gradient(135deg,#ecfdf5,#ffffff)",
  border: "1px solid rgba(34,197,94,.18)",
  borderRadius: "22px",
  padding: "16px",
  boxShadow: "0 14px 28px rgba(34,197,94,.10)",
};

const moveToActiveButton = {
  marginTop: "14px",
  border: "none",
  background: "linear-gradient(135deg,#22c55e,#16a34a)",
  color: "white",
  borderRadius: "14px",
  padding: "12px 16px",
  fontWeight: "950",
  boxShadow: "0 10px 22px rgba(34,197,94,.18)",
  cursor: "pointer",
};

const revisionRequestedPill = {
  background: "#fff7ed",
  color: "#c2410c",
};

const revisionRequestCard = {
  marginTop: "14px",
  background: "linear-gradient(135deg,#fff7ed,#ffffff)",
  border: "1px solid #fdba74",
  borderRadius: "20px",
  padding: "15px",
  color: "#7c2d12",
  boxShadow: "0 10px 24px rgba(249,115,22,.08)",
};

const reviseQuoteButton = {
  width: "100%",
  marginTop: "12px",
  border: "none",
  borderRadius: "14px",
  padding: "12px",
  background: "linear-gradient(135deg,#fb923c,#f97316)",
  color: "white",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 10px 20px rgba(249,115,22,.16)",
};

const quoteHistoryCard = {
  background: "#ffffff",
  borderRadius: "18px",
  padding: "18px",
  overflow: "hidden",
  boxShadow: "0 12px 30px rgba(15,23,42,.05)",
  border: "1px solid #dfe6f1",
};

const quoteHistoryTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
};

const quoteCardIdentity = {
  minWidth: 0,
  display: "grid",
  gap: "5px",
};

const quoteChevronButton = {
  width: "34px",
  height: "34px",
  border: "none",
  background: "transparent",
  color: "#17233f",
  fontSize: "31px",
  fontWeight: 500,
  lineHeight: 1,
  cursor: "pointer",
  flexShrink: 0,
};

const quoteCardAmountRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  margin: "20px 0 18px",
};

const workflowCardSummary = {
  display: "grid",
  gap: "10px",
  margin: "4px 0 16px",
  padding: "12px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const workflowSummaryItem = {
  display: "grid",
  gap: "4px",
};

const workflowSummaryLabel = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "950",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const workflowSummaryValue = {
  color: "#0f172a",
  fontSize: "15px",
  lineHeight: 1.35,
  fontWeight: "950",
};

const workflowPrimaryActionButton = {
  width: "100%",
  minHeight: "48px",
  border: "none",
  borderRadius: "14px",
  padding: "12px 14px",
  background: "linear-gradient(135deg,var(--meetro-color-forest, #1f4d34),#4f28e8)",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 12px 22px rgba(31,77,52,0.18)",
};

const quoteCardFooterRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  color: "#263653",
  fontSize: "14px",
  fontWeight: "850",
};

const quoteInlineDetailsButton = {
  border: "none",
  background: "transparent",
  color: "#371ce4",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  fontSize: "14px",
  fontWeight: "950",
  cursor: "pointer",
  padding: "4px 0",
  whiteSpace: "nowrap",
};

const quoteStatusPill = {
  display: "inline-flex",
  alignItems: "flex-start",
  background: "#ecfdf5",
  color: "#047857",
  padding: "7px 12px",
  borderRadius: "999px",
  fontWeight: "950",
  fontSize: "11px",
  textTransform: "capitalize",
  letterSpacing: "-0.01em",
};

const quoteHistoryTitle = {
  margin: "0 0 3px",
  fontSize: "21px",
  fontWeight: "950",
  color: "#050812",
  lineHeight: 1.12,
};

const quoteHistoryMeta = {
  margin: 0,
  color: "#263653",
  fontWeight: "800",
  fontSize: "15px",
};

const quoteAmount = {
  fontSize: "25px",
  fontWeight: "950",
  color: "#050812",
  letterSpacing: "-0.02em",
};

const quoteHistoryText = {
  marginTop: "10px",
  color: "#475569",
  lineHeight: 1.35,
  fontWeight: "700",
  fontSize: "13px",
};

const workCenterDashboard = {
  margin: "8px 0 14px",
};

const workCenterDashboardIntro = {
  background: "linear-gradient(135deg, var(--meetro-color-forest-deep), var(--meetro-color-forest))",
  border: "1px solid rgba(255, 253, 248, 0.16)",
  borderRadius: "18px",
  padding: "14px 15px",
  color: "var(--meetro-color-paper)",
  boxShadow: "var(--meetro-shadow-lifted)",
  marginBottom: "10px",
};

const workCenterDashboardEyebrow = {
  display: "block",
  fontSize: "11px",
  fontWeight: 950,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--meetro-color-wood)",
  marginBottom: "5px",
};

const workCenterDashboardTitle = {
  margin: "0 0 5px",
  fontSize: "24px",
  lineHeight: 1.15,
  fontWeight: 950,
  color: "var(--meetro-color-paper)",
};

const workCenterDashboardPurpose = {
  margin: 0,
  maxWidth: "520px",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: 650,
  color: "rgba(255,253,248,0.82)",
};

const workCenterDashboardPerspective = {
  margin: "8px 0 0",
  maxWidth: "640px",
  fontSize: "13px",
  lineHeight: 1.4,
  fontWeight: 800,
  color: "var(--meetro-color-sage)",
};

const workCenterDashboardSummary = {
  margin: "8px 0 0",
  color: "rgba(255,253,248,0.82)",
  fontSize: "12px",
  lineHeight: 1.3,
  fontWeight: 900,
};

const propertyManagementWorkCenterFoundationNote = {
  maxWidth: "620px",
  margin: "12px 0 0",
  padding: "11px 13px",
  border: "1px solid rgba(255,255,255,0.72)",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.14)",
  color: "#ffffff",
  fontSize: "13px",
  lineHeight: 1.5,
  fontWeight: 750,
};

const workCenterDashboardGrid = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
  gap: "10px",
};

const workCenterPrimaryNavGrid = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
  gap: "12px",
  margin: "0 0 18px",
};

const workCenterPrimaryNavCard = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "20px",
  background: "var(--meetro-surface-paper)",
  padding: "15px",
  display: "grid",
  gridTemplateColumns: "40px minmax(0, 1fr)",
  gap: "10px",
  alignItems: "start",
  textAlign: "left",
  color: "var(--meetro-color-ink)",
  cursor: "pointer",
  boxShadow: "var(--meetro-shadow-soft)",
};

const workCenterPrimaryNavCardAlert = {
  background: "linear-gradient(135deg,#fff7ed,#ffffff)",
  boxShadow: "0 0 0 1px rgba(251,146,60,0.22), 0 18px 44px rgba(249,115,22,0.18)",
  borderLeft: "4px solid #f97316",
};

const workCenterPrimaryNavIcon = {
  width: "40px",
  height: "40px",
  borderRadius: "14px",
  display: "grid",
  placeItems: "center",
  fontSize: "18px",
  fontWeight: 950,
};

const workCenterPrimaryNavContent = {
  minWidth: 0,
  display: "grid",
  gap: "6px",
};

const workCenterPrimaryNavTitleRow = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  flexWrap: "wrap",
};

const workCenterPrimaryNavTitle = {
  minWidth: 0,
  fontSize: "15px",
  lineHeight: 1.2,
  fontWeight: 950,
};

const workCenterPrimaryNavMeta = {
  flexShrink: 0,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  padding: "4px 7px",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 950,
};

const workCenterPrimaryNavMetaAlert = {
  background: "#ffedd5",
  color: "#c2410c",
  boxShadow: "0 0 0 4px rgba(251,146,60,0.16)",
  animation: "meetro-assistant-soft-pulse 1.8s ease-in-out infinite",
};

const workCenterPrimaryNavPurpose = {
  color: "var(--meetro-color-muted)",
  fontSize: "12px",
  lineHeight: 1.35,
  fontWeight: 750,
};

const workCenterPrimaryNavAction = {
  width: "fit-content",
  maxWidth: "100%",
  fontSize: "12px",
  lineHeight: 1.25,
  fontWeight: 950,
};

const workCenterAlertGuidanceCard = {
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  display: "grid",
  gap: "12px",
  margin: "0 0 12px",
  padding: "14px",
  borderRadius: "20px",
  background: "linear-gradient(135deg, rgba(251,246,237,0.98), var(--meetro-surface-paper))",
  border: "1px solid rgba(239, 68, 68, 0.28)",
  boxShadow:
    "0 0 0 3px rgba(239, 68, 68, 0.08), 0 16px 34px rgba(127, 29, 29, 0.12)",
  overflow: "hidden",
};

const workCenterAlertGuidanceTop = {
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "40px minmax(0, 1fr)",
  gap: "10px",
  alignItems: "start",
};

const workCenterAlertGuidanceIcon = {
  width: "40px",
  height: "40px",
  borderRadius: "14px",
  display: "grid",
  placeItems: "center",
  background: "#ef4444",
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: 950,
};

const workCenterAlertGuidanceText = {
  minWidth: 0,
  display: "grid",
  gap: "4px",
};

const workCenterAlertGuidanceEyebrow = {
  color: "#b91c1c",
  fontSize: "11px",
  fontWeight: 950,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const workCenterAlertGuidanceTitle = {
  color: "#111827",
  fontSize: "17px",
  lineHeight: 1.18,
  fontWeight: 950,
};

const workCenterAlertGuidanceMessage = {
  margin: 0,
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.4,
  fontWeight: 750,
};

const workCenterAlertGuidanceMeta = {
  color: "#7f1d1d",
  fontSize: "12px",
  lineHeight: 1.3,
  fontWeight: 900,
};

const workCenterAlertGuidanceActions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: "8px",
};

const workCenterAlertPrimaryButton = {
  minHeight: "44px",
  border: "none",
  borderRadius: "14px",
  background: "var(--meetro-gradient-community-action)",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 950,
  cursor: "pointer",
};

const workCenterAlertSecondaryButton = {
  ...workCenterAlertPrimaryButton,
  background: "#ffffff",
  color: "#b91c1c",
  border: "1px solid rgba(239, 68, 68, 0.24)",
};

const workCenterPriorityAlertCard = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "10px",
  margin: "0 0 12px",
  padding: "14px",
  borderRadius: "20px",
  background: "linear-gradient(135deg,#ecfdf5,#ffffff)",
  border: "1px solid rgba(34,197,94,0.34)",
  boxShadow: "0 0 0 3px rgba(34,197,94,0.10), 0 18px 40px rgba(34,197,94,0.14)",
};

const workCenterPriorityAlertCopy = {
  display: "grid",
  gap: "6px",
};

const workCenterPriorityAlertEyebrow = {
  color: "#15803d",
  fontSize: "11px",
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const workCenterPriorityAlertActions = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
};

const workCenterPriorityPrimaryButton = {
  border: "none",
  borderRadius: "16px",
  padding: "13px 14px",
  background: "linear-gradient(135deg,#22c55e,#16a34a)",
  color: "#ffffff",
  fontWeight: 950,
  cursor: "pointer",
};

const workCenterPrioritySecondaryButton = {
  border: "1px solid rgba(34,197,94,0.28)",
  borderRadius: "16px",
  padding: "13px 14px",
  background: "#ffffff",
  color: "#15803d",
  fontWeight: 950,
  cursor: "pointer",
};

const workCenterDashboardCard = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  minHeight: "124px",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "20px",
  background: "var(--meetro-surface-paper)",
  padding: "13px",
  display: "grid",
  gridTemplateColumns: "42px minmax(0, 1fr) 18px",
  alignItems: "center",
  gap: "10px",
  textAlign: "left",
  color: "var(--meetro-color-ink)",
  cursor: "pointer",
  boxShadow: "var(--meetro-shadow-soft)",
};

const workCenterDashboardCardPriority = {
  borderColor: "rgba(34,197,94,0.45)",
  background: "linear-gradient(135deg,#ecfdf5,#ffffff)",
  boxShadow: "0 0 0 3px rgba(34,197,94,0.12), 0 18px 38px rgba(34,197,94,0.18)",
};

const workCenterDashboardIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "15px",
  display: "grid",
  placeItems: "center",
  fontSize: "20px",
};

const workCenterDashboardCardContent = {
  minWidth: 0,
  display: "grid",
  gap: "5px",
};

const workCenterDashboardCardTitleRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  flexWrap: "wrap",
};

const workCenterDashboardCardTitle = {
  fontSize: "16px",
  lineHeight: 1.15,
  fontWeight: 950,
};

const workCenterDashboardBadge = {
  flexShrink: 0,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  padding: "4px 7px",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 950,
};

const workCenterDashboardDescription = {
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: 650,
};

const workCenterDashboardMetaLabel = {
  color: "#0f172a",
  fontWeight: 950,
};

const workCenterDashboardNextStep = {
  color: "#64748b",
  fontSize: "11px",
  lineHeight: 1.3,
  fontWeight: 800,
};

const workCenterDashboardPrimaryAction = {
  width: "fit-content",
  maxWidth: "100%",
  marginTop: "2px",
  padding: "6px 9px",
  borderRadius: "999px",
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-forest)",
  border: "1px solid var(--meetro-color-line)",
  fontSize: "11px",
  fontWeight: 950,
};

const workCenterDashboardChevron = {
  color: "#64748b",
  fontSize: "22px",
  fontWeight: 500,
};

const workCenterOpenedSection = {
  margin: "12px 0 14px",
  padding: "17px 17px calc(68px + env(safe-area-inset-bottom))",
  borderRadius: "24px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  boxShadow: "var(--meetro-shadow-soft)",
  scrollMarginTop: "76px",
};

const scheduleOpenedPage = {
  margin: "12px 0 6px",
};

const workCenterBackButton = {
  border: "none",
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-forest)",
  borderRadius: "999px",
  padding: "9px 13px",
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  fontSize: "13px",
  fontWeight: 900,
  cursor: "pointer",
  marginBottom: "10px",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  whiteSpace: "normal",
  overflowWrap: "break-word",
};

const opportunitiesCompactHeader = {
  margin: "0 0 8px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const opportunitiesCompactTitle = {
  margin: "0 0 4px",
  color: "var(--meetro-color-ink)",
  fontSize: "26px",
  lineHeight: 1.12,
  fontWeight: 950,
  letterSpacing: "-0.01em",
};

const opportunitiesCompactSummary = {
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: 850,
};

const workCenterChildHeader = {
  ...opportunitiesCompactHeader,
};

const workCenterChildTitle = {
  ...opportunitiesCompactTitle,
};

const workCenterChildSummary = {
  ...opportunitiesCompactSummary,
};

const workCenterOpenedSectionHeading = {
  display: "grid",
  gridTemplateColumns: "54px minmax(0, 1fr)",
  alignItems: "start",
  gap: "13px",
};

const workCenterOpenedSectionIcon = {
  width: "54px",
  height: "54px",
  borderRadius: "18px",
  display: "grid",
  placeItems: "center",
  fontSize: "24px",
};

const workCenterOpenedSectionEyebrow = {
  display: "block",
  color: "var(--meetro-color-wood)",
  fontSize: "10px",
  fontWeight: 950,
  letterSpacing: "0.11em",
  textTransform: "uppercase",
  marginBottom: "4px",
};

const workCenterOpenedSectionTitle = {
  margin: "0 0 5px",
  color: "var(--meetro-color-ink)",
  fontSize: "24px",
  lineHeight: 1.15,
  fontWeight: 950,
};

const workCenterOpenedSectionDescription = {
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "15px",
  lineHeight: 1.55,
  fontWeight: 650,
};

const workCenterOpenedSectionNextStep = {
  marginTop: "14px",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "16px",
  padding: "12px 14px",
  display: "grid",
  gap: "4px",
};

const workCenterOpenedSectionNextStepLabel = {
  fontSize: "10px",
  fontWeight: 950,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const workCenterOpenedSectionNextStepText = {
  color: "var(--meetro-color-ink)",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: 900,
};

const workCenterOpenedSectionActions = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "12px",
};

const workCenterOpenedSectionActionButton = {
  border: "none",
  borderRadius: "14px",
  color: "var(--meetro-color-paper)",
  padding: "11px 14px",
  fontSize: "13px",
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(15,23,42,0.14)",
};

const workCenterSubNavigation = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "18px",
  paddingTop: "16px",
  borderTop: "1px solid var(--meetro-color-line)",
};

const workCenterSubNavigationButton = {
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-muted)",
  borderRadius: "999px",
  padding: "9px 13px",
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const workCenterSubNavigationActive = {
  ...workCenterSubNavigationButton,
  background: "var(--meetro-color-sage)",
  borderColor: "var(--meetro-color-forest)",
  color: "var(--meetro-color-forest)",
};

const workCenterControlPanel = {
  background: "linear-gradient(135deg, var(--meetro-surface-warm), var(--meetro-surface-paper))",
  borderRadius: "24px",
  padding: "16px",
  boxShadow: "var(--meetro-shadow-soft)",
  border: "1px solid var(--meetro-color-line)",
  marginBottom: "16px",
};

const workCenterSectionHeader = {
  marginBottom: "10px",
};

const workCenterSectionTitle = {
  display: "block",
  color: "#0f172a",
  fontSize: "16px",
  fontWeight: 900,
};

const workCenterSectionSubtitle = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 700,
};

const workflowRail = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(86px, 1fr))",
  gap: "8px",
  overflowX: "auto",
  paddingBottom: "12px",
  marginBottom: "16px",
};

const workflowStep = {
  border: "1px solid #e2e8f0",
  background: "linear-gradient(135deg, #ffffff, #f8fafc)",
  color: "#334155",
  borderRadius: "18px",
  padding: "11px 10px",
  display: "grid",
  gap: "5px",
  justifyItems: "center",
  alignItems: "center",
  fontWeight: 900,
  fontSize: "12px",
  minHeight: "66px",
  whiteSpace: "nowrap",
  boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
};

const workflowStepActive = {
  ...workflowStep,
  background: "linear-gradient(135deg, var(--meetro-color-forest, #1f4d34), var(--meetro-color-charcoal, #172317))",
  color: "#ffffff",
  border: "1px solid #6d5dfc",
  boxShadow: "0 14px 30px rgba(31, 77, 52, 0.28)",
};

const workflowStepNumber = {
  width: "24px",
  height: "24px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.22)",
  display: "grid",
  placeItems: "center",
  fontSize: "12px",
  fontWeight: 900,
};

const businessToolsGrid = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const businessTool = {
  border: "1px solid #dbeafe",
  background: "#ffffff",
  color: "#334155",
  borderRadius: "999px",
  padding: "8px 11px",
  fontWeight: 800,
  fontSize: "12px",
  minHeight: "36px",
  boxShadow: "0 4px 10px rgba(37,99,235,0.04)",
};

const businessToolActive = {
  ...businessTool,
  background: "#f0ecff",
  border: "1px solid var(--meetro-color-charcoal, #172317)",
  color: "#4c1d95",
  boxShadow: "0 6px 14px rgba(23, 35, 23, 0.10)",
};

const dynamicSectionCard = {
  background: "linear-gradient(135deg, #ffffff, #f4f1ff)",
  scrollMarginTop: "92px",
  border: "1px solid rgba(23,35,23,0.16)",
  borderRadius: "16px",
  padding: "10px",
  margin: "10px 0",
  boxShadow: "0 7px 17px rgba(31,77,52,0.10)",
};

const dynamicSectionSchedule = {
  background: "linear-gradient(135deg, #eff6ff, #ffffff)",
  border: "1px solid rgba(37,99,235,0.20)",
  boxShadow: "0 14px 34px rgba(37,99,235,0.10)",
};

const dynamicSectionPending = {
  background: "linear-gradient(135deg, #fff7ed, #ffffff)",
  border: "1px solid rgba(249,115,22,0.22)",
  boxShadow: "0 14px 34px rgba(249,115,22,0.10)",
};

const dynamicSectionQuotes = {
  background: "linear-gradient(135deg, #f5f3ff, #ffffff)",
  border: "1px solid rgba(23,35,23,0.22)",
  boxShadow: "0 14px 34px rgba(23,35,23,0.12)",
};

const dynamicSectionActive = {
  background: "linear-gradient(135deg, #f0fdf4, #ffffff)",
  border: "1px solid rgba(34,197,94,0.22)",
  boxShadow: "0 14px 34px rgba(34,197,94,0.10)",
};

const dynamicSectionCompleted = {
  background: "linear-gradient(135deg, #f8fafc, #ffffff)",
  border: "1px solid rgba(100,116,139,0.18)",
  boxShadow: "0 14px 34px rgba(100,116,139,0.08)",
};

const dynamicSectionMaterials = {
  background: "linear-gradient(135deg, #fffbeb, #ffffff)",
  border: "1px solid rgba(245,158,11,0.25)",
  boxShadow: "0 14px 34px rgba(245,158,11,0.12)",
};

const dynamicSectionRecords = {
  background: "linear-gradient(135deg, var(--meetro-surface-sage, #eef4ea), #ffffff)",
  border: "1px solid rgba(99,102,241,0.20)",
  boxShadow: "0 14px 34px rgba(99,102,241,0.10)",
};

const dynamicSectionRevenue = {
  background: "linear-gradient(135deg, #ecfdf5, #ffffff)",
  border: "1px solid rgba(16,185,129,0.24)",
  boxShadow: "0 14px 34px rgba(16,185,129,0.12)",
};

const dispatchBadge = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "7px 11px",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #e0f2fe, var(--meetro-surface-sage, #eef4ea))",
  color: "#334155",
  fontSize: "11px",
  fontWeight: 950,
  marginBottom: "10px",
  boxShadow: "0 10px 22px rgba(15,23,42,0.08)",
};

const dynamicSectionEyebrow = {
  margin: 0,
  color: "#6d5dfc",
  fontSize: "11px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const dynamicSectionTitle = {
  margin: "6px 0 6px",
  color: "#0f172a",
  fontSize: "20px",
  fontWeight: 950,
};

const dynamicSectionText = {
  margin: 0,
  color: "#475569",
  fontSize: "12px",
  lineHeight: 1.45,
  fontWeight: 500,
};

const quoteViewOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  background: "rgba(15, 23, 42, 0.5)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "calc(env(safe-area-inset-top, 0px) + 78px) 18px calc(env(safe-area-inset-bottom, 0px) + 105px)",
  overflow: "hidden",
  overscrollBehavior: "none",
  touchAction: "none",
};

const quoteViewCard = {
  width: "min(350px, calc(100% - 42px))",
  height: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 250px)",
  maxHeight: "calc(100dvh - 250px)",
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  overscrollBehavior: "contain",
  background: "#ffffff",
  borderRadius: "26px",
  padding: "20px 20px 80px",
  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.3)",
};

const jobReportCard = {
  ...quoteViewCard,
  width: "min(520px, calc(100% - 36px))",
};

const jobReportText = {
  whiteSpace: "pre-wrap",
  margin: "0 0 14px",
  padding: "14px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#0f172a",
  fontSize: "13px",
  lineHeight: 1.55,
  fontFamily: "inherit",
};

const quoteViewHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "12px",
};

const quoteViewEyebrow = {
  margin: 0,
  color: "#6d5dfc",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const quoteViewTitle = {
  margin: "0",
  fontSize: "22px",
  color: "#0f172a",
};

const quoteViewCloseButton = {
  border: "none",
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "#4338ca",
  borderRadius: "14px",
  width: "44px",
  height: "44px",
  fontWeight: 900,
  fontSize: "20px",
  cursor: "pointer",
  flexShrink: 0,
};

const quoteViewHero = {
  background: "linear-gradient(135deg, #20185f, #6537ff)",
  minHeight: "82px",
  maxHeight: "105px",
  justifyContent: "center",
  textAlign: "center",
  color: "#ffffff",
  borderRadius: "20px",
  padding: "calc(env(safe-area-inset-top, 0px) + 95px) 18px calc(env(safe-area-inset-bottom, 0px) + 135px)",
  overflowY: "auto",
  display: "grid",
  gap: "8px",
  marginBottom: "10px",
};

const quoteViewSection = {
  background: "#f8fafc",
  borderRadius: "18px",
  padding: "12px",
  display: "grid",
  gap: "10px",
  marginBottom: "14px",
};

const quoteViewRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  color: "#334155",
};

const quoteViewTotalRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  borderTop: "1px solid #cbd5e1",
  paddingTop: "10px",
  fontSize: "18px",
  color: "#0f172a",
  fontWeight: 900,
};

const quoteViewInfoBlock = {
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "12px",
  marginBottom: "12px",
  color: "#334155",
};

const quoteViewActions = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
  marginTop: "14px",
};

const quoteViewPrimaryButton = {
  border: "none",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "#ffffff",
  borderRadius: "16px",
  padding: "13px",
  fontWeight: 900,
};

const quoteViewSecondaryButton = {
  border: "1px solid #dbeafe",
  background: "#f8fafc",
  color: "#0f172a",
  borderRadius: "16px",
  padding: "13px",
  fontWeight: 900,
};

const quoteHistoryActions = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "7px",
  marginTop: "10px",
  marginBottom: "9px",
};

const quoteHistoryActionButton = {
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "#f8fafc",
  color: "#0f172a",
  borderRadius: "14px",
  padding: "10px 8px",
  fontSize: "13px",
  fontWeight: 850,
};

const quoteHistoryFooter = {
  borderTop: "1px solid #eef2f7",
  paddingTop: "10px",
  marginTop: "10px",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  color: "#475569",
  fontWeight: "800",
  fontSize: "12px",
};

const workTabs = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: "10px",
  background: "white",
  borderRadius: "24px",
  padding: "14px",
  margin: "18px 0",
  boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
};


const operationalAlertTab = {
  border: "1px solid #fb923c",
  background: "linear-gradient(135deg, #fff7ed, #fed7aa)",
  color: "#9a3412",
  boxShadow: "0 12px 26px rgba(249,115,22,0.22)",
};

const operationalLiveTab = {
  border: "1px solid #22c55e",
  background: "linear-gradient(135deg, #dcfce7, #f0fdf4)",
  color: "#166534",
  boxShadow: "0 12px 26px rgba(34,197,94,0.22)",
};

const materialsAlertTab = {
  border: "1px solid #f59e0b",
  background: "#fffbeb",
  color: "#92400e",
  boxShadow: "0 6px 14px rgba(245,158,11,0.12)",
};

const liveTabBadge = {
  background: "#16a34a",
  color: "white",
  borderRadius: "999px",
  padding: "4px 8px",
  fontSize: "10px",
  fontWeight: "900",
  marginLeft: "8px",
};

const quoteAlertTab = {
  border: "1px solid #818cf8",
  background: "linear-gradient(135deg, var(--meetro-surface-sage, #eef4ea), #f5f3ff)",
  color: "#3730a3",
  boxShadow: "0 12px 26px rgba(99,102,241,0.24)",
};

const quoteAlertBadge = {
  marginLeft: "8px",
  display: "inline-flex",
  alignItems: "flex-start",
  justifyContent: "center",
  minWidth: "22px",
  height: "22px",
  borderRadius: "999px",
  background: "#f97316",
  color: "white",
  fontSize: "12px",
  fontWeight: "950",
};


const activeWorkflowGuide = {
  background: "linear-gradient(135deg, #eef6ff, #f8fbff)",
  border: "1px solid #bfdbfe",
  borderRadius: 18,
  padding: "14px 16px",
  margin: "14px 0",
  boxShadow: "0 10px 28px rgba(37, 99, 235, 0.08)",
};

const activeWorkflowGuideTitle = {
  display: "block",
  fontSize: 13,
  color: "#1d4ed8",
  marginBottom: 6,
};

const activeWorkflowGuideText = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.45,
  color: "#334155",
};

const workCenterAlertBanner = {
  width: "100%",
  border: "1px solid #fed7aa",
  borderRadius: "22px",
  background: "linear-gradient(135deg, #fff7ed, #ffffff)",
  color: "#7c2d12",
  padding: "14px",
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  textAlign: "left",
  margin: "14px 0",
  boxShadow: "0 12px 28px rgba(249,115,22,0.14)",
  cursor: "pointer",
};

const workCenterAlertIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "16px",
  background: "#fed7aa",
  color: "#c2410c",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  fontSize: "21px",
  flexShrink: 0,
};

const workTab = {
  border: "none",
  background: "#f8fafc",
  color: "#475569",
  borderRadius: "18px",
  padding: "12px 16px",
  fontWeight: "900",
  fontSize: "14px",
  minWidth: "108px",
  display: "inline-flex",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: "7px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const workTabActive = {
  border: "none",
  background: "linear-gradient(135deg,var(--meetro-color-forest, #1f4d34),var(--meetro-color-charcoal, #172317))",
  color: "white",
  borderRadius: "18px",
  padding: "12px 16px",
  fontWeight: "950",
  fontSize: "14px",
  minWidth: "108px",
  display: "inline-flex",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: "7px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "0 14px 30px rgba(31,77,52,0.28)",
};



const sectionHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "9px",
  marginBottom: "10px",
};

const smallPrimaryButton = {
  border: "none",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  borderRadius: "999px",
  padding: "10px 10px",
  fontWeight: "900",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const scheduleContentSection = {
  marginBottom: "36px",
  display: "grid",
  gap: "12px",
  paddingBottom: "calc(128px + env(safe-area-inset-bottom))",
  scrollPaddingBottom: "calc(150px + env(safe-area-inset-bottom))",
};

const scheduleCompactHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  padding: "4px 0 2px",
};

const scheduleCompactTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "24px",
  lineHeight: 1.1,
  fontWeight: "950",
};

const scheduleCompactPurpose = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.35,
  fontWeight: "750",
};

const schedulePrimaryAction = {
  ...smallPrimaryButton,
  padding: "11px 15px",
  boxShadow: "0 12px 26px rgba(31,77,52,0.22)",
};




const visitOutcomeGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
  marginTop: "16px",
};

const visitOutcomeButton = {
  width: "100%",
  border: "1px solid rgba(15, 23, 42, 0.12)",
  borderRadius: "16px",
  padding: "14px 16px",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 800,
  textAlign: "left",
  cursor: "pointer",
};

const visitOutcomeDangerButton = {
  ...visitOutcomeButton,
  border: "1px solid rgba(239, 68, 68, 0.25)",
  background: "rgba(254, 242, 242, 0.95)",
  color: "#991b1b",
};

const workflowTimelineList = {
  display: "grid",
  gap: "12px",
};

const workflowTimelineItem = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  background: "#ffffff",
  border: "1px solid rgba(226, 232, 240, 0.95)",
  borderRadius: "18px",
  padding: "14px",
  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.06)",
};

const workflowTimelineDot = {
  width: "38px",
  height: "38px",
  borderRadius: "14px",
  background: "#f8fafc",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  flexShrink: 0,
};

const workflowTimelineContent = {
  flex: 1,
  minWidth: 0,
};

const workflowTimelineDate = {
  display: "block",
  marginTop: "6px",
  color: "#64748b",
};

const manualScheduleHelpButton = {
  marginTop: "10px",
  border: "none",
  background: "#fed7aa",
  color: "#9a3412",
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const manualScheduleCardNotice = {
  marginTop: "10px",
  background: "#fff7ed",
  border: "1px solid #fdba74",
  color: "#9a3412",
  borderRadius: "14px",
  padding: "10px 12px",
  fontSize: "12px",
  fontWeight: "750",
  lineHeight: 1.45,
};

const manualScheduleNotice = {
  marginTop: "16px",
  background: "#fff7ed",
  border: "1px solid #fdba74",
  borderRadius: "18px",
  padding: "14px",
};

const manualScheduleNoticeText = {
  margin: "8px 0 0",
  color: "#9a3412",
  lineHeight: 1.5,
  fontWeight: "600",
  fontSize: "13px",
};

const manualCustomerFieldsCard = {
  display: "grid",
  gap: "10px",
  padding: "12px",
  borderRadius: "16px",
  border: "1px solid rgba(23, 35, 23, 0.16)",
  background: "linear-gradient(135deg, #ffffff, #f8f5ff)",
};

const manualCustomerInviteNotice = {
  padding: "10px 12px",
  borderRadius: "14px",
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "#4338ca",
  fontSize: "13px",
  fontWeight: "800",
  lineHeight: 1.35,
};

const scheduleFormCard = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "11px",
  padding: "10px",
  display: "grid",
  gap: "10px",
  marginBottom: "10px",
};

const scheduleFormGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const scheduleWorkflowStack = {
  display: "grid",
  gap: "14px",
};

const scheduleWorkflowSection = {
  display: "grid",
  gap: "10px",
};

const scheduleWorkflowHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
};

const scheduleWorkflowTitle = {
  margin: 0,
  fontSize: "17px",
  lineHeight: 1.15,
  color: "#0f172a",
};

const scheduleWorkflowCount = {
  minWidth: "30px",
  height: "30px",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-charcoal, #172317)",
  fontWeight: "900",
  fontSize: "13px",
};

const scheduleWorkflowEmpty = {
  border: "1px dashed #cbd5e1",
  borderRadius: "16px",
  padding: "12px",
  color: "#64748b",
  background: "#f8fafc",
  fontWeight: "700",
  fontSize: "13px",
  lineHeight: 1.4,
};

const scheduleNextStepNotice = {
  margin: "0 0 12px",
  padding: "11px 12px",
  borderRadius: "14px",
  background: "#f5f3ff",
  color: "#4c1d95",
  border: "1px solid rgba(23, 35, 23, 0.18)",
  fontSize: "13px",
  fontWeight: "750",
  lineHeight: 1.4,
};

const scheduleInput = {
  width: "100%",
  border: "1px solid #dbe3ef",
  borderRadius: "14px",
  padding: "13px",
  fontSize: "16px",
  lineHeight: 1.25,
  boxSizing: "border-box",
};

const scheduleTextarea = {
  ...scheduleInput,
  minHeight: "96px",
  resize: "vertical",
};

const saveScheduleButton = {
  border: "none",
  background: "#111827",
  color: "white",
  borderRadius: "9px",
  padding: "13px",
  fontWeight: "900",
  cursor: "pointer",
};

const scheduleCardTop = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
};

const scheduleTimeBlock = {
  width: "82px",
  minWidth: "82px",
  borderRadius: "10px",
  background: "#f3f0ff",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "9px 8px",
  textAlign: "center",
  display: "grid",
  gap: "4px",
};

const scheduleSourceRow = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "10px",
};

const sourcePill = {
  background: "#f8fafc",
  color: "#475569",
  borderRadius: "999px",
  padding: "6px 9px",
  fontSize: "12px",
  fontWeight: "800",
};

const scheduleReminderRow = {
  display: "flex",
  gap: "7px",
  flexWrap: "wrap",
  marginTop: "8px",
};

const scheduleReminderPill = {
  background: "#ecfeff",
  color: "#0e7490",
  border: "1px solid #a5f3fc",
  borderRadius: "999px",
  padding: "5px 8px",
  fontSize: "11px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const scheduleFilterNotice = {
  margin: "0 0 12px",
  padding: "10px 12px",
  borderRadius: "14px",
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  fontSize: "13px",
  fontWeight: "900",
};

const waitingConfirmationPill = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "10px 12px",
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
  fontSize: "13px",
  fontWeight: "900",
};

const appointmentReminderNoticeCard = {
  margin: "0 0 14px",
  padding: "14px",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "8px",
};

const appointmentReminderSettingsButton = {
  border: "none",
  borderRadius: "14px",
  padding: "11px 12px",
  background: "var(--meetro-color-charcoal, #172317)",
  color: "#ffffff",
  fontWeight: 900,
  cursor: "pointer",
};

const appointmentReminderContinueButton = {
  border: "1px solid #fbbf24",
  borderRadius: "14px",
  padding: "11px 12px",
  background: "#ffffff",
  color: "#92400e",
  fontWeight: 900,
  cursor: "pointer",
};

const scheduleDeliveryChoiceCard = {
  margin: "0 0 14px",
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid rgba(79, 70, 229, 0.16)",
  background: "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(238,242,255,0.9))",
  color: "#172033",
  display: "grid",
  gap: "12px",
  boxShadow: "0 18px 40px rgba(79, 70, 229, 0.08)",
  boxSizing: "border-box",
};

const scheduleDeliveryChoiceText = {
  margin: "7px 0 0",
  color: "#475569",
  lineHeight: 1.45,
  fontWeight: "700",
  fontSize: "13px",
};

const scheduleDeliverySummary = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  padding: "10px 12px",
  borderRadius: "14px",
  background: "rgba(255, 255, 255, 0.74)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "850",
};

const scheduleDeliveryActions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "8px",
};

const scheduleDeliveryPrimaryButton = {
  border: "none",
  borderRadius: "14px",
  padding: "12px",
  background: "var(--meetro-color-charcoal, #172317)",
  color: "#ffffff",
  fontWeight: 900,
  cursor: "pointer",
};

const completedPill = {
  background: "#dcfce7",
  color: "#15803d",
  borderRadius: "999px",
  padding: "7px 10px",
  fontSize: "12px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const scheduleCardActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "10px",
};

const secondaryScheduleBtn = {
  border: "none",
  background: "var(--meetro-color-sage)",
  color: "var(--meetro-color-forest)",
  borderRadius: "9px",
  padding: "8px 9px",
  fontWeight: "800",
  cursor: "pointer",
};

const startScheduleBtn = {
  border: "none",
  background: "var(--meetro-gradient-community-action)",
  color: "var(--meetro-color-paper)",
  borderRadius: "9px",
  padding: "8px 9px",
  fontWeight: "800",
  cursor: "pointer",
};

const completeScheduleBtn = {
  border: "none",
  background: "#dcfce7",
  color: "#15803d",
  borderRadius: "9px",
  padding: "8px 9px",
  fontWeight: "800",
  cursor: "pointer",
};

const deleteScheduleBtn = {
  border: "none",
  background: "#fee2e2",
  color: "#dc2626",
  borderRadius: "9px",
  padding: "8px 9px",
  fontWeight: "800",
  cursor: "pointer",
};

const inlineCircleDeleteButton = {
  width: "30px",
  height: "30px",
  minWidth: "30px",
  border: "none",
  borderRadius: "999px",
  background: "rgba(15, 23, 42, 0.78)",
  color: "#ffffff",
  fontSize: "20px",
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  justifySelf: "end",
};

const confirmOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.35)",
  zIndex: 10020,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding:
    "max(24px, calc(env(safe-area-inset-top, 0px) + 24px)) max(16px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 24px) max(16px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
};

const confirmCard = {
  width: "100%",
  maxWidth: "360px",
  maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 72px)",
  overflowY: "auto",
  background: "white",
  borderRadius: "18px",
  padding: "16px",
  boxShadow: "0 10px 45px rgba(15,23,42,0.22)",
};

const evaluationModalCard = {
  ...confirmCard,
  maxWidth: "460px",
  borderRadius: "20px",
  padding: "16px",
  display: "grid",
  gap: "12px",
};

const evaluationModalTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "22px",
  fontWeight: "950",
};

const evaluationModalText = {
  margin: 0,
  color: "#64748b",
  fontSize: "14px",
  fontWeight: "800",
};

const evaluationVisitContext = {
  padding: "10px 12px",
  borderRadius: "14px",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "900",
};

const evaluationVisitSection = {
  display: "grid",
  gap: "10px",
  border: "1px solid rgba(226, 232, 240, 0.95)",
  borderRadius: "18px",
  padding: "12px",
  background: "#ffffff",
};

const evaluationVisitSectionHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const evaluationInlineSectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "8px",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: "950",
};

const evaluationVisitSectionTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "16px",
  fontWeight: "950",
};

const evaluationVisitSectionText = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "700",
  lineHeight: 1.35,
};

const evaluationAddPhotoButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  borderRadius: "999px",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "#ffffff",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: "900",
  cursor: "pointer",
};

const disabledEvaluationAddPhotoButton = {
  background: "#e2e8f0",
  color: "#64748b",
  cursor: "not-allowed",
};

const evaluationPhotoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(74px, 1fr))",
  gap: "10px",
};

const evaluationPhotoCard = {
  position: "relative",
  borderRadius: "14px",
  overflow: "hidden",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  aspectRatio: "1 / 1",
};

const evaluationPhotoThumb = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const evaluationPhotoMetadataThumb = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: "4px",
  padding: "8px",
  textAlign: "center",
  color: "#475569",
  fontSize: "18px",
  fontWeight: "900",
};

const evaluationPhotoRemove = {
  position: "absolute",
  top: "6px",
  right: "6px",
  width: "26px",
  height: "26px",
  border: "none",
  borderRadius: "999px",
  background: "rgba(15, 23, 42, 0.78)",
  color: "#ffffff",
  fontSize: "18px",
  lineHeight: 1,
  cursor: "pointer",
};

const evaluationPhotoEmpty = {
  border: "1px dashed #cbd5e1",
  borderRadius: "14px",
  padding: "12px",
  background: "#f8fafc",
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "800",
};

const evaluationFieldLabel = {
  margin: "4px 0 -6px",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "900",
};

const evaluationTextarea = {
  width: "100%",
  minHeight: "156px",
  border: "1px solid #cbd5e1",
  borderRadius: "16px",
  padding: "12px",
  fontFamily: "inherit",
  fontSize: "16px",
  lineHeight: 1.45,
  resize: "vertical",
  overflow: "hidden",
  fieldSizing: "content",
  boxSizing: "border-box",
};

const evaluationCompactTextarea = {
  ...evaluationTextarea,
  minHeight: "82px",
};

const visitDetailPage = {
  display: "grid",
  gap: "14px",
  paddingTop: "max(12px, env(safe-area-inset-top))",
  paddingBottom: "calc(160px + env(safe-area-inset-bottom))",
  scrollPaddingBottom: "calc(190px + env(safe-area-inset-bottom))",
};

const visitDetailHero = {
  display: "grid",
  gap: "12px",
  padding: "16px",
  borderRadius: "22px",
  border: "1px solid rgba(23, 35, 23, 0.16)",
  background: "linear-gradient(135deg, #ffffff, #f8f5ff)",
  boxShadow: "0 14px 34px rgba(31, 77, 52, 0.10)",
};

const jobWorkspaceHero = {
  ...visitDetailHero,
  background: "linear-gradient(135deg, var(--meetro-surface-paper), var(--meetro-surface-warm))",
  border: "1px solid var(--meetro-color-line)",
  boxShadow: "var(--meetro-shadow-soft)",
};

const jobWorkflowFirstHero = {
  ...jobWorkspaceHero,
  gap: "16px",
  border: "1px solid var(--meetro-color-line)",
  boxShadow: "var(--meetro-shadow-lifted)",
};

const jobPersistentContextRegion = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "12px",
  padding: "14px",
  borderRadius: "20px",
  border: "1px solid rgba(226, 232, 240, 0.95)",
  background: "rgba(255, 255, 255, 0.88)",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
  minWidth: 0,
};

const jobPersistentContextIdentity = {
  minWidth: 0,
};

const jobPersistentContextCustomer = {
  margin: 0,
  color: "#0f172a",
  fontSize: "clamp(22px, 6vw, 30px)",
  lineHeight: 1.08,
  fontWeight: "1000",
  overflowWrap: "anywhere",
};

const jobPersistentContextFocus = {
  display: "grid",
  gap: "10px",
  minWidth: 0,
};

const jobPersistentContextNext = {
  display: "grid",
  gap: "4px",
  minWidth: 0,
};

const jobPersistentContextNextLabel = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "950",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const jobPersistentContextNextText = {
  color: "#0f172a",
  fontSize: "15px",
  lineHeight: 1.25,
  fontWeight: "950",
  overflowWrap: "anywhere",
};

const jobPersistentContextAction = {
  border: "1px solid rgba(31,77,52,0.18)",
  borderRadius: "12px",
  background: "#ffffff",
  justifySelf: "start",
  color: "#3730a3",
  padding: "8px 11px",
  fontSize: "12px",
  fontWeight: "950",
  cursor: "pointer",
};

const jobDynamicFocusArea = {
  scrollMarginTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
};

const workCenterCanonicalLifecycleSection = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid rgba(15, 23, 42, 0.12)",
  background: "#ffffff",
  color: "#0f172a",
  minWidth: 0,
};

const workCenterCanonicalLifecycleHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "10px",
  flexWrap: "wrap",
  minWidth: 0,
};

const workCenterCanonicalLifecycleTitle = {
  margin: "4px 0 0",
  color: "#0f172a",
  fontSize: "16px",
  lineHeight: 1.2,
  fontWeight: "950",
};

const workCenterCanonicalLifecycleBadge = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  border: "1px solid rgba(31, 77, 52, 0.18)",
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "6px 10px",
  fontSize: "11px",
  fontWeight: "950",
  whiteSpace: "nowrap",
};

const workCenterCanonicalLifecycleNotice = {
  margin: 0,
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "800",
};

const workCenterCanonicalLifecycleGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
  gap: "10px",
  minWidth: 0,
};

const workCenterCanonicalLifecycleCard = {
  display: "grid",
  gap: "7px",
  alignContent: "start",
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  minWidth: 0,
};

const workCenterCanonicalLifecycleLabel = {
  color: "#475569",
  fontSize: "12px",
  fontWeight: "950",
};

const workCenterCanonicalLifecycleValue = {
  color: "#0f172a",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: "850",
  overflowWrap: "anywhere",
};

const workCenterCanonicalConcernText = {
  ...workCenterCanonicalLifecycleValue,
  fontWeight: "900",
};

const workCenterCanonicalClarificationList = {
  display: "grid",
  gap: "6px",
  margin: "4px 0 0",
  padding: "0 0 0 18px",
  color: "#475569",
  fontSize: "12px",
  lineHeight: 1.4,
  fontWeight: "800",
  overflowWrap: "anywhere",
};

const workCenterCanonicalParticipantList = {
  display: "grid",
  gap: "7px",
  margin: 0,
  padding: 0,
  listStyle: "none",
  minWidth: 0,
};

const workCenterCanonicalParticipantItem = {
  display: "grid",
  gap: "3px",
  color: "#0f172a",
  fontSize: "13px",
  lineHeight: 1.3,
  fontWeight: "900",
  overflowWrap: "anywhere",
};

const workCenterCanonicalParticipantRoles = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "800",
};

const jobWorkflowServiceSummary = {
  margin: "8px 0 0",
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "900",
  lineHeight: 1.35,
};

const jobWorkflowCurrentStepCard = {
  display: "grid",
  gap: "12px",
  padding: "18px",
  borderRadius: "22px",
  border: "2px solid rgba(23, 35, 23, 0.18)",
  background: "linear-gradient(135deg, #f5f3ff, #ffffff 72%)",
  color: "#0f172a",
  boxShadow: "0 16px 34px rgba(31, 77, 52, 0.08)",
};

const jobWorkflowPrimaryButton = {
  ...startScheduleBtn,
  justifySelf: "start",
  width: "min(100%, 360px)",
  minWidth: 0,
  maxWidth: "100%",
  borderRadius: "16px",
  boxShadow: "0 12px 26px rgba(31, 77, 52, 0.18)",
};

const jobWorkflowActionStack = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
  maxWidth: "100%",
};

const jobWorkflowSecondaryButton = {
  border: "1px solid #c4b5fd",
  background: "#ffffff",
  color: "#5b21b6",
  borderRadius: "9px",
  padding: "8px 9px",
  fontSize: "13px",
  fontWeight: "900",
  cursor: "pointer",
};

const jobWorkflowStepLabel = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "950",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const jobWorkflowStepStatus = {
  color: "#0f172a",
  fontSize: "28px",
  lineHeight: 1.05,
  fontWeight: "1000",
};

const jobWorkflowNextAction = {
  color: "#1e293b",
  fontSize: "18px",
  lineHeight: 1.25,
  fontWeight: "950",
};

const jobWorkflowSummaryStack = {
  display: "grid",
  gap: "9px",
  padding: "4px 0",
};

const jobWorkflowContextLine = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  padding: "10px 12px",
  borderRadius: "14px",
  background: "rgba(255, 255, 255, 0.86)",
  border: "1px solid rgba(226, 232, 240, 0.9)",
  color: "#475569",
  fontSize: "13px",
  fontWeight: "850",
};

const jobWorkflowInlineForm = {
  display: "grid",
  gap: "10px",
  padding: "12px",
  borderRadius: "16px",
  background: "rgba(255, 255, 255, 0.82)",
  border: "1px solid rgba(226, 232, 240, 0.95)",
};

const jobWorkflowFormGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "10px",
};

const jobWorkflowFieldLabel = {
  display: "grid",
  gap: "6px",
  color: "#475569",
  fontSize: "12px",
  fontWeight: "900",
};

const jobWorkflowNotesInput = {
  width: "100%",
  border: "1px solid #dbe4f0",
  borderRadius: "14px",
  padding: "12px",
  fontSize: "14px",
  color: "#0f172a",
  background: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
  minHeight: "76px",
  resize: "vertical",
};

const jobWorkflowCheckboxLine = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "900",
};

const jobWorkflowFormActions = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
};

const jobWorkflowManualActions = {
  display: "grid",
  gap: "9px",
  padding: "14px",
  borderRadius: "16px",
  background: "rgba(255, 255, 255, 0.82)",
  border: "1px solid rgba(226, 232, 240, 0.95)",
};

const jobWorkflowManualActionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
  gap: "8px",
};

const jobWorkflowManualActionButton = {
  border: "1px solid #c4b5fd",
  borderRadius: "14px",
  background: "#ffffff",
  color: "#5b21b6",
  padding: "11px 12px",
  fontSize: "13px",
  fontWeight: "950",
  cursor: "pointer",
};

const jobWorkflowGpsHint = {
  margin: 0,
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.4,
  fontWeight: "750",
};

const jobWorkspaceHeaderRow = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const jobWorkspaceEyebrow = {
  display: "inline-flex",
  marginBottom: "6px",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "12px",
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const jobWorkspaceAddress = {
  margin: "6px 0 0",
  color: "#475569",
  fontSize: "14px",
  fontWeight: "800",
  lineHeight: 1.35,
};

const jobWorkspaceStatusPill = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "8px 12px",
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-charcoal, #172317)",
  border: "1px solid rgba(31,77,52,0.18)",
  fontSize: "12px",
  fontWeight: "950",
  whiteSpace: "nowrap",
};

const jobWorkspaceNextStepCard = {
  display: "grid",
  gap: "8px",
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid rgba(23, 35, 23, 0.18)",
  background: "linear-gradient(135deg, #f5f3ff, var(--meetro-surface-sage, #eef4ea))",
  color: "#312e81",
};

const jobWorkspaceSummaryGrid = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const jobWorkspaceFactCard = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "5px",
  padding: "12px",
  borderRadius: "16px",
  background: "#ffffff",
  border: "1px solid rgba(226, 232, 240, 0.95)",
  color: "#334155",
  fontSize: "13px",
  fontWeight: 850,
};

const jobWorkspaceActionRow = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const jobWorkspaceDisclosureStack = {
  display: "grid",
  gap: "10px",
};

const jobWorkspaceDisclosure = {
  border: "1px solid rgba(226, 232, 240, 0.95)",
  borderRadius: "18px",
  background: "#ffffff",
  boxShadow: "0 10px 22px rgba(15, 23, 42, 0.05)",
  overflow: "hidden",
};

const jobWorkspaceSummary = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  padding: "14px",
  cursor: "pointer",
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "950",
  listStyle: "none",
};

const jobWorkspaceDisclosureText = {
  margin: 0,
  padding: "0 14px 14px",
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "750",
  lineHeight: 1.45,
};

const jobSupportingDetailsPanel = {
  display: "grid",
  gap: "10px",
  padding: "12px",
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid rgba(226, 232, 240, 0.95)",
  boxShadow: "0 10px 22px rgba(15, 23, 42, 0.05)",
};

const jobSupportingDetailsHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: "900",
};

const jobSupportingChipRow = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const jobSupportingChip = {
  border: "1px solid #dbe4f0",
  borderRadius: "999px",
  background: "#f8fafc",
  color: "#334155",
  padding: "9px 12px",
  fontSize: "13px",
  fontWeight: "900",
  cursor: "pointer",
};

const jobSupportingChipActive = {
  background: "#f5f3ff",
  border: "1px solid #c4b5fd",
  color: "#5b21b6",
};

const jobSupportingMoreDisclosure = {
  display: "grid",
  gap: "8px",
};

const jobSupportingMoreSummary = {
  width: "fit-content",
  border: "1px solid #dbe4f0",
  borderRadius: "999px",
  background: "#ffffff",
  color: "#475569",
  padding: "8px 12px",
  fontSize: "13px",
  fontWeight: "900",
  cursor: "pointer",
  listStyle: "none",
};

const jobSupportingSlimDisclosure = {
  border: "1px solid rgba(226, 232, 240, 0.95)",
  borderRadius: "16px",
  background: "#ffffff",
  overflow: "hidden",
};

const jobSupportingSlimSummary = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  padding: "12px 14px",
  color: "#475569",
  fontSize: "13px",
  fontWeight: "950",
  cursor: "pointer",
  listStyle: "none",
};

const jobSupportingReadOnlyHint = {
  color: "#94a3b8",
  fontSize: "11px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const jobSupportingSlimBody = {
  display: "grid",
  gap: "10px",
  padding: "0 12px 12px",
};

const jobDetailCompactGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
  padding: "0 14px 14px",
};

const jobDetailCompactItem = {
  display: "grid",
  gap: "4px",
  padding: "11px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "850",
  textAlign: "left",
  cursor: "pointer",
};

const jobDetailCompactItemActive = {
  background: "#f5f3ff",
  border: "1px solid #c4b5fd",
  color: "#4c1d95",
};

const jobScopedDetailPanel = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  borderRadius: "20px",
  background: "#ffffff",
  border: "1px solid rgba(23, 35, 23, 0.18)",
  boxShadow: "0 12px 28px rgba(31, 77, 52, 0.08)",
};

const jobScopedDetailHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  color: "#0f172a",
};

const jobScopedDetailBody = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const jobScopedList = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const jobScopedListItem = {
  display: "grid",
  gap: "4px",
  padding: "11px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "800",
};

const jobHistoryReadOnlyPanel = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  borderRadius: "20px",
  background: "#ffffff",
  border: "1px solid rgba(226, 232, 240, 0.95)",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
};

const jobHistoryDocumentActions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
  gap: "8px",
};

const jobHistoryDocumentButton = {
  width: "100%",
  minHeight: "44px",
  border: "1px solid #cbd5e1",
  borderRadius: "14px",
  background: "#ffffff",
  color: "#334155",
  padding: "10px 11px",
  fontSize: "12px",
  fontWeight: "950",
  cursor: "pointer",
  textAlign: "center",
};

const jobHistoryActionNotice = {
  margin: 0,
  padding: "10px 12px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "13px",
  fontWeight: "800",
  lineHeight: 1.4,
  whiteSpace: "pre-wrap",
};

const jobHistoryReasoningTrail = {
  display: "grid",
  gap: "10px",
  padding: "12px",
  borderRadius: "18px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const jobHistoryReasoningHeader = {
  display: "grid",
  gap: "4px",
  color: "#0f172a",
  fontSize: "13px",
  fontWeight: "950",
};

const jobHistoryRecordSection = {
  display: "grid",
  gap: "7px",
  padding: "11px",
  borderRadius: "14px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "850",
  lineHeight: 1.4,
};

const jobHistoryRecordList = {
  margin: 0,
  paddingLeft: "18px",
  display: "grid",
  gap: "5px",
};

const jobHistoryEmptyText = {
  color: "#64748b",
};

const jobHistoryReadOnlyGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: "10px",
};

const jobHistoryReadOnlySection = {
  display: "grid",
  gap: "5px",
  padding: "11px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "800",
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};

const jobWorkspacePanel = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  paddingBottom: "calc(140px + env(safe-area-inset-bottom))",
  scrollPaddingBottom: "calc(164px + env(safe-area-inset-bottom))",
};

const jobTimeline = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  padding: "12px",
  borderRadius: "18px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
};

const jobTimelineStep = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "7px 10px",
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-muted)",
  border: "1px solid var(--meetro-color-line)",
  fontSize: "12px",
  fontWeight: "900",
};

const jobTimelineStepDone = {
  ...jobTimelineStep,
  background: "#ecfdf5",
  color: "#047857",
  border: "1px solid #bbf7d0",
};

const jobSavedTimelinePanel = {
  display: "flex",
  flexDirection: "column",
  gap: "9px",
  padding: "12px",
  borderRadius: "18px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-ink)",
  fontSize: "14px",
  fontWeight: "900",
};

const jobSavedTimelineList = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const jobSavedTimelineItem = {
  display: "flex",
  flexDirection: "column",
  gap: "3px",
  padding: "10px",
  borderRadius: "14px",
  background: "var(--meetro-surface-warm)",
  border: "1px solid var(--meetro-color-line)",
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  fontWeight: "850",
};

const jobListHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  padding: "14px",
  borderRadius: "20px",
  background: "var(--meetro-surface-paper)",
  border: "1px solid var(--meetro-color-line)",
  boxShadow: "var(--meetro-shadow-soft)",
};

const jobMenuTabRow = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
  padding: "6px",
  borderRadius: "18px",
  background: "var(--meetro-surface-warm)",
  border: "1px solid var(--meetro-color-line)",
};

const jobMenuTabButton = {
  border: "1px solid transparent",
  borderRadius: "14px",
  background: "transparent",
  color: "var(--meetro-color-muted)",
  minHeight: "44px",
  padding: "10px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  fontSize: "14px",
  fontWeight: "950",
  cursor: "pointer",
};

const jobMenuTabButtonActive = {
  background: "var(--meetro-surface-paper)",
  border: "1px solid var(--meetro-color-line)",
  color: "var(--meetro-color-ink)",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.08)",
};

const jobMenuTabCount = {
  minWidth: "24px",
  height: "24px",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--meetro-color-sage)",
  color: "var(--meetro-color-forest)",
  fontSize: "12px",
  fontWeight: "950",
};

const jobListTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "22px",
  fontWeight: "950",
};

const jobListSubtitle = {
  margin: "5px 0 0",
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  fontWeight: "750",
  lineHeight: 1.45,
};

const jobCountPill = {
  minWidth: "36px",
  height: "36px",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--meetro-color-sage)",
  color: "var(--meetro-color-forest)",
  fontWeight: "950",
};

const jobListGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "14px",
};

const jobListCard = {
  width: "100%",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  borderRadius: "22px",
  padding: "15px",
  textAlign: "left",
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
  cursor: "pointer",
  boxShadow: "var(--meetro-shadow-soft)",
};

const jobListCardMain = {
  minWidth: 0,
  display: "grid",
  gap: "6px",
};

const jobListCustomer = {
  color: "var(--meetro-color-ink)",
  fontSize: "19px",
  lineHeight: 1.1,
  fontWeight: "950",
};

const jobListMeta = {
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: "750",
};

const jobHistorySourceLabel = {
  width: "fit-content",
  color: "#9a3412",
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  borderRadius: "999px",
  padding: "4px 8px",
  fontSize: "11px",
  fontWeight: "900",
  lineHeight: 1.2,
};

const jobListStatus = {
  width: "fit-content",
  maxWidth: "100%",
  color: "var(--meetro-color-forest)",
  background: "var(--meetro-color-sage)",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "999px",
  padding: "7px 10px",
  fontSize: "13px",
  fontWeight: "900",
  lineHeight: 1.25,
};

const jobListNextStep = {
  color: "var(--meetro-color-forest)",
  fontSize: "13px",
  fontWeight: "950",
  lineHeight: 1.35,
};

const jobListAction = {
  justifySelf: "start",
  borderRadius: "14px",
  padding: "11px 14px",
  background: "var(--meetro-gradient-community-action)",
  color: "var(--meetro-color-paper)",
  fontSize: "13px",
  fontWeight: "950",
  whiteSpace: "nowrap",
};

const jobProgressChecklist = {
  display: "flex",
  flexWrap: "wrap",
  gap: "7px",
  marginTop: "5px",
};

const jobProgressItem = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  borderRadius: "999px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-muted)",
  padding: "6px 9px",
  fontSize: "11px",
  fontWeight: "900",
};

const jobProgressItemDone = {
  borderColor: "#c4b5fd",
  background: "var(--meetro-color-sage)",
  color: "var(--meetro-color-forest)",
};

const jobListEmpty = {
  border: "1px dashed var(--meetro-color-line)",
  borderRadius: "20px",
  padding: "18px",
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-muted)",
  fontSize: "14px",
  fontWeight: "800",
  lineHeight: 1.45,
};

const workflowShortcutDisclosure = {
  border: "1px solid rgba(226, 232, 240, 0.95)",
  borderRadius: "20px",
  background: "#ffffff",
  padding: "12px",
};

const workflowShortcutSummary = {
  cursor: "pointer",
  color: "#475569",
  fontSize: "14px",
  fontWeight: "950",
  padding: "2px 2px 12px",
};

const visitDetailTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "24px",
  lineHeight: 1.12,
  fontWeight: "950",
};

const visitDetailMetaGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
};

const visitDetailMetaCell = {
  display: "grid",
  gap: "4px",
  padding: "10px",
  borderRadius: "15px",
  background: "rgba(255, 255, 255, 0.78)",
  border: "1px solid rgba(226, 232, 240, 0.9)",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "800",
};

const visitDetailNotes = {
  margin: 0,
  padding: "12px",
  borderRadius: "16px",
  background: "#f8fafc",
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "750",
};

const visitEvaluationHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  padding: "14px",
  borderRadius: "20px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
};

const visitEvaluationTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "20px",
  fontWeight: "950",
};

const visitEvaluationHelp = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "750",
};

const evaluationSaveNoticeCard = {
  padding: "12px 14px",
  borderRadius: "16px",
  border: "1px solid rgba(34, 197, 94, 0.28)",
  background: "#ecfdf5",
  color: "#047857",
  fontSize: "14px",
  fontWeight: "900",
  boxShadow: "0 10px 24px rgba(16, 185, 129, 0.12)",
};

const evaluationSaveErrorCard = {
  ...evaluationSaveNoticeCard,
  border: "1px solid rgba(239, 68, 68, 0.28)",
  background: "#fef2f2",
  color: "#b91c1c",
  boxShadow: "0 10px 24px rgba(239, 68, 68, 0.12)",
};

const evaluationBottomToast = {
  position: "fixed",
  left: "50%",
  bottom: "calc(174px + env(safe-area-inset-bottom))",
  transform: "translateX(-50%)",
  zIndex: 10050,
  width: "min(420px, calc(100% - 28px))",
  padding: "12px 14px",
  borderRadius: "16px",
  border: "1px solid rgba(34, 197, 94, 0.28)",
  background: "rgba(236, 253, 245, 0.98)",
  color: "#047857",
  fontSize: "14px",
  fontWeight: "950",
  textAlign: "center",
  boxShadow: "0 18px 42px rgba(15, 23, 42, 0.18)",
  pointerEvents: "none",
};

const evaluationBottomToastError = {
  border: "1px solid rgba(239, 68, 68, 0.3)",
  background: "rgba(254, 242, 242, 0.98)",
  color: "#b91c1c",
};

const visitWorkItemList = {
  display: "grid",
  gap: "12px",
};

const visitWorkItemCard = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  borderRadius: "22px",
  border: "1px solid rgba(226, 232, 240, 0.95)",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
};

const visitWorkItemHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
};

const visitNestedSection = {
  display: "grid",
  gap: "9px",
  padding: "10px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const visitNestedHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
  color: "#0f172a",
};

const visitNestedGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr)) auto auto",
  gap: "8px",
  alignItems: "center",
};

const materialLineTotalPill = {
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  borderRadius: "12px",
  padding: "9px 10px",
  fontSize: "12px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const materialsTotalSummary = {
  justifySelf: "end",
  borderRadius: "14px",
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-charcoal, #172317)",
  padding: "10px 12px",
  fontSize: "13px",
  fontWeight: "900",
};

const visitMeasurementGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr)) auto",
  gap: "8px",
  alignItems: "center",
};

const miniInlineButton = {
  border: "1px solid rgba(31,77,52,0.18)",
  background: "var(--meetro-surface-sage, #eef4ea)",
  color: "var(--meetro-color-charcoal, #172317)",
  borderRadius: "999px",
  padding: "7px 10px",
  fontSize: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const visitDetailActions = {
  position: "sticky",
  bottom: "calc(116px + env(safe-area-inset-bottom))",
  zIndex: 80,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
  padding: "12px 12px calc(12px + env(safe-area-inset-bottom))",
  borderRadius: "20px",
  border: "1px solid rgba(226, 232, 240, 0.95)",
  background: "rgba(255,255,255,0.96)",
  backdropFilter: "blur(14px)",
  boxShadow: "0 14px 34px rgba(15,23,42,0.12)",
  pointerEvents: "auto",
};

const evaluationSelect = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: "16px",
  padding: "12px",
  fontFamily: "inherit",
  fontSize: "15px",
  background: "#ffffff",
  boxSizing: "border-box",
};

const evaluationSelectionPanel = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
  padding: "12px",
  border: "1px solid #dbeafe",
  borderRadius: "18px",
  background: "#eff6ff",
};

const evaluationSelectionHint = {
  gridColumn: "1 / -1",
  margin: 0,
  color: "#1e40af",
  fontSize: "12px",
  fontWeight: "800",
};

const evaluationRequirementPreview = {
  gridColumn: "1 / -1",
  display: "grid",
  gap: "8px",
  padding: "10px",
  borderRadius: "14px",
  border: "1px solid #bfdbfe",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "13px",
};

const evaluationRequirementList = {
  margin: 0,
  paddingLeft: "18px",
  display: "grid",
  gap: "4px",
  color: "#334155",
};

const evaluationRequirementEmpty = {
  margin: 0,
  color: "#475569",
  fontWeight: "700",
};

const confirmActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "9px",
};

const activeJobsList = {
  display: "grid",
  gap: "9px",
};

const jobCard = {
  width: "100%",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  borderRadius: "18px",
  padding: "9px",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "var(--meetro-shadow-soft)",
};

const jobCardTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "9px",
  alignItems: "flex-start",
};

const jobMeta = {
  margin: "6px 0 0",
  color: "var(--meetro-color-muted)",
  fontSize: "12px",
  lineHeight: 1.4,
};

const statusPill = {
  background: "var(--meetro-color-sage)",
  color: "var(--meetro-color-forest)",
  borderRadius: "999px",
  padding: "7px 10px",
  fontSize: "12px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const tabNoticeHidden = {
  display: "none",
};

const tabNotice = {
  background: "var(--meetro-surface-paper)",
  borderRadius: "9px",
  padding: "11px 10px",
  marginBottom: "9px",
  color: "#6b7280",
  fontWeight: "800",
  textAlign: "center",
  boxShadow: "0 8px 9px rgba(0,0,0,0.045)",
};

const section = {
  marginBottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
  display: "grid",
  gap: "12px",
};

const closureCenterSection = {
  ...section,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "hidden",
  boxSizing: "border-box",
};

const sectionTitle = {
  fontSize: "22px",
  lineHeight: 1.15,
  fontWeight: "950",
  textAlign: "left",
  margin: 0,
  color: "var(--meetro-color-ink)",
};

const sectionSubtitle = {
  margin: "6px 0 0",
  color: "var(--meetro-color-muted)",
  fontSize: "14px",
  fontWeight: "750",
  lineHeight: 1.45,
};

const workCenterListHeaderRow = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const workCenterPageTitleBar = {
  display: "flex",
  justifyContent: "center",
  textAlign: "center",
  width: "100%",
};

const compactPrimaryButton = {
  border: "none",
  borderRadius: "14px",
  padding: "12px 14px",
  background: "var(--meetro-gradient-community-action)",
  color: "var(--meetro-color-paper)",
  fontSize: "13px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 12px 22px rgba(20,53,31,0.18)",
};

const workCenterFullWidthPrimaryButton = {
  width: "100%",
  minHeight: "58px",
  border: "none",
  borderRadius: "18px",
  padding: "15px 18px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  background: "var(--meetro-gradient-community-action)",
  color: "var(--meetro-color-paper)",
  fontSize: "18px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 16px 30px rgba(20,53,31,0.22)",
};

const emptyCard = {
  background: "var(--meetro-surface-warm)",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "22px",
  padding: "18px",
  textAlign: "center",
  boxShadow: "var(--meetro-shadow-soft)",
};

const emptyIcon = {
  fontSize: "12px",
  marginBottom: "8px",
};

const emptyText = {
  color: "var(--meetro-color-muted)",
  fontSize: "15px",
  fontWeight: "700",
  lineHeight: 1.4,
  margin: "8px 0 10px",
};

const emptyActionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
  gap: "8px",
  marginTop: "10px",
};

const emptyActionButton = {
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  borderRadius: "10px",
  padding: "11px",
  fontWeight: "900",
  cursor: "pointer",
  color: "var(--meetro-color-forest)",
  fontSize: "12px",
};



const pendingReviewCard = {
  background: "linear-gradient(135deg,var(--meetro-surface-sage, #eef4ea),#ffffff)",
  border: "1px solid rgba(23,35,23,0.16)",
  borderRadius: "24px",
  padding: "calc(env(safe-area-inset-top, 0px) + 95px) 18px calc(env(safe-area-inset-bottom, 0px) + 135px)",
  overflowY: "auto",
  marginBottom: "10px",
  boxShadow: "0 12px 30px rgba(23,35,23,0.10)",
};

const pendingReviewTop = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
};

const pendingReviewIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "18px",
  background: "#ede9fe",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  fontSize: "22px",
};

const pendingReviewTitle = {
  fontSize: "18px",
  fontWeight: "950",
  color: "#0f172a",
};

const pendingReviewMeta = {
  margin: "0",
  color: "#475569",
  fontWeight: "800",
};

const pendingReviewLocation = {
  margin: "0",
  color: "#475569",
  fontWeight: "700",
};

const pendingReviewNotice = {
  marginTop: "14px",
  background: "#f8fafc",
  borderRadius: "16px",
  padding: "12px",
  color: "#475569",
  fontWeight: "700",
  lineHeight: 1.45,
};

const pendingReviewActions = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "14px",
};

const pendingSecondaryButton = {
  flex: "1 1 130px",
  border: "none",
  background: "#f1f5f9",
  color: "#0f172a",
  borderRadius: "16px",
  padding: "12px",
  fontWeight: "900",
};

const pendingPrimaryButton = {
  flex: "1 1 150px",
  border: "none",
  background: "linear-gradient(135deg,var(--meetro-color-forest, #1f4d34),var(--meetro-color-charcoal, #172317))",
  color: "white",
  borderRadius: "16px",
  padding: "12px",
  fontWeight: "950",
};

const requestCard = {
  background: "white",
  borderRadius: "11px",
  padding: "9px",
  boxShadow: "0 10px 33px rgba(0,0,0,0.08)",
  maxWidth: "100%",
  minWidth: 0,
  overflow: "hidden",
  boxSizing: "border-box",
};

const requestCardOpportunityAlert = {
  border: "1px solid #fed7aa",
  borderLeft: "4px solid #f97316",
  boxShadow: "0 0 0 1px rgba(251,146,60,0.12), 0 14px 34px rgba(249,115,22,0.14)",
};

const liveBadge = {
  display: "inline-flex",
  background: "#fee2e2",
  color: "#b91c1c",
  padding: "8px 9px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
  marginBottom: "10px",
};

const requestTop = {
  display: "flex",
  gap: "9px",
  alignItems: "flex-start",
  marginBottom: "10px",
};

const emergencyBadge = {
  width: "58px",
  height: "58px",
  borderRadius: "10px",
  background: "#fee2e2",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  fontSize: "12px",
  flexShrink: 0,
};

const requestIcon = {
  width: "58px",
  height: "58px",
  borderRadius: "10px",
  background: "#ede9ff",
  color: "var(--meetro-color-forest, #1f4d34)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const requestTitle = {
  display: "block",
  fontSize: "28px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "6px",
  overflowWrap: "break-word",
  wordBreak: "normal",
};

const requestLocation = {
  color: "#6b7280",
  marginBottom: "10px",
  fontSize: "12px",
};

const requestMeta = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "700",
};

const opportunityStatusChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 9px",
  borderRadius: "999px",
  background: "#ffedd5",
  color: "#c2410c",
  border: "1px solid #fed7aa",
  fontSize: "12px",
  fontWeight: 950,
};

const opportunityStatusDot = {
  width: "8px",
  height: "8px",
  borderRadius: "999px",
  background: "#f97316",
  boxShadow: "0 0 0 3px rgba(249,115,22,0.16)",
};

const requestServiceMeta = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 850,
};


const requestTimer = {
  display: "inline-flex",
  marginTop: "10px",
  background: "#fff7ed",
  color: "#c2410c",
  border: "1px solid #fed7aa",
  borderRadius: "999px",
  padding: "8px 9px",
  fontSize: "12px",
  fontWeight: "900",
};


const buttonGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const acceptButton = {
  padding: "9px",
  borderRadius: "10px",
  border: "none",
  background: "#10b981",
  color: "white",
  fontWeight: "900",
  fontSize: "12px",
  cursor: "pointer",
};

const declineButton = {
  padding: "9px",
  borderRadius: "10px",
  border: "none",
  background: "#ef4444",
  color: "white",
  fontWeight: "900",
  fontSize: "12px",
  cursor: "pointer",
};

const activeJobList = {
display:"flex",
flexDirection:"column",
gap:"16px",
};

const activeJobPanel = {
background:"white",
borderRadius:"18px",
padding:"18px",
boxShadow:"0 12px 30px rgba(15,23,42,0.05)",
border:"1px solid #dfe6f1",
};

const activeWorkCardTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
};

const activeWorkCardIdentity = {
  minWidth: 0,
  display: "grid",
  gap: "5px",
};

const activeWorkStatusStack = {
  display: "grid",
  gap: "11px",
  marginTop: "14px",
};

const activeWorkTaskText = {
  color: "#050812",
  fontSize: "16px",
  lineHeight: 1.35,
  fontWeight: "950",
};

const activeWorkLocationText = {
  color: "#050812",
  fontSize: "16px",
  lineHeight: 1.35,
  fontWeight: "950",
};

const activeWorkDivider = {
  height: "1px",
  background: "#e3e8f0",
  margin: "18px 0 12px",
};

const activeWorkFooterRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  color: "#263653",
  fontSize: "14px",
  fontWeight: "850",
};

const activeJobTop = {
display:"flex",
justifyContent:"space-between",
alignItems:"flex-start",
gap:"12px",
marginBottom:"12px",
flexWrap:"wrap",
};

const scheduledJobBadge = {
  background: "#dcfce7",
  color: "#15803d",
  borderRadius: "999px",
  padding: "7px 10px",
  fontWeight: "900",
  fontSize: "11px",
  display: "inline-flex",
  alignItems: "flex-start",
};

const activeJobBadge = {
display:"inline-flex",
padding:"7px 10px",
borderRadius:"999px",
background:"#dcfce7",
color:"#15803d",
fontWeight:"900",
fontSize:"12px",
marginBottom:"0",
width:"fit-content",
};

const activeJobTitle = {
fontSize:"21px",
fontWeight:"950",
margin:"0 0 5px",
color:"#050812",
lineHeight:1.15,
};

const activeJobSub = {
margin:0,
color:"#263653",
fontSize:"15px",
fontWeight:"800",
};

const jobActivityNote = {
  marginTop: "8px",
  display: "inline-flex",
  alignItems: "flex-start",
  background: "#f8fafc",
  color: "#475569",
  border: "1px solid #e2e8f0",
  borderRadius: "999px",
  padding: "7px 11px",
  fontSize: "11px",
  fontWeight: "900",
  letterSpacing: "-0.01em",
};


const activeEtaBox = {
  minWidth: "84px",
  background: "linear-gradient(135deg,#f5f3ff,var(--meetro-surface-sage, #eef4ea))",
  border: "1px solid rgba(31,77,52,.10)",
  borderRadius: "14px",
  padding: "10px 9px",
  textAlign: "center",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: "900",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  justifyContent: "center",
};

const activeTimeline = {
  display: "grid",
  gridTemplateColumns: "repeat(5,auto)",
  gap: "7px",
  marginBottom: "10px",
  alignItems: "flex-start",
};


const activityChipRow = {
display:"flex",
flexWrap:"wrap",
gap:"8px",
marginBottom:"9px",
};

const activityChip = {
background:"#f8fafc",
border:"1px solid #e5e7eb",
color:"#475569",
borderRadius:"999px",
padding:"7px 10px",
fontSize:"11px",
fontWeight:"900",
};

const priorityChip = {
background:"#fff7ed",
border:"1px solid #fed7aa",
color:"#c2410c",
borderRadius:"999px",
padding:"7px 10px",
fontSize:"11px",
fontWeight:"900",
};


const activeTimelineStep = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: "5px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "999px",
  padding: "7px 11px",
  fontSize: "11px",
  fontWeight: "900",
  color: "#475569",
  whiteSpace: "nowrap",
};

const activeActions = {
display:"grid",
gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
gap:"9px",
};

const activeWorkFilterRow = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "8px",
  overflowX: "auto",
  padding: "2px 0 2px",
  WebkitOverflowScrolling: "touch",
};

const activeWorkFilterChip = {
  minHeight: "44px",
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#263653",
  borderRadius: "14px",
  padding: "10px 8px",
  fontSize: "14px",
  fontWeight: "950",
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "0 6px 14px rgba(15,23,42,0.03)",
};

const activeWorkFilterChipActive = {
  borderColor: "#8b7cff",
  background: "#f7f4ff",
  color: "#4f28e8",
  boxShadow: "0 8px 18px rgba(31,77,52,0.12)",
};

const secondaryActionButton = {
width:"100%",
padding:"11px",
borderRadius:"11px",
border:"1px solid #e5e7eb",
background:"#f8fafc",
color:"#111827",
fontWeight:"900",
fontSize: "15px",
cursor:"pointer",
};


const paymentActionButton = {
width:"100%",
padding:"11px",
borderRadius:"11px",
border:"none",
background:"#ecfdf5",
color:"#047857",
fontWeight:"900",
fontSize: "15px",
cursor:"pointer",
border:"1px solid #bbf7d0",
};


const actionSubtext = {
fontSize:"10px",
fontWeight:"700",
opacity:0.72,
marginTop:"2px",
};

const routeSubtext = {
fontSize:"11px",
fontWeight:"700",
opacity:0.82,
marginTop:"2px",
};



const activeCard = {
  background: "white",
  borderRadius: "9px",
  padding: "9px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
};

const activeHeader = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  marginBottom: "10px",
};

const activeDot = {
  width: "9px",
  height: "9px",
  borderRadius: "50%",
  background: "#10b981",
};

const activeLocation = {
  color: "#6b7280",
  marginBottom: "9px",
};

const acceptedStatusPill = {
  width: "100%",
  padding: "11px",
  borderRadius: "9px",
  background: "#dcfce7",
  color: "#166534",
  fontWeight: "900",
  textAlign: "center",
  marginBottom: "9px",
  border: "1px solid #bbf7d0",
  boxSizing: "border-box",
};

const startedStatusPill = {
  background: "#e0f2fe",
  color: "#075985",
  border: "1px solid #bae6fd",
};

const completedStatusPill = {
  background: "#e0e7ff",
  color: "#3730a3",
  border: "1px solid rgba(31,77,52,0.18)",
};

const cancelledStatusPill = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
};



const progressWrap = {
marginTop:"10px",
marginBottom:"10px",
};

const progressDots = {
display:"flex",
alignItems:"center",
justifyContent:"center",
fontWeight:"900",
color:"var(--meetro-color-forest, #1f4d34)",
fontSize:"10px",
};

const progressLabels = {
display:"flex",
justifyContent:"space-between",
fontSize:"10px",
marginTop:"6px",
color:"#6b7280",
};

const progressActive = {
color:"#10b981",
};

const closurePrincipleCard = {
  maxWidth: "900px",
  margin: "0 auto 18px",
  padding: "18px",
  display: "flex",
  alignItems: "flex-start",
  gap: "14px",
  background: "linear-gradient(135deg, #eff6ff, #ffffff)",
  border: "1px solid #bfdbfe",
  borderRadius: "20px",
  boxShadow: "0 12px 28px rgba(37, 99, 235, 0.08)",
};

const closurePrincipleIcon = {
  width: "42px",
  height: "42px",
  flexShrink: 0,
  display: "grid",
  placeItems: "center",
  borderRadius: "14px",
  background: "#dbeafe",
  color: "#1d4ed8",
  fontSize: "20px",
  fontWeight: 950,
};

const closurePrincipleTitle = {
  display: "block",
  color: "#0f172a",
  fontSize: "17px",
  fontWeight: 950,
};

const closurePrincipleText = {
  margin: "6px 0 0",
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.55,
  fontWeight: 650,
};

const propertyManagementClosureFoundationNote = {
  maxWidth: "900px",
  margin: "-8px auto 18px",
  padding: "14px 16px",
  border: "1px solid #bbf7d0",
  borderRadius: "17px",
  background: "#f0fdf4",
  color: "#166534",
  fontSize: "13px",
  lineHeight: 1.5,
  fontWeight: 750,
};

const closureStatusGrid = {
  width: "100%",
  maxWidth: "900px",
  margin: "0 auto 24px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
  gap: "10px",
  minWidth: 0,
  boxSizing: "border-box",
};

const closureStatusSummaryCard = {
  minHeight: "92px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: "5px",
  padding: "14px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  boxShadow: "0 9px 22px rgba(15, 23, 42, 0.05)",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
  overflowWrap: "break-word",
};

const closureStatusSummaryCount = {
  color: "#0f172a",
  fontSize: "24px",
  lineHeight: 1,
  fontWeight: 950,
};

const closureStatusSummaryLabel = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.35,
  fontWeight: 850,
  overflowWrap: "break-word",
  wordBreak: "normal",
};

const closureReviewHeader = {
  width: "100%",
  maxWidth: "900px",
  margin: "0 auto 14px",
  minWidth: 0,
  boxSizing: "border-box",
};

const closureReviewDescription = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.5,
  fontWeight: 650,
  maxWidth: "100%",
  overflowWrap: "break-word",
  wordBreak: "normal",
};

const lifecycleHistoryNotice = {
  width: "100%",
  maxWidth: "900px",
  margin: "0 auto 16px",
  padding: "12px",
  border: "1px solid #fed7aa",
  borderRadius: "8px",
  background: "#fff7ed",
  color: "#7c2d12",
  fontSize: "14px",
  lineHeight: 1.5,
  boxSizing: "border-box",
};

const closureReviewList = {
  width: "100%",
  maxWidth: "900px",
  margin: "0 auto",
  display: "grid",
  gap: "16px",
  minWidth: 0,
  boxSizing: "border-box",
};

const closureProjectCard = {
  padding: "18px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "22px",
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.07)",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "hidden",
};

const closureProjectHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "16px",
};

const closureProjectIdentity = {
  display: "flex",
  alignItems: "center",
  gap: "11px",
  minWidth: 0,
  maxWidth: "100%",
};

const closureProjectIcon = {
  width: "42px",
  height: "42px",
  flexShrink: 0,
  display: "grid",
  placeItems: "center",
  borderRadius: "14px",
  background: "#f1f5f9",
  color: "#475569",
  fontSize: "18px",
  fontWeight: 950,
};

const closureProjectTitle = {
  display: "block",
  color: "#0f172a",
  fontSize: "16px",
  lineHeight: 1.35,
  fontWeight: 950,
  maxWidth: "100%",
  overflowWrap: "break-word",
  wordBreak: "normal",
};

const closureProjectMeta = {
  display: "block",
  marginTop: "4px",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.4,
  fontWeight: 700,
  maxWidth: "100%",
  overflowWrap: "break-word",
  wordBreak: "normal",
};

const closureStatusBadge = {
  display: "inline-flex",
  alignItems: "center",
  maxWidth: "100%",
  minHeight: "30px",
  padding: "6px 10px",
  borderRadius: "999px",
  border: "1px solid transparent",
  fontSize: "11px",
  lineHeight: 1.2,
  fontWeight: 950,
  whiteSpace: "normal",
  overflowWrap: "break-word",
};

const closureStatusBadgeReady = {
  background: "#ecfdf5",
  borderColor: "#a7f3d0",
  color: "#047857",
};

const closureStatusBadgePending = {
  background: "#fff7ed",
  borderColor: "#fed7aa",
  color: "#c2410c",
};

const closureStatusBadgeClosed = {
  background: "#f1f5f9",
  borderColor: "#cbd5e1",
  color: "#475569",
};

const closureCategoryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
  gap: "10px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const closureCategoryCard = {
  minHeight: "82px",
  padding: "12px",
  display: "grid",
  gridTemplateColumns: "34px minmax(0, 1fr)",
  gap: "10px",
  alignItems: "start",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "hidden",
};

const closureCategoryIcon = {
  width: "34px",
  height: "34px",
  display: "grid",
  placeItems: "center",
  borderRadius: "11px",
  background: "#ffffff",
  fontSize: "16px",
};

const closureCategoryContent = {
  minWidth: 0,
  maxWidth: "100%",
};

const closureCategoryTitle = {
  display: "block",
  color: "#0f172a",
  fontSize: "13px",
  fontWeight: 950,
  overflowWrap: "break-word",
  wordBreak: "normal",
};

const closureCategoryDescription = {
  display: "block",
  marginTop: "3px",
  color: "#64748b",
  fontSize: "11px",
  lineHeight: 1.4,
  fontWeight: 650,
  overflowWrap: "break-word",
  wordBreak: "normal",
};

const closureCategoryResolved = {
  gridColumn: "2",
  justifySelf: "start",
  marginTop: "5px",
  color: "#047857",
  fontSize: "11px",
  fontWeight: 900,
  maxWidth: "100%",
  overflowWrap: "break-word",
};

const closureCategoryPending = {
  ...closureCategoryResolved,
  color: "#c2410c",
};

const closureGateCard = {
  display: "grid",
  gap: "10px",
  padding: "12px",
  borderRadius: "16px",
  border: "1px solid #fed7aa",
  background: "#fff7ed",
};

const closureGateGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
  gap: "10px",
};

const closureGateList = {
  margin: "6px 0 0",
  paddingLeft: "18px",
  color: "#334155",
  fontSize: "12px",
  fontWeight: 800,
  lineHeight: 1.45,
};

const closureOpenRecordButton = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: "46px",
  marginTop: "14px",
  padding: "11px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  border: "1px solid #cbd5e1",
  borderRadius: "14px",
  background: "#ffffff",
  color: "#334155",
  fontSize: "13px",
  fontWeight: 900,
  cursor: "pointer",
  boxSizing: "border-box",
  whiteSpace: "normal",
  overflowWrap: "break-word",
};


const completedSummaryGrid={
maxWidth:"900px",
margin:"0 auto 9px",
display:"grid",
gridTemplateColumns:"repeat(4,1fr)",
gap:"10px",
};

const completedSummaryCard={
background:"white",
border:"1px solid #e5e7eb",
borderRadius:"9px",
padding:"10px",
boxShadow:"0 8px 11px rgba(0,0,0,0.04)",
display:"flex",
flexDirection:"column",
gap:"6px",
textAlign:"center",
};

const historyFilters={
maxWidth:"900px",
margin:"0 auto 10px",
display:"grid",
gridTemplateColumns:"1fr 1fr 1fr",
gap:"10px",
};

const historyFilterActive={
background:"var(--meetro-color-forest, #1f4d34)",
border:"1px solid var(--meetro-color-forest, #1f4d34)",
borderRadius:"10px",
padding:"9px",
fontWeight:"900",
color:"white",
boxShadow:"0 8px 11px rgba(31,77,52,0.18)",
cursor:"pointer",
};

const historyFilterButton={
background:"white",
border:"1px solid #e5e7eb",
borderRadius:"10px",
padding:"10px 9px",
fontWeight:"900",
color:"#374151",
boxShadow:"0 8px 11px rgba(0,0,0,0.04)",
cursor:"pointer",
};

const historyList={
maxWidth:"900px",
margin:"0 auto",
display:"flex",
flexDirection:"column",
gap:"10px",
};

const historyListCard={
background:"white",
border:"1px solid #e5e7eb",
borderRadius:"9px",
padding:"10px 9px",
boxShadow:"0 10px 10px rgba(0,0,0,0.05)",
display:"grid",
gridTemplateColumns:"36px 1.4fr 1.25fr .75fr 11px",
gap:"10px",
alignItems:"center",
cursor:"pointer",
};

const historySmallIcon={
width:"10px",
height:"10px",
borderRadius:"10px",
background:"var(--meetro-surface-sage, #eef4ea)",
color:"var(--meetro-color-forest, #1f4d34)",
display:"flex",
alignItems:"center",
justifyContent:"center",
fontWeight:"900",
fontSize:"11px",
};

const historyMain={
display:"flex",
flexDirection:"column",
gap:"4px",
alignItems:"flex-start",
textAlign:"left",
};

const historyDetails={
display:"flex",
flexDirection:"column",
gap:"5px",
color:"#64748b",
fontWeight:"800",
fontSize: "15px",
};

const historyRight={
display:"flex",
flexDirection:"column",
gap:"8px",
alignItems:"flex-end",
justifyContent:"center",
color:"#15803d",
fontWeight:"900",
fontSize:"11px",
minWidth:"82px",
};

const historyStatusMini={
fontSize: "15px",
fontWeight:"900",
color:"#15803d",
};

const historyArrow={
fontSize:"9px",
fontWeight:"900",
color:"#94a3b8",
cursor:"pointer",
transition:"0.25s",
};

const historyCount={
textAlign:"center",
color:"#64748b",
fontWeight:"800",
margin:"10px 0 10px",
};

const loadMoreButton={
display:"block",
margin:"0 auto",
border:"none",
borderRadius:"10px",
padding:"9px 9px",
background:"var(--meetro-color-forest, #1f4d34)",
color:"white",
fontWeight:"900",
cursor:"pointer",
};

const historyCard={
background:"white",
padding:"10px",
borderRadius:"10px",
boxShadow:"0 9px 10px rgba(0,0,0,0.06)",
marginBottom:"11px",
};

const historyTop={
display:"flex",
justifyContent:"space-between",
alignItems:"flex-start",
gap:"9px",
marginBottom:"10px",
};

const historyType={
display:"inline-flex",
alignSelf:"flex-start",
padding:"5px 10px",
borderRadius:"999px",
background:"var(--meetro-surface-sage, #eef4ea)",
color:"var(--meetro-color-forest, #1f4d34)",
fontWeight:"900",
fontSize:"11px",
marginBottom:"4px",
};

const historyAmount={
fontSize:"10px",
fontWeight:"900",
color:"#15803d",
};

const historyGrid={
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:"8px",
};

const historyInfoBox={
background:"#f8fafc",
border:"1px solid #e5e7eb",
borderRadius:"10px",
padding:"10px",
display:"flex",
flexDirection:"column",
gap:"6px",
color:"#64748b",
fontWeight:"800",
};

const historyTitle={
fontSize:"9px",
fontWeight:"900",
display:"block",
marginBottom:"2px",
};

const historyMeta={
color:"#6b7280",
margin:"0",
};

const historyStatus={
marginTop:"10px",
padding:"10px 9px",
background:"#dcfce7",
borderRadius:"10px",
fontWeight:"900",
textAlign:"center",
color:"#166534",
};



const recordsIntroText = {
  margin: "0 0 18px",
  color: "#475569",
  fontWeight: "700",
  lineHeight: 1.5,
};

const recordsGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "14px",
};

const projectRecordCard = {
  background: "#ffffff",
  borderRadius: "22px",
  padding: "16px",
  boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
  border: "1px solid rgba(23,35,23,0.12)",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const projectRecordTop = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  minHeight: "54px",
};

const projectRecordIcon = {
  width: "46px",
  height: "46px",
  borderRadius: "16px",
  background: "linear-gradient(135deg,#f3f0ff,#faf7ff)",
  border: "1px solid rgba(23,35,23,0.12)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  fontSize: "22px",
  flexShrink: 0,
};

const projectRecordTitle = {
  margin: 0,
  fontSize: "17px",
  fontWeight: "950",
  color: "#0f172a",
  lineHeight: 1.1,
};

const projectRecordMeta = {
  margin: "3px 0 0",
  color: "#475569",
  fontWeight: "750",
  fontSize: "13px",
};

const projectRecordStats = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  color: "#475569",
  fontWeight: "800",
  fontSize: "12px",
};

const latestRecordBox = {
  background: "#f8fafc",
  border: "1px solid #eef2f7",
  borderRadius: "16px",
  padding: "12px",
  color: "#0f172a",
  display: "flex",
  flexDirection: "column",
  gap: "5px",
};

const projectRecordActions = {
  display: "flex",
  gap: "8px",
  marginTop: "2px",
};

const projectRecordPrimary = {
  flex: 1,
  border: "none",
  background: "linear-gradient(135deg,var(--meetro-color-forest, #1f4d34),var(--meetro-color-charcoal, #172317))",
  color: "white",
  borderRadius: "14px",
  padding: "12px",
  fontWeight: "900",
  fontSize: "13px",
  cursor: "pointer",
};

const projectRecordSecondary = {
  flex: 1,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#0f172a",
  borderRadius: "14px",
  padding: "12px",
  fontWeight: "900",
  fontSize: "13px",
  cursor: "pointer",
};

const revenueHeroGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "10px",
  marginBottom: "10px",
};

const revenueHeroCardBlue = {
  position: "relative",
  overflow: "hidden",
  minHeight: "120px",
  borderRadius: "9px",
  padding: "9px",
  background:
    "linear-gradient(135deg,#EEF4FF,#E2E8F0)",
  border: "1px solid rgba(147,197,253,0.65)",
  boxShadow: "0 10px 33px rgba(15,23,42,0.08)",
};

const revenueHeroCardPurple = {
  position: "relative",
  overflow: "hidden",
  minHeight: "120px",
  borderRadius: "9px",
  padding: "9px",
  background:
    "linear-gradient(135deg,#F8FAFC,#EEF2FF)",
  border: "1px solid rgba(196,181,253,0.7)",
  boxShadow: "0 10px 33px rgba(15,23,42,0.08)",
};

const revenueHeroContent = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  position: "relative",
  zIndex: 2,
};

const revenueIconTile = {
  width: "58px",
  height: "58px",
  borderRadius: "10px",
  background:"rgba(255,255,255,.92)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  fontSize: "12px",
  boxShadow:"0 8px 10px rgba(0,0,0,.08)",
  flexShrink: 0,
};

const revenueHeroBig = {
  display: "block",
  fontSize: "29px",
  fontWeight: "900",
  color: "#0f172a",
  letterSpacing: "-1.5px",
  lineHeight: 1,
  marginTop: "2px",
};

const revenueSubText = {
marginTop:"10px",
fontSize:"9px",
fontWeight:"700",
color:"#64748b",
};

const revenueTrend = {
  display: "inline-flex",
  alignItems: "flex-start",
  justifyContent: "center",
  marginTop: "4px",
  padding: "7px 10px",
  borderRadius: "999px",
  background: "rgba(220,252,231,0.9)",
  color: "#15803d",
  fontSize: "12px",
  fontWeight: "900",
};

const revenueFakeLine = {
  position: "absolute",
  right: "11px",
  bottom: "10px",
  fontSize: "58px",
  fontWeight: "900",
  color: "rgba(31,77,52,0.45)",
  letterSpacing: "-8px",
  transform: "rotate(-8deg)",
};

const revenueGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "10px",
};

const revenueMiniCard = {
  background: "#ffffff",
  border: "1px solid rgba(226,232,240,0.92)",
  borderRadius: "16px",
  padding: "13px",
  boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
  minHeight: "92px",
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
};

const revenueBig = {
  display: "block",
  fontSize: "23px",
  fontWeight: "900",
  color: "#111827",
  lineHeight: 1.05,
  marginTop: "7px",
};

const miniSub={
marginTop:"7px",
fontSize: "12px",
fontWeight:"700",
color:"#64748b",
};

const revenueLabel = {
  display: "block",
  color: "#1f2937",
  fontWeight: "900",
  fontSize: "11px",
  lineHeight: 1.25,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const revenueCard = {
  background:"rgba(255,255,255,.92)",
  border: "1px solid rgba(226,232,240,0.9)",
  borderRadius: "18px",
  padding: "12px",
  boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
};

const revenueCompactNote = {
  marginTop: "12px",
  padding: "10px 12px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid rgba(226,232,240,0.9)",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "700",
  lineHeight: 1.35,
};



const materialsToolbar = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
  alignItems: "flex-start",
  boxSizing: "border-box",
};

const materialsSearchBox = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid #ddd6fe",
  borderRadius: "16px",
  padding: "13px 16px",
  color: "#475569",
  fontWeight: "800",
  background: "#faf7ff",
  fontSize: "15px",
};

const materialsTable = {
  border: "1px solid #e7e5ff",
  borderRadius: "9px",
  overflow: "hidden",
  background: "white",
  boxShadow: "0 10px 11px rgba(15,23,42,.06)",
};

const materialsTableHeader = {
  display: "grid",
  gridTemplateColumns: "2.1fr .55fr 1.1fr .9fr .9fr 1.45fr",
  gap: "10px",
  background: "linear-gradient(90deg,#f8fafc,#f5f3ff)",
  color: "#475569",
  fontSize: "12px",
  fontWeight: "900",
  padding: "11px 14px",
  textTransform: "uppercase",
};



const materialMainInfo = {
  display: "grid",
  gap: "4px",
};

const materialMetaRow = {
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "8px",
};

const materialMetaPill = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  color: "#475569",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "900",
};

const materialStatusColumn = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const materialsCardsWrap = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
  gap: "12px",
  boxSizing: "border-box",
};

const materialCompactCard = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid #EDE9FE",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
  padding: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "0px",
  minHeight: "168px",
};

const materialCompactTop = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  minHeight: "92px",
};

const materialCompactInfo = {
  flex: 1,
  minWidth: 0,
};

const materialCompactName = {
  display: "block",
  fontSize: "14px",
  fontWeight: 900,
  color: "#111827",
  lineHeight: 1.12,
  marginBottom: "3px",
};

const materialCompactMeta = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "4px",
  fontSize: "12px",
  color: "#475569",
  fontWeight: 800,
  marginTop: "2px",
  lineHeight: 1.2,
  minWidth: 0,
};


const materialDivider = {
  height: "1px",
  background: "#F3F4F6",
  marginTop: "12px",
};
const materialCompactActions = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "8px",
  paddingTop: "9px",
  width: "100%",
};

const materialCard = {
  width: "100%",
  maxWidth: "100%",
  overflow: "hidden",
  boxSizing: "border-box",
  background: "white",
  border: "1px solid #e9e8ff",
  borderRadius: "20px",
  padding: "14px",
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
  boxShadow: "0 10px 24px rgba(15,23,42,.06)",
};

const materialCardTop = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  width: "100%",
  minWidth: 0,
  overflow: "hidden",
};

const materialTableRow = {
  display: "grid",
  gridTemplateColumns: "2.1fr .6fr 1.1fr .9fr .9fr 1.45fr",
  gap: "10px",
  alignItems: "flex-start",
  padding: "14px",
  borderTop: "1px solid #eef2f7",
  background: "linear-gradient(180deg,#ffffff,#fbfdff)",
};

const materialNameCell = {
  display: "flex",
  alignItems: "flex-start",
  gap: "9px",
};

const materialThumb = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  background: "#fbfaff",
  border: "1px solid rgba(23, 35, 23, 0.18)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  fontSize: "18px",
  flexShrink: 0,
};

const materialMainName = {
  color: "#111827",
};

const materialSubText = {
  margin: "0",
  color: "#475569",
  fontSize: "12px",
  fontWeight: "800",
};

const materialActionGroup = {
  display: "flex",
  gap: "8px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};



const materialCancelEditButton = {
  border: "1px solid #e5e7eb",
  background: "white",
  color: "#475569",
  borderRadius: "16px",
  padding: "13px",
  fontWeight: "1000",
  cursor: "pointer",
};

const materialEditButton = {
  border: "1px solid #ddd6fe",
  background: "#f5f3ff",
  color: "var(--meetro-color-forest, #1f4d34)",
  borderRadius: "12px",
  padding: "10px 12px",
  fontWeight: "1000",
  cursor: "pointer",
  fontSize: "13px",
};

const materialDeleteButton = {
  border: "1px solid #e5e7eb",
  background: "white",
  borderRadius: "9px",
  padding: "8px 10px",
  cursor: "pointer",
};

const compactMaterialActionButton = {
  border: "1px solid rgba(23, 35, 23, 0.18)",
  background: "#f5f3ff",
  color: "var(--meetro-color-charcoal, #172317)",
  borderRadius: "12px",
  width: "42px",
  height: "42px",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: 900,
};

const compactReceivedButton = {
  border: "1px solid rgba(34, 197, 94, 0.22)",
  background: "#f0fdf4",
  color: "#15803d",
  borderRadius: "12px",
  width: "42px",
  height: "42px",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: 900,
};

const compactDeleteButton = {
  border: "1px solid rgba(15, 23, 42, 0.08)",
  background: "#ffffff",
  color: "#6b7280",
  borderRadius: "12px",
  width: "42px",
  height: "42px",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: "16px",
};

const receivedDisabledButton = {
  border: "none",
  background: "#f1f5f9",
  color: "#475569",
  borderRadius: "9px",
  padding: "8px 10px",
  fontWeight: "900",
};

const addMaterialInlineButton = {
  width: "100%",
  border: "none",
  background: "white",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "10px",
  fontWeight: "900",
  cursor: "pointer",
  borderTop: "1px solid #e5e7eb",
};

const materialsSummaryPanel = {
  display: "grid",
  gridTemplateColumns: "1.35fr 1fr 1fr",
  gap: "16px",
  alignItems: "flex-start",
  marginTop: "16px",
  background: "linear-gradient(135deg,#ffffff,#faf7ff)",
  border: "1px solid rgba(23,35,23,.12)",
  borderRadius: "26px",
  padding: "20px",
  boxShadow: "0 16px 40px rgba(15,23,42,.06)",
};

const materialsSummaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "11px",
  marginTop: "10px",
};

const summaryCountBox = {
  background: "#ffffff",
  border: "1px solid #eef2f7",
  borderRadius: "14px",
  padding: "11px",
  textAlign: "center",
  display: "grid",
  gap: "5px",
  boxShadow: "0 4px 12px rgba(15,23,42,.03)",
};

const summaryReadyBox = {
  background: "linear-gradient(135deg,#f0fdf4,#f7fee7)",
  border: "1px solid #bbf7d0",
  borderRadius: "16px",
  padding: "14px",
  color: "#15803d",
  boxShadow: "0 10px 24px rgba(34,197,94,.08)",
};

const progressBarOuter = {
  height: "10px",
  background: "#e5e7eb",
  borderRadius: "999px",
  overflow: "hidden",
  marginTop: "9px",
};

const progressBarInner = {
  height: "100%",
  borderRadius: "999px",
  background: "linear-gradient(90deg,var(--meetro-color-forest, #1f4d34),#22c55e)",
  transition: "width .35s ease",
  boxShadow: "0 0 18px rgba(34,197,94,.25)",
};

const resumeDisabledButton = {
  width: "100%",
  border: "1px solid #fed7aa",
  background: "#fff7ed",
  color: "#c2410c",
  borderRadius: "14px",
  padding: "12px",
  fontWeight: "900",
  cursor: "default",
  fontSize: "13px",
  marginTop: "10px",
};



const activeProjectContextCard = {
  margin: "0 0 16px",
  padding: "calc(env(safe-area-inset-top, 0px) + 12px) 14px 14px",
  borderRadius: "24px",
  background: "linear-gradient(135deg,#ffffff,#f8f5ff)",
  border: "1px solid rgba(23,35,23,.14)",
  boxShadow: "0 14px 34px rgba(15,23,42,.06)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "14px",
  position: "relative",
  overflow: "hidden",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const activeProjectContextLabel = {
  fontSize: "11px",
  fontWeight: 950,
  color: "var(--meetro-color-charcoal, #172317)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const activeProjectContextTitle = {
  margin: "5px 0 3px",
  fontSize: "18px",
  fontWeight: 950,
  color: "#111827",
  lineHeight: 1.08,
  letterSpacing: "-0.02em",
};

const activeProjectContextMeta = {
  margin: 0,
  fontSize: "13px",
  fontWeight: 750,
  color: "#475569",
};

const activeProjectContextStatus = {
  padding: "10px 13px",
  borderRadius: "999px",
  background: "rgba(255,255,255,.85)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(23,35,23,.16)",
  color: "var(--meetro-color-charcoal, #172317)",
  fontSize: "11px",
  fontWeight: 950,
  whiteSpace: "nowrap",
  textTransform: "capitalize",
  boxShadow: "0 8px 20px rgba(31,77,52,.10)",
};

const materialsPageShell = {
  maxWidth: "1120px",
  width: "100%",
  margin: "0 auto",
  display: "grid",
  gap: "16px",
  paddingBottom: "calc(68px + env(safe-area-inset-bottom))",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const materialsHero = {
  textAlign: "center",
  marginBottom: "4px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const materialsHeroIcon = {
  fontSize: "12px",
};

const materialsHeroTitle = {
  fontSize: "28px",
  margin: "6px 0",
  fontWeight: "1000",
  color: "#0f172a",
  letterSpacing: "-0.8px",
};

const materialsHeroText = {
  margin: "6px 0 0",
  color: "#475569",
  fontWeight: "800",
  fontSize: "13px",
  lineHeight: 1.35,
};

const materialsSectionEyebrow = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "fit-content",
  maxWidth: "100%",
  borderRadius: "999px",
  padding: "7px 11px",
  marginBottom: "12px",
  background: "#f5f3ff",
  color: "var(--meetro-color-charcoal, #172317)",
  border: "1px solid #ddd6fe",
  fontSize: "12px",
  fontWeight: 1000,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const materialsVoiceHeader = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "12px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const materialsMicCircle = {
  width: "92px",
  height: "92px",
  borderRadius: "999px",
  background: "linear-gradient(180deg,#ede9fe,#f5f3ff)",
  color: "var(--meetro-color-charcoal, #172317)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  fontSize: "48px",
  boxShadow: "0 14px 34px rgba(109,40,217,.16)",
};

const materialsVoiceTitle = {
  margin: 0,
  fontSize: "20px",
  fontWeight: "1000",
  color: "#0f172a",
};

const materialsModeHint = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: 750,
};

const materialsInputModeRow = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: "8px",
  margin: "12px 0",
  boxSizing: "border-box",
};

const materialsInputModeButton = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#334155",
  borderRadius: "14px",
  padding: "11px 12px",
  fontSize: "13px",
  fontWeight: 950,
  cursor: "pointer",
};

const materialsInputModeButtonActive = {
  ...materialsInputModeButton,
  border: "1px solid #c4b5fd",
  background: "#f5f3ff",
  color: "var(--meetro-color-forest, #1f4d34)",
};

const materialsMicErrorBox = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid #fed7aa",
  borderRadius: "16px",
  padding: "12px",
  background: "#fff7ed",
  color: "#9a3412",
  display: "grid",
  gap: "8px",
  textAlign: "left",
  margin: "10px 0",
};

const permissionInstructionsBox = {
  display: "grid",
  gap: "4px",
  padding: "10px",
  borderRadius: "12px",
  background: "#ffffff",
  border: "1px solid #fdba74",
  color: "#9a3412",
  fontSize: "13px",
  fontWeight: 850,
};

const materialsMicErrorActions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
  gap: "8px",
};

const materialsMicSecondaryButton = {
  border: "1px solid #fdba74",
  background: "#ffffff",
  color: "#9a3412",
  borderRadius: "12px",
  padding: "10px 12px",
  fontWeight: 950,
  cursor: "pointer",
};

const materialsMicRetryButton = {
  border: "none",
  background: "#f97316",
  color: "#ffffff",
  borderRadius: "12px",
  padding: "10px 12px",
  fontWeight: 950,
  cursor: "pointer",
};

const catalogMatchesWrap = {
  display: "grid",
  gap: "10px",
  marginTop: "14px",
};

const catalogMatchesTitle = {
  fontSize: "15px",
  fontWeight: 900,
  color: "#111827",
};

const catalogMatchesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
};

const catalogMatchCard = {
  padding: "12px",
  borderRadius: "16px",
  background: "#ffffff",
  border: "1px solid rgba(23, 35, 23, 0.16)",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.05)",
  minHeight: "150px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const catalogMatchName = {
  fontSize: "14px",
  fontWeight: 900,
  color: "#111827",
  lineHeight: 1.25,
};

const catalogMatchMeta = {
  margin: "6px 0 2px",
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: 700,
};

const catalogMatchSupplier = {
  margin: "0 0 10px",
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: 1.25,
};

const catalogAddButton = {
  width: "100%",
  border: "none",
  borderRadius: "12px",
  padding: "10px 12px",
  background: "linear-gradient(135deg, var(--meetro-color-forest, #1f4d34), var(--meetro-color-charcoal, #172317))",
  color: "#ffffff",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: "13px",
};

const generateMaterialsButton = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "none",
  background: "linear-gradient(135deg,var(--meetro-color-charcoal, #172317),var(--meetro-color-forest, #1f4d34))",
  color: "white",
  borderRadius: "16px",
  padding: "14px 18px",
  fontWeight: "1000",
  cursor: "pointer",
  fontSize: "16px",
  boxShadow: "0 16px 38px rgba(31,77,52,.24)",
};

const materialsManualBar = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  boxShadow: "0 14px 34px rgba(15,23,42,.05)",
  overflow: "hidden",
};

const materialsManualToggle = {
  width: "100%",
  border: "none",
  background: "white",
  display: "flex",
  alignItems: "flex-start",
  gap: "14px",
  padding: "18px 20px",
  cursor: "pointer",
  textAlign: "left",
  fontSize: "16px",
};

const manualAddIcon = {
  minWidth: "46px",
  width: "46px",
  height: "46px",
  borderRadius: "999px",
  border: "1px dashed var(--meetro-color-charcoal, #172317)",
  color: "var(--meetro-color-forest, #1f4d34)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  fontSize: "28px",
  fontWeight: "900",
};


const manualAddText = {
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  color: "#0f172a",
};

const manualChevron = {
  marginLeft: "auto",
  fontSize: "22px",
  color: "#475569",
};

const materialsFormInner = {
  border: "1px solid #eef2f7",
  borderRadius: "18px",
  padding: "14px",
  marginTop: "10px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  background: "#fbfdff",
};

const pauseMaterialsButton = {
  border: "1px solid #fbbf24",
  background: "#fffbeb",
  color: "#b45309",
  borderRadius: "16px",
  padding: "13px",
  fontWeight: "1000",
  cursor: "pointer",
};



const materialsFloatingMic = {
  width: "48px",
  minWidth: "48px",
  height: "48px",
  borderRadius: "999px",
  border: "none",
  background: "linear-gradient(180deg,#f5f3ff,#ede9fe)",
  color: "var(--meetro-color-charcoal, #172317)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  cursor: "pointer",
  boxShadow: "0 10px 28px rgba(23,35,23,.10)",
};

const materialsFloatingMicActive = {
  background: "linear-gradient(180deg,#fee2e2,#fecaca)",
  color: "#dc2626",
};

const materialsMicCircleActive = {
  background: "linear-gradient(180deg,#fee2e2,#fecaca)",
  color: "#dc2626",
  boxShadow: "0 0 0 8px rgba(220,38,38,.12)",
};

const materialsActionRow = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
  marginTop: "12px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const micMiniButton = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "none",
  background: "linear-gradient(135deg,var(--meetro-color-charcoal, #172317),var(--meetro-color-forest, #1f4d34))",
  color: "white",
  borderRadius: "16px",
  padding: "18px 28px",
  fontWeight: "1000",
  cursor: "pointer",
  fontSize: "18px",
  boxShadow: "0 14px 34px rgba(31,77,52,.20)",
};

const materialsMicHint = {
  textAlign: "center",
  color: "#475569",
  fontWeight: "800",
  margin: "12px 0 0",
  fontSize: "14px",
};

const materialsAssistantCard = {
  background: "white",
  borderRadius: "22px",
  padding: "18px",
  border: "1px solid #ddd6fe",
  boxShadow: "0 18px 48px rgba(31,77,52,.08)",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflowX: "hidden",
};

const materialsFormCard = {
  background: "#f8fafc",
  borderRadius: "20px",
  padding: "16px",
  border: "1px solid #e2e8f0",
};

const materialsSubTitle = {
  margin: "0 0 9px",
  fontSize: "12px",
  fontWeight: "1000",
  color: "#111827",
  textAlign: "center",
};

const materialsListPanel = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "hidden",
  background: "white",
  border: "1px solid #ddd6fe",
  borderRadius: "22px",
  padding: "14px",
  marginTop: "0",
  boxSizing: "border-box",
  boxShadow: "0 14px 34px rgba(15,23,42,.07)",
};

const materialsListHeader = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "1fr",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "10px",
  boxSizing: "border-box",
};


const sendMaterialsDisabledButton = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  background: "#f1f5f9",
  color: "#475569",
  borderRadius: "14px",
  padding: "10px 12px",
  fontWeight: "900",
  cursor: "not-allowed",
};

const sendMaterialsButton = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid #c4b5fd",
  background: "#f5f3ff",
  color: "var(--meetro-color-forest, #1f4d34)",
  borderRadius: "16px",
  padding: "13px 16px",
  fontWeight: "1000",
  cursor: "pointer",
  fontSize: "15px",
};

const materialsSharePanel = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflowX: "hidden",
  margin: "12px 0 14px",
  padding: "14px",
  border: "1px solid rgba(31,77,52,0.16)",
  borderRadius: "20px",
  background: "linear-gradient(135deg,#ffffff,#f8fafc)",
  display: "grid",
  gap: "12px",
};

const materialsShareHelp = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.4,
  fontWeight: 700,
};

const materialsShareGrid = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
  gap: "9px",
  boxSizing: "border-box",
};

const materialsShareOptionButton = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid rgba(148,163,184,0.28)",
  background: "#ffffff",
  color: "#334155",
  borderRadius: "14px",
  padding: "12px 13px",
  fontWeight: "900",
  cursor: "pointer",
  textAlign: "left",
};

const materialsShareOptionButtonDisabled = {
  ...materialsShareOptionButton,
  background: "#f8fafc",
  color: "#94a3b8",
  cursor: "not-allowed",
};

const materialsEmptyBox = {
  display: "grid",
  gap: "4px",
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: "14px",
  padding: "12px",
  color: "#475569",
  fontWeight: "800",
  textAlign: "left",
  fontSize: "14px",
};

const materialsActivityPanel = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflowX: "hidden",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "14px",
  background: "#ffffff",
  boxShadow: "0 10px 24px rgba(15,23,42,.04)",
  display: "grid",
  gap: "10px",
  textAlign: "left",
};

const materialsActivityList = {
  display: "grid",
  gap: "8px",
};

const materialsActivityItem = {
  display: "grid",
  gap: "3px",
  padding: "10px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid #eef2f7",
  color: "#334155",
  fontWeight: 850,
};

const materialsRows = {
  display: "grid",
  gap: "10px",
};

const materialRow = {
  display: "flex",
  alignItems: "flex-start",
  gap: "9px",
  border: "1px solid #eef2f7",
  borderRadius: "9px",
  padding: "9px",
  background: "#fbfdff",
};

const materialIcon = {
  width: "33px",
  height: "33px",
  borderRadius: "10px",
  background: "#f1f5f9",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  fontSize: "12px",
};

const materialNeededPill = {
  background: "#fff4cc",
  color: "#b45309",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "13px",
  fontWeight: "900",
  lineHeight: 1,
};

const materialRequestedPill = {
  background: "#dbeafe",
  color: "#2563eb",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "13px",
  fontWeight: "900",
  lineHeight: 1,
};

const materialReceivedPill = {
  background: "#dcfce7",
  color: "#15803d",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "13px",
  fontWeight: "900",
  lineHeight: 1,
};

const markReceivedButton = {
  border: "1px solid rgba(34, 197, 94, 0.22)",
  background: "#f0fdf4",
  color: "#15803d",
  borderRadius: "12px",
  padding: "9px 12px",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: "13px",
};

const resumeReadyButton = {
  width: "100%",
  border: "none",
  background: "linear-gradient(180deg,#22c55e,#16a34a)",
  color: "white",
  borderRadius: "14px",
  padding: "12px",
  fontWeight: "950",
  cursor: "pointer",
  marginTop: "10px",
  fontSize: "13px",
  boxShadow: "0 10px 24px rgba(34,197,94,.20)",
};

const textarea = {
  width: "100%",
  minHeight: "110px",
  border: "1px solid #c4b5fd",
  borderRadius: "18px",
  padding: "calc(env(safe-area-inset-top, 0px) + 95px) 18px calc(env(safe-area-inset-bottom, 0px) + 135px)",
  overflowY: "auto",
  fontSize: "18px",
  outline: "none",
  resize: "vertical",
  background: "#fff",
  color: "#0f172a",
  boxSizing: "border-box",
  marginTop: "14px",
};

const materialsDraftTextarea = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: "92px",
  border: "1px solid #c4b5fd",
  borderRadius: "16px",
  padding: "13px 14px",
  overflowY: "auto",
  fontSize: "16px",
  lineHeight: 1.35,
  outline: "none",
  resize: "vertical",
  background: "#fff",
  color: "#0f172a",
  boxSizing: "border-box",
  marginTop: "10px",
};

const aiBox = {
  width: "100%",
  background: "white",
  border: "1px solid #ddd6fe",
  borderRadius: "10px",
  padding: "10px",
  marginTop: "9px",
  boxSizing: "border-box",
};

const materialsPreview = {
  whiteSpace: "pre-wrap",
  fontFamily: "inherit",
  color: "#334155",
  margin: "10px 0 0",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
  gap: "9px",
  width: "100%",
  marginTop: "10px",
  minWidth: 0,
  boxSizing: "border-box",
};

const field = {
  display: "grid",
  gap: "8px",
  fontWeight: "900",
  textAlign: "left",
};

const input = {
  border: "1px solid #dbe4f0",
  borderRadius: "18px",
  padding: "14px",
  fontSize: "17px",
  width: "100%",
  boxSizing: "border-box",
  background: "#fbfdff",
};

const stageActions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: "8px",
  marginTop: "9px",
};


const activeStageButton = {
  background: "linear-gradient(135deg,var(--meetro-color-forest, #1f4d34),var(--meetro-color-charcoal, #172317))",
  color: "white",
  border: "1px solid rgba(31,77,52,.22)",
  boxShadow: "0 10px 20px rgba(31,77,52,.18)",
};

const pausedStageButton = {
  background: "#fff7ed",
  color: "#c2410c",
  border: "1px solid #fdba74",
  boxShadow: "0 8px 16px rgba(251,146,60,.12)",
};

const resumeWorkButton = {
  border: "none",
  background: "linear-gradient(135deg,#16a34a,#22c55e)",
  color: "white",
  borderRadius: "12px",
  padding: "10px 12px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 10px 18px rgba(34,197,94,.18)",
};

const stageButton = {
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#334155",
  borderRadius: "12px",
  padding: "11px 12px",
  fontWeight: "900",
  cursor: "pointer",
  transition: "all .18s ease",
  boxShadow: "0 4px 10px rgba(15,23,42,.04)",
};

const jobActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "9px",
};

const completeButton = {
  border: "none",
  background: "#16a34a",
  color: "white",
  borderRadius: "10px",
  padding: "9px 10px",
  fontWeight: "900",
  cursor: "pointer",
};

const dispatchButton = {
  width: "100%",
  padding: "13px",
  borderRadius: "9px",
  border: "none",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  fontWeight: "900",
  fontSize: "12px",
  cursor: "pointer",
  boxShadow: "0 10px 9px rgba(31,77,52,0.22)",
};


const changeOrderAlertWrap = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  marginBottom: "18px",
};

const changeOrderAlertCard = {
  background: "linear-gradient(135deg,#fff7ed,#ffffff)",
  borderRadius: "24px",
  padding: "calc(env(safe-area-inset-top, 0px) + 95px) 18px calc(env(safe-area-inset-bottom, 0px) + 135px)",
  overflowY: "auto",
  border: "1px solid rgba(251,146,60,0.22)",
  boxShadow: "0 10px 30px rgba(251,146,60,0.12)",
};

const changeOrderAlertTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
};

const changeOrderBadge = {
  background: "rgba(251,146,60,0.14)",
  color: "#ea580c",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
  display: "inline-flex",
};

const changeOrderTitle = {
  margin: "12px 0 4px",
  fontSize: "22px",
  fontWeight: "900",
};

const changeOrderCustomer = {
  margin: 0,
  color: "#475569",
  fontWeight: "700",
};

const normalChangeBadge = {
  background: "#e0f2fe",
  color: "#0369a1",
  borderRadius: "999px",
  padding: "8px 12px",
  fontWeight: "900",
  fontSize: "12px",
};

const urgentChangeBadge = {
  background: "#fee2e2",
  color: "#dc2626",
  borderRadius: "999px",
  padding: "8px 12px",
  fontWeight: "900",
  fontSize: "12px",
};

const changeOrderMessageBox = {
  marginTop: "14px",
  background: "white",
  borderRadius: "18px",
  padding: "14px",
  lineHeight: 1.5,
  fontWeight: "700",
};

const changeOrderNotice = {
  marginTop: "12px",
  color: "#c2410c",
  fontWeight: "800",
  fontSize: "13px",
};

const changeOrderActions = {
  display: "flex",
  gap: "10px",
  marginTop: "16px",
};

const reviewChangeButton = {
  flex: 1,
  border: "none",
  background: "linear-gradient(135deg,#f97316,#ea580c)",
  color: "white",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
  boxShadow: "0 12px 24px rgba(249,115,22,0.25)",
};

const messageCustomerButton = {
  flex: 1,
  border: "none",
  background: "#f8fafc",
  color: "#0f172a",
  borderRadius: "16px",
  padding: "14px",
  fontWeight: "900",
};

const workflowDependencyBanner = {
  display: "grid",
  gap: "5px",
  padding: "11px 12px",
  marginBottom: "12px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #fffbeb, #fff7ed)",
  border: "1px solid rgba(217,119,6,0.22)",
  color: "#78350f",
  boxSizing: "border-box",
};

const workflowDependencyTitle = {
  fontSize: "13px",
  lineHeight: 1.25,
  fontWeight: "950",
};

const workflowDependencySeverity = {
  justifySelf: "start",
  padding: "3px 7px",
  borderRadius: "999px",
  background: "rgba(180,83,9,0.12)",
  color: "#92400e",
  fontSize: "10px",
  lineHeight: 1.1,
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const workflowDependencyText = {
  fontSize: "12px",
  lineHeight: 1.35,
  fontWeight: "800",
};

const workflowDependencyMeta = {
  fontSize: "11px",
  lineHeight: 1.3,
  color: "#92400e",
  fontWeight: "800",
};

const workflowDependencyDialogBackdrop = {
  position: "fixed",
  inset: 0,
  zIndex: 10020,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 16px) 16px calc(env(safe-area-inset-bottom, 0px) + 104px)",
  background: "rgba(15,23,42,0.28)",
  boxSizing: "border-box",
};

const workflowDependencyDialog = {
  width: "min(460px, 100%)",
  maxHeight: "min(620px, calc(100dvh - 148px))",
  overflowY: "auto",
  borderRadius: "22px",
  padding: "18px",
  background: "rgba(255,253,248,0.98)",
  border: "1px solid rgba(217,119,6,0.2)",
  boxShadow: "0 24px 70px rgba(15,23,42,0.22)",
  boxSizing: "border-box",
};

const workflowDependencyDialogEyebrow = {
  margin: "0 0 6px",
  color: "#b45309",
  fontSize: "11px",
  fontWeight: "950",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const workflowDependencyDialogTitle = {
  margin: "0 0 8px",
  color: "#111827",
  fontSize: "20px",
  lineHeight: 1.15,
  fontWeight: "950",
};

const workflowDependencyDialogText = {
  margin: "0 0 10px",
  color: "#334155",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: "750",
};

const workflowDependencyDialogFacts = {
  display: "grid",
  gap: "6px",
  margin: "0 0 12px",
  padding: "10px 12px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid rgba(148,163,184,0.25)",
  color: "#1f2937",
  fontSize: "13px",
  lineHeight: 1.3,
  fontWeight: "850",
};

const workflowDependencyDialogWarning = {
  margin: "0 0 14px",
  color: "#78350f",
  background: "#fffbeb",
  border: "1px solid rgba(217,119,6,0.18)",
  borderRadius: "14px",
  padding: "10px 12px",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: "850",
};

const workflowDependencySummary = {
  margin: "0 0 14px",
  padding: "10px 12px",
  borderRadius: "14px",
  background: "#ffffff",
  border: "1px solid rgba(148,163,184,0.28)",
};

const workflowDependencySummaryTitle = {
  margin: "0 0 6px",
  color: "#475569",
  fontSize: "11px",
  lineHeight: 1.2,
  fontWeight: "950",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const workflowDependencySummaryList = {
  margin: 0,
  paddingLeft: "18px",
  display: "grid",
  gap: "4px",
};

const workflowDependencySummaryItem = {
  color: "#1f2937",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: "850",
};

const workflowDependencyHistoryList = {
  display: "grid",
  gap: "6px",
  minWidth: 0,
};

const workflowDependencyHistoryItem = {
  display: "block",
  overflowWrap: "anywhere",
  lineHeight: 1.35,
};

const workflowDependencyDialogActions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
  gap: "9px",
};

const workflowDependencySecondaryButton = {
  minHeight: "44px",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  background: "#ffffff",
  color: "#334155",
  fontWeight: "900",
  cursor: "pointer",
};

const workflowDependencyRecommendedButton = {
  minHeight: "44px",
  border: "none",
  borderRadius: "14px",
  background: "#0f172a",
  color: "#ffffff",
  fontWeight: "950",
  cursor: "pointer",
};

const workflowDependencyRiskButton = {
  minHeight: "44px",
  border: "1px solid rgba(180,83,9,0.45)",
  borderRadius: "14px",
  background: "#fff7ed",
  color: "#92400e",
  fontWeight: "950",
  cursor: "pointer",
};

const workflowDependencyPrimaryButton = {
  minHeight: "44px",
  border: "none",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #b45309, #92400e)",
  color: "#ffffff",
  fontWeight: "950",
  cursor: "pointer",
};

export default ContractorDashboard;
