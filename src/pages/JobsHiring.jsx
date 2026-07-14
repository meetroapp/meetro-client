import BottomNav from "../components/BottomNav";
import HiringUnavailableState from "../components/HiringUnavailableState";
import { getLanguage, t } from "../utils/language";

function JobsHiring({ setPage, language }) {
  const activeLanguage = language || getLanguage();

  return (
    <div className="app-page meetro-responsive-page meetro-visual-page hiring-truth-page">
      <header className="hiring-truth-public-header">
        <button type="button" onClick={() => setPage("discover")}>
          {t("communityHiringBackToCommunity", activeLanguage)}
        </button>
        <p>{t("jobsHiringEyebrow", activeLanguage)}</p>
        <h1>{t("jobsHiringTitle", activeLanguage)}</h1>
        <span>{t("hiringOpportunitiesTruthDescription", activeLanguage)}</span>
      </header>

      <HiringUnavailableState language={activeLanguage} />

      <BottomNav setPage={setPage} currentPage="jobsHiring" />
    </div>
  );
}

export default JobsHiring;
