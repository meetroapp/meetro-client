import { useState } from "react";
import BottomNav from "../components/BottomNav";

function Conversation({ setPage, currentPage }) {
  const [input, setInput] = useState("");

  const [messages, setMessages] = useState([
    {
      text: "Hi, I have a leak under my kitchen sink. Can you help?",
      align: "right",
    },
    {
      text: "Yes, we can help. Can you upload a photo of the leak?",
      align: "left",
    },
    {
      text: "Sure, I can send a photo now.",
      align: "right",
    },
  ]);

  const getSmartReply = (userInput) => {
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes("price") || lowerInput.includes("cost")) {
      return "Pricing depends on the issue, photos, and job size. Upload photos and the pro can give you a more accurate estimate.";
    }

    if (lowerInput.includes("photo") || lowerInput.includes("picture")) {
      return "For best results, upload 2–3 clear photos: one close-up, one wide view, and one showing the surrounding area.";
    }

    if (
      lowerInput.includes("send") ||
      lowerInput.includes("uploading") ||
      lowerInput.includes("sending")
    ) {
      return "Great. Once the photos are uploaded, the contractor will be able to review the issue and respond with next steps.";
    }

    if (lowerInput.includes("tomorrow") || lowerInput.includes("schedule")) {
      return "Got it. Meetro can help organize this as a scheduling request so the pro can confirm availability.";
    }

    if (lowerInput.includes("emergency") || lowerInput.includes("urgent")) {
      return "This sounds urgent. If there is active water, shut off the nearest valve and request immediate help from an available pro.";
    }

    if (lowerInput.includes("thank") || lowerInput.includes("thanks")) {
      return "You're welcome. Meetro will continue helping organize the request while the contractor reviews your details.";
    }

    if (
      lowerInput.includes("ok") ||
      lowerInput.includes("sounds good") ||
      lowerInput.includes("will do")
    ) {
      return "Perfect. Once photos are uploaded, the contractor can review the issue faster.";
    }

    if (lowerInput.includes("hello") || lowerInput.includes("hi")) {
      return "Hello. Meetro can help organize your request and connect you with the contractor.";
    }

    return "Thanks. Meetro is helping organize your request. Can you upload a photo so the pro can give a faster estimate?";
  };

  const sendMessage = () => {
    if (input.trim() === "") return;

    const userText = input;

    const userMessage = {
      text: userText,
      align: "right",
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
    ]);

    setInput("");

    setTimeout(() => {
      const reply = getSmartReply(userText);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          text: reply,
          align: "left",
        },
      ]);
    }, 1200);
  };

  return (
    <div
      style={{
        background: "#f5f5f7",
        minHeight: "var(--meetro-safe-vh, 100dvh)",
        display: "flex",
        justifyContent: "center",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          paddingBottom:
            "calc(var(--meetro-mobile-bottom-nav-clearance, 96px) + 54px)",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "20px",
            borderBottom: "1px solid #eee",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <button
            onClick={() => setPage("chat")}
            style={{
              border: "none",
              background: "#f1efff",
              color: "var(--meetro-color-forest, #1f4d34)",
              padding: "10px 14px",
              borderRadius: "14px",
              fontWeight: "bold",
              marginBottom: "14px",
              cursor: "pointer",
            }}
          >
            ← Back
          </button>

          <h2 style={{ margin: 0 }}>Aqua Flow Plumbing</h2>

          <p style={{ color: "#666", marginTop: "6px" }}>
            Online now • Verified Pro
          </p>
        </div>

        <div style={{ padding: "18px" }}>
          {messages.map((msg, index) => (
            <MessageBubble
              key={index}
              text={msg.text}
              align={msg.align}
            />
          ))}
        </div>

        <div
          style={{
            position: "fixed",
            bottom: "var(--meetro-bottom-nav-height, 72px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "430px",
            background: "white",
            padding: "12px",
            display: "flex",
            gap: "10px",
            boxSizing: "border-box",
            borderTop: "1px solid #eee",
          }}
        >
          <button
            style={{
              border: "none",
              background: "#ece7ff",
              color: "var(--meetro-color-forest, #1f4d34)",
              borderRadius: "14px",
              padding: "12px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            style={{
              flex: 1,
              border: "1px solid #ddd",
              borderRadius: "14px",
              padding: "12px",
              fontSize: "16px",
            }}
          />

          <button
            onClick={sendMessage}
            style={{
              border: "none",
              background: "var(--meetro-color-forest, #1f4d34)",
              color: "white",
              borderRadius: "14px",
              padding: "12px 16px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>

        <BottomNav setPage={setPage} currentPage={currentPage} />
      </div>
    </div>
  );
}

function MessageBubble({ text, align }) {
  const isRight = align === "right";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isRight ? "flex-end" : "flex-start",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          background: isRight ? "var(--meetro-color-forest, #1f4d34)" : "white",
          color: isRight ? "white" : "#333",
          padding: "14px 16px",
          borderRadius: "20px",
          maxWidth: "78%",
          lineHeight: 1.4,
          boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
        }}
      >
        {text}
      </div>
    </div>
  );
}

export default Conversation;
