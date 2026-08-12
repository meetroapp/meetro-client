import { useMemo, useState } from "react";
import {
  createSpotlightSlideshowPosition,
  getSpotlightSlideshowPositionIndex,
  getSpotlightSlideshowState,
  moveSpotlightSlideshowPosition,
  normalizeSpotlightSlideshowImages,
} from "../utils/spotlightSlideshowState";

function SpotlightSlideshow({
  presentationId = "",
  images = [],
  alt = "",
  className = "",
  photoCountLabel = "",
  placeholderLabel = "Story preview",
  previousLabel = "Previous photo",
  nextLabel = "Next photo",
}) {
  const normalizedImages = useMemo(
    () => normalizeSpotlightSlideshowImages(images),
    [images]
  );
  const imageKey = JSON.stringify(normalizedImages);
  const [position, setPosition] = useState(() =>
    createSpotlightSlideshowPosition({ presentationId, imageKey })
  );
  const activeIndex = getSpotlightSlideshowPositionIndex(position, {
    presentationId,
    imageKey,
    imageCount: normalizedImages.length,
  });
  const slideshowState = getSpotlightSlideshowState(
    normalizedImages,
    activeIndex
  );

  function showPrevious(event) {
    event.preventDefault();
    event.stopPropagation();
    setPosition((currentPosition) =>
      moveSpotlightSlideshowPosition(currentPosition, {
        presentationId,
        imageKey,
        imageCount: normalizedImages.length,
        direction: "previous",
      })
    );
  }

  function showNext(event) {
    event.preventDefault();
    event.stopPropagation();
    setPosition((currentPosition) =>
      moveSpotlightSlideshowPosition(currentPosition, {
        presentationId,
        imageKey,
        imageCount: normalizedImages.length,
        direction: "next",
      })
    );
  }

  function stopImageInteraction(event) {
    event.stopPropagation();
  }

  return (
    <div
      className={`spotlight-slideshow ${className}`.trim()}
      style={slideshowWrap}
      onClick={stopImageInteraction}
      onPointerDown={stopImageInteraction}
    >
      {slideshowState.activeImage ? (
        <>
          <img
            key={slideshowState.activeImage}
            src={slideshowState.activeImage}
            alt={alt}
            className="spotlight-showcase-image"
            style={slideshowImage}
          />

          {photoCountLabel && (
            <span style={photoBadge}>{photoCountLabel}</span>
          )}

          {slideshowState.hasMultiple && (
            <span style={counterBadge}>{slideshowState.counterLabel}</span>
          )}

          {slideshowState.hasMultiple && (
            <>
              <button
                type="button"
                aria-label={previousLabel}
                style={{ ...slideButton, left: "10px" }}
                onClick={showPrevious}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label={nextLabel}
                style={{ ...slideButton, right: "10px" }}
                onClick={showNext}
              >
                ›
              </button>
            </>
          )}
        </>
      ) : (
        <div style={placeholder}>
          <span style={placeholderIcon}>IMG</span>
          <span>{placeholderLabel}</span>
        </div>
      )}
    </div>
  );
}

const slideshowWrap = {
  width: "100%",
  height: "100%",
  minHeight: "320px",
  background: "linear-gradient(135deg,#111827,#1e293b)",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  position: "relative",
  touchAction: "pan-y",
};

const slideshowImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center",
  display: "block",
  backgroundColor: "#111827",
  transition: "opacity 220ms ease",
};

const counterBadge = {
  position: "absolute",
  top: "10px",
  right: "10px",
  padding: "6px 9px",
  borderRadius: "10px",
  background: "rgba(15,23,42,0.72)",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: "950",
  lineHeight: 1,
  boxShadow: "0 8px 18px rgba(15,23,42,0.2)",
};

const photoBadge = {
  position: "absolute",
  top: "10px",
  left: "10px",
  padding: "6px 9px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.92)",
  color: "#111827",
  fontSize: "11px",
  fontWeight: "950",
  lineHeight: 1,
  boxShadow: "0 8px 18px rgba(15,23,42,0.18)",
};

const slideButton = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: "38px",
  height: "38px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.72)",
  background: "rgba(255,255,255,0.92)",
  color: "#111827",
  fontSize: "30px",
  fontWeight: "900",
  lineHeight: "32px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 10px 22px rgba(15,23,42,0.22)",
  zIndex: 2,
};

const placeholder = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  gap: "6px",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "12px",
  fontWeight: "950",
  textAlign: "center",
};

const placeholderIcon = {
  width: "38px",
  height: "38px",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(31,77,52,0.12)",
  border: "1px solid rgba(31,77,52,0.20)",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "14px",
};

export default SpotlightSlideshow;
