import { useEffect, useId, useRef, useState } from "react";
import {
  REQUEST_PHOTO_MAX_COUNT,
  createTemporaryRequestPhotoPreview,
  validateRequestPhotoFiles,
} from "../utils/requestPhotoMedia.js";
import {
  createLocalRequestPhotoItem,
  getRequestPhotoPreviewUrl,
  hydrateRequestEditPhotos,
  removeRequestEditPhotoAt,
  reorderRequestEditPhotos,
  revokeLocalRequestEditPhotoPreviews,
} from "../utils/requestEditPhotoState.js";
import {
  createHomeownerRequestEditDraft,
} from "../utils/homeownerRequestEditPayload.js";

function text(language, english, spanish) {
  return language === "es" ? spanish : english;
}

function photoErrorCopy(code, language) {
  const messages = {
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
      `A request can contain up to ${REQUEST_PHOTO_MAX_COUNT} photos.`,
      `Una solicitud puede contener hasta ${REQUEST_PHOTO_MAX_COUNT} fotos.`
    ),
  };
  return messages[code] || text(
    language,
    "Choose at least one valid photo.",
    "Elige al menos una foto válida."
  );
}

export default function HomeownerRequestEditForm({
  request,
  language,
  busy = false,
  mediaUploadDeferred = false,
  error = "",
  cleanupWarning = "",
  onSave,
  onCancel,
  onPreview,
}) {
  const formId = useId();
  const [draft, setDraft] = useState(() =>
    createHomeownerRequestEditDraft(request)
  );
  const [photos, setPhotos] = useState(() =>
    hydrateRequestEditPhotos(request)
  );
  const [photosChanged, setPhotosChanged] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photosRef = useRef(photos);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(
    () => () => revokeLocalRequestEditPhotoPreviews(photosRef.current),
    []
  );

  function change(field) {
    return (event) => {
      setDraft((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };
  }

  function selectPhotos(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    const validation = validateRequestPhotoFiles(files, {
      existingCount: photos.length,
    });
    if (!validation.ok) {
      setPhotoError(photoErrorCopy(validation.code, language));
      return;
    }
    const additions = validation.files.map((file) =>
      createLocalRequestPhotoItem(
        createTemporaryRequestPhotoPreview(file)
      )
    );
    setPhotos((current) => [...current, ...additions]);
    setPhotosChanged(true);
    setPhotoError("");
  }

  function removePhoto(index) {
    setPhotos((current) => {
      const removed = current[index];
      if (removed?.kind === "local") removed.revoke?.();
      return removeRequestEditPhotoAt(current, index);
    });
    setPhotosChanged(true);
    setPhotoError("");
  }

  function movePhoto(index, direction) {
    setPhotos((current) =>
      reorderRequestEditPhotos(current, index, direction)
    );
    setPhotosChanged(true);
  }

  const addPhotosDisabled =
    busy || mediaUploadDeferred || photos.length >= REQUEST_PHOTO_MAX_COUNT;

  return (
    <form
      style={form}
      onSubmit={(event) => {
        event.preventDefault();
        onSave?.({ draft, photos, photosChanged });
      }}
    >
      <div>
        <span style={eyebrow}>
          {text(language, "Editing existing request", "Editando solicitud existente")}
        </span>
        <h4 style={heading}>
          {text(language, "Edit Request", "Editar Solicitud")}
        </h4>
        <p style={supportingText}>
          {text(
            language,
            "Changes are saved only after Meetro confirms them. The original reported concern remains in the request history.",
            "Los cambios se guardan solo cuando Meetro los confirma. La inquietud original permanece en el historial."
          )}
        </p>
      </div>

      <label style={fieldLabel} htmlFor={`${formId}-title`}>
        {text(language, "Request title", "Título de la solicitud")}
      </label>
      <input
        id={`${formId}-title`}
        value={draft.title}
        onChange={change("title")}
        required
        maxLength={160}
        style={input}
      />

      <label style={fieldLabel} htmlFor={`${formId}-description`}>
        {text(language, "Current request details", "Detalles actuales de la solicitud")}
      </label>
      <textarea
        id={`${formId}-description`}
        value={draft.description}
        onChange={change("description")}
        required
        maxLength={5000}
        rows={5}
        style={textarea}
      />

      {draft.locationNormalizationStatus === "normalized" ? (
        <fieldset style={fieldset}>
          <legend style={legend}>
            {text(language, "Service location", "Ubicación del servicio")}
          </legend>
          {draft.locationIntakeMode === "exact_on_file" && (
            <>
              <label style={fieldLabel} htmlFor={`${formId}-street`}>
                {text(language, "Street address", "Dirección")}
              </label>
              <input
                id={`${formId}-street`}
                value={draft.serviceAddressLine1}
                onChange={change("serviceAddressLine1")}
                style={input}
              />
            </>
          )}
          <div style={responsiveGrid}>
            <label style={fieldLabel}>
              {text(language, "City", "Ciudad")}
              <input
                value={draft.serviceCity}
                onChange={change("serviceCity")}
                style={input}
              />
            </label>
            <label style={fieldLabel}>
              {text(language, "State / region", "Estado / región")}
              <input
                value={draft.serviceRegion}
                onChange={change("serviceRegion")}
                style={input}
              />
            </label>
            <label style={fieldLabel}>
              {text(language, "Postal code", "Código postal")}
              <input
                value={draft.servicePostalCode}
                onChange={change("servicePostalCode")}
                style={input}
              />
            </label>
            <label style={fieldLabel}>
              {text(language, "Country code", "Código de país")}
              <input
                value={draft.serviceCountryCode}
                onChange={change("serviceCountryCode")}
                maxLength={2}
                style={input}
              />
            </label>
            {draft.locationIntakeMode === "exact_on_file" && (
              <label style={fieldLabel}>
                {text(language, "Unit (optional)", "Unidad (opcional)")}
                <input
                  value={draft.unitNumber}
                  onChange={change("unitNumber")}
                  style={input}
                />
              </label>
            )}
          </div>
          <label style={fieldLabel} htmlFor={`${formId}-access`}>
            {text(language, "Access details (optional)", "Detalles de acceso (opcional)")}
          </label>
          <textarea
            id={`${formId}-access`}
            value={draft.accessNotes}
            onChange={change("accessNotes")}
            rows={3}
            style={textarea}
          />
        </fieldset>
      ) : (
        <>
          <label style={fieldLabel} htmlFor={`${formId}-location`}>
            {text(language, "Service location", "Ubicación del servicio")}
          </label>
          <input
            id={`${formId}-location`}
            value={draft.location}
            onChange={change("location")}
            style={input}
          />
        </>
      )}

      <fieldset style={fieldset}>
        <legend style={legend}>
          {text(language, "Request photos", "Fotos de la solicitud")}
        </legend>
        <p style={supportingText}>
          {text(
            language,
            "Before professional reliance, this editor can update the request photo collection.",
            "Antes de que exista dependencia profesional, este editor puede actualizar las fotos de la solicitud."
          )}
        </p>
        <input
          id={`${formId}-photos`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={addPhotosDisabled}
          onChange={selectPhotos}
          style={visuallyHidden}
        />
        <label
          htmlFor={`${formId}-photos`}
          aria-disabled={addPhotosDisabled}
          style={{
            ...secondaryButton,
            ...(addPhotosDisabled ? disabledButton : {}),
          }}
        >
          {mediaUploadDeferred
            ? text(language, "Photo upload unavailable", "Carga de fotos no disponible")
            : photos.length >= REQUEST_PHOTO_MAX_COUNT
              ? text(language, "Photo limit reached", "Límite de fotos alcanzado")
              : text(language, "Choose Photos", "Elegir Fotos")}
        </label>

        {photos.length > 0 && (
          <div style={photoGrid}>
            {photos.map((photo, index) => {
              const previewUrl = getRequestPhotoPreviewUrl(photo);
              return (
                <div key={photo.id || `${previewUrl}-${index}`} style={photoCard}>
                  <button
                    type="button"
                    onClick={() => previewUrl && onPreview?.(previewUrl)}
                    style={previewButton}
                    aria-label={text(language, `View photo ${index + 1}`, `Ver foto ${index + 1}`)}
                  >
                    <img src={previewUrl} alt="" style={photoImage} />
                  </button>
                  <div style={photoControls}>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => movePhoto(index, -1)}
                      aria-label={text(language, "Move photo left", "Mover foto a la izquierda")}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={index === photos.length - 1}
                      onClick={() => movePhoto(index, 1)}
                      aria-label={text(language, "Move photo right", "Mover foto a la derecha")}
                    >
                      →
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      aria-label={text(language, "Remove photo", "Eliminar foto")}
                    >
                      ×
                    </button>
                  </div>
                  {photo.displayOnly && (
                    <small style={warningText}>
                      {text(
                        language,
                        "Remove and re-add this older photo before saving photo changes.",
                        "Elimina y vuelve a agregar esta foto antigua antes de guardar cambios de fotos."
                      )}
                    </small>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </fieldset>

      {(photoError || error) && (
        <p role="alert" style={errorText}>{photoError || error}</p>
      )}
      {cleanupWarning && (
        <p role="status" style={warningText}>{cleanupWarning}</p>
      )}

      <div style={actions}>
        <button type="submit" disabled={busy} style={primaryButton}>
          {busy
            ? text(language, "Saving…", "Guardando…")
            : text(language, "Save Changes", "Guardar Cambios")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          style={secondaryButton}
        >
          {text(language, "Cancel", "Cancelar")}
        </button>
      </div>
    </form>
  );
}

const form = {
  display: "grid",
  gap: 10,
  padding: 16,
  borderRadius: 18,
  border: "1px solid rgba(99, 102, 241, 0.2)",
  background: "#ffffff",
};
const eyebrow = {
  display: "block",
  color: "#4f46e5",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};
const heading = { margin: "4px 0 0", color: "#111827", fontSize: 18 };
const supportingText = { margin: "4px 0", color: "#64748b", fontSize: 13, lineHeight: 1.5 };
const fieldLabel = { display: "grid", gap: 6, color: "#334155", fontSize: 13, fontWeight: 800 };
const input = { width: "100%", minWidth: 0, boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 12, padding: "11px 12px", font: "inherit", color: "#111827", background: "#ffffff" };
const textarea = { ...input, resize: "vertical", lineHeight: 1.45 };
const fieldset = { minWidth: 0, display: "grid", gap: 10, margin: "4px 0", padding: 12, border: "1px solid #e2e8f0", borderRadius: 14 };
const legend = { padding: "0 6px", color: "#1e293b", fontSize: 14, fontWeight: 900 };
const responsiveGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))", gap: 10 };
const photoGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(130px, 100%), 1fr))", gap: 10 };
const photoCard = { minWidth: 0, display: "grid", gap: 6, padding: 8, border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" };
const previewButton = { width: "100%", height: 110, padding: 0, border: 0, borderRadius: 10, overflow: "hidden", background: "#e2e8f0", cursor: "pointer" };
const photoImage = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
const photoControls = { display: "flex", justifyContent: "space-between", gap: 6 };
const actions = { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 };
const primaryButton = { flex: "1 1 170px", minHeight: 44, border: 0, borderRadius: 12, padding: "11px 14px", background: "#4f46e5", color: "#ffffff", fontWeight: 900, cursor: "pointer" };
const secondaryButton = { flex: "1 1 150px", minHeight: 44, boxSizing: "border-box", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid #cbd5e1", borderRadius: 12, padding: "10px 14px", background: "#ffffff", color: "#334155", fontWeight: 900, cursor: "pointer" };
const disabledButton = { opacity: 0.55, cursor: "not-allowed", pointerEvents: "none" };
const errorText = { margin: 0, color: "#b91c1c", fontSize: 13, fontWeight: 800, lineHeight: 1.45 };
const warningText = { margin: 0, color: "#92400e", fontSize: 12, lineHeight: 1.45 };
const visuallyHidden = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 };
