import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";

function Profile({ setPage, currentPage }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          "https://athletic-rebirth-production-0a28.up.railway.app/auth/me",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        console.log(data);

        setUser(data.user);
      } catch (error) {
        console.error(error);
      }
    }

    fetchUser();
  }, []);

  return (
    <div
      style={{
        padding: "20px",
        paddingBottom: "120px",
        textAlign: "center",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <h1
        style={{
          fontSize: "42px",
          marginBottom: "10px",
        }}
      >
        Profile
      </h1>

      <div
        style={{
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          background: "#ddd",
          margin: "20px auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "50px",
        }}
      >
        👤
      </div>

      <h2>
        {user ? user.email : "Loading user..."}
      </h2>

      <p
        style={{
          color: "#666",
          maxWidth: "300px",
          margin: "10px auto 30px",
          lineHeight: "1.5",
        }}
      >
        Authenticated Meetro account
      </p>

      <button
        onClick={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");

          window.location.hash = "login";

          window.location.reload();
        }}
        style={{
          padding: "14px 24px",
          background: "#5b3df5",
          color: "white",
          border: "none",
          borderRadius: "12px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Logout
      </button>

      <BottomNav
        setPage={setPage}
        currentPage={currentPage}
      />
    </div>
  );
}

export default Profile;
