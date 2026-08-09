import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  getMeetroMomentHashRoute,
  getMeetroMomentRouteId,
  getMeetroMomentRoutePage,
  MEETRO_MOMENT_DETAILS_PAGE,
  MEETRO_MOMENTS_PAGE,
} from "../src/utils/meetroMomentRoutes.js";
import { t, translations } from "../src/utils/language.js";
import {
  buildTimelineClosureOffer,
  buildTimelineMomentFromClosedProject,
  canDisplayTimelineMomentForViewer,
  canPublishTimelineMoment,
  confirmTimelineMoment,
  createTimelineMomentFromClosedProject,
  getBusinessProfileTimelineMoments,
  getCustomerHomeTimelinePlaceholder,
  getMeetroMomentDetailModel,
  getMeetroMomentsExperience,
  getTimelineMomentById,
  getTimelineMomentPrivacyLabel,
  getRelationshipTimelineMoments,
  getTimelineMomentsForViewer,
  getTimelineMomentsForProject,
  isVerifiedTimelineMoment,
  MEETRO_TIMELINE_STORAGE_KEY,
  publishTimelineMoment,
  readTimelineMoments,
  TIMELINE_MOMENT_STATUSES,
} from "../src/utils/meetroTimeline.js";

function createStorage(seed = {}) {
  const store = new Map(Object.entries(seed));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

const closedProject = {
  id: "history-1001",
  projectId: "project-1001",
  relationshipId: "relationship-sarah-bgone",
  customerId: "customer-sarah",
  customerName: "Sarah Dommerich",
  businessId: "business-bgone",
  businessName: "Bgone Home Renovation",
  projectTitle: "Kitchen cabinet repair",
  projectCategory: "Home Services",
  status: "closed",
  workflowStatus: "closed",
  closureStatus: "closed",
  completedAt: "2026-07-02T14:00:00.000Z",
  closedAt: "2026-07-02T15:00:00.000Z",
  beforePhotos: [{ id: "before-1", url: "before.jpg" }],
  afterPhotos: [{ id: "after-1", url: "after.jpg" }],
  review: {
    rating: 5,
    comment: "Clean work and clear communication.",
  },
  warranty: "One-year workmanship warranty",
  receipt: { url: "receipt.pdf" },
};

test("Timeline Moment cannot exist without Job Closure", () => {
  const result = buildTimelineMomentFromClosedProject({
    ...closedProject,
    status: "completed",
    workflowStatus: "completed",
    closureStatus: "",
    closedAt: "",
    savedToHistory: false,
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "job-closure-required");
  assert.equal(result.moment, null);
});

test("Timeline Moment links to projectId and relationshipId", () => {
  const result = buildTimelineMomentFromClosedProject(closedProject, {
    now: "2026-07-04T12:00:00.000Z",
  });

  assert.equal(result.ok, true);
  assert.equal(result.moment.projectId, "project-1001");
  assert.equal(result.moment.relationshipId, "relationship-sarah-bgone");
  assert.equal(result.moment.origin, "closed_job");
  assert.equal(result.moment.label, "Verified Meetro Moment");
});

test("existing project data auto-populates the Meetro Moment", () => {
  const result = buildTimelineMomentFromClosedProject(closedProject, {
    now: "2026-07-04T12:00:00.000Z",
  });
  const moment = result.moment;

  assert.equal(moment.customerName, "Sarah Dommerich");
  assert.equal(moment.businessName, "Bgone Home Renovation");
  assert.equal(moment.projectTitle, "Kitchen cabinet repair");
  assert.equal(moment.projectCategory, "Home Services");
  assert.equal(moment.completionDate, "2026-07-02T14:00:00.000Z");
  assert.equal(moment.closureDate, "2026-07-02T15:00:00.000Z");
  assert.equal(moment.beforePhotos.length, 1);
  assert.equal(moment.afterPhotos.length, 1);
  assert.equal(moment.reviewRating, 5);
  assert.equal(moment.reviewText, "Clean work and clear communication.");
  assert.equal(moment.warranty, "One-year workmanship warranty");
  assert.deepEqual(moment.receipt, { url: "receipt.pdf" });
});

test("optional thank-you message saves correctly", () => {
  const storage = createStorage();

  const result = createTimelineMomentFromClosedProject(closedProject, {
    storage,
    thankYouMessage: "Thank you for trusting us with your kitchen.",
    momentReflection: "This kitchen became part of the story Sarah is building at home.",
    projectTitle: "Kitchen Remodel Memory",
    coverPhoto: { id: "cover-photo", url: "cover.jpg" },
    now: "2026-07-04T12:00:00.000Z",
  });

  assert.equal(result.created, true);
  assert.equal(result.moment.projectTitle, "Kitchen Remodel Memory");
  assert.equal(result.moment.thankYouMessage, "Thank you for trusting us with your kitchen.");
  assert.equal(result.moment.whyItMattered, "This kitchen became part of the story Sarah is building at home.");
  assert.deepEqual(result.moment.coverPhoto, { id: "cover-photo", url: "cover.jpg" });
  assert.equal(readTimelineMoments(storage)[0].thankYouMessage, "Thank you for trusting us with your kitchen.");
});

test("pending customer confirmation blocks publication", () => {
  const result = buildTimelineMomentFromClosedProject(closedProject, {
    now: "2026-07-04T12:00:00.000Z",
  });

  assert.equal(result.moment.status, TIMELINE_MOMENT_STATUSES.PENDING_CUSTOMER_CONFIRMATION);
  assert.equal(result.moment.confirmationRequired, true);
  assert.equal(canPublishTimelineMoment(result.moment), false);

  const publishAttempt = publishTimelineMoment(result.moment, {
    publishedAt: "2026-07-04T12:05:00.000Z",
  });

  assert.equal(publishAttempt.published, false);
  assert.equal(publishAttempt.reason, "customer-confirmation-required");
});

test("published moments appear in Relationship History", () => {
  const pending = buildTimelineMomentFromClosedProject(closedProject, {
    now: "2026-07-04T12:00:00.000Z",
  }).moment;
  const confirmed = confirmTimelineMoment(pending, {
    confirmedAt: "2026-07-04T12:10:00.000Z",
  }).moment;
  const savedButHidden = {
    ...confirmed,
    id: "hidden-moment",
    status: TIMELINE_MOMENT_STATUSES.HIDDEN,
  };

  const relationshipTimeline = getRelationshipTimelineMoments(
    [pending, savedButHidden, confirmed],
    "relationship-sarah-bgone"
  );

  assert.equal(relationshipTimeline.length, 1);
  assert.equal(relationshipTimeline[0].id, confirmed.id);
  assert.equal(relationshipTimeline[0].status, TIMELINE_MOMENT_STATUSES.PUBLISHED);
});

test("project and business timeline selectors use verified published moments", () => {
  const confirmed = confirmTimelineMoment(
    buildTimelineMomentFromClosedProject(closedProject).moment
  ).moment;
  const pending = buildTimelineMomentFromClosedProject({
    ...closedProject,
    projectId: "project-1002",
  }).moment;

  assert.equal(getTimelineMomentsForProject([confirmed, pending], "project-1001").length, 1);
  assert.equal(
    getBusinessProfileTimelineMoments([confirmed, pending], {
      businessId: "business-bgone",
    }).length,
    1
  );
  assert.equal(getCustomerHomeTimelinePlaceholder().title, "Meetro Moments");
});

test("Meetro Moment privacy labels stay calm and explicit", () => {
  assert.deepEqual(getTimelineMomentPrivacyLabel({
    status: TIMELINE_MOMENT_STATUSES.PENDING_CUSTOMER_CONFIRMATION,
  }), {
    key: "pending",
    label: "Pending confirmation",
    message: "This Moment is waiting for customer confirmation.",
    publicVisible: false,
  });

  assert.equal(getTimelineMomentPrivacyLabel({
    status: TIMELINE_MOMENT_STATUSES.PRIVATE,
  }).message, "This Moment is saved privately.");

  assert.equal(getTimelineMomentPrivacyLabel({
    status: TIMELINE_MOMENT_STATUSES.HIDDEN,
  }).label, "Hidden");
});

test("Verified Meetro Moment label requires an approved source event", () => {
  const valid = buildTimelineMomentFromClosedProject(closedProject).moment;
  const invalidOrigin = { ...valid, origin: "random_update" };
  const unverified = { ...valid, verified: false };

  assert.equal(isVerifiedTimelineMoment(valid), true);
  assert.equal(isVerifiedTimelineMoment(invalidOrigin), false);
  assert.equal(isVerifiedTimelineMoment(unverified), false);
});

test("public business profile moments expose only published verified moments", () => {
  const published = confirmTimelineMoment(
    buildTimelineMomentFromClosedProject(closedProject).moment
  ).moment;
  const pending = buildTimelineMomentFromClosedProject({
    ...closedProject,
    projectId: "project-pending",
  }).moment;
  const privateMoment = {
    ...published,
    id: "private-moment",
    projectId: "project-private",
    status: TIMELINE_MOMENT_STATUSES.PRIVATE,
  };
  const hiddenMoment = {
    ...published,
    id: "hidden-moment",
    projectId: "project-hidden",
    status: TIMELINE_MOMENT_STATUSES.HIDDEN,
  };

  const publicMoments = getBusinessProfileTimelineMoments(
    [published, pending, privateMoment, hiddenMoment],
    { businessId: "business-bgone" }
  );

  assert.deepEqual(publicMoments.map((moment) => moment.id), [published.id]);
});

test("involved users can see pending and private moments without exposing unrelated moments", () => {
  const published = confirmTimelineMoment(
    buildTimelineMomentFromClosedProject(closedProject).moment
  ).moment;
  const pending = buildTimelineMomentFromClosedProject({
    ...closedProject,
    projectId: "project-pending",
  }).moment;
  const privateMoment = {
    ...published,
    id: "private-moment",
    projectId: "project-private",
    status: TIMELINE_MOMENT_STATUSES.PRIVATE,
  };
  const unrelated = {
    ...published,
    id: "unrelated-moment",
    projectId: "project-unrelated",
    customerId: "customer-lori",
    relationshipId: "relationship-lori-bgone",
  };

  const homeownerMoments = getTimelineMomentsForViewer(
    [published, pending, privateMoment, unrelated],
    { userId: "customer-sarah" }
  );

  assert.equal(canDisplayTimelineMomentForViewer(pending, { userId: "customer-sarah" }), true);
  assert.equal(canDisplayTimelineMomentForViewer(unrelated, { userId: "customer-sarah" }), false);
  assert.deepEqual(
    homeownerMoments.map((moment) => moment.id).sort(),
    [published.id, pending.id, privateMoment.id].sort()
  );
});

test("Meetro Moment detail model renders only verified source-backed moments", () => {
  const confirmed = confirmTimelineMoment(
    buildTimelineMomentFromClosedProject(closedProject).moment
  ).moment;
  const moments = [confirmed];

  assert.equal(getTimelineMomentById(moments, confirmed.id).id, confirmed.id);

  const detail = getMeetroMomentDetailModel(
    confirmed,
    { userId: "customer-sarah" },
    moments
  );

  assert.equal(detail.visible, true);
  assert.equal(detail.verified, true);
  assert.equal(detail.title, "Kitchen cabinet repair");
  assert.equal(detail.relationshipContext.customerName, "Sarah Dommerich");
  assert.equal(detail.visual.photoCount, 2);

  const unverified = getMeetroMomentDetailModel(
    { ...confirmed, origin: "random_update" },
    { userId: "customer-sarah" },
    moments
  );

  assert.equal(unverified.visible, false);
  assert.equal(unverified.reason, "unverified-source");
});

test("Meetro Moment detail protects pending and private moments on public surfaces", () => {
  const pending = buildTimelineMomentFromClosedProject(closedProject).moment;
  const privateMoment = {
    ...confirmTimelineMoment(pending).moment,
    id: "private-detail",
    status: TIMELINE_MOMENT_STATUSES.PRIVATE,
  };

  assert.equal(
    getMeetroMomentDetailModel(pending, {}, [pending], { publicSurface: true }).visible,
    false
  );
  assert.equal(
    getMeetroMomentDetailModel(privateMoment, {}, [privateMoment], { publicSurface: true }).visible,
    false
  );
});

test("public Meetro Moment detail redacts unapproved customer context", () => {
  const published = {
    ...buildTimelineMomentFromClosedProject(closedProject).moment,
    status: TIMELINE_MOMENT_STATUSES.PUBLISHED,
    confirmationRequired: false,
    customerConfirmed: false,
    investment: "$2,400",
    address: "123 Private Lane",
  };

  const detail = getMeetroMomentDetailModel(
    published,
    {},
    [published],
    { publicSurface: true }
  );

  assert.equal(detail.visible, true);
  assert.equal(detail.relationshipContext.customerName, "");
  assert.equal(detail.details.reviewRating, "");
  assert.equal(detail.details.investment, "");
  assert.equal(detail.details.address, "");
  assert.equal(detail.visual.photoCount, 0);
});

test("involved users see private context on Meetro Moment detail", () => {
  const confirmed = confirmTimelineMoment(
    buildTimelineMomentFromClosedProject({
      ...closedProject,
    }).moment
  ).moment;
  const enriched = {
    ...confirmed,
    investment: "$2,400",
    address: "123 Private Lane",
    duration: "Three weeks",
  };

  const detail = getMeetroMomentDetailModel(
    enriched,
    { userId: "customer-sarah" },
    [enriched]
  );

  assert.equal(detail.visible, true);
  assert.equal(detail.details.investment, "$2,400");
  assert.equal(detail.details.address, "123 Private Lane");
  assert.equal(detail.details.duration, "Three weeks");
  assert.equal(detail.details.reviewRating, 5);
});

test("related Meetro Moments only include published or allowed moments", () => {
  const main = confirmTimelineMoment(
    buildTimelineMomentFromClosedProject(closedProject).moment
  ).moment;
  const relatedPublished = {
    ...main,
    id: "related-published",
    projectId: "project-related",
    projectTitle: "Roof repair",
    projectCategory: main.projectCategory,
  };
  const hidden = {
    ...main,
    id: "hidden-related",
    projectId: "project-hidden-related",
    status: TIMELINE_MOMENT_STATUSES.HIDDEN,
  };
  const unrelated = {
    ...main,
    id: "unrelated-detail",
    relationshipId: "relationship-other",
    businessId: "business-other",
    businessName: "Other Business",
    projectCategory: "Other Work",
  };

  const detail = getMeetroMomentDetailModel(
    main,
    {},
    [main, relatedPublished, hidden, unrelated],
    { publicSurface: true }
  );

  assert.deepEqual(detail.relatedMoments.map((moment) => moment.id), ["related-published"]);
});

test("Meetro Moment detail routes carry the selected moment id", () => {
  assert.equal(getMeetroMomentHashRoute("moment-1001"), "/moments/moment-1001");
  assert.equal(getMeetroMomentHashRoute("moment 1001"), "/moments/moment%201001");
  assert.equal(getMeetroMomentRouteId("#/moments/moment%201001"), "moment 1001");
  assert.equal(getMeetroMomentRouteId("/moments/moment-1001"), "moment-1001");
  assert.equal(getMeetroMomentRouteId("moments/moment-1001"), "moment-1001");
  assert.equal(getMeetroMomentRoutePage("#/moments/moment-1001"), MEETRO_MOMENT_DETAILS_PAGE);
  assert.equal(getMeetroMomentRoutePage("/moments/moment-1001"), MEETRO_MOMENT_DETAILS_PAGE);
  assert.equal(getMeetroMomentRoutePage("#/moments"), MEETRO_MOMENTS_PAGE);
  assert.equal(getMeetroMomentRoutePage("/moments"), MEETRO_MOMENTS_PAGE);
});

test("Meetro Moments first-time experience has reflection and staged inspiration", () => {
  const momentsPath = path.join(process.cwd(), "src/pages/MeetroMoments.jsx");
  const momentsSource = fs.readFileSync(momentsPath, "utf8");

  assert.match(momentsSource, /welcomeHero/);
  assert.match(momentsSource, /t\("momentsWelcomeText", language\)/);
  assert.match(momentsSource, /t\("momentsPreservationStatementTitle", language\)/);
  assert.match(momentsSource, /t\("momentsPreservationStatementText", language\)/);
  assert.match(momentsSource, /t\("momentsPromiseText", language\)/);
  assert.equal(
    t("momentsWelcomeText", "en"),
    "This is where completed work becomes remembered history: the projects, people, and promises worth carrying forward."
  );
  assert.equal(t("momentsPromiseText", "en"), "Only verified work becomes a remembered Moment.");
  assert.equal(t("momentsPreservationStatementTitle", "en"), "What deserves to be remembered");
  assert.match(momentsSource, /t\("momentsReflectionLabel", language\)/);
  assert.match(momentsSource, /STAGED_MOMENT_INSPIRATION/);
  assert.match(momentsSource, /Home Story/);
  assert.match(momentsSource, /Relationship Story/);
  assert.match(momentsSource, /Business Legacy/);
  assert.match(momentsSource, /Community Impact/);
  assert.match(momentsSource, /t\("momentsFutureMemory", language\)/);
  assert.match(momentsSource, /t\("momentsEmptyTitle", language\)/);
  assert.match(momentsSource, /t\("momentsEmptyText", language\)/);
  assert.match(momentsSource, /welcomeHeroShade/);
  assert.match(momentsSource, /STAGED_MOMENT_INSPIRATION\.length - moments\.length/);
  assert.doesNotMatch(momentsSource, /Create Moment/);
  assert.doesNotMatch(momentsSource, /These are not user records/);
  assert.doesNotMatch(momentsSource, /Example inspiration/);
});

test("Meetro Moments preservation pass keeps the page distinct from Spotlight and social surfaces", () => {
  const momentsPath = path.join(process.cwd(), "src/pages/MeetroMoments.jsx");
  const discoverPath = path.join(process.cwd(), "src/pages/Discover.jsx");
  const momentsSource = fs.readFileSync(momentsPath, "utf8");
  const discoverSource = fs.readFileSync(discoverPath, "utf8");

  assert.match(momentsSource, /getTimelineMomentsForViewer/);
  assert.match(momentsSource, /t\("momentsPreservationStatementTitle", language\)/);
  assert.match(momentsSource, /t\("momentsVerifiedHistory", language\)/);
  assert.match(momentsSource, /t\("momentsYourMoments", language\)/);
  assert.match(discoverSource, /communitySpotlightPrincipleTitle/);
  assert.match(discoverSource, /communitySpotlightPrincipleText/);
  assert.doesNotMatch(momentsSource, /communitySpotlight/);
  assert.doesNotMatch(momentsSource, /renderBusinessCard/);
  assert.doesNotMatch(momentsSource, /setActiveAccountMode/);

  const preservationCopy = [
    t("momentsWelcomeText", "en"),
    t("momentsPreservationStatementTitle", "en"),
    t("momentsPreservationStatementText", "en"),
    t("momentsPromiseText", "en"),
    t("momentsEmptyTitle", "en"),
    t("momentsEmptyText", "en"),
  ].join(" ");
  assert.match(preservationCopy, /remembered|preserve|history|completed work/i);

  for (const source of [momentsSource]) {
    assert.doesNotMatch(source, /What do you want to post/i);
    assert.doesNotMatch(source, /Social Post/i);
    assert.doesNotMatch(source, /Likes/i);
    assert.doesNotMatch(source, /Comments/i);
    assert.doesNotMatch(source, /Followers/i);
    assert.doesNotMatch(source, /Hashtags/i);
    assert.doesNotMatch(source, /Feed/i);
    assert.doesNotMatch(source, /Wall/i);
  }
});

test("Meetro Moments staged inspiration follows emotional storytelling", () => {
  const momentsPath = path.join(process.cwd(), "src/pages/MeetroMoments.jsx");
  const standardPath = path.join(
    process.cwd(),
    "docs/KnowledgeBase/MEETRO_EMOTIONAL_STORYTELLING_STANDARD.md"
  );
  const timelineDocPath = path.join(process.cwd(), "docs/KnowledgeBase/MEETRO_TIMELINE_SYSTEM.md");
  const momentsSource = fs.readFileSync(momentsPath, "utf8");
  const standardSource = fs.readFileSync(standardPath, "utf8");
  const timelineDocSource = fs.readFileSync(timelineDocPath, "utf8");

  assert.match(standardSource, /The Law of Living Photography/);
  assert.match(standardSource, /What became possible because this work was completed/);
  assert.match(standardSource, /Meetro does not celebrate construction/);
  assert.match(timelineDocSource, /Meetro Emotional Storytelling Standard/);
  assert.match(timelineDocSource, /Law of Living Photography/);
  assert.match(timelineDocSource, /Wonder Pass/);
  assert.match(momentsSource, /The kitchen where Sunday dinners began/);
  assert.match(momentsSource, /One project became years of trust/);
  assert.match(momentsSource, /The thank-you that became a reputation/);
  assert.match(momentsSource, /Neighbors had one more place to belong/);
  assert.match(momentsSource, /Summer evenings became family traditions/);
  assert.doesNotMatch(momentsSource, /The room that became the center of the home/);
  assert.doesNotMatch(momentsSource, /The project that strengthened a reputation/);
  assert.doesNotMatch(momentsSource, /Empty bedroom|Empty kitchen|Interior design photography/);
});

test("closure offer uses Meetro Moment language and requires closure", () => {
  const offer = buildTimelineClosureOffer(closedProject);
  const blocked = buildTimelineClosureOffer({
    ...closedProject,
    status: "completed",
    workflowStatus: "completed",
    savedToHistory: false,
    closedAt: "",
    closureStatus: "",
  });

  assert.equal(offer.eligible, true);
  assert.equal(offer.offer.title, "Project Successfully Closed");
  assert.equal(offer.offer.primaryActionLabel, "Preserve Meetro Moment");
  assert.equal(offer.offer.secondaryActionLabel, "Keep in History");
  assert.equal(blocked.eligible, false);
  assert.equal(blocked.reason, "job-closure-required");
});

test("unverified completion details cannot create a Meetro Moment", () => {
  const completedJobPath = path.join(process.cwd(), "src/pages/CompletedJobDetails.jsx");
  const utilityPath = path.join(process.cwd(), "src/utils/meetroTimeline.js");
  const completedJobSource = fs.readFileSync(completedJobPath, "utf8");
  const utilitySource = fs.readFileSync(utilityPath, "utf8");

  assert.match(completedJobSource, /completedHistoryNoMutationNotice/);
  assert.match(utilitySource, /primaryActionLabel: "Preserve Meetro Moment"/);
  assert.doesNotMatch(
    completedJobSource,
    /createTimelineMomentFromClosedProject|Preserve Meetro Moment|Keep in History|contentEditable|localStorage\.setItem/
  );
});

test("Timeline storage upserts by project and relationship instead of duplicating", () => {
  const storage = createStorage();
  createTimelineMomentFromClosedProject(closedProject, {
    storage,
    thankYouMessage: "First message",
  });
  createTimelineMomentFromClosedProject(closedProject, {
    storage,
    thankYouMessage: "Updated message",
  });

  const saved = JSON.parse(storage.getItem(MEETRO_TIMELINE_STORAGE_KEY));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].thankYouMessage, "Updated message");
});

