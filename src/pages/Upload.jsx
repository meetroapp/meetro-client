import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import API_URL from "../api";
import { getLanguage, t } from "../utils/language";

function Upload({ setPage, currentPage }) {
  const [language, updateLanguage] = useState(getLanguage());

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("handyman");
  const [customCategory, setCustomCategory] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);

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
    { value: "homeHealthCare", label: t("homeHealthCare") },
    { value: "automotiveServices", label: t("automotiveServices") },
    { value: "carDetailing", label: t("carDetailing") },
    { value: "mobileServices", label: t("mobileServices") },
    { value: "mechanic", label: t("mechanic") },
    { value: "privateTransportation", label: t("privateTransportation") },
    { value: "other", label: t("otherService") },
  ];

  async function handleImageUpload(event) {
    try {
      const file = event.target.files[0];

      if (!file) return;

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

      if (data.secure_url) {
        setImageUrl(data.secure_url);
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

  async function handleCreatePost() {
    try {
      if (!title.trim()) {
        alert(t("enterPostTitle"));
        return;
      }

      setCreating(true);

      const token = localStorage.getItem("token");

      const selectedCategory =
        category === "other" ? customCategory.trim() || "other" : category;

      const response = await fetch(`${API_URL}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category: selectedCategory,
          location: location.trim(),
          image_url: imageUrl,
          post_type: "quote_request",
          status: "open",
        }),
      });

      const data = await response.json();

      if (data.post) {
        alert(t("projectPostedSuccess"));

        setTitle("");
        setDescription("");
        setCategory("handyman");
        setCustomCategory("");
        setLocation("");
        setImageUrl("");

        setPage("discover");
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

  return (
    <div style={pageWrapper}>
      <button onClick={() => setPage("home")} style={backButton}>
        ← {t("backToHome")}
      </button>

      <div style={heroCard}>
        <p style={eyebrow}>{t("requestHelp")}</p>

        <h1 style={pageTitle}>{t("newProject")}</h1>

        <p style={pageSubtitle}>{t("newProjectSubtitle")}</p>
      </div>

      <div style={tipCard}>
        <strong>💡 {t("uploadTipTitle")}</strong>
        <p>{t("uploadTipText")}</p>
      </div>

      <div style={cardStyle}>
        <label style={fieldLabel}>{t("projectTitle")}</label>
        <input
          placeholder={t("projectTitlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />

        <label style={fieldLabel}>{t("projectDescription")}</label>
        <textarea
          placeholder={t("projectDescriptionPlaceholder")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={textareaStyle}
        />

        <label style={fieldLabel}>{t("categoryExample")}</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={inputStyle}
        >
          {categories.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

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

        <label style={fieldLabel}>{t("location")}</label>
        <input
          placeholder={t("locationExample")}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={inputStyle}
        />

        <div style={uploadBox}>
          <button
            onClick={() =>
              document.getElementById("postImageInput").click()
            }
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
            id="postImageInput"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />

          {uploading && <p style={uploadingText}>{t("uploadingImage")}</p>}
        </div>

        {imageUrl && (
          <div style={previewBox}>
            <img src={imageUrl} alt={t("preview")} style={previewImage} />

            <button onClick={() => setImageUrl("")} style={removeButton}>
              {t("removeImage")}
            </button>
          </div>
        )}

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
      </div>

      <BottomNav setPage={setPage} currentPage="upload" />
    </div>
  );
}

const pageWrapper = {
  background: "linear-gradient(to bottom, #f7f7fb 0%, #f2f3f8 100%)",
  minHeight: "100vh",
  padding: "24px 18px 130px",
  boxSizing: "border-box",
};

const backButton = {
  border: "none",
  background: "transparent",
  color: "#5b3df5",
  fontWeight: "bold",
  fontSize: "16px",
  marginBottom: "18px",
  cursor: "pointer",
};

const heroCard = {
  background: "linear-gradient(135deg, #5b3df5 0%, #8b5cf6 100%)",
  color: "white",
  borderRadius: "32px",
  padding: "30px 24px",
  marginBottom: "18px",
  boxShadow: "0 18px 40px rgba(91,61,245,0.28)",
};

const eyebrow = {
  margin: 0,
  opacity: 0.9,
  fontWeight: "900",
};

const pageTitle = {
  margin: "12px 0",
  fontSize: "38px",
  color: "white",
  lineHeight: 1.1,
};

const pageSubtitle = {
  margin: 0,
  color: "white",
  lineHeight: 1.6,
  opacity: 0.95,
};

const tipCard = {
  background: "white",
  borderRadius: "24px",
  padding: "18px",
  marginBottom: "18px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
  color: "#111",
};

const cardStyle = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  display: "grid",
  gap: "12px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const fieldLabel = {
  fontWeight: "900",
  color: "#111",
  fontSize: "14px",
  marginTop: "4px",
};

const inputStyle = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid #ddd",
  fontSize: "16px",
  boxSizing: "border-box",
  outline: "none",
  background: "white",
  color: "#111",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "130px",
  resize: "none",
};

const uploadBox = {
  border: "2px dashed #d9d4ff",
  borderRadius: "24px",
  padding: "26px",
  textAlign: "center",
  background: "#faf9ff",
};

const plusUploadButton = {
  width: "64px",
  height: "64px",
  borderRadius: "20px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontSize: "34px",
  fontWeight: "bold",
  cursor: "pointer",
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
};

const previewImage = {
  width: "100%",
  borderRadius: "22px",
  objectFit: "cover",
  maxHeight: "300px",
};

const removeButton = {
  border: "none",
  background: "#ffefef",
  color: "#d11",
  padding: "14px",
  borderRadius: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const primaryButton = {
  border: "none",
  color: "white",
  padding: "16px",
  borderRadius: "18px",
  fontWeight: "bold",
  fontSize: "16px",
};

export default Upload;
