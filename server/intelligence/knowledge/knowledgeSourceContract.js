import { KNOWLEDGE_AUTHORITIES } from "./knowledgeAuthority.js";
import { KNOWLEDGE_CONFIDENTIALITY } from "./knowledgeConfidentiality.js";
import { isRepositoryRelativePath } from "./knowledgeContracts.js";
import { isSupportedKnowledgeDomain } from "./knowledgeDomains.js";

export const KNOWLEDGE_SOURCE_TYPES = Object.freeze([
  "internal_document", "product_standard", "architecture_standard", "policy", "legal_document",
  "workflow_standard", "evaluation_template", "service_guide", "emergency_guide", "permit_guide",
  "business_rule", "system_rule", "approved_external_reference",
]);

export function validateKnowledgeSource(source = {}) {
  const errors = [];
  if (!/^knowledge:[a-z0-9][a-z0-9:_-]*$/.test(source.sourceId || "")) errors.push("invalid_source_id");
  if (!KNOWLEDGE_SOURCE_TYPES.includes(source.sourceType)) errors.push("invalid_source_type");
  if (!isSupportedKnowledgeDomain(source.domain)) errors.push("invalid_domain");
  if (!KNOWLEDGE_AUTHORITIES.includes(source.authority)) errors.push("invalid_authority");
  if (!KNOWLEDGE_CONFIDENTIALITY.includes(source.confidentiality)) errors.push("invalid_confidentiality");
  if (!["active", "superseded", "expired", "archived"].includes(source.status)) errors.push("invalid_status");
  if (!source.title || !source.language || !source.version) errors.push("incomplete_metadata");
  if (source.repositoryPath && !isRepositoryRelativePath(source.repositoryPath)) errors.push("invalid_repository_path");
  if (typeof source.url === "string" && /^[a-z]+:\/\//i.test(source.url)) errors.push("arbitrary_url_not_allowed");
  return { valid: errors.length === 0, errors };
}
