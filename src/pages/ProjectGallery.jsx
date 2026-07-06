import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import API_URL from "../api";
import LoadingScreen from "../components/LoadingScreen";
import { authFetch } from "../utils/authFetch";
import {
  getBusinessPortfolioProjectImages,
  persistBusinessPortfolioProjects,
} from "../utils/businessPortfolioStorage";
import { getLanguage, t } from "../utils/language";
import { persistBusinessProfileShareRecord } from "../utils/profileShare";
import { applyBusinessIdentityFields, getBusinessIdentityProjection } from "../utils/businessIdentity";
import { getBusinessServicesProjection } from "../utils/businessServiceProfile";
import { getBusinessPortfolioProofProjection } from "../utils/businessPortfolioProof";
import {
  CAMERA_PERMISSION_MESSAGE,
  createPhotoInputEvent,
  openJobPhotoPicker,
} from "../utils/cameraPhotoPicker";
import {
  getMediaDeferredCopy,
  getMediaDeferredNotice,
  guardFriendsAndFamilyMediaUpload,
  isFriendsAndFamilyMediaDeferred,
} from "../utils/mediaDeferral";

function ProjectGallery({ setPage, currentPage }) {
  const sharedReturnPage = localStorage.getItem("meetroSharedPageReturn") || "";
  const isBusinessToolsReturn = sharedReturnPage === "businessCommandCenter";
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const projectImageInputRef = useRef(null);
  const editPortfolioImageInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImages, setEditImages] = useState([]);
  const [activeEditImage, setActiveEditImage] = useState("");
  const [expandedEditImage, setExpandedEditImage] = useState("");
  const portfolioEditorScrollRef = useRef(null);
  const [language, updateLanguage] = useState(getLanguage());
  const mediaUploadDeferred = isFriendsAndFamilyMediaDeferred();
  const mediaDeferredCopy = getMediaDeferredCopy(language);

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

  useEffect(() => {
    if ((!editingProject && !creatingProject) || typeof window === "undefined") return undefined;

    portfolioEditorScrollRef.current = {
      x: window.scrollX || window.pageXOffset || 0,
      y: window.scrollY || window.pageYOffset || 0,
    };

    return () => {
      const scrollPosition = portfolioEditorScrollRef.current;
      if (scrollPosition) {
        window.scrollTo(scrollPosition.x, scrollPosition.y);
      }
    };
  }, [editingProject, creatingProject]);

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
          `${API_URL}/contractor-projects/${profileData.profile.id}`
        );

        const projectsData =
          await projectsResponse.json();

        const fetchedProjects = projectsData.projects || [];
        const normalizedProjects = persistPortfolioForSpotlight(
          profileData.profile,
          fetchedProjects
        );

        setProjects(normalizedProjects.length > 0 ? normalizedProjects : fetchedProjects);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(event) {
    try {
      if (
        !guardFriendsAndFamilyMediaUpload({
          event,
          language,
          onDeferred: setPhotoError,
        })
      ) {
        return;
      }

      const selectedFiles = Array.from(event.target.files || []);

      if (selectedFiles.length === 0) return;

      setPhotoError("");
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

  async function openProjectPhotoPicker() {
    setPhotoError("");

    if (mediaUploadDeferred) {
      setPhotoError(getMediaDeferredNotice(language));
      return;
    }

    await openJobPhotoPicker({
      inputRef: projectImageInputRef,
      fileNamePrefix: "portfolio-photo",
      language,
      onPhotos: (photos) =>
        handleImageUpload(createPhotoInputEvent(photos.map((photo) => photo.file))),
      onError: (message) => setPhotoError(message || CAMERA_PERMISSION_MESSAGE),
    });
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
        setCreatingProject(false);

        await fetchMyProfileAndProjects();
      }
    } catch (error) {
      console.error(error);
      alert(t("serverError"));
    }
  }

  async function handleEditImageUpload(event) {
    try {
      if (
        !guardFriendsAndFamilyMediaUpload({
          event,
          language,
          onDeferred: setPhotoError,
        })
      ) {
        return;
      }

      const selectedFiles = Array.from(event.target.files || []);

      if (selectedFiles.length === 0) return;

      setPhotoError("");
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

  async function openEditProjectPhotoPicker() {
    setPhotoError("");

    if (mediaUploadDeferred) {
      setPhotoError(getMediaDeferredNotice(language));
      return;
    }

    await openJobPhotoPicker({
      inputRef: editPortfolioImageInputRef,
      fileNamePrefix: "portfolio-edit-photo",
      language,
      onPhotos: (photos) =>
        handleEditImageUpload(createPhotoInputEvent(photos.map((photo) => photo.file))),
      onError: (message) => setPhotoError(message || CAMERA_PERMISSION_MESSAGE),
    });
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

      const updatedProjects = projects.map((project) =>
        project.id === editingProject.id ? updatedProject : project
      );

      setProjects(updatedProjects);
      persistPortfolioForSpotlight(profile, updatedProjects);

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
    return getBusinessPortfolioProjectImages(project);
  }

  function persistPortfolioForSpotlight(contractorProfile, profileProjects = []) {
    if (!contractorProfile || !Array.isArray(profileProjects)) return [];
    const businessName =
      contractorProfile.business_name ||
      contractorProfile.name ||
      localStorage.getItem("businessName") ||
      "";
    const normalizedProjects = persistBusinessPortfolioProjects(
      contractorProfile,
      profileProjects,
      { fallbackBusinessName: businessName }
    );

    const businessId = contractorProfile.id || contractorProfile.contractor_id || "";

    try {
      const businesses = JSON.parse(localStorage.getItem("meetroBusinesses") || "[]");
      const existingBusinesses = Array.isArray(businesses) ? businesses : [];
      const existingBusiness = existingBusinesses.find((business) => {
        const existingId = String(business.id || business.businessId || "");
        const existingName = String(
          business.name || business.business_name || ""
        ).toLowerCase();

        return (
          (businessId && existingId === String(businessId)) ||
          (businessName && existingName === String(businessName).toLowerCase())
        );
      });
      const businessRecord = {
        ...(existingBusiness || {}),
        id: existingBusiness?.id || businessId || businessName,
        name: existingBusiness?.name || businessName,
        business_name: existingBusiness?.business_name || businessName,
        category:
          existingBusiness?.category ||
          contractorProfile.category ||
          contractorProfile.business_category ||
          localStorage.getItem("businessCategory") ||
          "",
        business_category:
          existingBusiness?.business_category ||
          contractorProfile.business_category ||
          contractorProfile.category ||
          localStorage.getItem("businessCategory") ||
          "",
        serviceDomain:
          existingBusiness?.serviceDomain ||
          contractorProfile.serviceDomain ||
          contractorProfile.service_domain ||
          localStorage.getItem("businessServiceDomain") ||
          "",
        businessServiceDomain:
          existingBusiness?.businessServiceDomain ||
          contractorProfile.businessServiceDomain ||
          contractorProfile.business_service_domain ||
          localStorage.getItem("businessServiceDomain") ||
          "",
        serviceSpecialties:
          existingBusiness?.serviceSpecialties ||
          contractorProfile.serviceSpecialties ||
          contractorProfile.businessServiceSpecialties ||
          [],
        businessServiceSpecialties:
          existingBusiness?.businessServiceSpecialties ||
          contractorProfile.businessServiceSpecialties ||
          contractorProfile.serviceSpecialties ||
          [],
        serviceCategories:
          existingBusiness?.serviceCategories ||
          contractorProfile.serviceCategories ||
          contractorProfile.businessServiceCategories ||
          [],
        businessServiceCategories:
          existingBusiness?.businessServiceCategories ||
          contractorProfile.businessServiceCategories ||
          contractorProfile.serviceCategories ||
          [],
        serviceCapabilities:
          existingBusiness?.serviceCapabilities ||
          contractorProfile.serviceCapabilities ||
          contractorProfile.businessServiceCapabilities ||
          [],
        businessServiceCapabilities:
          existingBusiness?.businessServiceCapabilities ||
          contractorProfile.businessServiceCapabilities ||
          contractorProfile.serviceCapabilities ||
          [],
        serviceZipCodes:
          existingBusiness?.serviceZipCodes ||
          contractorProfile.serviceZipCodes ||
          localStorage.getItem("businessZipCodes") ||
          "",
        businessPortfolio: normalizedProjects,
        localProfileOwner: true,
        localDemoSafe:
          existingBusiness?.localDemoSafe ||
          contractorProfile.localDemoSafe ||
          localStorage.getItem("businessLocalDemoSafe") === "true" ||
          undefined,
      };
      const services = getBusinessServicesProjection(businessRecord, {
        translate: t,
      });
      const publicBusinessRecord = applyBusinessIdentityFields({
        ...businessRecord,
        serviceSpecialties: services.serviceIds,
        businessServiceSpecialties: services.serviceIds,
        serviceCategories: services.categories,
        businessServiceCategories: services.categories,
        serviceCapabilities: services.capabilities,
        businessServiceCapabilities: services.capabilities,
      });
      const filteredBusinesses = existingBusinesses.filter((business) => {
        const existingId = String(business.id || business.businessId || "");
        const existingName = String(
          business.name || business.business_name || ""
        ).toLowerCase();

        return !(
          (businessRecord.id && existingId === String(businessRecord.id)) ||
          (businessRecord.name &&
            existingName === String(businessRecord.name).toLowerCase())
        );
      });

      localStorage.setItem(
        "meetroBusinesses",
        JSON.stringify([publicBusinessRecord, ...filteredBusinesses])
      );
    } catch {}

    return normalizedProjects;
  }

  function toggleProjectSpotlight(projectId) {
    const updatedProjects = projects.map((project) => ({
      ...project,
      spotlightFeatured:
        project.id === projectId ? !project.spotlightFeatured : Boolean(project.spotlightFeatured),
    }));

    setProjects(updatedProjects);
    persistPortfolioForSpotlight(profile, updatedProjects);
  }

  function viewPublicPortfolio() {
    if (!profile) return;

    persistBusinessProfileShareRecord(
      applyBusinessIdentityFields({
        ...profile,
        businessPortfolio: projects,
        projectGallery: projects,
      })
    );
    localStorage.setItem("contractorDetailsReturnPage", "projectGallery");
    setPage("contractorDetails");
  }

  function openCreateProjectEditor() {
    setPhotoError("");
    setCreatingProject(true);
  }

  function closeCreateProjectEditor() {
    setCreatingProject(false);
    setTitle("");
    setDescription("");
    setImages([]);
    setPhotoError("");
  }

  function openPortfolioProjectEditor(project) {
    setPhotoError("");
    setEditingProject(project);
    setEditTitle(project.title || "");
    setEditDescription(project.description || "");
    const projectImages = getProjectImages(project);
    setEditImages(projectImages);
    setActiveEditImage(projectImages[0] || "");
  }

  function closePortfolioProjectEditor() {
    setEditingProject(null);
    setEditTitle("");
    setEditDescription("");
    setEditImages([]);
    setActiveEditImage("");
    setExpandedEditImage("");
  }

  if (loading) {
    return (
      <LoadingScreen
        text={t("loadingProjectGallery")}
      />
    );
  }

  const businessIdentity = getBusinessIdentityProjection(profile || {}, {
    fallbackName: t("portfolio"),
    translate: (key) => t(key, language),
  });
  const businessName = businessIdentity.businessName || t("portfolio");
  const portfolioProof = getBusinessPortfolioProofProjection(
    {
      ...profile,
      businessPortfolio: projects,
      projectGallery: projects,
    },
    {
      translate: (key) => t(key, language),
    }
  );
  const portfolioStatus =
    portfolioProof.hasPublicProof
      ? t("portfolioTrustReady")
      : t("portfolioNeedsPhotos");
  const portfolioReviewStats = portfolioProof.reviewStats;
  const mostRecentReview = portfolioProof.mostRecentReview;
  const profileYearsServing =
    profile?.yearsServing ||
    profile?.years_serving ||
    profile?.servingSince ||
    profile?.serving_since ||
    "";
  const licensedInsuredValue =
    profile?.licensedInsured ||
    profile?.licensed_insured ||
    profile?.insured ||
    "";
  const businessVerification = businessIdentity.verification;
  const credentialItems = [
    {
      icon: "verified",
      label: t("verifiedBusiness"),
      value: businessVerification.verificationLabel,
    },
    {
      icon: "portfolio",
      label: t("portfolioReady"),
      value: portfolioProof.projectCount > 0 ? t("ready") : t("notSet"),
    },
    {
      icon: "verified",
      label: t("licensedInsured"),
      value:
        licensedInsuredValue === true
          ? businessVerification.credentialsLabel
          : licensedInsuredValue || businessVerification.credentialsLabel,
    },
    {
      icon: "history",
      label: t("yearsServingArea"),
      value: profileYearsServing || t("notProvided"),
    },
  ];

  return (
    <div className="app-page meetro-responsive-page" style={pageWrapper}>
      <button
        onClick={() => {
          if (isBusinessToolsReturn) {
            localStorage.removeItem("meetroSharedPageReturn");
            setPage("businessCommandCenter");
            return;
          }
          setPage("businessDashboard");
        }}
        style={backButton}
      >
        ← {isBusinessToolsReturn
          ? t("backToBusinessTools")
          : t("backToDashboard")}
      </button>

      <div style={compactHeader}>
        <div style={compactKicker}>{t("portfolio")}</div>
        <h1 style={compactTitle}>{t("portfolio")}</h1>
        <p style={compactSubtitle}>{t("portfolioTrustSubtitle")}</p>
      </div>

      <div style={heroCard}>
        <div style={heroTopRow}>
          <div style={heroIdentityBlock}>
            <div style={heroBadge}>
              <MeetroIcon name="portfolio" size={16} decorative />{" "}
              {portfolioStatus}
            </div>

            <h2 style={heroTitle}>{businessName}</h2>
          </div>

          <div style={heroProofStack}>
            <strong>{portfolioProof.projectCount}</strong>
            <span>{t("projects")}</span>
          </div>
        </div>

        <p style={heroSubtitle}>{t("portfolioTrustMessage")}</p>

        <div style={statsGrid}>
          <div style={statCard}>
            <div style={statNumber}>{portfolioProof.photoCount}</div>
            <div style={statLabel}>{t("photos")}</div>
          </div>

          <div style={statCard}>
            <div style={statNumber}>{portfolioProof.featuredProjectCount}</div>
            <div style={statLabel}>{t("featuredInSpotlight")}</div>
          </div>

          <div style={statCard}>
            <div style={statNumber}>
              {portfolioReviewStats.totalReviews
                ? Number(portfolioReviewStats.averageRating || 0).toFixed(1)
                : "—"}
            </div>
            <div style={statLabel}>{t("reviews")}</div>
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
          <div style={portfolioActionGrid}>
            <button
              style={primaryActionButton}
              onClick={() => openCreateProjectEditor()}
            >
              <MeetroIcon name="addProject" size={16} decorative />{" "}
              {t("addProject")}
            </button>

            <button style={secondaryActionButton} onClick={viewPublicPortfolio}>
              <MeetroIcon name="preview" size={16} decorative />{" "}
              {t("viewPublicPortfolio")}
            </button>
          </div>

          <section style={contentSection}>
            <div style={projectsHeader}>
              <div>
                <h2 style={galleryTitle}>{t("showcasedProjects")}</h2>
                <p style={sectionSubtitle}>{t("showcasedProjectsHelp")}</p>
              </div>

              <div style={projectCount}>
                {projects.length} {t("total")}
              </div>
            </div>

            {projects.length === 0 && (
              <div style={emptyProjectsCard}>
                <div style={emptyIcon}>
                  <MeetroIcon name="portfolio" size={32} decorative />
                </div>

                <h3 style={emptyProjectsTitle}>{t("portfolioEmptyTrustTitle")}</h3>

                <p style={emptyProjectsText}>{t("portfolioEmptyTrustText")}</p>

                <button
                  style={primaryButton}
                  onClick={() => openCreateProjectEditor()}
                >
                  {t("addFirstProject")}
                </button>
              </div>
            )}

            {projects.map((project) => {
              const projectImages = getProjectImages(project);
              const coverImage = projectImages[0];
              const projectService =
                project.serviceType ||
                project.service_type ||
                project.category ||
                profile.category ||
                t("serviceType");
              const projectLocation =
                project.location ||
                project.serviceArea ||
                project.service_area ||
                profile.serviceArea ||
                profile.service_area ||
                "";

              return (
                <div
                  key={project.id}
                  style={{
                    ...projectCard,
                    ...(project.spotlightFeatured ? projectCardFeatured : {}),
                  }}
                >
                  {coverImage ? (
                    <div style={coverImageWrap}>
                      <img
                        src={coverImage}
                        alt={project.title}
                        style={coverImageStyle}
                      />

                      {projectImages.length > 1 && (
                        <span style={photoCountBadge}>
                          <MeetroIcon name="photoCount" size={14} decorative />
                          {projectImages.length} {t("photos")}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={missingProjectImage}>
                      <MeetroIcon name="photoCount" size={24} decorative />
                      {t("addPhotosFromCompletedJobs")}
                    </div>
                  )}

                  <div style={projectContent}>
                    <div style={projectMetaRow}>
                      <span style={projectTag}>{projectService}</span>
                      {projectLocation && (
                        <span style={projectLocationPill}>{projectLocation}</span>
                      )}
                    </div>

                    <h3 style={projectTitle}>{project.title}</h3>

                    <p style={projectDescriptionStyle}>
                      {project.description || t("portfolioProjectDescriptionFallback")}
                    </p>

                    <div style={projectReviewProof}>
                      <MeetroIcon name="reviews" size={16} decorative />{" "}
                      {mostRecentReview
                        ? mostRecentReview.comment ||
                          mostRecentReview.review_text ||
                          t("reviewProofAvailable")
                        : t("portfolioReviewProofEmpty")}
                    </div>

                    <div style={projectButtonRow}>
                      <button
                        style={editPortfolioBtn}
                        onClick={() => openPortfolioProjectEditor(project)}
                      >
                        <MeetroIcon name="editPortfolio" size={16} decorative />{" "}
                        {t("editPortfolio")}
                      </button>

                      <button
                        type="button"
                        className={project.spotlightFeatured ? "meetro-selected-card-soft" : ""}
                        style={{
                          ...spotlightFeatureBtn,
                          ...(project.spotlightFeatured
                            ? spotlightFeatureBtnActive
                            : null),
                        }}
                        onClick={() => toggleProjectSpotlight(project.id)}
                      >
                        <MeetroIcon
                          name={project.spotlightFeatured ? "selected" : "featuredSpotlight"}
                          size={16}
                          decorative
                        />{" "}
                        {project.spotlightFeatured
                          ? t("featuredInSpotlight")
                          : t("useInSpotlight")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <section style={proofGrid}>
            <div style={proofCard}>
              <h2 style={compactSectionTitle}>{t("reviewProof")}</h2>
              {portfolioReviewStats.totalReviews ? (
                <>
                  <div style={reviewScore}>
                    {Number(portfolioReviewStats.averageRating || 0).toFixed(1)}
                  </div>
                  <p style={emptyProjectsText}>
                    {portfolioReviewStats.totalReviews} {t("reviews")}
                  </p>
                  {mostRecentReview && (
                    <p style={reviewPreview}>
                      “{mostRecentReview.comment || mostRecentReview.review_text || t("reviewProofAvailable")}”
                    </p>
                  )}
                </>
              ) : (
                <p style={emptyProjectsText}>{t("portfolioReviewsEmpty")}</p>
              )}
            </div>

            <div style={proofCard}>
              <h2 style={compactSectionTitle}>{t("credentials")}</h2>
              <div style={credentialList}>
                {credentialItems.map((item) => (
                  <div key={item.label} style={credentialRow}>
                    <MeetroIcon name={item.icon} size={18} decorative />
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </>
      )}

      <BottomNav setPage={setPage} currentPage="projectGallery" />

      {creatingProject && typeof document !== "undefined" &&
        createPortal(
          <div
            style={editorBackdrop}
            role="presentation"
            onClick={closeCreateProjectEditor}
          >
            <section
              style={portfolioEditorSheet}
              role="dialog"
              aria-modal="true"
              aria-label={t("addProject")}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={editorHandle} aria-hidden="true" />

              <div style={editorHeader}>
                <div style={{ minWidth: 0 }}>
                  <h1 style={editPageTitle}>{t("addProject")}</h1>
                  <p style={editPageSubtitle}>{t("portfolioUploadHelp")}</p>
                </div>

                <button
                  type="button"
                  style={editorHeaderCancel}
                  onClick={closeCreateProjectEditor}
                >
                  {t("cancel")}
                </button>
              </div>

              <div style={portfolioEditorBody}>
                <div style={sectionInfoBadge} aria-label={t("projectType")}>
                  <MeetroIcon name="beforeAfter" size={14} decorative />
                  {t("beforeAfterProject")}
                </div>

                <input
                  ref={projectImageInputRef}
                  id="projectImageInput"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={mediaUploadDeferred}
                  style={{ display: "none" }}
                  onChange={handleImageUpload}
                />

                <input
                  id="portfolioProjectTitleInput"
                  placeholder={t("projectTitle")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={inputStyle}
                />

                <textarea
                  placeholder={t("projectDescription")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    ...inputStyle,
                    minHeight: "120px",
                    resize: "none",
                  }}
                />

                <div style={uploadZone}>
                  <button
                    type="button"
                    onClick={openProjectPhotoPicker}
                    disabled={mediaUploadDeferred}
                    style={
                      mediaUploadDeferred
                        ? { ...uploadButton, ...disabledUploadButton }
                        : uploadButton
                    }
                  >
                    +
                  </button>

                  <h3 style={uploadTitle}>
                    {mediaUploadDeferred
                      ? mediaDeferredCopy.title
                      : images.length > 0
                      ? `${images.length} ${t("photosReady")}`
                      : t("uploadPhotos")}
                  </h3>

                  <p style={uploadText}>
                    {mediaUploadDeferred
                      ? mediaDeferredCopy.detail
                      : t("portfolioUploadHelp")}
                  </p>

                  {uploading && (
                    <p style={uploadingText}>{t("uploadingPhotos")}</p>
                  )}
                  {photoError && <p style={uploadingText}>{photoError}</p>}
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
                          type="button"
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
              </div>

              <div style={editorFooter}>
                <button
                  type="button"
                  style={editorCancelButton}
                  onClick={closeCreateProjectEditor}
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  style={editorSaveButton}
                  onClick={handleCreateProject}
                >
                  <MeetroIcon name="publishProject" size={16} decorative />{" "}
                  {t("publishProject")}
                </button>
              </div>
            </section>
          </div>,
          document.body
        )}

      {editingProject && typeof document !== "undefined" &&
        createPortal(
          <div
            style={editorBackdrop}
            role="presentation"
            onClick={closePortfolioProjectEditor}
          >
            <section
              style={portfolioEditorSheet}
              role="dialog"
              aria-modal="true"
              aria-label={language === "es" ? "Editar proyecto" : "Edit Project"}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={editorHandle} aria-hidden="true" />

              <div style={editorHeader}>
                <div style={{ minWidth: 0 }}>
                  <h1 style={editPageTitle}>
                    {language === "es" ? "Editar proyecto" : "Edit Project"}
                  </h1>

                  <p style={editPageSubtitle}>
                    {language === "es"
                      ? "Actualiza la información visible para clientes."
                      : "Update the information customers will see."}
                  </p>
                </div>

                <button
                  type="button"
                  style={editorHeaderCancel}
                  onClick={closePortfolioProjectEditor}
                >
                  {t("cancel")}
                </button>
              </div>

              <div style={portfolioEditorBody}>
                <div style={editPhotoHeader}>
                  <strong>
                    {language === "es" ? "Fotos del portafolio" : "Portfolio Photos"}
                  </strong>

                  <button
                    type="button"
                    style={
                      mediaUploadDeferred
                        ? { ...smallAddPhotoBtn, ...disabledSmallAddPhotoBtn }
                        : smallAddPhotoBtn
                    }
                    disabled={mediaUploadDeferred}
                    onClick={openEditProjectPhotoPicker}
                  >
                    {mediaUploadDeferred
                      ? mediaDeferredCopy.title
                      : `+ ${language === "es" ? "Agregar fotos" : "Add Photos"}`}
                  </button>
                </div>

                <input
                  ref={editPortfolioImageInputRef}
                  id="editPortfolioImageInput"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={mediaUploadDeferred}
                  style={{ display: "none" }}
                  onChange={handleEditImageUpload}
                />

                {photoError && <p style={uploadingText}>{photoError}</p>}

                {editImages.length > 0 ? (
                  <>
                    <img
                      src={activeEditImage || editImages[0]}
                      alt={editTitle || "Portfolio preview"}
                      style={editMainImage}
                      onClick={() =>
                        setExpandedEditImage(activeEditImage || editImages[0])
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
                            type="button"
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
              </div>

              <div style={editorFooter}>
                <button
                  type="button"
                  style={editorCancelButton}
                  onClick={closePortfolioProjectEditor}
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  style={editorSaveButton}
                  onClick={handleSaveProjectEdit}
                >
                  {t("save")}
                </button>
              </div>
            </section>

            {expandedEditImage && (
              <div
                style={imagePreviewOverlay}
                onClick={(event) => {
                  event.stopPropagation();
                  setExpandedEditImage("");
                }}
              >
                <button
                  type="button"
                  style={closePreviewBtn}
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpandedEditImage("");
                  }}
                >
                  ×
                </button>

                <img
                  src={expandedEditImage}
                  alt="Expanded portfolio preview"
                  style={expandedPreviewImage}
                />
              </div>
            )}
          </div>,
          document.body
        )}
     
    </div>
  );
}

const pageWrapper = {
  background: "#f5f5f7",
  minHeight: "100vh",
  padding:
    "calc(env(safe-area-inset-top) + 64px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "1120px",
  margin: "0 auto",
};

const backButton = {
  border: "none",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "12px 18px",
  borderRadius: "18px",
  fontWeight: "800",
  marginBottom: "20px",
  cursor: "pointer",
};

const compactHeader = {
  marginBottom: "16px",
};

const compactKicker = {
  color: "var(--meetro-color-coffee, #4a3428)",
  fontSize: "12px",
  fontWeight: "950",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  marginBottom: "6px",
};

const compactTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "34px",
  lineHeight: 1,
  fontWeight: "950",
};

const compactSubtitle = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: "16px",
  lineHeight: 1.45,
};

const heroCard = {
  background:
    "linear-gradient(135deg, var(--meetro-color-forest-deep, #14351f) 0%, var(--meetro-color-forest, #1f4d34) 58%, var(--meetro-color-coffee, #4a3428) 100%)",
  borderRadius: "28px",
  padding: "24px",
  color: "white",
  marginBottom: "24px",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow:
    "0 16px 38px rgba(15,23,42,0.22)",
};

const heroTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  minWidth: 0,
};

const heroIdentityBlock = {
  minWidth: 0,
  flex: "1 1 auto",
  display: "grid",
  gap: "10px",
};

const heroProofStack = {
  flex: "0 0 auto",
  minWidth: "82px",
  background: "rgba(255,255,255,0.12)",
  borderRadius: "18px",
  padding: "13px 12px",
  textAlign: "center",
  marginTop: "2px",
};

const heroBadge = {
  background: "white",
  color: "var(--meetro-color-forest, #1f4d34)",
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  padding: "8px 14px",
  borderRadius: "999px",
  fontWeight: "800",
  width: "fit-content",
  maxWidth: "100%",
  boxShadow: "0 8px 18px rgba(49,35,20,0.10)",
};

const heroTitle = {
  fontSize: "clamp(21px, 6vw, 28px)",
  margin: 0,
  lineHeight: 1.12,
  color: "white",
  textShadow: "0 2px 10px rgba(0,0,0,0.22)",
  overflowWrap: "break-word",
  wordBreak: "normal",
  hyphens: "none",
};

const heroSubtitle = {
  color: "rgba(255,255,255,0.78)",
  marginTop: "18px",
  lineHeight: 1.55,
  fontSize: "16px",
  maxWidth: "64ch",
};

const portfolioActionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "10px",
  marginBottom: "24px",
};

const primaryActionButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  border: "none",
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "white",
  padding: "14px 16px",
  borderRadius: "18px",
  fontWeight: "900",
  cursor: "pointer",
};

const secondaryActionButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  border: "1px solid rgba(31,77,52,0.18)",
  background: "white",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "14px 16px",
  borderRadius: "18px",
  fontWeight: "900",
  cursor: "pointer",
};

const contentSection = {
  marginBottom: "24px",
};

const sectionSubtitle = {
  margin: "6px 0 0",
  color: "#64748b",
  lineHeight: 1.45,
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
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

  const sectionTitle = {
  margin: 0,
  fontSize: "28px",
  color: "#111827",
  fontWeight: "900",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const sectionInfoBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "#f8fafc",
  color: "#475569",
  padding: "7px 11px",
  borderRadius: "999px",
  border: "1px solid #e2e8f0",
  fontWeight: "850",
  fontSize: "12px",
  cursor: "default",
  boxShadow: "none",
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
    "2px dashed rgba(31,77,52,0.24)",
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
    "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "white",
  fontSize: "42px",
  cursor: "pointer",
  fontWeight: "bold",
};

const disabledUploadButton = {
  background: "#e2e8f0",
  color: "#64748b",
  cursor: "not-allowed",
};

const uploadTitle = {
  marginTop: "18px",
  marginBottom: "8px",
};

const uploadText = {
  color: "#666",
};

const uploadingText = {
  color: "var(--meetro-color-forest, #1f4d34)",
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
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  width: "100%",
  marginTop: "22px",
  padding: "18px",
  border: "none",
  borderRadius: "20px",
  background:
    "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
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
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
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

const missingProjectImage = {
  minHeight: "190px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  padding: "24px",
  background: "#f8fafc",
  color: "#64748b",
  fontWeight: "800",
  textAlign: "center",
};

const projectCard = {
  background: "white",
  borderRadius: "28px",
  overflow: "hidden",
  marginBottom: "22px",
  boxShadow:
    "0 12px 30px rgba(0,0,0,0.06)",
};

const projectCardFeatured = {
  border: "1px solid rgba(31,77,52,0.34)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.99), rgba(248,247,255,0.94))",
  boxShadow: "0 14px 34px rgba(31,77,52,0.12)",
};

const editorBackdrop = {
  position: "fixed",
  inset: 0,
  zIndex: 1300,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(15,23,42,0.24)",
  padding:
    "calc(env(safe-area-inset-top) + 12px) max(10px, env(safe-area-inset-right)) calc(env(safe-area-inset-bottom) + 12px) max(10px, env(safe-area-inset-left))",
  boxSizing: "border-box",
  overflow: "hidden",
  touchAction: "none",
};

const portfolioEditorSheet = {
  width: "min(100%, 680px)",
  maxWidth: "100%",
  maxHeight: "min(86dvh, 760px)",
  minWidth: 0,
  display: "grid",
  gridTemplateRows: "auto auto 1fr auto",
  gap: "12px",
  background: "white",
  border: "1px solid rgba(31,77,52,0.14)",
  borderRadius: "24px",
  padding: "10px 14px 14px",
  boxShadow: "0 24px 70px rgba(15,23,42,0.22)",
  backdropFilter: "blur(18px)",
  boxSizing: "border-box",
  overflow: "hidden",
};

const editorHandle = {
  justifySelf: "center",
  width: "48px",
  height: "5px",
  borderRadius: "999px",
  background: "rgba(100,116,139,0.24)",
};

const editorHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  minWidth: 0,
};

const editorHeaderCancel = {
  border: "1px solid rgba(148,163,184,0.28)",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.8)",
  color: "#475569",
  padding: "9px 12px",
  fontSize: "13px",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const portfolioEditorBody = {
  overflowY: "auto",
  overscrollBehavior: "contain",
  minHeight: 0,
  paddingRight: "2px",
  WebkitOverflowScrolling: "touch",
  touchAction: "pan-y",
};

const editorFooter = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
  gap: "10px",
  paddingTop: "10px",
  borderTop: "1px solid rgba(226,232,240,0.86)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.96))",
  boxSizing: "border-box",
};

const editorCancelButton = {
  minWidth: 0,
  border: "1px solid rgba(148,163,184,0.32)",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.82)",
  color: "#475569",
  padding: "12px 14px",
  fontSize: "14px",
  fontWeight: 900,
  cursor: "pointer",
};

const editorSaveButton = {
  minWidth: 0,
  border: "1px solid rgba(31,77,52,0.42)",
  borderRadius: "16px",
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "#ffffff",
  padding: "12px 14px",
  fontSize: "14px",
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 12px 26px rgba(49,35,20,0.16)",
};

const editPageTitle = {
  margin: 0,
  fontSize: "22px",
  fontWeight: "950",
  color: "#111827",
};

const editPageSubtitle = {
  margin: "8px 0 18px",
  color: "#475569",
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
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "10px 12px",
  borderRadius: "14px",
  fontWeight: "900",
  cursor: "pointer",
};

const disabledSmallAddPhotoBtn = {
  background: "#f1f5f9",
  color: "#64748b",
  cursor: "not-allowed",
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
  color: "#475569",
  fontWeight: "700",
};

const imagePreviewOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.92)",
  zIndex: 1400,
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
  top: "calc(env(safe-area-inset-top, 0px) + 18px)",
  right: "calc(env(safe-area-inset-right, 0px) + 18px)",
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
  border: "3px solid var(--meetro-color-forest, #1f4d34)",
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
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "rgba(15,23,42,0.72)",
  color: "white",
  padding: "8px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
  backdropFilter: "blur(10px)",
};

const proofGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "14px",
  marginBottom: "24px",
};

