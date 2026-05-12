import BottomNav from "../components/BottomNav";

function Chat({ setPage, currentPage }) {
  return (
    <div
      style={{
        background: "#f5f5f7",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          display: "flex",
          flexDirection: "column",
          paddingBottom: "100px",
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
          <div style={{ paddingTop: "10px", paddingBottom: "6px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "42px",
                lineHeight: 1,
              }}
            >
              Messages
            </h1>

            <p
              style={{
                color: "#666",
                marginTop: "10px",
                fontSize: "16px",
              }}
            >
              Your conversations
            </p>
          </div>
        </div>

        <div
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <ChatCard
            name="Aqua Flow Plumbing"
            message="We can come by tomorrow morning."
            time="2m ago"
            initials="AF"
            unread={true}
            onClick={() => setPage("conversation")}
          />

          <ChatCard
            name="VoltCore Electric"
            message="Estimate sent to your inbox."
            time="12m ago"
            initials="VC"
            onClick={() => setPage("conversation")}
          />

          <ChatCard
            name="Cool Breeze HVAC"
            message="Thanks for contacting us."
            time="1h ago"
            initials="CB"
            onClick={() => setPage("conversation")}
          />
        </div>

        <BottomNav setPage={setPage} currentPage={currentPage} />
      </div>
    </div>
  );
}

function ChatCard({
  name,
  message,
  time,
  initials,
  unread,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "white",
        borderRadius: "24px",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "20px",
          background: "linear-gradient(135deg, #5b3df5, #9b7bff)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          fontSize: "20px",
          flexShrink: 0,
        }}
      >
        {initials}
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "18px",
            }}
          >
            {name}
          </h3>

          <span
            style={{
              color: "#999",
              fontSize: "13px",
            }}
          >
            {time}
          </span>
        </div>

        <p
          style={{
            marginTop: "8px",
            color: unread ? "#111" : "#777",
            fontWeight: unread ? "bold" : "normal",
            lineHeight: 1.4,
          }}
        >
          {message}
        </p>
      </div>

      {unread && (
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "#5b3df5",
          }}
        />
      )}
    </div>
  );
}

export default Chat;
