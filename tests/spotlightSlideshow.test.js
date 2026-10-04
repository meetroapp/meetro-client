import test from "node:test";
import assert from "node:assert/strict";

import {
  createSpotlightSlideshowPosition,
  getNextSpotlightSlideshowIndex,
  getPreviousSpotlightSlideshowIndex,
  getSpotlightBusinessIdentity,
  getSpotlightPresentationIdentity,
  getSpotlightSlideshowPositionIndex,
  getSpotlightSlideshowState,
  moveSpotlightSlideshowPosition,
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
      shouldAutoAdvance: false,
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
    shouldAutoAdvance: false,
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
      shouldAutoAdvance: false,
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

test("Spotlight carousel positions stay isolated by exact business and project identity", () => {
  const cardAId = getSpotlightPresentationIdentity(6, 6);
  const cardBId = getSpotlightPresentationIdentity(12, 88);
  const imageKeyA = JSON.stringify(["a-1.jpg", "a-2.jpg"]);
  const imageKeyB = JSON.stringify(["b-1.jpg", "b-2.jpg"]);
  let cardA = createSpotlightSlideshowPosition({
    presentationId: cardAId,
    imageKey: imageKeyA,
  });
  let cardB = createSpotlightSlideshowPosition({
    presentationId: cardBId,
    imageKey: imageKeyB,
  });

  cardA = moveSpotlightSlideshowPosition(cardA, {
    presentationId: cardAId,
    imageKey: imageKeyA,
    imageCount: 2,
  });
  assert.equal(
    getSpotlightSlideshowPositionIndex(cardA, {
      presentationId: cardAId,
      imageKey: imageKeyA,
      imageCount: 2,
    }),
    1
  );
  assert.equal(
    getSpotlightSlideshowPositionIndex(cardB, {
      presentationId: cardBId,
      imageKey: imageKeyB,
      imageCount: 2,
    }),
    0
  );

  cardB = moveSpotlightSlideshowPosition(cardB, {
    presentationId: cardBId,
    imageKey: imageKeyB,
    imageCount: 2,
  });
  assert.equal(
    getSpotlightSlideshowPositionIndex(cardA, {
      presentationId: cardAId,
      imageKey: imageKeyA,
      imageCount: 2,
    }),
    1
  );
  assert.equal(
    getSpotlightSlideshowPositionIndex(cardB, {
      presentationId: cardBId,
      imageKey: imageKeyB,
      imageCount: 2,
    }),
    1
  );
});

test("no-photo neighbors and duplicate titles cannot share carousel position", () => {
  const firstId = getSpotlightPresentationIdentity("business-a", "project-a");
  const secondId = getSpotlightPresentationIdentity("business-b", "project-b");
  const noPhotoId = getSpotlightPresentationIdentity("business-c");
  const duplicateTitleImages = JSON.stringify([
    "same-title-1.jpg",
    "same-title-2.jpg",
  ]);
  const movedFirst = moveSpotlightSlideshowPosition(
    createSpotlightSlideshowPosition({
      presentationId: firstId,
      imageKey: duplicateTitleImages,
    }),
    {
      presentationId: firstId,
      imageKey: duplicateTitleImages,
      imageCount: 2,
    }
  );

  assert.notEqual(firstId, secondId);
  assert.equal(
    getSpotlightSlideshowPositionIndex(movedFirst, {
      presentationId: secondId,
      imageKey: duplicateTitleImages,
      imageCount: 2,
    }),
    0
  );
  assert.equal(
    getSpotlightSlideshowPositionIndex(
      createSpotlightSlideshowPosition({ presentationId: noPhotoId }),
      { presentationId: noPhotoId, imageCount: 0 }
    ),
    0
  );
});

test("hydration or canonical identity changes reset locally without transferring position", () => {
  const firstId = getSpotlightPresentationIdentity(6, 6);
  const hydratedId = getSpotlightPresentationIdentity(6, 9);
  const firstImages = JSON.stringify(["first-1.jpg", "first-2.jpg"]);
  const hydratedImages = JSON.stringify(["hydrated-1.jpg", "hydrated-2.jpg"]);
  const movedFirst = moveSpotlightSlideshowPosition(
    createSpotlightSlideshowPosition({
      presentationId: firstId,
      imageKey: firstImages,
    }),
    {
      presentationId: firstId,
      imageKey: firstImages,
      imageCount: 2,
    }
  );

  assert.equal(
    getSpotlightSlideshowPositionIndex(movedFirst, {
      presentationId: hydratedId,
      imageKey: hydratedImages,
      imageCount: 2,
    }),
    0
  );
  assert.equal(getSpotlightPresentationIdentity(6, 6), "business:6:project:6");
  assert.equal(getSpotlightPresentationIdentity(6), "business:6:project:none");
  assert.equal(getSpotlightPresentationIdentity("", 6), "");
  assert.equal(getSpotlightBusinessIdentity(" business-a "), "business:business-a");
});
