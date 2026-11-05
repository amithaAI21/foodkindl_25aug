import {

  useEffect,

  useMemo,

  useState,

} from "react";

import {

  BriefcaseBusiness,

  Check,

  ChevronDown,

  Clock3,

  MapPin,

  RefreshCw,

  SlidersHorizontal,

  Sparkles,

  UserCheck,

  UserMinus,

  UserPlus,

  UsersRound,

  Utensils,

  X,

} from "lucide-react";

import { Link, useSearchParams } from "react-router-dom";

import api from "../api";

import { useAuth } from "../context/AuthContext";

import "../styles/Connect.css";

/* =========================================================

   OPTIONS

\========================================================= */

const FOOD_OPTIONS = [

  "All",

  "Vegetarian",

  "Non Vegetarian",

  "Vegan",

  "Eggetarian",

];

const LOCATION_OPTIONS = [

  "All",

  "Bengaluru",

  "Mumbai",

  "Delhi",

  "Hyderabad",

  "Chennai",

  "Pune",

  "Kochi",

];

function normalizeMatchText(value) {

  return String(value ?? "")

    .trim()

    .toLowerCase()

    .replaceAll("_", " ")

    .replace(/\s+/g, " ")

    .replace(/\bbangalore\b/g, "bengaluru");

}

function getCuisineList(value) {

  const items = Array.isArray(value)

    ? value

    : String(value ?? "").split(/[,;]/);

  return [...new Set(items.map(normalizeMatchText).filter(Boolean))];

}

function calculateFoodMatch(myProfile, otherProfile) {

  if (!myProfile || !otherProfile) return null;

  const reasons = [];

  let score = 0;

  let hasComparableData = false;

  const mine = new Set(getCuisineList(myProfile.favorite_cuisines));

  const theirs = new Set(getCuisineList(otherProfile.favorite_cuisines));

  if (mine.size && theirs.size) {

    hasComparableData = true;

    const common = [...mine].filter(cuisine => theirs.has(cuisine));

    const union = new Set([...mine, ...theirs]);

    score += Math.round((common.length / union.size) * 40);

    if (common.length) reasons.push(`Both enjoy ${common.slice(0, 3).join(", ")}`);

  }

  const exactMatch = (field, points, reason) => {

    const a = normalizeMatchText(myProfile[field]);

    const b = normalizeMatchText(otherProfile[field]);

    if (!a || !b) return;

    hasComparableData = true;

    if (a === b) {

      score += points;

      reasons.push(reason);

    }

  };

  exactMatch("dietary_preference", 25, "Same dietary preference");

  exactMatch("locality", 15, "Same locality");

  exactMatch("city", 10, "Same city");

  exactMatch("college_workplace", 5, "Same workplace");

  exactMatch("role", 5, "Same role");

  if (!hasComparableData) return null;

  return {

    food_match: Math.max(0, Math.min(100, score)),

    match_reasons: reasons,

  };

}

/* =========================================================

   MATCH LEVEL

\========================================================= */

function getMatchLevel(score) {

  const value = Number(score) || 0;

  if (value >= 80) {

    return {

      label: "Excellent Match",

      className: "excellent",

    };

  }

  if (value >= 60) {

    return {

      label: "Great Match",

      className: "great",

    };

  }

  if (value >= 40) {

    return {

      label: "Good Match",

      className: "good",

    };

  }

  return {

    label: "Potential Match",

    className: "potential",

  };

}

/* =========================================================

   CONNECT

\========================================================= */

