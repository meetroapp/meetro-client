import { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage } from "../utils/language";

const IconBack = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M15 18 9 12l6-6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconPhone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 11.2 19a19.3 19.3 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6.1 6.1l1.6-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6A2 2 0 0 1 22 16.9z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconMore = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 5.5h.01M12 12h.01M12 18.5h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const IconPlus = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

const IconMic = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 14.5c1.7 0 3-1.3 3-3V5c0-1.7-1.3-3-3-3S9 3.3 9 5v6.5c0 1.7 1.3 3 3 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M5 10.8c0 3.9 3.1 7 7 7s7-3.1 7-7M12 17.8V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconSend = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconCameraClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <path d="M8.2 7.2 9.8 5h4.4l1.6 2.2h2.4c1.1 0 2 .9 2 2v7.7c0 1.1-.9 2-2 2H5.8c-1.1 0-2-.9-2-2V9.2c0-1.1.9-2 2-2h2.4Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.9" />
  </svg>
);

const IconPhotosClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="6" width="14" height="13" rx="2.4" stroke="currentColor" strokeWidth="1.9" />
    <path d="M8.2 15.8 11 13l2.2 2.1 1.4-1.5 2.8 2.9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8.8 4h9.1c1.7 0 3.1 1.4 3.1 3.1v8.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="15.2" cy="9.8" r="1" fill="currentColor" />
  </svg>
);

const IconLocationClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <path d="M12 21s6.2-5.6 6.2-11.1A6.2 6.2 0 0 0 5.8 9.9C5.8 15.4 12 21 12 21Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="9.9" r="2.1" stroke="currentColor" strokeWidth="1.9" />
  </svg>
);

const IconScanClean = () => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
    <path d="M7 3H5.5A2.5 2.5 0 0 0 3 5.5V7M17 3h1.5A2.5 2.5 0 0 1 21 5.5V7M7 21H5.5A2.5 2.5 0 0 1 3 18.5V17M17 21h1.5a2.5 2.5 0 0 0 2.5-2.5V17" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    <rect x="7" y="6" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9.5 10h5M9.5 13h5M9.5 16h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

