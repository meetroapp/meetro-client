import { useEffect, useRef, useState } from "react";

function EmergencyChat({ setPage, language = "en" }) {
  const messagesEndRef = useRef(null);

  const gateCode = localStorage.getItem("emergencyGateCode") || "";
  const entryNotes = localStorage.getItem("emergencyEntryNotes") || "";
  const petWarning = localStorage.getItem("emergencyPetWarning") === "true";

  const getTime = () => {
    return new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const text = {
    en: {
      status: "On the way • ETA 12 min",
      placeholder: "Type a message...",
      send: "Send",
      quickCall: "Please call me",
      quickPhotos: "I uploaded photos",
      petWarning: "Pet or safety warning on site",
      typing: "Professional typing...",
      seen: "Seen",
    },
    es: {
      status: "En camino • Llegada 12 min",
      placeholder: "Escribe un mensaje...",
      send: "Enviar",
      quickCall: "Por favor llámame",
      quickPhotos: "Subí fotos",
      petWarning: "Advertencia de mascota o seguridad en la propiedad",
      typing: "Profesional escribiendo...",
      seen: "Visto",
    },
  };

  const t = text[language] || text.en;

  const dynamicQuickReplies = [
    t.quickCall,
    gateCode ? `Gate code is ${gateCode}` : null,
    entryNotes ? entryNotes : null,
    petWarning ? t.petWarning : null,
    t.quickPhotos,
  ].filter(Boolean);

  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);

  const [messages, setMessages] = useState([
    {
      type: "contractor",
      text: "Hello, I’m on the way now. I should arrive in about 12 minutes.",
      time: getTime(),
    },
    {
      type: "user",
      text: "Thank you. The leak is coming from under the kitchen sink.",
      time: getTime(),
    },
    {
      type: "contractor",
      text: "Understood. Please try not to use the sink until I arrive.",
      time: getTime(),
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, typing]);

  const getAutoReply = (userText) => {
    const lower = userText.toLowerCase();

    if (lower.includes("gate code")) {
      return language === "es"
        ? "Gracias. Usaré ese código al llegar."
        : "Thank you. I’ll use that gate code when I arrive.";
    }

    if (
      lower.includes("main entrance") ||
      lower.includes("side gate") ||
      lower.includes("entrada") ||
      lower.includes("puerta")
    ) {
      return language === "es"
        ? "Entendido. Usaré esa entrada."
        : "Understood. I’ll use that entrance.";
    }

    if (
      lower.includes("pet") ||
      lower.includes("dog") ||
      lower.includes("mascota") ||
      lower.includes("perro")
    ) {

        return language === "es"
        ? "Gracias por avisarme. Tendré cuidado al llegar."
        : "Thanks for letting me know. I’ll be careful when I arrive.";
    }

    if (
      lower.includes("call") ||
      lower.includes("llama") ||
      lower.includes("llámame")
    ) {
      return language === "es"
        ? "Claro. Te llamaré antes de llegar."
        : "Sure. I’ll call you before I arrive.";
    }

    if (
      lower.includes("photo") ||
      lower.includes("photos") ||
      lower.includes("foto") ||
      lower.includes("fotos")
    ) {
      return language === "es"
        ? "Recibido. Revisaré las fotos antes de llegar."
        : "Got it. I’ll review the photos before I arrive.";
    }

    return language === "es"
      ? "Entendido. Ya voy en camino."
      : "Understood. I’m on the way.";
  };

  const addQuickReply = (replyText) => {
    const updatedMessages = [
      ...messages,
      {
        type: "user",
        text: replyText,
        time: getTime(),
      },
    ];

    setMessages(updatedMessages);
    setTyping(true);

    setTimeout(() => {
      setTyping(false);

      setMessages([
        ...updatedMessages,
        {
          type: "contractor",
          text: getAutoReply(replyText),
          time: getTime(),
        },
      ]);
    }, 1600);
  };

  const sendMessage = () => {
    if (!message.trim()) return;

    const userText = message;

    const updatedMessages = [
      ...messages,
      {
        type: "user",
        text: userText,
        time: getTime(),
      },
    ];

    setMessages(updatedMessages);
    setMessage("");
    setTyping(true);

    setTimeout(() => {
      setTyping(false);

      setMessages([
        ...updatedMessages,
        {
          type: "contractor",
          text: getAutoReply(userText),
          time: getTime(),
        },
      ]);
    }, 1600);
  };

  return (
    <div style={page}>
      <style>
        {`
          @keyframes pulseTyping {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
          }
        `}
      </style>

      <div style={topBar}>
        <button
          style={backButton}
          onClick={() => setPage("emergencyDispatch")}
        >
          ←
        </button>

        <div>
          <strong style={contractorName}>{t.contractor}</strong>
          <p style={status}>{t.status}</p>
        </div>
      </div>

      <div style={messagesArea}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={msg.type === "user" ? userMessageWrap : contractorMessageWrap}
          >
            <div style={msg.type === "user" ? userBubble : contractorBubble}>
              {msg.text}
            </div>

            <div style={msg.type === "user" ? userMeta : contractorMeta}>
              {msg.time}
              {msg.type === "user" ? ` • ${t.seen}` : ""}
            </div>
          </div>
        ))}

        {typing && <div style={typingBubble}>{t.typing}</div>}

        <div ref={messagesEndRef}></div>
      </div>

      <div style={quickReplies}>
        {dynamicQuickReplies.map((reply, index) => (
          <button
            key={index}
            style={quickButton}
            onClick={() => addQuickReply(reply)}
          >
            {reply}
          </button>
        ))}
      </div>

      <div style={inputArea}>
        <input
          style={input}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
        />

        <button style={sendButton} onClick={sendMessage}>
          {t.send}
        </button>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "#f5f7fb",
  display: "flex",
  flexDirection: "column",
};

