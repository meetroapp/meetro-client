import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import FloatingBackButton from "../components/FloatingBackButton";
import { t as translate } from "../utils/language";
import { canBusinessSeeCategory, inferEmergencyCategory } from "../utils/categoryRouting";

function ContractorDashboard({ setPage, language = "en" }) {
  const userRole = localStorage.getItem("businessCategory") || "Handyman";
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState(
    localStorage.getItem("meetroWorkCenterTab") || "pending"
  );
  const [completedFilter, setCompletedFilter] = useState("all");
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    date: new Date().toISOString().slice(0, 10),
    time: "12:00 PM",
    location: "",
    notes: "",
  });
  const activeLanguage = language;

  useEffect(() => {
    function syncEmergency() {
      setRefreshKey((prev) => prev + 1);
    }

    window.addEventListener("meetroEmergencyConversationUpdated", syncEmergency);
    window.addEventListener("storage", syncEmergency);

    return () => {
      window.removeEventListener(
        "meetroEmergencyConversationUpdated",
        syncEmergency
      );
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

  function saveManualScheduleVisit() {
    const schedule = JSON.parse(
      localStorage.getItem("meetro_business_schedule") || "[]"
    );

    const newVisit = {
      id: `schedule-${Date.now()}`,
      title: scheduleForm.title || "Scheduled Visit",
      date: scheduleForm.date,
      time: scheduleForm.time,
      location: scheduleForm.location || "Customer location",
      notes: scheduleForm.notes,
      status: "Scheduled",
      source: "manual",
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "meetro_business_schedule",
      JSON.stringify([newVisit, ...schedule])
    );

    setScheduleForm({
      title: "",
      date: new Date().toISOString().slice(0, 10),
      time: "12:00 PM",
      location: "",
      notes: "",
    });

    setShowScheduleForm(false);
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

  const completedProjects = [
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

        ...(localStorage.getItem("meetroDemoMultipleActiveJobs") === "true"
          ? [
              {
                id: "demo-active-2",
                service: "Leak Detection",
                status: "enroute",
                eta: "18",
                customer:
                  activeLanguage === "es"
                    ? "Cliente esperando llegada"
                    : "Customer waiting for arrival",
              },
            ]
          : []),
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
          onClick={() => setActiveTab("schedule")}
        >
          {activeLanguage === "es" ? "Agenda" : "Schedule"}
        </button>

        <button
          style={activeTab === "pending" ? workTabActive : workTab}
          onClick={() => setActiveTab("pending")}
        >
          {activeLanguage === "es" ? "Pendientes" : "Pending"}
        </button>

        <button
          style={activeTab === "active" ? workTabActive : workTab}
          onClick={() => setActiveTab("active")}
        >
          {activeLanguage === "es" ? "Activos" : "Active"}
        </button>

        <button
          style={activeTab === "completed" ? workTabActive : workTab}
          onClick={() => setActiveTab("completed")}
        >
          {activeLanguage === "es" ? "Completados" : "Completed"}
        </button>

        <button
          style={activeTab === "quotes" ? workTabActive : workTab}
          onClick={() => setActiveTab("quotes")}
        >
          {activeLanguage === "es" ? "Cotizaciones" : "Quotes"}
        </button>

        <button
          style={activeTab === "revenue" ? workTabActive : workTab}
          onClick={() => setActiveTab("revenue")}
        >
          {activeLanguage === "es" ? "Ingresos" : "Revenue"}
        </button>
      </div>

      <div style={activeTab === "revenue" ? tabNoticeHidden : tabNotice}>
        {activeTab === "pending" &&
          (activeLanguage === "es"
            ? "Mostrando solicitudes pendientes."
            : "Showing pending requests.")}

        {activeTab === "active" &&
          (activeLanguage === "es"
            ? "Mostrando trabajos activos."
            : "Showing active jobs.")}

        {activeTab === "completed" &&
          (activeLanguage === "es"
            ? "Historial de trabajos completados próximamente."
            : "Completed work history coming soon.")}

        {activeTab === "quotes" &&
          (activeLanguage === "es"
            ? "Historial de cotizaciones enviadas."
            : "Sent quote history.")}

        {activeTab === "revenue" &&
          (activeLanguage === "es"
            ? "Resumen de ingresos próximamente."
            : "Revenue summary coming soon.")}
      </div>

      {activeTab === "schedule" && (
        <div style={section}>
          <div style={sectionHeaderRow}>
            <h2 style={sectionTitle}>
              {activeLanguage === "es" ? "Agenda de trabajo" : "Work Schedule"}
            </h2>

            <button
              style={smallPrimaryButton}
              onClick={() => setShowScheduleForm((prev) => !prev)}
            >
              {showScheduleForm
                ? activeLanguage === "es"
                  ? "Cerrar"
                  : "Close"
                : activeLanguage === "es"
                ? "+ Agregar visita"
                : "+ Add Visit"}
            </button>
          </div>

          {showScheduleForm && (
            <div style={scheduleFormCard}>
              <input
                style={scheduleInput}
                placeholder={activeLanguage === "es" ? "Título de la visita" : "Visit title"}
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
                  value={scheduleForm.time}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, time: e.target.value })
                  }
                />
              </div>

              <input
                style={scheduleInput}
                placeholder={activeLanguage === "es" ? "Ubicación" : "Location"}
                value={scheduleForm.location}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, location: e.target.value })
                }
              />

              <textarea
                style={scheduleTextarea}
                placeholder={activeLanguage === "es" ? "Notas" : "Notes"}
                value={scheduleForm.notes}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, notes: e.target.value })
                }
              />

              <button style={saveScheduleButton} onClick={saveManualScheduleVisit}>
                {activeLanguage === "es" ? "Guardar visita" : "Save Visit"}
              </button>
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
                    ? "No hay visitas programadas."
                    : "No scheduled visits yet."}
                </strong>

                <p style={emptyText}>
                  {activeLanguage === "es"
                    ? "Las visitas guardadas desde el chat aparecerán aquí."
                    : "Visits saved from chat will appear here."}
                </p>
              </div>
            ) : (
              <div style={activeJobsList}>
                {scheduleItems.map((item) => (
                  <button
                    key={item.id}
                    style={jobCard}
                    onClick={() => {
                      if (item.conversationId) {
                        localStorage.setItem("activeConversationId", item.conversationId);
                        localStorage.setItem("meetroConversationType", "standard");
                        setPage("conversationThread");
                      }
                    }}
                  >
                    <div style={jobCardTop}>
                      <div>
                        <strong>{item.title}</strong>
                        <p style={jobMeta}>
                          {(item.date || "Today")} • {item.time || "Time TBD"}
                        </p>
                        <p style={jobMeta}>
                          {item.location || "Customer location"}
                        </p>
                      </div>

                      <span style={statusPill}>
                        {item.status || "Scheduled"}
                      </span>
                    </div>

                    {item.notes && (
                      <p style={jobMeta}>{item.notes}</p>
                    )}

                    <div style={scheduleCardActions}>
                      <button
                        style={deleteScheduleBtn}
                        onClick={(e) => {
                          e.stopPropagation();

                          const updatedSchedule = scheduleItems.filter(
                            (schedule) => schedule.id !== item.id
                          );

                          localStorage.setItem(
                            "meetro_business_schedule",
                            JSON.stringify(updatedSchedule)
                          );

                          setRefreshKey((prev) => prev + 1);
                        }}
                      >
                        {activeLanguage === "es" ? "Eliminar" : "Delete"}
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "pending" && (
      <div style={section}>
        <h2 style={sectionTitle}>{translate("requests")}</h2>

        {!hasPendingRequest ? (
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
                eta: project.status === "scheduled" ? "Scheduled" : "Accepted",
                status: project.status,
                source: "homeownerProject",
                project,
              }));

            const combinedActiveJobs = [...scheduledProjects, ...activeJobs];

            return combinedActiveJobs.length === 0 ? (
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
                  onClick={() => setActiveTab("pending")}
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
                        {job.status === "enroute" &&
                          (activeLanguage === "es"
                            ? "🚗 En camino al cliente"
                            : "🚗 On the way to customer")}

                        {job.status === "arrived" &&
                          (activeLanguage === "es"
                            ? "📍 Llegaste a la ubicación"
                            : "📍 Arrived at location")}

                        {job.status === "started" &&
                          (activeLanguage === "es"
                            ? "🛠️ Trabajo en progreso"
                            : "🛠️ Work in progress")}

                        {job.status === "accepted" &&
                          (activeLanguage === "es"
                            ? "💬 Cliente esperando actualización"
                            : "💬 Customer waiting for update")}

                        {job.source === "homeownerProject" &&
                          (activeLanguage === "es"
                            ? "📷 Revisa detalles y fotos del proyecto"
                            : "📷 Review project details and photos")}
                      </div>
                    </div>

                    <div style={activeEtaBox}>
                      {job.source === "homeownerProject" ? (
                        <>
                          <strong>
                            {job.status === "scheduled"
                              ? activeLanguage === "es"
                                ? "Programado"
                                : "Scheduled"
                              : activeLanguage === "es"
                              ? "Aceptado"
                              : "Accepted"}
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
                      {activeLanguage === "es" ? "Aceptado" : "Accepted"}
                    </div>

                    <div style={activeTimelineStep}>
                      <span>{["enroute","arrived","started","completed"].includes(job.status) ? "✓" : "○"}</span>
                      {activeLanguage === "es" ? "Ruta" : "Route"}
                    </div>

                    <div style={activeTimelineStep}>
                      <span>{["arrived","started","completed"].includes(job.status) ? "✓" : "○"}</span>
                      {activeLanguage === "es" ? "Llegó" : "Arrived"}
                    </div>

                    <div style={activeTimelineStep}>
                      <span>{["started","completed"].includes(job.status) ? "✓" : "○"}</span>
                      {activeLanguage === "es" ? "Inicio" : "Started"}
                    </div>

                    <div style={activeTimelineStep}>
                      <span>{job.status === "completed" ? "✓" : "○"}</span>
                      {activeLanguage === "es" ? "Final" : "Done"}
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
              <span>{activeLanguage === "es" ? "Ingresos" : "Revenue"}</span>
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
              {activeLanguage === "es" ? "Hoy" : "Today"}
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
                  🧾 {activeLanguage === "es" ? "Crear cotización" : "Create quote"}
                </button>
              </div>
            </div>
          ) : (
            <div style={quoteHistoryList}>
              {quoteHistory.map((quote) => (
                <div style={quoteHistoryCard} key={quote.quoteId}>
                  <div style={quoteHistoryTop}>
                    <div>
                      <span style={quoteStatusPill}>
                        {quote.status || "sent"}
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

      {activeTab === "revenue" && (
        <div style={section}>
          <h2 style={sectionTitle}>
            {activeLanguage === "es" ? "Ingresos" : "Revenue"}
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
                  <strong style={revenueBig}>$0</strong>
                  <div style={miniSub}>
                    {activeLanguage==="es"?"abiertas":"open"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
  padding: "18px 22px 260px",
  boxSizing: "border-box",
};

const topBar = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  width: "100%",
  marginBottom: "20px",
  paddingRight: "20px",
  boxSizing: "border-box",
};

const backButton = {
  width: "52px",
  height: "52px",
  borderRadius: "18px",
  border: "none",
  background: "white",
  fontSize: "26px",
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
};

const availabilityPill = {
  background: "#10b981",
  color: "white",
  padding: "12px 18px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "14px",
};

const header = {
  textAlign: "center",
  marginBottom: "14px",
};

const title = {
  fontSize: "38px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "6px",
};

const subtitle = {
  color: "#6b7280",
  fontSize: "16px",
};

const rolePill = {
  display: "inline-flex",
  background: "white",
  color: "#5b3df5",
  padding: "10px 16px",
  borderRadius: "999px",
  fontWeight: "900",
  marginBottom: "16px",
  boxShadow: "0 8px 18px rgba(0,0,0,0.05)",
};



const overviewGrid = {
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:"14px",
maxWidth:"900px",
margin:"0 auto 20px",
};

const overviewCard = {
background:"white",
borderRadius:"24px",
padding:"20px",
boxShadow:"0 14px 34px rgba(0,0,0,0.055)",
};

const overviewIcon={
fontSize:"32px",
marginBottom:"10px",
};

const overviewTitle={
display:"block",
fontSize:"20px",
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
padding:"8px 12px",
borderRadius:"999px",
background:"#eef2ff",
color:"#5b3df5",
fontWeight:"800",
marginBottom:"12px",
};

const miniButton={
width:"100%",
padding:"14px 16px",
border:"none",
borderRadius:"14px",
background:"#5b3df5",
color:"white",
fontWeight:"900",
cursor:"pointer",
};



const quoteHistoryList = {
  display: "grid",
  gap: "16px",
};

const quoteHistoryCard = {
  background: "white",
  borderRadius: "26px",
  padding: "20px",
  boxShadow: "0 14px 34px rgba(15,23,42,0.07)",
  border: "1px solid #eef2ff",
};

const quoteHistoryTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
};

const quoteStatusPill = {
  display: "inline-flex",
  background: "#ecfdf5",
  color: "#047857",
  padding: "7px 11px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
  textTransform: "capitalize",
};

const quoteHistoryTitle = {
  margin: "12px 0 4px",
  fontSize: "20px",
  color: "#111827",
};

const quoteHistoryMeta = {
  margin: 0,
  color: "#64748b",
  fontWeight: "800",
};

const quoteAmount = {
  fontSize: "30px",
  color: "#5b3df5",
};

const quoteHistoryText = {
  color: "#475569",
  lineHeight: 1.5,
  fontWeight: "700",
};

const quoteHistoryFooter = {
  borderTop: "1px solid #f1f5f9",
  paddingTop: "12px",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  color: "#64748b",
  fontWeight: "800",
  fontSize: "13px",
};

const workTabs = {
display:"grid",
gridTemplateColumns:"repeat(5, 1fr)",
gap:"6px",
background:"white",
padding:"6px",
borderRadius:"14px",
boxShadow:"0 10px 26px rgba(0,0,0,0.045)",
marginBottom:"18px",
};

const workTab = {
border:"none",
borderRadius:"14px",
padding:"10px 6px",
background:"transparent",
color:"#6b7280",
fontWeight:"900",
cursor:"pointer",
fontSize:"12px",
};

const workTabActive = {
border:"none",
borderRadius:"14px",
padding:"10px 6px",
background:"#5b3df5",
color:"white",
fontWeight:"900",
cursor:"pointer",
fontSize:"12px",
};



const sectionHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "14px",
};

const smallPrimaryButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: "900",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const scheduleFormCard = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "14px",
  display: "grid",
  gap: "10px",
  marginBottom: "14px",
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
  padding: "12px",
  fontSize: "14px",
  boxSizing: "border-box",
};

const scheduleTextarea = {
  ...scheduleInput,
  minHeight: "82px",
  resize: "vertical",
};

const scheduleCardActions = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: "12px",
};

const deleteScheduleBtn = {
  border: "none",
  background: "#fee2e2",
  color: "#dc2626",
  borderRadius: "12px",
  padding: "8px 12px",
  fontWeight: "800",
  cursor: "pointer",
};

const saveScheduleButton = {
  border: "none",
  background: "#111827",
  color: "white",
  borderRadius: "16px",
  padding: "13px",
  fontWeight: "900",
  cursor: "pointer",
};

const activeJobsList = {
  display: "grid",
  gap: "12px",
};

const jobCard = {
  width: "100%",
  border: "1px solid #e5e7eb",
  background: "white",
  borderRadius: "20px",
  padding: "16px",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
};

const jobCardTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
};

const jobMeta = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "14px",
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
  borderRadius: "16px",
  padding: "11px 14px",
  marginBottom: "16px",
  color: "#6b7280",
  fontWeight: "800",
  textAlign: "center",
  boxShadow: "0 8px 22px rgba(0,0,0,0.045)",
};

const section = {
  marginBottom: "36px",
};

const sectionTitle = {
  fontSize: "24px",
  fontWeight: "900",
  textAlign: "center",
  marginBottom: "16px",
  color: "#111827",
};

const emptyCard = {
  background: "white",
  borderRadius: "22px",
  padding: "22px 18px",
  textAlign: "center",
  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
};

const emptyIcon = {
  fontSize: "34px",
  marginBottom: "8px",
};

const emptyText = {
  color: "#667085",
  fontSize: "13px",
  fontWeight: "700",
  lineHeight: 1.4,
  margin: "8px 0 14px",
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
  borderRadius: "14px",
  padding: "11px",
  fontWeight: "900",
  cursor: "pointer",
  color: "#111827",
  fontSize: "12px",
};


const requestCard = {
  background: "white",
  borderRadius: "34px",
  padding: "16px",
  boxShadow: "0 18px 44px rgba(0,0,0,0.08)",
};

const liveBadge = {
  display: "inline-flex",
  background: "#fee2e2",
  color: "#b91c1c",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
  marginBottom: "18px",
};

const requestTop = {
  display: "flex",
  gap: "16px",
  alignItems: "flex-start",
  marginBottom: "18px",
};

const emergencyBadge = {
  width: "58px",
  height: "58px",
  borderRadius: "24px",
  background: "#fee2e2",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "26px",
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
  fontSize: "16px",
};

const requestMeta = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  color: "#6b7280",
  fontSize: "14px",
  fontWeight: "700",
};


const requestTimer = {
  display: "inline-flex",
  marginTop: "10px",
  background: "#fff7ed",
  color: "#c2410c",
  border: "1px solid #fed7aa",
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: "900",
};


const buttonGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
};

const acceptButton = {
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "#10b981",
  color: "white",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
};

const declineButton = {
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "#ef4444",
  color: "white",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
};

const activeJobList = {
display:"flex",
flexDirection:"column",
gap:"14px",
};

const activeJobPanel = {
background:"white",
borderRadius:"24px",
padding:"16px",
boxShadow:"0 12px 28px rgba(15,23,42,0.055)",
border:"1px solid #e5e7eb",
};

const activeJobTop = {
display:"flex",
justifyContent:"space-between",
alignItems:"flex-start",
gap:"12px",
marginBottom:"14px",
};

const activeJobBadge = {
display:"inline-flex",
padding:"6px 10px",
borderRadius:"999px",
background:"#dcfce7",
color:"#15803d",
fontWeight:"900",
fontSize:"12px",
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
  background: "#f8fafc",
  color: "#475569",
  border: "1px solid #e5e7eb",
  borderRadius: "999px",
  padding: "7px 10px",
  fontSize: "12px",
  fontWeight: "900",
};


const activeEtaBox = {
minWidth:"68px",
background:"#eef2ff",
borderRadius:"15px",
padding:"8px",
textAlign:"center",
color:"#5b3df5",
fontWeight:"900",
};

const activeTimeline = {
display:"grid",
gridTemplateColumns:"repeat(5,auto)",
gap:"6px",
marginBottom:"14px",
};


const activityChipRow = {
display:"flex",
flexWrap:"wrap",
gap:"8px",
marginBottom:"12px",
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
display:"flex",
alignItems:"center",
justifyContent:"center",
gap:"5px",
background:"#f8fafc",
border:"1px solid #e5e7eb",
borderRadius:"999px",
padding:"7px 10px",
fontSize:"11px",
fontWeight:"800",
color:"#475569",
};

const activeActions = {
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:"9px",
};

const secondaryActionButton = {
width:"100%",
padding:"11px",
borderRadius:"15px",
border:"1px solid #e5e7eb",
background:"#f8fafc",
color:"#111827",
fontWeight:"900",
fontSize:"13px",
cursor:"pointer",
};


const paymentActionButton = {
width:"100%",
padding:"11px",
borderRadius:"15px",
border:"none",
background:"#ecfdf5",
color:"#047857",
fontWeight:"900",
fontSize:"13px",
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
  borderRadius: "30px",
  padding: "16px",
  boxShadow: "0 14px 40px rgba(0,0,0,0.06)",
};

const activeHeader = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginBottom: "10px",
};

const activeDot = {
  width: "12px",
  height: "12px",
  borderRadius: "50%",
  background: "#10b981",
};

const activeLocation = {
  color: "#6b7280",
  marginBottom: "16px",
};

const acceptedStatusPill = {
  width: "100%",
  padding: "15px",
  borderRadius: "16px",
  background: "#dcfce7",
  color: "#166534",
  fontWeight: "900",
  textAlign: "center",
  marginBottom: "12px",
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
marginTop:"14px",
marginBottom:"14px",
};

const progressDots = {
display:"flex",
alignItems:"center",
justifyContent:"center",
fontWeight:"900",
color:"#5b3df5",
fontSize:"14px",
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
margin:"0 auto 16px",
display:"grid",
gridTemplateColumns:"repeat(4,1fr)",
gap:"10px",
};

const completedSummaryCard={
background:"white",
border:"1px solid #e5e7eb",
borderRadius:"16px",
padding:"14px",
boxShadow:"0 8px 20px rgba(0,0,0,0.04)",
display:"flex",
flexDirection:"column",
gap:"6px",
textAlign:"center",
};

const historyFilters={
maxWidth:"900px",
margin:"0 auto 18px",
display:"grid",
gridTemplateColumns:"1fr 1fr 1fr",
gap:"14px",
};

const historyFilterActive={
background:"#5b3df5",
border:"1px solid #5b3df5",
borderRadius:"14px",
padding:"12px",
fontWeight:"900",
color:"white",
boxShadow:"0 8px 20px rgba(91,61,245,0.18)",
cursor:"pointer",
};

const historyFilterButton={
background:"white",
border:"1px solid #e5e7eb",
borderRadius:"14px",
padding:"14px 16px",
fontWeight:"900",
color:"#374151",
boxShadow:"0 8px 20px rgba(0,0,0,0.04)",
cursor:"pointer",
};

const historyList={
maxWidth:"900px",
margin:"0 auto",
display:"flex",
flexDirection:"column",
gap:"14px",
};

const historyListCard={
background:"white",
border:"1px solid #e5e7eb",
borderRadius:"16px",
padding:"14px 16px",
boxShadow:"0 10px 24px rgba(0,0,0,0.05)",
display:"grid",
gridTemplateColumns:"48px 1.4fr 1.25fr .75fr 20px",
gap:"14px",
alignItems:"center",
cursor:"pointer",
};

const historySmallIcon={
width:"42px",
height:"42px",
borderRadius:"14px",
background:"#eef2ff",
color:"#5b3df5",
display:"flex",
alignItems:"center",
justifyContent:"center",
fontWeight:"900",
fontSize:"20px",
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
fontSize:"13px",
};

const historyRight={
display:"flex",
flexDirection:"column",
gap:"8px",
alignItems:"flex-end",
justifyContent:"center",
color:"#15803d",
fontWeight:"900",
fontSize:"15px",
minWidth:"110px",
};

const historyStatusMini={
fontSize:"13px",
fontWeight:"900",
color:"#15803d",
};

const historyArrow={
fontSize:"22px",
fontWeight:"900",
color:"#94a3b8",
cursor:"pointer",
transition:"0.25s",
};

const historyCount={
textAlign:"center",
color:"#64748b",
fontWeight:"800",
margin:"18px 0 10px",
};

const loadMoreButton={
display:"block",
margin:"0 auto",
border:"none",
borderRadius:"14px",
padding:"12px 22px",
background:"#5b3df5",
color:"white",
fontWeight:"900",
cursor:"pointer",
};

const historyCard={
background:"white",
padding:"10px",
borderRadius:"14px",
boxShadow:"0 12px 32px rgba(0,0,0,0.06)",
marginBottom:"20px",
};

const historyTop={
display:"flex",
justifyContent:"space-between",
alignItems:"flex-start",
gap:"16px",
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
fontSize:"18px",
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
borderRadius:"14px",
padding:"10px",
display:"flex",
flexDirection:"column",
gap:"6px",
color:"#64748b",
fontWeight:"800",
};

const historyTitle={
fontSize:"16px",
fontWeight:"900",
display:"block",
marginBottom:"2px",
};

const historyMeta={
color:"#6b7280",
margin:"0",
};

const historyStatus={
marginTop:"14px",
padding:"14px 16px",
background:"#dcfce7",
borderRadius:"14px",
fontWeight:"900",
textAlign:"center",
color:"#166534",
};


const revenueHeroGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "18px",
  marginBottom: "18px",
};

const revenueHeroCardBlue = {
  position: "relative",
  overflow: "hidden",
  minHeight: "120px",
  borderRadius: "30px",
  padding: "16px",
  background:
    "linear-gradient(135deg,#EEF4FF,#E2E8F0)",
  border: "1px solid rgba(147,197,253,0.65)",
  boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
};

const revenueHeroCardPurple = {
  position: "relative",
  overflow: "hidden",
  minHeight: "120px",
  borderRadius: "30px",
  padding: "16px",
  background:
    "linear-gradient(135deg,#F8FAFC,#EEF2FF)",
  border: "1px solid rgba(196,181,253,0.7)",
  boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
};

const revenueHeroContent = {
  display: "flex",
  alignItems: "flex-start",
  gap: "18px",
  position: "relative",
  zIndex: 2,
};

const revenueIconTile = {
  width: "58px",
  height: "58px",
  borderRadius: "24px",
  background:"rgba(255,255,255,.92)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "26px",
  boxShadow:"0 8px 18px rgba(0,0,0,.08)",
  flexShrink: 0,
};

const revenueHeroBig = {
  display: "block",
  fontSize: "38px",
  fontWeight: "900",
  color: "#0f172a",
  letterSpacing: "-1.5px",
  lineHeight: 1,
  marginTop: "2px",
};

const revenueSubText = {
marginTop:"14px",
fontSize:"12px",
fontWeight:"700",
color:"#64748b",
};

const revenueTrend = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: "4px",
  padding: "7px 14px",
  borderRadius: "999px",
  background: "rgba(220,252,231,0.9)",
  color: "#15803d",
  fontSize: "14px",
  fontWeight: "900",
};

