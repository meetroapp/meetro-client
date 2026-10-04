import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

import {
  QUICK_QUOTE_ANALYSIS_PRIVATE_AUTHORITY,
  QUICK_QUOTE_ANALYSIS_PROPOSAL_AUTHORITY,
  QUICK_QUOTE_ANALYSIS_SESSION_COLLECTION_ROUTE,
  analyzeQuickQuoteAnalysisSession,
  appendQuickQuoteAnalysisEvidence,
  applyQuickQuoteAnalysisExecutionToPresentationState,
  continueQuickQuoteAnalysisSession,
  createQuickQuoteAnalysisPresentationState,
  createQuickQuoteAnalysisSession,
  discardQuickQuoteAnalysisSession,
  hydrateQuickQuoteAnalysisPresentationState,
  loadQuickQuoteAnalysisReviewedResult,
  loadQuickQuoteAnalysisSession,
  markQuickQuoteAnalysisPresentationStale,
  validateQuickQuoteAnalysisProposal,
  validateQuickQuoteAnalysisReviewedResult,
  validateQuickQuoteAnalysisSession,
} from "../src/utils/quickQuoteAnalysisSession.js";

const SESSION_ID =
  "11111111-1111-4111-8111-111111111111";

const PROPOSAL_ID =
  "22222222-2222-4222-8222-222222222222";

const NEXT_PROPOSAL_ID =
  "33333333-3333-4333-8333-333333333333";

const TURN_ONE =
  "44444444-4444-4444-8444-444444444444";

const TURN_TWO =
  "55555555-5555-4555-8555-555555555555";

const TURN_THREE =
  "66666666-6666-4666-8666-666666666666";

const KEY =
  "77777777-7777-4777-8777-777777777777";

const SECOND_KEY =
  "88888888-8888-4888-8888-888888888888";

const SOURCE_FINGERPRINT =
  "a".repeat(64);

const EVIDENCE_FINGERPRINT =
  "b".repeat(64);

const CREATED_AT =
  "2026-08-19T22:00:00.000Z";

function sourceReference() {
  return {
    type:
      "QUOTE_DRAFT_PHOTO",
    id:
      "meetro/quote-draft-photo/sample",
    version: 1,
  };
}

function proposal({
  proposalId =
    PROPOSAL_ID,
  priorProposalId =
    null,
  evidenceVersion = 1,
  assistantMessage =
    "I reviewed the current job evidence.",
} = {}) {
  return {
    schemaVersion: 1,
    proposalId,
    analysisSessionId:
      SESSION_ID,
    evidenceVersion,
    priorProposalId,
    authorityClassification:
      QUICK_QUOTE_ANALYSIS_PROPOSAL_AUTHORITY,
    sourceContextFingerprint:
      SOURCE_FINGERPRINT,
    assistantMessage,
    summary:
      "Private advisory job analysis.",
    questionsForProfessional: [
      {
        id:
          "confirm_access",
        text:
          "Can you confirm access behind the wall?",
      },
    ],
    observed: [
      {
        id:
          "visible_crack",
        text:
          "A visible crack appears in the photographed area.",
        classification:
          "OBSERVED",
        sourceReferences: [
          sourceReference(),
        ],
      },
    ],
    needsVerification: [
      {
        id:
          "hidden_damage",
        text:
          "Hidden damage needs field verification.",
        classification:
          "NEEDS_VERIFICATION",
        sourceReferences: [],
      },
    ],
    repairSuggestions: [
      {
        id:
          "repair_option",
        text:
          "Expose the affected section before finalizing repair scope.",
        classification:
          "AI_SUGGESTED",
        sourceReferences: [],
      },
    ],
    materialSuggestions: [
      {
        id:
          "material_option",
        text:
          "Replacement masonry materials may be required.",
        classification:
          "AI_SUGGESTED",
        sourceReferences: [],
      },
    ],
    photoAnalysis: {
      supported: true,
      analyzedReferenceIds: [
        "meetro/quote-draft-photo/sample",
      ],
      limitations: [
        "Concealed conditions are not visible.",
      ],
      imageMeasurementsAreEstimates:
        true,
    },
    warnings: [],
    reviewContract: {
      actions: [
        "ACCEPTED",
        "EDITED",
        "REJECTED",
      ],
      reviewableElementCollections: [
        "questionsForProfessional",
        "observed",
        "needsVerification",
        "repairSuggestions",
        "materialSuggestions",
      ],
      explicitHumanDecisionRequired:
        true,
    },
    humanToCanonicalBoundary: {
      directMutationAllowed:
        false,
      workingDraftApplicationRequiresReview:
        true,
      prohibitedCanonicalCommands: [
        "quote.create",
        "quote.issue",
        "quote.send",
        "request.create",
        "job.create",
        "invoice.issue",
        "payment.record",
        "visit.schedule",
      ],
    },
    learningContext: {
      context:
        "quick_quote_analysis_continuation",
      learnedPatternIsCanonicalRule:
        false,
    },
    canonicalMutationPerformed:
      false,
  };
}