function ConversationThread({ setPage }) {
  const [language, setLanguageState] = useState(getLanguage());
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [showThreadMenu, setShowThreadMenu] = useState(false);
  const [showCallMenu, setShowCallMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const bottomRef = useRef(null);
  const longPressTimerRef = useRef(null);

  const conversationId =
    localStorage.getItem("activeConversationId") || "demo-homeowner-1";

  const storageKey = `meetro_conversation_${conversationId}`;

  const activeName =
    localStorage.getItem("activeConversationName") ||
    (language === "es" ? "Cliente de Meetro" : "Meetro Client");

  useEffect(() => {
    const refreshLanguage = () => setLanguageState(getLanguage());

    refreshLanguage();
    window.addEventListener("storage", refreshLanguage);
    window.addEventListener("focus", refreshLanguage);
    window.addEventListener("meetroLanguageChanged", refreshLanguage);
    window.addEventListener("meetro-language-change", refreshLanguage);

    return () => {
      window.removeEventListener("storage", refreshLanguage);
      window.removeEventListener("focus", refreshLanguage);
      window.removeEventListener("meetroLanguageChanged", refreshLanguage);
      window.removeEventListener("meetro-language-change", refreshLanguage);
    };
  }, []);

  const quickReplies = useMemo(() => {
  const conversationType =
    localStorage.getItem("meetroConversationType") || "standard";

  const accountType = localStorage.getItem("accountType") || "standard";
  const userRole = localStorage.getItem("userRole") || "standard";

    const isBusinessUser =
  ["professional", "contractor", "business"].includes(accountType) ||
  ["professional", "contractor", "business"].includes(userRole);

  if (conversationType === "emergency" && isBusinessUser) {
    return language === "es"
      ? [
          "Voy en camino.",
          "¿Puedes enviar una foto?",
          "Por favor cierra el agua o la electricidad si es seguro.",
          "Llegaré pronto.",
          "Trabajo completado.",
        ]
      : [
          "I’m on the way.",
          "Can you send a photo?",
          "Please shut off water or power if safe.",
          "I’ll arrive soon.",
          "Job completed.",
        ];
  }

  if (conversationType === "emergency" && !isBusinessUser) {
    return language === "es"
      ? [
          "Todavía necesito ayuda.",
          "Subí fotos.",
          "Por favor llámame.",
          "El problema sigue pasando.",
          "Estoy en casa.",
        ]
      : [
          "I still need help.",
          "I uploaded photos.",
          "Please call me.",
          "The issue is still happening.",
          "I am home.",
        ];
  }

  if (!isBusinessUser) {
    return language === "es"
      ? [
          "¿Puedes ayudarme con esto?",
          "Puedo enviar fotos.",
          "¿Cuándo tienes disponibilidad?",
        ]
      : [
          "Can you help me with this?",
          "I can send photos.",
          "When are you available?",
        ];
  }

  return language === "es"
    ? [
        "Sí, puedo ayudarte.",
        "¿Puedes enviar una foto?",
        "Puedo dar un estimado.",
      ]
    : [
        "Yes, I can help.",
        "Can you send a photo?",
        "I can give an estimate.",
      ];
}, [language]);

  const starterMessages = useMemo(
    () => [
      {
        id: "starter-1",
        type: "text",
        sender: "client",
        text:
          language === "es"
            ? "Hola, necesito ayuda con un proyecto en mi casa."
            : "Hi, I need help with a project at my house.",
        time: "9:42 AM",
        status: "seen",
        seenAt: "9:44 AM",
        unsent: false,
        createdAt: Date.now() - 1000 * 60 * 10,
      },
    ],
    [language]
  );

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(Array.isArray(parsed) ? parsed : starterMessages);
      } catch {
        setMessages(starterMessages);
      }
    } else {
      setMessages(starterMessages);
    }

    localStorage.setItem(`meetro_conversation_read_${conversationId}`, "true");
    window.dispatchEvent(new Event("meetro-messages-updated"));
  }, [storageKey, conversationId, starterMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));

      const lastMessage = messages[messages.length - 1];

      localStorage.setItem(
        `meetro_conversation_meta_${conversationId}`,
        JSON.stringify({
          lastMessage:
            lastMessage?.type === "image"
              ? language === "es"
                ? "Imagen adjunta"
                : "Image attached"
              : lastMessage?.type === "location"
              ? language === "es"
                ? "Ubicación compartida"
                : "Location shared"
              : lastMessage?.type === "scan"
              ? language === "es"
                ? "Documento escaneado"
                : "Document scan"
              : lastMessage?.text || "",
          lastTime: lastMessage?.time || "",
          unread: 0,
          updatedAt: Date.now(),
        })
      );

      window.dispatchEvent(new Event("meetro-messages-updated"));
    }
  }, [messages, storageKey, conversationId, language]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, replyingTo, pendingImage, showAttachMenu]);

  const closeMenus = () => {
    setShowThreadMenu(false);
    setShowCallMenu(false);
    setShowAttachMenu(false);
    setActiveMessageId(null);
    setShowMobileSheet(false);
  };

  const getTime = () =>
    new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

  const updateMessageStatus = (id, status, delay) => {
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === id
            ? {
                ...msg,
                status,
                seenAt: status === "seen" ? getTime() : msg.seenAt,
              }
            : msg
        )
      );
    }, delay);
  };

  const addOutgoingMessage = async (message) => {
    setMessages((prev) => [...prev, message]);

    updateMessageStatus(message.id, "sent", 400);
    updateMessageStatus(message.id, "delivered", 1050);
    updateMessageStatus(message.id, "seen", 2100);

    setReplyingTo(null);
    setActiveMessageId(null);
    setShowMobileSheet(false);
    setShowThreadMenu(false);
    setShowCallMenu(false);
    setShowAttachMenu(false);
    setTyping(true);

    setTimeout(() => setTyping(false), 1200);
  };

  const sendMessage = (textOverride = null) => {
    const text = textOverride || messageText.trim();

    if (!text && !pendingImage) return;

    const id = `msg-${Date.now()}`;

    if (pendingImage) {
      addOutgoingMessage({
        id,
        type: "image",
        sender: "me",
        text: text || (language === "es" ? "Imagen adjunta" : "Image attached"),
        imageUrl: pendingImage.url,
        fileName: pendingImage.name,
        time: getTime(),
        status: "sending",
        unsent: false,
        replyTo: replyingTo,
        createdAt: Date.now(),
      });

      setPendingImage(null);
      setMessageText("");
      return;
    }

    addOutgoingMessage({
      id,
      type: "text",
      sender: "me",
      text,
      time: getTime(),
      status: "sending",
      unsent: false,
      replyTo: replyingTo,
      createdAt: Date.now(),
    });

    setMessageText("");
  };

  const sendLocationCard = () => {
    addOutgoingMessage({
      id: `loc-${Date.now()}`,
      type: "location",
      sender: "me",
      text: language === "es" ? "Ubicación compartida" : "Location shared",
      title: language === "es" ? "Ubicación del proyecto" : "Project location",
      subtitle:
        language === "es"
          ? "Mapa y dirección próximamente"
          : "Map and address coming soon",
      time: getTime(),
      status: "sending",
      unsent: false,
      replyTo: replyingTo,
      createdAt: Date.now(),
    });
  };

  const sendScanCard = () => {
    addOutgoingMessage({
      id: `scan-${Date.now()}`,
      type: "scan",
      sender: "me",
      text: language === "es" ? "Escaneo de documento" : "Document scan",
      title: language === "es" ? "Escaneo preparado" : "Scan prepared",
      subtitle:
        language === "es"
          ? "Permisos, recibos, estimados o notas"
          : "Permits, receipts, estimates, or notes",
      time: getTime(),
      status: "sending",
      unsent: false,
      replyTo: replyingTo,
      createdAt: Date.now(),
    });
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);

    setPendingImage({
      url: imageUrl,
      name: file.name,
    });

    setShowAttachMenu(false);
    event.target.value = "";
  };

  const unsendMessage = (id) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id
          ? {
              ...msg,
              type: "text",
              unsent: true,
              text: language === "es" ? "Mensaje eliminado" : "Message was unsent",
              imageUrl: null,
              amount: null,
              title: null,
              subtitle: null,
              replyTo: null,
              status: null,
            }
          : msg
      )
    );

    setActiveMessageId(null);
    setShowMobileSheet(false);
  };

  const clearLocalChat = () => {
    localStorage.removeItem(storageKey);
    setMessages(starterMessages);
    setReplyingTo(null);
    setActiveMessageId(null);
    setPendingImage(null);
    setShowClearConfirm(false);
    window.dispatchEvent(new Event("meetro-messages-updated"));
  };

  const markUnread = () => {
    localStorage.setItem(`meetro_conversation_read_${conversationId}`, "false");
    window.dispatchEvent(new Event("meetro-messages-updated"));
    setShowThreadMenu(false);
    setPage("messagesInbox");
  };

  const startReply = (message) => {
    setReplyingTo({
      id: message.id,
      sender: message.sender,
      text:
        message.type === "image"
          ? language === "es"
            ? "Imagen adjunta"
            : "Image attached"
          : message.title || message.text || "",
    });

    setActiveMessageId(null);
    setShowMobileSheet(false);
  };

  const copyMessage = (message) => {
    if (message?.text) navigator.clipboard?.writeText(message.text);
    setActiveMessageId(null);
    setShowMobileSheet(false);
  };

  const getStatusLabel = (status) => {
    if (language === "es") {
      if (status === "sending") return "Enviando...";
      if (status === "sent") return "Enviado";
      if (status === "delivered") return "Entregado";
      if (status === "seen") return "Visto hace 2 min";
      if (status === "failed") return "Falló";
      return "";
    }

    if (status === "sending") return "Sending...";
    if (status === "sent") return "Sent";
    if (status === "delivered") return "Delivered";
    if (status === "seen") return "Seen 2m ago";
    if (status === "failed") return "Failed";
    return "";
  };

  const startLongPress = (msg) => {
    clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      if (!msg.unsent) {
        setActiveMessageId(msg.id);
        setShowMobileSheet(true);
        setShowCallMenu(false);
        setShowThreadMenu(false);
        setShowAttachMenu(false);
      }
    }, 420);
  };

  const cancelLongPress = () => {
    clearTimeout(longPressTimerRef.current);
  };

  const activeMessage = messages.find((msg) => msg.id === activeMessageId);

  return (
    <div style={page}>
      <style>{animations}</style>

      <div style={phone}>
        <div style={header}>
          <button style={headerBtn} onClick={() => setPage("messagesInbox")}>
            <IconBack />
          </button>

          <div style={avatar}>MC</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={name}>{activeName}</div>
            <div style={statusRow}>
              <span style={greenDot}></span>
              {typing
                ? language === "es"
                  ? "Escribiendo..."
                  : "Typing..."
                : language === "es"
                ? "Activo ahora"
                : "Active now"}
            </div>
          </div>

          <button
            style={{ ...headerBtn, ...(showCallMenu ? activeHeaderBtn : {}) }}
            onClick={() => {
              setShowThreadMenu(false);
              setShowAttachMenu(false);
              setActiveMessageId(null);
              setShowMobileSheet(false);
              setShowCallMenu((prev) => !prev);
            }}
          >
            <IconPhone />
          </button>

          <button
            style={{ ...headerBtn, ...(showThreadMenu ? activeHeaderBtn : {}) }}
            onClick={() => {
              setShowCallMenu(false);
              setShowAttachMenu(false);
              setActiveMessageId(null);
              setShowMobileSheet(false);
              setShowThreadMenu((prev) => !prev);
            }}
          >
            <IconMore />
          </button>
        </div>

        {showCallMenu && (
          <div style={callMenu}>
            <button style={callMenuBtn} onClick={() => setShowCallMenu(false)}>
              {language === "es" ? "Llamar cliente" : "Call customer"}
            </button>

            <button style={callMenuBtn} onClick={() => setShowCallMenu(false)}>
              {language === "es" ? "Detalles cliente" : "Customer details"}
            </button>
          </div>
        )}

        {showThreadMenu && (
          <div style={threadMenu}>
            <button style={threadMenuBtn} onClick={() => setShowThreadMenu(false)}>
              {language === "es" ? "Ver detalles cliente" : "View customer details"}
            </button>

            <button style={threadMenuBtn} onClick={markUnread}>
              {language === "es" ? "Marcar como no leído" : "Mark as unread"}
            </button>

            <button
              style={{ ...threadMenuBtn, color: "#ef4444" }}
              onClick={() => {
                setShowThreadMenu(false);
                setShowClearConfirm(true);
              }}
            >
              {language === "es" ? "Limpiar chat local" : "Clear local chat"}
            </button>
          </div>
        )}

        <div style={chatArea} onClick={closeMenus}>
          <div style={dateRow}>
            <span style={dateLine}></span>
            <strong>{language === "es" ? "Hoy" : "Today"}</strong>
            <span style={dateLine}></span>
          </div>

          {messages.map((msg) => {
            const mine = msg.sender === "me";

            return (
              <div
                key={msg.id}
                className="meetro-message-enter"
                style={{ ...messageRow, justifyContent: mine ? "flex-end" : "flex-start" }}
                onMouseDown={() => startLongPress(msg)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress(msg)}
                onTouchEnd={cancelLongPress}
              >
                <div
                  style={{
                    ...bubble,
                    ...(mine ? myBubble : theirBubble),
                    fontStyle: msg.unsent ? "italic" : "normal",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCallMenu(false);
                    setShowThreadMenu(false);
                    setShowAttachMenu(false);
                    setShowMobileSheet(false);
                    setActiveMessageId(activeMessageId === msg.id ? null : msg.id);
                  }}
                >
                  {msg.replyTo && (
                    <div style={mine ? replyPreviewMine : replyPreviewTheirs}>
                      <strong>
                        {msg.replyTo.sender === "me"
                          ? language === "es"
                            ? "Tú"
                            : "You"
                          : activeName}
                      </strong>
                      <span>{msg.replyTo.text}</span>
                    </div>
                  )}

                  {msg.type === "image" && msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt=""
                      style={imageMessage}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(msg.imageUrl);
                      }}
                    />
                  )}

                  {msg.type === "location" && (
                    <div style={richCard}>
                      <div style={richIconWrap}>
                        <IconLocationClean />
                      </div>
                      <div>
                        <strong>{msg.title}</strong>
                        <p>{msg.subtitle}</p>
                      </div>
                    </div>
                  )}

                  {msg.type === "scan" && (
                    <div style={richCard}>
                      <div style={richIconWrap}>
                        <IconScanClean />
                      </div>
                      <div>
                        <strong>{msg.title}</strong>
                        <p>{msg.subtitle}</p>
                      </div>
                    </div>
                  )}

                  <div>{msg.text}</div>

                  <div style={timeRow}>
                    <span>{msg.time}</span>
                    {mine && !msg.unsent && <span>{getStatusLabel(msg.status)}</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {typing && (
            <div style={typingRow}>
              <div style={typingBubble}>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}

          <div ref={bottomRef}></div>
        </div>

        {activeMessage && !activeMessage.unsent && (
          <div style={actionMenu}>
            <button style={actionBtn} onClick={() => startReply(activeMessage)}>
              {language === "es" ? "Responder" : "Reply"}
            </button>

            <button style={actionBtn} onClick={() => copyMessage(activeMessage)}>
              {language === "es" ? "Copiar" : "Copy"}
            </button>

            {activeMessage.sender === "me" && (
              <button style={{ ...actionBtn, color: "#ef4444" }} onClick={() => unsendMessage(activeMessage.id)}>
                {language === "es" ? "Eliminar" : "Unsend"}
              </button>
            )}
          </div>
        )}

        <div style={bottomStack}>
          {!showAttachMenu && (
            <div style={quickWrap}>
              {quickReplies.map((reply) => (
                <button key={reply} style={quickBtn} onClick={() => sendMessage(reply)}>
                  {reply}
                </button>
              ))}
            </div>
          )}

          {replyingTo && (
            <div style={replyComposer}>
              <div style={{ minWidth: 0 }}>
                <strong>{language === "es" ? "Respondiendo" : "Replying"}</strong>
                <div style={replyComposerText}>{replyingTo.text}</div>
              </div>

              <button style={replyCloseBtn} onClick={() => setReplyingTo(null)}>
                ×
              </button>
            </div>
          )}

          {pendingImage && (
            <div style={pendingImageBox}>
              <img src={pendingImage.url} alt="" style={pendingImageThumb} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{language === "es" ? "Imagen lista para enviar" : "Image ready to send"}</strong>
                <div style={pendingImageName}>{pendingImage.name}</div>
              </div>

              <button style={replyCloseBtn} onClick={() => setPendingImage(null)}>
                ×
              </button>
            </div>
          )}

          {showAttachMenu && (
            <div style={attachMenu}>
              <button style={attachMenuBtn} onClick={() => cameraInputRef.current.click()}>
                <span style={attachIconCircle}><IconCameraClean /></span>
                <span>{language === "es" ? "Cámara" : "Camera"}</span>
              </button>

              <button style={attachMenuBtn} onClick={() => fileInputRef.current.click()}>
                <span style={attachIconCircle}><IconPhotosClean /></span>
                <span>{language === "es" ? "Fotos" : "Photos"}</span>
              </button>

              <button style={attachMenuBtn} onClick={sendLocationCard}>
                <span style={attachIconCircle}><IconLocationClean /></span>
                <span>{language === "es" ? "Ubicación" : "Location"}</span>
              </button>

              <button style={attachMenuBtn} onClick={sendScanCard}>
                <span style={attachIconCircle}><IconScanClean /></span>
                <span>{language === "es" ? "Escanear" : "Scan"}</span>
              </button>
            </div>
          )}

          <div style={composer}>
            <button
              style={{ ...circleBtn, ...(showAttachMenu ? activeCircleBtn : {}) }}
              onClick={() => {
                setShowCallMenu(false);
                setShowThreadMenu(false);
                setShowAttachMenu((prev) => !prev);
              }}
            >
              <IconPlus />
            </button>

            <div style={inputWrap}>
              <input
                style={input}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={language === "es" ? "Escribe un mensaje..." : "Type a message..."}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
              />
            </div>

            <button
              style={circleBtn}
              onClick={() =>
                alert(language === "es" ? "Notas de voz próximamente." : "Voice notes coming soon.")
              }
            >
              <IconMic />
            </button>

            <button
              style={{ ...sendBtn, opacity: messageText.trim() || pendingImage ? 1 : 0.5 }}
              onClick={() => sendMessage()}
            >
              <IconSend />
            </button>

            <input ref={fileInputRef} type="file" style={{ display: "none" }} accept="image/*" onChange={handleImageUpload} />
            <input ref={cameraInputRef} type="file" style={{ display: "none" }} accept="image/*" capture="environment" onChange={handleImageUpload} />
          </div>
        </div>

        {showClearConfirm && (
          <div style={confirmOverlay}>
            <div style={confirmBox}>
              <h3 style={confirmTitle}>{language === "es" ? "¿Limpiar chat?" : "Clear chat?"}</h3>

              <p style={confirmText}>
                {language === "es"
                  ? "Esto eliminará los mensajes guardados localmente en este dispositivo."
                  : "This will delete locally saved messages on this device."}
              </p>

              <div style={confirmActions}>
                <button style={confirmCancelBtn} onClick={() => setShowClearConfirm(false)}>
                  {language === "es" ? "Cancelar" : "Cancel"}
                </button>

                <button style={confirmDeleteBtn} onClick={clearLocalChat}>
                  {language === "es" ? "Limpiar" : "Clear"}
                </button>
              </div>
            </div>
          </div>
        )}

        <BottomNav setPage={setPage} currentPage="messages" />

        {previewImage && (
          <div style={imageModal} onClick={() => setPreviewImage(null)}>
            <img src={previewImage} alt="" style={modalImage} />
          </div>
        )}
      </div>
    </div>
  );
}

const animations = `
@keyframes meetroMessageIn {
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.meetro-message-enter {
  animation: meetroMessageIn 190ms ease-out;
}

@keyframes meetroSheetIn {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes typingBounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
  40% { transform: translateY(-4px); opacity: 1; }
}

.typing-dot {
  width: 6px;
  height: 6px;
  background: #8b90a0;
  border-radius: 50%;
  display: inline-block;
  animation: typingBounce 1s infinite ease-in-out;
}

.typing-dot:nth-child(2) { animation-delay: 0.15s; }
.typing-dot:nth-child(3) { animation-delay: 0.3s; }

@media (max-width: 520px) {
  .meetro-message-enter {
    animation-duration: 160ms;
  }
}
`;

const page = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #eef1f8 0%, #f8fafc 100%)",
  display: "flex",
  justifyContent: "center",
  padding: "0 clamp(0px, 2vw, 24px)",
};

const phone = {
  width: "100%",
  maxWidth: "860px",
  background: "#ffffff",
  minHeight: "100vh",
  position: "relative",
  paddingBottom: "250px",
  overflowX: "hidden",
  boxShadow: "0 20px 60px rgba(15,23,42,0.08)",
};

const header = {
  height: "92px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "18px 16px",
  borderBottom: "1px solid #edf0f5",
  background: "rgba(255,255,255,0.96)",
  backdropFilter: "blur(14px)",
  position: "sticky",
  top: 0,
  zIndex: 20,
};

const headerBtn = {
  width: "44px",
  height: "44px",
  borderRadius: "18px",
  border: "1px solid #e7eaf2",
  background: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#111827",
  boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
};

const activeHeaderBtn = {
  border: "1px solid #5b3df5",
  color: "#5b3df5",
  background: "#f5f3ff",
};

const avatar = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #7c5cff, #5b3df5)",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  fontSize: "18px",
};

