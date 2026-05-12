import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import API_URL from "../api";

function QuoteRequests({ setPage, currentPage }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeQuoteId, setActiveQuoteId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function fetchQuotes() {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(`${API_URL}/contractor-quote-requests`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        setQuotes(data.quotes || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchQuotes();
  }, []);

  async function sendReply(quote) {
    if (!replyText.trim()) {
      alert("Please enter a message.");
      return;
    }

    try {
      setSending(true);

      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quote_request_id: quote.id,
          receiver_id: quote.homeowner_id,
          message_text: replyText,
        }),
      });

      const data = await response.json();

      if (data.data) {
        alert("Message sent!");
        setReplyText("");
        setActiveQuoteId(null);
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
    localStorage.setItem("selectedQuoteRequestId", quote.id);
    localStorage.setItem("selectedQuoteRequest", JSON.stringify(quote));
    localStorage.setItem("selectedMessageReceiverId", quote.homeowner_id);

    setPage("conversationThread");
  }

  return (
    <div style={{ padding: 20, paddingBottom: 120 }}>
      <h1 style={{ textAlign: "center", fontSize: "42px" }}>
        Quote Requests
      </h1>

      <p style={{ textAlign: "center", color: "#666" }}>
        Incoming homeowner project leads
      </p>

      {loading && <p>Loading quote requests...</p>}

      {!loading && quotes.length === 0 && (
        <div style={cardStyle}>
          <h2>No quote requests yet</h2>
          <p style={{ color: "#666" }}>
            New homeowner requests will appear here.
          </p>
        </div>
      )}

      {quotes.map((quote) => (
        <div key={quote.id} style={cardStyle}>
          <h2>{quote.project_title}</h2>

          <p style={{ color: "#555", lineHeight: 1.6 }}>
            {quote.project_description || "No description added."}
          </p>

          <p>
            <strong>Location:</strong> {quote.location || "Not set"}
          </p>

          <p>
            <strong>Status:</strong> {quote.status || "new"}
          </p>

          <p>
            <strong>Homeowner:</strong>{" "}
            {quote.homeowner_email || "Unknown"}
          </p>

          <button
            onClick={() => openConversation(quote)}
            style={primaryButton}
          >
            Open Conversation
          </button>

          <button
            onClick={() =>
              setActiveQuoteId(activeQuoteId === quote.id ? null : quote.id)
            }
            style={secondaryButton}
          >
            {activeQuoteId === quote.id ? "Cancel Quick Reply" : "Quick Reply"}
          </button>

          {activeQuoteId === quote.id && (
            <div
              style={{
                marginTop: "18px",
                background: "#fafafa",
                borderRadius: "18px",
                padding: "16px",
                border: "1px solid #eee",
              }}
            >
              <textarea
                placeholder="Write your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                style={textareaStyle}
              />

              <button
                onClick={() => sendReply(quote)}
                disabled={sending}
                style={{
                  ...primaryButton,
                  background: sending ? "#999" : "#5b3df5",
                  cursor: sending ? "not-allowed" : "pointer",
                }}
              >
                {sending ? "Sending..." : "Send Message"}
              </button>
            </div>
          )}
        </div>
      ))}

      <BottomNav setPage={setPage} currentPage={currentPage} />
    </div>
  );
}

const cardStyle = {
  background: "white",
  borderRadius: "22px",
  padding: "20px",
  marginBottom: "18px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
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

const textareaStyle = {
  width: "100%",
  minHeight: "120px",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #ddd",
  fontSize: "16px",
  boxSizing: "border-box",
};

export default QuoteRequests;