function reviewedResult({
  proposalId =
    PROPOSAL_ID,
  evidenceVersion = 1,
} = {}) {
  return {
    schemaVersion: 1,
    analysisSessionId:
      SESSION_ID,
    evidenceVersion,
    proposalId,
    authorityClassification:
      QUICK_QUOTE_ANALYSIS_PRIVATE_AUTHORITY,
    sourceProposalAuthorityClassification:
      QUICK_QUOTE_ANALYSIS_PROPOSAL_AUTHORITY,
    reviewedObservations: [
      {
        elementId:
          "visible_crack",
        text:
          "A visible crack appears in the photographed area.",
        reviewAction:
          "ACCEPTED",
        classification:
          "OBSERVED",
        sourceReferences: [
          sourceReference(),
        ],
      },
    ],
    needsVerification: [
      {
        elementId:
          "hidden_damage",
        text:
          "Hidden damage needs field verification.",
        reviewAction:
          "ACCEPTED",
        classification:
          "NEEDS_VERIFICATION",
        sourceReferences: [],
      },
    ],
    reviewedSolution: [
      {
        elementId:
          "repair_option",
        text:
          "Expose the affected section before finalizing repair scope.",
        reviewAction:
          "ACCEPTED",
        classification:
          "AI_SUGGESTED",
        sourceReferences: [],
      },
    ],
    materialsList: [
      {
        elementId:
          "material_option",
        text:
          "Use matching replacement masonry materials.",
        reviewAction:
          "EDITED",
        classification:
          "AI_SUGGESTED",
        sourceReferences: [],
      },
    ],
    reviewedElementIds: [
      "confirm_access",
      "hidden_damage",
      "material_option",
      "repair_option",
      "visible_crack",
    ],
    rejectedElementIds: [
      "discarded_material",
    ],
    reviewDecisionCount: 6,
    canonicalMutationPerformed:
      false,
  };
}

function evidence({
  version = 1,
} = {}) {
  return {
    version,
    professionalInput:
      "Repair cracked knee wall.",
    photoReferences: [
      {
        type:
          "QUOTE_DRAFT_PHOTO",
        publicId:
          "meetro/quote-draft-photo/sample",
        secureUrl:
          "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        version: 1,
        format: "jpg",
        width: 1200,
        height: 900,
        displayOrder: 0,
      },
    ],
    evidenceFingerprint:
      EVIDENCE_FINGERPRINT,
    createdAt:
      CREATED_AT,
  };
}

function meetroTurn({
  turnId = TURN_ONE,
  turnIndex = 1,
  evidenceVersion = 1,
  payload =
    proposal({
      evidenceVersion,
    }),
} = {}) {
  return {
    turnId,
    turnIndex,
    evidenceVersion,
    role: "MEETRO",
    authorityClassification:
      QUICK_QUOTE_ANALYSIS_PRIVATE_AUTHORITY,
    payload,
    createdAt:
      CREATED_AT,
  };
}

function professionalTurn({
  turnId = TURN_TWO,
  turnIndex = 2,
  evidenceVersion = 1,
  priorProposalId =
    PROPOSAL_ID,
  message =
    "The wall is accessible from both sides.",
} = {}) {
  return {
    turnId,
    turnIndex,
    evidenceVersion,
    role: "PROFESSIONAL",
    authorityClassification:
      QUICK_QUOTE_ANALYSIS_PRIVATE_AUTHORITY,
    payload: {
      message,
      priorProposalId,
    },
    createdAt:
      CREATED_AT,
  };
}

function session({
  turns = [],
  latestTurnIndex =
    turns.length
      ? turns.at(-1).turnIndex
      : 0,
} = {}) {
  return {
    sessionId:
      SESSION_ID,
    authorityClassification:
      QUICK_QUOTE_ANALYSIS_PRIVATE_AUTHORITY,
    createdAt:
      CREATED_AT,
    latestEvidenceVersion: 1,
    latestTurnIndex,
    evidenceVersions: [
      evidence(),
    ],
    turns,
  };
}

