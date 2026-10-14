import {
  ArrowRight,
  Bike,
  Car,
  Check,
  ChefHat,
  Facebook,
  Footprints,
  Heart,
  Instagram,
  Linkedin,
  MapPin,
  MessageCircle,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Utensils,
  X,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import "../styles/landing_page_unique.css";
import "../styles/landing_sections_unique.css";

/*
  Social Dining styles are included below.
  You do not need to import social_dining_image.css.
*/

const SOCIAL_DINING_STYLES = `
  .fk-landing .fk-social-image-section {
    width: 100%;
    max-width: none;
    margin: 0;
    padding: clamp(24px, 4vw, 56px) clamp(12px, 3vw, 40px);
    background: #100e0b;
    box-sizing: border-box;
  }

  .fk-social-image-inner {
    max-width: 1440px;
    margin: 0 auto;
    text-align: center;
  }

  .fk-social-image {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 18px;
  }

  .fk-social-image-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-top: 22px;
    padding: 16px 32px;
    min-height: 48px;
    background: #ff6318;
    color: #180e06;
    font: 700 18px/1.3 Arial, sans-serif;
    border-radius: 999px;
    text-decoration: none;
    box-sizing: border-box;
  }

  .fk-social-image-cta:hover {
    background: #ff853e;
  }

  .fk-social-image-cta:focus-visible {
    outline: 3px solid #fff5e8;
    outline-offset: 5px;
  }

  @media (max-width: 600px) {
    .fk-landing .fk-social-image-section {
      padding: 24px 12px;
    }

    .fk-social-image {
      border-radius: 10px;
    }

    .fk-social-image-cta {
      padding: 14px 26px;
      font-size: 16px;
    }
  }
`;

const HOW_STEPS = [
  {
    number: "01",
    icon: Users,
    title: "Discover People Nearby",
    text:
      "Create your profile, add food interests and discover people in your local community.",
    visual: {
      name: "Asha",
      detail: "People nearby",
      tag: "South Indian",
    },
  },
  {
    number: "02",
    icon: Send,
    title: "Connect & Send a Food Invite",
    text:
      "Message a person or group and invite them to Cook Together, Dine Out or join a Food Walk.",
    visual: {
      name: "Kerala Dinner",
      detail: "Saturday · 7:30 PM",
      tag: "Example invite",
    },
  },
  {
    number: "03",
    icon: Utensils,
    title: "Cook, Meet & Eat Together",
    text:
      "Meet at the planned venue, prepare a meal together or explore a restaurant.",
    visual: {
      name: "Dinner Together",
      detail: "Rajajinagar",
      tag: "Table for 4",
    },
  },
  {
    number: "04",
    icon: Heart,
    title: "Share the Experience",
    text:
      "Post photos, videos, recipes and food stories to inspire the FoodKindl community.",
    visual: {
      name: "Sunday Lunch",
      detail: "Photos and food stories",
      tag: "Share a memory",
    },
  },
];

const FOOD_WALK_STOPS = [
  {
    name: "Delhi",
    type: "Start",
    detail: "Choose your travel mode",
  },
  {
    name: "Keylong",
    type: "Stop 1",
    detail: "Explore local food",
  },
  {
    name: "Tanglang",
    type: "Stop 2",
    detail: "Discover food along the route",
  },
  {
    name: "Leh-Ladakh",
    type: "Destination",
    detail: "Complete your food journey",
  },
];



const KINDLI_SUGGESTIONS = [
  "What is FoodKindl?",
  "How does Food Walk work?",
  "What can AI Kitchen do?",
];

function getKindliFallbackReply(question) {
  const q = String(question || "").trim().toLowerCase();

  if (q.includes("food walk")) {
    return (
      "Food Walk helps you discover food places around a location " +
      "or along a route. It can be used for walks, bike rides and road trips."
    );
  }

  if (q.includes("invite")) {
    return (
      "Food Invites help you plan Cook Together, Dine Out " +
      "or Food Walk experiences with other members."
    );
  }

  if (q.includes("ai kitchen") || q.includes("recipe")) {
    return (
      "AI Kitchen helps you explore recipe ideas based on " +
      "your ingredients and food preferences."
    );
  }

  if (
    q.includes("verify") ||
    q.includes("verification") ||
    q.includes("government id") ||
    q.includes("govt id")
  ) {
    return (
      "Check your profile and the Safety Centre for the current " +
      "verification requirements and how your information is handled."
    );
  }

  if (q.includes("safe") || q.includes("safety")) {
    return (
      "Visit the Safety Centre to learn about participation controls, " +
      "verification and the safeguards available for gatherings."
    );
  }

  if (
    q.includes("share") ||
    q.includes("video") ||
    q.includes("post")
  ) {
    return (
      "You can share food photos, cooking videos, recipes " +
      "and memories from your meals and meetups."
    );
  }

  if (q.includes("connect") || q.includes("people")) {
    return (
      "FoodKindl helps you discover people with shared food interests, " +
      "connect with them and make food plans together."
    );
  }

  if (
    q.includes("product") ||
    q.includes("spice") ||
    q.includes("buy")
  ) {
    return (
      "Food-related products and commerce are future ideas. " +
      "Explore the current features through the FoodKindl dashboard."
    );
  }

  if (
    q.includes("what is foodkindl") ||
    q.includes("about foodkindl")
  ) {
    return (
      "FoodKindl helps people connect through food: cook together, " +
      "dine out, explore food stops and share their experiences."
    );
  }

  return (
    "I can help explain FoodKindl features, navigation and community. " +
    "Try asking about Cook Together, Dine Out, Food Walk or sharing."
  );
}

function getKindliApiUrl() {
  const explicitUrl = import.meta.env.VITE_KINDLI_API_URL;

  if (explicitUrl) {
    return explicitUrl;
  }

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  if (backendUrl) {
    // Correct regular expression for removing trailing slashes.
    return `${backendUrl.replace(/\/+$/, "")}/api/kindli/chat/`;
  }

  return "/api/kindli/chat/";
}

export default function LandingPage() {
  const { user } = useAuth();

  const joinUrl = user ? "/connect-dashboard" : "/register";
  const loginUrl = "/login";

  const [kindliOpen, setKindliOpen] = useState(false);
  const [showKindliLauncher, setShowKindliLauncher] = useState(false);
  const [kindliInput, setKindliInput] = useState("");
  const [kindliThinking, setKindliThinking] = useState(false);

  const [kindliMessages, setKindliMessages] = useState([
    {
      id: "kindli-welcome",
      role: "assistant",
      text:
        "Hi! I'm Kindli 👋 Ask me about FoodKindl, Cook Together, " +
        "Dine Out, Food Walk, AI Kitchen or sharing food experiences.",
    },
  ]);

  const kindliChatRef = useRef(null);
  const kindliBusyRef = useRef(false);
  const kindliAbortRef = useRef(null);

  useEffect(() => {
  let mounted = true;
  let busy = false;
  let currentController = null;

  async function loadHomepageVideo() {
    if (busy || document.hidden) return;

    busy = true;
    const controller = new AbortController();
    currentController = controller;

    const timeout = window.setTimeout(
      () => controller.abort(),
      20000
    );

    try {
      const backend = (
        import.meta.env.VITE_BACKEND_URL || ""
      ).replace(/\/+$/, "");

      const apiUrl =
        import.meta.env.VITE_HOMEPAGE_VIDEO_API_URL ||
        `${backend}/api/homepage-video/`;

      const response = await fetch(apiUrl, {
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error("Unable to load homepage video");
      }

      const data = await response.json();

      if (mounted) {
        setHomepageVideo(data.video || null);
        setHomepageVideoFailed(false);
      }
    } catch (error) {
      // Preserve the current video if a background refresh fails.
      // Playback errors are handled by the video's onError.
    } finally {
      window.clearTimeout(timeout);
      busy = false;

      if (currentController === controller) {
        currentController = null;
      }

      if (mounted) {
        setHomepageVideoLoading(false);
      }
    }
  }

  loadHomepageVideo();

  // Check for a new admin-uploaded video every 30 seconds.
  const interval = window.setInterval(loadHomepageVideo, 30000);

  window.addEventListener("focus", loadHomepageVideo);
  document.addEventListener("visibilitychange", loadHomepageVideo);

  return () => {
    mounted = false;
    window.clearInterval(interval);
    currentController?.abort();

    window.removeEventListener("focus", loadHomepageVideo);
    document.removeEventListener(
      "visibilitychange",
      loadHomepageVideo
    );
  };
}, []);

  useEffect(() => {
    function syncPageVisibility() {
      document.documentElement.setAttribute(
        "data-page-hidden",
        document.hidden ? "true" : "false"
      );
    }

    syncPageVisibility();

    document.addEventListener("visibilitychange", syncPageVisibility);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        syncPageVisibility
      );

      document.documentElement.removeAttribute("data-page-hidden");
    };
  }, []);

  useEffect(() => {
    const node = kindliChatRef.current;

    if (!kindliOpen || !node) {
      return;
    }

    node.scrollTop = node.scrollHeight;
  }, [kindliOpen, kindliMessages, kindliThinking]);

  useEffect(() => {
    return () => {
      kindliAbortRef.current?.abort();
    };
  }, []);

  async function askKindli(question) {
    const cleanQuestion = String(question || "").trim();

    if (!cleanQuestion || kindliBusyRef.current) {
      return;
    }

    kindliBusyRef.current = true;
    setKindliThinking(true);
    setKindliInput("");

    setKindliMessages((current) => [
      ...current,
      {
        id: `kindli-user-${Date.now()}`,
        role: "user",
        text: cleanQuestion,
      },
    ]);

    const controller = new AbortController();
    kindliAbortRef.current = controller;

    let timedOut = false;

    const timeoutHandle = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 20000);

    try {
      const response = await fetch(getKindliApiUrl(), {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          message: cleanQuestion,
          page: "landing",
          user: user
            ? {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
              }
            : null,
          context: {
            product: "FoodKindl",
            assistant: "Kindli",
            known_features: [
              "Connect",
              "Food Invites",
              "Food Walk",
              "AI Kitchen",
              "Community",
              "Profiles",
              "Verification",
              "Safety",
              "Share",
            ],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Kindli request failed: ${response.status}`);
      }

      const data = await response.json();
      const answer = data?.reply || data?.message || data?.answer;

      setKindliMessages((current) => [
        ...current,
        {
          id: `kindli-assistant-${Date.now()}`,
          role: "assistant",
          text:
            typeof answer === "string" && answer.trim()
              ? answer
              : getKindliFallbackReply(cleanQuestion),
        },
      ]);
    } catch (error) {
      // Do not update the UI after an unmount-triggered abort.
      if (error?.name === "AbortError" && !timedOut) {
        return;
      }

      setKindliMessages((current) => [
        ...current,
        {
          id: `kindli-fallback-${Date.now()}`,
          role: "assistant",
          text: getKindliFallbackReply(cleanQuestion),
        },
      ]);
    } finally {
      window.clearTimeout(timeoutHandle);
      kindliBusyRef.current = false;

      if (!controller.signal.aborted || timedOut) {
        setKindliThinking(false);
      }

      if (kindliAbortRef.current === controller) {
        kindliAbortRef.current = null;
      }
    }
  }

  function submitKindli(event) {
    event.preventDefault();
    askKindli(kindliInput);
  }

  return (
    <main className="fk-landing">
      <style>{SOCIAL_DINING_STYLES}</style>

      {/* 1. MEET PEOPLE THROUGH FOOD */}
      <section className="fk-hero" id="connect">
        <div
          className="fk-hero-glow fk-hero-glow-one"
          aria-hidden="true"
        />
        <div
          className="fk-hero-glow fk-hero-glow-two"
          aria-hidden="true"
        />

        <div className="fk-hero-inner">
          <div className="fk-hero-copy">
            <div className="fk-status-pill">FOODKINDL CONNECT</div>

            <h1>
              Meet people
              <br />
              through food.
            </h1>

            <p className="fk-hero-description">
              Discover like-minded people nearby. Cook together,
              dine out and explore Food Walks.
            </p>

            <div className="fk-hero-actions">
              <Link className="fk-primary-button" to={joinUrl}>
                {user ? "Explore FoodKindl" : "Join FoodKindl"}
                <ArrowRight size={18} />
              </Link>

              <a
                className="fk-secondary-button"
                href="#social-dining"
              >
                <Play size={17} />
                See How It Works
              </a>
            </div>

            <div className="fk-hero-proof">
              <span>
                <Users size={18} />
                Real people
              </span>
              <span>
                <Utensils size={18} />
                Shared experiences
              </span>
              <span>
                <Heart size={18} />
                Connect over food
              </span>
            </div>
          </div>

          <div className="fk-experience-panel">
            <div className="fk-experience-panel-head">
              <h2>Three ways to connect through food</h2>
              <p>People. Places. Shared experiences.</p>
            </div>

            <div className="fk-experience-grid">
              <article className="fk-experience-card fk-experience-connect">
                <div className="fk-experience-title">
                  <span>
                    <Users size={19} />
                  </span>
                  <div>
                    <h3>Connect</h3>
                    <p>Discover people nearby</p>
                  </div>
                </div>

                <div className="fk-experience-visual fk-people-visual">
                  <img
                    src="/images/connect1.webp"
                    alt="Discover people with shared food interests"
                    loading="eager"
                    decoding="async"
                  />
                  <div className="fk-card-caption">
                    <MapPin size={12} />
                    People nearby
                  </div>
                </div>
              </article>

              <article className="fk-experience-card fk-experience-dine">
                <div className="fk-experience-title">
                  <span>
                    <Utensils size={19} />
                  </span>
                  <div>
                    <h3>Dine Out</h3>
                    <p>Meet over a shared meal</p>
                  </div>
                </div>

                <div className="fk-experience-visual fk-dine-visual">
                  <img
                    src="/images/dineout1.webp"
                    alt="People enjoying a meal together"
                    loading="eager"
                    decoding="async"
                  />
                  <div className="fk-card-caption">
                    <MapPin size={12} />
                    <span>
                      Great food
                      <strong>Better company</strong>
                    </span>
                  </div>
                </div>
              </article>

              <article className="fk-experience-card fk-experience-walk">
                <div className="fk-experience-title">
                  <span>
                    <MapPin size={19} />
                  </span>
                  <div>
                    <h3>Food Walk</h3>
                    <p>Find food along your route</p>
                  </div>
                </div>

                <div
                  className="fk-travel-modes"
                  aria-label="Travel modes"
                >
                  <span>
                    <Footprints size={11} />
                    Walk
                  </span>
                  <span className="active">
                    <Car size={11} />
                    Drive
                  </span>
                  <span>
                    <Bike size={11} />
                    Bike
                  </span>
                </div>

                <div className="fk-experience-visual fk-walk-visual">
                  <img
                    src="/images/foodwalk1.webp"
                    alt="Illustrative food journey from Bengaluru to Coorg"
                    loading="eager"
                    decoding="async"
                  />
                </div>

                <div className="fk-walk-caption">
                  <Footprints size={12} />
                  Discover food stops along your journey
                </div>

                <small className="fk-next-route">
                  Explore your neighbourhood or a road-trip route
                </small>
              </article>
            </div>

            <div className="fk-experience-footer">
              <span>Shared interests</span>
              <i />
              <span>Shared tables</span>
              <i />
              <span>Brighter days</span>
              <Heart size={13} />
            </div>
          </div>
        </div>
      </section>

      {/* 2. SOCIAL DINING, SIMPLIFIED */}
      <section
        className="fk-social-image-section"
        id="social-dining"
        aria-label="Social Dining, Simplified"
      >
        <div className="fk-social-image-inner">
          {/* <img
            className="fk-social-image"
            src="public/images/social-dining-simplified.png"
            loading="lazy"
            decoding="async"
          /> */}

          {/* <Link className="fk-social-image-cta" to={joinUrl}>
            {user ? "Explore FoodKindl" : "Join FoodKindl"}
            <ArrowRight size={19} aria-hidden="true" />
          </Link> */}
        </div>
      </section>

      {/* 3. AI KITCHEN */}
      <section
        className="fk-ai-spotlight"
        id="ai-kitchen-preview"
      >
        <div className="fk-ai-spotlight-inner">
          <div className="fk-ai-copy">
            <span className="fk-section-kicker">
              FOODKINDL AI KITCHEN
            </span>

            <h2>
              Turn your ingredients into{" "}
              <span>meal ideas.</span>
            </h2>

            <p>
              Ask for a recipe using the ingredients you have.
              Explore ideas based on your food preferences.
            </p>

            <Link
              className="fk-primary-button"
              to={user ? "/ai-kitchen" : loginUrl}
            >
              Try AI Kitchen
              <ArrowRight size={17} />
            </Link>

            <div className="fk-ai-benefits">
              <span>
                <Sparkles size={14} />
                Recipe inspiration
              </span>
              <span>
                <ChefHat size={14} />
                Cook with what you have
              </span>
            </div>
          </div>

          <div className="fk-ai-demo">
            <div className="fk-ai-actions">
              <span className="active">Ask for a Recipe</span>
            </div>

            <div className="fk-ai-demo-grid">
              <div className="fk-ai-ingredients">
                <img
                  src="/images/paneer.webp"
                  alt="Ingredients for a recipe"
                  loading="lazy"
                  decoding="async"
                />

                <div>
                  <span>Tomato</span>
                  <span>Paneer</span>
                  <span>Spinach</span>
                </div>
              </div>

              <ArrowRight className="fk-ai-arrow" size={22} />

              <div className="fk-ai-result">
                <img
                  src="/images/panner_cooked.webp"
                  alt="Palak Paneer recipe example"
                  loading="lazy"
                  decoding="async"
                />

                <small>EXAMPLE RECIPE IDEA</small>
                <strong>Palak Paneer</strong>
                <p>A meal idea using paneer and spinach.</p>
              </div>
            </div>
          </div>
        </div>
      </section>


{/* LEARN, CREATE AND SHARE */}
<section
  className="fk-section fk-ecosystem-section"
  id="learn-create-share"
>
  <div className="fk-ecosystem-image">
    <img
      src="/images/learn1.webp"
      alt="FoodKindl community sharing food experiences"
      loading="lazy"
      decoding="async"
    />
  </div>
</section>


      
      {/* FOOD WALK SHOWCASE */}
<section
  className="fk-section fk-food-walk-section"
  id="food-walk"
>
  <div className="fk-section-heading fk-section-heading-left">
    <span className="fk-section-kicker">
      EXPLORE FOOD ALONG THE WAY
    </span>

    <h2>
      Build a <span>Food Walk</span>
    </h2>

    <p>
      From a neighbourhood walk to a bike ride or road trip,
      choose your route and discover food stops along the way.
    </p>
  </div>

  <div className="fk-food-walk-shell">
    <article className="fk-food-walk-route">
      <header className="fk-food-walk-route-head">
        <div>
          <span className="fk-route-eyebrow">
            ILLUSTRATIVE ROUTE
          </span>

          <h3 className="fk-route-title">
            Delhi
            <ArrowRight size={18} aria-hidden="true" />
            Leh–Ladakh
          </h3>
        </div>

        <div className="fk-route-distance">
          <Car size={16} aria-hidden="true" />
          <span>Road-trip food discovery</span>
        </div>
      </header>

      <div className="fk-route-content">
        <div
          className="fk-animated-route-map"
          aria-label="Illustrative route from Delhi to Leh-Ladakh"
        >
          <svg
            className="fk-route-svg"
            viewBox="0 0 1000 180"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="fk-food-route-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#ff4f1f" />
                <stop offset="50%" stopColor="#ff983f" />
                <stop offset="100%" stopColor="#ff4f1f" />
              </linearGradient>

              <filter
                id="fk-route-glow"
                x="-20%"
                y="-50%"
                width="140%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path
              className="fk-route-path-shadow"
              d="M70 88 C180 20 275 150 390 92 S575 25 650 82 S835 155 930 88"
            />

            <path
              id="fk-food-route-path"
              className="fk-route-path-live"
              d="M70 88 C180 20 275 150 390 92 S575 25 650 82 S835 155 930 88"
            />

            <path
              className="fk-route-path-progress"
              d="M70 88 C180 20 275 150 390 92 S575 25 650 82 S835 155 930 88"
            />

            <g className="fk-svg-traveller">
              <circle className="fk-traveller-radar" r="24" />
              <circle className="fk-traveller-ring" r="13" />
              <circle className="fk-traveller-core" r="6" />

              <animateMotion
                dur="9s"
                begin="0s"
                repeatCount="indefinite"
              >
                <mpath href="#fk-food-route-path" />
              </animateMotion>
            </g>
          </svg>

          <span className="fk-food-map-pin pin-one">
            <MapPin size={14} />
            <span>Breakfast</span>
          </span>

          <span className="fk-food-map-pin pin-two">
            <MapPin size={14} />
            <span>Regional meal</span>
          </span>

          <span className="fk-food-map-pin pin-three">
            <MapPin size={14} />
            <span>Local food</span>
          </span>
        </div>

        <div className="fk-route-stops">
          {FOOD_WALK_STOPS.map((stop, index) => (
            <div className="fk-route-stop" key={stop.name}>
              <div className="fk-route-stop-marker">
                <div className="fk-route-dot">{index + 1}</div>

                {index < FOOD_WALK_STOPS.length - 1 && (
                  <div
                    className="fk-route-connector"
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className="fk-route-stop-copy">
                <span>{stop.type}</span>
                <strong>{stop.name}</strong>
                <small>{stop.detail}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="fk-route-summary">
        <span>
          <Car size={14} />
          Drive
        </span>
        <span>
          <Bike size={14} />
          Bike
        </span>
        <span>
          <Utensils size={14} />
          Food stops
        </span>
      </footer>
    </article>

    {/* VIDEO — RIGHT SIDE */}
    <aside className="fk-food-walk-video">
      <span className="fk-section-kicker">
        SEE FOOD WALK IN ACTION
      </span>

      <h3>Your route. Your food discoveries.</h3>

      <p>
        See how to choose a route and explore food stops along the way.
      </p>

      <video
        className="fk-food-walk-video-player"
        controls
        playsInline
        preload="metadata"
        aria-label="Food Walk demonstration"
      >
        <source
          src="/videos/video_new.mp4"
          type="video/mp4"
        />
        Your browser does not support video playback.
      </video>
    </aside>
  </div>
</section>



      {/* LEGACY VISUAL TRACK — RETAINED BUT HIDDEN */}
      <section
        className="fk-section fk-how-legacy"
        hidden
      >
        <div className="fk-section-heading">
          <span className="fk-section-kicker">
            FROM DISCOVERY TO THE TABLE
          </span>
          <h2>
            How FoodKindl <span>Connect Works</span>
          </h2>
        </div>

        <div className="fk-how-track">
          {HOW_STEPS.map((step, index) => {
            const Icon = step.icon;

            return (
              <article
                className="fk-how-card"
                key={step.number}
              >
                <div className="fk-how-number">
                  {step.number}
                </div>

                <div className="fk-how-icon">
                  <Icon size={20} />
                </div>

                <div className="fk-how-mini-visual">
                  <div className="fk-mini-avatar">
                    {step.visual.name.slice(0, 1)}
                  </div>

                  <div>
                    <strong>{step.visual.name}</strong>
                    <small>{step.visual.detail}</small>
                  </div>

                  <span>{step.visual.tag}</span>
                </div>

                <h3>{step.title}</h3>
                <p>{step.text}</p>

                {index < HOW_STEPS.length - 1 && (
                  <div className="fk-how-connector">
                    <ArrowRight size={16} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>


      {/* TRUST & SAFETY */}
      <section className="fk-section fk-safety-section">
        <div className="fk-safety-intro">
          <div>
            <span className="fk-section-kicker">
              SAFETY FIRST
            </span>

            <h2>
              Trust &amp; <span>Safety</span>
            </h2>

            <p>
              Built to support more respectful and
              comfortable food experiences.
            </p>
          </div>

          <p className="fk-safety-description">
            Learn about verification, participation controls
            and the safeguards available for gatherings.
          </p>
        </div>

        <div className="fk-safety-grid">
          <article>
            <div className="fk-safety-number">01</div>

            <span className="fk-safety-icon verified">
              <UserCheck size={24} />
            </span>

            <h3>Profile Verification</h3>

            <p>
              Check the verification requirements for
              selected gatherings before joining.
            </p>

            <small>PROFILE &amp; PARTICIPATION CHECKS</small>
          </article>

          <article>
            <div className="fk-safety-number">02</div>

            <span className="fk-safety-icon women">
              <ShieldCheck size={24} />
            </span>

            <h3>Women-Only Preference</h3>

            <p>
              Hosts can choose women-only participation
              for applicable gatherings.
            </p>

            <small>COMFORT-LED PARTICIPATION</small>
          </article>

          <article className="coming-soon">
            <div className="fk-safety-number">03</div>

            <span className="fk-coming-badge">
              Coming Soon
            </span>

            <span className="fk-safety-icon sos">
              <MessageCircle size={24} />
            </span>

            <h3>One-Tap SOS</h3>

            <p>
              A planned safety feature for alerting trusted
              contacts during an active gathering.
            </p>

            <small>PLANNED SAFETY FEATURE</small>
          </article>
        </div>
      </section>

      

      {/* FINAL CTA */}
      <section className="fk-final-cta">
        <div>
          <span>YOUR NEXT FOOD STORY CAN START NEARBY</span>

          <h2>
            Find people. Share food. Build real connections.
          </h2>

          <p>
            Discover a new way to meet people through food.
          </p>
        </div>

        <Link className="fk-primary-button" to={joinUrl}>
          {user ? "Explore FoodKindl" : "Join FoodKindl"}
          <ArrowRight size={18} />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="fk-footer">
        <div className="fk-footer-grid">
          <div className="fk-footer-brand">
            <img
              src="/images/icon.webp"
              alt="FoodKindl"
              loading="lazy"
              decoding="async"
              width="54"
              height="54"
            />

            <p>Where Food Connects People &amp; Planet</p>
          </div>

          <div>
            <h4>Company</h4>
            <Link to="/about">About FoodKindl</Link>
            <Link to="/careers">Careers</Link>
            <Link to="/contact">Contact Us</Link>
          </div>

          <div>
            <h4>Community &amp; Safety</h4>
            <Link to="/community-guidelines">
              Community Guidelines
            </Link>
            <Link to="/safety">Safety Centre</Link>
          </div>

          <div>
            <h4>Legal</h4>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Use</Link>
          </div>

          <div className="fk-footer-social-column">
            <h4>Follow FoodKindl</h4>

            <a
              href="https://www.instagram.com/foodkindl"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram size={15} />
              Instagram
            </a>

            <a
              href="https://www.facebook.com/foodkindl"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Facebook size={15} />
              Facebook
            </a>

            <a
              href="https://www.linkedin.com/company/foodkindl"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Linkedin size={15} />
              LinkedIn
            </a>
          </div>
        </div>

        <div className="fk-footer-bottom">
          <p>
            © {new Date().getFullYear()} KnightnKindle Pvt Ltd.
            All rights reserved.
          </p>

          <p>
            FoodKindl and its associated name, logo and visual
            identity are owned by KnightnKindle Pvt Ltd.
          </p>
        </div>
      </footer>

      {/* KINDLI ASSISTANT */}
      {showKindliLauncher && (
        <div className="kindli-global">
          {!kindliOpen && (
            <button
              type="button"
              className="kindli-launcher"
              onClick={() => setKindliOpen(true)}
              aria-label="Open Kindli AI assistant"
            >
              <span className="kindli-launcher-halo" />

              <img
                src="/images/kindliicon.webp"
                alt=""
                decoding="async"
                width="74"
                height="74"
              />

              <span className="kindli-launcher-online" />
              <span className="kindli-launcher-label">
                Ask Kindli
              </span>
            </button>
          )}

          {kindliOpen && (
            <section
              className="kindli-chat-panel"
              role="dialog"
              aria-label="Kindli FoodKindl AI assistant"
            >
              <header className="kindli-chat-header">
                <div className="kindli-chat-brand">
                  <img
                    src="/images/kindliicon.webp"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width="42"
                    height="42"
                  />

                  <div>
                    <div className="kindli-chat-title-row">
                      <strong>Kindli</strong>
                      <span>AI ASSISTANT</span>
                    </div>
                    <small>Ask me about FoodKindl</small>
                  </div>
                </div>

                <button
                  type="button"
                  className="kindli-chat-close"
                  onClick={() => setKindliOpen(false)}
                  aria-label="Close Kindli"
                >
                  <X size={17} />
                </button>
              </header>

              <div
                ref={kindliChatRef}
                className="kindli-chat-messages"
                role="log"
                aria-live="polite"
              >
                {kindliMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`kindli-chat-message ${message.role}`}
                  >
                    {message.role === "assistant" && (
                      <img
                        src="/images/kindliicon.webp"
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        width="27"
                        height="27"
                      />
                    )}

                    <div>{message.text}</div>
                  </div>
                ))}

                {kindliThinking && (
                  <div className="kindli-chat-message assistant">
                    <img
                      src="/images/kindliicon.webp"
                      alt=""
                      aria-hidden="true"
                      width="27"
                      height="27"
                    />

                    <div
                      className="kindli-thinking"
                      aria-label="Kindli is thinking"
                    >
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}
              </div>

              <div className="kindli-chat-suggestions">
                {KINDLI_SUGGESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    disabled={kindliThinking}
                    onClick={() => askKindli(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>

              <form
                className="kindli-chat-composer"
                onSubmit={submitKindli}
              >
                <input
                  type="text"
                  value={kindliInput}
                  onChange={(event) =>
                    setKindliInput(event.target.value)
                  }
                  placeholder="Ask Kindli anything..."
                  aria-label="Your question for Kindli"
                />

                <button
                  type="submit"
                  disabled={!kindliInput.trim() || kindliThinking}
                  aria-label="Send message to Kindli"
                >
                  <Send size={17} />
                </button>
              </form>

              <div className="kindli-chat-disclaimer">
                <Sparkles size={10} />
                Kindli can help with FoodKindl features,
                navigation and support.
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}