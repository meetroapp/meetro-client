import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import API_URL from "../api";

function ConversationThread({ setPage, currentPage }) {
  const [messages, setMessages] = useState([]);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchThread();
  }, []);

  async function fetchThread() {
    try {
      const token = localStorage.getItem("token");
      const quoteId = localStorage.getItem("selectedQuoteRequestId");

      const response = await fetch(`${API_URL}/messages/${quoteId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      setMessages(data.messages || []);

      const savedQuote = localStorage.getItem("selectedQuoteRequest");
      if (savedQuote) {
        setQuote(JSON.parse(savedQuote));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!messageText.trim()) {
      alert("Please enter a message.");
      return;
    }

    try {
      setSending(true);

      const token = localStorage.getItem("token");
      const quoteId = localStorage.getItem("selectedQuoteRequestId");
      const receiverId = localStorage.getItem("selectedMessageReceiverId");

      const response = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quote_request_id: quoteId,
          receiver_id: receiverId,
          message_text: messageText,
        }),
      });

      const data = await response.json();

      if (data.data) {
        setMessageText("");
        await fetchThread();
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

  return (
    <div style={{ padding: 20, paddingBottom: 140 }}>
      <button
        onClick={() => setPage("quoteRequests")}
        style={backButton}
      >
        ← Back to Quote Requests
      </button>

      <h1 style={{ textAlign: "center", fontSize: "34px" }}>
        Conversation
      </h1>

      {quote && (
        <div style={quoteCard}>
          <h2 style={{ marginTop: 0 }}>{quote.project_title}</h2>
          <p style={{ color: "#555" }}>
            {quote.project_description}
          </p>
          <p style={{ color: "#666" }}>
            📍 {quote.location || "Location not set"}
          </p>
        </div>
      )}

      {loading && <p>Loading conversation...</p>}

      {!loading && messages.length === 0 && (
        <div style={emptyCard}>
          <h3>No messages yet</h3>
          <p style={{ color: "#666" }}>
            Start the conversation below.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {messages.map((message) => (
          <div key={message.id} style={messageCard}>
            <p style={{ margin: 0, color: "#555", fontSize: "13px" }}>
              {message.sender_email || "User"}
            </p>

            <p style={{ marginTop: "6px", lineHeight: 1.5 }}>
              {message.message_text}
            </p>

            <p style={{ margin: 0, color: "#999", fontSize: "12px" }}>
              {message.created_at
                ? new Date(message.created_at).toLocaleString()
                : ""}
            </p>
          </div>
        ))}
      </div>

      <div style={composer}>
        <textarea
          placeholder="Write a message..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          style={textareaStyle}
        />

        <button
          onClick={sendMessage}
          disabled={sending}
          style={{
            ...primaryButton,
            background: sending ? "#999" : "#5b3df5",
            cursor: sending ? "not-allowed" : "pointer",
          }}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>

      <BottomNav setPage={setPage} currentPage={currentPage} />
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
  marginBottom: "16px",
  cursor: "pointer",
};

const quoteCard = {
  background: "white",
  borderRadius: "22px",
  padding: "18px",
  marginBottom: "18px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const emptyCard = {
  background: "white",
  borderRadius: "22px",
  padding: "20px",
  marginBottom: "18px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const messageCard = {
  background: "white",
  borderRadius: "18px",
  padding: "14px",
  boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
};

const composer = {
  background: "white",
  borderRadius: "22px",
  padding: "16px",
  marginTop: "22px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const textareaStyle = {
  width: "100%",
  minHeight: "90px",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #ddd",
  fontSize: "16px",
  boxSizing: "border-box",
};

const primaryButton = {
  width: "100%",
  marginTop: "12px",
  padding: "14px",
  border: "none",
  borderRadius: "14px",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "16px",
};

export default ConversationThread;