const name = {
  fontSize: "18px",
  fontWeight: "900",
  color: "#111827",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

const statusRow = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  marginTop: "4px",
  color: "#10b981",
  fontWeight: "700",
  fontSize: "13px",
};

const greenDot = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: "#10b981",
};

const callMenu = {
  position: "fixed",
  top: "82px",
  right: "max(68px, calc((100vw - 860px) / 2 + 68px))",
  width: "210px",
  background: "#ffffff",
  border: "1px solid #e8ebf3",
  borderRadius: "16px",
  boxShadow: "0 18px 42px rgba(15,23,42,0.14)",
  padding: "6px",
  zIndex: 81,
};

const callMenuBtn = {
  width: "100%",
  height: "40px",
  border: "none",
  borderRadius: "12px",
  background: "transparent",
  color: "#111827",
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
  textAlign: "left",
  padding: "0 12px",
};

const threadMenu = {
  position: "fixed",
  top: "82px",
  right: "max(16px, calc((100vw - 860px) / 2 + 16px))",
  width: "230px",
  background: "#ffffff",
  border: "1px solid #e8ebf3",
  borderRadius: "16px",
  boxShadow: "0 18px 42px rgba(15,23,42,0.14)",
  padding: "6px",
  zIndex: 80,
};

const threadMenuBtn = {
  width: "100%",
  height: "40px",
  border: "none",
  borderRadius: "12px",
  background: "transparent",
  color: "#111827",
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
  textAlign: "left",
  padding: "0 12px",
};

