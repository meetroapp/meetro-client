import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import useLanguage from "../hooks/useLanguage";
import { prepareHostedProfileReturn } from "../utils/hostedProfileReturn.js";
import {
  CONNECTED_SERVICE_CAPABILITY,
  CONNECTED_SERVICE_STATUS,
  getConnectedServiceProviders,
} from "../utils/connectedServicesRegistry.js";

const COPY = Object.freeze({
  en: Object.freeze({
    eyebrow: "Business settings",
    title: "Connected Services",
    description:
      "Manage external business services that can work with Meetro.",
    previewTitle: "Integration foundation",
    previewBody:
      "No external service can be connected yet. This workspace establishes where future business integrations will be managed.",
    subscriptionBoundary:
      "Meetro plan and subscription billing are separate from Connected Services.",
    payments: "Payments",
    accounting: "Accounting",
    calendar: "Calendar",
    comingSoon: "Coming Soon",
    notConnected: "Not connected",
    connected: "Connected",
    needsAttention: "Needs attention",
    unavailable: "Unavailable",
    stripe:
      "Receive customer deposits and invoice payments through your business payment account.",
    quickbooks:
      "Synchronize approved financial records with your accounting workflow.",
    google:
      "Synchronize confirmed Meetro visits and schedule events.",
    microsoft:
      "Synchronize confirmed Meetro visits and schedule events.",
    back: "Back",
  }),
  es: Object.freeze({
    eyebrow: "Configuración del negocio",
    title: "Servicios conectados",
    description:
      "Administra servicios externos del negocio que podrán trabajar con Meetro.",
    previewTitle: "Base de integraciones",
    previewBody:
      "Todavía no se puede conectar ningún servicio externo. Este espacio establece dónde se administrarán las futuras integraciones del negocio.",
    subscriptionBoundary:
      "El plan y la facturación de la suscripción de Meetro son independientes de Servicios conectados.",
    payments: "Pagos",
    accounting: "Contabilidad",
    calendar: "Calendario",
    comingSoon: "Próximamente",
    notConnected: "No conectado",
    connected: "Conectado",
    needsAttention: "Requiere atención",
    unavailable: "No disponible",
    stripe:
      "Recibe depósitos y pagos de facturas de clientes mediante la cuenta de pagos de tu negocio.",
    quickbooks:
      "Sincroniza registros financieros aprobados con tu flujo contable.",
    google:
      "Sincroniza visitas confirmadas de Meetro y eventos del calendario.",
    microsoft:
      "Sincroniza visitas confirmadas de Meetro y eventos del calendario.",
    back: "Volver",
  }),
  fr: Object.freeze({
    eyebrow: "Paramètres professionnels",
    title: "Services connectés",
    description:
      "Gérez les services professionnels externes qui pourront fonctionner avec Meetro.",
    previewTitle: "Base des intégrations",
    previewBody:
      "Aucun service externe ne peut encore être connecté. Cet espace établit l’endroit où les futures intégrations professionnelles seront gérées.",
    subscriptionBoundary:
      "Le forfait et la facturation de l’abonnement Meetro sont distincts des Services connectés.",
    payments: "Paiements",
    accounting: "Comptabilité",
    calendar: "Calendrier",
    comingSoon: "Bientôt disponible",
    notConnected: "Non connecté",
    connected: "Connecté",
    needsAttention: "Attention requise",
    unavailable: "Indisponible",
    stripe:
      "Recevez les acomptes clients et les paiements de factures via le compte de paiement de votre entreprise.",
    quickbooks:
      "Synchronisez les dossiers financiers approuvés avec votre flux comptable.",
    google:
      "Synchronisez les visites Meetro confirmées et les événements du calendrier.",
    microsoft:
      "Synchronisez les visites Meetro confirmées et les événements du calendrier.",
    back: "Retour",
  }),
  "pt-BR": Object.freeze({
    eyebrow: "Configurações do negócio",
    title: "Serviços conectados",
    description:
      "Gerencie serviços externos do negócio que poderão funcionar com a Meetro.",
    previewTitle: "Base de integrações",
    previewBody:
      "Nenhum serviço externo pode ser conectado ainda. Este espaço estabelece onde futuras integrações do negócio serão gerenciadas.",
    subscriptionBoundary:
      "O plano e a cobrança da assinatura Meetro são separados dos Serviços conectados.",
    payments: "Pagamentos",
    accounting: "Contabilidade",
    calendar: "Calendário",
    comingSoon: "Em breve",
    notConnected: "Não conectado",
    connected: "Conectado",
    needsAttention: "Requer atenção",
    unavailable: "Indisponível",
    stripe:
      "Receba depósitos e pagamentos de faturas de clientes pela conta de pagamentos da sua empresa.",
    quickbooks:
      "Sincronize registros financeiros aprovados com seu fluxo contábil.",
    google:
      "Sincronize visitas confirmadas da Meetro e eventos do calendário.",
    microsoft:
      "Sincronize visitas confirmadas da Meetro e eventos do calendário.",
    back: "Voltar",
  }),
});

const providerCopyKey = Object.freeze({
  STRIPE_PAYMENTS: "stripe",
  QUICKBOOKS: "quickbooks",
  GOOGLE_CALENDAR: "google",
  MICROSOFT_OUTLOOK_CALENDAR: "microsoft",
});

const capabilityCopyKey = Object.freeze({
  [CONNECTED_SERVICE_CAPABILITY.PAYMENTS]: "payments",
  [CONNECTED_SERVICE_CAPABILITY.ACCOUNTING]: "accounting",
  [CONNECTED_SERVICE_CAPABILITY.CALENDAR]: "calendar",
});

