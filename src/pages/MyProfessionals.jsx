import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import useLanguage from "../hooks/useLanguage";
import {
  listHomeownerProfessionals,
  removeHomeownerSavedProfessional,
} from "../utils/homeownerProfessionalsApi";
import {
  clearAssistantRequestDraft,
} from "../utils/assistantRequestDraft";
import {
  buildExistingCustomerRequestRoute,
} from "../utils/existingCustomerRequestRoute";

const ACTION_COPY = {
  en: {
    viewProfile: "View Profile",
    requestNewWork: "Request New Work",
    save: "Save Professional",
    saved: "Saved",
    remove: "Remove Saved",
    saving: "Saving…",
    removing: "Removing…",
    failed:
      "The Saved Professional change could not be completed.",
  },
  es: {
    viewProfile: "Ver perfil",
    requestNewWork: "Solicitar nuevo trabajo",
    save: "Guardar profesional",
    saved: "Guardado",
    remove: "Quitar de guardados",
    saving: "Guardando…",
    removing: "Quitando…",
    failed:
      "No se pudo completar el cambio del profesional guardado.",
  },
  fr: {
    viewProfile: "Voir le profil",
    requestNewWork: "Demander un nouveau travail",
    save: "Enregistrer",
    saved: "Enregistré",
    remove: "Retirer",
    saving: "Enregistrement…",
    removing: "Suppression…",
    failed:
      "La modification du professionnel enregistré n’a pas pu être effectuée.",
  },
  "pt-BR": {
    viewProfile: "Ver perfil",
    requestNewWork: "Solicitar novo trabalho",
    save: "Salvar profissional",
    saved: "Salvo",
    remove: "Remover salvo",
    saving: "Salvando…",
    removing: "Removendo…",
    failed:
      "Não foi possível concluir a alteração do profissional salvo.",
  },
};

const COPY = {
  en: {
    eyebrow: "Your relationships",
    title: "My Professionals",
    subtitle:
      "Businesses you have worked with through Meetro and professionals you saved for later.",
    workedWith: "Worked With",
    workedWithHelp:
      "Businesses you previously hired through Meetro.",
    saved: "Saved",
    savedHelp:
      "Professionals you bookmarked. Saving does not create a work relationship.",
    emptyWorkedWith:
      "Professionals you hire through Meetro will appear here.",
    emptySaved:
      "Professionals you save from Community will appear here.",
    find: "Find Professionals",
    loading: "Loading My Professionals…",
    failed: "My Professionals could not be loaded.",
    retry: "Try Again",
    back: "Back to Profile",
    requests: "requests",
    jobs: "jobs",
    alsoWorkedWith: "Also in Worked With",
  },
  es: {
    eyebrow: "Tus relaciones",
    title: "Mis profesionales",
    subtitle:
      "Negocios con los que has trabajado mediante Meetro y profesionales que guardaste para después.",
    workedWith: "Trabajé con",
    workedWithHelp:
      "Negocios que contrataste anteriormente mediante Meetro.",
    saved: "Guardados",
    savedHelp:
      "Profesionales que guardaste. Guardar no crea una relación de trabajo.",
    emptyWorkedWith:
      "Los profesionales que contrates mediante Meetro aparecerán aquí.",
    emptySaved:
      "Los profesionales que guardes desde Community aparecerán aquí.",
    find: "Buscar profesionales",
    loading: "Cargando Mis profesionales…",
    failed: "No se pudieron cargar Mis profesionales.",
    retry: "Intentar de nuevo",
    back: "Volver al perfil",
    requests: "solicitudes",
    jobs: "trabajos",
    alsoWorkedWith: "También en Trabajé con",
  },
  fr: {
    eyebrow: "Vos relations",
    title: "Mes professionnels",
    subtitle:
      "Entreprises avec lesquelles vous avez travaillé via Meetro et professionnels enregistrés pour plus tard.",
    workedWith: "Avec qui j’ai travaillé",
    workedWithHelp:
      "Entreprises que vous avez déjà engagées via Meetro.",
    saved: "Enregistrés",
    savedHelp:
      "Professionnels que vous avez enregistrés. L’enregistrement ne crée pas de relation de travail.",
    emptyWorkedWith:
      "Les professionnels que vous engagez via Meetro apparaîtront ici.",
    emptySaved:
      "Les professionnels enregistrés depuis Community apparaîtront ici.",
    find: "Trouver des professionnels",
    loading: "Chargement de Mes professionnels…",
    failed: "Impossible de charger Mes professionnels.",
    retry: "Réessayer",
    back: "Retour au profil",
    requests: "demandes",
    jobs: "travaux",
    alsoWorkedWith: "Également dans Avec qui j’ai travaillé",
  },
  "pt-BR": {
    eyebrow: "Seus relacionamentos",
    title: "Meus profissionais",
    subtitle:
      "Negócios com os quais você trabalhou pelo Meetro e profissionais salvos para depois.",
    workedWith: "Trabalhei com",
    workedWithHelp:
      "Negócios que você contratou anteriormente pelo Meetro.",
    saved: "Salvos",
    savedHelp:
      "Profissionais que você salvou. Salvar não cria uma relação de trabalho.",
    emptyWorkedWith:
      "Os profissionais contratados pelo Meetro aparecerão aqui.",
    emptySaved:
      "Os profissionais salvos pela Community aparecerão aqui.",
    find: "Encontrar profissionais",
    loading: "Carregando Meus profissionais…",
    failed: "Não foi possível carregar Meus profissionais.",
    retry: "Tentar novamente",
    back: "Voltar ao perfil",
    requests: "solicitações",
    jobs: "trabalhos",
    alsoWorkedWith: "Também em Trabalhei com",
  },
};

