import { getBusinessIdentityProjection } from "./businessIdentity.js";
import { getBusinessPortfolioProjectImages } from "./businessPortfolioStorage.js";
import {
  getProfessionalReviews,
  getProfessionalReviewStats,
} from "./reviewStorage.js";

function safeStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPublicSafePortfolioProject(project = {}) {
  const visibility = String(
    project.visibility ||
      project.publicVisibility ||
      project.public_visibility ||
      project.status ||
      ""
  ).toLowerCase();

  if (
    project.private === true ||
    project.isPrivate === true ||
    project.public === false ||
    project.is_public === false
  ) {
    return false;
  }

  return ![
    "private",
    "draft",
    "deleted",
    "archived",
    "work_center_only",
    "work-center-only",
  ].includes(visibility);
}

function normalizePortfolioProject(project = {}) {
  const images = getBusinessPortfolioProjectImages(project);

  return {
    ...project,
    image_url: images[0] || project.image_url || project.imageUrl || "",
    image_urls: images,
    imageCount: images.length,
    spotlightFeatured: Boolean(
      project.spotlightFeatured ||
        project.spotlight_featured ||
        project.featuredInSpotlight ||
        project.featured_in_spotlight
    ),
  };
}

function collectMediaUrls(value, urls = []) {
  if (!value) return urls;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => collectMediaUrls(item, urls));
        return urls;
      }
    } catch {}
    urls.push(value);
    return urls;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectMediaUrls(item, urls));
    return urls;
  }

  if (typeof value === "object") {
    const projectImages = getBusinessPortfolioProjectImages(value);
    if (projectImages.length > 0) {
      projectImages.forEach((item) => collectMediaUrls(item, urls));
      return urls;
    }

    [
      value.url,
      value.src,
      value.secure_url,
      value.imageUrl,
      value.image_url,
      value.photoUrl,
      value.photo_url,
    ].forEach((item) => collectMediaUrls(item, urls));
  }

  return urls;
}

export function getBusinessPortfolioProofProjection(source = {}, options = {}) {
  const storage = options.storage ?? safeStorage();
  const identity = getBusinessIdentityProjection(source, {
    storage,
    translate: options.translate,
    fallbackName: options.fallbackName,
    useStorageFallback: options.useStorageFallback,
  });
  const projectCandidates = [
    ...asArray(source.businessPortfolio),
    ...asArray(source.business_portfolio),
    ...asArray(source.projectGallery),
    ...asArray(source.project_gallery),
    ...asArray(source.projects),
  ];
  const projects = projectCandidates
    .map(normalizePortfolioProject)
    .filter((project) => project.imageCount > 0)
    .filter(isPublicSafePortfolioProject);
  const standaloneMediaUrls = collectMediaUrls([
    source.gallery,
    source.photos,
    source.portfolioImages,
    source.portfolio_images,
    source.media,
    source.images,
  ]);
  const mediaUrls = [
    ...new Set([
      ...projects.flatMap((project) => project.image_urls),
      ...standaloneMediaUrls,
    ].filter(Boolean)),
  ];
  const featuredProjects = projects.filter((project) => project.spotlightFeatured);
  const featuredProject = featuredProjects[0] || projects[0] || null;
  const featuredProjectMediaUrls = featuredProject
    ? getBusinessPortfolioProjectImages(featuredProject)
    : [];
  const reviews = Array.isArray(options.reviews)
    ? options.reviews
    : getProfessionalReviews(
        {
          professionalId: identity.id || source.id || source.businessId || source.contractorId || "",
          professionalName: identity.businessName,
        },
        storage
      );
  const reviewStats = getProfessionalReviewStats(reviews);

  return {
    businessIdentity: identity,
    projects,
    publicProjects: projects,
    projectCount: projects.length,
    photoCount: mediaUrls.length,
    mediaUrls,
    featuredProjects,
    featuredProject,
    featuredProjectMediaUrls,
    featuredProjectCount: featuredProjects.length,
    reviews,
    mostRecentReview: reviews[0] || null,
    reviewStats,
    averageRating: reviewStats.averageRating,
    reviewCount: reviewStats.totalReviews,
    hasPublicProof: projects.length > 0 || reviewStats.totalReviews > 0,
    trustSummary: identity.verification.publicTrustSummary,
  };
}
