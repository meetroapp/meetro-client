import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import SafeBackBar from "../components/SafeBackBar";
import API_URL from "../api";
import { t } from "../utils/language";
import {
  getActiveJobSnapshot,
  getJobRecord,
  getSelectedActiveProject,
  saveSelectedActiveProject,
} from "../utils/workCenter";

function ProjectDetails({ setPage, currentPage }) {
  const activeJobSnapshot = getActiveJobSnapshot();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobRecords, setJobRecords] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState("");
  const [expandedPhoto, setExpandedPhoto] = useState("");
  const [expandedPhotos, setExpandedPhotos] = useState([]);
  const [expandedPhotoIndex, setExpandedPhotoIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [showGalleryGrid, setShowGalleryGrid] = useState(false);

  const activeProjectData = getSelectedActiveProject();

  const projectDetailsReturnPageValue =
    localStorage.getItem("projectDetailsReturnPage") || "";

  const isProfessionalProject =
    projectDetailsReturnPageValue === "contractorDashboard";

  const isBusinessLeadReviewPage =
    projectDetailsReturnPageValue === "businessLeads" ||
    projectDetailsReturnPageValue === "businessDashboard";

  const memoryStats = {
    updates: jobRecords.filter((item) => item.type === "update").length,
    photos: jobRecords.filter((item) => item.type === "photoWorkflow").length,
    approvals: jobRecords.filter((item) => item.type === "approval").length,
    payments: jobRecords.filter((item) => item.type === "payment").length,
    materials: jobRecords.filter((item) => item.type === "materials").length,
    issues: jobRecords.filter(
      (item) => item.workflowType === "issue" || item.title?.toLowerCase().includes("issue")
    ).length,
    completions: jobRecords.filter(
      (item) => item.workflowType === "completion" || item.title?.toLowerCase().includes("completion")
    ).length,
  };

  const liveProjectStatus = memoryStats.completions > 0
    ? "Completed"
    : memoryStats.issues > 0
    ? "Issue documented"
    : memoryStats.payments > 0
    ? "Payment pending"
    : memoryStats.updates > 0 || memoryStats.photos > 0
    ? "In progress"
    : isProfessionalProject
    ? post?.status || "Active"
    : "Open Request";

  const latestActivity = jobRecords[0] || null;

  useEffect(() => {
    const loadJobRecords = () => {
      const activeProject = getSelectedActiveProject();

      const activeProjectId =
        activeProject?.project?.conversationId ||
        activeProject?.conversationId ||
        activeProject?.project?.requestId ||
        activeProject?.requestId ||
        activeProject?.project?.id ||
        activeProject?.id ||
        activeJobSnapshot?.jobId ||
        localStorage.getItem("activeJobId") ||
        localStorage.getItem("selectedPostId") ||
        localStorage.getItem("activeConversationId") ||
        "demo-homeowner-1";

      const conversationId = `active-job-${activeProjectId}`;

      localStorage.setItem("activeConversationId", conversationId);

      const records = getJobRecord(conversationId);

      setJobRecords(Array.isArray(records) ? records : []);
    };

    loadJobRecords();

    window.addEventListener("meetroJobRecordUpdated", loadJobRecords);
    window.addEventListener("storage", loadJobRecords);

    return () => {
      window.removeEventListener("meetroJobRecordUpdated", loadJobRecords);
      window.removeEventListener("storage", loadJobRecords);
    };
  }, []);

  useEffect(() => {
    async function fetchPost() {
      try {
        const postId =
  localStorage.getItem("selectedPostId");

const savedLead =
  localStorage.getItem(
    "selectedQuoteRequest"
  );

const activeProject =
  localStorage.getItem(
    "selectedActiveProject"
  );

const projectDetailsReturnPage =
  localStorage.getItem("projectDetailsReturnPage") || "";

if (
  activeProject &&
  projectDetailsReturnPage === "contractorDashboard"
) {
  const parsedActiveProject = JSON.parse(activeProject);
  setPost(parsedActiveProject.project || parsedActiveProject);
  return;
}

if (savedLead) {
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

            {(isProfessionalProject || isBusinessLeadReviewPage) && (
              <div style={professionalStatusCard}>
                <div style={professionalStatusIcon}>✓</div>

                <div>
                  <strong>
                    {post.status === "scheduled"
                      ? t("projectScheduled")
                      : t("projectUnderReview")}
                  </strong>

                  <p>
                    {t("projectReviewWorkCenterNote")}
                  </p>
                </div>
              </div>
            )}

            <h1 style={projectTitle}>
              {post.title || post.service || post.category || "Project"}
            </h1>

            <div style={projectLifecycleStrip}>
              {[
                { key: "requested", icon: "📨", label: t("requested") },
                { key: "review", icon: "👀", label: t("reviewContact") },
                { key: "quote", icon: "🧾", label: t("quoteAfterReview") },
                { key: "active", icon: "🛠️", label: t("active") },
                { key: "completed", icon: "✅", label: t("done") },
              ].map((step) => {
                const status = String(post.status || "").toLowerCase();

                const activeSteps =
                  status === "completed"
                    ? ["requested", "review", "quote", "active", "completed"]
                    : status === "active"
                    ? ["requested", "review", "quote", "active"]
                    : status === "scheduled"
                    ? ["requested", "review", "quote"]
                    : ["requested", "review"];

                const isActive = activeSteps.includes(step.key);

                return (
                  <div
                    key={step.key}
                    style={{
                      ...projectLifecycleStep,
                      ...(isActive ? projectLifecycleStepActive : {}),
                    }}
                  >
                    <span>{step.icon}</span>
                    <small>{step.label}</small>
                  </div>
                );
              })}
            </div>

            {(() => {
              const projectPhotos = Array.isArray(post.photos)
                ? post.photos
                : [];

              const allPhotos = [
                ...projectPhotos,
                post.image_url,
              ].filter(Boolean);

              const uniquePhotos = [...new Set(allPhotos)];

              if (uniquePhotos.length === 0) return null;

              return (
                <div style={projectPhotoGallery}>
                  <img
                    src={selectedPhoto || uniquePhotos[0]}
                    alt={post.title}
                    style={projectImage}
                    onClick={() => {
                      const activePhoto = selectedPhoto || uniquePhotos[0];
                      const activeIndex = uniquePhotos.indexOf(activePhoto);

                      setExpandedPhotos(uniquePhotos);
                      setExpandedPhotoIndex(activeIndex >= 0 ? activeIndex : 0);
                      setExpandedPhoto(activePhoto);
                    }}
                  />

                  {uniquePhotos.length > 1 && (
                    <>
                      <div style={projectPhotoCountRow}>
                        <div style={projectPhotoCount}>
                          📸 {uniquePhotos.length} {uniquePhotos.length === 1 ? t("projectPhoto") : t("projectPhotos")}
                        </div>

                        <button
                          style={viewAllPhotosButton}
                          onClick={() => {
                            setExpandedPhotos(uniquePhotos);
                            setShowGalleryGrid(true);
                          }}
                        >
                          View All
                        </button>
                      </div>

                      <div style={projectThumbnailRow}>
                        {uniquePhotos.map((photo, index) => (
                          <img
                            key={`${photo}-${index}`}
                            src={photo}
                            alt={`Project photo ${index + 1}`}
                            style={projectThumbnail}
                            onClick={() => setSelectedPhoto(photo)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {showGalleryGrid && (
              <div style={photoModalOverlay} onClick={() => setShowGalleryGrid(false)}>
                <div style={galleryGridCard} onClick={(event) => event.stopPropagation()}>
                  <button style={photoModalClose} onClick={() => setShowGalleryGrid(false)}>
                    ×
                  </button>

                  <h3 style={galleryGridTitle}>Project Photos</h3>

                  <div style={galleryGrid}>
                    {expandedPhotos.map((photo, index) => (
                      <button
                        key={`${photo}-grid-${index}`}
                        style={galleryGridItem}
                        onClick={() => {
                          setSelectedPhoto(photo);
                          setExpandedPhoto(photo);
                          setExpandedPhotoIndex(index);
                          setShowGalleryGrid(false);
                        }}
                      >
                        <img
                          src={photo}
                          alt={`Project photo ${index + 1}`}
                          style={galleryGridImage}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {expandedPhoto && (
              <div style={photoModalOverlay} onClick={() => setExpandedPhoto("")}>
                <div
                  style={photoModalCard}
                  onClick={(event) => event.stopPropagation()}
                  onTouchStart={(event) => {
                    setTouchStartX(event.touches[0].clientX);
                  }}
                  onTouchEnd={(event) => {
                    if (touchStartX === null || expandedPhotos.length <= 1) return;

                    const touchEndX = event.changedTouches[0].clientX;
                    const swipeDistance = touchStartX - touchEndX;

                    if (Math.abs(swipeDistance) < 45) {
                      setTouchStartX(null);
                      return;
                    }

                    const nextIndex =
                      swipeDistance > 0
                        ? expandedPhotoIndex === expandedPhotos.length - 1
                          ? 0
                          : expandedPhotoIndex + 1
                        : expandedPhotoIndex === 0
                        ? expandedPhotos.length - 1
                        : expandedPhotoIndex - 1;

                    const nextPhoto = expandedPhotos[nextIndex];

                    setExpandedPhotoIndex(nextIndex);
                    setExpandedPhoto(nextPhoto);
                    setSelectedPhoto(nextPhoto);
                    setTouchStartX(null);
                  }}
                >
                  <button style={photoModalClose} onClick={() => setExpandedPhoto("")}>
                    ×
                  </button>

                  {expandedPhotos.length > 1 && (
                    <div style={photoModalCounter}>
                      {expandedPhotoIndex + 1} / {expandedPhotos.length}
                    </div>
                  )}

                  {expandedPhotos.length > 1 && (
                    <button
                      style={{ ...photoNavButton, left: "12px" }}
                      onClick={() => {
                        const nextIndex =
                          expandedPhotoIndex === 0
                            ? expandedPhotos.length - 1
                            : expandedPhotoIndex - 1;

                        const nextPhoto = expandedPhotos[nextIndex];

                        setExpandedPhotoIndex(nextIndex);
                        setExpandedPhoto(nextPhoto);
                        setSelectedPhoto(nextPhoto);
                      }}
                    >
                      ‹
                    </button>
                  )}

                  <img
                    src={expandedPhoto}
                    alt={t("expandedProjectPhoto")}
                    style={photoModalImage}
                  />

                  {expandedPhotos.length > 1 && (
                    <button
                      style={{ ...photoNavButton, right: "12px" }}
                      onClick={() => {
                        const nextIndex =
                          expandedPhotoIndex === expandedPhotos.length - 1
                            ? 0
                            : expandedPhotoIndex + 1;

                        const nextPhoto = expandedPhotos[nextIndex];

                        setExpandedPhotoIndex(nextIndex);
                        setExpandedPhoto(nextPhoto);
                        setSelectedPhoto(nextPhoto);
                      }}
                    >
                      ›
                    </button>
                  )}
                </div>
              </div>
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

                <strong style={{ color: "#16a34a" }}>
                  {liveProjectStatus}
                </strong>
              </div>

              <div style={infoRow}>
                <span>⚡ Response</span>

                <strong>{t("fastResponse")}</strong>
              </div>
            </div>

            {isProfessionalProject && post.acceptedQuote && (
              <div style={acceptedQuoteBox}>
                <span>Accepted Quote</span>
                <strong>${post.acceptedQuote.amount || 0}</strong>
              </div>
            )}

            <div style={aiSummaryBox}>
              <div style={aiSummaryIcon}>🤖</div>

              <div>
                <strong>AI Project Summary</strong>

                <p>
                  {jobRecords.length === 0
                    ? "No project memory has been saved yet. Updates, photos, approvals, materials, and payments saved from the conversation will appear here."
                    : `This project has ${jobRecords.length} saved workflow item${jobRecords.length === 1 ? "" : "s"}: ${memoryStats.photos} photo record${memoryStats.photos === 1 ? "" : "s"}, ${memoryStats.issues} issue${memoryStats.issues === 1 ? "" : "s"}, ${memoryStats.approvals} approval${memoryStats.approvals === 1 ? "" : "s"}, ${memoryStats.payments} payment request${memoryStats.payments === 1 ? "" : "s"}, and ${memoryStats.materials} material note${memoryStats.materials === 1 ? "" : "s"}.`}
                </p>

                {jobRecords.length > 0 && (
                  <div style={statusChipWrap}>
                    {memoryStats.issues > 0 && (
                      <span style={warningChip}>⚠️ {memoryStats.issues} issue</span>
                    )}

                    {memoryStats.photos > 0 && (
                      <span style={infoChip}>📸 {memoryStats.photos} photos</span>
                    )}

                    {memoryStats.payments > 0 && (
                      <span style={moneyChip}>💵 payment</span>
                    )}

                    {memoryStats.materials > 0 && (
                      <span style={infoChip}>🧰 materials</span>
                    )}

                    {memoryStats.completions > 0 && (
                      <span style={successChip}>✅ completed</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {latestActivity && (
              <div style={latestActivityBox}>
                <div style={latestActivityLabel}>Latest Activity</div>

                <div style={latestActivityContent}>
                  <div style={latestActivityIcon}>
                    {latestActivity.type === "approval" && "✅"}
                    {latestActivity.type === "payment" && "💵"}
                    {latestActivity.type === "materials" && "🧰"}
                    {latestActivity.type === "location" && "📍"}
                    {latestActivity.type === "scan" && "📄"}
                    {latestActivity.type === "photoWorkflow" && "📸"}
                    {latestActivity.type === "update" && "📣"}
                  </div>

                  <div>
                    <strong>{latestActivity.title}</strong>
                    <p>{latestActivity.subtitle}</p>
                    <span>{latestActivity.time || "Saved"}</span>
                  </div>
                </div>

                {latestActivity.imageUrl && (
                  <img
                    src={latestActivity.imageUrl}
                    alt=""
                    style={latestActivityImage}
                  />
                )}
              </div>
            )}

            <div style={jobMemoryBox}>
              <div style={jobMemoryHeader}>
                <strong>📁 Project Memory</strong>
                <span>{jobRecords.length} saved</span>
              </div>

              {jobRecords.length === 0 ? (
                <p style={jobMemoryEmpty}>
                  Saved updates, photos, approvals, materials, and payments will appear here.
                </p>
              ) : (
                <div style={jobMemoryList}>
                  {jobRecords.slice(0, 5).map((item) => (
                    <div key={item.id} style={memoryTimelineItem}>
                      <div style={memoryTimelineIcon}>
                        {item.type === "approval" && "✅"}
                        {item.type === "payment" && "💵"}
                        {item.type === "materials" && "🧰"}
                        {item.type === "location" && "📍"}
                        {item.type === "scan" && "📄"}
                        {item.type === "photoWorkflow" && "📸"}
                        {item.type === "update" && "📣"}
                      </div>

                      <div style={memoryTimelineBody}>
                        <div style={memoryTimelineTop}>
                          <strong>{item.title}</strong>
                          <span>{item.time || "Saved"}</span>
                        </div>

                        <p>{item.subtitle}</p>

                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt=""
                            style={memoryTimelineImage}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={projectPrimaryActions}>
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

                  const conversationId =
                    post.conversationId ||
                    post.requestId ||
                    post.id ||
                    activeJobSnapshot?.jobId ||
                    localStorage.getItem("activeJobId") ||
                    "project-conversation";

                  localStorage.setItem("activeConversationId", String(conversationId));
                  localStorage.setItem(
                    "activeConversationName",
                    post.username || post.customer || post.email || "Customer"
                  );
                  localStorage.setItem("meetroConversationType", "activeJob");
                  localStorage.setItem("conversationReturnPage", "projectDetails");
                  localStorage.setItem("returnPage", "projectDetails");

                  setPage("conversationThread");
                }}
                style={messageButton}
              >
                💬 {(isProfessionalProject || isBusinessLeadReviewPage)
                  ? t("contactCustomer")
                  : t("openProjectConversation")}
              </button>

              {(isProfessionalProject || isBusinessLeadReviewPage) && post.status !== "active" && post.status !== "completed" && (
                <button
                  style={schedulePrimaryButton}
                  onClick={() => {
                    localStorage.setItem(
                      "selectedWorkCenterRequest",
                      JSON.stringify(post)
                    );

                    localStorage.setItem("meetroWorkCenterTab", "schedule");
                    localStorage.setItem("activeWorkCenterTab", "schedule");
                    localStorage.setItem("leadWorkflowStage", "customer_contact");
                    localStorage.setItem("leadWorkflowIntent", "schedule_before_quote");

                    setPage("contractorDashboard");
                  }}
                >
                  📅 {t("scheduleVisitCall")}
                </button>
              )}
            </div>

            {(isProfessionalProject || isBusinessLeadReviewPage) && (
              <div style={projectActionGrid}>

                {post.status === "scheduled" && (
                  <button
                    style={startProjectButton}
                    onClick={() => {
                      const requestId = post.requestId || post.id;

                      const homeownerRequests = JSON.parse(
                        localStorage.getItem("homeownerRequests") || "[]"
                      );

                      const updatedRequests = homeownerRequests.map((item) => {
                        const itemId = item.requestId || item.id;

                        if (itemId !== requestId) return item;

                        return {
                          ...item,
                          status: "active",
                          startedAt: new Date().toISOString(),
                        };
                      });

                      localStorage.setItem(
                        "homeownerRequests",
                        JSON.stringify(updatedRequests)
                      );

                      saveSelectedActiveProject({
                        ...activeProjectData,
                        status: "active",
                        project: {
                          ...post,
                          status: "active",
                          startedAt: new Date().toISOString(),
                        },
                      });

                      window.dispatchEvent(new Event("storage"));
                      window.location.reload();
                    }}
                  >
                    ▶ {t("activateProject")}
                  </button>
                )}

                {post.status === "active" && (
                  <button
                    style={completeProjectButton}
                    onClick={() => {
                      const requestId = post.requestId || post.id;

                      const homeownerRequests = JSON.parse(
                        localStorage.getItem("homeownerRequests") || "[]"
                      );

                      const updatedRequests = homeownerRequests.map((item) => {
                        const itemId = item.requestId || item.id;

                        if (itemId !== requestId) return item;

                        return {
                          ...item,
                          status: "completed",
                          completedAt: new Date().toISOString(),
                          needsReview: true,
                        };
                      });

                      localStorage.setItem(
                        "homeownerRequests",
                        JSON.stringify(updatedRequests)
                      );

                      const completedProjects = JSON.parse(
                        localStorage.getItem("completedProjects") || "[]"
                      );

                      const acceptedAmount =
                        Number(
                          post?.acceptedQuote?.amount ||
                          post?.quoteAmount ||
                          0
                        );

                      const completedProjectRecord = {
                        ...post,
                        requestId,
                        status: "completed",
                        completedAt: new Date().toISOString(),
                        revenue: acceptedAmount,
                        source: "homeownerProject",
                      };

                      localStorage.setItem(
                        "completedProjects",
                        JSON.stringify([
                          completedProjectRecord,
                          ...completedProjects,
                        ])
                      );

                      const currentCompletedCount =
                        Number(
                          localStorage.getItem("completedJobsCount") || "0"
                        );

                      localStorage.setItem(
                        "completedJobsCount",
                        String(currentCompletedCount + 1)
                      );

                      const currentRevenue =
                        Number(
                          localStorage.getItem("totalJobRevenue") || "0"
                        );

                      localStorage.setItem(
                        "totalJobRevenue",
                        String(currentRevenue + acceptedAmount)
                      );

                      saveSelectedActiveProject({
                        ...activeProjectData,
                        status: "completed",
                        project: {
                          ...post,
                          status: "completed",
                          completedAt: new Date().toISOString(),
                          needsReview: true,
                        },
                      });

                      localStorage.setItem(
                        "homeownerNeedsReview",
                        "true"
                      );

                      localStorage.setItem(
                        "lastCompletedProject",
                        JSON.stringify(completedProjectRecord)
                      );

                      window.dispatchEvent(new Event("storage"));
                      window.location.reload();
                    }}
                  >
                    ✅ Mark Completed
                  </button>
                )}
              </div>
            )}


          </div>
        )}

        <SafeBackBar setPage={setPage} fallback={localStorage.getItem("projectDetailsReturnPage") || "discover"} />

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
  maxWidth: "820px",
  padding: "18px",
  paddingBottom: "210px",
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

const professionalStatusCard = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  background: "linear-gradient(135deg,#ecfdf5,#ffffff)",
  border: "1.5px solid #86efac",
  borderRadius: "20px",
  padding: "14px",
  marginBottom: "18px",
  color: "#065f46",
  textAlign: "left",
};

const professionalStatusIcon = {
  width: "38px",
  height: "38px",
  borderRadius: "50%",
  background: "#16a34a",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  flexShrink: 0,
};



const aiSummaryBox = {
  display: "flex",
  gap: "10px",
  alignItems: "flex-start",
  background: "linear-gradient(135deg,#eef2ff,#ffffff)",
  border: "1px solid rgba(124,58,237,.12)",
  borderRadius: "20px",
  padding: "12px",
  marginBottom: "14px",
  textAlign: "left",
  boxShadow: "0 8px 18px rgba(91,61,245,.05)",
};


const statusChipWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  marginTop: "8px",
};

const infoChip = {
  background: "#eef2ff",
  color: "#5b3df5",
  padding: "6px 9px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "900",
};

const warningChip = {
  background: "#fff7ed",
  color: "#c2410c",
  padding: "6px 9px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "900",
};

const moneyChip = {
  background: "#ecfdf5",
  color: "#047857",
  padding: "6px 9px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "900",
};

const successChip = {
  background: "#dcfce7",
  color: "#166534",
  padding: "6px 9px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "900",
};

const aiSummaryIcon = {
  width: "38px",
  height: "38px",
  borderRadius: "14px",
  background: "linear-gradient(135deg,#5b3df5,#7c3aed)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  flexShrink: 0,
};


const latestActivityBox = {
  background: "linear-gradient(135deg,#111827,#334155)",
  color: "white",
  borderRadius: "22px",
  padding: "14px",
  marginBottom: "14px",
  textAlign: "left",
  boxShadow: "0 12px 26px rgba(15,23,42,0.16)",
};

const latestActivityLabel = {
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  opacity: 0.885,
  marginBottom: "12px",
};

const latestActivityContent = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
};

const latestActivityIcon = {
  width: "44px",
  height: "44px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.14)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  flexShrink: 0,
};

const latestActivityImage = {
  width: "100%",
  maxHeight: "220px",
  objectFit: "cover",
  borderRadius: "18px",
  marginTop: "14px",
};

const jobMemoryBox = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "12px",
  marginBottom: "14px",
  textAlign: "left",
  boxShadow: "0 6px 16px rgba(15,23,42,.035)",
};

const jobMemoryHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
  color: "#111827",
};

const jobMemoryEmpty = {
  margin: 0,
  color: "#667085",
  fontWeight: "700",
  lineHeight: 1.5,
};

const jobMemoryList = {
  display: "grid",
  gap: "10px",
};


const memoryTimelineItem = {
  display: "grid",
  gridTemplateColumns: "42px 1fr",
  gap: "12px",
  alignItems: "flex-start",
};

const memoryTimelineIcon = {
  width: "38px",
  height: "38px",
  borderRadius: "16px",
  background: "#eef2ff",
  color: "#5b3df5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  boxShadow: "0 8px 16px rgba(91,61,245,0.12)",
};

const memoryTimelineBody = {
  background: "#f8fafc",
  border: "1px solid #eef2f7",
  borderRadius: "16px",
  padding: "11px",
};

const memoryTimelineTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "6px",
  color: "#111827",
};

const memoryTimelineImage = {
  width: "100%",
  maxHeight: "180px",
  objectFit: "cover",
  borderRadius: "16px",
  marginTop: "10px",
};

const jobMemoryItem = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  background: "#f8fafc",
  borderRadius: "16px",
  padding: "12px",
};


const acceptedQuoteBox = {
  background: "#f8f7ff",
  border: "1px solid #ede9fe",
  borderRadius: "18px",
  padding: "14px",
  marginBottom: "14px",
  display: "flex",
  justifyContent: "space-between",
  color: "#5b3df5",
  fontWeight: "900",
};

const cardStyle = {
  background: "rgba(255,255,255,0.96)",
  backdropFilter: "blur(18px)",
  border: "1px solid rgba(124,58,237,.10)",
  borderRadius: "28px",
  padding: "20px",
  color: "#111827",
  textAlign: "left",
  boxShadow: "0 14px 34px rgba(15,23,42,.07)",
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
  justifyContent: "flex-start",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const tagStyle = {
  background: "#f3efff",
  color: "#5b3df5",
  padding: "7px 11px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
};

const projectTitle = {
  marginTop: 0,
  fontSize: "30px",
  lineHeight: "1.06",
  wordBreak: "break-word",
  textAlign: "left",
  marginBottom: "16px",
  color: "#111827",
  fontWeight: "950",
  letterSpacing: "-0.03em",
};

const photoModalOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 90,
  background: "rgba(15, 23, 42, 0.82)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "18px",
};

const photoModalCard = {
  position: "relative",
  width: "100%",
  maxWidth: "720px",
  maxHeight: "88vh",
  borderRadius: "24px",
  overflow: "hidden",
  background: "#111827",
  boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
};

const photoModalClose = {
  position: "absolute",
  top: "12px",
  right: "12px",
  zIndex: 2,
  width: "38px",
  height: "38px",
  borderRadius: "999px",
  border: "none",
  background: "rgba(255,255,255,0.92)",
  color: "#111827",
  fontSize: "26px",
  fontWeight: "900",
  cursor: "pointer",
  lineHeight: "34px",
};

const photoModalCounter = {
  position: "absolute",
  top: "14px",
  left: "14px",
  zIndex: 2,
  background: "rgba(255,255,255,0.92)",
  color: "#111827",
  borderRadius: "999px",
  padding: "7px 12px",
  fontSize: "13px",
  fontWeight: "900",
};

const photoNavButton = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 2,
  width: "42px",
  height: "42px",
  borderRadius: "999px",
  border: "none",
  background: "rgba(255,255,255,0.92)",
  color: "#111827",
  fontSize: "34px",
  fontWeight: "900",
  cursor: "pointer",
  lineHeight: "34px",
};

const photoModalImage = {
  width: "100%",
  maxHeight: "88vh",
  objectFit: "contain",
  display: "block",
  transition: "opacity 0.22s ease, transform 0.22s ease",
  animation: "photoFadeIn 0.22s ease",
};

const projectLifecycleStrip = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: "8px",
  margin: "0 0 16px",
};

const projectLifecycleStep = {
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: "16px",
  padding: "9px 6px",
  display: "grid",
  gap: "4px",
  placeItems: "center",
  color: "#475569",
  fontWeight: "900",
  fontSize: "11px",
};

const projectLifecycleStepActive = {
  background: "linear-gradient(135deg,#f5f3ff,#ffffff)",
  border: "1px solid rgba(91,61,245,.18)",
  color: "#5b3df5",
  boxShadow: "0 6px 14px rgba(91,61,245,.08)",
};

const projectPhotoGallery = {
  marginBottom: "22px",
};

const projectPhotoCountRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  margin: "10px 0 8px",
};

const viewAllPhotosButton = {
  border: "none",
  borderRadius: "999px",
  padding: "7px 12px",
  background: "#efe7ff",
  color: "#5b3df5",
  fontSize: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const galleryGridCard = {
  position: "relative",
  width: "calc(100% - 28px)",
  maxWidth: "760px",
  maxHeight: "78vh",
  overflowY: "auto",
  borderRadius: "26px",
  background: "white",
  padding: "18px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
  marginBottom: "80px",
};

const galleryGridTitle = {
  margin: "2px 48px 14px 0",
  fontSize: "21px",
  fontWeight: "950",
  color: "#111827",
};

const galleryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: "10px",
};

const galleryGridItem = {
  border: "none",
  padding: 0,
  borderRadius: "16px",
  overflow: "hidden",
  background: "#f8f7ff",
  cursor: "pointer",
};

const galleryGridImage = {
  width: "100%",
  height: "112px",
  objectFit: "cover",
  display: "block",
};

const projectPhotoCount = {
  margin: "10px 0 8px",
  fontSize: "13px",
  fontWeight: "900",
  color: "#5b3df5",
  textAlign: "center",
};

const projectThumbnailRow = {
  display: "flex",
  gap: "10px",
  overflowX: "auto",
  padding: "4px 2px 8px",
};

const projectThumbnail = {
  width: "82px",
  height: "70px",
  objectFit: "cover",
  borderRadius: "16px",
  border: "2px solid #ede9fe",
  cursor: "pointer",
  flexShrink: 0,
  transition: "transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease",
};

const photoAnimationStyle = document.createElement("style");
photoAnimationStyle.innerHTML = `
@keyframes photoFadeIn {
  from {
    opacity: 0.882;
    transform: scale(0.985);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
`;
if (!document.getElementById("meetro-photo-animation-style")) {
  photoAnimationStyle.id = "meetro-photo-animation-style";
  document.head.appendChild(photoAnimationStyle);
}

const projectImage = {
  width: "100%",
  maxHeight: "360px",
  objectFit: "cover",
  borderRadius: "22px",
  marginBottom: "16px",
  boxShadow: "0 10px 24px rgba(15,23,42,.10)",
};

const projectDescription = {
  color: "#475569",
  lineHeight: "1.55",
  fontSize: "15px",
  textAlign: "left",
  margin: "0 0 18px",
  fontWeight: "650",
};

const infoBox = {
  background: "linear-gradient(135deg,#f8f7ff,#ffffff)",
  border: "1px solid rgba(124,58,237,.10)",
  borderRadius: "18px",
  padding: "12px",
  display: "grid",
  gap: "8px",
  marginBottom: "14px",
};

const infoRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  color: "#374151",
  fontSize: "12px",
  fontWeight: "800",
};

const projectActionGrid = {
  display: "grid",
  gap: "12px",
  marginTop: "14px",
};

const startProjectButton = {
  width: "100%",
  padding: "16px 20px",
  background: "linear-gradient(135deg,#16a34a,#22c55e)",
  color: "white",
  border: "none",
  borderRadius: "18px",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(34,197,94,0.24)",
};

const completeProjectButton = {
  width: "100%",
  padding: "16px 20px",
  background: "linear-gradient(135deg,#111827,#334155)",
  color: "white",
  border: "none",
  borderRadius: "18px",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(15,23,42,0.22)",
};

const secondaryButton = {
  width: "100%",
  marginTop: "12px",
  padding: "15px 20px",
  background: "white",
  color: "#5b3df5",
  border: "1px solid #ddd6fe",
  borderRadius: "18px",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
};

const projectPrimaryActions = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
  marginTop: "20px",
  marginBottom: "18px",
};

const schedulePrimaryButton = {
  border: "none",
  borderRadius: "22px",
  padding: "18px 20px",
  background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
  color: "white",
  fontWeight: 900,
  fontSize: "1rem",
  boxShadow: "0 14px 28px rgba(37,99,235,0.24)",
};

const messageButton = {
  width: "100%",
  marginTop: "4px",
  padding: "15px 18px",
  background: "linear-gradient(135deg,#5b3df5,#7b61ff)",
  color: "white",
  border: "none",
  borderRadius: "16px",
  fontWeight: "950",
  fontSize: "15px",
  cursor: "pointer",
  boxShadow: "0 12px 22px rgba(91,61,245,0.22)",
};

export default ProjectDetails;
