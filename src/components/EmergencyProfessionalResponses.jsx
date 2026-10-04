import MeetroIcon from "./MeetroIcon";

function clean(value) {
  return String(value ?? "").trim();
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

function responseTimeLabel(value, language) {
  if (!value) return "";

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const elapsed = Math.max(
    0,
    Date.now() - timestamp
  );

  const minutes = Math.floor(
    elapsed / 60000
  );

  if (minutes < 1) {
    return language === "es"
      ? "Ahora"
      : "Just now";
  }

  if (minutes < 60) {
    return language === "es"
      ? `Hace ${minutes} min`
      : `${minutes} min ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return language === "es"
      ? `Hace ${hours} h`
      : `${hours} hr ago`;
  }

  return new Intl.DateTimeFormat(
    language === "es" ? "es-US" : "en-US",
    {
      month: "short",
      day: "numeric",
    }
  ).format(new Date(timestamp));
}

function EmergencyProfessionalResponses({
  phase = "idle",
  responses = [],
  selectionPending = false,
  language = "en",
  onSelectResponse,
  onKeepWaiting,
}) {
  const copy =
    language === "es"
      ? {
          title: "Respuestas de Profesionales",
          newest: "Más recientes primero",
          emptyTitle: "Aún no hay respuestas",
          emptyBody:
            "Los negocios que respondan a tu solicitud de Emergencia aparecerán aquí.",
          loading:
            "Buscando nuevas respuestas de profesionales…",
          error:
            "Las respuestas no están disponibles temporalmente.",
          select: "Seleccionar",
          selected: "Seleccionado",
          keepWaiting: "Seguir Esperando",
        }
      : {
          title: "Professional Responses",
          newest: "Newest first",
          emptyTitle: "No responses yet",
          emptyBody:
            "Businesses that respond to your Emergency request will appear here.",
          loading:
            "Checking for new professional responses…",
          error:
            "Professional responses are temporarily unavailable.",
          select: "Select",
          selected: "Selected",
          keepWaiting: "Keep Waiting",
        };

  const cards = Array.isArray(responses)
    ? [...responses]
    : [];

  cards.sort((left, right) => {
    const leftTime =
      Date.parse(left?.respondedAt || "") || 0;
    const rightTime =
      Date.parse(right?.respondedAt || "") || 0;

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return Number(right?.id || 0) -
      Number(left?.id || 0);
  });

  return (
    <section
      className="emergency-professional-responses-pane"
      style={shell}
      aria-labelledby="emergency-professional-responses-title"
      data-emergency-professional-responses="canonical"
    >
      <header style={header}>
        <div style={headerIdentity}>
          <span
            style={iconTile}
            aria-hidden="true"
          >
            <MeetroIcon
              name="customerRelationships"
              size={18}
              decorative
            />
          </span>

          <div style={headerCopy}>
            <h2
              id="emergency-professional-responses-title"
              style={title}
            >
              {copy.title}
            </h2>

            {cards.length > 1 && (
              <span style={sortLabel}>
                {copy.newest}
              </span>
            )}
          </div>
        </div>

        <strong style={countPill}>
          {cards.length}
        </strong>
      </header>

      {phase === "loading" && (
        <div style={emptyState}>
          <p style={emptyBody}>
            {copy.loading}
          </p>
        </div>
      )}

      {phase === "error" && (
        <div
          style={errorState}
          role="alert"
        >
          {copy.error}
        </div>
      )}

      {phase !== "loading" &&
        phase !== "error" &&
        cards.length === 0 && (
          <div style={emptyState}>
            <span
              style={emptyIcon}
              aria-hidden="true"
            >
              <MeetroIcon
                name="customerRelationships"
                size={25}
                decorative
              />
            </span>

            <strong style={emptyTitle}>
              {copy.emptyTitle}
            </strong>

            <p style={emptyBody}>
              {copy.emptyBody}
            </p>
          </div>
        )}

      {cards.length > 0 && (
        <div
          className="emergency-professional-responses-list"
          style={responseList}
        >
          {cards.map((response) => {
            const businessName =
              clean(response.businessName) ||
              (language === "es"
                ? "Profesional"
                : "Professional");

            const timeLabel =
              responseTimeLabel(
                response.respondedAt,
                language
              );

            return (
              <article
                key={response.id}
                style={responseRow}
              >
                <div style={responseIdentity}>
                  <div
                    style={avatar}
                    aria-hidden="true"
                  >
                    {response.logoUrl ? (
                      <img
                        src={response.logoUrl}
                        alt=""
                        style={avatarImage}
                      />
                    ) : (
                      initialsFor(businessName) ||
                      "M"
                    )}
                  </div>

                  <div style={responseCopy}>
                    <strong style={businessNameStyle}>
                      {businessName}
                    </strong>

                    {response.category && (
                      <span style={category}>
                        {response.category}
                      </span>
                    )}

                    {timeLabel && (
                      <span style={respondedAt}>
                        {timeLabel}
                      </span>
                    )}
                  </div>
                </div>

                {response.status === "pending" ? (
                  <button
                    type="button"
                    style={{
                      ...selectButton,
                      ...(selectionPending
                        ? disabledButton
                        : {}),
                    }}
                    disabled={selectionPending}
                    onClick={() =>
                      onSelectResponse?.(
                        response.id
                      )
                    }
                  >
                    {copy.select}
                  </button>
                ) : (
                  <strong style={selectedPill}>
                    {copy.selected}
                  </strong>
                )}
              </article>
            );
          })}
        </div>
      )}

      {typeof onKeepWaiting === "function" && (
        <footer style={footer}>
          <button
            type="button"
            style={waitButton}
            disabled={selectionPending}
            onClick={onKeepWaiting}
          >
            {copy.keepWaiting}
          </button>
        </footer>
      )}
    </section>
  );
}

const shell = {
  width: "100%",
  minWidth: 0,
  padding: "12px",
  border:
    "1px solid var(--meetro-color-line, #E5E7EB)",
  borderRadius: "16px",
  background:
    "var(--meetro-surface-paper, #FFFFFF)",
  boxShadow:
    "0 8px 24px rgba(17, 24, 39, 0.04)",
  boxSizing: "border-box",
};

const header = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  paddingBottom: "9px",
  borderBottom:
    "1px solid var(--meetro-color-line, #E5E7EB)",
};

const headerIdentity = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minWidth: 0,
};

const iconTile = {
  width: "34px",
  height: "34px",
  borderRadius: "11px",
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
  background:
    "rgba(139, 92, 246, 0.10)",
  color:
    "var(--meetro-color-purple, #8B5CF6)",
};

const headerCopy = {
  display: "grid",
  gap: "1px",
  minWidth: 0,
};

const title = {
  margin: 0,
  color:
    "var(--meetro-color-ink, #111827)",
  fontSize: "14px",
  lineHeight: 1.25,
  fontWeight: "900",
};

const sortLabel = {
  color:
    "var(--meetro-color-muted, #6B7280)",
  fontSize: "10px",
  lineHeight: 1.2,
  fontWeight: "700",
};

const countPill = {
  minWidth: "28px",
  height: "28px",
  padding: "0 8px",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  background:
    "rgba(139, 92, 246, 0.10)",
  color:
    "var(--meetro-color-purple, #8B5CF6)",
  fontSize: "12px",
  fontWeight: "900",
};

const emptyState = {
  minHeight: "132px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  padding: "18px 14px",
  textAlign: "center",
  color:
    "var(--meetro-color-muted, #6B7280)",
};

const emptyIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  display: "grid",
  placeItems: "center",
  background:
    "rgba(139, 92, 246, 0.06)",
  color:
    "rgba(139, 92, 246, 0.42)",
};

const emptyTitle = {
  color:
    "rgba(107, 114, 128, 0.82)",
  fontSize: "13px",
  fontWeight: "800",
};

const emptyBody = {
  maxWidth: "310px",
  margin: 0,
  color:
    "rgba(107, 114, 128, 0.72)",
  fontSize: "12px",
  lineHeight: 1.45,
};

const errorState = {
  margin: "12px 0",
  padding: "10px",
  borderRadius: "12px",
  background:
    "rgba(239, 68, 68, 0.05)",
  color:
    "var(--meetro-color-danger, #EF4444)",
  fontSize: "12px",
  lineHeight: 1.4,
};

const responseList = {
  display: "grid",
  gap: "0",
  minWidth: 0,
};

const responseRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  minWidth: 0,
  padding: "9px 2px",
  borderBottom:
    "1px solid var(--meetro-color-line, #E5E7EB)",
};

const responseIdentity = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  minWidth: 0,
  flex: "1 1 auto",
};

const avatar = {
  width: "36px",
  height: "36px",
  borderRadius: "11px",
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
  overflow: "hidden",
  background:
    "var(--meetro-color-sage, #E8F5EE)",
  color:
    "var(--meetro-color-forest, #0B5D3B)",
  fontSize: "11px",
  fontWeight: "900",
};

const avatarImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const responseCopy = {
  display: "grid",
  gap: "1px",
  minWidth: 0,
};

const businessNameStyle = {
  color:
    "var(--meetro-color-ink, #111827)",
  fontSize: "13px",
  lineHeight: 1.25,
  fontWeight: "850",
  overflowWrap: "anywhere",
};

const category = {
  color:
    "var(--meetro-color-muted, #6B7280)",
  fontSize: "11px",
  lineHeight: 1.25,
  overflowWrap: "anywhere",
};

const respondedAt = {
  color:
    "rgba(107, 114, 128, 0.72)",
  fontSize: "10px",
  lineHeight: 1.2,
};

const selectButton = {
  minWidth: "76px",
  minHeight: "40px",
  padding: "7px 10px",
  border: 0,
  borderRadius: "11px",
  background:
    "var(--meetro-color-forest, #0B5D3B)",
  color: "#FFFFFF",
  fontSize: "11px",
  fontWeight: "900",
  cursor: "pointer",
  flex: "0 0 auto",
};

const selectedPill = {
  padding: "6px 8px",
  border:
    "1px solid rgba(16, 185, 129, 0.28)",
  borderRadius: "999px",
  background:
    "var(--meetro-color-sage, #E8F5EE)",
  color:
    "var(--meetro-color-forest, #0B5D3B)",
  fontSize: "10px",
  fontWeight: "850",
};

const footer = {
  display: "flex",
  justifyContent: "flex-end",
  paddingTop: "9px",
};

const waitButton = {
  minHeight: "40px",
  padding: "7px 11px",
  border:
    "1px solid var(--meetro-color-line, #E5E7EB)",
  borderRadius: "11px",
  background:
    "var(--meetro-surface-paper, #FFFFFF)",
  color:
    "var(--meetro-color-ink, #111827)",
  fontSize: "11px",
  fontWeight: "800",
  cursor: "pointer",
};

const disabledButton = {
  opacity: 0.6,
  cursor: "default",
};

export default EmergencyProfessionalResponses;