function ProfessionalIdentity({
  professional,
  meta,
  badge = "",
  children = null,
}) {
  const imageUrl =
    String(professional.imageUrl || "").trim();

  const businessName =
    String(professional.businessName || "").trim();

  return (
    <article style={professionalCard}>
      <div style={identityRow}>
        <div style={avatar} aria-hidden="true">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              style={avatarImage}
            />
          ) : (
            businessName.slice(0, 1).toUpperCase() ||
            "M"
          )}
        </div>

        <div style={identityCopy}>
          <strong style={businessNameStyle}>
            {businessName}
          </strong>

          {professional.category && (
            <span style={categoryStyle}>
              {professional.category}
            </span>
          )}

          {meta && (
            <span style={metaStyle}>
              {meta}
            </span>
          )}
        </div>
      </div>

      {badge && (
        <span style={relationshipBadge}>
          {badge}
        </span>
      )}

      {children && (
        <div style={professionalActions}>
          {children}
        </div>
      )}
    </article>
  );
}

function MyProfessionals({ setPage }) {
  const language = useLanguage();
  const copy =
    COPY[language] || COPY.en;

  const actions =
    ACTION_COPY[language] ||
    ACTION_COPY.en;

  const [reload, setReload] = useState(0);
  const [state, setState] = useState({
    phase: "loading",
    workedWith: [],
    saved: [],
    error: "",
  });

  const [mutation, setMutation] = useState({
    contractorProfileId: null,
    operation: "",
    error: "",
  });

  useEffect(() => {
    let active = true;

    setState((current) => ({
      ...current,
      phase: "loading",
      error: "",
    }));

    listHomeownerProfessionals({
      setPage,
    })
      .then((directory) => {
        if (!active) return;

        setState({
          phase: "ready",
          workedWith: directory.workedWith,
          saved: directory.saved,
          error: "",
        });
      })
      .catch((error) => {
        if (!active) return;

        setState({
          phase: "error",
          workedWith: [],
          saved: [],
          error:
            error?.message ||
            copy.failed,
        });
      });

    return () => {
      active = false;
    };
  }, [reload]);

  function requestNewWork(
    professional
  ) {
    // Repeat work starts as a completely fresh Job Request.
    // Only the prior canonical Meetro relationship survives.
    clearAssistantRequestDraft(
      sessionStorage
    );
    clearAssistantRequestDraft(
      localStorage
    );

    [
      "directRequestMode",
      "directRequestSource",
      "directRequestProfessionalName",
      "directRequestProfessionalCategory",
      "directRequestProfessionalConversationId",
      "directRequestId",
      "requestProfessionalContext",
      "selectedRequestProfessionalContext",
      "selectedProfessionalId",
      "selectedProfessionalName",
      "selectedProfessionalCategory",
    ].forEach((key) =>
      localStorage.removeItem(key)
    );

    setPage(
      buildExistingCustomerRequestRoute({
        meetroRelationshipId:
          professional.meetroRelationshipId,
        businessName:
          professional.businessName,
      })
    );
  }

  function openProfessionalProfile(
    professional
  ) {
    localStorage.setItem(
      "selectedContractor",
      JSON.stringify({
        id:
          professional.contractorProfileId,
        user_id:
          professional.professionalUserId,
        business_name:
          professional.businessName,
        name:
          professional.businessName,
        category:
          professional.category || "",
        image_url:
          professional.imageUrl || "",
        imageUrl:
          professional.imageUrl || "",
      })
    );

    localStorage.setItem(
      "contractorDetailsReturnPage",
      "myProfessionals"
    );

    setPage("contractorDetails");
  }

  async function removeSavedProfessional(
    professional
  ) {
    const contractorProfileId =
      professional.contractorProfileId;

    setMutation({
      contractorProfileId,
      operation: "remove",
      error: "",
    });

    try {
      await removeHomeownerSavedProfessional({
        contractorProfileId,
        setPage,
      });

      setMutation({
        contractorProfileId: null,
        operation: "",
        error: "",
      });

      setReload((value) => value + 1);
    } catch (error) {
      setMutation({
        contractorProfileId: null,
        operation: "",
        error:
          error?.message ||
          actions.failed,
      });
    }
  }

  function openProfessionalDiscovery() {
    setPage("discover");
  }

  return (
    <div
      className="app-page meetro-readable-page meetro-visual-page"
      style={page}
      data-homeowner-my-professionals="canonical"
    >
      <button
        type="button"
        style={backButton}
        onClick={() => setPage("profile")}
      >
        ← {copy.back}
      </button>

      <header style={header}>
        <div>
          <p style={eyebrow}>{copy.eyebrow}</p>
          <h1 style={title}>{copy.title}</h1>
          <p style={subtitle}>{copy.subtitle}</p>
        </div>

        <button
          type="button"
          style={findButton}
          onClick={openProfessionalDiscovery}
        >
          <MeetroIcon
            name="discover"
            size={20}
            decorative
          />
          <span>{copy.find}</span>
        </button>
      </header>

      {mutation.error && (
        <div
          style={mutationError}
          role="alert"
        >
          {mutation.error}
        </div>
      )}

      {state.phase === "loading" && (
        <section
          style={statusCard}
          role="status"
        >
          {copy.loading}
        </section>
      )}

      {state.phase === "error" && (
        <section
          style={errorCard}
          role="alert"
        >
          <strong>{copy.failed}</strong>
          <span>{state.error}</span>
          <button
            type="button"
            style={retryButton}
            onClick={() =>
              setReload((value) => value + 1)
            }
          >
            {copy.retry}
          </button>
        </section>
      )}

      {state.phase === "ready" && (
        <div style={sections}>
          <section
            style={sectionCard}
            aria-labelledby="my-professionals-worked-with"
          >
            <div style={sectionHeader}>
              <div>
                <h2
                  id="my-professionals-worked-with"
                  style={sectionTitle}
                >
                  {copy.workedWith}
                </h2>
                <p style={sectionHelp}>
                  {copy.workedWithHelp}
                </p>
              </div>

              <span style={countBadge}>
                {state.workedWith.length}
              </span>
            </div>

            <div style={cardStack}>
              {state.workedWith.length > 0 ? (
                state.workedWith.map(
                  (professional) => (
                    <ProfessionalIdentity
                      key={
                        professional.meetroRelationshipId
                      }
                      professional={professional}
                      meta={`${professional.requestCount} ${copy.requests} · ${professional.jobCount} ${copy.jobs}`}
                    >
                      <button
                        type="button"
                        style={secondaryAction}
                        onClick={() =>
                          openProfessionalProfile(
                            professional
                          )
                        }
                      >
                        {actions.viewProfile}
                      </button>

                      <button
                        type="button"
                        style={primaryAction}
                        onClick={() =>
                          requestNewWork(
                            professional
                          )
                        }
                      >
                        {actions.requestNewWork}
                      </button>

                    </ProfessionalIdentity>
                  )
                )
              ) : (
                <div style={emptyCard}>
                  {copy.emptyWorkedWith}
                </div>
              )}
            </div>
          </section>

          <section
            style={sectionCard}
            aria-labelledby="my-professionals-saved"
          >
            <div style={sectionHeader}>
              <div>
                <h2
                  id="my-professionals-saved"
                  style={sectionTitle}
                >
                  {copy.saved}
                </h2>
                <p style={sectionHelp}>
                  {copy.savedHelp}
                </p>
              </div>

              <span style={countBadge}>
                {state.saved.length}
              </span>
            </div>

            <div style={cardStack}>
              {state.saved.length > 0 ? (
                state.saved.map(
                  (professional) => (
                    <ProfessionalIdentity
                      key={
                        professional.savedProfessionalId
                      }
                      professional={professional}
                      badge={
                        professional.workedWith
                          ? copy.alsoWorkedWith
                          : ""
                      }
                    >
                      <button
                        type="button"
                        style={secondaryAction}
                        onClick={() =>
                          openProfessionalProfile(
                            professional
                          )
                        }
                      >
                        {actions.viewProfile}
                      </button>

                      <button
                        type="button"
                        style={removeAction}
                        disabled={
                          mutation.contractorProfileId ===
                          professional.contractorProfileId
                        }
                        onClick={() =>
                          removeSavedProfessional(
                            professional
                          )
                        }
                      >
                        {mutation.contractorProfileId ===
                          professional.contractorProfileId &&
                        mutation.operation === "remove"
                          ? actions.removing
                          : actions.remove}
                      </button>
                    </ProfessionalIdentity>
                  )
                )
              ) : (
                <div style={emptyCard}>
                  <span>{copy.emptySaved}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <BottomNav
        setPage={setPage}
        currentPage="myProfessionals"
      />
    </div>
  );
}

export default MyProfessionals;

const page = {
  minHeight: "100dvh",
  width: "100%",
  maxWidth: "960px",
  margin: "0 auto",
  padding:
    "calc(env(safe-area-inset-top) + 64px) max(18px, env(safe-area-inset-right, 0px)) calc(96px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  background:
    "var(--meetro-gradient-community-page)",
};

const backButton = {
  minHeight: "44px",
  marginBottom: "14px",
  padding: "10px 14px",
  border:
    "1px solid var(--meetro-color-line)",
  borderRadius: "16px",
  background:
    "var(--meetro-surface-paper)",
  color:
    "var(--meetro-color-forest)",
  fontWeight: "900",
  cursor: "pointer",
};

const header = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) auto",
  gap: "18px",
  alignItems: "end",
  marginBottom: "18px",
};

const eyebrow = {
  margin: "0 0 5px",
  color: "var(--meetro-color-wood)",
  fontSize: "12px",
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const title = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "clamp(30px, 6vw, 42px)",
  lineHeight: 1,
  fontWeight: "950",
};

const subtitle = {
  maxWidth: "680px",
  margin: "9px 0 0",
  color: "var(--meetro-color-muted)",
  fontSize: "14px",
  lineHeight: 1.5,
  fontWeight: "700",
};

const findButton = {
  minHeight: "46px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "11px 15px",
  border: "none",
  borderRadius: "16px",
  background:
    "var(--meetro-gradient-community-action)",
  color: "#fff",
  fontSize: "13px",
  fontWeight: "950",
  cursor: "pointer",
};

const sections = {
  display: "grid",
  gap: "16px",
};

const sectionCard = {
  display: "grid",
  gap: "14px",
  padding: "18px",
  border:
    "1px solid var(--meetro-color-line)",
  borderRadius: "24px",
  background:
    "var(--meetro-surface-paper)",
  boxShadow:
    "var(--meetro-shadow-soft)",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
};

const sectionTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "20px",
  fontWeight: "950",
};

const sectionHelp = {
  margin: "5px 0 0",
  color: "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const countBadge = {
  minWidth: "34px",
  height: "34px",
  display: "grid",
  placeItems: "center",
  borderRadius: "999px",
  background:
    "var(--meetro-surface-sage)",
  color:
    "var(--meetro-color-forest)",
  fontSize: "13px",
  fontWeight: "950",
};

const cardStack = {
  display: "grid",
  gap: "10px",
};

const professionalCard = {
  display: "grid",
  gap: "12px",
  minWidth: 0,
  padding: "13px",
  border:
    "1px solid var(--meetro-color-line)",
  borderRadius: "18px",
  background:
    "var(--meetro-surface-warm)",
};

const identityRow = {
  display: "flex",
  alignItems: "center",
  gap: "11px",
  minWidth: 0,
};

const avatar = {
  width: "48px",
  height: "48px",
  flex: "0 0 48px",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  borderRadius: "16px",
  background:
    "var(--meetro-surface-sage)",
  color:
    "var(--meetro-color-forest)",
  fontWeight: "950",
};

const avatarImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const identityCopy = {
  display: "grid",
  gap: "3px",
  minWidth: 0,
};

const businessNameStyle = {
  color: "var(--meetro-color-ink)",
  fontSize: "15px",
  lineHeight: 1.3,
  overflowWrap: "anywhere",
};

const categoryStyle = {
  color: "var(--meetro-color-muted)",
  fontSize: "12px",
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};

const metaStyle = {
  color: "var(--meetro-color-coffee)",
  fontSize: "11px",
  lineHeight: 1.35,
  fontWeight: "800",
};

const relationshipBadge = {
  flex: "0 0 auto",
  maxWidth: "150px",
  padding: "6px 9px",
  borderRadius: "999px",
  background:
    "var(--meetro-surface-sage)",
  color:
    "var(--meetro-color-forest)",
  fontSize: "10px",
  lineHeight: 1.25,
  fontWeight: "900",
  textAlign: "center",
};

const professionalActions = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(130px, 1fr))",
  gap: "8px",
};

