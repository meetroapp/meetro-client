import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import MeetroIcon from "../components/MeetroIcon";
import {
  PortfolioProjectCard,
  PortfolioProjectGrid,
  PortfolioProjectView,
} from "../components/PortfolioProjectPresentation";
import API_URL from "../api";
import { authFetch } from "../utils/authFetch";
import {
  createExpectedVersionPayload,
  createPortfolioPrivacyConfirmation,
  createPortfolioReorderPayload,
  getCanonicalPortfolioCounts,
  getPortfolioStatePresentation,
  getReorderablePortfolioProjects,
  isPortfolioActionAllowed,
  isPortfolioVersionConflict,
  movePortfolioProject,
  PORTFOLIO_PUBLICATION_STATE,
} from "../utils/businessPortfolioAuthority";
import { getBusinessIdentityProjection } from "../utils/businessIdentity";
import {
  CAMERA_PERMISSION_MESSAGE,
  openJobPhotoPicker,
} from "../utils/cameraPhotoPicker";
import { getLanguage, t } from "../utils/language";
import {
  getMediaDeferredCopy,
  getMediaDeferredNotice,
} from "../utils/mediaDeferral";
import {
  cleanupBusinessPortfolioMedia,
  createBusinessPortfolioPreview,
  getBusinessPortfolioEditorMedia,
  isBusinessPortfolioMediaEnabled,
  reorderBusinessPortfolioMedia,
  toBusinessPortfolioPersistenceItem,
  uploadBusinessPortfolioFiles,
  validateBusinessPortfolioFiles,
} from "../utils/businessPortfolioMedia";

const PORTFOLIO_PHOTO_ERROR = Object.freeze({
  en: "Choose JPG, PNG, or WebP photos under 10 MB. A project can contain up to 12 photos.",
  es: "Elige fotos JPG, PNG o WebP de menos de 10 MB. Un proyecto admite hasta 12 fotos.",
  fr: "Choisissez des photos JPG, PNG ou WebP de moins de 10 Mo, avec un maximum de 12 photos.",
  pt: "Escolha fotos JPG, PNG ou WebP com menos de 10 MB, até 12 fotos por projeto.",
});

const PRIVACY_ITEMS = Object.freeze([
  "customer identity",
  "exact customer or property address",
  "private communications",
  "pricing, commercial terms, invoices, or payments",
  "private findings or workflow records",
  "unauthorized job media",
  "other customer-identifying information",
]);

