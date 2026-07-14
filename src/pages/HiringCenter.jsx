import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import HiringUnavailableState from "../components/HiringUnavailableState";
import { getLanguage, t } from "../utils/language";

function HiringCenter({ setPage }) {
  const language = getLanguage();

  return (
    <div className="app-page meetro-responsive-page meetro-visual-page hiring-truth-page">
      <BusinessToolsPageHeader
        title={t("hiringCenter", language)}
        description={t("hiringOperationsDescription", language)}
        categoryLabel={t("businessTools", language)}
        onBack={() => setPage("businessCommandCenter")}
      />

      <HiringUnavailableState
        language={language}
        onBack={() => setPage("businessCommandCenter")}
      />

      <BottomNav setPage={setPage} currentPage="hiringCenter" />
    </div>
  );
}

export default HiringCenter;
