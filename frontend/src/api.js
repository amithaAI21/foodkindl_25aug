// src/api.js

import axios from "axios";

/* ============================================================
   FOODKINDL BACKEND CONFIGURATION
============================================================ */

const DEFAULT_BACKEND_URL =
  import.meta.env.DEV
    ? "http://127.0.0.1:8000"
    : "https://foodkindl-25aug.onrender.com";

const rawBackendUrl =
  import.meta.env.VITE_BACKEND_URL ||
  DEFAULT_BACKEND_URL;

/*
  Normalizes these formats:

  https://foodkindl-25aug.onrender.com/
  https://foodkindl-25aug.onrender.com/api
  https://foodkindl-25aug.onrender.com/api/
*/
const backendUrl = String(rawBackendUrl)
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const API_BASE_URL = `${backendUrl}/api`;

/* ============================================================
   DEBUG
============================================================ */

if (import.meta.env.DEV) {
  console.log("=================================");
  console.log("FOODKINDL BACKEND:", backendUrl);
  console.log("FOODKINDL API BASE URL:", API_BASE_URL);
  console.log("=================================");
}

/* ============================================================
   AXIOS INSTANCE
============================================================ */

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
  },
  withCredentials: false,
});

/* ============================================================
   ACCESS TOKEN
============================================================ */

function getAccessToken() {
  return (
    localStorage.getItem("foodkindl_access") ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

/* ============================================================
   REQUEST INTERCEPTOR
============================================================ */

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
      // Browser automatically adds multipart boundary.
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    } else if (config.data !== undefined && config.data !== null) {
      config.headers["Content-Type"] = "application/json";
    }

    if (import.meta.env.DEV) {
      const method = config.method?.toUpperCase() || "GET";
      const fullUrl = `${config.baseURL || ""}${config.url || ""}`;

      console.log("FOODKINDL API REQUEST:", {
        method,
        fullUrl,
        authenticated: Boolean(token),
        data: isFormData ? "FormData" : config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error("FOODKINDL REQUEST ERROR:", error);
    return Promise.reject(error);
  }
);

/* ============================================================
   RESPONSE INTERCEPTOR
============================================================ */

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
    const status = error.response?.status;
    const responseData = error.response?.data;
    const fullUrl = error.config
      ? `${error.config.baseURL || ""}${error.config.url || ""}`
      : undefined;

    console.error("FOODKINDL API ERROR:", {
      url: error.config?.url,
      fullUrl,
      method: error.config?.method?.toUpperCase(),
      status,
      response: responseData,
      message: error.message,
    });

    if (status === 401) {
      console.warn("Authentication failed. Please log in again.");
    }

    if (status === 404) {
      console.warn(`API endpoint not found: ${fullUrl}`);
    }

    return Promise.reject(error);
  }
);

/* ============================================================
   AUTHENTICATION HELPERS
============================================================ */

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

/* ============================================================
   EXPORTS
============================================================ */

export { backendUrl, API_BASE_URL };

export default api;