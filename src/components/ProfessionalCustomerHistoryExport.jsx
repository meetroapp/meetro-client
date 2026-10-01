import { useEffect, useRef, useState } from 'react';
import { loadProfessionalCustomerHistoryReport } from '../utils/professionalCustomerHistoryReport.js';
import { getCustomerJobHistoryReportCopy, printCustomerJobHistoryReport, shareCustomerJobHistoryReport } from '../utils/customerJobHistoryReport.js';
import { historyReportNotice } from '../utils/historyPdfShare.js';
import { downloadBusinessDocumentPdfArtifact } from '../utils/businessDocumentDeviceShare.js';

const empty = { busy: false, notice: '', artifact: null, model: null, saveAvailable: false };
export default function ProfessionalCustomerHistoryExport({ authority, displayName, language, copy, setPage }) {
  const scope = JSON.stringify([authority.kind, authority.contractorProfileId, authority.homeownerUserId, authority.relationshipId, authority.businessContactId, language]);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const [state, setState] = useState(empty);
  const current = state.scope === scope ? state : empty;
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const reportCopy = getCustomerJobHistoryReportCopy(language);
  async function run(kind) {
    if (current.busy) return;
    setState({ ...current, scope, busy: true, notice: '' });
    try {
      const model = kind === 'share' && current.artifact ? current.model :
        await loadProfessionalCustomerHistoryReport({ authority, displayName, language, setPage });
      if (!alive.current || scopeRef.current !== scope) return;
      const result = kind === 'print' ? await printCustomerJobHistoryReport(model) :
        await shareCustomerJobHistoryReport(model, { preparedArtifact: current.artifact });
      if (alive.current && scopeRef.current === scope) setState({
        scope, busy: false, notice: historyReportNotice(result, kind, reportCopy),
        artifact: result.artifact || null, model, saveAvailable: result.saveAvailable === true,
      });
    } catch {
      if (alive.current && scopeRef.current === scope) setState({ ...empty, scope, notice: copy.customerReportError });
    }
  }
  function save() {
    let saved = false;
    try { saved = downloadBusinessDocumentPdfArtifact(current.artifact); } catch { /* Preserve explicit retry. */ }
    setState({ ...current, scope, notice: saved ? reportCopy.downloadNotice : reportCopy.saveRequired });
  }
  return <section className="professional-customer-history-export" aria-label={copy.professionalHistoryReport}>
    <div className="customer-history-export-actions">{['print', 'share'].map(kind =>
      <button
        key={kind}
        type="button"
        className={`customer-history-export-button customer-history-export-button--${kind}`}
        disabled={current.busy}
        onClick={() => void run(kind)}
      >
        {current.busy ? reportCopy.preparing : reportCopy[kind]}
      </button>)}</div>
    {current.notice && <p className="customer-history-export-notice" role="status" aria-live="polite">{current.notice}</p>}
    {current.saveAvailable && current.artifact && (
      <button type="button" className="customer-history-save-button" onClick={save}>{reportCopy.savePdf}</button>
    )}
  </section>;
}
