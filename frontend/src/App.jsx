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
import { useAuth } from "./context/AuthContext";

// ============================================================
// LAZY-LOADED COMPONENTS
// ============================================================

// Public pages
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const RestaurantPartnerRegister = lazy(() => import("./pages/RestaurantPartnerRegister"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Careers = lazy(() => import("./pages/Careers"));
const Contact = lazy(() => import("./pages/Contact"));
const CommunityGuidelines = lazy(() => import("./pages/CommunityGuidelines"));
const SafetyCentre = lazy(() => import("./pages/SafetyCentre"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));

// Logged-in app pages
const Dashboard = lazy(() => import("./pages/ConnectDashboard"));
const Community = lazy(() => import("./pages/Community"));
const CommunityPostDetail = lazy(() => import("./pages/CommunityPostDetail"));
const FoodListings = lazy(() => import("./pages/FoodListings"));
const Connect = lazy(() => import("./pages/Connect"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));
const Profile = lazy(() => import("./pages/Profile"));
const VerificationRequired = lazy(() => import("./pages/VerificationRequired"));
const AIKitchen = lazy(() => import("./pages/AIKitchen"));
const Settings = lazy(() => import("./pages/Settings"));
const SafetyVerification = lazy(() => import("./pages/SafetyVerification"));
const SOSSafety = lazy(() => import("./pages/SOSSafety"));
const FoodInvites = lazy(() => import("./pages/FoodInvites"));
const FoodInviteDetail = lazy(() => import("./pages/FoodInviteDetail"));
const EditFoodInvite = lazy(() => import("./pages/EditFoodInvite"));
const CookTogetherCreate = lazy(() => import("./components/cookTogether/CookTogetherCreate"));
const DineOut = lazy(() => import("./pages/DineOut"));
const DineOutDetails = lazy(() => import("./pages/DineOutDetails"));
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard"));

// Lazy components
const SuggestPlace = lazy(() => import("./components/SuggestPlace"));

// Messaging (lazy-loaded)
const MessagingDock = lazy(() => import("./components/MessagingDock"));

// Lazy FoodWalkOSMPlanner
const FoodWalkDashboard = lazy(() =>
  import("./components/FoodWalkDashboard")
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
  const profile = user?.profile || {};
  return (
    user?.account_type === "partner" ||
    profile?.account_type === "partner" ||
    user?.preferred_portal === "restaurant" ||
    profile?.preferred_portal === "restaurant"
  );
}

// ============================================================
// GLOBAL PAGE LOADER
// ============================================================

function AppLoader({ message = "Loading FoodKindl..." }) {
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
      <div style={{ textAlign: "center" }}>
        <div className="foodkindl-page-loader" aria-label="Loading" />
        <p style={{ marginTop: "16px", opacity: 0.75 }}>{message}</p>
      </div>
    </main>
  );
}

// ============================================================
// SCROLL TO TOP
// ============================================================

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  return null;
}

// ============================================================
// APP THEME CONTROLLER
// ============================================================

function ThemeController() {
  const location = useLocation();
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function handleChange(event) {
      setSystemDark(event.matches);
    }

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    const body = document.body;
    body.classList.remove("foodkindl-app-light", "foodkindl-app-dark", "foodkindl-public-dark");
    document.documentElement.removeAttribute("data-theme");

    if (PUBLIC_DARK_PAGES.includes(location.pathname)) {
      body.classList.add("foodkindl-public-dark");
      return;
    }

    const savedTheme = localStorage.getItem("foodkindl_theme") || "dark";
    let resolvedTheme = savedTheme;
    if (savedTheme === "system") {
      resolvedTheme = systemDark ? "dark" : "light";
    }

    body.classList.add(
      resolvedTheme === "light" ? "foodkindl-app-light" : "foodkindl-app-dark"
    );
  }, [location.pathname, systemDark]);

  return null;
}

// ============================================================
// PROTECTED ROUTE
// ============================================================

function Protected({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <AppLoader message="Loading FoodKindl..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isPartnerUser(user)) {
    return <Navigate to="/partner/dashboard" replace />;
  }

  return children;
}