const proofCard = {
  background: "white",
  borderRadius: "24px",
  padding: "20px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
};

const compactSectionTitle = {
  margin: "0 0 12px",
  fontSize: "20px",
  fontWeight: "950",
  color: "#111827",
};

const reviewScore = {
  fontSize: "34px",
  fontWeight: "950",
  color: "#111827",
  lineHeight: 1,
};

const reviewPreview = {
  color: "#334155",
  lineHeight: 1.5,
  margin: "12px 0 0",
};

const credentialList = {
  display: "grid",
  gap: "10px",
};

const credentialRow = {
  display: "grid",
  gridTemplateColumns: "20px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "10px",
  color: "#334155",
  fontSize: "14px",
};

const portfolioActions = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "16px",
};

const openPortfolioBtn = {
  border: "none",
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "white",
  padding: "13px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const editPortfolioBtn = {
  width: "auto",
  alignSelf: "center",
  border: "1px solid rgba(31,77,52,0.18)",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "10px 18px",
  borderRadius: "999px",
  fontWeight: "800",
  fontSize: "13px",
  cursor: "pointer",
  marginTop: "14px",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
};

const spotlightFeatureBtn = {
  width: "auto",
  alignSelf: "center",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#475569",
  padding: "10px 18px",
  borderRadius: "999px",
  fontWeight: "850",
  fontSize: "13px",
  cursor: "pointer",
  marginTop: "10px",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
};

const spotlightFeatureBtnActive = {
  borderColor: "var(--meetro-color-forest, #1f4d34)",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
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

const projectMetaRow = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "10px",
};

const projectTag = {
  background: "transparent",
  color: "#475569",
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

const projectLocationPill = {
  background: "#f1f5f9",
  color: "#475569",
  padding: "6px 9px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "800",
};

const projectTitle = {
  fontSize: "24px",
  marginBottom: "12px",
};

const projectDescriptionStyle = {
  color: "#666",
  lineHeight: 1.7,
};

const projectReviewProof = {
  marginTop: "14px",
  background: "#f8fafc",
  color: "#475569",
  borderRadius: "16px",
  padding: "12px",
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  lineHeight: 1.45,
  fontSize: "14px",
};

const projectButtonRow = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
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
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "white",
  fontWeight: "800",
  fontSize: "16px",
  marginTop: "18px",
  cursor: "pointer",
};

export default ProjectGallery;
