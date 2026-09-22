import axios from "axios";

/*
  FOODKINDL BACKEND CONFIGURATION
*/

const DEFAULT_BACKEND_URL = import.meta.env.DEV
  ? "http://127.0.0.1:8000"
  : "https://foodkindl-25aug.onrender.com";

const rawBackendUrl =
  import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;

/*
  Supports:
  https://example.com
  https://example.com/
  https://example.com/api
  https://example.com/api/
*/
const backendUrl = String(rawBackendUrl)
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const API_BASE_URL = `${backendUrl}/api`;

if (import.meta.env.DEV) {
  console.log("FOODKINDL BACKEND:", backendUrl);
  console.log("FOODKINDL API BASE URL:", API_BASE_URL);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

function getAccessToken() {
  return (
    localStorage.getItem("foodkindl_access") ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    const isFormData =
      typeof FormData !== "undefined" &&
      config.data instanceof FormData;

    if (isFormData) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    } else if (config.data !== undefined && config.data !== null) {
      config.headers["Content-Type"] = "application/json";
    }

    if (import.meta.env.DEV) {
      console.log("FOODKINDL API REQUEST:", {
        method: config.method?.toUpperCase() || "GET",
        url: `${config.baseURL || ""}${config.url || ""}`,
        data: config.data,
      });
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log("FOODKINDL API RESPONSE:", {
        url: response.config?.url,
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  (error) => {
    console.error("FOODKINDL API ERROR:", {
      url: error.config?.url,
      fullUrl: error.config
        ? `${error.config.baseURL || ""}${error.config.url || ""}`
        : "",
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      response: error.response?.data,
      message: error.message,
    });

    return Promise.reject(error);
  }
);

export function setAccessToken(token) {
  if (token) {
    localStorage.setItem("foodkindl_access", token);
  }
}

export function clearAccessToken() {
  localStorage.removeItem("foodkindl_access");
  localStorage.removeItem("access");
  localStorage.removeItem("access_token");
}

export function hasAccessToken() {
  return Boolean(getAccessToken());
}

export { backendUrl, API_BASE_URL };
export default api;