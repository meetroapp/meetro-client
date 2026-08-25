import { useEffect, useRef, useState } from "react";
import { t } from "../utils/language.js";
import {
  createCustomerQuoteDecisionKey,
  isCustomerQuoteDecisionConflict,
} from "../utils/customerQuoteDecisionApi.js";

const LOCALES = Object.freeze({
  en: "en-US",
  es: "es-US",
  fr: "fr-US",
  "pt-BR": "pt-BR",
});

function currency(value, code, language) {
  return new Intl.NumberFormat(LOCALES[language] || "en-US", {
    style: "currency",
    currency: code,
  }).format(value / 100);
}

function date(value, language) {
  return new Intl.DateTimeFormat(LOCALES[language] || "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(status, language) {
  if (status === "APPROVED") return t("customerQuoteStatusApproved", language);
  if (status === "DECLINED") return t("customerQuoteStatusDeclined", language);
  return t("customerQuoteStatusWaiting", language);
}

function lineageLabel(lineage, language) {
  if (lineage === "Revised") return t("customerQuoteLineageRevised", language);
  if (lineage === "Additional") {
    return t("customerQuoteLineageAdditional", language);
  }
  return t("customerQuoteLineageOriginal", language);
}

function EmptyList({ children }) {
  return <p style={styles.message}>{children}</p>;
}

export default function CustomerQuoteReviewPanel({
  language,
  discovery,
  detail,
  selectedQuoteId,
  onSelectQuote,
  onCloseReview,
  closeReviewLabel,
  onDecision,
  onReload,
}) {
  const [confirmation, setConfirmation] = useState(null);
  const [commandState, setCommandState] = useState("idle");
  const [noticeKey, setNoticeKey] = useState("");
  const confirmTitleRef = useRef(null);

  useEffect(() => {
    if (confirmation) confirmTitleRef.current?.focus();
  }, [confirmation]);

  const quotes = discovery?.status === "confirmed"
    ? discovery.quotes?.quotes || []
    : [];
  const job = discovery?.status === "confirmed"
    ? discovery.quotes?.job || null
    : null;
  const selectedSummary = quotes.find(
    (quote) => quote.quoteId === selectedQuoteId
  );
  const quote =
    detail?.status === "confirmed" && detail.quoteId === selectedQuoteId
      ? detail.detail?.quote
      : null;
  const customerTermRows = quote?.customerTermsSnapshot
    ? [
        ["customerQuotePaymentTerms", quote.customerTermsSnapshot.paymentTerms],
        ["customerQuoteEstimatedDuration", quote.customerTermsSnapshot.estimatedDuration],
        ["customerQuoteCustomerNotes", quote.customerTermsSnapshot.customerNotes],
        ["customerQuoteAdditionalWorkTerms", quote.customerTermsSnapshot.agreement.additionalWorkTerms],
        ["customerQuoteHiddenConditionsTerms", quote.customerTermsSnapshot.agreement.hiddenConditionsTerms],
        ["customerQuoteDiagnosticTerms", quote.customerTermsSnapshot.agreement.diagnosticTerms],
        ["customerQuoteCustomerResponsibilities", quote.customerTermsSnapshot.agreement.customerResponsibilities],
        ["customerQuoteWarrantyTerms", quote.customerTermsSnapshot.agreement.warrantyTerms],
        ["customerQuoteCancellationTerms", quote.customerTermsSnapshot.agreement.cancellationTerms],
        ["customerQuoteAcceptanceTerms", quote.customerTermsSnapshot.agreement.acceptanceTerms],
        [
          "customerQuotePreauthorizedAdditionalWorkLimit",
          quote.customerTermsSnapshot.agreement.preauthorizedAdditionalWorkLimit,
        ],
      ].filter(([, value]) => value)
    : [];

  async function confirmDecision() {
    if (!confirmation || !quote || commandState === "saving") return;
    setCommandState("saving");
    setNoticeKey("");
    try {
      const idempotencyKey = createCustomerQuoteDecisionKey(confirmation);
      await onDecision?.({
        quoteId: quote.quoteId,
        action: confirmation,
        expectedIssuedVersion: quote.decisionCommandVersion,
        idempotencyKey,
      });
      setConfirmation(null);
      setCommandState("saved");
      setNoticeKey(
        confirmation === "approve"
          ? "customerQuoteApprovedSaved"
          : "customerQuoteDeclinedSaved"
      );
    } catch (error) {
      setConfirmation(null);
      setCommandState("error");
      if (isCustomerQuoteDecisionConflict(error)) {
        try {
          await onReload?.(quote.quoteId);
        } catch {
          // The conflict remains the governing result even if the refresh fails.
        }
        setNoticeKey("customerQuoteConflictReloaded");
      } else {
        setNoticeKey("customerQuoteDecisionFailed");
      }
    }
  }

  return (
    <section
      style={styles.section}
      aria-labelledby="customer-quotes-title"
      data-customer-quote-review-state={selectedQuoteId ? "open" : "list"}
      data-customer-quote-action-state={commandState}
    >
      <header style={styles.header}>
        <div>
          <h2 id="customer-quotes-title" style={styles.title}>
            {t("customerQuotesTitle", language)}
          </h2>
          <p style={styles.intro}>{t("customerQuotesIntro", language)}</p>
        </div>
      </header>

      {discovery?.status === "loading" && (
        <EmptyList>{t("customerQuotesLoading", language)}</EmptyList>
      )}
      {discovery?.status === "unavailable" && (
        <EmptyList>{t("customerQuotesUnavailable", language)}</EmptyList>
      )}
      {discovery?.status === "confirmed" && quotes.length === 0 && (
        <EmptyList>{t("customerQuotesEmpty", language)}</EmptyList>
      )}

      {quotes.length > 0 && (
        <div style={styles.list} aria-label={t("customerQuotesTitle", language)}>
          {quotes.map((item) => (
            <article key={item.quoteId} style={styles.listItem}>
              <div style={styles.listCopy}>
                <div style={styles.badgeRow}>
                  <span style={styles.lineageBadge}>
                    {lineageLabel(item.lineageLabel, language)}
                  </span>
                  <span
                    style={{
                      ...styles.statusBadge,
                      ...(item.businessStatus === "APPROVED"
                        ? styles.statusApproved
                        : item.businessStatus === "DECLINED"
                        ? styles.statusDeclined
                        : styles.statusPending),
                    }}
                  >
                    {statusLabel(item.businessStatus, language)}
                  </span>
                </div>
                <strong style={styles.listTotal}>
                  {currency(item.totalMinor, item.currency, language)}
                </strong>
                <span style={styles.listDate}>
                  {t("customerQuoteIssued", language)} {date(item.issuedAt, language)}
                </span>
              </div>
              <button
                type="button"
                style={styles.reviewButton}
                onClick={() => onSelectQuote?.(item.quoteId)}
                aria-pressed={item.quoteId === selectedQuoteId}
              >
                {t("customerQuoteReview", language)}
              </button>
            </article>
          ))}
        </div>
      )}

      {selectedQuoteId && detail?.status === "loading" && (
        <p role="status" style={styles.message}>
          {t("customerQuotesLoading", language)}
        </p>
      )}
      {selectedQuoteId && detail?.status === "unavailable" && (
        <p role="alert" style={styles.errorMessage}>
          {t("customerQuotesUnavailable", language)}
        </p>
      )}

      {quote && selectedSummary && (
        <article style={styles.detail} aria-labelledby="customer-quote-detail-title">
          <button type="button" style={styles.backButton} onClick={onCloseReview}>
            {closeReviewLabel || t("customerQuoteCloseReview", language)}
          </button>

          <div style={styles.detailHeader}>
            <div>
              <span style={styles.lineageBadge}>
                {lineageLabel(quote.lineageLabel, language)}
              </span>
              <h3 id="customer-quote-detail-title" style={styles.detailTitle}>
                {statusLabel(quote.businessStatus, language)}
              </h3>
              {quote.businessStatus === "APPROVED" && (
                <p style={styles.nextStep}>
                  {t("customerQuoteAcceptedNext", language)}
                </p>
              )}
              <p style={styles.detailDate}>
                {t("customerQuoteIssued", language)} {date(quote.issuedAt, language)}
              </p>
              <p style={styles.detailDate}>
                {t("customerQuoteProject", language)}: {job?.title || "—"}
              </p>
              <p style={styles.detailDate}>
                {t("customerQuoteIssuedBy", language)}: {job?.issuerName || "—"}
              </p>
              <p style={styles.detailDate}>
                {t("customerQuoteVersion", language)} {quote.decisionCommandVersion}
              </p>
            </div>
            <div style={styles.totalBlock}>
              <span>{t("customerQuoteTotal", language)}</span>
              <strong>{currency(quote.totalMinor, quote.currency, language)}</strong>
            </div>
          </div>

          <div style={styles.detailGrid}>
            <section style={styles.detailSection}>
              <h4 style={styles.detailSectionTitle}>
                {t("customerQuoteScope", language)}
              </h4>
              {quote.scopeItems.length === 0 ? (
                <EmptyList>{t("customerQuoteNoneListed", language)}</EmptyList>
              ) : (
                <ul style={styles.itemList}>
                  {quote.scopeItems.map((item, index) => (
                    <li key={`${item.description}-${index}`} style={styles.itemRow}>
                      <span>
                        {item.description}
                        {item.quantity !== 1 && (
                          <small style={styles.quantity}>
                            {t("customerQuoteQuantity", language)} {item.quantity}
                          </small>
                        )}
                      </span>
                      <strong style={styles.itemAmount}>
                        {currency(item.amountMinor, quote.currency, language)}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {quote.customerTermsSnapshot && (
              <section style={styles.detailSection}>
                <h4 style={styles.detailSectionTitle}>
                  {t("customerQuoteTerms", language)}
                </h4>
                <dl style={styles.termList}>
                  {customerTermRows.map(([labelKey, value]) => (
                    <div key={labelKey}>
                      <dt style={styles.termLabel}>{t(labelKey, language)}</dt>
                      <dd style={styles.termValue}>{value}</dd>
                    </div>
                  ))}
                  {quote.customerTermsSnapshot.agreement.exclusions.length > 0 && (
                    <div>
                      <dt style={styles.termLabel}>{t("customerQuoteAgreementExclusions", language)}</dt>
                      <dd style={styles.termValue}>
                        <ul style={styles.textList}>
                          {quote.customerTermsSnapshot.agreement.exclusions.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            <section style={styles.detailSection}>
              <h4 style={styles.detailSectionTitle}>
                {t("customerQuoteConditions", language)}
              </h4>
              {quote.conditions.length === 0 ? (
                <EmptyList>{t("customerQuoteNoneListed", language)}</EmptyList>
              ) : (
                <ul style={styles.textList}>
                  {quote.conditions.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              )}
            </section>

            <section style={styles.detailSection}>
              <h4 style={styles.detailSectionTitle}>
                {t("customerQuoteExclusions", language)}
              </h4>
              {quote.exclusions.length === 0 ? (
                <EmptyList>{t("customerQuoteNoneListed", language)}</EmptyList>
              ) : (
                <ul style={styles.textList}>
                  {quote.exclusions.map((item, index) => (
                    <li key={`${item.description}-${index}`}>
                      {item.description}
                      {item.quantity !== 1
                        ? ` (${t("customerQuoteQuantity", language)} ${item.quantity})`
                        : ""}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div aria-live="polite" style={styles.noticeSlot}>
            {noticeKey && (
              <p
                role={commandState === "error" ? "alert" : "status"}
                style={commandState === "error" ? styles.errorNotice : styles.savedNotice}
              >
                {t(noticeKey, language)}
              </p>
            )}
          </div>

          {quote.businessStatus === "WAITING_ON_CUSTOMER" &&
            (quote.actions.canApprove || quote.actions.canDecline) && (
              <div style={styles.actionRow}>
                {quote.actions.canDecline && (
                  <button
                    type="button"
                    style={styles.declineButton}
                    onClick={() => setConfirmation("decline")}
                  >
                    {t("customerQuoteDecline", language)}
                  </button>
                )}
                {quote.actions.canApprove && (
                  <button
                    type="button"
                    style={styles.approveButton}
                    onClick={() => setConfirmation("approve")}
                  >
                    {t("customerQuoteApprove", language)}
                  </button>
                )}
              </div>
            )}
        </article>
      )}

      {confirmation && quote && (
        <div style={styles.overlay} role="presentation">
          <section
            style={styles.dialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="customer-quote-confirm-title"
            aria-describedby="customer-quote-confirm-body"
          >
            <h2
              id="customer-quote-confirm-title"
              ref={confirmTitleRef}
              tabIndex={-1}
              style={styles.dialogTitle}
            >
              {t(
                confirmation === "approve"
                  ? "customerQuoteApproveConfirmTitle"
                  : "customerQuoteDeclineConfirmTitle",
                language
              )}
            </h2>
            <p id="customer-quote-confirm-body" style={styles.dialogBody}>
              {t(
                confirmation === "approve"
                  ? "customerQuoteApproveConfirmBody"
                  : "customerQuoteDeclineConfirmBody",
                language
              )}
            </p>
            <p style={styles.dialogContext}>
              {t("customerQuoteProject", language)}: {job?.title || "—"}
              <br />
              {t("customerQuoteIssuedBy", language)}: {job?.issuerName || "—"}
              <br />
              {t("customerQuoteVersion", language)} {quote.decisionCommandVersion}
            </p>
            <strong style={styles.dialogTotal}>
              {currency(quote.totalMinor, quote.currency, language)}
            </strong>
            {commandState === "saving" && (
              <p role="status" style={styles.dialogStatus}>
                {t("customerQuoteSaving", language)}
              </p>
            )}
            <div style={styles.dialogActions}>
              <button
                type="button"
                style={styles.cancelButton}
                disabled={commandState === "saving"}
                onClick={() => setConfirmation(null)}
              >
                {t("customerQuoteCancel", language)}
              </button>
              <button
                type="button"
                style={
                  confirmation === "approve"
                    ? styles.approveButton
                    : styles.declineButton
                }
                disabled={commandState === "saving"}
                onClick={confirmDecision}
              >
                {t(
                  confirmation === "approve"
                    ? "customerQuoteConfirmApprove"
                    : "customerQuoteConfirmDecline",
                  language
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

const styles = {
  section: {
    margin: "22px 0",
    padding: "20px 0",
    borderTop: "1px solid #dbe2ea",
    borderBottom: "1px solid #dbe2ea",
  },
  header: { display: "flex", justifyContent: "space-between", gap: 16 },
  title: { margin: 0, color: "#18231d", fontSize: 21 },
  intro: { margin: "6px 0 0", color: "#56645c", lineHeight: 1.5 },
  message: { margin: "14px 0 0", color: "#657168", lineHeight: 1.5 },
  errorMessage: { margin: "14px 0 0", color: "#8a3329", lineHeight: 1.5 },
  list: { display: "grid", gap: 10, marginTop: 16 },
  listItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: 14,
    border: "1px solid #d8e0da",
    borderRadius: 8,
    background: "#fff",
  },
  listCopy: { display: "grid", gap: 5, minWidth: 0 },
  badgeRow: { display: "flex", flexWrap: "wrap", gap: 7 },
  lineageBadge: {
    display: "inline-flex",
    width: "fit-content",
    padding: "4px 8px",
    borderRadius: 4,
    background: "#edf1ee",
    color: "#34433a",
    fontSize: 12,
    fontWeight: 800,
  },
  statusBadge: {
    display: "inline-flex",
    width: "fit-content",
    padding: "4px 8px",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 800,
  },
  statusApproved: { background: "#dff3e5", color: "#1d6037" },
  statusDeclined: { background: "#f9e5e2", color: "#87352e" },
  statusPending: { background: "#fff0c7", color: "#76540a" },
  listTotal: { color: "#18231d", fontSize: 20 },
  listDate: { color: "#67736b", fontSize: 13 },
  reviewButton: {
    minHeight: 44,
    minWidth: 116,
    padding: "10px 15px",
    border: "1px solid #24583b",
    borderRadius: 6,
    background: "#fff",
    color: "#24583b",
    fontWeight: 800,
    cursor: "pointer",
  },
  detail: { marginTop: 18, paddingTop: 18, borderTop: "1px solid #dbe2ea" },
  backButton: {
    minHeight: 44,
    padding: "8px 0",
    border: 0,
    background: "transparent",
    color: "#24583b",
    fontWeight: 800,
    cursor: "pointer",
  },
  detailHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 6,
  },
  detailTitle: { margin: "10px 0 0", color: "#18231d", fontSize: 24 },
  detailDate: { margin: "5px 0 0", color: "#67736b", fontSize: 14 },
  nextStep: { margin: "8px 0 0", color: "#34433a", lineHeight: 1.45 },
  totalBlock: { display: "grid", gap: 3, textAlign: "right", color: "#4f5d54" },
  detailGrid: {
    display: "grid",
    gap: 18,
    width: "100%",
    maxWidth: 680,
    marginTop: 22,
  },
  detailSection: { minWidth: 0 },
  detailSectionTitle: { margin: "0 0 9px", color: "#24352b", fontSize: 16 },
  itemList: { listStyle: "none", margin: 0, padding: 0 },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    padding: "10px 0",
    borderBottom: "1px solid #e3e8e4",
    color: "#27352d",
  },
  quantity: { display: "block", marginTop: 3, color: "#67736b" },
  itemAmount: { flexShrink: 0, whiteSpace: "nowrap" },
  textList: { margin: 0, paddingLeft: 20, color: "#435148", lineHeight: 1.55 },
  termList: { display: "grid", gap: 12, margin: 0, color: "#435148" },
  termLabel: { fontWeight: 800, color: "#24352b" },
  termValue: { margin: "3px 0 0", lineHeight: 1.5 },
  noticeSlot: { minHeight: 0 },
  savedNotice: {
    margin: "16px 0 0",
    padding: 12,
    background: "#e5f4e9",
    color: "#1f5c36",
    borderRadius: 6,
  },
  errorNotice: {
    margin: "16px 0 0",
    padding: 12,
    background: "#fae9e6",
    color: "#85372e",
    borderRadius: 6,
  },
  actionRow: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 },
  approveButton: {
    minHeight: 44,
    padding: "10px 17px",
    border: "1px solid #24583b",
    borderRadius: 6,
    background: "#24583b",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  declineButton: {
    minHeight: 44,
    padding: "10px 17px",
    border: "1px solid #a4473d",
    borderRadius: 6,
    background: "#fff",
    color: "#8a3329",
    fontWeight: 800,
    cursor: "pointer",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1300,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    background: "rgba(20, 30, 24, 0.52)",
  },
  dialog: {
    width: "min(100%, 440px)",
    maxHeight: "calc(100dvh - 36px)",
    overflowY: "auto",
    padding: 22,
    borderRadius: 8,
    background: "#fff",
    boxShadow: "0 18px 50px rgba(16, 28, 20, 0.24)",
  },
  dialogTitle: { margin: 0, color: "#18231d", fontSize: 22, outline: "none" },
  dialogBody: { margin: "10px 0", color: "#526057", lineHeight: 1.5 },
  dialogContext: { margin: "10px 0", color: "#34433a", lineHeight: 1.5 },
  dialogTotal: { display: "block", color: "#18231d", fontSize: 25 },
  dialogStatus: { color: "#526057" },
  dialogActions: { display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 10, marginTop: 22 },
  cancelButton: {
    minHeight: 44,
    padding: "10px 17px",
    border: "1px solid #bdc7c0",
    borderRadius: 6,
    background: "#fff",
    color: "#34433a",
    fontWeight: 800,
    cursor: "pointer",
  },
};
