import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeSource = readFileSync(
  new URL("../src/pages/Home.jsx", import.meta.url),
  "utf8"
);

const publicProfileSource = readFileSync(
  new URL("../src/pages/ContractorDetails.jsx", import.meta.url),
  "utf8"
);

const portfolioSource = readFileSync(
  new URL(
    "../src/components/PortfolioProjectPresentation.jsx",
    import.meta.url
  ),
  "utf8"
);

const requestCommunicationSource = readFileSync(
  new URL(
    "../src/utils/requestCommunication.js",
    import.meta.url
  ),
  "utf8"
);

const messagesSource = readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);

const threadSource = readFileSync(
  new URL("../src/pages/ConversationThread.jsx", import.meta.url),
  "utf8"
);

test("customer-facing public Portfolio carries business logo and name beside proof of work", () => {
  assert.match(
    portfolioSource,
    /function BusinessIdentityAttribution/
  );

  assert.match(
    portfolioSource,
    /businessLogo = ""/
  );

  assert.match(
    portfolioSource,
    /showBusinessIdentity = false/
  );

  assert.match(
    portfolioSource,
    /src=\{businessLogo\}/
  );

  assert.match(
    portfolioSource,
    /const businessLogoImage = \{[\s\S]*objectFit: "contain"/
  );

  assert.match(
    portfolioSource,
    /businessInitials\(businessName\)/
  );

  assert.match(
    portfolioSource,
    /businessName && !showBusinessIdentity && \(/
  );

  assert.match(
    publicProfileSource,
    /<PortfolioProjectView[\s\S]*businessLogo=\{businessIdentity\.imageUrl\}[\s\S]*showBusinessIdentity/
  );

  assert.match(
    publicProfileSource,
    /<PortfolioProjectCard[\s\S]*businessLogo=\{businessIdentity\.imageUrl\}[\s\S]*showBusinessIdentity/
  );
});

test("Home Spotlight keeps project work media separate from visible business-logo attribution", () => {
  assert.match(
    homeSource,
    /const logoUrl = identity\.imageUrl \|\| getSpotlightAvatarUrl\(business\)/
  );

  assert.match(
    homeSource,
    /src=\{visibleLogoUrl\}/
  );

  assert.match(
    homeSource,
    /<SpotlightSlideshow[\s\S]*images=\{mediaUrls\}/
  );

  assert.match(
    homeSource,
    /<strong style=\{spotlightName\} title=\{name\}>\{name\}<\/strong>/
  );
});

test("canonical homeowner Communication Center receives the business image and renders it as a logo", () => {
  assert.match(
    requestCommunicationSource,
    /const participantAvatar = String\(display\.image_url \|\| ""\)\.trim\(\)/
  );

  assert.match(
    requestCommunicationSource,
    /businessProfilePhoto:\s*accountMode === "personal" \? participantAvatar : ""/
  );

  assert.match(
    messagesSource,
    /normalizedViewerRole === "homeowner"/
  );

  assert.match(
    messagesSource,
    /return businessParticipant \? businessLogoAvatarImage : avatarImage/
  );

  assert.match(
    messagesSource,
    /const businessLogoAvatarImage = \{[\s\S]*objectFit: "contain"/
  );

  assert.match(
    messagesSource,
    /src=\{rowIdentity\.avatar\}/
  );

  assert.match(
    messagesSource,
    /src=\{contextIdentity\.avatar\}/
  );
});

test("canonical homeowner conversation header consumes server-projected business imageUrl", () => {
  assert.match(
    threadSource,
    /isCanonicalThread && currentViewerRole !== "business"[\s\S]*canonicalConversationDetail\?\.participants\?\.business\?\.imageUrl \|\| ""/
  );

  assert.match(
    threadSource,
    /activeIdentityUsesBusinessLogo[\s\S]*currentViewerRole !== "business"/
  );

  assert.match(
    threadSource,
    /activeIdentityUsesBusinessLogo[\s\S]*businessLogoAvatarImage/
  );

  assert.match(
    threadSource,
    /const businessLogoAvatarImage = \{[\s\S]*objectFit: "contain"/
  );
});

test("customer-facing identity certification adds presentation only and no media persistence authority", () => {
  assert.doesNotMatch(
    portfolioSource,
    /authFetch|fetch\(|API_URL|localStorage|sessionStorage/
  );

  assert.doesNotMatch(
    portfolioSource,
    /FileReader|canvas|toDataURL|base64/i
  );
});
