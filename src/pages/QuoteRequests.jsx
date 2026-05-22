import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import { authFetch } from "../utils/authFetch";

function QuoteRequests({ setPage, currentPage }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeQuoteId, setActiveQuoteId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchQuotes();
  }, []);

  async function fetchQuotes() {
    try {
      const result = await authFetch(
        "/contractor-quote-requests",
        {},
        setPage
      );

      if (!result) return;

      setQuotes(result.data.quotes || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function sendReply(quote) {
    if (!replyText.trim()) {
      alert("Please enter a message.");
      return;
    }

    try {
      setSending(true);

      const result = await authFetch(
        "/messages",
        {
          method: "POST",
          body: JSON.stringify({
            quote_request_id: quote.id,
            receiver_id: quote.homeowner_id,
            message_text: replyText,
          }),
        },
        setPage
      );

      if (!result) return;

      const data = result.data;

      if (data.data) {
        alert("Message sent!");

        setReplyText("");
        setActiveQuoteId(null);

        await fetchQuotes();
      } else {
        alert(data.error || "Failed to send message");
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    } finally {
      setSending(false);
    }
  }

  function openConversation(quote) {
    localStorage.setItem(
      "selectedQuoteRequestId",
      quote.id
    );

    localStorage.setItem(
      "selectedQuoteRequest",
      JSON.stringify(quote)
    );

    localStorage.setItem(
      "selectedMessageReceiverId",
      quote.homeowner_id
    );

    setPage("conversationThread");
  }

  if (loading) {
    return (
      <LoadingScreen text="Loading leads..." />
    );
  }

  return (
    <div
      style={{
        background: "#f5f5f7",
        minHeight: "100vh",
        padding: "22px 18px 120px",
        boxSizing: "border-box",
        color: "#111",
      }}
    >
      <button
        onClick={() => setPage("businessDashboard")}
        style={backButton}
      >
        ← Back to Dashboard
      </button>

      <h1 style={pageTitle}>
        Leads
      </h1>

      <p style={pageSubtitle}>
        Incoming homeowner quote requests
      </p>

      <div style={summaryCard}>
        <div>
          <strong style={summaryNumber}>
            {quotes.length}
          </strong>

          <p style={summaryLabel}>
            Total leads
          </p>
        </div>

        <div>
          <strong style={summaryNumber}>
            {
              quotes.filter(
                (quote) => quote.status === "new"
              ).length
            }
          </strong>

          <p style={summaryLabel}>
            New
          </p>
        </div>
      </div>

      {quotes.length === 0 && (
        <div style={cardStyle}>
          <h2 style={emptyTitle}>
            No leads yet
          </h2>

          <p style={emptyText}>
            New homeowner quote requests will appear here.
          </p>
        </div>
      )}

      {quotes.map((quote) => (
        <div
          key={quote.id}
          style={cardStyle}
        >
          <div style={leadHeader}>
            <div>
              <h2 style={leadTitle}>
                {quote.project_title ||
                  "Untitled project"}
              </h2>

              <p style={homeownerText}>
                From{" "}
                {quote.homeowner_email ||
                  "Homeowner"}
              </p>
            </div>

            <span style={statusBadge}>
              {quote.status || "new"}
            </span>
          </div>

          <p style={descriptionText}>
            {quote.project_description ||
              "No description added."}
          </p>

          <p style={locationText}>
            <strong>Location:</strong>{" "}
            {quote.location || "Not set"}
          </p>

          <button
            onClick={() =>
              openConversation(quote)
            }
            style={primaryButton}
          >
            Open Conversation
          </button>

          <button
            onClick={() =>
              setActiveQuoteId(
                activeQuoteId === quote.id
                  ? null
                  : quote.id
              )
            }
            style={secondaryButton}
          >
            {activeQuoteId === quote.id
              ? "Cancel Quick Reply"
              : "Quick Reply"}
          </button>

          {activeQuoteId === quote.id && (
            <div style={replyBox}>
              <textarea
                placeholder="Write your reply..."
                value={replyText}
                onChange={(e) =>
                  setReplyText(e.target.value)
                }
                style={textareaStyle}
              />

              <button
                onClick={() =>
                  sendReply(quote)
                }
                disabled={sending}
                style={{
                  ...primaryButton,
                  background: sending
                    ? "#999"
                    : "#5b3df5",
                  cursor: sending
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {sending
                  ? "Sending..."
                  : "Send Message"}
              </button>
            </div>
          )}
        </div>
      ))}

      <BottomNav
        setPage={setPage}
        currentPage={currentPage}
      />
    </div>
  );
}

const backButton = {
  border: "none",
  background: "#eee7ff",
  color: "#5b3df5",
  padding: "10px 14px",
  borderRadius: "14px",
  fontWeight: "bold",
  marginBottom: "18px",
  cursor: "pointer",
};

const pageTitle = {
  textAlign: "center",
  fontSize: "42px",
  marginBottom: "6px",
  color: "#111",
};

const pageSubtitle = {
  textAlign: "center",
  color: "#666",
  marginBottom: "22px",
  fontSize: "17px",
};

const summaryCard = {
  background: "white",
  borderRadius: "22px",
  padding: "18px",
  marginBottom: "20px",
  display: "flex",
  justifyContent: "space-around",
  color: "#111",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const summaryNumber = {
  display: "block",
  textAlign: "center",
  fontSize: "30px",
  color: "#111",
};

const summaryLabel = {
  margin: 0,
  color: "#666",
  textAlign: "center",
};

const cardStyle = {
  background: "white",
  borderRadius: "22px",
  padding: "20px",
  marginBottom: "18px",
  color: "#111",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const emptyTitle = {
  color: "#111",
  marginTop: 0,
};

const emptyText = {
  color: "#666",
  marginBottom: 0,
};

const leadHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
};

const leadTitle = {
  marginTop: 0,
  marginBottom: "6px",
  color: "#111",
  fontSize: "24px",
};

const homeownerText = {
  color: "#777",
  margin: 0,
  fontSize: "14px",
};

const statusBadge = {
  background: "#e8fff0",
  color: "#12a150",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "13px",
  textTransform: "capitalize",
};

const descriptionText = {
  color: "#555",
  lineHeight: 1.6,
  marginTop: "16px",
};

const locationText = {
  color: "#444",
};

const primaryButton = {
  width: "100%",
  marginTop: "18px",
  padding: "14px",
  border: "none",
  borderRadius: "14px",
  background: "#5b3df5",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "16px",
};

const secondaryButton = {
  width: "100%",
  marginTop: "12px",
  padding: "14px",
  border: "none",
  borderRadius: "14px",
  background: "#eee7ff",
  color: "#5b3df5",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "16px",
};

const replyBox = {
  marginTop: "18px",
  background: "#fafafa",
  borderRadius: "18px",
  padding: "16px",
  border: "1px solid #eee",
};

const textareaStyle = {
  width: "100%",
  minHeight: "120px",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #ddd",
  fontSize: "16px",
  boxSizing: "border-box",
  resize: "none",
  background: "white",
  color: "#111",
};

export default QuoteRequests;