const topBar = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "20px",
  background: "white",
  boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
};

const backButton = {
  width: "44px",
  height: "44px",
  borderRadius: "16px",
  border: "none",
  background: "#f3f4f6",
  fontSize: "22px",
  fontWeight: "900",
  cursor: "pointer",
};

const contractorName = {
  display: "block",
  fontSize: "17px",
  color: "#111827",
};

const status = {
  margin: "4px 0 0",
  color: "#10b981",
  fontSize: "13px",
  fontWeight: "800",
};

const messagesArea = {
  flex: 1,
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  overflowY: "auto",
};

const contractorMessageWrap = {
  alignSelf: "flex-start",
  maxWidth: "82%",
};

const userMessageWrap = {
  alignSelf: "flex-end",
  maxWidth: "82%",
};

const contractorBubble = {
  background: "white",
  padding: "16px",
  borderRadius: "22px 22px 22px 8px",
  lineHeight: "1.5",
  boxShadow: "0 10px 26px rgba(0,0,0,0.05)",
};

const userBubble = {
  background: "#5b3df5",
  color: "white",
  padding: "16px",
  borderRadius: "22px 22px 8px 22px",
  lineHeight: "1.5",
  boxShadow: "0 10px 26px rgba(91,61,245,0.25)",
};

const contractorMeta = {
  marginTop: "5px",
  fontSize: "11px",
  color: "#475569",
  textAlign: "left",
};

const userMeta = {
  marginTop: "5px",
  fontSize: "11px",
  color: "#475569",
  textAlign: "right",
};

const typingBubble = {
  alignSelf: "flex-start",
  background: "#e5e7eb",
  color: "#374151",
  padding: "12px 16px",
  borderRadius: "18px 18px 18px 8px",
  fontWeight: "700",
  fontSize: "14px",
  animation: "pulseTyping 1.2s infinite",
};

const quickReplies = {
  display: "flex",
  gap: "10px",
  overflowX: "auto",
  padding: "0 20px 16px",
};

const quickButton = {
  whiteSpace: "nowrap",
  border: "none",
  background: "white",
  padding: "12px 16px",
  borderRadius: "999px",
  fontWeight: "800",
  boxShadow: "0 8px 18px rgba(0,0,0,0.05)",
  cursor: "pointer",
};

const inputArea = {
  display: "flex",
  gap: "10px",
  padding: "18px 20px 26px",
  background: "white",
};

const input = {
  flex: 1,
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "14px 16px",
  fontSize: "16px",
  outline: "none",
};

const sendButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  padding: "0 22px",
  borderRadius: "18px",
  fontWeight: "900",
  cursor: "pointer",
};

export default EmergencyChat;
