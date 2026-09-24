import { useEffect, useMemo, useRef, useState } from "react";

import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import ContextualAskMeetro from "../components/ContextualAskMeetro";
import EmergencyRelationshipDetail from "../components/EmergencyRelationshipDetail";
import EmergencyAvailableNow from "../components/EmergencyAvailableNow";
import EmergencyProfessionalResponses from "../components/EmergencyProfessionalResponses";
import {
  cancelEmergencyRequest,
  createEmergencyDraft,
  getEmergencyRequest,
  listHomeownerAvailableEmergencyProfessionals,
  listHomeownerEmergencyResponses,
  prepareEmergencyRequest,
  saveEmergencySafetyAssessment,
  selectHomeownerAvailableEmergencyProfessional,
  selectHomeownerEmergencyResponse,
  updateEmergencyDraft,
} from "../utils/emergencyApi";
import {
  buildEmergencyRequestRoute,
  captureEmergencyRouteOwnership,
  createEmergencyRouteSessionController,
  ownEmergencyRequest,
  parseEmergencyRequestRoute,
  replaceEmergencyRequestRoute,
  selectEmergencyRequestForRoute,
  settleEmergencyRouteOperation,
} from "../utils/emergencyRoutes";
import {
  EMERGENCY_SERVICE_OPTIONS,
  isUnsupportedLegacyEmergencySpecialty,
  normalizeEmergencySpecialtyForDisplay,
} from "../utils/emergencySpecialties";
import { getSimplifiedEmergencyProgressStage } from "../utils/emergencySummary";
import {
  buildCanonicalConversationRoute,
} from "../utils/canonicalConversationMessaging";
import {
  normalizeEmergencyRelationshipDetail,
} from "../utils/emergencyRelationshipDetail";
import { createEmergencyRefreshCoordinator } from "../utils/emergencyRefreshCoordinator";
import {
  fetchCanonicalConversations,
  findCanonicalEmergencyConversation,
} from "../utils/requestCommunication";
import { getLanguage, t } from "../utils/language";
import {
  applyEmergencyRequestInterpretation,
  buildEmergencyGeneralArea,
  confirmEmergencyRequestInterpretation,
  requestEmergencyRequestInterpretation,
} from "../utils/emergencyRequestInterpret";

const INITIAL_SAFETY = Object.freeze({
  immediateDanger: false,
  medicalEmergency: false,
  fireOrSmoke: false,
  gasOdorOrSuspectedLeak: false,
  activeCrimeOrThreat: false,
  electricalImmediateHazard: false,
  structuralCollapseRisk: false,
  floodingOrWaterDamage: false,
  occupantsUnableToExit: false,
  emergencyServicesContacted: false,
  safeToRemainAtLocation: false,
  additionalSafetyContext: "",
});

function clean(value) {
  return String(value ?? "").trim();
}

function createEmptyEmergencyIntake() {
  return {
    description: "",
    service: { specialty: "" },
    location: { city: "", region: "", postalCode: "" },
  };
}

function buildAskMeetroDisplayMessage({
  stage,
  intake,
  language,
  copy,
}) {
  if (stage === "describe") {
    const specialty =
      clean(intake?.service?.specialty);

    const service =
      EMERGENCY_SERVICE_OPTIONS.find(
        (option) =>
          option.value === specialty
      );

    const serviceLabel = service
      ? copy.serviceLabels?.[service.value] ||
        service.label[
          language === "es" ? "es" : "en"
        ] ||
        service.label.en
      : "";

    if (serviceLabel) {
      return language === "es"
        ? `Esto parece una emergencia que necesita ${serviceLabel}.`
        : `This sounds like a match for ${serviceLabel}.`;
    }

    return language === "es"
      ? "Necesito un detalle más para identificar el tipo de ayuda de emergencia."
      : "I need one more detail to identify the right kind of emergency help.";
  }

  const area =
    buildEmergencyGeneralArea(
      intake?.location
    );

  if (area) {
    return language === "es"
      ? `Puedo usar ${area} como el área general de servicio.`
      : `I can use ${area} as the general service area.`;
  }

  return language === "es"
    ? "Necesito un detalle más del área general."
    : "I need one more general-area detail.";
}

function getRequestId(record) {
  if (!record) return null;

  return (
    record.id ??
    record.emergencyRequestId ??
    record.emergency_request_id ??
    null
  );
}

function getRequestStatus(record) {
  if (!record) return "draft";

  return clean(record.status ?? "draft").toLowerCase() || "draft";
}

function isEditableEmergencyDraft(record = {}) {
  return getRequestStatus(record) === "draft";
}

function canCancelEmergencyRequest(record = {}) {
  if (!getRequestId(record)) return false;

  return [
    "draft",
    "ready_for_distribution",
    "active",
    "selection_pending",
  ].includes(
    getRequestStatus(record)
  );
}

function getRecoveredPhase(record = {}) {
  if (!isEditableEmergencyDraft(record)) {
    return "lifecycle";
  }

  return getCanonicalSafetyAssessment(record) ? "safety" : "details";
}

function buildEmergencyRequestTitle(serviceLabel, description) {
  const summary = clean(description).replace(/\s+/g, " ");
  return `${clean(serviceLabel)}: ${summary}`.slice(0, 120);
}

function hasBackendSafetyPermissionToPrepare(record = {}) {
  const assessment = getCanonicalSafetyAssessment(record);
  const disposition = clean(
    assessment?.disposition || assessment?.safetyDisposition
  ).toLowerCase();

  return getRequestStatus(record) === "draft" && disposition === "continue";
}

function buildDraftForm(record = {}, fallback = {}) {
  const recoveredSpecialty = clean(
    record.serviceSpecialty ||
      record.service_specialty
  );
  const recoveredService =
    normalizeEmergencySpecialtyForDisplay(recoveredSpecialty);

  return {
    service:
      recoveredSpecialty
        ? recoveredService
        : clean(fallback.service),
    title: clean(record.title || fallback.title),
    description: clean(record.description || fallback.description),
    locationText: clean(
      record.locationText ||
        record.location_text ||
        fallback.locationText
    ),
    unitNumber: clean(
      record.unitNumber ||
        record.unit_number ||
        fallback.unitNumber
    ),
    accessNotes: clean(
      record.accessNotes ||
        record.access_notes ||
        fallback.accessNotes
    ),
  };
}

function getCanonicalSafetyAssessment(record = {}) {
  const assessment =
    record.safetyAssessment ||
    record.safety_assessment ||
    null;

  return assessment &&
    typeof assessment === "object" &&
    !Array.isArray(assessment)
    ? assessment
    : null;
}

function buildSafetyForm(record = {}) {
  const assessment = getCanonicalSafetyAssessment(record);

  if (!assessment) {
    return {
      ...INITIAL_SAFETY,
    };
  }

  return {
    immediateDanger: Boolean(
      assessment.immediateDanger ??
        assessment.immediate_danger
    ),
    medicalEmergency: Boolean(
      assessment.medicalEmergency ??
        assessment.medical_emergency
    ),
    fireOrSmoke: Boolean(
      assessment.fireOrSmoke ??
        assessment.fire_or_smoke
    ),
    gasOdorOrSuspectedLeak: Boolean(
      assessment.gasOdorOrSuspectedLeak ??
        assessment.gas_odor_or_suspected_leak
    ),
    activeCrimeOrThreat: Boolean(
      assessment.activeCrimeOrThreat ??
        assessment.active_crime_or_threat
    ),
    electricalImmediateHazard: Boolean(
      assessment.electricalImmediateHazard ??
        assessment.electrical_immediate_hazard
    ),
    structuralCollapseRisk: Boolean(
      assessment.structuralCollapseRisk ??
        assessment.structural_collapse_risk
    ),
    floodingOrWaterDamage: Boolean(
      assessment.floodingOrWaterDamage ??
        assessment.flooding_or_water_damage
    ),
    occupantsUnableToExit: Boolean(
      assessment.occupantsUnableToExit ??
        assessment.occupants_unable_to_exit
    ),
    emergencyServicesContacted: Boolean(
      assessment.emergencyServicesContacted ??
        assessment.emergency_services_contacted
    ),
    safeToRemainAtLocation: Boolean(
      assessment.safeToRemainAtLocation ??
        assessment.safe_to_remain_at_location
    ),
    additionalSafetyContext: clean(
      assessment.additionalSafetyContext ??
        assessment.additional_safety_context
    ),
  };
}

function readCurrentEmergencyRoute() {
  return parseEmergencyRequestRoute(
    typeof window === "undefined"
      ? ""
      : window.location.hash
  );
}

