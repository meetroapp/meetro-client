import { authorityRank } from "./knowledgeAuthority.js";

export function detectKnowledgeConflicts(sources = []) {
  const byTopic = new Map();
  for (const source of sources) {
    for (const assertion of source.assertions || []) {
      if (!assertion?.topic || assertion.value === undefined) continue;
      const entries = byTopic.get(assertion.topic) || [];
      entries.push({ source, value: JSON.stringify(assertion.value) });
      byTopic.set(assertion.topic, entries);
    }
  }
  const conflicts = [];
  for (const [topic, entries] of byTopic) {
    const strongest = Math.max(...entries.map((entry) => authorityRank(entry.source.authority)));
    const peers = entries.filter((entry) => authorityRank(entry.source.authority) === strongest);
    if (new Set(peers.map((entry) => entry.value)).size > 1) {
      conflicts.push({ conflictId: `conflict:${topic}`, topic, sourceIds: peers.map((entry) => entry.source.sourceId).sort(), severity: strongest >= 5 ? "high" : "medium", status: "unresolved", resolution: null });
    }
  }
  return conflicts.sort((a, b) => a.conflictId.localeCompare(b.conflictId));
}