test("random posting UI does not exist in the Timeline foundation", () => {
  const utilityPath = path.join(process.cwd(), "src/utils/meetroTimeline.js");
  const docPath = path.join(process.cwd(), "docs/KnowledgeBase/MEETRO_TIMELINE_SYSTEM.md");
  const utility = fs.readFileSync(utilityPath, "utf8");
  const doc = fs.readFileSync(docPath, "utf8");

  assert.ok(!utility.includes("What do you want to post"));
  assert.ok(!utility.includes("createRandom"));
  assert.ok(!utility.includes("Social Post"));
  assert.ok(doc.includes("The Law of Verified History"));
  assert.ok(doc.includes("The Law of Natural Continuity"));
});

test("Meetro Moments experience personalizes by account role", () => {
  const homeowner = getMeetroMomentsExperience({ activeMode: "personal" });
  const business = getMeetroMomentsExperience({ activeMode: "business", hasBusinessProfile: true });
  const employee = getMeetroMomentsExperience({ role: "employee" });
  const community = getMeetroMomentsExperience({ role: "community" });

  assert.equal(homeowner.title, "Your Meetro Moments");
  assert.equal(homeowner.subtitle, "Every completed project becomes part of your home's story.");
  assert.equal(homeowner.emptyState, "Your story begins with your first completed project.");

  assert.equal(business.title, "Your Meetro Moments");
  assert.equal(business.subtitle, "Every completed project becomes part of your business legacy.");
  assert.equal(business.emptyState, "Every completed project becomes part of your business legacy.");

  assert.equal(employee.title, "Your Meetro Moments");
  assert.equal(employee.subtitle, "Every accomplishment becomes part of your professional journey.");
  assert.equal(employee.emptyState, "Your professional journey begins with your first completed accomplishment.");

  assert.equal(community.title, "Community Meetro Moments");
  assert.equal(community.subtitle, "Celebrating the projects that strengthen our community.");
});

