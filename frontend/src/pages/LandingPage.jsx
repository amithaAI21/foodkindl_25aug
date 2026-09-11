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

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import "../styles/landing_page_unique.css";
import "../styles/landing_sections_unique.css";


/* ============================================================
   HERO EXPERIENCES
============================================================ */

/* ============================================================
   HOW IT WORKS
============================================================ */

const HOW_STEPS = [
  {
    number: "01",
    icon: Users,
    title: "Discover People Nearby",
    text:
      "Create your profile, add food interests and discover people in your local community.",
    visual: {
      type: "person",
      name: "Asha",
      detail: "1.8 km away",
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
      type: "invite",
      name: "Kerala Dinner",
      detail: "Saturday · 7:30 PM",
      tag: "Invite sent",
    },
  },

  {
    number: "03",
    icon: Utensils,
    title: "Cook, Meet & Eat Together",
    text:
      "Meet at the planned venue, prepare a meal together or explore a partner restaurant.",
    visual: {
      type: "meal",
      name: "FoodKindl Partner",
      detail: "Rajajinagar",
      tag: "Table for 4",
    },
  },

  {
    number: "04",
    icon: Heart,
    title: "Share the Experience",
    text:
      "Post photos, videos, recipes and food stories to inspire the wider FoodKindl community.",
    visual: {
      type: "share",
      name: "Sunday Lunch",
      detail: "6 photos · 3 tags",
      tag: "Shared",
    },
  },
];


/* ============================================================
   FOOD WALK
============================================================ */

const FOOD_WALK_STOPS = [
  {
    name: "Delhi",
    type: "Start",
    detail: "Choose Walk, Drive or Bike",
    partner: false,
  },

  {
    name: "Keylong",
    type: "Stop 1",
    detail: "Local breakfast stop",
    partner: true,
  },

  {
    name: "Tanglang",
    type: "Stop 2",
    detail: "Regional food discovery",
    partner: true,
  },

  {
    name: "Leh-Ladakh",
    type: "Destination",
    detail: "Complete your food journey",
    partner: false,
  },
];


/* ============================================================
   COMMUNITY ACTIVITY
============================================================ */

const COMMUNITY_ACTIVITY = [
  {
    type: "Dine Out",
    icon: Utensils,
    title: "Kerala dinner this Saturday",
    location: "Indiranagar",
    meta: "4 people joining",
    badge: "2 seats left",
  },

  {
    type: "Food Walk",
    icon: Footprints,
    title: "Candolim Beach → Dudhsagar Falls",
    location: "3 partner stops",
    meta: "5 people interested",
    badge: "Food Walk",
  },

  {
    type: "Cook Together",
    icon: ChefHat,
    title: "South Indian breakfast",
    location: "Yeshwanthpur",
    meta: "Sunday · 9:00 AM",
    badge: "2 seats left",
  },
];


/* ============================================================
   LANDING PAGE
============================================================ */

