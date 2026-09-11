import {
  lazy,
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar";

import {
  useAuth,
} from "./context/AuthContext";


// ============================================================
// LAZY-LOADED COMPONENTS
// ============================================================

// Public pages
const LandingPage = lazy(
  () => import("./pages/LandingPage")
);

const Login = lazy(
  () => import("./pages/Login")
);

const Register = lazy(
  () => import("./pages/Register")
);

const RestaurantPartnerRegister = lazy(
  () =>
    import(
      "./pages/RestaurantPartnerRegister"
    )
);

const ForgotPassword = lazy(
  () => import("./pages/ForgotPassword")
);

const ResetPassword = lazy(
  () => import("./pages/ResetPassword")
);

const Careers = lazy(
  () => import("./pages/Careers")
);

const Contact = lazy(
  () => import("./pages/Contact")
);

const CommunityGuidelines = lazy(
  () =>
    import(
      "./pages/CommunityGuidelines"
    )
);

const SafetyCentre = lazy(
  () => import("./pages/SafetyCentre")
);

const PrivacyPolicy = lazy(
  () => import("./pages/PrivacyPolicy")
);

const TermsOfUse = lazy(
  () => import("./pages/TermsOfUse")
);


// ============================================================
// LOGGED-IN APP PAGES
// ============================================================

const Dashboard = lazy(
  () => import("./pages/ConnectDashboard")
);

const Community = lazy(
  () => import("./pages/Community")
);

const CommunityPostDetail = lazy(
  () =>
    import(
      "./pages/CommunityPostDetail"
    )
);

const FoodListings = lazy(
  () => import("./pages/FoodListings")
);

const Connect = lazy(
  () => import("./pages/Connect")
);

const MemberProfile = lazy(
  () => import("./pages/MemberProfile")
);

const Profile = lazy(
  () => import("./pages/Profile")
);

const VerificationRequired = lazy(
  () =>
    import(
      "./pages/VerificationRequired"
    )
);

const AIKitchen = lazy(
  () => import("./pages/AIKitchen")
);

const Settings = lazy(
  () => import("./pages/Settings")
);

const SafetyVerification = lazy(
  () =>
    import(
      "./pages/SafetyVerification"
    )
);

const SOSSafety = lazy(
  () => import("./pages/SOSSafety")
);

const FoodInvites = lazy(
  () => import("./pages/FoodInvites")
);

const FoodInviteDetail = lazy(
  () => import("./pages/FoodInviteDetail")
);

const EditFoodInvite = lazy(
  () => import("./pages/EditFoodInvite")
);

const CookTogether = lazy(
  () => import("./pages/CookTogether")
);

const DineOut = lazy(
  () => import("./pages/DineOut")
);

const FoodWalkPlanner = lazy(
  () => import("./pages/FoodWalkPlanner")
);

const PartnerDashboard = lazy(
  () =>
    import(
      "./pages/PartnerDashboard"
    )
);


// ============================================================
// LAZY COMPONENTS
// ============================================================

const SuggestPlace = lazy(
  () =>
    import(
      "./components/SuggestPlace"
    )
);


// ============================================================
// MESSAGING
// ============================================================

// Messaging can also be lazy-loaded because it is not required
// on the public landing page or during first application load.

const MessagingDock = lazy(
  () =>
    import(
      "./components/MessagingDock"
    )
);


// ============================================================
// PUBLIC DARK PAGES
// ============================================================

const PUBLIC_DARK_PAGES = [
  "/",
  "/login",
  "/register",
  "/register/restaurant",
  "/forgot-password",
  "/careers",
  "/contact",
  "/community-guidelines",
  "/safety",
  "/privacy",
  "/terms",
];


// ============================================================
// CHECK PARTNER USER
// ============================================================

function isPartnerUser(user) {

  const profile =
    user?.profile || {};


  return (

    user?.account_type ===
      "partner"

    ||

    profile?.account_type ===
      "partner"

    ||

    user?.preferred_portal ===
      "restaurant"

    ||

    profile?.preferred_portal ===
      "restaurant"

  );
}


// ============================================================
// GLOBAL PAGE LOADER
// ============================================================

function AppLoader({
  message =
    "Loading FoodKindl...",
}) {

  return (

    <main
      className="app-page"
      style={{
        minHeight: "55vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >

      <div
        style={{
          textAlign: "center",
        }}
      >

        <div
          className="foodkindl-page-loader"
          aria-label="Loading"
        />

        <p
          style={{
            marginTop: "16px",
            opacity: 0.75,
          }}
        >
          {message}
        </p>

      </div>

    </main>

  );
}


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
    () =>
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

      <AppLoader
        message="Loading FoodKindl..."
      />

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


  if (
    isPartnerUser(user)
  ) {

    return (

      <Navigate
        to="/partner/dashboard"
        replace
      />

    );

  }


  return children;
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

      <AppLoader
        message="Checking verification..."
      />

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


  if (
    isPartnerUser(user)
  ) {

    return (

      <Navigate
        to="/partner/dashboard"
        replace
      />

    );

  }


  const approved =

    user?.profile?.is_verified ===
      true

    &&

    user?.profile
      ?.verification_status ===
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
// PARTNER ONLY
// ============================================================

function PartnerOnly({
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

      <AppLoader
        message={
          "Loading Restaurant Partner Studio..."
        }
      />

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


  if (
    !isPartnerUser(user)
  ) {

    return (

      <Navigate
        to="/dashboard"
        replace
      />

    );

  }


  return children;
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

    user?.profile
      ?.verification_status ===
      "approved";

    

  // =========================================================
  // PARTNER ROUTE
  // =========================================================

  const isPartnerRoute =
    location.pathname.startsWith(
      "/partner"
    );


  // =========================================================
  // HIDE MESSAGING
  // =========================================================

  const hideMessaging =

    isPartnerRoute

    ||

    [
      "/",
      "/login",
      "/register",
      "/register/restaurant",
      "/forgot-password",
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

          Navbar remains eagerly loaded because it appears
          throughout most of the application.
      ===================================================== */}

      {
        !isPartnerRoute &&
        (
          <Navbar />
        )
      }


      {/* =====================================================
          LAZY ROUTES

          Suspense displays the loader while the page's
          JavaScript chunk is being downloaded.
      ===================================================== */}

      <Suspense
        fallback={
          <AppLoader />
        }
      >

        <Routes>


          {/* =================================================
              PUBLIC WEBSITE
          ================================================= */}

          <Route
            path="/"
            element={
              <LandingPage />
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



          <Route
            path="/register/restaurant"
            element={
              <RestaurantPartnerRegister />
            }
          />


          <Route
            path="/forgot-password"
            element={
              <ForgotPassword />
            }
          />


          <Route
            path="/reset-password/:uid/:token"
            element={
              <ResetPassword />
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


          {/* =================================================
              PARTNER DASHBOARD
          ================================================= */}

          <Route
            path="/partner/dashboard"
            element={

              <PartnerOnly>

                <PartnerDashboard />

              </PartnerOnly>

            }
          />


          {/* =================================================
              DASHBOARD
          ================================================= */}

          <Route
            path="/dashboard"
            element={

              <Protected>

                <Dashboard />

              </Protected>

            }
          />


          {/* =================================================
              FOOD INVITES
              VERIFIED USERS ONLY
          ================================================= */}

          <Route
            path="/food-invites"
            element={

              <VerifiedOnly>

                <FoodInvites />

              </VerifiedOnly>

            }
          />

          <Route
            path="/food-invites/:inviteId/edit"
            element={
              <VerifiedOnly>
                <EditFoodInvite />
              </VerifiedOnly>
            }
          />


          <Route
            path="/food-invites/:inviteId"
            element={
              <VerifiedOnly>
                <FoodInviteDetail />
              </VerifiedOnly>
            }
          />


          <Route
            path="/cook-together"
            element={

              <VerifiedOnly>

                <CookTogether />

              </VerifiedOnly>

            }
          />


          <Route
            path="/dine-out"
            element={

              <VerifiedOnly>

                <DineOut />

              </VerifiedOnly>

            }
          />


          <Route
            path="/food-walk"
            element={

              <VerifiedOnly>

                <FoodWalkPlanner />

              </VerifiedOnly>

            }
          />


          {/* =================================================
              SUGGEST PLACE
          ================================================= */}

          <Route
            path="/suggest-place"
            element={

              <Protected>

                <SuggestPlace />

              </Protected>

            }
          />


          {/* =================================================
              SETTINGS
          ================================================= */}

          <Route
            path="/settings"
            element={

              <Protected>

                <Settings />

              </Protected>

            }
          />


          {/* =================================================
              SAFETY VERIFICATION
          ================================================= */}

          <Route
            path="/safety-verification"
            element={

              <Protected>

                <SafetyVerification />

              </Protected>

            }
          />


          {/* =================================================
              SOS SAFETY
          ================================================= */}

          <Route
            path="/sos-safety"
            element={

              <Protected>

                <SOSSafety />

              </Protected>

            }
          />


          {/* =================================================
              AI KITCHEN
          ================================================= */}

          <Route
            path="/ai-kitchen"
            element={

              <Protected>

                <AIKitchen />

              </Protected>

            }
          />


          {/* =================================================
              VERIFICATION
          ================================================= */}

          <Route
            path="/verification-required"
            element={

              <Protected>

                <VerificationRequired />

              </Protected>

            }
          />


          {/* =================================================
              COMMUNITY
          ================================================= */}

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


          {/* =================================================
              CONNECT
          ================================================= */}

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


          {/* =================================================
              FOOD
          ================================================= */}

          <Route
            path="/food"
            element={

              <Protected>

                <FoodListings />

              </Protected>

            }
          />


          {/* =================================================
              PROFILE
          ================================================= */}

          <Route
            path="/profile"
            element={

              <Protected>

                <Profile />

              </Protected>

            }
          />


          {/* =================================================
              FALLBACK
          ================================================= */}

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

      </Suspense>


      {/* =====================================================
          PRIVATE MESSAGING

          MessagingDock is lazy-loaded and only downloaded
          when an authenticated verified user actually needs it.
      ===================================================== */}

      {
        verified &&
        !hideMessaging &&
        (

          <Suspense
            fallback={null}
          >

            <MessagingDock />

          </Suspense>

        )
      }

    </>

  );
}