import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import Navbar from "./components/Navbar";
import MessagingDock from "./components/MessagingDock";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Community from "./pages/Community";
import CommunityPostDetail from "./pages/CommunityPostDetail";
import FoodListings from "./pages/FoodListings";
import Connect from "./pages/Connect";
import MemberProfile from "./pages/MemberProfile";
import Profile from "./pages/Profile";
import VerificationRequired from "./pages/VerificationRequired";
import AIKitchen from "./pages/AIKitchen";
import Careers from "./pages/Careers";
import Contact from "./pages/Contact";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import SafetyCentre from "./pages/SafetyCentre";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import Settings from "./pages/Settings";
import SafetyVerification from "./pages/SafetyVerification";
import SOSSafety from "./pages/SOSSafety";

import FoodInvites from "./pages/FoodInvites";

import {
  useAuth,
} from "./context/AuthContext";


// ============================================================
// PUBLIC DARK PAGES
// ============================================================

const PUBLIC_DARK_PAGES = [
  "/",
  "/login",
  "/register",
  "/careers",
  "/contact",
  "/community-guidelines",
  "/safety",
  "/privacy",
  "/terms",
];


// ============================================================
// SCROLL TO TOP
// ============================================================

function ScrollToTop() {

  const {
    pathname,
  } = useLocation();


  useEffect(
    () => {

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });

    },
    [
      pathname,
    ]
  );


  return null;
}


// ============================================================
// APP THEME CONTROLLER
// ============================================================

function ThemeController() {

  const location =
    useLocation();


  const [
    systemDark,
    setSystemDark,
  ] = useState(
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches
  );


  // =========================================================
  // WATCH SYSTEM THEME
  // =========================================================

  useEffect(
    () => {

      const mediaQuery =
        window.matchMedia(
          "(prefers-color-scheme: dark)"
        );


      function handleChange(
        event
      ) {

        setSystemDark(
          event.matches
        );
      }


      mediaQuery.addEventListener(
        "change",
        handleChange
      );


      return () => {

        mediaQuery.removeEventListener(
          "change",
          handleChange
        );

      };

    },
    []
  );


  // =========================================================
  // APPLY THEME
  // =========================================================

  useEffect(
    () => {

      const body =
        document.body;


      body.classList.remove(
        "foodkindl-app-light",
        "foodkindl-app-dark",
        "foodkindl-public-dark"
      );


      document.documentElement
        .removeAttribute(
          "data-theme"
        );


      // ======================================================
      // PUBLIC WEBSITE
      // ======================================================

      if (
        PUBLIC_DARK_PAGES.includes(
          location.pathname
        )
      ) {

        body.classList.add(
          "foodkindl-public-dark"
        );

        return;
      }


      // ======================================================
      // LOGGED-IN APP
      // ======================================================

      const savedTheme =
        localStorage.getItem(
          "foodkindl_theme"
        ) || "dark";


      let resolvedTheme =
        savedTheme;


      if (
        savedTheme ===
        "system"
      ) {

        resolvedTheme =
          systemDark
            ? "dark"
            : "light";
      }


      body.classList.add(

        resolvedTheme ===
        "light"
          ? "foodkindl-app-light"
          : "foodkindl-app-dark"

      );

    },
    [
      location.pathname,
      systemDark,
    ]
  );


  return null;
}


// ============================================================
// PROTECTED ROUTE
// ============================================================

function Protected({
  children,
}) {

  const {
    user,
    loading,
  } = useAuth();


  if (
    loading
  ) {

    return (

      <main className="app-page">

        Loading FoodKindl...

      </main>

    );
  }


  return user
    ? children
    : (

        <Navigate
          to="/login"
          replace
        />

      );
}


// ============================================================
// VERIFIED USERS ONLY
// ============================================================

function VerifiedOnly({
  children,
}) {

  const {
    user,
    loading,
  } = useAuth();


  if (
    loading
  ) {

    return (

      <main className="app-page">

        Checking verification...

      </main>

    );
  }


  if (
    !user
  ) {

    return (

      <Navigate
        to="/login"
        replace
      />

    );
  }


  const approved =

    user?.profile?.is_verified ===
      true

    &&

    user?.profile?.verification_status ===
      "approved";


  return approved
    ? children
    : (

        <Navigate
          to="/verification-required"
          replace
        />

      );
}


// ============================================================
// APP
// ============================================================

