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
  const [imageUrl, setImageUrl] = useState("");

  const [uploading, setUploading] = useState(false);
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
      const file = event.target.files[0];

      if (!file) return;

      setUploading(true);

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

  async function handleCreateProject() {
    try {
      if (
        !title ||
        !description ||
        !imageUrl
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
            image_url: imageUrl,
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
        setImageUrl("");

        await fetchMyProfileAndProjects();
      }
    } catch (error) {
      console.error(error);
      alert(t("serverError"));
    }
  }

  if (loading) {
    return (
      <LoadingScreen
        text={t("loadingProjectGallery")}
      />
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
              Proyectos
            </div>
          </div>

          <div style={statCard}>
            <div style={statNumber}>
              92%
            </div>

            <div style={statLabel}>
              Perfil
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
                {imageUrl
                  ? "Imagen lista"
                  : "Subir Proyecto"}
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

            {imageUrl && (
              <img
                src={imageUrl}
                alt="Preview"
                style={previewImage}
              />
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

            {projects.map((project) => (
              <div
                key={project.id}
                style={projectCard}
              >
                <img
                  src={project.image_url}
                  alt={project.title}
                  style={projectImage}
                />

                <div style={projectContent}>
                  <div style={projectTag}>
                    Proyecto Verificado
                  </div>

                  <h3 style={projectTitle}>
                    {project.title}
                  </h3>

                  <p
                    style={
                      projectDescriptionStyle
                    }
                  >
                    {project.description}
                  </p>
                </div>
              </div>
            ))}
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
    "linear-gradient(135deg,#0f1d63 0%,#5b3df5 100%)",
  borderRadius: "34px",
  padding: "34px 24px",
  color: "white",
  marginBottom: "24px",
  boxShadow:
    "0 18px 40px rgba(91,61,245,0.30)",
};

const heroBadge = {
  background: "rgba(255,255,255,0.14)",
  display: "inline-block",
  padding: "8px 14px",
  borderRadius: "999px",
  fontWeight: "700",
  marginBottom: "20px",
};

const heroTitle = {
  fontSize: "44px",
  margin: 0,
  lineHeight: 1,
};

const heroSubtitle = {
  opacity: 0.9,
  marginTop: "16px",
  lineHeight: 1.6,
  fontSize: "17px",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, 1fr)",
  gap: "14px",
  marginTop: "26px",
};

const statCard = {
  background: "rgba(255,255,255,0.12)",
  borderRadius: "22px",
  padding: "18px",
  textAlign: "center",
};

const statNumber = {
  fontSize: "28px",
  fontWeight: "900",
};

const statLabel = {
  marginTop: "6px",
  opacity: 0.85,
  fontSize: "14px",
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

const projectImage = {
  width: "100%",
  height: "260px",
  objectFit: "cover",
};

const projectContent = {
  padding: "20px",
};

const projectTag = {
  background: "#f1edff",
  color: "#5b3df5",
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "800",
  fontSize: "12px",
  marginBottom: "12px",
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
