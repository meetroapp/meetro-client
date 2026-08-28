import {
  formatLocaleCurrency,
  formatLocaleDate,
  formatLocaleTime,
} from "../utils/localeFormat.js";
import { t } from "../utils/language.js";
import { deriveQuoteDepositPresentation } from "../utils/quoteDecisionPresentation.js";

export default function ConversationQuoteDecisionEvent({
  quote,
  customerLabel = "Customer",
  language,
  canViewQuote = false,
  canOpenWorkCenter = false,
  onViewQuote,
  onOpenWorkCenter,
}) {
  if (!quote || !["APPROVED", "DECLINED"].includes(quote.businessStatus)) return null;
  const approved = quote.businessStatus === "APPROVED";
  const total = formatLocaleCurrency(quote.totalMinor / 100, quote.currency, {}, language);
  const deposit = approved ? deriveQuoteDepositPresentation(quote) : { state: "NONE" };
  return (
    <article
      className="canonical-conversation-quote-decision"
      data-quote-decision={quote.businessStatus}
      data-quote-id={quote.quoteId}
      data-job-id={quote.jobId}
      style={styles.card}
    >
      <strong>{t(
        approved ? "quoteDecisionApprovedTitle" : "quoteDecisionDeclinedTitle",
        language
      )}</strong>
      <span>
        {t(
          approved ? "quoteDecisionApprovedMessage" : "quoteDecisionDeclinedMessage",
          language,
          {
            customer: customerLabel || "Customer",
            quote: quote.quoteNumber || "Quote",
            total,
          }
        )}
      </span>
      {quote.decidedAt && (
        <time dateTime={quote.decidedAt} style={styles.time}>
          {formatLocaleDate(quote.decidedAt, { month: "short", day: "numeric" }, language)} ·{" "}
          {formatLocaleTime(quote.decidedAt, { hour: "numeric", minute: "2-digit" }, language)}
        </time>
      )}
      {deposit.state === "DUE" && (
        <span style={styles.gate}>
          {t("quoteDecisionDepositDue", language, {
            amount: formatLocaleCurrency(
              deposit.dueMinor / 100,
              quote.currency,
              {},
              language
            ),
          })}
        </span>
      )}
      <div style={styles.actions}>
        {canViewQuote && (
          <button type="button" style={styles.button} onClick={onViewQuote}>
            {t("quoteDecisionViewQuote", language)}
          </button>
        )}
        {canOpenWorkCenter && (
          <button type="button" style={styles.button} onClick={onOpenWorkCenter}>
            {t("quoteDecisionOpenWorkCenter", language)}
          </button>
        )}
      </div>
    </article>
  );
}

const styles = {
  card: {
    display: "grid",
    gap: 8,
    width: "min(100%, 360px)",
    minWidth: 0,
    marginTop: 8,
    padding: 14,
    border: "1px solid #b7d6c1",
    borderRadius: 8,
    background: "#f3faf5",
    color: "#173c26",
  },
  gate: { fontWeight: 800, color: "#704f12" },
  time: { color: "#526052", fontSize: 12, fontWeight: 700 },
  actions: { display: "flex", flexWrap: "wrap", gap: 8 },
  button: {
    minHeight: 44,
    padding: "0 14px",
    border: "1px solid #1f5132",
    borderRadius: 8,
    background: "#fff",
    color: "#1f5132",
    fontWeight: 800,
    cursor: "pointer",
  },
};
