import {
  useEffect,
  useState,
} from "react";

import {
  Check,
  Clock3,
  MapPin,
  Search,
  Sparkles,
  UserCheck,
  UserMinus,
  UserPlus,
  UsersRound,
  Utensils,
  X,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import api from "../api";

import {
  useAuth,
} from "../context/AuthContext";


// ============================================================
// FOOD MATCH LEVEL
// ============================================================

function getMatchLevel(
  score
) {

  const numericScore =
    Number(score) || 0;


  if (
    numericScore >= 80
  ) {

    return {
      label:
        "Excellent Match",

      className:
        "excellent",
    };
  }


  if (
    numericScore >= 60
  ) {

    return {
      label:
        "Great Match",

      className:
        "great",
    };
  }


  if (
    numericScore >= 40
  ) {

    return {
      label:
        "Good Match",

      className:
        "good",
    };
  }


  return {
    label:
      "Potential Match",

    className:
      "potential",
  };
}


// ============================================================
// CONNECT
// ============================================================

export default function Connect() {

  const {
    user,
  } = useAuth();


  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "discover"
  );


  const [
    members,
    setMembers,
  ] = useState([]);


  const [
    foodMatches,
    setFoodMatches,
  ] = useState([]);


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
    searchValue,
    setSearchValue,
  ] = useState("");


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


  const API_BASE = (
    import.meta.env.VITE_BACKEND_URL ||
    "http://127.0.0.1:8000"
  ).replace(
    /\/+$/,
    ""
  );


  // =========================================================
  // MEDIA URL
  // =========================================================

  function getMediaUrl(
    path
  ) {

    if (!path) {
      return "";
    }


    if (
      path.startsWith(
        "http://"
      ) ||
      path.startsWith(
        "https://"
      ) ||
      path.startsWith(
        "blob:"
      )
    ) {

      return path;
    }


    if (
      path.startsWith(
        "/.netlify/"
      )
    ) {

      return (
        `${window.location.origin}${path}`
      );
    }


    return (
      `${API_BASE}${path}`
    );
  }


  // =========================================================
  // MEMBER HELPERS
  // =========================================================

  function getMemberName(
    member
  ) {

    return (
      member?.full_name ||

      [
        member?.first_name,
        member?.last_name,
      ]
        .filter(Boolean)
        .join(" ") ||

      member?.email ||

      "FoodKindl Member"
    );
  }


  function getMemberInitial(
    member
  ) {

    return (
      getMemberName(
        member
      )
        .charAt(0)
        .toUpperCase()
    );
  }


  function getMemberPhoto(
    member
  ) {

    return getMediaUrl(

      member
        ?.profile
        ?.profile_image_1_url
      ||

      member
        ?.profile
        ?.profile_image_1
    );
  }


  function getOtherMember(
    connection
  ) {

    if (
      Number(
        connection
          ?.sender
          ?.id
      ) ===
      Number(
        user?.id
      )
    ) {

      return (
        connection.receiver
      );
    }


    return (
      connection.sender
    );
  }


  // =========================================================
  // FOOD MATCH ID
  // =========================================================

  function getFoodMatchMemberIds(
    match
  ) {

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
        value =>
          value !== undefined &&
          value !== null &&
          value !== ""
      )
      .map(
        value =>
          Number(value)
      )
      .filter(
        value =>
          !Number.isNaN(
            value
          )
      );
  }


  // =========================================================
  // FOOD MATCH FOR MEMBER
  // =========================================================

  function getFoodMatch(
    memberId
  ) {

    const normalizedMemberId =
      Number(
        memberId
      );


    if (
      Number.isNaN(
        normalizedMemberId
      )
    ) {

      return null;
    }


    const match =
      foodMatches.find(
        item => {

          const possibleIds =
            getFoodMatchMemberIds(
              item
            );


          return (
            possibleIds.includes(
              normalizedMemberId
            )
          );
        }
      );


    return (
      match || null
    );
  }


  // =========================================================
  // FOOD MATCH SCORE
  // =========================================================

  function getFoodMatchScore(
    foodMatch
  ) {

    if (!foodMatch) {
      return null;
    }


    const rawScore =
      foodMatch?.food_match ??
      foodMatch?.match_score ??
      foodMatch?.score ??
      foodMatch?.percentage ??
      foodMatch?.match_percentage ??
      null;


    if (
      rawScore === null ||
      rawScore === undefined ||
      rawScore === ""
    ) {

      return null;
    }


    const numericScore =
      Number(
        rawScore
      );


    if (
      Number.isNaN(
        numericScore
      )
    ) {

      return null;
    }


    return Math.max(
      0,
      Math.min(
        Math.round(
          numericScore
        ),
        100
      )
    );
  }


  // =========================================================
  // CONNECTION STATE
  // =========================================================

  function getMemberConnectionState(
    member
  ) {

    const memberId =
      Number(
        member?.id
      );


    const acceptedConnection =
      connections.find(
        connection => {

          const senderId =
            Number(
              connection
                ?.sender
                ?.id
            );


          const receiverId =
            Number(
              connection
                ?.receiver
                ?.id
            );


          return (
            senderId ===
              memberId
            ||
            receiverId ===
              memberId
          );
        }
      );


    if (
      acceptedConnection
    ) {

      return {
        status:
          "connected",

        connectionId:
          acceptedConnection.id,
      };
    }


    const sentConnection =
      sentRequests.find(
        connection =>
          Number(
            connection
              ?.receiver
              ?.id
          ) ===
          memberId
      );


    if (
      sentConnection
    ) {

      return {
        status:
          "request_sent",

        connectionId:
          sentConnection.id,
      };
    }


    const incomingConnection =
      incomingRequests.find(
        connection =>
          Number(
            connection
              ?.sender
              ?.id
          ) ===
          memberId
      );


    if (
      incomingConnection
    ) {

      return {
        status:
          "request_received",

        connectionId:
          incomingConnection.id,
      };
    }


    const apiStatus =
      member
        ?.connection_status;


    if (
      apiStatus ===
        "connected"
      ||
      apiStatus ===
        "request_sent"
      ||
      apiStatus ===
        "request_received"
    ) {

      return {
        status:
          apiStatus,

        connectionId:
          member
            ?.connection_id ||
          null,
      };
    }


    return {
      status:
        "none",

      connectionId:
        null,
    };
  }


  // =========================================================
  // ERROR MESSAGE
  // =========================================================

  function getErrorMessage(
    data
  ) {

    if (!data) {

      return (
        "The request could not be completed."
      );
    }


    if (
      typeof data ===
      "string"
    ) {

      return data;
    }


    return (
      data?.receiver_id?.[0] ||
      data?.non_field_errors?.[0] ||
      data?.detail ||
      "The request could not be completed."
    );
  }


  // =========================================================
  // LOAD MEMBERS
  // =========================================================

  async function loadMembers(
    query = ""
  ) {

    try {

      const response =
        await api.get(
          "/members/",
          {
            params: {
              q:
                query.trim(),
            },
          }
        );


      const memberList =
            response.data?.results ||
            response.data;

          const memberOnlyList =
            Array.isArray(memberList)
              ? memberList.filter(
                  (member) =>
                    member?.profile?.account_type !== "partner" &&
                    member?.account_type !== "partner"
                )
              : [];

          setMembers(memberOnlyList);

    } catch (
      requestError
    ) {

      console.error(
        "Unable to load members:",
        requestError.response?.status,
        requestError.response?.data ||
        requestError
      );


      const data =
        requestError
          .response
          ?.data;


      setError(
        data?.detail ||
        data?.message ||
        (
          typeof data ===
          "string"
            ? data
            : ""
        ) ||
        "Registered members could not be loaded."
      );
    }
  }


  // =========================================================
  // LOAD FOOD MATCHES
  // =========================================================

  async function loadFoodMatches() {

    try {

      const response =
        await api.get(
          "/auth/food-matches/"
        );


      console.log(
        "FOOD MATCH API RESPONSE:",
        response.data
      );


      const results =
        response.data?.results ||
        response.data ||
        [];


      const normalizedResults =
        Array.isArray(
          results
        )
          ? results
          : [];


      console.log(
        "FOOD MATCH RESULTS:",
        normalizedResults
      );


      setFoodMatches(
        normalizedResults
      );


    } catch (
      requestError
    ) {

      console.error(
        "Unable to load Food Matches:",
        requestError.response?.data ||
        requestError
      );


      setFoodMatches([]);
    }
  }


  // =========================================================
  // LOAD CONNECTIONS
  // =========================================================

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


      setIncomingRequests(
        incomingResponse.data
          ?.results ||
        incomingResponse.data ||
        []
      );


      setSentRequests(
        sentResponse.data
          ?.results ||
        sentResponse.data ||
        []
      );


      const acceptedConnections =
  acceptedResponse.data?.results ||
  acceptedResponse.data ||
  [];