export default function App() {

  const {
    user,
  } = useAuth();


  const location =
    useLocation();


  const verified =

    user?.profile?.is_verified ===
      true

    &&

    user?.profile?.verification_status ===
      "approved";


  // =========================================================
  // MESSAGING HIDDEN ON PUBLIC PAGES
  // =========================================================

  const hideMessaging = [
    "/",
    "/login",
    "/register",
    "/careers",
    "/contact",
    "/community-guidelines",
    "/safety",
    "/privacy",
    "/terms",
  ].includes(
    location.pathname
  );


  return (

    <>

      {/* =====================================================
          GLOBAL HELPERS
      ===================================================== */}

      <ScrollToTop />

      <ThemeController />


      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <Navbar />


      {/* =====================================================
          ROUTES
      ===================================================== */}

      <Routes>


        {/* ===================================================
            PUBLIC WEBSITE
        =================================================== */}

        <Route
          path="/"
          element={
            <LandingPage />
          }
        />


        <Route
          path="/careers"
          element={
            <Careers />
          }
        />


        <Route
          path="/contact"
          element={
            <Contact />
          }
        />


        <Route
          path="/community-guidelines"
          element={
            <CommunityGuidelines />
          }
        />


        <Route
          path="/safety"
          element={
            <SafetyCentre />
          }
        />


        <Route
          path="/privacy"
          element={
            <PrivacyPolicy />
          }
        />


        <Route
          path="/terms"
          element={
            <TermsOfUse />
          }
        />


        <Route
          path="/login"
          element={
            <Login />
          }
        />


        <Route
          path="/register"
          element={
            <Register />
          }
        />


        {/* ===================================================
            DASHBOARD
        =================================================== */}

        <Route
          path="/dashboard"
          element={
            <Protected>

              <Dashboard />

            </Protected>
          }
        />


        {/* ===================================================
            FOOD INVITES
            VERIFIED USERS ONLY
        =================================================== */}

        <Route
          path="/food-invites"
          element={
            <VerifiedOnly>

              <FoodInvites />

            </VerifiedOnly>
          }
        />


        {/* ===================================================
            SETTINGS
        =================================================== */}

        <Route
          path="/settings"
          element={
            <Protected>

              <Settings />

            </Protected>
          }
        />


        {/* ===================================================
            SAFETY VERIFICATION
        =================================================== */}

        <Route
          path="/safety-verification"
          element={
            <Protected>

              <SafetyVerification />

            </Protected>
          }
        />


        {/* ===================================================
            SOS SAFETY
        =================================================== */}

        <Route
          path="/sos-safety"
          element={
            <Protected>

              <SOSSafety />

            </Protected>
          }
        />


        {/* ===================================================
            AI KITCHEN
        =================================================== */}

        <Route
          path="/ai-kitchen"
          element={
            <Protected>

              <AIKitchen />

            </Protected>
          }
        />


        {/* ===================================================
            VERIFICATION
        =================================================== */}

        <Route
          path="/verification-required"
          element={
            <Protected>

              <VerificationRequired />

            </Protected>
          }
        />


        {/* ===================================================
            COMMUNIQ
        =================================================== */}

        <Route
          path="/community"
          element={
            <Protected>

              <Community />

            </Protected>
          }
        />


        <Route
          path="/community/post/:postId"
          element={
            <Protected>

              <CommunityPostDetail />

            </Protected>
          }
        />


        {/* ===================================================
            CIRCLES
        =================================================== */}

        <Route
          path="/connect"
          element={
            <VerifiedOnly>

              <Connect />

            </VerifiedOnly>
          }
        />


        <Route
          path="/connect/member/:memberId"
          element={
            <VerifiedOnly>

              <MemberProfile />

            </VerifiedOnly>
          }
        />


        {/* ===================================================
            FOOD
        =================================================== */}

        <Route
          path="/food"
          element={
            <Protected>

              <FoodListings />

            </Protected>
          }
        />


        {/* ===================================================
            PROFILE
        =================================================== */}

        <Route
          path="/profile"
          element={
            <Protected>

              <Profile />

            </Protected>
          }
        />


        {/* ===================================================
            FALLBACK
        =================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>


      {/* =====================================================
          PRIVATE MESSAGING
      ===================================================== */}

      {
        verified &&
        !hideMessaging &&
        (

          <MessagingDock />

        )
      }

    </>

  );
}