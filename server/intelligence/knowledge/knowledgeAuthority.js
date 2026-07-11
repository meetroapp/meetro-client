export const KNOWLEDGE_AUTHORITIES = Object.freeze(["authoritative", "approved", "reference", "advisory", "unverified"]);
const RANK = Object.freeze({ authoritative: 5, approved: 4, reference: 3, advisory: 2, unverified: 1 });

export function authorityRank(value = "unverified") {
  return RANK[value] || 0;
}

export function canVerifyFacts(source = {}) {
  return ["authoritative", "approved"].includes(source.authority);
}