setConnections(
  Array.isArray(acceptedConnections)
    ? acceptedConnections.filter(
        (connection) => {
          const otherMember =
            Number(connection?.sender?.id) === Number(user?.id)
              ? connection?.receiver
              : connection?.sender;

          return (
            otherMember?.profile?.account_type !== "partner" &&
            otherMember?.account_type !== "partner"
          );
        }
      )
    : []
);

    } catch (
      requestError
    ) {

      console.error(
        "Unable to load connections:",
        requestError
      );


      setError(
        "Connection details could not be loaded."
      );
    }
  }


  // =========================================================
  // LOAD PAGE
  // =========================================================

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


  useEffect(
    () => {

      loadPage();

    },
    []
  );


  // =========================================================
  // SEARCH
  // =========================================================

  async function searchMembers(
    event
  ) {

    event.preventDefault();


    setLoading(true);

    setError("");

    setMessage("");


    await Promise.all([

      loadMembers(
        searchValue
      ),

      loadFoodMatches(),

      loadConnections(),

    ]);


    setLoading(false);
  }


  // =========================================================
  // SHOW ALL
  // =========================================================

  async function showAllMembers() {

    setSearchValue("");


    setLoading(true);

    setError("");

    setMessage("");


    await Promise.all([

      loadMembers(""),

      loadFoodMatches(),

      loadConnections(),

    ]);


    setLoading(false);
  }


  // =========================================================
  // SEND REQUEST
  // =========================================================

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

        loadMembers(
          searchValue
        ),

        loadFoodMatches(),

        loadConnections(),

      ]);


    } catch (
      requestError
    ) {

      console.error(
        "Unable to send request:",
        requestError.response?.data ||
        requestError
      );


      setError(
        getErrorMessage(
          requestError
            .response
            ?.data
        )
      );
    }
  }


  // =========================================================
  // ACCEPT REQUEST
  // =========================================================

  async function acceptRequest(
    connectionId
  ) {

    setError("");

    setMessage("");


    try {

      await api.post(
        `/connections/${connectionId}/accept/`
      );


      setMessage(
        "Connection request accepted."
      );


      await loadPage();


    } catch (
      requestError
    ) {

      setError(
        getErrorMessage(
          requestError
            .response
            ?.data
        )
      );
    }
  }


  // =========================================================
  // DECLINE REQUEST
  // =========================================================

  async function declineRequest(
    connectionId
  ) {

    setError("");

    setMessage("");


    try {

      await api.post(
        `/connections/${connectionId}/decline/`
      );


      setMessage(
        "Connection request declined."
      );


      await loadPage();


    } catch (
      requestError
    ) {

      setError(
        getErrorMessage(
          requestError
            .response
            ?.data
        )
      );
    }
  }


  // =========================================================
  // CANCEL REQUEST
  // =========================================================

  async function cancelRequest(
    connectionId
  ) {

    setError("");

    setMessage("");


    if (
      !connectionId
    ) {

      setError(
        "Connection request ID is missing."
      );

      return;
    }


    try {

      await api.post(
        `/connections/${connectionId}/cancel/`
      );


      setMessage(
        "Connection request cancelled."
      );


      await loadPage();


    } catch (
      requestError
    ) {

      setError(
        getErrorMessage(
          requestError
            .response
            ?.data
        )
      );
    }
  }


  // =========================================================
  // REMOVE CONNECTION
  // =========================================================

  async function removeConnection(
    connectionId
  ) {

    const confirmed =
      window.confirm(
        "Remove this member from your connections?"
      );


    if (!confirmed) {
      return;
    }


    setError("");

    setMessage("");


    try {

      await api.post(
        `/connections/${connectionId}/remove/`
      );


      setMessage(
        "Connection removed."
      );


      await loadPage();


    } catch (
      requestError
    ) {

      setError(
        getErrorMessage(
          requestError
            .response
            ?.data
        )
      );
    }
  }


  // =========================================================
  // AVATAR
  // =========================================================

  function renderMemberAvatar(
    member
  ) {

    const photo =
      getMemberPhoto(
        member
      );


    if (photo) {

      return (

        <img
          src={photo}
          alt={
            getMemberName(
              member
            )
          }
          className="connect-member-photo"
        />

      );
    }


    return (

      <div className="connect-member-placeholder">

        {
          getMemberInitial(
            member
          )
        }

      </div>

    );
  }


  // =========================================================
  // MEMBER DETAILS
  // =========================================================

  function renderMemberDetails(
    member
  ) {

    const profile =
      member?.profile ||
      {};


    const foodMatch =
      getFoodMatch(
        member.id
      );


    const matchScore =
      getFoodMatchScore(
        foodMatch
      );


    const matchLevel =
      getMatchLevel(
        matchScore || 0
      );


    const dietaryLabel =
      profile.dietary_preference
        ? profile
            .dietary_preference
            .replaceAll(
              "_",
              " "
            )
        : "";


    console.log(
      "MEMBER MATCH:",
      {
        memberId:
          member.id,

        memberName:
          getMemberName(
            member
          ),

        foodMatch,

        matchScore,
      }
    );


    return (

      <>

        <h3>
          {
            getMemberName(
              member
            )
          }
        </h3>


        {
          profile.role &&
          (

            <p className="connect-member-role">
              {
                profile.role
              }
            </p>

          )
        }


        {
          (
            profile.city ||
            profile.locality
          ) &&
          (

            <p className="connect-member-location">

              <MapPin
                size={15}
              />


              {
                [
                  profile.locality,
                  profile.city,
                ]
                  .filter(Boolean)
                  .join(", ")
              }

            </p>

          )
        }


        {
          profile.college_workplace &&
          (

            <p>
              {
                profile
                  .college_workplace
              }
            </p>

          )
        }


        {
          dietaryLabel &&
          (

            <span className="connect-preference">
              {
                dietaryLabel
              }
            </span>

          )
        }


        {/* =================================================
            FOOD MATCH
        ================================================= */}

        <div className="connect-food-match">

          {
            matchScore !== null
              ? (

                <>

                  <div className="connect-food-match-top">

                    <div
                      className={
                        `connect-food-match-score ${matchLevel.className}`
                      }
                    >

                      <Utensils
                        size={16}
                      />


                      <strong>
                        {matchScore}%
                      </strong>


                      <span>
                        Food Match
                      </span>

                    </div>


                    <div
                      className={
                        `connect-food-match-level ${matchLevel.className}`
                      }
                    >

                      <Sparkles
                        size={13}
                      />


                      {
                        matchLevel.label
                      }

                    </div>

                  </div>


                  <div className="connect-food-match-bar">

                    <span
                      style={{
                        width:
                          `${matchScore}%`,
                      }}
                    />

                  </div>


                  {
                    Array.isArray(
                      foodMatch?.match_reasons
                    ) &&
                    foodMatch.match_reasons.length >
                      0 &&
                    (

                      <p className="connect-food-match-reason">
                        {
                          foodMatch.match_reasons[0]
                        }
                      </p>

                    )
                  }

                </>

              )
              : (

                <div className="connect-food-match-unavailable">

                  <Utensils
                    size={15}
                  />

                  <span>
                    Food Match not calculated yet
                  </span>

                </div>

              )
          }

        </div>

      </>

    );
  }


  // =========================================================
  // ACTIONS
  // =========================================================

  function renderMemberActions(
    member
  ) {

    const {
      status:
        connectionStatus,

      connectionId,

    } =
      getMemberConnectionState(
        member
      );


    return (

      <div className="connect-card-actions">


        <Link
          to={
            `/connect/member/${member.id}`
          }
          className="secondary-button"
        >

          View Profile

        </Link>


        {
          connectionStatus ===
          "none" &&
          (

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                sendRequest(
                  member.id
                )
              }
            >

              <UserPlus
                size={17}
              />

              Connect

            </button>

          )
        }


        {
          connectionStatus ===
          "request_sent" &&
          (

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                cancelRequest(
                  connectionId
                )
              }
            >

              <Clock3
                size={17}
              />

              Request Sent

            </button>

          )
        }


        {
          connectionStatus ===
          "request_received" &&
          (

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                setActiveTab(
                  "requests"
                )
              }
            >

              <UserPlus
                size={17}
              />

              Review Request

            </button>

          )
        }


        {
          connectionStatus ===
          "connected" &&
          (

            <span className="connected-badge">

              <UserCheck
                size={17}
              />

              Connected

            </span>

          )
        }

      </div>

    );
  }


  // =========================================================
  // LOADING
  // =========================================================

  if (
    loading
  ) {

    return (

      <main className="app-page">

        <div className="app-panel">
          Loading FoodKindl members...
        </div>

      </main>

    );
  }


  // =========================================================
  // PAGE
  // =========================================================

  return (

    <main className="app-page">


      {/* =====================================================
          HEADING
      ===================================================== */}

      <div className="app-heading">

        <div>

          <div className="eyebrow left">
            FoodKindl Connect
          </div>


          <h1>
            Discover and connect
          </h1>


          <p>
            Discover people who share your
            food tastes and interests,
            connect with members and build
            meaningful food connections.
          </p>

        </div>

      </div>


      {/* =====================================================
          TABS
      ===================================================== */}

      <div className="connect-tabs">


        <button
          type="button"
          className={
            activeTab ===
            "discover"
              ? "connect-tab active"
              : "connect-tab"
          }
          onClick={() =>
            setActiveTab(
              "discover"
            )
          }
        >

          <Search
            size={18}
          />

          Discover Members

        </button>


        <button
          type="button"
          className={
            activeTab ===
            "requests"
              ? "connect-tab active"
              : "connect-tab"
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


          {
            incomingRequests.length >
            0 &&
            (

              <span className="connect-count">
                {
                  incomingRequests.length
                }
              </span>

            )
          }

        </button>


        <button
          type="button"
          className={
            activeTab ===
            "connections"
              ? "connect-tab active"
              : "connect-tab"
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

          My Connections

        </button>

      </div>


      {/* =====================================================
          STATUS
      ===================================================== */}

      {
        error &&
        (

          <p className="error-message">
            {error}
          </p>

        )
      }


      {
        message &&
        (

          <p className="form-message">
            {message}
          </p>

        )
      }


      {/* =====================================================
          DISCOVER
      ===================================================== */}

      {
        activeTab ===
        "discover" &&
        (

          <section>


            <form
              className="app-panel connect-search-form"
              onSubmit={
                searchMembers
              }
            >

              <div className="connect-global-search">

                <Search
                  size={21}
                  className="connect-global-search-icon"
                />


                <input
                  type="search"
                  value={
                    searchValue
                  }
                  onChange={
                    event =>
                      setSearchValue(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="Search by name, postcode, city, locality, workplace, role or food preference..."
                  autoComplete="off"
                />


                <button
                  type="submit"
                  className="primary-button connect-search-button"
                >

                  <Search
                    size={18}
                  />

                  Search

                </button>

              </div>


              <div className="connect-search-help">

                Try:{" "}

                <span>
                  Bengaluru
                </span>

                {" · "}

                <span>
                  Vegetarian
                </span>

                {" · "}

                <span>
                  Kerala
                </span>

              </div>


              <button
                type="button"
                className="connect-show-all"
                onClick={
                  showAllMembers
                }
              >

                Show All Members

              </button>

            </form>


            <div className="connect-member-grid">

              {
                members.length ===
                0
                  ? (

                    <div className="app-panel">
                      No members matched your search.
                    </div>

                  )
                  : (

                    members.map(
                      member => (

                        <article
                          className="connect-member-card"
                          key={
                            member.id
                          }
                        >

                          {
                            renderMemberAvatar(
                              member
                            )
                          }


                          <div className="connect-member-info">

                            {
                              renderMemberDetails(
                                member
                              )
                            }


                            {
                              renderMemberActions(
                                member
                              )
                            }

                          </div>

                        </article>

                      )
                    )

                  )
              }

            </div>

          </section>

        )
      }


      {/* =====================================================
          REQUESTS
      ===================================================== */}

      {
        activeTab ===
        "requests" &&
        (

          <section className="connect-request-layout">


            <div>

              <div className="connect-section-heading">

                <h2>
                  Incoming Requests
                </h2>

                <span>
                  {
                    incomingRequests.length
                  }
                </span>

              </div>


              <div className="connect-list">

                {
                  incomingRequests.length ===
                  0
                    ? (

                      <div className="app-panel">
                        No incoming requests.
                      </div>

                    )
                    : (

                      incomingRequests.map(
                        connection => {

                          const member =
                            connection.sender;


                          return (

                            <article
                              className="connect-request-card"
                              key={
                                connection.id
                              }
                            >

                              {
                                renderMemberAvatar(
                                  member
                                )
                              }


                              <div className="connect-request-info">

                                {
                                  renderMemberDetails(
                                    member
                                  )
                                }


                                <div className="connect-card-actions">

                                  <Link
                                    to={
                                      `/connect/member/${member.id}`
                                    }
                                    className="secondary-button"
                                  >
                                    View Profile
                                  </Link>


                                  <button
                                    type="button"
                                    className="primary-button"
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
                                    className="secondary-button"
                                    onClick={() =>
                                      declineRequest(
                                        connection.id
                                      )
                                    }
                                  >

                                    <X
                                      size={17}
                                    />

                                    Decline

                                  </button>

                                </div>

                              </div>

                            </article>

                          );
                        }
                      )

                    )
                }

              </div>

            </div>


            <div>

              <div className="connect-section-heading">

                <h2>
                  Sent Requests
                </h2>

                <span>
                  {
                    sentRequests.length
                  }
                </span>

              </div>


              <div className="connect-list">

                {
                  sentRequests.length ===
                  0
                    ? (

                      <div className="app-panel">
                        No pending sent requests.
                      </div>

                    )
                    : (

                      sentRequests.map(
                        connection => {

                          const member =
                            connection.receiver;


                          return (

                            <article
                              className="connect-request-card"
                              key={
                                connection.id
                              }
                            >

                              {
                                renderMemberAvatar(
                                  member
                                )
                              }


                              <div className="connect-request-info">

                                {
                                  renderMemberDetails(
                                    member
                                  )
                                }


                                <div className="connect-card-actions">

                                  <Link
                                    to={
                                      `/connect/member/${member.id}`
                                    }
                                    className="secondary-button"
                                  >
                                    View Profile
                                  </Link>


                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() =>
                                      cancelRequest(
                                        connection.id
                                      )
                                    }
                                  >

                                    <X
                                      size={17}
                                    />

                                    Cancel Request

                                  </button>

                                </div>

                              </div>

                            </article>

                          );
                        }
                      )

                    )
                }

              </div>

            </div>

          </section>

        )
      }


      {/* =====================================================
          CONNECTIONS
      ===================================================== */}

      {
        activeTab ===
        "connections" &&
        (

          <section>

            <div className="connect-section-heading">

              <h2>
                My Connections
              </h2>

              <span>
                {
                  connections.length
                }
              </span>

            </div>


            <div className="connect-member-grid">

              {
                connections.length ===
                0
                  ? (

                    <div className="app-panel">
                      You do not have any connections yet.
                    </div>

                  )
                  : (

                    connections.map(
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
                            className="connect-member-card"
                            key={
                              connection.id
                            }
                          >

                            {
                              renderMemberAvatar(
                                member
                              )
                            }


                            <div className="connect-member-info">

                              {
                                renderMemberDetails(
                                  member
                                )
                              }


                              <div className="connect-card-actions">

                                <Link
                                  to={
                                    `/connect/member/${member.id}`
                                  }
                                  className="primary-button"
                                >
                                  View Profile
                                </Link>


                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() =>
                                    removeConnection(
                                      connection.id
                                    )
                                  }
                                >

                                  <UserMinus
                                    size={17}
                                  />

                                  Remove

                                </button>

                              </div>

                            </div>

                          </article>

                        );
                      }
                    )

                  )
              }

            </div>

          </section>

        )
      }

    </main>
  );
}