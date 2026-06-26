export const BUSINESS_PORTFOLIO_STORAGE_KEY = "contractorProjects";

export const BUSINESS_PORTFOLIO_STORAGE_KEYS = Object.freeze([
  "businessGallery",
  "businessGalleryPhotos",
  "projectGallery",
  "projectGalleryPhotos",
  BUSINESS_PORTFOLIO_STORAGE_KEY,
  "meetroBusinessPhotos",
  "meetroProjectGallery",
  "uploadedBusinessPhotos",
  "uploadedGalleryPhotos",
]);

export function getBusinessPortfolioProjectImages(project = {}) {
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

  if (Array.isArray(project?.images) && project.images.length > 0) {
    return project.images.filter(Boolean);
  }

  if (project?.image_url) return [project.image_url];
  if (project?.imageUrl) return [project.imageUrl];

  return [];
}

function normalizeProjectKeyPart(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getBusinessPortfolioProjectStableId(
  contractorProfile = {},
  project = {},
  index = 0,
  fallbackBusinessName = ""
) {
  const existingId =
    project.id ||
    project.projectId ||
    project.project_id ||
    project.localId ||
    project.local_id;

  if (existingId) return String(existingId);

  const businessId =
    contractorProfile.id ||
    contractorProfile.contractor_id ||
    contractorProfile.contractorId ||
    contractorProfile.businessId ||
    contractorProfile.business_id ||
    fallbackBusinessName ||
    "portfolio";
  const images = getBusinessPortfolioProjectImages(project);
  const signature = [
    businessId,
    project.title || project.name || project.projectTitle || project.project_title,
    project.createdAt || project.created_at || project.date || project.completedDate,
    images[0] || project.image_url || project.imageUrl || index,
  ]
    .map(normalizeProjectKeyPart)
    .filter(Boolean)
    .join("-");

  return signature || `${normalizeProjectKeyPart(businessId)}-portfolio-${index}`;
}

export function normalizeBusinessPortfolioProjects(
  contractorProfile = {},
  profileProjects = [],
  fallbackBusinessName = ""
) {
  if (!contractorProfile || !Array.isArray(profileProjects)) return [];

  const businessId =
    contractorProfile.id || contractorProfile.contractor_id || "";
  const businessName =
    contractorProfile.business_name ||
    contractorProfile.name ||
    fallbackBusinessName ||
    "";

  return profileProjects
    .map((project, index) => {
      const images = getBusinessPortfolioProjectImages(project);
      const stableId = getBusinessPortfolioProjectStableId(
        contractorProfile,
        project,
        index,
        fallbackBusinessName || businessName
      );

      return {
        ...project,
        id: stableId,
        localId: project.localId || project.local_id || stableId,
        businessId,
        businessName,
        contractorId: businessId,
        contractorName: businessName,
        image_url: images[0] || project.image_url || project.imageUrl || "",
        image_urls: images,
        spotlightFeatured: Boolean(
          project.spotlightFeatured ||
            project.spotlight_featured ||
            project.featuredInSpotlight ||
            project.featured_in_spotlight
        ),
      };
    })
    .filter((project) => project.image_url || project.image_urls.length > 0);
}

export function readBusinessPortfolioStorage(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(
      storage?.getItem(BUSINESS_PORTFOLIO_STORAGE_KEY) || "[]"
    );
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistBusinessPortfolioProjects(
  contractorProfile = {},
  profileProjects = [],
  {
    storage = globalThis.localStorage,
    fallbackBusinessName = "",
  } = {}
) {
  if (!storage) return [];

  let normalizedProjects = normalizeBusinessPortfolioProjects(
    contractorProfile,
    profileProjects,
    fallbackBusinessName
  );
  const businessId =
    contractorProfile.id || contractorProfile.contractor_id || "";
  const businessName =
    contractorProfile.business_name ||
    contractorProfile.name ||
    fallbackBusinessName ||
    "";
  const existingProjects = readBusinessPortfolioStorage(storage);
  const existingById = new Map(
    existingProjects.map((project) => [String(project.id || ""), project])
  );
  const existingByLocalId = new Map(
    existingProjects.map((project) => [
      String(project.localId || project.local_id || ""),
      project,
    ])
  );
  const existingByTitle = new Map(
    existingProjects.map((project) => [
      String(project.title || "").trim().toLowerCase(),
      project,
    ])
  );

  normalizedProjects = normalizedProjects.map((project) => {
    const existingProject =
      existingById.get(String(project.id || "")) ||
      existingByLocalId.get(String(project.localId || "")) ||
      existingByTitle.get(String(project.title || "").trim().toLowerCase());

    return {
      ...project,
      spotlightFeatured: Boolean(
        project.spotlightFeatured || existingProject?.spotlightFeatured
      ),
    };
  });

  const otherProjects = existingProjects.filter((project) => {
    const projectBusinessId = String(
      project.businessId || project.business_id || project.contractorId || ""
    );
    const projectBusinessName = String(
      project.businessName || project.business_name || project.contractorName || ""
    ).toLowerCase();
    const sameBusinessId =
      Boolean(businessId) && projectBusinessId === String(businessId);
    const sameBusinessName =
      Boolean(businessName) &&
      projectBusinessName === String(businessName).toLowerCase();

    return !(sameBusinessId || sameBusinessName);
  });

  storage.setItem(
    BUSINESS_PORTFOLIO_STORAGE_KEY,
    JSON.stringify([...normalizedProjects, ...otherProjects])
  );

  return normalizedProjects;
}

export function readAllBusinessPortfolioItems(storage = globalThis.localStorage) {
  let collected = [];

  BUSINESS_PORTFOLIO_STORAGE_KEYS.forEach((key) => {
    try {
      const saved = JSON.parse(storage?.getItem(key) || "[]");
      if (Array.isArray(saved)) {
        collected = [
          ...collected,
          ...saved.map((item) =>
            item && typeof item === "object"
              ? { ...item, __spotlightPortfolioSource: key }
              : item
          ),
        ];
      }
    } catch {}
  });

  return collected;
}
