import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  normalizeEmergencyRelationshipDetail,
} from "../src/utils/emergencyRelationshipDetail.js";

function source(path) {
  return readFileSync(
    new URL(path, import.meta.url),
    "utf8"
  );
}

const responsesSource = source(
  "../src/components/EmergencyProfessionalResponses.jsx"
);

const availableNowSource = source(
  "../src/components/EmergencyAvailableNow.jsx"
);

const requestSource = source(
  "../src/pages/EmergencyRequest.jsx"
);

const relationshipSource = source(
  "../src/components/EmergencyRelationshipDetail.jsx"
);

const stylesSource = source(
  "../src/index.css"
);

test(
  "Available Now no longer owns the Professional Responses summary",
  () => {
    assert.doesNotMatch(
      availableNowSource,
      /responsesSummary|Professional Responses|responsesTitle/
    );

    assert.match(
      availableNowSource,
      /Available Now/
    );

    assert.match(
      availableNowSource,
      /Choose Professional/
    );
  }
);

test(
  "Find Help owns one dedicated Professional Responses pane before the relationship",
  () => {
    assert.match(
      requestSource,
      /emergency-find-help-left-column[\s\S]*EmergencyAvailableNow[\s\S]*EmergencyProfessionalResponses[\s\S]*EmergencyRelationshipDetail/
    );

    assert.match(
      requestSource,
      /responsesPresentation="external"/
    );

    assert.match(
      relationshipSource,
      /responsesPresentation === "inline"/
    );

    assert.match(
      requestSource,
      /onKeepWaiting=\{[\s\S]*canonicalStatus ===[\s\S]*"ready_for_distribution"[\s\S]*setPage\(detailReturnPage\)[\s\S]*: undefined[\s\S]*\}/
    );
  }
);

test(
  "Professional Responses supports faint zero state, count, compact selection rows, and internal scrolling",
  () => {
    assert.match(
      responsesSource,
      /No responses yet/
    );

    assert.match(
      responsesSource,
      /Businesses that respond to your Emergency request will appear here/
    );

    assert.match(
      responsesSource,
      /cards\.length/
    );

    assert.match(
      responsesSource,
      /Newest first/
    );

    assert.match(
      responsesSource,
      /onSelectResponse/
    );

    assert.match(
      responsesSource,
      /responseTimeLabel/
    );

    assert.match(
      stylesSource,
      /\.emergency-professional-responses-list[\s\S]*max-height:\s*300px[\s\S]*overflow-y:\s*auto/
    );
  }
);

test(
  "responsive response pane keeps portrait single-column and expands only through existing 700/900 workspace gates",
  () => {
    const start = stylesSource.indexOf(
      "Emergency Find Help responsive presentation"
    );

    const end = stylesSource.indexOf(
      ".meetro-selected-card {",
      start
    );

    const emergencyStyles =
      stylesSource.slice(start, end);

    assert.match(
      emergencyStyles,
      /@container emergency-find-help \(min-width:\s*700px\)/
    );

    assert.match(
      emergencyStyles,
      /\.emergency-find-help-left-column/
    );

    assert.match(
      emergencyStyles,
      /\.emergency-professional-responses-pane[\s\S]*min-height:\s*320px/
    );

    assert.match(
      emergencyStyles,
      /@container emergency-find-help \(min-width:\s*900px\)/
    );

    assert.doesNotMatch(
      emergencyStyles,
      /@media\s*\(min-width:\s*700px\)/
    );
  }
);

test(
  "canonical response preview preserves respondedAt without adding message authority",
  () => {
    const detail =
      normalizeEmergencyRelationshipDetail({
        emergencyRequest: {
          id: 42,
          title: "Pipe leak",
          description:
            "Water leaking under kitchen sink",
          serviceSpecialty:
            "emergency_plumbing",
          serviceDomain:
            "home_services",
          category: "plumbing",
          status:
            "ready_for_distribution",
        },
        responses: [
          {
            id: 91,
            emergencyRequestId: 42,
            status: "pending",
            respondedAt:
              "2026-09-24T14:20:00.000Z",
            conversationAvailable: false,
            professional: {
              businessName:
                "Cape Coral Plumbing",
              category: "Plumbing",
              businessLogoUrl: "",
            },
          },
        ],
        conversationId: null,
        language: "en",
      });

    assert.equal(
      detail.responseCards.length,
      1
    );

    assert.equal(
      detail.responseCards[0].respondedAt,
      "2026-09-24T14:20:00.000Z"
    );

    assert.equal(
      detail.conversation.available,
      false
    );

    assert.doesNotMatch(
      responsesSource,
      /messagePreview|latestMessage|conversationId|fetch\(/
    );
  }
);
