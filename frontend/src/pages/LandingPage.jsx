import {
  ArrowRight,
  CalendarDays,
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
  Star,
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


/* ============================================================
   HERO EXPERIENCES
============================================================ */

const HERO_EXPERIENCES = [
  {
    id: "cook",
    label: "Cook Together",
    icon: ChefHat,

    member: {
      name: "Lakshmi Nair",
      initials: "LN",
      locality: "Indiranagar",
      distance: "2.3 km away",
      image: "/images/homepage1.jpg",
    },

    title: "Kerala Sunday Lunch",

    description:
      "Looking for a few food lovers to cook a Kerala lunch together this Sunday.",

    tags: [
      "Kerala",
      "Home Cooking",
      "Weekend",
    ],

    meta:
      "Sunday · 12:30 PM",
  },

  {
    id: "dine",
    label: "Dine Out",
    icon: Utensils,

    member: {
      name: "Arjun Menon",
      initials: "AM",
      locality: "Rajajinagar",
      distance: "3.1 km away",
      image: "/images/food22.png",
    },

    title: "South Indian Dinner",

    description:
      "Meet nearby FoodKindl members for dinner at a FoodKindl partner restaurant.",

    tags: [
      "South Indian",
      "Restaurant",
      "FoodKindl Partner",
    ],

    meta:
      "Friday · 8:00 PM",
  },

  {
    id: "walk",
    label: "Food Walk",
    icon: Footprints,

    member: {
      name: "Meera Joseph",
      initials: "MJ",
      locality: "Yeshwanthpur",
      distance: "4.0 km away",
      image: "/images/food11.png",
    },

    title: "Bengaluru Food Walk",

    description:
      "Discover partner restaurants along a route and build a multi-stop food experience.",

    tags: [
      "Street Food",
      "3 Stops",
      "Food Walk",
    ],

    meta:
      "Yeshwanthpur → Rajajinagar",
  },
];


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
      "Connect with someone nearby, start a conversation and invite them to cook, dine out or join a Food Walk.",
    visual: {
      name: "Connect with Asha",
      detail: "Nearby food connection",
      tag: "Connect",
    },
  },

  {
    number: "03",
    icon: Utensils,
    title: "Cook, Meet & Eat Together",
    text:
      "Meet at the planned venue, prepare a meal together or explore a partner restaurant.",
    visual: {
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
    name: "Nagasandra",
    type: "Start",
    detail: "Meet your group",
    partner: false,
  },

  {
    name: "Yeshwanthpur",
    type: "Stop 1",
    detail: "Hotel Rajathithya",
    partner: true,
  },

  {
    name: "Rajajinagar",
    type: "Stop 2",
    detail: "Chulha Chauki da Dhaba",
    partner: true,
  },

  {
    name: "Indiranagar",
    type: "Destination",
    detail: "Finish your food trail",
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
    // badge: "2 seats left",
  },

  {
    type: "Food Walk",
    icon: Footprints,
    title: "Rajajinagar → Malleshwaram",
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
    // badge: "2 seats left",
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

      console.warn(
        "Kindli AI service unavailable:",
        error
      );

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
     HERO ROTATION
  ========================================================= */

  const [
    activeHeroExperience,
    setActiveHeroExperience,
  ] = useState(0);


  useEffect(
    () => {

      const interval =
        window.setInterval(
          () => {

            setActiveHeroExperience(
              current =>
                (
                  current + 1
                ) %
                HERO_EXPERIENCES.length
            );

          },
          4500
        );


      return () =>
        window.clearInterval(
          interval
        );

    },
    []
  );


  const heroExperience =
    HERO_EXPERIENCES[
      activeHeroExperience
    ];


  const HeroExperienceIcon =
    heroExperience.icon;


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
  ] = useState(true);

  const [
    storyVideoError,
    setStoryVideoError,
  ] = useState("");


  useEffect(
    () => {

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


          console.log(
            "FoodKindl homepage video endpoint:",
            endpoint
          );


          // ====================================================
          // FETCH
          // ====================================================

          const response =
            await fetch(
              `${endpoint}?t=${Date.now()}`,
              {
                method: "GET",

                headers: {
                  Accept:
                    "application/json",
                },

                cache:
                  "no-store",
              }
            );


          console.log(
            "Homepage video HTTP status:",
            response.status
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


          console.log(
            "Homepage video API data:",
            data
          );


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


            console.log(
              "Homepage video URL:",
              cleanVideoUrl
            );


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

            console.warn(
              "Homepage video unavailable from API:",
              data
            );


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
    []
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

        <div className="fk-hero-glow fk-hero-glow-one" />

        <div className="fk-hero-glow fk-hero-glow-two" />


        <div className="fk-hero-inner">


          {/* LEFT */}

          <div className="fk-hero-copy">

            <div className="fk-status-pill">

              <span />

              Platform now live

            </div>


            <h1>
              Meet people
              <br />
              through{" "}
              <span>
                food.
              </span>
            </h1>


            <p className="fk-hero-description">
              Discover people nearby, connect over food,
              cook together, dine out, explore Food Walks,
              and turn shared meals into meaningful connections.
            </p>

            <div className="fk-hero-actions">

                                <Link
                    className="fk-primary-button"
                    to={
                      user
                        ? "/connect-dashboard"
                        : "/login"
                    }
                  >
                    Explore FoodKindl Connect

                    <ArrowRight size={18} />
                  </Link>


              <a
                className="fk-secondary-button"
                href="#how-it-works"
              >
                See how it works
              </a>

            </div>


            <div className="fk-hero-proof">

              <div className="fk-avatar-stack">
                <span>AK</span>
                <span>MN</span>
                <span>RJ</span>
              </div>


              <div>
                <strong>
                  Food-first social discovery
                </strong>

                <small>
                  Nearby people · verified profiles · real food moments
                </small>
              </div>

            </div>

          </div>


          {/* RIGHT — INTERACTIVE MINI PRODUCT */}

          <div className="fk-hero-demo">

            <div className="fk-demo-top">

              <div className="fk-live-label">

                <span className="fk-live-dot" />

                Live FoodKindl experience

              </div>


              <span className="fk-distance-chip">

                <MapPin
                  size={13}
                />

                {
                  heroExperience
                    .member
                    .distance
                }

              </span>

            </div>


            <div className="fk-demo-tabs">

              {
                HERO_EXPERIENCES.map(
                  (
                    experience,
                    index
                  ) => {

                    const Icon =
                      experience.icon;


                    return (

                      <button
                        key={
                          experience.id
                        }
                        type="button"
                        className={
                          index ===
                          activeHeroExperience
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setActiveHeroExperience(
                            index
                          )
                        }
                      >

                        <Icon
                          size={15}
                        />

                        {
                          experience.label
                        }

                      </button>

                    );
                  }
                )
              }

            </div>


            <div className="fk-profile-preview">

              <div className="fk-profile-avatar">

                {
                  heroExperience
                    .member
                    .image
                    ? (

                      <img
                        src={
                          heroExperience
                            .member
                            .image
                        }
                        alt={
                          heroExperience
                            .member
                            .name
                        }
                      />

                    )
                    : (

                      <span>
                        {
                          heroExperience
                            .member
                            .initials
                        }
                      </span>
                    )
                }

              </div>


              <div className="fk-profile-copy">

                <strong>
                  {
                    heroExperience
                      .member
                      .name
                  }
                </strong>


                <span>

                  <MapPin
                    size={12}
                  />

                  {
                    heroExperience
                      .member
                      .locality
                  }

                  <em>•</em>

                  {
                    heroExperience
                      .member
                      .distance
                  }

                </span>

              </div>


              <span className="fk-verified-pill">

                <Check
                  size={11}
                />

                Verified

              </span>

            </div>


            <div className="fk-experience-preview">

              <div className="fk-experience-icon">

                <HeroExperienceIcon
                  size={22}
                />

              </div>


              <div>

                <span className="fk-demo-eyebrow">
                  {
                    heroExperience.label
                  }
                </span>


                <h3>
                  {
                    heroExperience.title
                  }
                </h3>


                <p>
                  {
                    heroExperience
                      .description
                  }
                </p>

              </div>

            </div>


            <div className="fk-cuisine-chips">

              {
                heroExperience.tags.map(
                  tag => (

                    <span key={tag}>
                      {tag}
                    </span>

                  )
                )
              }

            </div>


            <div className="fk-demo-meta">

              <span>

                {
                  heroExperience.id ===
                    "walk"
                    ? (
                      <Footprints
                        size={14}
                      />
                    )
                    : (
                      <CalendarDays
                        size={14}
                      />
                    )
                }

                {
                  heroExperience.meta
                }

              </span>


              <span className="fk-rating">

                <Star
                  size={13}
                  fill="currentColor"
                />

                4.8

              </span>

            </div>


            <Link
              className="fk-send-invite"
              to={
                user
                  ? "/food-invites"
                  : "/register"
              }
            >

              <Send
                size={16}
              />

              Send Food Invite

              <ArrowRight
                size={15}
              />

            </Link>

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
            Choose a starting point and destination.
            Discover FoodKindl partner restaurants
            along the way and create a multi-stop
            food experience with friends.
          </p>

        </div>


        <div className="fk-food-walk-shell">

          <div className="fk-food-walk-route">

            <div className="fk-food-walk-route-head">

              <div>

                <span>
                  LIVE ROUTE PREVIEW
                </span>

                <strong>
                  Nagasandra → Indiranagar
                </strong>

              </div>


              <div className="fk-route-distance">

                <Footprints
                  size={16}
                />

                17.3 km Food Trail

              </div>

            </div>


            <div className="fk-route-line">

              {
                FOOD_WALK_STOPS.map(
                  (
                    stop,
                    index
                  ) => (

                    <div
                      className="fk-route-stop"
                      key={
                        stop.name
                      }
                    >

                      <div
                        className={
                          stop.partner
                            ? "fk-route-dot partner"
                            : "fk-route-dot"
                        }
                      >
                        {
                          index + 1
                        }
                      </div>


                      <div className="fk-route-stop-copy">

                        <span>
                          {
                            stop.type
                          }
                        </span>

                        <strong>
                          {
                            stop.name
                          }
                        </strong>

                        <small>
                          {
                            stop.detail
                          }
                        </small>


                        {
                          stop.partner &&
                          (

                            <em>

                              <Check
                                size={10}
                              />

                              FoodKindl Partner

                            </em>

                          )
                        }

                      </div>


                      {
                        index <
                        FOOD_WALK_STOPS.length -
                        1 &&
                        (
                          <div className="fk-route-connector" />
                        )
                      }

                    </div>

                  )
                )
              }

            </div>

          </div>


          <div className="fk-food-walk-side">

            <div className="fk-food-walk-side-icon">

              <MapPin
                size={24}
              />

            </div>


            <span>
              ROUTE-BASED DISCOVERY
            </span>


            <h3>
              Find food along the way.
            </h3>


            <p>
              FoodKindl uses restaurant location data
              to surface partner places close to your route,
              so the journey itself becomes part of the meal.
            </p>


            <div className="fk-food-walk-benefits">

              <span>
                <Check size={13} />
                Partner restaurants first
              </span>

              <span>
                <Check size={13} />
                Choose 2–5 stops
              </span>

              <span>
                <Check size={13} />
                Invite your connections
              </span>

            </div>


            <Link
              to={
                user
                  ? "/food-invites"
                  : "/register"
              }
              className="fk-text-link"
            >
              Build your Food Walk

              <ArrowRight
                size={16}
              />
            </Link>

          </div>

        </div>

      </section>


      {/* =====================================================
          HOW IT WORKS — VISUAL
      ====================================================== */}

      <section
        className="fk-section"
        id="how-it-works"
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
              src="/images/food11.png"
              alt="FoodKindl AI recipes"
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
              src="/images/food22.png"
              alt="FoodKindl community food videos"
            />

            <div className="fk-ecosystem-overlay" />


            <div className="fk-ecosystem-content">

              <span className="fk-ecosystem-icon">
                <Play size={22} />
              </span>


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

      <section className="fk-section fk-story-section">

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

          {storyVideoLoading ? (

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

              preload="metadata"

              src={
                storyVideo.video_url
              }

              poster={
                storyVideo.poster_url ||
                undefined
              }

              onLoadStart={() => {

                console.log(
                  "Homepage video loading:",
                  storyVideo.video_url
                );

              }}

              onLoadedMetadata={
                event => {

                  console.log(
                    "Homepage video metadata loaded:",
                    {
                      url:
                        storyVideo.video_url,

                      duration:
                        event.currentTarget
                          .duration,

                      width:
                        event.currentTarget
                          .videoWidth,

                      height:
                        event.currentTarget
                          .videoHeight,
                    }
                  );

                }
              }

              onCanPlay={() => {

                console.log(
                  "Homepage video ready to play."
                );

              }}

              onError={
                event => {

                  const mediaError =
                    event.currentTarget.error;


                  console.error(
                    "Homepage video browser error:",
                    {
                      url:
                        storyVideo.video_url,

                      code:
                        mediaError?.code,

                      message:
                        mediaError?.message,
                    }
                  );

                }
              }

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
        src="/images/icon.png"
        alt="FoodKindl"
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
                src="/images/kindliicon.png"
                alt="Kindli"
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
                    src="/images/kindliicon.png"
                    alt="Kindli"
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
                              src="/images/kindliicon.png"
                              alt=""
                              aria-hidden="true"
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
                        src="/images/kindli-icon.png"
                        alt=""
                        aria-hidden="true"
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


    </main>

  );
}