export default function LandingPage() {

  const {
    user,
  } = useAuth();


  /* =========================================================
     KINDLI — FOODKINDL AI ASSISTANT
  ========================================================= */

  const [kindliOpen, setKindliOpen] =
    useState(false);


  const [
    showKindliLauncher,
    setShowKindliLauncher,
  ] = useState(false);


  /*
    PERFORMANCE:
    Kindli is fixed to the viewport, but it is not needed for the
    first paint. Reveal it after the browser becomes idle.
  */
  useEffect(
    () => {

      let idleHandle = null;
      let timeoutHandle = null;


      const showKindli = () => {
        setShowKindliLauncher(
          true
        );
      };


      if (
        "requestIdleCallback" in window
      ) {

        idleHandle =
          window.requestIdleCallback(
            showKindli,
            {
              timeout: 2500,
            }
          );

      } else {

        timeoutHandle =
          window.setTimeout(
            showKindli,
            1800
          );
      }


      return () => {

        if (
          idleHandle !== null &&
          "cancelIdleCallback" in window
        ) {
          window.cancelIdleCallback(
            idleHandle
          );
        }


        if (
          timeoutHandle !== null
        ) {
          window.clearTimeout(
            timeoutHandle
          );
        }
      };

    },
    []
  );

  const [kindliMessages, setKindliMessages] =
    useState([
      {
        id: "kindli-welcome",
        role: "assistant",
        text:
          "Hi! I'm Kindli 👋 Your FoodKindl AI assistant. Ask me anything about FoodKindl, Connect, Food Invites, Food Walk, AI Kitchen, safety, profiles, verification, community, Share, Products, or how to use the platform.",
      },
    ]);

  const [kindliInput, setKindliInput] =
    useState("");

  const [kindliThinking, setKindliThinking] =
    useState(false);

  const kindliChatRef =
    useRef(null);

  const KINDLI_API_URL = (
    import.meta.env.VITE_KINDLI_API_URL ||
    (
      import.meta.env.VITE_BACKEND_URL
        ? `${import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, "")}/api/kindli/chat/`
        : "/api/kindli/chat/"
    )
  );


  function getKindliFallbackReply(question) {

    const q =
      String(question || "")
        .trim()
        .toLowerCase();

    if (q.includes("food walk")) {
      return "Food Walk lets you choose a starting point and destination, then discover food stops along the route and create a multi-stop experience.";
    }

    if (q.includes("invite")) {
      return "Food Invites help you turn a conversation into a real food moment such as Cook Together, Dine Out, or Food Walk.";
    }

    if (
      q.includes("ai kitchen") ||
      q.includes("recipe")
    ) {
      return "AI Kitchen helps you discover recipe ideas from your available ingredients and food preferences.";
    }

    if (
      q.includes("verify") ||
      q.includes("government id") ||
      q.includes("govt id")
    ) {
      return "FoodKindl uses private identity verification to support safer interactions. Government ID information is used for verification and is not shown publicly.";
    }

    if (
      q.includes("safe") ||
      q.includes("safety")
    ) {
      return "FoodKindl includes safety-focused features such as verified profiles and women-only preferences for applicable gatherings.";
    }

    if (
      q.includes("connect") ||
      q.includes("people")
    ) {
      return "FoodKindl Connect helps you discover people nearby through shared food interests, connect with them, chat, and plan food experiences together.";
    }

    if (
      q.includes("share") ||
      q.includes("video") ||
      q.includes("post")
    ) {
      return "FoodKindl Share is designed for food moments, recipes, photos, videos and stories from your connections and creators.";
    }

    if (
      q.includes("product") ||
      q.includes("spice") ||
      q.includes("buy")
    ) {
      return "FoodKindl Products will expand the platform into food-related products and commerce experiences.";
    }

    if (
      q.includes("what is foodkindl") ||
      q.includes("about foodkindl")
    ) {
      return "FoodKindl is a food-first platform designed to help people connect through shared meals, cooking, dining, Food Walks, community content and food-focused experiences.";
    }

    return (
      "I can help with FoodKindl features, navigation, safety, community and support. For fully open-ended answers, Kindli uses the FoodKindl AI service."
    );
  }


  async function askKindli(question) {

    const cleanQuestion =
      String(question || "").trim();

    if (
      !cleanQuestion ||
      kindliThinking
    ) {
      return;
    }

    setKindliMessages(
      current => [
        ...current,
        {
          id: `kindli-user-${Date.now()}`,
          role: "user",
          text: cleanQuestion,
        },
      ]
    );

    setKindliInput("");
    setKindliThinking(true);

    try {

      const response =
        await fetch(
          KINDLI_API_URL,
          {
            method: "POST",
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
                  "Products",
                ],
              },
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          `Kindli request failed with status ${response.status}`
        );
      }

      const data =
        await response.json();

      setKindliMessages(
        current => [
          ...current,
          {
            id: `kindli-assistant-${Date.now()}`,
            role: "assistant",
            text:
              data?.reply ||
              data?.message ||
              data?.answer ||
              getKindliFallbackReply(cleanQuestion),
          },
        ]
      );

    } catch (error) {

      setKindliMessages(
        current => [
          ...current,
          {
            id: `kindli-fallback-${Date.now()}`,
            role: "assistant",
            text:
              getKindliFallbackReply(
                cleanQuestion
              ),
          },
        ]
      );

    } finally {

      setKindliThinking(false);

    }
  }


  function submitKindli(event) {
    event.preventDefault();
    askKindli(kindliInput);
  }


  useEffect(
    () => {

      if (
        !kindliOpen ||
        !kindliChatRef.current
      ) {
        return;
      }

      kindliChatRef.current.scrollTo({
        top:
          kindliChatRef.current.scrollHeight,
        behavior:
          "smooth",
      });

    },
    [
      kindliOpen,
      kindliMessages,
      kindliThinking,
    ]
  );


  /* =========================================================
     PAGE VISIBILITY — PAUSE DECORATIVE MOTION
  ========================================================= */

  useEffect(
    () => {

      function syncPageVisibility() {

        document.documentElement.setAttribute(
          "data-page-hidden",
          document.hidden
            ? "true"
            : "false"
        );
      }


      syncPageVisibility();


      document.addEventListener(
        "visibilitychange",
        syncPageVisibility
      );


      return () => {

        document.removeEventListener(
          "visibilitychange",
          syncPageVisibility
        );

        document.documentElement.removeAttribute(
          "data-page-hidden"
        );
      };
    },
    []
  );


  /* =========================================================
     HOMEPAGE VIDEO — LOADED FROM DJANGO / NETLIFY BLOB
  ========================================================= */

  const [
    storyVideo,
    setStoryVideo,
  ] = useState(null);

  const [
    storyVideoLoading,
    setStoryVideoLoading,
  ] = useState(false);

  const [
    storyVideoError,
    setStoryVideoError,
  ] = useState("");


  const [
    shouldLoadStoryVideo,
    setShouldLoadStoryVideo,
  ] = useState(false);

  const storySectionRef =
    useRef(null);


  /*
    PERFORMANCE:
    Do not hit the homepage-video API during the initial page load.
    Start loading only when the Social Dining / video section is
    getting close to the viewport.
  */
  useEffect(
    () => {

      const node =
        storySectionRef.current;

      if (
        !node ||
        shouldLoadStoryVideo
      ) {
        return;
      }

      const observer =
        new IntersectionObserver(
          entries => {

            if (
              entries.some(
                entry =>
                  entry.isIntersecting
              )
            ) {

              setShouldLoadStoryVideo(
                true
              );

              observer.disconnect();
            }
          },
          {
            rootMargin:
              "250px 0px",
            threshold:
              0.01,
          }
        );

      observer.observe(
        node
      );


      return () => {
        observer.disconnect();
      };
    },
    [
      shouldLoadStoryVideo,
    ]
  );


  useEffect(
    () => {

      if (
        !shouldLoadStoryVideo
      ) {
        return;
      }


      let cancelled = false;


      async function loadStoryVideo() {

        try {

          setStoryVideoLoading(true);

          setStoryVideoError("");


          // ====================================================
          // BACKEND
          // ====================================================

          const configuredBackend =
            import.meta.env.VITE_BACKEND_URL ||
            import.meta.env.VITE_API_BASE_URL ||
            "https://foodkindl-25aug.onrender.com";


          const backend =
            configuredBackend.replace(
              /\/+$/,
              ""
            );


          const endpoint =
            `${backend}/api/website/homepage-video/`;


          // ====================================================
          // FETCH
          // ====================================================

          const response =
            await fetch(
              endpoint,
              {
                method: "GET",

                headers: {
                  Accept:
                    "application/json",
                },

                cache:
                  "force-cache",
              }
            );


          if (!response.ok) {

            const responseText =
              await response.text();


            console.error(
              "Homepage video backend response:",
              responseText
            );


            throw new Error(
              `Homepage video API returned ${response.status}`
            );
          }


          const data =
            await response.json();


          if (cancelled) {
            return;
          }


          // ====================================================
          // VALID VIDEO
          // ====================================================

          if (
            data &&
            data.available === true &&
            data.video_url
          ) {

            const cleanVideoUrl =
              String(
                data.video_url
              ).trim();


            setStoryVideo({

              id:
                data.id ||
                null,

              title:
                data.title ||
                "FoodKindl Story",

              video_url:
                cleanVideoUrl,

              poster_url:
                data.poster_url
                  ? String(
                      data.poster_url
                    ).trim()
                  : "",

              updated_at:
                data.updated_at ||
                null,

            });


            setStoryVideoError(
              ""
            );

          } else {


            setStoryVideo(
              null
            );


            setStoryVideoError(
              "No active homepage video was returned."
            );
          }


        } catch (error) {

          console.error(
            "Unable to load FoodKindl homepage video:",
            error
          );


          if (!cancelled) {

            setStoryVideo(
              null
            );


            setStoryVideoError(
              error?.message ||
              "Unable to load homepage video."
            );
          }


        } finally {

          if (!cancelled) {

            setStoryVideoLoading(
              false
            );
          }
        }
      }


      loadStoryVideo();


      return () => {

        cancelled = true;

      };

    },
    [
      shouldLoadStoryVideo,
    ]
  );


  /* =========================================================
     PAGE
  ========================================================= */

  return (

    <main className="fk-landing">

      {/* =====================================================
          HERO
      ====================================================== */}

      <section
        className="fk-hero"
        id="connect"
      >

        <div className="fk-hero-glow fk-hero-glow-one" aria-hidden="true" />

        <div className="fk-hero-glow fk-hero-glow-two" aria-hidden="true" />


        <div className="fk-hero-inner">


          {/* LEFT */}
          <div className="fk-hero-copy">
            <div className="fk-status-pill">FOODKINDL CONNECT</div>

            <h1>
              Meet people
              <br />
              through food.
            </h1>

            <p className="fk-hero-description">
              Discover like-minded people nearby. Connect, dine out and explore
              Food Walks together.
            </p>

            <div className="fk-hero-actions">
              <Link
                className="fk-primary-button"
                to={user ? "/connect-dashboard" : "/register"}
              >
                Join FoodKindl
                <ArrowRight size={18} />
              </Link>

              <a className="fk-secondary-button" href="#how-it-works">
                <Play size={17} />
                See How It Works
              </a>
            </div>

            <div className="fk-hero-proof">
              <span><Users size={18} /> Real people</span>
              <span><Utensils size={18} /> Shared experiences</span>
              <span><Heart size={18} /> A healthier, more connected world</span>
            </div>
          </div>

          {/* RIGHT — THREE WAYS TO CONNECT */}
          <div className="fk-experience-panel">
            <div className="fk-experience-panel-head">
              <h2>Three ways to connect through food</h2>
              <p>People. Places. A healthier you.</p>
            </div>

            <div className="fk-experience-grid">
              <article className="fk-experience-card fk-experience-connect">
                <div className="fk-experience-title">
                  <span><Users size={19} /></span>
                  <div>
                    <h3>Connect</h3>
                    <p>Discover people nearby</p>
                  </div>
                </div>

                <div className="fk-experience-visual fk-people-visual">
                  <img
                    src="/images/connect1.webp"
                    alt="FoodKindl member discovering people nearby"
                    loading="eager"
                    decoding="async"
                  />
                  <div className="fk-card-caption">
                    <MapPin size={12} /> People nearby
                  </div>
                </div>
              </article>

              <article className="fk-experience-card fk-experience-dine">
                <div className="fk-experience-title">
                  <span><Utensils size={19} /></span>
                  <div>
                    <h3>Dine Out</h3>
                    <p>Meet over a shared meal</p>
                  </div>
                </div>

                <div className="fk-experience-visual fk-dine-visual">
                  <img
                    src="/images/dineout1.webp"
                    alt="FoodKindl members dining out together"
                    loading="eager"
                    decoding="async"
                  />
                  <div className="fk-card-caption">
                    <MapPin size={12} />
                    <span>Great food<strong>Better company</strong></span>
                  </div>
                </div>
              </article>

              <article className="fk-experience-card fk-experience-walk">
                <div className="fk-experience-title">
                  <span><MapPin size={19} /></span>
                  <div>
                    <h3>Food Walk</h3>
                    <p>Find food along your route</p>
                  </div>
                </div>

                <div className="fk-travel-modes" aria-label="Travel modes">
                  <span><Footprints size={11} /> Walk</span>
                  <span className="active"><Car size={11} /> Drive</span>
                  <span><Bike size={11} /> Bike</span>
                </div>

                <div className="fk-experience-visual fk-walk-visual">
                  <img
                    src="/images/foodwalk1.webp"
                    alt="Food journey from Bengaluru to Coorg"
                    loading="eager"
                    decoding="async"
                  />
                </div>

                <div className="fk-walk-caption">
                  <Footprints size={12} />
                  4 food stops along your journey
                </div>

                <small className="fk-next-route">
                  Try next: Delhi → Leh–Ladakh
                </small>
              </article>
            </div>

            <div className="fk-experience-footer">
              <span>Same city</span><i />
              <span>Shared tables</span><i />
              <span>Brighter days</span><Heart size={13} />
            </div>
          </div>

        </div>

      </section>

      {/* =====================================================
          AI KITCHEN — PRIMARY USP
      ====================================================== */}

      <section className="fk-ai-spotlight" id="ai-kitchen-preview">
        <div className="fk-ai-spotlight-inner">
          <div className="fk-ai-copy">
            <span className="fk-section-kicker">FOODKINDL AI KITCHEN</span>
            <h2>Turn your ingredients into <span>healthier meals.</span></h2>
            <p>
              Upload photos or videos of the ingredients you have, or simply ask
              for a recipe. FoodKindl AI suggests healthier recipes personalised
              for you.
            </p>
            <Link className="fk-primary-button" to={user ? "/ai-kitchen" : "/login"}>
              Try AI Kitchen <ArrowRight size={17} />
            </Link>
            <div className="fk-ai-benefits">
              <span><Sparkles size={14} /> Healthier recipes</span>
              <span><ChefHat size={14} /> Cook with what you have</span>
            </div>
          </div>

          <div className="fk-ai-demo">
            <div className="fk-ai-actions">
              <span className="active">Ask for a Recipe</span>
              {/* <span>Upload Video</span>
              <span>Ask for a Recipe</span> */}
            </div>
            <div className="fk-ai-demo-grid">
              <div className="fk-ai-ingredients">
                <img
                  src="/images/paneer.webp"
                  alt="Raw ingredients recognised by FoodKindl AI"
                />
                <div><span>Tomato</span><span>Paneer</span><span>Spinach</span></div>
              </div>
              <ArrowRight className="fk-ai-arrow" size={22} />
              <div className="fk-ai-result">
                <img
                  src="/images/panner_cooked.webp"
                  alt="High-protein Palak Paneer suggested by FoodKindl AI"
                />
                <small>AI RECIPE SUGGESTION</small>
                <strong>High-Protein Palak Paneer</strong>
                <p>A balanced recipe personalised from your ingredients.</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* =====================================================
          FOOD WALK SHOWCASE
      ====================================================== */}

      <section
        className="fk-section fk-food-walk-section"
        id="food-walk"
      >

        <div className="fk-section-heading fk-section-heading-left">

          <span className="fk-section-kicker">
            A FOODKINDL ORIGINAL EXPERIENCE
          </span>


          <h2>
            Build a{" "}
            <span>
              Food Walk
            </span>
          </h2>


          <p>
            From a short neighbourhood walk to a drive or bike journey
            between cities, choose your route and discover memorable
            food stops along the way.
          </p>

        </div>


        <section className="fk-food-walk-shell">
  <article className="fk-food-walk-route">
    <header className="fk-food-walk-route-head">
      <div>
        <span className="fk-route-eyebrow">
          LIVE ROUTE PREVIEW
        </span>

        <h3 className="fk-route-title">
          Delhi
          <ArrowRight size={18} aria-hidden="true" />
          Leh–Ladakh
        </h3>
      </div>

      <div className="fk-route-distance">
        <Car size={16} aria-hidden="true" />
        <span>1,000+ km Road Food Trail</span>
      </div>
    </header>

    <div className="fk-route-content">
      {/* Animated travelling route */}
      <div
        className="fk-animated-route-map"
        aria-label="Animated food route from Delhi to Leh-Ladakh"
      >
        <svg
          className="fk-route-svg"
          viewBox="0 0 1000 180"
          preserveAspectRatio="none"
          role="img"
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
          <span>Local favourite</span>
        </span>
      </div>

      {/* Route destinations */}
      <div className="fk-route-stops">
        {FOOD_WALK_STOPS.map((stop, index) => (
          <div
            className={`fk-route-stop ${
              stop.partner ? "is-partner" : ""
            }`}
            key={stop.name}
          >
            <div className="fk-route-stop-marker">
              <div className="fk-route-dot">
                {index + 1}
              </div>

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

              {stop.partner && (
                <em>
                  <Check size={11} aria-hidden="true" />
                  FoodKindl Partner
                </em>
              )}
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
        Regional food stops
      </span>
    </footer>

  </article>

  <aside className="fk-connect-steps-panel" id="how-it-works">
    <div className="fk-connect-steps-head">
      <span className="fk-section-kicker">
        FROM DISCOVERY TO THE TABLE
      </span>

      <h3>
        How FoodKindl <span>Connect Works</span>
      </h3>

      <p>
        Four simple steps turn a shared love of food into meaningful
        real-world connections.
      </p>
    </div>

    <div className="fk-connect-steps-list">
      {HOW_STEPS.map((step, index) => {
        const Icon = step.icon;

        return (
          <article className="fk-connect-step" key={step.number}>
            <div className="fk-connect-step-rail">
              <span>{step.number}</span>

              {index < HOW_STEPS.length - 1 && (
                <i aria-hidden="true" />
              )}
            </div>

            <div className="fk-connect-step-icon">
              <Icon size={18} />
            </div>

            <div className="fk-connect-step-copy">
              <h4>{step.title}</h4>
              <p>{step.text}</p>
            </div>
          </article>
        );
      })}
    </div>
  </aside>
</section>

      </section>


      {/* =====================================================
          HOW IT WORKS — VISUAL
      ====================================================== */}

      <section
        className="fk-section fk-how-legacy"
        aria-hidden="true"
      >

        <div className="fk-section-heading">

          <span className="fk-section-kicker">
            FROM DISCOVERY TO THE TABLE
          </span>


          <h2>
            How FoodKindl{" "}
            <span>
              Connect Works
            </span>
          </h2>


          <p>
            Four simple steps turn a shared love
            of food into meaningful real-world connections.
          </p>

        </div>


        <div className="fk-how-track">

          {
            HOW_STEPS.map(
              (
                step,
                index
              ) => {

                const Icon =
                  step.icon;


                return (

                  <article
                    className="fk-how-card"
                    key={
                      step.number
                    }
                  >

                    <div className="fk-how-number">
                      {step.number}
                    </div>


                    <div className="fk-how-icon">
                      <Icon size={20} />
                    </div>


                    <div className="fk-how-mini-visual">

                      <div className="fk-mini-avatar">
                        {
                          step.visual.name
                            .slice(
                              0,
                              1
                            )
                        }
                      </div>


                      <div>

                        <strong>
                          {
                            step.visual.name
                          }
                        </strong>

                        <small>
                          {
                            step.visual.detail
                          }
                        </small>

                      </div>


                      <span>
                        {
                          step.visual.tag
                        }
                      </span>

                    </div>


                    <h3>
                      {
                        step.title
                      }
                    </h3>


                    <p>
                      {
                        step.text
                      }
                    </p>


                    {
                      index <
                      HOW_STEPS.length -
                      1 &&
                      (
                        <div className="fk-how-connector">
                          <ArrowRight size={16} />
                        </div>
                      )
                    }

                  </article>

                );
              }
            )
          }

        </div>

      </section>


      {/* =====================================================
          HAPPENING ON FOODKINDL
      ====================================================== */}

      <section className="fk-section fk-activity-section">

        <div className="fk-section-heading fk-section-heading-left">

          <span className="fk-section-kicker">
            COMMUNITY RIGHT NOW
          </span>


          <h2>
            Happening on{" "}
            <span>
              FoodKindl
            </span>
          </h2>


          <p>
            A glimpse of the food moments people can create
            and discover across the community.
          </p>

        </div>


        <div className="fk-activity-grid">

          {
            COMMUNITY_ACTIVITY.map(
              activity => {

                const Icon =
                  activity.icon;


                return (

                  <article
                    className="fk-activity-card"
                    key={
                      activity.title
                    }
                  >

                    <div className="fk-activity-top">

                      <span className="fk-activity-type">

                        <Icon
                          size={14}
                        />

                        {
                          activity.type
                        }

                      </span>


                      <span className="fk-activity-live">
                        LIVE
                      </span>

                    </div>


                    <h3>
                      {
                        activity.title
                      }
                    </h3>


                    <div className="fk-activity-location">

                      <MapPin
                        size={13}
                      />

                      {
                        activity.location
                      }

                    </div>


                    <p>
                      {
                        activity.meta
                      }
                    </p>


                    <div className="fk-activity-footer">

                      <div className="fk-avatar-stack small">
                        <span>A</span>
                        <span>M</span>
                        <span>R</span>
                      </div>


                      <strong>
                        {
                          activity.badge
                        }
                      </strong>

                    </div>

                  </article>

                );
              }
            )
          }

        </div>

      </section>


      {/* =====================================================
          LEARN, CREATE AND SHARE
      ====================================================== */}

      <section
        className="fk-section fk-ecosystem-section"
        id="learn-create-share"
      >

        <div className="fk-section-heading">

          <span className="fk-section-kicker">
            FOR FOOD LOVERS, BY FOOD LOVERS
          </span>


          <h2>
            Learn, Create and{" "}
            <span>
              Share
            </span>
          </h2>


          <p>
            FoodKindl connects inspiration back to real
            food moments — discover a recipe, cook it,
            meet people and share what happened.
          </p>

        </div>


        <div className="fk-ecosystem-grid">


          {/* AI */}

          <article className="fk-ecosystem-card">

            <img
              src="/images/connect.webp"
              alt="FoodKindl AI recipes"
              loading="lazy"
              decoding="async"
              width="800"
              height="600"
            />

            <div className="fk-ecosystem-overlay" />


            <div className="fk-ecosystem-content">

              <span className="fk-ecosystem-icon">
                <Sparkles size={22} />
              </span>


              <small>
                FOODKINDL AI
              </small>


              <h3>
                Tell us what you have.
                Get a recipe.
                Cook it together.
              </h3>


              <p>
                Get personalised recipe ideas from your
                available ingredients and food preferences,
                then turn the recipe into a shared meal.
              </p>


              <Link
                to={
                  user
                    ? "/ai-kitchen"
                    : "/login"
                }
              >
                Open AI Kitchen

                <ArrowRight size={16} />
              </Link>

            </div>

          </article>


          {/* VIDEOS */}

          <article className="fk-ecosystem-card">

            <img
              src="/images/food22.webp"
              alt="FoodKindl community food videos"
              loading="lazy"
              decoding="async"
              width="800"
              height="600"
            />

            <div className="fk-ecosystem-overlay" />


            <div className="fk-ecosystem-content">

              <small>
                FOOD VIDEOS
              </small>


              <h3>
                See what your connections cooked.
                Discover regional dishes.
              </h3>


              <p>
                Watch community food videos, discover cooking
                ideas, save inspiration and share your own
                food experiences.
              </p>


              <Link
                to={
                  user
                    ? "/community"
                    : "/login"
                }
              >
                Explore community

                <ArrowRight size={16} />
              </Link>

            </div>

          </article>

        </div>

      </section>


      {/* =====================================================
          SOCIAL DINING + STORY VIDEO
      ====================================================== */}

      <section
        ref={storySectionRef}
        className="fk-section fk-story-section"
      >

        <div className="fk-story-copy">

          <span className="fk-section-kicker">
            HUMAN-CENTRIC FOOD PLATFORM
          </span>


          <h2>
            Social Dining,{" "}
            <span>
              Simplified.
            </span>
          </h2>


          <p>
            Meaningful connections often begin around food:
            cooking together, sharing a meal and enjoying
            conversations that can grow into lasting friendships.
          </p>


          <p>
            FoodKindl helps people discover like-minded members,
            plan gatherings and build genuine relationships
            around a shared love of food.
          </p>


          <div className="fk-story-points">

            <span>
              <Users size={15} />
              Discover people nearby
            </span>

            <span>
              <Send size={15} />
              Create Food Invites
            </span>

            <span>
              <Heart size={15} />
              Turn meals into connections
            </span>

          </div>

        </div>


        <div className="fk-story-video-card">

          {!shouldLoadStoryVideo ? (

            <div
              className="fk-story-video-loading fk-story-video-deferred"
            >
              <strong>
                FoodKindl Story
              </strong>
              <span>
                Video loads when you reach this section.
              </span>
            </div>

          ) : storyVideoLoading ? (

            <div
              className="fk-story-video-loading"
            >

              Loading FoodKindl Story...

            </div>

          ) : storyVideo?.video_url ? (

            <video
              key={
                `${storyVideo.id || "video"}-${storyVideo.updated_at || storyVideo.video_url}`
              }
              className="fk-story-video"
              controls
              playsInline
              preload="none"
              src={
                storyVideo.video_url
              }
              poster={
                storyVideo.poster_url ||
                undefined
              }
              onError={() => {
                setStoryVideoError(
                  "Video could not be played."
                );
              }}
            >
              Your browser does not
              support HTML5 video.
            </video>

          ) : (

            <div
              className="fk-story-video-loading"
            >

              <strong>
                FoodKindl Story
              </strong>

              <span>

                {
                  storyVideoError ||
                  "Video is currently unavailable."
                }

              </span>

            </div>

          )}

        </div>

      </section>


      {/* =====================================================
          TRUST & SAFETY
      ====================================================== */}

      <section className="fk-section fk-safety-section">

        <div className="fk-safety-intro">

          <div>

            <span className="fk-section-kicker">
              SAFETY FIRST PROTOCOL
            </span>


            <h2>
              Trust &{" "}
              <span>
                Safety
              </span>
            </h2>


            <p>
              Built to help every FoodKindl connection
              feel safer, more respectful and more comfortable.
            </p>

          </div>


          <p className="fk-safety-description">
            FoodKindl combines verified profiles,
            participation controls and safety-first
            product choices to support a respectful
            food community.
          </p>

        </div>


        <div className="fk-safety-grid">

          <article>

            <div className="fk-safety-number">
              01
            </div>


            <span className="fk-safety-icon verified">

              <UserCheck
                size={24}
              />

            </span>


            <h3>
              Verified Profiles
            </h3>


            <p>
              Government-issued photo ID can be required
              before members join selected private gatherings.
            </p>


            <small>
              IDENTITY-BACKED TRUST
            </small>

          </article>


          <article>

            <div className="fk-safety-number">
              02
            </div>


            <span className="fk-safety-icon women">

              <ShieldCheck
                size={24}
              />

            </span>


            <h3>
              Women-Only Preference
            </h3>


            <p>
              Hosts can limit applicable gatherings
              to verified female community members.
            </p>


            <small>
              COMFORT-LED PARTICIPATION
            </small>

          </article>


          <article className="coming-soon">

            <div className="fk-safety-number">
              03
            </div>


            {/* <span className="fk-coming-badge">
              Coming Soon
            </span> */}


            <span className="fk-safety-icon sos">

              <MessageCircle
                size={24}
              />

            </span>


            <h3>
              One-Tap SOS
            </h3>


            <p>
              A future emergency safety control
              designed to alert trusted contacts
              during an active gathering.
            </p>


            <small>
              EMERGENCY SUPPORT LAYER
            </small>

          </article>

        </div>

      </section>


      {/* =====================================================
          FINAL CTA
      ====================================================== */}

      <section className="fk-final-cta">

        <div>

          <span>
            YOUR NEXT FOOD STORY CAN START NEARBY
          </span>


          <h2>
            Find people.
            Share food.
            Build real connections.
          </h2>


          <p>
            Join FoodKindl Connect and discover
            a new way to meet people through food.
          </p>

        </div>


        <Link
  to={
    user
      ? "/connect-dashboard"
      : "/login"
  }
  className="fk-primary-button"
>
  Enter FoodKindl Connect

  <ArrowRight size={18} />
</Link>

      </section>


      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="fk-footer">

  <div className="fk-footer-grid">

    {/* BRAND */}

    <div className="fk-footer-brand">

      <img
        src="/images/icon.webp"
        alt="FoodKindl"
        loading="lazy"
        decoding="async"
        width="54"
        height="54"
      />

      <p>
        Where Food Connects
        People &amp; Planet
      </p>

    </div>


    {/* COMPANY */}

    <div>

      <h4>
        Company
      </h4>

      <Link to="/about">
        About FoodKindl
      </Link>

      <Link to="/careers">
        Careers
      </Link>

      <Link to="/contact">
        Contact Us
      </Link>

    </div>


    {/* COMMUNITY */}

    <div>

      <h4>
        Community &amp; Safety
      </h4>

      <Link to="/community-guidelines">
        Community Guidelines
      </Link>

      <Link to="/safety">
        Safety Centre
      </Link>

    </div>


    {/* LEGAL */}

    <div>

      <h4>
        Legal
      </h4>

      <Link to="/privacy">
        Privacy Policy
      </Link>

      <Link to="/terms">
        Terms of Use
      </Link>

    </div>


    {/* SOCIAL */}

    <div className="fk-footer-social-column">

      <h4>
        Follow FoodKindl
      </h4>


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
      © 2026 KnightnKindle Pvt Ltd.
      All rights reserved.
    </p>


    <p>
      FoodKindl and its associated name,
      logo and visual identity are owned by
      KnightnKindle Pvt Ltd.
    </p>

  </div>

</footer>


      {/* =====================================================
          KINDLI — GLOBAL LANDING PAGE AI ASSISTANT
      ====================================================== */}

      {
        showKindliLauncher &&
        (
          <div className="kindli-global">

        {
          !kindliOpen &&
          (

            <button
              type="button"
              className="kindli-launcher"
              onClick={() =>
                setKindliOpen(true)
              }
              aria-label="Open Kindli AI assistant"
            >

              <span className="kindli-launcher-halo" />

              <img
                src="/images/kindliicon.webp"
                alt="Kindli"
                decoding="async"
                width="74"
                height="74"
            />

              <span className="kindli-launcher-online" />

              <span className="kindli-launcher-label">
                Ask Kindli
              </span>

            </button>

          )
        }


        {
          kindliOpen &&
          (

            <section
              className="kindli-chat-panel"
              role="dialog"
              aria-label="Kindli FoodKindl AI assistant"
            >

              <header className="kindli-chat-header">

                <div className="kindli-chat-brand">

                  <img
                    src="/images/kindliicon.webp"
                    alt="Kindli"
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

                    <small>
                      Ask me anything about FoodKindl
                    </small>

                  </div>

                </div>


                <button
                  type="button"
                  className="kindli-chat-close"
                  onClick={() =>
                    setKindliOpen(false)
                  }
                  aria-label="Close Kindli"
                >
                  <X size={17} />
                </button>

              </header>


              <div
                ref={kindliChatRef}
                className="kindli-chat-messages"
              >

                {
                  kindliMessages.map(
                    message => (

                      <div
                        key={message.id}
                        className={
                          `kindli-chat-message ${message.role}`
                        }
                      >

                        {
                          message.role === "assistant" &&
                          (
                            <img
                              src="/images/kindliicon.webp"
                              alt=""
                              aria-hidden="true"
                              loading="lazy"
                              decoding="async"
                              width="27"
                              height="27"
                            />
                          )
                        }

                        <div>
                          {message.text}
                        </div>

                      </div>

                    )
                  )
                }


                {
                  kindliThinking &&
                  (

                    <div className="kindli-chat-message assistant">

                      <img
                        src="/images/kindliicon.webp"
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        width="27"
                        height="27"
                      />

                      <div className="kindli-thinking">
                        <span />
                        <span />
                        <span />
                      </div>

                    </div>

                  )
                }

              </div>


              <div className="kindli-chat-suggestions">

                {
                  [
                    "What is FoodKindl?",
                    "How does Food Walk work?",
                    "What can AI Kitchen do?",
                  ].map(
                    question => (

                      <button
                        key={question}
                        type="button"
                        onClick={() =>
                          askKindli(question)
                        }
                      >
                        {question}
                      </button>

                    )
                  )
                }

              </div>


              <form
                className="kindli-chat-composer"
                onSubmit={submitKindli}
              >

                <input
                  type="text"
                  value={kindliInput}
                  onChange={
                    event =>
                      setKindliInput(
                        event.target.value
                      )
                  }
                  placeholder="Ask Kindli anything..."
                  aria-label="Ask Kindli anything"
                />

                <button
                  type="submit"
                  disabled={
                    !kindliInput.trim() ||
                    kindliThinking
                  }
                  aria-label="Send message to Kindli"
                >
                  <Send size={17} />
                </button>

              </form>


              <div className="kindli-chat-disclaimer">
                <Sparkles size={10} />
                Kindli can help with FoodKindl features, navigation and support.
              </div>

            </section>

          )
        }

          </div>
        )
      }


    </main>

  );
}
