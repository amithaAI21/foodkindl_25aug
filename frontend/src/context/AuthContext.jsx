
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api";

const AuthContext = createContext(null);

const ACCESS_KEY = "foodkindl_access";
const REFRESH_KEY = "foodkindl_refresh";

// Normalize email address
function normalizeEmail(email) {
  const value = String(email ?? "").trim().toLowerCase();

  if (!value) {
    throw new Error("Email address is required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error("Enter a valid email address.");
  }

  return value;
}

// Normalize Indian mobile number
function normalizeMobile(value) {
  let mobile = String(value ?? "").replace(/[\s()-]/g, "");

  if (mobile.startsWith("+91")) {
    mobile = mobile.slice(3);
  } else if (
    mobile.length === 12 &&
    mobile.startsWith("91")
  ) {
    mobile = mobile.slice(2);
  }

  if (!/^[6-9][0-9]{9}$/.test(mobile)) {
    throw new Error("Enter a valid Indian 10-digit mobile number.");
  }

  return mobile;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(localStorage.getItem(ACCESS_KEY))
  );

  // Clear authentication
  const clearAuth = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);

    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Fetch currently logged-in user
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

      setUser(response.data);
      setIsAuthenticated(true);

      return response.data;
    } catch (error) {
      // Do not clear tokens for temporary network errors.
      // A 403 can also mean insufficient permission,
      // so only clear on an explicit 401.
      if (error.response?.status === 401) {
        clearAuth();
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Save JWT tokens after successful login
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
      setUser(null);
      setLoading(false);

      if (data?.user) {
        setUser(data.user);
        return data.user;
      }

      return loadUser();
    },
    [loadUser]
  );

  // LOGIN USING EMAIL AND PASSWORD
  const login = useCallback(
    async (email, password) => {
      const normalizedEmail = normalizeEmail(email);
      const normalizedPassword = String(password ?? "");

      if (!normalizedPassword) {
        throw new Error("Password is required.");
      }

      const response = await api.post("/auth/login/", {
        email: normalizedEmail,
        password: normalizedPassword,
      });

      return completeLogin(response.data);
    },
    [completeLogin]
  );

  // REQUEST OTP TO MOBILE NUMBER
  const requestLoginOTP = useCallback(async (mobile) => {
    const normalizedMobile = normalizeMobile(mobile);

    const response = await api.post("/auth/otp/request/", {
      mobile: normalizedMobile,
    });

    return response.data;
  }, []);

  // VERIFY OTP AND LOGIN
  const verifyLoginOTP = useCallback(
    async (number, otp) => {
      const mobile = normalizeMobile(number);
      const code = String(otp ?? "").trim();

      if (!/^\d{6}$/.test(code)) {
        throw new Error("Enter a valid 6-digit OTP.");
      }

      const response = await api.post("/auth/otp/verify/", {
        mobile,
        otp: code,
      });

      return completeLogin(response.data);
    },
    [completeLogin]
  );

  // REGISTER NEW FOODKINDL USER
  const register = useCallback(async (payload) => {
  const full_name = String(payload?.full_name ?? "")
    .trim()
    .replace(/\s+/g, " ");

  if (full_name.length < 2) {
    throw new Error("Please enter your full name.");
  }

  const email = normalizeEmail(payload?.email);

  const phone_number = normalizeMobile(
    payload?.phone_number
  );

  const password = String(payload?.password ?? "");

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

  const account_type =
    payload?.account_type === "partner"
      ? "partner"
      : "member";

  const response = await api.post("/auth/register/", {
    full_name,
    email,
    phone_number,
    password,
    account_type,
  });

  return response.data;
}, []);

  // LOGOUT
  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      requestLoginOTP,
      verifyLoginOTP,
      register,
      logout,
      reloadUser: loadUser,
      refreshUser: loadUser,
      isAuthenticated,
    }),
    [
      user,
      loading,
      login,
      requestLoginOTP,
      verifyLoginOTP,
      register,
      logout,
      loadUser,
      isAuthenticated,
    ]
  );

  return (
  <AuthContext.Provider value={value}>
    {children}
  </AuthContext.Provider>
);
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}
