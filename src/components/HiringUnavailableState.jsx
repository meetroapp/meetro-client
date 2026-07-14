import MeetroIcon from "./MeetroIcon";
import { t } from "../utils/language";

function HiringUnavailableState({ language, scope = "hiring", onBack }) {
  const isTeam = scope === "team";

  return (
    <main className="hiring-truth-workspace" aria-labelledby={`${scope}-unavailable-title`}>
      <section className="hiring-truth-card" role="status">
        <span className="hiring-truth-icon" aria-hidden="true">
          <MeetroIcon name="hiringCenter" size={28} decorative />
        </span>
        <h2 id={`${scope}-unavailable-title`}>
          {t(isTeam ? "teamMembersUnavailable" : "hiringOperationsUnavailable", language)}
        </h2>
        <p>
          {t(isTeam ? "teamMembersUnavailableText" : "hiringOperationsUnavailableText", language)}
        </p>
        {onBack && (
          <button type="button" className="meetro-visual-primary-button" onClick={onBack}>
            {t("backToBusinessTools", language)}
          </button>
        )}
      </section>
    </main>
  );
}

export default HiringUnavailableState;
