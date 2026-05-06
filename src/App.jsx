import { useState } from "react";
import axios from "axios";

const API = "https://athletic-rebirth-production-0a28.up.railway.app";

function App() {
  const [email, setEmail] = useState("test2@test.com");
  const [password, setPassword] = useState("123456");
  const [token, setToken] = useState("");
  const [users, setUsers] = useState([]);

  async function login() {
    try {
      const res = await axios.post(`${API}/auth/login`, {
        email,
        password,
      });

      setToken(res.data.token);
      alert("Login successful");
    } catch (err) {
      console.error(err);
      alert("Login failed");
    }
  }

  async function getUsers() {
    try {
      const res = await axios.get(`${API}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUsers(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch users");
    }
  }

  return (
    <div
      style={{
        background: "#0f172a",
        minHeight: "100vh",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial",
      }}
    >
      <h1 style={{ fontSize: "48px" }}>Athletic Rebirth</h1>
      <p>Train. Recover. Rebuild.</p>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ margin: "10px", padding: "12px", width: "250px" }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ margin: "10px", padding: "12px", width: "250px" }}
      />

      <button onClick={login} style={{ padding: "12px 24px", marginTop: "20px" }}>
        Login
      </button>

      <button onClick={getUsers} style={{ padding: "12px 24px", marginTop: "10px" }}>
        Load Users
      </button>

      <pre>{JSON.stringify(users, null, 2)}</pre>
    </div>
  );
}

export default App;
