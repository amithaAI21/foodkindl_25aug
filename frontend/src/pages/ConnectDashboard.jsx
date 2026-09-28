import { useEffect, useMemo, useState } from "react";

import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Home,
  MapPin,
  Search,
  Sparkles,
  UserCheck,
  UserPlus,
  UsersRound,
  Utensils,
  X,
  ChefHat,
  Footprints,
  ShieldAlert,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import api from "../api";
import { useAuth } from "../context/AuthContext";

import "../styles/connect_dashboard.css";


/* =========================================================
   CONNECT DASHBOARD
========================================================= */

export default function ConnectDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  /* =======================================================
     STATE
  ======================================================= */

  const [members, setMembers] = useState([]);
  const [foodMatches, setFoodMatches] = useState([]);

  const [incomingRequests, setIncomingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [connections, setConnections] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /* =======================================================
     API BASE
  ======================================================= */

  const API_BASE = (
    import.meta.env.VITE_BACKEND_URL ||
    "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");

  /* =======================================================
     MEDIA
  ======================================================= */

  function getMediaUrl(path) {
    if (!path) return "";

    if (
      path.startsWith("http://") ||
      path.startsWith("https://") ||
      path.startsWith("blob:")
    ) {
      return path;
    }

    if (path.startsWith("/.netlify/")) {
      return `${window.location.origin}${path}`;
    }

    const normalizedPath = path.startsWith("/")
      ? path
      : `/${path}`;

    return `${API_BASE}${normalizedPath}`;
  }

  /* =======================================================
     MEMBER HELPERS
  ======================================================= */

  function getMemberName(member) {
    return (
      member?.full_name ||
      [member?.first_name, member?.last_name]
        .filter(Boolean)
        .join(" ") ||
      member?.username ||
      member?.email ||
      "FoodKindl Member"
    );
  }

  function getMemberInitial(member) {
    return getMemberName(member)
      .charAt(0)
      .toUpperCase();
  }

  function getMemberPhoto(member) {
    return getMediaUrl(
      member?.profile?.profile_image_1_url ||
        member?.profile?.profile_image_1 ||
        member?.profile_image_1_url ||
        member?.profile_image_1 ||
        ""
    );
  }

  function getLocation(member) {
    const profile = member?.profile || {};

    return [
      profile.locality,
      profile.city,
    ]
      .filter(Boolean)
      .join(", ");
  }

  function getDiet(member) {
    const value =
      member?.profile?.dietary_preference || "";

    if (!value) return "";

    return String(value)
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (char) => char.toUpperCase()
      );
  }

  function getOtherMember(connection) {
    if (
      Number(connection?.sender?.id) ===
      Number(user?.id)
    ) {
      return connection?.receiver;
    }

    return connection?.sender;
  }

  /* =======================================================
     CURRENT USER
  ======================================================= */

  const currentUserName = useMemo(() => {
    return (
      user?.full_name ||
      [user?.first_name, user?.last_name]
        .filter(Boolean)
        .join(" ") ||
      user?.username ||
      "FoodKindl Member"
    );
  }, [user]);

  const currentUserPhoto = useMemo(() => {
    return getMediaUrl(
      user?.profile?.profile_image_1_url ||
        user?.profile?.profile_image_1 ||
        user?.profile_image_1_url ||
        user?.profile_image_1 ||
        ""
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const currentUserRole =
    user?.profile?.role ||
    "Food Explorer";

  const currentUserLocation = [
    user?.profile?.locality,
    user?.profile?.city,
  ]
    .filter(Boolean)
    .join(", ");

  /* =======================================================
     FOOD MATCH HELPERS
  ======================================================= */

  function getFoodMatchMemberIds(match) {
    return [
      match?.id,
      match?.user_id,
      match?.member_id,
      match?.user?.id,
      match?.member?.id,
      match?.profile?.user_id,
      match?.profile?.user?.id,
    ]
      .filter(
        (value) =>
          value !== undefined &&
          value !== null &&
          value !== ""
      )
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value));
  }

  function getFoodMatch(memberId) {
    const id = Number(memberId);

    if (Number.isNaN(id)) {
      return null;
    }

    return (
      foodMatches.find((match) =>
        getFoodMatchMemberIds(match).includes(id)
      ) || null
    );
  }

  function getFoodMatchScore(match) {
    if (!match) return null;

    const rawScore =
      match?.food_match ??
      match?.match_score ??
      match?.score ??
      match?.percentage ??
      match?.match_percentage ??
      null;

    if (
      rawScore === null ||
      rawScore === undefined ||
      rawScore === ""
    ) {
      return null;
    }

    const score = Number(rawScore);

    if (Number.isNaN(score)) {
      return null;
    }

    return Math.max(
      0,
      Math.min(Math.round(score), 100)
    );
  }

  /* =======================================================
     CONNECTION STATE
  ======================================================= */

  function getMemberConnectionState(member) {
    const memberId = Number(member?.id);

    const accepted = connections.find(
      (connection) => {
        const senderId =
          Number(connection?.sender?.id);

        const receiverId =
          Number(connection?.receiver?.id);

        return (
          senderId === memberId ||
          receiverId === memberId
        );
      }
    );

    if (accepted) {
      return {
        status: "connected",
        connectionId: accepted.id,
      };
    }

    const sent = sentRequests.find(
      (connection) =>
        Number(connection?.receiver?.id) ===
        memberId
    );

    if (sent) {
      return {
        status: "request_sent",
        connectionId: sent.id,
      };
    }

    const incoming = incomingRequests.find(
      (connection) =>
        Number(connection?.sender?.id) ===
        memberId
    );

    if (incoming) {
      return {
        status: "request_received",
        connectionId: incoming.id,
      };
    }

    const apiStatus =
      member?.connection_status;

    if (
      apiStatus === "connected" ||
      apiStatus === "request_sent" ||
      apiStatus === "request_received"
    ) {
      return {
        status: apiStatus,
        connectionId:
          member?.connection_id || null,
      };
    }

    return {
      status: "none",
      connectionId: null,
    };
  }

  /* =======================================================
     LOAD MEMBERS
  ======================================================= */

  async function loadMembers() {
    try {
      const response =
        await api.get("/members/");

      const result =
        response.data?.results ||
        response.data ||
        [];

      const list =
        Array.isArray(result)
          ? result
          : [];

      const memberOnly =
        list.filter((member) => {
          const accountType =
            member?.profile?.account_type ||
            member?.account_type;

          return accountType !== "partner";
        });

      setMembers(memberOnly);
    } catch (requestError) {
      console.error(
        "Unable to load members:",
        requestError
      );

      setError(
        requestError?.response?.data?.detail ||
          "Registered members could not be loaded."
      );
    }
  }

  /* =======================================================
     LOAD FOOD MATCHES
  ======================================================= */

  async function loadFoodMatches() {
    try {
      const response =
        await api.get(
          "/auth/food-matches/"
        );

      const result =
        response.data?.results ||
        response.data ||
        [];

      setFoodMatches(
        Array.isArray(result)
          ? result
          : []
      );
    } catch (requestError) {
      console.error(
        "Food match error:",
        requestError
      );

      setFoodMatches([]);
    }
  }

  /* =======================================================
     LOAD CONNECTIONS
  ======================================================= */

  async function loadConnections() {
    try {
      const [
        incomingResponse,
        sentResponse,
        acceptedResponse,
      ] = await Promise.all([
        api.get(
          "/connections/incoming/"
        ),
        api.get(
          "/connections/sent/"
        ),
        api.get(
          "/connections/accepted/"
        ),
      ]);

      const incoming =
        incomingResponse.data?.results ||
        incomingResponse.data ||
        [];

      const sent =
        sentResponse.data?.results ||
        sentResponse.data ||
        [];

      const accepted =
        acceptedResponse.data?.results ||
        acceptedResponse.data ||
        [];

      setIncomingRequests(
        Array.isArray(incoming)
          ? incoming
          : []
      );

      setSentRequests(
        Array.isArray(sent)
          ? sent
          : []
      );

      setConnections(
        Array.isArray(accepted)
          ? accepted.filter(
              (connection) => {
                const other =
                  Number(
                    connection
                      ?.sender
                      ?.id
                  ) ===
                  Number(user?.id)
                    ? connection
                        ?.receiver
                    : connection
                        ?.sender;

                const type =
                  other
                    ?.profile
                    ?.account_type ||
                  other
                    ?.account_type;

                return type !== "partner";
              }
            )
          : []
      );
    } catch (requestError) {
      console.error(
        "Connection loading error:",
        requestError
      );

      setError(
        "Connection details could not be loaded."
      );
    }
  }

  /* =======================================================
     LOAD PAGE
  ======================================================= */

  async function loadPage() {
    setLoading(true);
    setError("");

    await Promise.all([
      loadMembers(),
      loadFoodMatches(),
      loadConnections(),
    ]);

    setLoading(false);
  }

  useEffect(() => {
    loadPage();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =======================================================
     CONNECTION ACTIONS
  ======================================================= */

  function getErrorMessage(data) {
    if (!data) {
      return "The request could not be completed.";
    }

    if (typeof data === "string") {
      return data;
    }

    return (
      data?.receiver_id?.[0] ||
      data?.non_field_errors?.[0] ||
      data?.detail ||
      data?.message ||
      "The request could not be completed."
    );
  }

  async function sendRequest(memberId) {
    try {
      setError("");
      setMessage("");

      await api.post(
        "/connections/",
        {
          receiver_id: memberId,
        }
      );

      setMessage(
        "Connection request sent."
      );

      await Promise.all([
        loadMembers(),
        loadFoodMatches(),
        loadConnections(),
      ]);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError
            ?.response
            ?.data
        )
      );
    }
  }

  async function acceptRequest(
    connectionId
  ) {
    try {
      setError("");
      setMessage("");

      await api.post(
        `/connections/${connectionId}/accept/`
      );

      setMessage(
        "Connection request accepted."
      );

      await loadPage();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError
            ?.response
            ?.data
        )
      );
    }
  }

  async function declineRequest(
    connectionId
  ) {
    try {
      setError("");
      setMessage("");

      await api.post(
        `/connections/${connectionId}/decline/`
      );

      setMessage(
        "Connection request declined."
      );

      await loadPage();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError
            ?.response
            ?.data
        )
      );
    }
  }

  async function cancelRequest(
    connectionId
  ) {
    if (!connectionId) return;

    try {
      setError("");
      setMessage("");

      await api.post(
        `/connections/${connectionId}/cancel/`
      );

      setMessage(
        "Connection request cancelled."
      );

      await loadPage();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError
            ?.response
            ?.data
        )
      );
    }
  }

  /* =======================================================
     BEST MATCHES
  ======================================================= */

  const bestMatches = useMemo(() => {
    return [...members]
      .filter(
        (member) =>
          Number(member?.id) !==
          Number(user?.id)
      )
      .map((member) => ({
        member,

        score:
          getFoodMatchScore(
            getFoodMatch(member.id)
          ) || 0,
      }))
      .sort(
        (a, b) =>
          b.score - a.score
      )
      .slice(0, 6);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    members,
    foodMatches,
    user,
  ]);

  /* =======================================================
     GREETING
  ======================================================= */

  function getGreeting() {
    const hour =
      new Date().getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 17) {
      return "Good afternoon";
    }

    return "Good evening";
  }

  /* =======================================================
     AVATAR
  ======================================================= */

  function Avatar({
    member,
    className = "",
  }) {
    const photo =
      getMemberPhoto(member);

    if (photo) {
      return (
        <img
          src={photo}
          alt={getMemberName(member)}
          className={`cd-avatar ${className}`}
        />
      );
    }

    return (
      <div
        className={`cd-avatar cd-avatar-placeholder ${className}`}
      >
        {getMemberInitial(member)}
      </div>
    );
  }

  /* =======================================================
     MEMBER ACTION
  ======================================================= */

  function MemberAction({
    member,
  }) {
    const {
      status,
      connectionId,
    } =
      getMemberConnectionState(
        member
      );

    if (status === "connected") {
      return (
        <Link
          to={`/connect/member/${member.id}`}
          className="cd-person-action connected"
        >
          <UserCheck size={15} />
          Connected
        </Link>
      );
    }

    if (status === "request_sent") {
      return (
        <button
          type="button"
          className="cd-person-action pending"
          onClick={() =>
            cancelRequest(
              connectionId
            )
          }
        >
          <Clock3 size={15} />
          Requested
        </button>
      );
    }

    if (
      status ===
      "request_received"
    ) {
      return (
        <button
          type="button"
          className="cd-person-action"
          onClick={() =>
            acceptRequest(
              connectionId
            )
          }
        >
          <Check size={15} />
          Accept
        </button>
      );
    }

    return (
      <button
        type="button"
        className="cd-person-action"
        onClick={() =>
          sendRequest(member.id)
        }
      >
        <UserPlus size={15} />
        Connect
      </button>
    );
  }

  /* =======================================================
     MEMBER CARD
  ======================================================= */

  function PersonCard({
    member,
  }) {
    const profile =
      member?.profile || {};

    const score =
      getFoodMatchScore(
        getFoodMatch(
          member.id
        )
      );

    return (
      <article className="cd-person-card">

        <Link
          to={`/connect/member/${member.id}`}
          className="cd-person-main"
        >

          <div className="cd-person-avatar-wrap">

            <Avatar
              member={member}
              className="cd-person-avatar"
            />

            {score !== null && (
              <span className="cd-match-score">
                {score}%
              </span>
            )}

          </div>

          <div className="cd-person-copy">

            <h3>
              {getMemberName(member)}
            </h3>

            {profile.role && (
              <p className="cd-person-role">
                {profile.role}
              </p>
            )}

            <div className="cd-person-meta">

              {getLocation(member) && (
                <span>
                  <MapPin size={13} />
                  {getLocation(member)}
                </span>
              )}

              {getDiet(member) && (
                <span>
                  <Utensils size={13} />
                  {getDiet(member)}
                </span>
              )}

            </div>

          </div>

        </Link>

        <MemberAction
          member={member}
        />

      </article>
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="cd-loading-page">

        <div className="cd-loader">
          🍜
        </div>

        <h2>
          Finding your food people
        </h2>

        <p>
          Building your FoodKindl dashboard...
        </p>

      </main>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="cd-app">

      <div className="cd-dashboard">

        {/* =================================================
            LEFT SIDEBAR
        ================================================= */}

        <aside className="cd-left-sidebar">

          <nav className="cd-side-nav">

            <Link to="/">
              <Home size={19} />
              <span>Home</span>
            </Link>

            <Link
              to="/discover"
              className="active"
            >
              <Search size={19} />
              <span>Discover</span>
            </Link>

            <Link to="/ai-kitchen">
              <Sparkles size={19} />
              <span>AI Kitchen</span>
            </Link>

            <Link to="/food-invites">
              <ChefHat size={19} />
              <span>Food Invites</span>
            </Link>

            <Link to="/notifications">
              <Bell size={19} />

              <span>
                Notifications
              </span>

              {incomingRequests.length > 0 && (
                <span className="cd-side-count">
                  {incomingRequests.length}
                </span>
              )}
            </Link>

            <Link to="/food-invites#my-plans">
              <CalendarDays size={19} />
              <span>My Plans</span>
            </Link>

            <Link
              to="/sos-safety"
              className="cd-sos-nav"
            >
              <ShieldAlert size={19} />
              <span>SOS Alert</span>
            </Link>

            <Link to="/profile">
              <CircleUserRound size={19} />
              <span>Profile</span>
            </Link>

          </nav>

        </aside>

        {/* =================================================
            CENTER
        ================================================= */}

        <main className="cd-main">

          {message && (
            <div className="cd-alert success">
              <Check size={17} />
              {message}
            </div>
          )}

          {error && (
            <div className="cd-alert error">
              <X size={17} />
              {error}
            </div>
          )}

          {/* HERO */}

          <section className="cd-hero">

            <div className="cd-hero-overlay" />

            <div className="cd-hero-content">

              <span className="cd-hero-eyebrow">
                {getGreeting()},
              </span>

              <h1>
                {currentUserName.split(" ")[0]}{" "}
                <span>👋</span>
              </h1>

              <h2>
                How do you want to experience food today?
              </h2>

              <p>
                Cook, share, explore and meet amazing people
                through food.
              </p>

              <div className="cd-experience-grid">

                <button
                  type="button"
                  onClick={() =>
                    navigate("/cook-together")
                  }
                >
                  <span className="cd-experience-icon">
                    🍲
                  </span>

                  <span>
                    <strong>
                      Cook Together
                    </strong>

                    <small>
                      Host or join home cooking experiences
                    </small>
                  </span>

                  <ChevronRight size={20} />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/dine-out")
                  }
                >
                  <span className="cd-experience-icon">
                    🍴
                  </span>

                  <span>
                    <strong>
                      Dine Out
                    </strong>

                    <small>
                      Find food lovers to dine out together
                    </small>
                  </span>

                  <ChevronRight size={20} />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/food-walk")
                  }
                >
                  <span className="cd-experience-icon">
                    <Footprints />
                  </span>

                  <span>
                    <strong>
                      Plan a Food Walk
                    </strong>

                    <small>
                      Explore local food spots with people
                    </small>
                  </span>

                  <ChevronRight size={20} />
                </button>

              </div>

            </div>

          </section>

          {/* STATS */}

          <section className="cd-stat-row">

            <div>
              <UsersRound />

              <span>
                <strong>
                  {connections.length}
                </strong>
                Connections
              </span>
            </div>

            <div>
              <UserPlus />

              <span>
                <strong>
                  {incomingRequests.length}
                </strong>
                New requests
              </span>
            </div>

            <div>
              <Sparkles />

              <span>
                <strong>
                  {members.length}
                </strong>
                FoodKindl members
              </span>
            </div>

          </section>

          {/* =================================================
              DISCOVER PEOPLE
          ================================================= */}

          <section className="cd-section">

            <div className="cd-section-title">

              <div>

                <span className="cd-section-icon">
                  <Sparkles size={20} />
                </span>

                <div>
                  <h2>
                    Discover people
                  </h2>

                  <p>
                    People who match your food interests
                  </p>
                </div>

              </div>

              <Link to="/discover">
                Explore
                <ChevronRight size={15} />
              </Link>

            </div>

            {bestMatches.length > 0 ? (
              <div className="cd-people-grid">

                {bestMatches.map(
                  ({ member }) => (
                    <PersonCard
                      key={member.id}
                      member={member}
                    />
                  )
                )}

              </div>
            ) : (
              <div className="cd-empty-small">

                <UsersRound size={27} />

                <div>
                  <strong>
                    No people found yet
                  </strong>

                  <p>
                    New FoodKindl members will appear here.
                  </p>
                </div>

              </div>
            )}

          </section>

          {/* =================================================
              FOODKINDL CIRCLE
          ================================================= */}

          <section className="cd-section">

            <div className="cd-section-title">

              <div>

                <span className="cd-section-icon">
                  <UsersRound size={20} />
                </span>

                <div>
                  <h2>
                    Your FoodKindl circle
                  </h2>

                  <p>
                    People you've connected with
                  </p>
                </div>

              </div>

              <Link to="/connections">
                View All
                <ChevronRight size={15} />
              </Link>

            </div>

            {connections.length > 0 ? (

              <div className="cd-circle-grid">

                {connections
                  .slice(0, 6)
                  .map((connection) => {

                    const member =
                      getOtherMember(connection);

                    if (!member) {
                      return null;
                    }

                    return (
                      <Link
                        key={connection.id}
                        to={`/connect/member/${member.id}`}
                        className="cd-circle-card"
                      >

                        <Avatar
                          member={member}
                        />

                        <div>
                          <strong>
                            {getMemberName(member)}
                          </strong>

                          <span>
                            {getLocation(member) ||
                              "FoodKindl member"}
                          </span>
                        </div>

                        <ChevronRight size={17} />

                      </Link>
                    );
                  })}

              </div>

            ) : (

              <div className="cd-empty-small">

                <UsersRound size={27} />

                <div>
                  <strong>
                    Build your circle
                  </strong>

                  <p>
                    Discover people and start connecting.
                  </p>
                </div>

              </div>

            )}

          </section>

        </main>

        {/* =================================================
            RIGHT SIDEBAR
        ================================================= */}

        <aside className="cd-right-sidebar">

          {/* PROFILE */}

          <section className="cd-right-card cd-profile-card">

            <div className="cd-profile-header">

              {currentUserPhoto ? (
                <img
                  src={currentUserPhoto}
                  alt={currentUserName}
                />
              ) : (
                <div className="cd-profile-placeholder">
                  {currentUserName
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}

              <div>

                <h3>
                  {currentUserName}
                </h3>

                <p>
                  {currentUserRole}
                </p>

                {currentUserLocation && (
                  <span>
                    <MapPin size={12} />
                    {currentUserLocation}
                  </span>
                )}

              </div>

            </div>

            <div className="cd-profile-stats">

              <Link to="/connections">

                <UsersRound size={20} />

                <span>
                  <strong>
                    {connections.length}
                  </strong>

                  Connections
                </span>

              </Link>

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("cd-requests")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
              >

                <UserPlus size={20} />

                <span>
                  <strong>
                    {incomingRequests.length}
                  </strong>

                  Requests
                </span>

              </button>

            </div>

          </section>

          {/* REQUESTS */}

          <section
            id="cd-requests"
            className="cd-right-card"
          >

            <div className="cd-right-title">

              <div>
                <UserPlus size={18} />

                <h3>
                  Recent Requests
                </h3>
              </div>

              <Link to="/connections">
                View All
              </Link>

            </div>

            {incomingRequests.length > 0 ? (

              <div className="cd-request-list">

                {incomingRequests
                  .slice(0, 4)
                  .map((connection) => {

                    const member =
                      connection?.sender;

                    if (!member) {
                      return null;
                    }

                    return (
                      <article
                        key={connection.id}
                        className="cd-request-item"
                      >

                        <Avatar
                          member={member}
                        />

                        <div className="cd-request-copy">

                          <Link
                            to={`/connect/member/${member.id}`}
                          >
                            {getMemberName(member)}
                          </Link>

                          <span>
                            {getLocation(member) ||
                              "FoodKindl member"}
                          </span>

                        </div>

                        <div className="cd-request-buttons">

                          <button
                            type="button"
                            className="accept"
                            aria-label={`Accept ${getMemberName(member)}`}
                            onClick={() =>
                              acceptRequest(
                                connection.id
                              )
                            }
                          >
                            <Check size={14} />
                          </button>

                          <button
                            type="button"
                            aria-label={`Decline ${getMemberName(member)}`}
                            onClick={() =>
                              declineRequest(
                                connection.id
                              )
                            }
                          >
                            <X size={14} />
                          </button>

                        </div>

                      </article>
                    );
                  })}

              </div>

            ) : (

              <div className="cd-right-empty">

                <UserPlus size={26} />

                <strong>
                  No new requests
                </strong>

                <span>
                  New connection requests will appear here.
                </span>

              </div>

            )}

          </section>

          {/* FOODKINDL AROUND YOU */}

          <section className="cd-right-card">

            <div className="cd-right-title">

              <div>
                <MapPin size={18} />

                <h3>
                  FoodKindl around you
                </h3>
              </div>

            </div>

            <button
              type="button"
              className="cd-around-item"
              onClick={() =>
                navigate("/cook-together")
              }
            >

              <span className="cd-around-icon">
                🍲
              </span>

              <div>
                <strong>
                  Cook Together
                </strong>

                <span>
                  Discover cooking experiences
                </span>
              </div>

              <ChevronRight size={17} />

            </button>

            <button
              type="button"
              className="cd-around-item"
              onClick={() =>
                navigate("/dine-out")
              }
            >

              <span className="cd-around-icon">
                🍴
              </span>

              <div>
                <strong>
                  Dine Out
                </strong>

                <span>
                  Meet people over a meal
                </span>
              </div>

              <ChevronRight size={17} />

            </button>

            <button
              type="button"
              className="cd-around-item"
              onClick={() =>
                navigate("/food-walk")
              }
            >

              <span className="cd-around-icon">
                🚶
              </span>

              <div>
                <strong>
                  Food Walk
                </strong>

                <span>
                  Explore food along your route
                </span>
              </div>

              <ChevronRight size={17} />

            </button>

          </section>

        </aside>

      </div>

    </div>
  );
}