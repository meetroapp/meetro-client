import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import { getLanguage, t } from "../utils/language";

function Notifications({ setPage }) {
  const [language, setLanguage] = useState(getLanguage());

  useEffect(() => {
    const syncLanguage = () => setLanguage(getLanguage());
    window.addEventListener("languageChanged", syncLanguage);
    window.addEventListener("meetro-language-change", syncLanguage);

    return () => {
      window.removeEventListener("languageChanged", syncLanguage);
      window.removeEventListener("meetro-language-change", syncLanguage);
    };
  }, []);

  return (
    <div className="app-page meetro-wide-page notification-truth-page">
      <header className="notification-truth-header">
        <p>{t("notificationsActivityCenter", language)}</p>
        <h1>{t("notifications", language)}</h1>
        <span>{t("notificationsUnavailableSubtitle", language)}</span>
      </header>

      <main
        className="notification-truth-workspace"
        aria-labelledby="notifications-unavailable-title"
      >
        <section className="notification-truth-card" role="status">
          <span className="notification-truth-icon" aria-hidden="true">
            <MeetroIcon name="notifications" size={28} decorative />
          </span>
          <h2 id="notifications-unavailable-title">
            {t("notificationsUnavailable", language)}
          </h2>
          <p>{t("notificationsUnavailableText", language)}</p>
        </section>
      </main>

      <BottomNav setPage={setPage} currentPage="notifications" />
    </div>
  );
}

export default Notifications;
