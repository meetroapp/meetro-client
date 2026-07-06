import { useState, useEffect, useRef } from "react";

import BottomNav from "../components/BottomNav";
import { createNotification } from "../utils/meetroNotifications";
import { buildRequestMatchingFields } from "../utils/requestMatchingFields";
import {
  CAMERA_PERMISSION_MESSAGE,
  createPhotoInputEvent,
  openJobPhotoPicker,
} from "../utils/cameraPhotoPicker";
import {
  getMediaDeferredCopy,
  getMediaDeferredNotice,
  guardFriendsAndFamilyMediaUpload,
  isFriendsAndFamilyMediaDeferred,
} from "../utils/mediaDeferral";
import { formatMessageTime } from "../utils/displayTime";

function EmergencyRequest({ setPage }) {
  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "en"
  );

  useEffect(() => {
    const handleLanguageChange = () => {
      setLanguage(localStorage.getItem("language") || "en");
    };

    window.addEventListener(
      "languageChanged",
      handleLanguageChange
    );

    return () => {
      window.removeEventListener(
        "languageChanged",
        handleLanguageChange
      );
    };
  }, []);

const selectedService =
    localStorage.getItem("selectedEmergencyService") || "Emergency Help";

  const [issue, setIssue] = useState(
    localStorage.getItem("emergencyIssue") || ""
  );
  const [gateCode, setGateCode] = useState(
    localStorage.getItem("emergencyGateCode") || ""
  );
  const [entryNotes, setEntryNotes] = useState(
    localStorage.getItem("emergencyEntryNotes") || ""
  );
  const [petWarning, setPetWarning] = useState(
    localStorage.getItem("emergencyPetWarning") === "true"
  );
  const [urgency, setUrgency] = useState(
    localStorage.getItem("emergencyUrgency") || "urgent"
  );

  const [photos, setPhotos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("emergencyPhotos") || "[]");
    } catch {
      return [];
    }
  });
  const [photoError, setPhotoError] = useState("");

  const sendRequestRef = useRef(null);
  const photoInputRef = useRef(null);

  function scrollToSendRequest() {
    setTimeout(() => {
      sendRequestRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
  }

  const text = {
    en: {
      title: "Request Emergency Help",
      subtitle: "Tell local pros what you need help with.",
      service: "Selected Service",
      issue: "What happened?",
      issuePlaceholder: "Example: Water leaking under sink, breaker keeps tripping...",
      access: "Access Info",
      gatePlaceholder: "Example: 4821",
      entryPlaceholder: "Example: Use side gate, call when outside...",
      petWarning: "Pet or safety warning",
      urgency: "Urgency Level",
      normal: "Today",
      urgent: "Urgent",
      critical: "Critical",
      upload: "Upload photos",
      uploadNote: "Photo upload coming soon",
      submit: "Send Request",
      back: "Back to Emergency",
    },
    es: {
      title: "Solicitar Ayuda de Emergencia",
      subtitle: "Dile a profesionales locales qué necesitas.",
      service: "Servicio Seleccionado",
      issue: "¿Qué pasó?",
      issuePlaceholder: "Ejemplo: Fuga debajo del fregadero, breaker fallando...",
      access: "Información de Acceso",
      gatePlaceholder: "Ejemplo: 4821",
      entryPlaceholder: "Ejemplo: Usa la puerta lateral, llama al llegar...",
      petWarning: "Advertencia de mascota o seguridad",
      urgency: "Nivel de Urgencia",
      normal: "Hoy",
      urgent: "Urgente",
      critical: "Crítico",
      upload: "Subir fotos",
      uploadNote: "Fotos próximamente",
      submit: "Enviar Solicitud",
      back: "Regresar a Emergencia",
    },
  };

  const t = text[language] || text.en;
  const mediaUploadDeferred = isFriendsAndFamilyMediaDeferred();
  const mediaDeferredCopy = getMediaDeferredCopy(language);

  function saveUrgency(value) {
    setUrgency(value);
    localStorage.setItem("emergencyUrgency", value);
  }

  function createPhotoThumbnail(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 520;
          const scale = Math.min(
            1,
            maxSize / Math.max(img.width, img.height)
          );

          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          resolve(canvas.toDataURL("image/jpeg", 0.58));
        };

        img.onerror = () => resolve("");
        img.src = reader.result;
      };

      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotoUpload(event) {
    if (
      !guardFriendsAndFamilyMediaUpload({
        event,
        language,
        onDeferred: setPhotoError,
      })
    ) {
      return;
    }

    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    setPhotoError("");
    const addedPhotos = await Promise.all(
      files.slice(0, 4).map(async (file) => ({
        id: `${Date.now()}-${file.name}`,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl: await createPhotoThumbnail(file),
        addedAt: new Date().toISOString(),
      }))
    );

    const nextPhotos = [...photos, ...addedPhotos].slice(0, 6);

    setPhotos(nextPhotos);
    localStorage.setItem("emergencyPhotos", JSON.stringify(nextPhotos));

    if (event.target) {
      event.target.value = "";
    }
  }

  async function openEmergencyPhotoPicker() {
    setPhotoError("");

    if (mediaUploadDeferred) {
      setPhotoError(getMediaDeferredNotice(language));
      return;
    }

    await openJobPhotoPicker({
      inputRef: photoInputRef,
      fileNamePrefix: "emergency-photo",
      language,
      onPhotos: (nativePhotos) =>
        handlePhotoUpload(createPhotoInputEvent(nativePhotos.map((photo) => photo.file))),
      onError: (message) => setPhotoError(message || CAMERA_PERMISSION_MESSAGE),
    });
  }

  function removePhoto(photoId) {
    const nextPhotos = photos.filter((photo) => photo.id !== photoId);
    setPhotos(nextPhotos);
    localStorage.setItem("emergencyPhotos", JSON.stringify(nextPhotos));
  }

  function submitRequest() {
    const currentUserKey =
      localStorage.getItem("userId") ||
      localStorage.getItem("userEmail") ||
      "guest";

    const emergencyRequestId =
      localStorage.getItem("activeEmergencyRequestId") ||
      localStorage.getItem("emergencyRequestId") ||
      `emergency-${currentUserKey}-${Date.now()}`;

    const emergencyConversationId =
      localStorage.getItem("emergencyConversationId") ||
      `emergency-conversation-${emergencyRequestId}`;

    const selectedEmergencyBusiness =
      localStorage.getItem("selectedEmergencyBusiness") ||
      localStorage.getItem("businessName") ||
      "Emergency Professional";

    const emergencyCustomerName =
      localStorage.getItem("emergencyCustomerName") ||
      localStorage.getItem("userName") ||
      "Homeowner";

    localStorage.setItem("activeEmergencyRequestId", emergencyRequestId);
    localStorage.setItem("emergencyRequestId", emergencyRequestId);
    localStorage.setItem("emergencyConversationId", emergencyConversationId);
    localStorage.setItem("emergencyCustomerName", emergencyCustomerName);
    localStorage.setItem("emergencyBusinessName", selectedEmergencyBusiness);

    localStorage.setItem("emergencyIssue", issue);
    localStorage.setItem("emergencyGateCode", gateCode);
    localStorage.setItem("emergencyEntryNotes", entryNotes);
    localStorage.setItem("emergencyPetWarning", petWarning ? "true" : "false");
    localStorage.setItem("emergencyUrgency", urgency);

    localStorage.setItem("activeConversationId", emergencyConversationId);
    localStorage.setItem("activeConversationName", selectedService);
    localStorage.setItem("meetroConversationType", "emergency");
    const emergencyCategory =
      selectedService.includes("Plumbing")
        ? "plumbing"
        : selectedService.includes("Electrical")
        ? "electrical"
        : selectedService.includes("Roof")
        ? "roofing"
        : selectedService.includes("Locksmith")
        ? "locksmith"
        : selectedService.includes("Storm")
        ? "storm"
        : "general";
    const emergencyMatchingFields = buildRequestMatchingFields({
      title: selectedService,
      service: selectedService,
      category: emergencyCategory,
      issue,
      type: "emergency",
      urgency,
    });

    localStorage.setItem("selectedEmergencyCategory", emergencyCategory);
    localStorage.setItem("selectedEmergencyDomain", emergencyMatchingFields.serviceDomain);
    localStorage.setItem("selectedEmergencySpecialty", emergencyMatchingFields.serviceSpecialty);

    localStorage.setItem("emergencyDispatchStatus", "pending");

    localStorage.setItem(
      `selectedEmergencyService_${currentUserKey}`,
      selectedService
    );

    const emergencyRecord = {
      id: emergencyRequestId,
      conversationId: emergencyConversationId,
      type: "emergency",
      title: selectedService,
      service: selectedService,
      category: emergencyCategory,
      ...emergencyMatchingFields,
      issue,
      gateCode,
      entryNotes,
      petWarning,
      urgency,
      photos,
      customerName: emergencyCustomerName,
      businessName: selectedEmergencyBusiness,
      businessPhone: localStorage.getItem("emergencyBusinessPhone") || "",
      dispatchFee: localStorage.getItem("emergencyDispatchFee") || "",
      cancellationFee: localStorage.getItem("emergencyCancellationFee") || "",
      location: localStorage.getItem("emergencyLocation") || "Cape Coral",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      `meetro_emergency_record_${emergencyRequestId}`,
      JSON.stringify(emergencyRecord)
    );

    localStorage.setItem(
      "activeEmergencyRecord",
      JSON.stringify(emergencyRecord)
    );

    createNotification({
      type: "emergency_needs_attention",
      title: language === "es" ? "Emergencia necesita atención" : "Emergency needs attention",
      message:
        language === "es"
          ? `${emergencyCustomerName} envió una solicitud de emergencia: ${selectedService}.`
          : `${emergencyCustomerName} sent an emergency request: ${selectedService}.`,
      role: "professional",
      requestId: emergencyRequestId,
      conversationId: emergencyConversationId,
      emergencyId: emergencyRequestId,
      dedupeKey: `emergency_needs_attention:${emergencyRequestId}`,
    });

    localStorage.setItem(
      `meetro_emergency_conversation_meta_${currentUserKey}`,
      JSON.stringify(emergencyRecord)
    );

    const nowTime = formatMessageTime(new Date());

    const emergencyPhotoMessages = photos
      .filter((photo) => photo.previewUrl)
      .map((photo, index) => ({
        id: `emergency-photo-${Date.now()}-${index}`,
        type: "image",
        sender: "me",
        senderRole: "homeowner",
        workflowType: "emergency_photo",
        emergencyRequestId,
        emergencyConversationId,
        title: language === "es" ? "Foto de emergencia" : "Emergency Photo",
        subtitle: photo.name || "",
        text:
          language === "es"
            ? "Foto adjunta a la solicitud de emergencia"
            : "Photo attached to emergency request",
        imageUrl: photo.previewUrl,
        fileName: photo.name,
        time: nowTime,
        status: "sent",
        seenAt: "",
        unsent: false,
        createdAt: Date.now() + index + 1,
      }));

    localStorage.setItem(
      `meetro_conversation_${emergencyConversationId}`,
      JSON.stringify(emergencyPhotoMessages)
    );

    localStorage.setItem(
      `meetro_conversation_read_${emergencyConversationId}`,
      "false"
    );

    const registry = JSON.parse(
      localStorage.getItem("meetro_conversation_registry") || "[]"
    );

    const registryItem = {
      id: emergencyConversationId,
      project_title: selectedService,
      project_description: issue?.trim() || "Emergency request submitted",
      homeowner_email:
        localStorage.getItem("userName") ||
        localStorage.getItem("customerName") ||
        "Emergency Customer",
      location:
        localStorage.getItem("emergencyLocation") ||
        "Emergency Service Location",
      requestCategory: emergencyMatchingFields.requestCategory,
      serviceDomain: emergencyMatchingFields.serviceDomain,
      serviceSpecialty: emergencyMatchingFields.serviceSpecialty,
      status: "Emergency Request",
      unread: true,
      conversation_type: "emergency",
      saved_to_history: false,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "meetro_conversation_registry",
      JSON.stringify([
        registryItem,
        ...registry.filter(
          (item) => String(item.id) !== String(emergencyConversationId)
        ),
      ])
    );

    localStorage.setItem("meetroMessageView", "active");
    window.dispatchEvent(new Event("meetro-messages-updated"));

        window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));

    localStorage.setItem("meetroConversationType", "emergency");
    localStorage.setItem("conversationReturnPage", "emergencyStatus");
    localStorage.setItem("dispatchReturnPage", "conversationThread");

    setPage("conversationThread");
  }

  return (
    <div className="app-page meetro-form-page" style={page}>
      <div style={card}>
        <button style={backMini} onClick={() => setPage("emergency")}>
          ←
        </button>

        <h1 style={title}>{t.title}</h1>
        <p style={subtitle}>{t.subtitle}</p>

        <div style={section}>
          <label style={label}>{t.service}</label>
          <div style={serviceBox}>{selectedService}</div>
        </div>

        <div style={section}>
          <label style={label}>{t.issue}</label>
          <textarea
            style={textarea}
            value={issue}
            onChange={(e) => {
              setIssue(e.target.value);
              localStorage.setItem("emergencyIssue", e.target.value);
            }}
            placeholder={t.issuePlaceholder}
          />
        </div>

        <div style={section}>
          <label style={label}>{t.access}</label>

          <input
            style={input}
            value={gateCode}
            onChange={(e) => {
              setGateCode(e.target.value);
              localStorage.setItem("emergencyGateCode", e.target.value);
            }}
            placeholder={t.gatePlaceholder}
          />

          <textarea
            style={{ ...textarea, minHeight: "90px", marginTop: "12px" }}
            value={entryNotes}
            onChange={(e) => {
              setEntryNotes(e.target.value);
              localStorage.setItem("emergencyEntryNotes", e.target.value);
            }}
            placeholder={t.entryPlaceholder}
          />

          <button
            style={petWarning ? activeWarningButton : warningButton}
            onClick={() => {
              const nextValue = !petWarning;
              setPetWarning(nextValue);
              localStorage.setItem("emergencyPetWarning", nextValue.toString());
            }}
          >
            {petWarning ? " " : " "}
            {t.petWarning}
          </button>
        </div>

        <div style={section}>
          <label style={label}>{t.urgency}</label>

          <div style={urgencyGrid}>
            <button
              style={urgency === "normal" ? activeOptionButton : optionButton}
              onClick={() => {
                saveUrgency("normal");
                scrollToSendRequest();
              }}
            >
              {t.normal}
            </button>

            <button
              style={urgency === "urgent" ? activeOptionButton : optionButton}
              onClick={() => {
                saveUrgency("urgent");
                scrollToSendRequest();
              }}
            >
              {t.urgent}
            </button>

            <button
              style={urgency === "critical" ? activeDangerButton : optionButton}
              onClick={() => {
                saveUrgency("critical");
                scrollToSendRequest();
              }}
            >
              {t.critical}
            </button>
          </div>
        </div>

        <div style={uploadBox}>
          <strong>{t.upload}</strong>
          <p>
            {mediaUploadDeferred
              ? mediaDeferredCopy.detail
              : photos.length
              ? `${photos.length} ${language === "es" ? "foto(s) agregada(s)" : "photo(s) added"}`
              : t.uploadNote}
          </p>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={mediaUploadDeferred}
            style={{ display: "none" }}
            onChange={handlePhotoUpload}
          />

          <button
            type="button"
            style={
              mediaUploadDeferred
                ? { ...uploadButton, ...disabledUploadButton }
                : uploadButton
            }
            disabled={mediaUploadDeferred}
            onClick={openEmergencyPhotoPicker}
          >
             {mediaUploadDeferred
               ? mediaDeferredCopy.title
               : language === "es"
                 ? "Agregar fotos"
                 : "Add Photos"}
          </button>

          {photoError && <p style={photoErrorText}>{photoError}</p>}

          {photos.length > 0 && (
            <div style={photoList}>
              {photos.map((photo) => (
                <div key={photo.id} style={photoChip}>
                  {photo.previewUrl && (
                    <img
                      src={photo.previewUrl}
                      alt={photo.name}
                      style={photoThumb}
                    />
                  )}

                  <div style={photoInfo}>
                    <strong>{photo.name}</strong>
                    <span>
                      {language === "es"
                        ? "Vista previa adjunta"
                        : "Preview attached"}
                    </span>
                  </div>

                  <button
                    type="button"
                    style={removePhotoButton}
                    onClick={() => removePhoto(photo.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div ref={sendRequestRef} style={sendArea}>
          <button style={submitButton} onClick={submitRequest}>
            {t.submit}
          </button>
        </div>
         
             <button style={darkButton} onClick={() => setPage("emergency")}>
          {t.back}
        </button>
      </div>

      <BottomNav currentPage="emergency" setPage={setPage} />
    </div>
  );
}         

  const page = {
  minHeight: "100dvh",
  background: "#f5f7fb",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 24px) max(20px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
};

  const card = {
  maxWidth: "430px",
  margin: "0 auto",
  textAlign: "center",
  paddingTop: "24px",
  paddingBottom: "90px",
};

const backMini = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  border: "none",
  background: "white",
  fontSize: "24px",
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  marginBottom: "28px",
};

const title = {
  fontSize: "30px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "8px",
};

const subtitle = {
  color: "#6b7280",
  fontSize: "16px",
  marginBottom: "28px",
};

const section = {
  marginBottom: "24px",
};

const label = {
  display: "block",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "12px",
};

const serviceBox = {
  background: "white",
  padding: "18px",
  borderRadius: "18px",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: "900",
  fontSize: "18px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
};

const input = {
  width: "100%",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #d1d5db",
  fontSize: "16px",
  boxSizing: "border-box",
  outline: "none",
};

const textarea = {
  width: "100%",
  minHeight: "120px",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #d1d5db",
  fontSize: "16px",
  boxSizing: "border-box",
  outline: "none",
  resize: "vertical",
};

const warningButton = {
  width: "100%",
  marginTop: "12px",
  padding: "15px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  background: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const activeWarningButton = {
  ...warningButton,
  background: "#fef3c7",
  border: "1px solid #fbbf24",
  color: "#92400e",
};

const urgencyGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "10px",
};

const uploadButton = {
  marginTop: "14px",
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const disabledUploadButton = {
  background: "#e2e8f0",
  color: "#64748b",
  cursor: "not-allowed",
};

const photoList = {
  display: "grid",
  gap: "10px",
  marginTop: "14px",
};

const photoChip = {
  display: "grid",
  gridTemplateColumns: "58px 1fr 32px",
  alignItems: "center",
  gap: "10px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "8px",
  fontSize: "13px",
  fontWeight: "800",
  color: "#334155",
  textAlign: "left",
};

const photoThumb = {
  width: "58px",
  height: "58px",
  borderRadius: "14px",
  objectFit: "cover",
  background: "#e5e7eb",
};

const photoInfo = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "3px",
};

photoInfo.strong = undefined;

const photoInfoText = {};

const removePhotoButton = {
  width: "28px",
  height: "28px",
  borderRadius: "999px",
  border: "none",
  background: "#fee2e2",
  color: "#991b1b",
  fontSize: "18px",
  fontWeight: "900",
  cursor: "pointer",
};

const sendArea = {
  scrollMarginBottom: "190px",
  marginTop: "20px",
};

const optionButton = {
  padding: "13px",
  borderRadius: "15px",
  border: "1px solid #e5e7eb",
  background: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const activeOptionButton = {
  ...optionButton,
  background: "#ede9fe",
  color: "var(--meetro-color-forest, #1f4d34)",
  border: "1px solid #ddd6fe",
};

const activeDangerButton = {
  ...optionButton,
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
};

const uploadBox = {
  background: "white",
  padding: "24px",
  borderRadius: "20px",
  marginBottom: "20px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
};

const photoErrorText = {
  margin: "10px 0 0",
  color: "#991b1b",
  fontSize: "13px",
  fontWeight: "800",
};

const submitButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
  marginBottom: "12px",
};

const darkButton = {
  width: "100%",
  padding: "15px",
  borderRadius: "18px",
  border: "none",
  background: "#111827",
  color: "white",
  fontWeight: "900",
  fontSize: "15px",
  cursor: "pointer",
};

export default EmergencyRequest;
