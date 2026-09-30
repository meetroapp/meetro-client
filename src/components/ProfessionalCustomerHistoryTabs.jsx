export default function ProfessionalCustomerHistoryTabs({ copy, focus, onChange }) {
  return <nav aria-label={copy.relationshipActivity} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minWidth: 0 }}>
    {[["overview", copy.overview], ["work", copy.work], ["quotes", copy.quotes], ["invoices", copy.invoices], ["documents", copy.documentsPhotos]].map(([id, label]) =>
      <button key={id} type="button" aria-pressed={focus === id} onClick={() => onChange(id)}
        style={{ minHeight: 44, padding: '9px 14px', border: '1px solid #64748b', borderRadius: 6,
          background: focus === id ? '#eaf3e5' : '#fff', color: '#243326', fontWeight: 700, cursor: 'pointer' }}>{label}</button>)}
  </nav>;
}