const actionBase = {
  minHeight: "42px",
  borderRadius: "14px",
  padding: "9px 12px",
  fontSize: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const primaryAction = {
  ...actionBase,
  border: "none",
  background:
    "var(--meetro-color-forest)",
  color: "#fff",
};

const secondaryAction = {
  ...actionBase,
  border:
    "1px solid var(--meetro-color-line)",
  background:
    "var(--meetro-surface-paper)",
  color:
    "var(--meetro-color-forest)",
};

const removeAction = {
  ...actionBase,
  border: "1px solid #fecaca",
  background: "#fff7f7",
  color: "#991b1b",
};

const mutationError = {
  marginBottom: "14px",
  padding: "12px 14px",
  border: "1px solid #fecaca",
  borderRadius: "14px",
  background: "#fff7f7",
  color: "#991b1b",
  fontSize: "13px",
  lineHeight: 1.4,
  fontWeight: "800",
};

const emptyCard = {
  display: "grid",
  gap: "10px",
  padding: "16px",
  borderRadius: "16px",
  background:
    "var(--meetro-surface-sage)",
  color:
    "var(--meetro-color-muted)",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "750",
};

const statusCard = {
  padding: "22px",
  border:
    "1px solid var(--meetro-color-line)",
  borderRadius: "20px",
  background:
    "var(--meetro-surface-paper)",
  color:
    "var(--meetro-color-muted)",
  fontWeight: "800",
};

const errorCard = {
  ...statusCard,
  display: "grid",
  gap: "10px",
  color: "#991b1b",
};

const retryButton = {
  justifySelf: "start",
  minHeight: "42px",
  padding: "9px 12px",
  border: "1px solid #fecaca",
  borderRadius: "999px",
  background: "#fff7f7",
  color: "#991b1b",
  fontWeight: "900",
  cursor: "pointer",
};
