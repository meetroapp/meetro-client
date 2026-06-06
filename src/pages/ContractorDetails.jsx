import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import API_URL from "../api";
import { authFetch } from "../utils/authFetch";
import { t } from "../utils/language";

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

  async function fetchContractor() {
    try {
      const savedContractor = JSON.parse(
        localStorage.getItem("selectedContractor") || "{}"
      );

      if (savedContractor.name || savedContractor.business_name) {
        const localGallery = getLocalGalleryForProfile(savedContractor);

        setProfile(savedContractor);

        if (savedContractor.id) {
          await fetchProjects(savedContractor.id, localGallery);
          await fetchReviews(savedContractor.id);
        } else {
          setProjects(localGallery);
        }

        setLoading(false);
        return;
      }

      const contractorId = savedContractor.id;

      const response = await fetch(
        `${API_URL}/contractor-profiles/${contractorId}`
      );

      const data = await response.json();

      if (data.profile) {
        const localGallery = getLocalGalleryForProfile(data.profile);

        setProfile(data.profile);
        await fetchReviews(data.profile.id);
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

  async function fetchReviews(contractorId) {
    try {
      const response = await fetch(`${API_URL}/reviews/${contractorId}`);
      const data = await response.json();

      setReviews(data.reviews || []);
      setReviewStats(data.stats || null);
    } catch (error) {
      console.error(error);
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
      <div style={pageWrapper}>
        <button onClick={() => setPage("contractors")} style={backButton}>
          ← {t("backToContractors")}
        </button>

        <div style={cardStyle}>
          <h2 style={sectionTitle}>{t("contractorNotFound")}</h2>

          <p style={mutedText}>{t("contractorNotFoundText")}</p>
        </div>

        <BottomNav setPage={setPage} currentPage={currentPage} />
      </div>
    );
  }

  if (selectedProject) {
    const selectedImages = getProjectImages(selectedProject);
    const mainProjectImage = activeProjectImage || selectedImages[0] || "";

    return (
      <div style={pageWrapper}>
        <button
          onClick={() => {
            setSelectedProject(null);
            setActiveProjectImage("");
          }}
          style={backButton}
        >
          ← {t("back")}
        </button>

        <div style={cardStyle}>
          <h1 style={businessTitle}>{selectedProject.title}</h1>

          <p style={mutedText}>
            {profile.business_name || profile.name || t("businessProfile")}
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

          <button onClick={messageContractor} style={primaryButton}>
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
    <div style={pageWrapper}>
      <button onClick={() => setPage("contractors")} style={backButton}>
        ← {t("backToContractors")}
      </button>

      <div style={cardStyle}>
        {profile.image_url || profile.imageUrl || profile.logo ? (
          <img
            src={profile.image_url || profile.imageUrl || profile.logo}
            alt={profile.business_name || profile.name || "Business"}
            style={profileImage}
          />
        ) : (
          <div style={imagePlaceholder}>
            {(profile.business_name || profile.name || "B")
              .charAt(0)
              .toUpperCase()}
          </div>
        )}

        <h1 style={businessTitle}>
          {profile.business_name || profile.name || t("contractor")}
        </h1>

        <p style={categoryStyle}>
          {profile.category || t("serviceProvider")}
        </p>

        <p style={locationStyle}>
          📍 {profile.location || t("locationNotSet")}
        </p>

        <div style={ratingSummary}>
          <strong style={{ color: "#111" }}>
            ⭐ {reviewStats?.average_rating || profile.rating || t("noRatingYet")}
          </strong>

          <span style={{ color: "#666", marginLeft: "8px" }}>
            ({reviewStats?.total_reviews || 0} {t("reviews")})
          </span>
        </div>

        <div style={badgeRow}>
          <span style={verifiedBadge}>✓ {t("verified")}</span>
          <span style={responseBadge}>⚡ {t("fastResponse")}</span>

          {profile.is_featured && (
            <span style={featuredBadge}>{t("featured")}</span>
          )}
        </div>

        <p style={bioStyle}>
          {profile.bio || "Business description coming soon"}
        </p>

        <button
          onClick={() => setShowQuoteForm(!showQuoteForm)}
          style={primaryButton}
        >
          {showQuoteForm ? t("cancelQuoteRequest") : t("requestQuote")}
        </button>

        <button onClick={messageContractor} style={secondaryButton}>
          {t("messageContractor")}
        </button>
      </div>

      {showQuoteForm && (
        <div style={cardStyle}>
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
            style={{
              ...primaryButton,
              background: submittingQuote ? "#999" : "#5b3df5",
              cursor: submittingQuote ? "not-allowed" : "pointer",
            }}
          >
            {submittingQuote ? t("submitting") : t("submitQuoteRequest")}
          </button>
        </div>
      )}

      <div style={cardStyle}>
        <h2 style={sectionTitle}>{t("projectGallery")}</h2>

        {projects.length === 0 && (
          <p style={mutedText}>{t("noProjectPhotos")}</p>
        )}

        {projects.map((project) => {
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
                  {t("open")} {t("project")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={cardStyle}>
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
              ⭐
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
          style={{
            ...primaryButton,
            background: submittingReview ? "#999" : "#5b3df5",
            cursor: submittingReview ? "not-allowed" : "pointer",
          }}
        >
          {submittingReview ? t("submitting") : t("submitReview")}
        </button>
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitle}>{t("reviews")}</h2>

        {reviews.length === 0 && <p style={mutedText}>{t("noReviewsYet")}</p>}

        {reviews.map((review) => (
          <div key={review.id} style={innerCard}>
            <p style={{ margin: 0 }}>{"⭐".repeat(Number(review.rating))}</p>

            <p style={innerText}>
              {review.review_text || t("noReviewText")}
            </p>

            <p style={smallText}>
              {t("by")} {review.reviewer_email || t("meetroUser")}
            </p>
          </div>
        ))}
      </div>

      <BottomNav setPage={setPage} currentPage={currentPage} />
    </div>
  );
}

const pageWrapper = {
  background: "#f5f5f7",
  minHeight: "100vh",
  padding: "calc(env(safe-area-inset-top) + 64px) 18px 120px",
  boxSizing: "border-box",
  color: "#111",
};

const backButton = {
  border: "none",
  background: "#eee7ff",
  color: "#5b3df5",
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
  background: "#eee7ff",
  color: "#5b3df5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "72px",
  fontWeight: "bold",
  marginBottom: "20px",
};

const businessTitle = {
  margin: 0,
  marginBottom: "8px",
  color: "#111",
  fontSize: "38px",
  lineHeight: 1.1,
};

const categoryStyle = {
  margin: 0,
  color: "#5b3df5",
  fontWeight: "bold",
  fontSize: "18px",
};

const locationStyle = {
  color: "#666",
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
  background: "#eef2ff",
  color: "#5b3df5",
  padding: "8px 14px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "13px",
};

const responseBadge = {
  background: "#e8fff0",
  color: "#12a150",
  padding: "8px 14px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "13px",
};

const featuredBadge = {
  background: "#fff7df",
  color: "#c79b00",
  padding: "8px 14px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "13px",
};

const bioStyle = {
  color: "#555",
  lineHeight: 1.6,
  marginTop: "18px",
  fontSize: "16px",
};

const cardStyle = {
  background: "white",
  borderRadius: "24px",
  padding: "22px",
  marginBottom: "22px",
  color: "#111",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const sectionTitle = {
  color: "#111",
  marginTop: 0,
};

const mutedText = {
  color: "#666",
  lineHeight: 1.5,
};

const inputStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #ddd",
  marginBottom: "14px",
  fontSize: "16px",
  boxSizing: "border-box",
  background: "white",
  color: "#111",
};

const primaryButton = {
  width: "100%",
  marginTop: "18px",
  padding: "15px",
  border: "none",
  borderRadius: "16px",
  background: "#5b3df5",
  color: "white",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
};

const secondaryButton = {
  width: "100%",
  marginTop: "12px",
  padding: "15px",
  border: "none",
  borderRadius: "16px",
  background: "#eee7ff",
  color: "#5b3df5",
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
  background: "white",
  color: "#111827",
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
  border: "3px solid #5b3df5",
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

const portfolioCard = {
  background: "white",
  borderRadius: "22px",
  overflow: "hidden",
  marginTop: "14px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
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
  color: "#475569",
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
  border: "1px solid #ddd6fe",
  background: "#fcfbff",
  color: "#5b3df5",
  padding: "10px 18px",
  borderRadius: "999px",
  fontWeight: "800",
  fontSize: "13px",
  cursor: "pointer",
  marginTop: "14px",
};

const innerCard = {
  background: "#fafafa",
  borderRadius: "18px",
  padding: "14px",
  marginTop: "14px",
};

const projectImage = {
  width: "100%",
  maxHeight: "280px",
  objectFit: "contain",
  background: "#f4f4f4",
  borderRadius: "16px",
  padding: "10px",
  boxSizing: "border-box",
};

const innerTitle = {
  color: "#111",
  marginBottom: "8px",
};

const innerText = {
  color: "#555",
  lineHeight: 1.6,
};

const smallText = {
  color: "#777",
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
