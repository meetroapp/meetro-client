import { useState } from "react";
import BottomNav from "../components/BottomNav";

function Home({ setPage, currentPage }) {
  const [message, setMessage] = useState("");
  const [projects, setProjects] = useState([]);

  const handleCreateProject = () => {
    if (!message.trim()) return;

    const newProject = {
      id: Date.now(),
      title: message,
      category: "Plumbing",
      createdAt: new Date().toLocaleString(),
    };

    setProjects([newProject, ...projects]);
    setMessage("");
  };

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
          padding: "20px",
          paddingBottom: "120px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1
            style={{
              fontSize: "52px",
              color: "#5b3df5",
              margin: 0,
            }}
          >
            meetro
          </h1>

          <p
            style={{
              color: "#666",
              marginTop: "10px",
              fontSize: "18px",
            }}
          >
            Your AI homeowner assistant
          </p>
        </div>

        <div
          style={{
            background: "#ece7ff",
            padding: "24px",
            borderRadius: "28px",
            marginBottom: "28px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "32px",
              lineHeight: 1.1,
            }}
          >
            What can we help you with today?
          </h2>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your project..."
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "14px",
                border: "1px solid #ddd",
                fontSize: "16px",
              }}
            />

            <button
              onClick={handleCreateProject}
              style={{
                border: "none",
                background: "#5b3df5",
                color: "white",
                padding: "0 20px",
                borderRadius: "14px",
                fontSize: "22px",
                cursor: "pointer",
              }}
            >
              →
            </button>
          </div>
        </div>

        {projects.length > 0 && (
          <>
            <h2
              style={{
                marginBottom: "18px",
                fontSize: "28px",
              }}
            >
              Your Projects
            </h2>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setPage("projectDetails")}
                  style={{
                    background: "white",
                    padding: "22px",
                    borderRadius: "24px",
                    cursor: "pointer",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "22px",
                        }}
                      >
                        {project.category}
                      </h3>

                      <p
                        style={{
                          marginTop: "10px",
                          color: "#555",
                          fontSize: "18px",
                          lineHeight: 1.4,
                        }}
                      >
                        {project.title}
                      </p>

                      <p
                        style={{
                          color: "#999",
                          fontSize: "13px",
                          marginTop: "12px",
                        }}
                      >
                        {project.createdAt}
                      </p>
                    </div>

                    <div
                      style={{
                        background: "#eafaf0",
                        color: "#149947",
                        padding: "8px 12px",
                        borderRadius: "14px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                      }}
                    >
                      New Request
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: "36px" }}>
          <h2
            style={{
              marginBottom: "18px",
              fontSize: "28px",
            }}
          >
            Popular Services
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <ServiceCard
              emoji="🔧"
              title="Plumbing"
              description="Leaks, pipes, drains and more"
            />

            <ServiceCard
              emoji="⚡"
              title="Electrical"
              description="Repairs, outlets, breakers and installs"
            />

            <ServiceCard
              emoji="🛠️"
              title="Remodeling"
              description="Bathrooms, kitchens and renovations"
            />
          </div>
        </div>

        <BottomNav setPage={setPage} currentPage={currentPage} />
      </div>
    </div>
  );
}

function ServiceCard({ emoji, title, description }) {
  return (
    <div
      style={{
        background: "white",
        padding: "24px",
        borderRadius: "24px",
      }}
    >
      <h2 style={{ margin: 0 }}>
        {emoji} {title}
      </h2>

      <p
        style={{
          color: "#666",
          marginTop: "10px",
          fontSize: "17px",
        }}
      >
        {description}
      </p>
    </div>
  );
}

export default Home;
