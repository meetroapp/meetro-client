const INTENT_PATTERNS = Object.freeze({
  navigation:
    /\b(open|go to|show|view|take me|where is|navigate|abrir|mostrar|ver|ir a)\b/i,
  explanation:
    /\b(explain|what does|what is|meaning|mean|why|status|explica|qué significa|estado)\b/i,
  workflow_guidance:
    /\b(next|what should|what happens|prepare|schedule|quote|proposal|invoice|visit|approval|siguiente|después|cotiz|propuesta|factura|visita)\b/i,
});

export function classifyCompanionIntent(question = "") {
  const text = String(question || "").trim();
  if (!text) return "reasoning";

  if (INTENT_PATTERNS.navigation.test(text)) return "navigation";
  if (INTENT_PATTERNS.explanation.test(text)) return "explanation";
  if (INTENT_PATTERNS.workflow_guidance.test(text)) return "workflow_guidance";

  return "reasoning";
}
