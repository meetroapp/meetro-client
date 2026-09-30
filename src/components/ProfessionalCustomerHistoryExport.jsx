import { useEffect, useRef, useState } from 'react';
import { loadProfessionalCustomerHistoryReport } from '../utils/professionalCustomerHistoryReport.js';
import { getCustomerJobHistoryReportCopy, printCustomerJobHistoryReport, shareCustomerJobHistoryReport, emailCustomerJobHistoryReport } from '../utils/customerJobHistoryReport.js';

const button = {minHeight:44,padding:'9px 14px',border:'1px solid #64748b',borderRadius:6,background:'#fff',fontWeight:700,cursor:'pointer'};
export default function ProfessionalCustomerHistoryExport({ authority, displayName, language, copy, setPage }) {
  const [state,setState] = useState({busy:false,notice:''});
  const alive = useRef(true);
  useEffect(() => {alive.current=true;return () => {alive.current=false;};},[]);
  const reportCopy = getCustomerJobHistoryReportCopy(language);
  async function run(kind) {
    if (state.busy) return;
    setState({busy:true,notice:''});
    try {
      const model = await loadProfessionalCustomerHistoryReport({authority,displayName,language,setPage});
      if (!alive.current) return;
      const operation = {print:printCustomerJobHistoryReport,share:shareCustomerJobHistoryReport,email:emailCustomerJobHistoryReport}[kind];
      const result = await operation(model);
      if (alive.current) setState({busy:false,notice:!result.ok ? reportCopy.pdfUnavailable : result.manualAttachment ? reportCopy.emailManualNotice : result.chooseEmailApp ? reportCopy.emailNativeNotice : result.printFromShareSheet ? reportCopy.printShareNotice : kind === 'print' ? reportCopy.printNotice : reportCopy.readyNotice});
    } catch {
      if (alive.current) setState({busy:false,notice:copy.customerReportError});
    }
  }
  return <section aria-label={copy.professionalHistoryReport} style={{minWidth:0}}>
    <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{['print','share','email'].map(kind=>
      <button key={kind} type="button" style={button} disabled={state.busy} onClick={()=>void run(kind)}>{state.busy ? reportCopy.preparing : reportCopy[kind]}</button>)}</div>
    {state.notice && <p role="status" aria-live="polite">{state.notice}</p>}
  </section>;
}
