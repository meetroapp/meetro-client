import { useCallback, useEffect, useRef, useState } from "react";

import { buildCanonicalConversationRoute } from "../utils/canonicalConversationMessaging";
import {
  getHomeownerProfessionalResponses,
  prepareRequestSelectionCommand,
  selectHomeownerProfessionalResponse,
} from "../utils/requestSelectionApi";

function copy(language) {
  if (language === "es") {
    return {
      title: "Respuestas Profesionales",
      loading: "Cargando respuestas profesionales…",
      unavailable: "Las respuestas profesionales no están disponibles.",
      retry: "Intentar de Nuevo",
      empty: "Aún no hay respuestas profesionales.",
      select: "Seleccionar Profesional",
      confirmTitle: "¿Seleccionar este profesional?",
      confirmBody:
        "Esto activa la relación y crea una conversación únicamente con el profesional seleccionado.",
      confirm: "Confirmar Selección",
      cancel: "Seguir Revisando",
      selecting: "Seleccionando…",
      selected: "Profesional Seleccionado",
      connected: (name) => `Ahora estás conectado con ${name || "este profesional"}.`,
      notSelected: "No seleccionado",
      submitted: "Respuesta recibida",
      continueConversation: "Continuar Conversación",
    };
  }
  return {
    title: "Professional Responses",
    loading: "Loading professional responses…",
    unavailable: "Professional responses are unavailable.",
    retry: "Try Again",
    empty: "No professional responses yet.",
    select: "Select Professional",
    confirmTitle: "Select this professional?",
    confirmBody:
      "This activates the relationship and creates a conversation only with the selected professional.",
    confirm: "Confirm Selection",
    cancel: "Keep Reviewing",
    selecting: "Selecting…",
    selected: "Selected Professional",
    connected: (name) => `You’re now connected with ${name || "this professional"}.`,
    notSelected: "Not selected",
    submitted: "Response received",
    continueConversation: "Continue Conversation",
  };
}

function responseStatusLabel(response, labels) {
  if (response.selected) return labels.selected;
  if (response.status === "not_selected") return labels.notSelected;
  return labels.submitted;
}

