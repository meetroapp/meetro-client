import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const uploadSource = readFileSync(
  new URL("../src/pages/Upload.jsx", import.meta.url),
  "utf8"
);

const conversationSource = readFileSync(
  new URL(
    "../src/utils/jobRequestConversation.js",
    import.meta.url
  ),
  "utf8"
);

const photoHandlerStart =
  uploadSource.indexOf(
    "function handleImageUpload"
  );
const photoHandlerEnd =
  uploadSource.indexOf(
    "async function openRequestPhotoPicker",
    photoHandlerStart
  );
const photoHandler = uploadSource.slice(
  photoHandlerStart,
  photoHandlerEnd
);

const backStart =
  uploadSource.indexOf(
    "function handleBackToConversation"
  );
const backEnd =
  uploadSource.indexOf(
    "function handleLocationIntakeModeChange",
    backStart
  );
const backBlock = uploadSource.slice(
  backStart,
  backEnd
);

const interpretationStart =
  uploadSource.indexOf(
    "async function runInterpretation"
  );
const interpretationEnd =
  uploadSource.indexOf(
    "function updatePendingInterpretationField",
    interpretationStart
  );
const interpretationBlock =
  uploadSource.slice(
    interpretationStart,
    interpretationEnd
  );

test(
  "photo selection remains local draft state and receives an immediate truthful acknowledgement",
  () => {
    assert.match(
      photoHandler,
      /addDraftPhotos\(/
    );

    assert.match(
      photoHandler,
      /createTemporaryRequestPhotoPreview/
    );

    assert.match(
      photoHandler,
      /jobRequestConversationPhotosIncluded/
    );

    assert.match(
      photoHandler,
      /kind: "photo_ack"/
    );

    assert.match(
      photoHandler,
      /setPhotoAttachmentNotice/
    );

    assert.doesNotMatch(
      photoHandler,
      /uploadRequestPhotos\(/
    );

    assert.doesNotMatch(
      photoHandler,
      /\buploaded\b/i
    );
  }
);

test(
  "manual photo card exposes an aria-live attachment confirmation",
  () => {
    assert.match(
      uploadSource,
      /\{photoAttachmentNotice && \([\s\S]*role="status"[\s\S]*aria-live="polite"[\s\S]*\{photoAttachmentNotice\}/
    );
  }
);

test(
  "conversation Your Request preserves a localized photo count from the current draft",
  () => {
    const liveDraftStart =
      uploadSource.indexOf(
        "const liveDraftSections"
      );
    const liveDraftEnd =
      uploadSource.indexOf(
        "const locationSummary",
        liveDraftStart
      );
    const liveDraftBlock =
      uploadSource.slice(
        liveDraftStart,
        liveDraftEnd
      );

    assert.match(
      liveDraftBlock,
      /id: "photos"/
    );

    assert.match(
      liveDraftBlock,
      /jobRequestDraftReviewPhotos/
    );

    assert.match(
      liveDraftBlock,
      /jobRequestPhotoCount/
    );

    assert.match(
      liveDraftBlock,
      /projectPhotos\.length/
    );
  }
);

test(
  "Review Request preserves the photo summary from current draft state",
  () => {
    assert.match(
      uploadSource,
      /const photoSummary = \[[\s\S]*jobRequestPhotoCount[\s\S]*projectPhotos\.length/
    );

    assert.match(
      uploadSource,
      /key: "photos"[\s\S]*summary: photoSummary/
    );
  }
);

test(
  "manual edits invalidate a stale visible interpretation only when draft state changed",
  () => {
    assert.match(
      uploadSource,
      /homeownerEditBaselineRef/
    );

    assert.match(
      uploadSource,
      /createHomeownerDraftFingerprint/
    );

    assert.match(
      backBlock,
      /homeownerEditsChanged/
    );

    assert.match(
      backBlock,
      /setPendingInterpretation\(null\)/
    );

    assert.match(
      backBlock,
      /setEditingInterpretation\(false\)/
    );

    assert.match(
      backBlock,
      /kind: "manual_draft_sync"/
    );

    assert.match(
      backBlock,
      /manualSyncAcknowledgement/
    );
  }
);

test(
  "manual-return reconciliation is client-owned and does not fabricate provider review authority",
  () => {
    assert.doesNotMatch(
      backBlock,
      /recordJobRequestInterpretationReviews/
    );

    assert.doesNotMatch(
      backBlock,
      /recordWorkflowReview/
    );

    assert.doesNotMatch(
      backBlock,
      /requestJobRequestInterpretation/
    );

    assert.match(
      conversationSource,
      /status: "non_canonical_ui_state"/
    );

    assert.match(
      conversationSource,
      /canonicalSubmission: "explicit_submit_job_request"/
    );
  }
);

test(
  "next Ask Meetro intelligence operation continues to receive the latest draft",
  () => {
    assert.match(
      interpretationBlock,
      /let nextDraft = draft/
    );

    assert.match(
      interpretationBlock,
      /createJobRequestInterpretIntent\(\{[\s\S]*draft: nextDraft/
    );
  }
);

test(
  "manual synchronization acknowledgement exists for all four supported Request Help languages",
  () => {
    const matches =
      uploadSource.match(
        /manualSyncAcknowledgement:/g
      ) || [];

    assert.equal(
      matches.length,
      4
    );
  }
);

test(
  "real governed photo upload still occurs only in final submission path",
  () => {
    const submitStart =
      uploadSource.indexOf(
        "async function handleCreatePost"
      );
    const submitEnd =
      uploadSource.indexOf(
        "function handleCancelRequest",
        submitStart
      );
    const submitBlock =
      uploadSource.slice(
        submitStart,
        submitEnd
      );

    assert.match(
      submitBlock,
      /uploadRequestPhotos\(\{/
    );

    assert.match(
      submitBlock,
      /buildJobRequestDraftCanonicalPayload/
    );

    assert.match(
      submitBlock,
      /setDraftUploadedMedia/
    );
  }
);
