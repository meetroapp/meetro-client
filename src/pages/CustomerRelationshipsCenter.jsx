import { useCallback, useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import { getLanguage } from "../utils/language";
import { getCustomerRelationshipsCopy } from "../utils/customerRelationshipsLanguage.js";
import {
  clearCustomerRelationshipNavigationContext,
  loadCustomerRelationshipDetail,
  loadCustomerRelationshipDirectory,
  loadCustomerRelationshipForContact,
  readCustomerRelationshipNavigationContext,
  writeCustomerRelationshipContactReturn,
} from "../utils/customerRelationshipsWorkspace.js";

const DATE_LOCALES = Object.freeze({
  en: "en-US",
  es: "es-US",
  fr: "fr-FR",
  "pt-BR": "pt-BR",
});

function text(value) {
  return String(value ?? "").trim();
}

function contactName(contact = {}, fallback = "") {
  return text(contact.displayName) || text(contact.companyName) || fallback;
}

function formatEstablishedDate(value, language) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(DATE_LOCALES[language] || DATE_LOCALES.en, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function CustomerRelationshipsCenter({ setPage }) {
  const language = getLanguage();
  const copy = getCustomerRelationshipsCopy(language);
  const [navigationContext] = useState(() =>
    readCustomerRelationshipNavigationContext(
      typeof window === "undefined" ? null : window.localStorage
    )
  );
  const [workspaceState, setWorkspaceState] = useState({
    status: "loading",
    relationships: [],
    detail: null,
    error: "",
  });

  const loadInitialWorkspace = useCallback(async () => {
    setWorkspaceState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const [relationships, detail] = await Promise.all([
        loadCustomerRelationshipDirectory({ setPage }),
        navigationContext?.businessContactId
          ? loadCustomerRelationshipForContact({
              businessContactId: navigationContext.businessContactId,
              setPage,
            })
          : Promise.resolve(null),
      ]);
      setWorkspaceState({
        status: "ready",
        relationships,
        detail,
        error: "",
      });
    } catch (error) {
      setWorkspaceState({
        status: "error",
        relationships: [],
        detail: null,
        error: error?.message || copy.loadErrorText,
      });
    }
  }, [copy.loadErrorText, navigationContext, setPage]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      clearCustomerRelationshipNavigationContext(window.localStorage);
    }
    void loadInitialWorkspace();
  }, [loadInitialWorkspace]);

  async function openRelationship(relationshipId) {
    setWorkspaceState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const detail = await loadCustomerRelationshipDetail({
        relationshipId,
        setPage,
      });
      setWorkspaceState((current) => ({
        ...current,
        status: "ready",
        detail,
        error: "",
      }));
    } catch (error) {
      setWorkspaceState((current) => ({
        ...current,
        status: "error",
        error: error?.message || copy.loadErrorText,
      }));
    }
  }

  function returnFromPage() {
    setPage(navigationContext?.returnPage || "businessCommandCenter");
  }

  function openContact(contact) {
    if (typeof window !== "undefined") {
      writeCustomerRelationshipContactReturn(window.localStorage, contact);
    }
    setPage("messagesInbox");
  }

  function showDirectory() {
    setWorkspaceState((current) => ({ ...current, detail: null }));
  }

  const detail = workspaceState.detail;
  const relationship = detail?.relationship || null;
  const contact = detail?.contact || null;

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      <BusinessToolsPageHeader
        title={copy.title}
        description={copy.description}
        categoryLabel={copy.category}
        onBack={returnFromPage}
      />

      <main style={workspace} aria-labelledby="customer-relationships-title">
        <h2 id="customer-relationships-title" style={visuallyHidden}>
          {copy.title}
        </h2>

        {workspaceState.status === "loading" && (
          <section style={stateCard} role="status" aria-live="polite">
            <span style={loadingDot} aria-hidden="true" />
            <p style={stateText}>{copy.loading}</p>
          </section>
        )}

        {workspaceState.status === "error" && (
          <section style={stateCard} role="alert">
            <h3 style={stateTitle}>{copy.loadErrorTitle}</h3>
            <p style={stateText}>{workspaceState.error || copy.loadErrorText}</p>
            <button type="button" style={primaryButton} onClick={loadInitialWorkspace}>
              {copy.retry}
            </button>
          </section>
        )}

        {workspaceState.status === "ready" && detail && !relationship && (
          <section style={detailCard} aria-labelledby="no-customer-relationship-title">
            <div style={detailHeader}>
              <div style={contactAvatar} aria-hidden="true">
                {contactName(contact, "C").slice(0, 1).toUpperCase()}
              </div>
              <div style={minWidthZero}>
                <p style={eyebrow}>{copy.contactName}</p>
                <h3 id="no-customer-relationship-title" style={detailTitle}>
                  {contactName(contact, copy.contactName)}
                </h3>
                {text(contact?.companyName) && (
                  <p style={mutedText}>{contact.companyName}</p>
                )}
              </div>
            </div>
            <div style={noticeCard}>
              <strong>{copy.noRelationshipTitle}</strong>
              <p style={noticeText}>{copy.noRelationshipText}</p>
              <p style={noticeText}>{copy.noRelationshipHelp}</p>
            </div>
            <p style={externalNote}>{copy.externalContact}</p>
            <div style={actionRow}>
              <button type="button" style={primaryButton} onClick={() => openContact(contact)}>
                {copy.viewContact}
              </button>
              <button type="button" style={secondaryButton} onClick={showDirectory}>
                {copy.backToRelationships}
              </button>
            </div>
          </section>
        )}

        {workspaceState.status === "ready" && relationship && contact && (
          <section style={detailCard} aria-labelledby="customer-relationship-detail-title">
            <div style={detailHeader}>
              <div style={contactAvatar} aria-hidden="true">
                {contactName(contact, "C").slice(0, 1).toUpperCase()}
              </div>
              <div style={minWidthZero}>
                <p style={eyebrow}>{copy.relationshipEstablished}</p>
                <h3 id="customer-relationship-detail-title" style={detailTitle}>
                  {contactName(contact, copy.contactName)}
                </h3>
                {text(contact.companyName) && (
                  <p style={mutedText}>{contact.companyName}</p>
                )}
              </div>
              <span style={contact.status === "ARCHIVED" ? archivedBadge : activeBadge}>
                {contact.status === "ARCHIVED" ? copy.archived : copy.active}
              </span>
            </div>

            <div style={relationshipFact}>
              <span>{copy.established}</span>
              <strong>
                {formatEstablishedDate(relationship.createdAt, language) || copy.relationshipEstablished}
              </strong>
            </div>

            <h4 style={sectionTitle}>{copy.currentContact}</h4>
            <dl style={contactGrid}>
              <ContactFact label={copy.contactName} value={contactName(contact, copy.notAdded)} />
              <ContactFact
                label={copy.partyType}
                value={contact.partyType === "ORGANIZATION" ? copy.organization : copy.person}
              />
              <ContactFact label={copy.email} value={text(contact.email) || copy.notAdded} />
              <ContactFact label={copy.phone} value={text(contact.phone) || copy.notAdded} />
              <ContactFact label={copy.address} value={text(contact.address) || copy.notAdded} />
              <ContactFact label={copy.serviceArea} value={text(contact.serviceArea) || copy.notAdded} />
            </dl>

            <p style={externalNote}>{copy.externalContact}</p>
            <div style={actionRow}>
              <button type="button" style={primaryButton} onClick={() => openContact(contact)}>
                {copy.viewContact}
              </button>
              <button type="button" style={secondaryButton} onClick={showDirectory}>
                {copy.backToRelationships}
              </button>
            </div>
          </section>
        )}

        {workspaceState.status === "ready" && !detail && (
          <section aria-labelledby="customer-relationship-list-title">
            {workspaceState.relationships.length === 0 ? (
              <div style={stateCard} role="status">
                <h3 style={stateTitle}>{copy.emptyTitle}</h3>
                <p style={stateText}>{copy.emptyText}</p>
              </div>
            ) : (
              <>
                <div style={sectionHeading}>
                  <h3 id="customer-relationship-list-title" style={sectionTitle}>
                    {copy.relationshipList}
                  </h3>
                  <span style={countBadge}>{workspaceState.relationships.length}</span>
                </div>
                <div style={relationshipList}>
                  {workspaceState.relationships.map((item) => {
                    const itemContact = item.contact || {};
                    const archived = itemContact.status === "ARCHIVED";
                    const establishedDate = formatEstablishedDate(item.createdAt, language);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        style={relationshipRow}
                        onClick={() => void openRelationship(item.id)}
                        aria-label={`${copy.openRelationship}: ${contactName(itemContact, copy.contactName)}`}
                      >
                        <span style={contactAvatar} aria-hidden="true">
                          {contactName(itemContact, "C").slice(0, 1).toUpperCase()}
                        </span>
                        <span style={relationshipRowBody}>
                          <strong style={relationshipName}>
                            {contactName(itemContact, copy.contactName)}
                          </strong>
                          {text(itemContact.companyName) && (
                            <span style={relationshipMeta}>{itemContact.companyName}</span>
                          )}
                          <span style={relationshipMeta}>
                            {itemContact.partyType === "ORGANIZATION" ? copy.organization : copy.person}
                            {establishedDate ? ` · ${copy.established} ${establishedDate}` : ""}
                          </span>
                        </span>
                        <span style={archived ? archivedBadge : activeBadge}>
                          {archived ? copy.archived : copy.active}
                        </span>
                        <span style={rowChevron} aria-hidden="true">›</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}

        {workspaceState.status === "ready" && (
          <p style={readOnlyNote}>{copy.readOnly}</p>
        )}
      </main>

      <BottomNav setPage={setPage} currentPage="customerRelationshipsCenter" />
    </div>
  );
}

function ContactFact({ label, value }) {
  return (
    <div style={contactFact}>
      <dt style={factLabel}>{label}</dt>
      <dd style={factValue}>{value}</dd>
    </div>
  );
}

const page = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: "100dvh",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 50px) max(18px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 96px) max(18px, env(safe-area-inset-left, 0px))",
  overflowY: "auto",
  overflowX: "hidden",
  WebkitOverflowScrolling: "touch",
  boxSizing: "border-box",
  background: "#f8faf7",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
};

const workspace = { width: "100%", maxWidth: "980px", minWidth: 0, margin: "24px auto 0" };
const stateCard = { width: "100%", minWidth: 0, padding: "clamp(24px, 5vw, 38px)", borderRadius: "18px", border: "1px solid #d9e2d6", background: "#fffdf8", boxShadow: "0 14px 34px rgba(31, 77, 52, 0.08)", boxSizing: "border-box", textAlign: "center" };
const stateTitle = { margin: 0, color: "var(--meetro-color-forest-deep, #14351f)", fontSize: "clamp(21px, 4vw, 28px)", lineHeight: 1.25 };
const stateText = { maxWidth: "620px", margin: "12px auto 0", color: "#5f6f62", fontSize: "15px", lineHeight: 1.55 };
const loadingDot = { display: "inline-block", width: "14px", height: "14px", borderRadius: "50%", background: "var(--meetro-color-forest, #1f4d34)", boxShadow: "0 0 0 7px rgba(31, 77, 52, 0.12)" };
const detailCard = { width: "100%", minWidth: 0, padding: "clamp(20px, 4vw, 34px)", borderRadius: "20px", border: "1px solid #d9e2d6", background: "#fffdf8", boxShadow: "0 14px 34px rgba(31, 77, 52, 0.08)", boxSizing: "border-box" };
const detailHeader = { display: "flex", alignItems: "center", gap: "14px", minWidth: 0, flexWrap: "wrap" };
const contactAvatar = { display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 48px", width: "48px", height: "48px", borderRadius: "16px", background: "#e8f1e8", color: "#155c38", fontSize: "19px", fontWeight: 900 };
const minWidthZero = { minWidth: 0, flex: "1 1 220px" };
const eyebrow = { margin: 0, color: "#287048", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" };
const detailTitle = { margin: "4px 0 0", color: "#14251a", fontSize: "clamp(22px, 4vw, 30px)", lineHeight: 1.2, overflowWrap: "anywhere" };
const mutedText = { margin: "5px 0 0", color: "#627166", fontSize: "14px", overflowWrap: "anywhere" };
const activeBadge = { display: "inline-flex", alignItems: "center", minHeight: "30px", padding: "4px 10px", borderRadius: "999px", background: "#e5f4e8", color: "#176039", fontSize: "12px", fontWeight: 900 };
const archivedBadge = { ...activeBadge, background: "#f1eee8", color: "#6b6256" };
const relationshipFact = { display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginTop: "24px", padding: "16px", borderRadius: "14px", background: "#f1f6ef", color: "#254332", fontSize: "14px" };
const sectionTitle = { margin: "24px 0 12px", color: "#173b27", fontSize: "18px", lineHeight: 1.3 };
const contactGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "10px", margin: 0 };
const contactFact = { minWidth: 0, padding: "14px", borderRadius: "13px", border: "1px solid #e0e6dc", background: "#ffffff", boxSizing: "border-box" };
const factLabel = { margin: 0, color: "#6b786e", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" };
const factValue = { margin: "6px 0 0", color: "#1e3024", fontSize: "15px", lineHeight: 1.4, overflowWrap: "anywhere" };
const externalNote = { margin: "18px 0 0", color: "#5f6f62", fontSize: "14px", lineHeight: 1.5 };
const noticeCard = { marginTop: "22px", padding: "18px", borderRadius: "14px", border: "1px solid #dfe6d9", background: "#f5f8f2", color: "#24402f" };
const noticeText = { margin: "8px 0 0", color: "#5d6c61", fontSize: "14px", lineHeight: 1.5 };
const actionRow = { display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "22px" };
const primaryButton = { minHeight: "46px", maxWidth: "100%", padding: "11px 16px", borderRadius: "13px", border: "1px solid var(--meetro-color-forest, #1f4d34)", background: "var(--meetro-color-forest, #1f4d34)", color: "#fff", fontSize: "14px", fontWeight: 900, cursor: "pointer", overflowWrap: "anywhere" };
const secondaryButton = { ...primaryButton, background: "#fff", color: "var(--meetro-color-forest, #1f4d34)" };
const sectionHeading = { display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" };
const countBadge = { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "30px", minHeight: "30px", padding: "3px 8px", borderRadius: "999px", background: "#e7efe5", color: "#1f5d39", fontSize: "13px", fontWeight: 900, boxSizing: "border-box" };
const relationshipList = { display: "grid", gap: "10px" };
const relationshipRow = { display: "flex", alignItems: "center", gap: "13px", width: "100%", minWidth: 0, minHeight: "72px", padding: "14px", borderRadius: "16px", border: "1px solid #d9e2d6", background: "#fffdf8", color: "inherit", textAlign: "left", cursor: "pointer", boxSizing: "border-box", boxShadow: "0 8px 22px rgba(31, 77, 52, 0.05)" };
const relationshipRowBody = { display: "flex", flex: "1 1 260px", minWidth: 0, flexDirection: "column", gap: "4px" };
const relationshipName = { color: "#172b1e", fontSize: "16px", overflowWrap: "anywhere" };
const relationshipMeta = { color: "#66736a", fontSize: "13px", lineHeight: 1.35, overflowWrap: "anywhere" };
const rowChevron = { color: "#33724d", fontSize: "26px", lineHeight: 1 };
const readOnlyNote = { maxWidth: "700px", margin: "18px auto 0", color: "#6b776f", fontSize: "13px", lineHeight: 1.5, textAlign: "center" };
const visuallyHidden = { position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 };

export default CustomerRelationshipsCenter;