function success(
  data,
  status = 200
) {
  return {
    response: {
      ok: true,
      status,
    },
    data: {
      success: true,
      canonicalMutationPerformed:
        false,
      ...data,
    },
  };
}

test(
  "R1-04 client uses dedicated session authority and never exposes a browser turns route",
  () => {
    const source =
      readFileSync(
        new URL(
          "../src/utils/quickQuoteAnalysisSession.js",
          import.meta.url
        ),
        "utf8"
      );

    const generic =
      readFileSync(
        new URL(
          "../src/utils/contextualIntelligence.js",
          import.meta.url
        ),
        "utf8"
      );

    assert.equal(
      QUICK_QUOTE_ANALYSIS_SESSION_COLLECTION_ROUTE,
      "/api/intelligence/quick-quote-analysis/sessions"
    );

    assert.match(
      source,
      /"\/analyze"/
    );

    assert.match(
      source,
      /"\/continue"/
    );

    assert.match(
      source,
      /"\/evidence"/
    );

    assert.doesNotMatch(
      source,
      /\/turns/
    );

    assert.doesNotMatch(
      generic,
      /quick_quote\.analysis\.continue/
    );

    assert.doesNotMatch(
      generic,
      /quick-quote-analysis/
    );
  }
);

test(
  "session and proposal validators enforce private noncanonical authority",
  () => {
    const validProposal =
      proposal();

    assert.equal(
      validateQuickQuoteAnalysisProposal(
        validProposal,
        {
          sessionId:
            SESSION_ID,
          evidenceVersion: 1,
          priorProposalId: null,
        }
      ),
      validProposal
    );

    assert.equal(
      validateQuickQuoteAnalysisSession(
        session({
          turns: [
            meetroTurn(),
          ],
        })
      )?.sessionId,
      SESSION_ID
    );

    assert.equal(
      validateQuickQuoteAnalysisProposal(
        {
          ...validProposal,
          canonicalMutationPerformed:
            true,
        }
      ),
      null
    );

    assert.equal(
      validateQuickQuoteAnalysisProposal(
        {
          ...validProposal,
          authorityClassification:
            "CANONICAL",
        }
      ),
      null
    );

    assert.equal(
      validateQuickQuoteAnalysisProposal(
        validProposal,
        {
          sessionId:
            "99999999-9999-4999-8999-999999999999",
        }
      ),
      null
    );
  }
);

test(
  "reviewed result validator accepts only durable private reviewed projection",
  () => {
    const valid =
      reviewedResult();

    assert.equal(
      validateQuickQuoteAnalysisReviewedResult(
        valid,
        {
          sessionId:
            SESSION_ID,
          evidenceVersion: 1,
          proposalId:
            PROPOSAL_ID,
        }
      ),
      valid
    );

    assert.equal(
      validateQuickQuoteAnalysisReviewedResult({
        ...valid,
        canonicalMutationPerformed:
          true,
      }),
      null
    );

    assert.equal(
      validateQuickQuoteAnalysisReviewedResult({
        ...valid,
        authorityClassification:
          "CANONICAL",
      }),
      null
    );

    assert.equal(
      validateQuickQuoteAnalysisReviewedResult({
        ...valid,
        reviewedSolution: [
          {
            ...valid
              .reviewedSolution[0],
            reviewAction:
              "REJECTED",
          },
        ],
      }),
      null
    );

    assert.equal(
      validateQuickQuoteAnalysisReviewedResult({
        ...valid,
        reviewedElementIds: [
          ...valid.reviewedElementIds,
          "material_option",
        ],
        reviewDecisionCount: 7,
      }),
      null
    );

    assert.equal(
      validateQuickQuoteAnalysisReviewedResult(
        valid,
        {
          sessionId:
            SESSION_ID,
          evidenceVersion: 2,
          proposalId:
            PROPOSAL_ID,
        }
      ),
      null
    );

    assert.equal(
      Object.hasOwn(
        valid,
        "pricing"
      ),
      false
    );

    assert.equal(
      Object.hasOwn(
        valid,
        "labor"
      ),
      false
    );

    assert.equal(
      Object.hasOwn(
        valid,
        "quote"
      ),
      false
    );
  }
);