const chatArea = {
  padding: "22px clamp(16px, 3vw, 34px)",
  minHeight: "calc(100vh - 320px)",
};

const dateRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  marginBottom: "24px",
  color: "#64748b",
  fontSize: "13px",
};

const dateLine = {
  width: "60px",
  height: "1px",
  background: "#e5e7eb",
};

const messageRow = {
  display: "flex",
  marginBottom: "16px",
};

const bubble = {
  maxWidth: "min(72%, 560px)",
  padding: "14px 15px",
  borderRadius: "22px",
  fontSize: "14px",
  lineHeight: 1.45,
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
};

const theirBubble = {
  background: "#f7f7fb",
  color: "#111827",
  borderBottomLeftRadius: "8px",
};

const myBubble = {
  background: "linear-gradient(135deg, #7357ff, #5b3df5)",
  color: "#ffffff",
  borderBottomRightRadius: "8px",
};

const timeRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginTop: "8px",
  fontSize: "10px",
  opacity: 0.75,
};

const replyPreviewMine = {
  marginBottom: "8px",
  padding: "8px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.18)",
  borderLeft: "3px solid rgba(255,255,255,0.75)",
  display: "flex",
  flexDirection: "column",
  fontSize: "11px",
};

const replyPreviewTheirs = {
  marginBottom: "8px",
  padding: "8px",
  borderRadius: "12px",
  background: "#ffffff",
  borderLeft: "3px solid #5b3df5",
  display: "flex",
  flexDirection: "column",
  fontSize: "11px",
};

