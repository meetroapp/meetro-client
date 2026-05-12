import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import API_URL from "../api";

function ProjectDetails({ setPage, currentPage }) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      try {
        const postId = localStorage.getItem("selectedPostId");

        const response = await fetch(`${API_URL}/posts/${postId}`);
        const data = await response.json();

        setPost(data.post);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchPost();
  }, []);

  return (
    <div
      style={{
        background: "#f5f5f7",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          padding: "20px",
          paddingBottom: "120px",
        }}
      >
        <button
          onClick={() => setPage("discover")}
          style={{
            border: "none",
            background: "#eee7ff",
            color: "#5b3df5",
            padding: "10px 14px",
            borderRadius: "14px",
            fontWeight: "bold",
            marginBottom: "16px",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>

        {loading && <p>Loading project...</p>}

        {!loading && !post && (
          <div style={cardStyle}>
            <h2>Post not found</h2>
            <p>This project could not be loaded.</p>
          </div>
        )}

        {!loading && post && (
          <div style={cardStyle}>
            <h1
              style={{
                marginTop: 0,
                fontSize: "36px",
                lineHeight: "1.05",
                wordBreak: "break-word",
                textAlign: "center",
                marginBottom: "20px",
              }}
            >
              {post.title}
            </h1>

            {post.image_url && (
              <img
                src={post.image_url}
                alt={post.title}
                style={{
                  width: "100%",
                  maxHeight: "320px",
                  objectFit: "cover",
                  borderRadius: "20px",
                  marginBottom: "20px",
                }}
              />
            )}

            <p
              style={{
                color: "#555",
                lineHeight: "1.6",
                fontSize: "17px",
                textAlign: "center",
              }}
            >
              {post.description || "No description added."}
            </p>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                justifyContent: "center",
                marginTop: "16px",
              }}
            >
              {post.category && (
                <span style={tagStyle}>
                  #{post.category}
                </span>
              )}

              {post.location && (
                <span style={tagStyle}>
                  📍 {post.location}
                </span>
              )}
            </div>

            <p
              style={{
                marginTop: "24px",
                color: "#777",
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              Posted by{" "}
              {post.username ||
                post.email ||
                "Meetro user"}
            </p>

            <button
              onClick={() =>
                alert("Messaging feature coming next")
              }
              style={{
                width: "100%",
                marginTop: "20px",
                padding: "14px 20px",
                background: "#5b3df5",
                color: "white",
                border: "none",
                borderRadius: "14px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Message
            </button>
          </div>
        )}

        <BottomNav
          setPage={setPage}
          currentPage={currentPage}
        />
      </div>
    </div>
  );
}

const cardStyle = {
  background: "white",
  borderRadius: "24px",
  padding: "22px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const tagStyle = {
  background: "#f5f1ff",
  color: "#5b3df5",
  padding: "8px 12px",
  borderRadius: "14px",
  fontSize: "14px",
  fontWeight: "bold",
};

export default ProjectDetails;
