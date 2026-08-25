import { useEffect, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import GuidedWorkspaceCard from "../components/GuidedWorkspaceCard";
import ServiceSelectorSheet from "../components/ServiceSelectorSheet";
import { authFetch } from "../utils/authFetch";
import { getLanguage, t } from "../utils/language";
import {
  clearAssistantRequestDraft,
  clearAssistantRequestDraftHandoff,
  readAssistantRequestDraft,
  saveAssistantRequestDraft,
} from "../utils/assistantRequestDraft";
import {
  getRequestIntelligenceServices,
  searchRequestServices,
} from "../utils/requestIntelligence";
import {
  CAMERA_PERMISSION_MESSAGE,
  createPhotoInputEvent,
  openJobPhotoPicker,
} from "../utils/cameraPhotoPicker";
import {
  getMediaDeferredCopy,
  getMediaDeferredNotice,
  isFriendsAndFamilyMediaDeferred,
} from "../utils/mediaDeferral";
import {
  getSupportedRequestHelpServices,
  validateRequestHelpSubmission,
} from "../utils/requestHelpSubmission";
import {
  classifyJobRequestCreateFailure,
  createSubmissionIntentKey,
  getCanonicalJobRequestPost,
} from "../utils/jobRequestSubmissionIntent";
import {
  addDraftPhotos,
  applyHomeownerInput,
  applyAssistantSuggestion,
  buildJobRequestDraftCanonicalPayload,
  buildJobRequestReviewModel,
  clearDraftSubmission,
  clearJobRequestDraft,
  createJobRequestDraftFromAssistantDraft,
  JOB_REQUEST_DRAFT_SOURCE,
  JOB_REQUEST_DRAFT_UNCERTAINTY,
  JOB_REQUEST_LOCATION_INTAKE_MODE,
  readJobRequestDraft,
  removeDraftPhoto,
  reorderDraftPhotos,
  resetJobRequestDraft,
  saveJobRequestDraft,
  setDraftSubmissionIntent,
  setDraftSubmissionSnapshot,
  setDraftUploadedMedia,
  setJobRequestLocationIntakeMode,
  setBroadRequestCategory,
  setServiceClassification,
} from "../utils/jobRequestDraft";
import {
  REQUEST_PHOTO_MAX_COUNT,
  REQUEST_PHOTO_PURPOSE,
  cleanupRequestPhoto,
  createTemporaryRequestPhotoPreview,
  isRequestPhotoUploadEnabled,
  uploadRequestPhotos,
  validateRequestPhotoFiles,
} from "../utils/requestPhotoMedia";
import {
  applyJobRequestInterpretationPatch,
  createJobRequestInterpretIntent,
  markJobRequestInterpretIntentAmbiguous,
  requestJobRequestInterpretation,
} from "../utils/jobRequestInterpret";
import { recordWorkflowReview } from "../utils/contextualIntelligence";
import { getAskMeetroWorkflowCopy } from "../utils/askMeetroWorkflowLanguage";
import WorkflowMicrophoneInput from "../components/WorkflowMicrophoneInput.jsx";
import {
  JOB_REQUEST_INTERPRETATION_FAILURE,
  applyHomeownerConversationText,
  classifyInterpretationFailure,
  createCreationAssistanceMessage,
  createInitialCreationAssistanceMessages,
  createInterpretationSuccessMessages,
  createPhotoFirstPrompt,
  getFieldUncertainty,
  getInterpretationFailureMessage,
  getJobRequestInterpretLocale,
  hasMeaningfulCreationText,
  isAssistantSuggestedField,
} from "../utils/jobRequestConversation";

function isKnownRequestCategory(category) {
  return [
    "handyman",
    "contractor",
    "painting",
    "plumbing",
    "electrical",
    "flooring",
    "roofing",
    "hvac",
    "landscaping",
    "lawnCare",
    "treeService",
    "poolService",
    "cleaning",
    "pressureWashing",
    "paverSealing",
    "junkRemoval",
    "demolition",
    "drywall",
    "carpentry",
    "doorsWindows",
    "fencing",
    "concrete",
    "tile",
    "applianceRepair",
    "pestControl",
    "moving",
    "realEstate",
    "propertyManagement",
    "homeHealthCare",
    "automotiveServices",
    "carDetailing",
    "mobileServices",
    "mechanic",
    "privateTransportation",
    "other",
  ].includes(category);
}

function buildSuggestedRequestTitle(value = "", fallback = "") {
  const source = String(value || fallback || "").trim();
  if (!source) return "";

  const cleaned = source
    .replace(/^i\s+(need|want|would like)\s+(a|an|the)?\s*/i, "")
    .replace(/^help\s+with\s+/i, "")
    .replace(/[.?!]+$/g, "")
    .trim();
  const title = cleaned || source;

  return title.charAt(0).toUpperCase() + title.slice(1);
}

function getRequestHelpCopy(language) {
  const copy = {
    es: {
      back: "Volver al inicio",
      required: "Obligatorio",
      optional: "Opcional",
      missing: "Falta",
      reviewTitle: "Se enviará al confirmar",
      service: "Servicio",
      title: "Título",
      description: "Detalles",
      location: "Ubicación",
      photos: "Fotos",
      addPhoto: "Agregar fotos a la solicitud",
      removePhoto: (position) => `Eliminar foto ${position}`,
      locationRequired: "Agrega la ubicación donde se necesita el servicio.",
      matchRequired: "Elige un servicio compatible de la lista.",
      offline: "No tienes conexión. Vuelve a intentarlo cuando estés en línea.",
      failed: "La solicitud no fue creada. Revisa los detalles e inténtalo de nuevo.",
    },
    fr: {
      back: "Retour à l’accueil",
      required: "Requis",
      optional: "Facultatif",
      missing: "Manquant",
      reviewTitle: "Sera envoyé après confirmation",
      service: "Service",
      title: "Titre",
      description: "Détails",
      location: "Lieu",
      photos: "Photos",
      addPhoto: "Ajouter des photos à la demande",
      removePhoto: (position) => `Supprimer la photo ${position}`,
      locationRequired: "Ajoutez le lieu où le service est nécessaire.",
      matchRequired: "Choisissez un service pris en charge dans la liste.",
      offline: "Vous êtes hors ligne. Réessayez une fois connecté.",
      failed: "La demande n’a pas été créée. Vérifiez les détails et réessayez.",
    },
    pt: {
      back: "Voltar ao início",
      required: "Obrigatório",
      optional: "Opcional",
      missing: "Ausente",
      reviewTitle: "Será enviado após a confirmação",
      service: "Serviço",
      title: "Título",
      description: "Detalhes",
      location: "Local",
      photos: "Fotos",
      addPhoto: "Adicionar fotos à solicitação",
      removePhoto: (position) => `Remover foto ${position}`,
      locationRequired: "Adicione o local onde o serviço é necessário.",
      matchRequired: "Escolha um serviço compatível na lista.",
      offline: "Você está offline. Tente novamente quando estiver conectado.",
      failed: "A solicitação não foi criada. Revise os detalhes e tente novamente.",
    },
  };

  return copy[language] || {
    back: "Back to Home",
    required: "Required",
    optional: "Optional",
    missing: "Missing",
    reviewTitle: "This will be submitted after confirmation",
    service: "Service",
    title: "Title",
    description: "Details",
    location: "Location",
    photos: "Photos",
    addPhoto: "Add photos to the request",
    removePhoto: (position) => `Remove photo ${position}`,
    locationRequired: "Add the location where service is needed.",
    matchRequired: "Choose a supported service from the list.",
    offline: "You are offline. Try again when you are connected.",
    failed: "The request was not created. Review the details and try again.",
  };
}

function Upload({ setPage }) {
  const [language, updateLanguage] = useState(getLanguage());
  const photoInputRef = useRef(null);
  const serviceSearchInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const descriptionInputRef = useRef(null);
  const locationInputRef = useRef(null);
  const submissionAttemptRef = useRef(false);
  const requestPhotoUploadEnabled = isRequestPhotoUploadEnabled();
  const mediaUploadDeferred =
    isFriendsAndFamilyMediaDeferred() && !requestPhotoUploadEnabled;
  const mediaDeferredCopy = getMediaDeferredCopy(language);

  const [initialAssistantDraft] = useState(() => {
    const transientDraft = readAssistantRequestDraft(sessionStorage);
    const persistentDraft = transientDraft
      ? null
      : readAssistantRequestDraft(localStorage);

    if (persistentDraft) {
      saveAssistantRequestDraft(sessionStorage, persistentDraft);
    }
    clearAssistantRequestDraft(localStorage);

    return transientDraft || persistentDraft;
  });
  const [draft, setDraft] = useState(() => {
    if (initialAssistantDraft) {
      const validCategory = isKnownRequestCategory(initialAssistantDraft.category);
      const normalizedDraft = createJobRequestDraftFromAssistantDraft(initialAssistantDraft, {
        initialLocation: "",
      });
      return {
        ...normalizedDraft,
        service: {
          ...normalizedDraft.service,
          category: validCategory
            ? initialAssistantDraft.category
            : initialAssistantDraft.category
            ? "other"
            : "",
          customCategory: validCategory ? "" : initialAssistantDraft.category || "",
        },
      };
    }
    return readJobRequestDraft(sessionStorage, { initialLocation: "" });
  });
  const [serviceSearch, setServiceSearch] = useState(
    initialAssistantDraft?.suggestedServiceLabel ||
      initialAssistantDraft?.suggestedProjectType ||
      initialAssistantDraft?.title ||
      ""
  );
  const selectedRequestPhotosRef = useRef([]);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [creating, setCreating] = useState(false);
  const [serviceSelectorOpen, setServiceSelectorOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submissionError, setSubmissionError] = useState("");
  const [submittedRequest, setSubmittedRequest] = useState(null);
  const title = draft.job.title;
  const description = draft.job.description;
  const category = draft.service.category;
  const customCategory = draft.service.customCategory;
  const location = draft.location.serviceAddress;
  const locationIntakeMode = draft.location.intakeMode;
  const serviceCity = draft.location.city;
  const serviceRegion = draft.location.region;
  const servicePostalCode = draft.location.postalCode;
  const serviceCountryCode = draft.location.countryCode;
  const unitNumber = draft.location.unitNumber;
  const accessNotes = draft.location.accessNotes;
  const isExactLocationMode =
    locationIntakeMode === JOB_REQUEST_LOCATION_INTAKE_MODE.EXACT_ON_FILE;
  const isAddressLaterMode =
    locationIntakeMode === JOB_REQUEST_LOCATION_INTAKE_MODE.ADDRESS_AFTER_SELECTION;
  const selectedServiceOptionId = draft.service.selectedServiceOptionId;
  const selectedRequestPhotos = draft.media.photos;
  const projectPhotos = selectedRequestPhotos.map((photo) => photo.previewUrl).filter(Boolean);
  const assistantDraftMetadata = draft.provenance.assistantDraft;
  const titleEdited = draft.fieldMeta?.job?.title?.confirmed === true;
  const descriptionEdited = draft.fieldMeta?.job?.description?.confirmed === true;
  const conversationLogRef = useRef(null);
  const manualDetailsRef = useRef(null);
  const [creationMessages, setCreationMessages] = useState(() =>
    createInitialCreationAssistanceMessages(language)
  );
  const [conversationText, setConversationText] = useState("");
  const [interpretIntent, setInterpretIntent] = useState(null);
  const [pendingInterpretText, setPendingInterpretText] = useState("");
  const [interpretationPending, setInterpretationPending] = useState(false);
  const [interpretationFailure, setInterpretationFailure] = useState(null);
  const [pendingInterpretation, setPendingInterpretation] = useState(null);
  const [editingInterpretation, setEditingInterpretation] = useState(false);
  const [interpretationReviewPending, setInterpretationReviewPending] = useState(false);
  const [requestMode, setRequestMode] = useState("conversation");
  const [activeGuidedCard, setActiveGuidedCard] = useState("work");
  const [photoFirstPromptShown, setPhotoFirstPromptShown] = useState(false);

  useEffect(() => {
    const handleLanguageChange = () => {
      updateLanguage(getLanguage());
    };

    window.addEventListener("languageChanged", handleLanguageChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    selectedRequestPhotosRef.current = selectedRequestPhotos;
  }, [selectedRequestPhotos]);

  useEffect(() => {
    saveJobRequestDraft(sessionStorage, draft);
  }, [draft]);

  useEffect(() => {
    conversationLogRef.current?.scrollTo({
      top: conversationLogRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [creationMessages, interpretationPending]);

  useEffect(() => {
    return () => {
      selectedRequestPhotosRef.current.forEach((photo) => photo.revoke?.());
    };
  }, []);

  const categories = [
    { value: "handyman", label: t("handyman") },
    { value: "contractor", label: t("generalContractor") },
    { value: "painting", label: t("painting") },
    { value: "plumbing", label: t("plumbing") },
    { value: "electrical", label: t("electrical") },
    { value: "flooring", label: t("flooring") },
    { value: "roofing", label: t("roofing") },
    { value: "hvac", label: t("hvac") },
    { value: "landscaping", label: t("landscaping") },
    { value: "lawnCare", label: t("lawnCare") },
    { value: "treeService", label: t("treeService") },
    { value: "poolService", label: t("poolService") },
    { value: "cleaning", label: t("cleaning") },
    { value: "pressureWashing", label: t("pressureWashing") },
    { value: "paverSealing", label: t("paverSealing") },
    { value: "junkRemoval", label: t("junkRemoval") },
    { value: "demolition", label: t("demolition") },
    { value: "drywall", label: t("drywall") },
    { value: "carpentry", label: t("carpentry") },
    { value: "doorsWindows", label: t("doorsWindows") },
    { value: "fencing", label: t("fencing") },
    { value: "concrete", label: t("concrete") },
    { value: "tile", label: t("tile") },
    { value: "applianceRepair", label: t("applianceRepair") },
    { value: "pestControl", label: t("pestControl") },
    { value: "moving", label: t("movingCompany") },
    { value: "realEstate", label: t("realEstate") },
    { value: "propertyManagement", label: t("propertyManagement") },
    { value: "homeHealthCare", label: t("homeHealthCare") },
    { value: "automotiveServices", label: t("automotiveServices") },
    { value: "carDetailing", label: t("carDetailing") },
    { value: "mobileServices", label: t("mobileServices") },
    { value: "mechanic", label: t("mechanic") },
    { value: "privateTransportation", label: t("privateTransportation") },
    { value: "other", label: t("otherService") },
  ];

  useEffect(() => {
    if (initialAssistantDraft) clearAssistantRequestDraftHandoff(sessionStorage);
  }, [initialAssistantDraft]);

  useEffect(() => {
    const textarea = descriptionInputRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, assistantDraftMetadata ? 320 : 140)}px`;
  }, [description, assistantDraftMetadata]);

  const serviceSuggestions = getSupportedRequestHelpServices(
    searchRequestServices(serviceSearch, {
      translate: t,
      limit: 12,
    })
  ).slice(0, 4);
  const serviceSelectorOptions = [
    ...getSupportedRequestHelpServices(getRequestIntelligenceServices(t)).map((service) => ({
      value: `service:${service.serviceId}`,
      label: service.label,
      groupLabel: service.categoryLabel,
      requestCategory: service.requestCategory,
      serviceDomain: service.domain,
      serviceSpecialty: service.serviceId,
      aliases: service.aliases,
    })),
  ];
  const selectedServiceLabel =
    serviceSelectorOptions.find((option) => option.value === selectedServiceOptionId)?.label ||
    serviceSelectorOptions.find((option) => option.serviceSpecialty === draft.service.specialty)?.label ||
    "";
  const broadCategoryLabel =
    categories.find((item) => item.value === category)?.label || "";
  const serviceSuggested = isAssistantSuggestedField(draft, "service.specialty");
  const titleUncertainty = getFieldUncertainty(draft, "job.title");
  const serviceUncertainty = getFieldUncertainty(draft, "service.specialty");

  function handleServiceSearchChange(value) {
    setServiceSearch(value);

    const [bestMatch] = getSupportedRequestHelpServices(
      searchRequestServices(value, { translate: t, limit: 12 })
    );
    if (bestMatch?.requestCategory) {
      setDraft((current) =>
        setServiceClassification(current, {
          category: bestMatch.requestCategory,
          customCategory: "",
          requestCategory: bestMatch.requestCategory,
          domain: bestMatch.domain,
          specialty: bestMatch.serviceId,
          selectedServiceOptionId: `service:${bestMatch.serviceId}`,
          displayLabel: bestMatch.label,
        }, { source: JOB_REQUEST_DRAFT_SOURCE.ASSISTANT_INFERRED, confirmed: false })
      );
      setFieldErrors((current) => ({ ...current, category: undefined }));
    } else {
      setDraft((current) =>
        setServiceClassification(current, {}, {
          source: JOB_REQUEST_DRAFT_SOURCE.ASSISTANT_INFERRED,
          confirmed: false,
        })
      );
    }
    if (!titleEdited) {
      setDraft((current) =>
        applyAssistantSuggestion(current, {
          "job.title": buildSuggestedRequestTitle(value, bestMatch?.label || ""),
        })
      );
      setFieldErrors((current) => ({ ...current, title: undefined }));
    }
    if (!descriptionEdited) {
      setDraft((current) =>
        applyAssistantSuggestion(current, {
          "job.description": value,
        })
      );
    }
  }

  function handleBroadCategoryChange(value) {
    if (value !== draft.service.requestCategory) setServiceSearch("");
    setDraft((current) => setBroadRequestCategory(current, value));
    setFieldErrors((current) => ({ ...current, category: undefined }));
  }

  function selectSuggestedService(service) {
    setServiceSearch(service.label);
    setDraft((current) =>
      setServiceClassification(current, {
        category: service.requestCategory,
        customCategory: "",
        requestCategory: service.requestCategory,
        domain: service.domain,
        specialty: service.serviceId,
        selectedServiceOptionId: `service:${service.serviceId}`,
        displayLabel: service.label,
      })
    );
    setFieldErrors((current) => ({ ...current, category: undefined }));
    if (!titleEdited) {
      setDraft((current) =>
        applyAssistantSuggestion(current, {
          "job.title": buildSuggestedRequestTitle(service.label),
        })
      );
      setFieldErrors((current) => ({ ...current, title: undefined }));
    }
    if (!descriptionEdited && !description.trim()) {
      setDraft((current) =>
        applyAssistantSuggestion(current, {
          "job.description": service.label,
        })
      );
    }
  }

  function selectServiceOption(_value, option) {
    if (!option) return;
    setServiceSearch(option.label);
    setDraft((current) =>
      setServiceClassification(current, {
        category: option.requestCategory,
        customCategory: "",
        requestCategory: option.requestCategory,
        domain: option.serviceDomain,
        specialty: option.serviceSpecialty,
        selectedServiceOptionId: option.value,
        displayLabel: option.label,
      })
    );
    setFieldErrors((current) => ({ ...current, category: undefined }));
    if (!titleEdited) {
      setDraft((current) =>
        applyAssistantSuggestion(current, {
          "job.title": buildSuggestedRequestTitle(option.label),
        })
      );
      setFieldErrors((current) => ({ ...current, title: undefined }));
    }
    if (!descriptionEdited && !description.trim()) {
      setDraft((current) =>
        applyAssistantSuggestion(current, {
          "job.description": option.label,
        })
      );
    }
  }

  function acceptAssistantServiceSuggestion() {
    const option =
      serviceSelectorOptions.find((item) => item.value === selectedServiceOptionId) ||
      serviceSelectorOptions.find((item) => item.serviceSpecialty === draft.service.specialty);
    if (option) selectServiceOption(option.value, option);
  }

  function getRequestPhotoErrorMessage(code) {
    if (code === "REQUEST_PHOTO_FORMAT_INVALID") {
      return t("invalidProfileImageFormat");
    }
    if (code === "REQUEST_PHOTO_TOO_LARGE") {
      return t("profileImageTooLarge");
    }
    if (code === "REQUEST_PHOTO_COUNT_EXCEEDED") {
      return language === "es"
        ? `Agrega hasta ${REQUEST_PHOTO_MAX_COUNT} fotos por solicitud.`
        : `Add up to ${REQUEST_PHOTO_MAX_COUNT} photos per request.`;
    }
    if (code === "REQUEST_PHOTO_UPLOAD_FAILED") {
      return t("uploadError");
    }
    return t("uploadFailed");
  }

  function clearSelectedRequestPhotos() {
    selectedRequestPhotosRef.current.forEach((photo) => photo.revoke?.());
    selectedRequestPhotosRef.current = [];
    setDraft((current) => ({
      ...current,
      media: { ...current.media, photos: [] },
    }));
  }

  function getSubmissionIntentKey() {
    if (!draft.submission.intentKey) {
      const intentKey = createSubmissionIntentKey();
      setDraft((current) => setDraftSubmissionIntent(current, intentKey));
      return intentKey;
    }
    return draft.submission.intentKey;
  }

  function clearSubmissionIntent() {
    setDraft((current) => clearDraftSubmission(current));
  }

  async function cleanupUploadedRequestPhotos(mediaItems = []) {
    await Promise.all(
      mediaItems.map((media) =>
        cleanupRequestPhoto({
          media,
          authFetchImpl: authFetch,
          setPage,
        })
      )
    );
  }

  function removeSelectedRequestPhoto(indexToRemove) {
    const removed = selectedRequestPhotos[indexToRemove];
    removed?.revoke?.();
    setDraft((current) => removeDraftPhoto(current, indexToRemove));
  }

  function moveSelectedRequestPhoto(index, direction) {
    setDraft((current) => reorderDraftPhotos(current, index, index + direction));
  }

  function getPhotoOrderLabel(direction, index) {
    const position = index + 1;
    const labels = {
      es:
        direction < 0
          ? `Mover foto ${position} a la izquierda`
          : `Mover foto ${position} a la derecha`,
      fr:
        direction < 0
          ? `Deplacer la photo ${position} vers la gauche`
          : `Deplacer la photo ${position} vers la droite`,
      pt:
        direction < 0
          ? `Mover foto ${position} para a esquerda`
          : `Mover foto ${position} para a direita`,
    };
    return (
      labels[language] ||
      (direction < 0
        ? `Move photo ${position} left`
        : `Move photo ${position} right`)
    );
  }

  function handleImageUpload(event) {
    if (mediaUploadDeferred) {
      event.target.value = "";
      setPhotoError(getMediaDeferredNotice(language));
      return;
    }

    const files = Array.from(event.target.files || []);
    event.target.value = "";
    const validation = validateRequestPhotoFiles(files, {
      existingCount: selectedRequestPhotos.length,
    });
    if (!validation.ok) {
      setPhotoError(getRequestPhotoErrorMessage(validation.code));
      return;
    }

    const additions = validation.files.map((file) =>
      createTemporaryRequestPhotoPreview(file)
    );
    setDraft((current) =>
      addDraftPhotos(
        current,
        additions.map((photo) => ({
          localPhotoId: photo.id,
          previewUrl: photo.url,
          file: photo.file,
          revoke: photo.revoke,
        }))
      )
    );
    if (
      !photoFirstPromptShown &&
      !hasMeaningfulCreationText(draft.job?.description) &&
      creationMessages.every((message) => message.kind !== "homeowner_message")
    ) {
      appendCreationMessages(createPhotoFirstPrompt(language));
      setPhotoFirstPromptShown(true);
    }
    setPhotoError("");
  }

  async function openRequestPhotoPicker() {
    if (mediaUploadDeferred) {
      setPhotoError(getMediaDeferredNotice(language));
      return;
    }

    setPhotoError("");

    await openJobPhotoPicker({
      inputRef: photoInputRef,
      language,
      fileNamePrefix: "request-photo",
      governedUploadEnabled: requestPhotoUploadEnabled,
      onPhotos: (photos) =>
        handleImageUpload(createPhotoInputEvent(photos.map((photo) => photo.file))),
      onError: (message) => setPhotoError(message || CAMERA_PERMISSION_MESSAGE),
    });
  }

  function focusManualDetails(target = "description") {
    setRequestMode("manual");
    const targetCard =
      target === "location" || target === "access"
        ? "location"
        : target === "photos"
        ? "photos"
        : target === "timing"
        ? "timing"
        : "work";
    setActiveGuidedCard(targetCard);
    window.setTimeout(() => {
      if (target === "service") {
        serviceSearchInputRef.current?.focus();
      } else if (target === "title") {
        titleInputRef.current?.focus();
      } else if (target === "location") {
        locationInputRef.current?.focus();
      } else {
        descriptionInputRef.current?.focus();
      }
      manualDetailsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 0);
  }

  function alignAssistantServiceSelection(nextDraft) {
    const suggestedSpecialty = String(nextDraft.service?.specialty || "").trim();
    if (!suggestedSpecialty) return nextDraft;
    const matchedOption = serviceSelectorOptions.find(
      (option) => option.serviceSpecialty === suggestedSpecialty
    );
    if (!matchedOption) return nextDraft;
    setServiceSearch(matchedOption.label);
    if (nextDraft.fieldMeta?.service?.specialty?.confirmed === true) {
      return nextDraft;
    }

    const homeownerCategory =
      nextDraft.fieldMeta?.service?.requestCategory?.confirmed === true
        ? {
            category: nextDraft.service.category,
            requestCategory: nextDraft.service.requestCategory,
          }
        : null;
    let alignedDraft = setServiceClassification(
      nextDraft,
      {
        category: matchedOption.requestCategory,
        customCategory: "",
        requestCategory: matchedOption.requestCategory,
        domain: matchedOption.serviceDomain,
        specialty: matchedOption.serviceSpecialty,
        selectedServiceOptionId: matchedOption.value,
        displayLabel: matchedOption.label,
      },
      { source: JOB_REQUEST_DRAFT_SOURCE.ASSISTANT_INFERRED, confirmed: false }
    );
    if (homeownerCategory) {
      alignedDraft = applyHomeownerInput(alignedDraft, {
        "service.category": homeownerCategory.category,
        "service.requestCategory": homeownerCategory.requestCategory,
      });
    }
    return alignedDraft;
  }

  function appendCreationMessages(messages) {
    const additions = (Array.isArray(messages) ? messages : [messages]).filter(Boolean);
    if (additions.length === 0) return;
    setCreationMessages((current) => [...current, ...additions]);
  }

  function handleContinueManually() {
    setInterpretationFailure(null);
    setInterpretationPending(false);
    focusManualDetails();
  }

  function handleBackToConversation() {
    setRequestMode("conversation");
    window.setTimeout(() => {
      conversationLogRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 0);
  }

  function handleLocationIntakeModeChange(nextMode) {
    setDraft((current) => setJobRequestLocationIntakeMode(current, nextMode));
    setFieldErrors((current) => ({ ...current, location: undefined }));
  }

  function handleReviewRequest(event) {
    event?.preventDefault();
    setRequestMode("manual");
    setActiveGuidedCard("review");
    window.setTimeout(() => {
      manualDetailsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 0);
  }

  async function runInterpretation(text, { retry = false } = {}) {
    const normalizedText = String(text || "").trim();
    if (!hasMeaningfulCreationText(normalizedText) || interpretationPending) return;

    setInterpretationPending(true);
    setInterpretationFailure(null);
    setPendingInterpretText(normalizedText);

    let nextDraft = draft;
    if (!retry) {
      nextDraft = applyHomeownerConversationText(draft, normalizedText);
      setDraft(nextDraft);
      appendCreationMessages(
        createCreationAssistanceMessage({
          role: "homeowner",
          kind: "homeowner_message",
          text: normalizedText,
        })
      );
      setConversationText("");
    }

    const nextIntent = createJobRequestInterpretIntent({
      text: normalizedText,
      draft: nextDraft,
      locale: getJobRequestInterpretLocale(language),
      previousIntent: retry ? interpretIntent : undefined,
    });
    setInterpretIntent(nextIntent);

    try {
      const result = await requestJobRequestInterpretation({
        intent: nextIntent,
        setPage,
        authFetchImpl: authFetch,
      });

      setPendingInterpretation({
        operationId: result.operationId,
        interpretation: result.interpretation,
      });
      setEditingInterpretation(false);
      setInterpretIntent({
        ...nextIntent,
        status: "completed",
        operationId: result.operationId,
        replayed: result.replayed,
      });
      setPendingInterpretText("");
    } catch (error) {
      const classification = classifyInterpretationFailure(error);
      if (classification === JOB_REQUEST_INTERPRETATION_FAILURE.AMBIGUOUS) {
        setInterpretIntent(markJobRequestInterpretIntentAmbiguous(nextIntent));
      } else {
        setInterpretIntent(nextIntent);
      }
      setInterpretationFailure({
        classification,
        message: getInterpretationFailureMessage(classification, language),
      });
    } finally {
      setInterpretationPending(false);
    }
  }

  function updatePendingInterpretationField(path, value) {
    setPendingInterpretation((current) => current ? {
      ...current,
      interpretation: {
        ...current.interpretation,
        draftPatch: {
          ...current.interpretation.draftPatch,
          fields: current.interpretation.draftPatch.fields.map((field) =>
            field.path === path ? { ...field, value } : field
          ),
        },
      },
    } : current);
  }

  async function reviewPendingInterpretation(action) {
    if (!pendingInterpretation?.operationId || interpretationReviewPending) return;
    setInterpretationReviewPending(true);
    setInterpretationFailure(null);
    try {
      const fields = pendingInterpretation.interpretation.draftPatch.fields;
      await Promise.all(fields.map((field) => recordWorkflowReview({
        proposalId: pendingInterpretation.operationId,
        elementId: field.path,
        action,
        editedValue: action === "EDITED" ? field.value : undefined,
        reasonCategory: action === "REJECTED" ? "HOMEOWNER_DISMISSED" : undefined,
        setPage,
        authFetchImpl: authFetch,
      })));
      if (action !== "REJECTED") {
        setDraft((current) => {
          const patched = applyJobRequestInterpretationPatch(
            current,
            pendingInterpretation.interpretation
          );
          return alignAssistantServiceSelection(patched.draft);
        });
        appendCreationMessages(
          createInterpretationSuccessMessages({
            interpretation: pendingInterpretation.interpretation,
            language,
            photosAttached: selectedRequestPhotos.length > 0,
          })
        );
      }
      setPendingInterpretation(null);
      setEditingInterpretation(false);
    } catch (error) {
      setInterpretationFailure({
        classification: JOB_REQUEST_INTERPRETATION_FAILURE.DEFINITIVE,
        message: error?.message || getInterpretationFailureMessage(
          JOB_REQUEST_INTERPRETATION_FAILURE.DEFINITIVE,
          language
        ),
      });
    } finally {
      setInterpretationReviewPending(false);
    }
  }

  function handleConversationSubmit(event) {
    event.preventDefault();
    runInterpretation(conversationText);
  }

  function handleRetryInterpretation() {
    runInterpretation(pendingInterpretText, { retry: true });
  }

  async function handleCreatePost(event) {
    event?.preventDefault();
    if (submissionAttemptRef.current) return;
    submissionAttemptRef.current = true;
    setCreating(true);

    let uploadedMediaForCleanup = [];
    let shouldCleanupUploadedMedia = false;
    try {
      const selectedCategory =
        category === "other" ? customCategory.trim() || "other" : category;
      const selectedService = serviceSelectorOptions.find(
        (option) => option.value === selectedServiceOptionId
      );

      const requestValidation = validateRequestHelpSubmission({
        title,
        category: selectedCategory,
        serviceLocation: {
          intakeMode: locationIntakeMode,
          addressLine1: location,
          city: serviceCity,
          region: serviceRegion,
          postalCode: servicePostalCode,
          countryCode: serviceCountryCode,
          unitNumber: isExactLocationMode ? unitNumber : "",
        },
        matchingFields: {
          serviceDomain: selectedService?.serviceDomain,
          serviceSpecialty: selectedService?.serviceSpecialty,
        },
      });

      if (!requestValidation.ok) {
        setFieldErrors(requestValidation.errors);
        if (!draft.submission.snapshot) {
          clearSubmissionIntent();
        }
        return;
      }

      if (!draftReadiness.isReady) {
        setSubmissionError(
          guidance?.messageKey
            ? t(guidance.messageKey)
            : getRequestHelpCopy(language).failed
        );
        if (!draft.submission.snapshot) {
          clearSubmissionIntent();
        }
        return;
      }

      setFieldErrors({});
      setSubmissionError("");

      const submissionIntentKey = getSubmissionIntentKey();
      let submittedPayloadSnapshot = draft.submission.snapshot;
      if (!submittedPayloadSnapshot) {
        if (selectedRequestPhotos.length > 0) setUploading(true);
        const uploadedRequestPhotos = selectedRequestPhotos.length > 0
          ? await uploadRequestPhotos({
              files: selectedRequestPhotos.map((photo) => photo.file),
              authFetchImpl: authFetch,
              setPage,
            })
          : { ok: true, photos: [] };

        setUploading(false);

        if (!uploadedRequestPhotos.ok) {
          setPhotoError(getRequestPhotoErrorMessage(uploadedRequestPhotos.code));
          clearSubmissionIntent();
          return;
        }

        const requestPhotoPayload = uploadedRequestPhotos.photos.map((media, index) => ({
          purpose: REQUEST_PHOTO_PURPOSE,
          media,
          display_order: index,
        }));
        submittedPayloadSnapshot = {
          body: buildJobRequestDraftCanonicalPayload(draft, {
            requestPhotoPayload,
          }),
          uploadedMedia: uploadedRequestPhotos.photos,
        };
        setDraft((current) =>
          setDraftSubmissionSnapshot(
            setDraftUploadedMedia(current, uploadedRequestPhotos.photos),
            submittedPayloadSnapshot
          )
        );
      }
      uploadedMediaForCleanup = submittedPayloadSnapshot.uploadedMedia;
      shouldCleanupUploadedMedia = true;

      const result = await authFetch(
        "/posts",
        {
          method: "POST",
          headers: {
            "Idempotency-Key": submissionIntentKey,
          },
          body: JSON.stringify(submittedPayloadSnapshot.body),
        },
        setPage
      );

      const data = result.data || {};
      const canonicalPost = getCanonicalJobRequestPost(result);

      if (canonicalPost) {
        uploadedMediaForCleanup = [];
        shouldCleanupUploadedMedia = false;

        localStorage.setItem("selectedHomeownerRequestId", String(canonicalPost.id));
        localStorage.setItem("selectedHomeownerRequest", JSON.stringify(canonicalPost));
        localStorage.removeItem("directRequestMode");
        localStorage.removeItem("directRequestSource");
        localStorage.removeItem("directRequestProfessionalName");
        localStorage.removeItem("directRequestProfessionalCategory");
        localStorage.removeItem("directRequestProfessionalConversationId");
        localStorage.removeItem("directRequestId");
        localStorage.removeItem("requestProfessionalContext");

        clearSelectedRequestPhotos();
        setDraft(resetJobRequestDraft({
          initialLocation: "",
        }));
        clearJobRequestDraft(sessionStorage);
        setCreationMessages(createInitialCreationAssistanceMessages(language));
        setConversationText("");
        setRequestMode("conversation");
        setActiveGuidedCard("work");
        setInterpretIntent(null);
        setPendingInterpretText("");
        setInterpretationFailure(null);
        setFieldErrors({});
        setSubmissionError("");
        setSubmittedRequest(canonicalPost);
      } else {
        const failureType = classifyJobRequestCreateFailure(result);
        if (failureType === "ambiguous" || failureType === "conflict") {
          shouldCleanupUploadedMedia = false;
        }
        if (failureType === "conflict") {
          setSubmissionError(
            language === "es"
              ? "Esta solicitud cambió después de un intento anterior. Revisa los detalles antes de intentarlo otra vez."
              : "This request changed after an earlier submission attempt. Review the details before trying again."
          );
        } else {
          setSubmissionError(
            data.message || data.error || getRequestHelpCopy(language).failed
          );
        }
        if (shouldCleanupUploadedMedia) {
          await cleanupUploadedRequestPhotos(uploadedMediaForCleanup);
          clearSubmissionIntent();
        }
      }
    } catch (error) {
      if (classifyJobRequestCreateFailure(error) !== "ambiguous" && shouldCleanupUploadedMedia) {
        await cleanupUploadedRequestPhotos(uploadedMediaForCleanup);
        clearSubmissionIntent();
      }
      setSubmissionError(getRequestHelpCopy(language).failed);
    } finally {
      setUploading(false);
      setCreating(false);
      submissionAttemptRef.current = false;
    }
  }

  function handleCancelRequest() {
    const hasChanges =
      title ||
      description ||
      serviceSearch ||
      category ||
      customCategory ||
      location ||
      serviceCity ||
      serviceRegion ||
      servicePostalCode ||
      serviceCountryCode ||
      unitNumber ||
      accessNotes ||
      projectPhotos.length > 0;

    if (hasChanges) {
      const confirmed = window.confirm(t("cancelRequestWarning"));

      if (!confirmed) return;
    }

    clearSelectedRequestPhotos();
    setDraft(resetJobRequestDraft({
      initialLocation: "",
    }));
    clearJobRequestDraft(sessionStorage);
    setFieldErrors({});
    setSubmissionError("");
    clearAssistantRequestDraft(sessionStorage);

    setPage("home");
  }

  function handleReviewEdit(target) {
    setRequestMode("manual");
    setActiveGuidedCard(
      target === "location" || target === "access"
        ? "location"
        : target === "photos"
        ? "photos"
        : target === "timing"
        ? "timing"
        : "work"
    );
    if (target === "service") {
      setServiceSelectorOpen(true);
      serviceSearchInputRef.current?.focus();
      return;
    }
    if (target === "title") {
      titleInputRef.current?.focus();
      return;
    }
    if (target === "description") {
      descriptionInputRef.current?.focus();
      return;
    }
    if (target === "location" || target === "access") {
      locationInputRef.current?.focus();
      return;
    }
    if (target === "photos") {
      openRequestPhotoPicker();
    }
  }

  const requestHelpCopy = getRequestHelpCopy(language);
  const draftReviewModel = buildJobRequestReviewModel(draft);
  const draftReadiness = draftReviewModel.readiness;
  const guidance = draftReadiness.nextRecommendedPrompt;
  const hasSelectedService = Boolean(selectedServiceOptionId && selectedServiceLabel);
  const serviceConfirmed = hasSelectedService && !serviceSuggested;
  const reviewItems = [
    {
      label: requestHelpCopy.service,
      value: selectedServiceOptionId ? draftReviewModel.service.label || selectedServiceLabel : "",
      required: true,
    },
    { label: requestHelpCopy.title, value: draftReviewModel.title, required: true },
    {
      label: requestHelpCopy.description,
      value: draftReviewModel.description,
      required: false,
    },
    { label: requestHelpCopy.location, value: draftReviewModel.location.formattedAddress, required: true },
    {
      label: requestHelpCopy.photos,
      value: projectPhotos.length ? String(projectPhotos.length) : "",
      required: false,
    },
  ];
  const liveDraftSections = [
    {
      id: "need",
      label: t("jobRequestWhatYouNeed", language),
      values: [draftReviewModel.title, draftReviewModel.description].filter(Boolean),
      uncertainty: titleUncertainty,
    },
    {
      id: "category",
      label: t("jobRequestBroadCategory", language),
      values: [broadCategoryLabel].filter(Boolean),
    },
    {
      id: "service",
      label: serviceSuggested
        ? t("jobRequestSuggestedService", language)
        : t("jobRequestDraftReviewService", language),
      values: [selectedServiceLabel || draftReviewModel.service.specialty].filter(Boolean),
      uncertainty: serviceUncertainty,
    },
    {
      id: "where",
      label: t("jobRequestWhere", language),
      values: [
        draftReviewModel.location.affectedArea,
        draftReviewModel.location.formattedAddress,
      ].filter(Boolean),
    },
    {
      id: "timing",
      label: t("jobRequestTiming", language),
      values: [
        draftReviewModel.timing.urgency,
        draftReviewModel.timing.desiredTiming,
        draftReviewModel.timing.availability,
      ].filter(Boolean),
    },
    {
      id: "details",
      label: t("jobRequestAdditionalDetails", language),
      values: [
        draftReviewModel.details.measurements,
        draftReviewModel.details.expectations,
        draftReviewModel.details.additionalNotes,
      ].filter(Boolean),
    },
    {
      id: "photos",
      label: t("jobRequestDraftReviewPhotos", language),
      values: projectPhotos.length
        ? [
            language === "es"
              ? `${projectPhotos.length} ${projectPhotos.length === 1 ? "foto" : "fotos"}`
              : `${projectPhotos.length} ${projectPhotos.length === 1 ? "photo" : "photos"}`,
          ]
        : [],
    },
  ].filter((section) => section.values.length > 0);
  const locationSummary = isExactLocationMode
    ? [
        location,
        [serviceCity, serviceRegion, servicePostalCode].filter(Boolean).join(", "),
      ].filter(Boolean)
    : [
        [serviceCity, serviceRegion, servicePostalCode].filter(Boolean).join(", "),
        t("jobRequestExactAddressNotAdded", language),
      ].filter(Boolean);
  const photoSummary = [
    projectPhotos.length
      ? t("jobRequestPhotoCount", language).replace("{count}", String(projectPhotos.length))
      : t("jobRequestNoPhotosAdded", language),
  ];
  const timingSummary = [
    draftReviewModel.timing.desiredTiming ||
      draftReviewModel.timing.urgency ||
      draftReviewModel.timing.availability ||
      t("jobRequestTimingFlexible", language),
  ];
  const workComplete =
    !draftReadiness.missingRequiredFields.includes("title") &&
    !draftReadiness.missingRequiredFields.includes("service") &&
    !draftReadiness.uncertainRequiredFields.includes("service");
  const locationComplete = !draftReadiness.missingRequiredFields.includes("location");
  const photosComplete = true;
  const timingComplete = true;
  const reviewComplete = draftReadiness.isReady;
  const guidedCards = [
    {
      key: "work",
      label: t("jobRequestCardWork", language),
      shortLabel: t("jobRequestProgressWork", language),
      complete: workComplete,
      summary: [
        draftReviewModel.title,
        broadCategoryLabel,
        selectedServiceLabel || draftReviewModel.service.specialty,
      ].filter(Boolean),
    },
    {
      key: "location",
      label: t("jobRequestCardLocation", language),
      shortLabel: t("jobRequestProgressLocation", language),
      complete: locationComplete,
      summary: locationSummary,
    },
    {
      key: "photos",
      label: t("jobRequestCardPhotos", language),
      shortLabel: t("jobRequestProgressPhotosShort", language),
      complete: photosComplete,
      summary: photoSummary,
    },
    {
      key: "timing",
      label: t("jobRequestCardTiming", language),
      shortLabel: t("jobRequestProgressTiming", language),
      complete: timingComplete,
      summary: timingSummary,
    },
    {
      key: "review",
      label: t("jobRequestCardReview", language),
      shortLabel: t("jobRequestProgressReview", language),
      complete: reviewComplete,
      summary: [
        draftReadiness.isReady
          ? t("jobRequestReadyToSubmit", language)
          : guidance?.messageKey
          ? t(guidance.messageKey)
          : t("jobRequestDraftGuidanceDescription", language),
      ],
    },
  ];
  const firstIncompleteRequiredCard = !workComplete
    ? "work"
    : !locationComplete
    ? "location"
    : "review";
  const currentGuidedCard = guidedCards.some((card) => card.key === activeGuidedCard)
    ? activeGuidedCard
    : firstIncompleteRequiredCard;
  const getGuidedCardState = (key, complete) => {
    if (key === currentGuidedCard) return "active";
    if (complete) return "complete";
    return "upcoming";
  };
  const continueToCard = (key) => {
    setActiveGuidedCard(key);
    window.setTimeout(() => {
      manualDetailsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 0);
  };

  if (submittedRequest) {
    return (
      <div
        className="app-page request-help-page upload-page meetro-form-page meetro-visual-page"
        style={pageWrapper}
      >
        <style>{requestHelpLayoutStyles}</style>
        <section style={successPanel} aria-live="polite">
          <span style={successMark} aria-hidden="true">✓</span>
          <h1 style={requestPageTitle}>{t("jobRequestSubmittedTitle", language)}</h1>
          <p style={requestPageSubtitle}>{t("projectPostedSuccess", language)}</p>
          <div style={successActions}>
            <button
              type="button"
              className="meetro-visual-primary-button"
              style={primaryButton}
              onClick={() => setPage("myRequests")}
            >
              {t("jobRequestViewMyRequest", language)}
            </button>
            <button
              type="button"
              style={cancelRequestButton}
              onClick={() => setPage("home")}
            >
              {t("jobRequestReturnHome", language)}
            </button>
          </div>
        </section>
        <BottomNav setPage={setPage} currentPage="upload" />
      </div>
    );
  }

  return (
    <div
      className="app-page request-help-page upload-page meetro-form-page meetro-visual-page"
      style={pageWrapper}
    >
      <style>{requestHelpLayoutStyles}</style>
      <div className="request-help-content-lane" style={contentLane}>
        <button
          type="button"
          onClick={handleCancelRequest}
          style={backButton}
          aria-label={requestHelpCopy.back}
          title={requestHelpCopy.back}
        >
          ←
        </button>

        <header style={requestHeader}>
          <h1 style={requestPageTitle}>{t("newProject")}</h1>
          <p style={requestPageSubtitle}>{t("newProjectSubtitle")}</p>
        </header>

        {assistantDraftMetadata && (
          <div style={preparedRequestBanner}>
            <span style={preparedRequestOrb} aria-hidden="true">
              M
            </span>
            <strong style={preparedRequestBannerTitle}>
              {t("requestReviewIntroTitle")}
            </strong>
            <p style={preparedRequestBannerText}>
              {t("requestReviewIntroText")}
            </p>
          </div>
        )}

        <section
          style={draftGuidanceCard}
          aria-live="polite"
          aria-label={t("jobRequestDraftGuidanceTitle")}
        >
          <div>
            <strong style={draftGuidanceTitle}>
              {draftReadiness.isReady
                ? t("jobRequestDraftReadyTitle")
                : t("jobRequestDraftGuidanceTitle")}
            </strong>
            <p style={draftGuidanceText}>
              {guidance?.messageKey
                ? t(guidance.messageKey)
                : t("jobRequestDraftGuidanceReady")}
            </p>
          </div>
          {draftReadiness.warnings.length > 0 && (
            <ul style={draftWarningList}>
              {draftReadiness.warnings.slice(0, 2).map((warning) => (
                <li key={warning.code} style={draftWarningItem}>
                  {t(warning.messageKey)}
                </li>
              ))}
            </ul>
          )}
        </section>

        {requestMode === "conversation" && (
          <div className="job-request-conversation-workspace" style={conversationWorkspace}>
            <section
              style={conversationPanel}
              aria-labelledby="job-request-conversation-title"
              data-ask-meetro-context="job-request"
            >
            <section style={broadCategorySection} aria-labelledby="job-request-category-title">
              <label
                id="job-request-category-title"
                htmlFor="job-request-category"
                style={broadCategoryTitle}
              >
                {t("jobRequestWhoCanHelp", language)}
              </label>
              <p style={broadCategoryHelp}>
                {t("jobRequestWhoCanHelpHelp", language)}
              </p>
              <select
                id="job-request-category"
                value={category}
                onChange={(event) => handleBroadCategoryChange(event.target.value)}
                style={broadCategorySelect}
              >
                <option value="">{t("jobRequestCategoryNotSure", language)}</option>
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {broadCategoryLabel && (
                <p style={broadCategorySelected}>
                  <span>{t("jobRequestBroadCategory", language)}</span>
                  <strong>{broadCategoryLabel}</strong>
                </p>
              )}
            </section>
            <div style={conversationHeader}>
              <p style={conversationEyebrow}>{t("jobRequestConversationTitle", language)}</p>
              <h2 id="job-request-conversation-title" style={conversationTitle}>
                {t("jobRequestConversationQuestion", language)}
              </h2>
            </div>

            <div
              ref={conversationLogRef}
              style={conversationLog}
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {creationMessages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    ...messageBubble,
                    ...(message.role === "homeowner"
                      ? homeownerMessageBubble
                      : assistantMessageBubble),
                  }}
                >
                  {message.text}
                </div>
              ))}
              {draftReadiness.isReady && (
                <div style={{ ...messageBubble, ...assistantMessageBubble }}>
                  {t("jobRequestConversationReady", language)}
                </div>
              )}
              {interpretationPending && (
                <div role="status" aria-live="polite" style={processingState}>
                  {t("jobRequestConversationProcessing", language)}
                </div>
              )}
              {pendingInterpretation && (
                <section style={assistantFallbackCard} aria-label={getAskMeetroWorkflowCopy(language).title}>
                  <strong>{pendingInterpretation.interpretation.summary}</strong>
                  <div style={liveDraftSectionList}>
                    {pendingInterpretation.interpretation.draftPatch.fields.map((field) => {
                      const isServiceRecommendation = field.path === "service.specialty";
                      const serviceOption = isServiceRecommendation
                        ? serviceSelectorOptions.find(
                            (option) => option.serviceSpecialty === field.value
                          )
                        : null;
                      return (
                        <label key={field.path} style={liveDraftSection}>
                          <span style={liveDraftSectionTitle}>
                            {isServiceRecommendation
                              ? t("jobRequestTechnicalServiceType", language)
                              : field.path.split(".").join(" / ")}
                          </span>
                          {editingInterpretation ? (
                            isServiceRecommendation ? (
                              <select
                                style={compactInputStyle}
                                value={field.value}
                                onChange={(event) =>
                                  updatePendingInterpretationField(
                                    field.path,
                                    event.target.value
                                  )
                                }
                              >
                                {serviceSelectorOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.serviceSpecialty}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <textarea
                                style={composerInput}
                                value={field.value}
                                maxLength={4000}
                                onChange={(event) =>
                                  updatePendingInterpretationField(
                                    field.path,
                                    event.target.value
                                  )
                                }
                              />
                            )
                          ) : (
                            <span>{serviceOption?.label || field.value}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <p style={emptyDraftText}>{getAskMeetroWorkflowCopy(language).noSilentChanges}</p>
                  <div style={fallbackActions}>
                    <button
                      type="button"
                      style={secondaryActionButton}
                      disabled={interpretationReviewPending}
                      onClick={() => void reviewPendingInterpretation(editingInterpretation ? "EDITED" : "ACCEPTED")}
                    >
                      {getAskMeetroWorkflowCopy(language).add}
                    </button>
                    <button
                      type="button"
                      style={secondaryActionButton}
                      disabled={interpretationReviewPending}
                      onClick={() => setEditingInterpretation(true)}
                    >
                      {getAskMeetroWorkflowCopy(language).edit}
                    </button>
                    <button
                      type="button"
                      style={secondaryActionButton}
                      disabled={interpretationReviewPending}
                      onClick={() => void reviewPendingInterpretation("REJECTED")}
                    >
                      {getAskMeetroWorkflowCopy(language).dismiss}
                    </button>
                  </div>
                </section>
              )}
            </div>

            {interpretationFailure && (
              <div role="alert" style={assistantFallbackCard}>
                <span>{interpretationFailure.message}</span>
                <div style={fallbackActions}>
                  {interpretationFailure.classification !==
                    JOB_REQUEST_INTERPRETATION_FAILURE.UNAVAILABLE &&
                    pendingInterpretText && (
                      <button
                        type="button"
                        style={secondaryActionButton}
                        onClick={handleRetryInterpretation}
                      >
                        {t("jobRequestRetryInterpretation", language)}
                      </button>
                    )}
                  <button
                    type="button"
                    style={secondaryActionButton}
                    onClick={handleContinueManually}
                  >
                    {t("jobRequestContinueManually", language)}
                  </button>
                </div>
              </div>
            )}

            <form style={composer} onSubmit={handleConversationSubmit}>
              <label htmlFor="job-request-conversation-input" style={srOnly}>
                {t("jobRequestConversationQuestion", language)}
              </label>
              <textarea
                id="job-request-conversation-input"
                value={conversationText}
                onChange={(event) => setConversationText(event.target.value)}
                placeholder={t("jobRequestConversationPlaceholder", language)}
                style={composerInput}
                rows={3}
                disabled={interpretationPending}
              />
              <div style={composerActions}>
                <WorkflowMicrophoneInput
                  language={language}
                  contextLabel="job_request"
                  disabled={interpretationPending}
                  setPage={setPage}
                  onTranscript={setConversationText}
                />
                <button
                  type="button"
                  style={secondaryActionButton}
                  onClick={openRequestPhotoPicker}
                  disabled={mediaUploadDeferred || uploading || creating}
                  aria-label={requestHelpCopy.addPhoto}
                  title={requestHelpCopy.addPhoto}
                >
                  {t("addPhotos", language)}
                </button>
                <button
                  type="button"
                  style={secondaryActionButton}
                  onClick={() => focusManualDetails()}
                >
                  {t("jobRequestEnterDetailsManually", language)}
                </button>
                <button
                  type="submit"
                  style={{
                    ...sendButton,
                    opacity:
                      interpretationPending ||
                      !hasMeaningfulCreationText(conversationText)
                        ? 0.6
                        : 1,
                  }}
                  disabled={
                    interpretationPending ||
                    !hasMeaningfulCreationText(conversationText)
                  }
                >
                  {t("jobRequestConversationSend", language)}
                </button>
              </div>
            </form>
            </section>

            <aside
              className="job-request-details-panel"
              style={liveDraftPanel}
              aria-labelledby="job-request-live-draft-title"
            >
            <div style={liveDraftHeader}>
              <h2 id="job-request-live-draft-title" style={liveDraftTitle}>
                {t("jobRequestYourRequest", language)}
              </h2>
              <span style={requestModePill}>{t("jobRequestConversationTitle", language)}</span>
            </div>

            {liveDraftSections.length === 0 ? (
              <p style={emptyDraftText}>{t("jobRequestDraftGuidanceDescription", language)}</p>
            ) : (
              <div style={liveDraftSectionList}>
                {liveDraftSections.map((section) => (
                  <section key={section.id} style={liveDraftSection}>
                    <strong style={liveDraftSectionTitle}>{section.label}</strong>
                    {section.values.slice(0, 2).map((value) => (
                      <p key={value} style={liveDraftValue}>{value}</p>
                    ))}
                    {[
                      JOB_REQUEST_DRAFT_UNCERTAINTY.APPROXIMATE,
                      JOB_REQUEST_DRAFT_UNCERTAINTY.UNCERTAIN,
                      JOB_REQUEST_DRAFT_UNCERTAINTY.ASSISTANT_SUGGESTED,
                    ].includes(section.uncertainty) && (
                      <small style={uncertaintyText}>
                        {t("jobRequestMayNeedProfessionalReview", language)}
                      </small>
                    )}
                  </section>
                ))}
              </div>
            )}

            {serviceSuggested && selectedServiceLabel && (
              <div style={suggestedServiceActions}>
                <div style={suggestedServiceSummary}>
                  <span>{t("jobRequestMeetroSuggests", language)}</span>
                  <strong>{selectedServiceLabel}</strong>
                  <small>{t("jobRequestTechnicalServiceType", language)}</small>
                </div>
                <button
                  type="button"
                  style={secondaryActionButton}
                  onClick={acceptAssistantServiceSuggestion}
                >
                  {t("jobRequestAcceptSuggestion", language)}
                </button>
                <button
                  type="button"
                  style={secondaryActionButton}
                  onClick={() => {
                    setServiceSelectorOpen(true);
                    focusManualDetails("service");
                  }}
                >
                  {t("jobRequestChangeSuggestion", language)}
                </button>
              </div>
            )}

            <div style={reviewActionGroup}>
              <button
                type="button"
                style={{
                  ...sendButton,
                  opacity: draftReadiness.isReady ? 1 : 0.62,
                }}
                onClick={handleReviewRequest}
              >
                {t("jobRequestReviewRequest", language)}
              </button>
              <button
                type="button"
                style={secondaryActionButton}
                onClick={() => focusManualDetails()}
              >
                {t("jobRequestAddMoreDetails", language)}
              </button>
            </div>
            </aside>
          </div>
        )}

        {requestMode === "manual" && (
          <div
            ref={manualDetailsRef}
            id="request-details-manual-form"
            className="meetro-visual-surface guided-request-builder request-help-manual-form"
            style={guidedBuilder}
          >
            <button type="button" style={backToConversationButton} onClick={handleBackToConversation}>
              {t("jobRequestBackToConversation", language)}
            </button>

            <div style={manualHeader}>
              <h2 style={manualTitle}>{t("jobRequestEnterRequestDetails", language)}</h2>
              <p style={manualSubtitle}>{t("jobRequestEnterRequestDetailsHelp", language)}</p>
            </div>

            <nav style={guidedProgressCard} aria-label={t("jobRequestProgress", language)}>
              <strong style={requestReviewIntroTitle}>{t("jobRequestProgress", language)}</strong>
              <ol style={guidedProgressList}>
                {guidedCards.map((item) => {
                  const state = getGuidedCardState(item.key, item.complete);
                  return (
                    <li key={item.key} style={guidedProgressItem}>
                      <span aria-hidden="true">{item.complete ? "✓" : "○"}</span>
                      <button
                        type="button"
                        style={{
                          ...guidedProgressButton,
                          ...(state === "active" ? guidedProgressButtonActive : {}),
                        }}
                        onClick={() => continueToCard(item.key)}
                        aria-current={state === "active" ? "step" : undefined}
                      >
                        {item.shortLabel}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <GuidedWorkspaceCard
              id="job-request-work-card"
              title={t("jobRequestCardWork", language)}
              state={getGuidedCardState("work", workComplete)}
              summary={guidedCards.find((card) => card.key === "work")?.summary}
              onEdit={() => continueToCard("work")}
              editLabel={t("jobRequestDraftEdit", language)}
            >
              <section style={broadCategorySection} aria-labelledby="job-request-category-title">
                <label
                  id="job-request-category-title"
                  htmlFor="job-request-category"
                  style={broadCategoryTitle}
                >
                  {t("jobRequestWhoCanHelp", language)}
                </label>
                <p style={broadCategoryHelp}>
                  {t("jobRequestWhoCanHelpHelp", language)}
                </p>
                <select
                  id="job-request-category"
                  value={category}
                  onChange={(event) => handleBroadCategoryChange(event.target.value)}
                  style={broadCategorySelect}
                >
                  <option value="">{t("jobRequestCategoryNotSure", language)}</option>
                  {categories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {broadCategoryLabel && (
                  <p style={broadCategorySelected}>
                    <span>{t("jobRequestBroadCategory", language)}</span>
                    <strong>{broadCategoryLabel}</strong>
                  </p>
                )}
              </section>

              <div style={manualSection}>
                <label htmlFor="request-title" style={subtleFieldLabel}>
                  {t("projectTitle")} ({requestHelpCopy.required})
                </label>
                <input
                  id="request-title"
                  ref={titleInputRef}
                  placeholder={t("projectTitlePlaceholder")}
                  value={title}
                  onChange={(e) => {
                    setDraft((current) =>
                      applyHomeownerInput(current, {
                        "job.title": e.target.value,
                      })
                    );
                    setFieldErrors((current) => ({ ...current, title: undefined }));
                  }}
                  style={compactInputStyle}
                  maxLength={160}
                  aria-invalid={Boolean(fieldErrors.title)}
                  aria-describedby={fieldErrors.title ? "request-title-error" : undefined}
                />
                {fieldErrors.title && (
                  <p id="request-title-error" role="alert" style={fieldErrorText}>
                    {t("enterPostTitle")}
                  </p>
                )}

                <label htmlFor="request-description" style={subtleFieldLabel}>
                  {t("projectDescription")}
                </label>
                <textarea
                  id="request-description"
                  ref={descriptionInputRef}
                  placeholder={t("projectDescriptionPlaceholder")}
                  value={description}
                  onChange={(e) => {
                    setDraft((current) =>
                      applyHomeownerInput(current, {
                        "job.description": e.target.value,
                      })
                    );
                  }}
                  style={textareaStyle}
                  maxLength={5000}
                />
              </div>

              <section style={manualSection} aria-labelledby="request-service-heading">
                <h3 id="request-service-heading" style={manualSectionTitle}>
                  {t("jobRequestTechnicalServiceType", language)}
                </h3>
                {hasSelectedService ? (
                  <div style={selectedServiceCard}>
                    <span style={selectedServiceLabelText}>
                      {serviceSuggested
                        ? t("jobRequestMeetroSuggests", language)
                        : t("jobRequestDraftReviewService", language)}
                    </span>
                    <strong style={selectedServiceValue}>{selectedServiceLabel}</strong>
                    {serviceSuggested && (
                      <p style={selectedServiceHelpText}>
                        {t("jobRequestSuggestedServiceHelp", language)}
                      </p>
                    )}
                    {serviceSuggested && (
                      <button
                        type="button"
                        style={changeServiceButton}
                        onClick={acceptAssistantServiceSuggestion}
                      >
                        {t("jobRequestAcceptSuggestion", language)}
                      </button>
                    )}
                    <button
                      type="button"
                      style={changeServiceButton}
                      onClick={() => setServiceSelectorOpen(true)}
                    >
                      {serviceConfirmed
                        ? t("jobRequestChangeService", language)
                        : t("jobRequestChangeSuggestion", language)}
                    </button>
                  </div>
                ) : (
                  <div style={selectedServiceCard}>
                    <span style={selectedServiceLabelText}>{requestHelpCopy.service}</span>
                    <p style={selectedServiceHelpText}>
                      {t("jobRequestChooseServiceHelp", language)}
                    </p>
                    <button
                      type="button"
                      style={changeServiceButton}
                      onClick={() => setServiceSelectorOpen(true)}
                    >
                      {t("jobRequestChooseService", language)}
                    </button>
                  </div>
                )}

                <label htmlFor="request-service-search" style={subtleFieldLabel}>
                  {t("jobRequestSearchServices", language)}
                </label>
                <input
                  id="request-service-search"
                  ref={serviceSearchInputRef}
                  placeholder={t("requestIntelligencePlaceholder")}
                  value={serviceSearch}
                  onChange={(event) => handleServiceSearchChange(event.target.value)}
                  style={compactInputStyle}
                  aria-invalid={Boolean(fieldErrors.category)}
                  aria-describedby={fieldErrors.category ? "request-service-error" : undefined}
                />
                {fieldErrors.category && (
                  <p id="request-service-error" role="alert" style={fieldErrorText}>
                    {requestHelpCopy.matchRequired}
                  </p>
                )}

                {serviceSuggestions.length > 0 && (
                  <div style={serviceSuggestionGrid}>
                    {serviceSuggestions.map((service) => (
                      <button
                        key={service.serviceId}
                        type="button"
                        style={{
                          ...serviceSuggestionButton,
                          ...(category === service.requestCategory
                            ? serviceSuggestionButtonActive
                            : {}),
                        }}
                        onClick={() => selectSuggestedService(service)}
                      >
                        {service.label}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  style={browseAllButton}
                  onClick={() => setServiceSelectorOpen(true)}
                >
                  {t("jobRequestBrowseAllServices", language)}
                </button>
              </section>

              {category === "other" && (
                <section style={manualSection}>
                  <label htmlFor="request-custom-service" style={fieldLabel}>
                    {t("otherService")}
                  </label>
                  <input
                    id="request-custom-service"
                    placeholder={t("enterCustomService")}
                    value={customCategory}
                    onChange={(e) =>
                      setDraft((current) =>
                        setServiceClassification(current, {
                          ...current.service,
                          customCategory: e.target.value,
                        })
                      )
                    }
                    style={inputStyle}
                  />
                </section>
              )}

              <div style={guidedCardActions}>
                <button
                  type="button"
                  style={sendButton}
                  onClick={() => continueToCard("location")}
                >
                  {t("jobRequestContinue", language)}
                </button>
              </div>
            </GuidedWorkspaceCard>

            <GuidedWorkspaceCard
              id="job-request-location-card"
              title={t("jobRequestCardLocation", language)}
              state={getGuidedCardState("location", locationComplete)}
              summary={locationSummary}
              onEdit={() => continueToCard("location")}
              editLabel={t("jobRequestDraftEdit", language)}
            >
              <p style={manualSectionHelp}>{t("jobRequestLocationPrivacyPromise", language)}</p>
              <fieldset style={locationModeFieldset}>
                <legend style={srOnly}>{t("jobRequestLocationSharingChoice", language)}</legend>
                <label
                  htmlFor="request-location-mode-exact"
                  style={{
                    ...locationModeOption,
                    ...(isExactLocationMode ? locationModeOptionActive : {}),
                  }}
                >
                  <input
                    id="request-location-mode-exact"
                    type="radio"
                    name="request-location-intake-mode"
                    value={JOB_REQUEST_LOCATION_INTAKE_MODE.EXACT_ON_FILE}
                    checked={isExactLocationMode}
                    onChange={() =>
                      handleLocationIntakeModeChange(
                        JOB_REQUEST_LOCATION_INTAKE_MODE.EXACT_ON_FILE
                      )
                    }
                    style={locationModeRadio}
                  />
                  <span style={locationModeText}>
                    <strong style={locationModeTitle}>{t("jobRequestFullAddressNow", language)}</strong>
                    <small style={locationModeHelp}>
                      {t("jobRequestFullAddressPrivacy", language)}
                    </small>
                  </span>
                </label>

                <label
                  htmlFor="request-location-mode-later"
                  style={{
                    ...locationModeOption,
                    ...(isAddressLaterMode ? locationModeOptionActive : {}),
                  }}
                >
                  <input
                    id="request-location-mode-later"
                    type="radio"
                    name="request-location-intake-mode"
                    value={JOB_REQUEST_LOCATION_INTAKE_MODE.ADDRESS_AFTER_SELECTION}
                    checked={isAddressLaterMode}
                    onChange={() =>
                      handleLocationIntakeModeChange(
                        JOB_REQUEST_LOCATION_INTAKE_MODE.ADDRESS_AFTER_SELECTION
                      )
                    }
                    style={locationModeRadio}
                  />
                  <span style={locationModeText}>
                    <strong style={locationModeTitle}>{t("jobRequestGeneralAreaForNow", language)}</strong>
                    <small style={locationModeHelp}>
                      {t("jobRequestGeneralAreaPrivacy", language)}
                    </small>
                  </span>
                </label>
              </fieldset>

              {isExactLocationMode && (
                <>
                  <label htmlFor="request-location" style={subtleFieldLabel}>
                    {t("streetAddress", language)}
                  </label>
                  <input
                    id="request-location"
                    ref={locationInputRef}
                    placeholder={t("streetAddress", language)}
                    value={location}
                    onChange={(e) => {
                      setDraft((current) =>
                        applyHomeownerInput(current, {
                          "location.serviceAddress": e.target.value,
                        })
                      );
                      setFieldErrors((current) => ({ ...current, location: undefined }));
                    }}
                    style={inputStyle}
                    maxLength={500}
                    autoComplete="street-address"
                    aria-invalid={Boolean(fieldErrors.location)}
                    aria-describedby={fieldErrors.location ? "request-location-error" : undefined}
                  />
                </>
              )}

              <div style={serviceLocationGrid}>
                <label style={serviceLocationField}>
                  <span style={subtleFieldLabel}>{t("city", language)}</span>
                  <input
                    id="request-city"
                    ref={isAddressLaterMode ? locationInputRef : undefined}
                    value={serviceCity}
                    onChange={(e) => {
                      setDraft((current) =>
                        applyHomeownerInput(current, {
                          "location.city": e.target.value,
                        })
                      );
                      setFieldErrors((current) => ({ ...current, location: undefined }));
                    }}
                    style={compactInputStyle}
                    maxLength={120}
                    autoComplete="address-level2"
                    aria-invalid={Boolean(fieldErrors.location)}
                    aria-describedby={fieldErrors.location ? "request-location-error" : undefined}
                  />
                </label>

                <label style={serviceLocationField}>
                  <span style={subtleFieldLabel}>{t("stateRegion", language)}</span>
                  <input
                    id="request-region"
                    value={serviceRegion}
                    onChange={(e) => {
                      setDraft((current) =>
                        applyHomeownerInput(current, {
                          "location.region": e.target.value,
                        })
                      );
                      setFieldErrors((current) => ({ ...current, location: undefined }));
                    }}
                    style={compactInputStyle}
                    maxLength={120}
                    autoComplete="address-level1"
                    aria-invalid={Boolean(fieldErrors.location)}
                    aria-describedby={fieldErrors.location ? "request-location-error" : undefined}
                  />
                </label>

                <label style={serviceLocationField}>
                  <span style={subtleFieldLabel}>{t("zipPostalCode", language)}</span>
                  <input
                    id="request-postal-code"
                    value={servicePostalCode}
                    onChange={(e) => {
                      setDraft((current) =>
                        applyHomeownerInput(current, {
                          "location.postalCode": e.target.value,
                        })
                      );
                      setFieldErrors((current) => ({ ...current, location: undefined }));
                    }}
                    style={compactInputStyle}
                    maxLength={32}
                    autoComplete="postal-code"
                    aria-invalid={Boolean(fieldErrors.location)}
                    aria-describedby={fieldErrors.location ? "request-location-error" : undefined}
                  />
                </label>

                <label style={serviceLocationField}>
                  <span style={subtleFieldLabel}>{t("country", language)}</span>
                  <input
                    id="request-country-code"
                    value={serviceCountryCode}
                    onChange={(e) => {
                      setDraft((current) =>
                        applyHomeownerInput(current, {
                          "location.countryCode": e.target.value.toUpperCase(),
                        })
                      );
                      setFieldErrors((current) => ({ ...current, location: undefined }));
                    }}
                    style={compactInputStyle}
                    maxLength={2}
                    autoComplete="country"
                    aria-invalid={Boolean(fieldErrors.location)}
                    aria-describedby={fieldErrors.location ? "request-location-error" : undefined}
                  />
                </label>
              </div>

              {fieldErrors.location && (
                <p id="request-location-error" role="alert" style={fieldErrorText}>
                  {requestHelpCopy.locationRequired}
                </p>
              )}

              {isExactLocationMode && (
                <>
                  <label htmlFor="request-unit" style={subtleFieldLabel}>
                    {t("unitNumber")} ({requestHelpCopy.optional})
                  </label>
                  <input
                    id="request-unit"
                    placeholder={t("unitNumberPlaceholder")}
                    value={unitNumber}
                    onChange={(e) =>
                      setDraft((current) =>
                        applyHomeownerInput(current, {
                          "location.unitNumber": e.target.value,
                        })
                      )
                    }
                    style={compactInputStyle}
                    maxLength={100}
                  />
                </>
              )}

              <label htmlFor="request-access-notes" style={subtleFieldLabel}>
                {t("accessNotes")} ({requestHelpCopy.optional})
              </label>
              <textarea
                id="request-access-notes"
                placeholder={t("accessNotesPlaceholder")}
                value={accessNotes}
                onChange={(e) =>
                  setDraft((current) =>
                    applyHomeownerInput(current, {
                      "location.accessNotes": e.target.value,
                    })
                  )
                }
                style={compactTextareaStyle}
                maxLength={1000}
              />

              <div style={guidedCardActions}>
                <button
                  type="button"
                  style={secondaryActionButton}
                  onClick={() => continueToCard("work")}
                >
                  {t("jobRequestPrevious", language)}
                </button>
                <button
                  type="button"
                  style={sendButton}
                  onClick={() => continueToCard("photos")}
                >
                  {t("jobRequestContinue", language)}
                </button>
              </div>
            </GuidedWorkspaceCard>

            <GuidedWorkspaceCard
              id="job-request-photos-card"
              title={t("jobRequestCardPhotos", language)}
              state={getGuidedCardState("photos", photosComplete)}
              summary={photoSummary}
              onEdit={() => continueToCard("photos")}
              editLabel={t("jobRequestDraftEdit", language)}
            >
              <p style={manualSectionHelp}>{t("jobRequestPhotosHelp", language)}</p>
              <div className="meetro-visual-empty-state" style={uploadBox}>
                <button
                  onClick={openRequestPhotoPicker}
                  style={{
                    ...plusUploadButton,
                    ...(mediaUploadDeferred || uploading || creating ? disabledUploadButton : {}),
                  }}
                  type="button"
                  disabled={mediaUploadDeferred || uploading || creating}
                  aria-label={requestHelpCopy.addPhoto}
                  title={requestHelpCopy.addPhoto}
                >
                  +
                </button>

                <p style={uploadText}>
                  {mediaUploadDeferred
                    ? mediaDeferredCopy.title
                    : projectPhotos.length > 0
                    ? t("projectPhotoAdded")
                    : t("addProjectPhoto")}
                </p>

                <p style={uploadSubText}>
                  {mediaUploadDeferred ? mediaDeferredCopy.detail : t("photoHelpsPros")}
                </p>

                <input
                  ref={photoInputRef}
                  id="postImageInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={mediaUploadDeferred || uploading || creating}
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />

                {uploading && <p role="status" aria-live="polite" style={uploadingText}>{t("uploadingImage")}</p>}
                {photoError && <p role="alert" style={uploadingText}>{photoError}</p>}
              </div>

              {projectPhotos.length > 0 && (
                <div style={previewBox}>
                  <div style={photoPreviewStrip}>
                    {projectPhotos.map((photo, index) => (
                      <div key={photo + index} style={photoPreviewItem}>
                        <img src={photo} alt={t("preview")} style={previewImage} />

                        <button
                          onClick={() => removeSelectedRequestPhoto(index)}
                          style={removePhotoButton}
                          type="button"
                          aria-label={requestHelpCopy.removePhoto(index + 1)}
                          title={requestHelpCopy.removePhoto(index + 1)}
                        >
                          ×
                        </button>

                        <div style={photoOrderControls}>
                          <button
                            type="button"
                            onClick={() => moveSelectedRequestPhoto(index, -1)}
                            disabled={index === 0}
                            aria-label={getPhotoOrderLabel(-1, index)}
                            title={getPhotoOrderLabel(-1, index)}
                            style={{
                              ...photoOrderButton,
                              ...(index === 0 ? disabledPhotoOrderButton : {}),
                            }}
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSelectedRequestPhoto(index, 1)}
                            disabled={index === projectPhotos.length - 1}
                            aria-label={getPhotoOrderLabel(1, index)}
                            title={getPhotoOrderLabel(1, index)}
                            style={{
                              ...photoOrderButton,
                              ...(index === projectPhotos.length - 1
                                ? disabledPhotoOrderButton
                                : {}),
                            }}
                          >
                            →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p style={photoCountText}>
                    {t("jobRequestPhotoCount", language).replace(
                      "{count}",
                      String(projectPhotos.length)
                    )}
                  </p>
                </div>
              )}

              <div style={guidedCardActions}>
                <button
                  type="button"
                  style={secondaryActionButton}
                  onClick={() => continueToCard("location")}
                >
                  {t("jobRequestPrevious", language)}
                </button>
                <button
                  type="button"
                  style={sendButton}
                  onClick={() => continueToCard("timing")}
                >
                  {t("jobRequestContinue", language)}
                </button>
              </div>
            </GuidedWorkspaceCard>

            <GuidedWorkspaceCard
              id="job-request-timing-card"
              title={t("jobRequestCardTiming", language)}
              state={getGuidedCardState("timing", timingComplete)}
              summary={timingSummary}
              onEdit={() => continueToCard("timing")}
              editLabel={t("jobRequestDraftEdit", language)}
            >
              <p style={manualSectionHelp}>{t("jobRequestTimingHelp", language)}</p>
              <label htmlFor="request-timing-urgency" style={subtleFieldLabel}>
                {t("jobRequestTimingUrgency", language)}
              </label>
              <select
                id="request-timing-urgency"
                value={draft.timing.urgency}
                onChange={(e) =>
                  setDraft((current) =>
                    applyHomeownerInput(current, {
                      "timing.urgency": e.target.value,
                    })
                  )
                }
                style={compactInputStyle}
              >
                <option value="">{t("jobRequestTimingFlexible", language)}</option>
                <option value={t("jobRequestTimingRoutine", language)}>
                  {t("jobRequestTimingRoutine", language)}
                </option>
                <option value={t("jobRequestTimingSoon", language)}>
                  {t("jobRequestTimingSoon", language)}
                </option>
                <option value={t("jobRequestTimingUrgent", language)}>
                  {t("jobRequestTimingUrgent", language)}
                </option>
              </select>

              <label htmlFor="request-desired-timing" style={subtleFieldLabel}>
                {t("jobRequestDesiredTiming", language)}
              </label>
              <input
                id="request-desired-timing"
                value={draft.timing.desiredTiming}
                onChange={(e) =>
                  setDraft((current) =>
                    applyHomeownerInput(current, {
                      "timing.desiredTiming": e.target.value,
                    })
                  )
                }
                style={compactInputStyle}
                maxLength={300}
              />

              <label htmlFor="request-availability" style={subtleFieldLabel}>
                {t("jobRequestAvailabilityNotes", language)}
              </label>
              <textarea
                id="request-availability"
                value={draft.timing.availability}
                onChange={(e) =>
                  setDraft((current) =>
                    applyHomeownerInput(current, {
                      "timing.availability": e.target.value,
                    })
                  )
                }
                style={compactTextareaStyle}
                maxLength={500}
              />

              <div style={guidedCardActions}>
                <button
                  type="button"
                  style={secondaryActionButton}
                  onClick={() => continueToCard("photos")}
                >
                  {t("jobRequestPrevious", language)}
                </button>
                <button
                  type="button"
                  style={sendButton}
                  onClick={() => continueToCard("review")}
                >
                  {t("jobRequestReviewRequest", language)}
                </button>
              </div>
            </GuidedWorkspaceCard>

            <GuidedWorkspaceCard
              id="job-request-review-card"
              title={t("jobRequestCardReview", language)}
              state={getGuidedCardState("review", reviewComplete)}
              summary={guidedCards.find((card) => card.key === "review")?.summary}
              onEdit={() => continueToCard("review")}
              editLabel={t("jobRequestDraftEdit", language)}
            >
              <form
                className="guided-request-review-form"
                onSubmit={handleCreatePost}
                noValidate
              >
                <div style={guidedReviewGrid}>
                  {[
                    {
                      key: "work",
                      label: t("jobRequestCardWork", language),
                      summary: guidedCards.find((card) => card.key === "work")?.summary,
                      target: "description",
                    },
                    {
                      key: "location",
                      label: t("jobRequestCardLocation", language),
                      summary: locationSummary,
                      target: "location",
                    },
                    {
                      key: "photos",
                      label: t("jobRequestCardPhotos", language),
                      summary: photoSummary,
                      target: "photos",
                    },
                    {
                      key: "timing",
                      label: t("jobRequestCardTiming", language),
                      summary: timingSummary,
                      target: "timing",
                    },
                  ].map((section) => (
                    <section key={section.key} style={guidedReviewPanel}>
                      <div>
                        <strong style={draftReviewSectionTitle}>{section.label}</strong>
                        {(section.summary || []).map((value) => (
                          <p key={value} style={liveDraftValue}>{value}</p>
                        ))}
                      </div>
                      <button
                        type="button"
                        style={draftReviewEditButton}
                        onClick={() => handleReviewEdit(section.target)}
                      >
                        {t("jobRequestDraftEdit", language)}
                      </button>
                    </section>
                  ))}
                </div>

                <div style={requestReviewIntroCard}>
                  <ul style={requestReviewList}>
                    {reviewItems.map((item) => (
                      <li key={item.label} style={requestReviewItem}>
                        <span>{item.label}</span>
                        <strong style={item.value ? requestReviewValue : requestReviewMissing}>
                          {item.value || (item.required ? requestHelpCopy.missing : requestHelpCopy.optional)}
                        </strong>
                      </li>
                    ))}
                  </ul>
                </div>

                {submissionError && (
                  <div role="alert" aria-live="assertive" style={submissionErrorCard}>
                    <strong>{t("postCreateFailed")}</strong>
                    <span>{submissionError}</span>
                  </div>
                )}

                <div style={requestActionBar}>
                  <button
                    type="submit"
                    disabled={creating || uploading}
                    className="meetro-visual-primary-button"
                    style={{
                      ...primaryButton,
                      background: creating || uploading
                        ? "rgba(100, 116, 139, 0.72)"
                        : "var(--meetro-gradient-community-action)",
                      cursor: creating || uploading ? "not-allowed" : "pointer",
                    }}
                  >
                    {creating ? t("creating") : t("createPost")}
                  </button>

                  <button type="button" onClick={() => continueToCard(firstIncompleteRequiredCard)} style={cancelRequestButton}>
                    {t("jobRequestAddMoreDetails", language)}
                  </button>
                </div>
              </form>
            </GuidedWorkspaceCard>
          </div>
        )}
      </div>

      <ServiceSelectorSheet
        open={serviceSelectorOpen}
        title={t("jobRequestChooseService", language)}
        subtitle={t("requestIntelligencePlaceholder")}
        searchPlaceholder={t("searchServices")}
        options={serviceSelectorOptions}
        selectedValues={selectedServiceOptionId ? [selectedServiceOptionId] : []}
        onSelect={selectServiceOption}
        onClose={() => setServiceSelectorOpen(false)}
      />

      <BottomNav setPage={setPage} currentPage="upload" />
    </div>
  );
}

const pageWrapper = {
  background: "var(--meetro-gradient-community-page)",
  minHeight: "100dvh",
  padding:
    "calc(env(safe-area-inset-top) + 24px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "1180px",
  minWidth: 0,
  margin: "0 auto",
  overflowX: "hidden",
  contain: "layout paint",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const contentLane = {
  width: "100%",
  maxWidth: "min(1120px, 100%)",
  minWidth: 0,
  margin: "0 auto",
  boxSizing: "border-box",
};

const requestHeader = {
  marginBottom: "14px",
  maxWidth: "100%",
};

const requestPageTitle = {
  margin: "0 0 6px",
  color: "var(--meetro-color-ink)",
  fontSize: "clamp(28px, 7vw, 36px)",
  lineHeight: 1.08,
};

const requestPageSubtitle = {
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "15px",
  lineHeight: 1.5,
};

const requestHelpLayoutStyles = `
  .request-help-page {
    isolation: isolate;
  }

  .request-help-content-lane {
    width: 100%;
    max-width: min(1120px, 100%);
    min-width: 0;
    margin-left: auto;
    margin-right: auto;
    box-sizing: border-box;
  }

  .job-request-conversation-workspace {
    grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.8fr);
  }

  .request-help-content-lane > *,
  .request-help-content-lane form > * {
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  @media (max-width: 1099px) {
    .request-help-page {
      padding-left: max(18px, env(safe-area-inset-left, 0px)) !important;
      padding-right: max(18px, env(safe-area-inset-right, 0px)) !important;
      padding-bottom: calc(168px + env(safe-area-inset-bottom, 0px)) !important;
    }
  }

  @media (min-width: 1100px) {
    #root[data-app-layout="desktop"] .app-page.request-help-page.meetro-form-page {
      contain: none !important;
      width: calc(100vw - var(--meetro-sidebar-width)) !important;
      max-width: calc(100vw - var(--meetro-sidebar-width)) !important;
      margin-left: var(--meetro-sidebar-width) !important;
      margin-right: 0 !important;
      padding-top: clamp(24px, 2.8vw, 40px) !important;
      padding-left: clamp(24px, 3vw, 48px) !important;
      padding-right: clamp(24px, 3vw, 48px) !important;
      padding-bottom: max(128px, env(safe-area-inset-bottom, 0px)) !important;
    }

    #root[data-app-layout="desktop"] .request-help-content-lane {
      max-width: min(1120px, 100%) !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }
  }

  @media (max-width: 820px) {
    .job-request-conversation-workspace {
      grid-template-columns: minmax(0, 1fr) !important;
    }

    .job-request-details-panel {
      position: static !important;
      max-height: none !important;
    }
  }

  @media (max-width: 430px) {
    .request-help-page textarea,
    .request-help-page input,
    .request-help-page button {
      max-width: 100%;
    }
  }

  .request-help-manual-form {
    padding-bottom: calc(28px + env(safe-area-inset-bottom, 0px)) !important;
    scroll-margin-bottom: calc(176px + env(safe-area-inset-bottom, 0px));
  }

  .guided-request-builder {
    width: min(820px, 100%);
    margin: 0 auto 18px;
  }

  .guided-workspace-card {
    display: grid;
    gap: 12px;
    border: 1px solid var(--meetro-color-line);
    border-radius: 18px;
    background: rgba(255, 253, 248, 0.96);
    padding: 14px;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
    transition: border-color 150ms ease, box-shadow 150ms ease, background 150ms ease;
    min-width: 0;
  }

  .guided-workspace-card--active {
    border-color: rgba(31, 77, 52, 0.32);
    box-shadow: 0 16px 34px rgba(31, 77, 52, 0.13);
  }

  .guided-workspace-card--complete,
  .guided-workspace-card--upcoming {
    padding-block: 11px;
  }

  .guided-workspace-card--upcoming {
    background: rgba(255, 253, 248, 0.72);
    box-shadow: none;
  }

  .guided-workspace-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
  }

  .guided-workspace-card__title-row {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
  }

  .guided-workspace-card__status {
    width: 26px;
    height: 26px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: var(--meetro-surface-sage);
    color: var(--meetro-color-forest);
    font-size: 14px;
    font-weight: 950;
    flex: 0 0 auto;
  }

  .guided-workspace-card__title {
    margin: 0;
    color: var(--meetro-color-ink);
    font-size: 18px;
    line-height: 1.2;
    letter-spacing: 0;
  }

  .guided-workspace-card__edit {
    min-height: 36px;
    border: 1px solid var(--meetro-color-line);
    border-radius: 999px;
    background: var(--meetro-surface-paper);
    color: var(--meetro-color-forest);
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
    flex: 0 0 auto;
  }

  .guided-workspace-card__summary {
    display: grid;
    gap: 3px;
    padding-left: 35px;
    min-width: 0;
  }

  .guided-workspace-card__summary-line {
    margin: 0;
    color: var(--meetro-color-ink);
    font-size: 13px;
    line-height: 1.35;
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .guided-workspace-card__summary-line--muted {
    color: var(--meetro-color-muted);
  }

  .guided-workspace-card__content,
  .guided-request-review-form {
    display: grid;
    gap: 12px;
    min-width: 0;
  }

  @media (max-width: 820px) {
    .guided-request-builder {
      width: 100%;
    }
  }

  @media (max-width: 430px) {
    .guided-workspace-card {
      border-radius: 14px;
      padding: 12px;
    }

    .guided-workspace-card__header {
      align-items: flex-start;
    }

    .guided-workspace-card__summary {
      padding-left: 0;
    }
  }
`;

const backButton = {
  width: "44px",
  height: "44px",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "16px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-forest)",
  fontSize: "24px",
  fontWeight: "900",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "12px",
  boxShadow: "var(--meetro-shadow-soft)",
  cursor: "pointer",
};

const preparedRequestBanner = {
  position: "relative",
  background: "rgba(255, 253, 248, 0.88)",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "20px",
  padding: "14px 14px 14px 56px",
  marginBottom: "12px",
  boxShadow: "var(--meetro-shadow-soft)",
  maxWidth: "100%",
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  backdropFilter: "blur(16px)",
};

const preparedRequestOrb = {
  position: "absolute",
  left: "14px",
  top: "14px",
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background: "var(--meetro-surface-sage)",
  border: "1px solid var(--meetro-color-line)",
  color: "var(--meetro-color-forest)",
  fontSize: "13px",
  fontWeight: 950,
};

const preparedRequestBannerTitle = {
  display: "block",
  color: "var(--meetro-color-forest)",
  fontSize: "14px",
  fontWeight: 950,
  marginBottom: "4px",
};

const preparedRequestBannerText = {
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: 700,
};

const conversationWorkspace = {
  display: "grid",
  gap: "14px",
  alignItems: "start",
  marginBottom: "14px",
  maxWidth: "100%",
  minWidth: 0,
};

const conversationPanel = {
  display: "grid",
  gap: "12px",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "22px",
  background: "var(--meetro-surface-paper)",
  padding: "14px",
  boxShadow: "var(--meetro-shadow-soft)",
  minWidth: 0,
  maxWidth: "100%",
};

const conversationHeader = {
  display: "grid",
  gap: "4px",
};

const conversationEyebrow = {
  margin: 0,
  color: "var(--meetro-color-forest)",
  fontSize: "12px",
  fontWeight: 950,
};

const conversationTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "22px",
  lineHeight: 1.15,
  letterSpacing: 0,
};

const conversationLog = {
  display: "grid",
  gap: "9px",
  alignContent: "start",
  minHeight: "220px",
  maxHeight: "min(52dvh, 460px)",
  overflowY: "auto",
  padding: "4px",
  overscrollBehavior: "contain",
};

const messageBubble = {
  width: "fit-content",
  maxWidth: "min(100%, 560px)",
  borderRadius: "16px",
  padding: "10px 12px",
  fontSize: "14px",
  lineHeight: 1.45,
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
};

const assistantMessageBubble = {
  justifySelf: "start",
  background: "var(--meetro-surface-warm)",
  border: "1px solid var(--meetro-color-line)",
  color: "var(--meetro-color-coffee)",
};

const homeownerMessageBubble = {
  justifySelf: "end",
  background: "var(--meetro-surface-sage)",
  border: "1px solid rgba(31, 77, 52, 0.20)",
  color: "var(--meetro-color-forest)",
  fontWeight: 800,
};

const processingState = {
  justifySelf: "start",
  color: "var(--meetro-color-forest)",
  fontSize: "13px",
  fontWeight: 900,
  padding: "4px 2px",
};

const assistantFallbackCard = {
  display: "grid",
  gap: "10px",
  border: "1px solid rgba(180, 35, 24, 0.24)",
  borderRadius: "16px",
  background: "rgba(254, 243, 242, 0.92)",
  color: "#912018",
  padding: "12px",
  fontSize: "13px",
  fontWeight: 800,
};

const fallbackActions = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const composer = {
  display: "grid",
  gap: "9px",
};

const composerInput = {
  width: "100%",
  minHeight: "94px",
  maxHeight: "34dvh",
  resize: "vertical",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "16px",
  padding: "13px 14px",
  fontSize: "16px",
  lineHeight: 1.45,
  color: "var(--meetro-color-ink)",
  background: "var(--meetro-surface-paper)",
  boxSizing: "border-box",
  overflowWrap: "anywhere",
};

const composerActions = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  alignItems: "center",
};

const secondaryActionButton = {
  minHeight: "44px",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "14px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-forest)",
  padding: "9px 12px",
  fontSize: "13px",
  fontWeight: 950,
  cursor: "pointer",
  maxWidth: "100%",
};

const sendButton = {
  minHeight: "44px",
  border: "none",
  borderRadius: "14px",
  background: "var(--meetro-gradient-community-action)",
  color: "#fffdf8",
  padding: "10px 14px",
  fontSize: "14px",
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(31, 77, 52, 0.16)",
  marginLeft: "auto",
};

const liveDraftPanel = {
  position: "sticky",
  top: "calc(env(safe-area-inset-top) + 18px)",
  display: "grid",
  gap: "12px",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "22px",
  background: "rgba(255, 253, 248, 0.94)",
  padding: "14px",
  boxShadow: "var(--meetro-shadow-soft)",
  maxHeight: "calc(100dvh - 140px)",
  overflowY: "auto",
  minWidth: 0,
};

const liveDraftHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
};

const liveDraftTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "18px",
  lineHeight: 1.2,
};

const requestModePill = {
  border: "1px solid rgba(31, 77, 52, 0.16)",
  borderRadius: "999px",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  padding: "7px 10px",
  fontSize: "12px",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const liveDraftSectionList = {
  display: "grid",
  gap: "10px",
};

const liveDraftSection = {
  display: "grid",
  gap: "4px",
  borderTop: "1px solid rgba(31, 77, 52, 0.10)",
  paddingTop: "9px",
};

const liveDraftSectionTitle = {
  color: "var(--meetro-color-forest)",
  fontSize: "12px",
  fontWeight: 950,
};

const liveDraftValue = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "13px",
  lineHeight: 1.4,
  overflowWrap: "anywhere",
};

const emptyDraftText = {
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: 800,
};

const uncertaintyText = {
  color: "var(--meetro-color-muted)",
  fontSize: "12px",
  lineHeight: 1.35,
  fontWeight: 800,
};

const suggestedServiceActions = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const suggestedServiceSummary = {
  display: "grid",
  gap: "4px",
  width: "100%",
  color: "#26362d",
};

const broadCategorySection = {
  display: "grid",
  gap: "8px",
  padding: "18px",
  borderBottom: "1px solid #dbe4dd",
  background: "#f6faf7",
};

const broadCategoryTitle = {
  color: "#173f2a",
  fontSize: "1rem",
  fontWeight: 800,
};

const broadCategoryHelp = {
  margin: 0,
  color: "#52615a",
  lineHeight: 1.45,
};

const broadCategorySelect = {
  width: "100%",
  minHeight: "48px",
  border: "1px solid #aebdb4",
  borderRadius: "8px",
  background: "#ffffff",
  color: "#1f3027",
  padding: "0 12px",
  font: "inherit",
};

const broadCategorySelected = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px 10px",
  margin: 0,
  color: "#52615a",
  fontSize: "0.9rem",
};

const reviewActionGroup = {
  display: "grid",
  gap: "8px",
};

const srOnly = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const successPanel = {
  display: "grid",
  gap: "14px",
  width: "min(560px, 100%)",
  margin: "10dvh auto 0",
  padding: "22px",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "22px",
  background: "var(--meetro-surface-paper)",
  boxShadow: "var(--meetro-shadow-soft)",
  textAlign: "center",
};

const successMark = {
  width: "52px",
  height: "52px",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  justifySelf: "center",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  fontSize: "26px",
  fontWeight: 950,
};

const successActions = {
  display: "grid",
  gap: "8px",
};

const guidedBuilder = {
  background: "var(--meetro-surface-paper)",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "22px",
  padding: "16px",
  display: "grid",
  gap: "12px",
  boxShadow: "var(--meetro-shadow-soft)",
  maxWidth: "100%",
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  backdropFilter: "blur(14px)",
};

const guidedProgressCard = {
  display: "grid",
  gap: "9px",
  padding: "12px",
  borderRadius: "16px",
  border: "1px solid rgba(31, 77, 52, 0.16)",
  background: "rgba(240, 249, 244, 0.78)",
};

const guidedProgressList = {
  listStyle: "none",
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  margin: 0,
  padding: 0,
};

const guidedProgressItem = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  minWidth: 0,
};

const guidedProgressButton = {
  border: "none",
  background: "transparent",
  color: "var(--meetro-color-muted)",
  padding: "4px 2px",
  fontSize: "13px",
  fontWeight: 900,
  cursor: "pointer",
};

const guidedProgressButtonActive = {
  color: "var(--meetro-color-forest)",
  textDecoration: "underline",
  textUnderlineOffset: "4px",
};

const guidedCardActions = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  alignItems: "center",
  justifyContent: "flex-end",
};

const fieldLabel = {
  fontWeight: "900",
  color: "var(--meetro-color-ink)",
  fontSize: "14px",
  marginTop: "4px",
};

const subtleFieldLabel = {
  ...fieldLabel,
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  marginTop: "2px",
};

const inputStyle = {
  width: "100%",
  padding: "14px 15px",
  borderRadius: "16px",
  border: "1px solid var(--meetro-color-line)",
  fontSize: "16px",
  boxSizing: "border-box",
  outline: "none",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-ink)",
  maxWidth: "100%",
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const compactInputStyle = {
  ...inputStyle,
  padding: "12px 13px",
  borderRadius: "14px",
};

const serviceLocationGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: "9px",
};

const serviceLocationField = {
  display: "grid",
  gap: "6px",
  minWidth: 0,
};

const manualHeader = {
  display: "grid",
  gap: "5px",
  marginBottom: "2px",
};

const manualTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "24px",
  lineHeight: 1.15,
  letterSpacing: 0,
};

const manualSubtitle = {
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: 750,
};

const manualSection = {
  display: "grid",
  gap: "9px",
  padding: "14px 0",
  borderTop: "1px solid rgba(31, 77, 52, 0.10)",
};

const manualSectionTitle = {
  margin: 0,
  color: "var(--meetro-color-forest)",
  fontSize: "16px",
  lineHeight: 1.25,
  fontWeight: 950,
};

const manualSectionHelp = {
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.4,
  fontWeight: 750,
};

const locationModeFieldset = {
  display: "grid",
  gap: "8px",
  margin: 0,
  padding: 0,
  border: 0,
  minWidth: 0,
};

const locationModeOption = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: "10px",
  alignItems: "flex-start",
  minHeight: "56px",
  padding: "12px",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "16px",
  background: "var(--meetro-surface-paper)",
  cursor: "pointer",
  minWidth: 0,
};

const locationModeOptionActive = {
  borderColor: "rgba(31, 77, 52, 0.34)",
  background: "var(--meetro-surface-sage)",
};

const locationModeRadio = {
  width: "18px",
  height: "18px",
  margin: "2px 0 0",
  accentColor: "var(--meetro-color-forest)",
};

const locationModeText = {
  display: "grid",
  gap: "4px",
  minWidth: 0,
};

const locationModeTitle = {
  color: "var(--meetro-color-ink)",
  fontSize: "14px",
  lineHeight: 1.25,
  fontWeight: 950,
};

const locationModeHelp = {
  color: "var(--meetro-color-muted)",
  fontSize: "12px",
  lineHeight: 1.4,
  fontWeight: 750,
};

const backToConversationButton = {
  ...secondaryActionButton,
  justifySelf: "start",
};

const serviceSuggestionGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  maxWidth: "100%",
  minWidth: 0,
  margin: "-2px 0 6px",
};

const serviceSuggestionButton = {
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "999px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-coffee)",
  padding: "9px 11px",
  fontSize: "13px",
  fontWeight: "900",
  minHeight: "44px",
  cursor: "pointer",
  maxWidth: "100%",
  overflowWrap: "anywhere",
};

const serviceSuggestionButtonActive = {
  background: "var(--meetro-surface-sage)",
  borderColor: "rgba(31, 77, 52, 0.28)",
  color: "var(--meetro-color-forest)",
};

const browseAllButton = {
  ...secondaryActionButton,
  justifySelf: "start",
};

const selectedServiceCard = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "6px 12px",
  alignItems: "center",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "18px",
  background: "var(--meetro-surface-warm)",
  padding: "13px",
  maxWidth: "100%",
  minWidth: 0,
};

const selectedServiceLabelText = {
  gridColumn: "1 / -1",
  color: "var(--meetro-color-muted)",
  fontSize: "12px",
  fontWeight: 950,
};

const selectedServiceHelpText = {
  gridColumn: "1 / -1",
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.4,
  fontWeight: 800,
};

const selectedServiceValue = {
  color: "var(--meetro-color-ink)",
  fontSize: "15px",
  lineHeight: 1.25,
  fontWeight: 950,
  minWidth: 0,
  overflowWrap: "normal",
  wordBreak: "normal",
};

const changeServiceButton = {
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "999px",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  padding: "8px 11px",
  fontSize: "13px",
  fontWeight: 950,
  minHeight: "44px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const draftGuidanceCard = {
  display: "grid",
  gap: "8px",
  padding: "13px 14px",
  borderRadius: "16px",
  border: "1px solid rgba(31, 77, 52, 0.18)",
  background: "rgba(240, 249, 244, 0.94)",
  color: "var(--meetro-color-coffee)",
  marginBottom: "12px",
};

const draftGuidanceTitle = {
  display: "block",
  color: "var(--meetro-color-forest)",
  fontSize: "14px",
  fontWeight: 950,
};

const draftGuidanceText = {
  margin: "4px 0 0",
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.4,
  fontWeight: 750,
};

const draftWarningList = {
  listStyle: "none",
  display: "grid",
  gap: "5px",
  margin: 0,
  padding: 0,
};

const draftWarningItem = {
  color: "var(--meetro-color-coffee)",
  fontSize: "12px",
  lineHeight: 1.35,
  fontWeight: 850,
};

const requestReviewIntroCard = {
  display: "grid",
  gap: "4px",
  padding: "12px 13px",
  borderRadius: "16px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-coffee)",
};

const guidedReviewGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: "10px",
};

const guidedReviewPanel = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "8px",
  alignItems: "start",
  padding: "12px",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "14px",
  background: "var(--meetro-surface-warm)",
  minWidth: 0,
};

const requestReviewIntroTitle = {
  color: "var(--meetro-color-forest)",
  fontSize: "14px",
  fontWeight: 950,
};

const requestReviewList = {
  listStyle: "none",
  display: "grid",
  gap: "7px",
  margin: "6px 0 0",
  padding: 0,
};

const requestReviewItem = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.6fr)",
  alignItems: "start",
  gap: "10px",
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.4,
};

const requestReviewValue = {
  color: "var(--meetro-color-ink)",
  textAlign: "right",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
};

const requestReviewMissing = {
  color: "#b42318",
  textAlign: "right",
};

const draftReviewSectionTitle = {
  color: "var(--meetro-color-forest)",
  fontSize: "12px",
  fontWeight: 950,
};

const draftReviewEditButton = {
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "999px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-forest)",
  minHeight: "36px",
  padding: "7px 10px",
  fontSize: "12px",
  fontWeight: 950,
  cursor: "pointer",
};

const fieldErrorText = {
  margin: "-2px 2px 4px",
  color: "#b42318",
  fontSize: "13px",
  fontWeight: 800,
  lineHeight: 1.4,
};

const submissionErrorCard = {
  display: "grid",
  gap: "4px",
  padding: "13px 14px",
  borderRadius: "16px",
  border: "1px solid rgba(180, 35, 24, 0.28)",
  background: "rgba(254, 243, 242, 0.96)",
  color: "#912018",
  fontSize: "14px",
  lineHeight: 1.45,
};

const requestActionBar = {
  position: "relative",
  zIndex: 8,
  display: "grid",
  gap: "8px",
  marginTop: "14px",
  marginBottom: "18px",
  padding: "10px",
  borderRadius: "18px",
  border: "1px solid var(--meetro-color-line)",
  background: "rgba(255, 253, 248, 0.92)",
  boxShadow: "0 14px 32px rgba(15,23,42,0.10)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "140px",
  resize: "vertical",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
  lineHeight: 1.45,
  maxHeight: "70dvh",
  overflowY: "auto",
};

const compactTextareaStyle = {
  ...textareaStyle,
  minHeight: "96px",
  maxHeight: "34dvh",
};

const uploadBox = {
  border: "1px dashed var(--meetro-color-line)",
  borderRadius: "22px",
  padding: "20px",
  textAlign: "center",
  background: "var(--meetro-surface-warm)",
  maxWidth: "100%",
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
  backdropFilter: "blur(12px)",
};

const plusUploadButton = {
  width: "54px",
  height: "54px",
  borderRadius: "18px",
  border: "none",
  background: "var(--meetro-gradient-community-action)",
  color: "#fffdf8",
  fontSize: "30px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(31, 77, 52, 0.18)",
};

const disabledUploadButton = {
  background: "rgba(148,163,184,0.35)",
  color: "var(--meetro-color-muted)",
  cursor: "not-allowed",
  boxShadow: "none",
};

const uploadText = {
  marginTop: "14px",
  marginBottom: "4px",
  color: "var(--meetro-color-ink)",
  fontWeight: "900",
};

const uploadSubText = {
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "14px",
};

const uploadingText = {
  marginTop: "10px",
  color: "var(--meetro-color-forest)",
  fontWeight: "bold",
};

const previewBox = {
  display: "grid",
  gap: "12px",
  maxWidth: "100%",
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
};

const photoPreviewStrip = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  overflowX: "hidden",
  paddingBottom: "6px",
  maxWidth: "100%",
  minWidth: 0,
};

const photoPreviewItem = {
  position: "relative",
  flexShrink: 0,
  display: "grid",
  gap: "8px",
  width: "120px",
};

const previewImage = {
  width: "120px",
  height: "120px",
  borderRadius: "22px",
  objectFit: "cover",
  border: "1px solid var(--meetro-color-line)",
};

const removePhotoButton = {
  position: "absolute",
  top: "8px",
  right: "8px",
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  border: "none",
  background: "rgba(239,68,68,0.95)",
  color: "white",
  fontSize: "20px",
  fontWeight: "900",
  cursor: "pointer",
};

const photoOrderControls = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
};

const photoOrderButton = {
  width: "100%",
  minWidth: 0,
  height: "44px",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "12px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-forest)",
  fontSize: "20px",
  fontWeight: "900",
  cursor: "pointer",
};

const disabledPhotoOrderButton = {
  opacity: 0.4,
  cursor: "not-allowed",
};

const photoCountText = {
  margin: 0,
  color: "var(--meetro-color-forest)",
  fontWeight: "900",
  fontSize: "13px",
};


const cancelRequestButton = {
  width: "100%",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "18px",
  padding: "13px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-muted)",
  fontWeight: "900",
  fontSize: "15px",
  marginTop: "8px",
  cursor: "pointer",
};

const primaryButton = {
  border: "none",
  color: "#fffdf8",
  padding: "15px",
  borderRadius: "18px",
  fontWeight: "900",
  fontSize: "15px",
  background: "var(--meetro-gradient-community-action)",
  boxShadow: "0 14px 30px rgba(31, 77, 52, 0.18)",
};

export default Upload;
