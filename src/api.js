const DEFAULT_API_URL = "https://athletic-rebirth-production-0a28.up.railway.app";

const configuredApiUrl = import.meta.env?.VITE_API_URL || DEFAULT_API_URL;
const API_URL = configuredApiUrl.replace(/\/+$/, "");

export default API_URL;
