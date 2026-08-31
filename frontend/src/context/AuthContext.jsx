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


/* ============================================================
   AUTH PROVIDER
============================================================ */

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
     CLEAR AUTH
  ============================================================ */

  const clearAuth =
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


          console.log(
            "CURRENT USER:",
            response.data
          );


          setUser(
            response.data
          );


          return response.data;


        } catch (error) {

          console.error(
            "Unable to load user:",
            {
              status:
                error.response?.status,

              data:
                error.response?.data,

              url:
                error.config?.url,

              baseURL:
                error.config?.baseURL,

              message:
                error.message,
            }
          );


          /*
           * Only clear authentication when
           * the server says the token is invalid.
           *
           * Do NOT logout just because of a
           * temporary network/server error.
           */

          if (
            error.response?.status === 401 ||
            error.response?.status === 403
          ) {

            clearAuth();
          }


          return null;


        } finally {

          setLoading(false);
        }
      },
      [
        clearAuth,
      ]
    );


  /* ============================================================
     INITIAL USER LOAD
  ============================================================ */

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


        /*
         * Do NOT trim passwords.
         *
         * A password may legally contain
         * leading/trailing spaces.
         */

        const normalizedPassword =
          String(
            password || ""
          );


        if (!normalizedEmail) {

          throw new Error(
            "Email address is required."
          );
        }


        if (!normalizedPassword) {

          throw new Error(
            "Password is required."
          );
        }


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


          const access =
            response.data?.access;


          const refresh =
            response.data?.refresh;


          const loggedInUser =
            response.data?.user;


          if (!access) {

            throw new Error(
              "Login succeeded, but no access token was returned."
            );
          }


          /* ======================================================
             STORE ACCESS TOKEN
          ====================================================== */

          localStorage.setItem(
            "foodkindl_access",
            access
          );


          /* ======================================================
             STORE REFRESH TOKEN IF AVAILABLE
          ====================================================== */

          if (refresh) {

            localStorage.setItem(
              "foodkindl_refresh",
              refresh
            );

          } else {

            localStorage.removeItem(
              "foodkindl_refresh"
            );
          }


          /* ======================================================
             USER RETURNED WITH LOGIN RESPONSE
          ====================================================== */

          if (loggedInUser) {

            setUser(
              loggedInUser
            );


            return loggedInUser;
          }


          /* ======================================================
             IF LOGIN RETURNS ONLY TOKENS,
             FETCH USER FROM /auth/me/
          ====================================================== */

          try {

            const meResponse =
              await api.get(
                "/auth/me/"
              );


            setUser(
              meResponse.data
            );


            return meResponse.data;


          } catch (userLoadError) {

            console.error(
              "Login worked but user could not be loaded:",
              {
                status:
                  userLoadError.response?.status,

                data:
                  userLoadError.response?.data,

                message:
                  userLoadError.message,
              }
            );


            /*
             * Token is valid enough to have
             * been returned by login.
             *
             * Don't automatically delete it
             * for a temporary /auth/me/ failure.
             */

            setUser(null);


            return null;
          }


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

              baseURL:
                error.config?.baseURL,

              message:
                error.message,

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
      async payload => {

        const normalizedEmail =
          String(
            payload?.email || ""
          )
            .trim()
            .toLowerCase();


        const normalizedPassword =
          String(
            payload?.password || ""
          );


        const firstName =
          String(
            payload?.first_name || ""
          ).trim();


        const lastName =
          String(
            payload?.last_name || ""
          ).trim();


        const accountType =
          payload?.account_type ===
          "partner"
            ? "partner"
            : "member";


        if (!normalizedEmail) {

          throw new Error(
            "Email address is required."
          );
        }


        if (!normalizedPassword) {

          throw new Error(
            "Password is required."
          );
        }


        console.log(
          "REGISTER DATA:",
          {
            email:
              normalizedEmail,

            accountType,

            passwordLength:
              normalizedPassword.length,
          }
        );


        try {

          const response =
            await api.post(
              "/auth/register/",
              {

                first_name:
                  firstName,

                last_name:
                  lastName,

                email:
                  normalizedEmail,

                password:
                  normalizedPassword,

                account_type:
                  accountType,

              }
            );


          console.log(
            "REGISTER SUCCESS:",
            response.data
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

              baseURL:
                error.config?.baseURL,

              message:
                error.message,
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

        clearAuth();

      },
      [
        clearAuth,
      ]
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

        isAuthenticated:
          Boolean(
            localStorage.getItem(
              "foodkindl_access"
            )
          ),

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