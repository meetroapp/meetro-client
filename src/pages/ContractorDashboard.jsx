import { useEffect, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import FloatingBackButton from "../components/FloatingBackButton";
import { t as translate } from "../utils/language";
import { getNotifications } from "../utils/notifications";
import { canBusinessSeeCategory, inferEmergencyCategory } from "../utils/categoryRouting";
import { getActiveJobSnapshot } from "../utils/workCenter";

function ContractorDashboard({ setPage, language = "en" }) {
  const activeJobSnapshot = getActiveJobSnapshot();
  const userRole = localStorage.getItem("businessCategory") || "Handyman";
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState(
    localStorage.getItem("meetroWorkCenterTab") || "pending"
  );
  const [completedFilter, setCompletedFilter] = useState("all");
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [scheduleDeleteTarget, setScheduleDeleteTarget] = useState(null);
  const [scheduleForm, setScheduleForm] = useState(() => {
    const selectedLead = JSON.parse(
      localStorage.getItem("selectedWorkCenterRequest") || "null"
    );

    return {
      appointmentType: "walkthrough",
      title:
        selectedLead?.title ||
        selectedLead?.service ||
        "",
      date: new Date().toISOString().slice(0, 10),
      time: "12:00",
      location:
        selectedLead?.location ||
        selectedLead?.address ||
        "",
      notes:
        selectedLead?.description ||
        "",
    };
  });

  const [materialsDraft, setMaterialsDraft] = useState("");
  const [materialsAiSuggestion, setMaterialsAiSuggestion] = useState("");
  const [materialsCatalogMatches, setMaterialsCatalogMatches] = useState([]);
  const [materialsSearch, setMaterialsSearch] = useState("");
  const [materialDeleteTarget, setMaterialDeleteTarget] = useState(null);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [showManualMaterials, setShowManualMaterials] = useState(false);
  const [isListeningMaterials, setIsListeningMaterials] = useState(false);
  const materialsRecognitionRef = useRef(null);

  const [materialForm, setMaterialForm] = useState({
    title: "",
    quantity: "1",
    provider: "customer",
    status: "needed",
  });
  const activeLanguage = language;

  useEffect(() => {
    function syncEmergency() {
      setRefreshKey((prev) => prev + 1);
    }

    window.addEventListener("meetroEmergencyConversationUpdated", syncEmergency);
    window.addEventListener("meetro-active-work-updated", syncEmergency);
    window.addEventListener("storage", syncEmergency);

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

  function toggleMaterialsMic() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        activeLanguage === "es"
          ? "El micrófono no está disponible en este navegador. Intenta con Chrome o Safari."
          : "Microphone dictation is not available in this browser. Try Chrome or Safari."
      );
      return;
    }

    if (isListeningMaterials && materialsRecognitionRef.current) {
      materialsRecognitionRef.current.stop();
      setIsListeningMaterials(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = activeLanguage === "es" ? "es-US" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListeningMaterials(true);
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
      setIsListeningMaterials(false);

      alert(
        activeLanguage === "es"
          ? `Error del micrófono: ${event.error || "permiso denegado"}`
          : `Microphone error: ${event.error || "permission denied"}`
      );
    };

    recognition.onend = () => {
      setIsListeningMaterials(false);
    };

    materialsRecognitionRef.current = recognition;
    recognition.start();
  }

  function getActiveWorkContext() {
    return {
      id:
        localStorage.getItem("activeWorkRequestId") ||
        activeJobSnapshot?.jobId ||
        localStorage.getItem("activeJobId") ||
        localStorage.getItem("activeWorkQuoteId") ||
        localStorage.getItem("activeWorkConversationId") ||
        "",
      service:
        localStorage.getItem("activeWorkService") ||
        activeJobSnapshot?.service ||
        localStorage.getItem("activeJobService") ||
        "",
      location:
        localStorage.getItem("activeWorkLocation") ||
        activeJobSnapshot?.location ||
        localStorage.getItem("activeJobLocation") ||
        "",
      type:
        localStorage.getItem("activeWorkType") ||
        localStorage.getItem("activeWorkSource") ||
        "",
      stage:
        localStorage.getItem("activeWorkStage") ||
        activeJobSnapshot?.status ||
        localStorage.getItem("activeJobStatus") ||
        "",
    };
  }

  function openWorkTab(tab) {
    localStorage.setItem("meetroWorkCenterTab", tab);
    localStorage.setItem("activeWorkCenterTab", tab);
    setActiveTab(tab);
  }

  function getActiveMaterialsKey() {
    const activeProjectId =
      localStorage.getItem("activeWorkRequestId") ||
      activeJobSnapshot?.jobId ||
      localStorage.getItem("activeJobId") ||
      localStorage.getItem("activeWorkQuoteId") ||
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
        activeLanguage === "es"
          ? "Describe los materiales que faltan o usa el micrófono del teléfono para dictarlos."
          : "Describe the missing materials or use your phone microphone to dictate them."
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
      supplier: activeLanguage === "es" ? "No confirmado" : "Not confirmed",
      keywords: [item],
      customItem: true,
    }));

    const suggestions = matchedCatalogItems.length
      ? matchedCatalogItems
      : fallbackItems;

    setMaterialsCatalogMatches(suggestions);

    setMaterialsAiSuggestion(
      matchedCatalogItems.length
        ? activeLanguage === "es"
          ? `${matchedCatalogItems.length} materiales encontrados en el catálogo. Revisa y agrega los correctos al proyecto.`
          : `${matchedCatalogItems.length} catalog materials found. Review and add the correct items to the project.`
        : activeLanguage === "es"
        ? "No se encontró una coincidencia exacta en el catálogo. Se prepararon opciones personalizadas para revisar."
        : "No exact catalog match found. Custom review items were prepared."
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
      jobService: localStorage.getItem("activeWorkService") || "",
      jobLocation: localStorage.getItem("activeWorkLocation") || "",
      activeWorkRequestId: localStorage.getItem("activeWorkRequestId") || "",
      activeWorkQuoteId: localStorage.getItem("activeWorkQuoteId") || "",
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      getActiveMaterialsKey(),
      JSON.stringify([newMaterial, ...currentMaterials])
    );

    localStorage.setItem("activeWorkStage", "pausedMaterials");
    localStorage.setItem("activeWorkPauseReason", "materials");

    setMaterialsAiSuggestion(
      activeLanguage === "es"
        ? `${material.title} agregado a la lista de materiales del proyecto.`
        : `${material.title} added to this project's materials list.`
    );

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
      jobService: localStorage.getItem("activeWorkService") || "",
      jobLocation: localStorage.getItem("activeWorkLocation") || "",
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
        ? activeLanguage === "es"
          ? "Material actualizado."
          : "Material updated."
        : activeLanguage === "es"
        ? "Material guardado y trabajo pausado por materiales."
        : "Material saved and job paused for materials."
    );

    window.dispatchEvent(
      new Event("meetro-active-work-updated")
    );

    setRefreshKey((prev) => prev + 1);
  }

  function resetScheduleForm() {
    setScheduleForm({
      title: "",
      date: new Date().toISOString().slice(0, 10),
      time: "12:00",
      location: "",
      notes: "",
    });
    setEditingScheduleId(null);
    setShowScheduleForm(false);
  }

  function normalizeScheduleTime(value) {
    if (!value) return "12:00";
    if (value.includes("AM") || value.includes("PM")) return value;
    return value;
  }

  function formatScheduleTime(value) {
    if (!value) return translate("timeTbd");
    if (value.includes("AM") || value.includes("PM")) return value;

    const [rawHour, minute = "00"] = value.split(":");
    const hourNumber = Number(rawHour);
    if (Number.isNaN(hourNumber)) return value;

    const suffix = hourNumber >= 12 ? "PM" : "AM";
    const hour12 = hourNumber % 12 || 12;
    return `${hour12}:${minute} ${suffix}`;
  }

  function getScheduleStatusLabel(status) {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "completed") return translate("completed");
    if (normalized === "scheduled") return translate("scheduled");

    return status || translate("scheduled");
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
    ];
  }

  function getScheduleAppointmentMeta(type) {
    return (
      getScheduleAppointmentOptions().find((option) => option.value === type) ||
      getScheduleAppointmentOptions()[0]
    );
  }


  function saveManualScheduleVisit() {
    const schedule = JSON.parse(
      localStorage.getItem("meetro_business_schedule") || "[]"
    );

    const appointmentMeta = getScheduleAppointmentMeta(
      scheduleForm.appointmentType || "walkthrough"
    );

    const newVisit = {
      id: editingScheduleId || `schedule-${Date.now()}`,
      appointmentType: scheduleForm.appointmentType || "walkthrough",
      appointmentLabel: appointmentMeta.label,
      workflowStage: "scheduling",
      workflowStatus: appointmentMeta.title,
      title: scheduleForm.title || appointmentMeta.title || translate("scheduledVisit"),
      date: scheduleForm.date,
      time: normalizeScheduleTime(scheduleForm.time),
      location: scheduleForm.location || translate("customerLocation"),
      notes: scheduleForm.notes,
      status:
        schedule.find((item) => item.id === editingScheduleId)?.status ||
        "scheduled",
      source:
        schedule.find((item) => item.id === editingScheduleId)?.source ||
        "manual",
      createdAt:
        schedule.find((item) => item.id === editingScheduleId)?.createdAt ||
        new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedSchedule = editingScheduleId
      ? schedule.map((item) => (item.id === editingScheduleId ? newVisit : item))
      : [newVisit, ...schedule];

    localStorage.setItem(
      "meetro_business_schedule",
      JSON.stringify(updatedSchedule)
    );

    const conversationId =
      localStorage.getItem("activeWorkConversationId") ||
      localStorage.getItem("activeConversationId") ||
      "";

    if (!editingScheduleId && conversationId) {
      const storageKey = `meetro_conversation_${conversationId}`;
      const existingMessages = JSON.parse(
        localStorage.getItem(storageKey) || "[]"
      );

      const scheduleMessage = {
        id: Date.now(),
        sender: "business",
        role: "business",
        type: "schedule",
        workflowSource: "work-center-schedule",
        conversationId,
        text:
          activeLanguage === "es"
            ? `📅 ${newVisit.appointmentLabel}: ${newVisit.title} — ${newVisit.date} a las ${newVisit.time}.`
            : `📅 ${newVisit.appointmentLabel}: ${newVisit.title} — ${newVisit.date} at ${newVisit.time}.`,
        schedule: newVisit,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(
        storageKey,
        JSON.stringify([...existingMessages, scheduleMessage])
      );

      window.dispatchEvent(new Event("meetro-messages-updated"));
    }

    resetScheduleForm();
    setRefreshKey((prev) => prev + 1);
  }

  function startEditScheduleVisit(item) {
    setEditingScheduleId(item.id);
    setScheduleForm({
      title: item.title || "",
      date: item.date || new Date().toISOString().slice(0, 10),
      time: item.time && item.time.includes("AM") ? "12:00" : item.time || "12:00",
      location: item.location || "",
      notes: item.notes || "",
    });
    setShowScheduleForm(true);
  }

  function markScheduleCompleted(item) {
    const schedule = JSON.parse(
      localStorage.getItem("meetro_business_schedule") || "[]"
    );

    const updatedSchedule = schedule.map((visit) =>
      visit.id === item.id
        ? { ...visit, status: "Completed", completedAt: new Date().toISOString() }
        : visit
    );

    localStorage.setItem(
      "meetro_business_schedule",
      JSON.stringify(updatedSchedule)
    );

    setRefreshKey((prev) => prev + 1);
  }

  function confirmDeleteScheduleVisit() {
    if (!scheduleDeleteTarget) return;

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

    setScheduleDeleteTarget(null);
    setRefreshKey((prev) => prev + 1);
  }

  const selectedService =
    localStorage.getItem("selectedEmergencyService") || "";

  const dispatchStatus =
    localStorage.getItem("emergencyDispatchStatus") || "";

  const storedCompletedJobsCount =
    Number(localStorage.getItem("completedJobsCount") || "0");

  const quoteHistory = JSON.parse(
    localStorage.getItem("workCenterQuoteHistory") || "[]"
  );

  const acceptedQuoteHistoryAlerts = quoteHistory.filter(
    (quote) =>
      !quote.movedToActiveAt &&
      quote.status === "accepted"
  ).length;

  const revisionQuoteAlerts = quoteHistory.filter(
    (quote) =>
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

  const storedTotalJobRevenue =
    Number(localStorage.getItem("totalJobRevenue") || "0");

  const businessCategory =
    localStorage.getItem("businessCategory") || "";

  const emergencyCategory =
    localStorage.getItem("selectedEmergencyCategory") ||
    inferEmergencyCategory(selectedService);

  const canBusinessSeeEmergency =
    canBusinessSeeCategory(businessCategory, emergencyCategory);

  const homeownerRequests = JSON.parse(
    localStorage.getItem("homeownerRequests") || "[]"
  );

  const savedCompletedProjects = JSON.parse(
    localStorage.getItem("completedProjects") || "[]"
  );

  const completedHomeownerProjects = homeownerRequests
    .filter((project) => project.status === "completed")
    .map((project) => ({
      ...project,
      revenue:
        project.revenue ||
        project.acceptedQuote?.amount ||
        project.quoteAmount ||
        0,
      source: "homeownerProject",
    }));

  const completedScheduleProjects = JSON.parse(
    localStorage.getItem("meetro_business_schedule") || "[]"
  )
    .filter((item) => item.status === "Completed")
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
        !savedCompletedProjects.some(
          (saved) =>
            (saved.requestId || saved.id) ===
            (project.requestId || project.id)
        )
    ),
  ];

  const completedProjectsRevenue = completedProjects.reduce(
    (sum, project) =>
      sum +
      Number(
        project.revenue ||
          project.acceptedQuote?.amount ||
          project.quoteAmount ||
          0
      ),
    0
  );

  const completedJobsCount =
    completedProjects.length > 0
      ? completedProjects.length
      : storedCompletedJobsCount;

  const totalJobRevenue =
    completedProjects.length > 0
      ? completedProjectsRevenue
      : storedTotalJobRevenue;

  const averageJobValue =
    Number(completedJobsCount) > 0
      ? Math.round(Number(totalJobRevenue) / Number(completedJobsCount))
      : 0;

  const pendingProjectRequests = homeownerRequests.filter(
    (request) =>
      request &&
      request.status !== "cancelled" &&
      request.status !== "completed" &&
      request.status !== "closed" &&
      request.status !== "declined"
  );

  const hasPendingRequest =
    selectedService &&
    canBusinessSeeEmergency &&
    dispatchStatus === "pending";

  const hasJobStatus =
    selectedService &&
    canBusinessSeeEmergency &&
    ["accepted", "enroute", "arrived", "started", "completed", "cancelled"].includes(
      dispatchStatus
    );

  const canOpenDispatch =
    ["accepted", "enroute", "arrived", "started"].includes(dispatchStatus);

  const activeJobs = hasJobStatus
    ? [
        {
          id: "emergency-active-1",
          service: selectedService,
          status: dispatchStatus,
          eta: dispatchStatus === "completed" ? "0" : "12",
          customer:
            activeLanguage === "es"
              ? "Propietario esperando actualización"
              : "Homeowner waiting for update",
        },
      ]
    : [];

  function acceptEmergencyRequest() {
    localStorage.setItem("emergencyDispatchStatus", "accepted");
    localStorage.setItem("activeJobStatus", "accepted");
    localStorage.removeItem("emergencyNeedsReview");
    localStorage.removeItem("emergencyCompletedAt");
    localStorage.removeItem("activeCompletionJob");

    localStorage.setItem(
      "activeProfessionalId",
      localStorage.getItem("businessName") || "Professional"
    );

    localStorage.setItem("businessAcceptedEmergency", "true");

    window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));

    setWorkCenterReturn();