const revenueFakeLine = {
  position: "absolute",
  right: "26px",
  bottom: "24px",
  fontSize: "58px",
  fontWeight: "900",
  color: "rgba(91,61,245,0.45)",
  letterSpacing: "-8px",
  transform: "rotate(-8deg)",
};

const revenueGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "16px",
};

const revenueMiniCard = {
  background:"#F8FAFC",
  border: "1px solid rgba(226,232,240,0.92)",
  borderRadius: "28px",
  padding: "16px",
  boxShadow: "0 14px 34px rgba(15,23,42,0.06)",
  minHeight: "120px",
  display: "flex",
  alignItems: "center",
  gap: "18px",
};

const revenueBig = {
  display: "block",
  fontSize: "38px",
  fontWeight: "900",
  color: "#111827",
  lineHeight: 1,
  marginTop: "8px",
};

const miniSub={
marginTop:"6px",
fontSize:"13px",
fontWeight:"700",
color:"#64748b",
};

const revenueLabel = {
  display: "block",
  color: "#1f2937",
  fontWeight: "900",
  fontSize: "14px",
};

const revenueCard = {
  background:"rgba(255,255,255,.92)",
  borderRadius: "32px",
  padding: "22px",
  boxShadow: "0 18px 48px rgba(15,23,42,0.06)",
};

const dispatchButton = {
  width: "100%",
  padding: "13px",
  borderRadius: "16px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontWeight: "900",
  fontSize: "14px",
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(91,61,245,0.22)",
};

export default ContractorDashboard;
