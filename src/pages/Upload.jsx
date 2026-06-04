import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import API_URL from "../api";
import { authFetch } from "../utils/authFetch";
import { getLanguage, t } from "../utils/language";

function Upload({ setPage, currentPage }) {
  const [language, updateLanguage] = useState(getLanguage());

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("handyman");
  const [customCategory, setCustomCategory] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [projectPhotos, setProjectPhotos] = useState([]);
  const [photoRecords, setPhotoRecords] = useState([]);
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
      const files = Array.from(event.target.files || []);

      if (files.length === 0) return;

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

  async function handleCreatePost() {
    try {
      if (!title.trim()) {
        alert(t("enterPostTitle"));
        return;
      }

      setCreating(true);

      const selectedCategory =
        category === "other" ? customCategory.trim() || "other" : category;

      const result = await authFetch(
        "/posts",
        {
          method: "POST",
          body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category: selectedCategory,
          location: location.trim(),
          image_url: projectPhotos[0] || imageUrl,
          post_type: "quote_request",
          status: "open",
          }),
        },
        setPage
      );

      const data = result.data || {};

      if (data.post) {
        const existingRequests = JSON.parse(
          localStorage.getItem("homeownerRequests") || "[]"
        );

        const requestId = String(data.post.id || Date.now());

        const requestRecord = {
          requestId,
          id: requestId,

          title: title.trim(),
          description: description.trim(),

          category: selectedCategory,
          location: location.trim(),

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

          status: "pending",

          projectTimeline: [
            {
              type: "created",
              label: "Project request created",
              createdAt: new Date().toISOString(),
            },
          ],

          viewedByBusinesses: [],
          quotesReceived: [],
          messagesCount: 0,

          selectedProfessional: null,
          invoice: null,
          completionRecord: null,
          review: null,

          createdAt: new Date().toISOString(),
        };

        localStorage.setItem(
          "homeownerRequests",
          JSON.stringify([requestRecord, ...existingRequests])
        );

        alert(t("projectPostedSuccess"));

        setTitle("");
        setDescription("");
        setCategory("handyman");
        setCustomCategory("");
        setLocation("");
        setImageUrl("");
        setProjectPhotos([]);

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
            multiple
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />

          {uploading && <p style={uploadingText}>{t("uploadingImage")}</p>}
        </div>

        {projectPhotos.length > 0 && (
          <div style={previewBox}>
            <div style={photoPreviewStrip}>
              {projectPhotos.map((photo, index) => (
                <div key={photo + index} style={photoPreviewItem}>
                  <img src={photo} alt={t("preview")} style={previewImage} />

                  <div style={photoTagRow}>
                    {["before", "progress", "after"].map((tag) => {
                      const activeRecord = photoRecords.find(
                        (record) => record.url === photo
                      );

                      const isActive = (activeRecord?.tag || "progress") === tag;

                      return (
                        <button
                          key={tag}
                          type="button"
                          style={{
                            ...photoTagButton,
                            ...(isActive ? photoTagButtonActive : {}),
                          }}
                          onClick={() => {
                            setPhotoRecords((current) =>
                              current.map((record) =>
                                record.url === photo
                                  ? { ...record, tag }
                                  : record
                              )
                            );
                          }}
                        >
                          {tag === "before"
                            ? "Before"
                            : tag === "after"
                            ? "After"
                            : "Progress"}
                        </button>
                      );
                    })}
                  </div>

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
              {projectPhotos.length} {projectPhotos.length === 1 ? "photo" : "photos"} added
            </p>
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
  background: "linear-gradient(180deg,#f8f7ff 0%,#eef2ff 100%)",
  minHeight: "100vh",
  padding: "18px 18px 130px",
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
  background: "linear-gradient(135deg,#5b3df5,#8b5cf6)",
  color: "white",
  borderRadius: "26px",
  padding: "24px 22px",
  marginBottom: "14px",
  boxShadow: "0 14px 32px rgba(91,61,245,0.24)",
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
  background: "rgba(255,255,255,.92)",
  border: "1px solid rgba(124,58,237,.10)",
  borderRadius: "20px",
  padding: "14px 16px",
  marginBottom: "14px",
  boxShadow: "0 8px 20px rgba(15,23,42,.04)",
  color: "#111827",
};

const cardStyle = {
  background: "rgba(255,255,255,.96)",
  border: "1px solid rgba(124,58,237,.10)",
  borderRadius: "24px",
  padding: "18px",
  display: "grid",
  gap: "10px",
  boxShadow: "0 12px 28px rgba(15,23,42,.06)",
};

const fieldLabel = {
  fontWeight: "900",
  color: "#111",
  fontSize: "14px",
  marginTop: "4px",
};

const inputStyle = {
  width: "100%",
  padding: "14px 15px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  fontSize: "15px",
  boxSizing: "border-box",
  outline: "none",
  background: "#ffffff",
  color: "#111827",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "112px",
  resize: "none",
};

const uploadBox = {
  border: "1.5px dashed #c4b5fd",
  borderRadius: "22px",
  padding: "22px",
  textAlign: "center",
  background: "linear-gradient(135deg,#faf7ff,#ffffff)",
};

const plusUploadButton = {
  width: "54px",
  height: "54px",
  borderRadius: "18px",
  border: "none",
  background: "linear-gradient(135deg,#5b3df5,#7c3aed)",
  color: "white",
  fontSize: "30px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(91,61,245,.22)",
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

const photoPreviewStrip = {
  display: "flex",
  gap: "12px",
  overflowX: "auto",
  paddingBottom: "6px",
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
  border: "1px solid #e5e7eb",
};

const photoTagRow = {
  display: "flex",
  gap: "5px",
  padding: "7px",
  background: "white",
};

const photoTagButton = {
  flex: 1,
  border: "1px solid #ede9fe",
  background: "#f8f7ff",
  color: "#6b6478",
  borderRadius: "999px",
  padding: "5px 6px",
  fontSize: "10px",
  fontWeight: "900",
  cursor: "pointer",
};

const photoTagButtonActive = {
  background: "#5b3df5",
  color: "white",
  border: "1px solid #5b3df5",
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
  color: "#5b3df5",
  fontWeight: "900",
  fontSize: "13px",
};

const primaryButton = {
  border: "none",
  color: "white",
  padding: "15px",
  borderRadius: "16px",
  fontWeight: "900",
  fontSize: "15px",
};

export default Upload;
