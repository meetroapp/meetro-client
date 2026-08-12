import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import {
  PortfolioProjectCard,
  PortfolioProjectGrid,
  PortfolioProjectView,
} from "../components/PortfolioProjectPresentation";
import API_URL from "../api";
import { authFetch } from "../utils/authFetch";
import { getLanguage, t } from "../utils/language";
import {
  saveProfessionalReview,
} from "../utils/reviewStorage";
import {
  canProfessionalReceiveRequest,
  inferRequestCategory,
  inferServiceDomain,
} from "../utils/professionalRequestMatching";
import { getBusinessIdentityProjection } from "../utils/businessIdentity";
import { getBusinessServicesProjection } from "../utils/businessServiceProfile";
import { getBusinessVerificationProjection } from "../utils/businessVerification";
import { canReadLegacyWorkflowStorage } from "../utils/clientWorkflowStoragePolicy";

const PORTFOLIO_PREVIEW_MAX_IMAGES = 5;

function ContractorDetails({ setPage, currentPage }) {
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(true);

  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [submittingQuote, setSubmittingQuote] = useState(false);

  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const language = getLanguage();
  const isSpanish = language === "es";

  useEffect(() => {
    fetchContractor();
    // This loader intentionally runs once for the selected public profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function safeJson(key, fallback = []) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function getLinkedPublicProfileId() {
    const hash = window.location.hash.replace("#", "");
    const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";

    return new URLSearchParams(query).get("profileId") || "";
  }

  function getStoredPublicProfile(profileId) {
    if (!profileId) return null;

    const publicProfiles = safeJson("meetroPublicBusinessProfiles", {});
    return publicProfiles?.[profileId] || null;
  }

  function returnToBusinessDirectory() {
    const returnPage =
      localStorage.getItem("contractorDetailsReturnPage") || "discover";

    localStorage.removeItem("contractorDetailsReturnPage");

    if (returnPage === "home") {
      setPage("home");
      return;
    }

    if (returnPage === "emergency") {
      setPage("emergency");
      return;
    }

    if (returnPage === "contractors") {
      setPage("contractors");
      return;
    }

    if (returnPage === "contractorProfile") {
      localStorage.setItem("meetroSharedPageReturn", "businessCommandCenter");
      setPage("contractorProfile");
      return;
    }

    localStorage.setItem("activeDiscoverMode", "businessDirectory");
    localStorage.setItem("discoverReturnMode", "businessDirectory");
    setPage("discover");
  }

  function normalizeGalleryItem(item, index, source = "local") {
    let imageUrls = [];

    if (Array.isArray(item.image_urls)) {
      imageUrls = item.image_urls.filter(Boolean);
    } else if (typeof item.image_urls === "string") {
      try {
        const parsedImages = JSON.parse(item.image_urls);
        if (Array.isArray(parsedImages)) {
          imageUrls = parsedImages.filter(Boolean);
        }
      } catch {
        // Preserve the empty canonical media list when compatibility JSON is invalid.
      }
    }

    const fallbackImage =
      item.image_url ||
      item.imageUrl ||
      item.url ||
      item.photoUrl ||
      item.secure_url ||
      item.src ||
      "";

    if (fallbackImage && imageUrls.length === 0) {
      imageUrls = [fallbackImage];
    }

    return {
      id: item.id || `${source}-${index}`,
      title:
        item.title ||
        item.project_title ||
        item.caption ||
        item.name ||
        t("projectGallery"),
      description:
        item.description ||
        item.project_description ||
        item.caption ||
        "",
      image_url: imageUrls[0] || "",
      image_urls: imageUrls,
    };
  }

  function getProjectImages(project) {
    if (Array.isArray(project?.image_urls) && project.image_urls.length > 0) {
      return project.image_urls.filter(Boolean);
    }

    return project?.image_url ? [project.image_url] : [];
  }

  function scrollToPortfolioGallery() {
    document
      .getElementById("contractor-details-project-gallery")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function fetchContractor() {
    try {
      const linkedProfileId = getLinkedPublicProfileId();
      const linkedContractor = getStoredPublicProfile(linkedProfileId);
      const savedContractor =
        linkedContractor ||
        JSON.parse(localStorage.getItem("selectedContractor") || "{}");

      if (savedContractor.name || savedContractor.business_name) {
        localStorage.setItem("selectedContractor", JSON.stringify(savedContractor));

        setProfile(savedContractor);

        if (savedContractor.id) {
          await fetchProjects(savedContractor.id);
          await fetchReviews(savedContractor.id);
        } else {
          setProjects([]);
          await fetchReviews("");
        }

        setLoading(false);
        return;
      }

      const contractorId = savedContractor.id || linkedProfileId;

      if (!contractorId) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_URL}/contractor-profiles/${contractorId}`
      );

      const data = await response.json();

      if (data.profile) {
        setProfile(data.profile);
        await fetchReviews(data.profile.id);
        await fetchProjects(data.profile.id);
      } else if (savedContractor.id || savedContractor.name) {
        setProfile(savedContractor);
        setProjects([]);
      }
    } catch (error) {
      console.error(error);

      const savedContractor = JSON.parse(
        localStorage.getItem("selectedContractor") || "{}"
      );

      if (savedContractor.id || savedContractor.name) {
        setProfile(savedContractor);
        setProjects([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchReviews(contractorId) {
    try {
      const response = await fetch(`${API_URL}/reviews/${contractorId}`);
      const data = await response.json();
      const apiReviews = data.reviews || [];
      setReviews(apiReviews);
      setReviewStats({
        average_rating: data.stats?.average_rating || "",
        total_reviews: data.stats?.total_reviews || 0,
      });
    } catch (error) {
      console.error(error);
      setReviews([]);
      setReviewStats(null);
    }
  }

  async function fetchProjects(contractorId) {
    try {
      const response = await fetch(
        `${API_URL}/contractor-projects/${contractorId}`
      );

      const data = await response.json();

      const apiProjects = (data.projects || []).map((project, index) =>
        normalizeGalleryItem(project, index, "api")
      );

      setProjects(apiProjects);
    } catch (error) {
      console.error(error);
      setProjects([]);
    }
  }

  async function submitQuoteRequest() {
    try {
      if (!projectTitle.trim()) {
        alert(t("enterProjectTitle"));
        return;
      }

      setSubmittingQuote(true);

      const result = await authFetch(
        "/quote-requests",
        {
          method: "POST",
          body: JSON.stringify({
            contractor_id: profile.id,
            project_title: projectTitle,
            project_description: projectDescription,
            location: projectLocation,
          }),
        },
        setPage
      );

      if (!result) return;

      const data = result.data;

      if (result.response.ok) {
        alert(t("quoteSubmitted"));

        setProjectTitle("");
        setProjectDescription("");
        setProjectLocation("");
        setShowQuoteForm(false);
      } else {
        alert(data.error || t("quoteFailed"));
      }
    } catch (error) {
      console.error(error);
      alert(t("somethingWentWrong"));
    } finally {
      setSubmittingQuote(false);
    }
  }

  async function submitReview() {
    try {
      setSubmittingReview(true);

      const result = await authFetch(
        "/reviews",
        {
          method: "POST",
          body: JSON.stringify({
            contractor_id: profile.id,
            rating,
            review_text: reviewText,
          }),
        },
        setPage
      );

      if (!result) return;

      const data = result.data;

      if (data.review) {
        saveProfessionalReview({
          ...data.review,
          professionalId: profile.id,
          professionalName: profile.business_name || profile.name,
          customerDisplayName: localStorage.getItem("userName") || "Customer",
          rating,
          comment: reviewText,
          service: profile.category || profile.business_category || "",
          source: "homeowner_review",
        });

        alert(t("reviewSubmitted"));

        setRating(5);
        setReviewText("");

        await fetchReviews(profile.id);
      } else {
        alert(data.error || t("reviewFailed"));
      }
    } catch (error) {
      console.error(error);
      alert(t("serverError"));
    } finally {
      setSubmittingReview(false);
    }
  }

  function messageContractor() {
    localStorage.setItem(
      "selectedQuoteRequest",
      JSON.stringify({
        id: profile.id,
        project_title:
          profile.business_name || profile.name || t("contractorConversation"),
        project_description: profile.bio || t("messageContractor"),
        location: profile.location || "",
      })
    );

    const conversationId = `business_${profile.user_id || profile.id}`;

    localStorage.setItem("activeConversationId", conversationId);
    localStorage.setItem("selectedQuoteRequestId", conversationId);
    localStorage.setItem(
      "selectedMessageReceiverId",
      profile.user_id || profile.id
    );
    localStorage.setItem("meetroConversationType", "standard");

    localStorage.setItem(
      "selectedContractor",
      JSON.stringify({
        ...profile,
        business_name: profile.business_name || profile.name,
        name: profile.name || profile.business_name,
      })
    );

    localStorage.setItem(
      "conversationBusinessName",
      profile.business_name || profile.name || t("businessProfile")
    );

    setPage("conversationThread");
  }

  if (loading) {
    return <LoadingScreen text={t("contractorDetailsLoading")} />;
  }

  if (!profile) {
    return (
      <div className="app-page meetro-readable-page meetro-visual-page" style={pageWrapper}>
        <button onClick={returnToBusinessDirectory} style={backButton}>
          ← {t("backToContractors")}
        </button>

        <div className="meetro-visual-surface" style={cardStyle}>
          <h2 style={sectionTitle}>{t("contractorNotFound")}</h2>

          <p style={mutedText}>{t("contractorNotFoundText")}</p>
        </div>

        <BottomNav setPage={setPage} currentPage={currentPage} />
      </div>
    );
  }

  const businessIdentity = getBusinessIdentityProjection(profile, {
    fallbackName: t("contractor"),
  });
  const profileName = businessIdentity.businessName || t("contractor");
  const profileCategory =
    businessIdentity.servicesSummary ||
    businessIdentity.category ||
    "";
  const profileDomain =
    profile.serviceDomain ||
    profile.service_domain ||
    inferServiceDomain(profileCategory);
  const fullBusinessAddress =
    profile.fullAddress ||
    profile.full_address ||
    profile.publicAddress ||
    profile.public_address ||
    "";
  const canShowFullAddress =
    profile.showBusinessAddressPublic === true ||
    profile.show_business_address_public === true;
  const serviceArea =
    canShowFullAddress && fullBusinessAddress
      ? fullBusinessAddress
      : businessIdentity.serviceArea ||
        profile.primaryCity ||
        (isSpanish ? "Área de servicio pendiente" : "Service area pending");
  const description =
    businessIdentity.description ||
    (isSpanish
      ? "Este profesional aún no agregó una descripción del negocio."
      : "This professional has not added a business description yet.");
  const servicesOffered = getServicesOffered(profile, profileCategory, isSpanish);
  const availabilitySummary = getAvailabilitySummary(profile, isSpanish);
  const credentialSummary = getCredentialSummary(profile, isSpanish);
  const publicPortfolioProjects = projects;
  const selectedPortfolioProject = publicPortfolioProjects.find(
    (project) => String(project.id) === String(selectedProjectId)
  );
  const businessReviewTrust = reviewStats?.total_reviews && reviewStats?.average_rating
    ? {
        reviewCount: Number(reviewStats.total_reviews),
        averageRating: Number(reviewStats.average_rating),
      }
    : null;
  const canonicalReviewCount = businessReviewTrust?.reviewCount || 0;
  const canonicalAverageRating = businessReviewTrust?.averageRating || 0;
  const publicPortfolioMediaUrls = [
    ...new Set(publicPortfolioProjects.flatMap((project) => getProjectImages(project))),
  ];
  const portfolioPreviewProjectByUrl = new Map();

  publicPortfolioProjects.forEach((project) => {
    getProjectImages(project).forEach((url) => {
      if (!portfolioPreviewProjectByUrl.has(url)) {
        portfolioPreviewProjectByUrl.set(url, project);
      }
    });
  });

  const portfolioPreviewImages = publicPortfolioMediaUrls
    .slice(0, PORTFOLIO_PREVIEW_MAX_IMAGES)
    .map((url, index) => {
      const project = portfolioPreviewProjectByUrl.get(url);
      const baseAlt = project?.title || profileName || t("businessProfile");

      return {
        url,
        alt:
          publicPortfolioMediaUrls.length > 1
            ? `${baseAlt} ${isSpanish ? "foto" : "photo"} ${index + 1}`
            : baseAlt,
      };
    });
  const hasMorePortfolioPreviewImages =
    publicPortfolioMediaUrls.length > PORTFOLIO_PREVIEW_MAX_IMAGES;
  const allowedForHomeownerContext = isProfileAllowedForHomeownerContext(profile);

  if (!allowedForHomeownerContext) {
    return (
      <div className="app-page meetro-readable-page meetro-visual-page" style={pageWrapper}>
        <button onClick={returnToBusinessDirectory} style={backButton}>
          ← {t("backToContractors")}
        </button>

        <div className="meetro-visual-surface" style={cardStyle}>
          <h2 style={sectionTitle}>
            {isSpanish ? "Perfil no disponible" : "Profile unavailable"}
          </h2>
          <p style={mutedText}>
            {isSpanish
              ? "Este profesional no coincide con el tipo de servicio de esta solicitud."
              : "This professional does not match the service type for this request."}
          </p>
        </div>

        <BottomNav setPage={setPage} currentPage="home" />
      </div>
    );
  }

  if (selectedPortfolioProject) {
    return (
      <div className="app-page meetro-readable-page meetro-visual-page" style={pageWrapper}>
        <PortfolioProjectView
          project={selectedPortfolioProject}
          businessName={profileName}
          trustContext={businessReviewTrust}
          onBack={() => setSelectedProjectId("")}
        />

        <BottomNav setPage={setPage} currentPage={currentPage} />
      </div>
    );
  }

  return (
    <div className="app-page meetro-readable-page meetro-visual-page" style={pageWrapper}>
      <button onClick={returnToBusinessDirectory} style={backButton}>
        ← {t("backToContractors")}
      </button>

      <div className="meetro-visual-surface" style={cardStyle}>
        {businessIdentity.imageUrl ? (
          <img
            src={businessIdentity.imageUrl}
            alt={profileName}
            style={profileImage}
          />
        ) : (
          <div style={imagePlaceholder}>
            {businessIdentity.initials}
          </div>
        )}

        <BusinessNameTitle name={profileName} />

        <p style={categoryStyle}>
          {profileCategory || t("serviceProvider")}
          {profileDomain && (
            <span style={domainPill}>
              {profileDomain.replaceAll("_", " ")}
            </span>
          )}
        </p>

        <p style={locationStyle}>
           {serviceArea}
        </p>

        <div style={ratingSummary}>
          {canonicalReviewCount ? (
            <>
              <strong style={{ color: "var(--meetro-color-ink)" }}>
                 {canonicalAverageRating}
              </strong>

              <span style={{ color: "var(--meetro-color-muted)", marginLeft: "8px" }}>
                ({canonicalReviewCount} {t("reviews")})
              </span>
            </>
          ) : (
            <span style={{ color: "var(--meetro-color-muted)", fontWeight: "800" }}>
              {isSpanish ? "Sin reseñas todavía" : "No reviews yet"}
            </span>
          )}
        </div>

        <div style={badgeRow}>
          <span style={credentialSummary.verified ? verifiedBadge : mutedBadge}>
            ✓ {credentialSummary.compactBadgeText}
          </span>
          <span style={credentialSummary.verified ? responseBadge : mutedBadge}>
            {credentialSummary.publicTrustSummary}
          </span>
          <span style={credentialSummary.licensed ? responseBadge : mutedBadge}>
            {credentialSummary.licensed ||
              credentialSummary.credentialsLabel}
          </span>

          {profile.is_featured && (
            <span style={featuredBadge}>{t("featured")}</span>
          )}
        </div>

        <p style={bioStyle}>{description}</p>
      </div>

      <div className="meetro-visual-surface" style={cardStyle}>
        <h2 style={sectionTitle}>
          {isSpanish ? "Vista previa del trabajo" : "Portfolio preview"}
        </h2>

        {portfolioPreviewImages.length > 0 ? (
          <div style={portfolioPreviewStack}>
            <div style={portfolioPreviewGrid}>
              {portfolioPreviewImages.map((image) => (
                <div key={image.url} style={portfolioPreviewThumbFrame}>
                  <img
                    src={image.url}
                    alt={image.alt}
                    loading="lazy"
                    style={portfolioPreviewThumbImage}
                  />
                </div>
              ))}
            </div>

            {hasMorePortfolioPreviewImages && (
              <button
                type="button"
                style={portfolioPreviewMoreButton}
                onClick={scrollToPortfolioGallery}
              >
                {isSpanish ? "Ver más fotos" : "View more photos"}
              </button>
            )}
          </div>
        ) : (
          <div className="meetro-visual-empty-state" style={mediaPlaceholder}>
            <span style={mediaPlaceholderIcon}>▻</span>
            <strong>
              {isSpanish ? "Medios próximamente" : "Media coming soon"}
            </strong>
            <p>
              {isSpanish
                ? "Fotos o videos del portafolio aparecerán aquí cuando estén disponibles."
                : "Portfolio photos or videos will appear here when available."}
            </p>
          </div>
        )}
      </div>

      <div className="meetro-visual-surface" style={cardStyle}>
        <h2 style={sectionTitle}>
          {isSpanish ? "Servicios ofrecidos" : "Services offered"}
        </h2>
        <div style={serviceChipGrid}>
          {servicesOffered.map((service) => (
            <span key={service} style={serviceChip}>
              {service}
            </span>
          ))}
        </div>
      </div>

      <div className="meetro-visual-surface" style={cardStyle}>
        <h2 style={sectionTitle}>
          {isSpanish ? "Disponibilidad y confianza" : "Availability & trust"}
        </h2>
        <div style={trustGrid}>
          <TrustItem
            label={isSpanish ? "Disponibilidad" : "Availability"}
            value={availabilitySummary}
          />
          <TrustItem
            label={t("businessVerification")}
            value={credentialSummary.verificationLabel}
          />
          <TrustItem
            label={t("licensedInsured")}
            value={
              credentialSummary.licensed ||
              credentialSummary.credentialsLabel
            }
          />
          <TrustItem
            label={isSpanish ? "Reseñas" : "Reviews"}
            value={
              canonicalReviewCount
                ? `${canonicalReviewCount} ${t("reviews")}`
                : isSpanish
                ? "Reseñas pendientes"
                : "Reviews pending"
            }
          />
        </div>
      </div>

      <div
        id="contractor-details-project-gallery"
        className="meetro-visual-surface"
        style={cardStyle}
      >
        <h2 style={sectionTitle}>{t("projectGallery")}</h2>

        {publicPortfolioProjects.length === 0 && (
          <p style={mutedText}>{t("noProjectPhotos")}</p>
        )}

        {publicPortfolioProjects.length > 0 && (
          <PortfolioProjectGrid ariaLabel="Public Portfolio projects">
            {publicPortfolioProjects.map((project) => (
              <PortfolioProjectCard
                key={project.id}
                project={project}
                businessName={profileName}
                trustContext={businessReviewTrust}
                onView={(exactProjectId) => setSelectedProjectId(exactProjectId)}
              />
            ))}
          </PortfolioProjectGrid>
        )}
      </div>

      <div className="meetro-visual-surface" style={cardStyle}>
        <h2 style={sectionTitle}>
          {isSpanish ? "Opciones existentes" : "Existing contact options"}
        </h2>
        <p style={mutedText}>
          {isSpanish
            ? "Estas acciones usan los flujos actuales de Meetro."
            : "These actions use Meetro's existing safe flows."}
        </p>

        <button
          onClick={() => setShowQuoteForm(!showQuoteForm)}
          className="meetro-visual-primary-button"
          style={primaryButton}
        >
          {showQuoteForm ? t("cancelQuoteRequest") : t("requestQuote")}
        </button>

        <button onClick={messageContractor} style={secondaryButton}>
          {t("messageContractor")}
        </button>
      </div>

      {showQuoteForm && (
        <div className="meetro-visual-surface" style={cardStyle}>
          <h2 style={sectionTitle}>{t("requestQuote")}</h2>

          <input
            placeholder={t("projectTitle")}
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            style={inputStyle}
          />

          <textarea
            placeholder={t("describeProject")}
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            style={{
              ...inputStyle,
              minHeight: "120px",
              resize: "none",
            }}
          />

          <input
            placeholder={t("projectLocation")}
            value={projectLocation}
            onChange={(e) => setProjectLocation(e.target.value)}
            style={inputStyle}
          />

          <button
            onClick={submitQuoteRequest}
            disabled={submittingQuote}
            className="meetro-visual-primary-button"
            style={{
              ...primaryButton,
              background: submittingQuote
                ? "rgba(100, 116, 139, 0.72)"
                : "var(--meetro-gradient-community-action)",
              cursor: submittingQuote ? "not-allowed" : "pointer",
            }}
          >
            {submittingQuote ? t("submitting") : t("submitQuoteRequest")}
          </button>
        </div>
      )}

      <div className="meetro-visual-surface" style={cardStyle}>
        <h2 style={sectionTitle}>{t("leaveReview")}</h2>

        <div style={starRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              style={{
                ...starButton,
                opacity: star <= rating ? 1 : 0.3,
              }}
            >
              
            </button>
          ))}
        </div>

        <textarea
          placeholder={t("writeReview")}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          style={{
            ...inputStyle,
            minHeight: "100px",
            resize: "none",
          }}
        />

        <button
          onClick={submitReview}
          disabled={submittingReview}
          className="meetro-visual-primary-button"
          style={{
            ...primaryButton,
            background: submittingReview
              ? "rgba(100, 116, 139, 0.72)"
              : "var(--meetro-gradient-community-action)",
            cursor: submittingReview ? "not-allowed" : "pointer",
          }}
        >
          {submittingReview ? t("submitting") : t("submitReview")}
        </button>
      </div>

      <div className="meetro-visual-surface" style={cardStyle}>
        <h2 style={sectionTitle}>{t("reviews")}</h2>

        {reviews.length === 0 && (
          <div style={reviewEmptyCard}>
            <strong>
              {isSpanish ? "Sin reseñas todavía" : "No reviews yet"}
            </strong>
            <p style={mutedText}>
              {isSpanish
                ? "Las reseñas aparecerán después de trabajos completados."
                : "Reviews will appear after completed jobs."}
            </p>
          </div>
        )}

        {reviews.map((review) => (
          <div key={review.id} style={innerCard}>
            <p style={{ margin: 0 }}>{"".repeat(Number(review.rating))}</p>

            <p style={innerText}>
              {review.comment || review.review_text || t("noReviewText")}
            </p>

            {(review.service || review.projectTitle || review.jobTitle) && (
              <p style={smallText}>
                {review.service || review.projectTitle || review.jobTitle}
              </p>
            )}

            <p style={smallText}>
              {t("by")}{" "}
              {review.customerDisplayName || review.reviewerName || t("meetroUser")}
            </p>
          </div>
        ))}
      </div>

      <BottomNav setPage={setPage} currentPage={currentPage} />
    </div>
  );
}

function isProfileAllowedForHomeownerContext(profile = {}) {
  const contexts = getHomeownerRequestContexts();
  const profileCategory =
    profile.category ||
    profile.business_category ||
    profile.serviceCategory ||
    "";
  const profileDomain =
    profile.serviceDomain ||
    profile.service_domain ||
    inferServiceDomain(profileCategory);

  if (!profileDomain) return false;
  if (contexts.length === 0) return true;

  return contexts.some((requestContext) =>
    canProfessionalReceiveRequest(
      {
        ...profile,
        businessCategory: profileCategory,
        category: profileCategory,
        serviceCategories:
          profile.serviceCategories ||
          profile.service_categories ||
          profile.services ||
          [profileCategory],
      },
      requestContext
    )
  );
}

function getHomeownerRequestContexts() {
  if (!canReadLegacyWorkflowStorage()) return [];
  let requests;

  try {
    requests = JSON.parse(localStorage.getItem("homeownerRequests") || "[]");
  } catch {
    requests = [];
  }

  const selectedRequestId = String(
    localStorage.getItem("selectedHomeownerRequestId") || ""
  );

  const activeRequests = requests.filter((request) => {
    const status = String(request?.status || "open").toLowerCase();
    return !["closed", "cancelled"].includes(status);
  });

  const prioritizedRequests = selectedRequestId
    ? [
        ...activeRequests.filter(
          (request) =>
            String(request.id || request.requestId || "") === selectedRequestId
        ),
        ...activeRequests.filter(
          (request) =>
            String(request.id || request.requestId || "") !== selectedRequestId
        ),
      ]
    : activeRequests;

  return prioritizedRequests
    .map((request) => {
      const category = inferRequestCategory(request);
      if (!category) return null;

      return {
        category,
        serviceDomain: request.serviceDomain || request.service_domain || "",
        city: request.city || "",
        zipCode: request.zipCode || request.zip || "",
      };
    })
    .filter(Boolean)
    .slice(0, 5);
}

function getServicesOffered(profile = {}, fallbackCategory = "", isSpanish = false) {
  const services = getBusinessServicesProjection(
    { ...profile, category: profile.category || fallbackCategory },
    { translate: t }
  );

  if (!services.isEmpty) return services.displayLabels;

  return [
    isSpanish
      ? "Servicios no listados todavía"
      : "Services not listed yet",
  ];
}

function getAvailabilitySummary(profile = {}, isSpanish = false) {
  const availability = Array.isArray(profile.availability)
    ? profile.availability
    : Array.isArray(profile.businessAvailability)
    ? profile.businessAvailability
    : [];

  if (profile.availableNow || profile.available_now) {
    return isSpanish ? "Disponible ahora" : "Available now";
  }

  if (availability.length > 0) {
    return availability.join(", ");
  }

  return isSpanish
    ? "Disponibilidad no agregada todavía"
    : "Availability not added yet";
}

function getCredentialSummary(profile = {}, isSpanish = false) {
  const verification = getBusinessVerificationProjection(profile, {
    translate: (key) => t(key),
  });
  const licensed =
    profile.licensedInsured ||
    profile.licensed_insured ||
    profile.license ||
    profile.insurance ||
    "";

  return {
    verified: verification.verified,
    verificationLabel: verification.verificationLabel,
    compactBadgeText: verification.compactBadgeText,
    publicTrustSummary: verification.publicTrustSummary,
    credentialsLabel: verification.credentialsLabel,
    licensed: licensed
      ? isSpanish
        ? "Licencia / seguro agregado"
        : "License / insurance added"
      : "",
  };
}

function TrustItem({ label, value }) {
  return (
    <div style={trustItem}>
      <span style={trustLabel}>{label}</span>
      <strong style={trustValue}>{value}</strong>
    </div>
  );
}

function BusinessNameTitle({ name }) {
  const displayName = String(name || "").trim();
  const ampersandIndex = displayName.indexOf("&");

  if (ampersandIndex === -1) {
    return <h1 style={businessTitle}>{displayName}</h1>;
  }

  const beforeAmpersand = displayName.slice(0, ampersandIndex).trim();
  const afterAmpersand = displayName.slice(ampersandIndex + 1).trim();

  return (
    <h1 style={{ ...businessTitle, ...ampersandBusinessTitle }}>
      {beforeAmpersand && (
        <span style={businessTitleLine}>{beforeAmpersand}</span>
      )}
      <span style={businessTitleAmpersand}>&</span>
      {afterAmpersand && (
        <span style={businessTitleLine}>{afterAmpersand}</span>
      )}
    </h1>
  );
}

const pageWrapper = {
  background: "var(--meetro-gradient-community-page)",
  minHeight: "100dvh",
  width: "100%",
  maxWidth: "900px",
  margin: "0 auto",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 64px) max(18px, env(safe-area-inset-right, 0px)) calc(120px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  color: "var(--meetro-color-ink)",
  overflowX: "hidden",
};

const backButton = {
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-forest)",
  boxShadow: "var(--meetro-shadow-soft)",
  padding: "10px 14px",
  borderRadius: "14px",
  fontWeight: "bold",
  marginBottom: "18px",
  cursor: "pointer",
};

const imagePlaceholder = {
  width: "100%",
  height: "220px",
  borderRadius: "24px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "72px",
  fontWeight: "bold",
  marginBottom: "20px",
};

const businessTitle = {
  margin: "0 auto 8px",
  maxWidth: "min(100%, 560px)",
  color: "var(--meetro-color-ink)",
  fontSize: "clamp(34px, 9vw, 42px)",
  lineHeight: 1.06,
  textAlign: "center",
  overflowWrap: "normal",
};

const ampersandBusinessTitle = {
  display: "grid",
  gap: "2px",
  justifyItems: "center",
};

const businessTitleLine = {
  display: "block",
};

const businessTitleAmpersand = {
  display: "block",
  fontSize: "0.82em",
  lineHeight: 0.95,
};

const categoryStyle = {
  margin: 0,
  color: "var(--meetro-color-forest)",
  fontWeight: "bold",
  fontSize: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const domainPill = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "5px 9px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "capitalize",
};

const locationStyle = {
  color: "var(--meetro-color-muted)",
  marginTop: "10px",
};

const ratingSummary = {
  marginTop: "12px",
  fontSize: "17px",
};

const badgeRow = {
  display: "flex",
  justifyContent: "center",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "18px",
};

const verifiedBadge = {
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  padding: "8px 14px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "13px",
};

const responseBadge = {
  background: "rgba(31, 77, 52, 0.10)",
  color: "var(--meetro-color-forest)",
  padding: "8px 14px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "13px",
};

const mutedBadge = {
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-muted)",
  padding: "8px 14px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "13px",
};

const featuredBadge = {
  background: "rgba(188, 122, 55, 0.14)",
  color: "var(--meetro-color-wood)",
  padding: "8px 14px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "13px",
};

const bioStyle = {
  color: "var(--meetro-color-muted)",
  lineHeight: 1.6,
  marginTop: "18px",
  fontSize: "16px",
};

const mediaPlaceholder = {
  minHeight: "190px",
  borderRadius: "22px",
  border: "1px dashed var(--meetro-color-line)",
  background: "var(--meetro-surface-warm)",
  color: "var(--meetro-color-muted)",
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  padding: "20px",
  boxSizing: "border-box",
};

const mediaPlaceholderIcon = {
  width: "46px",
  height: "46px",
  borderRadius: "999px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  fontWeight: "950",
};

const serviceChipGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  minWidth: 0,
};

const serviceChip = {
  maxWidth: "100%",
  borderRadius: "999px",
  padding: "9px 12px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  fontSize: "13px",
  fontWeight: "900",
  overflowWrap: "anywhere",
};

const trustGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
  gap: "10px",
};

const trustItem = {
  display: "grid",
  gap: "6px",
  padding: "13px",
  borderRadius: "16px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-warm)",
  minWidth: 0,
};

const trustLabel = {
  color: "var(--meetro-color-muted)",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const trustValue = {
  color: "var(--meetro-color-ink)",
  fontSize: "13px",
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};

const cardStyle = {
  background: "var(--meetro-surface-paper)",
  borderRadius: "24px",
  padding: "22px",
  marginBottom: "22px",
  color: "var(--meetro-color-ink)",
  border: "1px solid var(--meetro-color-line)",
  boxShadow: "var(--meetro-shadow-soft)",
};

const sectionTitle = {
  color: "var(--meetro-color-ink)",
  marginTop: 0,
};

const mutedText = {
  color: "var(--meetro-color-muted)",
  lineHeight: 1.5,
};

const inputStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid var(--meetro-color-line)",
  marginBottom: "14px",
  fontSize: "16px",
  boxSizing: "border-box",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-ink)",
};

const primaryButton = {
  width: "100%",
  marginTop: "18px",
  padding: "15px",
  border: "none",
  borderRadius: "16px",
  background: "var(--meetro-gradient-community-action)",
  color: "#fffdf8",
  boxShadow: "0 14px 28px rgba(31, 77, 52, 0.18)",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
};

const secondaryButton = {
  width: "100%",
  marginTop: "12px",
  padding: "15px",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "16px",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
};

const portfolioPreviewStack = {
  display: "grid",
  gap: "16px",
  minWidth: 0,
};

const portfolioPreviewGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(132px, 148px))",
  gap: "12px",
  alignItems: "start",
  justifyContent: "start",
  maxWidth: "100%",
  overflow: "hidden",
};

const portfolioPreviewThumbFrame = {
  position: "relative",
  width: "100%",
  aspectRatio: "4 / 3",
  borderRadius: "18px",
  overflow: "hidden",
  background: "#f1f5f9",
  border: "1px solid var(--meetro-color-line)",
  boxShadow: "var(--meetro-shadow-soft)",
  boxSizing: "border-box",
};

const portfolioPreviewThumbImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center",
  display: "block",
};

const portfolioOpenButton = {
  width: "auto",
  alignSelf: "center",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-forest)",
  padding: "10px 18px",
  borderRadius: "999px",
  fontWeight: "800",
  fontSize: "13px",
  cursor: "pointer",
  marginTop: "14px",
};

const portfolioPreviewMoreButton = {
  ...portfolioOpenButton,
  justifySelf: "center",
  marginTop: 0,
};

const innerCard = {
  background: "var(--meetro-surface-warm)",
  borderRadius: "18px",
  padding: "14px",
  marginTop: "14px",
};

const reviewEmptyCard = {
  background: "var(--meetro-surface-warm)",
  border: "1px solid var(--meetro-color-line)",
  borderRadius: "18px",
  padding: "14px",
  color: "var(--meetro-color-ink)",
};

const innerText = {
  color: "var(--meetro-color-muted)",
  lineHeight: 1.6,
};

const smallText = {
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  marginBottom: 0,
};

const starRow = {
  display: "flex",
  gap: "8px",
  marginBottom: "14px",
};

const starButton = {
  border: "none",
  background: "transparent",
  fontSize: "30px",
  cursor: "pointer",
};

const profileImage = {
  width: "96px",
  height: "96px",
  borderRadius: "28px",
  objectFit: "cover",
  marginBottom: "18px",
};

export default ContractorDetails;
