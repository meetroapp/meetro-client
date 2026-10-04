import { formatLocaleCurrency } from "../utils/localeFormat.js";
import { t } from "../utils/language.js";

function ProfessionalQuoteDecisionAttentionCard({ attention, language, onOpenWorkCenter }) {
  return (
    <article className="alert-center-card alert-center-card--high" data-canonical-decision-attention="true">
      <div className="alert-center-card__topline">
        <span className="alert-center-category">{t("quoteDecisionAttentionCategory", language)}</span>
        <span className="alert-center-priority alert-center-priority--high">
          {t("quoteDecisionAttentionCanonical", language)}
        </span>
      </div>
      <h2>{t("alerts.commercial.quoteApproved.title", language)}</h2>
      <p className="alert-center-card__message">
        {t("alerts.commercial.quoteApproved.message", language)}
      </p>
      <div className="alert-center-card__facts">
        <strong>{attention.customerLabel}</strong>
        <span>{attention.projectTitle}</span>
        <span>{formatLocaleCurrency(attention.totalMinor / 100, attention.currency, {}, language)}</span>
        <span>{attention.stageLabel}</span>
        <span>{attention.nextAction}</span>
        <time dateTime={attention.decidedAt}>{new Date(attention.decidedAt).toLocaleString()}</time>
      </div>
      <div className="alert-center-card__actions">
        <button
          type="button"
          className="alert-center-button alert-center-button--primary"
          onClick={() => onOpenWorkCenter(attention.route)}
        >
          {t("quoteDecisionOpenWorkCenter", language)}
        </button>
      </div>
    </article>
  );
}

export default ProfessionalQuoteDecisionAttentionCard;