test(
  "create session sends only governed evidence with idempotency",
  async () => {
    const calls = [];

    const result =
      await createQuickQuoteAnalysisSession({
        professionalInput:
          "Inspect the damaged wall.",
        photos: [
          {
            public_id:
              "meetro/quote-draft-photo/sample",
            secure_url:
              "https://example.test/sample.jpg",
          },
        ],
        idempotencyKey:
          KEY,
        authFetchImpl:
          async (
            route,
            options
          ) => {
            calls.push({
              route,
              options,
            });

            return success(
              {
                code:
                  "QUICK_QUOTE_ANALYSIS_SESSION_CREATED",
                session:
                  session(),
                replayed: false,
              },
              201
            );
          },
      });

    assert.equal(
      result.session.sessionId,
      SESSION_ID
    );

    assert.equal(
      calls.length,
      1
    );

    assert.equal(
      calls[0].route,
      QUICK_QUOTE_ANALYSIS_SESSION_COLLECTION_ROUTE
    );

    assert.equal(
      calls[0].options.method,
      "POST"
    );

    assert.equal(
      calls[0].options.headers[
        "Idempotency-Key"
      ],
      KEY
    );

    assert.deepEqual(
      JSON.parse(
        calls[0].options.body
      ),
      {
        professionalInput:
          "Inspect the damaged wall.",
        photos: [
          {
            public_id:
              "meetro/quote-draft-photo/sample",
            secure_url:
              "https://example.test/sample.jpg",
          },
        ],
      }
    );
  }
);

test(
  "load and evidence routes remain session scoped and server owned",
  async () => {
    const calls = [];

    const authFetchImpl =
      async (
        route,
        options
      ) => {
        calls.push({
          route,
          options,
        });

        if (
          options.method ===
          "GET"
        ) {
          return success({
            code:
              "QUICK_QUOTE_ANALYSIS_SESSION_LOADED",
            session:
              session(),
          });
        }

        return success(
          {
            code:
              "QUICK_QUOTE_ANALYSIS_EVIDENCE_CURRENT",
            evidence:
              evidence(),
            changed: false,
            replayed: false,
          },
          200
        );
      };

    await loadQuickQuoteAnalysisSession({
      sessionId:
        SESSION_ID,
      authFetchImpl,
    });

    await appendQuickQuoteAnalysisEvidence({
      sessionId:
        SESSION_ID,
      professionalInput:
        "Repair cracked knee wall.",
      photos: [
        {
          public_id:
            "meetro/quote-draft-photo/sample",
        },
      ],
      idempotencyKey:
        KEY,
      authFetchImpl,
    });

    assert.equal(
      calls[0].route,
      `${QUICK_QUOTE_ANALYSIS_SESSION_COLLECTION_ROUTE}/${SESSION_ID}`
    );

    assert.equal(
      calls[0].options.method,
      "GET"
    );

    assert.equal(
      calls[1].route,
      `${QUICK_QUOTE_ANALYSIS_SESSION_COLLECTION_ROUTE}/${SESSION_ID}/evidence`
    );

    assert.equal(
      calls[1].options.method,
      "POST"
    );

    assert.deepEqual(
      JSON.parse(
        calls[1].options.body
      ),
      {
        professionalInput:
          "Repair cracked knee wall.",
        photos: [
          {
            public_id:
              "meetro/quote-draft-photo/sample",
          },
        ],
      }
    );
  }
);

test(
  "reviewed result GET sends session identity only and validates current durable expectations",
  async () => {
    const calls = [];
    const projection =
      reviewedResult();

    const result =
      await loadQuickQuoteAnalysisReviewedResult({
        sessionId:
          SESSION_ID,
        expectedEvidenceVersion:
          1,
        expectedProposalId:
          PROPOSAL_ID,

        /*
         * These are intentionally ignored by the API helper.
         * They must never become request authority.
         */
        actorUserId: 999,
        evidenceVersion: 999,
        proposalId:
          NEXT_PROPOSAL_ID,

        authFetchImpl:
          async (
            route,
            options
          ) => {
            calls.push({
              route,
              options,
            });

            return success({
              code:
                "QUICK_QUOTE_ANALYSIS_REVIEWED_RESULT_LOADED",
              reviewedResult:
                projection,
            });
          },
      });

    assert.equal(
      result.reviewedResult,
      projection
    );

    assert.equal(
      calls.length,
      1
    );

    assert.equal(
      calls[0].route,
      `${QUICK_QUOTE_ANALYSIS_SESSION_COLLECTION_ROUTE}/${SESSION_ID}/reviewed-result`
    );

    assert.deepEqual(
      calls[0].options,
      {
        method: "GET",
      }
    );

    await assert.rejects(
      () =>
        loadQuickQuoteAnalysisReviewedResult({
          sessionId:
            SESSION_ID,
          expectedEvidenceVersion:
            2,
          expectedProposalId:
            PROPOSAL_ID,
          authFetchImpl:
            async () =>
              success({
                code:
                  "QUICK_QUOTE_ANALYSIS_REVIEWED_RESULT_LOADED",
                reviewedResult:
                  projection,
              }),
        }),
      (error) =>
        error?.code ===
        "UNSAFE_QUICK_QUOTE_ANALYSIS_REVIEWED_RESULT_RESPONSE"
    );
  }
);

