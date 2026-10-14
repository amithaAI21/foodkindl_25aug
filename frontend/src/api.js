import axios from "axios";

// FoodKindl backend configuration
const DEFAULT_BACKEND_URL = import.meta.env.DEV
  ? "http://127.0.0.1:8000"
  : "https://foodkindl-25aug.onrender.com";

// Use the confirmed backend in production.
// Local development can still use VITE_BACKEND_URL.
const rawBackendUrl = import.meta.env.DEV
  ? import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL
  : DEFAULT_BACKEND_URL;

const backendUrl = String(rawBackendUrl)
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const API_BASE_URL = `${backendUrl}/api`;