import MeetroIcon from "./MeetroIcon";

function clean(value) {
  return String(value ?? "").trim();
}

function titleize(value) {
  return clean(value)
    .split("_")
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function initialsFor(value) {
  return clean(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");
}

function EmergencyAvailableNow({
  visible = false,
  phase = "idle",
  professionals = [],
  selectionPending = false,
  errorMessage = "",
  language = "en",
  onViewProfile,
  onChooseProfessional,
  onKeepWaiting,
}) {
  if (!visible) return null;

  const copy =
    language === "es"
      ? {
          eyebrow: "Buscar Ayuda de Emergencia",
          title: "Disponibles Ahora",
          intro:
            "Estos negocios están disponibles para selección directa de Emergencia. No significa que ya hayan respondido ni que estén en camino.",
          loading:
            "Buscando profesionales disponibles ahora…",
          empty:
            "No hay profesionales Disponibles Ahora en este momento.",
          emptyHelp:
            "Los profesionales aún pueden responder a tu solicitud. Sus respuestas aparecerán abajo.",
          error:
            "Los profesionales Disponibles Ahora no se pudieron cargar. Las respuestas profesionales todavía pueden aparecer abajo.",
          badge: "DISPONIBLE AHORA",
          area: "Área de servicio",
          viewProfile: "Ver perfil",
          choose: "Elegir Profesional",
          choosing: "Conectando…",
          responsesTitle: "Respuestas de Profesionales",
          responsesBody:
            "Los profesionales que respondan directamente a tu solicitud aparecerán por separado abajo.",
          keepWaiting: "Seguir Esperando",
        }
      : {
          eyebrow: "Find Emergency Help",
          title: "Available Now",
          intro:
            "These businesses are available for direct Emergency selection. This does not mean they already responded or are on the way.",
          loading:
            "Checking for professionals who are available now…",
          empty:
            "No Available Now professionals are shown right now.",
          emptyHelp:
            "Professionals can still respond to your request. Their responses will appear below.",
          error:
            "Available Now professionals could not be loaded. Professional responses may still appear below.",
          badge: "AVAILABLE NOW",
          area: "Service area",
          viewProfile: "View Profile",
          choose: "Choose Professional",
          choosing: "Connecting…",
          responsesTitle: "Professional Responses",
          responsesBody:
            "Professionals who respond directly to your request appear separately below.",
          keepWaiting: "Keep Waiting",
        };

  const cards = Array.isArray(professionals)
    ? professionals
    : [];

  return (
    <section
      style={shell}
      aria-labelledby="emergency-available-now-title"
      data-emergency-available-now="canonical"
    >
      <header style={header}>
        <span style={availableIconTile} aria-hidden="true">
          <MeetroIcon
            name="availableNow"
            size={20}
            decorative
          />
        </span>

        <div style={headerCopy}>
          <p style={eyebrow}>{copy.eyebrow}</p>
          <h2
            id="emergency-available-now-title"
            style={title}
          >
            {copy.title}
          </h2>
          <p style={intro}>{copy.intro}</p>
        </div>
      </header>

      {(phase === "idle" ||
        phase === "loading") && (
        <p style={notice}>{copy.loading}</p>
      )}

      {phase === "error" && (
        <div style={errorNotice} role="alert">
          <strong>{copy.error}</strong>
          {clean(errorMessage) && (
            <span style={errorDetail}>
              {clean(errorMessage)}
            </span>
          )}
        </div>
      )}

      {phase === "ready" &&
        cards.length === 0 && (
          <div style={emptyCard}>
            <strong>{copy.empty}</strong>
            <p style={emptyText}>
              {copy.emptyHelp}
            </p>
          </div>
        )}

      {cards.length > 0 && (
        <div style={cardStack}>
          {cards.map((professional) => {
            const businessName =
              clean(professional.businessName) ||
              (language === "es"
                ? "Profesional"
                : "Professional");
            const specialty =
              clean(
                professional.serviceSpecialties?.[0]
              ) ||
              clean(professional.category);
            const imageUrl =
              clean(professional.profileImageUrl);
            const serviceArea =
              clean(professional.serviceArea);

            return (
              <article
                key={professional.contractorProfileId}
                style={professionalCard}
              >
                <div style={cardHeader}>
                  <div style={identity}>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        style={avatarImage}
                      />
                    ) : (
                      <div
                        style={avatarFallback}
                        aria-hidden="true"
                      >
                        {initialsFor(businessName) ||
                          "M"}
                      </div>
                    )}

                    <div style={identityText}>
                      <strong style={businessNameStyle}>
                        {businessName}
                      </strong>

                      {specialty && (
                        <span style={category}>
                          {titleize(specialty)}
                        </span>
                      )}
                    </div>
                  </div>

                  <span style={availableBadge}>
                    {copy.badge}
                  </span>
                </div>

                {serviceArea && (
                  <div style={serviceAreaRow}>
                    <span style={serviceAreaLabel}>
                      <MeetroIcon
                        name="location"
                        size={16}
                        decorative
                      />
                      <span>{copy.area}</span>
                    </span>
                    <strong>{serviceArea}</strong>
                  </div>
                )}

                <div style={actionRow}>
                  <button
                    type="button"
                    style={profileButton}
                    disabled={selectionPending}
                    onClick={() =>
                      onViewProfile?.(
                        professional.contractorProfileId
                      )
                    }
                  >
                    {copy.viewProfile}
                  </button>

                  <button
                    type="button"
                    style={{
                      ...chooseButton,
                      ...(selectionPending
                        ? disabledButton
                        : {}),
                    }}
                    disabled={selectionPending}
                    onClick={() =>
                      onChooseProfessional?.(
                        professional.contractorProfileId
                      )
                    }
                  >
                    {selectionPending
                      ? copy.choosing
                      : copy.choose}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div style={responsesSummary}>
        <div style={responsesNote}>
          <span style={responsesIconTile} aria-hidden="true">
            <MeetroIcon
              name="customerRelationships"
              size={18}
              decorative
            />
          </span>

          <div style={responsesText}>
            <strong>{copy.responsesTitle}</strong>
            <p style={responsesTextParagraph}>{copy.responsesBody}</p>
          </div>
        </div>

        <button
          type="button"
          style={waitButton}
          disabled={selectionPending}
          onClick={() => onKeepWaiting?.()}
        >
          {copy.keepWaiting}
        </button>
      </div>
    </section>
  );
}

const shell = {
  marginBottom: "12px",
  padding: "14px",
  border: "1px solid var(--meetro-color-line, #E5E7EB)",
  borderRadius: "18px",
  background: "var(--meetro-surface-paper, #FFFFFF)",
  boxShadow:
    "0 8px 24px rgba(17, 24, 39, 0.05)",
};

const header = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  minWidth: 0,
  marginBottom: "12px",
};

const headerCopy = {
  display: "grid",
  gap: "3px",
  minWidth: 0,
  flex: 1,
};

const availableIconTile = {
  width: "40px",
  height: "40px",
  borderRadius: "14px",
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
  background:
    "var(--meetro-color-sage, #E8F5EE)",
  color:
    "var(--meetro-color-forest, #0B5D3B)",
};

const eyebrow = {
  margin: 0,
  color:
    "var(--meetro-color-forest, #0B5D3B)",
  fontSize: "11px",
  lineHeight: 1.2,
  fontWeight: "900",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const title = {
  margin: 0,
  color:
    "var(--meetro-color-ink, #111827)",
  fontSize: "24px",
  lineHeight: 1.15,
  fontWeight: "900",
};

const intro = {
  margin: 0,
  color:
    "var(--meetro-color-muted, #6B7280)",
  fontSize: "13px",
  lineHeight: 1.4,
};

const notice = {
  margin: 0,
  padding: "12px",
  borderRadius: "14px",
  background:
    "var(--meetro-surface-warm, #F7F6F2)",
  color:
    "var(--meetro-color-muted, #6B7280)",
  fontSize: "13px",
  lineHeight: 1.4,
};

const errorNotice = {
  display: "grid",
  gap: "4px",
  padding: "12px",
  borderRadius: "14px",
  background: "rgba(245, 158, 11, 0.10)",
  color:
    "var(--meetro-color-warning, #F59E0B)",
  fontSize: "13px",
};

const errorDetail = {
  color:
    "var(--meetro-color-muted, #6B7280)",
  fontSize: "12px",
  fontWeight: "600",
};

const emptyCard = {
  padding: "12px",
  border:
    "1px solid var(--meetro-color-line, #E5E7EB)",
  borderRadius: "14px",
  background:
    "var(--meetro-surface-warm, #F7F6F2)",
  color:
    "var(--meetro-color-ink, #111827)",
  fontSize: "13px",
};

const emptyText = {
  margin: "4px 0 0",
  color:
    "var(--meetro-color-muted, #6B7280)",
  fontSize: "12px",
  lineHeight: 1.35,
};

const cardStack = {
  display: "grid",
  gap: "10px",
};

const professionalCard = {
  padding: "12px",
  border:
    "1px solid var(--meetro-color-line, #E5E7EB)",
  borderRadius: "14px",
  background:
    "var(--meetro-surface-paper, #FFFFFF)",
};

const cardHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
};

const identity = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
};

const identityText = {
  display: "grid",
  gap: "2px",
  minWidth: 0,
};

const avatarImage = {
  width: "44px",
  height: "44px",
  borderRadius: "14px",
  objectFit: "cover",
  flex: "0 0 auto",
};

const avatarFallback = {
  width: "44px",
  height: "44px",
  borderRadius: "14px",
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
  background:
    "var(--meetro-color-sage, #E8F5EE)",
  color:
    "var(--meetro-color-forest, #0B5D3B)",
  fontSize: "13px",
  fontWeight: "900",
};

const businessNameStyle = {
  overflowWrap: "anywhere",
  color:
    "var(--meetro-color-ink, #111827)",
  fontSize: "16px",
  lineHeight: 1.25,
};

const category = {
  color:
    "var(--meetro-color-muted, #6B7280)",
  fontSize: "12px",
  lineHeight: 1.3,
};

const availableBadge = {
  flex: "0 0 auto",
  padding: "5px 8px",
  borderRadius: "999px",
  background:
    "var(--meetro-color-sage, #E8F5EE)",
  color:
    "var(--meetro-color-forest, #0B5D3B)",
  fontSize: "10px",
  lineHeight: 1.15,
  fontWeight: "900",
  letterSpacing: "0.035em",
};

const serviceAreaRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  minHeight: "36px",
  marginTop: "10px",
  paddingTop: "9px",
  borderTop:
    "1px solid var(--meetro-color-line, #E5E7EB)",
  color:
    "var(--meetro-color-muted, #6B7280)",
  fontSize: "12px",
};

const serviceAreaLabel = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  minWidth: 0,
  color:
    "var(--meetro-color-forest, #0B5D3B)",
};

const actionRow = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, .9fr) minmax(0, 1.1fr)",
  gap: "8px",
  marginTop: "10px",
};

