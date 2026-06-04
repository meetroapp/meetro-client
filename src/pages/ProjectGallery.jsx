import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import { authFetch } from "../utils/authFetch";
import { getLanguage, t } from "../utils/language";

function ProjectGallery({ setPage, currentPage }) {
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImages, setEditImages] = useState([]);
  const [activeEditImage, setActiveEditImage] = useState("");
  const [expandedEditImage, setExpandedEditImage] = useState("");
  const [language, updateLanguage] = useState(getLanguage());

  useEffect(() => {
    const handleLanguageChange = () => {
      updateLanguage(getLanguage());
    };

    window.addEventListener(
      "languageChanged",
      handleLanguageChange
    );

    return () => {
      window.removeEventListener(
        "languageChanged",
        handleLanguageChange
      );
    };
  }, []);

  useEffect(() => {
    fetchMyProfileAndProjects();
  }, [language]);

  async function fetchMyProfileAndProjects() {
    try {
      const profileResult = await authFetch(
        "/my-contractor-profile",
        {},
        setPage
      );

      if (!profileResult) return;

      const profileData = profileResult.data;

      if (profileData.profile) {
        setProfile(profileData.profile);

        const projectsResponse = await fetch(
          `http://localhost:3000/contractor-projects/${profileData.profile.id}`
        );

        const projectsData =
          await projectsResponse.json();

        setProjects(
          projectsData.projects || []
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(event) {
    try {
      const selectedFiles = Array.from(event.target.files || []);

      if (selectedFiles.length === 0) return;

      setUploading(true);

      const uploadedUrls = [];

      for (const file of selectedFiles) {
        const formData = new FormData();

        formData.append("file", file);

        formData.append(
          "upload_preset",
          "meetro_uploads"
        );

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
        setImages((currentImages) => [
          ...currentImages,
          ...uploadedUrls,
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

  async function handleCreateProject() {
    try {
      if (
        !title ||
        !description ||
        images.length === 0
      ) {
        alert(t("completeAllFields"));
        return;
      }

      const result = await authFetch(
        "/contractor-projects",
        {
          method: "POST",
          body: JSON.stringify({
            contractor_id: profile.id,
            title,
            description,
            image_url: images[0],
            image_urls: images,
          }),
        },
        setPage
      );

      if (!result) return;

      const data = result.data;

      if (data.project) {
        alert(t("projectAdded"));

        setTitle("");
        setDescription("");
        setImages([]);

        await fetchMyProfileAndProjects();
      }
    } catch (error) {
      console.error(error);
      alert(t("serverError"));
    }
  }

  async function handleEditImageUpload(event) {
    try {
      const selectedFiles = Array.from(event.target.files || []);

      if (selectedFiles.length === 0) return;

      setUploading(true);

      const uploadedUrls = [];

      for (const file of selectedFiles) {
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
        setEditImages((currentImages) => [
          ...currentImages,
          ...uploadedUrls,
        ]);
      }
    } catch (error) {
      console.error(error);
      alert(t("uploadError"));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleSaveProjectEdit() {
    if (!editingProject) return;

    try {
      const result = await authFetch(
        `/contractor-projects/${editingProject.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            title: editTitle,
            description: editDescription,
            image_url: editImages[0] || "",
            image_urls: editImages,
          }),
        },
        setPage
      );

      if (!result || !result.response?.ok) {
        alert(language === "es" ? "No se pudo guardar el portafolio." : "Portfolio changes could not be saved.");
        return;
      }

      const updatedProject = result.data?.project || {
        ...editingProject,
        title: editTitle,
        description: editDescription,
        image_url: editImages[0] || "",
        image_urls: editImages,
      };

      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id === editingProject.id ? updatedProject : project
        )
      );

      setEditingProject(null);
      setEditTitle("");
      setEditDescription("");
      setEditImages([]);
    setActiveEditImage("");
    setExpandedEditImage("");

      await fetchMyProfileAndProjects();
    } catch (error) {
      console.error(error);
      alert(language === "es" ? "Error guardando el portafolio." : "Error saving portfolio.");
    }
  }

  function getProjectImages(project) {
    if (Array.isArray(project?.image_urls) && project.image_urls.length > 0) {
      return project.image_urls.filter(Boolean);
    }

    if (typeof project?.image_urls === "string") {
      try {
        const parsedImages = JSON.parse(project.image_urls);
        if (Array.isArray(parsedImages)) {
          return parsedImages.filter(Boolean);
        }
      } catch {}
    }

    return project?.image_url ? [project.image_url] : [];
  }

  if (loading) {
    return (
      <LoadingScreen
        text={t("loadingProjectGallery")}
      />
    );
  }

  if (editingProject) {

    return (
      <div style={pageWrapper}>
        <button
          style={backButton}
          onClick={() => setEditingProject(null)}
        >
          ← {language === "es" ? "Volver al portafolio" : "Back to Portfolio"}
        </button>

        <div style={editPageCard}>
          <h1 style={editPageTitle}>
            {language === "es" ? "Editar portafolio" : "Edit Portfolio Item"}
          </h1>

          <p style={editPageSubtitle}>
            {language === "es"
              ? "Actualiza la información visible para clientes."
              : "Update the information customers will see."}
          </p>

          <div style={editPhotoHeader}>
            <strong>
              {language === "es" ? "Fotos del portafolio" : "Portfolio Photos"}
            </strong>

            <button
              style={smallAddPhotoBtn}
              onClick={() =>
                document.getElementById("editPortfolioImageInput").click()
              }
            >
              + {language === "es" ? "Agregar fotos" : "Add Photos"}
            </button>
          </div>

          <input
            id="editPortfolioImageInput"
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={handleEditImageUpload}
          />

          {editImages.length > 0 ? (
            <>
              <img
                src={activeEditImage || editImages[0]}
                alt={editTitle || "Portfolio preview"}
                style={editMainImage}
                onClick={() =>
                  setExpandedEditImage(
                    activeEditImage || editImages[0]
                  )
                }
              />

              <div style={editImagesGrid}>
                {editImages.map((url, index) => (
                  <div key={`${editingProject.id}-edit-${index}`} style={editImageTile}>
                    <img
                      src={url}
                      alt={`Portfolio ${index + 1}`}
                      style={{
                        ...editImage,
                        ...((activeEditImage || editImages[0]) === url
                          ? activeEditThumbnail
                          : {}),
                      }}
                      onClick={() => setActiveEditImage(url)}
                    />

                    <button
                      style={deletePhotoBtn}
                      onClick={() => {
                        setEditImages((currentImages) => {
                          const nextImages = currentImages.filter((image) => image !== url);

                          if ((activeEditImage || currentImages[0]) === url) {
                            setActiveEditImage(nextImages[0] || "");
                          }

                          return nextImages;
                        });
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={emptyEditPhotos}>
              {language === "es"
                ? "No hay fotos en este portafolio."
                : "No photos in this portfolio item."}
            </div>
          )}

          {uploading && (
            <p style={uploadingText}>
              {language === "es" ? "Subiendo fotos..." : "Uploading photos..."}
            </p>
          )}

          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder={t("projectTitle")}
            style={inputStyle}
          />

          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder={t("projectDescription")}
            style={{
              ...inputStyle,
              minHeight: "150px",
              resize: "none",
            }}
          />

          <button
            style={publishButton}
            onClick={handleSaveProjectEdit}
          >
            {language === "es" ? "Guardar cambios" : "Save Changes"}
          </button>
        </div>

        {expandedEditImage && (
          <div
            style={imagePreviewOverlay}
            onClick={() => setExpandedEditImage("")}
          >
            <button style={closePreviewBtn}>×</button>

            <img
              src={expandedEditImage}
              alt="Expanded portfolio preview"
              style={expandedPreviewImage}
            />
          </div>
        )}

        <BottomNav setPage={setPage} currentPage="profile" />
      </div>
    );
  }

  return (
    <div style={pageWrapper}>
      <button
        onClick={() =>
          setPage("businessDashboard")
        }
        style={backButton}
      >
        ← {t("backToDashboard")}
      </button>

      <div style={heroCard}>
        <div style={heroBadge}>
          📸 Portfolio Pro
        </div>

        <h1 style={heroTitle}>
          {t("projectGallery")}
        </h1>

        <p style={heroSubtitle}>
          {t("projectGallerySubtitle")}
        </p>

        <div style={statsGrid}>
          <div style={statCard}>
            <div style={statNumber}>
              {projects.length}
            </div>

            <div style={statLabel}>
              {t("projects")}
            </div>
          </div>

          <div style={statCard}>
            <div style={statNumber}>
              92%
            </div>

            <div style={statLabel}>
              {t("profile")}
            </div>
          </div>

          <div style={statCard}>
            <div style={statNumber}>
              ⭐
            </div>

            <div style={statLabel}>
              Premium
            </div>
          </div>
        </div>
      </div>

      {!profile && (
        <div style={cardStyle}>
          <h2 style={emptyTitle}>
            {t("noContractorProfileFound")}
          </h2>

          <p style={emptyText}>
            {t("createContractorProfileFirst")}
          </p>

          <button
            onClick={() =>
              setPage("contractorProfile")
            }
            style={primaryButton}
          >
            {t("createContractorProfile")}
          </button>
        </div>
      )}

      {profile && (
        <>
          <div style={uploadCard}>
            <div style={sectionHeader}>
              <h2 style={sectionTitle}>
                ✨ Agregar Proyecto
              </h2>

              <div style={sectionChip}>
                Antes / Después
              </div>
            </div>

            <input
              placeholder={t("projectTitle")}
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              style={inputStyle}
            />

            <textarea
              placeholder={t(
                "projectDescription"
              )}
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              style={{
                ...inputStyle,
                minHeight: "120px",
                resize: "none",
              }}
            />

            <div style={uploadZone}>
              <input
                id="projectImageInput"
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={handleImageUpload}
              />

              <button
                onClick={() =>
                  document
                    .getElementById(
                      "projectImageInput"
                    )
                    .click()
                }
                style={uploadButton}
              >
                +
              </button>

              <h3 style={uploadTitle}>
                {images.length > 0
                  ? `${images.length} ${language === "es" ? "fotos listas" : "photos ready"}`
                  : language === "es"
                  ? "Subir fotos"
                  : "Upload Photos"}
              </h3>

              <p style={uploadText}>
                Muestra tu mejor trabajo
                profesional
              </p>

              {uploading && (
                <p style={uploadingText}>
                  Subiendo imagen...
                </p>
              )}
            </div>

            {images.length > 0 && (
              <div style={previewGrid}>
                {images.map((url, index) => (
                  <div key={url} style={previewTile}>
                    <img
                      src={url}
                      alt={`Portfolio preview ${index + 1}`}
                      style={previewImage}
                    />

                    <button
                      style={removePreviewBtn}
                      onClick={() =>
                        setImages((currentImages) =>
                          currentImages.filter((image) => image !== url)
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleCreateProject}
              style={publishButton}
            >
              🚀 Publicar Proyecto
            </button>
          </div>

          <div style={{ marginTop: "30px" }}>
            <div style={projectsHeader}>
              <h2 style={galleryTitle}>
                Tus Proyectos
              </h2>

              <div style={projectCount}>
                {projects.length} Total
              </div>
            </div>

            {projects.length === 0 && (
              <div style={emptyProjectsCard}>
                <div style={emptyIcon}>
                  🖼️
                </div>

                <h3 style={emptyProjectsTitle}>
                  Tu portafolio está vacío
                </h3>

                <p style={emptyProjectsText}>
                  Sube proyectos para generar
                  más confianza y clientes.
                </p>
              </div>
            )}

            {projects.map((project) => {
              const projectImages = getProjectImages(project);
              const coverImage = projectImages[0];

              return (
                <div
                  key={project.id}
                  style={projectCard}
                >
                  {coverImage && (
                    <div style={coverImageWrap}>
                      <img
                        src={coverImage}
                        alt={project.title}
                        style={coverImageStyle}
                      />

                      {projectImages.length > 1 && (
                        <span style={photoCountBadge}>
                          +{projectImages.length - 1} photos
                        </span>
                      )}
                    </div>
                  )}

                  <div style={projectContent}>
                    <div style={projectTag}>
                      {language === "es" ? "Portafolio" : "Portfolio"}
                    </div>

                    <h3 style={projectTitle}>
                      {project.title}
                    </h3>

                    <p style={projectDescriptionStyle}>
                      {project.description}
                    </p>

                    <button
                      style={editPortfolioBtn}
                      onClick={() => {
                        setEditingProject(project);
                        setEditTitle(project.title || "");
                        setEditDescription(project.description || "");
                        const projectImages = getProjectImages(project);
                        setEditImages(projectImages);
                        setActiveEditImage(projectImages[0] || "");
                      }}
                    >
                      {language === "es" ? "Editar portafolio" : "Edit Portfolio"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <BottomNav setPage={setPage} currentPage="projectGallery" />
     
    </div>
  );
}

const pageWrapper = {
  background: "#f5f5f7",
  minHeight: "100vh",
  padding: "22px 18px 120px",
  boxSizing: "border-box",
};

const backButton = {
  border: "none",
  background: "#eee7ff",
  color: "#5b3df5",
  padding: "12px 18px",
  borderRadius: "18px",
  fontWeight: "800",
  marginBottom: "20px",
  cursor: "pointer",
};

const heroCard = {
  background:
    "linear-gradient(135deg,#111827 0%,#1e293b 58%,#312e81 100%)",
  borderRadius: "34px",
  padding: "34px 24px",
  color: "white",
  marginBottom: "24px",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow:
    "0 16px 38px rgba(15,23,42,0.22)",
};

const heroBadge = {
  background: "white",
  color: "#5b3df5",
  display: "inline-block",
  padding: "8px 14px",
  borderRadius: "999px",
  fontWeight: "800",
  marginBottom: "20px",
  boxShadow: "0 8px 18px rgba(91,61,245,0.10)",
};

const heroTitle = {
  fontSize: "44px",
  margin: 0,
  lineHeight: 1,
  color: "white",
  textShadow: "0 2px 10px rgba(0,0,0,0.22)",
};

const heroSubtitle = {
  color: "rgba(255,255,255,0.78)",
  marginTop: "16px",
  lineHeight: 1.6,
  fontSize: "17px",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, 1fr)",
  gap: "10px",
  marginTop: "22px",
};

const statCard = {
  background: "rgba(255,255,255,0.10)",
  borderRadius: "18px",
  padding: "12px 8px",
  textAlign: "center",
  backdropFilter: "blur(10px)",
};

const statNumber = {
  fontSize: "23px",
  fontWeight: "900",
};

const statLabel = {
  marginTop: "4px",
  opacity: 0.82,
  fontSize: "12px",
};

const uploadCard = {
  background: "white",
  borderRadius: "30px",
  padding: "24px",
  boxShadow:
    "0 12px 28px rgba(0,0,0,0.06)",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "18px",
};

  const sectionTitle = {
  margin: 0,
  fontSize: "28px",
  color: "#111827",
  fontWeight: "900",
};

const sectionChip = {
  background: "#f1edff",
  color: "#5b3df5",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "700",
  fontSize: "12px",
};

const inputStyle = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid #e4e4e7",
  marginBottom: "16px",
  fontSize: "16px",
  boxSizing: "border-box",
  color: "#111827",
  background: "white",
};

const uploadZone = {
  border:
    "2px dashed rgba(91,61,245,0.24)",
  borderRadius: "26px",
  padding: "36px 20px",
  textAlign: "center",
  background:
    "linear-gradient(to bottom,#faf8ff,#f6f3ff)",
};

const uploadButton = {
  width: "78px",
  height: "78px",
  borderRadius: "50%",
  border: "none",
  background:
    "linear-gradient(135deg,#5b3df5,#7b61ff)",
  color: "white",
  fontSize: "42px",
  cursor: "pointer",
  fontWeight: "bold",
};

const uploadTitle = {
  marginTop: "18px",
  marginBottom: "8px",
};

const uploadText = {
  color: "#666",
};

const uploadingText = {
  color: "#5b3df5",
  fontWeight: "800",
  marginTop: "14px",
};

const previewGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "10px",
  marginTop: "16px",
};

const previewTile = {
  position: "relative",
  borderRadius: "18px",
  overflow: "hidden",
  background: "#e5e7eb",
  minHeight: "96px",
};

const removePreviewBtn = {
  position: "absolute",
  top: "8px",
  right: "8px",
  width: "28px",
  height: "28px",
  borderRadius: "999px",
  border: "none",
  background: "rgba(15,23,42,0.76)",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const previewImage = {
  width: "100%",
  borderRadius: "24px",
  marginTop: "20px",
};

const publishButton = {
  width: "100%",
  marginTop: "22px",
  padding: "18px",
  border: "none",
  borderRadius: "20px",
  background:
    "linear-gradient(135deg,#5b3df5,#7b61ff)",
  color: "white",
  fontWeight: "900",
  fontSize: "17px",
  cursor: "pointer",
};

const projectsHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "18px",
};

const galleryTitle = {
  fontSize: "32px",
  margin: 0,
};

const projectCount = {
  background: "#ebe7ff",
  color: "#5b3df5",
  padding: "10px 14px",
  borderRadius: "999px",
  fontWeight: "800",
};

const emptyProjectsCard = {
  background: "white",
  borderRadius: "28px",
  padding: "40px 24px",
  textAlign: "center",
};

const emptyIcon = {
  fontSize: "54px",
};

const emptyProjectsTitle = {
  marginTop: "16px",
};

const emptyProjectsText = {
  color: "#666",
  lineHeight: 1.6,
};

const projectCard = {
  background: "white",
  borderRadius: "28px",
  overflow: "hidden",
  marginBottom: "22px",
  boxShadow:
    "0 12px 30px rgba(0,0,0,0.06)",
};

const editPageCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
};

const editPageTitle = {
  margin: 0,
  fontSize: "30px",
  fontWeight: "950",
  color: "#111827",
};

const editPageSubtitle = {
  margin: "8px 0 18px",
  color: "#64748b",
  lineHeight: 1.5,
};

const editPhotoHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "12px",
};

const smallAddPhotoBtn = {
  border: "none",
  background: "#ede9fe",
  color: "#5b3df5",
  padding: "10px 12px",
  borderRadius: "14px",
  fontWeight: "900",
  cursor: "pointer",
};

const editImageTile = {
  position: "relative",
};

const deletePhotoBtn = {
  position: "absolute",
  top: "8px",
  right: "8px",
  width: "30px",
  height: "30px",
  borderRadius: "999px",
  border: "none",
  background: "rgba(15,23,42,0.78)",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const emptyEditPhotos = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: "18px",
  padding: "18px",
  marginBottom: "18px",
  color: "#64748b",
  fontWeight: "700",
};

const imagePreviewOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.92)",
  zIndex: 3000,
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

const editMainImage = {
  width: "100%",
  height: "260px",
  objectFit: "cover",
  borderRadius: "22px",
  background: "#f1f5f9",
  marginBottom: "12px",
};

const activeEditThumbnail = {
  border: "3px solid #5b3df5",
};

const editImagesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "10px",
  marginBottom: "18px",
};

const editImage = {
  width: "100%",
  height: "150px",
  borderRadius: "18px",
  objectFit: "cover",
};

const coverImageWrap = {
  position: "relative",
  width: "100%",
  height: "250px",
  overflow: "hidden",
  borderRadius: "28px 28px 0 0",
  background: "#f1f5f9",
};

const coverImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const photoCountBadge = {
  position: "absolute",
  right: "14px",
  bottom: "14px",
  background: "rgba(15,23,42,0.72)",
  color: "white",
  padding: "8px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
  backdropFilter: "blur(10px)",
};

const portfolioActions = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "16px",
};

const openPortfolioBtn = {
  border: "none",
  background: "linear-gradient(135deg,#7c5cff,#5b3df5)",
  color: "white",
  padding: "13px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const editPortfolioBtn = {
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

const projectImageGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "6px",
  padding: "10px",
};

const projectImage = {
  width: "100%",
  height: "260px",
  objectFit: "cover",
};

const projectContent = {
  padding: "20px",
};

const projectTag = {
  background: "transparent",
  color: "#64748b",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "0",
  borderRadius: "0",
  fontWeight: "800",
  fontSize: "12px",
  marginBottom: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
};

const projectTitle = {
  fontSize: "24px",
  marginBottom: "12px",
};

const projectDescriptionStyle = {
  color: "#666",
  lineHeight: 1.7,
};

const cardStyle = {
  background: "white",
  borderRadius: "24px",
  padding: "24px",
};

const emptyTitle = {
  marginTop: 0,
};

const emptyText = {
  color: "#666",
  lineHeight: 1.6,
};

const primaryButton = {
  width: "100%",
  padding: "16px",
  border: "none",
  borderRadius: "18px",
  background: "#5b3df5",
  color: "white",
  fontWeight: "800",
  fontSize: "16px",
  marginTop: "18px",
  cursor: "pointer",
};

export default ProjectGallery;
