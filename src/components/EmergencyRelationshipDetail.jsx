import EmergencyTimeline from "./EmergencyTimeline";
import RelationshipIdentityPage from "./RelationshipIdentityPage";
import {
  getEmergencyRelationshipNextStep,
  getEmergencySpecialtyDisplayLabel,
  getEmergencyWorkCenterStatusLabel,
} from "../utils/emergencySummary";

function formatTimestamp(value, language) {
  if (!value) return "";

  return new Intl.DateTimeFormat(
    language === "es" ? "es-US" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(value));
}

function initialsFor(value = "") {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function titleize(value = "") {
  return String(value || "")
    .trim()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function EmergencyConversationContextPanel({
  detail,
  language = "en",
}) {
  if (!detail || detail.type !== "emergency") return null;

  const copy = language === "es"
    ? {
        eyebrow: "Contexto de Emergencia",
        relationship: "Relación",
        customer: "Cliente",
        professional: "Profesional seleccionado",
        category: "Categoría del negocio",
        request: "Solicitud",
        service: "Servicio",
        domain: "Área de servicio",
        progress: "Progreso de Emergencia",
        nextStep: "Qué sucede después",
        location: "Ubicación y acceso al servicio",
        unit: "Unidad / Apartamento / Suite",
        access: "Notas de acceso",
        professionalFallback: "Profesional Seleccionado",
        customerFallback: "Cliente",
      }
    : {
        eyebrow: "Emergency Context",
        relationship: "Relationship",
        customer: "Customer",
        professional: "Selected Professional",
        category: "Business category",
        request: "Request",
        service: "Service",
        domain: "Service area",
        progress: "Emergency progress",
        nextStep: "What happens next",
        location: "Service location and access",
        unit: "Unit / Apt / Suite",
        access: "Access notes",
        professionalFallback: "Selected Professional",
        customerFallback: "Customer",
      };
  const relationship = detail.relationship || {};
  const source = relationship.source || {};
  const workflow = detail.workflow || {};
  const participants = detail.participants || {};
  const business = participants.business || {};
  const homeowner = participants.homeowner || {};
  const title = String(relationship.title || source.title || "Emergency").trim();
  const status = String(workflow.status || "").trim();
  const statusLabel = getEmergencyWorkCenterStatusLabel(status, language);
  const nextStep = getEmergencyRelationshipNextStep(status, language);
  const serviceSpecialty = String(source.serviceSpecialty || "").trim();
  const serviceDomain = String(source.serviceDomain || "").trim();
  const businessName = String(business.name || "").trim() || copy.professionalFallback;
  const customerName = String(homeowner.displayName || "").trim() || copy.customerFallback;
  const businessCategory = String(business.category || "").trim();
  const location = detail.location || null;
  const timelineRequest = {
    status,
    assignedAt: workflow.assignedAt || null,
    enRouteAt: workflow.enRouteAt || null,
    arrivedAt: workflow.arrivedAt || null,
    workStartedAt: workflow.workStartedAt || null,
    completedAt: workflow.completedAt || null,
  };

  return (
    <div
      style={conversationContextShell}
      data-emergency-conversation-context="canonical"
    >
      <header style={conversationContextHeader}>
        <p style={conversationContextEyebrow}>{copy.eyebrow}</p>
        <h2 style={conversationContextTitle}>{title}</h2>
        {statusLabel && (
          <strong style={conversationContextStatus}>{statusLabel}</strong>
        )}
      </header>

      <section style={conversationContextSection}>
        <h3 style={conversationContextSectionTitle}>{copy.relationship}</h3>
        <div style={conversationContextFacts}>
          <div style={conversationContextFact}>
            <span>{copy.customer}</span>
            <strong>{customerName}</strong>
          </div>
          <div style={conversationContextFact}>
            <span>{copy.professional}</span>
            <strong>{businessName}</strong>
          </div>
          {businessCategory && (
            <div style={conversationContextFact}>
              <span>{copy.category}</span>
              <strong>{titleize(businessCategory)}</strong>
            </div>
          )}
        </div>
      </section>

      {(serviceSpecialty || serviceDomain) && (
        <section style={conversationContextSection}>
          <h3 style={conversationContextSectionTitle}>{copy.request}</h3>
          <div style={conversationContextFacts}>
            {serviceSpecialty && (
              <div style={conversationContextFact}>
                <span>{copy.service}</span>
                <strong>
                  {getEmergencySpecialtyDisplayLabel(serviceSpecialty, language)}
                </strong>
              </div>
            )}
            {serviceDomain && (
              <div style={conversationContextFact}>
                <span>{copy.domain}</span>
                <strong>{titleize(serviceDomain)}</strong>
              </div>
            )}
          </div>
        </section>
      )}

      <section style={conversationContextSection}>
        <h3 style={conversationContextSectionTitle}>{copy.progress}</h3>
        <EmergencyTimeline
          emergencyRequest={timelineRequest}
          language={language}
        />
      </section>

      {nextStep && (
        <section style={conversationContextNextStep}>
          <h3 style={conversationContextSectionTitle}>{copy.nextStep}</h3>
          <p style={conversationContextText}>{nextStep}</p>
        </section>
      )}

      {location &&
        (location.locationText || location.unitNumber || location.accessNotes) && (
          <section style={conversationContextSection}>
            <h3 style={conversationContextSectionTitle}>{copy.location}</h3>
            {location.locationText && (
              <address style={conversationContextAddress}>
                {location.locationText}
              </address>
            )}
            <div style={conversationContextFacts}>
              {location.unitNumber && (
                <div style={conversationContextFact}>
                  <span>{copy.unit}</span>
                  <strong>{location.unitNumber}</strong>
                </div>
              )}
              {location.accessNotes && (
                <div style={conversationContextFact}>
                  <span>{copy.access}</span>
                  <strong>{location.accessNotes}</strong>
                </div>
              )}
            </div>
          </section>
        )}
    </div>
  );
}

function EmergencyRelationshipDetail({
  detail,
  language = "en",
  responsesPhase = "idle",
  selectionPending = false,
  cancellationAvailable = false,
  mutationPending = false,
  onBack,
  onOpenConversation,
  onSelectResponse,
  onCancelRequest,
  workflowAction,
}) {
  if (!detail) return null;

  const text = {
    en: {
      back: "Back to My Requests",
      eyebrow: "Emergency Relationship",
      service: "Service",
      requestDetails: "Request details",
      requestCategory: "Request category",
      status: "Current status",
      businessCategory: "Business category",
      selectedType: "Selected Professional",
      selectedStatus: "Connected to this Emergency request",
      selectedIntro:
        "This identity comes from the active professional relationship for this Emergency request.",
      waitingName: "Waiting for a Professional",
      waitingType: "Relationship Status",
      waitingIntro:
        "No professional relationship is shown until Meetro confirms a selection.",
      openConversation: "Review Conversation",
      lifecycle: "Emergency progress",
      nextStep: "What happens next",
      location: "Service location and access",
      unit: "Unit / Apt / Suite",
      access: "Access notes",
      responses: "Professional responses",
      responsesLoading: "Loading professional responses…",
      responsesError:
        "Professional responses are temporarily unavailable. The confirmed Emergency details remain visible.",
      responsesEmpty: "No professional responses are available yet.",
      selectProfessional: "Select Professional",
      selected: "Selected",
      cancelRequest: "Cancel Emergency Request",
      completionTitle: "Emergency Work Completed",
      completionBody:
        "This completion state comes from the canonical Emergency lifecycle.",
    },
    es: {
      back: "Volver a Mis Solicitudes",
      eyebrow: "Relación de Emergencia",
      service: "Servicio",
      requestDetails: "Detalles de la solicitud",
      requestCategory: "Categoría de la solicitud",
      status: "Estado actual",
      businessCategory: "Categoría del negocio",
      selectedType: "Profesional Seleccionado",
      selectedStatus:
        "Conectado a esta solicitud de Emergencia",
      selectedIntro:
        "Esta identidad proviene de la relación profesional activa para esta solicitud de Emergencia.",
      waitingName: "Esperando a un Profesional",
      waitingType: "Estado de la Relación",
      waitingIntro:
        "No se muestra una relación profesional hasta que Meetro confirme una selección.",
      openConversation: "Revisar conversación",
      lifecycle: "Progreso de Emergencia",
      nextStep: "Qué sucede después",
      location: "Ubicación y acceso al servicio",
      unit: "Unidad / Apartamento / Suite",
      access: "Notas de acceso",
      responses: "Respuestas de profesionales",
      responsesLoading: "Cargando respuestas de profesionales…",
      responsesError:
        "Las respuestas no están disponibles temporalmente. Los detalles confirmados de Emergencia siguen visibles.",
      responsesEmpty:
        "Todavía no hay respuestas de profesionales disponibles.",
      selectProfessional: "Seleccionar Profesional",
      selected: "Seleccionado",
      cancelRequest: "Cancelar Solicitud de Emergencia",
      completionTitle: "Trabajo de Emergencia Completado",
      completionBody:
        "Este estado de finalización proviene del ciclo de vida canónico de Emergencia.",
    },
  };
  const copy = text[language] || text.en;
  const professional = detail.selectedProfessional;
  const identityName = professional
    ? professional.displayName
    : copy.waitingName;
  const identityActions =
    detail.conversation.available &&
    typeof onOpenConversation === "function"
      ? [
          {
            label: copy.openConversation,
            primary: true,
            onClick: onOpenConversation,
          },
        ]
      : [];
  const identityDetails = [
    {
      label: copy.service,
      value: detail.serviceSpecialtyLabel,
    },
    {
      label: copy.status,
      value: detail.statusLabel,
    },
    {
      label: copy.businessCategory,
      value: professional?.category,
      span: "wide",
    },
  ].filter((item) => String(item.value || "").trim());
  const showResponses =
    responsesPhase !== "idle" ||
    detail.responseCards.length > 0;

  return (
    <section
      style={relationshipShell}
      aria-label={copy.eyebrow}
      data-emergency-relationship-detail="canonical"
    >
      <button
        type="button"
        style={backButton}
        onClick={onBack}
      >
        <span aria-hidden="true">←</span>
        <span>{copy.back}</span>
      </button>

      <header style={relationshipHeader}>
        <p style={eyebrow}>{copy.eyebrow}</p>
        <h1 style={relationshipTitle}>{detail.title}</h1>
        <p style={serviceLabel}>
          {detail.serviceSpecialtyLabel}
          {detail.serviceDomainLabel
            ? " · " + detail.serviceDomainLabel
            : ""}
        </p>
        <strong style={statusPill}>
          {detail.statusLabel}
        </strong>
      </header>

      <RelationshipIdentityPage
        identity={{
          displayName: identityName,
          typeLabel: professional
            ? copy.selectedType
            : copy.waitingType,
          avatar: professional?.logoUrl || "",
          initials:
            initialsFor(identityName) ||
            (professional ? "SP" : "M"),
          meta: professional?.category || "",
          status: professional
            ? copy.selectedStatus
            : detail.statusLabel,
        }}
        intro={
          professional
            ? copy.selectedIntro
            : copy.waitingIntro
        }
        details={identityDetails}
        actions={identityActions}
        afterActions={
          <div style={detailBody}>
            {(detail.description || detail.categoryLabel) && (
              <section
                style={detailSection}
                aria-labelledby="emergency-relationship-request-details"
              >
                <h2
                  id="emergency-relationship-request-details"
                  style={sectionTitle}
                >
                  {copy.requestDetails}
                </h2>
                {detail.description && (
                  <p style={requestDescription}>
                    {detail.description}
                  </p>
                )}
                {detail.categoryLabel && (
                  <p style={locationRow}>
                    <span>{copy.requestCategory}</span>
                    <strong>{detail.categoryLabel}</strong>
                  </p>
                )}
              </section>
            )}

            <section
              style={detailSection}
              aria-labelledby="emergency-relationship-progress"
            >
              <h2
                id="emergency-relationship-progress"
                style={sectionTitle}
              >
                {copy.lifecycle}
              </h2>
              <EmergencyTimeline
                emergencyRequest={detail.timelineRequest}
                language={language}
              />
            </section>

            <section
              style={nextStepCard}
              aria-labelledby="emergency-relationship-next-step"
            >
              <h2
                id="emergency-relationship-next-step"
                style={sectionTitle}
              >
                {copy.nextStep}
              </h2>
              <p style={sectionText}>{detail.nextStep}</p>
              {String(workflowAction?.label || "").trim() &&
                typeof workflowAction?.onClick === "function" && (
                  <button
                    type="button"
                    style={{
                      ...workflowActionButton,
                      ...(mutationPending
                        ? disabledAction
                        : {}),
                    }}
                    disabled={mutationPending}
                    onClick={workflowAction.onClick}
                  >
                    {workflowAction.label}
                  </button>
                )}
            </section>

            {detail.location && (
              <section
                style={detailSection}
                aria-labelledby="emergency-relationship-location"
              >
                <h2
                  id="emergency-relationship-location"
                  style={sectionTitle}
                >
                  {copy.location}
                </h2>
                {detail.location.locationText && (
                  <address style={locationValue}>
                    {detail.location.locationText}
                  </address>
                )}
                {detail.location.unitNumber && (
                  <p style={locationRow}>
                    <span>{copy.unit}</span>
                    <strong>{detail.location.unitNumber}</strong>
                  </p>
                )}
                {detail.location.accessNotes && (
                  <p style={locationRow}>
                    <span>{copy.access}</span>
                    <strong>{detail.location.accessNotes}</strong>
                  </p>
                )}
              </section>
            )}

            {showResponses && (
              <section
                style={detailSection}
                aria-labelledby="emergency-relationship-responses"
              >
                <h2
                  id="emergency-relationship-responses"
                  style={sectionTitle}
                >
                  {copy.responses}
                </h2>

                {responsesPhase === "loading" && (
                  <p style={sectionText}>
                    {copy.responsesLoading}
                  </p>
                )}

                {responsesPhase === "error" && (
                  <p style={responseError} role="alert">
                    {copy.responsesError}
                  </p>
                )}

                {responsesPhase === "ready" &&
                  detail.responseCards.length === 0 && (
                    <p style={sectionText}>
                      {copy.responsesEmpty}
                    </p>
                  )}

                {detail.responseCards.map((response) => (
                  <article
                    key={response.id}
                    style={responseCard}
                  >
                    <div style={responseIdentity}>
                      <div style={responseAvatar} aria-hidden="true">
                        {response.logoUrl ? (
                          <img
                            src={response.logoUrl}
                            alt=""
                            style={responseAvatarImage}
                          />
                        ) : (
                          initialsFor(response.businessName) ||
                          "M"
                        )}
                      </div>
                      <div style={responseText}>
                        <strong style={responseName}>
                          {response.businessName}
                        </strong>
                        {response.category && (
                          <span style={responseCategory}>
                            {response.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {response.status === "pending" ? (
                      <button
                        type="button"
                        style={responseAction}
                        disabled={selectionPending}
                        onClick={() =>
                          onSelectResponse?.(response.id)
                        }
                      >
                        {copy.selectProfessional}
                      </button>
                    ) : (
                      <strong style={selectedPill}>
                        {copy.selected}
                      </strong>
                    )}
                  </article>
                ))}
              </section>
            )}

            {detail.completed && (
              <section
                style={completionCard}
                aria-labelledby="emergency-relationship-completion"
              >
                <h2
                  id="emergency-relationship-completion"
                  style={sectionTitle}
                >
                  {copy.completionTitle}
                </h2>
                <p style={sectionText}>{copy.completionBody}</p>
                {detail.completedAt && (
                  <time
                    style={completionTimestamp}
                    dateTime={detail.completedAt}
                  >
                    {formatTimestamp(
                      detail.completedAt,
                      language
                    )}
                  </time>
                )}
              </section>
            )}

            {cancellationAvailable &&
              typeof onCancelRequest === "function" && (
                <button
                  type="button"
                  style={{
                    ...cancelAction,
                    ...(mutationPending
                      ? disabledAction
                      : {}),
                  }}
                  disabled={mutationPending}
                  onClick={onCancelRequest}
                >
                  {copy.cancelRequest}
                </button>
              )}
          </div>
        }
      />
    </section>
  );
}

export default EmergencyRelationshipDetail;

const relationshipShell = {
  width: "100%",
  maxWidth: "760px",
  minWidth: 0,
  margin: "0 auto",
  boxSizing: "border-box",
  overflowX: "hidden",
};

const conversationContextShell = {
  display: "grid",
  gap: "14px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflowX: "hidden",
};

const conversationContextHeader = {
  display: "grid",
  gap: "8px",
  minWidth: 0,
  padding: "4px 2px 14px",
};

const conversationContextEyebrow = {
  margin: 0,
  color: "#991b1b",
  fontSize: "11px",
  fontWeight: "950",
  letterSpacing: "0.09em",
  textTransform: "uppercase",
};

const conversationContextTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "20px",
  lineHeight: 1.15,
  fontWeight: "950",
  overflowWrap: "anywhere",
};

const conversationContextStatus = {
  justifySelf: "start",
  maxWidth: "100%",
  padding: "7px 10px",
  border: "1px solid #fca5a5",
  borderRadius: "999px",
  background: "#fee2e2",
  color: "#991b1b",
  fontSize: "12px",
  lineHeight: 1.3,
  overflowWrap: "anywhere",
};

const conversationContextSection = {
  display: "grid",
  gap: "10px",
  minWidth: 0,
  paddingTop: "14px",
  borderTop: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
};

const conversationContextNextStep = {
  ...conversationContextSection,
  padding: "14px",
  border: "1px solid #bfdbfe",
  borderRadius: "18px",
  background: "#eff6ff",
};

const conversationContextSectionTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "14px",
  lineHeight: 1.3,
  fontWeight: "950",
};

const conversationContextFacts = {
  display: "grid",
  gap: "8px",
  minWidth: 0,
};

const conversationContextFact = {
  display: "grid",
  gap: "3px",
  minWidth: 0,
  color: "#64748b",
  fontSize: "11px",
  lineHeight: 1.4,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const conversationContextText = {
  margin: 0,
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.5,
  overflowWrap: "anywhere",
};

const conversationContextAddress = {
  margin: 0,
  color: "#0f172a",
  fontSize: "13px",
  fontStyle: "normal",
  fontWeight: "900",
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const backButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  minHeight: "48px",
  marginBottom: "14px",
  padding: "10px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: "16px",
  background: "#ffffff",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "14px",
  fontWeight: "900",
  cursor: "pointer",
};

const workflowActionButton = {
  width: "100%",
  minWidth: 0,
  minHeight: "48px",
  marginTop: "12px",
  padding: "12px 16px",
  border: "1px solid var(--meetro-color-forest, #1f4d34)",
  borderRadius: "16px",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "900",
  cursor: "pointer",
  boxSizing: "border-box",
  overflowWrap: "anywhere",
};

const relationshipHeader = {
  display: "grid",
  gap: "8px",
  minWidth: 0,
  marginBottom: "16px",
  padding: "22px",
  border: "1px solid #fecaca",
  borderRadius: "24px",
  background:
    "linear-gradient(145deg, #fff7f7, #ffffff)",
  boxShadow: "0 12px 30px rgba(127, 29, 29, 0.08)",
  boxSizing: "border-box",
  overflowWrap: "anywhere",
};

const eyebrow = {
  margin: 0,
  color: "#991b1b",
  fontSize: "12px",
  fontWeight: "950",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const relationshipTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "clamp(28px, 8vw, 40px)",
  lineHeight: 1.08,
  fontWeight: "950",
  overflowWrap: "anywhere",
};

const serviceLabel = {
  margin: 0,
  color: "#475569",
  fontSize: "15px",
  fontWeight: "800",
  lineHeight: 1.45,
  overflowWrap: "anywhere",
};

const statusPill = {
  justifySelf: "start",
  maxWidth: "100%",
  padding: "8px 11px",
  border: "1px solid #fca5a5",
  borderRadius: "999px",
  background: "#fee2e2",
  color: "#991b1b",
  fontSize: "13px",
  lineHeight: 1.3,
  overflowWrap: "anywhere",
};

const detailBody = {
  display: "grid",
  gap: "12px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const detailSection = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  padding: "16px",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  background: "#ffffff",
  boxSizing: "border-box",
  overflowWrap: "anywhere",
};

const nextStepCard = {
  ...detailSection,
  borderColor: "#bfdbfe",
  background: "#eff6ff",
};

const completionCard = {
  ...detailSection,
  borderColor: "#86efac",
  background: "#f0fdf4",
};

const sectionTitle = {
  margin: "0 0 10px",
  color: "#0f172a",
  fontSize: "18px",
  lineHeight: 1.25,
  fontWeight: "950",
};

const sectionText = {
  margin: 0,
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.55,
  overflowWrap: "anywhere",
};

const requestDescription = {
  ...sectionText,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const locationValue = {
  margin: "0 0 10px",
  color: "#0f172a",
  fontSize: "15px",
  fontStyle: "normal",
  fontWeight: "900",
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const locationRow = {
  display: "grid",
  gap: "3px",
  minWidth: 0,
  margin: "10px 0 0",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.45,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const responseError = {
  ...sectionText,
  color: "#991b1b",
};

const responseCard = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "12px",
  minWidth: 0,
  marginTop: "10px",
  padding: "12px",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  background: "#f8fafc",
  boxSizing: "border-box",
};

const responseIdentity = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
  flex: "1 1 180px",
};

const responseAvatar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  width: "46px",
  height: "46px",
  borderRadius: "15px",
  overflow: "hidden",
  background: "#e2e8f0",
  color: "#1f4d34",
  fontSize: "13px",
  fontWeight: "950",
};

const responseAvatarImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const responseText = {
  display: "grid",
  gap: "3px",
  minWidth: 0,
};

const responseName = {
  color: "#0f172a",
  fontSize: "14px",
  lineHeight: 1.35,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const responseCategory = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};

const responseAction = {
  flex: "1 1 150px",
  minHeight: "48px",
  padding: "11px 14px",
  border: 0,
  borderRadius: "14px",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: "900",
  cursor: "pointer",
};

const selectedPill = {
  padding: "8px 10px",
  border: "1px solid #86efac",
  borderRadius: "999px",
  background: "#dcfce7",
  color: "#166534",
  fontSize: "12px",
};

const completionTimestamp = {
  display: "block",
  marginTop: "8px",
  color: "#166534",
  fontSize: "13px",
  fontWeight: "800",
};

const cancelAction = {
  minHeight: "48px",
  width: "100%",
  padding: "12px 16px",
  border: "1px solid #fecaca",
  borderRadius: "16px",
  background: "#fff7f7",
  color: "#991b1b",
  fontSize: "14px",
  fontWeight: "900",
  cursor: "pointer",
  boxSizing: "border-box",
};

const disabledAction = {
  opacity: 0.65,
  cursor: "not-allowed",
};
