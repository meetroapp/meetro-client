export const PORTFOLIO_PUBLICATION_STATE = Object.freeze({
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
});

export const PORTFOLIO_PRIVACY_CONFIRMATION_VERSION =
  "portfolio-publication-v1";

export const PORTFOLIO_VERSION_CONFLICT = "PORTFOLIO_VERSION_CONFLICT";

const ACTION_NAMES = new Set([
  "canAdoptAsDraft",
  "canEdit",
  "canPublish",
  "canArchive",
  "canFeature",
  "canUnfeature",
  "canReorder",
]);

export function isPortfolioActionAllowed(project = {}, action = "") {
  return ACTION_NAMES.has(action) && project?.actions?.[action] === true;
}

export function getPortfolioStatePresentation(project = {}, language = "en") {
  const state = project.publication_state || null;
  const translations = {
    en: {
      legacy: {
        label: "Previous Portfolio Project",
        detail: "Review this older project before moving it to Draft or archiving it.",
      },
      draft: {
        label: "Draft",
        detail: "Private — only you can see this project until you publish it.",
      },
      published: {
        label: "Published",
        detail: "Visible in your public Portfolio.",
      },
      archived: {
        label: "Archived",
        detail: "No longer shown in your public Portfolio.",
      },
    },
    es: {
      legacy: {
        label: "Proyecto anterior del portafolio",
        detail: "Revisa este proyecto anterior antes de pasarlo a borrador o archivarlo.",
      },
      draft: {
        label: "Borrador",
        detail: "Privado: solo tú puedes verlo hasta que lo publiques.",
      },
      published: {
        label: "Publicado",
        detail: "Visible en tu portafolio público.",
      },
      archived: {
        label: "Archivado",
        detail: "Ya no aparece en tu portafolio público.",
      },
    },
    fr: {
      legacy: {
        label: "Projet précédent du portfolio",
        detail: "Examinez cet ancien projet avant de le passer en brouillon ou de l’archiver.",
      },
      draft: {
        label: "Brouillon",
        detail: "Privé : vous seul pouvez le voir jusqu’à sa publication.",
      },
      published: {
        label: "Publié",
        detail: "Visible dans votre portfolio public.",
      },
      archived: {
        label: "Archivé",
        detail: "N’apparaît plus dans votre portfolio public.",
      },
    },
    pt: {
      legacy: {
        label: "Projeto anterior do portfólio",
        detail: "Revise este projeto antigo antes de movê-lo para rascunho ou arquivá-lo.",
      },
      draft: {
        label: "Rascunho",
        detail: "Privado: somente você pode vê-lo até a publicação.",
      },
      published: {
        label: "Publicado",
        detail: "Visível no seu portfólio público.",
      },
      archived: {
        label: "Arquivado",
        detail: "Não aparece mais no seu portfólio público.",
      },
    },
  };
  const copy = translations[language] || translations.en;

  if (project.migration_review_required === true || state === null) {
    return { key: "legacy", ...copy.legacy };
  }
  if (state === PORTFOLIO_PUBLICATION_STATE.DRAFT) {
    return { key: "draft", ...copy.draft };
  }
  if (state === PORTFOLIO_PUBLICATION_STATE.PUBLISHED) {
    return { key: "published", ...copy.published };
  }
  if (state === PORTFOLIO_PUBLICATION_STATE.ARCHIVED) {
    return { key: "archived", ...copy.archived };
  }

  return { key: "legacy", ...copy.legacy };
}

export function createPortfolioPrivacyConfirmation() {
  return {
    version: PORTFOLIO_PRIVACY_CONFIRMATION_VERSION,
    confirmed: true,
  };
}

export function getExpectedPortfolioVersion(project = {}) {
  const version = Number(project.version);
  return Number.isSafeInteger(version) && version > 0 ? version : null;
}

export function createExpectedVersionPayload(project = {}) {
  const expectedVersion = getExpectedPortfolioVersion(project);
  return expectedVersion ? { expected_version: expectedVersion } : null;
}

export function getReorderablePortfolioProjects(projects = []) {
  return Array.isArray(projects)
    ? projects.filter((project) => isPortfolioActionAllowed(project, "canReorder"))
    : [];
}

export function movePortfolioProject(projects = [], projectId, direction) {
  const reorderable = getReorderablePortfolioProjects(projects);
  const currentIndex = reorderable.findIndex(
    (project) => String(project.id) === String(projectId)
  );
  const offset = direction === "earlier" ? -1 : direction === "later" ? 1 : 0;
  const targetIndex = currentIndex + offset;

  if (
    !offset ||
    currentIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= reorderable.length
  ) {
    return null;
  }

  const ordered = [...reorderable];
  const [moved] = ordered.splice(currentIndex, 1);
  ordered.splice(targetIndex, 0, moved);
  return ordered;
}

export function createPortfolioReorderPayload(contractorId, orderedProjects = []) {
  const normalizedContractorId = Number(contractorId);
  if (!Number.isSafeInteger(normalizedContractorId) || normalizedContractorId <= 0) {
    return null;
  }
  if (!Array.isArray(orderedProjects) || orderedProjects.length === 0) return null;

  const projects = orderedProjects.map((project) => {
    const id = Number(project.id);
    const expectedVersion = getExpectedPortfolioVersion(project);
    if (!Number.isSafeInteger(id) || id <= 0 || !expectedVersion) return null;
    return { id, expected_version: expectedVersion };
  });

  if (projects.some((project) => !project)) return null;
  return { contractor_id: normalizedContractorId, projects };
}

export function isPortfolioVersionConflict(result = {}) {
  return result?.response?.status === 409 &&
    result?.data?.code === PORTFOLIO_VERSION_CONFLICT;
}

export function getCanonicalPortfolioCounts(projects = []) {
  const canonical = Array.isArray(projects) ? projects : [];
  return {
    total: canonical.length,
    draft: canonical.filter(
      (project) => project.publication_state === PORTFOLIO_PUBLICATION_STATE.DRAFT
    ).length,
    published: canonical.filter(
      (project) => project.publication_state === PORTFOLIO_PUBLICATION_STATE.PUBLISHED
    ).length,
    archived: canonical.filter(
      (project) => project.publication_state === PORTFOLIO_PUBLICATION_STATE.ARCHIVED
    ).length,
    legacy: canonical.filter(
      (project) => project.migration_review_required === true ||
        project.publication_state == null
    ).length,
    featured: canonical.filter((project) => project.is_featured === true).length,
  };
}