export default function Connect({

  embedded = false,

}) {

const { user } = useAuth();

const [searchParams] = useSearchParams();

const requestedTab = searchParams.get("tab");

const validTabs = [

  "discover",

  "requests",

  "connections",

];

const initialTab = validTabs.includes(requestedTab)

  ? requestedTab

  : "discover";

const [activeTab, setActiveTab] = useState(initialTab);

// Update active tab when the URL changes

useEffect(() => {

  setActiveTab(initialTab);

}, [initialTab]);

  const [members, setMembers] =

    useState([]);

  const [

    incomingRequests,

    setIncomingRequests,

  ] = useState([]);

  const [

    sentRequests,

    setSentRequests,

  ] = useState([]);

  const [

    connections,

    setConnections,

  ] = useState([]);

  const [

    selectedFood,

    setSelectedFood,

  ] = useState("All");

  const [

    selectedLocation,

    setSelectedLocation,

  ] = useState("All");

  const [

    filtersOpen,

    setFiltersOpen,

  ] = useState(true);

  const [

    loading,

    setLoading,

  ] = useState(true);

  const [

    error,

    setError,

  ] = useState("");

  const [

    message,

    setMessage,

  ] = useState("");

  /* =========================================================

     API BASE

  ========================================================= */

  const API_BASE = (

    import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000"

  ).replace(/\/+$/, "");

  /* =========================================================

     MEDIA

  ========================================================= */

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

    return `${API_BASE}${path}`;

  }

  /* =========================================================

     MEMBER HELPERS

  ========================================================= */

  function getMemberName(member) {

    return (

      member?.full_name ||

      [

        member?.first_name,

        member?.last_name,

      ]

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

  function getOtherMember(connection) {

    if (

      Number(connection?.sender?.id) ===

      Number(user?.id)

    ) {

      return connection?.receiver;

    }

    return connection?.sender;

  }

  function getLocation(member) {

    const profile =

      member?.profile || {};

    return [

      profile.locality,

      profile.city,

    ]

      .filter(Boolean)

      .join(", ");

  }

  function getDiet(member) {

    const value =

      member?.profile

        ?.dietary_preference || "";

    if (!value) return "";

    return value

      .replaceAll("_", " ")

      .replace(/\b\w/g, char =>

        char.toUpperCase()

      );

  }

  /* =========================================================

     FOOD MATCH

  ========================================================= */

  /* =========================================================

     CONNECTION STATE

  ========================================================= */

  function getMemberConnectionState(

    member

  ) {

    const memberId =

      Number(member?.id);

    const accepted =

      connections.find(

        connection => {

          const senderId =

            Number(

              connection?.sender?.id

            );

          const receiverId =

            Number(

              connection?.receiver?.id

            );

          return (

            senderId === memberId ||

            receiverId === memberId

          );

        }

      );

    if (accepted) {

      return {

        status: "connected",

        connectionId:

          accepted.id,

      };

    }

    const sent =

      sentRequests.find(

        connection =>

          Number(

            connection

              ?.receiver

              ?.id

          ) === memberId

      );

    if (sent) {

      return {

        status: "request_sent",

        connectionId:

          sent.id,

      };

    }

    const incoming =

      incomingRequests.find(

        connection =>

          Number(

            connection

              ?.sender

              ?.id

          ) === memberId

      );

    if (incoming) {

      return {

        status:

          "request_received",

        connectionId:

          incoming.id,

      };

    }

    const apiStatus =

      member?.connection_status;

    if (

      apiStatus === "connected" ||

      apiStatus ===

        "request_sent" ||

      apiStatus ===

        "request_received"

    ) {

      return {

        status: apiStatus,

        connectionId:

          member?.connection_id ||

          null,

      };

    }

    return {

      status: "none",

      connectionId: null,

    };

  }

  /* =========================================================

     ERROR

  ========================================================= */

  function getErrorMessage(data) {

    if (!data) {

      return "The request could not be completed.";

    }

    if (

      typeof data === "string"

    ) {

      return data;

    }

    return (

      data?.receiver_id?.[0] ||

      data

        ?.non_field_errors?.[0] ||

      data?.detail ||

      data?.message ||

      "The request could not be completed."

    );

  }

  /* =========================================================

     LOAD MEMBERS

  ========================================================= */

  async function loadMembers() {

    try {

      const response =

        await api.get(

          "/members/"

        );

      const result =

        response.data?.results ||

        response.data ||

        [];

      const list =

        Array.isArray(result)

          ? result

          : [];

      const memberOnly =

        list.filter(member => {

          const accountType =

            member?.profile

              ?.account_type ||

            member?.account_type;

          return (

            accountType !==

            "partner"

          );

        });

      setMembers(memberOnly);

    } catch (requestError) {

      console.error(

        "Unable to load members:",

        requestError

      );

      setError(

        requestError

          ?.response

          ?.data

          ?.detail ||

          "Registered members could not be loaded."

      );

    }

  }

  /* =========================================================

     LOAD FOOD MATCHES

  ========================================================= */

  /* =========================================================

     LOAD CONNECTIONS

  ========================================================= */

  async function loadConnections() {

    try {

      const [

        incomingResponse,

        sentResponse,

        acceptedResponse,

      ] =

        await Promise.all([

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

        incomingResponse

          .data?.results ||

        incomingResponse.data ||

        [];

      const sent =

        sentResponse

          .data?.results ||

        sentResponse.data ||

        [];

      const accepted =

        acceptedResponse

          .data?.results ||

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

              connection => {

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

                return (

                  type !==

                  "partner"

                );

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

  /* =========================================================

     LOAD PAGE

  ========================================================= */

  async function loadPage() {

    setLoading(true);

    setError("");

    await Promise.all([

      loadMembers(),

      loadConnections(),

    ]);

    setLoading(false);

  }

  useEffect(() => {

    loadPage();

    // eslint-disable-next-line

  }, []);

  /* =========================================================

     RESET FILTERS

  ========================================================= */

  function resetFilters() {

    setSelectedFood("All");

    setSelectedLocation("All");

  }

  /* =========================================================

     FILTER

  ========================================================= */

  // Hide accepted connections in discovery and recommendations.
  const connectedMemberIds = useMemo(() => {
    const ids = new Set();
    const currentUserId = Number(user?.id);

    for (const connection of connections) {
      const senderId = Number(connection?.sender?.id);
      const receiverId = Number(connection?.receiver?.id);
      if (!Number.isFinite(currentUserId)) continue;
      if (senderId === currentUserId && Number.isFinite(receiverId)) {
        ids.add(receiverId);
      } else if (receiverId === currentUserId && Number.isFinite(senderId)) {
        ids.add(senderId);
      }
    }
    return ids;
  }, [connections, user?.id]);

  function isConnectedMember(member) {
    const memberId = Number(member?.id);
    return member?.connection_status === "connected" ||
      (Number.isFinite(memberId) && connectedMemberIds.has(memberId));
  }

  const filteredMembers = useMemo(() => {

  // ---------------------------------------------------------

  // NORMALIZE TEXT

  // ---------------------------------------------------------

  const normalizeText = (value = "") => {

    return String(value)

      .trim()

      .toLowerCase()

      .replaceAll("_", " ")

      .replace(/\s+/g, " ");

  };

  // ---------------------------------------------------------

  // NORMALIZE LOCATION

  // Bangalore and Bengaluru should be treated as same city

  // ---------------------------------------------------------

  const normalizeLocation = value => normalizeMatchText(value);

  return members.filter(member => {
    if (Number(member?.id) === Number(user?.id) || isConnectedMember(member)) {
      return false;
    }


    const profile =

      member?.profile || {};

    // -------------------------------------------------------

    // FOOD

    // -------------------------------------------------------

    const food = normalizeText(

      profile.dietary_preference || ""

    );

    // -------------------------------------------------------

    // LOCATION

    // -------------------------------------------------------

    const rawLocation = [

      profile.locality,

      profile.city,

      profile.state,

      profile.postcode,

    ]

      .filter(Boolean)

      .join(" ");

    const location =

      normalizeLocation(rawLocation);

    // -------------------------------------------------------

    // FOOD FILTER

    // -------------------------------------------------------

    const foodPass =

      selectedFood === "All" ||

      food.includes(

        normalizeText(selectedFood)

      );

    // -------------------------------------------------------

    // LOCATION FILTER

    // -------------------------------------------------------

    const locationPass =

      selectedLocation === "All" ||

      location.includes(

        normalizeLocation(

          selectedLocation

        )

      );

    return (

      foodPass &&

      locationPass

    );

  });

}, [members, connectedMemberIds, user?.id, selectedFood, selectedLocation]);

  /* =========================================================

     BEST MATCHES

  ========================================================= */

  const bestMatches = useMemo(() => {
    const myProfile = user?.profile;
    if (!myProfile) return [];

    return members
      .filter(member =>
        Number(member?.id) !== Number(user?.id) &&
        member?.connection_status !== "connected" &&
        !connectedMemberIds.has(Number(member?.id))
      )
      .map(member => ({
        member,
        score: calculateFoodMatch(myProfile, member?.profile)?.food_match ?? null,
      }))
      .filter(item => item.score !== null && item.score >= 60)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [members, connectedMemberIds, user?.id, user?.profile]);

  /* =========================================================
     SEND
  ========================================================= */

  async function sendRequest(

    memberId

  ) {

    setError("");

    setMessage("");

    try {

      await api.post(

        "/connections/",

        {

          receiver_id:

            memberId,

        }

      );

      setMessage(

        "Connection request sent."

      );

      await Promise.all([

        loadMembers(),

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

  /* =========================================================

     ACCEPT

  ========================================================= */

  async function acceptRequest(

    connectionId

  ) {

    try {

      setError("");

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

  /* =========================================================

     DECLINE

  ========================================================= */

  async function declineRequest(

    connectionId

  ) {

    try {

      setError("");

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

  /* =========================================================

     CANCEL

  ========================================================= */

  async function cancelRequest(

    connectionId

  ) {

    if (!connectionId) {

      return;

    }

    try {

      setError("");

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

  /* =========================================================

     REMOVE

  ========================================================= */

  async function removeConnection(

    connectionId

  ) {

    if (

      !window.confirm(

        "Remove this member from your circle?"

      )

    ) {

      return;

    }

    try {

      setError("");

      await api.post(

        `/connections/${connectionId}/remove/`

      );

      setMessage(

        "Connection removed."

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

  /* =========================================================

     AVATAR

  ========================================================= */

  function MemberAvatar({

    member,

    large = false,

  }) {

    const photo =

      getMemberPhoto(member);

    if (photo) {

      return (

        <img

          src={photo}

          alt={getMemberName(

            member

          )}

          className={

            large

              ? "fk-avatar fk-avatar-large"

              : "fk-avatar"

          }

        />

      );

    }

    return (

      <div

        className={

          large

            ? "fk-avatar-placeholder fk-avatar-large"

            : "fk-avatar-placeholder"

        }

      >

        {getMemberInitial(

          member

        )}

      </div>

    );

  }

  /* =========================================================

     ACTION BUTTONS

  ========================================================= */

  function MemberActions({

    member,

  }) {

    const {

      status,

      connectionId,

    } =

      getMemberConnectionState(

        member

      );

    if (

      status === "connected"

    ) {

      return (

        <div className="fk-member-actions">

          <Link

            to={`/connect/member/${member.id}`}

            className="fk-btn fk-btn-secondary"

          >

            View profile

          </Link>

          <span className="fk-connected">

            <UserCheck size={17} />

            Connected

          </span>

        </div>

      );

    }

    if (

      status ===

      "request_sent"

    ) {

      return (

        <div className="fk-member-actions">

          <Link

            to={`/connect/member/${member.id}`}

            className="fk-btn fk-btn-secondary"

          >

            View profile

          </Link>

          <button

            type="button"

            className="fk-btn fk-btn-pending"

            onClick={() =>

              cancelRequest(

                connectionId

              )

            }

          >

            <Clock3 size={16} />

            Requested

          </button>

        </div>

      );

    }

    if (

      status ===

      "request_received"

    ) {

      return (

        <div className="fk-member-actions">

          <Link

            to={`/connect/member/${member.id}`}

            className="fk-btn fk-btn-secondary"

          >

            View profile

          </Link>

          <button

                  type="button"

                  className="fk-btn fk-btn-primary"

                  onClick={() => {

                    setActiveTab("discover");

                    setTimeout(() => {

                      const discoverSection =

                        document.getElementById(

                          "discover-people-section"

                        );

                      if (discoverSection) {

                        discoverSection.scrollIntoView({

                          behavior: "smooth",

                          block: "start",

                        });

                      } else {

                        window.scrollTo({

                          top: 0,

                          behavior: "smooth",

                        });

                      }

                    }, 100);

                  }}

                >

  <Sparkles size={17} />

  Discover people

</button>

        </div>

      );

    }

    return (

      <div className="fk-member-actions">

        <Link

          to={`/connect/member/${member.id}`}

          className="fk-btn fk-btn-secondary"

        >

          View profile

        </Link>

        <button

          type="button"

          className="fk-btn fk-btn-primary"

          onClick={() =>

            sendRequest(

              member.id

            )

          }

        >

          <UserPlus size={17} />

          Connect

        </button>

      </div>

    );

  }

  /* =========================================================

     MEMBER CARD

  ========================================================= */

  function MemberCard({

    member,

    featured = false,

  }) {

    const profile =

      member?.profile || {};

    const match = calculateFoodMatch(user?.profile, member?.profile);

    const score = match?.food_match ?? null;

    const matchLevel = getMatchLevel(score ?? 0);

    const location =

      getLocation(member);

    const diet =

      getDiet(member);

    return (

      <article

        className={

          featured

            ? "fk-person-card featured"

            : "fk-person-card"

        }

      >

        <div className="fk-person-visual">

          <div className="fk-person-glow" />

          <MemberAvatar

            member={member}

            large

          />

          {score !== null && (

            <div className="fk-score-bubble">

              <strong>

                {score}%

              </strong>

              <span>

                match

              </span>

            </div>

          )}

          <div className="fk-online-dot" />

        </div>

        <div className="fk-person-content">

          <div className="fk-person-name-row">

            <div>

              <h3>

                {getMemberName(

                  member

                )}

              </h3>

              {profile.role && (

                <p className="fk-person-role">

                  {profile.role}

                </p>

              )}

            </div>

            {score !== null && (

              <span

                className={`fk-match-label ${matchLevel.className}`}

              >

                <Sparkles

                  size={13}

                />

                {

                  matchLevel.label

                }

              </span>

            )}

          </div>

          <div className="fk-person-meta">

            {location && (

              <span>

                <MapPin

                  size={15}

                />

                {location}

              </span>

            )}

            {profile

              .college_workplace && (

              <span>

                <BriefcaseBusiness

                  size={15}

                />

                {

                  profile

                    .college_workplace

                }

              </span>

            )}

          </div>

          <div className="fk-person-tags">

            {diet && (

              <span>

                <Utensils

                  size={14}

                />

                {diet}

              </span>

            )}

            {profile

              .favorite_cuisines && (

              <span>

                {

                  profile

                    .favorite_cuisines

                    .split(",")[0]

                }

              </span>

            )}

            {profile.interests && (

              <span>

                {

                  profile

                    .interests

                    .split(",")[0]

                }

              </span>

            )}

          </div>

          {score !== null && (

            <div className="fk-match-progress">

              <div className="fk-match-progress-top">

                <span>

                  Food compatibility

                </span>

                <strong>

                  {score}%

                </strong>

              </div>

              <div className="fk-match-track">

                <span

                  style={{

                    width:

                      `${score}%`,

                  }}

                />

              </div>

            </div>

          )}

          {Array.isArray(

            match?.match_reasons

          ) &&

            match

              .match_reasons

              .length > 0 && (

              <p className="fk-match-reason">

                {

                  match

                    .match_reasons[0]

                }

              </p>

            )}

          <MemberActions

            member={member}

          />

        </div>

      </article>

    );

  }

  /* =========================================================

     FILTER

  ========================================================= */

  function FilterSelect({

    icon,

    label,

    value,

    options,

    onChange,

  }) {

    return (

      <label className="fk-filter-control">

        <span className="fk-filter-icon">

          {icon}

        </span>

        <span className="fk-filter-copy">

          <small>

            {label}

          </small>

          <strong>

            {

              value === "All"

                ? `Any ${label.toLowerCase()}`

                : value

            }

          </strong>

        </span>

        <select

          value={value}

          onChange={event =>

            onChange(

              event.target.value

            )

          }

        >

          {options.map(option => (

            <option

              key={option}

              value={option}

            >

              {option}

            </option>

          ))}

        </select>

        <ChevronDown

          className="fk-filter-chevron"

          size={17}

        />

      </label>

    );

  }

  /* =========================================================

     REQUEST CARD

  ========================================================= */

  function RequestCard({

    connection,

    type,

  }) {

    const member =

      type === "incoming"

        ? connection?.sender

        : connection?.receiver;

    if (!member) {

      return null;

    }

    return (

      <article className="fk-request-card">

        <div className="fk-request-person">

          <MemberAvatar

            member={member}

          />

          <div>

            <h3>

              {getMemberName(

                member

              )}

            </h3>

            <p>

              {getLocation(

                member

              ) ||

                "FoodKindl member"}

            </p>

          </div>

        </div>

        <div className="fk-request-actions">

          <Link

            to={`/connect/member/${member.id}`}

            className="fk-btn fk-btn-secondary"

          >

            Profile

          </Link>

          {type ===

          "incoming" ? (

            <>

              <button

                type="button"

                className="fk-btn fk-btn-primary"

                onClick={() =>

                  acceptRequest(

                    connection.id

                  )

                }

              >

                <Check

                  size={17}

                />

                Accept

              </button>

              <button

                type="button"

                className="fk-icon-button"

                onClick={() =>

                  declineRequest(

                    connection.id

                  )

                }

                title="Decline"

              >

                <X

                  size={18}

                />

              </button>

            </>

          ) : (

            <button

              type="button"

              className="fk-btn fk-btn-pending"

              onClick={() =>

                cancelRequest(

                  connection.id

                )

              }

            >

              Cancel request

            </button>

          )}

        </div>

      </article>

    );

  }

  /* =========================================================

     LOADING

  ========================================================= */

  if (loading) {

    return (

      <main className="connect-page">

        <div className="fk-loading">

          <div className="fk-loader">

            🍜

          </div>

          <h2>

            Finding your food people

          </h2>

          <p>

            Building your FoodKindl

            matches...

          </p>

        </div>

      </main>

    );

  }

  /* =========================================================

     PAGE

  ========================================================= */

  return (

    <main

      className={

        embedded

          ? "connect-page connect-page-embedded"

          : "connect-page"

      }

    >

      {/* =====================================================

          HERO

      ===================================================== */}

      <section className="fk-connect-hero">

        <div className="fk-hero-content">

          <span className="fk-eyebrow">

            CONNECT

          </span>

          <h1>

            Find your

            <span>

              {" "}food people.

            </span>

          </h1>

          <p>

            Meet people who share your

            taste, discover great food

            matches and turn a meal into

            a real connection.

          </p>

          <div className="fk-hero-stats">

            <div>

              <strong>

                {members.length}

              </strong>

              <span>

                People nearby

              </span>

            </div>

            <div>

              <strong>

                {

                  connections.length

                }

              </strong>

              <span>

                In your circle

              </span>

            </div>

            <div>

              <strong>

                {

                  incomingRequests

                    .length

                }

              </strong>

              <span>

                New requests

              </span>

            </div>

          </div>

        </div>

        <div className="fk-hero-art">

          <div className="fk-hero-orbit orbit-1" />

          <div className="fk-hero-orbit orbit-2" />

          <div className="fk-hero-orbit orbit-3" />

          <div className="fk-hero-bowl">

            🍜

          </div>

          <div className="fk-floating-pill fk-pill-one">

            <MapPin size={16} />

            <div>

              <small>

                NEARBY

              </small>

              <strong>

                Discover locally

              </strong>

            </div>

          </div>

          <div className="fk-floating-pill fk-pill-two">

            <Utensils

              size={16}

            />

            <div>

              <small>

                FOOD MATCH

              </small>

              <strong>

                Find your people

              </strong>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================

          NAVIGATION

      ===================================================== */}

      <nav className="fk-connect-tabs">

        <button

          type="button"

          className={

            activeTab ===

            "discover"

              ? "active"

              : ""

          }

          onClick={() =>

            setActiveTab(

              "discover"

            )

          }

        >

          <Sparkles

            size={18}

          />

          Discover

        </button>

        <button

          type="button"

          className={

            activeTab ===

            "requests"

              ? "active"

              : ""

          }

          onClick={() =>

            setActiveTab(

              "requests"

            )

          }

        >

          <UserPlus

            size={18}

          />

          Requests

          {incomingRequests

            .length > 0 && (

            <span className="fk-tab-count">

              {

                incomingRequests

                  .length

              }

            </span>

          )}

        </button>

        <button

          type="button"

          className={

            activeTab ===

            "connections"

              ? "active"

              : ""

          }

          onClick={() =>

            setActiveTab(

              "connections"

            )

          }

        >

          <UsersRound

            size={18}

          />

          My Circle

        </button>

      </nav>

      {/* =====================================================

          ALERTS

      ===================================================== */}

      {message && (

        <div className="fk-alert success">

          <Check size={18} />

          {message}

        </div>

      )}

      {error && (

        <div className="fk-alert error">

          <X size={18} />

          {error}

        </div>

      )}

      {/* =====================================================

          DISCOVER

      ===================================================== */}

      {activeTab ===

        "discover" && (

        <>

          {/* BEST MATCHES */}

          {bestMatches.length >

            0 && (

            <section className="fk-section">

              <div className="fk-section-heading">

                <div>

                  <span className="fk-section-kicker">

                    ✨ MADE FOR YOU

                  </span>

                  <h2>

                    Your best food matches

                  </h2>

                  <p>

                    People you may click

                    with based on your

                    FoodKindl preferences.

                  </p>

                </div>

              </div>

              <div className="fk-best-match-grid">

                {bestMatches.map(

                  item => (

                    <MemberCard

                      key={

                        item

                          .member

                          .id

                      }

                      member={

                        item.member

                      }

                      featured

                    />

                  )

                )}

              </div>

            </section>

          )}

          {/* DISCOVER */}

                        <section

                id="discover-people-section"

                className="fk-section fk-discover-section"

              >

            <div className="fk-section-heading fk-discover-heading">

              <div>

                <span className="fk-section-kicker">

                  DISCOVER PEOPLE

                </span>

                <h2>

                  Meet people through food

                </h2>

                <p>

                  Filter your FoodKindl

                  community by what

                  matters to you.

                </p>

              </div>

              <button

                type="button"

                className={

                  filtersOpen

                    ? "fk-filter-toggle active"

                    : "fk-filter-toggle"

                }

                onClick={() =>

                  setFiltersOpen(

                    value =>

                      !value

                  )

                }

              >

                <SlidersHorizontal

                  size={17}

                />

                Filters

              </button>

            </div>

            {/* FILTERS */}

            {filtersOpen && (

              <div className="fk-filter-panel">

                <div className="fk-filter-grid">

                  <FilterSelect

                    icon={

                      <Utensils

                        size={19}

                      />

                    }

                    label="Food preference"

                    value={

                      selectedFood

                    }

                    options={

                      FOOD_OPTIONS

                    }

                    onChange={

                      setSelectedFood

                    }

                  />

                  <FilterSelect

                    icon={

                      <MapPin

                        size={19}

                      />

                    }

                    label="Location"

                    value={

                      selectedLocation

                    }

                    options={

                      LOCATION_OPTIONS

                    }

                    onChange={

                      setSelectedLocation

                    }

                  />

                </div>

                <div className="fk-filter-footer">

                  <span>

                    <Sparkles

                      size={16}

                    />

                    Showing{" "}

                    <strong>

                      {

                        filteredMembers

                          .length

                      }

                    </strong>{" "}

                    people

                  </span>

                  <button

                    type="button"

                    onClick={

                      resetFilters

                    }

                  >

                    <RefreshCw

                      size={15}

                    />

                    Reset filters

                  </button>

                </div>

              </div>

            )}

            {/* MEMBER GRID */}

            {filteredMembers

              .length > 0 ? (

              <div className="fk-people-grid">

                {filteredMembers.map(

                  member => (

                    <MemberCard

                      key={

                        member.id

                      }

                      member={

                        member

                      }

                    />

                  )

                )}

              </div>

            ) : (

              <div className="fk-empty-state">

                <div>

                  🔎

                </div>

                <h3>

                  No matching people yet

                </h3>

                <p>

                  Try a different food preference

                  or location.

                </p>

                <button

                  type="button"

                  className="fk-btn fk-btn-primary"

                  onClick={

                    resetFilters

                  }

                >

                  Reset filters

                </button>

              </div>

            )}

          </section>

        </>

      )}

      {/* =====================================================

          REQUESTS

      ===================================================== */}

      {activeTab ===

        "requests" && (

        <section className="fk-section">

          <div className="fk-section-heading">

            <div>

              <span className="fk-section-kicker">

                CONNECTION REQUESTS

              </span>

              <h2>

                People who want to connect

              </h2>

              <p>

                Review your incoming

                requests and invitations

                you've already sent.

              </p>

            </div>

          </div>

          <div className="fk-request-columns">

            <div className="fk-request-column">

              <div className="fk-column-title">

                <h3>

                  Incoming

                </h3>

                <span>

                  {

                    incomingRequests

                      .length

                  }

                </span>

              </div>

              {incomingRequests

                .length ? (

                incomingRequests.map(

                  connection => (

                    <RequestCard

                      key={

                        connection.id

                      }

                      connection={

                        connection

                      }

                      type="incoming"

                    />

                  )

                )

              ) : (

                <div className="fk-mini-empty">

                  No new requests.

                </div>

              )}

            </div>

            <div className="fk-request-column">

              <div className="fk-column-title">

                <h3>

                  Sent by you

                </h3>

                <span>

                  {

                    sentRequests

                      .length

                  }

                </span>

              </div>

              {sentRequests.length ? (

                sentRequests.map(

                  connection => (

                    <RequestCard

                      key={

                        connection.id

                      }

                      connection={

                        connection

                      }

                      type="sent"

                    />

                  )

                )

              ) : (

                <div className="fk-mini-empty">

                  You have no pending

                  sent requests.

                </div>

              )}

            </div>

          </div>

        </section>

      )}

      {/* =====================================================

          CONNECTIONS

      ===================================================== */}

      {activeTab ===

        "connections" && (

        <section className="fk-section">

          <div className="fk-section-heading">

            <div>

              <span className="fk-section-kicker">

                YOUR FOOD CIRCLE

              </span>

              <h2>

                People you've connected with

              </h2>

              <p>

                Your growing FoodKindl

                circle.

              </p>

            </div>

          </div>

          {connections.length >

          0 ? (

            <div className="fk-circle-grid">

              {connections.map(

                connection => {

                  const member =

                    getOtherMember(

                      connection

                    );

                  if (!member) {

                    return null;

                  }

                  return (

                    <article

                      className="fk-circle-card"

                      key={

                        connection.id

                      }

                    >

                      <MemberAvatar

                        member={

                          member

                        }

                      />

                      <div className="fk-circle-info">

                        <h3>

                          {

                            getMemberName(

                              member

                            )

                          }

                        </h3>

                        <p>

                          {

                            getLocation(

                              member

                            ) ||

                            getDiet(

                              member

                            ) ||

                            "FoodKindl member"

                          }

                        </p>

                      </div>

                      <div className="fk-circle-actions">

                        <Link

                          to={`/connect/member/${member.id}`}

                          className="fk-btn fk-btn-secondary"

                        >

                          Profile

                        </Link>

                        <button

                          type="button"

                          className="fk-icon-button danger"

                          title="Remove connection"

                          onClick={() =>

                            removeConnection(

                              connection.id

                            )

                          }

                        >

                          <UserMinus

                            size={18}

                          />

                        </button>

                      </div>

                    </article>

                  );

                }

              )}

            </div>

          ) : (

            <div className="fk-empty-state">

              <div>

                👋

              </div>

              <h3>

                Your circle is just getting started

              </h3>

              <p>

                Discover people who share

                your food interests and

                start connecting.

              </p>

              <button

                type="button"

                className="fk-btn fk-btn-primary"

                onClick={() =>

                  setActiveTab(

                    "discover"

                  )

                }

              >

                Discover people

              </button>

            </div>

          )}

        </section>

      )}

    </main>

  );

}
