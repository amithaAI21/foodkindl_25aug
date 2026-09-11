import axios from "axios";


/* ============================================================
   FOODKINDL BACKEND CONFIGURATION
============================================================ */

const DEFAULT_BACKEND_URL =
  "http://127.0.0.1:8000";


const backendUrl = (
  import.meta.env.VITE_BACKEND_URL ||
  DEFAULT_BACKEND_URL
)
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");


const API_BASE_URL =
  `${backendUrl}/api`;


/* ============================================================
   DEBUG
============================================================ */

console.log(
  "================================="
);

console.log(
  "FOODKINDL BACKEND:",
  backendUrl
);

console.log(
  "FOODKINDL API BASE URL:",
  API_BASE_URL
);

console.log(
  "================================="
);


/* ============================================================
   AXIOS INSTANCE
============================================================ */

const api = axios.create({

  baseURL:
    API_BASE_URL,

  timeout:
    60000,

  headers: {
    Accept:
      "application/json",
  },

});


/* ============================================================
   REQUEST INTERCEPTOR
============================================================ */

api.interceptors.request.use(

  config => {

    /* ----------------------------------------------------------
       AUTH TOKEN
    ---------------------------------------------------------- */

    const token =
      localStorage.getItem(
        "foodkindl_access"
      );


    if (token) {

      config.headers =
        config.headers || {};


      config.headers.Authorization =
        `Bearer ${token}`;

    }


    /* ----------------------------------------------------------
       FORM DATA / JSON
    ---------------------------------------------------------- */

    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData
    ) {

      if (config.headers) {

        delete config.headers[
          "Content-Type"
        ];

        delete config.headers[
          "content-type"
        ];

      }

    } else {

      config.headers =
        config.headers || {};


      config.headers[
        "Content-Type"
      ] =
        "application/json";

    }


    /* ----------------------------------------------------------
       DEBUG REQUEST
    ---------------------------------------------------------- */

    console.log(
      "FOODKINDL API REQUEST:",
      {
        method:
          config.method
            ?.toUpperCase(),

        baseURL:
          config.baseURL,

        url:
          config.url,

        fullUrl:
          `${config.baseURL || ""}${config.url || ""}`,
      }
    );


    return config;

  },

  error => {

    console.error(
      "FOODKINDL REQUEST ERROR:",
      error
    );


    return Promise.reject(
      error
    );

  }

);


/* ============================================================
   RESPONSE INTERCEPTOR
============================================================ */

api.interceptors.response.use(

  response => {

    console.log(
      "FOODKINDL API RESPONSE:",
      {
        url:
          response.config?.url,

        status:
          response.status,
      }
    );


    return response;

  },

  error => {

    console.error(
      "FOODKINDL API ERROR:",
      {
        url:
          error.config?.url,

        baseURL:
          error.config?.baseURL,

        fullUrl:
          error.config
            ? `${error.config.baseURL || ""}${error.config.url || ""}`
            : undefined,

        method:
          error.config?.method,

        status:
          error.response?.status,

        response:
          error.response?.data,

        message:
          error.message,
      }
    );


    return Promise.reject(
      error
    );

  }

);


/* ============================================================
   EXPORTS
============================================================ */

export {
  backendUrl,
  API_BASE_URL,
};


export default api;