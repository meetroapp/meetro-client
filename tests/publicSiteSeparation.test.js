import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

const publicSitePath = "src/public/PublicSite.jsx";
const appPath = "src/App.jsx";
const mainPath = "src/main.jsx";

function assertAppearsInOrder(source, phrases) {
  let lastIndex = -1;

  phrases.forEach((phrase) => {
    const index = source.indexOf(phrase);
    assert.notEqual(index, -1, `${phrase} should appear`);
    assert.ok(index > lastIndex, `${phrase} should appear in order`);
    lastIndex = index;
  });
}

test("public website routes are separated from the authenticated app shell", () => {
  assert.equal(existsSync(publicSitePath), true);
  assert.equal(existsSync("public/_redirects"), true);
  assert.equal(existsSync("vercel.json"), true);

  const publicSite = readFileSync(publicSitePath, "utf8");
  const app = readFileSync(appPath, "utf8");
  const main = readFileSync(mainPath, "utf8");

  assert.match(publicSite, /Meetro/);
  assert.match(publicSite, /Community/);
  assert.match(publicSite, /Every trusted relationship begins with/);
  assert.match(publicSite, /Built around trust\. Powered by relationships\./);
  assert.match(publicSite, /People do not join Meetro Community because they need another app/);
  assert.match(publicSite, /Why Meetro Community exists/);
  assert.match(publicSite, /Every meaningful project begins with a person/);
  assert.match(publicSite, /The Journey We Build Together/);
  assert.match(publicSite, /Ask Meetro is your companion throughout Meetro Community/);
  assert.match(publicSite, /Guided by Ask Meetro\. Powered by Meetro Intelligence\./);
  assert.match(publicSite, /Meetro Community helps professionals:/);
  assert.match(publicSite, /Meetro Community ayuda a los profesionales:/);
  assert.match(publicSite, /A Meetro Community ajuda profissionais:/);
  assert.match(publicSite, /Meetro Community aide les professionnels :/);
  assert.doesNotMatch(publicSite, /outcomesHeading: "Meetro Community helps professionals become:/);
  assert.match(publicSite, /People may arrive looking for help/);
  assert.match(publicSite, /Know someone who would appreciate this vision\?/);
  assert.match(publicSite, /Join the Journey/);
  assert.match(publicSite, /Invite Someone to the Journey/);
  assert.match(publicSite, /PUBLIC_LANGUAGES/);
  assert.match(publicSite, /English/);
  assert.match(publicSite, /Español/);
  assert.match(publicSite, /Português/);
  assert.match(publicSite, /Français/);
  assert.match(publicSite, /meetroPublicLanguage/);
  assert.match(publicSite, /PublicLanguageSwitcher/);
  assert.match(publicSite, /Cada relación de confianza comienza con/);
  assert.match(publicSite, /Toda relação de confiança começa com/);
  assert.match(publicSite, /Toute relation de confiance commence par/);
  assert.match(publicSite, /Ask Meetro/);
  assert.match(publicSite, /Meetro Intelligence/);
  assert.match(publicSite, /navigator\.share/);
  assert.match(publicSite, /navigator\.clipboard\.writeText/);
  assert.match(publicSite, /function copyPublicShareUrl/);
  assert.match(publicSite, /Invitation link copied\./);
  assert.doesNotMatch(publicSite, /referral|invite credits|Share Now|social counters|signup incentives/i);
  assertAppearsInOrder(publicSite, [
    '["1", "Relationships", "Connections create opportunity."]',
    "Connections create opportunity.",
    '["2", "Communication", "Conversations create clarity."]',
    "Conversations create clarity.",
    '["3", "Understanding", "Understanding creates confidence."]',
    "Understanding creates confidence.",
    '["4", "Decisions", "Decisions create direction."]',
    "Decisions create direction.",
    '["5", "Work", "Work creates value."]',
    "Work creates value.",
    '["6", "History", "History builds trust."]',
    "History builds trust.",
    "Stronger relationships create more good.",
  ]);
  assert.doesNotMatch(publicSite, /Connect\. Communicate\. Complete\./);
  assert.doesNotMatch(publicSite, /Preparing for launch/);
  assert.doesNotMatch(publicSite, /cartoon|mascot|smiling face|marketplace-first|modern platform/i);
  assert.match(publicSite, /WM FLEX LABS, LLC/);
  assert.match(publicSite, /william@flexlabs\.com/);
  assert.match(publicSite, /"\/privacy"/);
  assert.match(publicSite, /"\/terms"/);
  assert.match(publicSite, /"\/contact"/);
  assert.doesNotMatch(publicSite, /badgeDot/);
  assert.match(publicSite, /MEETRO_COMMUNITY_PRIVACY_POLICY\.md\?raw/);
  assert.match(publicSite, /MEETRO_COMMUNITY_TERMS_OF_USE\.md\?raw/);
  assert.match(publicSite, /content=\{PUBLIC_DOCUMENTS\.privacy\.content\}/);
  assert.match(publicSite, /content=\{PUBLIC_DOCUMENTS\.terms\.content\}/);
  assert.match(publicSite, /function PublicMarkdownDocument/);
  assert.match(publicSite, /Back to Meetro Community/);
  assert.match(publicSite, /href="\/"/);
  assert.match(publicSite, /public-hero-actions/);
  assert.match(publicSite, /public-hero-lamp-post/);
  assert.match(publicSite, /@media \(max-width: 480px\)/);
  assert.match(publicSite, /min-height: auto !important/);
  assert.match(publicSite, /font-size: clamp\(38px, 11vw, 50px\) !important/);
  assert.match(publicSite, /max-width: min\(100%, 352px\) !important/);
  assert.match(publicSite, /alignItems: "center"/);
  assert.match(publicSite, /justifyContent: "center"/);
  assert.match(publicSite, /lineHeight: 1/);
  assert.match(publicSite, /@media \(max-width: 380px\)/);
  assert.match(publicSite, /public-language-switcher/);
  assert.doesNotMatch(
    publicSite,
    /BottomNav|MeetroAssistant|BusinessDashboard|MessagesInbox|Work Center|WorkCenter|AuthProvider|SessionProvider|Login|TestFlight|roadmap|pricing|AI details/i
  );
  assert.doesNotMatch(publicSite, /#login|setPage|sessionStorage|meetroLanguage/);

  assert.doesNotMatch(app, /PublicLanding/);
  assert.doesNotMatch(app, /publicLanding/);

  assert.match(main, /PublicSite/);
  assert.match(main, /isPublicWebsitePath/);
  assert.match(main, /isNativeRuntime/);
  assert.match(main, /window\.location\.pathname === "\/login"/);
  assert.match(main, /const App = lazy\(\(\) => import\('\.\/App\.jsx'\)\)/);
  assert.doesNotMatch(main, /import App from ['"]\.\/App\.jsx['"]/);
  assert.match(main, /if \(isNativeRuntime\(\)\) return false/);
  assert.match(main, /shouldUsePublicSite \? \(/);
  assert.match(main, /Do not merge these experiences without explicit architectural approval/);
});

test("public legal links route to existing public legal documents", () => {
  const publicSite = readFileSync(publicSitePath, "utf8");

  assert.match(publicSite, /const PUBLIC_LINKS = \[/);
  assert.match(publicSite, /\{ id: "privacy", label: "Privacy Policy", href: "\/privacy" \}/);
  assert.match(publicSite, /\{ id: "terms", label: "Terms of Service", href: "\/terms" \}/);
  assert.match(publicSite, /\{ id: "contact", label: "Contact Us", href: "\/contact" \}/);
  assert.match(publicSite, /const PUBLIC_ROUTES = new Set\(\["\/", "\/privacy", "\/terms", "\/contact"\]\)/);
  assert.match(publicSite, /if \(path === "\/privacy"\)/);
  assert.match(publicSite, /if \(path === "\/terms"\)/);
  assert.match(publicSite, /if \(path === "\/contact"\)/);
  assert.doesNotMatch(publicSite, /Privacy Policy"\s+text="Meetro Community privacy information is maintained/);
  assert.doesNotMatch(publicSite, /Terms of Service"\s+text="Meetro Community terms of service are maintained/);
});

test("public presence standard documents the public and app boundary", () => {
  assert.equal(existsSync("docs/KnowledgeBase/PUBLIC_PRESENCE_STANDARD.md"), true);

  const standard = readFileSync(
    "docs/KnowledgeBase/PUBLIC_PRESENCE_STANDARD.md",
    "utf8"
  );

  assert.match(standard, /Public Presence Standard/);
  assert.match(standard, /Public vs App Separation/);
  assert.match(standard, /Allowed Public Content/);
  assert.match(standard, /Not Allowed Public Content/);
  assert.match(standard, /Authenticated product experiences belong inside the app/);
  assert.match(standard, /Phase 1 — Public Presence/);
  assert.match(standard, /Phase 2 — TestFlight/);
  assert.match(standard, /Phase 3 — Public Launch/);
});
