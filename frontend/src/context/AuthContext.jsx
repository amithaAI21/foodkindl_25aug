
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api";

/* =========================================================
   AUTH CONTEXT
========================================================= */

const AuthContext = createContext(null);

const ACCESS_KEY = "foodkindl_access";
const REFRESH_KEY = "foodkindl_refresh";

/* =========================================================
   NORMALIZE EMAIL
========================================================= */

function normalizeEmail(email) {
  const value = String(email ?? "")
    .trim()
    .toLowerCase();

  if (!value) {
    throw new Error("Email address is required.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(value)) {
    throw new Error("Enter a valid email address.");
  }

  return value;
}

/* =========================================================
   NORMALIZE MOBILE NUMBER
========================================================= */

function normalizeMobile(value) {
  let mobile = String(value ?? "").replace(
    /[\s()-]/g,
    ""
  );

  if (mobile.startsWith("+91")) {
    mobile = mobile.slice(3);
  } else if (
    mobile.length === 12 &&
    mobile.startsWith("91")
  ) {
    mobile = mobile.slice(2);
  }

  if (!/^[6-9][0-9]{9}$/.test(mobile)) {
    throw new Error(
      "Enter a valid Indian 10-digit mobile number."
    );
  }

  return mobile;
}

/* =========================================================
   ACCOUNT TYPE
========================================================= */

export function getAccountType(user) {
  const accountType =
    user?.profile?.account_type ??
    user?.account_type ??
    user?.user?.profile?.account_type ??
    user?.user?.account_type;

  if (accountType === "partner") {
    return "partner";
  }

  if (accountType === "member") {
    return "member";
  }

  return null;
}

/* =========================================================
   DASHBOARD ROUTING
========================================================= */

export function getDashboardPath(user) {
  const accountType = getAccountType(user);

  if (accountType === "partner") {
    return "/partner/dashboard";
  }

  if (accountType === "member") {
    return "/discover";
  }

  return null;
}

/* =========================================================
   AUTH PROVIDER
========================================================= */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(localStorage.getItem(ACCESS_KEY))
  );

  /* =======================================================
     CLEAR AUTH
  ======================================================= */

  const clearAuth = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);

    // Remove legacy keys.
    localStorage.removeItem("access");
    localStorage.removeItem("access_token");

    setUser(null);
    setIsAuthenticated(false);
  }, []);

  /* =======================================================
     FETCH AUTHENTICATED USER
  ======================================================= */

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_KEY);

    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      return null;
    }

    try {
      const response = await api.get("/auth/me/");

      const currentUser = response.data;

      if (!currentUser) {
        throw new Error(
          "Unable to load user account information."
        );
      }

      setUser(currentUser);
      setIsAuthenticated(true);

      return currentUser;
    } catch (error) {
      console.error(
        "Unable to load user:",
        error?.response?.status || error?.message
      );

      if (error?.response?.status === 401) {
        clearAuth();
      } else {
        setUser(null);
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  /* =======================================================
     LOAD SESSION WHEN APP OPENS
  ======================================================= */

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  /* =======================================================
     COMPLETE LOGIN
  ======================================================= */

  const completeLogin = useCallback(
    async (data) => {
      const access = data?.access;
      const refresh = data?.refresh;

      if (typeof access !== "string" || !access) {
        throw new Error(
          "Login succeeded, but no access token was returned."
        );
      }

      localStorage.setItem(ACCESS_KEY, access);

      if (typeof refresh === "string" && refresh) {
        localStorage.setItem(REFRESH_KEY, refresh);
      } else {
        localStorage.removeItem(REFRESH_KEY);
      }

      setIsAuthenticated(true);
      setLoading(false);

      // Prefer account information returned by Django.
      let currentUser = data?.user ?? null;

      // Fetch the latest profile, including account_type.
      const fetchedUser = await loadUser();

      if (fetchedUser) {
        currentUser = fetchedUser;
      }

      if (!currentUser) {
        throw new Error(
          "Login succeeded, but user details were not returned."
        );
      }

      setUser(currentUser);

      return currentUser;
    },
    [loadUser]
  );

  /* =======================================================
     LOGIN USING EMAIL AND PASSWORD
  ======================================================= */

  const login = useCallback(
    async (email, password) => {
      const normalizedEmail = normalizeEmail(email);
      const normalizedPassword = String(
        password ?? ""
      );

      if (!normalizedPassword) {
        throw new Error("Password is required.");
      }

      const response = await api.post(
        "/auth/login/",
        {
          email: normalizedEmail,
          password: normalizedPassword,
        }
      );

      return completeLogin(response.data);
    },
    [completeLogin]
  );

  /* =======================================================
     REGISTER USER
     MEMBER / RESTAURANT PARTNER
  ======================================================= */

  const register = useCallback(async (payload) => {
    const account_type =
      payload?.account_type === "partner"
        ? "partner"
        : "member";

    /* FIRST AND LAST NAME */

    const first_name = String(
      payload?.first_name ?? ""
    ).trim();

    const last_name = String(
      payload?.last_name ?? ""
    ).trim();

    /* FULL NAME */

    const full_name = String(
      payload?.full_name ||
      `${first_name} ${last_name}`
    )
      .trim()
      .replace(/\s+/g, " ");

    if (full_name.length < 2) {
      throw new Error(
        "Please enter your full name."
      );
    }

    if (
      account_type === "partner" &&
      (!first_name || !last_name)
    ) {
      throw new Error(
        "Please enter your first and last name."
      );
    }

    /* EMAIL */

    const email = normalizeEmail(payload?.email);

    /* PHONE NUMBER */

    const phone_number = normalizeMobile(
      payload?.phone_number
    );

    /* PASSWORD */

    const password = String(
      payload?.password ?? ""
    );

    if (password.length < 8) {
      throw new Error(
        "Password must contain at least 8 characters."
      );
    }

    if (
      payload?.confirm_password !== undefined &&
      password !== payload.confirm_password
    ) {
      throw new Error("Passwords do not match.");
    }

    /* REGISTRATION PAYLOAD */

    const registrationData = {
      full_name,
      email,
      phone_number,
      password,
      account_type,
    };

    if (account_type === "partner") {
      registrationData.first_name = first_name;
      registrationData.last_name = last_name;
    }

    /* SEND REGISTRATION TO DJANGO */

    const response = await api.post(
      "/auth/register/",
      registrationData
    );

    // Email verification is handled by Django.
    // Registration does not automatically log in.

    return response.data;
  }, []);

  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  /* =======================================================
     CONTEXT VALUES
  ======================================================= */

  const accountType = getAccountType(user);
  const dashboardPath = getDashboardPath(user);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,

      reloadUser: loadUser,
      refreshUser: loadUser,

      isAuthenticated,
      accountType,
      dashboardPath,
    }),
    [
      user,
      loading,
      login,
      register,
      logout,
      loadUser,
      isAuthenticated,
      accountType,
      dashboardPath,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/* =========================================================
   USE AUTH
========================================================= */

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}