function EmergencyRequest({ setPage }) {
  const safetyReviewHeadingRef = useRef(null);
  const findHelpSectionRef = useRef(null);
  const findHelpScrollKeyRef = useRef("");
  const selectionDialogRef = useRef(null);
  const emergencyRefreshCoordinatorRef = useRef(null);
  const [routeSessionController] = useState(() =>
    createEmergencyRouteSessionController(
      readCurrentEmergencyRoute()
    )
  );

  const [routeSession, setRouteSession] = useState(
    () => routeSessionController.current()
  );
  const emergencyRoute = routeSession.route;
  const detailReturnPage = emergencyRoute.returnPage === "notifications"
    ? "notifications"
    : "myRequests";
  const [language, setLanguage] = useState(getLanguage());
  const [ownedCanonicalRequest, setOwnedCanonicalRequest] =
    useState(null);
  const [phase, setPhase] = useState("details");
  const [draftWorkflowOpen, setDraftWorkflowOpen] = useState(
    () => !emergencyRoute.hasRequestId
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [cancelConfirmationOpen, setCancelConfirmationOpen] =
    useState(false);
  const [responsesPhase, setResponsesPhase] = useState("idle");
  const [responses, setResponses] = useState([]);
  const [availableNowPhase, setAvailableNowPhase] =
    useState("idle");
  const [availableProfessionals, setAvailableProfessionals] =
    useState([]);
  const [availableNowError, setAvailableNowError] =
    useState("");
  const [
    selectedAvailableProfessional,
    setSelectedAvailableProfessional,
  ] = useState(null);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [canonicalConversationId, setCanonicalConversationId] =
    useState(null);
  const [selectionPending, setSelectionPending] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const [
    unsupportedRecoveredSpecialty,
    setUnsupportedRecoveredSpecialty,
  ] = useState("");

  const [recoveryFailureKind, setRecoveryFailureKind] =
    useState(() =>
      emergencyRoute.hasRequestId &&
      !emergencyRoute.valid
        ? "invalid"
        : ""
    );

  const [recoveryState, setRecoveryState] = useState(() =>
    emergencyRoute.hasRequestId
      ? emergencyRoute.valid && emergencyRoute.requestId
        ? "loading"
        : "failed"
      : "idle"
  );

  const [form, setForm] = useState(() => ({
    service: emergencyRoute.serviceSpecialty || "",
    title: "",
    description: "",
    locationText: "",
    unitNumber: "",
    accessNotes: "",
  }));
  const [intakeMode, setIntakeMode] = useState(() =>
    emergencyRoute.hasRequestId ? "manual" : "ask"
  );
  const [askInput, setAskInput] = useState("");
  const [askStage, setAskStage] = useState("describe");
  const [askIntake, setAskIntake] = useState(createEmptyEmergencyIntake);
  const [askMessages, setAskMessages] = useState([]);
  const [askClarifications, setAskClarifications] = useState([]);
  const [askPending, setAskPending] = useState(false);
  const [askError, setAskError] = useState("");

  const [safety, setSafety] = useState({
    ...INITIAL_SAFETY,
  });
  const canonicalRequest = selectEmergencyRequestForRoute(
    routeSession,
    ownedCanonicalRequest
  );

  useEffect(() => {
    const handleLanguageChange = () => {
      setLanguage(getLanguage());
    };

    window.addEventListener("languageChanged", handleLanguageChange);
    window.addEventListener(
      "meetro-language-change",
      handleLanguageChange
    );
    window.addEventListener(
      "meetroLanguageChanged",
      handleLanguageChange
    );

    return () => {
      window.removeEventListener(
        "languageChanged",
        handleLanguageChange
      );
      window.removeEventListener(
        "meetro-language-change",
        handleLanguageChange
      );
      window.removeEventListener(
        "meetroLanguageChanged",
        handleLanguageChange
      );
    };
  }, []);

  useEffect(() => {
    const handleEmergencyRouteChange = () => {
      const nextSession =
        routeSessionController.transition(
          readCurrentEmergencyRoute()
        );
      const nextRoute = nextSession.route;

      setOwnedCanonicalRequest(null);
      setPhase("details");
      setDraftWorkflowOpen(!nextRoute.hasRequestId);
      setPending(false);
      setMessage("");
      setErrorMessage("");
      setCancelConfirmationOpen(false);
      setResponsesPhase("idle");
      setResponses([]);
      setAvailableNowPhase("idle");
      setAvailableProfessionals([]);
      setAvailableNowError("");
      setSelectedAvailableProfessional(null);
      setSelectedResponse(null);
      setCanonicalConversationId(null);
      setSelectionPending(false);
      setSelectionError("");
      setUnsupportedRecoveredSpecialty("");
      setForm({
        service: nextRoute.serviceSpecialty || "",
        title: "",
        description: "",
        locationText: "",
        unitNumber: "",
        accessNotes: "",
      });
      setIntakeMode(nextRoute.hasRequestId ? "manual" : "ask");
      setAskInput("");
      setAskStage("describe");
      setAskIntake(createEmptyEmergencyIntake());
      setAskMessages([]);
      setAskClarifications([]);
      setAskPending(false);
      setAskError("");
      setSafety({ ...INITIAL_SAFETY });
      setRecoveryState(
        nextRoute.hasRequestId
          ? nextRoute.valid && nextRoute.requestId
            ? "loading"
            : "failed"
          : "idle"
      );
      setRecoveryFailureKind(
        nextRoute.hasRequestId && !nextRoute.valid
          ? "invalid"
          : ""
      );
      setRouteSession(nextSession);
    };

    window.addEventListener(
      "hashchange",
      handleEmergencyRouteChange
    );

    return () => {
      window.removeEventListener(
        "hashchange",
        handleEmergencyRouteChange
      );
    };
  }, [routeSessionController]);

  useEffect(() => {
    const controller = routeSessionController;
    const loadOwnership =
      captureEmergencyRouteOwnership(routeSession);

    if (canonicalRequest) {
      return undefined;
    }

    let active = true;

    async function resolveEmergencyRoute() {
      await Promise.resolve();

      if (
        !active ||
        !controller.owns(loadOwnership)
      ) {
        return;
      }

      setOwnedCanonicalRequest(null);
      setPhase("details");
      setDraftWorkflowOpen(!emergencyRoute.hasRequestId);
      setPending(false);
      setMessage("");
      setErrorMessage("");
      setCancelConfirmationOpen(false);
      setResponsesPhase("idle");
      setResponses([]);
      setAvailableNowPhase("idle");
      setAvailableProfessionals([]);
      setAvailableNowError("");
      setSelectedAvailableProfessional(null);
      setSelectedResponse(null);
      setCanonicalConversationId(null);
      setSelectionPending(false);
      setSelectionError("");
      setUnsupportedRecoveredSpecialty("");
      setForm({
        service: emergencyRoute.serviceSpecialty || "",
        title: "",
        description: "",
        locationText: "",
        unitNumber: "",
        accessNotes: "",
      });
      setIntakeMode(emergencyRoute.hasRequestId ? "manual" : "ask");
      setAskInput("");
      setAskStage("describe");
      setAskIntake(createEmptyEmergencyIntake());
      setAskMessages([]);
      setAskClarifications([]);
      setAskPending(false);
      setAskError("");
      setSafety({
        ...INITIAL_SAFETY,
      });

      if (!emergencyRoute.hasRequestId) {
        setRecoveryState("idle");
        setRecoveryFailureKind("");
        return;
      }

      if (
        !emergencyRoute.valid ||
        !emergencyRoute.requestId
      ) {
        setRecoveryState("failed");
        setRecoveryFailureKind("invalid");
        return;
      }

      setRecoveryState("loading");
      setRecoveryFailureKind("");

      const operation = await settleEmergencyRouteOperation(
        controller,
        loadOwnership,
        getEmergencyRequest(emergencyRoute.requestId, {
          setPage,
        })
      );

      if (
        !active ||
        operation.status === "stale"
      ) {
        return;
      }

      if (operation.status === "rejected") {
        setRecoveryState("failed");
        setRecoveryFailureKind("unavailable");
        setErrorMessage("");
        return;
      }

      const result = operation.value;

      if (!result.ok || !result.emergencyRequest) {
        setRecoveryState("failed");
        setRecoveryFailureKind(
          [401, 403].includes(result.status)
            ? "unauthorized"
            : result.status === 404
              ? "not_found"
              : "unavailable"
        );
        setErrorMessage("");
        return;
      }

      const recoveredRequest = result.emergencyRequest;
      const recoveredSpecialty = clean(
        recoveredRequest.serviceSpecialty ||
          recoveredRequest.service_specialty
      );

      const nextOwnedRequest = ownEmergencyRequest(
        routeSession,
        recoveredRequest
      );

      if (
        !selectEmergencyRequestForRoute(
          routeSession,
          nextOwnedRequest
        )
      ) {
        setRecoveryState("failed");
        setRecoveryFailureKind("unavailable");
        return;
      }

      setOwnedCanonicalRequest(nextOwnedRequest);
      setForm(
        buildDraftForm(recoveredRequest, {
          service: emergencyRoute.serviceSpecialty || "",
          title: "",
          description: "",
          locationText: "",
          unitNumber: "",
          accessNotes: "",
        })
      );
      setUnsupportedRecoveredSpecialty(
        normalizeEmergencySpecialtyForDisplay(recoveredSpecialty)
          ? ""
          : recoveredSpecialty
      );
      setSafety(buildSafetyForm(recoveredRequest));
      setPhase(getRecoveredPhase(recoveredRequest));
      setCancelConfirmationOpen(false);
      setRecoveryState("loaded");
    }

    resolveEmergencyRoute();

    return () => {
      active = false;
    };
  }, [
    canonicalRequest,
    emergencyRoute.hasRequestId,
    emergencyRoute.requestId,
    emergencyRoute.serviceSpecialty,
    emergencyRoute.valid,
    routeSession,
    routeSessionController,
    setPage,
  ]);

  const canonicalRequestId = getRequestId(canonicalRequest);
  const canonicalRequestStatus = getRequestStatus(canonicalRequest);

  useEffect(() => {
    if (!canonicalRequestId || !emergencyRoute.valid) {
      emergencyRefreshCoordinatorRef.current?.stop();
      emergencyRefreshCoordinatorRef.current = null;
      return undefined;
    }

    const refreshCoordinator =
      createEmergencyRefreshCoordinator({
        load: async () => {
          const result = await getEmergencyRequest(
            canonicalRequestId,
            { setPage }
          );

          if (!result.ok || !result.emergencyRequest) {
            throw new Error(
              result.message ||
                "The Emergency request could not be refreshed."
            );
          }

          const nextOwnedRequest = ownEmergencyRequest(
            routeSession,
            result.emergencyRequest
          );

          if (
            !selectEmergencyRequestForRoute(
              routeSession,
              nextOwnedRequest
            )
          ) {
            throw new Error(
              "The refreshed Emergency request did not match the active route."
            );
          }

          return nextOwnedRequest;
        },
        onSuccess: (nextOwnedRequest) => {
          setOwnedCanonicalRequest(nextOwnedRequest);
          setRecoveryState("loaded");
        },
      });

    emergencyRefreshCoordinatorRef.current =
      refreshCoordinator;
    void refreshCoordinator.start({ immediate: false });

    const handleVisibilityChange = () => {
      void refreshCoordinator.handleVisibilityChange();
    };
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      refreshCoordinator.stop();
      if (
        emergencyRefreshCoordinatorRef.current ===
        refreshCoordinator
      ) {
        emergencyRefreshCoordinatorRef.current = null;
      }
    };
  }, [
    canonicalRequestId,
    emergencyRoute.valid,
    routeSession,
    setPage,
  ]);

  const shouldLoadResponses = [
    "ready_for_distribution",
    "active",
    "selection_pending",
    "assigned",
    "professional_en_route",
    "professional_arrived",
    "in_service",
    "work_in_progress",
    "completed",
    "resolved",
  ].includes(canonicalRequestStatus);
  const shouldLoadAvailableNow =
    canonicalRequestStatus === "ready_for_distribution";

  useEffect(() => {
    if (!canonicalRequestId || !shouldLoadAvailableNow) {
      findHelpScrollKeyRef.current = "";
      return undefined;
    }

    const scrollKey =
      `${canonicalRequestId}:ready_for_distribution`;

    if (findHelpScrollKeyRef.current === scrollKey) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      const section = findHelpSectionRef.current;
      if (!section) return;

      findHelpScrollKeyRef.current = scrollKey;

      section.scrollIntoView({
        behavior: window.matchMedia?.(
          "(prefers-reduced-motion: reduce)"
        ).matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [canonicalRequestId, shouldLoadAvailableNow]);

  useEffect(() => {
    if (phase !== "safety" || !canonicalRequestId) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      const heading = safetyReviewHeadingRef.current;
      if (!heading) return;

      heading.focus({ preventScroll: true });
      heading.scrollIntoView({
        behavior: window.matchMedia?.(
          "(prefers-reduced-motion: reduce)"
        ).matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [canonicalRequestId, phase]);

  useEffect(() => {
    if (
      !selectedResponse &&
      !selectedAvailableProfessional
    ) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      selectionDialogRef.current?.focus({
        preventScroll: true,
      });
    });

    return () =>
      window.cancelAnimationFrame(frame);
  }, [
    selectedAvailableProfessional,
    selectedResponse,
  ]);

  useEffect(() => {
    const controller = routeSessionController;
    const enrichmentOwnership =
      captureEmergencyRouteOwnership(routeSession);

    if (!canonicalRequestId || !shouldLoadResponses) {
      let active = true;

      Promise.resolve().then(() => {
        if (
          !active ||
          !controller.owns(enrichmentOwnership)
        ) {
          return;
        }
        setResponses([]);
        setResponsesPhase("idle");
        setCanonicalConversationId(null);
      });

      return () => {
        active = false;
      };
    }

    let active = true;

    async function loadCanonicalResponseState() {
      await Promise.resolve();
      if (
        !active ||
        !controller.owns(enrichmentOwnership)
      ) {
        return;
      }

      setResponses([]);
      setResponsesPhase("loading");
      setCanonicalConversationId(null);

      const [responseOperation, conversationOperation] =
        await Promise.all([
          settleEmergencyRouteOperation(
            controller,
            enrichmentOwnership,
            listHomeownerEmergencyResponses(
              canonicalRequestId,
              { setPage }
            )
          ),
          settleEmergencyRouteOperation(
            controller,
            enrichmentOwnership,
            fetchCanonicalConversations("personal", {
              setPage,
            })
          ),
        ]);

      if (
        !active ||
        !controller.owns(enrichmentOwnership)
      ) {
        return;
      }

      const responseResult = responseOperation.value;
      const conversationResult = conversationOperation.value;

      if (
        responseOperation.status === "rejected" ||
        !responseResult?.ok
      ) {
        setResponsesPhase("error");
      } else {
        setResponses(responseResult.responses);
        setResponsesPhase("ready");
      }

      if (
        conversationOperation.status === "fulfilled" &&
        conversationResult?.ok
      ) {
        const conversation = findCanonicalEmergencyConversation(
          conversationResult.conversations,
          canonicalRequestId
        );

        setCanonicalConversationId(
          conversation?.conversationId || null
        );
      }
    }

    loadCanonicalResponseState();

    return () => {
      active = false;
    };
  }, [
    canonicalRequestId,
    routeSession,
    routeSessionController,
    shouldLoadResponses,
    setPage,
  ]);

  const text = {
    en: {
      title: "Emergency Help",
      requestPageTitle: "Emergency Request",
      completedPageTitle: "Completed Emergency Request",
      cancelledPageTitle: "Cancelled Emergency Request",
      intro:
        "Tell us what is happening and the general area where you need help.",
      emergencyWarning:
        "If anyone is in immediate danger, call 911 or contact local emergency services now.",
      limitation:
        "Meetro helps you connect with an available professional. It does not replace 911 or local emergency responders.",
      fillManually: "Fill manually",
      returnToAskMeetro: "Return to Ask Meetro",
      askIntakeTitle: "Ask Meetro Emergency Help",
      askIntakeIntro:
        "Tell me what’s happening. I’ll help you understand the issue and find the right kind of help.",
      askIntakePlaceholder: "Tell Ask Meetro what is happening…",
      askFindHelpOffer:
        "Would you like me to help you find available professionals serving your area?",
      askFindHelpYes: "Yes, find help",
      askFindHelpNotNow: "Not now",
      askFindHelpDeclined:
        "No problem. You can keep describing the issue or choose Fill manually.",
      askLocationPrompt:
        "What city or ZIP code should I use to find professionals serving your area?",
      askLocationPlaceholder: "City or ZIP code",
      askIntakeSend: "Send",
      askIntakeThinking: "Preparing guidance…",
      askIntakeReviewTitle: "Review Emergency details",
      askIntakeReviewIntro:
        "Confirm these details before Meetro creates your Emergency request.",
      askIntakeAssistant: "Ask Meetro",
      askIntakeHomeowner: "You",
      askIntakeFailed:
        "Ask Meetro could not safely prepare these details. You can try again or fill them manually.",
      service: "Choose the type of help you need",
      serviceLabels: {
        emergency_plumbing: "Emergency Plumbing",
        emergency_electrical_service: "Emergency Electrical",
        roof_leak_repair: "Roof Leak Repair",
        emergency_lockout: "Emergency Lockout",
        handyman: "Other Urgent Property Issue",
      },
      description: "What’s happening?",
      descriptionPlaceholder:
        "Describe the problem, affected area, current conditions, and anything already attempted.",
      location: "General service area",
      locationPlaceholder: "City, area, or ZIP",
      continueToSafety: "Continue to Safety Check",
      saving: "Saving…",
      safetyTitle: "Safety Check",
      safetyIntro:
        "Select every listed hazard that is currently true. Select only what is true; do not select an item merely to continue.",
      noListedHazards:
        "If none of the listed hazards apply, leave the hazard boxes unchecked. Then answer the separate current safety status statements below. This does not mean that no other danger exists.",
      hazardConditions: "Listed hazard conditions",
      safetyStatusTitle: "Current safety status",
      safetyStatusIntro:
        "Answer these statements separately and truthfully. If it is not safe to remain, leave that statement unchecked; the existing safety review may block the Meetro workflow.",
      immediateDanger: "Someone is in immediate danger",
      medicalEmergency: "There is a medical emergency",
      fireOrSmoke: "There is fire or smoke",
      gasLeak: "There is a gas odor or suspected gas leak",
      crimeThreat: "There is active crime, violence, or a threat",
      electricalHazard:
        "There is an immediate electrical hazard",
      collapseRisk:
        "There is a structural collapse or falling-material risk",
      flooding: "There is active flooding or water damage",
      unableToExit: "Someone cannot safely exit",
      servicesContacted:
        "Emergency services have already been contacted",
      safeToRemain:
        "It is currently safe to remain at the location",
      additionalSafety: "Additional safety context",
      additionalSafetyPlaceholder:
        "Optional information about hazards or precautions",
      continueToFindHelp: "Continue to Find Help",
      safetySaving: "Continuing…",
      submitting: "Connecting…",
      preparationFailed:
        "Your Safety Check was saved, but Meetro could not open Find Help. Try again.",
      editDetails: "Edit Details",
      continueRequest: "Continue Emergency Request",
      back: "Back Home",
      home: "Back Home",
      viewMyEmergencyRequests: "View My Emergency Requests",
      required:
        "Choose a service, describe what is happening, and enter a general service area.",
      requestFailed:
        "The Emergency request could not be saved. Try again.",
      recoveryLoading: "Loading your Emergency request…",
      recoveryFailed:
        "This Emergency request could not be loaded. It may be unavailable or you may not have access.",
      recoveryInvalid:
        "This Emergency request link is invalid. Return to My Requests and choose the request again.",
      recoveryUnauthorized:
        "You do not have access to this Emergency request.",
      recoveryNotFound:
        "This Emergency request was not found.",
      recoveryUnavailable:
        "This Emergency request is temporarily unavailable. Try again from My Requests.",
      recovered:
        "Your Emergency request was loaded from Meetro.",
      safetyFailed:
        "The safety review could not be saved. Try again.",
      askMeetroContext: "Emergency Help",
      progress: "Emergency request progress",
      stages: {
        details: "What’s happening?",
        safety: "Safety Check",
        find: "Find Help",
        connected: "Connected",
      },
      cancelRequest: "Cancel Emergency Request",
      cancelConfirmTitle: "Cancel this Emergency request?",
      cancelConfirmBody:
        "Cancellation is permanent. This request will remain available as a read-only canonical record.",
      confirmCancellation: "Yes, Cancel Request",
      keepRequest: "Keep Request",
      cancelling: "Cancelling…",
      cancellationFailed:
        "The Emergency request could not be cancelled. Try again.",
      readOnlyBody:
        "This canonical Emergency request can no longer be edited from this screen.",
    },
    es: {
      title: "Ayuda de Emergencia",
      requestPageTitle: "Solicitud de Emergencia",
      completedPageTitle: "Solicitud de Emergencia Completada",
      cancelledPageTitle: "Solicitud de Emergencia Cancelada",
      intro:
        "Cuéntanos qué está ocurriendo y el área general donde necesitas ayuda.",
      emergencyWarning:
        "Si alguien está en peligro inmediato, llama al 911 o comunícate ahora con los servicios de emergencia locales.",
      limitation:
        "Meetro te ayuda a conectar con un profesional disponible. No reemplaza al 911 ni a los servicios de emergencia locales.",
      fillManually: "Completar manualmente",
      returnToAskMeetro: "Volver a Preguntar a Meetro",
      askIntakeTitle: "Ayuda de Emergencia con Meetro",
      askIntakeIntro:
        "Cuéntame qué está ocurriendo. Te ayudaré a entender el problema y a encontrar el tipo de ayuda adecuado.",
      askIntakePlaceholder: "Cuéntale a Meetro qué está ocurriendo…",
      askFindHelpOffer:
        "¿Quieres que te ayude a encontrar profesionales disponibles que atiendan tu área?",
      askFindHelpYes: "Sí, buscar ayuda",
      askFindHelpNotNow: "Ahora no",
      askFindHelpDeclined:
        "No hay problema. Puedes seguir describiendo el problema o elegir Completar manualmente.",
      askLocationPrompt:
        "¿Qué ciudad o código postal debo usar para buscar profesionales que atiendan tu área?",
      askLocationPlaceholder: "Ciudad o código postal",
      askIntakeSend: "Enviar",
      askIntakeThinking: "Preparando orientación…",
      askIntakeReviewTitle: "Revisa los detalles de Emergencia",
      askIntakeReviewIntro:
        "Confirma estos detalles antes de que Meetro cree tu solicitud de Emergencia.",
      askIntakeAssistant: "Meetro",
      askIntakeHomeowner: "Tú",
      askIntakeFailed:
        "Meetro no pudo preparar estos detalles de forma segura. Inténtalo de nuevo o complétalos manualmente.",
      service: "Elige el tipo de ayuda que necesitas",
      serviceLabels: {
        emergency_plumbing: "Emergencia de plomería",
        emergency_electrical_service: "Emergencia eléctrica",
        roof_leak_repair: "Reparación de fuga en el techo",
        emergency_lockout: "Cerrajería de emergencia",
        handyman: "Otro problema urgente de la propiedad",
      },
      description: "¿Qué está ocurriendo?",
      descriptionPlaceholder:
        "Describe el problema, el área afectada, las condiciones actuales y lo que ya intentaste.",
      location: "Área general de servicio",
      locationPlaceholder: "Ciudad, área o código postal",
      continueToSafety: "Continuar a Verificación de Seguridad",
      saving: "Guardando…",
      safetyTitle: "Verificación de Seguridad",
      safetyIntro:
        "Selecciona cada peligro de la lista que sea verdadero en este momento. Selecciona solo lo que sea cierto; no marques una opción únicamente para continuar.",
      noListedHazards:
        "Si ninguno de los peligros de la lista aplica, deja esas casillas sin marcar. Luego responde por separado las afirmaciones sobre el estado actual de seguridad. Esto no significa que no exista ningún otro peligro.",
      hazardConditions: "Peligros indicados",
      safetyStatusTitle: "Estado actual de seguridad",
      safetyStatusIntro:
        "Responde estas afirmaciones por separado y con sinceridad. Si no es seguro permanecer, deja esa afirmación sin marcar; la revisión de seguridad existente puede bloquear el flujo de Meetro.",
      immediateDanger: "Alguien está en peligro inmediato",
      medicalEmergency: "Existe una emergencia médica",
      fireOrSmoke: "Hay fuego o humo",
      gasLeak: "Hay olor a gas o una posible fuga",
      crimeThreat: "Hay un delito activo, violencia o amenaza",
      electricalHazard:
        "Existe un peligro eléctrico inmediato",
      collapseRisk:
        "Existe riesgo de colapso o materiales que pueden caer",
      flooding: "Hay inundación activa o daños por agua",
      unableToExit: "Alguien no puede salir de forma segura",
      servicesContacted:
        "Los servicios de emergencia ya fueron contactados",
      safeToRemain:
        "Actualmente es seguro permanecer en el lugar",
      additionalSafety: "Contexto adicional de seguridad",
      additionalSafetyPlaceholder:
        "Información opcional sobre peligros o precauciones",
      continueToFindHelp: "Continuar a Buscar Ayuda",
      safetySaving: "Continuando…",
      submitting: "Conectando…",
      preparationFailed:
        "Tu Verificación de Seguridad se guardó, pero Meetro no pudo abrir Buscar Ayuda. Inténtalo nuevamente.",
      editDetails: "Editar Detalles",
      continueRequest: "Continuar Solicitud de Emergencia",
      back: "Regresar al Inicio",
      home: "Regresar al Inicio",
      viewMyEmergencyRequests:
        "Ver Mis Solicitudes de Emergencia",
      required:
        "Elige un servicio, describe qué está ocurriendo e ingresa un área general de servicio.",
      requestFailed:
        "No se pudo guardar la solicitud. Inténtalo nuevamente.",
      recoveryLoading: "Cargando tu solicitud de Emergencia…",
      recoveryFailed:
        "No se pudo cargar esta solicitud de Emergencia. Puede no estar disponible o quizás no tengas acceso.",
      recoveryInvalid:
        "Este enlace de solicitud de Emergencia no es válido. Vuelve a Mis Solicitudes y selecciona la solicitud otra vez.",
      recoveryUnauthorized:
        "No tienes acceso a esta solicitud de Emergencia.",
      recoveryNotFound:
        "No se encontró esta solicitud de Emergencia.",
      recoveryUnavailable:
        "Esta solicitud de Emergencia no está disponible temporalmente. Inténtalo de nuevo desde Mis Solicitudes.",
      recovered:
        "Tu solicitud de Emergencia fue cargada desde Meetro.",
      safetyFailed:
        "No se pudo guardar la revisión. Inténtalo nuevamente.",
      askMeetroContext: "Ayuda de Emergencia",
      progress: "Progreso de la solicitud de Emergencia",
      stages: {
        details: "¿Qué está ocurriendo?",
        safety: "Verificación de Seguridad",
        find: "Buscar Ayuda",
        connected: "Conectado",
      },
      cancelRequest: "Cancelar Solicitud de Emergencia",
      cancelConfirmTitle: "¿Cancelar esta solicitud de Emergencia?",
      cancelConfirmBody:
        "La cancelación es permanente. La solicitud permanecerá disponible como un registro canónico de solo lectura.",
      confirmCancellation: "Sí, Cancelar Solicitud",
      keepRequest: "Mantener Solicitud",
      cancelling: "Cancelando…",
      cancellationFailed:
        "No se pudo cancelar la solicitud de Emergencia. Inténtalo nuevamente.",
      readOnlyBody:
        "Esta solicitud canónica de Emergencia ya no puede editarse desde esta pantalla.",
    },
  };

  const copy = text[language] || text.en;
  const unsupportedSpecialtyMessage =
    unsupportedRecoveredSpecialty
      ? isUnsupportedLegacyEmergencySpecialty(
          unsupportedRecoveredSpecialty
        )
        ? language === "es"
          ? "Preparación para Tormentas ya no está disponible. Selecciona un servicio de Emergencia compatible para continuar."
          : "Storm Preparation is no longer available. Choose a supported Emergency service to continue."
        : language === "es"
          ? "El servicio guardado ya no está disponible. Selecciona un servicio de Emergencia compatible para continuar."
          : "The saved specialty is no longer available. Choose a supported Emergency service to continue."
      : "";
  const selectedService =
    EMERGENCY_SERVICE_OPTIONS.find(
      (option) => option.value === form.service
    );
  const selectedServiceLabel = selectedService
    ? copy.serviceLabels?.[selectedService.value] ||
      selectedService.label[language] ||
      selectedService.label.en
    : "";
  const askSelectedService = EMERGENCY_SERVICE_OPTIONS.find(
    (option) => option.value === askIntake.service.specialty
  );
  const askSelectedServiceLabel = askSelectedService
    ? copy.serviceLabels?.[askSelectedService.value] ||
      askSelectedService.label[language] ||
      askSelectedService.label.en
    : "";
  const askDescribeReady = Boolean(
    askIntake.description && askIntake.service.specialty
  );
  const askGeneralArea = buildEmergencyGeneralArea(
    askIntake.location
  );
  const askLocationReady = Boolean(
    clean(askIntake.location?.city) ||
      clean(askIntake.location?.postalCode)
  );
  const askIntakeReady = Boolean(
    askDescribeReady && askLocationReady
  );

  useEffect(() => {
    const controller = routeSessionController;
    const discoveryOwnership =
      captureEmergencyRouteOwnership(routeSession);

    if (
      !canonicalRequestId ||
      !shouldLoadAvailableNow
    ) {
      let active = true;

      Promise.resolve().then(() => {
        if (
          !active ||
          !controller.owns(discoveryOwnership)
        ) {
          return;
        }

        setAvailableProfessionals([]);
        setAvailableNowPhase("idle");
        setAvailableNowError("");
      });

      return () => {
        active = false;
      };
    }

    let active = true;

    async function loadAvailableNowProfessionals() {
      await Promise.resolve();

      if (
        !active ||
        !controller.owns(discoveryOwnership)
      ) {
        return;
      }

      setAvailableProfessionals([]);
      setAvailableNowPhase("loading");
      setAvailableNowError("");

      const operation =
        await settleEmergencyRouteOperation(
          controller,
          discoveryOwnership,
          listHomeownerAvailableEmergencyProfessionals(
            canonicalRequestId,
            { setPage }
          )
        );

      if (
        !active ||
        !controller.owns(discoveryOwnership) ||
        operation.status === "stale"
      ) {
        return;
      }

      const result = operation.value;

      if (
        operation.status === "rejected" ||
        !result?.ok
      ) {
        setAvailableProfessionals([]);
        setAvailableNowPhase("error");
        setAvailableNowError(
          result?.message || ""
        );
        return;
      }

      setAvailableProfessionals(
        result.professionals
      );
      setAvailableNowPhase("ready");
    }

    void loadAvailableNowProfessionals();

    return () => {
      active = false;
    };
  }, [
    canonicalRequestId,
    routeSession,
    routeSessionController,
    setPage,
    shouldLoadAvailableNow,
  ]);

  const canonicalStatus = getRequestStatus(canonicalRequest);
  const editableDraft = isEditableEmergencyDraft(canonicalRequest);
  const showDraftWorkflow = Boolean(
    draftWorkflowOpen &&
      (
        !emergencyRoute.hasRequestId ||
        (canonicalRequest && editableDraft)
      )
  );
  const draftWorkflowActionLabel =
    copy.continueRequest;
  const cancellationAvailable =
    canCancelEmergencyRequest(canonicalRequest);
  const pageTitle =
    canonicalStatus === "cancelled"
      ? copy.cancelledPageTitle
      : ["completed", "resolved"].includes(canonicalStatus)
        ? copy.completedPageTitle
        : canonicalStatus === "safety_blocked"
          ? copy.safetyTitle
          : editableDraft
            ? copy.title
            : copy.requestPageTitle;
  const simplifiedStage = getSimplifiedEmergencyProgressStage(
    canonicalStatus,
    { phase, recoveryState }
  );
  const showWorkCenterAction = [
    "ready_for_distribution",
    "active",
    "selection_pending",
    "assigned",
    "professional_en_route",
    "professional_arrived",
    "in_service",
    "work_in_progress",
    "completed",
    "resolved",
  ].includes(canonicalStatus);
  const emergencyRelationshipDetail = useMemo(
    () =>
      normalizeEmergencyRelationshipDetail({
        emergencyRequest: canonicalRequest,
        responses,
        conversationId: canonicalConversationId,
        language,
      }),
    [
      canonicalConversationId,
      canonicalRequest,
      language,
      responses,
    ]
  );
  const recoveryFailureMessage =
    recoveryFailureKind === "invalid"
      ? copy.recoveryInvalid
      : recoveryFailureKind === "unauthorized"
        ? copy.recoveryUnauthorized
        : recoveryFailureKind === "not_found"
          ? copy.recoveryNotFound
          : recoveryFailureKind === "unavailable"
            ? copy.recoveryUnavailable
            : copy.recoveryFailed;

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }

    if (field === "service" && value) {
      setUnsupportedRecoveredSpecialty("");
    }
  }

  function updateSafety(field, value) {
    setSafety((current) => ({
      ...current,
      [field]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  async function submitAskMeetroIntake(event) {
    event.preventDefault();
    const homeownerText = clean(askInput);
    const interpretationStage =
      askStage === "describe" || askStage === "location"
        ? askStage
        : "";
    if (
      !homeownerText ||
      !interpretationStage ||
      askPending ||
      canonicalRequest
    ) return;

    setAskPending(true);
    setAskError("");
    try {
      const result = await requestEmergencyRequestInterpretation({
        text: homeownerText,
        stage: interpretationStage,
        intake: askIntake,
        locale: language === "es" ? "es-US" : "en-US",
        setPage,
      });
      const applied = applyEmergencyRequestInterpretation(
        askIntake,
        result.interpretation,
        { stage: interpretationStage }
      );
      const nextIntake = applied.intake;
      const nextMessages = [
        {
          role: "homeowner",
          text: homeownerText,
        },
        {
          role: "assistant",
          text: buildAskMeetroDisplayMessage({
            stage: interpretationStage,
            intake: nextIntake,
            language,
            copy,
          }),
        },
      ];
      let nextClarifications = result.interpretation.clarifications;

      if (
        interpretationStage === "describe" &&
        nextIntake.description &&
        nextIntake.service.specialty &&
        nextClarifications.length === 0
      ) {
        nextMessages.push({
          role: "assistant",
          text: copy.askFindHelpOffer,
        });
        nextClarifications = [];
        setAskStage("consent");
      } else if (
        interpretationStage === "location" &&
        (
          clean(nextIntake.location?.city) ||
          clean(nextIntake.location?.postalCode)
        )
      ) {
        nextClarifications = [];
        setAskStage("review");
      }

      setAskIntake(nextIntake);
      setAskMessages((current) => [
        ...current,
        ...nextMessages,
      ]);
      setAskClarifications(nextClarifications);
      setAskInput("");
    } catch {
      setAskError(copy.askIntakeFailed);
    } finally {
      setAskPending(false);
    }
  }

  function acceptAskMeetroFindHelp() {
    if (
      askStage !== "consent" ||
      askPending ||
      pending ||
      canonicalRequest
    ) return;

    setAskStage("location");
    setAskClarifications([]);
    setAskInput("");
    setAskError("");
    setAskMessages((current) => [
      ...current,
      { role: "homeowner", text: copy.askFindHelpYes },
      { role: "assistant", text: copy.askLocationPrompt },
    ]);
  }

  function declineAskMeetroFindHelp() {
    if (
      askStage !== "consent" ||
      askPending ||
      pending ||
      canonicalRequest
    ) return;

    setAskStage("describe");
    setAskClarifications([]);
    setAskInput("");
    setAskError("");
    setAskMessages((current) => [
      ...current,
      { role: "homeowner", text: copy.askFindHelpNotNow },
      { role: "assistant", text: copy.askFindHelpDeclined },
    ]);
  }

  async function confirmAskMeetroIntake() {
    if (!askIntakeReady || pending || canonicalRequest) return;

    let confirmed;
    try {
      confirmed = confirmEmergencyRequestInterpretation(askIntake);
    } catch {
      setAskError(copy.askIntakeFailed);
      return;
    }

    const service = EMERGENCY_SERVICE_OPTIONS.find(
      (option) => option.value === confirmed.serviceSpecialty
    );
    const serviceLabel = service
      ? copy.serviceLabels?.[service.value] || service.label.en
      : "";
    const payload = {
      category: "home_repair",
      serviceDomain: service?.domain || "",
      serviceSpecialty: confirmed.serviceSpecialty,
      title: buildEmergencyRequestTitle(
        serviceLabel,
        confirmed.description
      ),
      description: confirmed.description,
      locationText: confirmed.locationText,
      unitNumber: "",
      accessNotes: "",
    };
    const controller = routeSessionController;
    const mutationOwnership = controller.capture();

    setPending(true);
    setAskError("");
    setErrorMessage("");
    const operation = await settleEmergencyRouteOperation(
      controller,
      mutationOwnership,
      createEmergencyDraft(payload, { setPage })
    );
    if (operation.status === "stale") return;
    setPending(false);
    if (
      operation.status === "rejected" ||
      !operation.value?.ok ||
      !operation.value.emergencyRequest
    ) {
      setAskError(operation.value?.message || copy.requestFailed);
      return;
    }

    const canonicalRequestId = getRequestId(
      operation.value.emergencyRequest
    );
    const owningSession = synchronizeCreatedEmergencyRequest(
      canonicalRequestId
    );
    const nextOwnedRequest = owningSession
      ? ownCanonicalRequestForSession(
          operation.value.emergencyRequest,
          owningSession
        )
      : null;
    if (!nextOwnedRequest) {
      setAskError(copy.requestFailed);
      return;
    }

    setOwnedCanonicalRequest(nextOwnedRequest);
    setForm(buildDraftForm(operation.value.emergencyRequest, {
      service: confirmed.serviceSpecialty,
      description: confirmed.description,
      locationText: confirmed.locationText,
      unitNumber: "",
      accessNotes: "",
    }));
    setRecoveryState("loaded");
    setMessage("");
    setPhase("safety");
  }

  function synchronizeCreatedEmergencyRequest(requestId) {
    const route = buildEmergencyRequestRoute(requestId);
    const parsedRoute = parseEmergencyRequestRoute(route);

    if (
      !parsedRoute.valid ||
      !parsedRoute.hasRequestId ||
      !parsedRoute.requestId
    ) {
      return null;
    }

    const nextSession =
      routeSessionController.transition(parsedRoute);
    replaceEmergencyRequestRoute(parsedRoute.requestId);
    setRouteSession(nextSession);
    return nextSession;
  }

  function ownCanonicalRequestForSession(
    emergencyRequest,
    session = routeSessionController.current()
  ) {
    const ownedRequest = ownEmergencyRequest(
      session,
      emergencyRequest
    );

    return selectEmergencyRequestForRoute(
      session,
      ownedRequest
    )
      ? ownedRequest
      : null;
  }

  async function refreshCanonicalRequestAfterMutation() {
    const coordinator =
      emergencyRefreshCoordinatorRef.current;
    if (!coordinator) return null;

    const result = await coordinator.refresh({
      invalidate: true,
      trigger: "mutation",
    });
    return result.status === "applied"
      ? result.value
      : null;
  }

  async function submitDetails(event) {
    event.preventDefault();

    if (canonicalRequest && !editableDraft) {
      setErrorMessage(copy.readOnlyBody);
      setMessage("");
      return;
    }

    const payload = {
      category: "home_repair",
      serviceDomain: selectedService?.domain || "",
      serviceSpecialty: selectedService?.value || "",
      title: buildEmergencyRequestTitle(
        selectedServiceLabel,
        form.description
      ),
      description: clean(form.description),
      locationText: clean(form.locationText),
      unitNumber: "",
      accessNotes: "",
    };

    if (
      !payload.serviceSpecialty ||
      !payload.description ||
      !payload.locationText
    ) {
      setErrorMessage(copy.required);
      setMessage("");
      return;
    }

    const controller = routeSessionController;
    const mutationOwnership = controller.capture();

    setPending(true);
    setErrorMessage("");
    setMessage("");

    const requestId = getRequestId(canonicalRequest);
    const operation = await settleEmergencyRouteOperation(
      controller,
      mutationOwnership,
      requestId
        ? updateEmergencyDraft(requestId, payload, {
            setPage,
          })
        : createEmergencyDraft(payload, {
            setPage,
          })
    );

    if (operation.status === "stale") {
      return;
    }

    setPending(false);

    if (operation.status === "rejected") {
      setErrorMessage(copy.requestFailed);
      return;
    }

    const result = operation.value;

    if (!result.ok || !result.emergencyRequest) {
      setErrorMessage(result.message || copy.requestFailed);
      return;
    }

    const canonicalRequestId =
      getRequestId(result.emergencyRequest);
    const owningSession = requestId
      ? controller.current()
      : synchronizeCreatedEmergencyRequest(
          canonicalRequestId
        );
    const nextOwnedRequest = owningSession
      ? ownCanonicalRequestForSession(
          result.emergencyRequest,
          owningSession
        )
      : null;

    if (!nextOwnedRequest) {
      setErrorMessage(copy.requestFailed);
      return;
    }

    setOwnedCanonicalRequest(nextOwnedRequest);
    setUnsupportedRecoveredSpecialty("");
    setForm(
      buildDraftForm(result.emergencyRequest, {
        ...form,
        service: form.service,
      })
    );

    if (requestId && canonicalRequestId) {
      replaceEmergencyRequestRoute(canonicalRequestId);
    }

    setRecoveryState("loaded");
    setMessage("");
    setPhase("safety");
  }

  async function submitSafety(event) {
    event.preventDefault();

    if (!editableDraft) {
      setErrorMessage(copy.readOnlyBody);
      setMessage("");
      return;
    }

    const requestId = getRequestId(canonicalRequest);

    if (!requestId) {
      setErrorMessage(copy.requestFailed);
      return;
    }

    const controller = routeSessionController;
    const mutationOwnership = controller.capture();

    setPending(true);
    setErrorMessage("");
    setMessage("");

    const operation = await settleEmergencyRouteOperation(
      controller,
      mutationOwnership,
      saveEmergencySafetyAssessment(
        requestId,
        {
          ...safety,
          additionalSafetyContext: clean(
            safety.additionalSafetyContext
          ),
        },
        {
          setPage,
        }
      )
    );

    if (operation.status === "stale") {
      return;
    }

    if (operation.status === "rejected") {
      setPending(false);
      setErrorMessage(copy.safetyFailed);
      return;
    }

    const safetyResult = operation.value;

    if (!safetyResult.ok || !safetyResult.emergencyRequest) {
      setPending(false);
      setErrorMessage(safetyResult.message || copy.safetyFailed);
      return;
    }

    const safetyOwnedRequest = ownCanonicalRequestForSession(
      safetyResult.emergencyRequest
    );

    if (!safetyOwnedRequest) {
      setPending(false);
      setErrorMessage(copy.safetyFailed);
      return;
    }

    setOwnedCanonicalRequest(safetyOwnedRequest);

    if (!hasBackendSafetyPermissionToPrepare(safetyResult.emergencyRequest)) {
      setPending(false);
      setPhase("lifecycle");
      setDraftWorkflowOpen(false);
      setRecoveryState("loaded");
      return;
    }

    const prepareOperation = await settleEmergencyRouteOperation(
      controller,
      mutationOwnership,
      prepareEmergencyRequest(requestId, { setPage })
    );

    if (prepareOperation.status === "stale") {
      return;
    }

    setPending(false);

    if (prepareOperation.status === "rejected") {
      setErrorMessage(copy.preparationFailed);
      return;
    }

    const prepareResult = prepareOperation.value;

    if (
      !prepareResult.ok ||
      !prepareResult.emergencyRequest ||
      getRequestStatus(prepareResult.emergencyRequest) !==
        "ready_for_distribution"
    ) {
      setErrorMessage(
        prepareResult.message || copy.preparationFailed
      );
      return;
    }

    const preparedOwnedRequest = ownCanonicalRequestForSession(
      prepareResult.emergencyRequest
    );

    if (!preparedOwnedRequest) {
      setErrorMessage(copy.preparationFailed);
      return;
    }

    setOwnedCanonicalRequest(preparedOwnedRequest);
    setPhase("lifecycle");
    setDraftWorkflowOpen(false);
    setCancelConfirmationOpen(false);
    setRecoveryState("loaded");
    await refreshCanonicalRequestAfterMutation();
  }

  function editDetails() {
    if (!editableDraft) {
      setErrorMessage(copy.readOnlyBody);
      return;
    }

    setPhase("details");
    setMessage("");
    setErrorMessage("");
  }

  function openDraftWorkflow() {
    if (!canonicalRequest || !editableDraft || pending) {
      return;
    }

    setDraftWorkflowOpen(true);
    setMessage("");
    setErrorMessage("");
    setCancelConfirmationOpen(false);
  }

  function requestCancellation() {
    if (!cancellationAvailable || pending) {
      return;
    }

    setCancelConfirmationOpen(true);
    setMessage("");
    setErrorMessage("");
  }

  function keepEmergencyRequest() {
    if (pending) return;

    setCancelConfirmationOpen(false);
    setErrorMessage("");
  }

  async function confirmCancellation() {
    const requestId = getRequestId(canonicalRequest);

    if (!requestId || !cancellationAvailable || pending) {
      return;
    }

    const controller = routeSessionController;
    const mutationOwnership = controller.capture();

    setPending(true);
    setMessage("");
    setErrorMessage("");

    const operation = await settleEmergencyRouteOperation(
      controller,
      mutationOwnership,
      cancelEmergencyRequest(requestId, { setPage })
    );

    if (operation.status === "stale") {
      return;
    }

    setPending(false);

    if (operation.status === "rejected") {
      setErrorMessage(copy.cancellationFailed);
      return;
    }

    const result = operation.value;

    if (!result.ok || !result.emergencyRequest) {
      setErrorMessage(
        result.message || copy.cancellationFailed
      );
      return;
    }

    const nextOwnedRequest = ownCanonicalRequestForSession(
      result.emergencyRequest
    );

    if (!nextOwnedRequest) {
      setErrorMessage(copy.cancellationFailed);
      return;
    }

    setOwnedCanonicalRequest(nextOwnedRequest);
    setPhase("lifecycle");
    setCancelConfirmationOpen(false);
    setRecoveryState("loaded");
    await refreshCanonicalRequestAfterMutation();
  }

  function openAvailableProfessionalProfile(
    contractorProfileId
  ) {
    if (
      !canonicalRequestId ||
      selectionPending
    ) {
      return;
    }

    const professional =
      availableProfessionals.find(
        (candidate) =>
          candidate.contractorProfileId ===
          contractorProfileId
      );

    if (!professional) return;

    const returnRoute =
      buildEmergencyRequestRoute(
        canonicalRequestId
      );

    setPage(
      `contractorDetails?profileId=${encodeURIComponent(
        String(
          professional.contractorProfileId
        )
      )}&returnPage=${encodeURIComponent(
        returnRoute
      )}`
    );
  }

  function requestAvailableProfessionalSelectionById(
    contractorProfileId
  ) {
    if (selectionPending) return;

    const professional =
      availableProfessionals.find(
        (candidate) =>
          candidate.contractorProfileId ===
          contractorProfileId
      );

    if (!professional) return;

    setSelectedResponse(null);
    setSelectedAvailableProfessional(
      professional
    );
    setSelectionError("");
  }

  async function confirmAvailableProfessionalSelection() {
    if (
      !canonicalRequestId ||
      !selectedAvailableProfessional?.contractorProfileId ||
      selectionPending
    ) {
      return;
    }

    const controller = routeSessionController;
    const mutationOwnership = controller.capture();

    setSelectionPending(true);
    setSelectionError("");

    const operation =
      await settleEmergencyRouteOperation(
        controller,
        mutationOwnership,
        selectHomeownerAvailableEmergencyProfessional(
          canonicalRequestId,
          selectedAvailableProfessional.contractorProfileId,
          {
            setPage,
          }
        )
      );

    if (operation.status === "stale") {
      return;
    }

    setSelectionPending(false);

    if (operation.status === "rejected") {
      setSelectionError(
        t("emergencySelectionFailed", language)
      );
      return;
    }

    const result = operation.value;

    if (
      !result.ok ||
      !result.emergencyRequest ||
      !result.conversation?.id
    ) {
      setSelectionError(
        result.message ||
          t(
            "emergencySelectionFailed",
            language
          )
      );
      return;
    }

    const nextOwnedRequest =
      ownCanonicalRequestForSession({
        ...(canonicalRequest || {}),
        ...result.emergencyRequest,
      });

    if (!nextOwnedRequest) {
      setSelectionError(
        t("emergencySelectionFailed", language)
      );
      return;
    }

    setOwnedCanonicalRequest(nextOwnedRequest);
    setResponses((current) =>
      current.map((response) =>
        response.status === "pending"
          ? {
              ...response,
              status: "declined",
            }
          : response
      )
    );
    setAvailableProfessionals([]);
    setAvailableNowPhase("idle");
    setAvailableNowError("");
    setCanonicalConversationId(
      result.conversation.id
    );
    setSelectedAvailableProfessional(null);

    await refreshCanonicalRequestAfterMutation();
  }

  function requestProfessionalSelection(response) {
    if (
      selectionPending ||
      response?.status !== "pending"
    ) {
      return;
    }

    setSelectedAvailableProfessional(null);
    setSelectedResponse(response);
    setSelectionError("");
  }

  function requestProfessionalSelectionById(responseId) {
    const response = responses.find(
      (candidate) => candidate.id === responseId
    );

    if (response) {
      requestProfessionalSelection(response);
    }
  }

  function keepWaitingForProfessional() {
    if (selectionPending) return;
    setSelectedResponse(null);
    setSelectedAvailableProfessional(null);
    setSelectionError("");
  }

  function openCanonicalEmergencyConversation() {
    if (!canonicalConversationId) return;

    setPage(
      buildCanonicalConversationRoute(
        canonicalConversationId,
        buildEmergencyRequestRoute(canonicalRequestId),
        {
          shell: "communicationCenter",
        }
      )
    );
  }

  async function confirmProfessionalSelection() {
    if (
      !canonicalRequestId ||
      !selectedResponse?.id ||
      selectionPending
    ) {
      return;
    }

    const controller = routeSessionController;
    const mutationOwnership = controller.capture();

    setSelectionPending(true);
    setSelectionError("");

    const operation = await settleEmergencyRouteOperation(
      controller,
      mutationOwnership,
      selectHomeownerEmergencyResponse(
        canonicalRequestId,
        selectedResponse.id,
        {
          setPage,
        }
      )
    );

    if (operation.status === "stale") {
      return;
    }

    setSelectionPending(false);

    if (operation.status === "rejected") {
      setSelectionError(
        t("emergencySelectionFailed", language)
      );
      return;
    }

    const result = operation.value;

    if (
      !result.ok ||
      !result.emergencyRequest ||
      !result.conversation?.id
    ) {
      setSelectionError(
        result.message ||
          t("emergencySelectionFailed", language)
      );
      return;
    }

    const nextOwnedRequest = ownCanonicalRequestForSession({
      ...(canonicalRequest || {}),
      ...result.emergencyRequest,
    });

    if (!nextOwnedRequest) {
      setSelectionError(
        t("emergencySelectionFailed", language)
      );
      return;
    }

    setOwnedCanonicalRequest(nextOwnedRequest);
    setResponses((current) =>
      current.map((response) =>
        response.id === selectedResponse.id
          ? {
              ...response,
              status: "active",
              conversationAvailable: true,
            }
          : response.status === "pending"
            ? { ...response, status: "declined" }
            : response
      )
    );
    setCanonicalConversationId(result.conversation.id);
    setSelectedResponse(null);
    await refreshCanonicalRequestAfterMutation();
  }

  return (
    <div
      className={
        canonicalRequest && !showDraftWorkflow
          ? "app-page meetro-wide-page emergency-page emergency-find-help-page"
          : "app-page meetro-form-page"
      }
      style={page}
    >
      <main
        className={
          canonicalRequest && !showDraftWorkflow
            ? "emergency-find-help-main"
            : undefined
        }
        style={card}
        aria-labelledby={
          !canonicalRequest || showDraftWorkflow
            ? "emergency-request-title"
            : undefined
        }
        aria-label={
          canonicalRequest && !showDraftWorkflow
            ? copy.requestPageTitle
            : undefined
        }
      >
        {(!canonicalRequest || showDraftWorkflow) && (
          <>
            <button
              type="button"
              style={backMini}
              onClick={() => setPage(
                emergencyRoute.returnPage === "notifications"
                  ? "notifications"
                  : emergencyRoute.hasRequestId
                    ? "myRequests"
                    : "home"
              )}
              aria-label={copy.back}
              disabled={pending}
            >
              ←
            </button>

            <h1 id="emergency-request-title" style={title}>
              {pageTitle}
            </h1>

            <p style={intro}>{copy.intro}</p>

            <div style={emergencyWarning} role="alert">
              {copy.emergencyWarning}
            </div>

            <div style={limitationNotice} role="status">
              {copy.limitation}
            </div>

            {phase === "details" &&
              !canonicalRequest &&
              !emergencyRoute.hasRequestId && (
              <button
                type="button"
                style={secondaryEntryButton}
                disabled={pending || askPending}
                onClick={() => {
                  setIntakeMode((current) =>
                    current === "ask" ? "manual" : "ask"
                  );
                  setAskError("");
                  setErrorMessage("");
                }}
              >
                {intakeMode === "ask"
                  ? copy.fillManually
                  : copy.returnToAskMeetro}
              </button>
            )}

            {phase !== "details" && canonicalRequest && (
              <ContextualAskMeetro
                language={language}
                context={{ page: "emergencyRequest" }}
                contextName={copy.askMeetroContext}
              />
            )}
          </>
        )}

        {simplifiedStage && (
          <EmergencyProgress
            copy={copy}
            currentStage={simplifiedStage}
          />
        )}

        {message && (
          <div style={successNotice} role="status" aria-live="polite">
            {message}
          </div>
        )}

        {(errorMessage || unsupportedSpecialtyMessage) && (
          <div style={errorNotice} role="alert" aria-live="assertive">
            {errorMessage || unsupportedSpecialtyMessage}
          </div>
        )}

        {recoveryState === "loading" && (
          <section
            style={formCard}
            role="status"
            aria-live="polite"
          >
            <p style={recoveryMessage}>
              {copy.recoveryLoading}
            </p>
          </section>
        )}

        {recoveryState === "failed" && (
          <section style={formCard}>
            <p style={recoveryMessage}>
              {recoveryFailureMessage}
            </p>

            <button
              type="button"
              style={primaryButton}
              onClick={() => setPage("myRequests")}
            >
              {copy.viewMyEmergencyRequests}
            </button>
          </section>
        )}

        {recoveryState === "loaded" &&
          emergencyRoute.hasRequestId &&
          showDraftWorkflow &&
          !message && (
            <div style={successNotice} role="status">
              {copy.recovered}
          </div>
        )}

        {recoveryState !== "loading" &&
          recoveryState !== "failed" &&
          showDraftWorkflow &&
          editableDraft &&
          phase === "details" &&
          !canonicalRequest &&
          !emergencyRoute.hasRequestId &&
          intakeMode === "ask" && (
          <section style={askIntakeCard} aria-labelledby="emergency-ask-intake-title">
            <h2 id="emergency-ask-intake-title" style={sectionTitle}>
              {copy.askIntakeTitle}
            </h2>
            <p style={askIntakeIntro}>{copy.askIntakeIntro}</p>

            {askMessages.length > 0 && (
              <div style={askTranscript} aria-live="polite">
                {askMessages.map((entry, index) => (
                  <div
                    key={`${entry.role}-${index}`}
                    style={entry.role === "assistant" ? askAssistantMessage : askHomeownerMessage}
                  >
                    <strong>
                      {entry.role === "assistant"
                        ? copy.askIntakeAssistant
                        : copy.askIntakeHomeowner}
                    </strong>
                    <span>{entry.text}</span>
                  </div>
                ))}
              </div>
            )}

            {askClarifications.map((clarification) => (
              <p key={`${clarification.fieldPath || "general"}-${clarification.question}`} style={askClarification}>
                {clarification.question}
              </p>
            ))}

            {askError && (
              <div style={errorNotice} role="alert">
                {askError}
              </div>
            )}

            {askStage === "consent" && (
              <div style={askConsentActions}>
                <button
                  type="button"
                  style={askConsentPrimaryButton}
                  disabled={askPending || pending}
                  onClick={acceptAskMeetroFindHelp}
                >
                  {copy.askFindHelpYes}
                </button>
                <button
                  type="button"
                  style={askConsentSecondaryButton}
                  disabled={askPending || pending}
                  onClick={declineAskMeetroFindHelp}
                >
                  {copy.askFindHelpNotNow}
                </button>
              </div>
            )}

            {(askStage === "describe" || askStage === "location") && (
              <form onSubmit={submitAskMeetroIntake}>
                <FieldLabel
                  htmlFor="emergency-ask-input"
                  label={
                    askStage === "location"
                      ? copy.location
                      : copy.description
                  }
                />
                <textarea
                  id="emergency-ask-input"
                  style={textarea}
                  rows={askStage === "location" ? 2 : 4}
                  value={askInput}
                  placeholder={
                    askStage === "location"
                      ? copy.askLocationPlaceholder
                      : copy.askIntakePlaceholder
                  }
                  disabled={askPending || pending}
                  onChange={(event) => {
                    setAskInput(event.target.value);
                    if (askError) setAskError("");
                  }}
                />
                <div style={askComposerActions}>
                  <button
                    type="submit"
                    style={{
                      ...primaryButton,
                      ...((askPending || !clean(askInput)) ? disabledButton : {}),
                    }}
                    disabled={askPending || pending || !clean(askInput)}
                  >
                    {askPending ? copy.askIntakeThinking : copy.askIntakeSend}
                  </button>
                </div>
              </form>
            )}

            {askStage === "review" && askIntakeReady && (
              <section style={askReviewCard} aria-labelledby="emergency-ask-review-title">
                <h3 id="emergency-ask-review-title" style={askReviewTitle}>
                  {copy.askIntakeReviewTitle}
                </h3>
                <p style={askReviewIntro}>{copy.askIntakeReviewIntro}</p>
                <dl style={askReviewList}>
                  <div>
                    <dt style={askReviewLabel}>{copy.service}</dt>
                    <dd style={askReviewValue}>{askSelectedServiceLabel}</dd>
                  </div>
                  <div>
                    <dt style={askReviewLabel}>{copy.location}</dt>
                    <dd style={askReviewValue}>{askGeneralArea}</dd>
                  </div>
                  <div>
                    <dt style={askReviewLabel}>{copy.description}</dt>
                    <dd style={askReviewValue}>{askIntake.description}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  style={{
                    ...primaryButton,
                    ...(pending ? disabledButton : {}),
                  }}
                  disabled={pending}
                  onClick={() => void confirmAskMeetroIntake()}
                >
                  {pending ? copy.saving : copy.continueToSafety}
                </button>
              </section>
            )}
          </section>
        )}

        {recoveryState !== "loading" &&
          recoveryState !== "failed" &&
          showDraftWorkflow &&
          editableDraft &&
          phase === "details" &&
          (canonicalRequest || emergencyRoute.hasRequestId || intakeMode === "manual") && (
          <form style={formCard} onSubmit={submitDetails} noValidate>
            <fieldset style={serviceChoices}>
              <legend style={serviceChoicesLegend}>{copy.service}</legend>
              <div style={serviceChoiceGrid}>
                {EMERGENCY_SERVICE_OPTIONS.map((option) => {
                  const selected = form.service === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      style={{
                        ...serviceChoice,
                        ...(selected ? selectedServiceChoice : {}),
                      }}
                      aria-pressed={selected}
                      disabled={pending}
                      onClick={() => updateForm("service", option.value)}
                    >
                      {copy.serviceLabels[option.value]}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <FieldLabel
              htmlFor="emergency-description"
              label={copy.description}
            />

            <textarea
              id="emergency-description"
              style={textarea}
              rows={5}
              value={form.description}
              placeholder={copy.descriptionPlaceholder}
              disabled={pending}
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
            />

            <FieldLabel
              htmlFor="emergency-location"
              label={copy.location}
            />

            <textarea
              id="emergency-location"
              style={textarea}
              rows={2}
              value={form.locationText}
              placeholder={copy.locationPlaceholder}
              disabled={pending}
              onChange={(event) =>
                updateForm("locationText", event.target.value)
              }
            />

            <button
              type="submit"
              style={{
                ...primaryButton,
                ...(pending ? disabledButton : {}),
              }}
              disabled={pending}
            >
              {pending ? copy.saving : copy.continueToSafety}
            </button>
          </form>
        )}

        {recoveryState !== "loading" &&
          recoveryState !== "failed" &&
          showDraftWorkflow &&
          editableDraft &&
          phase === "safety" && (
          <form style={formCard} onSubmit={submitSafety} noValidate>
            <h2
              ref={safetyReviewHeadingRef}
              tabIndex={-1}
              style={sectionTitle}
            >
              {copy.safetyTitle}
            </h2>
            <p style={sectionIntro}>{copy.safetyIntro}</p>
            <p style={noHazardsNotice}>{copy.noListedHazards}</p>

            <fieldset style={safetyGroup}>
              <legend style={safetyGroupLegend}>
                {copy.hazardConditions}
              </legend>

              <SafetyCheck
                label={copy.immediateDanger}
                checked={safety.immediateDanger}
                disabled={pending}
                onChange={(value) =>
                  updateSafety("immediateDanger", value)
                }
              />

              <SafetyCheck
                label={copy.medicalEmergency}
                checked={safety.medicalEmergency}
                disabled={pending}
                onChange={(value) =>
                  updateSafety("medicalEmergency", value)
                }
              />

              <SafetyCheck
                label={copy.fireOrSmoke}
                checked={safety.fireOrSmoke}
                disabled={pending}
                onChange={(value) =>
                  updateSafety("fireOrSmoke", value)
                }
              />

              <SafetyCheck
                label={copy.gasLeak}
                checked={safety.gasOdorOrSuspectedLeak}
                disabled={pending}
                onChange={(value) =>
                  updateSafety("gasOdorOrSuspectedLeak", value)
                }
              />

              <SafetyCheck
                label={copy.crimeThreat}
                checked={safety.activeCrimeOrThreat}
                disabled={pending}
                onChange={(value) =>
                  updateSafety("activeCrimeOrThreat", value)
                }
              />

              <SafetyCheck
                label={copy.electricalHazard}
                checked={safety.electricalImmediateHazard}
                disabled={pending}
                onChange={(value) =>
                  updateSafety("electricalImmediateHazard", value)
                }
              />

              <SafetyCheck
                label={copy.collapseRisk}
                checked={safety.structuralCollapseRisk}
                disabled={pending}
                onChange={(value) =>
                  updateSafety("structuralCollapseRisk", value)
                }
              />

              <SafetyCheck
                label={copy.flooding}
                checked={safety.floodingOrWaterDamage}
                disabled={pending}
                onChange={(value) =>
                  updateSafety("floodingOrWaterDamage", value)
                }
              />

              <SafetyCheck
                label={copy.unableToExit}
                checked={safety.occupantsUnableToExit}
                disabled={pending}
                onChange={(value) =>
                  updateSafety("occupantsUnableToExit", value)
                }
              />
            </fieldset>

            <fieldset style={safetyGroup}>
              <legend style={safetyGroupLegend}>
                {copy.safetyStatusTitle}
              </legend>
              <p style={safetyGroupIntro}>
                {copy.safetyStatusIntro}
              </p>

              <SafetyCheck
                label={copy.servicesContacted}
                checked={safety.emergencyServicesContacted}
                disabled={pending}
                onChange={(value) =>
                  updateSafety("emergencyServicesContacted", value)
                }
              />

              <SafetyCheck
                label={copy.safeToRemain}
                checked={safety.safeToRemainAtLocation}
                disabled={pending}
                onChange={(value) =>
                  updateSafety("safeToRemainAtLocation", value)
                }
              />
            </fieldset>

            <FieldLabel
              htmlFor="emergency-safety-context"
              label={copy.additionalSafety}
            />

            <textarea
              id="emergency-safety-context"
              style={textarea}
              rows={4}
              value={safety.additionalSafetyContext}
              placeholder={copy.additionalSafetyPlaceholder}
              disabled={pending}
              onChange={(event) =>
                updateSafety(
                  "additionalSafetyContext",
                  event.target.value
                )
              }
            />

            {errorMessage && (
              <div style={inlineErrorNotice}>
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              style={{
                ...primaryButton,
                ...(pending ? disabledButton : {}),
              }}
              disabled={pending}
            >
              {pending
                ? copy.safetySaving
                : copy.continueToFindHelp}
            </button>

            <button
              type="button"
              style={secondaryButton}
              onClick={editDetails}
              disabled={pending}
            >
              {copy.editDetails}
            </button>
          </form>
        )}

        {recoveryState !== "loading" &&
          recoveryState !== "failed" &&
          canonicalRequest &&
          !showDraftWorkflow && (
            emergencyRelationshipDetail ? (
              <div className="emergency-find-help-layout">
                <div className="emergency-find-help-left-column">
                  <div
                    ref={
                      canonicalStatus ===
                      "ready_for_distribution"
                        ? findHelpSectionRef
                        : null
                    }
                    style={findHelpAnchor}
                  >
                    <EmergencyAvailableNow
                    visible={
                      canonicalStatus ===
                      "ready_for_distribution"
                    }
                    phase={availableNowPhase}
                    professionals={
                      availableProfessionals
                    }
                    selectionPending={
                      selectionPending
                    }
                    errorMessage={
                      availableNowError
                    }
                    language={language}
                    onViewProfile={
                      openAvailableProfessionalProfile
                    }
                    onChooseProfessional={
                      requestAvailableProfessionalSelectionById
                    }
                    />
                  </div>

                  <EmergencyProfessionalResponses
                    phase={
                      shouldLoadResponses
                        ? responsesPhase
                        : "idle"
                    }
                    responses={
                      emergencyRelationshipDetail.responseCards
                    }
                    selectionPending={
                      selectionPending
                    }
                    language={language}
                    onSelectResponse={
                      requestProfessionalSelectionById
                    }
                    onKeepWaiting={
                      canonicalStatus ===
                      "ready_for_distribution"
                        ? () =>
                            setPage(detailReturnPage)
                        : undefined
                    }
                  />
                </div>

                <EmergencyRelationshipDetail
                detail={emergencyRelationshipDetail}
                language={language}
                responsesPhase={
                  shouldLoadResponses
                    ? responsesPhase
                    : "idle"
                }
                responsesPresentation="external"
                selectionPending={selectionPending}
                cancellationAvailable={cancellationAvailable}
                mutationPending={pending}
                onBack={() => setPage(detailReturnPage)}
                onOpenConversation={
                  openCanonicalEmergencyConversation
                }
                onSelectResponse={
                  requestProfessionalSelectionById
                }
                onCancelRequest={requestCancellation}
                workflowAction={
                  editableDraft
                    ? {
                        label: draftWorkflowActionLabel,
                        onClick: openDraftWorkflow,
                      }
                    : null
                }
              />
              </div>
            ) : (
              <section style={formCard} role="alert">
                <p style={recoveryMessage}>
                  {copy.recoveryUnavailable}
                </p>
                {showWorkCenterAction && (
                  <button
                    type="button"
                    style={secondaryButton}
                    onClick={() => setPage(detailReturnPage)}
                  >
                    {copy.viewMyEmergencyRequests}
                  </button>
                )}
              </section>
            )
          )}

        {showDraftWorkflow && cancellationAvailable && (
            <button
              type="button"
              style={dangerButton}
              onClick={requestCancellation}
              disabled={pending}
            >
              {copy.cancelRequest}
            </button>
          )}

        {selectedResponse && (
          <div style={selectionDialogBackdrop}>
            <section
              ref={selectionDialogRef}
              tabIndex={-1}
              style={selectionConfirmationCard}
              role="dialog"
              aria-modal="true"
              aria-labelledby="emergency-selection-title"
            >
              <h2
                id="emergency-selection-title"
                style={sectionTitle}
              >
                {t(
                  "emergencySelectConfirmTitle",
                  language
                )}
              </h2>

              <p style={completeBody}>
                {t(
                  "emergencySelectConfirmBody",
                  language,
                  {
                    business:
                      selectedResponse.professional
                        .businessName ||
                      t(
                        "messagesOwnerProfessional",
                        language
                      ),
                  }
                )}
              </p>

              {selectionError && (
                <div
                  style={errorNotice}
                  role="alert"
                >
                  {selectionError}
                </div>
              )}

              <button
                type="button"
                style={{
                  ...primaryButton,
                  ...(selectionPending
                    ? disabledButton
                    : {}),
                }}
                onClick={
                  confirmProfessionalSelection
                }
                disabled={selectionPending}
              >
                {selectionPending
                  ? copy.submitting
                  : t(
                      "emergencySelectConfirm",
                      language
                    )}
              </button>

              <button
                type="button"
                style={secondaryButton}
                onClick={keepWaitingForProfessional}
                disabled={selectionPending}
              >
                {t(
                  "emergencyKeepWaiting",
                  language
                )}
              </button>
            </section>
          </div>
        )}

        {selectedAvailableProfessional && (
          <div style={selectionDialogBackdrop}>
            <section
              ref={selectionDialogRef}
              tabIndex={-1}
              style={selectionConfirmationCard}
              role="dialog"
              aria-modal="true"
              aria-labelledby="emergency-available-selection-title"
            >
              <h2
                id="emergency-available-selection-title"
                style={sectionTitle}
              >
                {language === "es"
                  ? "¿Elegir este profesional?"
                  : "Choose this professional?"}
              </h2>

              <p style={completeBody}>
                {language === "es"
                  ? `${selectedAvailableProfessional.businessName} está Disponible Ahora y habilitó la selección directa de Emergencia. Meetro te conectará si todavía está disponible. Esto no significa que el profesional ya esté en camino.`
                  : `${selectedAvailableProfessional.businessName} is Available Now and has enabled direct Emergency selection. Meetro will connect you if the selection is still available. This does not mean the professional is already on the way.`}
              </p>

              {selectionError && (
                <div
                  style={errorNotice}
                  role="alert"
                >
                  {selectionError}
                </div>
              )}

              <button
                type="button"
                style={{
                  ...primaryButton,
                  ...(selectionPending
                    ? disabledButton
                    : {}),
                }}
                onClick={
                  confirmAvailableProfessionalSelection
                }
                disabled={selectionPending}
              >
                {selectionPending
                  ? copy.submitting
                  : language === "es"
                    ? "Elegir Profesional"
                    : "Choose Professional"}
              </button>

              <button
                type="button"
                style={secondaryButton}
                onClick={keepWaitingForProfessional}
                disabled={selectionPending}
              >
                {t(
                  "emergencyKeepWaiting",
                  language
                )}
              </button>
            </section>
          </div>
        )}

        {cancelConfirmationOpen && (
          <section
            style={confirmationCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="emergency-cancel-title"
          >
            <h2
              id="emergency-cancel-title"
              style={sectionTitle}
            >
              {copy.cancelConfirmTitle}
            </h2>

            <p style={completeBody}>
              {copy.cancelConfirmBody}
            </p>

            <button
              type="button"
              style={{
                ...dangerButton,
                ...(pending ? disabledButton : {}),
              }}
              onClick={confirmCancellation}
              disabled={pending}
            >
              {pending
                ? copy.cancelling
                : copy.confirmCancellation}
            </button>

            <button
              type="button"
              style={secondaryButton}
              onClick={keepEmergencyRequest}
              disabled={pending}
            >
              {copy.keepRequest}
            </button>
          </section>
        )}

        {(!canonicalRequest || showDraftWorkflow) && (
          <>
            <button
              type="button"
              style={homeButton}
              onClick={() => setPage("home")}
              disabled={pending}
            >
              {copy.home}
            </button>
          </>
        )}
      </main>

      <BottomNav currentPage="emergency" setPage={setPage} />
    </div>
  );
}

function EmergencyProgress({ copy, currentStage }) {
  const stages = ["details", "safety", "find", "connected"];
  const stageIcons = {
    details: "messages",
    safety: "trust",
    find: "availableNow",
    connected: "fastResponse",
  };

  return (
    <ol style={progressList} aria-label={copy.progress}>
      {stages.map((stage) => (
        <li
          key={stage}
          style={{
            ...progressItem,
            ...(stage === currentStage
              ? progressItemCurrent
              : {}),
          }}
          aria-current={
            stage === currentStage ? "step" : undefined
          }
        >
          <span style={progressIcon} aria-hidden="true">
            <MeetroIcon
              name={stageIcons[stage]}
              size={16}
              decorative
            />
          </span>
          <span>{copy.stages[stage]}</span>
        </li>
      ))}
    </ol>
  );
}

function FieldLabel({ htmlFor, label }) {
  return (
    <label htmlFor={htmlFor} style={fieldLabel}>
      {label}
    </label>
  );
}

function SafetyCheck({
  label,
  checked,
  disabled,
  onChange,
}) {
  return (
    <label style={checkRow}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />

      <span>{label}</span>
    </label>
  );
}

const page = {
  minHeight: "100dvh",
  background:
    "var(--meetro-color-background, #FAFAFC)",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 16px) max(16px, env(safe-area-inset-right, 0px)) calc(96px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
};

const card = {
  width: "100%",
  maxWidth: "560px",
  minWidth: 0,
  margin: "0 auto",
  paddingTop: "24px",
  paddingBottom: "90px",
  boxSizing: "border-box",
};

const findHelpAnchor = {
  width: "100%",
  minWidth: 0,
  scrollMarginTop:
    "calc(env(safe-area-inset-top, 0px) + 16px)",
};

const backMini = {
  width: "48px",
  height: "48px",
  marginBottom: "24px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  background: "white",
  color: "#111827",
  fontSize: "24px",
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
};

const title = {
  margin: "0 0 10px",
  color: "#111827",
  fontSize: "32px",
  lineHeight: 1.15,
  fontWeight: "900",
};

const intro = {
  margin: "0 0 18px",
  color: "#4b5563",
  fontSize: "16px",
  lineHeight: 1.6,
};

const emergencyWarning = {
  marginBottom: "12px",
  padding: "15px 16px",
  border: "1px solid #fecaca",
  borderRadius: "14px",
  background: "#fff7f7",
  color: "#991b1b",
  fontSize: "14px",
  fontWeight: "800",
  lineHeight: 1.5,
};

const limitationNotice = {
  marginBottom: "18px",
  padding: "15px 16px",
  border: "1px solid #dbeafe",
  borderRadius: "14px",
  background: "#eff6ff",
  color: "#1e3a8a",
  fontSize: "14px",
  lineHeight: 1.5,
};

const secondaryEntryButton = {
  minHeight: "40px",
  marginBottom: "14px",
  padding: "8px 12px",
  border: "1px solid #a7b8aa",
  borderRadius: "12px",
  background: "white",
  color: "#174b2c",
  font: "inherit",
  fontSize: "14px",
  fontWeight: "800",
  cursor: "pointer",
};

const askIntakeCard = {
  minWidth: 0,
  padding: "22px",
  border: "1px solid #bbd5c2",
  borderRadius: "22px",
  borderColor: "#bbd5c2",
  background: "#f8fcf8",
  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
};

const askIntakeIntro = {
  margin: "0 0 16px",
  color: "#4b5563",
  lineHeight: 1.55,
};

const askTranscript = {
  display: "grid",
  gap: "10px",
  marginBottom: "14px",
};

const askMessage = {
  display: "grid",
  gap: "4px",
  maxWidth: "92%",
  padding: "11px 13px",
  borderRadius: "14px",
  lineHeight: 1.45,
};

const askAssistantMessage = {
  ...askMessage,
  background: "#e8f4ea",
  color: "#174b2c",
};

const askHomeownerMessage = {
  ...askMessage,
  justifySelf: "end",
  background: "#eef2f7",
  color: "#1f2937",
};

const askClarification = {
  margin: "0 0 12px",
  padding: "10px 12px",
  borderLeft: "3px solid #4f7d5b",
  background: "white",
  color: "#274d31",
  lineHeight: 1.5,
};

const askComposerActions = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "12px",
};

const askConsentActions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "10px",
  marginTop: "16px",
};

const askConsentSecondaryButton = {
  ...secondaryEntryButton,
  width: "100%",
  minHeight: "50px",
  marginBottom: 0,
};

const askReviewCard = {
  marginTop: "18px",
  padding: "18px",
  border: "1px solid #86b391",
  borderRadius: "16px",
  background: "white",
};

const askReviewTitle = {
  margin: "0 0 6px",
  color: "#174b2c",
  fontSize: "19px",
};

const askReviewIntro = {
  margin: "0 0 14px",
  color: "#4b5563",
  lineHeight: 1.5,
};

const askReviewList = {
  display: "grid",
  gap: "12px",
  margin: "0 0 18px",
};

const askReviewLabel = {
  marginBottom: "3px",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "800",
  textTransform: "uppercase",
};

const askReviewValue = {
  margin: 0,
  color: "#111827",
  fontWeight: "700",
  lineHeight: 1.45,
};

const formCard = {
  minWidth: 0,
  padding: "22px",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  background: "white",
  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
};

const progressList = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "6px",
  margin: "8px 0 12px",
  padding: 0,
  listStyle: "none",
};

const progressItem = {
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: "3px",
  minWidth: 0,
  minHeight: "44px",
  padding: "5px 4px",
  border:
    "1px solid var(--meetro-color-line, #E5E7EB)",
  borderRadius: "12px",
  background:
    "var(--meetro-surface-muted, #F3F4F6)",
  color:
    "var(--meetro-color-muted, #6B7280)",
  fontSize: "10.5px",
  fontWeight: "800",
  lineHeight: 1.15,
  textAlign: "center",
};

const progressIcon = {
  width: "16px",
  height: "16px",
  display: "grid",
  placeItems: "center",
};

const progressItemCurrent = {
  border:
    "1px solid rgba(11, 93, 59, 0.35)",
  background:
    "var(--meetro-color-sage, #E8F5EE)",
  color:
    "var(--meetro-color-forest, #0B5D3B)",
  boxShadow: "none",
};

const serviceChoices = {
  minWidth: 0,
  margin: 0,
  padding: 0,
  border: 0,
};

const serviceChoicesLegend = {
  width: "100%",
  marginBottom: "10px",
  padding: 0,
  color: "#111827",
  fontSize: "14px",
  fontWeight: "800",
};

const serviceChoiceGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
};

const serviceChoice = {
  minHeight: "52px",
  padding: "12px",
  border: "1px solid #cbd5e1",
  borderRadius: "14px",
  background: "#fff",
  color: "#1f2937",
  font: "inherit",
  fontWeight: "800",
  cursor: "pointer",
};

const selectedServiceChoice = {
  borderColor: "#166534",
  background: "#ecfdf5",
  color: "#166534",
  boxShadow: "0 0 0 2px rgba(22, 101, 52, 0.12)",
};

const fieldLabel = {
  display: "block",
  margin: "18px 0 8px",
  color: "#111827",
  fontSize: "14px",
  fontWeight: "800",
};

const input = {
  width: "100%",
  minWidth: 0,
  minHeight: "48px",
  padding: "12px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: "14px",
  background: "white",
  color: "#111827",
  fontSize: "16px",
  boxSizing: "border-box",
};

const textarea = {
  ...input,
  minHeight: "auto",
  resize: "vertical",
  lineHeight: 1.5,
};

const checkRow = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "10px",
  padding: "13px 14px",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#f9fafb",
  color: "#1f2937",
  fontSize: "15px",
  lineHeight: 1.45,
};

const sectionTitle = {
  margin: "0 0 8px",
  color: "#111827",
  fontSize: "24px",
  lineHeight: 1.25,
  fontWeight: "900",
};

const sectionIntro = {
  margin: "0 0 18px",
  color: "#4b5563",
  fontSize: "15px",
  lineHeight: 1.55,
};

const noHazardsNotice = {
  margin: "0 0 18px",
  padding: "14px 16px",
  border: "1px solid #bfdbfe",
  borderRadius: "14px",
  background: "#eff6ff",
  color: "#1e3a8a",
  fontSize: "14px",
  fontWeight: "800",
  lineHeight: 1.5,
};

const safetyGroup = {
  minWidth: 0,
  margin: "0 0 18px",
  padding: 0,
  border: 0,
};

const safetyGroupLegend = {
  width: "100%",
  marginBottom: "10px",
  padding: 0,
  color: "#111827",
  fontSize: "15px",
  fontWeight: "900",
};

const safetyGroupIntro = {
  margin: "0 0 12px",
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: 1.5,
};

const primaryButton = {
  width: "100%",
  minHeight: "50px",
  marginTop: "22px",
  padding: "14px 16px",
  border: "none",
  borderRadius: "16px",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const askConsentPrimaryButton = {
  ...primaryButton,
  marginTop: 0,
};

const secondaryButton = {
  ...primaryButton,
  marginTop: "12px",
  border: "1px solid #cbd5e1",
  background: "white",
  color: "var(--meetro-color-forest, #1f4d34)",
};

const disabledButton = {
  opacity: 0.65,
  cursor: "not-allowed",
};

const dangerButton = {
  ...secondaryButton,
  marginTop: "12px",
  border: "1px solid #fecaca",
  background: "#fff7f7",
  color: "#b91c1c",
};

const successNotice = {
  marginBottom: "16px",
  padding: "14px 16px",
  border: "1px solid #a7f3d0",
  borderRadius: "14px",
  background: "#ecfdf5",
  color: "#065f46",
  fontSize: "14px",
  fontWeight: "800",
  lineHeight: 1.5,
};

const errorNotice = {
  marginBottom: "16px",
  padding: "14px 16px",
  border: "1px solid #fecaca",
  borderRadius: "14px",
  background: "#fef2f2",
  color: "#991b1b",
  fontSize: "14px",
  fontWeight: "800",
  lineHeight: 1.5,
};

const inlineErrorNotice = {
  ...errorNotice,
  marginTop: "18px",
  marginBottom: 0,
};

const recoveryMessage = {
  margin: 0,
  color: "#374151",
  fontSize: "15px",
  lineHeight: 1.6,
  textAlign: "center",
};

const completeCard = {
  padding: "24px",
  border: "1px solid #a7f3d0",
  borderRadius: "22px",
  background: "white",
  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
};

const confirmationCard = {
  ...completeCard,
  marginTop: "16px",
  border: "2px solid #fecaca",
  background: "#fffafa",
};

const selectionDialogBackdrop = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  display: "grid",
  placeItems: "center",
  paddingTop:
    "max(16px, env(safe-area-inset-top))",
  paddingRight: "16px",
  paddingBottom:
    "max(16px, env(safe-area-inset-bottom))",
  paddingLeft: "16px",
  background: "rgba(15, 23, 42, 0.48)",
  overflowY: "auto",
  overscrollBehavior: "contain",
};

const selectionConfirmationCard = {
  ...completeCard,
  width: "min(100%, 520px)",
  maxHeight: "calc(100dvh - 32px)",
  overflowY: "auto",
  boxSizing: "border-box",
  border: "2px solid #bfdbfe",
  background: "#f8fbff",
  boxShadow:
    "0 24px 70px rgba(15, 23, 42, 0.28)",
  outline: "none",
};

const completeBody = {
  margin: "0 0 18px",
  color: "#4b5563",
  fontSize: "15px",
  lineHeight: 1.6,
};

const homeButton = {
  ...primaryButton,
  marginTop: "12px",
  background: "#111827",
};

export default EmergencyRequest;