setPage("emergencyDispatch");
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
      requested: activeLanguage === "es" ? "Solicitado" : "Requested",
      review: activeLanguage === "es" ? "En revisión" : "Review",
      scheduled: activeLanguage === "es" ? "Programado" : "Scheduled",
      quote_required: activeLanguage === "es" ? "Requiere cotización" : "Quote needed",
      quote_sent: activeLanguage === "es" ? "Cotización enviada" : "Quote sent",
      quote_approved: activeLanguage === "es" ? "Cotización aprobada" : "Quote approved",
      active: activeLanguage === "es" ? "Activo" : "Active",
      on_the_way: activeLanguage === "es" ? "En camino" : "On the way",
      arrived: activeLanguage === "es" ? "Llegó" : "Arrived",
      working: activeLanguage === "es" ? "Trabajando" : "Working",
      paused_materials: activeLanguage === "es" ? "Pausado por materiales" : "Paused: Materials",
      waiting_customer: activeLanguage === "es" ? "Esperando cliente" : "Waiting customer",
      completed: activeLanguage === "es" ? "Completado" : "Completed",
      cancelled: activeLanguage === "es" ? "Cancelado" : "Cancelled",
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
    const conversationId = `active-job-${jobId}`;

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

    localStorage.setItem(
      "selectedActiveProject",
      JSON.stringify({
        ...job,
        id: jobId,
        conversationId,
        source: job.source || "activeJob",
        project: {
          ...(job.project || job),
          id: jobId,
          conversationId,
        },
      })
    );
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

  function saveCompletedJobContext(job) {
    localStorage.setItem("completedJobType", job[0]);
    localStorage.setItem("completedJobService", job[1]);
    localStorage.setItem("completedJobCustomer", job[2]);
    localStorage.setItem("completedJobLocation", job[3]);
    localStorage.setItem("completedJobDate", job[4]);
    localStorage.setItem("completedJobTime", job[5]);
    localStorage.setItem("completedJobAmount", job[6]);
  }

  return (
    <div style={page}>
      <style>
        {`
          .revenue-spark span {
            flex: 1;
            border-radius: 999px;
            background: rgba(91,61,245,0.35);
            display: block;
          }
        `}
      </style>
      <div style={topBar}>
        <FloatingBackButton onClick={() => setPage("businessDashboard")} />

        <div style={availabilityPill}>{translate("activeNow")}</div>
      </div>

      <div style={header}>
        <h1 style={title}>{t.title}</h1>
        <p style={subtitle}>{t.subtitle}</p>
      </div>

      <div style={rolePill}>
        {translate("service")}: {String(userRole).toLowerCase() === "handyman" ? translate("handymanLabel") : userRole}
      </div>

      <div style={overviewGrid}>
        <div style={overviewCard}>
          <div style={overviewIcon}>🚨</div>

          <strong style={overviewTitle}>
            {translate("liveDispatch")}
          </strong>

          <p style={overviewText}>
            {hasJobStatus
              ? selectedService === "Emergency Plumbing"
                ? translate("emergencyPlumbing")
                : selectedService
              : translate("noActiveService")}
          </p>

          <div style={miniPill}>
            {getStatusLabel() || translate("noStatus")}
          </div>

          <div style={progressWrap}>
            <div style={progressDots}>
              <span style={progressActive}>●</span>
              <span>────</span>
              <span>{["accepted","enroute","arrived","started","completed"].includes(dispatchStatus) ? "●" : "○"}</span>
              <span>────</span>
              <span>{["arrived","started","completed"].includes(dispatchStatus) ? "●" : "○"}</span>
              <span>────</span>
              <span>{["started","completed"].includes(dispatchStatus) ? "●" : "○"}</span>
              <span>────</span>
              <span>{["completed"].includes(dispatchStatus) ? "●" : "○"}</span>
            </div>

            <div style={progressLabels}>
              <span>{language === "es" ? "Aceptado" : translate("acceptedShort")}</span>
              <span>{language === "es" ? "En Camino" : translate("enRouteShort")}</span>
              <span>{language === "es" ? "Llegó" : translate("arrivedShort")}</span>
              <span>{language === "es" ? "Iniciado" : translate("startedShort")}</span>
              <span>{language === "es" ? "Completo" : translate("completeShort")}</span>
            </div>
          </div>

          {canOpenDispatch && (
            <button
              style={miniButton}
              onClick={() => {
                const emergencyJob = {
                  id: "emergency-active-1",
                  service: selectedService,
                  status: dispatchStatus,
                  eta: dispatchStatus === "completed" ? "0" : "12",
                  customer:
                    activeLanguage === "es"
                      ? "Propietario esperando actualización"
                      : "Homeowner waiting for update",
                };

                saveActiveJobContext(emergencyJob);
                setWorkCenterReturn();
setPage("emergencyDispatch");
              }}
            >
              {t.openDispatch}
            </button>
          )}
        </div>

        <div style={overviewCard}>
          <div style={overviewIcon}>📊</div>

          <strong style={overviewTitle}>
            {translate("workSummary")}
          </strong>

          <p style={overviewText}>
            {(completedJobsCount)}
            {" "}
            {translate("completedJobs")}
          </p>

          <p style={overviewText}>
            ${(totalJobRevenue)}
            {" "}
            {translate("weeklyRevenue")}
          </p>

          <p style={overviewText}>
            {hasJobStatus ? "1" : "0"}
            {" "}
            {translate("activeJobsCount")}
          </p>
        </div>
      </div>

      <div style={workTabs}>
        <button
          style={activeTab === "schedule" ? workTabActive : workTab}
          onClick={() => openWorkTab("schedule")}
        >
          {translate("schedule")}
        </button>

        <button
          style={{
            ...(activeTab === "pending" ? workTabActive : workTab),
            ...(pendingAlertsCount > 0 && activeTab !== "pending"
              ? operationalAlertTab
              : {}),
          }}
          onClick={() => openWorkTab("pending")}
        >
          <span>{translate("workTabPending")}</span>

          {pendingAlertsCount > 0 && (
            <span style={quoteAlertBadge}>
              {pendingAlertsCount}
            </span>
          )}
        </button>

        <button
          style={{
            ...(activeTab === "quotes" ? workTabActive : workTab),
            ...(totalQuoteAlerts > 0 && activeTab !== "quotes"
              ? quoteAlertTab
              : {}),
          }}
          onClick={() => openWorkTab("quotes")}
        >
          <span>{translate("workTabQuotes")}</span>

          {totalQuoteAlerts > 0 && (
            <span style={quoteAlertBadge}>
              {totalQuoteAlerts}
            </span>
          )}
        </button>

        <button
          style={{
            ...(activeTab === "active" ? workTabActive : workTab),
            ...(activeJobsAlertCount > 0 && activeTab !== "active"
              ? operationalLiveTab
              : {}),
          }}
          onClick={() => openWorkTab("active")}
        >
          <span>{translate("workTabActive")}</span>

          {activeJobsAlertCount > 0 && (
            <span style={liveTabBadge}>
              LIVE
            </span>
          )}
        </button>

        <button
          style={{
            ...(activeTab === "materials" ? workTabActive : workTab),
            ...(materialsAlertCount > 0 && activeTab !== "materials"
              ? materialsAlertTab
              : {}),
          }}
          onClick={() => openWorkTab("materials")}
        >
          <span>{translate("workTabMaterials")}</span>

          {materialsAlertCount > 0 && (
            <span style={quoteAlertBadge}>
              {materialsAlertCount}
            </span>
          )}
        </button>

        <button
          style={activeTab === "records" ? workTabActive : workTab}
          onClick={() => openWorkTab("records")}
        >
          🗂️ {activeLanguage === "es"
            ? "Registros"
            : "Project Records"}
        </button>

        <button
          style={activeTab === "completed" ? workTabActive : workTab}
          onClick={() => openWorkTab("completed")}
        >
          {translate("workTabCompleted")}
        </button>

        <button
          style={activeTab === "revenue" ? workTabActive : workTab}
          onClick={() => openWorkTab("revenue")}
        >
          {translate("workTabRevenue")}
        </button>
      </div>

      <div style={activeTab === "revenue" ? tabNoticeHidden : tabNotice}>
        {activeTab === "schedule" &&
          translate("workGuidanceSchedule")}

        {activeTab === "pending" &&
          translate("workGuidancePending")}

        {activeTab === "active" &&
          translate("workGuidanceActive")}

        {activeTab === "completed" &&
          translate("workGuidanceCompleted")}

        {activeTab === "quotes" &&
          translate("workGuidanceQuotes")}

        {activeTab === "materials" &&
          translate("workGuidanceMaterials")}

        {activeTab === "records" &&
          (activeLanguage === "es"
            ? "Historial operativo permanente de proyectos, materiales, cambios y documentación."
            : "Permanent operating history for projects, materials, changes, and documentation.")}

        {activeTab === "revenue" &&
          translate("workGuidanceRevenue")}
      </div>

      {["pending", "active", "materials", "records", "quotes"].includes(activeTab) && (() => {
        const activeContext = getActiveWorkContext();

        if (!activeContext.id && !activeContext.service) return null;

        return (
          <div style={activeProjectContextCard}>
            <div>
              <span style={activeProjectContextLabel}>
                {activeLanguage === "es" ? "Proyecto activo" : "Active Project"}
              </span>

              <h3 style={activeProjectContextTitle}>
                {activeContext.service ||
                  (activeLanguage === "es" ? "Trabajo activo" : "Active Work")}
              </h3>

              <p style={activeProjectContextMeta}>
                {activeContext.location ||
                  (activeLanguage === "es"
                    ? "Ubicación no asignada"
                    : "No location assigned")}
              </p>
            </div>

            <div style={activeProjectContextStatus}>
              {getWorkflowStageLabel(activeContext.stage || activeContext.type || "review")}
            </div>
          </div>
        );
      })()}

      {activeTab === "schedule" && (
        <div style={section}>
          <div style={sectionHeaderRow}>
            <h2 style={sectionTitle}>
              {translate("workSchedule")}
            </h2>

            <button
              style={smallPrimaryButton}
              onClick={() => {
                if (showScheduleForm) {
                  resetScheduleForm();
                } else {
                  setShowScheduleForm(true);
                }
              }}
            >
              {showScheduleForm
                ? translate("closeForm")
                : `+ ${translate("addAppointment")}`}
            </button>
          </div>

          {showScheduleForm && (
            <div style={scheduleFormCard}>
              <select
                style={scheduleInput}
                value={scheduleForm.appointmentType || "walkthrough"}
                onChange={(e) => {
                  const nextMeta = getScheduleAppointmentMeta(e.target.value);
                  setScheduleForm({
                    ...scheduleForm,
                    appointmentType: e.target.value,
                    title: scheduleForm.title || nextMeta.title,
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
                placeholder={translate("appointmentTitle")}
                value={scheduleForm.title}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, title: e.target.value })
                }
              />

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
                placeholder={translate("customerLocation")}
                value={scheduleForm.location}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, location: e.target.value })
                }
              />

              <textarea
                style={scheduleTextarea}
                placeholder={translate("scheduleNotes")}
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
                  {activeLanguage === "es"
                    ? "Entrada manual de calendario"
                    : translate("manualScheduleEntry")}
                </strong>

                <p style={manualScheduleNoticeText}>
                  {activeLanguage === "es"
                    ? translate("manualScheduleNotice")
                    : translate("manualScheduleNotice")}
                </p>
              </div>
            </div>
          )}

          {(() => {
            const scheduleItems = JSON.parse(
              localStorage.getItem("meetro_business_schedule") || "[]"
            );

            return scheduleItems.length === 0 ? (
              <div style={emptyCard}>
                <div style={emptyIcon}>📅</div>

                <strong>
                  {activeLanguage === "es"
                    ? translate("noScheduledVisits")
                    : translate("noScheduledVisits")}
                </strong>

                <p style={emptyText}>
                  {activeLanguage === "es"
                    ? translate("scheduledVisitsFromChat")
                    : translate("scheduledVisitsFromChat")}
                </p>
              </div>
            ) : (
              <div style={activeJobsList}>
                {scheduleItems.map((item) => (
                  <div key={item.id} style={jobCard}>
                    <div style={scheduleCardTop}>
                      <div style={scheduleTimeBlock}>
                        <strong>{formatScheduleTime(item.time)}</strong>
                        <span>{item.date || translate("today")}</span>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong>{item.title}</strong>
                        <p style={jobMeta}>
                          {item.location || "Customer location"}
                        </p>

                        {item.notes && <p style={jobMeta}>{item.notes}</p>}

                        <div style={scheduleSourceRow}>
                          <span style={sourcePill}>
                            {item.source === "chat-message"
                              ? activeLanguage === "es"
                                ? "Desde chat"
                                : "From Chat"
                              : item.source === "manual"
                              ? activeLanguage === "es"
                                ? "Manual"
                                : "Manual"
                              : item.source || translate("schedule")}
                          </span>

                          <span style={item.status === "Completed" ? completedPill : statusPill}>
                            {getScheduleStatusLabel(item.status)}
                          </span>
                        </div>

                        {(!item.conversationId && !item.requestId && !item.projectConversationId) && (
                          <div style={manualScheduleCardNotice}>
                            <div>
                              ⚠️ {activeLanguage === "es"
                                ? "Cliente manual: no tiene chat, registros automáticos, AI ni flujo completo hasta convertirlo en proyecto Meetro."
                                : translate("manualCustomerWarning")}
                            </div>

                            <button
                              style={manualScheduleHelpButton}
                              onClick={() => {
                                localStorage.setItem(
                                  "selectedManualScheduleCustomer",
                                  JSON.stringify(item)
                                );

                                alert(
                                  activeLanguage === "es"
                                    ? translate("manualCustomerConnectSteps")
                                    : translate("manualCustomerConnectSteps")
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
                            setPage("conversationThread");
                          }}
                        >
                          {translate("openChat")}
                        </button>
                      )}

                      <button
                        style={secondaryScheduleBtn}
                        onClick={() => startEditScheduleVisit(item)}
                      >
                        {translate("edit")}
                      </button>

                      {item.status !== "Completed" && (
                        <>
                          <button
                            style={startScheduleBtn}
                            onClick={() => {
                              const workflowConversationId =
                                item.projectConversationId ||
                                item.conversationId ||
                                item.requestId ||
                                "";

                              localStorage.setItem("pendingWorkStatus", "review");
                              localStorage.setItem("pendingWorkType", item.appointmentType || "scheduled");
                              localStorage.setItem("pendingWorkWorkflowStage", item.workflowStage || "scheduling");
                              localStorage.setItem("pendingWorkWorkflowStatus", item.workflowStatus || item.status || "scheduled");
                              localStorage.setItem("pendingWorkSource", item.source || "schedule");
                              localStorage.setItem("pendingWorkService", item.title || translate("scheduledVisit"));
                              localStorage.setItem("pendingWorkLocation", item.location || "");
                              localStorage.setItem("pendingWorkConversationId", workflowConversationId);
                              localStorage.setItem("pendingWorkScheduleId", item.id || "");
                              localStorage.setItem("pendingWorkReason", "schedule_review");

                              if (workflowConversationId) {
                                localStorage.setItem("activeConversationId", workflowConversationId);
                                localStorage.setItem("meetroConversationType", "standard");
                              }

                              openWorkTab("pending");
                              setRefreshKey((prev) => prev + 1);
                            }}
                          >
                            {activeLanguage === "es" ? "Preparar trabajo" : "Prepare Job"}
                          </button>

                          <button
                            style={completeScheduleBtn}
                            onClick={() => markScheduleCompleted(item)}
                          >
                            {activeLanguage === "es" ? "Completar" : "Complete"}
                          </button>
                        </>
                      )}

                      <button
                        style={deleteScheduleBtn}
                        onClick={() => setScheduleDeleteTarget(item)}
                      >
                        {translate("delete")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {scheduleDeleteTarget && (
            <div style={confirmOverlay}>
              <div style={confirmCard}>
                <h3>
                  {translate("deleteVisit")}
                </h3>

                <p>
                  {activeLanguage === "es"
                    ? "Esta acción quitará la visita de tu agenda."
                    : "This will remove the visit from your schedule."}
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
        <h2 style={sectionTitle}>{translate("requests")}</h2>

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
                <div style={pendingReviewIcon}>🧭</div>

                <div>
                  <strong style={pendingReviewTitle}>
                    {activeLanguage === "es"
                      ? "Revisión operativa pendiente"
                      : "Pending operational review"}
                  </strong>

                  <p style={pendingReviewMeta}>
                    {pendingWorkService || (activeLanguage === "es" ? "Trabajo programado" : "Scheduled job")}
                  </p>

                  {pendingWorkLocation && (
                    <p style={pendingReviewLocation}>
                      📍 {pendingWorkLocation}
                    </p>
                  )}
                </div>
              </div>

              <div style={pendingReviewNotice}>
                {activeLanguage === "es"
                  ? "Este trabajo fue enviado desde Agenda. Antes de activarlo, confirma si requiere cotización, materiales, depósito o aprobación del cliente."
                  : "This job was sent from Schedule. Before activating it, confirm whether it needs a quote, materials, deposit, or customer approval."}
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
                    💬 {activeLanguage === "es" ? "Abrir chat" : "Open Chat"}
                  </button>
                )}

                <button
                  style={pendingSecondaryButton}
                  onClick={() => {
                    localStorage.setItem("meetroCommandTool", "quotes");
                    openWorkTab("quotes");
                  }}
                >
                  🧾 {translate("createQuote")}
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

                    localStorage.setItem("activeWorkService", pendingWorkService);
                    localStorage.setItem("activeWorkLocation", pendingWorkLocation);
                    localStorage.setItem("activeWorkConversationId", pendingWorkConversationId);
                    localStorage.setItem("activeWorkRequestId", pendingProjectId);
                    localStorage.setItem("activeWorkType", localStorage.getItem("pendingWorkType") || "scheduled");
                    localStorage.setItem("activeWorkSource", localStorage.getItem("pendingWorkSource") || "pending");
                    localStorage.setItem("activeJobService", pendingWorkService);
                    localStorage.setItem("activeJobLocation", pendingWorkLocation);
                    localStorage.setItem("activeJobStatus", "started");

                    localStorage.removeItem("pendingWorkStatus");
                    localStorage.removeItem("pendingWorkReason");

                    openWorkTab("active");
                    setRefreshKey((prev) => prev + 1);
                  }}
                >
                  ✅ {activeLanguage === "es" ? "Activar trabajo" : "Activate Job"}
                </button>
              </div>
            </div>
          );
        })()}

        {!hasPendingRequest && !localStorage.getItem("pendingWorkStatus") ? (
          <div style={emptyCard}>
            <div style={emptyIcon}>📭</div>

            <strong>
              {activeLanguage === "es"
                ? "No hay solicitudes pendientes."
                : "No pending requests right now."}
            </strong>

            <p style={emptyText}>
              {activeLanguage === "es"
                ? "Mientras esperas, revisa tus herramientas rápidas o mantén tu negocio listo para nuevos trabajos."
                : "While you wait, keep your business ready for the next job."}
            </p>

            <div style={emptyActionGrid}>
              <button
                style={emptyActionButton}
                onClick={() => setPage("businessLeads")}
              >
                📥 {activeLanguage === "es" ? "Ver oportunidades" : "View leads"}
              </button>

              <button
                style={emptyActionButton}
                onClick={() => setPage("emergencyBusinessSettings")}
              >
                🚨 {activeLanguage === "es" ? "Configurar emergencia" : "Emergency settings"}
              </button>
            </div>
          </div>
        ) : (
          <div style={requestCard}>
            <div style={liveBadge}>🔴 LIVE EMERGENCY REQUEST</div>

            <div style={requestTop}>
              <div style={emergencyBadge}>🚨</div>

              <div style={{ flex: 1 }}>
                <strong style={requestTitle}>{selectedService === "Emergency Plumbing" ? translate("emergencyPlumbing") : selectedService}</strong>
                <p style={requestLocation}>{t.location}</p>

                <div style={requestMeta}>
                  <span>⚡ {getStatusLabel()}</span>
                  <span>•</span>
                  <span>🏠 {t.homeowner}</span>
                </div>

                <div style={requestTimer}>
                  ⏱ {activeLanguage === "es"
                    ? "Respuesta recomendada: menos de 2 min"
                    : "Recommended response: under 2 min"}
                </div>
              </div>
            </div>

            <div style={buttonGrid}>
              <button style={acceptButton} onClick={acceptEmergencyRequest}>
                {t.accept}
              </button>

              <button style={declineButton} onClick={declineEmergencyRequest}>
                {t.decline}
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {activeTab === "active" && (
        <div style={section}>
          <h2 style={sectionTitle}>{translate("activeJobs")}</h2>

          {(() => {
            const homeownerProjects = JSON.parse(
              localStorage.getItem("homeownerRequests") || "[]"
            );

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
                (job) => job.status !== "completed"
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

            const universalActiveWork = {
              status: localStorage.getItem("activeWorkStatus") || "",
              type: localStorage.getItem("activeWorkType") || "",
              service: localStorage.getItem("activeWorkService") || "",
              location: localStorage.getItem("activeWorkLocation") || "",
              conversationId:
                localStorage.getItem("activeWorkConversationId") || "",
              stage:
                localStorage.getItem("activeWorkStage") || "working",
            };

            return combinedActiveJobs.length === 0 &&
              (!universalActiveWork.status ||
                universalActiveWork.status === "completed") ? (
            <div style={emptyCard}>
              <div style={emptyIcon}>🛠️</div>

              <strong>
                {activeLanguage === "es"
                  ? "No hay trabajos activos ahora."
                  : "No active jobs right now."}
              </strong>

              <p style={emptyText}>
                {activeLanguage === "es"
                  ? "Cuando aceptes una solicitud o programes un trabajo, aparecerá aquí."
                  : "Accepted requests, scheduled jobs, and live dispatches will appear here."}
              </p>

              <div style={emptyActionGrid}>
                <button
                  style={emptyActionButton}
                  onClick={() => openWorkTab("pending")}
                >
                  📥 {activeLanguage === "es" ? "Ver pendientes" : "Check pending"}
                </button>

                <button
                  style={emptyActionButton}
                  onClick={() => setPage("businessLeads")}
                >
                  🔎 {activeLanguage === "es" ? "Buscar oportunidades" : "Find leads"}
                </button>
              </div>
            </div>
          ) : (
            <div style={activeJobList}>
              {pendingChangeOrders.length > 0 && (
                <div style={changeOrderAlertWrap}>
                  {pendingChangeOrders.map((order) => (
                    <div key={order.id} style={changeOrderAlertCard}>
                      <div style={changeOrderAlertTop}>
                        <div>
                          <span style={changeOrderBadge}>
                            🔁 {activeLanguage === "es"
                              ? "Cambio solicitado"
                              : "Change Order Requested"}
                          </span>

                          <h3 style={changeOrderTitle}>
                            {order.projectTitle}
                          </h3>

                          <p style={changeOrderCustomer}>
                            {order.project?.homeownerName ||
                              (activeLanguage === "es"
                                ? "Cliente"
                                : "Customer")}
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
                            ? activeLanguage === "es"
                              ? "Urgente"
                              : "Urgent"
                            : activeLanguage === "es"
                            ? "Normal"
                            : "Normal"}
                        </div>
                      </div>

                      <div style={changeOrderMessageBox}>
                        {order.message}
                      </div>

                      <div style={changeOrderNotice}>
                        ⚠️ {activeLanguage === "es"
                          ? "El proyecto puede requerir precio y cronograma actualizado."
                          : "Project may require revised pricing and timeline."}
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
                          🧾 {activeLanguage === "es"
                            ? "Revisar cambio"
                            : "Review Change"}
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
                              order.projectTitle || "Project Change"
                            );

                            setPage("conversationThread");
                          }}
                        >
                          💬 {activeLanguage === "es"
                            ? "Mensaje"
                            : "Message"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {universalActiveWork.status &&
                universalActiveWork.status !== "completed" && (
                <div style={activeJobPanel}>
                  <div style={activeJobTop}>
                    <div>
                      <span
                        style={
                          universalActiveWork.type === "scheduled"
                            ? scheduledJobBadge
                            : activeJobBadge
                        }
                      >
                        {activeLanguage === "es"
                          ? "Trabajo programado"
                          : translate("scheduledWork")}
                      </span>

                      <h3 style={activeJobTitle}>
                        {universalActiveWork.service || "Active Work"}
                      </h3>

                      <p style={activeJobSub}>
                        {universalActiveWork.location ||
                          (activeLanguage === "es"
                            ? "Ubicación pendiente"
                            : translate("locationPending"))}
                      </p>

                      <div style={jobActivityNote}>
                        {getWorkflowActivityNote(universalActiveWork.stage || "working")}
                      </div>
                    </div>

                    <div style={activeEtaBox}>
                      <strong>
                        {activeLanguage === "es"
                          ? "Activo"
                          : "Active"}
                      </strong>

                      <span>
                        {getWorkflowStageLabel(universalActiveWork.stage || "working")}
                      </span>
                    </div>
                  </div>

                  <div style={stageActions}>
                    <button
                      style={{
                        ...stageButton,
                        ...(universalActiveWork.stage === "onTheWay"
                          ? activeStageButton
                          : {}),
                      }}
                      onClick={() => {
                        localStorage.setItem("activeWorkStage", "onTheWay");
                        localStorage.removeItem("activeWorkPauseReason");
                        setRefreshKey((prev) => prev + 1);
                      }}
                    >
                      🚗 {getWorkflowStageLabel("on_the_way")}
                    </button>

                    {universalActiveWork.stage === "pausedMaterials" && (
                      <button
                        style={resumeWorkButton}
                        onClick={() => {
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
                        ▶️ {translate("resumeWork")}
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
                        localStorage.setItem("activeWorkStage", "arrived");
                        localStorage.removeItem("activeWorkPauseReason");
                        setRefreshKey((prev) => prev + 1);
                      }}
                    >
                      📍 {getWorkflowStageLabel("arrived")}
                    </button>

                    <button
                      style={{
                        ...stageButton,
                        ...(universalActiveWork.stage === "working"
                          ? activeStageButton
                          : {}),
                      }}
                      onClick={() => {
                        localStorage.setItem("activeWorkStage", "working");
                        localStorage.removeItem("activeWorkPauseReason");
                        setRefreshKey((prev) => prev + 1);
                      }}
                    >
                      🛠️ {getWorkflowStageLabel("working")}
                    </button>

                    <button
                      style={{
                        ...stageButton,
                        ...(universalActiveWork.stage === "pausedMaterials"
                          ? pausedStageButton
                          : {}),
                      }}
                      onClick={() => {
                        localStorage.setItem("activeWorkStage", "pausedMaterials");
                        localStorage.setItem("activeWorkPauseReason", "materials");
                        setRefreshKey((prev) => prev + 1);
                      }}
                    >
                      ⏸ {translate("pauseForMaterials")}
                    </button>
                  </div>

                  <div style={jobActions}>
                    <button
                      style={secondaryActionButton}
                      onClick={() => openWorkTab("materials")}
                    >
                      📦 {translate("workTabMaterials")}
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
                        💬 {activeLanguage === "es"
                          ? "Abrir chat"
                          : translate("openChat")}
                      </button>
                    )}

                    <button
                      style={completeButton}
                      onClick={() => {
                        localStorage.setItem(
                          "completionService",
                          universalActiveWork.service || translate("scheduledWork")
                        );
                        localStorage.setItem(
                          "completionLocation",
                          universalActiveWork.location || ""
                        );
                        localStorage.setItem(
                          "completionSource",
                          universalActiveWork.type || "scheduled"
                        );
                        localStorage.setItem(
                          "completionScheduleId",
                          localStorage.getItem("activeWorkScheduleId") || ""
                        );

                        setPage("completionSheet");
                      }}
                    >
                      🧾 {activeLanguage === "es"
                        ? "Crear cierre"
                        : translate("createCompletion")}
                    </button>
                  </div>
                </div>
              )}

              {combinedActiveJobs.map((job) => (
                <div style={activeJobPanel} key={job.id}>
                  <div style={activeJobTop}>
                    <div>
                      <span style={activeJobBadge}>
                        {job.status === "completed"
                          ? translate("completed")
                          : activeLanguage === "es"
                          ? "Trabajo Activo"
                          : "Active Job"}
                      </span>

                      <h3 style={activeJobTitle}>
                        {job.service === "Emergency Plumbing"
                          ? translate("emergencyPlumbing")
                          : job.service}
                      </h3>

                      <p style={activeJobSub}>{job.customer}</p>

                      <div style={jobActivityNote}>
                        {job.source === "homeownerProject"
                          ? translate("workflowNoteReview")
                          : getWorkflowActivityNote(job.status || "active")}
                      </div>
                    </div>

                    <div style={activeEtaBox}>
                      {job.source === "homeownerProject" ? (
                        <>
                          <strong>
                            {getWorkflowStageLabel(job.status || "active")}
                          </strong>

                          <span>
                            {activeLanguage === "es"
                              ? "Estado"
                              : "Status"}
                          </span>
                        </>
                      ) : (
                        <>
                          <strong>{job.eta}</strong>
                          <span>min ETA</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={activityChipRow}>
                    <span style={activityChip}>
                      💬 {activeLanguage === "es" ? "Cliente esperando" : "Customer waiting"}
                    </span>

                    <span style={activityChip}>
                      📷 {activeLanguage === "es" ? "Fotos listas" : "Photos ready"}
                    </span>

                    <span style={priorityChip}>
                      ⚡ {activeLanguage === "es" ? "Prioridad" : "Priority"}
                    </span>
                  </div>

                  <div style={activeTimeline}>
                    <div style={activeTimelineStep}>
                      <span>✓</span>
                      {getWorkflowStageLabel("active")}
                    </div>

                    <div style={activeTimelineStep}>
                      <span>{["enroute","arrived","started","completed"].includes(job.status) ? "✓" : "○"}</span>
                      {getWorkflowStageLabel("on_the_way")}
                    </div>

                    <div style={activeTimelineStep}>
                      <span>{["arrived","started","completed"].includes(job.status) ? "✓" : "○"}</span>
                      {getWorkflowStageLabel("arrived")}
                    </div>

                    <div style={activeTimelineStep}>
                      <span>{["started","completed"].includes(job.status) ? "✓" : "○"}</span>
                      {getWorkflowStageLabel("working")}
                    </div>

                    <div style={activeTimelineStep}>
                      <span>{job.status === "completed" ? "✓" : "○"}</span>
                      {getWorkflowStageLabel("completed")}
                    </div>
                  </div>

                  <div style={activeActions}>
                    {["accepted", "enroute", "arrived", "started"].includes(job.status) && (
                      <button
                        style={dispatchButton}
                        onClick={() => {
saveActiveJobContext(job);
setWorkCenterReturn();
setPage("emergencyDispatch");
}}
                      >
                        {t.openDispatch}
                      </button>
                    )}

                    <button
                      style={secondaryActionButton}
                      onClick={() => {
                        saveActiveJobContext(job);
                        setWorkCenterReturn();

                        localStorage.setItem(
                          "selectedActiveProject",
                          JSON.stringify({
                            ...job,
                            source: job.source || "activeJob",
                            project: job.project || job,
                          })
                        );

                        localStorage.setItem("selectedPostId", job.id);
                        localStorage.setItem(
                          "selectedQuoteRequest",
                          JSON.stringify(job.project || job)
                        );
                        localStorage.setItem(
                          "projectDetailsReturnPage",
                          "contractorDashboard"
                        );
                        localStorage.setItem(
                          "conversationReturnPage",
                          "projectDetails"
                        );
                        localStorage.setItem(
                          "activeConversationId",
                          `active-job-${job.id}`
                        );
                        localStorage.setItem(
                          "activeConversationName",
                          job.customer || "Customer"
                        );
                        localStorage.setItem(
                          "meetroConversationType",
                          "activeJob"
                        );

                        setPage("projectDetails");
                      }}
                    >
                      <div>
                        <div>
                          {activeLanguage === "es"
                            ? "Abrir Proyecto"
                            : "Open Project"}
                        </div>
                        <div style={actionSubtext}>
                          {activeLanguage === "es"
                            ? "Ver conversación, fotos, pagos y progreso"
                            : "View conversation, photos, payments and progress"}
                        </div>
                      </div>
                    </button>

                    <button
                      style={secondaryActionButton}
                      onClick={() => {
                        if (job.source === "homeownerProject") {
                          setWorkCenterReturn();
                          localStorage.setItem(
                            "selectedActiveProject",
                            JSON.stringify(job)
                          );

                          localStorage.setItem(
                            "selectedPostId",
                            job.id
                          );

                          localStorage.setItem(
                            "selectedQuoteRequest",
                            JSON.stringify(job.project || job)
                          );

                          localStorage.setItem(
                            "projectDetailsReturnPage",
                            "contractorDashboard"
                          );

                          setWorkCenterReturn();
setPage("projectDetails");
                          return;
                        }

                        saveActiveJobContext(job);
                        setWorkCenterReturn();
setPage("emergencyDispatch");
                      }}
                    >
                      {job.source === "homeownerProject"
                        ? activeLanguage === "es"
                          ? "Abrir Proyecto"
                          : "Open Project"
                        : activeLanguage === "es"
                        ? "Ruta"
                        : "Route"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
          })()}
        </div>
      )}

      {activeTab === "completed" && (
        <div style={section}>
          <h2 style={sectionTitle}>
            {activeLanguage === "es" ? "Trabajos Completados" : "Completed Work"}
          </h2>

          <div style={completedSummaryGrid}>
            <div style={completedSummaryCard}>
              <span>{activeLanguage === "es" ? "Total" : "Total"}</span>
              <strong>{completedJobsCount}</strong>
            </div>

            <div style={completedSummaryCard}>
              <span>{activeLanguage === "es" ? "Este Mes" : "This Month"}</span>
              <strong>{completedProjects.length}</strong>
            </div>

            <div style={completedSummaryCard}>
              <span>{translate("workTabRevenue")}</span>
              <strong>${totalJobRevenue}</strong>
            </div>

            <div style={completedSummaryCard}>
              <span>{activeLanguage === "es" ? "Promedio" : "Average"}</span>
              <strong>${averageJobValue}</strong>
            </div>
          </div>

          <div style={historyFilters}>
            <button
              style={completedFilter === "all" ? historyFilterActive : historyFilterButton}
              onClick={() => setCompletedFilter("all")}
            >
              {activeLanguage === "es" ? "Todo" : "All"}
            </button>

            <button
              style={completedFilter === "month" ? historyFilterActive : historyFilterButton}
              onClick={() => setCompletedFilter("month")}
            >
              {activeLanguage === "es" ? "Mes" : "Month"}
            </button>

            <button
              style={completedFilter === "week" ? historyFilterActive : historyFilterButton}
              onClick={() => setCompletedFilter("week")}
            >
              {activeLanguage === "es" ? "Semana" : "Week"}
            </button>

            <button
              style={completedFilter === "today" ? historyFilterActive : historyFilterButton}
              onClick={() => setCompletedFilter("today")}
            >
              {translate("today")}
            </button>
          </div>

          <div style={historyList}>
            {completedProjects.length === 0 ? (
              <div style={emptyCard}>
                <div style={emptyIcon}>📁</div>

                <strong>
                  {activeLanguage === "es"
                    ? "No hay proyectos completados todavía."
                    : "No completed projects yet."}
                </strong>
              </div>
            ) : (
              completedProjects.map((project, index) => {
                const completedDate = project.completedAt
                  ? new Date(project.completedAt)
                  : new Date();

                return (
                  <div
                    style={historyListCard}
                    key={index}
                    onClick={() => {
                      localStorage.setItem(
                        "lastCompletedProject",
                        JSON.stringify(project)
                      );

                      localStorage.setItem(
                        "completedJobViewMode",
                        "business"
                      );

                      setWorkCenterReturn();
setPage("completedJobDetails");
                    }}
                  >
                    <div style={historySmallIcon}>
                      {project.category === "HVAC"
                        ? "▤"
                        : project.category === "Handyman"
                        ? "⌁"
                        : "✓"}
                    </div>

                    <div style={historyMain}>
                      <span style={historyType}>
                        {project.category || "Project"}
                      </span>

                      <strong style={historyTitle}>
                        {project.title ||
                          project.service ||
                          "Completed Project"}
                      </strong>

                      <p style={historyMeta}>
                        {project.homeownerName ||
                          project.username ||
                          "Homeowner"}
                      </p>
                    </div>

                    <div style={historyDetails}>
                      <span>
                        📍 {project.location || "Cape Coral, FL"}
                      </span>

                      <span>
                        📅{" "}
                        {completedDate.toLocaleDateString()}
                      </span>

                      <span>
                        ⏰{" "}
                        {completedDate.toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div style={historyRight}>
                      <strong>
                        +${project.revenue || 0}
                      </strong>

                      <span style={historyStatusMini}>
                        ✅ {translate("completed")}
                      </span>
                    </div>

                    <div style={historyArrow}>›</div>
                  </div>
                );
              })
            )}
          </div>

          <p style={historyCount}>
            {activeLanguage === "es"
              ? "Mostrando 1–6 de 24 trabajos"
              : "Showing 1–6 of 24 jobs"}
          </p>

          <button style={loadMoreButton}>
            {activeLanguage === "es" ? "Cargar Más" : "Load More"}
          </button>
        </div>
      )}

      {activeTab === "quotes" && (
        <div style={section}>
          <h2 style={sectionTitle}>
            {activeLanguage === "es" ? "Historial de Cotizaciones" : "Quote History"}
          </h2>

          {quoteHistory.length === 0 ? (
            <div style={emptyCard}>
              <div style={emptyIcon}>💵</div>

              <strong>
                {activeLanguage === "es"
                  ? "No hay cotizaciones enviadas todavía."
                  : "No sent quotes yet."}
              </strong>

              <p style={emptyText}>
                {activeLanguage === "es"
                  ? "Las cotizaciones enviadas aparecerán aquí con su estado, precio e historial."
                  : "Sent quotes will appear here with their status, price, and history."}
              </p>

              <div style={emptyActionGrid}>
                <button
                  style={emptyActionButton}
                  onClick={() => setPage("businessLeads")}
                >
                  📥 {activeLanguage === "es" ? "Ver oportunidades" : "View leads"}
                </button>

                <button
                  style={emptyActionButton}
                  onClick={() => {
                    localStorage.setItem("meetroCommandTool", "quotes");
                    setPage("businessCommandCenter");
                  }}
                >
                  🧾 {translate("createQuote")}
                </button>
              </div>
            </div>
          ) : (
            <div style={quoteHistoryList}>
              {quoteHistory.map((quote) => (
                <div style={quoteHistoryCard} key={quote.quoteId}>
                  <div style={quoteHistoryTop}>
                    <div>
                      <span
                        style={{
                          ...quoteStatusPill,
                          ...(quote.status === "revision_requested"
                            ? revisionRequestedPill
                            : {}),
                          ...(quote.status === "accepted"
                            ? acceptedQuotePill
                            : {}),
                          ...(quote.status === "active"
                            ? activeQuotePill
                            : {}),
                        }}
                      >
                        {quote.status === "revision_requested"
                          ? activeLanguage === "es"
                            ? "Cambios solicitados"
                            : "Revision requested"
                          : quote.status === "accepted"
                          ? activeLanguage === "es"
                            ? "Cotización aceptada"
                            : "Quote accepted"
                          : quote.status === "active"
                          ? activeLanguage === "es"
                            ? "Movida a trabajo activo"
                            : "Moved to active job"
                          : quote.status || "sent"}
                      </span>

                      <h3 style={quoteHistoryTitle}>
                        {quote.projectTitle ||
                          (activeLanguage === "es" ? "Proyecto" : "Project")}
                      </h3>

                      <p style={quoteHistoryMeta}>
                        {quote.homeownerName ||
                          (activeLanguage === "es" ? "Cliente" : "Homeowner")}
                      </p>
                    </div>

                    <strong style={quoteAmount}>
                      ${quote.amount || 0}
                    </strong>
                  </div>

                  <p style={quoteHistoryText}>
                    {quote.notes ||
                      (activeLanguage === "es"
                        ? "Sin notas agregadas."
                        : "No notes added.")}
                  </p>

                  {quote.status === "accepted" && (
                    <div style={acceptedQuoteAlertCard}>
                      <strong>
                        🎉 {activeLanguage === "es"
                          ? "El cliente aceptó esta cotización"
                          : "Customer accepted this quote"}
                      </strong>

                      <p>
                        {activeLanguage === "es"
                          ? "Este proyecto ya está listo para programación y trabajo activo."
                          : "This project is now ready for scheduling and active work."}
                      </p>

                      <button
                        style={moveToActiveButton}
                        onClick={() => {
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
                        🛠️ {activeLanguage === "es"
                          ? "Ir a trabajos activos"
                          : "Go to Active Jobs"}
                      </button>
                    </div>
                  )}

                  {quote.status === "revision_requested" && quote.revisionNote && (
                    <div style={revisionRequestCard}>
                      <strong>
                        {activeLanguage === "es"
                          ? "Cambio solicitado por el cliente"
                          : "Customer requested changes"}
                      </strong>

                      <p>{quote.revisionNote}</p>

                      {quote.revisionRequestedAt && (
                        <small>
                          {new Date(quote.revisionRequestedAt).toLocaleDateString(
                            activeLanguage === "es" ? "es-US" : "en-US",
                            { month: "short", day: "numeric", year: "numeric" }
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
                        {activeLanguage === "es"
                          ? "Revisar cotización"
                          : "Revise Quote"}
                      </button>
                    </div>
                  )}

                  <div style={quoteHistoryFooter}>
                    <span>
                      📅{" "}
                      {quote.createdAt
                        ? new Date(quote.createdAt).toLocaleDateString(
                            activeLanguage === "es" ? "es-US" : "en-US",
                            { month: "short", day: "numeric", year: "numeric" }
                          )
                        : activeLanguage === "es"
                        ? "Fecha pendiente"
                        : "Date pending"}
                    </span>

                    <span>
                      {activeLanguage === "es" ? "Estado" : "Status"}:{" "}
                      {quote.status || "sent"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {activeTab === "materials" && (
        <div style={materialsPageShell}>
          <div style={materialsHero}>
            <div style={materialsHeroIcon}>📦</div>
            <h2 style={materialsHeroTitle}>
              {translate("materialsCenter")}
            </h2>
            <p style={materialsHeroText}>
              {activeLanguage === "es"
                ? "Solicita materiales, pausa trabajos y controla lo que falta."
                : "Request materials, pause jobs, and track what you need."}
            </p>
          </div>
          <div style={materialsAssistantCard}>
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
                  activeLanguage === "es"
                    ? "Dictar materiales"
                    : "Dictate materials"
                }
              >
                {isListeningMaterials ? "🔴" : "🎙️"}
              </button>

              <div>
                <h3 style={materialsVoiceTitle}>
                  {translate("speakOrTypeMaterials")}
                </h3>
              </div>
            </div>

            <p style={emptyText}>
              {translate("materialsAssistantDescription")}
            </p>

            <textarea
              value={materialsDraft}
              onChange={(e) => setMaterialsDraft(e.target.value)}
              style={textarea}
              placeholder={
                translate("materialsPlaceholder")
              }
            />

            <div style={materialsActionRow}>
              <button
                style={generateMaterialsButton}
                onClick={generateMaterialsSuggestion}
              >
                🪄 {translate("generateMaterialsList")}
              </button>
            </div>

            {materialsAiSuggestion && (
              <div style={aiBox}>
                <strong>
                  {activeLanguage === "es"
                    ? "Sugerencia AI"
                    : "AI Suggested Materials"}
                </strong>

                <pre style={materialsPreview}>
                  {materialsAiSuggestion}
                </pre>
              </div>
            )}

            {materialsCatalogMatches.length > 0 && (
              <div style={catalogMatchesWrap}>
                <strong style={catalogMatchesTitle}>
                  {activeLanguage === "es"
                    ? "Coincidencias del catálogo"
                    : "Catalog Matches"}
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
                          (activeLanguage === "es"
                            ? "Proveedor no confirmado"
                            : "Supplier not confirmed")}
                      </p>

                      <button
                        style={catalogAddButton}
                        onClick={() => addCatalogMaterialToProject(material)}
                      >
                        ➕ {activeLanguage === "es" ? "Agregar" : "Add"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div style={materialsManualBar}>
            <button
              style={materialsManualToggle}
              onClick={() => setShowManualMaterials((prev) => !prev)}
            >
              <span style={manualAddIcon}>＋</span>

              <span style={manualAddText}>
                <strong>
                  {translate("manualAdd")}
                </strong>

                <small>
                  {translate("manualAddSubtitle")}
                </small>
              </span>

              <span style={manualChevron}>
                {showManualMaterials ? "⌃" : "⌄"}
              </span>
            </button>

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
                        activeLanguage === "es"
                          ? "Ejemplo: gabinete base"
                          : "Example: base cabinet"
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
                        {activeLanguage === "es" ? "Cliente" : "Customer"}
                      </option>

                      <option value="business">
                        {activeLanguage === "es" ? "Negocio" : "Business"}
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
                        {activeLanguage === "es" ? "Necesario" : "Needed"}
                      </option>

                      <option value="requested">
                        {activeLanguage === "es" ? "Solicitado" : "Requested"}
                      </option>

                      <option value="received">
                        {activeLanguage === "es" ? "Recibido" : "Received"}
                      </option>
                    </select>
                  </label>
                </div>

                <div style={emptyActionGrid}>
                  <button style={emptyActionButton} onClick={saveMaterialItem}>
                    📦 {editingMaterial
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
                    ⏸ {translate("pauseJob")}
                  </button>
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

              return (
                <div style={materialsListPanel}>
                  <div style={materialsListHeader}>
                    <div>
                      <strong>
                        {activeLanguage === "es"
                          ? `${translate("materialsList")} (${materials.length})`
                          : `${translate("materialsList")} (${materials.length})`}
                      </strong>

                      <p style={jobMeta}>
                        {receivedCount}{" "}
                        {activeLanguage === "es" ? "recibidos" : "received"} •{" "}
                        {neededCount}{" "}
                        {activeLanguage === "es" ? "pendientes" : "pending"}
                      </p>
                    </div>

                    <div style={materialsToolbar}>
                      <input
                        style={materialsSearchBox}
                        value={materialsSearch}
                        onChange={(e) => setMaterialsSearch(e.target.value)}
                        placeholder={translate("searchMaterials")}
                      />

                      <button
                        style={
                          materials.length === 0
                            ? sendMaterialsDisabledButton
                            : sendMaterialsButton
                        }
                        onClick={() => {
                          const conversationId =
                            localStorage.getItem("activeWorkConversationId") ||
                            localStorage.getItem("activeConversationId") ||
                            "";

                          if (materials.length === 0) {
                            alert(
                              activeLanguage === "es"
                                ? "Agrega materiales antes de enviar la lista."
                                : "Add materials before sending the list."
                            );
                            return;
                          }

                          if (!conversationId) {
                            alert(
                              activeLanguage === "es"
                                ? "No hay conversación vinculada para enviar esta lista."
                                : "No linked customer conversation found for this materials list."
                            );
                            return;
                          }

                          const storageKey = `meetro_conversation_${conversationId}`;
                          const existingMessages = JSON.parse(
                            localStorage.getItem(storageKey) || "[]"
                          );

                          const listText = materials
                            .map(
                              (item) =>
                                `• ${item.title} — Qty ${item.quantity} — ${item.provider} — ${item.status}`
                            )
                            .join("\n");

                          const materialMessage = {
                            id: Date.now(),
                            sender: "business",
                            role: "business",
                            type: "materials-list",
                            workflowSource: "materials-center",
                            conversationId,
                            approvalRequired: materials.some(
                              (item) => item.provider === "approval"
                            ),
                            jobService:
                              localStorage.getItem("activeWorkService") || "",
                            jobLocation:
                              localStorage.getItem("activeWorkLocation") || "",
                            text:
                              activeLanguage === "es"
                                ? `📦 Lista de materiales:\n${listText}`
                                : `📦 Materials list:\n${listText}`,
                            materials,
                            time: new Date().toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            }),
                            createdAt: new Date().toISOString(),
                          };

                          localStorage.setItem(
                            storageKey,
                            JSON.stringify([...existingMessages, materialMessage])
                          );

                          window.dispatchEvent(
                            new Event("meetro-messages-updated")
                          );

                          localStorage.setItem("meetroMaterialsListSent", "true");
                          alert(
                            activeLanguage === "es"
                              ? "Lista de materiales enviada al cliente."
                              : "Materials list sent to customer."
                          );
                        }}
                      >
                        📩 {translate("sendToCustomer")}
                      </button>
                    </div>
                  </div>

                  {materials.length === 0 ? (
                    <div style={materialsEmptyBox}>
                      {translate("noMaterialsSaved")}
                    </div>
                  ) : (
                    <div style={materialsCardsWrap}>
                      {filteredMaterials.map((item) => {
                        const title = String(item.title || "");
                        const lowerTitle = title.toLowerCase();

                        const icon = lowerTitle.includes("pipe")
                          ? "🔩"
                          : lowerTitle.includes("cement")
                          ? "🧴"
                          : lowerTitle.includes("tape")
                          ? "🌀"
                          : lowerTitle.includes("elbow")
                          ? "↪️"
                          : "📦";

                        const providerLabel =
                          item.provider === "customer"
                            ? activeLanguage === "es"
                              ? "Cliente"
                              : "Customer"
                            : item.provider === "business"
                            ? activeLanguage === "es"
                              ? "Negocio"
                              : "Business"
                            : activeLanguage === "es"
                            ? "Aprobación"
                            : "Approval";

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
                                    {item.provider === "customer" ? "👤 " : "🏢 "}
                                    {providerLabel}
                                  </span>

                                  <span>
                                    📅 {item.createdAt
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
                                  ✏️ {translate("edit")}
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
                                    ✓ {activeLanguage === "es"
                                      ? "Recibido"
                                      : "Received"}
                                  </button>
                                )}

                                <button
                                  style={materialDeleteButton}
                                  onClick={() => {
                                    setMaterialDeleteTarget(item);
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <button style={addMaterialInlineButton}>
                        + {activeLanguage === "es" ? "Agregar material" : "Add Material"}
                      </button>
                    </div>
                  )}

                  {materials.length > 0 && (
                    <div style={materialsSummaryPanel}>
                      <div>
                        <strong>{activeLanguage === "es" ? "Resumen" : "Materials Summary"}</strong>

                        <div style={materialsSummaryGrid}>
                          <div style={summaryCountBox}>
                            <strong>{materials.length}</strong>
                            <span>Total</span>
                          </div>

                          <div style={summaryCountBox}>
                            <strong>
                              {materials.filter((item) => item.status === "needed").length}
                            </strong>
                            <span>{activeLanguage === "es" ? "Necesarios" : "Needed"}</span>
                          </div>

                          <div style={summaryCountBox}>
                            <strong>
                              {materials.filter((item) => item.status === "requested").length}
                            </strong>
                            <span>{activeLanguage === "es" ? "Solicitados" : "Requested"}</span>
                          </div>

                          <div style={summaryCountBox}>
                            <strong>{receivedCount}</strong>
                            <span>{activeLanguage === "es" ? "Recibidos" : "Received"}</span>
                          </div>
                        </div>
                      </div>

                      <div style={summaryReadyBox}>
                        <strong>
                          {receivedCount} of {materials.length}{" "}
                          {activeLanguage === "es"
                            ? "materiales recibidos"
                            : "materials received"}
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

                          localStorage.setItem("activeWorkStage", "working");
                          localStorage.removeItem("activeWorkPauseReason");

                          window.dispatchEvent(
                            new Event("meetro-active-work-updated")
                          );

                          openWorkTab("active");
                          setRefreshKey((prev) => prev + 1);
                        }}
                      >
                        {neededCount === 0
                          ? activeLanguage === "es"
                            ? "▶️ Materiales listos — reanudar"
                            : "▶️ All Materials Ready — Resume Job"
                          : activeLanguage === "es"
                          ? `⏳ Esperando ${neededCount} materiales`
                          : `⏳ Waiting on ${neededCount} materials`}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
        </div>
      )}

      {activeTab === "records" && (
        <div style={section}>
          <h2 style={sectionTitle}>
            {activeLanguage === "es" ? "Registros de Proyecto" : "Project Records"}
          </h2>

          <p style={recordsIntroText}>
            {activeLanguage === "es"
              ? "Cada cliente o proyecto guarda su historial operativo: cambios, materiales, fotos, aprobaciones, cotizaciones y eventos importantes."
              : "Each customer or project keeps its operating history: changes, materials, photos, approvals, quotes, and important events."}
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
                    (activeLanguage === "es" ? "Proyecto" : "Project"),
                  customer:
                    latest.customer ||
                    (activeLanguage === "es" ? "Cliente" : "Customer"),
                  lastUpdate:
                    latest.savedAt ||
                    latest.createdAt ||
                    "",
                };
              })
              .filter((group) => group.count > 0);

            if (recordGroups.length === 0) {
              return (
                <div style={emptyCard}>
                  <div style={emptyIcon}>🗂️</div>

                  <strong>
                    {activeLanguage === "es"
                      ? "No hay registros de proyecto todavía."
                      : "No project records yet."}
                  </strong>

                  <p style={emptyText}>
                    {activeLanguage === "es"
                      ? "Los cambios de proyecto, materiales, fotos, aprobaciones y documentos importantes aparecerán aquí automáticamente."
                      : "Project changes, materials, photos, approvals, and important documents will appear here automatically."}
                  </p>
                </div>
              );
            }

            return (
              <div style={recordsGrid}>
                {recordGroups.map((group) => (
                  <div style={projectRecordCard} key={group.conversationId}>
                    <div style={projectRecordTop}>
                      <div style={projectRecordIcon}>🗂️</div>

                      <div>
                        <h3 style={projectRecordTitle}>{group.customer}</h3>

                        <p style={projectRecordMeta}>
                          {group.title}
                        </p>
                      </div>
                    </div>

                    <div style={projectRecordStats}>
                      <span>
                        📌 {group.count}{" "}
                        {activeLanguage === "es" ? "registros" : "records"}
                      </span>

                      {group.lastUpdate && (
                        <span>
                          🕒{" "}
                          {new Date(group.lastUpdate).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {group.latest?.title && (
                      <div style={latestRecordBox}>
                        <strong>
                          {activeLanguage === "es"
                            ? "Último evento"
                            : "Latest event"}
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
                        📁 {activeLanguage === "es"
                          ? "Abrir registro"
                          : "Open Record"}
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
                        💬 {activeLanguage === "es"
                          ? "Chat"
                          : "Chat"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "revenue" && (
        <div style={section}>
          <h2 style={sectionTitle}>
            {translate("workTabRevenue")}
          </h2>

          <div style={revenueCard}>
            <div style={revenueHeroGrid}>
              <div style={revenueHeroCardBlue}>
                <div style={revenueHeroContent}>
                  <div style={revenueIconTile}>$</div>

                  <div>
                    <span style={revenueLabel}>
                      {activeLanguage === "es" ? "Esta Semana" : "This Week"}
                    </span>
                    <strong style={revenueHeroBig}>${totalJobRevenue}</strong>

                    <div style={revenueTrend}>
                      ↑ +0%
                    </div>
                  </div>
                </div>

                <div style={revenueSubText}>
{activeLanguage==="es"
?"Comparado con la semana pasada"
:`${completedJobsCount} jobs • Avg $${averageJobValue}`}
</div>
              </div>

              <div style={revenueHeroCardPurple}>
                <div style={revenueHeroContent}>
                  <div style={revenueIconTile}>↗</div>

                  <div>
                    <span style={revenueLabel}>
                      {activeLanguage === "es" ? "Este Mes" : "This Month"}
                    </span>
                    <strong style={revenueHeroBig}>${totalJobRevenue}</strong>

                    <div style={revenueTrend}>
                      ↑ +0%
                    </div>
                  </div>
                </div>

                <div style={revenueSubText}>
{activeLanguage==="es"
?"Comparado con la semana pasada"
:`${quoteHistory.length} quotes • ${completedJobsCount} completed`}
</div>
              </div>
            </div>

            <div style={revenueGrid}>
              <div style={revenueMiniCard}>
                <div style={revenueIconTile}>✓</div>
                <div>
                  <span style={revenueLabel}>
                    {activeLanguage === "es" ? "Trabajos Completados" : "Completed Jobs"}
                  </span>
                  <strong style={revenueBig}>{completedJobsCount}</strong>
                <div style={miniSub}>total</div>
                </div>
              </div>

              <div style={revenueMiniCard}>
                <div style={revenueIconTile}>◈</div>
                <div>
                  <span style={revenueLabel}>
                    {activeLanguage === "es" ? "Valor Promedio" : "Average Job"}
                  </span>
                  <strong style={revenueBig}>${averageJobValue}</strong>
                  <div style={miniSub}>
                    {activeLanguage==="es"?"valor promedio":"avg value"}
                  </div>
                </div>
              </div>

              <div style={revenueMiniCard}>
                <div style={revenueIconTile}>↑</div>
                <div>
                  <span style={revenueLabel}>
                    {activeLanguage === "es" ? "Ganancia Estimada" : "Estimated Profit"}
                  </span>
                  <strong style={revenueBig}>${Math.round(Number(totalJobRevenue) * 0.7)}</strong>
                  <div style={miniSub}>
                    {activeLanguage==="es"?"ganancia estimada":"est. profit"}
                  </div>
                </div>
              </div>

              <div style={revenueMiniCard}>
                <div style={revenueIconTile}>⧉</div>
                <div>
                  <span style={revenueLabel}>
                    {activeLanguage === "es" ? "Cotizaciones Pendientes" : "Pending Quotes"}
                  </span>
                  <strong style={revenueBig}>
                    {totalQuoteAlerts > 0 ? totalQuoteAlerts : 0}
                  </strong>
                  <div style={miniSub}>
                    {totalQuoteAlerts > 0
                      ? activeLanguage === "es"
                        ? "requieren atención"
                        : "need attention"
                      : activeLanguage==="es"
                      ? "abiertas"
                      : "open"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {materialDeleteTarget && (
        <div style={confirmOverlay}>
          <div style={confirmCard}>
            <h3>
              {activeLanguage === "es"
                ? "¿Eliminar material?"
                : "Delete material?"}
            </h3>

            <p>
              {activeLanguage === "es"
                ? `Esto eliminará "${materialDeleteTarget.title}" de la lista.`
                : `This will remove "${materialDeleteTarget.title}" from the list.`}
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

      <BottomNav setPage={setPage} currentPage="contractorDashboard" />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
  padding: "72px 11px 260px",
  boxSizing: "border-box",
  overflowX: "hidden",
};

const topBar = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
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
  color: "#5b3df5",
  padding: "10px 9px",
  borderRadius: "999px",
  fontWeight: "900",
  marginBottom: "9px",
  boxShadow: "0 8px 10px rgba(0,0,0,0.05)",
};



const overviewGrid = {
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:"10px",
maxWidth:"900px",
margin:"0 auto 11px",
};

const overviewCard = {
background:"white",
borderRadius:"10px",
padding:"11px",
boxShadow:"0 10px 11px rgba(0,0,0,0.055)",
};

const overviewIcon={
fontSize:"10px",
marginBottom:"10px",
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
background:"#eef2ff",
color:"#5b3df5",
fontWeight:"800",
marginBottom:"9px",
};

const miniButton={
width:"100%",
padding:"10px 9px",
border:"none",
borderRadius:"10px",
background:"#5b3df5",
color:"white",
fontWeight:"900",
cursor:"pointer",
};



const quoteHistoryList = {
  display: "grid",
  gap: "14px",
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
  padding: "18px",
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
  background: "linear-gradient(135deg,#ffffff,#fcfbff)",
  borderRadius: "24px",
  padding: "18px",
  boxShadow: "0 14px 34px rgba(15,23,42,.06)",
  border: "1px solid rgba(91,61,245,.08)",
};

const quoteHistoryTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
};

const quoteStatusPill = {
  display: "inline-flex",
  alignItems: "center",
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
  margin: "10px 0 4px",
  fontSize: "17px",
  fontWeight: "950",
  color: "#111827",
  lineHeight: 1.08,
};

const quoteHistoryMeta = {
  margin: 0,
  color: "#475569",
  fontWeight: "800",
  fontSize: "13px",
};

const quoteAmount = {
  fontSize: "20px",
  fontWeight: "950",
  color: "#5b3df5",
  letterSpacing: "-0.02em",
};

const quoteHistoryText = {
  marginTop: "14px",
  color: "#475569",
  lineHeight: 1.55,
  fontWeight: "700",
  fontSize: "14px",
};

const quoteHistoryFooter = {
  borderTop: "1px solid #eef2f7",
  paddingTop: "12px",
  marginTop: "14px",
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
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  background: "white",
  borderRadius: "24px",
  padding: "14px",
  margin: "18px 0",
  boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
};


const operationalAlertTab = {
  border: "1px solid #fed7aa",
  background: "#fff7ed",
  color: "#c2410c",
  boxShadow: "0 10px 22px rgba(249,115,22,0.12)",
};

const operationalLiveTab = {
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#15803d",
  boxShadow: "0 10px 22px rgba(34,197,94,0.12)",
};

const materialsAlertTab = {
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#b45309",
  boxShadow: "0 10px 22px rgba(245,158,11,0.12)",
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
  background: "#fff7ed",
  color: "#c2410c",
  boxShadow:
    "0 0 0 2px rgba(249,115,22,0.18), 0 12px 26px rgba(249,115,22,0.18)",
};

const quoteAlertBadge = {
  marginLeft: "8px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "22px",
  height: "22px",
  borderRadius: "999px",
  background: "#f97316",
  color: "white",
  fontSize: "12px",
  fontWeight: "950",
};

const workCenterAlertBanner = {
  width: "100%",
  border: "1px solid #fed7aa",
  borderRadius: "22px",
  background: "linear-gradient(135deg, #fff7ed, #ffffff)",
  color: "#7c2d12",
  padding: "14px",
  display: "flex",
  alignItems: "center",
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
  alignItems: "center",
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
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const workTabActive = {
  border: "none",
  background: "linear-gradient(135deg,#5b3df5,#7c3aed)",
  color: "white",
  borderRadius: "18px",
  padding: "12px 16px",
  fontWeight: "950",
  fontSize: "14px",
  minWidth: "108px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "0 14px 30px rgba(91,61,245,0.28)",
};



const sectionHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "9px",
  marginBottom: "10px",
};

const smallPrimaryButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "999px",
  padding: "10px 10px",
  fontWeight: "900",
  cursor: "pointer",
  whiteSpace: "nowrap",
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
  color: "#5b3df5",
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
  background: "#eef2ff",
  color: "#5b3df5",
  borderRadius: "9px",
  padding: "8px 9px",
  fontWeight: "800",
  cursor: "pointer",
};

const startScheduleBtn = {
  border: "none",
  background: "#5b3df5",
  color: "white",
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

const confirmOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.35)",
  zIndex: 200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px",
};

const confirmCard = {
  width: "100%",
  maxWidth: "360px",
  background: "white",
  borderRadius: "10px",
  padding: "11px",
  boxShadow: "0 10px 45px rgba(15,23,42,0.22)",
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
  border: "1px solid #e5e7eb",
  background: "white",
  borderRadius: "11px",
  padding: "9px",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 10px 10px rgba(15,23,42,0.06)",
};

const jobCardTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "9px",
  alignItems: "flex-start",
};

const jobMeta = {
  margin: "6px 0 0",
  color: "#475569",
  fontSize: "12px",
  lineHeight: 1.4,
};

const statusPill = {
  background: "#eef2ff",
  color: "#5b3df5",
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
  background: "white",
  borderRadius: "9px",
  padding: "11px 10px",
  marginBottom: "9px",
  color: "#6b7280",
  fontWeight: "800",
  textAlign: "center",
  boxShadow: "0 8px 9px rgba(0,0,0,0.045)",
};

const section = {
  marginBottom: "36px",
};

const sectionTitle = {
  fontSize: "12px",
  fontWeight: "900",
  textAlign: "center",
  marginBottom: "9px",
  color: "#111827",
};

const emptyCard = {
  background: "white",
  borderRadius: "9px",
  padding: "9px",
  textAlign: "center",
  boxShadow: "0 10px 10px rgba(0,0,0,0.05)",
};

const emptyIcon = {
  fontSize: "12px",
  marginBottom: "8px",
};

const emptyText = {
  color: "#667085",
  fontSize: "15px",
  fontWeight: "700",
  lineHeight: 1.4,
  margin: "8px 0 10px",
};

const emptyActionGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
  marginTop: "10px",
};

const emptyActionButton = {
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: "10px",
  padding: "11px",
  fontWeight: "900",
  cursor: "pointer",
  color: "#111827",
  fontSize: "12px",
};



const pendingReviewCard = {
  background: "linear-gradient(135deg,#eef2ff,#ffffff)",
  border: "1px solid rgba(124,58,237,0.16)",
  borderRadius: "24px",
  padding: "18px",
  marginBottom: "16px",
  boxShadow: "0 12px 30px rgba(124,58,237,0.10)",
};

const pendingReviewTop = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
};

const pendingReviewIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "18px",
  background: "#ede9fe",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
};

const pendingReviewTitle = {
  fontSize: "18px",
  fontWeight: "950",
  color: "#0f172a",
};

const pendingReviewMeta = {
  margin: "4px 0 0",
  color: "#475569",
  fontWeight: "800",
};

const pendingReviewLocation = {
  margin: "4px 0 0",
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
  background: "linear-gradient(135deg,#5b3df5,#7c3aed)",
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
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  flexShrink: 0,
};

const requestTitle = {
  display: "block",
  fontSize: "28px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "6px",
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
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "700",
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
gap:"10px",
};

const activeJobPanel = {
background:"white",
borderRadius:"10px",
padding:"9px",
boxShadow:"0 9px 28px rgba(15,23,42,0.055)",
border:"1px solid #e5e7eb",
};

const activeJobTop = {
display:"flex",
justifyContent:"space-between",
alignItems:"flex-start",
gap:"9px",
marginBottom:"10px",
};

const scheduledJobBadge = {
  background: "#dcfce7",
  color: "#15803d",
  borderRadius: "999px",
  padding: "10px 10px",
  fontWeight: "800",
  fontSize: "15px",
  display: "inline-flex",
  alignItems: "center",
};

const activeJobBadge = {
display:"inline-flex",
padding:"6px 10px",
borderRadius:"999px",
background:"#dcfce7",
color:"#15803d",
fontWeight:"900",
fontSize:"9px",
marginBottom:"8px",
};

const activeJobTitle = {
fontSize:"21px",
fontWeight:"900",
margin:"0 0 5px",
color:"#111827",
};

const activeJobSub = {
margin:0,
color:"#64748b",
fontWeight:"700",
};

const jobActivityNote = {
  marginTop: "8px",
  display: "inline-flex",
  alignItems: "center",
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
  minWidth: "74px",
  background: "linear-gradient(135deg,#f5f3ff,#eef2ff)",
  border: "1px solid rgba(91,61,245,.10)",
  borderRadius: "14px",
  padding: "10px 9px",
  textAlign: "center",
  color: "#5b3df5",
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
  alignItems: "center",
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
  alignItems: "center",
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
gridTemplateColumns:"1fr 1fr",
gap:"9px",
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
  alignItems: "center",
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
  border: "1px solid #c7d2fe",
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
color:"#5b3df5",
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
background:"#5b3df5",
border:"1px solid #5b3df5",
borderRadius:"10px",
padding:"9px",
fontWeight:"900",
color:"white",
boxShadow:"0 8px 11px rgba(91,61,245,0.18)",
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
background:"#eef2ff",
color:"#5b3df5",
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
background:"#5b3df5",
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
background:"#eef2ff",
color:"#5b3df5",
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
  border: "1px solid rgba(124,58,237,0.12)",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const projectRecordTop = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  minHeight: "54px",
};

const projectRecordIcon = {
  width: "46px",
  height: "46px",
  borderRadius: "16px",
  background: "linear-gradient(135deg,#f3f0ff,#faf7ff)",
  border: "1px solid rgba(124,58,237,0.12)",
  display: "flex",
  alignItems: "center",
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
  background: "linear-gradient(135deg,#5b3df5,#7c3aed)",
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
  alignItems: "center",
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
  alignItems: "center",
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
  color: "rgba(91,61,245,0.45)",
  letterSpacing: "-8px",
  transform: "rotate(-8deg)",
};

const revenueGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "9px",
};

const revenueMiniCard = {
  background:"#F8FAFC",
  border: "1px solid rgba(226,232,240,0.92)",
  borderRadius: "28px",
  padding: "9px",
  boxShadow: "0 10px 11px rgba(15,23,42,0.06)",
  minHeight: "120px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const revenueBig = {
  display: "block",
  fontSize: "29px",
  fontWeight: "900",
  color: "#111827",
  lineHeight: 1,
  marginTop: "8px",
};

const miniSub={
marginTop:"6px",
fontSize: "15px",
fontWeight:"700",
color:"#64748b",
};

const revenueLabel = {
  display: "block",
  color: "#1f2937",
  fontWeight: "900",
  fontSize: "12px",
};

const revenueCard = {
  background:"rgba(255,255,255,.92)",
  borderRadius: "9px",
  padding: "10px",
  boxShadow: "0 10px 36px rgba(15,23,42,0.06)",
};




const materialsToolbar = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  flexWrap: "wrap",
};

const materialsSearchBox = {
  border: "1px solid #ddd6fe",
  borderRadius: "16px",
  padding: "13px 16px",
  color: "#475569",
  fontWeight: "800",
  background: "#faf7ff",
  minWidth: "240px",
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
  alignItems: "center",
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
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const materialsCardsWrap = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "12px",
};

const materialCompactCard = {
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
  alignItems: "center",
  gap: "12px",
  width: "100%",
  minWidth: 0,
  overflow: "hidden",
};

const materialTableRow = {
  display: "grid",
  gridTemplateColumns: "2.1fr .6fr 1.1fr .9fr .9fr 1.45fr",
  gap: "10px",
  alignItems: "center",
  padding: "14px",
  borderTop: "1px solid #eef2f7",
  background: "linear-gradient(180deg,#ffffff,#fbfdff)",
};

const materialNameCell = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
};

const materialThumb = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  background: "#fbfaff",
  border: "1px solid rgba(124, 58, 237, 0.18)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  flexShrink: 0,
};

const materialMainName = {
  color: "#111827",
};

const materialSubText = {
  margin: "4px 0 0",
  color: "#475569",
  fontSize: "12px",
  fontWeight: "800",
};

const materialActionGroup = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
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
  color: "#5b3df5",
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
  border: "1px solid rgba(124, 58, 237, 0.18)",
  background: "#f5f3ff",
  color: "#7c3aed",
  borderRadius: "12px",
  width: "42px",
  height: "42px",
  display: "flex",
  alignItems: "center",
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
  alignItems: "center",
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
  alignItems: "center",
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
  color: "#5b3df5",
  padding: "10px",
  fontWeight: "900",
  cursor: "pointer",
  borderTop: "1px solid #e5e7eb",
};

const materialsSummaryPanel = {
  display: "grid",
  gridTemplateColumns: "1.35fr 1fr 1fr",
  gap: "16px",
  alignItems: "center",
  marginTop: "16px",
  background: "linear-gradient(135deg,#ffffff,#faf7ff)",
  border: "1px solid rgba(124,58,237,.12)",
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
  background: "linear-gradient(90deg,#8b5cf6,#22c55e)",
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
  padding: "16px 18px",
  borderRadius: "24px",
  background: "linear-gradient(135deg,#ffffff,#f8f5ff)",
  border: "1px solid rgba(124,58,237,.14)",
  boxShadow: "0 14px 34px rgba(15,23,42,.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  position: "relative",
  overflow: "hidden",
};

const activeProjectContextLabel = {
  fontSize: "11px",
  fontWeight: 950,
  color: "#7c3aed",
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
  border: "1px solid rgba(124,58,237,.16)",
  color: "#6d28d9",
  fontSize: "11px",
  fontWeight: 950,
  whiteSpace: "nowrap",
  textTransform: "capitalize",
  boxShadow: "0 8px 20px rgba(91,61,245,.10)",
};

const materialsPageShell = {
  maxWidth: "1120px",
  margin: "0 auto",
  display: "grid",
  gap: "16px",
  paddingBottom: "120px",
};

const materialsHero = {
  textAlign: "center",
  marginBottom: "4px",
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


const materialsVoiceHeader = {
  display: "flex",
  alignItems: "center",
  gap: "22px",
  marginBottom: "10px",
};

const materialsMicCircle = {
  width: "92px",
  height: "92px",
  borderRadius: "999px",
  background: "linear-gradient(180deg,#ede9fe,#f5f3ff)",
  color: "#6d28d9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "48px",
  boxShadow: "0 14px 34px rgba(109,40,217,.16)",
};

const materialsVoiceTitle = {
  margin: 0,
  fontSize: "24px",
  fontWeight: "1000",
  color: "#0f172a",
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
  border: "1px solid rgba(124, 58, 237, 0.16)",
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
  background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
  color: "#ffffff",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: "13px",
};

const generateMaterialsButton = {
  border: "none",
  background: "linear-gradient(135deg,#7c3aed,#5b3df5)",
  color: "white",
  borderRadius: "16px",
  padding: "18px 34px",
  fontWeight: "1000",
  cursor: "pointer",
  fontSize: "18px",
  minWidth: "320px",
  boxShadow: "0 16px 38px rgba(91,61,245,.24)",
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
  alignItems: "center",
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
  border: "1px dashed #7c3aed",
  color: "#5b3df5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px",
  fontWeight: "900",
};


const manualAddText = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "#0f172a",
};

const manualChevron = {
  marginLeft: "auto",
  fontSize: "24px",
  color: "#475569",
};

const materialsFormInner = {
  borderTop: "1px solid #eef2f7",
  padding: "18px 20px 20px",
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
  width: "88px",
  height: "88px",
  borderRadius: "999px",
  border: "none",
  background: "linear-gradient(180deg,#f5f3ff,#ede9fe)",
  color: "#7c3aed",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "44px",
  cursor: "pointer",
  boxShadow: "0 10px 28px rgba(124,58,237,.10)",
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
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "18px",
  marginTop: "20px",
};

const micMiniButton = {
  border: "none",
  background: "linear-gradient(135deg,#7c3aed,#5b3df5)",
  color: "white",
  borderRadius: "16px",
  padding: "18px 28px",
  fontWeight: "1000",
  cursor: "pointer",
  fontSize: "18px",
  minWidth: "190px",
  boxShadow: "0 14px 34px rgba(91,61,245,.20)",
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
  borderRadius: "26px",
  padding: "28px",
  border: "1px solid #ddd6fe",
  boxShadow: "0 18px 48px rgba(91,61,245,.08)",
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
  overflow: "hidden",
  background: "white",
  border: "1px solid #ddd6fe",
  borderRadius: "22px",
  padding: "14px",
  marginTop: "0",
  boxSizing: "border-box",
  boxShadow: "0 14px 34px rgba(15,23,42,.07)",
};

const materialsListHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "9px",
  marginBottom: "10px",
};


const sendMaterialsDisabledButton = {
  border: "1px solid #e5e7eb",
  background: "#f1f5f9",
  color: "#475569",
  borderRadius: "14px",
  padding: "10px 12px",
  fontWeight: "900",
  cursor: "not-allowed",
};

const sendMaterialsButton = {
  border: "1px solid #c4b5fd",
  background: "#f5f3ff",
  color: "#5b3df5",
  borderRadius: "16px",
  padding: "13px 16px",
  fontWeight: "1000",
  cursor: "pointer",
  fontSize: "15px",
};

const materialsEmptyBox = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: "9px",
  padding: "10px",
  color: "#475569",
  fontWeight: "800",
};

const materialsRows = {
  display: "grid",
  gap: "10px",
};

const materialRow = {
  display: "flex",
  alignItems: "center",
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
  alignItems: "center",
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
  padding: "18px",
  fontSize: "18px",
  outline: "none",
  resize: "vertical",
  background: "#fff",
  color: "#0f172a",
  boxSizing: "border-box",
  marginTop: "14px",
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
  gridTemplateColumns: "1fr 1fr",
  gap: "9px",
  width: "100%",
  marginTop: "10px",
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
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "8px",
  marginTop: "9px",
};


const activeStageButton = {
  background: "linear-gradient(135deg,#5b3df5,#7c3aed)",
  color: "white",
  border: "1px solid rgba(91,61,245,.22)",
  boxShadow: "0 10px 20px rgba(91,61,245,.18)",
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
  background: "#5b3df5",
  color: "white",
  fontWeight: "900",
  fontSize: "12px",
  cursor: "pointer",
  boxShadow: "0 10px 9px rgba(91,61,245,0.22)",
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
  padding: "18px",
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

export default ContractorDashboard;