test(
  "initial analyze sends locale only and accepts the durable Meetro exchange",
  async () => {
    const calls = [];
    const firstProposal =
      proposal();

    const result =
      await analyzeQuickQuoteAnalysisSession({
        sessionId:
          SESSION_ID,
        locale: "en-US",
        idempotencyKey:
          KEY,
        authFetchImpl:
          async (
            route,
            options
          ) => {
            calls.push({
              route,
              options,
            });

            return success(
              {
                code:
                  "QUICK_QUOTE_ANALYSIS_COMPLETED",
                proposal:
                  firstProposal,
                turns: [
                  meetroTurn({
                    payload:
                      firstProposal,
                  }),
                ],
                replayed: false,
              },
              201
            );
          },
      });

    assert.equal(
      calls[0].route,
      `${QUICK_QUOTE_ANALYSIS_SESSION_COLLECTION_ROUTE}/${SESSION_ID}/analyze`
    );

    assert.deepEqual(
      JSON.parse(
        calls[0].options.body
      ),
      {
        locale: "en-US",
      }
    );

    assert.equal(
      result.proposal.proposalId,
      PROPOSAL_ID
    );

    assert.equal(
      result.turns.length,
      1
    );

    assert.equal(
      result.turns[0].role,
      "MEETRO"
    );
  }
);

test(
  "continue sends only prior proposal message and locale and accepts the two durable turns",
  async () => {
    const calls = [];

    const continuedProposal =
      proposal({
        proposalId:
          NEXT_PROPOSAL_ID,
        priorProposalId:
          PROPOSAL_ID,
        assistantMessage:
          "Thanks. I incorporated the confirmed access information.",
      });

    const result =
      await continueQuickQuoteAnalysisSession({
        sessionId:
          SESSION_ID,
        priorProposalId:
          PROPOSAL_ID,
        message:
          "The wall is accessible from both sides.",
        locale: "en-US",
        idempotencyKey:
          SECOND_KEY,
        authFetchImpl:
          async (
            route,
            options
          ) => {
            calls.push({
              route,
              options,
            });

            return success(
              {
                code:
                  "QUICK_QUOTE_ANALYSIS_CONTINUED",
                proposal:
                  continuedProposal,
                turns: [
                  professionalTurn(),
                  meetroTurn({
                    turnId:
                      TURN_THREE,
                    turnIndex: 3,
                    payload:
                      continuedProposal,
                  }),
                ],
                replayed: false,
              },
              201
            );
          },
      });

    assert.equal(
      calls[0].route,
      `${QUICK_QUOTE_ANALYSIS_SESSION_COLLECTION_ROUTE}/${SESSION_ID}/continue`
    );

    assert.deepEqual(
      JSON.parse(
        calls[0].options.body
      ),
      {
        priorProposalId:
          PROPOSAL_ID,
        message:
          "The wall is accessible from both sides.",
        locale:
          "en-US",
      }
    );

    assert.equal(
      result.proposal.priorProposalId,
      PROPOSAL_ID
    );

    assert.deepEqual(
      result.turns.map(
        (turn) => turn.role
      ),
      [
        "PROFESSIONAL",
        "MEETRO",
      ]
    );
  }
);

test(
  "discard is session scoped idempotent and cannot submit caller authority",
  async () => {
    const calls = [];

    const result =
      await discardQuickQuoteAnalysisSession({
        sessionId:
          SESSION_ID,
        idempotencyKey:
          KEY,
        actorUserId: 9001,
        evidenceVersion: 99,
        provider:
          "caller-controlled",
        operation:
          "caller-controlled",
        authFetchImpl:
          async (
            route,
            options
          ) => {
            calls.push({
              route,
              options,
            });

            return success({
              code:
                "QUICK_QUOTE_ANALYSIS_SESSION_DISCARDED",
              sessionId:
                SESSION_ID,
              discarded: true,
              replayed: false,
            });
          },
      });

    assert.deepEqual(
      result,
      {
        sessionId:
          SESSION_ID,
        discarded: true,
        replayed: false,
      }
    );

    assert.equal(
      calls[0].route,
      `${QUICK_QUOTE_ANALYSIS_SESSION_COLLECTION_ROUTE}/${SESSION_ID}`
    );

    assert.equal(
      calls[0].options.method,
      "DELETE"
    );

    assert.equal(
      calls[0].options.body,
      undefined
    );

    assert.equal(
      calls[0].options.headers[
        "Idempotency-Key"
      ],
      KEY
    );
  }
);

