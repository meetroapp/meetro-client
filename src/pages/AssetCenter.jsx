import { useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import { getLanguage } from "../utils/language";
import {
  getAssetCenterModel,
  getAssetStatusLabel,
  sortAssetTimeline,
} from "../utils/assetCenterRegistry";

function AssetCenter({ setPage }) {
  const language = getLanguage();
  const isSpanish = language === "es";
  const model = useMemo(() => getAssetCenterModel(), []);
  const [selectedAssetId, setSelectedAssetId] = useState(
    model.assets[0]?.id || ""
  );
  const selectedAsset =
    model.assets.find((asset) => asset.id === selectedAssetId) ||
    model.assets[0] ||
    null;

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      <BusinessToolsPageHeader
        title="Asset Center"
        description={
          isSpanish
            ? "Consulta activos de clientes, hallazgos relacionados, historial de servicios, documentos y fotos."
            : "View customer assets, related findings, service history, documents, and photos."
        }
        categoryLabel={isSpanish ? "Operaciones del negocio" : "Business Operations"}
        onBack={() => setPage("businessCommandCenter")}
      />

      <div style={readOnlyCard}>
        <strong>{isSpanish ? "Solo lectura" : "Read-only continuity"}</strong>
        <span>
          {isSpanish
            ? "Asset Center muestra lo que se sabe por trabajos pasados. No crea trabajos, inventario ni flujos."
            : "Asset Center shows what is known from past work. It does not create work, inventory, or workflows."}
        </span>
      </div>

      <section style={section}>
        <h2 style={sectionTitle}>{isSpanish ? "Resumen de activos" : "Asset Overview"}</h2>
        <div style={assetGrid}>
          {model.assets.map((asset) => (
            <article
              key={asset.id}
              style={{
                ...assetCard,
                ...(asset.id === selectedAsset?.id ? selectedAssetCard : {}),
              }}
            >
              <div style={cardHeader}>
                <div>
                  <p style={fieldLabel}>{isSpanish ? "Activo" : "Asset Name"}</p>
                  <h3 style={assetName}>{asset.assetName}</h3>
                </div>
                <span style={statusBadge}>
                  {getAssetStatusLabel(asset.status)}
                </span>
              </div>

              <InfoGrid
                items={[
                  ["Type", asset.assetType],
                  ["Customer", asset.customerName],
                  ["Property", asset.propertyLabel],
                  ["Location", asset.locationLabel],
                  ["Last Service", asset.lastServiceLabel],
                  ["Last Activity", asset.lastActivityAt],
                ]}
              />

              <button
                type="button"
                style={viewBtn}
                onClick={() => setSelectedAssetId(asset.id)}
              >
                {isSpanish ? "Ver activo" : "View Asset"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section style={section}>
        <h2 style={sectionTitle}>
          {isSpanish ? "Actividad reciente" : "Recent Asset Activity"}
        </h2>
        <ol style={activityList}>
          {model.recentActivity.map((event) => (
            <li key={`${event.assetId}-${event.id}`} style={activityItem}>
              <span style={activityDate}>{event.date}</span>
              <span>
                <strong>{event.label}</strong>
                <small>{event.assetName} · {event.customerName}</small>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section style={section}>
        <h2 style={sectionTitle}>{isSpanish ? "Hallazgos recientes" : "Recent Findings"}</h2>
        <div style={findingsGrid}>
          {Object.values(model.findingsByAsset).map((group) => (
            <article key={group.assetId} style={miniCard}>
              <h3 style={miniTitle}>{group.assetName}</h3>
              <ul style={list}>
                {group.findings.map((finding) => (
                  <li key={finding.id}>{finding.name}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {selectedAsset && (
        <AssetDetail asset={selectedAsset} isSpanish={isSpanish} />
      )}

      <section style={section}>
        <h2 style={sectionTitle}>
          {isSpanish ? "Capacidades futuras" : "Future Capabilities"}
        </h2>
        <div style={placeholderGrid}>
          {model.futureCapabilities.map((capability) => (
            <div key={capability} style={placeholderCard}>
              <strong>{capability}</strong>
              <span>
                {isSpanish
                  ? "Disponible en una version futura."
                  : "Coming in a future release."}
              </span>
            </div>
          ))}
        </div>
      </section>

      <BottomNav setPage={setPage} currentPage="assetCenter" />
    </div>
  );
}

function AssetDetail({ asset, isSpanish }) {
  return (
    <section style={detailSection}>
      <div style={detailHeader}>
        <div>
          <p style={fieldLabel}>{isSpanish ? "Detalle" : "Asset Detail"}</p>
          <h2 style={detailTitle}>{asset.assetName}</h2>
        </div>
        <span style={statusBadge}>{getAssetStatusLabel(asset.status)}</span>
      </div>

      <div style={detailGrid}>
        <DetailPanel title={isSpanish ? "Resumen del activo" : "Asset Summary"}>
          <InfoGrid
            items={[
              ["Asset Type", asset.assetType],
              ["Asset Name", asset.assetName],
              ["Customer", asset.customerName],
              ["Property", asset.propertyLabel],
              ["Location", asset.locationLabel],
              ["Status", getAssetStatusLabel(asset.status)],
              ["Source Job", asset.sourceJobId],
              ["Last Activity", asset.lastActivityAt],
            ]}
          />
        </DetailPanel>

        <DetailPanel title={isSpanish ? "Linea de tiempo" : "Asset Timeline"}>
          <ol style={timelineList}>
            {sortAssetTimeline(asset.timeline).map((event) => (
              <li key={event.id} style={timelineItem}>
                <span style={timelineDate}>{event.date}</span>
                <span>{event.label}</span>
              </li>
            ))}
          </ol>
        </DetailPanel>

        <DetailPanel title={isSpanish ? "Hallazgos" : "Findings"}>
          <ul style={list}>
            {asset.findings.map((finding) => (
              <li key={finding.id}>
                <strong>{finding.name}</strong>
                <small>
                  {finding.date} · {finding.sourceEvaluationId} · {finding.relatedRecommendationId}
                </small>
              </li>
            ))}
          </ul>
        </DetailPanel>

        <DetailPanel title={isSpanish ? "Servicios recomendados" : "Recommended Services"}>
          <ul style={list}>
            {asset.recommendations.map((recommendation) => (
              <li key={recommendation.id}>
                <strong>{recommendation.serviceName}</strong>
                <small>
                  {recommendation.reason} · {recommendation.sourceFindingId} · {recommendation.status}
                </small>
              </li>
            ))}
          </ul>
        </DetailPanel>

        <DetailPanel title={isSpanish ? "Servicios completados" : "Completed Services"}>
          <ul style={list}>
            {asset.completedServices.map((service) => (
              <li key={service.id}>
                <strong>{service.serviceName}</strong>
                <small>
                  {service.completionDate} · {service.status} · {service.sourceJobId}
                </small>
              </li>
            ))}
          </ul>
        </DetailPanel>

        <DetailPanel title={isSpanish ? "Documentos" : "Documents"}>
          <ul style={chipList}>
            {asset.documents.map((document) => (
              <li key={document.id} style={chip}>
                {document.name}
              </li>
            ))}
          </ul>
        </DetailPanel>

        <DetailPanel title={isSpanish ? "Fotos" : "Photos"}>
          <ul style={chipList}>
            {asset.photos.map((photo) => (
              <li key={photo.id} style={photoChip}>
                <span style={photoIcon} />
                {photo.name}
              </li>
            ))}
          </ul>
        </DetailPanel>
      </div>
    </section>
  );
}

function DetailPanel({ title, children }) {
  return (
    <article style={detailPanel}>
      <h3 style={panelTitle}>{title}</h3>
      {children}
    </article>
  );
}

function InfoGrid({ items }) {
  return (
    <dl style={infoGrid}>
      {items.map(([label, value]) => (
        <div key={`${label}-${value}`} style={infoItem}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const page = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: "100vh",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 50px) max(18px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 96px) max(18px, env(safe-area-inset-left, 0px))",
  overflowY: "auto",
  overflowX: "hidden",
  WebkitOverflowScrolling: "touch",
  boxSizing: "border-box",
  background: "#f8fafc",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
};

const header = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
  marginBottom: "14px",
};

const backBtn = {
  width: "auto",
  minWidth: "42px",
  height: "42px",
  padding: "0 12px",
  borderRadius: "14px",
  border: "1px solid rgba(148,163,184,0.35)",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "22px",
  fontWeight: "900",
  cursor: "pointer",
  flexShrink: 0,
};

const eyebrow = {
  margin: "0 0 5px",
  color: "#0f766e",
  fontSize: "11px",
  fontWeight: "950",
  textTransform: "uppercase",
};

const title = {
  margin: 0,
  fontSize: "23px",
  fontWeight: "950",
  color: "#0f172a",
  letterSpacing: 0,
};

const subtitle = {
  margin: "7px 0 0",
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const readOnlyCard = {
  display: "grid",
  gap: "4px",
  padding: "13px",
  borderRadius: "14px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontSize: "12px",
  lineHeight: 1.45,
  marginBottom: "12px",
};

const section = {
  display: "grid",
  gap: "10px",
  marginBottom: "16px",
};

const sectionTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "17px",
  fontWeight: "950",
};

const assetGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))",
  gap: "12px",
};

const assetCard = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "grid",
  gap: "12px",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
};

const selectedAssetCard = {
  border: "1px solid rgba(15,118,110,0.55)",
  boxShadow: "0 10px 24px rgba(15,118,110,0.12)",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "10px",
};

const fieldLabel = {
  margin: "0 0 6px",
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const assetName = {
  margin: 0,
  color: "#0f172a",
  fontSize: "17px",
  fontWeight: "950",
};

const statusBadge = {
  maxWidth: "48%",
  overflowWrap: "anywhere",
  padding: "5px 7px",
  borderRadius: "999px",
  background: "#ecfdf5",
  color: "#047857",
  fontSize: "10px",
  fontWeight: "900",
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 112px), 1fr))",
  gap: "8px",
  margin: 0,
};

const infoItem = {
  display: "grid",
  gap: "4px",
  padding: "9px",
  borderRadius: "12px",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "11px",
};

const viewBtn = {
  border: "0",
  borderRadius: "12px",
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px",
  fontSize: "12px",
  fontWeight: "950",
  cursor: "pointer",
};

const activityList = {
  display: "grid",
  gap: "8px",
  margin: 0,
  padding: 0,
  listStyle: "none",
};

const activityItem = {
  display: "flex",
  gap: "10px",
  alignItems: "flex-start",
  padding: "11px",
  borderRadius: "14px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#334155",
  fontSize: "12px",
};

const activityDate = {
  flexShrink: 0,
  color: "#0f766e",
  fontWeight: "950",
};

const findingsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: "10px",
};

const miniCard = {
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
};

const miniTitle = {
  margin: "0 0 8px",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: "950",
};

const detailSection = {
  display: "grid",
  gap: "12px",
  marginBottom: "16px",
};

const detailHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "10px",
};

const detailTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "19px",
  fontWeight: "950",
};

const detailGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: "12px",
};

const detailPanel = {
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
};

const panelTitle = {
  margin: "0 0 10px",
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "950",
};

const timelineList = {
  display: "grid",
  gap: "8px",
  margin: 0,
  padding: 0,
  listStyle: "none",
};

const timelineItem = {
  display: "flex",
  gap: "9px",
  color: "#334155",
  fontSize: "12px",
  fontWeight: "850",
};

const timelineDate = {
  color: "#0f766e",
  fontWeight: "950",
  flexShrink: 0,
};

const list = {
  display: "grid",
  gap: "8px",
  margin: 0,
  paddingLeft: "18px",
  color: "#334155",
  fontSize: "12px",
  lineHeight: 1.5,
};

const chipList = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  margin: 0,
  padding: 0,
  listStyle: "none",
};

const chip = {
  padding: "7px 9px",
  borderRadius: "999px",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "11px",
  fontWeight: "900",
};

const photoChip = {
  ...chip,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "#ecfdf5",
  color: "#047857",
};

const photoIcon = {
  width: "10px",
  height: "10px",
  borderRadius: "3px",
  background: "#10b981",
};

const placeholderGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: "10px",
};

const placeholderCard = {
  display: "grid",
  gap: "5px",
  padding: "12px",
  borderRadius: "14px",
  border: "1px dashed #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontSize: "12px",
};

export default AssetCenter;
