import { useCallback, useEffect, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import { getLanguage } from "../utils/language";
import { getCustomerRelationshipsCopy } from "../utils/customerRelationshipsLanguage.js";
import {
  clearCustomerRelationshipNavigationContext,
  loadCustomerRelationshipActivity,
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
  const source = text(value);
  const date = source
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(source) ? `${source}T12:00:00` : source)
    : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(DATE_LOCALES[language] || DATE_LOCALES.en, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatMoney(value, currency, language) {
  if (!Number.isSafeInteger(value) || value < 0) return "";
  try {
    return new Intl.NumberFormat(DATE_LOCALES[language] || DATE_LOCALES.en, {
      style: "currency",
      currency: text(currency) || "USD",
    }).format(value / 100);
  } catch {
    return "";
  }
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
  const [activityFocus, setActivityFocus] = useState(
    navigationContext?.focus || "overview"
  );
  const [activityState, setActivityState] = useState({
    status: "idle",
    activity: null,
    error: "",
  });
  const activityRequestRef = useRef(0);

  const loadActivity = useCallback(async (relationshipId) => {
    if (!relationshipId) return;
    const requestId = activityRequestRef.current + 1;
    activityRequestRef.current = requestId;
    setActivityState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const activity = await loadCustomerRelationshipActivity({
        relationshipId,
        setPage,
      });
      if (activityRequestRef.current !== requestId) return;
      setActivityState({ status: "ready", activity, error: "" });
    } catch (error) {
      if (activityRequestRef.current !== requestId) return;
      setActivityState((current) => ({
        ...current,
        status: "error",
        error: error?.message || copy.activityErrorText,
      }));
    }
  }, [copy.activityErrorText, setPage]);

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

  const loadedRelationshipId = workspaceState.detail?.relationship?.id || "";
  useEffect(() => {
    if (loadedRelationshipId) {
      void loadActivity(loadedRelationshipId);
    } else {
      activityRequestRef.current += 1;
      setActivityState({ status: "idle", activity: null, error: "" });
    }
  }, [loadActivity, loadedRelationshipId]);

  async function openRelationship(relationshipId) {
    setActivityFocus("overview");
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
    setActivityFocus("overview");
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
                <h3 id="customer-relationship-detail-title" style={detailTitle}>
                  {contactName(contact, copy.contactName)}
                </h3>
                {text(contact.companyName) && (
                  <p style={mutedText}>{contact.companyName}</p>
                )}
                <p style={relationshipSummary}>
                  {copy.customerSince} {formatEstablishedDate(relationship.createdAt, language) || copy.relationshipEstablished}
                </p>
              </div>
              <span style={contact.status === "ARCHIVED" ? archivedBadge : activeBadge}>
                {contact.status === "ARCHIVED" ? copy.archived : copy.active}
              </span>
            </div>

            <div style={actionRow}>
              <button type="button" style={primaryButton} onClick={() => openContact(contact)}>
                {copy.viewContact}
              </button>
              <button type="button" style={secondaryButton} onClick={showDirectory}>
                {copy.backToRelationships}
              </button>
            </div>

            <div style={activityHeader}>
              <h4 style={activityTitle}>{copy.relationshipActivity}</h4>
              <div style={activityNavigation} aria-label={copy.relationshipActivity}>
                {[
                  ["overview", copy.overview],
                  ["work", copy.work],
                  ["quotes", copy.quotes],
                  ["invoices", copy.invoices],
                ].map(([focus, label]) => (
                  <button
                    key={focus}
                    type="button"
                    style={activityFocus === focus ? activityTabActive : activityTab}
                    aria-pressed={activityFocus === focus}
                    onClick={() => setActivityFocus(focus)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {activityState.status === "loading" && (
              <div style={activityStateCard} role="status" aria-live="polite">
                {copy.loadingActivity}
              </div>
            )}
            {activityState.status === "error" && (
              <div style={activityStateCard} role="alert">
                <strong>{copy.activityErrorTitle}</strong>
                <p style={noticeText}>{activityState.error || copy.activityErrorText}</p>
                <button
                  type="button"
                  style={secondaryButton}
                  onClick={() => void loadActivity(relationship.id)}
                >
                  {copy.retry}
                </button>
              </div>
            )}
            {activityState.status === "ready" && activityState.activity && (
              <RelationshipActivity
                activity={activityState.activity}
                focus={activityFocus}
                copy={copy}
                language={language}
              />
            )}
            <p style={externalNote}>{copy.externalContact}</p>
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

function RelationshipActivity({ activity, focus, copy, language }) {
  const sections = [
    {
      id: "work",
      title: copy.work,
      items: activity.work,
      empty: copy.noWork,
      render: (item) => (
        <ActivityRow
          key={item.jobId}
          title={text(item.title) || text(item.service) || copy.job}
          status={text(item.status)}
          dateLabel={item.completedAt ? copy.completed : copy.created}
          dateValue={item.completedAt || item.createdAt || item.linkedAt}
          language={language}
        />
      ),
    },
    {
      id: "quotes",
      title: copy.quotes,
      items: activity.quotes,
      empty: copy.noQuotes,
      render: (item) => (
        <ActivityRow
          key={item.quoteId}
          title={text(item.documentNumber) || copy.quote}
          status={text(item.status)}
          secondaryStatus={text(item.customerDecision)}
          secondaryStatusLabel={copy.decision}
          money={[copy.total, formatMoney(item.totalMinor, item.currency, language)]}
          dateLabel={item.issuedAt ? copy.issued : copy.latest}
          dateValue={item.issuedAt || item.lastActivityAt || item.updatedAt || item.createdAt}
          language={language}
        />
      ),
    },
    {
      id: "invoices",
      title: copy.invoices,
      items: activity.invoices,
      empty: copy.noInvoices,
      render: (item) => (
        <ActivityRow
          key={item.invoiceId}
          title={text(item.invoiceNumber) || copy.invoice}
          status={text(item.status)}
          money={[
            [copy.total, formatMoney(item.totalMinor, item.currency, language)],
            [copy.paid, formatMoney(item.paidMinor, item.currency, language)],
            [copy.balance, formatMoney(item.balanceMinor, item.currency, language)],
          ]}
          dateLabel={item.issuedAt ? copy.issued : copy.latest}
          dateValue={item.issuedAt || item.invoiceDate || item.lastActivityAt || item.updatedAt || item.createdAt}
          language={language}
        />
      ),
    },
  ];
  const visible = focus === "overview"
    ? sections
    : sections.filter((section) => section.id === focus);
  return (
    <div style={activitySections}>
      {visible.map((section) => (
        <section key={section.id} aria-labelledby={`relationship-${section.id}-title`}>
          <h5 id={`relationship-${section.id}-title`} style={activitySectionTitle}>
            {section.title}
          </h5>
          {section.items.length === 0 ? (
            <p style={activityEmpty}>{section.empty}</p>
          ) : (
            <div style={activityList}>{section.items.map(section.render)}</div>
          )}
        </section>
      ))}
    </div>
  );
}

function ActivityRow({ title, status, secondaryStatus, secondaryStatusLabel, money, dateLabel, dateValue, language }) {
  const amounts = Array.isArray(money?.[0]) ? money : money ? [money] : [];
  return (
    <article style={activityRow}>
      <div style={activityRowTop}>
        <strong style={activityRowTitle}>{title}</strong>
        {status && <span style={activityStatus}>{status}</span>}
      </div>
      {secondaryStatus && (
        <p style={activityMeta}>{secondaryStatusLabel}: {secondaryStatus}</p>
      )}
      {amounts.some(([, value]) => value) && (
        <div style={activityAmounts}>
          {amounts.filter(([, value]) => value).map(([label, value]) => (
            <span key={label} style={activityAmount}>
              <small>{label}</small>
              <strong>{value}</strong>
            </span>
          ))}
        </div>
      )}
      {dateValue && (
        <p style={activityMeta}>{dateLabel}: {formatEstablishedDate(dateValue, language)}</p>
      )}
    </article>
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
const sectionTitle = { margin: "24px 0 12px", color: "#173b27", fontSize: "18px", lineHeight: 1.3 };
const relationshipSummary = { margin: "7px 0 0", color: "#52655a", fontSize: "14px", lineHeight: 1.4 };
const externalNote = { margin: "18px 0 0", color: "#5f6f62", fontSize: "14px", lineHeight: 1.5 };
const noticeCard = { marginTop: "22px", padding: "18px", borderRadius: "14px", border: "1px solid #dfe6d9", background: "#f5f8f2", color: "#24402f" };
const noticeText = { margin: "8px 0 0", color: "#5d6c61", fontSize: "14px", lineHeight: 1.5 };
const actionRow = { display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "22px" };
const primaryButton = { minHeight: "46px", maxWidth: "100%", padding: "11px 16px", borderRadius: "13px", border: "1px solid var(--meetro-color-forest, #1f4d34)", background: "var(--meetro-color-forest, #1f4d34)", color: "#fff", fontSize: "14px", fontWeight: 900, cursor: "pointer", overflowWrap: "anywhere" };
const secondaryButton = { ...primaryButton, background: "#fff", color: "var(--meetro-color-forest, #1f4d34)" };
const activityHeader = { marginTop: "28px", paddingTop: "22px", borderTop: "1px solid #dfe6d9" };
const activityTitle = { margin: 0, color: "#173b27", fontSize: "20px", lineHeight: 1.3 };
const activityNavigation = { display: "flex", gap: "8px", width: "100%", marginTop: "14px", paddingBottom: "2px", overflowX: "auto", WebkitOverflowScrolling: "touch" };
const activityTab = { flex: "0 0 auto", minHeight: "44px", padding: "9px 14px", border: "1px solid #cfdacf", borderRadius: "999px", background: "#fff", color: "#31543f", fontSize: "14px", fontWeight: 800, cursor: "pointer" };
const activityTabActive = { ...activityTab, borderColor: "#1f4d34", background: "#1f4d34", color: "#fff" };
const activityStateCard = { marginTop: "18px", padding: "18px", border: "1px solid #dfe6d9", borderRadius: "14px", background: "#f7f9f5", color: "#405449", lineHeight: 1.5 };
const activitySections = { display: "grid", gap: "24px", marginTop: "20px" };
const activitySectionTitle = { margin: "0 0 10px", color: "#1d492f", fontSize: "16px" };
const activityList = { display: "grid", gap: "9px" };
const activityEmpty = { margin: 0, padding: "16px", border: "1px solid #e1e7df", borderRadius: "13px", background: "#fafbf8", color: "#66736a", fontSize: "14px" };
const activityRow = { minWidth: 0, padding: "15px", border: "1px solid #dfe6dc", borderRadius: "14px", background: "#fff", boxSizing: "border-box" };
const activityRowTop = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" };
const activityRowTitle = { minWidth: 0, color: "#1d3023", fontSize: "15px", overflowWrap: "anywhere" };
const activityStatus = { maxWidth: "100%", padding: "4px 9px", borderRadius: "999px", background: "#edf4ec", color: "#245b39", fontSize: "11px", fontWeight: 900, overflowWrap: "anywhere" };
const activityMeta = { margin: "9px 0 0", color: "#69766d", fontSize: "13px", lineHeight: 1.4, overflowWrap: "anywhere" };
const activityAmounts = { display: "flex", flexWrap: "wrap", gap: "10px 22px", marginTop: "11px" };
const activityAmount = { display: "inline-flex", flexDirection: "column", gap: "2px", minWidth: 0, color: "#25382b" };
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