function ProjectGallery({ setPage }) {
  const sharedReturnPage = localStorage.getItem("meetroSharedPageReturn") || "";
  const isBusinessToolsReturn = sharedReturnPage === "businessCommandCenter";
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [workspaceNotice, setWorkspaceNotice] = useState(null);
  const [pendingOperation, setPendingOperation] = useState("");
  const [workspaceMode, setWorkspaceMode] = useState("portfolio");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectViewReturnMode, setProjectViewReturnMode] = useState("portfolio");
  const [businessReviewStats, setBusinessReviewStats] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [creatingProject, setCreatingProject] = useState(false);
  const projectImageInputRef = useRef(null);

  const [editingProject, setEditingProject] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImages, setEditImages] = useState([]);
  const [activeEditImage, setActiveEditImage] = useState("");
  const [expandedEditImage, setExpandedEditImage] = useState("");
  const [publishedEditPrivacyConfirmed, setPublishedEditPrivacyConfirmed] =
    useState(false);
  const editPortfolioImageInputRef = useRef(null);

  const [publishingProject, setPublishingProject] = useState(null);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [language, updateLanguage] = useState(getLanguage());
  const portfolioEditorScrollRef = useRef(null);
  const portfolioMediaEnabled = isBusinessPortfolioMediaEnabled();
  const mediaUploadDeferred = !portfolioMediaEnabled;
  const mediaDeferredCopy = getMediaDeferredCopy(language);
  const busy = Boolean(pendingOperation || loadError);

  useEffect(() => {
    const handleLanguageChange = () => updateLanguage(getLanguage());
    window.addEventListener("languageChanged", handleLanguageChange);
    return () => window.removeEventListener("languageChanged", handleLanguageChange);
  }, []);

  useEffect(() => {
    fetchMyProfileAndProjects({ initial: true });
    // The loader intentionally reruns only when the active language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    if ((!editingProject && !creatingProject && !publishingProject) || typeof window === "undefined") {
      return undefined;
    }

    portfolioEditorScrollRef.current = {
      x: window.scrollX || window.pageXOffset || 0,
      y: window.scrollY || window.pageYOffset || 0,
    };

    return () => {
      const scrollPosition = portfolioEditorScrollRef.current;
      if (scrollPosition) window.scrollTo(scrollPosition.x, scrollPosition.y);
    };
  }, [editingProject, creatingProject, publishingProject]);

  async function fetchCanonicalProjects() {
    const projectsResult = await authFetch(
      "/my-contractor-projects",
      { cache: "no-store" },
      setPage
    );
    if (
      !projectsResult?.response?.ok ||
      projectsResult?.data?.success !== true ||
      projectsResult?.data?.code !== "BUSINESS_PORTFOLIO_LOADED" ||
      !Array.isArray(projectsResult?.data?.projects)
    ) {
      throw new Error("portfolio_owner_contract_unavailable");
    }
    setProjects(projectsResult.data.projects);
    setLoadError("");
    return projectsResult.data.projects;
  }

  async function fetchBusinessReviewStats(contractorId) {
    if (!contractorId) {
      setBusinessReviewStats(null);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/reviews/${contractorId}`, {
        cache: "no-store",
      });
      const data = await response.json();
      const reviewCount = Number(data?.stats?.total_reviews || 0);
      const averageRating = Number(data?.stats?.average_rating || 0);

      setBusinessReviewStats(
        reviewCount > 0 && averageRating > 0
          ? { reviewCount, averageRating }
          : null
      );
    } catch {
      setBusinessReviewStats(null);
    }
  }

  async function fetchMyProfileAndProjects({ initial = false } = {}) {
    if (initial) setLoading(true);
    setLoadError("");
    try {
      const profileResult = await authFetch(
        "/my-contractor-profile",
        { cache: "no-store" },
        setPage
      );
      if (!profileResult?.response?.ok) throw new Error("portfolio_profile_unavailable");

      const nextProfile = profileResult?.data?.profile || null;
      setProfile(nextProfile);
      if (nextProfile) {
        await Promise.all([
          fetchCanonicalProjects(),
          fetchBusinessReviewStats(nextProfile.id),
        ]);
      } else {
        setProjects([]);
        setBusinessReviewStats(null);
      }
    } catch {
      setLoadError("Your Portfolio could not be loaded. Try again to see your latest projects.");
    } finally {
      if (initial) setLoading(false);
    }
  }

  async function refreshAfterVersionConflict() {
    closePortfolioProjectEditor();
    setPublishingProject(null);
    setPrivacyConfirmed(false);
    try {
      await fetchCanonicalProjects();
      setWorkspaceNotice({
        type: "warning",
        text: "This project was updated elsewhere. The latest version is shown; review it before trying again.",
      });
    } catch {
      setLoadError(
        "Your Portfolio changed, but the project list could not be refreshed. Try again before making another change."
      );
      setWorkspaceNotice({
        type: "error",
        text: "This project was updated elsewhere, but the latest version could not be loaded. Refresh before editing.",
      });
    }
  }

  async function runCanonicalCommand({
    operation,
    endpoint,
    method = "POST",
    body,
    expectedCode,
    successMessage,
  }) {
    setPendingOperation(operation);
    setWorkspaceNotice(null);
    try {
      const result = await authFetch(
        endpoint,
        { method, body: JSON.stringify(body) },
        setPage
      );

      if (isPortfolioVersionConflict(result)) {
        await refreshAfterVersionConflict();
        return null;
      }

      if (
        !result?.response?.ok ||
        result?.data?.success !== true ||
        result?.data?.code !== expectedCode
      ) {
        setWorkspaceNotice({
          type: "error",
          text: result?.data?.message || "This Portfolio change could not be saved.",
        });
        return null;
      }

      try {
        await fetchCanonicalProjects();
        setWorkspaceNotice({ type: "success", text: successMessage });
      } catch {
        setLoadError(
          "Your Portfolio changed, but the project list could not be refreshed. Try again before making another change."
        );
        setWorkspaceNotice({
          type: "warning",
          text: `${successMessage} The project list could not be refreshed; reload the page before continuing.`,
        });
      }
      return result.data;
    } catch {
      setLoadError(
        "The result of this Portfolio change is unclear. Refresh the page before trying another change."
      );
      setWorkspaceNotice({
        type: "error",
        text: "This Portfolio change could not be confirmed. Refresh the page and try again.",
      });
      return null;
    } finally {
      setPendingOperation("");
    }
  }

  function handleImageUpload(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    const validation = validateBusinessPortfolioFiles(files, {
      existingCount: images.length,
    });
    if (!validation.ok) {
      setWorkspaceNotice({
        type: "error",
        text: PORTFOLIO_PHOTO_ERROR[language] || PORTFOLIO_PHOTO_ERROR.en,
      });
      return;
    }
    setImages((current) => [
      ...current,
      ...validation.files.map((file) => createBusinessPortfolioPreview(file)),
    ]);
  }

  async function openProjectPhotoPicker() {
    setWorkspaceNotice(null);
    if (mediaUploadDeferred) {
      setWorkspaceNotice({ type: "warning", text: getMediaDeferredNotice(language) });
      return;
    }
    await openJobPhotoPicker({
      inputRef: projectImageInputRef,
      fileNamePrefix: "portfolio-photo",
      language,
      governedUploadEnabled: portfolioMediaEnabled,
      onPhotos: (photos) =>
        handleImageUpload({
          target: { files: photos.map((photo) => photo.file), value: "" },
        }),
      onError: (message) =>
        setWorkspaceNotice({ type: "error", text: message || CAMERA_PERMISSION_MESSAGE }),
    });
  }

  function handleEditImageUpload(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    const validation = validateBusinessPortfolioFiles(files, {
      existingCount: editImages.length,
    });
    if (!validation.ok) {
      setWorkspaceNotice({
        type: "error",
        text: PORTFOLIO_PHOTO_ERROR[language] || PORTFOLIO_PHOTO_ERROR.en,
      });
      return;
    }
    setPublishedEditPrivacyConfirmed(false);
    setEditImages((current) => [
      ...current,
      ...validation.files.map((file) => createBusinessPortfolioPreview(file)),
    ]);
  }

  async function openEditProjectPhotoPicker() {
    setWorkspaceNotice(null);
    if (mediaUploadDeferred) {
      setWorkspaceNotice({ type: "warning", text: getMediaDeferredNotice(language) });
      return;
    }
    await openJobPhotoPicker({
      inputRef: editPortfolioImageInputRef,
      fileNamePrefix: "portfolio-edit-photo",
      language,
      governedUploadEnabled: portfolioMediaEnabled,
      onPhotos: (photos) =>
        handleEditImageUpload({
          target: { files: photos.map((photo) => photo.file), value: "" },
        }),
      onError: (message) =>
        setWorkspaceNotice({ type: "error", text: message || CAMERA_PERMISSION_MESSAGE }),
    });
  }

  async function persistProject({ items, endpoint, method, expectedCode, fields }) {
    const pendingFiles = items.filter((item) => item.pending).map((item) => item.file);
    let uploaded = [];
    setPendingOperation(endpoint);
    setWorkspaceNotice(null);
    try {
      if (pendingFiles.length) {
        const uploadResult = await uploadBusinessPortfolioFiles({
          files: pendingFiles,
          setPage,
        });
        if (!uploadResult.ok) {
          setWorkspaceNotice({ type: "error", text: "The photos could not be uploaded." });
          return null;
        }
        uploaded = uploadResult.media;
      }

      let uploadIndex = 0;
      const portfolioMedia = items.map((item) => {
        const uploadedMedia = item.pending ? uploaded[uploadIndex++] : null;
        return toBusinessPortfolioPersistenceItem(item, uploadedMedia);
      });
      if (portfolioMedia.some((item) => !item)) throw new Error("portfolio_media_invalid");

      const result = await authFetch(
        endpoint,
        {
          method,
          body: JSON.stringify({ ...fields, portfolio_media: portfolioMedia }),
        },
        setPage
      );

      if (isPortfolioVersionConflict(result)) {
        await Promise.all(
          uploaded.map((media) => cleanupBusinessPortfolioMedia({ media, setPage }))
        );
        await refreshAfterVersionConflict();
        return null;
      }

      if (
        !result?.response?.ok ||
        result?.data?.success !== true ||
        result?.data?.code !== expectedCode ||
        !result?.data?.project
      ) {
        await Promise.all(
          uploaded.map((media) => cleanupBusinessPortfolioMedia({ media, setPage }))
        );
        setWorkspaceNotice({
          type: "error",
          text: result?.data?.message || "This Portfolio change could not be saved.",
        });
        return null;
      }

      items.forEach((item) => item.revoke?.());
      return result.data.project;
    } catch {
      await Promise.all(
        uploaded.map((media) => cleanupBusinessPortfolioMedia({ media, setPage }))
      );
      setWorkspaceNotice({
        type: "error",
        text: "This Portfolio change could not be confirmed. Refresh the page and try again.",
      });
      return null;
    } finally {
      setPendingOperation("");
    }
  }

  async function handleCreateProject() {
    if (!title.trim() || !description.trim()) {
      setWorkspaceNotice({
        type: "error",
        text: "Add a project title and description before saving the Draft.",
      });
      return;
    }
    const project = await persistProject({
      items: images,
      endpoint: "/contractor-projects",
      method: "POST",
      expectedCode: "BUSINESS_PORTFOLIO_CREATED",
      fields: { contractor_id: profile.id, title, description },
    });
    if (!project) return;

    closeCreateProjectEditor();
    const stateIsDraft =
      project.publication_state === PORTFOLIO_PUBLICATION_STATE.DRAFT;
    try {
      await fetchCanonicalProjects();
      setWorkspaceNotice({
        type: stateIsDraft ? "success" : "warning",
        text: stateIsDraft
          ? "Draft created. It is not public until you review and publish it."
          : "The project was saved with an unexpected status. Refresh and review it before continuing.",
      });
    } catch {
      setLoadError(
        "The project was created, but the project list could not be refreshed. Reload the page before making another change."
      );
      setWorkspaceNotice({
        type: "warning",
        text: "The project was created, but the project list could not be refreshed. Reload before continuing.",
      });
    }
  }

  async function handleSaveProjectEdit() {
    if (!editingProject || !isPortfolioActionAllowed(editingProject, "canEdit")) return;
    const expectedVersion = createExpectedVersionPayload(editingProject);
    if (!expectedVersion) {
      setWorkspaceNotice({ type: "error", text: "This project is out of date. Refresh your Portfolio and try again." });
      return;
    }
    const published =
      editingProject.publication_state === PORTFOLIO_PUBLICATION_STATE.PUBLISHED;
    if (published && !publishedEditPrivacyConfirmed) {
      setWorkspaceNotice({
        type: "warning",
        text: "Review and confirm the privacy checklist again before saving changes to a published project.",
      });
      return;
    }

    const updatedProject = await persistProject({
      items: editImages,
      endpoint: `/contractor-projects/${editingProject.id}`,
      method: "PUT",
      expectedCode: "BUSINESS_PORTFOLIO_UPDATED",
      fields: {
        title: editTitle,
        description: editDescription,
        ...expectedVersion,
        ...(published
          ? { privacy_confirmation: createPortfolioPrivacyConfirmation() }
          : {}),
      },
    });
    if (!updatedProject) return;

    closePortfolioProjectEditor();
    try {
      await fetchCanonicalProjects();
      setWorkspaceNotice({
        type: "success",
        text: published
          ? "Published project updated after fresh privacy confirmation."
          : "Draft changes saved to your Portfolio.",
      });
    } catch {
      setLoadError(
        "The project was updated, but the project list could not be refreshed. Reload the page before making another change."
      );
      setWorkspaceNotice({
        type: "warning",
        text: "The project was updated, but the project list could not be refreshed. Reload before continuing.",
      });
    }
  }

  function openCreateProjectEditor() {
    setWorkspaceNotice(null);
    setCreatingProject(true);
  }

  function closeCreateProjectEditor() {
    images.forEach((item) => item.revoke?.());
    setCreatingProject(false);
    setTitle("");
    setDescription("");
    setImages([]);
  }

  function openPortfolioProjectEditor(project) {
    if (!isPortfolioActionAllowed(project, "canEdit")) return;
    setWorkspaceNotice(null);
    setEditingProject(project);
    setEditTitle(project.title || "");
    setEditDescription(project.description || "");
    const projectImages = getBusinessPortfolioEditorMedia(project);
    setEditImages(projectImages);
    setActiveEditImage(projectImages[0]?.url || "");
    setPublishedEditPrivacyConfirmed(false);
  }

  function closePortfolioProjectEditor() {
    editImages.forEach((item) => item.revoke?.());
    setEditingProject(null);
    setEditTitle("");
    setEditDescription("");
    setEditImages([]);
    setActiveEditImage("");
    setExpandedEditImage("");
    setPublishedEditPrivacyConfirmed(false);
  }

  async function adoptLegacyAsDraft(project) {
    if (!isPortfolioActionAllowed(project, "canAdoptAsDraft")) return;
    const expectedVersion = createExpectedVersionPayload(project);
    if (!expectedVersion) return;
    await runCanonicalCommand({
      operation: `adopt-${project.id}`,
      endpoint: `/contractor-projects/${project.id}/legacy-adoption`,
      body: { ...expectedVersion, target_state: PORTFOLIO_PUBLICATION_STATE.DRAFT },
      expectedCode: "PORTFOLIO_LEGACY_ADOPTED_AS_DRAFT",
      successMessage: "Previous project moved to Draft. It remains private until you publish it.",
    });
  }

  function openPublishConfirmation(project) {
    if (!isPortfolioActionAllowed(project, "canPublish")) return;
    setWorkspaceNotice(null);
    setPublishingProject(project);
    setPrivacyConfirmed(false);
  }

  async function publishProject() {
    if (
      !publishingProject ||
      !privacyConfirmed ||
      !isPortfolioActionAllowed(publishingProject, "canPublish")
    ) return;
    const expectedVersion = createExpectedVersionPayload(publishingProject);
    if (!expectedVersion) return;
    const result = await runCanonicalCommand({
      operation: `publish-${publishingProject.id}`,
      endpoint: `/contractor-projects/${publishingProject.id}/publish`,
      body: {
        ...expectedVersion,
        privacy_confirmation: createPortfolioPrivacyConfirmation(),
      },
      expectedCode: "PORTFOLIO_PROJECT_PUBLISHED",
      successMessage: "Project published and now visible in your public Portfolio.",
    });
    if (result) {
      setPublishingProject(null);
      setPrivacyConfirmed(false);
    }
  }

  async function archiveProject(project) {
    if (!isPortfolioActionAllowed(project, "canArchive")) return;
    const confirmed = window.confirm(
      "Archive Project? This removes it from your public Portfolio while keeping the project and its photos in your records."
    );
    if (!confirmed) return;
    const expectedVersion = createExpectedVersionPayload(project);
    if (!expectedVersion) return;
    await runCanonicalCommand({
      operation: `archive-${project.id}`,
      endpoint: `/contractor-projects/${project.id}/archive`,
      body: expectedVersion,
      expectedCode: "PORTFOLIO_PROJECT_ARCHIVED",
      successMessage: "Project archived. It is no longer shown in your public Portfolio.",
    });
  }

  async function setFeaturedProject(project, featured) {
    const action = featured ? "canFeature" : "canUnfeature";
    if (!isPortfolioActionAllowed(project, action)) return;
    const expectedVersion = createExpectedVersionPayload(project);
    if (!expectedVersion) return;
    await runCanonicalCommand({
      operation: `${featured ? "feature" : "unfeature"}-${project.id}`,
      endpoint: `/contractor-projects/${project.id}/${featured ? "feature" : "unfeature"}`,
      body: expectedVersion,
      expectedCode: featured
        ? "PORTFOLIO_PROJECT_FEATURED"
        : "PORTFOLIO_PROJECT_UNFEATURED",
      successMessage: featured
        ? "This project is now featured in your Portfolio."
        : "This project is no longer featured in your Portfolio.",
    });
  }

  async function reorderProject(project, direction) {
    if (!isPortfolioActionAllowed(project, "canReorder")) return;
    const orderedProjects = movePortfolioProject(projects, project.id, direction);
    const payload = createPortfolioReorderPayload(profile?.id, orderedProjects);
    if (!payload) return;
    await runCanonicalCommand({
      operation: `reorder-${project.id}`,
      endpoint: "/contractor-projects/reorder",
      method: "PUT",
      body: payload,
      expectedCode: "PORTFOLIO_PROJECTS_REORDERED",
      successMessage: "Project order saved.",
    });
  }

  function returnToBusinessWorkspace() {
    if (isBusinessToolsReturn) {
      localStorage.removeItem("meetroSharedPageReturn");
      setPage("businessCommandCenter");
      return;
    }
    setPage("businessDashboard");
  }

  function openProjectView(projectId, returnMode = workspaceMode) {
    const exactProject = projects.find(
      (project) => String(project.id) === String(projectId)
    );
    if (!exactProject) return;
    setProjectViewReturnMode(returnMode);
    setSelectedProjectId(String(exactProject.id));
  }

  function openPortfolioManagement() {
    setSelectedProjectId("");
    setWorkspaceMode("management");
  }

  if (loading) return <LoadingScreen text={t("loadingProjectGallery")} />;

  const businessIdentity = getBusinessIdentityProjection(profile || {}, {
    fallbackName: t("portfolio"),
    translate: (key) => t(key, language),
    useStorageFallback: false,
  });
  const businessName = businessIdentity.businessName || t("portfolio");
  const counts = getCanonicalPortfolioCounts(projects);
  const reorderableProjects = getReorderablePortfolioProjects(projects);
  const publishedProjects = projects.filter(
    (project) =>
      project.publication_state === PORTFOLIO_PUBLICATION_STATE.PUBLISHED &&
      project.migration_review_required !== true
  );
  const selectedProject = projects.find(
    (project) => String(project.id) === String(selectedProjectId)
  );
  const selectedProjectState = selectedProject
    ? getPortfolioStatePresentation(selectedProject, language)
    : null;

  if (profile && selectedProject) {
    return (
      <div className="app-page meetro-responsive-page" style={pageWrapper}>
        <PortfolioProjectView
          project={selectedProject}
          businessName={businessName}
          trustContext={businessReviewStats}
          visibilityContext={selectedProjectState?.detail || ""}
          onBack={() => {
            setSelectedProjectId("");
            setWorkspaceMode(projectViewReturnMode);
          }}
          onManage={openPortfolioManagement}
        />
        <BottomNav setPage={setPage} currentPage="projectGallery" />
      </div>
    );
  }

  return (
    <div className="app-page meetro-responsive-page" style={pageWrapper}>
      <button
        type="button"
        onClick={() => {
          if (workspaceMode === "management") {
            setWorkspaceMode("portfolio");
            return;
          }
          returnToBusinessWorkspace();
        }}
        style={backButton}
      >
        ← {workspaceMode === "management"
          ? "Back to Portfolio"
          : isBusinessToolsReturn
          ? t("backToBusinessTools")
          : t("backToDashboard")}
      </button>

      <header style={compactHeader}>
        <div style={compactKicker}>Proof of Work</div>
        <h1 style={compactTitle}>Business Portfolio</h1>
        <p style={compactSubtitle}>
          {workspaceMode === "management"
            ? "Create, organize, and publish the projects you want customers to see."
            : `See how customers experience the proof of work from ${businessName}.`}
        </p>
      </header>

      <WorkspaceNotice notice={workspaceNotice} />

      {loadError && (
        <div role="alert" style={{ ...noticeCard, ...errorNotice }}>
          {loadError}
          <button type="button" style={noticeButton} onClick={() => fetchMyProfileAndProjects()}>
            Try again
          </button>
        </div>
      )}

      {profile && (
        <>
          {workspaceMode === "portfolio" ? (
            <>
              <section style={ownerPreviewHero} aria-label="Your public Portfolio preview">
                <div style={ownerPreviewCopy}>
                  <div style={heroBadge}>
                    <MeetroIcon name="portfolio" size={16} decorative /> Your Portfolio
                  </div>
                  <h2 style={heroTitle}>{businessName}</h2>
                  <p style={heroSubtitle}>
                    This is the proof of work customers can currently see. Use Edit Portfolio to
                    manage Drafts, published projects, photos, and project order.
                  </p>
                </div>
                <button type="button" style={editPortfolioButton} onClick={openPortfolioManagement}>
                  Edit Portfolio
                </button>
              </section>

              <section style={contentSection} aria-labelledby="portfolio-projects-heading">
                <div style={projectsHeader}>
                  <div style={{ minWidth: 0 }}>
                    <h2 id="portfolio-projects-heading" style={galleryTitle}>Portfolio Projects</h2>
                    <p style={sectionSubtitle}>The same proof of work customers see.</p>
                  </div>
                  <div style={projectCount}>{publishedProjects.length} published</div>
                </div>

                {publishedProjects.length === 0 ? (
                  <div style={emptyProjectsCard}>
                    <MeetroIcon name="portfolio" size={32} decorative />
                    <h3>No published projects yet</h3>
                    <p style={emptyProjectsText}>
                      Open Edit Portfolio to prepare a Draft or publish existing work.
                    </p>
                  </div>
                ) : (
                  <PortfolioProjectGrid ariaLabel="Published Portfolio projects">
                    {publishedProjects.map((project) => (
                      <PortfolioProjectCard
                        key={project.id}
                        project={project}
                        businessName={businessName}
                        trustContext={businessReviewStats}
                        onView={(projectId) => openProjectView(projectId, "portfolio")}
                      />
                    ))}
                  </PortfolioProjectGrid>
                )}
              </section>
            </>
          ) : (
            <>
              <section style={heroCard} aria-label="Portfolio management summary">
                <div style={heroTopRow}>
                  <div style={heroIdentityBlock}>
                    <div style={heroBadge}>
                      <MeetroIcon name="portfolio" size={16} decorative /> Edit Portfolio
                    </div>
                    <h2 style={heroTitle}>{businessName}</h2>
                  </div>
                  <div style={heroProofStack}>
                    <strong>{counts.total}</strong>
                    <span>projects</span>
                  </div>
                </div>
                <p style={heroSubtitle}>
                  Manage private work, published proof, photos, and project order.
                </p>
                <div style={statsGrid}>
                  <div style={statCard}><strong style={statNumber}>{counts.legacy}</strong><span style={statLabel}>Review</span></div>
                  <div style={statCard}><strong style={statNumber}>{counts.draft}</strong><span style={statLabel}>Drafts</span></div>
                  <div style={statCard}><strong style={statNumber}>{counts.published}</strong><span style={statLabel}>Published</span></div>
                  <div style={statCard}><strong style={statNumber}>{counts.archived}</strong><span style={statLabel}>Archived</span></div>
                </div>
              </section>

              <div style={portfolioActionGrid}>
                <button type="button" style={primaryActionButton} onClick={openCreateProjectEditor} disabled={busy}>
                  <MeetroIcon name="addProject" size={16} decorative /> Add Project
                </button>
              </div>

              <section style={contentSection} aria-labelledby="portfolio-management-heading">
                <div style={projectsHeader}>
                  <div style={{ minWidth: 0 }}>
                    <h2 id="portfolio-management-heading" style={galleryTitle}>Manage Portfolio</h2>
                    <p style={sectionSubtitle}>Create, edit, publish, organize, and archive your work.</p>
                  </div>
                  <div style={projectCount}>{projects.length} total</div>
                </div>

                {projects.length === 0 ? (
                  <div style={emptyProjectsCard}>
                    <MeetroIcon name="portfolio" size={32} decorative />
                    <h3>No Portfolio projects yet</h3>
                    <p style={emptyProjectsText}>Add your first project to start showcasing your work.</p>
                    <button type="button" style={primaryButton} onClick={openCreateProjectEditor}>Add Project</button>
                  </div>
                ) : (
                  <PortfolioProjectGrid ariaLabel="Portfolio management projects">
                    {projects.map((project) => {
                      const state = getPortfolioStatePresentation(project, language);
                      const reorderIndex = reorderableProjects.findIndex(
                        (candidate) => String(candidate.id) === String(project.id)
                      );
                      const legacyMedia = project.portfolio_media?.some(
                        (media) => media?.lifecycle_state === "legacy"
                      );

                      return (
                        <PortfolioProjectCard
                          key={project.id}
                          project={project}
                          businessName={businessName}
                          trustContext={businessReviewStats}
                          status={{
                            label: state.label,
                            style: statePillByKey[state.key],
                            secondaryLabel: project.is_featured ? "Featured project" : "",
                          }}
                          onView={(projectId) => openProjectView(projectId, "management")}
                          managementContent={(
                            <>
                              <p style={stateDetail}>{state.detail}</p>
                              {legacyMedia && (
                                <p style={legacyMediaNotice}>
                                  Some older photos need your review before this project can be published.
                                </p>
                              )}
                              <div style={projectButtonRow} aria-label={`Management actions for ${project.title || "project"}`}>
                                {isPortfolioActionAllowed(project, "canAdoptAsDraft") && (
                                  <button type="button" style={primaryCompactButton} disabled={busy} onClick={() => adoptLegacyAsDraft(project)}>Move to Draft</button>
                                )}
                                {isPortfolioActionAllowed(project, "canEdit") && (
                                  <button type="button" style={secondaryCompactButton} disabled={busy} onClick={() => openPortfolioProjectEditor(project)}>Edit Project</button>
                                )}
                                {isPortfolioActionAllowed(project, "canPublish") && (
                                  <button type="button" style={primaryCompactButton} disabled={busy} onClick={() => openPublishConfirmation(project)}>Publish Project</button>
                                )}
                                {isPortfolioActionAllowed(project, "canFeature") && (
                                  <button type="button" style={secondaryCompactButton} disabled={busy} onClick={() => setFeaturedProject(project, true)}>Feature Project</button>
                                )}
                                {isPortfolioActionAllowed(project, "canUnfeature") && (
                                  <button type="button" style={secondaryCompactButton} disabled={busy} onClick={() => setFeaturedProject(project, false)}>Remove Featured Project</button>
                                )}
                                {isPortfolioActionAllowed(project, "canArchive") && (
                                  <button type="button" style={archiveCompactButton} disabled={busy} onClick={() => archiveProject(project)}>Archive Project</button>
                                )}
                              </div>
                              {isPortfolioActionAllowed(project, "canReorder") && reorderableProjects.length > 1 && (
                                <div style={reorderRow} aria-label={`Display order for ${project.title || "project"}`}>
                                  <span>Display order {reorderIndex + 1}</span>
                                  <div style={reorderButtons}>
                                    <button type="button" style={orderButton} disabled={busy || reorderIndex === 0} onClick={() => reorderProject(project, "earlier")} aria-label={`Move ${project.title || "project"} earlier`}>↑ Earlier</button>
                                    <button type="button" style={orderButton} disabled={busy || reorderIndex === reorderableProjects.length - 1} onClick={() => reorderProject(project, "later")} aria-label={`Move ${project.title || "project"} later`}>↓ Later</button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        />
                      );
                    })}
                  </PortfolioProjectGrid>
                )}
              </section>
            </>
          )}

          <aside style={reviewSeparationCard}>
            <h2 style={compactSectionTitle}>Business reviews stay business-level</h2>
            <p style={emptyProjectsText}>Reviews describe your business overall. They are not copied onto individual projects as project ratings.</p>
          </aside>
        </>
      )}

      {!profile && !loadError && (
        <div style={emptyProjectsCard}>
          <h2>No professional Business Profile found</h2>
          <p style={emptyProjectsText}>Create your Business Profile before managing a Portfolio.</p>
          <button type="button" style={primaryButton} onClick={() => setPage("contractorProfile")}>
            Create Business Profile
          </button>
        </div>
      )}

      <BottomNav setPage={setPage} currentPage="projectGallery" />

      {creatingProject && typeof document !== "undefined" && createPortal(
        <div style={editorBackdrop} role="presentation" onClick={closeCreateProjectEditor}>
          <section
            style={portfolioEditorSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-portfolio-project-title"
            aria-describedby="create-portfolio-project-detail"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={editorHandle} aria-hidden="true" />
            <div style={editorHeader}>
              <div style={{ minWidth: 0 }}>
                <h1 id="create-portfolio-project-title" style={editPageTitle}>Add Project</h1>
                <p id="create-portfolio-project-detail" style={editPageSubtitle}>
                  Your new project starts as a private Draft. Only you can see it until you publish it.
                </p>
              </div>
              <button type="button" style={editorHeaderCancel} onClick={closeCreateProjectEditor} autoFocus>Cancel</button>
            </div>
            <div style={dialogNoticeSlot}><WorkspaceNotice notice={workspaceNotice} /></div>
            <div style={portfolioEditorBody}>
              <label style={fieldLabel} htmlFor="portfolioProjectTitleInput">Project title</label>
              <input
                id="portfolioProjectTitleInput"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                style={inputStyle}
                maxLength={160}
              />
              <label style={fieldLabel} htmlFor="portfolioProjectDescriptionInput">Project description</label>
              <textarea
                id="portfolioProjectDescriptionInput"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                style={{ ...inputStyle, minHeight: "120px", resize: "vertical" }}
                maxLength={4000}
              />
              <input
                ref={projectImageInputRef}
                id="projectImageInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={mediaUploadDeferred}
                style={{ display: "none" }}
                onChange={handleImageUpload}
              />
              <div style={uploadZone}>
                <button
                  type="button"
                  onClick={openProjectPhotoPicker}
                  disabled={mediaUploadDeferred || busy}
                  style={mediaUploadDeferred ? { ...uploadButton, ...disabledUploadButton } : uploadButton}
                  aria-label="Add Portfolio photos"
                >+</button>
                <h3>{mediaUploadDeferred ? mediaDeferredCopy.title : `${images.length} of 12 photos`}</h3>
                <p style={uploadText}>
                  {mediaUploadDeferred
                    ? mediaDeferredCopy.detail
                    : "Optional for a Draft. JPG, PNG, or WebP; 10 MB per image."}
                </p>
              </div>
              <PortfolioMediaGrid items={images} setItems={setImages} prefix="Draft" />
            </div>
            <div style={editorFooter}>
              <button type="button" style={editorCancelButton} onClick={closeCreateProjectEditor}>Cancel</button>
              <button type="button" style={editorSaveButton} onClick={handleCreateProject} disabled={busy}>
                Save Draft
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}

      {editingProject && typeof document !== "undefined" && createPortal(
        <div style={editorBackdrop} role="presentation" onClick={closePortfolioProjectEditor}>
          <section
            style={portfolioEditorSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-portfolio-project-title"
            aria-describedby="edit-portfolio-project-detail"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={editorHandle} aria-hidden="true" />
            <div style={editorHeader}>
              <div style={{ minWidth: 0 }}>
                <h1 id="edit-portfolio-project-title" style={editPageTitle}>Edit Project</h1>
                <p id="edit-portfolio-project-detail" style={editPageSubtitle}>
                  {editingProject.publication_state === PORTFOLIO_PUBLICATION_STATE.PUBLISHED
                    ? "Review the privacy checklist again before saving changes to this published project."
                    : "Changes remain private while this project is a Draft."}
                </p>
              </div>
              <button type="button" style={editorHeaderCancel} onClick={closePortfolioProjectEditor} autoFocus>Cancel</button>
            </div>
            <div style={dialogNoticeSlot}><WorkspaceNotice notice={workspaceNotice} /></div>
            <div style={portfolioEditorBody}>
              <div style={editPhotoHeader}>
                <strong>Portfolio photos ({editImages.length}/12)</strong>
                <button
                  type="button"
                  style={mediaUploadDeferred ? { ...smallAddPhotoBtn, ...disabledSmallAddPhotoBtn } : smallAddPhotoBtn}
                  disabled={mediaUploadDeferred || busy}
                  onClick={openEditProjectPhotoPicker}
                >
                  {mediaUploadDeferred ? mediaDeferredCopy.title : "+ Add photos"}
                </button>
              </div>
              <input
                ref={editPortfolioImageInputRef}
                id="editPortfolioImageInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={mediaUploadDeferred}
                style={{ display: "none" }}
                onChange={handleEditImageUpload}
              />
              {editImages.length > 0 ? (
                <>
                  <button
                    type="button"
                    style={mainImageButton}
                    onClick={() => setExpandedEditImage(activeEditImage || editImages[0]?.url)}
                    aria-label="Open current Portfolio photo"
                  >
                    <img src={activeEditImage || editImages[0]?.url} alt="Current Portfolio preview" style={editMainImage} />
                  </button>
                  <PortfolioMediaGrid
                    items={editImages}
                    setItems={setEditImages}
                    prefix="Portfolio"
                    activeUrl={activeEditImage}
                    setActiveUrl={setActiveEditImage}
                    onMutation={() => setPublishedEditPrivacyConfirmed(false)}
                  />
                </>
              ) : (
                <div style={emptyEditPhotos}>No photos attached. Add at least one photo before publishing this project.</div>
              )}
              <label style={fieldLabel} htmlFor="editPortfolioProjectTitle">Project title</label>
              <input
                id="editPortfolioProjectTitle"
                value={editTitle}
                onChange={(event) => {
                  setEditTitle(event.target.value);
                  setPublishedEditPrivacyConfirmed(false);
                }}
                style={inputStyle}
                maxLength={160}
              />
              <label style={fieldLabel} htmlFor="editPortfolioProjectDescription">Project description</label>
              <textarea
                id="editPortfolioProjectDescription"
                value={editDescription}
                onChange={(event) => {
                  setEditDescription(event.target.value);
                  setPublishedEditPrivacyConfirmed(false);
                }}
                style={{ ...inputStyle, minHeight: "140px", resize: "vertical" }}
                maxLength={4000}
              />
              {editingProject.publication_state === PORTFOLIO_PUBLICATION_STATE.PUBLISHED && (
                <PrivacyConfirmationControl
                  checked={publishedEditPrivacyConfirmed}
                  onChange={setPublishedEditPrivacyConfirmed}
                  inputId="published-edit-privacy-confirmation"
                  lead="I reviewed the changes and confirm this published content excludes:"
                />
              )}
            </div>
            <div style={editorFooter}>
              <button type="button" style={editorCancelButton} onClick={closePortfolioProjectEditor}>Cancel</button>
              <button type="button" style={editorSaveButton} onClick={handleSaveProjectEdit} disabled={busy}>
                Save changes
              </button>
            </div>
          </section>
          {expandedEditImage && (
            <div style={imagePreviewOverlay} role="dialog" aria-modal="true" aria-label="Expanded Portfolio photo">
              <button type="button" style={closePreviewBtn} onClick={() => setExpandedEditImage("")} aria-label="Close photo preview">×</button>
              <img src={expandedEditImage} alt="Expanded Portfolio preview" style={expandedPreviewImage} />
            </div>
          )}
        </div>,
        document.body
      )}

      {publishingProject && typeof document !== "undefined" && createPortal(
        <div style={editorBackdrop} role="presentation" onClick={() => setPublishingProject(null)}>
          <section
            style={privacyDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-portfolio-project-title"
            aria-describedby="publish-portfolio-project-detail"
            onClick={(event) => event.stopPropagation()}
          >
            <h1 id="publish-portfolio-project-title" style={editPageTitle}>Publish Project</h1>
            <p id="publish-portfolio-project-detail" style={editPageSubtitle}>
              Publishing makes “{publishingProject.title}” visible to homeowners and public viewers.
              You will see it in your Portfolio as soon as publishing is complete.
            </p>
            <div style={dialogNoticeSlot}><WorkspaceNotice notice={workspaceNotice} /></div>
            <PrivacyConfirmationControl
              checked={privacyConfirmed}
              onChange={setPrivacyConfirmed}
              inputId="publish-privacy-confirmation"
              lead="I confirm that this public Portfolio content excludes:"
            />
            <div style={editorFooter}>
              <button type="button" style={editorCancelButton} onClick={() => setPublishingProject(null)} autoFocus>Cancel</button>
              <button type="button" style={editorSaveButton} onClick={publishProject} disabled={busy || !privacyConfirmed}>
                Confirm and Publish
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}

function WorkspaceNotice({ notice }) {
  if (!notice) return null;
  return (
    <div
      role={notice.type === "error" ? "alert" : "status"}
      aria-live="polite"
      style={{
        ...noticeCard,
        ...(notice.type === "error" ? errorNotice : {}),
        ...(notice.type === "warning" ? warningNotice : {}),
      }}
    >
      {notice.text}
    </div>
  );
}

function PortfolioMediaGrid({
  items,
  setItems,
  prefix,
  activeUrl = "",
  setActiveUrl = null,
  onMutation = null,
}) {
  if (!items.length) return null;
  return (
    <div style={previewGrid}>
      {items.map((item, index) => (
        <div key={item.key} style={previewTile}>
          <button
            type="button"
            style={thumbnailButton}
            onClick={() => setActiveUrl?.(item.url)}
            aria-label={`Select ${prefix} photo ${index + 1}`}
          >
            <img
              src={item.url}
              alt={`${prefix} photo ${index + 1}`}
              style={{ ...previewImage, ...(activeUrl === item.url ? activeEditThumbnail : {}) }}
            />
          </button>
          <div style={previewControlRow}>
            <button
              type="button"
              aria-label={`Move ${prefix} photo ${index + 1} left`}
              disabled={index === 0}
              style={reorderPreviewBtn}
              onClick={() => {
                onMutation?.();
                setItems((current) => reorderBusinessPortfolioMedia(current, index, index - 1));
              }}
            >←</button>
            <button
              type="button"
              aria-label={`Move ${prefix} photo ${index + 1} right`}
              disabled={index === items.length - 1}
              style={reorderPreviewBtn}
              onClick={() => {
                onMutation?.();
                setItems((current) => reorderBusinessPortfolioMedia(current, index, index + 1));
              }}
            >→</button>
            <button
              type="button"
              aria-label={`Remove ${prefix} photo ${index + 1}`}
              style={removePreviewBtn}
              onClick={() => {
                onMutation?.();
                item.revoke?.();
                setItems((current) => {
                  const next = current.filter((image) => image.key !== item.key);
                  if (activeUrl === item.url) setActiveUrl?.(next[0]?.url || "");
                  return next;
                });
              }}
            >×</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PrivacyConfirmationControl({ checked, onChange, inputId, lead }) {
  return (
    <div style={privacyConfirmationCard}>
      <p style={privacyLead}>{lead}</p>
      <ul style={privacyList}>
        {PRIVACY_ITEMS.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <label style={privacyCheckboxLabel} htmlFor={inputId}>
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          style={privacyCheckbox}
        />
        <span>This confirmation is accurate for the exact content being submitted.</span>
      </label>
    </div>
  );
}

const pageWrapper = {
  background: "radial-gradient(circle at top right, rgba(238,244,234,0.94), transparent 38%), #fbf7ef",
  minHeight: "100vh",
  padding: "calc(env(safe-area-inset-top) + 64px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "1180px",
  margin: "0 auto",
  overflowX: "hidden",
};
const backButton = { border: "1px solid rgba(31,77,52,0.14)", background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", color: "var(--meetro-color-forest, #1f4d34)", padding: "12px 18px", minHeight: "44px", borderRadius: "18px", fontWeight: 800, marginBottom: "20px", cursor: "pointer", boxShadow: "0 8px 20px rgba(31,77,52,0.06)" };
const compactHeader = { marginBottom: "16px", minWidth: 0 };
const compactKicker = { color: "var(--meetro-color-coffee, #4a3428)", fontSize: "12px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" };
const compactTitle = { margin: 0, color: "#111827", fontSize: "clamp(30px, 8vw, 42px)", lineHeight: 1.05, fontWeight: 950, overflowWrap: "break-word" };
const compactSubtitle = { margin: "10px 0 0", color: "#5d665f", fontSize: "16px", lineHeight: 1.55, maxWidth: "74ch" };
const noticeCard = { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#14532d", borderRadius: "18px", padding: "14px 16px", marginBottom: "16px", lineHeight: 1.45, fontWeight: 750 };
const warningNotice = { background: "#fffbeb", borderColor: "#fde68a", color: "#78350f" };
const errorNotice = { background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" };
const noticeButton = { border: "1px solid currentColor", background: "white", color: "inherit", borderRadius: "12px", padding: "9px 12px", minHeight: "44px", fontWeight: 850, cursor: "pointer" };
const heroCard = { background: "linear-gradient(135deg, var(--meetro-color-forest-deep, #14351f) 0%, var(--meetro-color-forest, #1f4d34) 72%, #3a5a40 100%)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "28px", padding: "clamp(20px, 5vw, 28px)", color: "white", marginBottom: "24px", boxShadow: "0 18px 40px rgba(20,53,31,0.2), inset 0 1px 0 rgba(255,255,255,0.12)", minWidth: 0 };
const ownerPreviewHero = { ...heroCard, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", flexWrap: "wrap" };
const ownerPreviewCopy = { display: "grid", gap: "10px", minWidth: 0, flex: "1 1 420px" };
const editPortfolioButton = { minHeight: "48px", border: "1px solid rgba(255,255,255,0.46)", borderRadius: "16px", background: "rgba(255,255,255,0.94)", color: "var(--meetro-color-forest, #1f4d34)", padding: "12px 18px", fontSize: "15px", fontWeight: 950, cursor: "pointer", boxShadow: "0 10px 24px rgba(15,23,42,0.14)" };
const heroTopRow = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "14px", minWidth: 0, flexWrap: "wrap" };
const heroIdentityBlock = { minWidth: 0, flex: "1 1 220px", display: "grid", gap: "10px" };
const heroProofStack = { flex: "0 0 auto", minWidth: "82px", background: "rgba(255,255,255,0.13)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "18px", padding: "13px 12px", textAlign: "center", display: "grid", gap: "4px" };
const heroBadge = { background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.72)", color: "var(--meetro-color-forest, #1f4d34)", display: "inline-flex", alignItems: "center", gap: "7px", padding: "8px 14px", borderRadius: "999px", fontWeight: 800, width: "fit-content", maxWidth: "100%", boxSizing: "border-box", boxShadow: "0 6px 16px rgba(15,23,42,0.08)" };
const heroTitle = { fontSize: "clamp(21px, 6vw, 28px)", margin: 0, lineHeight: 1.12, color: "white", overflowWrap: "break-word", minWidth: 0 };
const heroSubtitle = { color: "rgba(255,255,255,0.82)", margin: "18px 0 0", lineHeight: 1.55, maxWidth: "68ch" };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px", marginTop: "22px" };
const statCard = { background: "rgba(255,255,255,0.11)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "18px", padding: "12px 8px", textAlign: "center", display: "grid", gap: "4px" };
const statNumber = { fontSize: "23px", fontWeight: 900 };
const statLabel = { opacity: 0.84, fontSize: "11px", whiteSpace: "nowrap" };
const portfolioActionGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "10px", marginBottom: "24px" };
const primaryActionButton = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", border: "none", background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))", color: "white", padding: "14px 16px", minHeight: "48px", borderRadius: "18px", fontWeight: 900, cursor: "pointer" };
const contentSection = { marginBottom: "24px" };
const projectsHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "18px", minWidth: 0 };
const galleryTitle = { fontSize: "clamp(26px, 7vw, 34px)", margin: 0, overflowWrap: "break-word" };
const sectionSubtitle = { margin: "6px 0 0", color: "#5d665f", lineHeight: 1.45 };
const projectCount = { background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(31,77,52,0.14)", color: "var(--meetro-color-forest, #1f4d34)", padding: "10px 14px", borderRadius: "999px", fontWeight: 800, whiteSpace: "nowrap", boxShadow: "0 8px 20px rgba(31,77,52,0.05)" };
const emptyProjectsCard = { background: "rgba(255,253,248,0.98)", borderRadius: "28px", padding: "40px 24px", textAlign: "center", border: "1px solid rgba(74,52,40,0.12)", boxShadow: "0 12px 30px rgba(74,52,40,0.06)" };
const emptyProjectsText = { color: "#5f6b7a", lineHeight: 1.6 };
const primaryButton = { width: "100%", padding: "14px 16px", minHeight: "48px", border: "none", borderRadius: "18px", background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))", color: "white", fontWeight: 850, fontSize: "16px", marginTop: "14px", cursor: "pointer" };
const statePillByKey = { legacy: { background: "#fffbeb", color: "#92400e", borderColor: "#fde68a" }, draft: { background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }, published: { background: "#ecfdf5", color: "#166534", borderColor: "#bbf7d0" }, archived: { background: "#f1f5f9", color: "#475569", borderColor: "#cbd5e1" } };
const stateDetail = { color: "#475569", lineHeight: 1.5, fontSize: "14px", margin: "12px 0" };
const legacyMediaNotice = { background: "#fffbeb", color: "#78350f", padding: "12px", borderRadius: "14px", lineHeight: 1.45, fontSize: "14px" };
const projectButtonRow = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "auto", paddingTop: "14px" };
const compactButtonBase = { minHeight: "44px", borderRadius: "999px", padding: "10px 15px", fontWeight: 850, fontSize: "13px", cursor: "pointer" };
const primaryCompactButton = { ...compactButtonBase, border: "1px solid var(--meetro-color-forest, #1f4d34)", background: "var(--meetro-color-forest, #1f4d34)", color: "white" };
const secondaryCompactButton = { ...compactButtonBase, border: "1px solid rgba(31,77,52,0.2)", background: "rgba(255,255,255,0.84)", backdropFilter: "blur(6px)", color: "var(--meetro-color-forest, #1f4d34)" };
const archiveCompactButton = { ...compactButtonBase, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#475569" };
const reorderRow = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #e2e8f0", color: "#475569", fontSize: "13px", fontWeight: 800 };
const reorderButtons = { display: "flex", gap: "8px", flexWrap: "wrap" };
const orderButton = { minHeight: "44px", border: "1px solid rgba(31,77,52,0.16)", background: "rgba(255,255,255,0.84)", backdropFilter: "blur(6px)", color: "#334155", borderRadius: "12px", padding: "9px 12px", fontWeight: 800, cursor: "pointer" };
const reviewSeparationCard = { background: "rgba(255,253,248,0.98)", borderRadius: "24px", padding: "20px", border: "1px solid rgba(74,52,40,0.12)", boxShadow: "0 10px 24px rgba(74,52,40,0.05)", marginBottom: "24px" };
const compactSectionTitle = { margin: "0 0 10px", fontSize: "20px", fontWeight: 950, color: "#111827" };
const editorBackdrop = { position: "fixed", inset: 0, zIndex: 1300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.34)", padding: "calc(env(safe-area-inset-top) + 10px) max(10px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom) + 10px) max(10px, env(safe-area-inset-left, 0px))", boxSizing: "border-box", overflow: "hidden" };
const portfolioEditorSheet = { width: "min(100%, 680px)", maxWidth: "100%", maxHeight: "min(90dvh, 780px)", minWidth: 0, display: "grid", gridTemplateRows: "auto auto auto minmax(0, 1fr) auto", gap: "10px", background: "rgba(255,253,248,0.97)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.72)", borderRadius: "24px", padding: "10px 14px 14px", boxShadow: "0 24px 70px rgba(15,23,42,0.22), inset 0 1px 0 rgba(255,255,255,0.84)", boxSizing: "border-box", overflow: "hidden" };
const privacyDialog = { ...portfolioEditorSheet, maxHeight: "min(90dvh, 720px)", padding: "20px" };
const dialogNoticeSlot = { minHeight: 0 };
const editorHandle = { justifySelf: "center", width: "48px", height: "5px", borderRadius: "999px", background: "rgba(100,116,139,0.24)" };
const editorHeader = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", minWidth: 0 };
const editorHeaderCancel = { border: "1px solid rgba(148,163,184,0.36)", borderRadius: "999px", background: "white", color: "#475569", padding: "9px 12px", minHeight: "44px", fontSize: "13px", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" };
const portfolioEditorBody = { overflowY: "auto", overscrollBehavior: "contain", minHeight: 0, paddingRight: "2px", WebkitOverflowScrolling: "touch" };
const editorFooter = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)", gap: "10px", paddingTop: "10px", borderTop: "1px solid rgba(74,52,40,0.12)", background: "rgba(255,253,248,0.94)", boxSizing: "border-box" };
const editorCancelButton = { minWidth: 0, minHeight: "48px", border: "1px solid rgba(148,163,184,0.4)", borderRadius: "16px", background: "white", color: "#475569", padding: "12px 14px", fontSize: "14px", fontWeight: 900, cursor: "pointer" };
const editorSaveButton = { minWidth: 0, minHeight: "48px", border: "1px solid rgba(31,77,52,0.42)", borderRadius: "16px", background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))", color: "white", padding: "12px 14px", fontSize: "14px", fontWeight: 950, cursor: "pointer" };
const editPageTitle = { margin: 0, fontSize: "22px", fontWeight: 950, color: "#111827", overflowWrap: "break-word" };
const editPageSubtitle = { margin: "8px 0 12px", color: "#475569", lineHeight: 1.5 };
const fieldLabel = { display: "block", color: "#334155", fontWeight: 850, margin: "4px 0 7px" };
const inputStyle = { width: "100%", padding: "14px", borderRadius: "16px", border: "1px solid #cbd5e1", marginBottom: "16px", fontSize: "16px", boxSizing: "border-box", color: "#111827", background: "white" };
const uploadZone = { border: "2px dashed rgba(31,77,52,0.24)", borderRadius: "22px", padding: "24px 16px", textAlign: "center", background: "#f8fafc" };
const uploadButton = { width: "64px", height: "64px", borderRadius: "50%", border: "none", background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))", color: "white", fontSize: "36px", cursor: "pointer", fontWeight: 700 };
const disabledUploadButton = { background: "#e2e8f0", color: "#64748b", cursor: "not-allowed" };
const uploadText = { color: "#5f6b7a", lineHeight: 1.5 };
const previewGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 132px), 1fr))", gap: "10px", marginTop: "16px" };
const previewTile = { position: "relative", borderRadius: "16px", overflow: "hidden", background: "#e5e7eb", minHeight: "132px" };
const thumbnailButton = { width: "100%", height: "100%", minHeight: "132px", border: 0, padding: 0, background: "transparent", cursor: "pointer" };
const previewImage = { width: "100%", height: "100%", minHeight: "132px", objectFit: "cover", display: "block", boxSizing: "border-box" };
const activeEditThumbnail = { outline: "3px solid var(--meetro-color-forest, #1f4d34)", outlineOffset: "-3px" };
const previewControlRow = { position: "absolute", left: "6px", right: "6px", bottom: "6px", display: "flex", justifyContent: "center", gap: "5px" };
const reorderPreviewBtn = { width: "44px", height: "44px", borderRadius: "999px", border: "none", background: "rgba(255,255,255,0.94)", color: "#14351f", fontWeight: 900, cursor: "pointer" };
const removePreviewBtn = { width: "44px", height: "44px", borderRadius: "999px", border: "none", background: "rgba(15,23,42,0.78)", color: "white", fontWeight: 900, cursor: "pointer" };
const editPhotoHeader = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "12px" };
const smallAddPhotoBtn = { border: "none", background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))", color: "var(--meetro-color-forest, #1f4d34)", padding: "10px 12px", minHeight: "44px", borderRadius: "14px", fontWeight: 900, cursor: "pointer" };
const disabledSmallAddPhotoBtn = { background: "#f1f5f9", color: "#64748b", cursor: "not-allowed" };
const mainImageButton = { display: "block", width: "100%", border: 0, background: "transparent", padding: 0, cursor: "pointer" };
const editMainImage = { width: "100%", height: "min(42vw, 260px)", minHeight: "180px", objectFit: "cover", borderRadius: "20px", background: "#f1f5f9", display: "block" };
const emptyEditPhotos = { background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "18px", padding: "18px", marginBottom: "18px", color: "#475569", fontWeight: 700, lineHeight: 1.5 };
const privacyConfirmationCard = { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "18px", padding: "16px", color: "#713f12", margin: "4px 0 16px", overflowY: "auto" };
const privacyLead = { margin: "0 0 8px", fontWeight: 900, lineHeight: 1.45 };
const privacyList = { margin: "0 0 14px", paddingLeft: "22px", lineHeight: 1.55 };
const privacyCheckboxLabel = { display: "grid", gridTemplateColumns: "28px minmax(0, 1fr)", alignItems: "start", gap: "10px", paddingTop: "12px", borderTop: "1px solid #fde68a", fontWeight: 850, lineHeight: 1.45, cursor: "pointer" };
const privacyCheckbox = { width: "22px", height: "22px", margin: "1px 0 0" };
const imagePreviewOverlay = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.94)", zIndex: 1400, display: "flex", alignItems: "center", justifyContent: "center", padding: "18px" };
const expandedPreviewImage = { maxWidth: "100%", maxHeight: "86vh", objectFit: "contain", borderRadius: "18px" };
const closePreviewBtn = { position: "fixed", top: "calc(env(safe-area-inset-top, 0px) + 18px)", right: "calc(env(safe-area-inset-right, 0px) + 18px)", width: "44px", height: "44px", borderRadius: "999px", border: "none", background: "white", color: "#111827", fontSize: "26px", fontWeight: 900, cursor: "pointer" };

export default ProjectGallery;
