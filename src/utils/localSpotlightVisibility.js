import { canProfessionalSeeLocalLead, isLocalDemoSafeRecord } from "./localLeadVisibility.js";
import {
  BUSINESS_PORTFOLIO_STORAGE_KEYS,
  getBusinessPortfolioProjectImages,
} from "./businessPortfolioStorage.js";
import {
  inferRequestCategory,
  inferServiceDomain,
  normalizeServiceCategory,
  normalizeServiceDomain,
} from "./professionalRequestMatching.js";

export const SPOTLIGHT_PORTFOLIO_STORAGE_KEYS = BUSINESS_PORTFOLIO_STORAGE_KEYS;

const LOCAL_PROFILE_PORTFOLIO_SOURCES = new Set([
  "contractorProjects",
  "projectGallery",
  "projectGalleryPhotos",
  "meetroProjectGallery",
]);

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeServiceCategory).filter(Boolean);
  }

  if (!value) return [];

  return String(value)
    .split(",")
    .map(normalizeServiceCategory)
    .filter(Boolean);
}

function normalizeIdentity(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getBusinessIdentityKeys(business = {}) {
  return [
    business.id,
    business.businessId,
    business.business_id,
    business.contractorId,
    business.contractor_id,
    business.name,
    business.businessName,
    business.business_name,
    business.contractorName,
    business.contractor_name,
  ]
    .map(normalizeIdentity)
    .filter(Boolean);
}

function getPortfolioItemIdentityKeys(item = {}) {
  return [
    item.businessId,
    item.business_id,
    item.contractorId,
    item.contractor_id,
    item.ownerId,
    item.owner_id,
    item.businessName,
    item.business_name,
    item.contractorName,
    item.contractor_name,
    item.ownerName,
  ]
    .map(normalizeIdentity)
    .filter(Boolean);
}

function portfolioItemMatchesBusiness(item = {}, business = {}) {
  const itemKeys = getPortfolioItemIdentityKeys(item);
  if (itemKeys.length === 0) return false;

  const businessKeys = getBusinessIdentityKeys(business);
  return itemKeys.some((key) => businessKeys.includes(key));
}

function parseMaybeJsonArray(value) {
  if (!value || typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function collectMediaUrls(value, urls = []) {
  if (!value) return urls;

  if (typeof value === "string") {
    const parsedArray = parseMaybeJsonArray(value);
    if (parsedArray) {
      parsedArray.forEach((item) => collectMediaUrls(item, urls));
      return urls;
    }

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
      value.images,
      value.media,
      value.photos,
      value.gallery,
      value.portfolio,
      value.imageUrls,
      value.image_urls,
      value.portfolioImages,
      value.portfolio_images,
      value.businessPortfolio,
      value.business_portfolio,
    ].forEach((item) => collectMediaUrls(item, urls));

    [
      value.url,
      value.src,
      value.secure_url,
      value.imageUrl,
      value.image_url,
      value.photoUrl,
      value.photo_url,
      value.coverImage,
      value.cover_image,
      value.thumbnailUrl,
      value.thumbnail_url,
      value.image,
    ].forEach((item) => collectMediaUrls(item, urls));
  }

  return urls;
}

function isLikelyNonWorkMediaUrl(url = "") {
  const normalizedUrl = String(url || "").toLowerCase();
  return [
    "placeholder",
    "logo",
    "brand-preview",
    "portfolio-editor",
    "project-editor",
    "gallery-editor",
    "edit-portfolio",
    "add-project",
    "add-photo",
    "upload-card",
    "upload-ui",
    "editor-placeholder",
    "upload-placeholder",
    "ui-screenshot",
    "screen-shot",
    "screenshot",
  ].some((token) => normalizedUrl.includes(token));
}

function cleanMediaUrls(urls = [], { allowLogoFallback = false } = {}) {
  const seen = new Set();

  return urls
    .map((url) => String(url || "").trim())
    .filter(Boolean)
    .filter((url) => allowLogoFallback || !isLikelyNonWorkMediaUrl(url))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
}

export function getSpotlightMediaUrls(business = {}) {
  const urls = [
    ...getSpotlightMediaForBusiness(business),
    getSpotlightAvatarUrl(business),
  ];

  return cleanMediaUrls(urls, { allowLogoFallback: true });
}

export function getSpotlightMediaForBusiness(business = {}) {
  const projectBuckets = [
    ...(Array.isArray(business.businessPortfolio) ? business.businessPortfolio : []),
    ...(Array.isArray(business.business_portfolio) ? business.business_portfolio : []),
    ...(Array.isArray(business.projects) ? business.projects : []),
    ...(Array.isArray(business.projectGallery) ? business.projectGallery : []),
    ...(Array.isArray(business.project_gallery) ? business.project_gallery : []),
  ];
  const featuredProjects = projectBuckets.filter(
    (project) =>
      project.spotlightFeatured ||
      project.spotlight_featured ||
      project.featuredInSpotlight ||
      project.featured_in_spotlight
  );
  const standardProjects = projectBuckets.filter(
    (project) => !featuredProjects.includes(project)
  );
  const projectPhotos = collectMediaUrls([
    featuredProjects,
    standardProjects,
  ]);
  const legacyProjectPhotos = collectMediaUrls([
    business.businessPortfolio,
    business.business_portfolio,
    business.projects,
    business.projectGallery,
    business.project_gallery,
  ]);
  const galleryPhotos = collectMediaUrls([
    business.gallery,
    business.photos,
  ]);
  const portfolioPhotos = collectMediaUrls([
    business.portfolio,
    business.portfolioImages,
    business.portfolio_images,
    business.media,
    business.images,
  ]);
  const coverUrls = collectMediaUrls([
    business.coverImage,
    business.cover_image,
    business.heroImage,
    business.hero_image,
    business.imageUrl,
    business.image_url,
  ]);
  const fallbackUrls = collectMediaUrls([
    business.coverImage,
    business.cover_image,
    getSpotlightAvatarUrl(business),
  ]);

  const workPhotos = cleanMediaUrls([
    ...projectPhotos,
    ...legacyProjectPhotos,
    ...galleryPhotos,
    ...portfolioPhotos,
    ...coverUrls,
  ]);
  const fallbackPhotos = cleanMediaUrls(fallbackUrls, {
    allowLogoFallback: true,
  }).filter((url) => !workPhotos.includes(url));

  return [...workPhotos, ...fallbackPhotos];
}

export const getSpotlightShowcaseMediaUrls = getSpotlightMediaForBusiness;

export function getSpotlightAvatarUrl(business = {}) {
  return (
    business.logo ||
    business.logoUrl ||
    business.logo_url ||
    business.businessLogo ||
    business.business_logo ||
    business.avatarUrl ||
    business.avatar_url ||
    business.profileImage ||
    business.profile_image ||
    ""
  );
}

export function getSpotlightFeaturedProject(business = {}) {
  const candidates = [
    business.__spotlightFeaturedProject,
    ...(Array.isArray(business.businessPortfolio) ? business.businessPortfolio : []),
    ...(Array.isArray(business.business_portfolio) ? business.business_portfolio : []),
    ...(Array.isArray(business.projects) ? business.projects : []),
    ...(Array.isArray(business.projectGallery) ? business.projectGallery : []),
    ...(Array.isArray(business.project_gallery) ? business.project_gallery : []),
    ...(Array.isArray(business.portfolio) ? business.portfolio : []),
    ...(Array.isArray(business.gallery) ? business.gallery : []),
  ].filter((item) => item && typeof item === "object");

  return (
    candidates.find(
      (item) =>
        (item.spotlightFeatured ||
          item.spotlight_featured ||
          item.featuredInSpotlight ||
          item.featured_in_spotlight) &&
        collectMediaUrls(item, []).length > 0
    ) ||
    candidates.find((item) => collectMediaUrls(item, []).length > 0) ||
    candidates[0] ||
    null
  );
}

export function getSpotlightSlideshowFrame(mediaUrls = [], activeIndex = 0) {
  const urls = Array.isArray(mediaUrls)
    ? mediaUrls.map((url) => String(url || "").trim()).filter(Boolean)
    : [];
  if (urls.length === 0) {
    return {
      url: "",
      index: 0,
      count: 0,
      label: "",
      hasMultiple: false,
    };
  }

  const normalizedIndex =
    Number.isInteger(activeIndex) && activeIndex >= 0
      ? activeIndex % urls.length
      : 0;

  return {
    url: urls[normalizedIndex],
    index: normalizedIndex,
    count: urls.length,
    label: `${normalizedIndex + 1}/${urls.length}`,
    hasMultiple: urls.length > 1,
  };
}

export function getNextSpotlightSlideshowIndex(activeIndex = 0, mediaCount = 0) {
  if (!Number.isInteger(mediaCount) || mediaCount < 2) return 0;
  const normalizedIndex =
    Number.isInteger(activeIndex) && activeIndex >= 0
      ? activeIndex % mediaCount
      : 0;

  return (normalizedIndex + 1) % mediaCount;
}

export function attachSpotlightPortfolioMedia(businesses = [], portfolioItems = []) {
  if (!Array.isArray(businesses) || businesses.length === 0) return [];

  const usablePortfolioItems = Array.isArray(portfolioItems)
    ? portfolioItems.filter((item) => item && typeof item === "object")
    : [];
  const hasSingleBusiness = businesses.length === 1;

  return businesses.map((business) => {
    const scopedItems = usablePortfolioItems.filter((item) => {
      if (portfolioItemMatchesBusiness(item, business)) return true;
      if (
        business.localProfileOwner === true &&
        LOCAL_PROFILE_PORTFOLIO_SOURCES.has(item.__spotlightPortfolioSource)
      ) {
        return true;
      }
      return (
        (hasSingleBusiness || business.localProfileOwner === true) &&
        getPortfolioItemIdentityKeys(item).length === 0
      );
    });

    if (scopedItems.length === 0) return business;

    return {
      ...business,
      __spotlightFeaturedProject:
        business.__spotlightFeaturedProject ||
        scopedItems.find((item) => collectMediaUrls(item, []).length > 0) ||
        scopedItems[0],
      __spotlightPortfolioItemCount: scopedItems.length,
      __spotlightPortfolioSources: [
        ...new Set(
          scopedItems.map((item) => item.__spotlightPortfolioSource || "portfolio registry")
        ),
      ],
      businessPortfolio: [
        ...(Array.isArray(business.businessPortfolio)
          ? business.businessPortfolio
          : []),
        ...(Array.isArray(business.business_portfolio)
          ? business.business_portfolio
          : []),
        ...scopedItems,
      ],
    };
  });
}

export function getSpotlightMediaSourceSummary(business = {}) {
  const projectPhotos = collectMediaUrls([
    business.businessPortfolio,
    business.business_portfolio,
    business.projects,
    business.projectGallery,
    business.project_gallery,
  ]);
  const galleryPhotos = collectMediaUrls([
    business.gallery,
    business.photos,
  ]);
  const portfolioPhotos = collectMediaUrls([
    business.portfolio,
    business.portfolioImages,
    business.portfolio_images,
    business.media,
    business.images,
  ]);
  const coverPhotos = collectMediaUrls([
    business.coverImage,
    business.cover_image,
    business.heroImage,
    business.hero_image,
    business.imageUrl,
    business.image_url,
  ]);
  const logoPhotos = collectMediaUrls([getSpotlightAvatarUrl(business)]);

  return {
    logoImageCount: logoPhotos.filter(Boolean).length,
    coverImageCount: coverPhotos.filter(Boolean).length,
    galleryImageCount: galleryPhotos.filter(Boolean).length,
    portfolioImageCount: portfolioPhotos.filter(Boolean).length,
    projectCount: [
      ...(Array.isArray(business.businessPortfolio) ? business.businessPortfolio : []),
      ...(Array.isArray(business.business_portfolio) ? business.business_portfolio : []),
      ...(Array.isArray(business.projects) ? business.projects : []),
      ...(Array.isArray(business.projectGallery) ? business.projectGallery : []),
      ...(Array.isArray(business.project_gallery) ? business.project_gallery : []),
    ].length,
    projectImageCount: projectPhotos.filter(Boolean).length,
  };
}

export function buildSpotlightProfessionalProfile(business = {}) {
  const category =
    business.category ||
    business.business_category ||
    business.businessCategory ||
    "";
  const serviceCategories = [
    ...normalizeList(business.serviceCategories),
    ...normalizeList(business.service_categories),
    ...normalizeList(business.businessServiceCategories),
    ...normalizeList(business.business_service_categories),
    category,
  ]
    .map(normalizeServiceCategory)
    .filter(Boolean);
  const serviceSpecialties = [
    ...normalizeList(business.serviceSpecialties),
    ...normalizeList(business.service_specialties),
    ...normalizeList(business.businessServiceSpecialties),
    ...normalizeList(business.business_service_specialties),
    ...normalizeList(business.specialties),
  ];
  const serviceDomain =
    normalizeServiceDomain(
      business.serviceDomain ||
        business.service_domain ||
        business.businessServiceDomain ||
        business.business_service_domain ||
        business.domain
    ) ||
    inferServiceDomain(serviceSpecialties[0] || serviceCategories[0] || category);

  return {
    ...business,
    category,
    businessCategory: business.businessCategory || category,
    serviceDomain,
    businessServiceDomain: business.businessServiceDomain || serviceDomain,
    serviceCategories: serviceCategories.length > 0 ? serviceCategories : [category].filter(Boolean),
    businessServiceCategories:
      business.businessServiceCategories || serviceCategories,
    serviceSpecialties,
    businessServiceSpecialties:
      business.businessServiceSpecialties || serviceSpecialties,
    city: business.city || business.primaryCity || business.businessPrimaryCity || "",
    zip:
      business.zip ||
      business.zipCode ||
      business.serviceZipCodes ||
      business.businessZipCodes ||
      "",
    serviceCities:
      business.serviceCities || business.businessServiceCities || business.city || "",
    serviceZipCodes:
      business.serviceZipCodes || business.businessZipCodes || business.zip || "",
  };
}

export function getSpotlightRequestContexts(activeRequests = [], historyRequests = []) {
  return [...activeRequests, ...historyRequests]
    .map((request) => {
      const category = inferRequestCategory(request);

      return category
        ? {
            ...request,
            category,
            requestCategory: request.requestCategory || request.request_category || category,
            serviceDomain: request.serviceDomain || request.service_domain || "",
            serviceSpecialty: request.serviceSpecialty || request.service_specialty || "",
            city: request.city || "",
            zipCode: request.zipCode || request.zip || "",
            localDemoSafe: request.localDemoSafe || request.demoSafe || request.isDemo,
          }
        : null;
    })
    .filter(Boolean)
    .slice(0, 6);
}

export function isHomeServicesSpotlightBusiness(business = {}) {
  const profile = buildSpotlightProfessionalProfile(business);
  return profile.serviceDomain === "home_services";
}

export function isNoContextSpotlightSafeBusiness(business = {}) {
  const profile = buildSpotlightProfessionalProfile(business);
  const hasPortfolioMedia = getSpotlightMediaUrls(profile).length > 0;

  return (
    isHomeServicesSpotlightBusiness(profile) &&
    hasPortfolioMedia
  );
}

export function getSpotlightBusinessInclusionSummary(
  business = {},
  requestContexts = []
) {
  const profile = buildSpotlightProfessionalProfile(business);
  const hasMedia = getSpotlightMediaUrls(profile).length > 0;
  const hasActiveRequestContext = requestContexts.length > 0;
  const passesNoContextSpotlightRule =
    isNoContextSpotlightSafeBusiness(profile);
  const passesLeadEligibility = hasActiveRequestContext
    ? requestContexts.some((requestContext) =>
        canProfessionalSeeLocalLead(profile, requestContext)
      )
    : null;

  return {
    included: hasActiveRequestContext
      ? hasMedia && passesLeadEligibility
      : hasMedia && passesNoContextSpotlightRule,
    hasMedia,
    hasActiveRequestContext,
    passesNoContextSpotlightRule,
    passesLeadEligibility,
  };
}

export function getEligibleSpotlightBusinesses(
  businesses = [],
  requestContexts = [],
  { limit = 8 } = {}
) {
  return businesses
    .filter((business) =>
      getSpotlightBusinessInclusionSummary(business, requestContexts).included
    )
    .slice(0, limit);
}
