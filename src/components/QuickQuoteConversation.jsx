import { useEffect, useRef, useState } from "react";

import MeetroIcon from "./MeetroIcon.jsx";
import WorkflowMicrophoneInput from "./WorkflowMicrophoneInput.jsx";
import QuickQuoteAnalysisThread from "./QuickQuoteAnalysisThread.jsx";
import { getQuickQuoteConversationCopy } from "../utils/quickQuoteConversationLanguage.js";
import { isQuickQuoteSuggestionReviewable } from "../utils/quickQuoteProfessionalContinuation.js";
import { filterAuthorizedProfessionalJobs } from "../utils/professionalJobPicker.js";

export default function QuickQuoteConversation({
  language = "en",
  view = "entry",
  prompt,
  onPromptChange,
  onPrepare,
  onCancelRevision,
  onBackToDetails,
  onReturnToAnalysis,
  analysisAvailable = false,
  analysisStale = false,
  analysisBusy = false,
  analysisTurns = [],
  onContinueAnalysis,
  onContinueWithMyDetails,
  jobConnection = {},
  onOpenJobPicker,
  onSelectJob,
  onConfirmCategoryCosts,
  onCancelJobConnection,
  onBackToJobConnection,
  setPage,
  photoCount = 0,
  photos = [],
  canAddPhotos = false,
  photoBusy = false,
  onAddPhotos,
  onRemovePhoto,
  photoProposal = null,
  reviewedResult = null,
  photoDecisions = {},
  photoReviewBusyId = "",
  onReviewPhotoSuggestion,
  notice = "",
}) {
  const copy = getQuickQuoteConversationCopy(language);
  const promptRef = useRef(null);
  const surfaceRef = useRef(null);
  const isRevision = view === "revision";
  const [editingPhotoItemId, setEditingPhotoItemId] =
    useState("");
  const [photoEditText, setPhotoEditText] = useState("");
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);
  const [jobSearch, setJobSearch] = useState("");
  const filteredJobs = filterAuthorizedProfessionalJobs(
    jobConnection.jobs,
    jobSearch
  );
  const usingProfessionalDetails = [
    "decision",
    "picker",
    "costConfirmation",
  ].includes(jobConnection.stage);
  const formatMoney = (minor) =>
    new Intl.NumberFormat(language, {
      style: "currency",
      currency: "USD",
    }).format((Number(minor) || 0) / 100);

  const thingsToVerify = photoProposal
    ? [
        ...(photoProposal.questionsForProfessional || []).map((item) => ({
          ...item,
          sourceCategory: "questionsForProfessional",
        })),
        ...(photoProposal.needsVerification || []).map((item) => ({
          ...item,
          sourceCategory: "needsVerification",
        })),
        ...(photoProposal.observed || []).map((item) => ({
          ...item,
          sourceCategory: "observed",
        })),
      ]
    : [];

  const photoGroups = photoProposal
    ? [
        [
          copy.recommendedSolution,
          "repairSuggestions",
          photoProposal.repairSuggestions,
        ],
        [
          copy.materialSuggestions,
          "materialSuggestions",
          photoProposal.materialSuggestions,
        ],
        [
          copy.thingsToVerify,
          "needsVerification",
          thingsToVerify,
        ],
      ]
    : [];

  /*
   * R1-05 first-class reviewed result.
   *
   * These sections come ONLY from the validated server
   * reviewed-result projection. Local photoDecisions never
   * populate Reviewed Solution or Materials List.
   *
   * Questions remain conversation prompts and are not
   * promoted into this reviewed result.
   */
  const reviewedSections =
    reviewedResult
      ? [
          [
            copy.reviewedSolution,
            "reviewedSolution",
            reviewedResult.reviewedSolution,
          ],
          [
            copy.materialsList,
            "materialsList",
            reviewedResult.materialsList,
          ],
          [
            copy.needsVerification,
            "needsVerification",
            reviewedResult.needsVerification,
          ],
        ]
      : [];

  const hasReviewedResult =
    reviewedSections.some(
      ([, , items]) =>
        Array.isArray(items) &&
        items.length > 0
    );

  function photoDecisionLabel(action) {
    if (action === "ACCEPTED") return copy.photoAccepted;
    if (action === "EDITED") return copy.photoEdited;
    if (action === "REJECTED") return copy.photoRejected;
    return "";
  }

  async function submitEditedPhotoSuggestion(
    category,
    item
  ) {
    const ok = await onReviewPhotoSuggestion?.({
      category,
      item,
      action: "EDITED",
      editedText: photoEditText,
    });

    if (ok) {
      setEditingPhotoItemId("");
      setPhotoEditText("");
    }
  }

  useEffect(() => {
    surfaceRef.current?.focus();
  }, [view]);

  if (view === "working") {
    return (
      <main ref={surfaceRef} tabIndex={-1} className="quick-quote-conversation quick-quote-working" aria-labelledby="quick-quote-working-title">
        <div className="quick-quote-assistant-mark" aria-hidden="true">
          <MeetroIcon name="assistant" size={24} />
        </div>
        <div>
          <h1 id="quick-quote-working-title">{copy.working}</h1>
          <p>{copy.workingHelp}</p>
        </div>
        <ol aria-label={copy.working}>
          {(photoCount ? copy.photoStages : copy.stages).map(
            (stage) => <li key={stage}>{stage}</li>
          )}
        </ol>
      </main>
    );
  }

  if (view === "review") {
    return (
      <main
        ref={surfaceRef}
        tabIndex={-1}
        className="quick-quote-conversation"
        aria-labelledby="quick-quote-review-title"
        aria-busy={analysisBusy}
      >
        <header className="quick-quote-flow-header">
          <button
            type="button"
            className="quick-quote-analysis-back"
            disabled={analysisBusy}
            onClick={onBackToDetails}
          >
            ‹ {copy.backToJobDetails}
          </button>

          <p>{copy.workingPrivately}</p>

          <h1 id="quick-quote-review-title">
            {copy.reviewTitle}
          </h1>

          <div className="quick-quote-guidance">
            <strong>{copy.reviewGuidanceTitle}</strong>
            <span>{copy.reviewGuidanceBody}</span>
          </div>
        </header>

        <div className="quick-quote-review-card">
          {prompt.trim() ? (
            <section
              className="quick-quote-summary-section"
              aria-label={copy.sourceInformation}
            >
              <span>{copy.yourJobDetails}</span>

              <div>
                <p className="quick-quote-source-information">
                  {prompt}
                </p>
              </div>
            </section>
          ) : null}

          {photos.length ? (
            <section
              className="quick-quote-photo-review"
              aria-label={copy.photos}
            >
              <div className="quick-quote-photo-review-heading">
                <div>
                  <strong>{copy.photos}</strong>
                  <p>{copy.photoDraftNotice}</p>
                </div>
              </div>

              <div className="quick-quote-photo-grid">
                {photos.map((photo, index) => (
                  <figure
                    key={photo.id}
                    className="quick-quote-photo-item"
                  >
                    {photo.previewUrl ? (
                      <img
                        src={photo.previewUrl}
                        alt={`${copy.photos} ${index + 1}`}
                      />
                    ) : null}
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          <div className="quick-quote-professional-actions">
            {usingProfessionalDetails ? (
              <p
                className="quick-quote-professional-confirmation"
                role="status"
                aria-live="polite"
              >
                <span aria-hidden="true">✓</span>
                <span>{copy.usingMyDetails}</span>
              </p>
            ) : (
              <button
                type="button"
                className="quick-quote-primary-action"
                disabled={analysisBusy || !prompt.trim()}
                onClick={onContinueWithMyDetails}
              >
                {copy.continueWithMyDetails}
              </button>
            )}

            <button
              type="button"
              aria-expanded={suggestionsExpanded}
              disabled={
                analysisBusy ||
                (!photoProposal && analysisTurns.length === 0)
              }
              onClick={() =>
                setSuggestionsExpanded((current) => !current)
              }
            >
              {copy.useMeetroSuggestions}
            </button>
          </div>

          <p className="quick-quote-optional-help">
            {copy.optionalSuggestionsHelp}
          </p>

          {["decision", "picker"].includes(jobConnection.stage) ? (
            <section
              className="quick-quote-job-connection"
              aria-labelledby="quick-quote-job-connection-title"
            >
              <div className="quick-quote-job-connection-heading">
                <div>
                  <p>{copy.readyToContinue}</p>
                  <h2 id="quick-quote-job-connection-title">
                    {copy.connectToJob}
                  </h2>
                </div>
                <button
                  type="button"
                  className="quick-quote-job-connection-cancel"
                  disabled={jobConnection.busy}
                  onClick={onCancelJobConnection}
                >
                  {copy.cancel}
                </button>
              </div>

              {jobConnection.stage === "decision" ? (
                <div className="quick-quote-job-connection-actions">
                  <button
                    type="button"
                    className="quick-quote-primary-action"
                    onClick={onOpenJobPicker}
                  >
                    {copy.attachExistingJob}
                  </button>
                  <button type="button" disabled>
                    <span>{copy.createJob}</span>
                    <small>{copy.createJobComingNext}</small>
                  </button>
                </div>
              ) : (
                <div className="quick-quote-job-picker">
                  <button
                    type="button"
                    className="quick-quote-job-picker-back"
                    disabled={jobConnection.busy}
                    onClick={onBackToJobConnection}
                  >
                    ← {copy.back}
                  </button>
                  <label>
                    <span>{copy.searchJobs}</span>
                    <input
                      type="search"
                      value={jobSearch}
                      placeholder={copy.searchJobsPlaceholder}
                      onChange={(event) => setJobSearch(event.target.value)}
                    />
                  </label>

                  {jobConnection.busy ? (
                    <p role="status">{copy.loadingEligibleJobs}</p>
                  ) : null}
                  {jobConnection.error ? (
                    <p className="quick-quote-job-picker-error" role="alert">
                      {jobConnection.error}
                    </p>
                  ) : null}
                  {!jobConnection.busy && !jobConnection.error &&
                  filteredJobs.length === 0 ? (
                    <p className="quick-quote-job-picker-empty" role="status">
                      {copy.noEligibleJobs}
                    </p>
                  ) : null}

                  <div className="quick-quote-job-picker-list">
                    {filteredJobs.map((job) => (
                      <button
                        type="button"
                        key={job.jobId}
                        disabled={jobConnection.busy}
                        aria-busy={
                          jobConnection.selectedJobId === job.jobId
                        }
                        onClick={() => onSelectJob?.(job)}
                      >
                        <strong>{job.title}</strong>
                        <span>{job.customerLabel}</span>
                        <small>
                          {[
                            job.serviceSpecialty || job.serviceDomain,
                            job.city || job.serviceArea,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {jobConnection.stage === "costConfirmation" ? (
            <section
              className="quick-quote-job-connection quick-quote-cost-confirmation"
              aria-labelledby="quick-quote-cost-confirmation-title"
            >
              <div className="quick-quote-job-connection-heading">
                <div>
                  <p>{copy.costsFromDetails}</p>
                  <h2 id="quick-quote-cost-confirmation-title">
                    {copy.confirmPrivateCosts}
                  </h2>
                </div>
                <button
                  type="button"
                  className="quick-quote-job-connection-cancel"
                  disabled={jobConnection.busy}
                  onClick={onCancelJobConnection}
                >
                  {copy.cancel}
                </button>
              </div>

              <div className="quick-quote-cost-confirmation-list">
                {(jobConnection.professionalCategoryCosts || []).map(
                  (item) => (
                    <div key={item.classification}>
                      <span>
                        {item.classification === "MATERIAL"
                          ? copy.materialsTotal
                          : copy.laborTotal}
                      </span>
                      <strong>{formatMoney(item.totalCostMinor)}</strong>
                    </div>
                  )
                )}
              </div>

              <p className="quick-quote-optional-help">
                {copy.privateCostConfirmationHelp}
              </p>

              {jobConnection.error ? (
                <p className="quick-quote-job-picker-error" role="alert">
                  {jobConnection.error}
                </p>
              ) : null}

              <button
                type="button"
                className="quick-quote-primary-action"
                disabled={
                  jobConnection.busy ||
                  jobConnection.categoryCostConflicts?.length > 0
                }
                onClick={onConfirmCategoryCosts}
              >
                {copy.confirmAmounts}
              </button>
            </section>
          ) : null}

          {suggestionsExpanded ? (
            <div className="quick-quote-optional-suggestions">
              <details className="quick-quote-summary-section quick-quote-suggestion-group">
                <summary>
                  <span>{copy.analysisConversationTitle}</span>
                </summary>

                <div className="quick-quote-conversation-disclosure">
                  <QuickQuoteAnalysisThread
                    language={language}
                    turns={analysisTurns}
                    busy={analysisBusy}
                    onContinue={onContinueAnalysis}
                    setPage={setPage}
                  />
                </div>
              </details>

          {photoProposal ? (
            <section
              className="quick-quote-photo-review"
              aria-label={copy.photoEvidenceTitle}
            >
              <div className="quick-quote-photo-review-heading">
                <div>
                  <strong>{copy.photoEvidenceTitle}</strong>
                  <p>{copy.photoEvidenceHelp}</p>
                </div>
              </div>

              {photoProposal.summary ? (
                <p>{photoProposal.summary}</p>
              ) : null}

              {photoGroups.map(
                ([title, category, items]) =>
                  items?.length ? (
                    <details
                      key={category}
                      className="quick-quote-summary-section quick-quote-suggestion-group"
                    >
                      <summary>
                        <span>{title}</span>
                        <strong>{items.length}</strong>
                      </summary>

                      <div className="quick-quote-photo-suggestion-list">
                        {items.map((item) => {
                          const sourceItemId = item.id;
                          const decision =
                            photoDecisions[sourceItemId];

                          const reviewable =
                            isQuickQuoteSuggestionReviewable(category);

                          const editing =
                            editingPhotoItemId ===
                            `${photoProposal.proposalId}:${sourceItemId}`;

                          const busy =
                            analysisBusy ||
                            photoReviewBusyId === sourceItemId;

                          return (
                            <article
                              key={`${item.sourceCategory || category}:${item.id}`}
                              className="quick-quote-photo-suggestion"
                            >
                              <p>
                                {decision?.text || item.text}
                              </p>

                              {item.sourceCategory ===
                              "questionsForProfessional" ? (
                                <span className="quick-quote-advisory-label">
                                  {copy.questionsForProfessional}
                                </span>
                              ) : null}

                              {decision ? (
                                <strong
                                  className="quick-quote-photo-decision"
                                  role="status"
                                >
                                  {photoDecisionLabel(
                                    decision.action
                                  )}
                                </strong>
                              ) : editing && reviewable ? (
                                <>
                                  <textarea
                                    className="quick-quote-photo-edit"
                                    aria-label={`${copy.editAndUse}: ${item.text}`}
                                    value={photoEditText}
                                    rows={3}
                                    maxLength={3000}
                                    onChange={(event) =>
                                      setPhotoEditText(
                                        event.target.value
                                      )
                                    }
                                  />

                                  <div className="quick-quote-review-actions">
                                    <button
                                      type="button"
                                      disabled={
                                        busy ||
                                        !photoEditText.trim()
                                      }
                                      onClick={() =>
                                        void submitEditedPhotoSuggestion(
                                          category,
                                          item
                                        )
                                      }
                                    >
                                      {copy.saveAndUse}
                                    </button>

                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => {
                                        setEditingPhotoItemId("");
                                        setPhotoEditText("");
                                      }}
                                    >
                                      {copy.cancel}
                                    </button>
                                  </div>
                                </>
                              ) : reviewable ? (
                                <div className="quick-quote-review-actions">
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      void onReviewPhotoSuggestion?.({
                                        category,
                                        item,
                                        action: "ACCEPTED",
                                      })
                                    }
                                  >
                                    {copy.useSuggestion}
                                  </button>

                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                      setEditingPhotoItemId(
                                        `${photoProposal.proposalId}:${item.id}`
                                      );
                                      setPhotoEditText(item.text);
                                    }}
                                  >
                                    {copy.editAndUse}
                                  </button>

                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      void onReviewPhotoSuggestion?.({
                                        category,
                                        item,
                                        action: "REJECTED",
                                      })
                                    }
                                  >
                                    {copy.dismissSuggestion}
                                  </button>
                                </div>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>
                    </details>
                  ) : null
              )}

              {hasReviewedResult ? (
                <section
                  className="quick-quote-reviewed-result"
                  aria-labelledby="quick-quote-reviewed-result-title"
                >
                  <div className="quick-quote-reviewed-result-heading">
                    <strong id="quick-quote-reviewed-result-title">
                      {copy.reviewedResultTitle}
                    </strong>
                    <p>
                      {copy.reviewedResultHelp}
                    </p>
                  </div>

                  <div className="quick-quote-reviewed-result-grid">
                    {reviewedSections.map(
                      ([title, category, items]) =>
                        items?.length ? (
                          <section
                            key={category}
                            className="quick-quote-reviewed-result-section"
                            data-reviewed-category={category}
                          >
                            <span>
                              {title} · {items.length}
                            </span>

                            <ul>
                              {items.map(
                                (item) => (
                                  <li key={item.elementId}>
                                    {item.text}
                                  </li>
                                )
                              )}
                            </ul>
                          </section>
                        ) : null
                    )}
                  </div>
                </section>
              ) : null}

              {photoProposal.photoAnalysis?.limitations?.length ? (
                <section className="quick-quote-summary-section">
                  <span>
                    {copy.photoLimitations} ·{" "}
                    {
                      photoProposal.photoAnalysis
                        .limitations.length
                    }
                  </span>

                  <div>
                    <ul>
                      {photoProposal.photoAnalysis.limitations.map(
                        (item) => (
                          <li key={item}>{item}</li>
                        )
                      )}
                    </ul>
                  </div>
                </section>
              ) : null}
            </section>
          ) : null}
            </div>
          ) : null}

          <p
            className="quick-quote-draft-truth"
            role="status"
          >
            {copy.draftTruth}
          </p>

          {notice ? (
            <p
              className="quick-quote-action-notice"
              role="status"
            >
              {notice}
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main ref={surfaceRef} tabIndex={-1} className="quick-quote-conversation" aria-labelledby="quick-quote-create-title">
      <header className="quick-quote-flow-header">
        <p>{copy.assistant}</p>
        <h1 id="quick-quote-create-title">{isRevision ? copy.revisionTitle : copy.createTitle}</h1>
        {!isRevision ? (
          <div className="quick-quote-guidance">
            <strong>{copy.entryGuidanceTitle}</strong>
            <span>{copy.entryGuidanceBody}</span>
          </div>
        ) : null}
      </header>
      <section className="quick-quote-prompt-card" aria-label={copy.assistant}>
        {analysisStale ? (
          <div
            className="quick-quote-analysis-stale"
            role="status"
          >
            <strong>{copy.analysisNeedsUpdating}</strong>
          </div>
        ) : null}

        {analysisAvailable && !analysisStale ? (
          <button
            type="button"
            className="quick-quote-return-analysis"
            onClick={onReturnToAnalysis}
          >
            {copy.returnToJobAnalysis}
          </button>
        ) : null}
        <div className="quick-quote-prompt-heading">
          <span className="quick-quote-assistant-mark" aria-hidden="true"><MeetroIcon name="assistant" size={22} /></span>
          <div>
            <strong>{copy.assistant}</strong>
            <p>{isRevision ? copy.revisionHelp : copy.promptLabel}</p>
          </div>
        </div>
        <label className="quick-quote-prompt-label">
          <span>{isRevision ? copy.revisionTitle : copy.promptLabel}</span>
          <textarea
            ref={promptRef}
            value={prompt}
            rows={5}
            maxLength={4000}
            placeholder={copy.promptPlaceholder}
            onChange={(event) => onPromptChange(event.target.value)}
          />
        </label>
        <div className="quick-quote-input-row" role="group" aria-label={copy.promptLabel}>
          <WorkflowMicrophoneInput
            language={language}
            contextLabel="quick-quote"
            idleLabel={copy.speak}
            setPage={setPage}
            onTranscript={(transcript) => onPromptChange([prompt, transcript].filter(Boolean).join(" "))}
          />
          <button type="button" onClick={() => promptRef.current?.focus()}>
            <MeetroIcon name="editPortfolio" size={18} />
            {copy.type}
          </button>
          <button
            type="button"
            disabled={!canAddPhotos || photoBusy}
            aria-describedby={!canAddPhotos ? "quick-quote-photo-authority" : undefined}
            onClick={onAddPhotos}
          >
            <MeetroIcon name="photoCount" size={18} />
            {copy.addPhotos}{photoCount ? ` (${photoCount})` : ""}
          </button>
        </div>

        {photos.length ? (
          <section
            className="quick-quote-photo-review"
            aria-label={copy.photos}
          >
            <div className="quick-quote-photo-review-heading">
              <div>
                <strong>{copy.photos}</strong>
                <p>{copy.photoDraftNotice}</p>
              </div>
              <button
                type="button"
                disabled={!canAddPhotos || photoBusy}
                onClick={onAddPhotos}
              >
                <MeetroIcon name="photoCount" size={18} />
                {copy.addAnotherPhoto}
              </button>
            </div>

            <div className="quick-quote-photo-grid">
              {photos.map((photo, index) => (
                <figure
                  key={photo.id}
                  className="quick-quote-photo-item"
                >
                  {photo.previewUrl ? (
                    <img
                      src={photo.previewUrl}
                      alt={`${copy.photos} ${index + 1}`}
                    />
                  ) : null}
                  <button
                    type="button"
                    disabled={photoBusy}
                    onClick={() =>
                      onRemovePhoto?.(photo.id)
                    }
                    aria-label={copy.removePhoto(index + 1)}
                  >
                    {copy.remove}
                  </button>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {!canAddPhotos ? <p id="quick-quote-photo-authority" className="quick-quote-media-gap">{copy.photoUnavailable}</p> : null}
        <div className="quick-quote-prompt-actions">
          {isRevision ? <button type="button" onClick={onCancelRevision}>{copy.cancel}</button> : null}
          <button
            type="button"
            className="quick-quote-primary-action"
            disabled={
              photoBusy ||
              (!prompt.trim() && photoCount === 0)
            }
            onClick={() => onPrepare(isRevision)}
          >
            {isRevision
              ? copy.revise
              : analysisStale
              ? copy.analyzeUpdated
              : copy.prepare}
          </button>
        </div>

        {notice ? (
          <p
            className="quick-quote-action-notice"
            role="status"
          >
            {notice}
          </p>
        ) : null}
      </section>
    </main>
  );
}
