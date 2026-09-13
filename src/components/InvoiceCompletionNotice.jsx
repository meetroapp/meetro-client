import { useEffect, useRef } from "react";

export default function InvoiceCompletionNotice({ onClose }) {
  const dialog = useRef(null);
  useEffect(() => { dialog.current?.showModal?.(); }, []);
  return <dialog ref={dialog} aria-labelledby="invoice-completion-title" onCancel={onClose} style={{ maxWidth: 440, border: "1px solid #d7ded8", borderRadius: 12, padding: 24 }}>
    <h2 id="invoice-completion-title">Complete the job first</h2>
    <p>The job must be marked complete before the final Invoice can be sent.</p>
    <button type="button" onClick={onClose}>Got it</button>
  </dialog>;
}