test("Meetro Moments is reachable from Profile and does not expose a public composer", () => {
  const profilePath = path.join(process.cwd(), "src/pages/Profile.jsx");
  const momentsPath = path.join(process.cwd(), "src/pages/MeetroMoments.jsx");
  const momentDetailsPath = path.join(process.cwd(), "src/pages/MeetroMomentDetails.jsx");
  const momentRoutesPath = path.join(process.cwd(), "src/utils/meetroMomentRoutes.js");
  const completedJobPath = path.join(process.cwd(), "src/pages/CompletedJobDetails.jsx");
  const conversationThreadPath = path.join(process.cwd(), "src/pages/ConversationThread.jsx");
  const relationshipCenterPath = path.join(process.cwd(), "src/pages/CustomerRelationshipsCenter.jsx");
  const contractorDashboardPath = path.join(process.cwd(), "src/pages/ContractorDashboard.jsx");
  const appPath = path.join(process.cwd(), "src/App.jsx");

  const profileSource = fs.readFileSync(profilePath, "utf8");
  const momentsSource = fs.readFileSync(momentsPath, "utf8");
  const momentDetailsSource = fs.readFileSync(momentDetailsPath, "utf8");
  const momentRoutesSource = fs.readFileSync(momentRoutesPath, "utf8");
  const utilitySource = fs.readFileSync(path.join(process.cwd(), "src/utils/meetroTimeline.js"), "utf8");
  const completedJobSource = fs.readFileSync(completedJobPath, "utf8");
  const conversationThreadSource = fs.readFileSync(conversationThreadPath, "utf8");
  const relationshipCenterSource = fs.readFileSync(relationshipCenterPath, "utf8");
  const contractorDashboardSource = fs.readFileSync(contractorDashboardPath, "utf8");
  const appSource = fs.readFileSync(appPath, "utf8");

  assert.match(profileSource, /label="Meetro Moments"/);
  assert.match(profileSource, /setPage\("meetroMoments"\)/);
  assert.match(appSource, /page === "meetroMoments"/);
  assert.match(appSource, /page === "meetroMomentDetails"/);
  assert.match(appSource, /getMeetroMomentRouteId/);
  assert.match(appSource, /getMeetroMomentRoutePage/);
  assert.match(momentsSource, /getMeetroMomentHashRoute\(momentId\)/);
  assert.match(momentDetailsSource, /getMeetroMomentRouteId\(route\)/);
  assert.match(momentDetailsSource, /getMeetroMomentHashRoute\(momentId\)/);
  assert.match(momentRoutesSource, /\/moments\/\$\{encodeURIComponent\(cleanMomentId\)\}/);
  assert.match(completedJobSource, /completedHistoryNoMutationNotice/);
  assert.doesNotMatch(completedJobSource, /Preserve Meetro Moment|createTimelineMomentFromClosedProject/);
  assert.doesNotMatch(completedJobSource, /Meetro Timeline/);
  assert.doesNotMatch(conversationThreadSource, /Read Timeline Item/);
  assert.doesNotMatch(conversationThreadSource, /Timeline preview/);
  assert.doesNotMatch(relationshipCenterSource, /Relationship Timeline/);
  assert.doesNotMatch(contractorDashboardSource, /">\s*Timeline\s*<"/);
  assert.match(momentsSource, /t\("momentsVerifiedLabel", language\)/);
  assert.match(utilitySource, /This Moment is waiting for customer confirmation\./);
  assert.match(utilitySource, /This Moment is saved privately\./);
  assert.match(momentsSource, /t\("momentsReceiptSaved", language\)/);
  assert.match(momentsSource, /t\("momentsBeforeAfterPreviewAria", language\)/);
  assert.match(momentDetailsSource, /momentDetailBack/);
  assert.match(momentDetailsSource, /momentDetailVerified/);
  assert.match(momentDetailsSource, /momentDetailWhyItMatters/);
  assert.match(momentDetailsSource, /momentDetailJourney/);
  assert.match(momentDetailsSource, /momentDetailRelated/);
  assert.match(momentDetailsSource, /momentDetailRelationshipHistory/);

  for (const source of [momentsSource, momentDetailsSource, completedJobSource]) {
    assert.doesNotMatch(source, /What do you want to post/i);
    assert.doesNotMatch(source, /Social Post/i);
    assert.doesNotMatch(source, /Likes/i);
    assert.doesNotMatch(source, /Comments/i);
    assert.doesNotMatch(source, /Followers/i);
    assert.doesNotMatch(source, /Hashtags/i);
    assert.doesNotMatch(source, /public composer/i);
  }
});

