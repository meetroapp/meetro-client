export default function ProfessionalCustomerHistoryTabs({ copy, focus, onChange }) {
  const tabs = [
    ["overview", copy.overview],
    ["work", copy.work],
    ["quotes", copy.quotes],
    ["invoices", copy.invoices],
    ["documents", copy.documentsPhotos],
  ];

  return (
    <nav
      className="customer-history-tabs"
      aria-label={copy.relationshipActivity}
    >
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type="button"
          className="customer-history-tab"
          aria-pressed={focus === id}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
