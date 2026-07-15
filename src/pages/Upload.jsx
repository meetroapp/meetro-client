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
import {
  getMediaDeferredCopy,
  getMediaDeferredNotice,
  guardFriendsAndFamilyMediaUpload,
  isFriendsAndFamilyMediaDeferred,
} from "../utils/mediaDeferral";
import { canReadLegacyWorkflowStorage } from "../utils/clientWorkflowStoragePolicy";
import { resolveWorkflowAddress } from "../utils/personalAddresses";

function readStoredRecord(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || {};
  } catch {
    return {};
  }
}

function getInitialRequestLocation() {
  const selectedProperty = readStoredRecord("selectedProperty");
  const selectedProject = readStoredRecord("selectedProject");
  const selectedRequest = readStoredRecord("selectedHomeownerRequest");
  return resolveWorkflowAddress({
    explicitAddress: localStorage.getItem("requestLocationDraft") || "",
    selectedPropertyAddress:
      localStorage.getItem("selectedPropertyAddress") ||
      selectedProperty.fullAddress ||
      selectedProperty.address ||
      selectedProperty.location ||
      "",
    projectAddress:
      selectedProject.fullAddress || selectedProject.address || selectedProject.location || "",
    requestAddress:
      selectedRequest.fullAddress || selectedRequest.address || selectedRequest.location || "",
  });
}

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
  const mediaUploadDeferred = isFriendsAndFamilyMediaDeferred();
  const mediaDeferredCopy = getMediaDeferredCopy(language);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [location, setLocation] = useState(getInitialRequestLocation);
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
    if (
      !guardFriendsAndFamilyMediaUpload({
        event,
        language,
        onDeferred: setPhotoError,
      })
    ) {
      return;
    }

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
    if (mediaUploadDeferred) {
      setPhotoError(getMediaDeferredNotice(language));
      return;
    }

    setPhotoError("");

    await openJobPhotoPicker({
      inputRef: photoInputRef,
      language,
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
        const existingRequests = canReadLegacyWorkflowStorage()
          ? JSON.parse(localStorage.getItem("homeownerRequests") || "[]")
          : [];

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

        if (
          canReadLegacyWorkflowStorage() &&
          !saveHomeownerRequestList(updatedHomeownerRequests)
        ) {
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
    <div className="app-page meetro-form-page meetro-visual-page" style={pageWrapper}>
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

      <div className="meetro-visual-surface" style={cardStyle}>
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

        <div className="meetro-visual-empty-state" style={uploadBox}>
          <button
            onClick={openRequestPhotoPicker}
            style={{
              ...plusUploadButton,
              ...(mediaUploadDeferred ? disabledUploadButton : {}),
            }}
            type="button"
            disabled={mediaUploadDeferred}
          >
            +
          </button>

          <p style={uploadText}>
            {mediaUploadDeferred
              ? mediaDeferredCopy.title
              : imageUrl
              ? t("projectPhotoAdded")
              : t("addProjectPhoto")}
          </p>

          <p style={uploadSubText}>
            {mediaUploadDeferred ? mediaDeferredCopy.detail : t("photoHelpsPros")}
          </p>

          <input
            ref={photoInputRef}
            id="postImageInput"
            type="file"
            accept="image/*"
            multiple
            disabled={mediaUploadDeferred}
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
            className="meetro-visual-primary-button"
            style={{
              ...primaryButton,
              background: creating || uploading
                ? "rgba(100, 116, 139, 0.72)"
                : "var(--meetro-gradient-community-action)",
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
  background: "var(--meetro-gradient-community-page)",
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
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "16px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-forest)",
  fontSize: "24px",
  fontWeight: "900",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "12px",
  boxShadow: "var(--meetro-shadow-soft)",
  cursor: "pointer",
};

const heroCard = {
  background: "var(--meetro-gradient-community-hero)",
  color: "white",
  borderRadius: "26px",
  padding: "24px 22px",
  marginBottom: "14px",
  boxShadow: "var(--meetro-shadow-lifted)",
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
  background: "var(--meetro-surface-paper)",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "20px",
  padding: "14px 16px",
  marginBottom: "14px",
  boxShadow: "var(--meetro-shadow-soft)",
  color: "var(--meetro-color-ink)",
  maxWidth: "100%",
  minWidth: 0,
  overflowWrap: "anywhere",
};

const preparedRequestBanner = {
  position: "relative",
  background: "rgba(255, 253, 248, 0.88)",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "20px",
  padding: "14px 14px 14px 56px",
  marginBottom: "12px",
  boxShadow: "var(--meetro-shadow-soft)",
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
  background: "var(--meetro-surface-sage)",
  border: "1px solid var(--meetro-color-line)",
  color: "var(--meetro-color-forest)",
  fontSize: "13px",
  fontWeight: 950,
};

const preparedRequestBannerTitle = {
  display: "block",
  color: "var(--meetro-color-forest)",
  fontSize: "14px",
  fontWeight: 950,
  marginBottom: "4px",
};

const preparedRequestBannerText = {
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: 700,
};

const cardStyle = {
  background: "var(--meetro-surface-paper)",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "24px",
  padding: "16px",
  display: "grid",
  gap: "9px",
  boxShadow: "var(--meetro-shadow-soft)",
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
  color: "var(--meetro-color-ink)",
  fontSize: "14px",
  marginTop: "4px",
};

const inputStyle = {
  width: "100%",
  padding: "14px 15px",
  borderRadius: "16px",
  border: "1px solid var(--meetro-color-line)",
  fontSize: "16px",
  boxSizing: "border-box",
  outline: "none",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-ink)",
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
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "999px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-coffee)",
  padding: "9px 11px",
  fontSize: "13px",
  fontWeight: "900",
  cursor: "pointer",
  maxWidth: "100%",
  overflowWrap: "anywhere",
};

const serviceSuggestionButtonActive = {
  background: "var(--meetro-surface-sage)",
  borderColor: "rgba(31, 77, 52, 0.28)",
  color: "var(--meetro-color-forest)",
};

const selectedServiceCard = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "6px 12px",
  alignItems: "center",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "18px",
  background: "var(--meetro-surface-warm)",
  padding: "13px",
  maxWidth: "100%",
  minWidth: 0,
};

const selectedServiceLabelText = {
  gridColumn: "1 / -1",
  color: "var(--meetro-color-muted)",
  fontSize: "12px",
  fontWeight: 950,
};

const selectedServiceValue = {
  color: "var(--meetro-color-ink)",
  fontSize: "15px",
  lineHeight: 1.25,
  fontWeight: 950,
  minWidth: 0,
  overflowWrap: "normal",
  wordBreak: "normal",
};

const changeServiceButton = {
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "999px",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
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
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-coffee)",
};

const requestReviewIntroTitle = {
  color: "var(--meetro-color-forest)",
  fontSize: "14px",
  fontWeight: 950,
};

const requestReviewIntroText = {
  margin: 0,
  color: "var(--meetro-color-muted)",
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
  border: "1px solid var(--meetro-color-line)",
  background: "rgba(255, 253, 248, 0.92)",
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
  background: "var(--meetro-surface-sage)",
  border: "1px solid var(--meetro-color-line)",
  color: "var(--meetro-color-forest)",
  fontSize: "13px",
  fontWeight: 700,
  lineHeight: 1.5,
};

const aiGuidanceCard = {
  background: "var(--meetro-surface-warm)",
  border: "1px solid var(--meetro-color-line)",
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
  background: "var(--meetro-surface-paper)",
  border: "1px solid var(--meetro-color-line)",
  color: "var(--meetro-color-forest)",
  fontSize: "15px",
  fontWeight: 950,
};

const aiGuidanceTitle = {
  display: "block",
  color: "var(--meetro-color-forest)",
  fontSize: "16px",
  fontWeight: "900",
  lineHeight: 1.3,
  marginBottom: "4px",
};

const aiGuidanceText = {
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.45,
  margin: 0,
  overflowWrap: "anywhere",
};

const aiGuidanceExamplesLabel = {
  display: "block",
  margin: "13px 0 7px",
  color: "var(--meetro-color-wood)",
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
  background: "var(--meetro-surface-paper)",
  border: "1px solid var(--meetro-color-line)",
  color: "var(--meetro-color-coffee)",
  fontSize: "12px",
  lineHeight: 1.3,
  fontWeight: 700,
};

const aiGuidanceNextStep = {
  marginTop: "13px",
  padding: "10px 11px",
  borderRadius: "12px",
  background: "rgba(255, 253, 248, 0.72)",
  border: "1px solid var(--meetro-color-line)",
  color: "var(--meetro-color-forest)",
  fontSize: "13px",
  lineHeight: 1.5,
};

const requestDetailsHeading = {
  margin: "8px 0 2px",
  color: "var(--meetro-color-ink)",
  fontSize: "18px",
  lineHeight: 1.3,
  fontWeight: 950,
};

const uploadBox = {
  border: "1px dashed var(--meetro-color-line)",
  borderRadius: "22px",
  padding: "20px",
  textAlign: "center",
  background: "var(--meetro-surface-warm)",
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
  background: "var(--meetro-gradient-community-action)",
  color: "#fffdf8",
  fontSize: "30px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(31, 77, 52, 0.18)",
};

const disabledUploadButton = {
  background: "rgba(148,163,184,0.35)",
  color: "var(--meetro-color-muted)",
  cursor: "not-allowed",
  boxShadow: "none",
};

const uploadText = {
  marginTop: "14px",
  marginBottom: "4px",
  color: "var(--meetro-color-ink)",
  fontWeight: "900",
};

const uploadSubText = {
  margin: 0,
  color: "var(--meetro-color-muted)",
  fontSize: "14px",
};

const uploadingText = {
  marginTop: "10px",
  color: "var(--meetro-color-forest)",
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
  border: "1px solid var(--meetro-color-line)",
};

const photoTagRow = {
  display: "flex",
  gap: "5px",
  padding: "7px",
  background: "white",
};

const photoTagButton = {
  flex: 1,
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-coffee)",
  borderRadius: "999px",
  padding: "5px 6px",
  fontSize: "10px",
  fontWeight: "900",
  cursor: "pointer",
};

const photoTagButtonActive = {
  background: "var(--meetro-color-forest)",
  color: "#fffdf8",
  border: "1px solid var(--meetro-color-forest)",
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
  color: "var(--meetro-color-forest)",
  fontWeight: "900",
  fontSize: "13px",
};


const cancelRequestButton = {
  width: "100%",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "18px",
  padding: "13px",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-muted)",
  fontWeight: "900",
  fontSize: "15px",
  marginTop: "8px",
  cursor: "pointer",
};

const primaryButton = {
  border: "none",
  color: "#fffdf8",
  padding: "15px",
  borderRadius: "18px",
  fontWeight: "900",
  fontSize: "15px",
  background: "var(--meetro-gradient-community-action)",
  boxShadow: "0 14px 30px rgba(31, 77, 52, 0.18)",
};

export default Upload;
