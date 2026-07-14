import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import HiringUnavailableState from "../components/HiringUnavailableState";
import { getLanguage, t } from "../utils/language";

function TeamMembers({ setPage }) {
  const language = getLanguage();

  return (
    <div className="app-page meetro-responsive-page meetro-visual-page hiring-truth-page">
      <BusinessToolsPageHeader
        title={t("teamMembers", language)}
        description={t("teamMembersTruthDescription", language)}
        categoryLabel={t("businessTools", language)}
        onBack={() => setPage("businessCommandCenter")}
      />

      <HiringUnavailableState
        language={language}
        scope="team"
        onBack={() => setPage("businessCommandCenter")}
      />

      <BottomNav setPage={setPage} currentPage="teamMembers" />
    </div>
  );
}

export default TeamMembers;
