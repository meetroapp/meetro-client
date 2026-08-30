import EmployeeShell from "../components/EmployeeShell";

const BOOKKEEPER_NAVIGATION = Object.freeze([
  { route: "teamOperations", query: { view: "timesheets" }, label: "Timesheets", icon: "◷" },
  { route: "bookkeeperProfile", label: "Profile", icon: "●" },
]);

export default function BookkeeperProfile({ membership, setPage }) {
  return (
    <EmployeeShell
      membership={membership}
      currentPage="bookkeeperProfile"
      setPage={setPage}
      title="Profile"
      description="Your governed finance and Team-time access."
      navigation={BOOKKEEPER_NAVIGATION}
      roleLabel="Bookkeeper / Finance"
      brandLabel="Finance"
      accessLabel="Read-only access"
    >
      <section style={cardStyle}>
        <p style={eyebrowStyle}>Team Access</p>
        <h2 style={headingStyle}>{membership?.businessName || "Your business"}</h2>
        <dl style={definitionStyle}>
          <div><dt>Role</dt><dd>Bookkeeper / Finance</dd></div>
          <div><dt>Time access</dt><dd>Read-only Team timesheets</dd></div>
          <div><dt>Management</dt><dd>Access managed by your business</dd></div>
        </dl>
        <p style={copyStyle}>Job dispatch, field-status actions, Team-role changes, and employee Clock In or Clock Out are not available from this role.</p>
      </section>
    </EmployeeShell>
  );
}

const cardStyle = { background: "#fff", border: "1px solid #dbe7de", borderRadius: 18, padding: 22, boxShadow: "0 10px 30px rgba(20,63,39,.06)" };
const eyebrowStyle = { margin: "0 0 7px", color: "#5b7d66", fontSize: 12, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase" };
const headingStyle = { margin: "0 0 9px", color: "#173f28", fontSize: 24 };
const copyStyle = { margin: "16px 0 0", color: "#587060", lineHeight: 1.5 };
const definitionStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, margin: "18px 0" };

