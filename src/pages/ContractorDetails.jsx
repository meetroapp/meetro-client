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

  async function fetchContractor() {
    try {
      const savedContractor = JSON.parse(
        localStorage.getItem("selectedContractor") || "{}"
      );

      const contractorId =
        localStorage.getItem("selectedContractorId") || savedContractor.id;

      const response = await fetch(
        `${API_URL}/contractor-profiles/${contractorId}`
      );

      const data = await response.json();

      if (data.profile) {
        setProfile(data.profile);
        await fetchReviews(data.profile.id);
        await fetchProjects(data.profile.id);
      } else if (savedContractor.id) {
        setProfile(savedContractor);
      }
    } catch (error) {
      console.error(error);

      const savedContractor = JSON.parse(
        localStorage.getItem("selectedContractor") || "{}"
      );

      if (savedContractor.id) {
        setProfile(savedContractor);
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

  async function fetchProjects(contractorId) {
    try {
      const response = await fetch(
        `${API_URL}/contractor-projects/${contractorId}`
      );

      const data = await response.json();

      setProjects(data.projects || []);
    } catch (error) {
      console.error(error);
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
        project_title: profile.business_name || t("contractorConversation"),
        project_description: profile.bio || t("messageContractor"),
        location: profile.location || "",
      })
    );

    localStorage.setItem("selectedQuoteRequestId", profile.id);
    localStorage.setItem(
      "selectedMessageReceiverId",
      profile.user_id || profile.id
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

  return (
    <div style={pageWrapper}>
      <button onClick={() => setPage("contractors")} style={backButton}>
        ← {t("backToContractors")}
      </button>

      <div style={heroCard}>
        {profile.image_url || profile.image ? (
          <img
            src={profile.image_url || profile.image}
            alt={profile.business_name}
            style={heroImage}
          />
        ) : (
          <div style={imagePlaceholder}>
            {(profile.business_name || "C").charAt(0).toUpperCase()}
          </div>
        )}

        <h1 style={businessTitle}>{profile.business_name || t("contractor")}</h1>

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
          {profile.bio || t("defaultContractorBio")}
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

        {projects.map((project) => (
          <div key={project.id} style={innerCard}>
            <img
              src={project.image_url}
              alt={project.title}
              style={projectImage}
            />

            <h3 style={innerTitle}>{project.title}</h3>

            <p style={innerText}>{project.description}</p>
          </div>
        ))}
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
            <p style={{ margin: 0 }}>
              {"⭐".repeat(Number(review.rating))}
            </p>

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
  padding: "22px 18px 120px",
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

const heroCard = {
  background: "white",
  borderRadius: "30px",
  padding: "22px",
  marginBottom: "22px",
  textAlign: "center",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const heroImage = {
  width: "100%",
  height: "340px",
  objectFit: "contain",
  background: "#f4f4f4",
  borderRadius: "24px",
  marginBottom: "20px",
  padding: "10px",
  boxSizing: "border-box",
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

export default ContractorDetails;
