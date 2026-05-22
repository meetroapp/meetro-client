import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import API_URL from "../api";
import { t } from "../utils/language";

function ProjectDetails({ setPage, currentPage }) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      try {
        const postId =
  localStorage.getItem("selectedPostId");

const savedLead =
  localStorage.getItem(
    "selectedQuoteRequest"
  );

if (!postId && savedLead) {
  setPost(JSON.parse(savedLead));
  return;
}

if (!postId) {
  setPost(null);
  return;
}

const response = await fetch(
  `${API_URL}/posts/${postId}`
);

const data = await response.json();

if (data.post) {
  setPost(data.post);
} else if (savedLead) {
  setPost(JSON.parse(savedLead));
} else {
  setPost(null);
}
      } catch (error) {
        console.error(error);
        setPost(null);
      } finally {
        setLoading(false);
      }
    }

    fetchPost();
  }, []);

  return (
    <div style={pageWrapper}>
      <div style={contentWrapper}>
        <button
  onClick={() => {
    const returnPage =
      localStorage.getItem("projectDetailsReturnPage") || "discover";

    setPage(returnPage);
  }}
  style={backButton}
>
          ← {t("back")}
        </button>

        {loading && (
          <div style={cardStyle}>
            <p style={mutedText}>{t("loadingProject")}</p>
          </div>
        )}

        {!loading && !post && (
          <div style={cardStyle}>
            <div style={emptyIcon}>📭</div>

            <h2 style={emptyTitle}>{t("postNotFound")}</h2>

            <p style={mutedText}>{t("projectCouldNotBeLoaded")}</p>
          </div>
        )}

        {!loading && post && (
          <div style={cardStyle}>
            <div style={tagRow}>
              {post.category && <span style={tagStyle}>#{post.category}</span>}

              {post.location && (
                <span style={tagStyle}>📍 {post.location}</span>
              )}
            </div>

            <h1 style={projectTitle}>{post.title}</h1>

            {post.image_url && (
              <img src={post.image_url} alt={post.title} style={projectImage} />
            )}

            <p style={projectDescription}>
              {post.description || t("noDescriptionAdded")}
            </p>

            <div style={infoBox}>
              <div style={infoRow}>
                <span>👤 Client</span>

                <strong>
                  {post.username || post.email || "Meetro user"}
                </strong>
              </div>

              <div style={infoRow}>
                <span>📅 Status</span>

                <strong style={{ color: "#16a34a" }}>{t("openRequest")}</strong>
              </div>

              <div style={infoRow}>
                <span>⚡ Response</span>

                <strong>{t("fastResponse")}</strong>
              </div>
            </div>

            <button
              onClick={() => {
                localStorage.setItem(
                  "selectedQuoteRequest",
                  JSON.stringify(post)
                );

                localStorage.setItem("selectedQuoteRequestId", post.id);

                localStorage.setItem(
                  "selectedMessageReceiverId",
                  post.user_id || ""
                );

                setPage("conversationThread");
              }}
              style={messageButton}
            >
              💬 {t("messages")}
            </button>
          </div>
        )}

        <BottomNav setPage={setPage} currentPage={currentPage} />
      </div>
    </div>
  );
}

const pageWrapper = {
  background:
    "radial-gradient(circle at top left, #eef0ff 0%, transparent 32%), linear-gradient(to bottom, #f7f7fb, #eef0f7)",
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  fontFamily: "Arial",
};

const contentWrapper = {
  width: "100%",
  maxWidth: "430px",
  padding: "20px",
  paddingBottom: "120px",
  boxSizing: "border-box",
};

const backButton = {
  border: "none",
  background: "#eee7ff",
  color: "#5b3df5",
  padding: "10px 16px",
  borderRadius: "16px",
  fontWeight: "900",
  marginBottom: "18px",
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(91,61,245,0.12)",
};

const cardStyle = {
  background: "rgba(255,255,255,0.94)",
  backdropFilter: "blur(18px)",
  borderRadius: "30px",
  padding: "24px",
  color: "#111827",
  textAlign: "center",
  boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
};

const emptyIcon = {
  fontSize: "52px",
  marginBottom: "10px",
};

const emptyTitle = {
  color: "#111827",
  marginTop: 0,
  marginBottom: "10px",
  fontSize: "28px",
};

const mutedText = {
  color: "#555",
  margin: 0,
  lineHeight: "1.6",
  fontWeight: "700",
};

const tagRow = {
  display: "flex",
  justifyContent: "center",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const tagStyle = {
  background: "#f3efff",
  color: "#5b3df5",
  padding: "9px 14px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: "900",
};

const projectTitle = {
  marginTop: 0,
  fontSize: "36px",
  lineHeight: "1.05",
  wordBreak: "break-word",
  textAlign: "center",
  marginBottom: "20px",
  color: "#111827",
  fontWeight: "900",
};

const projectImage = {
  width: "100%",
  maxHeight: "320px",
  objectFit: "cover",
  borderRadius: "22px",
  marginBottom: "22px",
  boxShadow: "0 10px 28px rgba(0,0,0,0.12)",
};

const projectDescription = {
  color: "#555",
  lineHeight: "1.7",
  fontSize: "17px",
  textAlign: "center",
  marginBottom: "24px",
};

const infoBox = {
  background: "#f8f7ff",
  borderRadius: "20px",
  padding: "16px",
  display: "grid",
  gap: "12px",
  marginBottom: "24px",
};

const infoRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  color: "#374151",
  fontSize: "14px",
};

const messageButton = {
  width: "100%",
  marginTop: "6px",
  padding: "16px 20px",
  background: "linear-gradient(135deg, #5b3df5, #7b61ff)",
  color: "white",
  border: "none",
  borderRadius: "18px",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(91,61,245,0.28)",
};

export default ProjectDetails;