const profileButton = {
  width: "100%",
  minHeight: "44px",
  margin: 0,
  padding: "9px 10px",
  border:
    "1px solid var(--meetro-color-line, #E5E7EB)",
  borderRadius: "12px",
  background:
    "var(--meetro-surface-paper, #FFFFFF)",
  color:
    "var(--meetro-color-ink, #111827)",
  fontSize: "13px",
  fontWeight: "800",
  cursor: "pointer",
};

const chooseButton = {
  width: "100%",
  minHeight: "44px",
  margin: 0,
  padding: "9px 10px",
  border: 0,
  borderRadius: "12px",
  background:
    "var(--meetro-color-forest, #0B5D3B)",
  color: "#FFFFFF",
  fontSize: "13px",
  fontWeight: "900",
  cursor: "pointer",
};

const disabledButton = {
  opacity: 0.6,
  cursor: "default",
};

const responsesSummary = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "10px",
  paddingTop: "10px",
  borderTop:
    "1px solid var(--meetro-color-line, #E5E7EB)",
};

const responsesNote = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minWidth: 0,
  flex: "1 1 200px",
  color:
    "var(--meetro-color-ink, #111827)",
};

const responsesIconTile = {
  width: "36px",
  height: "36px",
  borderRadius: "12px",
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
  background: "rgba(139, 92, 246, 0.10)",
  color:
    "var(--meetro-color-purple, #8B5CF6)",
};

const responsesText = {
  display: "grid",
  gap: "2px",
  minWidth: 0,
  fontSize: "13px",
};

const responsesTextParagraph = {
  margin: 0,
  color:
    "var(--meetro-color-muted, #6B7280)",
  fontSize: "12px",
  lineHeight: 1.3,
};

const waitButton = {
  minWidth: "118px",
  minHeight: "44px",
  marginLeft: "auto",
  padding: "9px 12px",
  border:
    "1px solid var(--meetro-color-line, #E5E7EB)",
  borderRadius: "12px",
  background:
    "var(--meetro-surface-paper, #FFFFFF)",
  color:
    "var(--meetro-color-ink, #111827)",
  fontSize: "13px",
  fontWeight: "800",
  cursor: "pointer",
};

export default EmergencyAvailableNow;
