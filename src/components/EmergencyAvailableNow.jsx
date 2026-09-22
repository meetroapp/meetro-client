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
        <p style={eyebrow}>{copy.eyebrow}</p>
        <h2
          id="emergency-available-now-title"
          style={title}
        >
          {copy.title}
        </h2>
        <p style={intro}>{copy.intro}</p>
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
                    <span>{copy.area}</span>
                    <strong>{serviceArea}</strong>
                  </div>
                )}

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
              </article>
            );
          })}
        </div>
      )}

      <div style={responsesNote}>
        <strong>{copy.responsesTitle}</strong>
        <p>{copy.responsesBody}</p>
      </div>

      <button
        type="button"
        style={waitButton}
        disabled={selectionPending}
        onClick={() => onKeepWaiting?.()}
      >
        {copy.keepWaiting}
      </button>
    </section>
  );
}

const shell = {
  marginBottom: "22px",
  padding: "22px",
  border: "1px solid #d8e8dc",
  borderRadius: "24px",
  background:
    "linear-gradient(180deg, #f6fbf7 0%, #ffffff 100%)",
  boxShadow: "0 12px 34px rgba(31,77,52,0.08)",
};

const header = {
  marginBottom: "18px",
};

const eyebrow = {
  margin: "0 0 5px",
  color: "#1f6b42",
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const title = {
  margin: "0 0 8px",
  color: "#17231c",
  fontSize: "24px",
  lineHeight: 1.15,
};

const intro = {
  margin: 0,
  color: "#55635b",
  lineHeight: 1.55,
};

const notice = {
  margin: 0,
  padding: "14px",
  borderRadius: "16px",
  background: "#f5f7f5",
  color: "#55635b",
};

const errorNotice = {
  display: "grid",
  gap: "6px",
  padding: "14px",
  borderRadius: "16px",
  background: "#fff7ed",
  color: "#9a3412",
};

const errorDetail = {
  fontSize: "13px",
  fontWeight: "600",
};

const emptyCard = {
  padding: "16px",
  borderRadius: "18px",
  background: "#f8faf9",
  color: "#314039",
};

const emptyText = {
  margin: "6px 0 0",
  color: "#657269",
  lineHeight: 1.45,
};

const cardStack = {
  display: "grid",
  gap: "14px",
};

const professionalCard = {
  padding: "16px",
  border: "1px solid #dfe9e1",
  borderRadius: "20px",
  background: "#ffffff",
};

const cardHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const identity = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  minWidth: 0,
};

const identityText = {
  display: "grid",
  gap: "3px",
  minWidth: 0,
};

const avatarImage = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  objectFit: "cover",
  flex: "0 0 auto",
};

const avatarFallback = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
  background: "#e8f3eb",
  color: "#1f6b42",
  fontWeight: "900",
};

const businessNameStyle = {
  overflowWrap: "anywhere",
  color: "#17231c",
  fontSize: "16px",
};

const category = {
  color: "#657269",
  fontSize: "13px",
};

const availableBadge = {
  flex: "0 0 auto",
  padding: "7px 10px",
  borderRadius: "999px",
  background: "#dcfce7",
  color: "#166534",
  fontSize: "10px",
  fontWeight: "900",
  letterSpacing: "0.04em",
};

const serviceAreaRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  marginTop: "14px",
  paddingTop: "13px",
  borderTop: "1px solid #edf1ee",
  color: "#657269",
  fontSize: "13px",
};

const profileButton = {
  width: "100%",
  marginTop: "14px",
  padding: "12px 16px",
  border: "1px solid #cfd9d2",
  borderRadius: "14px",
  background: "#ffffff",
  color: "#314039",
  fontWeight: "850",
  cursor: "pointer",
};

const chooseButton = {
  width: "100%",
  marginTop: "10px",
  padding: "13px 16px",
  border: 0,
  borderRadius: "14px",
  background: "#1f6b42",
  color: "#ffffff",
  fontWeight: "900",
  cursor: "pointer",
};

const disabledButton = {
  opacity: 0.6,
  cursor: "default",
};

const responsesNote = {
  marginTop: "18px",
  paddingTop: "16px",
  borderTop: "1px solid #dfe9e1",
  color: "#4f5d55",
};

const waitButton = {
  width: "100%",
  marginTop: "12px",
  padding: "12px 16px",
  border: "1px solid #cfd9d2",
  borderRadius: "14px",
  background: "#ffffff",
  color: "#314039",
  fontWeight: "800",
  cursor: "pointer",
};

export default EmergencyAvailableNow;