test("Meetro Moments first impression copy is covered by language.js", () => {
  const momentsPath = path.join(process.cwd(), "src/pages/MeetroMoments.jsx");
  const momentsSource = fs.readFileSync(momentsPath, "utf8");
  const keys = [
    "momentsBackToProfile",
    "momentsEyebrow",
    "momentsWelcomeText",
    "momentsPreservationStatementAria",
    "momentsPreservationStatementTitle",
    "momentsPreservationStatementText",
    "momentsPromiseAria",
    "momentsPromiseText",
    "momentsReflectionAria",
    "momentsReflectionLabel",
    "momentsVerifiedReflectionBody",
    "momentsViewMoment",
    "momentsSeeWhatMomentsBecome",
    "momentsStoryInspiration",
    "momentsStoryTakingOver",
    "momentsStoryCanBecome",
    "momentsInspirationText",
    "momentsInspirationAria",
    "momentsFutureMemory",
    "momentsCompleteOwnStory",
    "momentsVerifiedHistory",
    "momentsYourMoments",
    "momentsEmptyTitle",
    "momentsEmptyText",
    "momentsReceiptSaved",
    "momentsBeforeAfterPreviewAria",
    "momentsVerifiedLabel",
  ];

  assert.match(momentsSource, /import \{ t \} from "\.\.\/utils\/language"/);
  assert.match(momentsSource, /import useLanguage from "\.\.\/hooks\/useLanguage"/);
  for (const key of keys) {
    assert.match(momentsSource, new RegExp(`t\\("${key}", language\\)`));
    for (const language of ["en", "es", "fr", "pt-BR"]) {
      assert.equal(typeof translations[language][key], "string", `${language} ${key}`);
      assert.ok(translations[language][key].trim(), `${language} ${key}`);
      assert.notEqual(t(key, language), key);
    }
  }
});