// ============================================================
// VERIFIED USERS ONLY
// ============================================================

function VerifiedOnly({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <AppLoader message="Checking verification..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isPartnerUser(user)) {
    return <Navigate to="/partner/dashboard" replace />;
  }

  const approved =
    user?.profile?.is_verified === true &&
    user?.profile?.verification_status === "approved";

  return approved ? children : <Navigate to="/verification-required" replace />;
}

// ============================================================
// PARTNER ONLY
// ============================================================

function PartnerOnly({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <AppLoader message="Loading Restaurant Partner Studio..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isPartnerUser(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// ============================================================
// MAIN APP COMPONENT
// ============================================================

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  const verified =
    user?.profile?.is_verified === true && user?.profile?.verification_status === "approved";

  const isPartnerRoute = location.pathname.startsWith("/partner");

  const hideMessaging =
    isPartnerRoute ||
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
    ].includes(location.pathname);

  return (
    <>
      <ScrollToTop />
      <ThemeController />

      {!isPartnerRoute && location.pathname !== "/food-walk" && <Navbar />}

      <Suspense fallback={<AppLoader />}>
        <Routes>
          {/* Public website routes */}
          <Route path="/" element={<LandingPage />} />          
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />          
          <Route path="/register/restaurant" element={<RestaurantPartnerRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/community-guidelines" element={<CommunityGuidelines />} />
          <Route path="/safety" element={<SafetyCentre />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />

          {/* Partner dashboard */}
          <Route path="/partner/dashboard" element={<PartnerOnly><PartnerDashboard /></PartnerOnly>} />

          {/* User dashboard */}
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />

          {/* Food invites */}
          <Route path="/food-invites" element={<VerifiedOnly><FoodInvites /></VerifiedOnly>} />          
          <Route path="/food-invites/:inviteId/edit" element={<VerifiedOnly><EditFoodInvite /></VerifiedOnly>} />
          <Route path="/food-invites/:inviteId" element={<VerifiedOnly><FoodInviteDetail /></VerifiedOnly>} />

          {/* Cook Together */}
          <Route path="/cook-together" element={<VerifiedOnly><CookTogetherCreate /></VerifiedOnly>} />

          {/* Dine Out */}
          <Route path="/dine-out" element={<VerifiedOnly><DineOut /></VerifiedOnly>} />
          <Route path="/dine-out/:dineOutId" element={<VerifiedOnly><DineOutDetails /></VerifiedOnly>} />

          {/* Food Walk */}
          <Route
                  path="/food-walk"
                  element={
                    <VerifiedOnly>
                      <FoodWalkDashboard />
                    </VerifiedOnly>
                  }
                />

          {/* Suggest Place */}
          <Route path="/suggest-place" element={<Protected><SuggestPlace /></Protected>} />

          {/* Settings */}
          <Route path="/settings" element={<Protected><Settings /></Protected>} />

          {/* Safety verification */}
          <Route path="/safety-verification" element={<Protected><SafetyVerification /></Protected>} />

          {/* SOS Safety */}
          <Route path="/sos-safety" element={<Protected><SOSSafety /></Protected>} />

          {/* AI Kitchen */}
          <Route path="/ai-kitchen" element={<Protected><AIKitchen /></Protected>} />

          {/* Verification required */}
          <Route path="/verification-required" element={<Protected><VerificationRequired /></Protected>} />

          {/* Community */}
          <Route path="/community" element={<Protected><Community /></Protected>} />
          <Route path="/community/post/:postId" element={<Protected><CommunityPostDetail /></Protected>} />

          {/* Connect */}
          <Route path="/connect" element={<VerifiedOnly><Connect /></VerifiedOnly>} />
          <Route path="/connect/member/:memberId" element={<VerifiedOnly><MemberProfile /></VerifiedOnly>} />

          {/* Food */}
          <Route path="/food" element={<Protected><FoodListings /></Protected>} />

          {/* Profile */}
          <Route path="/profile" element={<Protected><Profile /></Protected>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {/* Private messaging dock */}
      {verified && !hideMessaging && (
        <Suspense fallback={null}>
          <MessagingDock />
        </Suspense>
      )}
    </>
  );
}
