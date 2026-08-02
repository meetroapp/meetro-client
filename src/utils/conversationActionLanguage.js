export const CONVERSATION_ACTION_STAGE = Object.freeze({
  NEW: "new",
  ACTIVE: "active",
  HISTORY: "history",
});

const CONVERSATION_ACTION_LABELS = Object.freeze({
  en: Object.freeze({
    new: "Start Conversation",
    active: "Continue Conversation",
    history: "Review Conversation",
  }),
  es: Object.freeze({
    new: "Iniciar conversación",
    active: "Continuar conversación",
    history: "Revisar conversación",
  }),
  fr: Object.freeze({
    new: "Démarrer la conversation",
    active: "Continuer la conversation",
    history: "Consulter la conversation",
  }),
  "pt-BR": Object.freeze({
    new: "Iniciar conversa",
    active: "Continuar conversa",
    history: "Revisar conversa",
  }),
});

export function getConversationActionLabel(stage, language = "en") {
  const labels =
    CONVERSATION_ACTION_LABELS[language] ||
    CONVERSATION_ACTION_LABELS.en;

  return labels[stage] || labels.active;
}
