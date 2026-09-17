import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import api from "../api";
import "../styles/FoodInvites.css";


const COOK_TOGETHER_ENDPOINT =
  "/cook-togethers/";

const DINE_OUT_ENDPOINT =
  "/dineout/dine-outs/";


const INVITE_TYPES = [
  {
    value: "cook_together",
    number: "01",
    label: "Cook Together",
    icon: "🍳",
    description:
      "Invite people nearby to cook and share a meal together at home, a clubhouse or another venue.",
    buttonText: "Create Cook Together",
    route: "/cook-together",
  },
  {
    value: "dine_out",
    number: "02",
    label: "Dine Out",
    icon: "🍽️",
    description:
      "Choose a restaurant or café, invite people and turn dining out into a shared experience.",
    buttonText: "Plan a Dine Out",
    route: "/dine-out",
  },
  {
    value: "food_walk",
    number: "03",
    label: "Food Walk",
    icon: "🚶",
    description:
      "Discover great food along a walk, drive or journey and invite others to join your route.",
    buttonText: "Plan a Food Walk",
    route: "/food-walk",
  },
];


function extractResults(response) {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}


function backendError(
  error,
  fallback
) {
  const data =
    error?.response?.data;

  return (
    data?.detail ||
    data?.error ||
    data?.message ||
    fallback
  );
}


