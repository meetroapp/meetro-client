import { useEffect, useRef, useState } from "react";
import HomeownerRequestEditForm from "./HomeownerRequestEditForm.jsx";
import { authFetch } from "../utils/authFetch.js";
import {
  appendHomeownerRequestPhoto,
  appendHomeownerRequestUpdate,
  createRequestModificationIdempotencyKey,
  editHomeownerRequest,
  fetchHomeownerRequestModification,
} from "../utils/homeownerRequestModificationApi.js";
import {
  getHomeownerRequestModificationActions,
} from "../utils/homeownerRequestModificationPolicy.js";
import {
  buildHomeownerRequestEditPayload,
} from "../utils/homeownerRequestEditPayload.js";
import {
  REQUEST_EDIT_LEGACY_PHOTO_RESOLUTION_REQUIRED,
  buildRequestPhotoReplacementPayload,
  getPendingLocalRequestPhotoItems,
} from "../utils/requestEditPhotoState.js";
import {
  REQUEST_PHOTO_MAX_COUNT,
  cleanupRequestPhoto,
  uploadRequestPhotos,
  validateRequestPhotoFiles,
} from "../utils/requestPhotoMedia.js";
import { getParticipantRoleLabelKey } from "../utils/requestLifecycleFoundation.js";
import { t } from "../utils/language.js";
import { getMediaDeferredCopy } from "../utils/mediaDeferral.js";

function text(language, english, spanish) {
  return language === "es" ? spanish : english;
}

function requestPhotoCount(request = {}) {
  if (Array.isArray(request.request_photos)) {
    return request.request_photos.length;
  }
  if (Array.isArray(request.photos)) return request.photos.length;
  return request.image_url ? 1 : 0;
}

function photoFailureCopy(code, language) {
  const copy = {
    REQUEST_PHOTO_FORMAT_INVALID: text(
      language,
      "Choose JPEG, PNG, or WebP images.",
      "Elige imágenes JPEG, PNG o WebP."
    ),
    REQUEST_PHOTO_TOO_LARGE: text(
      language,
      "Each photo must be 10 MB or smaller.",
      "Cada foto debe tener 10 MB o menos."
    ),
    REQUEST_PHOTO_COUNT_EXCEEDED: text(
      language,
      `This request can contain up to ${REQUEST_PHOTO_MAX_COUNT} photos.`,
      `Esta solicitud puede contener hasta ${REQUEST_PHOTO_MAX_COUNT} fotos.`
    ),
    REQUEST_PHOTO_UPLOAD_FAILED: text(
      language,
      "The selected photos could not be uploaded.",
      "No se pudieron cargar las fotos seleccionadas."
    ),
    REQUEST_EDIT_PHOTO_METADATA_REQUIRED: text(
      language,
      "Meetro could not confirm the uploaded photo details.",
      "Meetro no pudo confirmar los detalles de las fotos cargadas."
    ),
    [REQUEST_EDIT_LEGACY_PHOTO_RESOLUTION_REQUIRED]: text(
      language,
      "Remove and re-add older photos before saving photo changes.",
      "Elimina y vuelve a agregar las fotos antiguas antes de guardar cambios."
    ),
  };
  return copy[code] || "";
}

function concernUpdateLabel(semantics, language) {
  return semantics === "SUPERSEDES_INTERPRETATION"
    ? text(language, "Updated request details", "Detalles actualizados de la solicitud")
    : text(language, "Homeowner update", "Actualización del propietario");
}