const statusCopyKey = Object.freeze({
  [CONNECTED_SERVICE_STATUS.COMING_SOON]: "comingSoon",
  [CONNECTED_SERVICE_STATUS.NOT_CONNECTED]: "notConnected",
  [CONNECTED_SERVICE_STATUS.CONNECTED]: "connected",
  [CONNECTED_SERVICE_STATUS.NEEDS_ATTENTION]: "needsAttention",
  [CONNECTED_SERVICE_STATUS.UNAVAILABLE]: "unavailable",
});

const providerIcon = Object.freeze({
  STRIPE_PAYMENTS: "revenue",
  QUICKBOOKS: "businessTools",
  GOOGLE_CALENDAR: "schedule",
  MICROSOFT_OUTLOOK_CALENDAR: "schedule",
});

export default function ConnectedServices({ setPage }) {
  const language = useLanguage();
  const copy = COPY[language] || COPY.en;
  const providers = getConnectedServiceProviders();

  const backToProfile = () => {
    const hostedReturnPage = prepareHostedProfileReturn();
    setPage(hostedReturnPage || "profile");
  };

  return (
    <div
      className="app-page meetro-wide-page meetro-visual-page"
      style={styles.page}
      data-connected-services-foundation="true"
    >
      <div style={styles.content}>
        <button
          type="button"
          style={styles.back}
          onClick={backToProfile}
        >
          ← {copy.back}
        </button>

        <header style={styles.header}>
          <p style={styles.eyebrow}>{copy.eyebrow}</p>
          <h1 style={styles.title}>{copy.title}</h1>
          <p style={styles.description}>{copy.description}</p>
        </header>

        <section
          className="meetro-visual-surface"
          style={styles.preview}
          aria-label={copy.previewTitle}
        >
          <span style={styles.previewIcon}>
            <MeetroIcon name="businessTools" size={24} decorative />
          </span>
          <div style={styles.previewCopy}>
            <strong>{copy.previewTitle}</strong>
            <span>{copy.previewBody}</span>
          </div>
        </section>

        <p style={styles.boundary} data-connected-services-subscription-boundary>
          {copy.subscriptionBoundary}
        </p>

        <section
          style={styles.grid}
          aria-label={copy.title}
          data-connected-services-provider-grid
        >
          {providers.map((provider) => (
            <article
              key={provider.provider}
              className="meetro-visual-surface"
              style={styles.card}
              data-connected-service-provider={provider.provider}
              data-connected-service-status={provider.status}
              aria-disabled="true"
            >
              <div style={styles.cardTop}>
                <span style={styles.providerIcon}>
                  <MeetroIcon
                    name={providerIcon[provider.provider] || "businessTools"}
                    size={22}
                    decorative
                  />
                </span>

                <span style={styles.status}>
                  {copy[statusCopyKey[provider.status]]}
                </span>
              </div>

              <div style={styles.providerCopy}>
                <span style={styles.category}>
                  {copy[capabilityCopyKey[provider.capability]]}
                </span>
                <h2 style={styles.providerTitle}>{provider.name}</h2>
                <p style={styles.providerDescription}>
                  {copy[providerCopyKey[provider.provider]]}
                </p>
              </div>
            </article>
          ))}
        </section>
      </div>

      <BottomNav setPage={setPage} currentPage="connectedServices" />
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100dvh",
    background: "#FAFAFC",
    color: "#1F2937",
    padding:
      "max(20px, env(safe-area-inset-top, 0px)) max(18px, env(safe-area-inset-right, 0px)) calc(110px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
    boxSizing: "border-box",
    overflowX: "hidden",
  },
  content: {
    width: "min(1080px, 100%)",
    margin: "0 auto",
    display: "grid",
    gap: 18,
    minWidth: 0,
  },
  back: {
    justifySelf: "start",
    minHeight: 42,
    border: "1px solid #D1D5DB",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0B5D3B",
    fontWeight: 800,
    padding: "0 14px",
    cursor: "pointer",
  },
  header: {
    display: "grid",
    gap: 6,
  },
  eyebrow: {
    margin: 0,
    color: "#0B5D3B",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    color: "#063D26",
    fontSize: "clamp(30px, 5vw, 44px)",
    lineHeight: 1.05,
  },
  description: {
    margin: 0,
    maxWidth: 720,
    color: "#6B7280",
    fontSize: 16,
    lineHeight: 1.5,
  },
  preview: {
    display: "grid",
    gridTemplateColumns: "48px minmax(0, 1fr)",
    gap: 14,
    alignItems: "center",
    padding: 16,
    border: "1px solid #D1D5DB",
    borderRadius: 18,
    background: "#F7F6F2",
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "#E8F5EE",
    color: "#0B5D3B",
  },
  previewCopy: {
    display: "grid",
    gap: 4,
    minWidth: 0,
    lineHeight: 1.45,
  },
  boundary: {
    margin: 0,
    padding: "12px 14px",
    borderLeft: "4px solid #0B5D3B",
    background: "#F1FAF5",
    color: "#063D26",
    fontWeight: 800,
    lineHeight: 1.45,
  },
  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
    gap: 14,
  },
  card: {
    display: "grid",
    gap: 16,
    minWidth: 0,
    padding: 18,
    border: "1px solid #E5E7EB",
    borderRadius: 18,
    background: "#FFFFFF",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  providerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "#E8F5EE",
    color: "#0B5D3B",
  },
  status: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#F7F6F2",
    color: "#6B7280",
    fontSize: 12,
    fontWeight: 900,
  },
  providerCopy: {
    display: "grid",
    gap: 6,
    minWidth: 0,
  },
  category: {
    color: "#0B5D3B",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  providerTitle: {
    margin: 0,
    color: "#1F2937",
    fontSize: 20,
  },
  providerDescription: {
    margin: 0,
    color: "#6B7280",
    lineHeight: 1.5,
  },
};