function formatDateTime(invite) {
  const dateValue =
    invite?.starts_at ||
    (
      invite?.event_date
        ? `${invite.event_date}T${
            invite.start_time ||
            "00:00:00"
          }`
        : null
    );

  if (!dateValue) {
    return "Date not specified";
  }

  try {
    return new Intl.DateTimeFormat(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(
      new Date(dateValue)
    );
  } catch {
    return dateValue;
  }
}


function inviteDateValue(invite) {
  if (invite?.starts_at) {
    const value =
      new Date(
        invite.starts_at
      ).getTime();

    return Number.isNaN(value)
      ? null
      : value;
  }

  if (!invite?.event_date) {
    return null;
  }

  const value =
    new Date(
      `${invite.event_date}T${
        invite.start_time ||
        "00:00:00"
      }`
    ).getTime();

  return Number.isNaN(value)
    ? null
    : value;
}


function getStatus(invite) {
  return String(
    invite?.display_status ||
    invite?.my_invitation_status ||
    invite?.status ||
    "pending"
  ).toLowerCase();
}


function normalizeCookTogether(
  invite
) {
  return {
    ...invite,

    invite_type:
      "cook_together",

    unique_key:
      `cook-${invite.id}`,

    details_route:
      `/food-invites/${invite.id}`,

    type_label:
      "Cook Together",

    type_icon:
      "🍳",

    display_status:
      getStatus(invite),
  };
}


function normalizeDineOut(invite) {
  const isHost =
    Boolean(
      invite.is_host
    );

  const isPublic =
    invite.visibility ===
    "public";

  const responseStatus =
    invite.my_response_status;

  return {
    ...invite,

    invite_type:
      "dine_out",

    unique_key:
      `dine-${invite.id}`,

    details_route:
      `/dine-out/${invite.id}`,

    type_label:
      "Dine Out",

    type_icon:
      "🍽️",

    location_name:
      invite.restaurant_address ||
      invite.restaurant_name,

    dish:
      invite.restaurant_cuisine ||
      invite.restaurant_name,

    approved_guest_count:
      Number(
        invite.accepted_guests ||
        0
      ),

    host_name:
      invite.host?.name ||
      invite.host?.username ||
      "FoodKindl member",

    is_host:
      isHost,

    is_invited:
      !isHost &&
      !isPublic &&
      responseStatus !== null &&
      responseStatus !== undefined,

    my_invitation_status:
      responseStatus,

    display_status:
      isHost
        ? "hosting"
        : isPublic
          ? responseStatus ===
            "accepted"
            ? "joined"
            : "open"
          : responseStatus ||
            "pending",
  };
}


export default function FoodInvites() {
  const navigate =
    useNavigate();

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "upcoming"
  );

  const [
    invites,
    setInvites,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionId,
    setActionId,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");


  const loadInvites = useCallback(async (
    tab
  ) => {
    setLoading(true);
    setError("");

    try {
      let cookUrls = [];
      let dineUrls = [];

      if (tab === "pending") {
        cookUrls = [
          `${COOK_TOGETHER_ENDPOINT}` +
          "my-invitations/?status=pending",
        ];

        dineUrls = [
          `${DINE_OUT_ENDPOINT}invitations/`,
        ];
      } else if (tab === "created") {
        cookUrls = [
          `${COOK_TOGETHER_ENDPOINT}created-by-me/`,
        ];

        dineUrls = [
          `${DINE_OUT_ENDPOINT}mine/`,
        ];
      } else if (tab === "past") {
        cookUrls = [
          `${COOK_TOGETHER_ENDPOINT}` +
          "my-invitations/?status=approved",
          `${COOK_TOGETHER_ENDPOINT}created-by-me/`,
        ];

        dineUrls = [
          `${DINE_OUT_ENDPOINT}mine/`,
        ];
      } else {
        /*
         * UPCOMING:
         *
         * Load approved Cook Together
         * invitations and the main Dine
         * Out endpoint.
         *
         * The main Dine Out endpoint
         * returns:
         * - All public events
         * - Private events shared with
         *   the logged-in member
         * - Events hosted by the member
         */
        cookUrls = [
          `${COOK_TOGETHER_ENDPOINT}` +
          "my-invitations/?status=approved",
        ];

        dineUrls = [
          DINE_OUT_ENDPOINT,
        ];
      }

      const requests = [
        ...cookUrls.map(url => ({
          type: "cook",
          url,
        })),
        ...dineUrls.map(url => ({
          type: "dine",
          url,
        })),
      ];

      const settledResponses =
        await Promise.allSettled(
          requests.map(request =>
            api.get(request.url)
          )
        );

      const cookResponses = [];
      const dineResponses = [];
      const failedRequests = [];

      settledResponses.forEach(
        (result, index) => {
          const request = requests[index];

          if (result.status === "fulfilled") {
            if (request.type === "cook") {
              cookResponses.push(result.value);
            } else {
              dineResponses.push(result.value);
            }

            return;
          }

          failedRequests.push({
            ...request,
            error: result.reason,
          });

          console.error("FOOD INVITES REQUEST ERROR:", {
            url: request.url,
            status: result.reason?.response?.status,
            data: result.reason?.response?.data,
            message: result.reason?.message,
          });
        }
      );

      if (
        requests.length > 0 &&
        failedRequests.length === requests.length
      ) {
        throw failedRequests[0].error;
      }

      const cookInvites =
        cookResponses
          .flatMap(
            extractResults
          )
          .map(
            normalizeCookTogether
          );

      let dineInvites =
        dineResponses
          .flatMap(
            extractResults
          )
          .map(
            normalizeDineOut
          );

      if (tab === "pending") {
        dineInvites =
          dineInvites.filter(
            invite =>
              invite
                .my_invitation_status ===
              "pending"
          );
      }

      if (tab === "created") {
        dineInvites =
          dineInvites.filter(
            invite =>
              invite.is_host
          );
      }

      const combined = [
        ...cookInvites,
        ...dineInvites,
      ];

      const unique =
        Array.from(
          new Map(
            combined.map(
              invite => [
                invite.unique_key,
                invite,
              ]
            )
          ).values()
        );

      unique.sort(
        (
          first,
          second
        ) => {
          const firstDate =
            inviteDateValue(first);

          const secondDate =
            inviteDateValue(second);

          if (
            firstDate === null &&
            secondDate === null
          ) {
            return 0;
          }

          if (firstDate === null) {
            return 1;
          }

          if (secondDate === null) {
            return -1;
          }

          return (
            firstDate -
            secondDate
          );
        }
      );

      setInvites(unique);
    } catch (requestError) {
      console.error(
        "FOOD INVITES ERROR:",
        requestError?.response
          ?.status,
        requestError?.response
          ?.data
      );

      setError(
        backendError(
          requestError,
          "Unable to load Food Invites."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(
    () => {
      loadInvites(
        activeTab
      );
    },
    [activeTab, loadInvites]
  );


  useEffect(
    () => {
      function refreshUpcoming() {
        if (
          activeTab ===
          "upcoming"
        ) {
          loadInvites(
            "upcoming"
          );
        }
      }

      window.addEventListener(
        "focus",
        refreshUpcoming
      );

      return () => {
        window.removeEventListener(
          "focus",
          refreshUpcoming
        );
      };
    },
    [activeTab, loadInvites]
  );


  const filteredInvites =
    useMemo(
      () => {
        const now =
          Date.now();

        if (
          activeTab ===
          "past"
        ) {
          return invites.filter(
            invite => {
              const value =
                inviteDateValue(
                  invite
                );

              return (
                value !== null &&
                value < now
              );
            }
          );
        }

        if (
          activeTab ===
          "upcoming"
        ) {
          return invites.filter(
            invite => {
              const value =
                inviteDateValue(
                  invite
                );

              return (
                value === null ||
                value >= now
              );
            }
          );
        }

        return invites;
      },
      [
        activeTab,
        invites,
      ]
    );


  function openInviteType(type) {
    navigate(
      type.route
    );
  }


  async function respondToInvite(
    invite,
    action
  ) {
    if (actionId) {
      return;
    }

    setActionId(
      invite.unique_key
    );

    setError("");
    setMessage("");

    try {
      if (
        invite.invite_type ===
        "dine_out"
      ) {
        await api.post(
          `${DINE_OUT_ENDPOINT}` +
          `${invite.id}/` +
          `${action}/`
        );
      } else {
        const endpoint =
          action === "accept"
            ? "accept-invitation"
            : "decline-invitation";

        await api.post(
          `${COOK_TOGETHER_ENDPOINT}` +
          `${invite.id}/` +
          `${endpoint}/`
        );
      }

      if (action === "join") {
        setMessage(
          "You joined the Dine Out."
        );
      } else if (
        action === "accept"
      ) {
        setMessage(
          "Invitation accepted."
        );
      } else if (
        invite.visibility ===
        "public"
      ) {
        setMessage(
          "You left the Dine Out."
        );
      } else {
        setMessage(
          "Invitation declined."
        );
      }

      await loadInvites(
        activeTab
      );
    } catch (requestError) {
      setError(
        backendError(
          requestError,
          "Unable to update this invitation."
        )
      );
    } finally {
      setActionId(null);
    }
  }


  return (
    <main className="fi-page">
      <div
        className={
          "fi-ambient " +
          "fi-ambient-one"
        }
        aria-hidden="true"
      />

      <div
        className={
          "fi-ambient " +
          "fi-ambient-two"
        }
        aria-hidden="true"
      />


      {/* HERO */}

      <section className="fi-hero">
        <div className="fi-hero-copy">
          <span className="fi-eyebrow">
            ✦ FOODKINDL INVITES
          </span>

          <h1>
            Turn a meal into
            a real connection.
          </h1>

          <p>
            Cook together, dine out
            or explore a Food Walk—and
            turn shared food experiences
            into genuine human
            connections.
          </p>

          <div className="fi-hero-notes">
            <span>
              Real people
            </span>

            <i />

            <span>
              Shared tables
            </span>

            <i />

            <span>
              Safer meetups
            </span>
          </div>
        </div>


        <div className="fi-hero-action">
          <div
            className="fi-hero-rings"
            aria-hidden="true"
          >
            <span>
              🍲
            </span>
          </div>

          <button
            type="button"
            className="fi-primary"
            onClick={() =>
              navigate(
                "/cook-together"
              )
            }
          >
            + Create an Invite
          </button>

          <small>
            No fees. Just good company.
          </small>
        </div>
      </section>


      {/* INVITE TYPES */}

      <section className="fi-main-options">
        {INVITE_TYPES.map(
          type => (
            <article
              key={type.value}
              className={
                "fi-main-option " +
                `fi-option-${type.value}`
              }
            >
              <span className="fi-card-index">
                {type.number}
              </span>

              <div className="fi-main-icon">
                {type.icon}
              </div>

              <div className="fi-main-content">
                <h2>
                  {type.label}
                </h2>

                <p>
                  {type.description}
                </p>

                <button
                  type="button"
                  className="fi-option-button"
                  onClick={() =>
                    openInviteType(
                      type
                    )
                  }
                >
                  {type.buttonText} →
                </button>
              </div>
            </article>
          )
        )}
      </section>


      {/* STEPS */}

      <section className="fi-how">
        <div>
          <strong>1</strong>

          <span>
            Choose the food moment
          </span>
        </div>

        <div>
          <strong>2</strong>

          <span>
            Set place, time and
            preferences
          </span>
        </div>

        <div>
          <strong>3</strong>

          <span>
            Invite people and meet
          </span>
        </div>
      </section>


      {/* ALERTS */}

      {error && (
        <div
          className={
            "fi-alert fi-error"
          }
          role="alert"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          className={
            "fi-alert fi-success"
          }
          role="status"
        >
          {message}
        </div>
      )}


      {/* INVITATIONS */}

      <section className="fi-content">
        <div className="fi-tabs">
          {[
            [
              "upcoming",
              "Upcoming",
            ],
            [
              "pending",
              "Pending",
            ],
            [
              "created",
              "Created by me",
            ],
            [
              "past",
              "Past",
            ],
          ].map(
            ([
              value,
              label,
            ]) => (
              <button
                type="button"
                key={value}
                className={
                  activeTab === value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveTab(
                    value
                  )
                }
              >
                {label}
              </button>
            )
          )}
        </div>


        {loading ? (
          <div className="fi-empty">
            <span>🍲</span>

            <h3>
              Loading invites...
            </h3>
          </div>
        ) : filteredInvites.length ===
          0 ? (
          <div className="fi-empty">
            <span>🍴</span>

            <h3>
              No invites here yet
            </h3>

            <p>
              Create a food moment or
              accept an invitation when
              one arrives.
            </p>
          </div>
        ) : (
          <div className="fi-card-grid">
            {filteredInvites.map(
              invite => {
                const status =
                  getStatus(
                    invite
                  );

                const isHost =
                  Boolean(
                    invite.is_host
                  );

                const isPending =
                  !isHost &&
                  invite.is_invited &&
                  invite
                    .my_invitation_status ===
                    "pending";

                const isDineOut =
                  invite.invite_type ===
                  "dine_out";

                const isPublicDineOut =
                  isDineOut &&
                  invite.visibility ===
                    "public";

                const isPrivateDineOut =
                  isDineOut &&
                  invite.visibility ===
                    "invited_only";

                const acceptedGuests =
                  Number(
                    invite
                      .approved_guest_count ||
                    0
                  );

                const maximumGuests =
                  Number(
                    invite.maximum_guests ||
                    0
                  );

                const isFull =
                  maximumGuests > 0 &&
                  acceptedGuests >=
                    maximumGuests;

                const hasJoined =
                  isPublicDineOut &&
                  invite
                    .my_response_status ===
                    "accepted";

                const remainingPlaces =
                  Math.max(
                    maximumGuests -
                    acceptedGuests,
                    0
                  );

                return (
                  <article
                    className={
                      "fi-invite-card"
                    }
                    key={
                      invite.unique_key
                    }
                  >
                    <div className="fi-card-top">
                      <span className="fi-type-pill">
                        {invite.type_icon}
                        {" "}
                        {invite.type_label}
                      </span>

                      <span
                        className={
                          "fi-status " +
                          `fi-status-${status}`
                        }
                      >
                        {status}
                      </span>
                    </div>


                    <h3>
                      {
                        invite.title ||
                        invite.dish ||
                        "Food invitation"
                      }
                    </h3>


                    {invite.host_name && (
                      <p className="fi-host-name">
                        Hosted by{" "}
                        {invite.host_name}
                      </p>
                    )}


                    {invite.description && (
                      <p>
                        {invite.description}
                      </p>
                    )}


                    <div className="fi-meta-list">
                      <span>
                        🗓️{" "}
                        {
                          formatDateTime(
                            invite
                          )
                        }
                      </span>

                      <span>
                        📍{" "}
                        {
                          invite
                            .location_name ||
                          "Location not specified"
                        }
                      </span>

                      <span>
                        🍛{" "}
                        {
                          invite.dish ||
                          "Food not specified"
                        }
                      </span>

                      <span>
                        👥{" "}
                        {acceptedGuests}
                        /
                        {
                          maximumGuests ||
                          "—"
                        }
                      </span>

                      {
                        isPublicDineOut &&
                        !isFull &&
                        (
                          <span>
                            ✅{" "}
                            {remainingPlaces}
                            {" "}
                            {
                              remainingPlaces ===
                              1
                                ? "place"
                                : "places"
                            }
                            {" "}available
                          </span>
                        )
                      }

                      {
                        isPublicDineOut &&
                        isFull &&
                        (
                          <span>
                            ⛔ Dine Out is full
                          </span>
                        )
                      }
                    </div>


                    <div className="fi-badges">
                      {isPublicDineOut && (
                        <span>
                          ◎ Everyone can join
                        </span>
                      )}

                      {isPrivateDineOut && (
                        <span>
                          🔒 Selected guests only
                        </span>
                      )}

                      {
                        invite.verified_only &&
                        (
                          <span>
                            ✓ Verified only
                          </span>
                        )
                      }

                      {
                        invite.women_only &&
                        (
                          <span>
                            ♀ Women only
                          </span>
                        )
                      }
                    </div>


                    <div className="fi-card-actions">
                      <button
                        type="button"
                        className="fi-secondary"
                        onClick={() =>
                          navigate(
                            invite
                              .details_route
                          )
                        }
                      >
                        View details
                      </button>


                      {/* PRIVATE INVITATION */}

                      {isPending && (
                        <>
                          <button
                            type="button"
                            className="fi-decline"
                            disabled={
                              actionId ===
                              invite.unique_key
                            }
                            onClick={() =>
                              respondToInvite(
                                invite,
                                "decline"
                              )
                            }
                          >
                            Decline
                          </button>

                          <button
                            type="button"
                            className="fi-primary"
                            disabled={
                              actionId ===
                              invite.unique_key
                            }
                            onClick={() =>
                              respondToInvite(
                                invite,
                                "accept"
                              )
                            }
                          >
                            {
                              actionId ===
                              invite.unique_key
                                ? "Please wait..."
                                : "Accept"
                            }
                          </button>
                        </>
                      )}


                      {/* EVERYONE / PUBLIC */}

                      {
                        isPublicDineOut &&
                        !isHost &&
                        !hasJoined &&
                        (
                          <button
                            type="button"
                            className="fi-primary"
                            disabled={
                              isFull ||
                              actionId ===
                              invite.unique_key
                            }
                            onClick={() =>
                              respondToInvite(
                                invite,
                                "join"
                              )
                            }
                          >
                            {
                              actionId ===
                              invite.unique_key
                                ? "Joining..."
                                : isFull
                                  ? "Dine Out is full"
                                  : (
                                      `Join (` +
                                      `${acceptedGuests}/` +
                                      `${maximumGuests})`
                                    )
                            }
                          </button>
                        )
                      }


                      {
                        isPublicDineOut &&
                        !isHost &&
                        hasJoined &&
                        (
                          <button
                            type="button"
                            className="fi-decline"
                            disabled={
                              actionId ===
                              invite.unique_key
                            }
                            onClick={() =>
                              respondToInvite(
                                invite,
                                "decline"
                              )
                            }
                          >
                            {
                              actionId ===
                              invite.unique_key
                                ? "Please wait..."
                                : "Leave Dine Out"
                            }
                          </button>
                        )
                      }


                      {
                        isPublicDineOut &&
                        isHost &&
                        (
                          <span className="fi-host-label">
                            You are hosting
                          </span>
                        )
                      }
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </main>
  );
}