function LifecycleHistory({ lifecycle, language }) {
  return (
    <section style={historySection} aria-labelledby="reported-concern-history-heading">
      <h4 id="reported-concern-history-heading" style={sectionHeading}>
        {t("reportedConcernHistory", language)}
      </h4>
      {lifecycle.reportedConcerns.length === 0 ? (
        <p style={supportingText}>{t("lifecycleHistoryUnavailable", language)}</p>
      ) : (
        <div style={stack}>
          {lifecycle.reportedConcerns.map((concern) => (
            <article key={concern.id} style={historyCard}>
              <span style={eyebrow}>{t("originallyReported", language)}</span>
              <p style={historyText}>{concern.originalText}</p>
              {concern.clarifications.map((clarification) => (
                <div key={clarification.id} style={updateCard}>
                  <span style={updateLabel}>
                    {concernUpdateLabel(clarification.semantics, language)}
                  </span>
                  <p style={historyText}>{clarification.text}</p>
                </div>
              ))}
            </article>
          ))}
        </div>
      )}

      {lifecycle.participants.length > 0 && (
        <div style={participantSection}>
          <h4 style={sectionHeading}>{t("knownJobParticipants", language)}</h4>
          <div style={stack}>
            {lifecycle.participants.map((participant) => (
              <div key={participant.id} style={participantRow}>
                <span>{participant.displayName || t("lifecycleParticipant", language)}</span>
                <span style={participantRole}>
                  {participant.roles
                    .map(getParticipantRoleLabelKey)
                    .filter(Boolean)
                    .map((key) => t(key, language))
                    .join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function HomeownerRequestModificationPanel({
  request,
  language,
  setPage,
  mediaUploadDeferred = false,
  onRequestChanged,
  onCanonicalRefresh,
  onCanonicalLifecycleLoaded,
  onOpenConversation,
  conversationAvailable = false,
  onPreview,
}) {
  const requestId = request?.requestId || request?.id;
  const contractVersion = Number(request?.lifecycleContractVersion || 1);
  const [loadState, setLoadState] = useState(
    contractVersion === 2 ? "loading" : "unavailable"
  );
  const [lifecycle, setLifecycle] = useState(null);
  const [authority, setAuthority] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [surface, setSurface] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [updateText, setUpdateText] = useState("");
  const [photoFiles, setPhotoFiles] = useState([]);
  const updateIntentRef = useRef(null);
  const mediaDeferredCopy = getMediaDeferredCopy(language);

  useEffect(() => {
    if (contractVersion !== 2 || !requestId) {
      return undefined;
    }

    let active = true;

    void fetchHomeownerRequestModification({ requestId, setPage }).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setLoadState("unavailable");
        setLifecycle(null);
        setAuthority(null);
        return;
      }
      setLifecycle(result.lifecycle);
      setAuthority(result.authority);
      setLoadState("ready");
      onCanonicalLifecycleLoaded?.({
        requestId,
        lifecycle: result.lifecycle,
        authority: result.authority,
      });
    });

    return () => {
      active = false;
    };
  }, [
    contractVersion,
    onCanonicalLifecycleLoaded,
    requestId,
    refreshKey,
    setPage,
  ]);

  function refreshLifecycle() {
    setLoadState("loading");
    setAuthority(null);
    setRefreshKey((value) => value + 1);
  }

  async function cleanupMedia(mediaItems) {
    if (!mediaItems.length) return true;
    try {
      const results = await Promise.all(
        mediaItems.map((media) =>
          cleanupRequestPhoto({ media, authFetchImpl: authFetch, setPage })
        )
      );
      return results.every(Boolean);
    } catch {
      return false;
    }
  }

  function conflictMessage() {
    return text(
      language,
      "This request changed before your update could be saved. Canonical details were reloaded; review them before trying again.",
      "Esta solicitud cambió antes de guardar tu actualización. Se recargaron los detalles canónicos; revísalos antes de intentarlo otra vez."
    );
  }

  async function saveEdit({ draft, photos, photosChanged }) {
    if (!authority?.requestVersion) return;
    setBusy(true);
    setFeedback(null);
    let uploaded = [];

    try {
      let requestPhotos;
      if (photosChanged) {
        if (mediaUploadDeferred) {
          setFeedback({
            kind: "error",
            message: mediaDeferredCopy.detail,
          });
          return;
        }
        if (photos.some((photo) => photo?.displayOnly)) {
          setFeedback({
            kind: "error",
            message: photoFailureCopy(
              REQUEST_EDIT_LEGACY_PHOTO_RESOLUTION_REQUIRED,
              language
            ),
          });
          return;
        }

        const pending = getPendingLocalRequestPhotoItems(photos);
        const uploadedByItemId = new Map();
        if (pending.length > 0) {
          const upload = await uploadRequestPhotos({
            files: pending.map((photo) => photo.file),
            authFetchImpl: authFetch,
            setPage,
          });
          if (!upload.ok) {
            setFeedback({
              kind: "error",
              message: photoFailureCopy(upload.code, language),
            });
            return;
          }
          uploaded = upload.photos;
          pending.forEach((photo, index) => {
            uploadedByItemId.set(photo.id, uploaded[index]);
          });
        }

        const replacement = buildRequestPhotoReplacementPayload(photos, {
          uploadedMediaByItemId: uploadedByItemId,
        });
        if (!replacement.ok) {
          const cleaned = await cleanupMedia(uploaded);
          uploaded = [];
          setFeedback({
            kind: "error",
            message: `${photoFailureCopy(replacement.code, language)}${
              cleaned
                ? ""
                : text(
                    language,
                    " Some uploaded media may still require cleanup.",
                    " Algunos archivos cargados aún pueden requerir limpieza."
                  )
            }`,
          });
          return;
        }
        requestPhotos = replacement.request_photos;
      }

      const updates = buildHomeownerRequestEditPayload({
        request,
        draft,
        requestPhotos,
      });
      if (!updates) {
        setFeedback({
          kind: "error",
          message: text(
            language,
            "Change at least one request value before saving.",
            "Cambia al menos un valor antes de guardar."
          ),
        });
        return;
      }

      const result = await editHomeownerRequest({
        requestId,
        expectedVersion: authority.requestVersion,
        updates,
        setPage,
      });
      if (!result.ok) {
        if (result.code === "REQUEST_UPDATE_NETWORK_FAILED") {
          const reconciliation = await fetchHomeownerRequestModification({
            requestId,
            setPage,
          });
          if (
            reconciliation.ok &&
            reconciliation.authority.requestVersion === authority.requestVersion
          ) {
            const cleaned = await cleanupMedia(uploaded);
            uploaded = [];
            setFeedback({
              kind: "error",
              message: `${result.message}${
                cleaned
                  ? ""
                  : text(
                      language,
                      " Uploaded media cleanup is still pending.",
                      " La limpieza de archivos cargados sigue pendiente."
                    )
              }`,
            });
            return;
          }

          uploaded = [];
          setSurface("");
          setFeedback({
            kind: "error",
            message: text(
              language,
              "Save confirmation was interrupted. Canonical request details were reloaded; review them before trying again.",
              "Se interrumpió la confirmación del guardado. Se recargaron los detalles canónicos; revísalos antes de intentarlo otra vez."
            ),
          });
          onCanonicalRefresh?.();
          refreshLifecycle();
          return;
        }
        const cleaned = await cleanupMedia(uploaded);
        uploaded = [];
        if (result.versionConflict) {
          setSurface("");
          setFeedback({ kind: "error", message: conflictMessage() });
          onCanonicalRefresh?.();
          refreshLifecycle();
          return;
        }
        setFeedback({
          kind: "error",
          message: `${result.message}${
            cleaned
              ? ""
              : text(
                  language,
                  " Uploaded media cleanup is still pending.",
                  " La limpieza de archivos cargados sigue pendiente."
                )
          }`,
        });
        return;
      }

      uploaded = [];
      onRequestChanged?.(result.post);
      setSurface("");
      setFeedback({
        kind: "success",
        message: text(
          language,
          "Request saved. Canonical request history and version were refreshed.",
          "Solicitud guardada. Se actualizaron el historial y la versión canónicos."
        ),
      });
      onCanonicalRefresh?.();
      refreshLifecycle();
    } finally {
      setBusy(false);
    }
  }

  async function saveUpdate(event) {
    event.preventDefault();
    const normalizedText = updateText.trim();
    if (!normalizedText || !authority?.concernId) return;
    setBusy(true);
    setFeedback(null);
    const fingerprint = normalizedText;
    if (updateIntentRef.current?.fingerprint !== fingerprint) {
      updateIntentRef.current = {
        fingerprint,
        key: createRequestModificationIdempotencyKey(
          `concern-clarification:${requestId}`
        ),
      };
    }

    const result = await appendHomeownerRequestUpdate({
      requestId,
      concernId: authority.concernId,
      text: normalizedText,
      idempotencyKey: updateIntentRef.current.key,
      setPage,
    });
    setBusy(false);
    if (!result.ok) {
      setFeedback({ kind: "error", message: result.message });
      return;
    }

    updateIntentRef.current = null;
    setUpdateText("");
    setSurface("");
    setFeedback({
      kind: "success",
      message: text(
        language,
        "Update added. The original reported concern remains unchanged.",
        "Actualización agregada. La inquietud original permanece sin cambios."
      ),
    });
    refreshLifecycle();
  }

  function selectAppendPhotos(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    const validation = validateRequestPhotoFiles(files, {
      existingCount: requestPhotoCount(request),
    });
    if (!validation.ok) {
      setFeedback({
        kind: "error",
        message: photoFailureCopy(validation.code, language),
      });
      setPhotoFiles([]);
      return;
    }
    setPhotoFiles(validation.files);
    setFeedback(null);
  }

  async function savePhotos(event) {
    event.preventDefault();
    if (
      photoFiles.length === 0 ||
      !authority?.concernId ||
      !authority?.requestVersion
    ) return;

    setBusy(true);
    setFeedback(null);
    const upload = await uploadRequestPhotos({
      files: photoFiles,
      authFetchImpl: authFetch,
      setPage,
    });
    if (!upload.ok) {
      setBusy(false);
      setFeedback({
        kind: "error",
        message: photoFailureCopy(upload.code, language),
      });
      return;
    }

    let currentVersion = authority.requestVersion;
    let attachedCount = 0;
    let latestPost = null;
    let failure = null;
    for (let index = 0; index < upload.photos.length; index += 1) {
      const command = {
        requestId,
        concernId: authority.concernId,
        expectedVersion: currentVersion,
        media: upload.photos[index],
        idempotencyKey: createRequestModificationIdempotencyKey(
          `request-photo:${requestId}:${currentVersion}`
        ),
        setPage,
      };
      let result = await appendHomeownerRequestPhoto(command);
      if (result.code === "REQUEST_PHOTO_APPEND_NETWORK_FAILED") {
        result = await appendHomeownerRequestPhoto(command);
      }
      if (!result.ok) {
        failure = {
          result,
          index,
          confirmationUncertain:
            result.code === "REQUEST_PHOTO_APPEND_NETWORK_FAILED",
        };
        break;
      }
      attachedCount += 1;
      currentVersion = result.requestVersion || currentVersion + 1;
      latestPost = result.post || latestPost;
      if (result.post) onRequestChanged?.(result.post);
    }

    if (failure) {
      await cleanupMedia(
        upload.photos.slice(
          failure.confirmationUncertain
            ? failure.index + 1
            : failure.index
        )
      );
      setPhotoFiles([]);
      setBusy(false);
      if (latestPost) onRequestChanged?.(latestPost);
      onCanonicalRefresh?.();
      refreshLifecycle();
      setSurface("");
      setFeedback({
        kind: "error",
        message: failure.confirmationUncertain
          ? text(
              language,
              "Photo attachment confirmation was interrupted. Canonical request details were refreshed; only confirmed request photos will appear in the gallery.",
              "Se interrumpió la confirmación de las fotos. Se actualizaron los detalles canónicos; solo las fotos confirmadas aparecerán en la galería."
            )
          : failure.result.versionConflict
          ? conflictMessage()
          : attachedCount > 0
            ? text(
                language,
                `${attachedCount} photo${attachedCount === 1 ? "" : "s"} attached, but the remaining photos were not attached. Canonical details were refreshed.`,
                `Se adjuntaron ${attachedCount} foto${attachedCount === 1 ? "" : "s"}, pero las restantes no se adjuntaron. Se actualizaron los detalles canónicos.`
              )
            : failure.result.message,
      });
      return;
    }

    setPhotoFiles([]);
    setBusy(false);
    setSurface("");
    setFeedback({
      kind: "success",
      message: text(
        language,
        "New photos attached. Earlier request photos remain in place.",
        "Nuevas fotos adjuntadas. Las fotos anteriores permanecen en la solicitud."
      ),
    });
    onCanonicalRefresh?.();
    refreshLifecycle();
  }

  const actions = getHomeownerRequestModificationActions(authority);
  const hasModificationAction =
    actions.editRequest || actions.addUpdate || actions.addPhotos;

  return (
    <div style={panel} data-homeowner-modification-state={loadState}>
      {loadState === "ready" && lifecycle ? (
        <LifecycleHistory lifecycle={lifecycle} language={language} />
      ) : (
        <p role="status" style={supportingText}>
          {loadState === "loading"
            ? text(
                language,
                "Loading request history and available actions…",
                "Cargando el historial y las acciones disponibles…"
              )
            : t("lifecycleHistoryUnavailable", language)}
        </p>
      )}

      <section style={actionSection} aria-labelledby="request-actions-heading">
        <div style={actionHeadingRow}>
          <div>
            <span style={eyebrow}>
              {text(language, "Server-authorized", "Autorizado por el servidor")}
            </span>
            <h4 id="request-actions-heading" style={sectionHeading}>
              {text(language, "Request actions", "Acciones de la solicitud")}
            </h4>
          </div>
          {loadState === "ready" && authority?.requestVersion && (
            <span style={versionBadge}>
              {text(
                language,
                `Version ${authority.requestVersion}`,
                `Versión ${authority.requestVersion}`
              )}
            </span>
          )}
        </div>

        {loadState === "loading" && (
          <p role="status" style={supportingText}>
            {text(
              language,
              "Checking available request actions…",
              "Comprobando las acciones disponibles…"
            )}
          </p>
        )}

        {loadState !== "loading" && loadState !== "ready" && (
          <p role="status" style={readOnlyNotice}>
            {text(
              language,
              "Request actions could not be confirmed. Details remain read-only.",
              "No se pudieron confirmar las acciones. Los detalles permanecen en modo de solo lectura."
            )}
          </p>
        )}

        {loadState === "ready" && (
          <>
            {actions.contractChangeGuidance && (
              <div style={guidanceCard}>
                <strong>
                  {text(language, "Agreed work boundary", "Límite del trabajo acordado")}
                </strong>
                <p style={guidanceText}>
                  {text(
                    language,
                    "Changes to the agreed work should be discussed with your professional and reflected in the job agreement.",
                    "Los cambios al trabajo acordado deben conversarse con tu profesional y reflejarse en el acuerdo del trabajo."
                  )}
                </p>
                <small style={supportingText}>
                  {text(
                    language,
                    "Conversation supports discussion; sending a message does not change the scope or agreement.",
                    "La conversación facilita el diálogo; enviar un mensaje no cambia el alcance ni el acuerdo."
                  )}
                </small>
              </div>
            )}

            {(actions.readOnly || !hasModificationAction) && (
              <p role="status" style={readOnlyNotice}>
                {actions.readOnly
                  ? text(
                      language,
                      "This request is read-only. Its history remains available.",
                      "Esta solicitud es de solo lectura. Su historial permanece disponible."
                    )
                  : text(
                      language,
                      "No request changes are currently authorized.",
                      "Actualmente no hay cambios autorizados para esta solicitud."
                    )}
              </p>
            )}

            <div style={actionButtons}>
              {actions.editRequest && (
                <button
                  type="button"
                  style={primaryButton}
                  onClick={() => {
                    setSurface("edit");
                    setFeedback(null);
                  }}
                >
                  {text(language, "Edit Request", "Editar Solicitud")}
                </button>
              )}
              {actions.addUpdate && (
                <button
                  type="button"
                  style={secondaryButton}
                  onClick={() => {
                    setSurface("update");
                    setFeedback(null);
                  }}
                >
                  {text(language, "Add Update", "Agregar Actualización")}
                </button>
              )}
              {actions.addPhotos && (
                <button
                  type="button"
                  style={secondaryButton}
                  onClick={() => {
                    setSurface("photos");
                    setFeedback(null);
                  }}
                >
                  {text(language, "Add Photos", "Agregar Fotos")}
                </button>
              )}
              {conversationAvailable && !actions.readOnly && (
                <button
                  type="button"
                  style={secondaryButton}
                  onClick={onOpenConversation}
                >
                  {text(language, "Continue Conversation", "Continuar Conversación")}
                </button>
              )}
            </div>

            {surface === "edit" && actions.editRequest && (
              <HomeownerRequestEditForm
                request={request}
                language={language}
                busy={busy}
                mediaUploadDeferred={mediaUploadDeferred}
                error={feedback?.kind === "error" ? feedback.message : ""}
                onSave={saveEdit}
                onCancel={() => {
                  setSurface("");
                  setFeedback(null);
                }}
                onPreview={onPreview}
              />
            )}

            {surface === "update" && actions.addUpdate && (
              <form style={commandForm} onSubmit={saveUpdate}>
                <h5 style={commandHeading}>
                  {text(language, "Add new information", "Agregar información nueva")}
                </h5>
                <p style={supportingText}>
                  {text(
                    language,
                    "This update will appear after the original reported concern; it will not rewrite it.",
                    "Esta actualización aparecerá después de la inquietud original; no la reescribirá."
                  )}
                </p>
                <label style={fieldLabel} htmlFor="homeowner-request-update-text">
                  {text(language, "Homeowner update", "Actualización del propietario")}
                </label>
                <textarea
                  id="homeowner-request-update-text"
                  value={updateText}
                  onChange={(event) => {
                    setUpdateText(event.target.value);
                    updateIntentRef.current = null;
                  }}
                  required
                  maxLength={5000}
                  rows={5}
                  style={textarea}
                />
                <div style={actionButtons}>
                  <button type="submit" disabled={busy || !updateText.trim()} style={primaryButton}>
                    {busy
                      ? text(language, "Adding…", "Agregando…")
                      : text(language, "Add Update", "Agregar Actualización")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    style={secondaryButton}
                    onClick={() => {
                      setSurface("");
                      setUpdateText("");
                      updateIntentRef.current = null;
                      setFeedback(null);
                    }}
                  >
                    {text(language, "Cancel", "Cancelar")}
                  </button>
                </div>
              </form>
            )}

            {surface === "photos" && actions.addPhotos && (
              <form style={commandForm} onSubmit={savePhotos}>
                <h5 style={commandHeading}>
                  {text(language, "Append request photos", "Agregar fotos a la solicitud")}
                </h5>
                <p style={supportingText}>
                  {text(
                    language,
                    "New photos will be added after the existing request photos. Earlier photos will not be replaced.",
                    "Las fotos nuevas se agregarán después de las existentes. Las fotos anteriores no serán reemplazadas."
                  )}
                </p>
                <label style={fieldLabel} htmlFor="homeowner-request-append-photos">
                  {text(language, "New photos", "Fotos nuevas")}
                </label>
                <input
                  id="homeowner-request-append-photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={busy || mediaUploadDeferred}
                  onChange={selectAppendPhotos}
                  style={fileInput}
                />
                {photoFiles.length > 0 && (
                  <ul style={fileList}>
                    {photoFiles.map((file) => (
                      <li key={`${file.name}-${file.size}-${file.lastModified}`}>
                        {file.name}
                      </li>
                    ))}
                  </ul>
                )}
                {mediaUploadDeferred && (
                  <p role="status" style={readOnlyNotice}>
                    {mediaDeferredCopy.detail}
                  </p>
                )}
                <div style={actionButtons}>
                  <button
                    type="submit"
                    disabled={busy || mediaUploadDeferred || photoFiles.length === 0}
                    style={primaryButton}
                  >
                    {busy
                      ? t("uploading", language)
                      : text(language, "Attach Photos", "Adjuntar Fotos")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    style={secondaryButton}
                    onClick={() => {
                      setSurface("");
                      setPhotoFiles([]);
                      setFeedback(null);
                    }}
                  >
                    {text(language, "Cancel", "Cancelar")}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {feedback && surface !== "edit" && (
          <p
            role={feedback.kind === "error" ? "alert" : "status"}
            style={feedback.kind === "error" ? errorText : successText}
          >
            {feedback.message}
          </p>
        )}
      </section>
    </div>
  );
}

const panel = { display: "grid", gap: 14 };
const historySection = { display: "grid", gap: 10, padding: 14, borderRadius: 18, border: "1px solid rgba(148, 163, 184, 0.2)", background: "#ffffff" };
const actionSection = { display: "grid", gap: 12, padding: 14, borderRadius: 18, border: "1px solid rgba(99, 102, 241, 0.18)", background: "rgba(238, 242, 255, 0.55)" };
const actionHeadingRow = { display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 10 };
const sectionHeading = { margin: "3px 0 0", color: "#111827", fontSize: 16 };
const commandHeading = { margin: 0, color: "#111827", fontSize: 15 };
const eyebrow = { display: "block", color: "#4f46e5", fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" };
const stack = { display: "grid", gap: 8 };
const historyCard = { display: "grid", gap: 7, padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" };
const updateCard = { display: "grid", gap: 4, marginTop: 4, padding: "10px 12px", borderLeft: "3px solid #818cf8", borderRadius: "0 10px 10px 0", background: "#ffffff" };
const updateLabel = { color: "#4338ca", fontSize: 11, fontWeight: 900 };
const historyText = { margin: 0, color: "#334155", fontSize: 14, lineHeight: 1.5, overflowWrap: "anywhere" };
const participantSection = { display: "grid", gap: 8, marginTop: 6 };
const participantRow = { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 11px", borderRadius: 10, background: "#f8fafc", color: "#334155", fontSize: 13 };
const participantRole = { color: "#64748b", fontSize: 12, fontWeight: 800 };
const versionBadge = { borderRadius: 999, padding: "6px 9px", background: "#e0e7ff", color: "#3730a3", fontSize: 11, fontWeight: 900 };
const supportingText = { margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.5 };
const readOnlyNotice = { margin: 0, padding: "10px 12px", borderRadius: 12, background: "#f1f5f9", color: "#475569", fontSize: 13, lineHeight: 1.45 };
const guidanceCard = { display: "grid", gap: 6, padding: 12, borderRadius: 14, border: "1px solid #fbbf24", background: "#fffbeb", color: "#78350f" };
const guidanceText = { margin: 0, fontSize: 14, lineHeight: 1.45 };
const actionButtons = { display: "flex", flexWrap: "wrap", gap: 10 };
const primaryButton = { flex: "1 1 150px", minHeight: 44, border: 0, borderRadius: 12, padding: "11px 14px", background: "#4f46e5", color: "#ffffff", fontWeight: 900, cursor: "pointer" };
const secondaryButton = { flex: "1 1 150px", minHeight: 44, border: "1px solid #cbd5e1", borderRadius: 12, padding: "10px 14px", background: "#ffffff", color: "#334155", fontWeight: 900, cursor: "pointer" };
const commandForm = { minWidth: 0, display: "grid", gap: 10, padding: 14, borderRadius: 16, background: "#ffffff", border: "1px solid #c7d2fe" };
const fieldLabel = { color: "#334155", fontSize: 13, fontWeight: 900 };
const textarea = { width: "100%", minWidth: 0, boxSizing: "border-box", resize: "vertical", border: "1px solid #cbd5e1", borderRadius: 12, padding: 12, color: "#111827", font: "inherit", lineHeight: 1.45 };
const fileInput = { width: "100%", minWidth: 0, boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 12, padding: 10, background: "#ffffff", color: "#334155" };
const fileList = { minWidth: 0, margin: 0, paddingLeft: 22, color: "#475569", fontSize: 13, overflowWrap: "anywhere" };
const errorText = { margin: 0, color: "#b91c1c", fontSize: 13, fontWeight: 800, lineHeight: 1.45 };
const successText = { margin: 0, color: "#166534", fontSize: 13, fontWeight: 800, lineHeight: 1.45 };