export default function HomeownerProfessionalResponseReview({
  requestId,
  language = "en",
  setPage,
  onSelectionStateChange,
  onSelectionConfirmed,
}) {
  const labels = copy(language);
  const [status, setStatus] = useState("loading");
  const [responses, setResponses] = useState([]);
  const [error, setError] = useState("");
  const [confirmResponseId, setConfirmResponseId] = useState(null);
  const [selectingResponseId, setSelectingResponseId] = useState(null);
  const [confirmedSelection, setConfirmedSelection] = useState(null);
  const commandRef = useRef({});
  const requestEpochRef = useRef(0);

  const loadResponses = useCallback(async () => {
    const epoch = ++requestEpochRef.current;
    setStatus("loading");
    setError("");
    const result = await getHomeownerProfessionalResponses(requestId, {
      setPage,
    });
    if (epoch !== requestEpochRef.current) return null;
    if (!result.ok) {
      setStatus("unavailable");
      setError(result.message || labels.unavailable);
      return null;
    }
    setResponses(result.responses);
    setStatus("ready");
    return result.responses;
  }, [labels.unavailable, requestId, setPage]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadResponses();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      requestEpochRef.current += 1;
    };
  }, [loadResponses]);

  async function confirmSelection(responseId) {
    const command = prepareRequestSelectionCommand(
      commandRef.current,
      requestId,
      responseId
    );
    if (!command) {
      setError(labels.unavailable);
      setStatus("unavailable");
      return;
    }
    commandRef.current = command;
    setSelectingResponseId(responseId);
    setError("");

    const result = await selectHomeownerProfessionalResponse(command, {
      setPage,
    });
    if (!result.ok) {
      setError(result.message || labels.unavailable);
      setSelectingResponseId(null);
      return;
    }

    setConfirmedSelection(result);
    setConfirmResponseId(null);
    onSelectionStateChange?.(null);
    setSelectingResponseId(null);
    await loadResponses();
    onSelectionConfirmed?.(result);
  }

  function openConversation(conversationId) {
    const route = buildCanonicalConversationRoute(
      conversationId,
      "myRequests",
      { shell: "communicationCenter" }
    );
    if (route !== "conversationThread") setPage(route);
  }

  return (
    <section style={section} aria-labelledby={`professional-responses-${requestId}`}>
      <h3 id={`professional-responses-${requestId}`} style={heading}>
        {labels.title}
      </h3>

      {status === "loading" && responses.length === 0 && (
        <p style={stateText} role="status">{labels.loading}</p>
      )}

      {status === "unavailable" && responses.length === 0 && (
        <div style={errorCard} role="alert">
          <strong>{labels.unavailable}</strong>
          {error && <span style={errorText}>{error}</span>}
          <button type="button" style={secondaryButton} onClick={loadResponses}>
            {labels.retry}
          </button>
        </div>
      )}

      {status === "ready" && responses.length === 0 && (
        <p style={stateText}>{labels.empty}</p>
      )}

      {responses.length > 0 && (
        <div style={responseList}>
          {responses.map((response) => {
            const confirmed =
              confirmedSelection?.response?.id === response.id
                ? confirmedSelection
                : null;
            const conversationId =
              response.conversationAvailable && response.conversationId
                ? response.conversationId
                : confirmed?.conversation?.id || null;
            const isConfirming = confirmResponseId === response.id;
            const isSelecting = selectingResponseId === response.id;

            return (
              <article key={response.id} style={responseCard}>
                <div style={responseHeader}>
                  <div style={identityBlock}>
                    {response.businessProfile.imageUrl && (
                      <img
                        src={response.businessProfile.imageUrl}
                        alt=""
                        style={businessImage}
                      />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <strong style={businessName}>
                        {response.businessProfile.businessName ||
                          (language === "es" ? "Profesional" : "Professional")}
                      </strong>
                      {response.businessProfile.category && (
                        <span style={category}>
                          {response.businessProfile.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={response.selected ? selectedPill : statusPill}>
                    {responseStatusLabel(response, labels)}
                  </span>
                </div>

                {response.introductionText && (
                  <p style={introduction}>{response.introductionText}</p>
                )}

                {response.selected && (
                  <p style={connectedText}>
                    {labels.connected(response.businessProfile.businessName)}
                  </p>
                )}

                {error && (isConfirming || isSelecting) && (
                  <p style={inlineError} role="alert">{error}</p>
                )}

                {isConfirming && !response.selected ? (
                  <div style={confirmationCard}>
                    <strong>{labels.confirmTitle}</strong>
                    <span style={confirmationText}>{labels.confirmBody}</span>
                    <div style={buttonRow}>
                      <button
                        type="button"
                        style={primaryButton}
                        disabled={isSelecting}
                        onClick={() => confirmSelection(response.id)}
                      >
                        {isSelecting ? labels.selecting : labels.confirm}
                      </button>
                      <button
                        type="button"
                        style={secondaryButton}
                        disabled={isSelecting}
                        onClick={() => {
                          setConfirmResponseId(null);
                          onSelectionStateChange?.(null);
                        }}
                      >
                        {labels.cancel}
                      </button>
                    </div>
                  </div>
                ) : response.selectionEligible ? (
                  <button
                    type="button"
                    style={primaryButton}
                    onClick={() => {
                      setError("");
                      setConfirmResponseId(response.id);
                      onSelectionStateChange?.(String(response.id));
                    }}
                  >
                    {labels.select}
                  </button>
                ) : conversationId ? (
                  <button
                    type="button"
                    style={primaryButton}
                    onClick={() => openConversation(conversationId)}
                  >
                    {labels.continueConversation}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

const section = {
  marginTop: 14,
  padding: 14,
  borderRadius: 20,
  border: "1px solid rgba(99, 102, 241, 0.18)",
  background: "rgba(248, 250, 252, 0.96)",
  minWidth: 0,
  overflow: "hidden",
};
const heading = { margin: "0 0 10px", color: "#111827", fontSize: 16 };
const stateText = { margin: 0, color: "#64748b", fontSize: 14 };
const responseList = { display: "grid", gap: 10, minWidth: 0 };
const responseCard = {
  display: "grid",
  gap: 10,
  padding: 12,
  minWidth: 0,
  borderRadius: 16,
  border: "1px solid rgba(148, 163, 184, 0.22)",
  background: "#ffffff",
};
const responseHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 10,
  minWidth: 0,
};
const identityBlock = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
  flex: "1 1 180px",
};
const businessImage = {
  width: 42,
  height: 42,
  borderRadius: 12,
  objectFit: "cover",
  flex: "0 0 auto",
};
const businessName = {
  display: "block",
  color: "#111827",
  fontSize: 14,
  overflowWrap: "anywhere",
};
const category = {
  display: "block",
  marginTop: 2,
  color: "#64748b",
  fontSize: 12,
  overflowWrap: "anywhere",
};
const statusPill = {
  padding: "5px 8px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#475569",
  fontSize: 11,
  fontWeight: 800,
};
const selectedPill = {
  ...statusPill,
  background: "#dcfce7",
  color: "#166534",
};
const introduction = {
  margin: 0,
  color: "#475569",
  fontSize: 14,
  lineHeight: 1.5,
  overflowWrap: "anywhere",
};
const connectedText = {
  margin: 0,
  color: "#166534",
  fontSize: 13,
  fontWeight: 700,
};
const confirmationCard = {
  display: "grid",
  gap: 8,
  padding: 10,
  borderRadius: 14,
  background: "#eef2ff",
  color: "#312e81",
};
const confirmationText = { fontSize: 13, lineHeight: 1.45 };
const buttonRow = { display: "flex", flexWrap: "wrap", gap: 8 };
const primaryButton = {
  minHeight: 44,
  padding: "10px 14px",
  border: 0,
  borderRadius: 12,
  background: "var(--meetro-color-charcoal, #172317)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
};
const secondaryButton = {
  minHeight: 44,
  padding: "10px 14px",
  border: "1px solid rgba(71, 85, 105, 0.28)",
  borderRadius: 12,
  background: "#ffffff",
  color: "#334155",
  fontWeight: 800,
  cursor: "pointer",
};
const errorCard = {
  display: "grid",
  gap: 8,
  color: "#991b1b",
  fontSize: 13,
};
const errorText = { overflowWrap: "anywhere" };
const inlineError = { margin: 0, color: "#b91c1c", fontSize: 13 };
