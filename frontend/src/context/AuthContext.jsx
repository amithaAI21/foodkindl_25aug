import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api";


const AuthContext =
  createContext(null);


export function AuthProvider({
  children,
}) {

  const [
    user,
    setUser,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  /* ============================================================
     LOAD CURRENT USER
  ============================================================ */

  const loadUser =
    useCallback(
      async () => {

        const token =
          localStorage.getItem(
            "foodkindl_access"
          );


        if (!token) {

          setUser(null);

          setLoading(false);

          return null;
        }


        try {

          const response =
            await api.get(
              "/auth/me/"
            );


          setUser(
            response.data
          );


          return response.data;


        } catch (error) {

          console.error(
            "Unable to load user:",
            error.response?.data ||
            error
          );


          localStorage.removeItem(
            "foodkindl_access"
          );

          localStorage.removeItem(
            "foodkindl_refresh"
          );


          setUser(null);

          return null;


        } finally {

          setLoading(false);
        }
      },
      []
    );


  useEffect(
    () => {

      loadUser();

    },
    [
      loadUser,
    ]
  );


  /* ============================================================
     LOGIN
  ============================================================ */

  const login =
    useCallback(
      async (
        email,
        password
      ) => {

        const normalizedEmail =
          String(
            email || ""
          )
            .trim()
            .toLowerCase();


        const normalizedPassword =
          String(
            password || ""
          )
            .trim();


        console.log(
          "LOGIN DATA:",
          {
            email:
              normalizedEmail,

            passwordLength:
              normalizedPassword.length,
          }
        );


        try {

          const response =
            await api.post(
              "/auth/login/",
              {
                email:
                  normalizedEmail,

                password:
                  normalizedPassword,
              }
            );


          console.log(
            "LOGIN SUCCESS:",
            response.data
          );


          const {
            access,
            refresh,
            user:
              loggedInUser,
          } = response.data;


          if (
            !access ||
            !refresh
          ) {

            throw new Error(
              "Login succeeded, but authentication tokens were not returned."
            );
          }


          localStorage.setItem(
            "foodkindl_access",
            access
          );


          localStorage.setItem(
            "foodkindl_refresh",
            refresh
          );


          setUser(
            loggedInUser
          );


          return loggedInUser;


        } catch (error) {

          console.error(
            "LOGIN ERROR:",
            {
              status:
                error.response?.status,

              data:
                error.response?.data,

              url:
                error.config?.url,

              email:
                normalizedEmail,

              passwordLength:
                normalizedPassword.length,
            }
          );


          throw error;
        }
      },
      []
    );


  /* ============================================================
     REGISTER
  ============================================================ */

  const register =
    useCallback(
      async (
        payload
      ) => {

        const normalizedEmail =
          String(
            payload?.email || ""
          )
            .trim()
            .toLowerCase();


        const accountType =
          payload?.account_type ===
          "partner"
            ? "partner"
            : "member";


        console.log(
          "Registering account type:",
          accountType
        );


        try {

          const response =
            await api.post(
              "/auth/register/",
              {

                first_name:
                  String(
                    payload?.first_name ||
                    ""
                  ).trim(),

                last_name:
                  String(
                    payload?.last_name ||
                    ""
                  ).trim(),

                email:
                  normalizedEmail,

                password:
                  String(
                    payload?.password ||
                    ""
                  ).trim(),

                account_type:
                  accountType,
              }
            );


          return response.data;


        } catch (error) {

          console.error(
            "REGISTER ERROR:",
            {
              status:
                error.response?.status,

              data:
                error.response?.data,

              url:
                error.config?.url,
            }
          );


          throw error;
        }
      },
      []
    );


  /* ============================================================
     LOGOUT
  ============================================================ */

  const logout =
    useCallback(
      () => {

        localStorage.removeItem(
          "foodkindl_access"
        );

        localStorage.removeItem(
          "foodkindl_refresh"
        );


        setUser(null);
      },
      []
    );


  /* ============================================================
     CONTEXT VALUE
  ============================================================ */

  const value =
    useMemo(
      () => ({

        user,
        loading,

        login,
        register,
        logout,

        reloadUser:
          loadUser,

        refreshUser:
          loadUser,

      }),
      [
        user,
        loading,
        login,
        register,
        logout,
        loadUser,
      ]
    );


  /* ============================================================
     PROVIDER
  ============================================================ */

  return (

    <AuthContext.Provider
      value={
        value
      }
    >

      {children}

    </AuthContext.Provider>
  );
}


/* ============================================================
   AUTH HOOK
============================================================ */

export function useAuth() {

  const context =
    useContext(
      AuthContext
    );


  if (!context) {

    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }


  return context;
}