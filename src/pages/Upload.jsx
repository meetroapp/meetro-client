import { useEffect, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import ServiceSelectorSheet from "../components/ServiceSelectorSheet";
import API_URL from "../api";
import { authFetch } from "../utils/authFetch";
import { getLanguage, t } from "../utils/language";
import {
  clearAssistantRequestDraft,
  readAssistantRequestDraft,
} from "../utils/assistantRequestDraft";
import { buildRequestMatchingFields } from "../utils/requestMatchingFields";
import {
  getRequestIntelligenceServices,
  searchRequestServices,
} from "../utils/requestIntelligence";
import {
  CAMERA_PERMISSION_MESSAGE,
  createPhotoInputEvent,
  openJobPhotoPicker,
} from "../utils/cameraPhotoPicker";

function buildSuggestedRequestTitle(value = "", fallback = "") {
  const source = String(value || fallback || "").trim();
  if (!source) return "";

  const cleaned = source
    .replace(/^i\s+(need|want|would like)\s+(a|an|the)?\s*/i, "")
    .replace(/^help\s+with\s+/i, "")
    .replace(/[.?!]+$/g, "")
    .trim();
  const title = cleaned || source;

  return title.charAt(0).toUpperCase() + title.slice(1);
}

function Upload({ setPage, currentPage }) {
  const [language, updateLanguage] = useState(getLanguage());
  const photoInputRef = useRef(null);
  const descriptionInputRef = useRef(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [location, setLocation] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [projectPhotos, setProjectPhotos] = useState([]);
  const [photoRecords, setPhotoRecords] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [creating, setCreating] = useState(false);
  const [assistantDraftMetadata, setAssistantDraftMetadata] = useState(null);
  const [serviceSelectorOpen, setServiceSelectorOpen] = useState(false);
  const [selectedServiceOptionId, setSelectedServiceOptionId] = useState("");
  const [titleEdited, setTitleEdited] = useState(false);
  const [descriptionEdited, setDescriptionEdited] = useState(false);

  useEffect(() => {
    const handleLanguageChange = () => {
      updateLanguage(getLanguage());
    };

    window.addEventListener("languageChanged", handleLanguageChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
    };
  }, []);

  const categories = [
    { value: "handyman", label: t("handyman") },
    { value: "contractor", label: t("generalContractor") },
    { value: "painting", label: t("painting") },
    { value: "plumbing", label: t("plumbing") },
    { value: "electrical", label: t("electrical") },
    { value: "flooring", label: t("flooring") },
    { value: "roofing", label: t("roofing") },
    { value: "hvac", label: t("hvac") },
    { value: "landscaping", label: t("landscaping") },
    { value: "lawnCare", label: t("lawnCare") },
    { value: "treeService", label: t("treeService") },
    { value: "poolService", label: t("poolService") },
    { value: "cleaning", label: t("cleaning") },
    { value: "pressureWashing", label: t("pressureWashing") },
    { value: "paverSealing", label: t("paverSealing") },
    { value: "junkRemoval", label: t("junkRemoval") },
    { value: "demolition", label: t("demolition") },
    { value: "drywall", label: t("drywall") },
    { value: "carpentry", label: t("carpentry") },
    { value: "doorsWindows", label: t("doorsWindows") },
    { value: "fencing", label: t("fencing") },
    { value: "concrete", label: t("concrete") },
    { value: "tile", label: t("tile") },
    { value: "applianceRepair", label: t("applianceRepair") },
    { value: "pestControl", label: t("pestControl") },
    { value: "moving", label: t("movingCompany") },
    { value: "realEstate", label: t("realEstate") },
    { value: "propertyManagement", label: t("propertyManagement") },
    { value: "homeHealthCare", label: t("homeHealthCare") },
    { value: "automotiveServices", label: t("automotiveServices") },
    { value: "carDetailing", label: t("carDetailing") },
    { value: "mobileServices", label: t("mobileServices") },
    { value: "mechanic", label: t("mechanic") },
    { value: "privateTransportation", label: t("privateTransportation") },
    { value: "other", label: t("otherService") },
  ];

  useEffect(() => {
    const draft = readAssistantRequestDraft(localStorage);
    if (!draft) return;

    const validCategory = categories.some((item) => item.value === draft.category);

    setTitle(draft.title || "");
    setDescription(draft.description || "");
    setCategory(validCategory ? draft.category : draft.category ? "other" : "");
    setCustomCategory(validCategory ? "" : draft.category || "");
    setServiceSearch(
      draft.suggestedServiceLabel ||
        draft.suggestedProjectType ||
        draft.title ||
        ""
    );
    setSelectedServiceOptionId(draft.service_specialty ? `service:${draft.service_specialty}` : "");
    setAssistantDraftMetadata(draft);
    setTitleEdited(Boolean(draft.title));
    setDescriptionEdited(Boolean(draft.description));
    clearAssistantRequestDraft(localStorage);
  }, []);

  useEffect(() => {
    const textarea = descriptionInputRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, assistantDraftMetadata ? 320 : 140)}px`;
  }, [description, assistantDraftMetadata]);

  const serviceSuggestions = searchRequestServices(serviceSearch, {
    translate: t,
    limit: 4,
  });
  const serviceSelectorOptions = [
    ...getRequestIntelligenceServices(t).map((service) => ({
      value: `service:${service.serviceId}`,
      label: service.label,
      groupLabel: service.categoryLabel,
      requestCategory: service.requestCategory,
      aliases: service.aliases,
    })),
    ...categories.map((item) => ({
      value: `category:${item.value}`,
      label: item.label,
      groupLabel: t("categoryExample"),
      requestCategory: item.value,
    })),
  ];
  const selectedServiceLabel =
    serviceSearch ||
    serviceSelectorOptions.find((option) => option.requestCategory === category)?.label ||
    categories.find((item) => item.value === category)?.label ||
    "";

  function handleServiceSearchChange(value) {
    setServiceSearch(value);

    const [bestMatch] = searchRequestServices(value, { translate: t, limit: 1 });
    if (bestMatch?.requestCategory) {
      setCategory(bestMatch.requestCategory);
      setCustomCategory("");
      setSelectedServiceOptionId(`service:${bestMatch.serviceId}`);
    }
    if (!titleEdited) {
      setTitle(buildSuggestedRequestTitle(value, bestMatch?.label || ""));
    }
    if (!descriptionEdited) {
      setDescription(value);
    }
  }

  function selectSuggestedService(service) {
    setServiceSearch(service.label);
    setCategory(service.requestCategory);
    setCustomCategory("");
    setSelectedServiceOptionId(`service:${service.serviceId}`);
    if (!titleEdited) {
      setTitle(buildSuggestedRequestTitle(service.label));
    }
    if (!descriptionEdited && !description.trim()) {
      setDescription(service.label);
    }
  }

  function selectServiceOption(_value, option) {
    setServiceSearch(option.label);
    setCategory(option.requestCategory);
    setCustomCategory("");
    setSelectedServiceOptionId(option.value);
    if (!titleEdited) {
      setTitle(buildSuggestedRequestTitle(option.label));
    }
    if (!descriptionEdited && !description.trim()) {
      setDescription(option.label);
    }
  }

  function saveHomeownerRequestList(updatedHomeownerRequests) {
    try {
      localStorage.setItem(
        "homeownerRequests",
        JSON.stringify(updatedHomeownerRequests)
      );

      localStorage.setItem(
        "meetroHomeownerRequestsBackup",
        JSON.stringify(updatedHomeownerRequests)
      );

      return true;
    } catch (error) {
      console.error("Failed to save homeowner request", error);
      alert(
        language === "es"
          ? "No se pudo guardar la solicitud. Intenta quitar una foto o vuelve a intentarlo."
          : "We could not save this request. Try removing a photo or try again."
      );
      return false;
    }
  }

  async function handleImageUpload(event) {
    try {
      const files = Array.from(event.target.files || []);

      if (files.length === 0) return;

      setPhotoError("");
      setUploading(true);

      const uploadedUrls = [];

      for (const file of files) {
        const formData = new FormData();

        formData.append("file", file);
        formData.append("upload_preset", "meetro_uploads");

        const response = await fetch(
          "https://api.cloudinary.com/v1_1/djcw4tk28/image/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await response.json();

        if (data.secure_url) {
          uploadedUrls.push(data.secure_url);
        }
      }

      if (uploadedUrls.length > 0) {
        setProjectPhotos((current) => {
          const updated = [...current, ...uploadedUrls];
          setImageUrl(updated[0] || "");
          return updated;
        });

        setPhotoRecords((current) => [
          ...current,
          ...uploadedUrls.map((url) => ({
            url,
            tag: "progress",
            caption: "",
            createdAt: new Date().toISOString(),
          })),
        ]);
      } else {
        alert(t("uploadFailed"));
      }
    } catch (error) {
      console.error(error);
      alert(t("uploadError"));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function openRequestPhotoPicker() {
    setPhotoError("");

    await openJobPhotoPicker({
      inputRef: photoInputRef,
      fileNamePrefix: "request-photo",
      onPhotos: (photos) =>
        handleImageUpload(createPhotoInputEvent(photos.map((photo) => photo.file))),
      onError: (message) => setPhotoError(message || CAMERA_PERMISSION_MESSAGE),
    });
  }

  async function handleCreatePost() {
    try {
      if (!title.trim()) {
        alert(t("enterPostTitle"));
        return;
      }

      if (!category) {
        alert(t("requestMatchRequired"));
        return;
      }

      setCreating(true);

      const isDirectRequest = localStorage.getItem("directRequestMode") === "true";
      const directProfessionalName = localStorage.getItem("directRequestProfessionalName") || "";
      const directProfessionalCategory = localStorage.getItem("directRequestProfessionalCategory") || "";
      const directConversationId = localStorage.getItem("directRequestProfessionalConversationId") || "";
      const directRequestSource = localStorage.getItem("directRequestSource") || "";
      const directRequestId = localStorage.getItem("directRequestId") || "";

      const selectedCategory =
        category === "other" ? customCategory.trim() || "other" : category;
      const requestMatchingFields = buildRequestMatchingFields({
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        location: location.trim(),
      });

      const result = await authFetch(
        "/posts",
        {
          method: "POST",
          body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category: selectedCategory,
          request_category: requestMatchingFields.requestCategory,
          service_domain: requestMatchingFields.service_domain,
          service_specialty: requestMatchingFields.service_specialty,
          location: location.trim(),
          unit_number: unitNumber.trim(),
          access_notes: accessNotes.trim(),
          image_url: projectPhotos[0] || imageUrl,
          post_type: isDirectRequest ? "direct_request" : "quote_request",
          status: isDirectRequest ? "direct_pending" : "open",
          direct_request: isDirectRequest,
          direct_request_source: directRequestSource,
          direct_professional_name: directProfessionalName,
          direct_conversation_id: directConversationId,
          }),
        },
        setPage
      );

      const data = result.data || {};

      if (data.post) {
        const existingRequests = JSON.parse(
          localStorage.getItem("homeownerRequests") || "[]"
        );

        const requestId = String(data.post.id || Date.now());

        const requestRecord = {
          requestId,
          id: requestId,
          ownerUserId: localStorage.getItem("userId") || "",
          ownerEmail: localStorage.getItem("userEmail") || "",
          createdByUserId: localStorage.getItem("userId") || "",
          createdByEmail: localStorage.getItem("userEmail") || "",

          title: title.trim(),
          description: description.trim(),
          assistantDraft: assistantDraftMetadata,
          assistantSuggestedProjectType: assistantDraftMetadata?.suggestedProjectType || "",
          assistantOriginalPrompt: assistantDraftMetadata?.originalPrompt || "",
          assistantRecommendationText: assistantDraftMetadata?.recommendationText || "",

          category: selectedCategory,
          ...requestMatchingFields,
          location: location.trim(),
          fullAddress: location.trim(),
          unitNumber: unitNumber.trim(),
          accessNotes: accessNotes.trim(),

          photos: projectPhotos.length > 0 ? projectPhotos : imageUrl ? [imageUrl] : [],
          photoRecords: photoRecords.length > 0
            ? photoRecords
            : (projectPhotos.length > 0 ? projectPhotos : imageUrl ? [imageUrl] : []).map((url) => ({
                url,
                tag: "progress",
                caption: "",
                createdAt: new Date().toISOString(),
              })),
          image_url: projectPhotos[0] || imageUrl,

          status: isDirectRequest ? "direct_pending" : "open",
          localDemoSafe: true,
          source: isDirectRequest ? "hire_again_direct_request" : "local_homeowner_request",
          requestChannel: isDirectRequest ? "direct" : "public",
          visibility: isDirectRequest ? "direct" : "public",
          isDirectRequest,
          directRequest: isDirectRequest,
          directRequestId: directRequestId || requestId,
          directRequestSource,
          selectedProfessional: isDirectRequest ? directProfessionalName : null,
          assignedProfessionalName: isDirectRequest ? directProfessionalName : "",
          targetProfessionalName: isDirectRequest ? directProfessionalName : "",
          targetProfessionalCategory: isDirectRequest ? directProfessionalCategory : "",
          conversationId: isDirectRequest
            ? directConversationId || `direct-${requestId}`
            : "",

          projectTimeline: [
            {
              type: "created",
              label: t("projectRequestCreated"),
              createdAt: new Date().toISOString(),
            },
          ],

          viewedByBusinesses: [],
          quotesReceived: [],
          messagesCount: 0,

          invoice: null,
          completionRecord: null,
          review: null,

          createdAt: new Date().toISOString(),
        };

        const updatedHomeownerRequests = [requestRecord, ...existingRequests];

        if (!saveHomeownerRequestList(updatedHomeownerRequests)) {
          return;
        }

        if (isDirectRequest) {
          localStorage.removeItem("directRequestMode");
          localStorage.removeItem("directRequestSource");
          localStorage.removeItem("directRequestProfessionalName");
          localStorage.removeItem("directRequestProfessionalCategory");
          localStorage.removeItem("directRequestProfessionalConversationId");
          localStorage.removeItem("directRequestId");
          localStorage.removeItem("requestProfessionalContext");
        }

        alert(
          isDirectRequest
            ? (language === "es"
                ? "Solicitud enviada directamente al profesional."
                : "Request sent directly to this professional.")
            : t("projectPostedSuccess")
        );

        setTitle("");
        setDescription("");
        setCategory("");
        setCustomCategory("");
        setLocation("");
        setUnitNumber("");
        setAccessNotes("");
        setImageUrl("");
        setProjectPhotos([]);
        setPhotoRecords([]);
        setAssistantDraftMetadata(null);
        setTitleEdited(false);
        setDescriptionEdited(false);

        setPage("home");
      } else {
        alert(data.error || t("postCreateFailed"));
      }
    } catch (error) {
      console.error(error);
      alert(t("serverError"));
    } finally {
      setCreating(false);
    }
  }

  function handleCancelRequest() {
    const hasChanges =
      title ||
      description ||
      location ||
      unitNumber ||
      accessNotes ||
      imageUrl ||
      projectPhotos.length > 0;

    if (hasChanges) {
      const confirmed = window.confirm(t("cancelRequestWarning"));

      if (!confirmed) return;
    }

    setTitle("");
    setDescription("");
    setCategory("");
    setCustomCategory("");
    setLocation("");
    setUnitNumber("");
    setAccessNotes("");
    setImageUrl("");
    setProjectPhotos([]);
    setPhotoRecords([]);
    setAssistantDraftMetadata(null);
    setTitleEdited(false);
    setDescriptionEdited(false);
    clearAssistantRequestDraft(localStorage);

    setPage("home");
  }

  return (
    <div style={pageWrapper}>
      <button onClick={handleCancelRequest} style={backButton}>
        ←
      </button>

      {assistantDraftMetadata && (
        <div style={preparedRequestBanner}>
          <span style={preparedRequestOrb} aria-hidden="true">
            M
          </span>
          <strong style={preparedRequestBannerTitle}>
            {t("requestReviewIntroTitle")}
          </strong>
          <p style={preparedRequestBannerText}>
            {t("requestReviewIntroText")}
          </p>
        </div>
      )}

      <div style={cardStyle}>
        <label style={fieldLabel}>{t("requestIntelligencePrompt")}</label>
        <input
          placeholder={t("requestIntelligencePlaceholder")}
          value={serviceSearch}
          onChange={(event) => handleServiceSearchChange(event.target.value)}
          style={inputStyle}
        />

        {serviceSuggestions.length > 0 && (
          <div style={serviceSuggestionGrid}>
            {serviceSuggestions.map((service) => (
              <button
                key={service.serviceId}
                type="button"
                style={{
                  ...serviceSuggestionButton,
                  ...(category === service.requestCategory
                    ? serviceSuggestionButtonActive
                    : {}),
                }}
                onClick={() => selectSuggestedService(service)}
              >
                {service.label}
              </button>
            ))}
          </div>
        )}

        <div style={selectedServiceCard}>
          <span style={selectedServiceLabelText}>{t("requestMatchLabel")}</span>
          <strong style={selectedServiceValue}>
            {selectedServiceLabel || t("chooseClosestMatch")}
          </strong>
          <button
            type="button"
            style={changeServiceButton}
            onClick={() => setServiceSelectorOpen(true)}
          >
            {category ? t("change") : t("chooseClosestMatch")}
          </button>
        </div>

        {category === "other" && (
          <>
            <label style={fieldLabel}>{t("otherService")}</label>
            <input
              placeholder={t("enterCustomService")}
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              style={inputStyle}
            />
          </>
        )}

        <div style={requestReviewIntroCard}>
          <strong style={requestReviewIntroTitle}>
            {t("requestReviewIntroTitle")}
          </strong>
          <p style={requestReviewIntroText}>
            {t("requestReviewIntroText")}
          </p>
        </div>

        <label style={fieldLabel}>{t("projectTitle")}</label>
        <input
          placeholder={t("projectTitlePlaceholder")}
          value={title}
          onChange={(e) => {
            setTitleEdited(true);
            setTitle(e.target.value);
          }}
          style={inputStyle}
        />

        <label style={fieldLabel}>{t("projectDescription")}</label>
        <textarea
          ref={descriptionInputRef}
          placeholder={t("projectDescriptionPlaceholder")}
          value={description}
          onChange={(e) => {
            setDescriptionEdited(true);
            setDescription(e.target.value);
          }}
          style={{
            ...textareaStyle,
            minHeight: assistantDraftMetadata ? "320px" : textareaStyle.minHeight,
          }}
        />

        <label style={fieldLabel}>{t("fullServiceAddress")}</label>
        <input
          placeholder={t("locationExample")}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={inputStyle}
        />

        <label style={fieldLabel}>{t("unitNumber")}</label>
        <input
          placeholder={t("unitNumberPlaceholder")}
          value={unitNumber}
          onChange={(e) => setUnitNumber(e.target.value)}
          style={inputStyle}
        />

        {category === "propertyManagement" && (
          <>
            <div style={propertyManagementFoundationNote}>
              {t("propertyManagementIntakeNote")}
            </div>
            <label style={fieldLabel}>{t("accessNotes")}</label>
            <textarea
              placeholder={t("accessNotesPlaceholder")}
              value={accessNotes}
              onChange={(e) => setAccessNotes(e.target.value)}
              style={textareaStyle}
            />
          </>
        )}

        <div style={uploadBox}>
          <button
            onClick={openRequestPhotoPicker}
            style={plusUploadButton}
            type="button"
          >
            +
          </button>

          <p style={uploadText}>
            {imageUrl ? t("projectPhotoAdded") : t("addProjectPhoto")}
          </p>

          <p style={uploadSubText}>{t("photoHelpsPros")}</p>

          <input
            ref={photoInputRef}
            id="postImageInput"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />

          {uploading && <p style={uploadingText}>{t("uploadingImage")}</p>}
          {photoError && <p style={uploadingText}>{photoError}</p>}
        </div>

        {projectPhotos.length > 0 && (
          <div style={previewBox}>
            <div style={photoPreviewStrip}>
              {projectPhotos.map((photo, index) => (
                <div key={photo + index} style={photoPreviewItem}>
                  <img src={photo} alt={t("preview")} style={previewImage} />

                  <button
                    onClick={() => {
                      const updated = projectPhotos.filter((_, i) => i !== index);
                      setProjectPhotos(updated);
                      setPhotoRecords((current) =>
                        current.filter((record) => record.url !== photo)
                      );
                      setImageUrl(updated[0] || "");
                    }}
                    style={removePhotoButton}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <p style={photoCountText}>
              {language === "es"
                ? `${projectPhotos.length} ${
                    projectPhotos.length === 1
                      ? "foto agregada"
                      : "fotos agregadas"
                  }`
                : `${projectPhotos.length} ${
                    projectPhotos.length === 1 ? "photo" : "photos"
                  } added`}
            </p>
          </div>
        )}

        <div style={requestActionBar}>
          <button
            onClick={handleCreatePost}
            disabled={creating || uploading}
            style={{
              ...primaryButton,
              background: creating || uploading ? "#999" : "#5b3df5",
              cursor: creating || uploading ? "not-allowed" : "pointer",
            }}
          >
            {creating ? t("creating") : t("createPost")}
          </button>

          <button
            type="button"
            onClick={handleCancelRequest}
            style={cancelRequestButton}
          >
            {t("cancelRequest")}
          </button>
        </div>
      </div>

      <ServiceSelectorSheet
        open={serviceSelectorOpen}
        title={t("chooseClosestMatch")}
        subtitle={t("requestIntelligencePlaceholder")}
        searchPlaceholder={t("searchServices")}
        options={serviceSelectorOptions}
        selectedValues={selectedServiceOptionId ? [selectedServiceOptionId] : []}
        onSelect={selectServiceOption}
        onClose={() => setServiceSelectorOpen(false)}
      />

      <BottomNav setPage={setPage} currentPage="upload" />
    </div>
  );
}

const pageWrapper = {
  background: "linear-gradient(180deg,#f8f7ff 0%,#eef2ff 100%)",
  minHeight: "100dvh",
  padding:
    "calc(env(safe-area-inset-top) + 24px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "760px",
  minWidth: 0,
  margin: "0 auto",
  overflowX: "hidden",
  contain: "layout paint",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const backButton = {
  width: "44px",
  height: "44px",
  border: "none",
  borderRadius: "16px",
  background: "#ffffff",
  color: "#5b3df5",
  fontSize: "24px",
  fontWeight: "900",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "12px",
  boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
  cursor: "pointer",
};

const heroCard = {
  background: "linear-gradient(135deg,#5b3df5,#8b5cf6)",
  color: "white",
  borderRadius: "26px",
  padding: "24px 22px",
  marginBottom: "14px",
  boxShadow: "0 14px 32px rgba(91,61,245,0.24)",
  maxWidth: "100%",
  minWidth: 0,
  overflowWrap: "anywhere",
};

const eyebrow = {
  margin: 0,
  opacity: 0.9,
  fontWeight: "900",
};

const pageTitle = {
  margin: "8px 0",
  fontSize: "32px",
  color: "white",
  lineHeight: 1.05,
};

const pageSubtitle = {
  margin: 0,
  color: "white",
  lineHeight: 1.45,
  opacity: 0.95,
  fontSize: "15px",
};

const tipCard = {
  background: "rgba(255,255,255,.92)",
  border: "1px solid rgba(124,58,237,.10)",
  borderRadius: "20px",
  padding: "14px 16px",
  marginBottom: "14px",
  boxShadow: "0 8px 20px rgba(15,23,42,.04)",
  color: "#111827",
  maxWidth: "100%",
  minWidth: 0,
  overflowWrap: "anywhere",
};

const preparedRequestBanner = {
  position: "relative",
  background: "rgba(255,255,255,0.82)",
  border: "1px solid rgba(91,61,245,0.14)",
  borderRadius: "20px",
  padding: "14px 14px 14px 56px",
  marginBottom: "12px",
  boxShadow: "0 10px 24px rgba(91,61,245,0.08)",
  maxWidth: "100%",
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  backdropFilter: "blur(16px)",
};

const preparedRequestOrb = {
  position: "absolute",
  left: "14px",
  top: "14px",
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background: "rgba(91,61,245,0.10)",
  border: "1px solid rgba(91,61,245,0.14)",
  color: "#5b3df5",
  fontSize: "13px",
  fontWeight: 950,
};

const preparedRequestBannerTitle = {
  display: "block",
  color: "#312e81",
  fontSize: "14px",
  fontWeight: 950,
  marginBottom: "4px",
};

const preparedRequestBannerText = {
  margin: 0,
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: 700,
};

const cardStyle = {
  background: "rgba(255,255,255,.96)",
  border: "1px solid rgba(124,58,237,.10)",
  borderRadius: "24px",
  padding: "16px",
  display: "grid",
  gap: "9px",
  boxShadow: "0 12px 28px rgba(15,23,42,.06)",
  maxWidth: "100%",
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  backdropFilter: "blur(14px)",
};

const fieldLabel = {
  fontWeight: "900",
  color: "#111",
  fontSize: "14px",
  marginTop: "4px",
};

const inputStyle = {
  width: "100%",
  padding: "14px 15px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  fontSize: "16px",
  boxSizing: "border-box",
  outline: "none",
  background: "#ffffff",
  color: "#111827",
  maxWidth: "100%",
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const serviceSuggestionGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  maxWidth: "100%",
  minWidth: 0,
  margin: "-2px 0 6px",
};

const serviceSuggestionButton = {
  border: "1px solid rgba(91,61,245,0.12)",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.82)",
  color: "#4b5563",
  padding: "9px 11px",
  fontSize: "13px",
  fontWeight: "900",
  cursor: "pointer",
  maxWidth: "100%",
  overflowWrap: "anywhere",
};

const serviceSuggestionButtonActive = {
  background: "rgba(91,61,245,0.11)",
  borderColor: "rgba(91,61,245,0.32)",
  color: "#4b32d1",
};

const selectedServiceCard = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "6px 12px",
  alignItems: "center",
  border: "1px solid rgba(91,61,245,0.13)",
  borderRadius: "18px",
  background: "rgba(91,61,245,0.05)",
  padding: "13px",
  maxWidth: "100%",
  minWidth: 0,
};

const selectedServiceLabelText = {
  gridColumn: "1 / -1",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 950,
};

const selectedServiceValue = {
  color: "#111827",
  fontSize: "15px",
  lineHeight: 1.25,
  fontWeight: 950,
  minWidth: 0,
  overflowWrap: "normal",
  wordBreak: "normal",
};

const changeServiceButton = {
  border: "1px solid rgba(91,61,245,0.18)",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.82)",
  color: "#5b3df5",
  padding: "8px 11px",
  fontSize: "13px",
  fontWeight: 950,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const requestReviewIntroCard = {
  display: "grid",
  gap: "4px",
  padding: "12px 13px",
  borderRadius: "16px",
  border: "1px solid rgba(91,61,245,0.12)",
  background: "rgba(91,61,245,0.045)",
  color: "#334155",
};

const requestReviewIntroTitle = {
  color: "#312e81",
  fontSize: "14px",
  fontWeight: 950,
};

const requestReviewIntroText = {
  margin: 0,
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: 750,
};

const requestActionBar = {
  position: "sticky",
  bottom: "calc(78px + env(safe-area-inset-bottom, 0px))",
  zIndex: 8,
  display: "grid",
  gap: "8px",
  marginTop: "8px",
  padding: "10px",
  borderRadius: "18px",
  border: "1px solid rgba(226,232,240,0.95)",
  background: "rgba(255,255,255,0.9)",
  boxShadow: "0 14px 32px rgba(15,23,42,0.10)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "140px",
  resize: "vertical",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
  lineHeight: 1.45,
  maxHeight: "70dvh",
  overflowY: "auto",
};

const propertyManagementFoundationNote = {
  padding: "13px 14px",
  borderRadius: "16px",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  fontSize: "13px",
  fontWeight: 700,
  lineHeight: 1.5,
};

const aiGuidanceCard = {
  background: "linear-gradient(135deg,#f5f3ff,#eef2ff)",
  border: "1px solid #ddd6fe",
  borderRadius: "20px",
  padding: "16px",
  margin: "4px 0 8px",
  maxWidth: "100%",
  minWidth: 0,
  overflowWrap: "anywhere",
};

const aiGuidanceHeading = {
  display: "flex",
  alignItems: "flex-start",
  gap: "11px",
  minWidth: 0,
};

const aiGuidanceIcon = {
  width: "30px",
  height: "30px",
  flexShrink: 0,
  display: "grid",
  placeItems: "center",
  borderRadius: "10px",
  background: "#ffffff",
  border: "1px solid #ddd6fe",
  color: "#5b3df5",
  fontSize: "15px",
  fontWeight: 950,
};

const aiGuidanceTitle = {
  display: "block",
  color: "#312e81",
  fontSize: "16px",
  fontWeight: "900",
  lineHeight: 1.3,
  marginBottom: "4px",
};

const aiGuidanceText = {
  color: "#4b5563",
  fontSize: "13px",
  lineHeight: 1.45,
  margin: 0,
  overflowWrap: "anywhere",
};

const aiGuidanceExamplesLabel = {
  display: "block",
  margin: "13px 0 7px",
  color: "#4338ca",
  fontSize: "11px",
  fontWeight: 950,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const aiGuidanceExamples = {
  display: "flex",
  flexWrap: "wrap",
  gap: "7px",
};

const aiGuidanceExample = {
  padding: "7px 9px",
  borderRadius: "11px",
  background: "#ffffff",
  border: "1px solid #e0e7ff",
  color: "#4b5563",
  fontSize: "12px",
  lineHeight: 1.3,
  fontWeight: 700,
};

const aiGuidanceNextStep = {
  marginTop: "13px",
  padding: "10px 11px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.72)",
  border: "1px solid #ddd6fe",
  color: "#4338ca",
  fontSize: "13px",
  lineHeight: 1.5,
};

const requestDetailsHeading = {
  margin: "8px 0 2px",
  color: "#111827",
  fontSize: "18px",
  lineHeight: 1.3,
  fontWeight: 950,
};

const uploadBox = {
  border: "1px dashed rgba(91,61,245,0.24)",
  borderRadius: "22px",
  padding: "20px",
  textAlign: "center",
  background: "rgba(255,255,255,0.68)",
  maxWidth: "100%",
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
  backdropFilter: "blur(12px)",
};

const plusUploadButton = {
  width: "54px",
  height: "54px",
  borderRadius: "18px",
  border: "none",
  background: "rgba(91,61,245,0.92)",
  color: "white",
  fontSize: "30px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(91,61,245,.22)",
};

const uploadText = {
  marginTop: "14px",
  marginBottom: "4px",
  color: "#111",
  fontWeight: "900",
};

const uploadSubText = {
  margin: 0,
  color: "#666",
  fontSize: "14px",
};

const uploadingText = {
  marginTop: "10px",
  color: "#5b3df5",
  fontWeight: "bold",
};

const previewBox = {
  display: "grid",
  gap: "12px",
  maxWidth: "100%",
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
};

const photoPreviewStrip = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  overflowX: "hidden",
  paddingBottom: "6px",
  maxWidth: "100%",
  minWidth: 0,
};

const photoPreviewItem = {
  position: "relative",
  flexShrink: 0,
};

const previewImage = {
  width: "120px",
  height: "120px",
  borderRadius: "22px",
  objectFit: "cover",
  border: "1px solid #e5e7eb",
};

const photoTagRow = {
  display: "flex",
  gap: "5px",
  padding: "7px",
  background: "white",
};

const photoTagButton = {
  flex: 1,
  border: "1px solid #ede9fe",
  background: "#f8f7ff",
  color: "#6b6478",
  borderRadius: "999px",
  padding: "5px 6px",
  fontSize: "10px",
  fontWeight: "900",
  cursor: "pointer",
};

const photoTagButtonActive = {
  background: "#5b3df5",
  color: "white",
  border: "1px solid #5b3df5",
};

const removePhotoButton = {
  position: "absolute",
  top: "8px",
  right: "8px",
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  border: "none",
  background: "rgba(239,68,68,0.95)",
  color: "white",
  fontSize: "20px",
  fontWeight: "900",
  cursor: "pointer",
};

const photoCountText = {
  margin: 0,
  color: "#5b3df5",
  fontWeight: "900",
  fontSize: "13px",
};


const cancelRequestButton = {
  width: "100%",
  border: "1px solid rgba(148,163,184,0.26)",
  borderRadius: "18px",
  padding: "13px",
  background: "rgba(255,255,255,0.64)",
  color: "#64748b",
  fontWeight: "900",
  fontSize: "15px",
  marginTop: "8px",
  cursor: "pointer",
};

const primaryButton = {
  border: "none",
  color: "white",
  padding: "15px",
  borderRadius: "18px",
  fontWeight: "900",
  fontSize: "15px",
  boxShadow: "0 14px 30px rgba(91,61,245,0.20)",
};

export default Upload;
