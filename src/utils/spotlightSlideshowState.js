export function normalizeSpotlightSlideshowImages(images = []) {
  if (!Array.isArray(images)) return [];

  const seen = new Set();

  return images
    .map((image) => {
      if (typeof image === "string") return image;
      if (!image || typeof image !== "object") return "";
      return (
        image.url ||
        image.src ||
        image.secure_url ||
        image.imageUrl ||
        image.image_url ||
        image.photoUrl ||
        image.photo_url ||
        ""
      );
    })
    .map((url) => String(url || "").trim())
    .filter(Boolean)
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
}

export function getSpotlightSlideshowState(images = [], activeIndex = 0) {
  const normalizedImages = normalizeSpotlightSlideshowImages(images);

  if (normalizedImages.length === 0) {
    return {
      activeIndex: 0,
      activeImage: "",
      count: 0,
      counterLabel: "",
      hasMultiple: false,
      shouldAutoAdvance: false,
    };
  }

  const normalizedIndex =
    Number.isInteger(activeIndex) && activeIndex >= 0
      ? activeIndex % normalizedImages.length
      : 0;

  return {
    activeIndex: normalizedIndex,
    activeImage: normalizedImages[normalizedIndex],
    count: normalizedImages.length,
    counterLabel: `${normalizedIndex + 1}/${normalizedImages.length}`,
    hasMultiple: normalizedImages.length > 1,
    shouldAutoAdvance: normalizedImages.length > 1,
  };
}

export function getNextSpotlightSlideshowIndex(activeIndex = 0, imageCount = 0) {
  if (!Number.isInteger(imageCount) || imageCount < 2) return 0;
  const normalizedIndex =
    Number.isInteger(activeIndex) && activeIndex >= 0
      ? activeIndex % imageCount
      : 0;

  return (normalizedIndex + 1) % imageCount;
}

export function getPreviousSpotlightSlideshowIndex(activeIndex = 0, imageCount = 0) {
  if (!Number.isInteger(imageCount) || imageCount < 2) return 0;
  const normalizedIndex =
    Number.isInteger(activeIndex) && activeIndex >= 0
      ? activeIndex % imageCount
      : 0;

  return (normalizedIndex - 1 + imageCount) % imageCount;
}
