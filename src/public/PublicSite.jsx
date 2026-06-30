const PUBLIC_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Contact", href: "/contact" },
];

const PUBLIC_ROUTES = new Set(["/", "/privacy", "/terms", "/contact"]);

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
        title="Privacy Policy"
        text="Meetro Community is preparing for launch. Public privacy information will be maintained by WM FLEX LABS, LLC."
      />
    );
  }

  if (path === "/terms") {
    return (
      <PublicDocumentPage
        title="Terms of Service"
        text="Meetro Community is preparing for launch. Public terms of service will be maintained by WM FLEX LABS, LLC."
      />
    );
  }

  if (path === "/contact") {
    return (
      <PublicDocumentPage
        title="Contact"
        text="For Meetro Community questions, contact WM FLEX LABS, LLC."
        showEmail
      />
    );
  }

  return <PublicLanding />;
}

function PublicLanding() {
  return (
    <main style={page}>
      <section style={heroSection}>
        <div style={heroBackdrop} aria-hidden="true" />
        <nav style={nav} aria-label="Meetro public site">
          <a href="/" style={brandLink}>
            Meetro
          </a>
          <div style={navLinks}>
            {PUBLIC_LINKS.map((link) => (
              <a key={link.label} href={link.href} style={navLink}>
                {link.label}
              </a>
            ))}
          </div>
        </nav>

        <div style={heroContent}>
          <p style={statusPill}>Preparing for launch</p>
          <h1 style={heroTitle}>Meetro</h1>
          <p style={communityLabel}>Community</p>
          <p style={heroLine}>Connect. Communicate. Complete.</p>
          <p style={heroText}>Meetro is preparing for launch.</p>
          <p style={companyLine}>
            Meetro Community is a product of WM FLEX LABS, LLC.
          </p>
          <p style={companyLine}>
            Developed and published by WM FLEX LABS, LLC.
          </p>
          <div style={heroActions}>
            <a href="/contact" style={primaryAction}>
              Contact
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}

function PublicDocumentPage({ title, text, showEmail = false }) {
  return (
    <main style={documentPage}>
      <nav style={documentNav} aria-label="Meetro public site">
        <a href="/" style={brandLink}>
          Meetro
        </a>
        <div style={navLinks}>
          {PUBLIC_LINKS.map((link) => (
            <a key={link.label} href={link.href} style={navLink}>
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      <section style={documentCard}>
        <p style={statusPill}>Preparing for launch</p>
        <h1 style={documentTitle}>{title}</h1>
        <p style={documentText}>{text}</p>
        {showEmail && (
          <p style={documentText}>
            Email:{" "}
            <a href="mailto:william@flexlabs.com" style={inlineLink}>
              william@flexlabs.com
            </a>
          </p>
        )}
        <p style={companyLine}>
          Meetro Community is a product of WM FLEX LABS, LLC.
        </p>
        <p style={companyLine}>
          Developed and published by WM FLEX LABS, LLC.
        </p>
        <a href="/" style={secondaryAction}>
          Back to Meetro
        </a>
      </section>

      <PublicFooter />
    </main>
  );
}

function PublicFooter() {
  return (
    <footer style={footer}>
      <div>
        <strong style={footerBrand}>Meetro Community</strong>
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

      <div style={footerLinks}>
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

const page = {
  minHeight: "100vh",
  background: "#f7f8fc",
  color: "#111827",
  fontFamily: fontStack,
  overflowX: "hidden",
};

const heroSection = {
  position: "relative",
  minHeight: "min(680px, 100svh)",
  display: "grid",
  alignContent: "space-between",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 18px) clamp(18px, 5vw, 64px) clamp(34px, 7vw, 80px)",
  boxSizing: "border-box",
  overflow: "hidden",
  background:
    "linear-gradient(135deg, rgba(248,250,252,0.96) 0%, rgba(238,242,255,0.94) 55%, rgba(255,255,255,0.98) 100%)",
};

const heroBackdrop = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at 72% 26%, rgba(91,61,245,0.16), transparent 34%), radial-gradient(circle at 20% 80%, rgba(20,184,166,0.12), transparent 30%)",
  pointerEvents: "none",
};

const nav = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  width: "100%",
  maxWidth: "1120px",
  margin: "0 auto",
};

const documentNav = {
  ...nav,
  padding:
    "calc(env(safe-area-inset-top, 0px) + 18px) clamp(18px, 5vw, 64px) 0",
  boxSizing: "border-box",
};

const brandLink = {
  color: "#111827",
  fontSize: "18px",
  fontWeight: 950,
  textDecoration: "none",
};

const navLinks = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: "8px 14px",
};

const navLink = {
  color: "#475569",
  fontSize: "14px",
  fontWeight: 800,
  textDecoration: "none",
};

const heroContent = {
  position: "relative",
  zIndex: 1,
  width: "min(100%, 720px)",
  maxWidth: "1120px",
  margin: "0 auto",
  paddingTop: "clamp(82px, 16vh, 150px)",
};

const statusPill = {
  display: "inline-flex",
  margin: "0 0 16px",
  padding: "8px 12px",
  border: "1px solid rgba(91,61,245,0.16)",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.72)",
  color: "#4b32d1",
  fontSize: "13px",
  fontWeight: 900,
  backdropFilter: "blur(14px)",
};

const heroTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "clamp(54px, 14vw, 112px)",
  lineHeight: 0.95,
  fontWeight: 950,
};

const communityLabel = {
  margin: "10px 0 0",
  color: "#475569",
  fontSize: "clamp(19px, 4vw, 28px)",
  lineHeight: 1.12,
  fontWeight: 900,
};

const heroLine = {
  margin: "16px 0 0",
  color: "#312e81",
  fontSize: "clamp(23px, 5.4vw, 42px)",
  lineHeight: 1.08,
  fontWeight: 950,
};

const heroText = {
  margin: "18px 0 0",
  color: "#334155",
  fontSize: "clamp(17px, 2.4vw, 22px)",
  lineHeight: 1.55,
  fontWeight: 650,
  maxWidth: "650px",
};

const companyLine = {
  margin: "18px 0 0",
  color: "#475569",
  fontSize: "15px",
  lineHeight: 1.5,
  fontWeight: 850,
};

const heroActions = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  marginTop: "28px",
};

const primaryAction = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "46px",
  padding: "0 18px",
  borderRadius: "999px",
  background: "#5b3df5",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 950,
  textDecoration: "none",
  boxShadow: "0 16px 34px rgba(91,61,245,0.24)",
};

const secondaryAction = {
  ...primaryAction,
  marginTop: "24px",
  background: "rgba(255,255,255,0.78)",
  color: "#4b32d1",
  border: "1px solid rgba(91,61,245,0.18)",
  boxShadow: "none",
};

const documentPage = {
  minHeight: "100vh",
  background: "#f7f8fc",
  color: "#111827",
  fontFamily: fontStack,
  display: "grid",
  gridTemplateRows: "auto 1fr auto",
};

const documentCard = {
  width: "min(100% - 36px, 760px)",
  margin: "clamp(64px, 14vh, 120px) auto",
  border: "1px solid rgba(15,23,42,0.08)",
  borderRadius: "24px",
  padding: "clamp(24px, 5vw, 42px)",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.86)",
  boxShadow: "0 20px 56px rgba(15,23,42,0.08)",
};

const documentTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "clamp(36px, 8vw, 68px)",
  lineHeight: 1,
  fontWeight: 950,
};

const documentText = {
  margin: "18px 0 0",
  color: "#475569",
  fontSize: "18px",
  lineHeight: 1.58,
  fontWeight: 650,
};

const inlineLink = {
  color: "#4b32d1",
  fontWeight: 850,
  textDecoration: "none",
};

const footer = {
  borderTop: "1px solid rgba(15,23,42,0.08)",
  background: "#ffffff",
  width: "100%",
  padding:
    "28px clamp(18px, 5vw, 64px) calc(30px + env(safe-area-inset-bottom, 0px))",
  boxSizing: "border-box",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "22px",
  flexWrap: "wrap",
};

const footerBrand = {
  display: "block",
  color: "#111827",
  fontSize: "18px",
  fontWeight: 950,
  marginBottom: "8px",
};

const footerText = {
  margin: "5px 0",
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: 700,
};

const footerLinks = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px 16px",
};

const footerLink = {
  color: "#4b32d1",
  fontSize: "14px",
  fontWeight: 850,
  textDecoration: "none",
};

const copyright = {
  margin: "12px 0 0",
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 700,
};

export default PublicSite;
