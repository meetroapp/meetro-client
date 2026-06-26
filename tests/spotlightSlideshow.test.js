import test from "node:test";
import assert from "node:assert/strict";

import {
  getNextSpotlightSlideshowIndex,
  getPreviousSpotlightSlideshowIndex,
  getSpotlightSlideshowState,
  normalizeSpotlightSlideshowImages,
} from "../src/utils/spotlightSlideshowState.js";

test("SpotlightSlideshow initial state uses the first image and counter", () => {
  assert.deepEqual(
    getSpotlightSlideshowState(
      ["https://example.com/one.jpg", "https://example.com/two.jpg"],
      0
    ),
    {
      activeIndex: 0,
      activeImage: "https://example.com/one.jpg",
      count: 2,
      counterLabel: "1/2",
      hasMultiple: true,
      shouldAutoAdvance: true,
    }
  );
});

test("SpotlightSlideshow next index advances and updates counter state", () => {
  const images = [
    "https://example.com/one.jpg",
    "https://example.com/two.jpg",
    "https://example.com/three.jpg",
  ];
  const nextIndex = getNextSpotlightSlideshowIndex(0, images.length);

  assert.equal(nextIndex, 1);
  assert.deepEqual(getSpotlightSlideshowState(images, nextIndex), {
    activeIndex: 1,
    activeImage: "https://example.com/two.jpg",
    count: 3,
    counterLabel: "2/3",
    hasMultiple: true,
    shouldAutoAdvance: true,
  });
});

test("SpotlightSlideshow loops after the last image", () => {
  assert.equal(getNextSpotlightSlideshowIndex(4, 5), 0);
  assert.deepEqual(
    getSpotlightSlideshowState(
      [
        "https://example.com/one.jpg",
        "https://example.com/two.jpg",
      ],
      3
    ),
    {
      activeIndex: 1,
      activeImage: "https://example.com/two.jpg",
      count: 2,
      counterLabel: "2/2",
      hasMultiple: true,
      shouldAutoAdvance: true,
    }
  );
});

test("SpotlightSlideshow one-image mode does not auto-advance", () => {
  assert.equal(getNextSpotlightSlideshowIndex(0, 1), 0);
  assert.deepEqual(
    getSpotlightSlideshowState(["https://example.com/only.jpg"], 0),
    {
      activeIndex: 0,
      activeImage: "https://example.com/only.jpg",
      count: 1,
      counterLabel: "1/1",
      hasMultiple: false,
      shouldAutoAdvance: false,
    }
  );
});

test("SpotlightSlideshow supports previous controls and image object inputs", () => {
  const images = normalizeSpotlightSlideshowImages([
    { image_url: "https://example.com/one.jpg" },
    { src: "https://example.com/two.jpg" },
    "https://example.com/two.jpg",
  ]);

  assert.deepEqual(images, [
    "https://example.com/one.jpg",
    "https://example.com/two.jpg",
  ]);
  assert.equal(getPreviousSpotlightSlideshowIndex(0, images.length), 1);
});

test("SpotlightSlideshow empty state has no active image or interval need", () => {
  assert.deepEqual(getSpotlightSlideshowState([], 0), {
    activeIndex: 0,
    activeImage: "",
    count: 0,
    counterLabel: "",
    hasMultiple: false,
    shouldAutoAdvance: false,
  });
});
