import { useEffect, useMemo, useState } from "react";

import BottomNav from "../components/BottomNav";
import {
  cancelEmergencyRequest,
  createEmergencyDraft,
  getEmergencyRequest,
  prepareEmergencyRequest,
  saveEmergencySafetyAssessment,
  updateEmergencyDraft,
} from "../utils/emergencyApi";
import {
  parseEmergencyRequestRoute,
  replaceEmergencyRequestRoute,
} from "../utils/emergencyRoutes";
import { getLanguage } from "../utils/language";
import {
  formatPersonalAddress,
  resolveDefaultPersonalAddress,
} from "../utils/personalAddresses";

const SERVICE_OPTIONS = Object.freeze([
  {
    value: "emergency_plumbing",
    domain: "home_services",
    specialty: "plumbing_repairs",
    label: {
      en: "Emergency Plumbing",
      es: "Plomería de Emergencia",
    },
  },
  {
    value: "emergency_electrical",
    domain: "home_services",
    specialty: "electrical",
    label: {
      en: "Emergency Electrical",
      es: "Electricidad de Emergencia",
    },
  },
  {
    value: "roof_leak",
    domain: "home_services",
    specialty: "roofing",
    label: {
      en: "Roof Leak Repair",
      es: "Reparación de Techo",
    },
  },
  {
    value: "locksmith",
    domain: "home_services",
    specialty: "locksmith",
    label: {
      en: "Locksmith",
      es: "Cerrajero",
    },
  },
  {
    value: "storm_preparation",
    domain: "home_services",
    specialty: "storm_preparation",
    label: {
      en: "Storm Preparation",
      es: "Preparación para Tormentas",
    },
  },
  {
    value: "other_urgent_property_issue",
    domain: "home_services",
    specialty: "handyman",
    label: {
      en: "Other Urgent Property Issue",
      es: "Otro Problema Urgente",
    },
  },
]);

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

function getRequestId(record = {}) {
  return record.id ?? record.emergencyRequestId ?? record.emergency_request_id;
}

function getRequestStatus(record = {}) {
  return clean(record.status || "draft").toLowerCase() || "draft";
}

function isEditableEmergencyDraft(record = {}) {
  return getRequestStatus(record) === "draft";
}

function canCancelEmergencyRequest(record = {}) {
  return ["draft", "safety_blocked"].includes(
    getRequestStatus(record)
  );
}

function getRecoveredPhase(record = {}) {
  if (!isEditableEmergencyDraft(record)) {
    return "lifecycle";
  }

  return getCanonicalSafetyAssessment(record)
    ? "complete"
    : "details";
}

