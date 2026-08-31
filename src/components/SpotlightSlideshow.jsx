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
            <span className="spotlight-photo-badge" style={photoBadge}>
              {photoCountLabel}
            </span>
          )}

          {slideshowState.hasMultiple && (
            <span
              className="spotlight-counter-badge"
              style={counterBadge}
              aria-live="polite"
              aria-atomic="true"
            >
              {slideshowState.counterLabel.replace("/", " / ")}
            </span>
          )}

          {slideshowState.hasMultiple && (
            <>
              <button
                type="button"
                aria-label={previousLabel}
                className="spotlight-slide-control spotlight-slide-control-previous"
                style={{ ...slideButton, left: "12px" }}
                onClick={showPrevious}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label={nextLabel}
                className="spotlight-slide-control spotlight-slide-control-next"
                style={{ ...slideButton, right: "12px" }}
                onClick={showNext}
              >
                ›
              </button>
            </>
          )}
        </>
      ) : (
        <div className="spotlight-placeholder" style={placeholder}>
          <span style={placeholderIcon} aria-hidden="true">✦</span>
          <span>{placeholderLabel}</span>
        </div>
      )}
    </div>
  );
}

const slideshowWrap = {
  width: "100%",
  height: "100%",
  minHeight: "100%",
  background:
    "linear-gradient(145deg, var(--meetro-surface-sage, #e8f1e8), var(--meetro-surface-warm, #f7f2e8))",
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
  padding: "5px 8px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.52)",
  background: "rgba(255,255,255,0.22)",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "850",
  letterSpacing: "0.02em",
  lineHeight: 1,
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.54), 0 4px 12px rgba(7,19,12,0.15)",
  backdropFilter: "blur(12px) saturate(145%)",
  WebkitBackdropFilter: "blur(12px) saturate(145%)",
  textShadow: "0 1px 7px rgba(7,19,12,0.72)",
  zIndex: 3,
};

const photoBadge = {
  position: "absolute",
  top: "10px",
  left: "10px",
  padding: "5px 8px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.52)",
  background: "rgba(255,255,255,0.22)",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "850",
  letterSpacing: "0.02em",
  lineHeight: 1,
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.54), 0 4px 12px rgba(7,19,12,0.15)",
  backdropFilter: "blur(12px) saturate(145%)",
  WebkitBackdropFilter: "blur(12px) saturate(145%)",
  textShadow: "0 1px 7px rgba(7,19,12,0.72)",
  zIndex: 3,
};

const slideButton = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: "40px",
  height: "40px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.58)",
  background: "rgba(255,255,255,0.22)",
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "750",
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.68), inset 0 -1px 0 rgba(255,255,255,0.08), 0 7px 18px rgba(7,19,12,0.18)",
  backdropFilter: "blur(16px) saturate(155%)",
  WebkitBackdropFilter: "blur(16px) saturate(155%)",
  textShadow: "0 1px 8px rgba(7,19,12,0.76)",
  cursor: "pointer",
  transition: "background 160ms ease, border-color 160ms ease, transform 160ms ease",
  zIndex: 4,
};

const placeholder = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "20px 20px 0",
  boxSizing: "border-box",
  position: "relative",
  background:
    "radial-gradient(circle at 16% 18%, rgba(31,77,52,0.14), transparent 27%), radial-gradient(circle at 82% 4%, rgba(183,121,31,0.13), transparent 26%), linear-gradient(145deg, var(--meetro-surface-sage, #e8f1e8), var(--meetro-surface-warm, #f7f2e8))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "12px",
  fontWeight: "850",
  textAlign: "center",
};

const placeholderIcon = {
  position: "absolute",
  top: "42%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "88px",
  height: "88px",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255,255,255,0.34)",
  border: "1px solid rgba(31,77,52,0.14)",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "30px",
  opacity: 0.34,
};

export default SpotlightSlideshow;
