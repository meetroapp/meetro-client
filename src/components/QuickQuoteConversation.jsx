import { useEffect, useRef } from "react";

import MeetroIcon from "./MeetroIcon.jsx";
import WorkflowMicrophoneInput from "./WorkflowMicrophoneInput.jsx";
import { getQuickQuoteConversationCopy } from "../utils/quickQuoteConversationLanguage.js";

function formatMoney(value, language) {
  return new Intl.NumberFormat(language === "pt-BR" ? "pt-BR" : language, {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}

function SummarySection({ title, children, emphasized = false }) {
  return (
    <section className={`quick-quote-summary-section${emphasized ? " quick-quote-summary-total" : ""}`}>
      <span>{title}</span>
      <div>{children}</div>
    </section>
  );
}

export default function QuickQuoteConversation({
  language = "en",
  view = "entry",
  prompt,
  onPromptChange,
  onPrepare,
  onOpenRevision,
  onCancelRevision,
  onEditDetails,
  detailsExpanded = false,
  onToggleDetails,
  onPreviewPdf,
  onSharePdf,
  setPage,
  summary,
  photoCount = 0,
  photos = [],
  canAddPhotos = false,
  onAddPhotos,
  onRemovePhoto,
  notice = "",
}) {
  const copy = getQuickQuoteConversationCopy(language);
  const promptRef = useRef(null);
  const surfaceRef = useRef(null);
  const isRevision = view === "revision";

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
          {copy.stages.map((stage) => <li key={stage}>{stage}</li>)}
        </ol>
      </main>
    );
  }

  if (view === "review") {
    return (
      <main ref={surfaceRef} tabIndex={-1} className="quick-quote-conversation" aria-labelledby="quick-quote-review-title">
        <header className="quick-quote-flow-header">
          <p>{copy.organizedFromInstructions}</p>
          <h1 id="quick-quote-review-title">{copy.reviewTitle}</h1>
          <div className="quick-quote-guidance">
            <strong>{copy.reviewGuidanceTitle}</strong>
            <span>{copy.reviewGuidanceBody}</span>
          </div>
        </header>
        <div className="quick-quote-review-card">
          <div className="quick-quote-review-grid">
            <SummarySection title={copy.customer}>
              <strong>{summary.customerName || copy.notProvided}</strong>
              {summary.customerLocation ? <p>{summary.customerLocation}</p> : null}
            </SummarySection>
            <SummarySection title={copy.scope}>
              <p>{summary.scope || copy.notProvided}</p>
            </SummarySection>
            <SummarySection title={copy.materials}>
              {summary.materials.length ? (
                <ul>{summary.materials.map((material) => <li key={material}>{material}</li>)}</ul>
              ) : <p>{copy.noMaterials}</p>}
            </SummarySection>
            <SummarySection title={copy.laborDuration}>
              <p>{summary.labor || copy.notProvided}</p>
              <p>{summary.duration || copy.notProvided}</p>
            </SummarySection>
            <SummarySection title={copy.paymentTerms}>
              <p>{summary.paymentTerms || copy.notProvided}</p>
            </SummarySection>
            <SummarySection title={copy.notes}>
              <p>{summary.notes || copy.notProvided}</p>
            </SummarySection>
            <SummarySection title={copy.total} emphasized>
              <strong>{formatMoney(summary.total, language)}</strong>
            </SummarySection>
          </div>
          <section
            className="quick-quote-photo-review"
            aria-label={copy.photos}
          >
            <div className="quick-quote-photo-review-heading">
              <div>
                <strong>{copy.photos}</strong>
                <p>{copy.photoDraftNotice}</p>
              </div>
              <button type="button" onClick={onAddPhotos}>
                <MeetroIcon name="photoCount" size={18} />
                {copy.addPhotos}
              </button>
            </div>

            {photos.length ? (
              <div className="quick-quote-photo-grid">
                {photos.map((photo, index) => (
                  <figure key={photo.id} className="quick-quote-photo-item">
                    {photo.previewUrl ? (
                      <img
                        src={photo.previewUrl}
                        alt={`${copy.photos} ${index + 1}`}
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onRemovePhoto?.(photo.id)}
                      aria-label={copy.removePhoto(index + 1)}
                    >
                      {copy.remove}
                    </button>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="quick-quote-photo-empty">{copy.noPhotos}</p>
            )}
          </section>

          <div className="quick-quote-review-actions" aria-label={copy.reviewTitle}>
            <button type="button" onClick={onOpenRevision}>
              <MeetroIcon name="assistant" size={18} />
              {copy.askRevise}
            </button>
            <button type="button" onClick={onEditDetails}>
              <MeetroIcon name="editPortfolio" size={18} />
              {copy.editDetails}
            </button>
            <button type="button" onClick={onPreviewPdf}>
              <MeetroIcon name="preview" size={18} />
              {copy.previewPdf}
            </button>
            <button type="button" className="quick-quote-primary-action" onClick={onSharePdf}>
              <MeetroIcon name="share" size={18} />
              {copy.sharePdf}
            </button>
          </div>
          <div className="quick-quote-details-disclosure">
            <button
              type="button"
              className="quick-quote-details-toggle"
              aria-expanded={detailsExpanded}
              aria-controls="quick-quote-full-details"
              onClick={onToggleDetails}
            >
              <span>{copy.fullDetailsLabel}</span>
              <span aria-hidden="true">{detailsExpanded ? "▴" : "▾"}</span>
            </button>
            <p>{copy.fullDetailsGuidance}</p>
          </div>
          <p className="quick-quote-draft-truth" role="status">{copy.draftTruth}</p>
          {notice ? <p className="quick-quote-action-notice" role="status">{notice}</p> : null}
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
            disabled={!canAddPhotos}
            aria-describedby={!canAddPhotos ? "quick-quote-photo-authority" : undefined}
            onClick={onAddPhotos}
          >
            <MeetroIcon name="photoCount" size={18} />
            {copy.addPhotos}{photoCount ? ` (${photoCount})` : ""}
          </button>
        </div>
        {!canAddPhotos ? <p id="quick-quote-photo-authority" className="quick-quote-media-gap">{copy.photoUnavailable}</p> : null}
        <div className="quick-quote-prompt-actions">
          {isRevision ? <button type="button" onClick={onCancelRevision}>{copy.cancel}</button> : null}
          <button type="button" className="quick-quote-primary-action" disabled={!prompt.trim()} onClick={() => onPrepare(isRevision)}>
            {isRevision ? copy.revise : copy.prepare}
          </button>
        </div>
      </section>
    </main>
  );
}
