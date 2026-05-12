import { useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import API_URL from "../api";

function Discover({ setPage, currentPage }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await fetch(`${API_URL}/posts`);
        const data = await response.json();

        setPosts(data.posts || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  const categories = useMemo(() => {
    const allCategories = posts
      .map((post) => post.category)
      .filter(Boolean);

    return ["All", ...new Set(allCategories)];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesCategory =
        selectedCategory === "All" || post.category === selectedCategory;

      const text = `
        ${post.title}
        ${post.description}
        ${post.location}
        ${post.category}
      `.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [posts, selectedCategory, search]);

  return (
    <div
      style={{
        backgroundColor: "#f5f5f7",
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
        <h1
          style={{
            fontSize: "36px",
            marginBottom: "8px",
          }}
        >
          Discover
        </h1>

        <p
          style={{
            fontSize: "18px",
            color: "#666",
            marginBottom: "20px",
          }}
        >
          Real local posts from Meetro users.
        </p>

        <input
          placeholder="Search posts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "18px",
            border: "1px solid #ddd",
            marginBottom: "18px",
            boxSizing: "border-box",
            fontSize: "16px",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: "10px",
            overflowX: "auto",
            marginBottom: "20px",
            paddingBottom: "4px",
          }}
        >
          {categories.map((category) => {
            const active = selectedCategory === category;

            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{
                  border: "none",
                  padding: "10px 16px",
                  borderRadius: "999px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  background: active ? "#5b3df5" : "white",
                  color: active ? "white" : "#444",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                }}
              >
                {category}
              </button>
            );
          })}
        </div>

        {loading && <p>Loading posts...</p>}

        {!loading && filteredPosts.length === 0 && (
          <div
            style={{
              background: "white",
              borderRadius: "22px",
              padding: "20px",
              boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
            }}
          >
            <h3>No matching posts</h3>

            <p style={{ color: "#666" }}>
              Try another search or category.
            </p>
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} setPage={setPage} />
          ))}
        </div>

        <BottomNav setPage={setPage} currentPage={currentPage} />
      </div>
    </div>
  );
}

function PostCard({ post, setPage }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "22px",
        padding: "18px",
        boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
      }}
    >
      <h3
        style={{
          margin: "0 0 8px",
          fontSize: "22px",
        }}
      >
        {post.title}
      </h3>

      {post.image_url && (
        <img
          src={post.image_url}
          alt={post.title}
          style={{
            width: "100%",
            height: "220px",
            objectFit: "cover",
            borderRadius: "18px",
            marginBottom: "14px",
          }}
        />
      )}

      <p
        style={{
          margin: "0 0 12px",
          color: "#555",
          fontSize: "15px",
          lineHeight: "1.5",
        }}
      >
        {post.description || "No description added."}
      </p>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        {post.category && <span style={tagStyle}>#{post.category}</span>}

        {post.location && <span style={tagStyle}>📍 {post.location}</span>}
      </div>

      <p
        style={{
          margin: 0,
          color: "#777",
          fontSize: "13px",
        }}
      >
        Posted by {post.username || post.email || "Meetro user"}
      </p>

      <button
        onClick={() => {
          localStorage.setItem("selectedPostId", post.id);
          setPage("projectDetails");
        }}
        style={{
          marginTop: "14px",
          padding: "12px 18px",
          background: "#5b3df5",
          color: "white",
          border: "none",
          borderRadius: "14px",
          fontWeight: "bold",
          cursor: "pointer",
          width: "100%",
        }}
      >
        View Details
      </button>
    </div>
  );
}

const tagStyle = {
  background: "#f5f1ff",
  color: "#5b3df5",
  padding: "8px 12px",
  borderRadius: "14px",
  fontSize: "14px",
  fontWeight: "bold",
};

export default Discover;
