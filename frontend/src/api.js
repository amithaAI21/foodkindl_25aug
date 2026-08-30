import axios from "axios";


const backendUrl = (
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");


const api = axios.create({
  baseURL: `${backendUrl}/api`,
  timeout: 60000,
  headers: {
    Accept: "application/json",
  },
});


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(
      "foodkindl_access"
    );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    /*
     * IMPORTANT FOR IMAGE UPLOADS
     *
     * Never manually force multipart/form-data.
     * The browser must generate the boundary.
     */
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    } else {
      config.headers["Content-Type"] =
        "application/json";
    }

    return config;
  },

  (error) => Promise.reject(error)
);


api.interceptors.response.use(
  (response) => response,

  (error) => {
    console.error(
      "FOODKINDL API ERROR:",
      {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
        status: error.response?.status,
        response: error.response?.data,
        message: error.message,
      }
    );

    return Promise.reject(error);
  }
);


export default api;