const imageMessage = {
  width: "100%",
  maxHeight: "300px",
  objectFit: "cover",
  borderRadius: "16px",
  marginBottom: "8px",
  cursor: "zoom-in",
};

const richCard = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px",
  marginBottom: "8px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.22)",
};

const richIconWrap = {
  width: "42px",
  height: "42px",
  borderRadius: "15px",
  background: "rgba(255,255,255,0.22)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const typingRow = {
  display: "flex",
  marginBottom: "16px",
};

const typingBubble = {
  background: "#f3f4f6",
  borderRadius: "18px",
  padding: "12px",
  display: "flex",
  gap: "4px",
};

const actionMenu = {
  position: "fixed",
  left: "50%",
  bottom: "240px",
  transform: "translateX(-50%)",
  width: "calc(100% - 32px)",
  maxWidth: "460px",
  background: "#ffffff",
  borderRadius: "20px",
  padding: "8px",
  display: "flex",
  gap: "8px",
  boxShadow: "0 18px 42px rgba(15,23,42,0.16)",
  zIndex: 60,
};

const actionBtn = {
  flex: 1,
  height: "40px",
  border: "none",
  borderRadius: "14px",
  background: "#f6f7fb",
  fontWeight: "700",
  cursor: "pointer",
};

const bottomStack = {
  position: "fixed",
  bottom: "102px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "100%",
  maxWidth: "860px",
  background: "rgba(255,255,255,0.97)",
  backdropFilter: "blur(14px)",
  zIndex: 35,
  borderTop: "1px solid #eef2f7",
};

