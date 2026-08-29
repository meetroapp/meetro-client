export default function CompactCurrentJobHeader({
  eyebrow = "Current Job",
  customer,
  service,
  address,
  status,
  nextStep,
  responsibility,
  blocker,
  concern,
  participants = [],
  connected = false,
  action = null,
}) {
  return (
    <section className="compact-current-job-header" style={styles.section} aria-label="Current Job">
      <div style={styles.identity}>
        <span style={styles.eyebrow}>{eyebrow}</span>
        <h2 style={styles.title}>{customer}</h2>
        <p style={styles.service}>{service}</p>
        {address && <p style={styles.address}>{address}</p>}
      </div>
      <div style={styles.state}>
        <span style={styles.status}>{status}</span>
        <div><span style={styles.label}>Next</span><strong>{nextStep}</strong></div>
        <div><span style={styles.label}>Who acts next</span><strong>{responsibility}</strong></div>
        {blocker && <span role="status" style={styles.blocker}>{blocker}</span>}
        {action}
      </div>
      <div style={styles.context}>
        <div><span style={styles.label}>Customer concern</span><p>{concern || "Unavailable"}</p></div>
        <div><span style={styles.label}>Job record</span><strong>{connected ? "Connected" : "Unavailable"}</strong></div>
        <details style={styles.participants}>
          <summary>{participants.length} known participant{participants.length === 1 ? "" : "s"}</summary>
          {participants.length > 0 && <ul>{participants.map((participant, index) => <li key={`${participant.displayName || "participant"}-${index}`}><strong>{participant.displayName || "Participant"}</strong>{participant.roles?.length ? ` — ${participant.roles.map((role) => role.labelKey || role.role).join(", ")}` : ""}</li>)}</ul>}
        </details>
      </div>
    </section>
  );
}

const styles = {
  section: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, padding: "14px clamp(14px, 3vw, 20px)", border: "1px solid #d6e1d8", borderRadius: 14, background: "linear-gradient(135deg, #f7faf8, #fff)", minWidth: 0 },
  identity: { display: "grid", alignContent: "start", gap: 2, minWidth: 0 },
  eyebrow: { color: "#496351", fontSize: 11, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" },
  title: { margin: "2px 0 0", fontSize: "clamp(1.2rem, 3vw, 1.55rem)", color: "#193b29", overflowWrap: "anywhere" },
  service: { margin: 0, color: "#3f5146", fontWeight: 700 },
  address: { margin: "2px 0 0", color: "#68756d", fontSize: 13 },
  state: { display: "grid", alignContent: "start", gap: 7, minWidth: 0 },
  status: { justifySelf: "start", padding: "3px 9px", border: "1px solid #b8c9bd", borderRadius: 999, background: "#fff", color: "#264d35", fontSize: 12, fontWeight: 850 },
  label: { display: "block", color: "#68756d", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: ".05em" },
  blocker: { padding: 7, background: "#fff8e8", color: "#755512", fontSize: 13 },
  context: { display: "grid", alignContent: "start", gap: 8, minWidth: 0 },
  participants: { color: "#4b5c51", fontSize: 13 },
};
