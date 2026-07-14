import { useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import { getLanguage, t } from "../utils/language";
import {
  BUSINESS_TOOL_STATUS,
  getBusinessToolById,
  getBusinessToolStatusLabel,
  getBusinessToolStatusTone,
} from "../utils/businessToolsRegistry";

const BUSINESS_TOOLS_EXPANDED_KEY = "meetro.businessTools.expandedSections";

function readBusinessToolsExpandedSections() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(BUSINESS_TOOLS_EXPANDED_KEY) || "{}"
    );

    return {
      businessRecords: Boolean(parsed.businessRecords),
      growth: Boolean(parsed.growth),
      administration: Boolean(parsed.administration),
    };
  } catch {
    return {
      businessRecords: false,
      growth: false,
      administration: false,
    };
  }
}

function BusinessCommandCenter({ setPage }) {
  const language = getLanguage();
  const isSpanish = language === "es";
  const [activeTool, setActiveTool] = useState(
    localStorage.getItem("meetroCommandTool") || "businessProfile"
  );
  const [toolNotice, setToolNotice] = useState("");
  const [futureTool, setFutureTool] = useState(null);
  const [expandedSections, setExpandedSections] = useState(() =>
    readBusinessToolsExpandedSections()
  );

  const statusLabel = (toolId, fallbackStatus = BUSINESS_TOOL_STATUS.READY) =>
    getBusinessToolStatusLabel(
      getBusinessToolById(toolId)?.status || fallbackStatus,
      language
    );

  const toolsById = {
    businessProfile: {
      id: "businessProfile",
      icon: "businessProfile",
      title: t("businessProfile"),
      desc: isSpanish
        ? "Administra nombre, logo, descripcion, categoria y como te ven los clientes."
        : "Manage your name, logo, description, category, and how customers see you.",
      badge: statusLabel("businessProfile"),
    },
    portfolio: {
      id: "portfolio",
      icon: "portfolio",
      title: isSpanish ? "Portafolio" : "Portfolio",
      desc: isSpanish
        ? "Revisa fotos, trabajos mostrados y la carpeta publica de tu negocio."
        : "Review photos, showcased work, and your public business portfolio.",
      badge: statusLabel("portfolio"),
    },
    availability: {
      id: "availability",
      icon: "availability",
      title: isSpanish ? "Disponibilidad" : "Availability",
      desc: isSpanish
        ? "Actualiza disponibilidad, zonas de servicio y preparacion para emergencias."
        : "Update availability, service areas, and emergency readiness.",
      badge: statusLabel("availability"),
    },
    quickQuote: {
      id: "quickQuote",
      icon: "quickQuote",
      title: isSpanish ? "Crear cotizacion rapida" : "Quick Quote Builder",
      desc: isSpanish
        ? "Crea una cotizacion o propuesta desde Herramientas del negocio."
        : "Create a quote or proposal from Business Tools.",
      badge: statusLabel("quickQuote"),
      featured: true,
    },
    quickInvoice: {
      id: "quickInvoice",
      icon: "quickInvoice",
      title: isSpanish ? "Crear factura rapida" : "Quick Invoice Builder",
      desc: isSpanish
        ? "Crea una factura o recibo sin abrir un trabajo activo."
        : "Create an invoice or receipt without opening an active job.",
      badge: statusLabel("quickInvoice"),
      featured: true,
    },
    customers: {
      id: "customers",
      icon: "customerRelationships",
      title: isSpanish ? "Relaciones con clientes" : "Customer Relationships",
      desc: isSpanish
        ? "Consulta personas, comunicacion e historial de relacion."
        : "View people, communication, and relationship history.",
      badge: statusLabel("customers"),
    },
    serviceEvaluations: {
      id: "serviceEvaluations",
      icon: "serviceTypes",
      title: isSpanish ? "Tipos de servicio y evaluaciones" : "Service Types & Evaluations",
      desc: isSpanish
        ? "Consulta servicios, contextos y requisitos de documentacion de evaluacion."
        : "View services, contexts, and evaluation documentation requirements.",
      badge: statusLabel("serviceEvaluations"),
    },
    materialsLibrary: {
      id: "materialsLibrary",
      icon: "materialsLibrary",
      title: isSpanish ? "Biblioteca de materiales" : "Materials Library",
      desc: isSpanish
        ? "Consulta materiales comunes por tipo de servicio."
        : "View common materials by service type.",
      badge: statusLabel("materialsLibrary"),
    },
    pricingLibrary: {
      id: "pricingLibrary",
      icon: "priceBook",
      title: isSpanish ? "Libro de precios / Biblioteca de precios" : "Price Book / Pricing Library",
      desc: isSpanish
        ? "Consulta guias de precios, mano de obra y supuestos de estimacion."
        : "View pricing guidance, labor assumptions, and estimate notes.",
      badge: statusLabel("pricingLibrary"),
    },
    contractTemplates: {
      id: "contractTemplates",
      icon: "contractTemplates",
      title: isSpanish ? "Plantillas de contrato" : "Contract Templates",
      desc: isSpanish
        ? "Consulta tipos de acuerdos y secciones incluidas."
        : "View agreement types and included sections.",
      badge: statusLabel("contractTemplates"),
    },
    assetCenter: {
      id: "assetCenter",
      icon: "assetCenter",
      title: "Asset Center",
      desc: isSpanish
        ? "Consulta continuidad, historial y documentos de activos."
        : "View asset continuity, history, and documents.",
      badge: statusLabel("assetCenter"),
    },
    hiringCenter: {
      id: "hiringCenter",
      icon: "hiringCenter",
      title: isSpanish ? "Centro de contratación" : "Hiring Center",
      desc: t("hiringOperationsUnavailableText"),
      badge: statusLabel("hiringCenter", BUSINESS_TOOL_STATUS.READ_ONLY),
    },
    teamMembers: {
      id: "teamMembers",
      icon: "hiringCenter",
      title: t("teamMembers"),
      desc: t("teamMembersUnavailableText"),
      badge: statusLabel("teamMembers", BUSINESS_TOOL_STATUS.READ_ONLY),
    },
    reportsCenter: {
      id: "reportsCenter",
      icon: "reportsCenter",
      title: isSpanish ? "Centro de reportes" : "Reports Center",
      desc: isSpanish
        ? "Consulta tipos de reportes disponibles y futuros."
        : "View available and future report types.",
      badge: statusLabel("reportsCenter"),
    },
    businessIntelligence: {
      id: "businessIntelligence",
      icon: "businessIntelligence",
      title: isSpanish ? "Inteligencia del negocio" : "Business Intelligence",
      desc: isSpanish
        ? "Consulta categorias futuras de insights del negocio."
        : "View future business insight categories.",
      badge: statusLabel("businessIntelligence"),
    },
    reviews: {
      id: "reviews",
      icon: "reviews",
      title: isSpanish ? "Resenas" : "Reviews",
      desc: isSpanish
        ? "Revisa senales de reputacion y preparate para futuras herramientas de resenas."
        : "Review reputation signals and prepare for future review tools.",
      badge: statusLabel("reviews", BUSINESS_TOOL_STATUS.COMING_SOON),
    },
    subscription: {
      id: "subscription",
      icon: "subscription",
      title: isSpanish ? "Plan y suscripcion" : "Plan & Subscription",
      desc: isSpanish
        ? "Revisa opciones futuras de Meetro Pro y soporte del negocio."
        : "Review future Meetro Pro options and business support.",
      badge: statusLabel("subscription", BUSINESS_TOOL_STATUS.COMING_SOON),
    },
    complianceCenter: {
      id: "complianceCenter",
      icon: "complianceCenter",
      title: isSpanish ? "Centro de cumplimiento" : "Compliance Center",
      desc: isSpanish
        ? "Consulta obligaciones, evidencia y requisitos de cierre."
        : "View obligations, evidence, and closure requirements.",
      badge: statusLabel("complianceCenter"),
    },
    permitCenter: {
      id: "permitCenter",
      icon: "permitCenter",
      title: isSpanish ? "Centro de permisos" : "Permit Center",
      desc: isSpanish
        ? "Consulta permisos, inspecciones y dependencias de cierre."
        : "View permits, inspections, and closure dependencies.",
      badge: statusLabel("permitCenter"),
    },
    legal: {
      id: "legal",
      icon: "legal",
      title: t("legal"),
      desc: t("legalPurpose"),
      badge: statusLabel("legal"),
    },
    aiHelp: {
      id: "aiHelp",
      icon: "aiHelp",
      title: isSpanish ? "Preguntar a Meetro" : "Ask Meetro",
      desc: isSpanish
        ? "Configura preferencias del asistente y revisa soporte IA seguro."
        : "Manage assistant preferences and review safe AI support.",
      badge: statusLabel("aiHelp"),
    },
    knowledgeBase: {
      id: "knowledgeBase",
      icon: "knowledgeBase",
      title: isSpanish ? "Base de conocimiento" : "Knowledge Base",
      desc: isSpanish
        ? "Lugar futuro para guias, ayuda y explicaciones del negocio."
        : "Future home for business guides, help, and explanations.",
      badge: statusLabel("knowledgeBase", BUSINESS_TOOL_STATUS.COMING_SOON),
    },
    findingsLibrary: {
      id: "findingsLibrary",
      icon: "findingsLibrary",
      title: isSpanish ? "Biblioteca de hallazgos" : "Findings Library",
      desc: isSpanish
        ? "Lugar futuro para condiciones, riesgos y servicios recomendados."
        : "Future home for conditions, risks, and recommended services.",
      badge: statusLabel("findingsLibrary", BUSINESS_TOOL_STATUS.COMING_SOON),
    },
    professionalSetup: {
      id: "professionalSetup",
      icon: "professionalSetup",
      title: t("professionalSetup"),
      desc: isSpanish
        ? "Revisa o actualiza la configuración inicial de tu negocio."
        : "Review or update your initial business setup.",
      badge: statusLabel("professionalSetup"),
    },
    settings: {
      id: "settings",
      icon: "settings",
      title: isSpanish ? "Configuracion" : "Settings",
      desc: isSpanish
        ? "Administra idioma, cuenta, modo profesional y preferencias."
        : "Manage language, account, professional mode, and preferences.",
      badge: statusLabel("settings"),
    },
  };

  const createToolGroup = ({ id, title, desc, toolIds, collapsible = false }) => ({
    id,
    title,
    desc,
    collapsible,
    tools: toolIds.map((toolId) => toolsById[toolId]).filter(Boolean),
  });

  const toolGroups = [
    createToolGroup({
      id: "dailyTools",
      title: t("businessToolsDailyTools"),
      desc: t("businessToolsDailyToolsSubtitle"),
      toolIds: [
        "businessProfile",
        "portfolio",
        "availability",
        "quickQuote",
        "quickInvoice",
        "customers",
      ],
    }),
    createToolGroup({
      id: "businessRecords",
      title: t("businessToolsBusinessRecords"),
      desc: t("businessToolsBusinessRecordsSubtitle"),
      collapsible: true,
      toolIds: [
        "serviceEvaluations",
        "materialsLibrary",
        "pricingLibrary",
        "contractTemplates",
        "assetCenter",
      ],
    }),
    createToolGroup({
      id: "growth",
      title: t("businessToolsGrowth"),
      desc: t("businessToolsGrowthSubtitle"),
      collapsible: true,
      toolIds: [
        "hiringCenter",
        "teamMembers",
        "reportsCenter",
        "businessIntelligence",
        "reviews",
        "subscription",
      ],
    }),
    createToolGroup({
      id: "administration",
      title: t("businessToolsAdministration"),
      desc: t("businessToolsAdministrationSubtitle"),
      collapsible: true,
      toolIds: [
        "complianceCenter",
        "permitCenter",
        "legal",
        "aiHelp",
        "knowledgeBase",
        "findingsLibrary",
        "professionalSetup",
        "settings",
      ],
    }),
  ];

  const selectTool = (toolId) => {
    localStorage.setItem("meetroCommandTool", toolId);
    setActiveTool(toolId);
    setToolNotice("");
  };

  const toggleSection = (sectionId) => {
    setExpandedSections((current) => {
      const next = {
        ...current,
        [sectionId]: !current[sectionId],
      };

      localStorage.setItem(BUSINESS_TOOLS_EXPANDED_KEY, JSON.stringify(next));
      return next;
    });
  };

  const openFutureTool = (toolId) => {
    const tool = getBusinessToolById(toolId);
    setFutureTool({
      id: toolId,
      title: tool?.title || toolId,
      status: tool?.status || BUSINESS_TOOL_STATUS.COMING_SOON,
      description:
        {
          findingsLibrary: isSpanish
            ? "Administrara condiciones, riesgos, hallazgos y servicios recomendados cuando la administracion del motor de evaluacion este lista."
            : "Will manage conditions, risks, findings, and recommended services when Evaluation Engine administration is ready.",
          knowledgeBase: isSpanish
            ? "Reunira guias de negocio, explicaciones de herramientas y ayuda contextual para profesionales."
            : "Will collect business guides, tool explanations, and contextual help for professionals.",
          reviews: isSpanish
            ? "Mostrara resenas, senales de reputacion y herramientas futuras para responder o analizar comentarios."
            : "Will show reviews, reputation signals, and future tools for responding to or analyzing feedback.",
          subscription: isSpanish
            ? "Mostrara opciones futuras de plan, funciones Pro y soporte del negocio cuando esten listas."
            : "Will show future plan options, Pro features, and business support when ready.",
        }[toolId] ||
        (isSpanish
          ? "Esta herramienta esta planificada para una version futura."
          : "This tool is planned for a future version."),
    });
    setToolNotice("");
  };

  const openTool = (toolId) => {
    selectTool(toolId);
    setFutureTool(null);

    if (toolId === "businessProfile") {
      localStorage.setItem("meetroSharedPageReturn", "businessCommandCenter");
      setPage("contractorProfile");
      return;
    }

    if (toolId === "availability") {
      setPage("businessAvailability");
      return;
    }

    if (toolId === "professionalSetup") {
      localStorage.setItem("meetroProfessionalOnboardingReturnPage", "businessCommandCenter");
      setPage("professionalOnboarding");
      return;
    }

    if (toolId === "portfolio") {
      localStorage.setItem("meetroSharedPageReturn", "businessCommandCenter");
      setPage("projectGallery");
      return;
    }

    if (toolId === "hiringCenter") {
      setPage("hiringCenter");
      return;
    }

    if (toolId === "teamMembers") {
      setPage("teamMembers");
      return;
    }

    if (toolId === "assetCenter") {
      setPage("assetCenter");
      return;
    }

    if (toolId === "customers") {
      setPage("customerRelationshipsCenter");
      return;
    }

    if (toolId === "serviceEvaluations") {
      setPage("serviceTypesEvaluations");
      return;
    }

    if (toolId === "materialsLibrary") {
      setPage("materialsLibrary");
      return;
    }

    if (toolId === "pricingLibrary") {
      setPage("pricingLibrary");
      return;
    }

    if (toolId === "quickQuote") {
      localStorage.removeItem("selectedQuoteRequest");
      localStorage.removeItem("selectedQuoteForEdit");
      localStorage.setItem("quoteBuilderSource", "business_tools_quick_quote");
      localStorage.setItem("quoteBuilderReturnPage", "businessCommandCenter");
      setPage("quoteBuilder");
      return;
    }

    if (toolId === "quickInvoice") {
      localStorage.setItem("invoiceBuilderSource", "business_tools_quick_invoice");
      localStorage.setItem("invoiceBuilderReturnPage", "businessCommandCenter");
      setPage("invoiceBuilder");
      return;
    }

    if (toolId === "contractTemplates") {
      setPage("contractTemplates");
      return;
    }

    if (toolId === "reportsCenter") {
      setPage("reportsCenter");
      return;
    }

    if (toolId === "permitCenter") {
      setPage("permitCenter");
      return;
    }

    if (toolId === "complianceCenter") {
      setPage("complianceCenter");
      return;
    }

    if (toolId === "businessIntelligence") {
      setPage("businessIntelligence");
      return;
    }

    if (toolId === "settings") {
      localStorage.setItem("meetroSharedPageReturn", "businessCommandCenter");
      localStorage.setItem("activeAccountMode", "business");
      localStorage.setItem("meetroPreferredAccountMode", "business");
      setPage("profile");
      return;
    }

    if (toolId === "legal") {
      localStorage.setItem("meetroLegalReturnPage", "businessCommandCenter");
      localStorage.setItem("meetroSelectedLegalDocument", "terms");
      setPage("legal");
      return;
    }

    if (toolId === "aiHelp") {
      localStorage.setItem("meetroProfileOpenSection", "ai");
      localStorage.setItem("meetroSharedPageReturn", "businessCommandCenter");
      localStorage.setItem("activeAccountMode", "business");
      localStorage.setItem("meetroPreferredAccountMode", "business");
      setPage("profile");
      return;
    }

    if (
      ["reviews", "subscription", "findingsLibrary", "knowledgeBase"].includes(
        toolId
      )
    ) {
      openFutureTool(toolId);
      return;
    }
  };

  return (
    <div className="app-page meetro-responsive-page meetro-visual-page" style={page}>
      <div className="meetro-visual-hero" style={header}>
        <button style={backBtn} onClick={() => setPage("businessDashboard")}>
          ←
        </button>

        <div>
          <h1 style={title}>{t("businessCommandCenter")}</h1>
          <p style={subtitle}>{t("commandCenterSubtitle")}</p>
        </div>
      </div>

      <div style={sectionStack}>
        {toolGroups.map((group) => {
          const isExpanded =
            !group.collapsible || Boolean(expandedSections[group.id]);

          return (
            <section key={group.id} className="meetro-visual-surface" style={toolGroupSection}>
              {group.collapsible ? (
                <button
                  type="button"
                  style={accordionHeaderButton}
                  onClick={() => toggleSection(group.id)}
                  aria-expanded={isExpanded}
                >
                  <span style={accordionHeaderCopy}>
                    <span style={groupTitle}>{group.title}</span>
                    <span style={groupDesc}>{group.desc}</span>
                  </span>
                  <span style={accordionMeta}>
                    <span style={accordionCount}>
                      {group.tools.length}
                    </span>
                    <span
                      aria-hidden="true"
                      style={{
                        ...accordionChevron,
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    >
                      ›
                    </span>
                  </span>
                </button>
              ) : (
                <div style={groupHeader}>
                  <h2 style={groupTitle}>{group.title}</h2>
                  <p style={groupDesc}>{group.desc}</p>
                </div>
              )}

              {isExpanded && (
                <div className="meetro-responsive-grid meetro-grid-3" style={toolsGrid}>
                  {group.tools.map((tool) => (
                    <button
                      type="button"
                      key={tool.id}
                      className={activeTool === tool.id ? "meetro-selected-card" : ""}
                      style={{
                        ...toolCard,
                        ...(tool.featured ? featuredToolCard : {}),
                        ...(tool.id === "aiHelp" ? aiToolCard : {}),
                        ...(activeTool === tool.id ? activeToolCard : {}),
                      }}
                      onClick={() => openTool(tool.id)}
                    >
                      <div style={toolTop}>
                        <span style={toolIcon}>
                          <MeetroIcon name={tool.icon} size={22} decorative />
                        </span>
                        <span style={toolMeta}>
                          <span
                            style={{
                              ...toolBadge,
                              ...toolBadgeTone(
                                getBusinessToolStatusTone(
                                  getBusinessToolById(tool.id)?.status
                                )
                              ),
                            }}
                          >
                            {tool.badge}
                          </span>
                          <span aria-hidden="true" style={toolChevron}>
                            &gt;
                          </span>
                        </span>
                      </div>

                      <h3 style={toolTitle}>{tool.title}</h3>
                      <p style={toolDesc}>{tool.desc}</p>
                      {activeTool === tool.id && (
                        <span className="meetro-selected-badge">
                          {isSpanish ? "Seleccionado" : "Selected"}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {toolNotice && (
        <div style={noticeCard}>
          <strong>{t("businessCommandCenter")}</strong>
          <p>{toolNotice}</p>
        </div>
      )}

      {futureTool && (
        <div style={sheetOverlay} onClick={() => setFutureTool(null)}>
          <div className="meetro-visual-surface" style={futureSheet} onClick={(event) => event.stopPropagation()}>
            <div style={sheetHandle}></div>
            <div style={sheetHeader}>
              <div>
                <p style={sheetEyebrow}>
                  {getBusinessToolStatusLabel(futureTool.status, language)}
                </p>
                <h2 style={sheetTitle}>{futureTool.title}</h2>
              </div>
              <button
                type="button"
                style={sheetClose}
                onClick={() => setFutureTool(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <p style={sheetBody}>{futureTool.description}</p>
            <div style={futureDetailCard}>
              <strong>
                {isSpanish ? "Estado actual" : "Current status"}
              </strong>
              <span>
                {isSpanish
                  ? "Esta tarjeta no modifica datos ni inicia flujos de trabajo. Esta herramienta esta planificada para una version futura."
                  : "This card does not modify data or start job workflows. This tool is planned for a future version."}
              </span>
            </div>
            <button
              type="button"
              style={sheetPrimaryButton}
              onClick={() => setFutureTool(null)}
            >
              {isSpanish ? "Entendido" : "Got it"}
            </button>
          </div>
        </div>
      )}

      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

function toolBadgeTone(tone) {
  if (tone === "ready") {
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid rgba(22,101,52,0.14)",
    };
  }
  if (tone === "readonly") {
    return {
      background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
      color: "var(--meetro-color-forest, #1f4d34)",
      border: "1px solid rgba(31,77,52,0.14)",
    };
  }
  if (tone === "preview") {
    return {
      background: "#fff7ed",
      color: "#9a3412",
      border: "1px solid rgba(154,52,18,0.14)",
    };
  }

  return {
    background: "#f1f5f9",
    color: "#475569",
    border: "1px solid rgba(71,85,105,0.14)",
  };
}

const page = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: "100vh",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 50px) max(16px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 88px) max(16px, env(safe-area-inset-left, 0px))",
  overflowX: "hidden",
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  boxSizing: "border-box",
  background:
    "radial-gradient(circle at top, rgba(31,77,52,0.12), transparent 34%), var(--meetro-surface-warm, #fbf6ed)",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
};

const header = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "flex",
  gap: "16px",
  alignItems: "flex-start",
  marginBottom: "24px",
  boxSizing: "border-box",
  padding: "clamp(18px, 4vw, 30px)",
  borderRadius: "30px",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  background:
    "linear-gradient(135deg, var(--meetro-surface-paper, rgba(255,253,248,0.94)), var(--meetro-surface-sage, rgba(238,244,234,0.9)))",
  boxShadow: "var(--meetro-shadow-lifted, 0 24px 70px rgba(49,35,20,0.14))",
};

const backBtn = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "22px",
  fontWeight: "900",
  cursor: "pointer",
};

const title = {
  margin: 0,
  fontSize: "23px",
  fontWeight: "950",
  color: "var(--meetro-color-forest-deep, #14351f)",
  letterSpacing: "-0.8px",
};

const subtitle = {
  margin: "7px 0 0",
  fontSize: "14px",
  lineHeight: 1.45,
  color: "var(--meetro-color-muted, #65705f)",
  overflowWrap: "anywhere",
};

const noticeCard = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  marginTop: "12px",
  padding: "13px",
  borderRadius: "18px",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "750",
};

const sectionStack = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gap: "18px",
  boxSizing: "border-box",
};

const toolGroupSection = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gap: "12px",
  padding: "16px",
  borderRadius: "24px",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  boxShadow: "var(--meetro-shadow-soft, 0 16px 38px rgba(49,35,20,0.08))",
  boxSizing: "border-box",
};

const groupHeader = {
  minWidth: 0,
  display: "grid",
  gap: "4px",
};

const groupTitle = {
  margin: 0,
  fontSize: "15px",
  fontWeight: "950",
  color: "var(--meetro-color-forest-deep, #14351f)",
};

const groupDesc = {
  margin: 0,
  fontSize: "12px",
  lineHeight: 1.4,
  color: "var(--meetro-color-muted, #65705f)",
  fontWeight: "750",
  overflowWrap: "anywhere",
};

const accordionHeaderButton = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  borderRadius: "18px",
  padding: "15px",
  background:
    "linear-gradient(135deg, var(--meetro-surface-paper, rgba(255,253,248,0.94)), var(--meetro-surface-warm, rgba(251,246,237,0.92)))",
  color: "var(--meetro-color-forest-deep, #14351f)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  textAlign: "left",
  fontFamily: "inherit",
  boxShadow: "var(--meetro-shadow-soft, 0 16px 38px rgba(49,35,20,0.08))",
  cursor: "pointer",
};

const accordionHeaderCopy = {
  minWidth: 0,
  display: "grid",
  gap: "4px",
};

const accordionMeta = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  flexShrink: 0,
};

const accordionCount = {
  minWidth: "28px",
  height: "28px",
  padding: "0 8px",
  borderRadius: "999px",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "12px",
  fontWeight: "950",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

const accordionChevron = {
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "24px",
  lineHeight: 1,
  fontWeight: "950",
  transition: "transform 160ms ease",
};

const toolsGrid = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 148px), 1fr))",
  gap: "12px",
};

const toolCard = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  textAlign: "left",
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  boxShadow: "var(--meetro-shadow-soft, 0 16px 38px rgba(49,35,20,0.08))",
  color: "var(--meetro-color-ink, #172317)",
  fontFamily: "inherit",
  cursor: "pointer",
};

const activeToolCard = {
  border: "1px solid rgba(31,77,52,0.32)",
  boxShadow: "0 14px 30px rgba(49,35,20,0.12)",
  background:
    "linear-gradient(180deg, var(--meetro-surface-paper, rgba(255,253,248,0.98)), var(--meetro-surface-sage, rgba(238,244,234,0.95)))",
};

const aiToolCard = {
  border: "1px solid rgba(183,121,31,0.28)",
  background:
    "linear-gradient(180deg, var(--meetro-surface-paper, rgba(255,253,248,0.98)), var(--meetro-surface-warm, rgba(251,246,237,0.96)))",
  boxShadow: "0 10px 26px rgba(183,121,31,0.10)",
};

const featuredToolCard = {
  border: "1px solid rgba(31,77,52,0.24)",
  background:
    "linear-gradient(180deg, var(--meetro-surface-paper, rgba(255,253,248,0.98)), var(--meetro-surface-sage, rgba(238,244,234,0.96)))",
  boxShadow: "0 10px 24px rgba(31,77,52,0.10)",
};

const toolTop = {
  minWidth: 0,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
};

const toolIcon = {
  width: "30px",
  height: "30px",
  borderRadius: "9px",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--meetro-color-forest-deep, #14351f)",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  fontSize: "16px",
  fontWeight: "900",
};

const toolMeta = {
  minWidth: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  flexShrink: 1,
};

const toolBadge = {
  maxWidth: "100%",
  padding: "5px 8px",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: "900",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const toolChevron = {
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: "18px",
  fontWeight: "800",
  lineHeight: 1,
};

const toolTitle = {
  margin: "10px 0 5px",
  fontSize: "15px",
  fontWeight: "950",
  color: "var(--meetro-color-forest-deep, #14351f)",
  overflowWrap: "anywhere",
};

const toolDesc = {
  margin: 0,
  fontSize: "11.5px",
  lineHeight: 1.4,
  color: "var(--meetro-color-muted, #65705f)",
  overflowWrap: "anywhere",
};

const sheetOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 14000,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding:
    "16px max(14px, env(safe-area-inset-right, 0px)) calc(18px + env(safe-area-inset-bottom, 0px)) max(14px, env(safe-area-inset-left, 0px))",
  background: "rgba(15,23,42,0.38)",
  boxSizing: "border-box",
};

const futureSheet = {
  width: "100%",
  maxWidth: "520px",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.98))",
  borderRadius: "28px 28px 22px 22px",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  boxShadow: "var(--meetro-shadow-lifted, 0 24px 70px rgba(49,35,20,0.14))",
  padding: "10px 16px 18px",
  boxSizing: "border-box",
};

const sheetHandle = {
  width: "44px",
  height: "5px",
  borderRadius: "999px",
  background: "rgba(78,68,55,0.22)",
  margin: "0 auto 14px",
};

const sheetHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "12px",
};

const sheetEyebrow = {
  margin: "0 0 5px",
  color: "var(--meetro-color-coffee, #4a3428)",
  fontSize: "11px",
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const sheetTitle = {
  margin: 0,
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontSize: "21px",
  lineHeight: 1.15,
};

const sheetClose = {
  width: "38px",
  height: "38px",
  border: "1px solid rgba(148,163,184,0.42)",
  borderRadius: "50%",
  background: "#ffffff",
  color: "#334155",
  fontSize: "24px",
  fontWeight: "900",
  cursor: "pointer",
  flexShrink: 0,
};

const sheetBody = {
  margin: "0 0 12px",
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: "14px",
  lineHeight: 1.5,
  fontWeight: "750",
};

const futureDetailCard = {
  display: "grid",
  gap: "5px",
  padding: "12px",
  borderRadius: "16px",
  background: "var(--meetro-surface-warm, rgba(251,246,237,0.92))",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "750",
};

const sheetPrimaryButton = {
  width: "100%",
  minHeight: "48px",
  marginTop: "12px",
  border: 0,
  borderRadius: "16px",
  background: "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "950",
  cursor: "pointer",
};

export default BusinessCommandCenter;