const quickWrap = {
  display: "flex",
  gap: "8px",
  overflowX: "auto",
  padding: "8px 16px",
};

const quickBtn = {
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  borderRadius: "16px",
  padding: "10px 14px",
  fontSize: "12px",
  fontWeight: "700",
  whiteSpace: "nowrap",
  cursor: "pointer",
};

const replyComposer = {
  margin: "0 16px 8px",
  background: "#f7f8fb",
  borderLeft: "4px solid #5b3df5",
  borderRadius: "16px",
  padding: "10px 12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const replyComposerText = {
  fontSize: "12px",
  color: "#6b7280",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  maxWidth: "280px",
};

const replyCloseBtn = {
  width: "28px",
  height: "28px",
  borderRadius: "10px",
  border: "none",
  background: "#ffffff",
  cursor: "pointer",
};

const pendingImageBox = {
  margin: "0 16px 8px",
  background: "#f7f8fb",
  borderLeft: "4px solid #5b3df5",
  borderRadius: "16px",
  padding: "10px 12px",
  display: "flex",
  gap: "10px",
  alignItems: "center",
};

const pendingImageThumb = {
  width: "52px",
  height: "52px",
  borderRadius: "14px",
  objectFit: "cover",
};

const pendingImageName = {
  fontSize: "12px",
  color: "#6b7280",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

const attachMenu = {
  margin: "0 16px 8px",
  background: "#ffffff",
  border: "1px solid #e7eaf2",
  borderRadius: "24px",
  padding: "10px",
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "9px",
  boxShadow: "0 18px 45px rgba(15,23,42,0.14)",
  animation: "meetroSheetIn 180ms ease-out",
};

const attachMenuBtn = {
  minHeight: "70px",
  border: "none",
  borderRadius: "19px",
  background: "#f8fafc",
  color: "#111827",
  fontSize: "11px",
  fontWeight: "800",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
};

const attachIconCircle = {
  width: "38px",
  height: "38px",
  borderRadius: "15px",
  background: "#eef2ff",
  color: "#5b3df5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const composer = {
  margin: "0 16px 10px",
  background: "#ffffff",
  border: "1px solid #e7eaf2",
  borderRadius: "24px",
  padding: "8px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
};

const circleBtn = {
  width: "38px",
  height: "38px",
  borderRadius: "14px",
  border: "1px solid #e7eaf2",
  background: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "180ms ease",
};

const activeCircleBtn = {
  background: "#f5f3ff",
  border: "1px solid #5b3df5",
  color: "#5b3df5",
  transform: "rotate(45deg)",
  boxShadow: "0 8px 18px rgba(91,61,245,0.18)",
};

const inputWrap = {
  flex: 1,
  minWidth: 0,
};

const input = {
  width: "100%",
  border: "none",
  outline: "none",
  fontSize: "14px",
  background: "transparent",
};

const sendBtn = {
  width: "40px",
  height: "40px",
  borderRadius: "16px",
  border: "none",
  background: "linear-gradient(135deg, #7c5cff, #4f2df0)",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const confirmOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.35)",
  zIndex: 95,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const confirmBox = {
  width: "100%",
  maxWidth: "340px",
  background: "#ffffff",
  borderRadius: "24px",
  padding: "20px",
  boxShadow: "0 24px 80px rgba(15,23,42,0.24)",
};

const confirmTitle = {
  margin: "0 0 8px",
  fontSize: "18px",
  fontWeight: "900",
};

const confirmText = {
  fontSize: "14px",
  color: "#6b7280",
};

const confirmActions = {
  display: "flex",
  gap: "10px",
  marginTop: "18px",
};

const confirmCancelBtn = {
  flex: 1,
  height: "42px",
  border: "none",
  borderRadius: "15px",
  background: "#f3f4f8",
  fontWeight: "700",
  cursor: "pointer",
};

const confirmDeleteBtn = {
  flex: 1,
  height: "42px",
  border: "none",
  borderRadius: "15px",
  background: "#ef4444",
  color: "#ffffff",
  fontWeight: "700",
  cursor: "pointer",
};

const imageModal = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.82)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
  padding: "24px",
};

const modalImage = {
  maxWidth: "100%",
  maxHeight: "86vh",
  borderRadius: "24px",
};

export default ConversationThread;
