import API_URL from "../api";

export async function authFetch(endpoint, options = {}, setPage) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (
  response.status === 401 ||
  data.error === "Invalid token" ||
  data.error === "No token provided"
) {
  console.log("401 ignored during development");
}

  return { response, data };
}
