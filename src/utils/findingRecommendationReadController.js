import { validateCanonicalEvaluationProjection } from "./canonicalEvaluation.js";
import { validateCanonicalFindingProjection } from "./canonicalFindingRecommendation.js";
import {
  listCanonicalFindingsForEvaluation,
  listCanonicalRecommendationsForFinding,
} from "./findingRecommendationApi.js";

export async function loadCanonicalFindingsForEvaluation({
  evaluation,
  setPage,
}) {
  const canonical = validateCanonicalEvaluationProjection(evaluation);
  if (
    !canonical ||
    canonical.aggregate.sourceContext.type !== "ordinary_job"
  ) {
    return null;
  }
  return listCanonicalFindingsForEvaluation({
    evaluationId: canonical.evaluation.id,
    setPage,
  });
}

export async function loadCanonicalRecommendationsForFinding({
  finding,
  setPage,
}) {
  const canonical = validateCanonicalFindingProjection(finding);
  if (!canonical) return null;
  return listCanonicalRecommendationsForFinding({ finding: canonical, setPage });
}