test(
  "presentation state can only hydrate or advance from validated server projections",
  () => {
    const empty =
      createQuickQuoteAnalysisPresentationState();

    assert.deepEqual(
      empty,
      {
        sessionId: "",
        latestEvidenceVersion:
          null,
        turns: [],
        latestProposal:
          null,
        stale: false,
      }
    );

    const serverSession =
      session({
        turns: [
          meetroTurn(),
        ],
      });

    const hydrated =
      hydrateQuickQuoteAnalysisPresentationState(
        serverSession
      );

    assert.equal(
      hydrated.sessionId,
      SESSION_ID
    );

    assert.equal(
      hydrated.latestProposal
        .proposalId,
      PROPOSAL_ID
    );

    const stale =
      markQuickQuoteAnalysisPresentationStale(
        hydrated
      );

    assert.equal(
      stale.stale,
      true
    );

    const continuedProposal =
      proposal({
        proposalId:
          NEXT_PROPOSAL_ID,
        priorProposalId:
          PROPOSAL_ID,
      });

    const advanced =
      applyQuickQuoteAnalysisExecutionToPresentationState(
        stale,
        {
          proposal:
            continuedProposal,
          turns: [
            professionalTurn(),
            meetroTurn({
              turnId:
                TURN_THREE,
              turnIndex: 3,
              payload:
                continuedProposal,
            }),
          ],
        }
      );

    assert.equal(
      advanced.stale,
      false
    );

    assert.equal(
      advanced.turns.length,
      3
    );

    assert.equal(
      advanced.latestProposal
        .proposalId,
      NEXT_PROPOSAL_ID
    );
  }
);

test(
  "client session contract contains no browser persistence or Quote mutation authority",
  () => {
    const source =
      readFileSync(
        new URL(
          "../src/utils/quickQuoteAnalysisSession.js",
          import.meta.url
        ),
        "utf8"
      );

    assert.doesNotMatch(
      source,
      /localStorage|sessionStorage/
    );

    assert.doesNotMatch(
      source,
      /setCustomerName|setProblemFound|setRecommendedSolution|setMaterialRows|setLaborRows|setTotalOverride/
    );

    assert.match(
      source,
      /PRESENTATION ONLY/
    );

    assert.match(
      source,
      /Durable session\/evidence\/turn authority remains the server projection/
    );
  }
);

test(
  "hydration marks historical analysis stale when server evidence advances",
  () => {
    const secondEvidence = {
      ...evidence({
        version: 2,
      }),
      professionalInput:
        "Updated evidence after field inspection.",
      evidenceFingerprint:
        "c".repeat(64),
      createdAt:
        "2026-08-19T22:05:00.000Z",
    };

    const advancedSession = {
      ...session({
        turns: [
          meetroTurn(),
        ],
      }),
      latestEvidenceVersion: 2,
      evidenceVersions: [
        evidence(),
        secondEvidence,
      ],
    };

    const hydrated =
      hydrateQuickQuoteAnalysisPresentationState(
        advancedSession
      );

    assert.equal(
      hydrated.latestEvidenceVersion,
      2
    );

    assert.equal(
      hydrated.latestProposal,
      null
    );

    assert.equal(
      hydrated.stale,
      true
    );

    assert.equal(
      hydrated.turns.length,
      1
    );
  }
);

test(
  "presentation rejects an execution from a different evidence version",
  () => {
    const current = {
      ...hydrateQuickQuoteAnalysisPresentationState(
        session()
      ),
      latestEvidenceVersion: 2,
      stale: true,
    };

    assert.throws(
      () =>
        applyQuickQuoteAnalysisExecutionToPresentationState(
          current,
          {
            proposal:
              proposal({
                evidenceVersion: 1,
              }),
            turns: [
              meetroTurn({
                evidenceVersion: 1,
              }),
            ],
          }
        ),
      /valid durable Job Analysis exchange/
    );
  }
);
