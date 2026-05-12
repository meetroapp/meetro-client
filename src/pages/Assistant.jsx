import BottomNav from "../components/BottomNav";

function Assistant({ setPage, currentPage }) {
  return (
    <div style={{ padding: 30, paddingBottom: 100 }}>
      <h1>✨ AI Assistant Page</h1>
      <p>Ask Meetro AI for help finding the right professional.</p>

      <BottomNav setPage={setPage} currentPage={currentPage} />
    </div>
  );
}

export default Assistant;
