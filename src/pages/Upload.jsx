import { useState } from "react";
import BottomNav from "../components/BottomNav";
import API_URL from "../api";

function Upload({ setPage, currentPage }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleImageUpload(file) {
    try {
      setUploading(true);

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

      console.log(data);

      if (data.secure_url) {
        setImageUrl(data.secure_url);
      } else {
        alert("Image upload failed");
      }
    } catch (error) {
      console.error(error);
      alert("Upload error");
    } finally {
      setUploading(false);
    }
  }

  async function handleCreatePost() {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          category,
          location,
          image_url: imageUrl,
        }),
      });

      const data = await response.json();

      console.log(data);

      if (data.post) {
        alert("Post created!");
        setPage("discover");
      } else {
        alert(data.error || "Failed to create post");
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    }
  }

  return (
    <div style={{ padding: 30, paddingBottom: 120 }}>
      <h1>New Request</h1>

      <p>Describe your project or service post.</p>

      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          marginTop: "15px",
          boxSizing: "border-box",
        }}
      />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          marginTop: "15px",
          minHeight: "120px",
          boxSizing: "border-box",
        }}
      />

      <input
        placeholder="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          marginTop: "15px",
          boxSizing: "border-box",
        }}
      />

      <input
        placeholder="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          marginTop: "15px",
          boxSizing: "border-box",
        }}
      />

      <div style={{ marginTop: "20px" }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files[0]) {
              handleImageUpload(e.target.files[0]);
            }
          }}
        />
      </div>

      {uploading && (
        <p style={{ color: "#666", marginTop: "10px" }}>
          Uploading image...
        </p>
      )}

      {imageUrl && (
        <img
          src={imageUrl}
          alt="preview"
          style={{
            width: "100%",
            marginTop: "20px",
            borderRadius: "20px",
          }}
        />
      )}

      <button
        onClick={handleCreatePost}
        style={{
          width: "100%",
          marginTop: "25px",
          padding: "16px",
          border: "none",
          borderRadius: "16px",
          background: "#5b3df5",
          color: "white",
          fontWeight: "bold",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Create Post
      </button>

      <BottomNav
        setPage={setPage}
        currentPage={currentPage}
      />
    </div>
  );
}

export default Upload;
