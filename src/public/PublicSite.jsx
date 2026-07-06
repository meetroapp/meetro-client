import termsOfUse from "../../docs/KnowledgeBase/MEETRO_COMMUNITY_TERMS_OF_USE.md?raw";
import privacyPolicy from "../../docs/KnowledgeBase/MEETRO_COMMUNITY_PRIVACY_POLICY.md?raw";

const PUBLIC_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Contact Us", href: "/contact" },
];

const PUBLIC_NAV_LINKS = [
  { label: "Why Meetro Community", href: "#why" },
  { label: "How It Works", href: "#journey" },
  { label: "Resources", href: "#resources" },
  { label: "Contact Us", href: "/contact" },
];

const PUBLIC_ROUTES = new Set(["/", "/privacy", "/terms", "/contact"]);

const PUBLIC_DOCUMENTS = {
  privacy: {
    title: "Privacy Policy",
    content: privacyPolicy,
  },
  terms: {
    title: "Terms of Service",
    content: termsOfUse,
  },
};

const journeySteps = [
  {
    number: "1",
    title: "Relationships",
    text: "Connections create opportunity.",
  },
  {
    number: "2",
    title: "Communication",
    text: "Conversations create clarity.",
  },
  {
    number: "3",
    title: "Understanding",
    text: "Understanding creates confidence.",
  },
  {
    number: "4",
    title: "Decisions",
    text: "Decisions create direction.",
  },
  {
    number: "5",
    title: "Work",
    text: "Work creates value.",
  },
  {
    number: "6",
    title: "History",
    text: "History builds trust.",
  },
  {
    number: "7",
    title: "Relationships",
    text: "Stronger relationships create more good.",
  },
];

const audienceCards = [
  {
    icon: "People",
    title: "For People",
    text: "Find trusted help and build relationships that make life easier.",
  },
  {
    icon: "Pros",
    title: "For Professionals",
    text: "Grow your business, build your reputation, and do work that matters.",
  },
  {
    icon: "Homes",
    title: "For Communities",
    text: "Neighbors supporting neighbors creates stronger, more vibrant communities.",
  },
];

const professionalOutcomes = [
  {
    title: "Build lasting trust.",
    text: "Show up prepared and deliver with confidence.",
  },
  {
    title: "Stay organized with confidence.",
    text: "Manage your work with clarity.",
  },
  {
    title: "Preserve meaningful projects.",
    text: "Keep the work, decisions, and history together.",
  },
  {
    title: "Spend more time serving people.",
    text: "Reduce confusion and focus on the work that matters.",
  },
  {
    title: "Leave a history worth remembering.",
    text: "Create a lasting impact through every job.",
  },
];

export function isPublicWebsitePath(pathname = "/") {
  const cleanPath = normalizePublicPath(pathname);
  return PUBLIC_ROUTES.has(cleanPath);
}

function normalizePublicPath(pathname = "/") {
  const cleanPath = String(pathname || "/").replace(/\/+$/, "") || "/";
  return cleanPath;
}

function PublicSite() {
  const path = normalizePublicPath(window.location.pathname);

  if (path === "/privacy") {
    return (
      <PublicDocumentPage
        title={PUBLIC_DOCUMENTS.privacy.title}
        content={PUBLIC_DOCUMENTS.privacy.content}
      />
    );
  }

  if (path === "/terms") {
    return (
      <PublicDocumentPage
        title={PUBLIC_DOCUMENTS.terms.title}
        content={PUBLIC_DOCUMENTS.terms.content}
      />
    );
  }

  if (path === "/contact") {
    return (
      <PublicDocumentPage
        title="Contact Us"
        text="Thank you for your interest in Meetro Community."
        detailText="For general inquiries, partnerships, or questions about Meetro Community, please contact us at:"
        closingText="We're here to help."
        showEmail
      />
    );
  }

  return <PublicLanding />;
}

