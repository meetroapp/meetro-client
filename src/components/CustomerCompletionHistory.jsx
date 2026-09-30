import { useEffect, useState } from "react";
import { fetchCustomerJobHistory } from "../utils/jobCompletionApi.js";
import { fetchCustomerJobQuotes } from "../utils/customerJobQuotesApi.js";
import { fetchCustomerJobInvoice } from "../utils/invoicePaymentApi.js";
import { fetchCustomerJobWorkPlan } from "../utils/workPlanApi.js";
import { fetchCustomerEfr } from "../utils/customerEfrApi.js";
import { getJobCompletionCopy } from "../utils/jobCompletionLanguage.js";
import { getCustomerRelationshipsCopy } from "../utils/customerRelationshipsLanguage.js";

function localeFor(language) {
  return { en: "en-US", es: "es", fr: "fr", "pt-BR": "pt-BR" }[language] || "en-US";
}

function displayDate(value, language) {
  return new Intl.DateTimeFormat(localeFor(language), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function displayMoney(approvedQuote, language) {
  if (!approvedQuote) return "";
  return new Intl.NumberFormat(localeFor(language), {
    style: "currency",
    currency: approvedQuote.currency,
  }).format(approvedQuote.totalMinor / 100);
}


const CUSTOMER_JOB_HISTORY_TABS = Object.freeze([
  "overview",
  "work",
  "quotes",
  "invoices",
  "documents",
]);

const CUSTOMER_JOB_HISTORY_READ_ONLY = Object.freeze({
  en: "This completed Job History is read-only. Historical records are not changed from this screen.",
  es: "Este historial de trabajo completado es de solo lectura. Los registros históricos no se modifican desde esta pantalla.",
  fr: "Cet historique de travail terminé est en lecture seule. Les dossiers historiques ne sont pas modifiés depuis cet écran.",
  "pt-BR": "Este histórico de trabalho concluído é somente leitura. Os registros históricos não são alterados nesta tela.",
});

function displayMoneyMinor(minor, currency, language) {
  const amount = Number(minor);

  if (
    !Number.isSafeInteger(amount) ||
    typeof currency !== "string" ||
    !currency
  ) {
    return "—";
  }

  return new Intl.NumberFormat(localeFor(language), {
    style: "currency",
    currency,
  }).format(amount / 100);
}

function settledValue(result) {
  return result?.status === "fulfilled"
    ? result.value
    : null;
}

function HistorySection({ title, children }) {
  return (
    <section style={styles.historyCard}>
      <h3 style={styles.historyCardTitle}>{title}</h3>
      {children}
    </section>
  );
}

function HistoryEmpty({ children }) {
  return (
    <p style={styles.historyEmpty}>
      {children}
    </p>
  );
}

function HistoryRecord({
  title,
  status,
  meta,
  amount,
  children,
}) {
  return (
    <article style={styles.historyRecord}>
      <div style={styles.historyRecordHeader}>
        <div style={styles.historyRecordMain}>
          <strong style={styles.historyRecordTitle}>
            {title}
          </strong>

          {meta ? (
            <span style={styles.historyRecordMeta}>
              {meta}
            </span>
          ) : null}
        </div>

        <div style={styles.historyRecordAside}>
          {status ? (
            <span style={styles.historyPill}>
              {status}
            </span>
          ) : null}

          {amount ? (
            <strong style={styles.historyAmount}>
              {amount}
            </strong>
          ) : null}
        </div>
      </div>

      {children}
    </article>
  );
}

export default function CustomerCompletionHistory({
  jobId,
  language = "en",
  setPage,
  onMessageProfessional,
}) {
  const copy = getJobCompletionCopy(language);
  const historyCopy = getCustomerRelationshipsCopy(language);

  const [activeTab, setActiveTab] = useState("overview");

  const [state, setState] = useState({
    status: "loading",
    history: null,
    quotes: [],
    invoice: null,
    workPlan: null,
    assessment: null,
    optionalReads: {},
    error: "",
  });

  useEffect(() => {
    let active = true;

    setActiveTab("overview");

    if (!jobId) {
      queueMicrotask(() => {
        if (active) {
          setState({
            status: "idle",
            history: null,
            quotes: [],
            invoice: null,
            workPlan: null,
            assessment: null,
            optionalReads: {},
            error: "",
          });
        }
      });

      return () => {
        active = false;
      };
    }

    queueMicrotask(() => {
      if (active) {
        setState((current) => ({
          ...current,
          status: "loading",
          history: null,
          error: "",
        }));
      }
    });

    void fetchCustomerJobHistory({
      jobId,
      setPage,
    })
      .then(async (history) => {
        const results = await Promise.allSettled([
          fetchCustomerJobQuotes({
            jobId,
            limit: 50,
            setPage,
          }),

          fetchCustomerJobInvoice({
            jobId,
            setPage,
          }),

          fetchCustomerJobWorkPlan({
            jobId,
            setPage,
          }),

          fetchCustomerEfr({
            jobId,
            setPage,
          }),
        ]);

        if (!active) return;

        const quoteCollection =
          settledValue(results[0]);

        setState({
          status: "ready",
          history,
          quotes:
            quoteCollection?.quotes || [],
          invoice:
            settledValue(results[1]),
          workPlan:
            settledValue(results[2]),
          assessment:
            settledValue(results[3]),
          optionalReads: {
            quotes: results[0].status,
            invoice: results[1].status,
            workPlan: results[2].status,
            assessment: results[3].status,
          },
          error: "",
        });
      })
      .catch((error) => {
        if (!active) return;

        if (
          error?.status === 404 &&
          error?.code ===
            "JOB_HISTORY_UNAVAILABLE"
        ) {
          setState({
            status: "unavailable",
            history: null,
            quotes: [],
            invoice: null,
            workPlan: null,
            assessment: null,
            optionalReads: {},
            error: "",
          });

          return;
        }

        setState({
          status: "error",
          history: null,
          quotes: [],
          invoice: null,
          workPlan: null,
          assessment: null,
          optionalReads: {},
          error: String(
            error?.code ||
            "JOB_HISTORY_FAILED"
          ),
        });
      });

    return () => {
      active = false;
    };
  }, [jobId, setPage]);

  if (!jobId || state.status === "idle") {
    return null;
  }

  if (state.status === "loading") {
    return (
      <p role="status">
        {copy.loading}
      </p>
    );
  }

  if (state.status === "unavailable") {
    return (
      <p role="status">
        {copy.historyUnavailable}
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p
        role="alert"
        style={styles.error}
        data-customer-job-history-error={
          state.error
        }
      >
        {copy.historyUnavailable}
      </p>
    );
  }

  const history = state.history;
  if (!history) return null;

  const quotes = state.quotes;
  const invoice = state.invoice;
  const workPlan = state.workPlan;

  const historyRecords =
    history.historyRecords;

  const deposits =
    historyRecords.deposits;

  const media =
    historyRecords.media;

  const visits =
    historyRecords.visits;

  const assessment =
    state.assessment ||
    historyRecords.emergencyAssessment;

  const hasCounts =
    history.completionSummary.workstreamCount > 0 ||
    history.completionSummary.workItemCount > 0 ||
    history.completionSummary.customerUpdateCount > 0;

  const historyDocumentCount =
    quotes.length +
    (invoice ? 1 : 0) +
    media.length;

  return (
    <section
      style={styles.historyWorkspace}
      aria-labelledby="customer-job-history-title"
      data-customer-job-history-job-id={
        history.jobId
      }
      data-customer-full-job-history={
        history.jobId
      }
    >
      <header style={styles.historyHero}>
        <span style={styles.eyebrow}>
          {historyCopy.title}
        </span>

        <h2
          id="customer-job-history-title"
          style={styles.historyTitle}
        >
          {history.serviceTitle}
        </h2>

        <p style={styles.purpose}>
          {history.professionalName}
          {" · "}
          {copy.completedOn}{" "}
          {displayDate(
            history.completedAt,
            language
          )}
        </p>

        <strong style={styles.historyCompleted}>
          {copy.workCompleted}
        </strong>
      </header>

      <nav
        style={styles.historyTabs}
        aria-label={historyCopy.title}
      >
        {CUSTOMER_JOB_HISTORY_TABS.map(
          (tab) => {
            const labels = {
              overview: historyCopy.overview,
              work: historyCopy.work,
              quotes: historyCopy.quotes,
              invoices: historyCopy.invoices,
              documents:
                historyCopy.documentsPhotos,
            };

            return (
              <button
                key={tab}
                type="button"
                style={
                  activeTab === tab
                    ? styles.historyTabActive
                    : styles.historyTab
                }
                aria-pressed={
                  activeTab === tab
                }
                onClick={() =>
                  setActiveTab(tab)
                }
              >
                {labels[tab]}
              </button>
            );
          }
        )}
      </nav>

      {activeTab === "overview" && (
        <div style={styles.historySections}>
          <HistorySection
            title={historyCopy.historySummary}
          >
            <div style={styles.historySummaryGrid}>
              <span style={styles.historySummaryItem}>
                <small>
                  {historyCopy.status}
                </small>
                <strong>
                  {historyCopy.completed}
                </strong>
              </span>

              <span style={styles.historySummaryItem}>
                <small>
                  {copy.approvedAmount}
                </small>

                <strong>
                  {history.approvedQuote
                    ? displayMoney(
                        history.approvedQuote,
                        language
                      )
                    : "—"}
                </strong>
              </span>

              <span style={styles.historySummaryItem}>
                <small>
                  {copy.completed}
                </small>
                <strong>
                  {
                    history
                      .completionSummary
                      .workItemCount
                  }
                </strong>
              </span>

              <span style={styles.historySummaryItem}>
                <small>
                  {copy.customerUpdates}
                </small>
                <strong>
                  {
                    history
                      .completionSummary
                      .customerUpdateCount
                  }
                </strong>
              </span>
            </div>
          </HistorySection>

          {history.originalRequest && (
            <HistorySection
              title={copy.originalRequest}
            >
              <p style={styles.body}>
                {
                  history
                    .originalRequest
                    .concern
                }
              </p>

              <p
                style={
                  styles.historyRecordMeta
                }
              >
                {displayDate(
                  history
                    .originalRequest
                    .reportedAt,
                  language
                )}
              </p>
            </HistorySection>
          )}

          {assessment && (
            <HistorySection title="Project assessment">
              {assessment.evaluation && (
                <HistoryRecord
                  title="Evaluation"
                  status={
                    assessment
                      .evaluation
                      .status
                  }
                  meta={
                    assessment
                      .evaluation
                      .completedAt
                      ? displayDate(
                          assessment
                            .evaluation
                            .completedAt,
                          language
                        )
                      : ""
                  }
                />
              )}

              {assessment.findings.length > 0 && (
                <div style={styles.historyStack}>
                  <strong>
                    Findings
                  </strong>

                  {assessment.findings.map(
                    (finding) => (
                      <HistoryRecord
                        key={finding.id}
                        title={
                          finding.statement
                        }
                        status={
                          finding.state
                        }
                      />
                    )
                  )}
                </div>
              )}

              {assessment
                .recommendations
                .length > 0 && (
                <div style={styles.historyStack}>
                  <strong>
                    Recommendations
                  </strong>

                  {assessment
                    .recommendations
                    .map(
                      (recommendation) => (
                        <HistoryRecord
                          key={
                            recommendation.id
                          }
                          title={
                            recommendation
                              .statement
                          }
                          status={
                            recommendation
                              .state
                          }
                        />
                      )
                    )}
                </div>
              )}
            </HistorySection>
          )}

          {deposits.length > 0 && (
            <HistorySection
              title={historyCopy.deposits}
            >
              <div style={styles.historyStack}>
                {deposits.map((deposit) => {
                  const quote =
                    quotes.find(
                      (candidate) =>
                        candidate.quoteId ===
                        deposit.quoteId
                    );

                  return (
                    <HistoryRecord
                      key={deposit.quoteId}
                      title={
                        quote?.quoteNumber
                          ? `${historyCopy.deposit} · ${quote.quoteNumber}`
                          : historyCopy.deposit
                      }
                      status={deposit.state.replaceAll(
                        "_",
                        " "
                      )}
                      amount={displayMoneyMinor(
                        deposit.requiredMinor,
                        deposit.currency,
                        language
                      )}
                    >
                      <div
                        style={
                          styles.historyAmountGrid
                        }
                      >
                        <span>
                          {historyCopy.required}
                          <strong>
                            {displayMoneyMinor(
                              deposit.requiredMinor,
                              deposit.currency,
                              language
                            )}
                          </strong>
                        </span>

                        <span>
                          {historyCopy.applied}
                          <strong>
                            {displayMoneyMinor(
                              deposit.appliedMinor,
                              deposit.currency,
                              language
                            )}
                          </strong>
                        </span>

                        <span>
                          {historyCopy.balance}
                          <strong>
                            {displayMoneyMinor(
                              deposit.remainingMinor,
                              deposit.currency,
                              language
                            )}
                          </strong>
                        </span>
                      </div>

                      {deposit.payments.length > 0 && (
                        <div
                          style={
                            styles.historyStack
                          }
                        >
                          <strong>
                            {
                              historyCopy
                                .paymentHistory
                            }
                          </strong>

                          {deposit.payments.map(
                            (
                              payment,
                              index
                            ) => (
                              <HistoryRecord
                                key={`${payment.receivedAt}-${index}`}
                                title={
                                  historyCopy
                                    .depositReceived
                                }
                                status={
                                  payment.method
                                }
                                meta={displayDate(
                                  payment.receivedAt,
                                  language
                                )}
                                amount={displayMoneyMinor(
                                  payment.grossAmountMinor,
                                  payment.currency,
                                  language
                                )}
                              />
                            )
                          )}
                        </div>
                      )}
                    </HistoryRecord>
                  );
                })}
              </div>
            </HistorySection>
          )}

          {visits.length > 0 && (
            <HistorySection
              title={historyCopy.visits}
            >
              <div style={styles.historyStack}>
                {visits.map((visit) => (
                  <HistoryRecord
                    key={visit.visitId}
                    title={
                      visit.purpose === "EVALUATION"
                        ? "Evaluation visit"
                        : "Work visit"
                    }
                    status={visit.state}
                    meta={
                      visit.scheduledStartAt
                        ? `${historyCopy.scheduled}: ${displayDate(
                            visit.scheduledStartAt,
                            language
                          )}`
                        : ""
                    }
                  />
                ))}
              </div>
            </HistorySection>
          )}

          {hasCounts && (
            <HistorySection
              title={copy.workCompleted}
            >
              <div style={styles.metrics}>
                <span>
                  <strong>
                    {
                      history
                        .completionSummary
                        .workstreamCount
                    }
                  </strong>{" "}
                  {copy.work}
                </span>

                <span>
                  <strong>
                    {
                      history
                        .completionSummary
                        .workItemCount
                    }
                  </strong>{" "}
                  {copy.completed}
                </span>

                <span>
                  <strong>
                    {
                      history
                        .completionSummary
                        .customerUpdateCount
                    }
                  </strong>{" "}
                  {copy.customerUpdates}
                </span>
              </div>
            </HistorySection>
          )}

          <HistorySection
            title={copy.preservedRecord}
          >
            <p style={styles.body}>
              {history.sourceType ===
              "emergency_request"
                ? copy.emergencyPreservedRecordBody
                : copy.preservedRecordBody}
            </p>
          </HistorySection>
        </div>
      )}

      {activeTab === "work" && (
        <div style={styles.historySections}>
          <HistorySection
            title={historyCopy.workPerformed}
          >
            {workPlan?.workstreams?.length ? (
              <div style={styles.historyStack}>
                {workPlan.workstreams.map(
                  (workstream) => (
                    <article
                      key={workstream.id}
                      style={
                        styles.historyWorkstream
                      }
                    >
                      <div
                        style={
                          styles
                            .historyRecordHeader
                        }
                      >
                        <strong>
                          {workstream.title}
                        </strong>

                        <span
                          style={
                            styles.historyPill
                          }
                        >
                          {workstream.status}
                        </span>
                      </div>

                      {workstream.activities.map(
                        (activity) => (
                          <HistoryRecord
                            key={
                              activity.id
                            }
                            title={
                              activity.statement
                            }
                            status={
                              activity.status
                            }
                            meta={
                              activity.performedAt
                                ? displayDate(
                                    activity
                                      .performedAt,
                                    language
                                  )
                                : ""
                            }
                          />
                        )
                      )}

                      {workstream.updates.map(
                        (update, index) => (
                          <p
                            key={`${workstream.id}-update-${index}`}
                            style={
                              styles
                                .historyUpdate
                            }
                          >
                            {update.statement}
                          </p>
                        )
                      )}
                    </article>
                  )
                )}
              </div>
            ) : (
              <div style={styles.historySummaryGrid}>
                <span style={styles.historySummaryItem}>
                  <small>{copy.work}</small>
                  <strong>
                    {
                      history
                        .completionSummary
                        .workstreamCount
                    }
                  </strong>
                </span>

                <span style={styles.historySummaryItem}>
                  <small>
                    {copy.completed}
                  </small>
                  <strong>
                    {
                      history
                        .completionSummary
                        .workItemCount
                    }
                  </strong>
                </span>

                <span style={styles.historySummaryItem}>
                  <small>
                    {copy.customerUpdates}
                  </small>
                  <strong>
                    {
                      history
                        .completionSummary
                        .customerUpdateCount
                    }
                  </strong>
                </span>
              </div>
            )}
          </HistorySection>
        </div>
      )}

      {activeTab === "quotes" && (
        <div style={styles.historySections}>
          <HistorySection
            title={historyCopy.quotes}
          >
            {quotes.length ? (
              <div style={styles.historyStack}>
                {quotes.map((quote) => (
                  <HistoryRecord
                    key={quote.quoteId}
                    title={
                      quote.quoteNumber ||
                      historyCopy.quote
                    }
                    status={
                      quote.customerDecision ||
                      quote.businessStatus
                    }
                    meta={`${quote.lineageLabel} · ${
                      historyCopy.issued
                    } ${displayDate(
                      quote.issuedAt,
                      language
                    )}`}
                    amount={displayMoneyMinor(
                      quote.totalMinor,
                      quote.currency,
                      language
                    )}
                  />
                ))}
              </div>
            ) : (
              <HistoryEmpty>
                {historyCopy.noQuotes}
              </HistoryEmpty>
            )}
          </HistorySection>
        </div>
      )}

      {activeTab === "invoices" && (
        <div style={styles.historySections}>
          <HistorySection
            title={historyCopy.invoices}
          >
            {invoice ? (
              <div style={styles.historyStack}>
                <HistoryRecord
                  title={
                    invoice.invoiceNumber
                  }
                  status={invoice.status}
                  meta={
                    invoice.issuedAt
                      ? `${
                          historyCopy.issued
                        } ${displayDate(
                          invoice.issuedAt,
                          language
                        )}`
                      : displayDate(
                          invoice.invoiceDate,
                          language
                        )
                  }
                  amount={displayMoneyMinor(
                    invoice.totalMinor,
                    invoice.currency,
                    language
                  )}
                >
                  <div
                    style={
                      styles.historyAmountGrid
                    }
                  >
                    <span>
                      {historyCopy.total}
                      <strong>
                        {displayMoneyMinor(
                          invoice.totalMinor,
                          invoice.currency,
                          language
                        )}
                      </strong>
                    </span>

                    <span>
                      {historyCopy.paid}
                      <strong>
                        {displayMoneyMinor(
                          invoice.paidMinor,
                          invoice.currency,
                          language
                        )}
                      </strong>
                    </span>

                    <span>
                      {historyCopy.balance}
                      <strong>
                        {displayMoneyMinor(
                          invoice.balanceMinor,
                          invoice.currency,
                          language
                        )}
                      </strong>
                    </span>
                  </div>
                </HistoryRecord>

                {invoice.lineItems.map(
                  (line) => (
                    <HistoryRecord
                      key={`${line.sequence}-${line.description}`}
                      title={
                        line.description
                      }
                      status={
                        line.type ===
                        "approvedWork"
                          ? "Approved work"
                          : "Extra work"
                      }
                      meta={`Qty ${line.quantity}`}
                      amount={displayMoneyMinor(
                        line.lineTotalMinor,
                        invoice.currency,
                        language
                      )}
                    />
                  )
                )}

                {invoice.payments.length > 0 && (
                  <div style={styles.historyStack}>
                    <strong>
                      {
                        historyCopy
                          .paymentHistory
                      }
                    </strong>

                    {invoice.payments.map(
                      (payment, index) => (
                        <HistoryRecord
                          key={`${payment.recordedAt}-${index}`}
                          title={
                            historyCopy
                              .invoicePaymentReceived
                          }
                          status={
                            payment.method
                          }
                          meta={displayDate(
                            payment.receivedDate,
                            language
                          )}
                          amount={displayMoneyMinor(
                            payment.amountMinor,
                            payment.currency,
                            language
                          )}
                        />
                      )
                    )}
                  </div>
                )}
              </div>
            ) : (
              <HistoryEmpty>
                {historyCopy.noInvoices}
              </HistoryEmpty>
            )}
          </HistorySection>
        </div>
      )}

      {activeTab === "documents" && (
        <div style={styles.historySections}>
          <HistorySection
            title={
              historyCopy.documentsPhotos
            }
          >
            {historyDocumentCount ? (
              <div style={styles.historyStack}>
                <strong>
                  {
                    historyCopy
                      .documentsLabel
                  }
                </strong>

                {quotes.map((quote) => (
                  <HistoryRecord
                    key={`document-${quote.quoteId}`}
                    title={
                      quote.quoteNumber ||
                      historyCopy.quote
                    }
                    status={
                      historyCopy.canonicalQuote
                    }
                    meta={`${quote.lineageLabel} · ${
                      historyCopy.issued
                    } ${displayDate(
                      quote.issuedAt,
                      language
                    )}`}
                  />
                ))}

                {invoice && (
                  <HistoryRecord
                    title={
                      invoice.invoiceNumber
                    }
                    status={
                      historyCopy
                        .canonicalInvoice
                    }
                    meta={
                      invoice.issuedAt
                        ? `${
                            historyCopy.issued
                          } ${displayDate(
                            invoice.issuedAt,
                            language
                          )}`
                        : ""
                    }
                  />
                )}

                {media.length > 0 ? (
                  <div style={styles.historyStack}>
                    <strong>
                      {historyCopy.photosLabel}
                    </strong>

                    <div
                      style={styles.historyMediaGrid}
                    >
                      {media.map((photo) => (
                        <a
                          key={photo.mediaId}
                          href={photo.secureUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={
                            historyCopy.openPhoto
                          }
                          style={
                            styles.historyMediaCard
                          }
                        >
                          <img
                            src={photo.secureUrl}
                            alt={
                              historyCopy.requestPhoto
                            }
                            style={
                              styles.historyMediaImage
                            }
                          />

                          <span
                            style={
                              styles.historyMediaBody
                            }
                          >
                            <strong>
                              {
                                historyCopy
                                  .requestPhoto
                              }
                            </strong>

                            {photo.uploadedAt ? (
                              <small>
                                {displayDate(
                                  photo.uploadedAt,
                                  language
                                )}
                              </small>
                            ) : null}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p
                    style={
                      styles.historyRecordMeta
                    }
                  >
                    {historyCopy.photosLabel}: —
                  </p>
                )}
              </div>
            ) : (
              <HistoryEmpty>
                {
                  historyCopy
                    .noDocumentsPhotos
                }
              </HistoryEmpty>
            )}
          </HistorySection>
        </div>
      )}

      <p style={styles.historyReadOnly}>
        {
          CUSTOMER_JOB_HISTORY_READ_ONLY[
            language
          ] ||
          CUSTOMER_JOB_HISTORY_READ_ONLY.en
        }
      </p>

      {history.actions.canMessageProfessional &&
        onMessageProfessional && (
          <button
            type="button"
            style={styles.primaryButton}
            onClick={
              onMessageProfessional
            }
          >
            {copy.messageProfessional}
          </button>
        )}
    </section>
  );
}

const styles = {
  section: {
    display: "grid",
    gap: 16,
    margin: "16px 0",
    padding: "18px 0",
    borderTop: "1px solid #cbd5e1",
    borderBottom: "1px solid #cbd5e1",
    minWidth: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  eyebrow: {
    color: "#475569",
    fontSize: 12,
    fontWeight: 800,
  },
  title: {
    margin: "3px 0 0",
    fontSize: 22,
    letterSpacing: 0,
  },
  subheading: {
    margin: 0,
    fontSize: 17,
    letterSpacing: 0,
  },
  purpose: {
    margin: "6px 0 0",
    color: "#475569",
    lineHeight: 1.5,
  },
  status: {
    color: "#1f5132",
    fontSize: 13,
  },
  metrics: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    padding: "14px 0",
    borderTop: "1px solid #cbd5e1",
    borderBottom: "1px solid #cbd5e1",
  },
  record: {
    display: "grid",
    gap: 6,
    paddingLeft: 12,
    borderLeft: "3px solid #1f5132",
  },
  body: {
    margin: 0,
    lineHeight: 1.55,
    overflowWrap: "anywhere",
  },
  primaryButton: {
    minHeight: 44,
    width: "fit-content",
    padding: "10px 16px",
    border: "1px solid #1f5132",
    borderRadius: 6,
    background: "#1f5132",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  error: {
    margin: "16px 0",
    color: "#991b1b",
  },

  historyWorkspace: {
    display: "grid",
    gap: 16,
    width: "100%",
    minWidth: 0,
    paddingBottom: 28,
  },

  historyHero: {
    display: "grid",
    justifyItems: "center",
    gap: 6,
    minWidth: 0,
    padding: "20px 16px",
    border: "1px solid #dce5d8",
    borderRadius: 18,
    background:
      "linear-gradient(135deg, #fffdfa 0%, #eef8f1 100%)",
    textAlign: "center",
  },

  historyTitle: {
    margin: 0,
    maxWidth: "100%",
    color: "#123b27",
    fontSize: "clamp(24px, 4vw, 38px)",
    lineHeight: 1.1,
    overflowWrap: "anywhere",
  },

  historyCompleted: {
    marginTop: 4,
    padding: "5px 10px",
    borderRadius: 999,
    color: "#17653b",
    background: "#e1f6e8",
    fontSize: 12,
    fontWeight: 900,
  },

  historyTabs: {
    display: "flex",
    gap: 8,
    width: "100%",
    minWidth: 0,
    overflowX: "auto",
    paddingBottom: 3,
  },

  historyTab: {
    flex: "0 0 auto",
    minHeight: 44,
    padding: "9px 14px",
    border: "1px solid #ccd9cf",
    borderRadius: 999,
    color: "#31543f",
    background: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },

  historyTabActive: {
    flex: "0 0 auto",
    minHeight: 44,
    padding: "9px 14px",
    border: "1px solid #0b5d3b",
    borderRadius: 999,
    color: "#fff",
    background: "#0b5d3b",
    fontWeight: 900,
    cursor: "pointer",
  },

  historySections: {
    display: "grid",
    gap: 14,
    minWidth: 0,
  },

  historyCard: {
    minWidth: 0,
    padding: 16,
    border: "1px solid #dfe6dc",
    borderRadius: 14,
    background: "#fff",
  },

  historyCardTitle: {
    margin: "0 0 12px",
    color: "#1d492f",
    fontSize: 17,
  },

  historySummaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(135px, 1fr))",
    gap: 9,
    minWidth: 0,
  },

  historySummaryItem: {
    display: "grid",
    gap: 5,
    minWidth: 0,
    padding: 12,
    border: "1px solid #e1e7df",
    borderRadius: 11,
    background: "#fafbf8",
  },

  historyStack: {
    display: "grid",
    gap: 9,
    minWidth: 0,
  },

  historyRecord: {
    minWidth: 0,
    padding: 13,
    border: "1px solid #dfe6dc",
    borderRadius: 12,
    background: "#fff",
  },

  historyRecordHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    flexWrap: "wrap",
  },

  historyRecordMain: {
    display: "grid",
    gap: 4,
    minWidth: 0,
    flex: "1 1 210px",
  },

  historyRecordTitle: {
    color: "#1d3023",
    overflowWrap: "anywhere",
  },

  historyRecordMeta: {
    color: "#69766d",
    fontSize: 12,
    lineHeight: 1.4,
    overflowWrap: "anywhere",
  },

  historyRecordAside: {
    display: "grid",
    justifyItems: "end",
    gap: 5,
  },

  historyPill: {
    maxWidth: "100%",
    padding: "4px 8px",
    borderRadius: 999,
    color: "#245b39",
    background: "#edf4ec",
    fontSize: 11,
    fontWeight: 900,
    overflowWrap: "anywhere",
  },

  historyAmount: {
    color: "#16773f",
  },

  historyAmountGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(100px, 1fr))",
    gap: 8,
    marginTop: 12,
  },

  historyWorkstream: {
    display: "grid",
    gap: 9,
    minWidth: 0,
    padding: 13,
    border: "1px solid #dfe6dc",
    borderRadius: 13,
    background: "#fafbf8",
  },

  historyUpdate: {
    margin: 0,
    padding: "9px 11px",
    borderLeft: "3px solid #9abda5",
    color: "#536459",
    background: "#f6faf7",
    lineHeight: 1.45,
  },

  historyEmpty: {
    margin: 0,
    padding: 15,
    border: "1px solid #e1e7df",
    borderRadius: 12,
    color: "#66736a",
    background: "#fafbf8",
  },

  historyReadOnly: {
    margin: "2px 0 0",
    color: "#68776d",
    fontSize: 12,
    lineHeight: 1.5,
    textAlign: "center",
  },



  historyMediaGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 10,
    minWidth: 0,
  },

  historyMediaCard: {
    display: "grid",
    minWidth: 0,
    overflow: "hidden",
    border: "1px solid #dfe6dc",
    borderRadius: 12,
    color: "#1d3023",
    background: "#fff",
    textDecoration: "none",
  },

  historyMediaImage: {
    display: "block",
    width: "100%",
    aspectRatio: "16 / 9",
    objectFit: "cover",
    background: "#eef2ef",
  },

  historyMediaBody: {
    display: "grid",
    gap: 3,
    minWidth: 0,
    padding: 9,
    fontSize: 12,
    overflowWrap: "anywhere",
  },


};
