import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import API_URL from "../api";
import { authFetch } from "../utils/authFetch";
import { getLanguage, t } from "../utils/language";
import {
  getProfessionalReviews,
  getProfessionalReviewStats,
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
import { getBusinessPortfolioProofProjection } from "../utils/businessPortfolioProof";
import { canReadLegacyWorkflowStorage } from "../utils/clientWorkflowStoragePolicy";

const PORTFOLIO_PREVIEW_MAX_IMAGES = 5;

function ContractorDetails({ setPage, currentPage }) {
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeProjectImage, setActiveProjectImage] = useState("");
  const [expandedProjectImage, setExpandedProjectImage] = useState("");
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
      } catch {}
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

  function getLocalGalleryForProfile(contractorProfile) {
    if (!contractorProfile) return [];

    const profileId = String(contractorProfile.id || "");
    const profileName = String(
      contractorProfile.business_name || contractorProfile.name || ""
    ).toLowerCase();

    const possibleKeys = [
      "businessGallery",
      "businessGalleryPhotos",
      "projectGallery",
      "projectGalleryPhotos",
      "contractorProjects",
      "meetroBusinessPhotos",
      "meetroProjectGallery",
      "uploadedBusinessPhotos",
      "uploadedGalleryPhotos",
    ];

    let collected = [];

    possibleKeys.forEach((key) => {
      const saved = safeJson(key, []);

      if (Array.isArray(saved)) {
        collected = [...collected, ...saved];
      }
    });

    const selectedBusiness = safeJson("selectedContractor", {});

    const embeddedGallery = [
      ...(Array.isArray(contractorProfile.gallery) ? contractorProfile.gallery : []),
      ...(Array.isArray(contractorProfile.photos) ? contractorProfile.photos : []),
      ...(Array.isArray(contractorProfile.projects) ? contractorProfile.projects : []),
      ...(Array.isArray(contractorProfile.projectGallery)
        ? contractorProfile.projectGallery
        : []),
      ...(Array.isArray(selectedBusiness.gallery) ? selectedBusiness.gallery : []),
      ...(Array.isArray(selectedBusiness.photos) ? selectedBusiness.photos : []),
      ...(Array.isArray(selectedBusiness.projects) ? selectedBusiness.projects : []),
      ...(Array.isArray(selectedBusiness.projectGallery)
        ? selectedBusiness.projectGallery
        : []),
    ];

    collected = [...collected, ...embeddedGallery];

    return collected
      .filter((item) => item && typeof item === "object")
      .filter((item) => {
        const itemBusinessId = String(
          item.businessId ||
            item.business_id ||
            item.contractorId ||
            item.contractor_id ||
            ""
        );

        const itemBusinessName = String(
          item.businessName ||
            item.business_name ||
            item.contractorName ||
            item.contractor_name ||
            item.ownerName ||
            ""
        ).toLowerCase();

        if (!itemBusinessId && !itemBusinessName) return true;

        return (
          (profileId && itemBusinessId === profileId) ||
          (profileName && itemBusinessName === profileName)
        );
      })
      .map((item, index) => normalizeGalleryItem(item, index, "local"))
      .filter((item) => item.image_url);
  }

  function mergeProjects(apiProjects, localProjects) {
    const seen = new Set();

    return [...apiProjects, ...localProjects].filter((project) => {
      const key =
        project.id ||
        project.image_url ||
        project.title ||
        JSON.stringify(project);

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
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

        const localGallery = getLocalGalleryForProfile(savedContractor);

        setProfile(savedContractor);

        if (savedContractor.id) {
          await fetchProjects(savedContractor.id, localGallery);
          await fetchReviews(savedContractor.id, savedContractor);
        } else {
          setProjects(localGallery);
          await fetchReviews("", savedContractor);
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
        const localGallery = getLocalGalleryForProfile(data.profile);

        setProfile(data.profile);
        await fetchReviews(data.profile.id, data.profile);
        await fetchProjects(data.profile.id, localGallery);
      } else if (savedContractor.id || savedContractor.name) {
        const localGallery = getLocalGalleryForProfile(savedContractor);

        setProfile(savedContractor);
        setProjects(localGallery);
      }
    } catch (error) {
      console.error(error);

      const savedContractor = JSON.parse(
        localStorage.getItem("selectedContractor") || "{}"
      );

      if (savedContractor.id || savedContractor.name) {
        const localGallery = getLocalGalleryForProfile(savedContractor);

        setProfile(savedContractor);
        setProjects(localGallery);
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchReviews(contractorId, contractorProfile = profile) {
    const localReviews = getProfessionalReviews({
      professionalId: contractorId || contractorProfile?.id,
      professionalName:
        contractorProfile?.business_name || contractorProfile?.name,
    });
    const localStats = getProfessionalReviewStats(localReviews);

    try {
      const response = await fetch(`${API_URL}/reviews/${contractorId}`);
      const data = await response.json();
      const apiReviews = data.reviews || [];
      const combinedReviews = [...localReviews, ...apiReviews];
      const seen = new Set();
      const dedupedReviews = combinedReviews.filter((review) => {
        const key =
          review.id ||
          [
            review.professionalId || contractorId,
            review.jobId || review.requestId,
            review.createdAt || review.created_at,
            review.comment || review.review_text,
          ].join(":");

        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const combinedStats = getProfessionalReviewStats(dedupedReviews);

      setReviews(dedupedReviews);
      setReviewStats({
        average_rating:
          combinedStats.averageRating || data.stats?.average_rating || "",
        total_reviews:
          combinedStats.totalReviews || data.stats?.total_reviews || 0,
      });
    } catch (error) {
      console.error(error);
      setReviews(localReviews);
      setReviewStats({
        average_rating: localStats.averageRating,
        total_reviews: localStats.totalReviews,
      });
    }
  }

  async function fetchProjects(contractorId, localGallery = []) {
    try {
      const response = await fetch(
        `${API_URL}/contractor-projects/${contractorId}`
      );

      const data = await response.json();

      const apiProjects = (data.projects || []).map((project, index) =>
        normalizeGalleryItem(project, index, "api")
      );

      setProjects(mergeProjects(apiProjects, localGallery));
    } catch (error) {
      console.error(error);
      setProjects(localGallery);
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

        await fetchReviews(profile.id, profile);
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
  const portfolioProof = getBusinessPortfolioProofProjection(
    {
      ...profile,
      businessPortfolio: projects,
      projectGallery: projects,
    },
    {
      translate: (key) => t(key),
      reviews,
    }
  );
  const publicPortfolioProjects = portfolioProof.projects;
  const portfolioPreviewProjectByUrl = new Map();

  publicPortfolioProjects.forEach((project) => {
    getProjectImages(project).forEach((url) => {
      if (!portfolioPreviewProjectByUrl.has(url)) {
        portfolioPreviewProjectByUrl.set(url, project);
      }
    });
  });

  const portfolioPreviewImages = portfolioProof.mediaUrls
    .slice(0, PORTFOLIO_PREVIEW_MAX_IMAGES)
    .map((url, index) => {
      const project = portfolioPreviewProjectByUrl.get(url);
      const baseAlt = project?.title || profileName || t("businessProfile");

      return {
        url,
        alt:
          portfolioProof.mediaUrls.length > 1
            ? `${baseAlt} ${isSpanish ? "foto" : "photo"} ${index + 1}`
            : baseAlt,
      };
    });
  const hasMorePortfolioPreviewImages =
    portfolioProof.mediaUrls.length > PORTFOLIO_PREVIEW_MAX_IMAGES;
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

  if (selectedProject) {
    const selectedImages = getProjectImages(selectedProject);
    const mainProjectImage = activeProjectImage || selectedImages[0] || "";

    return (
      <div className="app-page meetro-readable-page meetro-visual-page" style={pageWrapper}>
        <button
          onClick={() => {
            setSelectedProject(null);
            setActiveProjectImage("");
          }}
          style={backButton}
        >
          ← {t("back")}
        </button>

        <div className="meetro-visual-surface" style={cardStyle}>
          <h1 style={businessTitle}>{selectedProject.title}</h1>

          <p style={mutedText}>
            {profileName || t("businessProfile")}
          </p>

          {selectedProject.description && (
            <p style={bioStyle}>{selectedProject.description}</p>
          )}

          {selectedImages[0] && (
            <img
              src={mainProjectImage}
              alt={selectedProject.title}
              style={publicMainImage}
              onClick={() => setExpandedProjectImage(mainProjectImage)}
            />
          )}

          {selectedImages.length > 1 && (
            <div style={publicGalleryGrid}>
              {selectedImages.map((url, index) => (
                <img
                  key={`${selectedProject.id}-${index}`}
                  src={url}
                  alt={`${selectedProject.title} ${index + 1}`}
                  style={{
                    ...publicGalleryImage,
                    ...(mainProjectImage === url ? activeThumbnailImage : {}),
                  }}
                  onClick={() => setActiveProjectImage(url)}
                />
              ))}
            </div>
          )}

          <button onClick={messageContractor} className="meetro-visual-primary-button" style={primaryButton}>
            {t("messageContractor")}
          </button>

          <button
            onClick={() => {
              setSelectedProject(null);
              setShowQuoteForm(true);
            }}
            style={secondaryButton}
          >
            {t("requestQuote")}
          </button>
        </div>

        {expandedProjectImage && (
          <div style={imagePreviewOverlay} onClick={() => setExpandedProjectImage("")}>
            <button style={closePreviewBtn}>×</button>
            <img
              src={expandedProjectImage}
              alt="Expanded project preview"
              style={expandedPreviewImage}
            />
          </div>
        )}

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
          {portfolioProof.reviewCount ? (
            <>
              <strong style={{ color: "var(--meetro-color-ink)" }}>
                 {portfolioProof.averageRating || profile.rating}
              </strong>

              <span style={{ color: "var(--meetro-color-muted)", marginLeft: "8px" }}>
                ({portfolioProof.reviewCount} {t("reviews")})
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
              portfolioProof.reviewCount
                ? `${portfolioProof.reviewCount} ${t("reviews")}`
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

        {publicPortfolioProjects.map((project) => {
          const projectImages = getProjectImages(project);
          const coverImage = projectImages[0];

          return (
            <div key={project.id} style={portfolioCard}>
              {coverImage && (
                <div style={portfolioCoverWrap}>
                  <img
                    src={coverImage}
                    alt={project.title}
                    style={portfolioCoverImage}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />

                  {projectImages.length > 1 && (
                    <span style={portfolioPhotoBadge}>
                      +{projectImages.length - 1} photos
                    </span>
                  )}
                </div>
              )}

              <div style={portfolioContent}>
                <span style={portfolioTrustBadge}>
                  {t("projectGallery")}
                </span>

                <h3 style={innerTitle}>{project.title}</h3>

                {project.description && (
                  <p style={innerText}>{project.description}</p>
                )}

                <button
                  style={portfolioOpenButton}
                  onClick={() => {
                    const projectImages = getProjectImages(project);
                    setSelectedProject(project);
                    setActiveProjectImage(projectImages[0] || "");
                  }}
                >
                  {t("viewPortfolioWork")}
                </button>
              </div>
            </div>
          );
        })}
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
  let requests = [];

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

const imagePreviewOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.92)",
  zIndex: 80,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "18px",
};

const expandedPreviewImage = {
  maxWidth: "100%",
  maxHeight: "86vh",
  objectFit: "contain",
  borderRadius: "18px",
};

const closePreviewBtn = {
  position: "fixed",
  top: "18px",
  right: "18px",
  width: "42px",
  height: "42px",
  borderRadius: "999px",
  border: "none",
  background: "var(--meetro-surface-paper)",
  color: "var(--meetro-color-ink)",
  fontSize: "28px",
  fontWeight: "900",
  cursor: "pointer",
};

const publicMainImage = {
  width: "100%",
  height: "260px",
  objectFit: "cover",
  borderRadius: "22px",
  background: "#f1f5f9",
  marginTop: "18px",
  marginBottom: "12px",
};

const publicGalleryGrid = {
  display: "flex",
  gap: "12px",
  overflowX: "auto",
  paddingBottom: "6px",
  marginTop: "18px",
  marginBottom: "18px",
  scrollSnapType: "x mandatory",
};

const activeThumbnailImage = {
  border: "3px solid var(--meetro-color-forest)",
  opacity: 1,
};

const publicGalleryImage = {
  minWidth: "260px",
  width: "260px",
  height: "170px",
  objectFit: "cover",
  borderRadius: "18px",
  background: "#f1f5f9",
  flexShrink: 0,
  scrollSnapAlign: "start",
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

const portfolioCard = {
  background: "var(--meetro-surface-paper)",
  borderRadius: "22px",
  overflow: "hidden",
  marginTop: "14px",
  border: "1px solid var(--meetro-color-line)",
  boxShadow: "var(--meetro-shadow-soft)",
};

const portfolioCoverWrap = {
  position: "relative",
  width: "100%",
  height: "180px",
  background: "#f1f5f9",
  overflow: "hidden",
};

const portfolioCoverImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const portfolioPhotoBadge = {
  position: "absolute",
  right: "14px",
  bottom: "14px",
  background: "rgba(15,23,42,0.78)",
  color: "white",
  padding: "8px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
};

const portfolioContent = {
  padding: "16px",
};

const portfolioTrustBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "transparent",
  color: "var(--meetro-color-muted)",
  padding: "0",
  borderRadius: "0",
  fontSize: "12px",
  fontWeight: "800",
  marginBottom: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
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

const projectImage = {
  width: "100%",
  maxHeight: "280px",
  objectFit: "contain",
  background: "var(--meetro-surface-warm)",
  borderRadius: "16px",
  padding: "10px",
  boxSizing: "border-box",
};

const innerTitle = {
  color: "var(--meetro-color-ink)",
  marginBottom: "8px",
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