function buildDraftForm(record = {}, fallback = {}) {
  return {
    service:
      clean(
        record.serviceSpecialty ||
          record.service_specialty ||
          fallback.service
      ) || "emergency_plumbing",
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

function EmergencyRequest({ setPage }) {
  const [language, setLanguage] = useState(getLanguage());
  const [canonicalRequest, setCanonicalRequest] = useState(null);
  const [phase, setPhase] = useState("details");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [cancelConfirmationOpen, setCancelConfirmationOpen] =
    useState(false);
  const [submissionConfirmationOpen, setSubmissionConfirmationOpen] =
    useState(false);

  const initialEmergencyRoute = useMemo(
    () =>
      parseEmergencyRequestRoute(
        typeof window === "undefined"
          ? ""
          : window.location.hash
      ),
    []
  );

  const [recoveryState, setRecoveryState] = useState(() =>
    initialEmergencyRoute.hasRequestId &&
    (
      !initialEmergencyRoute.valid ||
      !initialEmergencyRoute.requestId
    )
      ? "failed"
      : "idle"
  );

  const defaultAddress = useMemo(
    () => formatPersonalAddress(resolveDefaultPersonalAddress() || {}),
    []
  );

  const [form, setForm] = useState(() => ({
    service: "emergency_plumbing",
    title: "",
    description: "",
    locationText: defaultAddress,
    unitNumber: "",
    accessNotes: "",
  }));

  const [safety, setSafety] = useState({
    ...INITIAL_SAFETY,
  });

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
    if (!initialEmergencyRoute.hasRequestId) {
      return undefined;
    }

    if (
      !initialEmergencyRoute.valid ||
      !initialEmergencyRoute.requestId
    ) {
      return undefined;
    }

    let active = true;

    async function recoverCanonicalDraft() {
      setRecoveryState("loading");
      setErrorMessage("");
      setMessage("");

      const result = await getEmergencyRequest(
        initialEmergencyRoute.requestId,
        {
          setPage,
        }
      );

      if (!active) return;

      if (!result.ok || !result.emergencyRequest) {
        setRecoveryState("failed");
        setErrorMessage(
          result.message ||
            "The Emergency draft could not be loaded."
        );
        return;
      }

      const recoveredRequest = result.emergencyRequest;

      setCanonicalRequest(recoveredRequest);
      setForm((current) =>
        buildDraftForm(recoveredRequest, current)
      );
      setSafety(buildSafetyForm(recoveredRequest));
      setPhase(getRecoveredPhase(recoveredRequest));
      setCancelConfirmationOpen(false);
      setSubmissionConfirmationOpen(false);
      setRecoveryState("loaded");
    }

    recoverCanonicalDraft();

    return () => {
      active = false;
    };
  }, [
    initialEmergencyRoute.hasRequestId,
    initialEmergencyRoute.requestId,
    initialEmergencyRoute.valid,
    setPage,
  ]);

  const text = {
    en: {
      title: "Emergency Draft",
      intro:
        "Describe the urgent service need. Meetro will save a private draft before the safety review.",
      emergencyWarning:
        "If anyone is in immediate danger, call 911 or contact local emergency services now.",
      limitation:
        "Saving this draft does not dispatch a professional or notify emergency responders.",
      service: "Service needed",
      chooseService: "Choose a service",
      requestTitle: "Short title",
      requestTitlePlaceholder: "Example: Active pipe leak",
      description: "What is happening?",
      descriptionPlaceholder:
        "Describe the problem, affected area, current conditions, and anything already attempted.",
      location: "Service location",
      locationPlaceholder: "Street address, city, state, ZIP",
      unit: "Unit / Apt / Suite",
      unitPlaceholder: "Optional",
      access: "Access notes",
      accessPlaceholder:
        "Gate code, tenant instructions, pets, or safe access details",
      saveDraft: "Save Emergency Draft",
      updateDraft: "Save Draft Changes",
      saving: "Saving…",
      draftSaved:
        "Your Emergency draft is saved privately. Complete the safety review next.",
      draftUpdated: "Your Emergency draft changes were saved.",
      safetyTitle: "Safety Review",
      safetyIntro:
        "Answer based on current conditions. Meetro may block further workflow when emergency services are more appropriate.",
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
      saveSafety: "Save Safety Review",
      safetySaving: "Saving Safety Review…",
      safetySaved:
        "Safety review saved. Your draft has not been distributed.",
      submissionTitle: "Submit Emergency Request",
      submissionIntro:
        "Your request and safety review are complete. Review the acknowledgment below before submitting.",
      submissionAcknowledgment:
        "I understand that submitting this request changes it to a read-only canonical record that may become eligible for future professional distribution. Meetro is not currently distributing this request, notifying professionals, assigning anyone, opening a chat, or initiating dispatch.",
      openSubmissionConfirmation: "Submit Emergency Request",
      submissionConfirmTitle: "Submit this Emergency request?",
      submissionConfirmBody:
        "After submission, this request becomes read-only. It will be marked as submitted and awaiting future distribution. No professional will be notified or assigned by this action.",
      confirmSubmission: "Yes, Submit Request",
      keepEditing: "Keep Editing",
      submitting: "Submitting…",
      submissionFailed:
        "The Emergency request could not be submitted. Try again.",
      submittedTitle: "Emergency Request Submitted",
      submittedBody:
        "This canonical Emergency request is submitted and awaiting future distribution. No professional has been notified, matched, assigned, or dispatched, and no chat has been opened.",
      submittedStatus: "Submitted — Awaiting Future Distribution",
      editDetails: "Edit Draft Details",
      back: "Back to Emergency Help",
      home: "Back Home",
      required:
        "Service, title, description, and location are required.",
      requestFailed:
        "The Emergency draft could not be saved. Try again.",
      recoveryLoading: "Loading your Emergency draft…",
      recoveryFailed:
        "This Emergency draft could not be loaded. It may be unavailable or you may not have access.",
      recovered:
        "Your canonical Emergency draft was loaded from Meetro.",
      startNewDraft: "Start a New Emergency Draft",
      safetyFailed:
        "The safety review could not be saved. Try again.",
      canonicalId: "Emergency draft",
      status: "Status",
      distributionUnavailable: "Distribution unavailable",
      completeTitle: "Draft and Safety Review Saved",
      completeBody:
        "Your information is stored as a canonical Emergency draft. Meetro has not distributed it, assigned a professional, opened a chat, or initiated dispatch.",
      cancelRequest: "Cancel Emergency Request",
      cancelConfirmTitle: "Cancel this Emergency request?",
      cancelConfirmBody:
        "Cancellation is permanent. This request will remain available as a read-only canonical record.",
      confirmCancellation: "Yes, Cancel Request",
      keepRequest: "Keep Request",
      cancelling: "Cancelling…",
      cancellationFailed:
        "The Emergency request could not be cancelled. Try again.",
      cancelledTitle: "Emergency Request Cancelled",
      cancelledBody:
        "This canonical Emergency request was cancelled. It is read-only and was not distributed, assigned, dispatched, or connected to a chat.",
      safetyBlockedTitle: "Emergency Workflow Blocked",
      safetyBlockedBody:
        "The safety review indicates that this request cannot continue through Meetro. Contact appropriate emergency services when needed.",
      preparedTitle: "Emergency Request Submitted",
      preparedBody:
        "This canonical Emergency request is submitted and awaiting future distribution. No professional has been notified, matched, assigned, or dispatched, and no chat has been opened.",
      readOnlyTitle: "Emergency Request Read-Only",
      readOnlyBody:
        "This canonical Emergency request can no longer be edited from this screen.",
      readOnlyStatus: "Canonical lifecycle status",
    },
    es: {
      title: "Borrador de Emergencia",
      intro:
        "Describe la necesidad urgente. Meetro guardará un borrador privado antes de la revisión de seguridad.",
      emergencyWarning:
        "Si alguien está en peligro inmediato, llama al 911 o comunícate ahora con los servicios de emergencia locales.",
      limitation:
        "Guardar este borrador no despacha a un profesional ni notifica a los servicios de emergencia.",
      service: "Servicio necesario",
      chooseService: "Selecciona un servicio",
      requestTitle: "Título corto",
      requestTitlePlaceholder: "Ejemplo: Fuga activa de tubería",
      description: "¿Qué está ocurriendo?",
      descriptionPlaceholder:
        "Describe el problema, el área afectada, las condiciones actuales y lo que ya intentaste.",
      location: "Ubicación del servicio",
      locationPlaceholder: "Dirección, ciudad, estado y código postal",
      unit: "Unidad / Apartamento / Suite",
      unitPlaceholder: "Opcional",
      access: "Notas de acceso",
      accessPlaceholder:
        "Código de entrada, instrucciones, mascotas o detalles de acceso seguro",
      saveDraft: "Guardar Borrador",
      updateDraft: "Guardar Cambios",
      saving: "Guardando…",
      draftSaved:
        "Tu borrador de Emergencia se guardó de forma privada. Completa ahora la revisión de seguridad.",
      draftUpdated: "Los cambios del borrador fueron guardados.",
      safetyTitle: "Revisión de Seguridad",
      safetyIntro:
        "Responde según las condiciones actuales. Meetro puede bloquear el flujo cuando los servicios de emergencia sean más apropiados.",
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
      saveSafety: "Guardar Revisión",
      safetySaving: "Guardando Revisión…",
      safetySaved:
        "Revisión guardada. El borrador no ha sido distribuido.",
      submissionTitle: "Enviar Solicitud de Emergencia",
      submissionIntro:
        "Tu solicitud y revisión de seguridad están completas. Revisa el reconocimiento antes de enviarla.",
      submissionAcknowledgment:
        "Entiendo que enviar esta solicitud la convierte en un registro canónico de solo lectura que podrá ser elegible para distribución profesional futura. Meetro actualmente no distribuirá esta solicitud, no notificará profesionales, no asignará a nadie, no abrirá un chat ni iniciará un despacho.",
      openSubmissionConfirmation: "Enviar Solicitud de Emergencia",
      submissionConfirmTitle: "¿Enviar esta solicitud de Emergencia?",
      submissionConfirmBody:
        "Después de enviarla, esta solicitud será de solo lectura. Se marcará como enviada y en espera de distribución futura. Esta acción no notificará ni asignará a ningún profesional.",
      confirmSubmission: "Sí, Enviar Solicitud",
      keepEditing: "Continuar Editando",
      submitting: "Enviando…",
      submissionFailed:
        "No se pudo enviar la solicitud de Emergencia. Inténtalo nuevamente.",
      submittedTitle: "Solicitud de Emergencia Enviada",
      submittedBody:
        "Esta solicitud canónica de Emergencia fue enviada y está en espera de distribución futura. Ningún profesional ha sido notificado, seleccionado, asignado o despachado, y no se abrió ningún chat.",
      submittedStatus: "Enviada — En Espera de Distribución Futura",
      editDetails: "Editar Detalles",
      back: "Regresar a Ayuda de Emergencia",
      home: "Regresar al Inicio",
      required:
        "El servicio, título, descripción y ubicación son obligatorios.",
      requestFailed:
        "No se pudo guardar el borrador. Inténtalo nuevamente.",
      recoveryLoading: "Cargando tu borrador de Emergencia…",
      recoveryFailed:
        "No se pudo cargar este borrador de Emergencia. Puede no estar disponible o quizás no tengas acceso.",
      recovered:
        "Tu borrador canónico de Emergencia fue cargado desde Meetro.",
      startNewDraft: "Comenzar un Nuevo Borrador",
      safetyFailed:
        "No se pudo guardar la revisión. Inténtalo nuevamente.",
      canonicalId: "Borrador de Emergencia",
      status: "Estado",
      distributionUnavailable: "Distribución no disponible",
      completeTitle: "Borrador y Revisión Guardados",
      completeBody:
        "Tu información está guardada como un borrador canónico de Emergencia. Meetro no lo distribuyó, no asignó un profesional, no abrió un chat ni inició un despacho.",
      cancelRequest: "Cancelar Solicitud de Emergencia",
      cancelConfirmTitle: "¿Cancelar esta solicitud de Emergencia?",
      cancelConfirmBody:
        "La cancelación es permanente. La solicitud permanecerá disponible como un registro canónico de solo lectura.",
      confirmCancellation: "Sí, Cancelar Solicitud",
      keepRequest: "Mantener Solicitud",
      cancelling: "Cancelando…",
      cancellationFailed:
        "No se pudo cancelar la solicitud de Emergencia. Inténtalo nuevamente.",
      cancelledTitle: "Solicitud de Emergencia Cancelada",
      cancelledBody:
        "Esta solicitud canónica de Emergencia fue cancelada. Es de solo lectura y no fue distribuida, asignada, despachada ni conectada a un chat.",
      safetyBlockedTitle: "Flujo de Emergencia Bloqueado",
      safetyBlockedBody:
        "La revisión de seguridad indica que esta solicitud no puede continuar por Meetro. Contacta los servicios de emergencia apropiados cuando sea necesario.",
      preparedTitle: "Solicitud de Emergencia Enviada",
      preparedBody:
        "Esta solicitud canónica de Emergencia fue enviada y está en espera de distribución futura. Ningún profesional ha sido notificado, seleccionado, asignado o despachado, y no se abrió ningún chat.",
      readOnlyTitle: "Solicitud de Emergencia de Solo Lectura",
      readOnlyBody:
        "Esta solicitud canónica de Emergencia ya no puede editarse desde esta pantalla.",
      readOnlyStatus: "Estado canónico del ciclo de vida",
    },
  };

  const copy = text[language] || text.en;
  const selectedService =
    SERVICE_OPTIONS.find(
      (option) => option.value === form.service
    ) || SERVICE_OPTIONS[0];

  const canonicalStatus = getRequestStatus(canonicalRequest);
  const editableDraft = isEditableEmergencyDraft(canonicalRequest);
  const cancellationAvailable =
    canCancelEmergencyRequest(canonicalRequest);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
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

  async function submitDetails(event) {
    event.preventDefault();

    if (canonicalRequest && !editableDraft) {
      setErrorMessage(copy.readOnlyBody);
      setMessage("");
      return;
    }

    const payload = {
      category: "home_repair",
      serviceDomain: selectedService.domain,
      serviceSpecialty: selectedService.specialty,
      title: clean(form.title),
      description: clean(form.description),
      locationText: clean(form.locationText),
      unitNumber: clean(form.unitNumber),
      accessNotes: clean(form.accessNotes),
    };

    if (
      !payload.serviceSpecialty ||
      !payload.title ||
      !payload.description ||
      !payload.locationText
    ) {
      setErrorMessage(copy.required);
      setMessage("");
      return;
    }

    setPending(true);
    setErrorMessage("");
    setMessage("");

    const requestId = getRequestId(canonicalRequest);
    const result = requestId
      ? await updateEmergencyDraft(requestId, payload, {
          setPage,
        })
      : await createEmergencyDraft(payload, {
          setPage,
        });

    setPending(false);

    if (!result.ok || !result.emergencyRequest) {
      setErrorMessage(result.message || copy.requestFailed);
      return;
    }

    setCanonicalRequest(result.emergencyRequest);
    setForm(
      buildDraftForm(result.emergencyRequest, {
        ...form,
        service: form.service,
      })
    );

    const canonicalRequestId =
      getRequestId(result.emergencyRequest);

    if (canonicalRequestId) {
      replaceEmergencyRequestRoute(canonicalRequestId);
    }

    setRecoveryState("loaded");
    setMessage(requestId ? copy.draftUpdated : copy.draftSaved);
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

    setPending(true);
    setErrorMessage("");
    setMessage("");

    const result = await saveEmergencySafetyAssessment(
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
    );

    setPending(false);

    if (!result.ok || !result.emergencyRequest) {
      setErrorMessage(result.message || copy.safetyFailed);
      return;
    }

    setCanonicalRequest(result.emergencyRequest);
    setMessage(copy.safetySaved);
    setPhase("complete");
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


  function requestSubmission() {
    if (
      !editableDraft ||
      phase !== "complete" ||
      pending ||
      !getRequestId(canonicalRequest)
    ) {
      return;
    }

    setSubmissionConfirmationOpen(true);
    setCancelConfirmationOpen(false);
    setMessage("");
    setErrorMessage("");
  }

  function keepEditingEmergencyRequest() {
    if (pending) return;

    setSubmissionConfirmationOpen(false);
    setErrorMessage("");
  }

  async function confirmSubmission() {
    const requestId = getRequestId(canonicalRequest);

    if (
      !requestId ||
      !editableDraft ||
      phase !== "complete" ||
      pending
    ) {
      return;
    }

    setPending(true);
    setMessage("");
    setErrorMessage("");

    const result = await prepareEmergencyRequest(requestId, {
      setPage,
    });

    setPending(false);

    if (!result.ok || !result.emergencyRequest) {
      setErrorMessage(result.message || copy.submissionFailed);
      return;
    }

    setCanonicalRequest(result.emergencyRequest);
    setPhase("lifecycle");
    setSubmissionConfirmationOpen(false);
    setCancelConfirmationOpen(false);
    setRecoveryState("loaded");
  }

  function requestCancellation() {
    if (!cancellationAvailable || pending) {
      return;
    }

    setCancelConfirmationOpen(true);
    setSubmissionConfirmationOpen(false);
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

    setPending(true);
    setMessage("");
    setErrorMessage("");

    const result = await cancelEmergencyRequest(requestId, {
      setPage,
    });

    setPending(false);

    if (!result.ok || !result.emergencyRequest) {
      setErrorMessage(
        result.message || copy.cancellationFailed
      );
      return;
    }

    setCanonicalRequest(result.emergencyRequest);
    setPhase("lifecycle");
    setCancelConfirmationOpen(false);
    setRecoveryState("loaded");
  }

  function getLifecycleCopy() {
    if (canonicalStatus === "cancelled") {
      return {
        title: copy.cancelledTitle,
        body: copy.cancelledBody,
      };
    }

    if (canonicalStatus === "safety_blocked") {
      return {
        title: copy.safetyBlockedTitle,
        body: copy.safetyBlockedBody,
      };
    }

    if (canonicalStatus === "ready_for_distribution") {
      return {
        title: copy.preparedTitle,
        body: copy.preparedBody,
      };
    }

    return {
      title: copy.readOnlyTitle,
      body: copy.readOnlyBody,
    };
  }

  const lifecycleCopy = getLifecycleCopy();

  return (
    <div className="app-page meetro-form-page" style={page}>
      <main style={card} aria-labelledby="emergency-request-title">
        <button
          type="button"
          style={backMini}
          onClick={() => setPage("emergency")}
          aria-label={copy.back}
          disabled={pending}
        >
          ←
        </button>

        <h1 id="emergency-request-title" style={title}>
          {copy.title}
        </h1>

        <p style={intro}>{copy.intro}</p>

        <div style={emergencyWarning} role="alert">
          {copy.emergencyWarning}
        </div>

        <div style={limitationNotice} role="status">
          {copy.limitation}
        </div>

        {canonicalRequest && (
          <section style={canonicalCard} aria-label={copy.canonicalId}>
            <div>
              <span style={canonicalLabel}>{copy.canonicalId}</span>
              <strong style={canonicalValue}>
                #{getRequestId(canonicalRequest)}
              </strong>
            </div>

            <div>
              <span style={canonicalLabel}>{copy.status}</span>
              <strong style={canonicalValue}>
                {canonicalRequest.status || "draft"}
              </strong>
            </div>
          </section>
        )}

        {message && (
          <div style={successNotice} role="status" aria-live="polite">
            {message}
          </div>
        )}

        {errorMessage && (
          <div style={errorNotice} role="alert" aria-live="assertive">
            {errorMessage}
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
              {errorMessage || copy.recoveryFailed}
            </p>

            <button
              type="button"
              style={primaryButton}
              onClick={() => setPage("emergencyRequest")}
            >
              {copy.startNewDraft}
            </button>
          </section>
        )}

        {recoveryState === "loaded" &&
          initialEmergencyRoute.hasRequestId &&
          !message && (
            <div style={successNotice} role="status">
              {copy.recovered}
            </div>
          )}

        {recoveryState !== "loading" &&
          recoveryState !== "failed" &&
          editableDraft &&
          phase === "details" && (
          <form style={formCard} onSubmit={submitDetails} noValidate>
            <FieldLabel
              htmlFor="emergency-service"
              label={copy.service}
            />

            <select
              id="emergency-service"
              style={input}
              value={form.service}
              disabled={pending}
              onChange={(event) =>
                updateForm("service", event.target.value)
              }
            >
              <option value="" disabled>
                {copy.chooseService}
              </option>

              {SERVICE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label[language] || option.label.en}
                </option>
              ))}
            </select>

            <FieldLabel
              htmlFor="emergency-title"
              label={copy.requestTitle}
            />

            <input
              id="emergency-title"
              style={input}
              value={form.title}
              placeholder={copy.requestTitlePlaceholder}
              disabled={pending}
              onChange={(event) =>
                updateForm("title", event.target.value)
              }
            />

            <FieldLabel
              htmlFor="emergency-description"
              label={copy.description}
            />

            <textarea
              id="emergency-description"
              style={textarea}
              rows={6}
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
              rows={3}
              value={form.locationText}
              placeholder={copy.locationPlaceholder}
              disabled={pending}
              onChange={(event) =>
                updateForm("locationText", event.target.value)
              }
            />

            <FieldLabel
              htmlFor="emergency-unit"
              label={copy.unit}
            />

            <input
              id="emergency-unit"
              style={input}
              value={form.unitNumber}
              placeholder={copy.unitPlaceholder}
              disabled={pending}
              onChange={(event) =>
                updateForm("unitNumber", event.target.value)
              }
            />

            <FieldLabel
              htmlFor="emergency-access"
              label={copy.access}
            />

            <textarea
              id="emergency-access"
              style={textarea}
              rows={4}
              value={form.accessNotes}
              placeholder={copy.accessPlaceholder}
              disabled={pending}
              onChange={(event) =>
                updateForm("accessNotes", event.target.value)
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
              {pending
                ? copy.saving
                : canonicalRequest
                  ? copy.updateDraft
                  : copy.saveDraft}
            </button>
          </form>
        )}

        {recoveryState !== "loading" &&
          recoveryState !== "failed" &&
          editableDraft &&
          phase === "safety" && (
          <form style={formCard} onSubmit={submitSafety} noValidate>
            <h2 style={sectionTitle}>{copy.safetyTitle}</h2>
            <p style={sectionIntro}>{copy.safetyIntro}</p>

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

            <button
              type="submit"
              style={{
                ...primaryButton,
                ...(pending ? disabledButton : {}),
              }}
              disabled={pending}
            >
              {pending ? copy.safetySaving : copy.saveSafety}
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
          editableDraft &&
          phase === "complete" && (
          <section style={completeCard}>
            <h2 style={sectionTitle}>{copy.submissionTitle}</h2>
            <p style={completeBody}>{copy.submissionIntro}</p>

            <div style={acknowledgmentNotice}>
              {copy.submissionAcknowledgment}
            </div>

            <div style={distributionPill}>
              {copy.distributionUnavailable}
            </div>

            <button
              type="button"
              style={{
                ...primaryButton,
                ...(pending ? disabledButton : {}),
              }}
              onClick={requestSubmission}
              disabled={pending}
            >
              {copy.openSubmissionConfirmation}
            </button>

            <button
              type="button"
              style={secondaryButton}
              onClick={editDetails}
              disabled={pending}
            >
              {copy.editDetails}
            </button>

            {cancellationAvailable && (
              <button
                type="button"
                style={dangerButton}
                onClick={requestCancellation}
                disabled={pending}
              >
                {copy.cancelRequest}
              </button>
            )}
          </section>
        )}

        {recoveryState !== "loading" &&
          recoveryState !== "failed" &&
          canonicalRequest &&
          !editableDraft && (
            <section style={lifecycleCard}>
              <h2 style={sectionTitle}>
                {lifecycleCopy.title}
              </h2>

              <p style={completeBody}>
                {lifecycleCopy.body}
              </p>

              <div style={lifecycleStatus}>
                <span>{copy.readOnlyStatus}</span>
                <strong>
                  {canonicalStatus === "ready_for_distribution"
                    ? copy.submittedStatus
                    : canonicalStatus}
                </strong>
              </div>

              {cancellationAvailable && (
                <button
                  type="button"
                  style={dangerButton}
                  onClick={requestCancellation}
                  disabled={pending}
                >
                  {copy.cancelRequest}
                </button>
              )}
            </section>
          )}

        {canonicalRequest &&
          editableDraft &&
          phase !== "complete" &&
          cancellationAvailable && (
            <button
              type="button"
              style={dangerButton}
              onClick={requestCancellation}
              disabled={pending}
            >
              {copy.cancelRequest}
            </button>
          )}

        {submissionConfirmationOpen && (
          <section
            style={submissionConfirmationCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="emergency-submission-title"
          >
            <h2
              id="emergency-submission-title"
              style={sectionTitle}
            >
              {copy.submissionConfirmTitle}
            </h2>

            <p style={completeBody}>
              {copy.submissionConfirmBody}
            </p>

            <button
              type="button"
              style={{
                ...primaryButton,
                ...(pending ? disabledButton : {}),
              }}
              onClick={confirmSubmission}
              disabled={pending}
            >
              {pending
                ? copy.submitting
                : copy.confirmSubmission}
            </button>

            <button
              type="button"
              style={secondaryButton}
              onClick={keepEditingEmergencyRequest}
              disabled={pending}
            >
              {copy.keepEditing}
            </button>
          </section>
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

        <button
          type="button"
          style={navigationButton}
          onClick={() => setPage("emergency")}
          disabled={pending}
        >
          {copy.back}
        </button>

        <button
          type="button"
          style={homeButton}
          onClick={() => setPage("home")}
          disabled={pending}
        >
          {copy.home}
        </button>
      </main>

      <BottomNav currentPage="emergency" setPage={setPage} />
    </div>
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
  background: "#f5f7fb",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 24px) max(20px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px))",
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

const canonicalCard = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "12px",
  marginBottom: "16px",
  padding: "16px",
  border: "1px solid #d1fae5",
  borderRadius: "16px",
  background: "#ecfdf5",
};

const canonicalLabel = {
  display: "block",
  marginBottom: "4px",
  color: "#047857",
  fontSize: "12px",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const canonicalValue = {
  display: "block",
  overflowWrap: "anywhere",
  color: "#064e3b",
  fontSize: "15px",
};

const formCard = {
  minWidth: 0,
  padding: "22px",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  background: "white",
  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
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

const lifecycleCard = {
  ...completeCard,
  border: "1px solid #d1d5db",
};

const confirmationCard = {
  ...completeCard,
  marginTop: "16px",
  border: "2px solid #fecaca",
  background: "#fffafa",
};

const submissionConfirmationCard = {
  ...completeCard,
  marginTop: "16px",
  border: "2px solid #bfdbfe",
  background: "#f8fbff",
};

const acknowledgmentNotice = {
  marginBottom: "16px",
  padding: "16px",
  border: "1px solid #bfdbfe",
  borderRadius: "14px",
  background: "#eff6ff",
  color: "#1e3a8a",
  fontSize: "14px",
  lineHeight: 1.55,
  fontWeight: "700",
};

const lifecycleStatus = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  marginTop: "16px",
  padding: "13px 14px",
  borderRadius: "14px",
  background: "#f3f4f6",
  color: "#374151",
  fontSize: "14px",
};

const completeBody = {
  margin: "0 0 18px",
  color: "#4b5563",
  fontSize: "15px",
  lineHeight: 1.6,
};

const distributionPill = {
  display: "inline-flex",
  padding: "9px 12px",
  borderRadius: "999px",
  background: "#fff7ed",
  color: "#9a3412",
  fontSize: "13px",
  fontWeight: "900",
};

const navigationButton = {
  ...secondaryButton,
  marginTop: "20px",
};

const homeButton = {
  ...primaryButton,
  marginTop: "12px",
  background: "#111827",
};

export default EmergencyRequest;