function PublicLanding() {
  return (
    <main style={page}>
      <style>{publicResponsiveStyles}</style>
      <section className="public-hero-section" style={heroSection}>
        <div style={heroSky} aria-hidden="true" />
        <div style={heroNeighborhood} aria-hidden="true">
          <span style={heroHouseLeft} />
          <span style={heroHouseMiddle} />
          <span style={heroHouseRight} />
          <span style={heroStreet} />
          <span className="public-hero-lamp-post" style={heroLampPost} />
          <span className="public-hero-lamp-glow" style={heroLampGlow} />
        </div>

        <nav className="public-nav" style={nav} aria-label="Meetro Community public site">
          <a href="/" style={brandLink} aria-label="Meetro Community home">
            <span style={wordmark}>meetro</span>
            <span style={communityMark}>Community</span>
          </a>

          <div className="public-nav-links" style={navLinks}>
            {PUBLIC_NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} style={navLink}>
                {link.label}
              </a>
            ))}
            <a href="/contact" style={navAction}>
              Join the Journey
            </a>
          </div>
        </nav>

        <div className="public-hero-content" style={heroContent}>
          <p style={trustBadge}>
            <span style={badgeDot} aria-hidden="true" />
            Built around trust. Powered by relationships.
          </p>
          <h1 style={heroTitle}>
            Every trusted relationship begins with{" "}
            <span style={heroTitleAccent}>understanding.</span>
          </h1>
          <p style={heroText}>
            Welcome to Meetro Community - where understanding becomes trusted
            relationships through meaningful work.
          </p>
          <p style={heroSupportText}>
            People do not join Meetro Community because they need another app.
            They join because they need someone to understand what they are
            trying to accomplish.
          </p>
          <div className="public-hero-actions" style={heroActions}>
            <a href="/contact" style={primaryAction}>
              Join the Journey
            </a>
            <a href="#journey" style={secondaryAction}>
              Explore the Journey
            </a>
          </div>
        </div>
      </section>

      <section id="why" style={whySection}>
        <div style={sectionHeader}>
          <h2 style={sectionTitle}>Why Meetro Community exists</h2>
          <span style={sectionRule} aria-hidden="true" />
        </div>

        <div style={whyGrid}>
          <div style={whyStatement}>
            <h3 style={whyStatementTitle}>
              Before there is work,
              <br />
              there is understanding.
            </h3>
            <p style={whyStatementText}>
              Every meaningful project begins with a person. Families improve
              homes. Professionals master their craft. Neighbors build stronger
              communities. Meetro Community exists to help those relationships
              grow.
            </p>
          </div>

          <div style={audienceGrid}>
            {audienceCards.map((card) => (
              <article key={card.title} style={audienceCard}>
                <div style={iconCircle}>{card.icon}</div>
                <h3 style={cardTitle}>{card.title}</h3>
                <p style={cardText}>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="journey" style={journeySection}>
        <div style={sectionHeader}>
          <h2 style={sectionTitle}>The Journey We Build Together</h2>
          <span style={sectionRule} aria-hidden="true" />
        </div>

        <div style={journeyGrid}>
          {journeySteps.map((step) => (
            <article key={`${step.number}-${step.title}`} style={journeyStep}>
              <div style={journeyIcon}>{step.number}</div>
              <h3 style={journeyTitle}>{step.title}</h3>
              <p style={journeyText}>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="resources" style={guidanceSection}>
        <div style={lanternPanel} aria-hidden="true">
          <span style={lanternTop} />
          <span style={lanternBody} />
          <span style={lanternFlame} />
          <span style={lanternBase} />
        </div>

        <div style={guidanceHeadlineBlock}>
          <h2 style={guidanceTitle}>
            Guidance when you need it.
            <br />
            Quiet when you don't.
          </h2>
        </div>

        <div style={guidanceCopyBlock}>
          <p style={guidanceText}>
            Ask Meetro is your companion throughout Meetro Community - here to
            answer questions, offer guidance, and help you move forward with
            confidence.
          </p>
          <div style={supportPoints}>
            <span style={supportPoint}>Ask questions</span>
            <span style={supportPoint}>Find guidance</span>
            <span style={supportPoint}>Get support</span>
          </div>
          <p style={guidanceFooter}>
            Human-centered. Relationship-first. Purpose-driven.
          </p>
          <p style={guidanceSmall}>
            Guided by Ask Meetro. Powered by Meetro Intelligence.
          </p>
        </div>
      </section>

      <section style={professionalSection}>
        <div style={professionalIntro}>
          <h2 style={professionalTitle}>
            Meetro Community helps professionals become:
          </h2>
          <span style={sectionRule} aria-hidden="true" />
        </div>

        <div style={outcomeGrid}>
          {professionalOutcomes.map((outcome) => (
            <article key={outcome.title} style={outcomeCard}>
              <div style={smallIconCircle} aria-hidden="true" />
              <h3 style={outcomeTitle}>{outcome.title}</h3>
              <p style={outcomeText}>{outcome.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={promiseSection}>
        <p style={promiseText}>
          People may arrive looking for help. They stay because they found
          people they trust.
        </p>
      </section>

      <PublicFooter />
    </main>
  );
}

function PublicDocumentPage({
  title,
  text = "",
  content = "",
  detailText = "",
  closingText = "",
  showEmail = false,
}) {
  return (
    <main style={documentPage}>
      <style>{publicResponsiveStyles}</style>
      <nav className="public-nav" style={documentNav} aria-label="Meetro Community public site">
        <a href="/" style={brandLink}>
          <span style={wordmark}>meetro</span>
          <span style={communityMark}>Community</span>
        </a>
        <div className="public-nav-links" style={navLinks}>
          {PUBLIC_LINKS.map((link) => (
            <a key={link.label} href={link.href} style={navLink}>
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      <section style={documentCard}>
        <p style={trustBadge}>
          <span style={badgeDot} aria-hidden="true" />
          Built around trust. Powered by relationships.
        </p>
        <h1 style={documentTitle}>{title}</h1>
        {content ? (
          <PublicMarkdownDocument content={content} title={title} />
        ) : (
          <p style={documentText}>{text}</p>
        )}
        {detailText && <p style={documentText}>{detailText}</p>}
        {showEmail && (
          <p style={documentText}>
            <a href="mailto:william@flexlabs.com" style={inlineLink}>
              william@flexlabs.com
            </a>
          </p>
        )}
        <p style={companyLine}>
          Meetro Community is a product of WM FLEX LABS, LLC.
        </p>
        {closingText && <p style={documentText}>{closingText}</p>}
        <p style={companyLine}>
          Developed and published by WM FLEX LABS, LLC.
        </p>
        <a href="/" style={secondaryAction}>
          Back to Meetro Community
        </a>
      </section>

      <PublicFooter />
    </main>
  );
}

function PublicMarkdownDocument({ content, title }) {
  let skippedFirstTitle = false;

  return (
    <div style={documentContent}>
      {content.split("\n").map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={`space-${index}`} style={spacer} />;
        }

        if (trimmed.startsWith("# ")) {
          const headingText = trimmed.replace(/^# /, "");

          if (!skippedFirstTitle) {
            skippedFirstTitle = true;
            return null;
          }

          return (
            <h2 key={index} style={documentHeading}>
              {headingText}
            </h2>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={index} style={documentHeading}>
              {trimmed.replace(/^## /, "")}
            </h2>
          );
        }

        if (trimmed.startsWith("- ")) {
          return (
            <p key={index} style={documentListItem}>
              {"\u2022"} {trimmed.replace(/^- /, "")}
            </p>
          );
        }

        return (
          <p key={index} style={documentParagraph}>
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

function PublicFooter() {
  return (
    <footer style={footer}>
      <div style={footerBrandBlock}>
        <a href="/" style={footerBrandLink}>
          <span style={footerWordmark}>meetro</span>
          <span style={footerCommunityMark}>Community</span>
        </a>
        <p style={footerText}>A product of WM FLEX LABS, LLC.</p>
        <p style={footerText}>Developed and published by WM FLEX LABS, LLC.</p>
        <p style={footerText}>
          Contact:
          <br />
          <a href="mailto:william@flexlabs.com" style={footerLink}>
            william@flexlabs.com
          </a>
        </p>
        <p style={copyright}>
          {"\u00A9"} 2026 WM FLEX LABS, LLC. All rights reserved.
        </p>
      </div>

      <div style={footerColumn}>
        <strong style={footerColumnTitle}>Explore</strong>
        <a href="#why" style={footerLink}>Why Meetro Community</a>
        <a href="#journey" style={footerLink}>How It Works</a>
        <a href="#resources" style={footerLink}>Resources</a>
      </div>

      <div style={footerColumn}>
        <strong style={footerColumnTitle}>Legal</strong>
        {PUBLIC_LINKS.map((link) => (
          <a key={link.label} href={link.href} style={footerLink}>
            {link.label}
          </a>
        ))}
      </div>
    </footer>
  );
}

const fontStack =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

const serifStack =
  "Georgia, 'Times New Roman', Times, serif";

const publicResponsiveStyles = `
  @media (max-width: 480px) {
    .public-hero-section {
      align-content: start !important;
      min-height: 100svh !important;
      padding-bottom: calc(28px + env(safe-area-inset-bottom, 0px)) !important;
    }

    .public-nav {
      align-items: flex-start !important;
      gap: 12px !important;
    }

    .public-nav-links {
      gap: 0 !important;
      margin-left: auto !important;
    }

    .public-nav-links a:not(:last-child) {
      display: none !important;
    }

    .public-hero-content {
      margin-left: 0 !important;
      margin-right: auto !important;
      max-width: min(100%, 337px) !important;
      padding-top: clamp(14px, 3.2vh, 22px) !important;
    }

    .public-hero-actions {
      align-items: flex-start !important;
      justify-content: flex-start !important;
      flex-wrap: nowrap !important;
      gap: 8px !important;
      margin-top: 20px !important;
      max-width: 337px !important;
    }

    .public-hero-actions a {
      box-sizing: border-box !important;
      min-height: 48px !important;
      padding-left: 14px !important;
      padding-right: 14px !important;
    }

    .public-hero-lamp-post {
      right: 10px !important;
      top: 48% !important;
      height: 330px !important;
      opacity: 0.58 !important;
    }

    .public-hero-lamp-glow {
      right: -12px !important;
      top: calc(48% - 42px) !important;
      opacity: 0.72 !important;
    }
  }

  @media (max-width: 380px) {
    .public-hero-content {
      padding-top: 0 !important;
    }

    .public-hero-content > p:first-child {
      margin-bottom: 12px !important;
    }

    .public-hero-content > p:nth-of-type(2) {
      margin-top: 16px !important;
    }

    .public-hero-content > p:nth-of-type(3) {
      margin-top: 8px !important;
    }

    .public-hero-actions {
      margin-top: 12px !important;
    }
  }
`;

const page = {
  minHeight: "100vh",
  background: "var(--meetro-color-cream, #fbf6ed)",
  color: "var(--meetro-color-ink, #172317)",
  fontFamily: fontStack,
  overflowX: "hidden",
};

const heroSection = {
  position: "relative",
  minHeight: "min(760px, 100svh)",
  display: "grid",
  alignContent: "space-between",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 22px) clamp(18px, 5vw, 64px) clamp(46px, 7vw, 86px)",
  boxSizing: "border-box",
  overflow: "hidden",
  background:
    "linear-gradient(90deg, rgba(255,253,248,0.98) 0%, rgba(255,253,248,0.9) 38%, rgba(255,253,248,0.28) 62%, rgba(20,53,31,0.16) 100%), radial-gradient(circle at 70% 36%, rgba(183,121,31,0.22), transparent 34%), linear-gradient(135deg, #fff7e8 0%, #fbf6ed 44%, #dfe8d8 100%)",
};

const heroSky = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at 48% 42%, rgba(255,229,164,0.42), transparent 30%), radial-gradient(circle at 80% 22%, rgba(31,77,52,0.18), transparent 28%)",
  pointerEvents: "none",
};

const heroNeighborhood = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  overflow: "hidden",
};

const heroHouseLeft = {
  position: "absolute",
  right: "30%",
  bottom: "18%",
  width: "190px",
  height: "120px",
  borderRadius: "14px 14px 8px 8px",
  background:
    "linear-gradient(180deg, rgba(31,77,52,0.24), rgba(20,53,31,0.12))",
  boxShadow:
    "32px -34px 0 -12px rgba(20,53,31,0.18), inset 24px 28px 0 -20px rgba(247,186,93,0.5)",
};

const heroHouseMiddle = {
  position: "absolute",
  right: "16%",
  bottom: "23%",
  width: "240px",
  height: "150px",
  borderRadius: "18px 18px 10px 10px",
  background:
    "linear-gradient(180deg, rgba(31,77,52,0.28), rgba(20,53,31,0.16))",
  boxShadow:
    "44px -40px 0 -16px rgba(20,53,31,0.22), inset -38px 42px 0 -32px rgba(247,186,93,0.54)",
};

const heroHouseRight = {
  position: "absolute",
  right: "-4%",
  bottom: "14%",
  width: "300px",
  height: "210px",
  borderRadius: "22px 22px 12px 12px",
  background:
    "linear-gradient(180deg, rgba(20,53,31,0.32), rgba(20,53,31,0.2))",
  boxShadow:
    "-44px -38px 0 -18px rgba(20,53,31,0.18), inset -46px 48px 0 -34px rgba(247,186,93,0.56)",
};

const heroStreet = {
  position: "absolute",
  right: "8%",
  bottom: "-18%",
  width: "46%",
  height: "38%",
  borderRadius: "60% 0 0 0",
  background:
    "linear-gradient(135deg, rgba(255,253,248,0.34), rgba(183,121,31,0.14) 48%, rgba(31,77,52,0.14))",
  transform: "skewX(-12deg)",
};

const heroLampPost = {
  position: "absolute",
  right: "7%",
  top: "17%",
  width: "12px",
  height: "360px",
  borderRadius: "999px",
  background: "linear-gradient(180deg, #0f1c1a, #14351f)",
  boxShadow: "0 0 0 1px rgba(255,253,248,0.16)",
};

const heroLampGlow = {
  position: "absolute",
  right: "4.8%",
  top: "13%",
  width: "70px",
  height: "98px",
  borderRadius: "26px",
  background:
    "radial-gradient(circle at 50% 52%, rgba(255,229,164,0.95), rgba(247,186,93,0.45) 34%, rgba(31,77,52,0.2) 62%, rgba(15,28,26,0.86) 100%)",
  boxShadow: "0 0 72px rgba(247,186,93,0.52)",
};

const nav = {
  position: "relative",
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
  width: "100%",
  maxWidth: "1180px",
  margin: "0 auto",
  flexWrap: "wrap",
};

const documentNav = {
  ...nav,
  padding:
    "calc(env(safe-area-inset-top, 0px) + 22px) clamp(18px, 5vw, 64px) 0",
  boxSizing: "border-box",
};

const brandLink = {
  display: "inline-grid",
  textDecoration: "none",
  color: "var(--meetro-color-forest-deep, #14351f)",
  lineHeight: 0.96,
};

const wordmark = {
  fontSize: "clamp(38px, 7vw, 64px)",
  fontWeight: 950,
  letterSpacing: 0,
};

const communityMark = {
  marginTop: "8px",
  color: "var(--meetro-color-wood, #b7791f)",
  fontSize: "clamp(15px, 2.8vw, 24px)",
  fontWeight: 950,
  letterSpacing: "0.32em",
  textTransform: "uppercase",
};

const navLinks = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: "10px 20px",
};

const navLink = {
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "14px",
  fontWeight: 850,
  textDecoration: "none",
};

const navAction = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "44px",
  padding: "0 18px",
  borderRadius: "999px",
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "var(--meetro-color-paper, #fffdf8)",
  fontSize: "14px",
  fontWeight: 950,
  textDecoration: "none",
  boxShadow: "0 14px 30px rgba(20,53,31,0.2)",
};

const heroContent = {
  position: "relative",
  zIndex: 2,
  width: "min(100%, 650px)",
  maxWidth: "1180px",
  margin: "0 auto",
  paddingTop: "clamp(76px, 13vh, 126px)",
};

const trustBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  margin: "0 0 20px",
  padding: "9px 14px",
  border: "1px solid rgba(74,52,40,0.18)",
  borderRadius: "999px",
  background: "rgba(255,253,248,0.72)",
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "14px",
  fontWeight: 850,
  backdropFilter: "blur(14px)",
};

const badgeDot = {
  width: "8px",
  height: "8px",
  borderRadius: "999px",
  background: "var(--meetro-color-forest, #1f4d34)",
};

const heroTitle = {
  margin: 0,
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: serifStack,
  fontSize: "clamp(48px, 8vw, 82px)",
  lineHeight: 0.98,
  fontWeight: 800,
};

const heroTitleAccent = {
  color: "var(--meetro-color-wood, #b7791f)",
};

const heroText = {
  margin: "24px 0 0",
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "clamp(17px, 2.2vw, 21px)",
  lineHeight: 1.55,
  fontWeight: 650,
  maxWidth: "560px",
};

const heroSupportText = {
  margin: "14px 0 0",
  color: "rgba(23,35,23,0.78)",
  fontSize: "clamp(15px, 1.8vw, 18px)",
  lineHeight: 1.58,
  fontWeight: 620,
  maxWidth: "590px",
};

const heroActions = {
  display: "flex",
  flexWrap: "wrap",
  gap: "14px",
  marginTop: "30px",
};

const primaryAction = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "50px",
  padding: "0 22px",
  borderRadius: "12px",
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "var(--meetro-color-paper, #fffdf8)",
  fontSize: "15px",
  fontWeight: 950,
  textDecoration: "none",
  boxShadow: "0 16px 34px rgba(20,53,31,0.22)",
};

const secondaryAction = {
  ...primaryAction,
  background: "rgba(255,253,248,0.72)",
  color: "var(--meetro-color-forest-deep, #14351f)",
  border: "1px solid rgba(20,53,31,0.34)",
  boxShadow: "none",
};

const sectionBase = {
  width: "min(100% - 36px, 1120px)",
  margin: "0 auto",
};

const whySection = {
  ...sectionBase,
  padding: "clamp(42px, 7vw, 76px) 0 28px",
};

const sectionHeader = {
  textAlign: "center",
  marginBottom: "30px",
};

const sectionTitle = {
  margin: 0,
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: serifStack,
  fontSize: "clamp(30px, 5vw, 42px)",
  lineHeight: 1.08,
  fontWeight: 800,
};

const sectionRule = {
  display: "inline-block",
  width: "46px",
  height: "2px",
  marginTop: "14px",
  background: "var(--meetro-color-wood, #b7791f)",
};

const whyGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
  gap: "clamp(24px, 5vw, 52px)",
  alignItems: "center",
};

const whyStatement = {
  borderRight: "1px solid rgba(74,52,40,0.14)",
  paddingRight: "clamp(18px, 4vw, 42px)",
};

const whyStatementTitle = {
  margin: 0,
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: serifStack,
  fontSize: "clamp(25px, 4vw, 35px)",
  lineHeight: 1.12,
  fontWeight: 800,
};

const whyStatementText = {
  margin: "22px 0 0",
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "17px",
  lineHeight: 1.65,
  fontWeight: 620,
};

const audienceGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "18px",
};

const audienceCard = {
  textAlign: "center",
  padding: "8px 16px 16px",
  borderLeft: "1px solid rgba(74,52,40,0.12)",
};

const iconCircle = {
  width: "74px",
  height: "74px",
  margin: "0 auto 12px",
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  background: "rgba(238,244,234,0.86)",
  color: "var(--meetro-color-forest-deep, #14351f)",
  border: "1px solid rgba(74,52,40,0.12)",
  fontSize: "13px",
  fontWeight: 950,
};

const cardTitle = {
  margin: "0 0 8px",
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: serifStack,
  fontSize: "21px",
  lineHeight: 1.15,
};

const cardText = {
  margin: 0,
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "15px",
  lineHeight: 1.5,
  fontWeight: 600,
};

const journeySection = {
  ...sectionBase,
  padding: "28px 0",
  borderTop: "1px solid rgba(74,52,40,0.12)",
};

const journeyGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
  gap: "18px",
};

const journeyStep = {
  textAlign: "center",
};

const journeyIcon = {
  width: "68px",
  height: "68px",
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  margin: "0 auto 8px",
  background: "rgba(238,244,234,0.86)",
  border: "1px solid rgba(74,52,40,0.12)",
  color: "var(--meetro-color-wood, #b7791f)",
  fontFamily: serifStack,
  fontSize: "24px",
  fontWeight: 800,
};

const journeyTitle = {
  margin: "0 0 4px",
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontSize: "15px",
  lineHeight: 1.2,
  fontWeight: 900,
};

const journeyText = {
  margin: 0,
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: 600,
};

const guidanceSection = {
  ...sectionBase,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
  gap: "clamp(20px, 4vw, 42px)",
  alignItems: "center",
  marginTop: "28px",
  padding: "28px clamp(20px, 4vw, 40px)",
  borderRadius: "18px",
  background:
    "radial-gradient(circle at 18% 48%, rgba(247,186,93,0.32), transparent 25%), linear-gradient(135deg, #0f1c1a, #14351f 58%, #1f4d34)",
  color: "var(--meetro-color-paper, #fffdf8)",
  boxShadow: "0 22px 62px rgba(20,53,31,0.18)",
};

const lanternPanel = {
  position: "relative",
  minHeight: "190px",
  borderRadius: "16px",
  background:
    "radial-gradient(circle at 50% 58%, rgba(247,186,93,0.46), transparent 32%), rgba(255,253,248,0.06)",
  overflow: "hidden",
};

const lanternTop = {
  position: "absolute",
  left: "50%",
  top: "32px",
  width: "64px",
  height: "20px",
  transform: "translateX(-50%)",
  borderRadius: "999px 999px 4px 4px",
  background: "#0f1c1a",
};

const lanternBody = {
  position: "absolute",
  left: "50%",
  top: "54px",
  width: "86px",
  height: "94px",
  transform: "translateX(-50%)",
  border: "3px solid #0f1c1a",
  borderRadius: "18px",
  background: "rgba(255,229,164,0.13)",
  boxShadow: "0 0 50px rgba(247,186,93,0.42)",
};

const lanternFlame = {
  position: "absolute",
  left: "50%",
  top: "88px",
  width: "26px",
  height: "42px",
  transform: "translateX(-50%)",
  borderRadius: "60% 60% 55% 55%",
  background:
    "radial-gradient(circle at 50% 70%, #fffdf8, #f7ba5d 44%, #b7791f 100%)",
  boxShadow: "0 0 38px rgba(247,186,93,0.78)",
};

const lanternBase = {
  position: "absolute",
  left: "50%",
  top: "148px",
  width: "74px",
  height: "14px",
  transform: "translateX(-50%)",
  borderRadius: "4px 4px 999px 999px",
  background: "#0f1c1a",
};

const guidanceHeadlineBlock = {
  borderRight: "1px solid rgba(255,253,248,0.28)",
  paddingRight: "clamp(14px, 3vw, 32px)",
};

const guidanceCopyBlock = {
  minWidth: 0,
};

const guidanceTitle = {
  margin: 0,
  color: "var(--meetro-color-paper, #fffdf8)",
  fontFamily: serifStack,
  fontSize: "clamp(28px, 4vw, 42px)",
  lineHeight: 1.14,
  fontWeight: 800,
};

const guidanceText = {
  margin: 0,
  color: "rgba(255,253,248,0.94)",
  fontSize: "17px",
  lineHeight: 1.58,
  fontWeight: 650,
};

const supportPoints = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px 16px",
  marginTop: "22px",
};

const supportPoint = {
  color: "rgba(255,253,248,0.92)",
  fontSize: "14px",
  fontWeight: 850,
};

const guidanceFooter = {
  margin: "24px 0 0",
  color: "#f7ba5d",
  fontSize: "16px",
  fontWeight: 900,
  letterSpacing: "0.04em",
};

const guidanceSmall = {
  margin: "8px 0 0",
  color: "rgba(255,253,248,0.76)",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: 700,
};

const professionalSection = {
  ...sectionBase,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: "22px",
  alignItems: "stretch",
  marginTop: "22px",
  padding: "24px clamp(18px, 4vw, 32px)",
  borderRadius: "18px",
  background: "rgba(255,253,248,0.82)",
  border: "1px solid rgba(74,52,40,0.08)",
  boxShadow: "0 18px 48px rgba(49,35,20,0.08)",
};

const professionalIntro = {
  alignSelf: "center",
};

const professionalTitle = {
  margin: 0,
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: serifStack,
  fontSize: "clamp(26px, 4vw, 34px)",
  lineHeight: 1.12,
  fontWeight: 800,
};

const outcomeGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "14px",
};

const outcomeCard = {
  textAlign: "center",
  padding: "8px 10px",
  borderLeft: "1px solid rgba(74,52,40,0.10)",
};

const smallIconCircle = {
  width: "42px",
  height: "42px",
  margin: "0 auto 10px",
  borderRadius: "999px",
  background: "rgba(238,244,234,0.9)",
  border: "1px solid rgba(31,77,52,0.16)",
};

const outcomeTitle = {
  margin: "0 0 6px",
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontSize: "14px",
  lineHeight: 1.25,
  fontWeight: 950,
};

const outcomeText = {
  margin: 0,
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "12px",
  lineHeight: 1.4,
  fontWeight: 620,
};

const promiseSection = {
  ...sectionBase,
  padding: "34px 0 42px",
  textAlign: "center",
};

const promiseText = {
  margin: "0 auto",
  maxWidth: "760px",
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: serifStack,
  fontSize: "clamp(25px, 4vw, 38px)",
  lineHeight: 1.18,
  fontWeight: 800,
};

const documentPage = {
  minHeight: "100vh",
  background: "var(--meetro-color-cream, #fbf6ed)",
  color: "var(--meetro-color-ink, #172317)",
  fontFamily: fontStack,
  display: "grid",
  gridTemplateRows: "auto 1fr auto",
};

const documentCard = {
  width: "min(100% - 36px, 760px)",
  margin: "clamp(64px, 14vh, 120px) auto",
  border: "1px solid rgba(74,52,40,0.12)",
  borderRadius: "24px",
  padding: "clamp(24px, 5vw, 42px)",
  boxSizing: "border-box",
  background: "rgba(255,253,248,0.88)",
  boxShadow: "0 20px 56px rgba(49,35,20,0.08)",
};

const documentTitle = {
  margin: 0,
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: serifStack,
  fontSize: "clamp(36px, 8vw, 68px)",
  lineHeight: 1,
  fontWeight: 800,
};

const documentText = {
  margin: "18px 0 0",
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "18px",
  lineHeight: 1.58,
  fontWeight: 650,
};

const documentContent = {
  marginTop: "22px",
};

const spacer = {
  height: "10px",
};

const documentHeading = {
  margin: "24px 0 10px",
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontFamily: serifStack,
  fontSize: "clamp(22px, 4vw, 30px)",
  lineHeight: 1.18,
  fontWeight: 800,
};

const documentParagraph = {
  margin: "0 0 12px",
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "16px",
  lineHeight: 1.62,
  fontWeight: 600,
};

const documentListItem = {
  ...documentParagraph,
  paddingLeft: "10px",
};

const companyLine = {
  margin: "18px 0 0",
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: "15px",
  lineHeight: 1.5,
  fontWeight: 850,
};

const inlineLink = {
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: 850,
  textDecoration: "none",
};

const footer = {
  borderTop: "1px solid rgba(255,253,248,0.16)",
  background:
    "linear-gradient(135deg, var(--meetro-color-forest-deep, #14351f), var(--meetro-color-forest, #1f4d34))",
  width: "100%",
  padding:
    "30px clamp(18px, 5vw, 64px) calc(34px + env(safe-area-inset-bottom, 0px))",
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
  gap: "24px",
};

const footerBrandBlock = {
  maxWidth: "360px",
};

const footerBrandLink = {
  display: "inline-grid",
  color: "var(--meetro-color-paper, #fffdf8)",
  textDecoration: "none",
  lineHeight: 0.96,
};

const footerWordmark = {
  fontSize: "34px",
  fontWeight: 950,
};

const footerCommunityMark = {
  marginTop: "6px",
  color: "#f7ba5d",
  fontSize: "12px",
  fontWeight: 950,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
};

const footerText = {
  margin: "7px 0",
  color: "rgba(255,253,248,0.82)",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: 700,
};

const footerColumn = {
  display: "grid",
  alignContent: "start",
  gap: "8px",
};

const footerColumnTitle = {
  color: "#f7ba5d",
  fontSize: "14px",
  fontWeight: 950,
};

const footerLink = {
  color: "rgba(255,253,248,0.88)",
  fontSize: "14px",
  fontWeight: 800,
  textDecoration: "none",
};

const copyright = {
  margin: "14px 0 0",
  color: "rgba(255,253,248,0.66)",
  fontSize: "12px",
  fontWeight: 700,
};

export default PublicSite;
